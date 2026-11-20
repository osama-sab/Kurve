/* Kurve's image analyses beyond ImageJ (ux/spec/QUDI_SPEC.md, Q.5 to Q.8): the properties no single reference shows.
   Spots: Poisson scans of known spots, each error against the spread of its value over 300 repeats (pulls with SD 1, no bias,
   a quarter of a cell off the centres), the reduced χ² near 1, a lone spot rarely split, an elliptical one fitted round not
   split, a pair closer than its FWHM found as two and biased when fitted as one, the axes' origin and units changing nothing
   but the numbers' units, the NV scan of tools/ref/qudi/nv against its truth, refusals in words, and its time.
   Usage: node tools/img-test.mjs [kurve.html] */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKurve } from "./ref/run.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const get = loadKurve(process.argv[2] || join(here, "..", "kurve.html"));
const spotFit = get("spotFit"), mul = get("mulberry32"), pois = get("poissonRand"), matAxis = get("matAxis");
let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log("  ok   " + name); } else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 400))); } };
const L16 = 4 * Math.LN2;
const grid = (n, a, step) => [...Array(n)].map((_, i) => a + i * step);
// a scan: μ = bg + Σ A·exp(−4 ln 2·(u²/w1² + v²/w2²)) turned by θ, as a count rate over t (Poisson counts / t), or noise-free
function scan(X, Y, bg, spots, t, rnd) { const z = [];
  for (const y of Y) for (const x of X) { let m = bg;
    for (const s of spots) { const a = (s.th || 0) * Math.PI / 180, ex = x - s.x, ey = y - s.y, u = ex * Math.cos(a) + ey * Math.sin(a), v = -ex * Math.sin(a) + ey * Math.cos(a);
      m += s.A * Math.exp(-L16 * (u * u / (s.w1 || s.w) ** 2 + v * v / (s.w2 || s.w) ** 2)); }
    z.push(rnd ? pois(m * t, rnd) / t : m); }
  return z; }
const stat = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return { m, sd: Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)) }; };
const fit = (X, Y, z, o) => spotFit({ nx: X.length, ny: Y.length, xs: X, ys: Y, z }, o);

console.log("Spots: honest errors");
{ const X = grid(24, 0, 0.1), Y = grid(24, 0, 0.1), t = 0.01, s0 = { x: 1.125, y: 1.175, A: 20000, w: 0.35 }, rnd = mul(101), pl = { x: [], y: [], w: [], A: [], B: [] }, chi = [], bias = [];
  let n = 0, extra = 0;
  for (let k = 0; k < 300; k++) { const r = fit(X, Y, scan(X, Y, 2000, [s0], t, rnd), { prom: 8000, noise: "rate", t, R: 0.5 }); const ok = r.spots.filter((q) => q.x != null);
    if (ok.length !== 1) { extra++; continue; } const q = ok[0]; n++;
    pl.x.push((q.x - s0.x) / q.sx); pl.y.push((q.y - s0.y) / q.sy); pl.w.push((q.w - s0.w) / q.sw); pl.A.push((q.A - s0.A) / q.sA); pl.B.push((q.B - 2000) / q.sB); chi.push(q.chi2r); bias.push((q.x - s0.x) / 0.1); }
  for (const k of ["x", "y", "w", "A", "B"]) { const s = stat(pl[k]); check(`a spot's ${k === "w" ? "FWHM" : k === "A" ? "peak" : k === "B" ? "background" : k} over ${n} Poisson repeats: its error the spread of its value (pull SD ${s.sd.toFixed(3)}) and no bias (pull mean ${s.m.toFixed(3)})`, s.sd > 0.9 && s.sd < 1.1 && Math.abs(s.m) < 0.2, JSON.stringify(s)); }
  const c = stat(chi), b = stat(bias);
  check(`the reduced χ² of shot noise near 1 (mean ${c.m.toFixed(3)})`, Math.abs(c.m - 1) < 0.05, JSON.stringify(c));
  check(`a quarter of a cell off the centres, the position unbiased to a hundredth of a cell (${b.m.toExponential(1)} cells)`, Math.abs(b.m) < 0.01, JSON.stringify(b));
  check(`a lone spot split or lost in at most 1 % of the repeats (${extra} of 300)`, extra <= 3, extra); }

