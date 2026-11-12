/* The distributions' properties (ux/spec/FOUNDATION_SPEC.md, slice 1.4): what must hold whatever
   the reference says. The two tails add up to 1 where both are large; the quantile of a tail is
   the value it came from; t is symmetric; the distribution functions rise; the limits at 0 and ∞;
   the probabilities of counts add up to 1 and their tails to the sums of them. The values
   themselves are checked against 40-digit references by tools/ref-test.mjs and the fuzzer. And the
   descriptive statistics: what a shift, a scale, the order and a change of sign do to them.
   Usage: node tools/stats-test.mjs [kurve.html] */
import { loadKurve } from "./ref/run.mjs";
const get = loadKurve(process.argv[2]);
const D = get("DIST"), lgam = get("lgam"), lbeta = get("lbeta"), ibetaPQ = get("ibetaPQ"), igamPQ = get("igamPQ");
let pass = 0, fail = 0;
const check = (name, ok, detail) => { if (ok) pass++; else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + detail)); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const ln = (lo, hi) => 10 ** (lo + (hi - lo) * rnd());

// ln Γ: Γ(n) = (n − 1)!, the recurrence, Γ(½) = √π, reflection.
let w = 0; for (let n = 1, f = 1; n < 170; n++) { if (n > 1) f *= n - 1; w = Math.max(w, Math.abs(lgam(n) - Math.log(f)) / Math.max(1, Math.log(f))); }
check("ln Γ(n) is ln (n − 1)! to 1e-15", w < 1e-15, w);
w = 0; for (let i = 0; i < 400; i++) { const x = ln(-3, 6); w = Math.max(w, Math.abs(lgam(x + 1) - lgam(x) - Math.log(x)) / Math.max(1, Math.abs(lgam(x + 1)))); }
check("ln Γ(x + 1) = ln Γ(x) + ln x", w < 4e-15, w);
check("ln Γ(½) = ln √π", rel(lgam(0.5), 0.5 * Math.log(Math.PI)) < 1e-15);
check("ln Γ(1) and ln Γ(2) are 0 exactly", lgam(1) === 0 && lgam(2) === 0, [lgam(1), lgam(2)]);
check("|Γ(−0.5)| = 2√π", rel(lgam(-0.5), Math.log(2 * Math.sqrt(Math.PI))) < 1e-14);
check("ln Γ at 0 and at negative whole numbers is +∞", lgam(0) === Infinity && lgam(-3) === Infinity);
w = 0; for (let i = 0; i < 300; i++) { const a = ln(-1, 7), b = ln(-1, 7); w = Math.max(w, Math.abs(lbeta(a, b) - lbeta(b, a))); }
check("ln B is symmetric", w === 0, w);
check("ln B(5e6, ½) keeps its digits (against ln Γ(½) − ½ ln 5e6, first order)", Math.abs(lbeta(5e6, 0.5) - (lgam(0.5) - 0.5 * Math.log(5e6))) < 1e-7);

// The incomplete beta and gamma: the two parts add up to 1, the limits, monotone in x.
w = 0; for (let i = 0; i < 2000; i++) { const a = ln(-1, 5), b = ln(-1, 5), x = rnd(); const [p, q] = ibetaPQ(a, b, x, 1 - x); w = Math.max(w, Math.abs(p + q - 1)); }
check("I_x(a, b) and its complement add up to 1", w < 1e-15, w);
w = 0; for (let i = 0; i < 2000; i++) { const a = ln(-1, 6), x = ln(-3, 6.5); const [p, q] = igamPQ(a, x); w = Math.max(w, Math.abs(p + q - 1)); }
check("P(a, x) and Q(a, x) add up to 1", w < 1e-15, w);
check("I_0 = 0, I_1 = 1, P(a, 0) = 0, P(a, ∞) = 1", ibetaPQ(2, 3, 0, 1)[0] === 0 && ibetaPQ(2, 3, 1, 0)[0] === 1 && igamPQ(2, 0)[0] === 0 && igamPQ(2, Infinity)[0] === 1);
let mono = true; for (let i = 0; i < 200 && mono; i++) { const a = ln(-1, 4), b = ln(-1, 4); let last = -1; for (let k = 0; k <= 100; k++) { const v = ibetaPQ(a, b, k / 100, 1 - k / 100)[0]; if (v < last - 1e-15) mono = false; last = v; } }
check("I_x(a, b) rises with x", mono);
check("I_x(1, 1) = x and I_x(a, 1) = x^a", rel(ibetaPQ(1, 1, 0.3, 0.7)[0], 0.3) < 1e-15 && rel(ibetaPQ(2.5, 1, 0.4, 0.6)[0], 0.4 ** 2.5) < 1e-14);
check("P(1, x) = 1 − e^−x, Q(1, x) = e^−x", rel(igamPQ(1, 0.7)[0], -Math.expm1(-0.7)) < 1e-15 && rel(igamPQ(1, 30)[1], Math.exp(-30)) < 1e-14);
check("argument out of range gives NaN, not a number", Number.isNaN(ibetaPQ(-1, 2, 0.5, 0.5)[0]) && Number.isNaN(igamPQ(0, 1)[0]) && Number.isNaN(D.t.cdf(1, -1)));

