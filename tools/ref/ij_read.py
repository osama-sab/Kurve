"""Reads the TIFFs Kurve wrote for ImageJ (tools/ref/ij_fixtures.mjs), two ways (ux/spec/QUDI_SPEC.md, slice Q.2):

  * Pillow, an independent TIFF reader: the size, the mode (32-bit float), every pixel's value, and the tags as written
    (ImageDescription, XResolution and YResolution as rationals, ResolutionUnit, SampleFormat);
  * ImageJ's own reading of them, its arithmetic written out from ImageJ 1.54f's source (ij/io/TiffDecoder.java,
    ij/io/FileOpener.java, ij/measure/Calibration.java): the pixel size 1.0/(n/d) of each rational, the description read
    as java.util.Properties, the unit sanitised, and each pixel's calibrated centre, getX(x + 0.5) and getY(y + 0.5,
    height) with inverty. Java's doubles and Python's are the same IEEE arithmetic, evaluated in the same order.

ImageJ itself is not run here (this environment may not run its jar); tools/ref/ij/IJRef.java prints the same readout
from ImageJ where it can be run, for comparison.

    python3.13 -I tools/ref/ij_read.py DIR      prints a JSON object {file: readout} for every .tif in DIR
"""
import json, math, os, sys
from array import array
from PIL import Image

def jprops(text):
    """java.util.Properties.load on a string: key, then '=' or ':' or white space, then the value; backslash escapes."""
    out = {}
    for raw in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw.lstrip(" \t\f")
        if not line or line[0] in "#!":
            continue
        def unesc(s):
            o, i = [], 0
            while i < len(s):
                c = s[i]
                if c == "\\" and i + 1 < len(s):
                    n = s[i + 1]
                    if n == "u" and i + 6 <= len(s):
                        o.append(chr(int(s[i + 2:i + 6], 16))); i += 6; continue
                    o.append({"t": "\t", "n": "\n", "r": "\r", "f": "\f"}.get(n, n)); i += 2; continue
                o.append(c); i += 1
            return "".join(o)
        k, i = 0, 0
        while i < len(line):
            c = line[i]
            if c == "\\":
                i += 2; continue
            if c in "=: \t\f":
                break
            i += 1
        key, rest = line[:i], line[i:]
        rest = rest.lstrip(" \t\f")
        if rest[:1] in ("=", ":"):
            rest = rest[1:].lstrip(" \t\f")
        out[unesc(key)] = unesc(rest)
    return out

def sanitize(unit):      # Calibration.sanitizeUnit
    if unit is None or unit == "":
        return "pixel"
    if unit == "um":
        return "µm"
    if unit == "A":
        return "Å"
    return unit

def jdouble(props, key):  # FileOpener.getDouble: Double.valueOf, 0.0 when missing or not a number
    s = props.get(key)
    try:
        return float(s) if s is not None else 0.0
    except ValueError:
        return 0.0

def read(path):
    im = Image.open(path)
    tags = im.tag_v2
    w, h = im.size
    desc = tags.get(270, "")
    if isinstance(desc, bytes):
        desc = desc.decode("latin-1")
    desc = desc.rstrip("\x00")
    xr, yr = tags.get(282), tags.get(283)
    rat = lambda r: [int(r.numerator), int(r.denominator)] if r is not None else None
    # the pixels as Pillow decoded them (mode F: 32-bit floats in the machine's order); NaN null, infinities as strings
    vals = [None if math.isnan(v) else ("Infinity" if v == math.inf else "-Infinity" if v == -math.inf else v) for v in array("f", im.tobytes())]
    out = {"pil": {"mode": im.mode, "w": w, "h": h, "desc": desc, "xres": rat(xr), "yres": rat(yr),
                   "resunit": tags.get(296), "format": tags.get(339), "bits": tags.get(258), "z": vals}}
    # ImageJ: TiffDecoder (rational → pixel size), FileOpener.decodeDescriptionString and setCalibration, Calibration
    if not desc.startswith("ImageJ"):
        out["ij"] = {"fail": "not an ImageJ description"}
        return out
    props = jprops(desc)
    pw = 1.0 / (xr.numerator / xr.denominator) if xr is not None and xr.denominator else 1.0
    ph = 1.0 / (yr.numerator / yr.denominator) if yr is not None and yr.denominator else pw
    unit = sanitize(props.get("unit", ""))
    yunit = sanitize(props["yunit"]) if props.get("yunit") else unit
    xo, yo = jdouble(props, "xorigin"), jdouble(props, "yorigin")
    inv = props.get("inverty", "false") == "true"
    cx = [(x + 0.5 - xo) * pw for x in range(w)]
    def gety(y):
        if inv:
            return (yo - y) * ph if yo != 0.0 else (h - y - 1) * ph
        return (y - yo) * ph
    cy = [gety(y + 0.5) for y in range(h)]
    out["ij"] = {"pw": pw, "ph": ph, "unit": unit, "yunit": yunit, "vunit": props.get("vunit"), "xo": xo, "yo": yo, "inv": inv,
                 "min": jdouble(props, "min"), "max": jdouble(props, "max"), "name": props.get("name"), "cx": cx, "cy": cy}
    return out

