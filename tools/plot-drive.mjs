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

console.log("Slice 5: kinds that need another column");
await page(async p => {
  const id = await six(p);
  await p.evaluate(id => { openPlotDlg([id.B, id.D]); }, id); await p.waitForTimeout(400);
  let r = await p.evaluate(() => { const cs = [...document.querySelectorAll("#formBody .pgal [data-pk]")]; return { n: cs.length, more: cs.slice(14).map(b => b.dataset.pk), sep: [...document.querySelectorAll("#formBody .pdlg-sep")].map(e => e.textContent), drawn: cs.slice(14).every(b => b.querySelector(".pgt svg circle, .pgt svg rect")) }; });
  check("five kinds that need another column, after the others, drawn with the data", r.n === 19 && r.more.join() === "bubble,cmap,labels,errbox,tmap" && r.sep.includes("With another column") && r.drawn, JSON.stringify(r));
  await p.click('#formBody [data-pk="bubble"]'); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ ok: !$("#formOk").disabled, need: $("#psuNeed").textContent }));
  check("Bubbles with no size: Plot off, and the note says what to mark", !r.ok && /mark one as Size beside each curve/.test(r.need), JSON.stringify(r));
  await use(p, id.F, "size"); await p.click("#psuAdd"); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ ok: !$("#formOk").disabled, need: $("#psuNeed").textContent }));
  check("…a size for D alone: the note names the curve that has none", !r.ok && /\(Small has none\.\)/.test(r.need), JSON.stringify(r));
  await p.click(`#psuCur [data-pcur="${id.B}"] td`); await p.click("#psuDel"); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ ok: !$("#formOk").disabled, need: $("#psuNeed").textContent }));
  await p.click("#formOk"); await p.waitForTimeout(400);
  const r2 = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1], s = g.plot.series[id.D] || {}; return { cols: g.cols, scol: s.scol, type: s.type }; }, id);
  check("…B taken off: Plot on; the graph draws D as symbols sized by F", r.ok && !r.need && r2.cols.join() === id.D && r2.scol === id.F && r2.type === "scatter", JSON.stringify([r, r2]));
  // Error boxes: an X error and a Y error.
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  await p.click('#formBody [data-pk="errbox"]'); await use(p, id.C, "e:x"); await use(p, id.F, "e:y"); await p.click("#psuAdd"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ ok: !$("#formOk").disabled, pv: /data-ebox/.test($("#pdlgSk").innerHTML) }));
  await p.click("#formOk"); await p.waitForTimeout(400);
  const r3 = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1]; return { eb: (g.plot.series[id.B] || {}).eb, box: /data-ebox/.test($("#plot").innerHTML), exp: /data-ebox/.test(buildPlot(800, 500, EXPORT_PAL, true)), c: errKind(colById(id.C)), f: errKind(colById(id.F)) }; }, id);
  check("Error boxes: B with X errors from C and Y errors from F, a box round each point, in the preview, the graph and an export", r.ok && r.pv && r3.eb === "box" && r3.box && r3.exp && r3.c === "x" && r3.f === "y", JSON.stringify([r, r3]));
  r = await p.evaluate(id => { const e = graphMenuItems(id.B).find(i => i && i.label === "Error bars"); return e ? e.sub().map(i => i.label) : null; }, id);
  check("the curve's Error bars menu has Boxes (X and Y)", r && r.includes("Boxes (X and Y)"), JSON.stringify(r));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  // Labelled points and colour by value.
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  await p.click('#formBody [data-pk="labels"]'); await use(p, id.F, "lab"); await p.click("#psuAdd"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1]; return { lab: curveUse(id.B, g.plot).lab, drawn: !!document.querySelector(`#plot g[data-plab="${id.B}"]`) }; }, id);
  check("Labelled points: labels from F beside each point", r.lab === id.F && r.drawn, JSON.stringify(r));
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  await p.click('#formBody [data-pk="cmap"]'); await use(p, id.F, "col"); await p.click("#psuAdd"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1], s = g.plot.series[id.B] || {}; return { z: s.zcol, t: s.type }; }, id);
  check("Colour by value: symbols coloured by F", r.z === id.F && r.t === "scatter", JSON.stringify(r));
  // On a graph: a kind that needs another column, said in the log.
  await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
  await p.click('#formBody [data-pk="bubble"]'); await use(p, id.F, "size"); await p.click("#psuAdd"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const g = P().graphs.find(g => g.id === GID()); return { s: (g.plot.series[id.B] || {}).scol, log: (P().log || []).slice(-1)[0].text }; }, id);
  check("on a graph: Bubbles, said in the log", r.s === id.F && /drew them as bubbles/.test(r.log), JSON.stringify(r));
}, { name: "kinds that need another column" });

console.log("Slice 6: remembered setups");
await page(async p => {
  const id = await six(p);
  let r = await p.evaluate(id => { const it = plotItems([id.B]).find(i => i && i.label === "Plot like the last time"); return it ? { en: it.enabled !== false } : null; }, id);
  check("Plot like the last time is in the Plot list, off before Plot setup has plotted from the sheet", r && !r.en, JSON.stringify(r));
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  await p.click('#formBody [data-pk="bubble"]'); await use(p, id.F, "size"); await p.click("#psuAdd"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(id => { const m = ((JSON.parse(localStorage.getItem("kurve.psu") || "{}"))[S.pid] || {}).s1; return m ? { kind: m.kind, f: m.use[id.F] } : null; }, id);
  check("OK remembers the kind and what each column was, per sheet", r && r.kind === "bubble" && r.f === "size", JSON.stringify(r));
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  r = await p.evaluate(id => ({ kind: [...document.querySelectorAll("#formBody [data-pk]")].filter(b => b.getAttribute("aria-checked") === "true").map(b => b.dataset.pk), f: $(`#psuCols [data-puse="${id.F}"]`).value, with: document.querySelector("#psuCur [data-pcur] td:nth-child(3)").textContent, ok: !$("#formOk").disabled }), id);
  check("opened again on that sheet: Bubbles chosen, F still the size, B's curve sized by it, ready to plot", r.kind.join() === "bubble" && r.f === "size" && /size F/.test(r.with) && r.ok, JSON.stringify(r));
  await p.click("#formCancel"); await p.waitForTimeout(200);
  r = await p.evaluate(id => { const it = plotItems([id.E]).find(i => i && i.label === "Plot like the last time"); return { en: it.enabled !== false, note: it.note }; }, id);
  const n0 = await p.evaluate(() => P().graphs.length);
  await p.evaluate(id => { plotItems([id.E]).find(i => i && i.label === "Plot like the last time").run(); }, id); await p.waitForTimeout(400);
  const r2 = await p.evaluate(id => { const g = P().graphs[P().graphs.length - 1], s = g.plot.series[id.E] || {}; return { n: P().graphs.length, open: !$("#formModal").hidden, cols: g.cols, scol: s.scol, type: s.type }; }, id);
  check("Plot like the last time: E plotted at once as bubbles sized by F, no dialog", r.en && r.note === "bubbles" && r2.n === n0 + 1 && !r2.open && r2.cols.join() === id.E && r2.scol === id.F && r2.type === "scatter", JSON.stringify([r, r2]));
  r = await p.evaluate(id => (plotItems([id.H]).find(i => i && i.label === "Plot like the last time") || {}).enabled, id);
  check("…not on another sheet, which has nothing remembered", r === false, JSON.stringify(r));
  // When what it needs has gone, the dialog opens instead.
  await p.evaluate(id => { deleteCols([id.F]); }, id); await p.waitForTimeout(300);
  await p.evaluate(id => { plotLikeLast([id.B]); }, id); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ open: !$("#formModal").hidden, need: $("#psuNeed") ? $("#psuNeed").textContent : "" }));
  check("…with the size column deleted, Plot like the last time opens the dialog, saying what to mark", r.open && /mark one as Size/.test(r.need), JSON.stringify(r));
  await p.click("#formCancel"); await p.waitForTimeout(200);
  // What it remembers never changes a column: error bars undone stay undone.
  await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(400);
  await p.click('#formBody [data-pk="scatter"]'); await use(p, id.C, "e:y"); await p.click("#psuAdd"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  await p.evaluate(id => { plotLikeLast([id.B]); }, id); await p.waitForTimeout(400);
  r = await p.evaluate(id => ({ c: colById(id.C).role, open: !$("#formModal").hidden }), id);
  check("…error bars undone are not given back by Plot like the last time", r.c === "ignore" && !r.open, JSON.stringify(r));
  // Junk in storage.
  await p.evaluate(() => { localStorage.setItem("kurve.psu", "{bad"); }); await p.evaluate(id => { openPlotDlg([id.B]); }, id); await p.waitForTimeout(300);
  r = await p.evaluate(() => !$("#formModal").hidden && $("#formBody [data-pk][aria-checked=true]").dataset.pk); await p.click("#formCancel"); await p.waitForTimeout(150);
  await p.evaluate(() => { localStorage.setItem("kurve.psu", JSON.stringify({ [S.pid]: { s1: { kind: "nope", use: 3 } } })); });
  const r3 = await p.evaluate(id => (plotItems([id.B]).find(i => i && i.label === "Plot like the last time") || {}).enabled, id);
  check("what storage gives back that does not read is not remembered", !!r && r3 === false, JSON.stringify([r, r3]));
}, { name: "remembered setups" });

console.log("Roadmap 4, slice 1: a distribution over a histogram");
await page(async p => {
  // 2000 values from a normal distribution (mean 10, SD 2) and 600 around zero, as data columns.
  const id = await p.evaluate(async () => {
    const r = mulberry32(7), g = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
    const a = [], b = [], x = []; for (let i = 0; i < 2000; i++) { x.push(i + 1); a.push(10 + 2 * g()); b.push(i < 600 ? g() : null); }
    const X = makeCol("x", "Row", "", x), A = Object.assign(makeCol("y", "Length", "mm", a), { pipe: [], mask: [] }), B = Object.assign(makeCol("y", "Offset", "", b), { pipe: [], mask: [] });
    const pr = Object.assign(blankProject("Histograms"), { cols: [X, A, B], activeY: A.id });
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    return { A: A.id, B: B.id };
  });
  await p.waitForTimeout(300);
  const legOf = () => [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent).join(" | ");
  await p.evaluate(id => { histogramCols([id.A]); }, id); await p.waitForTimeout(400);
  const H = await p.evaluate(id => yCols().find(c => c.src === id.A && histOf(c.id)).id, id);
  let r = await p.evaluate(H => { const it = graphMenuItems(H).find(i => i && i.label === "Distribution over it"), sub = it ? it.sub() : [];
    return { has: !!it, labs: sub.map(i => i.label + (i.enabled === false ? "-" : "")), none: (sub[0] || {}).checked }; }, H);
  check("the histogram's right-click has Distribution over it: None (ticked), Normal, Log-normal, Exponential", r.has && r.labs.join() === "None,Normal,Log-normal,Exponential" && r.none, JSON.stringify(r));
  await p.evaluate(H => { graphMenuItems(H).find(i => i && i.label === "Distribution over it").sub().find(i => i.label === "Normal").run(); }, H); await p.waitForTimeout(400);
  r = await p.evaluate(H => { const c = colById(H), h = histCurve(c, "normal"), d = finalOf(c), path = document.querySelector("#plot path[data-hdist]"), leg = [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent).join(" | ");
    const top = Math.max(...d.y), ctop = Math.max(...d.x.map(h.y));
    return { path: !!path, tip: path && path.querySelector("title").textContent, mu: h.fit.p[0], sd: h.fit.p[1], top, ctop, leg: /Normal: μ = (9\.9|10\.0)/.test(leg) && /mm/.test(leg), legT: leg.slice(0, 300), dist: (GP().series[H] || {}).dist, toast: document.querySelector("#toast") ? document.querySelector("#toast").textContent : "" }; }, H);
  check("Normal: the curve is drawn over the histogram, its parameters in the legend (with the unit)", r.path && r.leg && r.dist === "normal", JSON.stringify(r));
  check("…μ and σ found near the values' 10 and 2", Math.abs(r.mu - 10) < 0.15 && Math.abs(r.sd - 2) < 0.12, JSON.stringify([r.mu, r.sd]));
  check("…as counts: the curve's top within 15 % of the tallest bin", Math.abs(r.ctop / r.top - 1) < 0.15, JSON.stringify([r.top, r.ctop]));
  check("…its tooltip and the message give Kolmogorov–Smirnov's D and p", /Kolmogorov–Smirnov D = 0\.0/.test(r.tip) && /p ≈/.test(r.tip) && /Kolmogorov–Smirnov/.test(r.toast), JSON.stringify([r.tip, r.toast]));
  r = await p.evaluate(H => { const v = S.geo && S.geo.v, h = histCurve(colById(H), "normal"); let top = 0; for (let i = 0; i <= 400; i++) { const x = v.x0 + (v.x1 - v.x0) * i / 400; top = Math.max(top, h.y(x)); } return { y1: v.y1, top }; }, H);
  check("…the view rises to take the curve's top in", r.y1 >= r.top, JSON.stringify(r));
  r = await p.evaluate(() => { const pic = handPic(600, 400, 1).svg; return { path: /data-hdist/.test(pic), leg: /Normal: /.test(pic) }; });
  check("…in an export too", r.path && r.leg, JSON.stringify(r));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(400);
  r = await p.evaluate(H => ({ dist: ((GP().series || {})[H] || {}).dist || null, path: !!document.querySelector("#plot path[data-hdist]"), hist: !!colById(H) }), H);
  await p.evaluate(() => { redo(); }); await p.waitForTimeout(400);
  const r2 = await p.evaluate(H => ((GP().series || {})[H] || {}).dist || null, H);
  check("one undo takes the distribution off again, the histogram kept; redo puts it back", r.dist === null && !r.path && r.hist && r2 === "normal", JSON.stringify([r, r2]));
  // As a density the curve has area 1; cumulative, it ends at the number of values.
  await p.evaluate(H => { const s = colById(H).pipe.find(q => q.op === "hist"); setParam(s, "norm", "density", true); }, H); await p.waitForTimeout(400);
  r = await p.evaluate(H => { const c = colById(H), h = histCurve(c, "normal"), d = finalOf(c), w = d.bins.w; return { area: d.x.reduce((s, x) => s + h.y(x) * w, 0), hist: d.y.reduce((s, y) => s + y * w, 0) }; }, H);
  check("…as a density the curve's area is 1, as the histogram's", Math.abs(r.area - 1) < 0.01 && Math.abs(r.hist - 1) < 1e-6, JSON.stringify(r));
  await p.evaluate(H => { setParam(colById(H).pipe.find(q => q.op === "hist"), "norm", "count", true); }, H); await p.waitForTimeout(300);
  await p.evaluate(H => { setParam(colById(H).pipe.find(q => q.op === "hist"), "cum", true, true); }, H); await p.waitForTimeout(400);
  r = await p.evaluate(H => { const c = colById(H), h = histCurve(c, "normal"), d = finalOf(c), last = d.x[d.x.length - 1]; return { end: h.y(last), n: d.y[d.y.length - 1], mid: h.y(10 - d.bins.w / 2) }; }, H);
  check("…cumulative it rises to the number of values, half of them at the mean", Math.abs(r.end - 2000) < 5 && r.n === 2000 && Math.abs(r.mid - 1000) < 60, JSON.stringify(r));
  await p.evaluate(H => { const s = colById(H).pipe.find(q => q.op === "hist"); setParam(s, "cum", false, true); }, H); await p.waitForTimeout(300);
  await p.evaluate(H => { setHistDist(H, "lognormal"); }, H); await p.waitForTimeout(400);
  r = await p.evaluate(H => { const l = P().log.slice(-1)[0]; return { leg: [...document.querySelectorAll("#plot text, #plot [data-rt]")].some(e => /Log-normal: μ = 2\.2/.test(e.textContent)), log: JSON.stringify(l) }; }, H);
  check("Log-normal: μ of ln x (about ln 10) in the legend, and a log line", r.leg && /log-normal distribution over/.test(r.log), JSON.stringify(r));
  // Values at or below zero: Log-normal and Exponential are refused, in words.
  await p.evaluate(id => { histogramCols([id.B]); }, id); await p.waitForTimeout(400);
  const H2 = await p.evaluate(id => yCols().find(c => c.src === id.B && histOf(c.id)).id, id);
  r = await p.evaluate(H2 => graphMenuItems(H2).find(i => i && i.label === "Distribution over it").sub().map(i => [i.label, i.enabled !== false, i.title || ""]), H2);
  check("values at or below zero: Log-normal and Exponential disabled, each saying why", r[1][1] && !r[2][1] && /above zero/.test(r[2][2]) && !r[3][1] && /zero or more/.test(r[3][2]), JSON.stringify(r));
  r = await p.evaluate(H2 => { setHistDist(H2, "exp"); return { dist: (GP().series[H2] || {}).dist || null, toast: document.querySelector("#toast").textContent }; }, H2);
  check("…and refused if asked for anyway", r.dist === null && /zero or more/.test(r.toast), JSON.stringify(r));
  // Kept with the graph across a reload.
  await p.waitForTimeout(300); await p.reload(); await ready(p); await p.waitForTimeout(400);
  r = await p.evaluate(H => { const g = P().graphs.find(g => g.cols.includes(H)); return g && (g.plot.series[H] || {}).dist; }, H);
  check("…and the distribution is kept with the graph across a reload", r === "lognormal", JSON.stringify(r));
}, { name: "distribution over a histogram" });

