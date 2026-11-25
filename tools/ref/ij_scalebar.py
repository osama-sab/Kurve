"""ImageJ's Scale Bar, its numbers and the composite of channels (IMAGE_SPEC I.7): the reference for Kurve's ijScaleBar, ijRound125,
ijDigits, ijD2s, ijD2sSig, ijD2sHist and ijComposite, written again from ImageJ 1.54f's source (read as text; ImageJ itself is not
run here) into fixtures/ij-scalebar.json.

  ij.plugin.ScaleBar        computeDefaultBarWidth (80 screen pixels' worth, Utils.round down to 1, 2, 5, within 4 % to 67 % of
                            the image; the magnification counted no more than 1), setBackgroundBoxesPositions and setElementsPositions
                            for the four corners and the selection, horizontal and vertical bars, the text hidden or not, a
                            background or none (its inner margin); Utils.round and Utils.getDigits
  ij.IJ.d2s                 java.text.DecimalFormat with RoundingMode.HALF_EVEN on the double's exact value ("0.00", "0.0E0"),
                            here Python's Decimal of the float; d2s(x, significant, max digits); HistogramPlot.d2s
  ij.CompositeImage         updateImage in COMPOSITE mode with SUM, MAX and MIN projections, through
  ij.process.ImageProcessor updateComposite: SET_FIRST_CHANNEL, then each other channel added with Java's int arithmetic and each
                            component clamped (16711680, 65280, 255), or its greatest or least; FloatProcessor.create8BitImage for
                            each channel's index (an empty cell NaN: index 0); the lookup tables from fixtures/ij-display.json

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/ij_scalebar.py   (reads fixtures/ij-display.json, writes fixtures/ij-scalebar.json)
"""
import os, sys, json, math
from decimal import Decimal, ROUND_HALF_EVEN
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
f32 = np.float32
rng = np.random.default_rng(20261125)

def jint(x):
    if x != x: return 0
    if x >= 2147483647: return 2147483647
    if x <= -2147483648: return -2147483648
    return int(math.trunc(x))
def jround(x): return int(math.floor(x + 0.5))            # Math.round(double)

def d2s(x, d):                                              # IJ.d2s(double, int)
    if x != x: return "NaN"
    if math.isinf(x): return "Infinity" if x > 0 else "-Infinity"
    if x == float(f32(3.4028234663852886e38)): return "3.4e38"
    D = Decimal(x)
    if d < 0:
        k = min(9, -d)
        if D == 0: return ("-" if math.copysign(1, x) < 0 else "") + "0." + "0" * k + "E0"
        e = D.copy_abs().adjusted(); m = D.copy_abs().scaleb(-e).quantize(Decimal(1).scaleb(-k), ROUND_HALF_EVEN)
        if m >= 10: e += 1; m = (D.copy_abs().scaleb(-e)).quantize(Decimal(1).scaleb(-k), ROUND_HALF_EVEN)
        return ("-" if x < 0 else "") + format(m, "f") + "E" + str(e)
    d = max(0, min(9, d))
    q = D.quantize(Decimal(1).scaleb(-d), ROUND_HALF_EVEN)
    s = format(q.copy_abs(), "f")
    return ("-" if (x < 0 or (x == 0 and math.copysign(1, x) < 0)) else "") + s
def d2s_sig(x, sig, mx):                                    # IJ.d2s(double, int, int)
    lg = math.log10(abs(x)) if x != 0 else -math.inf
    mag = jint(math.ceil(lg + 0.223 * 10.0 ** (-mx))) if x != 0 else -2147483648
    dec = 0 if x == 0 else mx - mag
    if dec < 0 or mag < sig + 1 - mx: return d2s(x, -sig)
    if dec > sig: dec = max(sig, dec - mx + sig)
    return d2s(x, dec)
def d2s_hist(v): return d2s(v, 0) if jint(v) == v else d2s_sig(v, 3, 8)
def round125(x):                                            # ScaleBar.Utils.round
    base = 10.0 ** math.floor(math.log10(x) + 1e-8)
    return 5 * base if x > 4.999999 * base else 2 * base if x > 1.999999 * base else base
def digits_str(s):                                          # Utils.getDigits(String)
    pt = False; tot = 0; dec = 0
    for c in s:
        if c == ".": pt = True
        elif c in "eE":
            dd = -(tot - 1); return -1 if dd == 0 else dd
        elif "0" <= c <= "9":
            tot += 1
            if pt: dec += 1
    return dec
def digits(x):
    import re
    if abs(x) > 1000000 or abs(x) < 1e-4: return digits_str(re.sub(r"0+E", "E", d2s(x, -9), count=0))
    return digits_str(re.sub(r"0+\Z", "", d2s(x, 9)))

