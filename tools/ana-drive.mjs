/* Analyses and result sheets (ux/spec/FOUNDATION_SPEC.md, 1.3): made from the dialog, read only, worked
   out again by itself or when asked, reading each column as processed or original, masked points
   out, its steps flagged, grouped, cut, deleted, undone, reloaded. Usage: node tools/ana-drive.mjs [kurve.html] */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }
let pass = 0, fail = 0;
const DESC_DEF_JS = "n,miss,mean,sd,se,min,q1,med,q3,max,sum";
const check = (name, cond, detail) => { if (cond) { pass++; console.log("  ok   " + name); } else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 500))); } };
const browser = await chromium.launch();
const ready = (p) => p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 30000 });
async function page(fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), 180000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
// X, two Y columns and a column of groups (text).
const SETUP = () => { const x = [], a = [], b = []; for (let i = 0; i < 12; i++) { x.push(i); a.push(i * 2 + 1); b.push((i % 4) + 0.5); }
  const g = Object.assign(makeCol("ignore", "Batch", "", x.map(() => null)), { fmt: "text" }); g.txt = {}; x.forEach(i => { g.txt[i] = i < 6 ? "A" : "B"; }); TXT_OK.add(g.txt);
  save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "Height", "mm", a), { pipe: [], mask: [] }), Object.assign(makeCol("y", "Width", "mm", b), { pipe: [], mask: [] }), g], activeY: null }, "typed"); };
// The result sheet's table: { key: values }.
const RES = p => p.evaluate(() => { const a = anaList()[0]; if (!a) return null; const o = {}; P().cols.filter(c => c.ana === a.id).forEach(c => { o[c.ak] = c.txt ? c.data.map((v, i) => c.txt[i] != null ? c.txt[i] : v) : c.data.slice(); }); return { t: o, sig: a.sig, st: anaStale(a), notes: (a.res && a.res.notes) || [], recalc: a.recalc, sheet: a.out.sheet }; });
const make = async (p, set) => { await p.evaluate(() => { anaDlg("desc"); }); await p.waitForSelector("#aRc");
  if (set) await set(); await p.click("#formOk"); await p.waitForTimeout(500); };

console.log("The steps say what they do to the rows");
await page(async p => {
  const r = await p.evaluate(() => Object.keys(PIPE_OPS).filter(k => !PIPE_ROWS[k]));
  check("every step declares what it does to the rows", r.length === 0, JSON.stringify(r));
}, { name: "flags" });

