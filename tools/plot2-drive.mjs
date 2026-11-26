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
    check("a slice's right-click: its name and share, Pull the slice out, Pie chart; no Line, Symbol, Error bars or Right axis", menu[0] === "Rent: 57.7 %" && menu.includes("Pull the slice out") && menu.includes("Pie chart") && !menu.some(l => /Line, symbols|Symbol…|Error bars|Right axis|Plot type|Connect/.test(l)), JSON.stringify(menu));
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

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
