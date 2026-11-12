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

bad = sum(write_or_check(k, v) for k, v in out.items())
sys.exit(1 if bad else 0)
