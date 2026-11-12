"""Reference values computed in 40-digit arithmetic (mpmath), for the special functions and the
distributions' tails, where SciPy's double-precision answers are not always right: its betainc was
seen 7e-3 off at a = 883 (mpmath and Kurve agreed to 3e-11), and it underflows to 0 where the
value is 1e-297. Each function takes and returns Python floats; the answer is rounded once, at
the end. Used by make-fixtures.py and diff-fuzz.py."""
import math
import mpmath as mp

mp.mp.dps = 40
M = mp.mpf

def f(v):
    """An mpmath number as the nearest double (0 or ±inf when it is past the doubles' range)."""
    if isinstance(v, mp.mpc):
        return [f(v.real), f(v.imag)]
    return float(v)

def _lead10(a, b, x):
    """log10 of x^a (1-x)^b / (a B(a, b)), the incomplete beta's leading factor (the series after it
    is near 1 below the mean a/(a + b))."""
    a, b, x = M(a), M(b), M(x)
    return (a * mp.log(x) + b * mp.log1p(-x) - mp.log(a) - mp.log(mp.beta(a, b))) / mp.log(10)

def _ibeta(a, b, x):
    """mpmath's regularised incomplete beta, except where the double it rounds to is known without
    it: 0 when the value is below 1e-400 (mpmath's series then fails to converge, or takes minutes)."""
    if x < a / (a + b) and _lead10(a, b, x) < -400:
        return M(0)
    if x > a / (a + b) and _lead10(b, a, 1 - x) < -400:
        return M(1)
    return mp.betainc(M(a), M(b), 0, M(x), regularized=True)

def betainc(a, b, x):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    return f(_ibeta(a, b, x))

def gammaln(x):
    return f(mp.loggamma(M(x)))

def erf(x):
    return f(mp.erf(M(x)))

def erfc(x):
    return f(mp.erfc(M(x)))

def ndtri(p, guess):
    """The normal quantile; above one half from the other tail, where 1 - p is exact."""
    if p <= 0: return -math.inf
    if p >= 1: return math.inf
    if p > 0.5:
        return -ndtri(1 - p, -guess)
    q = M(p)
    return f(mp.findroot(lambda x: mp.ncdf(x) - q, M(guess)))

def wofz(x, y):
    z = mp.mpc(x, y)
    return f(mp.exp(-z * z) * mp.erfc(-1j * z))

def t_two_sided(t, dof):
    """P(|T| ≥ |t|) for Student's t with dof degrees of freedom."""
    t, dof = M(abs(t)), M(dof)
    return f(_ibeta(dof / 2, M(1) / 2, dof / (dof + t * t)))

def t_crit(level, dof, guess):
    """t with P(|T| ≥ t) = 1 − level; 1 − level is taken exactly as the double it is. By bisection
    in log t from a bracket about the guess (the tail falls as t grows), to 1e-30 relative."""
    a, dof = M(1 - level), M(dof)
    g = lambda t: _ibeta(dof / 2, M(1) / 2, dof / (dof + t * t)) - a
    lo, hi = M(guess) / 2, M(guess) * 2
    while g(lo) < 0: lo /= 2
    while g(hi) > 0: hi *= 2
    while hi / lo - 1 > M(10) ** -30:
        mid = mp.sqrt(lo * hi)
        if g(mid) > 0: lo = mid
        else: hi = mid
    return f(mp.sqrt(lo * hi))

def f_sf(F, d1, d2):
    if F <= 0: return 1.0
    F, d1, d2 = M(F), M(d1), M(d2)
    return f(_ibeta(d2 / 2, d1 / 2, d2 / (d2 + d1 * F)))

# The distributions of slice 1.4 (FOUNDATION_SPEC.md), each from the double inputs taken exactly.
def lbeta(a, b):
    return f(mp.log(mp.beta(M(a), M(b))))

def igam(a, x, upper):
    """The regularised incomplete gamma, P (lower) or Q (upper)."""
    a, x = M(a), M(x)
    return f(mp.gammainc(a, x, mp.inf, regularized=True) if upper else mp.gammainc(a, 0, x, regularized=True))

def t_sf(t, nu):
    """P(T > t)."""
    two = _ibeta(M(nu) / 2, M(1) / 2, M(nu) / (M(nu) + M(t) ** 2))
    return f(two / 2 if t > 0 else 1 - two / 2)

def t_isf(q, nu, guess):
    """t with P(T > t) = q, q below one half: bisection in log t, to 1e-30."""
    q, nu = M(q), M(nu)
    g = lambda t: _ibeta(nu / 2, M(1) / 2, nu / (nu + t * t)) / 2 - q
    lo, hi = M(guess) / 2, M(guess) * 2
    while g(lo) < 0: lo /= 2
    while g(hi) > 0: hi *= 2
    while hi / lo - 1 > M(10) ** -30:
        mid = mp.sqrt(lo * hi)
        if g(mid) > 0: lo = mid
        else: hi = mid
    return f(mp.sqrt(lo * hi))

def chi2_isf(q, nu, guess):
    """x with Q(ν/2, x/2) = q: bisection in log x."""
    q, k = M(q), M(nu) / 2
    g = lambda x: mp.gammainc(k, x / 2, mp.inf, regularized=True) - q
    lo, hi = M(guess) / 2, M(guess) * 2
    while g(lo) < 0: lo /= 2
    while g(hi) > 0: hi *= 2
    while hi / lo - 1 > M(10) ** -30:
        mid = mp.sqrt(lo * hi)
        if g(mid) > 0: lo = mid
        else: hi = mid
    return f(mp.sqrt(lo * hi))

