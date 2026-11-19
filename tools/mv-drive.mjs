/* Wave 6, many variables (ux/spec/MULTI_SPEC.md), in the browser: every menu item, dialog and control the wave adds, clicked;
   the results read off the sheet against the pure functions; the plots, recalculation, undo, the worker, a reload.
   Usage: node tools/mv-drive.mjs [kurve.html]   (ONLY=6.2 runs that section alone) */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
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
  if (process.env.ONLY && opt.name !== process.env.ONLY) return;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), 240000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
// The menu bar, clicked: a top menu, then each label hovered and the last clicked.
const menu = async (p, top, ...path) => { await p.click(`button.mb[data-menu="${top}"]`); await p.waitForTimeout(150);
  for (const label of path) { const ex = new RegExp("^\\s*" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$");
    const it = p.locator(".menu:visible .mi").filter({ hasText: ex }).last(); await it.hover(); await p.waitForTimeout(170); if (label === path[path.length - 1]) await it.click(); } await p.waitForTimeout(300); };
// The analysis's result sheet: { key: values } and the columns' names, units and roles.
const RES = (p, i = 0) => p.evaluate(i => { const a = anaList()[i]; if (!a) return null; const t = {}, meta = {};
  P().cols.filter(c => c.ana === a.id).forEach(c => { t[c.ak] = c.txt ? c.data.map((v, i) => c.txt[i] != null ? c.txt[i] : v) : c.data.slice(); meta[c.ak] = { name: c.name, unit: c.unit, role: c.role }; });
  return { t, meta, kind: a.kind, name: a.name, err: a.res && a.res.err, notes: (a.res && a.res.notes) || [], sheet: a.out.sheet, rep: a.res && a.res.report, p: a.p, id: a.id }; }, i);
const near = (a, b, tol) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tol * Math.max(1, ...b.map(Math.abs)));
// Four variables from two factors, a column of groups, 60 rows; row 7 an outlier.
const TABLE = () => { const mb = mulberry32(61), g = () => { let s = 0; for (let k = 0; k < 12; k++) s += mb(); return s - 6; };
  const A = [], B = [], C = [], D = [], G = {};
  for (let i = 0; i < 60; i++) { const f1 = g(), f2 = g(); A.push(+(10 + 2 * f1 + 0.3 * g()).toFixed(6)); B.push(+(50 + 8 * f1 + 1.5 * g()).toFixed(6)); C.push(+(5 * f2 + 0.5 * g()).toFixed(6)); D.push(+(f1 - f2 + 0.2 * g()).toFixed(6)); G[i] = i % 3 ? "Leaf" : "Root"; }
  A[6] = 40; D[6] = -9;
  const cols = [makeCol("x", "Index", "", A.map((_, i) => i + 1)), Object.assign(makeCol("y", "Length", "mm", A), { pipe: [], mask: [] }), Object.assign(makeCol("y", "Mass", "g", B), { pipe: [], mask: [] }),
    Object.assign(makeCol("y", "Width", "mm", C), { pipe: [], mask: [] }), Object.assign(makeCol("y", "Ratio", "", D), { pipe: [], mask: [] }), Object.assign(makeCol("ignore", "Part", "", A.map(() => null)), { txt: G, fmt: "text" })];
  save({ cols, activeY: null }, "typed"); };
// Twelve curves on one X (each a mix of two bands), a header field naming their batch.
const CURVES = ([n, m]) => { const mb = mulberry32(62), x = Array.from({ length: m }, (_, i) => 400 + i * 2), cols = [makeCol("x", "Shift", "cm⁻¹", x)];
  for (let c = 0; c < n; c++) { const a = 1 + mb(), b = 2 * mb(); cols.push(Object.assign(makeCol("y", "S" + (c + 1), "counts", x.map(v => +(1000 * (a * Math.exp(-(((v - 600) / 30) ** 2)) + b * Math.exp(-(((v - 900) / 20) ** 2))) + 5 * (mb() - 0.5)).toFixed(4))), { pipe: [], mask: [], meta: { Batch: c % 2 ? "B" : "A", Operator: "Kim" } })); }
  save({ cols, activeY: cols[1].id }, "typed"); };

