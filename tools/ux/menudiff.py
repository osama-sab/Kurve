"""Phase 3: the menu tree diff, checked.

    python tools/ux/menudiff.py

Reads today's menu bar (ux/inventory/crawl.json, from crawl.py) and the menu bar
the UX spec proposes (ux/spec/menus-after.txt), and gives every item of today's
menu bar a fate: kept where it is, kept and moved, renamed, merged into another
entry, hidden by default, or removed (only the items approved at STOP 2). Writes
ux/spec/MENU_DIFF.md. Exits 1 if any item has no fate, so nothing can be lost
from the menus by accident.
"""
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
crawl = json.loads((ROOT / "ux" / "inventory" / "crawl.json").read_text(encoding="utf-8"))
after_txt = (ROOT / "ux" / "spec" / "menus-after.txt").read_text(encoding="utf-8")

# ---- the proposed tree ----------------------------------------------------------
after = []  # (path tuple, label, note)
stack = []
for line in after_txt.split("\n"):
    if not line.strip() or line.lstrip().startswith("#"):
        continue
    depth = (len(line) - len(line.lstrip(" "))) // 2
    body, _, note = line.strip().partition("  ## ")
    body = re.sub(r"\s+\[[^\]]+\]$", "", body).strip()
    stack = stack[:depth]
    if body.startswith("("):
        # a list the app fills in: record each option under its parent
        for opt in re.split(r";\s*", re.sub(r"^\(heading:[^)]*\)\s*", "", body).strip("() ")):
            after.append((tuple(stack), opt.strip(), "option"))
        continue
    after.append((tuple(stack), body, note))
    stack.append(body)

norm = lambda s: re.sub(r"\s+", " ", s.replace("…", "").strip().lower())
after_by_label = collections.defaultdict(list)
for path, lab, note in after:
    after_by_label[norm(lab)].append((path, lab, note))