console.log("Roadmap 4, slice 2: boxes grouped by another column, notched boxes");
await page(async p => {
  // Two curves of 300 values, a column of three groups (the mean rising with the group), and one of 200 different values.
  const id = await p.evaluate(async () => {
    const r = mulberry32(5), g = () => { let s = 0; for (let i = 0; i < 12; i++) s += r(); return s - 6; };
    const x = [], a = [], b = [], gr = [], h = []; for (let i = 0; i < 300; i++) { const k = 1 + (i % 3); x.push(i + 1); gr.push(k); a.push(10 + 2 * k + g()); b.push(30 - 3 * k + g()); h.push(i % 200); }
    const X = makeCol("x", "Row", "", x), A = Object.assign(makeCol("y", "Yield", "%", a), { pipe: [], mask: [] }), B = Object.assign(makeCol("y", "Purity", "%", b), { pipe: [], mask: [] }),
      G = makeCol("ignore", "Batch", "", gr), H = makeCol("ignore", "Sample", "", h);
    const pr = Object.assign(blankProject("Batches"), { cols: [X, A, B, G, H], activeY: A.id });
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    return { A: A.id, B: B.id, G: G.id, H: H.id };
  });
  await p.waitForTimeout(300);
  await p.evaluate(id => { plotCols([id.A, id.B], { layout: "box" }); }, id); await p.waitForTimeout(500);
  let r = await p.evaluate(() => { const it = distMenuItems().find(i => i && i.label === "Grouped by"), sub = it ? it.sub() : [];
    return { has: !!it, sub: sub.map(i => [i.label, i.enabled !== false, i.title || ""]), notch: (distMenuItems().find(i => i && i.label === "Notches") || {}).enabled }; });
  check("Box chart › Grouped by: Nothing, the column of three groups, and the one of 200 values greyed with the reason", r.has && r.sub[0][0] === "Nothing" && r.sub.some(s => /Batch/.test(s[0]) && s[1]) && r.sub.some(s => /Sample/.test(s[0]) && !s[1] && /more than 60/.test(s[2])) && !r.sub.some(s => /Yield|Purity/.test(s[0])) && r.notch === true, JSON.stringify(r));
  await p.evaluate(() => { distMenuItems().find(i => i && i.label === "Grouped by").sub().find(i => /Batch/.test(i.label)).run(); }); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const gs = [...document.querySelectorAll("#plot g[data-dist]")], texts = [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent);
    return { n: gs.length, keys: [...new Set(gs.map(g => g.dataset.distg))].join(), tips: gs.map(g => (g.querySelector("title") || {}).textContent || ""), ticks: ["1", "2", "3"].every(t => texts.includes(t)), title: texts.includes("Batch"), leg: texts.includes("Yield") && texts.includes("Purity"), log: JSON.stringify(P().log.slice(-1)[0]) }; });
  check("grouped: a box per curve in each of the three groups, X numbered by the groups and titled by the column", r.n === 6 && r.keys === "1,2,3" && r.ticks && r.title, JSON.stringify([r.n, r.keys, r.ticks, r.title]));
  check("…the legend says which colour is which curve, and the log says what was done", r.leg && /grouped the boxes by Batch/.test(r.log), JSON.stringify([r.leg, r.log]));
  const med = t => +((t.match(/median ([-\d.]+)/) || [])[1]);
  const yk = [1, 2, 3].map(k => med(r.tips.find(t => t.startsWith("Yield") && new RegExp(`Batch is ${k}:`).test(t)) || "")), pk = [1, 2, 3].map(k => med(r.tips.find(t => t.startsWith("Purity") && new RegExp(`Batch is ${k}:`).test(t)) || ""));
  check("…each box holds its group's values: the medians rise and fall with the group as made", yk.every((m, i) => Math.abs(m - (12 + 2 * i)) < 0.5) && pk.every((m, i) => Math.abs(m - (27 - 3 * i)) < 0.5), JSON.stringify([yk, pk]));
  // The readout names the curve and the group under the pointer.
  r = await p.evaluate(() => { const q = S.geo.distK.find(q => q.g === 2 && q.c.name === "Purity"), svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(); return { x: bb.left + S.geo.X(q.x), y: bb.top + S.geo.Y(24) }; });
  await p.mouse.move(r.x, r.y); await p.waitForTimeout(200);
  r = await p.evaluate(() => document.querySelector("#readout").textContent);
  check("…the readout under the pointer names the curve and its group", /Purity/.test(r) && /Batch 2/.test(r), r);
  // Notches.
  await p.evaluate(() => { distMenuItems().find(i => i && i.label === "Notches").run(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ n: document.querySelectorAll("#plot path[data-notch]").length, tip: (document.querySelector("#plot g[data-dist] title") || {}).textContent, pic: /data-notch/.test(handPic(600, 400, 1).svg), fmt: FMT_KEYS.includes("distNotch") }));
  check("Notches: every box notched round its median, said in its tooltip, in an export, and a format kept by saved styles", r.n === 6 && /its notch/.test(r.tip) && r.pic && r.fmt, JSON.stringify(r));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ notch: document.querySelectorAll("#plot path[data-notch]").length, groups: document.querySelectorAll("#plot g[data-distg]").length }));
  check("…one undo takes the notches off, the grouping kept", r.notch === 0 && r.groups === 6, JSON.stringify(r));
  // Violins grouped the same way.
  await p.evaluate(() => { setPlotKey("layout", "violin"); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ n: document.querySelectorAll("#plot g[data-distg]").length, notchOn: (distMenuItems().find(i => i && i.label === "Notches") || {}).enabled }));
  check("violins are grouped the same way (notches are a box's only)", r.n === 6 && r.notchOn === false, JSON.stringify(r));
  // The Format pane offers the same.
  await p.evaluate(() => { setPlotKey("layout", "box"); openPlotDetails(null, "layout"); }); await p.waitForTimeout(500);
  r = await p.evaluate(id => { const s = document.querySelector("#pdDb"); return s ? { v: s.value, opts: [...s.options].map(o => o.value), notch: !!document.querySelector("#pdDn") } : null; }, id);
  check("the Format pane's layout page has Grouped by (the groups' column, not the one of 200 values) and Notches", r && r.v === id.G && r.opts.includes(id.G) && !r.opts.includes(id.H) && r.notch, JSON.stringify(r));
  await p.evaluate(() => closeWin("format")); await p.waitForTimeout(200);
  // The column of groups deleted: the chart goes back to a box per curve.
  await p.evaluate(id => { deleteCols([id.G]); }, id); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ n: document.querySelectorAll("#plot g[data-dist]").length, g: document.querySelectorAll("#plot g[data-distg]").length }));
  check("with the column of groups deleted, a box per curve again", r.n === 2 && r.g === 0, JSON.stringify(r));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => document.querySelectorAll("#plot g[data-distg]").length);
  check("…and undo brings the column and the groups back", r === 6, JSON.stringify(r));
  // A new graph's look from this one does not carry the grouping.
  r = await p.evaluate(() => ({ base: "distBy" in plotBase(GP()), kept: !!GP().distBy }));
  check("a new graph's look from this one leaves the grouping out", !r.base && r.kept, JSON.stringify(r));
}, { name: "grouped and notched boxes" });

