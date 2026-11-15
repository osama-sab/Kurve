"""Implicit fits by orthogonal distance, written apart from Kurve (FIT2_SPEC 4.5), for the fixtures and the fuzzer.

Each point's foot on the curve is found globally: the curve sampled densely (720 places a point), the nearest sample refined by
Newton's method on the squared distance's derivative, vectorised over every point, a step halved while it does not bring the point
nearer. The parameters are polished by SciPy's least_squares on the distances with their exact Jacobian (the envelope theorem: a
distance's derivative is minus the unit normal times the curve's derivative at the foot, the foot held), from a start near the
optimum. Its covariance, s²(JᵀJ)⁻¹ over n − m, is the parameters' block of the parametric problem's (the Schur complement of the
feet). Kurve finds its feet another way (Eberly's bisection for an ellipse, Newton projection for a formula).
"""
import math
import numpy as np
from scipy import optimize

D2R = math.pi / 180


def _ell_xy(p, ph, theta):
    xc, yc, a, b = p[:4]
    T = p[4] * D2R if theta else 0.0
    c, s = math.cos(T), math.sin(T)
    u, v = a * np.cos(ph), b * np.sin(ph)
    return xc + u * c - v * s, yc + u * s + v * c


def ell_foot(p, X, Y, theta=True):
    """Each point's place φ on the ellipse (xc, yc, a, b[, θ in degrees]) nearest it."""
    xc, yc, a, b = p[:4]
    T = p[4] * D2R if theta else 0.0
    c, s = math.cos(T), math.sin(T)
    u = (X - xc) * c + (Y - yc) * s
    v = -(X - xc) * s + (Y - yc) * c
    K = 720
    g = np.linspace(0, 2 * math.pi, K, endpoint=False)
    D = (u[:, None] - a * np.cos(g)[None, :]) ** 2 + (v[:, None] - b * np.sin(g)[None, :]) ** 2
    ph = g[np.argmin(D, axis=1)]
    dist = lambda q: (u - a * np.cos(q)) ** 2 + (v - b * np.sin(q)) ** 2
    for _ in range(60):
        cq, sq = np.cos(ph), np.sin(ph)
        d1 = 2 * ((u - a * cq) * a * sq - (v - b * sq) * b * cq)
        d2 = 2 * (a * a * sq * sq + (u - a * cq) * a * cq + b * b * cq * cq + (v - b * sq) * b * sq)
        step = np.where(d2 > 0, -d1 / np.where(d2 > 0, d2, 1), -np.sign(d1) * 2 * math.pi / K)
        step = np.clip(step, -2 * math.pi / K, 2 * math.pi / K)
        now = dist(ph)
        for _ in range(30):
            nxt = dist(ph + step)
            bad = nxt > now
            if not bad.any():
                break
            step = np.where(bad, step / 2, step)
        ph = ph + np.where(dist(ph + step) <= now, step, 0)
        if np.max(np.abs(step)) < 1e-15:
            break
    return ph


def parab_foot(p, X, Y):
    """Each point's place t on y = a t² + b t + c nearest it."""
    A, B, C = p
    lo, hi = float(np.min(X)) - 1, float(np.max(X)) + 1
    g = np.linspace(lo - (hi - lo), hi + (hi - lo), 4000)
    D = (X[:, None] - g[None, :]) ** 2 + (Y[:, None] - (A * g * g + B * g + C)[None, :]) ** 2
    t = g[np.argmin(D, axis=1)]
    h = g[1] - g[0]
    dist = lambda q: (X - q) ** 2 + (Y - (A * q * q + B * q + C)) ** 2
    for _ in range(60):
        f, f1 = A * t * t + B * t + C, 2 * A * t + B
        d1 = -2 * (X - t) - 2 * (Y - f) * f1
        d2 = 2 + 2 * f1 * f1 - 2 * (Y - f) * 2 * A
        step = np.where(d2 > 0, -d1 / np.where(d2 > 0, d2, 1), -np.sign(d1) * h)
        step = np.clip(step, -h, h)
        now = dist(t)
        for _ in range(30):
            bad = dist(t + step) > now
            if not bad.any():
                break
            step = np.where(bad, step / 2, step)
        t = t + np.where(dist(t + step) <= now, step, 0)
        if np.max(np.abs(step)) < 1e-15 * (1 + np.max(np.abs(t))):
            break
    return t


