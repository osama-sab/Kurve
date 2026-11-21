"""ImageJ's Analyze Particles on a 32-bit image (IMAGE_SPEC I.6): the reference for Kurve's ijParticles, written again from ImageJ
1.54f's source (read as text; ImageJ itself is not run here), into fixtures/ij-particles.json.

  ij.plugin.filter.ParticleAnalyzer  the scan row by row, a particle from its first cell (value >= level1 && value <= level2, in
                                     doubles), its outline, mask, statistics, the edge, circularity and size filters, and the fill
                                     with -Float.MAX_VALUE (its own cells, or the whole outline when holes are included)
  ij.gui.Wand                        autoOutline in threshold and legacy mode: traceEdge 8-connected, the thresholds as floats
  ij.process.PolygonFiller           the outline's mask: the cells whose centres are inside
  ij.process.FloodFiller             particleAnalyzerFill: the 8-connected cells from the first, on a copy of the image
  ij.gui.PolygonRoi                  getTracedPerimeter
  ij.process.EllipseFitter           getEllipseParam, computeSums, getMoments (ImageStatistics.fitEllipse: scaled by the pixel
                                     width when the pixels are square to 1 %, else 0)
  ij.process.FloatPolygon            getConvexHull;  ij.gui.Roi getFeretValues;  ij.plugin.filter.Analyzer getArea, the
                                     circularity, AR, Round and Solidity

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/ij_particles.py   (writes fixtures/ij-particles.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
F = np.float32
FILL = float(-np.finfo(np.float32).max)

def wand(px, W, H, startX, startY, lower, upper):
    lo = float(F(lower)); up = float(F(upper))          # (float)lower, (float)upper
    def inside(x, y):
        if x < 0 or x >= W or y < 0 or y >= H: return False
        v = px[y * W + x]
        return v >= lo and v <= up
    def inside_d(x, y, d):
        d &= 3
        if d == 0: return inside(x, y)
        if d == 1: return inside(x, y - 1)
        if d == 2: return inside(x - 1, y - 1)
        return inside(x - 1, y)
    x = startX; y = startY
    if not inside(x, y): return None
    while True:
        x += 1
        if not inside(x, y): break
    # traceEdge(x, y, fourConnected=false)
    xp = []; yp = []
    sx, sy = x, y
    if inside(sx, sy): sd = 1
    else: sd = 3; sy += 1
    x, y, d = sx, sy, sd
    while True:
        nd = d + 1
        while True:
            if inside_d(x, y, nd): break
            nd -= 1
            if not (nd >= d): break
        if nd != d: xp.append(x); yp.append(y)
        k = nd & 3
        if k == 0: x += 1
        elif k == 1: y -= 1
        elif k == 2: x -= 1
        else: y += 1
        d = nd
        if not (x != sx or y != sy or (d & 3) != sd): break
    if xp[0] != x: xp.append(x); yp.append(y)
    return xp, yp

def polygon_mask(xp, yp, bx, by, w, h):                 # PolygonFiller: centres inside (none lies on an edge of a traced outline)
    n = len(xp); mask = [0] * (w * h)
    for j in range(h):
        cy = by + j + 0.5
        for i in range(w):
            cx = bx + i + 0.5; inside = False
            for k in range(n):
                x1, y1, x2, y2 = xp[k], yp[k], xp[(k + 1) % n], yp[(k + 1) % n]
                if (y1 > cy) != (y2 > cy) and cx < x1 + (cy - y1) * (x2 - x1) / (y2 - y1): inside = not inside
            if inside: mask[j * w + i] = 1
    return mask

def flood_mask(ipf, W, H, x, y, level1, level2, bx, by, w, h):
    mask = [0] * (w * h)
    def inp(xx, yy): v = ipf[yy * W + xx]; return v >= level1 and v <= level2
    stack = [(x, y)]
    while stack:
        x, y = stack.pop()
        if not inp(x, y): continue
        x1 = x; x2 = x
        while x1 >= 0 and inp(x1, y): x1 -= 1
        x1 += 1
        while x2 < W and inp(x2, y): x2 += 1
        x2 -= 1
        for i in range(x1, x2 + 1): mask[(y - by) * w + (i - bx)] = 1; ipf[y * W + i] = FILL
        if x1 > 0: x1 -= 1
        if x2 < W - 1: x2 += 1
        on = False
        for i in range(x1, x2 + 1):
            if not on and y > 0 and inp(i, y - 1): stack.append((i, y - 1)); on = True
            elif on and y > 0 and not inp(i, y - 1): on = False
        on = False
        for i in range(x1, x2 + 1):
            if not on and y < H - 1 and inp(i, y + 1): stack.append((i, y + 1)); on = True
            elif on and y < H - 1 and not inp(i, y + 1): on = False
    return mask

def traced_perimeter(xp, yp, w, h):
    n = len(xp)
    if n < 4: return 0.0
    sumdx = 0; sumdy = 0; nCorners = 0
    dx1 = xp[0] - xp[n - 1]; dy1 = yp[0] - yp[n - 1]; side1 = abs(dx1) + abs(dy1); corner = False
    for i in range(n):
        nexti = i + 1
        if nexti == n: nexti = 0
        dx2 = xp[nexti] - xp[i]; dy2 = yp[nexti] - yp[i]
        sumdx += abs(dx1); sumdy += abs(dy1)
        side2 = abs(dx2) + abs(dy2)
        if side1 > 1 or not corner: corner = True; nCorners += 1
        else: corner = False
        dx1 = dx2; dy1 = dy2; side1 = side2
    return sumdx * w + sumdy * h - (nCorners * ((w + h) - math.sqrt(w * w + h * h)))

def ellipse(mask, width, height, left, top):
    HALFPI = 1.5707963267949; sqrtPi = 1.772453851
    if mask is None:
        major = (width * 2) / sqrtPi; minor = (height * 2) / sqrtPi; angle = 0.0
        if major < minor: major, minor = minor, major; angle = 90.0
        return major, minor, angle
    xsum = ysum = x2sum = y2sum = xysum = 0.0; bitCount = 0
    for y in range(height):
        bl = 0; xs = 0
        for x in range(width):
            if mask[y * width + x] != 0: bl += 1; xs += x; x2sum += x * x
        xsum += xs; ysum += bl * y; ye = float(y); xe = float(xs); xysum += xe * ye; y2sum += ye * ye * bl; bitCount += bl
    u20 = u02 = u11 = 0.0
    if bitCount:
        x2sum += 0.08333333 * bitCount; y2sum += 0.08333333 * bitCount; n = float(bitCount)
        x1 = xsum / n; y1 = ysum / n; x2 = x2sum / n; y2 = y2sum / n; xy = xysum / n
        u20 = x2 - (x1 * x1); u02 = y2 - (y1 * y1); u11 = xy - x1 * y1
    m4 = 4.0 * abs(u02 * u20 - u11 * u11)
    if m4 < 0.000001: m4 = 0.000001
    a11 = u02 / m4; a12 = u11 / m4; a22 = u20 / m4
    tmp = a11 - a22
    if tmp == 0.0: tmp = 0.000001
    theta = 0.5 * math.atan(2.0 * a12 / tmp)
    if theta < 0.0: theta += HALFPI
    if a12 > 0.0: theta += HALFPI
    elif a12 == 0.0:
        if a22 > a11: theta = 0.0; tmp = a22; a22 = a11; a11 = tmp
        elif a11 != a22: theta = HALFPI
    tmp = math.sin(theta)
    if tmp == 0.0: tmp = 0.000001
    z = a12 * math.cos(theta) / tmp
    major = math.sqrt(1.0 / abs(a22 + z)); minor = math.sqrt(1.0 / abs(a11 - z))
    scale = math.sqrt(bitCount / (math.pi * major * minor))
    major = major * scale * 2.0; minor = minor * scale * 2.0
    angle = 180.0 * theta / math.pi
    if angle == 180.0: angle = 0.0
    if major < minor: major, minor = minor, major
    return major, minor, angle

def convex_hull(xp, yp):
    n = len(xp); xx = []; yy = []
    smallestY = min(yp); smallestX = float("inf"); p1 = 0
    for i in range(n):
        if yp[i] == smallestY and xp[i] < smallestX: smallestX = xp[i]; p1 = i
    pstart = p1
    while True:
        x1 = float(xp[p1]); y1 = float(yp[p1]); p2 = p1; x2 = y2 = 0.0
        while True:
            p2 += 1
            if p2 == n: p2 = 0
            if p2 == p1: break
            x2 = float(xp[p2]); y2 = float(yp[p2])
            if not (x2 == x1 and y2 == y1): break
        p3 = p2 + 1
        if p3 == n: p3 = 0
        if p2 != p1:
            while True:
                x3 = float(xp[p3]); y3 = float(yp[p3])
                det = x1 * (y2 - y3) - y1 * (x2 - x3) + (y3 * x2 - y2 * x3)
                further = False
                if det == 0 and p3 != p2: further = (x3 - x1) ** 2 + (y3 - y1) ** 2 > (x2 - x1) ** 2 + (y2 - y1) ** 2
                if det > 0 or further: x2 = x3; y2 = y3; p2 = p3
                p3 += 1
                if p3 == n: p3 = 0
                if p3 == p1: break
        xx.append(x1); yy.append(y1)
        if p2 == p1: break
        p1 = p2
        if len(xx) > 1 and xp[p1] == xx[0] and yp[p1] == yy[0]: break
        if p1 == pstart: break
    return xx, yy

def feret(hx, hy, pw, ph):
    n = len(hx); p1 = p2 = 0; dsq = 0.0
    for i in range(n):
        for j in range(i + 1, n):
            dx = (hx[i] - hx[j]) * pw; dy = (hy[i] - hy[j]) * ph; d = dx * dx + dy * dy
            if d > dsq: dsq = d; p1 = i; p2 = j
    if hx[p1] > hx[p2]: p1, p2 = p2, p1
    xf1, yf1, xf2, yf2 = hx[p1], hy[p1], hx[p2], hy[p2]
    angle = (180.0 / math.pi) * math.atan2((yf1 - yf2) * ph, (xf2 - xf1) * pw)
    if angle < 0.0: angle += 180.0
    x0 = hx[n - 1]; y0 = hy[n - 1]; minF = sys.float_info.max
    for i in range(n):
        xprev, yprev = x0, y0; x0 = hx[i]; y0 = hy[i]
        xn = (y0 - yprev) * ph; yn = (xprev - x0) * pw
        nf = 1 / math.sqrt(xn * xn + yn * yn); xn *= nf * pw; yn *= nf * ph
        md = 0.0
        for j in range(n):
            dist = (hx[j] - x0) * xn + (hy[j] - y0) * yn
            if dist > md: md = dist
        if md < minF: minF = md
    return math.sqrt(dsq), angle, minF, xf1, yf1

def int_area(hx, hy):
    c = 0; n = len(hx)
    for i in range(n):
        j = n - 1 if i - 1 < 0 else i - 1
        c += (round(hx[i]) + round(hx[j])) * (round(hy[i]) - round(hy[j]))
    return abs(c / 2.0)

def analyze(case, p):
    nx, ny, pw, ph = case["nx"], case["ny"], case["pw"], case["ph"]; W, H = nx, ny
    # ImageJ's image: the top row the largest Y (Y and X rising in these cases), each value float32, an empty cell NaN
    px = []
    for py in range(H):
        r = H - 1 - py
        for qx in range(W):
            v = case["z"][r * nx + qx]; px.append(float("nan") if v is None else float(F(v)))
    vals = list(px); level1, level2 = p["lo"], p["hi"]
    ipf = None if p.get("holes") else list(px)
    mins = p.get("min", 0); maxs = p.get("max", float("inf")); cmin = p.get("cmin", 0.0); cmax = p.get("cmax", 1.0)
    rows = []
    for y in range(H):
        for x in range(W):
            value = px[y * W + x]
            if not (value >= level1 and value <= level2): continue
            o = wand(px, W, H, x, y, level1, level2)
            xp, yp = o
            bx, by = min(xp), min(yp); w = max(xp) - bx; h = max(yp) - by
            mask = None
            if w > 1 and h > 1:
                mask = polygon_mask(xp, yp, bx, by, w, h)
                if ipf is not None: mask = flood_mask(ipf, W, H, x, y, level1, level2, bx, by, w, h)
            inmask = [(xx, yy) for yy in range(h) for xx in range(w) if mask is None or mask[yy * w + xx]]
            cells = [(xx, yy) for (xx, yy) in inmask if not math.isnan(vals[(by + yy) * W + bx + xx])]   # FloatStatistics: NaN left out
            count = len(cells)
            include = True
            if p.get("exclude") and (bx == 0 or by == 0 or bx + w == W or by + h == H): include = False
            if include and (cmin > 0.0 or cmax != 1.0):
                pr = traced_perimeter(xp, yp, 1.0, 1.0); c = 0.0 if pr == 0.0 else 4.0 * math.pi * (count / (pr * pr))
                if c > 1.0 and cmax <= 1.0: c = 1.0
                if c < cmin or c > cmax: include = False
            if include and count >= mins and count <= maxs:
                vs = [vals[(by + yy) * W + bx + xx] for (xx, yy) in cells]
                area = count * pw * ph
                perim = traced_perimeter(xp, yp, pw, ph)
                mj, mn, ang = ellipse(mask, w, h, bx, by)
                ps = pw if abs(pw - ph) / pw < .01 else 0.0
                major = mj * ps; minor = mn * ps
                hx, hy = convex_hull([float(q) for q in xp], [float(q) for q in yp])
                fd, fa, fmin, fx, fy = feret(hx, hy, pw, ph)
                circ = 0.0 if perim == 0.0 else 4.0 * math.pi * (area / (perim * perim))
                if circ > 1.0: circ = 1.0
                xo = 0.5 - case["x0"] / pw; yo = case["y1"] / ph + 0.5     # ijGeom's origins (xorigin, yorigin)
                X = [(bx + xx + 0.5 - xo) * pw for (xx, yy) in cells]; Y = [(yo - (by + yy) - 0.5) * ph for (xx, yy) in cells]
                rows.append({"cells": count, "bx": bx, "by": by, "w": w, "h": h, "area": area, "mean": math.fsum(vs) / count, "min": min(vs), "max": max(vs),
                             "x": math.fsum(X) / count, "y": math.fsum(Y) / count, "perim": perim, "major": major, "minor": minor, "angle": ang, "circ": circ,
                             "feret": fd, "feretangle": fa, "minferet": fmin, "feretx": fx, "ferety": fy,
                             "ar": major / minor if minor != 0 else None, "round": 4.0 * area / (math.pi * major * major) if major != 0 else None,
                             "solidity": count / int_area(hx, hy)})
            if mask is None:
                for yy in range(h):
                    for xx in range(w): px[(by + yy) * W + bx + xx] = FILL
            else:
                for yy in range(h):
                    for xx in range(w):
                        if mask[yy * w + xx]: px[(by + yy) * W + bx + xx] = FILL
    return rows

def main():
    rng = np.random.default_rng(20251121)
    cases = []
    def add(name, nx, ny, z, pw, ph, ops, x0=0.0, y0=0.0):
        cases.append({"name": name, "nx": nx, "ny": ny, "z": z, "pw": pw, "ph": ph, "x0": x0, "y1": y0 + (ny - 1) * ph,
                      "xs": [x0 + i * pw for i in range(nx)], "ys": [y0 + i * ph for i in range(ny)], "ops": ops})
    # 1. shapes: a ring with a particle in its hole, a diagonal line, a pixel, an ellipse, one on the edge
    W, H = 30, 24; z = [1.0] * (W * H)
    def put(x, y, v): z[(H - 1 - y) * W + x] = v
    for y in range(3, 10):
        for x in range(3, 10):
            d = math.hypot(x - 6, y - 6)
            if 1.5 <= d <= 3.2: put(x, y, 10.0)
    put(6, 6, 12.0)
    for i in range(6): put(15 + i, 2 + i, 9.0)
    put(25, 20, 11.0)
    for x in range(4): put(x, 20, 8.0)
    for y in range(12, 20):
        for x in range(10, 20):
            if (x - 14) ** 2 / 16 + (y - 15) ** 2 / 6 <= 1: put(x, y, float(7 + (x * y) % 3))
    base = [{"lo": 5.0, "hi": 1e30}, {"lo": 5.0, "hi": 1e30, "holes": True}, {"lo": 5.0, "hi": 1e30, "exclude": True}, {"lo": 5.0, "hi": 1e30, "holes": True, "exclude": True},
            {"lo": 5.0, "hi": 1e30, "min": 2, "max": 30}, {"lo": 5.0, "hi": 1e30, "cmin": 0.5, "cmax": 1.0}, {"lo": 8.5, "hi": 10.5}, {"lo": -1e30, "hi": 1.5}]
    add("shapes", W, H, z, 0.5, 0.5, base)
    # 2. confocal spots: Poisson counts, thresholded from above at three levels
    nx, ny = 48, 40; lam = np.full((ny, nx), 3.0); yy, xx = np.mgrid[0:ny, 0:nx]
    for k in range(14):
        cx, cy, a, s = rng.uniform(-2, nx + 2), rng.uniform(-2, ny + 2), rng.uniform(30, 120), rng.uniform(1.5, 3.5)
        lam += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * s * s))
    z = [float(v) for v in rng.poisson(lam).ravel()]
    add("spots", nx, ny, z, 0.125, 0.125, [{"lo": 25.0, "hi": 1e30}, {"lo": 40.0, "hi": 1e30, "exclude": True}, {"lo": 15.0, "hi": 1e30, "holes": True, "min": 3},
                                            {"lo": 25.0, "hi": 1e30, "cmin": 0.7}], x0=-3.0, y0=1.25)
    # 3. a smoothed random field: shapes with holes and particles inside them
    nx, ny = 56, 44; f = rng.normal(0, 1, (ny + 6, nx + 6))
    k = np.ones((5, 5)) / 25; g = np.zeros((ny, nx))
    for dy in range(5):
        for dx in range(5): g += f[dy:dy + ny, dx:dx + nx] / 25
    z = [round(float(v), 5) for v in g.ravel()]
    add("field", nx, ny, z, 0.25, 0.25, [{"lo": 0.15, "hi": 1e30}, {"lo": 0.15, "hi": 1e30, "holes": True}, {"lo": -1e30, "hi": -0.1}, {"lo": -0.2, "hi": 0.2, "exclude": True}])
    # 4. cells not square: 2 by 0.5 (ImageJ gives Major and Minor as 0), and empty cells
    z2 = list(z[: 30 * 25]);
    for i in range(0, 30 * 25, 37): z2[i] = None
    add("not square", 30, 25, z2, 2.0, 0.5, [{"lo": 0.1, "hi": 1e30}, {"lo": 0.1, "hi": 1e30, "holes": True}])
    for c in cases: c["want"] = [analyze(c, p) for p in c["ops"]]
    path = os.path.join(here, "fixtures", "ij-particles.json")
    with open(path, "w") as fh: json.dump({"about": "ImageJ 1.54f's Analyze Particles on 32-bit images, written again from its source (tools/ref/ij_particles.py)", "cases": cases}, fh, separators=(",", ":"))
    print(f"wrote {path}: {len(cases)} images, {sum(len(c['ops']) for c in cases)} analyses, {sum(len(w) for c in cases for w in c['want'])} particles")

if __name__ == "__main__": main()