console.log("Roadmap 4, slice 3: stacked columns and names along X");
await page(async p => {
  const id = await p.evaluate(async () => {
    const X = makeCol("x", "Dose", "mg", [1, 2, 3, 4]), A = Object.assign(makeCol("y", "Cells", "", [1, 2, 3, 4]), { pipe: [], mask: [] }),
      B = Object.assign(makeCol("y", "Debris", "", [2, 2, 2, 2]), { pipe: [], mask: [] }), C = Object.assign(makeCol("y", "Other", "", [1, 1, 1, 1]), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Doses"), { cols: [X, A, B, C], activeY: A.id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    return { A: A.id, B: B.id, C: C.id };
  });
  await p.waitForTimeout(300);
  await p.evaluate(id => { plotCols([id.A, id.B, id.C], { type: "column" }); }, id); await p.waitForTimeout(500);
  const bar = (cid, i) => p.evaluate(([cid, i]) => { const d = (document.querySelector(`#plot g[data-ser="${cid}"] path`) || {}).getAttribute?.("d") || "", m = [...d.matchAll(/M([-\d.]+),([-\d.]+)V([-\d.]+)H([-\d.]+)/g)][i]; return m ? { x0: +m[1], z: +m[2], y: +m[3], x1: +m[4] } : null; }, [cid, i]);
  let r = await p.evaluate(id => { const it = graphMenuItems(id.B).find(i => i && i.label === "Columns"); return { has: !!it, sub: it ? it.sub().map(i => typeof i === "string" ? i : i.label + (i.checked ? "*" : "")) : [], stk: S.geo.colStk }; }, id);
  check("a column curve's right-click has Columns: Side by side (ticked), Stacked, Stacked to 100 %, Names along X…", r.has && r.sub.join() === "Side by side*,Stacked,Stacked to 100 %,-,Names along X…" && !r.stk, JSON.stringify(r));
  const side = await bar(id.B, 0);
  await p.evaluate(id => { graphMenuItems(id.B).find(i => i && i.label === "Columns").sub().find(i => i.label === "Stacked").run(); }, id); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ stk: S.geo.colStk, y1: S.geo.v.y1, Y: [1, 3, 4, 7].map(v => S.geo.Y(v)) }));
  const b0 = await bar(id.B, 0), c3 = await bar(id.C, 3);
  check("Stacked: each curve's column starts where the one before it ends, the whole width", r.stk && r.stk.mode === "stack" && r.stk.ids.join() === [id.A, id.B, id.C].join() && b0 && Math.abs(b0.z - r.Y[0]) < 1 && Math.abs(b0.y - r.Y[1]) < 1 && (b0.x1 - b0.x0) > 2 * (side.x1 - side.x0), JSON.stringify([r, b0, side]));
  check("…the view takes in the tallest stack", r.y1 >= 7 && c3 && Math.abs(c3.y - r.Y[3]) < 1, JSON.stringify([r.y1, c3]));
  await p.evaluate(() => { setPlotKey("colStack", "pct"); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ Y100: S.geo.Y(100), Y25: S.geo.Y(25), texts: [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent) }));
  const c0 = await bar(id.C, 0), a0 = await bar(id.A, 0);
  const lgb = await p.evaluate(() => { const g = document.querySelector("#plot g[data-leg]"); return g ? { top: g.getBBox().y, bottom: S.geo.T + S.geo.mh } : null; });
  check("…its legend below the graph, since every stack reaches the top", lgb && lgb.top > lgb.bottom, JSON.stringify(lgb));
  check("Stacked to 100 %: every stack reaches 100, each column its share, and Y says Share (%)", c0 && Math.abs(c0.y - r.Y100) < 1 && a0 && Math.abs(a0.y - r.Y25) < 1 && r.texts.includes("Share (%)"), JSON.stringify([c0, a0, r.Y100, r.Y25]));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => S.geo.colStk && S.geo.colStk.mode);
  check("undo goes back to stacked", r === "stack", JSON.stringify(r));
  r = await p.evaluate(() => ({ pic: handPic(600, 400, 1).svg, fmt: FMT_KEYS.includes("colStack") }));
  check("…in an export too, and a format saved styles carry", r.fmt && /M[-\d.]+,[-\d.]+V[-\d.]+H/.test(r.pic), JSON.stringify(r.fmt));
  // Names along X.
  await p.evaluate(() => { catNamesDlg(); }); await p.waitForTimeout(400);
  const names = ["Control", "Low", "Mid", "High"];
  for (let i = 0; i < 4; i++) await p.fill(`#catN${i}`, names[i]);
  await p.click("#formOk"); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ texts: [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent), log: JSON.stringify(P().log.slice(-1)[0]), menu: (axisMenuItems("x").find(i => i && i.label === "Names along X…") || {}).checked, pic: /Control/.test(handPic(600, 400, 1).svg) }));
  check("Names along X: each X value named under it in place of its number, said in the log, in an export", names.every(n => r.texts.includes(n)) && !r.texts.includes("1") && /named 4 X values/.test(r.log) && r.menu && r.pic, JSON.stringify(r).slice(0, 400));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent).includes("Control"));
  check("…one undo takes the names off", r === false, JSON.stringify(r));
  // What storage gives back that does not read is left out.
  await p.evaluate(() => { setAxisKeys("x", { cats: [[NaN, "a"], ["2", "Two"], [3, 5], "x", [4, "  "]] }); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ c: catsOf(GP().ax.x), texts: [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent) }));
  check("names that do not read are left out (only X 2 is named)", JSON.stringify(r.c) === '[[2,"Two"]]' && r.texts.includes("Two"), JSON.stringify(r.c));
  // A graph of many X values: refused in words.
  await p.evaluate(async () => { const n = 200, x = Array.from({ length: n }, (_, i) => i), y = x.map(v => Math.sin(v / 9));
    const X = makeCol("x", "t", "s", x), Y = Object.assign(makeCol("y", "Signal", "", y), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Many"), { cols: [X, Y], activeY: Y.id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll(); plotCols([Y.id], {}); });
  await p.waitForTimeout(500);
  r = await p.evaluate(() => { catNamesDlg(); return { open: !document.querySelector("#formModal").hidden, toast: document.querySelector("#toast").textContent }; });
  check("…and a graph of 200 X values is not given names, said in words", !r.open && /200 different X values/.test(r.toast), JSON.stringify(r));
}, { name: "stacked columns and names along X" });

console.log("Roadmap 4, slice 4: axes shared per column or per row in a figure");
await page(async p => {
  // Four panels, 2 × 2: the left column on X 0–10, the right on X 100–200; the top row small, the bottom row large.
  const id = await p.evaluate(async () => {
    const n = 40, x1 = Array.from({ length: n }, (_, i) => i * 10 / (n - 1)), x2 = x1.map(v => 100 + 10 * v);
    const X1 = makeCol("x", "Time", "s", x1), A = Object.assign(makeCol("y", "A", "", x1.map(v => Math.sin(v) * 0.5 + 0.5)), { pipe: [], mask: [] }), B = Object.assign(makeCol("y", "B", "", x1.map(v => 50 + 40 * Math.cos(v))), { pipe: [], mask: [] });
    const X2 = makeCol("x", "Time", "s", x2), C = Object.assign(makeCol("y", "C", "", x1.map(v => Math.cos(v) * 0.5 + 0.5)), { pipe: [], mask: [] }), D = Object.assign(makeCol("y", "D", "", x1.map(v => 50 + 40 * Math.sin(v))), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Panels"), { cols: [X1, A, B, X2, C, D], activeY: A.id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    const g = [A, C, B, D].map(c => { plotCols([c.id], { quiet: true }); return P().graphs[P().graphs.length - 1].id; });
    const fid = makeFigure(g, { cols: 2, shareX: false }); return { A: g[0], C: g[1], B: g[2], D: g[3], fid };
  });
  await p.waitForTimeout(600);
  const ranges = () => p.evaluate(id => Object.fromEntries(["A", "B", "C", "D"].map(k => [k, withGraph(id[k], () => { const c = plotCfg(); return { x: [c.ax.x.min, c.ax.x.max], y: [c.ax.y.min, c.ax.y.max], xl: c.ax.x.labs, yl: c.ax.y.labs }; })])), id);
  // Through the dialog: Share X in each column, Share Y in each row.
  await p.evaluate(id => { figDlg(id.fid); }, id); await p.waitForTimeout(400);
  let r = await p.evaluate(() => ({ x: [...document.querySelectorAll("#fgSx option")].map(o => o.textContent), y: [...document.querySelectorAll("#fgSy option")].map(o => o.textContent) }));
  check("the figure's Panels… dialog shares X: no, every panel, panels in one column; Y: no, every panel, panels in one row", r.x.join() === "No,Every panel,Panels in one column" && r.y.join() === "No,Every panel,Panels in one row", JSON.stringify(r));
  await p.selectOption("#fgSx", "col"); await p.selectOption("#fgSy", "row"); await p.click("#formOk"); await p.waitForTimeout(600);
  let g = await ranges();
  const log = await p.evaluate(() => JSON.stringify(P().log.slice(-1)[0]));
  check("…saved, said in the log", /sharing X in each column/.test(log) && /sharing Y in each row/.test(log), log);
  check("X shared in each column: the left column's panels on 0–10, the right's on 100–200", Math.abs(g.A.x[0] - g.B.x[0]) < 1e-9 && Math.abs(g.A.x[1] - g.B.x[1]) < 1e-9 && g.A.x[1] < 15 && Math.abs(g.C.x[0] - g.D.x[0]) < 1e-9 && g.C.x[0] > 90, JSON.stringify(g));
  check("Y shared in each row: the top row small, the bottom row large", Math.abs(g.A.y[1] - g.C.y[1]) < 1e-9 && g.A.y[1] < 2 && Math.abs(g.B.y[1] - g.D.y[1]) < 1e-9 && g.B.y[1] > 80, JSON.stringify(g));
  check("…numbers on the outer edges only: X on the bottom row, Y on the left column", g.A.xl === false && g.C.xl === false && g.B.xl !== false && g.D.xl !== false && g.C.yl === false && g.D.yl === false && g.A.yl !== false && g.B.yl !== false, JSON.stringify(g));
  // The zoom: followed by the panel in the same column only.
  r = await p.evaluate(id => { activateGraph(id.A); S.view = { x0: 2, x1: 4, y0: 0, y1: 1, xu: "s" }; return { b: viewFor(id.B), c: viewFor(id.C) }; }, id);
  check("a zoom is followed in X by the panel below it, not by the other column", r.b && r.b.x0 === 2 && r.b.x1 === 4 && !(r.c && r.c.x0 === 2), JSON.stringify(r));
  await p.evaluate(() => { S.view = null; renderAll(); }); await p.waitForTimeout(300);
  // Every panel, as before.
  await p.evaluate(id => { const G = clone(graphOf(id.fid).fig); G.shareX = true; figSave(id.fid, G, "shared X"); }, id); await p.waitForTimeout(500);
  g = await ranges();
  check("Share X every panel: one X range across both columns", Math.abs(g.A.x[0] - g.D.x[0]) < 1e-9 && Math.abs(g.A.x[1] - g.D.x[1]) < 1e-9 && g.A.x[0] < 1 && g.A.x[1] > 190, JSON.stringify([g.A.x, g.D.x]));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(400);
  r = await p.evaluate(id => graphOf(id.fid).fig.shareX, id);
  check("…one undo goes back to each column's own", r === "col", JSON.stringify(r));
  // From storage: a sharing that does not read is none, and a reload keeps what was set.
  r = await p.evaluate(() => [figShareOf("col"), figShareOf("row"), figShareOf(true), figShareOf("all"), figShareOf("weird"), figShareOf(null)]);
  check("what a sharing can be: every panel, a column's or a row's, or none for anything else", JSON.stringify(r) === '["col","row",true,true,false,false]', JSON.stringify(r));
  await p.waitForTimeout(300); await p.reload(); await ready(p); await p.waitForTimeout(500);
  r = await p.evaluate(id => { const F = graphOf(id.fid).fig; return [F.shareX, F.shareY]; }, id);
  check("…and a reload keeps Share X in each column and Share Y in each row", r[0] === "col" && r[1] === "row", JSON.stringify(r));
}, { name: "figure axes shared per column or row" });

console.log("Roadmap 4, slice 5: a map from scattered X, Y, Z");
await page(async p => {
  // 300 points scattered over X 0–10 and Y 0–5 (other units), with a value at each.
  const id = await p.evaluate(async () => {
    const r = mulberry32(9), x = [], y = [], z = []; for (let i = 0; i < 300; i++) { const a = 10 * r(), b = 5 * r(); x.push(a); y.push(b); z.push(Math.sin(a) + b / 5); }
    const X = makeCol("x", "Position", "mm", x), Y = Object.assign(makeCol("y", "Depth", "µm", y), { pipe: [], mask: [] }), Z = makeCol("ignore", "Hardness", "GPa", z);
    await createProject(Object.assign(blankProject("Hardness map"), { cols: [X, Y, Z], activeY: Y.id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    return { Y: Y.id, Z: Z.id };
  });
  await p.waitForTimeout(300);
  // Through Plot setup: the card, the note until a colour column is marked, then OK.
  await p.evaluate(id => { openPlotDlg([id.Y]); }, id); await p.waitForTimeout(500);
  let r = await p.evaluate(() => ({ card: !!document.querySelector('#formBody [data-pk="tmap"]'), title: (document.querySelector('#formBody [data-pk="tmap"]') || {}).title || "" }));
  check("Plot setup has the kind Map from X, Y, Z, with what it draws as its tooltip", r.card && /colour map between the points/.test(r.title), JSON.stringify(r));
  await p.click('#formBody [data-pk="tmap"]'); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ need: (document.querySelector("#psuNeed") || {}).textContent || "", ok: document.querySelector("#formOk").disabled }));
  check("…waiting, with a note, until a column is marked as the colour", /mark one as Colour/.test(r.need) && r.ok, JSON.stringify(r));
  await use(p, id.Z, "col"); await p.click("#psuRep"); await p.waitForTimeout(250);
  await p.click("#formOk"); await p.waitForTimeout(800);
  r = await p.evaluate(id => { const s = (GP().series || {})[id.Y] || {}; return { type: s.type, zcol: s.zcol === id.Z, img: !!document.querySelector("#plot image[data-tmap]"), bar: !!document.querySelector("#plot rect[fill='url(#zbar)']"), leg: !!document.querySelector("#plot g[data-leg]"), texts: [...document.querySelectorAll("#plot text, #plot [data-rt]")].map(e => e.textContent) }; }, id);
  check("OK: the map drawn as an image, a colour bar titled by the column, no legend entry for it", r.type === "tmap" && r.zcol && r.img && r.bar && !r.leg && r.texts.some(t => /Hardness/.test(t)), JSON.stringify(r).slice(0, 300));
  // The readout says the value under the pointer, interpolated.
  r = await p.evaluate(() => { const svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), g = S.geo; return { x: bb.left + g.X(5), y: bb.top + g.Y(2.5) }; });
  await p.mouse.move(r.x, r.y); await p.waitForTimeout(200);
  r = await p.evaluate(() => document.querySelector("#readout").textContent);
  const zv = +((r.match(/value ([-\d.]+)/) || [])[1]), want = Math.sin(5) + 0.5;
  check("…the readout gives the value under the pointer, near the surface's there", Number.isFinite(zv) && Math.abs(zv - want) < 0.15, JSON.stringify([r, want]));
  // Contour lines.
  await p.evaluate(id => { graphMenuItems(id.Y).find(i => i && i.label === "Map").sub().find(i => i.label === "An image and contour lines").run(); }, id); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ img: !!document.querySelector("#plot image[data-tmap]"), lines: (document.querySelector("#plot path[data-tlines]") || {}).getAttribute?.("d")?.length || 0 }));
  check("the curve's Map menu: an image and contour lines", r.img && r.lines > 100, JSON.stringify(r));
  await p.evaluate(id => { graphMenuItems(id.Y).find(i => i && i.label === "Map").sub().find(i => i.label === "Contour lines").run(); }, id); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ img: !!document.querySelector("#plot image[data-tmap]"), lines: !!document.querySelector("#plot path[data-tlines]"), pic: handPic(600, 400, 1).svg }));
  check("…contour lines alone, and in an export", !r.img && r.lines && /data-tlines/.test(r.pic), JSON.stringify([r.img, r.lines]));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ img: !!document.querySelector("#plot image[data-tmap]"), pic: /data-tmap/.test(handPic(600, 400, 1).svg) }));
  check("…undo gives the image back, an export drawing it too", r.img && r.pic, JSON.stringify(r));
  // A masked point leaves the map; the plot type list has the map, and no colour column greys it.
  r = await p.evaluate(id => { const it = plotTypeItems(colById(id.Y), false).find(i => i && /^Map from X, Y/.test(i.label || "")); return it ? { checked: it.checked, enabled: it.enabled !== false } : null; }, id);
  check("the curve's Plot type list has Map from X, Y and its colour column, ticked", r && r.checked && r.enabled, JSON.stringify(r));
  // Points on one line make no map, and draw nothing rather than fail.
  await p.evaluate(async () => { const x = [1, 2, 3, 4, 5], X = makeCol("x", "a", "", x), Y = Object.assign(makeCol("y", "b", "", x.map(v => 2 * v)), { pipe: [], mask: [] }), Z = makeCol("ignore", "c", "", x);
    await createProject(Object.assign(blankProject("Line"), { cols: [X, Y, Z], activeY: Y.id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll(); plotCols([Y.id], { type: "tmap", series: { [Y.id]: { zcol: Z.id } } }); });
  await p.waitForTimeout(600);
  r = await p.evaluate(() => { const c = yCols()[0], m = graphMenuItems(c.id).find(i => i && i.label === "Map"); return { img: !!document.querySelector("#plot image[data-tmap]"), why: m ? (m.sub()[0] || {}).group : null }; });
  check("points on one line: no map, and the Map menu says why", !r.img && /one line/.test(r.why || ""), JSON.stringify(r));
}, { name: "a map from scattered X, Y, Z" });

console.log("Roadmap 5, slice 1: polygons and curved arrows");
await page(async p => {
  await three(p);
  const box = () => p.evaluate(() => { const b = document.querySelector("#plot").getBoundingClientRect(), g = S.geo; return { x: b.left + g.L, y: b.top + g.T, w: g.pw, h: g.mh }; });
  const at = async (fx, fy) => { const b = await box(); return [b.x + b.w * fx, b.y + b.h * fy]; };
  const polys = () => p.evaluate(() => (P().annos || []).filter(a => a.t === "poly"));
  // Drawn with the Shape tool: four corners, then the first again.
  let r = await p.evaluate(() => { const b = document.querySelector('[data-mode="shape"]') || document.querySelector("#shapeBtn"); return null; });
  await p.evaluate(() => { pickShape("poly"); }); await p.waitForTimeout(150);
  for (const [fx, fy] of [[0.2, 0.2], [0.5, 0.15], [0.6, 0.5], [0.25, 0.6]]) { const [x, y] = await at(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(650); }
  r = await p.evaluate(() => ({ draft: !!document.querySelector("#plot [data-polydraft]"), n: S.polyDraft && S.polyDraft.pts.length }));
  check("the Shape tool's Polygon: each click a corner, the outline drawn as it goes", r.draft && r.n === 4, JSON.stringify(r));
  { const [x, y] = await at(0.2, 0.2); await p.mouse.click(x + 2, y + 1); await p.waitForTimeout(400); }
  let ps = await polys();
  r = await p.evaluate(() => ({ mode: S.mode, log: JSON.stringify(P().log.slice(-1)[0]), path: (document.querySelector("#plot g[data-anno] path") || {}).getAttribute?.("d") || "" }));
  check("…a click on the first corner finishes it: a closed polygon of four corners, said in the log, the tool put away", ps.length === 1 && ps[0].pts.length === 4 && ps[0].closed !== false && /drew a polygon of 4 corners/.test(r.log) && r.mode === "zoom" && /Z$/.test(r.path), JSON.stringify([ps, r]));
  const id = ps[0].id;
  // A corner dragged alone, then the whole.
  await p.evaluate(id => { S.annoSel = id; renderPlot(); }, id); await p.waitForTimeout(150);
  r = await p.evaluate(() => [...document.querySelectorAll('#plot circle[data-ah^="v"]')].map(c => [+c.getAttribute("cx"), +c.getAttribute("cy")]));
  check("selected, each corner is a handle", r.length === 4, JSON.stringify(r));
  const before = ps[0].pts.map(q => q.slice()), b0 = await box(), sv = await p.evaluate(() => { const b = document.querySelector("#plot").getBoundingClientRect(); return [b.left, b.top]; });
  await p.mouse.move(sv[0] + r[1][0], sv[1] + r[1][1]); await p.mouse.down(); await p.mouse.move(sv[0] + r[1][0] + 30, sv[1] + r[1][1] + 20, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  ps = await polys();
  check("…a corner drags alone, the others staying", ps[0].pts[1][0] > before[1][0] && JSON.stringify([ps[0].pts[0], ps[0].pts[2], ps[0].pts[3]]) === JSON.stringify([before[0], before[2], before[3]]), JSON.stringify([before, ps[0].pts]));
  await p.evaluate(() => { undo(); }); await p.waitForTimeout(300);
  ps = await polys();
  check("…one undo puts it back", JSON.stringify(ps[0].pts) === JSON.stringify(before), JSON.stringify(ps[0].pts));
  // Closed or open, filled, pinned.
  await p.evaluate(id => { annoMenuItems(id).find(i => i && i.label === "Closed").run(); }, id); await p.waitForTimeout(300);
  r = await p.evaluate(id => ({ closed: annoById(id).closed, d: document.querySelector(`#plot g[data-anno="${id}"] path`).getAttribute("d") }), id);
  check("its menu's Closed opens it: a line through its points", r.closed === false && !/Z$/.test(r.d), JSON.stringify(r));
  await p.evaluate(id => { updateAnno(id, { closed: true, fill: "#cc3311" }); pinAnno(id, true); }, id); await p.waitForTimeout(300);
  r = await p.evaluate(id => { const a = annoById(id), g = S.geo, s0 = polyPts(a, g); S.view = { x0: g.v.x0, x1: (g.v.x0 + g.v.x1) / 2, y0: g.v.y0, y1: g.v.y1, xu: g.v.xu }; renderPlot(); const s1 = polyPts(annoById(id), S.geo); S.view = null; renderPlot();
    return { pin: a.pin, n: (a.fpts || []).length, same: JSON.stringify(s0) === JSON.stringify(s1), fill: !!document.querySelector(`#plot g[data-anno="${id}"] path[fill="#cc3311"]`) }; }, id);
  check("filled, and pinned to the plot it stays put when the graph is zoomed", r.pin === "plot" && r.n === 4 && r.same && r.fill, JSON.stringify(r));
  r = await p.evaluate(() => /<path d="M[^"]+Z" fill="#cc3311"/.test(handPic(600, 400, 1).svg));
  check("…in an export too", r, JSON.stringify(r));
  // Enter finishes, Escape stops, two corners are not a polygon.
  await p.evaluate(() => { pickShape("poly"); }); await p.waitForTimeout(100);
  for (const [fx, fy] of [[0.7, 0.7], [0.9, 0.75], [0.8, 0.9]]) { const [x, y] = await at(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(600); }
  await p.keyboard.press("Enter"); await p.waitForTimeout(300);
  ps = await polys();
  check("Enter finishes a polygon of three corners", ps.length === 2 && ps[1].pts.length === 3, JSON.stringify(ps.map(q => q.pts.length)));
  await p.evaluate(() => { pickShape("poly"); }); await p.waitForTimeout(100);
  for (const [fx, fy] of [[0.1, 0.8], [0.3, 0.85]]) { const [x, y] = await at(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(600); }
  await p.keyboard.press("Backspace"); await p.waitForTimeout(100);
  r = await p.evaluate(() => S.polyDraft && S.polyDraft.pts.length);
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  const r2 = await p.evaluate(() => ({ draft: S.polyDraft, mode: S.mode, n: (P().annos || []).filter(a => a.t === "poly").length }));
  check("Backspace takes the last corner off, Escape stops with nothing made (and puts the tool away)", r === 1 && !r2.draft && r2.n === 2 && r2.mode === "zoom", JSON.stringify([r, r2]));
  await p.evaluate(() => { pickShape("poly"); }); await p.waitForTimeout(100);
  for (const [fx, fy] of [[0.1, 0.8], [0.3, 0.85]]) { const [x, y] = await at(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(600); }
  await p.keyboard.press("Enter"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ toast: document.querySelector("#toast").textContent, n: (P().annos || []).filter(a => a.t === "poly").length }));
  check("…and two corners are not a polygon, said in words", /three corners/.test(r.toast) && r.n === 2, JSON.stringify(r));
  await p.evaluate(() => setMode("zoom"));
  // A curved arrow.
  const aid = await p.evaluate(() => { const v = S.geo.v, n = q => +q.toPrecision(6); return addAnno({ t: "arrow", x: n(v.x0 + (v.x1 - v.x0) * 0.3), y: n(v.y0 + (v.y1 - v.y0) * 0.3), x2: n(v.x0 + (v.x1 - v.x0) * 0.7), y2: n(v.y0 + (v.y1 - v.y0) * 0.3) }); });
  await p.waitForTimeout(200);
  r = await p.evaluate(aid => { const it = annoMenuItems(aid).find(i => i && i.label === "Curve"); it.sub().find(i => i.label === "Curved to the left").run(); return null; }, aid); await p.waitForTimeout(300);
  r = await p.evaluate(aid => ({ bend: annoById(aid).bend, q: /Q/.test(document.querySelector(`#plot g[data-anno="${aid}"] path`).getAttribute("d")) }), aid);
  check("an arrow's Curve menu bends it: a quadratic curve, the head along it", r.bend === -0.3 && r.q, JSON.stringify(r));
  await p.evaluate(aid => { S.annoSel = aid; renderPlot(); }, aid); await p.waitForTimeout(150);
  r = await p.evaluate(aid => { const h = document.querySelector(`#plot g[data-anno="${aid}"] [data-ah="b"]`); if (!h) return null; const b = document.querySelector("#plot").getBoundingClientRect(), x = +h.getAttribute("x") + 4, y = +h.getAttribute("y") + 4; return { x: b.left + x, y: b.top + y }; }, aid);
  check("…selected, a diamond at its middle to curve it by hand", !!r, JSON.stringify(r));
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x, r.y + 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
  r = await p.evaluate(aid => annoById(aid).bend, aid);
  check("…dragged downward across the chord, it bends the other way (to the right)", typeof r === "number" && r > 0, JSON.stringify(r));
  await p.evaluate(aid => { annoMenuItems(aid).find(i => i && i.label === "Swap its ends").run(); }, aid); await p.waitForTimeout(200);
  const r3 = await p.evaluate(aid => annoById(aid).bend, aid);
  check("…swapping its ends keeps the same curve (the bend turned round)", Math.abs(r3 + r) < 1e-9, JSON.stringify([r, r3]));
  r = await p.evaluate(async () => { const pic = handPic(600, 400, 1).svg, v = await svgToVector(pic, { kind: "pdf", wPt: 400, hPt: 280, title: "t" }); return { q: /Q/.test(pic), size: v && v.blob ? v.blob.size : 0 }; });
  check("…in an export, and a PDF of it", r.q && r.size > 500, JSON.stringify(r));
}, { name: "polygons and curved arrows" });

console.log("Roadmap 5, slice 2: a break at a chosen place, each side its own scale");
await page(async p => {
  await three(p);
  // X runs from 0 to 29.5; leave out 10 to 20.
  const gapMid = () => p.evaluate(() => { const g = S.geo, sx = g.sx; return { mid: (g.X(15) - g.L) / g.pw, segs: sx.segs.map(s => [s.a, s.b, +s.t0.toFixed(4), +s.t1.toFixed(4)]), gaps: sx.gaps.length }; });
  await p.evaluate(() => { setAxisKeys("x", { brk: [[10, 20]] }); }); await p.waitForTimeout(300);
  const prop = await gapMid();
  await p.evaluate(() => { breakDlg("x"); }); await p.waitForTimeout(400);
  let r = await p.evaluate(() => ({ field: !!document.querySelector("#fdBt"), ph: (document.querySelector("#fdBt") || {}).placeholder }));
  check("Break the axis… has Gap at, empty meaning in proportion", r.field && /proportion/.test(r.ph), JSON.stringify(r));
  await p.fill("#fdBa", "10"); await p.fill("#fdBb", "20"); await p.fill("#fdBt", "120");
  r = await p.evaluate(() => document.querySelector("#formOk").disabled);
  check("…a place outside 5 to 95 % is refused", r === true, JSON.stringify(r));
  await p.fill("#fdBt", "75"); await p.click("#formOk"); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ brk: GP().ax.x.brk, log: JSON.stringify(P().log.slice(-1)[0]) }));
  check("…a place of 75 % kept with the break, said in the log", r.brk.some(q => q[0] === 10 && q[1] === 20 && q[2] === 0.75) && /75 % along it/.test(r.log), JSON.stringify(r));
  // The dialog added a second, equal break; keep one, placed.
  await p.evaluate(() => { setAxisKeys("x", { brk: [[10, 20, 0.75]] }); }); await p.waitForTimeout(300);
  const placed = await gapMid();
  check("in proportion the gap sits where the values put it; placed, its middle is 75 % along the axis", Math.abs(prop.mid - 0.75) > 0.1 && Math.abs(placed.mid - 0.75) < 0.01, JSON.stringify([prop.mid, placed.mid]));
  r = await p.evaluate(() => { const g = S.geo, s = g.sx.segs, r0 = (s[0].t1 - s[0].t0) / (s[0].b - s[0].a), r1 = (s[1].t1 - s[1].t0) / (s[1].b - s[1].a); return { r0, r1 }; });
  check("…each side with a scale of its own: the left stretch (0–10) wider per unit than the right (20–29.5)", r.r0 > 1.5 * r.r1, JSON.stringify(r));
  r = await p.evaluate(() => { const t = [...document.querySelectorAll("#plot text")].map(e => +e.textContent).filter(Number.isFinite); return { left: t.filter(v => v <= 10).length, right: t.filter(v => v >= 20 && v <= 30).length, pic: /class="brk"/.test(handPic(600, 400, 1).svg) }; });
  check("…numbered on both sides, and the break in an export", r.left >= 2 && r.right >= 2 && r.pic, JSON.stringify(r));
  // Reversed, the place still counts from the low end.
  await p.evaluate(() => { setPlotKey("revX", true); }); await p.waitForTimeout(300);
  r = await gapMid();
  check("…on a reversed axis, still 75 % from the low end (25 % from the left)", Math.abs(r.mid - 0.25) < 0.01, JSON.stringify(r.mid));
  await p.evaluate(() => { setPlotKey("revX", false); }); await p.waitForTimeout(200);
  // The Format pane's axis page.
  await p.evaluate(() => { openPlotDetails(null, "ax:x"); }); await p.waitForTimeout(500);
  r = await p.evaluate(() => (document.querySelector("#pdxbk0c") || {}).value);
  check("the Format pane lists the break with its place, 75 %", r === "75", JSON.stringify(r));
  await p.fill("#pdxbk0c", "30"); await p.press("#pdxbk0c", "Enter"); await p.waitForTimeout(800);
  r = await p.evaluate(() => ({ at: ((GP().ax.x.brk || [])[0] || [])[2] }));
  const m30 = await gapMid();
  check("…typed 30 %, the gap moves there", r.at === 0.3 && Math.abs(m30.mid - 0.3) < 0.01, JSON.stringify([r, m30.mid]));
  await p.fill("#pdxbk0c", ""); await p.press("#pdxbk0c", "Enter"); await p.waitForTimeout(800);
  const back = await gapMid();
  check("…emptied, back in proportion", Math.abs(back.mid - prop.mid) < 0.005, JSON.stringify([back.mid, prop.mid]));
  await p.evaluate(() => closeWin("format")); await p.waitForTimeout(200);
  // Places that would cross are not used; junk from storage reads as in proportion.
  await p.evaluate(() => { setAxisKeys("x", { brk: [[5, 8, 0.8], [20, 22, 0.2]] }); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const g = S.geo; return [(g.X(6.5) - g.L) / g.pw, (g.X(21) - g.L) / g.pw]; });
  check("two places that would cross are not used: the gaps keep their order", r[0] < r[1], JSON.stringify(r));
  await p.evaluate(() => { setAxisKeys("x", { brk: [[10, 20, "x"], [24, 26, 7]] }); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => brkList(GP().ax.x.brk, 0, 29.5, false));
  check("…and a place that does not read is none", JSON.stringify(r) === "[[10,20],[24,26]]", JSON.stringify(r));
}, { name: "a break at a chosen place" });

console.log("Roadmap 5, slice 3: the graph's own fonts in a PDF");
await page(async p => {
  const { existsSync, writeFileSync, readFileSync: rd } = await import("node:fs"), { execFileSync } = await import("node:child_process"), { tmpdir } = await import("node:os");
  const F = "/usr/share/fonts/truetype/", ttf = { "400-normal": "dejavu/DejaVuSans.ttf", "700-normal": "dejavu/DejaVuSans-Bold.ttf", "400-italic": "dejavu/DejaVuSans-Oblique.ttf", "700-italic": "dejavu/DejaVuSans-BoldOblique.ttf" };
  const serif = { "400-normal": "liberation/LiberationSerif-Regular.ttf", "700-normal": "liberation/LiberationSerif-Bold.ttf", "400-italic": "liberation/LiberationSerif-Italic.ttf", "700-italic": "liberation/LiberationSerif-BoldItalic.ttf" };
  if (!existsSync(F + ttf["400-normal"]) || !existsSync(F + serif["400-normal"])) { check("TrueType fonts on this machine to stand in for the web's (skipped)", true); return; }
  const asked = [];
  // Fontsource's TrueType files, served from this machine; Lato as a CFF font (which cannot be embedded this way).
  await p.route(/cdn\.jsdelivr\.net\/fontsource\//, r => { const u = r.request().url(); asked.push(u); const m = /fonts\/([a-z0-9-]+)@[^/]+\/latin-(\d+-(?:normal|italic))\.ttf/.exec(u);
    if (!m) return r.abort(); if (m[1] === "lato") return r.fulfill({ status: 200, contentType: "font/otf", body: rd("/usr/share/fonts/opentype/inter/Inter-Thin.otf") });
    const set = /serif/.test(m[1]) ? serif : ttf; return r.fulfill({ status: 200, contentType: "font/ttf", body: rd(F + set[m[2]]) }); });
  await three(p);
  const pdfOf = () => p.evaluate(async () => { const r = await svgToVector(handPic(600, 400, 1).svg, { kind: "pdf", wPt: 400, hPt: 280, title: "Fonts" }), b = new Uint8Array(await r.blob.arrayBuffer());
    let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return { b64: btoa(s), emb: r.emb, fell: r.fell, miss: r.miss, note: vecFontNote(r) }; });
  const save = (b64, nm) => { const f = tmpdir() + "/kurve-" + nm + ".pdf"; writeFileSync(f, Buffer.from(b64, "base64")); return f; };
  let r = await pdfOf(); const f1 = save(r.b64, "fonts");
  check("the graph's web fonts asked for as TrueType from Fontsource, the Latin subset", asked.some(u => /source-sans-3@latest\/latin-400-normal\.ttf$/.test(u)), JSON.stringify(asked.slice(0, 4)));
  check("…embedded, and said so", r.emb.includes("Source Sans 3") && !r.fell.length && /Source Sans 3/.test(r.note) && /embedded/.test(r.note), JSON.stringify([r.emb, r.fell, r.note]));
  let pf = ""; try { pf = execFileSync("pdffonts", [f1]).toString(); } catch (e) { pf = "ERR " + e.message; }
  check("pdffonts: CID TrueType fonts, embedded, under their own names", /DejaVuSans\s+CID TrueType\s+Identity-H\s+yes/.test(pf), pf);
  let tx = ""; try { tx = execFileSync("pdftotext", [f1, "-"]).toString(); } catch (e) { tx = "ERR"; }
  check("…and the text reads back (searchable, copyable): numbers and the axis titles", /\b10\b/.test(tx) && /Time/.test(tx) && /Small/.test(tx), JSON.stringify(tx.slice(0, 200)));
  let info = ""; try { info = execFileSync("pdfinfo", [f1]).toString(); } catch (e) { info = "ERR " + e.message; }
  check("…a PDF pdfinfo reads, with no errors", /Pages:\s+1/.test(info) && !/Error/.test(info), info.slice(0, 200));
  // A face that is not TrueType: the standard fonts stand in for it, and the message says so.
  await p.evaluate(() => { setPlotKey("fontFam", "lato"); }); await p.waitForTimeout(400);
  r = await pdfOf(); const f2 = save(r.b64, "fonts2");
  try { pf = execFileSync("pdffonts", [f2]).toString(); } catch (e) { pf = "ERR"; }
  check("a CFF face (Lato here) is not embedded: the standard fonts stand in, said in the message", r.fell.some(f => /^Lato/.test(f)) && /Lato could not be fetched/.test(r.note) && /Helvetica/.test(pf), JSON.stringify([r.fell, r.note, pf.slice(0, 300)]));
  // Offline: every face falls back, and the PDF is still whole.
  await p.unroute(/cdn\.jsdelivr\.net\/fontsource\//); await p.route(/cdn\.jsdelivr\.net\/fontsource\//, rr => rr.abort());
  await p.evaluate(() => { setPlotKey("fontFam", "inter"); }); await p.waitForTimeout(400);
  r = await pdfOf(); const f3 = save(r.b64, "fonts3");
  try { info = execFileSync("pdfinfo", [f3]).toString(); } catch (e) { info = "ERR"; }
  check("offline, the fonts stand in and the PDF is whole", r.fell.length > 0 && !r.emb.includes("Inter") && /Pages:\s+1/.test(info), JSON.stringify([r.fell, r.emb]));
  r = await p.evaluate(async () => { const v = await svgToVector(handPic(600, 400, 1).svg, { kind: "eps", wPt: 400, hPt: 280 }); return { size: v.blob.size, emb: v.emb }; });
  check("an EPS keeps the standard fonts, asking for nothing", r.size > 500 && !(r.emb || []).length, JSON.stringify(r));
}, { name: "the graph's own fonts in a PDF" });

console.log("Roadmap 6, slice 1: the undo list");
await page(async p => {
  const id = await three(p);
  // Four changes: two colours, a text, the grid.
  await p.evaluate(id => { setSeriesStyle(id.B, { color: "#aa0000" }, "made B red"); setSeriesStyle(id.C, { color: "#00aa00" }, "made C green");
    addAnno({ t: "text", x: 5, y: 0.5, text: "Note" }); setPlotKey("grid", true, "showed the grid"); }, id); await p.waitForTimeout(400);
  let r = await p.evaluate(() => { const it = menuItems("edit").find(i => i && i.label === "Undo list…"); return { has: !!it, en: it && it.enabled !== false, list: undoListItems().map(i => typeof i === "string" ? i : (i.group ? "#" + i.group : i.label + "|" + (i.note || ""))) }; });
  check("Edit › Undo list…: every change, the newest first, with when it was made", r.has && r.en && r.list[0] === "#Undo" && /^Changing the plot\|just now$/.test(r.list[1]) && /^Adding text/.test(r.list[2]) && r.list.filter(q => /^Changing the plot style/.test(q)).length === 2, JSON.stringify(r));
  await p.evaluate(() => { menuItems("edit").find(i => i && i.label === "Undo list…").run(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const m = document.querySelector(".menu"); return m ? [...m.querySelectorAll("[role=menuitem]")].map(e => e.textContent.trim()).slice(0, 6) : null; });
  check("…opened as a list by the Undo button", r && r.length >= 4 && /Changing the plot/.test(r[0]), JSON.stringify(r));
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  // The third: undoes it and the two after it.
  await p.evaluate(() => { undoListItems().filter(i => i && i.run)[2].run(); }); await p.waitForTimeout(500);
  r = await p.evaluate(id => ({ grid: !!GP().grid, anno: (P().annos || []).some(a => a.text === "Note"), b: ((GP().series || {})[id.B] || {}).color || null, c: ((GP().series || {})[id.C] || {}).color || null, toast: document.querySelector("#toast").textContent }), id);
  check("choosing the third undoes it and the two after it: the grid, the text and C's colour go, B's stays", !r.grid && !r.anno && r.c !== "#00aa00" && r.b === "#aa0000" && /Undid 3 changes, back to before changing the plot style/.test(r.toast), JSON.stringify(r));
  r = await p.evaluate(() => undoListItems().map(i => typeof i === "string" ? i : (i.group ? "#" + i.group : i.label)));
  check("…the three are listed to redo, the oldest of them last", r.includes("#Redo") && r[r.length - 1] === "Changing the plot", JSON.stringify(r));
  await p.evaluate(() => { const its = undoListItems(), k = its.findIndex(i => i && i.group === "Redo"); its.slice(k + 1)[1].run(); }); await p.waitForTimeout(500);
  r = await p.evaluate(id => ({ grid: !!GP().grid, anno: (P().annos || []).some(a => a.text === "Note"), c: ((GP().series || {})[id.C] || {}).color || null }), id);
  check("redoing the second redoes it and the one before it: C's colour and the text, not the grid", !r.grid && r.anno && r.c === "#00aa00", JSON.stringify(r));
  // A right-click on the Undo button opens it too.
  await p.click("#undoBtn", { button: "right" }); await p.waitForTimeout(300);
  r = await p.evaluate(() => !!document.querySelector(".menu") && [...document.querySelectorAll(".menu [role=menuitem]")].length);
  check("a right-click on the Undo button opens the list", r >= 3, JSON.stringify(r));
  await p.keyboard.press("Escape");
}, { name: "the undo list" });

console.log("Roadmap 6, slice 2: the flow chart's zoom and wrapped lanes");
await page(async p => {
  // Twelve columns, each with two steps; the first with three.
  const ids = await p.evaluate(async () => {
    const x = Array.from({ length: 50 }, (_, i) => i), X = makeCol("x", "t", "s", x), cols = [X];
    for (let k = 0; k < 12; k++) cols.push(Object.assign(makeCol("y", "S" + (k + 1), "", x.map(v => Math.sin(v / 5 + k))), { pipe: [makeStep("scale", { f: 2 }), makeStep("smooth", Object.assign({}, PIPE_OPS.smooth.defaults))], mask: [] }));
    cols[1].pipe.push(makeStep("norm", Object.assign({}, PIPE_OPS.norm.defaults)));
    await createProject(Object.assign(blankProject("Many lanes"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    plotCols([cols[1].id], {}); return cols.slice(1).map(c => c.id); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { prefSet("anim", false); applyAnim(); openWin("flow", { render: true }); S.flowTab = "flow"; renderFlow(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { renderFlow(); }); await p.waitForTimeout(300);
  let r = await p.evaluate(() => { const L = flowLayout(), sc = document.querySelector("#flowWin .flow-scroll"), cv = document.querySelector("#flowWin .flow-canvas");
    return { per: S.flowPer, maxCol: Math.max(...L.nodes.map(n => n.col)), bands: Math.max(...L.nodes.map(n => n.band || 0)), W: parseFloat(cv.style.width), sw: sc.clientWidth, lanes: L.lanes }; });
  check("twelve lanes wrap into bands that fit across the view", r.per >= 2 && r.per < 12 && r.maxCol < r.per && r.bands >= 1 && r.W <= r.sw + 220, JSON.stringify(r));
  await p.click("#fPack"); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ maxCol: Math.max(...flowLayout().nodes.map(n => n.col)), pressed: document.querySelector("#fPack").getAttribute("aria-pressed") }));
  check("Wrap lanes off: one lane after another, twelve across", r.maxCol === 11 && r.pressed === "false", JSON.stringify(r));
  await p.click("#fPack"); await p.waitForTimeout(300);
  // Zoom.
  await p.click("#fZoomOut"); await p.waitForTimeout(250);
  r = await p.evaluate(() => ({ z: S.flowZ, css: document.querySelector("#flowWin .flow-canvas").style.zoom, lab: document.querySelector("#fZoom").textContent }));
  check("zoom out: the chart at 80 %, said on the button", r.z === 0.8 && r.css === "0.8" && /80 %/.test(r.lab), JSON.stringify(r));
  await p.click("#fZoom"); await p.waitForTimeout(250);
  r = await p.evaluate(() => S.flowZ);
  check("…the size button back to 100 %", r === 1, JSON.stringify(r));
  await p.click("#fZoomFit"); await p.waitForTimeout(250);
  r = await p.evaluate(() => { const sc = document.querySelector("#flowWin .flow-scroll"); return { z: S.flowZ, fits: sc.scrollHeight <= sc.clientHeight + 2 && sc.scrollWidth <= sc.clientWidth + 2 }; });
  check("Fit: the whole chart in view", r.z < 1 && r.fits, JSON.stringify(r));
  const zFit = r.z;
  r = await p.evaluate(() => { const b = document.querySelector("#flowWin .flow-scroll").getBoundingClientRect(); return { x: b.left + 40, y: b.top + 40 }; });
  await p.mouse.move(r.x, r.y); await p.keyboard.down("Control"); await p.mouse.wheel(0, -200); await p.keyboard.up("Control"); await p.waitForTimeout(300);
  r = await p.evaluate(() => S.flowZ);
  check("Ctrl and the wheel zoom in", r > zFit, JSON.stringify([zFit, r]));
  // A step dragged while zoomed lands where it is dropped.
  await p.evaluate(() => setFlowZoom(0.8)); await p.waitForTimeout(300);
  const before = await p.evaluate(id => colById(id).pipe.map(s => s.op).join(), ids[0]);
  const pos = await p.evaluate(id => { const c = colById(id), a = document.querySelector(`#flowWin [data-node="step:${c.pipe[0].id}"]`), b = document.querySelector(`#flowWin [data-node="step:${c.pipe[1].id}"]`); a.scrollIntoView({ block: "center" });
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return { x: ra.left + ra.width / 2, y: ra.top + ra.height / 2, y2: rb.top + rb.height * 0.85 }; }, ids[0]);
  await p.mouse.move(pos.x, pos.y); await p.mouse.down(); await p.mouse.move(pos.x, pos.y + 10, { steps: 3 }); await p.mouse.move(pos.x, pos.y2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(500);
  const after = await p.evaluate(id => colById(id).pipe.map(s => s.op).join(), ids[0]);
  check("a step dragged below the next one at 80 % moves one place down", before === "scale,smooth,norm" && after === "smooth,scale,norm", JSON.stringify([before, after]));
  r = await p.evaluate(id => { const L = flowLayout(), n = L.nodes.find(q => q.kind === "step" && q.s.id === colById(id).pipe[0].id), it = stepMenuItems(n.s); return { head: it[0].group, later: (it.find(i => i && i.label === "Move later") || {}).enabled }; }, ids[0]);
  check("…and a step's right-click menu after a save knows where the step is (step 1 of S1, Move later on)", /^Step 1 of S1/.test(r.head) && r.later === true, JSON.stringify(r));
  // Remembered in this browser.
  await p.waitForTimeout(200); await p.reload(); await ready(p); await p.waitForTimeout(400);
  r = await p.evaluate(() => flowZoom());
  check("the zoom is remembered across a reload", r === 0.8, JSON.stringify(r));
}, { name: "the flow chart's zoom and wrapped lanes" });

console.log("Roadmap 6, slice 3: annotations and peaks by the keys");
await page(async p => {
  await p.evaluate(async () => {
    const x = Array.from({ length: 201 }, (_, i) => i * 0.5), y = x.map(v => 100 * Math.exp(-((v - 30) ** 2) / 8) + 60 * Math.exp(-((v - 70) ** 2) / 12) + 2);
    const X = makeCol("x", "Shift", "cm-1", x), Y = Object.assign(makeCol("y", "Signal", "", y), { pipe: [], mask: [] });
    const pr = Object.assign(blankProject("Keys"), { cols: [X, Y], activeY: Y.id });
    pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [Y.id], plot: { style: "auto" } }];
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => { prefSet("anim", false); applyAnim(); addAnno({ t: "text", x: 50, y: 80, text: "Note" }); addAnno({ t: "v", x: 85 }); });
  await p.waitForTimeout(300);
  // In the order they are drawn: lines under text.
  const ids = await p.evaluate(() => { S.annoSel = null; renderPlot(); return kbTargets().map(t => t.anno); });
  await p.focus("#plot"); await p.keyboard.press("Tab"); await p.waitForTimeout(150);
  let r = await p.evaluate(() => ({ sel: S.annoSel, say: document.querySelector("#plotSay").textContent, focus: document.activeElement && document.activeElement.id }));
  check("Tab on the graph selects its first annotation (the line, drawn under the text), said with its place among them", r.sel === ids[0] && /^A vertical line at x = 85, 1 of 2\./.test(r.say) && r.focus === "plot", JSON.stringify(r));
  const posOf = id => p.evaluate(id => { const a = annoById(id), g = S.geo; return a.t === "v" ? g.X(a.x) : g.X(a.x) + "," + g.Y(a.y); }, id);
  await p.keyboard.press("Tab"); await p.waitForTimeout(150);
  check("Tab again: the text", (await p.evaluate(() => S.annoSel)) === ids[1], "");
  const at0 = await posOf(ids[1]), u0 = await p.evaluate(() => undoStack.length);
  for (let i = 0; i < 3; i++) await p.keyboard.press("ArrowRight");
  await p.keyboard.press("Shift+ArrowRight"); await p.keyboard.press("ArrowUp"); await p.waitForTimeout(200);
  const at1 = await posOf(ids[1]), u1 = await p.evaluate(() => undoStack.length);
  const [ax0, ay0] = at0.split(",").map(Number), [ax1, ay1] = at1.split(",").map(Number);
  check("the arrows move the text a pixel at a time, Shift ten: 13 right and 1 up, as one undo step", Math.abs(ax1 - ax0 - 13) < 0.6 && Math.abs(ay1 - ay0 + 1) < 0.6 && u1 === u0 + 1, JSON.stringify([at0, at1, u0, u1]));
  r = await p.evaluate(() => P().log.slice(-1)[0].text);
  check("…and the log says it once", /moved the text "Note" with the keys/.test(r), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo puts it back", (await posOf(ids[1])) === at0, JSON.stringify([at0, await posOf(ids[1])]));
  await p.evaluate(() => { S.annoSel = null; renderPlot(); }); await p.focus("#plot"); await p.keyboard.press("Tab"); await p.waitForTimeout(150);
  r = await p.evaluate(() => S.annoSel);
  const v0 = await posOf(ids[0]);
  await p.keyboard.press("Shift+ArrowLeft"); await p.waitForTimeout(200);
  const v1 = await posOf(ids[0]);
  check("the line again, and Shift+← moves it ten pixels left", r === ids[0] && Math.abs(+v1 - +v0 + 10) < 0.6, JSON.stringify([r, v0, v1]));
  // Peaks being set up come after the annotations.
  await p.evaluate(() => { S.annoSel = null; S.fitMode = "peaks"; showTab("fit"); addPeakAt(30); addPeakAt(70); S.selPeak = null; renderPlot(); });
  await p.waitForTimeout(400);
  await p.focus("#plot"); for (let i = 0; i < 3; i++) await p.keyboard.press("Tab"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ pk: S.selPeak, an: S.annoSel, say: document.querySelector("#plotSay").textContent }));
  check("after the annotations, Tab selects the first peak being set up", r.pk === 0 && !r.an && /^Peak 1/.test(r.say), JSON.stringify(r));
  const pkOf = () => p.evaluate(() => { const d = S.pdraft, m = pdraftModel(), o = m.offsets[0], def = PEAKS[d.peaks[0].type], pv = d.init.slice(o, o + def.params.length); return { xc: pv[0], h: def.height(pv), w: Math.abs(peakFWHM(def, pv)), px: S.geo.X(pv[0]) }; });
  const k0 = await pkOf(), uk0 = await p.evaluate(() => undoStack.length);
  for (let i = 0; i < 4; i++) await p.keyboard.press("ArrowRight");
  await p.keyboard.press("Shift+ArrowUp"); await p.waitForTimeout(150);
  const k1 = await pkOf();
  for (let i = 0; i < 3; i++) await p.keyboard.press("]");
  await p.waitForTimeout(150);
  const k2 = await pkOf(), uk2 = await p.evaluate(() => undoStack.length);
  check("→ moves the peak's centre four pixels, Shift+↑ raises it, ] widens it", Math.abs(k1.px - k0.px - 4) < 0.8 && k1.h > k0.h && k2.w > k1.w && Math.abs(k2.xc - k1.xc) < 1e-9 && uk2 === uk0 + 1, JSON.stringify([k0, k1, k2, uk0, uk2]));
  await p.keyboard.press("["); await p.keyboard.press("["); await p.waitForTimeout(150);
  const k3 = await pkOf();
  check("[ narrows it again", k3.w < k2.w, JSON.stringify([k2.w, k3.w]));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  const k4 = await pkOf();
  check("one undo takes the whole burst back", Math.abs(k4.xc - k0.xc) < 1e-9 && Math.abs(k4.h - k0.h) < 1e-9 * Math.abs(k0.h) + 1e-12 && Math.abs(k4.w - k0.w) < 1e-9, JSON.stringify([k0, k4]));
  // Past the last, the focus moves on and nothing stays selected.
  await p.evaluate(() => { S.selPeak = 1; renderPlot(); }); await p.focus("#plot");
  await p.keyboard.press("Tab"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ pk: S.selPeak, an: S.annoSel, focus: document.activeElement && document.activeElement.id }));
  check("Tab past the last peak lets the focus go on, and lets go of the peak", r.pk == null && !r.an && r.focus !== "plot", JSON.stringify(r));
  await p.focus("#plot"); await p.keyboard.press("Shift+Tab"); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ pk: S.selPeak, an: S.annoSel }));
  check("Shift+Tab with nothing selected leaves the graph too", r.pk == null && !r.an, JSON.stringify(r));
  await p.focus("#plot"); await p.keyboard.press("Tab"); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ an: S.annoSel, say: document.querySelector("#plotSay").textContent }));
  check("Esc lets go of what Tab selected", !r.an && /Nothing selected/.test(r.say), JSON.stringify(r));
  // Read-only: nothing moves.
  r = await p.evaluate(id => { S.readOnly = true; S.annoSel = id; const a = annoById(id), x = a.x; const ev = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }); document.querySelector("#plot").dispatchEvent(ev); const same = annoById(id).x === x; S.readOnly = false; S.annoSel = null; return same; }, ids[0]);
  check("a viewer's arrows move nothing", r === true, JSON.stringify(r));
}, { name: "annotations and peaks by the keys" });

