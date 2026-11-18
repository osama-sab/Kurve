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
console.log("5.3 correlation and convolution");
{ const correlate = get("correlate"), sigKernel = get("sigKernel"), convolveY = get("convolveY"), wienerDeconv = get("wienerDeconv"), coherence = get("coherence");
  const pts = (x, y) => ({ x, y, e: x.map(() => null), rows: x.map((_, i) => i) });
  const n = 600, base = Array.from({ length: n + 40 }, () => gauss()), sm = base.map((_, i) => base.slice(Math.max(0, i - 3), i + 4).reduce((a, v) => a + v, 0));
  const a = sm.slice(20, 20 + n), b = sm.slice(20 - 13, 20 - 13 + n);   // b[n] = a[n − 13]: b follows a by 13 points
  const r = correlate(b, a, { norm: "coeff", demean: true }); let ib = 0; r.c.forEach((v, i) => { if (v > r.c[ib]) ib = i; });
  ok(r.k[ib] === 13 && r.c[ib] > 0.95, `a copy 13 points later is found at lag 13 (coefficient ${r.c[ib].toFixed(3)})`);
  const ac = correlate(a, null, { norm: "coeff" }); ok(Math.abs(ac.c[ac.k.indexOf(0)] - 1) < 1e-14 && ac.c.every((v) => v <= 1 + 1e-14), "the autocorrelation coefficient is 1 at lag 0 and no more anywhere");
  const q1 = { id: "a", name: "A", unit: "V", xu: "s", pts: pts(a.map((_, i) => 2 + i * 0.5), a) }, q2 = { id: "b", name: "B", unit: "V", xu: "s", pts: pts(b.map((_, i) => 2 + i * 0.5), b) };
  const R = anaRunKind("xcorr", [q2, q1], { norm: "coeff" }), L = R.tables[0].cols.find((c) => c.k === "lag"), C = R.tables[0].cols.find((c) => c.k === "c");
  let jb = 0; C.vals.forEach((v, i) => { if (v > C.vals[jb]) jb = i; }); ok(L.unit === "s" && Math.abs(L.vals[jb] - 6.5) < 1e-12 && C.unit === "", "the analysis: the lag in seconds (13 × 0.5 s = 6.5 s), the coefficient without a unit");
  const q3 = Object.assign({}, q1, { pts: pts(a.map((_, i) => 100 + i * 0.5), a) }), R2 = anaRunKind("xcorr", [q2, q3], { norm: "coeff" }), L2 = R2.tables[0].cols[0], C2 = R2.tables[0].cols[1];
  let kb = 0; C2.vals.forEach((v, i) => { if (v > C2.vals[kb]) kb = i; }); ok(Math.abs(L2.vals[kb] - (6.5 - 98)) < 1e-12, "…with the second's X starting 98 s later, the lag is 6.5 − 98 s: where it truly matches");
  // a Gaussian of FWHM 4 convolved with a Gaussian kernel of FWHM 3: FWHM 5, the area kept
  const xs = Array.from({ length: 801 }, (_, i) => i * 0.1), y = xs.map((x) => Math.exp(-0.5 * ((x - 40) / (4 / 2.3548200450309493)) ** 2));
  const K = sigKernel("gauss", 3, 0.1, "area"), yc = convolveY(y, K.k, "zero"), area = (v) => v.reduce((t, q) => t + q, 0) * 0.1;
  const half = Math.max(...yc) / 2, above = yc.filter((v) => v >= half).length * 0.1; ok(Math.abs(area(yc) - area(y)) < 1e-10 && Math.abs(above - 5) < 0.15, `Gaussians add in quadrature: FWHM 4 with 3 gives ${above.toFixed(1)} (5), the area kept to ${Math.abs(area(yc) - area(y)).toExponential(1)}`);
  // convolved, then deconvolved by Wiener's with a small ratio: the column back
  const peaks = xs.map((x) => 100 * Math.exp(-0.5 * ((x - 30) / 0.8) ** 2) + 60 * Math.exp(-0.5 * ((x - 33) / 0.8) ** 2) + 5), K2 = sigKernel("gauss", 2, 0.1, "area"), bl = convolveY(peaks, K2.k, "mirror");
  const W = wienerDeconv(bl, K2.k, 1e-9); let we = 0; for (let i = 100; i < 700; i++) we = Math.max(we, Math.abs(W.y[i] - peaks[i]));
  ok(we < 0.5 && W.gain > 1, `blurred by a Gaussian of 2 and deconvolved: back to within ${we.toFixed(3)} of 100 (the noise would rise ${W.gain.toExponential(1)} times)`);
  const We = wienerDeconv(bl.map((v) => v + 0.2 * gauss()), K2.k, null); ok(We.est && We.nsr > 0 && We.gain < 50, `the ratio estimated from the column's highest frequencies (${We.nsr.toExponential(1)}), the noise's rise kept to ${We.gain.toFixed(1)}`);
  const u = Array.from({ length: 4000 }, () => gauss()), cs = coherence(u, u, 1, { nseg: 256 }); ok(cs.coh.every((v) => Math.abs(v - 1) < 1e-12), "a column's coherence with itself is 1 at every frequency");
  const op = get("PIPE_OPS").conv, d = { x: xs, y, e: null, idx: xs.map((_, i) => i), xu: "nm" };
  const st = op.run(d, Object.assign({}, op.defaults, { w: 3 })); ok(/points of kernel, summing to 1/.test(st.note) && st.d.y.length === 801, `the step: "${st.note}"`);
  const ctx = { refData: () => ({ x: [-1, -0.5, 0, 0.5, 1], y: [0, 1, 2, 1, 0] }) }, sc = op.run(d, Object.assign({}, op.defaults, { kern: "col", col: "k" }), ctx);
  ok(/origin at X = 0/.test(sc.note) && /21 points/.test(sc.note), `…with a column for kernel, read at this spacing: "${sc.note.slice(0, 60)}…"`);
  let th = ""; try { op.run(d, Object.assign({}, op.defaults, { w: 1000 })); } catch (e) { th = e.message; } ok(/more than the column/.test(th), "…a kernel wider than the column refused in words");
  const dop = get("PIPE_OPS").deconv, ds = dop.run(Object.assign({}, d, { y: bl.map((v) => v + 0.05 * gauss()) }), Object.assign({}, dop.defaults, { w: 2 }));
  ok(/Wiener's deconvolution/.test(ds.note) && /estimated/.test(ds.note) && /rises/.test(ds.note), `the deconvolution step says its ratio and the noise's rise: "${ds.note.slice(0, 90)}…"`);
  const big = Array.from({ length: 1e5 }, () => gauss()), [, ms] = time(() => correlate(big, big.map((v) => v + gauss()), { norm: "coeff" })); ok(ms < 600, `the correlation of two columns of 10⁵ in ${ms.toFixed(0)} ms (budget 0.2 s in the browser)`);
}
console.log("5.7 interpolation");
{ const interp1 = get("interp1"), gridXYZ = get("gridXYZ"), smoothSpline = get("smoothSpline");
  const x = Array.from({ length: 25 }, (_, i) => i * 0.7 + Math.sin(i) * 0.2), y = x.map((v) => Math.sin(v) * 3 + v);
  const M = ["linear", "notaknot", "natural", "clamped", "akima", "makima", "pchip"];
  ok(M.every((m) => interp1(x, y, x, { method: m }).y.every((v, i) => v === y[i])), "every interpolant passes through its own points exactly");
  const line = x.map((v) => 2.5 * v - 1), q = Array.from({ length: 60 }, (_, i) => -1 + i * 0.3);
  ok(M.filter((m) => m !== "clamped").every((m) => interp1(x, line, q, { method: m, ext: "method" }).y.every((v, i) => Math.abs(v - (2.5 * q[i] - 1)) < 1e-12)), "a straight line kept by every method, inside and past the ends");
  ok(M.every((m) => interp1(x, x.map(() => 4), q, { method: m }).y.every((v) => v === null || Math.abs(v - 4) < 1e-14)), "a constant kept by every method");
  const r = interp1(x, y, [-5, x[3], (x[3] + x[4]) / 2, 50], { method: "pchip", ext: "none" }); ok(r.how.join() === ",0,1," && r.y[0] === null && r.y[3] === null, "measured, interpolated, and empty past the data unless asked");
  const r2 = interp1(x, y, [-5, 50], { method: "pchip", ext: "line" }); ok(r2.how.join() === "2,2" && r2.y.every(Number.isFinite), "…extrapolated when asked, and marked so");
  const r3 = interp1([0, 1, 1, 2], [0, 1, 3, 4], [1], { method: "linear" }); ok(r3.merged === 1 && r3.y[0] === 2, "a repeated X: its values averaged, and counted");
  const s0 = smoothSpline(x, y, { lam: 1e-9 }), s1 = smoothSpline(x, y, { lam: 1 }), s2 = smoothSpline(x, y, { lam: 100 });
  ok(Math.abs(s0.edf - 25) < 1e-3 && s1.edf < s0.edf && s2.edf < s1.edf && s2.edf > 2, `the smoothing spline: degrees of freedom ${s0.edf.toFixed(2)} → ${s1.edf.toFixed(2)} → ${s2.edf.toFixed(2)} as λ grows, towards a straight line's 2`);
  // gridding: a plane kept by triangles and the thin-plate spline; a constant by Shepard's weights
  let sd = 3; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }, X = Array.from({ length: 300 }, rr), Y = X.map(() => rr() * 5), Z = X.map((v, i) => 3 * v - 0.4 * Y[i] + 7);
  const gt = gridXYZ(X, Y, Z, { method: "tri", nx: 30, ny: 30 }), gp = gridXYZ(X, Y, Z, { method: "tps", nx: 30, ny: 30 }), gs = gridXYZ(X, Y, X.map(() => 5), { method: "shepard", nx: 30, ny: 30 });
  const plane = (g) => g.z.every((v, k) => { if (v == null) return true; const i = k % g.nx, j = Math.floor(k / g.nx), u = g.x0 + (g.x1 - g.x0) * i / (g.nx - 1), w = g.y0 + (g.y1 - g.y0) * j / (g.ny - 1); return Math.abs(v - (3 * u - 0.4 * w + 7)) < 1e-9; });
  ok(plane(gt) && gt.empty > 0 && plane(gp) && gp.empty === 0 && gs.z.every((v) => v == null || Math.abs(v - 5) < 1e-12), `a plane kept by the triangles (${gt.empty} cells outside the outline empty) and the thin-plate spline; a constant by Shepard's weights`);
  ok(/one line/.test(gridXYZ([1, 2, 3, 4], [1, 1, 1, 1], [1, 2, 3, 4], {}).fail || ""), "points on one line refused in words");
  // the analyses whole
  const pts = (x, y) => ({ x, y, e: x.map(() => null), rows: x.map((_, i) => i) }), qa = { id: "a", name: "A", unit: "V", xu: "s", xn: "Time", pts: pts(x, y) }, qb = { id: "b", name: "B", unit: "V", xu: "s", pts: pts([1, 2, 3, 100], [0, 0, 0, 0]) };
  const R = anaRunKind("interp", [qa, qb], { method: "notaknot", grid: "col", at: "b", ext: "none" }), C = Object.fromEntries(R.tables[0].cols.map((c) => [c.k, c]));
  ok(C.x0.vals.join() === "1,2,3,100" && C.y0.vals[3] === null && C.h0.vals.join() === "interpolated,interpolated,interpolated," && C.x0.name === "A: Time" === false, "Interpolate at another column's X: A read at B's X, past its data empty, each row marked");
  const G = anaRunKind("grid", [{ id: "x", name: "X", unit: "mm", vals: X, rows: X.map((_, i) => i) }, { id: "y", name: "Y", unit: "mm", vals: Y, rows: Y.map((_, i) => i) }, { id: "z", name: "Height", unit: "nm", vals: Z, rows: Z.map((_, i) => i) }], { x: "x", y: "y", z: "z", method: "tri", nx: 20, ny: 10 });
  ok(G.mat && G.mat.nx === 20 && G.mat.ny === 10 && G.mat.zunit === "nm" && G.mat.z.length === 200, "Gridding returns a matrix of 10 × 20 with its names and units");
  const big = Array.from({ length: 1e6 }, (_, i) => i), bv = big.map((v) => Math.sin(v * 1e-3)), bq = big.map((v) => v + 0.5);
  const [, ms] = time(() => interp1(big, bv, bq, { method: "pchip" })); ok(ms < 1500, `PCHIP of 10⁶ points read at 10⁶ others in ${ms.toFixed(0)} ms (budget 0.5 s in the browser)`);
  const Xb = Array.from({ length: 2000 }, rr), Yb = Xb.map(() => rr()), Zb = Xb.map((v, i) => Math.sin(5 * v) * Yb[i]);
  const [gb, mt] = time(() => gridXYZ(Xb, Yb, Zb, { method: "tps", nx: 200, ny: 200 })); ok(!gb.fail && mt < 9000, `a thin-plate spline of 2000 points onto 200 × 200 in ${mt.toFixed(0)} ms (budget 6 s in the worker, perf.mjs)`);
  const [, msh] = time(() => gridXYZ(Xb, Yb, Zb, { method: "shepard", nx: 200, ny: 200 })); ok(msh < 600, `Shepard's weights of 2000 points onto 200 × 200 in ${msh.toFixed(0)} ms`);
}
console.log("5.4 envelope");
{ const envelope = get("envelope"), extremaIdx = get("extremaIdx");
  const n = 2000, t = Array.from({ length: n }, (_, i) => i * 0.001), y = t.map((v) => 3 * Math.cos(2 * Math.PI * 50 * v) + 1.5);
  const e = envelope(t, y, { out: "env" }); let er = 0; for (let i = 0; i < n; i++) er = Math.max(er, Math.abs(e.y[i] - 4.5));
  ok(er < 1e-9 && Math.abs(e.mean - 1.5) < 1e-12, `the Hilbert envelope of 3·cos(2π·50t) + 1.5 is 4.5 (to ${er.toExponential(1)}), about its mean 1.5`);
  const ch = t.map((v) => Math.cos(2 * Math.PI * (20 * v + 40 * v * v))), f = envelope(t, ch, { out: "freq" }); let ef = 0; for (let i = 300; i < n - 300; i++) ef = Math.max(ef, Math.abs(f.y[i] - (20 + 80 * t[i])));
  ok(ef < 0.5, `a chirp's instantaneous frequency follows 20 + 80t Hz (to ${ef.toFixed(3)} Hz, away from the ends)`);
  const am = t.map((v) => (1 + 0.5 * Math.sin(2 * Math.PI * 3 * v)) * Math.sin(2 * Math.PI * 60 * v)), ix = extremaIdx(am, 3, false), up = envelope(t, am, { out: "upper", order: 3 });
  ok(ix.length > 100 && ix.every((i) => Math.abs(up.y[i] - am[i]) < 1e-12), `the upper envelope passes through each of the ${ix.length} maxima`);
  ok(/Fewer than two maxima/.test(envelope([0, 1, 2, 3, 4], [0, 1, 2, 3, 4], { out: "upper" }).fail || ""), "a column with no maximum refused in words");
  const op = get("PIPE_OPS").env, d = { x: t, y: ch, e: null, idx: t.map((_, i) => i), xn: "Time", xu: "s", yn: "Signal", yu: "V" }, r = op.run(d, Object.assign({}, op.defaults, { out: "freq" }));
  ok(r.d.yn === "Frequency of Signal" && r.d.yu === "Hz" && /less its mean/.test(r.note), `the step: "${r.d.yn}" in ${r.d.yu}, "${r.note.slice(0, 60)}…"`);
  const big = Array.from({ length: 1 << 20 }, (_, i) => Math.sin(i * 0.01)), xs = big.map((_, i) => i), [, ms] = time(() => envelope(xs, big, { out: "env" })); ok(ms < 1200, `the analytic signal of 2²⁰ points in ${ms.toFixed(0)} ms (budget 0.5 s in the browser)`);
}
console.log("5.5 the short-time transform");
{ const stft = get("stft"), fs = 1000, n = 4000, t = Array.from({ length: n }, (_, i) => i / fs), y = t.map((v) => Math.cos(2 * Math.PI * (50 * v + 50 * v * v)));
  const r = stft(y, fs, { nseg: 256, over: 192 }); let worst = 0;
  for (let s = 2; s < r.nt - 2; s++) { let kb = 0; for (let k = 0; k < r.nf; k++) if (r.z[k * r.nt + s] > r.z[kb * r.nt + s]) kb = k; worst = Math.max(worst, Math.abs(r.f[kb] - (50 + 100 * r.t[s]))); }
  ok(worst <= 1000 / 256 + 100 * 0.256 / 2, `a chirp's ridge follows 50 + 100t Hz within a frequency step and half the sweep across a segment (${worst.toFixed(2)} Hz)`);
  const pts = (x, y) => ({ x, y, e: x.map(() => null), rows: x.map((_, i) => i) }), R = anaRunKind("stft", [{ id: "a", name: "Signal", unit: "V", xu: "s", xn: "Time", pts: pts(t.map((v) => v + 10), y) }], { db: true });
  ok(R.mat && R.mat.yunit === "Hz" && R.mat.xunit === "s" && R.mat.zunit === "dB" && R.mat.zname === "Power spectral density" && R.mat.ny === 129 && Math.abs(get("matAxis")(R.mat.x, R.mat.nx)[0] - 10.128) < 1e-9,
    "the analysis: a matrix of frequency (Hz, 129 rows) against time from the column's own X (the first centre at 10.128 s), in dB");
  ok(/more than a matrix holds/.test(stft(Array.from({ length: 5e6 }, () => 0), 1, { nseg: 4000, over: 3999 }).fail || ""), "a spectrogram past a matrix's size refused in words");
  const big = Array.from({ length: 1e6 }, () => gauss()), [, ms] = time(() => stft(big, 1, { nseg: 256, over: 0 })); ok(ms < 2000, `a million points into 3906 × 129 cells in ${ms.toFixed(0)} ms (budget 1.5 s in the worker)`);
}
console.log("5.6 wavelets");
{ const wavedec = get("wavedec"), waverec = get("waverec"), wdenoise = get("wdenoise"), cwt = get("cwt"), NAMES = get("WAV_NAMES"), MODES = get("WAV_MODES");
  const x = Array.from({ length: 257 }, (_, i) => Math.sin(i * 0.1) + 0.3 * Math.cos(i * 0.37) + i * 0.01); let worst = 0, tried = 0;
  for (const [nm] of NAMES) for (const [md] of MODES) { const r = wavedec(x, nm, md); if (r.fail) continue; const b = waverec(r.c, nm, md); tried++; for (let i = 0; i < x.length; i++) worst = Math.max(worst, Math.abs(b[i] - x[i])); }
  // PyWavelets' symlet coefficients are orthogonal only to about 1e-11 (its own sym20 gives a signal back to 1.6e-11; Daubechies and coiflets to 3e-15)
  ok(worst < 2e-10 && tried === NAMES.length * MODES.length, `perfect reconstruction for all ${NAMES.length} wavelets in all ${MODES.length} modes, to the precision of PyWavelets' own filters (${tried} cases, worst ${worst.toExponential(1)})`);
  const n = 1024, clean = Array.from({ length: n }, (_, i) => Math.sin(i * 0.02) * 3 + (i > 500 ? 2 : 0)), noisy = clean.map((v) => v + 0.4 * gauss());
  const rms = (a) => Math.sqrt(a.reduce((t, v, i) => t + (v - clean[i]) ** 2, 0) / n), d = wdenoise(noisy, { wav: "sym8", rule: "universal" }), d2 = wdenoise(noisy, { wav: "db4", rule: "sure" });
  ok(rms(d.y) < rms(noisy) / 2 && rms(d2.y) < rms(noisy) / 2 && Math.abs(d.sigma - 0.4) < 0.05, `denoising: the error from ${rms(noisy).toFixed(3)} to ${rms(d.y).toFixed(3)} (universal) and ${rms(d2.y).toFixed(3)} (SURE), the noise read as ${d.sigma.toFixed(3)} (0.4)`);
  const sc = Array.from({ length: 60 }, (_, i) => 1 + i), sine = Array.from({ length: 600 }, (_, i) => Math.sin(2 * Math.PI * i / 32)), cw = cwt(sine, sc, "morl", 1);
  let kb = 0, mb = -1; cw.c.forEach((row, k) => { const e = row.slice(100, 500).reduce((t, v) => t + v * v, 0); if (e > mb) { mb = e; kb = k; } });
  ok(Math.abs(cw.f[kb] - 1 / 32) < 0.15 / 32, `the Morlet CWT of a sine of period 32 peaks at scale ${sc[kb]}, a frequency of ${cw.f[kb].toFixed(4)} (1/32 = 0.0313)`);
  ok(/two values/.test(get("dwt")([1], "db2", "symmetric").fail || "") && /too few/.test(wavedec([1, 2, 3], "db10", "symmetric").fail || "") && /Antireflect needs/.test(get("dwt")([1, 2, 3], "db4", "antireflect").fail || ""), "refused in words: one value, too few for a level, antireflect shorter than its filter");
  const pts = (x, y) => ({ x, y, e: x.map(() => null), rows: x.map((_, i) => i) }), R = anaRunKind("dwt", [{ id: "a", name: "S", unit: "V", xu: "s", pts: pts(x.map((_, i) => i * 0.5), x) }], { wav: "db4" });
  const C = Object.fromEntries(R.tables[0].cols.map((c) => [c.k, c])), lv = R.report.sections[0].tables[0].rows[0][5]; let add = 0;
  for (let i = 0; i < x.length; i++) { let t = C.ra.vals[i]; for (let l = 1; l <= lv; l++) t += C["rd" + l].vals[i]; add = Math.max(add, Math.abs(t - x[i])); }
  ok(lv === get("wavMaxLevel")(257, "db4") && add < 1e-12, `the decomposition analysis: ${lv} levels, each alone on the column's X, adding up to the column (${add.toExponential(1)})`);
  const big = Array.from({ length: 1e6 }, () => gauss()), [, ms] = time(() => wavedec(big, "db4", "symmetric", 8)); ok(ms < 900, `a DWT of 10⁶ points over eight levels in ${ms.toFixed(0)} ms (budget 0.3 s in the browser)`);
}
console.log("5.8 calculus, further");
{ const simpson = get("simpson"), integPts = get("integPts"), areaBetween = get("areaBetween"), lowess = get("lowess"), integrateFn = get("integrateFn");
  const x = Array.from({ length: 21 }, (_, i) => i * 0.5), c = x.map((v) => v ** 3 - 2 * v); ok(Math.abs(simpson(c, x) - (10 ** 4 / 4 - 100)) < 1e-10, "Simpson's rule is exact for a cubic on even spacing (2400)");
  const xu = [0, 0.3, 1.1, 1.5, 2.6, 3], cu = xu.map((v) => v * v); ok(Math.abs(simpson(cu, xu) - 9) < 1e-12, "…and for a parabola on uneven X with an even count (Cartwright's last interval)");
  const e = integPts(x, x.map(() => 1), x.map(() => 0.1), {}); ok(Math.abs(e.area - 10) < 1e-12 && Math.abs(e.err - 0.1 * Math.sqrt(x.reduce((t, _, i) => t + (i === 0 || i === 20 ? 0.0625 : 0.25), 0))) < 1e-12, "a constant's area 10, its error √Σw²σ² from the Y errors");
  const r0 = integPts(x, c, null, { x0: 1.25, x1: 3.75 }); ok(r0.n === 7 && r0.x0 === 1.25 && r0.x1 === 3.75, "a range between points: its ends read in by straight lines");
  const ab = areaBetween(x, x.map(Math.sin), x, x.map(Math.sin)); ok(ab.area === 0 && ab.abs === 0, "the area between a curve and itself is 0");
  const ab2 = areaBetween([0, 1, 2], [1, 1, 1], [0, 2], [0, 2]); ok(Math.abs(ab2.area) < 1e-15 && Math.abs(ab2.abs - 1) < 1e-15 && ab2.cross.length === 1 && ab2.cross[0] === 1, "two lines crossing once: signed 0, absolute 1, the crossing at 1");
  const xs = Array.from({ length: 200 }, (_, i) => i * 0.1), ys = xs.map((v) => Math.sin(v) + ((v * 7) % 1 - 0.5) * 0.3), perm = xs.map((_, i) => i).sort((a, b) => ((a * 37) % 200) - ((b * 37) % 200));
  const l1 = lowess(xs, ys, { frac: 0.2 }).y, l2 = lowess(perm.map((i) => xs[i]), perm.map((i) => ys[i]), { frac: 0.2 }).y; ok(perm.every((i, j) => Math.abs(l2[j] - l1[i]) < 1e-14), "LOWESS does not depend on the rows' order");
  const g = integrateFn((t) => Math.exp(-t * t), -6, 6); ok(Math.abs(g.v - Math.sqrt(Math.PI)) < 1e-14, `Gauss–Kronrod: ∫e^(−x²) over ±6 is √π to ${Math.abs(g.v - Math.sqrt(Math.PI)).toExponential(1)}`);
  const pts = (x, y) => ({ x, y, e: x.map(() => null), rows: x.map((_, i) => i) }), R = anaRunKind("integ", [{ id: "a", name: "C", unit: "V", xu: "s", pts: pts(x, c) }], {});
  ok(Math.abs(R.tables[0].cols.find((q) => q.k === "simp").vals[0] - 2400) < 1e-9 && R.tables[0].cols.find((q) => q.k === "trap").unit === "V·s", "Integrate as an analysis: Simpson's 2400 beside the trapezoid's, in V·s");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
