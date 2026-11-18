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
console.log("5.2 filters designed");
{ const iirDesign = get("iirDesign"), sosFreqz = get("sosFreqz"), sosfiltfilt = get("sosfiltfilt"), sosfilt = get("sosfilt"), iirNotch = get("iirNotch"), filtfilt = get("filtfilt"), firwin = get("firwin"), baFreqz = get("baFreqz");
  const mag = (sos, w) => { const h = sosFreqz(sos, [w])[0]; return 20 * Math.log10(Math.hypot(h[0], h[1])); };
  // each design's magnitude at its edge: −3.0103 dB (Butterworth), −rp (Chebyshev I, elliptic), −rs (Chebyshev II)
  let worst = 0, mono = true;
  for (const N of [1, 2, 3, 5, 8, 13, 20]) for (const w1 of [0.05, 0.3, 0.8]) {
    const B = iirDesign({ kind: "butter", band: "low", order: N, w1 }); worst = Math.max(worst, Math.abs(mag(B.sos, Math.PI * w1) + 10 * Math.log10(2)));
    let prev = Infinity; for (let i = 0; i <= 200; i++) { const m = mag(B.sos, Math.PI * i / 200 * 0.999); if (m > prev + 1e-9) mono = false; prev = m; } }
  ok(worst < 1e-9 && mono, `Butterworth: −3.0103 dB at the edge for orders 1 to 20 (worst ${worst.toExponential(1)} dB), falling all the way`);
  let w2 = 0, rip = 0; for (const N of [2, 3, 6, 9]) { const C = iirDesign({ kind: "cheby1", band: "low", order: N, w1: 0.25, rp: 0.5 });
    w2 = Math.max(w2, Math.abs(mag(C.sos, Math.PI * 0.25) + 0.5)); for (let i = 0; i < 100; i++) { const m = mag(C.sos, Math.PI * 0.25 * i / 100); rip = Math.max(rip, -m - 0.5, m); } }
  ok(w2 < 1e-9 && rip < 1e-9, `Chebyshev I: −0.5 dB at the edge, its pass band within 0 and −0.5 dB (${w2.toExponential(1)})`);
  let w3 = 0, stop = -Infinity; for (const N of [2, 4, 7]) { const C = iirDesign({ kind: "cheby2", band: "low", order: N, w1: 0.25, rs: 50 });
    w3 = Math.max(w3, Math.abs(mag(C.sos, Math.PI * 0.25) + 50)); for (let i = 1; i <= 100; i++) stop = Math.max(stop, mag(C.sos, Math.PI * (0.25 + 0.75 * i / 100) * 0.9999)); }
  ok(w3 < 1e-8 && stop < -50 + 1e-8, `Chebyshev II: −50 dB at the edge and below it beyond (highest ${stop.toFixed(6)} dB)`);
  const E = iirDesign({ kind: "ellip", band: "low", order: 6, w1: 0.2, rp: 0.1, rs: 70 }); let er = 0; for (let i = 0; i < 100; i++) er = Math.max(er, -mag(E.sos, Math.PI * 0.2 * i / 100) - 0.1);
  ok(Math.abs(mag(E.sos, Math.PI * 0.2) + 0.1) < 1e-8 && er < 1e-8, "elliptic: −0.1 dB at the edge, its pass band within it");
  const BP = iirDesign({ kind: "butter", band: "pass", order: 3, w1: 0.2, w2: 0.4 }), BS = iirDesign({ kind: "butter", band: "stop", order: 3, w1: 0.2, w2: 0.4 });
  ok(Math.abs(mag(BP.sos, 0.2 * Math.PI) + 3.0103) < 1e-3 && Math.abs(mag(BP.sos, 0.4 * Math.PI) + 3.0103) < 1e-3 && Math.abs(mag(BS.sos, 0.2 * Math.PI) + 3.0103) < 1e-3, "band-pass and band-stop: −3 dB at both edges");
  // zero phase: a sine in the pass band comes out in place, scaled by |H|²; forwards only it is delayed
  const n = 2000, x = Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * 0.02 * i)), L = iirDesign({ kind: "butter", band: "low", order: 6, w1: 0.2 });
  const y = sosfiltfilt(L.sos, x), h = sosFreqz(L.sos, [2 * Math.PI * 0.02])[0], g = h[0] ** 2 + h[1] ** 2; let e = 0; for (let i = 300; i < n - 300; i++) e = Math.max(e, Math.abs(y[i] - g * x[i]));
  const yc = sosfilt(L.sos, x).y; let ec = 0; for (let i = 300; i < n - 300; i++) ec = Math.max(ec, Math.abs(yc[i] - x[i]));
  ok(e < 1e-6 && ec > 0.05, `forwards and backwards keeps a sine in place (${e.toExponential(1)}); forwards only shifts it (${ec.toFixed(2)})`);
  // a notch: 50 Hz out of 50 + 7 Hz at 1 kHz, the 7 Hz kept
  const fs = 1000, m = 5000, s2 = Array.from({ length: m }, (_, i) => Math.sin(2 * Math.PI * 50 * i / fs) + 0.5 * Math.sin(2 * Math.PI * 7 * i / fs));
  const N0 = iirNotch(50 / 500, 30), yn = filtfilt(N0.b, N0.a, s2); let rn = 0; for (let i = 1500; i < m - 1500; i++) rn = Math.max(rn, Math.abs(yn[i] - 0.5 * Math.sin(2 * Math.PI * 7 * i / fs)));
  ok(rn < 1e-3, `a notch at 50 Hz takes the hum out and keeps 7 Hz, away from the ends it rings at (left ${rn.toExponential(1)})`);
  const nop = get("PIPE_OPS").notch, tt = Array.from({ length: 1200 }, (_, i) => i / fs), dn = { x: tt, y: tt.map((v) => Math.sin(2 * Math.PI * 50 * v)), e: null, idx: tt.map((_, i) => i), xu: "s" };
  const rr = nop.run(dn, Object.assign({}, nop.defaults, { harm: 3 }));
  ok(rr.warn.some((w) => /rings|lasts/.test(w)) && /50, 100, 150, 200 Hz taken out/.test(rr.note), `the notch step: four frequencies taken out, its ringing at the ends said ("${rr.note.slice(0, 40)}…")`);
  const F = firwin(101, 0.2, { band: "low" }), fh = baFreqz(F.b, [1], [0, 0.2 * Math.PI, 0.5 * Math.PI]).map(v => 20 * Math.log10(Math.hypot(...v)));
  ok(Math.abs(fh[0]) < 1e-12 && fh[1] > -7 && fh[1] < -5 && fh[2] < -50, `FIR of 101 taps: 0 dB at 0, −6 dB at its edge (${fh[1].toFixed(2)}), below −50 dB past it`);
  ok(/between 0 and the Nyquist/.test(iirDesign({ kind: "butter", band: "low", order: 4, w1: 1 }).fail || "") && /lower edge/.test(iirDesign({ kind: "butter", band: "pass", order: 4, w1: 0.4, w2: 0.2 }).fail || "") && /1 to 20/.test(iirDesign({ kind: "butter", band: "low", order: 30, w1: 0.2 }).fail || ""),
    "refused in words: an edge at Nyquist, a band's edges crossed, an order of 30");
  // the step, whole: an edge in Hz on X in seconds, the response in its extra, the note
  const op = get("PIPE_OPS").filt, t = Array.from({ length: 400 }, (_, i) => i * 0.001), d = { x: t, y: t.map(v => Math.sin(2 * Math.PI * 20 * v) + 0.3 * Math.sin(2 * Math.PI * 300 * v)), e: null, idx: t.map((_, i) => i), xn: "Time", xu: "s", yn: "V", yu: "V" };
  const r = op.run(d, Object.assign({}, op.defaults, { f1: 60 }));
  ok(near(r.extra.nyq, 500, 1e-12) && r.extra.resp.f.length === 257 && /Butterworth low-pass, order 4, 60 Hz; forwards and backwards/.test(r.note), `the step: Nyquist 500 Hz, the response drawn, "${r.note.slice(0, 70)}…"`);
  let ee = 0; for (let i = 60; i < 340; i++) ee = Math.max(ee, Math.abs(r.d.y[i] - Math.sin(2 * Math.PI * 20 * t[i])));
  ok(ee < 0.02, `…keeps the 20 Hz and takes the 300 Hz off (left ${ee.toFixed(4)})`);
  let thr = ""; try { op.run(d, Object.assign({}, op.defaults, { f1: 600 })); } catch (er) { thr = er.message; }
  ok(/below the Nyquist frequency, 500 Hz/.test(thr), "…an edge past Nyquist refused, naming it in Hz");
  const big = Float64Array.from({ length: 1e6 }, () => gauss()), H20 = iirDesign({ kind: "butter", band: "high", order: 20, w1: 0.1 });
  const [, ms] = time(() => sosfiltfilt(H20.sos, big)); ok(ms < 600, `an order-20 high-pass forwards and backwards over 10⁶ points in ${ms.toFixed(0)} ms (budget 0.3 s in the browser)`);
  const [, md] = time(() => { for (let i = 0; i < 20; i++) iirDesign({ kind: "ellip", band: "pass", order: 10, w1: 0.1, w2: 0.3, rp: 1, rs: 60 }); }); ok(md / 20 < 5, `an elliptic band-pass of order 10 designed in ${(md / 20).toFixed(2)} ms`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
