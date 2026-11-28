/* What every flow test shares (QUALITY_SPEC §3.1). A flow is a person's task done through the interface: clicks, keys, the
   file picker, drops and the menus. It reads the app's state with read() and nothing else: read's body may call only the
   functions in READ (tools/flows/lint.mjs checks it), so a flow can never do through the code what a person cannot do
   through the screen. Every page has the document's rules checked after every save (projCheck, on for 127.0.0.1), and a
   rule broken is a page error. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

export const here = dirname(fileURLToPath(import.meta.url));
export const FILE = resolve(process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : join(here, "..", "..", "kurve.html"));
export const FIX = join(here, "fixtures");

// What read() may call: functions that only look.
export const READ = ["P", "sheetList", "sheetName", "sheetOf", "sheetCols", "curSheet", "treeOf", "xRows", "xFolderName", "xMany", "colById",
  "colLetter", "colRef", "specName", "ownName", "yCols", "hasVals", "finalOf", "pipeOf", "graphCols", "graphName", "graphOf", "drawGraphIds",
  "deskGraphIds", "graphShut", "isFigId", "winOpen", "winMin", "frontWinId", "projCheck", "prefGet", "activeYCol", "xKeysOf", "projName",
  "anaList", "matBooks", "wsHandCol", "graphIds", "toastKind", "winOfGraph", "wsWinOf", "mainSheet",
  "bookList", "bookOf", "bookSheets", "bookName", "bkWin", "winBook", "wsLiveWin", "bookShown", "subjCol",
  "Object", "Array", "JSON", "Math", "String", "Number", "Set", "Map", "Boolean", "isFinite", "parseFloat"];

let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }

export async function start() {
  const server = createServer((req, res) => {
    if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
  const browser = await chromium.launch();
  let pass = 0, fail = 0;
  const check = (name, cond, detail) => {
    if (cond) { pass++; console.log("  ok   " + name); }
    else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 500))); }
  };
  const ready = async p => { await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 20000 }); await p.waitForTimeout(200); };
  async function page(name, fn, opt = {}) {
    console.log(name);
    const ctx = await browser.newContext({ viewport: opt.vw || { width: 1600, height: 950 }, acceptDownloads: true });
    if (opt.setup) await opt.setup(ctx);
    const p = await ctx.newPage(); const errors = [];
    p.on("pageerror", e => errors.push(e.message));
    p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
    await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
    await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "0"); } catch (e) {} });
    await p.goto(URL); await ready(p);
    try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), opt.timeout || 180000))]); }
    catch (e) { check(name + ": ran", false, e.message); }
    check(name + ": no page errors, no rule of the document broken", !errors.length, errors.slice(0, 3).join(" | "));
    await ctx.close().catch(() => {});
  }
  const done = async () => { console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0); };
  return { URL, browser, check, page, done, ready };
}

// read(p, fn, arg): the one way a flow looks at the app.
export const read = (p, fn, arg) => p.evaluate(fn, arg);
export const W = (p, ms) => p.waitForTimeout(ms || 300);
// A row of the Project Explorer by its name, exactly.
export const row = (p, name) => p.locator("#xplTree .xr").filter({ has: p.locator(".xn", { hasText: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") }) }).first();
// A menu of the menu bar, then its submenus by their words, the last clicked.
export async function menu(p, top, ...path) {
  await p.click(`.titlebar .mb[data-menu="${top}"]`); await W(p, 250);
  for (let i = 0; i < path.length; i++) {
    const it = p.locator(".menu:visible [role=menuitem]", { hasText: path[i] }).last();
    if (i < path.length - 1) { await it.hover(); await W(p, 350); } else await it.click();
  }
  await W(p, 600);
}
// A right-click menu's item.
export async function ctxItem(p, words) { await p.locator(".menu:visible [role=menuitem]", { hasText: words }).last().click(); await W(p, 400); }
// Files chosen in the Import button's picker.
export async function pickFiles(p, files) {
  await p.setInputFiles("#fileIn", files.map(([name, text]) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) }))); await W(p, 900);
}
// Files dropped on what a locator finds, as a person drags them from the computer: dragenter, dragover and drop at its middle.
export async function dropFiles(p, target, files) {
  const box = await target.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
  const dt = await p.evaluateHandle(list => { const d = new DataTransfer(); list.forEach(([n, t]) => d.items.add(new File([t], n, { type: "text/csv" }))); return d; }, files);
  await p.mouse.move(x, y);
  for (const type of ["dragenter", "dragover"]) { await p.dispatchEvent("body", type, { dataTransfer: dt, clientX: x, clientY: y }); await W(p, 120); }
  await W(p, 200);
  await p.dispatchEvent("body", "drop", { dataTransfer: dt, clientX: x, clientY: y }); await W(p, 600);
}
export async function openProjectFile(p, path) { await p.setInputFiles("#projFileIn", path); await W(p, 1500); }
// A spectrum of a band on a slope, as an instrument writes it.
export const spectrum = (n, x0, k, name = "Intensity") => "Wavenumber,Intensity\n".replace("Intensity", name) +
  Array.from({ length: n }, (_, i) => `${x0 + i},${(200 + 0.3 * i + 900 * k * Math.exp(-(((i - n / 2) / 9) ** 2)) + 4 * Math.sin(i * 1.7)).toFixed(3)}`).join("\n");
