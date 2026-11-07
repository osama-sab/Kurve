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

# ---------- distributions fitted to values ----------
cases = []
rng = np.random.default_rng(11)
for n in [5, 20, 200]:
    v = rng.normal(3, 2, n)
    ks = stats.kstest(v, stats.norm(v.mean(), v.std(ddof=1)).cdf)
    cases.append({"fn": "distFit", "args": [list(v), "normal"], "kind": "fields",
                  "want": {"p": [v.mean(), v.std(ddof=1)], "ks": ks.statistic},
                  "info": {"pks_exact": stats.kstwo.sf(ks.statistic, n)}})
    w = rng.lognormal(0.5, 0.4, n)
    L = np.log(w)
    ks = stats.kstest(w, stats.lognorm(L.std(ddof=1), 0, math.exp(L.mean())).cdf)
    cases.append({"fn": "distFit", "args": [list(w), "lognormal"], "kind": "fields",
                  "want": {"p": [L.mean(), L.std(ddof=1)], "ks": ks.statistic},
                  "info": {"pks_exact": stats.kstwo.sf(ks.statistic, n)}})
    e = rng.exponential(2.5, n)
    ks = stats.kstest(e, stats.expon(0, e.mean()).cdf)
    cases.append({"fn": "distFit", "args": [list(e), "exp"], "kind": "fields",
                  "want": {"p": [1 / e.mean()], "ks": ks.statistic},
                  "info": {"pks_exact": stats.kstwo.sf(ks.statistic, n)}})
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
