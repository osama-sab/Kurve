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

# ---------- normality and outliers (STATS_SPEC 2.2) ----------
# Each statistic in 40 digits from the doubles given: the mean and SD as rationals, Φ and Φ⁻¹ by mpmath.
def _msd(x):
    F = [Fr(v) for v in x]; n = len(F); m = sum(F) / n
    return mpq(m), mp.sqrt(mpq(sum((v - m) ** 2 for v in F) / (n - 1)))

def _poly(c, x):
    r = mp.mpf(0)
    for v in reversed(c): r = r * x + mp.mpf(v)
    return r

def sw_ref(x):
    """Royston's AS R94 (R's swilk.c) carried out in 40 digits: (W, p)."""
    x = sorted(x); n = len(x); nn2 = n // 2; a = [mp.mpf(0)] * (nn2 + 1)
    if n == 3: a[1] = mp.sqrt(mp.mpf(1) / 2)
    else:
        an25 = n + mp.mpf(1) / 4; summ2 = mp.mpf(0)
        for i in range(1, nn2 + 1):
            a[i] = mp.sqrt(2) * mp.erfinv(2 * ((i - mp.mpf(3) / 8) / an25) - 1); summ2 += a[i] ** 2
        summ2 *= 2; ssumm2 = mp.sqrt(summ2); rsn = 1 / mp.sqrt(n)
        a1 = _poly(["0", ".221157", "-.147981", "-2.07119", "4.434685", "-2.706056"], rsn) - a[1] / ssumm2
        if n > 5:
            i1 = 3; a2 = -a[2] / ssumm2 + _poly(["0", ".042981", "-.293762", "-1.752461", "5.682633", "-3.582633"], rsn)
            fac = mp.sqrt((summ2 - 2 * a[1] ** 2 - 2 * a[2] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2)); a[2] = a2
        else:
            i1 = 2; fac = mp.sqrt((summ2 - 2 * a[1] ** 2) / (1 - 2 * a1 ** 2))
        a[1] = a1
        for i in range(i1, nn2 + 1): a[i] /= -fac
    X = [mp.mpf(v) for v in x]; rg = X[-1] - X[0]
    coef = [(mp.sign(i - (n - 1 - i)) * a[min(i, n - 1 - i) + 1]) if i != n - 1 - i else mp.mpf(0) for i in range(n)]
    sa = mp.fsum(coef) / n; sx = mp.fsum(v / rg for v in X) / n
    ssa = mp.fsum((c - sa) ** 2 for c in coef); ssx = mp.fsum((v / rg - sx) ** 2 for v in X); sax = mp.fsum((c - sa) * (v / rg - sx) for c, v in zip(coef, X))
    w1 = 1 - sax ** 2 / (ssa * ssx); w = 1 - w1
    if n == 3: return f(w), f(max(mp.mpf(0), mp.mpf("1.90985931710274") * (mp.asin(mp.sqrt(w)) - mp.mpf("1.04719755119660"))))
    y = mp.log(w1); lx = mp.log(n)
    if n <= 11:
        gm = _poly(["-2.273", ".459"], n)
        if y >= gm: return f(w), 1e-99
        y = -mp.log(gm - y); m = _poly([".544", "-.39978", ".025054", "-6.714e-4"], n); s = mp.exp(_poly(["1.3822", "-.77857", ".062767", "-.0020322"], n))
    else:
        m = _poly(["-1.5861", "-.31082", "-.083751", ".0038915"], lx); s = mp.exp(_poly(["-.4803", "-.082676", ".0030302"], lx))
    return f(w), f(mp.ncdf(-(y - m) / s))

def ksnorm_d_ref(x):
    """The Kolmogorov–Smirnov distance from the normal of the values' mean and SD (n − 1)."""
    x = sorted(x); n = len(x); m, s = _msd(x); d = mp.mpf(0)
    for i, v in enumerate(x):
        F = mp.ncdf((mp.mpf(v) - m) / s); d = max(d, mp.mpf(i + 1) / n - F, F - mp.mpf(i) / n)
    return f(d)

def ad_ref(x):
    """Anderson–Darling's A² and A²(1 + 0.75/n + 2.25/n²) against the normal of the mean and SD, in 40 digits."""
    x = sorted(x); n = len(x); m, s = _msd(x); z = [(mp.mpf(v) - m) / s for v in x]
    S = mp.fsum((2 * i + 1) * (mp.log(mp.ncdf(z[i])) + mp.log(mp.ncdf(-z[n - 1 - i]))) for i in range(n))
    a2 = -n - S / n; return f(a2), f(a2 * (1 + mp.mpf(3) / (4 * n) + mp.mpf(9) / (4 * n * n)))

def ad_p(a):
    """D'Agostino and Stephens' p for the adjusted A² (statsmodels' normal_ad)."""
    if a < 0.2: return 1 - math.exp(-13.436 + 101.14 * a - 223.73 * a * a)
    if a < 0.34: return 1 - math.exp(-8.318 + 42.796 * a - 59.938 * a * a)
    if a < 0.6: return math.exp(0.9177 - 4.279 * a - 1.38 * a * a)
    if a <= 13: return math.exp(1.2937 - 5.709 * a + 0.0186 * a * a)
    return 0.0

def dago_ref(x):
    """D'Agostino and Pearson's scores and K² (SciPy's skewtest and kurtosistest), the moments exact, the rest in 40 digits."""
    F = [Fr(v) for v in x]; n = len(F); m = sum(F) / n
    m2, m3, m4 = (mpq(sum((v - m) ** k for v in F) / n) for k in (2, 3, 4))
    b1 = m3 / m2 ** mp.mpf(1.5); b2 = m4 / m2 ** 2; N = mp.mpf(n)
    y = b1 * mp.sqrt((N + 1) * (N + 3) / (6 * (N - 2)))
    be = 3 * (N * N + 27 * N - 70) * (N + 1) * (N + 3) / ((N - 2) * (N + 5) * (N + 7) * (N + 9))
    W2 = -1 + mp.sqrt(2 * (be - 1)); dl = 1 / mp.sqrt(mp.log(W2) / 2); al = mp.sqrt(2 / (W2 - 1)); zs = dl * mp.asinh(y / al)
    E = 3 * (N - 1) / (N + 1); vb = 24 * N * (N - 2) * (N - 3) / ((N + 1) ** 2 * (N + 3) * (N + 5)); xk = (b2 - E) / mp.sqrt(vb)
    sb = 6 * (N * N - 5 * N + 2) / ((N + 7) * (N + 9)) * mp.sqrt(6 * (N + 3) * (N + 5) / (N * (N - 2) * (N - 3)))
    A = 6 + 8 / sb * (2 / sb + mp.sqrt(1 + 4 / sb ** 2)); t1 = 1 - 2 / (9 * A); den = 1 + xk * mp.sqrt(2 / (A - 4))
    t2 = mp.sign(den) * mp.cbrt((1 - 2 / A) / abs(den)); zk = (t1 - t2) / mp.sqrt(2 / (9 * A)); k2 = zs ** 2 + zk ** 2
    return f(zs), f(zk), f(k2), f(mp.exp(-k2 / 2))

