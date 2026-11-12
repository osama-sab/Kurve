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
def gen(name, tol):
    """A generator for Kurve's function `name`; its tolerance is targets.json's (tol here is the fallback)."""
    def deco(f):
        GEN[name] = (f, TARGET.get(name, {}).get("tol", tol))
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

def num(v):
    if isinstance(v, (str, dict)): return v
    v = float(v)
    return "NaN" if math.isnan(v) else ("Infinity" if v > 0 else "-Infinity") if math.isinf(v) else v

cases = []
for name, (f, tol) in GEN.items():
    for k in range(per):
        for _ in range(20):
            try:
                args, want = f(); break
            except Exception:
                continue
        else:
            continue
        cases.append({"id": len(cases), "fn": name, "args": [a if isinstance(a, list) else num(a) for a in args], "want": num(want), "tol": tol, "k": k})

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
    if e > worst.get(c["fn"], (0, None))[0]:
        worst[c["fn"]] = (e, c)
    t = TARGET.get(c["fn"], {})
    if not e <= c["tol"]:
        if t.get("until") and e <= t["now"]:
            shorts[c["fn"]] = shorts.get(c["fn"], 0) + 1
        else:
            fails.append((c, f"error {e:.2e} past {c['tol']:.0e}{' and past ' + format(t['now'], '.0e') + ', where it stood' if t.get('until') else ''}: got {g!r}, the reference {w!r}"))

print(f"seed {seed}, {per} cases a function")
for name in GEN:
    e, c = worst.get(name, (0.0, None))
    n = sum(1 for f, _ in fails if f["fn"] == name)
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
