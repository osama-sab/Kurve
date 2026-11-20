/* qudi's confocal files and ImageJ's measurements (ux/spec/QUDI_SPEC.md), in the browser: files written as qudi's own code
   writes them (tools/ref/qudi, made by tools/ref/qudi_fixtures.py) imported by the Import button, several at once and dropped;
   the matrices, their positions, values and header fields read back against fixtures/qudi.json; plotted, undone, reloaded.
   Usage: node tools/qudi-drive.mjs [kurve.html]   (ONLY=Q.1 runs that section alone) */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const QD = join(here, "ref", "qudi"), CASES = JSON.parse(readFileSync(join(here, "ref", "fixtures", "qudi.json"), "utf8"));
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
  if (process.env.ONLY && opt.name !== process.env.ONLY) return;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), 240000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
const near = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i] || (v != null && b[i] != null && Math.abs(v - b[i]) <= 1e-12 * Math.max(1, Math.abs(b[i]))));
const want = (f) => CASES.find(c => c.file === f).want;
const file = (re) => CASES.find(c => re.test(c.file)).file;
// every matrix sheet of the project: name, book, its positions (as matXY gives them), values, labels and header fields
const MATS = (p) => p.evaluate(() => matAll().map(({ b, s }) => { const { X, Y } = matXY(s); return { book: b.name, bid: b.id, id: s.id, name: s.name, nx: s.nx, ny: s.ny, X, Y, z: s.z.slice(), xname: s.xname, xunit: s.xunit, yname: s.yname, yunit: s.yunit, zname: s.zname, zunit: s.zunit, meta: s.meta, rec: s.raw && s.raw.hist.length }; }));
const drop = (p, names) => p.evaluate(files => { const dt = new DataTransfer(); files.forEach(([n, t]) => dt.items.add(new File([t], n)));
  const at = $("#desk").getBoundingClientRect(), x = at.left + at.width / 2, y = at.top + at.height / 2;
  for (const t of ["dragenter", "dragover", "drop"]) window.dispatchEvent(new DragEvent(t, { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true })); }, names.map(n => [n, readFileSync(join(QD, n), "utf8")]));

