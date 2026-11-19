"""Random cases for Kurve's numerics, against 40-digit references (refs.py, mpmath) and NumPy
(PARITY_SPEC.md, wave 0.2).

    PYREF=<dir> python3.13 -I tools/ref/diff-fuzz.py [seed] [cases per function]

Each function below has a generator of random inputs (from the seed), the reference's answer and a
tolerance. Every case goes through one `node tools/ref/run.mjs`; a case past its tolerance, a
non-number where the reference has one (or the reverse), or an error, is printed with the seed and
the case's number, which make it again. Ends 1 when anything failed.
"""
import json, math, os, subprocess, sys, warnings

here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"):
    sys.path.insert(0, os.environ["PYREF"])
warnings.filterwarnings("ignore")
import numpy as np
from scipy import special, stats
sys.path.insert(0, here)  # -I leaves the script's own folder off the path
import refs

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
per = int(sys.argv[2]) if len(sys.argv) > 2 else 400
rng = np.random.default_rng(seed)
TARGET = json.load(open(os.path.join(here, "targets.json"), encoding="utf-8"))

def lognum(lo, hi):
    """A number spread evenly over the orders of magnitude from 10^lo to 10^hi."""
    return float(10 ** rng.uniform(lo, hi))

def edge(xs, f):
    """Now and then an edge case instead of the random one (f makes the random one)."""
    return xs[int(rng.integers(len(xs)))] if rng.random() < 0.08 else f()

GEN = {}
SHARE = {}
def gen(name, tol, share=1.0):
    """A generator for Kurve's function `name`; its tolerance is targets.json's (tol here is the fallback);
    share, the part of the cases a function it gets (a slow reference, a third)."""
    def deco(f):
        GEN[name] = (f, TARGET.get(name, {}).get("tol", tol)); SHARE[name] = share
        return f
    return deco

@gen("erfFn", 1e-13)
def _():
    x = edge([0.0, 0.46875, -0.46875, 4.0, -4.0, 1e-300, 26.0], lambda: float(rng.choice([-1, 1]) * lognum(-12, 1.5)))
    return [x], refs.erf(x)

@gen("erfcFn", 1e-13)
def _():
    x = edge([0.0, 0.46875, 4.0, 26.5, -26.0], lambda: float(rng.uniform(-6, 26.5)))
    return [x], refs.erfc(x)

@gen("probit", 1e-12)
def _():
    p = edge([0.5, 0.02425, 0.97575, 1e-300], lambda: (lognum(-300, -0.31) if rng.random() < 0.5 else 1 - lognum(-15, -0.31)))
    return [p], refs.ndtri(p, special.ndtri(p))

@gen("lgammaFn", 1e-13)
def _():
    x = edge([1.0, 2.0, 0.5, 1e-10], lambda: lognum(-4, 9))
    return [x], refs.gammaln(x)

@gen("betai", 1e-12)
def _():
    a, b = lognum(-1, 6), lognum(-1, 4)
    x = edge([0.0, 1.0], lambda: float(rng.random()))
    return [a, b, x], refs.betainc(a, b, x)

@gen("tPvalue", 1e-6)
def _():
    dof = edge([1.0, 2.0, 1e7], lambda: float(rng.choice([rng.integers(1, 40), lognum(0, 7)])))
    t = float(rng.choice([-1, 1]) * lognum(-3, 2.5))
    return [t, dof], refs.t_two_sided(t, dof)

@gen("tCrit", 1e-9)
def _():
    dof = float(rng.choice([rng.integers(1, 40), lognum(0, 6)]))
    lev = float(1 - lognum(-9, -0.05))
    return [lev, dof], refs.t_crit(lev, dof, stats.t.isf((1 - lev) / 2, dof))

@gen("fPvalue", 1e-6)
def _():
    d1, d2 = float(rng.integers(1, 200)), float(rng.choice([rng.integers(1, 200), lognum(0, 6)]))
    F = lognum(-3, 4)
    return [F, d1, d2], refs.f_sf(F, d1, d2)

@gen("lbeta", 1e-13)
def _():
    a, b = lognum(-1, 7), lognum(-1, 7)
    return [a, b], refs.lbeta(a, b)

@gen("igamPQ#0", 1e-12)
def _():
    a = lognum(-0.5, 4); x = a * float(rng.uniform(0.2, 2.5)) if rng.random() < 0.8 else lognum(-3, 4.5)
    return [a, x], refs.igam(a, x, False)

@gen("igamPQ#1", 1e-12)
def _():
    a = lognum(-0.5, 4); x = a * float(rng.uniform(0.2, 2.5)) if rng.random() < 0.8 else lognum(-3, 4.5)
    return [a, x], refs.igam(a, x, True)

@gen("DIST.t.sf", 1e-12)
def _():
    nu = float(rng.choice([rng.integers(1, 40), lognum(0, 7)])); t = float(rng.choice([-1, 1]) * lognum(-3, 2.5))
    return [t, nu], refs.t_sf(t, nu)

@gen("DIST.t.isf", 1e-11)
def _():
    nu = float(rng.choice([rng.integers(1, 40), lognum(0, 6)])); q = lognum(-12, -0.31)
    return [q, nu], refs.t_isf(q, nu, stats.t.isf(q, nu))

@gen("DIST.chi2.isf", 1e-11)
def _():
    nu = float(rng.choice([rng.integers(1, 60), lognum(0, 4)])); q = lognum(-12, -0.31)
    return [q, nu], refs.chi2_isf(q, nu, stats.chi2.isf(q, nu))

@gen("DIST.binom.cdf", 1e-12)
def _():
    n = int(rng.integers(1, 5000)); p = float(rng.random()); k = int(rng.integers(0, n + 1))
    return [k, n, p], refs.binom_cdf(k, n, p)

@gen("DIST.pois.cdf", 1e-12)
def _():
    lam = lognum(-2, 5); k = max(0, int(lam + rng.normal() * 3 * lam ** 0.5))
    return [k, lam], refs.igam(k + 1, lam, True)

@gen("quantileSorted", 1e-12)
def _():
    n = int(rng.integers(1, 60))
    s = np.sort(rng.normal(0, lognum(-3, 3), n) + (rng.integers(0, 3) * 1e6 if rng.random() < 0.2 else 0))
    if rng.random() < 0.2: s = np.sort(np.round(s))  # ties
    p = edge([0.0, 1.0, 0.5], lambda: float(rng.random()))
    return [list(map(float, s)), p], np.quantile(s, p, method="linear")

def rand_vals():
    """A column as people have them: normal or log-normal, rounded so values tie, or offset far from
    zero with a small spread (as NumAcc's), 1 to 80 values."""
    n = int(rng.integers(1, 80)); kind = int(rng.integers(0, 5))
    if kind == 0: v = rng.normal(0, lognum(-3, 3), n)
    elif kind == 1: v = rng.lognormal(0, 1.5, n) * lognum(-5, 5)
    elif kind == 2: v = np.round(rng.normal(5, 3, n))
    elif kind == 3: v = float(rng.choice([1e6, 1e13, -1e9])) + rng.normal(0, 0.1, n)
    else: v = rng.normal(float(rng.choice([1, 100, -40])), lognum(-2, 1), n)
    return [float(x) for x in v]

@gen("quantileType", 1e-13)
def _():
    s = sorted(rand_vals()); t = [1, 2, 3, 4, 5, 6, 7, 8, 9, "tukey"][int(rng.integers(10))]
    p = float(rng.choice([0.25, 0.5, 0.75])) if t == "tukey" else edge([0.0, 1.0, 0.5, 0.25, 0.75], lambda: round(float(rng.random()), 3))
    return [s, p, t], refs.fl(refs.hf([refs.Fr(x) for x in s], refs.Fr(str(p)), t))

def desc_gen(key):
    def f():
        v = rand_vals(); w = refs.desc_ref(v, keys=(key,)).get(key)
        if w is None: raise ValueError("no such statistic for these values")
        return [v, {}], w
    return f
for key, tol in [("mean", 1e-15), ("sd", 1e-15), ("skew", 1e-14), ("kurt", 1e-14), ("gmean", 1e-14), ("med", 1e-15), ("mad", 1e-15)]:
    gen("descStats@" + key, tol)(desc_gen(key))

def norm_vals(lo=8, hi=120):
    """Values a normality test meets: normal, skewed, heavy-tailed, offset far from zero, one outlier."""
    n = int(rng.integers(lo, hi)); k = int(rng.integers(0, 5))
    if k == 0: v = rng.normal(0, lognum(-2, 2), n)
    elif k == 1: v = rng.lognormal(0, 0.8, n)
    elif k == 2: v = rng.standard_t(3, n)
    elif k == 3: v = 1e8 + rng.normal(0, 1, n)
    else: v = np.append(rng.normal(0, 1, n - 1), float(rng.choice([-1, 1]) * rng.uniform(3, 8)))
    return [float(x) for x in v]

@gen("swTest@w", 1e-14, 0.3)
def _():
    v = norm_vals(3, 200); return [v], refs.sw_ref(v)[0]

@gen("swTest@p", 1e-11, 0.3)
def _():
    v = norm_vals(3, 200); return [v], refs.sw_ref(v)[1]

@gen("lfTest@d", 1e-14, 0.3)
def _():
    v = norm_vals(4, 200); return [v], refs.ksnorm_d_ref(v)

@gen("adTest@a2", 1e-11, 0.3)
def _():
    v = norm_vals(8, 200); return [v], refs.ad_ref(v)[0]

@gen("dagoTest@k2", 1e-13, 0.3)
def _():
    v = norm_vals(8, 200); return [v], refs.dago_ref(v)[2]

@gen("kolmogN", 1e-12, 0.3)
def _():
    n = int(rng.integers(1, 400)); x = float(rng.uniform(0.6, 3.5) / math.sqrt(n))
    if not 0 < x < 1 or 2 * math.ceil(n * x) - 1 > 61: raise ValueError("matrix too large for the reference")
    return [n, x, True], float(refs.kolm_dmtw(n, x))

def t_sets():
    n1, n2 = int(rng.integers(2, 60)), int(rng.integers(2, 60)); loc = float(rng.choice([0, 10, 1e6]))
    a = [float(v) for v in rng.normal(loc, lognum(-1, 1), n1)]; b = [float(v) for v in rng.normal(loc + rng.normal(), lognum(-1, 1), n2)]
    return a, b, str(rng.choice(["two", "less", "greater"]))

@gen("tTest2@p", 1e-13, 0.3)
def _():
    a, b, alt = t_sets(); eq = bool(rng.random() < 0.5); return [a, b, {"alt": alt, "equal": eq}], refs.t_ref("two", a, b, alt=alt, equal=eq)["p"]

@gen("tTest1@t", 1e-14, 0.3)
def _():
    a, b, alt = t_sets(); mu = float(round(np.mean(a) + rng.normal(), 3)); return [a, {"mu0": mu}], refs.t_ref("one", a, mu0=mu)["t"]

@gen("nctCdf", 1e-12, 0.3)
def _():
    nu = float(rng.choice([1, 2, 4, 9, 30, 120])); dl = float(rng.uniform(-10, 10)); t = float(rng.uniform(-12, 12))
    w = stats.nct.cdf(t, nu, dl)
    if math.isnan(w): raise ValueError("no reference here")
    return [t, nu, dl], w

@gen("fisher22@p", 1e-13, 0.3)
def _():
    t = [int(v) for v in rng.integers(0, 25, 4)]
    if sum(t) == 0 or (t[0] + t[1]) * (t[2] + t[3]) * (t[0] + t[2]) * (t[1] + t[3]) == 0: raise ValueError("empty margin")
    alt = str(rng.choice(["two", "less", "greater"])); AM = {"two": "two-sided", "less": "less", "greater": "greater"}
    return [*t, {"alt": alt}], stats.fisher_exact([[t[0], t[1]], [t[2], t[3]]], alternative=AM[alt]).pvalue

def num(v):
    if isinstance(v, (str, dict)): return v
    v = float(v)
    return "NaN" if math.isnan(v) else ("Infinity" if v > 0 else "-Infinity") if math.isinf(v) else v

def anova_gen(key):
    """Random groups: 2 to 9, of 1 to 30 values (a group of one now and then), about an offset up to 1e12,
    spread from 1e-6 to 100, against the exact rational table."""
    def g():
        k = int(rng.integers(2, 10)); off = 0.0 if rng.random() < 0.4 else float(rng.choice([-1, 1]) * lognum(0, 12)); sd = lognum(-6, 2)
        gs = [[float(off + x) for x in rng.normal(rng.normal(0, sd), sd * lognum(-0.5, 0.5), int(rng.integers(1, 31)) if rng.random() > 0.1 else 1)] for _ in range(k)]
        if sum(len(x) for x in gs) - k < 1 or len(set(v for x in gs for v in x)) < 2: raise ValueError("too few")
        return [gs], refs.anova_ref(gs)[key]
    return g
for key in ["F", "p", "ssw"]:
    gen("anova1@" + key, 1e-13, 0.3)(anova_gen(key))

@gen("tukeySf", 1e-13, 0.3)
def _():
    """Against SciPy's studentized range, judged absolutely at 1e-12: SciPy is off by up to 5e-13 so (four
    cases it and Kurve disagreed on were settled in 40 digits, Kurve right to 2e-15 relative, SciPy 7e-6 off
    on a p of 3e-8). ν from 3 to 1000: past 1e4 SciPy drifts further, and past 1e5 it takes the normal's;
    range.json has 40-digit values there."""
    from scipy.stats import studentized_range as SR
    k = int(rng.integers(3, 30)); nu = float(rng.choice([rng.integers(3, 60), lognum(0.5, 3)])); q = float(rng.uniform(0.3, 9))
    return [q, k, nu], float(SR.sf(q, k, nu))

