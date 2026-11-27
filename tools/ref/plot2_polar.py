"""Polar graphs (PLOT2_SPEC 7.3): the reference for Kurve's polarFrame, polarFwd, polarInv and polarJoin, fixtures/plot2-polar.json.

Written from the definition, in mpmath at 40 digits, with complex numbers (not Kurve's sines and cosines one at a time):

  a point (theta, r) is rho * exp(i phi) in units of the radius R, with phi = z0 + s * theta * 2 pi / turn (z0 the zero's direction,
  east 0, north pi/2, west pi, south 3 pi/2, plus a turn of the pan; s +1 anticlockwise, -1 clockwise; turn 360 degrees, 2 pi
  radians or 400 gradians) and rho = hole + (1 - hole)(r - r0)/(r1 - r0); on the screen x = cx + R Re, y = cy - R Im (y down).
  The region is the disc (rho <= 1), or the ring (hole <= rho <= 1), or a sector of either between theta0 and theta1. It is
  fitted into the box (L, T, pw, mh) as large as it goes and centred: its extent is that of the outer and inner arcs, whose
  extremes along x and y are at the sector's ends and at the compass directions between them (and the centre, with no hole).
  A point outside [r0, r1] or the sector has no place.

  The inverse: rho = |z|, phi = arg z, theta = s (phi - z0) turn / (2 pi), in [0, turn), or from the sector's lower end.

  polarJoin: each step between two points taken the short way round in theta, cut into k = max(1, ceil(|d| / (3 turn/360)))
  equal pieces straight in theta and r.

Usage: PYREF=$SC/pyref python3.13 -I tools/ref/plot2_polar.py   (writes fixtures/plot2-polar.json)
"""
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__))
if os.environ.get("PYREF"): sys.path.insert(0, os.environ["PYREF"])
import numpy as np
import mpmath as mp
mp.mp.dps = 40

rng = np.random.default_rng(20261127)
TURN = {"deg": mp.mpf(360), "rad": 2 * mp.pi, "grad": mp.mpf(400)}
TURN_D = {"deg": 360.0, "rad": 2 * math.pi, "grad": 400.0}
ZDEG = {"e": 0, "n": 90, "w": 180, "s": 270}


def frame(o, box):
    L, T, pw, mh = [mp.mpf(v) for v in box]
    turn = TURN[o["unit"]]; s = -1 if o["cw"] else 1; hole = mp.mpf(o["hole"])
    z0 = (mp.mpf(ZDEG[o["zero"]]) + mp.mpf(o["rot"])) * mp.pi / 180
    sector = o["t0"] is not None and o["t1"] is not None and abs(mp.mpf(o["t1"]) - mp.mpf(o["t0"])) < turn
    if not sector:
        bx0, bx1, by0, by1 = -1, 1, -1, 1
    else:
        a = z0 + s * mp.mpf(o["t0"]) * 2 * mp.pi / turn; b = z0 + s * mp.mpf(o["t1"]) * 2 * mp.pi / turn
        lo, hi = min(a, b), max(a, b)
        angs = [lo, hi]; k = int(mp.ceil(lo / (mp.pi / 2)))
        while k * mp.pi / 2 <= hi: angs.append(k * mp.pi / 2); k += 1
        zs = []
        for g in angs:
            e = mp.expj(g); zs += [e, hole * e]
        if hole == 0: zs.append(mp.mpc(0))
        bx0 = min(mp.re(z) for z in zs); bx1 = max(mp.re(z) for z in zs); by0 = min(mp.im(z) for z in zs); by1 = max(mp.im(z) for z in zs)
    R = max(mp.mpf(4), min(pw / (bx1 - bx0), mh / (by1 - by0)))
    return dict(cx=L + pw / 2 - R * (bx0 + bx1) / 2, cy=T + mh / 2 + R * (by0 + by1) / 2, R=R, z0=z0, s=s, turn=turn, hole=hole, sector=sector, o=o)


def fwd(F, th, r):
    o = F["o"]; r0, r1 = mp.mpf(o["r0"]), mp.mpf(o["r1"]); th = mp.mpf(th); r = mp.mpf(r)
    if r < r0 or r > r1: return None
    if F["sector"]:
        lo, hi = min(mp.mpf(o["t0"]), mp.mpf(o["t1"])), max(mp.mpf(o["t0"]), mp.mpf(o["t1"]))
        t = lo + mp.fmod(mp.fmod(th - lo, F["turn"]) + F["turn"], F["turn"])
        if t > hi: return None
    rho = F["hole"] + (1 - F["hole"]) * (r - r0) / (r1 - r0)
    z = rho * mp.expj(F["z0"] + F["s"] * th * 2 * mp.pi / F["turn"])
    return [F["cx"] + F["R"] * mp.re(z), F["cy"] - F["R"] * mp.im(z)]


def inv(F, x, y):
    o = F["o"]; z = mp.mpc((mp.mpf(x) - F["cx"]) / F["R"], -(mp.mpf(y) - F["cy"]) / F["R"])
    rho = abs(z); r = mp.mpf(o["r0"]) + (rho - F["hole"]) / (1 - F["hole"]) * (mp.mpf(o["r1"]) - mp.mpf(o["r0"]))
    th = mp.fmod(F["s"] * (mp.arg(z) - F["z0"]) * F["turn"] / (2 * mp.pi), F["turn"])
    if th < 0: th += F["turn"]
    if F["sector"]:
        lo = min(mp.mpf(o["t0"]), mp.mpf(o["t1"])); th = lo + mp.fmod(mp.fmod(th - lo, F["turn"]) + F["turn"], F["turn"])
    return th, r, rho


