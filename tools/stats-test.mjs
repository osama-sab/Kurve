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

// Normality and outliers (STATS_SPEC 2.2): each test's size under normal data, within its binomial interval
// (99.9 %, 20 000 samples of 20), Shapiro–Wilk's p uniform, the statistics unmoved by a shift and a scale,
// Grubbs' critical values as ASTM E178 prints them, Dixon's critical value giving its level.
{
  const mb = get("mulberry32")(2207), gauss = () => { let u = 0; while (u === 0) u = mb(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * mb()); };
  const sw = get("swTest"), lf = get("lfTest"), ad = get("adTest"), dk = get("dagoTest"), ksn = get("ksnTest"), gr = get("grubbsTest"), dx = get("dixonTest"), dc = get("dixonCrit");
  const N = 20000, n = 20, half = 3.29 * Math.sqrt(0.05 * 0.95 / N), rej = { sw: 0, lf: 0, ad: 0, dk: 0, ks: 0, gr: 0, dx: 0 }, ps = [];
  const qc = dc(n, 0.05, "two");
  for (let r = 0; r < N; r++) {
    const v = []; for (let i = 0; i < n; i++) v.push(gauss());
    const a = sw(v); ps.push(a.p); if (a.p < 0.05) rej.sw++;
    if (lf(v).p < 0.05) rej.lf++; if (ad(v).p < 0.05) rej.ad++; if (dk(v).p < 0.05) rej.dk++; if (ksn(v).p < 0.05) rej.ks++;
    if (gr(v, { side: "two", alpha: 0.05 }).rounds[0].out) rej.gr++;
    const s = v.slice().sort((x, y) => x - y), rg = s[n - 1] - s[0]; if (Math.max((s[n - 1] - s[n - 2]) / rg, (s[1] - s[0]) / rg) > qc) rej.dx++;
  }
  const size = (k) => rej[k] / N;
  for (const [k, nm] of [["sw", "Shapiro–Wilk"], ["lf", "Lilliefors"], ["ad", "Anderson–Darling"], ["gr", "Grubbs, either side"], ["dx", "Dixon's Q at its critical value"]])
    check(`${nm} rejects normal data 5 % of the time (±${(half * 100).toFixed(2)} %)`, Math.abs(size(k) - 0.05) < half, size(k));
  check("D'Agostino's K² at 20 values is near its level (its χ² is asymptotic: within 1 %)", Math.abs(size("dk") - 0.05) < 0.01, size("dk"));
  check("Kolmogorov–Smirnov with the mean and SD fitted rejects far less than 5 % (its p takes them as known)", size("ks") < 0.01, size("ks"));
  ps.sort((x, y) => x - y); let D = 0; ps.forEach((p, i) => { if (p <= 0.3) D = Math.max(D, Math.abs(p - (i + 1) / N), Math.abs(p - i / N)); });
  // Above about one half Royston's approximation of W's distribution runs high (0.934 of the p's below 0.95):
  // it was fitted to the lower tail, where decisions are made.
  check("Shapiro–Wilk's p is uniform under normal data below 0.3 (distance below its 99.9 % point)", D < 1.95 / Math.sqrt(N), D);
  let wInv = 0;
  for (let r = 0; r < 100; r++) {
    const m = 8 + Math.floor(mb() * 60), v = []; for (let i = 0; i < m; i++) v.push(gauss() * 3 + 1);
    const c = 2 ** Math.floor(mb() * 16 - 8), sh = Math.round(mb() * 400) / 4, w = v.map((x) => x * c + sh);
    for (const [f, k] of [[sw, "w"], [lf, "d"], [ad, "a2"], [dk, "k2"]]) wInv = Math.max(wInv, rel(f(w)[k], f(v)[k]));
    wInv = Math.max(wInv, rel(gr(w).rounds[0].G, gr(v).rounds[0].G));
  }
  check("W, D, A², K² and G are unmoved by a shift and a power of two (to the shifted values' own rounding)", wInv < 1e-10, wInv);
  const Gc = (m) => gr(Array.from({ length: m }, (_, i) => i)).rounds[0].Gc;
  check("Grubbs' critical values at 5 %, either side, as ASTM E178: 1.1543, 2.2900, 2.7082, 2.9085 (3, 10, 20, 30 values)",
    [[3, 1.1543], [10, 2.29], [20, 2.7082], [30, 2.9085]].every(([m, g]) => Math.abs(Gc(m) - g) < 6e-5), [3, 10, 20, 30].map(Gc).join(" "));
  const base = [0.46, 0.18, 1.34, -2.49, -1.05, 0.7, -0.32, 0.99, 0.25, -0.45, 1.39, 0.11, -0.22, 1.21, 0.64, -0.21, -1.48, -0.69];
  const rep = gr(base.concat([9, 6]), { side: "two", repeat: true }), one = gr(base.concat([9, 6]), { side: "two" });
  check("Grubbs repeated finds 9, then 6, then stops; once, 9 alone", rep.out.map((r) => r.value).join() === "9,6" && rep.rounds.length === 3 && !rep.rounds[2].out && one.rounds.length === 1 && one.out[0].row === 18, JSON.stringify(rep.rounds.map((r) => [r.value, +r.G.toFixed(3), r.out])));
  const mask = gr([1, 2, 3, 2, 1, 3, 2, 30, 2, 1, 3, 25], { side: "two", repeat: true });
  check("…and two outliers together mask each other (30 and 25 among twelve: nothing found), as Grubbs' test is known to", mask.out.length === 0);
  check("the tests refuse what they cannot test, in words", sw([1, 2]).fail && sw([2, 2, 2]).fail && ad([1, 2, 3]).fail && dk([1, 2, 3, 4, 5]).fail && dx(Array(31).fill(0).map((_, i) => i)).fail && /3 values or more/.test(sw([1]).fail));
}