console.log("Statistics on columns");
await page(async p => {
  await p.evaluate(SETUP); await p.waitForTimeout(400);
  const ids = await p.evaluate(() => sheetCols(curSheet()).map(c => c.id)), fp0 = await p.evaluate(() => { fpSettle && fpSettle(); return rawFp(); });
  await p.evaluate(ids => { S.ws = Object.assign(S.ws || {}, {}); wsSelect && wsSelect(0, 1, false); }, ids);
  await make(p, async () => { await p.check(`#aI_${ids[2]}`); });
  let r = await RES(p);
  const st = await p.evaluate(ids => { const s = statRow(colById(ids[1]), "final"); return { n: s.n, mu: s.mu, sd: s.sd, med: s.med }; }, ids);
  check("Statistics on columns makes a result sheet: a row a column, N, mean, SD and median as the Statistics window has them", r && r.t.col[0] === "Height" && r.t.col[1] === "Width" && r.t.n[0] === st.n && Math.abs(r.t.mean[0] - st.mu) < 1e-12 && Math.abs(r.t.sd[0] - st.sd) < 1e-12 && r.t.med[0] === st.med, JSON.stringify([r, st]).slice(0, 400));
  r = await p.evaluate(() => { const s = sheetList().find(q => q.ana); return { tab: !!document.querySelector(`#wsTabs [data-wst="${s.id}"].ana svg`), shown: curSheet() === s.id, name: s.name }; });
  check("…its tab carries a lock, shown at once, named Statistics 1", r.tab && r.shown && r.name === "Statistics 1", JSON.stringify(r));
  check("…and the check code is the same: results are not original data", await p.evaluate(() => rawFp()) === fp0);
  // Read only.
  await p.evaluate(() => { focusWin("sheet"); }); await p.locator('#ws td[data-r="0"][data-ci="2"]').click(); await p.keyboard.type("5");
  r = await p.evaluate(() => ({ t: (document.querySelector(".toast") || {}).textContent || "", edit: !!(S.ws && S.ws.edit) }));
  check("typing into it is refused, saying it holds results, with Change settings…", /results of Statistics 1/.test(r.t) && /Change settings/.test(r.t) && !r.edit, JSON.stringify(r));
  // A value changed: worked out again by itself.
  await p.evaluate(ids => { const c = colById(ids[1]); const d = c.data.slice(); d[0] = 101; c.data = d; save({ cols: P().cols }, "typed"); }, ids); await p.waitForTimeout(300);
  r = await RES(p);
  check("a value changed, it is worked out again by itself (the mean follows)", Math.abs(r.t.mean[0] - (101 + [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].reduce((a, b) => a + b, 0)) / 12) < 1e-9 && !r.st, JSON.stringify(r.t.mean));
  r = await p.evaluate(() => P().log.slice(-1)[0]); check("…with a line in the log", /Statistics 1 again/.test(JSON.stringify(r)), JSON.stringify(r));
  // A step added: the processed values are read.
  await p.evaluate(ids => { const c = colById(ids[1]); pushUndo("x"); c.pipe = [makeStep("scale", Object.assign({}, PIPE_OPS.scale.defaults, { a: 2 }))]; save({ cols: P().cols }, "step"); renderAll(); }, ids); await p.waitForTimeout(300);
  const fin = await p.evaluate(ids => { const d = finalOf(colById(ids[1])).y; return d.reduce((a, b) => a + b, 0) / d.length; }, ids);
  r = await RES(p);
  check("a step added to an input, it reads the processed values", Math.abs(r.t.mean[0] - fin) < 1e-9 && fin !== r.t.mean[1], JSON.stringify([r.t.mean, fin]));
  // Original, from the settings.
  await p.evaluate(() => { const a = anaList()[0]; anaDlg("desc", { id: a.id }); }); await p.waitForSelector(`#aR_${ids[1]}`);
  const line = await p.$eval(`#aI_${ids[1]}`, e => e.closest(".anarow").textContent);
  await p.selectOption(`#aR_${ids[1]}`, "orig"); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await RES(p);
  const orig = await p.evaluate(ids => { const d = colById(ids[1]).data; return d.reduce((a, b) => a + b, 0) / d.length; }, ids);
  check("the dialog names the steps read, and Original reads the original values", /processed: /.test(line) && Math.abs(r.t.mean[0] - orig) < 1e-9, JSON.stringify([line, r.t.mean[0], orig]));
  // Masked points.
  await p.evaluate(ids => { const c = colById(ids[2]); pushUndo("x"); c.mask = [0, 1]; save({ cols: P().cols }, "mask"); renderAll(); }, ids); await p.waitForTimeout(300);
  r = await RES(p);
  check("masked points are left out and counted (N 10, said)", r.t.n[1] === 10 && r.notes.some(n => /2 masked points of Width/.test(n)), JSON.stringify([r.t.n, r.notes]));
  // Resampled: the numbers describe made points, said.
  await p.evaluate(ids => { const c = colById(ids[2]); pushUndo("x"); c.pipe = [makeStep("resample", Object.assign({}, PIPE_OPS.resample.defaults))]; save({ cols: P().cols }, "step"); renderAll(); }, ids); await p.waitForTimeout(300);
  r = await RES(p);
  check("after a step that makes points, the report says the numbers describe them", r.notes.some(n => /made or averaged points/.test(n)), JSON.stringify(r.notes));
  // Manual: marked, then recalculated.
  await p.evaluate(() => { anaSetRecalc(anaList()[0].id, "manual"); }); await p.waitForTimeout(200);
  await p.evaluate(ids => { const c = colById(ids[2]); const d = c.data.slice(); d[5] = 50; c.data = d; save({ cols: P().cols }, "typed"); }, ids); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const a = anaList()[0]; return { st: anaStale(a), cls: (document.querySelector(`#wsTabs [data-wst="${a.out.sheet}"]`) || {}).className || "", item: anaMenuItems(a).find(i => i.label === "Recalculate").enabled }; });
  check("set to Only when asked, a change marks it out of date (the tab says so), Recalculate offered", r.st && /stale/.test(r.cls) && r.item, JSON.stringify(r));
  const before = (await RES(p)).t.max[1];
  await p.evaluate(() => { anaRecalc(anaList()[0].id); }); await p.waitForTimeout(300);
  r = await RES(p);
  check("…Recalculate works it out (one undo step), up to date again", !r.st && r.t.max[1] !== before, JSON.stringify([before, r.t.max[1], r.st]));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300); r = await RES(p);
  check("…and its undo brings the old result back", r.t.max[1] === before, JSON.stringify(r.t.max));
  await p.evaluate(() => { redo(); }); await p.waitForTimeout(300);
  // Grouped.
  await p.evaluate(() => { anaSetRecalc(anaList()[0].id, "auto"); const a = anaList()[0]; anaDlg("desc", { id: a.id }); }); await p.waitForSelector("#aBy");
  await p.selectOption("#aBy", ids[3]); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await RES(p);
  check("grouped by a column of text: a row per column and group (A, B)", JSON.stringify(r.t.grp) === '["A","B","A","B"]' && r.t.n[0] === 6 && r.t.n[1] === 6, JSON.stringify(r.t));
  // An input deleted.
  await p.evaluate(ids => { deleteCols([ids[2]]); }, ids); await p.waitForTimeout(400);
  r = await RES(p);
  check("an input deleted: out of date, saying why", r && /deleted/.test(r.st || ""), JSON.stringify(r && r.st));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(400);
  // Kept across a reload; junk from storage cleaned.
  const t1 = JSON.stringify((await RES(p)).t);
  await p.waitForTimeout(1200); await p.reload(); await ready(p); await p.waitForTimeout(500);
  r = await RES(p);
  check("kept across a reload, up to date", r && JSON.stringify(r.t) === t1 && !r.st, JSON.stringify(r && r.st));
  r = await p.evaluate(() => { const q = { cols: [Object.assign(makeCol("ignore", "x", "", [1]), { ana: "zz", ak: "n" })], sheets: [{ id: "s1", name: "A", ana: "zz" }], ana: [{ id: "a1", kind: "nope", in: { cols: [] }, out: { sheet: "s1" } }, "junk", { id: "a2", kind: "desc", in: { cols: ["c1", 3] }, out: { sheet: "gone" } }, { id: "a3", kind: "desc", in: { cols: ["c1", 3] }, out: { sheet: "s1" }, recalc: "x" }] };
    anaClean(q); return { n: q.ana.length, a: q.ana[0] && { id: q.ana[0].id, rc: q.ana[0].recalc, cols: q.ana[0].in.cols }, col: q.cols[0].ana === undefined, sh: q.sheets[0].ana }; });
  check("analyses from storage in every broken form are cleaned", r.n === 1 && r.a.id === "a3" && r.a.rc === "auto" && JSON.stringify(r.a.cols) === '["c1"]' && r.col && r.sh === undefined, JSON.stringify(r));
  // The History's box, Results, Copy and the exported report (1.3b).
  await p.evaluate(() => { openWin("flow", { render: true }); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const a = anaList()[0], el = document.querySelector(`[data-node="ana:${a.id}"]`), ins = flowInspectorBody({ kind: "ana", aid: a.id, key: "ana:" + a.id });
    return { box: !!el, t: el ? el.textContent : "", ins: /Show its sheet/.test(ins) && ins.includes(a.name) && /Mean/.test(ins), edges: !!document.querySelector(".flow-edges") }; });
  check("the History has a box for it, named, with its report and Show its sheet", r.box && /Statistics 1/.test(r.t) && r.ins, JSON.stringify(r));
  await p.evaluate(() => { anaReport(anaList()[0].id); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const b = $("#pane-res"), s = b.querySelector("#rShowing"); return { v: s && s.value, id: anaList()[0].id, tab: /Height/.test(b.textContent) && !!b.querySelector("table"), opts: s ? [...s.options].map(o => o.textContent) : [] }; });
  check("Report opens Results at it, with Showing listing the fit and the analysis", r.v === r.id && r.tab && JSON.stringify(r.opts) === '["The fit","Statistics 1"]', JSON.stringify(r));
  await p.selectOption("#rShowing", ""); await p.waitForTimeout(200);
  r = await p.evaluate(() => { const b = $("#pane-res"); return { fit: /No fit yet/.test(b.textContent), pick: !!b.querySelector("#rShowing") }; });
  check("…and back to the fit, the list still there", r.fit && r.pick, JSON.stringify(r));
  r = await p.evaluate(() => { const a = anaList()[0], t = anaText(a), h = reportAnaHtml(); return { t: t.split("\n").slice(0, 4), reads: /# Reads: /.test(t), rep: h.includes("<h2>Analyses</h2>") && h.includes("Statistics 1") && /grouped by Batch/.test(h) && /worked out again whenever/.test(h) }; });
  check("Copy gives its tables as tab-separated rows with what it read; the exported report has a section for it", r.t[2] === "Statistics on columns" && /^Column\tGroup\tN/.test(r.t[3]) && r.reads && r.rep, JSON.stringify(r));
  // Cut from its data, then delete.
  await p.evaluate(() => { anaCut(anaList()[0].id); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ n: anaList().length, cols: P().cols.filter(c => c.ana).length, sheet: sheetList().filter(s => s.ana).length, kept: sheetList().length }));
  check("Cut from its data keeps the values as an ordinary sheet, the analysis gone", r.n === 0 && r.cols === 0 && r.sheet === 0 && r.kept === 2, JSON.stringify(r));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { anaDelete(anaList()[0].id); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ n: anaList().length, sheets: sheetList().length }));
  check("Delete the analysis takes its sheet too", r.n === 0 && r.sheets === 1, JSON.stringify(r));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  check("…and undo brings both back", await p.evaluate(() => anaList().length === 1 && sheetList().length === 2));
}, { name: "analyses" });

