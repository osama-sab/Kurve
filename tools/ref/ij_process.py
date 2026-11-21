"""ImageJ's Process menu on a 32-bit image (IMAGE_SPEC I.5): the reference for Kurve's ijProcess, written again from ImageJ 1.54f's
source (read as text; ImageJ itself is not run here) with NumPy's float32 wherever Java computes in float and Python's float where
it computes in double, into fixtures/ij-process.json.

  ij.process.FloatProcessor.filter3x3   Smooth (BLUR_MORE, the sum times 0.11111111f), Find Edges, CONVOLVE for Sharpen
                                        ({-1,-1,-1,-1,12,-1,-1,-1,-1}, scale 1f/4f); the edge rows and columns repeated
  ij.plugin.filter.GaussianBlur         blurFloat: blur1Direction in X then Y; makeGaussianKernel, convolveLine, and past
                                        sigma 2·4 + 0.5 downscaleLine, makeDownscaleKernel, makeUpscaleKernel, upscaleLine
  ij.plugin.filter.RankFilters          makeLineRadii, the cache padded with the edge pixels, filterLine: MEAN and VARIANCE from
                                        getAreaSums / addSideSums in doubles (full sums at a line's start, for kRadius < 2 and
                                        after a NaN), MIN and MAX, MEDIAN by getNaNAwareMedian with the pixel's own value as guess
  ij.plugin.filter.UnsharpMask          sharpenFloat: the Gaussian at accuracy 0.01, (v − w·b)/(1f − w)
  ij.plugin.filter.BackgroundSubtracter rollingBallBackground for a FloatProcessor: RollingBall, shrinkImage, rollBall,
                                        enlargeImage, its filter3x3 (MAXIMUM and MEAN), and slidingParaboloidFloatBackground with
                                        correctCorners, filter1D and lineSlideParabola (one guard ImageJ lacks: where no slope is
                                        below Float.MAX_VALUE the parabola steps on instead of looping for ever)
  ij.process.FloatProcessor.process     ADD (subtract as add(−value)), MULT (divide as multiply(1.0/value)), MINIMUM, MAXIMUM,
                                        GAMMA, LOG, EXP, SQR, SQRT, ABS; ImageMath's reciprocal and NaN Background
  Kurve's own (decision 10)             the empty cells left out: the Gaussian of the values over the Gaussian of the mask, the
                                        Mean and Variance over the cells with a value

Each case is a matrix as Kurve holds it (z row by row from the least Y, X rising), turned into ImageJ's image as Kurve's ijImage
does (the top row the largest Y, each value rounded to float32) and back. A result is the image's values (NaN, ±inf and, for
Minimum and Maximum, ±Float.MAX_VALUE as null).

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/ij_process.py   (writes fixtures/ij-process.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
F = np.float32
FMAX = float(np.finfo(np.float32).max)
def jint(x): return int(x)          # Java's (int) of a non-negative double here: toward zero

# ---- FloatProcessor.filter3x3 -------------------------------------------------------------------------------------------
def filter3x3(px, W, H, kind):
    if W <= 1: return list(px)                              # smooth(), sharpen(), findEdges(): only if width > 1
    pixels2 = list(px); out = [F(0)] * (W * H)
    k = [F(-1), F(-1), F(-1), F(-1), F(12), F(-1), F(-1), F(-1), F(-1)]
    scale = F(1) / F(4)                                     # sum of the kernel 4, scale = 1f/scale
    for y in range(H):
        p = y * W; p6 = p; p3 = p6 - (W if y > 0 else 0); p9 = p6 + (W if y < H - 1 else 0)
        v2 = pixels2[p3]; v5 = pixels2[p6]; v8 = pixels2[p9]
        v3 = pixels2[p3]; v6 = pixels2[p6]; v9 = pixels2[p9]
        for x in range(W):
            if x < W - 1: p3 += 1; p6 += 1; p9 += 1
            v1 = v2; v2 = v3; v3 = pixels2[p3]
            v4 = v5; v5 = v6; v6 = pixels2[p6]
            v7 = v8; v8 = v9; v9 = pixels2[p9]
            if kind == "smooth":
                out[p] = (v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9) * F(0.11111111)
            elif kind == "edges":
                s1 = v1 + F(2) * v2 + v3 - v7 - F(2) * v8 - v9
                s2 = v1 + F(2) * v4 + v7 - v3 - F(2) * v6 - v9
                out[p] = F(math.sqrt(float(s1 * s1 + s2 * s2)))
            else:
                s = k[0] * v1 + k[1] * v2 + k[2] * v3 + k[3] * v4 + k[4] * v5 + k[5] * v6 + k[6] * v7 + k[7] * v8 + k[8] * v9
                out[p] = s * scale
            p += 1
    return out

# ---- GaussianBlur ---------------------------------------------------------------------------------------------------------
def make_kernel(sigma, accuracy, maxRadius):
    kRadius = int(math.ceil(sigma * math.sqrt(-2 * math.log(accuracy)))) + 1
    if maxRadius < 50: maxRadius = 50
    if kRadius > maxRadius: kRadius = maxRadius
    k0 = [F(math.exp(-0.5 * i * i / sigma / sigma)) for i in range(kRadius)]
    k1 = [F(0)] * kRadius
    if kRadius < maxRadius and kRadius > 3:
        sqrtSlope = sys.float_info.max; r = kRadius
        while r > kRadius // 2:
            r -= 1
            a = math.sqrt(float(k0[r])) / (kRadius - r)
            if a < sqrtSlope: sqrtSlope = a
            else: break
        for r1 in range(r + 2, kRadius):
            k0[r1] = F((kRadius - r1) * (kRadius - r1) * sqrtSlope * sqrtSlope)
    if kRadius < maxRadius:
        s = float(k0[0])
        for i in range(1, kRadius): s += float(F(2) * k0[i])
    else:
        s = sigma * math.sqrt(2 * math.pi)
    rsum = 0.5 + 0.5 * float(k0[0]) / s
    for i in range(kRadius):
        v = float(k0[i]) / s
        k0[i] = F(v); rsum -= v; k1[i] = F(rsum)
    return k0, k1

def convolve_line(inp, pixels, kern, kernSum, writeFrom, writeTo, point0, pointInc):
    length = len(inp); first = inp[0]; last = inp[length - 1]; kern0 = kern[0]; kRadius = len(kern)
    firstPart = kRadius if kRadius < length else length
    p = point0 + writeFrom * pointInc; i = writeFrom
    def sides(i, result):
        for k in range(1, kRadius):
            v = F(0)
            if i - k >= 0: v = v + inp[i - k]
            if i + k < length: v = v + inp[i + k]
            result = result + kern[k] * v
        return result
    while i < firstPart:
        result = inp[i] * kern0
        result = result + kernSum[i] * first
        if i + kRadius > length: result = result + kernSum[length - i - 1] * last
        pixels[p] = sides(i, result); i += 1; p += pointInc
    iEndInside = length - kRadius if length - kRadius < writeTo else writeTo
    while i < iEndInside:
        result = inp[i] * kern0
        for k in range(1, kRadius): result = result + kern[k] * (inp[i - k] + inp[i + k])
        pixels[p] = result; i += 1; p += pointInc
    while i < writeTo:
        result = inp[i] * kern0
        if i < kRadius: result = result + kernSum[i] * first
        if i + kRadius >= length: result = result + kernSum[length - i - 1] * last
        pixels[p] = sides(i, result); i += 1; p += pointInc

def down_kernel(u):
    mid = u * 3 // 2; k = [F(0)] * (3 * u)
    for i in range(0, u // 2 + 1):
        x = i / u; v = F((0.75 - x * x) / u); k[mid - i] = v; k[mid + i] = v
    for i in range(u // 2 + 1, (u * 3 + 1) // 2):
        x = i / u; v = F((0.125 + 0.5 * (x - 1) * (x - 2)) / u); k[mid - i] = v; k[mid + i] = v
    return k

def up_kernel(u):
    k = [F(0)] * (4 * u); mid = 2 * u
    for i in range(u):
        x = i / u; v = F(2. / 3. - x * x * (1 - 0.5 * x)); k[mid + i] = v; k[mid - i] = v
    for i in range(u, 2 * u):
        x = i / u; v = F((2. - x) * (2. - x) * (2. - x) / 6.); k[mid + i] = v; k[mid - i] = v
    return k

def downscale_line(pixels, cache, kernel, rb, pixel0, unscaled0, length, pointInc, newLength):
    p = pixel0 + pointInc * (unscaled0 - rb * 3 // 2)
    pLast = pixel0 + pointInc * (length - 1)
    for xout in range(-1, newLength + 1):
        s0 = F(0); s1 = F(0); s2 = F(0)
        for x in range(rb):
            v = pixels[pixel0 if p < pixel0 else (pLast if p > pLast else p)]
            s0 = s0 + v * kernel[x + 2 * rb]; s1 = s1 + v * kernel[x + rb]; s2 = s2 + v * kernel[x]
            p += pointInc
        if xout > 0: cache[xout - 1] = cache[xout - 1] + s0
        if xout >= 0 and xout < newLength: cache[xout] = cache[xout] + s1
        if xout + 1 < newLength: cache[xout + 1] = s2

def upscale_line(cache, pixels, kernel, rb, pixel0, unscaled0, writeFrom, writeTo, pointInc):
    p = pixel0 + pointInc * writeFrom
    for xout in range(writeFrom, writeTo):
        t = xout - unscaled0 + rb - 1
        xin = t // rb; x = rb - 1 - t % rb                   # t > 0, so Java's / and % are Python's
        pixels[p] = cache[xin - 2] * kernel[x] + cache[xin - 1] * kernel[x + rb] + cache[xin] * kernel[x + 2 * rb] + cache[xin + 1] * kernel[x + 3 * rb]
        p += pointInc

def blur1(pixels, W, H, sigma, accuracy, xDir):
    UP = 2; MINS = 4.
    length = W if xDir else H; pointInc = 1 if xDir else W; lineInc = W if xDir else 1; nLines = H if xDir else W
    writeFrom, writeTo = 0, length
    down = sigma > 2 * MINS + 0.5
    rb = min(int(math.floor(sigma / MINS)), length) if down else 1
    sG = math.sqrt(sigma * sigma / (rb * rb) - 1. / 3. - 1. / 4.) if down else sigma
    maxLength = (length + rb - 1) // rb + 2 * (UP + 1) if down else length
    kern, kernSum = make_kernel(sG, accuracy, maxLength)
    kRadius = len(kern) * rb
    readFrom = 0 if writeFrom - kRadius < 0 else writeFrom - kRadius
    readTo = length if writeTo + kRadius > length else writeTo + kRadius
    newLength = (readTo - readFrom + rb - 1) // rb + 2 * (UP + 1) if down else length
    unscaled0 = readFrom - (UP + 1) * rb
    dk = down_kernel(rb) if down else None; uk = up_kernel(rb) if down else None
    cache1 = [F(0)] * newLength; cache2 = [F(0)] * newLength if down else None   # one thread's caches, kept from line to line
    for line in range(nLines):
        pixel0 = line * lineInc
        if down:
            downscale_line(pixels, cache1, dk, rb, pixel0, unscaled0, length, pointInc, newLength)
            convolve_line(cache1, cache2, kern, kernSum, 1, newLength - 1, 0, 1)
            upscale_line(cache2, pixels, uk, rb, pixel0, unscaled0, writeFrom, writeTo, pointInc)
        else:
            p = pixel0 + readFrom * pointInc
            for i in range(readFrom, readTo): cache1[i] = pixels[p]; p += pointInc
            convolve_line(cache1, pixels, kern, kernSum, writeFrom, writeTo, pixel0, pointInc)

def gauss(px, W, H, sx, sy, acc):
    pixels = list(px)
    if sx > 0: blur1(pixels, W, H, sx, acc, True)
    if sy > 0: blur1(pixels, W, H, sy, acc, False)
    return pixels

# ---- RankFilters ----------------------------------------------------------------------------------------------------------
def line_radii(radius):
    if radius >= 1.5 and radius < 1.75: radius = 1.75
    elif radius >= 2.5 and radius < 2.85: radius = 2.85
    r2 = int(radius * radius) + 1
    kRadius = int(math.sqrt(r2 + 1e-10)); kHeight = 2 * kRadius + 1
    kernel = [0] * (2 * kHeight + 2)
    kernel[2 * kRadius] = -kRadius; kernel[2 * kRadius + 1] = kRadius
    nPoints = 2 * kRadius + 1
    for y in range(1, kRadius + 1):
        dx = int(math.sqrt(r2 - y * y + 1e-10))
        kernel[2 * (kRadius - y)] = -dx; kernel[2 * (kRadius - y) + 1] = dx
        kernel[2 * (kRadius + y)] = -dx; kernel[2 * (kRadius + y) + 1] = dx
        nPoints += 4 * dx + 2
    kernel[-2] = nPoints; kernel[-1] = kRadius
    return kernel

def rank(px, W, H, radius, ftype):
    L = line_radii(radius); kHeight = (len(L) - 2) // 2; kRadius = L[-1]; kNPoints = L[-2]
    cacheWidth = W + 2 * kRadius
    def cache_line(y):                                      # readLineToCacheOrPad: y < 0 the first line, y ≥ H the last
        yy = 0 if y < 0 else (H - 1 if y >= H else y)
        row = px[yy * W:(yy + 1) * W]
        return [row[0]] * kRadius + list(row) + [row[-1]] * kRadius
    # the cache pointers: for kernel line i, the cache line y − kRadius + i, from kRadius + left to kRadius + right
    ptr = [(i, kRadius + L[2 * i], kRadius + L[2 * i + 1]) for i in range(kHeight)]
    out = list(px); small = kRadius < 2
    sign = F(-1) if ftype == "min" else F(1)
    for y in range(H):
        C = [cache_line(y - kRadius + i) for i in range(kHeight)]
        def area(xc, ignoreRight=0):
            for (i, a, b) in ptr:
                for q in range(a + xc, b + xc - ignoreRight + 1): yield C[i][q]
        full = True; sums = [0.0, 0.0]; mx = F(0)
        for x in range(W):
            vp = y * W + x
            if ftype in ("min", "max"):                    # the incremental getSideMax/getAreaMax give the area's maximum
                m = F(-FMAX)
                for v in area(x):
                    v = v * sign
                    if m < v: m = v
                out[vp] = m * sign; continue
            if ftype in ("mean", "var"):
                if full:
                    full = small; s = 0.0; s2 = 0.0
                    for (i, a, b) in ptr:
                        for q in range(a + x, b + x + 1):
                            v = float(C[i][q]); s += v; s2 += v * v
                    sums[0] = s; sums[1] = s2
                else:
                    s = 0.0; s2 = 0.0
                    for (i, a, b) in ptr:
                        v = float(C[i][a + x - 1]); s -= v; s2 -= v * v
                        v = float(C[i][b + x]); s += v; s2 += v * v
                    sums[0] += s; sums[1] += s2
                    if math.isnan(sums[0]): full = True
                if ftype == "mean": out[vp] = F(sums[0] / kNPoints)
                else:
                    value = F((sums[1] - sums[0] * sums[0] / kNPoints) / kNPoints)
                    if value < 0: value = F(0)
                    out[vp] = value
                continue
            # MEDIAN, float: the first guess the pixel's own value (not yet written), getNaNAwareMedian
            guess = px[vp]
            n = kNPoints; above = []; below = []
            for v in area(x):
                if math.isnan(v): n -= 1
                elif v > guess: above.append(v)
                elif v < guess: below.append(v)
            if n == 0: out[vp] = F("nan"); continue
            half = n // 2
            if len(above) > half: out[vp] = sorted(above)[len(above) - half - 1]
            elif len(below) > half: out[vp] = sorted(below)[half]
            else: out[vp] = guess
    return out

# ---- UnsharpMask, Math ----------------------------------------------------------------------------------------------------
def unsharp(px, W, H, sigma, weight, skip=False):
    w = F(weight)
    b = gauss_skip(px, W, H, sigma, sigma, 0.01) if skip else gauss(px, W, H, sigma, sigma, 0.01)
    return [(px[i] - w * b[i]) / (F(1) - w) for i in range(W * H)]

def math_op(px, op, value, lo=None, hi=None):
    out = []
    c = F(-value) if op == "sub" else ((F(1.0 / value) if value != 0 else F("inf")) if op == "div" else (F(value) if value is not None else F(0)))
    for v1 in px:
        if op in ("add", "sub"): v2 = v1 + c
        elif op in ("mul", "div"): v2 = v1 * c
        elif op == "min": v2 = F(value) if float(v1) < value else v1
        elif op == "max": v2 = F(value) if float(v1) > value else v1
        elif op == "gamma": v2 = F(0) if v1 <= F(0) else F(math.exp(float(c) * math.log(float(v1))))
        elif op == "log": v2 = F(math.log(float(v1))) if v1 > 0 else (F("-inf") if v1 == 0 else F("nan"))
        elif op == "exp": v2 = F(math.exp(float(v1))) if float(v1) < 709 else F("inf")
        elif op == "sqr": v2 = v1 * v1
        elif op == "sqrt": v2 = F(0) if v1 <= F(0) else F(math.sqrt(float(v1)))
        elif op == "abs": v2 = F(abs(float(v1)))
        elif op == "recip": v2 = F("nan") if v1 == F(0) else F(1) / v1
        elif op == "nan": v2 = F("nan") if (float(v1) < lo or float(v1) > hi) else v1
        out.append(v2)
    return out

# ---- BackgroundSubtracter ---------------------------------------------------------------------------------------------------
FMAXF = F(FMAX)
def jcast(x):                       # Java's (int) of a double: toward zero, NaN 0, saturated
    if x != x: return 0
    if x >= 2147483647: return 2147483647
    if x <= -2147483648: return -2147483648
    return int(x)
def i32(x): x &= 0xffffffff; return x - (1 << 32) if x >= (1 << 31) else x

def bg_filter3x3(pixels, width, height, kind):
    def filter3(length, pixel0, inc):
        shiftBy = 0.0
        v3 = pixels[pixel0]; v2 = v3
        p = pixel0
        for i in range(length):
            v1 = v2; v2 = v3
            if i < length - 1: v3 = pixels[p + inc]
            if kind == "max":
                mx = v1 if v1 > v3 else v3
                if v2 > mx: mx = v2
                shiftBy += float(mx - v2)
                pixels[p] = mx
            else:
                pixels[p] = (v1 + v2 + v3) * F(0.33333333)
            p += inc
        return shiftBy
    shiftBy = 0.0
    for y in range(height): shiftBy += filter3(width, y * width, 1)
    for x in range(width): shiftBy += filter3(height, x, width)
    return shiftBy / width / height

class RollingBall:
    def __init__(self, radius):
        if radius <= 10: self.shrinkFactor = 1; arcTrimPer = 24
        elif radius <= 30: self.shrinkFactor = 2; arcTrimPer = 24
        elif radius <= 100: self.shrinkFactor = 4; arcTrimPer = 32
        else: self.shrinkFactor = 8; arcTrimPer = 40
        smallballradius = radius / self.shrinkFactor
        if smallballradius < 1: smallballradius = 1
        rsquare = smallballradius * smallballradius
        xtrim = jcast(arcTrimPer * smallballradius) // 100
        halfWidth = int(math.floor(smallballradius - xtrim + 0.5))   # Java's Math.round of a positive double
        self.width = 2 * halfWidth + 1
        self.data = []
        for y in range(self.width):
            for x in range(self.width):
                xval = x - halfWidth; yval = y - halfWidth
                temp = rsquare - xval * xval - yval * yval
                self.data.append(F(math.sqrt(temp)) if temp > 0. else F(0))

def shrink_image(pixels, width, height, sf):
    sWidth = (width + sf - 1) // sf; sHeight = (height + sf - 1) // sf
    s = [F(0)] * (sWidth * sHeight)
    for ySmall in range(sHeight):
        for xSmall in range(sWidth):
            mn = FMAXF
            y = sf * ySmall; j = 0
            while j < sf and y < height:
                x = sf * xSmall; k = 0
                while k < sf and x < width:
                    t = pixels[x + y * width]
                    if t < mn: mn = t
                    k += 1; x += 1
                j += 1; y += 1
            s[xSmall + ySmall * sWidth] = mn
    return s, sWidth, sHeight

def roll_ball(ball, pixels, width, height):
    zBall = ball.data; ballWidth = ball.width; radius = ballWidth // 2
    cache = [F(0)] * (width * ballWidth)
    for y in range(-radius, height + radius):
        nextLineToWriteInCache = (y + radius) % ballWidth
        nextLineToRead = y + radius
        if nextLineToRead < height:
            cache[nextLineToWriteInCache * width:(nextLineToWriteInCache + 1) * width] = pixels[nextLineToRead * width:(nextLineToRead + 1) * width]
            for x in range(width): pixels[nextLineToRead * width + x] = -FMAXF
        y0 = max(y - radius, 0); yBall0 = y0 - y + radius
        yend = min(y + radius, height - 1)
        for x in range(-radius, width + radius):
            z = FMAXF
            x0 = max(x - radius, 0); xBall0 = x0 - x + radius
            xend = min(x + radius, width - 1)
            yBall = yBall0
            for yp in range(y0, yend + 1):
                cp = (yp % ballWidth) * width + x0; bp = xBall0 + yBall * ballWidth
                for xp in range(x0, xend + 1):
                    zReduced = cache[cp] - zBall[bp]
                    if z > zReduced: z = zReduced
                    cp += 1; bp += 1
                yBall += 1
            yBall = yBall0
            for yp in range(y0, yend + 1):
                p = x0 + yp * width; bp = xBall0 + yBall * ballWidth
                for xp in range(x0, xend + 1):
                    zMin = z + zBall[bp]
                    if pixels[p] < zMin: pixels[p] = zMin
                    p += 1; bp += 1
                yBall += 1

def interpolation_arrays(length, smallLength, sf):
    idx = []; w = []
    for i in range(length):
        num = i - sf // 2
        smallIndex = int(num / sf) if num >= 0 else -((-num) // sf)    # Java's int division: toward zero
        if smallIndex >= smallLength - 1: smallIndex = smallLength - 2
        idx.append(smallIndex)
        distance = (i + F(0.5)) / sf - (smallIndex + F(0.5))
        w.append(F(1) - distance)
    return idx, w

def enlarge_image(s, sw, sh, pixels, width, height, sf):
    xi, xw = interpolation_arrays(width, sw, sf); yi, yw = interpolation_arrays(height, sh, sf)
    line0 = [F(0)] * width; line1 = [F(0)] * width
    for x in range(width): line1[x] = s[xi[x]] * xw[x] + s[xi[x] + 1] * (F(1) - xw[x])
    ySmallLine0 = -1
    for y in range(height):
        if ySmallLine0 < yi[y]:
            line0, line1 = line1, line0
            ySmallLine0 += 1
            sYPointer = (yi[y] + 1) * sw
            for x in range(width): line1[x] = s[sYPointer + xi[x]] * xw[x] + s[sYPointer + xi[x] + 1] * (F(1) - xw[x])
        weight = yw[y]
        for x in range(width): pixels[y * width + x] = line0[x] * weight + line1[x] * (F(1) - weight)

def rolling_ball_background(pixels, width, height, radius, invert, doPresmooth):
    ball = RollingBall(radius); shrink = ball.shrinkFactor > 1
    if invert:
        for i in range(len(pixels)): pixels[i] = -pixels[i]
    if doPresmooth: bg_filter3x3(pixels, width, height, "mean")
    if shrink:
        small, sw, sh = shrink_image(pixels, width, height, ball.shrinkFactor)
        roll_ball(ball, small, sw, sh)
        enlarge_image(small, sw, sh, pixels, width, height, ball.shrinkFactor)
    else:
        roll_ball(ball, pixels, width, height)
    if invert:
        for i in range(len(pixels)): pixels[i] = -pixels[i]

def line_slide_parabola(pixels, start, inc, length, coeff2, correctedEdges):
    cache = [F(0)] * length; nextPoint = [0] * max(length, 1)
    minValue = FMAXF; lastpoint = 0; firstCorner = length - 1; lastCorner = 0
    vPrevious1 = F(0); vPrevious2 = F(0)
    curvatureTest = F(1.999) * coeff2
    p = start
    for i in range(length):
        v = pixels[p]; cache[i] = v
        if v < minValue: minValue = v
        if i >= 2 and vPrevious1 + vPrevious1 - vPrevious2 - v < curvatureTest:
            nextPoint[lastpoint] = i - 1; lastpoint = i - 1
        vPrevious2 = vPrevious1; vPrevious1 = v
        p += inc
    nextPoint[lastpoint] = length - 1
    nextPoint[length - 1] = 2147483647
    i1 = 0
    while i1 < length - 1:
        v1 = cache[i1]; minSlope = FMAXF; i2 = 0; searchTo = length; recalc = 0
        j = nextPoint[i1]
        while j < searchTo:
            v2 = cache[j]
            slope = (v2 - v1) / (j - i1) + coeff2 * (j - i1)
            if slope < minSlope:
                minSlope = slope; i2 = j; recalc = -3
            if recalc == 0:
                b = float(F(0.5) * minSlope / coeff2)
                maxSearch = i32(i1 + jcast(b + math.sqrt(b * b + float((v1 - minValue) / coeff2)) + 1))
                if maxSearch < searchTo and maxSearch > 0: searchTo = maxSearch
            j = nextPoint[j]; recalc += 1
        if i2 <= i1: i2 = i1 + 1            # the guard ImageJ lacks (it would loop for ever)
        if i1 == 0: firstCorner = i2
        if i2 == length - 1: lastCorner = i1
        p = start + (i1 + 1) * inc
        for jj in range(i1 + 1, i2):
            pixels[p] = v1 + (jj - i1) * (minSlope - (jj - i1) * coeff2)
            p += inc
        i1 = i2
    if correctedEdges is not None:
        if 4 * firstCorner >= length: firstCorner = 0
        if 4 * (length - 1 - lastCorner) >= length: lastCorner = length - 1
        v1 = cache[firstCorner]; v2 = cache[lastCorner]
        slope = (v2 - v1) / (lastCorner - firstCorner)
        value0 = v1 - slope * firstCorner
        coeff6 = F(0)
        mid = F(0.5) * (lastCorner + firstCorner)
        for i in range((length + 2) // 3, (2 * length) // 3 + 1):
            dx = (i - mid) * F(2) / (lastCorner - firstCorner)
            poly6 = dx * dx * dx * dx * dx * dx - F(1)
            if cache[i] < value0 + slope * i + coeff6 * poly6:
                coeff6 = -(value0 + slope * i - cache[i]) / poly6
        dx = (firstCorner - mid) * F(2) / (lastCorner - firstCorner)
        correctedEdges[0] = value0 + coeff6 * (dx * dx * dx * dx * dx * dx - F(1)) + coeff2 * firstCorner * firstCorner
        dx = (lastCorner - mid) * F(2) / (lastCorner - firstCorner)
        correctedEdges[1] = value0 + (length - 1) * slope + coeff6 * (dx * dx * dx * dx * dx * dx - F(1)) + coeff2 * (length - 1 - lastCorner) * (length - 1 - lastCorner)
    return correctedEdges

def correct_corners(pixels, width, height, coeff2):
    corners = [F(0)] * 4; e = [F(0), F(0)]
    e = line_slide_parabola(pixels, 0, 1, width, coeff2, e); corners[0] = e[0]; corners[1] = e[1]
    e = line_slide_parabola(pixels, (height - 1) * width, 1, width, coeff2, e); corners[2] = e[0]; corners[3] = e[1]
    e = line_slide_parabola(pixels, 0, width, height, coeff2, e); corners[0] += e[0]; corners[2] += e[1]
    e = line_slide_parabola(pixels, width - 1, width, height, coeff2, e); corners[1] += e[0]; corners[3] += e[1]
    diagLength = min(width, height); coeff2diag = 2 * coeff2
    e = line_slide_parabola(pixels, 0, 1 + width, diagLength, coeff2diag, e); corners[0] += e[0]
    e = line_slide_parabola(pixels, width - 1, -1 + width, diagLength, coeff2diag, e); corners[1] += e[0]
    e = line_slide_parabola(pixels, (height - 1) * width, 1 - width, diagLength, coeff2diag, e); corners[2] += e[0]
    e = line_slide_parabola(pixels, width * height - 1, -1 - width, diagLength, coeff2diag, e); corners[3] += e[0]
    for p, k in ((0, 0), (width - 1, 1), ((height - 1) * width, 2), (width * height - 1, 3)):
        if pixels[p] > corners[k] / 3: pixels[p] = corners[k] / 3

def filter1d(pixels, width, height, direction, coeff2):
    startLine = 0; nLines = 0; lineInc = 0; pointInc = 0; length = 0
    if direction == "x": nLines = height; lineInc = width; pointInc = 1; length = width
    elif direction == "y": nLines = width; lineInc = 1; pointInc = width; length = height
    elif direction == "1a": nLines = width - 2; lineInc = 1; pointInc = width + 1
    elif direction == "1b": startLine = 1; nLines = height - 2; lineInc = width; pointInc = width + 1
    elif direction == "2a": startLine = 2; nLines = width; lineInc = 1; pointInc = width - 1
    elif direction == "2b": startLine = 0; nLines = height - 2; lineInc = width; pointInc = width - 1
    for i in range(startLine, nLines):
        startPixel = i * lineInc
        if direction == "2b": startPixel += width - 1
        if direction == "1a": length = min(height, width - i)
        elif direction == "1b": length = min(width, height - i)
        elif direction == "2a": length = min(height, i + 1)
        elif direction == "2b": length = min(width, height - i)
        line_slide_parabola(pixels, startPixel, pointInc, length, coeff2, None)

def sliding_paraboloid_background(pixels, width, height, radius, invert, doPresmooth, correctCorners=True):
    radius = F(radius)                                        # (float)radius
    coeff2 = F(0.5) / radius; coeff2diag = F(1) / radius
    if invert:
        for i in range(len(pixels)): pixels[i] = -pixels[i]
    shiftBy = F(0)
    if doPresmooth:
        shiftBy = F(bg_filter3x3(pixels, width, height, "max"))
        bg_filter3x3(pixels, width, height, "mean")
    if correctCorners: correct_corners(pixels, width, height, coeff2)
    for d, c in (("x", coeff2), ("y", coeff2), ("x", coeff2), ("1a", coeff2diag), ("1b", coeff2diag), ("2a", coeff2diag), ("2b", coeff2diag), ("1a", coeff2diag), ("1b", coeff2diag)):
        filter1d(pixels, width, height, d, c)
    if invert:
        for i in range(len(pixels)): pixels[i] = -(pixels[i] - shiftBy)
    elif doPresmooth:
        for i in range(len(pixels)): pixels[i] -= shiftBy

def subtract_background(px, W, H, p):                         # rollingBallBackground for a FloatProcessor, called as the plugin
    pixels = list(px)
    if p.get("parab"): sliding_paraboloid_background(pixels, W, H, p["radius"], bool(p.get("light")), p.get("smooth", True))
    else: rolling_ball_background(pixels, W, H, p["radius"], bool(p.get("light")), p.get("smooth", True))
    if p.get("create"): return pixels
    return [px[i] - pixels[i] for i in range(W * H)]          # snapshotPixels[p] - bgPixels[p]

# ---- Kurve's: the empty cells left out --------------------------------------------------------------------------------------
def gauss_skip(px, W, H, sx, sy, acc):
    a = [v if math.isfinite(v) else F(0) for v in px]; m = [F(1) if math.isfinite(v) else F(0) for v in px]
    A = gauss(a, W, H, sx, sy, acc); B = gauss(m, W, H, sx, sy, acc)
    return [A[i] / B[i] if math.isfinite(px[i]) else F("nan") for i in range(W * H)]

def rank_skip(px, W, H, radius, ftype):
    L = line_radii(radius); kHeight = (len(L) - 2) // 2; kRadius = L[-1]; out = []
    for y in range(H):
        for x in range(W):
            if not math.isfinite(px[y * W + x]): out.append(F("nan")); continue
            s = 0.0; s2 = 0.0; n = 0
            for i in range(kHeight):
                yy = min(max(y + i - kRadius, 0), H - 1)
                for dx in range(L[2 * i], L[2 * i + 1] + 1):
                    q = px[yy * W + min(max(x + dx, 0), W - 1)]
                    if math.isfinite(q): s += float(q); s2 += float(q) * float(q); n += 1
            if ftype == "mean": out.append(F(s / n))
            else:
                v = F((s2 - s * s / n) / n); out.append(F(0) if v < 0 else v)
    return out

# ---- the cases ------------------------------------------------------------------------------------------------------------
def to_image(case):                                         # Kurve's z (rows by rising Y unless ys falls) → ImageJ's pixels
    nx, ny, z = case["nx"], case["ny"], case["z"]; yrev = case["ys"][0] > case["ys"][-1]; xrev = case["xs"][0] > case["xs"][-1]
    px = []
    for py in range(ny):
        r = py if yrev else ny - 1 - py
        for qx in range(nx):
            c = nx - 1 - qx if xrev else qx
            v = z[r * nx + c]; px.append(F("nan") if v is None else F(v))
    return px, (lambda py: py if yrev else ny - 1 - py), (lambda qx: nx - 1 - qx if xrev else qx)

def run(case, p):
    W, H = case["nx"], case["ny"]; px, row, col = to_image(case); op = p["op"]
    if op in ("smooth", "sharpen", "edges"): r = filter3x3(px, W, H, op)
    elif op == "gauss":
        sx = p["sigma"]; sy = p.get("sy", sx)
        r = gauss_skip(px, W, H, sx, sy, 0.0002) if p.get("skip") else gauss(px, W, H, sx, sy, 0.0002)
    elif op == "unsharp": r = unsharp(px, W, H, p["sigma"], p["weight"], p.get("skip", False))
    elif op == "bg": r = subtract_background(px, W, H, p)
    elif op in ("mean", "median", "min", "max", "var"):
        r = rank_skip(px, W, H, p["radius"], op) if p.get("skip") and op in ("mean", "var") else rank(px, W, H, p["radius"], op)
    else: r = math_op(px, p["mop"], p.get("value"), p.get("lo"), p.get("hi"))
    z = [None] * (W * H)
    for py in range(H):
        for qx in range(W):
            v = float(r[py * W + qx])
            if op in ("min", "max") and abs(v) == FMAX: continue
            if math.isfinite(v): z[row(py) * W + col(qx)] = v
    return z

def main():
    rng = np.random.default_rng(20251120)
    cases = []
    def add(name, nx, ny, z, ops, xs=None, ys=None):
        cases.append({"name": name, "nx": nx, "ny": ny, "xs": xs or [float(i) for i in range(nx)], "ys": ys or [float(i) for i in range(ny)], "z": z, "ops": ops})
    rk = lambda r: [{"op": o, "radius": r} for o in ("mean", "median", "min", "max", "var")]
    base = [{"op": "smooth"}, {"op": "sharpen"}, {"op": "edges"},
            {"op": "gauss", "sigma": 0.7}, {"op": "gauss", "sigma": 1.3}, {"op": "gauss", "sigma": 2.5}, {"op": "gauss", "sigma": 1.0, "sy": 2.5},
            {"op": "unsharp", "sigma": 1.0, "weight": 0.6}, {"op": "unsharp", "sigma": 2.0, "weight": 0.9}]
    maths = [{"op": "math", "mop": m, "value": v} for (m, v) in (("add", 25.0), ("sub", 0.3), ("mul", 1.7), ("div", 3.0), ("div", 0.0), ("min", 0.5), ("max", 2.0), ("gamma", 0.5), ("gamma", 2.5))] + \
            [{"op": "math", "mop": m} for m in ("log", "exp", "sqr", "sqrt", "abs", "recip")] + [{"op": "math", "mop": "nan", "lo": -0.5, "hi": 1.5}]
    # 1. a field with offsets, values below zero, a zero, and empty cells (one alone, a row's end)
    nx, ny = 23, 17
    z = [round(float(math.sin(i * 0.37) * 2 + math.cos(i * 0.11) + rng.normal(0, 0.4)), 6) for i in range(nx * ny)]
    z[5 * nx + 7] = None; z[16 * nx + 20] = None; z[16 * nx + 21] = None; z[16 * nx + 22] = None; z[3 * nx + 3] = 0.0
    ops = base + [x for r in (0.5, 1, 1.5, 2, 2.5, 3.3) for x in rk(r)] + maths + \
        [{"op": "gauss", "sigma": 1.3, "skip": True}, {"op": "unsharp", "sigma": 1.0, "weight": 0.6, "skip": True}, {"op": "mean", "radius": 2, "skip": True}, {"op": "var", "radius": 1.5, "skip": True}]
    add("field with gaps", nx, ny, z, ops)
    # 2. the same values on falling Y and falling X (ImageJ's image then not turned the same way)
    add("falling axes", nx, ny, z, [{"op": "edges"}, {"op": "sharpen"}, {"op": "gauss", "sigma": 1.3}, {"op": "median", "radius": 1.5}, {"op": "var", "radius": 2}],
        xs=[float(nx - 1 - i) for i in range(nx)], ys=[float(ny - 1 - i) for i in range(ny)])
    # 3. a wide Gaussian, so ImageJ shrinks the lines: two spots on a slope with noise
    nx, ny = 41, 33
    z = []
    for r in range(ny):
        for c in range(nx):
            v = 100 + 0.8 * c + 0.3 * r + 900 * math.exp(-((c - 12) ** 2 + (r - 20) ** 2) / 8) + 400 * math.exp(-((c - 30) ** 2 + (r - 9) ** 2) / 18)
            z.append(round(float(v + rng.normal(0, 3)), 4))
    bgs = [{"op": "bg", "radius": r} for r in (3.0, 8.0, 12.0, 25.0, 50.0, 150.0)] + \
          [{"op": "bg", "radius": 6.0, "light": True}, {"op": "bg", "radius": 10.0, "create": True}, {"op": "bg", "radius": 10.0, "smooth": False}, {"op": "bg", "radius": 40.0, "light": True, "create": True}] + \
          [{"op": "bg", "radius": r, "parab": True} for r in (2.0, 5.0, 20.0, 80.0)] + \
          [{"op": "bg", "radius": 5.0, "parab": True, "light": True}, {"op": "bg", "radius": 8.0, "parab": True, "smooth": False}, {"op": "bg", "radius": 8.0, "parab": True, "create": True}]
    add("wide blur", nx, ny, z, bgs + [{"op": "gauss", "sigma": 9.0}, {"op": "gauss", "sigma": 12.5}, {"op": "gauss", "sigma": 20.0}, {"op": "gauss", "sigma": 4.0, "sy": 10.0},
                                {"op": "unsharp", "sigma": 10.0, "weight": 0.6}, {"op": "median", "radius": 6}, {"op": "mean", "radius": 6}, {"op": "var", "radius": 4}])
    # 4. a confocal scan of counts: Poisson spots, whole numbers with ties
    nx, ny = 32, 28
    lam = np.full((ny, nx), 3.0)
    for (cx, cy, a) in ((8, 7, 60), (20, 15, 90), (25, 22, 40), (9, 21, 25)):
        yy, xx = np.mgrid[0:ny, 0:nx]; lam += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / 4.5)
    z = [float(v) for v in rng.poisson(lam).ravel()]
    add("photon counts", nx, ny, z, [{"op": "bg", "radius": 4.0}, {"op": "bg", "radius": 4.0, "parab": True}, {"op": "bg", "radius": 25.0}, {"op": "smooth"}, {"op": "gauss", "sigma": 1.5}, {"op": "median", "radius": 1}, {"op": "median", "radius": 2},
                                    {"op": "min", "radius": 1.5}, {"op": "max", "radius": 2.5}, {"op": "var", "radius": 1}, {"op": "math", "mop": "sqrt"}, {"op": "math", "mop": "log"}])
    # 5. small and odd shapes: one column, one row, a block of empty cells
    add("a bright corner", 24, 19, [round(50 + 0.5 * c - 0.3 * r + (800 if (c < 3 and r < 3) else 0) + 30 * math.cos(c * 0.7) * math.sin(r * 0.5), 3) for r in range(19) for c in range(24)],
        [{"op": "bg", "radius": 4.0, "parab": True}, {"op": "bg", "radius": 4.0, "parab": True, "smooth": False}, {"op": "bg", "radius": 15.0, "parab": True, "light": True}, {"op": "bg", "radius": 6.0}])
    add("one row", 6, 1, [1.0, 4.0, 2.0, 8.0, 5.0, 7.0], [{"op": "smooth"}, {"op": "gauss", "sigma": 1.0}, {"op": "median", "radius": 2}, {"op": "var", "radius": 1}])
    add("one column", 1, 5, [3.0, 1.0, 4.0, 1.0, 5.0], [{"op": "smooth"}, {"op": "gauss", "sigma": 1.0}, {"op": "max", "radius": 1}])
    z = [float(i % 7) - 2.5 for i in range(10 * 8)]
    for r in (5, 6, 7):
        for c in range(10): z[r * 10 + c] = None
    add("unfinished scan", 10, 8, z, [{"op": "gauss", "sigma": 1.0}, {"op": "gauss", "sigma": 1.0, "skip": True}, {"op": "mean", "radius": 1}, {"op": "mean", "radius": 1, "skip": True},
                                     {"op": "median", "radius": 1}, {"op": "min", "radius": 2}, {"op": "edges"}, {"op": "var", "radius": 2, "skip": True}, {"op": "bg", "radius": 3.0}, {"op": "bg", "radius": 3.0, "smooth": False}])
    for c in cases:
        c["want"] = [run(c, p) for p in c["ops"]]
    out = {"about": "ImageJ 1.54f's Process menu on 32-bit images, written again from its source (tools/ref/ij_process.py)", "cases": cases}
    path = os.path.join(here, "fixtures", "ij-process.json")
    with open(path, "w") as fh: json.dump(out, fh, separators=(",", ":"))
    print(f"wrote {path}: {len(cases)} images, {sum(len(c['ops']) for c in cases)} operations")

if __name__ == "__main__": main()