# ---- fates that are not "the same label somewhere in the new tree" --------------------
REMOVED = {
    "Examples › Raman: one band": "removed (R2, approved at STOP 2)",
    "Export › Processing steps as JSON": "removed (R3, approved at STOP 2)",
    "Export › All graphs as one figure": "removed (R6, approved at STOP 2)",
    "Style": "removed (R1, approved at STOP 2): the Graphite style goes",
}
# today's label (or path) -> (fate, new place)
FATE = {
    "Bring in from another project…": ("renamed", "File › Copy from another project…"),
    "Fluorescence decay": ("renamed", "File › Examples › Exponential decay (fluorescence)"),
    "Figure for a paper or slides…": ("renamed", "File › Export › Graph for a paper or slides…"),
    "Figure as SVG (vector, for papers)": ("renamed", "File › Export › Graph as SVG"),
    "Figure as PDF or EPS": ("merged", "its two items now sit in File › Export"),
    "PDF (vector, standard fonts)": ("renamed", "File › Export › Graph as PDF"),
    "EPS (vector, standard fonts)": ("renamed", "File › Export › Graph as EPS"),
    "Figure as PNG (image, for slides)": ("renamed", "File › Export › Graph as PNG"),
    "Copy the figure as a picture": ("merged", "Edit › Copy the graph as a picture"),
    "Final data and fit as CSV": ("renamed", "File › Export › Processed data and fit as CSV"),
    "Raw data as CSV, with its fingerprint": ("renamed", "File › Export › Original data as CSV"),
    "Report as HTML": ("renamed", "File › Export › Report…"),
    "Copy results table": ("moved", "Edit › Copy the results table (and Results' Copy table); no longer in Export"),
    "Rename project": ("renamed", "File › Rename the project…"),
    "Delete project…": ("renamed", "File › Delete the project…"),
    "Undo making a figure": ("kept", "Edit › Undo (what it undoes)"),
    "Redo": ("kept", "Edit › Redo"),
    "Add a Y column": ("merged", "Data › Add a column"),
    "Import data…@data": ("merged", "File › Import data… (and the toolbar, Ctrl+O): one menu route"),
    "Crop to the visible range": ("merged", "Data › Clean › Crop…, which opens on the range in view"),
    "Remove a region…": ("renamed", "Data › Clean › Leave out an X range…"),
    "Remove cosmic-ray spikes…": ("moved", "Spectroscopy › Remove cosmic-ray spikes…"),
    "Sort by X": ("renamed", "Data › Clean › Sort by X (as a step)"),
    "Restore all masked points": ("renamed", "Data › Masks › Restore every masked point"),
    "Spectra": ("renamed", "Data › Columns"),
    "New spectrum from the processed data": ("renamed", "Data › Columns › New column from the processed data"),
    "Copy with the same steps": ("renamed", "Data › Columns › Copy with the same processing"),
    "Give every spectrum these steps": ("renamed", "Data › Columns › Apply this processing to every column"),
    "Rename the spectrum…": ("renamed", "Data › Columns › Rename the column…"),
    "Raw data": ("renamed", "Data › Show on the graph › Original"),
    "Final data": ("renamed", "Data › Show on the graph › Processed"),
    "Final, with the raw data behind": ("renamed", "Data › Show on the graph › Both"),
    "Lock the raw data": ("renamed", "Data › Lock the original data"),
    "Sticks": ("renamed", "Drop lines (Plot › Plot type and Plot the selected columns)"),
    "Or select the columns to plot first": ("kept", "the list's heading"),
    "Open a graph@plot": ("merged", "Window › Graphs (one menu route, and the taskbar's Graphs button)"),
    "Open a graph@window": ("renamed", "Window › Graphs"),
    "Format": ("renamed", "Plot › Format a part (R4 kept, renamed)"),
    "Formats": ("renamed", "Plot › Saved styles"),
    "Save this format…": ("renamed", "Plot › Saved styles › Save this style…"),
    "Give every graph a format": ("renamed", "Plot › Saved styles › Give every graph a style"),
    "Several spectra": ("renamed", "Plot › Several curves"),
    "Double Y": ("renamed", "Plot › Several curves › Two Y axes"),
    "Box chart@layout": ("moved", "Plot › Plot the selected columns › Box chart, and Plot setup: a chart kind, not a layout"),
    "Violin plot@layout": ("moved", "Plot › Plot the selected columns › Violin plot, and Plot setup"),
    "Axis options": ("renamed", "Plot › Axes"),
    "Reverse X axis": ("renamed", "Plot › Axes › Reverse X"),
    "Logarithmic Y axis": ("merged", "Plot › Axes › Y scale › Logarithmic (log₁₀): it set the same thing"),
    "Second X axis in other units…": ("moved", "the X axis's right-click (A second X axis in other units…) and Plot › Format a part › Second X axis…"),
    "Second Y axis in other units…": ("moved", "Plot › Format a part › Second Y axis…"),
    "X axis scale": ("renamed", "Plot › Axes › X scale"),
    "Y axis scale": ("renamed", "Plot › Axes › Y scale"),
    "Break the X axis…": ("moved", "the X axis's right-click › Break the axis…"),
    "Break the Y axis…": ("moved", "the Y axis's right-click › Break the axis…"),
    "Residual panel": ("moved", "Analysis › Fit › Residuals under the graph"),
    "More fonts, and each element's own…": ("renamed", "Plot › Font › Text and fonts… (the page Plot › Format a part › Text and fonts… opens)"),
    "Axis titles in italics": ("hidden", "the Format dialog's Text and fonts page (it was there too)"),
    "Text in each spectrum's colour": ("renamed", "Plot › Legend › Text in each curve's colour"),
    "Legend title…": ("renamed", "Plot › Legend › Add a legend title…"),
    "Shade an X range (drag on the graph)": ("kept", "Plot › Annotate"),
    "Label peaks with the Label tool": ("renamed", "Plot › Annotate › Text (click the graph): the same tool"),
    "Find and mark peaks…": ("merged", "Spectroscopy › Find peaks…"),
    "Lines, labels and legend…": ("renamed", "Plot › Annotate › Labels and lines…"),
    "Fitted peak labels": ("moved", "a fitted peak label's right-click, and the Fit window's label chips"),
    "Overview…": ("moved", "Spectroscopy › Overview of the spectrum…"),
    "Overview of the spectrum": ("moved", "Spectroscopy › Overview of the spectrum…"),
    "Find peaks…": ("moved", "Spectroscopy › Find peaks…"),
    "Name the peaks from known lines…": ("moved", "Spectroscopy › Name the peaks from known lines…"),
    "Integrate bands…": ("renamed", "Analysis › Integrate… (one menu route; the Peaks window's Integrate them stays)"),
    "Curve fit": ("renamed", "Analysis › Fit › Curve fit…"),
    "Peak fit": ("renamed", "Analysis › Fit › Peak fit…"),
    "Fit every spectrum…": ("renamed", "Analysis › Fit › Fit every column… (hidden until there are two columns)"),
    "Subtract background…": ("moved", "Spectroscopy › Subtract background…"),
    "Spectroscopy": ("moved", "a menu of its own, Spectroscopy"),
    "Energy calibration…": ("moved", "Spectroscopy › X axis"),
    "Wavelength to Raman shift…": ("moved", "Spectroscopy › X axis"),
    "Convert X units…": ("moved", "Spectroscopy › X axis"),
    "Calibrate X on reference peaks…": ("moved", "Spectroscopy › X axis"),
    "Bose–Einstein correction…": ("moved", "Spectroscopy › Corrections"),
    "Transmittance to absorbance…": ("moved", "Spectroscopy › Corrections (Math's copy merged)"),
    "Kubelka–Munk…": ("moved", "Spectroscopy › Corrections (Math's copy merged)"),
    "Arithmetic": ("moved", "Analysis › Mathematics"),
    "Calculus": ("moved", "Analysis › Mathematics"),
    "Transforms": ("moved", "Analysis › Mathematics (Logarithm) and Spectroscopy › Corrections"),
    "Smooth and filter": ("moved", "Analysis › Smooth and filter"),
    "Python@math": ("moved", "Analysis › Python (under More until used)"),
    "Subtract or divide by another spectrum…": ("renamed", "Analysis › Mathematics › Subtract or divide by another column…"),
    "Average with other spectra…": ("renamed", "Analysis › Mathematics › Average with other columns…"),
    "Derivative, as a new spectrum…": ("merged", "Analysis › Mathematics › Derivative…, a choice in the tool"),
    "Python on this spectrum…": ("renamed", "Analysis › Python › Python on the active column…"),
    "A new spectrum with Python…": ("renamed", "Analysis › Python › A new column with Python…"),
    "Label the peaks with Python…": ("moved", "the Peaks window's With Python… (one route, beside what it labels)"),
    "Descriptive statistics": ("renamed", "Statistics › Descriptive statistics…"),
    "Integrate the visible range": ("merged", "Statistics › Descriptive statistics… (a section of the same window)"),
    "Noise and signal to noise": ("merged", "Statistics › Descriptive statistics… (a section of the same window)"),
    "Correlation between spectra": ("renamed", "Statistics › Correlation between columns…"),
    "Histogram of the values": ("renamed", "Statistics › Histogram… (takes the selected columns)"),
    "Panels": ("renamed", "Window › Tool windows"),
    "Close the panels": ("renamed", "Window › Close the tool windows"),
    "Tile the graphs": ("merged", "Window › Tile, which runs the same tiling"),
    "Link the X zoom": ("merged", "Window › Graphs › Link the X zoom of the graphs"),
    "Link the X zoom of the graphs@window": ("moved", "Window › Graphs › Link the X zoom of the graphs"),
    "Combine graphs…@window": ("merged", "Window › Graphs › Combine graphs…"),
    "Combine graphs…@plot": ("merged", "Window › Graphs › Combine graphs… (one menu route)"),
    "New graph@window": ("moved", "Plot › New graph"),
    "With every spectrum": ("renamed", "Plot › New graph › With every column"),
    "One for each spectrum": ("renamed", "Plot › New graph › One for each column"),
    "A figure, a panel for each spectrum": ("renamed", "Plot › New graph › A figure, a panel for each column"),
    "Bring in from another project…@window": ("merged", "File › Copy from another project…"),
    "Processing steps": ("renamed", "Help › About processing"),
}
# The Window menu's list of windows in use: whatever is open when it is read.
for w in ("Figure 1", "Worksheet", "History", "Fit", "Results"):
    FATE[w + "@window"] = ("kept", "Window › (the windows in use)")
