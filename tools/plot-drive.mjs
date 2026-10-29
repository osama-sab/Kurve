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

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
