"""The shift between two scans (QUDI_SPEC Q.8): the reference for Kurve's regShift, written again in NumPy from Guizar-Sicairos,
Thurman and Fienup, "Efficient subpixel image registration algorithms", Opt. Lett. 33, 156 (2008), and fixtures/shift.json.

Each image less its mean (an empty cell 0); R = conj(F_A)·F_B (or R/|R|, the phase correlation); the inverse FFT's largest magnitude the
shift to a cell (past half the size, negative); then R's DFT on a grid 1/up of a cell apart over ceil(1.5 up) points about it, as the
paper's dftups: two matrix products with kernels exp(2πi·k·p/n), k NumPy's fftfreq times n, and its largest magnitude the shift. The
shift s is the second scan's against the first, B(x) = A(x − s). Every case's shift is compared exactly (the same grid point), the
correlation at it to the rounding.

The NV case is a back scan of tools/ref/qudi/nv's scan (spot_fixtures.py's emitters and background), the same place drawn again with
its own Poisson noise and moved by a known lag.

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/shift_fixtures.py   (reads fixtures/spots.json, writes fixtures/shift.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np

def lin(a, b, n):
    st = (b - a) / (n - 1); return [a + k * st if k < n - 1 else b for k in range(n)]
L16 = 4 * math.log(2)

def reg(m1, m2, up=100, norm="cc"):
    nx, ny = m1["nx"], m1["ny"]
    def prep(m):
        z = np.array([np.nan if v is None else float(v) for v in m["z"]]).reshape(ny, nx); mu = np.nanmean(z); z = z - mu; z[np.isnan(z)] = 0; return z
    a, b = prep(m1), prep(m2)
    R = np.conj(np.fft.fft2(a)) * np.fft.fft2(b)
    if norm == "phase":
        mg = np.abs(R); R = np.where(mg > 0, R / np.where(mg > 0, mg, 1), 0)
    cc = np.fft.ifft2(R); iy, ix = np.unravel_index(np.argmax(np.abs(cc)), cc.shape); ix, iy = int(ix), int(iy)
    if ix > nx // 2: ix -= nx
    if iy > ny // 2: iy -= ny
    sx, sy = float(ix), float(iy)
    if up > 1:
        m = int(math.ceil(1.5 * up)); c = m // 2
        kx = np.fft.fftfreq(nx) * nx; ky = np.fft.fftfreq(ny) * ny
        px = ix + (np.arange(m) - c) / up; py = iy + (np.arange(m) - c) / up
        Kx = np.exp(2j * np.pi * np.outer(px, kx) / nx); Ky = np.exp(2j * np.pi * np.outer(py, ky) / ny)
        CC = Ky @ (R @ Kx.T)
        bi, bj = np.unravel_index(np.argmax(np.abs(CC)), CC.shape)
        sx, sy = ix + (bj - c) / up, iy + (bi - c) / up
    kx, ky = int(math.floor(sx + 0.5)), int(math.floor(sy + 0.5)); sab = saa = sbb = 0.0   # as JavaScript's Math.round (Python's rounds half to even)
    for y in range(ny):
        yb = y + ky
        if yb < 0 or yb >= ny: continue
        for x in range(nx):
            xb = x + kx
            if xb < 0 or xb >= nx: continue
            u, w = a[y, x], b[yb, xb]; sab += u * w; saa += u * u; sbb += w * w
    return dict(sx=float(sx), sy=float(sy), ix=ix, iy=iy, r=sab / math.sqrt(saa * sbb))

rng = np.random.default_rng(808)
def spots_img(nx, ny, spots, s, bg, t=None):
    X, Y = np.arange(nx, dtype=float), np.arange(ny, dtype=float); mu = np.full((ny, nx), float(bg))
    for (x, y, A, w) in spots: mu = mu + A * np.exp(-L16 * ((X[None, :] - x - s[0]) ** 2 + (Y[:, None] - y - s[1]) ** 2) / (w * w))
    z = rng.poisson(mu * t) / t if t else mu
    return dict(nx=nx, ny=ny, x=dict(a=0.0, b=float(nx - 1)), y=dict(a=0.0, b=float(ny - 1)), z=[float(v) for v in z.ravel()])
def field(nx, ny, k):
    r = np.random.default_rng(k); return [(6 + r.uniform() * (nx - 12), 6 + r.uniform() * (ny - 12), 5000 + 20000 * r.uniform(), 2.5 + r.uniform()) for _ in range(12)]
F1, F2 = field(64, 48, 3), field(63, 45, 4)
cases = []
def add(name, A, B, o, s):
    cases.append(dict(name=name, A=A, B=B, o=o, s=s, want=reg(A, B, o.get("up", 100), o.get("norm", "cc"))))
add("noise-free spots moved by (0.37, −1.23) cells", spots_img(64, 48, F1, (0, 0), 2000), spots_img(64, 48, F1, (0.37, -1.23), 2000), dict(up=100), (0.37, -1.23))
add("Poisson spots moved by (0.37, −1.23) cells", spots_img(64, 48, F1, (0, 0), 2000, 0.01), spots_img(64, 48, F1, (0.37, -1.23), 2000, 0.01), dict(up=100), (0.37, -1.23))
add("odd sizes (45 × 63), the phase correlation", spots_img(63, 45, F2, (0, 0), 1000, 0.02), spots_img(63, 45, F2, (2.6, 1.15), 1000, 0.02), dict(up=100, norm="phase"), (2.6, 1.15))
add("a large shift (12.4, −7.8), to a twentieth", spots_img(64, 48, F1, (0, 0), 2000), spots_img(64, 48, F1, (12.4, -7.8), 2000), dict(up=20), (12.4, -7.8))
add("to a whole cell", spots_img(64, 48, F1, (0, 0), 2000, 0.01), spots_img(64, 48, F1, (-3.3, 2.7), 2000, 0.01), dict(up=1), (-3.3, 2.7))
# the NV scan and a back scan of it: the emitters and the background again at x − lag, its own Poisson counts
SP = json.load(open(os.path.join(here, "fixtures", "spots.json"))); A = SP["cases"][0]["m"]; truth, t = SP["scan"]["truth"], SP["scan"]["t"]
Xu, Yu = np.array(lin(12, 20, 64)), np.array(lin(-3, 5, 64)); lag = (0.063, -0.021)
mu = 1500 + 120 * (Xu[None, :] - lag[0] - 16) / 4 + 0 * Yu[:, None]
for s in truth:
    a = s["th"] * math.pi / 180; ex = Xu[None, :] - lag[0] - s["x"]; ey = Yu[:, None] - lag[1] - s["y"]
    u = ex * math.cos(a) + ey * math.sin(a); v = -ex * math.sin(a) + ey * math.cos(a)
    mu = mu + s["A"] * np.exp(-L16 * (u * u / s["w1"] ** 2 + v * v / s["w2"] ** 2))
B = dict(nx=64, ny=64, x=A["x"], y=A["y"], z=[float(q) for q in (np.random.default_rng(2612).poisson(mu * t) / t).ravel()])
step = 8 / 63; add("the NV scan and its back scan, lagging by (0.063, −0.021) µm", A, B, dict(up=100), (lag[0] / step, lag[1] / step))
for c in cases:
    w = c["want"]; print(f'{c["name"]}: ({w["sx"]:.2f}, {w["sy"]:.2f}) against ({c["s"][0]:.3f}, {c["s"][1]:.3f}), r {w["r"]:.4f}')
json.dump(dict(cases=cases, nv=dict(lag=lag, t=t)), open(os.path.join(here, "fixtures", "shift.json"), "w"), indent=0)
print("wrote fixtures/shift.json")