console.log("6.2 Principal components");
await page(async p => {
  await p.evaluate(TABLE); await p.waitForTimeout(300);
  await p.evaluate(() => { showSheet(SHEET0.id, { quiet: true }); }); await p.waitForTimeout(100);
  await menu(p, "analyze", "Statistics", "Multivariate", "Principal component analysis…");
  check("Analyze › Statistics › Multivariate › Principal component analysis… opens its dialog", await p.isVisible("#aMl") && await p.isVisible("#aMs") && await p.isVisible("#aMk"));
  const f0 = await p.evaluate(() => ({ lay: $("#aMl").value, sc: $("#aMs").value, g: $("#aMg").hidden, h: $("#aMh").hidden, miss: !!$("#aMiss"), by: !!$("#aBy"), gopts: [...$("#aMg").options].map(o => o.textContent.trim()) }));
  check("…columns are the variables by default, unit variance, Groups listing the text column; no Missing values or Group by", f0.lay === "cols" && f0.sc === "unit" && !f0.g && f0.h && !f0.miss && !f0.by && f0.gopts.some(t => /Part/.test(t)), JSON.stringify(f0));
  await p.selectOption("#aMl", "curves"); await p.waitForTimeout(80);
  const f1 = await p.evaluate(() => ({ sc: $("#aMs").value, g: $("#aMg").hidden, h: $("#aMh").hidden }));
  check("…each column an observation: the scaling follows to Centred, the groups to a header field", f1.sc === "none" && f1.g && !f1.h, JSON.stringify(f1));
  await p.selectOption("#aMl", "cols"); await p.waitForTimeout(80);
  check("…and back to unit variance (the scaling untouched follows the layout)", await p.evaluate(() => $("#aMs").value === "unit"));
  await p.fill("#aMk", "0"); await p.waitForTimeout(80); check("…0 components refused (OK off)", await p.isDisabled("#formOk"));
  await p.fill("#aMk", "3"); await p.waitForTimeout(60);
  const ids = await p.evaluate(() => yCols().map(c => c.id));
  for (const id of ids) await p.check(`#aI_${id}`);
  const part = await p.evaluate(() => P().cols.find(c => c.name === "Part").id); await p.selectOption("#aMg", part);
  await p.click("#formOk"); await p.waitForTimeout(700);
  let r = await RES(p);
  check("a result sheet, PCA 1, shown at once", r && r.name === "PCA 1" && !r.err && await p.evaluate(s => curSheet() === s, r.sheet), r && (r.err || r.name));
  const ref = await p.evaluate(() => { const X = []; const cs = sheetCols(SHEET0.id).filter(c => c.role === "y"); for (let i = 0; i < 60; i++) X.push(cs.map(c => c.data[i])); return pca(X, { scale: "unit", k: 3 }); });
  check("…the eigenvalues, shares and loadings are pca()'s on the same table", near(r.t.ev, ref.ev, 1e-14) && near(r.t.pct, ref.share.map(v => 100 * v), 1e-14) && near(r.t.l2, ref.V.map(v => v[1]), 1e-14), JSON.stringify(r.t.ev));
  check("…the scores, T² and Q a row an observation", near(r.t.t1, ref.T.map(t => t[0]), 1e-13) && near(r.t.t2h, ref.t2, 1e-13) && near(r.t.qr, ref.q, 1e-13) && r.t.obs[0] === "Row 1" && r.t.obs.length === 60);
  check("…the groups as text, the scores plot's curves a group (Root, Leaf)", r.t.grp[0] === "Root" && r.t.grp[1] === "Leaf" && r.meta.sy0.name === "Root" && r.meta.sy1.name === "Leaf" && r.t.sy0.length === 20 && r.meta.sx0.role === "x" && r.meta.sy0.role === "y", JSON.stringify(r.meta.sy0));
  check("…the scree's Component an X and Eigenvalue a Y; the loadings' names text", r.meta.pc.role === "x" && r.meta.ev.role === "y" && r.t.var[0] === "Length" && r.t.var.length === 4);
  const T2L = r.rep.sections.find(s => /^Limits/.test(s.title)), past = r.rep.marks.map(m => m.row);
  check("…the limits at 95 %, row 7 (the outlier) past one", T2L && Math.abs(T2L.tables[0].rows[0][1] - ref.t2lim) < 1e-12 && past.includes(6), JSON.stringify(past));
  check("…the method says the layout, the scaling, the SVD and the sign rule", /4 columns the variables and 60 rows/.test(r.rep.method) && /standard deviation/.test(r.rep.method) && /largest magnitude is positive/.test(r.rep.method), r.rep.method);
  // the report's buttons
  await p.evaluate(id => anaReport(id), r.id); await p.waitForTimeout(400);
  const btns = await p.evaluate(() => [...document.querySelectorAll("#w-res [data-anaact]")].map(b => b.textContent.trim()));
  check("Results shows the report with Scree plot, Scores plot, Loadings plot, T² against Q, Biplot and Mask", ["Scree plot", "Scores plot", "Loadings plot", "T2 against Q", "Biplot", "Mask"].every(t => btns.includes(t)) /* T² set as T and a raised 2 */, JSON.stringify(btns));
  const g0 = await p.evaluate(() => P().graphs.length);
  for (const [k, n, want] of [["scores", 2, (g) => g.titles.y === "Score PC2" && g.titles.x === "Score PC1" && g.names.includes("Root")], ["scree", 1, (g) => g.titles.y === "Eigenvalue"], ["load", 1, (g) => g.lab], ["tq", 3, (g) => g.lab && g.titles.x === "Hotelling's T²"], ["bi", 2, (g) => g.lab]]) {
    await p.evaluate(() => focusWin("res")); await p.click(`#w-res [data-anaact="${k}"]`); await p.waitForTimeout(500);
    const g = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1], pl = g.plot || {}; return { n: g.cols.length, names: g.cols.map(id => colById(id).name), titles: { x: pl.ax && pl.ax.x && pl.ax.x.title, y: pl.ax && pl.ax.y && pl.ax.y.title }, lab: Object.values(pl.use || {}).some(u => u.lab) }; });
    check(`…${k}: a new graph of ${n} curve${n > 1 ? "s" : ""}`, g.n === n && want(g), JSON.stringify(g));
  }
  check("…five graphs made, one undo step each", await p.evaluate(g0 => P().graphs.length - g0, g0) === 5);
  // Mask: the observations past a limit masked in every column read; worked out again without them
  await p.evaluate(() => focusWin("res")); await p.click('#w-res [data-anaact="mask"]'); await p.waitForTimeout(600);
  const mk = await p.evaluate(() => sheetCols(SHEET0.id).filter(c => c.role === "y").map(c => (c.mask || []).includes(6)));
  r = await RES(p);
  check("Mask: row 7 masked in the four columns, the PCA worked out again on 59 rows less those", mk.every(Boolean) && r.t.obs.length < 60 && !r.t.obs.includes("Row 7"), JSON.stringify([mk, r.t.obs.length]));
  await p.evaluate(() => undo()); await p.waitForTimeout(500); r = await RES(p);
  check("…undo: unmasked, 60 rows again", r.t.obs.length === 60 && await p.evaluate(() => !sheetCols(SHEET0.id).filter(c => c.role === "y")[0].mask.includes(6)));
  // a value typed: worked out again by itself
  await p.evaluate(() => { const c = sheetCols(SHEET0.id).filter(c => c.role === "y")[2]; pushUndo("a value"); const d = c.data.slice(); d[3] = 999; c.data = d; save({ cols: P().cols }, "typed a value"); renderAll(); }); await p.waitForTimeout(500);
  const r2 = await RES(p); check("a value typed: worked out again", Math.abs(r2.t.ev[0] - r.t.ev[0]) > 1e-6);
  await p.evaluate(() => undo()); await p.waitForTimeout(400);
  // a constant column under unit variance: refused in words
  await p.evaluate(() => { const c = sheetCols(SHEET0.id).filter(c => c.role === "y")[3]; pushUndo("constant"); c.data = c.data.map(() => 2); save({ cols: P().cols }, "constant"); renderAll(); }); await p.waitForTimeout(500);
  r = await RES(p); check("a column that does not vary, under unit variance: refused in words, naming it", r.err && /Ratio has the same value/.test(r.err), r.err);
  await p.evaluate(() => undo()); await p.waitForTimeout(400);
  // a reload keeps it
  await p.reload(); await ready(p); await p.waitForTimeout(500);
  r = await RES(p); check("a reload keeps the analysis and its sheet", r && r.kind === "pca" && r.t.ev.length === 4 && r.p.grp === part);
}, { name: "6.2" });