def _resid_jac(kind, X, Y):
    """The distances and their Jacobian for `kind`: circle [xc, yc, r], ellipse [xc, yc, a, b, θ], ellipse0 [xc, yc, a, b] along
    the axes, parab [a, b, c] (y − (a x² + b x + c) = 0)."""
    # each point's offset from its foot (rx, ry) is worked out from the centre, not as the point less the foot: with coordinates near
    # 1000 and distances near 1e-5 the difference of the two would keep only eight digits
    def feet(p):
        if kind == "circle":
            dx, dy = X - p[0], Y - p[1]
            ph = np.arctan2(dy, dx)
            rr = np.hypot(dx, dy) - p[2]
            rx, ry = rr * np.cos(ph), rr * np.sin(ph)
            dX = [np.stack([np.ones_like(ph), np.zeros_like(ph)]), np.stack([np.zeros_like(ph), np.ones_like(ph)]), np.stack([np.cos(ph), np.sin(ph)])]
        elif kind in ("ellipse", "ellipse0"):
            th = kind == "ellipse"
            ph = ell_foot(p, X, Y, th)
            T = p[4] * D2R if th else 0.0
            c, s = math.cos(T), math.sin(T)
            cq, sq = np.cos(ph), np.sin(ph)
            u = (X - p[0]) * c + (Y - p[1]) * s
            v = -(X - p[0]) * s + (Y - p[1]) * c
            ru, rv = u - p[2] * cq, v - p[3] * sq
            rx, ry = ru * c - rv * s, ru * s + rv * c
            dX = [np.stack([np.ones_like(ph), np.zeros_like(ph)]), np.stack([np.zeros_like(ph), np.ones_like(ph)]),
                  np.stack([cq * c, cq * s]), np.stack([-sq * s, sq * c])]
            if th:
                dX.append(D2R * np.stack([-p[2] * cq * s - p[3] * sq * c, p[2] * cq * c - p[3] * sq * s]))
        else:
            t = parab_foot(p, X, Y)
            rx, ry = X - t, Y - (p[0] * t * t + p[1] * t + p[2])
            z = np.zeros_like(t)
            dX = [np.stack([z, t * t]), np.stack([z, t]), np.stack([z, np.ones_like(t)])]
        return rx, ry, dX

    def res(p):
        rx, ry, _ = feet(p)
        return np.hypot(rx, ry)

    def jac(p):
        rx, ry, dX = feet(p)
        d = np.hypot(rx, ry)
        d = np.where(d > 0, d, 1)
        nx, ny = rx / d, ry / d
        return np.stack([-(nx * q[0] + ny * q[1]) for q in dX], axis=1)

    return res, jac


def impl_polish(kind, X, Y, p0):
    """(params, errors, ss): the least squares of the orthogonal distances from p0, which should be near the optimum."""
    X, Y = np.asarray(X, float), np.asarray(Y, float)
    res, jac = _resid_jac(kind, X, Y)
    best = None
    q = np.asarray(p0, float)
    for _ in range(6):   # the feet change with the parameters: polish again until the sum stops falling
        r = optimize.least_squares(res, q, jac=jac, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000, x_scale="jac")
        ss = float(np.sum(res(r.x) ** 2))
        if best is not None and ss >= best[1] * (1 - 1e-15):
            break
        best = (r.x.copy(), ss)
        q = r.x
    p, ss = best
    J = jac(p)
    m, n = len(p), len(X)
    C = np.linalg.inv(J.T @ J) * ss / (n - m)
    return [float(v) for v in p], [float(math.sqrt(C[i, i])) for i in range(m)], ss