# ---- Measure (QUDI_SPEC Q.3): ImageJ 1.54f's arithmetic written out from its source, on the image as read ----
import numpy as np
from fractions import Fraction
from decimal import Decimal, getcontext
getcontext().prec = 50
F32 = np.float32
FLT_MAX = float(np.finfo(np.float32).max)
DMIN = 5e-324                     # Java's Double.MIN_VALUE

def jint(v):                      # Java's (int) of a double
    if v != v:
        return 0
    if v >= 2147483647:
        return 2147483647
    if v <= -2147483648:
        return -2147483648
    return int(v)                 # truncates towards zero

def oval_mask(w, h):              # ij/gui/OvalRoi.getMask
    a, b = w / 2.0, h / 2.0
    a2, b2 = a * a, b * b
    a -= 0.5; b -= 0.5
    return [[1 if ((x - a) * (x - a) / a2 + (y - b) * (y - b) / b2) <= 1.0 else 0 for x in range(w)] for y in range(h)]

def poly_mask(xpf, ypf, xoff, yoff, w, h):   # ij/process/PolygonFiller with float coordinates: fillByteProcessorMask
    n = len(xpf)
    ex, ey1, ey2, esl = [], [], [], []
    for i in range(n):
        j = 0 if i == n - 1 else i + 1
        y1f, y2f = float(ypf[i]) + yoff, float(ypf[j]) + yoff
        x1f, x2f = float(xpf[i]) + xoff, float(xpf[j]) + xoff
        y1, y2 = int(np.floor(y1f + 0.5)), int(np.floor(y2f + 0.5))     # Math.round
        if y1 == y2 or (y1 <= 0 and y2 <= 0):
            continue
        if y1 > y2:
            y1, y2 = y2, y1; y1f, y2f = y2f, y1f; x1f, x2f = x2f, x1f
        sl = (x2f - x1f) / (y2f - y1f)
        ex.append(x1f + (y1 - y1f + 0.5) * sl + 1e-8); ey1.append(y1); ey2.append(y2); esl.append(sl)
    m = [[0] * w for _ in range(h)]
    if not ex:
        return m
    ymin, ymax = min(ey1), max(ey2)
    act = []
    ystart = ymin if ymin > 0 else 0
    if ymin != 0:
        for i in range(len(ex)):
            if ey1[i] < ystart and ey2[i] >= ystart:
                ex[i] += esl[i] * (ystart - ey1[i]); act.append(i)
        act.sort(key=lambda i: ex[i])
    for y in range(ystart, min(h, ymax + 1)):
        act = [i for i in act if not (y < ey1[i] or y >= ey2[i])]
        for i in range(len(ex)):
            if y == ey1[i]:
                k = 0
                while k < len(act) and ex[i] > ex[act[k]]:
                    k += 1
                act.insert(k, i)
        for k in range(0, len(act) - 1, 2):
            x1 = jint(ex[act[k]] + 0.5); x1 = min(max(x1, 0), w)
            x2 = jint(ex[act[k + 1]] + 0.5); x2 = min(max(x2, 0), w)
            for x in range(x1, x2):
                m[y][x] = 1
        for i in act:
            ex[i] += esl[i]
        act.sort(key=lambda i: ex[i])
    return m

