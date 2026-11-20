"""Spots (QUDI_SPEC Q.5): a realistic NV-centre confocal scan in qudi's classic format, and SciPy's fits of Kurve's spot model.

Writes tools/ref/qudi/nv/<stamp>_confocal_xy_image_Dev1Ctr0.dat (classic qudi's save_logic, as tools/ref/qudi_fixtures.py
reproduces it): 64 × 64 cells over 8 µm, a scanner clock of 100 Hz (10 ms a cell), a background of about 1500 counts/s
with a gentle slope, 13 emitters of FWHM 0.32 to 0.40 µm (some a little elliptical), one pair 0.30 µm apart and one
0.62 µm apart; every cell a Poisson count over 10 ms, written as the rate. And tools/ref/fixtures/spots.json: the scan's
truth, and for each case the spots as Kurve's definition gives them, worked out here independently:

  seeds   ImageJ 1.54f's Find Maxima (tools/ref/ij_read.py's port) at the prominence;
  w0      the median of the seeds' FWHM: along the seed's row and column, where the values fall half way to the matrix's
          median (straight lines between cells), the geometric mean of the two widths;
  R       1.5·w0 unless typed; a window the cells within R of its seed; seeds closer than 2R one group;
  model   B + Σ A·exp(−4 ln 2·r²/w²) (round) or with u, v turned by θ (degrees) and w1, w2 (elliptical);
  fit     scipy.optimize.least_squares (trf, x_scale, every tolerance 1e-15) from the same starts within the same box;
          shot noise: weights from the data, then from the model until they settle (Poisson's maximum likelihood);
  split   a spot added at the largest weighted residual (the others' widths from w0 again) and kept when the likelihood
          ratio (or F for the scatter) gives p below 0.001, its amplitude above zero, its FWHM within a factor of two of w0
          and half w0 from every other spot, and, round, when it beats the same spots elliptical by Akaike's criterion by more than 10;
          at most three a group;
  errors  the covariance (JᵀJ)⁻¹ of the weighted analytic Jacobian, times the reduced χ² for the scatter.

Usage: PYREF=… python3.13 -I tools/ref/spot_fixtures.py
"""
import os, sys, json, math, datetime
from collections import OrderedDict
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
sys.path.insert(0, here)
import numpy as np
from scipy.optimize import least_squares
from scipy.stats import chi2 as CHI2, f as FDIST
from ij_read import find_maxima, roi_of
from fractions import Fraction

L16 = 4 * math.log(2)
OUT = os.path.join(here, "qudi", "nv"); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".dat"): os.remove(os.path.join(OUT, f))
rng = np.random.default_rng(2611)

def q7(s, p):   # NumPy's (R's type 7) quantile of sorted values
    n = len(s)
    if n == 1: return s[0]
    h = (n - 1) * p; lo = int(math.floor(h))
    return s[lo] + (h - lo) * (s[lo + 1] - s[lo]) if lo + 1 < n else s[lo]

def lin(a, b, n):   # NumPy's linspace, its last value b exactly (as Kurve's matAxis)
    st = (b - a) / (n - 1); return [a + k * st if k < n - 1 else b for k in range(n)]

def sigma(v, noise, t):
    return math.sqrt(max(v * t, 1)) / t if noise == "rate" else math.sqrt(max(v, 1)) if noise == "counts" else 1.0

def w0_of(z, nx, ny, X, Y, seeds):
    vals = sorted(v for v in z if v is not None); bg = q7(vals, 0.5); ws = []
    def cross(get, n, i0, P, d, half):
        i = i0 + d
        while 0 <= i < n:
            v, u = get(i), get(i - d)
            if v is None or u is None: return None
            if v <= half: return P[i] + (half - v) / (u - v) * (P[i - d] - P[i])
            i += d
        return None
    for (c, r) in seeds:
        v0 = z[r * nx + c]
        if not v0 > bg: continue
        half = bg + (v0 - bg) / 2
        gr = lambda i: z[r * nx + i]; gc = lambda i: z[i * nx + c]
        l, rr, d, u = cross(gr, nx, c, X, -1, half), cross(gr, nx, c, X, 1, half), cross(gc, ny, r, Y, -1, half), cross(gc, ny, r, Y, 1, half)
        if None not in (l, rr, d, u):
            w = math.sqrt(abs(rr - l) * abs(u - d))
            if w > 0: ws.append(w)
    ws.sort(); return (q7(ws, 0.5) if ws else None), len(ws)