// Each continuous distribution: cdf + sf = 1, the quantiles give back the value, rising.
const cont = [
  ["normal", D.norm, () => [], () => (rnd() - 0.5) * 16],
  ["t", D.t, () => [[1, 2, 3, 5, 30, 1e3, 1e6][Math.floor(rnd() * 7)]], () => (rnd() - 0.5) * 20],
  ["F", D.F, () => [Math.ceil(ln(0, 2.5)), Math.ceil(ln(0, 4))], () => ln(-2, 2)],
  ["χ²", D.chi2, () => [Math.ceil(ln(0, 3))], () => ln(-2, 3)],
  ["gamma", D.gamma, () => [ln(-1, 3)], () => ln(-3, 3)],
  ["beta", D.beta, () => [ln(-0.7, 2.5), ln(-0.7, 2.5)], () => rnd()],
];
for (const [nm, d, par, xg] of cont) {
  let wsum = 0, wq = 0, wqi = 0, worst = null, up = true;
  for (let i = 0; i < 400; i++) {
    const pr = par(), x = xg(), c = d.cdf(x, ...pr), u = d.sf(x, ...pr);
    if (c > 0.01 && u > 0.01) wsum = Math.max(wsum, Math.abs(c + u - 1));
    if (c > 1e-280 && c < 0.5) { const back = d.ppf(c, ...pr), e = rel(back, x); if (e > wq) { wq = e; worst = [x, pr, c, back]; } }
    if (u > 1e-280 && u < 0.5) { const back = d.isf(u, ...pr), e = rel(back, x); if (e > wqi) { wqi = e; } }
    const x2 = x + Math.abs(x) * 1e-3 + 1e-6; if (d.cdf(x2, ...pr) < c - 1e-15) up = false;
  }
  check(`${nm}: cdf + sf = 1`, wsum < 4e-15, wsum);
  check(`${nm}: the quantile of the distribution function is the value`, wq < 1e-11, JSON.stringify([wq, worst]));
  check(`${nm}: the upper quantile of the upper tail is the value`, wqi < 1e-11, wqi);
  check(`${nm}: the distribution function rises`, up);
}
let sym = 0; for (let i = 0; i < 300; i++) { const nu = ln(0, 6), x = ln(-3, 2); sym = Math.max(sym, rel(D.t.cdf(-x, nu), D.t.sf(x, nu)), rel(D.t.ppf(0.3, nu), -D.t.isf(0.3, nu))); }
check("t is symmetric: cdf(−x) = sf(x), ppf(p) = −isf(p)", sym < 1e-15, sym);
check("t with one degree of freedom is Cauchy's", rel(D.t.cdf(2, 1), 0.5 + Math.atan(2) / Math.PI) < 1e-15 && rel(D.t.isf(0.1, 1), Math.tan(Math.PI * 0.4)) < 1e-14);
check("t's 97.5% at 10 degrees of freedom is 2.228138851986273", rel(D.t.isf(0.025, 10), 2.228138851986273) < 1e-14);
check("χ² with 2 degrees of freedom: sf(x) = e^(−x/2)", rel(D.chi2.sf(50, 2), Math.exp(-25)) < 1e-14);
check("t at infinite degrees of freedom is the normal", D.t.cdf(1.3, Infinity) === D.norm.cdf(1.3));
check("the tails at the ends: t at ±∞, F at 0", D.t.cdf(-Infinity, 5) === 0 && D.t.sf(Infinity, 5) === 0 && D.F.cdf(0, 3, 4) === 0 && D.F.sf(0, 3, 4) === 1);
check("a tail of 1e-300 is a number, not 0", D.norm.sf(37) > 0 && D.t.sf(1e30, 3) > 0 && D.chi2.sf(1300, 2) > 0, [D.norm.sf(37), D.t.sf(1e30, 3), D.chi2.sf(1300, 2)]);

