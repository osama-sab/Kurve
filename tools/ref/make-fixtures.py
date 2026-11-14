"""Reference values for Kurve's numerics: special functions and distributions' tails in 40-digit
arithmetic (mpmath, refs.py), the statistical procedures by SciPy, NumPy and statsmodels.

    python3.13 -I tools/ref/make-fixtures.py [--check] [--pyref DIR]

Writes tools/ref/fixtures/<name>.json, each {"made": {...versions...}, "cases": [...]}, every case
{"fn": Kurve's function, "args": [...], "want": the reference's answer, "kind": what is compared}.
Numbers that are not finite are written as the strings "NaN", "Infinity", "-Infinity". The data
are made from fixed seeds, so the files are the same each time they are made with the same
versions. With --check nothing is written: the cases are made again and compared with the files
committed (to 1e-13 relative), and any difference is listed. See tools/ref/README.md.
"""
import json, math, os, sys, platform, datetime

here = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
check = "--check" in args
if "--pyref" in args:
    sys.path.insert(0, args[args.index("--pyref") + 1])
elif os.environ.get("PYREF"):
    sys.path.insert(0, os.environ["PYREF"])

import warnings
warnings.filterwarnings("ignore", message=".*scipy.odr.*")
import numpy as np
import scipy
from scipy import special, stats, optimize, odr
import statsmodels
import statsmodels.api as sm
sys.path.insert(0, here)  # -I leaves the script's own folder off the path
import refs

def j(v):
    """A value as JSON can hold it."""
    if isinstance(v, (list, tuple, np.ndarray)):
        return [j(x) for x in v]
    if isinstance(v, (np.floating, float)):
        v = float(v)
        if math.isnan(v): return "NaN"
        if math.isinf(v): return "Infinity" if v > 0 else "-Infinity"
        return v
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, dict):
        return {k: j(x) for k, x in v.items()}
    return v

MADE = {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__,
        "statsmodels": statsmodels.__version__, "mpmath": refs.mp.__version__}
out = {}

# ---------- special functions ----------
cases = []
for a in [0.5, 1, 2.5, 10, 50, 500, 5e4, 5e6]:
    for b in [0.5, 1, 3, 25, 400]:
        for x in [1e-10, 1e-3, 0.1, 0.5, 0.9, 0.999, 1 - 1e-10]:
            cases.append({"fn": "betai", "args": [a, b, x], "want": refs.betainc(a, b, x), "kind": "rel"})
for x in list(np.logspace(-3, 8, 45)) + [1, 2, 3, 0.5, 1.5, 100.5]:
    cases.append({"fn": "lgammaFn", "args": [x], "want": refs.gammaln(x), "kind": "abs-rel"})
    cases.append({"fn": "gammaln", "args": [x], "want": refs.gammaln(x), "kind": "abs-rel"})
for x in list(np.linspace(-6, 6, 49)) + [0.1, 1e-8, -1e-8, 2.4999, 2.5001]:
    cases.append({"fn": "erfFn", "args": [x], "want": refs.erf(x), "kind": "rel"})
for x in list(np.linspace(-6, 26, 65)) + [2.4999, 2.5001]:
    cases.append({"fn": "erfcFn", "args": [x], "want": refs.erfc(x), "kind": "rel"})
for p in [1e-300, 1e-100, 1e-20, 1e-10, 1e-5, 1e-3, 0.01, 0.02425, 0.1, 0.3, 0.5, 0.7, 0.9, 0.97575, 0.99, 1 - 1e-6, 1 - 1e-10]:
    cases.append({"fn": "probit", "args": [p], "want": refs.ndtri(p, special.ndtri(p)), "kind": "rel"})
for x in [0, 0.5, 1, 2, 4, 8, 20, 100]:
    for y in [0, 0.1, 0.5, 1, 3, 10]:
        cases.append({"fn": "faddeeva", "args": [x, y], "want": refs.wofz(x, y), "kind": "vec-rel"})
out["special"] = cases

# ---------- distributions Kurve has today ----------
cases = []
for dof in [1, 2, 5, 30, 1000, 1e5, 1e7]:
    for t in [0, 0.5, 1.96, 3, 10, 40, 1e3]:
        cases.append({"fn": "tPvalue", "args": [t, dof], "want": refs.t_two_sided(t, dof), "kind": "rel"})
for dof in [1, 2, 5, 30, 1000, 1e5]:
    for lev in [0.5, 0.9, 0.95, 0.99, 0.999, 0.999999]:
        cases.append({"fn": "tCrit", "args": [lev, dof], "want": refs.t_crit(lev, dof, stats.t.isf((1 - lev) / 2, dof)), "kind": "rel"})
for d1 in [1, 3, 10, 100]:
    for d2 in [1, 5, 30, 1000, 1e5]:
        for F in [0.1, 1, 3, 10, 100, 1e4]:
            cases.append({"fn": "fPvalue", "args": [F, d1, d2], "want": refs.f_sf(F, d1, d2), "kind": "rel"})
out["dist"] = cases

# ---------- the distributions of slice 1.4 (FOUNDATION_SPEC.md) ----------
cases = []
for a in [0.1, 0.5, 1, 3.5, 10, 30, 400, 5e4, 5e6]:
    for b in [0.1, 0.5, 2, 10, 300, 5e6]:
        cases.append({"fn": "lbeta", "args": [a, b], "want": refs.lbeta(a, b), "kind": "abs-rel"})
for a in [0.5, 1, 2.5, 10, 100, 1e4, 1e6]:
    for r in [1e-3, 0.3, 0.9, 1, 1.1, 2, 5]:
        x = a * r
        for k, up in [("igamPQ#0", False), ("igamPQ#1", True)]:
            try: v = refs.igam(a, x, up)
            except Exception: continue  # mpmath does not converge: a case left out, not a wrong one
            if v > 1e-300: cases.append({"fn": k, "args": [a, x], "want": v, "kind": "rel"})
for nu in [1, 2, 3, 7, 30, 1e3, 1e6]:
    for q in [0.4, 0.1, 0.025, 1e-3, 1e-6, 1e-12]:
        cases.append({"fn": "DIST.t.isf", "args": [q, nu], "want": refs.t_isf(q, nu, stats.t.isf(q, nu)), "kind": "rel"})
        cases.append({"fn": "DIST.chi2.isf", "args": [q, nu], "want": refs.chi2_isf(q, nu, stats.chi2.isf(q, nu)), "kind": "rel"})
    for t in [-3, -0.5, 0.5, 2, 6, 40]:
        cases.append({"fn": "DIST.t.sf", "args": [t, nu], "want": refs.t_sf(t, nu), "kind": "rel"})
for n, p in [(10, 0.5), (100, 0.01), (1000, 0.3), (5000, 0.999)]:
    for k in sorted({0, 1, int(n * p) - 3, int(n * p), int(n * p) + 3, n - 1}):
        if 0 <= k < n:
            cases.append({"fn": "DIST.binom.cdf", "args": [k, n, p], "want": refs.binom_cdf(k, n, p), "kind": "rel"})
for lam in [0.01, 1, 7.5, 100, 1e4, 1e6]:
    for z in [-3, -1, 0, 1, 3, 6]:
        k = max(0, int(lam + z * lam ** 0.5))
        try: cases.append({"fn": "DIST.pois.cdf", "args": [k, lam], "want": refs.igam(k + 1, lam, True), "kind": "rel"})
        except Exception: pass
out["stats"] = cases

# ---------- quantiles (R's type 7, NumPy's "linear") ----------
cases = []
rng = np.random.default_rng(7)
for n in [1, 2, 3, 4, 5, 7, 10, 19, 50]:
    s = np.sort(rng.normal(10, 3, n))
    for p in [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]:
        cases.append({"fn": "quantileSorted", "args": [list(s), p], "want": np.quantile(s, p, method="linear"), "kind": "rel"})
out["quantile"] = cases

# ---------- descriptive statistics (STATS_SPEC 2.1) ----------
# The reference is exact: the values as the doubles they are (Fraction), R's quantile algorithm
# (Hyndman and Fan's nine types, Tukey's hinges as R's fivenum) with p as the decimal it is written
# as, the moments as rationals, square roots and logarithms in 40 digits; one rounding at the end.
# SciPy and NumPy are compared with it as they are made, and a disagreement is printed.
from fractions import Fraction as Fr
hf, fl, desc_ref = refs.hf, refs.fl, refs.desc_ref
NPM = {1: "inverted_cdf", 2: "averaged_inverted_cdf", 3: "closest_observation", 4: "interpolated_inverted_cdf",
       5: "hazen", 6: "weibull", 7: "linear", 8: "median_unbiased", 9: "normal_unbiased"}
def scipy_desc(vals):
    """SciPy's answer for the statistics it has, to check the exact reference against."""
    a = np.array(vals, dtype=float); o = {}
    with np.errstate(all="ignore"):
        if len(a) >= 3: o["skew"] = stats.skew(a, bias=False)
        if len(a) >= 4: o["kurt"] = stats.kurtosis(a, bias=False)
        if a.min() > 0: o["gmean"] = stats.gmean(a); o["hmean"] = stats.hmean(a)
        o["mad"] = stats.median_abs_deviation(a); o["rsd"] = stats.median_abs_deviation(a, scale="normal")
        o["sd"] = np.std(a, ddof=1) if len(a) > 1 else None
    return o
rng = np.random.default_rng(21)
DATA = {
    "normal 50": list(rng.normal(10, 3, 50)),
    "lognormal 40": list(rng.lognormal(0, 1.2, 40)),
    "around zero 30": list(rng.normal(0, 1, 30)),
    "ties": [1.0, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 6, 6],
    "tied modes": [1.0, 1, 2, 2, 3],
    "one value": [3.5],
    "two values": [1.0, 4.0],
    "three": [2.0, 9.0, 4.0],
    "four": [1.5, 0.25, 8.0, 3.0],
    "all the same": [2.5] * 7,
    "1e13 offset": [1e13 + 0.2] + [1e13 + 0.1, 1e13 + 0.3] * 500,
    "1e-300 to 1e300": list(10.0 ** rng.uniform(-300, 300, 30)),
    "past 1e300": [1e-300, 2e-300, 5.0, 7.0, 1.5e308, 1.6e308, 1.7e308],
    "integers 0..19": [float(i) for i in range(20)],
}
cases = []; disagree = []
for name, vals in DATA.items():
    vals = [float(v) for v in vals]
    for vdiv in (["df", "n"] if name == "normal 50" else ["df"]):
        want = desc_ref(vals, vdiv); sc = scipy_desc(vals)
        for k, v in sc.items():
            if v is not None and k in want and want[k] is not None and not math.isnan(v) and abs(v - want[k]) > 1e-9 * max(abs(want[k]), 1e-300) and vdiv == "df":
                disagree.append(f"{name} {k}: SciPy {v!r}, exact {want[k]!r}")
        cases.append({"fn": "descStats", "args": [vals, {"vdiv": vdiv}], "want": want, "kind": "desc", "name": name})
    s = sorted(Fr(v) for v in vals); sf = np.sort(np.array(vals))
    for t in [1, 2, 3, 4, 5, 6, 7, 8, 9, "tukey"]:
        for ps in ["0", "0.1", "0.25", "0.5", "0.75", "0.9", "1"] if t != "tukey" else ["0.25", "0.5", "0.75"]:
            # p is the decimal written, as R's fuzz means it to be (0.9 times 30 is 27, not 27 and an ulp).
            w = fl(hf(s, Fr(ps), t))
            if t != "tukey" and len(vals) > 1:
                g = float(np.quantile(sf, float(ps), method=NPM[t]))
                if abs(g - w) > 1e-13 * max(abs(w), max(abs(v) for v in vals)): disagree.append(f"{name} type {t} p {ps}: NumPy {g!r}, exact {w!r}")
            cases.append({"fn": "quantileType", "args": [[float(x) for x in sf], float(ps), t], "want": w, "kind": "qt"})
for d in disagree: print("  reference check, desc:", d)
out["desc"] = cases

# ---------- normality and outliers (STATS_SPEC 2.2) ----------
# Each statistic in 40 digits from the doubles (refs.sw_ref, ksnorm_d_ref, ad_ref, dago_ref, grubbs_ref);
# Lilliefors' p from statsmodels' table at that distance, Kolmogorov's from SciPy's kstwo (checked against
# Durbin's matrix in 40 digits where n·d is small); Dixon's p by SciPy's adaptive dblquad. SciPy's and
# statsmodels' own answers are compared as they are made.
from statsmodels.stats._lilliefors import get_lilliefors_table
from statsmodels.stats.diagnostic import normal_ad
from scipy import integrate
LFT = get_lilliefors_table("norm")
rng = np.random.default_rng(22)
NS = {}
for n in [3, 4, 5, 6, 8, 11, 12, 20, 50, 200, 1000]: NS[f"normal {n}"] = list(rng.normal(10, 2, n))
for n in [8, 30, 300]: NS[f"log-normal {n}"] = list(rng.lognormal(0, 0.8, n)); NS[f"t3 {n}"] = list(rng.standard_t(3, n))
NS["uniform 40"] = list(rng.uniform(0, 1, 40)); NS["ties 25"] = [float(round(v)) for v in rng.normal(5, 1.5, 25)]
NS["1e9 offset 20"] = list(1e9 + rng.normal(0, 1, 20)); NS["outlier 15"] = list(rng.normal(0, 1, 14)) + [6.0]
cases = []; disagree = []
for name, v in NS.items():
    v = [float(t) for t in v]; n = len(v); a = np.array(v)
    w, p = refs.sw_ref(v); r = stats.shapiro(a)
    if abs(w - r.statistic) > 1e-13 or abs(p - r.pvalue) > 1e-8 * max(p, 1e-300): disagree.append(f"{name} Shapiro–Wilk: SciPy {r.statistic!r} {r.pvalue!r}, 40 digits {w!r} {p!r}")
    cases.append({"fn": "swTest", "args": [v], "want": {"w": w, "p": p}, "kind": "test", "name": name})
    if n >= 4:
        d = refs.ksnorm_d_ref(v)
        pl = float(LFT.prob(d, n)); pl = 0.001 if pl == LFT.alpha[0] else 0.99 if pl == LFT.alpha[-1] else pl  # the table's ends as written
        cases.append({"fn": "lfTest", "args": [v], "want": {"d": d, "p": pl}, "kind": "test", "name": name})
        pk = float(1 - refs.kolm_dmtw(n, d)) if 2 * math.ceil(n * d) - 1 <= 101 else stats.kstwo.sf(d, n)
        cases.append({"fn": "ksnTest", "args": [v], "want": {"d": d, "p": pk}, "kind": "test", "name": name})
    if n >= 8:
        a2, a2s = refs.ad_ref(v); a2sm, psm = normal_ad(a)
        if abs(a2 - a2sm) > 1e-9 * a2: disagree.append(f"{name} Anderson–Darling: statsmodels {a2sm!r}, 40 digits {a2!r}")
        cases.append({"fn": "adTest", "args": [v], "want": {"a2": a2, "as": a2s, "p": refs.ad_p(a2s)}, "kind": "test", "name": name})
        zs, zk, k2, pk = refs.dago_ref(v); nt = stats.normaltest(a)
        if abs(k2 - nt.statistic) > 1e-9 * k2: disagree.append(f"{name} K²: SciPy {nt.statistic!r}, 40 digits {k2!r}")
        cases.append({"fn": "dagoTest", "args": [v], "want": {"zs": zs, "zk": zk, "k2": k2, "p": pk}, "kind": "test", "name": name})
    if n >= 3 and max(v) > min(v):
        for side in ["two", "max", "min"]:
            G, gp, Gc = refs.grubbs_ref(v, side, 0.05)
            cases.append({"fn": "grubbsTest", "args": [v, {"side": side, "alpha": 0.05}], "want": {"G": G, "p": gp, "Gc": Gc}, "kind": "test", "name": f"{name} {side}"})
