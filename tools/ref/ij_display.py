"""ImageJ's display of a 32-bit image (IMAGE_SPEC I.3): the reference for Kurve's ijLut, ij8, ijHist, ijAuto, ijEnhance and the
Brightness and Contrast sliders, written again from ImageJ 1.54f's source (read as text; ImageJ itself is not run here) with NumPy's
float32 wherever Java computes in float, into fixtures/ij-display.json.

  ij.plugin.LutLoader            fire, ice (32 entries and interpolate), grays, spectrum (java.awt.Color.HSBtoRGB), 3-3-2 RGB,
                                 primaryColor, redGreen; HiLo (grays, 0 blue, 255 red); Invert LUT reverses the entries
  ij.process.FloatProcessor      create8BitImage: (int)((v − min)·255/(max − min) + 0.5), below 0 as 0, past 255 as 255
  ij.process.FloatStatistics     256 bins from min to max, (int)(256/(max − min)·(v − min)), the last bin taking max; NaN left out
  ij.plugin.frame.ContrastAdjuster  autoAdjust (5000 halved each press, back to 5000 below 10; bins past a tenth ignored), the
                                 sliders' range, places and adjustMin/Max/Brightness/Contrast
  ij.plugin.ContrastEnhancer     getMinAndMax with saturated %, the bins' lower edges

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/ij_display.py   (reads fixtures/spots.json, writes fixtures/ij-display.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
f32 = np.float32

def jint(x):                       # Java's (int) of a double: toward zero, NaN 0, saturated
    if x != x: return 0
    if x >= 2147483647: return 2147483647
    if x <= -2147483648: return -2147483648
    return int(x)

def hsb(h):                        # java.awt.Color.HSBtoRGB(h, 1f, 1f)
    hh = (h - f32(math.floor(h))) * f32(6.0); fr = hh - f32(math.floor(hh))
    br, sat = f32(1.0), f32(1.0)
    p = br * (f32(1.0) - sat); q = br * (f32(1.0) - sat * fr); t = br * (f32(1.0) - (sat * (f32(1.0) - fr)))
    c = lambda v: jint(float(f32(v * f32(255.0)) + f32(0.5)))
    return {0: (c(br), c(t), c(p)), 1: (c(q), c(br), c(p)), 2: (c(p), c(br), c(t)), 3: (c(p), c(q), c(br)), 4: (c(t), c(p), c(br)), 5: (c(br), c(p), c(q))}[int(hh)]

FIRE = ([0,0,1,25,49,73,98,122,146,162,173,184,195,207,217,229,240,252,255,255,255,255,255,255,255,255,255,255,255,255,255,255],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,14,35,57,79,101,117,133,147,161,175,190,205,219,234,248,255,255,255,255],
        [0,61,96,130,165,192,220,227,210,181,151,122,93,64,35,5,0,0,0,0,0,0,0,0,0,0,0,35,98,160,223,255])
ICE = ([0,0,0,0,0,0,19,29,50,48,79,112,134,158,186,201,217,229,242,250,250,250,250,251,250,250,250,250,251,251,243,230],
       [156,165,176,184,190,196,193,184,171,162,146,125,107,93,81,87,92,97,95,93,93,90,85,69,64,54,47,35,19,0,4,0],
       [140,147,158,166,170,176,209,220,234,225,236,246,250,251,250,250,245,230,230,222,202,180,163,142,123,114,106,94,84,64,26,27])
byte = lambda v: v & 255           # (byte) then read back with & 255

def lut(name):
    R, G, B = [0] * 256, [0] * 256, [0] * 256; n = 0
    if name in ("fire", "ice"):
        T = FIRE if name == "fire" else ICE
        for i in range(32): R[i], G[i], B[i] = T[0][i], T[1][i], T[2][i]
        n = 32
    elif name in ("grays", "hilo"):
        for i in range(256): R[i] = G[i] = B[i] = i
        n = 256
    elif name == "spectrum":
        for i in range(256): R[i], G[i], B[i] = hsb(f32(i) / f32(255)); n = 256
    elif name == "332":
        for i in range(256): R[i], G[i], B[i] = byte(i & 0xe0), byte((i << 3) & 0xe0), byte((i << 6) & 0xc0)
        n = 256
    elif name in ("red", "green", "blue", "cyan", "magenta", "yellow"):
        col = dict(red=4, green=2, blue=1, cyan=3, magenta=5, yellow=6)[name]
        for i in range(256):
            if col & 4: R[i] = i
            if col & 2: G[i] = i
            if col & 1: B[i] = i
        n = 256
    elif name == "redgreen":
        for i in range(128): R[i], G[i], B[i] = byte(i * 2), 0, 0
        for i in range(128, 256): R[i], G[i], B[i] = 0, byte(i * 2), 0
        n = 256
    if n < 256:                    # LutLoader.interpolate
        r, g, b = R[:n], G[:n], B[:n]; scale = n / 256.0
        for i in range(256):
            i1 = jint(i * scale); i2 = i1 + 1
            if i2 == n: i2 = n - 1
            fr = i * scale - i1
            R[i] = byte(jint((1.0 - fr) * r[i1] + fr * r[i2])); G[i] = byte(jint((1.0 - fr) * g[i1] + fr * g[i2])); B[i] = byte(jint((1.0 - fr) * b[i1] + fr * b[i2]))
    if name == "hilo": R[0], G[0], B[0] = 0, 0, 255; R[255], G[255], B[255] = 255, 0, 0
    return [v for i in range(256) for v in (R[i], G[i], B[i])]

def floats(z): return [float(f32(v)) for v in z if v is not None and np.isfinite(f32(v))]

def stats(z):                      # FloatStatistics with nBins 256
    F = floats(z)
    if not F: return dict(n=0, min=0.0, max=0.0, binSize=0.0, counts=[0] * 256)
    lo, hi = min(F), max(F); scale = 256 / (hi - lo) if hi > lo else math.inf; C = [0] * 256
    for v in F:
        k = jint(scale * (v - lo)) if hi > lo else 0
        if k >= 256: k = 255
        C[k] += 1
    return dict(n=len(F), min=lo, max=hi, binSize=(hi - lo) / 256, counts=C)

def index8(z, mn, mx):             # create8BitImage, a cell at a time (None for an empty one, which ImageJ holds as NaN: 0)
    sc = 255.0 / (mx - mn) if mx != mn else math.inf; out = []
    for v in z:
        if v is None: out.append(None); continue
        d = float(f32(v)) - mn
        if d < 0: d = 0.0
        t = d * sc + 0.5 if not (d == 0 and sc == math.inf) else math.nan
        k = jint(t)
        out.append(255 if k > 255 else k)
    return out

def auto(H, presses):              # ContrastAdjuster.autoAdjust, pressed again and again
    out, a = [], 0
    for _ in range(presses):
        a = 5000 if a < 10 else a // 2
        if not H["n"]: out.append(None); continue
        limit, th, C = H["n"] // 10, H["n"] // a, H["counts"]
        i = -1
        while True:
            i += 1; c = C[i]
            if c > limit: c = 0
            if c > th or i >= 255: break
        h0 = i; i = 256
        while True:
            i -= 1; c = C[i]
            if c > limit: c = 0
            if c > th or i <= 0: break
        h1 = i
        if h1 >= h0:
            mn, mx = H["min"] + h0 * H["binSize"], H["min"] + h1 * H["binSize"]
            if mn == mx: mn, mx = H["min"], H["max"]
            out.append([mn, mx, a])
        else: out.append(None)
    return out

def enhance(H, sat):               # ContrastEnhancer.getMinAndMax and stretchHistogram
    if not H["n"]: return None
    th = jint(H["n"] * sat / 200.0) if sat > 0 else 0; C = H["counts"]
    i, cnt = -1, 0
    while True:
        i += 1; cnt += C[i]
        if cnt > th or i >= 255: break
    h0 = i; i, cnt = 256, 0
    while True:
        i -= 1; cnt += C[i]
        if cnt > th or i <= 0: break
    h1 = i
    return [H["min"] + h0 * H["binSize"], H["min"] + h1 * H["binSize"]] if h1 > h0 else None

def srange(dmin, dmax, mn, mx):    # ContrastAdjuster's slider range for a 16- or 32-bit image
    vr = jint(dmax - dmin); r = vr
    if 640 < r < 1280: r = r // 2
    elif r >= 1280: r = r // 5
    if r < 256: r = 256
    if r > 1024: r = 1024
    if vr >= 1280 and vr != 0 and (mx - mn) / vr < 0.25: r = jint(r * 1.6666)
    return r

def places(dmin, dmax, mn, mx, sr):  # updateScrollBars and scaleDown
    mid = sr / 2; c = ((dmax - dmin) / (mx - mn)) * mid
    if c > mid: c = sr - ((mx - mn) / (dmax - dmin)) * mid
    def down(v):
        v = dmin if v < dmin else dmax if v > dmax else v
        return jint((v - dmin) * (sr - 1.0) / (dmax - dmin))
    return dict(min=down(mn), max=down(mx), brightness=jint((1.0 - (mn + (mx - mn) / 2.0 - dmin) / (dmax - dmin)) * sr), contrast=jint(c))

def setk(k, v, dmin, dmax, mn, mx, sr):   # adjustMin, adjustMax, adjustBrightness, adjustContrast
    if k == "min":
        mn = dmin + v * (dmax - dmin) / (sr - 1.0)
        if mx > dmax: mx = dmax
        if mn > mx: mx = mn
    elif k == "max":
        mx = dmin + v * (dmax - dmin) / (sr - 1.0)
        if mn < dmin: mn = dmin
        if mx < mn: mn = mx
    elif k == "brightness":
        c = dmin + (dmax - dmin) * ((sr - v) / sr); w = mx - mn; mn, mx = c - w / 2.0, c + w / 2.0
    else:
        c = mn + (mx - mn) / 2.0; mid = sr / 2; sl = v / mid if v <= mid else mid / (sr - v)
        if sl > 0: mn, mx = c - (0.5 * (dmax - dmin)) / sl, c + (0.5 * (dmax - dmin)) / sl
    return [mn, mx]

rng = np.random.default_rng(1120)
SP = json.load(open(os.path.join(here, "fixtures", "spots.json")))
cases = []
def add(name, z, nx, ny):
    H = stats(z); dmin, dmax = H["min"], H["max"] if H["max"] > H["min"] else H["min"] + 1
    shown = [[dmin, dmax], [dmin + 0.2 * (dmax - dmin), dmin + 0.7 * (dmax - dmin)], [dmin + 0.45 * (dmax - dmin), dmin + 0.46 * (dmax - dmin)]]
    sl = []
    for mn, mx in shown:
        sr = srange(dmin, dmax, mn, mx); pl = places(dmin, dmax, mn, mx, sr)
        sets = [[k, v, setk(k, v, dmin, dmax, mn, mx, sr)] for k in ("min", "max", "brightness", "contrast") for v in (0, 1, sr // 3, sr // 2, sr - 2, sr - 1)]
        sl.append(dict(shown=[mn, mx], sr=sr, places=pl, sets=sets))
    cases.append(dict(name=name, nx=nx, ny=ny, z=z, hist=H, idx=index8(z, H["min"], H["max"]) if H["n"] else None,
                      idx2=index8(z, shown[1][0], shown[1][1]) if H["n"] else None, shown2=shown[1],
                      auto=auto(H, 12), enh=[[s, enhance(H, s)] for s in (0, 0.35, 1, 5, 49.9)], sliders=sl))
nv = SP["cases"][0]["m"]; add("the NV scan (64 × 64, counts a second)", nv["z"], nv["nx"], nv["ny"])
z = [None if rng.uniform() < 0.08 else float(v) for v in rng.normal(-3, 2.5, 30 * 20)]; add("empty cells and values below zero (30 × 20)", z, 30, 20)
add("one value everywhere", [7.25] * 48, 8, 6)
z = [float(v) for v in rng.lognormal(8, 2.5, 50 * 40)]; add("a range of millions, few bright cells (50 × 40)", z, 50, 40)
z = [700 + 800 * u for u in rng.uniform(size=33 * 17)]; add("a range of 800 (33 × 17): the sliders' range halved", z, 33, 17)
z = [k / 3 for k in range(-40, 41)] + [None] * 4; add("thirds, which single precision rounds (85 cells)", z, 17, 5)
z = [float(v) for v in rng.poisson(3, 40 * 40)]; add("small counts: many cells in few bins (40 × 40)", z, 40, 40)
add("every cell empty", [None] * 12, 4, 3)
names = ["grays", "fire", "ice", "spectrum", "332", "red", "green", "blue", "cyan", "magenta", "yellow", "redgreen", "hilo"]
out = dict(luts={k: lut(k) for k in names}, cases=cases)
json.dump(out, open(os.path.join(here, "fixtures", "ij-display.json"), "w"), separators=(",", ":"))
for c in cases: print(f'{c["name"]}: n {c["hist"]["n"]}, auto {c["auto"][:3]}, enhance 0.35 {c["enh"][1][1]}')
print("wrote fixtures/ij-display.json")
