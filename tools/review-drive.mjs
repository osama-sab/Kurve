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

console.log("05.11: a day of lab work: heavy files, two tabs, the keys, windows and rows");
await page(async p => {
  // A file of a million rows: kept, quick to work with, back after a reload (it was "Not saved", and gone after one).
  const n = 1000000, text = "Time (s),Signal (mV)\n" + Array.from({ length: n }, (_, i) => `${(i * 1e-4).toFixed(4)},${(Math.sin(i / 300) * 100).toFixed(3)}`).join("\n");
  await p.evaluate(t => { importText(t, "scan.csv"); }, text); await p.waitForTimeout(1500); await p.evaluate(() => doImport()); await p.waitForTimeout(3000);
  const a = await p.evaluate(async () => { const t = performance.now(); await save({ name: "Big scan" }, "renamed"); return [nRows(), performance.now() - t, $("#status").textContent, $("#ws").closest(".win").querySelector(".ws-foot").textContent]; });
  check("a million-row file is saved, and a change to it saves in a moment", a[0] === n && a[1] < 400 && a[2] === "Saved", JSON.stringify(a.slice(0, 3)));
  check("…its count reads 1 000 000", /1\u202f000\u202f000 rows/.test(a[3]), a[3]);
  await p.reload(); await ready(p);
  const b = await p.evaluate(() => { const q = S.projects.find(q => q.name === "Big scan"), y = q && q.cols.find(c => c.role === "y"); return y ? [y.data.length, y.data[777777]] : null; });
  check("…and is there after a reload", b && b[0] === n && Math.abs(b[1] - +(Math.sin(777777 / 300) * 100).toFixed(3)) < 1e-9, JSON.stringify(b));
}, { name: "a heavy file", timeout: 180000 });
await page(async (p, ctx) => {
  // Two tabs on one project, typing in two columns at once: both columns stay (one was lost).
  await p.evaluate(() => { const n = 12, x = [], y = []; for (let i = 0; i < n; i++) { x.push(i); y.push(i * 2); } save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "Y", "", y), { pipe: [], mask: [] })], activeY: null }, "typed"); }); await p.waitForTimeout(400);
  const q = await ctx.newPage(); await q.goto(URL); await ready(q); await q.evaluate(id => switchProject(id), await p.evaluate(() => S.pid)); await q.waitForTimeout(400);
  const typeCol = async (t, col, vals) => { await t.locator(`#ws td[data-r="0"][data-ci="${col}"]`).click(); for (const v of vals) { await t.keyboard.type(v, { delay: 15 }); await t.keyboard.press("Enter"); } };
  await Promise.all([typeCol(p, 2, ["1", "2", "3", "4"]), typeCol(q, 3, ["9", "8", "7", "6"])]);
  await p.waitForTimeout(1600);
  const cols = t => t.evaluate(() => sheetCols(curSheet()).map(c => (c.data || []).filter(v => v != null).join(",")).join(" | "));
  const ca = await cols(p), cb = await cols(q), st = await p.evaluate(async () => (await S.store.stored(S.pid)).cols.filter(c => !c.src).map(c => (c.data || []).filter(v => v != null).join(",")).join(" | "));
  check("two tabs typing in two columns of one project keep both columns, on screen and stored", /1,2,3,4/.test(ca) && /9,8,7,6/.test(ca) && ca === cb && ca === st, JSON.stringify([ca, cb, st]));
  // An undo in one tab took back what the other tab had changed since: a column and a cell.
  await p.locator('#ws td[data-r="1"][data-ci="1"]').click(); await p.keyboard.type("100"); await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
  await q.locator('#ws td[data-r="3"][data-ci="1"]').click(); await q.keyboard.type("300"); await q.keyboard.press("Enter"); await q.waitForTimeout(1200);
  await p.evaluate(() => undo()); await p.waitForTimeout(1200);
  const y = t => t.evaluate(() => sheetCols(curSheet())[1].data.slice(0, 5).join(","));
  const u = [await y(p), await y(q), await cols(p)];
  check("an undo takes back this tab's change and keeps the other tab's, cell by cell and column by column", u[0] === "0,2,4,300,8" && u[1] === u[0] && /9,8,7,6/.test(u[2]), JSON.stringify(u));
  // A tab closed with a value still in its box: the value is stored, and the other tab shows it.
  // Both pages slowed six times (Chrome's CPU throttling): the last flush told the other tab the
  // version from before its write, which the other tab already had, and so read nothing; at full
  // speed a later message hid it, under a loaded machine it did not (07.11).
  for (const t of [p, q]) { const c = await ctx.newCDPSession(t); await c.send("Emulation.setCPUThrottlingRate", { rate: 6 }); }
  await q.locator('#ws td[data-r="8"][data-ci="0"]').click(); await q.keyboard.type("777"); await q.close({ runBeforeUnload: true });
  const got = await p.waitForFunction(() => sheetCols(curSheet())[0].data[8] === 777, null, { timeout: 8000 }).then(() => 777).catch(() => p.evaluate(() => sheetCols(curSheet())[0].data[8]));
  check("a tab closed mid-edit: what it was typing reaches the other tab (both slowed six times)", got === 777, got);
}, { name: "two tabs typing" });
await page(async p => {
  await p.evaluate(() => loadExample("decay")); await p.waitForTimeout(1200); await p.evaluate(() => { tileWins(); }); await p.waitForTimeout(500);
  // A press on a graph's numbers, title bar or bar takes the keys: Delete and typing acted on the worksheet behind.
  const v = () => p.evaluate(() => sheetCols(curSheet()).map(c => c.data.slice(0, 8).join(",")).join(" | ")), v0 = await v();
  for (const sel of ["#plot rect[data-axis='y']", "section.gwin.haslive .win-h .win-t", "#gRibbon"]) {
    await p.locator('#ws td[data-r="5"][data-ci="1"]').click(); const b = await p.locator(sel).first().boundingBox();
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(120); await p.keyboard.press("Delete"); await p.keyboard.type("9"); await p.waitForTimeout(150); await p.keyboard.press("Escape"); }
  check("a press on a graph's numbers, title bar or bar takes the keys from the worksheet", (await v()) === v0 && (await p.evaluate(() => document.activeElement.id)) === "plot", await v());
  // A window's corner dragged past the browser's edge selected every word on the page.
  await p.evaluate(() => openWin("batch")); await p.waitForTimeout(300);
  const c = await p.locator("section.win:not(.docked):not([hidden]) .win-rz.se").first().boundingBox();
  await p.mouse.move(c.x + 3, c.y + 3); await p.mouse.down(); for (let i = 1; i <= 15; i++) await p.mouse.move(c.x - i * 120, c.y - i * 120); await p.mouse.up();
  check("a window's corner dragged past the browser's edge selects nothing", (await p.evaluate(() => getSelection().toString().length)) === 0);
  // Rows sized by the line under a row number, as columns are by their edges.
  await p.evaluate(() => focusWin("sheet")); await p.waitForTimeout(200);
  const r = await p.locator('#ws th.rh[data-rh="1"] .rzr').boundingBox();
  await p.mouse.move(r.x + 20, r.y + 3); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(r.x + 20, r.y + 3 + i * 2.5); await p.mouse.up(); await p.waitForTimeout(1000);
  const h = await p.evaluate(() => [...document.querySelectorAll("#ws tr.dr")].slice(0, 3).map(t => Math.round(t.getBoundingClientRect().height)));
  check("the line under a row number makes the rows taller", h[0] >= 30 && h.every(x => x === h[0]), JSON.stringify(h));
  await p.reload(); await ready(p); await p.evaluate(() => focusWin("sheet")); await p.waitForTimeout(300);
  check("…and they keep that height", (await p.evaluate(() => Math.round(document.querySelector("#ws tr.dr").getBoundingClientRect().height))) === h[0]);
  const r2 = await p.locator('#ws th.rh[data-rh="0"] .rzr').boundingBox(); await p.mouse.dblclick(r2.x + 20, r2.y + 3); await p.waitForTimeout(400);
  check("…until a double click on the line", (await p.evaluate(() => Math.round(document.querySelector("#ws tr.dr").getBoundingClientRect().height))) === 22);
  // An error column in German is error bars; "not plotted" fits its column after a fit to contents.
  check("error columns named Fehler, Std.Abw., erreur or incertitude are error bars", await p.evaluate(() => ["Fehler", "Std.Abw.", "erreur", "incertitude (mg/L)", "errore"].every(h => ERR_NAME.test(h)) && !ERR_NAME.test("Device")));
}, { name: "keys, windows and rows" });
await page(async (p, ctx) => {
  // A graph in a window of its own narrower than 860 px took the phone layout and filled half of it.
  await p.evaluate(() => loadExample("decay")); await p.waitForTimeout(1200);
  const [pop] = await Promise.all([ctx.waitForEvent("page"), p.evaluate(() => detachWin(graphWinIds()[0]))]); await pop.waitForTimeout(1200);
  await pop.setViewportSize({ width: 600, height: 700 }); await pop.waitForTimeout(1500);
  const r = await pop.evaluate(() => { const b = document.querySelector(".dwin-w>.win-b"); return [innerHeight, b.clientHeight]; });
  check("a graph in a window of its own 600 px wide fills its height", r[1] > r[0] - 60, JSON.stringify(r));
}, { name: "a narrow window of its own" });
await page(async p => {
  // The dock's edge dragged to the far left made the dock a drawer over the whole desk, with no edge to drag back.
  await p.evaluate(() => loadExample("decay")); await p.waitForTimeout(1000); await p.evaluate(() => { openWin("stats", { render: true }); }); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => { const g = dockGeo(); return { dw: g.dw, drawer: g.drawer, docsW: g.docsW, sheet: Math.round(document.getElementById("w-sheet").getBoundingClientRect().width) }; });
  const edge = () => p.evaluate(() => { const r = document.getElementById("dockEdge").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const a = await st(); let e = await edge(); const x0 = e[0];
  await p.mouse.move(...e); await p.mouse.down(); for (let i = 1; i <= 15; i++) await p.mouse.move(e[0] + (10 - e[0]) * i / 15, e[1]); await p.mouse.up(); await p.waitForTimeout(300);
  const b = await st();
  check("the dock's edge dragged to the far left stops where the documents keep 780 px, beside them", !b.drawer && b.docsW === 780, JSON.stringify(b));
  check("…and selects nothing", (await p.evaluate(() => getSelection().toString().length)) === 0);
  e = await edge(); await p.mouse.move(...e); await p.mouse.down(); for (let i = 1; i <= 15; i++) await p.mouse.move(e[0] + (x0 - e[0]) * i / 15, e[1]); await p.mouse.up(); await p.waitForTimeout(300);
  const c = await st();
  check("…and dragged back, the desk is as it was", c.dw === a.dw && c.sheet === a.sheet && !c.drawer, JSON.stringify([a, c]));
  await p.evaluate(() => { LAYOUT.dockW = 5000; applyWins(); }); await p.waitForTimeout(200);
  check("a width kept from before that would cover the desk is held to the same limit", (await st()).docsW === 780, JSON.stringify(await st()));
}, { name: "the dock's edge" });

console.log("05.11: known gaps closed: drags past the grid's edge, an undo beside another tab");
await page(async p => {
  await p.evaluate(() => { const n = 12, x = [], y = []; for (let i = 0; i < n; i++) { x.push(i); y.push(i * 2); } save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "Y", "", y), { pipe: [], mask: [] })], activeY: null }, "typed"); prefSet("anim", false); applyAnim(); }); await p.waitForTimeout(500);
  await p.evaluate(() => focusWin("sheet")); await p.waitForTimeout(300);
  // The fill handle held past the grid's bottom: it went no further than the last row in view unless the pointer moved.
  await p.locator('#ws td[data-r="0"][data-ci="2"]').click(); await p.keyboard.type("1"); await p.keyboard.press("Enter"); await p.keyboard.type("2"); await p.keyboard.press("Enter"); await p.waitForTimeout(900);
  await p.locator('#ws td[data-r="0"][data-ci="2"]').click(); await p.keyboard.press("Shift+ArrowDown"); await p.waitForTimeout(200);
  const fh = await p.evaluate(() => { const r = document.querySelector("#ws td.fh").getBoundingClientRect(); return [r.right - 3, r.bottom - 3]; }), wb = await p.locator("#ws").boundingBox();
  await p.mouse.move(fh[0], fh[1]); await p.mouse.down(); await p.mouse.move(fh[0], wb.y + wb.height + 30, { steps: 8 }); await p.waitForTimeout(1500); await p.mouse.up(); await p.waitForTimeout(700);
  const f = await p.evaluate(() => { const d = sheetCols(curSheet())[2].data; let n = 0; while (d[n] != null) n++; return [n, d.slice(0, n).every((v, i) => v === i + 1), Math.floor($("#ws").clientHeight / (S.ws.rowH || 22))]; });
  check("the fill handle held past the grid's bottom goes on filling, the grid scrolling, while the pointer is still", f[0] > f[2] + 5 && f[1], JSON.stringify(f));
  // A range dragged past the bottom grows as the grid scrolls.
  await p.evaluate(() => { $("#ws").scrollTop = 0; }); await p.waitForTimeout(300);
  const c0 = await p.locator('#ws td[data-r="1"][data-ci="0"]').boundingBox();
  await p.mouse.move(c0.x + 10, c0.y + 6); await p.mouse.down(); await p.mouse.move(c0.x + 10, wb.y + wb.height + 40, { steps: 8 }); await p.waitForTimeout(1000); await p.mouse.up(); await p.waitForTimeout(200);
  const sr = await p.evaluate(() => { const r = wsSelRect(); return [r.r0, r.r1, r.c0, r.c1]; });
  check("a range dragged past the grid's bottom grows as the grid scrolls", sr[0] === 1 && sr[1] > f[2] + 5 && sr[2] === 0 && sr[3] === 0, JSON.stringify(sr));
}, { name: "drags past the edge" });
await page(async (p, ctx) => {
  await p.evaluate(() => loadExample("decay")); await p.waitForTimeout(1200);
  const q = await ctx.newPage(); await q.goto(URL); await ready(q); await q.evaluate(id => switchProject(id), await p.evaluate(() => S.pid)); await q.waitForTimeout(500);
  const rename = (t, nm) => t.evaluate(nm => { pushUndo("rename"); save({ graphs: P().graphs.map((g, i) => i ? g : Object.assign({}, g, { name: nm })) }, "renamed"); }, nm);
  const note = (t, id) => t.evaluate(id => { pushUndo("a note"); save({ annos: (P().annos || []).concat([{ id, t: "text", g: P().graphs[0].id, x: 1, y: 1, text: id }]) }, "a note"); }, id);
  const st = t => t.evaluate(() => [P().graphs[0].name, (P().annos || []).map(a => a.id).filter(i => /^n/.test(i)).sort().join(",")]);
  // An undo put back every part of the project as this tab had it, taking back another tab's newer graph name.
  await note(p, "nA"); await p.waitForTimeout(800); await rename(q, "Renamed in B"); await q.waitForTimeout(800);
  await p.evaluate(() => undo()); await p.waitForTimeout(1000);
  const a = await st(p);
  check("an undo takes back this tab's annotation and keeps the other tab's newer graph name", a[0] === "Renamed in B" && a[1] === "", JSON.stringify(a));
  await rename(p, "Named in A"); await p.waitForTimeout(800); await note(q, "nB"); await q.waitForTimeout(800);
  await p.evaluate(() => undo()); await p.waitForTimeout(1000);
  const b = await st(p), b2 = await st(q);
  check("…and this tab's graph name, keeping the other tab's newer annotation, in both tabs", b[0] === "Renamed in B" && b[1] === "nB" && JSON.stringify(b) === JSON.stringify(b2), JSON.stringify([b, b2]));
  // Both tabs on the same graph's name: the undo leaves the other tab's newer one.
  await rename(p, "A again"); await p.waitForTimeout(800); await rename(q, "B again"); await q.waitForTimeout(800);
  await p.evaluate(() => undo()); await p.waitForTimeout(1000);
  check("…and leaves the other tab's newer change to the same graph", (await st(p))[0] === "B again", JSON.stringify(await st(p)));
}, { name: "an undo beside another tab" });

