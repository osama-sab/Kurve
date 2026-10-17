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
    """An item of the open menus by its label (its shortcut and note aside), the innermost first."""
    if exact:
        lab = name.replace("\\", "\\\\").replace("'", "\\'")
        return r.page.locator(".menu .mi").filter(has=r.page.locator(f".mlab:text-is('{lab}')")).last
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


def new_ui(r):
    """The menus after slice 4 (a Spectroscopy menu, Export on the graph's right-click)."""
    return bool(r.page.evaluate("() => !!document.querySelector('.menubar [data-menu=spectroscopy]')"))


def bar(r, name):
    r.click_role("button", name, exact=True, within=r.page.locator(".menubar"))
    r.wait(250)


def ribbon(r, name):
    r.click(r.page.locator(f'#gRibbon .rb[data-rmenu="{name.lower()}"]'), f"{name} on the graph's bar")
    r.wait(250)


def front_graph(r):
    r.page.evaluate("() => { const g = winOfGraph(GID()); if (g) focusWin(g); }")
    r.wait(150)


def at_point(r, i, dy=0):
    """Where point i of the active curve is drawn, on the page."""
    p = r.page.evaluate("""i => { const g = S.geo, pts = (S.shownPts && S.shownPts.length) ? S.shownPts : derived().x.map((x, k) => ({x, y: derived().y[k]}));
      i = Math.min(i, pts.length - 1); return {x: g.X(pts[i].x), y: g.Y(pts[i].y)}; }""", i)
    f = r.page.locator("#figure").bounding_box()
    return f["x"] + p["x"], f["y"] + p["y"] + dy


def plot_frac(r, fx, fy):
    b = r.page.locator("#plot").bounding_box()
    return b["x"] + b["width"] * fx, b["y"] + b["height"] * fy


def import_file(r, name, how="File"):
    """File › Import data… (or the toolbar's Import), then the dialog's Import button."""
    if how == "File":
        bar(r, "File")
        r.choose_file(lambda: r.click(menuitem(r, "Import data…", exact=True), "Import data…"), FIX / name, name)
    else:
        r.choose_file(lambda: r.click(r.page.locator("#importBtn"), "toolbar Import"), FIX / name, name)
    r.wait(600)


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
    if new_ui(r):
        exp = scroll_menu_to(r, "Export")
        r.hover(exp, "Export", ms=400)
        png = menuitem(r, "Graph as PNG", exact=True)
        got = r.expect_download(lambda: r.click(png, "Graph as PNG"), "t1.png", "export PNG")
    else:
        exp = scroll_menu_to(r, "Export the figure")
        r.hover(exp, "Export the figure", ms=400)
        png = menuitem(r, "As PNG (image, for slides)", exact=True)
        got = r.expect_download(lambda: r.click(png, "As PNG (image, for slides)"), "t1.png", "export PNG")
    r.end_task("yes" if got else "no")