def _samp(n, ties):
    """n values, rounded to a few levels when ties are asked for."""
    v = rng.normal(rng.normal(0, 1), lognum(-1, 1), n)
    return [float(x) for x in (np.round(v * 2) / 2 if ties else v)]

@gen("mwTest@p", 1e-13, 0.3)
def _():
    m, n = int(rng.integers(1, 60)), int(rng.integers(1, 60)); ties = rng.random() < 0.3; x, y = _samp(m, ties), _samp(n, ties)
    alt = str(rng.choice(["two", "less", "greater"])); ex = len(set(x + y)) == m + n and m < 50 and n < 50
    if not ex and len(set(x + y)) < 2: raise ValueError("all equal")
    r = stats.mannwhitneyu(x, y, alternative={"two": "two-sided"}.get(alt, alt), method="exact" if ex else "asymptotic", use_continuity=True)
    return [x, y, {"alt": alt}], float(r.pvalue)

@gen("wsrTest@p", 1e-13, 0.3)
def _():
    n = int(rng.integers(1, 80)); ties = rng.random() < 0.3; v = _samp(n, ties); alt = str(rng.choice(["two", "less", "greater"])); z = str(rng.choice(["wilcox", "pratt"]))
    nz = [t for t in v if t != 0]; ex = len(nz) == n and len(set(abs(t) for t in v)) == n and n < 50
    if ex and z == "pratt": z = "wilcox"
    if len(nz) < 1 or (not ex and len(set(abs(t) for t in nz)) < 2 and len(nz) < 3): raise ValueError("degenerate")
    r = stats.wilcoxon(v, alternative={"two": "two-sided"}.get(alt, alt), zero_method=z, correction=True, method="exact" if ex else "approx")
    return [v, {"alt": alt, "zero": z}], float(r.pvalue)

@gen("ks2Test@p", 1e-12, 0.3)
def _():
    m, n = int(rng.integers(1, 120)), int(rng.integers(1, 120)); ties = rng.random() < 0.2; x, y = _samp(m, ties), _samp(n, ties); alt = str(rng.choice(["two", "less", "greater"]))
    return [x, y, {"alt": alt}], float(stats.ks_2samp(x, y, alternative={"two": "two-sided"}.get(alt, alt), method="exact").pvalue)

@gen("kwTest@H", 1e-13, 0.3)
def _():
    k = int(rng.integers(2, 7)); ties = rng.random() < 0.4; gs = [_samp(int(rng.integers(1, 25)), ties) for _ in range(k)]
    if len(set(v for g in gs for v in g)) < 2: raise ValueError("all equal")
    return [gs, {}], float(stats.kruskal(*gs).statistic)

def _pairs():
    """Paired values: 4 to 200, correlated anywhere from −1 to 1 (a third within 10⁻¹ to 10⁻¹³ of ±1), about an offset up to 1e12, spread 1e-6 to
    100, rounded to a few levels now and then (ties)."""
    n = int(rng.integers(4, 201)); rho = float(rng.uniform(-0.98, 0.98)) if rng.random() < 0.7 else float(rng.choice([-1, 1]) * (1 - lognum(-13, -1))); off = 0.0 if rng.random() < 0.5 else float(rng.choice([-1, 1]) * lognum(0, 12)); sd = lognum(-6, 2)
    x = rng.normal(0, 1, n); y = rho * x + math.sqrt(1 - rho * rho) * rng.normal(0, 1, n)
    if rng.random() < 0.25: x, y = np.round(x * 2) / 2, np.round(y * 2) / 2
    x, y = [float(off + sd * v) for v in x], [float(off + sd * v) for v in y]
    if len(set(x)) < 2 or len(set(y)) < 2: raise ValueError("no spread")
    return x, y

for key in ["r", "p"]:
    @gen("corrTest@" + key, 1e-13, 0.3)
    def _(key=key):
        x, y = _pairs(); alt = str(rng.choice(["two", "less", "greater"])); w = refs.corr_ref(x, y, alt)
        if abs(w["r"]) >= 1: raise ValueError("r of 1")
        return [x, y, {"alt": alt}], w[key]

@gen("spearmanTest@rho", 1e-13, 0.3)
def _():
    x, y = _pairs(); return [x, y, {}], refs.spearman_ref(x, y)["rho"]

@gen("kendallTau@p", 1e-13, 0.3)
def _():
    """Exact counts while untied and under 50 (a sample of 2 to 60, so both ways), else the normal."""
    x, y = _pairs(); n = int(rng.integers(2, 61)); x, y = x[:n], y[:n]
    if len(set(x)) < 2 or len(set(y)) < 2: raise ValueError("no spread")
    alt = str(rng.choice(["two", "less", "greater"])); return [x, y, {"alt": alt}], refs.kendall_ref(x, y, alt)["p"]

@gen("chi2Indep@p", 1e-13, 0.3)
def _():
    """A table of 2 to 5 rows and columns, counts 0 to 60 (a small total now and then), against the exact χ² and its
    40-digit tail."""
    r, c = int(rng.integers(2, 6)), int(rng.integers(2, 6)); hi = int(rng.choice([6, 20, 60]))
    T = [[int(v) for v in rng.integers(0, hi + 1, c)] for _ in range(r)]
    if any(sum(row) == 0 for row in T) or any(sum(row[j] for row in T) == 0 for j in range(c)): raise ValueError("an empty margin")
    y = bool(rng.random() < 0.5); return [T, {"yates": y}], refs.xtab_ref(T, y)["p"]

@gen("fisherRC@p", 1e-12, 0.3)
def _():
    """Small tables (2 to 3 rows, 2 to 4 columns, 25 counts at most), against Freeman–Halton in rationals."""
    r, c = int(rng.integers(2, 4)), int(rng.integers(2, 5)); T = [[int(v) for v in rng.integers(0, 6, c)] for _ in range(r)]
    if sum(map(sum, T)) > 25 or any(sum(row) == 0 for row in T) or any(sum(row[j] for row in T) == 0 for j in range(c)): raise ValueError("too large or empty")
    return [T], refs.fisher_rc_ref(T)

# the linear model (STATS_SPEC 2.5): random designs of numbers (about an offset up to 1e6) and factors (2 to 4 levels),
# interactions, powers, either coding, with or without an intercept, each sum of squares' type; one number a case,
# chosen at random (a coefficient, its error, a row of the analysis of variance, the model's p), against exact rationals
def lm_design():
    n = int(rng.integers(8, 41)); k = int(rng.integers(1, 4)); vars_ = []
    for i in range(k):
        if rng.random() < 0.45:
            L = int(rng.integers(2, 5)); code = [int(v) for v in rng.integers(0, L, n)]
            if len(set(code)) < 2: raise ValueError("one level")
            vars_.append({"name": "F%d" % i, "num": False, "code": code, "levels": ["l%d" % j for j in range(L)]})
        else:
            off = 0.0 if rng.random() < 0.5 else float(rng.choice([-1, 1]) * lognum(0, 6)); sc = lognum(-2, 2)
            vars_.append({"name": "x%d" % i, "num": True, "x": [float(off + v) for v in rng.normal(0, sc, n)]})
    spec = {"inter": str(rng.choice(["none", "pairs"])), "pow": int(rng.choice([1, 1, 2, 3])), "coding": str(rng.choice(["treat", "effect"])),
            "ss": int(rng.integers(1, 4)), "icpt": bool(rng.random() < 0.85)}
    # within reach of doubles: the columns, each scaled to length 1, conditioned under 1e11 (NIST's Filip is about 1e7); past
    # about 1e12 Kurve calls a column aliased that exact arithmetic still separates
    X, _, _ = refs._lm_cols(vars_, refs._lm_terms(vars_, spec), spec, n); Xf = np.array([[float(v) for v in c] for c in X]).T
    nr = np.linalg.norm(Xf, axis=0)
    if Xf.shape[1] >= n or not (nr > 0).all() or np.linalg.cond(Xf / nr) > 1e11: raise ValueError("out of reach")
    y = [float(v) for v in rng.normal(lognum(-1, 3), lognum(-2, 1), n)]
    w = refs.lm_ref(vars_, y, spec)
    if w["dfr"] < 1: raise ValueError("no df left")
    return [vars_, y, spec], w
def lm_pick(key):
    def g():
        a, w = lm_design()
        if key == "ss":
            rows = [i for i, r in enumerate(w["anova"]) if r["df"] > 0 and r["ss"] > 1e-300]
            if not rows: raise ValueError("no row")
            i = int(rng.choice(rows)); return a, w["anova"][i]["ss"], f"linModel@anova.rows.{i}.ss"
        if key == "pF":
            if w["pF"] is None: raise ValueError("no model F")
            return a, w["pF"], "linModel@pF"
        js = [j for j, v in enumerate(w[key]) if v is not None and v != 0]
        if not js: raise ValueError("none")
        j = int(rng.choice(js)); return a, w[key][j], f"linModel@{key}.{j}"
    return g
for key, tol in [("b", 1e-14), ("se", 1e-14), ("ss", 1e-14), ("pF", 1e-13)]:
    gen("linModel@" + key, tol, 0.1)(lm_pick(key))

# two- and three-way ANOVA (STATS_SPEC 2.6), through the kind itself (anaRunKind, its report read by path): 2 or 3 factors
# of 2 to 4 levels, no empty cell, about an offset up to 1e6, either type and with or without interactions; a mean's error
# or a simple effect's F, against exact rationals
def nway_design():
    k = int(rng.integers(2, 4)); n = int(rng.integers(20, 61)); vars_ = []
    for i in range(k):
        L = int(rng.integers(2, 5)); vars_.append({"name": "F%d" % i, "num": False, "levels": ["l%d" % j for j in range(L)], "code": [int(v) for v in rng.integers(0, L, n)]})
    if len(set(zip(*[v["code"] for v in vars_]))) < math.prod(len(v["levels"]) for v in vars_): raise ValueError("an empty cell")
    off = 0.0 if rng.random() < 0.5 else float(rng.choice([-1, 1]) * lognum(0, 6)); y = [float(off + v) for v in rng.normal(0, lognum(-2, 1), n)]
    spec = {"inter": str(rng.choice(["all", "none"])), "ss": int(rng.integers(1, 4))}
    ins = [{"id": "y", "name": "y", "vals": y, "rows": list(range(n))}] + [{"id": v["name"], "name": v["name"], "rows": list(range(n)), "cats": {"keys": [v["levels"][c] for c in v["code"]], "order": None}} for v in vars_]
    return vars_, y, spec, ins
def nway_pick(key):
    def g():
        vars_, y, spec, ins = nway_design(); w = refs.nway_ref(vars_, y, spec); k = len(vars_); p = {"y": "y", "inter": spec["inter"], "ss": spec["ss"], "simple": key == "F"}
        if key == "se":
            i = int(rng.integers(k)); l = int(rng.integers(len(vars_[i]["levels"])))
            return ["anovan", ins, p], w["means"][i][l]["se"], f"anaRunKind@report.sections.{2 + i}.tables.0.rows.{l}.2"
        e = int(rng.integers(len(w["simple"]))); q = w["simple"][e]; pairs = [(i, j) for i in range(k) for j in range(k) if i != j]
        return ["anovan", ins, p], q["F"], f"anaRunKind@report.sections.{3 + k + pairs.index((q['f'], q['g']))}.tables.0.rows.{q['l']}.2"
    return g
for key, tol in [("se", 1e-14), ("F", 1e-13)]:
    gen("nway@" + key, tol, 0.08)(nway_pick(key))

# repeated measures (STATS_SPEC 2.7): one or two within factors of 2 to 4 levels, 4 to 20 subjects, a between factor of 2 or 3
# groups now and then, about an offset up to 1e6; an effect's F, Greenhouse–Geisser's ε or its p, against rational projections
def rm_pick(key):
    def g():
        lv = [int(rng.integers(2, 5))] + ([int(rng.integers(2, 4))] if rng.random() < 0.4 else []); c = math.prod(lv); n = int(rng.integers(4, 21))
        gk = int(rng.integers(2, 4)) if rng.random() < 0.35 else 1; grp = [int(v) for v in rng.integers(0, gk, n)] if gk > 1 else None
        if grp and (len(set(grp)) < gk or n - gk < 2): raise ValueError("a group too small")
        off = 0.0 if rng.random() < 0.5 else float(rng.choice([-1, 1]) * lognum(0, 6)); sd = lognum(-2, 1)
        Y = [[float(off + s0 + v) for v in rng.normal(0, sd, c)] for s0 in rng.normal(0, sd * 3, n)]
        w = refs.rm_ref(Y, lv, grp); i = int(rng.integers(len(w["effs"]))); e = w["effs"][i]
        if key == "eps" and e["d"] < 2: raise ValueError("no ε")
        k = {"F": "F", "eps": "gg", "p": "pgg"}[key]; return [Y, lv, grp], e[k], f"rmAnova@effs.{i}.{k}"
    return g
for key, tol in [("F", 1e-14), ("eps", 1e-14), ("p", 1e-13)]:
    gen("rmAnova@" + key, tol, 0.08)(rm_pick(key))

