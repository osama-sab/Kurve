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