console.log("A large analysis, in the worker");
await page(async p => {
  await p.evaluate(() => { const n = 1000000, y = new Array(n); let s = 0; for (let i = 0; i < n; i++) { y[i] = (i % 1000) / 10; s += y[i]; } window.__mu = s / n;
    save({ cols: [makeCol("x", "X", "", []), Object.assign(makeCol("ignore", "Counts", "", y))], activeY: null }, "typed"); });
  await p.waitForTimeout(1500);
  const id = await p.evaluate(() => sheetCols(curSheet())[1].id);
  await p.evaluate(() => { anaDlg("desc"); }); await p.waitForSelector("#aRc"); await p.check(`#aI_${id}`);
  await p.click("#formOk");
  const t0 = Date.now(); let r = await p.evaluate(() => ({ jobs: ANA_JOBS.size, n: (anaList()[0] || {}).res ? 1 : 0 })); const dt = Date.now() - t0;
  await p.waitForTimeout(50); const toast1 = await p.evaluate(() => (document.querySelector(".toast") || {}).textContent || "");
  check("a column of a million values is worked out beside the page: the page answers at once, a message with Stop", r.jobs === 1 && dt < 400 && /Working out Statistics 1/.test(toast1) && /Stop/.test(toast1), JSON.stringify([r, dt, toast1]));
  await p.waitForFunction(() => { const a = anaList()[0]; return a && a.res && a.res.report; }, null, { timeout: 60000 });
  r = await p.evaluate(() => { const a = anaList()[0], c = P().cols.filter(c => c.ana === a.id), g = k => (c.find(q => q.ak === k) || {}).data; return { n: g("n")[0], mu: g("mean")[0], want: window.__mu, max: g("max")[0], jobs: ANA_JOBS.size, st: anaStale(a) }; });
  check("…its result put in when it comes back: N 1 000 000, the mean, the maximum", r.n === 1000000 && Math.abs(r.mu - r.want) < 1e-9 && r.max === 99.9 && !r.jobs && !r.st, JSON.stringify(r));
  // Stopped: a change starts it again by itself, and Stop ends it.
  await p.evaluate(id => { const c = colById(id), d = c.data.slice(); d[0] = 500; c.data = d; save({ cols: P().cols }, "typed"); }, id);
  await p.evaluate(() => { const j = [...ANA_JOBS.values()][0]; if (j) j.stop = true; });
  await p.waitForFunction(() => !ANA_JOBS.size, null, { timeout: 30000 }); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const a = anaList()[0]; return { st: anaStale(a), rec: anaMenuItems(a).find(i => i.label === "Recalculate").enabled }; });
  check("Stop ends it: out of date, saying it was stopped, Recalculate offered", /Stopped/.test(r.st || "") && r.rec, JSON.stringify(r));
  await p.evaluate(() => { anaRecalc(anaList()[0].id); });
  await p.waitForFunction(() => { const a = anaList()[0]; return !ANA_JOBS.size && a.res && !a.res.err; }, null, { timeout: 60000 });
  r = await p.evaluate(() => { const a = anaList()[0]; return (P().cols.find(c => c.ana === a.id && c.ak === "max") || {}).data[0]; });
  check("…and Recalculate works it out again (the new maximum, 500)", r === 500, r);
}, { name: "worker" });