console.log("Roadmap 6, slice 4: a peak's shape by its own handle");
await page(async p => {
  await p.evaluate(async () => {
    const x = Array.from({ length: 201 }, (_, i) => i * 0.5), y = x.map(v => 100 * Math.exp(-((v - 30) ** 2) / 8) + 60 / (1 + ((v - 70) / 3) ** 2) + 2);
    const X = makeCol("x", "Shift", "cm-1", x), Y = Object.assign(makeCol("y", "Signal", "", y), { pipe: [], mask: [] });
    const pr = Object.assign(blankProject("Shapes"), { cols: [X, Y], activeY: Y.id });
    pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [Y.id], plot: { style: "auto" } }];
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    prefSet("anim", false); applyAnim(); S.fitMode = "peaks"; showTab("fit"); addPeakAt(30); addPeakAt(70); setPeakShape(0, "psdvoigt"); setPeakShape(1, "fano"); S.selPeak = 0; renderPlot();
  });
  await p.waitForTimeout(500);
  const st = () => p.evaluate(k => { const d = S.pdraft, m = pdraftModel(), o = m.offsets[k], def = PEAKS[d.peaks[k].type], pv = d.init.slice(o, o + def.params.length), sp = shapeParOf(d.peaks[k].type);
    const h = (S.geo.handles || []).find(q => q.k === k && q.kind === "s"); return { v: pv[sp.i], h: def.height(pv), w: Math.abs(peakFWHM(def, pv)), hd: h ? { x: h.x, y: h.y, x0: h.x0, x1: h.x1 } : null }; }, 0);
  let a = await st();
  check("the selected pseudo-Voigt has a diamond on a track, at its Lorentzian fraction", !!a.hd && Math.abs((a.hd.x - a.hd.x0) / (a.hd.x1 - a.hd.x0) - a.v) < 0.01, JSON.stringify(a));
  let r = await p.evaluate(() => document.querySelector('#plot [data-h="0:s"] title').textContent);
  check("…named in its tooltip", /^Lorentzian fraction 0\.5: drag sideways/.test(r), JSON.stringify(r));
  // Drag it to the right end: all Lorentzian, the height kept.
  const box = await p.evaluate(() => { const b = document.querySelector("#plot").getBoundingClientRect(), v = document.querySelector("#plot").viewBox.baseVal; return { l: b.left, t: b.top, k: b.width / (v && v.width || b.width) }; });
  const sx = q => box.l + q * box.k, sy = q => box.t + q * box.k;
  const u0 = await p.evaluate(() => undoStack.length);
  await p.mouse.move(sx(a.hd.x), sy(a.hd.y)); await p.mouse.down(); await p.mouse.move(sx(a.hd.x + 10), sy(a.hd.y), { steps: 3 }); await p.mouse.move(sx(a.hd.x1 + 20), sy(a.hd.y), { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  let b = await st(); const u1 = await p.evaluate(() => undoStack.length);
  check("dragged past the right end: a Lorentzian (fraction 1), the height and FWHM kept, one undo step", b.v === 1 && Math.abs(b.h - a.h) < 1e-6 * Math.abs(a.h) && Math.abs(b.w - a.w) < 1e-6 * a.w && u1 === u0 + 1, JSON.stringify([a, b, u0, u1]));
  // The keys: , and . a fiftieth of the track; < and > ten.
  await p.focus("#plot"); await p.keyboard.press(","); await p.keyboard.press(","); await p.waitForTimeout(150);
  b = await st();
  check(", , takes it back two fiftieths (0.96)", Math.abs(b.v - 0.96) < 1e-9, JSON.stringify(b));
  await p.keyboard.press("<"); await p.waitForTimeout(150); b = await st();
  check("< takes ten more (0.76)", Math.abs(b.v - 0.76) < 1e-9, JSON.stringify(b));
  r = await p.evaluate(() => document.querySelector("#plotSay").textContent);
  check("…and says it", /Lorentzian fraction 0\.76/.test(r), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(250); b = await st();
  check("one undo takes the keys' burst back (to 1)", b.v === 1, JSON.stringify(b));
  // A Fano: 1/q from −0.9 to 0.9, zero marked and caught.
  await p.evaluate(() => { S.selPeak = 1; renderPlot(); }); await p.waitForTimeout(200);
  const fq = await p.evaluate(() => { const d = S.pdraft, m = pdraftModel(), o = m.offsets[1], sp = shapeParOf("fano"), h = S.geo.handles.find(q => q.k === 1 && q.kind === "s"); return { v: d.init[o + sp.i], h, zero: !!document.querySelector('#plot [data-h="1:s"] path:nth-of-type(2)') }; });
  check("a Fano's diamond, its zero marked", !!fq.h && fq.zero && Math.abs((fq.h.x - fq.h.x0) / (fq.h.x1 - fq.h.x0) - (fq.v + 0.9) / 1.8) < 0.01, JSON.stringify(fq));
  const mid = (fq.h.x0 + fq.h.x1) / 2;
  await p.mouse.move(sx(fq.h.x), sy(fq.h.y)); await p.mouse.down(); await p.mouse.move(sx(fq.h.x - 8), sy(fq.h.y), { steps: 3 }); await p.mouse.move(sx(mid + 1.5), sy(fq.h.y), { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const d = S.pdraft, o = pdraftModel().offsets[1]; return d.init[o + 3]; });
  check("dragged within 3 px of the middle, 1/q is caught at 0 (a Lorentzian)", r === 0, JSON.stringify(r));
  // A Gaussian has none; a fixed shape has none.
  await p.evaluate(() => { setPeakShape(1, "gauss"); S.selPeak = 1; renderPlot(); }); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ h: !!document.querySelector('#plot [data-h="1:s"]') }));
  await p.focus("#plot"); await p.keyboard.press("."); await p.waitForTimeout(100);
  const say = await p.evaluate(() => document.querySelector("#plotSay").textContent);
  check("a Gaussian has no diamond, and . says it has no shape of its own", !r.h && /no shape parameter/.test(say), JSON.stringify([r, say]));
  r = await p.evaluate(() => { const d = S.pdraft, o = pdraftModel().offsets[0]; d.fixed[o + 3] = true; S.selPeak = 0; renderPlot(); return !!document.querySelector('#plot [data-h="0:s"]'); });
  check("a fixed Lorentzian fraction has no diamond", r === false, JSON.stringify(r));
  await p.evaluate(() => { const d = S.pdraft, o = pdraftModel().offsets[0]; d.fixed[o + 3] = false; setPeakShape(0, "pearson7"); S.selPeak = 0; renderPlot(); }); await p.waitForTimeout(200);
  r = await p.evaluate(() => { const d = S.pdraft, o = pdraftModel().offsets[0], h = S.geo.handles.find(q => q.k === 0 && q.kind === "s"), sp = shapeParOf("pearson7"); return { v: d.init[o + 3], t: (h.x - h.x0) / (h.x1 - h.x0), want: Math.log(d.init[o + 3] / sp.lo) / Math.log(sp.hi / sp.lo) }; });
  check("a Pearson VII's m on a log scale", Math.abs(r.t - r.want) < 0.01, JSON.stringify(r));
}, { name: "a peak's shape by its own handle" });

