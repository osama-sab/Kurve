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

# ---- 5.7 interpolation: scipy.interpolate's interp1d, CubicSpline (not-a-knot, natural, clamped), Akima1DInterpolator (akima,
# makima), PchipInterpolator and make_smoothing_spline (λ given, and by GCV), inside the data and continued past it; griddata
# (linear, rescale), RBFInterpolator (thin plate) and Shepard's modified weights written from Franke and Little ----
from scipy import interpolate as _ip
cases = []
rng = np.random.default_rng(20261121)
for n in (2, 3, 4, 7, 30, 200):
    x = np.sort(rng.choice(np.arange(10 * n), n, replace=False).astype(float) * 0.37 + rng.uniform(-5, 5)); x = np.array(r6(x))
    y = np.array(r6(np.sin(x / 3) * 4 + rng.normal(0, 0.3, n) + 0.05 * x))
    xq = np.sort(np.concatenate([rng.uniform(x[0], x[-1], 40), x[[0, -1]], x[:: max(1, n // 5)], [x[0] - 0.7, x[-1] + 1.1]])); xq = np.array(r6(xq))
    inside = (xq >= x[0]) & (xq <= x[-1])
    for m, f in (("linear", lambda: _ip.interp1d(x, y, kind="linear", fill_value="extrapolate")), ("notaknot", lambda: _ip.CubicSpline(x, y, bc_type="not-a-knot")),
                 ("natural", lambda: _ip.CubicSpline(x, y, bc_type="natural")), ("clamped", lambda: _ip.CubicSpline(x, y, bc_type=((1, 0.4), (1, -1.3)))),
                 ("akima", lambda: _ip.Akima1DInterpolator(x, y, method="akima", extrapolate=True)), ("makima", lambda: _ip.Akima1DInterpolator(x, y, method="makima", extrapolate=True)),
                 ("pchip", lambda: _ip.PchipInterpolator(x, y, extrapolate=True)), ("smooth", lambda: _ip.make_smoothing_spline(x, y, lam=0.8))):
        if m == "notaknot" and n == 3: pass
        if m == "smooth" and n < 5: continue
        try: F = f()
        except Exception as e: continue
        want = F(xq); o = {"method": m, "ext": "method", "d0": 0.4, "d1": -1.3, "lam": 0.8}
        fn = "smoothCurve" if m == "smooth" else "interp1"
        cases.append({"fn": fn, "name": f"{m}, {n} points, continued past the ends", "args": [x.tolist(), y.tolist(), xq.tolist(), o], "want": {"y": want}, "kind": "obj"})
        cases.append({"fn": fn, "name": f"{m}, {n} points, empty past the ends", "args": [x.tolist(), y.tolist(), xq.tolist(), dict(o, ext="none")], "want": {"y": [float(v) if ins else None for v, ins in zip(want, inside)]}, "kind": "obj"})
for n in (8, 25, 120):
    x = np.array(r6(np.sort(rng.uniform(0, 20, n)))); y = np.array(r6(np.cos(x / 2) + rng.normal(0, 0.2, n)))
    import inspect as _insp, scipy.interpolate._bsplines as _bs
    lam = None
    # the λ SciPy's GCV finds, read back from its fitted spline by solving for it is not exposed: recompute it the way SciPy does
    src = _bs.make_smoothing_spline
    import scipy.optimize as _opt
    calls = []
    orig = _opt.minimize_scalar
    def spy(*a, **k):
        r = orig(*a, **k); calls.append(float(r.x)); return r
    _bs.minimize_scalar = spy
    try: F = _ip.make_smoothing_spline(x, y)
    finally: _bs.minimize_scalar = orig
    xq = np.array(r6(np.linspace(x[0], x[-1], 50)))
    cases.append({"fn": "smoothSpline", "name": f"smoothing spline by GCV, {n} points: λ", "args": [x.tolist(), y.tolist(), {}], "want": {"lam": calls[-1]}, "kind": "obj"})
    # the curve at SciPy's λ (the search stops within 1e-5 of λ, so two searches may differ by that much; λ is judged so above)
    cases.append({"fn": "smoothCurve", "name": f"smoothing spline by GCV, {n} points: the curve at SciPy's λ", "args": [x.tolist(), y.tolist(), xq.tolist(), {"method": "smooth", "lam": calls[-1]}], "want": {"y": F(xq)}, "kind": "obj"})
# scattered points onto a grid
def shepard_ref(P, GX, GY, R):
    Z = np.full(GX.shape, np.nan)
    for idx in np.ndindex(GX.shape):
        d = np.hypot(GX[idx] - P[:, 0], GY[idx] - P[:, 1])
        if np.any(d == 0): Z[idx] = P[d == 0, 2][0]; continue
        w = np.where(d < R, ((R - d) / (R * d)) ** 2, 0.0)
        if w.sum() > 0: Z[idx] = (w * P[:, 2]).sum() / w.sum()
    return Z
for n, sx, sy in ((40, 1.0, 1.0), (150, 50.0, 0.02), (400, 3.0, 7.0)):
    P = np.column_stack([rng.uniform(0, sx, n), rng.uniform(0, sy, n)]); P = np.array([[float(f"{v:.6g}") for v in r] for r in P])
    z = np.array(r6(np.sin(P[:, 0] / sx * 3) * np.cos(P[:, 1] / sy * 2) * 10 + 5)); nx, ny = 23, 17
    gx = np.linspace(P[:, 0].min(), P[:, 0].max(), nx); gy = np.linspace(P[:, 1].min(), P[:, 1].max(), ny); GX, GY = np.meshgrid(gx, gy)
    tri = _ip.griddata(P, z, (GX, GY), method="linear", rescale=True)
    args = [P[:, 0].tolist(), P[:, 1].tolist(), z.tolist()]
    cases.append({"fn": "gridXYZ", "name": f"griddata linear (rescaled), {n} points", "args": args + [{"method": "tri", "nx": nx, "ny": ny}], "want": {"z": [None if v != v else float(v) for v in tri.ravel()]}, "kind": "obj"})
    for sm in (0.0, 0.5):
        rb = _ip.RBFInterpolator(P, z, kernel="thin_plate_spline", smoothing=sm, degree=1)(np.column_stack([GX.ravel(), GY.ravel()]))
        cases.append({"fn": "gridXYZ", "name": f"thin-plate spline, smoothing {sm}, {n} points", "args": args + [{"method": "tps", "nx": nx, "ny": ny, "smooth": sm}], "want": {"z": rb}, "kind": "obj"})
    D = math.hypot(np.ptp(P[:, 0]), np.ptp(P[:, 1])); R = D / 2 * math.sqrt(19 / n); sh = shepard_ref(np.column_stack([P, z]), GX, GY, R)
    cases.append({"fn": "gridXYZ", "name": f"Shepard's weights, {n} points", "args": args + [{"method": "shepard", "nx": nx, "ny": ny}], "want": {"z": [None if v != v else float(v) for v in sh.ravel()]}, "kind": "obj"})
out["sig-interp"] = cases

# ---- 5.4 envelope: scipy.signal.hilbert (at the data's length and padded), the amplitude about the mean, the unwrapped phase and
# numpy.gradient of it over 2π; scipy.signal.argrelextrema (np.greater / np.less, order, its ends clipped) and the extrema joined by
# PchipInterpolator, CubicSpline (both continued) or numpy.interp (its ends held) ----
cases = []
rng = np.random.default_rng(20261122)
for n in (5, 8, 64, 101, 500):
    t = np.arange(n) * 0.01; y = np.array(r6((1 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) * np.cos(2 * np.pi * 9 * t + 0.4) + 0.3 + rng.normal(0, 0.02, n)))
    for N in (None, 1 << int(math.ceil(math.log2(n)))):
        H = signal.hilbert(y, N)[:n]
        cases.append({"fn": "analytic", "name": f"hilbert of {n} at {N or n}", "args": [y.tolist(), N], "want": {"re": H.real, "im": H.imag}, "kind": "obj"})
    m = float(np.mean(y)); A = signal.hilbert(y - m); ph = np.unwrap(np.angle(A)); dx = (t[-1] - t[0]) / (n - 1)
    cases.append({"fn": "envelope", "name": f"Hilbert envelope of {n}", "args": [t.tolist(), y.tolist(), {"out": "env"}], "want": {"y": np.abs(A) + m}, "kind": "obj"})
    cases.append({"fn": "envelope", "name": f"phase of {n}", "args": [t.tolist(), y.tolist(), {"out": "phase"}], "want": {"y": ph}, "kind": "obj"})
    cases.append({"fn": "envelope", "name": f"frequency of {n}", "args": [t.tolist(), y.tolist(), {"out": "freq"}], "want": {"y": np.gradient(ph, dx) / (2 * np.pi)}, "kind": "obj"})
    for order in (1, 3):
        for lower in (False, True):
            ix = signal.argrelextrema(y, np.less if lower else np.greater, order=order)[0]
            cases.append({"fn": "extremaIdx", "name": f"argrelextrema {'less' if lower else 'greater'} order {order}, {n}", "args": [y.tolist(), order, lower], "want": ix.tolist(), "kind": "vec", "scale": 1})
            if len(ix) >= 2 and n >= 64:
                xs, ys = t[ix], y[ix]
                for jn, F in (("pchip", lambda: _ip.PchipInterpolator(xs, ys)(t)), ("notaknot", lambda: _ip.CubicSpline(xs, ys)(t)), ("linear", lambda: np.interp(t, xs, ys))):
                    cases.append({"fn": "envelope", "name": f"{'lower' if lower else 'upper'} envelope by {jn}, order {order}, {n}", "args": [t.tolist(), y.tolist(), {"out": "lower" if lower else "upper", "order": order, "join": jn}], "want": {"y": F()}, "kind": "obj"})
out["sig-env"] = cases

# ---- 5.5 the short-time transform: scipy.signal.spectrogram (its Tukey 0.25 window, an eighth's overlap, density or spectrum,
# power or magnitude), the matrix a row a frequency ----
cases = []
rng = np.random.default_rng(20261123)
fs = 1000.0; t = np.arange(3000) / fs; y = np.array(r6(np.cos(2 * np.pi * (50 * t + 60 * t * t)) + 0.1 * rng.normal(0, 1, t.size)))
for win, par, nseg, over, sc, mode, det in ((("tukey", 0.25), None, None, None, "density", "psd", "constant"), (("hann", None), None, 128, 64, "spectrum", "psd", "constant"),
                                           (("tukey", 0.25), None, 200, None, "density", "magnitude", "constant"), (("blackman", None), None, 100, 10, "spectrum", "magnitude", "linear"),
                                           (("kaiser", 6.0), None, 300, 250, "density", "psd", False)):
    wk = win[0] if win[1] is None else win
    kw = dict(window=wk, scaling=sc, mode=mode, detrend=det)
    if nseg: kw["nperseg"] = nseg
    if over is not None: kw["noverlap"] = over
    f, tt, S = signal.spectrogram(y, fs, **kw)
    o = {"win": win[0], "wpar": win[1], "nseg": nseg, "over": over, "scaling": sc, "mode": mode, "detrend": det if det else "none"}
    cases.append({"fn": "stft", "name": f"spectrogram {win} {nseg} {over} {sc} {mode} {det}", "args": [y.tolist(), fs, o], "want": {"f": f, "t": tt, "z": S.ravel()}, "kind": "obj"})
out["sig-stft"] = cases

# ---- 5.6 wavelets: PyWavelets' dwt in every mode (signals shorter than the filter too), idwt, wavedec and waverec, dwt_max_level,
# cwt with every continuous wavelet Kurve has; denoising written from Donoho and Johnstone in NumPy with pywt.threshold ----
cases = []
rng = np.random.default_rng(20261124)
modes = ["symmetric", "periodization", "reflect", "periodic", "zero", "constant", "smooth", "antisymmetric", "antireflect"]
for nm in ("haar", "db2", "db4", "db10", "db20", "sym2", "sym8", "sym20", "coif1", "coif5"):
    for mode in modes:
        for N in ((2, 13, 64) if nm in ("db4", "sym8", "coif1") else (3, 40)):
            x = r6(rng.normal(0, 1, N) + np.linspace(0, 2, N))
            if mode == "antireflect" and N < pywt.Wavelet(nm).dec_len: continue  # refused by Kurve (its repeated reflections are PyWavelets' own)
            try: A, D = pywt.dwt(x, nm, mode)
            except Exception: continue
            cases.append({"fn": "dwt", "name": f"dwt {nm} {mode} {N}", "args": [x, nm, mode], "want": {"a": A, "d": D}, "kind": "obj"})
    for mode in (("symmetric", "periodization", "zero", "smooth") if nm in ("db4", "sym20", "coif5") else ("symmetric",)):
        x = r6(np.cumsum(rng.normal(0, 1, 150)))
        c = pywt.wavedec(x, nm, mode); flat = np.concatenate(c)
        cases.append({"fn": "wavedecFlat", "name": f"wavedec {nm} {mode}", "args": [x, nm, mode, None], "want": {"c": flat, "len": [len(v) for v in c]}, "kind": "obj"})
        cases.append({"fn": "waverec", "name": f"waverec {nm} {mode}", "args": [[v.tolist() for v in c], nm, mode], "want": pywt.waverec(c, nm, mode), "kind": "vec"})
    for N in (5, 30, 1000, 4097):
        cases.append({"fn": "wavMaxLevel", "name": f"dwt_max_level {N} {nm}", "args": [N, nm], "want": pywt.dwt_max_level(N, nm), "kind": "rel"})
for nm in ("db3", "sym6", "coif2"):
    for n in (3, 10):
        a, d = r6(rng.normal(0, 1, n)), r6(rng.normal(0, 1, n))
        try: R = pywt.idwt(a, d, nm, "symmetric")
        except Exception: continue
        cases.append({"fn": "idwt", "name": f"idwt {nm} {n}", "args": [a, d, nm, "symmetric"], "want": R, "kind": "vec"})
t = np.arange(400) * 0.01; yc = r6(np.sin(2 * np.pi * 3 * t) * np.exp(-((t - 2) ** 2)) + 0.5 * np.sin(2 * np.pi * 12 * t) + 0.1 * rng.normal(0, 1, 400))
for wn in ("morl", "mexh", "gaus1", "gaus2", "gaus3", "gaus4", "gaus5", "gaus6", "gaus7", "gaus8"):
    sc = [1.0, 1.7, 2.5, 4.0, 7.3, 12.0, 30.0]
    C, F = pywt.cwt(np.array(yc), sc, wn, sampling_period=0.01)
    cases.append({"fn": "cwtFlat", "name": f"cwt {wn}", "args": [yc, sc, wn, 0.01], "want": {"c": C.ravel(), "f": F}, "kind": "obj"})
def wden_ref(y, nm, mode, rule, thr, scope):
    c = pywt.wavedec(y, nm, mode); n = len(y); mad = lambda d: np.median(np.abs(d)) / 0.6745; s1 = mad(c[-1])
    for l in range(1, len(c)):
        sg = mad(c[l]) if scope == "level" else s1
        if rule == "universal": tt = sg * math.sqrt(2 * math.log(n))
        elif rule == "minimax": tt = sg * (0.3936 + 0.1829 * math.log2(n)) if n > 32 else 0.0
        else:
            x2 = np.sort((c[l] / sg) ** 2); m = len(x2); risks = (m - 2 * np.arange(1, m + 1) + np.cumsum(x2) + np.arange(m - 1, -1, -1) * x2) / m
            tt = sg * math.sqrt(x2[int(np.argmin(risks))])
        c[l] = pywt.threshold(c[l], tt, mode=thr)
    return pywt.waverec(c, nm, mode)[:n]
yy = r6(np.sin(np.linspace(0, 6, 512)) * 3 + (np.linspace(0, 6, 512) > 3) * 2 + rng.normal(0, 0.3, 512))
for nm, mode, rule, thr, scope in (("sym8", "symmetric", "universal", "soft", "global"), ("db4", "symmetric", "sure", "soft", "level"), ("haar", "periodization", "universal", "hard", "global"),
                                   ("coif3", "smooth", "minimax", "soft", "level"), ("db8", "symmetric", "sure", "hard", "global")):
    cases.append({"fn": "wdenoise", "name": f"denoise {nm} {mode} {rule} {thr} {scope}", "args": [yy, {"wav": nm, "mode": mode, "rule": rule, "thr": thr, "soft": thr == "soft", "scope": scope}], "want": {"y": wden_ref(np.array(yy), nm, mode, rule, thr, scope)}, "kind": "obj"})
out["sig-wav"] = cases

# ---- 5.8 calculus: scipy.integrate.simpson and trapezoid on even and odd counts and uneven X; statsmodels' lowess (frac, it,
# delta); LOESS of degree 2 written in NumPy as Kurve's (the same neighbours, tricube and bisquare weights, a weighted parabola) ----
from scipy import integrate as _int
import statsmodels.api as _sm
cases = []
rng = np.random.default_rng(20261125)
for n in (2, 3, 4, 5, 10, 11, 200, 201):
    x = np.array(r6(np.sort(rng.uniform(0, 10, n)))); y = np.array(r6(np.sin(x) * 3 + x * x * 0.1))
    for rule, ref in (("simpson", _int.simpson(y, x=x)), ("trap", _int.trapezoid(y, x=x))):
        cases.append({"fn": "ruleOn", "name": f"{rule} of {n} uneven", "args": [y.tolist(), x.tolist(), rule], "want": float(ref), "kind": "rel"})
xe = np.arange(0, 10.5, 0.5); ye = xe ** 3 - 2 * xe
cases.append({"fn": "ruleOn", "name": "simpson of a cubic, even spacing, odd count", "args": [ye.tolist(), xe.tolist(), "simpson"], "want": float(_int.simpson(ye, x=xe)), "kind": "rel"})
def loess2_ref(x, y, k, it):
    n = len(x); o = np.argsort(x, kind="stable"); X = x[o]; Y = y[o]; rw = np.ones(n)
    for rob in range(it + 1):
        fit = np.zeros(n); le, re = 0, k
        for i in range(n):
            xv = X[i]
            while re < n and xv > (X[le] + X[re]) / 2: le += 1; re += 1
            rad = max(xv - X[le], X[re - 1] - xv); d = np.abs(X[le:re] - xv) / rad; w = (1 - d ** 3) ** 3 * rw[le:re]
            if np.sum(w > 1e-12) < 2: fit[i] = Y[i]; continue
            w = w / w.sum(); t = (X[le:re] - xv) / rad; A = np.vstack([np.ones_like(t), t, t * t]).T
            c = np.linalg.solve(A.T @ (w[:, None] * A), A.T @ (w * Y[le:re])); fit[i] = c[0]
        if rob < it:
            r = np.abs(Y - fit); med = np.median(r); u = np.minimum(1, r / (6 * med)) if med > 0 else (r > 0).astype(float); rw = (1 - u * u) ** 2
    out = np.empty(n); out[o] = fit; return out
for n, frac, it, delta in ((50, 2 / 3, 3, 0.0), (200, 0.1, 0, 0.0), (200, 0.3, 2, 0.0), (400, 0.05, 3, 0.2), (31, 0.5, 1, 0.0)):
    x = np.array(r6(np.sort(rng.uniform(0, 20, n)))); y = np.array(r6(np.sin(x / 2) * 2 + rng.normal(0, 0.3, n) + (rng.random(n) < 0.05) * 5))
    fit = _sm.nonparametric.lowess(y, x, frac=frac, it=it, delta=delta, return_sorted=False)
    cases.append({"fn": "lowessY", "name": f"lowess n {n} frac {frac:.3g} it {it} delta {delta}", "args": [x.tolist(), y.tolist(), {"frac": frac, "it": it, "delta": delta}], "want": fit, "kind": "vec"})
    if delta == 0.0:
        k = max(2, min(n, int(frac * n + 1e-10)))
        cases.append({"fn": "lowessY", "name": f"loess (degree 2) n {n} frac {frac:.3g} it {it}", "args": [x.tolist(), y.tolist(), {"frac": frac, "it": it, "deg": 2}], "want": loess2_ref(x, y, k, it), "kind": "vec"})
out["sig-calc"] = cases

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
