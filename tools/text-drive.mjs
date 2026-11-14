/* Text in the worksheet (ux/spec/FOUNDATION_SPEC.md, 1.2): typed, kept, marked, left out of what
   reads numbers, hashed, merged, moved with rows, sorted, copied, pasted, undone, reloaded, cleaned
   from storage. Needs Playwright with Chromium. Usage: node tools/text-drive.mjs [kurve.html] */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }
let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log("  ok   " + name); } else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 500))); } };
const browser = await chromium.launch();
const ready = (p) => p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 30000 });
async function page(fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), 180000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
// A sheet of X and two Y columns, numbers in rows 0..9.
const SETUP = () => { const x = [], y = [], z = []; for (let i = 0; i < 10; i++) { x.push(i); y.push(i * 2); z.push(i + 0.5); }
  save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "A", "", y), { pipe: [], mask: [] }), Object.assign(makeCol("y", "B", "", z), { pipe: [], mask: [] })], activeY: null }, "typed"); };
const typeAt = async (p, r, c, s) => { await p.evaluate(() => { focusWin("sheet"); }); await p.locator(`#ws td[data-r="${r}"][data-ci="${c}"]`).click(); await p.keyboard.type(s); await p.keyboard.press("Enter"); await p.waitForTimeout(150); };
const col = (p, i) => p.evaluate(i => { const c = sheetCols(curSheet())[i]; return { data: c.data.slice(), txt: c.txt || null, fmt: c.fmt || null }; }, i);

