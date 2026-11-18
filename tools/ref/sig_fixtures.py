"""Reference values for wave 5, signal processing and mathematics (ux/spec/SIGNAL_SPEC.md), made by NumPy, SciPy
and PyWavelets.

    PYREF=… python3.13 -I tools/ref/sig_fixtures.py [--check] [--only sig-fft,…]

Writes tools/ref/fixtures/sig-<slice>.json, each {"made": {...versions...}, "cases": [...]}, every case
{"fn": Kurve's function, "name", "args": [...], "want": the reference's answer, "kind": how ref-test.mjs compares it}:

    vec    an array, each value's error over the largest |value| of the reference
    cvec   {re, im} arrays, the same over the largest modulus
    obj    an object of arrays and numbers, each key judged as `vec` (or relative, for a number) under fn.key

Kept apart from make-fixtures.py so a slice's references are made in seconds; the same --check (every case made again
and compared with the committed file to 1e-13 relative). Inputs come from fixed seeds, rounded to 6 significant digits so
the files stay small.
"""
import json, math, os, sys, platform, datetime

here = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
check = "--check" in args
if os.environ.get("PYREF"):
    sys.path.insert(0, os.environ["PYREF"])
import numpy as np
import scipy
from scipy import signal
try:
    import pywt
except ImportError:
    pywt = None

MADE = {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__,
        "pywt": getattr(pywt, "__version__", None), "by": "tools/ref/sig_fixtures.py"}

def j(v):
    if isinstance(v, dict): return {k: j(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)): return [j(x) for x in v]
    if isinstance(v, np.ndarray): return j(v.tolist())
    if isinstance(v, (np.floating, float)):
        v = float(v); return v if math.isfinite(v) else ("NaN" if v != v else ("Infinity" if v > 0 else "-Infinity"))
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, np.bool_): return bool(v)
    return v

def r6(a): return [float(f"{float(v):.6g}") for v in a]
out = {}

# ---- 5.1 the transform, windows, spectra ----
cases = []
rng = np.random.default_rng(20261118)
def mixed(n):  # values spread over a few orders of magnitude, signs mixed
    return r6(rng.normal(0, 1, n) * 10 ** rng.uniform(-2, 2, n))
lengths = list(range(1, 41)) + [48, 64, 97, 100, 127, 128, 255, 256, 257, 509, 1000, 1009]
for n in lengths:
    re, im = mixed(n), mixed(n)
    X = np.fft.fft(np.array(re) + 1j * np.array(im))
    cases.append({"fn": "fftC", "name": f"fft of {n}", "args": [re, im, n, False], "want": {"re": X.real, "im": X.imag}, "kind": "cvec"})
    if n in (7, 64, 97, 1000):
        Y = np.fft.ifft(np.array(re) + 1j * np.array(im))
        cases.append({"fn": "fftC", "name": f"ifft of {n}", "args": [re, im, n, True], "want": {"re": Y.real, "im": Y.imag}, "kind": "cvec"})
for n, N in ((10, 16), (100, 128), (31, 50), (12, 7)):
    re = mixed(n); X = np.fft.fft(np.array(re), N)
    cases.append({"fn": "fftC", "name": f"fft of {n} at length {N}", "args": [re, None, N, False], "want": {"re": X.real, "im": X.imag}, "kind": "cvec"})
for n in (1, 2, 5, 8, 33, 100, 255):
    y = mixed(n); X = np.fft.rfft(np.array(y))
    cases.append({"fn": "rfft", "name": f"rfft of {n}", "args": [y], "want": {"re": X.real, "im": X.imag}, "kind": "cvec"})
for m, N in ((5, None), (5, 9), (33, 64), (33, 65), (17, 20), (17, 40)):
    re, im = mixed(m), mixed(m); Z = np.array(re) + 1j * np.array(im)
    cases.append({"fn": "irfft", "name": f"irfft of {m} to {N or 2 * (m - 1)}", "args": [re, im, N], "want": np.fft.irfft(Z, N), "kind": "vec"})
