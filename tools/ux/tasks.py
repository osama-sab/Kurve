"""Phase 4: the Phase 1 tasks as paths the rig can repeat after every slice.

    python tools/ux/tasks.py <run-label> T1 [T2 ...] [--app path/to/kurve.html] [--theme dark]

Each task follows the path Phase 1 found, as a person would take it today: the
same intentions, the same first places to look. Where the app now puts the thing
somewhere else, the path says so, and a first place that no longer has it is
logged as a wrong turn. Every action is a real click or key, aimed at what is drawn
(drive.py's rules). Logs go to ux/evidence/logs/slices/<label>.json; the counts are
printed per task and compared with Phase 1's (ux/COLD_WALKTHROUGH.md, section 1).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drive import NotOnScreen, Rig  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
FIX = Path(__file__).resolve().parent / "fixtures"
LOGS = ROOT / "ux" / "evidence" / "logs" / "slices"

# Phase 1 at 1366x768, light: clicks, keys, wrong turns, guesses (COLD_WALKTHROUGH.md §1, corrected)
PHASE1 = {"T1": (7, 60, 0, 0), "T2": (15, 45, 4, 3), "T3": (2, 2, 0, 1), "T4": (11, 45, 0, 0), "T5": (6, 44, 1, 0),
          "T6": (30, 1, 3, 0), "T7": (22, 60, 2, 0), "T8": (19, 2, 0, 0), "T9": (19, 5, 1, 1), "T10": (10, 4, 0, 0),
          "T11": (7, 0, 0, 0), "T12": (10, 1, 0, 0), "T13": (12, 52, 1, 0)}


def menuitem(r, name, exact=False):
    return r.by_role("menuitem", name, exact=exact)


def open_menu_item(r, path, start=None):
    """Open a menu (the menu bar's name, or an already open menu) and walk a path of items by hovering."""
    if start:
        r.click_role("button", start, exact=True, within=r.page.locator(".menubar"))
        r.wait(250)
    for i, name in enumerate(path):
        loc = menuitem(r, name, exact=True)
        if i < len(path) - 1:
            r.hover(loc, name, ms=350)
        else:
            r.click(loc, name)


def in_view(r, loc):
    try:
        b = loc.bounding_box()
    except Exception:  # noqa: BLE001
        return False
    vp = r.page.viewport_size
    return bool(b) and b["y"] >= 0 and b["y"] + b["height"] <= vp["height"]


def scroll_menu_to(r, name):
    """A menu taller than the screen: turn the wheel over it until the item is drawn."""
    for _ in range(12):
        loc = menuitem(r, name, exact=True)
        if in_view(r, loc):
            return loc
        box = r.page.locator(".menu").last.bounding_box()
        r.wheel(240, at=(box["x"] + box["width"] / 2, box["y"] + box["height"] - 30), what="scroll the menu")
        r.wait(150)
    return menuitem(r, name, exact=True)


def t1(r):
    """T1 (A): type six pairs, a scatter plot, titles with units, a PNG."""
    r.task("T1", "Type 6 x,y pairs, scatter plot, axis titles with units, export PNG")
    cell = r.page.locator('#ws td[data-r="0"][data-ci="0"]')
    r.click(cell, "worksheet cell A1")
    pairs = [("1", "2.1"), ("2", "3.9"), ("3", "6.2"), ("4", "8.1"), ("5", "9.8"), ("6", "12.2")]
    for x, y in pairs:
        r.type(x)
        r.press("Tab")
        r.type(y)
        r.press("Enter")
    r.wait_quiet(600)
    r.dblclick(r.page.locator('[data-axtitle="x"]').first, "x-axis title")
    r.type("Time (s)")
    r.press("Enter")
    r.wait(300)
    r.dblclick(r.page.locator('[data-axtitle="y"]').first, "y-axis title")
    r.type("Distance (m)")
    r.press("Enter")
    r.wait(300)
    box = r.page.locator("#plot").bounding_box()
    r.click_at(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.35, "graph area (right-click)", button="right")
    r.wait(300)
    exp = scroll_menu_to(r, "Export the figure")
    r.hover(exp, "Export the figure", ms=400)
    png = menuitem(r, "As PNG (image, for slides)", exact=True)
    got = r.expect_download(lambda: r.click(png, "As PNG (image, for slides)"), "t1.png", "export PNG")
    r.end_task("yes" if got else "no")


TASKS = {"T1": t1}

if __name__ == "__main__":
    argv = sys.argv[1:]
    label = argv[0]
    app = ROOT / "kurve.html"
    theme = "light"
    if "--app" in argv:
        app = Path(argv[argv.index("--app") + 1]).resolve()
    if "--theme" in argv:
        theme = argv[argv.index("--theme") + 1]
    names = [a for a in argv[1:] if a in TASKS]
    LOGS.mkdir(parents=True, exist_ok=True)
    with Rig(run=label, app=app, out=Path("/tmp") / "kurve-tasks", width=1366, height=768, theme=theme) as r:
        r.wait_quiet(1500)
        for n in names:
            try:
                TASKS[n](r)
            except NotOnScreen as e:
                r.finding(f"{n}: not on the screen: {e}")
                r.end_task("no", str(e))
        summ = r.summary()
        log = [e for e in r.events]
    (LOGS / f"{label}.json").write_text(json.dumps({"events": log, "summary": summ}, ensure_ascii=False, indent=1))
    print(f"{'task':5s} {'done':6s} {'clicks':>7s} {'keys':>5s} {'wrong':>6s} {'KLM s':>6s}   Phase 1: clicks keys wrong guesses")
    for n in names:
        s = summ.get(n, {})
        p = PHASE1.get(n)
        print(f"{n:5s} {str(s.get('success')):6s} {s.get('clicks', 0):7d} {s.get('keys', 0):5d} {s.get('wrong_turns', 0):6d} {s.get('klm_seconds', 0):6.1f}   {p}")