def roi_of(reg, ij, W, H):
    """The region as ImageJ's selection: (x, y, w, h, mask rows or None), the rectangle clipped to the image."""
    k = reg.get("kind", "all")
    if k == "all":
        return 0, 0, W, H, None, (0, 0, W, H)
    if k in ("rect", "oval"):
        xl, xh = sorted([reg["x0"], reg["x1"]]); yl, yh = sorted([reg["y0"], reg["y1"]])
        tx, ty = 1e-9 * ij["pw"], 1e-9 * ij["ph"]
        cols = [px for px in range(W) if xl - tx <= ij["cx"][px] <= xh + tx]
        rows = [py for py in range(H) if yl - ty <= ij["cy"][py] <= yh + ty]
        x0, y0, w, h = cols[0], rows[0], cols[-1] - cols[0] + 1, rows[-1] - rows[0] + 1
        return x0, y0, w, h, (oval_mask(w, h) if k == "oval" else None), (x0, y0, w, h)
    # a polygon: Calibration.getRawX/getRawY (inverty), the corners as floats, FloatPolygon's bounds, Roi.setIntBounds
    pw, ph, xo, yo = ij["pw"], ij["ph"], ij["xo"], ij["yo"]
    rx = [F32(x / pw + xo) for x, _ in reg["pts"]]
    ry = [F32((yo - y / ph) if yo != 0.0 else (H - y / ph - 1)) for _, y in reg["pts"]]
    mnx, mny, mxx, mxy = float(min(rx)), float(min(ry)), float(max(rx)), float(max(ry))
    bx, by = int(np.floor(mnx)), int(np.floor(mny))
    bw, bh = int(np.ceil(mxx)) - bx, int(np.ceil(mxy)) - by
    xpf = [F32(v - F32(mnx)) for v in rx]; ypf = [F32(v - F32(mny)) for v in ry]   # finishPolygon: xpf[i] -= (float)bounds.x
    mask = poly_mask(xpf, ypf, mnx - bx, mny - by, bw, bh)                          # getMask: offsets getXBase() - x
    x0, y0, x1, y1 = max(bx, 0), max(by, 0), min(bx + bw, W), min(by + bh, H)        # ImageProcessor.setRoi clips
    m2 = [[mask[y - by][x - bx] for x in range(x0, x1)] for y in range(y0, y1)]
    return x0, y0, x1 - x0, y1 - y0, m2, (x0, y0, x1 - x0, y1 - y0)

def axis(a, n):                   # a matrix's axis as Kurve lists it: NumPy's linspace (k*step + a, the last b exactly), or the values
    if "v" in a:
        return [float(v) for v in a["v"]]
    if n == 1:
        return [float(a["a"])]
    v = list(np.linspace(float(a["a"]), float(a["b"]), n))
    return [float(t) for t in v]

def positions(ax):               # each of ImageJ's columns' X (rising) and rows' Y (the top row the largest)
    X, Y = axis(ax["x"], ax["nx"]), axis(ax["y"], ax["ny"])
    return {"X": sorted(X), "Y": sorted(Y, reverse=True)}

