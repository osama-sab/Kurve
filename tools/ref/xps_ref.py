"""XPS backgrounds and Fourier self-deconvolution in NumPy, written from the papers (FIT2_SPEC 4.7), for make-fixtures.py and
diff-fuzz.py: Shirley's background by Proctor and Sherwood's iteration (Shirley 1972; Anal. Chem. 54, 13, 1982), Tougaard's
(Surf. Interface Anal. 11, 453, 1988) with the universal cross-section T/(C + T²)² and the three-parameter T/((C − T²)² + D·T²),
B meeting the high-loss end, and the self-deconvolution of Kauppinen et al. (Appl. Spectrosc. 35, 271, 1981) by numpy.fft, an
apodisation's own FWHM found in 30-digit mpmath."""
import math
import numpy as np
import mpmath as mp

def xps_ends(n, ends): return max(1, int(math.floor(n * ends / 100 + 0.5)))
def smean(a): return float(np.cumsum(np.asarray(a, dtype=float))[-1] / len(a))  # added in order, as the paper's sum (and Kurve) does
def shirley_ref(x, y, ends=3, ya=None, yb=None, tol=1e-10, maxit=100):
    o = np.argsort(x, kind="stable"); xs, ys = x[o], y[o]; n = len(xs); k = xps_ends(n, ends)
    ya = smean(ys[:k]) if ya is None else ya; yb = smean(ys[-k:]) if yb is None else yb
    B = np.full(n, ya); it = 0; conv = False
    while it < maxit:
        c = np.concatenate([[0.0], np.cumsum((xs[1:] - xs[:-1]) * ((ys[1:] - B[1:]) + (ys[:-1] - B[:-1])) / 2)])
        tot = c[-1]; it += 1
        if not abs(tot) > 0: conv = True; break
        Bn = ya + (yb - ya) * c / tot; dm = float(np.max(np.abs(Bn - B))); B = Bn
        if dm <= tol * max(abs(yb - ya), 1e-300): conv = True; break
    b = np.empty(n); b[o] = B
    return {"b": b.tolist(), "iter": it, "conv": conv, "ya": ya, "yb": yb}
def tougaard_ref(x, y, dir="up", C=1643.0, D=0.0, ends=3):
    o = np.argsort(x if dir != "down" else -x, kind="stable"); xs, ys = x[o], y[o]; n = len(xs); k = xps_ends(n, ends)
    lev, top = smean(ys[:k]), smean(ys[-k:])
    K = (lambda T: T / ((C - T * T) ** 2 + D * T * T)) if D > 0 else (lambda T: T / ((C + T * T) ** 2))
    U = np.zeros(n)
    for i in range(1, n):
        T0, T1, w = np.abs(xs[i] - xs[:i]), np.abs(xs[i] - xs[1:i + 1]), np.abs(xs[1:i + 1] - xs[:i])
        U[i] = np.sum(w * (K(T0) * (ys[:i] - lev) + K(T1) * (ys[1:i + 1] - lev)) / 2)
    ue = smean(U[-k:]); Bc = (top - lev) / ue if ue != 0 else 0.0
    b = np.empty(n); b[o] = lev + Bc * U
    return {"b": b.tolist(), "B": Bc, "lev": lev}
APOD = {"bessel": lambda t: (1 - t * t) ** 2, "triangle": lambda t: 1 - t, "happ": lambda t: mp.mpf("0.54") + mp.mpf("0.46") * mp.cos(mp.pi * t)}
APODF = {"bessel": lambda t: (1 - t * t) ** 2, "triangle": lambda t: 1 - t, "happ": lambda t: 0.54 + 0.46 * np.cos(np.pi * t)}
import functools
@functools.lru_cache(maxsize=None)
def apod_width(kind):
    with mp.workdps(30):
        D = APOD[kind]; L = lambda u: 2 * mp.quad(lambda t: D(t) * mp.cos(2 * mp.pi * u * t), [0, 1])
        h = L(0) / 2; a, b = mp.mpf(0), mp.mpf("0.1")
        while L(b) > h: b *= 1.5
        for _ in range(110):
            m = (a + b) / 2
            if L(m) > h: a = m
            else: b = m
        return float(a + b)
def fsd_ref(y, w, k, apod):
    y = np.asarray(y, dtype=float); n = len(y); a, b = y[0], y[-1]; line = a + (b - a) * np.arange(n) / (n - 1)
    N = 1
    while N < 2 * n: N <<= 1
    re = np.zeros(N); v = y - line; re[:n] = v; re[n:2 * n] = v[::-1]
    F = np.fft.fft(re); T = apod_width(apod) * k / w; clamped = T > 0.5; T = min(T, 0.5)
    q = np.arange(N); t = np.minimum(q, N - q) / N
    f = np.where(t < T, np.exp(np.pi * w * t) * APODF[apod](np.minimum(t / T, 1.0)), 0.0)
    out = np.fft.ifft(F * f).real[:n] + line
    return {"y": out.tolist(), "T": T, "clamped": bool(clamped)}