console.log("Roadmap 7, slice 1: a parameter that follows the series in a global fit");
await page(async p => {
  await p.evaluate(async () => {
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, gn = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const x = Array.from({ length: 161 }, (_, i) => 60 + i * 0.5), X = makeCol("x", "Shift", "cm-1", x), cols = [X];
    [280, 290, 300, 310, 320].forEach((T, k) => cols.push(Object.assign(makeCol("y", "T" + T, "", x.map(v => 3 + (40 + 5 * k) * Math.exp(-0.5 * ((v - (100 + 0.4 * (T - 300))) / 3) ** 2) + 0.4 * gn())), { pipe: [], mask: [] })));
    const pr = Object.assign(blankProject("Series"), { cols, activeY: cols[3].id, series: { mode: "name", label: "Temperature", unit: "K", vals: {}, q: null, line: false } });
    pr.graphs = [{ id: newGid(), name: "Graph 1", cols: cols.slice(1).map(c => c.id), plot: { style: "auto" } }];
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    prefSet("anim", false); applyAnim(); S.fitMode = "curve"; showTab("fit"); chooseModel("gauss"); runFit();
  });
  await p.waitForTimeout(800);
  // The dialog offers a line and Arrhenius for each parameter, the series being a temperature.
  await p.evaluate(() => { openBatchDialog(); }); await p.waitForTimeout(400);
  let r = await p.evaluate(() => { const how = document.querySelector("#bfHow"); how.value = "global"; how.dispatchEvent(new Event("change", { bubbles: true }));
    const sel = document.querySelector("#bfP2"); return { opts: [...sel.options].map(o => o.value), lab: document.querySelector("#bfShare .lab").textContent }; });
  check("Fit every column, together: each parameter its own, shared, a line in the series or Arrhenius in it", JSON.stringify(r.opts) === '["own","same","lin","arr"]' && /or following temperature/.test(r.lab), JSON.stringify(r));
  r = await p.evaluate(() => { const set = (i, v) => { const el = document.querySelector("#bfP" + i); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
    set(0, "same"); set(1, "own"); set(2, "lin"); set(3, "same"); return document.querySelector("#bfCount").textContent; });
  check("…counted: the line is two numbers", /2 shared, 1 following the series \(two numbers each\), 1 for each column: 9 parameters fitted at once/.test(r), JSON.stringify(r));
  await p.evaluate(() => document.querySelector("#formOk").click());
  for (let i = 0; i < 40 && await p.evaluate(() => !!S.batchRun); i++) await p.waitForTimeout(250);
  await p.waitForTimeout(300);
  r = await p.evaluate(() => { const b = P().batch, g = b.glob, q = (g.follow || [])[0]; return { share: g.share, q, n: b.rows.filter(z => z.fit && z.fit.global && z.fit.follows && z.fit.follows[2] === "lin").length,
    xs: b.rows.map(z => z.fit && z.fit.params[2]), es: b.rows.map(z => z.fit && z.fit.errors[2]), fol: g.stats.fol }; });
  check("the centre follows a line: its slope recovered, every column's centre on it", r.q && r.q.kind === "lin" && Math.abs(r.q.b - 0.4) < 4 * r.q.sb && r.q.sb > 0 && r.n === 5 && r.fol === 1
    && r.xs.every((v, k) => Math.abs(v - (r.q.a + r.q.b * ([280, 290, 300, 310, 320][k] - r.q.u0))) < 1e-9) && JSON.stringify(r.share) === '[true,false,"lin",true]', JSON.stringify(r));
  r = await p.evaluate(() => ({ sum: document.querySelector("#w-batch .bsum").textContent, fol: (document.querySelector("#w-batch .bfol") || {}).textContent || "" }));
  check("the Batch window says what is shared and gives the line", /sharing .* and xc \(a straight line in temperature\)/.test(r.sum) && /^xc = .* cm.1 at 300 K, changing by .* cm.1 per K$/.test(r.fol), JSON.stringify(r));
  r = await p.evaluate(() => { const f = activeFit(); showDrawer("res"); renderResults(); const box = document.querySelector("#pane-res");
    return { follows: !!(f.follows && f.follows[2] === "lin"), mark: [...box.querySelectorAll(".shd")].map(e => e.textContent), stat: statsList(f).find(([k]) => k === "Follows the series") }; });
  check("Results marks the centre as following, and gives the line", r.follows && r.mark.includes("follows") && r.mark.filter(x => x === "shared").length === 2 && r.stat && /changing by/.test(r.stat[1]), JSON.stringify(r));
  // The CSV carries the line's numbers; the report says it.
  r = await p.evaluate(async () => { let txt = ""; const sf = saveFile; window.saveFile = async (n, d) => { txt = d; return true; }; try { await exportBatchCsv(); } finally { window.saveFile = sf; } return { csv: txt.split("\n").filter(l => /follows the series/.test(l)), rep: reportBatchHtml() }; });
  check("the CSV gives the line's numbers, and the report says it", r.csv.length === 1 && /straight line,value at,300,a,/.test(r.csv[0]) && /changing by/.test(r.rep), JSON.stringify(r.csv));
  // Fit again keeps the choice; Arrhenius refuses a series that is not a temperature.
  r = await p.evaluate(() => { setSeries({ unit: "min" }); const g = fitTogether(seriesCols().map(q => ({ c: q.c, seed: null })), P().batch.tmpl, [false, true, "arr", false]); setSeries({ unit: "K" }); return g.fail; });
  check("Arrhenius in a series that is not a temperature is refused in words", /needs the series to be a temperature, in K, °C or °F: it is in min/.test(r || ""), JSON.stringify(r));
  r = await p.evaluate(() => { setSeries({ unit: "°C" }); const t = P().batch.tmpl; const g = fitTogether(seriesCols().map(q => ({ c: q.c, seed: null })), t, [true, "arr", false, true]); setSeries({ unit: "K" }); return g.fail || (g.glob.follow[0].kind + " " + g.glob.follow[0].sunit + " " + (1 / g.glob.follow[0].u0).toFixed(1)); });
  check("…in °C it is turned into kelvin", /^arr K 5\d\d\.\d$/.test(r || ""), JSON.stringify(r));
  r = await p.evaluate(() => { setSeries({ mode: "order" }); const g = fitTogether(seriesCols().map(q => ({ c: q.c, seed: null })), P().batch.tmpl, [true, false, "lin", true]); setSeries({ mode: "name" }); return g.fail || g.glob.follow[0].sname; });
  check("a line in the order of the columns, when the series is their order", r === "the order of the columns", JSON.stringify(r));
}, { name: "a parameter that follows the series" });

console.log("Roadmap 7, slice 2: the files' header fields as rows of the worksheet");
await page(async p => {
  await p.evaluate(async () => {
    const x = Array.from({ length: 20 }, (_, i) => i), X = makeCol("x", "Shift", "cm-1", x), cols = [X];
    [[280, "2024-03-01 10:00"], [300, "2024-03-01 10:20"], [320, "2024-03-01 10:40"]].forEach(([T, at], k) => cols.push(Object.assign(makeCol("y", "Run " + (k + 1), "", x.map(v => v * (k + 1))), { pipe: k ? [] : [makeStep("scale", { f: 2 })], mask: [], file: "run" + (k + 1) + ".txt", meta: { Temperature: T + " K", Acquired: at, Operator: "AB", Exposure: k === 1 ? "" : "10 s" } })));
    await createProject(Object.assign(blankProject("Headers"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    prefSet("anim", false); applyAnim(); openWin("sheet", { render: true }); focusWin("sheet");
  });
  await p.waitForTimeout(400);
  await p.click("#ws [data-wsrows]"); await p.waitForTimeout(250);
  let r = await p.evaluate(() => [...document.querySelectorAll(".menu [role^=menuitem]")].map(e => e.textContent.trim()));
  check("the worksheet's ⋯ offers Header fields, with how many", r.some(t => /^Header fields\s*4$/.test(t)), JSON.stringify(r));
  await p.evaluate(() => { [...document.querySelectorAll(".menu [role^=menuitem]")].find(e => /^Header fields/.test(e.textContent.trim())).click(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => [...document.querySelectorAll("#ws tr.meta")].map(tr => [...tr.children].map(c => c.textContent)));
  check("a row per field, the most common first, each column's value as written", r.length === 4 && r[0][0] === "Acquired" && r.map(q => q[0]).join() === "Acquired,Operator,Temperature,Exposure" && r[2].slice(1, 5).join("|") === "|280 K|300 K|320 K" && r[3][3] === "", JSON.stringify(r));
  r = await p.evaluate(() => { const c = S.ws; return { r: c.r, c: c.c }; });
  await p.evaluate(() => { const th = [...document.querySelectorAll("#ws th[data-mkey]")].find(e => e.dataset.mkey === "Temperature"); th.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })); }); await p.waitForTimeout(250);
  const items = await p.evaluate(() => [...document.querySelectorAll(".menu [role^=menuitem]")].map(e => ({ t: e.textContent.trim(), dis: e.getAttribute("aria-disabled") === "true" })));
  check("a field's name gives its menu: use as the series, copy the row, hide", items.some(i => /^Use as the series/.test(i.t) && !i.dis) && items.some(i => i.t === "Copy the row") && items.some(i => i.t === "Hide the header fields"), JSON.stringify(items));
  await p.evaluate(() => { [...document.querySelectorAll(".menu [role^=menuitem]")].find(e => /^Use as the series/.test(e.textContent.trim())).click(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const s = seriesOf(); return { mode: s.mode, key: s.key, vals: seriesVals(yCols()), unit: seriesUnit(s), log: P().log.slice(-1)[0].text }; });
  check("Use as the series: the Batch window's series is now that field, in its unit, as one undo step", r.mode === "meta" && r.key === "Temperature" && r.vals.join() === "280,300,320" && r.unit === "K" && /using Temperature as the series/.test(r.log), JSON.stringify(r));
  await p.evaluate(() => undo()); await p.waitForTimeout(200);
  r = await p.evaluate(() => seriesOf().mode);
  check("…undone", r === "order", JSON.stringify(r));
  r = await p.evaluate(() => { const th = [...document.querySelectorAll("#ws th[data-mkey]")].find(e => e.dataset.mkey === "Operator"); th.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
    const it = [...document.querySelectorAll(".menu [role^=menuitem]")].find(e => /series/.test(e.textContent)); const out = { dis: it.disabled || it.getAttribute("aria-disabled") === "true", t: it.textContent.trim() }; document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return out; });
  check("a field that is not a number that differs cannot be the series, and says why", r.dis === true && /not numbers that differ/.test(r.t), JSON.stringify(r));
  // The rows are read only and do not move the selection.
  await p.keyboard.press("Escape");
  const sel0 = await p.evaluate(() => JSON.stringify([S.ws.r, S.ws.c]));
  await p.evaluate(() => { const td = document.querySelector("#ws tr.meta td:nth-child(3)"); td.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })); }); await p.waitForTimeout(150);
  r = await p.evaluate(() => JSON.stringify([S.ws.r, S.ws.c]));
  check("a press on a header value leaves the selection where it was", r === sel0, JSON.stringify([sel0, r]));
  // The Processed view has none; Hide takes them away.
  r = await p.evaluate(() => { setSheet("final"); const n = document.querySelectorAll("#ws tr.meta").length, k = S.wsm.kind; setSheet("raw"); return k === "final" ? n : "not the Processed view"; });
  check("the Processed view has no header rows", r === 0, JSON.stringify(r));
  await p.evaluate(() => wsRowsSet("meta", false)); await p.waitForTimeout(150);
  r = await p.evaluate(() => document.querySelectorAll("#ws tr.meta").length);
  check("Hide the header fields: gone", r === 0, JSON.stringify(r));
}, { name: "the files' header fields as rows" });

console.log("Roadmap 7, slice 3: global fits in a worker");
await page(async p => {
  const mk = (n, len) => p.evaluate(async ([n, len]) => {
    let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, gn = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const x = Array.from({ length: len }, (_, i) => 60 + i * 80 / len), X = makeCol("x", "Shift", "cm-1", x), cols = [X];
    for (let k = 0; k < n; k++) { const T = 280 + 40 * k / Math.max(1, n - 1); cols.push(Object.assign(makeCol("y", "T" + T.toFixed(1), "", x.map(v => 3 + (40 + k) * Math.exp(-0.5 * ((v - (100 + 0.4 * (T - 300))) / 3) ** 2) + 0.4 * gn())), { pipe: [], mask: [] })); }
    const pr = Object.assign(blankProject("Worker " + n), { cols, activeY: cols[1].id, series: { mode: "name", label: "Temperature", unit: "K", vals: {}, q: null, line: false } });
    pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [cols[1].id], plot: { style: "auto" } }];
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    prefSet("anim", false); applyAnim(); S.fitMode = "curve"; showTab("fit"); chooseModel("gauss"); runFit(); }, [n, len]);
  await mk(5, 161); await p.waitForTimeout(700);
  let r = await p.evaluate(async () => { const t = batchTemplate(activeFit()), share = [true, false, "lin", true];
    runBatch({ tmpl: t, seed: "tmpl", cols: yCols().map(c => c.id), share }); for (let i = 0; i < 100 && S.batchRun; i++) await new Promise(r => setTimeout(r, 100));
    const g = P().batch.glob, sync = fitTogether(seriesCols().map(q => ({ c: q.c, seed: P().batch.rows.find(z => z.col === q.c.id).fit.params })), t, share);
    return { worker: !!(GFW && GFW.w), b: g.follow[0].b, sb: g.follow[0].sb, sync: sync.glob && sync.glob.follow[0].b, rows: P().batch.rows.filter(z => z.fit && z.fit.global).length }; });
  check("the fit of them all together runs in a worker, and gives what the page would", r.worker && r.rows === 5 && Math.abs(r.b - 0.4) < 4 * r.sb && Math.abs(r.b - r.sync) < 0.05 * r.sb, JSON.stringify(r));
  r = await p.evaluate(async () => { GFW = false; const t = batchTemplate(activeFit()); runBatch({ tmpl: t, seed: "tmpl", cols: yCols().map(c => c.id), share: [true, false, "lin", true] });
    for (let i = 0; i < 100 && S.batchRun; i++) await new Promise(r => setTimeout(r, 100)); const g = P().batch.glob; GFW = null; return { b: g && g.follow[0].b, sb: g && g.follow[0].sb }; });
  check("where no worker can be made, the page fits them itself, to the same result", r.b != null && Math.abs(r.b - 0.4) < 4 * r.sb, JSON.stringify(r));
  // A large one: the page answers while it runs, and Stop is heard.
  await mk(80, 3000); await p.waitForTimeout(1500);
  await p.evaluate(() => { runBatch({ tmpl: batchTemplate(activeFit()), seed: "tmpl", cols: yCols().map(c => c.id), share: [true, false, "lin", true] }); });
  for (let i = 0; i < 200 && !(await p.evaluate(() => !!(S.batchRun && S.batchRun.together))); i++) await p.waitForTimeout(100);
  await p.waitForTimeout(150);
  const t0 = Date.now(); r = await p.evaluate(() => ({ on: !!(S.batchRun && S.batchRun.together), stop: !!document.querySelector("#bStop") })); const lag = Date.now() - t0;
  check("while 80 columns are fitted together the page answers at once, with Stop", r.on && r.stop && lag < 300, JSON.stringify([r, lag]));
  await p.evaluate(() => { const b = document.querySelector("#bStop"); if (b) b.click(); });
  for (let i = 0; i < 50 && await p.evaluate(() => !!S.batchRun); i++) await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ run: !!S.batchRun, glob: !!(P().batch && P().batch.glob), rows: P().batch ? P().batch.rows.filter(z => z.fit).length : 0, toast: document.querySelector("#toast").textContent, w: GFW }));
  check("Stop ends it: each column keeps its own fit, and it says so", !r.run && !r.glob && r.rows === 80 && /Stopped before they were fitted together/.test(r.toast) && r.w === null, JSON.stringify(r));
}, { name: "global fits in a worker" });