# power (STATS_SPEC 2.11): a random test, its settings and a size (log-uniform), against 60 digits, absolutely; cases whose
# noncentrality passes 500 (power 1 to the last digit) drawn again. The noncentral F's and χ²'s tails, relatively.
def pow_case():
    t = str(rng.choice(["t1", "tp", "t2", "anova", "p1", "p2", "v1", "v2", "chi2"])); o = {"test": t, "alpha": float(rng.choice([0.01, 0.05, 0.1])), "alt": str(rng.choice(["two", "greater", "less"]))}
    if t in ("t1", "tp", "t2"): o.update(d=float(round(rng.normal(0, 1), 3)), sd=float(round(lognum(-1, 1), 3)))
    if t in ("t2", "p2", "v2"): o["r"] = float(rng.choice([0.5, 1, 1, 1.5, 2, 3]))
    if t == "anova": o.update(means=[float(round(v, 3)) for v in rng.normal(0, 1, int(rng.integers(2, 7)))], sd=float(round(lognum(-0.5, 1), 3)))
    if t == "p1": o.update(p0=float(round(rng.uniform(0.05, 0.95), 2)), p1=float(round(rng.uniform(0.05, 0.95), 2)))
    if t == "p2": o.update(p1=float(round(rng.uniform(0.05, 0.95), 2)), p2=float(round(rng.uniform(0.05, 0.95), 2)))
    if t == "v1": o.update(v0=float(round(lognum(-1, 1), 3)), v1=float(round(lognum(-1, 1), 3)))
    if t == "v2": o.update(v1=float(round(lognum(-1, 1), 3)), v2=float(round(lognum(-1, 1), 3)))
    if t == "chi2": o.update(w=float(round(rng.uniform(0, 0.8), 3)), df=int(rng.integers(1, 10)))
    n = int(round(math.exp(rng.uniform(math.log(4 if t == "v2" else 2), math.log(300 if t == "p1" else 2000)))))
    n2 = math.ceil(o.get("r", 1) * n - 1e-9)
    lam = (o["d"] / o["sd"]) ** 2 * (n if t != "t2" else n * n2 / (n + n2)) / 2 if t in ("t1", "tp", "t2") else \
        n * float(np.var(o["means"])) * len(o["means"]) / o["sd"] ** 2 / 2 if t == "anova" else n * o["w"] ** 2 / 2 if t == "chi2" else 0
    if lam > 500: raise ValueError("power 1 to the last digit")
    return o, n
@gen("powerAt@pw", 1e-13, 0.08)
def _():
    o, n = pow_case(); return [o, n], refs.power_ref(o, n)
# ROC (STATS_SPEC 2.12): two groups of 2 to 60 scores, rounded to make ties now and then, about an offset; the area's SE
# against exact pairs
@gen("rocTest@se", 1e-14, 0.08)
def _():
    d = int(rng.choice([0, 1, 3])); off = 0.0 if rng.random() < 0.6 else float(lognum(0, 6)); sh = float(rng.normal(0.5, 0.7))
    P = [round(off + float(v), d) for v in rng.normal(sh, 1, int(rng.integers(2, 61)))]; N = [round(off + float(v), d) for v in rng.normal(0, 1, int(rng.integers(2, 61)))]
    dr = str(rng.choice(["high", "low"])); return [P, N, {"dir": dr}], refs.roc_ref(P, N, dr)["se"]
@gen("DIST.ncf.sf", 1e-13, 0.08)
def _():
    d1, d2, lam = float(rng.integers(1, 12)), float(round(lognum(0, 3))), float(round(lognum(-2, 2.5), 3)); x = float(round(lognum(-1.5, 1.5), 4))
    return [x, d1, d2, lam], refs.nc_tail("f", [x, d1, d2, lam], True)
@gen("DIST.ncx2.cdf", 1e-13, 0.08)
def _():
    k, lam = float(rng.integers(1, 15)), float(round(lognum(-2, 2.5), 3)); x = float(round(lognum(-1, 2.5), 4))
    return [x, k, lam], refs.nc_tail("x2", [x, k, lam], False)

# Worksheet formulas (SHEET_SPEC 3.1): a random expression over columns with gaps (B, C), text (G), an X, a constant (k),
# written out as a formula and worked out here row by row with NaN as missing, every sum exact (math.fsum) and the SD from
# exact fractions; one row of it compared. Each value carries the scale of the error its double arithmetic may make (the sum
# of the magnitudes it was made from), and a comparison whose two sides are within that of each other is not judged.
import statistics
from fractions import Fraction
class Ambiguous(Exception): pass
EPS = 2.0 ** -52
def fx_expr(depth, cond=False):
    r = rng.random()
    if cond or (depth > 0 and r < 0.12):
        k = rng.random()
        if k < 0.2: return ("cmpt", "==" if rng.random() < 0.6 else "!=", str(rng.choice(["a", "b", "c"])))
        if k < 0.45 and depth > 0: return ("logic", str(rng.choice(["and", "or"])), [fx_expr(depth - 1, True), fx_expr(depth - 1, True)])
        if k < 0.55 and depth > 0: return ("not", fx_expr(depth - 1, True))
        if k < 0.62: return ("miss", fx_expr(max(0, depth - 1)))
        return ("cmp", str(rng.choice(["<", "<=", ">", ">=", "==", "!="])), fx_expr(max(0, depth - 1)), fx_expr(max(0, depth - 1)))
    if depth <= 0 or r < 0.25:
        k = rng.random()
        if k < 0.3: return ("par", str(rng.choice(["B", "C"])))
        if k < 0.42: return ("num", float(round(rng.normal(0, 10), int(rng.integers(0, 4)))))
        if k < 0.5: return ("par", "k")
        if k < 0.58: return ("row",)
        if k < 0.65: return ("x",)
        if k < 0.85: return ("idx", str(rng.choice(["B", "C"])), ("bin", "+", ("row",), ("num", float(rng.integers(-2, 3)))))
        return ("idx", str(rng.choice(["B", "C"])), ("num", float(rng.integers(0, 8))))
    if r < 0.55: return ("bin", str(rng.choice(["+", "-", "*", "/"])), fx_expr(depth - 1), fx_expr(depth - 1))
    if r < 0.62: return ("neg", fx_expr(depth - 1))
    if r < 0.68: return ("fn", str(rng.choice(["abs", "sqrt"])), fx_expr(depth - 1))
    if r < 0.75: return ("if", fx_expr(depth - 1, True), fx_expr(depth - 1), fx_expr(depth - 1))
    if r < 0.9: return ("agg", str(rng.choice(["sum", "mean", "count", "min", "max", "median", "sd"])), fx_expr(depth - 1))
    if r < 0.95: return ("agg", "percentile", fx_expr(depth - 1), float(rng.integers(0, 101)))
    return ("cum", fx_expr(depth - 1))
def fx_text(n):
    t = n[0]
    if t == "num": return repr(n[1]) if n[1] >= 0 else f"({n[1]!r})"
    if t == "par": return n[1]
    if t == "row": return "i"
    if t == "x": return "x"
    if t == "idx": return f"{n[1]}[{fx_text(n[2])}]"
    if t == "bin": return f"({fx_text(n[2])} {n[1]} {fx_text(n[3])})"
    if t == "neg": return f"-({fx_text(n[1])})"
    if t == "fn": return f"{n[1]}({fx_text(n[2])})"
    if t == "if": return f"if({fx_text(n[1])}, {fx_text(n[2])}, {fx_text(n[3])})"
    if t == "agg": return f"{n[1]}({fx_text(n[2])}{', ' + repr(n[3]) if n[1] == 'percentile' else ''})"
    if t == "cum": return f"cumsum({fx_text(n[1])})"
    if t == "cmp": return f"({fx_text(n[2])} {n[1]} {fx_text(n[3])})"
    if t == "cmpt": return f'(G {n[1]} "{n[2]}")'
    if t == "logic": return f"{n[1]}({fx_text(n[2][0])}, {fx_text(n[2][1])})"
    if t == "not": return f"not({fx_text(n[1])})"
    if t == "miss": return f"missing({fx_text(n[1])})"
def fx_names(n, inagg=False, acc=None):
    acc = acc if acc is not None else {"row": set(), "all": set(), "rowx": False}
    t = n[0]
    if t in ("par", "idx") and n[1] != "k":
        acc["all"].add(n[1])
        if not inagg: acc["row"].add(n[1])
    if t == "x" and not inagg: acc["rowx"] = True
    if t == "cmpt":
        acc["all"].add("G")
        if not inagg: acc["row"].add("G")
    for c in n[1:]:
        if isinstance(c, tuple): fx_names(c, inagg or t == "agg", acc)
        if isinstance(c, list): [fx_names(q, inagg or t == "agg", acc) for q in c]
    return acc
def fx_usesx(n):
    return n[0] == "x" or any(fx_usesx(c) for c in n[1:] if isinstance(c, tuple)) or any(fx_usesx(q) for c in n[1:] if isinstance(c, list) for q in c)