def model(K, CX, CY, p, jac=False):
    n = len(CX); f = np.full(n, p[0]); J = np.zeros((n, len(p))) if jac else None
    if jac: J[:, 0] = 1
    for b in range(1, len(p), K):
        ex, ey = CX - p[b + 1], CY - p[b + 2]; A = p[b]
        if K == 4:
            w = p[b + 3]; r2 = ex * ex + ey * ey; g = np.exp(-L16 * r2 / (w * w)); f += A * g
            if jac:
                J[:, b] = g; J[:, b + 1] = A * g * 2 * L16 * ex / (w * w); J[:, b + 2] = A * g * 2 * L16 * ey / (w * w); J[:, b + 3] = A * g * 2 * L16 * r2 / w ** 3
        else:
            w1, w2, a = p[b + 3], p[b + 4], p[b + 5] * math.pi / 180; c, s = math.cos(a), math.sin(a)
            u = ex * c + ey * s; v = -ex * s + ey * c; q = u * u / (w1 * w1) + v * v / (w2 * w2); g = np.exp(-L16 * q); f += A * g
            if jac:
                k = -A * g * L16
                J[:, b] = g
                J[:, b + 1] = k * (-2 * u * c / w1 ** 2 + 2 * v * s / w2 ** 2)
                J[:, b + 2] = k * (-2 * u * s / w1 ** 2 - 2 * v * c / w2 ** 2)
                J[:, b + 3] = k * (-2 * u * u / w1 ** 3); J[:, b + 4] = k * (-2 * v * v / w2 ** 3)
                J[:, b + 5] = k * (2 * u * v / w1 ** 2 - 2 * u * v / w2 ** 2) * math.pi / 180
    return (f, J) if jac else f