console.log("Typing text among numbers");
await page(async p => {
  await p.evaluate(SETUP); await p.waitForTimeout(400);
  const fp0 = await p.evaluate(() => P().raw.fp);
  await typeAt(p, 3, 1, "<LOD");
  let c = await col(p, 1), r = await p.evaluate(() => ({ toast: document.querySelector("#toast").textContent, td: (() => { const td = document.querySelector('#ws td[data-r="3"][data-ci="1"]'); return { t: td.textContent, cls: td.className, title: td.title }; })(), fp: P().raw.fp, curve: rawSeries(sheetCols(curSheet())[1]).y.length }));
  check("“<LOD” typed into a column of numbers is kept as text, the number there empty", c.data[3] === null && c.txt && c.txt[3] === "<LOD", JSON.stringify(c));
  check("…said once, with Undo", /kept as text/.test(r.toast), r.toast);
  check("…drawn as typed, left-aligned, underlined dotted and titled", r.td.t === "<LOD" && /\btx\b/.test(r.td.cls) && /\btxn\b/.test(r.td.cls) && /not counted as a number/.test(r.td.title), JSON.stringify(r.td));
  check("…left out of the curve as an empty cell is (9 points)", r.curve === 9, r.curve);
  check("…and it changes the check code", r.fp && r.fp !== fp0, [fp0, r.fp]);
  await typeAt(p, 4, 1, "1,2.3"); c = await col(p, 1);
  check("“1,2.3” is text too, and 7 stays a number", c.txt[4] === "1,2.3" && c.data[4] === null && c.data[5] === 10, JSON.stringify(c));
  await typeAt(p, 3, 1, "6"); c = await col(p, 1);
  check("a number typed over a text cell replaces it", c.data[3] === 6 && !(3 in (c.txt || {})), JSON.stringify(c));
  // Numbers only refuses; Text only keeps 007; back reads numbers again.
  await p.evaluate(() => { const c = sheetCols(curSheet())[2]; setCellsHold(c.id, "num"); });
  await typeAt(p, 1, 2, "n/a");
  r = await p.evaluate(() => ({ v: sheetCols(curSheet())[2].data[1], txt: sheetCols(curSheet())[2].txt || null, edit: !!S.ws.edit, toast: document.querySelector("#toast").textContent }));
  check("a column made Numbers only refuses text, the box kept open to put it right", r.v === 1.5 && !r.txt && r.edit && /numbers only/.test(r.toast), JSON.stringify(r));
  await p.keyboard.press("Escape");
  await p.evaluate(() => { const c = sheetCols(curSheet())[1]; setCellsHold(c.id, "num"); });
  r = await p.evaluate(() => ({ fmt: sheetCols(curSheet())[1].fmt || null, toast: document.querySelector("#toast").textContent }));
  check("Numbers only is refused while text is there, saying where", r.fmt === null && /text cell.*row 5/.test(r.toast), JSON.stringify(r));
  await p.evaluate(() => { const c = sheetCols(curSheet())[2]; setCellsHold(c.id, "text"); });
  c = await col(p, 2);
  check("Text only turns every number into its text as shown", c.fmt === "text" && c.data.every(v => v === null) && c.txt[1] === "1.5" && c.txt[9] === "9.5", JSON.stringify(c).slice(0, 200));
  await typeAt(p, 0, 2, "007"); c = await col(p, 2);
  check("…and 007 typed there stays 007", c.txt[0] === "007", JSON.stringify(c.txt));
  await p.evaluate(() => { const c = sheetCols(curSheet())[2]; setCellsHold(c.id, ""); }); c = await col(p, 2);
  check("back to numbers and text, each cell is read as typing it would (007 is 7)", c.fmt === null && c.data[0] === 7 && c.data[1] === 1.5 && !c.txt, JSON.stringify(c).slice(0, 200));
  await p.evaluate(() => undo()); await p.waitForTimeout(200); c = await col(p, 2);
  check("undo puts the text column back", c.fmt === "text" && c.txt[0] === "007", JSON.stringify(c).slice(0, 160));
  // The status bar says what it left out.
  await p.evaluate(() => { focusWin("sheet"); }); await p.locator('#ws td[data-r="0"][data-ci="1"]').click(); await p.keyboard.down("Shift"); await p.locator('#ws td[data-r="9"][data-ci="1"]').click(); await p.keyboard.up("Shift"); await p.waitForTimeout(200);
  r = await p.evaluate(() => document.querySelector("#readout").textContent);
  check("the status bar's numbers of B1:B10 say 1 text left out", /Text\s*1 left out/.test(r) && /N\s*9/.test(r), r);
  // Sorting: numbers, then text in natural order, then empty.
  await typeAt(p, 0, 1, "sample 10"); await typeAt(p, 1, 1, "sample 9");
  r = await p.evaluate(() => { wsSortBy(sheetCols(curSheet())[1].id, 1); const m = S.wsm; const out = []; for (let i = 0; i < m.n; i++) out.push(wsText(m, i, 1)); wsSortBy(null, 0); return out; });
  check("sorted, numbers come first, then text in natural order (sample 9 before sample 10)", JSON.stringify(r.slice(-3)) === JSON.stringify(["1,2.3", "sample 9", "sample 10"]) && r[0] === "4", JSON.stringify(r));
  // Find, copy, clear.
  r = await p.evaluate(() => { wsFindOpen(); const i = $("#wsFindQ"); i.value = "sample"; wsFindRun(); return S.wsFind.hits.length; });
  check("find marks the text cells (2 with “sample”)", r === 2, r);
  await p.keyboard.press("Escape");
  r = await p.evaluate(() => { S.ws.r = 0; S.ws.c = 1; S.ws.ar = 1; S.ws.ac = 1; return wsCopyText(); });
  check("copied, text is text (TSV)", r === "sample 10\nsample 9", JSON.stringify(r));
  await p.evaluate(() => { S.ws.r = 0; S.ws.c = 1; S.ws.ar = 0; S.ws.ac = 1; wsClear(); }); c = await col(p, 1);
  check("Delete clears a text cell", c.data[0] === null && !(0 in (c.txt || {})), JSON.stringify(c));
  // Rows inserted and deleted carry the text with them.
  await p.evaluate(() => { S.ws.r = 0; S.ws.c = 1; S.ws.ar = 0; S.ws.ac = 1; wsRowsEdit("insert", false); }); c = await col(p, 1);
  check("a row inserted above moves text down with the numbers", c.txt[2] === "sample 9" && c.txt[5] === "1,2.3", JSON.stringify(c.txt));
  await p.evaluate(() => { S.ws.r = 0; S.ws.c = 1; S.ws.ar = 0; S.ws.ac = 1; wsRowsEdit("delete", false); }); c = await col(p, 1);
  check("…and deleting it moves it back", c.txt[1] === "sample 9" && c.txt[4] === "1,2.3", JSON.stringify(c.txt));
  // The check code and the original-data CSV agree, text quoted.
  r = await p.evaluate(async () => { fpSettle(); const cols = rawCols(); return { body: rawText(cols.map(rawArr)), fp: P().raw.fp, ok: rawVerified() }; });
  const sha = createHash("sha256").update(r.body).digest("hex");
  check("the check code is the SHA-256 of the lines with text quoted (\"1,2.3\")", r.fp === sha && r.ok === true && r.body.includes('"1,2.3"') && r.body.includes('"sample 9"'), JSON.stringify([r.fp, sha, r.ok]));
  // Reload.
  const before = await p.evaluate(() => JSON.stringify(sheetCols(curSheet()).map(c => [c.data, c.txt || null, c.fmt || null])));
  await p.reload(); await ready(p); await p.waitForTimeout(400);
  const after = await p.evaluate(() => JSON.stringify(sheetCols(curSheet()).map(c => [c.data, c.txt || null, c.fmt || null])));
  check("everything is there after a reload", before === after, after.slice(0, 200));
  check("…and its check code still matches", await p.evaluate(() => rawVerified()) === true);
}, { name: "typing" });

