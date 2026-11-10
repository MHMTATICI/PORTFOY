// Queue the next Update prices run with the built-in GITHUB_TOKEN.
// A loop successor is skipped when another loop run is already queued or running.
// A dispatch-test run is skipped only when another dispatch-test is already active.

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const me = Number(process.env.GITHUB_RUN_ID || 0);
const args = process.argv.slice(2);
const mode = flag(args, "--mode") || "loop";
const checkOnly = args.includes("--check");

if (!token || !repo) {
  console.error("GITHUB_TOKEN and GITHUB_REPOSITORY are required.");
  process.exit(checkOnly ? 0 : 1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "portfoy-prices",
};

const runs = await listRuns();
const others = runs.filter((run) => run.id !== me && run.status !== "completed");
const probes = others.filter(isProbe);
const loops = others.filter((run) => !isProbe(run));
const blocking = mode === "dispatch-test" ? probes : loops;

if (checkOnly) {
  const busy = loops.some((run) => run.status === "in_progress");
  console.log(busy ? "yield" : "run");
  process.exit(0);
}

if (blocking.length > 0) {
  console.log(`skip ${mode}; already active: ${blocking.map((run) => `${run.id}:${run.status}:${run.display_title}`).join(" | ")}`);
  process.exit(0);
}

const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/prices.yml/dispatches`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ ref: "main", inputs: { mode } }),
});
if (res.status !== 204) {
  console.error(`dispatch ${mode} failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(`dispatched ${mode}`);
await new Promise((resolve) => setTimeout(resolve, 5000));
const created = (await listRuns()).find((run) => run.id !== me && run.status !== "completed" && (mode === "dispatch-test" ? isProbe(run) : !isProbe(run)));
if (created) console.log(`successor ${created.id} ${created.status} ${created.html_url}`);
else console.log(`dispatched ${mode}; the new run is not listed yet`);

function flag(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : "";
}

function isProbe(run) {
  return String(run.display_title || run.name || "").includes("dispatch-test");
}

async function listRuns() {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/prices.yml/runs?per_page=50`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`list runs ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.workflow_runs || [];
}