console.log("Roadmap 7, slice 4: a trend graph as a graph like any other");
await page(async p => {
  await p.evaluate(async () => {
    let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, gn = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const x = Array.from({ length: 161 }, (_, i) => 60 + i * 0.5), X = makeCol("x", "Shift", "cm-1", x), cols = [X];
    [280, 290, 300, 310, 320].forEach((T, k) => cols.push(Object.assign(makeCol("y", "T" + T, "", x.map(v => 3 + (40 + 5 * k) * Math.exp(-0.5 * ((v - (100 + 0.4 * (T - 300))) / 3) ** 2) + 0.4 * gn())), { pipe: [], mask: [] })));
    const pr = Object.assign(blankProject("Trends"), { cols, activeY: cols[1].id, series: { mode: "name", label: "Temperature", unit: "K", vals: {}, q: null, line: false } });
    pr.graphs = [{ id: newGid(), name: "Graph 1", cols: [cols[1].id], plot: { style: "auto" } }];
    await createProject(pr, "test"); await new Promise(r => setTimeout(r, 80)); renderAll();
    prefSet("anim", false); applyAnim(); S.fitMode = "curve"; showTab("fit"); chooseModel("gauss"); runFit();
    runBatch({ tmpl: batchTemplate(activeFit()), seed: "tmpl", cols: yCols().map(c => c.id) });
    for (let i = 0; i < 100 && S.batchRun; i++) await new Promise(r => setTimeout(r, 100));
    newTrend("par2"); const t = trendList()[0]; saveTrend(t.id, { ys: t.ys.concat([{ q: "par1", ax: "r" }]) });
  });
  await p.waitForTimeout(500);
  const before = await p.evaluate(() => ({ sheets: sheetList().length, graphs: P().graphs.length, cols: P().cols.length, id: trendList()[0].id, items: trendWinItems(trendList()[0].id).filter(i => i && i.label).map(i => i.label) }));
  check("a trend graph's menu offers it as a graph like any other", before.items.includes("As a graph like any other"), JSON.stringify(before.items));
  await p.evaluate(id => trendToGraph(id), before.id); await p.waitForTimeout(600);
  let r = await p.evaluate(() => { const sh = sheetList().slice(-1)[0], cs = sheetCols(sh.id), g = P().graphs.slice(-1)[0], tr = trendData(qFind(batchQuantities(), "par2"));
    return { name: sh.name, kinds: cs.map(c => c.role + ":" + c.name).join("|"), x: cs[0].data.join(","), unit: cs[0].unit, y: cs[1].data.map(v => v.toFixed(6)).join(","), want: tr.pts.map(q => q.y.toFixed(6)).join(","), e: cs[2].role === "e" && cs[2].of === cs[1].id && cs[2].data.every(v => v > 0),
      comm: cs[1].comm, gcols: g.cols.length, right: (g.plot.use || {})[cs[3].id], log: P().log.slice(-1)[0].text }; });
  check("its numbers on a sheet of their own: the series as X, each quantity a Y with its errors", r.name === "Trend 1" && /^x:Temperature\|y:xc\|e:Error\|y:A\|e:Error$/.test(r.kinds) && r.x === "280,290,300,310,320" && r.unit === "K" && r.y === r.want && r.e && /^from Trend 1, /.test(r.comm), JSON.stringify(r));
  check("…plotted on an ordinary graph, the right-axis quantity on the right", r.gcols === 2 && r.right && r.right.ax === "r", JSON.stringify(r));
  r = await p.evaluate(() => { const g = P().graphs.slice(-1)[0]; activateGraph(g.id); openPlotDetails(null, "ax:y"); return { front: GID() === g.id, fmt: winOpen("format") }; });
  check("…which the Format pane formats like any graph", r.front && r.fmt, JSON.stringify(r));
  await p.evaluate(() => { closeWin("format"); undo(); }); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ sheets: sheetList().length, graphs: P().graphs.length, cols: P().cols.length }));
  check("one undo takes the sheet and the graph back", r.sheets === before.sheets && r.graphs === before.graphs && r.cols === before.cols, JSON.stringify([before, r]));
}, { name: "a trend graph as a graph like any other" });

