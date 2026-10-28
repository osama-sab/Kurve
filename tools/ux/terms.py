"""Phase 4, slice 3: does the text Kurve shows follow the glossary (ux/UX_SPEC.md §3.6)?

    python tools/ux/terms.py [path/to/kurve.html] [--list term] [--json out.json]

Reads kurve.html without running it. Every string and template literal of the main
script, and the static markup, is reduced to what a person reads: `${…}` expressions,
tags and entities go, the values of title, aria-label, placeholder and alt stay.
What is left counts as prose when it has two words or more and does not look like
code (a selector, a CSS rule, a key path, an identifier), or when it is a fragment of a
sentence joined to a number or a name (`n + " spectra"`, `${n} spectra`). Each literal is placed in
a context: the function or the object key (DOCS article, PIPE_OPS op) it is written in.

Spectroscopy contexts (the Spectroscopy menu, its panels and tools, their Help articles)
may use spectroscopy's words; everywhere else the glossary's words are counted as
off-glossary. The counts are printed per term; --list prints every hit of one term with
its line and context. Exit status is 0: it measures, the changelog judges.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
args, skip = [], False
for a in sys.argv[1:]:
    if skip: skip = False; continue
    if a in ("--list", "--json"): skip = True; continue
    if not a.startswith("--"): args.append(a)
APP = Path(args[0]).resolve() if args else ROOT / "kurve.html"
LIST = sys.argv[sys.argv.index("--list") + 1] if "--list" in sys.argv else None
JSON_OUT = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None

src = APP.read_text(encoding="utf-8")

# Terms the glossary replaces outside spectroscopy contexts, with what replaces them.
TERMS = {
    "spectrum": (r"\bspectr(?:um|a|al)\b", "column (worksheet, data) or curve (graph)"),
    "analysed": (r"\banaly[sz]ed\b|\bbeing analy[sz]ed\b", "active"),
    "raw": (r"\braw\b", "original"),
    "final": (r"\bfinal\b", "processed"),
    "recorded": (r"\brecorded (?:data|values?)\b", "original data"),
    "fingerprint": (r"\bfingerprint\b", "check code"),
    # a figure's panels and the residual panel are other things: counted only outside them (see SENSE)
    "panels (windows)": (r"\bpanels?\b", "tool windows"),
    # the Format dialog keeps its name
    "format (style)": (r"\b(?:saved )?formats\b(?! dialog)|\ba format\b|\bthe format\b(?! dialog)|\bformat as\b", "saved style"),
    "untitled analysis": (r"\buntitled analysis\b", "Untitled project"),
    "turned down": (r"\bturned down\b|\bturns? down\b", "not counted as a peak"),
    "data (not a spectrum)": (r"\bnot a spectrum\b", "other data"),
}
# Senses of a word the glossary keeps: (term, context regex, text regex around the word).
SENSE = {
    "panels (windows)": (re.compile(r"fig|Fig|panel|Panel|unshut|renderGraphHeads|dropText|xRows|gDropAt|graphTitle|newGraphItems|deleteFigure|wireWin|syncGraphWins|graphsMenuItems|DOC:(?:panels|graphs|style|export|plotting|keys)"),
                         re.compile(r"residual panel|panel (?:under|of the residuals)|panels? of (?:a|the) figure|stacked panels|Stacked panels|a panel per|panel for each|in panels|panel's|Panels…", re.I)),
}
# Words that are spectroscopy's own, allowed in its contexts only.
SPEC_ONLY = {"spectrum"}

# Contexts where spectroscopy's words belong: functions and DOCS/PIPE_OPS keys.
SPEC_CTX = re.compile(r"^(?:spectroscopyMenu|spectroscopyItems|renderPeaks|wirePeaks|openPeakFinder|pf[A-Z]\w*|pk[A-Z]\w*|pkUndo|pkIn|peak\w*|Peak\w*|PK_\w+|PF_\w+|resOf|on|e2|u|t|"
                      r"renderInteg|wireInteg|openIntegrate|integ\w*|band\w*|Band\w*|bandsFromPeaksUI|renderOverview|overview\w*|openOverview|autoOverview|"
                      r"identifyPeaks|idf\w*|idMatchOpts|lineLib\w*|linesFor|lineScale|lineLabel|LINE_LIBS|editLineList|deleteLineList|setPeakLine|setPeakShape|"
                      r"findPeaks\w*|runPeakFinder|fitFoundPeaks|despike\w*|countNoise|countsPerY|liveTimeOf|searchRegions|labelFoundPeaks|followPeakSets|"
                      r"mergePeakSet|reportPeaksHtml|reportBandsHtml|renderPeakFit|draftOverlay|numLabel|fpl\w*|FPL_\w+|labelTrack|trackTableText|markedTracks|"
                      r"matchPeakTracks|fitTracks|allFoundTableText|removeFoundPeak|clearFoundPeaks|addToPeakSet|setPeakStyle|setPeakLabel|regsOfSet|normRegs|"
                      r"addPkRegion|removePkRegion|setPkRegs|setPkRange|pickPkRange|PY_LABEL_CODE|applyPyLabels|"
                      r"DOC:(?:peaks|peakfit|integ|overview|finder|despike|bg|shift|calib|ecal|xunit|lines|gamma|counts|bose|km|absorb|regions|known\w*|tracks|step-\w+)|"
                      r"OP:(?:despike|bg|shift|calib|ecal|bose|km|absorb|xunit|smooth|fft))$")
# Kept on purpose, each with its reason.
KEEP = [
    ("raw", re.compile(r"Raman: raw polystyrene")),                 # an example's name
    ("analysed", re.compile(r"can be analysed as they are")),       # the verb, not the active column
    ("spectrum", re.compile(r"For a spectrum, the Overview|an infrared spectrum with overlapping bands|a Raman spectrum straight from")),  # the Start page describes the examples
    ("spectrum", re.compile(r"one spectrum against its|The spectrum is drawn as a line|the spectrum's X column|A gamma spectrum, start")),  # the import article's part on gamma spectra
    ("spectrum", re.compile(r"spectral density")),                   # physics: a density per unit of X
    ("spectrum", re.compile(r"_Spectra\(|\['spectra'\]|the spectra dict")),  # Python's own names
    ("analysed", re.compile(r"was analysed as typed")),             # the verb
    ("panels (windows)", re.compile(r"a panel each")),              # a figure's panels
]

CODEY = re.compile(r"^[\w.#:\-\[\]=\"'>~*+,()|^$ ]*$")


def script_ranges(s):
    for m in re.finditer(r"<script>(.*?)</script>", s, re.S):
        yield m.start(1), m.end(1)


def literals(js, base):
    """(start offset, text, kind) of every string and template literal, ${…} replaced by a space."""
    out, i, n = [], 0, len(js)
    regex_ok = True
    while i < n:
        c = js[i]
        if c == "/" and js.startswith("//", i):
            j = js.find("\n", i); i = n if j < 0 else j; continue
        if c == "/" and js.startswith("/*", i):
            j = js.find("*/", i + 2); i = n if j < 0 else j + 2; continue
        if c == "/" and regex_ok:
            j, cls = i + 1, False
            while j < n and js[j] != "\n":
                if js[j] == "\\": j += 2; continue
                if js[j] == "[": cls = True
                elif js[j] == "]": cls = False
                elif js[j] == "/" and not cls: break
                j += 1
            i = j + 1; regex_ok = False; continue
        if c in "'\"":
            j, buf = i + 1, []
            while j < n and js[j] != c:
                if js[j] == "\\": buf.append(js[j + 1] if j + 1 < n else ""); j += 2; continue
                if js[j] == "\n": break
                buf.append(js[j]); j += 1
            out.append((base + i, "".join(buf), "str")); i = j + 1; regex_ok = False; continue
        if c == "`":
            j, buf, depth = i + 1, [], 0
            while j < n:
                ch = js[j]
                if ch == "\\": buf.append(js[j + 1] if j + 1 < n else ""); j += 2; continue
                if ch == "`": break
                if js.startswith("${", j):
                    # skip the expression, nested braces, strings and templates inside it
                    k, d = j + 2, 1
                    while k < n and d:
                        if js[k] in "'\"`":
                            q = js[k]; k += 1
                            while k < n and js[k] != q:
                                if js[k] == "\\": k += 1
                                elif q == "`" and js.startswith("${", k):
                                    # nested template expression: crude skip to its close
                                    e, dd = k + 2, 1
                                    while e < n and dd:
                                        dd += {"{": 1, "}": -1}.get(js[e], 0); e += 1
                                    k = e - 1
                                k += 1
                        elif js[k] == "{": d += 1
                        elif js[k] == "}": d -= 1
                        k += 1
                    # literals inside the expression are prose too: scan them
                    out.extend(literals(js[j + 2:k - 1], base + j + 2))
                    buf.append(" ⁣ "); j = k; continue
                buf.append(ch); j += 1
            out.append((base + i, "".join(buf), "tpl")); i = j + 1; regex_ok = False; continue
        if c.isalnum() or c in "_$)]":
            regex_ok = False
        elif not c.isspace():
            regex_ok = True
        i += 1
    return out


ATTR = re.compile(r"""\b(?:title|aria-label|placeholder|alt)\s*=\s*(["'])(.*?)\1""", re.S)


def readable(t):
    """What a person reads of a literal: attribute values and text between tags."""
    keep = [m.group(2) for m in ATTR.finditer(t)]
    t = re.sub(r"<[^>]*>", " ", t)
    t = re.sub(r"&[a-z#0-9]+;", " ", t)
    return " ".join([t] + keep)


def prose(t):
    t = t.replace("⁣", " ").strip()
    words = re.findall(r"[A-Za-z][a-z]{2,}", t)
    if len(words) < 2:
        return False
    if CODEY.match(t) and not re.search(r"[a-z]{3,} [a-z]{3,}", t):
        return False
    if re.search(r"[{};]\s*$|^\s*[.#\[]?[a-z-]+\s*[{:]", t) and not re.search(r"[a-z]{3,} [a-z]{3,} [a-z]{3,}", t):
        return False
    return True


def fragment(t):
    """A piece of a sentence joined to a number or a name, such as `n + " spectra"` or
    `${n} spectra, ${m} graphs`: one word, so prose() passes it by, but read on screen."""
    s = t.replace("⁣", " ")
    if not re.search(r"[A-Za-z][a-z]{2,}", s) or re.search(r"[{};=<>#\[\]\\/]|\.[a-z]", s):
        return False
    return "⁣" in t or bool(re.match(r"^\s+[A-Za-z]|.*[A-Za-z]\s+$", t))


# Contexts: the nearest enclosing `function name(`, DOCS article `{id:"…"`, or PIPE_OPS op key.
FN = [(m.start(), m.group(1)) for m in re.finditer(r"(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(", src)]
FN += [(m.start(), m.group(1)) for m in re.finditer(r"(?:^|\n)\s*(?:const|let)\s+([A-Za-z0-9_]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>", src)]
FN.sort()
DOCS0 = src.find("const DOCS=")
DOCIDS = [(m.start(), m.group(1)) for m in re.finditer(r'\{id:"([a-z0-9-]+)", g:"', src)]
OPS0, OPS1 = src.find("const PIPE_OPS="), src.find("==PIPE:END==")
OPKEYS = [(m.start(), m.group(1)) for m in re.finditer(r"\n  ([a-z0-9]+):\{group:", src)]
SYN0 = src.find("const CMDK_SYN=")
SYN1 = src.find("];", SYN0) if SYN0 >= 0 else -1


def context(pos):
    import bisect
    if OPS0 >= 0 and OPS0 <= pos < OPS1:
        k = bisect.bisect_right([p for p, _ in OPKEYS], pos) - 1
        if k >= 0:
            return "OP:" + OPKEYS[k][1]
    if DOCS0 >= 0 and pos > DOCS0:
        k = bisect.bisect_right([p for p, _ in DOCIDS], pos) - 1
        if k >= 0 and pos - DOCIDS[k][0] < 60000:
            # inside DOCS only while no function starts between the article and here
            f = bisect.bisect_right([p for p, _ in FN], pos) - 1
            if f < 0 or FN[f][0] < DOCIDS[k][0]:
                return "DOC:" + DOCIDS[k][1]
    k = bisect.bisect_right([p for p, _ in FN], pos) - 1
    return FN[k][1] if k >= 0 else "(top)"


hits = defaultdict(list)
n_prose = 0
lines = [0] + [m.end() for m in re.finditer("\n", src)]


def lineno(pos):
    import bisect
    return bisect.bisect_right(lines, pos)


for a, b in script_ranges(src):
    if b - a < 1000:
        continue
    for pos, text, kind in literals(src[a:b], a):
        if re.fullmatch(r"\s*<code>[^<]*</code>\s*", text):
            continue  # a name in code type: the API's own (Python's spectra)
        t = readable(text) if "<" in text or "=" in text else text
        if not prose(t) and not fragment(t):
            continue
        if src[pos - 3:pos] == "kw:":
            continue  # Help's search words: they keep the old words, so either finds the article
        if SYN0 >= 0 and SYN0 <= pos < SYN1:
            continue  # Find a command's words for commands: what people type, not what Kurve says
        if re.search(r"===|!==|&&|=>|\)\{|\bconst [A-Za-z_]+=|;\s*(?:if|return|const|let)\b", t):
            continue  # code the lexer took for a literal
        if re.search(r"^\s*#|import numpy|\bnp\.\w|print\(", t):
            continue  # Python code shown to the user: its names (spectra, peaks) are the API's
        n_prose += 1
        ctx = context(pos)
        spec = bool(SPEC_CTX.match(ctx))
        for term, (rx, _) in TERMS.items():
            for m in re.finditer(rx, t, re.I):
                if term in SPEC_ONLY and spec:
                    continue
                if term in SENSE and (SENSE[term][0].search(ctx) or SENSE[term][1].search(t[max(0, m.start() - 30):m.end() + 30])):
                    continue
                if any(k == term and rx2.search(t[max(0, m.start() - 60):m.end() + 60]) for k, rx2 in KEEP):
                    continue
                hits[term].append((lineno(pos), ctx, t[max(0, m.start() - 50):m.end() + 50].replace("\n", " ")))

# The static markup outside the scripts.
markup = re.sub(r"<script>.*?</script>|<style>.*?</style>", lambda m: " " * len(m.group(0)), src, flags=re.S)
body0 = markup.find("<body")
for m in re.finditer(r">([^<]{3,})<", markup[body0:]):
    t = m.group(1)
    if prose(t):
        n_prose += 1
        for term, (rx, _) in TERMS.items():
            for mm in re.finditer(rx, t, re.I):
                if any(k == term and rx2.search(t) for k, rx2 in KEEP):
                    continue
                hits[term].append((lineno(body0 + m.start()), "(markup)", t.strip()[:120]))
for m in ATTR.finditer(markup[body0:]):
    t = m.group(2)
    for term, (rx, _) in TERMS.items():
        for mm in re.finditer(rx, t, re.I):
            hits[term].append((lineno(body0 + m.start()), "(markup attr)", t.strip()[:120]))

print(f"{APP.name}: {n_prose} prose literals")
print(f"{'term':24} {'off-glossary':>12}   instead")
total = 0
for term, (rx, inst) in TERMS.items():
    print(f"{term:24} {len(hits[term]):>12}   {inst}")
    total += len(hits[term])
print(f"{'total':24} {total:>12}")
by_ctx = Counter(c for t in hits for _, c, _ in hits[t])
print("most hits by context:", ", ".join(f"{c} {n}" for c, n in by_ctx.most_common(12)))
if LIST:
    for ln, ctx, snip in hits.get(LIST, []):
        print(f"  {ln:6} {ctx:28} …{snip}…")
if JSON_OUT:
    Path(JSON_OUT).write_text(json.dumps({t: [list(h) for h in v] for t, v in hits.items()}, ensure_ascii=False, indent=1), encoding="utf-8")
