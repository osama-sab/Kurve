/* Tests for the peak shapes, composite models and the fitter in kurve.html.
   Pulls the marked numerics and peak blocks out of the HTML and runs them.
   Usage: node tools/fit-test.mjs                                          */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(process.argv[2] || join(here, "..", "kurve.html"), "utf8");
const grab = (tag) => {
  const m = html.match(new RegExp(`==${tag}:START==[\\s\\S]*?\\*\\/([\\s\\S]*?)\\/\\* ==${tag}:END==`));
  if (!m) { console.error(`Could not find the ${tag} block`); process.exit(1); }
  return m[1];
};
// Interpolation, integration and normalizing live in the pipeline block now;
// tools/pipe-test.mjs tests the rest of it.
const src = `${grab("NUMERICS")}\n${grab("PEAKS")}\n${grab("PIPE")}\n` +
  `return {solve,inverse,lmFit,polyfit,tPvalue,betai,PEAKS,BASELINES,compileModel,modelBounds,sgCoeffs,sgApply,findPeaks,peakSearch,seedPeak,noiseSigma,peakAreaForHeight,FWHM_SIG,interpOnto,trapz,PIPE_OPS,runPipe,compileExpr,guessUserParams,erfFn,erfcFn,faddeeva,peakLinks,applyPeakLinks,linkResult,integrateBand,bandsFromPeaks,globalFit,matchPeakTracks};`;