console.log("Paste, a project of numbers, storage, two tabs");
await page(async (p, ctx) => {
  await p.evaluate(SETUP); await p.waitForTimeout(400);
  const fp0 = await p.evaluate(() => P().raw.fp);
  await p.evaluate(() => { S.ws.r = 0; S.ws.c = 1; S.ws.ar = 0; S.ws.ac = 1; wsPasteText("1.5\tok\nn/a\t2\n\"a\tb\"\t3"); });
  let c1 = await col(p, 1), c2 = await col(p, 2);
  check("a block pasted keeps its text cells (n/a, ok, a quoted field with a tab)", c1.data[0] === 1.5 && c1.txt[1] === "n/a" && c1.txt[2] === "a\tb" && c2.txt[0] === "ok" && c2.data[1] === 2, JSON.stringify([c1, c2]).slice(0, 300));
  await p.evaluate(() => undo()); await p.waitForTimeout(200);
  const r = await p.evaluate(() => ({ fp: P().raw.fp, t: sheetCols(curSheet()).some(c => c.txt) }));
  check("undo takes the paste back, and the check code with it", r.fp === fp0 && !r.t, JSON.stringify(r));
  // A project of numbers keeps its check code: the same as the hash of its numbers alone.
  const same = await p.evaluate(() => rawFp() === sha256(rawText(rawCols().map(c => c.data))));
  check("a project of numbers has the check code it had (its numbers alone, as before)", same);
  // Junk from storage is cleaned, not shown.
  const junk = await p.evaluate(async () => { const X = makeCol("x", "X", "", [1, 2, 3]), Y = Object.assign(makeCol("y", "Y", "", [1, null, null, null]), { pipe: [], mask: [] });
    Y.txt = { 0: "number there", 1: "", 2: true, 3: { a: 1 }, "-1": "neg", x: "word", 1e9: "far" }; const Z = Object.assign(makeCol("ignore", "Z", "", [null]), { txt: "not an object" });
    const W = Object.assign(makeCol("ignore", "W", "", []), { txt: { 0: "x".repeat(2e6) }, fmt: "bogus" });
    const n0 = S.projects.length; await createProject(Object.assign(blankProject("Junk"), { cols: [X, Y, Z, W], activeY: Y.id }), "t");
    await new Promise(r => { const t = setInterval(() => { if (P() && P().name === "Junk") { clearInterval(t); r(); } }, 30); });
    const cs = P().cols; return { y: cs[1].txt || null, z: cs[2].txt === undefined, w: cs[3].txt && cs[3].txt[0].length, wf: cs[3].fmt === undefined, wl: cs[3].data.length }; });
  check("text cells from storage in every broken form are cleaned (a number's row, empty, a boolean, an object, keys that are not rows)", junk.y === null && junk.z, JSON.stringify(junk));
  check("…a megabyte cell cut to 10 000 characters, its row made, a format that is none dropped", junk.w === 10000 && junk.wf && junk.wl === 1, JSON.stringify(junk));
  // Two tabs: one types text, the other a number, into one column.
  await p.evaluate(() => { const x = [0, 1, 2, 3], y = [0, 1, 2, 3]; save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "Y", "", y), { pipe: [], mask: [] })], activeY: null }, "typed"); }); await p.waitForTimeout(500);
  const q = await ctx.newPage(); await q.goto(URL); await ready(q); await q.evaluate(id => switchProject(id), await p.evaluate(() => S.pid)); await q.waitForTimeout(500);
  await Promise.all([typeAt(p, 1, 1, "high"), typeAt(q, 3, 1, "42")]); await p.waitForTimeout(1800);
  const a = await col(p, 1), b = await col(q, 1);
  check("two tabs, text in one cell and a number in another of one column: both kept, in both tabs", a.txt && a.txt[1] === "high" && a.data[3] === 42 && JSON.stringify(a) === JSON.stringify(b), JSON.stringify([a, b]));
  await q.close();
}, { name: "paste and storage" });

