"""Phase 3: measure the screen as it is, for the UX spec.

    python tools/ux/measure.py [path/to/kurve.html] > ux/inventory/measure.json

Records, at 1280x720, 1366x768 and 1920x1080:
  - the windows a first launch opens and where (as rectangles), the bars'
    heights, and how many worksheet data rows can be seen;
  - the same after calibration.csv is imported and plotted.
Then, at 1366x768 with the IR example, opens every dialog and tool window one at
a time and records: its title, how many controls it shows, whether its body
scrolls in its default state, how much of the graph's plot area it covers, and
the labels of its button row, left to right.

Like crawl.py, this reads the app's internals on purpose: it measures, it does
not walk through as a user would.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drive import Rig  # noqa: E402

APP = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "kurve.html"
FIX = Path(__file__).resolve().parent / "fixtures"

LAYOUT = r"""() => {
  const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const vis = e => { if (!e || e.hidden) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden"; };
  const wins = [...document.querySelectorAll("section.win")].filter(vis).map(w => ({ id: w.id.replace(/^w-/, ""),
    title: ((w.querySelector(".win-t") || w).textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), rect: R(w), z: +getComputedStyle(w).zIndex || 0 }));
  const box = document.querySelector("#ws"); let rows = null, rowsTotal = null;
  if (box && vis(box)) { const bb = box.getBoundingClientRect(), th = box.querySelector("thead"), hb = th ? th.getBoundingClientRect().bottom : bb.top;
    const trs = [...box.querySelectorAll("tr.dr")]; rowsTotal = trs.length;
    rows = trs.filter(t => { const r = t.getBoundingClientRect(); return r.height > 0 && r.top >= hb - 1 && r.bottom <= bb.bottom + 1; }).length; }
  const plot = document.querySelector("#plot");
  return { vw: innerWidth, vh: innerHeight, menubar: R(document.querySelector(".menubar")), toolbar: R(document.querySelector(".toolbar")),
    desk: R(document.querySelector("#desk")), taskbar: R(document.querySelector("#taskbar")), status: R(document.querySelector(".statusbar")),
    explorer: vis(document.querySelector("#xpl")) ? R(document.querySelector("#xpl")) : null, wins, wsRowsVisible: rows, wsHead: box && box.querySelector("thead") ? Math.round(box.querySelector("thead").getBoundingClientRect().height) : null,
    plot: vis(plot) ? R(plot) : null };
}"""

# What is on the screen once a dialog or tool is open: the modal if one is open,
# else the window just brought to the front.
MEASURE = r"""(want) => {
  const vis = e => { if (!e || e.hidden) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).display !== "none"; };
  const modal = [...document.querySelectorAll(".modal")].find(vis);
  let el = modal ? modal.querySelector(".sheet") || modal : null, kind = "modal";
  if (!el) { kind = "window"; el = want ? document.getElementById("w-" + want) : null; }
  if (!el || !vis(el)) return { open: false };
  const body = kind === "modal" ? (el.querySelector(".body, #formBody, .pd-main, .imp-body") || el) : (el.querySelector(".win-b") || el);
  const scrollers = [body, ...body.querySelectorAll("*")].filter(e => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 60; });
  const inHead = e => !!e.closest(".win-h");
  const ctl = [...el.querySelectorAll("button, select, input, textarea, [role=tab], [role=radio], [role=switch]")].filter(e => vis(e) && !inHead(e) && e.type !== "hidden");
  const inView = ctl.filter(e => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
  const foot = el.querySelector(".sheet-f") || [...el.querySelectorAll(".sticky")].filter(vis).pop() || null;
  const btns = (foot ? [...foot.querySelectorAll("button")] : []).filter(vis).map(b => ((b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()) + (b.classList.contains("primary") ? " [primary]" : "")).filter(Boolean);
  const fr = foot ? foot.getBoundingClientRect() : null, align = !fr || !foot.querySelector("button") ? null : (() => { const bs = [...foot.querySelectorAll("button")].filter(vis); const l = Math.min(...bs.map(b => b.getBoundingClientRect().left)) - fr.left, rr = fr.right - Math.max(...bs.map(b => b.getBoundingClientRect().right)); return l < rr ? "left" : "right"; })();
  const pr = document.querySelector("#plot"), r = el.getBoundingClientRect();
  let cover = null; if (pr && vis(pr)) { const p = pr.getBoundingClientRect(); const ix = Math.max(0, Math.min(r.right, p.right) - Math.max(r.left, p.left)), iy = Math.max(0, Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top)); cover = Math.round(100 * ix * iy / (p.width * p.height)); }
  const title = ((el.querySelector("h2, .win-t, #formTitle, #dlgTitle, #pdHead, #expHead, #impTitle") || el).textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  return { open: true, kind, title, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], controls: ctl.length, controlsInView: inView.length,
    scrolls: scrollers.length > 0, scrollBy: scrollers.length ? Math.max(...scrollers.map(e => e.scrollHeight - e.clientHeight)) : 0, coverPlot: cover, buttons: btns, buttonsAlign: align };
}"""

CLOSE = r"""() => { try { document.querySelectorAll(".modal").forEach(m => { if (!m.hidden && m._cancel) m._cancel(); });
  if (typeof closePlotDetails === "function" && !document.querySelector("#plotModal").hidden) closePlotDetails(false);
  if (S.pending) cancelTool(); ["tool","fit","peaks","integ","over","res","batch","stats","py","disc","help","flow"].forEach(id => { try { if (winOpen(id)) closeWin(id); } catch (e) {} }); } catch (e) {} }"""

# label, the window to read (null for a modal), the code that opens it
OPENERS = [
    ("Import (calibration.csv)", None, "t => importText(t, 'calibration.csv')", "calibration.csv"),
    ("Import (raman_raw.txt)", None, "t => importText(t, 'raman_raw.txt')", "raman_raw.txt"),
    ("Plot setup", None, "() => { openPlotDlg(yCols().map(c => c.id)); }", None),
    ("Format dialog: curve", None, "() => openPlotDetails(activeYCol().id, 'series')", None),
    ("Format dialog: X axis", None, "() => openPlotDetails(null, 'ax:x')", None),
    ("Format dialog: text", None, "() => openPlotDetails(null, 'text')", None),
    ("Format dialog: legend", None, "() => openPlotDetails(null, 'legend')", None),
    ("Format dialog: labels", None, "() => openPlotDetails(null, 'labels')", None),
    ("Export for a paper", None, "() => openExportFigure()", None),
    ("Fill: series", None, "() => { openFillDlg('series'); }", None),
    ("Add a line", None, "() => { addLineDlg('v'); }", None),
    ("Break the X axis", None, "() => { breakDlg('x'); }", None),
    ("A figure of panels", None, "() => { newFigureDlg(); }", None),
    ("Combine graphs", None, "() => { combineDlg(); }", None),
    ("New fit function", None, "() => { showTab('fit'); S.fitMode = 'curve'; editUserFn(null); }", None),
    ("Fit window: curve", "fit", "() => { S.fitMode = 'curve'; showTab('fit'); renderPlot(); }", None),
    ("Fit window: peaks", "fit", "() => { S.fitMode = 'peaks'; showTab('fit'); renderPlot(); }", None),
    ("Peaks window", "peaks", "() => openPeakFinder()", None),
    ("Integrate window", "integ", "() => openIntegrate()", None),
    ("Overview", "over", "() => openOverview()", None),
    ("Results", "res", "() => openWin('res', {render: true})", None),
    ("Statistics", "stats", "() => openWin('stats', {render: true})", None),
    ("Batch", "batch", "() => openWin('batch', {render: true})", None),
    ("Python", "py", "() => openWin('py', {render: true})", None),
    ("History", "flow", "() => openWin('flow', {render: true})", None),
    ("Discussion", "disc", "() => openWin('disc', {render: true})", None),
    ("Help", "help", "() => openHelp()", None),
] + [(f"Tool: {op}", "tool", f"() => openTool('{op}')", None) for op in
     ["crop", "exclude", "despike", "resample", "bg", "smooth", "fft", "scale", "xlin", "norm", "deriv", "cumint",
      "hist", "log", "absorb", "km", "ecal", "shift", "xunit", "calib", "bose", "python"]]


def layout_runs(width, height):
    out = {}
    with Rig(run=f"p3-layout-{width}", app=APP, out=Path("/tmp") / "kurve-measure", width=width, height=height) as r:
        r.wait_quiet(1500)
        out["first launch"] = r.page.evaluate(LAYOUT)
        txt = (FIX / "calibration.csv").read_text()
        r.page.evaluate("t => importText(t, 'calibration.csv')", txt)
        r.wait_quiet(800)
        # The import dialog's own button, as a person would press it.
        r.page.evaluate("() => { const b = [...document.querySelectorAll('#impModal button')].find(b => /^Import/.test(b.textContent.trim())); if (b) b.click(); }")
        r.wait_quiet(1200)
        out["after import"] = r.page.evaluate(LAYOUT)
        r.page.evaluate("() => { plotCols(yCols().map(c => c.id)); }")
        r.wait_quiet(1200)
        out["after import and Plot"] = r.page.evaluate(LAYOUT)
        r.page.evaluate("() => { loadExample('ir'); }")
        r.wait_quiet(1500)
        out["IR example"] = r.page.evaluate(LAYOUT)
        out["errors"] = r.errors
    return out


def dialogs():
    res = []
    with Rig(run="p3-dialogs", app=APP, out=Path("/tmp") / "kurve-measure", width=1366, height=768) as r:
        r.wait_quiet(1500)
        r.page.evaluate("() => { loadExample('ir'); }")
        r.wait_quiet(1500)
        for label, win, code, fix in OPENERS:
            try:
                if fix:
                    r.page.evaluate(code, (FIX / fix).read_text())
                else:
                    r.page.evaluate(code)
                r.wait_quiet(700)
                m = r.page.evaluate(MEASURE, win)
            except Exception as e:  # noqa: BLE001 - a tool that cannot open in this state
                m = {"open": False, "error": str(e)[:200]}
            m["label"] = label
            res.append(m)
            r.page.evaluate(CLOSE)
            r.page.keyboard.press("Escape")
            r.wait_quiet(300)
        errs = r.errors
    return res, errs


if __name__ == "__main__":
    lay = {f"{w}x{h}": layout_runs(w, h) for w, h in [(1280, 720), (1366, 768), (1920, 1080)]}
    dl, errs = dialogs()
    print(json.dumps({"layout": lay, "dialogs": dl, "errors": errs}, ensure_ascii=False, indent=1))
