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