console.log("Roadmap 8, slice 1: JCAMP-DX files");
await page(async p => {
  const jdx = ["##TITLE= Polystyrene film", "##JCAMP-DX= 4.24", "##DATA TYPE= INFRARED SPECTRUM", "##ORIGIN= Lab 3", "##XUNITS= 1/CM", "##YUNITS= ABSORBANCE", "##XFACTOR= 1", "##YFACTOR= 0.001",
    "##FIRSTX= 4000", "##LASTX= 3990", "##NPOINTS= 11", "##XYDATA=(X++(Y..Y))", "4000A00JKLMN", "3994A15jklmn", "##END="].join("\n");
  await p.evaluate(async () => { await createProject(blankProject("Imports"), "test"); await new Promise(r => setTimeout(r, 80)); renderAll(); prefSet("anim", false); applyAnim(); });
  await p.waitForTimeout(300);
  await p.evaluate(t => importText(t, "polystyrene.jdx"), jdx); await p.waitForTimeout(400);
  let r = await p.evaluate(() => ({ open: !document.querySelector("#impModal").hidden, notes: [...document.querySelectorAll("#impModal ul.find li")].map(e => e.textContent).join(" | "), jdx: S.imp && S.imp.res.jdx }));
  check("a JCAMP-DX file opens the import dialog, decoded, and says so", r.open && r.jdx && r.jdx.n === 11 && /JCAMP-DX file in compressed \(ASDF\): 11 points, “Polystyrene film”/.test(r.notes), JSON.stringify(r));
  await p.evaluate(() => doImport()); await p.waitForTimeout(700);
  r = await p.evaluate(() => { const ys = yCols(), y = ys[ys.length - 1], x = xColFor(y); return { yn: y.name, yu: y.unit, xn: x.name, xu: x.unit, x: x.data.slice(0, 3), y: y.data.slice(0, 7).map(v => +v.toFixed(4)), meta: y.meta && y.meta.ORIGIN }; });
  check("…into the worksheet: Wavenumber (cm⁻¹) falling, Absorbance, its labels as the column's header fields", r.xn === "Wavenumber" && r.xu === "cm⁻¹" && r.yn === "Absorbance" && r.x.join() === "4000,3999,3998" && r.y.join() === "0.1,0.101,0.103,0.106,0.11,0.115,0.114" && r.yn && r.meta === "Lab 3", JSON.stringify(r));
  // A dropped one is read with the automatic choices; one that cannot be read says why.
  r = await p.evaluate(async t => { const n0 = yCols().length; await autoImport([{ name: "again.jdx", text: t }], {}); return { n: yCols().length - n0, graphs: P().graphs.length }; }, jdx);
  check("a dropped JCAMP-DX file is read into the worksheet", r.n === 1, JSON.stringify(r));
  r = await p.evaluate(() => { importText("##TITLE= nmr\n##JCAMP-DX= 5.01\n##NTUPLES= NMR SPECTRUM\n##END NTUPLES=\n##END=", "fid.jdx"); return { toast: document.querySelector("#toast").textContent, open: !document.querySelector("#impModal").hidden }; });
  check("a JCAMP-DX file in pages is refused, saying why", /fid\.jdx is a JCAMP-DX file in pages/.test(r.toast) && !r.open, JSON.stringify(r));
}, { name: "JCAMP-DX files" });

console.log("Roadmap 8, slice 2: SPC files");
await page(async p => {
  await p.evaluate(async () => { await createProject(blankProject("SPC"), "test"); await new Promise(r => setTimeout(r, 80)); renderAll(); prefSet("anim", false); applyAnim();
    // A one-subfile SPC: 5 points from 400 to 404 cm⁻¹, absorbance as floats, a memo.
    const b = new Uint8Array(512 + 32 + 20), dv = new DataView(b.buffer); b[1] = 0x4B; b[2] = 4; dv.setInt8(3, -128); dv.setUint32(4, 5, true); dv.setFloat64(8, 400, true); dv.setFloat64(16, 404, true); dv.setUint32(24, 1, true); b[28] = 1; b[29] = 2;
    "Polystyrene film".split("").forEach((c, i) => { b[88 + i] = c.charCodeAt(0); }); dv.setInt8(513, -128); dv.setUint32(512 + 16, 5, true); [0.1, 0.2, 0.4, 0.3, 0.1].forEach((v, i) => dv.setFloat32(544 + 4 * i, v, true));
    window.__spc = b; });
  await p.evaluate(() => readFileIn(new File([window.__spc], "film.spc"))); await p.waitForTimeout(600);
  let r = await p.evaluate(() => ({ open: !document.querySelector("#impModal").hidden, h: S.imp && S.imp.res.headerRow, memo: S.imp && S.imp.res.meta.Memo }));
  check("an SPC file chosen is read as bytes and opens the import dialog, decoded, its memo kept", r.open && r.h && r.h.join("|") === "Wavenumber (cm⁻¹)|Absorbance" && r.memo === "Polystyrene film", JSON.stringify(r));
  await p.evaluate(() => doImport()); await p.waitForTimeout(600);
  r = await p.evaluate(() => { const y = yCols().slice(-1)[0]; return { y: y.data.map(v => +v.toFixed(4)).join(), memo: y.meta && y.meta.Memo, x: xColFor(y).data.join() }; });
  check("…into the worksheet with its header's fields", r.y === "0.1,0.2,0.4,0.3,0.1" && r.x === "400,401,402,403,404" && r.memo === "Polystyrene film", JSON.stringify(r));
  r = await p.evaluate(async () => { const got = await readDropped([new File([window.__spc], "drop.spc"), new File([new Uint8Array(600)], "junk.spc")]); return got.map(g => g.fail || (g.text.split("\n").length + " lines")); });
  check("dropped SPC files: one read, one refused in words", r[0] === "8 lines" && /not an SPC file/.test(r[1]), JSON.stringify(r));
  r = await p.evaluate(async () => { const b = window.__spc.slice(); b[1] = 0x4D; readFileIn(new File([b], "old.spc")); await new Promise(res => setTimeout(res, 300)); return document.querySelector("#toast").textContent; });
  check("an SPC file in the old format is refused, saying why", /old\.spc is an SPC file in the old format/.test(r), JSON.stringify(r));
}, { name: "SPC files" });

