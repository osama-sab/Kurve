/* Wave 5, signal processing and mathematics (ux/spec/SIGNAL_SPEC.md), in the browser: every menu item, dialog and
   control the wave adds, clicked; the results read off the sheet; recalculation, undo, the worker, a reload.
   Usage: node tools/sig-drive.mjs [kurve.html]   (ONLY=5.1 runs that section alone) */
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
  P().cols.filter(c => c.ana === a.id).forEach(c => { t[c.ak] = c.data.slice(); meta[c.ak] = { name: c.name, unit: c.unit, role: c.role }; });
  return { t, meta, kind: a.kind, name: a.name, err: a.res && a.res.err, notes: (a.res && a.res.notes) || [], sheet: a.out.sheet, rep: a.res && a.res.report }; }, i);
// A signal: X in seconds, Y in volts, a cosine of 2 V at 12.5 Hz on an offset.
const SIGNAL = (n) => { const x = [], y = []; for (let i = 0; i < n; i++) { x.push(+(i * 0.01).toFixed(10)); y.push(2 * Math.cos(2 * Math.PI * 12.5 * i * 0.01) + 0.5); }
  save({ cols: [makeCol("x", "Time", "s", x), Object.assign(makeCol("y", "Signal", "V", y), { pipe: [], mask: [] })], activeY: null }, "typed"); };