def measure(vals, W, H, ij, reg, pos):
    """ImageJ's Measure ("port", its own arithmetic) and the same definitions in exact arithmetic ("exact")."""
    x0, y0, w, h, mask, (bx, by, bw, bh) = roi_of(reg, ij, W, H)
    pw, ph, xo, yo = ij["pw"], ij["ph"], ij["xo"], ij["yo"]
    getx = lambda x: (x - xo) * pw
    gety = lambda y: (yo - y) * ph if yo != 0.0 else (H - y - 1) * ph
    pix = []                                  # (x, y, value) of the selection's pixels, value a float32 or nan
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if mask is None or mask[y - y0][x - x0]:
                pix.append((x, y, vals[y * W + x]))
    cells = len(pix)
    inr = [(x, y, v) for x, y, v in pix if v == v and -FLT_MAX <= v <= FLT_MAX]
    n = len(inr)
    if not n:
        return {"fail": True, "cells": cells}
    # FloatStatistics.getStatistics
    mn = min(v for _, _, v in inr); mx = max(v for _, _, v in inr)
    nb = 256; size = (mx - mn) / nb; scale = nb / (mx - mn) if mx != mn else float("inf")
    hist = [0] * nb; s = 0.0; s2 = 0.0
    for _, _, v in inr:
        s += v; s2 += v * v
        t = scale * (v - mn) if scale != float("inf") else (float("nan") if v == mn else float("inf"))
        i = jint(t)
        if i >= nb:
            i = nb - 1
        hist[i] += 1
    mean = s / n
    sd = (n * s2 - s * s) / n
    sd = (sd / (n - 1.0)) ** 0.5 if sd > 0.0 else 0.0
    mb = 0
    for i in range(nb):
        if hist[i] > hist[mb]:
            mb = i
    mode = mn + mb * size
    if size != 1.0:
        mode += size / 2.0
    # calculateMoments
    a1 = a2 = a3 = a4 = xs = ys = 0.0
    for x, y, v0 in inr:
        v = v0 + DMIN; v2 = v * v
        a1 += v; a2 += v2; a3 += v * v2; a4 += v2 * v2; xs += x * v; ys += y * v
    m2 = mean * mean; var = a2 / n - m2; sdev = var ** 0.5 if var > 0 else float("nan")
    with np.errstate(all="ignore"):
        skew = ((a3 - 3.0 * mean * a2) / n + 2.0 * mean * m2) / (var * sdev) if var > 0 else None
        kurt = (((a4 - 4.0 * mean * a3 + 6.0 * m2 * a2) / n - 3.0 * m2 * m2) / (var * var) - 3.0) if var > 0 else None
    # getCentroid, getMedian
    cxs = sum(x for x, _, _ in inr); cys = sum(y for _, y, _ in inr)
    srt = sorted(F32(v) for _, _, v in inr); mid = n // 2
    med = float(srt[mid]) if n % 2 else float(F32(F32(srt[mid - 1] + srt[mid]) / F32(2)))
    area = n * pw * ph
    port = {"cells": cells, "n": n, "area": area, "mean": mean, "sd": sd, "mode": mode, "min": mn, "max": mx,
            "x": getx(cxs / n + 0.5), "y": gety(cys / n + 0.5), "xm": getx(xs / a1 + 0.5), "ym": gety(ys / a1 + 0.5),
            "bx": getx(bx), "by": gety(by), "w": bw * pw, "h": bh * ph, "intden": area * mean, "raw": n * mean,
            "median": med, "skew": skew, "kurt": kurt, "hist": hist, "start": mn, "size": size, "roi": [x0, y0, w, h]}
    # the same definitions exactly: the values as the float32s they are, the positions as Kurve's (NumPy's linspace)
    V = [Fraction(v) for _, _, v in inr]; Px = [Fraction(pos["X"][x]) for x, _, _ in inr]; Py = [Fraction(pos["Y"][y]) for _, y, _ in inr]
    M = sum(V) / n; D = [v - M for v in V]
    q2 = sum(d * d for d in D); q3 = sum(d * d * d for d in D); q4 = sum(d ** 4 for d in D)
    dec = lambda f: Decimal(f.numerator) / Decimal(f.denominator)
    sq = lambda f: dec(f).sqrt()
    ex = {"mean": float(M), "sd": float(sq(q2 / (n - 1))) if n > 1 else 0.0,
          "skew": float(dec(q3 / n) / (dec(q2 / n) * sq(q2 / n))) if q2 > 0 else None,
          "kurt": float((q4 / n) / ((q2 / n) ** 2) - 3) if q2 > 0 else None,
          "x": float(sum(Px) / n), "y": float(sum(Py) / n), "raw": float(sum(V)),
          "xm": float(sum(p * v for p, v in zip(Px, V)) / sum(V)) if sum(V) != 0 else None,
          "ym": float(sum(p * v for p, v in zip(Py, V)) / sum(V)) if sum(V) != 0 else None}
    return {"port": port, "exact": ex}

if __name__ == "__main__":
    d = sys.argv[1]
    out = {f: read(os.path.join(d, f)) for f in sorted(os.listdir(d)) if f.endswith(".tif")}
    jp = os.path.join(d, "jobs.json")
    if os.path.exists(jp):            # regions to measure: {file: {"ax": {x, y, nx, ny} (the matrix's axes), "regs": [...]}}
        jobs = json.load(open(jp))
        for f, jb in jobs.items():
            r = out[f]; W, H = r["pil"]["w"], r["pil"]["h"]
            vals = [float("nan") if v is None else (math.inf if v == "Infinity" else -math.inf if v == "-Infinity" else v) for v in r["pil"]["z"]]
            r["meas"] = [measure(vals, W, H, r["ij"], reg, positions(jb["ax"])) for reg in jb["regs"]]
    print(json.dumps(out))