await page(async p => {
  await p.evaluate(CURVES, [12, 300]); await p.waitForTimeout(300);
  await p.evaluate(() => { anaDlg("pca"); }); await p.waitForTimeout(300);
  const f = await p.evaluate(() => ({ lay: $("#aMl").value, sc: $("#aMs").value, h: [...$("#aMh").options].map(o => o.value) }));
  check("curves that look like spectra: each column an observation by default, centred, the header fields offered", f.lay === "curves" && f.sc === "none" && f.h.includes("Batch"), JSON.stringify(f));
  const ids = await p.evaluate(() => sheetCols(SHEET0.id).filter(c => c.role === "y").map(c => c.id)); for (const id of ids) await p.check(`#aI_${id}`);
  await p.selectOption("#aMh", "Batch"); await p.fill("#aMk", "3"); await p.click("#formOk"); await p.waitForTimeout(800);
  let r = await RES(p);
  const ref = await p.evaluate(() => pca(sheetCols(SHEET0.id).filter(c => c.role === "y").map(c => c.data.slice()), { scale: "none", k: 3 }));
  check("twelve curves of 300 points: the loadings a curve each against X (Shift, cm⁻¹)", r.meta.vx.role === "x" && r.meta.vx.name === "Shift" && r.meta.vx.unit === "cm⁻¹" && r.meta.l1.role === "y" && r.t.vx.length === 300 && near(r.t.l1, ref.V.map(v => v[0]), 1e-13), JSON.stringify(r.meta.vx));
  check("…the scores a row a curve, named, grouped by the Batch field", r.t.obs[0] === "S1" && r.t.grp[0] === "A" && r.t.grp[1] === "B" && near(r.t.t1, ref.T.map(t => t[0]), 1e-13) && r.meta.sy0.name === "A");
  check("…eleven components (n − 1), two with most of the variance", r.t.ev.length === 11 && r.t.cum[1] > 99, JSON.stringify(r.t.cum.slice(0, 3)));
  check("…no biplot and no Mask for curves", !r.rep.pca.biplot && await p.evaluate(id => !anaActs(anaOf(id)).some(x => x.key === "mask" || x.key === "bi"), r.id));
  await p.evaluate(id => pcaPlot(id, "loadings"), r.id); await p.waitForTimeout(500);
  const g = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1]; return { n: g.cols.length, x: xColFor(colById(g.cols[0])).name }; });
  check("Loadings plot: the three loadings as curves against Shift", g.n === 3 && g.x === "Shift", JSON.stringify(g));
  // a curve on another X: read on the first's, said
  await p.evaluate(() => { const c = sheetCols(SHEET0.id).filter(c => c.role === "y")[4], x0 = xCol(), x = makeCol("x", "Shift 2", "cm⁻¹", x0.data.map(v => v + 1)); pushUndo("other X"); const i = P().cols.indexOf(c); P().cols.splice(i, 0, x); save({ cols: P().cols }, "x"); renderAll(); }); await p.waitForTimeout(600);
  r = await RES(p); check("a curve on another X: read on the first curve's X over the stretch they share, said", !r.err && r.notes.some(n => /do not share their X/.test(n)) && r.t.vx.length === 299 && r.t.vx[0] === 402, JSON.stringify(r.notes));
}, { name: "6.2" });

