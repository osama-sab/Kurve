"""Charts of categories and pies (PLOT2_SPEC 7.1): the reference for Kurve's catSummary and pieSlices, fixtures/plot2-cats.json.

catSummary: each category's mean (exact, from the doubles as rationals, rounded once), its SD with n - 1 and SE (NumPy's std with
ddof=1 over sqrt(n), and the same in exact rationals then one square root), the t interval at a level (SciPy's t.ppf), the median and
the quartiles (NumPy's percentile, method "linear", R's type 7), the median's interval from the order statistics as the sign test
gives it (the largest k with P(B <= k - 1) <= (1 - level)/2, B binomial(n, 1/2) by SciPy, the interval [x_(k), x_(n-k+1)] and the level
reached 1 - 2 P(B <= k - 1)); the sum exactly; the count.

pieSlices: the values above zero, in their order or largest first, each its share and its ends as fractions of a turn, from exact
rational sums of the doubles, rounded once.

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/plot2_fixtures.py   (writes fixtures/plot2-cats.json)
"""
import os, sys, json, math
from fractions import Fraction as Fr
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
from scipy import stats

rng = np.random.default_rng(20261126)
def exact_mean(v): return float(sum(Fr(x) for x in v) / len(v))
def sd_fine(v):
    # the exact variance's square root to the last bit: Newton in rationals from the float guess
    n = len(v); m = sum(Fr(x) for x in v) / n; var = sum((Fr(x) - m) ** 2 for x in v) / (n - 1)
    if var == 0: return 0.0
    g = Fr(math.sqrt(float(var)))
    for _ in range(4): g = (g + var / g) / 2
    return float(g)

sets = []
def add(name, v): sets.append((name, [float(x) for x in v]))
add("small", [3.1, 4.7, 2.2, 5.9, 4.4])
add("two", [10.0, 12.5])
add("one", [7.25])
add("ties", [1, 2, 2, 2, 3, 3, 4, 9])
add("offset", list(1e6 + rng.normal(0, 0.01, 40)))
add("normal200", list(rng.normal(50, 8, 200)))
add("lognormal", list(rng.lognormal(1, 0.7, 63)))
add("negative", list(rng.normal(-3, 2, 17)))
add("counts", list(rng.poisson(4.5, 31).astype(float)))
add("wide", list(rng.normal(0, 1, 25) * 1e-12 + 3e-10))

cases = []
for name, v in sets:
    a = np.array(v); n = len(v); s = sorted(v)
    for conf in (0.95, 0.9, 0.99):
        m = exact_mean(v)
        out = {"name": name, "vals": v, "conf": conf, "n": n, "mean": m, "sum": float(sum(Fr(x) for x in v)),
               "median": float(np.median(a)), "q1": float(np.percentile(a, 25, method="linear")), "q3": float(np.percentile(a, 75, method="linear"))}
        if n > 1:
            sd = sd_fine(v); se = sd / math.sqrt(n); t = float(stats.t.ppf(1 - (1 - conf) / 2, n - 1))
            out.update({"sd": sd, "se": se, "t": t, "ci": [m - t * se, m + t * se]})
        a1 = (1 - conf) / 2; k = 0
        while k + 1 <= n and stats.binom.cdf(k, n, 0.5) <= a1: k += 1
        if k >= 1: out.update({"mci": [s[k - 1], s[n - k]], "mlevel": float(1 - 2 * stats.binom.cdf(k - 1, n, 0.5))})
        else: out.update({"mci": None, "mlevel": None})
        cases.append(out)

pies = []
def pie(name, v, sort):
    items = [(i, float(x)) for i, x in enumerate(v)]
    keep = [(i, x) for i, x in items if x > 0 and math.isfinite(x)]
    left = len(items) - len(keep)
    if sort == "desc": keep.sort(key=lambda z: (-z[1], z[0]))
    tot = sum(Fr(x) for _, x in keep); acc = Fr(0); sl = []
    for i, x in keep:
        a = acc / tot; acc += Fr(x); b = acc / tot
        sl.append({"i": i, "share": float(Fr(x) / tot), "a": float(a), "b": float(b)})
    pies.append({"name": name, "vals": v, "sort": sort, "slices": sl, "left": left, "tot": float(tot)})
pie("budget", [900, 420, 180, 60], "data")
pie("budget-desc", [60, 900, 180, 420], "desc")
pie("zeros", [5, 0, -3, 2.5, 0.5], "data")
pie("many", list(rng.uniform(0.1, 10, 200)), "desc")
pie("tiny", [1e-300, 3e-300, 2e-300], "data")
pie("huge", [1.5e300, 1e300, 0.5e300], "data")
pie("ties", [2, 2, 1, 2, 1], "desc")

json.dump({"cases": cases, "pies": pies}, open(os.path.join(here, "fixtures", "plot2-cats.json"), "w"), indent=0)
print(len(cases), "category cases,", len(pies), "pies")
