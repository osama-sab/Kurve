"""ImageJ's automatic threshold of a 32-bit image (IMAGE_SPEC I.6): the reference for Kurve's ijAutoThreshold and ijThreshold,
written again from ImageJ 1.54f's source (read as text; ImageJ itself is not run here), into fixtures/ij-threshold.json.

  ij.process.AutoThresholder         its sixteen methods on a 256-bin histogram and bilevel; Java's int arithmetic where it has it
                                     (IsoData's sums and integer division, MinError's i·count and i·i·count, wrapping past 2³¹), and
                                     IEEE doubles elsewhere (numpy.float64, so a log of 0 is −∞ and 1/0 is ∞, as in Java)
  ij.process.ImageProcessor          setAutoThreshold(Method, dark, lut) for a FloatProcessor: resetMinAndMax, convertToByte(true)
                                     (FloatProcessor.create8BitImage), the byte histogram, and scaleAndSetThreshold
  Kurve's own (decision 10)          the empty cells left out of the histogram ("skip")

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/ij_threshold.py   (writes fixtures/ij-threshold.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
D = np.float64
np.seterr(all="ignore")
DMAX = sys.float_info.max; DMIN = 5e-324                # Double.MAX_VALUE, Double.MIN_VALUE

def jcast(x):                                           # Java's (int) of a double
    x = float(x)
    if x != x: return 0
    if x >= 2147483647: return 2147483647
    if x <= -2147483648: return -2147483648
    return int(x)
def i32(x): x &= 0xffffffff; return x - (1 << 32) if x >= (1 << 31) else x
def jround(x):                                          # Java's Math.round of a double
    x = float(x)
    if x != x: return 0
    return int(math.floor(x + 0.5))
def jdiv(a, b):                                         # Java's int division: toward zero
    q = abs(a) // abs(b); return q if (a >= 0) == (b > 0) else -q

def bimodal(y):
    modes = 0
    for k in range(1, len(y) - 1):
        if y[k - 1] < y[k] and y[k + 1] < y[k]:
            modes += 1
            if modes > 2: return False
    return modes == 2

def huang(data):
    first_bin = 0
    for ih in range(256):
        if data[ih] != 0: first_bin = ih; break
    last_bin = 255
    for ih in range(255, first_bin - 1, -1):
        if data[ih] != 0: last_bin = ih; break
    term = D(1.0) / D(last_bin - first_bin)
    mu_0 = [D(0)] * 256; sum_pix = D(0); num_pix = D(0)
    for ih in range(first_bin, 256):
        sum_pix += D(ih) * data[ih]; num_pix += data[ih]; mu_0[ih] = sum_pix / num_pix
    mu_1 = [D(0)] * 256; sum_pix = D(0); num_pix = D(0)
    for ih in range(last_bin, 0, -1):
        sum_pix += D(ih) * data[ih]; num_pix += data[ih]; mu_1[ih - 1] = sum_pix / num_pix
    threshold = -1; min_ent = D(DMAX)
    for it in range(256):
        ent = D(0)
        for ih in range(0, it + 1):
            mu_x = D(1.0) / (D(1.0) + term * abs(ih - mu_0[it]))
            if not (mu_x < 1e-06 or mu_x > 0.999999):
                ent += data[ih] * (-mu_x * np.log(mu_x) - (D(1.0) - mu_x) * np.log(D(1.0) - mu_x))
        for ih in range(it + 1, 256):
            mu_x = D(1.0) / (D(1.0) + term * abs(ih - mu_1[it]))
            if not (mu_x < 1e-06 or mu_x > 0.999999):
                ent += data[ih] * (-mu_x * np.log(mu_x) - (D(1.0) - mu_x) * np.log(D(1.0) - mu_x))
        if ent < min_ent: min_ent = ent; threshold = it
    return threshold

def intermodes(data):
    minbin = -1; maxbin = -1
    for i in range(len(data)):
        if data[i] > 0: maxbin = i
    for i in range(len(data) - 1, -1, -1):
        if data[i] > 0: minbin = i
    length = (maxbin - minbin) + 1
    hist = [D(data[i]) for i in range(minbin, maxbin + 1)]
    it = 0
    while not bimodal(hist):
        previous = D(0); current = D(0); nxt = hist[0]
        for i in range(length - 1):
            previous = current; current = nxt; nxt = hist[i + 1]
            hist[i] = (previous + current + nxt) / 3
        hist[length - 1] = (current + nxt) / 3
        it += 1
        if it > 10000: return -1
    tt = 0
    for i in range(1, length - 1):
        if hist[i - 1] < hist[i] and hist[i + 1] < hist[i]: tt += i
    return jcast(math.floor(tt / 2.0)) + minbin

def isodata(data):
    g = 0
    for i in range(1, 256):
        if data[i] > 0: g = i + 1; break
    while True:
        l = 0; totl = 0
        for i in range(g):
            totl = i32(totl + data[i]); l = i32(l + i32(data[i] * i))
        h = D(0); toth = D(0)
        for i in range(g + 1, 256):
            toth += data[i]; h += D(data[i]) * i
        if totl > 0 and toth > 0:
            l = jdiv(l, totl); h /= toth
            if g == jround((l + h) / 2.0): break
        g += 1
        if g > 254: return -1
    return g

def ij_isodata(data):
    data = list(data); maxValue = len(data) - 1
    data[0] = 0; data[maxValue] = 0
    mn = 0
    while data[mn] == 0 and mn < maxValue: mn += 1
    mx = maxValue
    while data[mx] == 0 and mx > 0: mx -= 1
    if mn >= mx: return len(data) // 2
    movingIndex = mn
    while True:
        s1 = D(0); s2 = D(0); s3 = D(0); s4 = D(0)
        for i in range(mn, movingIndex + 1): s1 += D(i) * data[i]; s2 += data[i]
        for i in range(movingIndex + 1, mx + 1): s3 += D(i) * data[i]; s4 += data[i]
        result = (s1 / s2 + s3 / s4) / 2.0
        movingIndex += 1
        if not ((movingIndex + 1) <= result and movingIndex < mx - 1): break
    return jround(result)

def default_isodata(data):
    n = len(data); data2 = list(data); mode = 0; maxCount = 0
    for i in range(n):
        if data2[i] > maxCount: maxCount = data2[i]; mode = i
    maxCount2 = 0
    for i in range(n):
        if data2[i] > maxCount2 and i != mode: maxCount2 = data2[i]
    hmax = maxCount
    if hmax > maxCount2 * 2 and maxCount2 != 0:
        hmax = jcast(maxCount2 * 1.5); data2[mode] = hmax
    return ij_isodata(data2)

def li(data):
    num_pixels = D(0)
    for ih in range(256): num_pixels += data[ih]
    mean = D(0)
    for ih in range(1, 256): mean += D(ih) * data[ih]
    mean /= num_pixels
    new_thresh = mean
    while True:
        old_thresh = new_thresh
        threshold = jcast(old_thresh + 0.5)
        sum_back = D(0); num_back = D(0)
        for ih in range(0, threshold + 1): sum_back += D(ih) * data[ih]; num_back += data[ih]
        mean_back = D(0.0) if num_back == 0 else sum_back / num_back
        sum_obj = D(0); num_obj = D(0)
        for ih in range(threshold + 1, 256): sum_obj += D(ih) * data[ih]; num_obj += data[ih]
        mean_obj = D(0.0) if num_obj == 0 else sum_obj / num_obj
        temp = (mean_back - mean_obj) / (np.log(mean_back) - np.log(mean_obj))
        new_thresh = D(jcast(temp - 0.5)) if temp < -2.220446049250313E-16 else D(jcast(temp + 0.5))
        if not (abs(new_thresh - old_thresh) > 0.5): break
    return threshold

def norm_cum(data):
    total = D(0)
    for ih in range(256): total += data[ih]
    nh = [D(data[ih]) / total for ih in range(256)]
    P1 = [D(0)] * 256; P2 = [D(0)] * 256
    P1[0] = nh[0]; P2[0] = D(1.0) - P1[0]
    for ih in range(1, 256): P1[ih] = P1[ih - 1] + nh[ih]; P2[ih] = D(1.0) - P1[ih]
    first_bin = 0
    for ih in range(256):
        if not (abs(P1[ih]) < 2.220446049250313E-16): first_bin = ih; break
    last_bin = 255
    for ih in range(255, first_bin - 1, -1):
        if not (abs(P2[ih]) < 2.220446049250313E-16): last_bin = ih; break
    return nh, P1, P2, first_bin, last_bin

def max_entropy(data):
    nh, P1, P2, first_bin, last_bin = norm_cum(data)
    threshold = -1; max_ent = D(DMIN)
    for it in range(first_bin, last_bin + 1):
        ent_back = D(0)
        for ih in range(0, it + 1):
            if data[ih] != 0: ent_back -= (nh[ih] / P1[it]) * np.log(nh[ih] / P1[it])
        ent_obj = D(0)
        for ih in range(it + 1, 256):
            if data[ih] != 0: ent_obj -= (nh[ih] / P2[it]) * np.log(nh[ih] / P2[it])
        tot = ent_back + ent_obj
        if max_ent < tot: max_ent = tot; threshold = it
    return threshold

def mean_method(data):
    tot = D(0); s = D(0)
    for i in range(256): tot += data[i]; s += D(i) * data[i]
    return jcast(np.floor(s / tot))

def min_error(data):
    def J(j): return 255 if j >= 256 else j
    def A(j): j = J(j); return sum_d(data[i] for i in range(0, j + 1))
    def B(j): j = J(j); return sum_d(i32(i * data[i]) for i in range(0, j + 1))
    def C(j): j = J(j); return sum_d(i32(i * i * data[i]) for i in range(0, j + 1))
    threshold = mean_method(data); Tprev = -2
    while threshold != Tprev:
        mu = B(threshold) / A(threshold)
        nu = (B(255) - B(threshold)) / (A(255) - A(threshold))
        p = A(threshold) / A(255)
        q = (A(255) - A(threshold)) / A(255)
        sigma2 = C(threshold) / A(threshold) - (mu * mu)
        tau2 = (C(255) - C(threshold)) / (A(255) - A(threshold)) - (nu * nu)
        w0 = D(1.0) / sigma2 - D(1.0) / tau2
        w1 = mu / sigma2 - nu / tau2
        w2 = (mu * mu) / sigma2 - (nu * nu) / tau2 + np.log10((sigma2 * (q * q)) / (tau2 * (p * p)))
        sqterm = (w1 * w1) - w0 * w2
        if sqterm < 0: return threshold
        Tprev = threshold
        temp = (w1 + np.sqrt(sqterm)) / w0
        threshold = Tprev if np.isnan(temp) else jcast(np.floor(temp))
    return threshold

def sum_d(it):                                          # a double accumulated term by term from 0, as `x += …`
    x = D(0)
    for t in it: x += t
    return x

def minimum(data):
    it = 0; iH = [D(v) for v in data]; tH = [D(0)] * 256
    while not bimodal(iH):
        for i in range(1, 255): tH[i] = (iH[i - 1] + iH[i] + iH[i + 1]) / 3
        tH[0] = (iH[0] + iH[1]) / 3; tH[255] = (iH[254] + iH[255]) / 3
        iH = list(tH); it += 1
        if it > 10000: return -1
    for i in range(1, 255):
        if iH[i - 1] > iH[i] and iH[i + 1] >= iH[i]: return i
    return -1

def moments(data):
    total = D(0)
    for i in range(256): total += data[i]
    histo = [D(data[i]) / total for i in range(256)]
    m0 = D(1.0); m1 = D(0); m2 = D(0); m3 = D(0)
    for i in range(256):
        di = D(i); m1 += di * histo[i]; m2 += di * di * histo[i]; m3 += di * di * di * histo[i]
    cd = m0 * m2 - m1 * m1
    c0 = (-m2 * m2 + m1 * m3) / cd
    c1 = (m0 * -m3 + m2 * m1) / cd
    z0 = 0.5 * (-c1 - np.sqrt(c1 * c1 - 4.0 * c0))
    z1 = 0.5 * (-c1 + np.sqrt(c1 * c1 - 4.0 * c0))
    p0 = (z1 - m1) / (z1 - z0)
    s = D(0)
    for i in range(256):
        s += histo[i]
        if s > p0: return i
    return -1

def otsu(data):
    S = D(0); N = D(0)
    for k in range(256): S += D(k) * data[k]; N += data[k]
    Sk = D(0); N1 = D(data[0]); BCVmax = D(0); kStar = 0
    for k in range(1, 255):
        Sk += D(k) * data[k]; N1 += data[k]
        denom = N1 * (N - N1)
        if denom != 0:
            num = (N1 / N) * S - Sk; BCV = (num * num) / denom
        else: BCV = D(0)
        if BCV >= BCVmax: BCVmax = BCV; kStar = k
    return kStar

def percentile(data):
    threshold = -1; total = sum_d(data[i] for i in range(256)); temp = D(1.0)
    for i in range(256):
        a = abs(sum_d(data[j] for j in range(i + 1)) / total - 0.5)
        if a < temp: temp = a; threshold = i
    return threshold

def renyi(data):
    nh, P1, P2, first_bin, last_bin = norm_cum(data)
    threshold = 0; max_ent = D(0)
    for it in range(first_bin, last_bin + 1):
        eb = D(0)
        for ih in range(0, it + 1):
            if data[ih] != 0: eb -= (nh[ih] / P1[it]) * np.log(nh[ih] / P1[it])
        eo = D(0)
        for ih in range(it + 1, 256):
            if data[ih] != 0: eo -= (nh[ih] / P2[it]) * np.log(nh[ih] / P2[it])
        tot = eb + eo
        if max_ent < tot: max_ent = tot; threshold = it
    t2 = threshold
    threshold = 0; max_ent = D(0); term = D(1.0) / (D(1.0) - 0.5)
    for it in range(first_bin, last_bin + 1):
        eb = D(0)
        for ih in range(0, it + 1): eb += np.sqrt(nh[ih] / P1[it])
        eo = D(0)
        for ih in range(it + 1, 256): eo += np.sqrt(nh[ih] / P2[it])
        tot = term * (np.log(eb * eo) if (eb * eo) > 0.0 else D(0.0))
        if tot > max_ent: max_ent = tot; threshold = it
    t1 = threshold
    threshold = 0; max_ent = D(0); term = D(1.0) / (D(1.0) - 2.0)
    for it in range(first_bin, last_bin + 1):
        eb = D(0)
        for ih in range(0, it + 1): eb += (nh[ih] * nh[ih]) / (P1[it] * P1[it])
        eo = D(0)
        for ih in range(it + 1, 256): eo += (nh[ih] * nh[ih]) / (P2[it] * P2[it])
        tot = term * (np.log(eb * eo) if (eb * eo) > 0.0 else D(0.0))
        if tot > max_ent: max_ent = tot; threshold = it
    t3 = threshold
    if t2 < t1: t1, t2 = t2, t1
    if t3 < t2: t2, t3 = t3, t2
    if t2 < t1: t1, t2 = t2, t1
    if abs(t1 - t2) <= 5:
        b1, b2, b3 = (1, 2, 1) if abs(t2 - t3) <= 5 else (0, 1, 3)
    else:
        b1, b2, b3 = (3, 1, 0) if abs(t2 - t3) <= 5 else (1, 2, 1)
    omega = P1[t3] - P1[t1]
    return jcast(t1 * (P1[t1] + 0.25 * omega * b1) + 0.25 * t2 * omega * b2 + t3 * (P2[t3] + 0.25 * omega * b3))

def shanbhag(data):
    nh, P1, P2, first_bin, last_bin = norm_cum(data)
    threshold = -1; min_ent = D(DMAX)
    for it in range(first_bin, last_bin + 1):
        eb = D(0); term = 0.5 / P1[it]
        for ih in range(1, it + 1): eb -= nh[ih] * np.log(1.0 - term * P1[ih - 1])
        eb *= term
        eo = D(0); term = 0.5 / P2[it]
        for ih in range(it + 1, 256): eo -= nh[ih] * np.log(1.0 - term * P2[ih])
        eo *= term
        tot = abs(eb - eo)
        if tot < min_ent: min_ent = tot; threshold = it
    return threshold

def triangle(data):
    data = list(data); mn = 0; dmax = 0; mx = 0; mn2 = 0
    for i in range(len(data)):
        if data[i] > 0: mn = i; break
    if mn > 0: mn -= 1
    for i in range(255, 0, -1):
        if data[i] > 0: mn2 = i; break
    if mn2 < 255: mn2 += 1
    for i in range(256):
        if data[i] > dmax: mx = i; dmax = data[i]
    inverted = False
    if (mx - mn) < (mn2 - mx):
        inverted = True; data.reverse(); mn = 255 - mn2; mx = 255 - mx
    if mn == mx: return mn
    nx = D(data[mx]); ny = D(mn - mx)
    d = np.sqrt(nx * nx + ny * ny); nx /= d; ny /= d
    d = nx * mn + ny * data[mn]
    split = mn; splitDistance = D(0)
    for i in range(mn + 1, mx + 1):
        nd = nx * i + ny * data[i] - d
        if nd > splitDistance: split = i; splitDistance = nd
    split -= 1
    return 255 - split if inverted else split

def yen(data):
    total = D(0)
    for ih in range(256): total += data[ih]
    nh = [D(data[ih]) / total for ih in range(256)]
    P1 = [D(0)] * 256; P1sq = [D(0)] * 256; P2sq = [D(0)] * 256
    P1[0] = nh[0]
    for ih in range(1, 256): P1[ih] = P1[ih - 1] + nh[ih]
    P1sq[0] = nh[0] * nh[0]
    for ih in range(1, 256): P1sq[ih] = P1sq[ih - 1] + nh[ih] * nh[ih]
    P2sq[255] = D(0)
    for ih in range(254, -1, -1): P2sq[ih] = P2sq[ih + 1] + nh[ih + 1] * nh[ih + 1]
    threshold = -1; max_crit = D(DMIN)
    for it in range(256):
        a = P1sq[it] * P2sq[it]; b = P1[it] * (1.0 - P1[it])
        crit = -1.0 * (np.log(a) if a > 0.0 else D(0.0)) + 2 * (np.log(b) if b > 0.0 else D(0.0))
        if crit > max_crit: max_crit = crit; threshold = it
    return threshold

METHODS = {"Default": default_isodata, "Huang": huang, "Intermodes": intermodes, "IsoData": isodata, "Li": li, "MaxEntropy": max_entropy,
           "Mean": mean_method, "MinError": min_error, "Minimum": minimum, "Moments": moments, "Otsu": otsu, "Percentile": percentile,
           "RenyiEntropy": renyi, "Shanbhag": shanbhag, "Triangle": triangle, "Yen": yen}

def get_threshold(method, hist):
    nz = 0; b1 = -1; b2 = -1
    for i, c in enumerate(hist):
        if c > 0:
            nz += 1
            if nz > 2: break
            if b1 == -1: b1 = i
            else: b2 = i
    if nz == 2: return b2 - 1
    t = METHODS[method](list(hist))
    return 0 if t == -1 else t

# ---- setAutoThreshold of a FloatProcessor ----------------------------------------------------------------------------------
def to_image(c):                                        # Kurve's matrix → ImageJ's pixels (the top row the largest Y), float32
    nx, ny, z = c["nx"], c["ny"], c["z"]; px = []
    for py in range(ny):
        r = ny - 1 - py
        for qx in range(nx):
            v = z[r * nx + qx]; px.append(float("nan") if v is None else float(np.float32(v)))
    return px

def auto_threshold(c, method, dark, skip):
    px = to_image(c)
    fin = [v for v in px if not math.isnan(v)]
    mn = min(fin); mx = max(fin)                         # resetMinAndMax: NaN left out
    hist = [0] * 256
    scale = 255.0 / (mx - mn) if mx > mn else float("inf")
    for v in px:
        if skip and math.isnan(v): continue
        value = v - mn                                  # create8BitImage: (int)(value*scale + 0.5), below 0 as 0, NaN as 0
        if value < 0.0: value = 0.0
        iv = jcast(value * scale + 0.5) if mx > mn else 0
        if iv > 255: iv = 255
        hist[iv] += 1
    t = get_threshold(method, hist)
    if dark: lower = t + 1; upper = 255
    else: lower = 0; upper = t
    if lower > 255: lower = 255
    if mx > mn:                                         # scaleAndSetThreshold for a 32-bit image
        lower = min(mn, -1e30) if lower == 0 else mn + (lower / 255.0) * (mx - mn)
        upper = max(mx, 1e30) if upper == 255 else mn + (upper / 255.0) * (mx - mn)
    else: lower = upper = mn
    inside = sum(1 for v in fin if lower <= v <= upper)
    return {"t": t, "lower": lower, "upper": upper, "min": mn, "max": mx, "inside": inside, "hist": hist}

def main():
    rng = np.random.default_rng(20251121)
    hists = []
    def mix(n, parts):
        h = np.zeros(256, dtype=np.int64)
        for (mu, sd, w) in parts:
            v = np.clip(np.round(rng.normal(mu, sd, int(n * w))), 0, 255).astype(int); np.add.at(h, v, 1)
        return [int(x) for x in h]
    for _ in range(14): hists.append(mix(int(rng.integers(200, 20000)), [(rng.uniform(20, 120), rng.uniform(3, 25), rng.uniform(0.3, 0.8)), (rng.uniform(130, 230), rng.uniform(3, 25), rng.uniform(0.1, 0.6))]))
    for _ in range(6): hists.append(mix(int(rng.integers(500, 9000)), [(rng.uniform(10, 240), rng.uniform(2, 40), 1.0)]))
    for _ in range(4): hists.append(mix(int(rng.integers(500, 9000)), [(rng.uniform(10, 80), 8, 0.3), (rng.uniform(100, 160), 8, 0.3), (rng.uniform(180, 250), 8, 0.3)]))
    hists.append([int(x) for x in rng.integers(0, 50, 256)])                       # noise
    h = [0] * 256; h[0] = 4000000; h[3] = 90000; h[200] = 120000; h[201] = 5; hists.append(h)          # huge counts: Java's ints wrap
    h = [0] * 256
    for i in range(256): h[i] = 40000 + (i % 7) * 1000
    hists.append(h)                                                                 # i·i·count past 2³¹
    h = [0] * 256; h[17] = 50; h[180] = 70; hists.append(h)                         # bilevel
    h = [0] * 256; h[90] = 1234; hists.append(h)                                    # one bin
    h = [0] * 256; h[0] = 600; h[255] = 400; hists.append(h)                        # the ends only
    h = [0] * 256; h[0] = 600; h[5] = 3; h[255] = 400; hists.append(h)
    h = [0] * 256
    for i in range(40, 60): h[i] = 100
    hists.append(h)                                                                 # flat
    hc = [{"h": h, "want": {m: get_threshold(m, h) for m in METHODS}} for h in hists]
    # images: a scan of spots, counts with an unfinished row, a skewed field, one value
    imgs = []
    nx, ny = 40, 34; lam = np.full((ny, nx), 4.0); yy, xx = np.mgrid[0:ny, 0:nx]
    for (cx, cy, a) in ((8, 7, 80), (25, 12, 140), (30, 27, 60), (12, 24, 35), (34, 4, 100)): lam += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / 5.0)
    imgs.append({"name": "spots", "nx": nx, "ny": ny, "z": [float(v) for v in rng.poisson(lam).ravel()]})
    z = [float(v) for v in rng.poisson(lam).ravel()]
    for c in range(nx): z[(ny - 1) * nx + c] = None
    for c in range(0, 17): z[(ny - 2) * nx + c] = None
    imgs.append({"name": "unfinished", "nx": nx, "ny": ny, "z": z})
    imgs.append({"name": "skewed", "nx": 31, "ny": 23, "z": [round(float(math.exp(rng.normal(0, 0.8)) * 1000 + 0.37 * i), 4) for i in range(31 * 23)]})
    imgs.append({"name": "one value", "nx": 5, "ny": 4, "z": [2.5] * 20})
    for im in imgs:
        im["want"] = []
        for m in METHODS:
            for dark in (False, True):
                for skip in ((False, True) if im["name"] == "unfinished" else (False,)):
                    r = auto_threshold(im, m, dark, skip)
                    im["want"].append({"method": m, "dark": dark, "skip": skip, "t": r["t"], "lower": r["lower"], "upper": r["upper"], "inside": r["inside"]})
    out = {"about": "ImageJ 1.54f's AutoThresholder and setAutoThreshold of a 32-bit image, written again from its source (tools/ref/ij_threshold.py)", "hists": hc, "images": imgs}
    path = os.path.join(here, "fixtures", "ij-threshold.json")
    with open(path, "w") as fh: json.dump(out, fh, separators=(",", ":"))
    print(f"wrote {path}: {len(hc)} histograms × 16 methods, {len(imgs)} images")

if __name__ == "__main__": main()