console.log("Spots: splitting");
{ const X = grid(32, 0, 0.1), Y = grid(32, 0, 0.1), t = 0.01, rnd = mul(202);
  let el = 0; for (let k = 0; k < 100; k++) { const r = fit(X, Y, scan(X, Y, 1500, [{ x: 1.55, y: 1.6, A: 30000, w1: 0.38, w2: 0.33, th: 30 }], t, rnd), { prom: 8000, noise: "rate", t, shape: "round" }); if (r.spots.filter((q) => q.x != null).length > 1) el++; }
  check(`an elliptical spot (axes 1.15 : 1) fitted round is not split, beaten by one elliptical spot (split in ${el} of 100)`, el <= 5, el);
  const pair = [{ x: 1.4, y: 1.6, A: 25000, w: 0.35 }, { x: 1.68, y: 1.6, A: 20000, w: 0.35 }];   // 0.28 apart, 0.8 of the FWHM
  let two = 0, near = 0, far = 0; const n = 100;
  for (let k = 0; k < n; k++) { const z = scan(X, Y, 1500, pair, t, rnd), r = fit(X, Y, z, { prom: 8000, noise: "rate", t }), ok = r.spots.filter((q) => q.x != null);
    if (ok.length === 2) { two++; const [a, b] = ok.slice().sort((p, q) => p.x - q.x); if (Math.abs(a.x - 1.4) < 4 * a.sx + 0.01 && Math.abs(b.x - 1.68) < 4 * b.sx + 0.01) near++; }
    const r1 = fit(X, Y, z, { prom: 8000, noise: "rate", t, split: false }), one = r1.spots.filter((q) => q.x != null);
    if (one.length === 1 && Math.abs(one[0].x - 1.4) > 5 * one[0].sx && Math.abs(one[0].x - 1.68) > 5 * one[0].sx) far++; }
  check(`two spots 0.8 of their FWHM apart, one maximum: found as two in ${two} of ${n}, each within 4 errors of its truth in ${near}`, two >= 90 && near >= 0.9 * two, JSON.stringify({ two, near }));
  check(`fitted as one spot they are a spot between them, more than 5 errors from either (in ${far} of ${n})`, far >= 95, far); }

console.log("Spots: the axes");
{ const X = grid(30, 0, 0.1), Y = grid(30, 0, 0.1), t = 0.01, z = scan(X, Y, 1500, [{ x: 1.03, y: 1.57, A: 30000, w: 0.36 }, { x: 2.2, y: 0.8, A: 20000, w: 0.36 }], t, mul(303)), o = { prom: 8000, noise: "rate", t };
  const r0 = fit(X, Y, z, o), r1 = fit(X.map((v) => v + 1000), Y.map((v) => v - 250), z, o), r2 = fit(X.map((v) => v * 1000), Y.map((v) => v * 1000), z, o);
  let e1 = 0, e2 = 0;
  r0.spots.forEach((s, i) => { const a = r1.spots[i], b = r2.spots[i];
    e1 = Math.max(e1, Math.abs(a.x - 1000 - s.x) / s.sx, Math.abs(a.y + 250 - s.y) / s.sy, Math.abs(a.w - s.w) / s.sw, Math.abs(a.A - s.A) / s.sA, Math.abs(a.sx - s.sx) / s.sx);
    e2 = Math.max(e2, Math.abs(b.x / 1000 - s.x) / s.sx, Math.abs(b.w / 1000 - s.w) / s.sw, Math.abs(b.A - s.A) / s.sA, Math.abs(b.I / 1e6 - s.I) / s.sI, Math.abs(b.sx / 1000 - s.sx) / s.sx); });
  check(`the axes moved by 1000 and −250: every position moved by as much, the rest the same (within ${e1.toExponential(1)} of the errors)`, r1.spots.length === r0.spots.length && e1 < 1e-5, e1);
  check(`the axes in nm, not µm: positions and widths a thousand times, the volume a million, the peak the same (within ${e2.toExponential(1)})`, r2.spots.length === r0.spots.length && e2 < 1e-5, e2); }

