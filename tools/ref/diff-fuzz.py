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

cases = []
for name, (f, tol) in GEN.items():
    for k in range(max(1, math.ceil(per * SHARE.get(name, 1.0)))):
        for _ in range(20):
            try:
                res = f(); args, want = res[0], res[1]; fn = res[2] if len(res) > 2 else name; break
            except Exception:
                continue
        else:
            continue
        cases.append({"id": len(cases), "fn": fn, "gen": name, "args": [a if isinstance(a, list) else num(a) for a in args], "want": num(want), "tol": tol, "k": k})

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
        if c["fn"] == "tukeySf": e = d / 10  # against SciPy: 1e-12 absolutely (the generator says why)
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
    if c is not None and not e <= c["tol"] and not (TARGET.get(name, {}).get("until") and e <= TARGET[name]["now"]):
        print(f"  worst {name}{tuple(c['args']) if len(json.dumps(c['args'])) < 160 else '(…)'}  case {c['k']}: got {val(got[c['id']].get('out'))!r}, the reference {val(c['want'])!r}")
for c, why in fails[:40]:
    print(f"  FAIL {c['fn']}{tuple(c['args']) if len(json.dumps(c['args'])) < 120 else '(…)'}  case {c['k']}: {why}")
if len(fails) > 40:
    print(f"  … and {len(fails) - 40} more")
sys.exit(1 if fails else 0)
