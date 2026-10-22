/* Unusual use, in a real browser: the cases that once hung the page, lost
   data or drew nonsense, each checked in a fresh page.
   Needs Playwright with Chromium. Usage:
     node tools/odd-test.mjs [path/to/kurve.html]
   Set PLAYWRIGHT=/path/to/playwright/index.mjs if `playwright` is not
   installed where node can find it. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
// Served over HTTP, as Kurve is: Chromium sometimes gives two pages opened from file://
// storage of their own, and the tests of tabs sharing a store failed one run in eight.
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 300))); }
};

// In the page: a project from arrays, and a Gaussian with noise.
const HELP = `(()=>{ if(window.__h) return; window.__h=1;
  window.mkSpec=async(name,x,y,opt)=>{ opt=opt||{}; const xc=makeCol("x",opt.xn||"X","",x), yc=Object.assign(makeCol("y",name,"",y),{pipe:[],mask:[]});
    const pr=Object.assign(blankProject(opt.proj||name),{cols:[xc,yc],activeY:yc.id}); /* plotted, as a user would */ pr.graphs=[{id:newGid(),name:"Graph 1",cols:[yc.id],plot:{style:"auto"}}]; await createProject(pr,"test"); await new Promise(r=>setTimeout(r,80)); renderAll(); };
  window.gauss=(n,c,w,h,x0,dx,noise)=>{ const x=[],y=[]; let s=7; const r=()=>{ s=(s*16807)%2147483647; return s/2147483647-0.5; };
    for(let i=0;i<n;i++){ const v=x0+i*dx; x.push(v); y.push(h*Math.exp(-(((v-c)/w)**2))+(noise||0)*r()); } return {x,y}; };
})()`;

const browser = await chromium.launch();
// Ready: the page has a project on the desk. A fixed wait was too short on a busy machine.
const ready = async (p) => { await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(150); };
async function page(fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.vw || { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(HELP);
  const T = opt.timeout || 30000;
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), T))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}

console.log("Axes at the limits of floating point");
await page(async p => {
  await p.evaluate(async () => { await loadExample("raman"); }); await p.waitForTimeout(300);
  const svg = await p.$("#plot"), b = await svg.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  for (let i = 0; i < 300; i++) await p.mouse.wheel(0, -400);
  const v = await p.evaluate(() => S.geo.v);
  check("300 turns of the wheel stop at the precision of the numbers", v.x1 - v.x0 > 0 && (v.x1 - v.x0) / Math.abs(v.x1) >= 0.5e-10, JSON.stringify(v));
  const t = await p.evaluate(() => { const a = performance.now(); S.view = { x0: 520, x1: 520 + 1e-15, y0: 0, y1: 1, xu: finalOf(activeYCol()).xu }; renderPlot(); return performance.now() - a; });
  check("a view narrower than a double can resolve draws at once", t < 2000, t);
}, { name: "deep zoom" });
await page(async p => {
  const x = [], y = []; for (let i = 0; i < 200; i++) { x.push(1.7e18 + i * 1e9); y.push(Math.sin(i / 9)); }
  await p.evaluate(async ([x, y]) => { await mkSpec("ns", x, y); }, [x, y]); await p.waitForTimeout(300);
  const labs = await p.evaluate(() => [...document.querySelectorAll("#plot text")].map(t => t.textContent).filter(s => /×10/.test(s)));
  check("tick labels on a nanosecond time axis are all different", labs.length > 2 && new Set(labs).size === labs.length, labs.slice(0, 4).join(" | "));
  const overlap = await p.evaluate(() => { const r = [...document.querySelectorAll("#plot text")].filter(t => /×10/.test(t.textContent)).map(t => t.getBoundingClientRect()).sort((a, b) => a.left - b.left);
    return r.some((q, i) => i && q.left < r[i - 1].right - 1); });
  check("and they do not overlap", !overlap);
  await p.evaluate(() => { setAxisKeys("y", { min: 3, max: 3 }, null); renderPlot(); setAxisKeys("x", { min: 1e300, max: -1e300 }, null); renderPlot(); });
  check("equal or crossed axis limits draw no NaN", !(await p.evaluate(() => /NaN|Infinity/.test(document.querySelector("#plot").innerHTML))));
}, { name: "huge and equal limits" });

console.log("This browser's store");
await page(async (p, ctx) => {
  const b = await ctx.newPage(); await b.goto(URL); await ready(b);
  await p.evaluate(async () => { const g = gauss(100, 50, 5, 10, 0, 1, 0); await mkSpec("A", g.x, g.y, { proj: "Tab A" }); }); await p.waitForTimeout(400);
  await b.waitForFunction(() => S.projects.some(q => q.name === "Tab A"), null, { timeout: 5000 }).catch(() => {});
  await b.evaluate(() => { save({ name: "Renamed in B" }, "renamed"); }); await b.waitForTimeout(400);
  const stored = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("kurve.p.")).map(k => JSON.parse(localStorage.getItem(k)).name).sort().join(","));
  check("a second tab saving keeps the first tab's projects", stored === "Renamed in B,Tab A", stored);
  check("the second tab sees the first tab's new project", (await b.evaluate(() => S.projects.map(q => q.name))).includes("Tab A"));
  await b.evaluate(() => { switchProject(S.projects.find(q => q.name === "Tab A").id); }); await b.waitForTimeout(300);
  await p.evaluate(() => { savePlot({ grid: true }, "grid"); }); await p.waitForTimeout(300);
  await b.evaluate(() => { save({ name: "Tab A, renamed in B" }, "rename"); }); await b.waitForTimeout(300);
  const q = await p.evaluate(() => JSON.parse(localStorage.getItem("kurve.p." + S.pid)));
  check("two tabs changing different parts of one project keep both", q.name === "Tab A, renamed in B" && q.graphs[0].plot.grid === true, q.name + " " + q.graphs[0].plot.grid);
}, { name: "two tabs" });
await page(async p => {
  await p.evaluate(() => { const blk = "x".repeat(1 << 18); try { for (let n = 0; n < 200; n++) localStorage.setItem("junk" + n, blk); } catch (e) {} });
  const r = await p.evaluate(async () => { await save({ cols: P().cols.map(c => c.role === "y" ? Object.assign({}, c, { data: Array.from({ length: 80000 }, (_, i) => Math.sin(i)) }) : c) }, "big"); return document.querySelector("#status").textContent; });
  check("a full store says Not saved", r === "Not saved", r);
  const r2 = await p.evaluate(async () => { for (let n = 0; n < 200; n++) localStorage.removeItem("junk" + n); await save({ name: "room now" }, "rename"); return [document.querySelector("#status").textContent, JSON.parse(localStorage.getItem("kurve.p." + S.pid)).cols.find(c => c.role === "y").data.length]; });
  check("the next save that fits writes the change that did not", r2[0] !== "Not saved" && r2[1] === 80000, r2.join(" "));
  const ids = await p.evaluate(async () => { const [a, b] = await Promise.all([LocalStore.create(blankProject("one")), LocalStore.create(blankProject("two"))]); return a === b; });
  check("two projects made in one millisecond get two ids", !ids);
}, { name: "full store" });
await page(async p => {
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("kurve.")) localStorage.removeItem(k);
    localStorage.setItem("kurve.v1", JSON.stringify({ projects: { pa: { name: "Old A", v: 4, cols: [] } }, comments: { pa: { c1: { text: "old", t: 1 } } } }));
    localStorage.setItem("kurve.layout", JSON.stringify({ v: 3, z: 5, wins: { sheet: { g: [null, "a", -5, 1e9], open: true, z: 3 } } })); });
  await p.reload(); await ready(p);
  const r = await p.evaluate(() => ({ keys: Object.keys(localStorage).filter(k => /^kurve\.(p|c)\.|^kurve\.v1$/.test(k)).sort().join(","), h: document.querySelector("#w-sheet").getBoundingClientRect().height }));
  check("the single store of earlier versions is split into one key a project", r.keys === "kurve.c.pa,kurve.p.pa", r.keys);
  check("a corrupt saved layout is put back where a window starts", r.h > 100 && r.h < 2000, r.h);
}, { name: "earlier versions" });

console.log("Data as documents write it");
await page(async p => {
  const r = await p.evaluate(() => { const a = analyzeFile("x,y\n1,−0.5\n2,−1.25\n3,0.75\n4,−2\n5,1\n6,−3\n");
    const b = analyzeFile("x;y\n1;1 234,5\n2;2 345,5\n3;3 456,5\n4;4 567,5\n");
    return [a.rows.length, b.rows.length, parseNum("−5"), parseNum("0x10")]; });
  check("typographic minus signs and no-break thousands import every row", r[0] === 6 && r[1] === 4, r.join(" "));
  check("a minus sign typed in a cell is a number, hex is not", r[2] === -5 && r[3] === null, r.slice(2).join(" "));
  const names = await p.evaluate(async () => { const out = []; window.saveFile = async n => { out.push(n); return true; };
    for (const nm of ["日本語データ", "Δ-spectrum α/β", "<<<>>>"]) { const g = gauss(30, 5, 1, 1, 0, 0.3, 0); await mkSpec("s", g.x, g.y, { proj: nm }); await exportCsv(); } return out; });
  check("file names keep any script, and never start with a dot", names[0] === "日本語データ.csv" && /^Δ-spectrum/.test(names[1]) && names[2] === "kurve.csv", names.join(" | "));
  const ser = await p.evaluate(() => metaSeries(["23:50", "23:55", "00:00", "00:05"].map(t => ({ meta: { T: t } })), "T").vals.join(","));
  check("times of day across midnight stay in order", ser === "0,5,10,15", ser);
}, { name: "data" });

console.log("Holding, many spectra, long names");
await page(async p => {
  await p.evaluate(async () => { await loadExample("raman"); addAnno({ t: "text", x: 510, y: 2000, text: "hold me" }); }); await p.waitForTimeout(300);
  const el = await p.$("#plot [data-anno]"), b = await el.boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(b.x + 60, b.y + 40, { steps: 5 });
  await p.keyboard.press("Control+z"); await p.mouse.move(b.x + 90, b.y + 60, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ n: (P().annos || []).length, redo: redoStack.length }));
  check("undo waits while a label is held, so letting go cannot bring back what it undid", r.n === 1 && r.redo === 0, JSON.stringify(r));
}, { name: "undo while holding" });
await page(async p => {
  await p.evaluate(async () => { const items = []; for (let k = 0; k < 300; k++) { const g = gauss(200, 40 + k % 30, 4, 100 + k, 0, 0.45, 3); items.push({ fname: `s${k}.csv`, name: `S${k}`, x: g.x, y: g.y, e: null, xn: "x", xu: "", yu: "", n: 200, x0: 0, x1: 90, meta: {} }); } await doBatchImport(items, [], { into: "here", graphs: "one", src: "test" }); });
  await p.waitForTimeout(1000);
  const ms = await p.evaluate(() => { ["sheet", "flow", "stats"].forEach(id => openWin(id, { render: true })); const a = performance.now(); save({ name: "x" }, null); return performance.now() - a; });
  check("a save with 300 spectra and the Statistics window open takes under 4 s", ms < 4000, Math.round(ms) + " ms");
  check("the correlation table is one column past a dozen spectra", await p.evaluate(() => document.querySelectorAll("#pane-stats table.corr td").length < 1000));
  const t = await p.evaluate(() => { const a = performance.now(); pushUndo("t"); return performance.now() - a; });
  check("an undo step does not copy the recorded data", t < 50, t.toFixed(1) + " ms");
}, { name: "many spectra", timeout: 120000 });
await page(async p => {
  await p.evaluate(async () => { const g = gauss(100, 50, 5, 10, 0, 1, 0); await mkSpec("s", g.x, g.y); const c = activeYCol(); newGraphFrom([c.id]); save({ graphs: P().graphs.map(q => Object.assign({}, q, { name: "N".repeat(400) })) }, null); renderAll(); });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => [...document.querySelectorAll(".win.gwin")].map(w => { const h = w.querySelector(".win-h"), m = w.querySelector("[data-wmin]"); return h.scrollWidth <= h.clientWidth + 2 && m.getBoundingClientRect().right <= w.getBoundingClientRect().right + 1; }));
  check("a long graph name leaves the title bar's buttons in reach", r.every(Boolean), r.join(","));
}, { name: "long names" });

console.log("Numbers");
await page(async p => {
  const r = await p.evaluate(() => { const f = lineFit([5, 5, 5], [1, 2, 3], [0.1, 0.2, 0.3]), g = lineFit([1e9, 1e9 + 1, 1e9 + 2], [1, 3, 5], null);
    let deep; try { compileExpr("y=" + "(".repeat(300) + "a*x" + ")".repeat(300)); } catch (e) { deep = e.message; }
    return { f, slope: g && g.b, deep }; });
  check("no straight line through points that share one X", r.f === null, JSON.stringify(r.f));
  check("a slope against values near 10^9 keeps its digits", Math.abs(r.slope - 2) < 1e-6, r.slope);
  check("a formula nested 300 deep is refused in words", /nested more than 200 deep/.test(r.deep || ""), r.deep);
}, { name: "numbers" });

console.log("Figures: breaks, a second axis, shapes, PDF and EPS");
await page(async p => {
  const g = await p.evaluate(() => gauss(800, 520, 6, 1000, 100, 1, 8));
  await p.evaluate(async g => { await mkSpec("Si", g.x, g.y, { xn: "Raman shift" }); }, g); await p.waitForTimeout(200);
  const r = {};
  for (const [k, b] of Object.entries({ crossed: [[700, 300]], nan: [[NaN, 5]], text: [["a", "b"]], many: Array.from({ length: 30 }, (_, i) => [120 + i * 20, 125 + i * 20]), most: [[110, 890]], obj: { a: 1 } })) {
    await p.evaluate(b => setAxisKeys("x", { brk: b }), b); await p.waitForTimeout(40);
    r[k] = await p.evaluate(() => S.geo.sx.gaps.length);
  }
  check("breaks read from storage as they come: crossed ends, NaN, text, too many, nearly all the axis", r.crossed === 1 && r.nan === 0 && r.text === 0 && r.many === 8 && r.most === 0 && r.obj === 0, JSON.stringify(r));
  await p.evaluate(() => setAxisKeys("x", { brk: [[300, 700]] })); await p.waitForTimeout(60);
  const inv = await p.evaluate(() => [200, 750, 880].map(x => Math.abs(toData(S.geo.X(x), S.geo.T + 5).x - x)));
  check("a broken axis maps back to data on both sides of the gap", inv.every(d => d < 1e-6), inv);
  const t = await p.evaluate(() => [...document.querySelectorAll("#plot text")].filter(t => +t.getAttribute("y") > S.geo.T + S.geo.mh).map(t => parseFloat(t.textContent)).filter(v => v > 300 && v < 700));
  check("no tick sits in a gap", !t.length, t);
}, { name: "breaks" });
await page(async p => {
  const g = await p.evaluate(() => gauss(800, 520, 6, 1000, 100, 1, 8));
  await p.evaluate(async g => { await mkSpec("Si", g.x, g.y, { xn: "Raman shift" }); }, g); await p.waitForTimeout(200);
  const err = {};
  for (const [k, a] of Object.entries({ pole: { conv: "expr", f: "1/(x-500)" }, flat: { conv: "expr", f: "5" }, param: { conv: "expr", f: "k*x" }, laser: { conv: "nm", from: "raman", laser: 0 }, slope0: { conv: "lin", a: 0 } })) {
    await p.evaluate(a => setAxisKeys("x2", Object.assign({ on: true, f: null, a: null, laser: null, from: null }, a)), a); await p.waitForTimeout(40);
    err[k] = await p.evaluate(() => ({ e: S.geo.x2err || "", n: document.querySelectorAll('#plot [data-axis="x2"]').length }));
  }
  check("a second axis that cannot be numbered says why in words, and is not drawn", Object.values(err).every(q => q.e.length > 10 && !q.n), JSON.stringify(err));
  // 1/x over a wide range: numbers where the axis has those values
  await p.evaluate(() => setAxisKeys("x2", { on: true, conv: "expr", f: "1e7/x", a: null, laser: null, from: null })); await p.waitForTimeout(60);
  const off = await p.evaluate(() => [...document.querySelectorAll("#plot text")].filter(t => +t.getAttribute("y") < S.geo.T - 2 && +t.getAttribute("y") > 0 && !t.dataset.axtitle)
    .map(t => { const sp = t.querySelector("tspan"), head = t.firstChild ? t.firstChild.nodeValue : "", v = sp ? (/×/.test(head) ? parseFloat(head) : 1) * 10 ** +sp.textContent : parseFloat(t.textContent), x = toData(+t.getAttribute("x"), S.geo.T).x; return Math.abs(1e7 / x - v) / v; }));
  check("a curved second axis puts each number where the first has that value", off.length >= 4 && off.every(d => d < 2e-3), off.map(d => d.toExponential(1)).join(" "));
}, { name: "second axis" });
await page(async p => {
  const g = await p.evaluate(() => gauss(800, 520, 6, 1000, 100, 1, 8));
  await p.evaluate(async g => { await mkSpec("Si", g.x, g.y, { xn: "Raman shift" }); }, g); await p.waitForTimeout(200);
  await p.evaluate(() => { addAnno({ t: "rect", x: 500, y: 500, x2: 500, y2: 500 }); addAnno({ t: "ellipse", pin: "plot", fx: -3, fy: -3, fx2: 5, fy2: 5, fill: "#ff0000", text: "光谱" });
    setPlotKey("title", "Spectre d'été, cm^{-1}, \\alpha"); setAxisKeys("x", { brk: [[300, 400]] }); setAxisKeys("x2", { on: true, conv: "lin", a: 2, b: 0, f: null }); });
  const r = await p.evaluate(async () => { const out = {};
    for (const kind of ["pdf", "eps"]) { const res = await svgToVector(buildPlot(700, 460, EXPORT_PAL, true), { kind, title: "Été", wPt: 240.945, hPt: 170.079 }); const b = new Uint8Array(await res.blob.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); out[kind] = { s, miss: res.miss }; }
    return out; });
  const pdf = r.pdf.s, sx = +pdf.match(/startxref\n(\d+)/)[1], n = +pdf.slice(sx).match(/xref\n0 (\d+)/)[1], tab = pdf.slice(sx).split("\n").slice(2, 2 + n);
  const offsOk = tab.slice(1).every((ln, i) => pdf.startsWith(`${i + 1} 0 obj`, +ln.slice(0, 10)));
  check("a PDF's cross-reference table points at every object", pdf.startsWith("%PDF-1.4") && offsOk && /%%EOF\n$/.test(pdf), `objects ${n - 1}`);
  check("a PDF has the size asked for, in points", /MediaBox \[0 0 240\.945 170\.079\]/.test(pdf));
  check("an EPS says its bounding box and ends its page", /^%!PS-Adobe-3\.0 EPSF-3\.0\n%%BoundingBox: 0 0 241 171/.test(r.eps.s) && /showpage\n%%EOF\n$/.test(r.eps.s));
  check("characters the standard fonts lack are named, not dropped in silence", r.pdf.miss.join("") === "光谱" && r.eps.miss.join("") === "光谱", r.pdf.miss.join(","));
  check("Greek letters go to the Symbol font", /\/BaseFont \/Symbol/.test(pdf));
  const x = await p.evaluate(() => { setAxisKeys("y", { title: "$\\frac{\\mathrm{d}I}{\\mathrm{d}V}$ PER_{log_{10}}" }); savePlot({ legend: "tr" }); setSeriesStyle(activeYCol().id, { label: "$\\sqrt{x^2_i}$" });
    const svg = buildPlot(700, 460, EXPORT_PAL, true), doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    return { bad: !!doc.querySelector("parsererror"), typeset: doc.querySelectorAll("g[data-rt]").length }; });
  check("a figure with LaTeX in it is well-formed XML, as PDF, EPS and PNG need", !x.bad && x.typeset >= 3, JSON.stringify(x));
}, { name: "pdf and eps" });
await page(async p => {
  const g = await p.evaluate(() => gauss(300, 150, 6, 10, 100, 1, 0));
  await p.evaluate(async g => { await mkSpec("A", g.x, g.y); }, g); await p.waitForTimeout(200);
  await p.evaluate(() => { localStorage.setItem("kurve.formats", '[null,1,"x",{"id":"a"},{"id":"b","name":"ok","fmt":{"frame":"l","ax":null}}]'); save({ formats: [null, { id: "z" }, { id: "q", name: "Q", fmt: 5 }, { id: "r", name: "R", fmt: { ax: { x: { ticks: "out" } }, txt: null } }] }); });
  await p.reload(); await ready(p);
  const r = await p.evaluate(() => { const out = { proj: projFormats().map(f => f.name), lib: fmtLib().map(f => f.name) }; allFormats().forEach(f => useFormat(f, false)); return out; });
  check("broken formats in the store and in the project are left out, the good ones kept", r.proj.join() === "R" && r.lib.join() === "ok", JSON.stringify(r));
}, { name: "formats" });

console.log("Graphs come and go");
await page(async p => {
  const wait = ms => p.waitForTimeout(ms);
  const st = () => p.evaluate(() => ({ gid: S.gid, act: (activeYCol() || {}).name, gs: (P().graphs || []).map(g => ({ id: g.id, cols: g.cols.map(k => colById(k).name), shut: !!g.plot.shut })), live: $("#gPane").parentElement.id }));
  await p.evaluate(async () => { await createProject(blankProject("No graph"), "test"); }); await wait(300);
  let r = await st();
  check("a new project has no graph, and the live graph waits off the desk", r.gs.length === 0 && r.gid === null && r.live === "gPark", JSON.stringify(r));
  const g = await p.evaluate(() => gauss(200, 150, 6, 10, 100, 1, 0));
  await p.evaluate(async g => { await mkSpec("A", g.x, g.y); }, g); await wait(200);
  const ids = await p.evaluate(() => { const a = activeYCol().id, c2 = Object.assign(makeCol("y", "B", "", activeYCol().data.map(v => v * 2)), { pipe: [], mask: [] });
    save({ cols: P().cols.concat([c2]) }); plotCols([c2.id], {}); return [a, c2.id]; }); await wait(200);
  r = await st(); const g1 = r.gs[0].id;
  check("plotting one column, then another, makes a graph for each", r.gs.length === 2 && r.gs[0].cols.join() === "A" && r.gs[1].cols.join() === "B", JSON.stringify(r));
  /* a comment on the first graph's box, and its folder */
  await p.evaluate(g1 => { S.cDrafts = S.cDrafts || {}; S.cDrafts["node:graph:" + g1] = "About the first graph"; postNodeComment("graph:" + g1);
    const t = treeOf(P()); t.folders.push({ id: "fo", name: "Old", parent: null }); t.at["g:" + g1] = "fo"; saveTree(t, null, { noUndo: true }); }, g1); await wait(300);
  const th = () => p.evaluate(() => (S.comments || []).filter(c => c.anchor && c.anchor.type === "node").map(c => ({ key: c.anchor.key, lab: nodeLabel(c.anchor) })));
  await p.evaluate(g1 => deleteGraph(g1), g1); await wait(300);
  r = await st();
  check("the first graph is deleted like any other: gone from the project", r.gs.length === 1 && !r.gs.some(q => q.id === g1) && r.gid === r.gs[0].id, JSON.stringify(r));
  await p.evaluate(a => plotCols([a], {}), ids[0]); await wait(300);
  r = await st(); const t1 = await th(), g4 = r.gs[r.gs.length - 1].id;
  check("the next graph has an id of its own, and none of the deleted one's comments", g4 !== g1 && t1.length === 1 && t1[0].key === "graph:" + g1 && /since removed/.test(t1[0].lab), JSON.stringify([r, t1]));
  check("nor its place in the Explorer", await p.evaluate(g4 => !(treeOf(P()).at || {})["g:" + g4], g4), "");
  await p.evaluate(() => { undo(); undo(); }); await wait(300);
  const at = await p.evaluate(g1 => treeOf(P()).at["g:" + g1] || null, g1), t2 = await th();
  check("undoing the deletion gives both back", at === "fo" && t2.length === 1 && !/since removed/.test(t2[0].lab), JSON.stringify([at, t2]));
  /* the bugs reported: a curve taken off a graph of two */
  await p.evaluate(ids => plotCols(ids, {}), ids); await wait(300);
  r = await st(); const g3 = r.gid;
  await p.evaluate(a => { setActiveCol(a, true); toggleColVis(a); }, ids[0]); await wait(300);
  r = await st();
  check("taking the analysed curve off a graph of two keeps that graph in front, the other analysed", r.gid === g3 && r.act === "B" && r.gs.find(q => q.id === g3).cols.join() === "B", JSON.stringify(r));
  await p.evaluate(b => toggleColVis(b), ids[1]); await wait(300);
  r = await st();
  check("a graph's last curve stays: the graph is deleted, not emptied", r.gs.find(q => q.id === g3).cols.join() === "B", JSON.stringify(r));
  await p.evaluate(g3 => closeGraph(g3), g3); await wait(300);
  await p.evaluate(() => { for (const g of P().graphs.slice()) if (!g.plot.shut) closeGraph(g.id); }); await wait(300);
  const n0 = (await st()).gs.length;
  await p.evaluate(a => toggleColVis(a), ids[0]); await wait(300);
  r = await st();
  check("with the graphs closed, showing a column plots it on a graph of its own, not beside a closed graph's curves", r.gs.length === n0 + 1 && r.gs[r.gs.length - 1].cols.join() === "A" && r.gs.find(q => q.id === g3).cols.join() === "B", JSON.stringify(r));
  await p.evaluate(() => { for (const g of P().graphs.slice()) deleteGraph(g.id); }); await wait(300);
  r = await st();
  check("every graph deleted leaves a project with none, the worksheet on the desk", r.gs.length === 0 && r.live === "gPark" && await p.evaluate(() => winOpen("sheet")), JSON.stringify(r));
}, { name: "graphs come and go" });

console.log("Sheets");
await page(async p => {
  const wait = ms => p.waitForTimeout(ms);
  const g = await p.evaluate(() => gauss(40, 20, 3, 5, 0, 1, 0));
  await p.evaluate(async g => { await mkSpec("A", g.x, g.y); }, g); await wait(200);
  let r = await p.evaluate(() => ({ n: sheetList().length, saved: Array.isArray(P().sheets), on: sheetCols().map(c => c.name) }));
  check("a project from before sheets has one, and nothing records it", r.n === 1 && !r.saved && r.on.join() === "X,A", JSON.stringify(r));
  r = await p.evaluate(() => { const q = { sheets: [{ id: "a", name: "One" }, { id: "a", name: "Dup" }, null, { name: "no id" }, { id: "b", name: 7 }] }; normalize(Object.assign(P(), q)); const s1 = sheetList().map(s => s.id + ":" + s.name).join(); P().sheets = "junk"; normalize(P()); const s2 = P().sheets; return { s1, s2, on: sheetCols().map(c => c.name).join() }; });
  check("sheets read from storage in a broken form are cleaned, and columns naming none are on the first", r.s1 === "a:One,b:7" && r.s2 === null && r.on === "X,A", JSON.stringify(r));
  await p.evaluate(() => { newSheet(); }); await wait(200);
  r = await p.evaluate(() => { const [a, b] = sheetList(); moveSheet(b.id, -1); return { order: sheetList().map(s => s.name).join(), first: sheetCols(sheetList()[1].id).map(c => c.name).join() }; }); await wait(200);
  check("a sheet moved first keeps its columns, and the old first sheet its own", r.order === "Sheet 2,Sheet 1" && r.first === "X,A", JSON.stringify(r));
  r = await p.evaluate(() => { const s1 = sheetList().find(s => s.name === "Sheet 1").id; showSheet(s1, { quiet: true }); wsHideRows([3, 4]); const s2 = sheetList().find(s => s.name === "Sheet 2").id; showSheet(s2, { quiet: true }); const h2 = wsHideOf(P()).rows.slice(); wsHideRows([1]); showSheet(s1, { quiet: true }); return { h1: wsHideOf(P()).rows.join(), h2: h2.join() }; }); await wait(200);
  check("hidden rows are each sheet's own", r.h1 === "3,4" && r.h2 === "", JSON.stringify(r));
  r = await p.evaluate(async () => { const ids = sheetList().map(s => s.id); await deleteSheet(ids.find(i => sheetCols(i).every(c => !c.data.some(v => v != null)))); const n = sheetList().length; await deleteSheet(sheetList()[0].id); return { n, after: sheetList().length }; }); await wait(300);
  check("an empty sheet is deleted at once, and the last sheet stays", r.n === 1 && r.after === 1, JSON.stringify(r));
  r = await p.evaluate(() => { P().wsHide = { cols: [], rows: [2] }; return wsHideOf(P()).rows.join(); });
  check("hidden rows kept before sheets are the first sheet's", r === "2", r);
}, { name: "sheets" });

console.log("A curve fit held to one iteration, a tolerance of zero, starting values it cannot use");
await page(async p => {
  const g = await p.evaluate(() => { const x=[], y=[]; for(let i=0;i<120;i++){ x.push(i*0.1); y.push(1+4*Math.exp(-i*0.1/1.7)+0.01*Math.sin(i)); } return {x,y}; });
  await p.evaluate(async g => { await mkSpec("decay", g.x, g.y); }, g); await p.waitForTimeout(200);
  const r = await p.evaluate(() => { S.fitMode="curve"; showTab("fit"); const d=ensureDraft(); d.model="expdec"; d.fn=null; d.fixed=null; guessDraft();
    d.init=[0,1,0]; stepFit(); const bad=S.fitError||"";
    d.init=[0,1,1]; S.fitError=""; d.ctl={maxIter:1,tol:0}; runFit(); const f=P().fit;
    return { bad, iter:f&&f.stats.iter, conv:f&&f.stats.converged, nan:/NaN|Infinity/.test(document.querySelector("#plot").innerHTML), run:!!S.fitRun }; });
  check("one iteration from starting values the model cannot use says so in words", /can't be evaluated/.test(r.bad), r.bad);
  check("a fit held to one iteration stops after one, unsettled, and draws no NaN", r.iter===1 && r.conv===false && !r.nan && !r.run, JSON.stringify(r));
  const L = await p.evaluate(() => { const d=S.draft, out={}; d.ctl=null; S.fitError="";
    // a strict lowest value right at the start, where the model cannot be evaluated
    d.init=[0,1,0]; d.lim={lo:[null,null,0],hi:[null,null,null],slo:[false,false,true],shi:[false,false,false]}; runFit();
    out.strict={err:S.fitError||"", t:P().fit&&P().fit.params[2], nan:/NaN|Infinity/.test(document.querySelector("#plot").innerHTML)};
    // every parameter held by equal limits
    S.fitError=""; d.init=[1,4,1.7]; d.lim={lo:[1,4,1.7],hi:[1,4,1.7],slo:[false,false,false],shi:[false,false,false]}; runFit(); out.held=S.fitError||"";
    // crossed limits, as storage might hand them back
    S.fitError=""; d.lim={lo:[null,5,null],hi:[null,1,null],slo:[],shi:"x"}; runFit(); out.crossed=S.fitError||"";
    S.fitError=""; d.lim={lo:"junk",hi:null}; renderFit(); runFit(); out.junk={err:S.fitError||"", ok:!!(P().fit&&P().fit.params.every(Number.isFinite))};
    return out; });
  check("a strict limit right at the start: the fit starts just inside it, and draws no NaN", (L.strict.t>0 || /words|evaluated|fixed|points/.test(L.strict.err)) && !L.strict.nan, JSON.stringify(L.strict));
  check("every parameter held by equal limits is refused in words", /Every parameter is fixed/.test(L.held), L.held);
  check("crossed limits from storage are refused in words, not fitted", /above its highest/.test(L.crossed), L.crossed);
  check("limits of the wrong shape are taken as none", !L.junk.err && L.junk.ok, JSON.stringify(L.junk));
}, { name: "fit control" });

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