console.log("2.1: descriptive statistics, whole; frequency counts; the graphical summary");
await page(async p => {
  await p.evaluate(SETUP); await p.waitForTimeout(400);
  const ids = await p.evaluate(() => sheetCols(curSheet()).map(c => c.id));
  // The dialog: the statistics as ticks, the old eleven ticked; the method's settings shown only with what uses them.
  await p.evaluate(() => { anaDlg("desc"); }); await p.waitForSelector("#aRc");
  let d = await p.evaluate(() => ({ on: DESC_STATS.map(e => e[0]).filter(k => document.getElementById("aS_" + k).checked), qt: !document.getElementById("aQt").hidden, conf: !document.getElementById("aConf").hidden }));
  check("the dialog ticks the eleven statistics Statistics on columns had, and hides the interval's level until it is ticked", d.on.join() === DESC_DEF_JS && d.qt && !d.conf, JSON.stringify(d));
  for (const k of ["n", "miss", "sd", "se", "min", "q1", "q3", "max", "sum"]) await p.uncheck(`#aS_${k}`);
  for (const k of ["ci", "skew", "kurt", "cv", "mode", "mad"]) await p.check(`#aS_${k}`);
  await p.fill("#aPct", "10, 90"); await p.selectOption("#aQt", "6"); await p.selectOption("#aConf", "0.99");
  d = await p.evaluate(() => !document.getElementById("aConf").hidden); check("…the level shows once the interval is ticked", d);
  await p.check(`#aI_${ids[2]}`); await p.click("#formOk"); await p.waitForTimeout(600);
  let r = await RES(p);
  const want = await p.evaluate(ids => { const v = colById(ids[1]).data.filter(x => x != null), s = v.slice().sort((a, b) => a - b), n = v.length, m = v.reduce((a, b) => a + b) / n,
    sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)), t = DIST.t.isf(0.005, n - 1), q = (p) => { const h = p * (n + 1); const j = Math.floor(h), g = h - j; return (1 - g) * s[Math.max(0, j - 1)] + g * s[Math.min(n - 1, j)]; };
    return { lo: m - t * sd / Math.sqrt(n), p10: q(0.1), p90: q(0.9), med: q(0.5) }; }, ids);
  check("…the result: the mean, its 99 % interval, the median and the 10th and 90th percentiles by type 6", r && Math.abs(r.t.cilo[0] - want.lo) < 1e-9 && Math.abs(r.t.p0[0] - want.p10) < 1e-12 && Math.abs(r.t.p1[0] - want.p90) < 1e-12 && Math.abs(r.t.med[0] - want.med) < 1e-12 && !("sd" in r.t) && "skew" in r.t, JSON.stringify([r && r.t, want]));
  const rep = await p.evaluate(() => { const a = anaList()[0]; return [a.res.report.method, anaText(a)]; });
  check("…the report says how: the quartiles' method and the divisor", /weighted average right \(type 6\)/.test(rep[0]) && /n − 1/.test(rep[0]) && /# Quantiles/.test(rep[1]), rep[0]);
  check("…a column whose values never repeat leaves its mode blank and says so", r.t.mode[0] == null && /Mode: left blank for values that never repeat/.test(rep[1]), rep[1].slice(-400));
  // Rows and listwise, by changing its settings.
  await p.evaluate(() => { const a = anaList()[0]; anaDlg("desc", { id: a.id }); }); await p.waitForSelector("#aRc");
  await p.fill("#aRow0", "3"); await p.fill("#aRow1", "8"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const a = anaList()[0], c = P().cols.find(c => c.ana === a.id && c.ak === "mean"); return [c.data[0], a.res.notes.join(" | ")]; });
  check("rows 3 to 8 only: the mean of those rows, and said", Math.abs(r[0] - [5, 7, 9, 11, 13, 15].reduce((a, b) => a + b) / 6) < 1e-12 && /Rows 3 to 8 only/.test(r[1]), JSON.stringify(r));
  await p.evaluate(ids => { const c = colById(ids[2]); const d = c.data.slice(); d[4] = null; d[5] = null; pushUndo("x"); save({ cols: P().cols.map(q => q.id === c.id ? Object.assign({}, q, { data: d }) : q) }, "two blanks"); }, ids); await p.waitForTimeout(400);
  await p.evaluate(() => { const a = anaList()[0]; anaDlg("desc", { id: a.id }); }); await p.waitForSelector("#aRc"); await p.selectOption("#aMiss", "list"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const a = anaList()[0], c = P().cols.find(c => c.ana === a.id && c.ak === "mean"); return [c.data[0], a.res.notes.join(" | ")]; });
  check("listwise: only rows with a value in both columns (3, 4, 7, 8 of 3 to 8), said", Math.abs(r[0] - (5 + 7 + 13 + 15) / 4) < 1e-12 && /Listwise: the 4 rows/.test(r[1]), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo puts the settings back", await p.evaluate(() => anaList()[0].in.miss !== "list"));
  // Frequency counts of text and of numbers.
  await p.evaluate(ids => { anaDlg("freq", { cols: [ids[3], ids[1]] }); }, ids); await p.waitForSelector("#aFm");
  d = await p.evaluate(ids => [!!document.getElementById("aI_" + ids[3]), !document.getElementById("aFw").hidden, !!document.getElementById("aBy")], ids);
  check("Frequency counts: a text column can be ticked, the width only shows for bins of a width, no Group by", d[0] && !d[1] && !d[2], JSON.stringify(d));
  await p.selectOption("#aFm", "w"); await p.fill("#aFw", "5"); await p.fill("#aFs", "0"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const a = anaList().find(x => x.kind === "freq"), o = {}; P().cols.filter(c => c.ana === a.id).forEach(c => { o[c.ak] = c.txt ? c.data.map((v, i) => c.txt[i] != null ? c.txt[i] : v) : c.data.slice(); }); return o; });
  const of = (nm, k) => r[k].filter((_, i) => r.col[i] === nm);
  check("…the text column counted by its values, A 6 and B 6, each half", of("Batch", "lev").join() === "A,B" && of("Batch", "n").join() === "6,6" && of("Batch", "pct")[0] === 50 && of("Batch", "cpct")[1] === 100, JSON.stringify(r));
  check("…the numbers in bins 5 wide from 0: 1 3 | 5 7 9 | 11 13 | 15 17 19 | 21 23", of("Height", "lo").join() === "0,5,10,15,20" && of("Height", "n").join() === "2,3,2,3,2" && of("Height", "cpct")[4] === 100, JSON.stringify([r.lo, r.n]));
  // The graphical summary: one undo step, a figure of a histogram with a normal curve and a box chart.
  const g0 = await p.evaluate(() => [P().graphs.length, allCols().length]);
  await p.evaluate(ids => graphSummary(ids[1]), ids); await p.waitForTimeout(700);
  r = await p.evaluate(ids => { const f = P().graphs.find(g => g.fig), cells = f ? f.fig.cells.map(c => graphOf(c.gid)) : [];
    return [!!f, cells.length, cells.some(g => g.plot.layout === "box" && g.cols[0] === ids[1]), cells.some(g => Object.values(g.plot.series || {}).some(s => s.dist === "normal")), !!document.querySelector("#plot path[data-hdist], .gsnap path[data-hdist]")]; }, ids);
  check("Graphical summary: a figure of two panels, a box chart and a histogram with a normal curve over it", r[0] && r[1] === 2 && r[2] && r[3], JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(500);
  check("…and one undo takes it all back", JSON.stringify(await p.evaluate(() => [P().graphs.length, allCols().length])) === JSON.stringify(g0));
  // Junk from storage.
  r = await p.evaluate(() => { const q = { ana: [{ id: "z", kind: "desc", name: "J", in: { cols: [], rows: ["x", 3], miss: 7 }, p: "junk", out: { sheet: sheetList()[0].id } }], sheets: sheetList(), cols: [] }; anaClean(q); const a = q.ana[0]; return [a.in.rows === undefined, a.in.miss === undefined, typeof a.p === "object" && !Array.isArray(a.p)]; });
  check("junk rows, missing-value setting and settings from storage are cleaned", r.every(Boolean), JSON.stringify(r));
  // Reload: the analyses come back with their settings.
  await p.reload(); await ready(p); await p.waitForTimeout(400);
  r = await p.evaluate(() => anaList().map(a => [a.kind, JSON.stringify(a.p)]));
  check("after a reload the analyses keep their settings", r.length === 2 && /"qtype":6/.test(r[0][1]) && /"w":5/.test(r[1][1]), JSON.stringify(r));
}, { name: "2.1" });