def t2(r):
    """T2 (A): a straight-line fit to calibration.csv, its slope and R², the equation on the graph."""
    pg = r.page
    r.task("T2", "Fit a straight line to calibration.csv, read slope ± error and R², show line and equation on the graph")
    import_file(r, "calibration.csv")
    r.guess("Accepted the default 'Add these columns, keeping what is here' without knowing what it does to the first graph")
    r.click(pg.locator("#impGo"), "the dialog's Import button")
    r.wait_quiet(900)
    front_graph(r)
    x, y = at_point(r, 3)
    r.click_at(x, y, "a data point (right-click)", button="right")
    r.wait(300)
    r.wrong_turn("Right-clicked the data for 'Add trendline' (Excel habit); the menu has no fit")
    r.press("Escape")
    bar(r, "Analysis")
    r.hover(menuitem(r, "Fit", exact=True), "Fit submenu", ms=350)
    r.guess("Picked 'Curve fit' hoping a straight line is in it")
    r.click(menuitem(r, "Curve fit…" if new_ui(r) else "Curve fit", exact=True), "Curve fit")
    r.wait(500)
    pg.evaluate("() => focusWin('fit')")
    if pg.evaluate("() => !!(S.draft && S.draft.model === 'linear')"):
        # Since slice 5 the model is suggested from the data's shape (UX_SPEC 3.7).
        r.say("The model already reads Straight line, suggested for data that rises in a straight line")
    else:
        r.click(pg.locator("#model"), "Model dropdown")
        r.press("ArrowUp", "move up the list", times=3)
        r.press("Enter", "choose")
    r.wait(300)
    r.guess("Left 'Weight by the Y error column (1/σ²)' on without knowing what it changes")
    r.click(pg.locator("#doFit"), "Fit")
    r.wait_quiet(900)
    front_graph(r)
    fx = pg.evaluate("() => { const g = S.geo, f = shownFit(); if (!g || !f) return null; const m = fitModel(f), x = (g.v.x0 * 0.4 + g.v.x1 * 0.6); return {x: g.X(x), y: g.Y(m.f(x, f.params))}; }")
    fb = pg.locator("#figure").bounding_box()
    r.click_at(fb["x"] + fx["x"], fb["y"] + fx["y"], "the red fit line (right-click)", button="right")
    r.wait(300)
    r.wheel(400, at=(fb["x"] + fx["x"] + 40, fb["y"] + fx["y"] + 60), what="scroll the menu")
    r.wrong_turn("Right-clicked the fit line looking for 'Display equation on chart': no fit equation option")
    r.press("Escape", "close menu")
    r.press("Escape", "close menu")
    ribbon(r, "Plot")
    r.hover(menuitem(r, "Annotate", exact=True), "Annotate", ms=350)
    r.wrong_turn("Plot › Annotate: no fit equation item")
    r.press("Escape", "close menu")
    r.press("Escape", "close menu")
    r.click(pg.locator('#taskbar .tk[data-tk="res"]'), "Results")
    r.wait(300)
    r.wrong_turn("Results window: no way to show the equation on the graph")
    front_graph(r)
    x, y = plot_frac(r, 0.18, 0.18)
    r.click_at(x, y, "graph, upper left (right-click)", button="right")
    r.wait(300)
    r.click(menuitem(r, "Text here…", exact=True), "Text here…")
    r.wait(300)
    r.type("y = 0.02420x + 0.0139, R^2 = 0.9994")
    r.press("Enter", "keep text")
    r.end_task("partial", "equation only by retyping it as free text")


def setup_growth(r):
    """Not a task: T4's import of growth_eu.csv, which T5 builds on."""
    pg = r.page
    pg.evaluate("() => { const f = S.store && S.store; }")
    import_file(r, "growth_eu.csv", how="toolbar")
    pg.evaluate("() => { const b = document.getElementById('impGo'); if (b) b.click(); }")
    r.wait_quiet(1200)


def t5(r):
    """T5 (A): a new column, log10 of Sample A, plotted."""
    pg = r.page
    r.task("T5", "Make a new column = log10 of a sample column, plot it")
    pg.evaluate("() => { openWin('sheet', {render: true}); focusWin('sheet'); }")
    r.hover(pg.locator("#addColBtn"), "the + button on the worksheet bar", ms=500)
    r.click(pg.locator("#w-sheet [data-wmax]"), "worksheet maximise button")
    r.wait(300)
    r.wheel(-600, at=(683, 400), what="scroll the sheet up")
    ci = pg.evaluate("() => S.wsm.cols.findIndex(q => q.phantom)")
    r.click(pg.locator(f'#ws td[data-r="0"][data-ci="{ci}"]'), "cell E1")
    r.type("=LOG10(B1)")
    r.press("Enter", "enter formula")
    if pg.locator("#dockBar").count():
        # Since slice 2 a formula typed into a cell moves to the column's F(x)= row, still being typed.
        r.say("The formula moved to the F(x)= row; the message says a letter is the whole column")
    else:
        r.wrong_turn("Typed an Excel formula =LOG10(B1) into a cell: refused as 'not a number'")
        r.press("Escape", "leave the cell")
        r.click(pg.locator(f'#ws td[data-r="-1"][data-ci="{ci}"]'), "F(x)= cell of column E")
        r.type("=LOG10(B1)")
    r.press("Control+a", "select all")
    r.type("=log10(B1)")
    r.press("Control+a", "select all")
    r.type("=log10(B)")
    r.press("Enter", "set formula")
    r.wait_quiet(600)
    r.click(pg.locator(f'#ws th[data-ch="{ci}"]'), "column E letter")
    bar(r, "Plot")  # Phase 1's click landed on the menu bar's Plot
    r.hover(menuitem(r, "Plot the selected columns", exact=True), "Plot the selected columns", ms=350)
    r.click(menuitem(r, "Symbols", exact=True), "Symbols")
    r.wait_quiet(600)
    r.end_task("yes")