console.log("Spots: the NV scan");
{ const F = JSON.parse(readFileSync(join(here, "ref", "fixtures", "spots.json"), "utf8")), m = F.scan, tr = m.truth;
  const s0 = F.cases[0].m, X = matAxis(s0.x, s0.nx), Y = matAxis(s0.y, s0.ny);
  let T = performance.now(); const r = fit(X, Y, s0.z, { prom: 7500, noise: "rate", t: F.scan.t }); T = performance.now() - T;
  const ok = r.spots.filter((q) => q.x != null); let worst = 0;
  const used = new Set(); for (const q of tr) { let best = null, bd = Infinity; ok.forEach((s, i) => { const d = Math.hypot(s.x - q.x, s.y - q.y); if (d < bd && !used.has(i)) { bd = d; best = i; } });
    if (best == null) { worst = Infinity; continue; } used.add(best); const s = ok[best]; worst = Math.max(worst, Math.abs(s.x - q.x) / s.sx, Math.abs(s.y - q.y) / s.sy); }
  check(`the NV scan's 13 emitters (a pair 0.30 µm apart among them) found, ${ok.length} spots, each within ${worst.toFixed(1)} errors of its truth`, ok.length === tr.length && worst < 5, JSON.stringify({ n: ok.length, worst }));
  check(`…in ${T.toFixed(0)} ms (under 4 s)`, T < 4000, T); }

console.log("Spots: refusals");
{ const X = grid(10, 0, 0.1), z = scan(X, X, 100, [{ x: 0.5, y: 0.5, A: 1000, w: 0.3 }], 1, null), ms = (o, zz, XX) => fit(XX || X, XX || X, zz || z, o).fail || "";
  check("the shot noise of a count rate with no pixel time: refused in words", /needs the pixel time/.test(ms({ prom: 10, noise: "rate" })));
  check("shot noise of counts below zero: refused, the scatter said instead", /below zero/.test(ms({ prom: 10, noise: "counts" }, z.map((v, i) => i === 3 ? -5 : v))));
  check("a matrix of two cells by two: refused", /three cells by three/.test(ms({ prom: 10 }, [1, 2, 3, 4], [0, 1])));
  check("a window's radius below a cell: refused", /below a cell's size/.test(ms({ prom: 10, R: 0.05 })));
  const none = fit(X, X, X.flatMap(() => X.map(() => 100)), { prom: 10 });
  check("a flat matrix: no spot, said", none.spots.length === 0 && /No maximum stands out/.test(none.notes.join(" ")), JSON.stringify(none.notes)); }

console.log("Intensities with their noise");
{ const kMeasure = get("kMeasure"), X = grid(24, 0, 0.1), Y = grid(24, 0, 0.1), t = 0.01, s0 = { x: 1.15, y: 1.2, A: 20000, w: 0.35 }, reg = { kind: "oval", x0: 0.75, x1: 1.55, y0: 0.8, y1: 1.6 };
  const mu = scan(X, Y, 2000, [s0], t, null), K0 = kMeasure({ nx: 24, ny: 24, xs: X, ys: Y, x: { a: 0, b: 2.3 }, y: { a: 0, b: 2.3 }, z: mu }, reg, { noise: "rate", t, ring: 0.3 });
  // what the method gives on the noise-free scan (the spot's tails in the ring raise its background: that is the measurement, and
  // Help says to take a region that holds the spot's light)
  const truth = K0.net, rnd = mul(404), pn = [], pb = [];
  for (let k = 0; k < 2000; k++) { const K = kMeasure({ nx: 24, ny: 24, xs: X, ys: Y, x: { a: 0, b: 2.3 }, y: { a: 0, b: 2.3 }, z: scan(X, Y, 2000, [s0], t, rnd) }, reg, { noise: "rate", t, ring: 0.3 }); pn.push((K.net - truth) / K.snet); pb.push((K.bg - K0.bg) / K.sbg); }
  const a = stat(pn), b = stat(pb);
  check(`a spot's sum less its ring's background over 2000 Poisson repeats: its error the spread (pull SD ${a.sd.toFixed(3)}), no bias (${a.m.toFixed(3)})`, a.sd > 0.95 && a.sd < 1.05 && Math.abs(a.m) < 0.08, JSON.stringify(a));
  check(`…the background per cell likewise (pull SD ${b.sd.toFixed(3)}, mean ${b.m.toFixed(3)})`, b.sd > 0.95 && b.sd < 1.05 && Math.abs(b.m) < 0.08, JSON.stringify(b));
  // the ring's scatter, for additive noise (a faint signal on a noisy background, the noise the same for every cell)
  const gs = (rnd) => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }, r2 = mul(505), ps = [];
  const faint = scan(X, Y, 50, [{ x: 1.15, y: 1.2, A: 30, w: 0.35 }], 1, null), tf = kMeasure({ nx: 24, ny: 24, xs: X, ys: Y, x: { a: 0, b: 2.3 }, y: { a: 0, b: 2.3 }, z: faint }, reg, { noise: "scatter", ring: 0.3 }).net;
  for (let k = 0; k < 2000; k++) { const K = kMeasure({ nx: 24, ny: 24, xs: X, ys: Y, x: { a: 0, b: 2.3 }, y: { a: 0, b: 2.3 }, z: faint.map((v) => v + 4 * gs(r2)) }, reg, { noise: "scatter", ring: 0.3 }); ps.push((K.net - tf) / K.snet); }
  const c = stat(ps); check(`the ring's scatter as each cell's noise, additive noise: pull SD ${c.sd.toFixed(3)}, mean ${c.m.toFixed(3)}`, c.sd > 0.93 && c.sd < 1.07 && Math.abs(c.m) < 0.08, JSON.stringify(c));
  const none = kMeasure({ nx: 24, ny: 24, xs: X, ys: Y, x: { a: 0, b: 2.3 }, y: { a: 0, b: 2.3 }, z: mu }, reg, { noise: "scatter" });
  check("no ring and no shot noise: the sums and no errors, said by how", none.ssum == null && none.net == null && none.how === "none" && Math.abs(none.sum - K0.sum) < 1e-9 * K0.sum, JSON.stringify({ ssum: none.ssum, how: none.how }));
  check("a ring too narrow to hold a cell: refused in words", /holds no cell/.test(kMeasure({ nx: 24, ny: 24, xs: X, ys: Y, x: { a: 0, b: 2.3 }, y: { a: 0, b: 2.3 }, z: mu }, { kind: "all" }, { ring: 0.05 }).fail || "")); }