await page(async p => {
  // a large one goes to the worker, and gives the page's numbers
  await p.evaluate(CURVES, [120, 2000]); await p.waitForTimeout(300);
  const id = await p.evaluate(() => { const ids = sheetCols(SHEET0.id).filter(c => c.role === "y").map(c => c.id), a = { id: newAnaId(), kind: "pca", name: "PCA 1", in: { cols: ids, read: {} }, p: { layout: "curves", k: 4 }, out: { sheet: "s_pca" }, recalc: "auto", at: Date.now(), by: "" };
    const q = P(), sh = { id: "s_pca", name: "PCA 1", ana: a.id }; q.sheets = sheetList(q).concat([sh]); q.ana = [a]; const r = runAna(a, q); save(anaPatch({ ana: q.ana, sheets: q.sheets, cols: q.cols }, q), "pca"); return { id: a.id, r }; });
  check("120 curves of 2000 points: sent to the worker", id.r === "later");
  await p.waitForFunction(() => { const a = anaList()[0]; return a && a.res && (a.res.report || a.res.err); }, null, { timeout: 60000 });
  const r = await RES(p), ref = await p.evaluate(() => pca(sheetCols(SHEET0.id).filter(c => c.role === "y").map(c => c.data.slice()), { scale: "none", k: 4 }));
  check("…its eigenvalues and scores the page's own", !r.err && near(r.t.ev.slice(0, 10), ref.ev.slice(0, 10), 1e-13) && near(r.t.t2h, ref.t2, 1e-12), r.err);
}, { name: "6.2" });

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
