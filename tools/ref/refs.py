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