# Kolmogorov's distribution over its regions.
for n in [1, 2, 3, 5, 10, 40, 100, 140, 141, 500, 1000, 2000, 5000, 20000, 100001]:
    for x in [0.3 / n, 0.7 / n, 1.2 / n, 0.5 / math.sqrt(n), 0.9 / math.sqrt(n), 1.3 / math.sqrt(n), 2 / math.sqrt(n), 4 / math.sqrt(n), 0.3, 0.55, 0.9, 1 - 1.5 / n]:
        if not 0 < x < 1: continue
        c, s = stats.kstwo.cdf(x, n), stats.kstwo.sf(x, n)
        m = 2 * math.ceil(n * x) - 1; exact = False
        if (n <= 5000 and m <= 101) or (n <= 20000 and m <= 141):
            exact = True
            e = refs.kolm_dmtw(n, x)
            if abs(float(e) - c) > 1e-12 * max(c, 1e-300) + 1e-15: disagree.append(f"kstwo n={n} x={x}: SciPy cdf {c!r}, 40 digits {float(e)!r}")
            c = float(e)
            if 1 - e > 1e-20: s = float(1 - e)  # else 40 digits cannot see the tail: SciPy's (2·smirnov, exact there)
        # SciPy's Pelz–Good (n past 140, n·x^1.5 past 1.4, n·x² below 18) where no 40-digit answer was made: named apart.
        pg = not exact and n > 140 and not (n <= 100000 and n * x ** 1.5 <= 1.4) and n * x * x < 18
        cases.append({"fn": "kolmogN", "args": [n, x, True], "want": c, "kind": "rel", "pg": pg})
        cases.append({"fn": "kolmogN", "args": [n, x, False], "want": s, "kind": "rel", "pg": pg and n * x * x < 2.2})
# Dixon's Q: P(Q > q) for normal values, one end and either.
def dixon_ref(n, q, side):
    P = lambda lo: integrate.dblquad(lambda r, a: special.ndtr(0) * 0 + math.exp(-a * a / 2 - (a + r) ** 2 / 2) / (2 * math.pi) * max(special.ndtr(a + (1 - q) * r) - special.ndtr(a + lo * r), 0) ** (n - 2),
                                     -12, 12, 0, 24, epsabs=0, epsrel=1e-12)[0] * n * (n - 1)
    hi = P(0)
    return hi if side != "two" else 2 * hi - (P(q) if q < 0.5 else 0)
for n, q in [(3, 0.94), (3, 0.5), (4, 0.83), (5, 0.3), (6, 0.6275), (8, 0.45), (10, 0.3), (12, 0.7), (20, 0.25), (30, 0.26), (30, 0.6)]:
    for side in ["max", "two"]:
        cases.append({"fn": "dixonP", "args": [n, q, side], "want": dixon_ref(n, q, side), "kind": "rel"})
for d in disagree: print("  reference check, norm:", d)
out["norm"] = cases

# ---------- comparing means and spreads (STATS_SPEC 2.3) ----------
# t tests in 40 digits (refs.t_ref); d's interval by inverting Boost's noncentral t (SciPy's nct) with brentq;
# the variance tests, proportions and Fisher's test from SciPy and statsmodels; the noncentral t on a grid.
from scipy.stats.contingency import odds_ratio
from statsmodels.stats.proportion import proportions_ztest, confint_proportions_2indep
def dci_ref(t, nu, scale, conf):
    a = (1 - conf) / 2
    def g(q):
        h = lambda dl: stats.nct.cdf(t, nu, dl) - q; lo, hi, w = t - 3, t + 3, 3.0
        while h(lo) < 0: w *= 2; lo = t - w
        w = 3.0
        while h(hi) > 0: w *= 2; hi = t + w
        return optimize.brentq(h, lo, hi, xtol=1e-15, rtol=8.9e-16)
    return g(1 - a) * scale, g(a) * scale
cases = []; rng = np.random.default_rng(23); AM = {"two": "two-sided", "less": "less", "greater": "greater"}
for n1, n2 in [(3, 4), (6, 9), (15, 12), (40, 55), (200, 150)]:
    a = [float(v) for v in rng.normal(10, 2, n1)]; b = [float(v) for v in rng.normal(10.8, 3.5, n2)]; m = min(n1, n2)
    for alt in ["two", "less", "greater"]:
        w = refs.t_ref("one", a, mu0=9.5, alt=alt)
        if alt == "two": w["dci.0"], w["dci.1"] = dci_ref(w["t"], n1 - 1, 1 / math.sqrt(n1), 0.95)
        cases.append({"fn": "tTest1", "args": [a, {"mu0": 9.5, "alt": alt}], "want": w, "kind": "test", "name": f"one n={n1} {alt}"})
        for eq in [False, True]:
            w = refs.t_ref("two", a, b, alt=alt, equal=eq)
            if alt == "two": k = math.sqrt(1 / n1 + 1 / n2); w["dci.0"], w["dci.1"] = dci_ref(w["d"] / k, n1 + n2 - 2, k, 0.95)
            s = stats.ttest_ind(a, b, equal_var=eq, alternative=AM[alt])
            if abs(s.pvalue - w["p"]) > 1e-12 * max(w["p"], 1e-300): print("  reference check, t:", n1, n2, eq, alt, s.pvalue, w["p"])
            cases.append({"fn": "tTest2", "args": [a, b, {"alt": alt, "equal": eq}], "want": w, "kind": "test", "name": f"{'student' if eq else 'welch'} {n1},{n2} {alt}"})
        w = refs.t_ref("paired", a[:m], b[:m], alt=alt)
        cases.append({"fn": "tTestPaired", "args": [a[:m], b[:m], {"alt": alt}], "want": w, "kind": "test", "name": f"paired {m} {alt}"})
    c = [float(v) for v in rng.normal(0, 1, 11)]
    F = np.var(a, ddof=1) / np.var(b, ddof=1); d1, d2 = n1 - 1, n2 - 1
    cases.append({"fn": "fTest2", "args": [a, b, {}], "want": {"F": F, "p": 2 * min(stats.f.cdf(F, d1, d2), stats.f.sf(F, d1, d2)), "ci.0": F / stats.f.isf(0.025, d1, d2), "ci.1": F / stats.f.ppf(0.025, d1, d2)}, "kind": "test", "name": f"F {n1},{n2}"})
    for cen in ["mean", "median"]:
        L = stats.levene(a, b, c, center=cen); cases.append({"fn": "leveneTest", "args": [[a, b, c], cen], "want": {"W": L.statistic, "p": L.pvalue}, "kind": "test", "name": f"levene {cen} {n1},{n2}"})
    B = stats.bartlett(a, b, c); cases.append({"fn": "bartlettTest", "args": [[a, b, c]], "want": {"T": B.statistic, "p": B.pvalue}, "kind": "test", "name": f"bartlett {n1},{n2}"})
for x, n, p0 in [(7, 20, 0.5), (0, 10, 0.3), (10, 10, 0.3), (3, 50, 0.1), (45, 50, 0.8), (512, 1000, 0.5), (1, 3, 0.9), (60, 400, 0.12)]:
    for alt in ["two", "less", "greater"]:
        bt = stats.binomtest(x, n, p0, alternative=AM[alt]); cp = bt.proportion_ci(0.95, method="exact"); w = {"p": bt.pvalue, "ci.0": cp.low, "ci.1": cp.high}
        if alt == "two":
            wl = bt.proportion_ci(0.95, method="wilson"); z, pz = proportions_ztest(x, n, p0, prop_var=p0); w.update({"wilson.0": wl.low, "wilson.1": wl.high, "z": z, "pz": pz})
        cases.append({"fn": "propTest1", "args": [x, n, {"p0": p0, "alt": alt}], "want": w, "kind": "test", "name": f"{x}/{n} vs {p0} {alt}"})
for t in [(15, 40, 22, 38), (3, 25, 9, 30), (90, 200, 70, 210), (1, 12, 0, 15)]:
    z, pz = proportions_ztest([t[0], t[2]], [t[1], t[3]]); lo, hi = confint_proportions_2indep(t[0], t[1], t[2], t[3], method="newcomb", compare="diff")
    cases.append({"fn": "propTest2", "args": [*t, {}], "want": {"z": z, "p": pz, "ci.0": lo, "ci.1": hi}, "kind": "test", "name": f"two proportions {t}"})
for t in [(3, 1, 1, 3), (10, 2, 3, 15), (0, 5, 6, 2), (12, 30, 25, 8), (20, 18, 22, 25), (5, 0, 2, 9), (1, 9, 11, 3)]:
    for alt in ["two", "less", "greater"]:
        tab = [[t[0], t[1]], [t[2], t[3]]]; fe = stats.fisher_exact(tab, alternative=AM[alt]); o = odds_ratio(tab, kind="conditional"); ci = o.confidence_interval(0.95, alternative=AM[alt])
        cases.append({"fn": "fisher22", "args": [*t, {"alt": alt}], "want": {"p": fe.pvalue, "or": o.statistic, "ci.0": ci.low, "ci.1": ci.high}, "kind": "test", "name": f"fisher {t} {alt}"})
for nu in [1, 3, 9, 30, 200]:
    for dl in [-6, -1.5, 0.4, 2, 7, 20]:
        for t in [-8, -1, 0.2, 1.5, 4, 15, 50]:
            w = stats.nct.cdf(t, nu, dl)
            if math.isnan(w): print(f"  reference check, nct: SciPy (Boost) gives NaN at t={t} nu={nu} delta={dl}; left out"); continue
            cases.append({"fn": "nctCdf", "args": [t, nu, dl], "want": w, "kind": "abs"})
out["test23"] = cases

# ---------- one-way ANOVA (STATS_SPEC 2.4): the table and Welch's F exactly; the comparisons' tails ----------
def comp_ref(q, kind, conf, ctrl=0):
    """Each comparison's difference, SE, statistic, p and interval: the arithmetic in rationals and 40
    digits, the studentized range's tail and quantile from SciPy (its absolute accuracy, about 1e-15)."""
    from scipy.stats import studentized_range as SR
    means, ns, var, msw, df, k = q["means"], q["ns"], q["var"], q["msw"], q["df2"], q["k"]
    al = 1 - conf; pairs = [(i, j) for i in range(k) for j in range(i + 1, k)]; m = len(pairs); rows = []
    for i, j in pairs:
        d = means[i] - means[j]
        if kind == "tukey":
            se = refs.mp.sqrt(refs.mpq(msw / 2 * (Fr(1, ns[i]) + Fr(1, ns[j])))); qv = abs(refs.mpq(d)) / se; cr = SR.isf(al, k, df)
            rows.append({"diff": refs.fl(d), "se": float(se), "stat": float(qv), "p": SR.sf(float(qv), k, df), "lo": float(refs.mpq(d) - cr * se), "hi": float(refs.mpq(d) + cr * se)})
        elif kind == "gh":
            vi, vj = var[i] / ns[i], var[j] / ns[j]; s2 = vi + vj; dfi = s2 * s2 / (vi * vi / (ns[i] - 1) + vj * vj / (ns[j] - 1))
            se = refs.mp.sqrt(refs.mpq(s2 / 2)); qv = abs(refs.mpq(d)) / se; cr = SR.isf(al, k, float(dfi))
            rows.append({"diff": refs.fl(d), "se": float(se), "stat": float(qv), "p": SR.sf(float(qv), k, float(dfi)), "lo": float(refs.mpq(d) - cr * se), "hi": float(refs.mpq(d) + cr * se)})
        else:
            se = refs.mp.sqrt(refs.mpq(msw * (Fr(1, ns[i]) + Fr(1, ns[j])))); t = refs.mpq(d) / se; raw = refs.M(refs.t_two_sided(float(t), df))
            rows.append({"diff": refs.fl(d), "se": float(se), "t": t, "raw": raw})
    if kind in ("tukey", "gh"): return rows
    if kind == "scheffe":
        cr = refs.mp.sqrt((k - 1) * refs.M(stats.f.isf(al, k - 1, df)))
        for r in rows: Fv = r["t"] ** 2 / (k - 1); r.update({"stat": float(Fv), "p": refs.f_sf(Fv, k - 1, df), "lo": float(refs.M(r["diff"]) - cr * refs.M(r["se"])), "hi": float(refs.M(r["diff"]) + cr * refs.M(r["se"]))})
    elif kind == "holm":
        order = sorted(range(m), key=lambda i: rows[i]["raw"]); run = refs.M(0)
        for rank, i in enumerate(order): run = max(run, min(refs.M(1), (m - rank) * rows[i]["raw"])); rows[i].update({"stat": float(rows[i]["t"]), "p": float(run), "lo": None, "hi": None})
    else:
        q2 = {"bonf": al / (2 * m), "sidak": float(-refs.mp.expm1(refs.mp.log(refs.M(conf)) / m) / 2), "lsd": al / 2}[kind]; tc = refs.M(refs.t_isf(q2, df, stats.t.isf(q2, df)))
        for r in rows:
            p = r["raw"]; p = min(refs.M(1), m * p) if kind == "bonf" else -refs.mp.expm1(m * refs.mp.log1p(-p)) if kind == "sidak" else p
            r.update({"stat": float(r["t"]), "p": float(p), "lo": float(refs.M(r["diff"]) - tc * refs.M(r["se"])), "hi": float(refs.M(r["diff"]) + tc * refs.M(r["se"]))})
    for r in rows: r.pop("t", None); r.pop("raw", None)
    return rows
cases = []; rng = np.random.default_rng(24)
SETS = [("k=3, 5 each", [rng.normal(10, 1, 5) for _ in range(3)]),
        ("k=4, unequal n", [rng.normal(mu, 0.8, n) for mu, n in [(5, 5), (6.7, 6), (5.2, 4), (8, 5)]]),
        ("k=6, unequal n and spread", [rng.normal(mu, sd, n) for mu, sd, n in [(0, 1, 3), (0.5, 2, 12), (1, 0.5, 7), (-0.3, 1.5, 9), (2, 1, 5), (0.2, 3, 11)]]),
        ("k=2", [rng.normal(3, 1, 8), rng.normal(3.9, 1.4, 11)]),
        ("k=3 near 1e9", [1e9 + rng.normal(0, 0.01, 7) for _ in range(3)]),
        ("k=8, 4 each", [rng.normal(i * 0.3, 1, 4) for i in range(8)]),
        ("a group of one", [rng.normal(1, 1, 6), [2.5], rng.normal(1.4, 1, 5)])]