console.log("5.1 The transform, with its output");
await page(async p => {
  await p.evaluate(SIGNAL, 400); await p.waitForTimeout(300);
  await menu(p, "analyze", "Signal processing", "FFT…");
  check("Analyze › Signal processing › FFT… opens its dialog", await p.isVisible("#aWw") && await p.isVisible("#aFo_amp"));
  check("…the window's parameter is hidden for the rectangle", await p.evaluate(() => $("#aWp").hidden));
  await p.selectOption("#aWw", "kaiser"); await p.waitForTimeout(100);
  const kv = await p.evaluate(() => ({ hid: $("#aWp").hidden, lab: $("#aWpL").textContent, ph: $("#aWp").placeholder }));
  check("…Kaiser shows its β, 8.6 by default", !kv.hid && kv.lab === "β" && kv.ph === "8.6", JSON.stringify(kv));
  await p.selectOption("#aWw", "boxcar"); await p.check("#aFo_pow"); await p.uncheck("#aFo_phase"); await p.waitForTimeout(100);
  check("…the phase's options go with the phase column", await p.evaluate(() => $("#aFph").hidden));
  await p.selectOption("#aFp", "n"); await p.waitForTimeout(80); check("…padding to a length shows its field", await p.isVisible("#aFpn"));
  await p.fill("#aFpn", "1"); await p.waitForTimeout(80); check("…a length of 1 is refused (OK off)", await p.isDisabled("#formOk"));
  await p.selectOption("#aFp", "none"); await p.waitForTimeout(80);
  await p.click("#formOk"); await p.waitForTimeout(600);
  let r = await RES(p);
  const k = r && r.t.f0 ? r.t.f0.findIndex(f => Math.abs(f - 12.5) < 1e-9) : -1;
  check("a result sheet: Frequency (Hz, X), Amplitude (V, Y), Power (V²)", r && r.meta.f0.unit === "Hz" && r.meta.f0.role === "x" && r.meta.amp0.unit === "V" && r.meta.amp0.role === "y" && r.meta.pow0.unit === "V²" && !r.t.phase0, JSON.stringify(r && r.meta));
  check("…the cosine reads 2 V at 12.5 Hz, the offset 0.5 at 0", k > 0 && Math.abs(r.t.amp0[k] - 2) < 1e-12 && Math.abs(r.t.amp0[0] - 0.5) < 1e-12 && Math.abs(r.t.pow0[k] - 2) < 1e-12, k);
  check("…named FFT 1, shown at once", r.name === "FFT 1" && await p.evaluate(s => curSheet() === s, r.sheet));
  // Plot from the tab's menu
  await p.click(`#wsTabs [data-wst="${r.sheet}"]`, { button: "right" }); await p.waitForTimeout(250);
  const it = p.locator(".menu:visible .mi", { hasText: "Plot the spectrum" }); check("the tab's menu offers Plot the spectrum", await it.count() > 0);
  await it.first().click(); await p.waitForTimeout(500);
  const g = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1], c = colById(g.cols[0]); return { n: P().graphs.length, col: c && c.name, ak: c && c.ak }; });
  check("…which draws the amplitude against frequency on a new graph", g.ak === "amp0", JSON.stringify(g));
  // the data change: worked out again by itself; undo puts it back
  await p.evaluate(() => { const c = yCols()[0]; pushUndo("a value"); const d = c.data.slice(); d[0] = 10; c.data = d; save({ cols: P().cols }, "typed a value"); renderAll(); }); await p.waitForTimeout(500);
  r = await RES(p); check("a value typed: worked out again (the mean moves)", Math.abs(r.t.amp0[0] - (0.5 + 7.5 / 400)) < 1e-12, r.t.amp0[0]);
  await p.evaluate(() => undo()); await p.waitForTimeout(400); r = await RES(p);
  check("…undo brings the old result back", Math.abs(r.t.amp0[0] - 0.5) < 1e-12, r.t.amp0[0]);
  // the report
  const rep = await p.evaluate(() => { const a = anaList()[0]; return anaText(a); });
  check("the copied report names the window, the normalisation and the largest amplitude's frequency", /Rectangle/.test(rep) && /A²\/2/.test(rep) && /12\.5 Hz/.test(rep), rep.slice(0, 300));
  // Welch
  await p.evaluate(() => showSheet(SHEET0.id, { quiet: true })); await p.waitForTimeout(200);
  await menu(p, "analyze", "Signal processing", "Power spectrum (Welch)…");
  check("Power spectrum (Welch)… opens with Hann chosen", await p.evaluate(() => $("#aWw").value === "hann"));
  await p.fill("#aWn", "100"); await p.selectOption("#aWa", "median"); await p.check("#aWdb"); await p.click("#formOk"); await p.waitForTimeout(600);
  r = await RES(p, 1);
  check("…a density in V²/Hz and a column in dB, 7 segments of 100", r && r.meta.p0.unit === "V²/Hz" && r.meta.db0 && r.rep.sections[0].tables[0].rows[0][6] === 7, JSON.stringify(r && r.meta));
  // the inverse, from an FFT's own two-sided real and imaginary parts
  await p.evaluate(() => showSheet(SHEET0.id, { quiet: true })); await p.waitForTimeout(200);
  await menu(p, "analyze", "Signal processing", "FFT…");
  await p.uncheck("#aFo_amp"); await p.uncheck("#aFo_pow"); await p.check("#aFo_re"); await p.check("#aFo_im"); await p.selectOption("#aFs", "2"); await p.waitForTimeout(80);
  check("…two sides offer the shift", await p.isVisible("#aFsh")); await p.check("#aFsh"); await p.click("#formOk"); await p.waitForTimeout(600);
  const r3 = await RES(p, 2);
  check("two sides, shifted: from −50 Hz", r3 && r3.t.f0[0] === -50 && r3.t.f0.length === 400, r3 && r3.t.f0[0]);
  await menu(p, "analyze", "Signal processing", "Inverse FFT…");
  const sel = await p.evaluate(() => ({ re: $("#aIr").selectedOptions[0].textContent, im: $("#aIi").selectedOptions[0].textContent }));
  check("Inverse FFT… picks the real and imaginary parts by their names", /Real/.test(sel.re) && /Imaginary/.test(sel.im), JSON.stringify(sel));
  await p.click("#formOk"); await p.waitForTimeout(600);
  const r4 = await RES(p, 3), y0 = await p.evaluate(() => yCols().find(c => !c.ana).data.slice());
  check("…gives the signal back, its time step 0.01 s", r4 && r4.meta.t.unit === "s" && Math.abs(r4.t.t[1] - 0.01) < 1e-15 && r4.t.re.every((v, i) => Math.abs(v - y0[i]) < 1e-12), r4 && r4.err);
  // Help
  await p.evaluate(() => openHelp("signal#psd")); await p.waitForTimeout(300);
  check("the Help has the Signal processing page", await p.evaluate(() => /Welch/.test(($("#docArt") || {}).textContent || "")));
}, { name: "5.1" });