console.log("Roadmap 8, slice 3: OPUS files");
await page(async p => {
  // A small OPUS file: an absorbance block of 5 points with its parameters, and the sample's name.
  const pblock = ps => { const parts = []; ps.forEach(([nm, ty, v]) => { const sz = ty === 0 ? 2 : ty === 1 ? 4 : 4; const a = new Uint8Array(8 + 2 * sz), d = new DataView(a.buffer);
      for (let i = 0; i < 3; i++) a[i] = nm.charCodeAt(i); d.setUint16(4, ty, true); d.setUint16(6, sz, true); if (ty === 0) d.setInt32(8, v, true); else if (ty === 1) d.setFloat64(8, v, true); else for (let i = 0; i < v.length; i++) a[8 + i] = v.charCodeAt(i); parts.push(a); });
    const end = new Uint8Array(8); end.set([69, 78, 68]); parts.push(end); const n = parts.reduce((s, a) => s + a.length, 0), out = new Uint8Array(n); let o = 0; parts.forEach(a => { out.set(a, o); o += a.length; }); return out; };
  const f32 = a => { const u = new Uint8Array(4 * a.length), d = new DataView(u.buffer); a.forEach((v, i) => d.setFloat32(4 * i, v, true)); return u; };
  const blocks = [{ dt: 160, bytes: pblock([["SNM", 2, "PMMA"]]) }, { dt: 15, bytes: f32([0.1, 0.3, 0.2, 0.4, 0.1]) }, { dt: 31, bytes: pblock([["NPT", 0, 5], ["FXV", 1, 1800], ["LXV", 1, 1796], ["DXU", 2, "WN"]]) }];
  let size = 24 + 12 * blocks.length; blocks.forEach(q => { q.off = size; size += q.bytes.length; });
  const b = new Uint8Array(size), dv = new DataView(b.buffer); b.set([0x0A, 0x0A, 0xFE, 0xFE]); dv.setInt32(12, 24, true); dv.setInt32(20, blocks.length, true);
  blocks.forEach((q, i) => { const at = 24 + 12 * i; b[at] = q.dt; dv.setInt32(at + 4, q.bytes.length / 4, true); dv.setInt32(at + 8, q.off, true); b.set(q.bytes, q.off); });
  await p.evaluate(async bytes => { await createProject(blankProject("OPUS"), "test"); await new Promise(r => setTimeout(r, 80)); renderAll(); prefSet("anim", false); applyAnim(); window.__op = new Uint8Array(bytes); }, Array.from(b));
  await p.evaluate(() => readFileIn(new File([window.__op], "pmma.0"))); await p.waitForTimeout(600);
  let r = await p.evaluate(() => ({ open: !document.querySelector("#impModal").hidden, h: S.imp && S.imp.res.headerRow, s: S.imp && S.imp.res.meta.Sample, note: [...document.querySelectorAll("#impModal ul.find li")].map(e => e.textContent).join(" | ") }));
  check("an OPUS file (sample.0) is read from its bytes into the import dialog, and said to be one", r.open && r.h && r.h.join("|") === "Wavenumber (cm⁻¹)|Absorbance" && r.s === "PMMA" && /A Bruker OPUS file, decoded from its bytes: 5 points of its AB block/.test(r.note), JSON.stringify(r));
  await p.evaluate(() => { closeModal(document.querySelector("#impModal")); });
  r = await p.evaluate(async () => { const got = await readDropped([new File(["x y\n1 2\n3 4\n5 6\n"], "run.1")]); return got[0]; });
  check("a text file with such a name (run.1) is read as text", r && r.text && /^x y/.test(r.text), JSON.stringify(r));
}, { name: "OPUS files" });

console.log("Roadmap 8, slice 4: Princeton Instruments SPE files");
await page(async p => {
  // A WinSpec file of 4 points with a calibration, and a Maestro text .Spe of 3000 channels.
  const b = new Uint8Array(4100 + 16), dv = new DataView(b.buffer); dv.setInt16(0, 6, true); dv.setUint16(42, 4, true); dv.setUint16(656, 1, true); dv.setInt32(1446, 1, true); dv.setFloat32(1992, 2.5, true); dv.setUint16(4098, 0x5555, true);
  b[3101] = 1; dv.setFloat64(3263, 500, true); dv.setFloat64(3271, 0.5, true); dv.setFloat64(3311, 532, true); [10, 20, 40, 30].forEach((v, i) => dv.setFloat32(4100 + 4 * i, v, true));
  const maestro = "$SPEC_ID:\nSoil 7\n$DATA:\n0 2999\n" + Array.from({ length: 3000 }, (_, i) => String(100 + (i % 7))).join("\n") + "\n";
  await p.evaluate(async bytes => { await createProject(blankProject("SPE"), "test"); await new Promise(r => setTimeout(r, 80)); renderAll(); prefSet("anim", false); applyAnim(); window.__pspe = new Uint8Array(bytes); }, Array.from(b));
  await p.evaluate(() => readFileIn(new File([window.__pspe], "si.spe"))); await p.waitForTimeout(600);
  let r = await p.evaluate(() => ({ open: !document.querySelector("#impModal").hidden, h: S.imp && S.imp.res.headerRow, laser: S.imp && S.imp.res.meta.Laser, note: [...document.querySelectorAll("#impModal ul.find li")].map(e => e.textContent).join(" | ") }));
  check("a Princeton SPE file is read from its bytes: wavelength from its calibration, its laser line kept, said in the dialog", r.open && r.h && r.h.join("|") === "Wavelength (nm)|Counts (counts)" && r.laser === "532 nm" && /Princeton Instruments SPE file, decoded from its bytes: 4 points, X in wavelength from its calibration/.test(r.note), JSON.stringify(r));
  await p.evaluate(() => { closeModal(document.querySelector("#impModal")); });
  await p.evaluate(t => readFileIn(new File([t], "soil7.Spe")), maestro); await p.waitForTimeout(600);
  r = await p.evaluate(() => ({ mca: !!(S.imp && S.imp.res.mca), n: S.imp && S.imp.res.rows.length }));
  check("Maestro's text .Spe still reads as an analyser's counts", r.mca && r.n === 3000, JSON.stringify(r));
}, { name: "Princeton SPE files" });

console.log("Unread comments (roadmap 10, slice 1)");
await page(async p => {
  await p.evaluate(async () => { await loadExample("ir"); });
  await p.waitForTimeout(400);
  // Someone else comments on a step and on the processed data, after this browser has the project's comments.
  const key = await p.evaluate(async () => { const c = activeYCol(); addPipeStep("smooth"); await new Promise(r => setTimeout(r, 200));
    const s = activeYCol().pipe[0], k = "step:" + s.id, t = Date.now() + 5;
    await S.store.addComment(S.pid, { uid: "u_ana", text: "Why a window of this size?", anchor: nodeAnchor(k), t, resolved: false });
    await S.store.addComment(S.pid, { uid: "u_ana", text: "The baseline looks low here.", anchor: nodeAnchor("final:" + c.id), t: t + 1, resolved: false });
    S.profiles = Object.assign({}, S.profiles, { u_ana: { name: "Ana" } }); return k; });
  await p.waitForTimeout(300);
  let r = await p.evaluate(k => { closeWin("disc"); openWin("flow", { render: true }); renderFlow(); const b = document.querySelector(`#flowWin [data-node="${CSS.escape(k)}"] .fn-c`);
    return { boxNew: !!b && b.classList.contains("new"), label: b && b.getAttribute("aria-label"), badge: winBadge("disc"), unread: unreadCount() }; }, key);
  check("a colleague's comments are new: the History box's badge is ringed, the Discussion's button counts them", r.boxNew && /1 new/.test(r.label) && /badge new/.test(r.badge) && r.unread === 2, JSON.stringify(r));
  // Shown in the Discussion window they say New, and a moment later they are read.
  r = await p.evaluate(() => { openWin("disc", { render: true }); focusWin("disc"); renderThread(); return { n: document.querySelectorAll("#thread .cmt.new .newc").length, bar: (document.querySelector("#thread .dnew") || {}).textContent }; });
  check("…in the Discussion window each says New, and the bar says how many", r.n === 2 && r.bar === "2 new", JSON.stringify(r));
  await p.waitForTimeout(1900);
  r = await p.evaluate(() => ({ n: document.querySelectorAll("#thread .cmt.new").length, unread: unreadCount(), badge: winBadge("disc") }));
  check("…read a moment after they are shown", r.n === 0 && r.unread === 0 && !/badge new/.test(r.badge), JSON.stringify(r));
  // A reply from her later, with the Discussion window closed: new again, on that thread only; Mark all read.
  await p.evaluate(async () => { closeWin("disc"); const t = threadIndex().list[0]; await S.store.addComment(S.pid, { uid: "u_ana", text: "Any news?", anchor: null, parent: t.root.id, t: Date.now() + 5, resolved: false }); });
  await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ unread: unreadCount() }));
  check("a reply later is new again", r.unread === 1, JSON.stringify(r));
  await p.evaluate(async () => { await S.store.addComment(S.pid, { uid: "", text: "My own note.", anchor: null, t: Date.now() + 9, resolved: false }); });
  await p.waitForTimeout(200);
  check("…one's own comment is never new", (await p.evaluate(() => unreadCount())) === 1);
  r = await p.evaluate(() => { openWin("disc", { render: true }); focusWin("disc"); renderThread(); const b = document.querySelector("#thread [data-dread]"); if (b) b.click(); return { unread: unreadCount(), btn: !!b }; });
  check("…Mark all read reads it at once", r.btn && r.unread === 0, JSON.stringify(r));
  // Kept in this browser: a reload does not make them new.
  await p.reload(); await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.comments && S.comments.length >= 4, null, { timeout: 15000 }).catch(() => {});
  check("…and stay read after a reload", (await p.evaluate(() => unreadCount())) === 0);
  // A project's comments from before this browser first had them are not new; junk from storage reads as nothing.
  r = await p.evaluate(() => { localStorage.setItem("kurve.seen", "[1,2]"); S._seen = null; const a = seenOf(S.pid); localStorage.setItem("kurve.seen", JSON.stringify({ [S.pid]: { base: "x", th: 5 } })); S._seen = null; const b = seenOf(S.pid); return { a, b, n: unreadCount() }; });
  check("junk in the store of what was read reads as nothing", r.a === null && r.b === null && r.n === 0, JSON.stringify(r));
}, { name: "unread comments" });

console.log("Mentions (roadmap 10, slice 2)");
await page(async p => {
  await p.evaluate(async () => { await loadExample("ir"); });
  await p.waitForTimeout(300);
  const key = await p.evaluate(async () => { S.uid = "u_me"; S.profiles = { u_me: { name: "Me" }, u_ana: { name: "Ana Silva" }, u_bo: { name: "Bo" } };
    addPipeStep("smooth"); await new Promise(r => setTimeout(r, 200)); const k = "step:" + activeYCol().pipe[0].id;
    goNode(k, { disc: true, focus: true }); await new Promise(r => setTimeout(r, 300)); return k; });
  const ta = `#flowWin .fcomp textarea`;
  await p.click(ta); await p.keyboard.type("Could @an", { delay: 10 }); await p.waitForTimeout(100);
  let r = await p.evaluate(() => [...document.querySelectorAll(".msug [data-mk]")].map(e => e.textContent));
  check("@ and the start of a name offers the people the project knows (not oneself)", JSON.stringify(r) === JSON.stringify(["Ana Silva"]), JSON.stringify(r));
  await p.keyboard.press("Enter"); await p.keyboard.type("check this?", { delay: 5 });
  r = await p.evaluate(sel => ({ v: document.querySelector(sel).value, open: !!document.querySelector(".msug") }), ta);
  check("…Enter puts the whole name in and closes the list, the comment not posted", r.v === "Could @Ana Silva check this?" && !r.open, JSON.stringify(r));
  await p.keyboard.press("Control+Enter"); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const c = S.comments.find(c => /Could @Ana/.test(c.text)); const el = c && document.querySelector(`#flowWin .cmt[data-cid="${c.id}"] .ment`); return { m: c && c.mentions, mark: el && el.textContent }; });
  check("…posted, the comment keeps whom it names, and the name is marked", JSON.stringify(r.m) === '["u_ana"]' && r.mark === "@Ana Silva", JSON.stringify(r));
  // Ana answers, naming me: a toast says so, the comment says it mentions you, For you lists the thread.
  await p.evaluate(async () => { const t = threadIndex().list[0]; await S.store.addComment(S.pid, { uid: "u_ana", text: "@Me the second band is a shoulder", mentions: ["u_me"], anchor: null, parent: t.root.id, t: Date.now() + 5, resolved: false }); });
  await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ toast: (document.querySelector("#toast") || {}).textContent || "", chip: [...document.querySelectorAll("#flowWin .cmt.new .newc")].map(e => e.textContent), me: !!document.querySelector("#flowWin .cmt .ment.me") }));
  check("a reply naming you: a toast says who, the comment says Mentions you and your name is marked", /Ana Silva mentioned you: “@Me the second band is a shoulder”/.test(r.toast) && r.chip.includes("Mentions you") && r.me, JSON.stringify(r));
  r = await p.evaluate(() => { openWin("disc", { render: true }); focusWin("disc"); renderThread(); const b = document.querySelector('#thread [data-dflt="me"]'); if (b) b.click(); return { btn: b && b.textContent, n: document.querySelectorAll("#thread .thr").length }; });
  check("…the Discussion window's For you lists that thread", /For you\s*1/.test(r.btn || "") && r.n === 1, JSON.stringify(r));
  // Escape closes the list and leaves the reply being typed; an edit that names someone records it.
  await p.evaluate(() => { const t = threadIndex().list[0]; threadAct("reply", t.root.id); });
  await p.waitForTimeout(200); await p.click("#thread .rbox textarea");
  await p.keyboard.type("Thanks @B", { delay: 10 }); await p.waitForTimeout(80);
  r = await p.evaluate(() => [...document.querySelectorAll(".msug [data-mk]")].map(e => e.textContent));
  await p.keyboard.press("Escape"); await p.waitForTimeout(80);
  const r2 = await p.evaluate(() => ({ open: !!document.querySelector(".msug"), reply: !!S.cReply, v: (document.querySelector("#thread .rbox textarea") || {}).value }));
  check("Escape closes the list, and the reply stays open with what was typed", JSON.stringify(r) === '["Bo"]' && !r2.open && r2.reply && r2.v === "Thanks @B", JSON.stringify([r, r2]));
  r = await p.evaluate(async () => { const c = S.comments.find(c => /Could @Ana/.test(c.text)); S.cDrafts["edit:" + c.id] = "Could @Ana Silva or @Bo check this?"; await threadAct("edits", c.id); await new Promise(r => setTimeout(r, 200)); return S.comments.find(x => x.id === c.id).mentions; });
  check("…an edit naming another records both", JSON.stringify((r || []).slice().sort()) === '["u_ana","u_bo"]', JSON.stringify(r));
}, { name: "mentions" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
