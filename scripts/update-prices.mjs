// Quote refresh for the data branch. The session loop lives in scripts/poll-prices.sh.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.includes("--yield")) {
  console.log(await shouldYield());
  process.exit(0);
}

const previousPath = flag(args, "--previous");
const outPath = flag(args, "--out") || resolve(root, "prices.json");
const metaPath = flag(args, "--meta-out");

const tickers = tickersFromApp(readFileSync(resolve(root, "src/App.tsx"), "utf8"));
if (tickers.length === 0) {
  console.error("No tickers found in src/App.tsx");
  process.exit(1);
}

const quotes = {};
const states = [];
for (const ticker of tickers) {
  const quote = await fetchQuote(ticker);
  if (!quote) {
    console.error(`miss ${ticker}`);
    continue;
  }
  quotes[ticker] = { price: round(quote.price), prevClose: round(quote.prevClose) };
  states.push(quote.marketState);
  console.error(`${ticker} ${quotes[ticker].price} prev ${quotes[ticker].prevClose} ${quote.marketState}`);
}

if (Object.keys(quotes).length === 0) {
  console.error("No quotes fetched");
  process.exit(1);
}

const next = {
  updatedAt: new Date().toISOString(),
  marketState: overallState(states, quotes),
  quotes,
};

if (metaPath) writeFileSync(metaPath, JSON.stringify({ marketState: next.marketState, updatedAt: next.updatedAt }) + "\n");

const previous = readPrevious(previousPath);
if (previous && previous.marketState === next.marketState && JSON.stringify(previous.quotes) === JSON.stringify(next.quotes)) {
  console.log("unchanged");
  process.exit(0);
}

writeFileSync(outPath, JSON.stringify(next, null, 2) + "\n");
console.error(`wrote ${outPath} ${next.marketState} ${Object.keys(quotes).length}/${tickers.length}`);
console.log("changed");

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : "";
}

async function shouldYield() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const me = Number(process.env.GITHUB_RUN_ID || 0);
  if (!token || !repo || !me) {
    console.error("No Actions run context; this run will fetch.");
    return "run";
  }
  const url = `https://api.github.com/repos/${repo}/actions/workflows/prices.yml/runs?per_page=100`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "portfoy-prices",
      },
    });
    if (!res.ok) {
      console.error(`Could not list workflow runs (${res.status}); this run will fetch.`);
      return "run";
    }
    const data = await res.json();
    const others = (data.workflow_runs || []).filter((run) => run.id !== me);
    if (others.some((run) => run.status === "in_progress")) return "yield";
    if (others.some((run) => run.status === "queued" && run.id > me)) return "yield";
    return "run";
  } catch (error) {
    console.error(`Could not list workflow runs (${error}); this run will fetch.`);
    return "run";
  }
}

function tickersFromApp(src) {
  const found = new Set();
  const px = src.match(/const PX0[\s\S]*?=\s*\{([\s\S]*?)\};/);
  if (px) {
    for (const match of px[1].matchAll(/\b([A-Z][A-Z0-9.]*)\s*:/g)) found.add(match[1]);
  }
  for (const match of src.matchAll(/\["\d{4}-\d{2}-\d{2}","([A-Z][A-Z0-9.]*)"/g)) found.add(match[1]);
  return [...found].sort();
}

function round(n) {
  return Math.round(n * 10000) / 10000;
}

function readPrevious(path) {
  if (!path) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (!data || typeof data.quotes !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

function overallState(states, quotes) {
  const ref = quotes.QQQ ? states[Object.keys(quotes).indexOf("QQQ")] : quotes.NVDA ? states[Object.keys(quotes).indexOf("NVDA")] : "";
  if (ref) return ref;
  if (states.includes("REGULAR")) return "REGULAR";
  if (states.includes("PRE")) return "PRE";
  if (states.includes("POST")) return "POST";
  return "CLOSED";
}

async function fetchQuote(ticker) {
  const chartUrls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d&includePrePost=true`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d&includePrePost=true`,
  ];
  for (const url of chartUrls) {
    const body = await getJson(url);
    const quote = quoteFromChart(body);
    if (quote) return quote;
  }
  const fallback = await getJson(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`);
  return quoteFromV7(fallback) || (await quoteFromStooq(ticker));
}

function quoteFromChart(body) {
  const meta = body?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const closes = body.chart.result[0].indicators?.quote?.[0]?.close || [];
  let price = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (typeof closes[i] === "number" && closes[i] > 0) {
      price = closes[i];
      break;
    }
  }
  if (!(price > 0)) price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  if (!(price > 0) || !(prevClose > 0)) return null;
  return { price, prevClose, marketState: marketState(meta) };
}

function marketState(meta) {
  const raw = String(meta.marketState || "").toUpperCase();
  if (raw.includes("REGULAR")) return "REGULAR";
  if (raw.startsWith("PRE")) return "PRE";
  if (raw.startsWith("POST")) return "POST";
  if (raw === "CLOSED") return "CLOSED";
  const now = Math.floor(Date.now() / 1000);
  const period = meta.currentTradingPeriod;
  if (period?.regular && now >= period.regular.start && now < period.regular.end) return "REGULAR";
  if (period?.pre && now >= period.pre.start && now < period.pre.end) return "PRE";
  if (period?.post && now >= period.post.start && now < period.post.end) return "POST";
  return "CLOSED";
}

function quoteFromV7(body) {
  const row = body?.quoteResponse?.result?.[0];
  if (!row) return null;
  const state = marketState(row);
  let price = row.regularMarketPrice;
  if (state === "PRE" && row.preMarketPrice > 0) price = row.preMarketPrice;
  if (state === "POST" && row.postMarketPrice > 0) price = row.postMarketPrice;
  const prevClose = row.regularMarketPreviousClose ?? row.previousClose;
  if (!(price > 0) || !(prevClose > 0)) return null;
  return { price, prevClose, marketState: state };
}

async function quoteFromStooq(ticker) {
  const symbol = `${ticker.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; portfoy-prices/1.0)" } });
    if (!res.ok) return null;
    const lines = (await res.text()).trim().split(/\r?\n/).filter((line) => line && !line.startsWith("Date"));
    if (lines.length < 2) return null;
    const last = lines.at(-1).split(",");
    const prev = lines.at(-2).split(",");
    const price = Number(last[4]);
    const prevClose = Number(prev[4]);
    if (!(price > 0) || !(prevClose > 0)) return null;
    return { price, prevClose, marketState: "CLOSED" };
  } catch {
    return null;
  }
}

async function getJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; portfoy-prices/1.0)",
          Accept: "application/json",
        },
      });
      if (res.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
}
