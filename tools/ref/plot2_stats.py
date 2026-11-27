"""Statistical charts (PLOT2_SPEC 7.2): references for Kurve's ctrlConst, ctrlChart, ctrlRules, paretoOf, blandAltman, metaAnalysis
and qqData, fixtures/plot2-stats.json.

- Control-chart constants: d2 = E[R]/sigma and d3 = SD(R)/sigma of the range of n standard normals, at 24 digits with mpmath, from
  P(R <= w) = n * int phi(x) (Phi(x + w) - Phi(x))^(n-1) dx, d2 = int_0^inf P(R > w) dw, E[R^2] = int_0^inf 2w P(R > w) dw; c4 from
  mpmath's gamma. Checked against the four-decimal table of ASTM E2587 / Montgomery's Appendix VI.
- Each chart's centre and limits written again from Montgomery (Introduction to Statistical Quality Control, 8th ed., 2019), sections
  6.2 (X-bar and R), 6.3 (X-bar and S, also of variable size), 6.4 (individuals and moving range) and 7.2 to 7.4 (p, np, c, u),
  with the constants above; the Western Electric rules (Western Electric 1956, Montgomery 5.3.6) and Nelson's eight (Nelson 1984)
  written again in plain Python, marking the point that completes each pattern.
- Pareto: pandas' groupby sum, sorted descending, ties in the order first seen (a stable sort).
- Bland and Altman (1999): NumPy, the t quantile by SciPy.
- Meta-analysis: statsmodels' combine_effects (fixed and DerSimonian-Laird), its Q, I2 and tau2; where statsmodels leaves tau2 below zero
  (Q < df) it is truncated at 0 as DerSimonian and Laird (1986) do, and the random effects are then the fixed effect.
- Q-Q plots: maximum likelihood with the location 0 solved at 30 digits (SciPy's weibull_min.fit and gamma.fit as a check), the plotting positions written
  from their definitions (Filliben's as SciPy's probplot computes them), the band from beta.ppf, the quantiles by SciPy.

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/plot2_stats.py   (writes fixtures/plot2-stats.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np, pandas as pd
from scipy import stats
import mpmath as mp
from statsmodels.stats.meta_analysis import combine_effects

mp.mp.dps = 20
rng = np.random.default_rng(7202611)

# ---- the constants
# Gauss-Legendre in panels, the nodes refined to 40 digits by Newton's method on the Legendre polynomial (NumPy's, in doubles, left
# n int phi Phi^(n-1) some 1e-16 above 1, so 1 - F(w) integrated against 2w up to 16 was 2e-14 off, in both orders alike), the
# integrand at 24 digits. P(R <= w) = n int phi(x) (Phi(x + w) - Phi(x))^(n-1) dx over
# [-10, 10] whatever w (the integrand is below phi(x), which is 8e-23 at 10), so phi and Phi at the inner nodes are worked out once and each
# point costs one Phi. E[R^2] = int_0^16 2w P(R > w) dw. Every constant at two orders (32 and 48 panels of 32 nodes, inside and out),
# whose d3 must agree to 5e-16 (E[R^2] agrees to 1e-18 to 1e-17; the sums are kept in fixtures/.ctrl-m2.json).
from numpy.polynomial.legendre import leggauss
def gl_nodes(G):
    xs, ws = [], []
    with mp.workdps(40):
        for x0 in leggauss(G)[0]:
            x = mp.mpf(float(x0))
            for it in range(10):
                p0, p1 = mp.mpf(1), x
                for k in range(2, G + 1): p0, p1 = p1, ((2 * k - 1) * x * p1 - (k - 1) * p0) / k
                dp = G * (x * p1 - p0) / (x * x - 1)
                if it == 9: break
                x -= p1 / dp
            xs.append(x); ws.append(2 / ((1 - x * x) * dp * dp))
        assert abs(mp.fsum(ws) - 2) < mp.mpf(10) ** -35, mp.fsum(ws)
    return xs, ws
XG, WG = gl_nodes(32)
def nodes(a, b, panels):
    a, b = mp.mpf(a), mp.mpf(b); h = (b - a) / panels; xs, ws = [], []
    for k in range(panels):
        c = a + (k + mp.mpf(1) / 2) * h
        for x, w in zip(XG, WG): xs.append(c + h / 2 * x); ws.append(w * h / 2)
    return xs, ws
NS = list(range(3, 13)) + [15, 20, 25]
def m2_part(job):
    """E[R^2] for every n of NS over a stretch of the outer nodes: Phi(x_j + w) is the same for every n, so it is worked out once
    and each n's sum takes its powers."""
    P, lo, hi = job
    mp.mp.dps = 24
    xs, ws = nodes(-10, 10, P); ph = [w * mp.npdf(x) for x, w in zip(xs, ws)]; Ph = [mp.ncdf(x) for x in xs]
    wo, wwo = nodes(0, 16, P); out = {n: mp.mpf(0) for n in NS}
    for t in range(lo, hi):
        w = wo[t]; acc = {n: mp.mpf(0) for n in NS}
        for j in range(len(xs)):
            d = mp.ncdf(xs[j] + w) - Ph[j]; pw = d * d
            for n in range(3, NS[-1] + 1):
                if n in acc: acc[n] += ph[j] * pw
                pw *= d
        for n in NS: out[n] += wwo[t] * 2 * w * (1 - n * acc[n])
    return {n: mp.nstr(v, 30) for n, v in out.items()}
