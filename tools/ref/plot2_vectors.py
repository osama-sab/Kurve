"""Vectors and radar charts (PLOT2_SPEC 7.5): the reference for Kurve's vecEnd, vecHead, radarFrame and radarPlace,
fixtures/plot2-vectors.json.

From the definitions, in mpmath at 40 digits:

  an arrow from (x, y) on the screen (y down) by an angle a, counterclockwise from the X direction as drawn (degrees, or radians),
  and a length m at k pixels a unit: its end (x + m k cos a, y - m k sin a), the angle taken whole however many turns it is;
  its head a triangle of length h and width w at the end, along the arrow, both times min(1, 0.4 L / h) for an arrow of length L:
  the tip, and the base's two corners at the tip less H along the arrow, plus and minus W/2 across it;
  a radar chart's frame: the box's middle and half its shorter side (4 at least); spoke k of K at 90 - 360 k / K degrees, the first up
  and the rest clockwise; a value v at (v - lo)/(hi - lo) of the radius along its spoke, none outside [lo, hi].

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/plot2_vectors.py   (writes fixtures/plot2-vectors.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
import mpmath as mp
mp.mp.dps = 40

rng = np.random.default_rng(20261127)


def vec_end(x, y, a, m, k, unit):
    if any(v is None or (isinstance(v, float) and not math.isfinite(v)) for v in (x, y, a, m, k)): return None
    t = mp.mpf(a) if unit == "rad" else mp.mpf(a) * mp.pi / 180
    return (mp.mpf(x) + mp.mpf(m) * mp.mpf(k) * mp.cos(t), mp.mpf(y) - mp.mpf(m) * mp.mpf(k) * mp.sin(t))


def vec_head(x0, y0, x1, y1, h, w):
    x0, y0, x1, y1, h, w = (mp.mpf(v) for v in (x0, y0, x1, y1, h, w))
    dx, dy = x1 - x0, y1 - y0; L = mp.sqrt(dx * dx + dy * dy)
    if not L > 0: return None
    s = min(mp.mpf(1), mp.mpf("0.4") * L / h); H, W = h * s, w * s; ux, uy = dx / L, dy / L; bx, by = x1 - ux * H, y1 - uy * H
    return [(x1, y1), (bx - uy * W / 2, by + ux * W / 2), (bx + uy * W / 2, by - ux * W / 2)]


def vec_flat(rows, k, unit, h, w):
    out = []
    for x, y, a, m in rows:
        e = vec_end(x, y, a, m, k, unit)
        if e is None: out.append(None); continue
        H = vec_head(x, y, float(e[0]), float(e[1]), h, w)  # the head from the end as Kurve has it (a double), so the head is judged alone
        out.append(dict(e=[float(e[0]), float(e[1])], head=None if H is None else [[float(c) for c in p] for p in H]))
    return out


def radar_frame(box):
    L, T, pw, mh = (mp.mpf(v) for v in box)
    return dict(cx=L + pw / 2, cy=T + mh / 2, R=max(mp.mpf(4), min(pw, mh) / 2))


def radar_place(F, k, K, v, lo, hi):
    if v is None: return None
    v, lo, hi = mp.mpf(v), mp.mpf(lo), mp.mpf(hi)
    if not hi > lo or v < lo - mp.mpf("1e-12") * (hi - lo) or v > hi + mp.mpf("1e-12") * (hi - lo): return None
    rho = (v - lo) / (hi - lo); ph = (90 - mp.mpf(360) * k / K) * mp.pi / 180
    return (F["cx"] + F["R"] * rho * mp.cos(ph), F["cy"] - F["R"] * rho * mp.sin(ph))


def main():
    vcases = []
    for name, unit, k, n, big in [("degrees, a scale of 14.2", "deg", 14.2, 80, False), ("radians, a scale of 3", "rad", 3.0, 80, False),
                                  ("angles of many turns, lengths below 0", "deg", 7.5, 80, True), ("a tiny scale", "deg", 1e-3, 30, False)]:
        rows = []
        for _ in range(n):
            a = float(rng.uniform(-3, 3) * (360 if unit == "deg" else 2 * math.pi) * (10 if big else 1))
            m = float(rng.uniform(-5, 5) if big else rng.uniform(0, 8))
            rows.append([float(rng.uniform(0, 1400)), float(rng.uniform(0, 900)), a, m])
        rows += [[100.0, 100.0, 0.0, 0.0], [100.0, 100.0, None, 1.0], [10.0, 20.0, 90.0, 1e-9], [50.0, 50.0, 45.0, None]]
        vcases.append(dict(name=name, unit=unit, k=k, h=8.0, w=6.0, rows=rows, want=vec_flat(rows, k, unit, 8.0, 6.0)))
    rcases = []
    for name, box, K, lo, hi in [("six spokes", [43.5, 31.25, 610.0, 520.0], 6, 0.0, 10.0), ("three spokes, below 0", [0, 0, 300, 900], 3, -2.5, 7.5),
                                 ("forty spokes", [12.5, 7.75, 1400.0, 300.0], 40, 0.0, 1e6), ("a box too small", [0, 0, 3, 3], 5, 0.0, 1.0)]:
        F = radar_frame(box); vals = [[int(rng.integers(K)), float(rng.uniform(lo - 0.1 * (hi - lo), hi + 0.1 * (hi - lo)))] for _ in range(100)] + [[0, lo], [K - 1, hi], [1, None]]
        pts = []
        for kk, v in vals:
            q = radar_place(F, kk, K, v, lo, hi); pts.append(None if q is None else [float(q[0]), float(q[1])])
        rcases.append(dict(name=name, box=box, K=K, lo=lo, hi=hi, vals=vals, want=dict(F=[float(F["cx"]), float(F["cy"]), float(F["R"])], pts=pts)))
    out = dict(note="Vectors and radar charts: mpmath at 40 digits from the definitions (tools/ref/plot2_vectors.py)", vectors=vcases, radar=rcases)
    with open(os.path.join(here, "fixtures", "plot2-vectors.json"), "w") as f: json.dump(out, f, separators=(",", ":"))
    print(len(vcases), "vector cases,", sum(len(c["rows"]) for c in vcases), "arrows,", len(rcases), "radar frames,", sum(len(c["vals"]) for c in rcases), "corners")


if __name__ == "__main__":
    main()
