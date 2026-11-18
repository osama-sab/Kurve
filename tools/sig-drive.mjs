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

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
