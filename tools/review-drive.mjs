/* The user's reports, each checked as it was reported, clicked and dragged in a real browser.
   Needs Playwright with Chromium. Usage:
     node tools/review-drive.mjs [path/to/kurve.html]
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
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), opt.timeout || 90000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
const csv = (n, k) => "Wavelength,Intensity\n" + Array.from({ length: n }, (_, i) => `${400 + i},${(k * Math.sin(i / 5) + 5).toFixed(3)}`).join("\n");
// Each sheet's columns as the worksheet letters them: "A:x:Wavelength:30".
const sheets = p => p.evaluate(() => sheetList().map(s => sheetCols(s.id).map(c => `${colLetter(c)}:${c.role}:${c.name || "—"}:${(c.data || []).filter(v => v != null).length}`).join(" ")));
const viaDialog = async (p, name, text) => { await p.evaluate(([n, t]) => { importText(t, n); }, [name, text]); await p.waitForTimeout(400); await p.evaluate(() => doImport()); await p.waitForTimeout(500); };

console.log("29.10: importing into the sheets of one project put an empty column between a file's columns");
await page(async p => {
  await viaDialog(p, "one.csv", csv(30, 1));
  await p.evaluate(() => { newSheet(); }); await p.waitForTimeout(300);
  let r = await sheets(p);
  check("a new sheet starts with an empty X and an empty Y", r[1] === "A:x:—:0 B:y:—:0", JSON.stringify(r));
  const mode = await p.evaluate(t => { importText(t, "two.csv"); return S.imp.mode; }, csv(30, 2)); await p.waitForTimeout(300);
  await p.evaluate(() => doImport()); await p.waitForTimeout(500);
  r = await sheets(p);
  check("the dialog's Add to the sheet shown: the file takes the empty sheet's place, nothing between its columns", mode === "add" && r[1] === "A:x:Wavelength:30 B:y:Intensity:30", JSON.stringify([mode, r]));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  r = await sheets(p);
  check("…and one undo gives the empty sheet back as it was", r[1] === "A:x:—:0 B:y:—:0", JSON.stringify(r));
  await p.evaluate(() => { newSheet(); }); await p.waitForTimeout(300);
  await p.evaluate(async t => { await autoImport([{ name: "three.csv", text: t }], {}); }, csv(30, 3)); await p.waitForTimeout(500);
  r = await sheets(p);
  check("a file dropped on an empty sheet: its own columns only", r[2] === "A:x:Wavelength:30 B:y:three:30", JSON.stringify(r));
  await p.evaluate(() => { newSheet(); }); await p.waitForTimeout(300);
  await p.evaluate(async ([a, b]) => { const it = batchFile("four.csv", a).concat(batchFile("five.csv", b)); await doBatchImport(it, [], { into: "here", graphs: "none", src: "2 files" }); }, [csv(30, 4), csv(30, 5)]); await p.waitForTimeout(500);
  r = await sheets(p);
  check("several files at once onto an empty sheet: one X and their columns", /^A:x:Wavelength:30 B:y:[^ ]+:30 C:y:[^ ]+:30$/.test(r[3]), JSON.stringify(r));
  // A placeholder someone has named is theirs: it stays.
  await p.evaluate(() => { newSheet(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const y = sheetCols(curSheet()).find(c => c.role === "y"); y.name = "Mine"; save({ cols: P().cols }); }); await p.waitForTimeout(200);
  await p.evaluate(t => { importText(t, "six.csv"); }, csv(30, 6)); await p.waitForTimeout(300); await p.evaluate(() => doImport()); await p.waitForTimeout(500);
  r = await sheets(p);
  check("…a column someone named is kept, the file beside it", /B:y:Mine:0/.test(r[4]) && /Intensity:30/.test(r[4]), JSON.stringify(r));
  // Copy from another project onto an empty sheet.
  const other = await p.evaluate(async t => { const keep = S.pid; const n = 20, x = [], y = []; for (let i = 0; i < n; i++) { x.push(i); y.push(i * i); }
    const X = makeCol("x", "Step", "", x), Y = Object.assign(makeCol("y", "Squares", "", y), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Other one"), { cols: [X, Y], activeY: Y.id }), "test"); await new Promise(r => setTimeout(r, 200));
    const q = P(); switchProject(keep); await new Promise(r => setTimeout(r, 300)); return { id: q.id, y: Y.id }; });
  await p.waitForTimeout(300);
  await p.evaluate(() => { newSheet(); }); await p.waitForTimeout(300);
  await p.evaluate(o => { const q = S.projects.find(z => z.id === o.id); bringIn([{ q, cids: [o.y] }], "new", null); }, other); await p.waitForTimeout(500);
  r = await sheets(p);
  check("columns copied from another project onto an empty sheet: theirs only", r[5] === "A:x:Step:20 B:y:Squares:20", JSON.stringify(r));
}, { name: "importing into sheets" });

console.log("29.10: zooming one graph zoomed every graph, without being asked to");
await page(async p => {
  await p.evaluate(async () => { const n = 50, x = [], a = [], b = []; for (let i = 0; i < n; i++) { x.push(i); a.push(Math.sin(i / 5)); b.push(Math.cos(i / 5)); }
    const X = makeCol("x", "t", "s", x), A = Object.assign(makeCol("y", "A", "", a), { pipe: [], mask: [] }), B = Object.assign(makeCol("y", "B", "", b), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Two graphs"), { cols: [X, A, B], activeY: A.id, graphs: [{ id: "ga", name: "Graph 1", cols: [A.id], plot: { style: "auto" } }, { id: "gb", name: "Graph 2", cols: [B.id], plot: { style: "auto" } }] }), "test");
    await new Promise(r => setTimeout(r, 200)); renderAll(); });
  await p.waitForTimeout(400);
  let r = await p.evaluate(() => { const items = graphWinItems(S.gid).filter(i => i && i.label); return { link: S.linkX, item: items.find(i => i.label === "Link the X zoom of the graphs") }; });
  check("in a browser that never chose, the graphs keep their own zoom; the graph's ⋯ menu offers the link", r.link === false && r.item && !r.item.checked, JSON.stringify(r));
  r = await p.evaluate(() => { activateGraph("ga"); S.view = { x0: 10, x1: 20, xu: "s" }; renderPlot(); return viewFor("gb"); });
  check("zooming Graph 1 leaves Graph 2 showing all of it", !r || r.x0 == null, JSON.stringify(r));
  await p.evaluate(() => { graphWinItems(S.gid).find(i => i && i.label === "Link the X zoom of the graphs").run(); }); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ v: viewFor("gb"), keep: localStorage.getItem("kurve.linkX") }));
  check("…linked from the ⋯ menu, Graph 2 follows, and the choice is kept", r.v && r.v.x0 === 10 && r.v.x1 === 20 && r.keep === "1", JSON.stringify(r));
}, { name: "linked zoom" });

console.log("29.10: the reader's card was held inside the graph, and could not be resized");
await page(async p => {
  await p.evaluate(async () => { const n = 60, x = [], y = []; for (let i = 0; i < n; i++) { x.push(i); y.push(Math.sin(i / 6)); }
    const X = makeCol("x", "t", "s", x), Y = Object.assign(makeCol("y", "Wave", "", y), { pipe: [], mask: [] });
    await createProject(Object.assign(blankProject("Reader"), { cols: [X, Y], activeY: Y.id, graphs: [{ id: "g1", name: "Graph 1", cols: [Y.id], plot: { style: "auto" } }] }), "test");
    await new Promise(r => setTimeout(r, 200)); renderAll(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => setMode("reader")); await p.waitForTimeout(300);
  const box = () => p.evaluate(() => { const c = $("#rdCard"), r = c.getBoundingClientRect(), f = $("#figure").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), inFig: r.left >= f.left - 1 && r.right <= f.right + 1 && r.top >= f.top - 1, host: c.parentElement.id, shown: !c.hidden }; });
  let a = await box();
  check("the Reader's card: shown at the graph's top right, in the app rather than inside the graph", a.shown && a.inFig && a.host === "app", JSON.stringify(a));
  // Dragged by its head over the worksheet, outside the graph.
  const ws = await p.evaluate(() => { const r = $("#w-sheet").getBoundingClientRect(); return { x: r.left + 60, y: r.top + 120 }; });
  await p.mouse.move(a.x + 40, a.y + 10); await p.mouse.down(); await p.mouse.move(a.x - 200, a.y + 50, { steps: 4 }); await p.mouse.move(ws.x, ws.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  let b = await box();
  const ow = await p.evaluate(() => { const c = $("#rdCard").getBoundingClientRect(), w = $("#w-sheet").getBoundingClientRect(); return c.left < w.right && c.right > w.left && c.top < w.bottom && c.bottom > w.top; });
  check("…dragged out of the graph onto the worksheet, it stays there", !b.inFig && ow && Math.abs(b.x - (ws.x - 40)) < 3 && Math.abs(b.y - (ws.y - 10)) < 3, JSON.stringify([a, b, ws]));
  // Resized by its corner.
  await p.mouse.move(b.x + b.w - 5, b.y + b.h - 5); await p.mouse.down(); await p.mouse.move(b.x + b.w + 120, b.y + b.h + 90, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(150);
  let c = await box();
  check("…resized by its corner grip", c.w >= b.w + 110 && c.h >= b.h + 80 && c.x === b.x && c.y === b.y, JSON.stringify([b, c]));
  await p.mouse.move(c.x + c.w - 5, c.y + c.h - 5); await p.mouse.down(); await p.mouse.move(c.x + 20, c.y + 20, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150);
  const small = await box();
  check("…never smaller than its least size", small.w >= 220 && small.h >= 120, JSON.stringify(small));
  await p.mouse.move(small.x + small.w - 5, small.y + small.h - 5); await p.mouse.down(); await p.mouse.move(c.x + c.w, c.y + c.h, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150);
  c = await box();
  // The X–Y lines use the same card, where it was left.
  await p.evaluate(() => setMode("cross")); await p.waitForTimeout(300);
  const d = await box();
  check("the X–Y lines' card opens where the Reader's was left, at its size", d.shown && d.x === c.x && d.y === c.y && Math.abs(d.w - c.w) < 2, JSON.stringify([c, d]));
  // Kept for the next visit, and kept inside a smaller window.
  await p.reload(); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); setMode("reader"); }); await p.waitForTimeout(400);
  const e = await box();
  check("…and after a reload, in the same place and size", e.shown && e.x === c.x && e.y === c.y && Math.abs(e.w - c.w) < 2 && Math.abs(e.h - c.h) < 2, JSON.stringify([c, e]));
  await p.setViewportSize({ width: 900, height: 600 }); await p.waitForTimeout(400);
  const f = await p.evaluate(() => { const r = $("#rdCard").getBoundingClientRect(); return { r: Math.round(r.right), b: Math.round(r.bottom), l: Math.round(r.left), t: Math.round(r.top) }; });
  check("…a smaller window keeps it whole on the screen", f.l >= 0 && f.t >= 0 && f.r <= 900 && f.b <= 600, JSON.stringify(f));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
  // Double-click its head: back by the graph.
  const g0 = await box(); await p.mouse.dblclick(g0.x + 40, g0.y + 10); await p.waitForTimeout(200);
  const g = await box();
  check("double-clicking its head puts it back at the graph's top right", g.inFig && !(await p.evaluate(() => localStorage.getItem("kurve.rdcard"))), JSON.stringify(g));
  // Under a dialog it cannot be reached; nothing broken comes back from storage.
  await p.evaluate(() => { confirmDlg("Test", "A dialog over the card", "OK"); }); await p.waitForTimeout(200);
  const inert = await p.evaluate(() => !!$("#rdCard").closest("[inert]"));
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  await p.evaluate(() => { localStorage.setItem("kurve.rdcard", JSON.stringify({ x: "a", y: 1e9, w: -5, h: null })); setMode("zoom"); setMode("reader"); }); await p.waitForTimeout(300);
  const h = await p.evaluate(() => { const r = $("#rdCard").getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width }; });
  check("a dialog makes the card inert; what storage gives back that does not read leaves it on the screen", inert && h.l >= 0 && h.t >= 0 && h.r <= 1440 && h.b <= 900 && h.w >= 220, JSON.stringify([inert, h]));
  await p.evaluate(() => setMode("zoom")); await p.waitForTimeout(150);
  check("with another tool the card goes", await p.evaluate(() => $("#rdCard").hidden));
}, { name: "the readers' card" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