SURVEY_COLS = None


def survey_cols():
    """survey.csv as a person reshapes it in a spreadsheet: one column per group, its name on top."""
    import csv
    rows = list(csv.reader((FIX / "survey.csv").read_text(encoding="utf-8").splitlines()))
    groups = {}
    for row in rows[1:]:
        if len(row) >= 3:
            groups.setdefault(row[1], []).append(row[2])
    names = list(groups)
    n = max(len(v) for v in groups.values())
    lines = ["\t".join(names)] + ["\t".join(groups[g][i] if i < len(groups[g]) else "" for g in names) for i in range(n)]
    return "\n".join(lines)


def t6(r):
    """T6 (A): statistics and a histogram per group (survey.csv, refused, so reshaped and pasted)."""
    pg = r.page
    r.task("T6", "Descriptive statistics and a histogram per group for survey.csv; compare the groups")
    import_file(r, "survey.csv")
    r.wait(400)
    r.press("Escape")
    r.wrong_turn("Imported survey.csv: refused ('No rows of numbers'); reshaped it elsewhere")
    # A new project, from the project list (File › New project behaved as Undo in Phase 1, a bug since fixed).
    r.click(pg.locator("#projMenu"), "arrow beside the project name")
    r.wait(250)
    r.click(menuitem(r, "New project", exact=True), "New project")
    r.wait_quiet(1200)
    text = survey_cols()
    pg.evaluate("t => { window.__clip = t; }", text)
    pg.evaluate("() => { openWin('sheet', {render: true}); focusWin('sheet'); }")
    r.click(pg.locator('#ws td[data-r="0"][data-ci="0"]'), "cell A1")
    # Ctrl+V with the reshaped columns on the clipboard: the rig hands the text to the paste handler.
    r.press("Control+v", "paste")
    pg.evaluate("() => wsPasteText(window.__clip)")
    r.wait_quiet(900)
    bar(r, "Statistics")
    r.click(menuitem(r, "Descriptive statistics…" if new_ui(r) else "Descriptive statistics", exact=True), "Descriptive statistics")
    r.wait(500)
    if pg.evaluate("() => allCols().filter(c => !c.src)[0].role") == "y":
        # Since slice 5 a paste with no X-like column makes every column a Y (UX_SPEC 3.7).
        r.say("Control is a Y like the other groups: the statistics list all three")
    else:
        # Control is column A, made X by position: Use as Y.
        r.click(pg.locator('#ws [data-cmenu]').first, "column A's menu arrow")
        r.wait(250)
        if new_ui(r):
            r.hover(menuitem(r, "Use as", exact=True), "Use as", ms=350)
            r.click(menuitem(r, "Y", exact=True), "Y")
        else:
            r.click(menuitem(r, "Use as Y", exact=True), "Use as Y")
        r.wait_quiet(700)
        r.click(pg.locator('#taskbar .tk[data-tk="stats"]'), "Statistics taskbar button")
        r.wait(400)
    r.click(pg.locator("#w-stats .win-h [data-wclose]"), "close Statistics")
    pg.evaluate("() => { openWin('sheet', {render: true}); focusWin('sheet'); }")
    ys = pg.evaluate("() => S.wsm.cols.map((q, i) => q.col && q.col.role === 'y' ? i : -1).filter(i => i >= 0)")
    r.click(pg.locator(f'#ws th[data-ch="{ys[0]}"]'), "the first group's letter")
    r.click(pg.locator(f'#ws th[data-ch="{ys[-1]}"]'), "the last group's letter", mods=["Shift"])
    n0 = pg.evaluate("() => yCols().length")
    bar(r, "Statistics")
    r.click(menuitem(r, "Histogram" if new_ui(r) else "Histogram of the values", exact=True), "Histogram")
    r.wait_quiet(900)
    made = pg.evaluate("() => yCols().length") - n0
    if made < len(ys):
        r.wrong_turn(f"Statistics › Histogram: {made} histogram(s) for {len(ys)} selected columns")
        pg.evaluate("() => { openWin('sheet', {render: true}); focusWin('sheet'); }")
        r.click(pg.locator("#wsPlotBtn"), "worksheet Plot button")
        r.wait(250)
        r.click(menuitem(r, "Histogram of each", exact=True), "Histogram of each")
        r.wait_quiet(900)
    pg.evaluate("() => { openWin('sheet', {render: true}); focusWin('sheet'); }")
    r.click(pg.locator(f'#ws th[data-ch="{ys[0]}"]'), "the first group's letter")
    r.click(pg.locator(f'#ws th[data-ch="{ys[-1]}"]'), "the last group's letter", mods=["Shift"])
    r.click(pg.locator("#wsPlotBtn"), "worksheet Plot button")
    r.wait(250)
    r.click(menuitem(r, "Box chart", exact=True), "Box chart")
    r.wait_quiet(900)
    r.end_task("partial", "survey.csv still cannot be imported; reshaped and pasted")


