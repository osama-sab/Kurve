"""A profile across a width, fitted (QUDI_SPEC Q.6): the reference for Kurve's kProfile, written again from its definitions in
NumPy and SciPy, and fixtures/profile.json.

Each sample along a line is ImageJ's (its getLine: the line's ends in ImageJ's pixel coordinates, n = round(length) steps, one more
unless along a whole row or column, the position accumulated step by step, getInterpolatedValue's bilinear with its edge rule); across
a width, the mean of m values a pixel apart along the unit normal (offsets k − (m − 1)/2), m = round(width / the across step's length).
Each sample is a sum of cells Σ a_c v_c; its variance with shot noise is Σ a_c² σ_c² (σ_c² = max(v t, 1)/t² for a rate, max(v, 1) for
counts); from the scatter its error is the spread across over √m. The fit: SciPy's curve_fit with sigma the samples' covariance
C = A diag(σ²) Aᵀ (generalised least squares, as Kurve whitens by C's Cholesky factor), absolute with shot noise, the cells' σ² then
from the fitted values (the mean of the fitted samples that read a cell, weighted as they read it) until the fit settles; scaled by
the reduced χ² from the scatter (σ = 1 for every cell).

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/profile_fixtures.py   (reads fixtures/spots.json's NV scan, writes fixtures/profile.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
from scipy.optimize import curve_fit
from scipy.special import erfc

def lin(a, b, n):   # NumPy's linspace, its last value b exactly (as Kurve's matAxis)
    st = (b - a) / (n - 1); return [a + k * st if k < n - 1 else b for k in range(n)]
def jint(v): return int(math.trunc(v))
def jround(v): return int(math.floor(v + 0.5))
L16, Z90 = 4 * math.log(2), 1.2815515655446004

def image(m):   # ImageJ's image of a matrix with rising axes: the top row the largest Y
    nx, ny = m["nx"], m["ny"]; z = m["z"]
    return [float("nan") if z[(ny - 1 - py) * nx + px] is None else float(z[(ny - 1 - py) * nx + px]) for py in range(ny) for px in range(nx)]

def kprofile(m, o):
    nx, ny = m["nx"], m["ny"]; W, H = nx, ny; X = lin(m["x"]["a"], m["x"]["b"], nx); Y = lin(m["y"]["a"], m["y"]["b"], ny)
    pw, ph = (X[-1] - X[0]) / (nx - 1), (Y[-1] - Y[0]) / (ny - 1); v = image(m)
    snap = lambda q: round(q) if abs(q - round(q)) <= 1e-9 else q
    lx0, ly0 = snap((o["x0"] - X[0]) / pw), snap((Y[-1] - o["y0"]) / ph); lx1, ly1 = snap((o["x1"] - X[0]) / pw), snap((Y[-1] - o["y1"]) / ph)
    dx, dy = lx1 - lx0, ly1 - ly0; L = math.sqrt(dx * dx + dy * dy); n = jround(L)
    xinc, yinc = dx / n, dy / n
    if not ((xinc == 0 and n == H) or (yinc == 0 and n == W)): n += 1
    step = pw if pw == ph else math.sqrt((pw * dx) ** 2 + (ph * dy) ** 2) / L
    RX, RY = [], []; rx, ry = lx0, ly0
    for i in range(n): RX.append(rx); RY.append(ry); rx += xinc; ry += yinc
    px = lambda a, b: v[b * W + a]
    cl = lambda a, N: 0 if a <= 0 else (N - 1 if a >= N else a)
    def interp(x, y):   # ImageJ's getInterpolatedValue
        out = x < 0 or x >= W - 1 or y < 0 or y >= H - 1
        if out and (x < -1 or x >= W or y < -1 or y >= H): return 0.0, []
        xb, yb = jint(x), jint(y); xf, yf = max(x - xb, 0.0), max(y - yb, 0.0)
        g = (lambda a, b: px(cl(a, W), cl(b, H))) if out else px
        idx = (lambda a, b: cl(b, H) * W + cl(a, W)) if out else (lambda a, b: b * W + a)
        ll, lr, ur, ul = g(xb, yb), g(xb + 1, yb), g(xb + 1, yb + 1), g(xb, yb + 1)
        ua = ul + xf * (ur - ul); la = ll + xf * (lr - ll)
        w = {}
        for (a, b, q) in ((xb, yb, (1 - xf) * (1 - yf)), (xb + 1, yb, xf * (1 - yf)), (xb, yb + 1, (1 - xf) * yf), (xb + 1, yb + 1, xf * yf)):
            if q: w[idx(a, b)] = w.get(idx(a, b), 0.0) + q
        return la + yf * (ua - la), list(w.items())
    ux, uy = -dy / L, dx / L; pa = math.hypot(pw * ux, ph * uy)
    mm = max(1, jround(o["w"] / pa)) if o.get("w") else 1
    noise, t = o["noise"], o.get("t")
    var1 = (lambda c: max(c * t, 1) / (t * t)) if noise == "rate" else (lambda c: max(c, 1.0))
    kv, ksv, rows = [None] * n, [None] * n, [None] * n
    for i in range(n):
        if mm == 1:
            q, w = interp(RX[i], RY[i])
            if q != q or not w: continue
            kv[i], rows[i] = q, w
        else:
            vals, acc, bad = [], {}, False
            for k in range(mm):
                off = k - (mm - 1) / 2; x, y = RX[i] + off * ux, RY[i] + off * uy
                if x < -1e-9 or x > W - 1 + 1e-9 or y < -1e-9 or y > H - 1 + 1e-9: bad = True; break
                q, w = interp(x, y)
                if q != q: bad = True; break
                vals.append(q)
                for c, a in w: acc[c] = acc.get(c, 0.0) + a / mm
            if bad: continue
            s = 0.0
            for q in vals: s += q
            kv[i] = s / mm; rows[i] = list(acc.items())
            if noise == "scatter": ksv[i] = math.sqrt(sum((q - kv[i]) ** 2 for q in vals) / (mm - 1) / mm)
        if noise != "scatter": ksv[i] = math.sqrt(math.fsum(a * a * var1(v[c]) for c, a in rows[i]))
    out = dict(n=n, m=mm, step=step, kv=kv, ksv=ksv)
    kind = o.get("fit", "none")
    if kind == "none": return out
    K = [i for i in range(n) if rows[i] and kv[i] is not None]; nk = len(K)
    d = np.array([i * step for i in K]); yv = np.array([kv[i] for i in K])
    cells = sorted({c for i in K for c, _ in rows[i]}); col = {c: j for j, c in enumerate(cells)}
    A = np.zeros((nk, len(cells)))
    for j, i in enumerate(K):
        for c, a in rows[i]: A[j, col[c]] += a
    Phi = lambda u: 0.5 * erfc(-u / math.sqrt(2))
    f = (lambda x, d0, a, b, w: b + a * np.exp(-L16 * (x - d0) ** 2 / (w * w))) if kind == "peak" else (lambda x, d0, a, b, w: b + a * Phi(2 * Z90 * (x - d0) / w))
    span = d[-1] - d[0]
    if kind == "peak": im = int(np.argmax(yv)); B0 = float(np.quantile(yv, 0.1)); p0 = [d[im], yv[im] - B0, B0, span / 6]
    else: k = max(2, jround(nk / 10)); a0, b0 = yv[:k].mean(), yv[-k:].mean(); p0 = [d[0] + span / 2, b0 - a0, a0, span / 5]
    def gls(var, p):
        C = (A * var[None, :]) @ A.T
        P, cov = curve_fit(f, d, yv, p0=p, sigma=C, absolute_sigma=(noise != "scatter"), method="lm", ftol=1e-15, xtol=1e-15, gtol=1e-15, maxfev=100000)
        r = yv - f(d, *P); Lc = np.linalg.cholesky(C); z = np.linalg.solve(Lc, r); chi = float(z @ z)
        return P, cov, chi
    var = np.array([1.0 if noise == "scatter" else var1(v[c]) for c in cells])
    P, cov, chi = gls(var, p0); rounds = 0
    if noise != "scatter":
        for rounds in range(1, 60):
            g = f(d, *P); mu = np.maximum((A * g[:, None]).sum(0) / A.sum(0), 0)
            P2, cov, chi = gls(np.array([var1(q) for q in mu]), P)
            moved = np.max(np.abs(P2 - P) / np.abs([span, P[1], max(abs(P[2]), abs(P[1])), P[3]]))
            P = P2
            if moved < 1e-13: break
    dof = nk - 4
    out["fit"] = dict(kind=kind, p=[float(q) for q in P], e=[float(math.sqrt(cov[k, k])) for k in range(4)], red=chi / dof, dof=dof, rounds=rounds)
    return out

F = json.load(open(os.path.join(here, "fixtures", "spots.json")))
scan, t, truth = F["cases"][0]["m"], F["scan"]["t"], F["scan"]["truth"]
S5, S3, S4 = truth[5], truth[3], truth[4]
rng = np.random.default_rng(611)
def edge_scan():   # a tilted edge in counts: 50 below, 450 above, its line spread a Gaussian of σ 0.12, Poisson
    nx, ny = 50, 40; X, Y = lin(0, 4.9, nx), lin(0, 3.9, ny); z = []
    for y in Y:
        for x in X:
            u = (x - 2.4 - 0.15 * (y - 2)) / 0.12; z.append(float(rng.poisson(50 + 400 * 0.5 * erfc(-u / math.sqrt(2)))))
    return dict(nx=nx, ny=ny, x=dict(a=0.0, b=4.9), y=dict(a=0.0, b=3.9), z=z)
def gauss_scan():   # a Gaussian spot on the cells' centres, noise-free
    nx, ny = 41, 41; X, Y = lin(0, 4, nx), lin(0, 4, ny)
    return dict(nx=nx, ny=ny, x=dict(a=0.0, b=4.0), y=dict(a=0.0, b=4.0), z=[100 + 1000 * math.exp(-L16 * ((x - 2) ** 2 + (y - 2) ** 2) / 0.16) for y in Y for x in X])
E, G = edge_scan(), gauss_scan()
cases = [
    dict(name="the NV scan, along X through a spot, 0.4 µm wide, shot noise of a rate, a peak", m=scan, o=dict(x0=S5["x"] - 1, y0=S5["y"], x1=S5["x"] + 1, y1=S5["y"], w=0.4, noise="rate", t=t, fit="peak")),
    dict(name="the NV scan, a diagonal through a spot, a pixel wide, shot noise of a rate, a peak", m=scan, o=dict(x0=S5["x"] - 0.8, y0=S5["y"] - 0.7, x1=S5["x"] + 0.9, y1=S5["y"] + 0.8, noise="rate", t=t, fit="peak")),
    dict(name="the NV scan, a diagonal through a spot, 0.6 µm wide, from the scatter, a peak", m=scan, o=dict(x0=S5["x"] - 0.8, y0=S5["y"] + 0.75, x1=S5["x"] + 0.85, y1=S5["y"] - 0.8, w=0.6, noise="scatter", fit="peak")),
    dict(name="the NV scan, through the pair, 0.3 µm wide, shot noise of a rate, no fit", m=scan, o=dict(x0=S3["x"] - 0.7, y0=S3["y"] - 0.4, x1=S4["x"] + 0.7, y1=S4["y"] + 0.4, w=0.3, noise="rate", t=t, fit="none")),
    dict(name="a tilted edge in counts, an oblique line 0.5 wide, an edge", m=E, o=dict(x0=1.0, y0=1.2, x1=3.8, y1=2.6, w=0.5, noise="counts", fit="edge")),
    dict(name="a noise-free spot along a row of cells' centres, three rows wide, from the scatter", m=G, o=dict(x0=0.5, y0=2.0, x1=3.5, y1=2.0, w=0.3, noise="scatter", fit="peak"), exact=[1.5, 1000.0 * (1 + 2 * math.exp(-L16 * 0.01 / 0.16)) / 3, 100.0, 0.4]),   # the mean of three rows a cell apart: the same FWHM, its height that mean
]
out = []
for c in cases:
    r = kprofile(c["m"], c["o"]); out.append(dict(name=c["name"], m=c["m"], o=c["o"], want=r, exact=c.get("exact")))
    fp = r.get("fit")
    print(f'{c["name"]}: {r["n"]} samples, {r["m"]} across' + (f', {fp["kind"]} at {fp["p"][0]:.5f} ± {fp["e"][0]:.2e}, w {fp["p"][3]:.5f} ± {fp["e"][3]:.2e}, χ²/ν {fp["red"]:.4f}, {fp["rounds"]} rounds' if fp else ""))
json.dump(dict(cases=out), open(os.path.join(here, "fixtures", "profile.json"), "w"), indent=0,
          default=lambda q: float(q) if isinstance(q, np.floating) else int(q) if isinstance(q, np.integer) else q)
print("wrote fixtures/profile.json")