console.log("A file with text, imported");
await page(async p => {
  const r = await p.evaluate(async () => {
    const text = "Sample,Time,Signal,Notes\nA1,0,1.2,start\nA2,1,n/a,\nB1,2,1.9,bubble\nB2,3,<0.01,\nC1,4,3.1,end\n";
    await autoImport([{ name: "run.csv", text }]); await new Promise(r => setTimeout(r, 600));
    const cs = sheetCols(curSheet()).map(c => ({ n: c.name, role: c.role, fmt: c.fmt || null, data: c.data.slice(), txt: c.txt || null }));
    const opts = IMP_USE.map(u => u[1]); return { cs, opts };
  });
  const by = n => r.cs.find(c => c.n === n) || {};
  check("a file's column of names comes in as text, kept as written", by("Sample").fmt === "text" && by("Sample").txt && by("Sample").txt[0] === "A1" && by("Sample").txt[4] === "C1", JSON.stringify(by("Sample")));
  check("…its numbers' stray text (n/a, <0.01) as text cells, the numbers as numbers", by("Signal").data[0] === 1.2 && by("Signal").txt && by("Signal").txt[1] === "n/a" && by("Signal").txt[3] === "<0.01" && by("Signal").data[4] === 3.1, JSON.stringify(by("Signal")));
  check("…its notes as a text column, the empty ones empty", by("Notes").fmt === "text" && by("Notes").txt[2] === "bubble" && !(1 in by("Notes").txt), JSON.stringify(by("Notes")));
  check("the import dialog's Use list offers Text", r.opts.includes("Text (kept as written)"), JSON.stringify(r.opts));
}, { name: "import" });

