"""Phase 3: map every hard-coded size, radius, spacing and colour to a token.

    python tools/ux/tokenmap.py [path/to/kurve.html]

Writes ux/spec/TOKEN_MAP.md: for each distinct raw value in the app's CSS (and the
interface colours in its script), the token it becomes under the UX spec's scales,
or the reason it stays. Phase 4's token slice works from this list.
"""
import collections
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "kurve.html"
src = APP.read_text(encoding="utf-8")
css = src.split("</style>")[0]
css = css[css.find("<style"):]
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
rules = [(" ".join(s.replace("<style>", "").split()), b) for s, b in re.findall(r"([^{}]+)\{([^{}]*)\}", css)]
decls = [(sel, p.strip(), v.strip()) for sel, b in rules for p, v in re.findall(r"([-\w]+)\s*:\s*([^;]+)", b)]

TYPE = [(11, "--fs-cap"), (12, "--fs-tab"), (13, "--fs-body"), (14, "--fs-title"), (16, "--fs-head"), (20, "--fs-hero")]
# Sizes whose role decides rather than the nearest step.
TYPE_ROLE = {"15px": {".pd-title": "--fs-head"}}
TYPE_KEEP = {".fonteg": "a font sample in the font picker: content shown at a size to judge the face",
             ".sympick button": "the symbol picker's glyphs: content, drawn large enough to tell apart"}
SPACE = [2, 4, 6, 8, 12, 16, 24, 32]
out = ["# Token map",
       "",
       "Every raw value in Kurve's own CSS (the first `<style>` block of `kurve.html`) and every",
       "interface colour in its script, with the token it becomes under `ux/UX_SPEC.md` §3.5, or the",
       "reason it stays. Written by `tools/ux/tokenmap.py`; Phase 4's token slice works from it.",
       ""]


def nearest_type(px):
    best = min(TYPE, key=lambda t: (abs(t[0] - px), t[0]))  # ties go to the smaller step
    return best[1]


# ---- type ----------------------------------------------------------------------
fs = collections.defaultdict(list)
for sel, p, v in decls:
    if p == "font-size" or p == "font":
        m = re.search(r"(\d*\.?\d+)(px|em|rem)\b", v)
        if m:
            fs[m.group(1) + m.group(2)].append(sel)
out += [f"## Type: {len(fs)} sizes become 6", "",
        "Rule: the nearest step of 11 / 12 / 13 / 14 / 16 / 20 px, a half pixel going down; a heading",
        "goes to `--fs-head` whatever its size; sizes in `em` inside rich text (scripts, units beside a",
        "number) stay relative, since they scale with the text they sit in.", "",
        "| Value | Uses | Becomes | Where |", "|---|---:|---|---|"]
for val in sorted(fs, key=lambda k: (k.endswith("em"), float(re.sub("[a-z]", "", k)))):
    sels = fs[val]
    if val.endswith("em"):
        tok = "stays (relative)"
    else:
        px = float(val[:-2])
        tok = nearest_type(px if px != int(px) + 0.5 else px - 0.01)
        for s in sels:
            for k, t in TYPE_ROLE.get(val, {}).items():
                if k in s:
                    tok = f"{tok}; `{t}` for {k}"
            for k, why in TYPE_KEEP.items():
                if k in s:
                    tok = f"{tok}; stays for {k} ({why})"
        if px >= 23:
            tok = "`--fs-hero`"
    shown = " ; ".join(dict.fromkeys(sels))[:150]
    out.append(f"| {val} | {len(sels)} | {tok if tok.startswith(('stays', '`')) else '`' + tok.split(';')[0] + '`' + (';' + ';'.join(tok.split(';')[1:]) if ';' in tok else '')} | {shown} |")

# ---- radii ---------------------------------------------------------------------
rad = collections.defaultdict(list)
for sel, p, v in decls:
    if p == "border-radius" or (p.startswith("--") and p in ("--r", "--r-win", "--cb-r")):
        rad[v].append(sel)


def radius_token(v):
    if "var(" in v or "calc(" in v:
        return "already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`)"
    if v in ("50%", "99px", "999px", "11px", "12px", "9px", "10px") and v in ("50%", "99px", "999px"):
        return "stays: a round shape (knobs, swatches, pills), not a radius"
    m = re.findall(r"(\d+)px", v)
    if v.strip() == "0":
        return "stays: square on purpose"
    if not m:
        return "?"
    n = max(int(x) for x in m)
    if n <= 4:
        return "`--r-s` (4 px)"
    if n <= 7:
        return "`--r` (6 px)"
    if n <= 12:
        return "`--r-l` (8 px)" if n <= 10 else "stays: a pill as tall as its text (rounds to its own height)"
    return "?"


