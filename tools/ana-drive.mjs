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

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