def grubbs_ref(x, side, alpha):
    """One round of Grubbs' test in 40 digits: G, its p n·P(T > t) (two-sided twice that, at most 1), the critical G."""
    n = len(x); m, s = _msd(x); X = [mp.mpf(v) for v in x]
    dv = [(v - m) if side == "max" else (m - v) if side == "min" else abs(v - m) for v in X]
    G = max(dv) / s; t = mp.sqrt(n * (n - 2) * G ** 2 / ((n - 1) ** 2 - n * G ** 2)); nu = n - 2
    sf = mp.betainc(mp.mpf(nu) / 2, mp.mpf(1) / 2, 0, nu / (nu + t * t), regularized=True) / 2
    p1 = n * sf; p = min(mp.mpf(1), 2 * p1 if side == "two" else p1)
    q = mp.mpf(alpha) / (2 * n if side == "two" else n)
    tc = mp.mpf(t_isf(q, nu, 5.0))
    Gc = (n - 1) / mp.sqrt(n) * mp.sqrt(tc ** 2 / (n - 2 + tc ** 2))
    return f(G), f(p), f(Gc)

def kolm_dmtw(n, d):
    """P(Dₙ ≤ d) by Durbin's matrix (Marsaglia, Tsang and Wang) in 40 digits, for small n·d."""
    d = mp.mpf(d); k = int(mp.ceil(n * d)); h = k - n * d; m = 2 * k - 1
    H = mp.matrix(m, m)
    for i in range(m):
        for j in range(m):
            if i - j + 1 >= 0: H[i, j] = 1 / mp.factorial(i - j + 1)
    for i in range(m):
        H[i, 0] -= h ** (i + 1) / mp.factorial(i + 1); H[m - 1, i] -= h ** (m - i) / mp.factorial(m - i)
    H[m - 1, 0] += (max(2 * h - 1, 0) ** m) / mp.factorial(m)
    P = H ** n
    return P[k - 1, k - 1] * mp.factorial(n) / mp.mpf(n) ** n

# ---------- comparing means (STATS_SPEC 2.3) ----------
def _t_tail(t, nu):
    """P(T > t) for t ≥ 0, in 40 digits."""
    return mp.betainc(nu / 2, mp.mpf(1) / 2, 0, nu / (nu + t * t), regularized=True) / 2

def _t_p(t, nu, alt):
    """t's p for the alternative, each tail computed as itself: 1 − (1 − a tail of 1e-34) keeps six digits of it in 40."""
    up = _t_tail(abs(t), nu)
    if alt == "greater": return up if t >= 0 else 1 - up
    if alt == "less": return up if t < 0 else 1 - up
    return min(mp.mpf(1), 2 * up)

def t_ref(kind, a, b=None, mu0=0, alt="two", equal=False, conf=0.95):
    """A t test in 40 digits: the moments as rationals, t, its degrees of freedom, p, the estimate's
    interval (t's quantile by refs.t_isf), Cohen's d and Hedges' g (J by Γ)."""
    A = [Fr(v) for v in a]; mu = Fr(mu0)
    if kind == "paired":
        A = [Fr(x) - Fr(y) for x, y in zip(a, b)]; kind = "one"
    def mv(X):
        n = len(X); m = sum(X) / n; return n, m, sum((x - m) ** 2 for x in X) / (n - 1)
    if kind == "one":
        n, m, v = mv(A); se = mp.sqrt(mpq(v / n)); est = mpq(m); t = (est - mpq(mu)) / se; nu = mp.mpf(n - 1)
        d = (est - mpq(mu)) / mp.sqrt(mpq(v)); dp = n - 1
    else:
        B = [Fr(v) for v in b]; n1, m1, v1 = mv(A); n2, m2, v2 = mv(B); dp = n1 + n2 - 2; sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / dp
        est = mpq(m1 - m2)
        if equal: se = mp.sqrt(mpq(sp2 * (Fr(1, n1) + Fr(1, n2)))); nu = mp.mpf(dp)
        else:
            q1, q2 = v1 / n1, v2 / n2; se = mp.sqrt(mpq(q1 + q2)); nu = mpq((q1 + q2) ** 2 / (q1 * q1 / (n1 - 1) + q2 * q2 / (n2 - 1)))
        t = (est - mpq(mu)) / se; d = (est - mpq(mu)) / mp.sqrt(mpq(sp2))
    p = _t_p(t, nu, alt)
    if alt == "two":
        q = mp.mpf(t_isf((1 - conf) / 2, nu, 2.0)); ci = (est - q * se, est + q * se)
    else:
        q = mp.mpf(t_isf(1 - conf, nu, 2.0)); ci = (-mp.inf, est + q * se) if alt == "less" else (est - q * se, mp.inf)
    J = mp.gamma(mp.mpf(dp) / 2) / (mp.sqrt(mp.mpf(dp) / 2) * mp.gamma(mp.mpf(dp - 1) / 2))
    return {"t": f(t), "df": f(nu), "p": f(p), "ci.0": f(ci[0]), "ci.1": f(ci[1]), "d": f(d), "g": f(d * J)}

# ---------- the studentized range and Dunnett's distribution (STATS_SPEC 2.4) ----------
_GL = {}
def _gl(n):
    """n-point Gauss–Legendre nodes and weights at the working precision (Newton on P_n from NumPy's)."""
    key = (n, mp.mp.dps)
    if key not in _GL:
        import numpy as np
        xs, out = np.polynomial.legendre.leggauss(n)[0], []
        for x0 in xs:
            x = M(float(x0))
            for _ in range(8):
                p0, p1 = M(1), x
                for j in range(2, n + 1): p0, p1 = p1, ((2 * j - 1) * x * p1 - (j - 1) * p0) / j
                dp = n * (x * p1 - p0) / (x * x - 1); x -= p1 / dp
            p0, p1 = M(1), x
            for j in range(2, n + 1): p0, p1 = p1, ((2 * j - 1) * x * p1 - (j - 1) * p0) / j
            dp = n * (x * p1 - p0) / (x * x - 1)
            out.append((x, 2 / ((1 - x * x) * dp * dp)))
        _GL[key] = out
    return _GL[key]

