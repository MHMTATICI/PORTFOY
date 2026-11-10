// US cash-session clock in America/New_York. Regular open is 09:30 local,
// which is 13:30 UTC on EDT and 14:30 UTC on EST. The loop wakes at 09:20
// and stops at 16:10 local, and it skips weekends and full NYSE holidays.

import { pathToFileURL } from "node:url";

const HOLIDAYS = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

const ny = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

export function nyParts(date) {
  const parts = Object.fromEntries(ny.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday,
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function atNewYork(year, month, day, hour, minute) {
  let guess = Date.UTC(year, month - 1, day, hour + 5, minute);
  for (let i = 0; i < 4; i++) {
    const parts = nyParts(new Date(guess));
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const want = Date.UTC(year, month - 1, day, hour, minute);
    guess += want - got;
  }
  return guess;
}

function shiftDays(year, month, day, days) {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function isTradingDay(year, month, day) {
  const noon = atNewYork(year, month, day, 12, 0);
  const parts = nyParts(new Date(noon));
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  return !HOLIDAYS.has(parts.ymd);
}

function nextTradingDay(year, month, day) {
  let cursor = { year, month, day };
  for (let i = 0; i < 14; i++) {
    cursor = shiftDays(cursor.year, cursor.month, cursor.day, 1);
    if (isTradingDay(cursor.year, cursor.month, cursor.day)) return cursor;
  }
  return cursor;
}

export function marketStatus(now = new Date()) {
  const parts = nyParts(now);
  const open = atNewYork(parts.year, parts.month, parts.day, 9, 20);
  const stop = atNewYork(parts.year, parts.month, parts.day, 16, 10);
  const trading = isTradingDay(parts.year, parts.month, parts.day);
  const inSession = trading && now.getTime() >= open && now.getTime() < stop;

  let sessionDay = { year: parts.year, month: parts.month, day: parts.day };
  if (!trading || now.getTime() >= stop) sessionDay = nextTradingDay(parts.year, parts.month, parts.day);
  const nextOpen = inSession ? open : atNewYork(sessionDay.year, sessionDay.month, sessionDay.day, 9, 20);
  const sessionStop = inSession ? stop : atNewYork(sessionDay.year, sessionDay.month, sessionDay.day, 16, 10);

  return {
    phase: inSession ? "session" : "waiting",
    nextOpen: Math.floor(nextOpen / 1000),
    sessionStop: Math.floor(sessionStop / 1000),
    nyDate: parts.ymd,
    weekday: parts.weekday,
  };
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invoked) {
  const when = process.argv[2] ? new Date(process.argv[2]) : new Date();
  console.log(JSON.stringify(marketStatus(when)));
}