console.log("11.11: the graph's Original/Processed switch, a cramped parameter table, curves hard to hide, a new graph for a step, subtraction and calibration, the Explorer's files");
await page(async p => {
  // Three columns of one file, one with an error column, so the old file row would have said 4 and listed 3.
  const t = "Wavelength,A,A err,B,C\n" + Array.from({ length: 60 }, (_, i) => `${400 + i},${(5 + Math.sin(i / 4)).toFixed(4)},0.1,${(3 + Math.cos(i / 6)).toFixed(4)},${(2 + i / 30).toFixed(4)}`).join("\n");
  await viaDialog(p, "three.csv", t);
  await p.evaluate(() => { toggleXpl(true); renderAll(); }); await p.waitForTimeout(400);
  const x = await p.evaluate(() => [...document.querySelectorAll("#xplTree .xr")].map(r => [r.dataset.xk, r.title || ""]));
  check("the Explorer lists the sheet, and no file of columns beside it", x.some(r => /^ws:/.test(r[0])) && !x.some(r => /^(f|c):/.test(r[0])), JSON.stringify(x));
  const tip = await p.evaluate(() => { const s = sheetList()[0]; return xRows().find(r => r.key === "ws:" + s.id).tip; });
  const nv = await p.evaluate(() => sheetCols(sheetList()[0].id).filter(hasVals).length);
  check("…its count is the columns the sheet shows with values", new RegExp(`: ${nv} columns with values`).test(tip) && nv === 5, tip + " / " + nv);
  // Plot two, then a step: the graph shows the processed data, with no Original/Processed/Both switch to get lost in.
  await p.evaluate(() => { const ys = yCols().filter(c => !/err/.test(c.name)).slice(0, 2).map(c => c.id); plotCols(ys); }); await p.waitForTimeout(500);
  check("the graph has no Original / Processed / Both switch", await p.evaluate(() => !document.getElementById("viewSeg") && !menuItems("plot").some(i => i && /Show on the graph/.test(i.label || ""))));
  await p.evaluate(() => { openTool("smooth"); }); await p.waitForTimeout(400);
  await p.evaluate(() => { toolDest("here"); applyTool(); }); await p.waitForTimeout(500);
  const st = await p.evaluate(() => [S.stage, S.cmp, activeYCol().pipe.length, finalOf(activeYCol()).y.length]);
  check("a step applied: the graph shows the processed data", st[0] == null && !st[1] && st[2] === 1 && st[3] === 60, JSON.stringify(st));
  await p.evaluate(() => { setStage(0); renderStages(); }); await p.waitForTimeout(200);
  const chip = await p.evaluate(() => { const b = document.querySelector("#stageChip button, .stchip button, [data-stclear]"); return b ? (b.click(), true) : false; }); await p.waitForTimeout(200);
  check("the chip naming an earlier stage takes the graph back to the processed data", chip && (await p.evaluate(() => S.stage == null)), JSON.stringify(await p.evaluate(() => [S.stage, document.querySelector("#gRibbon") && document.querySelector("#gRibbon").innerText.slice(0, 200)])));
  // Curves: hide, show alone, show every, from the graph's bar.
  check("the graph's bar has Curves", await p.evaluate(() => !!document.querySelector('#gRibbon [data-rmenu="curves"]')));
  const ids = await p.evaluate(() => graphOf(S.gid).cols.slice());
  const drawn = () => p.evaluate(() => [...document.querySelectorAll("#plot g[data-ser]")].map(g => g.getAttribute("data-ser")).filter(s => !/^__/.test(s)));
  await p.evaluate(() => { const b = document.querySelector('#gRibbon [data-rmenu="curves"]'); b.click(); }); await p.waitForTimeout(200);
  const mi = await p.evaluate(() => [...document.querySelectorAll(".menu [role^=menuitem]")].map(e => e.innerText.trim()));
  await p.keyboard.press("Escape");
  check("…listing each curve, Show only… and Show every curve", mi.length >= 4 && mi.some(s => /Show only/.test(s)), JSON.stringify(mi));
  const other = ids.find(i => i !== ids[0]);
  await p.evaluate(id => hideCurve(S.gid, id, true), other); await p.waitForTimeout(300);
  check("a curve hidden is not drawn and stays on the graph", !(await drawn()).includes(other) && (await p.evaluate(id => graphOf(S.gid).cols.includes(id), other)), JSON.stringify(await drawn()));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("…and an undo shows it again", (await drawn()).includes(other), JSON.stringify(await drawn()));
  const act = await p.evaluate(() => P().activeY);
  await p.evaluate(id => hideCurve(S.gid, id, true), act); await p.waitForTimeout(300);
  const a2 = await p.evaluate(() => [P().activeY, S.gid]);
  check("hiding the active curve makes the shown one active, on the same graph", a2[0] !== act && (await drawn()).length === 1, JSON.stringify([act, a2, await drawn()]));
  const refused = await p.evaluate(() => { const id = P().activeY; return setHiddenCurves(S.gid, graphOf(S.gid).cols.slice(), "hid every curve"); });
  check("the last curve shown cannot be hidden", refused === false && (await drawn()).length === 1);
  await p.evaluate(id => onlyCurve(S.gid, id), act); await p.waitForTimeout(300);
  check("Show only this curve", JSON.stringify(await drawn()) === JSON.stringify([act]), JSON.stringify(await drawn()));
  await p.evaluate(() => showAllCurves(S.gid)); await p.waitForTimeout(300);
  check("Show every curve", (await drawn()).length === ids.length, JSON.stringify(await drawn()));
  const cm = await p.evaluate(id => graphMenuItems(id).map(i => i && i.label).filter(Boolean), other);
  check("a curve's right-click has Hide, Show only and Take it off", cm.includes("Hide this curve") && cm.includes("Show only this curve") && cm.some(l => /Take it off/.test(l)), JSON.stringify(cm));
  // A step onto a new graph: a new column, the original unchanged, one undo.
  const before = await p.evaluate(() => [P().graphs.length, allCols().length, activeYCol().id, activeYCol().pipe.length]);
  await p.evaluate(() => { openTool("deriv"); }); await p.waitForTimeout(400);
  const seg = await p.evaluate(() => [...document.querySelectorAll("#w-tool [data-tldest]")].map(b => b.innerText.trim()));
  check("the tool asks where to show it: This graph or A new graph", seg.join("|") === "This graph|A new graph", JSON.stringify(seg));
  await p.evaluate(() => document.querySelector('#w-tool [data-tldest="new"]').click()); await p.waitForTimeout(200);
  await p.evaluate(() => applyTool()); await p.waitForTimeout(700);
  const after = await p.evaluate(b => { const src = colById(b[2]), n = activeYCol(); return [P().graphs.length, allCols().length, src.pipe.length, n.src === b[2], n.pipe.length, n.pipe[0].op, graphOf(S.gid).cols.join(), n.id, /d\(/.test(finalOf(n).yn || "")]; }, before);
  check("a step shown on a new graph: a new column from this one, on a graph of its own, this one untouched", after[0] === before[0] + 1 && after[1] === before[1] + 1 && after[2] === before[3] && after[3] && after[4] === 1 && after[5] === "deriv" && after[6] === after[7] && after[8], JSON.stringify([before, after]));
  await p.evaluate(() => undo()); await p.waitForTimeout(500);
  check("…and one undo takes back the column and the graph", JSON.stringify(await p.evaluate(() => [P().graphs.length, allCols().length])) === JSON.stringify(before.slice(0, 2)));
  await p.evaluate(() => toolDest("here"));
  // Subtracting another column at the scale that cancels it; a data column can be the reference.
  const sub = await p.evaluate(() => { const c = yCols().find(q => q.name === "C"); setColRole(c.id, "ignore"); const a = yCols().find(q => q.name === "A");
    setActiveCol(a.id); openTool("ref", { p: { op: "sub", ref: c.id, use: "raw", fit: "fit" } }); return [...document.querySelectorAll('#w-tool select[data-pk="ref"] option')].map(o => o.textContent); });
  await p.waitForTimeout(400);
  check("the column to subtract can be a data column, not plotted", sub.some(s => /C$/.test(s)), JSON.stringify(sub));
  const sf = await p.evaluate(() => [...document.querySelectorAll('#w-tool [data-pk]')].map(e => e.dataset.pk));
  check("Fitted shows the range it is fitted over, not Scaled by", sf.includes("x0") && sf.includes("x1") && !sf.includes("k"), JSON.stringify(sf));
  await p.evaluate(() => applyTool()); await p.waitForTimeout(500);
  const sn = await p.evaluate(() => { const s = activeYCol().pipe.find(q => q.op === "ref"); return s ? [s.op, stageOfStep(s).note || ""] : activeYCol().pipe.map(q => q.op); });
  check("the fitted scale is said in the step", sn[0] === "ref" && /scaled by .*fitted over 60 points/.test(sn[1]), JSON.stringify(sn));
  // Data › Calibrate.
  const cal = await p.evaluate(() => { const it = menuItems("data").find(i => i && i.label === "Calibrate"); return it ? (typeof it.sub === "function" ? it.sub() : it.sub).map(i => i.label) : null; });
  check("Data › Calibrate: X on reference peaks, lined up with another column (25.11), energy, scale X, Y by a reference", cal && cal.length === 5 && /reference/.test(cal[4]) && cal[1] === "Line up with another column…", JSON.stringify(cal));
  // Results: three columns, no time, no cramped second lines, no red rows.
  await p.evaluate(async () => { await loadExample("decay"); }); await p.waitForTimeout(800);
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); chooseModel("expdec"); }); await p.waitForTimeout(250);
  await p.evaluate(() => runFit()); await p.waitForTimeout(500);
  await p.evaluate(() => { openWin("res", { render: true }); focusWin("res"); }); await p.waitForTimeout(400);
  const rs = await p.evaluate(() => { const b = document.querySelector("#w-res"); const t0 = b.querySelector(".rtabw .rtab"); return [t0 ? t0.querySelectorAll("thead th").length : -1, b.querySelectorAll("tr.rmore,tr.badrow,.rhi.bad").length, !!b.querySelector("#fitBy"), b.innerText]; });
  check("Results' parameter table: name, value and error alone, no second lines, nothing red", rs[0] === 3 && rs[1] === 0, JSON.stringify(rs.slice(0, 3)));
  check("…no time of the fit and no counts nobody asked for", !rs[2] && !/Free parameters|AIC|BIC|Residual sum of squares|\b\d{1,2}:\d{2}\b/.test(rs[3]), rs[3].slice(0, 600));
  check("…and no 't · Prob > |t| · 95% · dependency' lines", !/Prob > \|t\|/.test(rs[3]) && !/ · dependency/.test(rs[3]), rs[3].slice(0, 600));
  const ord = await p.evaluate(() => { const g = document.querySelector("#w-res .rgrid"), y = s => { const e = g.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; }; return [y(".rmain"), y(".rside"), y(".rrest"), /Fitted over/.test(g.innerText)]; });
  check("…in the dock the statistics come straight after the table, and a range of all the data is not said", ord[0] < ord[1] && ord[1] < ord[2] && !ord[3], JSON.stringify(ord));
  await p.evaluate(() => { openTool("smooth"); }); await p.waitForTimeout(400);
  const chipT = await p.evaluate(() => document.querySelector("#stageChip").innerText.trim());
  await p.evaluate(() => cancelTool());
  check("the stage chip says a preview in two words", chipT === "Preview: Smooth", chipT);
}, { name: "11.11", timeout: 120000 });

