"""Ternary graphs (PLOT2_SPEC 7.4): the reference for Kurve's ternFrame, ternNorm, ternFwd, ternInv, ternGrid and ternTick,
fixtures/plot2-ternary.json.

From the definitions, in mpmath at 40 digits:

  the triangle equilateral, side = max(8, min(pw, mh * 2/sqrt 3)), centred in the box (L, T, pw, mh): A at the top, B at the bottom
  left, C at the bottom right (y down, as the screen's);
  a row (a, b, c) with every part finite and not below 0 and a sum above 0 divided by its sum (exactly, as rationals), else no place;
  its place fa A + fb B + fc C; and again by python-ternary's projection as its source writes it (project_point: a point (p0, p1, p2)
  at x = p0 + p1/2, y = p1 sqrt(3)/2 in units of the side, corners (0, 0), (1, 0), (1/2, sqrt 3/2)), with p0 = fc, p1 = fa (so its
  origin is B, its first corner C and its second A), carried to the screen as B + side (x, -y); the two must agree;
  the inverse of a screen point: the parts from the areas of the three triangles it makes with the corners, over the whole;
  a part's grid line at v: from v K + (1 - v) J to v K + (1 - v) M (K its corner, J and M the other two in the order A, B, C);
  its tick at v on the side from its preceding corner (anticlockwise) or following one (clockwise) to its own, pointing out along its
  grid line (from the far end of the grid line to the near one), as a unit vector.

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/plot2_ternary.py   (writes fixtures/plot2-ternary.json)
"""
import os, sys, json
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
import mpmath as mp
mp.mp.dps = 40

rng = np.random.default_rng(20261127)
R3 = mp.sqrt(3)


def frame(box):
    L, T, pw, mh = [mp.mpf(v) for v in box]
    side = max(mp.mpf(8), min(pw, mh * 2 / R3)); h = side * R3 / 2; x0 = L + (pw - side) / 2; y0 = T + (mh - h) / 2
    return dict(A=(x0 + side / 2, y0), B=(x0, y0 + h), C=(x0 + side, y0 + h), side=side, h=h)


def norm(a, b, c):
    if any(v is None for v in (a, b, c)): return None
    a, b, c = mp.mpf(a), mp.mpf(b), mp.mpf(c)
    if a < 0 or b < 0 or c < 0: return None
    s = a + b + c
    if not s > 0: return None
    return a / s, b / s, c / s


def place(F, f):
    fa, fb, fc = f
    p = (fa * F["A"][0] + fb * F["B"][0] + fc * F["C"][0], fa * F["A"][1] + fb * F["B"][1] + fc * F["C"][1])
    # python-ternary's projection (ternary/helpers.py, project_point), its p0 our fc and p1 our fa
    x, y = fc + fa / 2, fa * R3 / 2
    q = (F["B"][0] + F["side"] * x, F["B"][1] - F["side"] * y)
    assert abs(p[0] - q[0]) < mp.mpf(10) ** -30 and abs(p[1] - q[1]) < mp.mpf(10) ** -30, (p, q)
    return p


def inv(F, x, y):
    P = (mp.mpf(x), mp.mpf(y)); cr = lambda P, Q, R: (Q[0] - P[0]) * (R[1] - P[1]) - (Q[1] - P[1]) * (R[0] - P[0])
    all_ = cr(F["A"], F["B"], F["C"])
    return cr(P, F["B"], F["C"]) / all_, cr(F["A"], P, F["C"]) / all_, cr(F["A"], F["B"], P) / all_


def corners(F): return [F["A"], F["B"], F["C"]]


def grid(F, i, v):
    v = mp.mpf(v); P = corners(F); K, J, M = P[i], P[(i + 1) % 3], P[(i + 2) % 3]
    return [(v * K[0] + (1 - v) * J[0], v * K[1] + (1 - v) * J[1]), (v * K[0] + (1 - v) * M[0], v * K[1] + (1 - v) * M[1])]


def tick(F, i, v, cw):
    v = mp.mpf(v); P = corners(F); K = P[i]; J = P[(i + 1) % 3] if cw else P[(i + 2) % 3]; M = P[(i + 2) % 3] if cw else P[(i + 1) % 3]
    dx, dy = J[0] - M[0], J[1] - M[1]; l = mp.sqrt(dx * dx + dy * dy)
    return (v * K[0] + (1 - v) * J[0], v * K[1] + (1 - v) * J[1], dx / l, dy / l)


def flat(F, rows, vs, cw, scr):
    xy = []
    for a, b, c in rows:
        f = norm(a, b, c); xy.append(None if f is None else [float(t) for t in place(F, f)])
    return dict(A=[float(t) for t in F["A"]], B=[float(t) for t in F["B"]], C=[float(t) for t in F["C"]], xy=xy,
                grid=[[[[float(t) for t in e] for e in grid(F, i, v)] for v in vs] for i in range(3)],
                tick=[[[float(t) for t in tick(F, i, v, cw)] for v in vs] for i in range(3)],
                inv=[[float(t) for t in inv(F, x, y)] for x, y in scr])


def rows_of(n, scale):
    r = []
    for _ in range(n):
        a, b, c = (float(v) for v in rng.dirichlet([1.0, 1.0, 1.0]) * scale)
        r.append([a, b, c])
    return r


def main():
    cases = []
    def add(name, box, rows, vs, cw):
        F = frame(box)
        scr = []
        for _ in range(30):  # inside and a little outside the triangle
            f = rng.dirichlet([1.0, 1.0, 1.0]) * 1.2 - 0.0667
            fa, fb = mp.mpf(f[0]), mp.mpf(f[1]); p = place(F, (fa, fb, 1 - fa - fb)); scr.append([float(p[0]), float(p[1])])
        cases.append(dict(name=name, box=box, rows=rows, vs=vs, cw=cw, scr=scr, want=flat(F, rows, vs, cw, scr)))
    V = [k / 10 for k in range(1, 10)]
    odd = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0], [-1e-300, 1, 1], [-1, 2, 3], [None, 1, 2], [1e300, 1e300, 1e300], [1e-300, 2e-300, 3e-300],
           [5e-324, 0, 0], [0.1, 0.2, 0.7], [33.3, 33.3, 33.4], [1e-16, 1, 1e16]]
    add("fractions, anticlockwise", [43.5, 31.25, 610.0, 520.0], rows_of(80, 1) + odd, V, False)
    add("percentages, clockwise", [43.5, 31.25, 610.0, 520.0], rows_of(80, 100) + odd, V, True)
    add("counts of any size, a tall box", [0, 0, 300, 900], rows_of(60, 1e6), V, False)
    add("a wide box, every fifth", [12.5, 7.75, 1400.0, 300.0], rows_of(60, 3.7), [0.2, 0.4, 0.6, 0.8], True)
    add("a box too small (the side held at 8)", [0, 0, 3, 3], rows_of(10, 1), V, False)
    add("tiny and huge parts", [10, 10, 500, 500], [[float(10 ** rng.uniform(-200, 200)) for _ in range(3)] for _ in range(60)], V, False)
    out = dict(note="Ternary graphs: mpmath at 40 digits from the definitions, and python-ternary's projection (tools/ref/plot2_ternary.py)", cases=cases)
    with open(os.path.join(here, "fixtures", "plot2-ternary.json"), "w") as f: json.dump(out, f, separators=(",", ":"))
    print(len(cases), "frames,", sum(len(c["rows"]) for c in cases), "rows,", sum(len(c["scr"]) for c in cases), "inversions")


if __name__ == "__main__":
    main()