# Lists the app fills in: (today's parent, label pattern) -> fate
LISTS = [
    (r"(Add to a graph|Open a graph)$", r"^Figure \d", ("kept", "the list of graphs")),
    (r"^New graph$", r"^With ", ("kept", "Plot › New graph › With (the active column)")),
    (r"^Formats$", r".", ("kept", "Plot › Saved styles (the list of styles)")),
    (r"Give every graph a format$", r".", ("kept", "Plot › Saved styles › Give every graph a style (the list)")),
    (r"^Font$", r".", ("kept", "Plot › Font (the list)")),
    (r"axis scale$", r".", ("kept", "Plot › Axes › X scale / Y scale (the list)")),
    (r"^Legend$", r".", ("kept", "Plot › Legend › Place (the list)")),
    (r"Fitted peak labels", r".", ("moved", "a fitted peak label's right-click and the Fit window")),
    (r"^Theme$", r".", ("kept", "Window › Theme")),
    (r"^Panels$", r".", ("kept", "Window › Tool windows (the list)")),
]

rows, missing = [], []
for key in ["file", "edit", "plot", "data", "math", "analysis", "statistics", "window", "help"]:
    items = [x for x in crawl["menus"]["menubar:" + key] if "label" in x]
    for it in items:
        path, lab = it["path"], it["label"]
        parent = " › ".join(path[:-1])
        full = " › ".join(path)
        fate = None
        for rk, why in REMOVED.items():
            if full == rk or full.startswith(rk + " › "):
                fate = ("removed", why)
        if not fate:
            for ctx in (lab + "@" + key, lab + "@" + ("layout" if parent == "Several spectra" else key)):
                if ctx in FATE:
                    fate = FATE[ctx]
        if not fate and lab in FATE:
            fate = FATE[lab]
        if not fate:
            for ppat, lpat, f in LISTS:
                if re.search(ppat, parent) and re.search(lpat, lab):
                    fate = f
                    break
        if not fate and norm(lab) in after_by_label:
            hits = after_by_label[norm(lab)]
            top = {"math": "Analysis"}.get(key, key.capitalize())
            same = [h for h in hits if h[0] and h[0][0] == top]
            where = (same or hits)[0]
            fate = ("kept" if same else "moved", " › ".join(where[0] + (where[1],)))
            if where[2] and where[2].startswith("↓"):
                fate = ("hidden", " › ".join(where[0] + (where[1],)) + " (" + where[2][2:] + ")")
        if not fate:
            missing.append(full)
            fate = ("?", "")
        rows.append((key.capitalize(), full, it.get("kbd"), fate))