def join(pts, turn, maxdeg=3):
    out = []; st = maxdeg * turn / 360
    for i, (t, r) in enumerate(pts):
        if i == 0: out.append([t, r]); continue
        t0, r0 = pts[i - 1]
        d = ((t - t0) % turn + turn) % turn
        if d > turn / 2: d -= turn
        k = max(1, math.ceil(abs(d) / st))
        for j in range(1, k + 1): out.append([t0 + d * j / k, r0 + (r - r0) * j / k])
    return out


def main():
    global cases
    cases = []
    def add(name, o, box, n=60, extra=()):
        F = frame(o, box); turn = TURN_D[o["unit"]]
        lo_t = o["t0"] if F["sector"] else 0.0; hi_t = o["t1"] if F["sector"] else turn
        if F["sector"]: lo_t, hi_t = min(o["t0"], o["t1"]), max(o["t0"], o["t1"])
        th = list(rng.uniform(lo_t, hi_t, n)) + [lo_t, hi_t, 0.0, turn / 4, turn / 2, 3 * turn / 4, turn]
        r = list(rng.uniform(o["r0"], o["r1"], n)) + [o["r0"], o["r1"], o["r0"], (o["r0"] + o["r1"]) / 2, o["r1"], o["r0"], o["r1"]]
        pts = [[float(a), float(b)] for a, b in zip(th, r)] + [list(map(float, e)) for e in extra]
        xy = []
        for a, b in pts:
            q = fwd(F, a, b); xy.append(None if q is None else [float(q[0]), float(q[1])])
        ivs = []
        for q in xy:
            if q is None: continue
            t, rr, rho = inv(F, q[0], q[1]); ivs.append([q[0], q[1], float(t), float(rr)])
        # points of the screen inside the region, inverted
        for _ in range(20):
            x = float(F["cx"] + F["R"] * rng.uniform(-1, 1)); y = float(F["cy"] + F["R"] * rng.uniform(-1, 1))
            t, rr, rho = inv(F, x, y)
            if F["hole"] <= rho <= 1: ivs.append([x, y, float(t), float(rr)])
        cases.append(dict(name=name, o=o, box=box, want=dict(cx=float(F["cx"]), cy=float(F["cy"]), R=float(F["R"])), pts=pts, xy=xy, inv=ivs, turn=turn))


    def O(unit="deg", zero="e", cw=False, hole=0.0, r0=0.0, r1=2.0, t0=None, t1=None, rot=0.0):
        return dict(unit=unit, zero=zero, cw=cw, hole=hole, r0=r0, r1=r1, t0=t0, t1=t1, rot=rot)

    BOX = [43.5, 31.25, 610.0, 520.0]
    for unit in ("deg", "rad", "grad"):
        for zero in ("e", "n", "w", "s"):
            for cw in (False, True):
                add(f"{unit}, zero {zero}, {'clockwise' if cw else 'anticlockwise'}", O(unit=unit, zero=zero, cw=cw), BOX,
                    extra=[[TURN_D[unit] * 1.25, 1.0], [-TURN_D[unit] / 8, 0.5], [TURN_D[unit] / 3, 2.5], [TURN_D[unit] / 3, -0.1]])
    add("a hole of 0.3", O(hole=0.3), BOX)
    add("a hole of 0.8, r from -5 to 15", O(hole=0.8, r0=-5.0, r1=15.0), [10, 10, 400, 900])
    add("turned by the pan, 37.25 degrees", O(rot=37.25), BOX)
    add("a sector 0 to 180, north, clockwise, hole 0.3", O(zero="n", cw=True, hole=0.3, t0=0.0, t1=180.0), [10, 10, 780, 640],
        extra=[[200.0, 1.0], [-10.0, 1.0], [360.0, 1.0]])
    add("a sector across the seam, -60 to 60", O(t0=-60.0, t1=60.0), BOX, extra=[[300.0, 1.0], [90.0, 1.0]])
    add("a sector 10 to 100, south", O(zero="s", t0=10.0, t1=100.0), [0, 0, 300, 200])
    add("a quarter in radians, pi/4 to 3pi/4, hole 0.5", O(unit="rad", t0=math.pi / 4, t1=3 * math.pi / 4, hole=0.5, r0=1.0, r1=3.0), BOX)
    add("gradians 50 to 350, west, clockwise", O(unit="grad", zero="w", cw=True, t0=50.0, t1=350.0), [5, 5, 300, 640])
    add("a sector of 1 degree, r from 1e6 to 1e6 + 3", O(t0=44.5, t1=45.5, r0=1e6, r1=1e6 + 3), [0, 0, 800, 600])
    add("a box too small (R held at 4)", O(), [0, 0, 3, 3], n=10)

    joins = []
    for unit in ("deg", "rad", "grad"):
        turn = TURN_D[unit]
        for name, th in [("rising", np.sort(rng.uniform(0, turn, 12))), ("across the seam", np.array([turn * 0.9, turn * 0.97, turn * 0.02, turn * 0.1])),
                         ("back across the seam", np.array([turn * 0.05, turn * 0.95, turn * 0.6])), ("random", rng.uniform(-turn, 2 * turn, 10))]:
            r = rng.uniform(0, 5, len(th)); pts = [[float(a), float(b)] for a, b in zip(th, r)]
            joins.append(dict(name=f"{unit}, {name}", turn=turn, pts=pts, want=join(pts, turn)))

    out = dict(note="Polar graphs: mpmath at 40 digits from the definition (tools/ref/plot2_polar.py)", cases=cases, joins=joins)
    with open(os.path.join(here, "fixtures", "plot2-polar.json"), "w") as f: json.dump(out, f, separators=(",", ":"))
    print(len(cases), "frames,", sum(len(c["pts"]) for c in cases), "points,", sum(len(c["inv"]) for c in cases), "inversions,", len(joins), "joins")


if __name__ == "__main__":
    main()
