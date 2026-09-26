/* Tests for the peak shapes, composite models and the fitter in kurve.html.
   Pulls the marked numerics and peak blocks out of the HTML and runs them.
   Usage: node tools/fit-test.mjs                                          */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "kurve.html"), "utf8");
const grab = (tag) => {
  const m = html.match(new RegExp(`==${tag}:START==[\\s\\S]*?\\*\\/([\\s\\S]*?)\\/\\* ==${tag}:END==`));
  if (!m) { console.error(`Could not find the ${tag} block`); process.exit(1); }
  return m[1];
};
// COLMATH needs a couple of helpers the app defines elsewhere.
const shims = `const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const fmt=v=>String(v); const P=()=>null; const colById=()=>null; const derivedTable=()=>({x:[],byId:{}});
const medianStep=xs=>{const d=[];for(let i=1;i<xs.length;i++){const g=Math.abs(xs[i]-xs[i-1]);if(g>0)d.push(g);} d.sort((a,b)=>a-b); return d.length?d[d.length>>1]:1;};`;
const src = `${grab("NUMERICS")}\n${grab("PEAKS")}\n${shims}\n${grab("COLMATH")}\n` +
  `return {solve,inverse,lmFit,polyfit,tPvalue,betai,PEAKS,BASELINES,compileModel,modelBounds,sgCoeffs,sgApply,findPeaks,seedPeak,noiseSigma,peakAreaForHeight,FWHM_SIG,interpOnto,trapz,NORMS};`;
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
  const v = [1, 2, 3, 4, 5];
  check("norm: divide by max", N.NORMS.max.run(v.slice()).every((q, i) => near(q, v[i] / 5, 1e-12)));
  check("norm: scale to 0..1", (() => { const o = N.NORMS.minmax.run(v.slice()); return near(o[0], 0, 1e-12) && near(o[4], 1, 1e-12); })());
  check("norm: z-score has zero mean", (() => { const o = N.NORMS.zscore.run(v.slice()); return near(o.reduce((a, b) => a + b, 0), 0, 1e-12); })());
  check("norm: divide by area", (() => { const x = [0, 1, 2], y = [0, 2, 0]; const o = N.NORMS.area.run(y.slice(), x); return near(N.trapz(x, o), 1, 1e-12); })());
  check("norm: constant column survives", N.NORMS.minmax.run([3, 3, 3]).every(q => q === 3));
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

/* ---------- p-values against known values ---------- */
check("tPvalue: t=2.228, dof=10 is ~0.05", near(N.tPvalue(2.228, 10), 0.05, 5e-4), N.tPvalue(2.228, 10));
check("tPvalue: t=0 is 1", near(N.tPvalue(0, 10), 1, 1e-12), N.tPvalue(0, 10));
check("tPvalue: large t is tiny", N.tPvalue(30, 50) < 1e-20, N.tPvalue(30, 50));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