def _panels(g, a, b, m, n):
    """∫ g over [a, b] in m equal panels of n-point Gauss–Legendre."""
    s, h = M(0), (b - a) / m
    for i in range(m):
        c, r = a + h * (i + M(1) / 2), h / 2
        s += r * mp.fsum(w * g(c + r * x) for x, w in _gl(n))
    return s

def _over_s(h, nu, n):
    """∫ g_ν(s) h(s) ds, s = √(χ²_ν/ν), in u = ln s, over where the integrand is within e^-80 of its
    peak (golden sections and bisection at 20 digits), in panels of n-point Gauss–Legendre at most
    1.5 wide in u (8 at least): h's step from 1 to 0 has to fall in a panel of its own scale."""
    if nu == math.inf:
        return h(M(1))
    nu = M(nu); lc = mp.log(2) + (nu / 2) * mp.log(nu / 2) - mp.loggamma(nu / 2)
    def L(u):
        v = h(mp.exp(u))
        return lc + nu * u - nu * mp.exp(2 * u) / 2 + mp.log(v) if v > 0 else -M(10) ** 6
    lo, hi = M(-60) / nu - 2, mp.log1p(M(120) / nu) / 2 + 1
    with mp.workdps(20):
        a, b, G = lo, hi, (mp.sqrt(5) - 1) / 2
        c, d = b - G * (b - a), a + G * (b - a); fc, fd = L(c), L(d)
        while b - a > 1e-5 * (1 + abs(a)):
            if fc >= fd: b, d, fd = d, c, fc; c = b - G * (b - a); fc = L(c)
            else: a, c, fc = c, d, fd; d = a + G * (b - a); fd = L(d)
        u0 = (a + b) / 2; top = L(u0)
        def end(lim):
            if L(lim) > top - 80: return lim
            x, y = u0, lim
            for _ in range(20):
                m = (x + y) / 2
                if L(m) > top - 80: x = m
                else: y = m
            return y
        left, right = end(lo), end(hi)
    return _panels(lambda u: mp.exp(L(u)), left, right, max(8, int(mp.ceil((right - left) / 1.5))), n)

def _nq(z): return mp.erfc(z / mp.sqrt(2)) / 2

def tukey_sf_ref(q, k, nu, dps=30, n=48):
    """P(Q > q) for the studentized range of k normals over ν degrees of freedom (nu = inf: the
    normal's range), the inner integral as written: k∫ φ(z)[Q(z)^(k−1) − (Q(z) − Q(z+w))^(k−1)] dz,
    its subtraction carried in `dps` digits; both integrals by fixed Gauss–Legendre (n points a panel),
    so the answer is checked by asking again with another n."""
    with mp.workdps(dps):
        k = int(k)
        def R(s):
            w = M(q) * s
            g = lambda z: k * mp.npdf(z) * (_nq(z) ** (k - 1) - (_nq(z) - _nq(z + w)) ** (k - 1))
            a = min(-w / 2, M(-6)) - 11
            return _panels(g, a, M(11), int(mp.ceil((11 - a) / 4)), n)
        return f(_over_s(R, nu, n))

def dunnett_sf_ref(c, lam, nu, two=True, dps=30, n=48):
    """P(max |T_i| ≥ c) (one-sided: max T_i ≥ c) for T_i = (λ_i Z₀ + √(1−λ_i²) E_i)/s, as written:
    ∫ φ(z) [1 − Π(1 − Q(a_i) − Q(b_i))] dz, a_i = (cs − λ_i z)/τ_i, b_i = (cs + λ_i z)/τ_i; the inner
    integral in panels between the comparisons' peaks λ_i·cs, each split by its own width."""
    with mp.workdps(dps):
        L = [M(l) for l in lam]; T = [mp.sqrt(1 - l * l) for l in L]
        def I(s):
            w = M(c) * s
            def g(z):
                p = M(1)
                for l, t in zip(L, T):
                    p *= 1 - _nq((w - l * z) / t) - (_nq((w + l * z) / t) if two else 0)
                return mp.npdf(z) * (1 - p)
            top = max(l * w for l in L) + 11
            pts = sorted(set([M(0) if two else M(-11), top] + [min(top, max(M(0) if two else M(-11), l * w + j * t)) for l, t in zip(L, T) for j in (-6, -2, 0, 2, 6)]))
            v = mp.fsum(_panels(g, pts[i], pts[i + 1], max(1, int(mp.ceil((pts[i + 1] - pts[i]) / 3))), n) for i in range(len(pts) - 1))
            return 2 * v if two else v
        return f(_over_s(I, nu, n))

# ---------- one-way analysis of variance, exactly (STATS_SPEC 2.4) ----------
def anova_ref(groups):
    """The table, η², ω² and Welch's F of groups of doubles, as rationals (one rounding at the end),
    the tails in 40 digits. Also returns the means, counts and variances as Fractions (`_q`)."""
    G = [[Fr(x) for x in g] for g in groups]; ns = [len(g) for g in G]; N, k = sum(ns), len(G)
    means = [sum(g) / len(g) for g in G]; Mq = sum(sum(g) for g in G) / N
    ssw = sum(sum((x - m) ** 2 for x in g) for g, m in zip(G, means)); ssb = sum(n * (m - Mq) ** 2 for n, m in zip(ns, means))
    df1, df2 = k - 1, N - k; msw = ssw / df2; F = (ssb / df1) / msw; sst = ssb + ssw
    out = {"ssb": fl(ssb), "ssw": fl(ssw), "F": fl(F), "p": f_sf(mpq(F), df1, df2), "eta2": fl(ssb / sst), "omega2": fl((ssb - df1 * msw) / (sst + msw))}
    var = [sum((x - m) ** 2 for x in g) / (len(g) - 1) if len(g) > 1 else None for g, m in zip(G, means)]
    if all(v is not None and v > 0 for v in var):
        w = [n / v for n, v in zip(ns, var)]; W = sum(w); mu = sum(wi * m for wi, m in zip(w, means)) / W
        a = sum(wi * (m - mu) ** 2 for wi, m in zip(w, means)) / df1; b = sum((1 - wi / W) ** 2 / (n - 1) for wi, n in zip(w, ns))
        Fw = a / (1 + 2 * (k - 2) * b / (k * k - 1)); d2 = Fr(k * k - 1) / (3 * b)
        out.update({"welch.F": fl(Fw), "welch.df2": fl(d2), "welch.p": f_sf(mpq(Fw), df1, mpq(d2))})
    out["_q"] = {"means": means, "ns": ns, "var": var, "msw": msw, "df2": df2, "k": k}
    return out

