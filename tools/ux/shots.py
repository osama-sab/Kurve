"""Phase 4: before-and-after screenshots of a slice, the same screens every time.

    python tools/ux/shots.py <label> [path/to/kurve.html] [--only name,name]

Takes a fixed set of screens at 1366x768, in light and in dark, and writes them
to ux/evidence/slices/<label>-<theme>-<NN>-<name>.png, reduced to 256 colours as
the Phase 1 evidence is. Run it with "s1-before" on the file before a slice and
"s1-after" after it, and the pairs line up by name.

Each screen is set up through the app's own functions (this is a camera, not a
walkthrough), and a menu is opened by clicking its name as a person would.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drive import Rig  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
LABEL = args[0] if args else "shots"
APP = Path(args[1]).resolve() if len(args) > 1 else ROOT / "kurve.html"
ONLY = None
for a in sys.argv[1:]:
    if a.startswith("--only"):
        ONLY = set(a.split("=", 1)[1].split(","))
OUT = ROOT / "ux" / "evidence" / "slices"

CLOSE = """() => { try { document.querySelectorAll('.modal').forEach(m => { if (!m.hidden && m._cancel) m._cancel(); });
  if (winOpen('format')) closePlotDetails();
  if (S.pending) cancelTool(); } catch (e) {} }"""

# name, setup (JS run before the picture), and an optional menu-bar name to click open
SCREENS = [
    ("first-screen", None, None),
    ("ir-example", "() => { loadExample('ir'); }", None),
    ("menu-file", None, "File"),
    ("menu-plot", None, "Plot"),
    ("menu-analysis", None, "Analysis"),
    ("graph-rightclick", "() => { const f = $('#figure').getBoundingClientRect(), d = derived(), i = Math.floor(d.x.length * 0.55); openGraphMenu({ clientX: f.left + S.geo.X(d.x[i]), clientY: f.top + S.geo.Y(d.y[i]), preventDefault() {} }); }", None),
    ("fit-peaks", "() => { S.fitMode = 'peaks'; showTab('fit'); renderPlot(); runPeakFinder(); }", None),
    ("format-axis", "() => { openPlotDetails(null, 'ax:x'); }", None),
    ("tool-smooth", "() => { openTool('smooth'); }", None),
    ("worksheet", "() => { sheetForward(); S.ws.r = 2; S.ws.c = 1; S.ws.ar = 6; S.ws.ac = 1; wsPaintSel(); }", None),
    ("history", "() => { openWin('flow', {render: true}); focusWin('flow'); }", None),
    ("peaks", "() => { openPeakFinder(); }", None),
    ("statistics", "() => { openWin('stats', {render: true}); focusWin('stats'); }", None),
    ("menu-spectroscopy", None, "Spectroscopy"),  # from slice 4; skipped where there is no such menu
    # From slice 5: a curve fit on the decay example, and statistics of groups pasted side by side.
    ("fit-curve", "async () => { await loadExample('decay'); await new Promise(r => setTimeout(r, 500)); S.fitMode = 'curve'; showTab('fit'); renderFit(); }", None),
    ("stats-groups", "async () => { newProject(); await new Promise(r => setTimeout(r, 600)); S.ws.r = 0; S.ws.c = 0; S.ws.ar = 0; S.ws.ac = 0; wsPasteText('Control\\tPlacebo\\tDrug\\n310\\t322\\t301\\n295\\t340\\t288\\n330\\t301\\t295\\n301\\t315\\t310\\n288\\t333\\t279'); openWin('stats', {render: true}); focusWin('stats'); }", None),
]


def shoot(theme):
    with Rig(run=f"{LABEL}-{theme}", app=APP, out=Path("/tmp") / "kurve-shots", width=1366, height=768, theme=theme) as r:
        r.wait_quiet(1500)
        pics = []
        for i, (name, setup, menu) in enumerate(SCREENS, 1):
            if ONLY and name not in ONLY and name != "ir-example":
                continue
            r.page.keyboard.press("Escape")
            r.page.evaluate(CLOSE)
            if setup:
                try:
                    r.page.evaluate(setup)
                except Exception as e:  # noqa: BLE001 - a screen that cannot be set up is recorded as such
                    print(f"  {name}: {str(e)[:120]}", file=sys.stderr)
            r.wait_quiet(700)
            if menu and not r.page.locator(".menubar .mb", has_text=menu).count():
                continue
            if menu:
                r.click_role("button", menu, exact=True, within=r.page.locator(".menubar"))
                r.wait_quiet(400)
            if ONLY and name not in ONLY:
                continue
            p = OUT / f"{LABEL}-{theme}-{i:02d}-{name}.png"
            r.page.screenshot(path=str(p))
            pics.append(p)
            if menu:
                r.page.keyboard.press("Escape")
        errs = r.errors
    return pics, errs


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    allp = []
    for theme in ("light", "dark"):
        pics, errs = shoot(theme)
        allp += pics
        if errs:
            print(f"page errors ({theme}):", errs[:5], file=sys.stderr)
    try:
        from PIL import Image
        for p in allp:
            Image.open(p).convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT).save(p, optimize=True)
    except ImportError:
        pass
    print(f"{len(allp)} screenshots in {OUT.relative_to(ROOT)}")
