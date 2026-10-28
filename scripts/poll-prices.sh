#!/usr/bin/env bash
# Fetch quotes immediately, then every 3 minutes until the US cash session is over.
# A start during CLOSED (night or weekend) publishes once and exits.
set -euo pipefail
cd "$(dirname "$0")/.."

decision="$(node scripts/update-prices.mjs --yield)"
if [ "$decision" = "yield" ]; then
  echo "Another Update prices run is active or a newer run is queued; exiting."
  exit 0
fi

stop_epoch="$(node --input-type=module -e '
const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" }).formatToParts(new Date());
const tz = parts.find((part) => part.type === "timeZoneName")?.value || "EST";
const now = new Date();
const hour = tz === "EDT" ? 21 : 22;
const stop = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 10, 0);
console.log(Math.floor(stop / 1000));
console.error(`session stop ${tz} ${hour}:10 UTC`);
')"
start_epoch="$(date +%s)"
max_epoch="$((start_epoch + 345 * 60))"
seen_session=0
closed_streak=0
poll=0

publish_prices() {
  local tmp origin header
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
  rm -rf "$tmp"
}

while true; do
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
  echo "marketState ${state} commit ${status}"
  if [ "$status" = "changed" ]; then
    if ! publish_prices; then
      echo "Publish failed; retrying next poll."
    fi
  fi

  if [ "$state" = "REGULAR" ] || [ "$state" = "POST" ]; then
    seen_session=1
    closed_streak=0
  elif [ "$state" = "PRE" ]; then
    closed_streak=0
  elif [ "$state" = "CLOSED" ]; then
    if [ "$seen_session" -eq 0 ]; then
      echo "Market is closed and no regular or post session was seen; one fetch and exit."
      exit 0
    fi
    closed_streak="$((closed_streak + 1))"
    if [ "$closed_streak" -ge 2 ]; then
      echo "Market stayed CLOSED for two polls after the session; exit."
      exit 0
    fi
  fi

  now="$(date +%s)"
  if [ "$now" -ge "$stop_epoch" ]; then
    echo "Reached the US session stop; exit."
    exit 0
  fi
  if [ "$now" -ge "$max_epoch" ]; then
    echo "Reached the 345 minute limit; exit."
    exit 0
  fi
  sleep 180
done