def tw_rule(fs): return lambda t: (len(t) * fs * 3) // 5    # the text's width: a rule both sides share (the font is the screen's)
def scalebar(o):
    W, H = o["W"], o["H"]; pw = o.get("pw") or 1.0; ph = o.get("ph") or 1.0; mag = min(1.0, o.get("mag") or 1.0)
    iw, ih = W * pw, H * ph
    def dflt(p, full):
        v = round125(80.0 * p / mag)
        if v > 0.67 * full: v = round125(0.67 * full)
        elif v < 0.04 * full: v = round125(0.04 * full)
        return v
    hw = o.get("width"); hd = o.get("wdig"); vh = o.get("height"); vd = o.get("hdig"); auto = {"h": False, "v": False}
    if hw is None or not (hw > 0) or hw < 0.01 * iw or hw > 0.67 * iw: hw = dflt(pw, iw); hd = digits(hw); auto["h"] = True
    elif hd is None: hd = digits(hw)
    if vh is None or not (vh > 0) or vh < 0.01 * ih or vh > 0.67 * ih: vh = dflt(ph, ih); vd = digits(vh); auto["v"] = True
    elif vd is None: vd = digits(vh)
    thick = o.get("thick", 4); fs = o.get("font", 14); horiz = o.get("horiz", True); vert = o.get("vert", False); hide = o.get("hide", False)
    tw = tw_rule(fs); unit = o.get("unit") or "pixels"; vunit = o.get("vunit") or unit
    hl = d2s(hw, hd) + " " + unit; vl = d2s(vh, vd) + " " + vunit
    hpx = jint(jround(hw / pw)); vpx = jint(jround(vh / ph)); loc = o.get("loc", "lr")
    upper = loc in ("ur", "ul"); right = loc in ("lr", "ur")
    hbw = max(hpx, 0 if hide else tw(hl)) if horiz else 0
    hbh = thick + jint((0 if hide else fs) * 1.25) if horiz else 0
    vbw = thick + jint((0 if hide else fs) * 1.25) if vert else 0
    vbh = max(vpx, 0 if hide else tw(vl)) if vert else 0
    outer = (W + H) // 100; inner = max(max(hbw, vbh) // 20, 2) if o.get("bg") else 0; htt = vert and upper
    hb = dict(x=0, y=0, w=inner + hbw + inner, h=inner + hbh + inner); vb = dict(x=0, y=0, w=inner + vbw + inner, h=inner + vbh + inner)
    if loc == "ur":
        hb["x"] = W - outer - inner - vbw + (thick if vert else 0) - hbw - inner; hb["y"] = outer
        vb["x"] = W - outer - inner - vbw - inner; vb["y"] = outer + (hbh - thick if htt else 0); hb["w"] += vbw - thick if vert else 0
    elif loc == "lr":
        hb["x"] = W - outer - inner - vbw - hbw + (thick if vert else 0) - inner; hb["y"] = H - outer - inner - hbh - inner
        vb["x"] = W - outer - inner - vbw - inner; vb["y"] = H - outer - inner - hbh + (thick if horiz else 0) - vbh - inner
        vb["h"] += hbh - thick if horiz else 0
    elif loc == "ul":
        hb["x"] = outer + (vb["w"] - 2 * inner - thick if vert else 0); hb["y"] = outer; vb["x"] = outer; vb["y"] = outer + (hbh - thick if htt else 0)
        hb["w"] += vbw - thick if vert else 0; hb["x"] -= vbw - thick if vert else 0
    elif loc == "ll":
        hb["x"] = outer + (vb["w"] - 2 * inner - thick if vert else 0); hb["y"] = H - outer - inner - hbh - inner
        vb["x"] = outer; vb["y"] = H - outer - inner - hbh + (thick if horiz else 0) - vbh - inner; vb["h"] += hbh - thick if horiz else 0
    else:
        hb["x"] = vb["x"] = o["sel"]["x"]; hb["y"] = vb["y"] = o["sel"]["y"]
    sh = vbw - thick if (vert and not right and upper) else 0; htw = 0 if hide else tw(hl); vth = 0 if hide else tw(vl)
    def idiv(a, b): return int(a / b) if a >= 0 else -int(-a / b)    # Java's int division
    hbar = dict(x=hb["x"] + inner + idiv(hbw - hpx, 2) + sh, y=hb["y"] + inner + (hbh - thick if htt else 0), w=hpx, h=thick)
    htx = dict(x=hb["x"] + inner + idiv(hbw - htw, 2) + sh, y=(hb["y"] + inner - jround(fs * 0.25)) if htt else hbar["y"] + hbar["h"], w=htw, h=0 if hide else fs)
    vbar = dict(x=vb["x"] + (inner if right else vb["w"] - thick - inner), w=thick, h=vpx); vbar["y"] = vb["y"] + inner + idiv(vbh - vpx, 2)
    vtx = dict(h=vth, w=0 if hide else fs, x=vbar["x"] + vbar["w"] if right else vbar["x"] - vbw + thick - jround(fs * 0.25), y=vb["y"] + inner + idiv(vbh - vth, 2))
    return dict(hw=hw, hd=hd, vh=vh, vd=vd, hLabel=hl, vLabel=vl, hPx=hpx, vPx=vpx, hBar=hbar, hText=htx, vBar=vbar, vText=vtx, hBg=hb, vBg=vb, outer=outer, inner=inner, auto=auto)