for N, d in ((8, 0.1), (9, 0.5), (1000, 1e-3), (17, 2.5)):
    cases.append({"fn": "fftFreq", "name": f"fftfreq {N}", "args": [N, d, False], "want": np.fft.fftfreq(N, d), "kind": "vec"})
    cases.append({"fn": "fftFreq", "name": f"rfftfreq {N}", "args": [N, d, True], "want": np.fft.rfftfreq(N, d), "kind": "vec"})
# windows, as scipy.signal.get_window makes them
wins = [("boxcar", None), ("hann", None), ("hamming", None), ("blackman", None), ("blackmanharris", None), ("flattop", None),
        ("bartlett", None), ("kaiser", 0.0), ("kaiser", 5.0), ("kaiser", 8.6), ("kaiser", 14.0), ("tukey", 0.0), ("tukey", 0.25),
        ("tukey", 0.5), ("tukey", 1.0), ("gaussian", 2.5), ("gaussian", 7.0)]
for kind, par in wins:
    for M in (1, 2, 3, 7, 8, 51, 256):
        for sym in (False, True):
            spec = kind if par is None else (kind, par)
            w = signal.get_window(spec, M, fftbins=not sym)
            cases.append({"fn": "sigWindow", "name": f"{kind} {par} M {M} {'symmetric' if sym else 'periodic'}", "args": [kind, M, par, sym], "want": w, "kind": "vec"})
from scipy import special
for x in [0, 1e-8, 0.5, 1, 2.5, 7.9, 8, 8.1, 12, 30, 100, 300, 700]:
    cases.append({"fn": "besselI0", "name": f"I0({x})", "args": [x], "want": float(special.i0(x)), "kind": "rel"})
for n in (1, 2, 3, 10, 101):
    y = mixed(n)
    for kind in ("constant", "linear"):
        cases.append({"fn": "detrendV", "name": f"detrend {kind} of {n}", "args": [y, kind], "want": signal.detrend(np.array(y), type=kind), "kind": "vec", "scale": max(abs(v) for v in y)})
ph = np.cumsum(rng.normal(0, 2.2, 300)); wr = np.angle(np.exp(1j * ph))
cases.append({"fn": "unwrapV", "name": "unwrap of a wandering phase", "args": [wr.tolist()], "want": np.unwrap(wr), "kind": "vec"})
edge = [0.0, math.pi, 0.0, -math.pi, math.pi, 3.0, -3.0, 3.1, -3.1, 2 * math.pi, 0.5]
cases.append({"fn": "unwrapV", "name": "unwrap at ±π exactly", "args": [edge], "want": np.unwrap(np.array(edge)), "kind": "vec"})
# periodograms: SciPy's spectrum and density, each window, detrend, padding, sides; the amplitude from numpy.fft
def sine_set(n, fs, comps, noise, off=0.0, slope=0.0):
    t = np.arange(n) / fs
    y = off + slope * t + sum(A * np.sin(2 * np.pi * f * t + p) for A, f, p in comps) + rng.normal(0, noise, n)
    return r6(y)
specs = [("sines on a slope", sine_set(500, 100.0, [(3, 10, 0.3), (0.5, 23.7, 1)], 0.1, 2, 0.4), 100.0),
         ("odd length", sine_set(257, 8.0, [(1, 1.5, 0)], 0.05, 0.3), 8.0),
         ("short", sine_set(12, 1.0, [(1, 0.25, 0)], 0.01), 1.0)]
