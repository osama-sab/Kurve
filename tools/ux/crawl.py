"""Phase 2: record every menu, context menu, toolbar button, window control and
dialog Kurve has, as data, for the feature inventory.

    python tools/ux/crawl.py [path/to/kurve.html] > ux/inventory/crawl.json

Unlike drive.py this reads the app's internals on purpose: it sets up a project
rich enough for every menu to show its full contents (a peak fit, a peak set, a
band, annotations of each kind, a second graph, a figure), then calls each menu
builder and walks the item trees it returns, submenus included, recording each
item's label, shortcut, state and the code it runs (so two places that run the
same thing can be recognised as one feature). Window controls are read from the
page after each window is opened.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drive import Rig  # noqa: E402

APP = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "kurve.html"

SETUP = r"""async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const log = [];
  const tryit = async (name, fn) => { try { await fn(); log.push("ok " + name); } catch (e) { log.push("FAIL " + name + ": " + e); } await wait(150); };
  await tryit("example", () => loadExample("ir"));
  await wait(800);
  await tryit("peak fit", () => { showTab("fit"); S.fitMode = "peaks"; renderFit(); runPeakFinder(); runPeakFit(); });
  await wait(400);
  await tryit("peak set", () => findPeaksInto({}));
  const d = derived(); const X = d.x, Y = d.y, mid = X[Math.floor(X.length / 2)], q = X[Math.floor(X.length / 4)];
  await tryit("band", () => addBand(Math.min(q, mid), Math.max(q, mid)));
  await tryit("text", () => addAnno({ t: "text", x: mid, y: Math.max(...Y) * 0.8, text: "a note" }));
  await tryit("vline", () => addAnno({ t: "v", x: q }));
  await tryit("arrow", () => addAnno({ t: "arrow", x: q, y: Math.max(...Y) * 0.5, x2: mid, y2: Math.max(...Y) * 0.6 }));
  await tryit("rect", () => addAnno({ t: "rect", x: q, y: 0, x2: mid, y2: Math.max(...Y) * 0.3 }));
  await tryit("second graph", () => newGraphFrom([activeYCol().id]));
  await wait(400);
  await tryit("a step", () => addPipeStep("smooth"));
  await tryit("a folder", () => { const t = treeOf(); t.folders.push({ id: "dcrawl", name: "Folder A", parent: null }); saveTree(t, null, { noUndo: true }); });
  await wait(300);
  await tryit("figure", () => makeFigure(graphIds().slice(0, 2), {}));
  await wait(400);
  return log;
}"""

CRAWL = r"""() => {
  const out = {};
  const fnSrc = f => f ? String(f).replace(/\s+/g, " ").slice(0, 220) : null;
  const walk = (items, path, depth) => {
    const res = [];
    (items || []).filter(Boolean).forEach(it => {
      if (it === "-") return;
      if (it.group) { res.push({ path, group: it.group }); return; }
      if (it.swatches) { res.push({ path: path.concat("[colour swatches]"), label: "[colour swatches]", run: fnSrc(it.pick) }); return; }
      const rec = { path: path.concat(it.label), label: it.label, kbd: it.kbd || null, note: it.note || null, title: it.title || null,
        enabled: it.enabled !== false, checked: it.checked == null ? null : !!it.checked, radio: !!it.radio, danger: !!it.danger, run: fnSrc(it.run) };
      res.push(rec);
      if (it.sub && depth < 6) { let s = []; try { s = subItems(it) || []; } catch (e) { rec.subErr = String(e); }
        rec.sub = true; res.push(...walk(s, rec.path, depth + 1)); }
    });
    return res;
  };
  const grab = (name, fn) => { try { out[name] = walk(fn(), [], 0); } catch (e) { out[name] = [{ error: String(e) }]; } };
  // Menu bar (the graph window's own bar opens the same lists by name).
  [...document.querySelectorAll(".menubar .mb")].map(b => b.dataset.menu).forEach(m => grab("menubar:" + m, () => menuItems(m)));
  const act = activeYCol(), gid = GID(), cfg = plotCfg();
  // Graph right-click: on empty plot, on a spectrum, on the fit curve, with a point under the pointer.
  const pt = S.geo ? toData(300, 200) : null; if (pt) pt.inside = true;
  grab("graph:empty", () => graphMenuItems(null, { px: 300, py: 200, pt }));
  grab("graph:spectrum", () => graphMenuItems(act.id, { px: 300, py: 200, pt }));
  grab("graph:fit curve", () => graphMenuItems("__fit", { px: 300, py: 200, pt }));
  ["x", "y", "y2", "x2", "yo"].forEach(k => grab("axis:" + k, () => axisMenuItems(k)));
  ["x", "y", "title"].forEach(k => grab("title:" + k, () => titleMenuItems(k)));
  grab("legend:box", () => legendMenuItems("box")); grab("legend:title", () => legendMenuItems("title")); grab("legend:entry", () => legendMenuItems("leg:" + act.id));
  const annos = (P().plot.annos || []);
  const seenT = new Set(); annos.forEach(a => { const t = a.grp ? "peak label" : a.t; if (seenT.has(t)) return; seenT.add(t); grab("annotation:" + t, () => annoMenuItems(a.id)); });
  grab("fitted peak label", () => fplMenuItems(0));
  grab("graph window ⋯", () => graphWinItems(gid));
  try { const fid = graphIds().find(g => isFigId(g)); if (fid) { grab("figure ⋯", () => figMenuItems(fid)); grab("figure panel", () => figPanelItems(graphOf(fid).fig.cells[0].gid)); } } catch (e) { out["figure"] = [{ error: String(e) }]; }
  grab("graph grip (combine)", () => combineMenuItems(gid));
  grab("taskbar: graphs", () => graphsMenuItems());
  grab("taskbar/toolbar: projects", () => projectItems());
  grab("toolbar: export", () => exportItems());
  grab("new graph", () => newGraphItems());
  grab("plot (worksheet bar)", () => plotItems(yCols().map(c => c.id)));
  grab("worksheet: fill", () => fillMenuItems());
  grab("worksheet: column move", () => colMoveItems(act.id));
  grab("worksheet: column align", () => colAlignItems(act.id));
  grab("formats", () => formatMenuItems(() => {}, () => GP()));
  grab("font", () => fontMenuItems());
  grab("map (heat layout)", () => mapMenuItems());
  grab("box/violin", () => distMenuItems());
  grab("window: panels", () => panelItems());
  grab("History: + insert a step", () => toolMenuItems({ col: act.id }));
  const st = (act.pipe || [])[0]; if (st) grab("History: step box", () => stepMenuItems(st));
  ["raw", "final"].forEach(k => grab("History: " + k + " box", () => specItems(act, k + ":" + act.id)));
  grab("History: spectrum ⋯", () => specItems(act));
  try { grab("Peak fit: tie menu", () => tieMenuItems(0, "xc")); } catch (e) {}
  // Explorer rows: one of each kind (files and figures opened so their children are listed).
  try { const ex = xExp(); xRows().forEach(r => { if (r.exp) ex[r.key] = true; }); S.xplRows = xRows();
    const kinds = {}; S.xplRows.forEach(r => { const k = (r.kind || (r.key || "").split(":")[0]) + (r.panel ? " (figure panel)" : (r.panels ? " (figure)" : "")); if (!kinds[k]) kinds[k] = r; });
    Object.entries(kinds).forEach(([k, r]) => grab("Explorer: " + k, () => xMenu(r))); } catch (e) { out["Explorer"] = [{ error: String(e) }]; }
  // Menus built inside their openers: capture what they hand to openMenu.
  const orig = window.openMenu; const caught = [];
  window.openMenu = function (trigger, items, opt) { caught.push({ label: ((opt && opt.label) || "") + " #" + caught.length, items: walk(items, [], 0) }); };
  try { wsCellMenu({ clientX: 500, clientY: 400, preventDefault() {} }, 0, 1); } catch (e) { caught.push({ label: "cell menu error", items: [{ error: String(e) }] }); }
  try { wsCellMenu({ clientX: 500, clientY: 400, preventDefault() {} }, -4, 1); } catch (e) {}
  try { const b = document.createElement("button"); document.body.appendChild(b); openColMenu(act.id, b); openColMenu(xCol().id, b); b.remove(); } catch (e) { caught.push({ label: "col menu error", items: [{ error: String(e) }] }); }
  try { shapeMenu(document.body); } catch (e) {}
  window.openMenu = orig;
  caught.forEach((c, i) => { out["captured:" + (c.label || i)] = c.items; });
  out.__plotTypes = PLOT_TYPES; out.__layouts = LAYOUTS; out.__legends = LEGENDS;
  return out;
}"""

CONTROLS = r"""(id) => {
  const el = document.getElementById("w-" + id); if (!el) return null;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest("[hidden]"); };
  const txt = e => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " ").trim();
  const ctl = [...el.querySelectorAll("button, select, input, textarea, [role=tab], [role=switch]")].filter(vis).map(e => ({
    tag: e.tagName.toLowerCase(), type: e.type || null, text: txt(e).slice(0, 80), title: e.getAttribute("title"), id: e.id || null,
    act: e.dataset.act || null, labelFor: e.id && el.querySelector(`label[for="${e.id}"]`) ? el.querySelector(`label[for="${e.id}"]`).textContent.trim() : (e.closest("label") ? e.closest("label").textContent.replace(/\s+/g, " ").trim().slice(0, 80) : null) }));
  const heads = [...el.querySelectorAll("h2,h3,h4,.gh,.sect,legend,summary")].filter(vis).map(txt).filter(Boolean);
  return { title: txt(el.querySelector(".win-h") || el).slice(0, 120), heads, controls: ctl };
}"""

TOOLBAR = r"""() => {
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const pick = sel => [...document.querySelectorAll(sel)].filter(vis).map(e => ({ tag: e.tagName.toLowerCase(), id: e.id || null,
    text: (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60), aria: e.getAttribute("aria-label"), title: e.getAttribute("title"),
    options: e.tagName === "SELECT" ? [...e.options].map(o => o.textContent.trim()) : null }));
  return { menubar: pick("header .mb, .mb"), toolbar: pick("#toolbar button, #toolbar select, .toolbar button, .toolbar select"),
    statusbar: pick("#status *[title], .status button"), taskbar: pick("#taskbar button"), explorer: pick("#xpl .xh button, #xpl > div button") };
}"""

EXTRA = r"""() => {
  const keys = (DOCS.find(d => d.id === "keys") || {});
  return { keysDoc: (keys.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), wins: Object.keys(WINS), docs: DOCS.map(d => [d.id, d.g, d.t]) };
}"""

with Rig(run="p2-crawl", app=APP, out=Path("/tmp") / "kurve-crawl", width=1366, height=768) as r:
    page = r.page
    r.wait_quiet(1200)
    setup = page.evaluate(SETUP)
    r.wait_quiet(800)
    menus = page.evaluate(CRAWL)
    toolbar = page.evaluate(TOOLBAR)
    extra = page.evaluate(EXTRA)
    wins = {}
    for wid in extra["wins"]:
        try:
            page.evaluate("id => { try { openWin(id, {render: true}); focusWin(id); } catch (e) {} }", wid)
            page.wait_for_timeout(350)
            wins[wid] = page.evaluate(CONTROLS, wid)
        except Exception as e:  # a window that cannot open in this state
            wins[wid] = {"error": str(e)}
    print(json.dumps({"setup": setup, "menus": menus, "chrome": toolbar, "windows": wins, "extra": extra,
                      "errors": r.errors}, ensure_ascii=False, indent=1))