# ---- the numbers ----
nums = []
ties = [0.125, 2.5, 3.5, 0.5, 1.5, -2.5, 0.375, 1.0625, 1234.5, 0.03125, 6.25e-3, 1.005, 2.675, 1e-7, 123456789.125]
for x in ties + list(rng.normal(0, 1, 60)) + list(10.0 ** rng.uniform(-8, 9, 60)) + list(-(10.0 ** rng.uniform(-6, 7, 20))) + [0.0, 1.0, 999999.5, 1e6, 2e-5, 5e-5, 0.0001]:
    x = float(x)
    for d in (-9, -4, -2, -1, 0, 1, 2, 3, 5, 9): nums.append([x, d, d2s(x, d)])
hist = [[float(v), d2s_hist(float(v))] for v in ties + list(rng.normal(50, 30, 30)) + list(10.0 ** rng.uniform(-6, 10, 40)) + [0.0, 42.0, 1e9, 0.5, 255.0, 256.0 / 3, -17.25]]
r125 = [[float(v), round125(float(v)), digits(round125(float(v)))] for v in list(10.0 ** rng.uniform(-9, 9, 80)) + [1.999999, 4.999999, 5, 2, 1, 0.67 * 8.0, 0.67 * 64 * 0.125, 3e7, 2e-5]]

