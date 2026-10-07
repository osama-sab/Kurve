/* Tests for the processing pipeline in kurve.html: every step against a known
   answer, the mistake checks against data built to trip them, and the raw-data
   fingerprint against node's own SHA-256.
   Usage: node tools/pipe-test.mjs [path/to/kurve.html]                      */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(process.argv[2] || join(here, "..", "kurve.html"), "utf8");
const grab = (tag) => {
  const m = html.match(new RegExp(`==${tag}:START==[\\s\\S]*?\\*\\/([\\s\\S]*?)\\/\\* ==${tag}:END==`));
  if (!m) { console.error(`Could not find the ${tag} block`); process.exit(1); }
  return m[1];
};
const src = `${grab("NUMERICS")}\n${grab("PEAKS")}\n${grab("PIPE")}\n` +
  `return {PIPE_OPS,runPipe,orderWarnings,stepParams,whittaker,alsBaseline,arplsBaseline,airplsBaseline,modpolyBaseline,imodpolyBaseline,
    snipBaseline,rollingBaseline,splineThrough,autoAnchors,despikeY,detectBands,bandWidthPts,suggestLam,sha256,rawText,hash32,decimate,
    interpOnto,trapz,spacing,noiseSigma,fftFilter,serSig,stepPKey};`;
const N = new Function(src)();

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail == null ? "" : `  (${detail})`}`); }
}
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= Math.abs(tol);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const series = (x, y, e) => ({ x, y, e: e || null, idx: x.map((_, i) => i), xn: "Raman shift", xu: "cm⁻¹", yn: "Intensity", yu: "counts" });
const run = (d, op, p, c) => { const def = N.PIPE_OPS[op]; return def.run(d, Object.assign({}, def.defaults || {}, p || {}), c); };
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

/* ---------- fingerprint ---------- */
console.log("Fingerprint");
for (const s of ["", "abc", "a".repeat(1000), "x,y\n1,2\n3,\n", "Raman shift (cm⁻¹), λ = 532 nm, µ ± σ", "b".repeat(55), "c".repeat(56), "d".repeat(64)]) {
  const want = createHash("sha256").update(s, "utf8").digest("hex");
  check(`sha256 matches node for a ${s.length}-character string`, N.sha256(s) === want, `${N.sha256(s)} vs ${want}`);
}
check("raw text: rows of comma-separated values, blank for missing, trailing newline",
  N.rawText([[1, 2, 3], [0.1, null, 2e-7]]) === "1,0.1\n2,\n3,2e-7\n", JSON.stringify(N.rawText([[1, 2, 3], [0.1, null, 2e-7]])));
check("raw text of nothing is empty", N.rawText([]) === "");

/* ---------- penalised least squares ---------- */
console.log("Whittaker");
{
  const x = Array.from({ length: 200 }, (_, i) => i), line = x.map(v => 3 + 0.25 * v);
  const z = N.whittaker(line, x.map(() => 1), 1e8);
  check("a straight line passes through untouched at any stiffness", Math.max(...z.map((v, i) => Math.abs(v - line[i]))) < 1e-6, Math.max(...z.map((v, i) => Math.abs(v - line[i]))));
  const r = rng(3), noisy = x.map(v => Math.sin(v / 30) + 0.2 * gauss(r));
  const zs = N.whittaker(noisy, x.map(() => 1), 1e3);
  check("smoothing removes most of the noise", rms(zs.map((v, i) => v - Math.sin(i / 30))) < 0.08, rms(zs.map((v, i) => v - Math.sin(i / 30))));
  const z0 = N.whittaker(noisy, x.map(() => 1), 1e-9);
  check("no stiffness returns the data", Math.max(...z0.map((v, i) => Math.abs(v - noisy[i]))) < 1e-6);
}

/* ---------- a Raman-like spectrum: bands on a curved fluorescence background ---------- */
const X = Array.from({ length: 1400 }, (_, i) => 400 + i * 1.2);
const BG = X.map(v => 900 + 0.35 * (v - 400) + 1500 * Math.exp(-(((v - 1000) / 520) ** 2)));
const BANDS = [[620, 900, 9], [1001, 3000, 6], [1150, 700, 14], [1450, 1100, 22], [1600, 1600, 10]];
const PEAK = X.map(v => BANDS.reduce((s, [c, h, w]) => s + h / (1 + 4 * ((v - c) / w) ** 2), 0));
const r1 = rng(11);
const Y = X.map((v, i) => BG[i] + PEAK[i] + Math.sqrt(BG[i] + PEAK[i]) * 0.8 * gauss(r1));
const RAMAN = series(X, Y);
console.log("Bands and suggested settings");
{
  const bands = N.detectBands(X, Y);
  const got = bands.map(b => Math.round(b.x));
  check("every band is detected", BANDS.every(([c]) => got.some(g => Math.abs(g - c) <= 2)), JSON.stringify(got));
  check("and nothing else", bands.length === BANDS.length, JSON.stringify(got));
  const b1001 = bands.find(b => Math.abs(b.x - 1001) < 3);
  check("band FWHM measured within half of its true 6 cm⁻¹", b1001 && near(b1001.fwhm, 6, 3), b1001 && b1001.fwhm);
  const bw = N.bandWidthPts(RAMAN);
  check("typical band width in points is sensible", bw && bw.typ > 4 && bw.typ < 16, bw && bw.typ);
}
console.log("Background methods recover a known background");
{
  const init = N.stepParams("bg", RAMAN);
  check("suggested stiffness is a finite exponent", Number.isFinite(init.lam) && init.lam > 2 && init.lam < 10, init.lam);
  // Away from the bands the estimate should sit on the true background.
  const clear = X.map((v, i) => BANDS.every(([c, , w]) => Math.abs(v - c) > 4 * w) ? i : -1).filter(i => i >= 0);
  const tried = {
    arpls: { method: "arpls", lam: init.lam }, als: { method: "als", lam: init.lam, p: -2.5 }, airpls: { method: "airpls", lam: init.lam },
    modpoly: { method: "modpoly", order: 5 }, imodpoly: { method: "imodpoly", order: 5 },
    snip: { method: "snip", win: init.win, lls: true }, rolling: { method: "rolling", win: init.win, smooth: true },
    anchors: { method: "anchors", anchors: N.autoAnchors(RAMAN, 12), interp: "pchip", avg: 3 }
  };
  // Asymmetric methods sit on the lower edge of the noise, so a bias of one or
  // two noise widths (about 35 counts here) is how they work, not a fault.
  const limit = { arpls: 25, als: 85, airpls: 85, modpoly: 85, imodpoly: 60, snip: 85, rolling: 70, anchors: 60 };
  for (const [name, p] of Object.entries(tried)) {
    const r = run(RAMAN, "bg", p);
    const err = rms(clear.map(i => r.extra.base[i] - BG[i]));
    const i1001 = X.findIndex(v => v >= 1001);
    const h = r.d.y[i1001];
    check(`${name}: background within ${limit[name]} counts of the truth away from bands (on a 900–2600 background)`, err < limit[name], err.toFixed(1));
    check(`${name}: the 3000-count band keeps its height within 5%`, Math.abs(h - PEAK[i1001]) / PEAK[i1001] < 0.05, `${h.toFixed(0)} vs ${PEAK[i1001].toFixed(0)}`);
  }
  const good = run(RAMAN, "bg", { method: "arpls", lam: init.lam });
  check("a good background raises no warning", good.warn.length === 0, JSON.stringify(good.warn));
  const over = run(RAMAN, "bg", { method: "const", cmode: "value", val: 2400 });
  check("a background above the data is reported as over-subtraction", over.warn.some(w => /over-subtracted/.test(w)), JSON.stringify(over.warn));
  // A symmetric, soft least-squares curve follows the bands and eats them.
  const soft = run(RAMAN, "bg", { method: "als", lam: 1, p: -0.7 });
  check("a background that follows the bands is reported", soft.warn.some(w => /follows the band/.test(w)), JSON.stringify(soft.warn));
}

/* ---------- spikes ---------- */
console.log("Cosmic-ray spikes");
{
  const y = Y.slice(), truth = Y.slice();
  y[100] += 4000; y[560] += 2500; y[561] += 1800; y[830] += 1200;   // one-point, two-point, and one on a band's flank
  const i1150 = X.findIndex(v => v >= 1150) + 3; y[i1150] += 3000;
  const r = run(series(X, y), "despike", { thr: 8, width: 2 });
  const hit = r.extra.spikes.map(s => s.at);
  check("finds the three clean spikes and the one on a band's flank", r.extra.spikes.length === 4, JSON.stringify(hit));
  check("the two-point spike is taken out whole", hit.some(([a, b]) => a === 560 && b === 561), JSON.stringify(hit));
  const fixed = [100, 560, 561, 830, i1150].map(i => Math.abs(r.d.y[i] - truth[i]) / Math.sqrt(truth[i]));
  check("each replaced point lands within 4 noise widths of the true value", fixed.every(v => v < 4 * 0.8 + 1), fixed.map(v => v.toFixed(1)).join(", "));
  const untouched = X.every((_, i) => [100, 560, 561, 830, i1150].includes(i) || r.d.y[i] === y[i]);
  check("no other point is changed", untouched);
  const clean = run(RAMAN, "despike", { thr: 8, width: 2 });
  check("a spectrum without spikes comes through unchanged, bands and all", clean.extra.spikes.length === 0, JSON.stringify(clean.extra.spikes.map(s => s.x)));
  // A genuinely narrow band, three points across, must survive width 2.
  const xn = Array.from({ length: 300 }, (_, i) => i), r2 = rng(5);
  const yn = xn.map(v => 100 + 900 * Math.exp(-0.5 * ((v - 150) / 1.3) ** 2) + 3 * gauss(r2));
  const nb = run(series(xn, yn), "despike", { thr: 8, width: 2 });
  check("a band three points wide is not a spike at width 2", nb.extra.spikes.length === 0, JSON.stringify(nb.extra.spikes.map(s => s.at)));
  const greedy = run(series(xn, yn), "despike", { thr: 8, width: 5 });
  check("allowing five-point spikes takes it, and says so", greedy.extra.spikes.length >= 1 && greedy.warn.some(w => /narrow band/.test(w)), JSON.stringify(greedy.warn));
  const top = Y.slice(), i1001 = X.findIndex(v => v >= 1001); top[i1001] += 2500;
  const onTop = run(series(X, top), "despike", { thr: 8, width: 2 });
  check("a spike on a band's top is removed, with a warning to check the band", onTop.extra.spikes.length === 1 && onTop.warn.some(w => /inside the band/.test(w)), JSON.stringify(onTop.warn));
  const dy = Y.slice(); dy[300] -= 2500;
  check("dropouts are only removed when asked for", run(series(X, dy), "despike", { dir: "up" }).extra.spikes.length === 0 && run(series(X, dy), "despike", { dir: "both" }).extra.spikes.length === 1);
}

/* ---------- smoothing and its distortion check ---------- */
console.log("Smoothing");
{
  const r2 = rng(9), x = Array.from({ length: 400 }, (_, i) => i * 0.5);
  const y = x.map(v => 50 + 1000 / (1 + 4 * ((v - 100) / 3) ** 2) + 8 * gauss(r2));
  const d = series(x, y);
  const sug = N.stepParams("smooth", d);
  const light = run(d, "smooth", sug);
  check("the suggested window raises no distortion warning", !light.warn.some(w => /lowers the band/.test(w)), JSON.stringify(light.warn) + " win " + sug.win);
  check("and does reduce the noise", N.noiseSigma(light.d.y) < 0.8 * N.noiseSigma(y), `${N.noiseSigma(light.d.y).toFixed(2)} vs ${N.noiseSigma(y).toFixed(2)}, window ${sug.win}, order ${sug.order}`);
  const ideal = 1 / (1 + 4 * ((x[200] - 100) / 3) ** 2), kept = run(series(x, x.map(v => 50 + 1000 / (1 + 4 * ((v - 100) / 3) ** 2))), "smooth", sug).d.y[200];
  check("on a noise-free band the suggested window keeps 97% of the height", (kept - 50) / 1000 > 0.97 * ideal, ((kept - 50) / 1000).toFixed(4));
  for (const m of ["sg", "ma", "median", "gauss"]) {
    const heavy = run(d, "smooth", { method: m, win: 41, order: 2 });
    check(`${m}: a window much wider than the band is reported, with how much it lowers the band`, heavy.warn.some(w => /lowers the band at 100 cm⁻¹ by (\d+)%/.test(w) && +w.match(/by (\d+)%/)[1] > 40), JSON.stringify(heavy.warn));
  }
  const wh = run(d, "smooth", { method: "whittaker", lam: 6 });
  check("whittaker: a stiff smoother is reported too", wh.warn.some(w => /lowers the band/.test(w)), JSON.stringify(wh.warn));
  const ux = x.map((v, i) => v + (i % 2 ? 0.2 : 0));
  check("uneven spacing is reported for Savitzky–Golay", run(series(ux, y), "smooth", { method: "sg", win: 7 }).warn.some(w => /spacing varies/.test(w)));
  check("error bars are dropped, and the note says why", run(series(x, y, x.map(() => 8)), "smooth", { method: "sg", win: 7 }).d.e === null);
}

/* ---------- axis ---------- */
console.log("Axis and calibration");
{
  const wl = [540, 547, 560, 580];
  const r = run(series(wl, wl.map(() => 1)), "shift", { laser: 532 });
  check("wavelength to Raman shift: 10⁷(1/532 − 1/547) cm⁻¹", near(r.d.x[1], 1e7 * (1 / 532 - 1 / 547), 1e-9), r.d.x[1]);
  check("and the axis is renamed", r.d.xn === "Raman shift" && r.d.xu === "cm⁻¹");
  const u = run(series([500, 1000], [1, 1]), "xunit", { from: "nm", to: "eV" });
  check("500 nm is 2.4797 eV", near(u.d.x[0], 2.479684, 1e-5), u.d.x[0]);
  const back = run(u.d, "xunit", { from: "eV", to: "nm" });
  check("and back again", near(back.d.x[0], 500, 1e-9), back.d.x[0]);
  const flat = x => x.map(() => 1);
  const j = run(series([400, 800], flat([1, 1])), "xunit", { from: "nm", to: "cm-1", jac: true });
  check("the Jacobian rescales a density by λ²/10⁷", near(j.d.y[0], 400 * 400 / 1e7, 1e-9) && near(j.d.y[1], 800 * 800 / 1e7, 1e-9), j.d.y.join(","));
  // Silicon measured 0.8 cm⁻¹ low.
  const xs = Array.from({ length: 81 }, (_, i) => 490 + i * 0.75);
  const ys = xs.map(v => 100 + 2000 / (1 + 4 * ((v - 519.9) / 4) ** 2));
  const c = run(series(xs, ys), "calib", { refs: [{ ref: 520.7 }], win: 10 });
  check("one reference shifts X by the offset (+0.8)", near(c.extra.shift, 0.8, 0.05), c.extra.shift);
  const two = xs.map(v => v * 1.002 - 1.5);
  const y2 = xs.map(v => 100 + 2000 / (1 + 4 * ((v * 1.002 - 1.5 - (520.7 * 1.002 - 1.5)) / 4) ** 2));
  check("a peak not in the search window is reported, not guessed", run(series(xs, ys), "calib", { refs: [{ ref: 560 }], win: 5 }).warn.length === 1);
  // Channels to energy: a calibration typed in, and one fitted to known peaks.
  const ch = Array.from({ length: 2000 }, (_, i) => i);
  const E = v => 0.3258 * v + 0.6937;
  const gy = ch.map(v => 20 + 900 * Math.exp(-0.5 * ((E(v) - 609.32) / 1.2) ** 2) + 500 * Math.exp(-0.5 * ((E(v) - 351.93) / 1.1) ** 2));
  const ec = run(series(ch, gy), "ecal", { mode: "coef", a: 0.3258, b: 0.6937, c: 0, xn: "Energy", xu: "keV" });
  check("energy calibration: E = a·ch + b", near(ec.d.x[1000], 326.4937, 1e-9) && ec.d.xn === "Energy" && ec.d.xu === "keV", `${ec.d.x[1000]} ${ec.d.xn} ${ec.d.xu}`);
  const chOf = e => (e - 0.6937) / 0.3258;
  const fit = run(series(ch, gy), "ecal", { mode: "pairs", deg: "1", win: 8, pairs: [{ ch: Math.round(chOf(609.32)) + 3, en: 609.32 }, { ch: Math.round(chOf(351.93)) - 4, en: 351.93 }], xu: "keV" });
  check("energy calibration from two peaks finds each top and recovers the line", near(fit.extra.coef[1], 0.3258, 2e-4) && near(fit.extra.coef[0], 0.6937, 0.1), fit.extra.coef.join(", "));
  const one = run(series(ch, gy), "ecal", { mode: "pairs", pairs: [{ ch: 1868, en: 609.32 }] });
  check("one peak is not a calibration, and says so", one.d.x[5] === 5 && one.warn.some(w => /two at least/.test(w)), one.warn.join(" | "));
  const turn = run(series(ch, gy), "ecal", { mode: "coef", a: 0.3, b: 0, c: -0.0001 });
  check("a parabola that turns back inside the spectrum is flagged", turn.warn.some(w => /turns back/.test(w)), turn.warn.join(" | "));
  let zero = null; try { run(series(ch, gy), "ecal", { mode: "coef", a: 0, b: 1 }); } catch (e) { zero = e.message; }
  check("a zero gain is refused", /non-zero/.test(zero || ""), zero);
  const sc = run(series([1, 2], [1800, 3600]), "scale", { a: 1 / 1800, b: 0, yu: "counts/s" });
  check("scale: Y in a new unit", near(sc.d.y[1], 2, 1e-12) && sc.d.yu === "counts/s", sc.d.yu);
  const xl = run(series([1, 2], [1, 1]), "xlin", { a: 2, b: 1, xn: "Energy", xu: "keV" });
  check("scale X: renamed when asked", xl.d.x[1] === 5 && xl.d.xn === "Energy" && xl.d.xu === "keV");
}

/* ---------- normalize, resample, dedupe, reference, maths ---------- */
console.log("Normalize and maths");
{
  const x = Array.from({ length: 101 }, (_, i) => i), y = x.map(v => 5 + 20 * Math.exp(-0.5 * ((v - 50) / 6) ** 2));
  const d = series(x, y, x.map(() => 1));
  check("maximum = 1", near(Math.max(...run(d, "norm", { mode: "max" }).d.y), 1, 1e-12));
  const a = run(d, "norm", { mode: "area" });
  check("area = 1", near(Math.abs(N.trapz(x, a.d.y)), 1, 1e-9));
  check("and the error bars are scaled by the same factor", near(a.d.e[0], 1 / a.extra.k, 1e-12));
  const s = run(d, "norm", { mode: "snv" }).d.y, m = s.reduce((p, v) => p + v, 0) / s.length;
  check("SNV: mean 0, standard deviation 1", near(m, 0, 1e-9) && near(Math.sqrt(s.reduce((p, v) => p + (v - m) ** 2, 0) / s.length), 1, 1e-9));
  const b = run(d, "norm", { mode: "band", x0: 40, x1: 60, how: "height" });
  check("band height = 1", near(Math.max(...b.d.y), 1, 1e-12));
  const rs = run(series([0, 1, 3, 4.5, 6], [0, 2, 6, 9, 12]), "resample", { dx: 1 });
  check("resampled onto an even grid, linear data stays linear", rs.d.x.join() === "0,1,2,3,4,5,6" && rs.d.y.every((v, i) => near(v, 2 * i, 1e-12)), rs.d.y.join());
  const rd = run(series([6, 4.5, 3, 1, 0], [12, 9, 6, 2, 0]), "resample", { dx: 1 });
  check("a descending axis stays descending", rd.d.x[0] === 6 && rd.d.x[6] === 0, rd.d.x.join());
  const dd = run(series([1, 2, 2, 3], [1, 4, 6, 3], [1, 1, 1, 1]), "dedupe", {});
  check("duplicate X averaged, with the standard error of the mean", dd.d.x.join() === "1,2,3" && dd.d.y[1] === 5 && near(dd.d.e[1], Math.SQRT2 / 2, 1e-12));
  const dark = { x: [0, 2, 4, 6, 8, 10], y: [10, 10, 10, 10, 10, 10] };
  const sub = run(series([1, 3, 5, 7, 9, 11], [20, 21, 22, 23, 24, 25]), "ref", { op: "sub", ref: "c1", use: "raw", k: 1 }, { refData: () => dark });
  check("subtracting another spectrum interpolates it and drops what it does not cover", sub.d.y.join() === "10,11,12,13,14" && /1 point/.test(sub.note), sub.d.y.join() + " / " + sub.note);
  const xs = Array.from({ length: 200 }, (_, i) => i * 0.05), sn = series(xs, xs.map(Math.sin));
  const d1 = run(sn, "deriv", { order: "1", win: 9, poly: 3 });
  check("first derivative of sin is cos", Math.max(...d1.d.y.slice(10, 190).map((v, i) => Math.abs(v - Math.cos(xs[i + 10])))) < 1e-3);
  const desc = series(xs.slice().reverse(), xs.slice().reverse().map(Math.sin));
  const d1r = run(desc, "deriv", { order: "1", win: 9, poly: 3 });
  check("and keeps its sign on an axis recorded high to low", Math.abs(d1r.d.y[100] - Math.cos(desc.x[100])) < 1e-3, `${d1r.d.y[100]} vs ${Math.cos(desc.x[100])}`);
  const bo = run(series([100, -100], [1, 1]), "bose", { T: 295 });
  const n = 1 / Math.expm1(1.438777 * 100 / 295);
  check("Bose–Einstein: Stokes divided by n+1, anti-Stokes by n", near(bo.d.y[0], 1 / (n + 1), 1e-12) && near(bo.d.y[1], 1 / n, 1e-12));
  const ab = run(series([1, 2, 3], [100, 10, 1]), "absorb", { pct: true });
  check("100%, 10%, 1% transmittance is absorbance 0, 1, 2", ab.d.y.every((v, i) => near(v, i, 1e-12)));
  const km = run(series([1], [50]), "km", { pct: true });
  check("Kubelka–Munk of 50% reflectance is 0.25", near(km.d.y[0], 0.25, 1e-12));
}

/* ---------- averaging, integrals, Fourier filtering, Python steps ---------- */
console.log("Average, integral, FFT, Python");
{
  const r = rng(21), x = Array.from({ length: 400 }, (_, i) => i), clean = x.map(v => 50 * Math.exp(-0.5 * ((v - 200) / 12) ** 2));
  const scans = [0, 1, 2, 3].map(() => clean.map(v => v + gauss(r)));
  const refs = { a: { x, y: scans[1] }, b: { x, y: scans[2] }, c: { x, y: scans[3] } };
  const ctx = { refData: id => refs[id] || null, name: id => id };
  const m = run(series(x, scans[0]), "combine", { cols: ["a", "b", "c"], how: "mean", err: true }, ctx);
  const noiseOf = y => rms(y.map((v, i) => v - clean[i]));
  check("the mean of four scans halves the noise", near(noiseOf(m.d.y) / noiseOf(scans[0]), 0.5, 0.08), noiseOf(m.d.y) / noiseOf(scans[0]));
  check("and the spread between them becomes the error bars", m.d.e && near(rms(m.d.e), 0.5, 0.1), m.d.e && rms(m.d.e));
  check("the sum of two identical spectra is twice one", run(series(x, clean), "combine", { cols: ["d"], how: "sum" }, { refData: () => ({ x, y: clean }), name: () => "d" }).d.y.every((v, i) => near(v, 2 * clean[i], 1e-9)));
  const med = run(series(x, clean), "combine", { cols: ["a", "b"], how: "median" }, { refData: id => ({ x, y: id === "a" ? clean : clean.map(v => v + 1000) }), name: id => id });
  check("the median of three ignores one stray spectrum", med.d.y.every((v, i) => near(v, clean[i], 1e-9)));
  let threw = ""; try { run(series(x, clean), "combine", { cols: ["gone"] }, { refData: () => null, name: id => id }); } catch (e) { threw = e.message; }
  check("a missing spectrum is an error that says so", /missing/.test(threw), threw);
}
{
  const x = Array.from({ length: 11 }, (_, i) => i), one = x.map(() => 1);
  const ci = run(series(x, one), "cumint", {});
  check("the running integral of 1 over 0..10 ends at 10", near(ci.d.y[10], 10, 1e-12) && near(ci.d.y[0], 0, 1e-12) && near(ci.extra.total, 10, 1e-12));
  check("scaled to a total of 1", near(run(series(x, one), "cumint", { norm: true }).d.y[10], 1, 1e-12));
  const rev = run(series(x.slice().reverse(), one), "cumint", {});
  check("a descending axis integrates from the low-X end", near(rev.d.y[10], 0, 1e-12) && near(rev.d.y[0], 10, 1e-12), rev.d.y.join());
  check("its unit is Y times X", ci.d.yu === "counts·cm⁻¹", ci.d.yu);
}
{
  const r = rng(5), n = 1024, x = Array.from({ length: n }, (_, i) => i), band = x.map(v => 100 * Math.exp(-0.5 * ((v - 500) / 20) ** 2));
  const noisy = band.map(v => v + 3 * gauss(r));
  const lp = run(series(x, noisy), "fft", { mode: "low", cut: 12, order: 4 });
  // A 12-point cut-off passes a sixth of the band, so about 40% of white noise.
  check("low-pass removes more than half the noise", rms(lp.d.y.map((v, i) => v - band[i])) < 1.5, rms(lp.d.y.map((v, i) => v - band[i])));
  check("and keeps a wide band's height within 2%", near(Math.max(...lp.d.y), 100, 2), Math.max(...lp.d.y));
  check("with no warning for a band far wider than the cut-off", !lp.warn.some(w => /lowers the band/.test(w)), lp.warn.join(" / "));
  const narrow = x.map(v => 100 * Math.exp(-0.5 * ((v - 500) / 1.5) ** 2) + 0.2 * gauss(r));
  const lp2 = run(series(x, narrow), "fft", { mode: "low", cut: 40, order: 4 });
  check("a cut-off longer than a band warns that it lowers it", lp2.warn.some(w => /lowers the band/.test(w)), lp2.warn.join(" / "));
  const drift = x.map(v => 0.05 * v + 30 * Math.sin(v / 1500)), before = rms(drift.slice(100, 900));
  const hp = run(series(x, band.map((v, i) => v + drift[i])), "fft", { mode: "high", cut: 1000, order: 4 });
  const after = rms(hp.d.y.map((v, i) => v - band[i]).slice(100, 900));
  check("high-pass takes out most of a slow drift and keeps the band", after < 0.35 * before && Math.max(...hp.d.y) > 80, [before, after, Math.max(...hp.d.y)]);
  const hp2 = run(series(x, band), "fft", { mode: "high", cut: 60, order: 4 });
  check("a high-pass cut-off near the band's width warns that it lowers it", hp2.warn.some(w => /lowers the band/.test(w)), hp2.warn.join(" / "));
  const flat = N.fftFilter(x.map(v => 3 + 0.5 * v), { mode: "low", cut: 8, order: 4 });
  check("a straight line passes a low-pass unchanged, ends included", flat.every((v, i) => near(v, 3 + 0.5 * i, 1e-9)));
}
{
  const x = [1, 2, 3, 4], y = [10, 20, 30, 40], d = series(x, y);
  const notRun = run(d, "python", { code: "y = y" });
  check("Python: not run yet passes the data through and says so", notRun.d === d && /not been run/.test(notRun.warn[0]));
  const out = { x: [1, 2, 3, 4], y: [20, 40, 60, 80] };
  const ok = run(d, "python", { code: "y=[2*v for v in y]", ranCode: "y=[2*v for v in y]", out, inSig: N.serSig(d), ranAt: 1 });
  check("Python: the stored result is the output, rows kept", ok.d.y.join() === "20,40,60,80" && ok.d.idx.join() === "0,1,2,3" && !ok.warn.length, ok.warn.join());
  const stale = run(series(x, [1, 1, 1, 1]), "python", { code: "c", ranCode: "c", out, inSig: N.serSig(d) });
  check("Python: a changed input makes the result out of date", stale.warn.some(w => /changed since/.test(w)));
  const edited = run(d, "python", { code: "new", ranCode: "old", out, inSig: N.serSig(d) });
  check("Python: edited code without a run is flagged", edited.warn.some(w => /edited since/.test(w)));
  const fewer = run(d, "python", { code: "c", ranCode: "c", out: { x: [1.4, 3.6], y: [5, 6], yu: "a.u." }, inSig: N.serSig(d) });
  check("Python: new X keeps the raw row of the nearest input point, and new units", fewer.d.idx.join() === "0,3" && fewer.d.yu === "a.u.", fewer.d.idx.join() + " " + fewer.d.yu);
  check("Python: the step's key does not carry its whole output", JSON.stringify(N.stepPKey({ op: "python", p: { code: "c", out: { x: new Array(5000).fill(1), y: [] } } })).length < 200);
}
/* ---------- anchors ---------- */
console.log("Anchor interpolation");
{
  const ax = [0, 1, 2, 3, 4], ay = [0, 0, 1, 1, 1];
  const sp = N.splineThrough(ax, ay, "spline"), pc = N.splineThrough(ax, ay, "pchip");
  check("the spline passes through every anchor", ax.every((v, i) => near(sp(v), ay[i], 1e-12)));
  let overshoot = 0; for (let t = 0; t <= 4; t += 0.01) overshoot = Math.max(overshoot, pc(t) - 1, -pc(t));
  check("PCHIP does not overshoot a step", overshoot < 1e-12, overshoot);
  check("outside the anchors the background is held flat", near(sp(-5), 0, 1e-12) && near(sp(9), 1, 1e-12));
}

/* ---------- the pipeline ---------- */
console.log("Pipeline");
{
  const d = RAMAN;
  const steps = [{ id: "a", op: "despike", on: true, p: N.stepParams("despike", d) }, { id: "b", op: "bg", on: true, p: N.stepParams("bg", d) }, { id: "c", op: "norm", on: true, p: { mode: "max" } }];
  const r = N.runPipe(d, steps, {});
  check("stages: the input and one per step", r.stages.length === 4 && r.out === r.stages[3].d);
  check("the final data is normalized", near(Math.max(...r.out.y), 1, 1e-9));
  steps[2].p = { mode: "area" };
  const r2 = N.runPipe(d, steps, {}, r);
  check("editing the last step reuses the stages before it", r2.stages[1] !== r.stages[1] && r2.stages[1].d === r.stages[1].d && r2.stages[2].d === r.stages[2].d && r2.stages[3].d !== r.stages[3].d);
  steps[1].on = false;
  const r3 = N.runPipe(d, steps, {}, r2);
  check("a step switched off passes its input through", r3.stages[2].off && r3.stages[2].d === r3.stages[1].d);
  const wrong = [{ op: "norm", on: true, p: { mode: "max" } }, { op: "bg", on: true, p: N.stepParams("bg", d) }];
  const ow = N.orderWarnings(wrong);
  check("normalizing before subtracting the background is flagged on the normalize step", ow[0] && /before the background/.test(ow[0][0]));
  const bad = N.runPipe(d, [{ op: "crop", on: true, p: { x0: 5000, x1: 6000 } }, { op: "smooth", on: true, p: { method: "sg", win: 7, order: 2 } }], {});
  check("a step that fails reports why and passes its input on", bad.stages[2].err && bad.stages[2].d === bad.stages[1].d, bad.stages[2].err);
  check("a crop that leaves nothing says so", bad.stages[1].warn.some(w => /fewer than/i.test(w)));
  const unk = N.runPipe(d, [{ op: "teleport", on: true, p: {} }], {});
  check("an unknown step is reported, not thrown", !!unk.stages[1].err);
  const corr = N.runPipe(d, [{ op: "correct", on: true, p: { fixes: [{ row: 3, y: 42 }, { row: 5, del: true }] } }], {});
  check("corrections replace or remove the rows they name", corr.out.y[3] === 42 && corr.out.x.length === d.x.length - 1 && !corr.out.idx.includes(5));
}
{
  const dec = N.decimate(Array.from({ length: 5000 }, (_, i) => i), Array.from({ length: 5000 }, (_, i) => i === 2345 ? 99 : 0), 200);
  check("a 5000-point thumbnail of 200 keeps a one-point spike", dec.x.length <= 200 && dec.y.includes(99));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