await page(async p => {
  // 500 000 points: the worker, a toast with Stop, the result in when it comes back
  await p.evaluate(SIGNAL, 500000); await p.waitForTimeout(400);
  const t0 = Date.now(); await p.evaluate(() => { anaDlg("fft"); }); await p.waitForSelector("#aWw"); await p.click("#formOk");
  await p.waitForFunction(() => { const a = anaList()[0]; return a && a.res && a.res.report; }, null, { timeout: 60000 });
  const r = await RES(p), ms = Date.now() - t0;
  check(`500 000 points worked out in the worker (${ms} ms), 250 001 frequencies`, r && r.t.f0.length === 250001 && Math.abs(r.t.amp0[r.t.f0.findIndex(f => Math.abs(f - 12.5) < 1e-9)] - 2) < 1e-9, r && r.err);
}, { name: "5.1" });

console.log("5.2 Filters designed");
await page(async p => {
  // a 2 Hz sine with a 30 Hz hum, X in seconds at 200 Hz
  await p.evaluate(() => { const x = [], y = []; for (let i = 0; i < 800; i++) { x.push(+(i * 0.005).toFixed(10)); y.push(Math.sin(2 * Math.PI * 2 * i * 0.005) + 0.4 * Math.sin(2 * Math.PI * 30 * i * 0.005)); }
    save({ cols: [makeCol("x", "Time", "s", x), Object.assign(makeCol("y", "Signal", "V", y), { pipe: [], mask: [] })], activeY: null }, "typed"); }); await p.waitForTimeout(300);
  await menu(p, "analyze", "Signal processing", "Filter (designed)…");
  const fld = (k) => `#pane-tool [data-pk="${k}"]:not([type="range"])`;
  let r = await p.evaluate(() => ({ op: S.pending && S.pending.step.op, f1: S.pending && S.pending.step.p.f1, svg: !!document.querySelector("#pane-tool .filtresp svg path"), unit: [...document.querySelectorAll("#pane-tool .lab")].some(e => e.textContent.trim() === "Hz") }));
  check("Analyze › Signal processing › Filter (designed)… opens the tool, its edge suggested in Hz, the response drawn", r.op === "filt" && r.f1 === 10 && r.svg && r.unit, JSON.stringify(r));
  check("…Butterworth shows no ripple or attenuation fields", !(await p.isVisible(fld("rp"))) && !(await p.isVisible(fld("rs"))));
  await p.selectOption(fld("kind"), "ellip"); await p.waitForTimeout(250);
  check("…elliptic shows the pass-band ripple and the stop-band attenuation", await p.isVisible(fld("rp")) && await p.isVisible(fld("rs")));
  await p.selectOption(fld("band"), "pass"); await p.waitForTimeout(250);
  check("…a band-pass shows the upper edge", await p.isVisible(fld("f2")));
  await p.selectOption(fld("band"), "low"); await p.selectOption(fld("kind"), "butter"); await p.waitForTimeout(200);
  await p.fill(fld("f1"), "150"); await p.press(fld("f1"), "Enter"); await p.waitForTimeout(400);
  r = await p.evaluate(() => $("#pane-tool").textContent);
  check("…an edge past Nyquist (100 Hz) is refused in words", /below the Nyquist frequency, 100 Hz/.test(r), r.slice(0, 300));
  await p.fill(fld("f1"), "8"); await p.press(fld("f1"), "Enter"); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const d = document.querySelector("#pane-tool .filtresp path"); return { path: d && d.getAttribute("d").length, edge: !!document.querySelector("#pane-tool .filtresp line[stroke-dasharray]") }; });
  check("…the response redrawn with the edge dashed", r.path > 100 && r.edge, JSON.stringify(r));
  await p.click("#tlOk"); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const c = activeYCol(), d = finalOf(c); let e = 0; for (let i = 100; i < 700; i++) e = Math.max(e, Math.abs(d.y[i] - Math.sin(2 * Math.PI * 2 * d.x[i]))); return { ops: c.pipe.map(s => s.op), e, sum: stepSummary ? stepSummary(c.pipe[0], d) : "" }; });
  check("OK: the step in the column's processing, the 30 Hz hum gone, the 2 Hz kept", r.ops.join() === "filt" && r.e < 0.01, JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("…undone", await p.evaluate(() => (activeYCol().pipe || []).length === 0));
  await menu(p, "analyze", "Signal processing", "Notch…");
  await p.fill(fld("f0"), "30"); await p.press(fld("f0"), "Enter"); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ svg: !!document.querySelector("#pane-tool .filtresp svg path"), txt: $("#pane-tool").textContent }));
  check("Notch…: 30 Hz taken out, its response drawn", r.svg && /30 Hz taken out/.test(r.txt), r.txt.slice(0, 200));
  await p.click("#tlOk"); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const d = finalOf(activeYCol()); let e = 0; for (let i = 300; i < 500; i++) e = Math.max(e, Math.abs(d.y[i] - Math.sin(2 * Math.PI * 2 * d.x[i]))); return e; });
  check("…the hum gone from the middle of the data", r < 0.02, r);
  const flow = await p.evaluate(() => { openWin("flow", { render: true }); return [...document.querySelectorAll("#w-flow .fnode")].map(b => b.textContent).join(" | "); });
  check("…the History shows the notch with its frequency", /Notch\s*30 Hz/.test(flow), flow.slice(0, 300));
}, { name: "5.2" });