count = collections.Counter(r[3][0] for r in rows)
md = ["# Menu tree diff",
      "",
      "Every item of today's menu bar (`ux/inventory/crawl.json`) and what becomes of it in the",
      "proposed menu bar (`ux/spec/menus-after.txt`, shown in full in `ux/UX_SPEC.md` §3.3). Written",
      "and checked by `tools/ux/menudiff.py`: an item with no fate fails the check.",
      "",
      f"**{len(rows)} items today:** " + ", ".join(f"{n} {k}" for k, n in count.most_common()) + ".",
      "",
      "*kept*: same place (a list the app fills in counts as its parent). *moved*: same name,",
      "another menu. *renamed*: a new name, perhaps a new place. *merged*: one entry now does it.",
      "*hidden*: shown only when it can apply, or reached from the Format dialog. *removed*:",
      "approved at STOP 2 (R1, R2, R3, R6). The R4 submenu and the R5 bar stay.",
      ""]
for menu in ["File", "Edit", "Plot", "Data", "Math", "Analysis", "Statistics", "Window", "Help"]:
    rs = [r for r in rows if r[0] == menu]
    md += [f"## {menu} ({len(rs)} items)", "", "| Today | Fate | Where it is now |", "|---|---|---|"]
    for _, full, kbd, (f, where) in rs:
        if f == "kept" and where.endswith(full.split(" › ")[-1]) and " › ".join(full.split(" › ")) in where:
            where_txt = "same place"
        else:
            where_txt = where
        md.append(f"| {full}{' [' + kbd + ']' if kbd else ''} | {f} | {where_txt} |")
    md.append("")
new_routes = [(p, l, n) for p, l, n in after if n.startswith("new route") or n.startswith("new menu")]
md += ["## New in the menu bar", "",
       "Not new features: existing commands given a menu route because a persona looked for them",
       "there (Edit's Copy and Paste, as in every program) or because the toolkit needed a home.", ""]
for p, l, n in new_routes:
    md.append(f"- {' › '.join(p + (l,))}: {n}")
(ROOT / "ux" / "spec" / "MENU_DIFF.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(f"{len(rows)} items; " + ", ".join(f"{k} {n}" for k, n in count.most_common()))
if missing:
    print("NO FATE:")
    for m in missing:
        print("  ", m)
    sys.exit(1)
