/* Wave 5, signal processing and mathematics (ux/spec/SIGNAL_SPEC.md): the properties the references cannot show and
   the budgets. The SIG block and the ones it leans on, cut out of kurve.html as tools/ref/run.mjs does.

   Usage: node tools/sig-test.mjs [kurve.html]

   The values themselves are checked against NumPy, SciPy and PyWavelets by tools/ref-test.mjs (tools/ref/sig_fixtures.py);
   here: Parseval, a closed form at a prime length of a million, a sine's amplitude read back, the analyses run whole
   with their units and refusals, and the times. */
import { loadKurve } from "./ref/run.mjs";

const get = loadKurve(process.argv[2]);
let pass = 0, fail = 0;
const ok = (c, msg, extra) => { if (c) { pass++; console.log(`  ok   ${msg}`); } else { fail++; console.log(`  FAIL ${msg}${extra ? ": " + extra : ""}`); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const time = (f) => { const t = performance.now(); const r = f(); return [r, performance.now() - t]; };
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-300)) * Math.cos(2 * Math.PI * rnd());

const fftC = get("fftC"), fftAny = get("fftAny"), spectrum = get("spectrum"), welch = get("welch"), sigEven = get("sigEven");
const anaRunKind = get("anaRunKind");

console.log("5.1 the transform");
{ // Parseval at lengths of every kind: Σ|x|² = Σ|X|²/N
  for (const n of [1, 2, 3, 17, 64, 100, 1009, 4096, 65537]) {
    const re = Array.from({ length: n }, gauss), im = Array.from({ length: n }, gauss), X = fftC(re, im, n, false);
    let a = 0, b = 0; for (let i = 0; i < n; i++) { a += re[i] ** 2 + im[i] ** 2; b += X.re[i] ** 2 + X.im[i] ** 2; }
    ok(near(a, b / n, 1e-12), `Parseval at n = ${n}`, `${a} against ${b / n}`);
  }
}
{ // a geometric sequence r^j at a prime length of a million: X_k = (1 − rⁿ)/(1 − r·e^(−2πik/n)), r = 0.999999 (rⁿ ≈ e⁻¹)
  const n = 1000003, r = 0.999999, re = new Float64Array(n), im = new Float64Array(n); let v = 1; for (let j = 0; j < n; j++) { re[j] = v; v *= r; }
  const rn = v; const [, ms] = time(() => fftAny(re, im, false));
  let worst = 0, big = 0; const ks = [0, 1, 2, 3, 500, 499999, 500001, 999999, 1000002, 12345, 777777];
  for (const k of ks) { const a = -2 * Math.PI * ((k * 1) % n) / n, dr = 1 - r * Math.cos(a), di = -r * Math.sin(a), d2 = dr * dr + di * di;
    const wr = (1 - rn) * dr / d2, wi = -(1 - rn) * di / d2; big = Math.max(big, Math.hypot(wr, wi)); worst = Math.max(worst, Math.hypot(re[k] - wr, im[k] - wi)); }
  ok(worst / big < 1e-11, `a prime length of 1 000 003 against the closed form (${(worst / big).toExponential(1)} of the largest)`);
  ok(ms < 1500, `…transformed in ${ms.toFixed(0)} ms (budget 0.5 s in the browser; node with no warm-up gets three times)`);
  const back = new Float64Array(re), bim = new Float64Array(im); fftAny(back, bim, true);
  let e = 0; v = 1; for (let j = 0; j < n; j++) { e = Math.max(e, Math.abs(back[j] - v), Math.abs(bim[j])); v *= r; }
  ok(e < 1e-13, `…and back again by the inverse, to ${e.toExponential(1)}`);
}
{ const n = 1 << 20, re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) re[i] = gauss();
  const [, ms] = time(() => fftAny(re, im, false)); ok(ms < 600, `2²⁰ points in ${ms.toFixed(0)} ms`); }
{ // a sine of amplitude 3 at a bin reads 3 in the amplitude, with the rectangle and with Hann; its power A²/2; the density
  // integrating to the mean square (rectangle)
  const n = 1000, fs = 50, f0 = 7.5, y = Array.from({ length: n }, (_, j) => 3 * Math.sin(2 * Math.PI * f0 * j / fs + 0.4) + 0.25);
  for (const win of ["boxcar", "hann", "flattop", "blackmanharris"]) {
    const r = spectrum(y, fs, { win, detrend: "none" }), k = r.f.findIndex((f) => Math.abs(f - f0) < 1e-9);
    ok(near(r.amp[k], 3, 1e-12) && near(r.pow[k], 4.5, 1e-12), `a sine of amplitude 3 reads ${r.amp[k].toFixed(12)} (power ${r.pow[k].toFixed(12)}) with the ${win} window`);
  }
  const r = spectrum(y, fs, { win: "boxcar" }); let s = 0; for (const v of r.psd) s += v * r.df; const ms = y.reduce((a, v) => a + v * v, 0) / n;
  ok(near(s, ms, 1e-12), `the density integrates to the mean square (${s.toFixed(10)} against ${ms.toFixed(10)})`);
  const r2 = spectrum(y, fs, { win: "boxcar", sides: 2, shift: true });
  ok(r2.f[0] === -fs / 2 && r2.f.length === n && r2.amp[r2.f.findIndex((f) => Math.abs(f - f0) < 1e-9)] > 1.49, "two sides, shifted: from −fs/2, half the amplitude at each side");
}
{ // Welch on white noise of variance 4: the one-sided density near 2σ²/fs
  const n = 200000, fs = 10, y = Array.from({ length: n }, () => 2 * gauss());
  const [r, ms] = time(() => welch(y, fs, {})); let m = 0; for (let k = 1; k < r.p.length - 1; k++) m += r.p[k]; m /= r.p.length - 2;
  ok(Math.abs(m / (2 * 4 / fs) - 1) < 0.02, `Welch on white noise: mean density ${m.toFixed(4)} against 2σ²/fs = ${(8 / fs).toFixed(4)}`);
  ok(r.k === Math.floor((n - 128) / 128) && r.nseg === 256 && r.over === 128, `${r.k} segments of 256 overlapping by 128, as SciPy's defaults`);
  const big = Array.from({ length: 1e6 }, () => gauss()), [, ms2] = time(() => welch(big, 1, { nseg: 1024 }));
  ok(ms2 < 900, `Welch of 10⁶ points in ${ms2.toFixed(0)} ms (budget 0.3 s in the browser)`);
  const med = welch(y, fs, { avg: "median" }); let mm = 0; for (let k = 1; k < med.p.length - 1; k++) mm += med.p[k]; mm /= med.p.length - 2;
  ok(Math.abs(mm / m - 1) < 0.03, `the median, divided by its bias, reads the same level (${mm.toFixed(4)})`);
}
{ // the spacing: sorted, resampled, refused
  const e = sigEven([3, 1, 2, 4], [30, 10, 20, 40]);
  ok(!e.fail && e.x.join() === "1,2,3,4" && e.y.join() === "10,20,30,40" && /sorted/.test(e.notes.join(" ")), "X out of order is sorted first, and said");
  const u = sigEven([0, 1, 2.5, 3, 4], [0, 1, 2.5, 3, 4]);
  ok(!u.fail && u.resampled && u.x.join() === "0,1,2,3,4" && Math.abs(u.y[2] - 2) < 1e-15 && /evenly/.test(u.notes.join(" ")), "uneven X read on an even grid by straight lines, and said");
  ok(!sigEven([0, 1, 1, 2], [1, 2, 3, 4]).fail === false && /repeat/.test(sigEven([0, 1, 1, 2], [1, 2, 3, 4]).fail), "a repeated X refused in words");
  ok(/at least 2/.test(sigEven([1], [2]).fail || ""), "one point refused in words");
  const d = sigEven([4, 3, 2, 1], [1, 2, 3, 4]); ok(!d.fail && d.dx === -1 && !d.notes.length, "a falling axis kept as it runs, its step negative");
  ok(/Window|window/.test(spectrum([1, 2, 3], 1, { win: "nonsuch" }).fail || ""), "a window it does not know refused in words");
  ok(/shorter/.test(spectrum([1, 2, 3, 4], 1, { nfft: 3 }).fail || ""), "a length shorter than the data refused in words");
}
console.log("5.1 the analyses");
{ const pts = (x, y) => ({ x, y, e: x.map(() => null), rows: x.map((_, i) => i) });
  const n = 400, t = Array.from({ length: n }, (_, j) => j * 0.01), y = t.map((v) => 2 * Math.cos(2 * Math.PI * 12.5 * v) + 0.5);
  const q = { id: "c1", name: "Signal", ref: "B", unit: "V", xu: "s", pts: pts(t, y) };
  const r = anaRunKind("fft", [q], { outs: ["amp", "pow", "psd", "phase", "re", "im", "db"], win: "boxcar" }), C = Object.fromEntries(r.tables[0].cols.map((c) => [c.k, c]));
  ok(!r.fail && C.f0.unit === "Hz" && C.f0.role === "x" && C.amp0.unit === "V" && C.pow0.unit === "V²" && C.psd0.unit === "V²/Hz" && C.phase0.unit === "rad" && C.db0.unit === "dB",
    "FFT: frequency in Hz for X in s, amplitude in V, power V², density V²/Hz, phase rad, dB");
  const k = C.f0.vals.findIndex((f) => Math.abs(f - 12.5) < 1e-9); ok(near(C.amp0.vals[k], 2, 1e-12) && near(C.amp0.vals[0], 0.5, 1e-12), "…the cosine reads 2 at 12.5 Hz and the offset 0.5 at 0");
  ok(r.report.sections[0].tables[0].rows[0][6] === "12.5 Hz" && /Bluestein|any length/.test(r.report.method) && /A²\/2/.test(r.report.method), "…the report names the largest amplitude's frequency and the normalisation");
  const xs = [...t]; xs[5] += 0.002; const r2 = anaRunKind("fft", [Object.assign({}, q, { pts: pts(xs, y) })], {});
  ok(!r2.fail && /evenly/.test(r2.notes.join(" ")), "…uneven X: resampled, said in the notes");
  ok(/at least 2/.test(anaRunKind("fft", [Object.assign({}, q, { pts: pts([1], [1]) })], {}).fail || ""), "…one point refused in words");
  const unitOf = get("sigRecip"); ok(unitOf("cm⁻¹") === "cm" && unitOf("1/cm") === "cm" && unitOf("ms") === "kHz" && unitOf("m") === "m⁻¹" && unitOf("") === "" && unitOf("m/s") === "1/(m/s)", "the reciprocal units: cm⁻¹ → cm, ms → kHz, m → m⁻¹, m/s → 1/(m/s)");
  // two sides, then back by the inverse
  const r3 = anaRunKind("fft", [q], { outs: ["re", "im"], sides: 2, shift: true }), D = Object.fromEntries(r3.tables[0].cols.map((c) => [c.k, c]));
  const qr = { id: "re", name: "Real part", unit: "V", xu: "Hz", pts: pts(D.f0.vals, D.re0.vals) }, qi = { id: "im", name: "Imaginary part", unit: "V", xu: "Hz", pts: pts(D.f0.vals, D.im0.vals) };
  const b = anaRunKind("ifft", [qr, qi], { re: "re", im: "im", sides: 2 }), B = Object.fromEntries(b.tables[0].cols.map((c) => [c.k, c]));
  ok(!b.fail && B.t.unit === "s" && B.re.vals.every((v, i) => Math.abs(v - y[i]) < 1e-13) && B.im.vals.every((v) => Math.abs(v) < 1e-13) && near(B.t.vals[1], 0.01, 1e-12),
    "inverse: a shifted two-sided transform comes back to the signal, its time step 0.01 s");
  const r4 = anaRunKind("fft", [q], { outs: ["re", "im"], sides: 1 }), E = Object.fromEntries(r4.tables[0].cols.map((c) => [c.k, c]));
  const b1 = anaRunKind("ifft", [{ id: "re", name: "Re", unit: "V", xu: "Hz", pts: pts(E.f0.vals, E.re0.vals) }, { id: "im", name: "Im", unit: "V", xu: "Hz", pts: pts(E.f0.vals, E.im0.vals) }], { re: "re", im: "im", sides: 1 });
  ok(!b1.fail && b1.tables[0].cols[1].vals.length === n && b1.tables[0].cols[1].vals.every((v, i) => Math.abs(v - y[i]) < 1e-13), "inverse of one side (irfft) gives the 400 values back");
  const pw = anaRunKind("psd", [q], { nseg: 100 }); ok(!pw.fail && pw.tables[0].cols[1].unit === "V²/Hz" && pw.report.sections[0].tables[0].rows[0][6] === 7, "Welch: density in V²/Hz, 7 segments of 100 overlapping by 50");
  const bad = anaRunKind("psd", [q], { nseg: 100, over: 100 }); ok(/overlap/.test(bad.fail || bad.notes.join(" ")), "Welch: an overlap as long as the segment refused in words");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