console.log("5.3 Correlation and convolution");
await page(async p => {
  // two columns on one X: B is A 13 points later
  await p.evaluate(() => { let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; }; const base = Array.from({ length: 640 }, r), sm = base.map((_, i) => base.slice(Math.max(0, i - 3), i + 4).reduce((a, v) => a + v, 0));
    const x = Array.from({ length: 600 }, (_, i) => +(i * 0.5).toFixed(6)), a = sm.slice(20, 620), b = sm.slice(7, 607);
    save({ cols: [makeCol("x", "Time", "s", x), Object.assign(makeCol("y", "A", "V", a), { pipe: [], mask: [] }), Object.assign(makeCol("y", "B", "V", b), { pipe: [], mask: [] })], activeY: null }, "typed"); }); await p.waitForTimeout(300);
  await menu(p, "analyze", "Signal processing", "Correlation…");
  check("Analyze › Signal processing › Correlation… opens its dialog, the coefficient chosen", await p.isVisible("#aXn") && await p.evaluate(() => $("#aXn").value === "coeff"));
  const ids = await p.evaluate(() => yCols().map(c => c.id));
  await p.evaluate(ids => { const a = document.getElementById("aI_" + ids[0]), b = document.getElementById("aI_" + ids[1]); a.checked = false; b.checked = true; a.dispatchEvent(new Event("change", { bubbles: true })); }, ids);
  await p.check(`#aI_${ids[0]}`); await p.fill("#aXm", "40"); await p.click("#formOk"); await p.waitForTimeout(500);
  let r = await RES(p);
  const ib = r && r.t.c ? r.t.c.indexOf(Math.max(...r.t.c)) : -1;
  // A first (the sheet's order), B second: B follows A by 13 points, a lag of −6.5 s in numpy's convention, said in words
  const said = r && r.rep ? r.rep.sections[0].tables[0].rows[0].slice(-1)[0] : "";
  check("…two columns: the lag in s, 81 lags kept, the largest at −6.5 s, read as “B follows A by 6.5 s”", r && r.meta.lag.unit === "s" && r.t.lag.length === 81 && Math.abs(r.t.lag[ib] + 6.5) < 1e-9 && said === "B follows A by 6.5 s", JSON.stringify(r && { n: r.t.lag.length, at: r.t.lag[ib], said, err: r.err }));
  await p.evaluate(() => showSheet(SHEET0.id, { quiet: true })); await p.waitForTimeout(150);
  await menu(p, "analyze", "Signal processing", "Coherence…");
  check("Coherence… opens with both columns ticked", await p.evaluate(ids => ids.every(i => document.getElementById("aI_" + i).checked), ids));
  await p.fill("#aWn", "100"); await p.click("#formOk"); await p.waitForTimeout(500);
  r = await RES(p, 1);
  check("…a coherence from 0 to 1 against frequency in Hz, with the cross-spectrum's magnitude and phase", r && r.meta.f.unit === "Hz" && r.t.coh.every(v => v >= -1e-12 && v <= 1 + 1e-12) && r.meta.ph.unit === "rad", r && r.err);
  // the convolution step on A
  await p.evaluate(() => { showSheet(SHEET0.id, { quiet: true }); P().activeY = yCols()[0].id; renderAll(); }); await p.waitForTimeout(150);
  await menu(p, "analyze", "Signal processing", "Convolution…");
  const fld = (k) => `#pane-tool [data-pk="${k}"]:not([type="range"])`;
  r = await p.evaluate(() => ({ op: S.pending && S.pending.step.op, w: S.pending && S.pending.step.p.w }));
  check("Convolution… opens the tool, a Gaussian of three spacings suggested", r.op === "conv" && r.w === 1.5, JSON.stringify(r));
  await p.selectOption(fld("kern"), "col"); await p.waitForTimeout(250);
  check("…another column as kernel shows its picker, not the width", await p.isVisible(fld("col")) && !(await p.isVisible(fld("w"))));
  await p.selectOption(fld("kern"), "box"); await p.waitForTimeout(250); await p.fill(fld("w"), "2"); await p.press(fld("w"), "Enter"); await p.waitForTimeout(300);
  r = await p.evaluate(() => $("#pane-tool").textContent); check("…a box of 2 s: 5 points of kernel", /5 points of kernel/.test(r), r.slice(0, 200));
  await p.click("#tlOk"); await p.waitForTimeout(400);
  r = await p.evaluate(() => { const c = yCols()[0], d = finalOf(c), raw = rawSeries(c); return { ops: c.pipe.map(s => s.op), y: d.y[100], want: raw.y.slice(98, 103).reduce((a, v) => a + v, 0) / 5 }; });
  check("OK: each point the mean of five", r.ops.join() === "conv" && Math.abs(r.y - r.want) < 1e-12, JSON.stringify(r));
  await menu(p, "analyze", "Signal processing", "Deconvolution…");
  await p.selectOption(fld("kern"), "box"); await p.waitForTimeout(200); await p.fill(fld("w"), "2"); await p.press(fld("w"), "Enter"); await p.waitForTimeout(400);
  r = await p.evaluate(() => $("#pane-tool").textContent);
  check("Deconvolution…: Wiener's, its ratio estimated and the noise's rise said", /Wiener's deconvolution/.test(r) && /estimated/.test(r) && /rises/.test(r), r.slice(0, 300));
  await p.click("#tlOk"); await p.waitForTimeout(400);
  check("…both steps in the column's processing", await p.evaluate(() => yCols()[0].pipe.map(s => s.op).join() === "conv,deconv"));
}, { name: "5.3" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