def fx_eval_case(tree, D):
    names = fx_names(tree); L = {k: len(D[k]) for k in ("B", "C", "G")}
    n = max([L[k] for k in names["row"]] + ([len(D["X"])] if names["rowx"] else []) + [0]) if (names["row"] or names["rowx"]) else D["nDef"]
    N = max([L[k] for k in names["all"]] + ([len(D["X"])] if fx_usesx(tree) else []) + [n])
    cache = {}
    def cell(k, r):
        a = D[k]
        if r < 0 or r >= len(a) or a[r] is None: return math.nan
        return a[r]
    def rowof(v):
        if not math.isfinite(v): return -1
        q = round(v)
        if abs(v - q) > 1e-9 * max(1, abs(v)) or q < 1: return -1
        return int(q) - 1
    def ev(nd, r):  # (value, magnitude)
        t = nd[0]
        if t == "num": return nd[1], abs(nd[1])
        if t == "par":
            if nd[1] == "k": return D["k"], abs(D["k"])
            v = cell(nd[1], r); return v, abs(v)
        if t == "row": return float(r + 1), float(r + 1)
        if t == "x": v = cell("X", r); return v, abs(v)
        if t == "idx":
            j = rowof(ev(nd[2], r)[0]); v = cell(nd[1], j) if j >= 0 else math.nan; return v, abs(v)
        if t == "neg": v, m = ev(nd[1], r); return -v, m
        if t == "bin":
            (a, ma), (b, mb) = ev(nd[2], r), ev(nd[3], r)
            with np.errstate(all="ignore"):
                if nd[1] == "+": return float(np.float64(a) + b), ma + mb
                if nd[1] == "-": return float(np.float64(a) - b), ma + mb
                if nd[1] == "*": return float(np.float64(a) * b), ma * mb
                v = float(np.float64(a) / np.float64(b)); return v, (ma / abs(b) + abs(a) * mb / b ** 2) if b != 0 else math.inf
        if t == "fn":
            a, m = ev(nd[2], r)
            if math.isnan(a): return math.nan, math.nan
            if nd[1] == "abs": return abs(a), m
            v = math.sqrt(a) if a >= 0 else math.nan; return v, (m / (2 * v) + v if v > 0 else math.inf)
        if t in ("cmp", "cmpt"):
            if t == "cmpt":
                g = D["Gt"].get(r)
                if g is None and (r >= len(D["G"]) or D["G"][r] is None): return math.nan, 0.0
                same = g is not None and g == nd[2]; return (1.0 if same != (nd[1] == "!=") else 0.0), 0.0
            (a, ma), (b, mb) = ev(nd[2], r), ev(nd[3], r)
            if math.isnan(a) or math.isnan(b): return math.nan, 0.0
            if abs(a - b) <= 256 * EPS * (ma + mb) and (ma + mb) > 0 and not (a == b and ma == 0 and mb == 0): raise Ambiguous()
            return (1.0 if {"<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b, "==": a == b, "!=": a != b}[nd[1]] else 0.0), 0.0
        if t == "if":
            c, _ = ev(nd[1], r)
            if math.isnan(c): return math.nan, math.nan
            return ev(nd[2] if c != 0 else nd[3], r)
        if t == "logic":
            vs = [ev(q, r)[0] for q in nd[2]]
            if any(math.isnan(v) for v in vs): return math.nan, 0.0
            return (1.0 if (all(v != 0 for v in vs) if nd[1] == "and" else any(v != 0 for v in vs)) else 0.0), 0.0
        if t == "not":
            v, _ = ev(nd[1], r); return (math.nan if math.isnan(v) else 1.0 if v == 0 else 0.0), 0.0
        if t == "miss":
            v, m = ev(nd[1], r)
            if math.isfinite(v) and abs(v) > 1e300: raise Ambiguous()
            return (0.0 if math.isfinite(v) else 1.0), 0.0
        if t == "agg":
            key = id(nd)
            if key not in cache:
                sub = fx_names(nd[2]); ux = fx_usesx(nd[2]); m = max([L[k] for k in sub["all"]] + ([len(D["X"])] if ux else []) + [0]) if (sub["all"] or ux) else n
                vals = []; mags = []
                for j in range(m):
                    v, mg = ev(nd[2], j)
                    if math.isfinite(v): vals.append(v); mags.append(mg)
                f = nd[1]; cnt = len(vals); M = max(mags) if mags else 0.0
                if f == "count": res = (float(cnt), 0.0)
                elif f == "sum": res = (math.fsum(vals), math.fsum(mags))
                elif not cnt: res = (math.nan, math.nan)
                elif f == "mean": res = (math.fsum(vals) / cnt, math.fsum(mags) / cnt)
                elif f == "min": res = (min(vals), M)
                elif f == "max": res = (max(vals), M)
                elif f in ("median", "percentile"):
                    q = 50.0 if f == "median" else nd[3]; res = (float(np.percentile(vals, q, method="linear")), M)
                elif f == "sd":
                    res = (float(statistics.stdev([Fraction(v) for v in vals])), 2 * M + 0.0) if cnt > 1 else (math.nan, math.nan)
                cache[key] = res
            return cache[key]
        if t == "cum":
            key = id(nd)
            if key not in cache:
                arr, run, rm = [], [], []
                for j in range(N):
                    v, mg = ev(nd[1], j)
                    if not math.isfinite(v): arr.append((math.nan, math.nan)); continue
                    run.append(v); rm.append(mg); arr.append((math.fsum(run), math.fsum(rm)))
                cache[key] = arr
            a = cache[key]; return a[r] if r < len(a) else (math.nan, math.nan)
        raise ValueError(t)
    return n, ev
def fx_data():
    n = int(rng.integers(1, 40)); gap = float(rng.choice([0, 0.1, 0.4])); mag = lognum(-3, 4)
    def col(m):
        if rng.random() < 0.3: return [None if rng.random() < gap else float(rng.integers(-5, 6)) for _ in range(m)]
        return [None if rng.random() < gap else float(rng.normal(0, mag)) for _ in range(m)]
    B, C = col(n), col(max(0, n + int(rng.integers(-3, 4))))
    G, Gt = [], {}
    for r in range(n + int(rng.integers(-2, 3))):
        u = rng.random()
        if u < 0.6: G.append(None); Gt[r] = str(rng.choice(["a", "b", "c"]))
        elif u < 0.8: G.append(float(rng.integers(0, 3)))
        else: G.append(None)
    X = [None if rng.random() < gap / 3 else float(r * 0.25) for r in range(n)]
    return {"B": B, "C": C, "G": G, "Gt": Gt, "X": X, "k": float(rng.normal(0, 3)), "nDef": n + int(rng.integers(0, 3))}
@gen("fxCalcAt", 1e-13, 0.6)
def _():
    tree = fx_expr(int(rng.integers(1, 5))); D = fx_data(); n, ev = fx_eval_case(tree, D)
    r = int(rng.integers(0, max(1, n) + 2))
    v, m = ev(tree, r) if r < n else (math.nan, 0.0)
    if not math.isfinite(v): v, m = math.nan, 0.0
    floor = 64 * EPS * (m if math.isfinite(m) else math.inf)
    if not math.isfinite(floor): raise Ambiguous()
    return [fx_text(tree), {"B": D["B"], "C": D["C"], "G": D["G"], "k": D["k"]}, {"G": {str(q): t for q, t in D["Gt"].items()}}, D["X"], D["nDef"], r, floor], v

# Kurve's workbooks read back (SHEET_SPEC 3.7): random sheets of numbers, text (some that reads as a number,
# some with XML's characters, _xHHHH_, spaces at the ends), dates and times written by xlsxBytes, then read by
# openpyxl and pandas; every cell compared. The output is the workbook's bytes, compared in POST.
import io, base64, datetime as _dt
POST = {}
def xl_sheet():
    n, m = int(rng.integers(0, 30)), int(rng.integers(1, 6)); cols = []
    for j in range(m):
        kind = str(rng.choice(["num", "num", "text", "date", "time"])); vals, txt = [], {}
        for r in range(n):
            u = rng.random()
            if u < 0.15: vals.append(None); continue
            if kind == "num": vals.append(float(rng.choice([rng.normal(0, lognum(-300, 300)), float(rng.integers(-1000, 1000)), 0.1 + 0.2, 1 / 3])))
            elif kind == "date": vals.append(float(rng.integers(-2203891200, 4102444800)) + float(rng.integers(0, 1000)) / 1000)
            elif kind == "time": vals.append(float(rng.integers(0, 3600 * 900)) + float(rng.integers(0, 1000)) / 1000)
            else:
                vals.append(None); txt[str(r)] = str(rng.choice(["007", "1.5", "a & b <c>", "_x0041_", " lead", "trail ", 'q"uote', "naïve 日本", "#N/A", "x" * int(rng.integers(1, 40))]))
        cols.append({"name": str(rng.choice(["", "Time", "Signal", "2019", "a&b"])) , "unit": str(rng.choice(["", "", "s", "°C"])), "comm": str(rng.choice(["", "", "note"])), "vals": vals, "txt": txt, "tfmt": kind if kind in ("date", "time") else None})
    return {"name": str(rng.choice(["Sheet", "Data", "a:b", "History", "x" * 40])), "cols": cols}
@gen("xlsxBytes", 0, 0.25)
def _():
    sheets = [xl_sheet() for _ in range(int(rng.integers(1, 4)))]
    return [sheets], sheets
def xl_post(c, out):
    data = bytes(out); sheets = c["want"]
    try: wb = __import__("openpyxl").load_workbook(io.BytesIO(data))
    except Exception as e: return math.inf, f"openpyxl cannot read it: {e}"
    import pandas as pd
    if len(wb.worksheets) != len(sheets): return math.inf, f"{len(wb.worksheets)} sheets for {len(sheets)}"
    xls = pd.read_excel(io.BytesIO(data), sheet_name=None, header=None, na_filter=False)  # "#N/A" is a text here, not pandas' missing value
    for ws, sh in zip(wb.worksheets, sheets):
        cols = sh["cols"]; k = 0 if not any(q["name"] or q["unit"] or q["comm"] for q in cols) else 3 if any(q["comm"] for q in cols) else 2 if any(q["unit"] for q in cols) else 1
        df = xls[ws.title]
        for j, q in enumerate(cols):
            hd = [q["name"], q["unit"], q["comm"]][:k]
            for r, h in enumerate(hd):
                v = ws.cell(row=r + 1, column=j + 1).value
                if (v or "") != h: return math.inf, f"{ws.title} header {r},{j}: {v!r} for {h!r}"
            n = max(len(q["vals"]), max([int(t) + 1 for t in q["txt"]] or [0]))
            for r in range(n):
                v = q["vals"][r] if r < len(q["vals"]) else None; t = q["txt"].get(str(r)); got = ws.cell(row=r + k + 1, column=j + 1).value
                pv = df.iat[r + k, j] if r + k < df.shape[0] and j < df.shape[1] else None
                if v is not None:
                    if q["tfmt"] == "date": want = _dt.datetime(1970, 1, 1) + _dt.timedelta(seconds=v)
                    elif q["tfmt"] == "time": want = _dt.timedelta(seconds=v)
                    else: want = v
                    if q["tfmt"] == "date":
                        ok = isinstance(got, _dt.datetime) and abs((got - want).total_seconds()) <= 1e-3 and abs((pd.Timestamp(pv).to_pydatetime() - want).total_seconds()) <= 1e-3
                    elif q["tfmt"] == "time":
                        gs = got.total_seconds() if isinstance(got, _dt.timedelta) else (got.hour * 3600 + got.minute * 60 + got.second + got.microsecond / 1e6) if isinstance(got, _dt.time) else None
                        ok = gs is not None and abs(gs - v) <= 1e-3
                    else:  # openpyxl: a double, or a whole number a double holds exactly (past 2^53 Kurve writes the exponent, so it is
                        # not read as an exact integer a few units away); pandas turns a whole double into an int, exactly
                        exact = isinstance(got, float) or (isinstance(got, int) and abs(got) < 2 ** 53)
                        ok = exact and float(got) == want and float(pv) == want and (not isinstance(pv, (int, np.integer)) or int(pv) == int(want))
                    if not ok: return math.inf, f"{ws.title} {r + k + 1},{j + 1}: {got!r} / pandas {pv!r} for {want!r}"
                elif t is not None:
                    # openpyxl keeps a text as written; pandas reads a column's text that looks like a number as that
                    # number (its TextParser's inference), so a text such as "1.5" may come back from it as 1.5
                    def num(x):
                        try: return float(x)
                        except Exception: return None
                    pok = pv == t or (isinstance(pv, (int, float, np.integer, np.floating)) and num(t) is not None and float(pv) == num(t))
                    if got != t or not pok: return math.inf, f"{ws.title} {r + k + 1},{j + 1}: {got!r} / pandas {pv!r} for the text {t!r}"
                elif got is not None: return math.inf, f"{ws.title} {r + k + 1},{j + 1}: {got!r} for an empty cell"
    return 0.0, ""
POST["xlsxBytes"] = xl_post

# Matrices (SHEET_SPEC 3.6): random grids (missing cells, even, uneven and falling axes) turned by NumPy's rot90,
# put through NumPy's arithmetic, and resampled by SciPy's RegularGridInterpolator; the whole grid compared in POST,
# exactly but for resampling (to its error over the grid's largest value).
from scipy.interpolate import RegularGridInterpolator as _RGI
def m_grid(ny, nx, gap):
    Z = np.round(rng.normal(0, lognum(-2, 3), (ny, nx)), int(rng.integers(0, 6)))
    if gap: Z[rng.random((ny, nx)) < gap] = np.nan
    return Z
def m_obj(Z, x, y): ny, nx = Z.shape; return {"nx": nx, "ny": ny, "x": x, "y": y, "z": [None if v != v else float(v) for v in Z.ravel()]}
def m_axis(n):
    u = rng.random()
    if u < 0.4: a, b = float(rng.normal(0, 10)), float(rng.normal(0, 10)); return ({"a": a, "b": b if b != a or n == 1 else a + 1})
    v = np.cumsum(rng.uniform(0.1, 3, n)) + float(rng.normal(0, 5)); v = v[::-1] if u < 0.7 else v
    return {"v": [float(q) for q in v]}
def m_vals(ax, n): return np.array(ax["v"]) if "v" in ax else np.linspace(ax["a"], ax["b"], n)
def m_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or out.get("fail"): return math.inf, f"no matrix: {out!r}"[:200]
    if out.get("nx") != w["nx"] or out.get("ny") != w["ny"]: return math.inf, f"size {out.get('ny')} × {out.get('nx')}, the reference {w['ny']} × {w['nx']}"
    scale = max([abs(v) for v in w["z"] if v is not None] or [1.0]) if c["fn"] == "matResample" else 0
    e = 0.0
    for i, (g, v) in enumerate(zip(out["z"], w["z"])):
        if g is None or v is None or g == "NaN":
            if not ((g is None or g == "NaN") and v is None): return math.inf, f"cell {i}: {g!r}, the reference {v!r}"
            continue
        d = abs(g - v); e = max(e, d / scale if scale else (0.0 if d == 0 else d / max(abs(v), 1e-300)))
    return e, f"error {e:.2e}"
@gen("matTurn", 0)
def _():
    ny, nx = int(rng.integers(1, 12)), int(rng.integers(1, 12)); Z = m_grid(ny, nx, 0.2); k = int(rng.choice([1, -1, 2, 3, 4, -3]))
    R = np.rot90(Z, k); return [m_obj(Z, m_axis(nx), m_axis(ny)), k], {"nx": R.shape[1], "ny": R.shape[0], "z": [None if v != v else float(v) for v in R.ravel()]}
POST["matTurn"] = m_post
@gen("matArith", 0)
def _():
    ny, nx = int(rng.integers(1, 9)), int(rng.integers(1, 9)); A = m_grid(ny, nx, 0.15); op = str(rng.choice(["+", "-", "*", "/"]))
    B = float(rng.choice([0.0, rng.normal(0, 4)])) if rng.random() < 0.3 else m_grid(ny, nx, 0.15)
    if not isinstance(B, float) and rng.random() < 0.3: B[rng.random((ny, nx)) < 0.3] = 0.0
    with np.errstate(all="ignore"): R = {"+": np.add, "-": np.subtract, "*": np.multiply, "/": np.divide}[op](A, B)
    R[~np.isfinite(R)] = np.nan
    return [m_obj(A, {"a": 1, "b": nx}, {"a": 1, "b": ny}), B if isinstance(B, float) else m_obj(B, {"a": 1, "b": nx}, {"a": 1, "b": ny}), op], {"nx": nx, "ny": ny, "z": [None if v != v else float(v) for v in R.ravel()]}
POST["matArith"] = m_post
@gen("matResample", 4e-16, 0.5)
def _():
    ny, nx = int(rng.integers(1, 10)), int(rng.integers(1, 10)); Z = m_grid(ny, nx, 0.15 if rng.random() < 0.3 else 0)
    x, y = m_axis(nx), m_axis(ny); X, Y = m_vals(x, nx), m_vals(y, ny)
    nx2 = 1 if nx == 1 else int(rng.integers(1, 16)); ny2 = 1 if ny == 1 else int(rng.integers(1, 16))
    if (nx > 1 and X[0] == X[-1]) or (ny > 1 and Y[0] == Y[-1]): raise ValueError("flat")
    Xq, Yq = np.linspace(X[0], X[-1], nx2), np.linspace(Y[0], Y[-1], ny2)
    Xs, Ys, Zs = X, Y, Z
    if nx > 1 and Xs[-1] < Xs[0]: Xs, Zs = Xs[::-1], Zs[:, ::-1]
    if ny > 1 and Ys[-1] < Ys[0]: Ys, Zs = Ys[::-1], Zs[::-1, :]
    G = np.meshgrid(Yq, Xq, indexing="ij"); P = np.stack([G[0].ravel(), G[1].ravel()], axis=1)
    def at(V):
        if ny == 1 and nx == 1: return np.full(len(P), V[0, 0])
        if ny == 1: return np.interp(P[:, 1], Xs, V[0])
        if nx == 1: return np.interp(P[:, 0], Ys, V[:, 0])
        return _RGI((Ys, Xs), V, method="linear")(P)
    miss = np.isnan(Zs); V = at(np.where(miss, 0.0, Zs)); M = at(miss.astype(float)); R = np.where(M > 0, np.nan, V)
    return [m_obj(Z, x, y), nx2, ny2], {"nx": nx2, "ny": ny2, "z": [None if v != v else float(v) for v in R]}
POST["matResample"] = m_post

# ---- Polynomials by QR (FIT2_SPEC 4.1): the least-squares solution of the doubles, in rationals; Kurve's centred
# coefficients evaluated exactly at the points, so the error measured is the solve's, not the evaluation's ----
from fractions import Fraction as Fr
def fr_solve(G, g):
    m = len(g); A = [row[:] + [g[i]] for i, row in enumerate(G)]
    for c in range(m):
        p = next(r for r in range(c, m) if A[r][c] != 0); A[c], A[p] = A[p], A[c]
        for r in range(m):
            if r != c and A[r][c] != 0:
                f = A[r][c] / A[c][c]; A[r] = [a - f * b for a, b in zip(A[r], A[c])]
    return [A[i][m] / A[i][i] for i in range(m)]
@gen("polyLsq", 1e-13, 0.3)
def _():
    n, k = int(rng.integers(6, 40)), int(rng.integers(1, 9)); k = min(k, n - 2)
    off = float(rng.choice([0.0, 1e3, -1e4, 1e6, 1.7e9])); span = float(10 ** rng.uniform(-2, 3)) * (1 if off == 0 else float(rng.choice([1e-3, 1e-1, 1])) * max(1.0, abs(off)) ** 0.5)
    X = sorted(set(float(off + span * v) for v in rng.uniform(-1, 1, n)))
    if len(X) < k + 2: raise ValueError("too few")
    n = len(X); t0 = [(x - off) / span for x in X]
    Y = [float(np.cos(2 * v) * 3 + 0.4 * v + rng.normal(0, 10 ** rng.uniform(-8, -1))) for v in t0]
    W = [float(10 ** rng.uniform(-1, 1)) for _ in X] if rng.random() < 0.3 else None
    fixed = [False] * (k + 1); p0 = [0.0] * (k + 1)
    if rng.random() < 0.2 and off == 0: fixed[0] = True; p0[0] = float(rng.normal(0, 2))
    return [X, Y, W, k, {"fixed": fixed, "p0": p0}], {"X": X, "Y": Y, "W": W, "k": k, "fixed": fixed, "p0": p0}
def poly_post(c, out):
    w = c["want"]; X, Y, W, k, fixed, p0 = w["X"], w["Y"], w["W"], w["k"], w["fixed"], w["p0"]
    if not isinstance(out, dict) or "poly" not in out: return float("inf"), f"no fit: {str(out)[:120]}"
    n, m = len(X), k + 1; free = [j for j in range(m) if not fixed[j]]
    Xf, Yf = [Fr(x) for x in X], [Fr(y) for y in Y]; Wf = [Fr(v) for v in W] if W else [Fr(1)] * n
    yr = [Yf[i] - sum(Fr(p0[j]) * Xf[i] ** j for j in range(m) if fixed[j]) for i in range(n)]
    A = [[Wf[i] * Xf[i] ** j for j in free] for i in range(n)]
    G = [[sum(A[i][a] * A[i][b] for i in range(n)) for b in range(len(free))] for a in range(len(free))]
    g = [sum(A[i][a] * Wf[i] * yr[i] for i in range(n)) for a in range(len(free))]
    af = fr_solve(G, g); a = [Fr(v) for v in p0]
    for u, j in enumerate(free): a[j] = af[u]
    fit = [sum(a[j] * Xf[i] ** j for j in range(m)) for i in range(n)]
    P = out["poly"]; cF, sF = Fr(P["c"]), Fr(P["s"]); b = [Fr(v) for v in P["b"]]
    mine = [sum(b[q] * ((Xf[i] - cF) / sF) ** q for q in range(m)) for i in range(n)]
    spread = max(fit) - min(fit) or Fr(1)
    e = float(max(abs(u - v) for u, v in zip(mine, fit)) / spread)
    rss = sum((Yf[i] - fit[i]) ** 2 for i in range(n)); er = abs(out["stats"]["rss"] - float(rss)) / max(float(rss), 1e-300)
    if er > 1e-12 and float(rss) < 1e-20 * float(spread) ** 2 * n: er = 0.0   # an exact fit: the residuals are the rounding of Y
    return max(e, er), f"fitted values {e:.2e} over their spread, RSS {er:.2e}"
POST["polyLsq"] = poly_post

# ---- Best subsets (FIT2_SPEC 4.2): every subset enumerated by lstsq; the best of each size and their residual sums ----
@gen("bestSubsets", 1e-11, 0.3)
def _():
    import itertools
    p, n = int(rng.integers(2, 8)), int(rng.integers(12, 60)); X = rng.normal(0, 1, (n, p)) * 10 ** rng.uniform(-2, 3, p) + rng.normal(0, 5, p)
    if rng.random() < 0.4: X[:, -1] = X[:, 0] * 0.9 + rng.normal(0, 0.05, n) * abs(X[0, 0] + 1)
    y = X @ (rng.normal(0, 1, p) * (rng.random(p) < 0.6)) + rng.normal(0, 1, n)
    best = {}
    for k in range(p + 1):
        for S in itertools.combinations(range(p), k):
            D = np.column_stack([np.ones(n)] + [X[:, j] for j in S]); rss = float(np.sum((y - D @ np.linalg.lstsq(D, y, rcond=None)[0]) ** 2)); best.setdefault(k, []).append((rss, list(S)))
    want = [[S, rss] for k in sorted(best) for rss, S in sorted(best[k])[:2]]
    return [[[float(v) for v in X[:, j]] for j in range(p)], [float(v) for v in y], {"best": 2}], want
def bs_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "rows" not in out: return float("inf"), f"no rows: {str(out)[:120]}"
    R = out["rows"]
    if len(R) != len(w): return float("inf"), f"{len(R)} rows, not {len(w)}"
    e = 0.0
    for r, (S, rss) in zip(R, w):
        if r["cols"] != S:  # a tie in residual sum may come in either order
            if not any(q[0] == r["cols"] and abs(q[1] - r["rss"]) <= 1e-9 * max(rss, 1e-300) for q in w): return float("inf"), f"subset {r['cols']} for {S}"
            continue
        e = max(e, abs(r["rss"] - rss) / max(rss, 1e-300))
    return e, f"residual sums {e:.2e}"
POST["bestSubsets"] = bs_post

# Robust fits (FIT2_SPEC 4.8): a polynomial with outliers planted, against statsmodels' RLM run to its fixed point from least
# squares, as Kurve's reweighting is: the parameters (over their largest), the scale, each point's weight, the H1 errors.
@gen("robustPoly", 1e-9, 0.3)
def _():
    import statsmodels.api as sm
    k, n = int(rng.integers(1, 4)), int(rng.integers(15, 80)); kind = str(rng.choice(["huber", "bisquare"]))
    X = sorted(set(float(v) for v in rng.uniform(-5, 5, n))); n = len(X); c = [float(v) for v in rng.normal(0, 2, k + 1)]
    Y = [float(sum(c[j] * x ** j for j in range(k + 1)) + rng.normal(0, 0.3)) for x in X]
    for i in rng.choice(n, int(rng.integers(0, max(1, n // 8))), replace=False): Y[int(i)] += float(rng.choice([-1, 1]) * rng.uniform(2, 8))
    D = np.column_stack([np.asarray(X) ** j for j in range(k + 1)]); M = sm.robust.norms.HuberT(t=1.345) if kind == "huber" else sm.robust.norms.TukeyBiweight(c=4.685)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore"); r = sm.RLM(np.asarray(Y), D, M=M).fit(maxiter=5000, tol=1e-14, conv="coefs")
    if not np.all(np.isfinite(r.bse)): raise ValueError("no errors")
    return [X, Y, k, kind], {"params": [float(v) for v in r.params], "bse": [float(v) for v in r.bse], "scale": float(r.scale), "w": [float(v) for v in r.weights]}
def robust_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "params" not in out: return float("inf"), f"no fit: {str(out)[:120]}"
    big = max(abs(v) for v in w["params"]) or 1.0
    e = max(abs(a - b) / big for a, b in zip(out["params"], w["params"]))
    e = max(e, abs(out["scale"] - w["scale"]) / max(w["scale"], 1e-300), max(abs(a - b) for a, b in zip(out["w"], w["w"])))
    es = max(abs(a - b) / max(abs(b), 1e-300) for a, b in zip(out["errors"], w["bse"]))
    return max(e, es), f"parameters, scale and weights {e:.2e}, errors {es:.2e}"
POST["robustPoly"] = robust_post

# XPS backgrounds and self-deconvolution (FIT2_SPEC 4.7): random lines on a step, rising or falling X, counts or not, against
# NumPy written from the papers (xps_ref.py); each background over the data's largest, the deconvolved series over its largest.
from xps_ref import shirley_ref, tougaard_ref, fsd_ref
def xps_rand():
    n = int(rng.integers(20, 400)); x0 = float(rng.uniform(-50, 1500)); span = float(rng.uniform(2, 40)); x = np.linspace(x0, x0 + span, n)
    P = np.zeros(n)
    for _ in range(int(rng.integers(1, 5))):
        c, w, a = float(rng.uniform(x0, x0 + span)), float(rng.uniform(span / 60, span / 5)), float(lognum(1, 5)); s = w / 2.3548200450309493
        P += a * np.exp(-(x - c) ** 2 / (2 * s * s)) / (s * math.sqrt(2 * math.pi))
    cum = np.concatenate([[0.0], np.cumsum((x[1:] - x[:-1]) * (P[1:] + P[:-1]) / 2)]); y = float(lognum(0, 4)) + float(rng.uniform(-1, 1)) * float(lognum(0, 4)) * cum / cum[-1] + P
    if rng.random() < 0.5: y = rng.poisson(np.maximum(y, 0)).astype(float)
    if rng.random() < 0.3: x, y = x[::-1].copy(), y[::-1].copy()
    return x, y
@gen("shirleyBg", 1e-12, 0.3)
def _():
    x, y = xps_rand(); ends = int(rng.integers(1, 15))
    return [x.tolist(), y.tolist(), {"ends": ends}], shirley_ref(x, y, ends)
@gen("tougaardBg", 1e-12, 0.3)
def _():
    x, y = xps_rand(); dr = str(rng.choice(["up", "down"])); C = float(rng.choice([1643.0, 551.0, float(rng.uniform(100, 3000))])); D = float(rng.choice([0.0, 0.0, float(rng.uniform(1, 800))]))
    return [x.tolist(), y.tolist(), {"dir": dr, "C": C, "D": D, "ends": 3}], tougaard_ref(x, y, dr, C, D, 3)
def bg_post(c, out):
    w, y = c["want"], c["args"][1]; big = max(abs(v) for v in y) or 1.0
    if not isinstance(out, dict) or "b" not in out: return float("inf"), f"no background: {str(out)[:120]}"
    e = max(abs(a - b) / big for a, b in zip(out["b"], w["b"]))
    if "iter" in w and (out.get("iter") != w["iter"] or out.get("conv") != w["conv"]): return float("inf"), f"{out.get('iter')} rounds, NumPy {w['iter']}"
    if "B" in w: e = max(e, abs(out["B"] - w["B"]) / max(abs(w["B"]), 1e-300) if w["B"] else abs(out["B"]))
    return e, f"background {e:.2e}"
POST["shirleyBg"] = bg_post; POST["tougaardBg"] = bg_post
@gen("fsd", 1e-12, 0.3)
def _():
    n = int(rng.integers(32, 1500)); xs = np.arange(n, dtype=float); g = float(rng.uniform(3, 30)); y = np.zeros(n)
    for _ in range(int(rng.integers(1, 6))):
        c = float(rng.uniform(0, n)); y += float(lognum(0, 4)) * (g / 2) / math.pi / ((xs - c) ** 2 + (g / 2) ** 2)
    y += float(rng.uniform(-10, 10)) + float(rng.uniform(-0.1, 0.1)) * xs
    if rng.random() < 0.5: y += rng.normal(0, float(lognum(-4, -1)) * float(np.max(np.abs(y))), n)
    k = float(rng.uniform(1, 3.5)); apod = str(rng.choice(["bessel", "triangle", "happ"])); w = g * float(rng.uniform(0.8, 1.2))
    return [y.tolist(), {"w": w, "k": k, "apod": apod}], fsd_ref(y, w, k, apod)
def fsd_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "y" not in out: return float("inf"), f"no series: {str(out)[:120]}"
    big = max(abs(v) for v in w["y"]) or 1.0; e = max(abs(a - b) / big for a, b in zip(out["y"], w["y"]))
    if out.get("clamped") != w["clamped"]: return float("inf"), "clamped differs"
    return max(e, abs(out["T"] - w["T"]) / w["T"]), f"series {e:.2e}"
POST["fsd"] = fsd_post

# Polynomial surfaces (FIT2_SPEC 4.4): random points about a random centre, order 1 to 5, against least squares in 40-digit mpmath
# (the normal equations of the centred powers): each point's residual over the data's largest |z|.
@gen("surfFit", 1e-12, 0.15)
def _():
    import mpmath as mpm
    k = int(rng.integers(1, 6)); m = (k + 1) * (k + 2) // 2; n = int(rng.integers(m + 3, m + 120)); cx, cy = float(rng.choice([0, 1, -50, 1000])), float(rng.choice([0, 3, 200]))
    X = [float(round(cx + v, 6)) for v in rng.uniform(-5, 5, n)]; Y = [float(round(cy + v, 6)) for v in rng.uniform(-2, 2, n)]
    Z = [float(round(math.sin(0.7 * (x - cx)) * math.cos(y - cy) + float(rng.normal(0, 0.05)), 6)) for x, y in zip(X, Y)]
    T = [(d - j, j) for d in range(k + 1) for j in range(d + 1)]
    with mpm.workdps(40):
        mx, my = mpm.mpf(sum(X)) / n, mpm.mpf(sum(Y)) / n
        A = mpm.matrix([[(mpm.mpf(x) - mx) ** a * (mpm.mpf(y) - my) ** b for (a, b) in T] for x, y in zip(X, Y)])
        G = A.T * A; g = A.T * mpm.matrix([mpm.mpf(z) for z in Z]); b = mpm.lu_solve(G, g); r = mpm.matrix([mpm.mpf(z) for z in Z]) - A * b
        return [X, Y, Z, "poly" + str(k), {}], {"resid": [float(v) for v in r], "big": max(abs(z) for z in Z)}
def surf_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "res" not in out or not out["res"]: return float("inf"), f"no fit: {str(out)[:120]}"
    R = out["res"]["resid"]; e = max(abs(a - b) for a, b in zip(R, w["resid"])) / max(w["big"], 1e-300)
    return e, f"residuals {e:.2e}"
POST["surfFit"] = surf_post

# Implicit fits (FIT2_SPEC 4.5): random arcs of circles and turned ellipses with noise below a twentieth of the smaller axis (more,
# and points near the major axis make several minima), against SciPy's least_squares on the parametric form from the truth (each
# point's place an unknown of its own), polished on the distances with each foot found globally (impl_ref.py); Kurve starts from its
# own algebraic guess: the sum of squared distances relatively, and each parameter's difference over its standard error.
from impl_ref import impl_polish
@gen("implFit", 1e-5, 0.3)
def _():
    from scipy import optimize
    circle = rng.random() < 0.5; n = int(rng.integers(12, 150)); xc, yc = float(rng.choice([0, 3, -40, 1000])), float(rng.choice([0, -2, 250]))
    a = float(lognum(-1, 2)); b = a if circle else a / float(rng.uniform(1.2, 5)); th = 0.0 if circle else float(rng.uniform(-89, 89)); sd = b * float(lognum(-3, -1.3))
    span = float(rng.uniform(0.4, 1)) * 2 * math.pi if circle else float(rng.uniform(0.75, 1)) * 2 * math.pi; t0 = float(rng.uniform(0, 2 * math.pi))
    T = math.radians(th); c, s = math.cos(T), math.sin(T); ph = rng.uniform(t0, t0 + span, n)
    X = [float(round(xc + a * math.cos(q) * c - b * math.sin(q) * s + float(rng.normal(0, sd)), 9)) for q in ph]
    Y = [float(round(yc + a * math.cos(q) * s + b * math.sin(q) * c + float(rng.normal(0, sd)), 9)) for q in ph]
    Xa, Ya = np.array(X), np.array(Y); m = 3 if circle else 5
    if circle: res = lambda q: np.concatenate([Xa - (q[0] + q[2] * np.cos(q[3:])), Ya - (q[1] + q[2] * np.sin(q[3:]))]); q0 = [xc, yc, a] + list(ph)
    else:
        def res(q):
            t = math.radians(q[4]); cc, ss = math.cos(t), math.sin(t); u, v = q[2] * np.cos(q[5:]), q[3] * np.sin(q[5:])
            return np.concatenate([Xa - (q[0] + u * cc - v * ss), Ya - (q[1] + u * ss + v * cc)])
        q0 = [xc, yc, a, b, th] + list(ph)
    r = optimize.least_squares(res, q0, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=200000, x_scale="jac")
    P, E, rss = impl_polish("circle" if circle else "ellipse", X, Y, [float(v) for v in r.x[:m]])
    P[2] = abs(P[2])
    if not circle:
        P[3] = abs(P[3])
        if P[2] < P[3]: P[2], P[3] = P[3], P[2]; E[2], E[3] = E[3], E[2]; P[4] += 90
        P[4] = ((P[4] + 90) % 180 + 180) % 180 - 90
    return [X, Y, "circle" if circle else "ellipse", {}], {"params": P, "errors": E, "ss": rss}
def impl_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "res" not in out or not out["res"]: return float("inf"), f"no fit: {str(out)[:120]}"
    R = out["res"]; ss = sum(d * d for d in R["dist"]); e1 = abs(ss - w["ss"]) / max(w["ss"], 1e-300)
    e2 = 0.0
    for j, (v, se) in enumerate(zip(w["params"], w["errors"])):
        d = abs(R["params"][j] - v)
        if j == 4: d = min(d, abs(d - 180))   # a turn of ±90° is one turn
        e2 = max(e2, d / max(se, 1e-12 * abs(v), 1e-300))
    return max(e1, e2), f"squared distances {e1:.2e}, parameters {e2:.2e} of an error"
POST["implFit"] = impl_post
# A point's distance to an ellipse against 40 digits (the nearest of 2000 places narrowed by findroot), the point near the curve, near the
# long axis inside, near the centre, far outside, the ellipse near a circle or very thin: relative to the distance, or to 1e-4 of the
# longer half axis for a point nearer the curve than that.
@gen("ellDist", 1e-11, 0.5)
def _():
    import mpmath as mpm
    kind = str(rng.choice(["near", "axis", "centre", "far", "round", "thin", "any"]))
    a = float(10 ** rng.uniform(-2, 3)); b = a / float({"round": 1 + 10 ** rng.uniform(-9, -3), "thin": 10 ** rng.uniform(2, 4)}.get(kind, 1 + 20 * rng.random() ** 2)); t = float(rng.uniform(0, 2 * math.pi))
    r = {"near": 1 + float(rng.choice([-1, 1])) * 10 ** float(rng.uniform(-9, -2)), "centre": 10 ** float(rng.uniform(-9, -2)), "far": 10 ** float(rng.uniform(0.5, 2))}.get(kind, float(rng.uniform(0, 2)))
    u, v = r * a * math.cos(t), r * b * math.sin(t)
    if kind == "axis": v *= 10 ** float(rng.uniform(-14, -6))
    g = np.linspace(0, 2 * math.pi, 2000, endpoint=False); k = int(np.argmin((u - a * np.cos(g)) ** 2 + (v - b * np.sin(g)) ** 2))
    with mpm.workdps(40):
        A, B, U, V = mpm.mpf(a), mpm.mpf(b), mpm.mpf(u), mpm.mpf(v); st = mpm.mpf(2 * math.pi / 2000)
        f = lambda q: (U - A * mpm.cos(q)) ** 2 + (V - B * mpm.sin(q)) ** 2
        df = lambda q: 2 * (U - A * mpm.cos(q)) * A * mpm.sin(q) - 2 * (V - B * mpm.sin(q)) * B * mpm.cos(q)
        best = min(f(mpm.mpf(q)) for q in g[[(k - 1) % 2000, k, (k + 1) % 2000]])
        for q0 in (g[(k - 1) % 2000], g[k], g[(k + 1) % 2000]):
            try: best = min(best, f(mpm.findroot(df, (mpm.mpf(q0) - st, mpm.mpf(q0) + st), solver="anderson")))
            except Exception: pass
        d = mpm.sqrt(best); d = float(-d if (U / A) ** 2 + (V / B) ** 2 < 1 else d)
    return [a, b, u, v], {"d": d, "a": a}
def elld_post(c, out):
    w = c["want"]
    if not isinstance(out, (int, float)): return float("inf"), f"no distance: {str(out)[:80]}"
    e = abs(out - w["d"]) / max(abs(w["d"]), 1e-4 * w["a"]); return e, f"distance {e:.2e}"
POST["ellDist"] = elld_post

# ---- Wave 5, signal processing (SIGNAL_SPEC): the FFT at random lengths (primes and odd sizes most of all, where Bluestein's chirp
# works), Welch's spectrum with random settings, and a random design's sections run forwards and backwards; each array judged by its
# worst error over the reference's largest |value| ----
from scipy import signal as _sig
def _vec_post(key=None, cplx=False):
    def post(c, out):
        w = c["want"]
        if isinstance(out, dict) and out.get("fail"): return float("inf"), f"refused: {out['fail']}"
        if cplx:
            if not isinstance(out, dict) or "re" not in out: return float("inf"), f"no transform: {str(out)[:80]}"
            big = max(math.hypot(a, b) for a, b in zip(w["re"], w["im"])) or 1.0
            e = max(math.hypot(val(a) - b, val(c2) - d) / big for a, b, c2, d in zip(out["re"], w["re"], out["im"], w["im"])); return e, f"transform {e:.2e}"
        g = out[key] if key else out; ww = w[key] if key else w
        if not isinstance(g, list) or len(g) != len(ww): return float("inf"), f"length {len(g) if isinstance(g, list) else '?'} against {len(ww)}"
        big = c.get("scale") or max(abs(v) for v in ww) or 1.0; e = max(abs(val(a) - b) / big for a, b in zip(g, ww)); return e, f"values {e:.2e}"
    return post
@gen("fftC", 1e-13, 0.5)
def _():
    n = int(edge([1, 2, 3, 97, 1009, 4096, 4099, 65537], lambda: int(rng.integers(1, 6000))))
    re_ = rng.normal(0, 1, n) * 10 ** rng.uniform(-3, 3, n); im_ = rng.normal(0, 1, n) * 10 ** rng.uniform(-3, 3, n) if rng.random() < 0.6 else np.zeros(n)
    inv = bool(rng.random() < 0.3); X = (np.fft.ifft if inv else np.fft.fft)(re_ + 1j * im_)
    return [re_.tolist(), im_.tolist(), n, inv], {"re": X.real.tolist(), "im": X.imag.tolist()}
POST["fftC"] = _vec_post(cplx=True)
@gen("welch", 1e-12, 0.3)
def _():
    n = int(rng.integers(8, 4000)); y = rng.normal(0, float(lognum(-3, 3)), n) + float(rng.uniform(-5, 5)); fs = float(lognum(-2, 4))
    win = str(rng.choice(["hann", "hamming", "boxcar", "blackman", "flattop", "bartlett"])); nseg = int(rng.integers(4, max(5, min(n, 600))))
    over = int(rng.integers(0, nseg)); det = str(rng.choice(["constant", "linear", "none"])); sc = str(rng.choice(["density", "spectrum"])); avg = str(rng.choice(["mean", "median"]))
    f, P = _sig.welch(y, fs, window=win, nperseg=nseg, noverlap=over, detrend=False if det == "none" else det, scaling=sc, average=avg)
    # SciPy takes a straight line off by LAPACK's least squares, which leaves rounding of the level beside a spread maybe a thousand
    # times smaller; against 40 digits (18.11) Kurve's line was right to 4e-16 of the largest value, SciPy's to 2e-12. A mean taken off
    # (NumPy's pairwise sum) leaves the same kind of rounding, smaller. So a detrended case is judged on the scale of the level over
    # the spread.
    lvl = max(1.0, float(np.max(np.abs(y)) / np.std(y))) if det != "none" else 1.0
    return [y.tolist(), fs, {"win": win, "nseg": nseg, "over": over, "detrend": det, "scaling": sc, "avg": avg}], {"p": P.tolist(), "lvl": lvl}
POST["welch"] = lambda c, out: (lambda r: (r[0] / c["want"]["lvl"], r[1]))(_vec_post("p")(c, out))
@gen("sosfiltfilt", 1e-12, 0.3)
def _():
    kind = str(rng.choice(["butter", "cheby1", "cheby2", "ellip", "bessel"])); band = str(rng.choice(["lowpass", "highpass", "bandpass", "bandstop"]))
    N = int(rng.integers(1, 9)); a, b = sorted(rng.uniform(0.02, 0.95, 2)); Wn = float(a) if band in ("lowpass", "highpass") else (float(a), float(max(b, a + 0.02)))
    sos = _sig.iirfilter(N, Wn, rp=float(rng.uniform(0.1, 3)), rs=float(rng.uniform(20, 80)), btype=band, ftype=kind, output="sos")
    n = int(rng.integers(3 * (2 * len(sos) + 1) + 2, 3000)); x = np.cumsum(rng.normal(0, 1, n)) + rng.normal(0, 1, n)
    return [sos.tolist(), x.tolist()], _sig.sosfiltfilt(sos, x).tolist()
# A section with poles near the unit circle rings, and carries every rounding for about 1/(1 − |p|) points: an elliptic band-stop with
# poles at 0.9945 lost 5.8e-12 of the largest |x| in Kurve and in SciPy alike against 40 digits (18.11). So the error is judged on
# the scale of max|x| over (1 − the largest |p|).
def _sos_scale(c):
    _, p, _ = _sig.sos2zpk(np.array(c["args"][0])); return max(abs(v) for v in c["args"][1]) / max(1e-6, 1 - float(np.max(np.abs(p))))
POST["sosfiltfilt"] = lambda c, out: _vec_post()(dict(c, scale=_sos_scale(c)), out)

# ---- Wave 5, 5.3 to 5.8: correlation at random lengths and normalisations, the interpolants between random points, LOWESS against
# statsmodels, Simpson's rule on uneven X, and a wavelet decomposition in every family and mode ----
from scipy import interpolate as _ipz, integrate as _intg
@gen("correlate", 1e-13, 0.3)
def _():
    na = int(rng.integers(1, 600)); a = (rng.normal(0, 1, na) * float(lognum(-3, 3)) + float(rng.uniform(-10, 10))).tolist()
    b = None if rng.random() < 0.4 else (rng.normal(0, 1, int(rng.integers(1, 600))) * float(lognum(-3, 3))).tolist()
    norm = str(rng.choice(["none", "biased", "unbiased", "coeff"])); dm = bool(rng.random() < 0.7); ml = None if rng.random() < 0.5 else int(rng.integers(0, 700))
    A = np.array(a); B = np.array(b if b is not None else a)
    # the mean as math.fsum gives it (correctly rounded), not NumPy's pairwise one, whose rounding of a level far above the spread
    # (values near −5.29 that differ by 0.01) would be a difference of the reference's own
    if dm: A = A - math.fsum(A) / len(A); B = B - math.fsum(B) / len(B)
    if norm == "coeff" and (not np.any(A) or not np.any(B)): raise ValueError("a zero column")
    c = np.correlate(A, B, "full"); k = np.arange(-(len(B) - 1), len(A))
    if norm == "biased": c = c / max(len(A), len(B))
    elif norm == "unbiased": c = c / np.array([max(1, min(len(B), len(A) - kk) - max(0, -kk)) for kk in k])
    elif norm == "coeff": c = c / math.sqrt(float(np.sum(A * A)) * float(np.sum(B * B)))
    keep = np.abs(k) <= (ml if ml is not None else 10 ** 9)
    # a sum of products is judged on the scale of the products' sizes (Σ|a||b| at the largest), not of a result that may cancel to 0
    sc = float(np.max(np.correlate(np.abs(A), np.abs(B), "full")))
    if norm == "biased": sc /= max(len(A), len(B))
    elif norm == "unbiased": sc = float(np.max(np.correlate(np.abs(A), np.abs(B), "full") / np.array([max(1, min(len(B), len(A) - kk) - max(0, -kk)) for kk in np.arange(-(len(B) - 1), len(A))])))
    elif norm == "coeff": sc /= math.sqrt(float(np.sum(A * A)) * float(np.sum(B * B)))
    return [a, b, {"norm": norm, "demean": dm, "maxlag": ml}], {"k": k[keep].tolist(), "c": c[keep].tolist(), "sc": sc}
def corr_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "c" not in out: return float("inf"), f"no correlation: {str(out)[:80]}"
    if list(map(int, out["k"])) != w["k"]: return float("inf"), "lags differ"
    e = max([abs(val(a) - b) / (w["sc"] or 1.0) for a, b in zip(out["c"], w["c"])] or [0.0]); return e, f"values {e:.2e}"
POST["correlate"] = corr_post
@gen("interp1", 1e-12, 0.4)
def _():
    m = str(rng.choice(["linear", "notaknot", "natural", "akima", "makima", "pchip"])); n = int(edge([2, 3, 4, 5], lambda: int(rng.integers(2, 400))))
    x = np.cumsum(10 ** rng.uniform(-1, 1, n)) * float(lognum(-3, 3)) + float(rng.uniform(-1e3, 1e3)); y = rng.normal(0, 1, n) * float(lognum(-3, 3))
    F = {"linear": lambda: _ipz.interp1d(x, y, kind="linear"), "notaknot": lambda: _ipz.CubicSpline(x, y, bc_type="not-a-knot"), "natural": lambda: _ipz.CubicSpline(x, y, bc_type="natural"),
         "akima": lambda: _ipz.Akima1DInterpolator(x, y, method="akima"), "makima": lambda: _ipz.Akima1DInterpolator(x, y, method="makima"), "pchip": lambda: _ipz.PchipInterpolator(x, y)}[m]()
    xq = np.sort(rng.uniform(x[0], x[-1], int(rng.integers(1, 300))))
    return [x.tolist(), y.tolist(), xq.tolist(), {"method": m, "ext": "none"}], {"y": F(xq).tolist(), "sc": float(np.max(np.abs(y))) or 1.0}
POST["interp1"] = lambda c, out: _vec_post("y")(dict(c, scale=c["want"]["sc"]), out)
# 1e-11: the robust rounds weight each point by its residual over six times the residuals' median, and on a window of a few points
# that median is a small difference of nearly equal numbers. Seed 1 (19.11), six neighbours and one robust round: Kurve 4.5e-16 of
# max|y| from 40 digits without the round, 1.3e-12 with it; statsmodels 1.8e-9.
# (a generator of its own name, so this tolerance is the fuzzer's and targets.json's 1e-12 still holds the fixtures)
@gen("lowessFz", 1e-11, 0.3)
def _():
    import statsmodels.api as _smz
    n = int(rng.integers(3, 800)); x = np.sort(rng.uniform(0, 1, n)) * float(lognum(-2, 3)) + float(rng.uniform(-100, 100))
    y = np.sin(np.linspace(0, float(rng.uniform(0, 12)), n)) * float(lognum(-2, 2)) + rng.normal(0, 0.3, n) + (rng.random(n) < 0.05) * 5
    frac = float(rng.uniform(0.02, 1)); it = int(rng.integers(0, 5)); delta = 0.0 if rng.random() < 0.5 else float(rng.uniform(0, 0.05)) * float(x[-1] - x[0])
    fit = _smz.nonparametric.lowess(y, x, frac=frac, it=it, delta=delta, return_sorted=False)
    # statsmodels centres X on a weighted mean of values that may lie far from 0 against their span, and carries |x|·ε of rounding into
    # each slope: against 40 digits (18.11, X near 45 over a span of 0.014) it was 4e-11 off where Kurve, which works in each point's
    # own offsets, was 2.4e-15. So a case is judged on max|y| times max|x| over X's span.
    sc = (float(np.max(np.abs(y))) or 1.0) * max(1.0, float(np.max(np.abs(x))) / float(x[-1] - x[0]))
    return [x.tolist(), y.tolist(), {"frac": frac, "it": it, "delta": delta}], {"y": fit.tolist(), "sc": sc}, "lowessY"
# The same algorithm in 40 digits (statsmodels' order of work: sorted X, the window moved along, tricube weights, a weighted line,
# delta's skip, bisquare rounds), for a case where Kurve and statsmodels disagree: a disagreement is settled by a third. Seed 1
# (19.11) found statsmodels 1.8e-9 off on a window of six points far from 0, Kurve 1.3e-12.
def _lowess_mp(x, y, frac, it, delta):
    import mpmath as mpm
    with mpm.workdps(40):
        n = len(x); o = sorted(range(n), key=lambda i: (x[i], i)); X = [mpm.mpf(x[i]) for i in o]; Y = [mpm.mpf(y[i]) for i in o]
        k = max(2, min(n, int(math.floor(frac * n + 1e-10)))); rw = [mpm.mpf(1)] * n; fit = [None] * n
        for rob in range(it + 1):
            fit = [None] * n; mag = [0.0] * n; i = 0; last = -1; le = 0; re = k
            while True:
                xv = X[i]
                while re < n and xv > (X[le] + X[re]) / 2: le += 1; re += 1
                rad = max(xv - X[le], X[re - 1] - xv); w = {}
                for j in range(le, re): d = 1 - (abs(X[j] - xv) / rad) ** 3; w[j] = d ** 3 * rw[j]
                sw = sum(w.values())
                if sum(1 for v in w.values() if v > 1e-12) < 2: fit[i] = Y[i]; mag[i] = float(abs(Y[i]))
                else:
                    for j in w: w[j] /= sw
                    mx = sum(w[j] * X[j] for j in w); sxx = max(sum(w[j] * (X[j] - mx) ** 2 for j in w), mpm.mpf("1e-12"))
                    terms = [w[j] * (1 + (xv - mx) * (X[j] - mx) / sxx) * Y[j] for j in w]; fit[i] = sum(terms); mag[i] = float(sum(abs(v) for v in terms))
                if last < i - 1:
                    a = X[i] - X[last]
                    for j in range(last + 1, i): t = (X[j] - X[last]) / a; fit[j] = t * fit[i] + (1 - t) * fit[last]; mag[j] = max(mag[i], mag[last])
                last = i; q = last; cut = X[last] + mpm.mpf(delta)
                for kk in range(last + 1, n):
                    q = kk
                    if X[kk] > cut: break
                    if X[kk] == X[last]: fit[kk] = fit[last]; mag[kk] = mag[last]; last = kk
                i = max(q - 1, last + 1)
                if last >= n - 1: break
            if rob < it:
                r = [abs(Y[j] - fit[j]) for j in range(n)]; sr = sorted(r); med = sr[n // 2] if n % 2 else (sr[n // 2 - 1] + sr[n // 2]) / 2
                rw = [(1 - min(1, v / (6 * med)) ** 2) ** 2 if med != 0 else (mpm.mpf(0) if v > 0 else mpm.mpf(1)) for v in r]
        out = [None] * n; mg = [None] * n
        for j, i in enumerate(o): out[i] = float(fit[j]); mg[i] = mag[j]
        return out, mg
def lowess_post(c, out):
    if not isinstance(out, list): return float("inf"), f"no fit: {str(out)[:80]}"
    e, msg = _vec_post()(dict(c, want=c["want"]["y"], scale=c["want"]["sc"]), out)
    if e <= c["tol"]: return e, msg
    x, y, o = c["args"]; ref, _ = _lowess_mp(x, y, o["frac"], o["it"], o["delta"]); sc = max(abs(v) for v in y) or 1.0
    e2 = max(abs(val(a) - b) / sc for a, b in zip(out, ref)); return e2, f"{msg} from statsmodels; against 40 digits {e2:.2e} of max|y|"
POST["lowessFz"] = lowess_post
@gen("ruleOn", 1e-13, 0.3)
def _():
    n = int(edge([2, 3, 4, 5], lambda: int(rng.integers(2, 600)))); x = np.cumsum(10 ** rng.uniform(-1, 1, n)) * float(lognum(-3, 3)) + float(rng.uniform(-1e3, 1e3))
    y = rng.normal(0, 1, n) * float(lognum(-3, 3)) + float(rng.uniform(-3, 3)); rule = str(rng.choice(["simpson", "trap"]))
    ref = _intg.simpson(y, x=x) if rule == "simpson" else _intg.trapezoid(y, x=x)
    return [y.tolist(), x.tolist(), rule], {"v": float(ref), "sc": float((x[-1] - x[0]) * np.max(np.abs(y))) or 1.0}
def rule_post(c, out):
    if not isinstance(out, (int, float)): return float("inf"), f"no area: {str(out)[:80]}"
    e = abs(out - c["want"]["v"]) / c["want"]["sc"]; return e, f"area {e:.2e} of the span times the largest |y|"
POST["ruleOn"] = rule_post
@gen("wavedecFlat", 1e-13, 0.3)
def _():
    import pywt
    nm = str(rng.choice(["haar"] + [f"db{k}" for k in range(1, 21)] + [f"sym{k}" for k in range(2, 21)] + [f"coif{k}" for k in range(1, 6)]))
    mode = str(rng.choice(["zero", "constant", "symmetric", "periodic", "smooth", "periodization", "reflect", "antisymmetric", "antireflect"]))
    # one level at least: too few values for one Kurve refuses in words, where PyWavelets returns the values themselves
    F = pywt.Wavelet(nm).dec_len; N = int(rng.integers(2 * (F - 1), 700)); x = (np.cumsum(rng.normal(0, 1, N)) * float(lognum(-3, 3))).tolist()
    c = pywt.wavedec(np.array(x), nm, mode); flat = np.concatenate(c)
    return [x, nm, mode, None], {"c": flat.tolist(), "len": [len(v) for v in c], "sc": float(np.max(np.abs(x))) or 1.0}
def wav_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "c" not in out: return float("inf"), f"no decomposition: {str(out)[:80]}"
    if list(map(int, out["len"])) != w["len"]: return float("inf"), f"levels {out['len']} against {w['len']}"
    e = max(abs(val(a) - b) / w["sc"] for a, b in zip(out["c"], w["c"])); return e, f"coefficients {e:.2e}"
POST["wavedecFlat"] = wav_post

# ---- Wave 6 (MULTI_SPEC): the SVD and the symmetric eigenproblem, against NumPy (LAPACK). A matrix of a random shape (1 to
# 60 a side) and kind: plain, of a lower rank, graded over ten decades by columns, with repeated values, of huge or tiny
# magnitude. Judged by the singular values over the largest (svd.s); the reconstruction and orthogonality from Kurve's own
# answer must also meet their targets (svd.recon, svd.orth), else the case fails.
def _mvmat(square=False):
    m = int(rng.integers(1, 61)); n = m if square else int(rng.integers(1, 61)); kind = rng.choice(["plain", "rank", "graded", "ties", "scale"])
    A = rng.normal(size=(m, n))
    if kind == "rank":
        k = int(rng.integers(1, max(2, min(m, n)))); A = rng.normal(size=(m, k)) @ rng.normal(size=(k, n))
    elif kind == "graded":
        A = A * 10.0 ** (-10 * rng.random(n))
    elif kind == "ties" and min(m, n) > 1:
        Q1, _ = np.linalg.qr(rng.normal(size=(m, m))); Q2, _ = np.linalg.qr(rng.normal(size=(n, n))); d = np.sort(rng.choice([1.0, 2.0, 3.0], min(m, n)))[::-1]
        D = np.zeros((m, n)); np.fill_diagonal(D, d); A = Q1 @ D @ Q2.T
    elif kind == "scale":
        A = A * 10.0 ** rng.uniform(-150, 150)
    if square: A = (A + A.T) / 2
    return A
@gen("svd.s", 1e-13, 0.15)
def _():
    A = _mvmat(); s = np.linalg.svd(A, compute_uv=False)
    return [A.tolist()], {"s": s.tolist(), "A": A.tolist()}, "svd"
def _fac_post(kind):
    def post(c, out):
        w = c["want"]; A = np.array(w["A"])
        if not isinstance(out, dict) or "fail" in out: return float("inf"), f"refused or nothing: {str(out)[:80]}"
        if kind == "svd":
            s = np.array([val(v) for v in out["s"]]); ref = np.array(w["s"]); big = ref[0] if ref[0] > 0 else 1.0
            U = np.array(out["U"], dtype=float); V = np.array(out["V"], dtype=float); k = len(ref)
            rec = np.max(np.abs(U @ np.diag(s) @ V.T - A)) / big; orth = max(np.max(np.abs(U.T @ U - np.eye(k))), np.max(np.abs(V.T @ V - np.eye(k))))
            e = float(np.max(np.abs(s - ref)) / big); tr, to = TARGET["svd.recon"]["tol"], TARGET["svd.orth"]["tol"]
        else:
            vals = np.array([val(v) for v in out["vals"]]); ref = np.array(w["vals"]); big = np.max(np.abs(ref)) or 1.0; Vv = np.array(out["vecs"], dtype=float); k = len(ref)
            rec = np.max(np.abs(Vv @ np.diag(vals) @ Vv.T - A)) / big; orth = np.max(np.abs(Vv.T @ Vv - np.eye(k)))
            e = float(np.max(np.abs(vals - ref)) / big); tr, to = TARGET["symEig.recon"]["tol"], TARGET["symEig.orth"]["tol"]
        if not rec <= tr: return float("inf"), f"reconstruction {rec:.2e} past {tr:.0e}"
        if not orth <= to: return float("inf"), f"orthogonality {orth:.2e} past {to:.0e}"
        return e, f"values {e:.2e}"
    return post
POST["svd.s"] = _fac_post("svd")
@gen("symEig.vals", 1e-13, 0.15)
def _():
    A = _mvmat(True); w = np.linalg.eigvalsh(A)[::-1]
    return [A.tolist()], {"vals": w.tolist(), "A": A.tolist()}, "symEig"
POST["symEig.vals"] = _fac_post("eig")

# PCA against scikit-learn: a random table (3 to 80 observations, 2 to 40 variables, some correlated, scaled at random), a
# scaling and a number of components; judged by its eigenvalues, loadings, scores, T² and Q over each one's largest.
@gen("pcaFlat", 1e-11, 0.15)
def _():
    from sklearn.decomposition import PCA
    n = int(rng.integers(3, 81)); m = int(rng.integers(2, 41)); f = int(rng.integers(1, m + 1))
    X = rng.normal(size=(n, f)) @ rng.normal(size=(f, m)) + rng.normal(size=(n, m)) * float(lognum(-3, 0)); X = X * 10 ** rng.uniform(-3, 3, m) + rng.uniform(-100, 100, m)
    scale = str(rng.choice(["none", "unit", "pareto"])); r = min(n - 1, m); k = int(rng.integers(1, r + 1))
    mu = X.mean(axis=0); sd = X.std(axis=0, ddof=1); fz = sd if scale == "unit" else np.sqrt(sd) if scale == "pareto" else np.ones(m); Z = (X - mu) / fz
    P = PCA(n_components=min(n, m), svd_solver="full").fit(Z); ev = P.explained_variance_[:r]; V = P.components_[:k].T; T = P.transform(Z)[:, :k]
    # vectors of nearly equal eigenvalues are not determined: such a case is made again
    gaps = np.abs(np.diff(P.explained_variance_[:k + 1])) if k < len(P.explained_variance_) else np.abs(np.diff(P.explained_variance_[:k]))
    if len(gaps) and np.min(gaps) < 1e-6 * ev[0]: raise ValueError("near tie")
    t2 = np.sum(T ** 2 / ev[:k], axis=1); q = np.sum((Z - T @ V.T) ** 2, axis=1)
    return [X.tolist(), {"scale": scale, "k": k}], {"ev": ev.tolist(), "V": V.ravel().tolist(), "T": T.ravel().tolist(), "t2": t2.tolist(), "q": q.tolist(), "gap": float(np.min(gaps)) if len(gaps) else float(ev[0]), "zz": float(np.max(np.sum(Z ** 2, axis=1)))}
def pca_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "ev" not in out: return float("inf"), f"refused or nothing: {str(out)[:80]}"
    e = 0.0; why = ""
    for key in ("ev", "V", "T", "t2", "q"):
        a = np.array([val(v) for v in out[key]]); b = np.array(w[key]); big = np.max(np.abs(b)) or 1.0
        if a.shape != b.shape: return float("inf"), f"{key}: {a.shape} against {b.shape}"
        d = float(np.max(np.abs(a - b)) / big)
        if key in ("V", "T"):   # a vector is known to the rounding over its gap; its sign by the rule, tested on fixtures where no tie decides it
            k = c["args"][1]["k"]; A = a.reshape(-1, k); B = b.reshape(-1, k); A = A * np.where(np.sum(A * B, axis=0) < 0, -1, 1)
            d = float(np.max(np.abs(A - B)) / big) * w["gap"] / (abs(w["ev"][0]) or 1.0)
        if key == "t2": d *= np.sqrt(w["ev"][c["args"][1]["k"] - 1] / w["ev"][0])   # each score over √λ: known to ε·s₁/s_k
        if key == "q": d = float(np.max(np.abs(a - b)) / w["zz"])          # Q is what is left of an observation's Σz²: judged against that
        if d > e: e, why = d, key
    return e, f"{why} {e:.2e}"
POST["pcaFlat"] = pca_post

# Clustering: Lloyd's k-means from the same starts as scikit-learn, and SciPy's linkage (every method, both distances), on random
# blobs; labels renumbered by the data must agree exactly, heights and centres over the largest.
def _renum(lab):
    mp = {}; return [mp.setdefault(int(v), len(mp)) for v in lab]
def _blobs():
    n = int(rng.integers(3, 150)); m = int(rng.integers(1, 12)); k = int(rng.integers(1, min(n, 7) + 1)); C = rng.normal(0, 5, size=(k, m))
    return rng.normal(0, float(lognum(-1, 0.6)), size=(n, m)) + C[rng.integers(0, k, n)] + rng.uniform(-1e3, 1e3) , n, m, k
@gen("kmeansFrom", 1e-12, 0.15)
def _():
    from sklearn.cluster import KMeans
    X, n, m, k = _blobs(); init = X[rng.choice(n, k, replace=False)]
    K = KMeans(n_clusters=k, init=init, n_init=1, algorithm="lloyd", tol=0.0, max_iter=300).fit(X)
    if len(set(K.labels_)) < k: raise ValueError("an empty cluster: relocation is not compared")
    order = []; [order.append(int(v)) for v in K.labels_ if int(v) not in order]
    return [X.tolist(), init.tolist()], {"lab": _renum(K.labels_), "C": K.cluster_centers_[order].ravel().tolist(), "inertia": float(K.inertia_), "sc": float(np.max(np.abs(X)))}
def km_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "lab" not in out: return float("inf"), f"refused: {str(out)[:80]}"
    if list(out["lab"]) != w["lab"]: return float("inf"), "the clusters differ"
    e = max(abs(val(a) - b) for a, b in zip(out["C"], w["C"])) / w["sc"]; e = max(e, abs(val(out["inertia"]) - w["inertia"]) / max(w["inertia"], 1e-300))
    return e, f"centres and inertia {e:.2e}"
POST["kmeansFrom"] = km_post
@gen("linkFlat", 1e-12, 0.15)
def _():
    from scipy.cluster import hierarchy as hc
    from scipy.spatial.distance import pdist
    X, n, m, k = _blobs(); n = min(n, 80); X = X[:n]
    method = str(rng.choice(["single", "complete", "average", "ward"])); metric = "euclidean" if method == "ward" or m < 3 else str(rng.choice(["euclidean", "correlation"]))
    D = pdist(X, metric); Z = hc.linkage(D, method=method)
    if len(Z) > 1 and np.min(np.diff(np.sort(Z[:, 2]))) < 1e-9 * np.max(Z[:, 2]): raise ValueError("near ties: the order of merges is not determined")
    return [X.tolist(), method, metric], {"pairs": Z[:, [0, 1, 3]].ravel().tolist(), "h": Z[:, 2].tolist(), "leaves": hc.dendrogram(Z, no_plot=True)["leaves"]}
def link_post(c, out):
    w = c["want"]
    if not isinstance(out, dict) or "h" not in out: return float("inf"), f"refused: {str(out)[:80]}"
    if [int(v) for v in out["pairs"]] != [int(v) for v in w["pairs"]]: return float("inf"), "the merges differ"
    if list(out["leaves"]) != w["leaves"]: return float("inf"), "the leaves' order differs"
    big = max(abs(v) for v in w["h"]) or 1.0; e = max(abs(val(a) - b) for a, b in zip(out["h"], w["h"])) / big; return e, f"heights {e:.2e}"
POST["linkFlat"] = link_post

cases = []
ONLY = os.environ.get("ONLY")  # ONLY=name,name: those generators alone
for name, (f, tol) in GEN.items():
    if ONLY and name not in ONLY.split(","): continue
    for k in range(max(1, math.ceil(per * SHARE.get(name, 1.0)))):
        for _ in range(20):
            try:
                res = f(); args, want = res[0], res[1]; fn = res[2] if len(res) > 2 else name; break
            except Exception:
                continue
        else:
            continue
        cases.append({"id": len(cases), "fn": fn, "gen": name, "args": [a if isinstance(a, (list, dict)) or a is None else num(a) for a in args], "want": want if name in POST else num(want), "tol": tol, "k": k})

node = subprocess.run(["node", os.path.join(here, "run.mjs")] + sys.argv[3:4], input="\n".join(json.dumps(c) for c in cases),
                      capture_output=True, text=True, cwd=os.path.join(here, "..", ".."))
if node.returncode:
    print(node.stderr); sys.exit(1)
got = {}
for line in node.stdout.splitlines():
    r = json.loads(line)
    got[r["id"]] = r

def val(v):
    return float("nan") if v == "NaN" else float("inf") if v == "Infinity" else float("-inf") if v == "-Infinity" else v

fails, worst, shorts = [], {}, {}
for c in cases:
    r = got.get(c["id"], {"err": "no answer"})
    w = val(c["want"])
    if "err" in r:
        fails.append((c, f"error: {r['err']}")); continue
    if c["gen"] in POST:
        e, why = POST[c["gen"]](c, r["out"])
        if e > worst.get(c["gen"], (0, None))[0]: worst[c["gen"]] = (e, c)
        if not e <= c["tol"]: fails.append((c, why))
        continue
    g = val(r["out"]) if not isinstance(r["out"], (dict, list)) else r["out"]
    if not isinstance(g, float) and not isinstance(g, int):
        fails.append((c, f"not a number: {r['out']}")); continue
    if math.isnan(w) or math.isinf(w) or math.isnan(g) or math.isinf(g):
        ok = (math.isnan(w) and math.isnan(g)) or g == w
        e = 0.0 if ok else float("inf")
    else:
        d = abs(g - w)
        e = 0.0 if d == 0 else d / max(abs(w), 1e-300)
        if c["fn"] in ("lgammaFn", "lbeta"): e = d / max(1.0, abs(w))
        if c["fn"] in ("quantileSorted", "quantileType", "descStats@med", "descStats@mad"):  # a mix of two values: an ulp of the largest
            e = d / max(abs(w), max(abs(x) for x in c["args"][0]) * 2 ** -52, 1e-300)
        if c["fn"] in ("descStats@skew", "descStats@kurt"): e = d / max(abs(w), 1.0)  # differences of terms of order 1: absolute below 1
        if c["fn"] == "dagoTest@k2": e = d / max(abs(w), 1.0)  # a sum of two squared scores: absolute below 1
        if c["fn"] == "nctCdf": e = d  # absolute (targets.json)
        if c["fn"] == "powerAt@pw": e = d  # a power, absolutely (targets.json)
        if c["fn"] == "tukeySf": e = d / 10  # against SciPy: 1e-12 absolutely (the generator says why)
        if c["fn"] == "fxCalcAt": e = 0.0 if d <= c["args"][6] else d / max(abs(w), c["args"][6])  # within the error its double arithmetic may make
    if e > worst.get(c["gen"], (0, None))[0]:
        worst[c["gen"]] = (e, c)
    t = TARGET.get(c["gen"], {})
    if not e <= c["tol"]:
        if t.get("until") and e <= t["now"]:
            shorts[c["gen"]] = shorts.get(c["gen"], 0) + 1
        else:
            fails.append((c, f"error {e:.2e} past {c['tol']:.0e}{' and past ' + format(t['now'], '.0e') + ', where it stood' if t.get('until') else ''}: got {g!r}, the reference {w!r}"))

if os.environ.get("FUZZDUMP"):  # every failing case in full, to make it again
    json.dump([c for c, _ in fails], open(os.environ["FUZZDUMP"], "w"))
print(f"seed {seed}, {per} cases a function")
for name in GEN:
    e, c = worst.get(name, (0.0, None))
    n = sum(1 for f, _ in fails if f["gen"] == name)
    t = TARGET.get(name, {})
    state = "ok" if not n and not shorts.get(name) else (f"{n} FAILED" if n else f"{shorts[name]} short of target until slice {t['until']} (within {t['now']:.0e})")
    print(f"  {name:15} worst {e:.2e}  tolerance {GEN[name][1]:.0e}  {state}")
for name in GEN:
    e, c = worst.get(name, (0.0, None))
    if c is not None and name not in POST and not e <= c["tol"] and not (TARGET.get(name, {}).get("until") and e <= TARGET[name]["now"]):
        print(f"  worst {name}{tuple(c['args']) if len(json.dumps(c['args'])) < 160 else '(…)'}  case {c['k']}: got {val(got[c['id']].get('out'))!r}, the reference {val(c['want'])!r}")
for c, why in fails[:40]:
    print(f"  FAIL {c['fn']}{tuple(c['args']) if len(json.dumps(c['args'])) < 120 else '(…)'}  case {c['k']}: {why}")
if len(fails) > 40:
    print(f"  … and {len(fails) - 40} more")
sys.exit(1 if fails else 0)