console.log("Profiles across a width, fitted");
{ const kProfile = get("kProfile"), ijProfile = get("ijProfile"), lmFit = get("lmFit"), X = grid(40, 0, 0.1), Y = grid(40, 0, 0.1), t = 0.01, M = (z) => ({ nx: 40, ny: 40, xs: X, ys: Y, x: { a: 0, b: 3.9 }, y: { a: 0, b: 3.9 }, z });
  // the estimator's own target: the same fit of the scan's expected values (each sample is linear in the cells, so its mean is the
  // sample of the mean scan), each repeat's value against it over its error
  const pulls = (mk, o, reps, seed) => { const z0 = mk(null), T = kProfile(M(z0), Object.assign({}, o, { noise: "scatter" })).fit.p, rnd = mul(seed), pl = { d0: [], A: [], B: [], w: [] }, naive = [];
    let bad = 0; for (let k = 0; k < reps; k++) { const r = kProfile(M(mk(rnd)), o); if (!r.fit || !r.fit.conv) { bad++; continue; }
      for (const q of ["d0", "A", "B", "w"]) pl[q].push((r.fit.p[q] - T[q]) / r.fit.e[q]);
      // the same fit with each sample's error alone, as if the samples did not share cells
      const K = [...r.kv.keys()].filter((i) => Number.isFinite(r.kv[i]) && r.ksv[i] > 0), f = o.fit === "peak" ? (x, p) => p[2] + p[1] * Math.exp(-L16 * (x - p[0]) ** 2 / (p[3] * p[3])) : null;
      if (f) { const nf = lmFit(f, K.map((i) => r.d[i]), K.map((i) => r.kv[i]), K.map((i) => 1 / r.ksv[i]), [r.fit.p.d0, r.fit.p.A, r.fit.p.B, r.fit.p.w], [false, false, false, false], { scale: false, tol: 1e-15 }); if (!nf.error) naive.push((nf.params[3] - T.w) / nf.errors[3]); } }
    return { T, pl, bad, naive }; };
  const spot = (rnd) => scan(X, Y, 2000, [{ x: 2.03, y: 1.96, A: 20000, w: 0.4 }], t, rnd);
  { const P = pulls(spot, { x0: 1.1, y0: 1.0, x1: 2.9, y1: 3.0, w: 0.3, noise: "rate", t, fit: "peak" }, 300, 61);
    for (const k of ["d0", "A", "B", "w"]) { const s = stat(P.pl[k]); check(`a peak across a diagonal 0.3 wide, its ${k === "w" ? "FWHM" : k === "d0" ? "centre" : k === "A" ? "height" : "background"} over ${P.pl[k].length} Poisson repeats: the spread of its value its error (pull SD ${s.sd.toFixed(3)}), no bias (mean ${s.m.toFixed(3)})`, s.sd > 0.9 && s.sd < 1.1 && Math.abs(s.m) < 0.2, JSON.stringify(s)); }
    const nv = stat(P.naive); console.log(`       (fitted as if the samples shared no cells, the FWHM's pull SD would be ${nv.sd.toFixed(2)}: its error ${((1 - 1 / nv.sd) * 100).toFixed(0)} % too small)`);
    check("every repeat's fit settled", P.bad === 0, P.bad); }
  { const E = (rnd) => { const z = []; for (const y of Y) for (const x of X) { const u = (x - 2 - 0.2 * (y - 2)) / 0.12, m = 50 + 400 * 0.5 * get("erfcFn")(-u * Math.SQRT1_2); z.push(rnd ? pois(m, rnd) : m); } return z; };
    const P = pulls(E, { x0: 0.8, y0: 1.3, x1: 3.2, y1: 2.6, w: 0.5, noise: "counts", fit: "edge" }, 300, 62);
    for (const k of ["d0", "A", "B", "w"]) { const s = stat(P.pl[k]); check(`an edge in counts across an oblique line 0.5 wide, its ${k === "w" ? "10–90 % width" : k === "d0" ? "centre" : k === "A" ? "step" : "level before"} over ${P.pl[k].length} repeats: pull SD ${s.sd.toFixed(3)}, mean ${s.m.toFixed(3)}`, s.sd > 0.9 && s.sd < 1.1 && Math.abs(s.m) < 0.2, JSON.stringify(s)); } }
  { const rnd0 = mul(63), G = (rnd) => scan(X, Y, 2000, [{ x: 1.97, y: 2.02, A: 20000, w: 0.4 }], 1, null).map((v) => rnd ? v + 400 * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()) : v);
    const P = pulls(G, { x0: 1.0, y0: 2.9, x1: 3.0, y1: 1.1, w: 0.4, noise: "scatter", fit: "peak" }, 300, 64);
    for (const k of ["d0", "w"]) { const s = stat(P.pl[k]); check(`from the scatter (Gaussian noise added), its ${k === "w" ? "FWHM" : "centre"} over ${P.pl[k].length} repeats: pull SD ${s.sd.toFixed(3)} (a t of about 20 degrees of freedom), mean ${s.m.toFixed(3)}`, s.sd > 0.9 && s.sd < 1.15 && Math.abs(s.m) < 0.2, JSON.stringify(s)); } }
  { const z = spot(mul(65)), a = ijProfile(M(z), { x0: 1.1, y0: 1.0, x1: 2.9, y1: 3.0 }), b = kProfile(M(z), { x0: 1.1, y0: 1.0, x1: 2.9, y1: 3.0, noise: "rate", t });
    check("a width of a pixel: ImageJ's samples themselves", b.m === 1 && a.v.every((v, i) => v === b.kv[i]));
    const c = kProfile(M(z), { x0: 0.0, y0: 2.0, x1: 3.9, y1: 2.0, noise: "rate", t }), i0 = 20;
    check("along a row of cells' centres, a pixel wide: each sample one cell, its error √(v t)/t", Math.abs(c.ksv[i0] - Math.sqrt(c.kv[i0] * t) / t) < 1e-12 * c.ksv[i0]); }
  { const z = spot(mul(66)), o = { x0: 1.1, y0: 1.0, x1: 2.9, y1: 3.0 };
    check("a width of 0 refused in words", /width is a distance above 0/.test(kProfile(M(z), Object.assign({ w: 0 }, o)).fail || ""));
    check("a rate without its pixel time refused", /pixel time/.test(kProfile(M(z), Object.assign({ noise: "rate" }, o)).fail || ""));
    check("a count below zero with shot noise refused", /below zero/.test(kProfile(M(z.map((v, i) => i === 5 ? -1 : v)), Object.assign({ noise: "counts" }, o)).fail || ""));
    check("a fit of fewer than six samples refused in words", /six samples/.test(kProfile(M(z), { x0: 1.0, y0: 1.0, x1: 1.4, y1: 1.0, noise: "rate", t, fit: "peak" }).fitFail || ""));
    check("a band past the matrix's edge: those samples empty, said", (() => { const r = kProfile(M(z), { x0: 0.0, y0: 0.05, x1: 3.9, y1: 0.05, w: 0.5, noise: "rate", t }); return r.notes.some((n) => /past the matrix/.test(n)) && r.kv.every((v) => Number.isNaN(v)); })());
    const t0 = performance.now(); for (let k = 0; k < 50; k++) kProfile(M(z), Object.assign({ w: 0.5, noise: "rate", t, fit: "peak" }, o)); const ms = (performance.now() - t0) / 50;
    check(`a fit of a profile 0.5 wide in ${ms.toFixed(1)} ms (under 50)`, ms < 50, ms); } }