def m2_all(P, cores):
    from concurrent.futures import ProcessPoolExecutor
    tot = 32 * P; cuts = [tot * k // (4 * cores) for k in range(4 * cores + 1)]
    with ProcessPoolExecutor(max_workers=cores) as ex:
        parts = list(ex.map(m2_part, [(P, cuts[k], cuts[k + 1]) for k in range(len(cuts) - 1)]))
    return {n: mp.fsum(mp.mpf(q[n]) for q in parts) for n in NS}
const = {}
CACHE = os.path.join(here, "fixtures", ".ctrl-const2.json")
if os.path.exists(CACHE): const = {int(k): v for k, v in json.load(open(CACHE)).items()}
def c4_of(n):
    return mp.sqrt(mp.mpf(2) / (n - 1)) * mp.gamma(mp.mpf(n) / 2) / mp.gamma(mp.mpf(n - 1) / 2)
if any(n not in const for n in [2] + NS):
    mp.mp.dps = 24
    const[2] = {"n": 2, "d2": float(2 / mp.sqrt(mp.pi)), "d3": float(mp.sqrt(2 - 4 / mp.pi)), "c4": float(c4_of(2))}
    cores = min(4, os.cpu_count() or 1); M2C = os.path.join(here, "fixtures", ".ctrl-m2.json")
    if os.path.exists(M2C): A, B = ({int(k): mp.mpf(v) for k, v in q.items()} for q in json.load(open(M2C)))
    else:
        A = m2_all(32, cores); B = m2_all(48, cores)
        json.dump([{n: mp.nstr(A[n], 30) for n in NS}, {n: mp.nstr(B[n], 30) for n in NS}], open(M2C, "w"))
    for n in NS:
        # the two orders agree to some 1e-18 to 1e-17 of E[R^2]; d3 = sqrt(E[R^2] - d2^2) loses a factor of up to 30 of that
        # (n = 25), so it is d3 from each order that must agree, to 5e-16
        d2 = mp.quad(lambda x: 1 - mp.ncdf(x) ** n - mp.ncdf(-x) ** n, [-mp.inf, -4, -2, 0, 2, 4, mp.inf])
        dA, dB = mp.sqrt(A[n] - d2 * d2), mp.sqrt(B[n] - d2 * d2)
        assert abs(dA - dB) < 5e-16 * dB, (n, dA, dB)
        const[n] = {"n": n, "d2": float(d2), "d3": float(dB), "c4": float(c4_of(n)), "agree": float(abs(dA - dB) / dB)}
        print("n", n, const[n], flush=True)
    json.dump(const, open(CACHE, "w"))
# n = 3 has a closed form, E[R^2] = 2 + 3 sqrt(3)/pi with E[R] = 3/sqrt(pi): the reference's own check
with mp.workdps(30):
    d3_3 = mp.sqrt(2 + 3 * mp.sqrt(3) / mp.pi - 9 / mp.pi); assert abs(const[3]["d3"] - float(d3_3)) <= 2 ** -52 * float(d3_3), (const[3], d3_3)
TABLE = {2: (1.128, 0.853, 0.7979), 3: (1.693, 0.888, 0.8862), 4: (2.059, 0.880, 0.9213), 5: (2.326, 0.864, 0.9400), 10: (3.078, 0.797, 0.9727), 25: (3.931, 0.708, 0.9896)}  # Montgomery, Appendix VI
for n, (a, b, c) in TABLE.items():
    k = const[n]; assert abs(k["d2"] - a) < 6e-4 and abs(k["d3"] - b) < 6e-4 and abs(k["c4"] - c) < 6e-5, (n, k)
def K(n):
    c = const[n] if n in const else None
    if c is None:
        raise SystemExit(f"no constant for n = {n}")
    d2, d3, c4 = c["d2"], c["d3"], c["c4"]; r = math.sqrt(1 - c4 * c4) / c4
    return dict(d2=d2, d3=d3, c4=c4, A2=3 / (d2 * math.sqrt(n)), D3=max(0, 1 - 3 * d3 / d2), D4=1 + 3 * d3 / d2, A3=3 / (c4 * math.sqrt(n)), B3=max(0, 1 - 3 * r), B4=1 + 3 * r)

# ---- rules
def rules(z, v, kind):
    out = []
    n = len(z)
    def win(i, L):
        if i - L + 1 < 0: return None
        w = list(range(i - L + 1, i + 1))
        return None if any(z[j] is None for j in w) else w
    def kof(i, L, k, lim):
        w = win(i, L)
        if not w or not abs(z[i]) > lim: return False
        s = np.sign(z[i]); return sum(1 for j in w if np.sign(z[j]) == s and abs(z[j]) > lim) >= k
    def side(i, L):
        w = win(i, L)
        if not w: return False
        s = np.sign(z[i]); return s != 0 and all(np.sign(z[j]) == s for j in w)
    for i in range(n):
        if z[i] is None: continue
        r = []
        if kind == "nelson":
            if abs(z[i]) > 3: r.append(1)
            if side(i, 9): r.append(2)
            w = win(i, 6)
            if w and (all(v[w[q]] > v[w[q - 1]] for q in range(1, 6)) or all(v[w[q]] < v[w[q - 1]] for q in range(1, 6))): r.append(3)
            w = win(i, 14)
            if w and all(v[w[q]] != v[w[q - 1]] for q in range(1, 14)) and all(np.sign(v[w[q]] - v[w[q - 1]]) * np.sign(v[w[q - 1]] - v[w[q - 2]]) < 0 for q in range(2, 14)): r.append(4)
            if kof(i, 3, 2, 2): r.append(5)
            if kof(i, 5, 4, 1): r.append(6)
            w = win(i, 15)
            if w and all(abs(z[j]) < 1 for j in w): r.append(7)
            w = win(i, 8)
            if w and all(abs(z[j]) > 1 for j in w) and any(z[j] > 1 for j in w) and any(z[j] < -1 for j in w): r.append(8)
        else:
            if abs(z[i]) > 3: r.append(1)
            if kof(i, 3, 2, 2): r.append(2)
            if kof(i, 5, 4, 1): r.append(3)
            if side(i, 8): r.append(4)
        if r: out.append({"i": i, "rules": r})
    return out

# ---- charts
charts = []
def chart(name, o, want):
    charts.append({"name": name, "o": o, "want": want})
def xbar(name, data, n, kind, rk="we"):
    G = [data[i:i + n] for i in range(0, len(data) - n + 1, n)]
    xb = [float(np.mean(g)) for g in G]; xbb = float(np.mean(np.concatenate(G)))
    k = K(n)
    if kind == "xbar-r":
        R = [float(np.ptp(g)) for g in G]; Rb = float(np.mean(R)); sig = Rb / k["d2"]; h = 3 * sig / math.sqrt(n)
        z = [(x - xbb) / (sig / math.sqrt(n)) for x in xb]
        want = dict(k=len(G), v=xb, cl=xbb, ucl=xbb + h, lcl=xbb - h, ucla=xbb + k["A2"] * Rb, B=dict(v=R, cl=Rb, ucl=k["D4"] * Rb, lcl=k["D3"] * Rb), sigma=sig, marks=rules(z, xb, rk))
    else:
        S = [float(np.std(g, ddof=1)) for g in G]; Sb = float(np.mean(S)); sig = Sb / k["c4"]
        z = [(x - xbb) / (sig / math.sqrt(n)) for x in xb]
        want = dict(k=len(G), v=xb, cl=xbb, ucl=xbb + k["A3"] * Sb, lcl=xbb - k["A3"] * Sb, B=dict(v=S, cl=Sb, ucl=k["B4"] * Sb, lcl=k["B3"] * Sb), sigma=sig, marks=rules(z, xb, rk))
    chart(name, dict(chart=kind, x=list(map(float, data)), size=n, rules=rk), want)
d = rng.normal(10, 2, 125); d[60:65] += 4.5
xbar("xbar-r n=5", d, 5, "xbar-r")
xbar("xbar-s n=5", d, 5, "xbar-s")
d2_ = rng.normal(74, 0.01, 25 * 8); d2_[100:140] += 0.012
xbar("xbar-r n=8 drift", d2_, 8, "xbar-r", "nelson")
xbar("xbar-s n=12", rng.normal(3, 0.4, 240), 12, "xbar-s", "nelson")
# variable sizes, X-bar and S (Montgomery 6.3.2): pooled S, limits by each size
sizes = [5, 4, 6, 5, 3, 6, 5, 4, 5, 6, 4, 5, 5, 6, 3, 5]
vals, sub = [], []
for j, m in enumerate(sizes):
    g = rng.normal(50, 3, m)
    if j == 9: g += 6
    vals += list(map(float, g)); sub += [f"Lot {j + 1}"] * m
G = [np.array(vals[sum(sizes[:j]):sum(sizes[:j + 1])]) for j in range(len(sizes))]
xb = [float(g.mean()) for g in G]; xbb = float(np.concatenate(G).mean())
Sb = math.sqrt(sum((len(g) - 1) * g.var(ddof=1) for g in G) / sum(len(g) - 1 for g in G))
ks = [K(len(g)) for g in G]
z = [(xb[i] - xbb) / ((Sb / ks[i]["c4"]) / math.sqrt(len(G[i]))) for i in range(len(G))]
chart("xbar-s variable sizes", dict(chart="xbar-s", x=vals, sub=sub, rules="we"),
      dict(k=len(G), v=xb, cl=xbb, uclv=[xbb + k["A3"] * Sb for k in ks], lclv=[xbb - k["A3"] * Sb for k in ks],
           B=dict(v=[float(g.std(ddof=1)) for g in G], cl=Sb, uclv=[k["B4"] * Sb for k in ks], lclv=[k["B3"] * Sb for k in ks]), marks=rules(z, xb, "we")))
# individuals
iv = rng.normal(20, 1.5, 40); iv[30:38] += 2.2
MR = np.abs(np.diff(iv)); MRb = float(MR.mean()); kk = K(2); sig = MRb / kk["d2"]; mu = float(iv.mean())
chart("imr", dict(chart="imr", x=list(map(float, iv)), rules="we"),
      dict(k=40, v=list(map(float, iv)), cl=mu, ucl=mu + 3 * sig, lcl=mu - 3 * sig, B=dict(v=[None] + list(map(float, MR)), cl=MRb, ucl=kk["D4"] * MRb, lcl=0.0), sigma=sig,
           marks=rules([(x - mu) / sig for x in iv], list(map(float, iv)), "we")))
chart("imr typed", dict(chart="imr", x=list(map(float, iv)), rules="nelson", mu=20, sigma=1.5),
      dict(k=40, cl=20.0, ucl=24.5, lcl=15.5, sigma=1.5, marks=rules([(x - 20) / 1.5 for x in iv], list(map(float, iv)), "nelson")))
# attributes
nn = rng.integers(80, 140, 30); dd = rng.binomial(nn, 0.06); dd[22] += 12
pb = dd.sum() / nn.sum(); sd = np.sqrt(pb * (1 - pb) / nn); pv = dd / nn
chart("p", dict(chart="p", x=list(map(float, dd)), n=list(map(float, nn)), rules="we"),
      dict(k=30, v=list(map(float, pv)), cl=float(pb), uclv=list(map(float, np.minimum(1, pb + 3 * sd))), lclv=list(map(float, np.maximum(0, pb - 3 * sd))), marks=rules(list(map(float, (pv - pb) / sd)), list(map(float, pv)), "we")))
dn = rng.binomial(100, 0.08, 25)
pb = dn.sum() / (100 * 25); s = math.sqrt(100 * pb * (1 - pb))
chart("np", dict(chart="np", x=list(map(float, dn)), n=100, rules="we"),
      dict(k=25, v=list(map(float, dn)), cl=100 * pb, ucl=100 * pb + 3 * s, lcl=max(0, 100 * pb - 3 * s), marks=rules([(x - 100 * pb) / s for x in dn], list(map(float, dn)), "we")))
cc = rng.poisson(6.5, 26); cc[5] = 19
cb = cc.mean()
chart("c", dict(chart="c", x=list(map(float, cc)), rules="nelson"),
      dict(k=26, v=list(map(float, cc)), cl=float(cb), ucl=float(cb + 3 * math.sqrt(cb)), lcl=float(max(0, cb - 3 * math.sqrt(cb))), marks=rules([(x - cb) / math.sqrt(cb) for x in cc], list(map(float, cc)), "nelson")))
un = rng.uniform(1, 4, 24); uc = rng.poisson(2.2 * un)
ub = uc.sum() / un.sum(); uv = uc / un
chart("u", dict(chart="u", x=list(map(float, uc)), n=list(map(float, un)), rules="we"),
      dict(k=24, v=list(map(float, uv)), cl=float(ub), uclv=list(map(float, ub + 3 * np.sqrt(ub / un))), lclv=list(map(float, np.maximum(0, ub - 3 * np.sqrt(ub / un)))), marks=rules(list(map(float, (uv - ub) / np.sqrt(ub / un))), list(map(float, uv)), "we")))

# ---- Pareto
pareto = []
def par(name, keys, vals):
    df = pd.DataFrame({"k": keys, "v": vals if vals is not None else [1.0] * len(keys)})
    df = df[df["k"].notna()]
    order = {k: i for i, k in enumerate(dict.fromkeys(df["k"]))}
    g = df.groupby("k", sort=False)["v"].sum().reset_index()
    g["o"] = g["k"].map(order); g = g.sort_values(["v", "o"], ascending=[False, True], kind="stable")
    tot = g["v"].sum(); g["pct"] = g["v"] / tot * 100; g["cum"] = g["v"].cumsum() / tot * 100
    pareto.append({"name": name, "keys": keys, "vals": vals, "rows": [{"key": r.k, "v": float(r.v), "pct": float(r.pct), "cum": float(r.cum)} for r in g.itertuples()]})
defects = ["Scratch", "Dent", "Scratch", "Crack", "Paint", "Scratch", "Dent", "Paint", "Scratch", "Burr", "Dent", "Scratch", "Crack", "Paint", "Scratch"]
par("counted", defects, None)
par("summed", ["A", "B", "C", "A", "D", "B", "E", "C", "A"], [3.5, 12.25, 1.0, 4.0, 0.5, 2.0, 7.75, 0.25, 1.5])
par("ties", ["x", "y", "z", "w"], [2.0, 3.0, 2.0, 3.0])

# ---- Bland-Altman
bland = []
for name, n, mode in [("diff", 40, "diff"), ("pct", 25, "pct"), ("ratio", 30, "ratio"), ("small", 5, "diff")]:
    t = rng.uniform(50, 150, n); a = t + rng.normal(1.5, 4, n); b = t * 1.01 + rng.normal(0, 3, n)
    if mode == "diff": dd_ = a - b
    elif mode == "ratio": dd_ = a / b
    else: dd_ = (a - b) / ((a + b) / 2) * 100
    m = (a + b) / 2; bias = dd_.mean(); sd_ = dd_.std(ddof=1)
    for conf in (0.95, 0.9):
        zq = stats.norm.isf((1 - conf) / 2); tq = stats.t.isf((1 - conf) / 2, n - 1); sb = sd_ / math.sqrt(n); sl = sd_ * math.sqrt(3 / n)
        lo, hi = bias - zq * sd_, bias + zq * sd_
        bland.append({"name": f"{name} at {conf}", "a": list(map(float, a)), "b": list(map(float, b)), "mode": mode, "conf": conf,
                      "want": {"n": n, "m": list(map(float, m)), "d": list(map(float, dd_)), "bias": float(bias), "sd": float(sd_), "lo": float(lo), "hi": float(hi),
                               "biasCI": [float(bias - tq * sb), float(bias + tq * sb)], "loCI": [float(lo - tq * sl), float(lo + tq * sl)], "hiCI": [float(hi - tq * sl), float(hi + tq * sl)]}})

# ---- meta-analysis
meta = []
for name, k, tau in [("heterogeneous", 9, 0.25), ("homogeneous", 6, 0.0), ("two", 2, 0.1), ("large", 30, 0.4)]:
    se = rng.uniform(0.08, 0.4, k); y = rng.normal(0.3, tau, k) + rng.normal(0, se)
    for conf in (0.95, 0.9):
        r = combine_effects(y, se ** 2, method_re="dl", alpha=1 - conf)
        sf = r.summary_frame(alpha=1 - conf)   # its own alpha, 0.05 unless given
        fx, re = sf.loc["fixed effect"], sf.loc["random effect"]
        tau2, i2 = float(r.tau2), float(r.i2 * 100)
        if tau2 < 0:
            # statsmodels leaves the moment estimate below zero when Q < df; DerSimonian and Laird (1986) truncate it at 0, and then the
            # random effects are the fixed effect (I2 too is truncated at 0, Higgins and Thompson 2002)
            re, tau2, i2 = fx, 0.0, 0.0
        w_f = (1 / se ** 2) / (1 / se ** 2).sum() * 100; w_r = (1 / (se ** 2 + tau2)) / (1 / (se ** 2 + tau2)).sum() * 100
        meta.append({"name": f"{name} at {conf}", "y": list(map(float, y)), "v": list(map(float, se ** 2)), "conf": conf,
                     "want": {"fixed": [float(fx["eff"]), float(fx["sd_eff"]), float(fx["ci_low"]), float(fx["ci_upp"])], "random": [float(re["eff"]), float(re["sd_eff"]), float(re["ci_low"]), float(re["ci_upp"])],
                              "Q": float(r.q), "df": int(r.df), "tau2": tau2, "I2": i2, "wF": list(map(float, w_f)), "wR": list(map(float, w_r))}})

# ---- Q-Q
def pos(n, kind):
    i = np.arange(1, n + 1)
    if kind == "blom": return (i - 0.375) / (n + 0.25)
    if kind == "weibull": return i / (n + 1)
    if kind == "hazen": return (i - 0.5) / n
    if kind == "filliben":
        v = np.empty(n); v[-1] = 0.5 ** (1 / n); v[0] = 1 - v[-1]; v[1:-1] = (np.arange(2, n) - 0.3175) / (n + 0.365); return v
    a = 0.375 if n <= 10 else 0.5
    return (i - a) / (n + 1 - 2 * a)
# Maximum likelihood with the location 0, solved at 30 digits: SciPy's optimiser stops a few parts in 10^5 short of the maximum, so it is
# only a check here. Weibull: the shape k solves sum x^k ln x / sum x^k - 1/k = mean ln x, the scale (mean x^k)^(1/k). Gamma: the shape a
# solves ln a - digamma(a) = ln mean - mean ln x, the scale mean / a.
def weib_mle(x):
    with mp.workdps(30):
        X = [mp.mpf(float(v)) for v in x]; L = [mp.log(v) for v in X]; mL = mp.fsum(L) / len(X)
        g = lambda k: mp.fsum(v ** k * l for v, l in zip(X, L)) / mp.fsum(v ** k for v in X) - 1 / k - mL
        c0 = stats.weibull_min.fit(x, floc=0)[0]; k = mp.findroot(g, mp.mpf(c0))
        sc = (mp.fsum(v ** k for v in X) / len(X)) ** (1 / k)
        assert abs(k - c0) < 1e-3 * k, (k, c0)
        return float(k), float(sc)
def gamma_mle(x):
    with mp.workdps(30):
        X = [mp.mpf(float(v)) for v in x]; m = mp.fsum(X) / len(X); s_ = mp.log(m) - mp.fsum(mp.log(v) for v in X) / len(X)
        a0 = stats.gamma.fit(x, floc=0, method="MLE")[0]; a = mp.findroot(lambda a: mp.log(a) - mp.digamma(a) - s_, mp.mpf(a0))
        assert abs(a - a0) < 1e-3 * a, (a, a0)
        return float(a), float(m / a)
qq = []
samples = {"normal": rng.normal(5, 2, 37), "lognormal": rng.lognormal(0.5, 0.6, 52), "exp": rng.exponential(3, 44), "weibull": rng.weibull(1.7, 60) * 4, "gamma": rng.gamma(2.5, 1.3, 48), "small": rng.normal(0, 1, 8)}
for name, x in samples.items():
    x = np.sort(x.astype(float)); n = len(x)
    for dist in (["normal", "lognormal", "exp", "weibull", "gamma"] if name != "small" else ["normal"]):
        if dist in ("lognormal", "weibull", "gamma", "exp") and (x <= 0).any(): continue
        if dist == "normal": m, s = x.mean(), x.std(ddof=1); Q = lambda u: m + s * stats.norm.ppf(u); par_ = [m, s]
        elif dist == "lognormal": L = np.log(x); m, s = L.mean(), L.std(ddof=1); Q = lambda u: np.exp(m + s * stats.norm.ppf(u)); par_ = [m, s]
        elif dist == "exp": lam = 1 / x.mean(); Q = lambda u: -np.log1p(-u) / lam; par_ = [lam]
        elif dist == "weibull": c, sc = weib_mle(x); Q = lambda u: stats.weibull_min.ppf(u, c, scale=sc); par_ = [c, sc]
        else: a, sc = gamma_mle(x); Q = lambda u: stats.gamma.ppf(u, a, scale=sc); par_ = [a, sc]
        for pk in ["r", "blom", "filliben", "weibull", "hazen"]:
            p = pos(n, pk); xq = Q(p)
            i = np.arange(1, n + 1)
            lo = Q(stats.beta.ppf(0.025, i, n - i + 1)); hi = Q(stats.beta.isf(0.025, i, n - i + 1))
            q1, q3 = np.percentile(x, 25), np.percentile(x, 75); t1, t3 = Q(0.25), Q(0.75); b = (q3 - q1) / (t3 - t1)
            qq.append({"name": f"{name} as {dist}, {pk}", "vals": list(map(float, x)), "dist": dist, "pos": pk, "par": list(map(float, par_)),
                       "want": {"x": list(map(float, xq)), "lo": list(map(float, lo)), "hi": list(map(float, hi)), "qa": float(q1 - b * t1), "qb": float(b)}})
# SciPy's own probplot positions agree with Filliben's written above
osm, _ = stats.probplot(samples["normal"], dist="norm", fit=False)
assert np.allclose(np.sort(stats.norm.cdf(osm)), pos(len(osm), "filliben"), atol=1e-15)

json.dump({"const": [const[k] for k in sorted(const)], "charts": charts, "pareto": pareto, "bland": bland, "meta": meta, "qq": qq},
          open(os.path.join(here, "fixtures", "plot2-stats.json"), "w"), indent=0)
print(len(const), "constants,", len(charts), "charts,", len(pareto), "Pareto,", len(bland), "Bland-Altman,", len(meta), "meta,", len(qq), "Q-Q")
