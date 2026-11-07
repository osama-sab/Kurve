/* Speed budgets (ux/spec/PARITY_SPEC.md, wave 0.4): what a person waits for, measured in a real
   browser at the sizes people use, each against a budget, so a slice that makes Kurve slower is
   seen the day it does.

   Usage: node tools/perf.mjs [kurve.html] [--csv file] [--runs n]

   Each measure is the best of n runs (3 by default; the best, as the noise of a shared machine only
   ever adds). The budgets are about three times what this container measured when they were
   written (07.11: boot 376 ms; a million rows: save 64, a value typed 316 with the keys' own time,
   draw 39, zoomed 16, the worksheet 49; 2000 columns: save 50, worksheet 27, History 39, Statistics
   35), so they catch a slowing down, not a busy machine; one past its budget fails. Run it alone:
   tools/suite.sh runs it after the drives that share the processor have finished. --csv
   appends a line a measure (date, commit, name, ms, budget) to the file, for a history. */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const FILE = resolve(argv.find((a, i) => !a.startsWith("--") && !["--csv", "--runs"].includes(argv[i - 1])) || join(here, "..", "kurve.html"));
const RUNS = +(opt("--runs") || 3), CSV = opt("--csv");
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium; // as the other drives: $PLAYWRIGHT, the package, or the copy this container has
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }
const browser = await chromium.launch();
const ready = (p) => p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 30000 });

// name: [budget in ms, what it is]
const BUDGET = {
  "boot": [1200, "the page opened, until a project is on the desk (empty storage)"],
  "1M: save": [200, "a change saved to a project of a million rows"],
  "1M: type a value": [900, "a value typed into a cell and entered, a million rows"],
  "1M: draw": [150, "the graph of a million points drawn"],
  "1M: zoomed draw": [60, "the graph drawn zoomed into a thousandth of it"],
  "1M: worksheet": [150, "the worksheet drawn at the middle of a million rows"],
  "2000 columns: save": [150, "a change saved to a project of 2000 columns of 300 values"],
  "2000 columns: worksheet": [100, "the worksheet of 2000 columns drawn"],
  "2000 columns: History": [150, "the History opened on 2000 columns"],
  "2000 columns: Statistics": [150, "the Statistics window opened on 2000 columns"],
};
const got = {};
const best = async (fn) => { let m = Infinity; for (let i = 0; i < RUNS; i++) m = Math.min(m, await fn()); return m; };

// Boot, each time in a fresh browser context (nothing stored).
got["boot"] = await best(async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage();
  const t0 = Date.now(); await p.goto(URL); await ready(p); const ms = Date.now() - t0;
  await ctx.close(); return ms;
});

async function withPage(fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await fn(p); } finally { await ctx.close(); }
  if (errs.length) { console.log("  page errors: " + errs.slice(0, 3).join(" | ")); process.exitCode = 1; }
}

// A million rows.
await withPage(async (p) => {
  await p.evaluate(async () => { const n = 1000000, x = new Array(n), y = new Array(n); for (let i = 0; i < n; i++) { x[i] = i * 1e-4; y[i] = Math.sin(i / 300) + (i % 7) * 1e-3; }
    const xc = makeCol("x", "Time", "s", x), yc = Object.assign(makeCol("y", "Signal", "mV", y), { pipe: [], mask: [] });
    const pr = Object.assign(blankProject("Million"), { cols: [xc, yc], activeY: yc.id }); pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [yc.id], plot: { style: "auto" } }];
    await createProject(pr, "perf"); await new Promise((r) => setTimeout(r, 400)); renderAll(); });
  got["1M: save"] = await best(() => p.evaluate(async () => { const a = performance.now(); save({ name: "Million " + Math.random() }, "renamed"); return performance.now() - a; }));
  got["1M: draw"] = await best(() => p.evaluate(() => { S.view = null; const a = performance.now(); renderPlot(); return performance.now() - a; }));
  got["1M: zoomed draw"] = await best(() => p.evaluate(() => { S.view = { x0: 50, x1: 50.1, y0: -1.2, y1: 1.2, xu: S.geo && S.geo.v && S.geo.v.xu }; const a = performance.now(); renderPlot(); const ms = performance.now() - a; S.view = null; return ms; }));
  got["1M: worksheet"] = await best(() => p.evaluate(() => { focusWin("sheet"); const b = document.querySelector("#ws"); b.scrollTop = b.scrollHeight / 2; const a = performance.now(); renderWs(); return performance.now() - a; }));
  got["1M: type a value"] = await best(async () => {
    await p.evaluate(() => { focusWin("sheet"); const b = document.querySelector("#ws"); b.scrollTop = 0; renderWs(); }); await p.waitForTimeout(300);
    await p.locator('#ws td[data-r="2"][data-ci="1"]').click();
    const t0 = Date.now(); await p.keyboard.type(String(1 + Math.random()).slice(0, 6)); await p.keyboard.press("Enter"); const ms = Date.now() - t0;
    await p.waitForTimeout(200); return ms;
  });
});

// Two thousand columns.
await withPage(async (p) => {
  await p.evaluate(async () => { const N = 2000, M = 300, x = Array.from({ length: M }, (_, i) => 400 + i * 3), cols = [makeCol("x", "Wavenumber", "cm-1", x)];
    for (let k = 0; k < N; k++) cols.push(Object.assign(makeCol("y", "Run " + (k + 1), "", x.map((v, i) => Math.exp(-(((i - M / 2 - (k % 60)) / 9) ** 2)) * 100 + Math.sin(i * 7 + k) * 2)), { pipe: [], mask: [] }));
    const pr = Object.assign(blankProject("2000 columns"), { cols, activeY: cols[1].id }); pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [cols[1].id], plot: { style: "auto" } }];
    await createProject(pr, "perf"); await new Promise((r) => setTimeout(r, 600)); renderAll(); });
  got["2000 columns: save"] = await best(() => p.evaluate(() => { const a = performance.now(); save({ wsw: Object.assign({}, P().wsw, { x: 100 + Math.round(Math.random() * 50) }) }); return performance.now() - a; }));
  got["2000 columns: worksheet"] = await best(() => p.evaluate(() => { focusWin("sheet"); const a = performance.now(); renderWs(); return performance.now() - a; }));
  got["2000 columns: History"] = await best(() => p.evaluate(() => { closeWin("flow"); const a = performance.now(); openWin("flow", { render: true }); return performance.now() - a; }));
  got["2000 columns: Statistics"] = await best(() => p.evaluate(() => { closeWin("stats"); const a = performance.now(); openWin("stats", { render: true }); return performance.now() - a; }));
});

await browser.close(); server.close();
let fail = 0;
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: dirname(FILE) }).toString().trim(); } catch (e) { return ""; } })();
console.log(`\n  ${"measure".padEnd(28)} ${"ms".padStart(7)}  budget`);
for (const [k, [b, what]] of Object.entries(BUDGET)) {
  const ms = got[k], ok = ms <= b; if (!ok) fail++;
  console.log(`  ${k.padEnd(28)} ${(ms == null ? "—" : ms.toFixed(0)).padStart(7)}  ${String(b).padStart(5)}  ${ok ? "ok" : "OVER BUDGET"}   ${what}`);
  if (CSV) appendFileSync(CSV, (existsSync(CSV) ? "" : "") + [new Date().toISOString(), commit, JSON.stringify(k), ms == null ? "" : ms.toFixed(1), b].join(",") + "\n");
}
console.log(`\n${Object.keys(BUDGET).length - fail} within budget, ${fail} over`);
process.exit(fail || process.exitCode ? 1 : 0);