def spot_fit(m, o):
    nx, ny = m["nx"], m["ny"]; X = lin(m["x"]["a"], m["x"]["b"], nx); Y = lin(m["y"]["a"], m["y"]["b"], ny); z = m["z"]
    shape = o.get("shape", "round"); noise = o.get("noise", "scatter"); t = o.get("t"); split = o.get("split", True)
    K = 6 if shape == "ellip" else 4
    # ImageJ's image: rows from the largest Y down, columns by rising X (the axes rise here)
    img = [z[(ny - 1 - py) * nx + px] for py in range(ny) for px in range(nx)]
    vals = [v for v in img if v is not None]
    pts = find_maxima([float("nan") if v is None else v for v in img], nx, ny, o["prom"], False, False, False, min(vals), max(vals))
    seeds = [(px, ny - 1 - py) for (px, py) in pts if z[(ny - 1 - py) * nx + px] is not None]
    dx = (X[-1] - X[0]) / (nx - 1); dy = (Y[-1] - Y[0]) / (ny - 1); pix = min(abs(dx), abs(dy))
    w0, wn = w0_of(z, nx, ny, X, Y, seeds)
    if w0 is None: w0 = 3 * pix
    R = o["R"] if o.get("R") else 1.5 * w0; R2 = R * R * (1 + 1e-12)
    S = [(X[c], Y[r], z[r * nx + c]) for (c, r) in seeds]
    def win(s):
        out = []
        for r in range(ny):
            for c in range(nx):
                v = z[r * nx + c]
                if v is None: continue
                if (X[c] - s[0]) ** 2 + (Y[r] - s[1]) ** 2 <= R2: out.append(r * nx + c)
        return out
    par = list(range(len(S)))
    def find(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for i in range(len(S)):
        for j in range(i + 1, len(S)):
            if (S[i][0] - S[j][0]) ** 2 + (S[i][1] - S[j][1]) ** 2 < 4 * R * R:
                a, b = find(i), find(j)
                if a != b: par[max(a, b)] = min(a, b)
    gl, gm = [], {}
    for i in range(len(S)):
        k = find(i)
        if k not in gm: gm[k] = len(gl); gl.append([])
        gl[gm[k]].append(i)
    spots, groups = [], []
    for gi, g in enumerate(gl):
        cells = sorted(set(k for i in g for k in win(S[i])))
        CX = np.array([X[k % nx] for k in cells]); CY = np.array([Y[k // nx] for k in cells]); Z = np.array([z[k] for k in cells]); n = len(cells)
        Wd = np.array([1 / sigma(v, noise, t) for v in Z]); zs = sorted(Z); B0 = q7(zs, 0.1)
        def sp(x, y, A): return dict(x=x, y=y, A=max(A, (zs[-1] - zs[0]) * 1e-3, 1e-300))
        def run(st, B, Kr=K):
            p0, lo, hi, ps = [B], [-np.inf], [np.inf], [max(abs(B0), 1e-300)]
            for q in st:
                p0 += [q["A"], q["x"], q["y"], q.get("w1") or w0]; lo += [0, q["x0"] - R, q["y0"] - R, 0.01 * pix]; hi += [np.inf, q["x0"] + R, q["y0"] + R, 4 * R]; ps += [max(q["A"], 1e-300), pix, pix, w0]
                if Kr == 6: p0 += [q.get("w2") or w0, q.get("th") or 0.0]; lo += [0.01 * pix, -np.inf]; hi += [4 * R, np.inf]; ps += [w0, 90]
            ps[0] = max(ps[0], ps[1])
            p0 = np.array([min(max(v, lo[i]), hi[i]) for i, v in enumerate(p0)]); lo, hi, ps = np.array(lo), np.array(hi), np.array(ps)
            def fit(W, start):
                start = np.minimum(np.maximum(start, lo + 1e-300 * 0), hi)
                r = least_squares(lambda p: (Z - model(Kr, CX, CY, p)) * W, start, jac=lambda p: -model(Kr, CX, CY, p, True)[1] * W[:, None],
                                  bounds=(lo, hi), x_scale=ps, method="trf", ftol=1e-15, xtol=1e-15, gtol=1e-15, max_nfev=20000)
                return r.x
            P = fit(Wd, p0); W = Wd
            if noise != "scatter":
                for _ in range(30):
                    W2 = np.array([1 / sigma(max(v, 0), noise, t) for v in model(Kr, CX, CY, P)])
                    P2 = fit(W2, P); moved = np.any(np.abs(P2 - P) > 1e-10 * ps); P, W = P2, W2
                    if not moved: break
            res = (Z - model(Kr, CX, CY, P)) * W; chi = float(res @ res)
            mu = np.maximum(model(Kr, CX, CY, P), 0); kc = t if noise == "rate" else 1
            dev = 0.0
            if noise != "scatter":
                for Ni, mi in zip(np.maximum(Z, 0) * kc, np.maximum(mu * kc, 1e-300)):
                    dev += 2 * ((Ni * math.log(Ni / mi) if Ni > 0 else 0) - (Ni - mi))
            aic = ((n * math.log(chi / n) if chi > 0 else -math.inf) if noise == "scatter" else dev) + 2 * len(p0)
            return dict(P=P, W=W, chi=chi, dev=dev, m=len(p0), lo=lo, hi=hi, aic=aic)
        def mom(x, y):   # an elliptical start: the second moments of the light above B0 within w0 (the axes' ratio held to 1.05 … 2)
            sw = sxx = syy = sxy = 0.0
            for i in range(n):
                ex, ey = CX[i] - x, CY[i] - y
                if ex * ex + ey * ey > w0 * w0: continue
                q = max(Z[i] - B0, 0); sw += q; sxx += q * ex * ex; syy += q * ey * ey; sxy += q * ex * ey
            if not sw > 0: return dict(w1=w0 * math.sqrt(1.05), w2=w0 / math.sqrt(1.05), th=0.0)
            a, c, b = sxx / sw, syy / sw, sxy / sw; tr = a + c; dt = math.sqrt(max((a - c) * (a - c) / 4 + b * b, 0)); l1 = tr / 2 + dt; l2 = max(tr / 2 - dt, 1e-300)
            e = min(2, max(1.05, math.sqrt(l1 / l2))); return dict(w1=w0 * math.sqrt(e), w2=w0 / math.sqrt(e), th=0.5 * math.atan2(2 * b, a - c) * 180 / math.pi)
        M6 = (lambda x, y: mom(x, y)) if K == 6 else (lambda x, y: {})
        st = [dict(sp(S[i][0], S[i][1], S[i][2] - B0), x0=S[i][0], y0=S[i][1], seed=i, **M6(S[i][0], S[i][1])) for i in g]
        res = run(st, B0); adds = 0
        while split and adds < 3:
            P = res["P"]; e = (Z - model(K, CX, CY, P)) * res["W"]; bi = int(np.argmax(e))
            if not e[bi] > 0: break
            st2 = [dict(dict(q, A=P[1 + j * K], x=P[2 + j * K], y=P[3 + j * K], w1=w0, w2=w0 if K == 6 else None, th=P[6 + j * K] if K == 6 else None), **M6(P[2 + j * K], P[3 + j * K])) for j, q in enumerate(st)]
            st2.append(dict(sp(CX[bi], CY[bi], Z[bi] - model(K, CX[bi:bi + 1], CY[bi:bi + 1], P)[0]), x0=CX[bi], y0=CY[bi], seed=-1, **M6(CX[bi], CY[bi])))
            r2 = run(st2, P[0]); d2 = n - r2["m"]
            pS = FDIST.sf(((res["chi"] - r2["chi"]) / K) / (r2["chi"] / d2), K, d2) if noise == "scatter" else (CHI2.sf(res["dev"] - r2["dev"], K) if res["dev"] - r2["dev"] > 0 else 1)
            bN = 1 + (len(st2) - 1) * K
            P2 = r2["P"]; wN = P2[bN + 3] if K == 4 else math.sqrt(P2[bN + 3] * P2[bN + 4])
            apart = all(math.hypot(P2[2 + j * K] - P2[bN + 1], P2[3 + j * K] - P2[bN + 2]) >= 0.5 * w0 for j in range(len(st2) - 1))
            if not (pS < 1e-3 and r2["P"][bN] > r2["lo"][bN] + 1e-12 * abs(r2["P"][bN]) and 0.5 * w0 <= wN <= 2 * w0 and apart): break
            if K == 4:
                re = run([dict(dict(q, A=P[1 + j * K], x=P[2 + j * K], y=P[3 + j * K]), **mom(P[2 + j * K], P[3 + j * K])) for j, q in enumerate(st)], P[0], 6)
                if not r2["aic"] + 10 < re["aic"]: break
            st, res, adds = st2, r2, adds + 1
        P, W = res["P"], res["W"]; _, J = model(K, CX, CY, P, True); Jw = J * W[:, None]
        cov = np.linalg.inv(Jw.T @ Jw) * (res["chi"] / (n - res["m"]) if noise == "scatter" else 1)
        E = np.sqrt(np.maximum(np.diag(cov), 0))
        groups.append(dict(n=n, B=P[0], sB=E[0], chi2=res["chi"], dev=res["dev"] if noise != "scatter" else None, split=adds, k=len(st)))
        for j, q in enumerate(st):
            b = 1 + j * K; w1, w2 = P[b + 3], (P[b + 4] if K == 6 else P[b + 3]); e1, e2 = E[b + 3], (E[b + 4] if K == 6 else E[b + 3]); i1, i2 = b + 3, (b + 4 if K == 6 else b + 3)
            th = P[b + 5] if K == 6 else None
            if K == 6:
                if w2 > w1: w1, w2, e1, e2, i1, i2, th = w2, w1, e2, e1, i2, i1, th + 90
                th = ((th + 90) % 180 + 180) % 180 - 90
            k = math.pi / L16; I = P[b] * k * w1 * w2
            if K == 4: gs, ids = [k * w1 * w1, 2 * P[b] * k * w1], [b, b + 3]
            else: gs, ids = [k * w1 * w2, P[b] * k * w2, P[b] * k * w1], [b, i1, i2]
            vI = sum(gs[x] * gs[y] * cov[ids[x], ids[y]] for x in range(len(ids)) for y in range(len(ids)))
            s = dict(x=P[b + 1], sx=E[b + 1], y=P[b + 2], sy=E[b + 2], A=P[b], sA=E[b], B=P[0], sB=E[0], I=I, sI=math.sqrt(vI) if vI >= 0 else None, g=gi + 1, add=1 if q["seed"] < 0 else 0)
            if K == 4: s.update(w=w1, sw=e1)
            else:
                h1, h2 = 0.5 * math.sqrt(w2 / w1), 0.5 * math.sqrt(w1 / w2)
                s.update(w=math.sqrt(w1 * w2), sw=math.sqrt(h1 * h1 * cov[i1, i1] + 2 * h1 * h2 * cov[i1, i2] + h2 * h2 * cov[i2, i2]), w1=w1, sw1=e1, w2=w2, sw2=e2, th=th, sth=E[b + 5])
            spots.append(s)
    return dict(R=R, w0=w0, wn=wn, seeds=len(seeds), groups=groups, spots=spots)

# ---- the NV scan --------------------------------------------------------------------------------------------------
nx = ny = 64; xr = (12.0e-6, 20.0e-6); yr = (-3.0e-6, 5.0e-6); clock = 100.0; t = 1 / clock
Xu = np.array(lin(xr[0] * 1e6, xr[1] * 1e6, nx)); Yu = np.array(lin(yr[0] * 1e6, yr[1] * 1e6, ny))
em = []
while len(em) < 11:
    x, y = rng.uniform(12.7, 19.3), rng.uniform(-2.3, 4.3)
    if all((x - a) ** 2 + (y - b) ** 2 > 1.0 for a, b, *_ in em): em.append([x, y])
em[3:5] = [[em[3][0], em[3][1]], [em[3][0] + 0.30 * math.cos(0.5), em[3][1] + 0.30 * math.sin(0.5)]]   # a pair 0.30 µm apart
em.append([em[7][0] + 0.62, em[7][1] - 0.05]); em.append([15.03, 0.97])                                  # one 0.62 µm apart, and a lone one
truth = []
for i, (x, y) in enumerate(em):
    w = 0.32 + 0.08 * rng.uniform(); el = 1 + 0.15 * rng.uniform() if i % 3 == 0 else 1.0
    truth.append(dict(x=x, y=y, A=float(rng.uniform(15000, 60000)), w1=w * math.sqrt(el), w2=w / math.sqrt(el), th=float(rng.uniform(-90, 90))))
mu = 1500 + 120 * (Xu[None, :] - 16) / 4 + 0 * Yu[:, None]
for s in truth:
    a = s["th"] * math.pi / 180; ex = Xu[None, :] - s["x"]; ey = Yu[:, None] - s["y"]
    u = ex * math.cos(a) + ey * math.sin(a); v = -ex * math.sin(a) + ey * math.cos(a)
    mu = mu + s["A"] * np.exp(-L16 * (u * u / s["w1"] ** 2 + v * v / s["w2"] ** 2))
img = rng.poisson(mu * t) / t   # a rate: a whole count times 100, exact in single precision as ImageJ holds it
ts = datetime.datetime(2026, 11, 20, 14, 5, 31)
p = OrderedDict()
p['X image min (m)'] = xr[0]; p['X image max (m)'] = xr[1]; p['X image range (m)'] = xr[1] - xr[0]
p['Y image min'] = yr[0]; p['Y image max'] = yr[1]; p['Y image range'] = yr[1] - yr[0]
p['XY resolution (samples per range)'] = nx; p['XY Image at z position (m)'] = 2.5e-06
p['Clock frequency of scanner (Hz)'] = clock; p['Return Slowness (Steps during retrace line)'] = 50
label = 'confocal_xy_image_Dev1Ctr0'; fname = ts.strftime('%Y%m%d-%H%M-%S' + '_' + label + '.dat')
header = 'Saved Data from the class {0} on {1}.\n'.format("ConfocalLogic", ts.strftime('%d.%m.%Y at %Hh%Mm%Ss'))
header += '\nParameters:\n===========\n\n'
for entry, param in p.items():
    header += '{0}: {1:.16e}\n'.format(entry, param) if isinstance(param, float) else '{0}: {1}\n'.format(entry, param)
header += '\nData:\n=====\n'
header += ('Confocal pure XY scan image data without axis.\nThe upper left entry represents the signal at the upper left pixel position.\n'
           'A pixel-line in the image corresponds to a row of entries where the Signal is in counts/s:')
with open(os.path.join(OUT, fname), 'wb') as fh:
    np.savetxt(fh, img, fmt='%.6e', delimiter='\t', header=header, comments='#')
Z = [float('%.6e' % v) for v in img.ravel()]   # what Kurve reads, row 1 the smallest Y
scan = dict(nx=nx, ny=ny, x=dict(a=Xu[0], b=Xu[-1]), y=dict(a=Yu[0], b=Yu[-1]), z=Z)

# ---- the cases ------------------------------------------------------------------------------------------------------
def syn(nx, ny, x, y, bg, spots, counts=None, seed=1):
    X, Y = np.array(lin(x[0], x[1], nx)), np.array(lin(y[0], y[1], ny)); mu = np.full((ny, nx), float(bg))
    for (x0, y0, A, w) in spots: mu = mu + A * np.exp(-L16 * ((X[None, :] - x0) ** 2 + (Y[:, None] - y0) ** 2) / (w * w))
    z = np.random.default_rng(seed).poisson(mu) if counts else mu
    return dict(nx=nx, ny=ny, x=dict(a=x[0], b=x[1]), y=dict(a=y[0], b=y[1]), z=[float(v) for v in z.ravel()])
cases = [
    dict(name="the NV scan, round, shot noise of a rate", m=scan, o=dict(prom=7500, shape="round", noise="rate", t=t, split=True)),
    dict(name="the NV scan, elliptical, shot noise of a rate", m=scan, o=dict(prom=7500, shape="ellip", noise="rate", t=t, split=True)),
    dict(name="the NV scan, round, from the scatter", m=scan, o=dict(prom=7500, shape="round", noise="scatter", split=True)),
    dict(name="the NV scan, a small window typed, no splitting", m=scan, o=dict(prom=7500, shape="round", noise="rate", t=t, R=0.3, split=False)),
    dict(name="counts with a pair closer than their FWHM", m=syn(40, 30, (0, 3.9), (0, 2.9), 12, [(1.2, 1.5, 400, 0.5), (1.62, 1.55, 300, 0.5), (2.9, 0.9, 250, 0.45)], counts=True, seed=4),
         o=dict(prom=60, shape="round", noise="counts", split=True)),
    dict(name="noise-free spots off the cells' centres, from the scatter", m=syn(30, 30, (-1.45, 1.45), (0, 2.9), 100, [(-0.913, 0.737, 1000, 0.42), (0.921, 2.204, 700, 0.38)]),
         o=dict(prom=100, shape="round", noise="scatter", split=False), exact=[(-0.913, 0.737, 1000, 0.42), (0.921, 2.204, 700, 0.38)]),
]
out = []
for c in cases:
    r = spot_fit(c["m"], c["o"]); out.append(dict(name=c["name"], m=c["m"], o=c["o"], want=r, exact=c.get("exact")))
    print(f'{c["name"]}: {len(r["spots"])} spots from {r["seeds"]} seeds in {len(r["groups"])} groups, R {r["R"]:.4f}')
# ---- intensities with their noise (QUDI_SPEC Q.7): the region's cells as ImageJ's port takes them (rectangles and ovals), the
# ring the cells outside within `ring` of a region cell, every sum in exact fractions, the errors by fsum ----------------------
def kmeasure(m, reg, o):
    nx, ny = m["nx"], m["ny"]; X = lin(m["x"]["a"], m["x"]["b"], nx); Y = lin(m["y"]["a"], m["y"]["b"], ny); z = m["z"]
    pw, ph = (X[-1] - X[0]) / (nx - 1), (Y[-1] - Y[0]) / (ny - 1)
    x0, y0, w, h, mask, _ = roi_of(reg, dict(cx=sorted(X), cy=sorted(Y, reverse=True), pw=pw, ph=ph), nx, ny)
    cells = sorted((ny - 1 - (y0 + y)) * nx + (x0 + x) for y in range(h) for x in range(w) if mask is None or mask[y][x])
    inr = set(cells); noise, t, ring = o.get("noise", "scatter"), o.get("t"), o.get("ring") or 0
    rg = []
    if ring > 0:
        r2 = ring * ring * (1 + 1e-12)
        for q in range(nx * ny):
            if q in inr: continue
            c, r = q % nx, q // nx
            if any((X[c] - X[k % nx]) ** 2 + (Y[r] - Y[k // nx]) ** 2 <= r2 for k in cells): rg.append(q)
    V = [z[k] for k in cells if z[k] is not None]; B = [z[k] for k in rg if z[k] is not None]; n, nb = len(V), len(B)
    var1 = lambda v: max(v * t, 1) / (t * t) if noise == "rate" else max(v, 1)
    S = sum(Fraction(v) for v in V); bg = sum(Fraction(v) for v in B) / nb if nb else None
    out = dict(n=n, nb=nb, sum=float(S), mean=float(S / n), bg=float(bg) if nb else None, net=float(S - n * bg) if nb else None)
    if noise != "scatter":
        ss = math.sqrt(math.fsum(var1(v) for v in V)); sb = math.sqrt(math.fsum(var1(v) for v in B)) / nb if nb else None
    elif nb > 1:
        sd = math.sqrt(float(sum((Fraction(v) - bg) ** 2 for v in B) / (nb - 1))); ss, sb = sd * math.sqrt(n), sd / math.sqrt(nb)
    else: ss = sb = None
    out.update(ssum=ss, smean=ss / n if ss is not None else None, sbg=sb, snet=math.sqrt(ss * ss + n * n * sb * sb) if ss is not None and sb is not None else None)
    return out
T5, Tp = truth[5], truth[3]
kcases = [
    dict(name="an oval about a spot, a ring of 0.4 µm, shot noise of a rate", reg=dict(kind="oval", x0=T5["x"] - 0.4, x1=T5["x"] + 0.4, y0=T5["y"] - 0.4, y1=T5["y"] + 0.4), o=dict(noise="rate", t=t, ring=0.4)),
    dict(name="a rectangle about the pair, a ring of 0.3 µm, the ring's scatter", reg=dict(kind="rect", x0=Tp["x"] - 0.5, x1=Tp["x"] + 0.8, y0=Tp["y"] - 0.5, y1=Tp["y"] + 0.6), o=dict(noise="scatter", ring=0.3)),
    dict(name="the whole scan as counts, no ring", reg=dict(kind="all"), o=dict(noise="counts")),
    dict(name="a rectangle, no ring, the scatter: no errors", reg=dict(kind="rect", x0=13.0, x1=14.0, y0=2.0, y1=2.6), o=dict(noise="scatter")),
]
kout = [dict(name=c["name"], reg=c["reg"], o=c["o"], want=kmeasure(scan, c["reg"], c["o"])) for c in kcases]
for c in kout: print(c["name"] + ":", c["want"]["n"], "cells,", c["want"]["nb"], "in the ring")
json.dump(dict(scan=dict(file=os.path.join("qudi", "nv", fname), truth=truth, t=t), cases=out, kmeasure=kout), open(os.path.join(here, "fixtures", "spots.json"), "w"), indent=0,
          default=lambda v: float(v) if isinstance(v, np.floating) else int(v) if isinstance(v, np.integer) else v)
print("wrote", fname, "and fixtures/spots.json")