console.log("The shift between two scans");
{ const regShift = get("regShift"), shiftFit = get("shiftFit"), shiftMat = get("shiftMat"), anaRunKind = get("anaRunKind");
  const field = (nx, ny, k) => { const r = mul(k), out = []; for (let i = 0; i < 10; i++) out.push({ x: 5 + r() * (nx - 10), y: 5 + r() * (ny - 10), A: 5000 + 20000 * r(), w: 2.5 + r() }); return out; };
  const F = field(48, 36, 5), img = (s, t, rnd, nx = 48, ny = 36, fs = F, noise) => { const z = []; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { let m = 2000;
      for (const q of fs) m += q.A * Math.exp(-L16 * ((x - q.x - s[0]) ** 2 + (y - q.y - s[1]) ** 2) / q.w ** 2);
      z.push(noise ? m + noise * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()) : rnd ? pois(m * t, rnd) / t : m); } return { nx, ny, z }; };
  // (a spot that leaves the scan pulls it: moved by 3.91 cells, one 1.5 cells from the edge put the shift 0.011 short, so these keep inside)
  { let worst = 0; for (const s of [[0.37, -1.23], [-2.84, 0.61], [0.004, 0.0], [1.5, 1.5], [-0.25, 2.33]]) { const r = regShift(img([0, 0]), img(s), { up: 100 }); worst = Math.max(worst, Math.abs(r.sx - s[0]), Math.abs(r.sy - s[1])); }
    check(`known shifts of noise-free scans found to within half the step of a hundredth of a cell (worst ${worst.toFixed(4)})`, worst <= 0.0050001, worst);
    const r = regShift(img([0, 0]), img([0.004, -0.0007]), { up: 1000 }); check(`…and to a thousandth with that step: (0.004, −0.0007) found as (${r.sx.toFixed(4)}, ${r.sy.toFixed(4)})`, Math.abs(r.sx - 0.004) <= 0.0005 && Math.abs(r.sy + 0.0007) <= 0.0005, JSON.stringify(r)); }
  { const t = 0.01, rnd = mul(71), px = [], py = [], tm = performance.now(); let n = 0;
    for (let k = 0; k < 150; k++) { const q = shiftFit(img([0, 0], t, rnd), img([0.37, -1.23], t, rnd), { up: 100, noise: "rate", t, seed: k + 1 }); if (q.ssx == null) continue; n++; px.push((q.sx - 0.37) / q.ssx); py.push((q.sy + 1.23) / q.ssy); }
    const sx = stat(px), sy = stat(py), ms = (performance.now() - tm) / 150;
    check(`shot noise over ${n} Poisson repeats: each shift's error the spread of its value (pull SD ${sx.sd.toFixed(3)} in X, ${sy.sd.toFixed(3)} in Y), no bias (${sx.m.toFixed(3)}, ${sy.m.toFixed(3)})`, [sx, sy].every((q) => q.sd > 0.85 && q.sd < 1.15 && Math.abs(q.m) < 0.2), JSON.stringify([sx, sy]));
    check(`a 36 × 48 shift with its error in ${ms.toFixed(0)} ms (under 600)`, ms < 600, ms); }
  { const rnd = mul(72), px = [], py = [];
    for (let k = 0; k < 100; k++) { const q = shiftFit(img([0, 0], 1, rnd, 48, 36, F, 300), img([-0.62, 0.41], 1, rnd, 48, 36, F, 300), { up: 100, noise: "scatter", seed: k + 1 }); px.push((q.sx + 0.62) / q.ssx); py.push((q.sy - 0.41) / q.ssy); }
    const sx = stat(px), sy = stat(py);
    check(`from the scatter (Gaussian noise, one figure each scan by Immerkær's estimate) over 100 repeats: pull SD ${sx.sd.toFixed(3)}, ${sy.sd.toFixed(3)}, mean ${sx.m.toFixed(3)}, ${sy.m.toFixed(3)}`, [sx, sy].every((q) => q.sd > 0.85 && q.sd < 1.15 && Math.abs(q.m) < 0.25), JSON.stringify([sx, sy])); }
  { const t = 0.005, rnd = mul(73), cc = [], ph = [];
    for (let k = 0; k < 100; k++) { const A = img([0, 0], t, rnd), B = img([0.37, -1.23], t, rnd); cc.push(regShift(A, B, { up: 100 }).sx - 0.37); ph.push(regShift(A, B, { up: 100, norm: "phase" }).sx - 0.37); }
    const c = stat(cc), p2 = stat(ph);
    check(`with few counts the cross-correlation spreads less than the phase correlation (${c.sd.toFixed(4)} against ${p2.sd.toFixed(4)} cells)`, c.sd < p2.sd, JSON.stringify([c, p2])); }
  { const A = img([0, 0]), B = img([0.37, -1.23]), r = regShift(A, B, { up: 100 }), zm = shiftMat(B, r.sx, r.sy); let e0 = 0, e1 = 0, n = 0;
    for (let i = 0; i < A.z.length; i++) if (zm[i] != null) { e0 += (B.z[i] - A.z[i]) ** 2; e1 += (zm[i] - A.z[i]) ** 2; n++; }
    check(`the second moved onto the first: what is left of their difference ${(100 * Math.sqrt(e1 / e0)).toFixed(1)} % of it (bilinear), cells past its edge empty`, e1 < 0.05 * e0 && zm.some((v) => v == null), [e1 / e0]); }
  { const mk = (z, x0) => ({ id: "m", name: "M", mat: { nx: 48, ny: 36, xs: [...Array(48).keys()].map((i) => x0 + i * 0.1), ys: [...Array(36).keys()].map((i) => 5 + i * 0.1), z, xunit: "µm", yunit: "µm" } });
    const A = img([0, 0]).z, B = img([0.37, -1.23]).z, run = (a, b, p) => anaRunKind("shift", [Object.assign(a, { which: 1 }), Object.assign(b, { which: 2 })], Object.assign({ up: 100, noise: "scatter" }, p));
    const r = run(mk(A, 1), mk(B, 1), {}), col = (k) => r.tables[0].cols.find((c) => c.k === k).vals[0];
    check("the kind: the shift in µm the shift in cells times the cell, its error likewise", Math.abs(col("dx") - 0.037) < 1e-9 && Math.abs(col("dy") + 0.123) < 1e-9 && Math.abs(col("sdx") - col("ssx") * 0.1) < 1e-15, JSON.stringify([col("dx"), col("dy")]));
    const r2 = run(mk(A, 1), mk(B, 1.5), {}), dx2 = r2.tables[0].cols.find((c) => c.k === "dx").vals[0];
    check("grids starting half a µm apart: the shift in µm counts the offset, said", Math.abs(dx2 - 0.537) < 1e-9 && r2.notes.some((n) => /start at different places/.test(n)), dx2);
    const bad = mk(B, 1); bad.mat.xs = bad.mat.xs.map((v, i) => v + (i === 7 ? 0.03 : 0));
    check("uneven X refused in words", /not evenly spaced/.test(run(mk(A, 1), bad, {}).fail || ""));
    const st = mk(B, 1); st.mat.xs = st.mat.xs.map((v) => v * 1.01);
    check("cells of another size refused in words", /not the same size, so they are not scans of one grid/.test(run(mk(A, 1), st, {}).fail || ""));
    check("matrices of different sizes refused", /not the same size/.test(regShift(img([0, 0]), img([0, 0], 0, null, 40, 36)).fail || ""));
    check("a flat matrix refused", /same value everywhere/.test(regShift({ nx: 8, ny: 8, z: Array(64).fill(3) }, { nx: 8, ny: 8, z: Array(64).fill(5) }).fail || ""));
    check("a rate's shot noise without the pixel time refused", /pixel time/.test(shiftFit(img([0, 0]), img([1, 0]), { noise: "rate" }).fail || "")); } }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