for name, gs in SETS:
    gs = [[float(v) for v in g] for g in gs]; r = refs.anova_ref(gs); q = r.pop("_q")
    s = stats.f_oneway(*gs)
    if abs(s.statistic - r["F"]) > 1e-9 * r["F"]: print("  reference check, f_oneway:", name, s.statistic, r["F"])
    cases.append({"fn": "anova1", "args": [gs], "want": r, "kind": "test", "name": name})
    if name in ("k=3 near 1e9", "a group of one"): continue
    for kind in ["tukey", "bonf", "holm", "sidak", "scheffe", "lsd", "gh"]:
        for conf in ([0.95, 0.99] if kind == "tukey" else [0.95]):
            cases.append({"fn": "anovaComp", "args": [gs, kind, {"conf": conf}], "want": comp_ref(q, kind, conf), "kind": "comp", "name": f"{name} {kind} {conf}"})
    if name == "k=4, unequal n":
        t = stats.tukey_hsd(*gs); w = comp_ref(q, "tukey", 0.95); k = len(gs); pairs = [(i, j) for i in range(k) for j in range(i + 1, k)]
        if max(abs(t.pvalue[i, j] - x["p"]) for (i, j), x in zip(pairs, w)) > 1e-12: print("  reference check, tukey_hsd p differs")
def nist_anova(name):
    lines = open(os.path.join(here, "nist", name), encoding="ascii").read().splitlines()
    cert = {}
    for l in lines:
        t = l.split()
        if l.strip().startswith("Between"): cert.update({"df1": int(t[2]), "ssb": float(t[3]), "msb": float(t[4]), "F": float(t[5])})
        if l.strip().startswith("Within"): cert.update({"df2": int(t[2]), "ssw": float(t[3]), "msw": float(t[4])})
        if "R-Squared" in l: cert["R2"] = float(t[-1])
        if "Standard Deviation" in l: cert["sd"] = float(t[-1])
    k = max(i for i, l in enumerate(lines) if l.strip().startswith("Data:"))
    rows = [l.split() for l in lines[k + 1:] if l.strip()]; by = {}
    for t, y in rows: by.setdefault(t, []).append(float(y))
    gs = list(by.values()); r = refs.anova_ref(gs); q = r.pop("_q")
    exact = {"ssb": r["ssb"], "ssw": r["ssw"], "F": r["F"], "msw": refs.fl(q["msw"])}
    return {"fn": "nistAnova", "args": [name], "want": exact, "info": cert, "kind": "nist", "name": name}
for nm in ["SiRstv", "SmLs01", "SmLs02", "SmLs03", "SmLs04", "SmLs05", "SmLs06", "SmLs07", "SmLs08", "SmLs09", "AtmWtAg"]:
    cases.append(nist_anova(nm + ".dat"))
out["anova"] = cases

# ---------- rank tests (STATS_SPEC 2.8): SciPy for the statistics and p; the Hodges–Lehmann intervals,
# Dunn's z and the sign test's interval exactly (refs.py) ----------
cases = []; rng = np.random.default_rng(28); AM = {"two": "two-sided", "less": "less", "greater": "greater"}
def rplus(d, pratt):
    z = [v for v in d if pratt or v != 0]; r = stats.rankdata([abs(v) for v in z])
    return float(sum(ri for ri, v in zip(r, z) if v > 0))
SAMPLES = [("small", [float(v) for v in rng.normal(0, 1, 9)], [float(v) for v in rng.normal(0.9, 1.3, 12)], True),
           ("ties", [1, 2, 2, 3, 4, 4, 4, 5.5, 6], [2, 3, 3, 5, 7, 7, 8, 9], False),
           ("large", [float(v) for v in rng.normal(0, 1, 60)], [float(v) for v in rng.normal(0.4, 1, 75)], False),
           ("tiny", [3.1, 4.7], [5.2, 6.0, 7.9], True)]
for name, a, b, ex in SAMPLES:
    for alt in ["two", "less", "greater"]:
        r = stats.mannwhitneyu(a, b, alternative=AM[alt], method="exact" if ex else "asymptotic", use_continuity=True)
        w = {"U": r.statistic, "p": r.pvalue}; w.update(refs.hl_ref("two", a, b, alt, 0.95, ex))
        cases.append({"fn": "mwTest", "args": [a, b, {"alt": alt}], "want": w, "kind": "test", "name": f"mw {name} {alt}"})
        r = stats.ks_2samp(a, b, alternative=AM[alt], method="exact")
        cases.append({"fn": "ks2Test", "args": [a, b, {"alt": alt}], "want": {"D": r.statistic, "p": r.pvalue}, "kind": "test", "name": f"ks {name} {alt}"})
    r = stats.ks_2samp(a, b, method="asymp"); cases.append({"fn": "ks2Test", "args": [a, b, {"exact": "asymp"}], "want": {"D": r.statistic, "p": r.pvalue}, "kind": "test", "name": f"ks {name} asymp"})
ONE = [("small", [float(v) for v in rng.normal(0.4, 1, 15)], True), ("ties+zeros", [0.5, -1, 2, 2, -0.5, 3, 0, 1.5, -2, 2.5, 0, 4], False),
       ("large", [float(v) for v in rng.normal(0.25, 1, 70)], False)]
for name, v, ex in ONE:
    for alt in ["two", "less", "greater"]:
        for z in ["wilcox", "pratt"]:
            if ex and z == "pratt": continue
            r = stats.wilcoxon(v, alternative=AM[alt], zero_method=z, correction=True, method="exact" if ex else "approx")
            w = {"Tp": rplus(v, z == "pratt"), "p": r.pvalue}
            if z == "wilcox": w.update(refs.hl_ref("one", v, None, alt, 0.95, ex))
            cases.append({"fn": "wsrTest", "args": [v, {"alt": alt, "zero": z}], "want": w, "kind": "test", "name": f"wsr {name} {alt} {z}"})
        up = sum(1 for t in v if t > 0); n = sum(1 for t in v if t != 0); s = sorted(Fr(t) for t in v); N = len(s); a1 = Fr(1 - 0.95) / 2 if alt == "two" else Fr(1 - 0.95)
        cdf = lambda k: sum(math.comb(N, i) for i in range(k + 1)) * Fr(1, 2 ** N); k = 0
        while k + 1 <= N and cdf(k) <= a1: k += 1
        lo, hi = (refs.fl(s[k - 1]), refs.fl(s[N - k])) if k >= 1 else (-math.inf, math.inf)
        ci = [-math.inf, hi] if alt == "less" else [lo, math.inf] if alt == "greater" else [lo, hi]
        cases.append({"fn": "signTest", "args": [v, {"alt": alt}], "want": {"p": stats.binomtest(up, n, 0.5, alternative=AM[alt]).pvalue, "ci.0": ci[0], "ci.1": ci[1]}, "kind": "test", "name": f"sign {name} {alt}"})
def dunn_ref(groups, adj):
    from collections import Counter
    G = [[Fr(v) for v in g] for g in groups]; allv = [v for g in G for v in g]; N = len(allv); r = stats.rankdata([float(v) for v in allv])
    rk = [Fr(x).limit_denominator(2) for x in r]; tie = sum(t ** 3 - t for t in Counter(allv).values()); at = 0; mr = []
    for g in G: mr.append(sum(rk[at:at + len(g)]) / len(g)); at += len(g)
    base = Fr(N * (N + 1), 12) - Fr(tie, 12 * (N - 1)); out = []
    for i in range(len(G)):
        for j in range(i + 1, len(G)):
            z = refs.mpq(mr[i] - mr[j]) / refs.mp.sqrt(refs.mpq(base * (Fr(1, len(G[i])) + Fr(1, len(G[j])))))
            out.append([z, refs.mp.erfc(abs(z) / refs.mp.sqrt(2))])
    m = len(out)
    if adj == "bonf": ps = [min(refs.M(1), m * p) for _, p in out]
    else:
        order = sorted(range(m), key=lambda i: out[i][1]); ps = [None] * m; run = refs.M(0)
        for q, i in enumerate(order): run = max(run, min(refs.M(1), (m - q) * out[i][1])); ps[i] = run
    return [{"z": float(z), "p": float(p)} for (z, _), p in zip(out, ps)]
for name, gs in [("three", [[float(v) for v in rng.normal(mu, 1, n)] for mu, n in [(0, 8), (0.6, 10), (1.1, 7)]]),
                 ("ties", [[1, 2, 2, 3, 4], [2, 3, 3, 5, 7, 7], [3, 3, 4, 9, 1], [5, 6, 6, 7]])]:
    r = stats.kruskal(*gs)
    for adj in ["holm", "bonf"]:
        cases.append({"fn": "kwTest", "args": [gs, {"adj": adj}], "want": {"H": r.statistic, "p": r.pvalue, "dunn": dunn_ref(gs, adj)}, "kind": "kw", "name": f"kw {name} {adj}"})
    m = stats.median_test(*gs); cases.append({"fn": "moodTest", "args": [gs], "want": {"X": m.statistic, "p": m.pvalue, "med": m.median}, "kind": "test", "name": f"mood {name}"})
    m = stats.median_test(*gs[:2]); cases.append({"fn": "moodTest", "args": [gs[:2]], "want": {"X": m.statistic, "p": m.pvalue}, "kind": "test", "name": f"mood {name} two"})
for name, rows in [("4 by 10", [[float(v) for v in rng.normal(i * 0.15, 1, 4)] for i in range(10)]), ("ties", [[1, 1, 2, 3], [2, 3, 3, 3], [4, 1, 2, 2], [5, 6, 7, 1], [2, 2, 2, 3]])]:
    r = stats.friedmanchisquare(*np.array(rows).T)
    cases.append({"fn": "friedmanTest", "args": [rows], "want": {"Q": r.statistic, "p": r.pvalue}, "kind": "test", "name": f"friedman {name}"})
out["np"] = cases

# ---------- correlation (STATS_SPEC 2.9): r, ρ, τ-b and partial r exactly (rationals, 40 digits; refs.py) ----------
cases = []; rng = np.random.default_rng(29)
def pairs(n, rho, off=0.0, scale=1.0):
    x = rng.normal(0, 1, n); y = rho * x + math.sqrt(1 - rho * rho) * rng.normal(0, 1, n)
    return [float(off + scale * v) for v in x], [float(off + scale * v) for v in y]
SETS = [("20", *pairs(20, 0.5)), ("12 ties", [1, 2, 2, 3, 4, 4, 5, 6, 6, 6, 8, 9], [2, 1, 3, 3, 5, 4, 4, 7, 8, 6, 9, 9]),
        ("300", *pairs(300, 0.15)), ("offset 1e9", *pairs(25, -0.7, 1e9, 1e-3)), ("weak 8", *pairs(8, 0.05)),
        ("near 1", *pairs(40, 1 - 1e-9)), ("near −1", *pairs(60, -(1 - 1e-12), 3.5, 2.0))]
for name, x, y in SETS:
    for alt in ["two", "less", "greater"]:
        for conf in ([0.95, 0.99] if alt == "two" else [0.95]):
            cases.append({"fn": "corrTest", "args": [x, y, {"alt": alt, "conf": conf}], "want": refs.corr_ref(x, y, alt, conf), "kind": "test", "name": f"r {name} {alt} {conf}"})
        cases.append({"fn": "spearmanTest", "args": [x, y, {"alt": alt}], "want": refs.spearman_ref(x, y, alt), "kind": "test", "name": f"rho {name} {alt}"})
        if name != "offset 1e9" or alt == "two":
            cases.append({"fn": "kendallTau", "args": [x, y, {"alt": alt}], "want": refs.kendall_ref(x, y, alt), "kind": "test", "name": f"tau {name} {alt}"})
k14 = pairs(14, 0.6); k60 = pairs(60, 0.3)
for name, (x, y) in [("14 exact", k14), ("60 normal", k60)]:
    for alt in ["two", "less", "greater"]:
        cases.append({"fn": "kendallTau", "args": [x, y, {"alt": alt}], "want": refs.kendall_ref(x, y, alt), "kind": "test", "name": f"tau {name} {alt}"})
for name, n, k in [("3 of 30", 30, 3), ("4 of 18", 18, 4), ("4 of 200", 200, 4)]:
    base = rng.normal(0, 1, n); cols = [[float(b * 0.6 + rng.normal(0, 1)) for b in base] for _ in range(k)]
    cases.append({"fn": "partialCorr", "args": [cols], "want": {"rows": refs.partial_ref(cols)}, "kind": "partial", "name": f"partial {name}"})
out["corr"] = cases

# ---------- counts in tables (STATS_SPEC 2.10): χ², G, V, Freeman–Halton and McNemar exactly (refs.py) ----------
cases = []; rng = np.random.default_rng(210)
TABS = [("2x2", [[12, 5], [7, 15]]), ("2x2 small", [[3, 1], [1, 3]]), ("2x3", [[10, 20, 30], [6, 9, 17]]), ("3x3 zeros", [[0, 4, 9], [5, 0, 2], [8, 3, 0]]),
        ("3x4", [[int(v) for v in rng.integers(1, 30, 4)] for _ in range(3)]), ("large 2x3", [[1200, 800, 600], [900, 1100, 700]]), ("5x2", [[int(v) for v in rng.integers(2, 40, 2)] for _ in range(5)])]
for name, T in TABS:
    for y in [True, False]:
        if not y and (len(T) > 2 or len(T[0]) > 2): continue
        cases.append({"fn": "chi2Indep", "args": [T, {"yates": y}], "want": refs.xtab_ref(T, y), "kind": "test", "name": f"chi2 {name} {'yates' if y else 'plain'}"})
    s = stats.chi2_contingency(T, correction=True); w = refs.xtab_ref(T, True)
    assert abs(s.statistic - w["X2"]) <= 1e-9 * max(1, w["X2"]), (name, s.statistic, w["X2"])
SMALL = [("2x2", [[12, 5], [7, 15]]), ("2x2 small", [[3, 1], [1, 3]]), ("2x3", [[3, 1, 4], [1, 5, 2]]), ("3x3", [[2, 0, 3], [1, 4, 0], [0, 2, 5]]), ("2x4", [[5, 2, 0, 3], [1, 4, 6, 2]]), ("3x2 zeros", [[0, 7], [6, 0], [3, 4]])]
for name, T in SMALL:
    cases.append({"fn": "fisherRC", "args": [T], "want": {"p": refs.fisher_rc_ref(T)}, "kind": "test", "name": f"fisher {name}"})
from statsmodels.stats.contingency_tables import mcnemar as sm_mcnemar
for name, T in [("balanced", [[30, 12], [5, 40]]), ("small", [[10, 3], [1, 8]]), ("equal", [[5, 6], [6, 5]]), ("large", [[500, 210], [160, 900]])]:
    for cc in [True, False]:
        w = refs.mcnemar_ref(T[0][1], T[1][0], cc)
        s = sm_mcnemar(T, exact=False, correction=cc); assert abs(s.statistic - w["X2"]) <= 1e-12 * max(1, w["X2"]), (name, s.statistic, w)
        cases.append({"fn": "mcnemarTest", "args": [T, {"cc": cc}], "want": w, "kind": "test", "name": f"mcnemar {name} {cc}"})
out["xtab"] = cases

# ---------- the studentized range and Dunnett's distribution, 40 digits (slow: made with --slow) ----------
def _slow(c):
    fn, a = c
    deep = a[0] >= 7  # far tails: more digits for the subtraction the reference carries
    return refs.tukey_sf_ref(*a, dps=45 if deep else 30) if fn == "tukeySf" else refs.dunnett_sf_ref(*a, dps=45 if deep else 30)
