/* The distributions' properties (ux/spec/FOUNDATION_SPEC.md, slice 1.4): what must hold whatever
   the reference says. The two tails add up to 1 where both are large; the quantile of a tail is
   the value it came from; t is symmetric; the distribution functions rise; the limits at 0 and ∞;
   the probabilities of counts add up to 1 and their tails to the sums of them. The values
   themselves are checked against 40-digit references by tools/ref-test.mjs and the fuzzer.
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
