/* Wave 7, plots (ux/spec/PLOT2_SPEC.md): what each slice added, clicked and read back from the drawing in a real browser.
   Needs Playwright with Chromium. Usage:
     node tools/plot2-drive.mjs [path/to/kurve.html]      ONLY=7.1 runs one section
   Set PLAYWRIGHT=/path/to/playwright/index.mjs if `playwright` is not installed where node can find it. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const ONLY = process.env.ONLY || "";
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 500))); }
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
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), opt.timeout || 90000))]); }
  catch (e) { check(opt.name + ": ran", false, e.stack || e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
const section = k => !ONLY || ONLY === k;

/* A long table: a value (Yield), a second value (Cost), the fruit (text, the X) and the region (text), 80 rows. */
const fruit = async p => {
  await p.evaluate(async () => {
    const F = ["Apple", "Pear", "Plum", "Fig"], R = ["North", "South"], v = [], w = [];
    for (let i = 0; i < 80; i++) { v.push(+(10 + 5 * (i % 4) + 3 * Math.sin(i * 1.7) + (i % 8 < 4 ? 0 : 4)).toFixed(3)); w.push(+(20 - 2 * (i % 4) + 2 * Math.cos(i)).toFixed(3)); }
    const X = makeCol("x", "Fruit", "", v.map(() => null)); X.txt = {}; v.forEach((_, i) => X.txt[i] = F[i % 4]); X.fmt = "text";
    const G = makeCol("ignore", "Region", "", v.map(() => null)); G.txt = {}; v.forEach((_, i) => G.txt[i] = R[Math.floor(i / 4) % 2]); G.fmt = "text";
    const V = Object.assign(makeCol("y", "Yield", "t/ha", v), { pipe: [], mask: [] }), W = Object.assign(makeCol("y", "Cost", "€", w), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Fruit"), { cols: [X, V, W, G], activeY: V.id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll();
  });
  await p.waitForTimeout(400);
  return p.evaluate(() => { const ys = yCols(); return { X: P().cols[0].id, V: ys[0].id, W: ys[1].id, G: P().cols[3].id }; });
};
const budget = async (p, vals, vals2) => {
  await p.evaluate(async ({ vals, vals2 }) => {
    const names = ["Rent", "Food", "Travel", "Books", "Tax", "Gifts"].slice(0, vals.length);
    const X = makeCol("x", "Part", "", vals.map(() => null)); X.txt = {}; names.forEach((t, i) => X.txt[i] = t); X.fmt = "text";
    const cols = [X, Object.assign(makeCol("y", "Spend", "€", vals), { pipe: [], mask: [] })];
    if (vals2) cols.push(Object.assign(makeCol("y", "Last year", "€", vals2), { pipe: [], mask: [] }));
    await createProject(Object.assign(blankProject("Budget"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll();
  }, { vals, vals2 });
  await p.waitForTimeout(400);
  return p.evaluate(() => yCols().map(c => c.id));
};
// The slices drawn: each path's two arc ends, read back as fractions of a turn from the start (clockwise from the top).
const readPie = p => p.evaluate(() => { const g = S.geo.pie, o = g.o, out = [];
  document.querySelectorAll("#plot [data-ring]").forEach(rg => rg.querySelectorAll("path[data-slice]").forEach(el => {
    const d = el.getAttribute("d"), m = d.match(/^M([-\d.]+),([-\d.]+)A[-\d.]+,[-\d.]+ 0 [01] [01] ([-\d.]+),([-\d.]+)/), i = +el.dataset.slice, z = g.rings[+rg.dataset.ring].slices.find(q => q.i === i);
    const fr = (x, y) => { const th = Math.atan2(-(y - g.cy - z.dy), x - g.cx - z.dx) * 180 / Math.PI; return ((((o.start - th) * (o.cw ? 1 : -1)) % 360) + 360) % 360 / 360; };
    out.push({ ring: +rg.dataset.ring, i, a: m ? fr(+m[1], +m[2]) : null, b: m ? fr(+m[3], +m[4]) : null, r: m ? Math.hypot(+m[1] - g.cx - z.dx, +m[2] - g.cy - z.dy) : null, dx: z.dx, dy: z.dy, share: z.share, title: (el.querySelector("title") || {}).textContent || "" }); }));
  return { slices: out, cx: g.cx, cy: g.cy, rings: g.rings.map(r => ({ r0: r.r0, r1: r.r1, n: r.slices.length })), left: g.left, texts: [...document.querySelectorAll("#plot text")].map(t => t.textContent) }; });

if (section("7.1")) {
  console.log("7.1 Categories: pies and doughnuts");
  await page(async p => {
    const ids = await budget(p, [900, 420, 180, 60]);
    await p.evaluate(ids => plotCols([ids[0]], { layout: "pie", quiet: true }), ids); await p.waitForTimeout(300);
    let r = await readPie(p);
    const sh = [900, 420, 180, 60].map(v => v / 1560); let acc = 0; const want = sh.map(s => { const a = acc; acc += s; return [a, acc]; });
    const turn = (u, v) => { const d = Math.abs(u - v) % 1; return Math.min(d, 1 - d); }, err = Math.max(...r.slices.map((z, k) => Math.max(turn(z.a, want[k][0]), turn(z.b, want[k][1]))));
    check("four slices, each spanning its share of a turn from the top, clockwise (to a hundredth of a degree)", r.slices.length === 4 && err < 0.01 / 360, JSON.stringify({ err, r: r.slices.map(z => [z.a, z.b]) }));
    check("the labels say each name and its share to a decimal", ["Rent", "57.7 %", "Food", "26.9 %", "Travel", "11.5 %", "Books", "3.8 %"].every(t => r.texts.includes(t)), JSON.stringify(r.texts));
    check("no legend while the labels name the slices", !(await p.$("#plot [data-legslice]")));
    // Anticlockwise from the right, largest first: the same shares, the other way round.
    await p.evaluate(() => { setPlotKey("pieCw", false, "x"); setPlotKey("pieStart", 0, "x"); }); await p.waitForTimeout(200);
    r = await readPie(p);
    check("anticlockwise from the right: still each its share", Math.max(...r.slices.map((z, k) => Math.abs(z.a - want[k][0]))) < 0.01 / 360, JSON.stringify(r.slices.map(z => z.a)));
    const geo = await p.evaluate(() => { const g = S.geo.pie, z = g.rings[0].slices[0], th = (g.o.start + 0.5 * z.share * 360) * Math.PI / 180; return { o: g.o, x: g.cx + 0.6 * g.rings[0].r1 * Math.cos(th), y: g.cy - 0.6 * g.rings[0].r1 * Math.sin(th) }; });
    check("the start and direction are the chart's", geo.o.start === 0 && geo.o.cw === false, JSON.stringify(geo.o));
    // The readout over the first slice, through the page's own pointer handling.
    const box = await p.$eval("#plot", el => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top }; });
    await p.mouse.move(box.x + geo.x, box.y + geo.y); await p.waitForTimeout(100);
    const ro = await p.textContent("#readout");
    check("the status bar names the slice under the pointer, its value and share", /Rent/.test(ro) && /900/.test(ro) && /57\.7 %/.test(ro), ro);
    // A double click pulls it out along its bisector by 0.12 of the radius; again puts it back; one undo each.
    await p.mouse.dblclick(box.x + geo.x, box.y + geo.y); await p.waitForTimeout(250);
    r = await readPie(p); const z0 = r.slices.find(z => z.i === 0), R0 = r.rings[0].r1;
    const pull = await p.evaluate(id => ((GP().series || {})[id] || {}).pull, ids[0]);
    const bis = (z0.share / 2) * 2 * Math.PI, ex = [Math.cos(bis), -Math.sin(bis)];
    check("a double-click pulls the slice out along its bisector, by 0.12 of the radius", pull && pull[0] === 0.12 && Math.abs(z0.dx - ex[0] * 0.12 * R0) < 0.01 && Math.abs(z0.dy - ex[1] * 0.12 * R0) < 0.01 && /pulled out/.test(z0.title), JSON.stringify({ pull, z0, ex, R0 }));
    check("the chart is made smaller so the pulled slice stays inside", R0 * 1.12 + Math.hypot(z0.dx, z0.dy) * 0 <= Math.min(...(await p.evaluate(() => [S.geo.pw / 2, S.geo.mh / 2]))) + 0.5);
    const lg = await p.evaluate(() => (P().log || []).slice(-1)[0].text);
    check("the log says which slice", /pulled out the slice Rent of Spend/.test(lg), lg);
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("one undo puts it back", !(await p.evaluate(id => ((GP().series || {})[id] || {}).pull, ids[0])));
    // Its right-click: the slice's name, Pull the slice out, the pie's own menu; no line, symbol or axis items.
    const menu = await p.evaluate(({ id, geo }) => graphMenuItems(id, { px: geo.x, py: geo.y, pt: toData(geo.x, geo.y) }).filter(Boolean).map(i => i === "-" ? "-" : i.group || i.label), { id: ids[0], geo });
    check("a slice's right-click: its name and share, Pull the slice out, Pie chart; no Line, Symbol, Error bars or Y axis", menu[0] === "Rent: 57.7 %" && menu.includes("Pull the slice out") && menu.includes("Pie chart") && !menu.some(l => /Line, symbols|Symbol…|Error bars|Y axis|Plot type|Connect/.test(l)), JSON.stringify(menu));
    // Labels: values and shares; a legend appears once the labels do not name the slices.
    await p.evaluate(() => setPlotKey("pieLab", ["value", "pct"], "x")); await p.waitForTimeout(200);
    r = await readPie(p);
    check("labels of the value and share, and the legend lists the slices' names", r.texts.includes("900") && r.texts.includes("57.7 %") && (await p.$$("#plot [data-legslice]")).length === 4, JSON.stringify(r.texts));
    // Values of zero or below, and a masked point, are left out and counted.
    await p.evaluate(() => { setPlotKey("pieLab", null, "x"); setPlotKey("pieCw", null, "x"); setPlotKey("pieStart", null, "x"); });
  }, { name: "pie" });

  await page(async p => {
    const ids = await budget(p, [900, 0, 180, -60, 300, 120]);
    await p.evaluate(ids => { plotCols([ids[0]], { layout: "pie", quiet: true }); }, ids); await p.waitForTimeout(300);
    let r = await readPie(p);
    check("a zero and a negative value are left out, and counted", r.slices.length === 4 && r.left === 2, JSON.stringify({ n: r.slices.length, left: r.left }));
    await p.evaluate(ids => { const c = colById(ids[0]); pushUndo("m"); c.mask = [4]; save({ cols: P().cols }); renderPlot(); }, ids); await p.waitForTimeout(200);
    r = await readPie(p);
    check("a masked point is not a slice", r.slices.length === 3 && !r.slices.some(z => z.i === 4), JSON.stringify(r.slices.map(z => z.i)));
    // Thin slices: their labels go outside with a leader; the big ones stay inside.
    await p.evaluate(ids => { pushUndo("m"); colById(ids[0]).mask = []; colById(ids[0]).data = [9000, 30, 25, 20, 15, 10]; save({ cols: P().cols }); renderPlot(); }, ids); await p.waitForTimeout(200);
    const leads = await p.$$eval("#plot [data-pielead]", a => a.length);
    check("thin slices are labelled outside, each with a leader line", leads >= 4, leads);
    const ov = await p.evaluate(() => { const t = [...document.querySelectorAll("#plot text")].filter(e => /%/.test(e.textContent)).map(e => e.getBBox()); let bad = 0;
      for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { const a = t[i], b = t[j]; if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1) bad++; } return bad; });
    check("no two labels overlap", ov === 0, ov);
  }, { name: "pie, left out and thin" });

  await page(async p => {
    const ids = await budget(p, [900, 420, 180, 60], [850, 460, 240, 50]);
    await p.evaluate(ids => { plotCols(ids, { layout: "pie", quiet: true }); setPlotKey("pieHole", 0.35, "x"); }, ids); await p.waitForTimeout(300);
    const r = await readPie(p);
    const outer = r.rings[0], inner = r.rings[1];
    check("two curves are two rings, the first outside, a hole of 0.35 of the radius", r.rings.length === 2 && Math.abs(inner.r0 - 0.35 * outer.r1) < 0.01 && Math.abs(outer.r0 - inner.r1) < 1e-9, JSON.stringify(r.rings));
    check("the rings are named under the chart", r.texts.some(t => /Rings, outside in: Spend, Last year/.test(t)));
    const cols = await p.evaluate(() => { const m = {}; document.querySelectorAll("#plot [data-ring] path[data-slice]").forEach(el => { const t = el.querySelector("title").textContent.split(":")[0]; (m[t] = m[t] || new Set()).add(el.getAttribute("fill")); }); return Object.values(m).map(s => s.size); });
    check("a name has one colour in every ring", cols.every(n => n === 1) && cols.length === 4, JSON.stringify(cols));
    // The Format pane's Layout page offers the pie's settings, and a change there is one undo step.
    await p.evaluate(() => openPlotDetails(null, "layout")); await p.waitForTimeout(250);
    const f = await p.evaluate(() => ["pdPl", "pdPp", "pdPd", "pdPs", "pdPh", "pdPcw", "pdPsort"].map(id => !!document.getElementById(id)));
    check("the Format pane has the labels, their place, decimals, start, hole, direction and order", f.every(Boolean), JSON.stringify(f));
    await p.selectOption("#pdPh", "0.65"); await p.waitForTimeout(600); await p.evaluate(() => { pdCommit && pdCommit(); closePlotDetails(); }); await p.waitForTimeout(200);
    check("a hole chosen there is the chart's", await p.evaluate(() => +plotCfg().pieHole === 0.65 && Math.abs(S.geo.pie.rings[1].r0 - 0.65 * S.geo.pie.rings[0].r1) < 0.01));
    // Exports: SVG keeps the arcs; the PDF writer draws them as curves and misses no character.
    const ex = await p.evaluate(async () => { const svg = buildPlot(640, 420, readPalette(true), true); const v = await svgToVector(svg, { kind: "pdf", wPt: 400, hPt: 280, title: "pie", embed: false }); const t = await v.blob.text();
      return { arcs: (svg.match(/A[\d.]+,[\d.]+ 0 [01] [01]/g) || []).length, curves: (t.match(/ c\b/g) || []).length, miss: v.miss || [], pdf: t.slice(0, 5) }; });
    check("an SVG export keeps the arcs, and the PDF draws them as curves", ex.arcs >= 8 && ex.pdf === "%PDF-" && ex.miss.length === 0, JSON.stringify(ex));
    // Junk from storage reads as the defaults.
    await p.evaluate(() => { const g = graphOf(GID()); g.plot = Object.assign({}, g.plot, { pieHole: "junk", pieLab: 5, pieStart: "x", pieDec: 99, pieLabPos: {}, pieCw: "?" }); renderPlot(); });
    const o = await p.evaluate(() => S.geo.pie.o);
    check("junk settings read as the defaults", o.hole === 0 && o.labs.join() === "name,pct" && o.start === 90 && o.dec === 6 && o.pos === "auto", JSON.stringify(o));
  }, { name: "doughnut and rings" });

  console.log("7.1 Categories: dots, means and columns");
  await page(async p => {
    const id = await fruit(p);
    await p.evaluate(id => { plotCols([id.V, id.W], { layout: "mean", quiet: true }); setPlotKey("distBy", id.X, "x"); }, id); await p.waitForTimeout(300);
    // Each category's mean and interval drawn where catSummary puts them, against the values by group.
    const r = await p.evaluate(id => { const g = S.geo, out = [];
      document.querySelectorAll("#plot g[data-dist]").forEach(el => { const k = +el.dataset.dist, q = g.distK[k], m = el.querySelector("[data-distmean]"), ci = el.querySelector("[data-distci]");
        const vals = [], c = q.c, d = finalOf(c); d.y.forEach((y, i) => { if (catVal(colById(id.X), d.idx[i]) === q.g) vals.push(y); });
        const want = catSummary(vals, { stat: "mean", err: "ci", conf: 0.95 }), bb = m && m.getBBox(), ys = ci && ci.getAttribute("d").match(/^M[-\d.]+,([-\d.]+)V([-\d.]+)/);
        out.push({ g: q.g, c: c.name, n: vals.length, want, y: bb ? bb.y + bb.height / 2 : null, Yv: g.Y(want.v), lo: ys ? +ys[1] : null, hi: ys ? +ys[2] : null, Ylo: g.Y(want.lo), Yhi: g.Y(want.hi), tip: el.querySelector("title").textContent }); });
      return { out, yt: [...document.querySelectorAll("#plot text")].map(t => t.textContent), xt: S.geo.distBy && S.geo.distBy.name }; }, id);
    check("eight means (two curves by four fruits), each at its mean and with its 95 % interval's ends", r.out.length === 8 && r.out.every(z => z.n === 20 && Math.abs(z.y - z.Yv) < 0.6 && Math.abs(z.lo - z.Ylo) < 0.11 && Math.abs(z.hi - z.Yhi) < 0.11), JSON.stringify(r.out.slice(0, 2)));
    check("each tooltip gives its count, mean and interval", r.out.every(z => new RegExp(`20 values, mean .*95 % interval`).test(z.tip)), r.out[0].tip);
    check("the groups along X are the fruits, a text column's in its natural order", JSON.stringify([...new Set(r.out.map(z => z.g))]) === JSON.stringify(["Apple", "Fig", "Pear", "Plum"]) && ["Apple", "Pear", "Plum", "Fig"].every(t => r.yt.includes(t)), JSON.stringify(r.yt));
    // Made categorical with its own order, the groups follow it.
    await p.evaluate(id => { pushUndo("cat"); colById(id.X).cat = { order: "custom", levels: ["Plum", "Pear", "Fig", "Apple"] }; save({ cols: P().cols }); renderPlot(); }, id); await p.waitForTimeout(150);
    check("a categorical column's groups in its own order", await p.evaluate(() => JSON.stringify([...new Set(S.geo.distK.map(q => q.g))]) === JSON.stringify(["Plum", "Pear", "Fig", "Apple"])));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    check("the Y axis says what is drawn", r.yt.includes("Mean, 95 % interval"), JSON.stringify(r.yt));
    // ± SD, the median with its quartiles, a 99 % interval, through the chart's own menu.
    const it = name => p.evaluate(name => { const find = (l, n) => l.filter(Boolean).find(i => i.label === n || i.group === n); return !!find(distMenuItems(), name); }, name);
    check("the chart's menu has Shows, Interval, Level, Show the values, Join the means and Grouped by", await it("Shows") && await it("Interval") && await it("Level") && await it("Join the means") && await it("Grouped by"));
    await p.evaluate(() => { distStatItems(plotCfg(), false)[1].sub().find(i => i.label === "± SD").run(); }); await p.waitForTimeout(200);
    let t = await p.evaluate(() => document.querySelector("#plot g[data-dist] title").textContent);
    check("± SD: the tooltip gives the SD", /± [\d.]+ \(SD\)/.test(t), t);
    await p.evaluate(() => { distStatItems(plotCfg(), false)[0].sub().find(i => i.label === "Median").run(); }); await p.waitForTimeout(200);
    t = await p.evaluate(() => [document.querySelector("#plot g[data-dist] title").textContent, plotCfg().distErr, [...document.querySelectorAll("#plot text")].map(t => t.textContent).find(s => /Median/.test(s))]);
    check("the median: its interval falls back to none, and the axis says Median", /median/.test(t[0]) && t[2] === "Median", JSON.stringify(t));
    await p.evaluate(() => { distStatItems(plotCfg(), false)[1].sub().find(i => i.label === "Quartiles").run(); }); await p.waitForTimeout(200);
    t = await p.evaluate(() => document.querySelector("#plot g[data-dist] title").textContent);
    check("the median with its quartiles", /quartiles [\d.]+ to [\d.]+/.test(t), t);
    await p.evaluate(() => undo()); await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("each change one undo step", await p.evaluate(() => distStatOf(plotCfg()).err === "sd" && distStatOf(plotCfg()).stat === "mean"));
    await p.evaluate(() => setPlotKey("distJoin", true, "x")); await p.waitForTimeout(150);
    check("Join the means: a line through each curve's four means", await p.$$eval("#plot [data-distjoin]", a => a.length === 2 && a.every(e => (e.getAttribute("d").match(/L/g) || []).length === 3)));
    // Columns by category, stacked: each stack the sum of the means.
    await p.evaluate(() => { setPlotKey("layout", "catbar", "x"); setPlotKey("colStack", "stack", "x"); }); await p.waitForTimeout(200);
    const st = await p.evaluate(id => { const g = S.geo; const tops = {}; document.querySelectorAll("#plot [data-catbar]").forEach(el => { const k = +el.dataset.catbar, q = g.distK[k], ys = el.getAttribute("d").match(/^M[-\d.]+,([-\d.]+)V([-\d.]+)/); tops[q.g] = Math.min(tops[q.g] == null ? Infinity : tops[q.g], +ys[2]); });
      const want = {}; ["Apple", "Pear", "Plum", "Fig"].forEach(f => { want[f] = [id.V, id.W].reduce((s, cid) => { const c = colById(cid), d = finalOf(c), v = []; d.y.forEach((y, i) => { if (catVal(colById(id.X), d.idx[i]) === f) v.push(y); }); return s + catSummary(v, { stat: "mean" }).v; }, 0); });
      return Object.keys(want).map(f => ({ f, top: tops[f], want: g.Y(want[f]) })); }, id);
    check("stacked columns: each stack's top at the sum of its two means", st.every(z => Math.abs(z.top - z.want) < 0.11), JSON.stringify(st));
    check("stacked columns draw no intervals", await p.$$eval("#plot [data-distci]", a => a.length === 0));
    await p.evaluate(() => { setPlotKey("colStack", null, "x"); }); await p.waitForTimeout(150);
    const z0 = await p.evaluate(() => { const g = S.geo, el = document.querySelector("#plot [data-catbar]"), ys = el.getAttribute("d").match(/^M[-\d.]+,([-\d.]+)V/); return { base: +ys[1], zero: g.Y(0), y0: g.v.y0 }; });
    check("side by side, each column stands on zero, and the axis starts there", Math.abs(z0.base - z0.zero) < 0.11 && z0.y0 === 0, JSON.stringify(z0));
    // A dot plot as a beeswarm: no two dots of a category closer than a dot's width.
    await p.evaluate(() => { setPlotKey("layout", "dot", "x"); setPlotKey("dotKind", "swarm", "x"); }); await p.waitForTimeout(200);
    const sw = await p.evaluate(() => { let worst = Infinity, n = 0; document.querySelectorAll("#plot g[data-dist] path").forEach(el => { const w = +el.getAttribute("stroke-width"), q = [...el.getAttribute("d").matchAll(/M([-\d.]+),([-\d.]+)h0/g)].map(m => [+m[1], +m[2]]); n += q.length;
      for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const d = Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]) / w; if (d < worst) worst = d; } }); return { worst, n }; });
    check("a beeswarm: every value a dot, none overlapping another (to the drawing's tenth of a pixel)", sw.n === 160 && sw.worst > 0.97, JSON.stringify(sw));
    await p.evaluate(() => { setPlotKey("dotLine", "median", "x"); }); await p.waitForTimeout(150);
    check("A line at the median of each category", await p.$$eval("#plot [data-dotline]", a => a.length === 8));
    // Reload: what was set is kept.
    await p.reload(); await ready(p); await p.waitForTimeout(300);
    check("after a reload the dot plot, its kind and line are kept", await p.evaluate(() => plotCfg().layout === "dot" && plotCfg().dotKind === "swarm" && plotCfg().dotLine === "median" && document.querySelectorAll("#plot [data-dotline]").length === 8));
    // Junk from storage.
    await p.evaluate(() => { const g = graphOf(GID()); g.plot = Object.assign({}, g.plot, { layout: "mean", distStat: 3, distErr: "x", distConf: "high", distJoin: "maybe", dotKind: [] }); renderPlot(); });
    check("junk statistic, interval and level read as the mean's 95 % interval", await p.evaluate(() => { const o = distStatOf(plotCfg()); return o.stat === "mean" && o.err === "ci" && o.conf === 95 && document.querySelectorAll("#plot [data-distmean]").length === 8; }));
  }, { name: "dots, means, columns" });

  console.log("7.1 Categories: the trellis and the gallery");
  await page(async p => {
    const id = await fruit(p);
    await p.evaluate(id => { S.ws.c = 1; openPlotDlg([id.V]); }, id); await p.waitForTimeout(300);
    const has = await p.evaluate(() => ({ by: !!$("#psuBy"), as: !!$("#psuByAs"), opts: [...($("#psuByAs") || { options: [] }).options].map(o => o.textContent) }));
    check("Plot setup's Group by has Each value: Curves on one graph, A panel of a figure", has.by && has.as && has.opts.join("|") === "Curves on one graph|A panel of a figure", JSON.stringify(has));
    await p.selectOption("#psuBy", id.G); await p.selectOption("#psuByAs", "panels"); await p.click("#formOk"); await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const f = (P().graphs || []).find(g => g.fig); return f ? { n: f.fig.cells.length, sx: f.fig.shareX, sy: f.fig.shareY, names: f.fig.cells.map(c => graphOf(c.gid).name), cols: f.fig.cells.map(c => graphOf(c.gid).cols.length) } : null; });
    check("a figure of two panels named North and South, X and Y shared, one curve each", r && r.n === 2 && r.sx && r.sy && r.names.join() === "North,South" && r.cols.every(n => n === 1), JSON.stringify(r));
    const lg = await p.evaluate(() => (P().log || []).slice(-2).map(l => l.text).join(" | "));
    check("the log says the panels, a value each", /for each value of Region, 2 graphs/.test(lg), lg);
    await p.evaluate(() => undo()); await p.waitForTimeout(300);
    check("one undo takes the figure, its graphs and the split columns away", await p.evaluate(() => !(P().graphs || []).some(g => g.fig) && !P().cols.some(c => c.src)));
    // The gallery's Categories row: the four cards, drawn with the data.
    await p.evaluate(id => { openPlotDlg([id.V, id.W]); }, id); await p.waitForTimeout(300);
    await p.click("#psuKind"); await p.waitForTimeout(250);
    const cards = await p.evaluate(() => ({ sep: [...document.querySelectorAll(".kindpick .pdlg-sep")].map(e => e.textContent), ks: ["dot", "mean", "catbar", "pie"].map(k => { const b = document.querySelector(`.kindpick [data-pk="${k}"]`); return b ? b.querySelector(".pgt").innerHTML.length : 0; }) }));
    check("the gallery has a Categories row of the dot plot, means, columns and pie, each drawn", cards.sep.includes("Categories") && cards.ks.every(n => n > 200), JSON.stringify(cards));
    await p.click('.kindpick [data-pk="mean"]'); await p.waitForTimeout(200); await p.click("#formOk"); await p.waitForTimeout(400);
    check("OK plots the means with intervals", await p.evaluate(() => plotCfg().layout === "mean" && document.querySelectorAll("#plot [data-distmean]").length === 2));
    // Text added on a chart of categories is pinned, and drawn (it was not, before).
    await p.evaluate(() => { const g = S.geo; addAnno({ t: "text", x: toData(g.L + 100, g.T + 40).x, y: toData(g.L + 100, g.T + 40).y, text: "Note" }); }); await p.waitForTimeout(150);
    check("a text added on a chart of categories is pinned to the plot and drawn", await p.evaluate(() => { const a = P().annos.slice(-1)[0]; return a.pin === "plot" && Math.abs(a.fx - 100 / S.geo.pw) < 0.01 && [...document.querySelectorAll("#plot text")].some(t => t.textContent === "Note"); }));
  }, { name: "trellis and gallery" });

  await page(async p => {
    // Budgets: a pie of 200 slices and a beeswarm of 50 000 values in 20 categories, each drawn in under 60 ms.
    const t = await p.evaluate(async () => {
      const v = Array.from({ length: 200 }, (_, i) => 1 + (i * 7919 % 97)), X = makeCol("x", "Part", "", v.map((_, i) => i + 1)), Y = Object.assign(makeCol("y", "Share", "", v), { pipe: [], mask: [] });
      const n = 50000, g = [], z = []; for (let i = 0; i < n; i++) { g.push(i % 20); z.push(Math.sin(i * 0.37) * 3 + (i % 20) * 0.1 + ((i * 2654435761 % 1000) / 1000)); }
      const G = makeCol("ignore", "Group", "", g), Z = Object.assign(makeCol("y", "Value", "", z), { pipe: [], mask: [] }), X2 = makeCol("x", "Row", "", g.map((_, i) => i));
      await createProject(Object.assign(blankProject("Big"), { cols: [X, Y, X2, Z, G], activeY: Y.id }), "test"); await new Promise(r => setTimeout(r, 120)); renderAll();
      plotCols([Y.id], { layout: "pie", quiet: true }); await new Promise(r => setTimeout(r, 100));
      const time = f => { const t0 = performance.now(); for (let i = 0; i < 3; i++) f(); return (performance.now() - t0) / 3; };
      const pie = time(() => buildPlot(900, 600, readPalette(), null));
      setActiveCol(Z.id); plotCols([Z.id], { layout: "dot", quiet: true, plot: { distBy: G.id, dotKind: "swarm" } }); await new Promise(r => setTimeout(r, 100));
      const dots = time(() => buildPlot(900, 600, readPalette(), null));
      return { pie, dots, k: S.geo.distK && S.geo.distK.length };
    });
    check(`a pie of 200 slices drawn in ${t.pie.toFixed(0)} ms (under 60)`, t.pie < 60, t.pie);
    check(`a beeswarm of 50 000 values in 20 categories drawn in ${t.dots.toFixed(0)} ms (under 60)`, t.k === 20 && t.dots < 60, t.dots);
  }, { name: "budgets", timeout: 120000 });
}