// Comparing means and spreads (STATS_SPEC 2.3): each test's size under its null (20 000 samples, 99.9 % binomial
// interval), the t interval's and Cohen's d interval's coverage, the exact tests at or below their level.
{
  const mb = get("mulberry32")(2303), gauss = () => { let u = 0; while (u === 0) u = mb(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * mb()); };
  const t1 = get("tTest1"), t2 = get("tTest2"), tp = get("tTestPaired"), f2 = get("fTest2"), lv = get("leveneTest"), bt = get("bartlettTest"), p1 = get("propTest1"), fi = get("fisher22");
  const N = 20000, half = 3.29 * Math.sqrt(0.05 * 0.95 / N), cov = 3.29 * Math.sqrt(0.95 * 0.05 / N);
  const r = { one: 0, welch: 0, student: 0, paired: 0, F: 0, lev: 0, bf: 0, bart: 0, ci: 0, dci: 0, wl: 0 };
  const smp = (n, m, s) => Array.from({ length: n }, () => m + s * gauss());
  for (let i = 0; i < N; i++) {
    const a = smp(9, 5, 2), b = smp(14, 5, 2), c = smp(6, 5, 2), u = smp(8, 5, 1), w = smp(15, 5, 3), q = smp(12, 0.6, 1);
    const o = t1(a, { mu0: 5, dci: false }); if (o.p < 0.05) r.one++; if (o.ci[0] <= 5 && 5 <= o.ci[1]) r.ci++;
    if (i < 2000) { const dq = t1(q, { mu0: 0 }); if (dq.dci[0] <= 0.6 && 0.6 <= dq.dci[1]) r.dci++; }
    if (t2(u, w, { dci: false }).p < 0.05) r.welch++; if (t2(u, w, { equal: true, dci: false }).p < 0.05) r.wl++;
    if (t2(a, b, { equal: true, dci: false }).p < 0.05) r.student++;
    if (tp(a, smp(9, 0, 1).map((e, k) => a[k] + e), { dci: false }).p < 0.05) r.paired++;
    if (f2(a, b).p < 0.05) r.F++; if (lv([a, b, c], "mean").p < 0.05) r.lev++; if (lv([a, b, c], "median").p < 0.05) r.bf++; if (bt([a, b, c]).p < 0.05) r.bart++;
  }
  const sz = (k) => r[k] / N;
  for (const [k, nm] of [["one", "One-sample t"], ["welch", "Welch's t with unequal variances"], ["student", "Student's t with equal variances"], ["paired", "Paired t"], ["F", "The F test"], ["bart", "Bartlett's test"]])
    check(`${nm} rejects 5 % of samples under its null (±${(half * 100).toFixed(2)} %)`, Math.abs(sz(k) - 0.05) < half, sz(k));
  check("Brown and Forsythe's test is at or below its level under normal data (it is conservative there)", sz("bf") < 0.05 + half, sz("bf"));
  check("Levene's test about the means runs a little high with small samples (6 to 14 values: 5 to 8 %), as Brown and Forsythe found; SciPy's W is the same to 1e-15", sz("lev") > 0.05 - half && sz("lev") < 0.08, sz("lev"));
  check("Student's t with unequal variances and unequal sizes is not at its level (the reason Welch's is the default)", Math.abs(sz("wl") - 0.05) > 0.01, sz("wl"));
  check("the t interval covers the mean 95 % of the time", Math.abs(r.ci / N - 0.95) < cov, r.ci / N);
  check("Cohen's d's interval (the noncentral t inverted) covers the true d 95 % of the time (2000 samples)", Math.abs(r.dci / 2000 - 0.95) < 3.29 * Math.sqrt(0.95 * 0.05 / 2000), r.dci / 2000);
  let eb = 0, ef = 0; const M = 5000;
  for (let i = 0; i < M; i++) { let x = 0; for (let k = 0; k < 30; k++) if (mb() < 0.3) x++; if (p1(x, 30, { p0: 0.3 }).p < 0.05) eb++;
    let A = 0, B = 0; for (let k = 0; k < 12; k++) { if (mb() < 0.4) A++; if (mb() < 0.4) B++; } const f = fi(A, 12 - A, B, 12 - B); if (!f.fail && f.p < 0.05) ef++; }
  check("the exact binomial test is at or below its level", eb / M <= 0.05 + 3.29 * Math.sqrt(0.0475 / M), eb / M);
  check("Fisher's exact test is at or below its level", ef / M <= 0.05 + 3.29 * Math.sqrt(0.0475 / M), ef / M);
  const k = get("nctCdf"), D = get("DIST");
  check("the noncentral t at δ = 0 is Student's t", [-3, -0.5, 0.7, 4].every((t) => Math.abs(k(t, 7, 1e-300) - D.t.cdf(t, 7)) < 1e-15 || Math.abs(k(t, 7, 0) - D.t.cdf(t, 7)) < 1e-15));
  check("…and falls as δ rises", [-2, -1, 0, 1, 2, 4].every((d, i, a) => i === 0 || k(1.5, 9, d) < k(1.5, 9, a[i - 1])));
  check("the tests refuse what they cannot test, in words", /2 values/.test(t1([1]).fail) && /same/.test(t1([2, 2, 2]).fail) && /whole number/.test(p1(3.5, 10, {}).fail) && /empty/.test(fi(0, 0, 3, 4).fail));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