const N = new Function(src)();

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail == null ? "" : `  (${detail})`}`); }
}
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= Math.abs(tol);
const rel = (a, b, frac) => Number.isFinite(a) && Math.abs(a - b) <= Math.abs(b * frac) + 1e-12;

/* ---------- peak shapes: area, height and FWHM must mean what they say ---------- */
function numericArea(f, p, x0, x1, n = 200000) {
  const h = (x1 - x0) / n; let s = 0;
  for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 0.5 : 1) * f(x0 + i * h, p);
  return s * h;
}
function numericFWHM(f, p, xc, span) {
  const top = f(xc, p), half = top / 2;
  const find = (dir) => {
    let a = xc, b = xc + dir * span;
    for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (f(m, p) > half) a = m; else b = m; }
    return (a + b) / 2;
  };
  return Math.abs(find(1) - find(-1));
}
for (const [key, p, span] of [
  ["gauss", [100, 5, 8], 400],
  ["lorentz", [100, 5, 8], 6000],
  ["psdvoigt", [100, 5, 8, 0.5], 6000],
  ["pearson7", [100, 5, 8, 1.5], 8000],
]) {
  const d = N.PEAKS[key];
  check(`${key}: area integrates to A`, rel(numericArea(d.f, p, 100 - span, 100 + span), 5, 0.01),
    numericArea(d.f, p, 100 - span, 100 + span));
  check(`${key}: height matches`, rel(d.height(p), d.f(p[0], p), 1e-9), `${d.height(p)} vs ${d.f(p[0], p)}`);
  check(`${key}: FWHM is w`, rel(numericFWHM(d.f, p, 100, span), 8, 1e-4), numericFWHM(d.f, p, 100, span));
}
// psdvoigt2 has two widths; with both equal it must equal psdvoigt
{
  const a = N.PEAKS.psdvoigt2.f(103, [100, 5, 8, 8, 0.3]);
  const b = N.PEAKS.psdvoigt.f(103, [100, 5, 8, 0.3]);
  check("psdvoigt2: equals psdvoigt when widths match", rel(a, b, 1e-12), `${a} vs ${b}`);
}
// mixing 0 and 1 must reduce to the pure shapes
check("psdvoigt: mu=0 is Gaussian", rel(N.PEAKS.psdvoigt.f(104, [100, 5, 8, 0]), N.PEAKS.gauss.f(104, [100, 5, 8]), 1e-12));
check("psdvoigt: mu=1 is Lorentzian", rel(N.PEAKS.psdvoigt.f(104, [100, 5, 8, 1]), N.PEAKS.lorentz.f(104, [100, 5, 8]), 1e-12));
// Pearson VII with m=1 is a Lorentzian
check("pearson7: m=1 is Lorentzian", rel(N.PEAKS.pearson7.f(104, [100, 5, 8, 1]), N.PEAKS.lorentz.f(104, [100, 5, 8]), 1e-9),
  `${N.PEAKS.pearson7.f(104, [100, 5, 8, 1])} vs ${N.PEAKS.lorentz.f(104, [100, 5, 8])}`);

/* ---------- polyfit conditioning (the gap noted in CLAUDE.md) ---------- */
{
  // A quadratic on a wavenumber axis: the raw power basis loses this badly.
  const X = [], Y = [];
  for (let x = 1500; x <= 1800; x += 2) { X.push(x); Y.push(3 - 0.004 * (x - 1650) + 2e-5 * Math.pow(x - 1650, 2)); }
  const c = N.polyfit(X, Y, 2);
  const at = (x) => c[0] + x * (c[1] + x * c[2]);
  const worst = Math.max(...X.map((x, i) => Math.abs(at(x) - Y[i])));
  check("polyfit: quadratic on a wavenumber axis", worst < 1e-6, `worst residual ${worst}`);
}

/* ---------- Savitzky-Golay ---------- */
{
  const c = N.sgCoeffs(5, 2, 0);
  check("sg: smoothing coefficients sum to 1", near(c.reduce((a, b) => a + b, 0), 1, 1e-12), c.join());
  check("sg: known 5-point quadratic kernel", near(c[0], -3 / 35, 1e-12) && near(c[2], 17 / 35, 1e-12), c.join());
  // second derivative of a known parabola
  const X = [], Y = [];
  for (let i = 0; i < 41; i++) { const x = i * 0.5; X.push(x); Y.push(2 + 3 * x + 4 * x * x); }
  const d2 = N.sgApply(Y, 7, 2, 2, 0.5);
  check("sg: second derivative of 4x^2 is 8", near(d2[20], 8, 1e-9), d2[20]);
}

/* ---------- peak finding ---------- */
function synth(peaks, base, x0, x1, n, noise = 0, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 - 0.5; };
  const X = [], Y = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * i / (n - 1);
    let y = base(x);
    peaks.forEach(([type, p]) => { y += N.PEAKS[type].f(x, p); });
    X.push(x); Y.push(y + rnd() * noise);
  }
  return { X, Y };
}
{
  const { X, Y } = synth([["gauss", [300, 500, 20]], ["gauss", [500, 800, 25]], ["gauss", [700, 300, 15]]],
    () => 10, 100, 900, 400, 0.4, 3);
  const found = N.findPeaks(X, Y, { method: "max" });
  check("findPeaks: three separated peaks", found.length === 3, `${found.length}: ${found.map(f => f.x.toFixed(0))}`);
  if (found.length === 3) check("findPeaks: centres close", found.every((f, i) => near(f.x, [300, 500, 700][i], 12)),
    found.map(f => f.x.toFixed(1)).join());
}
{
  // A shoulder that never becomes a local maximum: the sum falls monotonically
  // away from the main peak, so only the 2nd derivative can see the second one.
  const { X, Y } = synth([["gauss", [500, 1000, 40]], ["gauss", [525, 300, 30]]], () => 5, 350, 700, 400, 0.05, 7);
  const ymax = Math.max(...Y);
  const iTop = Y.indexOf(ymax);
  let monotonic = true;
  for (let i = iTop + 1; i < Y.length - 1; i++) if (Y[i] > Y[i - 1] + 0.3) { monotonic = false; break; }
  check("findPeaks: test data really is a shoulder", monotonic, "second peak forms its own maximum");
  const byMax = N.findPeaks(X, Y, { method: "max" });
  const byD2 = N.findPeaks(X, Y, { method: "deriv2" });
  check("findPeaks: local max misses the shoulder", byMax.length === 1, byMax.length);
  check("findPeaks: 2nd derivative finds both", byD2.length === 2, `${byD2.length}: ${byD2.map(f => f.x.toFixed(0))}`);
}
{
  const { X, Y } = synth([["gauss", [500, -800, 25]]], () => 100, 300, 700, 300, 0.2, 11);
  const neg = N.findPeaks(X, Y, { method: "max", direction: "negative" });
  check("findPeaks: negative peak", neg.length === 1 && near(neg[0].x, 500, 8), JSON.stringify(neg.map(f => f.x)));
}

/* ---------- the real test: recover known parameters from a multi-peak fit ---------- */
function fitSpec(X, Y, spec, init, opts) {
  const x0 = (Math.min(...X) + Math.max(...X)) / 2;
  const model = N.compileModel(spec, x0);
  const { lo, hi } = N.modelBounds(spec, model, init);
  const W = X.map(() => 1);
  return N.lmFit(model.f, X, Y, W, init, init.map(() => false), { lo, hi, ...(opts || {}) });
}
{
  // Three Gaussians on a sloping background, sitting at wavenumbers around 1700.
  const truth = [["gauss", [1620, 900, 30]], ["gauss", [1700, 1500, 22]], ["gauss", [1745, 600, 18]]];
  const base = (x) => 40 - 0.01 * (x - 1650);
  const { X, Y } = synth(truth, base, 1500, 1850, 350, 1.5, 5);
  const spec = { base: "linear", peaks: [{ type: "gauss" }, { type: "gauss" }, { type: "gauss" }] };
  const init = [40, 0, 1618, 800, 35, 1702, 1400, 25, 1748, 500, 20];
  const r = fitSpec(X, Y, spec, init);
  check("multi-peak: converged", !r.error && r.stats.converged, r.error || `iter ${r.stats && r.stats.iter}`);
  if (!r.error) {
    const got = [[r.params[2], r.params[3], r.params[4]], [r.params[5], r.params[6], r.params[7]], [r.params[8], r.params[9], r.params[10]]];
    truth.forEach(([, p], k) => {
      check(`multi-peak: peak ${k + 1} centre`, near(got[k][0], p[0], 0.5), `${got[k][0].toFixed(2)} vs ${p[0]}`);
      check(`multi-peak: peak ${k + 1} area`, rel(got[k][1], p[1], 0.05), `${got[k][1].toFixed(1)} vs ${p[1]}`);
      check(`multi-peak: peak ${k + 1} FWHM`, rel(got[k][2], p[2], 0.05), `${got[k][2].toFixed(2)} vs ${p[2]}`);
    });
    check("multi-peak: R2 high", r.stats.R2 > 0.999, r.stats.R2);
    check("multi-peak: errors finite", r.errors.every(Number.isFinite) && r.errors.slice(2).every(e => e > 0), r.errors.join());
    check("multi-peak: p-values small", r.pval.slice(2).every(v => v < 1e-6), r.pval.map(v => v.toExponential(1)).join());
    check("multi-peak: dependency sane", r.dep.every(d => d >= 0 && d <= 1), r.dep.join());
  }
}
{
  // Heavily overlapped: this is where conditioning matters.
  const truth = [["gauss", [1000.0, 500, 12]], ["gauss", [1012.0, 400, 14]]];
  const { X, Y } = synth(truth, () => 5, 940, 1080, 280, 0.3, 17);
  const spec = { base: "const", peaks: [{ type: "gauss" }, { type: "gauss" }] };
  const r = fitSpec(X, Y, spec, [5, 998, 450, 15, 1014, 450, 15]);
  check("overlapped: converged", !r.error && r.stats.converged, r.error);
  if (!r.error) {
    check("overlapped: centres", near(r.params[1], 1000, 0.6) && near(r.params[4], 1012, 0.6),
      `${r.params[1].toFixed(2)}, ${r.params[4].toFixed(2)}`);
    check("overlapped: dependency flags the overlap", Math.max(r.dep[2], r.dep[5]) > 0.5,
      r.dep.map(d => d.toFixed(3)).join());
  }
}
{
  // Lorentzians with a quadratic background, to exercise the baseline centring.
  const truth = [["lorentz", [520.7, 2400, 4.1]]];
  const base = (x) => 100 + 0.05 * (x - 500) + 0.002 * Math.pow(x - 500, 2);
  const { X, Y } = synth(truth, base, 480, 560, 200, 1.0, 23);
  const spec = { base: "quad", peaks: [{ type: "lorentz" }] };
  const r = fitSpec(X, Y, spec, [100, 0, 0, 521, 2000, 5]);
  check("lorentz+quad: converged", !r.error && r.stats.converged, r.error);
  if (!r.error) {
    check("lorentz+quad: centre", near(r.params[3], 520.7, 0.1), r.params[3]);
    check("lorentz+quad: FWHM", rel(r.params[5], 4.1, 0.05), r.params[5]);
  }
}
{
  // Bounds must actually hold: mu of a pseudo-Voigt cannot leave [0,1].
  const { X, Y } = synth([["gauss", [500, 900, 20]]], () => 3, 400, 600, 200, 0.5, 31);
  const spec = { base: "const", peaks: [{ type: "psdvoigt" }] };
  const r = fitSpec(X, Y, spec, [3, 500, 900, 20, 0.5]);
  check("bounds: mu stays in range", !r.error && r.params[4] >= 0 && r.params[4] <= 1, r.params && r.params[4]);
  check("bounds: width stays positive", !r.error && r.params[3] > 0, r.params && r.params[3]);
}
{
  // Seeding from findPeaks should be good enough to converge unaided.
  const truth = [["gauss", [300, 500, 20]], ["gauss", [500, 800, 25]], ["gauss", [700, 300, 15]]];
  const { X, Y } = synth(truth, () => 10, 100, 900, 400, 0.4, 3);
  const found = N.findPeaks(X, Y, { method: "max" });
  const baseY = Math.min(...Y);
  const init = [baseY];
  found.forEach(f => { const s = N.seedPeak(X, Y, f.i, baseY); init.push(s.xc, s.A, s.w); });
  const spec = { base: "const", peaks: found.map(() => ({ type: "gauss" })) };
  const r = fitSpec(X, Y, spec, init);
  check("auto-seed: converged from findPeaks", !r.error && r.stats.converged, r.error);
  if (!r.error) check("auto-seed: centres recovered",
    truth.every(([, p], k) => near(r.params[1 + k * 3], p[0], 1)),
    [r.params[1], r.params[4], r.params[7]].map(v => v.toFixed(2)).join());
}

/* ---------- column maths ---------- */
{
  // trapezoid area of a known Gaussian, and of a triangle
  const X = [], Y = [];
  for (let i = 0; i <= 4000; i++) { const x = -40 + i * 0.02; X.push(x); Y.push(N.PEAKS.gauss.f(x, [0, 7, 5])); }
  check("trapz: Gaussian area", rel(N.trapz(X, Y), 7, 1e-4), N.trapz(X, Y));
  check("trapz: triangle", near(N.trapz([0, 1, 2], [0, 1, 0]), 1, 1e-12), N.trapz([0, 1, 2], [0, 1, 0]));
  // a descending axis, as an infrared file has, gives the negative of the same magnitude
  const xr = X.slice().reverse(), yr = Y.slice().reverse();
  check("trapz: descending axis flips sign", rel(N.trapz(xr, yr), -7, 1e-4), N.trapz(xr, yr));
}
{
  const xs = [0, 1, 2, 3, 4], ys = [0, 10, 20, 30, 40];
  const out = N.interpOnto(xs, ys, [0.5, 1.5, 3.25]);
  check("interp: midpoints", out.every((v, i) => near(v, [5, 15, 32.5][i], 1e-12)), out.join());
  check("interp: outside range is null", N.interpOnto(xs, ys, [-1, 9]).every(v => v === null));
  check("interp: unsorted source still works",
    near(N.interpOnto([4, 0, 2, 1, 3], [40, 0, 20, 10, 30], [1.5])[0], 15, 1e-12));
  check("interp: gaps ignored", near(N.interpOnto([0, 1, null, 3], [0, 10, 99, 30], [2])[0], 20, 1e-12));
}
{
  const v = [1, 2, 3, 4, 5], ser = y => ({ x: y.map((_, i) => i), y, e: null, idx: y.map((_, i) => i) });
  const norm = (y, mode) => N.PIPE_OPS.norm.run(ser(y), { mode, how: "height" }).d.y;
  check("norm: divide by max", norm(v, "max").every((q, i) => near(q, v[i] / 5, 1e-12)));
  check("norm: scale to 0..1", (() => { const o = norm(v, "minmax"); return near(o[0], 0, 1e-12) && near(o[4], 1, 1e-12); })());
  check("norm: SNV has zero mean", (() => { const o = norm(v, "snv"); return near(o.reduce((a, b) => a + b, 0), 0, 1e-12); })());
  check("norm: divide by area", (() => { const o = norm([0, 2, 0], "area"); return near(N.trapz([0, 1, 2], o), 1, 1e-12); })());
  // A constant cannot be scaled to 0..1: the step says so and passes the data on.
  check("norm: a constant spectrum is refused, not divided by zero", (() => { const r = N.runPipe(ser([3, 3, 3]), [{ op: "norm", on: true, p: { mode: "minmax" } }], {}); return !!r.stages[1].err && r.out.y.every(q => q === 3); })());
}

/* ---------- a singular fit must say so, and survive being saved ---------- */
{
  // Two identical Gaussians describe the same feature, so the covariance
  // collapses. The failure has to be reported, not rendered as "no errors".
  const { X, Y } = synth([["gauss", [500, 900, 25]]], () => 3, 400, 600, 200, 0.2, 41);
  const spec = { base: "const", peaks: [{ type: "gauss" }, { type: "gauss" }] };
  const x0 = (Math.min(...X) + Math.max(...X)) / 2;
  const model = N.compileModel(spec, x0);
  const init = [3, 500, 450, 25, 500, 450, 25];
  // fix every peak parameter so the free set is rank-deficient by construction
  const r = N.lmFit(model.f, X, Y, X.map(() => 1), init, [false, false, false, false, false, false, false],
    { lo: init.map(() => -Infinity), hi: init.map(() => Infinity) });
  check("singular: reported, not silently zeroed",
    r.error || r.stats.singular === false || r.errors.every(e => e === null || Number.isFinite(e)),
    JSON.stringify(r.errors));
  if (!r.error && r.stats.singular) {
    check("singular: errors are null not 0", r.errors.some(e => e === null), JSON.stringify(r.errors));
  }
  // whatever the fit, the errors must round-trip through JSON unchanged
  if (!r.error) {
    const round = JSON.parse(JSON.stringify({ e: r.errors })).e;
    check("singular: errors survive JSON",
      round.every((v, i) => (v === null) === (r.errors[i] === null)),
      `${JSON.stringify(r.errors)} -> ${JSON.stringify(round)}`);
    check("singular: no NaN reaches storage", !r.errors.some(e => Number.isNaN(e)), JSON.stringify(r.errors));
  }
}

/* ---------- derivatives on a descending axis ---------- */
{
  // A wavenumber axis runs high to low. Taking the derivative with a positive
  // step there returns the wrong sign — silently, on the app's own default axis.
  const f = (x) => 3 * x + 5;              // dy/dx = 3 everywhere
  const up = [], upY = [], down = [], downY = [];
  for (let i = 0; i < 41; i++) { const x = 100 + i * 2; up.push(x); upY.push(f(x)); }
  for (let i = 0; i < 41; i++) { const x = 180 - i * 2; down.push(x); downY.push(f(x)); }

  const step = (xs) => {          // mirrors medianStep in the app
    const d = []; let dn = 0, u = 0;
    for (let i = 1; i < xs.length; i++) { const dx = xs[i] - xs[i - 1]; if (!dx) continue; dx < 0 ? dn++ : u++; d.push(Math.abs(dx)); }
    d.sort((a, b) => a - b);
    const mag = d[d.length >> 1];
    return dn > u ? -mag : mag;
  };
  check("deriv: ascending axis gives +3", near(N.sgApply(upY, 7, 2, 1, step(up))[20], 3, 1e-9),
    N.sgApply(upY, 7, 2, 1, step(up))[20]);
  check("deriv: descending axis also gives +3", near(N.sgApply(downY, 7, 2, 1, step(down))[20], 3, 1e-9),
    N.sgApply(downY, 7, 2, 1, step(down))[20]);
  // second derivative of a parabola is sign-independent, and must stay so
  const p2 = [], p2x = [];
  for (let i = 0; i < 41; i++) { const x = 180 - i * 2; p2x.push(x); p2.push(4 * x * x); }
  check("deriv: 2nd derivative unaffected by direction", near(N.sgApply(p2, 9, 2, 2, step(p2x))[20], 8, 1e-8),
    N.sgApply(p2, 9, 2, 2, step(p2x))[20]);
}

/* ---------- peak picking: spikes, prominence, seeding on overlaps ---------- */
{
  // A cosmic-ray spike is one point tall: nothing constrains its width, so the
  // picker sets it aside, and says which one, rather than handing it to the fitter.
  const { X, Y } = synth([["lorentz", [520, 2400 * Math.PI * 4.1 / 2, 4.1]]], () => 120, 490, 550, 81, 20, 5);
  Y[18] += 420;
  const plain = N.findPeaks(X, Y, { method: "max", minHeightPct: 5 });
  const guarded = N.findPeaks(X, Y, { method: "max", minHeightPct: 5, minPts: 2 });
  check("spike: without the guard it is taken for a peak", plain.some(p => Math.abs(p.x - X[18]) < 1e-9), plain.map(p => p.x));
  check("spike: with minPts 2 only the real band remains", guarded.length === 1 && near(guarded[0].x, 520, 1), guarded.map(p => p.x));
  check("spike: and it is reported", guarded.rejected.length === 1 && Math.abs(guarded.rejected[0].x - X[18]) < 1e-9, guarded.rejected);
}
{
  // Noise wiggles on the flank of a strong band are local maxima well above the
  // floor. Prominence against the noise drops them and keeps a small real band.
  const { X, Y } = synth([["lorentz", [1741, 12, 15]], ["gauss", [1603, 2, 11]], ["gauss", [1578, 0.8, 9]]], () => 0.04, 1550, 1800, 201, 0.03, 9);
  const all = N.findPeaks(X, Y, { method: "max", minHeightPct: 2 });
  const prom = N.findPeaks(X, Y, { method: "max", minHeightPct: 2, prominence: "auto" });
  check("prominence: height alone lets noise through", all.length > 3, all.map(p => p.x));
  check("prominence: finds exactly the three bands", prom.length === 3 && [1578, 1603, 1741].every((c, i) => near(prom[i].x, c, 3)), prom.map(p => p.x));
  check("prominence: never applied to the 2nd-derivative search",
    N.findPeaks(X, Y, { method: "deriv2", prominence: "auto" }).length === N.findPeaks(X, Y, { method: "deriv2" }).length);
}
{
  // Width seeds on overlapping bands: the side facing the neighbour never
  // falls to half height, so the width must come from the other side.
  const { X, Y } = synth([["gauss", [1741, 8, 15]], ["gauss", [1718, 5, 19]]], () => 0, 1650, 1800, 241, 0, 1);
  const i = Y.indexOf(Math.max(...Y));
  const s = N.seedPeak(X, Y, i, 0);
  check("seed: overlapped band's width within 20% of the truth", near(s.w, 15, 3), s.w);
  check("seed: reports the height it measured", near(s.h, Y[i], 1e-12), s.h);
  const iso = synth([["gauss", [500, 900, 20]]], () => 10, 300, 700, 401, 0, 1);
  const k = iso.Y.indexOf(Math.max(...iso.Y));
  check("seed: an isolated band's width is exact to a point spacing", near(N.seedPeak(iso.X, iso.Y, k, 10).w, 20, 1), N.seedPeak(iso.X, iso.Y, k, 10).w);
}
{
  // A seeded height is kept exactly for every shape, whatever its area/height ratio.
  for (const [type, pv] of [["gauss", [0, 1, 10]], ["lorentz", [0, 1, 10]], ["psdvoigt", [0, 1, 10, 0.3]], ["psdvoigt2", [0, 1, 8, 6, 0.4]], ["pearson7", [0, 1, 10, 2]]]) {
    const def = N.PEAKS[type], q = pv.slice(); q[1] = N.peakAreaForHeight(def, pv, 3.7);
    check(`area for height: ${type}`, rel(def.height(q), 3.7, 1e-12), def.height(q));
  }
}
{
  // Noise from second differences, with a strong peak in the data.
  let s = 17; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const Y = []; for (let i = 0; i < 2000; i++) { let u = 0; while (!u) u = rnd(); const v = rnd();
    Y.push(50 * Math.exp(-(((i - 1000) / 80) ** 2)) + 0.3 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); }
  check("noise: sigma estimated within 15%", near(N.noiseSigma(Y), 0.3, 0.045), N.noiseSigma(Y));
}

/* ---------- the peak finder: thresholds, log scale, reasons ---------- */
{
  // A band three decades below the main one, standing ten times the noise.
  // A threshold as a percentage of the largest peak can never see it; one
  // against the noise, one in decades, or a search on a log scale can.
  const { X, Y } = synth([["gauss", [300, 1000 * 20 * 1.0645, 20]], ["gauss", [700, 1 * 15 * 1.0645, 15]]], () => 2, 0, 999, 1000, 0.35, 11);
  const at = (r, c) => r.found.some(p => near(p.x, c, 3));
  const old = N.findPeaks(X, Y, { method: "max", minPts: 2, prominence: "auto" });
  check("small band: the old 5% floor misses it", old.length === 1 && near(old[0].x, 300, 3), old.map(p => p.x));
  const snr = N.peakSearch(X, Y, {});
  check("small band: found by signal to noise, with the main one", snr.found.length === 2 && at(snr, 300) && at(snr, 700), snr.found.map(p => p.x));
  const pct = N.peakSearch(X, Y, { thr: { mode: "pct", v: 5 } });
  const why = pct.rejected.find(p => near(p.x, 700, 3));
  check("small band: 5% of the largest turns it down, and says why", !at(pct, 700) && why && /% of the largest/.test(why.why), why && why.why);
  check("small band: 2 decades turn it down, 4 keep it", !at(N.peakSearch(X, Y, { thr: { mode: "decades", v: 2 } }), 700) && at(N.peakSearch(X, Y, { thr: { mode: "decades", v: 4 } }), 700));
  const lg = N.peakSearch(X, Y, { log: true });
  check("small band: found on a log scale too", at(lg, 300) && at(lg, 700), lg.found.map(p => p.x));
  const sm = snr.found.find(p => near(p.x, 700, 3));
  check("small band: its FWHM and height are measured", sm && near(sm.w, 15, 3) && near(sm.h, 1, 0.3), sm && [sm.w, sm.h]);
  const noise = synth([], () => 0, 0, 999, 1000, 1, 5);
  check("pure noise: nothing found", N.peakSearch(noise.X, noise.Y, {}).found.length === 0, N.peakSearch(noise.X, noise.Y, {}).found.map(p => p.x));
  const Ys = Y.slice(); Ys[500] += 40;
  const sp = N.peakSearch(X, Ys, {});
  check("spike: set aside with its reason", !at(sp, 500) && sp.rejected.some(p => p.code === "spike" && near(p.x, 500, 1)), sp.rejected.filter(p => p.code === "spike").map(p => p.x));
  check("every candidate turned down has a reason", [snr, pct, sp].every(r => r.rejected.every(p => typeof p.why === "string" && p.why.length > 5)));
  const mx = N.peakSearch(X, Y, { max: 1 });
  check("at most one: the weaker is turned down as beyond the count", mx.found.length === 1 && at(mx, 300) && mx.rejected.some(p => p.code === "max" && near(p.x, 700, 3)));
}
{
  const { X, Y } = synth([["gauss", [300, 100 * 40 * 1.0645, 40]], ["gauss", [345, 40 * 30 * 1.0645, 30]]], () => 0, 0, 599, 600, 0.4, 3);
  const d2 = N.peakSearch(X, Y, { method: "deriv2" });
  check("second derivative: both bands of a shoulder, once each", d2.found.length === 2 && near(d2.found[0].x, 300, 8) && near(d2.found[1].x, 345, 8), d2.found.map(p => p.x));
  const w = N.peakSearch(X, Y, { method: "window" }), d1 = N.peakSearch(X, Y, { method: "deriv1" });
  check("window and first-derivative searches find the main band", w.found.some(p => near(p.x, 300, 5)) && d1.found.some(p => near(p.x, 300, 5)));
  const dip = synth([["gauss", [500, -40 * 30 * 1.0645, 30]]], () => 100, 0, 999, 1000, 0.3, 4);
  const neg = N.peakSearch(dip.X, dip.Y, { direction: "negative" });
  check("dips found when peaks point down", neg.found.length === 1 && near(neg.found[0].x, 500, 3), neg.found.map(p => p.x));
}
/* ---------- Voigt (through the Faddeeva function) and Fano ---------- */
{
  const V = N.PEAKS.voigt, F = N.PEAKS.fano;
  const w11 = N.faddeeva(1, 1);
  check("Faddeeva: w(1+i) to 1e-13", near(w11[0], 0.30474420525691259, 1e-13) && near(w11[1], 0.20821893820283163, 1e-13), w11);
  let worst = 0; for (let x = 0; x <= 10; x += 0.05) worst = Math.max(worst, Math.abs(N.faddeeva(x, 0)[0] - Math.exp(-x * x)));
  check("Faddeeva: on the real axis its real part is exp(-x^2)", worst < 1e-12, worst);
  for (const p of [[100, 5, 8, 3], [100, 5, 2, 9], [100, 5, 8, 0.01]]) {
    check(`voigt ${p.slice(2)}: area integrates to A`, rel(numericArea(V.f, p, 100 - 8000, 100 + 8000, 400000), 5, 0.01), numericArea(V.f, p, 100 - 8000, 100 + 8000, 400000));
    check(`voigt ${p.slice(2)}: height matches`, rel(V.height(p), V.f(100, p), 1e-12));
    check(`voigt ${p.slice(2)}: FWHM is the profile's own`, rel(numericFWHM(V.f, p, 100, 400), V.fwhm(p), 1e-6), [numericFWHM(V.f, p, 100, 400), V.fwhm(p)]);
  }
  check("voigt: no Lorentzian width is a Gaussian", rel(V.f(104, [100, 5, 8, 1e-9]), N.PEAKS.gauss.f(104, [100, 5, 8]), 1e-6));
  check("voigt: no Gaussian width is a Lorentzian", rel(V.f(104, [100, 5, 1e-7, 8]), N.PEAKS.lorentz.f(104, [100, 5, 8]), 1e-6), [V.f(104, [100, 5, 1e-7, 8]), N.PEAKS.lorentz.f(104, [100, 5, 8])]);
  check("fano: 1/q = 0 is a Lorentzian", rel(F.f(104, [100, 5, 8, 0]), N.PEAKS.lorentz.f(104, [100, 5, 8]), 1e-12));
  const fp = [100, 5, 8, -0.25], top = F.top(fp);
  let best = -Infinity, bx = 0; for (let x = 80; x <= 120; x += 0.0005) { const v = F.f(x, fp); if (v > best) { best = v; bx = x; } }
  check("fano: height and top are the line's maximum", rel(F.height(fp), best, 1e-6) && near(top, bx, 1e-3), [F.height(fp), best, top, bx]);
  const half = best / 2, side = (dir) => { let a = top, b = top + dir * 400; for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (F.f(m, fp) > half) a = m; else b = m; } return (a + b) / 2; };
  check("fano: FWHM of the asymmetric line", rel(side(1) - side(-1), F.fwhm(fp), 1e-6), [side(1) - side(-1), F.fwhm(fp)]);
  // Both shapes are recovered by a fit of a synthetic spectrum.
  for (const [type, truth, init] of [["voigt", [50, 400, 6, 4], [49, 300, 5, 5]], ["fano", [50, 400, 6, -0.2], [49, 300, 5, -0.05]]]) {
    const spec = { base: "const", peaks: [{ type }] }, model = N.compileModel(spec, 50), X = [], Y = [];
    let s = 3; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
    for (let i = 0; i < 400; i++) { const x = i * 0.25; X.push(x); Y.push(model.f(x, [2].concat(truth)) + rnd() * 0.3); }
    const p0 = [1].concat(init), b = N.modelBounds(spec, model, p0);
    const r = N.lmFit(model.f, X, Y, X.map(() => 1), p0, p0.map(() => false), b);
    check(`${type}: a fit recovers its parameters`, r.params && truth.every((v, i) => rel(r.params[i + 1], v, 0.03)) && r.stats.converged, r.params);
  }
}
/* ---------- tied parameters: a doublet with a fixed area ratio and one width ---------- */
{
  const peaks = [{ type: "gauss", id: "a" }, { type: "gauss", id: "b", tie: { A: { to: "a", mul: 0.5 }, w: { to: "a", mul: 1 }, xc: { to: "a", mul: 1, add: 20 } } }];
  const spec = { base: "const", peaks }, m = N.compileModel(spec, 60), L = N.peakLinks(peaks, m);
  check("ties: resolved to parameter indices", L.length === 3 && L.every(l => l.k === 1 && l.j === 0), L.map(l => [l.nm, l.gi, l.gj]));
  const chain = N.peakLinks([{ type: "gauss", id: "a", tie: { w: { to: "b" } } }, { type: "gauss", id: "b", tie: { w: { to: "a" } } }], N.compileModel({ base: "none", peaks: [{ type: "gauss" }, { type: "gauss" }] }, 0));
  check("ties: a loop is not followed", chain.length === 0, chain.length);
  const truth = [3, 50, 800, 6, 70, 400, 6], X = [], Y = [];
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < 480; i++) { const x = i * 0.25; X.push(x); Y.push(m.f(x, truth) + rnd() * 0.5); }
  const p0 = N.applyPeakLinks([1, 48, 600, 8, 0, 0, 0], L), fixed = p0.map(() => false); L.forEach(l => { fixed[l.gi] = true; });
  const fT = (x, p) => m.f(x, N.applyPeakLinks(p, L));
  const r = N.linkResult(N.lmFit(fT, X, Y, X.map(() => 1), p0, fixed, N.modelBounds(spec, m, p0)), L);
  check("ties: the doublet is recovered, the tied peak following", r.params && [0, 1, 2, 3].every(i => rel(r.params[i], truth[i], 0.03)) && near(r.params[4], r.params[1] + 20, 1e-9) && near(r.params[5], 0.5 * r.params[2], 1e-9) && r.params[6] === r.params[3], r.params);
  check("ties: only free parameters count", r.stats.dof === 480 - 4, r.stats.dof);
  check("ties: a tied error is its leader's times |ratio|", near(r.errors[5], 0.5 * r.errors[2], 1e-12) && r.errors[6] === r.errors[3] && Number.isNaN(r.tval[5]), [r.errors[5], r.errors[2]]);
}
/* ---------- user-defined functions: parsed, never run as JavaScript ---------- */
{
  const C = (src) => { try { return N.compileExpr(src); } catch (e) { return { err: e.message, line: e.line, col: e.col }; } };
  const lin = C("y = a + b*x");
  check("formula: parameters in order of appearance", lin.params && lin.params.join() === "a,b", lin.params);
  check("formula: evaluates", lin.f && lin.f(2, [1, 3]) === 7);
  check("formula: ^ binds tighter than a leading minus, and to the right", C("-x^2 + a").f(3, [0]) === -9 && C("a*2^3^2").f(0, [1]) === 512);
  check("formula: ** is ^, and Unicode minus and times are read", C("a*x**2").f(3, [1]) === 9 && C("a×x − 1").f(2, [3]) === 5);
  const loc = C("u = (x - xc)/w\ny = A*exp(-u^2/2) + c");
  check("formula: named intermediate values are not parameters", loc.params && loc.params.join() === "xc,w,A,c", loc.params);
  check("formula: intermediate values are used", loc.f && near(loc.f(1, [0, 1, 2, 0.5]), 2 * Math.exp(-0.5) + 0.5, 1e-14));
  check("formula: constants and functions", near(C("a*sin(pi*x/2) + sqrt(abs(x))*b + log10(100)*0").f(1, [1, 2]), 3, 1e-14));
  check("formula: comments and blank lines are ignored", C("# a line\n\ny = a*x  # slope\n").f(2, [4]) === 8);
  const e1 = C("y = 2x"), e2 = C("y = expp(x)*a"), e3 = C("y = a*(x + 1"), e4 = C("y = a*x +"), e5 = C("u = u + 1\ny = u*a"), e6 = C("y = 3*x");
  check("formula: a missing * is named, with its place", /operator before “x”/.test(e1.err) && e1.col === 6, e1.err);
  check("formula: an unknown function is named", /no function called “expp”/.test(e2.err), e2.err);
  check("formula: an unclosed bracket and a dangling operator are named", /closing \)/.test(e3.err) && /ends too soon/.test(e4.err), [e3.err, e4.err]);
  check("formula: a value used before its line is caught", /before its line/.test(e5.err), e5.err);
  check("formula: no parameter, nothing to fit", /nothing to fit/.test(e6.err), e6.err);
  // A worksheet column's formula (F(x)=) may have no parameter at all.
  const ws1 = N.compileExpr("1e7/x", { allowNone: true }), ws2 = N.compileExpr("log10(B)*2 + i", { allowNone: true });
  check("formula: allowNone takes one without parameters, and column letters as names", ws1.params.length === 0 && ws1.f(500, []) === 2e4 &&
    ws2.params.join() === "B,i" && near(ws2.f(0, [100, 3]), 7, 1e-14), [ws1.params, ws2.params]);
  { const deep = C("y = " + "(".repeat(300) + "a*x" + ")".repeat(300)), long = C("y = " + Array(5000).fill("a").join("+")), fine = C("y = " + "(".repeat(150) + "a*x" + ")".repeat(150));
    check("formula: depth and length end in words, not a stack overflow", /nested more than 200 deep/.test(deep.err) && deep.col != null && /too long to read/.test(long.err) && !fine.err, [deep.err, long.err, fine.err]); }
  check("formula: nothing but arithmetic can run", /no function called “alert”/.test(C("y = alert(1)*a").err) && /cannot contain/.test(C("y = a`x`").err) &&
    /no function called “constructor”/.test(C("y = constructor(x)*a").err) && !!C("y = a.b*x").err && !!C("y = a[0]()*x").err, [C("y = constructor(x)*a").err, C("y = a[0]()*x").err]);
  check("erf and erfc to double precision", near(N.erfFn(0.5), 0.5204998778130465, 1e-15) && rel(N.erfcFn(5), 1.5374597944280349e-12, 1e-12) && rel(N.erfcFn(2.4), 0.0006885138966450786, 1e-12));
  const g = N.guessUserParams(["y0", "A", "xc", "w", "t", "q"], [0, 1, 2, 3, 4], [1, 2, 5, 2, 1]);
  check("starting values from the names", g[0] === 1 && g[1] === 4 && g[2] === 2 && near(g[3], 0.4, 1e-12) && g[5] === 1, g);
  // A stretched exponential, fitted from its guessed start, bounded.
  const fn = N.compileExpr("y = y0 + A*exp(-(x/t)^b)"), X = [], Y = [], truth = [5, 100, 12, 0.6];
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < 200; i++) { const x = 0.25 + i * 0.25; X.push(x); Y.push(fn.f(x, truth) + rnd() * 0.4); }
  const p0 = N.guessUserParams(fn.params, X, Y).map((v, i) => fn.params[i] === "b" ? 1 : v);
  const r = N.lmFit(fn.f, X, Y, X.map(() => 1), p0, p0.map(() => false), { lo: [-Infinity, 0, 0.01, 0.1], hi: [Infinity, Infinity, Infinity, 3] });
  check("a user's function fits: stretched exponential recovered", r.params && truth.every((v, i) => rel(r.params[i], v, 0.05)) && r.stats.converged, r.params);
}
/* ---------- integrating a band without a fit ---------- */
{
  // A Gaussian of area 50, sigma 4, at 120, on a sloping background, sampled every 0.5.
  const A = 50, sg = 4, xc = 120, g = x => A / (sg * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * ((x - xc) / sg) ** 2);
  const bg = x => 3 + 0.02 * x, X = [], Y = [];
  for (let x = 60; x <= 180; x += 0.5) { X.push(x); Y.push(g(x) + bg(x)); }
  const r = N.integrateBand(X, Y, null, xc - 6 * sg, xc + 6 * sg, { base: "line", avg: 1, sigma: 0 });
  check("band: area over a straight local baseline", rel(r.area, A, 1e-3), r.area);
  check("band: height, position, FWHM and centroid", rel(r.height, A / (sg * Math.sqrt(2 * Math.PI)), 2e-3) && near(r.pos, xc, 1e-3) &&
    rel(r.fwhm, 2 * Math.sqrt(2 * Math.LN2) * sg, 3e-3) && near(r.centroid, xc, 1e-3), [r.height, r.pos, r.fwhm, r.centroid]);
  const z = N.integrateBand(X, Y, null, xc - 6 * sg, xc + 6 * sg, { base: "zero" });
  check("band: no baseline includes the background under it", rel(z.area, A + 48 * (3 + 0.02 * xc), 1e-3), z.area);
  // The same spectrum on an axis running the other way, windows given either way round.
  const rv = N.integrateBand(X.slice().reverse(), Y.slice().reverse(), null, xc + 6 * sg, xc - 6 * sg, { base: "line", avg: 1 });
  check("band: a descending axis and a reversed window give the same area", rel(rv.area, r.area, 1e-12) && rv.area > 0, rv.area);
  // A dip integrates negative, and is measured at its lowest point.
  const d = N.integrateBand(X, Y.map(v => -v), null, xc - 6 * sg, xc + 6 * sg, { base: "line", avg: 1 });
  check("band: an absorption dip has a negative area, and its own depth", rel(d.area, -A, 1e-3) && rel(d.height, -r.height, 1e-9) && near(d.pos, xc, 1e-3), [d.area, d.height]);
  check("band: too few points is said, not guessed", !!N.integrateBand(X, Y, null, 100, 100.6, {}).fail);
  // The error bar means what it says: noise of sigma 0.2, 400 times over.
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const areas = []; let reported = 0;
  for (let t = 0; t < 400; t++) { const Yn = Y.map(v => v + 0.2 * gauss());
    const q = N.integrateBand(X, Yn, null, xc - 6 * sg, xc + 6 * sg, { base: "line", avg: 3, sigma: 0.2 }); areas.push(q.area); reported += q.err / 400; }
  const m = areas.reduce((a, b) => a + b, 0) / areas.length, sd = Math.sqrt(areas.reduce((a, b) => a + (b - m) ** 2, 0) / (areas.length - 1));
  check("band: the area's error matches the scatter of noisy repeats", rel(m, A, 0.01) && reported / sd > 0.8 && reported / sd < 1.35, [m, sd, reported]);
  // Error bars, when there are some, are used point by point.
  const eb = N.integrateBand(X, Y, X.map(() => 0.4), xc - 6 * sg, xc + 6 * sg, { base: "zero", sigma: 0.2 });
  const w = []; for (let x = xc - 6 * sg; x <= xc + 6 * sg + 1e-9; x += 0.5) w.push(0.5);
  w[0] = w[w.length - 1] = 0.25;
  check("band: error bars are propagated point by point", rel(eb.err, 0.4 * Math.sqrt(w.reduce((a, b) => a + b * b, 0)), 1e-9), eb.err);
  // Windows around two neighbouring peaks meet at the valley between them.
  const X2 = [], Y2 = []; for (let x = 0; x <= 100; x += 0.5) { X2.push(x); Y2.push(10 * Math.exp(-0.5 * ((x - 40) / 3) ** 2) + 6 * Math.exp(-0.5 * ((x - 55) / 3) ** 2)); }
  const bw = N.bandsFromPeaks(X2, Y2, [{ x: 55, w: 7 }, { x: 40, w: 7 }]);
  check("bands from peaks: split at the valley, outer edges two widths out", bw.length === 2 && bw[0].x2 === bw[1].x1 && bw[0].x2 > 45 && bw[0].x2 < 51 &&
    near(bw[0].x1, 26, 1e-9) && near(bw[1].x2, 69, 1e-9), JSON.stringify(bw));
}
/* ---------- the inverse: n^3, and the same answers ---------- */
{
  let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const n = 40, R = Array.from({ length: n }, () => Array.from({ length: n }, rnd));
  const A = R.map((_, i) => R.map((_, j) => R[i].reduce((t, v, k) => t + v * R[j][k], 0) + (i === j ? 0.5 : 0)));
  const inv = N.inverse(A); let worst = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let t = 0; for (let k = 0; k < n; k++) t += A[i][k] * inv[k][j]; worst = Math.max(worst, Math.abs(t - (i === j ? 1 : 0))); }
  check("inverse: A times its inverse is the identity", worst < 1e-9, worst);
  // Column by column it is solve(): the same pivots, the same arithmetic.
  const e3 = new Array(n).fill(0); e3[3] = 1; const c3 = N.solve(A, e3);
  check("inverse: each column is exactly what solve() gives", c3.every((v, i) => v === inv[i][3]));
  check("inverse: a singular matrix has none", N.inverse([[1, 2], [2, 4]]) === null);
}
/* ---------- global fits: parameters shared across spectra ---------- */
{
  let s = 29; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const G = N.PEAKS.gauss, xc = 100, w = 8, areas = [1000, 2000, 3000, 4000, 5000], sig = 4;
  const f = (x, p) => p[0] + G.f(x, [p[1], p[2], p[3]]);       // baseline, centre, area, FWHM
  const mk = () => areas.map((A, k) => { const X = [], Y = []; for (let x = 60; x <= 140; x += 0.5) { X.push(x); Y.push(5 + k + G.f(x, [xc, A, w]) + sig * gauss()); } return { X, Y }; });
  const sets = mk(), p0s = sets.map(() => [0, 97, 1500, 10]);
  const shared = [false, true, false, true], fixed = [false, false, false, false];
  const r = N.globalFit(sets, f, p0s, shared, fixed, { lo: [-Infinity, -Infinity, -Infinity, 1e-9] });
  check("global: it converges", !r.error && r.stats.converged, r.error);
  const ps = r.sets.map(q => q.params);
  check("global: the shared centre and width are one value in every spectrum", ps.every(p => p[1] === ps[0][1] && p[3] === ps[0][3]));
  check("global: the shared centre and width are recovered", near(ps[0][1], xc, 4 * r.sets[0].errors[1]) && near(ps[0][3], w, 4 * r.sets[0].errors[3]), [ps[0][1], ps[0][3], r.sets[0].errors[1]]);
  check("global: each spectrum's own area and baseline are its own", ps.every((p, k) => near(p[2], areas[k], 4 * r.sets[k].errors[2]) && near(p[0], 5 + k, 4 * r.sets[k].errors[0])), ps.map(p => p[2].toFixed(0)).join(","));
  check("global: degrees of freedom are every point less every parameter", r.stats.dof === 5 * 161 - (2 + 5 * 2) && r.m === 12, [r.stats.dof, r.m]);
  check("global: the shared error is smaller than any one spectrum's own fit's", (() => {
    const one = N.lmFit(f, sets[0].X, sets[0].Y, sets[0].X.map(() => 1), [0, 97, 1500, 10], [false, false, false, false]); return r.sets[0].errors[1] < one.errors[1]; })());
  // The same problem without blocks, by hand: the block-sparse path must agree.
  const X = [], Y = [], seg = []; sets.forEach((q, k) => { q.X.forEach((x, i) => { X.push(k * 1000 + x); Y.push(q.Y[i]); }); });
  const fd = (x, g) => { const k = Math.floor(x / 1000), xx = x - k * 1000; return g[2 + 2 * k] + G.f(xx, [g[0], g[3 + 2 * k], g[1]]); };
  const g0 = [97, 10]; p0s.forEach(p => g0.push(p[0], p[2]));
  const d = N.lmFit(fd, X, Y, X.map(() => 1), g0, g0.map(() => false), { lo: g0.map((_, i) => i === 1 ? 1e-9 : -Infinity) });
  check("global: the block-sparse fit is the dense fit", rel(d.params[0], ps[0][1], 1e-7) && rel(d.params[1], ps[0][3], 1e-7) && rel(d.errors[0], r.sets[0].errors[1], 1e-4) && rel(d.params[3 + 2 * 4], ps[4][2], 1e-7), [d.params[0], ps[0][1], d.errors[0], r.sets[0].errors[1]]);
  // The shared centre's error means what it says: 150 repeats.
  const cs = []; let rep = 0;
  for (let t = 0; t < 150; t++) { const q = N.globalFit(mk(), f, p0s, shared, fixed, { lo: [-Infinity, -Infinity, -Infinity, 1e-9] }); cs.push(q.sets[0].params[1]); rep += q.sets[0].errors[1] / 150; }
  const m = cs.reduce((a, b) => a + b, 0) / cs.length, sd = Math.sqrt(cs.reduce((a, b) => a + (b - m) ** 2, 0) / (cs.length - 1));
  check("global: the shared centre's error matches the scatter of noisy repeats", near(m, xc, 0.05) && rep / sd > 0.8 && rep / sd < 1.25, [m, sd, rep]);
  // A fixed parameter keeps each spectrum's own value; a tie applied by prep follows its peak in each.
  const f2 = (x, p) => G.f(x, [p[0], p[1], p[2]]) + G.f(x, [p[3], p[4], p[5]]);
  const sets2 = [1, 2, 3].map(k => { const X = [], Y = []; for (let x = 0; x <= 200; x += 1) { X.push(x); Y.push(G.f(x, [80, 1000 * k, 10]) + G.f(x, [120, 500 * k, 10]) + 2 * gauss()); } return { X, Y }; });
  const prep = p => { p[4] = 0.5 * p[1]; p[5] = p[2]; return p; };
  const r2 = N.globalFit(sets2, f2, sets2.map(() => [78, 900, 12, 121, 450, 12]), [true, false, true, true, false, false], [false, false, false, false, true, true], { prep });
  check("global: ties applied by prep hold in every spectrum", !r2.error && r2.sets.every((q, k) => near(q.params[4], 0.5 * q.params[1], 1e-9) && near(q.params[5], q.params[2], 1e-12) && rel(q.params[1], 1000 * (k + 1), 0.05)) && near(r2.sets[0].params[3], 120, 0.5), r2.error || r2.sets.map(q => q.params.map(v => v.toFixed(2)).join(" ")).join(" | "));
  check("global: one set is an ordinary fit", (() => { const a = N.globalFit([sets[0]], f, [[0, 97, 1500, 10]], shared, fixed, {}), b = N.lmFit(f, sets[0].X, sets[0].Y, sets[0].X.map(() => 1), [0, 97, 1500, 10], fixed);
    return rel(a.sets[0].params[2], b.params[2], 1e-6) && rel(a.sets[0].errors[2], b.errors[2], 1e-4); })());
}
/* ---------- the same peak across a series ---------- */
{
  const L = [[{ x: 100, w: 5 }, { x: 200, w: 6 }], [{ x: 101, w: 5 }, { x: 199, w: 6 }, { x: 300, w: 8 }], [{ x: 102.5, w: 5 }, { x: 300.4, w: 8 }], [{ x: 104, w: 5 }, { x: 110, w: 5 }]];
  const t = N.matchPeakTracks(L);
  check("tracks: a drifting band is one track", t.length === 4 && t[0].n === 4 && t[0].members.map(m => m.s).join() === "0,1,2,3" && t[0].x0 === 100 && t[0].x1 === 104, JSON.stringify(t.map(q => [q.x, q.n])));
  check("tracks: a peak that comes and goes keeps its track", t.find(q => Math.abs(q.x - 300) < 1).n === 2 && t.find(q => Math.abs(q.x - 200) < 2).n === 2);
  check("tracks: a new neighbour starts its own", t.some(q => q.x === 110 && q.n === 1));
  check("tracks: two peaks of one spectrum never share a track", N.matchPeakTracks([[{ x: 10, w: 4 }], [{ x: 9, w: 4 }, { x: 11, w: 4 }]]).length === 2);
  check("tracks: with no widths, the spacing given decides", N.matchPeakTracks([[{ x: 10 }], [{ x: 11 }]], { dx: 4 }).length === 1 && N.matchPeakTracks([[{ x: 10 }], [{ x: 11 }]]).length === 2);
}
/* ---------- p-values against known values ---------- */
check("tPvalue: t=2.228, dof=10 is ~0.05", near(N.tPvalue(2.228, 10), 0.05, 5e-4), N.tPvalue(2.228, 10));
check("tPvalue: t=0 is 1", near(N.tPvalue(0, 10), 1, 1e-12), N.tPvalue(0, 10));
check("tPvalue: large t is tiny", N.tPvalue(30, 50) < 1e-20, N.tPvalue(30, 50));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