PILLS = (".badge", ".fn-c", ".fn-n", ".fi-disc", ".chipb", ".stagechip")
out += ["", f"## Radii: {len(rad)} values become 3", "",
        "A badge or chip as tall as its text keeps a radius of half its height: it is a round shape (a",
        "pill), like a switch's knob, not a corner on the radius scale.", "",
        "| Value | Uses | Becomes | Where |", "|---|---:|---|---|"]
for v in sorted(rad, key=lambda k: -len(rad[k])):
    sels = list(dict.fromkeys(rad[v]))
    pills = [x for x in sels if any(x.startswith(q) for q in PILLS)]
    rest = [x for x in sels if x not in pills]
    fate = radius_token(v) if rest else ""
    if fate.startswith("stays: a pill"):
        fate = "`--r-l` (8 px)"
    if pills:
        fate = (fate + "; " if fate else "") + "stays as a pill for " + ", ".join(pills)
    out.append(f"| `{v}` | {len(rad[v])} | {fate} | {' ; '.join(sels)[:150]} |")

# ---- spacing -------------------------------------------------------------------
sp = collections.Counter()
big = collections.defaultdict(list)
for sel, p, v in decls:
    if p in ("padding", "margin", "gap", "row-gap", "column-gap") or p.startswith(("padding-", "margin-")):
        for t in re.findall(r"-?\d*\.?\d+px", v):
            n = abs(float(t[:-2]))
            kind = "pad" if p.startswith("padding") else "mar"
            sp[(n, kind)] += 1
            if n > 32:
                big[t].append(sel)


def space_token(n, kind):
    if n == 0:
        return "0"
    if n <= 1:
        return "stays: a hairline adjustment"
    if n > 32:
        return "stays: a layout dimension, not spacing"
    lo = max([s for s in SPACE if s <= n] or [SPACE[0]])
    hi = min([s for s in SPACE if s >= n] or [SPACE[-1]])
    if lo == hi:
        return f"`--sp-{SPACE.index(lo) + 1}` ({lo} px)"
    pick = lo if (n - lo < hi - n or (n - lo == hi - n and kind == "pad")) else hi
    return f"`--sp-{SPACE.index(pick) + 1}` ({pick} px)"


out += ["", f"## Spacing: {len({k[0] for k in sp})} values become 8 steps", "",
        "Steps 2 / 4 / 6 / 8 / 12 / 16 / 24 / 32 px (`--sp-1` … `--sp-8`). Rule: the nearest step; a tie",
        "goes down for padding (inside a control, density first) and up for margins and gaps (between",
        "blocks, separation first). Negative values map by their size.", "",
        "| Value | In padding | In margins and gaps | Becomes (padding) | Becomes (margins, gaps) |", "|---|---:|---:|---|---|"]
for n in sorted({k[0] for k in sp}):
    out.append(f"| {n:g} px | {sp[(n, 'pad')]} | {sp[(n, 'mar')]} | {space_token(n, 'pad')} | {space_token(n, 'mar')} |")
if big:
    out += ["", "Layout dimensions over 32 px (offsets and indents tied to a measured size): " +
            "; ".join(f"`{k}` in {', '.join(dict.fromkeys(v))[:90]}" for k, v in big.items()) + "."]

# ---- colours -------------------------------------------------------------------
HEX_FATE = {
    (".btn.danger", "#fff"): "`--on-fill` (new: white in light, near-black in dark)",
    (':root[data-theme="dark"] .btn.danger', "#1B0B07"): "`--on-fill`",
    (".stepn.done", "#fff"): "`--on-fill`: white on dark mode's light green reads at 1.9:1 today",
    (".stepn.stale", "#fff"): "`--on-fill`: 1.8:1 on dark mode's amber today",
    (".badge", "#fff"): "`--on-fill`, on `--badge` (new) instead of `--pin`: white on `--pin` is 4.2:1 in light, 2.0:1 in dark",
    (".anchor .num", "#fff"): "`--on-fill` on `--badge`, as `.badge`",
    (".fn-w", "#fff"): "`--on-fill`",
    (".bsum .chip", "#B26B00"): "drop the fallback: `--warn` is always defined",
    (".btab .bst.bad .ic", "#C23B22"): "drop the fallback: `--bad`",
    (".btab .bst.warn .ic", "#B26B00"): "drop the fallback: `--warn`",
    (".exp-info.bad", "#C23B22"): "drop the fallback: `--bad`",
    (".exp-page", "#fff"): "stays: the export preview is the printed page, white in both themes",
    (".exp-page.clear", "#fff"): "stays: the page under a transparent export",
    (".exp-page.clear", "#e6e8eb"): "stays: the transparency checkerboard",
    (".cbtn>span", "#ccc"): "stays: the transparency checkerboard under a colour swatch",
    (".cp-sv", "#000"): "stays: the colour picker's value gradient (black to the hue)",
    (".cp-sv", "#fff"): "stays: the colour picker's saturation gradient",
    (".cp-hue", "*"): "stays: the colour picker's hue strip (the spectrum itself)",
    (".cp-dot", "#fff"): "stays: the picker's handle must show on any colour; it has a dark ring too",
    (".cp-hk", "#fff"): "stays: as `.cp-dot`",
}
rows = []
for sel, p, v in decls:
    if p.startswith("--"):
        continue
    for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", v):
        fate = HEX_FATE.get((sel, h)) or HEX_FATE.get((sel, h.lower())) or HEX_FATE.get((sel, "*")) or "?"
        rows.append((sel, p, h, fate))
