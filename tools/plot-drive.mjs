/* Plot setup as Origin's (ux/spec/PLOT_SPEC.md): what each slice added to the graph and to Plot
   setup, clicked and checked in a real browser.
   Needs Playwright with Chromium. Usage:
     node tools/plot-drive.mjs [path/to/kurve.html]
   Set PLAYWRIGHT=/path/to/playwright/index.mjs if `playwright` is not
   installed where node can find it. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
// Served over HTTP, as odd-test does: file:// storage is unreliable in Chromium.
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 400))); }
};

const browser = await chromium.launch();
const ready = async (p) => { await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(150); };
async function page(fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.vw || { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p);
  await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  const T = opt.timeout || 60000;
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), T))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
// A project of three curves on one X (B small, C large and on its own scale) and a column of labels, all on one graph.
const three = async p => {
  await p.evaluate(async () => {
    const n = 60, x = [], b = [], c = [], d = [], lab = [];
    for (let i = 0; i < n; i++) { x.push(i * 0.5); b.push(Math.sin(i / 6)); c.push(500 + 200 * Math.cos(i / 9)); d.push(0.5 * Math.sin(i / 4)); lab.push(100 + i); }
    const X = makeCol("x", "Time", "s", x), B = Object.assign(makeCol("y", "Small", "", b), { pipe: [], mask: [] }), C = Object.assign(makeCol("y", "Large", "", c), { pipe: [], mask: [] }),
      D = Object.assign(makeCol("y", "Third", "", d), { pipe: [], mask: [] }), E = makeCol("ignore", "Sample", "", lab);
    const pr = Object.assign(blankProject("Three curves"), { cols: [X, B, C, D, E], activeY: B.id });
    pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [B.id, C.id, D.id], plot: { style: "auto" } }];
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
  });
  await p.waitForTimeout(400);
  return p.evaluate(() => { const ys = yCols(); return { B: ys[0].id, C: ys[1].id, D: ys[2].id, E: P().cols[4].id }; });
};

console.log("Slice 1: what each curve of a graph uses");
await page(async p => {
  const id = await three(p);
  // The right axis for one curve of an overlay.
  let r = await p.evaluate(id => { const items = graphMenuItems(id.C), ra = items.find(i => i && i.label === "Right axis"), rg = items.find(i => i && i.label === "Range…"), lb = items.find(i => i && i.label === "Labels from"); return { ra: ra && [ra.enabled, !!ra.checked], rg: !!rg, lb: !!lb, act: (graphMenuItems(id.B).find(i => i && i.label === "Right axis") || {}).enabled }; }, id);
  check("a curve's right-click has Range…, Right axis and Labels from; the active curve stays on the left", r.ra && r.ra[0] && !r.ra[1] && r.rg && r.lb && r.act === false, JSON.stringify(r));
  await p.evaluate(id => { graphMenuItems(id.C).find(i => i && i.label === "Right axis").run(); }, id); await p.waitForTimeout(200);
  r = await p.evaluate(id => { const svg = $("#plot").innerHTML, g = S.geo, leg = [...document.querySelectorAll("#plot text")].map(t => t.textContent);
    return { use: curveUse(id.C).ax, right: hasRight(plotCfg()), y1: g.v.y1, leg: leg.filter(t => /\((left|right)\)/.test(t)), nav: (() => { openPlotDetails(null, "ax:y"); const s = $("#fmtSel"); const o = s ? [...s.options].map(o => o.textContent) : []; closePlotDetails(); return o; })() }; }, id);
  check("Right axis: the large curve on its own axis, the left axis fitted to the small ones", r.use === "r" && r.right && r.y1 < 5, JSON.stringify(r));
  check("the legend says left and right, and the Format pane has a Right Y axis page", r.leg.some(t => /Large.*\(right\)/.test(t)) && r.leg.some(t => /Third.*\(left\)/.test(t)) && r.nav.includes("Right Y axis") && r.nav.includes("Left Y axis"), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(200);
  check("one undo puts it back on the left", await p.evaluate(id => curveUse(id.C).ax === null && !hasRight(plotCfg()) && S.geo.v.y1 > 600, id));
  // A range of rows, and of X, drawn; the data untouched; the axes fitted to it.
  await p.evaluate(id => { curveRangeDlg(id.B); }, id); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ open: !$("#formModal").hidden, x: !$("#rgByX").disabled, row: !$("#rgByR").disabled, every: !!$("#rgEvery") }));
  check("Range… offers rows, and X since it rises steadily, for this curve or every one", r.open && r.x && r.row && r.every, JSON.stringify(r));
  await p.check("#rgByR"); await p.fill("#rgR0", "11"); await p.fill("#rgR1", "20"); await p.dispatchEvent("#rgR1", "input"); await p.click("#formOk"); await p.waitForTimeout(300);
  r = await p.evaluate(id => { const shown = S.shownPts, all = pointsAll(); return { n: shown.length, i0: shown[0].i, i1: shown[shown.length - 1].i, all: all.length, rng: curveUse(id.B).rng, log: (P().log || []).slice(-1)[0].text, fitPts: fitPoints().length, menu: (graphMenuItems(id.B).find(i => i && i.label === "Range…") || {}).note }; }, id);
  check("rows 11 to 20: the graph draws those ten; the data, the fit's points and the log as they should be", r.n === 10 && r.i0 === 10 && r.i1 === 19 && r.all === 60 && r.fitPts === 60 && /drew rows 11 to 20 of Small/.test(r.log) && r.menu === "rows 11 to 20", JSON.stringify(r));
  await p.evaluate(id => { curveRangeDlg(id.B); }, id); await p.waitForTimeout(200);
  await p.check("#rgByX"); await p.fill("#rgX0", "5"); await p.fill("#rgX1", "10"); await p.check("#rgEvery"); await p.dispatchEvent("#rgX1", "input"); await p.click("#formOk"); await p.waitForTimeout(300);
  r = await p.evaluate(id => { const v = S.geo.v, xs = S.shownPts.map(q => q.x); return { b: curveUse(id.B).rng, c: curveUse(id.C).rng, x0: Math.min(...xs), x1: Math.max(...xs), v0: v.x0, v1: v.x1 }; }, id);
  check("X from 5 to 10 for every curve: drawn there, and the axes fitted to it", r.b.by === "x" && r.c && r.c.by === "x" && r.x0 >= 5 && r.x1 <= 10 && r.v0 > 3 && r.v1 < 12, JSON.stringify(r));
  // Labels from a column, beside each point drawn, in the labels' style.
  await p.evaluate(id => { const it = graphMenuItems(id.B).find(i => i && i.label === "Labels from"); it.sub().find(s => /Column E/.test(s.label)).run(); }, id); await p.waitForTimeout(200);
  r = await p.evaluate(id => { const g = document.querySelector(`#plot g[data-plab="${id.B}"]`); return g ? [...g.querySelectorAll("text")].map(t => t.textContent) : null; }, id);
  check("labels from column E beside the points drawn, its values in their rows", r && r.length === 11 && r[0] === "110" && r[10] === "120", JSON.stringify(r));
  // An export draws the same, and a new graph starts without them.
  r = await p.evaluate(id => { const svg = buildPlot(800, 500, EXPORT_PAL, true); return { lab: /data-plab/.test(svg), base: Object.prototype.hasOwnProperty.call(plotBase(GP()), "use") }; }, id);
  check("an export draws the range and the labels; a new graph's look leaves them out", r.lab && !r.base, JSON.stringify(r));
  // Junk from storage: dropped, never drawn as nonsense.
  r = await p.evaluate(id => { const p = P(), g = p.graphs[0]; g.plot.use = { [id.B]: { rng: { by: "row", a: "x", b: 3 }, ax: "up", lab: "gone" }, [id.C]: { rng: { by: "x", a: 1, b: 2 } }, nope: { ax: "r" } }; normalize(p); return JSON.stringify(p.graphs[0].plot.use); }, id);
  check("a range, an axis or a label column that does not read is dropped by normalize", r === JSON.stringify({ [id.C]: { rng: { by: "x", a: 1, b: 2 } } }), r);
}, { name: "curves' ranges, axes and labels" });

// Six columns on Sheet 1 (A Time, B Small, C Spread as data, D Large, E Third, F Sample as data) and two on a sheet called Run 2.
const six = async p => {
  await p.evaluate(async () => {
    const n = 60, x = [], b = [], sp = [], c = [], d = [], lab = [], x2 = [], y2 = [];
    for (let i = 0; i < n; i++) { x.push(i * 0.5); b.push(Math.sin(i / 6)); sp.push(0.05 + 0.001 * i); c.push(500 + 200 * Math.cos(i / 9)); d.push(0.5 * Math.sin(i / 4)); lab.push(100 + i); }
    for (let i = 0; i < 20; i++) { x2.push(i); y2.push(i * i); }
    const Y = (nm, v) => Object.assign(makeCol("y", nm, "", v), { pipe: [], mask: [] });
    const A = makeCol("x", "Time", "s", x), B = Y("Small", b), C = makeCol("ignore", "Spread", "", sp), D = Y("Large", c), E = Y("Third", d), F = makeCol("ignore", "Sample", "", lab);
    const G = Object.assign(makeCol("x", "Step", "", x2), { sheet: "run2" }), H = Object.assign(Y("Squares", y2), { sheet: "run2" });
    const pr = Object.assign(blankProject("Six columns"), { cols: [A, B, C, D, E, F, G, H], activeY: B.id, sheets: [{ id: "s1", name: "Sheet 1" }, { id: "run2", name: "Run 2" }] });
    [A, B, C, D, E, F].forEach(q => { q.sheet = "s1"; });
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
  });
  await p.waitForTimeout(400);
  return p.evaluate(() => { const by = nm => P().cols.find(c => c.name === nm).id; return { A: by("Time"), B: by("Small"), C: by("Spread"), D: by("Large"), E: by("Third"), F: by("Sample"), G: by("Step"), H: by("Squares") }; });
};
// What the dialog shows: its curves (name, against, with), what is enabled, and the preview.
const psu = p => p.evaluate(() => ({
  curves: [...document.querySelectorAll("#psuCur [data-pcur]")].map(t => ({ id: t.dataset.pcur, against: (t.querySelector("[data-cx]") || {}).value, with: t.children[2].textContent, sel: t.getAttribute("aria-selected") === "true" })),
  add: !$("#psuAdd").disabled, rep: !$("#psuRep").disabled, del: !$("#psuDel").disabled, up: !$("#psuUp").disabled, dn: !$("#psuDn").disabled, ok: !$("#formOk").disabled,
  pv: $("#pdlgSk").innerHTML, ids: [...$("#pdlgSk").querySelectorAll("[id]")].map(e => e.id) }));
const use = (p, id, v) => p.selectOption(`#psuCols [data-puse="${id}"]`, v);

console.log("Slice 2: Plot setup, rebuilt");
await page(async p => {
  const id = await six(p);
  // Opened on two columns: a curve each, against their X, with nothing waiting to be added.
  await p.evaluate(id => { openPlotDlg([id.B, id.D]); }, id); await p.waitForTimeout(400);
  let r = await psu(p);
  check("opened on B and D: two curves against A, nothing to add or replace, Up off for the first", r.curves.map(q => q.id).join() === [id.B, id.D].join() && r.curves.every(q => q.against === id.A) && !r.add && !r.rep && r.del && !r.up && r.dn && r.ok, JSON.stringify(Object.assign({}, r, { pv: r.pv.length })));
  check("the preview is the graph drawn as it will be, its ids its own", /<svg/.test(r.pv) && /data-ser/.test(r.pv) && r.ids.length && r.ids.every(i => i.startsWith("psu-")), r.ids.slice(0, 4).join());
  r = await p.evaluate(id => { const opts = s => [...document.querySelector(`#psuCols [data-puse="${s}"]`).options].filter(o => o.disabled).map(o => o.value); return { b: opts(id.B), c: opts(id.C), a: opts(id.A) }; }, id);
  check("a Y column cannot be made error bars or an X here, an X not a Y; a data column can be anything", r.b.includes("e:y") && r.b.includes("x") && r.a.includes("y") && !r.c.length, JSON.stringify(r));
  // Error bars and labels from columns: Add lights up, and the curves take them.
  await use(p, id.C, "e:y"); await p.waitForTimeout(120);
  r = await psu(p);
  check("C marked as Y error ±: Add offered", r.add && !r.curves[0].with.includes("yEr"), JSON.stringify(r.curves));
  await p.click("#psuAdd"); await p.waitForTimeout(200);
  await use(p, id.F, "lab"); await p.click("#psuAdd"); await p.waitForTimeout(200);
  r = await psu(p);
  check("Add: B with its error bars from C, D with labels from F (the nearest Y to its left)", /yEr± C/.test(r.curves[0].with) && /labels F/.test(r.curves[1].with) && !r.add && /data-plab/.test(r.pv), JSON.stringify(r.curves));
  // Order, range and axis of a curve.
  await p.click(`#psuCur [data-pcur="${id.D}"] td`); await p.click("#psuUp"); await p.waitForTimeout(150);
  r = await psu(p);
  check("Up: D first, still selected", r.curves[0].id === id.D && r.curves[0].sel && !r.up && r.dn, JSON.stringify(r.curves));
  await p.click("#psuDn"); await p.waitForTimeout(150);
  await p.selectOption(`#psuCur [data-crng="${id.D}"]`, "row"); await p.waitForTimeout(150);
  r = await p.evaluate(id => ({ a: $(`#psuCur [data-cra="${id.D}"]`).value, b: $(`#psuCur [data-crb="${id.D}"]`).value }), id);
  check("Range by rows starts at every row", r.a === "1" && r.b === "60", JSON.stringify(r));
  await p.fill(`#psuCur [data-cra="${id.D}"]`, "11"); await p.press(`#psuCur [data-cra="${id.D}"]`, "Enter");
  await p.fill(`#psuCur [data-crb="${id.D}"]`, "20"); await p.press(`#psuCur [data-crb="${id.D}"]`, "Enter"); await p.waitForTimeout(150);
  await p.selectOption(`#psuCur [data-cax="${id.D}"]`, "r"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ open: !$("#formModal").hidden, ax: (document.querySelector("#psuCur [data-cax]") || {}).disabled }));
  check("Enter in a range field enters it and keeps the dialog open; the first curve's axis stays left", r.open && r.ax, JSON.stringify(r));
  // Remove, and Add puts it back; Replace with a ticked column.
  await p.click(`#psuCur [data-pcur="${id.B}"] td`); await p.click("#psuDel"); await p.waitForTimeout(150);
  r = await psu(p);
  check("Remove takes B off; Add offers it again, its marks kept", r.curves.length === 1 && r.curves[0].id === id.D && r.add, JSON.stringify(r.curves));
  await p.click("#psuAdd"); await p.waitForTimeout(150);
  await p.check(`#psuCols [data-ptick="${id.E}"]`); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ mark: !$("#psuMark").hidden, n: $("#psuMarkN").textContent }));
  await p.selectOption("#psuMarkAs", "y"); await p.waitForTimeout(150);
  await p.click(`#psuCur [data-pcur="${id.B}"] td`); await p.waitForTimeout(100);
  const r2 = await psu(p);
  check("a ticked column marked from the bar; Replace offered for the selected curve", r.mark && r.n === "1 ticked" && r2.rep && r2.add, JSON.stringify([r, r2.rep, r2.add]));
  await p.click("#psuRep"); await p.waitForTimeout(150);
  r = await psu(p);
  check("Replace: B gives way to E, in its place", r.curves.map(q => q.id).join() === [id.D, id.E].join() && r.curves[1].sel, JSON.stringify(r.curves));
  // Every sheet, and the filter.
  await p.selectOption("#psuSheet", "all"); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ sh: [...document.querySelectorAll("#psuCols .psu-sh th")].map(t => t.textContent), n: document.querySelectorAll("#psuCols [data-pc]").length }));
  await p.fill("#psuQ", "squ"); await p.waitForTimeout(150);
  const r3 = await p.evaluate(() => [...document.querySelectorAll("#psuCols [data-pc]")].map(t => t.querySelector(".psu-nm").textContent));
  check("Every sheet lists both sheets' columns; the filter narrows them", JSON.stringify(r.sh) === JSON.stringify(["Sheet 1", "Run 2"]) && r.n === 8 && r3.length === 1 && /Squares/.test(r3[0]), JSON.stringify([r, r3]));
  await p.fill("#psuQ", ""); await p.waitForTimeout(100);
  // Cancel changes nothing.
  const before = await p.evaluate(() => JSON.stringify([P().cols.map(c => [c.role, c.of || "", c.xcol || ""]), P().graphs.length, undoStack.length]));
  await p.click("#formCancel"); await p.waitForTimeout(200);
  check("Cancel leaves the columns, the graphs and the undo list as they were", await p.evaluate(b => JSON.stringify([P().cols.map(c => [c.role, c.of || "", c.xcol || ""]), P().graphs.length, undoStack.length]) === b, before));
  check("…though the columns were as they started: C still data", await p.evaluate(id => colById(id.C).role === "ignore" && !document.querySelector("#formModal .sheet").classList.contains("psuw"), id));
  // OK: the graph, what each curve uses, and the columns' own changes, in one undo entry.
  await p.evaluate(id => { openPlotDlg([id.B, id.D]); }, id); await p.waitForTimeout(400);
  await use(p, id.C, "e:y+"); await use(p, id.F, "lab"); await p.click("#psuAdd"); await p.waitForTimeout(150);
  await p.selectOption(`#psuCur [data-crng="${id.D}"]`, "row"); await p.fill(`#psuCur [data-cra="${id.D}"]`, "11"); await p.press(`#psuCur [data-cra="${id.D}"]`, "Enter");
  await p.fill(`#psuCur [data-crb="${id.D}"]`, "20"); await p.press(`#psuCur [data-crb="${id.D}"]`, "Enter");
  await p.selectOption(`#psuCur [data-cax="${id.D}"]`, "r"); await p.click('#formBody [data-pk="scatter"]'); await p.waitForTimeout(150);
  const u0 = await p.evaluate(() => undoStack.length);
  await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1], c = colById(id.C), t = [...document.querySelectorAll("#toast, .toast")].map(e => e.textContent).join(" ");
    return { n: P().graphs.length, cols: g.cols, use: g.plot.use, type: (g.plot.series[id.B] || {}).type, c: [c.role, c.of === id.B, errKind(c)], undo: undoStack.length, toast: t, log: (P().log || []).slice(-1)[0].text, shown: S.shownPts.length }; }, id);
  check("Plot: a new graph of B and D, as symbols, D on the right drawing rows 11 to 20 with labels from F", r.n === 1 && r.cols.join() === [id.B, id.D].join() && r.type === "scatter" && r.use[id.D] && r.use[id.D].ax === "r" && r.use[id.D].lab === id.F && r.use[id.D].rng.a === 11 && r.use[id.D].rng.b === 20, JSON.stringify(r));
  check("C is B's upward Y error bars now, said in the toast and the log, in one undo entry", r.c[0] === "e" && r.c[1] && r.c[2] === "y+" && /Column Sheet 1!C is the upward Y error bars of Sheet 1!B, on every graph/.test(r.toast) && /upward Y error bars of Sheet 1!B/.test(r.log) && r.undo === u0 + 1, JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo takes the graph and the columns' changes back", await p.evaluate(id => P().graphs.length === 0 && colById(id.C).role === "ignore", id));
  // The row number as X, and a data column made X keeping the others' X.
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  await p.selectOption(`#psuCur [data-cx="${id.B}"]`, ""); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const b = colById(id.B), d = finalOf(b); return { xcol: b.xcol, xn: d.xn, x0: d.x[0], x1: d.x[d.x.length - 1], menu: (colMenuItems(id.B).find(i => i && i.label === "Plot against") || { sub: () => [] }).sub().map(i => i.label + (i.checked ? "*" : "")) }; }, id);
  check("Against the row number: B is drawn at rows 1 to 60, and its column menu says so", r.xcol === "row" && r.xn === "Row" && r.x0 === 1 && r.x1 === 60 && r.menu.includes("Its row number*"), JSON.stringify(r));
  await p.evaluate(id => { colMenuItems(id.B).find(i => i && i.label === "Plot against").sub()[0].run(); }, id); await p.waitForTimeout(200);
  check("…and Plot against A puts it back", await p.evaluate(id => !colById(id.B).xcol && xColFor(colById(id.B)).id === id.A, id));
  await p.evaluate(id => { openPlotDlg([id.D]); }, id); await p.waitForTimeout(400);
  await use(p, id.C, "x"); await p.waitForTimeout(150);
  r = await p.evaluate(id => ({ opts: [...$(`#psuCur [data-cx="${id.D}"]`).options].map(o => o.value), add: !$("#psuAdd").disabled }), id);
  check("C marked X is offered as D's X; D keeps its own X A, which is marked, so nothing waits to be added", r.opts.includes(id.C) && !r.add, JSON.stringify(r));
  await p.selectOption(`#psuCur [data-cx="${id.D}"]`, id.C); await p.waitForTimeout(150);
  await p.click("#formOk"); await p.waitForTimeout(400);
  const r4 = await p.evaluate(id => ({ c: colById(id.C).role, b: xColFor(colById(id.B)).id === id.A, d: xColFor(colById(id.D)).id === id.C, e: xColFor(colById(id.E)).id === id.A, toast: [...document.querySelectorAll("#toast, .toast")].map(e => e.textContent).join(" ") }), id);
  check("D against C: C an X column, D on it; B before it and E, which C now precedes, kept on A; said", r4.c === "x" && r4.b && r4.d && r4.e && /Column Sheet 1!C is an X column and Sheet 1!D is plotted against Sheet 1!C/.test(r4.toast), JSON.stringify(r4));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  // Into a graph that has curves: the preview draws them with the new ones.
  const g0 = await p.evaluate(() => P().graphs.map(g => g.id));
  await p.evaluate(id => { openPlotDlg([id.E]); }, id); await p.waitForTimeout(400);
  const pvNew = await p.evaluate(() => $("#pdlgSk").querySelectorAll("g[data-ser]").length);
  await p.selectOption("#pdlgInto", await p.evaluate(() => P().graphs[0].id)); await p.waitForTimeout(200);
  const pvInto = await p.evaluate(() => $("#pdlgSk").querySelectorAll("g[data-ser]").length);
  await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => ({ ids: P().graphs.map(g => g.id), cols: P().graphs[0].cols }), id);
  check("Into a graph: the preview draws its curves with the new one, and OK adds it there", pvInto === pvNew + 1 && r.ids.join() === g0.join() && r.cols.join() === [id.B, id.E].join(), JSON.stringify([pvNew, pvInto, g0, r]));
}, { name: "Plot setup, wide" });
await page(async p => {
  const id = await six(p);
  await p.evaluate(id => { openPlotDlg([id.B, id.D]); }, id); await p.waitForTimeout(400);
  const vis = () => p.evaluate(() => ["#formBody .pdlg-kinds", "#formBody .psu-colsp", "#formBody .psu-curp", "#pdlgSk"].map(s => { const r = $(s).getBoundingClientRect(); return r.width > 0 && r.height > 0; }));
  const a = await vis(); await p.click('[data-ptab="cols"]'); await p.waitForTimeout(100); const b = await vis(); await p.click('[data-ptab="cur"]'); await p.waitForTimeout(100); const c = await vis();
  const w = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  check("at phone width the parts are tabs, the preview under each, no page scroll sideways", JSON.stringify([a, b, c]) === JSON.stringify([[true, false, false, true], [false, true, false, true], [false, false, true, true]]) && w, JSON.stringify([a, b, c, w]));
  await p.click("#formOk"); await p.waitForTimeout(400);
  check("…and Plot works from there", await p.evaluate(() => P().graphs.length === 1));
}, { name: "Plot setup, phone", vw: { width: 390, height: 844 } });

console.log("Slice 3: Plot setup on a graph");
await page(async p => {
  const id = await six(p);
  await p.evaluate(id => { plotCols([id.B, id.D, id.E], { quiet: true }); }, id); await p.waitForTimeout(400);
  await p.evaluate(() => { addAnno({ t: "text", x: 5, y: 300, text: "Hello there" }); }); await p.waitForTimeout(200);
  let r = await p.evaluate(id => { const lab = a => a.filter(i => i && i.label).map(i => i.label); return { plot: lab(plotMenu()).includes("What this graph plots…"), right: lab(graphMenuItems(id.B)).includes("What it plots…"), empty: lab(graphMenuItems(null)).includes("What it plots…"), win: lab(graphWinItems(GID())).includes("What it plots…") }; }, id);
  check("What it plots… in the Plot menu, the curve's and the plot's right-click and the graph's ⋯ menu", r.plot && r.right && r.empty && r.win, JSON.stringify(r));
  await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ title: $("#formTitle").textContent, ok: $("#formOk").textContent, cur: [...document.querySelectorAll("#psuCur [data-pcur]")].map(t => t.dataset.pcur), kind: [...document.querySelectorAll("#formBody [data-pk]")].filter(b => b.getAttribute("aria-checked") === "true").length, hist: $('#formBody [data-pk="hist"]').disabled, into: !!$("#pdlgInto"), hello: /Hello there/.test($("#pdlgSk").innerHTML), add: !$("#psuAdd").disabled, ax: document.querySelectorAll("#psuCur [data-cax]").length }));
  check("opened on the graph: its curves in order with their axes, no kind chosen (it keeps its own), no histogram, no Into, its labels in the preview, nothing to add", r.title === "What Graph 1 plots" && r.ok === "OK" && r.cur.join() === [id.B, id.D, id.E].join() && r.kind === 0 && r.hist && !r.into && r.hello && !r.add && r.ax === 3, JSON.stringify(r));
  // Take one off, reorder, a range: OK is one step, said in the log.
  await p.click(`#psuCur [data-pcur="${id.E}"] td`); await p.click("#psuDel");
  await p.click(`#psuCur [data-pcur="${id.D}"] td`); await p.click("#psuUp");
  await p.selectOption(`#psuCur [data-crng="${id.B}"]`, "row"); await p.fill(`#psuCur [data-crb="${id.B}"]`, "30"); await p.press(`#psuCur [data-crb="${id.B}"]`, "Enter"); await p.waitForTimeout(150);
  const u0 = await p.evaluate(() => undoStack.length);
  await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const g = P().graphs[0]; return { cols: g.cols, rng: (g.plot.use || {})[id.B], act: P().activeY, undo: undoStack.length, log: (P().log || []).slice(-1)[0].text, n: P().graphs.length }; }, id);
  check("OK: E taken off, D first, B drawing rows 1 to 30; one undo step; the log says what changed", r.cols.join() === [id.D, id.B].join() && r.rng && r.rng.rng.b === 30 && r.act === id.B && r.undo === u0 + 1 && r.n === 1 && /Graph 1: took off Third, put the curves in a new order and changed what the curves draw/.test(r.log), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo puts the curves and the range back", await p.evaluate(id => { const g = P().graphs[0]; return g.cols.join() === [id.B, id.D, id.E].join() && !curveUse(id.B, g.plot).rng; }, id));
  // The active curve taken off: the graph keeps one it shows as the active one. A kind chosen: every curve.
  await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
  await p.click(`#psuCur [data-pcur="${id.B}"] td`); await p.click("#psuDel"); await p.click('#formBody [data-pk="scatter"]'); await p.waitForTimeout(150);
  await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const g = P().graphs[0]; return { cols: g.cols, act: P().activeY, types: g.cols.map(k => (g.plot.series[k] || {}).type) }; }, id);
  check("the active curve taken off: D is the active one; Symbols chosen: every curve drawn so", r.cols.join() === [id.D, id.E].join() && r.act === id.D && r.types.every(t => t === "scatter"), JSON.stringify(r));
  // Nothing changed: no undo step.
  const u1 = await p.evaluate(() => undoStack.length);
  await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400); await p.click("#formOk"); await p.waitForTimeout(300);
  check("OK with nothing changed makes no undo step", await p.evaluate(u => undoStack.length === u, u1));
  // Add from the marks: a data column as error bars of a curve on the graph.
  await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
  await use(p, id.B, "y"); await use(p, id.C, "e:y"); await p.click("#psuAdd"); await p.waitForTimeout(150);
  r = await psu(p);
  check("on the graph, Add puts B back with its error bars from C", r.curves.map(q => q.id).join() === [id.D, id.E, id.B].join() && /yEr± C/.test(r.curves[2].with), JSON.stringify(r.curves));
  await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => ({ cols: P().graphs[0].cols, c: [colById(id.C).role, colById(id.C).of === id.B] }), id);
  check("…and OK adds it, C being B's error bars now", r.cols.join() === [id.D, id.E, id.B].join() && r.c[0] === "e" && r.c[1], JSON.stringify(r));
  // A figure's panel.
  await p.evaluate(id => { plotCols([id.H], { quiet: true }); }, id); await p.waitForTimeout(300);
  await p.evaluate(() => { makeFigure(P().graphs.map(g => g.id)); }); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const pan = P().graphs.filter(g => !g.fig)[0]; return { has: figPanelItems(pan.id).some(i => i && i.label === "What it plots…"), id: pan.id }; });
  await p.evaluate(g => { plotsOf(g); }, r.id); await p.waitForTimeout(400);
  const t = await p.evaluate(() => ({ title: $("#formTitle").textContent, pv: /<svg/.test($("#pdlgSk").innerHTML) }));
  check("a figure's panel has What it plots… and opens on its curves", r.has && /^What Figure 1 › \(a\)/.test(t.title) && t.pv, JSON.stringify([r, t]));
  await p.click("#formCancel"); await p.waitForTimeout(200);
}, { name: "Plot setup on a graph" });

console.log("Slice 4: groups");
await page(async p => {
  const id = await three(p);
  const look = () => p.evaluate(id => { const cfg = plotCfg(), pal = readPalette(); return [id.B, id.C, id.D].map(k => { const s = serStyle(k, k === P().activeY, pal, false, cfg); return { c: s.color, s: s.sym, d: s.dash, t: s.type }; }); }, id);
  const before = await look();
  let r = await p.evaluate(id => { const g = graphMenuItems(id.C).find(i => i && i.label === "Group"); return g ? g.sub().filter(i => i && i.label).map(i => i.label) : null; }, id);
  check("a curve's right-click has Group: not grouped, a new group with…, every curve in one", r && r.includes("Not grouped") && r.includes("A new group with…") && r.includes("Every curve of this graph in one group"), JSON.stringify(r));
  await p.evaluate(id => { graphMenuItems(id.C).find(i => i && i.label === "Group").sub().find(i => i.label === "Every curve of this graph in one group").run(); }, id); await p.waitForTimeout(200);
  let a = await look();
  check("every curve in one group: colours as they were, symbols and line styles stepping from the first", a.map(q => q.c).join() === before.map(q => q.c).join() && a.map(q => q.s).join() === "circle,square,triangle" && a.map(q => q.d).join() === "solid,dash,dot", JSON.stringify(a));
  const g = await p.evaluate(() => graphGroups(GP(), P().graphs[0].cols)[0].g);
  await p.evaluate(g => setGroupStep(g, "sym"), g); await p.waitForTimeout(150); a = await look();
  check("Symbol only: one colour (the first curve's), the symbols stepping, one line style", a.every(q => q.c === before[0].c) && a.map(q => q.s).join() === "circle,square,triangle" && a.every(q => q.d === "solid"), JSON.stringify(a));
  await p.evaluate(g => setGroupStep(g, "dash"), g); await p.waitForTimeout(150); a = await look();
  check("Line style only: one colour and symbol, the line styles stepping", a.every(q => q.c === before[0].c && q.s === "circle") && a.map(q => q.d).join() === "solid,dash,dot", JSON.stringify(a));
  await p.evaluate(id => setSeriesStyle(id.C, { color: "#aa0000" }), id); await p.waitForTimeout(150); a = await look();
  check("a curve's own colour still wins in its group", a[1].c === "#aa0000" && a[0].c === before[0].c && a[2].c === before[0].c, JSON.stringify(a));
  r = await p.evaluate(id => { const it = plotTypeItems(colById(id.C), false); return { head: it[0].group, run: !!it.find(i => i && i.label === "Symbols") }; }, id);
  await p.evaluate(id => { plotTypeItems(colById(id.C), false).find(i => i && i.label === "Symbols").run(); }, id); await p.waitForTimeout(150); a = await look();
  check("Plot type on one curve of a group is the group's: every curve drawn as symbols", r.head === "For group 1" && a.every(q => q.t === "scatter"), JSON.stringify([r, a]));
  await p.evaluate(id => setGroup([id.D], null, "out"), id); await p.waitForTimeout(150);
  r = await p.evaluate(() => graphGroups(GP(), P().graphs[0].cols).map(q => q.ids.length));
  await p.evaluate(id => setGroup([id.C], null, "out"), id); await p.waitForTimeout(150);
  const r2 = await p.evaluate(() => ({ grps: P().graphs[0].plot.grps || null, grp: Object.values(P().graphs[0].plot.use || {}).filter(u => u.grp).length }));
  check("taking curves out: a group of two stays, a group of one is no group", JSON.stringify(r) === "[2]" && !r2.grps && r2.grp === 0, JSON.stringify([r, r2]));
  for (let i = 0; i < 2; i++) await p.evaluate(() => undo()); await p.waitForTimeout(200);
  check("undo puts them back in the group", await p.evaluate(() => graphGroups(GP(), P().graphs[0].cols).map(q => q.ids.length).join() === "3"));
  // In Plot setup: the group column and the steps.
  await p.evaluate(() => { setGroup(P().graphs[0].cols.slice(), null, "none"); }); await p.waitForTimeout(150);
  await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
  await p.selectOption(`#psuCur [data-cgrp="${id.B}"]`, "new"); await p.waitForTimeout(120);
  const gk = await p.evaluate(id => $(`#psuCur [data-cgrp="${id.B}"]`).value, id);
  await p.selectOption(`#psuCur [data-cgrp="${id.D}"]`, gk); await p.waitForTimeout(120);
  r = await p.evaluate(() => ({ steps: [...document.querySelectorAll("#psuCur [data-gstep]")].length, opts: [...document.querySelectorAll("#psuCur [data-cgrp]")][1].options.length }));
  await p.selectOption(`#psuCur [data-gstep="${gk}"]`, "color"); await p.waitForTimeout(150);
  const u0 = await p.evaluate(() => undoStack.length);
  await p.click("#formOk"); await p.waitForTimeout(400);
  const r3 = await p.evaluate(id => { const pl = P().graphs[0].plot, u = pl.use || {}; return { same: u[id.B] && u[id.D] && u[id.B].grp === u[id.D].grp, c: !(u[id.C] || {}).grp, step: ((pl.grps || {})[(u[id.B] || {}).grp] || {}).step, undo: undoStack.length, log: (P().log || []).slice(-1)[0].text }; }, id);
  check("Plot setup's Group column: B in a new group, D joining it, its steps chosen; OK in one step", r.steps === 1 && r.opts === 3 && r3.same && r3.c && r3.step === "color" && r3.undo === u0 + 1 && /changed what the curves draw/.test(r3.log), JSON.stringify([r, r3]));
  // A new graph made with a group.
  await p.evaluate(id => { openPlotDlg([id.C, id.D]); }, id); await p.waitForTimeout(400);
  await p.selectOption(`#psuCur [data-cgrp="${id.C}"]`, "new"); await p.waitForTimeout(100);
  const gk2 = await p.evaluate(id => $(`#psuCur [data-cgrp="${id.C}"]`).value, id);
  await p.selectOption(`#psuCur [data-cgrp="${id.D}"]`, gk2); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1]; return graphGroups(g.plot, g.cols).map(q => q.ids.join()); }, id);
  check("a new graph from Plot setup keeps its group", JSON.stringify(r) === JSON.stringify([[id.C, id.D].join()]), JSON.stringify(r));
  // What storage gives back.
  r = await p.evaluate(id => { const q = P(), g = q.graphs[0]; g.plot.use = { [id.B]: { grp: 7 }, [id.C]: { grp: "a b" }, [id.D]: { grp: "solo" } }; g.plot.grps = { solo: { step: "zz" }, gone: { step: "all" } }; normalize(q); return { use: g.plot.use || null, grps: g.plot.grps || null }; }, id);
  check("a group that does not read, or of one, is dropped by normalize", !r.use && !r.grps, JSON.stringify(r));
  r = await p.evaluate(id => { const q = P(), g = q.graphs[0]; g.plot.use = { [id.B]: { grp: "k1" }, [id.C]: { grp: "k1" } }; g.plot.grps = { k1: { step: "zz" } }; normalize(q); return g.plot.grps; }, id);
  check("…and a step that does not read becomes all three", JSON.stringify(r) === JSON.stringify({ k1: { step: "all" } }), JSON.stringify(r));
}, { name: "groups" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