console.log("Q.1 Reading qudi's files");
await page(async p => {
  // one classic image by the Import button: a matrix book, X and Y the header's ranges in µm, every value, the header kept, recorded
  const f1 = file(/0930-08_confocal_depth_image/), w1 = want(f1);
  await p.setInputFiles("#fileIn", join(QD, f1)); await p.waitForFunction(() => matAll().length >= 1, null, { timeout: 8000 }); await p.waitForTimeout(300);
  let m = await MATS(p), s = m[0];
  check("Import… a classic depth image: one book, its sheet named after the channel, X and Z the scan's positions in µm, every value", m.length === 1 && s.name === "Dev1Ctr1" && s.nx === w1.nx && s.ny === w1.ny && near(s.X, w1.x) && near(s.Y, w1.y) && near(s.z, w1.z) && s.xunit === "µm" && s.yname === "z position" && s.zunit === "c/s", JSON.stringify({ n: m.length, name: s && s.name, nx: s && s.nx, X: s && s.X.slice(0, 2) }));
  check("…every header field kept with the sheet, and a record entry: read from the file", Object.entries(w1.meta).every(([k, v]) => s.meta[k] === v) && s.meta.File === f1 && s.rec === 1, JSON.stringify(s.meta));
  check("…the matrix's window in front and a message to plot it", await p.evaluate(() => !!document.querySelector(".mxwin")) && /Plot it/.test(await p.evaluate(() => ($("#toast") || {}).textContent || "")));
  await p.evaluate(() => { const b = [...document.querySelectorAll("#toast button")].find(x => /Plot it/.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(600);
  const g = await p.evaluate(() => { const g = P().graphs[P().graphs.length - 1]; return g && { mat: g.plot.mat, layout: g.plot.layout }; });
  check("Plot it: a map of the matrix", g && g.mat === s.id && g.layout === "heat", JSON.stringify(g));
  const dims = await p.evaluate(id => { matDimsDlg(id); return new Promise(r => setTimeout(() => { const d = document.querySelector("#formBody .mxmeta"); r(d ? d.querySelectorAll("tr").length : -1); const m = $("#formModal"); m._cancel && m._cancel(); }, 300)); }, s.id);
  check("Dimensions and labels lists the header fields", dims === Object.keys(s.meta).length, dims);
  // several at once: a scan's two channels and its data file make one book of two sheets; the tilted scan's data file adds its z
  await p.setInputFiles("#fileIn", [file(/0930-46_confocal_xy_image_Dev1Ctr1/), file(/0930-46_confocal_xy_image_Dev1Ctr2/), file(/0930-46_confocal_xy_data/), file(/0930-45_confocal_xy_data/)].map(n => join(QD, n)));
  await p.waitForFunction(() => P().mats && P().mats.length >= 3, null, { timeout: 8000 }); await p.waitForTimeout(300);
  m = await MATS(p); const b46 = m.filter(x => /0930-46/.test(x.book)), b45 = m.filter(x => /0930-45/.test(x.book)), w46 = want(file(/0930-46_confocal_xy_image_Dev1Ctr2/)), w45 = want(file(/0930-45_confocal_xy_data/));
  check("four files chosen at once: the two channels of one scan in one book (the data file adding nothing they have; a name another matrix has made unique), positions from the header", b46.length === 2 && /^Dev1Ctr1_\d$/.test(b46[0].name) && b46[1].name === "Dev1Ctr2" && near(b46[1].z, w46.z) && near(b46[1].X, w46.x) && near(b46[1].Y, w46.y), JSON.stringify(b46.map(x => x.name)));
  check("…a scan's data file alone: the grid from its own positions, its channel, and z as a sheet of its own where it varies (a tilt)", b45.length === 2 && near(b45[0].X, w45.x) && near(b45[0].Y, w45.y) && near(b45[0].z, w45.sheets[0].z) && b45[1].zname === "z position" && near(b45[1].z, w45.sheets[1].z) && b45[1].zunit === "µm", JSON.stringify(b45.map(x => [x.name, x.zname])));
  check("…one undo step for them all", await p.evaluate(() => { const n = P().mats.length; undo(); const k = (P().mats || []).length; redo(); return n === 3 && k === 1 && P().mats.length === 3; }));
  // dropped: qudi-iqo-modules' scans, forward and back, a stopped scan with its empty lines, volts, a custom tag; a 1D scan as a table
  const iq = CASES.filter(c => c.gen === "iqo" && c.want.kind === "matrix").map(c => c.file);
  await drop(p, iq); await p.waitForFunction(n => P().mats && P().mats.length >= n, 3 + iq.length - 1, { timeout: 8000 }); await p.waitForTimeout(400);
  m = await MATS(p); let ok = true, bad = [];
  for (const f of iq) { const w = want(f), x = m.find(q => q.meta && q.meta.File === f);
    const good = x && x.nx === w.nx && x.ny === w.ny && near(x.X, w.x) && near(x.Y, w.y) && near(x.z, w.z) && x.xunit === w.xunit && x.xname === w.xname && Object.entries(w.meta).every(([k, v]) => x.meta[k] === v);
    if (!good) { ok = false; bad.push(f.slice(17, 60)); } }
  check(`${iq.length} new-format scans dropped: each a sheet with its axes' positions (a line of the file an X, turned to Kurve's columns), every value, missing where not scanned, the header`, ok, bad.join(" | "));
  const back = m.find(q => q.meta && /back_2D/.test(q.meta.File)), hole = m.find(q => q.meta && /SPCM_1/.test(q.meta.File));
  check("…the back scan says so, the stopped scan's lines not scanned are empty cells", back && /, back$/.test(back.zname) && hole && hole.z.filter(v => v == null).length === 2 * hole.ny, JSON.stringify([back && back.zname, hole && hole.z.filter(v => v == null).length]));
  const f1d = file(/1D-scan/), w1d = want(f1d);
  await p.setInputFiles("#fileIn", join(QD, f1d)); await p.waitForFunction(() => !$("#impModal").hidden, null, { timeout: 8000 }); await p.waitForTimeout(300);
  const im = await p.evaluate(() => ({ names: S.imp.res.headerRow, n: S.imp.res.rows.length, x: S.imp.res.cols[0].slice(0, 3) }));
  check("a 1D scan: the import dialog with its curve, X the axis's positions in µm", im.n === w1d.x.length && /x \(µm\)/.test(im.names[0]) && /APD events/.test(im.names[1]) && near(im.x, w1d.x.slice(0, 3)), JSON.stringify(im));
  await p.click("#impCancel").catch(() => p.keyboard.press("Escape")); await p.waitForTimeout(200);
  // a reload keeps them, header fields and all
  const before = await MATS(p); await p.reload(); await ready(p); await p.waitForTimeout(500); const after = await MATS(p);
  check("a reload: every matrix, its positions, values and header fields", after.length === before.length && after.every((a, i) => near(a.X, before[i].X) && near(a.z, before[i].z) && JSON.stringify(a.meta) === JSON.stringify(before[i].meta)));
  // what is not qudi's, or is refused
  await p.setInputFiles("#fileIn", { name: "broken.dat", mimeType: "text/plain", buffer: Buffer.from(readFileSync(join(QD, f1), "utf8").replace(/#Z image min: .*\n/, "")) }); await p.waitForTimeout(500);
  check("a classic image whose header lost its Z range: refused in words, nothing made", /lacks the image's X or Z range/.test(await p.evaluate(() => ($("#toast") || {}).textContent || "")) && (await MATS(p)).length === after.length);
}, { name: "Q.1" });

console.log("Q.2 A matrix for ImageJ");
// what ImageJ reads from a TIFF: Pillow's pixels and ImageJ's calibration, as tools/ref/ij_read.py works them out
const ijRead = (bytes) => { const d = mkdtempSync(join(tmpdir(), "kurve-ijd-")); writeFileSync(join(d, "m.tif"), bytes);
  try { return JSON.parse(execFileSync("python3.13", ["-I", join(here, "ref", "ij_read.py"), d], { encoding: "utf8" }))["m.tif"]; } finally { rmSync(d, { recursive: true, force: true }); } };
await page(async p => {
  const f = file(/0930-46_confocal_xy_image_Dev1Ctr1/), w = want(f);
  await p.setInputFiles("#fileIn", join(QD, f)); await p.waitForFunction(() => matAll().length >= 1, null, { timeout: 8000 }); await p.waitForTimeout(400);
  // the matrix window's Matrix menu: Save for ImageJ (.tif)
  await p.click(".mxwin [data-mxmenu]"); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click(".menu [role=menuitem]:has-text('Save for ImageJ')")]);
  const bytes = readFileSync(await dl.path()), name = dl.suggestedFilename();
  const same = await p.evaluate(b => { const s = matOf(matFront()), t = matTiff(s, { xunit: s.xunit, yunit: s.yunit, zunit: s.zunit, name: matBookOf(s.id).name }); return t.bytes.length === b.length && t.bytes.every((v, i) => v === b[i]); }, [...bytes]);
  check("the matrix window's Matrix › Save for ImageJ (.tif): the file is the matrix as matTiff writes it, named after its book", same && name === "Confocal_xy_20261118-0930-46.tif", name);
  const toastT = await p.evaluate(() => ($("#toast") || {}).textContent || "");
  const px = (w.x[1] - w.x[0]), py = (w.y[1] - w.y[0]), f6 = (v) => String(+v.toPrecision(6));
  check("…the message says its pixels, their size and single precision", toastT.includes(`${w.nx} × ${w.ny} pixels of ${f6(px)} µm by ${f6(py)} µm, the values as single precision`), toastT);
  const r = ijRead(bytes), X = w.x, Y = w.y.slice().reverse();
  const posErr = Math.max(...X.map((v, k) => Math.abs(r.ij.cx[k] - v) / Math.max(Math.abs(v), 4)), ...Y.map((v, k) => Math.abs(r.ij.cy[k] - v) / Math.max(Math.abs(v), 6)));
  check("…ImageJ's calibration from it: µm, every pixel's centre the qudi scan's position (to a part in 10¹⁵), inverted Y, the count rate's unit", r.ij.unit === "µm" && r.ij.yunit === "µm" && r.ij.vunit === "c/s" && r.ij.inv && posErr < 1e-15 && r.pil.mode === "F", JSON.stringify({ posErr, u: r.ij.unit, v: r.ij.vunit }));
  const zTop = []; for (let row = w.ny - 1; row >= 0; row--) for (let c = 0; c < w.nx; c++) zTop.push(Math.fround(w.z[row * w.nx + c]));
  check("…every value as single precision, the top row the largest Y", zTop.every((v, i) => v === r.pil.z[i]));
  // Publish › Matrix for ImageJ (.tif): the matrix in front
  await p.click(".mb[data-menu=publish]"); await p.waitForTimeout(150);
  const [dl2] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.click(".menu [role=menuitem]:has-text('Matrix for ImageJ')")]);
  check("Publish › Matrix for ImageJ (.tif): the same file", Buffer.compare(readFileSync(await dl2.path()), bytes) === 0);
  // a matrix whose X is not evenly spaced is refused in words, nothing saved
  await p.evaluate(() => { const s = matSheetNew({ nx: 3, ny: 2, x: { v: [0, 1, 3] }, y: { a: 0, b: 1 }, z: [1, 2, 3, 4, 5, 6] }, "Uneven"); matSaveNew([matBookNew(s, "Uneven")], { undo: "a test matrix", log: "made a test matrix" }); exportMatTiff(s.id); });
  await p.waitForTimeout(300);
  check("a matrix whose X is not evenly spaced: refused, saying why", /not evenly spaced/.test(await p.evaluate(() => ($("#toast") || {}).textContent || "")));
}, { name: "Q.2" });

console.log("Q.3 ImageJ's Measure");
await page(async p => {
  const f = file(/0930-46_confocal_xy_image_Dev1Ctr1/), w = want(f);
  await p.setInputFiles("#fileIn", join(QD, f)); await p.waitForFunction(() => matAll().length >= 1, null, { timeout: 8000 }); await p.waitForTimeout(400);
  const sid = await p.evaluate(() => matAll()[0].s.id);
  // the matrix window's Matrix › Measure (ImageJ)…: the whole matrix to begin with (one cell selected)
  await p.click(".mxwin [data-mxmenu]"); await p.waitForTimeout(150); await p.click(".menu [role=menuitem]:has-text('Measure (ImageJ)')"); await p.waitForSelector("#aQr");
  let r = await p.evaluate(() => ({ region: $("#aQr").value, msg: $("#aQmsg").textContent, edges: $("#aQx0").closest(".anarows").hidden, ok: $("#formOk").disabled }));
  check("Matrix › Measure (ImageJ)…: the whole matrix, the cells it holds and ImageJ's own selection said", r.region === "all" && r.msg === `${w.nx * w.ny} cells: in ImageJ, run("Select None");` && r.edges && !r.ok, JSON.stringify(r));
  // an oval inside the outer cells, the values as ImageJ holds them
  const ov = { x0: w.x[1], x1: w.x[w.nx - 2], y0: w.y[1], y1: w.y[w.ny - 2] };
  await p.selectOption("#aQr", "oval"); for (const [k, v] of Object.entries(ov)) await p.fill(`#aQ${k}`, String(v)); await p.check("#aQs"); await p.waitForTimeout(100);
  r = await p.evaluate(() => $("#aQmsg").textContent);
  check("…an oval: its cells and makeOval in ImageJ's pixels, the rows down from the largest Y", r.endsWith(`makeOval(1, 1, ${w.nx - 2}, ${w.ny - 2});`), r);
  await p.click("#formOk");
  await p.waitForFunction(() => { const a = anaList().find(x => x.kind === "ijmeasure"); return a && a.res && (a.res.report || a.res.err); }, null, { timeout: 15000 });
  const cmp = (kind) => p.evaluate((k) => { const a = anaList().filter(x => x.kind === "ijmeasure").slice(-1)[0], s = matOf(a.p.mat), r = ijMeasure(s, ijRegOf(a.p), { single: !!a.p.single }), col = q => (P().cols.find(c => c.ana === a.id && c.ak === q) || {}).data;
    const keys = ["n", "area", "mean", "sd", "mode", "min", "max", "x", "y", "xm", "ym", "bx", "by", "w", "h", "intden", "raw", "median", "skew", "kurt"], bad = keys.filter(q => { const v = (col(q) || [])[0]; return !(v === r[q] || (v == null && r[q] == null) || Math.abs(v - r[q]) <= 1e-12 * Math.max(1, Math.abs(r[q]))); });
    const hn = col("hn") || [], names = P().cols.filter(c => c.ana === a.id).map(c => c.name);
    return { err: a.res.err, bad, n: r.n, hsum: hn.reduce((t, v) => t + v, 0), bins: hn.length, hx: (P().cols.find(c => c.ana === a.id && c.ak === "hc") || {}).role, names: names.slice(0, 8), method: a.res.report && a.res.report.method }; }, kind);
  r = await cmp("oval");
  check("…the result sheet: ImageJ's columns under ImageJ's names with the matrix's units, each value ijMeasure's", !r.err && !r.bad.length && r.names.join() === "Cells,Area (µm²),Mean (c/s),StdDev (c/s),Mode (c/s),Min (c/s),Max (c/s),X (µm)", JSON.stringify([r.err, r.bad, r.names]));
  check("…the histogram in 256 bins counting every cell with a value, against the bins' centres", r.bins === 256 && r.hsum === r.n && r.hx === "x", JSON.stringify(r));
  check("…the method names ImageJ's definitions, single precision and the selection to make in ImageJ", /ImageJ 1\.54f's Analyze › Measure/.test(r.method) && /single precision/.test(r.method) && /makeOval\(1, 1,/.test(r.method), r.method);
  // the report's actions: the region on the matrix's map, the histogram as columns
  await p.evaluate(() => { const a = anaList().find(x => x.kind === "ijmeasure"); anaReport(a.id); }); await p.waitForTimeout(500);
  await p.click(`#w-res button[data-anaact="show"]`); await p.waitForTimeout(700);
  r = await p.evaluate((sid) => { const g = P().graphs.find(g => g.plot && g.plot.mat === sid), an = (P().annos || []).filter(a => a.g === (g && g.id)); return { g: !!g, an: an.map(a => a.t), xu: an[0] && an[0].xu, drawn: !!document.querySelector("#plot [data-anno] ellipse") }; }, sid);
  check("Show the region on its map: the matrix's map made, the oval drawn over it in the matrix's units", r.g && r.an.join() === "ellipse" && r.xu === "µm" && r.drawn, JSON.stringify(r));
  await p.evaluate(() => { const a = anaList().find(x => x.kind === "ijmeasure"); anaReport(a.id); }); await p.waitForTimeout(400);
  await p.click(`#w-res button[data-anaact="hist"]`); await p.waitForTimeout(700);
  r = await p.evaluate(() => { const g = P().graphs.slice(-1)[0], c = colById(g.cols[0]); return { ak: c && c.ak, type: g.plot.series && g.plot.series[g.cols[0]] && g.plot.series[g.cols[0]].type }; });
  check("Plot the histogram: the counts as columns on a graph", r.ak === "hn" && r.type === "column", JSON.stringify(r));
  // a polygon typed corner by corner, the values as they are
  await p.evaluate((sid) => { anaDlg("ijmeasure", { p: { mat: sid, region: "poly" } }); }, sid); await p.waitForSelector("#aQp");
  await p.fill("#aQp", `${w.x[0]} ${w.y[0]}\n${w.x[w.nx - 1]}, ${w.y[1]}\n${w.x[2]} ${w.y[w.ny - 1]}`); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ msg: $("#aQmsg").textContent, ok: $("#formOk").disabled }));
  check("a polygon's corners typed (spaces or a comma): its cells and makeSelection in ImageJ's pixels", /cells: in ImageJ, makeSelection\("polygon"/.test(r.msg) && !r.ok, JSON.stringify(r));
  await p.click("#formOk"); await p.waitForFunction(() => anaList().filter(x => x.kind === "ijmeasure").length === 2 && anaList()[anaList().length - 1].res, null, { timeout: 15000 });
  r = await cmp("poly");
  check("…every value ijMeasure's over the polygon, in doubles", !r.err && !r.bad.length && !/single precision/.test(r.method), JSON.stringify([r.err, r.bad]));
  // refusals in the dialog: a rectangle between two columns, a corner that is not a number
  await p.evaluate((sid) => { anaDlg("ijmeasure", { p: { mat: sid, region: "rect" } }); }, sid); await p.waitForSelector("#aQx0");
  const mid = (w.x[1] + w.x[2]) / 2;
  await p.fill("#aQx0", String(mid)); await p.fill("#aQx1", String(mid)); await p.fill("#aQy0", String(w.y[0])); await p.fill("#aQy1", String(w.y[w.ny - 1])); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ msg: $("#aQmsg").textContent, ok: $("#formOk").disabled }));
  check("a rectangle between two columns: refused in words, Work it out not offered", /holds no cell/.test(r.msg) && r.ok, JSON.stringify(r));
  await p.selectOption("#aQr", "poly"); await p.fill("#aQp", "1 2\nthree 4\n5 6"); await p.waitForTimeout(100);
  r = await p.evaluate(() => ({ msg: $("#aQmsg").textContent, ok: $("#formOk").disabled }));
  check("…a corner that is not two numbers, named", /"three 4" is not a corner/.test(r.msg) && r.ok, JSON.stringify(r));
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  // followed: a cell of the matrix changed, the measurement worked out again
  const before = await p.evaluate(() => (P().cols.find(c => c.ana === anaList()[0].id && c.ak === "max") || {}).data[0]);
  await p.evaluate((sid) => { matPut(sid, s => { const z = s.z.slice(); z[s.nx + 1] = 1e7; return Object.assign({}, s, { z }); }, { undo: "a test value", log: "typed a test value" }); }, sid); await p.waitForTimeout(800);
  r = await cmp("oval-after");
  const after = await p.evaluate(() => (P().cols.find(c => c.ana === anaList()[0].id && c.ak === "max") || {}).data[0]);
  check("a cell of the matrix changed: the measurement follows (its Max the new value)", before !== after && after === 1e7, JSON.stringify([before, after]));
  // Analyze › Image › Measure… from the menu bar
  await p.click(".mb[data-menu=analyze]"); await p.waitForTimeout(150); await p.hover(".menu [role=menuitem]:has-text('Image')"); await p.waitForTimeout(250);
  await p.click(".menu [role=menuitem]:has-text('Measure…')"); await p.waitForSelector("#aQr", { timeout: 4000 }).catch(() => {});
  check("Analyze › Image › Measure… opens the dialog on the matrix in front", await p.evaluate((sid) => !!$("#aQm") && $("#aQm").value === sid, sid));
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  await p.reload(); await ready(p); await p.waitForTimeout(800);
  r = await p.evaluate(() => anaList().filter(x => x.kind === "ijmeasure").map(a => !!(a.res && a.res.report) && !anaStale(a)));
  check("a reload: both measurements there, up to date", r.length === 2 && r.every(Boolean), JSON.stringify(r));
}, { name: "Q.3" });

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