console.log("Categorical columns");
await page(async p => {
  await p.evaluate(() => { const x = [0, 1, 2, 3, 4, 5], g = Object.assign(makeCol("ignore", "Dose", "", [null, null, null, null, null, null]), { fmt: "text" });
    g.txt = { 0: "low", 1: "high", 2: "mid", 3: "low", 4: "high", 5: "mid" }; TXT_OK.add(g.txt);
    save({ cols: [makeCol("x", "X", "", x), g, Object.assign(makeCol("y", "Y", "", [5, 1, 3, 4, 2, 6]), { pipe: [], mask: [] })], activeY: null }, "typed"); });
  await p.waitForTimeout(400);
  const gid = await p.evaluate(() => sheetCols(curSheet())[1].id);
  const openCat = () => p.evaluate(id => { catDlg(id); }, gid).then(() => p.waitForSelector("#catRows tr"));
  const levels = () => p.$$eval("#catRows tr td:first-child", tds => tds.map(td => td.textContent));
  await openCat();
  let r = await levels();
  check("the dialog lists the levels as they first come (low, high, mid), with their rows", JSON.stringify(r) === '["low","high","mid"]' && await p.$eval("#catRows tr td.num", td => td.textContent) === "2", JSON.stringify(r));
  await p.selectOption("#catOrd", "asc"); r = await levels();
  check("Ascending orders them (high, low, mid)", JSON.stringify(r) === '["high","low","mid"]', JSON.stringify(r));
  await p.click("#formOk"); await p.waitForTimeout(300);
  r = await p.evaluate(id => { const c = colById(id); return { cat: c.cat || null, lv: (catLevels(c) || []).map(o => o.v), tag: !!document.querySelector('#ws th.ch .lab.cat'), log: P().log.slice(-1)[0].what || P().log.slice(-1)[0].msg || JSON.stringify(P().log.slice(-1)[0]) }; }, gid);
  check("Done makes it categorical, ascending, one log line, the header tagged cat", r.cat && r.cat.order === "asc" && JSON.stringify(r.lv) === '["high","low","mid"]' && r.tag && /categorical/.test(r.log), JSON.stringify(r));
  // By hand: mid moved to the top.
  await openCat(); await p.click('[data-catdn="1"]'); r = await levels();
  const ordv = await p.$eval("#catOrd", s => s.value);
  check("↑ and ↓ put them in an order by hand (high, mid, low), the order then By hand", JSON.stringify(r) === '["high","mid","low"]' && ordv === "custom", JSON.stringify([r, ordv]));
  await p.click("#formOk"); await p.waitForTimeout(300);
  r = await p.evaluate(id => colById(id).cat, gid);
  check("…kept with its levels", r && r.order === "custom" && JSON.stringify(r.levels) === '["high","mid","low"]', JSON.stringify(r));
  // Sorting the view by its categories.
  await p.evaluate(id => { wsSortBy(id, 1, true); }, gid); await p.waitForTimeout(200);
  r = await p.$$eval('#ws tr td[data-ci="1"][data-r]', tds => tds.filter(td => +td.dataset.r >= 0).slice(0, 6).map(td => td.textContent));
  check("the view sorted by its categories goes high, high, mid, mid, low, low", JSON.stringify(r) === '["high","high","mid","mid","low","low"]', JSON.stringify(r));
  const menu = await p.evaluate(id => { const it = colMenuItems(id); const flat = []; const walk = l => (typeof l === "function" ? l() : l || []).forEach(x => { if (x && x.label) { flat.push(x.label); if (x.sub) walk(x.sub); } }); walk(it); return flat; }, gid).catch(e => ["error " + e.message]);
  check("the column menu has Categorical… and the sort By its categories", menu.some(l => /^Categorical/.test(l)) && menu.some(l => /By its categories/.test(l)), JSON.stringify(menu).slice(0, 400));
  await p.evaluate(() => { wsSortBy(null); });
  // Undo, twice, and it is not categorical.
  await p.evaluate(() => { undo(); undo(); }); await p.waitForTimeout(300);
  r = await p.evaluate(id => colById(id).cat || null, gid);
  check("two undos and the column is not categorical again", r === null, JSON.stringify(r));
  // A column of 250 different values cannot be.
  await p.evaluate(() => { const y = Array.from({ length: 250 }, (_, i) => i); save({ cols: [makeCol("x", "X", "", y.slice()), Object.assign(makeCol("y", "Y", "", y), { pipe: [], mask: [] })], activeY: null }, "typed"); });
  await p.waitForTimeout(300);
  r = await p.evaluate(async () => { catDlg(sheetCols(curSheet())[1].id); await new Promise(r => setTimeout(r, 200)); return { t: (document.querySelector(".toast") || {}).textContent || "", open: !!document.querySelector("#catRows") && !document.querySelector("#formModal").hidden }; });
  check("a column of 250 different values is refused in words, no dialog", /more than 200 different values/.test(r.t), JSON.stringify(r));
  // Junk from storage.
  r = await p.evaluate(() => { const mk = cat => { const c = makeCol("y", "Q", "", [1, 2]); c.cat = cat; cleanCat(c); return c.cat === undefined ? null : c.cat; };
    return [mk("asc"), mk({ order: "bogus" }), mk(null), mk({ order: "asc", levels: [1] }), mk({ order: "custom", levels: [1, "", null, {}, NaN, "b"] }), mk({ order: "custom", levels: "x" })]; });
  check("categories from storage in every broken form are cleaned", JSON.stringify(r) === '[null,null,null,{"order":"asc"},{"order":"custom","levels":[1,"b"]},{"order":"custom","levels":[]}]', JSON.stringify(r));
  // Kept across a reload.
  await p.evaluate(() => { const c = sheetCols(curSheet())[1]; pushUndo("x"); c.cat = { order: "desc" }; save({ cols: P().cols }, "cat"); }); await p.waitForTimeout(1200);
  await p.reload(); await ready(p); await p.waitForTimeout(400);
  r = await p.evaluate(() => sheetCols(curSheet())[1].cat || null);
  check("…and kept across a reload", r && r.order === "desc", JSON.stringify(r));
}, { name: "categorical" });