# ---- the bars ----
bars = []
for W, H, pw, ph, unit in [(64, 64, 0.125, 0.125, "µm"), (512, 512, 0.0390625, 0.0390625, "µm"), (1000, 700, 1.0, 1.0, ""), (30, 20, 2.5, 2.5, "mm"),
                           (2048, 1536, 1e-6, 1e-6, "m"), (100, 300, 0.3333, 0.25, "µm"), (640, 480, 1500.0, 1500.0, "km"), (17, 5, 1 / 3, 1 / 3, "µm")]:
    for mag in (8.0, 1.0, 0.5, 0.25):
        for width in (None, 0.0, W * pw * 0.2, W * pw * 0.005, W * pw * 0.9):
            o = dict(W=W, H=H, pw=pw, ph=ph, unit=unit, mag=mag, width=width)
            bars.append([o, scalebar(o)])
    for loc in ("lr", "ur", "ll", "ul", "sel"):
        for horiz, vert in ((True, False), (False, True), (True, True)):
            for hide in (False, True):
                for bg in (False, True):
                    o = dict(W=W, H=H, pw=pw, ph=ph, unit=unit, vunit=unit or None, mag=1.0, loc=loc, horiz=horiz, vert=vert, hide=hide, bg=bg,
                             thick=[4, 1, 9][(W + H) % 3], font=[14, 9, 22][(W * 7) % 3], sel=dict(x=W // 3, y=H // 4))
                    bars.append([o, scalebar(o)])
    o = dict(W=W, H=H, pw=pw, ph=ph, unit=unit, mag=1.0, width=round(W * pw * 0.25, 3), wdig=3)
    bars.append([o, scalebar(o)])
    for loc in ("lr", "ur", "ll", "ul"):                    # wide bars in a box: its inner margin a twentieth of the widest
        o = dict(W=W, H=H, pw=pw, ph=ph, unit=unit, mag=1.0, loc=loc, bg=True, vert=True, width=W * pw * 0.6, height=H * ph * 0.55)
        bars.append([o, scalebar(o)])

# ---- the composites ----
DISP = json.load(open(os.path.join(here, "fixtures", "ij-display.json")))
LUTS = DISP["luts"]
def index8(z, mn, mx):                                      # FloatProcessor.create8BitImage, a cell at a time (empty: NaN, index 0)
    sc = f32(255.0) / (f32(mx) - f32(mn)) if mx != mn else None; out = []
    for v in z:
        if v is None or v != v: out.append(0); continue
        d = float(f32(v)) - mn
        if d < 0: d = 0.0
        if sc is None: out.append(0 if d == 0 else 255); continue
        t = d * (255.0 / (mx - mn)) + 0.5; k = jint(t); out.append(255 if k > 255 else k)
    return out
def composite(chs, n, mode):
    reds = [[(L[3 * i] & 0xff) << 16 for i in range(256)] for L in (c["lut"] for c in chs)]
    grns = [[(L[3 * i + 1] & 0xff) << 8 for i in range(256)] for L in (c["lut"] for c in chs)]
    blus = [[L[3 * i + 2] & 0xff for i in range(256)] for L in (c["lut"] for c in chs)]
    idx = [index8(c["z"], c["lo"], c["hi"]) for c in chs]; act = [c.get("on", True) for c in chs]
    px = [0] * n
    if act[0]:
        for i in range(n): b = idx[0][i]; px[i] = reds[0][b] | grns[0][b] | blus[0][b]
    else:
        fill = 0xffffff if mode == "min" else 0
        for i in range(n): px[i] = fill                     # ImageJ starts this fill at 1, leaving the first pixel as it was: filled here, as Kurve does
    for k in range(1, len(chs)):
        if not act[k]: continue
        for i in range(n):
            p = px[i]; b = idx[k][i]
            if mode == "sum":
                r = (p & 0x00ff0000) + reds[k][b]; g = (p & 0x0000ff00) + grns[k][b]; bl = (p & 0xff) + blus[k][b]
                if r > 16711680: r = 16711680
                if g > 65280: g = 65280
                if bl > 255: bl = 255
                px[i] = r | g | bl
            elif mode == "max":
                r = reds[k][b] & 0x00ff0000
                if r > (p & 0x00ff0000): px[i] = (px[i] & 0xff00ffff) | r
                g = grns[k][b] & 0x0000ff00
                if g > (p & 0x0000ff00): px[i] = (px[i] & 0xffff00ff) | g
                bl = blus[k][b] & 0xff
                if bl > (p & 0xff): px[i] = (px[i] & 0xffffff00) | bl
            else:
                r = reds[k][b] & 0x00ff0000
                if r < (p & 0x00ff0000): px[i] = (px[i] & 0xff00ffff) | r
                g = grns[k][b] & 0x0000ff00
                if g < (p & 0x0000ff00): px[i] = (px[i] & 0xffff00ff) | g
                bl = blus[k][b] & 0xff
                if bl < (p & 0xff): px[i] = (px[i] & 0xffffff00) | bl
    return [v & 0xffffff for v in px]
comps = []
def chan(z, lut, lo=None, hi=None, on=True):
    vals = [float(f32(v)) for v in z if v is not None]
    return dict(z=z, lut=LUTS[lut], lo=min(vals) if lo is None else lo, hi=max(vals) if hi is None else hi, on=on, name=lut)
nv = DISP["cases"][0]; n = nv["nx"] * nv["ny"]
spots = [float(v) for v in rng.poisson(20, n)]; ramp = [float(i % nv["nx"]) for i in range(n)]
holes = [None if rng.uniform() < 0.1 else float(v) for v in rng.normal(100, 30, n)]
sets = [("red, green, blue", [chan(nv["z"], "red"), chan(spots, "green"), chan(ramp, "blue")]),
        ("three channels on one colour, summed past 255", [chan(nv["z"], "magenta"), chan(spots, "magenta"), chan(ramp, "yellow")]),
        ("a range set by hand, values past it", [chan(nv["z"], "red", 5000, 20000), chan(holes, "cyan", 60, 140)]),
        ("empty cells, fire and grays", [chan(holes, "fire"), chan(spots, "grays")]),
        ("the first channel off", [chan(nv["z"], "red", on=False), chan(spots, "green"), chan(ramp, "blue")]),
        ("one value", [chan([3.0] * n, "red", 3, 3), chan(spots, "blue")])]
for name, chs in sets:
    for mode in ("sum", "max", "min"):
        if mode != "sum" and name not in ("red, green, blue", "the first channel off", "three channels on one colour, summed past 255"): continue
        px = composite(chs, n, mode)
        comps.append(dict(name=name, mode=mode, n=n, chs=[dict(z=c["z"], lut=c["name"], lo=c["lo"], hi=c["hi"], on=c["on"]) for c in chs], px=px))
out = dict(nums=nums, hist=hist, r125=r125, bars=bars, comps=comps)
json.dump(out, open(os.path.join(here, "fixtures", "ij-scalebar.json"), "w"), separators=(",", ":"))
print(f"{len(nums)} numbers, {len(hist)} histogram numbers, {len(r125)} roundings, {len(bars)} bars, {len(comps)} composites")
print("wrote fixtures/ij-scalebar.json")