console.log("2.2: normality tests, the Q–Q plot, outliers masked and marked");
await page(async p => {
  // A sheet: X, Mass (18 values near 10 and two far ones, 19.5 and 16), a text column of groups.
  await p.evaluate(() => { const base = [10.46, 10.18, 11.34, 7.51, 8.95, 10.7, 9.68, 10.99, 10.25, 9.55, 11.39, 10.11, 9.78, 11.21, 10.64, 9.79, 8.52, 9.31];
    const x = base.map((_, i) => i).concat([18, 19]), m = base.concat([19.5, 16]);
    const X = Object.assign(makeCol("x", "X", ""), { data: x }), M = Object.assign(makeCol("y", "Mass", "g"), { data: m }), G = Object.assign(makeCol("ignore", "Batch", ""), { data: m.map(() => null), fmt: "text", txt: Object.fromEntries(m.map((_, i) => [i, i % 2 ? "B" : "A"])) });
    save({ cols: [X, M, G], activeY: M.id }, "typed"); });
  await p.waitForTimeout(400);
  const ids = await p.evaluate(() => sheetCols(curSheet()).map(c => c.id));
  // Normality: Shapiro–Wilk, Lilliefors and Anderson–Darling ticked.
  await p.evaluate(ids => { anaDlg("norm", { cols: [ids[1]] }); }, ids); await p.waitForSelector("#aN_sw");
  let d = await p.evaluate(() => ({ sw: document.getElementById("aN_sw").checked, lf: document.getElementById("aN_lf").checked, by: !!document.getElementById("aBy") }));
  check("Normality tests: Shapiro–Wilk ticked at first, the others not, Group by offered", d.sw && !d.lf && d.by, JSON.stringify(d));
  await p.check("#aN_lf"); await p.check("#aN_ad"); await p.click("#formOk"); await p.waitForTimeout(600);
  let r = await p.evaluate(ids => { const a = anaList().find(x => x.kind === "norm"), o = {}; P().cols.filter(c => c.ana === a.id).forEach(c => { o[c.ak] = { v: c.txt ? c.data.map((v, i) => c.txt[i] != null ? c.txt[i] : v) : c.data.slice(), role: c.role }; });
    const v = colById(ids[1]).data, sw = swTest(v), lf = lfTest(v), ad = adTest(v); return { o, sw, lf, ad, said: a.res.report.said, txt: anaText(a), id: a.id, html: anaReportHtml(a) }; }, ids);
  check("…a row with each test's statistic and p as the functions give them", r.o.sws.v[0] === r.sw.w && r.o.swp.v[0] === r.sw.p && r.o.lfs.v[0] === r.lf.d && r.o.ads.v[0] === r.ad.a2, JSON.stringify([r.o.sws, r.sw]));
  check("…numbers only: no verdict column, no sentence, the copied report opening with the table", !r.o.swv && !r.said && r.txt.split("\n")[2] === "Normality tests" && !/At the|normal\b.*found|may be/.test(r.html), r.txt.split("\n").slice(0, 3).join(" | "));
  check("…and the Q–Q plot's columns: the normal quantiles an X, 20 sorted values, the quartiles' line", r.o.qx0.role === "x" && r.o.qy0.v.length === 20 && r.o.qy0.v[19] === 19.5 && r.o.ql0.v.length === 20, JSON.stringify([r.o.qx0.role, r.o.qy0.v.length]));
  const g0 = await p.evaluate(() => P().graphs.length);
  await p.evaluate(() => { openWin("res", { render: true }); }); await p.evaluate(id => anaReport(id), r.id); await p.waitForTimeout(300);
  await p.click(`#w-res button[data-anaact="qq"]`); await p.waitForTimeout(600);
  d = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1], cs = g.cols.map(colById); return { n: P().graphs.length, cols: cs.map(c => [c.ak, c.role]), types: cs.map(c => ((g.plot.series || {})[c.id] || {}).type) }; });
  check("Q–Q plot (Results' button): a graph of the values as symbols and the line, against the normal quantiles", d.n === g0 + 1 && d.cols.map(c => c[0]).join() === "qy0,ql0" && d.types.join() === "scatter,line", JSON.stringify(d));
  await p.evaluate(() => { const a = anaList().find(x => x.kind === "norm"); anaRecalc(a.id); }); await p.waitForTimeout(300);
  d = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1]; return g.cols.map(id => colById(id)).map(c => c && c.role); });
  check("…worked out again, its curves stay curves", d.join() === "y,y", JSON.stringify(d));
  await p.evaluate(() => undo()); await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("…and undone", await p.evaluate(g0 => P().graphs.length === g0, g0));
  // Outliers: Grubbs, either side, repeated.
  await p.evaluate(ids => { anaDlg("outl", { cols: [ids[1]] }); }, ids); await p.waitForSelector("#aOt");
  await p.check("#aOr"); await p.selectOption("#aOt", "dixon");
  d = await p.evaluate(() => document.getElementById("aOr").closest("label").hidden); check("Outliers: Repeat is Grubbs' only", d);
  await p.selectOption("#aOt", "grubbs"); await p.click("#formOk"); await p.waitForTimeout(600);
  r = await p.evaluate(() => { const a = anaList().find(x => x.kind === "outl"), o = {}; P().cols.filter(c => c.ana === a.id).forEach(c => { o[c.ak] = c.txt ? c.data.map((v, i) => c.txt[i] != null ? c.txt[i] : v) : c.data.slice(); }); return { o, said: a.res.report.said, marks: a.res.report.marks, id: a.id }; });
  check("…Grubbs repeated: 19.5 (row 19) and 16 (row 20) past the critical value, the third not", r.o.value.slice(0, 2).join() === "19.5,16" && r.o.row.slice(0, 2).join() === "19,20" && r.o.stat[0] > r.o.crit[0] && r.o.stat[1] > r.o.crit[1] && r.o.stat[2] < r.o.crit[2] && r.marks.length === 2, JSON.stringify(r.o));
  check("…no Outlier column and no sentence", !r.o.out && !r.said, JSON.stringify(Object.keys(r.o)));
  await p.evaluate(id => anaReport(id), r.id); await p.waitForTimeout(300);
  await p.click(`#w-res button[data-anaact="mask"]`); await p.waitForTimeout(700);
  d = await p.evaluate(ids => { const a = anaList().find(x => x.kind === "outl"); return { mask: colById(ids[1]).mask, marks: a.res.report.marks.length }; }, ids);
  check("Mask: rows 19 and 20 masked, and the analysis, worked out again without them, has none past the critical value", d.mask.join() === "18,19" && d.marks === 0, JSON.stringify(d));
  await p.evaluate(() => undo()); await p.waitForTimeout(400);
  d = await p.evaluate(ids => ({ mask: (colById(ids[1]).mask || []).length, marks: anaList().find(x => x.kind === "outl").res.report.marks.length }), ids);
  check("…one undo takes the mask and the second result back", d.mask === 0 && d.marks === 2, JSON.stringify(d));
  await p.evaluate(id => anaMarkOut(id), r.id); await p.waitForTimeout(500);
  d = await p.evaluate(ids => (P().annos || []).filter(a => a.t === "label" && a.ser === ids[1] && a.text === "outlier").map(a => [a.row, a.y]), ids);
  check("Mark them on the graph: a label at each, on its column's graph", d.length === 2 && d.map(x => x[0]).join() === "18,19" && d[0][1] === 19.5, JSON.stringify(d));
  // By group: the rows are each group's own.
  await p.evaluate(ids => { const a = anaList().find(x => x.kind === "outl"); anaDlg("outl", { id: a.id }); }, ids); await p.waitForSelector("#aBy");
  await p.selectOption("#aBy", ids[2]); await p.click("#formOk"); await p.waitForTimeout(600);
  d = await p.evaluate(() => { const a = anaList().find(x => x.kind === "outl"); return a.res.report.marks.map(m => [m.grp, m.row, m.value]); });
  check("…by group: 19.5 found in A (row 19), 16 in B (row 20)", JSON.stringify(d) === JSON.stringify([["A", 18, 19.5], ["B", 19, 16]]), JSON.stringify(d));
  // Dixon's Q on 20 values.
  await p.evaluate(ids => { anaDlg("outl", { cols: [ids[1]] }); }, ids); await p.waitForSelector("#aOt");
  await p.selectOption("#aOt", "dixon"); await p.selectOption("#aOs", "max"); await p.click("#formOk"); await p.waitForTimeout(900);
  d = await p.evaluate(() => { const as = anaList().filter(x => x.kind === "outl"), a = as[as.length - 1], t = a.res.report.sections[0].tables[0]; return [t.head, t.rows[0], a.res.report.method]; });
  check("Dixon's Q, the largest value: 19.5 examined, its Q, critical Q and p, and how they are found", d[1][d[0].indexOf("Value examined")] === 19.5 && d[0].some(h => /^Critical Q/.test(h)) && /integration/.test(d[2]), JSON.stringify(d));
  // Reload.
  await p.reload(); await ready(p); await p.waitForTimeout(500);
  d = await p.evaluate(() => anaList().map(a => a.kind + ":" + !!(a.res && a.res.report)));
  check("after a reload the three analyses are there with their results", d.join() === "norm:true,outl:true,outl:true", JSON.stringify(d));
}, { name: "2.2" });