// Counts: probabilities add up to 1, tails are sums of them, quantiles reach their level.
const disc = [
  ["binomial", D.binom, () => { const n = Math.ceil(ln(0, 3)); return [n, rnd()]; }, pr => [0, pr[0]]],
  ["Poisson", D.pois, () => [ln(-2, 3)], pr => [0, Math.ceil(pr[0] + 12 * Math.sqrt(pr[0]) + 30)]],
  ["hypergeometric", D.hyper, () => { const r = Math.ceil(ln(0, 2.5)), b = Math.ceil(ln(0, 2.5)), n = 1 + Math.floor(rnd() * (r + b)); return [r, b, n]; }, pr => [Math.max(0, pr[2] - pr[1]), Math.min(pr[0], pr[2])]],
];
for (const [nm, d, par, rng] of disc) {
  let wtot = 0, wtail = 0, wq = 0, wrq = null;
  for (let i = 0; i < 120; i++) {
    const pr = par(), [lo, hi] = rng(pr); let tot = 0;
    const ks = []; for (let k = lo; k <= hi; k++) { const v = d.pmf(k, ...pr); tot += v; ks.push([k, tot]); }
    wtot = Math.max(wtot, Math.abs(tot - 1));
    for (const [k, cum] of ks.filter((_, j) => j % Math.ceil(ks.length / 8) === 0)) {
      const c = d.cdf(k, ...pr), u = d.sf(k, ...pr);
      if (cum > 1e-12) wtail = Math.max(wtail, rel(c, cum)); wtail = Math.max(wtail, Math.abs(c + u - 1));
      const q = Math.min(Math.max(c, 1e-12), 1 - 1e-12), kk = d.ppf(q, ...pr);
      if (!(d.cdf(kk, ...pr) >= q * (1 - 1e-13) && (kk === lo || d.cdf(kk - 1, ...pr) < q))) { wq++; wrq = [pr, k, q, kk]; }
    }
  }
  check(`${nm}: the probabilities add up to 1`, wtot < 1e-12, wtot);
  check(`${nm}: the distribution function is the sum of the probabilities, and the tails add up to 1`, wtail < 1e-11, wtail);
  check(`${nm}: the quantile is the smallest count whose distribution function reaches the level`, wq === 0, JSON.stringify(wrq));
}
check("Poisson's distribution function at a mean of 1e6, one standard deviation above, is Φ-like (0.84)", Math.abs(D.pois.cdf(1e6 + 1000, 1e6) - 0.8414) < 2e-3);
check("binomial with p = 0 or 1", D.binom.cdf(0, 10, 0) === 1 && D.binom.sf(9, 10, 1) === 1 && D.binom.pmf(10, 10, 1) === 1);

