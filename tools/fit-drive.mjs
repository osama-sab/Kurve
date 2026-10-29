/* The curve fit as complete as Origin's (ux/spec/FIT_SPEC.md), from slice 5 on: what each slice
   added to the Fit window and Results, clicked and typed into in a real browser.
   (Slices 1 to 4 are checked by tools/fit-test.mjs and tools/odd-test.mjs, and slice 7 of the
   design system by tools/ds-test.mjs.)
   Needs Playwright with Chromium. Usage:
     node tools/fit-drive.mjs [path/to/kurve.html]
   Set PLAYWRIGHT=/path/to/playwright/index.mjs if `playwright` is not
   installed where node can find it. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
// Served over HTTP, as odd-test does: file:// storage is unreliable in Chromium.
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 400))); }
};

const browser = await chromium.launch();
const ready = async (p) => { await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(150); };
async function page(fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.vw || { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p);
  await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  const T = opt.timeout || 60000;
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), T))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
// The decay example fitted with one exponential, Results open in front.
const decayFit = async p => {
  await p.evaluate(async () => { await loadExample("decay"); }); await p.waitForTimeout(600);
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); chooseModel("expdec"); }); await p.waitForTimeout(250);
  await p.evaluate(() => runFit()); await p.waitForTimeout(500);
  await p.evaluate(() => { openWin("res", { render: true }); focusWin("res"); }); await p.waitForTimeout(300);
};

console.log("Slice 5: Find X/Y");
await page(async p => {
  await decayFit(p);
  let r = await p.evaluate(() => ({ sec: !!document.querySelector('#pane-res section[data-rd="find"]'), sw: !!document.querySelector('#pane-fit input[data-rshow="find"]'),
    tip: (document.querySelector('#pane-res label[for="fyX"]') || {}).title }));
  check("Results has a Find X/Y section, chosen under In the results", r.sec && r.sw, JSON.stringify(r));
  // Y at X, typed: the curve's value with its error and interval, as the functions give them.
  const sp = await p.evaluate(() => findSpan(activeFit()));
  const xm = +((sp[0] + sp[1]) / 3).toPrecision(4);
  await p.click("#fyX"); await p.keyboard.type(String(xm)); await p.waitForTimeout(100);
  r = await p.evaluate(x => { const f = activeFit(), c = findCtx(f), q = fitYAt(c.f, c.p, c.cov, c.fixed, x, c.t), o = $("#fyXo").textContent;
    return { o, y: fmtPM(q.y, q.se).replace(/<[^>]+>/g, ""), lo: fmtAt(q.lo, q.se), hi: fmtAt(q.hi, q.se), pct: confPct(confOf(f)), se: q.se }; }, xm);
  check("Y at X answers as it is typed: y ± its error, and the interval at the fit's level", r.se > 0 && r.o.includes("y = " + r.y) && r.o.includes(`${r.pct}%: ${r.lo} to ${r.hi}`), JSON.stringify(r));
  // A redraw while typing keeps the field, its text and its caret.
  r = await p.evaluate(() => { renderResults(); const a = document.activeElement; return { id: a && a.id, v: a && a.value, caret: a && a.selectionStart }; });
  check("Results redrawn while typing keeps the field in focus, its text and caret", r.id === "fyX" && r.v === String(xm) && r.caret === String(xm).length, JSON.stringify(r));
  // X at Y: the Y the curve takes at that X gives that X back.
  const yv = await p.evaluate(x => { const c = findCtx(activeFit()); return +c.f(x, c.p).toPrecision(9); }, xm);
  await p.click("#fxY"); await p.keyboard.type(String(yv)); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ o: $("#fxYo").textContent, n: $("#fxYo").querySelectorAll("li").length }));
  const xb = r.o.match(/x = ([-\d.e]+)/);
  check("X at Y: a decay takes the value once, at the X it was read at", r.n === 1 && xb && Math.abs(+xb[1] - xm) <= Math.abs(xm) * 1e-3, JSON.stringify(r));
  await p.fill("#fxY", "-1e9"); await p.dispatchEvent("#fxY", "input"); await p.waitForTimeout(80);
  r = await p.evaluate(() => $("#fxYo").textContent);
  check("a value the curve never takes: Not reached, with what it takes there", /^Not reached between .+ the curve runs from .+ to .+ there$/.test(r), r);
  await p.fill("#fxY", "abc"); await p.dispatchEvent("#fxY", "input"); await p.waitForTimeout(80);
  check("text that is not a number says so", await p.evaluate(() => $("#fxYo").textContent) === "Not a number");
  await p.focus("#fxY"); await p.keyboard.press("Escape"); await p.waitForTimeout(80);
  r = await p.evaluate(() => ({ v: $("#fxY").value, o: $("#fxYo").textContent, open: winOpen("res") }));
  check("Escape in a field clears it, and leaves Results open", r.v === "" && r.o === "Type a Y" && r.open, JSON.stringify(r));
  await p.fill("#fyX", String(sp[1] * 3)); await p.dispatchEvent("#fyX", "input"); await p.waitForTimeout(80);
  check("an X past the fit's points is answered, and said to be outside the fitted range", /outside the fitted range/.test(await p.evaluate(() => $("#fyXo").textContent)));
  // Fill a column: Y at each X of the X column, with its error and interval, beside it.
  const before = await p.evaluate(() => ({ n: P().cols.length, rec: (P().raw.hist || []).length, xid: xColFor(colById(activeFit().onCol)).id }));
  await p.click("#rFindFill"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ open: !$("#formModal").hidden, from: $("#ffFrom").value, many: $("#ffManyR").hidden, title: $("#formTitle").textContent }));
  check("Fill a column… asks what, from which column (the fitted column's X first), with the error", r.open && r.from === before.xid && r.many && r.title === "Find X/Y in a column", JSON.stringify(r));
  await p.selectOption("#ffWhat", "x"); await p.waitForTimeout(80);
  check("X at each Y asks which X when the curve takes a value more than once", await p.evaluate(() => !$("#ffManyR").hidden));
  await p.selectOption("#ffWhat", "y"); await p.check("#ffCi"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(xid => { const p = P(), i = p.cols.findIndex(c => c.id === xid), nc = p.cols.slice(i + 1, i + 5), X = colById(xid).data, f = activeFit(), c = findCtx(f);
    const want = X.map(x => x == null ? null : fitYAt(c.f, c.p, c.cov, c.fixed, x, c.t));
    return { names: nc.map(c => c.name), roles: nc.map(c => c.role), sheet: nc.every(c => sheetOf(c) === sheetOf(colById(xid))),
      ok: nc[0].data.every((v, k) => want[k] ? Math.abs(v - want[k].y) <= Math.abs(want[k].y) * 1e-12 : v == null) && nc[1].data.every((v, k) => !want[k] || Math.abs(v - want[k].se) <= want[k].se * 1e-12)
        && nc[2].data.every((v, k) => !want[k] || Math.abs(v - want[k].lo) <= Math.abs(want[k].lo) * 1e-12),
      comm: nc[0].comm, n: p.cols.length, rec: (p.raw.hist || []).length, last: ((p.raw.hist || []).slice(-1)[0] || {}).text || "", ws: winOpen("sheet"), raw: rawVerified() }; }, before.xid);
  check("four columns beside the X: the value, its error, the interval's ends, as data", r.n === before.n + 4 && /from the fit$/.test(r.names[0]) && r.names[1] === "Standard error" && /^Lower /.test(r.names[2]) && /^Upper /.test(r.names[3]) && r.roles.every(x => x === "ignore") && r.sheet, JSON.stringify(r));
  check("their values are the fit's at each X, exactly", r.ok);
  check("the record notes it, the check code holds, the worksheet comes forward", r.rec === before.rec + 1 && /from the .+ fit at the values of column/.test(r.last) && r.raw && r.ws, JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo takes all four away", await p.evaluate(n => P().cols.length === n, before.n));
  // X at each Y, from a column typed.
  await p.evaluate(() => { const p = P(), f = activeFit(), c = findCtx(f), sp = findSpan(f), ys = [0.25, 0.5, 0.75].map(k => c.f(sp[0] + (sp[1] - sp[0]) * k, c.p)).concat([-1e9]);
    const nc = Object.assign(makeCol("ignore", "Levels", "", ys), { sheet: curSheet() }); pushUndo("a column"); p.cols.push(nc); save({ cols: p.cols }); S.findTest = nc.id; });
  await p.evaluate(() => { openWin("res", { render: true }); focusWin("res"); }); await p.waitForTimeout(200);
  await p.click("#rFindFill"); await p.waitForTimeout(150);
  await p.evaluate(() => { $("#ffFrom").value = S.findTest; $("#ffFrom").dispatchEvent(new Event("input", { bubbles: true })); });
  await p.selectOption("#ffWhat", "x"); await p.uncheck("#ffErr"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const p = P(), i = p.cols.findIndex(c => c.id === S.findTest), nc = p.cols[i + 1], f = activeFit(), sp = findSpan(f), toast = $("#toastMsg").textContent;
    return { name: nc.name, d: nc.data, want: [0.25, 0.5, 0.75].map(k => sp[0] + (sp[1] - sp[0]) * k), toast, next: p.cols[i + 2] && p.cols[i + 2].name }; });
  check("X at each Y: each value's X, and an empty cell where the curve never takes it", r.d.length === 3 && r.d.every((v, k) => Math.abs(v - r.want[k]) <= Math.abs(r.want[k]) * 1e-6) && /not reached, left empty/.test(r.toast) && r.next !== "Standard error", JSON.stringify(r));
  // Switched off, the section goes.
  await p.evaluate(() => { openWin("res", { render: true }); setRShow("find", false); });
  check("switched off under In the results, the section goes", await p.evaluate(() => !document.querySelector('#pane-res section[data-rd="find"]')));
  await p.evaluate(() => setRShow("find", true));
  // A peak fit reads the same way.
  await p.evaluate(async () => { await loadExample("ir"); }); await p.waitForTimeout(600);
  await p.evaluate(() => { S.fitMode = "peaks"; showTab("fit"); runPeakFinder(false); }); await p.waitForTimeout(300);
  await p.evaluate(() => runPeakFit()); await p.waitForTimeout(1500);
  await p.evaluate(() => { openWin("res", { render: true }); focusWin("res"); }); await p.waitForTimeout(200);
  r = await p.evaluate(() => { const f = activeFit(); if (!f || f.kind !== "composite") return { kind: f && f.kind }; const sp = findSpan(f), x = (sp[0] + sp[1]) / 2, el = $("#fyX");
    el.value = String(x); el.dispatchEvent(new Event("input")); return { kind: f.kind, o: $("#fyXo").textContent }; });
  check("a peak fit's curve is read too", r.kind === "composite" && /^y = /.test(r.o || ""), JSON.stringify(r));
}, { name: "find X/Y" });

console.log("Slice 6: the fit in the worksheet");
await page(async p => {
  await decayFit(p);
  const before = await p.evaluate(() => ({ fp: rawFp(), rec: (P().raw.hist || []).length, n: P().cols.length, y: activeFit().onCol }));
  await p.click("#rToWs"); await p.waitForTimeout(400);
  let r = await p.evaluate(y => { const p = P(), i = p.cols.findIndex(c => c.id === y), nc = p.cols.filter(c => c.fx && c.fx.fit), yc = colById(y), f = activeFit(), FM = fitModel(f), d = finalOf(yc);
    const row = k => d.idx[k], fv = nc[0].data, rv = nc[1].data;
    let ok = true; for (let k = 0; k < d.x.length; k++) { const v = FM.f(d.x[k], f.params); if (Math.abs(fv[row(k)] - v) > Math.abs(v) * 1e-12 || Math.abs(rv[row(k)] - (d.y[k] - v)) > 1e-9 * Math.abs(v)) ok = false; }
    return { names: nc.map(c => c.name), kinds: nc.map(c => c.fx.fit), shown: nc.map(c => fxShow(c)), after: p.cols.slice(i + 1, i + 4).map(c => c.role + (c.fx ? ":" + c.fx.fit : "")), ok, fp: rawFp(), rec: (p.raw.hist || []).length, n: p.cols.length,
      raw: rawCols().some(c => c.fx), ws: winOpen("sheet"), sel: S.ws && [S.ws.ac, S.ws.c], idx: [sheetCols().indexOf(colById(nc[0].id)), sheetCols().indexOf(colById(nc[1].id))], toast: $("#toastMsg").textContent }; }, before.y);
  check("To worksheet: Fitted values and Residuals beside the column fitted, after its error bars", JSON.stringify(r.names) === JSON.stringify(["Fitted values", "Residuals"]) && JSON.stringify(r.after) === JSON.stringify(["e", "ignore:fit", "ignore:resid"]), JSON.stringify(r));
  check("their F(x)= rows say fit(B) and resid(B)", JSON.stringify(r.shown) === JSON.stringify(["fit(B)", "resid(B)"]), JSON.stringify(r.shown));
  check("their values are the fit's at each point, and y less it", r.ok);
  check("computed, not recorded: the check code and the record are as they were", r.fp === before.fp && r.rec === before.rec && !r.raw, JSON.stringify(r));
  check("the worksheet comes forward with the two selected, a toast says what they are", r.ws && r.sel && r.sel[0] === r.idx[0] && r.sel[1] === r.idx[1] && /written again by each new fit/.test(r.toast), JSON.stringify(r));
  // Asked again: no second pair.
  await p.evaluate(() => fitToSheet(activeFit())); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ n: P().cols.filter(c => c.fx && c.fx.fit).length, toast: $("#toastMsg").textContent }));
  check("asked again, the worksheet shows the two it has", r.n === 2 && /already/.test(r.toast), JSON.stringify(r));
  // A new fit writes them again; stored, they are the new fit's.
  await p.evaluate(() => { const d = ensureDraft(); d.init = d.init.slice(); d.init[0] = 0; d.fixed = d.fixed.slice(); d.fixed[0] = true; runFit(); }); await p.waitForTimeout(600);
  r = await p.evaluate(() => { const f = activeFit(), FM = fitModel(f), c = P().cols.find(c => c.fx && c.fx.fit === "fit"), d = finalOf(colById(f.onCol)), k = 5;
    const st = JSON.parse(localStorage.getItem("kurve.p." + S.pid) || "null"), sc = st && st.cols.find(o => o.id === c.id);
    return { fixed0: f.fixed[0], v: c.data[d.idx[k]], want: FM.f(d.x[k], f.params), stored: sc && sc.data[d.idx[k]] }; });
  check("a new fit writes them again, and that is what is stored", r.fixed0 && Math.abs(r.v - r.want) <= Math.abs(r.want) * 1e-12 && r.stored === r.v, JSON.stringify(r));
  // Masking a point puts the fit out of date, and the columns with it.
  await p.evaluate(() => { const c = activeYCol(), m = (c.mask || []).concat([3]); pushUndo("mask"); c.mask = m; save({ cols: P().cols }); renderAll(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const ths = [...document.querySelectorAll("#ws th.ch .fxm")]; return ths.map(e => e.className + "|" + e.title); });
  check("a point masked since: the fx marks say Out of date", r.filter(t => /fxm old/.test(t) && /Out of date/.test(t)).length === 2, JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(200);
  // A formula typed: resid(B) is the residuals; fit(B)*2 is refused in words.
  r = await p.evaluate(() => { const n = sheetCols().length; setColFormula(n, "resid(B)"); const c = sheetCols()[n]; return { kind: c && c.fx && c.fx.fit, vals: c ? c.data.filter(v => v != null).length : 0, same: c && JSON.stringify(c.data) === JSON.stringify(P().cols.find(o => o.fx && o.fx.fit === "resid" && o.id !== c.id).data) }; });
  check("resid(B) typed into an F(x)= row gives the residuals", r.kind === "resid" && r.vals > 10 && r.same, JSON.stringify(r));
  r = await p.evaluate(() => { const n = sheetCols().length; setColFormula(n, "fit(B)*2"); return { n2: sheetCols().length - n, toast: $("#toastMsg").textContent }; });
  check("fit(B)*2 is refused: fit(B) is a whole formula", r.n2 === 0 && /whole formula/.test(r.toast), JSON.stringify(r));
  r = await p.evaluate(() => { const n = sheetCols().length; setColFormula(n, "fit(A)"); return { n2: sheetCols().length - n, toast: $("#toastMsg").textContent }; });
  check("fit(A) of an X column is refused in words", r.n2 === 0 && /not a Y column/.test(r.toast), JSON.stringify(r));
  // The menus have it.
  r = await p.evaluate(() => { const fit = (menuItems("analyze").find(i => i && i.label === "Fit") || {}).sub, items = typeof fit === "function" ? fit() : fit || []; return items.filter(Boolean).map(i => i.label).filter(Boolean); });
  check("Analyze › Fit has Put the fit in the worksheet", r.includes("Put the fit in the worksheet"), JSON.stringify(r));
  // Removing the fit empties them, and says why.
  await p.evaluate(() => removeFit()); await p.waitForTimeout(300);
  r = await p.evaluate(() => P().cols.filter(c => c.fx && c.fx.fit).map(c => [c.data.length, FX_ERR.get(c.id) || ""]));
  check("with the fit removed they are empty, and say the column has no fit", r.length === 3 && r.every(([n, e]) => n === 0 && /has no fit yet/.test(e)), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("undo brings the fit and the values back", await p.evaluate(() => P().cols.filter(c => c.fx && c.fx.fit).every(c => c.data.length > 10)));
  // A reload keeps them, as computed columns.
  const ids = await p.evaluate(() => P().cols.filter(c => c.fx && c.fx.fit).map(c => c.id));
  await p.reload(); await ready(p);
  r = await p.evaluate(ids => ids.map(id => { const c = colById(id); return c ? [c.fx && c.fx.fit, c.data.filter(v => v != null).length, rawVerified()] : null; }), ids);
  check("after a reload they are there, computed, and the check code holds", r.every(x => x && x[0] && x[1] > 10 && x[2]), JSON.stringify(r));
}, { name: "fit in the worksheet" });

console.log("Slice 7: how points count");
await page(async p => {
  await decayFit(p);
  let r = await p.evaluate(() => { const s = $("#wt"); return { tag: s && s.tagName, opts: s ? [...s.options].map(o => o.value + (o.disabled ? "-" : "")) : [], v: s && s.value, f: weightOf(activeFit()) }; });
  check("Weights is one list: none, Y error, counting, the sheet's columns; the fit's own chosen", r.tag === "SELECT" && r.opts.slice(0, 3).join() === "none,yerr,counts" && r.v === "yerr" && r.f === "yerr", JSON.stringify(r));
  const yerr = await p.evaluate(() => { const f = activeFit(); return { p: f.params.slice(), e: f.errors.slice(), red: f.stats.redChi2 }; });
  // Counting weights.
  await p.evaluate(() => showTab("fit")); await p.waitForTimeout(150);
  await p.selectOption("#wt", "counts"); await p.evaluate(() => runFit()); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const f = activeFit(); openWin("res", { render: true }); const row = [...document.querySelectorAll("#pane-res .rside dt")].find(d => d.textContent === "Weighting");
    return { k: f.weight, w: f.weighted, text: row && row.nextElementSibling.textContent, diag: !!fitDiag(f), draft: ensureDraft().weight, csv: weightText(f, true) }; });
  check("Counting, 1/y: the fit says so in Results and the CSV, its analysis is weighted the same", r.k === "counts" && r.w && /counting statistics/.test(r.text || "") && r.csv === "counting statistics (1/y)" && r.diag && r.draft === "counts", JSON.stringify(r));
  // A column of weights, 1/σ²: the values of the Y error fit, the errors scaled by the reduced χ².
  await p.evaluate(() => { const p = P(), e = errColFor(activeYCol().id), w = e.data.map(v => v > 0 ? 1 / (v * v) : null); pushUndo("w"); const nc = Object.assign(makeCol("ignore", "Weight", "", w), { sheet: curSheet() }); p.cols.push(nc); save({ cols: p.cols }); S.wtest = nc.id; showTab("fit"); renderFit(); });
  await p.waitForTimeout(200);
  r = await p.evaluate(() => [...$("#wt").options].map(o => o.value));
  const wid = await p.evaluate(() => S.wtest);
  check("the new column is offered by name", r.includes("col:" + wid), JSON.stringify(r));
  await p.evaluate(() => showTab("fit")); await p.waitForTimeout(150);
  await p.selectOption("#wt", "col:" + wid); await p.evaluate(() => runFit()); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const f = activeFit(); return { k: f.weight, wcol: f.wcol, p: f.params.slice(), e: f.errors.slice(), red: f.stats.redChi2, text: weightText(f) }; });
  const same = r.p.every((v, i) => Math.abs(v - yerr.p[i]) <= Math.abs(yerr.p[i]) * 1e-6), scaled = r.e.every((v, i) => Math.abs(v - yerr.e[i] * Math.sqrt(yerr.red)) <= yerr.e[i] * 1e-4);
  check("weights of 1/σ² from a column: the Y error fit's values, its errors scaled by √(reduced χ²)", r.k === "col" && r.wcol === wid && same && scaled && /values of column D/.test(r.text), JSON.stringify({ r, yerr }));
  // A weight of 0 in range is refused in words.
  await p.evaluate(id => { const c = colById(id), d = c.data.slice(); d[2] = 0; pushUndo("w0"); c.data = d; save({ cols: P().cols }); }, wid);
  await p.evaluate(() => runFit()); await p.waitForTimeout(300);
  r = await p.evaluate(() => S.fitError);
  check("a weight of 0 in range is refused, the column named", /1 point in range has no weight above 0 in column D/.test(r || ""), r);
  check("counting weights refuse counts of 0 or below, in words", await p.evaluate(() => /Counting weights are 1\/y, and 2 points in range are 0 or below/.test(weightsOf({ weight: "counts" }, [{ y: 0 }, { y: -1 }, { y: 3 }]).fail)));
  await p.evaluate(() => undo()); await p.waitForTimeout(200);
  // The column of weights deleted: the fit says so.
  await p.evaluate(id => deleteCol(id), wid); await p.waitForTimeout(300);
  r = await p.evaluate(() => fitStale(activeFit()));
  check("the column of weights deleted: the fit is out of date and says why", /column of weights this fit used is gone/.test(r || ""), r);
  // The prediction band draws with every kind.
  r = await p.evaluate(() => { setPlotKey("bandPred", true, ""); const out = []; for (const k of ["none", "yerr", "counts"]) { const d = ensureDraft(); setWeight(d, k); runFit(); renderPlot(); out.push(k + ":" + !!document.querySelector("#plot path[data-pband]")); } return out; });
  check("the prediction band is drawn for no weights, Y errors and counting", r.every(x => /:true$/.test(x)), JSON.stringify(r));
}, { name: "weights" });

console.log("Slice 7: the apparent fit");
await page(async p => {
  await p.evaluate(async () => { await loadExample("decay"); }); await p.waitForTimeout(600);
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); chooseModel("linear"); }); await p.waitForTimeout(200);
  let r = await p.evaluate(() => !!$("#fitApp"));
  check("with linear axes there is no Apparent fit", !r);
  await p.evaluate(() => { setPlotKey("logY", true, ""); showTab("fit"); renderFit(); }); await p.waitForTimeout(250);
  r = await p.evaluate(() => { const a = $("#fitApp"); return a && { dis: a.disabled, on: a.checked, tip: a.parentElement.querySelector(".tipd").title }; });
  check("Log Y on the graph: Apparent fit offered, saying log₁₀ y against x", r && !r.dis && !r.on && /log₁₀ y against x/.test(r.tip), JSON.stringify(r));
  await p.click("#fitApp"); await p.waitForTimeout(200);
  await p.evaluate(() => { const d = ensureDraft(); d.weight = "none"; d.weighted = false; runFit(); }); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const f = activeFit(), pts = fitPoints(), X = pts.map(q => q.x), Y = pts.map(q => Math.log10(q.y)), ref = lmFit((x, p) => p[0] + p[1] * x, X, Y, X.map(() => 1), [3, -0.1], [false, false]);
    const FM = fitModel(f), x = 5, rows = paramRows(f);
    return { app: f.app, p: f.params, ref: ref.params, curve: FM.f(x, f.params), want: 10 ** (f.params[0] + f.params[1] * x), units: rows.map(r => r.unit), red: f.stats.redChi2, refRed: ref.stats.redChi2 }; });
  check("fitted as log₁₀ y against x: the straight line through the logarithms", r.app && r.app.y === "log10" && !r.app.x && r.p.every((v, i) => Math.abs(v - r.ref[i]) <= Math.abs(r.ref[i]) * 1e-6 + 1e-9) && Math.abs(r.red - r.refRed) <= r.refRed * 1e-6, JSON.stringify(r));
  check("drawn in the data's terms, 10^(a + b x), its parameters without units", Math.abs(r.curve - r.want) <= r.want * 1e-12 && r.units.every(u => !u), JSON.stringify(r));
  await p.evaluate(() => { openWin("res", { render: true }); focusWin("res"); }); await p.waitForTimeout(250);
  r = await p.evaluate(() => { const dt = [...document.querySelectorAll("#pane-res .rside dt")].find(d => d.textContent === "Fitted as"), f = activeFit(), D = fitDiag(f), pts = D && D.pts;
    return { row: dt && dt.nextElementSibling.textContent, note: [...document.querySelectorAll("#pane-res .note")].map(n => n.textContent).join(" | "), diag: !!D,
      r0: D && D.r[0], want: pts && Math.log10(pts[0].y) - (f.params[0] + f.params[1] * pts[0].x), band: !!document.querySelector("#plot path[data-fitc]") }; });
  check("Results says it: Fitted as, and a note", /^Log(₁₀|10) y against x, an apparent fit$/.test(r.row || "") && /Apparent fit: log(₁₀|10) y against x/.test(r.note), JSON.stringify(r));
  check("its residuals are in the logarithms, where it was fitted", r.diag && Math.abs(r.r0 - r.want) <= 1e-9, JSON.stringify(r));
  // Find X/Y reads the curve as drawn.
  r = await p.evaluate(() => { const el = $("#fyX"); el.value = "5"; el.dispatchEvent(new Event("input")); const f = activeFit(); return { o: $("#fyXo").textContent, want: fmtPM(10 ** (f.params[0] + f.params[1] * 5), fitYAt(fitModel(f).f, f.params, f.cov, f.fixed, 5, 2).se).replace(/<[^>]+>/g, "") }; });
  check("Find X/Y reads the curve as it is drawn", r.o.includes("y = " + r.want), JSON.stringify(r));
  // A value a logarithm cannot take is refused in words.
  check("a count of 0 on a logarithmic axis is refused in words", await p.evaluate(() => /An apparent fit takes the logarithm of Y, and 2 values in range are 0 or below/.test(appBad({ y: "log10" }, appPoints({ y: "log10" }, [1, 2, 3], [0, -1, 2], [1, 1, 1], false)))));
  // Log Y off: the switch stays, unticked and disabled; the fit is still drawn as fitted.
  await p.evaluate(() => { setPlotKey("logY", false, ""); showTab("fit"); renderFit(); }); await p.waitForTimeout(250);
  r = await p.evaluate(() => { const a = $("#fitApp"); return { a: a && [a.disabled, a.checked], curve: !!document.querySelector("#plot path[data-fitc]"), app: activeFit().app }; });
  check("with Log Y off again the switch is there but cannot be ticked, and the fit is still drawn", r.a && r.a[0] && !r.a[1] && r.curve && r.app, JSON.stringify(r));
}, { name: "apparent fit" });

console.log("Slice 8: starting values and constraints as formulas");
await page(async p => {
  await decayFit(p);
  await p.evaluate(() => { showTab("fit"); S.pgView = "start"; renderFit(); }); await p.waitForTimeout(200);
  // A start typed as a formula of the data.
  await p.fill('#pane-fit input[data-pi="1"]', "max(y) - min(y)"); await p.press('#pane-fit input[data-pi="1"]', "Enter"); await p.waitForTimeout(150);
  let r = await p.evaluate(() => { const d = ensureDraft(), [X, Y] = fitXY(d), M = dataMeasures(X, Y), inp = document.querySelector('#pane-fit input[data-pi="1"]'); return { fx: d.initFx && d.initFx[1], v: d.init[1], want: M.yspan, val: inp.value, cls: inp.className, tip: inp.title }; });
  check("a start typed as a formula of the data: kept as typed, its value measured", r.fx === "max(y) - min(y)" && Math.abs(r.v - r.want) < 1e-9 && r.val === "max(y) - min(y)" && /pgsfx/.test(r.cls) && /now/.test(r.tip), JSON.stringify(r));
  await p.fill('#pane-fit input[data-pi="2"]', "height/3"); await p.press('#pane-fit input[data-pi="2"]', "Enter"); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ val: document.querySelector('#pane-fit input[data-pi="2"]').value, fx: (ensureDraft().initFx || [])[2], toast: $("#toastMsg").textContent }));
  check("a start that is no formula of the data is refused in words, the field put back", !r.fx && r.val !== "height/3" && /Not a starting value: “height” is not a measure of the data/.test(r.toast), JSON.stringify(r));
  // Guess and each fit measure it again; a number typed over it takes its place.
  await p.evaluate(() => { const d = ensureDraft(); d.init[1] = 1; guessDraft(); renderFit(); });
  r = await p.evaluate(() => { const d = ensureDraft(), [X, Y] = fitXY(d); return Math.abs(d.init[1] - dataMeasures(X, Y).yspan) < 1e-9 && d.initFx[1] === "max(y) - min(y)"; });
  check("Guess measures the formula again and keeps it", r);
  // A constraint: y0 follows A.
  await p.fill("#fitCons", "y0 = A/50"); await p.dispatchEvent("#fitCons", "input"); await p.waitForTimeout(80);
  r = await p.evaluate(() => $("#fitConsHint").textContent);
  check("the constraint is read as it is typed", /y0 follows: y0 = A\/50/.test(r), r);
  await p.evaluate(() => { const c = $("#fitCons"); c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(150);
  r = await p.evaluate(() => { const g = document.querySelector('#pane-fit .ptab.pg tbody tr'), fol = g.querySelector("input.pgfol"), fx = g.querySelector('input[data-fx="0"]'); return { fol: fol && fol.value, dis: fx && fx.disabled, cons: ensureDraft().cons }; });
  check("in the grid the follower's start is its formula, its Fix off", r.fol === "= A/50" && r.dis && r.cons === "y0 = A/50", JSON.stringify(r));
  await p.evaluate(() => runFit()); await p.waitForTimeout(600);
  r = await p.evaluate(() => { const f = activeFit(); openWin("res", { render: true }); const rows = paramRows(f), dt = [...document.querySelectorAll("#pane-res .rside dt")].find(d => d.textContent === "Constraints");
    return { cons: f.cons, fx: f.initFx, p: f.params, e: f.errors, tied: rows[0].tied, row: dt && dt.nextElementSibling.textContent, dof: f.stats.dof, n: f.stats.n }; });
  check("fitted: y0 is A/50, its error carried, one parameter fewer", Math.abs(r.p[0] - r.p[1] / 50) <= Math.abs(r.p[0]) * 1e-9 && r.e[0] > 0 && Math.abs(r.e[0] - r.e[1] / 50) <= r.e[0] * 1e-4 && r.dof === r.n - 2, JSON.stringify(r));
  check("the fit keeps its constraints and formula starts, and Results says so", r.cons === "y0 = A/50" && r.fx && r.fx[1] === "max(y) - min(y)" && /^follows: y0 = A\/50$/.test(r.tied) && r.row === "y0 = A/50", JSON.stringify(r));
  // A constraint that does not read is refused, in the box and by Fit.
  await p.evaluate(() => { showTab("fit"); const c = $("#fitCons"); c.value = "q = 1"; c.dispatchEvent(new Event("input")); c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(150);
  r = await p.evaluate(() => { runFit(); return { hint: $("#fitConsHint").textContent, err: S.fitError }; });
  check("a constraint naming no parameter: said under the box, and Fit refuses it", /line 1: “q” is not a parameter/.test(r.hint) && /Constraints, line 1: “q” is not a parameter/.test(r.err), JSON.stringify(r));
  // Two decays kept in order, from starts the wrong way round.
  await p.evaluate(() => { chooseModel("expdec2"); }); await p.waitForTimeout(150);
  r = await p.evaluate(() => { const d = ensureDraft(); return { cons: d.cons, fx: d.initFx }; });
  check("a new model clears the constraints and formula starts", r.cons === "" && !r.fx, JSON.stringify(r));
  await p.evaluate(() => { const d = ensureDraft(), t1 = d.init[2], t2 = d.init[4]; d.init[2] = Math.max(t1, t2) * 3; d.init[4] = Math.min(t1, t2); const c = $("#fitCons"); c.value = "t1 < t2"; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(150);
  await p.evaluate(() => runFit()); await p.waitForTimeout(800);
  r = await p.evaluate(() => { const f = activeFit(); return { p: f.params, cons: f.cons, err: S.fitError, at: f.atBound }; });
  check("t1 < t2: fitted with the first decay time below the second", r.cons === "t1 < t2" && r.p[2] < r.p[4], JSON.stringify(r));
  // One iteration keeps a follower where it belongs.
  await p.evaluate(() => { const c = $("#fitCons"); c.value = "A2 = A1/2"; c.dispatchEvent(new Event("change")); }); await p.waitForTimeout(150);
  r = await p.evaluate(() => { stepFit(); const d = ensureDraft(); return { a1: d.init[1], a2: d.init[3], err: S.fitError }; });
  check("1 iteration with a constraint: the follower where its formula puts it", !r.err && Math.abs(r.a2 - r.a1 / 2) <= Math.abs(r.a2) * 1e-9, JSON.stringify(r));
  // After a reload the Fit window starts from the fit, constraints and all.
  await p.evaluate(() => runFit()); await p.waitForTimeout(600);
  await p.reload(); await ready(p);
  r = await p.evaluate(() => { S.fitMode = "curve"; const d = ensureDraft(); return { cons: d.cons, model: d.model }; });
  check("after a reload the Fit window has the fit's constraints", r.cons === "A2 = A1/2" && r.model === "expdec2", JSON.stringify(r));
}, { name: "formulas and constraints" });

console.log("Slice 9: saved fit settings, and fits that follow their data");
await page(async p => {
  await decayFit(p);
  await p.evaluate(() => { showTab("fit"); const d = ensureDraft(); d.initFx = [null, "max(y) - min(y)", null]; d.cons = "y0 = A/60"; renderFit(); });
  // Saved in this browser.
  await p.click("#fitSets"); await p.waitForTimeout(150);
  let r = await p.evaluate(() => [...document.querySelectorAll(".menu [role=menuitem], .menu button")].map(b => b.textContent.trim()).filter(Boolean));
  check("Saved settings opens a menu that offers to save these", r.some(t => /Save these settings/.test(t)) && r.some(t => /None saved yet/.test(t)), JSON.stringify(r));
  await p.keyboard.press("Escape");
  await p.evaluate(() => { saveFitSetAs(); }); await p.waitForTimeout(200);
  await p.fill("#fsN", "Decay, level held"); await p.click("#formOk"); await p.waitForTimeout(200);
  r = await p.evaluate(() => { const l = JSON.parse(localStorage.getItem("kurve.fitsets") || "[]"); return l.map(s => ({ name: s.name, model: s.model, fx: s.initFx, cons: s.cons, w: s.weight })); });
  check("saved in this browser: the model, the formula starts, the constraints, the weights", r.length === 1 && r[0].name === "Decay, level held" && r[0].model === "expdec" && r[0].fx[1] === "max(y) - min(y)" && r[0].cons === "y0 = A/60" && r[0].w === "yerr", JSON.stringify(r));
  // Another model, then the settings again.
  await p.evaluate(() => chooseModel("gauss")); await p.waitForTimeout(150);
  await p.evaluate(() => { useFitSet(fitSetLib()[0]); }); await p.waitForTimeout(250);
  r = await p.evaluate(() => { const d = ensureDraft(); return { model: d.model, cons: d.cons, fx: d.initFx && d.initFx[1], toast: $("#toastMsg").textContent, act: $("#toastAct") && $("#toastAct").textContent }; });
  check("used again: the model, its formula starts and constraints come back; the toast offers Fit", r.model === "expdec" && r.cons === "y0 = A/60" && r.fx === "max(y) - min(y)" && /fit settings "Decay, level held"/.test(r.toast), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(150);
  check("one undo puts the model back", await p.evaluate(() => ensureDraft().model === "gauss"));
  await p.evaluate(() => redo()); await p.waitForTimeout(150);
  // In the project: saved and shared with it, and undone with it.
  await p.evaluate(() => { saveFitSetAs(); }); await p.waitForTimeout(200);
  await p.fill("#fsN", "In the project"); await p.check("#fsKP"); await p.click("#formOk"); await p.waitForTimeout(250);
  r = await p.evaluate(() => ({ ps: projFitSets().map(s => s.name), menu: fitSetMenuItems().filter(i => i && i.group).map(i => i.group) }));
  check("saved in the project too; the menu has both groups", JSON.stringify(r.ps) === JSON.stringify(["In the project"]) && r.menu.join() === "In this project,Saved in this browser", JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(150);
  check("saving in the project is one undo step", await p.evaluate(() => projFitSets().length === 0));
  // Analyze › Fit has them.
  r = await p.evaluate(() => { const fit = (menuItems("analyze").find(i => i && i.label === "Fit") || {}).sub, items = typeof fit === "function" ? fit() : fit || []; const s = items.find(i => i && i.label === "Saved fit settings"); return !!s && (typeof s.sub === "function" ? s.sub() : s.sub).some(i => i && i.label === "Decay, level held"); });
  check("Analyze › Fit › Saved fit settings lists them", r);
  // Deleted, with Undo in the toast.
  await p.evaluate(() => deleteFitSet(fitSetLib()[0], "lib")); await p.waitForTimeout(100);
  r = await p.evaluate(() => fitSetLib().length);
  await p.evaluate(() => { const b = $("#toastAct"); if (b) b.click(); }); await p.waitForTimeout(100);
  check("deleted from the browser, and back with the toast's Undo", r === 0 && await p.evaluate(() => fitSetLib().length === 1));
  // Following: the fit is made again when the processing changes, with a log line and no undo step of its own.
  await p.evaluate(() => { const d = ensureDraft(); d.cons = ""; d.initFx = null; runFit(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { showTab("fit"); renderFit(); }); await p.waitForTimeout(100);
  await p.click("#fitFollow"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ f: activeFit().follow, row: statsList(activeFit()).find(x => x[0] === "Fitted again") }));
  check("Fit again when the data change: set on the fit at once, and said in Results", r.f === true && r.row && r.row[1] === "when its data change", JSON.stringify(r));
  const before = await p.evaluate(() => ({ at: activeFit().at, p: activeFit().params.slice(), undo: S.undo ? S.undo.length : null }));
  await p.evaluate(() => { const c = activeYCol(); pushUndo("masking"); c.mask = (c.mask || []).concat([5, 6, 7]); save({ cols: P().cols }, "masked three points"); renderAll(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const f = activeFit(), c = activeYCol(); return { at: f.at, stale: fitStale(f), ms: f.maskSig === maskSig(c), log: (P().log || []).slice(-1)[0].text, n: f.stats.n, follow: f.follow }; });
  check("a mask changed: the fit is made again on the points left, and says so in the log", r.at !== before.at && !r.stale && r.ms && /fitted .* again, following its data/.test(r.log) && r.n === 57 && r.follow, JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  r = await p.evaluate(b => { const f = activeFit(); return { at: f.at, same: f.params.every((v, i) => v === b.p[i]), stale: fitStale(f) }; }, before);
  check("one undo takes back the mask and the fit made again with it", r.at === before.at && r.same && !r.stale, JSON.stringify(r));
  // A refit that fails keeps the fit and says why.
  await p.evaluate(() => { const c = activeYCol(), n = finalOf(c).x.length; pushUndo("masking"); c.mask = Array.from({ length: n - 3 }, (_, i) => i); save({ cols: P().cols }); renderAll(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const f = activeFit(); return { fail: f.followFail, notes: fitWarnings(f).map(w => w.kind) }; });
  check("a refit that cannot be made keeps the fit, and the notes say why", /fewer than four points/.test(r.fail || "") && r.notes.includes("follow") && r.notes.includes("stale"), JSON.stringify(r));
}, { name: "fit settings and following" });

console.log("Slice 10: the function editor, grown, and your functions");
await page(async p => {
  await decayFit(p);
  await p.evaluate(() => { showTab("fit"); editUserFn(null); }); await p.waitForTimeout(250);
  await p.fill("#fbName", "My decay"); await p.fill("#fbCat", "Decays");
  await p.fill("#fbExpr", "y = y0 + A*exp(-x/t)"); await p.dispatchEvent("#fbExpr", "input"); await p.waitForTimeout(150);
  await p.fill('#formModal input[aria-label="Starting value of A"]', "height*2"); await p.dispatchEvent('#formModal input[aria-label="Starting value of A"]', "input"); await p.waitForTimeout(100);
  let r = await p.evaluate(() => ({ msg: $("#fbMsg").textContent, ok: $("#formOk").disabled }));
  check("a start that is no formula of the data is refused in the editor, in words", /The start of A: “height” is not a measure/.test(r.msg) && r.ok, JSON.stringify(r));
  await p.fill('#formModal input[aria-label="Starting value of A"]', "max(y) - min(y)"); await p.fill('#formModal input[aria-label="What t means"]', "decay time");
  await p.fill("#fbDer", "Half-life = t*q"); await p.dispatchEvent("#fbDer", "input"); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ msg: $("#fbMsg").textContent, ok: $("#formOk").disabled }));
  check("a derived value naming no parameter is refused, with its line", /Derived values, line 1: “q” is not a parameter/.test(r.msg) && r.ok, JSON.stringify(r));
  await p.fill("#fbDer", "Half-life = t*ln(2)"); await p.fill("#fbCons", "y0 = A/50"); await p.dispatchEvent("#fbCons", "input"); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ msg: $("#fbMsg").textContent, ok: $("#formOk").disabled }));
  check("with good starts, constraints and derived values the editor says so", !r.ok && /3 parameters/.test(r.msg), JSON.stringify(r));
  await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const fn = (P().userFns || []).find(f => f.name === "My decay"), d = ensureDraft(); return fn && { cat: fn.cat, fxA: (fn.params.find(q => q.n === "A") || {}).fx, mean: (fn.params.find(q => q.n === "t") || {}).mean, cons: fn.cons, der: fn.derived, dcons: d.cons, dfx: d.initFx, model: d.model === "u:" + fn.id }; });
  check("saved with its category, a formula start, a meaning, constraints and derived values", r && r.cat === "Decays" && r.fxA === "max(y) - min(y)" && r.mean === "decay time" && r.cons === "y0 = A/50" && r.der === "Half-life = t*ln(2)", JSON.stringify(r));
  check("chosen, the Fit window starts with its constraints and formula start", r && r.model && r.dcons === "y0 = A/50" && Array.isArray(r.dfx) && r.dfx.includes("max(y) - min(y)"), JSON.stringify(r));
  await p.evaluate(() => runFit()); await p.waitForTimeout(600);
  r = await p.evaluate(() => { const f = activeFit(), m = fitModel(f).model, i = m.params.indexOf("t"), der = derivedRows(f), rows = paramRows(f); return { der: der.map(x => [x.name, x.v, x.e]), want: [f.params[i] * Math.LN2, f.errors[i] * Math.LN2], mean: rows[i].meaning, tied: rows[m.params.indexOf("y0")].tied }; });
  check("Results gives the derived value with its error, and the parameter's meaning", r.der.length === 1 && r.der[0][0] === "Half-life" && Math.abs(r.der[0][1] - r.want[0]) <= r.want[0] * 1e-9 && Math.abs(r.der[0][2] - r.want[1]) <= r.want[1] * 1e-3 && r.mean === "decay time" && /follows/.test(r.tied || ""), JSON.stringify(r));
  // The model list files it under its category.
  await p.evaluate(() => { showTab("fit"); renderFit(); }); await p.waitForTimeout(100);
  await p.click("#model"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ g: [...document.querySelectorAll(".mpick .fp-g")].map(g => g.textContent), org: !!document.querySelector(".mpick [data-morg]") }));
  check("the model list files it under Your functions: Decays, and offers Your functions…", r.g.includes("Your functions: Decays") && r.org, JSON.stringify(r));
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  // The organizer: renamed and filed in place, deleted with Undo.
  await p.evaluate(() => openFnOrganizer()); await p.waitForTimeout(200);
  r = await p.evaluate(() => [...document.querySelectorAll("#fnOrg tr")].map(t => t.textContent.trim().slice(0, 40)));
  check("Your functions lists it by category, kept in the project and the browser", r.some(t => /^Decays/.test(t)) && r.some(t => /Both/.test(t)), JSON.stringify(r));
  await p.fill("#fnOrg [data-fnname]", "Single decay"); await p.press("#fnOrg [data-fnname]", "Tab"); await p.waitForTimeout(150);
  await p.fill("#fnOrg [data-fncat]", "Kinetics"); await p.press("#fnOrg [data-fncat]", "Tab"); await p.waitForTimeout(150);
  r = await p.evaluate(() => { const fn = (P().userFns || [])[0], lf = libFns().find(f => f.id === fn.id); return { name: fn.name, cat: fn.cat, lname: lf && lf.name, lcat: lf && lf.cat, grp: [...document.querySelectorAll("#fnOrg .fngrp")].map(g => g.textContent) }; });
  check("renamed and filed in place, in the project and the library, the list redrawn", r.name === "Single decay" && r.cat === "Kinetics" && r.lname === "Single decay" && r.lcat === "Kinetics" && r.grp.includes("Kinetics"), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ cat: (P().userFns || [])[0].cat, name: (P().userFns || [])[0].name, held: heldBlocks(), top: undoStack.slice(-3).map(s => s.label) }));
  check("filing it is one undo step in the project", r.cat === "Decays" && r.name === "Single decay", JSON.stringify(r));
  await p.evaluate(() => { const b = document.querySelector('#fnOrg [data-fnact="del"]'); if (b) b.click(); }); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ n: (P().userFns || []).length, toast: $("#toastMsg").textContent }));
  check("Delete takes it out of the project, with Undo", r.n === 0 && /Deleted “.*” from this project/.test(r.toast), JSON.stringify(r));
  await p.evaluate(() => $("#formCancel").click());
}, { name: "your functions" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