console.log("2.3: t tests, spreads, proportions, Fisher's exact test");
await page(async p => {
  // Before and After (paired, rows), and a text column of groups A (tight) and B (spread out).
  await p.evaluate(() => { const bef = [10.1, 9.8, 11.2, 10.5, 9.9, 10.7, 10.2, 9.4, 10.8, 10.3, 9.6, 10.9], aft = [10.9, 10.1, 12.0, 11.5, 10.2, 11.6, 10.6, 10.3, 11.9, 11.0, 10.0, 11.4];
    const val = [10.0, 10.2, 9.9, 10.1, 10.05, 9.95, 6, 15, 8, 13.5, 4.5, 16], grp = val.map((_, i) => i < 6 ? "A" : "B");
    const X = Object.assign(makeCol("x", "X", ""), { data: bef.map((_, i) => i) }), B = Object.assign(makeCol("y", "Before", ""), { data: bef }), A = Object.assign(makeCol("y", "After", ""), { data: aft }),
      V = Object.assign(makeCol("y", "Yield", "%"), { data: val }), G = Object.assign(makeCol("ignore", "Line", ""), { data: val.map(() => null), fmt: "text", txt: Object.fromEntries(grp.map((g, i) => [i, g])) });
    save({ cols: [X, B, A, V, G], activeY: B.id }, "typed"); });
  await p.waitForTimeout(400);
  const ids = await p.evaluate(() => sheetCols(curSheet()).map(c => c.id));
  const last = () => p.evaluate(() => { const a = anaList()[anaList().length - 1], rep = a.res.report || {}, t = rep.sections ? rep.sections[0].tables[0] : { head: [], rows: [[]] };
    const o = {}; t.head.forEach((h, j) => { o[h] = t.rows[0][j]; }); return { kind: a.kind, head: t.head, row: o, rows: t.rows, said: rep.said, checks: rep.checks, err: a.res.err, p: a.p, id: a.id, html: anaReportHtml(a) }; });
  // One sample against 10.
  await p.evaluate(ids => { anaDlg("ttest", { cols: [ids[1]] }); }, ids); await p.waitForSelector("#aTt");
  let d = await p.evaluate(() => document.getElementById("aEq").closest("label").hidden); check("t tests: the dialog hides Equal variances unless two samples are compared", d);
  await p.fill("#aMu", "10"); await p.selectOption("#aCf", "0.99"); await p.click("#formOk"); await p.waitForTimeout(600);
  let r = await last(), w = await p.evaluate(ids => tTest1(colById(ids[1]).data, { mu0: 10, conf: 0.99 }), ids);
  check("…one sample: t, df, p and the 99% interval as tTest1 gives them, and nothing else said", r.row.t === w.t && r.row.df === 11 && r.row.p === w.p && r.row["99% interval of the mean, from"] === w.ci[0] && !r.said && !r.checks && !r.head.some(h => /^At /.test(h)) && !/At the|differ/.test(r.html), JSON.stringify(r.row));
  d = await p.evaluate(() => [anaConf({ alpha: 0.01 }), anaConf({}), anaConf({ conf: 0.9 }), anaConf({ conf: 7 })].join());
  check("…an analysis stored with α 0.01 reads a 99% interval; none, 95%; junk, 95%", d === "0.99,0.95,0.9,0.95", d);
  // Two samples by group, Student's: the variances are far apart, and nothing says so.
  await p.evaluate(ids => { anaDlg("ttest", { cols: [ids[3]] }); }, ids); await p.waitForSelector("#aTt");
  await p.selectOption("#aTt", "two"); await p.selectOption("#aBy", ids[4]); await p.check("#aEq"); await p.click("#formOk"); await p.waitForTimeout(600);
  r = await last(); w = await p.evaluate(() => tTest2([10.0, 10.2, 9.9, 10.1, 10.05, 9.95], [6, 15, 8, 13.5, 4.5, 16], { equal: true }));
  check("…two samples grouped by Line, Student's: A against B, t and df pooled", r.row.First === "Yield (A)" && r.row.Second === "Yield (B)" && r.row.t === w.t && r.row.df === 10 && /Student/.test(r.html), JSON.stringify(r.row));
  await p.evaluate(id => anaReport(id), r.id); await p.waitForTimeout(300);
  d = await p.evaluate(() => ({ fix: !!document.querySelector('#w-res button[data-anaact^="fix"]'), notes: document.querySelectorAll("#w-res .note").length }));
  check("…no check, note or button about the unequal variances", !d.fix && d.notes === 0, JSON.stringify(d));
  // Paired.
  await p.evaluate(ids => { anaDlg("ttest", { cols: [ids[2], ids[1]] }); }, ids); await p.waitForSelector("#aTt");
  await p.selectOption("#aTt", "paired"); await p.click("#formOk"); await p.waitForTimeout(600);
  r = await last(); w = await p.evaluate(ids => tTestPaired(colById(ids[1]).data, colById(ids[2]).data, {}), ids);
  check("…paired, in the sheet's order, Before − After: a mean difference of −0.675 and paired t", r.row.First === "Before" && r.row["Mean difference"] === w.mean && Math.abs(w.mean + 0.675) < 1e-12 && r.row.p === w.p && /Paired t/.test(r.html), JSON.stringify(r.row));
  // Spreads: every test ticked on the two groups.
  await p.evaluate(ids => { anaDlg("vartest", { cols: [ids[3]] }); }, ids); await p.waitForSelector("#aV_bf");
  for (const k of ["lev", "bart", "f"]) await p.check(`#aV_${k}`); await p.selectOption("#aBy", ids[4]); await p.click("#formOk"); await p.waitForTimeout(600);
  r = await last(); w = await p.evaluate(() => { const A = [10.0, 10.2, 9.9, 10.1, 10.05, 9.95], B = [6, 15, 8, 13.5, 4.5, 16]; return [leveneTest([A, B], "median").p, leveneTest([A, B], "mean").p, bartlettTest([A, B]).p, fTest2(A, B).p]; });
  check("Comparing spreads: a row a test, each p as its function gives it, no verdict column", r.rows.length === 4 && r.rows.map(x => x[4]).join() === w.join() && r.head.length === 7, JSON.stringify(r.rows));
  // Proportions and Fisher's test: counts typed, no columns.
  await p.evaluate(() => { anaDlg("prop"); }); await p.waitForSelector("#aPx");
  d = await p.evaluate(() => !document.querySelector("#formBody .anacols") && document.getElementById("aPx2").hidden);
  check("Proportions: no columns, the second sample's fields hidden for one proportion", d);
  await p.fill("#aPx", "7"); await p.fill("#aPn", "20"); await p.fill("#aP0", "0.5"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await last(); w = await p.evaluate(() => propTest1(7, 20, { p0: 0.5 }));
  check("…7 of 20 against 0.5: the exact binomial p, its interval, no sentence", r.row["Exact p"] === w.p && Math.abs(w.p - 0.2632) < 1e-4 && r.row["95% interval (Clopper–Pearson), from"] === w.ci[0] && !r.said, JSON.stringify(r.row));
  const ok0 = await p.evaluate(() => { anaDlg("prop"); return true; }); await p.waitForSelector("#aPx"); await p.fill("#aPx", "21"); await p.fill("#aPn", "20");
  d = await p.evaluate(() => document.getElementById("formOk").disabled); check("…more successes than trials is not taken", ok0 && d); await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  await p.evaluate(() => { anaDlg("fisher"); }); await p.waitForSelector("#aFa");
  for (const [k, v] of [["a", 10], ["b", 2], ["c", 3], ["d", 15]]) await p.fill(`#aF${k}`, String(v)); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await last(); check("Fisher's exact test on 10, 2, 3, 15: p 0.00054, the odds ratio 21.31 from 2.753 to 301.5", Math.abs(r.row.p - 0.00054) < 1e-5 && Math.abs(r.row["Odds ratio"] - 21.31) < 0.01 && Math.abs(r.row["95% interval, from"] - 2.753) < 1e-3 && Math.abs(r.row.to - 301.5) < 0.1 && !r.said, JSON.stringify(r.row));
  d = await p.evaluate(() => { const a = anaList()[anaList().length - 1]; return anaText(a).split("\n").pop(); }); check("…its copied report says it came from the counts typed", /^# From the counts typed/.test(d), d);
  await p.reload(); await ready(p); await p.waitForTimeout(500);
  d = await p.evaluate(() => anaList().map(a => a.kind).join());
  check("after a reload every test is there", d === "ttest,ttest,ttest,vartest,prop,fisher", d);
}, { name: "2.3" });

console.log("2.4: one-way ANOVA, its comparisons, the worker, the means plot");
await page(async p => {
  // Four groups as columns (A to D), and the same values as one column with a text column of groups.
  await p.evaluate(() => { const G = [[4.1, 5.2, 6.0, 5.5, 4.8], [6.2, 7.1, 6.8, 7.5, 6.6, 7.0], [5.0, 5.4, 4.9, 5.8], [8.1, 7.6, 8.4, 7.9, 8.8]], n = 6;
    const X = Object.assign(makeCol("x", "X", ""), { data: Array.from({ length: n }, (_, i) => i) }), cs = G.map((g, j) => Object.assign(makeCol("y", "ABCD"[j], ""), { data: g.concat(Array(n - g.length).fill(null)) }));
    const all = G.flat(), lab = G.flatMap((g, j) => g.map(() => "L" + "ABCD"[j])), Y = Object.assign(makeCol("y", "Yield", "%"), { data: all });
    const L = Object.assign(makeCol("ignore", "Line", ""), { data: all.map(() => null), fmt: "text", txt: Object.fromEntries(lab.map((t, i) => [i, t])) });
    save({ cols: [X, ...cs, Y, L], activeY: cs[0].id }, "typed"); });
  await p.waitForTimeout(400);
  const ids = await p.evaluate(() => sheetCols(curSheet()).map(c => c.id));
  await p.evaluate(ids => { anaDlg("anova1", { cols: ids.slice(1, 5) }); }, ids); await p.waitForSelector("#aC_tukey");
  let d = await p.evaluate(() => ({ tk: document.getElementById("aC_tukey").checked, others: COMP_KINDS.filter(e => e[0] !== "tukey").every(e => !document.getElementById("aC_" + e[0]).checked), ctl: document.getElementById("aCtl").hidden }));
  check("One-way ANOVA's dialog: Tukey–Kramer ticked at first, the others not, Control hidden", d.tk && d.others && d.ctl, JSON.stringify(d));
  await p.check("#aC_dunnett"); await p.waitForTimeout(100);
  d = await p.evaluate(() => ({ hidden: document.getElementById("aCtl").hidden, opts: [...document.querySelectorAll("#aCtl option")].map(o => o.value) }));
  check("…Dunnett ticked shows Control, listing the groups ticked", !d.hidden && d.opts.join() === "A,B,C,D", JSON.stringify(d));
  await p.selectOption("#aCtl", "B"); await p.check("#aC_holm"); await p.check("#aWe"); await p.click("#formOk");
  await p.waitForFunction(() => { const a = anaList().find(x => x.kind === "anova1"); return a && a.res && a.res.report; }, null, { timeout: 60000 });
  let r = await p.evaluate(() => { const a = anaList().find(x => x.kind === "anova1"), G = ["A", "B", "C", "D"].map(n => yCols().find(c => c.name === n).data.filter(v => v != null)), w = anova1(G), rep = a.res.report;
    const sec = t => rep.sections.find(s => s.title.startsWith(t)), row = (t, i) => sec(t).tables[0].rows[i || 0];
    const tk = anovaComp(w, "tukey", { conf: 0.95 }).rows, du = anovaComp(w, "dunnett", { conf: 0.95, ctrl: 1 }).rows;
    return { F: row("Analysis of variance")[4], wF: w.F, p: row("Analysis of variance")[5], wp: w.p, eta: row("Effect size")[0], weta: w.eta2, welch: row("Welch's F")[0], wwelch: w.welch.F,
      tk: sec("Tukey").tables[0].rows.map(x => x[3]), wtk: tk.map(x => x.p), du: sec("Dunnett").title, dup: sec("Dunnett").tables[0].rows.map(x => x[3]), wdu: du.map(x => x.p),
      holm: sec("Holm").tables[0].rows.map(x => x[4]), grp: sec("Groups").tables[0].rows.map(x => x[0]).join(), said: rep.said, id: a.id }; });
  check("…F, p, η² and Welch's F as anova1 gives them", r.F === r.wF && r.p === r.wp && r.eta === r.weta && r.welch === r.wwelch, JSON.stringify(r));
  check("…Tukey–Kramer's p as anovaComp gives them", r.tk.join() === r.wtk.join(), JSON.stringify([r.tk, r.wtk]));
  check("…Dunnett against B (worked out in the worker), its p as on the page", /against B, 95%/.test(r.du) && r.dup.every((v, i) => Math.abs(v - r.wdu[i]) < 1e-15 * Math.max(1, r.wdu[i])), JSON.stringify([r.du, r.dup, r.wdu]));
  check("…Holm with no interval, the groups listed, and no sentence", r.holm.every(v => v == null) && r.grp === "A,B,C,D" && !r.said, JSON.stringify([r.holm, r.grp]));
  // The means plot.
  await p.evaluate(() => { openWin("res", { render: true }); }); await p.evaluate(id => anaReport(id), r.id); await p.waitForTimeout(300);
  const g0 = await p.evaluate(() => P().graphs.length);
  await p.click(`#w-res button[data-anaact="means"]`); await p.waitForTimeout(600);
  d = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1], y = colById(g.cols[0]), x = xColFor(y), e = errColFor(y.id); return { n: P().graphs.length, ak: y.ak, x: x && x.ak, e: e && e.ak, type: ((g.plot.series || {})[y.id] || {}).type, cat: !!(x && isCatCol(x)) }; });
  check("Means plot: a graph of the means joined, against the groups' names, the intervals as error bars", d.n === g0 + 1 && d.ak === "gmean" && d.x === "gname" && d.cat && d.e === "ghw" && d.type === "linesym", JSON.stringify(d));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  // Grouped: one column and a column of groups; the control from its levels.
  await p.evaluate(ids => { anaDlg("anova1", { cols: [ids[5]] }); }, ids); await p.waitForSelector("#aC_tukey");
  await p.selectOption("#aBy", ids[6]); await p.check("#aC_dunnett"); await p.waitForTimeout(100);
  d = await p.evaluate(() => [...document.querySelectorAll("#aCtl option")].map(o => o.value).join());
  check("…grouped by Line: Control lists its levels", d === "LA,LB,LC,LD", d);
  await p.uncheck("#aC_dunnett"); await p.click("#formOk"); await p.waitForTimeout(800);
  r = await p.evaluate(() => { const as = anaList().filter(x => x.kind === "anova1"), a = as[as.length - 1], b = as[0], f = s => s.res.report.sections[0].tables[0].rows[0][4]; return { a: f(a), b: f(b), grp: a.res.report.sections.find(s => s.title === "Groups").tables[0].rows.map(x => x[0]).join() }; });
  check("…the same F as the four columns, the groups named by their levels", r.a === r.b && r.grp === "LA,LB,LC,LD", JSON.stringify(r));
  // Follows its data.
  await p.evaluate(ids => { const c = colById(ids[1]); pushUndo("t"); c.data = c.data.slice(); c.data[0] = 9; save({ cols: P().cols }, "typed 9"); }, ids);
  await p.waitForFunction(() => { const a = anaList().find(x => x.kind === "anova1"); return a && !ANA_JOBS.has(a.id) && a.res.report && a.res.report.sections[0].tables[0].rows[0][4] !== null; }, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  r = await p.evaluate(ids => { const a = anaList().find(x => x.kind === "anova1"), G = ids.slice(1, 5).map(id => colById(id).data.filter(v => v != null)); return [a.res.report.sections[0].tables[0].rows[0][4], anova1(G).F]; }, ids);
  check("…a value typed: worked out again by itself", r[0] === r[1], JSON.stringify(r));
  // A refusal in words.
  await p.evaluate(ids => { anaDlg("anova1", { cols: [ids[1]] }); }, ids); await p.waitForSelector("#aC_tukey"); await p.click("#formOk"); await p.waitForTimeout(600);
  d = await p.evaluate(() => { const as = anaList().filter(x => x.kind === "anova1"); return as[as.length - 1].res.err; });
  check("…one group is refused in words", /two groups/.test(d || ""), d);
  await p.reload(); await ready(p); await p.waitForTimeout(800);
  d = await p.evaluate(() => anaList().filter(x => x.kind === "anova1").map(a => !!(a.res && (a.res.report || a.res.err))).join());
  check("after a reload the three are there", d === "true,true,true", d);
}, { name: "2.4" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