def t8(r):
    """T8 (B): Raman: spikes, baseline, peaks fitted, a table with errors."""
    pg = r.page
    r.task("T8", "raman_raw.txt: remove spikes, subtract baseline, find and fit the peaks, table of position, FWHM, area with errors")
    import_file(r, "raman_raw.txt")
    r.click(pg.locator("#impGo"), "Import 2 columns")
    r.wait_quiet(1200)
    r.click(pg.locator("#toastAct"), "button 'Plot it now'")
    r.wait_quiet(900)
    front_graph(r)
    g = pg.evaluate("() => winOfGraph(GID())")
    r.dblclick(pg.locator(f"#w-{g} .win-h"), "graph title bar")
    r.wait(400)
    drawn_as = pg.evaluate("() => serStyle(activeYCol().id, true, readPalette(), false, plotCfg()).type")
    if drawn_as != "line":
        if new_ui(r):
            x, y = at_point(r, 300)
            r.click_at(x, y, "the curve (right-click)", button="right")
            r.wait(300)
            r.hover(menuitem(r, "Plot type", exact=True), "Plot type", ms=350)
            r.click(menuitem(r, "Line", exact=True), "Line")
        else:
            r.click(pg.locator("#style"), "plot type list (Symbols)")
            r.press("ArrowUp", "to Line")
            r.press("Enter", "choose")
        r.wait(400)
    if new_ui(r):
        bar(r, "Spectroscopy")
        r.click(menuitem(r, "Remove cosmic-ray spikes…", exact=True), "Remove cosmic-ray spikes…")
    else:
        bar(r, "Data")
        r.hover(menuitem(r, "Clean", exact=True), "Clean", ms=350)
        r.click(menuitem(r, "Remove cosmic-ray spikes…", exact=True), "Remove cosmic-ray spikes…")
    r.wait(600)
    r.click(pg.locator("#tlOk"), "OK")
    r.wait_quiet(800)
    bar(r, "Spectroscopy" if new_ui(r) else "Analysis")
    r.click(menuitem(r, "Subtract background…", exact=True), "Subtract background…")
    r.wait(700)
    r.click(pg.locator("#tlOk"), "OK")
    r.wait_quiet(900)
    bar(r, "Analysis")
    r.hover(menuitem(r, "Fit", exact=True), "Fit", ms=350)
    r.click(menuitem(r, "Peak fit…" if new_ui(r) else "Peak fit", exact=True), "Peak fit")
    r.wait_quiet(1200)
    pg.evaluate("() => focusWin('fit')")
    use = pg.locator("#pane-fit button", has_text="Use these").first
    if not in_view(r, use):
        b = pg.locator("#w-fit .win-b").bounding_box()
        r.wheel(500, at=(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2), what="scroll Fit window")
    r.click(use, "Use these peaks")
    r.wait_quiet(900)
    r.click(pg.locator("#doPeakFit"), "Fit the peaks")
    r.wait_quiet(4000)
    r.click(pg.locator("#pane-res button", has_text="Copy").first, "Copy table")
    r.end_task("yes")