// Descriptive statistics (STATS_SPEC 2.1): what a shift, a scale, a new order or a change of sign
// does to each, whatever the values; their values against exact rationals are ref-test's.
{
  const ds = get("descStats"), qT = get("quantileType");
  let wShift = 0, wScale = 0, wOrder = 0, wNeg = 0, wQ = 0, mono = true, at = null;
  for (let r = 0; r < 200; r++) {
    const n = 2 + Math.floor(rnd() * 60), v = [];
    for (let i = 0; i < n; i++) v.push(rnd() < 0.2 ? Math.round(rnd() * 8) : (rnd() - 0.4) * ln(-2, 3));
    const a = ds(v, { pcts: [10, 90] }), c = 2 ** Math.floor(rnd() * 20 - 10), sh = Math.round(rnd() * 64) / 4;
    // A shift by a number of quarters keeps the values' sum exact where they are not too large: every spread and shape the same.
    const b = ds(v.map((x) => x + sh)), k = ds(v.map((x) => x * c)), o = ds(v.slice().reverse()), g = ds(v.map((x) => -x));
    for (const key of ["sd", "var", "iqr", "mad", "range"]) wShift = Math.max(wShift, rel(b[key], a[key]) * (a[key] > 1e-9 ? 1 : 0));
    for (const key of ["skew", "kurt"]) if (a[key] != null) wShift = Math.max(wShift, Math.abs(b[key] - a[key]) / Math.max(1, Math.abs(a[key])) / 64);
    // A power of two scales exactly: every statistic with a unit scales by it, the shape ones not at all.
    for (const key of ["mean", "sd", "se", "med", "q1", "q3", "mad", "min", "max"]) wScale = Math.max(wScale, a[key] === 0 ? Math.abs(k[key]) : rel(k[key], a[key] * c));
    if (a.var) wScale = Math.max(wScale, rel(k.var, a.var * c * c));
    for (const key of ["skew", "kurt"]) if (a[key] != null) wScale = Math.max(wScale, Math.abs(k[key] - a[key]));
    // The order of the values changes nothing but the last digit of a sum.
    for (const key of ["mean", "sd", "med", "q1", "q3", "mad", "mode", "min", "max"]) wOrder = Math.max(wOrder, a[key] == null ? (o[key] == null ? 0 : 1) : Math.abs(o[key] - a[key]) / Math.max(Math.abs(a[key]), a.sd || 1));
    // A change of sign mirrors: the mean, the median and the skewness change sign, the spread and the kurtosis not.
    wNeg = Math.max(wNeg, Math.abs(g.mean + a.mean) / Math.max(Math.abs(a.mean), a.sd || 1), Math.abs(g.med + a.med) / (a.sd || 1), rel(g.sd, a.sd), Math.abs(g.q1 + a.q3) / (a.sd || 1));
    if (a.skew != null) wNeg = Math.max(wNeg, Math.abs(g.skew + a.skew) / Math.max(1, Math.abs(a.skew)), Math.abs(g.kurt - a.kurt) / Math.max(1, Math.abs(a.kurt || 0)));
    // Every quantile type lies between the smallest and the largest value and rises with p.
    const srt = v.slice().sort((x, y) => x - y);
    for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      let prev = -Infinity;
      for (let p = 0; p <= 1.0000001; p += 0.05) { const q = qT(srt, Math.min(p, 1), t); if (!(q >= srt[0] && q <= srt[n - 1] && q >= prev - 1e-12 * Math.abs(prev))) { mono = false; at = [t, p, q, prev]; } prev = q; }
    }
    wQ = Math.max(wQ, Math.abs(qT(srt, 0.5, 7) - a.med), Math.abs(qT(srt, 0.1, 7) - a.pct[0].v));
  }
  check("descriptive statistics: a shift leaves every spread and shape as it was", wShift < 1e-12, wShift);
  check("…a power of two scales every statistic with a unit by it, and no shape", wScale < 1e-15, wScale);
  check("…the order of the values changes nothing", wOrder < 1e-14, wOrder);
  check("…a change of sign mirrors the mean, the median, the quartiles and the skewness", wNeg < 1e-14, wNeg);
  check("every quantile type lies between the smallest and largest value and rises with p", mono, JSON.stringify(at));
  check("…and the median and percentiles of descStats are quantileType's", wQ === 0, wQ);
  const one = ds([4.2]), two = ds([1, 3]), con = ds([2, 2, 2, 2]), none = ds([null, NaN, Infinity]);
  check("one value: N 1, its mean and median, no SD (a reason given)", one.n === 1 && one.mean === 4.2 && one.med === 4.2 && one.sd === null && one.why.sd === "one value");
  check("two values: an SD, no skewness or kurtosis, each with its reason", two.sd === Math.SQRT2 && two.skew === null && two.why.skew === "fewer than three values" && two.kurt === null);
  check("values all the same: SD 0, no skewness, the mode the value with its count", con.sd === 0 && con.skew === null && con.why.skew === "every value the same" && con.mode === 2 && con.modeN === 4);
  check("blanks, NaN and infinities are not values", none.n === 0 && none.why.all === "no values");
  const nq = ds([-3, 1, 2]);
  check("values at or below zero: no geometric or harmonic mean, said", nq.gmean === null && nq.hmean === null && nq.why.gmean === "values at or below zero");
  check("Tukey's hinges are the medians of each half, the median in both when n is odd", qT([1, 2, 3, 4, 5], 0.25, "tukey") === 2 && qT([1, 2, 3, 4, 5], 0.75, "tukey") === 4 && qT([1, 2, 3, 4, 5, 6], 0.25, "tukey") === 2 && qT([1, 2, 3, 4, 5, 6], 0.75, "tukey") === 5);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
