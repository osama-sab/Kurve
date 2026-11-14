/* Speed budgets (ux/spec/PARITY_SPEC.md, wave 0.4): what a person waits for, measured in a real
   browser at the sizes people use, each against a budget, so a slice that makes Kurve slower is
   seen the day it does.

   Usage: node tools/perf.mjs [kurve.html] [--csv file] [--runs n]

   Each measure is the best of n runs (3 by default; the best, as the noise of a shared machine only
   ever adds). The budgets are about three times what this container measured when they were
   written (07.11: boot 376 ms; a million rows: save 64, a value typed 316 with the keys' own time,
   draw 39, zoomed 16, the worksheet 49, saved to a file 570, opened from one 655; 2000 columns: save 50, worksheet 27, History 39, Statistics
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
  "1M: a filter": [600, "a filter (Signal > 0) put on a million rows: worked out, saved and the worksheet drawn (SHEET_SPEC 3.3)"],
  "1M: filtered worksheet": [150, "the worksheet drawn with that filter on"],
  "1M: a column formula": [300, "B - mean(B) + B[i-1] worked out over a million rows (SHEET_SPEC 3.1)"],
  "1M: save to a file": [2000, "the project of a million rows written as a .kurve file (packed and compressed)"],
  "1M: open a file": [2000, "that file read, checked and opened as a new project"],
  "2000 columns: save": [150, "a change saved to a project of 2000 columns of 300 values"],
  "2000 columns: worksheet": [100, "the worksheet of 2000 columns drawn"],
  "2000 columns: colour scales": [100, "the worksheet of 2000 columns drawn with a colour scale on each, after a value of one changed (SHEET_SPEC 3.4)"],
  "2000 columns: History": [150, "the History opened on 2000 columns"],
  "2000 columns: Statistics": [150, "the Statistics window opened on 2000 columns"],
  "ANOVA: 1M values": [1000, "one-way ANOVA of four groups of 250 000 values (the table, Welch's F, the groups)"],
  "Rank tests: 1M values": [2500, "Mann–Whitney of two samples of 500 000 and Kruskal–Wallis of four groups of 250 000"],
  "Correlation: 1M pairs": [6000, "Pearson's r, Spearman's ρ and Kendall's τ of a million pairs"],
  "Counts in tables: 1M pairs": [3000, "the cross-table of two columns of a million categories, χ² and G"],
  "Linear model: 200 000 rows": [1800, "a response by three numbers and a factor of five levels, type III (worked out in the worker in the app)"],
  "Linear model: pairs": [7000, "the same with every pair of them (23 columns), type III"],
  "Power: the exact test's size": [700, "the smallest size at which the exact binomial test of 0.5 reaches a power of 0.8 against 0.52 (4927 trials, every size in turn)"],
  "Repeated measures: 100 000 subjects": [2500, "two factors within (3 × 2) and two groups between, wide: the tests, Mauchly's, the corrections, the means, Holm's paired comparisons"],
  "Two-way ANOVA: 200 000 rows": [3000, "a response by factors of four and three levels with their interaction: type III, the means, Tukey's comparisons and simple effects"],
  "Reshape: stack 20 × 100 000": [400, "twenty columns of 100 000 cells stacked into one with a column of names (SHEET_SPEC 3.5)"],
  "Reshape: pivot 1M rows": [1000, "a million rows pivoted by two text columns into the mean of a third, with totals"],
  "Reshape: join 100 000 × 100 000": [300, "two sheets of 100 000 rows joined on a key column, every row of both"],
  "ANOVA: Tukey, 10 groups": [1100, "Tukey–Kramer's 45 pairs and its quantile (worked out in the worker in the app)"],
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
  // A column formula with an aggregate and a row of another row (SHEET_SPEC 3.1), worked out as recalcFx does.
  await p.evaluate(() => { setColFormula(2, "B - mean(B) + B[i-1]"); });
  got["1M: a column formula"] = await best(() => p.evaluate(() => { const c = sheetCols()[2]; if (!c || !c.fx) return Infinity; const a = performance.now(), r = fxEval(c, P().cols); const ms = performance.now() - a; return r.data && r.data.length === 1000000 ? ms : Infinity; }));
  // A filter on a million rows (SHEET_SPEC 3.3): put on, and the sheet drawn with it.
  got["1M: a filter"] = await best(() => p.evaluate(() => { focusWin("sheet"); setFilter(curSheet(), null, null); const c = sheetCols()[1], a = performance.now(); setFilter(curSheet(), c.id, { c1: { op: "gt", a: Math.random() * 0.01 } }); const ms = performance.now() - a; return S.wsm && S.wsm.filtR ? ms : Infinity; }));
  got["1M: filtered worksheet"] = await best(() => p.evaluate(() => { const b = document.querySelector("#ws"); b.scrollTop = b.scrollHeight / 2; const a = performance.now(); renderWs(); return performance.now() - a; }));
  await p.evaluate(() => setFilter(curSheet(), null, null));
  // A project file, written and read again (FOUNDATION_SPEC 1.1): what Ctrl+S and Open a project file do, without the picker.
  got["1M: save to a file"] = await best(() => p.evaluate(async () => { fpSettle(); const a = performance.now(); window.__pfb = await pfGzip(JSON.stringify(pfDoc(S.pid))); return performance.now() - a; }));
  got["1M: open a file"] = await best(async () => { const ms = await p.evaluate(async () => { const pid0 = S.pid, a = performance.now(); await openProjectFile(new File([window.__pfb], "Million.kurve")); return S.pid !== pid0 ? performance.now() - a : Infinity; });
    await p.waitForFunction(() => /as they were saved|not those/.test((document.querySelector("#toast") || {}).textContent || ""), null, { timeout: 30000 }).catch(() => {}); return ms; });
});

// Two thousand columns.
await withPage(async (p) => {
  await p.evaluate(async () => { const N = 2000, M = 300, x = Array.from({ length: M }, (_, i) => 400 + i * 3), cols = [makeCol("x", "Wavenumber", "cm-1", x)];
    for (let k = 0; k < N; k++) cols.push(Object.assign(makeCol("y", "Run " + (k + 1), "", x.map((v, i) => Math.exp(-(((i - M / 2 - (k % 60)) / 9) ** 2)) * 100 + Math.sin(i * 7 + k) * 2)), { pipe: [], mask: [] }));
    const pr = Object.assign(blankProject("2000 columns"), { cols, activeY: cols[1].id }); pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [cols[1].id], plot: { style: "auto" } }];
    await createProject(pr, "perf"); await new Promise((r) => setTimeout(r, 600)); renderAll(); });
  got["2000 columns: save"] = await best(() => p.evaluate(() => { const a = performance.now(); save({ wsw: Object.assign({}, P().wsw, { x: 100 + Math.round(Math.random() * 50) }) }); return performance.now() - a; }));
  got["2000 columns: worksheet"] = await best(() => p.evaluate(() => { focusWin("sheet"); const a = performance.now(); renderWs(); return performance.now() - a; }));
  await p.evaluate(() => { const o = {}; sheetCols().forEach(c => { if (c.role === "y") o[c.id] = [{ kind: "scale", pal: "seq" }]; }); save({ wsCf: o }, "scales"); renderWs(); });
  got["2000 columns: colour scales"] = await best(() => p.evaluate(() => { const c = sheetCols()[5], d = c.data.slice(); d[3] = Math.random() * 100; c.data = d; const a = performance.now(); renderWs(); const ms = performance.now() - a; return document.querySelector("#ws td[class*=cf-s]") ? ms : Infinity; }));
  got["2000 columns: History"] = await best(() => p.evaluate(() => { closeWin("flow"); const a = performance.now(); openWin("flow", { render: true }); return performance.now() - a; }));
  got["2000 columns: Statistics"] = await best(() => p.evaluate(() => { closeWin("stats"); const a = performance.now(); openWin("stats", { render: true }); return performance.now() - a; }));
});

// One-way ANOVA (STATS_SPEC 2.4): the kind run as the worker runs it.
await withPage(async (p) => {
  got["ANOVA: 1M values"] = await best(() => p.evaluate(() => { const mb = mulberry32(7), ins = [0, 1, 2, 3].map((g) => ({ name: "G" + g, vals: Array.from({ length: 250000 }, () => 10 + g * 0.01 + mb()) }));
    const a = performance.now(); anaRunKind("anova1", ins, { comps: [], welch: true }); return performance.now() - a; }));
  got["ANOVA: Tukey, 10 groups"] = await best(() => p.evaluate(() => { const mb = mulberry32(8), ins = Array.from({ length: 10 }, (_, g) => ({ name: "G" + g, vals: Array.from({ length: 8 }, () => g * 0.2 + mb()) }));
    const a = performance.now(); anaRunKind("anova1", ins, { comps: ["tukey"] }); return performance.now() - a; }));
  got["Rank tests: 1M values"] = await best(() => p.evaluate(() => { const mb = mulberry32(9), v = (n, s) => Array.from({ length: n }, () => s + mb());
    const two = [{ name: "A", vals: v(500000, 0) }, { name: "B", vals: v(500000, 0.001) }], four = [0, 1, 2, 3].map((g) => ({ name: "G" + g, vals: v(250000, g * 0.001) }));
    const a = performance.now(); anaRunKind("mw", two, {}); anaRunKind("kw", four, { dunn: false }); return performance.now() - a; }));
  got["Counts in tables: 1M pairs"] = await best(() => p.evaluate(() => { const mb = mulberry32(11), n = 1000000, rows = Array.from({ length: n }, (_, i) => i), L = ["a", "b", "c", "d"], M = ["p", "q", "r"];
    const ins = [{ name: "A", rows, cats: { keys: rows.map(() => L[Math.floor(mb() * 4)]), order: null } }, { name: "B", rows, cats: { keys: rows.map(() => M[Math.floor(mb() * 3)]), order: null } }];
    const a = performance.now(); anaRunKind("xtab", ins, { mode: "pair", tests: ["chi2", "g"] }); return performance.now() - a; }));
  const lmRun = (inter) => p.evaluate((inter) => { const mb = mulberry32(12), n = 200000, rows = Array.from({ length: n }, (_, i) => i), v = (f) => rows.map(f), L = ["a", "b", "c", "d", "e"];
    const x1 = v(() => mb() * 10), x2 = v(() => mb() * 5), x3 = v(() => mb()), F = v(() => L[Math.floor(mb() * 5)]), y = v((i) => 1 + 0.5 * x1[i] - 0.2 * x2[i] + 3 * x3[i] + L.indexOf(F[i]) * 0.3 + mb());
    const ins = [{ id: "y", name: "y", vals: y, rows }, { id: "x1", name: "x1", vals: x1, rows }, { id: "x2", name: "x2", vals: x2, rows }, { id: "x3", name: "x3", vals: x3, rows }, { id: "F", name: "F", rows, cats: { keys: F, order: null } }];
    const a = performance.now(), r = anaRunKind("lm", ins, { y: "y", ss: 3, inter }); if (r.fail) throw new Error(r.fail); return performance.now() - a; }, inter);
  got["Linear model: 200 000 rows"] = await best(() => lmRun("none"));
  got["Linear model: pairs"] = await best(() => lmRun("pairs"));
  got["Two-way ANOVA: 200 000 rows"] = await best(() => p.evaluate(() => { const mb = mulberry32(13), n = 200000, rows = Array.from({ length: n }, (_, i) => i), A = rows.map(() => "abcd"[Math.floor(mb() * 4)]), B = rows.map(() => "pqr"[Math.floor(mb() * 3)]);
    const y = rows.map((i) => "abcd".indexOf(A[i]) + "pqr".indexOf(B[i]) * 0.5 + mb()), ins = [{ id: "y", name: "y", vals: y, rows }, { id: "A", name: "A", rows, cats: { keys: A, order: null } }, { id: "B", name: "B", rows, cats: { keys: B, order: null } }];
    const a = performance.now(), r = anaRunKind("anovan", ins, { y: "y", comps: ["tukey"], simple: true }); if (r.fail) throw new Error(r.fail); return performance.now() - a; }));
  got["Power: the exact test's size"] = await best(() => p.evaluate(() => { const a = performance.now(), r = anaRunKind("power", [], { test: "p1", alpha: 0.05, alt: "two", p0: 0.5, p1: 0.52, find: "size", powers: [0.8] });
    if (r.fail) throw new Error(r.fail); return performance.now() - a; }));
  got["Repeated measures: 100 000 subjects"] = await best(() => p.evaluate(() => { const mb = mulberry32(14), n = 100000, rows = Array.from({ length: n }, (_, i) => i), g = rows.map(() => mb() < 0.5 ? 1 : 2), base = rows.map(() => mb() * 3);
    const ins = Array.from({ length: 6 }, (_, j) => ({ id: "c" + j, name: "C" + j, rows, vals: rows.map((i) => base[i] + j * 0.1 + mb()) }));
    ins[0].groups = [[1], [2]]; ins[0].grows = [rows.filter((i) => g[i] === 1), rows.filter((i) => g[i] === 2)];
    const a = performance.now(), r = anaRunKind("rm", ins, { levels: 3, comp: "holm" }); if (r.fail) throw new Error(r.fail); return performance.now() - a; }));
  got["Reshape: stack 20 × 100 000"] = await best(() => p.evaluate(() => { const mb = mulberry32(31), n = 100000, ins = Array.from({ length: 20 }, (_, k) => ({ id: "c" + k, name: "C" + k, unit: "", role: "y", sheet: "s", order: null, cells: Array.from({ length: n }, () => mb() < 0.05 ? null : mb()) }));
    const a = performance.now(), r = anaRunKind("stack", ins, {}); if (r.fail) throw new Error(r.fail); return performance.now() - a; }));
  got["Reshape: pivot 1M rows"] = await best(() => p.evaluate(() => { const mb = mulberry32(32), n = 1000000, L = ["a", "b", "c", "d", "e"], M = ["p", "q", "r"];
    const ins = [{ id: "g", name: "G", unit: "", role: "ignore", sheet: "s", order: null, cells: Array.from({ length: n }, () => L[Math.floor(mb() * 5)]) }, { id: "h", name: "H", unit: "", role: "ignore", sheet: "s", order: null, cells: Array.from({ length: n }, () => M[Math.floor(mb() * 3)]) }, { id: "v", name: "V", unit: "", role: "y", sheet: "s", order: null, cells: Array.from({ length: n }, () => mb()) }];
    const a = performance.now(), r = anaRunKind("pivot", ins, { row: "g", col: "h", val: "v", agg: "mean" }); if (r.fail) throw new Error(r.fail); return performance.now() - a; }));
  got["Reshape: join 100 000 × 100 000"] = await best(() => p.evaluate(() => { const mb = mulberry32(33), n = 100000, k1 = Array.from({ length: n }, (_, i) => i * 2), k2 = Array.from({ length: n }, (_, i) => i * 3);
    const ins = [{ id: "k1", name: "K", unit: "", role: "x", sheet: "s1", order: null, cells: k1 }, { id: "a", name: "A", unit: "", role: "y", sheet: "s1", order: null, cells: k1.map(() => mb()) }, { id: "k2", name: "K", unit: "", role: "x", sheet: "s2", order: null, cells: k2 }, { id: "b", name: "B", unit: "", role: "y", sheet: "s2", order: null, cells: k2.map(() => mb()) }];
    const a = performance.now(), r = anaRunKind("join", ins, { lk: "k1", rk: "k2", right: "s2", how: "full" }); if (r.fail) throw new Error(r.fail); return performance.now() - a; }));
  got["Correlation: 1M pairs"] = await best(() => p.evaluate(() => { const mb = mulberry32(10), n = 1000000, x = Array.from({ length: n }, () => mb()), rows = x.map((_, i) => i);
    const ins = [{ name: "A", vals: x, rows }, { name: "B", vals: x.map((v) => v + mb()), rows }];
    const a = performance.now(); anaRunKind("corr", ins, { methods: ["pearson", "spearman", "kendall"] }); return performance.now() - a; }));
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