def binom_cdf(k, n, p):
    """P(X ≤ k) = I_{1−p}(n − k, k + 1), with 1 − p exact."""
    if k < 0: return 0.0
    if k >= n: return 1.0
    return f(_ibeta(M(n - k), M(k + 1), 1 - M(p)))

# ---------- descriptive statistics, exactly (STATS_SPEC 2.1) ----------
# The values as the doubles they are (Fraction), R's quantile algorithm (Hyndman and Fan's nine types,
# Tukey's hinges as R's fivenum) with p a Fraction, the moments as rationals, square roots and
# logarithms in 40 digits, one rounding at the end.
from fractions import Fraction as Fr
_QAB = {4: (0, 1), 5: (Fr(1, 2), Fr(1, 2)), 6: (0, 0), 7: (1, 1), 8: (Fr(1, 3), Fr(1, 3)), 9: (Fr(3, 8), Fr(3, 8))}

def hf(s, p, t):
    """Quantile p (a Fraction) of the sorted Fractions s by type t (1 to 9, or "tukey"), as R's quantile() and fivenum()."""
    n = len(s)
    if n == 1: return s[0]
    x = lambda i: s[0] if i < 1 else s[n - 1] if i > n else s[i - 1]
    if t == "tukey":
        if p in (0, 1, Fr(1, 2)): return hf(s, p, 7)
        n4 = Fr(math.floor(Fr(n + 3, 2)), 2); d = n4 if p == Fr(1, 4) else n + 1 - n4
        return (x(math.floor(d)) + x(math.ceil(d))) / 2
    if t in (1, 2, 3):
        np_ = n * p - Fr(1, 2) if t == 3 else n * p
        j = math.floor(np_)
        h = (1 if np_ > j else 0) if t == 1 else (1 if np_ > j else Fr(1, 2)) if t == 2 else (1 if (np_ != j or j % 2 == 1) else 0)
    else:
        a, b = _QAB[t]; nppm = a + p * (n + 1 - a - b); j = math.floor(nppm); h = nppm - j
    return (1 - h) * x(j) + h * x(j + 1)

def fl(q):
    """A rational or a 40-digit number as the nearest double, or None past the doubles."""
    try:
        v = float(q)
        return None if math.isinf(v) else v
    except OverflowError:
        return None

def mpq(q): return mp.mpf(q.numerator) / q.denominator

def desc_ref(vals, vdiv="df", keys=None):
    """Every statistic descStats gives, exactly, for the doubles vals (or only those in keys); a key is
    missing where it has no meaning."""
    F = [Fr(v) for v in vals]; n = len(F); s = sorted(F); r = {}
    ask = lambda *ks: keys is None or any(k in keys for k in ks)
    tot = sum(F); mean = tot / n
    r["sum"] = fl(tot); r["mean"] = fl(mean); r["min"] = fl(s[0]); r["max"] = fl(s[-1]); r["range"] = fl(s[-1] - s[0])
    if ask("var", "sd", "se", "cv", "skew", "kurt"):
        dev = [x - mean for x in F]; m2 = sum(d * d for d in dev) / n
        m3 = sum(d ** 3 for d in dev) / n if ask("skew") else 0
        m4 = sum(d ** 4 for d in dev) / n if ask("kurt") else 0
    else: m2 = m3 = m4 = None
    if m2 is None: pass
    elif n >= 2:
        var = m2 * n / (n if vdiv == "n" else n - 1)
        r["var"] = fl(var); r["sd"] = fl(mp.sqrt(mpq(var))); r["se"] = fl(mp.sqrt(mpq(var / n)))
        if mean != 0: r["cv"] = fl(mp.sqrt(mpq(var)) / mpq(mean))
    if m2 is not None and ask("skew") and n >= 3 and m2 > 0: r["skew"] = fl(mp.sqrt(n * (n - 1)) / (n - 2) * mpq(m3) / mpq(m2) ** mp.mpf(1.5))
    if m2 is not None and ask("kurt") and n >= 4 and m2 > 0:
        g2 = m4 / (m2 * m2) - 3; r["kurt"] = fl(((n + 1) * g2 + 6) * (n - 1) / ((n - 2) * (n - 3)))
    q1, md, q3 = hf(s, Fr(1, 4), 7), hf(s, Fr(1, 2), 7), hf(s, Fr(3, 4), 7)
    r["q1"] = fl(q1); r["med"] = fl(md); r["q3"] = fl(q3); r["iqr"] = fl(q3 - q1)
    mad = hf(sorted(abs(x - md) for x in F), Fr(1, 2), 7); r["mad"] = fl(mad)
    r["rsd"] = fl(mpq(mad) / mp.erfinv(mp.mpf(1) / 2) / mp.sqrt(2))
    cnt = {}
    for x in F: cnt[x] = cnt.get(x, 0) + 1
    best = max(cnt.values()); r["modeN"] = best
    if best > 1: r["mode"] = fl(min(x for x in cnt if cnt[x] == best))
    if s[0] > 0 and ask("gmean", "hmean"):
        r["gmean"] = fl(mp.exp(mp.fsum(mp.log(mpq(x)) for x in F) / n))
        r["hmean"] = fl(Fr(n) / sum(1 / x for x in F))
    return r
