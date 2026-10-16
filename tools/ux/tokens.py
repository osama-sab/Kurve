"""Phase 3: the token sheet, computed.

    python tools/ux/tokens.py [path/to/kurve.html]

Reads the colour tokens of Bench, light and dark, in kurve.html (Graphite, the
second style, is to be removed: STOP 2, R1), adds the roles the UX spec proposes
(a disabled ink and a pressed fill),
and computes the WCAG contrast of every role against every surface it is drawn on.
Writes:
  ux/spec/contrast.md   the table, every pair, PASS or FAIL against its threshold
  ux/spec/tokens.html   the token sheet: type, spacing, radii, colour roles with
                        their ratios, states, the data palette, light and dark
and prints a one-line summary. Exit status 1 if a pair fails.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "kurve.html"
OUT = ROOT / "ux" / "spec"

# ---- read the four token sets ------------------------------------------------
css = APP.read_text(encoding="utf-8").split("</style>")[0]
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def block(sel):
    m = re.search(re.escape(sel) + r"\s*\{([^{}]*)\}", css)
    return dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", m.group(1))) if m else {}


bench_l = block(":root")
bench_d = {**bench_l, **block(':root[data-theme="dark"]')}
graph_l = {**bench_l, **block(':root[data-style="graphite"]')}
graph_d = {**bench_d, **block(':root[data-style="graphite"]'), **block(':root[data-style="graphite"][data-theme="dark"]')}
extra = block(":root{--ws-sel") or dict(re.findall(r"(--ws-[\w-]+)\s*:\s*([^;}]+)", css))

# The roles the spec adds. A disabled ink that still reads (4.5:1 or more on every
# surface a control sits on) and is plainly lighter than the secondary ink; a pressed
# fill that differs from the hover fill.
PROPOSED = {
    "Bench light": {"--ink-off": "#56627A", "--press": "#C6CED8", "--on-fill": "#FFFFFF", "--badge": "#7C4A03"},
    "Bench dark": {"--ink-off": "#97A3B4", "--press": "#404D64", "--on-fill": "#0B1220", "--badge": "#EDBA5A"},
}
SETS = {"Bench light": bench_l, "Bench dark": bench_d}
for k, v in SETS.items():
    v.update({kk: vv for kk, vv in extra.items() if kk.startswith("--ws-")})
    v.update(PROPOSED[k])


def hexrgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def resolve(tok, s, depth=0):
    v = s[tok].strip()
    m = re.fullmatch(r"var\((--[\w-]+)\)", v)
    if m:
        return resolve(m.group(1), s, depth + 1)
    m = re.fullmatch(r"color-mix\(in srgb,\s*var\((--[\w-]+)\)\s*(\d+)%,\s*var\((--[\w-]+)\)\)", v)
    if m:
        a, p, b = resolve(m.group(1), s), int(m.group(2)) / 100, resolve(m.group(3), s)
        return tuple(round(a[i] * p + b[i] * (1 - p)) for i in range(3))
    if v.startswith("#"):
        return hexrgb(v)
    return None


def lum(c):
    f = [x / 255 for x in c]
    f = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in f]
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hx(c):
    return "#%02X%02X%02X" % c


# ---- the pairs, by role ------------------------------------------------------
CONTROL_SURFACES = ["--panel", "--panel-2", "--panel-3", "--chrome", "--btn-bg", "--win-h-bg"]
# Resting surfaces carry both inks. On a highlight (hover, pressed, a menu item under the
# pointer, a selection) the spec's rule is one ink: secondary text takes --ink there.
REST_SURFACES = ["--panel", "--panel-2", "--panel-3", "--chrome", "--well", "--btn-bg", "--win-h-bg"]
HIGHLIGHTS = ["--btn-bg-h", "--press", "--hi", "--sel", "--ws-sel"]
PAIRS = []  # (role, fg, bg, threshold, why)
for bg in REST_SURFACES + HIGHLIGHTS:
    PAIRS.append(("text, primary", "--ink", bg, 7.0, "words (DESIGN.md: 7:1)"))
for bg in REST_SURFACES:
    PAIRS.append(("text, secondary", "--muted", bg, 7.0, "secondary words (DESIGN.md: 7:1)"))
for bg in CONTROL_SURFACES:
    PAIRS.append(("text, disabled", "--ink-off", bg, 4.5, "disabled words still read (WCAG AA text)"))
PAIRS += [
    ("text on the accent", "--accent-ink", "--accent", 4.5, "on, chosen, in front"),
    ("text on the front title bar", "--win-h-act-ink", "--win-h-act-bg", 4.5, "the window in front"),
    ("text on a chosen segment", "--seg-on-ink", "--seg-on", 4.5, "segmented control"),
]
for st in ["--ok", "--warn", "--bad"]:
    PAIRS.append((f"status {st[2:]}", st, "--panel", 4.5, "a status word on a panel"))
    PAIRS.append((f"status {st[2:]} on its own fill", st, st + "-bg", 4.5, "a status note"))
PAIRS.append(("comments (talk)", "--talk", "--panel", 4.5, "discussion accents"))
# Small numbers and words on a filled status shape (step numbers, badges, a danger
# button). Today they are hard-coded white, which fails on dark mode's light fills.
for fill in ["--ok", "--warn", "--bad", "--badge"]:
    PAIRS.append(("text on a status fill", "--on-fill", fill, 4.5, "step numbers, badges, the danger button"))
PAIRS.append(("text on a comment badge", "--talk-ink", "--talk", 4.5, "comment counts"))
for bg in ["--panel", "--panel-2", "--chrome", "--btn-bg"]:
    PAIRS.append(("boundary: control edge", "--rule", bg, 3.0, "buttons, fields, menus (WCAG 1.4.11)"))
    PAIRS.append(("icon", "--faint", bg, 3.0, "icons and lines"))
PAIRS += [
    ("boundary: window edge", "--win-bd", "--paper", 3.0, "a window against the desk"),
    ("boundary: window edge", "--win-bd", "--panel", 3.0, "a window against its own body"),
    ("boundary: desk vs window", "--paper", "--panel", 1.1, "the desk is visibly darker (not a WCAG pair; the window's 3:1 edge separates them)"),
    ("focus ring", "--focus", "--panel", 3.0, "keyboard focus"),
    ("focus ring", "--focus", "--chrome", 3.0, "keyboard focus on the bars"),
    ("switch, off", "--sw-off", "--panel", 3.0, "an off switch's track"),
    ("checkbox edge", "--cb-bd", "--panel", 3.0, "an empty box"),
    ("slider track", "--trk", "--panel", 3.0, "a slider"),
    ("selection edge", "--ws-sel-bd", "--panel", 3.0, "the worksheet range's edge"),
    ("accent as a fill", "--accent", "--panel", 3.0, "an on switch, a filled state"),
    ("hover vs rest", "--btn-bg-h", "--btn-bg", 1.08, "hover is a visible change (not a WCAG pair)"),
    ("pressed vs hover", "--press", "--btn-bg-h", 1.25, "pressed differs from hover (not a WCAG pair)"),
]

rows, fails = [], 0
for name, s in SETS.items():
    for role, fg, bg, thr, why in PAIRS:
        if fg not in s or bg not in s:
            continue
        a, b = resolve(fg, s), resolve(bg, s)
        if a is None or b is None:
            continue
        r = ratio(a, b)
        ok = r >= thr - 1e-9
        fails += not ok
        rows.append((name, role, fg, hx(a), bg, hx(b), r, thr, ok, why))

# ---- the data palette: Kurve's "Distinct hues", violet corrected ---------------
DATA = {
    "light": ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
    "dark": ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
}
DATA_NAMES = ["blue", "orange", "aqua", "yellow", "magenta", "green", "violet", "red"]

# ---- the scales ----------------------------------------------------------------
TYPE = [("--fs-cap", 11, "caption: units, badges, row numbers, keys, notes"),
        ("--fs-tab", 12, "table and label: worksheet cells, result tables, field labels, the status bar"),
        ("--fs-body", 13, "body: controls, menus, paragraphs, the tree"),
        ("--fs-title", 14, "window title: title bars, the graph window's name, the typing box"),
        ("--fs-head", 16, "heading: dialog titles, section headings in Help, formulas"),
        ("--fs-hero", 20, "hero: the empty state, a Help article's title")]
SPACE = [("--sp-1", 2), ("--sp-2", 4), ("--sp-3", 6), ("--sp-4", 8), ("--sp-5", 12), ("--sp-6", 16), ("--sp-7", 24), ("--sp-8", 32)]
RADII = {"Bench": [("--r-s", 4, "checkboxes, chips, cells, keys"), ("--r", 6, "buttons, fields, menus, toasts"), ("--r-l", 8, "windows, dialogs, popovers")]}

OUT.mkdir(parents=True, exist_ok=True)

# ---- contrast.md -------------------------------------------------------------
md = ["# Contrast of every colour role",
      "",
      "Computed by `tools/ux/tokens.py` from the tokens in `kurve.html`, plus the two roles the",
      "UX spec adds (`--ink-off`, disabled text; `--press`, a pressed fill). WCAG 2.1 relative",
      "luminance. Thresholds: words 7:1 (DESIGN.md, stricter than AA's 4.5:1), disabled words,",
      "status words and text on a fill 4.5:1, boundaries and icons 3:1. Three rows are not WCAG",
      "pairs, they check that two states can be told apart (marked in the threshold column).",
      "",
      "Secondary text (`--muted`) is checked on resting surfaces only. On a highlight (hover,",
      "pressed, a menu item under the pointer, a selection) the spec's rule is that all text takes",
      "`--ink`: measured, `--muted` falls to 5.4–6.9:1 there, below DESIGN.md's 7:1.",
      "",
      f"**{len(rows)} pairs, {fails} below their threshold.**",
      "",
      "| Set | Role | Foreground | Background | Ratio | Needs | |",
      "|---|---|---|---|---:|---:|---|"]
for name, role, fg, a, bg, b, r, thr, ok, why in rows:
    md.append(f"| {name} | {role} | `{fg}` {a} | `{bg}` {b} | {r:.2f} | {thr:g} | {'PASS' if ok else '**FAIL**'} |")
(OUT / "contrast.md").write_text("\n".join(md) + "\n", encoding="utf-8")

# ---- tokens.html -------------------------------------------------------------
def esc(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


ROLE_TOKENS = [("Surfaces, back to front", ["--paper", "--chrome", "--well", "--panel", "--panel-2", "--panel-3", "--win-h-bg"]),
               ("Text", ["--ink", "--muted", "--ink-off"]),
               ("Borders and icons", ["--rule", "--rule-2", "--win-bd", "--faint"]),
               ("Accent, focus, selection", ["--accent", "--accent-ink", "--focus", "--sel", "--hi", "--ws-sel", "--ws-sel-bd"]),
               ("States", ["--btn-bg", "--btn-bg-h", "--press"]),
               ("Status", ["--ok", "--ok-bg", "--warn", "--warn-bg", "--bad", "--bad-bg", "--on-fill", "--badge"]),
               ("The figure", ["--data", "--fit", "--grid", "--masked"])]

h = ["<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>",
     "<title>Kurve token sheet</title><style>",
     ":root{--bg:#F4F6F9;--card:#FFFFFF;--tx:#0B1220;--mu:#364255;--bd:#C6CED8}",
     "@media (prefers-color-scheme: dark){:root:not([data-theme=light]){--bg:#0E141C;--card:#151C27;--tx:#F2F5F9;--mu:#BAC4D1;--bd:#2E3949}}",
     ":root[data-theme=dark]{--bg:#0E141C;--card:#151C27;--tx:#F2F5F9;--mu:#BAC4D1;--bd:#2E3949}",
     "body{margin:0;background:var(--bg);color:var(--tx);font:13px/1.45 'IBM Plex Sans',system-ui,sans-serif}",
     "main{max-width:1180px;margin:0 auto;padding:24px 16px 48px}h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}",
     "p.lead{color:var(--mu);margin:0 0 8px;max-width:72ch}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px}",
     ".card{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:12px}.card h3{font-size:14px;margin:0 0 8px}",
     "table{border-collapse:collapse;width:100%}td,th{padding:4px 6px;border-bottom:1px solid var(--bd);text-align:left;vertical-align:middle}th{font-weight:600;color:var(--mu);font-size:12px}",
     ".sw{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid rgba(127,127,127,.5);vertical-align:middle}",
     ".mono{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px}.ok{color:inherit}.bad{color:#B3261E;font-weight:700}",
     ".set{border-radius:8px;padding:12px;border:1px solid var(--bd)}.chip{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;border:1px solid;margin:0 6px 6px 0;font-size:13px}",
     ".bar{height:10px;background:currentColor;border-radius:2px}.scroll{overflow-x:auto}",
     "</style></head><body><main>",
     "<h1>Kurve token sheet</h1>",
     "<p class=lead>Phase 3 of the UX rework. Type, spacing and radii are proposed; the colour roles are Kurve's tokens as they are, "
     "plus a disabled ink and a pressed fill. Every ratio below is computed (<span class=mono>tools/ux/tokens.py</span>); the full list "
     f"is <span class=mono>ux/spec/contrast.md</span>. <b>{len(rows)} pairs, {fails} below threshold.</b></p>"]

h.append("<h2>Type scale: six sizes, from 18 in the app's CSS today</h2><div class=card><table><tr><th>Token</th><th>Size</th><th>Role</th><th>Sample</th></tr>")
for t, px, role in TYPE:
    h.append(f"<tr><td class=mono>{t}</td><td>{px} px</td><td>{esc(role)}</td><td style='font-size:{px}px'>Absorbance (cm⁻¹) 1 602.8 ± 0.3</td></tr>")
h.append("</table></div>")

h.append("<h2>Spacing: eight steps</h2><div class=card><table><tr><th>Token</th><th>Size</th><th></th></tr>")
for t, px in SPACE:
    h.append(f"<tr><td class=mono>{t}</td><td>{px} px</td><td><div class=bar style='width:{px * 4}px;color:#2a78d6'></div></td></tr>")
h.append("</table></div>")

h.append("<h2>Radii: three</h2><div class=grid>")
for style, rs in RADII.items():
    h.append(f"<div class=card><h3>{style}</h3>")
    for t, px, role in rs:
        h.append(f"<div style='display:flex;gap:10px;align-items:center;margin:6px 0'><div style='width:44px;height:28px;border:2px solid #717E90;border-radius:{px}px'></div><span class=mono>{t}</span> {px} px <span style='color:var(--mu)'>{esc(role)}</span></div>")
    h.append("</div>")
h.append("</div><p class=lead>Round shapes (switch knobs, swatches, avatars) use 50 % and are shapes, not radii.</p>")

h.append("<h2>Colour roles</h2><div class=grid>")
for name, s in SETS.items():
    bg = hx(resolve("--panel", s))
    tx = hx(resolve("--ink", s))
    h.append(f"<div class=set style='background:{bg};color:{tx}'><h3 style='margin:0 0 8px'>{name}</h3>")
    for grp, toks in ROLE_TOKENS:
        h.append(f"<div style='font-size:12px;font-weight:600;margin:8px 0 4px'>{grp}</div>")
        for t in toks:
            if t not in s:
                continue
            c = resolve(t, s)
            if c is None:
                continue
            h.append(f"<div style='display:flex;align-items:center;gap:8px;margin:2px 0'><span class=sw style='background:{hx(c)}'></span><span class=mono>{t}</span><span class=mono style='opacity:.85'>{hx(c)}</span></div>")
    # states, drawn with the set's own tokens
    def T(t):
        return hx(resolve(t, s))
    h.append("<div style='font-size:12px;font-weight:600;margin:10px 0 4px'>A button in each state</div><div>")
    for lab, b, bd, fg, extra_css in [("Rest", T("--btn-bg"), T("--rule"), T("--ink"), ""),
                                      ("Hover", T("--btn-bg-h"), T("--ink-2"), T("--ink"), ""),
                                      ("Pressed", T("--press"), T("--ink-2"), T("--ink"), "box-shadow:inset 0 1px 2px rgba(0,0,0,.35);"),
                                      ("Focus", T("--btn-bg"), T("--rule"), T("--ink"), f"outline:2px solid {T('--focus')};outline-offset:1px;"),
                                      ("On", T("--accent"), T("--accent"), T("--accent-ink"), ""),
                                      ("Disabled", "transparent", T("--rule-2"), T("--ink-off"), "border-style:dashed;")]:
        h.append(f"<span class=chip style='background:{b};border-color:{bd};color:{fg};{extra_css}'>{lab}</span>")
    h.append("</div></div>")
h.append("</div>")

h.append("<h2>Contrast, worst pair per role</h2><div class='card scroll'><table><tr><th>Role</th>" + "".join(f"<th>{n}</th>" for n in SETS) + "<th>Needs</th></tr>")
roles = []
for row in rows:
    if row[1] not in roles:
        roles.append(row[1])
for role in roles:
    cells, thr = [], None
    for n in SETS:
        rs = [r for r in rows if r[0] == n and r[1] == role]
        if not rs:
            cells.append("<td>—</td>")
            continue
        w = min(rs, key=lambda r: r[6])
        thr = w[7]
        cells.append(f"<td class={'ok' if w[8] else 'bad'}>{w[6]:.2f} <span style='color:var(--mu);font-size:11px'>{esc(w[4])}</span></td>")
    h.append(f"<tr><td>{esc(role)}</td>{''.join(cells)}<td>{thr:g}</td></tr>")
h.append("</table></div>")

h.append("<h2>Data palette: eight hues, in worksheet order</h2><p class=lead>Kurve's \"Distinct hues\" scheme, with its light violet "
         "lightened to <span class=mono>#6250d6</span>, as the default. Validated with the six checks (lightness band, chroma, "
         "adjacent-pair colour-blind separation, normal-vision floor, contrast): it passes on the graph's light (#FFFFFF) and dark "
         "(#151C27) backgrounds. Three light slots are below 3:1 on white, so a legend is always shown for two curves or more. "
         "The current default fails both themes (see the spec).</p><div class=grid>")
for mode, bgc in [("light", "#FFFFFF"), ("dark", "#151C27")]:
    fg = "#0B1220" if mode == "light" else "#F2F5F9"
    h.append(f"<div class=set style='background:{bgc};color:{fg}'><h3 style='margin:0 0 8px'>On the {mode} graph</h3>"
             f"<svg viewBox='0 0 340 150' width='100%' role='img' aria-label='Eight sample curves in the {mode} palette'>")
    for i, c in enumerate(DATA[mode]):
        y = 18 + i * 16
        h.append(f"<path d='M10 {y} C 60 {y - 10}, 110 {y + 10}, 160 {y} S 230 {y - 8}, 250 {y}' fill='none' stroke='{c}' stroke-width='1.6'/>"
                 f"<text x='256' y='{y + 4}' font-size='11' fill='{fg}'>{i + 1} {DATA_NAMES[i]}</text>")
    h.append("</svg><div class=mono style='margin-top:6px'>" + " ".join(DATA[mode]) + "</div></div>")
h.append("</div>")
h.append("</main></body></html>")
(OUT / "tokens.html").write_text("\n".join(h) + "\n", encoding="utf-8")

print(f"{len(rows)} pairs, {fails} below threshold; wrote ux/spec/contrast.md and ux/spec/tokens.html")
for r in rows:
    if not r[8]:
        print("  FAIL", r[0], r[1], r[2], r[3], "on", r[4], r[5], f"{r[6]:.2f} < {r[7]}")
sys.exit(1 if fails else 0)
