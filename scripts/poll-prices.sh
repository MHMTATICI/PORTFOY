#!/usr/bin/env bash
# Keep one price run alive. Publish every 3 minutes through the cash session.
# Outside the session, publish the last close about every 15 minutes and sleep
# until 09:20 America/New_York on the next weekday that is not an NYSE holiday.
# A single run stops after about 5h45m so the workflow cap is not what kills it;
# the final workflow step dispatches the successor.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${PRICE_MODE:-loop}"

if [ "$MODE" = "dispatch-test" ]; then
  echo "dispatch-test: leaving prices.json to the live loop and exiting so the final step can hand off only if the chain is down."
  exit 0
fi

decision="$(node scripts/dispatch-next.mjs --check || echo run)"
if [ "$decision" = "yield" ]; then
  echo "Another price loop is already running; exiting."
  exit 0
fi

# Queue the successor before the long sleep so a killed runner still has one waiting.
node scripts/dispatch-next.mjs --mode loop || echo "Could not queue the successor yet; the final step will retry."
if [ "${PRICE_ARM_PROBE:-}" = "1" ]; then
  node scripts/dispatch-next.mjs --mode dispatch-test || echo "Dispatch test did not start."
fi

start_epoch="$(date +%s)"
handoff_at="$((start_epoch + 345 * 60 - 90))"
seen_session=0
poll=0

publish_prices() {
  local tmp origin header code
  tmp="$(mktemp -d)"
  cp prices.json "$tmp/prices.json"
  git -C "$tmp" init -q -b data-publish
  git -C "$tmp" config user.name "github-actions[bot]"
  git -C "$tmp" config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git -C "$tmp" add prices.json
  git -C "$tmp" commit -q -m "Update prices"
  origin="$(git remote get-url origin)"
  git -C "$tmp" remote add origin "$origin"
  header="$(git config --local --get http.https://github.com/.extraheader || true)"
  if [ -n "$header" ]; then
    git -C "$tmp" config http.https://github.com/.extraheader "$header"
  fi
  git -C "$tmp" push --force origin HEAD:data
  code=$?
  rm -rf "$tmp"
  return "$code"
}

while true; do
  now="$(date +%s)"
  if [ "$now" -ge "$handoff_at" ]; then
    echo "Approaching the 5h45m handoff; the final step starts the successor."
    exit 0
  fi

  poll="$((poll + 1))"
  echo "poll ${poll} $(date -u +%H:%M:%SZ)"
  rm -f /tmp/prices.prev.json /tmp/prices.meta.json /tmp/prices.status
  if git fetch origin data && git show origin/data:prices.json > /tmp/prices.prev.json; then
    :
  else
    rm -f /tmp/prices.prev.json
  fi

  if ! node scripts/update-prices.mjs --previous /tmp/prices.prev.json --out prices.json --meta-out /tmp/prices.meta.json | tee /tmp/prices.status; then
    echo "Quote fetch failed; retrying in 3 minutes."
    sleep 180
    continue
  fi

  status="$(tail -n 1 /tmp/prices.status)"
  state="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("/tmp/prices.meta.json","utf8")).marketState)')"
  cal="$(node scripts/market-calendar.mjs)"
  phase="$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).phase)' "$cal")"
  next_open="$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).nextOpen))' "$cal")"
  echo "marketState ${state} phase ${phase} commit ${status} nextOpen ${next_open}"
  if [ "$status" = "changed" ]; then
    if ! publish_prices; then
      echo "Publish failed; retrying next poll."
    fi
  fi
  if [ "$phase" = "session" ] || [ "$state" = "REGULAR" ] || [ "$state" = "POST" ] || [ "$state" = "PRE" ]; then
    seen_session=1
  fi
  if [ "$seen_session" -eq 1 ] && [ "$phase" != "session" ] && [ "$state" != "PRE" ] && [ "$state" != "REGULAR" ] && [ "$state" != "POST" ]; then
    echo "Cash session is over; the final step starts the successor."
    exit 0
  fi

  now="$(date +%s)"
  if [ "$phase" = "session" ]; then
    interval=180
  else
    interval=900
  fi
  remain="$((handoff_at - now))"
  if [ "$remain" -le 30 ]; then
    echo "Approaching the 5h45m handoff; the final step starts the successor."
    exit 0
  fi
  sleep_for="$interval"
  if [ "$sleep_for" -ge "$remain" ]; then
    echo "The next wait would cross the run cap; handing off."
    exit 0
  fi
  if [ "$phase" != "session" ] && [ "$next_open" -gt "$now" ] && [ "$((next_open - now))" -lt "$sleep_for" ]; then
    sleep_for="$((next_open - now))"
  fi
  echo "sleep ${sleep_for}s"
  sleep "$sleep_for"
done