console.log("19.11: =9 in the F(x)= row of an empty sheet gave no values; a radius from 280 down to 50 zigzagged as a line");
// The path of a curve's line on the graph: its runs, and how often a run's X turns back.
const lineOf = (p, id) => p.evaluate(i => { const e = document.querySelector(`#plot g[data-ser="${i}"] path[stroke-linejoin]`); return e ? e.getAttribute("d") : ""; }, id);
const runsOf = d => d.split("M").filter(Boolean).map(sub => [...("M" + sub).matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]));
const turns = d => runsOf(d).reduce((r, xy) => { let dir = 0; for (let k = 1; k < xy.length; k++) { const dd = Math.sign(xy[k][0] - xy[k - 1][0]); if (dd && dir && dd !== dir) r++; if (dd) dir = dd; } return r; }, 0);
await page(async p => {
  // As the user did: a new project, 9 typed into column B's F(x)= cell.
  const at = await p.evaluate(() => { const r = [...document.querySelectorAll("#ws tr")].find(tr => /F\(x\)=/.test(tr.textContent)); const b = r.querySelectorAll("td")[1].getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  await p.mouse.click(at[0], at[1]); await p.waitForTimeout(150);
  await p.keyboard.type("9"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  const r1 = await p.evaluate(() => { const c = P().cols.find(c => c.fx); return { n: c ? c.data.length : 0, all: c ? c.data.every(v => v === 9) : false, shown: [...document.querySelectorAll("#ws tbody td")].filter(td => td.textContent.trim() === "9").length, toast: (document.querySelector(".toast") || {}).textContent || "" }; });
  check("=9 on an empty sheet: 32 values of 9, as a new Origin sheet has rows", r1.n === 32 && r1.all, JSON.stringify(r1));
  check("…shown in the cells", r1.shown >= 20, r1.shown);
  check("…and the toast says why 32", /32 rows until/.test(r1.toast), r1.toast);
  // Values typed into column A: the formula takes the sheet's rows.
  await p.evaluate(() => { wsSelect(0, 0, false); }); await p.waitForTimeout(100);
  for (const v of ["1", "2", "3", "4", "5"]) { await p.keyboard.type(v); await p.keyboard.press("Enter"); await p.waitForTimeout(60); }
  await p.waitForTimeout(900);
  check("…values typed into column A: B takes the sheet's 5 rows", await p.evaluate(() => P().cols.find(c => c.fx).data.length) === 5);
  // A column of names alone: its text rows count as the sheet's rows.
  const nm = await p.evaluate(() => { const p = P(), a = p.cols.find(c => c.role === "x"); a.data = []; a.txt = Object.fromEntries("abcdefghij".split("").map((c, i) => [i, c])); a.fmt = "text"; save({ cols: p.cols }, "names"); renderAll(); return P().cols.find(c => c.fx).data.length; });
  check("…a sheet of ten names: B = 9 has ten rows", nm === 10, nm);
  await p.reload(); await ready(p);
  check("…after a reload", await p.evaluate(() => { const c = P().cols.find(c => c.fx); return c && c.data.length === 10 && c.data.every(v => v === 9); }));

  // A radius read from 280 down to 50 with jitter in its positions, as the user's measurement.
  let s0 = 3; const rnd = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647 - 0.5; };
  let t = "Radius (mm)\tB (mT)\n"; for (let r = 280; r >= 50; r -= 1) { const rr = r + 3 * rnd(); t += rr.toFixed(2) + "\t" + (100 * Math.exp(-(((rr - 150) / 18) ** 2)) + 20).toFixed(3) + "\n"; }
  await viaDialog(p, "radial.txt", t);
  const roles = await p.evaluate(() => sheetCols(curSheet()).map(c => c.role + ":" + c.name).join(","));
  check("the jittered radius comes in as X, B against it", roles === "x:Radius,y:B", roles);
  const bid = await p.evaluate(() => { const c = sheetCols(curSheet()).find(c => c.name === "B"); plotCols([c.id], { type: "line" }); return c.id; }); await p.waitForTimeout(600);
  let d = await lineOf(p, bid);
  check("…drawn as a line through every point with no step back (in the order of X)", turns(d) === 0 && runsOf(d)[0].length === 231, `${turns(d)} turns, ${runsOf(d).map(r => r.length)}`);
  await p.evaluate(i => setSeriesStyle(i, { lord: "data" }, "as recorded"), bid); await p.waitForTimeout(300);
  d = await lineOf(p, bid);
  check("…In the order recorded gives the zigzags back", turns(d) > 20, turns(d));
  await p.evaluate(i => setSeriesStyle(i, { lord: "x" }, "by X"), bid); await p.waitForTimeout(300);
  check("…In the order of X: none", turns(await lineOf(p, bid)) === 0);
  await p.evaluate(i => setSeriesStyle(i, { lord: "auto" }, "auto"), bid); await p.waitForTimeout(300);
  const menu = await p.evaluate(i => { const it = graphMenuItems(i).find(q => q && q.label === "Join the points"); return it ? it.sub().map(q => q.label + (q.checked ? "*" : "")).join("|") : ""; }, bid);
  check("…the curve's right-click has Join the points, Automatic chosen", menu === "Automatic*|In the order recorded|In the order of X", menu);
  await p.evaluate(i => { openPlotDetails(i, "series"); }, bid); await p.waitForTimeout(400);
  check("…and the Format pane its Order", await p.evaluate(() => { const e = document.getElementById("pdLord"); return !!e && e.value === "auto"; }));
  await p.evaluate(() => closeWin("format"));
  // Masked points: left out, the rest still in the order of X.
  await p.evaluate(i => { const p = P(), c = colById(i); c.mask = [10, 11, 12, 100]; save({ cols: p.cols }, "masked"); renderAll(); }, bid); await p.waitForTimeout(300);
  d = await lineOf(p, bid);
  check("…with four points masked: 227 joined, no step back", turns(d) === 0 && runsOf(d)[0].length === 227, `${turns(d)} ${runsOf(d).map(r => r.length)}`);
  // An export draws it the same way.
  const svg = await p.evaluate(async () => { let out = ""; const keep = window.saveFile; window.saveFile = async (n, data) => { out = typeof data === "string" ? data : await data.text(); return true; }; try { await exportSvg(); } finally { window.saveFile = keep; } return out; });
  const ed = (svg.match(new RegExp(`data-ser="${bid}"[^>]*>[\\s\\S]*?<path d="([^"]+)"[^>]*stroke-linejoin`)) || [])[1] || "";
  check("…an SVG export joins them in the order of X too", ed && turns(ed) === 0, ed.slice(0, 80));

  // 9000 jittered points: drawn per pixel column, still no step back.
  let big = "Radius (mm)\tB (mT)\n"; for (let i = 0; i < 9000; i++) { const r = 280 - i * 0.0255 + 0.08 * rnd(); big += r.toFixed(4) + "\t" + (100 * Math.exp(-(((r - 150) / 18) ** 2)) + 20).toFixed(3) + "\n"; }
  await viaDialog(p, "radial-big.txt", big);
  const b2 = await p.evaluate(() => { const c = sheetCols(curSheet()).find(c => c.name === "B"); plotCols([c.id], { type: "line" }); return c.id; }); await p.waitForTimeout(700);
  d = await lineOf(p, b2);
  check("9000 jittered points, drawn per pixel column: no step back", turns(d) === 0 && runsOf(d).length === 1, `${turns(d)} turns, ${runsOf(d).length} runs`);

  // An angle from 280° through 360° to 50°: no line back across the graph, each run on its own.
  let a = "Angle (deg)\tIntensity\n"; for (let u = 280; u <= 410; u += 0.5) a += (u % 360) + "\t" + (50 + 30 * Math.cos((u - 345) * Math.PI / 60)).toFixed(3) + "\n";
  await viaDialog(p, "angle.txt", a);
  const ai = await p.evaluate(() => { const c = sheetCols(curSheet()).find(c => c.name === "Intensity"); plotCols([c.id], { type: "line" }); return c.id; }); await p.waitForTimeout(600);
  d = await lineOf(p, ai); const pw = await p.evaluate(() => S.geo.pw);
  const longest = Math.max(...runsOf(d).map(xy => Math.max(0, ...xy.slice(1).map((q, k) => Math.abs(q[0] - xy[k][0])))));
  check("an angle past 360°: two runs, no line back across the graph", runsOf(d).length === 2 && longest < pw * 0.05, `${runsOf(d).length} runs, longest step ${longest} of ${pw}`);
  // A hysteresis loop: as recorded, round the loop.
  let lp = "H (A/m)\tM\n"; for (let k = 0; k <= 200; k++) { const h = 100 * Math.cos(k * Math.PI / 100); lp += h.toFixed(3) + "\t" + Math.tanh((h + (k < 100 ? -20 : 20)) / 20).toFixed(4) + "\n"; }
  await viaDialog(p, "loop.txt", lp);
  const li = await p.evaluate(() => { const cs = sheetCols(curSheet()), h = cs.find(c => c.name === "H"), m = cs.find(c => c.name === "M"); setColRole(h.id, "x"); plotCols([m.id], { type: "line" }); return m.id; }); await p.waitForTimeout(600);
  d = await lineOf(p, li);
  check("a hysteresis loop is joined as recorded: one run, round the loop", runsOf(d).length === 1 && turns(d) === 1 && runsOf(d)[0].length === 201, `${runsOf(d).length} runs, ${turns(d)} turns`);
  // 2θ and φ name an axis (they never did: \b after a Greek letter never matched).
  const r2 = await p.evaluate(() => [analyzeFile("I\t2θ (deg)\n" + Array.from({ length: 30 }, (_, i) => `${(Math.sin(i) + 2).toFixed(3)}\t${(10 + i * 0.5 + (i % 3 ? 0.9 : -0.9)).toFixed(2)}`).join("\n")).roles.join(), analyzeFile("I\tφ\n2\t3\n1\t1\n3\t2\n1\t5\n").roles.join()]);
  check("2θ and φ name an axis", r2[0] === "y,x" && r2[1] === "y,x", JSON.stringify(r2));
}, { name: "19.11", timeout: 150000 });

console.log("25.11: a column moved left froze the worksheet, none moved right into empty columns; the Original/Processed bar back; linked zoom a preference; steps on a graph's curves; spectra lined up on all their peaks");
await page(async p => {
  const csv3 = (n, k) => "Wavelength,A,B,C\n" + Array.from({ length: n }, (_, i) => `${400 + i},${i * k},${i + k},${i * 2}`).join("\n");
  await viaDialog(p, "one.csv", csv3(20, 1)); await viaDialog(p, "two.csv", csv3(20, 3));
  const cols = () => p.evaluate(() => sheetCols().map(c => `${colLetter(c)}:${c.name || "—"}`).join(" "));
  const other = () => p.evaluate(() => sheetCols(sheetList()[0].id).map(c => `${colLetter(c)}:${c.name || "—"}`).join(" "));
  const before = await other();
  const r = await p.evaluate(() => { try { wsMoveCols([sheetCols()[2].id], -1); return "ok"; } catch (e) { return e.message; } });
  check("a column between two moved left on the second sheet: the move made, every sheet's list whole", r === "ok" && (await cols()) === "A:Wavelength B:B C:A D:C" && await p.evaluate(() => P().cols.every(Boolean)), r + " " + await cols());
  check("…and the first sheet's columns untouched", (await other()) === before, await other());
  await p.evaluate(() => { wsMoveCols([sheetCols()[3].id], 1); });
  check("the last column moved right goes into the empty column past it (an empty one in its place)", (await cols()) === "A:Wavelength B:B C:A D:— E:C", await cols());
  // A letter dragged into the empty columns, two past the last.
  const th = L => p.evaluate(L => { const t = [...document.querySelectorAll("#ws th[data-ch]")].find(t => t.textContent.trim().startsWith(L)); const b = t.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, L);
  await p.evaluate(() => { wsFront(); }); await p.waitForTimeout(250);
  const [x, y, w, h] = await th("B"); await p.mouse.click(x + w / 2, y + h / 2); await p.waitForTimeout(150);
  const g = await th("G"); await p.mouse.move(x + w / 2, y + h / 2); await p.mouse.down(); await p.mouse.move(x + w / 2 + 20, y + h / 2, { steps: 3 }); await p.mouse.move(g[0] + 3, y + h / 2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
  check("column B dragged to the line between F and G lands at F", (await cols()) === "A:Wavelength B:A C:— D:C E:— F:B", await cols());
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo takes the drag back", (await cols()) === "A:Wavelength B:B C:A D:— E:C", await cols());
  // No Original / Processed switch on the bar; a column's processed values when asked for, with a chip back.
  await p.evaluate(() => { setActiveCol(sheetCols()[1].id); openTool("smooth"); }); await p.waitForTimeout(300); await p.evaluate(() => { toolDest("here"); applyTool(); }); await p.waitForTimeout(400);
  const sw = await p.evaluate(() => ({ seg: !$("#wsSheet").hidden || !!$("#wsSheet").offsetParent, chip: $("#wsStage").hidden }));
  check("with a processing step, no Original / Processed switch on the worksheet's bar", !sw.seg && sw.chip, JSON.stringify(sw));
  const it = await p.evaluate(() => { const c = activeYCol(), m = colMenuItems(c.id).find(i => i && i.label === "Show its processed values"); if (!m) return null; m.run(); return [S.sheet, $("#wsStage").hidden, $("#wsStage").textContent]; });
  check("the column's menu shows its processed values, a chip saying whose", it && it[0] === "final" && !it[1] && /Processed: /.test(it[2]), JSON.stringify(it));
  await p.click("#wsStage [data-wsraw]"); await p.waitForTimeout(250);
  check("…and the chip's ✕ goes back to the original data", await p.evaluate(() => S.sheet === "raw" && $("#wsStage").hidden));
  // Linked zoom: a switch in Preferences, off by default.
  await p.evaluate(() => openPrefs()); await p.waitForTimeout(250);
  const lk = await p.evaluate(() => { const i = $("#prLinkX"); return i ? i.checked : null; });
  check("Preferences has Link the X zoom of graphs, off by default", lk === false, lk);
  await p.click("label:has(#prLinkX)"); await p.waitForTimeout(150);
  check("…ticked, the graphs' X zoom is linked and kept", await p.evaluate(() => S.linkX === true && localStorage.getItem("kurve.linkX") === "1"));
  await p.evaluate(() => { $("#prefDone").click(); setLinkX(false); });
}, { name: "25.11 columns, the bar, Preferences", timeout: 120000 });
await page(async p => {
  const bands = [[300, 40, 6], [420, 100, 8], [520.7, 200, 4], [640, 70, 10], [780, 120, 7], [900, 50, 9], [1001, 90, 5], [1100, 60, 12]];
  const yv = (sh, i) => { const v = 200 + i, t = v + sh; let s = 20 + 0.01 * v; bands.forEach(([c, a, w]) => { s += a * Math.exp(-0.5 * (((t - c) / (w / 2.3548)) ** 2)); }); return (s + Math.sin(i * 7.1) * 1.5).toFixed(3); };
  const csv = "Raman shift (cm-1),A,B,C\n" + Array.from({ length: 1001 }, (_, i) => `${200 + i},${yv(0, i)},${yv(1.37, i)},${yv(-0.8, i)}`).join("\n");
  await viaDialog(p, "three.csv", csv);
  await p.evaluate(() => { plotCols(yCols().map(c => c.id)); }); await p.waitForTimeout(500);
  // A step on the graph's curves at once.
  await p.evaluate(() => { toolScope("graph"); toolDest("here"); setActiveCol(yCols()[0].id); openTool("norm"); }); await p.waitForTimeout(350);
  const seg = await p.evaluate(() => [...document.querySelectorAll("[data-tlall]")].map(b => b.textContent + (b.getAttribute("aria-checked") === "true" ? "*" : "")));
  check("the Tool window's Apply to: this column, this graph's curves, every column", seg.join("|") === "This column|This graph's 3 curves*|Every column (3)", seg.join("|"));
  await p.click("#tlOk"); await p.waitForTimeout(400);
  check("…a step for the graph's curves goes on each of them, one undo", await p.evaluate(() => yCols().every(c => (c.pipe || []).some(s => s.op === "norm"))));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  await p.evaluate(() => { toolScope("graph"); toolDest("new"); openTool("smooth"); }); await p.waitForTimeout(350);
  await p.click("#tlOk"); await p.waitForTimeout(600);
  const ng = await p.evaluate(() => P().graphs.map(g => g.cols.map(id => specName(colById(id))).join(",")));
  check("on a new graph: a new column from each curve, together on one graph, the curves untouched", ng.length === 2 && ng[1] === "A, smooth,B, smooth,C, smooth" && await p.evaluate(() => yCols().filter(c => !c.src).every(c => !(c.pipe || []).length)), JSON.stringify(ng));
  await p.evaluate(() => undo()); await p.waitForTimeout(300); await p.evaluate(() => toolScope("col"));
  // Lined up with another column on every shared peak, from Data › Calibrate.
  await p.evaluate(() => { toolDest("here"); setActiveCol(yCols()[1].id); const it = menuItems("data").find(i => i && i.label === "Calibrate").sub().find(i => i && i.label === "Line up with another column…"); it.run(); }); await p.waitForTimeout(400);
  const pr = await p.evaluate(() => ({ mode: S.pending.step.p.mode, col: specName(colById(S.pending.step.p.col)), rows: [...document.querySelectorAll("#pane-tool table.ptab tbody tr")].length }));
  check("Line up with another column… opens on a column of the same graph, its shared peaks listed", pr.mode === "col" && pr.col === "A" && pr.rows === 8, JSON.stringify(pr));
  await p.click("#tlOk"); await p.waitForTimeout(400);
  const sh = await p.evaluate(() => finalOf(yCols()[1]).x[0] - 200);
  check("B lined up with A on its 8 peaks: shifted by 1.37 within 0.02", Math.abs(sh - 1.37) < 0.02, sh);
  const nt = await p.evaluate(() => { const r = pipeOf(yCols()[1]); return r.stages[1].note; });
  check("its note: the pairs, the shift with its error, the residuals", /8 shared peaks/.test(nt) && /±/.test(nt), nt);
  // A known position, centred by a fit (a new step) or by three points (a step from before keeps them).
  const k = await p.evaluate(() => { setActiveCol(yCols()[2].id); openTool("calib"); const c = S.pending.step.p.centre; applyTool({ here: true }); return [c, finalOf(yCols()[2]).x[0] - 200]; }); await p.waitForTimeout(300);
  check("a new reference step centres by a fit, and puts C's silicon peak right (−0.8 within 0.05)", k[0] === "fit" && Math.abs(k[1] + 0.8) < 0.05, JSON.stringify(k));
}, { name: "25.11 graphs' curves and lining up", timeout: 120000 });

await page(async p => {
  const csv = k => "X,A,B\n" + Array.from({ length: 60 }, (_, i) => `${i},${(Math.sin(i / 5) * k + 5).toFixed(4)},${(Math.cos(i / 5) * k + 5).toFixed(4)}`).join("\n");
  for (const n of ["one", "two", "three"]) await viaDialog(p, n + ".csv", csv(n.length));
  await p.evaluate(() => { sheetList().forEach(s => plotCols(sheetCols(s.id).filter(c => c.role === "y").map(c => c.id))); if (!xplShown()) toggleXpl(true); }); await p.waitForTimeout(500);
  const sel = () => p.evaluate(() => [...document.querySelectorAll("#xplTree .xr")].filter(e => e.getAttribute("aria-selected") === "true").map(e => e.querySelector(".xn").textContent));
  const row = t => p.locator("#xplTree .xr", { has: p.locator(".xn", { hasText: new RegExp("^" + t + "$") }) }).first();
  await row("Graph 1").click(); await row("Graph 3").click({ modifiers: ["Shift"] }); await p.waitForTimeout(150);
  check("Shift+click selects the graphs between", (await sel()).join(",") === "Graph 1,Graph 2,Graph 3", (await sel()).join(","));
  await row("Graph 2").click({ modifiers: ["Control"] }); await p.waitForTimeout(150);
  check("Ctrl+click takes one out", (await sel()).join(",") === "Graph 1,Graph 3", (await sel()).join(","));
  await row("Graph 1").click({ button: "right" }); await p.waitForTimeout(200);
  const mi = await p.evaluate(() => [...document.querySelectorAll(".menu [role=menuitem]")].map(e => e.textContent.trim()));
  check("their right-click: one menu for the two, combine, a figure, export, plot, process, move, delete", ["Combine into one graph", "As the panels of a figure", "Export as one picture", "Process their columns", "Move to"].every(t => mi.includes(t)) && mi.some(t => /^Delete them/.test(t)), mi.join(" | "));
  await p.keyboard.press("Escape");
  await p.evaluate(() => { xMultiMenu(xSelRows()).find(i => i && i.label === "Combine into one graph").run(); }); await p.waitForTimeout(500);
  check("Combine into one graph: their four curves on one graph", JSON.stringify(await p.evaluate(() => P().graphs.map(g => g.cols.length))) === "[2,4]", await p.evaluate(() => JSON.stringify(P().graphs.map(g => g.cols.length))));
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  await row("Sheet 1").click(); await row("three").click({ modifiers: ["Shift"] }); await p.waitForTimeout(150);
  await p.evaluate(() => { const pr = xMultiMenu(xSelRows()).find(i => i && /^Process/.test(i.label)); pr.sub().flatMap(i => i.sub ? i.sub : [i]).find(i => i.op === "norm").run(); }); await p.waitForTimeout(400);
  const seg = await p.evaluate(() => [...document.querySelectorAll("[data-tlall]")].map(b => b.textContent + (b.getAttribute("aria-checked") === "true" ? "*" : "")).join("|"));
  check("Process their columns: the Tool window applies to the 6 chosen", /The 6 chosen\*/.test(seg), seg);
  await p.evaluate(() => { toolDest("here"); applyTool(); }); await p.waitForTimeout(400);
  check("…a step on each of the three sheets' columns, one undo", await p.evaluate(() => yCols().every(c => (c.pipe || []).some(s => s.op === "norm"))) && await p.evaluate(() => { undo(); return yCols().every(c => !(c.pipe || []).length); }));
  await p.waitForTimeout(300);
  await row("Graph 1").click(); await row("Graph 3").click({ modifiers: ["Shift"] }); await row("Graph 2").press("Delete"); await p.waitForTimeout(500);
  check("Delete on three graphs selected: all go", await p.evaluate(() => P().graphs.length) === 0);
  await p.evaluate(() => undo()); await p.waitForTimeout(400);
  check("…one undo brings the three back", await p.evaluate(() => P().graphs.length) === 3);
  await row("two").click(); await row("three").click({ modifiers: ["Shift"] }); await p.evaluate(() => { xDeleteMany(xSelRows()); }); await p.waitForTimeout(400);
  const dlg = await p.evaluate(() => (document.querySelector(".modal:not([hidden])") || {}).innerText || "");
  check("deleting two sheets with values asks once", /Delete 2 sheets\?/.test(dlg) && /360 values/.test(dlg), dlg.slice(0, 160));
  await p.click(".modal:not([hidden]) .btn.danger, .modal:not([hidden]) button:has-text('Delete them')"); await p.waitForTimeout(500);
  check("…and both go, in one undo step", JSON.stringify(await p.evaluate(() => sheetList().map(s => s.name))) === '["Sheet 1"]' && JSON.stringify(await p.evaluate(() => { undo(); return sheetList().map(s => s.name); })) === '["Sheet 1","two","three"]', await p.evaluate(() => sheetList().map(s => s.name).join(",")));
}, { name: "25.11 several selected", vw: { width: 1700, height: 950 }, timeout: 120000 });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