# ---------- rank tests (STATS_SPEC 2.8): the Hodges–Lehmann estimates and their intervals, exactly ----------
def _u_counts(m, n):
    """The number of arrangements giving each U = 0 … mn (no ties), as integers."""
    row = [[1] for _ in range(n + 1)]
    for i in range(1, m + 1):
        nr = [[1]]
        for j in range(1, n + 1):
            a, b = row[j], nr[j - 1]; out = [0] * (i * j + 1)
            for u, c in enumerate(a): out[u + j] += c
            for u, c in enumerate(b): out[u] += c
            nr.append(out)
        row = nr
    return row[n]

def _signrank_counts(n):
    c = [1]
    for i in range(1, n + 1):
        d = [0] * (len(c) + i)
        for s, v in enumerate(c): d[s] += v; d[s + i] += v
        c = d
    return c

def _q_lo(counts, p):
    """The smallest q with P(X ≤ q) ≥ p, exactly."""
    tot, s, P = sum(counts), 0, Fr(p)
    for q, c in enumerate(counts):
        s += c
        if Fr(s, tot) >= P: return q
    return len(counts) - 1

def _ties(v):
    from collections import Counter
    return sum(t ** 3 - t for t in Counter(v).values())

def hl_ref(kind, x, y=None, alt="two", conf=0.95, exact=None, mu0=0.0):
    """The shift (two samples: the median of every x − y) or pseudo-median (one sample: of the Walsh
    averages of the non-zero x − mu0, plus mu0) and its interval by the order statistics R's wilcox.test
    takes when exact, Hollander and Wolfe's normal approximation otherwise; in rationals."""
    a1 = (1 - conf) / 2 if alt == "two" else 1 - conf
    if kind == "two":
        X, Y = [Fr(v) for v in x], [Fr(v) for v in y]; m, n = len(X), len(Y); K = m * n
        d = sorted(a - b for a in X for b in Y); tie = _ties(list(X) + list(Y)); N = m + n
        if exact: q = max(1, _q_lo(_u_counts(m, n), a1))
        else: q = max(1, int(mp.floor(mp.mpf(K) / 2 - stats_isf(a1) * mp.sqrt(mpq(Fr(K, 12) * ((N + 1) - Fr(tie, N * (N - 1))))))))
    else:
        z = [Fr(v) - Fr(mu0) for v in x]; z = [v for v in z if v != 0]; nn = len(z); K = nn * (nn + 1) // 2
        w = [(z[i] + z[j]) / 2 + Fr(mu0) for i in range(nn) for j in range(i, nn)]; d = sorted(w); tie = _ties([abs(v) for v in z])
        if exact: q = max(1, _q_lo(_signrank_counts(nn), a1))
        else: q = max(1, int(mp.floor(mp.mpf(K) / 2 - stats_isf(a1) * mp.sqrt(mpq(Fr(nn * (nn + 1) * (2 * nn + 1), 24) - Fr(tie, 48))))))
    med = d[(K - 1) // 2] if K % 2 else (d[K // 2 - 1] + d[K // 2]) / 2
    lo, hi = d[q - 1], d[K - q]
    ci = [-math.inf, fl(hi)] if alt == "less" else [fl(lo), math.inf] if alt == "greater" else [fl(lo), fl(hi)]
    return {"hl": fl(med), "ci.0": ci[0], "ci.1": ci[1]}

def stats_isf(p):
    """The normal's upper quantile in 40 digits."""
    return -mp.sqrt(2) * mp.erfinv(2 * M(p) - 1)

# ---------- correlation (STATS_SPEC 2.9), exactly ----------
def _pearson_q(x, y):
    """r in 40 digits and 1 − r² as an exact rational, so that neither loses digits near ±1."""
    X, Y = [Fr(v) for v in x], [Fr(v) for v in y]; n = len(X); mx, my = sum(X) / n, sum(Y) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(X, Y)); sxx = sum((a - mx) ** 2 for a in X); syy = sum((b - my) ** 2 for b in Y)
    return mpq(sxy) / mp.sqrt(mpq(sxx) * mpq(syy)), (sxx * syy - sxy * sxy) / (sxx * syy)

def _pearson_mp(x, y):
    return _pearson_q(x, y)[0]

def _t_of(r, omr2, df):
    return r * mp.sqrt(M(df) / mpq(omr2)) if omr2 else mp.sign(r) * mp.inf

def _avg_ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [None] * len(v); i = 0
    while i < len(v):
        j = i
        while j + 1 < len(v) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = Fr(i + j, 2) + 1
        i = j + 1
    return r

def _t_p(t, df, alt):
    """t's p, each one-sided tail from its own end: the tail past |t| is half the two-sided p, and only the
    other is 1 − that (formed as 1 − (1 − p) it kept ten digits of a p of 1e-30, and none of 1e-49)."""
    two = M(0) if mp.isinf(t) else _ibeta(M(df) / 2, M(1) / 2, M(df) / (M(df) + t * t))
    if alt == "two": return two
    far = (t > 0) == (alt == "greater")
    return two / 2 if far else 1 - two / 2

def corr_ref(x, y, alt="two", conf=0.95):
    """Pearson's r (rationals, one square root in 40 digits), its t p and Fisher's interval."""
    n = len(x); r, omr2 = _pearson_q(x, y); df = n - 2; t = _t_of(r, omr2, df)
    # atanh r = ½ ln((1 + r)/(1 − r)): the smaller of 1 ± r as (1 − r²) over the other
    z = (2 * mp.log(1 + r) - mp.log(mpq(omr2))) / 2 if r >= 0 else (mp.log(mpq(omr2)) - 2 * mp.log(1 - r)) / 2
    q = stats_isf((1 - conf) / 2 if alt == "two" else 1 - conf); se = 1 / mp.sqrt(M(n - 3))
    lo, hi = mp.tanh(z - q * se), mp.tanh(z + q * se)
    ci = [-1.0, f(hi)] if alt == "less" else [f(lo), 1.0] if alt == "greater" else [f(lo), f(hi)]
    return {"r": f(r), "p": f(_t_p(t, df, alt)), "ci.0": ci[0], "ci.1": ci[1]}

def spearman_ref(x, y, alt="two"):
    r, omr2 = _pearson_q(_avg_ranks(x), _avg_ranks(y)); df = len(x) - 2; t = _t_of(r, omr2, df)
    return {"rho": f(r), "p": f(_t_p(t, df, alt))}