if "--slow" in args:
    import multiprocessing as mpc
    sl = []
    for k in [3, 5, 10, 20]:
        for nu in [2, 7.5, 30, 300, math.inf]:
            for q in [2.0, 4.0, 7.0, 12.0]:
                sl.append(("tukeySf", (q, k, nu)))
    sl += [("tukeySf", (25.0, 4, 60)), ("tukeySf", (30.0, 3, 1)), ("tukeySf", (0.5, 3, 2)), ("tukeySf", (6.0, 50, 1000))]
    h = 0.5 ** 0.5
    for lam, nu, two in [([h, h], 6, True), ([h, h, h], 20, True), ([h] * 5, 40, True), ([0.6, 0.6, 0.6], 20, True), ([0.3, 0.9, 0.7], 15, True), ([0.99, 0.2], 8, True), ([0.7, 0.7], 50, False), ([h, h, h], math.inf, True)]:
        for c in [1.5, 2.5, 4.0, 7.0]:
            sl.append(("dunnettSf", (c, lam, nu, two)))
    with mpc.Pool(4) as pool: vals = pool.map(_slow, sl)
    out["range"] = [{"fn": fn, "args": [*a], "want": v, "kind": "rel"} for (fn, a), v in zip(sl, vals)]

# ---------- distributions fitted to values ----------
def ks_exact(d, n):
    """Kolmogorov's tail: 40-digit Durbin matrix where it is small, else SciPy's kstwo."""
    return float(1 - refs.kolm_dmtw(n, d)) if 2 * math.ceil(n * d) - 1 <= 101 and n * d * d < 4 else stats.kstwo.sf(d, n)
cases = []
rng = np.random.default_rng(11)
for n in [5, 20, 200]:
    v = rng.normal(3, 2, n)
    ks = stats.kstest(v, stats.norm(v.mean(), v.std(ddof=1)).cdf)
    cases.append({"fn": "distFit", "args": [list(v), "normal"], "kind": "fields",
                  "want": {"p": [v.mean(), v.std(ddof=1)], "ks": ks.statistic},
                  "info": {"pks_exact": ks_exact(ks.statistic, n)}})
    w = rng.lognormal(0.5, 0.4, n)
    L = np.log(w)
    ks = stats.kstest(w, stats.lognorm(L.std(ddof=1), 0, math.exp(L.mean())).cdf)
    cases.append({"fn": "distFit", "args": [list(w), "lognormal"], "kind": "fields",
                  "want": {"p": [L.mean(), L.std(ddof=1)], "ks": ks.statistic},
                  "info": {"pks_exact": ks_exact(ks.statistic, n)}})
    e = rng.exponential(2.5, n)
    ks = stats.kstest(e, stats.expon(0, e.mean()).cdf)
    cases.append({"fn": "distFit", "args": [list(e), "exp"], "kind": "fields",
                  "want": {"p": [1 / e.mean()], "ks": ks.statistic},
                  "info": {"pks_exact": ks_exact(ks.statistic, n)}})
out["distfit"] = cases

# ---------- fits ----------
cases = []
rng = np.random.default_rng(3)
x = np.linspace(0, 10, 60)
f = lambda x, A, tau, c: A * np.exp(-x / tau) + c
y = f(x, 5.0, 2.0, 0.3) + rng.normal(0, 0.05, x.size)
p, cov = optimize.curve_fit(f, x, y, p0=[4, 1.5, 0], xtol=1e-14, ftol=1e-14, gtol=1e-14, maxfev=20000)
cases.append({"fn": "lmFit", "model": "expdec-c", "x": list(x), "y": list(y), "p0": [4, 1.5, 0], "kind": "fit",
              "want": {"params": list(p), "errors": list(np.sqrt(np.diag(cov)))}})
g = lambda x, xc, A, w, c: A / (w / (2 * math.sqrt(2 * math.log(2))) * math.sqrt(2 * math.pi)) * np.exp(-0.5 * ((x - xc) / (w / (2 * math.sqrt(2 * math.log(2))))) ** 2) + c
x2 = np.linspace(-5, 15, 120)
y2 = g(x2, 4.0, 30.0, 3.0, 1.0) + rng.normal(0, 0.1, x2.size)
p, cov = optimize.curve_fit(g, x2, y2, p0=[3.5, 25, 2.5, 0.8], xtol=1e-14, ftol=1e-14, gtol=1e-14, maxfev=20000)
cases.append({"fn": "lmFit", "model": "gauss-c", "x": list(x2), "y": list(y2), "p0": [3.5, 25, 2.5, 0.8], "kind": "fit",
              "want": {"params": list(p), "errors": list(np.sqrt(np.diag(cov)))}})
# Weighted: errors given and taken as they are (absolute_sigma).
s3 = 0.02 + 0.03 * rng.random(x.size)
y3 = f(x, 5.0, 2.0, 0.3) + rng.normal(0, 1, x.size) * s3
p, cov = optimize.curve_fit(f, x, y3, p0=[4, 1.5, 0], sigma=s3, absolute_sigma=True, xtol=1e-14, ftol=1e-14, gtol=1e-14, maxfev=20000)
cases.append({"fn": "lmFit", "model": "expdec-c", "x": list(x), "y": list(y3), "sy": list(s3), "p0": [4, 1.5, 0], "kind": "fit-abs",
              "want": {"params": list(p), "errors": list(np.sqrt(np.diag(cov)))}})
# Orthogonal distance: a straight line with errors in X and Y (ODRPACK's answer).
xt = np.linspace(0, 10, 30)
sx = 0.2 + 0.1 * rng.random(xt.size)
sy = 0.3 + 0.1 * rng.random(xt.size)
xo = xt + rng.normal(0, 1, xt.size) * sx
yo = 1.5 + 0.8 * xt + rng.normal(0, 1, xt.size) * sy
fit = odr.ODR(odr.RealData(xo, yo, sx=sx, sy=sy), odr.Model(lambda b, x: b[0] + b[1] * x), beta0=[1, 1], maxit=1000)
fit.set_job(fit_type=0)
r = fit.run()
cases.append({"fn": "odrFit", "model": "line", "x": list(xo), "y": list(yo), "sx": list(sx), "sy": list(sy), "p0": [1, 1], "kind": "fit-odr",
              "want": {"params": list(r.beta)},
              "info": {"sd_beta": list(r.sd_beta), "cov_beta": [list(c) for c in r.cov_beta], "res_var": r.res_var}})
out["fits"] = cases

# ---------- NIST: Norris's straight line, with statsmodels beside the certified values ----------
def nist(name):
    lines = open(os.path.join(here, "nist", name), encoding="ascii").read().splitlines()
    k = max(i for i, l in enumerate(lines) if l.strip().startswith("Data:"))  # the last: the header has one too
    rows = [l.split() for l in lines[k + 1:] if l.strip()]
    return np.array([[float(v) for v in r] for r in rows])
d = nist("Norris.dat")
yN, xN = d[:, 0], d[:, 1]
ols = sm.OLS(yN, sm.add_constant(xN)).fit()
out["nist"] = [{"fn": "norris", "kind": "info", "want": {"params": list(ols.params), "bse": list(ols.bse),
                "rsquared": ols.rsquared, "resid_sd": math.sqrt(ols.scale)}}]

# ---------- the linear model (STATS_SPEC 2.5): every number exactly (refs.lm_ref: rationals to the square roots) ----------
cases = []; rng = np.random.default_rng(25)
def lmcase(name, vars_, y, spec, exact=False):
    c = {"fn": "linModel", "name": name, "vars": vars_, "y": [float(v) for v in y], "spec": spec, "want": refs.lm_ref(vars_, [float(v) for v in y], spec)}
    if exact: c["exact"] = True
    cases.append(c); return c
d = nist("Norris.dat"); lmcase("Norris", [{"name": "x", "num": True, "x": [float(v) for v in d[:, 1]]}], d[:, 0], {})
import csv as _csv
_lp = os.path.join(os.path.dirname(sm.__file__), "datasets", "longley", "longley.csv")
_rows = list(_csv.reader(open(_lp))); _hd = _rows[0]; _ld = [[float(v) for v in r] for r in _rows[1:]]
c = lmcase("Longley", [{"name": _hd[k], "num": True, "x": [r[k] for r in _ld]} for k in range(2, 8)], [r[1] for r in _ld], {})
# NIST's certified Longley values (statsmodels' results_regression.Longley): the exact reference agrees with them
_cert_b = [-3482258.63459582, 15.0618722713733, -0.358191792925910E-01, -2.02022980381683, -1.03322686717359, -0.511041056535807E-01, 1829.15146461355]
_cert_se = [890420.383607373, 84.9149257747669, 0.334910077722432E-01, 0.488399681651699, 0.214274163161675, 0.226073200069370, 455.478499142212]
for i in range(7):
    assert abs(c["want"]["b"][i] - _cert_b[i]) <= 1e-13 * abs(_cert_b[i]) and abs(c["want"]["se"][i] - _cert_se[i]) <= 1e-13 * _cert_se[i], ("Longley", i)
xs = [float(i) for i in range(21)]
lmcase("Wampler 1", [{"name": "x", "num": True, "x": xs}], [1 + x + x**2 + x**3 + x**4 + x**5 for x in xs], {"pow": 5}, exact=True)
lmcase("Wampler 2", [{"name": "x", "num": True, "x": xs}], [float(repr(1 + x/10 + x**2/100 + x**3/1000 + x**4/1e4 + x**5/1e5)) for x in xs], {"pow": 5})
# a polynomial of degree 10 on x from −8.8 to −3.1, as hard as NIST's Filip (82 points, seven digits)
fx = sorted(round(-3.13 - 5.65 * float(rng.random()), 7) for _ in range(82))
fy = [round(0.8 + 0.01 * math.sin(3 * x) + 0.002 * x + 0.0005 * float(rng.normal()), 7) for x in fx]
lmcase("degree 10, as Filip", [{"name": "x", "num": True, "x": fx}], fy, {"pow": 10})
# factors and a covariate, unbalanced; every type and coding; contrasts
n = 40; A = [int(v) for v in rng.integers(0, 3, n)]; B = [int(v) for v in rng.integers(0, 2, n)]; X = [round(float(v), 3) for v in rng.uniform(0, 10, n)]
Y = [round(2 + [0, 1.5, -1][a] + 0.7 * b + 0.3 * x + 0.4 * (a == 1) * b + float(rng.normal()), 4) for a, b, x in zip(A, B, X)]
VA = {"name": "A", "num": False, "code": A, "levels": ["a1", "a2", "a3"]}; VB = {"name": "B", "num": False, "code": B, "levels": ["lo", "hi"]}; VX = {"name": "x", "num": True, "x": X}
CON = [{"text": "A[a2] − A[a3]", "L": {"A[a2]": 1, "A[a3]": -1}, "c": 0}, {"text": "x + 2 x:B[hi] = 0.5", "L": {"x": 1, "B[hi]:x": 2}, "c": 0.5}]
for ss in (1, 2, 3):
    for cod in ("treat", "effect"):
        sp = {"inter": "pairs", "ss": ss, "coding": cod}
        if cod == "treat": sp["con"] = CON
        lmcase(f"A, B, x and pairs, type {ss}, {cod}", [VA, VB, VX], Y, sp)
lmcase("A, B, x, every combination, 99%", [VA, VB, VX], Y, {"inter": "all", "ss": 3, "conf": 0.99})
B2 = [0 if a == 2 else b for a, b in zip(A, B)]
lmcase("an empty cell, type II", [VA, dict(VB, code=B2)], Y, {"inter": "pairs", "ss": 2, "con": [{"text": "A[a2] − A[a3]", "L": {"A[a2]": 1, "A[a3]": -1}, "c": 0}]})
lmcase("an empty cell, type I", [VA, dict(VB, code=B2)], Y, {"inter": "pairs", "ss": 1})
lmcase("no intercept", [VA, VX], Y, {"icpt": False, "ss": 1})
lmcase("a column repeated", [VX, dict(VX, name="x2")], Y, {})
lmcase("the mean alone", [], Y, {})
# large values: a constant far larger than the spread (as NIST's NumAcc)
big = [1e8 + v for v in X]; lmcase("x near 1e8", [{"name": "x", "num": True, "x": big}], [3e9 + 2 * v + float(rng.normal()) for v in X], {})
# statsmodels' OLS and anova_lm agree with the exact reference (types II and III, sum coding for III)
import pandas as pd, statsmodels.formula.api as smf
df = pd.DataFrame({"y": Y, "A": [["a1", "a2", "a3"][a] for a in A], "B": [["lo", "hi"][b] for b in B], "x": X})
# (type I depends on the terms' order, and statsmodels' formulas put the terms of factors alone first: II and III only)
for ss, form in [(2, "y ~ C(A) + C(B) + x + C(A):C(B) + C(A):x + C(B):x"), (3, "y ~ C(A, Sum) + C(B, Sum) + x + C(A, Sum):C(B, Sum) + C(A, Sum):x + C(B, Sum):x")]:
    fit = smf.ols(form, df).fit(); tab = sm.stats.anova_lm(fit, typ=ss); w = [c for c in cases if c["name"] == f"A, B, x and pairs, type {ss}, treat"][0]["want"]
    nm = lambda t: t.replace("C(A, Sum)", "A").replace("C(B, Sum)", "B").replace("C(A)", "A").replace("C(B)", "B")
    by = {nm(k): v for k, v in tab["sum_sq"].items()}; terms = ["A", "B", "x", "A:B", "A:x", "B:x"]
    got = [by[t] for t in terms]; want = [r["ss"] for r in w["anova"]]
    assert all(abs(g - v) <= 1e-9 * max(1, abs(v)) for g, v in zip(got, want)), (ss, got, want)
out["lm"] = cases

# ---------- two- and three-way ANOVA (STATS_SPEC 2.6): estimated means, differences, simple effects, exactly ----------
cases = []; rng = np.random.default_rng(26)
def nwcase(name, vars_, y, spec):
    spec = dict(spec, inter=spec.get("inter", "all")); w = refs.nway_ref(vars_, y, spec)
    cases.append({"fn": "nway", "name": name, "vars": vars_, "y": [float(v) for v in y], "spec": spec, "want": w})