seen = set()
out += ["", "## Colours in the CSS outside the token blocks", "",
        "The token blocks hold 110 colour values, which are the tokens. Outside them the CSS has these:", "",
        "| Selector | Property | Value | Becomes |", "|---|---|---|---|"]
for sel, p, h, fate in rows:
    key = (sel, p, h.lower(), fate)
    if key in seen:
        continue
    seen.add(key)
    out.append(f"| `{sel}` | {p} | `{h}` | {fate} |")
unmapped = [r for r in rows if r[3] == "?"]

script = src[src.find("<script>\n"):]
ctx, cur = collections.defaultdict(set), "?"
for line in script.split("\n"):
    m = re.match(r"\s*(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)", line)
    if m:
        cur = m.group(1)
    for h in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])", line):
        ctx[cur].add(h.lower())
nfig = len(set().union(*(ctx[k] for k in ("SCHEMES", "PEAK_COLORS_LIGHT", "PEAK_COLORS_DARK", "SER_COLORS", "ANNO_COLORS", "CP_EXTRA", "p"))))
ncm = len(ctx["CMAPS"])
ntint = len(ctx["COL_TINTS_LIGHT"] | ctx["COL_TINTS_DARK"])
nall = len(set().union(*ctx.values()))
out += ["", f"## Colours in the script: {nall} distinct", "",
        "Counted by the definition they sit in (`kurve.html` after the `<script>` tag).", "",
        "| Where | Distinct | What it is | Becomes |", "|---|---:|---|---|",
        f"| `SCHEMES`, `PEAK_COLORS_LIGHT`/`DARK`, `SER_COLORS`, `ANNO_COLORS`, `CP_EXTRA`, the `mono` greys in `yTint` | {nfig} | the figure's colours: curve schemes, fitted-peak colours, the swatches offered for a curve or a label | stay: data, not interface. The default scheme changes (§3.5, data palette). |",
        f"| `CMAPS` | {ncm} | colour maps for heat maps and contours (viridis, magma, cool to warm, grey) | stay: published colour maps |",
        f"| `COL_TINTS_LIGHT`/`DARK` | {ntint} | the default curve colours today (the analysed curve in blue, the others in cool hues) | replaced by the data palette, `--c1` … `--c8`: they fail the palette check in both themes |",
        "| `EXPORT_PAL`, the export and picture code (`#FFFFFF` fills), the report's own `<style>` | 9 + report | colours of a figure or a report printed on white | stay: an export is printed on white whatever the theme |",
        "| `openColorPicker`, `cb`, `c` (a picker's fallback `#1d5fa8`, `#111820`) | 2 | the colour shown when a setting has none | `--data` and `--ink`, read from the light set (a figure's colours are light-set colours) |",
        "| `avatarOf` (`#8a96a8`) | 1 | a person's placeholder picture | `--faint` |",
        "| the peak draft's numbered dots (`#fff` text) | 1 | a number on a peak's coloured dot, on the graph | `--on-fill` |"]

out += ["", f"**Unmapped CSS colours: {len(unmapped)}.**" + ("" if not unmapped else " " + "; ".join(f"{a} {c}" for a, b, c, d in unmapped))]
(ROOT / "ux" / "spec").mkdir(parents=True, exist_ok=True)
(ROOT / "ux" / "spec" / "TOKEN_MAP.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("wrote ux/spec/TOKEN_MAP.md;", len(fs), "font sizes,", len(rad), "radii,", len({k[0] for k in sp}), "spacing values,", len(rows), "CSS colours,", len(unmapped), "unmapped")