def kendall_ref(x, y, alt="two"):
    """τ-b by counting every pair; p from the exact count of permutations (no ties, under 50, as R) or the
    normal with the ties' variance (SciPy's), in 40 digits."""
    from collections import Counter
    n = len(x); con = dis = 0
    for i in range(n):
        for j in range(i + 1, n):
            s = (x[i] - x[j]) * (y[i] - y[j])
            if s > 0: con += 1
            elif s < 0: dis += 1
    tot = n * (n - 1) // 2; tx = Counter(x).values(); ty = Counter(y).values()
    xt = sum(c * (c - 1) // 2 for c in tx); yt = sum(c * (c - 1) // 2 for c in ty)
    tau = M(con - dis) / mp.sqrt(M(tot - xt) * M(tot - yt)); out = {"tau": f(tau)}
    if xt == 0 and yt == 0 and n < 50:
        c = [1]
        for m in range(2, n + 1):
            d = [0] * (len(c) + m - 1)
            for k, v in enumerate(c):
                for jj in range(m): d[k + jj] += v
            c = d
        tot_perm = math.factorial(n); pg = Fr(sum(c[:dis + 1]), tot_perm); pl = Fr(sum(c[dis:]), tot_perm)
        out["p"] = float(pg if alt == "greater" else pl if alt == "less" else min(1, 2 * min(pg, pl)))
    else:
        x0 = sum(c * (c - 1) * (c - 2) for c in tx); x1 = sum(c * (c - 1) * (2 * c + 5) for c in tx)
        y0 = sum(c * (c - 1) * (c - 2) for c in ty); y1 = sum(c * (c - 1) * (2 * c + 5) for c in ty); m = n * (n - 1)
        var = Fr(m * (2 * n + 5) - x1 - y1, 18) + Fr(2 * xt * yt, m) + Fr(x0 * y0, 9 * m * (n - 2))
        z = M(con - dis) / mp.sqrt(mpq(var))
        out["p"] = f(mp.erfc(z / mp.sqrt(2)) / 2 if alt == "greater" else mp.erfc(-z / mp.sqrt(2)) / 2 if alt == "less" else mp.erfc(abs(z) / mp.sqrt(2)))
    return out

def partial_ref(cols):
    """Partial r of each pair given the rest, from the inverse of the correlation matrix in 40 digits."""
    k = len(cols); R = mp.matrix(k, k)
    for i in range(k):
        for j in range(k): R[i, j] = 1 if i == j else _pearson_mp(cols[i], cols[j])
    P = R ** -1; df = len(cols[0]) - k; out = []
    for i in range(k):
        for j in range(i + 1, k):
            r = -P[i, j] / mp.sqrt(P[i, i] * P[j, j]); t = r * mp.sqrt(M(df) / ((1 - r) * (1 + r)))
            out.append({"r": f(r), "p": f(_t_p(t, df, "two"))})
    return out

# ---------- counts in tables (STATS_SPEC 2.10), exactly ----------
def xtab_ref(T, yates=True):
    """χ² (rational, Yates' for 2 × 2 when asked), G (40 digits), their χ² tails, Cramér's V."""
    T = [[int(v) for v in r] for r in T]; R = [sum(r) for r in T]; C = [sum(r[j] for r in T) for j in range(len(T[0]))]; N = sum(R)
    E = [[Fr(R[i] * C[j], N) for j in range(len(C))] for i in range(len(R))]; df = (len(R) - 1) * (len(C) - 1)
    X2 = sum((T[i][j] - E[i][j]) ** 2 / E[i][j] for i in range(len(R)) for j in range(len(C)))
    if yates and df == 1:
        Xc = sum((abs(T[i][j] - E[i][j]) - min(Fr(1, 2), abs(T[i][j] - E[i][j]))) ** 2 / E[i][j] for i in range(len(R)) for j in range(len(C)))
    else: Xc = X2
    G = 2 * sum(M(T[i][j]) * mp.log(mpq(T[i][j] / E[i][j])) for i in range(len(R)) for j in range(len(C)) if T[i][j] > 0)
    sf = lambda x: mp.gammainc(M(df) / 2, x / 2, mp.inf, regularized=True)
    return {"X2": f(mpq(Xc)), "p": f(sf(mpq(Xc))), "G": f(G), "pG": f(sf(G)), "V": f(mp.sqrt(mpq(X2) / (N * (min(len(R), len(C)) - 1))))}

def fisher_rc_ref(T):
    """Freeman–Halton's p in rationals: every table with the margins, cell by cell; those no more probable than the
    observed (R's relative tolerance 1e-7) summed."""
    T = [[int(v) for v in r] for r in T]; R = [sum(r) for r in T]; C = [sum(r[j] for r in T) for j in range(len(T[0]))]; N = sum(R)
    r, c = len(R), len(C); fact = [1]
    for k in range(1, N + 1): fact.append(fact[-1] * k)
    num = 1
    for v in R + C: num *= fact[v]
    def prob(cells):
        d = fact[N]
        for v in cells: d *= fact[v]
        return Fr(num, d)
    pobs = prob([v for row in T for v in row]); lim = pobs * (1 + Fr(1, 10 ** 7)); total = Fr(0)
    def go(i, j, row, col, cells):
        nonlocal total
        if i == r - 1:
            q = prob(cells + col)
            if q <= lim: total += q
            return
        if j == c - 1:
            v = row[i]
            if v > col[j]: return
            col[j] -= v; go(i + 1, 0, row, col, cells + [v]); col[j] += v; return
        rest = sum(col[j + 1:]); lo = max(0, row[i] - rest); hi = min(row[i], col[j])
        for v in range(lo, hi + 1):
            row[i] -= v; col[j] -= v; go(i, j + 1, row, col, cells + [v]); row[i] += v; col[j] += v
    go(0, 0, R[:], C[:], [])
    return float(min(Fr(1), total))

def mcnemar_ref(b, c, cc=True):
    d = abs(b - c); X2 = Fr((d - 1 if cc else d) ** 2, b + c)  # not clamped at 0, as R and statsmodels
    n = b + c; k = min(b, c); pe = min(Fr(1), 2 * Fr(sum(math.comb(n, i) for i in range(k + 1)), 2 ** n))
    return {"X2": float(X2), "p": f(mp.gammainc(M(1) / 2, mpq(X2) / 2, mp.inf, regularized=True)), "pExact": float(pe)}

# ---------- the linear model (STATS_SPEC 2.5) ----------
def _lm_terms(vars_, spec):
    pw = max(1, min(10, int(spec.get("pow") or 1)))
    T = []
    for i, v in enumerate(vars_):
        T.append([(i, 1)])
        if v["num"]:
            for d in range(2, pw + 1): T.append([(i, d)])
    k = len(vars_); top = k if spec.get("inter") == "all" else 2 if spec.get("inter") == "pairs" else 1
    import itertools
    for s in range(2, top + 1):
        for c in itertools.combinations(range(k), s): T.append([(i, 1) for i in c])
    return T

def _lm_name(vars_, t): return ":".join(vars_[i]["name"] + ("^%d" % d if d > 1 else "") for i, d in t)

def _lm_cols(vars_, terms, spec, n):
    """lmCols in rationals: the same columns, names and order."""
    icpt = spec.get("icpt", True) is not False
    X, names, tc = [], [], []
    if icpt: X.append([Fr(1)] * n); names.append("(Intercept)"); tc.append(-1)
    spanned = icpt
    for ti, t in enumerate(terms):
        parts = [([Fr(1)] * n, "")]
        for i, d in t:
            v = vars_[i]; add = []
            if v["num"]:
                add.append(([Fr(a) ** d for a in v["x"]], v["name"] + ("^%d" % d if d > 1 else "")))
            else:
                L = len(v["levels"]); full = (not spanned) and len(t) == 1; eff = (not full) and spec.get("coding") == "effect"
                ls = [l for l in range(L) if full or (l < L - 1 if eff else l > 0)]
                for l in ls:
                    add.append(([Fr(1) if c == l else Fr(-1) if (eff and c == L - 1) else Fr(0) for c in v["code"]], "%s[%s]" % (v["name"], v["levels"][l])))
                if full: spanned = True
            parts = [([q[r] * a[r] for r in range(n)], (qn + ":" + an) if qn else an) for a, an in add for q, qn in parts]
        for q, qn in parts: X.append(q); names.append(qn); tc.append(ti)
    return X, names, tc

def _lm_exact(cols, y):
    """Least squares in rationals: columns kept in order unless exactly a combination of those before (the Schur complement
    of the Gram matrix zero). (kept, b {j: Fr}, inverse of the kept Gram matrix, rss, fitted)."""
    m, n = len(cols), len(y)
    G = [[sum(cols[a][r] * cols[b][r] for r in range(n)) for b in range(m)] for a in range(m)]
    g = [sum(cols[a][r] * y[r] for r in range(n)) for a in range(m)]
    kept = []
    for j in range(m):
        idx = kept + [j]
        A = [[G[a][b] for b in idx] for a in idx]
        # the last pivot of A's elimination is the Schur complement
        A = [row[:] for row in A]; k = len(idx); ok = True
        for p in range(k - 1):
            for r in range(p + 1, k):
                if A[r][p] != 0:
                    f_ = A[r][p] / A[p][p]
                    for c in range(p, k): A[r][c] -= f_ * A[p][c]
        if A[k - 1][k - 1] != 0: kept.append(j)
    k = len(kept)
    A = [[G[a][b] for b in kept] + [Fr(1) if t == u else Fr(0) for u in range(k)] for t, a in enumerate(kept)]
    for p in range(k):
        piv = A[p][p]; A[p] = [v / piv for v in A[p]]
        for r in range(k):
            if r != p and A[r][p] != 0:
                f_ = A[r][p]; A[r] = [A[r][c] - f_ * A[p][c] for c in range(2 * k)]
    Vi = [row[k:] for row in A]
    gk = [g[a] for a in kept]
    b = {kept[t]: sum(Vi[t][u] * gk[u] for u in range(k)) for t in range(k)}
    fit = [sum(cols[j][r] * b[j] for j in kept) for r in range(n)]
    rss = sum((y[r] - fit[r]) ** 2 for r in range(n))
    return kept, b, Vi, rss, fit

def _f_p(F, d1, d2):
    if F <= 0: return mp.mpf(1)
    F, d1, d2 = mp.mpf(F), mp.mpf(d1), mp.mpf(d2)
    return mp.betainc(d2 / 2, d1 / 2, 0, d2 / (d2 + d1 * F), regularized=True)

def lm_ref(vars_, y, spec):
    """lmFit's numbers, exactly from the doubles given: rationals to the square roots, 40 digits after."""
    n = len(y); y = [Fr(v) for v in y]; icpt = spec.get("icpt", True) is not False
    terms = _lm_terms(vars_, spec); X, names, tc = _lm_cols(vars_, terms, spec, n)
    kept, b, Vi, rss, fit = _lm_exact(X, y); rank = len(kept); dfr = n - rank
    s2 = rss / dfr; conf = spec.get("conf") or 0.95
    tq = mp.mpf(t_isf((1 - conf) / 2, dfr, 2.0))
    out = {"names": names, "b": [], "se": [], "t": [], "p": [], "lo": [], "hi": [], "rank": rank, "dfr": dfr, "rss": fl(rss), "s": f(mp.sqrt(mpq(s2)))}
    for j in range(len(X)):
        if j not in b:
            for k_ in ("b", "se", "t", "p", "lo", "hi"): out[k_].append(None)
            continue
        t_ = kept.index(j); se = mp.sqrt(mpq(s2 * Vi[t_][t_])); bj = mpq(b[j])
        out["b"].append(fl(b[j])); out["se"].append(f(se)); out["lo"].append(f(bj - tq * se)); out["hi"].append(f(bj + tq * se))
        if se == 0: out["t"].append(None); out["p"].append(None); continue  # an exact fit: t is infinite
        tt = bj / se; out["t"].append(f(tt)); out["p"].append(f(2 * _t_tail(abs(tt), mp.mpf(dfr))))
    def fitted(cols):
        if not cols: return [Fr(0)] * n, 0
        kk, bb, _, _, ff = _lm_exact([X2[j] for j in cols], y); return ff, len(kk)
    X2 = X
    base = [0] if icpt else []
    f0, r0 = fitted(base)
    sst = sum((y[r] - f0[r]) ** 2 for r in range(n)); ssm = sum((fit[r] - f0[r]) ** 2 for r in range(n)); df1 = rank - (1 if icpt else 0)
    out["r2"] = fl(ssm / sst) if sst else None
    out["ar2"] = fl(1 - (1 - ssm / sst) * Fr(n - (1 if icpt else 0), dfr)) if sst else None
    Fm = (ssm / df1) / s2 if df1 > 0 and s2 > 0 else None
    out["F"] = fl(Fm) if Fm is not None else None; out["df1"] = df1; out["pF"] = f(_f_p(mpq(Fm), df1, dfr)) if Fm is not None else None
    ty = int(spec.get("ss") or 3)
    D3 = (X, names, tc)
    if ty == 3 and spec.get("coding") != "effect" and any(not v["num"] for v in vars_):
        D3 = _lm_cols(vars_, terms, dict(spec, coding="effect"), n)
    def cols_of(D, keep): return [j for j in range(len(D[0])) if D[2][j] == -1 or D[2][j] in keep]
    def contains(u, t): return all(any(i2 == i and d2 == d for i2, d2 in u) for i, d in t)
    rows = []
    for ti, t in enumerate(terms):
        if ty == 1: D = (X, names, tc); A = cols_of(D, [u for u in range(len(terms)) if u < ti]); B = cols_of(D, [u for u in range(len(terms)) if u <= ti])
        elif ty == 2:
            D = (X, names, tc); oth = [u for u in range(len(terms)) if u != ti and not contains(terms[u], t)]; A = cols_of(D, oth); B = cols_of(D, oth + [ti])
        else: D = D3; A = cols_of(D, [u for u in range(len(terms)) if u != ti]); B = cols_of(D, list(range(len(terms))))
        X2 = D[0]
        fa, ra = fitted(A); fb, rb = fitted(B); df = rb - ra; ss = sum((fa[r] - fb[r]) ** 2 for r in range(n))
        row = {"df": df, "ss": fl(ss)}
        if df > 0 and s2 > 0:
            Fv = (ss / df) / s2; row["F"] = fl(Fv); row["p"] = f(_f_p(mpq(Fv), df, dfr))
        rows.append(row)
    out["anova"] = rows
    con = []
    for q in spec.get("con") or []:
        L = [Fr(q["L"].get(nm, 0)) for nm in names]
        # estimable: L lies in the row space, i.e. L·v = 0 for every v with Xv = 0 (aliased columns written by the kept)
        est = sum(L[j] * b[j] for j in kept) - Fr(q.get("c", 0))
        var = s2 * sum(L[kept[t]] * L[kept[u]] * Vi[t][u] for t in range(rank) for u in range(rank))
        se = mp.sqrt(mpq(var)); tt = mpq(est) / se if se else None
        con.append({"est": fl(est), "se": f(se), "t": f(tt) if tt is not None else None, "p": f(2 * _t_tail(abs(tt), mp.mpf(dfr))) if tt is not None else None})
    if con: out["con"] = con
    return out

# ---------- two- and three-way ANOVA (STATS_SPEC 2.6): estimated means, their differences, simple effects, exactly ----------
def nway_ref(vars_, y, spec):
    """For a design with no empty cell: each factor's estimated means (each cell weighted alike) with their errors, the
    first two factors' cells', every pair's difference with its error and t, and the simple effects' F (each factor's
    levels at each level of another), in rationals; the tails in 40 digits."""
    n = len(y); y = [Fr(v) for v in y]; sp = dict(spec, coding="effect")
    terms = _lm_terms(vars_, sp); X, names, tc = _lm_cols(vars_, terms, sp, n)
    kept, b, Vi, rss, fit = _lm_exact(X, y); r = len(kept); dfr = n - r; s2 = rss / dfr
    assert r == len(X), "an empty cell"
    def cell(codes):
        X1, _, _ = _lm_cols([dict(v, code=[c]) for v, c in zip(vars_, codes)], terms, sp, 1); return [col[0] for col in X1]
    import itertools
    def emmL(fixed):
        ls = [[fixed[i]] if i in fixed else list(range(len(v["levels"]))) for i, v in enumerate(vars_)]
        cs = list(itertools.product(*ls)); rows = [cell(c) for c in cs]
        return [sum(row[j] for row in rows) / len(cs) for j in range(len(X))]
    def est(L):
        e = sum(L[j] * b[j] for j in kept); v = sum(L[kept[t]] * L[kept[u]] * Vi[t][u] for t in range(r) for u in range(r)); return e, v
    out = {"means": [], "cells": [], "pairs": [], "simple": []}
    for i, v in enumerate(vars_):
        row = []
        for l in range(len(v["levels"])):
            e, vv = est(emmL({i: l})); row.append({"m": fl(e), "se": f(mp.sqrt(mpq(vv * s2)))})
        out["means"].append(row)
    for la in range(len(vars_[0]["levels"])):
        for lb in range(len(vars_[1]["levels"])):
            e, vv = est(emmL({0: la, 1: lb})); out["cells"].append({"m": fl(e), "se": f(mp.sqrt(mpq(vv * s2)))})
    for i, v in enumerate(vars_):
        k = len(v["levels"])
        for a in range(k):
            for c in range(a + 1, k):
                La, Lc = emmL({i: a}), emmL({i: c}); e, vv = est([p - q for p, q in zip(La, Lc)]); se = mp.sqrt(mpq(vv * s2)); t = mpq(e) / se
                out["pairs"].append({"f": i, "a": a, "b": c, "diff": fl(e), "se": f(se), "t": f(t), "p": f(2 * _t_tail(abs(t), mp.mpf(dfr)))})
    for i, fv in enumerate(vars_):
        for j, gv in enumerate(vars_):
            if i == j: continue
            for l in range(len(gv["levels"])):
                L0 = emmL({i: 0, j: l}); Ls = []
                for a in range(1, len(fv["levels"])):
                    La = emmL({i: a, j: l}); Ls.append([p - q for p, q in zip(La, L0)])
                q = len(Ls); lb = [sum(L[j2] * b[j2] for j2 in kept) for L in Ls]
                C = [[sum(A[kept[t]] * B[kept[u]] * Vi[t][u] for t in range(r) for u in range(r)) for B in Ls] for A in Ls]
                # solve C z = lb in rationals
                Mx = [C[ii][:] + [lb[ii]] for ii in range(q)]
                for p_ in range(q):
                    piv = Mx[p_][p_]; Mx[p_] = [x / piv for x in Mx[p_]]
                    for rr in range(q):
                        if rr != p_ and Mx[rr][p_] != 0:
                            fct = Mx[rr][p_]; Mx[rr] = [x - fct * yv for x, yv in zip(Mx[rr], Mx[p_])]
                z = [Mx[ii][q] for ii in range(q)]; F = sum(lb[ii] * z[ii] for ii in range(q)) / q / s2
                out["simple"].append({"f": i, "g": j, "l": l, "F": fl(F), "df1": q, "p": f(_f_p(mpq(F), q, dfr))})
    out["dfr"] = dfr
    return out

# ---------- repeated measures (STATS_SPEC 2.7): every number from rational projections (basis-free), tails in 40 digits ----------
def _rm_mul(A, B): return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]
def _rm_T(A): return [list(r) for r in zip(*A)]
def _rm_inv(A):
    n = len(A); M = [list(A[i]) + [Fr(1) if i == j else Fr(0) for j in range(n)] for i in range(n)]
    for p in range(n):
        q = next(r for r in range(p, n) if M[r][p] != 0); M[p], M[q] = M[q], M[p]; piv = M[p][p]; M[p] = [x / piv for x in M[p]]
        for r in range(n):
            if r != p and M[r][p] != 0: f_ = M[r][p]; M[r] = [x - f_ * y for x, y in zip(M[r], M[p])]
    return [row[n:] for row in M]