def nwfac(nm, L, n): return {"name": nm, "num": False, "levels": [f"{nm.lower()}{i+1}" for i in range(L)], "code": [int(v) for v in rng.integers(0, L, n)]}
A = {"name": "A", "num": False, "levels": ["a1", "a2", "a3"], "code": [i // 4 for i in range(12)]}; B = {"name": "B", "num": False, "levels": ["b1", "b2"], "code": [(i // 2) % 2 for i in range(12)]}
nwcase("balanced 3 x 2", [A, B], [round(float(v), 3) for v in rng.normal(10, 2, 12)], {"ss": 3})
for t in (1, 2, 3):
    while True:
        A2, B2 = nwfac("A", 3, 40), nwfac("B", 2, 40)
        if len(set(zip(A2["code"], B2["code"]))) == 6: break
    nwcase(f"unbalanced 3 x 2, type {t}", [A2, B2], [round(5 + a + 0.5 * b + float(rng.normal()), 4) for a, b in zip(A2["code"], B2["code"])], {"ss": t})
while True:
    A3, B3, C3 = nwfac("A", 2, 60), nwfac("B", 3, 60), nwfac("C", 2, 60)
    if len(set(zip(A3["code"], B3["code"], C3["code"]))) == 12: break
y3 = [round(float(rng.normal(20, 3)), 3) for _ in range(60)]
nwcase("unbalanced 2 x 3 x 2", [A3, B3, C3], y3, {"ss": 3}); nwcase("2 x 3 x 2, no interactions", [A3, B3, C3], y3, {"ss": 2, "inter": "none"})
while True:
    A4, B4 = nwfac("A", 4, 50), nwfac("B", 3, 50)
    if len(set(zip(A4["code"], B4["code"]))) == 12: break
nwcase("unbalanced 4 x 3, about 1e6", [A4, B4], [1e6 + round(float(v), 3) for v in rng.normal(0, 0.01, 50)], {"ss": 3})
out["nway"] = cases

# ---------- repeated measures (STATS_SPEC 2.7): every number from rational projections (refs.rm_ref); statsmodels' AnovaRM asserted ----------
cases = []; rng = np.random.default_rng(27)
def rmsubj(n, c, off=0.0, sd=1.0): return [[round(off + float(v), 4) for v in rng.normal(rng.normal(0, 2), sd, c)] for _ in range(n)]
def rmcase(name, Y, lv, grp=None): cases.append({"fn": "rmAnova", "name": name, "args": [Y, lv, grp], "want": refs.rm_ref(Y, lv, grp)})
rmcase("one-way, 4 conditions, 10 subjects", rmsubj(10, 4), [4])
rmcase("one-way, 2 conditions", rmsubj(8, 2), [2])
rmcase("two-way within, 3 x 2, 12 subjects", rmsubj(12, 6), [3, 2])
rmcase("two-way within, 2 x 4, 9 subjects", rmsubj(9, 8), [2, 4])
rmcase("mixed: 4 within, 3 groups, unbalanced", rmsubj(15, 4), [4], [0] * 5 + [1] * 4 + [2] * 6)
rmcase("mixed: 3 x 2 within, 2 groups", rmsubj(14, 6), [3, 2], [0] * 6 + [1] * 8)
rmcase("one-way about 1e6", rmsubj(9, 5, 1e6, 0.01), [5])
from statsmodels.stats.anova import AnovaRM
import pandas as pd
for c in cases:
    Y, lv, grp = c["args"]
    if grp: continue
    b_ = lv[1] if len(lv) > 1 else 1
    df = pd.DataFrame([{"s": i, "A": j // b_, "B": j % b_, "y": v} for i, r in enumerate(Y) for j, v in enumerate(r)])
    tab = AnovaRM(df, "y", "s", within=["A"] if len(lv) == 1 else ["A", "B"]).fit().anova_table
    assert all(abs(x - e["F"]) <= 1e-8 * abs(e["F"]) for x, e in zip(tab["F Value"], c["want"]["effs"])), c["name"]
out["rm"] = cases

# ---------- power and sample size (STATS_SPEC 2.11): the noncentral tails and every power in 60 digits (refs.power_ref);
# statsmodels' powers asserted where it has the test ----------
cases = []; rng = np.random.default_rng(211)
for x, d1, d2, lam in [(2.5, 3, 20, 4), (0.5, 3, 20, 40), (10, 1, 5, 0.1), (3, 4, 100, 200), (1.2, 10, 10, 1e-3), (50, 2, 30, 5), (0.01, 5, 5, 10), (3.1, 2, 57, 12.5), (1.7, 9, 300, 900)]:
    for up in (True, False):
        cases.append({"fn": "DIST.ncf." + ("sf" if up else "cdf"), "args": [x, d1, d2, lam], "want": refs.nc_tail("f", [x, d1, d2, lam], up), "kind": "rel"})
for x, k, lam in [(3, 2, 1), (30, 5, 10), (0.5, 4, 20), (200, 10, 100), (5, 1, 0.01), (1500, 3, 1400), (7.81, 3, 9), (0.2, 1, 3)]:
    for up in (True, False):
        cases.append({"fn": "DIST.ncx2." + ("sf" if up else "cdf"), "args": [x, k, lam], "want": refs.nc_tail("x2", [x, k, lam], up), "kind": "rel"})
for t, nu, dl in [(2, 10, 3), (-1, 5, 1), (3, 30, 0.5), (1.7, 63, 2.83), (-2.1, 126, 0.4), (6, 20, 1)]:
    cases.append({"fn": "DIST.nct.sf", "args": [t, nu, dl], "want": refs.nc_tail("t", [t, nu, dl], True), "kind": "rel"})
PO = [({"test": "t1", "alpha": 0.05, "d": 0.5, "sd": 1, "alt": "two"}, [10, 34, 80]), ({"test": "tp", "alpha": 0.01, "d": -0.3, "sd": 0.8, "alt": "less"}, [15, 60]),
      ({"test": "t2", "alpha": 0.05, "d": 0.5, "sd": 1, "r": 1, "alt": "two"}, [20, 64]), ({"test": "t2", "alpha": 0.05, "d": 1.2, "sd": 2, "r": 1.5, "alt": "greater"}, [12, 40]),
      ({"test": "anova", "alpha": 0.05, "means": [1, 1.5, 2], "sd": 1}, [5, 10, 20]), ({"test": "anova", "alpha": 0.01, "means": [10, 10.2, 10.1, 10.6], "sd": 0.5}, [8, 30]),
      ({"test": "p1", "alpha": 0.05, "p0": 0.5, "p1": 0.7, "alt": "two"}, [20, 50, 51]), ({"test": "p1", "alpha": 0.05, "p0": 0.3, "p1": 0.15, "alt": "less"}, [40, 90]),
      ({"test": "p1", "alpha": 0.1, "p0": 0.2, "p1": 0.35, "alt": "greater"}, [30]),
      ({"test": "p2", "alpha": 0.05, "p1": 0.5, "p2": 0.75, "r": 1, "alt": "two"}, [30, 58]), ({"test": "p2", "alpha": 0.05, "p1": 0.4, "p2": 0.25, "r": 2, "alt": "greater"}, [50]),
      ({"test": "v1", "alpha": 0.05, "v0": 1, "v1": 2, "alt": "two"}, [10, 20]), ({"test": "v1", "alpha": 0.05, "v0": 4, "v1": 2.5, "alt": "less"}, [25]),
      ({"test": "v2", "alpha": 0.05, "v1": 2, "v2": 1, "r": 1, "alt": "greater"}, [20]), ({"test": "v2", "alpha": 0.05, "v1": 1, "v2": 3, "r": 0.5, "alt": "two"}, [30]),
      ({"test": "chi2", "alpha": 0.05, "w": 0.3, "df": 3}, [50, 100, 122]), ({"test": "chi2", "alpha": 0.01, "w": 0.1, "df": 1}, [400])]
for o, ns in PO:
    for n in ns: cases.append({"fn": "powerAt", "args": [o, n], "want": refs.power_ref(o, n), "kind": "power", "name": f"{o['test']} n={n}"})
NMIN = {"t1": 2, "tp": 2, "t2": 2, "anova": 2, "p1": 1, "p2": 1, "v1": 2, "v2": 2, "chi2": 1}
for o, tg in [(PO[0][0], 0.8), (PO[2][0], 0.9), (PO[4][0], 0.8), (PO[6][0], 0.8), (PO[9][0], 0.8), (PO[11][0], 0.9), (PO[15][0], 0.8), (PO[3][0], 0.95)]:
    n, pw = refs.power_size_ref(o, tg, NMIN[o["test"]] if o["test"] != "v2" else 4)
    cases.append({"fn": "powSize", "args": [o, tg], "want": {"n": n, "pw": pw}, "kind": "size", "name": f"{o['test']} for {tg}"})
from statsmodels.stats.power import TTestPower, TTestIndPower, FTestAnovaPower, GofChisquarePower
for c in cases:
    if c["fn"] != "powerAt": continue
    o, n = c["args"]; alt = {"two": "two-sided", "greater": "larger", "less": "smaller"}.get(o.get("alt", "two"))
    if o["test"] in ("t1", "tp"): smv = TTestPower().power(o["d"] / o["sd"], n, o["alpha"], alternative=alt)
    elif o["test"] == "t2": smv = TTestIndPower().power(o["d"] / o["sd"], n, o["alpha"], ratio=math.ceil(o["r"] * n - 1e-9) / n, alternative=alt)
    elif o["test"] == "anova": k = len(o["means"]); mb = sum(o["means"]) / k; smv = FTestAnovaPower().power(math.sqrt(sum((v - mb) ** 2 for v in o["means"]) / k) / o["sd"], k * n, o["alpha"], k_groups=k)
    elif o["test"] == "chi2": smv = GofChisquarePower().power(o["w"], n, o["alpha"], n_bins=o["df"] + 1)
    else: continue
    assert abs(smv - c["want"]) < 1e-8, (c["name"], smv, c["want"])
out["power"] = cases

# ---------- ROC curves (STATS_SPEC 2.12): every number from exact pairs (refs.roc_ref); SciPy's Mann–Whitney U asserted ----------
cases = []; rng = np.random.default_rng(212)
def roccase(name, pos, neg, dir="high", conf=0.95, pos2=None, neg2=None):
    w = refs.roc_ref(pos, neg, dir, conf, pos2, neg2)
    assert abs(stats.mannwhitneyu(pos, neg).statistic / (len(pos) * len(neg)) - (w["auc"] if dir == "high" else 1 - w["auc"])) < 1e-14, name
    cases.append({"fn": "rocTest", "name": name, "args": [pos, neg, {"dir": dir, "conf": conf}], "pair": [pos2, neg2] if pos2 is not None else None, "want": w})
r1 = lambda n, m, sd, d=1: [round(float(v), d) for v in rng.normal(m, sd, n)]
roccase("small, ties", [3, 4, 4, 5, 6, 7, 7, 9], [1, 2, 2, 3, 4, 5, 5, 6, 8])
roccase("normal, 40 and 60, rounded", r1(40, 1, 1), r1(60, 0, 1))
roccase("a lower score positive, 99 %", r1(25, 0, 1), r1(30, 0.8, 1.2), "low", 0.99)
roccase("separated", [5, 6, 7, 8], [1, 2, 3])
roccase("many ties", [float(v) for v in rng.integers(0, 4, 50)], [float(v) for v in rng.integers(0, 3, 70)])
roccase("about 1e6", [1e6 + v for v in r1(30, 0.5, 1, 3)], [1e6 + v for v in r1(35, 0, 1, 3)])
p1, n1_ = r1(30, 1, 1), r1(45, 0, 1)
roccase("two scores compared", p1, n1_, pos2=[round(v + float(e), 1) for v, e in zip(p1, rng.normal(0, 1, 30))], neg2=[round(v + float(e), 1) for v, e in zip(n1_, rng.normal(0, 1, 45))])
out["roc"] = cases

# ---------- worksheet formulas (SHEET_SPEC 3.1): NumPy, exact sums (math.fsum) and statistics.stdev ----------
# Each case is a formula over named columns (B, C numbers with gaps; G numbers, text and gaps; S another
# sheet's column, longer or shorter; k a constant) worked out by NumPy with NaN as missing: missing in,
# missing out; a row past a column's end missing; a column as long as the longest it reads row by row
# (the sheet's rows when it reads none); empty rows at the end dropped.
import statistics
from fractions import Fraction
cases = []; rng = np.random.default_rng(31)
def fxcol(n, gap, mag, off=0.0, ints=False):
    v = rng.integers(-20, 21, n).astype(float) if ints else off + mag * rng.normal(0, 1, n)
    return [None if rng.random() < gap else float(x) for x in v]
def A(v, n): a = np.full(n, np.nan); m = min(n, len(v)); a[:m] = [np.nan if x is None else x for x in v[:m]]; return a
def fin(v): return [x for x in v if x is not None and math.isfinite(x)]
def mean_(v): f = fin(v); return math.fsum(f) / len(f) if f else math.nan
def sd_(v): f = fin(v); return float(statistics.stdev([Fraction(x) for x in f])) if len(f) > 1 else math.nan
def var_(v): f = fin(v); return float(statistics.variance([Fraction(x) for x in f])) if len(f) > 1 else math.nan
def pct_(v, q): f = fin(v); return float(np.percentile(f, q, method="linear")) if f else math.nan
def shift(v, n, k):  # the value k rows on (k < 0: above), NaN past the ends
    a = A(v, max(n, len(v))); out = np.full(n, np.nan)
    for r in range(n):
        j = r + k
        if 0 <= j < len(v) and v[j] is not None: out[r] = v[j]
    return out
def cum_(v, n):
    out, run = np.full(n, np.nan), []
    for r in range(n):
        x = v[r] if r < len(v) else None
        if x is None: continue
        run.append(x); out[r] = math.fsum(run)
    return out
def done(a):
    o = [None if not math.isfinite(x) else float(x) for x in a]
    while o and o[-1] is None: o.pop()
    return o
def textEq(G, Gt, n, s):  # G == "s": 1, 0, or NaN where empty
    out = np.full(n, np.nan)
    for r in range(n):
        if r in Gt: out[r] = 1.0 if Gt[r] == s else 0.0
        elif r < len(G) and G[r] is not None: out[r] = 0.0
    return out
with np.errstate(invalid="ignore", divide="ignore"):
    FX = [
        ("B - mean(B)", lambda d, n: A(d["B"], n) - mean_(d["B"])),
        ("B[i-1]", lambda d, n: shift(d["B"], n, -1)),
        ("B[i+2] - B", lambda d, n: shift(d["B"], n, 2) - A(d["B"], n)),
        ("B/B[1]", lambda d, n: A(d["B"], n) / (d["B"][0] if d["B"] and d["B"][0] is not None else math.nan)),
        ("cumsum(B)", lambda d, n: cum_(d["B"], n)),
        ("(B - mean(B))/sd(B)", lambda d, n: (A(d["B"], n) - mean_(d["B"])) / sd_(d["B"])),
        ("B/sum(B)", lambda d, n: A(d["B"], n) / math.fsum(fin(d["B"]))),
        ("percentile(B, 90) - median(B)", lambda d, n: np.full(n, pct_(d["B"], 90) - pct_(d["B"], 50))),
        ("if(B > median(B), B, 0/0)", lambda d, n: np.where(A(d["B"], n) > pct_(d["B"], 50), A(d["B"], n), np.where(np.isnan(A(d["B"], n)), np.nan, np.nan))),
        ('if(G == "a", B, C)', lambda d, n: (lambda t: np.where(np.isnan(t), np.nan, np.where(t == 1, A(d["B"], n), A(d["C"], n))))(textEq(d["G"], d["Gt"], n, "a"))),
        ('G != "b"', lambda d, n: (lambda t: np.where(np.isnan(t), np.nan, 1 - t))(textEq(d["G"], d["Gt"], n, "b"))),
        ("and(B > 0, C < 0) + or(B < 0, not(C > 0))", lambda d, n: (lambda b, c: np.where(np.isnan(b) | np.isnan(c), np.nan, ((b > 0) & (c < 0)).astype(float) + ((b < 0) | ~(c > 0)).astype(float)))(A(d["B"], n), A(d["C"], n))),
        ("count(B) + min(B) + max(C)", lambda d, n: np.full(n, len(fin(d["B"])) + (min(fin(d["B"])) if fin(d["B"]) else math.nan) + (max(fin(d["C"])) if fin(d["C"]) else math.nan))),
        ("S[i] * B", lambda d, n: shift(d["S"], n, 0) * A(d["B"], n)),
        ("x[i-1] - x", lambda d, n: shift(d["X"], n, -1) - A(d["X"], n)),
        ("missing(B) + missing(C)", lambda d, n: np.isnan(A(d["B"], n)).astype(float) + np.isnan(A(d["C"], n)).astype(float)),
        ("cumsum(B) / i", lambda d, n: cum_(d["B"], n) / np.arange(1, n + 1)),
        ("se(C) + var(C)", lambda d, n: np.full(n, sd_(d["C"]) / math.sqrt(len(fin(d["C"]))) + var_(d["C"]) if len(fin(d["C"])) > 1 else math.nan)),
        ("B * k + C", lambda d, n: A(d["B"], n) * d["k"] + A(d["C"], n)),
        ("B^2 - C*abs(C)", lambda d, n: A(d["B"], n) ** 2 - A(d["C"], n) * np.abs(A(d["C"], n))),
    ]
    # Which names each formula reads row by row (decides its rows); a formula reading none has nDef.
    ROWS = {"B - mean(B)": "B", "B[i-1]": "B", "B[i+2] - B": "B", "B/B[1]": "B", "cumsum(B)": "B", "(B - mean(B))/sd(B)": "B", "B/sum(B)": "B",
            "percentile(B, 90) - median(B)": "", "if(B > median(B), B, 0/0)": "B", 'if(G == "a", B, C)': "GBC", 'G != "b"': "G",
            "and(B > 0, C < 0) + or(B < 0, not(C > 0))": "BC", "count(B) + min(B) + max(C)": "", "S[i] * B": "SB", "x[i-1] - x": "X",
            "missing(B) + missing(C)": "BC", "cumsum(B) / i": "B", "se(C) + var(C)": "", "B * k + C": "BC", "B^2 - C*abs(C)": "BC"}
    sets = [("short", 5, 0.2, 1, 0, False), ("one row", 1, 0, 1, 0, False), ("integers with ties", 40, 0.15, 1, 0, True),
            ("normal, 200, gaps", 200, 0.1, 3, 0, False), ("about 1e9", 60, 0.05, 1e-3, 1e9, False), ("small and large", 80, 0.1, 1e-150, 0, False),
            ("mostly empty", 30, 0.8, 10, 0, False)]
    for nm, n, gap, mag, off, ints in sets:
        B = fxcol(n, gap, mag, off, ints); C = fxcol(n + int(rng.integers(-2, 3)), gap, mag, -off, ints)
        G, Gt = [], {}
        for r in range(n):
            u = rng.random()
            if u < 0.35: G.append(None); Gt[r] = "a"
            elif u < 0.6: G.append(None); Gt[r] = "b"
            elif u < 0.8: G.append(float(rng.integers(0, 5)))
            else: G.append(None)
        S = fxcol(max(1, n + int(rng.integers(-3, 4))), gap, 2, 0, False)
        X = [None if rng.random() < gap / 2 else float(r * 0.5 + rng.random() * 0.1) for r in range(n)]
        k = float(rng.normal(0, 1e3))
        d = {"B": B, "C": C, "G": G, "Gt": Gt, "S": S, "X": X, "k": k}
        nDef = max(len(B), len(C), len(G), len(X))
        scale = max([abs(x) for x in fin(B) + fin(C) + fin(S) + fin(X) + [k]] or [1.0])
        # The error an answer may carry: 16 ulp of the data's scale times how much the formula magnifies it.
        GAIN = {"(B - mean(B))/sd(B)": 1 / sd_(B) if len(fin(B)) > 1 and sd_(B) > 0 else 1, "cumsum(B)": n, "cumsum(B) / i": n,
                "B^2 - C*abs(C)": scale, "B * k + C": scale}
        for src, fn in FX:
            rows = ROWS[src]; L = {"B": len(B), "C": len(C), "G": len(G), "S": len(S), "X": len(X)}
            n0 = max([L[c] for c in rows] or [0]) if rows else nDef
            want = done(fn(d, n0))
            cols = {"B": B, "C": C, "G": G, "S": S, "k": k}
            cases.append({"fn": "fxCalc", "name": f"{src} on {nm}", "args": [src, cols, {"G": {str(r): t for r, t in Gt.items()}}, X, nDef], "want": want, "floor": 16 * 2.0 ** -52 * scale * max(1.0, GAIN.get(src, 1.0))})
out["fx"] = cases

# ---------- filters (SHEET_SPEC 3.3): the rows each condition keeps, by pandas ----------
# A cell is a number, a text or empty; a number's rule keeps numbers that meet it (its negation every other cell), a text's rule
# reads a number as JavaScript writes it, capitals ignored; top and bottom keep ties (nlargest/nsmallest keep="all"), a percent
# of the count rounded up; columns combine by and.
import pandas as pd
cases = []; rng = np.random.default_rng(33)
def jsstr(x): return str(int(x)) if float(x).is_integer() and abs(x) < 1e21 else repr(float(x))
def fcol(n, kind):
    v, t = [], {}
    for r in range(n):
        u = rng.random()
        if u < 0.12: v.append(None)
        elif kind != "num" and u < 0.45: v.append(None); t[r] = str(rng.choice(["Control", "control", "treated A", "treated B", "blank", "n/a", "12"]))
        else: v.append(float(rng.integers(-5, 15)) if rng.random() < 0.5 else round(float(rng.normal(3, 4)), 2))
    return v, t
def frule(v, t, r):
    n = len(v); s = pd.Series([np.nan if x is None else x for x in v], dtype=float); isnum = s.notna()
    cells = [v[i] if v[i] is not None else t.get(i) for i in range(n)]
    op = r["op"]
    if op in ("empty", "nempty"): e = pd.Series([c is None for c in cells]); return e if op == "empty" else ~e
    if op in ("teq", "tne", "contains", "ncontains", "begins", "ends"):
        q = r["t"].lower(); base = {"tne": "teq", "ncontains": "contains"}.get(op, op)
        def ok(c):
            if c is None: return False
            st = (jsstr(c) if isinstance(c, float) else c).lower()
            return st == q if base == "teq" else q in st if base == "contains" else st.startswith(q) if base == "begins" else st.endswith(q)
        m = pd.Series([ok(c) for c in cells]); return ~m if op in ("tne", "ncontains") else m
    if op in ("top", "bottom"):
        nums = s[isnum]; cnt = len(nums); k = max(1, math.ceil(cnt * r["n"] / 100 - 1e-9)) if r.get("pct") else int(r["n"])
        if cnt == 0: return pd.Series([False] * n)
        keep = nums.nlargest(k, keep="all") if op == "top" else nums.nsmallest(k, keep="all")
        return pd.Series([i in keep.index for i in range(n)])
    if op in ("above", "below"):
        m = math.fsum(s[isnum].tolist()) / isnum.sum() if isnum.sum() else math.nan
        return (s > m) if op == "above" else (s < m)
    a, b = r.get("a"), r.get("b")
    if op in ("eq", "ne"): m = s == a
    elif op == "lt": m = s < a
    elif op == "le": m = s <= a
    elif op == "gt": m = s > a
    elif op == "ge": m = s >= a
    else: m = s.between(min(a, b), max(a, b))
    m = m & isnum
    return ~m if op in ("ne", "nbetween") else m
def fcond(v, t, c):
    if "vals" in c:
        S = c["vals"]; cells = [v[i] if v[i] is not None else t.get(i) for i in range(len(v))]
        return pd.Series([(x in S) if x is not None else (None in S) for x in cells])
    m = frule(v, t, c["c1"])
    if c.get("c2"): m2 = frule(v, t, c["c2"]); m = (m | m2) if c.get("join") == "or" else (m & m2)
    return m
RULES = [{"op": "eq", "a": 3.0}, {"op": "ne", "a": 3.0}, {"op": "lt", "a": 2.5}, {"op": "le", "a": 2.0}, {"op": "gt", "a": 4.0}, {"op": "ge", "a": 4.0},
         {"op": "between", "a": 6.0, "b": 0.0}, {"op": "nbetween", "a": 0.0, "b": 6.0}, {"op": "top", "n": 3}, {"op": "bottom", "n": 4}, {"op": "top", "n": 25, "pct": True},
         {"op": "bottom", "n": 10, "pct": True}, {"op": "above"}, {"op": "below"}, {"op": "teq", "t": "control"}, {"op": "tne", "t": "control"}, {"op": "contains", "t": "treat"},
         {"op": "ncontains", "t": "A"}, {"op": "begins", "t": "T"}, {"op": "ends", "t": "2"}, {"op": "empty"}, {"op": "nempty"}]
for size in (1, 8, 40, 300):
    for kind in ("num", "mixed"):
        v, t = fcol(size, kind); v2, t2 = fcol(size, "mixed")
        cells = sorted({x for x in (v[i] if v[i] is not None else t.get(i) for i in range(size))}, key=lambda z: (z is None, isinstance(z, str), str(z)))
        conds = [{"c1": r} for r in RULES] + [{"c1": RULES[2], "c2": RULES[4], "join": "or"}, {"c1": RULES[5], "c2": RULES[11], "join": "and"},
                 {"vals": cells[: max(1, len(cells) // 2)]}, {"vals": [None]}]
        for c in conds:
            want = [int(i) for i in np.flatnonzero(fcond(v, t, c).to_numpy())]
            cases.append({"fn": "filtList", "name": f"{json.dumps(c)} on {size} {kind}", "args": [{"A": {"v": v, "t": {str(k): x for k, x in t.items()}}}, {"A": c}, size], "want": want})
        c1, c2 = {"c1": RULES[4]}, {"c1": RULES[16]}
        want = [int(i) for i in np.flatnonzero((fcond(v, t, c1) & fcond(v2, t2, c2)).to_numpy())]
        cases.append({"fn": "filtList", "name": f"two columns on {size} {kind}", "args": [{"A": {"v": v, "t": {str(k): x for k, x in t.items()}}, "B": {"v": v2, "t": {str(k): x for k, x in t2.items()}}}, {"A": c1, "B": c2}, size], "want": want})
out["filt"] = cases

# ---------- reshaping (SHEET_SPEC 3.5): the result tables, by pandas ----------
# Each case runs one kind on columns of cells (numbers, text, empty) and compares every column of the result by name.
cases = []; rng = np.random.default_rng(35)
def rcells(kind, n, gap=0.15):
    out = []
    for r in range(n):
        if rng.random() < gap: out.append(None); continue
        if kind == "num": out.append(round(float(rng.normal(5, 3)), 2))
        elif kind == "int": out.append(float(rng.integers(1, 6)))
        elif kind == "x": out.append(float(r // 2))
        elif kind == "id": out.append(float(1 + r % max(2, n // 3)))
        else: out.append(str(rng.choice(list(kind))))
    return out
def ser(v): return pd.Series([np.nan if x is None else x for x in v], dtype=object)
def outv(v):
    out = []
    for x in v:
        if x is None or (isinstance(x, float) and math.isnan(x)): out.append(None)
        elif isinstance(x, (int, np.integer)): out.append(float(x))
        elif isinstance(x, (float, np.floating)): out.append(float(x))
        else: out.append(str(x))
    return out
def inp(id_, name, cells, sheet="s1", role="y"): return {"id": id_, "name": name, "unit": "", "role": role, "sheet": sheet, "cells": cells, "order": None}
def fin(v): return [x for x in v if isinstance(x, float) and x == x]
def agg(fn, v):
    f = fin(v)
    if fn == "count": return float(len(f))
    if fn == "sum": return math.fsum(f)
    if not f: return None
    if fn == "mean": return math.fsum(f) / len(f)
    if fn == "min": return min(f)
    if fn == "max": return max(f)
    if fn == "median": return float(np.percentile(f, 50))
    if fn == "sd": return float(statistics.stdev([Fraction(x) for x in f])) if len(f) > 1 else None
def rcase(name, kind, ins, p, cols):
    cases.append({"fn": "anaRunKind", "name": name, "args": [kind, ins, p], "want": [[c[0], outv(c[1])] for c in cols]})
def firstseen(v):
    seen = []
    for x in v:
        if x is not None and x not in seen: seen.append(x)
    return seen
def skey(x):  # numbers, then text, then empty
    return (2, "") if x is None else (0, x) if isinstance(x, float) else (1, x)
for n in (6, 24, 60):
    X, A, B, G, H, I = rcells("x", n, 0), rcells("num", n), rcells("int", n), rcells("abc", n), rcells("pq", n, 0.05), rcells("id", n, 0.05)
    ins = [inp("x", "X", X, role="x"), inp("a", "A", A), inp("b", "B", B), inp("g", "G", G, role="ignore"), inp("h", "H", H, role="ignore"), inp("i", "I", I, role="ignore")]
    df = pd.DataFrame({k: ser(v) for k, v in zip("XABGHI", (X, A, B, G, H, I))})
    # stack (melt), empty cells left out and kept
    for drop in (True, False):
        m = df.melt(id_vars=["X"], value_vars=["A", "B"], var_name="Column", value_name="Value")
        if drop: m = m[m["Value"].notna()]
        rcase(f"stack n={n} drop={drop}", "stack", ins[:3], {"keep": ["x"], "drop": drop}, [("X", m["X"].tolist()), ("Column", m["Column"].tolist()), ("Value", m["Value"].tolist())])
    # unstack by order within each level, and by an identifier (first value of a pair kept)
    L = firstseen(G); by = {l: [A[r] for r in range(n) if G[r] == l] for l in L}
    rcase(f"unstack n={n}", "unstack", [ins[1], ins[3]], {"val": "a", "grp": "g"}, [(str(l), by[l]) for l in L])
    d2 = df[df["G"].notna() & df["I"].notna()].drop_duplicates(["I", "G"], keep="first"); ids = firstseen(d2["I"].tolist())
    pv = d2.pivot(index="I", columns="G", values="A").reindex(index=ids)
    rcase(f"unstack by an identifier n={n}", "unstack", [ins[1], ins[3], ins[5]], {"val": "a", "grp": "g", "idc": "i"}, [("I", ids)] + [(str(l), pv[l].tolist() if l in pv else [None] * len(ids)) for l in firstseen(d2["G"].tolist())])
    # pivot: G down, H across, each aggregate, with totals (groupby of the rows that have both levels)
    RL, CL = sorted(firstseen(G), key=skey), sorted(firstseen(H), key=skey)
    for fn in ("sum", "mean", "count", "sd", "median", "max"):
        rows_ok = [r for r in range(n) if G[r] is not None and H[r] is not None]
        cell = lambda gl, hl: [A[r] for r in rows_ok if G[r] == gl and H[r] == hl]
        cols = [("G", RL + ["Total"])]
        for hl in CL: cols.append((str(hl), [agg(fn, cell(gl, hl)) for gl in RL] + [agg(fn, [A[r] for r in rows_ok if H[r] == hl])]))
        cols.append(("Total", [agg(fn, [A[r] for r in rows_ok if G[r] == gl]) for gl in RL] + [agg(fn, [A[r] for r in rows_ok])]))
        rcase(f"pivot {fn} n={n}", "pivot", [ins[1], ins[3], ins[4]], {"row": "g", "col": "h", "val": "a", "agg": fn, "totals": True}, cols)
    # reduce: every 3rd from row 2; every 4 merged by their mean; X in bins of 2 from 0
    rcase(f"reduce every n={n}", "reduce", ins[:2], {"mode": "every", "n": 3, "start": 2}, [("X", X[1::3]), ("A", A[1::3])])
    grp = [list(range(a, min(n, a + 4))) for a in range(0, n, 4)]
    rcase(f"reduce merge n={n}", "reduce", ins[:3], {"mode": "merge", "n": 4, "agg": "mean"}, [("X", [agg("mean", [X[r] for r in g]) for g in grp]), ("A", [agg("mean", [A[r] for r in g]) for g in grp]), ("B", [agg("mean", [B[r] for r in g]) for g in grp])])
    bins = sorted({int(math.floor(x / 2 + 1e-12)) for x in X if x is not None})
    rcase(f"reduce bins n={n}", "reduce", ins[:2], {"mode": "bins", "x": "x", "w": 2, "x0": 0, "agg": "mean"}, [("X", [(b + 0.5) * 2 for b in bins]), ("A", [agg("mean", [A[r] for r in range(n) if X[r] is not None and math.floor(X[r] / 2 + 1e-12) == b]) for b in bins])])
    # duplicates by G and H: first, last, only the duplicates; averaged
    for keep in ("first", "last", "dups"):
        sub = df[df.duplicated(["G", "H"], keep=False)] if keep == "dups" else df.drop_duplicates(["G", "H"], keep=keep)
        rcase(f"dedup {keep} n={n}", "dedup", [ins[1], ins[3], ins[4]], {"keys": ["g", "h"], "keep": keep}, [("A", sub["A"].tolist()), ("G", sub["G"].tolist()), ("H", sub["H"].tolist())])
    keys = []; grpd = {}
    for r in range(n):
        k = (G[r], H[r])
        if k not in grpd: grpd[k] = []; keys.append(k)
        grpd[k].append(r)
    rcase(f"dedup mean n={n}", "dedup", [ins[1], ins[3], ins[4]], {"keys": ["g", "h"], "keep": "mean"}, [("A", [agg("mean", [A[r] for r in grpd[k]]) for k in keys]), ("G", [k[0] for k in keys]), ("H", [k[1] for k in keys])])
    # a sorted copy by G descending then A ascending (empty last), stable
    idx = list(range(n))
    def k2(r):
        g, a = G[r], A[r]
        return ((1, "") if g is None else (0, tuple(-ord(ch) for ch in g)), (2, 0) if a is None else (0, a), r)
    idx.sort(key=k2)
    rcase(f"sorted copy n={n}", "sortcopy", [ins[1], ins[3]], {"by": [{"id": "g", "dir": -1}, {"id": "a", "dir": 1}]}, [("A", [A[r] for r in idx]), ("G", [G[r] for r in idx])])
    # transpose, named by H
    if n <= 24: rcase(f"transpose n={n}", "transp", [ins[4], ins[1], ins[2]], {"names": True}, [("Column", ["A", "B"])] + [(H[r] if H[r] is not None else str(r + 1), [A[r], B[r]]) for r in range(n)])
    # join with another sheet on I (no empty keys), inner and left (pandas keeps this sheet's order)
    Iok = [float(1 + r % 5) for r in range(n)]; K2 = [1.0, 2.0, 3.0, 3.0, 7.0]; E2 = [10.0, 20.0, 30.0, 31.0, 70.0]
    left = pd.DataFrame({"I": ser(Iok), "A": ser(A)}); right = pd.DataFrame({"K": ser(K2), "E": ser(E2)})
    for how in ("inner", "left"):
        mrg = left.merge(right, left_on="I", right_on="K", how=how, sort=False)
        rcase(f"join {how} n={n}", "join", [inp("i2", "I", Iok), inp("a", "A", A), inp("k2", "K", K2, "s2"), inp("e2", "E", E2, "s2")], {"lk": "i2", "rk": "k2", "right": "s2", "how": how}, [("I", mrg["I"].tolist()), ("A", mrg["A"].tolist()), ("E", mrg["E"].tolist())])
    # append another sheet by name and by position, with the sheet named
    other = pd.DataFrame({"B": ser([1.0, None, 3.0]), "A": ser([7.0, 8.0, None]), "Z": ser(["u", "v", "w"])})
    cat = pd.concat([df[["A", "B"]], other], ignore_index=True)
    ins2 = [inp("a", "A", A), inp("b", "B", B), inp("b2", "B", [1.0, None, 3.0], "s2"), inp("a2", "A", [7.0, 8.0, None], "s2"), inp("z2", "Z", ["u", "v", "w"], "s2")]
    rcase(f"append by name n={n}", "append", ins2, {"by": "name", "src": True, "sheetNames": {"s1": "Data", "s2": "More"}}, [("Sheet", ["Data"] * n + ["More"] * 3), ("A", cat["A"].tolist()), ("B", cat["B"].tolist()), ("Z", cat["Z"].tolist())])
    pos = pd.concat([df[["A", "B"]], other.set_axis(["A", "B", "Z"], axis=1)[["A", "B"]]], ignore_index=True)
    rcase(f"append by position n={n}", "append", ins2[:4], {"by": "pos", "src": False}, [("A", pos["A"].tolist()), ("B", pos["B"].tolist())])
out["reshape"] = cases

# ---- Excel workbooks (SHEET_SPEC 3.7) ------------------------------------------------------------
# Workbooks made by openpyxl (and a few with their XML written by hand: cached formula values, inline
# strings, cells without their addresses, prefixed elements, the 1904 date system), committed in
# tools/ref/xlsx/; each case is one workbook and what openpyxl reads in it, cell by cell. The refusals
# are workbooks of each kind Kurve says it does not read, with the words it says.
import io, zipfile, openpyxl
from openpyxl.utils.datetime import CALENDAR_MAC_1904
XD = os.path.join(here, "xlsx")
def xl_save(wb, name):
    wb.properties.creator = "Kurve's bench"; wb.properties.created = wb.properties.modified = datetime.datetime(2026, 1, 1)
    bio = io.BytesIO(); wb.save(bio); return bio.getvalue()
def xl_edit(data, fn):  # every part of a zip through fn(name, text) -> text, written again deflated
    zi = zipfile.ZipFile(io.BytesIO(data)); out = io.BytesIO(); zo = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        b = zi.read(it.filename)
        if it.filename.endswith(".xml") or it.filename.endswith(".rels"): b = fn(it.filename, b.decode("utf-8")).encode("utf-8")
        zi2 = zipfile.ZipInfo(it.filename, date_time=(2026, 1, 1, 0, 0, 0)); zi2.compress_type = zipfile.ZIP_DEFLATED; zo.writestr(zi2, b)
    zo.close(); return out.getvalue()
def xl_write(name, data):
    if not check:
        os.makedirs(XD, exist_ok=True)
        with open(os.path.join(XD, name), "wb") as fh: fh.write(data)
EPOCH70 = datetime.datetime(1970, 1, 1)
def xl_cell(v):
    if v is None: return None
    if isinstance(v, bool): return ["b", 1 if v else 0]
    if isinstance(v, (int, float)): return ["n", float(v)]
    if isinstance(v, datetime.datetime): return ["d", (v - EPOCH70).total_seconds()]
    if isinstance(v, datetime.date): return ["d", (datetime.datetime(v.year, v.month, v.day) - EPOCH70).total_seconds()]
    if isinstance(v, datetime.time): return ["t", v.hour * 3600 + v.minute * 60 + v.second + v.microsecond / 1e6]
    if isinstance(v, datetime.timedelta): return ["t", v.total_seconds()]
    if isinstance(v, str): return ["e" if v.startswith("#") and v in ("#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A") else "s", v]
    raise TypeError(type(v))
def xl_read(name):
    data = open(os.path.join(XD, name), "rb").read()
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    sheets = []
    for ws in wb.worksheets + list(getattr(wb, "chartsheets", [])):
        chart = ws not in wb.worksheets
        cells = []
        if not chart:
            for row in ws.iter_rows():
                for c in row:
                    q = xl_cell(c.value)
                    if q is not None and q != ["s", ""]: cells.append([c.row - 1, c.column - 1] + q)
        sheets.append({"name": ws.title, "hidden": ws.sheet_state != "visible", "chart": chart, "cells": cells, "frozen": (ws.freeze_panes and openpyxl.utils.cell.coordinate_from_string(ws.freeze_panes)[1] - 1) or 0 if not chart else 0})
    order = [s.title for s in wb._sheets]
    sheets.sort(key=lambda s: order.index(s["name"]))
    return {"d1904": wb.epoch == CALENDAR_MAC_1904, "sheets": sheets}
cases = []
# basic: numbers of every size, text that reads as a number, text with tabs, quotes and breaks, booleans, errors
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Data"
ws.append(["Time (s)", "Signal", "Label", "Flag"])
vals = [0.1, 1 / 3, -2.5e-300, 1.7976931348623157e308, 5e-324, 123456789012345.6, -0.0, 42, 0.30000000000000004]
for i, v in enumerate(vals):
    ws.append([i * 0.5, v, ["007", "1.5", "a\tb", 'say "hi"', "two\nlines", "naïve ü 日本", " lead", "#DIV/0!", "1e5"][i], [True, False, None, True, False, None, True, False, True][i]])
ws["E2"] = "#N/A"; ws["E2"].data_type = "e"; ws["E3"] = "#DIV/0!"; ws["E3"].data_type = "e"
ws.cell(row=14, column=2, value=7.25)  # past an empty row
# openpyxl writes 16 digits, so 0.1 + 0.2 would be 0.3: the values are written as Excel writes them, every digit (repr)
def exact(nm, t):
    if not nm.endswith("sheet1.xml"): return t
    import re as _re
    return _re.sub(r'<c r="B(\d+)"([^>]*)><v>[^<]*</v>', lambda m: f'<c r="B{m.group(1)}"{m.group(2)}><v>{repr(vals[int(m.group(1)) - 2]) if 2 <= int(m.group(1)) <= 10 else "7.25"}</v>', t)
xl_write("basic.xlsx", xl_edit(xl_save(wb, "basic"), exact))
# dates in the 1900 system: every built-in kind and some written by hand
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Dates"
fmts = [None, "yyyy-mm-dd", "dd/mm/yyyy", "yyyy-mm-dd hh:mm:ss", "hh:mm:ss", "[h]:mm:ss", "mmm d", "h:mm AM/PM", '0.00 "days"', "0.0E+00", '[Red]yyyy\\-mm\\-dd', "mm:ss.0"]
ws.append(["Plain", "Date", "Day first", "Date and time", "Time", "Elapsed", "Month", "Clock", "Days", "Scientific", "Coloured", "Minutes"])
rows = [[1.5, datetime.date(2024, 3, 1), datetime.date(1900, 1, 1), datetime.datetime(2024, 3, 1, 12, 5, 30, 250000), datetime.time(13, 45, 10), datetime.timedelta(hours=50, minutes=3, seconds=7), datetime.date(2023, 12, 25), datetime.time(9, 30), 3.25, 6.02e23, datetime.date(1999, 12, 31), datetime.time(0, 2, 30, 500000)],
        [2.5, datetime.date(1900, 2, 28), datetime.date(1900, 3, 1), datetime.datetime(1969, 7, 20, 20, 17, 40), datetime.time(0, 0, 1), datetime.timedelta(seconds=1.5), datetime.date(2000, 2, 29), datetime.time(23, 59, 59), 0.5, -1e-10, datetime.date(2100, 1, 1), datetime.time(0, 59, 59)],
        [None, datetime.datetime(2024, 6, 30, 0, 0), datetime.date(1970, 1, 1), datetime.datetime(2038, 1, 19, 3, 14, 7), datetime.time(12, 0), datetime.timedelta(days=3), datetime.date(2024, 1, 31), datetime.time(18, 15), 1.0, 1.0, datetime.date(1950, 6, 15), datetime.time(0, 0, 0)]]
for r in rows: ws.append(r)
for k, f in enumerate(fmts):
    if f:
        for r in range(2, 5): ws.cell(row=r, column=k + 1).number_format = f
for r in range(2, 5): ws.cell(row=r, column=9).value = [3.25, 0.5, 1.0][r - 2]; ws.cell(row=r, column=10).value = [6.02e23, -1e-10, 1.0][r - 2]
xl_write("dates.xlsx", xl_save(wb, "dates"))
wb = openpyxl.Workbook(); wb.epoch = CALENDAR_MAC_1904; ws = wb.active; ws.title = "Mac"
ws.append(["When", "Value"])
for d, v in [(datetime.datetime(1904, 1, 2), 1.0), (datetime.datetime(2024, 3, 1, 6, 0), 2.0), (datetime.datetime(1999, 12, 31, 23, 59, 59), 3.0)]:
    ws.append([d, v]); ws.cell(row=ws.max_row, column=1).number_format = "yyyy-mm-dd hh:mm:ss"
xl_write("mac1904.xlsx", xl_save(wb, "mac"))
# several sheets: a merged title over the header, a frozen header of names and units, an empty one, a hidden one
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Raw data"
ws["A1"] = "Run 12, Raman"; ws.merge_cells("A1:C1"); ws.append([]); ws.append(["Shift", "Counts", "Note"])
for i in range(30): ws.append([100 + 2 * i, round(1000 * math.exp(-((i - 15) / 4) ** 2) + 50, 3), "spike" if i == 7 else None])
w2 = wb.create_sheet("Calc"); w2.append(["Time", "Temperature", "2019"]); w2.append(["s", "°C", "K"])
for i in range(12): w2.append([i * 10, 20 + i * 1.5, 293.15 + i])
w2.freeze_panes = "A3"
wb.create_sheet("Empty")
w4 = wb.create_sheet("Hidden one"); w4.append(["x", "y"]); w4.append([1, 2]); w4.sheet_state = "hidden"
w5 = wb.create_sheet("Origin"); w5.append(["Wavelength", "Absorbance", "Absorbance"]); w5.append(["nm", "", "a.u."]); w5.append(["", "sample A", "sample B"])
for i in range(8): w5.append([400 + 10 * i, 0.1 * i, 0.2 * i])
w5.freeze_panes = "B4"
xl_write("sheets.xlsx", xl_save(wb, "sheets"))
# written by hand: cached values of formulas (a whole column, and one cell), inline strings, cells without addresses, a prefix
wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Formulas"
ws.append(["A", "Twice", "Sum"])
for i in range(1, 6): ws.append([i, f"=A{i + 1}*2", None])
ws["C2"] = "=SUM(A2:A6)"
base = xl_save(wb, "formulas")
def cache(nm, t):
    if not nm.endswith("sheet1.xml"): return t
    import re as _re
    t = _re.sub(r'<c r="B(\d)"><f>A\d\*2</f><v></v></c>', lambda m: f'<c r="B{m.group(1)}"><f>A{m.group(1)}*2</f><v>{2 * (int(m.group(1)) - 1)}</v></c>', t)
    t = _re.sub(r'<c r="C2"><f>SUM\(A2:A6\)</f><v></v></c>', '<c r="C2"><f>SUM(A2:A6)</f><v>15</v></c>', t)
    return t
xl_write("formulas.xlsx", xl_edit(base, cache))
hand = ('<?xml version="1.0" encoding="UTF-8"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>'
        '<x:row r="1"><x:c t="inlineStr"><x:is><x:t>Name</x:t></x:is></x:c><x:c t="inlineStr"><x:is><x:r><x:t>Val</x:t></x:r><x:r><x:t xml:space="preserve">ue </x:t></x:r></x:is></x:c></x:row>'
        '<x:row><x:c t="inlineStr"><x:is><x:t>a&amp;b &lt;c&gt; _x0009_tab</x:t></x:is></x:c><x:c><x:v>1.25</x:v></x:c></x:row>'
        '<x:row><x:c r="A3" t="str"><x:f>"q"&amp;"r"</x:f><x:v>qr</x:v></x:c><x:c r="B3" t="b"><x:v>1</x:v></x:c></x:row>'
        '<x:row r="5"><x:c r="B5"><x:v>-3</x:v></x:c></x:row></x:sheetData></x:worksheet>')
wb = openpyxl.Workbook(); wb.active.title = "Hand"; base = xl_save(wb, "hand")
xl_write("hand.xlsx", xl_edit(base, lambda nm, t: hand if nm.endswith("sheet1.xml") else t))
for nm in ["basic.xlsx", "dates.xlsx", "mac1904.xlsx", "sheets.xlsx", "formulas.xlsx", "hand.xlsx"]:
    cases.append({"fn": "xlsxRead", "file": nm, "want": xl_read(nm)})
# refusals: each with the words Kurve gives
ok = open(os.path.join(XD, "basic.xlsx"), "rb").read() if os.path.exists(os.path.join(XD, "basic.xlsx")) else b""
def patch_cd(data, fn):  # every central directory record through fn(bytearray, offset)
    b = bytearray(data); e = b.rfind(b"PK\x05\x06"); off = int.from_bytes(b[e + 16:e + 20], "little"); n = int.from_bytes(b[e + 10:e + 12], "little"); p = off
    for _ in range(n):
        fn(b, p); p += 46 + int.from_bytes(b[p + 28:p + 30], "little") + int.from_bytes(b[p + 30:p + 32], "little") + int.from_bytes(b[p + 32:p + 34], "little")
    return bytes(b)
refuse = {}
refuse["not-a-zip.xlsx"] = (b"Time,Signal\n1,2\n", "not a zip file")
refuse["cut.xlsx"] = (ok[: len(ok) * 6 // 10], "cut short or damaged")
def enc(b, p): b[p + 8] |= 1
refuse["password.xlsx"] = (patch_cd(ok, enc), "protected by a password")
def meth(b, p): b[p + 10:p + 12] = (12).to_bytes(2, "little")
refuse["bzip2.xlsx"] = (patch_cd(ok, meth), "compressed in a way Kurve does not read")
b = bytearray(ok); e = b.rfind(b"PK\x05\x06"); b[e + 10:e + 12] = b"\xff\xff"; refuse["zip64.xlsx"] = (bytes(b), "a zip64 file")
def crc(b, p): b[p + 16] ^= 0xFF
refuse["checksum.xlsx"] = (patch_cd(ok, crc), "does not match its checksum")
dz = io.BytesIO(); z = zipfile.ZipFile(dz, "w"); z.writestr("[Content_Types].xml", "<Types/>"); z.writestr("word/document.xml", "<w:document/>"); z.close()
refuse["word.xlsx"] = (dz.getvalue(), "a Word document")
for nm, (data, words) in refuse.items():
    xl_write(nm, data); cases.append({"fn": "xlsxRead", "file": nm, "want": {"fail": words}})
out["xlsx"] = cases

# ---- Matrices (SHEET_SPEC 3.6): NumPy's transpose, flips, rot90, slicing and arithmetic; SciPy's
# RegularGridInterpolator for resampling; PIL's grey for a picture ----------------------------------
from scipy.interpolate import RegularGridInterpolator
from PIL import Image
cases = []; rng = np.random.default_rng(36)
def mz(Z):  # a matrix's cells as JSON: NaN missing
    return [None if (isinstance(v, float) and v != v) else float(v) for v in np.asarray(Z, dtype=float).ravel()]
def mgrid(ny, nx, gap=0.15, ints=False):
    Z = rng.integers(-50, 50, (ny, nx)).astype(float) if ints else np.round(rng.normal(0, 10, (ny, nx)), 3)
    if gap: Z[rng.random((ny, nx)) < gap] = np.nan
    return Z
def mobj(Z, x=None, y=None):
    ny, nx = Z.shape
    return {"nx": nx, "ny": ny, "x": x or {"a": 1, "b": nx}, "y": y or {"a": 1, "b": ny}, "z": mz(Z)}
def axv(ax, n): return np.array(ax["v"], dtype=float) if "v" in ax else np.linspace(ax["a"], ax["b"], n)
for (ny, nx) in [(1, 1), (1, 6), (5, 1), (4, 3), (7, 9), (12, 5)]:
    Z = mgrid(ny, nx); m = mobj(Z, {"a": 0.5, "b": 4.5}, {"v": sorted(rng.uniform(0, 10, ny).round(3).tolist())})
    cases.append({"fn": "matT", "name": f"transpose {ny}x{nx}", "args": [m], "want": {"nx": ny, "ny": nx, "z": mz(Z.T)}})
    cases.append({"fn": "matFlip", "name": f"fliplr {ny}x{nx}", "args": [m, "lr", False], "want": {"nx": nx, "ny": ny, "z": mz(np.fliplr(Z))}})
    cases.append({"fn": "matFlip", "name": f"flipud {ny}x{nx}", "args": [m, "ud", True], "want": {"nx": nx, "ny": ny, "z": mz(np.flipud(Z))}})
    for k in (1, -1, 2, 3):
        R = np.rot90(Z, k)
        cases.append({"fn": "matTurn", "name": f"rot90 k={k} {ny}x{nx}", "args": [m, k], "want": {"nx": R.shape[1], "ny": R.shape[0], "z": mz(R)}})
# Crops: the rows and columns inside the ranges, by NumPy's boolean indexing.
for t in range(8):
    ny, nx = int(rng.integers(2, 12)), int(rng.integers(2, 12)); Z = mgrid(ny, nx)
    x = {"a": round(float(rng.uniform(-5, 0)), 2), "b": round(float(rng.uniform(1, 9)), 2)}
    y = {"v": sorted(rng.uniform(0, 20, ny).round(2).tolist(), reverse=bool(t % 2))}
    X, Y = axv(x, nx), axv(y, ny)
    x0, x1 = sorted(rng.choice(X, 2).tolist()); y0, y1 = sorted(rng.choice(Y, 2).tolist())
    if t % 3 == 0: x0, x1 = x1, x0
    cs = (X >= min(x0, x1)) & (X <= max(x0, x1)); rs = (Y >= y0) & (Y <= y1)
    C = Z[np.ix_(rs, cs)]
    cases.append({"fn": "matCrop", "name": f"crop {t}", "args": [mobj(Z, x, y), {"x0": x0, "x1": x1, "y0": y0, "y1": y1}],
                  "want": {"nx": C.shape[1], "ny": C.shape[0], "z": mz(C), "X": j(X[cs]), "Y": j(Y[rs])}})
# Resampling: bilinear over the same ends. SciPy wants ascending points: a descending axis is turned
# round with its values. A missing cell with a weight above zero makes a value missing: the
# interpolated share of missing cells above zero, the values with missing as 0 elsewhere.
def rgi(Y, X, Z, Yq, Xq):
    if X[-1] < X[0]: X, Z = X[::-1], Z[:, ::-1]
    if Y[-1] < Y[0]: Y, Z = Y[::-1], Z[::-1, :]
    G = np.meshgrid(Yq, Xq, indexing="ij"); P = np.stack([G[0].ravel(), G[1].ravel()], axis=1)
    pts = tuple(a for a, n in ((Y, len(Y)), (X, len(X))))
    def at(V):
        if len(Y) == 1 or len(X) == 1:  # SciPy needs two points an axis: a single row or column, by numpy.interp
            if len(Y) == 1 and len(X) == 1: return np.full(len(P), V[0, 0])
            if len(Y) == 1: return np.interp(P[:, 1], X, V[0])
            return np.interp(P[:, 0], Y, V[:, 0])
        return RegularGridInterpolator(pts, V, method="linear")(P)
    miss = np.isnan(Z); V = at(np.where(miss, 0.0, Z)); M = at(miss.astype(float))
    return np.where(M > 0, np.nan, V).reshape(len(Yq), len(Xq))
for t in range(14):
    ny, nx = int(rng.integers(1, 9)), int(rng.integers(2, 9)); Z = mgrid(ny, nx, gap=0 if t < 9 else 0.2)
    if t % 4 == 1: x = {"v": sorted(rng.uniform(0, 30, nx).round(3).tolist())}
    elif t % 4 == 2: x = {"a": 9.0, "b": -3.0}
    else: x = {"a": 0.0, "b": float(nx - 1) * 0.7}
    y = {"v": sorted(rng.uniform(-4, 4, ny).round(3).tolist(), reverse=t % 3 == 0)} if ny > 1 else {"a": 2.0, "b": 2.0}
    X, Y = axv(x, nx), axv(y, ny); nx2 = int(rng.integers(1, 15)); ny2 = 1 if ny == 1 else int(rng.integers(1, 12))
    if t == 0: nx2, ny2 = nx, ny
    Xq, Yq = np.linspace(X[0], X[-1], nx2), np.linspace(Y[0], Y[-1], ny2)
    cases.append({"fn": "matResample", "name": f"resample {t} {ny}x{nx} to {ny2}x{nx2}", "args": [mobj(Z, x, y), nx2, ny2],
                  "want": {"nx": nx2, "ny": ny2, "z": mz(rgi(Y, X, Z, Yq, Xq))}})
# Arithmetic: NumPy with NaN for missing; what is not a finite number (÷ 0) missing.
for t, op in enumerate(["+", "-", "*", "/", "/", "+", "*", "-"]):
    ny, nx = int(rng.integers(1, 8)), int(rng.integers(1, 8)); A = mgrid(ny, nx, ints=t % 2 == 0)
    B = float(rng.choice([0.0, 2.5, -3.0])) if t >= 5 else mgrid(ny, nx, ints=True)
    with np.errstate(all="ignore"):
        R = {"+": np.add, "-": np.subtract, "*": np.multiply, "/": np.divide}[op](A, B)
    R[~np.isfinite(R)] = np.nan
    cases.append({"fn": "matArith", "name": f"arith {op} {t}", "args": [mobj(A), B if isinstance(B, float) else mobj(B), op],
                  "want": {"nx": nx, "ny": ny, "z": mz(R)}})
# From a block of columns: the first row X and the first column Y when they read so.
for t in range(5):
    nr, nc = int(rng.integers(2, 8)), int(rng.integers(2, 8)); Z = mgrid(nr - 1, nc - 1)
    X = np.sort(rng.uniform(0, 100, nc - 1).round(2)); Y = np.sort(rng.uniform(-1, 1, nr - 1).round(4))[::(1 if t % 2 else -1)]
    cols = [[None] + Y.tolist()] + [[float(X[c])] + mz(Z[:, c]) for c in range(nc - 1)]
    cases.append({"fn": "matFromCols", "name": f"from columns {t}", "args": [cols, "auto"],
                  "want": {"nx": nc - 1, "ny": nr - 1, "z": mz(Z), "X": j(X), "Y": j(Y)}})
    flat = mz(Z.T)  # with no head: every cell a value, X and Y the positions
    cols2 = [mz(Z[:, c]) for c in range(nc - 1)]
    cases.append({"fn": "matFromCols", "name": f"from columns {t}, no head", "args": [cols2, "none"],
                  "want": {"nx": nc - 1, "ny": nr - 1, "z": mz(Z), "X": j(np.arange(1, nc, dtype=float)), "Y": j(np.arange(1, nr, dtype=float))}})
# To columns: X, Y, Z a row a cell (Y outer, X inner), as NumPy's meshgrid ravelled.
for t in range(3):
    ny, nx = int(rng.integers(1, 6)), int(rng.integers(1, 6)); Z = mgrid(ny, nx); x = {"a": -1.0, "b": 2.0}; y = {"v": sorted(rng.uniform(0, 5, ny).round(2).tolist())}
    GX, GY = np.meshgrid(axv(x, nx), axv(y, ny))
    cases.append({"fn": "matToCols", "name": f"to columns xyz {t}", "args": [mobj(Z, x, y), "xyz"], "want": {"cols": [j(GX.ravel()), j(GY.ravel()), mz(Z)]}})
    cases.append({"fn": "matToCols", "name": f"to columns block {t}", "args": [mobj(Z, x, y), "block"], "want": {"cols": [j(axv(y, ny))] + [mz(Z[:, c]) for c in range(nx)]}})
# A picture: PIL's grey (convert("L")) and each channel.
for t, (w, h) in enumerate([(1, 1), (7, 5), (16, 9)]):
    px = rng.integers(0, 256, (h, w, 4), dtype=np.uint8)
    if t == 2: px[0, :, :3] = 255; px[1, :, :3] = 0
    rgba = px.ravel().tolist()
    L = np.asarray(Image.fromarray(px, "RGBA").convert("L"), dtype=float)
    cases.append({"fn": "matGrey", "name": f"grey {w}x{h}", "args": [rgba, w, h, "grey"], "want": {"nx": w, "ny": h, "z": mz(L)}})
    for c, ch in enumerate("rgba"):
        cases.append({"fn": "matGrey", "name": f"{ch} {w}x{h}", "args": [rgba, w, h, ch], "want": {"nx": w, "ny": h, "z": mz(px[:, :, c])}})
# The text the check code hashes: Python's repr of each value is JavaScript's String for these.
for t in range(3):
    Z = mgrid(int(rng.integers(1, 5)), int(rng.integers(1, 5))); m = mobj(Z)
    txt = "".join(",".join("" if v != v else (str(int(v)) if float(v).is_integer() else repr(float(v))) for v in row) + "\n" for row in Z)
    cases.append({"fn": "matText", "name": f"check-code text {t}", "args": [m], "want": txt})
out["mat"] = cases

def write_or_check(name, cases):
    doc = {"made": MADE, "cases": j(cases)}
    path = os.path.join(here, "fixtures", name + ".json")
    if not check:
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(doc, fh, indent=0, separators=(",", ":"))
            fh.write("\n")
        print(f"wrote {path} ({len(cases)} cases)")
        return 0
    old = json.load(open(path, encoding="utf-8"))
    bad = 0
    def same(a, b):
        if isinstance(a, list) and isinstance(b, list):
            return len(a) == len(b) and all(same(u, v) for u, v in zip(a, b))
        if isinstance(a, dict) and isinstance(b, dict):
            return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return a == b or abs(a - b) <= 1e-13 * max(abs(a), abs(b))
        return a == b
    for i, (a, b) in enumerate(zip(doc["cases"], old["cases"])):
        if not same(a, b):
            bad += 1
            print(f"  {name}[{i}] {a.get('fn')}: differs from the committed value")
    if len(doc["cases"]) != len(old["cases"]):
        bad += 1
        print(f"  {name}: {len(doc['cases'])} cases made, {len(old['cases'])} committed")
    print(f"{name}: {'same' if not bad else str(bad) + ' different'} (committed with {old['made']}, made with {MADE})")
    return bad

only = args[args.index("--only") + 1].split(",") if "--only" in args else None
bad = sum(write_or_check(k, v) for k, v in out.items() if not only or k in only)
sys.exit(1 if bad else 0)
