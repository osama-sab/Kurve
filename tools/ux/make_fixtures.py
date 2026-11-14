"""Test data for the UX walkthroughs, realistic and slightly messy, written to
tools/ux/fixtures/. Seeded, so the same files come out every time.

    python tools/ux/make_fixtures.py

calibration.csv  concentration vs absorbance, 8 standards, nearly linear, with an SD column
decay.txt        tab-separated time vs counts: a decay (two lifetimes, so a double
                 exponential fits better than a single one) with Poisson noise, behind a
                 3-line instrument header
growth_eu.csv    semicolon-delimited, decimal commas, three samples' optical density against
                 time, units in a second header row
raman_raw.txt    a Raman spectrum: sloped, slightly curved background, overlapping bands,
                 two cosmic-ray spikes, noise
survey.csv       200 rows of one measured quantity across three groups (long format, with
                 a group name in its own column), one value missing and one written "n/a"
"""
import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent / "fixtures"
rng = random.Random(20261015)


def poisson(lam):
    """A Poisson count: multiplication below 30, a rounded normal above (good enough for data)."""
    if lam < 30:
        L, k, p = math.exp(-lam), 0, 1.0
        while True:
            p *= rng.random()
            if p <= L:
                return k
            k += 1
    return max(0, round(rng.gauss(lam, math.sqrt(lam))))


def comma(v, nd):
    return f"{v:.{nd}f}".replace(".", ",")


def calibration():
    conc = [0, 2.5, 5, 10, 15, 20, 30, 40]
    lines = ["Concentration (mg/L),Absorbance,SD"]
    for c in conc:
        sd = 0.003 + 0.00025 * c                     # replicate spread grows with the signal
        a = 0.012 + 0.02510 * c - 0.00003 * c * c + rng.gauss(0, sd * 0.6)
        lines.append(f"{c:g},{a:.4f},{sd:.4f}")
    lines[3] = lines[3] + " "                         # a stray space, as spreadsheets leave
    return "\n".join(lines) + "\n"


def decay():
    head = ["Instrument\tLifetimeLab TC-200 (TCSPC)", "Acquired\t2026-09-14 10:32:05", "Excitation\t405 nm, 20 MHz"]
    rows = ["Time (ns)\tCounts"]
    for i in range(241):
        t = i * 0.2
        lam = 18 + 3600 * math.exp(-t / 3.8) + 1100 * math.exp(-t / 14.5)
        rows.append(f"{t:.1f}\t{poisson(lam)}")
    return "\r\n".join(head + rows) + "\r\n"         # written on a Windows instrument PC


def growth():
    lines = ["Time;Sample A;Sample B;Sample C", "h;OD600;OD600;OD600"]
    p = [(1.45, 0.42, 7.5, 0.050), (1.20, 0.35, 9.0, 0.047), (0.95, 0.28, 11.5, 0.052)]
    for i in range(25):
        t = i * 1.0
        vals = []
        for K, r, t0, n0 in p:
            y = n0 + (K - n0) / (1 + math.exp(-r * (t - t0)))
            vals.append(comma(max(0.0, y * (1 + rng.gauss(0, 0.015)) + rng.gauss(0, 0.004)), 3))
        lines.append(f"{comma(t, 1)};" + ";".join(vals))
    return "\n".join(lines) + "\n\n"                  # and a blank line at the end


def raman():
    head = ["# Raman spectrometer RS-532, 532.08 nm laser, 1800 l/mm grating",
            "# Sample: polystyrene film on glass, 10 s x 3 accumulations",
            "Raman Shift (cm-1)\tIntensity (counts)"]
    bands = [(620, 6, 1800), (795, 9, 900), (1001, 3.2, 9500), (1031, 4.5, 2600), (1155, 6, 1500),
             (1183, 7, 1200), (1450, 9, 1700), (1583, 6, 2200), (1602, 5.5, 3900)]
    lines = list(head)
    n = 1024
    xs = [200 + i * (1600 / (n - 1)) for i in range(n)]
    spikes = {311: 26000, 702: 18000}                # cosmic rays, one point each
    for i, x in enumerate(xs):
        bg = 2400 + 1.15 * (x - 200) + 0.00055 * (x - 200) ** 2 + 600 * math.exp(-((x - 300) / 220) ** 2)
        y = bg
        for c, w, h in bands:                         # pseudo-Voigt, half Lorentzian
            u = (x - c) / w
            y += h * (0.5 / (1 + u * u) + 0.5 * math.exp(-math.log(2) * u * u))
        y = poisson(y)
        if i in spikes:
            y += spikes[i]
        lines.append(f"{x:.2f}\t{y}")
    return "\n".join(lines) + "\n"


def survey():
    groups = [("Control", 412, 38), ("Caffeine", 371, 34), ("Sleep-deprived", 455, 52)]
    rows = []
    for k in range(200):
        g, mu, sd = groups[k % 3]
        rows.append([f"P{k + 1:03d}", g, f"{max(180, rng.gauss(mu, sd)):.0f}"])
    rng.shuffle(rows)
    rows[57][2] = ""                                  # a missing value
    rows[121][2] = "n/a"                              # and one written in words
    return "Participant,Group,Reaction time (ms)\n" + "\n".join(",".join(r) for r in rows) + "\n"


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    files = {"calibration.csv": calibration(), "decay.txt": decay(), "growth_eu.csv": growth(),
             "raman_raw.txt": raman(), "survey.csv": survey()}
    for name, text in files.items():
        (OUT / name).write_bytes(text.encode("utf-8"))
        print(f"{name}: {text.count(chr(10))} lines")
