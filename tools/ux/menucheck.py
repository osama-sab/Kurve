"""Phase 4: does the menu bar the app builds match the spec's (ux/spec/menus-after.txt)?

    python tools/ux/crawl.py kurve.html > /tmp/crawl.json
    python tools/ux/menucheck.py /tmp/crawl.json [--tree out.txt]

Every item of the spec's menu bar must be in the app's at the same path, and every item
of the app's must be in the spec's, except:
  - lists the spec writes as "(…)" (graphs, fonts, saved styles, scales, places),
    whose items the app fills in;
  - labels the app writes with what they act on ("Undo adding …", "With <column>");
  - DEFERRED: items the plan keeps until a later slice, each with the slice that changes it.
Exits 1 when anything else differs. --tree writes the app's menu bar as an indented list.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
crawl = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
spec_txt = (ROOT / "ux" / "spec" / "menus-after.txt").read_text(encoding="utf-8")

# Kept on purpose until a later slice: (path, why).
DEFERRED = {
    ("File", "Examples", "Raman: one band"): "R2, removed in slice 7",
    ("File", "Export", "All graphs as one figure"): "R6, removed in slice 7",
    ("File", "Export", "Processing steps as JSON"): "R3, removed in slice 7",
    ("Window", "Theme"): None,
    ("Window", "Style"): "R1, removed in slice 7",
    ("Analysis", "Mathematics", "Derivative, as a new column…"): "merged into Derivative… in slice 6",
    ("File", "Export", "Every column's processed data as CSV"): "shown with two columns or more (spec: under Export, unlisted)",
    ("File", "Export", "Batch results as CSV"): "shown after a batch fit (spec: under Export, unlisted)",
}
# Spec names that are the same item under the app's dynamic or deliberate label.
SAME = {
    ("File", "Export", "Report…"): "Report",          # no dialog follows, so no ellipsis
    ("Statistics", "Histogram…"): "Histogram",        # the same: it acts at once
    ("Edit", "Undo (what it undoes)"): re.compile(r"^Undo\b"),
    ("Edit", "Redo (what it redoes)"): re.compile(r"^Redo\b"),
    ("Plot", "New graph", "With (the active column)"): re.compile(r"^With (?!every)"),
    ("Plot", "Format graph…"): "Format graph…",
    ("Edit", "Delete", "Row"): re.compile(r"^Rows? \d"),          # names the rows selected
    ("Edit", "Delete", "Columns"): re.compile(r"^Columns?\b"),     # names the columns selected
}


# The spec's names for items the app keeps under today's name until a later slice (none since slice 3).
LATER = {}
COND = set()  # spec items marked ↓: shown only when they can apply


def spec_tree():
    out, stack = [], []
    for line in spec_txt.split("\n"):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        depth = (len(line) - len(line.lstrip(" "))) // 2
        body, _, note = line.strip().partition("  ## ")
        body = re.sub(r"\s+\[[^\]]+\]$", "", body).strip()
        stack = stack[:depth] + [body]
        out.append(tuple(stack))
        if "↓" in note:
            COND.add(tuple(stack))
    return out


def app_tree():
    out = []
    for k, items in crawl["menus"].items():
        if not k.startswith("menubar:"):
            continue
        top = k.split(":", 1)[1].capitalize()
        out.append((top,))
        for it in items:
            if "label" in it and it.get("path"):
                out.append((top,) + tuple(it["path"]))
    return out


spec, app = spec_tree(), app_tree()
lists = {p[:-1] for p in spec if p[-1].startswith("(")}          # parents whose items the app fills in
under_list = lambda p: any(p[:len(q)] == q and len(p) > len(q) for q in lists)
spec_items = [p for p in spec if not p[-1].startswith("(")]
app_set = set(app)


def found(p):
    if p in app_set or LATER.get(p) in app_set:
        return True
    # Python waits under More until a project uses it.
    if p[:2] == ("Analysis", "Python") and ("Analysis", "More") + p[1:] in app_set:
        return True
    s = SAME.get(p)
    if s is None:
        return False
    par = p[:-1]
    return any(a[:-1] == par and (a[-1] == s if isinstance(s, str) else s.search(a[-1])) for a in app)


miss = [p for p in spec_items if not found(p)]
cond = [p for p in miss if any(p[:len(c)] == c for c in COND)]
miss = [p for p in miss if p not in cond]
same_names = {(p[:-1], s) for p, s in SAME.items() if isinstance(s, str)}
extra = []
for a in app:
    if a in set(spec_items) or under_list(a) or a[:2] in DEFERRED or a in DEFERRED:
        continue
    if any(a[:len(d)] == d for d in DEFERRED):
        continue
    if any(a[:-1] == par and a[-1] == s for par, s in same_names):
        continue
    if a[:2] == ("Analysis", "More") and ("Analysis",) + a[2:] in set(spec_items):
        continue
    if any(p[:-1] == a[:-1] and not isinstance(s, str) and s.search(a[-1]) for p, s in SAME.items()):
        continue
    # inside a submenu the spec leaves unlisted under a list parent ("Windows in use", the Plot type radios…)
    extra.append(a)

if "--tree" in sys.argv:
    Path(sys.argv[sys.argv.index("--tree") + 1]).write_text("\n".join("  " * (len(p) - 1) + p[-1] for p in app) + "\n", encoding="utf-8")

print(f"spec items: {len(spec_items)}, app items: {len(app)}")
print(f"in the spec, not in the app: {len(miss)}")
for p in miss:
    why = DEFERRED.get(p)
    print("  -", " › ".join(p), f"   [{why}]" if why else "")
print(f"shown only when they can apply, not in the crawled state: {len(cond)}")
for p in cond:
    print("  ↓", " › ".join(p))
print(f"in the app, not in the spec: {len(extra)}")
for p in extra:
    print("  +", " › ".join(p))
deferred_in = [(p, w) for p, w in DEFERRED.items() if w and (p in app_set)]
print(f"kept until a later slice: {len(deferred_in)}")
for p, w in deferred_in:
    print("  ~", " › ".join(p), f"   [{w}]")
sys.exit(1 if miss or extra else 0)