for nm, y, fs in specs:
    n = len(y)
    pad = 2 ** math.ceil(math.log2(n)) if n & (n - 1) else None
    for win, par, det, padded, sides in (("boxcar", None, "none", False, 1), ("hann", None, "constant", False, 1), ("flattop", None, "linear", True, 1),
                                         ("kaiser", 8.6, "none", False, 2), ("tukey", 0.3, "constant", True, 2), ("hamming", None, "linear", False, 1)):
        wspec = win if par is None else (win, par); N = (pad if padded and pad else n)
        w = signal.get_window(wspec, n)
        dd = False if det == "none" else det
        f, pd = signal.periodogram(np.array(y), fs, window=w, nfft=N, detrend=dd, return_onesided=sides == 1, scaling="density")
        _, ps = signal.periodogram(np.array(y), fs, window=w, nfft=N, detrend=dd, return_onesided=sides == 1, scaling="spectrum")
        yd = np.array(y) if det == "none" else signal.detrend(np.array(y), type=det)
        X = np.fft.fft(yd * w, N)
        if sides == 1: X = X[: N // 2 + 1]
        amp = np.abs(X) / w.sum()
        if sides == 1: amp[1:(None if N % 2 else -1)] *= 2
        # the phase where |X| is at least 1 % of the largest (its error is rounding over |X|, so smaller bins cannot hold 1e-12;
        # the real and imaginary parts are judged everywhere); elsewhere null
        ph = [float(a) if abs(z) >= 1e-2 * np.max(np.abs(X)) else None for a, z in zip(np.angle(X), X)]
        want = {"f": f, "psd": pd, "pow": ps, "amp": amp, "re": X.real, "im": X.imag, "phase": ph}
        cases.append({"fn": "spectrum", "name": f"periodogram: {nm}, {win} {par}, {det}, N {N}, {sides} side{'s' if sides == 2 else ''}",
                      "args": [y, fs, {"win": win, "wpar": par, "nfft": N, "detrend": det, "sides": sides}], "want": want, "kind": "obj"})
# a shifted two-sided one
y = specs[0][1]; w = signal.get_window("hann", 500); f, pd = signal.periodogram(np.array(y), 100.0, window=w, return_onesided=False, detrend=False)
cases.append({"fn": "spectrum", "name": "periodogram: shifted two sides", "args": [y, 100.0, {"win": "hann", "sides": 2, "shift": True, "detrend": "none"}],
              "want": {"f": np.fft.fftshift(f), "psd": np.fft.fftshift(pd)}, "kind": "obj"})
# Welch
long = sine_set(1200, 1000.0, [(2, 50, 0), (0.2, 120, 0.5)], 0.5, 1.0)
for nm, y, fs in [("two sines in noise", long, 1000.0), ("sines on a slope", specs[0][1], 100.0), ("odd length", specs[1][1], 8.0)]:
    for win, par, nseg, over, det, sc, avg, sides in [("hann", None, None, None, "constant", "density", "mean", 1),
            ("hann", None, 128, 100, "linear", "spectrum", "mean", 1), ("hamming", None, 200, 0, "constant", "density", "median", 1),
            ("kaiser", 5.0, 64, 32, False, "density", "mean", 2), ("boxcar", None, 1000, 500, "constant", "spectrum", "median", 1),
            ("blackman", None, 101, 50, "constant", "density", "mean", 1)]:
        kw = dict(window=win if par is None else (win, par), detrend=det, scaling=sc, average=avg, return_onesided=sides == 1)
        if nseg: kw["nperseg"] = nseg
        if over is not None: kw["noverlap"] = over
        import warnings
        o = {"win": win, "wpar": par, "nseg": nseg, "over": over, "detrend": det if det else "none", "scaling": sc, "avg": avg, "sides": sides}
        name = f"welch: {nm}, {win}, {nseg}, {over}, {det}, {sc}, {avg}, {sides}"
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                f, P = signal.welch(np.array(y), fs, **kw)
        except ValueError as e:  # SciPy refuses: Kurve must refuse in words too
            cases.append({"fn": "welch", "name": name + " (refused)", "args": [y, fs, o], "want": {"fail": str(e)}, "kind": "fail"}); continue
        cases.append({"fn": "welch", "name": name, "args": [y, fs, o], "want": {"f": f, "p": P}, "kind": "obj"})
out["sig-fft"] = cases

# ---- 5.2 filters designed: SciPy's iirfilter section by section ("nearest" pairing), its response, sosfilt and sosfiltfilt,
# firwin and filtfilt, iirnotch; its refusals ----
cases = []
rng = np.random.default_rng(20261119)
def sig_x(n):
    t = np.arange(n)
    return r6(np.sin(2 * np.pi * 0.01 * t) + 0.5 * np.sin(2 * np.pi * 0.21 * t + 0.3) + 0.3 * rng.normal(0, 1, n) + 0.002 * t)
ws = np.linspace(0, np.pi, 97)
designs = []
for kind in ("butter", "cheby1", "cheby2", "ellip", "bessel"):
    for band, Wn in (("low", 0.2), ("high", 0.35), ("pass", (0.1, 0.3)), ("stop", (0.15, 0.4))):
        for N in ((1, 2, 3, 4, 5, 8, 12, 20) if kind == "butter" else (1, 2, 3, 4, 7, 10) if kind != "bessel" else (1, 2, 3, 4, 6, 9, 12)):
            designs.append((kind, band, N, Wn, 1.0, 40.0))
designs += [("ellip", "low", 6, 0.05, 0.1, 80.0), ("cheby1", "low", 6, 0.9, 3.0, 40.0), ("cheby2", "high", 5, 0.02, 1.0, 60.0), ("butter", "low", 4, 0.001, 1, 40), ("butter", "pass", 4, (0.45, 0.55), 1, 40)]
btype = {"low": "lowpass", "high": "highpass", "pass": "bandpass", "stop": "bandstop"}
for kind, band, N, Wn, rp, rs in designs:
    two = band in ("pass", "stop")
    o = {"kind": kind, "band": band, "order": N, "w1": Wn[0] if two else Wn, "w2": Wn[1] if two else None, "rp": rp, "rs": rs}
    nm = f"{kind} {band} N {N} Wn {Wn}"
    sos = signal.iirfilter(N, Wn, rp=rp, rs=rs, btype=btype[band], ftype=kind, output="sos")
    _, H = signal.sosfreqz(sos, worN=ws)
    cases.append({"fn": "iirSos", "name": nm, "args": [o], "want": sos.ravel(), "kind": "sos"})
    cases.append({"fn": "iirFreq", "name": nm, "args": [o, ws.tolist()], "want": {"re": H.real, "im": H.imag}, "kind": "cvec"})
for o, why in (({"kind": "butter", "band": "low", "order": 4, "w1": 1.0}, (4, 1.0, "lowpass")), ({"kind": "butter", "band": "pass", "order": 4, "w1": 0.3, "w2": 0.2}, (4, (0.3, 0.2), "bandpass"))):
    try: signal.iirfilter(why[0], why[1], btype=why[2], output="sos"); msg = None
    except ValueError as e: msg = str(e)
    if msg: cases.append({"fn": "iirSos", "name": f"refused: {why}", "args": [o], "want": {"fail": msg}, "kind": "fail"})
# filtering, on SciPy's own sections, so the filter is judged apart from the design
x = sig_x(600)
for kind, band, N, Wn in (("butter", "lowpass", 4, 0.1), ("cheby1", "highpass", 6, 0.3), ("ellip", "bandpass", 4, (0.1, 0.25)), ("bessel", "bandstop", 5, (0.15, 0.3)), ("butter", "lowpass", 12, 0.05)):
    sos = signal.iirfilter(N, Wn, rp=1, rs=40, btype=kind != "x" and band, ftype=kind, output="sos")
    cases.append({"fn": "sosfiltfilt", "name": f"sosfiltfilt {kind} {band} {N}", "args": [sos.tolist(), x], "want": signal.sosfiltfilt(sos, np.array(x)), "kind": "vec", "scale": max(abs(v) for v in x)})
    cases.append({"fn": "sosfilt", "name": f"sosfilt {kind} {band} {N}", "args": [sos.tolist(), x, None], "want": {"y": signal.sosfilt(sos, np.array(x))}, "kind": "obj", "scale": max(abs(v) for v in x)})
    cases.append({"fn": "sosfiltZi", "name": f"sosfilt_zi {kind} {band} {N}", "args": [sos.tolist()], "want": signal.sosfilt_zi(sos).ravel(), "kind": "flat"})
short = x[:20]; sos = signal.butter(8, 0.2, output="sos")
try: signal.sosfiltfilt(sos, np.array(short)); msg = None
except ValueError as e: msg = str(e)
cases.append({"fn": "sosfiltfilt", "name": "refused: too short to pad", "args": [sos.tolist(), short], "want": {"fail": msg}, "kind": "fail"})
for taps, cut, band, win in ((31, 0.2, "low", "hamming"), (51, 0.3, "high", "hamming"), (101, (0.1, 0.2), "pass", "hamming"), (61, (0.2, 0.35), "stop", "blackman"), (3, 0.5, "low", "hamming"), (201, 0.02, "low", "hann"), (40, 0.25, "low", "hamming")):
    pz = {"low": "lowpass", "high": "highpass", "pass": "bandpass", "stop": "bandstop"}[band]
    b = signal.firwin(taps, cut, window=win, pass_zero=pz)
    cases.append({"fn": "firwin", "name": f"firwin {taps} {cut} {band} {win}", "args": [taps, list(cut) if isinstance(cut, tuple) else cut, {"band": band, "win": win}], "want": {"b": b}, "kind": "obj"})
    if taps < 100:
        cases.append({"fn": "filtfilt", "name": f"filtfilt FIR {taps} {band}", "args": [b.tolist(), [1.0], x], "want": signal.filtfilt(b, [1.0], np.array(x)), "kind": "vec", "scale": max(abs(v) for v in x)})
try: signal.firwin(40, 0.3, pass_zero="highpass"); msg = None
except ValueError as e: msg = str(e)
cases.append({"fn": "firwin", "name": "refused: even taps, high-pass", "args": [40, 0.3, {"band": "high"}], "want": {"fail": msg}, "kind": "fail"})
for w0, Q in ((0.1, 30), (0.5, 5), (0.02, 50), (0.9, 10)):
    b, a = signal.iirnotch(w0, Q)
    cases.append({"fn": "iirNotch", "name": f"iirnotch {w0} Q {Q}", "args": [w0, Q], "want": {"b": b, "a": a}, "kind": "obj"})
    cases.append({"fn": "filtfilt", "name": f"filtfilt notch {w0} Q {Q}", "args": [b.tolist(), a.tolist(), x], "want": signal.filtfilt(b, a, np.array(x)), "kind": "vec", "scale": max(abs(v) for v in x)})
    cases.append({"fn": "lfilter", "name": f"lfilter notch {w0} Q {Q}", "args": [b.tolist(), a.tolist(), x, None], "want": signal.lfilter(b, a, np.array(x)), "kind": "vec", "scale": max(abs(v) for v in x)})
for b, a in (([0.2, 0.3, 0.1], [1.0, -0.5, 0.25]), ([1.0, 2.0, 3.0, 4.0], [1.0, 0.1, -0.2, 0.05]), ([0.5, 0.5], [1.0])):
    cases.append({"fn": "lfilterZi", "name": f"lfilter_zi {b} {a}", "args": [b, a], "want": signal.lfilter_zi(b, a), "kind": "vec"})
out["sig-filt"] = cases

# ---- 5.3 correlation and convolution: numpy.correlate and numpy.convolve (direct below 2·10⁶ products, by the FFT above), the
# normalisations by their definitions, scipy.signal.csd and coherence, the mirrored convolution as numpy.pad("symmetric") then
# "valid", and Wiener's deconvolution written from its definition with Kurve's padding ----
cases = []
rng = np.random.default_rng(20261120)
def rv(n, sc=1.0): return r6(rng.normal(0, sc, n))
for na, nb in ((1, 1), (5, 3), (3, 5), (40, 40), (100, 7), (7, 100), (2500, 1000), (1000, 2500)):
    a, b = rv(na), rv(nb)
    sc = max(1.0, float(np.max(np.abs(a))) * float(np.max(np.abs(b))) * min(na, nb))
    cases.append({"fn": "correlateFull", "name": f"correlate {na} with {nb}", "args": [a, b], "want": np.correlate(a, b, "full"), "kind": "vec"})
    cases.append({"fn": "convFull", "name": f"convolve {na} with {nb}", "args": [a, b], "want": np.convolve(a, b, "full"), "kind": "vec"})
    cases.append({"fn": "convSame", "name": f"convolve same {na} with {nb}", "args": [a, b], "want": np.convolve(a, b, "same"), "kind": "vec"})
def corr_ref(a, b, norm, demean, maxlag):
    A = np.array(a, float); B = np.array(b if b is not None else a, float)
    if demean: A = A - A.mean(); B = B - B.mean()
    c = np.correlate(A, B, "full"); k = np.arange(-(len(B) - 1), len(A))
    if norm == "biased": c = c / max(len(A), len(B))
    elif norm == "unbiased": c = c / np.array([max(1, min(len(B), len(A) - kk) - max(0, -kk)) for kk in k])
    elif norm == "coeff": c = c / math.sqrt(float(np.sum(A * A)) * float(np.sum(B * B)))
    keep = np.abs(k) <= (maxlag if maxlag is not None else 10 ** 9)
    return {"k": k[keep].tolist(), "c": c[keep]}
x = np.cumsum(rng.normal(0, 1, 300)); y2 = np.roll(x, 7) + rng.normal(0, 0.1, 300)
for norm in ("none", "biased", "unbiased", "coeff"):
    for b, dm, ml in ((None, True, None), (r6(y2), True, 50), (r6(y2[:180]), False, None)):
        cases.append({"fn": "correlate", "name": f"correlate {norm} {'auto' if b is None else len(b)} demean {dm} maxlag {ml}", "args": [r6(x), b, {"norm": norm, "demean": dm, "maxlag": ml}],
                      "want": corr_ref(r6(x), b, norm, dm, ml), "kind": "obj"})
# csd and coherence
t = np.arange(2000) / 100.0; u = np.sin(2 * np.pi * 5 * t) + rng.normal(0, 1, 2000); v = np.sin(2 * np.pi * 5 * t + 0.7) * 2 + rng.normal(0, 1, 2000)
for win, nseg, over, det, avg in (("hann", None, None, "constant", "mean"), ("hamming", 200, 50, "linear", "mean"), ("hann", 128, 64, "constant", "median")):
    kw = dict(window=win, detrend=det, average=avg)
    if nseg: kw["nperseg"] = nseg
    if over is not None: kw["noverlap"] = over
    f, P = signal.csd(np.array(r6(u)), np.array(r6(v)), 100.0, **kw)
    cases.append({"fn": "csd", "name": f"csd {win} {nseg} {over} {det} {avg}", "args": [r6(u), r6(v), 100.0, {"win": win, "nseg": nseg, "over": over, "detrend": det, "avg": avg}], "want": {"f": f, "re": P.real, "im": P.imag}, "kind": "obj"})
    if avg == "mean":
        f, C = signal.coherence(np.array(r6(u)), np.array(r6(v)), 100.0, window=win, nperseg=nseg, noverlap=over, detrend=det)
        cases.append({"fn": "coherence", "name": f"coherence {win} {nseg} {over} {det}", "args": [r6(u), r6(v), 100.0, {"win": win, "nseg": nseg, "over": over, "detrend": det}], "want": {"f": f, "coh": C}, "kind": "obj"})
# the mirrored convolution, and Wiener's deconvolution
yy = r6(np.cumsum(rng.normal(0, 1, 400)) + 50)
for m in (1, 3, 31, 101, 399):
    k = rng.random(m); k = (k / k.sum()).tolist(); h = m // 2
    cases.append({"fn": "convolveY", "name": f"convolve mirrored, kernel {m}", "args": [yy, k, "mirror"], "want": np.convolve(np.pad(np.array(yy), h, mode="symmetric"), k, "valid"), "kind": "vec"})
    cases.append({"fn": "convolveY", "name": f"convolve zero, kernel {m}", "args": [yy, k, "zero"], "want": np.convolve(np.array(yy), k, "same"), "kind": "vec"})
def wiener_ref(y, k, nsr):
    y = np.array(y, float); n = len(y); m = len(k); h = m // 2; a, b = y[0], y[-1]; line = a + (b - a) * np.arange(n) / (n - 1)
    N = 1
    while N < 2 * n or N < m: N <<= 1
    z = np.zeros(N); d = y - line; z[:n] = d; z[n:2 * n] = d[::-1]
    K = np.zeros(N)
    for j in range(m): K[(j - h) % N] += k[j]
    Y = np.fft.fft(z); KF = np.fft.fft(K); H = np.conj(KF) / (np.abs(KF) ** 2 + nsr)
    return {"y": np.real(np.fft.ifft(Y * H))[:n] + line, "gain": float(np.sqrt(np.mean(np.abs(H) ** 2)))}
xs = np.arange(512.0); clean = 1000 * np.exp(-0.5 * ((xs - 200) / 3) ** 2) + 600 * np.exp(-0.5 * ((xs - 215) / 3) ** 2) + 20
for w, nsr in ((4.0, 1e-3), (6.0, 1e-2), (2.0, 1e-5)):
    s_ = w / 2.3548200450309493; hh = int(math.floor(4 * w + 1e-9)); kk = np.exp(-0.5 * ((np.arange(-hh, hh + 1)) / s_) ** 2); kk = kk / kk.sum()
    blurred = np.convolve(np.pad(clean, hh, mode="symmetric"), kk, "valid") + rng.normal(0, 0.5, 512)
    cases.append({"fn": "wienerDeconv", "name": f"Wiener: Gaussian {w} points, nsr {nsr}", "args": [r6(blurred), kk.tolist(), nsr], "want": wiener_ref(r6(blurred), kk.tolist(), nsr), "kind": "obj"})
out["sig-corr"] = cases

def write_or_check(name, cases):
    doc = {"made": MADE, "cases": j(cases)}
    path = os.path.join(here, "fixtures", name + ".json")
    if not check:
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(doc, fh, indent=0, separators=(",", ":"))
            fh.write("\n")
        print(f"wrote {path} ({len(cases)} cases)")
        return 0
    old = json.load(open(path, encoding="utf-8"))
    bad = 0
    def same(a, b):
        if isinstance(a, list) and isinstance(b, list):
            return len(a) == len(b) and all(same(u, v) for u, v in zip(a, b))
        if isinstance(a, dict) and isinstance(b, dict):
            return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return a == b or abs(a - b) <= 1e-13 * max(abs(a), abs(b))
        return a == b
    for i, (a, b) in enumerate(zip(doc["cases"], old["cases"])):
        if not same(a, b):
            bad += 1
            print(f"  {name}[{i}] {a.get('fn')}: differs from the committed value")
    if len(doc["cases"]) != len(old["cases"]):
        bad += 1
        print(f"  {name}: {len(doc['cases'])} cases made, {len(old['cases'])} committed")
    print(f"{name}: {'same' if not bad else str(bad) + ' different'} (committed with {old['made']}, made with {MADE})")
    return bad

only = args[args.index("--only") + 1].split(",") if "--only" in args else None
bad = sum(write_or_check(k, v) for k, v in out.items() if not only or k in only)
sys.exit(1 if bad else 0)
