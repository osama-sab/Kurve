/* A working day of erratic use, through the real pointer and keys at a person's pace: typing
   numbers, junk and long text into cells and fields, sizing columns and rows, zooming and panning,
   every pointer tool on the graph, wandering the menu bar, the graph's menus and right-click menus
   to any item, dialogs answered at random, windows dragged, resized, maximised and minimised, the
   taskbar and the dock, undo and redo in bursts, Find a command, examples and new projects, files
   imported, screen sizes, the theme, and coffee breaks. Every 30 s it writes memory, page elements,
   listeners, lag, long tasks, storage and the status to a CSV; at the end it reloads and compares
   every project. Page errors, a page that stops answering (lag over 1.5 s), an action with no
   answer in 90 s and a reload that loses anything are failures.
   Usage: node tools/lab-day.mjs [kurve.html] [minutes, 40] [seed, 5]
   OUT=dir puts the trail and the CSV there (the system's temporary folder otherwise); BIAS=text makes the
   actions whose name holds it twenty times as likely. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const MIN = +(process.argv[3] || 40), SEED = +(process.argv[4] || 5);
const OUT = process.env.OUT || mkdtempSync(join(tmpdir(), "kurve-lab-"));
mkdirSync(OUT, { recursive: true });
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }

let a = SEED >>> 0; const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = q => q[Math.floor(R() * q.length)], between = (x, y) => x + R() * (y - x);
const TRAIL = join(OUT, `lab-day-${SEED}.trail.txt`), CSV = join(OUT, `lab-day-${SEED}.csv`);
writeFileSync(TRAIL, ""); writeFileSync(CSV, "t_s,actions,heapMB,nodes,listeners,lag_ms,storage_chars,projects,windows,undo,longtasks,longest_ms,status\n");
const t0 = Date.now(), log = (...q) => { const s = `[${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s] ` + q.join(" "); appendFileSync(TRAIL, s + "\n"); if (process.env.V) console.log(s); };
const issues = []; let lastAct = "start";
const issue = (kind, text) => { issues.push({ kind, at: lastAct, text: String(text).slice(0, 400) }); log("!!", kind, String(text).slice(0, 300)); };

const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ["longtask"] }); } catch (e) {} });
const page = await ctx.newPage();
const wire = (pg, tag) => {
  pg.on("pageerror", e => issue("pageerror", tag + e.message));
  pg.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR|fonts\.g/.test(m.text())) issue("console", tag + m.text()); });
  pg.on("crash", () => issue("crash", tag + "the page crashed"));
  pg.on("dialog", d => d.dismiss().catch(() => {}));
  pg.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort()).catch(() => {});
};
wire(page, ""); ctx.on("page", pg => { if (pg !== page) wire(pg, "[a window of its own] "); });
const cdp = await ctx.newCDPSession(page); await cdp.send("Performance.enable");
await page.goto(URL);
await page.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 30000 });
const ev = (fn, arg) => page.evaluate(fn, arg);

// The hand.
const moveTo = (x, y) => page.mouse.move(x + between(-1, 1), y + between(-1, 1), { steps: Math.round(between(4, 14)) });
const clickAt = async (x, y, o = {}) => { await moveTo(x, y); await page.waitForTimeout(between(40, 160)); await page.mouse.click(x, y, { button: o.button || "left", delay: between(30, 90) }); };
const pause = (x = 80, y = 500) => page.waitForTimeout(between(x, y));
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(between(30, 120)); } };
const type = async t => { for (const ch of t) { if (R() < 0.03 && /[0-9a-z]/i.test(ch)) { await page.keyboard.type(pick("qwertyuiop0123456789".split(""))); await page.waitForTimeout(between(80, 260)); await page.keyboard.press("Backspace"); } await page.keyboard.type(ch); await page.waitForTimeout(between(35, 170)); } };
const drag = async (x0, y0, x1, y1) => { await moveTo(x0, y0); await page.mouse.down(); await page.waitForTimeout(between(60, 200)); const n = Math.round(between(8, 25));
  for (let i = 1; i <= n; i++) { const f = i / n, e = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; await page.mouse.move(x0 + (x1 - x0) * e + between(-1.5, 1.5), y0 + (y1 - y0) * e + between(-1.5, 1.5)); await page.waitForTimeout(between(8, 30)); }
  await page.mouse.move(x1, y1); await page.mouse.up(); };
const vis = async sel => { const l = page.locator(sel), n = await l.count(), vw = page.viewportSize(), out = [];
  for (let i = 0; i < Math.min(n, 400); i++) { const b = await l.nth(i).boundingBox().catch(() => null); if (b && b.width > 2 && b.height > 2 && b.x >= 0 && b.y >= 0 && b.x + b.width <= vw.width && b.y + b.height <= vw.height) out.push({ i, b }); } return out; };
const mid = b => [b.x + b.width / 2, b.y + b.height / 2];
const modalOpen = () => ev(() => !!document.querySelector(".modal:not([hidden])"));
async function cell() { const cs = await vis("#ws td[data-r]"); if (!cs.length) return null; const c = pick(cs); return [c.b.x + c.b.width * between(.2, .8), c.b.y + c.b.height * between(.3, .7)]; }
async function plot() { const v = await vis("#plot"); return v.length ? v[0].b : null; }
const junk = () => pick(["0", "1.5", "-3e-4", "12,5", "1 234,5", "abc", "=A*2", "=sqrt(B)", "∞", "🧪", "NaN", "", "   ", "1e400", "-0", "0x1F", "2026-11-05", "12:30", "x".repeat(300), String(Math.round(R() * 1e6) / 1000), "−5", "١٢٣"]);
async function pickFromMenu(avoid) { const n = await page.locator(".menu").count(); if (!n) return "no menu";
  const its = page.locator(".menu").last().locator(".mi:not(:disabled):not(.has-sub)"), k = await its.count(); if (!k) { await key("Escape"); return "empty"; }
  const it = its.nth(Math.floor(R() * k)), t = ((await it.textContent()) || "").trim(); if (avoid && avoid.test(t) && R() < .6) { await key("Escape", 3); return "left " + t; }
  const b = await it.boundingBox(); if (b) await clickAt(b.x + 20, b.y + b.height / 2); return t; }
// Wander a menu: open it, follow submenus at random, click an item (or let go).
async function menuWalk(rootSel) {
  const roots = await vis(rootSel); if (!roots.length) return "no menu"; await clickAt(...mid(pick(roots).b)); await pause(150, 400);
  const path = [];
  for (let depth = 0; depth < 4; depth++) {
    const menus = page.locator(".menu"), n = await menus.count(); if (!n) return path.join(" › ") + " (closed)";
    const items = menus.nth(n - 1).locator(".mi:not(:disabled)"), k = await items.count(); if (!k) { await key("Escape"); return path.join(" › ") + " (empty)"; }
    const it = items.nth(Math.floor(R() * k)), lab = ((await it.textContent()) || "").trim().slice(0, 40); path.push(lab);
    if (/Delete (this|the) project|Clear the history|Replace the data/i.test(lab) && R() < 0.7) { await key("Escape", 3); return path.join(" › ") + " (left)"; }
    const b = await it.boundingBox(); if (!b) return path.join(" › ") + " (gone)";
    if (await it.getAttribute("aria-haspopup")) { await moveTo(b.x + b.width * .4, b.y + b.height / 2); await pause(250, 500); continue; }
    if (R() < 0.08) { await key("Escape", 2); return path.join(" › ") + " (let go)"; }
    await clickAt(b.x + b.width * .4, b.y + b.height / 2); return path.join(" › ");
  }
  await key("Escape", 4); return path.join(" › ") + " (too deep)";
}
async function dialog() {
  const ins = await vis(".modal:not([hidden]) input[type=text]:not([readonly]), .modal:not([hidden]) textarea");
  if (ins.length && R() < 0.5) { const f = pick(ins); await clickAt(f.b.x + 10, f.b.y + f.b.height / 2); await key("Control+a"); await type(junk().slice(0, 40)); }
  const btns = await vis(".modal:not([hidden]) footer button, .modal:not([hidden]) .foot button, .modal:not([hidden]) button.primary");
  if (R() < 0.15 || !btns.length) { await key("Escape"); return "Escape"; }
  await clickAt(...mid(pick(btns).b)); return "a button";
}
const SIZES = [[1440, 900], [1280, 720], [1920, 1080], [1024, 768], [390, 844], [1600, 1000]];
const files = Array.from({ length: 6 }, (_, k) => ({ name: `run_${k}.csv`, mimeType: "text/csv", buffer: Buffer.from("Raman shift (cm-1),Counts\n" + Array.from({ length: 1500 }, (_, i) => { const x = 100 + i * 2; return `${x},${(200 * Math.exp(-(((x - 520 - k) / 4) ** 2)) + 30 + Math.sin(i) * 3).toFixed(1)}`; }).join("\n")) }));

const ACTIONS = [
  [10, "type into a cell", async () => { const c = await cell(); if (!c) return "no cell"; await clickAt(...c); if (R() < .3) await key("F2"); await type(junk().slice(0, 60)); await key(pick(["Enter", "Tab", "Enter", "Escape", "ArrowDown", "ArrowRight"])); }],
  [5, "keys in the sheet", async () => { await key(pick(["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "PageDown", "PageUp", "Control+End", "Control+Home", "Tab", "Shift+ArrowDown", "Shift+ArrowRight", "Delete", "Home", "End"]), Math.ceil(R() * 6)); }],
  [4, "drag across cells", async () => { const x = await cell(), y = await cell(); if (!x || !y) return "no cells"; await drag(...x, ...y); if (R() < .3) await key(pick(["Delete", "Control+c", "Control+v", "Control+d", "Control+r"])); }],
  [3, "size a column", async () => { const e = await vis("#ws th.ch .rz"); if (!e.length) return "no edge"; const [x, y] = mid(pick(e).b); if (R() < .3) { await moveTo(x, y); await page.mouse.dblclick(x, y); return "fit"; } await drag(x, y, x + between(-150, 250), y); }],
  [2, "size the rows", async () => { const e = await vis("#ws th.rh .rzr"); if (!e.length) return "no row line"; const [x, y] = mid(pick(e).b); if (R() < .3) { await moveTo(x, y); await page.mouse.dblclick(x, y); return "22 px"; } await drag(x, y, x, y + between(-15, 40)); }],
  [3, "wheel the worksheet", async () => { const v = await vis("#ws"); if (!v.length) return "no sheet"; await moveTo(...mid(v[0].b)); const sh = R() < .3; if (sh) await page.keyboard.down("Shift"); for (let i = 0; i < 3 + R() * 15; i++) { await page.mouse.wheel(0, between(-800, 800)); await page.waitForTimeout(30); } if (sh) await page.keyboard.up("Shift"); }],
  [4, "right-click a cell", async () => { const c = await cell(); if (!c) return "no cell"; await clickAt(...c, { button: "right" }); await pause(200, 400); return pickFromMenu(/^Delete/); }],
  [3, "a formula in F(x)=", async () => { const f = await vis('#ws td[data-r="-1"]'); if (!f.length) return "no F(x) row"; const z = pick(f); await clickAt(z.b.x + 10, z.b.y + z.b.height / 2); await type(pick(["A*2", "sqrt(abs(B))", "log10(A+1)", "B-mean", "sin(x)", "A/(B", "C*C", "i", "exp(-x/10)"])); await key(pick(["Enter", "Enter", "Escape", "Tab"])); }],
  [7, "zoom on the graph", async () => { const b = await plot(); if (!b) return "no graph"; const k = R();
    if (k < .4) await drag(b.x + b.width * between(.1, .5), b.y + b.height * between(.1, .5), b.x + b.width * between(.5, .9), b.y + b.height * between(.5, .9));
    else if (k < .8) { await moveTo(b.x + b.width * between(.2, .8), b.y + b.height * between(.2, .8)); for (let i = 0; i < 2 + R() * 10; i++) { await page.mouse.wheel(0, between(-200, 200)); await page.waitForTimeout(40); } }
    else await page.mouse.dblclick(...mid(b)); }],
  [4, "a pointer tool", async () => { const b = await plot(); if (!b) return "no graph"; const m = pick(["zoom", "pan", "mask", "label", "arrow", "shape", "reader", "cross", "zoom", "zoom"]), t = await vis(`.toolbar [data-mode="${m}"]`); if (!t.length) return "no " + m;
    await clickAt(...mid(t[0].b)); const p = () => [b.x + b.width * between(.2, .8), b.y + b.height * between(.2, .8)];
    if (R() < .5) await drag(...p(), ...p()); else await clickAt(...p()); if (R() < .3) await key(pick(["ArrowLeft", "ArrowRight", "Delete", "Escape", "Enter"]), 3); return m; }],
  [4, "right-click the graph", async () => { const b = await plot(); if (!b) return "no graph"; await clickAt(b.x + b.width * between(.1, .9), b.y + b.height * between(.1, .9), { button: "right" }); await pause(200, 400); return pickFromMenu(); }],
  [10, "the menu bar", () => menuWalk(".menubar .mb")],
  [3, "the graph's menus", () => menuWalk("#gRibbon button")],
  [4, "drag a window", async () => { const hs = await vis("section.win:not(.docked) > .win-h .win-t"); if (!hs.length) return "none"; const h = pick(hs), vw = page.viewportSize(); await drag(h.b.x + 5, h.b.y + h.b.height / 2, between(50, vw.width - 100), between(90, vw.height - 120)); }],
  [3, "resize a window", async () => { const es = await vis("section.win:not(.docked) .win-rz"); if (!es.length) return "none"; const [x, y] = mid(pick(es).b); await drag(x, y, x + between(-250, 250), y + between(-200, 200)); }],
  [3, "maximise or minimise", async () => { if (R() < .4) { const hs = await vis("section.win > .win-h .win-t"); if (!hs.length) return; const h = pick(hs); await page.mouse.dblclick(h.b.x + 10, h.b.y + h.b.height / 2); return "title"; } const ms = await vis("section.win [data-wmin]"); if (!ms.length) return "none"; await clickAt(...mid(pick(ms).b)); return "minimised"; }],
  [4, "the taskbar", async () => { const ts = await vis("#taskbar .tk, #taskbar button"); if (!ts.length) return "none"; await clickAt(...mid(pick(ts).b)); }],
  [2, "the dock", async () => { const ts = await vis("#dockBar [data-dtab], #dockBar button"); if (!ts.length) return "no dock"; const t = pick(ts); if (R() < .2) { await drag(t.b.x + 10, t.b.y + 10, between(200, 900), between(200, 600)); return "out"; } await clickAt(...mid(t.b)); }],
  [3, "the toolbar", async () => { const ts = await vis(".toolbar button:not(#importBtn)"); if (!ts.length) return; await clickAt(...mid(pick(ts).b)); }],
  [3, "undo and redo", async () => { const n = Math.ceil(R() * 8); for (let i = 0; i < n; i++) await key(R() < .7 ? "Control+z" : "Control+y"); return n + " keys"; }],
  [2, "Escape", async () => { await key("Escape", 1 + Math.floor(R() * 5)); }],
  [2, "Find a command", async () => { await key("Control+k"); await pause(200, 400); await type(pick(["plot", "fit", "export", "smooth", "peak", "log", "grid", "baseline", "sort", "new graph", "zzz"])); await pause(200, 500); await key(R() < .7 ? "Enter" : "Escape"); }],
  [2, "the project menu", async () => { const pb = await vis("#projMenu"); if (!pb.length) return "none"; await clickAt(...mid(pb[0].b)); await pause(200, 400); return pickFromMenu(/Delete/); }],
  [1, "import files", async () => { const ib = await vis("#importBtn"); if (!ib.length) return "no button"; const [fc] = await Promise.all([page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null), clickAt(...mid(ib[0].b))]); if (!fc) return "no chooser"; const fs = files.slice(0, 1 + Math.floor(R() * 5)); await fc.setFiles(fs); await page.waitForTimeout(1500); return fs.length + " files"; }],
  [1, "screen size", async () => { const v = pick(SIZES); await page.setViewportSize({ width: v[0], height: v[1] }); await page.waitForTimeout(600); return v.join("×"); }],
  [1, "theme", async () => { const t = await vis("#themeBtn"); if (t.length) await clickAt(...mid(t[0].b)); }],
  [2, "type in a field", async () => { const fs = await vis("section.win input[type=text]:not([readonly]), section.win textarea"); if (!fs.length) return "no fields"; const f = pick(fs); await clickAt(f.b.x + Math.min(20, f.b.width / 2), f.b.y + f.b.height / 2); await key("Control+a"); await type(junk().slice(0, 30)); await key(pick(["Enter", "Tab", "Escape"])); }],
  [2, "a tool window's buttons", async () => { const bs = await vis("section.win:not(.gwin) .win-b button:not(:disabled), section.win:not(.gwin) .win-b input[type=checkbox]"); if (!bs.length) return "nothing"; await clickAt(...mid(pick(bs).b)); }],
  // Two worksheet windows (SHEET_SPEC 3.2): a sheet opened in a window of its own from its tab's menu, a press on a window's
  // picture, a window closed; with one sheet, a new one first.
  [2, "a sheet's own window", async () => { const k = R();
    if (k < .35) { const pics = await vis(".wssnap td[data-r]"); if (pics.length) { await clickAt(...mid(pick(pics).b)); if (R() < .5) await type(junk().slice(0, 12)); await key(pick(["Enter", "Tab", "Escape"])); return "a picture's cell"; } }
    if (k < .45) { const x = await vis(".win.wswin [data-wclose]"); if (x.length) { await clickAt(...mid(x[0].b)); return "closed one"; } }
    // The worksheet brought forward by its taskbar button, a second sheet made, then a sheet's tab asked.
    let tabs = await vis("#wsTabs [data-wst]");
    if (!tabs.length) { const b = await vis('#taskbar .tk[data-tk="ws"]'); if (!b.length) return "no worksheet"; await clickAt(...mid(b[0].b)); await pause(300, 500); tabs = await vis("#wsTabs [data-wst]"); }
    if (tabs.length < 2) { const nb = await vis("#wsTabs [data-wstnew]"); if (!nb.length) return "no tabs"; await clickAt(...mid(nb[0].b)); await pause(300, 500); tabs = await vis("#wsTabs [data-wst]"); }
    for (const t of tabs.sort(() => R() - .5)) { await clickAt(...mid(t.b), { button: "right" }); await pause(200, 400);
      const it = page.locator(".menu .mi:not(:disabled)", { hasText: "Open in a window of its own" }); if (await it.count()) { await it.first().click(); return "opened one"; }
      await key("Escape"); await pause(100, 200); }
    return "none to open"; }],
  // A matrix (SHEET_SPEC 3.6): one made from Data › Matrix (a formula or empty), its cells typed into, cleared and pasted
  // over, its Matrix button's commands, its tabs, plotted.
  [2, "a matrix", async () => { const k = R(); let cells = await vis(".mxwin .mxt td[data-r]");
    if (!cells.length || k < .15) { const db = await vis('.menubar .mb[data-menu="data"]'); if (!db.length) return "no menu bar"; await clickAt(...mid(db[0].b)); await pause(150, 300);
      const m = page.locator(".menu .mi", { hasText: /^Matrix$/ }); if (!(await m.count())) { await key("Escape"); return "no menu"; } await m.first().hover(); await pause(200, 300);
      const nw = page.locator(".menu .mi", { hasText: "New matrix…" }); if (!(await nw.count())) { await key("Escape"); return "no item"; } await nw.first().click(); await pause(200, 400);
      if (await page.isVisible("#mnV")) { await page.fill("#mnR", String(Math.round(between(1, 60)))); await page.fill("#mnC", String(Math.round(between(1, 60)))); await page.fill("#mnV", pick(["", "", "3.5", "sin(x)*cos(y)", "x*y + i", junk().slice(0, 10)])); await pause(100, 200);
        if (await page.isEnabled("#formOk")) { await page.click("#formOk"); return "made one"; } await key("Escape"); return "refused"; } return "no dialog"; }
    if (k < .55) { const c = pick(cells); await page.mouse.dblclick(...mid(c.b)); await pause(80, 200); await type(R() < .7 ? String(Math.round((R() - .5) * 1e4) / 100) : junk().slice(0, 8)); await key(pick(["Enter", "Tab", "Escape", "ArrowDown"])); return "typed"; }
    if (k < .65) { const c = pick(cells); await clickAt(...mid(c.b)); await key("Shift+ArrowRight"); await key("Shift+ArrowDown"); await key(pick(["Delete", "Control+c", "Escape"])); return "selected"; }
    if (k < .85) { const b = await vis(".mxwin [data-mxmenu]"); if (!b.length) return "no button"; await clickAt(...mid(pick(b).b)); await pause(150, 300); const its = await vis(".menu .mi:not(:disabled)"); if (!its.length) return "empty"; await clickAt(...mid(pick(its).b)); await pause(200, 400);
      if (await page.isVisible("#formOk")) { if (R() < .6 && await page.isEnabled("#formOk")) await page.click("#formOk"); else await key("Escape"); } return "its menu"; }
    const tb = await vis(".mxwin .mxtabs [data-mxnew], .mxwin .mxtabs [data-mxs], .mxwin [data-mxplot]"); if (!tb.length) return "no tabs"; await clickAt(...mid(pick(tb).b)); await pause(150, 300); const its = await vis(".menu .mi:not(:disabled)"); if (its.length) await clickAt(...mid(pick(its).b)); return "tabs or plot"; }],
  [1, "coffee", async () => { const s = between(15, 90); await page.mouse.move(between(0, 50), between(0, 50)); await page.waitForTimeout(s * 1000); return Math.round(s) + " s"; }],
];
// BIAS="label" makes the actions whose label holds it twenty times as likely, to watch one closely.
if (process.env.BIAS) ACTIONS.forEach((q) => { if (q[1].includes(process.env.BIAS)) q[0] *= 20; });
const total = ACTIONS.reduce((s, q) => s + q[0], 0);
let n = 0, last = 0;
async function act(label, fn) { lastAct = label; const t = Date.now(); let r;
  try { r = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("no answer in 90 s")), 90000))]); } catch (e) { if (/no answer/.test(e.message)) issue("hung", label); else log("  (", label, e.message.split("\n")[0], ")"); }
  log(`${label} (${Date.now() - t} ms)${r ? " → " + String(r).slice(0, 100) : ""}`); }
async function sample() {
  const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(x => [x.name, x.value]));
  const q = await ev(() => { let ls = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls += k.length + (localStorage.getItem(k) || "").length; } } catch (e) {}
    return { ls, lt: window.__lt.splice(0), st: (document.getElementById("status") || {}).textContent, pr: (S.projects || []).length, w: document.querySelectorAll("section.win:not([hidden])").length, u: typeof undoStack !== "undefined" ? undoStack.length : -1 }; }).catch(() => ({ lt: [] }));
  const t = Date.now(); await ev(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))).catch(() => {}); const lag = Date.now() - t;
  const lmax = q.lt.reduce((x, y) => Math.max(x, y[1]), 0);
  appendFileSync(CSV, [((Date.now() - t0) / 1000).toFixed(0), n, (m.JSHeapUsedSize / 1048576).toFixed(1), m.Nodes, m.JSEventListeners, lag, q.ls, q.pr, q.w, q.u, q.lt.length, lmax, JSON.stringify(q.st || "")].join(",") + "\n");
  if (lag > 1500) issue("lag", `the page took ${lag} ms to answer after ${n} actions`); }
await ev(() => loadExample("ir")).catch(() => {}); await page.waitForTimeout(1500); await sample();
while (Date.now() - t0 < MIN * 60000) {
  let x = R() * total, q = ACTIONS[0]; for (const c of ACTIONS) { x -= c[0]; if (x <= 0) { q = c; break; } }
  n++; if (await modalOpen().catch(() => false)) await act("a dialog", dialog); else await act(q[1], q[2]);
  await pause();
  if (Date.now() - last > 30000) { last = Date.now(); await sample(); }
  if (!(await ev(() => typeof S !== "undefined" && !!S.proj).catch(() => false))) { issue("state", "no project on the desk"); await page.waitForTimeout(2000); }
}
await sample();
// The end of the day: every project as it is, then a reload and the same again.
await page.setViewportSize({ width: 1440, height: 900 }); await key("Escape", 4); await page.waitForTimeout(1500);
const sig = () => ev(() => S.projects.map(p => p.name + ":" + (p.cols || []).length + ":" + (p.cols || []).reduce((s, c) => s + (c.data || []).filter(v => v != null).length, 0)).sort());
const before = await sig();
await page.reload(); await page.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 60000 }).catch(() => issue("reload", "no project after a reload")); await page.waitForTimeout(1500);
const after = await sig();
if (JSON.stringify(before) !== JSON.stringify(after)) issue("reload", "the projects differ after a reload: " + JSON.stringify(before) + " → " + JSON.stringify(after));
await sample();
console.log(`${n} actions in ${((Date.now() - t0) / 60000).toFixed(1)} min; trail ${TRAIL}; samples ${CSV}`);
const bad = issues.filter(i => i.kind !== "slow");
for (const i of bad) console.log(`  FAIL [${i.kind}] during "${i.at}": ${i.text}`);
console.log(bad.length ? `${bad.length} failures` : "no failures");
await browser.close(); server.close();
process.exit(bad.length ? 1 : 0);