def t9(r):
    """T9 (B): a two-panel figure (original and fitted), SVG and PDF."""
    pg = r.page
    r.task("T9", "Two-panel publication figure (raw and fitted) with matching axes, export as SVG/PDF")
    for w in ("res", "fit"):
        if pg.evaluate("w => winOpen(w)", w):
            pg.evaluate("w => focusWin(w)", w)
            r.click(pg.locator(f"#w-{w} .win-h [data-wclose]"), f"close {w}")
    new = new_ui(r)

    def figure_dialog(first):
        if new:
            if first:
                # Phase 1 looked under Window; it is under Window › Graphs too, beside Combine graphs….
                bar(r, "Window")
                r.hover(menuitem(r, "Graphs", exact=True), "Graphs", ms=350)
            else:
                bar(r, "Window")
                r.hover(menuitem(r, "Graphs", exact=True), "Graphs", ms=350)
        else:
            bar(r, "Window")
            r.hover(menuitem(r, "New graph", exact=True), "New graph", ms=350)
        r.click(menuitem(r, "A figure of panels…", exact=True), "A figure of panels…")
        r.wait(500)

    figure_dialog(True)
    r.wrong_turn("Tried the figure dialog with one column: Make it is off")
    r.click(pg.locator("#formModal button", has_text="Cancel").first, "Cancel")
    r.wait(300)
    front_graph(r)
    g = pg.evaluate("() => winOfGraph(GID())")
    r.click(pg.locator(f"#w-{g} .win-h [data-gmenu], #w-{g} .win-h [data-wmenu]").first, "graph ⋯ menu")
    r.wait(250)
    r.click(menuitem(r, "Duplicate", exact=True), "Duplicate")
    r.wait_quiet(900)
    front_graph(r)
    r.click(pg.locator('#viewSeg button[data-view="raw"]'), "Original" if new else "Raw")
    r.wait(400)
    figure_dialog(False)
    sel = pg.locator("#formModal select").first
    r.click(sel, "Panels list")
    r.press("ArrowUp", "The graphs ticked below")
    r.press("Enter", "choose")
    cols = pg.locator("#formModal select").nth(1)
    r.click(cols, "Columns list")
    r.press("ArrowDown", "to 1")
    r.press("Enter", "choose")
    r.guess("Switched Share X on without knowing whether it was already on")
    sx = pg.locator("#formModal label", has_text="Share X").first
    r.click(sx, "Share X switch")
    r.click(pg.locator("#formModal .sheet-f .btn.primary, #formModal button.primary").first, "Make it")
    r.wait_quiet(1200)
    bar(r, "File")
    r.hover(menuitem(r, "Export", exact=True), "Export", ms=350)
    svg = menuitem(r, "Graph as SVG" if new else "Figure as SVG (vector, for papers)", exact=True)
    a = r.expect_download(lambda: r.click(svg, "SVG"), "t9.svg", "Figure as SVG")
    bar(r, "File")
    r.hover(menuitem(r, "Export", exact=True), "Export", ms=350)
    if new:
        b = r.expect_download(lambda: r.click(menuitem(r, "Graph as PDF", exact=True), "Graph as PDF"), "t9.pdf", "Figure as PDF")
    else:
        r.hover(menuitem(r, "Figure as PDF or EPS", exact=True), "Figure as PDF or EPS", ms=350)
        b = r.expect_download(lambda: r.click(menuitem(r, "PDF (vector, standard fonts)", exact=True), "PDF"), "t9.pdf", "Figure as PDF")
    r.end_task("yes" if a and b else "no")