def _rm_det(A):
    n = len(A); M = [list(r) for r in A]; d = Fr(1)
    for p in range(n):
        q = next((r for r in range(p, n) if M[r][p] != 0), None)
        if q is None: return Fr(0)
        if q != p: M[p], M[q] = M[q], M[p]; d = -d
        d *= M[p][p]
        for r in range(p + 1, n):
            f_ = M[r][p] / M[p][p]; M[r] = [x - f_ * y for x, y in zip(M[r], M[p])]
    return d
def _helm(L): return [[Fr(1) if i < j else Fr(-j) if i == j else Fr(0) for j in range(1, L)] for i in range(L)]
def _kron(A, B): return [[x * y for x in ra for y in rb] for ra in A for rb in B]
def rm_ref(Y, lv, grp=None):
    """rmAnova's numbers for the doubles Y (subjects × cells), exactly where they are rational."""
    n, c = len(Y), len(Y[0]); Y = [[Fr(v) for v in r] for r in Y]; a = lv[0]; b = lv[1] if len(lv) > 1 else 1
    gl = sorted(set(grp)) if grp else [0]; g = len(gl); code = [gl.index(v) for v in grp] if grp else [0] * n
    sm = [sum(r) / c for r in Y]; D = [[v - sm[i] for v in r] for i, r in enumerate(Y)]
    X = [[Fr(1)] + [Fr(1) if code[i] == l else Fr(-1) if code[i] == g - 1 else Fr(0) for l in range(g - 1)] for i in range(n)]
    Xt = _rm_T(X); Vi = _rm_inv(_rm_mul(Xt, X)); Bc = _rm_mul(Vi, _rm_mul(Xt, D)); XB = _rm_mul(X, Bc)
    R = [[D[i][j] - XB[i][j] for j in range(c)] for i in range(n)]; E = _rm_mul(_rm_T(R), R)
    def hyp(rows):
        L = [[Fr(1) if j == r else Fr(0) for j in range(g)] for r in rows]; LB = _rm_mul(L, Bc); M = _rm_inv(_rm_mul(_rm_mul(L, Vi), _rm_T(L)))
        return _rm_mul(_rm_mul(_rm_T(LB), M), LB)
    HI = hyp([0]); HG = hyp(list(range(1, g))) if g > 1 else None
    ones = lambda L: [[Fr(1)] for _ in range(L)]
    Bs = [([0], _helm(a))] if len(lv) == 1 else [([0], _kron(_helm(a), ones(b))), ([1], _kron(ones(a), _helm(b))), ([0, 1], _kron(_helm(a), _helm(b)))]
    dfe = n - g; out = []
    tr = lambda A: sum(A[i][i] for i in range(len(A)))
    for k, B in Bs:
        d = len(B[0]); Bt = _rm_T(B); P = _rm_mul(_rm_mul(B, _rm_inv(_rm_mul(Bt, B))), Bt)
        ss = tr(_rm_mul(P, HI)); ssg = tr(_rm_mul(P, HG)) if HG else Fr(0); PE = _rm_mul(P, E); sse = tr(PE)
        t1 = sse / dfe; t2 = tr(_rm_mul(PE, PE)) / dfe ** 2
        F = (ss / d) / (sse / (d * dfe)); Fg = (ssg / (d * (g - 1))) / (sse / (d * dfe)) if g > 1 else None
        gg = min(Fr(1), t1 * t1 / (d * t2)) if d > 1 else Fr(1)
        hf = min(Fr(1), (n * d * gg - 2) / (d * (dfe - d * gg))) if d > 1 else Fr(1)
        o = {"k": k, "d": d, "ss": fl(ss), "ssg": fl(ssg), "sse": fl(sse), "F": fl(F), "p": f(_f_p(mpq(F), d, d * dfe)), "gg": fl(gg), "hf": fl(hf),
             "pgg": f(_f_p(mpq(F), mpq(d * gg), mpq(d * dfe * gg))), "phf": f(_f_p(mpq(F), mpq(d * hf), mpq(d * dfe * hf)))}
        if Fg is not None: o["Fg"] = fl(Fg); o["pg"] = f(_f_p(mpq(Fg), d * (g - 1), d * dfe))
        if d > 1:
            detS = _rm_det(_rm_mul(_rm_mul(Bt, E), B)) / _rm_det(_rm_mul(Bt, B)) / Fr(dfe) ** d; W = detS / (t1 / d) ** d
            x2 = -(dfe - mp.mpf(2 * d * d + d + 2) / (6 * d)) * mp.log(mpq(W)); df = d * (d + 1) // 2 - 1
            o["W"] = fl(W); o["x2"] = f(x2); o["mp"] = f(mp.gammainc(mp.mpf(df) / 2, x2 / 2, mp.inf, regularized=True))
        out.append(o)
    # between subjects: the subjects' means (the √c of the total's direction cancels in F)
    s = [[v] for v in sm]; Bs0 = _rm_mul(Vi, _rm_mul(Xt, s)); r0 = [s[i][0] - sum(X[i][j] * Bs0[j][0] for j in range(g)) for i in range(n)]
    sse0 = sum(v * v for v in r0) * c; bt = {"sse": fl(sse0)}
    if g > 1:
        L = [[Fr(1) if j == r else Fr(0) for j in range(g)] for r in range(1, g)]; LB = _rm_mul(L, Bs0); M = _rm_inv(_rm_mul(_rm_mul(L, Vi), _rm_T(L)))
        ssg0 = _rm_mul(_rm_mul(_rm_T(LB), M), LB)[0][0] * c; Fg0 = (ssg0 / (g - 1)) / (sse0 / dfe); bt.update({"ssg": fl(ssg0), "Fg": fl(Fg0), "pg": f(_f_p(mpq(Fg0), g - 1, dfe))})
    return {"effs": out, "between": bt}