/* A quality table: Width in subgroups of five (a shift in subgroup 7), Lot (text), Defects of Inspected, two methods measuring the
   same things; and a table of studies. */
const qc = async p => {
  await p.evaluate(async () => {
    const n = 50, v = [], lot = [], d = [], sz = [], a = [], b = [];
    for (let i = 0; i < n; i++) { v.push(+(10 + Math.sin(i * 1.3) * 1.5 + (i >= 30 && i < 35 ? 4 : 0)).toFixed(3)); lot.push(["Scratch", "Dent", "Scratch", "Paint", "Crack", "Scratch", "Dent"][i % 7]); d.push(3 + (i * 7 % 5) + (i === 20 ? 14 : 0)); sz.push(80 + (i * 13 % 40)); a.push(+(50 + i * 2 + Math.cos(i) * 3).toFixed(2)); b.push(+(50 + i * 2 * 1.01 + Math.sin(i) * 2).toFixed(2)); }
    const tc = (nm, arr) => Object.assign(makeCol("ignore", nm, ""), { data: arr.map(() => null), fmt: "text", txt: Object.fromEntries(arr.map((t, i) => [i, t])) });
    const cols = [Object.assign(makeCol("x", "Row", ""), { data: v.map((_, i) => i + 1) }), Object.assign(makeCol("y", "Width", "mm"), { data: v, pipe: [], mask: [] }), tc("Defect", lot),
      Object.assign(makeCol("y", "Defects", ""), { data: d, pipe: [], mask: [] }), Object.assign(makeCol("ignore", "Inspected", ""), { data: sz }),
      Object.assign(makeCol("y", "Method A", "mg"), { data: a, pipe: [], mask: [] }), Object.assign(makeCol("y", "Method B", "mg"), { data: b, pipe: [], mask: [] })];
    await createProject(Object.assign(blankProject("Quality"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 120)); renderAll();
  });
  await p.waitForTimeout(400);
  return p.evaluate(() => Object.fromEntries(sheetCols(curSheet()).map(c => [c.name, c.id])));
};
const runKind = async (p, kind, cols, set, o = {}) => {
  await p.evaluate(([k, c, o]) => { anaDlg(k, Object.assign({ cols: c }, o)); }, [kind, cols, o]); await p.waitForSelector("#formOk"); await p.waitForTimeout(150);
  if (set) await set(); if (await p.evaluate(() => document.querySelector("#formOk").disabled)) return { disabled: true };
  const n0 = await p.evaluate(k => anaList().filter(a => a.kind === k).length, kind);
  await p.click("#formOk"); await p.waitForFunction(([k, n0]) => anaList().filter(a => a.kind === k).length > n0 && anaList().filter(a => a.kind === k).slice(-1)[0].res, [kind, n0], { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(250);
  return lastAna(p, kind); };
const lastAna = (p, kind) => p.evaluate(k => { const as = anaList().filter(x => x.kind === k), a = as[as.length - 1]; if (!a) return null;
  const col = key => { const c = P().cols.find(c => c.ana === a.id && c.ak === key); return c ? (c.data || []).map((v, i) => v == null && c.txt && c.txt[i] != null ? c.txt[i] : v) : null; };
  const keys = P().cols.filter(c => c.ana === a.id).map(c => c.ak);
  return { id: a.id, p: a.p, err: a.res.err || null, notes: a.res.notes || [], method: a.res.report && a.res.report.method, rep: a.res.report || null,
    secs: a.res.report && a.res.report.sections.map(s => ({ t: s.title, h: s.tables[0].head, r: s.tables[0].rows })), keys, cols: Object.fromEntries(keys.map(k => [k, col(k)])) }; }, kind);
const near = (a, b, t = 1e-12) => a != null && b != null && Math.abs(a - b) <= t * Math.max(1, Math.abs(b));
const allNear = (a, b, t) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => (v == null && b[i] == null) || near(v, b[i], t));
const noVerdict = r => !/in control|out of control|significant|good agreement|poor|excellent|recommend|suggest|acceptable/i.test(JSON.stringify(r));

if (section("7.2")) {
  console.log("7.2 Statistical charts");
  await page(async p => {
    const id = await qc(p);
    // The menu: Analyze › Statistics › Statistical charts, its five items.
    const items = await p.evaluate(() => { const st = menuItems("analyze").find(i => i.label === "Statistics"), sub = typeof st.sub === "function" ? st.sub() : st.sub, sc = sub.find(i => i.label === "Statistical charts"); return (typeof sc.sub === "function" ? sc.sub() : sc.sub).map(i => i.label); });
    check("Analyze › Statistics › Statistical charts: Q–Q plot, Pareto chart, Control chart, Bland–Altman plot, Forest plot", items.join("|") === "Q–Q plot…|Pareto chart…|Control chart…|Bland–Altman plot…|Forest plot…", items.join("|"));
    // X̄ and R from the column ticked, subgroups of five by size.
    let form = null;
    let r = await runKind(p, "ctrl", [id.Width], async () => { form = await p.evaluate(() => ({ k: document.querySelector("#aChK").value, v: document.querySelector("#aChV").value, n: document.querySelector("#aChN").value, zHidden: document.querySelector("#aChZ").hidden, pHidden: document.querySelector("#aChP").hidden })); });
    check("the dialog: X̄ and R, Values the column ticked, size 5, the attributes' fields hidden", form.k === "xbar-r" && form.v === id.Width && form.n === "5" && form.zHidden && form.pHidden, JSON.stringify(form));
    let want = await p.evaluate(i => { const R = ctrlChart({ chart: "xbar-r", x: colById(i).data, size: 5, rules: "we" }); return { v: R.A.v, cl: R.A.cl, ucl: R.A.ucl, lcl: R.A.lcl, v2: R.B.v, ucl2: R.B.ucl, marks: R.marks, sigma: R.sigma, d2: R.consts.d2 }; }, id.Width);
    check("each subgroup's mean, the centre and limits as ctrlChart gives them, exactly", allNear(r.cols.v, want.v, 0) && allNear(r.cols.cl, want.cl, 0) && allNear(r.cols.ucl, want.ucl, 0) && allNear(r.cols.lcl, want.lcl, 0) && allNear(r.cols.v2, want.v2, 0) && allNear(r.cols.ucl2, want.ucl2, 0), JSON.stringify([r.cols.ucl && r.cols.ucl[0], want.ucl[0]]));
    check("…subgroup 7 breaks rule 1, marked with its rule; the others not", want.marks.length && want.marks.some(m => m.i === 6 && m.rules.includes(1)) && r.cols.mark.filter(v => v != null).length === want.marks.length && r.cols.rule[6] === want.marks.find(m => m.i === 6).rules.join(", "), JSON.stringify([want.marks, r.cols.rule]));
    const chart = r.secs.find(s => s.t === "Chart");
    check("the report: σ̂ and d₂, d₃, c₄; the points that break a rule; the method naming Montgomery and the four rules", chart && chart.r.some(q => q[0] === "σ̂" && q[1] === want.sigma) && chart.r.some(q => q[0] === "d₂" && q[1] === want.d2) && r.secs.some(s => s.t === "Points that break a rule") && /Montgomery/.test(r.method) && /Western Electric's four rules/.test(r.method), JSON.stringify(r.secs));
    check("…numbers only: nothing says the process is in control or not", noVerdict(r), r.method);
    // Drawn: a figure of two panels sharing X, the limits red and dashed, the point ringed and labelled by its rule.
    const g0 = await p.evaluate(() => P().graphs.length);
    await p.evaluate(a => ctrlPlot(a), r.id); await p.waitForTimeout(600);
    let g = await p.evaluate(() => { const gs = P().graphs, f = gs.find(q => q.fig), pan = f ? f.fig.cells.map(c => graphOf(c.gid)) : [];
      return { n: gs.length, fig: !!f, shareX: f && f.fig.shareX, rows: f && f.fig.rows, panels: pan.map(q => q.cols.map(i => colById(i).name)), yt: pan.map(q => ((q.plot.ax || {}).y || {}).title), leg: pan.map(q => q.plot.legend),
        ring: document.querySelectorAll('#figure [data-ser] path, #plot [data-ser] path').length, lab: [...document.querySelectorAll("#plot [data-plab] text")].map(t => t.textContent), win: f ? winState(f.id).g : null }; });
    check("Control chart: a figure of two panels, one above the other, sharing X", g.fig && g.shareX && g.rows === 2 && g.n === g0 + 3, JSON.stringify(g));
    check("…X̄ with its centre, limits and the points that break a rule; R with its centre and limits (no empty curve of points)", g.panels[0].join("|") === "X̄ of Width|Centre|Upper limit|Lower limit|Breaks a rule" && g.panels[1].join("|") === "R of Width|R, centre|R, upper limit|R, lower limit", JSON.stringify(g.panels));
    check("…each panel titled, its legend outside on the right, the rule's number beside the point", g.yt[0] === "X̄ of Width" && g.yt[1] === "R" && g.leg.every(l => l === "out") && g.lab.includes("1"), JSON.stringify([g.yt, g.leg, g.lab]));
    check("…the figure takes the room its two graphs had together, the desk's height", g.win && g.win[3] > 0.95, JSON.stringify(g.win));
    await p.evaluate(() => undo()); await p.waitForTimeout(300);
    check("one undo takes the figure and its graphs away", await p.evaluate(g0 => P().graphs.length === g0, g0));
    // Nelson's rules, X̄ and S.
    r = await runKind(p, "ctrl", [id.Width], async () => { await p.selectOption("#aChK", "xbar-s"); await p.selectOption("#aChR", "nelson"); });
    want = await p.evaluate(i => { const R = ctrlChart({ chart: "xbar-s", x: colById(i).data, size: 5, rules: "nelson" }); return { ucl: R.A.ucl, v2: R.B.v, marks: R.marks.map(m => m.i + ":" + m.rules.join(",")) }; }, id.Width);
    check("X̄ and S with Nelson's rules: as ctrlChart gives them; the method names the eight", allNear(r.cols.ucl, want.ucl, 0) && allNear(r.cols.v2, want.v2, 0) && /Nelson's eight rules/.test(r.method) && r.secs.find(s => s.t === "Centre and limits").r[1][0] === "S", JSON.stringify([r.method, r.secs[0]]));
    // A p chart of Defects of Inspected: its limits change with each size, drawn as steps.
    r = await runKind(p, "ctrl", [id.Defects, id.Inspected], async () => { await p.selectOption("#aChK", "p"); await p.waitForTimeout(80);
      form = await p.evaluate(() => ({ v: document.querySelector("#aChV").value, lab: document.querySelector('label[for="aChV"]').textContent, z: document.querySelector("#aChZ").hidden, s: document.querySelector("#aChS").hidden })); await p.selectOption("#aChZ", id.Inspected); });
    check("p: Defectives the column ticked, Sizes offered, Subgroups hidden", form.v === id.Defects && form.lab === "Defectives" && !form.z && form.s, JSON.stringify(form));
    want = await p.evaluate(([d, n]) => { const R = ctrlChart({ chart: "p", x: colById(d).data, n: colById(n).data, rules: "we" }); return { v: R.A.v, ucl: R.A.ucl, lcl: R.A.lcl, marks: R.marks.map(m => m.i) }; }, [id.Defects, id.Inspected]);
    check("…each proportion and its own limits as ctrlChart gives them; row 21's jump marked", allNear(r.cols.v, want.v, 0) && allNear(r.cols.ucl, want.ucl, 0) && allNear(r.cols.lcl, want.lcl, 0) && want.marks.includes(20) && r.cols.mark[20] != null, JSON.stringify(want.marks));
    await p.evaluate(a => ctrlPlot(a), r.id); await p.waitForTimeout(500);
    g = await p.evaluate(() => { const gr = graphOf(GID()); return { cols: gr.cols.map(i => colById(i).name), types: gr.cols.map(i => ((gr.plot.series || {})[i] || {}).type) }; });
    check("…one graph (no second chart), its limits drawn as steps", g.cols.length === 5 && g.types[2] === "step" && g.types[3] === "step", JSON.stringify(g));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    // Refusals: a size of 1 keeps OK waiting; a column of one value refused in words.
    r = await runKind(p, "ctrl", [id.Width], async () => { await p.fill("#aChN", "1"); await p.dispatchEvent("#aChN", "input"); });
    check("a subgroup size of 1: Work it out waits", r.disabled === true, JSON.stringify(r));
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    r = await runKind(p, "ctrl", [id.Defects], async () => { await p.selectOption("#aChK", "c"); });
    check("c: each count, the centre c̄ and c̄ ± 3√c̄", r.err == null && near(r.cols.cl[0], r.cols.v.reduce((s, v) => s + v, 0) / r.cols.v.length, 1e-14) && near(r.cols.ucl[0], r.cols.cl[0] + 3 * Math.sqrt(r.cols.cl[0]), 1e-14), JSON.stringify([r.err, r.cols.cl && r.cols.cl[0], r.cols.ucl && r.cols.ucl[0]]));

    // Pareto: the defects counted, then Defects summed by type.
    r = await runKind(p, "pareto", [id.Defect], async () => { form = await p.evaluate(() => ({ c: document.querySelector("#aPaC").value, v: document.querySelector("#aPaV").value })); });
    check("Pareto: Categories the text column ticked, Amounts none (count the rows)", form.c === id.Defect && form.v === "", JSON.stringify(form));
    want = await p.evaluate(i => { const c = colById(i), R = paretoOf(c.data.map((_, k) => c.txt[k]), null); return R.rows.map(q => [q.key, q.v, q.pct, q.cum]); }, id.Defect);
    check("…from the largest, each count, share and running share as paretoOf gives them", JSON.stringify(r.cols.lev) === JSON.stringify(want.map(q => q[0])) && allNear(r.cols.n, want.map(q => q[1]), 0) && allNear(r.cols.cum, want.map(q => q[3]), 0) && r.cols.lev[0] === "Scratch" && r.cols.cum[r.cols.cum.length - 1] === 100, JSON.stringify([r.cols.lev, r.cols.n]));
    await p.evaluate(a => paretoPlot(a), r.id); await p.waitForTimeout(500);
    g = await p.evaluate(() => { const gr = graphOf(GID()), ax = gr.plot.ax || {}; return { cols: gr.cols.map(i => colById(i).name), t: gr.cols.map(i => (gr.plot.series[i] || {}).type), r: curveUse(gr.cols[1], gr.plot).ax, y2: ax.y2, ymin: (ax.y || {}).min, xt: [...document.querySelectorAll("#plot text")].map(t => t.textContent).filter(t => /Scratch|Dent|Paint|Crack/.test(t)) }; });
    check("…drawn: columns from the largest, the running share a line on a right axis from 0 to 100 %, the categories named along X", g.t[0] === "column" && g.r === "r" && g.y2 && g.y2.min === 0 && g.y2.max === 100 && g.ymin === 0 && g.xt.slice(0, 4).join("|") === "Scratch|Dent|Paint|Crack", JSON.stringify(g));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    r = await runKind(p, "pareto", [id.Defect, id.Defects], async () => { await p.selectOption("#aPaV", id.Defects); });
    want = await p.evaluate(([c, d]) => { const C = colById(c), D = colById(d), R = paretoOf(C.data.map((_, k) => C.txt[k]), D.data); return R.rows.map(q => q.v); }, [id.Defect, id.Defects]);
    check("…Defects summed by type: the sums as paretoOf gives them, the column named Sum of Defects", allNear(r.cols.n, want, 0) && r.secs[0].h[1] === "Sum of Defects", JSON.stringify([r.cols.n, want, r.secs[0].h]));

    // Bland–Altman.
    r = await runKind(p, "bland", [id["Method A"], id["Method B"]], async () => { form = await p.evaluate(() => ({ a: document.querySelector("#aBaA").value, b: document.querySelector("#aBaB").value })); }, { two: true });
    check("Bland–Altman: Method A and B the two columns ticked", form.a === id["Method A"] && form.b === id["Method B"], JSON.stringify(form));
    want = await p.evaluate(([a, b]) => { const R = blandAltman(colById(a).data, colById(b).data, { mode: "diff", conf: 0.95 }); return { d: R.d, bias: R.bias, lo: R.lo, hi: R.hi, ci: R.biasCI.concat(R.loCI, R.hiCI) }; }, [id["Method A"], id["Method B"]]);
    const ag = r.secs[0].r;
    check("…each difference, the bias, the limits and their intervals as blandAltman gives them", allNear(r.cols.d, want.d, 0) && ag[1][1] === want.bias && ag[3][1] === want.lo && ag[4][1] === want.hi && [ag[1][2], ag[1][3], ag[3][2], ag[3][3], ag[4][2], ag[4][3]].every((v, i) => v === want.ci[i]), JSON.stringify([ag, want]));
    check("…the method: Bland and Altman (1999), numbers only", /Bland and Altman \(1999\)/.test(r.method) && noVerdict(r), r.method);
    await p.evaluate(a => blandPlot(a), r.id); await p.waitForTimeout(500);
    g = await p.evaluate(() => { const gr = graphOf(GID()); return { n: gr.cols.length, drawn: document.querySelectorAll("#plot g[data-ser]").length, fills: [...document.querySelectorAll("#plot path")].filter(e => /fill-opacity/.test(e.outerHTML) || (e.getAttribute("fill") && e.getAttribute("fill") !== "none" && e.getAttribute("opacity"))).length, leg: [...document.querySelectorAll("#plot text")].map(t => t.textContent).filter(t => /^(Bias|Upper limit|Lower limit)$/.test(t)) }; });
    check("…drawn: the differences against the means, every line of the ten drawn, the bias and limits in the legend", g.n === 10 && g.drawn === 10 && g.leg.length === 3, JSON.stringify(g));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    r = await runKind(p, "bland", [id["Method A"], id["Method B"]], async () => { await p.selectOption("#aBaM", "ratio"); }, { two: true });
    want = await p.evaluate(([a, b]) => blandAltman(colById(a).data, colById(b).data, { mode: "ratio" }).bias, [id["Method A"], id["Method B"]]);
    check("…as ratios: the bias as blandAltman's", r.secs[0].r[1][1] === want && /ratio/.test(r.method), JSON.stringify([r.secs[0].r[1], want]));

    // Q–Q: two columns, a figure of two; Weibull fitted, against qqData.
    r = await runKind(p, "qq", [id["Method A"], id["Method B"]], async () => { await p.selectOption("#aQqD", "weibull"); await p.selectOption("#aQqP", "blom"); });
    want = await p.evaluate(i => { const R = qqData(colById(i).data, { dist: "weibull", pos: "blom", conf: 0.95 }); return { x: R.x, y: R.y, lo: R.lo, hi: R.hi, par: R.par }; }, id["Method A"]);
    check("Q–Q: each column's sorted values against the Weibull's quantiles at Blom's positions, the band as qqData gives them", allNear(r.cols.qx0, want.x, 0) && allNear(r.cols.qy0, want.y, 0) && allNear(r.cols.qlo0, want.lo, 0) && allNear(r.cols.qhi0, want.hi, 0) && r.cols.qy1 && r.secs[0].r.length === 2, JSON.stringify([r.cols.qx0 && r.cols.qx0.slice(0, 2), want.x.slice(0, 2)]));
    check("…the fitted parameters in the report and the method", /k = /.test(r.secs[0].r[0][2]) && /maximum likelihood/.test(r.method) && /Blom/.test(r.method), JSON.stringify([r.secs[0].r[0], r.method]));
    await p.evaluate(a => qqKindPlot(a), r.id); await p.waitForTimeout(600);
    g = await p.evaluate(() => { const f = P().graphs.find(q => q.fig); return f ? { panels: f.fig.cells.length, names: f.fig.cells.map(c => graphOf(c.gid).cols.map(i => colById(i).name)[0]) } : null; });
    check("…drawn: a figure of two Q–Q plots, one a column", g && g.panels === 2 && g.names.join("|") === "Method A|Method B", JSON.stringify(g));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    // A Weibull with a value at or below zero is refused in words.
    await p.evaluate(i => { const c = colById(i); pushUndo("t"); c.data = c.data.slice(); c.data[2] = -1; save({ cols: P().cols }, "typed"); }, id.Width); await p.waitForTimeout(300);
    r = await runKind(p, "qq", [id.Width], async () => { await p.selectOption("#aQqD", "weibull"); });
    check("a Weibull Q–Q plot of a column with a value below zero: refused in words", /Width: A Weibull distribution needs values above zero/.test(r.err || ""), r.err);
    await p.evaluate(() => undo()); await p.waitForTimeout(1500);
    r = await lastAna(p, "qq");
    check("…the value put back: the analysis worked out again by itself", !r.err && r.cols.qy0 && r.cols.qy0.length === 50, JSON.stringify(r.err));

    // Followed: a value typed into Width moves the X̄ chart's first mean.
    const first = await p.evaluate(() => { const a = anaList().find(x => x.kind === "ctrl"); return P().cols.find(c => c.ana === a.id && c.ak === "v").data[0]; });
    await p.evaluate(i => { const c = colById(i); pushUndo("t"); c.data = c.data.slice(); c.data[0] += 5; save({ cols: P().cols }, "typed"); }, id.Width); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => { const a = anaList().find(x => x.kind === "ctrl"); return P().cols.find(c => c.ana === a.id && c.ak === "v").data[0]; });
    check("a value typed: the control chart worked out again by itself, the first mean up by a fifth of it", near(after - first, 1, 1e-9), JSON.stringify([first, after]));
    // Junk settings from storage read as the defaults.
    const junk = await p.evaluate(() => { const ins = [{ id: "a", name: "W", unit: "", vals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }];
      const c = ANA_KINDS.ctrl.run(ins, { chart: "junk", rules: 7, size: "x" }), q = ANA_KINDS.qq.run(ins, { dist: "nope", pos: {}, conf: "x" }), b = ANA_KINDS.bland.run(ins.concat([{ id: "b", name: "V", unit: "", vals: [2, 3, 3, 5, 7, 6, 8, 8, 10, 11], rows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }]), { mode: 3, conf: 9 });
      return { c: c.fail || null, q: q.fail || q.report.method, b: b.fail || b.report.sections[0].r || b.report.sections[0].title }; });
    check("junk settings from storage: X̄ and R asks for a size, the Q–Q plot normal, Bland–Altman differences at 95 %", /size/.test(junk.c || "") && /the normal distribution's quantiles/.test(junk.q) && junk.b === "Agreement", JSON.stringify(junk));
    // A reload keeps every analysis.
    const k0 = await p.evaluate(() => anaList().length);
    await p.reload(); await ready(p); await p.waitForTimeout(800);
    check("after a reload every analysis is there", await p.evaluate(k0 => anaList().length === k0 && anaList().every(a => a.res), k0));
  }, { name: "7.2 control, Pareto, Bland–Altman, Q–Q", timeout: 180000 });

  await page(async p => {
    // A forest plot: estimates with standard errors; then odds ratios with their intervals, on a log scale.
    await p.evaluate(async () => { const nm = ["Smith 2001", "Jones 2004", "Lee 2008", "Kim 2010", "Patel 2015", "Brown 2019"], e = [0.42, 0.18, 0.55, 0.31, 0.05, 0.28], se = [0.12, 0.2, 0.15, 0.09, 0.25, 0.11];
      const or = [1.8, 1.2, 2.4, 1.5, 0.9, 1.4], lo = [1.1, 0.7, 1.3, 1.15, 0.45, 1.0], hi = [2.95, 2.06, 4.43, 1.96, 1.8, 1.96];
      const tc = Object.assign(makeCol("ignore", "Study", ""), { data: nm.map(() => null), fmt: "text", txt: Object.fromEntries(nm.map((t, i) => [i, t])) }), y = (n, d) => Object.assign(makeCol("y", n, ""), { data: d, pipe: [], mask: [] });
      const cols = [Object.assign(makeCol("x", "Row", ""), { data: nm.map((_, i) => i + 1) }), tc, y("Effect", e), y("SE", se), y("Odds ratio", or), y("OR from", lo), y("OR to", hi)];
      await createProject(Object.assign(blankProject("Studies"), { cols, activeY: cols[2].id }), "test"); await new Promise(r => setTimeout(r, 120)); renderAll(); });
    await p.waitForTimeout(400);
    const id = await p.evaluate(() => Object.fromEntries(sheetCols(curSheet()).map(c => [c.name, c.id])));
    let form;
    let r = await runKind(p, "meta", [id.Study, id.Effect, id.SE], async () => { form = await p.evaluate(() => ({ n: document.querySelector("#aMaN").value, e: document.querySelector("#aMaE").value, s: document.querySelector("#aMaS").value, l: document.querySelector("#aMaL").hidden })); });
    check("Forest plot: names, estimates and standard errors from the columns ticked; the intervals' fields hidden", form.n === id.Study && form.e === id.Effect && form.s === id.SE && form.l, JSON.stringify(form));
    let want = await p.evaluate(([e, s]) => { const R = metaAnalysis(colById(e).data, colById(s).data.map(v => v * v), { conf: 0.95 }); return { f: [R.fixed.est, R.fixed.se, R.fixed.lo, R.fixed.hi], r: [R.random.est, R.random.se, R.random.lo, R.random.hi], Q: R.Q, I2: R.I2, tau2: R.tau2, w: R.random.w }; }, [id.Effect, id.SE]);
    const pool = r.secs.find(s => s.t === "Pooled").r, het = r.secs.find(s => s.t === "Heterogeneity").r;
    check("…the fixed and random effects, their errors and intervals; Q, I², τ² as metaAnalysis gives them", pool[0].slice(1, 5).every((v, i) => v === want.f[i]) && pool[1].slice(1, 5).every((v, i) => v === want.r[i]) && het[0][1] === want.Q && het[3][1] === want.I2 && het[5][1] === want.tau2 && allNear(r.cols.w, want.w, 0), JSON.stringify([pool, het]));
    check("…the studies named, the method DerSimonian–Laird, numbers only", r.secs[0].r.map(q => q[0]).join("|") === "Smith 2001|Jones 2004|Lee 2008|Kim 2010|Patel 2015|Brown 2019" && /DerSimonian–Laird/.test(r.method) && noVerdict(r), r.method);
    await p.evaluate(a => forestPlot(a), r.id); await p.waitForTimeout(600);
    let g = await p.evaluate(() => { const gr = graphOf(GID()), ax = gr.plot.ax || {}, v = S.geo.v; const an = (P().annos || []).filter(a => a.g === gr.id);
      return { cats: (ax.y.cats || []).map(c => c[1]), tshow: ax.y.tshow, x: [ax.x.min, ax.x.max], v: [v.x0, v.x1], ann: an.map(a => a.t + ":" + a.x), names: [...document.querySelectorAll("#plot text")].map(t => t.textContent).filter(t => /Smith|Brown|Fixed|Random/.test(t)), sq: (gr.plot.series[gr.cols[0]] || {}).scol }; });
    check("…drawn: every study and both pooled estimates named down Y, no Y title, the squares sized by weight", g.names.join("|") === "Smith 2001|Brown 2019|Fixed effect|Random effects" || (g.names.length === 4 && g.cats.length === 8), JSON.stringify(g));
    check("…X over every interval and the line of no effect at 0, dashed", g.x[0] < -0.2 && g.x[1] > 0.8 && g.ann.includes("v:0") && g.tshow === false && !!g.sq, JSON.stringify(g));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    // Odds ratios with intervals: combined as logarithms, shown back as ratios on a log axis.
    r = await runKind(p, "meta", [id.Study, id["Odds ratio"], id["OR from"], id["OR to"]], async () => { await p.selectOption("#aMaE", id["Odds ratio"]); await p.selectOption("#aMaK", "ci"); await p.waitForTimeout(80);
      await p.selectOption("#aMaL", id["OR from"]); await p.selectOption("#aMaH", id["OR to"]); await p.selectOption("#aMaG", "log"); });
    want = await p.evaluate(([o, l, h]) => { const z = DIST.norm.isf(0.025), O = colById(o).data, L = colById(l).data, H = colById(h).data; const R = metaAnalysis(O.map(Math.log), O.map((_, i) => ((Math.log(H[i]) - Math.log(L[i])) / (2 * z)) ** 2), { conf: 0.95 }); return [Math.exp(R.random.est), Math.exp(R.random.lo), Math.exp(R.random.hi)]; }, [id["Odds ratio"], id["OR from"], id["OR to"]]);
    const pr = r.secs.find(s => s.t === "Pooled").r[1];
    check("odds ratios with intervals: pooled on the logarithms, the random effects' ratio and interval back as ratios", near(pr[1], want[0], 1e-15) && near(pr[3], want[1], 1e-15) && near(pr[4], want[2], 1e-15) && /logarithms/.test(r.method), JSON.stringify([pr, want]));
    await p.evaluate(a => forestPlot(a), r.id); await p.waitForTimeout(500);
    g = await p.evaluate(() => { const gr = graphOf(GID()); return { logX: gr.plot.logX, ann: (P().annos || []).filter(a => a.g === gr.id).map(a => a.x), xt: (gr.plot.ax.x || {}).title }; });
    check("…drawn on a log axis, the line of no effect at 1", g.logX === true && g.ann.includes(1) && /log scale/.test(g.xt), JSON.stringify(g));
    // Refused: one study.
    r = await p.evaluate(() => ANA_KINDS.meta.run([{ id: "e", name: "E", unit: "", vals: [0.3], rows: [0] }, { id: "s", name: "S", unit: "", vals: [0.1], rows: [0] }], { est: "e", se: "s" }).fail);
    check("one study refused in words", /two studies/.test(r || ""), r);
  }, { name: "7.2 forest plot", timeout: 120000 });

  await page(async p => {
    // Hierarchical clustering's heat map: the scaled data as a matrix in the dendrogram's order, the two dendrograms beside it.
    await p.evaluate(async () => { const n = 24, names = ["Na", "K", "Ca", "Mg", "Cl", "SO4"], cols = [];
      names.forEach((v, j) => { const d = []; for (let i = 0; i < n; i++) { const g = i % 3; d.push(+(10 + (g === 0 ? j : g === 1 ? -j : j * 0.3) * 1.5 + Math.sin(i * 1.7 + j) * 0.8 + (j < 3 ? g * 2 : 0)).toFixed(3)); } cols.push(Object.assign(makeCol("y", v, "mg/L"), { data: d, pipe: [], mask: [] })); });
      await createProject(Object.assign(blankProject("Waters"), { cols, activeY: cols[0].id }), "test"); await new Promise(r => setTimeout(r, 120)); renderAll(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { anaDlg("hclust", { all: true }); }); await p.waitForSelector("#formOk"); await p.click("#formOk"); await p.waitForTimeout(800);
    const aid = await p.evaluate(() => anaList().slice(-1)[0].id);
    const acts = await p.evaluate(id => anaActs(anaOf(id)).map(x => x.label), aid);
    check("hierarchical clustering's report offers Heat map", acts.includes("Heat map"), JSON.stringify(acts));
    const g0 = await p.evaluate(() => ({ g: P().graphs.length, m: matBooks().length }));
    await p.evaluate(id => heatDendro(id), aid); await p.waitForTimeout(900);
    let r = await p.evaluate(id => { const a = anaOf(id), h = a.res.report.clu.heat, s = anaMatSheet(a), lord = P().cols.find(c => c.ana === id && c.ak === "lord").data, f = P().graphs.find(g => g.fig);
      // each cell against the column's own values scaled to unit variance, row r the observation at place r + 1
      let worst = 0; const cols = h.vnames.map(nm => P().cols.find(c => c.name === nm && !c.ana).data);
      cols.forEach((x, c) => { const n = x.length, mu = x.reduce((s, v) => s + v, 0) / n, sd = Math.sqrt(x.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1));
        x.forEach((v, i) => { const z = s.z[(lord[i] - 1) * s.nx + c]; worst = Math.max(worst, Math.abs(z - (v - mu) / sd)); }); });
      // the variables' order is the linkage of the variables themselves
      const data = P().cols.filter(c => c.role === "y" && !c.ana), Z = data.map(c => { const x = c.data, n = x.length, mu = x.reduce((s, v) => s + v, 0) / n, sd = Math.sqrt(x.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1)); return Float64Array.from(x, v => (v - mu) / sd); });
      const m = Z.length, n = Z[0].length, Rv = new Float64Array(m * n); Z.forEach((z, j) => Rv.set(z, j * n)); const vl = dendroXY(linkage(mvDist(Rv, m, n, "euclidean"), m, "ward"), m).leaves.map(j => data[j].name);
      const cell = gid => f.fig.cells.find(c => c.gid === gid), byCol = k => f.fig.cells.map(c => graphOf(c.gid)).find(g => g.cols.some(id => colById(id).ak === k));
      const top = byCol("vdy"), left = byCol("hy"), map = f.fig.cells.map(c => graphOf(c.gid)).find(g => g.plot.mat);
      return { nx: s.nx, ny: s.ny, worst, vn: h.vnames, vl, fig: { rows: f.fig.rows, cols: f.fig.cols, sx: f.fig.shareX, sy: f.fig.shareY, top: top && cell(top.id), left: left && cell(left.id), map: map && cell(map.id) },
        revL: left && left.plot.revX, revM: map && map.plot.revX, cm: map && map.plot.cmap, rng: map && map.plot.matRng, xl: map && ((map.plot.ax || {}).x || {}).min, method: a.res.report.method,
        names: [...document.querySelectorAll("#figure text, #plot text")].map(t => t.textContent).filter(t => /^(Na|K|Ca|Mg|Cl|SO4)$/.test(t)).length }; }, aid);
    check("the heat map's matrix: 24 rows and 6 columns, each cell its value scaled to unit variance, the rows in the dendrogram's order", r.nx === 6 && r.ny === 24 && r.worst < 1e-12, JSON.stringify([r.nx, r.ny, r.worst]));
    check("…the variables in the order their own Ward linkage puts them", r.vn.join() === r.vl.join(), JSON.stringify([r.vn, r.vl]));
    check("…a figure of three panels: the variables' dendrogram above the map, the observations' to its left, X shared down the column and Y along the row", r.fig.rows === 2 && r.fig.cols === 2 && r.fig.sx === "col" && r.fig.sy === "row" && r.fig.top.r === 0 && r.fig.top.c === 1 && r.fig.left.r === 1 && r.fig.left.c === 0 && r.fig.map.r === 1 && r.fig.map.c === 1, JSON.stringify(r.fig));
    check("…the side dendrogram's root at the left, the map not turned, cool to warm about 0, the axes at the cells' edges, the variables named", r.revL === true && r.revM === false && r.cm === "coolwarm" && r.rng[0] === -r.rng[1] && r.xl === 0.5 && r.names >= 6, JSON.stringify(r));
    check("…the method says how the heat map was made", /The heat map: the scaled values, the observations in the dendrogram's order, the variables joined by ward/i.test(r.method), r.method);
    // Followed: a value typed changes its cell.
    const before = await p.evaluate(id => anaMatSheet(anaOf(id)).z.slice(), aid);
    await p.evaluate(() => { const c = P().cols.find(c => c.role === "y" && !c.ana); pushUndo("t"); c.data = c.data.slice(); c.data[0] += 3; save({ cols: P().cols }, "typed"); }); await p.waitForTimeout(1500);
    const after = await p.evaluate(id => anaMatSheet(anaOf(id)).z.slice(), aid);
    check("a value typed: the heat map's matrix worked out again by itself", after.some((v, i) => v !== before[i]), "");
    await p.evaluate(() => undo()); await p.waitForTimeout(400);
    await p.evaluate(() => undo()); await p.waitForTimeout(400);
    r = await p.evaluate(id => ({ g: P().graphs.length, m: matBooks().length, heat: !!(anaOf(id).p || {}).heat }), aid);
    check("one undo takes the figure, its graphs, the matrix and the heat map's columns away", r.g === g0.g && r.m === g0.m && !r.heat, JSON.stringify([r, g0]));
    await p.evaluate(id => heatDendro(id), aid); await p.waitForTimeout(800);
    await p.reload(); await ready(p); await p.waitForTimeout(800);
    r = await p.evaluate(() => ({ f: P().graphs.some(g => g.fig && g.fig.cells.length === 3), m: matBooks().length }));
    check("after a reload the figure and its matrix are there", r.f && r.m === 1, JSON.stringify(r));
  }, { name: "7.2 heat map with dendrograms", timeout: 120000 });

  await page(async p => {
    // The forms at 390 px: nothing wider than the screen.
    await qc(p);
    const out = [];
    for (const k of ["ctrl", "pareto", "bland", "meta", "qq"]) { await p.evaluate(k => { anaDlg(k, { two: k === "bland" }); }, k); await p.waitForSelector("#formOk"); await p.waitForTimeout(200);
      out.push(await p.evaluate(k => { const m = document.querySelector("#formModal .modal, .modal:not([hidden])") || document.querySelector("#formBody"); const r = m.getBoundingClientRect(); return { k, w: Math.round(r.width), over: [...document.querySelectorAll("#formBody *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length }; }, k));
      await p.keyboard.press("Escape"); await p.waitForTimeout(150); }
    check("each dialog fits a phone's width", out.every(o => o.over === 0 && o.w <= 390), JSON.stringify(out));
  }, { name: "7.2 at 390 px", vw: { width: 390, height: 800 } });
}

/* 7.3 Polar: three curves (a cardioid and a rose against an angle every 5°, and four points across the seam on an X of their own). */
const polarData = async p => {
  await p.evaluate(async () => {
    const th = [], c = [], r = []; for (let i = 0; i < 72; i++) { const t = i * 5; th.push(t); c.push(+(1 + Math.cos(t * Math.PI / 180)).toFixed(6)); r.push(+(1.5 * Math.abs(Math.cos(3 * t * Math.PI / 180))).toFixed(6)); }
    const X = makeCol("x", "Angle", "°", th), A = Object.assign(makeCol("y", "Cardioid", "m", c), { pipe: [], mask: [] }), B = Object.assign(makeCol("y", "Rose", "m", r), { pipe: [], mask: [] });
    const X2 = makeCol("x", "Bearing", "°", [340, 350, 10, 20]), C = Object.assign(makeCol("y", "Seam", "m", [1.5, 1.6, 1.7, 1.8]), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Polar"), { cols: [X, A, B, X2, C], activeY: A.id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll();
  });
  await p.waitForTimeout(400);
  return p.evaluate(() => yCols().map(c => c.id));
};
// Every vertex of each curve's line on the SVG, with the frame, and the places the definition gives its points.
const polRead = p => p.evaluate(() => { const F = S.geo.polar.F, o = S.geo.polar.po, out = {}, ln = {};
  document.querySelectorAll("#plot g[data-polser]").forEach(g => { const d = (g.querySelector("[data-polline]") || { getAttribute: () => "" }).getAttribute("d") || "";
    out[g.dataset.ser] = ln[g.dataset.ser] = [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]);
    // a symbol's circle is "Mx−r,y a r,r …": its centre r to the right of where it starts
    const sd = (g.querySelector("[data-polsym]") || { getAttribute: () => "" }).getAttribute("d") || "";
    out[g.dataset.ser] = out[g.dataset.ser].concat([...sd.matchAll(/M([-\d.]+),([-\d.]+)a([\d.]+),/g)].map(m => [+m[1] + +m[3], +m[2]])); });
  return { F: { cx: F.cx, cy: F.cy, R: F.R, hole: F.hole }, o, lines: out, ln, left: S.geo.polar.left, ang: [...document.querySelectorAll("#plot [data-polang]")].map(e => +e.dataset.polang) }; });
const polDef = (F, o, th, r) => { const turn = { deg: 360, rad: 2 * Math.PI, grad: 400 }[o.unit], z = { e: 0, n: 90, w: 180, s: 270 }[o.zero] + (o.rot || 0), sg = o.cw ? -1 : 1;
  const ph = (z + sg * th * 360 / turn) * Math.PI / 180, rho = F.hole + (1 - F.hole) * (r - o.r0) / (o.r1 - o.r0); return [F.cx + F.R * rho * Math.cos(ph), F.cy - F.R * rho * Math.sin(ph)]; };
// The farthest a point of the data lies from the nearest vertex drawn (the SVG keeps two decimals: 0.005 px each way).
const polOff = (R, ths, rs, id) => { const V = R.lines[id] || []; let worst = 0;
  ths.forEach((t, i) => { if (rs[i] == null) return; const [x, y] = polDef(R.F, R.o, t, rs[i]); let m = Infinity; for (const v of V) m = Math.min(m, Math.hypot(v[0] - x, v[1] - y)); worst = Math.max(worst, m); }); return worst; };

if (section("7.3")) {
  console.log("7.3 Polar");
  await page(async p => {
    const ids = await polarData(p), TH = [...Array(72).keys()].map(i => i * 5);
    const vals = await p.evaluate(ids => ids.map(id => colById(id).data.slice()), ids);
    // From the worksheet's Plot menu: Polar.
    const item = await p.evaluate(ids => { const it = plotItems(ids.slice(0, 2)).find(q => q && q.label === "Polar"); if (it) it.run(); return !!it; }, ids);
    await p.waitForTimeout(600);
    let r = await p.evaluate(() => ({ lay: plotCfg().layout, n: document.querySelectorAll("#plot g[data-polser]").length, grid: !!document.querySelector("#plot [data-polgrid]"), frame: !!document.querySelector("#plot [data-polframe]"), ang: [...document.querySelectorAll("#plot [data-polang]")].map(e => e.textContent).join(" "), rad: [...document.querySelectorAll("#plot [data-polr]")].map(e => e.textContent) }));
    check("Plot's menu has Polar, and it draws both curves in a circle with circles, spokes and the angles round the rim", item && r.lay === "polar" && r.n === 2 && r.grid && r.frame && r.ang === "0° 30° 60° 90° 120° 150° 180° 210° 240° 270° 300° 330°" && r.rad.length >= 3, JSON.stringify(r));
    await p.evaluate(id => { toggleColVis(id); savePlot({ series: Object.assign({}, plotCfg().series, { [id]: { type: "linesym" } }) }, "t"); }, ids[2]); await p.waitForTimeout(400);
    // Every point at r cos θ, r sin θ, for every zero and both directions.
    const offs = [];
    for (const z of ["e", "n", "w", "s"]) for (const cw of [false, true]) {
      await p.evaluate(({ z, cw }) => { savePlot({ polZero: z === "e" ? null : z, polCw: cw || null }, "t"); renderPlot(); }, { z, cw }); await p.waitForTimeout(150);
      const R = await polRead(p); offs.push([z, cw, Math.max(polOff(R, TH, vals[0], ids[0]), polOff(R, TH, vals[1], ids[1])).toExponential(2), R.o.zero, R.o.cw]); }
    check("every point of both curves where the definition puts it, for the zero east, north, west and south, either way round (within the SVG's 0.005 px)", offs.every(q => +q[2] <= 0.0072 && q[3] === q[0] && q[4] === q[1]), JSON.stringify(offs));
    // The angle in radians and gradians: the same circle, read in another unit.
    await p.evaluate(ids => { savePlot({ polZero: null, polCw: null, polUnit: "rad" }, "t"); renderPlot(); }, ids); await p.waitForTimeout(150);
    let R = await polRead(p); const ang = R.ang;
    check("in radians the rim says multiples of π, and the spokes are at sixths of π", ang.length === 12 && Math.abs(ang[1] - Math.PI / 6) < 1e-7 && await p.evaluate(() => [...document.querySelectorAll("#plot [data-polang]")].map(e => e.textContent).slice(0, 4).join(" ")) === "0 π/6 π/3 π/2", JSON.stringify(ang));
    await p.evaluate(() => { savePlot({ polUnit: null }, "t"); renderPlot(); }); await p.waitForTimeout(150);
    // The seam: 340°, 350°, 10°, 20° joined the short way, never round the far side.
    R = await polRead(p); const S3 = R.ln[ids[2]] || [], phs = S3.map(([x, y]) => Math.atan2(-(y - R.F.cy), x - R.F.cx) * 180 / Math.PI);
    check("a line from 350° to 10° crosses the seam the short way: every vertex within 20° of the zero, in pieces of 3° at most", S3.length >= 14 && phs.every(a => Math.abs(a) <= 20.01) && phs.slice(1).every((a, i) => Math.abs(a - phs[i]) <= 3.01), JSON.stringify(phs.map(a => +a.toFixed(2))));
    check("…and its four points at their places", polOff(R, [340, 350, 10, 20], [1.5, 1.6, 1.7, 1.8], ids[2]) <= 0.0072);
    // A hole: the smallest radius a ring; the cardioid's 0 at 180° on it.
    await p.evaluate(() => { pushUndo("t"); savePlot({ polHole: 0.3 }, "t"); renderPlot(); }); await p.waitForTimeout(150);
    R = await polRead(p);
    const bg = await p.evaluate(() => { const d = document.querySelector("#plot [data-polbg]").getAttribute("d"), F = S.geo.polar.F; return [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => Math.hypot(+m[1] - F.cx, +m[2] - F.cy) / F.R); });
    check("a hole of 0.3: the region a ring from 0.3 to 1 of the radius, the cardioid's zero on its inner edge", Math.abs(Math.min(...bg) - 0.3) < 1e-4 && Math.abs(Math.max(...bg) - 1) < 1e-4 && polOff(R, TH, vals[0], ids[0]) <= 0.0072, JSON.stringify([Math.min(...bg), Math.max(...bg)]));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("one undo closes the hole", await p.evaluate(() => polarOpts(plotCfg()).hole === 0 && S.geo.polar.F.hole === 0));
    // A sector, through the Range and sector dialog.
    await p.evaluate(() => { polRangeDlg(); }); await p.waitForSelector("#prT0"); await p.fill("#prR1", "2.5"); await p.fill("#prT0", "0"); await p.fill("#prT1", "180"); await p.click("#formOk"); await p.waitForTimeout(300);
    R = await polRead(p);
    const outN = TH.filter(t => t > 180).length * 2 + 2;
    check("a sector 0° to 180° from the dialog: the angles 0° to 180° alone, the radius to 2.5, the points outside left out and counted", R.ang.join() === "0,30,60,90,120,150,180" && R.o.r1 === 2.5 && R.left === outN && polOff(R, TH.filter(t => t <= 180), vals[0].slice(0, 37), ids[0]) <= 0.0072, JSON.stringify({ ang: R.ang, r1: R.o.r1, left: R.left, outN }));
    const fitd = await p.evaluate(() => { const F = S.geo.polar.F, g = S.geo; return { dx: F.cx - (g.L + g.pw / 2), dy: (F.cy - F.R / 2) - (g.T + g.mh / 2) }; });
    check("…the half disc fitted into the plot and centred both ways", Math.abs(fitd.dx) < 0.5 && Math.abs(fitd.dy) < 0.5, JSON.stringify(fitd));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("one undo puts the whole circle back", await p.evaluate(() => polarOpts(plotCfg()).t0 === null && polarOpts(plotCfg()).r1 === null));
    // The readout: θ and r of the place under the pointer.
    const at = await p.evaluate(() => { const F = S.geo.polar.F, q = polarFwd(F, 60, 1.2), svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), k = bb.width / svg.viewBox.baseVal.width; return { x: bb.left + q[0] * k, y: bb.top + q[1] * k, k }; });
    await p.mouse.move(at.x, at.y); await p.waitForTimeout(150);
    const ro = await p.evaluate(() => document.querySelector("#readout").textContent), m = ro.match(/θ\s*([-\d.]+)°\s+r\s*([-\d.]+)/);
    check("the readout says θ and r under the pointer (within its pixel)", m && Math.abs(+m[1] - 60) < 0.5 && Math.abs(+m[2] - 1.2) < 0.02, ro);
    // The wheel zooms the radius; a double-click shows it all again.
    await p.mouse.wheel(0, 300); await p.waitForTimeout(250);
    const v1 = await p.evaluate(() => S.geo.v.y1);
    await p.mouse.dblclick(at.x, at.y); await p.waitForTimeout(300);
    const v2 = await p.evaluate(() => S.geo.v.y1);
    check("the wheel changes the radial range (the rim's radius), a double-click shows it all again", v1 !== 2 && v2 === 2, JSON.stringify([v1, v2]));
    // The Pan tool turns the zero: a drag a quarter round.
    await p.evaluate(() => setMode("pan"));
    const c = await p.evaluate(() => { const svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), F = S.geo.polar.F, k = bb.width / svg.viewBox.baseVal.width; return { x: bb.left + F.cx * k, y: bb.top + F.cy * k, R: F.R * k }; });
    await p.mouse.move(c.x + c.R * 0.7, c.y); await p.mouse.down(); await p.mouse.move(c.x, c.y - c.R * 0.7, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(250);
    R = await polRead(p);
    check("the Pan tool turns the zero with the drag (a quarter turn), every point turned with it", Math.abs(R.o.rot - 90) < 1 && polOff(R, TH, vals[0], ids[0]) <= 0.0072, JSON.stringify(R.o.rot));
    await p.evaluate(() => { setMode("zoom"); S.view = null; renderPlot(); }); await p.waitForTimeout(150);
    // The Polar menu and the Format pane.
    const menu = await p.evaluate(() => { const it = graphMenuItems().find(q => q && q.label === "Polar"); return it ? (typeof it.sub === "function" ? it.sub() : it.sub).filter(q => q && q.label).map(q => q.label) : null; });
    check("the graph's menu has Polar: coordinates, angle unit, zero, direction, hole, range and sector, circles, spokes", menu && ["Coordinates", "Angle in", "Zero at", "Clockwise", "Hole", "Range and sector…", "Circles", "Spokes"].every(l => menu.includes(l)), JSON.stringify(menu));
    await p.evaluate(() => { const it = polMenuItems().find(q => q && q.label === "Clockwise"); it.run(); }); await p.waitForTimeout(200);
    const lg = await p.evaluate(() => ({ cw: polarOpts(plotCfg()).cw, log: (P().log || []).slice(-1)[0].text }));
    check("Clockwise from the menu, said in the log", lg.cw === true && /clockwise/.test(lg.log), JSON.stringify(lg));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    await p.evaluate(() => openPlotDetails(null, "layout")); await p.waitForTimeout(250);
    const f = await p.evaluate(() => ["pdQm", "pdQu", "pdQz", "pdQh", "pdQcw", "pdQgr", "pdQgt"].map(id => !!document.getElementById(id)));
    check("the Format pane's Layout page has the coordinates, unit, zero, hole, direction, circles and spokes", f.every(Boolean), JSON.stringify(f));
    await p.selectOption("#pdQz", "n"); await p.waitForTimeout(600); await p.evaluate(() => { pdCommit && pdCommit(); closePlotDetails(); }); await p.waitForTimeout(200);
    check("a zero chosen there is the graph's, one undo step", await p.evaluate(() => polarOpts(plotCfg()).zero === "n"));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    check("…undone", await p.evaluate(() => polarOpts(plotCfg()).zero === "e"));
    // X as r and Y as θ: the other mapping.
    await p.evaluate(() => { savePlot({ polMap: "r-theta" }, "t"); renderPlot(); }); await p.waitForTimeout(150);
    R = await polRead(p);
    check("X as r and Y as θ: each point at its X's radius and its value's angle", polOff(R, vals[0], TH, ids[0]) <= 0.0072, polOff(R, vals[0], TH, ids[0]));
    await p.evaluate(() => { savePlot({ polMap: null }, "t"); renderPlot(); }); await p.waitForTimeout(150);
    // Exports: the SVG at its size, the PDF drawing every line, no character missing.
    const ex = await p.evaluate(async () => { const svg = buildPlot(640, 480, readPalette(true), true); const v = await svgToVector(svg, { kind: "pdf", wPt: 400, hPt: 300, title: "polar", embed: false }); const t = await v.blob.text();
      return { lines: (svg.match(/data-polline/g) || []).length, deg: (svg.match(/°/g) || []).length, pdf: t.slice(0, 5), miss: v.miss || [], size: v.blob.size }; });
    check("an export draws the curves and the rim's angles, and its PDF misses no character (°, π)", ex.lines === 3 && ex.deg >= 12 && ex.pdf === "%PDF-" && ex.miss.length === 0, JSON.stringify(ex));
    // Junk from storage reads as the defaults.
    await p.evaluate(() => { const g = graphOf(GID()); g.plot = Object.assign({}, g.plot, { polUnit: "x", polZero: 5, polHole: "junk", polCw: "?", polR0: "a", polR1: {}, polT0: 3, polMap: 9 }); renderPlot(); });
    const o = await p.evaluate(() => polarOpts(plotCfg()));
    check("junk settings read as the defaults (a sector with one end is the whole turn)", o.unit === "deg" && o.zero === "e" && o.hole === 0 && o.r0 === null && o.r1 === null && o.map === "theta-r" && await p.evaluate(() => S.geo.polar && S.geo.polar.F.R > 50), JSON.stringify(o));
    // After a reload it is still polar.
    await p.evaluate(() => { const g = graphOf(GID()); ["polUnit", "polZero", "polHole", "polCw", "polR0", "polR1", "polT0", "polMap"].forEach(k => delete g.plot[k]); savePlot({ polZero: "s" }, "t"); });
    await p.reload(); await ready(p); await p.waitForTimeout(600);
    check("after a reload the graph is polar, its zero south", await p.evaluate(() => plotCfg().layout === "polar" && polarOpts(plotCfg()).zero === "s" && document.querySelectorAll("#plot g[data-polser]").length === 3));
  }, { name: "7.3 polar curves", timeout: 120000 });

  await page(async p => {
    // A matrix drawn as a polar map: its X the angle, its Y the radius.
    await p.evaluate(() => { const nx = 36, ny = 20, z = []; for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) z.push(+(Math.sin(j * 20 * Math.PI / 180) * (i + 1)).toFixed(6));
      const s = matSheetNew({ nx, ny, x: { a: 5, b: 355 }, y: { a: 0.5, b: 10 }, z }, "Field", { xname: "Angle", xunit: "°", yname: "Radius", yunit: "cm", zname: "Field" }), bk = matBookNew(s, "Field"); save({ mats: matBooks().concat([bk]) }, "made"); });
    await p.waitForTimeout(300);
    await p.evaluate(() => plotMatrix(matAll().slice(-1)[0].s.id, "image")); await p.waitForTimeout(500);
    const it = await p.evaluate(() => { const m = mapMenuItems().find(q => q && /polar/i.test(q.label || "")); if (m) m.run(); return m && m.label; }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const g = S.geo.polar, s = matAll().slice(-1)[0].s; const X = matXYOf(s).X, Y = matXYOf(s).Y; const at = []; for (const [i, j] of [[0, 0], [5, 9], [19, 35], [12, 20]]) at.push([g.z(X[j], Y[i]), s.z[i * s.nx + j]]);
      return { lay: plotCfg().layout, img: !!document.querySelector("#plot [data-polmap]"), bar: document.querySelectorAll("#plot image").length, at, title: [...document.querySelectorAll("#plot text")].map(t => t.textContent).filter(t => /Radius/.test(t)) }; });
    check("a matrix's map menu draws it polar: the image, its colour bar, the radius titled by its Y", it && r.lay === "polar" && r.img && r.bar >= 2 && r.title.length === 1, JSON.stringify(r));
    check("…each cell's value where its angle and radius are", r.at.every(([a, b]) => a === b), JSON.stringify(r.at));
    const at = await p.evaluate(() => { const F = S.geo.polar.F, q = polarFwd(F, 185, 6.2), svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), k = bb.width / svg.viewBox.baseVal.width; return { x: bb.left + q[0] * k, y: bb.top + q[1] * k }; });
    await p.mouse.move(at.x, at.y); await p.waitForTimeout(150);
    const ro = await p.evaluate(() => document.querySelector("#readout").textContent), want = await p.evaluate(() => { const s = matAll().slice(-1)[0].s, X = matXYOf(s).X, Y = matXYOf(s).Y; return s.z[matCellAt(Y, 6.2) * s.nx + matCellAt(X, 185)]; });
    check("the readout names the cell's value under the pointer", ro.includes(fmtNum(want)), `${ro} against ${want}`);
    function fmtNum(v) { return String(+v.toPrecision(6)); }
    const back = await p.evaluate(() => { const m = polMenuItems().find(q => q && q.label === "As a rectangular map"); if (m) m.run(); return !!m && plotCfg().layout === "heat"; });
    check("As a rectangular map draws it as before", back);
  }, { name: "7.3 a matrix as a polar map" });

  await page(async p => {
    const ids = await polarData(p);
    // Plot setup's gallery has Polar in a Coordinates row; OK draws it.
    await p.evaluate(ids => { openPlotDlg(ids.slice(0, 2)); }, ids); await p.waitForTimeout(300);
    await p.click("#psuKind"); await p.waitForTimeout(250);
    const card = await p.evaluate(() => ({ sep: [...document.querySelectorAll(".kindpick .pdlg-sep")].map(e => e.textContent), n: (document.querySelector('.kindpick [data-pk="polar"] .pgt') || { innerHTML: "" }).innerHTML.length }));
    check("Plot setup's gallery has a Coordinates row with Polar, drawn with the data", card.sep.includes("Coordinates") && card.n > 200, JSON.stringify(card));
    await p.click('.kindpick [data-pk="polar"]'); await p.waitForTimeout(200); await p.click("#formOk"); await p.waitForTimeout(500);
    check("OK draws them polar, one undo step", await p.evaluate(() => plotCfg().layout === "polar" && document.querySelectorAll("#plot g[data-polser]").length === 2));
    const w = await p.evaluate(() => { const svg = document.querySelector("#plot"), r = svg.getBoundingClientRect(); return { w: r.width, R: S.geo.polar.F.R, over: [...document.querySelectorAll("#plot text")].filter(t => { const b = t.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).length }; });
    check("at 390 px the circle fits the graph and no number or angle runs off it", w.R > 60 && w.over === 0, JSON.stringify(w));
    await p.evaluate(() => { polRangeDlg(); }); await p.waitForSelector("#prR0"); await p.waitForTimeout(150);
    const fit = await p.evaluate(() => [...document.querySelectorAll("#formBody *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length);
    check("the range dialog fits a phone's width", fit === 0, fit);
    await p.keyboard.press("Escape");
  }, { name: "7.3 Plot setup and 390 px", vw: { width: 390, height: 800 } });
}

/* 7.4 Ternary: soil textures (sand, silt, clay; a row with a part below 0 and one with a part missing) and a path of 20 rows. */
const soilData = async p => {
  await p.evaluate(async () => { const sa = [], si = [], cl = [], s2 = [], i2 = [], c2 = []; let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 40; i++) { sa.push(+(20 + 50 * rnd()).toFixed(1)); si.push(+(10 + 40 * rnd()).toFixed(1)); cl.push(+(5 + 30 * rnd()).toFixed(1)); }
    for (let i = 0; i < 20; i++) { const t = i / 19; s2.push(+(70 - 50 * t).toFixed(2)); i2.push(+(20 + 10 * t).toFixed(2)); c2.push(+(10 + 40 * t).toFixed(2)); }
    cl[5] = -2; si[7] = null; sa[9] = 0; si[9] = 0; cl[9] = 0;
    const mk = (r, n, u, d) => Object.assign(makeCol(r, n, u, d), r === "y" ? { pipe: [], mask: [] } : {}), pad = a => a.concat(Array(20).fill(null));
    const cols = [makeCol("x", "Sample", "", sa.map((_, i) => i + 1)), mk("y", "Sand", "%", sa), mk("y", "Silt", "%", si), mk("y", "Clay", "%", cl), mk("y", "Path sand", "%", pad(s2)), mk("y", "Path silt", "%", pad(i2)), mk("y", "Path clay", "%", pad(c2))];
    await createProject(Object.assign(blankProject("Soil"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll(); });
  await p.waitForTimeout(400);
  return p.evaluate(() => yCols().map(c => ({ id: c.id, d: c.data.slice() })));
};
// Each curve's symbol centres (a circle's path starts r to its left) and line vertices, the corners, what was left out.
const ternRead = p => p.evaluate(() => { const T = S.geo.tern, out = {};
  document.querySelectorAll("#plot g[data-ternser]").forEach(g => { const id = g.dataset.ser, ln = (g.querySelector("[data-ternline]") || { getAttribute: () => "" }).getAttribute("d") || "", sd = (g.querySelector("[data-ternsym]") || { getAttribute: () => "" }).getAttribute("d") || "";
    out[id] = { line: [...ln.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]), sym: [...sd.matchAll(/M([-\d.]+),([-\d.]+)a([\d.]+),/g)].map(m => [+m[1] + +m[3], +m[2]]) }; });
  const gd = (document.querySelector("#plot [data-terngrid]") || { getAttribute: () => "" }).getAttribute("d") || "";
  return { A: T.F.A, B: T.F.B, C: T.F.C, o: T.o, left: T.left, names: T.names, curves: out, grid: [...gd.matchAll(/M([-\d.]+),([-\d.]+)L([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2], +m[3], +m[4]]),
    nums: [...document.querySelectorAll("#plot [data-ternnum]")].map(e => ({ k: e.dataset.ternnum, x: +e.getAttribute("x"), y: +e.getAttribute("y"), t: e.textContent })), note: (document.querySelector("#plot [data-ternleft]") || {}).textContent || "" }; });
// Where the definition puts a row (each part over their sum, the corners weighted by them), or null.
const ternDef = (R, a, b, c) => { if (![a, b, c].every(v => v != null && Number.isFinite(v) && v >= 0)) return null; const s = a + b + c; if (!(s > 0)) return null;
  const f = [a / s, b / s, c / s]; return [f[0] * R.A[0] + f[1] * R.B[0] + f[2] * R.C[0], f[0] * R.A[1] + f[1] * R.B[1] + f[2] * R.C[1]]; };
const ternOff = (pts, rows, R) => { let worst = 0, n = 0; rows.forEach(([a, b, c]) => { const q = ternDef(R, a, b, c); if (!q) return; n++; let m = Infinity; for (const v of pts) m = Math.min(m, Math.hypot(v[0] - q[0], v[1] - q[1])); worst = Math.max(worst, m); }); return { worst, n }; };

if (section("7.4")) {
  console.log("7.4 Ternary");
  await page(async p => {
    const cs = await soilData(p), rows1 = cs[0].d.map((v, i) => [v, cs[1].d[i], cs[2].d[i]]), rows2 = cs[3].d.slice(0, 20).map((v, i) => [v, cs[4].d[i], cs[5].d[i]]);
    // From Plot's menu, six columns: two curves, each with its next two columns as B and C.
    const it = await p.evaluate(ids => { const m = plotItems(ids).find(q => q && q.label === "Ternary"); if (m) m.run(); return !!m; }, cs.map(c => c.id)); await p.waitForTimeout(600);
    let r = await p.evaluate(() => ({ lay: plotCfg().layout, n: document.querySelectorAll("#plot g[data-ternser]").length, ser: plotCfg().series, toast: (document.querySelector("#toast") || {}).textContent || "", off: [...document.querySelectorAll("#ws .hoff")].length }));
    check("Plot's menu has Ternary: six columns make two curves, each with its next two columns as B and C, said in the message; no column says it is not plotted", it && r.lay === "ternary" && r.n === 2 && r.ser[cs[0].id].tB === cs[1].id && r.ser[cs[0].id].tC === cs[2].id && r.ser[cs[3].id].tB === cs[4].id && /Sand, Silt, Clay; Path sand, Path silt, Path clay/.test(r.toast) && r.off === 0, JSON.stringify(r));
    let R = await ternRead(p);
    let o1 = ternOff(R.curves[cs[0].id].sym, rows1, R);
    check("every row of the first curve a symbol where its parts put it (within the symbols' 0.05 px), the corners titled by the columns", o1.n === 37 && o1.worst <= 0.0712 && R.names.join() === "Sand,Silt,Clay", JSON.stringify([o1, R.names]));
    check("its rows with a part below 0, a part missing and every part 0 left out, counted and said", R.left === 3 && /3 rows left out/.test(R.note) && R.curves[cs[0].id].sym.length === 37, JSON.stringify([R.left, R.note]));
    // The path as a line: its vertices at the definition's places (two decimals).
    await p.evaluate(id => { savePlot({ series: Object.assign({}, plotCfg().series, { [id]: Object.assign({}, plotCfg().series[id], { type: "linesym" }) }) }, "t"); renderPlot(); }, cs[3].id); await p.waitForTimeout(200);
    R = await ternRead(p); const o2 = ternOff(R.curves[cs[3].id].line, rows2, R);
    check("a curve drawn as lines: each vertex at its row's place (within 0.005 px), straight between them", o2.n === 20 && o2.worst <= 0.0072 && R.curves[cs[3].id].line.length === 20, JSON.stringify(o2));
    // The grid: each part's lines at 0.1 … 0.9 parallel to the side across from its corner.
    const gw = await p.evaluate(() => { const F = S.geo.tern.F, out = []; TERN_K.forEach(k => [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(j => out.push(ternGrid(F, k, j / 10)))); return out; });
    const gOff = Math.max(...gw.map((g, i) => { const d = R.grid[i]; return d ? Math.max(Math.hypot(d[0] - g[0][0], d[1] - g[0][1]), Math.hypot(d[2] - g[1][0], d[3] - g[1][1])) : Infinity; }));
    const par = gw.every((g, i) => { const k = Math.floor(i / 9), P = [R.A, R.B, R.C], J = P[(k + 1) % 3], M = P[(k + 2) % 3], ux = g[1][0] - g[0][0], uy = g[1][1] - g[0][1], vx = M[0] - J[0], vy = M[1] - J[1]; return Math.abs(ux * vy - uy * vx) <= 1e-9 * Math.hypot(ux, uy) * Math.hypot(vx, vy); });
    check("27 grid lines, each at its part's value and parallel to the side across from its corner", R.grid.length === 27 && gOff <= 0.0072 && par, JSON.stringify([R.grid.length, gOff, par]));
    const nm = R.nums.filter(q => q.k.startsWith("a:")), ax = R.A[0];
    check("anticlockwise: Sand's numbers 0.1 … 0.9 up the right side, rising to its corner", nm.length === 9 && nm.every(q => q.x > ax - 1) && +nm[8].t === 0.9 && nm[8].y < nm[0].y, JSON.stringify(nm.map(q => [q.t, q.x, q.y])));
    // The readout: the three parts under the pointer.
    const at = await p.evaluate(() => { const F = S.geo.tern.F, q = ternFwd(F, 0.5, 0.3, 0.2), svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), k = bb.width / svg.viewBox.baseVal.width; return { x: bb.left + q[0] * k, y: bb.top + q[1] * k }; });
    await p.mouse.move(at.x, at.y); await p.waitForTimeout(150);
    const ro = await p.evaluate(() => document.querySelector("#readout").textContent), m = ro.match(/Sand ([\d.]+)\s+Silt ([\d.]+)\s+Clay ([\d.]+)/);
    check("the status bar reads the three parts under the pointer", m && Math.abs(+m[1] - 0.5) < 0.005 && Math.abs(+m[2] - 0.3) < 0.005 && Math.abs(+m[3] - 0.2) < 0.005, ro);
    // The wheel and the Pan tool leave it whole.
    await p.mouse.wheel(0, 300); await p.waitForTimeout(150);
    check("the wheel does nothing to a ternary graph", await p.evaluate(() => !S.view && S.geo.tern && S.geo.tern.F.side > 100));
    // Its menu: percentages, clockwise, the grid.
    const menu = await p.evaluate(() => { const it = graphMenuItems().find(q => q && q.label === "Ternary"); return it ? (typeof it.sub === "function" ? it.sub() : it.sub).filter(q => q && q.label).map(q => q.label) : null; });
    check("the graph's menu has Ternary: what each row adds up to, clockwise, the grid lines, the parts B and C", menu && ["Each row adds up to", "Clockwise", "Grid lines", "Parts B and C…"].every(l => menu.includes(l)), JSON.stringify(menu));
    await p.evaluate(() => { const it = ternMenuItems()[0].sub().find(q => /100/.test(q.label)); it.run(); }); await p.waitForTimeout(200);
    await p.evaluate(() => { ternMenuItems().find(q => q.label === "Clockwise").run(); }); await p.waitForTimeout(200);
    R = await ternRead(p); const nc = R.nums.filter(q => q.k.startsWith("a:"));
    await p.mouse.move(at.x, at.y + 1); await p.mouse.move(at.x, at.y); await p.waitForTimeout(150);
    const ro2 = await p.evaluate(() => document.querySelector("#readout").textContent);
    check("as percentages, clockwise: Sand's numbers 10 … 90 up the left side, the readout in %", R.o.sum === 100 && R.o.cw && nc.every(q => q.x < ax + 1) && nc.map(q => q.t).join() === "10,20,30,40,50,60,70,80,90" && /Sand (49|50)\.\d+ %/.test(ro2), JSON.stringify([R.o, nc.map(q => [q.t, Math.round(q.x)]), ro2]));
    o1 = ternOff(R.curves[cs[0].id].sym, rows1, R);
    check("…the points where they were (only the numbers change)", o1.worst <= 0.0712, o1.worst);
    await p.evaluate(() => undo()); await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("two undos: fractions, anticlockwise", await p.evaluate(() => ternOpts(plotCfg()).sum === 1 && !ternOpts(plotCfg()).cw));
    await p.evaluate(() => { ternMenuItems().find(q => q.label === "Grid lines").run(); }); await p.waitForTimeout(200);
    check("Grid lines off from the menu", await p.evaluate(() => !document.querySelector("#plot [data-terngrid]") && ternOpts(plotCfg()).grid === false));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    // The Format pane's Layout page.
    await p.evaluate(() => openPlotDetails(null, "layout")); await p.waitForTimeout(250);
    const f = await p.evaluate(() => ["pdTs", "pdTcw", "pdTg"].map(id => !!document.getElementById(id)));
    check("the Format pane's Layout page has what a row adds up to, clockwise and the grid lines", f.every(Boolean), JSON.stringify(f));
    await p.selectOption("#pdTs", "100"); await p.waitForTimeout(600); await p.evaluate(() => { pdCommit && pdCommit(); closePlotDetails(); }); await p.waitForTimeout(200);
    check("percentages chosen there are the graph's", await p.evaluate(() => ternOpts(plotCfg()).sum === 100));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    // A corner titled by typing, and undone.
    await p.evaluate(() => setAxisTitle("ta", "Sand (%)")); await p.waitForTimeout(200);
    const tt = await p.evaluate(() => ({ n: S.geo.tern.names[0], t: [...document.querySelectorAll('#plot [data-axtitle="ta"]')].map(e => e.textContent) }));
    check("a corner's title typed is drawn there", tt.n === "Sand (%)" && tt.t.some(t => t.replace(/\s+/g, " ") === "Sand (%)"), JSON.stringify(tt));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    // Export: the PDF draws it and misses no character.
    const ex = await p.evaluate(async () => { const svg = buildPlot(640, 520, readPalette(true), true); const v = await svgToVector(svg, { kind: "pdf", wPt: 400, hPt: 325, title: "ternary", embed: false }); const t = await v.blob.text();
      return { sym: (svg.match(/data-ternsym/g) || []).length, grid: (svg.match(/data-terngrid/g) || []).length, pdf: t.slice(0, 5), miss: v.miss || [] }; });
    check("an export draws both curves and the grid; its PDF misses no character", ex.sym === 2 && ex.grid === 1 && ex.pdf === "%PDF-" && ex.miss.length === 0, JSON.stringify(ex));
    // A column of B deleted: the curve says it has none.
    await p.evaluate(id => { const p = P(); pushUndo("t"); p.cols = p.cols.filter(c => c.id !== id); save({ cols: p.cols }, "deleted"); }, cs[1].id); await p.waitForTimeout(300);
    R = await ternRead(p);
    check("its B column deleted: the curve has no place and the graph says so", !R.curves[cs[0].id] && /Sand has no B and C/.test(R.note), R.note);
    await p.evaluate(() => undo()); await p.waitForTimeout(300);
    // Junk from storage reads as the defaults.
    await p.evaluate(() => { const g = graphOf(GID()); g.plot = Object.assign({}, g.plot, { ternSum: "x", ternCw: 0, ternGrid: "?" }); renderPlot(); });
    const jo = await p.evaluate(() => ternOpts(plotCfg()));
    check("junk settings read as the defaults", jo.sum === 1 && jo.cw === false && jo.grid === true, JSON.stringify(jo));
    await p.evaluate(() => { const g = graphOf(GID()); ["ternSum", "ternCw", "ternGrid"].forEach(k => delete g.plot[k]); savePlot({ ternCw: true }, "t"); });
    await p.reload(); await ready(p); await p.waitForTimeout(600);
    check("after a reload the graph is ternary, clockwise, its two curves drawn", await p.evaluate(() => plotCfg().layout === "ternary" && ternOpts(plotCfg()).cw && document.querySelectorAll("#plot g[data-ternser]").length === 2));
  }, { name: "7.4 ternary", timeout: 120000 });

  await page(async p => {
    const cs = await soilData(p);
    // Plot setup: the Ternary card, the roles Y, B and C, a note until each curve has its B and C.
    await p.evaluate(ids => { S.plotDlgKind = "ternary"; openPlotDlg(ids); }, cs.slice(0, 3).map(c => c.id)); await p.waitForTimeout(400);
    let r = await p.evaluate(() => ({ roles: [...document.querySelectorAll(".psu-rh")].map(e => e.textContent), need: ($("#psuNeed") || {}).textContent || "", kind: ($("#psuKindN") || {}).textContent }));
    const parts0 = await p.evaluate(() => ({ parts: [...document.querySelectorAll('select[data-cpart="tb"], select[data-cpart="tc"]')].map(e => e.value), curves: document.querySelectorAll("tr[data-pcur]").length }));
    check("Plot setup opened on Ternary with three columns: one curve, the next two its B and C, the roles Y, B and C, no note", r.kind === "Ternary" && ["Y", "B", "C"].every(k => r.roles.includes(k)) && !r.need && parts0.curves === 1 && parts0.parts.join() === `${cs[1].id},${cs[2].id}`, JSON.stringify([r, parts0]));
    // By hand: C taken off the curve (a note), then marked again in the grid.
    await p.selectOption('select[data-cpart="tc"]', ""); await p.waitForTimeout(150);
    r = await p.evaluate(() => ({ need: ($("#psuNeed") || {}).textContent || "", ok: $("#formOk").disabled }));
    check("a curve without its C: the note says so and Plot waits", /Mark them as B and C/.test(r.need) && r.ok, JSON.stringify(r));
    await p.click(`input[data-prole="tc"][data-pcol="${cs[2].id}"]`); await p.waitForTimeout(150);
    r = await p.evaluate(() => ({ need: ($("#psuNeed") || {}).textContent || "", parts: [...document.querySelectorAll('select[data-cpart="tb"], select[data-cpart="tc"]')].map(e => e.value), curves: document.querySelectorAll("tr[data-pcur]").length }));
    check("C marked in the grid: the curve on its left takes it, the note goes", r.curves === 1 && r.parts.join() === `${cs[1].id},${cs[2].id}` && !/Mark them/.test(r.need), JSON.stringify(r));
    const sv = await p.evaluate(() => { const s = $("#pdlgSk"); return s ? s.innerHTML.length : 0; });
    check("…the preview draws the triangle", sv > 1000 && await p.evaluate(() => !!document.querySelector("#pdlgSk [data-ternframe]")), sv);
    await p.click("#formOk"); await p.waitForTimeout(500);
    r = await p.evaluate(() => ({ lay: plotCfg().layout, ser: plotCfg().series, n: document.querySelectorAll("#plot g[data-ternser]").length }));
    check("OK draws it ternary, the curve's B and C kept on the graph", r.lay === "ternary" && r.n === 1 && r.ser[cs[0].id].tB === cs[1].id && r.ser[cs[0].id].tC === cs[2].id, JSON.stringify(r));
    // What it plots… shows the curve's B and C to change.
    await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
    r = await p.evaluate(() => [...document.querySelectorAll('select[data-cpart="tb"], select[data-cpart="tc"]')].map(e => e.value));
    check("What it plots… shows the curve's B and C", r.join() === `${cs[1].id},${cs[2].id}`, JSON.stringify(r));
    await p.selectOption('select[data-cpart="tc"]', cs[5].id); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
    check("…and a new C chosen there is the curve's, one undo step", await p.evaluate(id => plotCfg().series[id].tC, cs[0].id) === cs[5].id);
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("…undone", await p.evaluate(id => plotCfg().series[id].tC, cs[0].id) === cs[2].id);
    // Fifty thousand rows: on screen fewer symbols than rows, every row in an export.
    const big = await p.evaluate(async () => { const n = 50000, a = [], b = [], c = []; let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < n; i++) { a.push(rnd()); b.push(rnd()); c.push(rnd()); }
      const cols = [makeCol("x", "Row", "", a.map((_, i) => i)), Object.assign(makeCol("y", "A", "", a), { pipe: [], mask: [] }), Object.assign(makeCol("y", "B", "", b), { pipe: [], mask: [] }), Object.assign(makeCol("y", "C", "", c), { pipe: [], mask: [] })];
      await createProject(Object.assign(blankProject("Big"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll();
      ternaryFrom(yCols().map(c => c.id)); await new Promise(r => setTimeout(r, 300));
      const t0 = performance.now(); renderPlot(); const ms = performance.now() - t0;
      const scr = (document.querySelector("#plot [data-ternsym]").getAttribute("d").match(/M/g) || []).length, ex = (buildPlot(800, 640, readPalette(true), true).match(/data-ternsym="1" data-dots="1" d="[^"]*"/) || [""])[0].split("M").length - 1;
      return { ms, scr, ex }; });
    check("fifty thousand rows: fewer dots on screen than rows, every row in an export", big.scr < 50000 && big.ex === 50000, JSON.stringify(big));
  }, { name: "7.4 Plot setup and many rows", timeout: 120000 });

  await page(async p => {
    const cs = await soilData(p);
    await p.evaluate(ids => { ternaryFrom(ids); }, cs.slice(0, 3).map(c => c.id)); await p.waitForTimeout(600);
    const w = await p.evaluate(() => { const svg = document.querySelector("#plot"), r = svg.getBoundingClientRect(); return { side: S.geo.tern.F.side, over: [...document.querySelectorAll("#plot text")].filter(t => { const b = t.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).length }; });
    check("at 390 px the triangle fits the graph and no number or title runs off it", w.side > 120 && w.over === 0, JSON.stringify(w));
  }, { name: "7.4 at 390 px", vw: { width: 390, height: 800 } });
}

/* 7.5 Vectors: a field on an 11 × 11 grid (angle and speed), and the same as second points; radar: three cars on six qualities. */
const fieldData = async p => {
  await p.evaluate(async () => { const x = [], y = [], a = [], m = [], x2 = [], y2 = []; for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) { const X = i - 5, Y = j - 5; x.push(X); y.push(Y); a.push(+(Math.atan2(X, -Y) * 180 / Math.PI).toFixed(3)); m.push(+(Math.hypot(X, Y) / 2).toFixed(3)); x2.push(X - Y * 0.2); y2.push(Y + X * 0.2); }
    a[3] = null; m[7] = null;
    const mk = (r, n, u, d) => Object.assign(makeCol(r, n, u, d), r === "y" ? { pipe: [], mask: [] } : {});
    const cols = [mk("x", "X", "m", x), mk("y", "Y", "m", y), mk("ignore", "Angle", "°", a), mk("ignore", "Speed", "m/s", m), mk("ignore", "X end", "m", x2), mk("ignore", "Y end", "m", y2)];
    await createProject(Object.assign(blankProject("Field"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll(); });
  await p.waitForTimeout(400);
  return p.evaluate(() => sheetCols(curSheet()).map(c => ({ id: c.id, d: c.data.slice() })));
};
const vecRead = p => p.evaluate(() => { const sh = (document.querySelector("#plot [data-vecshaft]") || { getAttribute: () => "" }).getAttribute("d"), hd = (document.querySelector("#plot [data-vechead]") || { getAttribute: () => "" }).getAttribute("d"), g = S.geo;
  const geo = { L: g.L, T: g.T, pw: g.pw, mh: g.mh, v: g.v };
  return { shafts: [...sh.matchAll(/M([-\d.]+),([-\d.]+)L([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2], +m[3], +m[4]]), heads: (hd.match(/M/g) || []).length, open: !!document.querySelector('#plot [data-vechead][fill="none"]'),
    key: (document.querySelector("#plot [data-veckey]") || {}).textContent || "", scr: (xs, ys) => null, geo }; });

if (section("7.5")) {
  console.log("7.5 Vectors and radar");
  await page(async p => {
    const cs = await fieldData(p), [X, Yc, A, M, X2, Y2] = cs;
    // Plot's menu: Y, Angle and Speed as arrows.
    const it = await p.evaluate(ids => { const m = plotItems(ids).find(q => q && q.label === "Vectors: angle and length"); if (m) m.run(); return !!m; }, [Yc.id, A.id, M.id]); await p.waitForTimeout(600);
    let r = await p.evaluate(() => ({ ser: plotCfg().series, toast: (document.querySelector("#toast") || {}).textContent || "", off: [...document.querySelectorAll("#ws .hoff")].length }));
    check("Plot's menu has Vectors: angle and length, the curve's arrows from the next two columns, said in the message", it && r.ser[Yc.id].vec.kind === "am" && r.ser[Yc.id].vec.a === A.id && r.ser[Yc.id].vec.m === M.id && /Arrows: Y by Angle and Speed/.test(r.toast) && r.off === 0, JSON.stringify(r));
    // Every arrow where the definition puts it: from the point, by its angle on the graph, its length at the graph's scale.
    let V = await vecRead(p);
    const want = await p.evaluate(({ x, y, a, m }) => { const g = S.geo, k = (() => { let mx = 0; m.forEach(v => { if (v != null && Math.abs(v) > mx) mx = Math.abs(v); }); return Math.min(g.pw, g.mh) / 12 / mx; })(), X = v => toScreenX ? toScreenX(v) : null;
      return { k, pts: x.map((xx, i) => a[i] == null || m[i] == null ? null : { i, x0: g.sx ? g.L + g.sx.f(xx) * g.pw : null, xx, yy: y[i], a: a[i], m: m[i] }) }; }, { x: X.d, y: Yc.d, a: A.d, m: M.d }).catch(() => null);
    const want2 = await p.evaluate(({ x, y, a, m }) => { const g = S.geo, vx = g.v, sx = (v) => g.L + (v - vx.x0) / (vx.x1 - vx.x0) * g.pw, sy = (v) => g.T + g.mh - (v - vx.y0) / (vx.y1 - vx.y0) * g.mh;
      let mx = 0; m.forEach(v => { if (v != null && Math.abs(v) > mx) mx = Math.abs(v); }); const k = Math.min(g.pw, g.mh) / 12 / mx;
      return x.map((xx, i) => { if (a[i] == null || m[i] == null) return null; const x0 = sx(xx), y0 = sy(y[i]), t = a[i] * Math.PI / 180; return [x0, y0, x0 + m[i] * k * Math.cos(t), y0 - m[i] * k * Math.sin(t)]; }).filter(Boolean); }, { x: X.d, y: Yc.d, a: A.d, m: M.d });
    const off = Math.max(...want2.map(w => Math.min(...V.shafts.map(q => Math.max(Math.hypot(q[0] - w[0], q[1] - w[1]), Math.hypot(q[2] - w[2], q[3] - w[3]))))));
    check("every arrow from its point by its angle (counterclockwise from X on the graph) and its length at one scale (within the SVG's 0.005 px); a row with no angle or no length has none", V.shafts.length === 119 && want2.length === 119 && off <= 0.0072, JSON.stringify([V.shafts.length, off]));
    check("each arrow has a filled head (the one of length 0 at the origin none); the key says a round length in the length's unit", V.heads === 118 && !V.open && /^\d+(\.\d+)? m\/s$/.test(V.key), JSON.stringify([V.heads, V.key]));
    // The readout names the arrow under the pointer.
    const at = await p.evaluate(() => { const q = S.geo.vecPts[40], svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), k = bb.width / svg.viewBox.baseVal.width; return { x: bb.left + q.x * k, y: bb.top + q.y * k, txt: q.txt }; });
    await p.mouse.move(at.x, at.y); await p.waitForTimeout(150);
    const ro = await p.evaluate(() => document.querySelector("#readout").textContent);
    check("the status bar names the arrow under the pointer: its angle and length", ro.includes(at.txt) && /angle .+° {3}length .+ m\/s/.test(at.txt), `${ro} | ${at.txt}`);
    // The curve's Vectors menu: open heads, a scale typed, the key off, radians; undo each.
    const menu = await p.evaluate(id => { const it = graphMenuItems(id).find(q => q && q.label === "Vectors"); return it ? it.sub().filter(q => q && q.label).map(q => q.label) : null; }, Yc.id);
    check("the curve's right-click has Vectors: heads, the angle's unit, the length scale, the key, the columns, back to a curve", menu && ["Heads", "Angle in", "Length scale…", "Key", "Columns…", "Draw as a curve again"].every(l => menu.includes(l)), JSON.stringify(menu));
    await p.evaluate(id => { vecMenuItems(colById(id))[0].sub().find(q => q.label === "Open").run(); }, Yc.id); await p.waitForTimeout(200);
    V = await vecRead(p); check("open heads", V.open, "");
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    await p.evaluate(id => { vecMenuItems(colById(id)).find(q => q.label === "Length scale…").run(); }, Yc.id); await p.waitForSelector("#vsK"); await p.fill("#vsK", "20"); await p.click("#formOk"); await p.waitForTimeout(300);
    const k20 = await p.evaluate(() => { const sh = document.querySelector("#plot [data-vecshaft]").getAttribute("d"), m = [...sh.matchAll(/M([-\d.]+),([-\d.]+)L([-\d.]+),([-\d.]+)/g)].map(q => Math.hypot(+q[3] - +q[1], +q[4] - +q[2])); return Math.max(...m); });
    check("a scale of 20 px a unit typed: the longest arrow (3.536 m/s) 70.7 px", Math.abs(k20 - 3.536 * 20) < 0.02, k20);
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    await p.evaluate(id => { vecMenuItems(colById(id)).find(q => q.label === "Key").run(); }, Yc.id); await p.waitForTimeout(150);
    check("the key off from the menu", await p.evaluate(() => !document.querySelector("#plot [data-veckey]")));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    // Export: the PDF draws them.
    const ex = await p.evaluate(async () => { const svg = buildPlot(640, 480, readPalette(true), true); const v = await svgToVector(svg, { kind: "pdf", wPt: 400, hPt: 300, title: "vectors", embed: false }); const t = await v.blob.text();
      return { shafts: (svg.match(/data-vecshaft/g) || []).length, key: (svg.match(/data-veckey/g) || []).length, pdf: t.slice(0, 5), miss: v.miss || [] }; });
    check("an export draws the arrows and the key; its PDF misses no character", ex.shafts === 1 && ex.key === 1 && ex.pdf === "%PDF-" && ex.miss.length === 0, JSON.stringify(ex));
    // Drawn as a curve again: the arrows go, one undo brings them back.
    await p.evaluate(id => { vecMenuItems(colById(id)).find(q => q.label === "Draw as a curve again").run(); }, Yc.id); await p.waitForTimeout(200);
    check("Draw as a curve again: no arrows; undone, the arrows back", await p.evaluate(() => !document.querySelector("#plot [data-vecshaft]")) && await (async () => { await p.evaluate(() => undo()); await p.waitForTimeout(200); return p.evaluate(() => !!document.querySelector("#plot [data-vecshaft]")); })());
    // To a second point, from the menu: each arrow ends at its point.
    await p.evaluate(ids => { plotItems(ids).find(q => q && q.label === "Vectors to a point").run(); }, [Yc.id, X2.id, Y2.id]); await p.waitForTimeout(600);
    V = await vecRead(p);
    const w3 = await p.evaluate(({ x, y, x2, y2 }) => { const g = S.geo, v = g.v, sx = q => g.L + (q - v.x0) / (v.x1 - v.x0) * g.pw, sy = q => g.T + g.mh - (q - v.y0) / (v.y1 - v.y0) * g.mh; return x.map((xx, i) => [sx(xx), sy(y[i]), sx(x2[i]), sy(y2[i])]); }, { x: X.d, y: Yc.d, x2: X2.d, y2: Y2.d });
    const off3 = Math.max(...w3.map(w => Math.min(...V.shafts.map(q => Math.max(Math.hypot(q[0] - w[0], q[1] - w[1]), Math.hypot(q[2] - w[2], q[3] - w[3]))))));
    check("Vectors to a point: 121 arrows, each from its point to its second point, no key", V.shafts.length === 121 && off3 <= 0.0072 && !V.key, JSON.stringify([V.shafts.length, off3, V.key]));
  }, { name: "7.5 vectors", timeout: 120000 });

  await page(async p => {
    const cs = await fieldData(p), [X, Yc, A, M] = cs;
    // Plot setup on Vectors: angle and length, the roles, a note until each curve has its angle and length.
    await p.evaluate(ids => { S.plotDlgKind = "vecam"; openPlotDlg(ids); }, [Yc.id]); await p.waitForTimeout(400);
    let r = await p.evaluate(() => ({ roles: [...document.querySelectorAll(".psu-rh")].map(e => e.textContent), need: ($("#psuNeed") || {}).textContent || "", ok: $("#formOk").disabled }));
    check("Plot setup on Vectors: angle and length: the roles Angle and Length, a note, Plot waiting", ["X", "Y", "Angle", "Length"].every(k => r.roles.includes(k)) && /mark a column as Angle and one as Length/.test(r.need) && r.ok, JSON.stringify(r));
    await p.click(`input[data-prole="va"][data-pcol="${A.id}"]`); await p.waitForTimeout(150); await p.click(`input[data-prole="vm"][data-pcol="${M.id}"]`); await p.waitForTimeout(150);
    await p.click("#psuAdd"); await p.waitForTimeout(250);
    r = await p.evaluate(() => ({ need: ($("#psuNeed") || {}).textContent || "", parts: [...document.querySelectorAll('select[data-cpart="va"], select[data-cpart="vm"]')].map(e => e.value) }));
    check("Angle and Length marked and added: the curve's line shows them, the note goes", r.parts.join() === `${A.id},${M.id}` && !r.need, JSON.stringify(r));
    await p.click("#formOk"); await p.waitForTimeout(500);
    check("OK draws the arrows", await p.evaluate(() => document.querySelectorAll("#plot [data-vecshaft]").length === 1));
  }, { name: "7.5 Plot setup for vectors" });

  await page(async p => {
    // A radar chart: six qualities (a column of text) as spokes, three cars as polygons.
    await p.evaluate(async () => { const names = ["Speed", "Range", "Comfort", "Safety", "Price", "Economy"];
      const X = makeCol("x", "Quality", "", names.map(() => null)); X.txt = {}; names.forEach((t, i) => X.txt[i] = t); X.fmt = "text";
      const mk = (n, d) => Object.assign(makeCol("y", n, "", d), { pipe: [], mask: [] });
      const cols = [X, mk("Car A", [8, 6, 7, 9, 4, 6]), mk("Car B", [6, 9, 5, 7, 7, 8]), mk("Car C", [5, 4, 9, 8, 9, null])];
      await createProject(Object.assign(blankProject("Cars"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll(); });
    await p.waitForTimeout(400);
    const ids = await p.evaluate(() => yCols().map(c => c.id)), vals = [[8, 6, 7, 9, 4, 6], [6, 9, 5, 7, 7, 8], [5, 4, 9, 8, 9, null]];
    await p.evaluate(ids => { plotItems(ids).find(q => q && q.label === "Radar").run(); }, ids); await p.waitForTimeout(600);
    const rr = () => p.evaluate(() => { const G = S.geo.radar; return { F: G.F, K: G.K, rng: G.rng, o: G.o, left: G.left, spokes: [...document.querySelectorAll("#plot [data-radarspoke]")].map(e => e.textContent), nums: [...document.querySelectorAll("#plot [data-radarnum]")].map(e => e.textContent),
      polys: [...document.querySelectorAll("#plot [data-radarpoly]")].map(g => ({ d: (g.querySelector("[data-radarline]") || { getAttribute: () => "" }).getAttribute("d"), fill: (g.querySelector("[data-radarline]") || { getAttribute: () => "" }).getAttribute("fill"), v: [...((g.querySelector("[data-radarvert]") || { getAttribute: () => "" }).getAttribute("d") || "").matchAll(/M([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]) })) }; });
    let R = await rr();
    const place = (R, k, v, lo, hi) => { const ph = (90 - 360 * k / R.K) * Math.PI / 180, rho = (v - lo) / (hi - lo); return [R.F.cx + R.F.R * rho * Math.cos(ph), R.F.cy - R.F.R * rho * Math.sin(ph)]; };
    let off = 0; vals.forEach((row, j) => row.forEach((v, k) => { if (v == null) return; const q = place(R, k, v, 0, 10), m = Math.min(...R.polys[j].v.map(w => Math.hypot(w[0] - q[0], w[1] - q[1]))); off = Math.max(off, m); }));
    check("Plot's menu has Radar: six spokes named by the text X, three polygons, one range 0 to 10 up the first spoke, each corner at its value (within 0.005 px)", R.K === 6 && R.spokes.join() === "Speed,Range,Comfort,Safety,Price,Economy" && R.polys.length === 3 && R.rng[0].join() === "0,10" && R.nums.join() === "2,4,6,8,10" && off <= 0.0072, JSON.stringify([R.spokes, R.rng[0], R.nums, off]));
    check("a polygon with a value missing is not closed across it nor filled; the whole ones are", /Z$/.test(R.polys[0].d) && R.polys[0].fill !== "none" && !/Z$/.test(R.polys[2].d) && R.polys[2].fill === "none" && R.polys[2].v.length === 5, JSON.stringify(R.polys.map(q => [q.d.slice(-4), q.fill, q.v.length])));
    // The readout.
    const at = await p.evaluate(() => { const q = S.geo.radar.verts[3], svg = document.querySelector("#plot"), bb = svg.getBoundingClientRect(), k = bb.width / svg.viewBox.baseVal.width; return { x: bb.left + q.x * k, y: bb.top + q.y * k }; });
    await p.mouse.move(at.x, at.y); await p.waitForTimeout(150);
    check("the status bar says the spoke, the polygon and the value under the pointer", await p.evaluate(() => document.querySelector("#readout").textContent) === "Safety   Car A   9", await p.evaluate(() => document.querySelector("#readout").textContent));
    // Each spoke its own range; each curve a spoke; circles; unfilled.
    const menu = await p.evaluate(() => { const it = graphMenuItems().find(q => q && q.label === "Radar"); return it ? it.sub().filter(q => q && q.label).map(q => q.label) : null; });
    check("the graph's menu has Radar: spokes, range, range from and to, grid, filled", menu && ["Spokes", "Range", "Range from and to…", "Grid", "Filled"].every(l => menu.includes(l)), JSON.stringify(menu));
    await p.evaluate(() => { radarMenuItems().find(q => q.label === "Range").sub().find(q => /own/.test(q.label)).run(); }); await p.waitForTimeout(200);
    R = await rr();
    const rngs = await p.evaluate(() => [...document.querySelectorAll("#plot [data-radarrng]")].map(e => e.textContent));
    off = 0; vals.forEach((row, j) => row.forEach((v, k) => { if (v == null) return; const [lo, hi] = R.rng[k], q = place(R, k, v, lo, hi), m = Math.min(...R.polys[j].v.map(w => Math.hypot(w[0] - q[0], w[1] - q[1]))); off = Math.max(off, m); }));
    check("each spoke its own range, said under its name, each corner on it", R.o.scale === "own" && rngs.length === 6 && rngs.every(t => /^0 to \d+$/.test(t)) && off <= 0.0072, JSON.stringify([rngs, off]));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    await p.evaluate(() => { radarMenuItems().find(q => q.label === "Spokes").sub().find(q => /curve a spoke/.test(q.label)).run(); }); await p.waitForTimeout(200);
    R = await rr();
    check("each curve a spoke: three spokes named by the cars, six polygons named by the qualities", R.K === 3 && R.spokes.join() === "Car A,Car B,Car C" && R.polys.length === 6, JSON.stringify([R.spokes, R.polys.length]));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    await p.evaluate(() => { radarMenuItems().find(q => q.label === "Range from and to…").run(); }); await p.waitForSelector("#rrA"); await p.fill("#rrA", "5"); await p.fill("#rrB", "10"); await p.click("#formOk"); await p.waitForTimeout(300);
    R = await rr(); const lft = await p.evaluate(() => (document.querySelector("#plot [data-radarleft]") || {}).textContent || "");
    check("a range typed, 5 to 10: the two values below it (a 4 each for Car A and Car C) left out and said", R.rng[0].join() === "5,10" && R.left === 2 && /2 values outside the range/.test(lft), JSON.stringify([R.rng[0], R.left, lft]));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    // The Format pane.
    await p.evaluate(() => openPlotDetails(null, "layout")); await p.waitForTimeout(250);
    const f = await p.evaluate(() => ["pdRb", "pdRs", "pdRg", "pdRf"].map(id => !!document.getElementById(id)));
    check("the Format pane's Layout page has the spokes, range, grid and filled", f.every(Boolean), JSON.stringify(f));
    await p.selectOption("#pdRg", "circle"); await p.waitForTimeout(600); await p.evaluate(() => { pdCommit && pdCommit(); closePlotDetails(); }); await p.waitForTimeout(200);
    check("circles chosen there are the graph's", await p.evaluate(() => radarOpts(plotCfg()).grid === "circle" && /A/.test(document.querySelector("#plot [data-radargrid]").getAttribute("d"))));
    // Export, junk, reload.
    const ex = await p.evaluate(async () => { const svg = buildPlot(640, 480, readPalette(true), true); const v = await svgToVector(svg, { kind: "pdf", wPt: 400, hPt: 300, title: "radar", embed: false }); const t = await v.blob.text();
      return { polys: (svg.match(/data-radarpoly/g) || []).length, pdf: t.slice(0, 5), miss: v.miss || [] }; });
    check("an export draws the three polygons; its PDF misses no character", ex.polys === 3 && ex.pdf === "%PDF-" && ex.miss.length === 0, JSON.stringify(ex));
    await p.evaluate(() => { const g = graphOf(GID()); g.plot = Object.assign({}, g.plot, { radarBy: 7, radarScale: {}, radarGrid: "x", radarR0: "a" }); renderPlot(); });
    const jo = await p.evaluate(() => radarOpts(plotCfg()));
    check("junk settings read as the defaults", jo.by === "rows" && jo.scale === "one" && jo.grid === "poly" && jo.r0 === null, JSON.stringify(jo));
    await p.evaluate(() => { const g = graphOf(GID()); ["radarBy", "radarScale", "radarGrid", "radarR0"].forEach(k => delete g.plot[k]); savePlot({ radarFill: false }, "t"); });
    await p.reload(); await ready(p); await p.waitForTimeout(600);
    check("after a reload the graph is a radar, unfilled", await p.evaluate(() => plotCfg().layout === "radar" && document.querySelectorAll('#plot [data-radarline][fill="none"]').length === 3));
  }, { name: "7.5 radar", timeout: 120000 });

  await page(async p => {
    await p.evaluate(async () => { const names = ["Speed", "Range", "Comfort", "Safety", "Price", "Economy"];
      const X = makeCol("x", "Quality", "", names.map(() => null)); X.txt = {}; names.forEach((t, i) => X.txt[i] = t); X.fmt = "text";
      const cols = [X, Object.assign(makeCol("y", "Car A", "", [8, 6, 7, 9, 4, 6]), { pipe: [], mask: [] }), Object.assign(makeCol("y", "Car B", "", [6, 9, 5, 7, 7, 8]), { pipe: [], mask: [] })];
      await createProject(Object.assign(blankProject("Cars"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll(); plotCols(yCols().map(c => c.id), { layout: "radar", quiet: true }); });
    await p.waitForTimeout(600);
    const w = await p.evaluate(() => { const svg = document.querySelector("#plot"), r = svg.getBoundingClientRect(); return { R: S.geo.radar.F.R, over: [...document.querySelectorAll("#plot text")].filter(t => { const b = t.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).length }; });
    check("at 390 px the radar fits the graph and no name runs off it", w.R > 60 && w.over === 0, JSON.stringify(w));
  }, { name: "7.5 at 390 px", vw: { width: 390, height: 800 } });
}

/* 7.6 More axes: a temperature, a pressure, a flow and a signal against time, each on an axis of its own. */
const axesData = async p => {
  await p.evaluate(async () => { const t = [], a = [], b = [], c = [], d = []; for (let i = 0; i < 60; i++) { t.push(i); a.push(+(20 + 5 * Math.sin(i / 8)).toFixed(3)); b.push(+(1000 + 300 * Math.cos(i / 10)).toFixed(2)); c.push(+(0.002 * i + 0.01 * Math.sin(i / 5)).toFixed(5)); d.push(+(50 * Math.exp(-i / 20)).toFixed(4)); }
    const mk = (r, n, u, dd) => Object.assign(makeCol(r, n, u, dd), r === "y" ? { pipe: [], mask: [] } : {});
    const cols = [mk("x", "Time", "min", t), mk("y", "Temperature", "°C", a), mk("y", "Pressure", "hPa", b), mk("y", "Flow", "L/s", c), mk("y", "Signal", "mV", d)];
    await createProject(Object.assign(blankProject("Axes"), { cols, activeY: cols[1].id }), "test"); await new Promise(r => setTimeout(r, 100)); renderAll(); plotCols(yCols().map(c => c.id), { quiet: true }); });
  await p.waitForTimeout(600);
  return p.evaluate(() => yCols().map(c => ({ id: c.id, d: c.data.slice() })));
};
// The vertices of a curve's line, and where its axis's range puts each point (the graph's own X; the axis's Y from its range).
const axOff = (p, id, k) => p.evaluate(({ id, k }) => { const g = S.geo, e = g.yAxes.find(q => q.k === k), path = document.querySelector(`#plot g[data-ser="${id}"] path`), V = [...(path.getAttribute("d") || "").matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]);
  const c = colById(id), d = finalOf(c), Y = y => e.log ? g.T + g.mh - (Math.log10(y) - Math.log10(e.y0)) / (Math.log10(e.y1) - Math.log10(e.y0)) * g.mh : g.T + g.mh - (y - e.y0) / (e.y1 - e.y0) * g.mh;
  let worst = 0; d.x.forEach((x, i) => { const q = [g.X(x), Y(d.y[i])]; let m = Infinity; for (const v of V) m = Math.min(m, Math.hypot(v[0] - q[0], v[1] - q[1])); worst = Math.max(worst, m); });
  return { worst, n: V.length, e }; }, { id, k });

if (section("7.6")) {
  console.log("7.6 More axes");
  await page(async p => {
    const cs = await axesData(p), [T, P, F, Sg] = cs.map(c => c.id);
    // The curve's right-click: Y axis, Left, Right, Third, Fourth.
    const items = await p.evaluate(id => { const it = graphMenuItems(id).find(q => q && q.label === "Y axis"); return it ? it.sub().map(q => q.label) : null; }, F);
    check("a curve's right-click has Y axis: Left, Right, Third, Fourth", items && items.join() === "Left,Right,Third,Fourth", JSON.stringify(items));
    for (const [id, l] of [[P, "Right"], [F, "Third"], [Sg, "Fourth"]]) await p.evaluate(({ id, l }) => { graphMenuItems(id).find(q => q && q.label === "Y axis").sub().find(q => q.label === l).run(); }, { id, l });
    await p.waitForTimeout(400);
    let r = await p.evaluate(() => ({ axes: S.geo.yAxes.map(e => [e.k, e.side]), leg: [...document.querySelectorAll("#plot .legend text")].map(e => e.textContent), lines: [...document.querySelectorAll("#plot [data-yaxis]")].map(g => +((g.querySelector("path").getAttribute("d").match(/M([-\d.]+)/) || [])[1])), L: S.geo.L, R: S.geo.L + S.geo.pw }));
    check("four Y axes: the third on the right beyond the right axis, the fourth on the left beyond the main one, the legend saying which", r.axes.join(";") === "y3,r;y4,l" && r.lines[0] > r.R + 30 && r.lines[1] < r.L - 30 && r.leg.join() === "Temperature (left),Pressure (right),Flow (axis 3),Signal (axis 4)", JSON.stringify(r));
    let o3 = await axOff(p, F, "y3"), o4 = await axOff(p, Sg, "y4");
    const fr = (d) => [Math.min(...d), Math.max(...d)];
    check("each curve drawn against its own axis's range (within the line's 0.05 px), each range its curve's", o3.worst <= 0.0712 && o4.worst <= 0.0712 && o3.e.y0 <= fr(cs[2].d)[0] && o3.e.y1 >= fr(cs[2].d)[1] && o4.e.y1 >= 50, JSON.stringify([o3.worst, o4.worst, o3.e, o4.e]));
    check("…and the left axis fitted to the temperature alone", await p.evaluate(() => S.geo.v.y1 < 30 && S.geo.v.y0 > 10), "");
    // Its right-click: Side and Logarithmic; the fourth moved to the right, then logarithmic.
    const am = await p.evaluate(() => axisMenuItems("y4").filter(q => q && q.label).map(q => q.label));
    check("a further axis's right-click has Side and Logarithmic, not Where it is", am.includes("Side") && am.includes("Logarithmic") && !am.includes("Where it is"), JSON.stringify(am));
    await p.evaluate(() => { axisMenuItems("y4").find(q => q.label === "Side").sub().find(q => /right/.test(q.label)).run(); }); await p.waitForTimeout(250);
    r = await p.evaluate(() => S.geo.yAxes.map(e => [e.k, e.side]).join(";"));
    o4 = await axOff(p, Sg, "y4");
    check("the fourth on the right, beyond the third, its curve on it still", r === "y3,r;y4,r" && o4.worst <= 0.0712, JSON.stringify([r, o4.worst]));
    await p.evaluate(() => { axisMenuItems("y4").find(q => q.label === "Logarithmic").run(); }); await p.waitForTimeout(250);
    o4 = await axOff(p, Sg, "y4");
    check("logarithmic: the signal's decay drawn on a log axis of its own", o4.e.log && o4.worst <= 0.0712, JSON.stringify([o4.e, o4.worst]));
    await p.evaluate(() => undo()); await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("two undos: the fourth back on the left, linear", await p.evaluate(() => S.geo.yAxes.map(e => [e.k, e.side, e.log]).join(";")) === "y3,r,false;y4,l,false");
    // The Format pane's page for the third axis: its side, set off, a range typed.
    await p.evaluate(() => openPlotDetails(null, "ax:y3")); await p.waitForTimeout(300);
    const pg = await p.evaluate(() => ({ head: ($("#pdHead") || {}).textContent, off: !!document.getElementById("pdy3off"), lg: !!document.getElementById("pdy3lg"), from: !!document.getElementById("pdy3a"), nav: [...document.querySelectorAll("#fmtSel option")].map(o => o.textContent).filter(t => /Y axis/.test(t)) }));
    check("the Format pane has a page for the third and fourth axes: side, set off, logarithmic, its range", pg.head === "Third Y axis" && pg.off && pg.lg && pg.from && pg.nav.includes("Third Y axis") && pg.nav.includes("Fourth Y axis"), JSON.stringify(pg));
    await p.fill("#pdy3a", "-0.05"); await p.press("#pdy3a", "Tab"); await p.fill("#pdy3b", "0.15"); await p.press("#pdy3b", "Tab"); await p.waitForTimeout(700);
    await p.evaluate(() => { pdCommit && pdCommit(); closePlotDetails(); }); await p.waitForTimeout(250);
    o3 = await axOff(p, F, "y3");
    check("a range typed there, -0.05 to 0.15: the curve drawn against it", o3.e.y0 === -0.05 && o3.e.y1 === 0.15 && o3.worst <= 0.0712, JSON.stringify([o3.e, o3.worst]));
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    // Export.
    const ex = await p.evaluate(async () => { const svg = buildPlot(800, 500, readPalette(true), true); const v = await svgToVector(svg, { kind: "pdf", wPt: 480, hPt: 300, title: "axes", embed: false }); const t = await v.blob.text();
      return { axes: (svg.match(/data-yaxis/g) || []).length, pdf: t.slice(0, 5), miss: v.miss || [] }; });
    check("an export draws both further axes; its PDF misses no character", ex.axes === 2 && ex.pdf === "%PDF-" && ex.miss.length === 0, JSON.stringify(ex));
    // Junk from storage: an axis Kurve has not got is the left one.
    await p.evaluate(id => { const g = graphOf(GID()); g.plot = Object.assign({}, g.plot, { use: Object.assign({}, g.plot.use, { [id]: { ax: "y9" } }) }); renderPlot(); }, F);
    check("an axis from storage Kurve has not got: the curve on the left axis", await p.evaluate(() => S.geo.yAxes.map(e => e.k).join()) === "y4");
    await p.evaluate(() => undo()); await p.waitForTimeout(150);
    await p.evaluate(id => setCurveUse([id], { ax: "y3" }, "t"), F); await p.waitForTimeout(200);
    await p.reload(); await ready(p); await p.waitForTimeout(600);
    check("after a reload the third and fourth axes are there", await p.evaluate(() => (S.geo.yAxes || []).map(e => e.k).join()) === "y3,y4");
  }, { name: "7.6 more axes", timeout: 120000 });

  await page(async p => {
    const cs = await axesData(p);
    // Plot setup on the graph: the Axis list has Third and Fourth.
    await p.evaluate(() => { plotsOf(); }); await p.waitForTimeout(400);
    await p.click(`tr[data-pcur="${cs[2].id}"]`); await p.waitForTimeout(150);
    const opts = await p.evaluate(id => [...document.querySelector(`select[data-cax="${id}"]`).options].map(o => o.textContent), cs[2].id);
    check("What it plots… has the Axis list: Left, Right, Third, Fourth", opts.join() === "Left,Right,Third,Fourth", JSON.stringify(opts));
    await p.selectOption(`select[data-cax="${cs[2].id}"]`, "y3"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(400);
    check("…Third chosen there: the curve on the third axis, one undo step", await p.evaluate(id => curveUse(id).ax === "y3" && S.geo.yAxes.length === 1, cs[2].id));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    check("…undone", await p.evaluate(id => !curveUse(id).ax, cs[2].id));
  }, { name: "7.6 Plot setup's Axis" });
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