console.log("Graphs read text");
await page(async p => {
  // X, a Y, a column of doses as text (low, high, mid…), a column of names.
  await p.evaluate(() => { const x = [0, 1, 2, 3, 4, 5, 6, 7, 8], y = [1, 5, 3, 1.5, 5.5, 3.5, 0.5, 4.5, 2.5];
    const g = Object.assign(makeCol("ignore", "Dose", "", x.map(() => null)), { fmt: "text" }); g.txt = {}; ["low", "high", "mid", "low", "high", "mid", "low", "high", "mid"].forEach((t, i) => { g.txt[i] = t; }); TXT_OK.add(g.txt);
    const nm = Object.assign(makeCol("ignore", "Sample", "", x.map(() => null)), { fmt: "text" }); nm.txt = {}; x.forEach(i => { nm.txt[i] = "S" + (i + 1); }); TXT_OK.add(nm.txt);
    save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "Signal", "", y), { pipe: [], mask: [] }), g, nm], activeY: null }, "typed"); });
  await p.waitForTimeout(400);
  const ids = await p.evaluate(() => sheetCols(curSheet()).map(c => c.id));
  // Labels from a text column.
  await p.evaluate(ids => { plotCols([ids[1]], { quiet: true }); }, ids); await p.waitForTimeout(500);
  await p.evaluate(ids => { setCurveUse([ids[1]], { lab: ids[3] }, "labels"); }, ids); await p.waitForTimeout(400);
  let r = await p.$$eval("#plot g[data-plab] text", t => t.map(e => e.textContent));
  check("labels from a column of text write each point's name (S1 … S9)", r.length === 9 && r[0] === "S1" && r.includes("S9"), JSON.stringify(r));
  // Boxes grouped by the text column, in natural order, then by its categories' order.
  await p.evaluate(ids => { savePlot({ layout: "box", distBy: ids[2] }, "box"); renderAll(); }, ids); await p.waitForTimeout(400);
  const ticks = () => p.$$eval("#plot text", t => t.map(e => e.textContent).filter(s => /^(low|mid|high)$/.test(s)));
  r = await ticks();
  check("box charts grouped by a column of text: a box per value, named along X in natural order (high, low, mid)", JSON.stringify(r) === '["high","low","mid"]', JSON.stringify(r));
  await p.evaluate(ids => { const c = colById(ids[2]); pushUndo("x"); c.cat = { order: "custom", levels: ["low", "mid", "high"] }; save({ cols: P().cols }, "cat"); renderAll(); }, ids); await p.waitForTimeout(400);
  r = await ticks();
  check("…and in its categories' order once it is categorical (low, mid, high)", JSON.stringify(r) === '["low","mid","high"]', JSON.stringify(r));
  const opt = await p.evaluate(ids => distByOpts().map(o => [o.c.id, o.why]), ids);
  check("Grouped by offers the text columns", opt.some(o => o[0] === ids[2] && !o[1]) && opt.some(o => o[0] === ids[3]), JSON.stringify(opt));
  // A categorical X: each point at its level's place, named along X.
  await p.evaluate(ids => { savePlot({ layout: "overlay", distBy: null }, "back"); pushUndo("x"); colById(ids[2]).role = "x"; colById(ids[1]).xcol = ids[2]; save({ cols: P().cols }, "x"); renderAll(); }, ids); await p.waitForTimeout(500);
  r = await p.evaluate(ids => { const d = finalOf(colById(ids[1])); return { x: d.x, xn: d.xn, names: [...document.querySelectorAll("#plot text")].map(e => e.textContent).filter(s => /^(low|mid|high)$/.test(s)) }; }, ids);
  check("plotted against a categorical X, each point is at its level's place (low 1, mid 2, high 3)", JSON.stringify(r.x) === "[1,3,2,1,3,2,1,3,2]" && r.xn === "Dose", JSON.stringify(r));
  check("…and X is numbered by the names", JSON.stringify(r.names) === '["low","mid","high"]', JSON.stringify(r.names));
  await p.evaluate(() => { undo(); undo(); }); await p.waitForTimeout(300);
  // Plot setup's Group by: a curve per value, in a group.
  await p.evaluate(ids => { openPlotDlg([ids[1]]); }, ids); await p.waitForSelector("#psuBy");
  const byOpts = await p.$$eval("#psuBy option", o => o.map(e => e.textContent));
  check("Plot setup has Group by, offering the columns of text", byOpts.length === 3 && /Dose/.test(byOpts[1]) && /Sample/.test(byOpts[2]), JSON.stringify(byOpts));
  await p.selectOption("#psuBy", ids[2]); await p.click("#formOk"); await p.waitForTimeout(800);
  r = await p.evaluate(ids => { const g = graphOf(GID()), cs = graphCols(g.id); return { n: cs.length, names: cs.map(c => c.name), pts: cs.map(c => finalOf(c).x.length), grp: cs.map(c => curveUse(c.id, g.plot).grp), step: Object.values(g.plot.grps || {}).map(q => q.step), toast: (document.querySelector(".toast") || {}).textContent || "" }; }, ids);
  check("Group by makes a curve per value in the column's order (low, high, mid), named after it, its points those of its rows (3 each)", r.n === 3 && /\(low\)$/.test(r.names[0]) && /\(high\)$/.test(r.names[1]) && /\(mid\)$/.test(r.names[2]) && r.pts.every(n => n === 3), JSON.stringify(r));
  check("…the three one group stepping the colour, said in the message", new Set(r.grp).size === 1 && r.grp[0] && r.step[0] === "color" && /split by Dose/.test(r.toast), JSON.stringify(r));
  // The step follows the text: a cell changed moves a point between curves.
  await p.evaluate(ids => { const c = colById(ids[2]); pushUndo("x"); const t = Object.assign({}, c.txt); t[0] = "high"; c.txt = t; TXT_OK.add(t); save({ cols: P().cols }, "t"); renderAll(); }, ids); await p.waitForTimeout(400);
  r = await p.evaluate(() => graphCols(GID()).map(c => finalOf(c).x.length));
  check("…a cell of the category column changed moves its point to the other curve", JSON.stringify(r) === "[2,4,3]", JSON.stringify(r));
  await p.evaluate(() => { undo(); undo(); }); await p.waitForTimeout(400);
  r = await p.evaluate(() => allCols().filter(c => c.src).length);
  check("…and undone, the curves made are gone", r === 0, r);
}, { name: "graphs" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