def t10(r):
    """T10 (B): restyle one curve, the tick numbers' size, reverse X (on T9's figure)."""
    pg = r.page
    r.task("T10", "Restyle one curve (colour, line width), change the axis tick font size, reverse the X axis")
    front_graph(r)
    w = pg.evaluate("() => winOfGraph(GID())")
    r.click(pg.locator(f"#w-{w} [data-wmax]"), "figure maximise")
    r.wait_quiet(900)
    top = pg.evaluate("() => { const p = S.shownPts || []; let k = 0; p.forEach((q, i) => { if (q.y > p[k].y) k = i; }); return k; }")
    x, y = at_point(r, top)
    r.click_at(x, y, "the curve in panel (a) (right-click)", button="right")
    r.wait(300)
    r.say("menu: " + " | ".join(pg.evaluate("() => [...document.querySelectorAll('.menu .mi')].slice(0, 14).map(e => e.getAttribute('title') || e.textContent.trim())")))
    r.click(pg.locator('.menu .mi.sw[title="green"]').last, "green swatch")
    r.wait(400)
    x, y = at_point(r, top)
    r.click_at(x, y, "the curve in panel (a) (right-click)", button="right")
    r.wait(300)
    r.click(menuitem(r, "Line, symbols and colour…", exact=True), "Line, symbols and colour…")
    r.wait(500)
    b = pg.locator("#pdLw").bounding_box()
    r.drag(b["x"] + 4, b["y"] + b["height"] / 2, b["x"] + b["width"] * 0.36, b["y"] + b["height"] / 2, "Width slider")
    r.click(pg.locator('.pd-item[data-pdpage="text"]'), "Text and fonts")
    r.wait(300)
    r.click(pg.locator('[data-tb$="ticks"] .tsz').first, "tick numbers size")
    r.press("Control+a", "select")
    r.type("13")
    r.press("Enter", "set")
    r.click(pg.locator("#pdOk"), "OK")
    r.wait_quiet(600)
    r.hover(pg.locator("#revX"), "the ⇄ toolbar icon", ms=500)
    r.click(pg.locator("#revX"), "⇄ toolbar icon")
    r.wait(400)
    r.end_task("partial", "one panel restyled and reversed")


def t12(r):
    """T12 (C): reload the T8 project; explain every step; trust the table."""
    pg = r.page
    r.task("T12", "Reload the T8 project and explain, from the app alone, every step and whether the peak table can be trusted")
    r.reload()
    r.wait_quiet(1500)
    for w in ("res", "fit"):
        if pg.evaluate("w => winOpen(w)", w):
            pg.evaluate("w => focusWin(w)", w)
            r.click(pg.locator(f"#w-{w} .win-h [data-wclose]"), f"close {w}")
    if not pg.evaluate("() => winOpen('flow')"):
        pg.evaluate("() => openWin('flow', {render: true})")
    pg.evaluate("() => focusWin('flow')")
    r.click(pg.locator("#w-flow [data-wmax]"), "History maximise")
    r.wait(400)
    boxes = pg.locator("#w-flow [data-fk^='step:']")
    for i in range(min(2, boxes.count())):
        r.click(boxes.nth(i), f"step box {i + 1}")
        r.wait(250)
    r.click(pg.locator("#w-flow [data-ftab='log'], #w-flow button", has_text="Log").first, "Log tab")
    r.wait(300)
    bar(r, "File")
    r.hover(menuitem(r, "Export", exact=True), "Export", ms=350)
    rep = menuitem(r, "Report" if new_ui(r) else "Report as HTML", exact=True)
    got = r.expect_download(lambda: r.click(rep, "Report"), "t12.html", "Report as HTML")
    r.end_task("yes" if got else "no")


TASKS = {"T1": t1, "T2": t2, "T5": t5, "T6": t6, "T8": t8, "T9": t9, "T10": t10, "T12": t12}
SETUP = {"T5": setup_growth}

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
                if n in SETUP and "--fresh" not in argv:
                    SETUP[n](r)
                TASKS[n](r)
            except NotOnScreen as e:
                r.finding(f"{n}: not on the screen: {e}")
                r.end_task("no", str(e))
        summ = r.summary()
        log = [e for e in r.events]
    (LOGS / f"{label}.json").write_text(json.dumps({"events": log, "summary": summ}, ensure_ascii=False, indent=1))
    print(f"{'task':5s} {'done':8s} {'clicks':>7s} {'keys':>5s} {'hovers':>7s} {'wrong':>6s} {'guess':>6s} {'KLM s':>6s} {'+hover':>7s}   Phase 1: clicks keys wrong guesses")
    for n in names:
        s = summ.get(n, {})
        p = PHASE1.get(n)
        print(f"{n:5s} {str(s.get('success')):8s} {s.get('clicks', 0):7d} {s.get('keys', 0):5d} {s.get('hovers', 0):7d} {s.get('wrong_turns', 0):6d} {s.get('guesses', 0):6d} {s.get('klm_seconds', 0):6.1f} {s.get('klm_hover_seconds', 0):7.1f}   {p}")
