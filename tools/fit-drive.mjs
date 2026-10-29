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

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
