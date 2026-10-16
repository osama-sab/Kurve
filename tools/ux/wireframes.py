"""Phase 3: the layout wireframes of the UX spec, drawn to scale.

    python tools/ux/wireframes.py

Writes ux/spec/wireframe-1366.svg and ux/spec/wireframe-1920.svg. Each holds
two frames at the screen's real size in CSS pixels: a first launch (an empty
project) and the working layout (data plotted, a fit in the dock). The numbers in
the frames are the ones UX_SPEC.md §3.2 sets.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "ux" / "spec"

INK, MUTED, RULE, PAPER, CHROME, PANEL, PANEL2, ACC, DATA = "#0B1220", "#364255", "#717E90", "#BCC6D2", "#DFE5EC", "#FFFFFF", "#EEF2F6", "#1D4ED8", "#2a78d6"
MENU_H, TOOL_H, TASK_H, STAT_H = 28, 40, 30, 24
ROW, WIN_H, WS_BAR, WS_HEAD, WS_FOOT = 22, 28, 34, 66, 24


def esc(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size=12, fill=INK, weight=400, anchor="start"):
    return f"<text x='{x}' y='{y}' font-size='{size}' font-weight='{weight}' fill='{fill}' text-anchor='{anchor}'>{esc(s)}</text>"


def rect(x, y, w, h, fill=PANEL, stroke=RULE, sw=1, r=0, extra=""):
    return f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{r}' fill='{fill}' stroke='{stroke}' stroke-width='{sw}' {extra}/>"


def window(x, y, w, h, title, front=False):
    s = [rect(x, y, w, h, PANEL, ACC if front else "#5E6B7D", 2 if front else 1, 4)]
    s.append(rect(x, y, w, WIN_H, ACC if front else "#E4E9EF", "none", 0, 4))
    s.append(text(x + 10, y + 18, title, 13, "#FFFFFF" if front else INK, 600))
    return s


def chrome(W, H, explorer, first=False):
    s = [rect(0, 0, W, H, PAPER, "none")]
    s.append(rect(0, 0, W, MENU_H, CHROME, "none"))
    menus = ["File", "Edit", "Data", "Plot", "Analysis", "Statistics", "Spectroscopy", "Window", "Help"]
    x = 70
    s.append(text(10, 19, "Kurve", 13, INK, 700))
    for m in menus:
        s.append(text(x, 19, m, 13))
        x += len(m) * 7.4 + 18
    s.append(text(W / 2 + 120, 19, "Project name ▾", 13, INK, 600, "middle"))
    y = MENU_H
    s.append(rect(0, y, W, TOOL_H, PANEL2, RULE, 1))
    tools = [("Explorer", 70), ("|", 6), ("Import", 66), ("Export ▾", 74), ("|", 6), ("Undo", 54), ("Redo", 54), ("|", 6),
             ("Zoom", 54), ("Pan", 46), ("Mask", 52), ("Label", 54), ("Arrow", 56), ("Shape ▾", 66), ("|", 6),
             ("Show all", 70), ("|", 6), ("Reverse X", 80), ("Log Y", 56), ("Grid", 50)]
    x = 8
    for lab, w in tools:
        if lab == "|":
            s.append(f"<line x1='{x + 2}' y1='{y + 8}' x2='{x + 2}' y2='{y + TOOL_H - 8}' stroke='{RULE}'/>")
        else:
            s.append(rect(x, y + 7, w - 6, TOOL_H - 14, PANEL, RULE, 1, 6))
            s.append(text(x + (w - 6) / 2, y + 25, lab, 12, INK, 400, "middle"))
        x += w
    top = MENU_H + TOOL_H
    bottom = H - STAT_H - TASK_H
    s.append(rect(0, bottom, W, TASK_H, CHROME, RULE))
    tx = explorer + 8 if explorer else 8
    bar = [("Project name", 120, False), ("Worksheet", 96, False), ("Graph 1", 84, True)] + ([] if first else [("Fit", 50, False), ("Results", 74, False)])
    for lab, wd, on in bar:
        s.append(rect(tx, bottom + 4, wd, TASK_H - 8, ACC if on else PANEL, RULE, 1, 4))
        s.append(text(tx + wd / 2, bottom + 19, lab, 12, "#FFFFFF" if on else INK, 600 if on else 400, "middle"))
        tx += wd + 6
    s.append(rect(0, H - STAT_H, W, STAT_H, CHROME, RULE))
    s.append(text(10, H - 8, "Click a cell and type · Saved in this browser" if first else "Tool hint · cursor X, Y · 7 points · fit current · Saved in this browser", 12, MUTED))
    if explorer:
        s.append(rect(0, top, explorer, bottom - top, PANEL2, RULE))
        s.append(text(10, top + 20, "Project Explorer", 13, INK, 600))
        for i, it in enumerate(["▾ Project", "   Worksheet", "   Graph 1"] if first else ["▾ Project", "   Worksheet", "   ▸ calibration.csv", "   Graph 1"]):
            s.append(text(12, top + 46 + i * 22, it, 12, MUTED if i else INK))
    return s, top, bottom


def worksheet(x, y, w, h, rows_note, first=False):
    s = window(x, y, w, h, "Worksheet")
    by = y + WIN_H
    s.append(rect(x, by, w, WS_BAR, PANEL2, RULE))
    s.append(text(x + 8, by + 22, "A1 │ value or formula        Plot  Find  Lock  + Column", 12, MUTED))
    hy = by + WS_BAR
    s.append(rect(x, hy, w, WS_HEAD, "#E4E9EF", RULE))
    RH = 76
    for i, lab in enumerate(["⋯ rows", "Long Name", "Units"]):
        s.append(text(x + 6, hy + 16 + i * ROW, lab, 11, MUTED))
    heads = [("A (X)", "", ""), ("B (Y)", "", "")] + [("", "", "")] * 6 if first else [("A (X)", "Time", "s"), ("B (Y)", "Distance", "m"), ("C (yEr±)", "SD", "m"), ("D (Y)", "", ""), ("E (Y)", "", ""), ("F (Y)", "", ""), ("G (Y)", "", ""), ("H (Y)", "", "")]
    for c, (letter, ln, un) in enumerate(heads):
        cx = x + RH + c * 100
        if cx + 60 > x + w:
            break
        s.append(text(cx + 6, hy + 16, letter, 12, INK, 600))
        s.append(text(cx + 6, hy + 16 + ROW, ln, 12, INK))
        s.append(text(cx + 6, hy + 16 + 2 * ROW, un, 12, INK))
    gy = hy + WS_HEAD
    n = int((y + h - WS_FOOT - gy) // ROW)
    for r in range(n):
        s.append(f"<line x1='{x}' y1='{gy + (r + 1) * ROW}' x2='{x + w}' y2='{gy + (r + 1) * ROW}' stroke='#C9D1DB'/>")
        s.append(text(x + 6, gy + (r + 1) * ROW - 6, r + 1, 11, MUTED))
    for c in range(0, int((w - 76) // 100) + 1):
        cx = x + 76 + c * 100
        s.append(f"<line x1='{cx}' y1='{hy}' x2='{cx}' y2='{gy + n * ROW}' stroke='#C9D1DB'/>")
    s.append(rect(x, y + h - WS_FOOT, w, WS_FOOT, PANEL2, RULE))
    s.append(text(x + 8, y + h - 8, f"Count  Sum  Average  Min  Max      ({n} data rows visible: {rows_note})", 11, MUTED))
    return s, n


def graph(x, y, w, h, empty, title="Graph 1"):
    s = window(x, y, w, h, title, front=True)
    by = y + WIN_H
    s.append(rect(x, by, w, 30, PANEL2, RULE))
    s.append(text(x + 8, by + 20, "Data ▾ Plot ▾ Analysis ▾ Statistics ▾ Spectroscopy ▾   (R5: kept)", 12, MUTED))
    s.append(text(x + w - 8, by + 20, "Original │ Processed │ Both", 12, INK, 400, "end"))
    py = by + 30
    if empty:
        s.append(text(x + w / 2, py + (h - 58) / 2 - 20, "Type in the worksheet, or import a file", 20, INK, 600, "middle"))
        s.append(text(x + w / 2, py + (h - 58) / 2 + 10, "[ Import… ]   [ Examples ▾ ]", 13, ACC, 600, "middle"))
        s.append(text(x + w / 2, py + (h - 58) / 2 + 34, "Nothing here is active until there is data.", 12, MUTED, 400, "middle"))
    else:
        L, T, R, B = x + 60, py + 20, x + w - 20, y + h - 46
        s.append(rect(L, T, R - L, B - T, PANEL, RULE))
        ys = [0.08, 0.22, 0.31, 0.47, 0.58, 0.74, 0.83]
        for i, v in enumerate(ys):
            px, py2 = L + (0.06 + i * 0.145) * (R - L), B - v * (B - T) * 0.95 - 10
            s.append(f"<line x1='{px}' y1='{py2 - 9}' x2='{px}' y2='{py2 + 9}' stroke='{DATA}' stroke-width='1.2'/>")
            s.append(f"<circle cx='{px}' cy='{py2}' r='4.5' fill='{DATA}'/>")
        s.append(f"<line x1='{L + 0.03 * (R - L)}' y1='{B - 0.05 * (B - T) - 10}' x2='{L + 0.97 * (R - L)}' y2='{B - 0.86 * (B - T) - 10}' stroke='#C23B22' stroke-width='2'/>")
        s.append(text(L + 12, T + 22, "y = a + b·x   b = 0.0242 ± 0.0002   R² = 0.9994", 12, INK))
        s.append(text((L + R) / 2, y + h - 14, "Time (s)", 12, INK, 400, "middle"))
        s.append(text(R - 6, T + 18, "plot area " + str(int(R - L)) + " px wide", 11, MUTED, 400, "end"))
    return s


def dock(x, y, w, h):
    s = [rect(x, y, w, h, PANEL, "#5E6B7D", 1)]
    tabs = ["Fit", "Results", "History"]
    tx = x
    for i, t in enumerate(tabs):
        tw = 70
        s.append(rect(tx, y, tw, 28, ACC if i == 0 else "#E4E9EF", RULE))
        s.append(text(tx + tw / 2, y + 18, t, 13, "#FFFFFF" if i == 0 else INK, 600, "middle"))
        tx += tw
    s.append(text(x + w - 10, y + 18, "?  ×", 13, INK, 600, "end"))
    lines = ["Curve fit │ Peak fit", "", "Model   [ Straight line ▾ ]  (suggested: the data", "        look straight)", "",
             "y = a + b·x", "a   [ 0.012 ]  ☐ fix", "b   [ 0.0242 ]  ☐ fix", "", "Range   all the data   [Use the view]",
             "Weighted by column C (SD)  ☑", "", "▸ Advanced (bounds, X errors, method)"]
    for i, l in enumerate(lines):
        s.append(text(x + 14, y + 52 + i * 20, l, 12, INK if i in (0, 2, 5) else MUTED))
    s.append(rect(x, y + h - 44, w, 44, PANEL2, RULE))
    s.append(text(x + 14, y + h - 17, "Reset", 13, ACC, 600))
    s.append(rect(x + w - 168, y + h - 36, 76, 28, ACC, ACC, 1, 6))
    s.append(text(x + w - 130, y + h - 17, "Fit", 13, "#FFFFFF", 600, "middle"))
    s.append(rect(x + w - 84, y + h - 36, 70, 28, PANEL, RULE, 1, 6))
    s.append(text(x + w - 49, y + h - 17, "Done", 13, INK, 600, "middle"))
    s.append(text(x + 14, y + h - 56, "The dock takes its width from the graph; it never floats over it.", 11, MUTED))
    return s


def frame(W, H, explorer, layout, caption, rows_note):
    s, top, bottom = chrome(W, H, explorer, layout == "first")
    x0 = explorer
    h = bottom - top
    if layout == "first":
        wsw = round((W - x0) * 0.44)
        part, n = worksheet(x0, top, wsw, h, rows_note, True)
        s += part
        s += graph(x0 + wsw, top, W - x0 - wsw, h, True)
    else:
        dw = 380 if W < 1600 else 420
        wsw = 400 if W < 1600 else 520
        part, n = worksheet(x0, top, wsw, h, rows_note)
        s += part
        s += graph(x0 + wsw, top, W - x0 - wsw - dw, h, False)
        s += dock(W - dw, top, dw, h)
    body = "\n".join(s)
    return body, n, caption


def page(W, H, name):
    frames = [frame(W, H, 220 if W >= 1600 else 0, "first", f"{W}×{H}, first launch: an empty project", "first launch"),
              frame(W, H, 220 if W >= 1600 else 0, "work", f"{W}×{H}, working: columns plotted, the Fit tool docked", "working")]
    gap, cap = 40, 34
    total_h = len(frames) * (H + cap + gap)
    out = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {total_h}' width='{W}' height='{total_h}' font-family='IBM Plex Sans, Segoe UI, Arial, sans-serif'>",
           f"<rect width='{W}' height='{total_h}' fill='#F4F6F9'/>"]
    y = 0
    for body, n, caption in frames:
        out.append(text(4, y + 22, f"{caption}. Worksheet rows in view: {n}.", 16, INK, 600))
        out.append(f"<g transform='translate(0 {y + cap})'>{body}</g>")
        out.append(rect(0, y + cap, W, H, "none", INK, 1))
        y += H + cap + gap
    out.append("</svg>")
    (OUT / name).write_text("\n".join(out), encoding="utf-8")
    return [f[1] for f in frames]


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    r1 = page(1366, 768, "wireframe-1366.svg")
    r2 = page(1920, 1080, "wireframe-1920.svg")
    r3 = page(1280, 720, "wireframe-1280.svg")
    print("worksheet rows in view: 1366", r1, "1920", r2, "1280", r3)
