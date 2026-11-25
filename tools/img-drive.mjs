/* Images: a matrix seen and worked as ImageJ works an image (ux/spec/IMAGE_SPEC.md), in the browser. The NV scan of
   tools/ref/qudi/nv (spot_fixtures.py) imported by the Import button, then each slice's controls clicked and read back.
   Usage: node tools/img-drive.mjs [kurve.html]   (ONLY=I.1 runs that section alone) */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const NV = join(here, "ref", "qudi", "nv"), NVF = join(NV, readdirSync(NV).find(f => f.endsWith(".dat")));
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
  const ctx = await browser.newContext({ viewport: opt.vp || { width: 1440, height: 900 } }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), 240000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
const nv = async (p) => { await p.setInputFiles("#fileIn", NVF); await p.waitForFunction(() => matAll().length >= 1, null, { timeout: 8000 }); await p.waitForTimeout(400); return p.evaluate(() => matAll()[0].s.id); };

console.log("I.1 The map keeps its shape");
await page(async p => {
  const sid = await nv(p);
  await p.evaluate((sid) => plotMatrix(sid, "image"), sid); await p.waitForTimeout(600);
  // a cell's width and height on screen, from the drawing's own transforms, and the plot area
  const cell = () => p.evaluate(() => { const g = S.geo, s = matOf(g.mat), { X, Y } = matXYOf(s); return { w: Math.abs(g.X(X[1]) - g.X(X[0])), h: Math.abs(g.Y(Y[1]) - g.Y(Y[0])), pw: g.pw, mh: g.mh, v: g.v, view: S.view }; });
  const square = (c) => Math.abs(c.w - c.h) < 1e-6 * c.w;
  const shape = async (g) => { await p.evaluate((g) => { const id = winOfGraph(GID()), st = winState(id); st.g = g; st.max = false; applyWins(); }, g); await p.waitForTimeout(400); return cell(); };
  for (const [nm, g] of [["wide", [0.3, 0.55, 0.69, 0.4]], ["tall", [0.6, 0.02, 0.3, 0.95]], ["square", [0.3, 0.1, 0.5, 0.8]]]) {
    const c = await shape(g);
    check(`a ${nm} window: the scan's cells square (${c.w.toFixed(2)} × ${c.h.toFixed(2)} px), the whole scan in view, the plot area its shape`, square(c) && Math.abs(c.pw / c.mh - 1) < 1e-6 && Math.abs(c.v.x0 - 11.936507936507937) < 1e-9 && Math.abs(c.v.y1 - 5.063492063492063) < 1e-9, JSON.stringify(c)); }
  await shape([0.3, 0.55, 0.69, 0.4]);
  const box = await p.evaluate(() => { const r = document.querySelector("#plot").getBoundingClientRect(), g = S.geo; return { x: r.x + g.L, y: r.y + g.T, w: g.pw, h: g.mh }; });
  await p.evaluate(() => setMode("zoom"));
  // a box drawn: both of its ranges in view, the cells square, the window filled where the scan has cells
  await p.mouse.move(box.x + box.w * 0.3, box.y + box.h * 0.35); await p.mouse.down(); await p.mouse.move(box.x + box.w * 0.55, box.y + box.h * 0.6, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
  let c = await cell();
  check(`a box zoom: the box's X and Y in view, the cells still square (${c.w.toFixed(2)} px), the window filled (${c.pw.toFixed(0)} × ${c.mh.toFixed(0)} px)`, square(c) && c.v.x0 <= c.view.x0 + 1e-9 && c.v.x1 >= c.view.x1 - 1e-9 && c.v.y0 <= c.view.y0 + 1e-9 && c.v.y1 >= c.view.y1 - 1e-9 && c.pw > 2 * c.mh, JSON.stringify(c));
  // Alt+click zooms out a step; zoomed out past the scan it is the whole scan again
  const altClick = async () => { const b = await p.evaluate(() => { const r = document.querySelector("#plot").getBoundingClientRect(), g = S.geo; return { x: r.x + g.L + g.pw / 2, y: r.y + g.T + g.mh / 2 }; });
    await p.keyboard.down("Alt"); await p.mouse.click(b.x, b.y); await p.keyboard.up("Alt"); await p.waitForTimeout(500); };
  const w0 = c.w; await altClick(); c = await cell();
  check(`Alt+click with the Zoom tool zooms out a step about the point (a cell ${w0.toFixed(1)} → ${c.w.toFixed(1)} px)`, square(c) && Math.abs(c.w - w0 / 2) < 0.02 * w0, JSON.stringify(c));
  for (let i = 0; i < 4; i++) await altClick(); c = await cell();
  check("…and never past the whole scan: zoomed out far, there is no zoom at all", c.view == null && Math.abs(c.v.x1 - 20.063492063492063) < 1e-9, JSON.stringify(c));
  // a click without a drag zooms in a step about the point on a map (a square window, where neither axis has more to show)
  await shape([0.3, 0.1, 0.5, 0.8]);
  const b2 = await p.evaluate(() => { const r = document.querySelector("#plot").getBoundingClientRect(), g = S.geo, { X, Y } = matXYOf(matOf(g.mat)); return { x: r.x + g.X(X[40]), y: r.y + g.Y(Y[20]), X: X[40], Y: Y[20] }; });
  const wA = (await cell()).w; await p.mouse.click(b2.x, b2.y); await p.waitForTimeout(500); c = await cell();
  const under = await p.evaluate((b) => { const r = document.querySelector("#plot").getBoundingClientRect(), g = S.geo; return [g.X(b.X) + r.x - b.x, g.Y(b.Y) + r.y - b.y]; }, b2);
  check(`a click with the Zoom tool zooms in a step about the point (a cell ${wA.toFixed(1)} → ${c.w.toFixed(1)} px), the cell clicked staying under the pointer (${Math.hypot(...under).toFixed(1)} px: the margins are measured again for the new numbers)`, Math.abs(c.w - 2 * wA) < 0.05 * c.w && Math.hypot(...under) < 5, JSON.stringify([c, under]));
  // the keys: − out, + in, 0 the whole scan
  await p.focus("#plot"); const wB = (await cell()).w; await p.keyboard.press("-"); await p.waitForTimeout(300); c = await cell();
  check("− zooms a map out a step, both axes", square(c) && Math.abs(c.w - wB / 2) < 0.02 * wB, JSON.stringify(c));
  await p.keyboard.press("+"); await p.keyboard.press("+"); await p.waitForTimeout(300); c = await cell();
  check("+ zooms it in", square(c) && Math.abs(c.w - 2 * wB) < 0.02 * c.w, JSON.stringify(c));
  await p.keyboard.press("0"); await p.waitForTimeout(300); c = await cell();
  check("0 shows all of it", c.view == null && Math.abs(c.v.x0 - 11.936507936507937) < 1e-9, JSON.stringify(c));
  // a series' heat map keeps the window's shape (its axes are not one quantity)
  const heat = await p.evaluate(() => { const xs = [...Array(60).keys()], x = makeCol("x", "Shift", "", xs), ys = [0, 1, 2].map(k => makeCol("y", "S" + k, "", xs.map(v => Math.exp(-((v - 20 - 5 * k) ** 2) / 30))));
    save({ cols: P().cols.concat([x, ...ys]) }, "three spectra"); plotCols(ys.map(c => c.id), { layout: "heat" }); return new Promise(r => setTimeout(() => { const id = winOfGraph(GID()), st = winState(id); st.g = [0.3, 0.55, 0.69, 0.4]; st.max = false; applyWins();
      setTimeout(() => { const g = S.geo, r2 = document.querySelector("#plot").getBoundingClientRect(); r({ mat: !!g.mat, pw: g.pw, mh: g.mh, W: r2.width, H: r2.height }); }, 400); }, 500)); });
  check(`a map of a series still takes the window's shape (${heat.pw.toFixed(0)} × ${heat.mh.toFixed(0)} px in ${heat.W.toFixed(0)} × ${heat.H.toFixed(0)})`, !heat.mat && heat.pw / heat.mh > 2.5, JSON.stringify(heat));
}, { name: "I.1" });

console.log("I.2 The image view");
// the matrix window of the scan, its box and drawing: the magnification, the image's place, a cell's size, the cells in view
const fmtS = v => Number(v).toPrecision(4);
const mxw = (p) => p.evaluate(() => { const id = matWinIds()[0], el = $("#w-" + id), box = el.querySelector(".mximg"), g = box._g, st = mxSt(mxBid(id)), r = box.getBoundingClientRect();
  return { id, view: st.view, img: !box.closest(".mxiw").hidden, grid: !el.querySelector(".mxgrid").hidden, mag: st.mag, cx: st.cx, cy: st.cy, g, bx: r.x, by: r.y, W: r.width, H: r.height, dpr: devicePixelRatio,
    info: el.querySelector(".mxdim").textContent, magTxt: el.querySelector(".mxmag").textContent, read: el.querySelector(".mxread").textContent, r: st.r, c: st.c, er: st.er, ec: st.ec }; });
const win = async (p, g) => { await p.evaluate((g) => { const id = matWinIds()[0], st = winState(id); st.g = g; st.max = false; applyWins(); }, g); await p.waitForTimeout(350); return mxw(p); };
// where a cell is drawn, on the page
const cellAt = (p, r, c) => p.evaluate(([r, c]) => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), q = mxCellRect(box._g, r, c), b = box.getBoundingClientRect(); return { x: b.x + q.x + q.w / 2, y: b.y + q.y + q.h / 2, w: q.w, h: q.h, px: q.x, py: q.y }; }, [r, c]);
await page(async p => {
  const sid = await nv(p); let w = await mxw(p);
  check(`the scan opens as an image: the Image view, its line ImageJ's (“${w.info}”: 64 cells of 0.127 µm), the cells hidden`, w.view === "img" && w.img && !w.grid && /^8\.13 × 8\.13 µm \(64 × 64\); 64-bit, c\/s$/.test(w.info), JSON.stringify(w));
  // square cells, the whole image, a whole number of the screen's pixels a cell, at three window shapes
  for (const [nm, g] of [["wide", [0.25, 0.5, 0.7, 0.42]], ["tall", [0.6, 0.02, 0.3, 0.95]], ["square", [0.3, 0.1, 0.45, 0.75]]]) {
    await p.evaluate(() => mxZoomFit(matWinIds()[0])); w = await win(p, g); await p.evaluate(() => mxZoomFit(matWinIds()[0])); w = await mxw(p);
    const dev = w.g.mx * w.dpr, all = 64 * w.g.mx <= w.W + 1e-6 && 64 * w.g.my <= w.H + 1e-6, big = 64 * (w.g.mx + 1 / w.dpr) > Math.min(w.W, w.H);
    check(`a ${nm} window (${w.W.toFixed(0)} × ${w.H.toFixed(0)} px): Fit gives square cells of ${w.g.mx} px, a whole number of the screen's pixels, the whole scan and no larger whole size`, w.g.mx === w.g.my && Math.abs(dev - Math.round(dev)) < 1e-9 && all && big, JSON.stringify(w.g)); }
  // the window resized: the cells keep their size and shape
  const m0 = w.mag; w = await win(p, [0.2, 0.1, 0.7, 0.85]);
  check(`the window made larger: the cells keep their size (${m0} → ${w.g.mx} px) and shape, the image centred`, w.g.mx === m0 && w.g.my === m0 && Math.abs(w.g.tx - (w.W - 64 * m0) / 2) <= 1 && Math.abs(w.g.ty - (w.H - 64 * m0) / 2) <= 1, JSON.stringify(w.g));
  // what is drawn: X to the right and Y up; each cell's grey ImageJ's 8-bit index of its value
  const px = await p.evaluate(() => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, s = matOf(mxSt(mxBid(id)).sid), cv = box.querySelector("canvas"), ctx = cv.getContext("2d"), { X, Y } = matXYOf(s), d = mxDisp(s); let bad = 0, n = 0;
    for (const [r, c] of [[0, 0], [0, 63], [63, 0], [63, 63], [17, 41], [40, 9], [31, 32]]) { const q = mxCellRect(g, r, c), a = ctx.getImageData(Math.floor((q.x + q.w / 2) * g.dpr), Math.floor((q.y + q.h / 2) * g.dpr), 1, 1).data, k = ij8(s.z[r * s.nx + c], d.lo, d.hi); n++; if (a[0] !== k || a[1] !== k || a[2] !== k || a[3] !== 255) bad++; }
    const q0 = mxCellRect(g, 0, 0), q1 = mxCellRect(g, 63, 63); return { bad, n, left: q0.x < q1.x === X[0] < X[63], up: q0.y > q1.y === Y[0] < Y[63] }; });
  check(`each cell drawn in ImageJ's grey of its value (create8BitImage over the values' range: ${px.n - px.bad} of ${px.n}), X to the right and Y up`, px.bad === 0 && px.left && px.up, JSON.stringify(px));
  // the keys and buttons: ImageJ's levels
  await p.focus(`#w-${w.id} .mximg`); let lv = []; const mA = w.mag;
  await p.keyboard.press("+"); w = await mxw(p); lv.push(w.mag); await p.keyboard.press("+"); w = await mxw(p); lv.push(w.mag); await p.keyboard.press("-"); w = await mxw(p); lv.push(w.mag);
  const want = await p.evaluate((m) => [ijZoomUp(m), ijZoomUp(ijZoomUp(m)), ijZoomUp(m)], mA);
  check(`+ and − step through ImageJ's magnifications (${(mA * 100).toFixed(0)} % → ${lv.map(v => v * 100 + " %").join(" → ")}), shown on the bar (“${w.magTxt}”)`, JSON.stringify(lv) === JSON.stringify(want) && w.magTxt === w.mag * 100 + " %" && w.g.mx === w.g.my, JSON.stringify([lv, want, w.magTxt]));
  await p.click(`#w-${w.id} [data-mxz="out"]`); await p.click(`#w-${w.id} [data-mxz="out"]`); await p.click(`#w-${w.id} [data-mxz="out"]`); w = await mxw(p);
  check(`the − button zooms out a level each press (${(w.mag * 100).toFixed(1)} %)`, w.mag === await p.evaluate((m) => ijZoomDown(ijZoomDown(ijZoomDown(m))), lv[2]), w.mag);
  await p.click(`#w-${w.id} [data-mxz="menu"]`); await p.waitForTimeout(150); await p.locator(".menu [role=menuitemradio], .menu [role=menuitem]").filter({ hasText: /^100 %/ }).first().click(); await p.waitForTimeout(150); w = await mxw(p);
  check(`the magnification's list: 100 % draws a cell a pixel of the page`, w.mag === 1 && w.g.mx === 1, w.mag);
  // the wheel about the pointer, zoomed in past the window
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 16)); let a = await cellAt(p, 30, 36);
  await p.mouse.move(a.x + 2, a.y - 1); await p.mouse.wheel(0, -100); await p.waitForTimeout(150); w = await mxw(p); let b = await cellAt(p, 30, 36);
  const hov = await p.evaluate(() => mxImgAt($("#w-" + matWinIds()[0] + " .mximg")._g, ...(() => { const box = $("#w-" + matWinIds()[0] + " .mximg"), q = box._pt; return [q.x, q.y]; })()));
  check(`a turn of the wheel zooms in a level about the pointer (16 → ${w.mag}), the cell under it staying there (moved ${Math.hypot(b.x - a.x, b.y - a.y).toFixed(2)} px at ${(w.g.mx).toFixed(0)} px a cell)`, w.mag === 24 && hov && hov.r === 30 && hov.c === 36 && Math.hypot(b.x - a.x, b.y - a.y) < w.g.mx / 2, JSON.stringify([a, b, hov]));
  await p.mouse.wheel(0, 100); await p.mouse.wheel(0, 100); await p.waitForTimeout(150); w = await mxw(p);
  check(`and out by the wheel as easily (${w.mag})`, w.mag === 12, w.mag);
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 24));
  // the readout under the pointer
  b = await cellAt(p, 28, 40); await p.mouse.move(b.x, b.y); await p.waitForTimeout(80); w = await mxw(p);
  const rd = await p.evaluate(() => { const s = matOf(matFront()), { X, Y } = matXYOf(s); return { xn: s.xname, yn: s.yname, x: fmt(X[40], 6), y: fmt(Y[28], 6), v: fmt(s.z[28 * 64 + 40], 6) }; });
  check(`the readout under the pointer (“${w.read}”): X, Y, the value and its unit, row and column`, w.read.includes(`${rd.xn} ${rd.x} µm`) && w.read.includes(`${rd.yn} ${rd.y} µm`) && w.read.includes(`${rd.v} c/s`) && w.read.includes("row 29, column 41"), w.read);
  // a drag pans; the image kept in reach
  await p.click(`#w-${w.id} [data-mxt="hand"]`); await p.mouse.move(b.x, b.y);   // the Hand tool (Rectangle is ImageJ's first, I.4)
  const cx0 = w.cx; await p.mouse.down(); await p.mouse.move(b.x + 120, b.y + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100); w = await mxw(p);
  check(`a drag pans the image (${(cx0 - w.cx).toFixed(2)} cells for 120 px at ${w.mag} px a cell), selecting nothing`, Math.abs((cx0 - w.cx) - 120 / w.mag) < 0.02 && !(await p.evaluate(() => mxSt(mxBid(matWinIds()[0])).isel)), JSON.stringify([cx0, w.cx]));
  b = await cellAt(p, 32, 32); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + 3000, b.y + 3000, { steps: 10 }); await p.mouse.up(); w = await mxw(p);
  check(`dragged far, the image stops at its corner: it still covers the window (${w.g.tx.toFixed(0)}, ${w.g.ty.toFixed(0)})`, Math.abs(w.g.tx) < 1 && Math.abs(w.g.ty) < 1, JSON.stringify(w.g));
  // Fit: the button, 0 and a double click
  await p.click(`#w-${w.id} [data-mxz="fit"]`); w = await mxw(p); const fitm = w.mag;
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 24)); await p.focus(`#w-${w.id} .mximg`); await p.keyboard.press("0"); const k0 = (await mxw(p)).mag;
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 24)); b = await cellAt(p, 32, 32); await p.mouse.dblclick(b.x, b.y); await p.waitForTimeout(100); const kd = (await mxw(p)).mag;
  await p.click(`#w-${w.id} [data-mxt="rect"]`);
  check(`Fit, 0 and a double click each show the whole image again (${fitm}, ${k0}, ${kd} px a cell)`, fitm === k0 && k0 === kd && 64 * fitm <= w.W, JSON.stringify([fitm, k0, kd]));
  // a click selects a cell, Shift a rectangle; the arrows move it with Y up; Measure starts from it
  a = await cellAt(p, 10, 12); b = await cellAt(p, 14, 20); await p.mouse.click(a.x, a.y); await p.keyboard.down("Shift"); await p.mouse.click(b.x, b.y); await p.keyboard.up("Shift"); await p.waitForTimeout(100); w = await mxw(p);
  const foot = await p.evaluate(() => $("#w-" + matWinIds()[0] + " .mxsel").textContent);
  check(`a click and a Shift+click select a rectangle of cells (rows ${w.r + 1}–${w.er + 1}, columns ${w.c + 1}–${w.ec + 1}), counted in the foot (“${foot}”)`, w.r === 10 && w.c === 12 && w.er === 14 && w.ec === 20 && /^N 45 · mean/.test(foot), JSON.stringify([w.r, w.c, w.er, w.ec, foot]));
  const ijm = await p.evaluate(() => ijmStart(matFront()));
  const rx = await p.evaluate(() => { const { X, Y } = matXYOf(matOf(matFront())); return { x0: X[12], x1: X[20], y0: Y[10], y1: Y[14] }; });
  check(`Measure… starts from the cells selected on the image (${ijm.region}: X ${fmtS(ijm.x0)}–${fmtS(ijm.x1)}, Y ${fmtS(ijm.y0)}–${fmtS(ijm.y1)})`, ijm.region === "rect" && Math.abs(ijm.x0 - rx.x0) < 1e-9 && Math.abs(ijm.x1 - rx.x1) < 1e-9 && Math.abs(Math.min(ijm.y0, ijm.y1) - Math.min(rx.y0, rx.y1)) < 1e-9 && Math.abs(Math.max(ijm.y0, ijm.y1) - Math.max(rx.y0, rx.y1)) < 1e-9, JSON.stringify([ijm, rx]));
  await p.mouse.click(a.x, a.y); await p.keyboard.press("ArrowUp"); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(80); w = await mxw(p);
  const yup = await p.evaluate(([r0, r1]) => { const { Y } = matXYOf(matOf(matFront())); return Y[r1] > Y[r0]; }, [10, w.r]);
  check(`↑ moves the cell selected up the image, to a larger Y (row ${w.r + 1}), → to a larger X (column ${w.c + 1})`, yup && w.c === 13 && w.r !== 10, JSON.stringify([w.r, w.c]));
  // Cells and back: the cell selected kept; F2 types into it
  await p.click(`#w-${w.id} [data-mxv="cells"]`); await p.waitForTimeout(150); w = await mxw(p);
  const cur = await p.evaluate(() => { const td = $("#w-" + matWinIds()[0] + " .mxt td.cur"); return td ? [+td.dataset.r, +td.dataset.c] : null; });
  check(`Cells shows the grid at the cell selected on the image (${cur})`, w.grid && !w.img && cur && cur[0] === w.r && cur[1] === w.c, JSON.stringify([cur, w.r, w.c]));
  await p.click(`#w-${w.id} [data-mxv="img"]`); await p.waitForTimeout(150); await p.focus(`#w-${w.id} .mximg`); await p.keyboard.press("F2"); await p.waitForTimeout(150);
  const ed = await p.evaluate(() => { const el = $("#w-" + matWinIds()[0]); return { grid: !el.querySelector(".mxgrid").hidden, ed: !!el.querySelector(".mxed"), focus: document.activeElement && document.activeElement.classList.contains("mxed") }; });
  check("F2 on the image types into the cell selected, in the Cells view", ed.grid && ed.ed && ed.focus, JSON.stringify(ed));
  await p.keyboard.press("Escape"); await p.click(`#w-${w.id} [data-mxv="img"]`); await p.waitForTimeout(100);
  // the sheets' tabs as channels: another sheet of the same size keeps the zoom and the place
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 12, 100, 80)); const before = await mxw(p);
  await p.evaluate(() => matAddSheet(mxBid(matWinIds()[0]))); await p.waitForTimeout(300); const after = await mxw(p);
  await p.click(`#w-${w.id} .mxtabs [data-mxs]`); await p.waitForTimeout(200); const back = await mxw(p);
  check(`a second sheet of the scan's size (a channel) keeps the zoom and the place (${before.mag}, ${before.cx.toFixed(2)}, ${before.cy.toFixed(2)}), and so does going back`, after.mag === before.mag && after.cx === before.cx && after.cy === before.cy && back.mag === before.mag && back.cx === before.cx, JSON.stringify([before.mag, after.mag, back.mag, before.cx, after.cx, back.cx]));
}, { name: "I.2" });
await page(async p => {
  const sid = await nv(p); await p.waitForTimeout(400); let w = await mxw(p);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`at phone width the image has room (${w.W.toFixed(0)} × ${w.H.toFixed(0)} px), its cells square, the page no wider than the screen`, w.img && w.H > 180 && w.W > 300 && w.g.mx === w.g.my && ov <= 1, JSON.stringify([w.W, w.H, w.g && w.g.mx, ov]));
  // a pinch with two fingers zooms
  const m0 = w.mag, cdp = await p.context().newCDPSession(p), cx = w.bx + w.W / 2, cy = w.by + w.H / 2;
  const tp = (type, d) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }] });
  await tp("touchStart", 30); for (const d of [40, 50, 60]) await tp("touchMove", d); await tp("touchEnd", 60); await p.waitForTimeout(150); w = await mxw(p);
  check(`two fingers spread zoom in (${m0.toFixed(2)} → ${w.mag.toFixed(2)} px a cell), the cells still square`, w.mag > 1.6 * m0 && w.g.mx === w.g.my, JSON.stringify([m0, w.mag]));
}, { name: "I.2", vp: { width: 390, height: 844 } });

console.log("I.3 Lookup tables and contrast");
await page(async p => {
  const sid = await nv(p); await p.evaluate(() => { const id = matWinIds()[0], st = winState(id); st.g = [0.05, 0.05, 0.75, 0.85]; st.max = false; applyWins(); }); await p.waitForTimeout(300);
  const id = await p.evaluate(() => matWinIds()[0]);
  // the colours of a few cells as drawn, against ImageJ's table at ImageJ's 8-bit index of each
  const drawn = () => p.evaluate(() => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, s = matOf(mxSt(mxBid(id)).sid), d = matDispOf(s), ctx = box.querySelector("canvas").getContext("2d");
    const L = /^ij:/.test(d.lut) ? ijLut(d.lut.slice(3)) : mxLut(d.lut, false), T = d.inv ? ijLutInv(L) : L; let bad = 0, n = 0;
    for (const [r, c] of [[0, 0], [5, 60], [17, 41], [33, 20], [40, 9], [63, 63], [31, 32], [12, 50]]) { const q = mxCellRect(g, r, c); if (q.x < 0 || q.y < 0 || q.x + q.w > g.W || q.y + q.h > g.H) continue; const a = ctx.getImageData(Math.floor((q.x + q.w / 2) * g.dpr), Math.floor((q.y + q.h / 2) * g.dpr), 1, 1).data, k = ij8(s.z[r * s.nx + c], d.lo, d.hi); n++;
      if (a[0] !== T[3 * k] || a[1] !== T[3 * k + 1] || a[2] !== T[3 * k + 2]) bad++; } return { bad, n, lut: d.lut, inv: d.inv, lo: d.lo, hi: d.hi }; });
  // every table through the bar's list
  const names = await p.evaluate(() => IJ_LUTS.map(q => q[1])); let allOk = true, seen = [];
  for (const nm of names) { await p.click(`#w-${id} [data-mxlut]`); await p.waitForTimeout(80); await p.locator(".menu .mi").filter({ hasText: new RegExp("^" + nm.replace(/[/-]/g, "\\$&") + "$") }).first().click(); await p.waitForTimeout(80);
    const d = await drawn(); seen.push(d.lut); if (d.bad || d.n < 6) allOk = false; }
  check(`each of ImageJ's ${names.length} tables chosen from the bar's list, each cell drawn in its colour at ImageJ's index (${seen.length} tables, ${seen.join(" ")})`, allOk && new Set(seen).size === names.length, JSON.stringify(seen));
  await p.click(`#w-${id} [data-mxlut]`); await p.waitForTimeout(80); await p.locator(".menu .mi").filter({ hasText: /^Fire$/ }).first().click(); await p.waitForTimeout(80);
  await p.click(`#w-${id} [data-mxlut]`); await p.waitForTimeout(80); await p.locator(".menu .mi").filter({ hasText: /^Inverted$/ }).first().click(); await p.waitForTimeout(80);
  let d = await drawn(); const info = await p.evaluate(() => $("#w-" + matWinIds()[0] + " .mxdsp").textContent);
  check(`Inverted draws the table's colours in the other order (Fire inverted), said beside the size (“${info}”)`, d.inv && d.lut === "ij:fire" && !d.bad && /^Fire inverted · /.test(info), JSON.stringify([d, info]));
  const und = await p.evaluate(() => { undo(); const a = matDispOf(matOf(matFront())); undo(); const b = matDispOf(matOf(matFront())); redo(); redo(); return [a.lut, a.inv, b.lut]; });
  check(`each change of table one undo step (undone: ${und.join(", ")}), and redone`, und[0] === "ij:fire" && und[1] === false && und[2] !== "ij:fire", JSON.stringify(und));
  // the panel: C, its histogram and ends; Auto pressed three times as ImageJ's
  await p.focus(`#w-${id} .mximg`); await p.keyboard.press("c"); await p.waitForTimeout(150);
  const pan = await p.evaluate(() => { const b = $("#w-" + matWinIds()[0] + " .mxbc"); return { open: !b.hidden, ends: [...b.querySelectorAll(".bcends span")].map(e => e.textContent), bars: (b.querySelector(".bcbars").getAttribute("d").match(/M/g) || []).length }; });
  const H = await p.evaluate(() => { const H = ijHistOf(matOf(matFront())); return { min: H.min, max: H.max, nz: [...H.counts].filter(c => c > 0).length }; });
  check(`C opens Brightness and contrast beside the image: the histogram's ${pan.bars} bars (of ${H.nz} bins holding values), the range's ends (${pan.ends.join(" and ")})`, pan.open && pan.bars === H.nz && pan.ends.length === 2, JSON.stringify([pan, H]));
  const autos = []; for (let k = 0; k < 3; k++) { await p.click(`#w-${id} [data-bca="auto"]`); await p.waitForTimeout(120); autos.push(await p.evaluate(() => { const s = matOf(matFront()); return [s.disp.lo, s.disp.hi]; })); }
  const wantA = await p.evaluate(() => { const H = ijHistOf(matOf(matFront())); let a = 0; return [0, 1, 2].map(() => { a = ijAutoStep(a); const r = ijAuto(H, a); return r && [r.min, r.max]; }); });
  check(`Auto pressed three times saturates more each time, as ImageJ's (${autos.map(r => r.map(v => v.toFixed(1)).join("–")).join(", ")})`, JSON.stringify(autos) === JSON.stringify(wantA) && autos[2][1] < autos[0][1], JSON.stringify([autos, wantA]));
  d = await drawn(); check(`the image drawn at the range Auto set (${d.lo.toFixed(1)} to ${d.hi.toFixed(1)}), each cell at its index`, !d.bad && d.lo === autos[2][0] && d.hi === autos[2][1], JSON.stringify(d));
  // a slider moves the image as it goes and is one undo step when let go
  const before = await p.evaluate(() => JSON.stringify(matOf(matFront()).disp)), nu = await p.evaluate(() => undoStack.length);
  const sv = await p.evaluate(() => { const r = $("#w-" + matWinIds()[0] + " .mxbc [data-bck=max]"); r.value = String(Math.round(+r.max * 0.3)); r.dispatchEvent(new Event("input", { bubbles: true })); return +r.value; });
  const mid = await p.evaluate(() => ({ saved: JSON.stringify(matOf(matFront()).disp), pv: S.dispPv && S.dispPv.d.hi, drawn: matDispOf(matOf(matFront())).hi }));
  await p.evaluate(() => { const r = $("#w-" + matWinIds()[0] + " .mxbc [data-bck=max]"); r.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(150);
  const aft = await p.evaluate(([v]) => { const s = matOf(matFront()), H = ijHistOf(s), dmax = H.max, sr = ijBCRange(H.min, dmax, ...JSON.parse(localStorage.getItem("x") || "null") || [0, 0]); return { disp: s.disp, n: undoStack.length }; }, [sv]);
  const want = await p.evaluate(([v, b]) => { const s = matOf(matFront()), H = ijHistOf(s), d = JSON.parse(b), sr = ijBCRange(H.min, H.max, d.lo, d.hi); return ijBCSet("max", v, H.min, H.max, d.lo, d.hi, sr); }, [sv, before]);
  check(`Maximum moved: the image follows at once (${mid.drawn.toFixed(1)}) with nothing saved, and when let go one undo step saves ImageJ's adjustMax (${aft.disp.hi.toFixed(2)})`, mid.saved === before && mid.pv === mid.drawn && aft.disp.hi === want.max && aft.disp.lo === want.min && aft.n === nu + 1, JSON.stringify([mid, aft, want]));
  // Set… refuses a minimum above the maximum, and sets
  await p.click(`#w-${id} [data-bca="set"]`); await p.waitForTimeout(150); await p.fill("#bsLo", "9000"); await p.fill("#bsHi", "500"); await p.waitForTimeout(80); const dis = await p.isDisabled("#formOk"), bsMsg = await p.textContent("#bsMsg");
  await p.fill("#bsLo", "1000"); await p.fill("#bsHi", "20000"); await p.click("#formOk"); await p.waitForTimeout(150); d = await drawn();
  check(`Set… refuses a minimum above the maximum (“${bsMsg}”) and sets 1000 to 20000`, dis && /not above/.test(bsMsg) && d.lo === 1000 && d.hi === 20000 && !d.bad, JSON.stringify([dis, d]));
  // Enhance contrast 0.35 % as ImageJ's
  await p.click(`#w-${id} [data-bca="enh"]`); await p.waitForTimeout(150); await p.fill("#beSat", "0.35"); await p.click("#formOk"); await p.waitForTimeout(150); d = await drawn();
  const we = await p.evaluate(() => ijEnhance(ijHistOf(matOf(matFront())), 0.35));
  check(`Enhance contrast at 0.35 % saturated sets ImageJ's range (${d.lo.toFixed(2)} to ${d.hi.toFixed(2)})`, d.lo === we.min && d.hi === we.max && !d.bad, JSON.stringify([d, we]));
  // the check code untouched; the graph follows; a graph with its own colour map does not
  const fp = await p.evaluate(() => { const s = matOf(matFront()); return s.raw && s.raw.hist.length; });
  await p.evaluate(() => plotMatrix(matFront(), "image")); await p.waitForTimeout(600);
  const gr = await p.evaluate(() => { const s = matOf(matFront()), d = matDispOf(s), st = [...document.querySelectorAll("#plot linearGradient#cbar stop")].map(e => e.getAttribute("stop-color")); return { z: S.geo.heatZ, lo: d.lo, hi: d.hi, n: st.length, first: st[0], last: st[st.length - 1], want: cmapStops("~ij:fire") }; });
  check(`the matrix's graph follows its display: Fire inverted on its colour bar (${gr.n} stops), the range ${gr.z.map(v => v.toFixed(1)).join(" to ")}`, gr.z[0] === gr.lo && gr.z[1] === gr.hi && gr.n === 256 && gr.first === gr.want[0] && gr.last === gr.want[255], JSON.stringify(gr));
  await p.evaluate(() => setPlotKey("cmap", "viridis", "coloured the map viridis")); await p.waitForTimeout(300);
  const own = await p.evaluate(() => ({ z: S.geo.heatZ, R: matRangeOf(matOf(matFront()).z), n: document.querySelectorAll("#plot linearGradient#cbar stop").length }));
  check("a graph given a colour map of its own keeps it, over the values' range", own.n === 10 && own.z[0] === own.R.lo && own.z[1] === own.R.hi, JSON.stringify(own));
  check("the display is no change of the values: the original data's record has no entry for it", fp === 1, fp);
  // the TIFF's min and max, and the picture
  const saved = await p.evaluate(async () => { const got = []; const keep = saveFile; saveFile = async (n, b) => { got.push([n, b]); return true; };
    await exportMatTiff(matFront()); await mxSavePng(matFront()); saveFile = keep;
    const t = new Uint8Array(await got[0][1].arrayBuffer()), txt = new TextDecoder("latin1").decode(t), mm = [/min=([^\n]+)/.exec(txt)[1], /max=([^\n]+)/.exec(txt)[1]].map(Number);
    const bm = await createImageBitmap(got[1][1]), cv = document.createElement("canvas"); cv.width = bm.width; cv.height = bm.height; const g = cv.getContext("2d"); g.drawImage(bm, 0, 0);
    const s = matOf(matFront()), d = matDispOf(s), L = ijLutInv(ijLut("fire")), k = Math.max(1, Math.min(16, Math.round(800 / 64))), H = Math.max(64 * k, 120), y0 = Math.round((H - 64 * k) / 2);
    let bad = 0; for (const [r, c] of [[0, 0], [17, 41], [63, 63], [30, 30]]) { const a = g.getImageData(c * k + k / 2, y0 + (63 - r) * k + k / 2, 1, 1).data, q = ij8(s.z[r * 64 + c], d.lo, d.hi); if (a[0] !== L[3 * q] || a[1] !== L[3 * q + 1] || a[2] !== L[3 * q + 2]) bad++; }
    return { mm, lo: d.lo, hi: d.hi, w: bm.width, h: bm.height, k, bad, names: got.map(q => q[0]) }; });
  check(`the TIFF for ImageJ carries the range shown as its min and max (${saved.mm.join(", ")})`, saved.mm[0] === saved.lo && saved.mm[1] === saved.hi, JSON.stringify(saved));
  check(`Save the image as PNG: ${saved.w} × ${saved.h} px, each cell ${saved.k} × ${saved.k} pixels of its colour, a calibration bar beside it`, saved.bad === 0 && saved.w > 64 * saved.k + 30 && saved.h === 64 * saved.k, JSON.stringify(saved));
  // kept with the project
  await p.evaluate(() => flushEdits()); await p.waitForTimeout(800); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const rl = await p.evaluate(() => { const s = matAll()[0].s; return s.disp; });
  check(`the display is kept with the matrix across a reload (${JSON.stringify(rl)})`, rl && rl.lut === "ij:fire" && rl.inv === true && Number.isFinite(rl.lo), JSON.stringify(rl));
  const junk = await p.evaluate(() => { const p0 = cloneProj(P()); p0.mats[0].sheets[0].disp = { lut: "nonsense", inv: "yes", lo: "a", hi: 5 }; matClean(p0); const a = p0.mats[0].sheets[0].disp;
    const p1 = cloneProj(P()); p1.mats[0].sheets[0].disp = { lut: "~ij:fire", lo: 9, hi: 2 }; matClean(p1); return [a, p1.mats[0].sheets[0].disp]; });
  check(`a display read from storage in a broken form is cleaned (${JSON.stringify(junk)})`, junk[0].lut === "ij:grays" && !("inv" in junk[0]) && !("lo" in junk[0]) && junk[1].lut === "ij:grays" && !("lo" in junk[1]), JSON.stringify(junk));
}, { name: "I.3" });

console.log("I.4 Selections and the ROI Manager");
await page(async p => {
  const sid = await nv(p); await p.evaluate(() => { const id = matWinIds()[0], st = winState(id); st.g = [0.03, 0.03, 0.8, 0.9]; st.max = false; applyWins(); }); await p.waitForTimeout(300);
  const id = await p.evaluate(() => matWinIds()[0]), W = `#w-${id}`;
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 8)); await p.waitForTimeout(100);
  const tools = await p.evaluate(s => [...document.querySelectorAll(s + " [data-mxt]")].map(b => [b.dataset.mxt, b.getAttribute("aria-checked")]), W);
  check(`six of ImageJ's tools on the image's bar, Rectangle chosen (${tools.map(t => t[0]).join(", ")})`, tools.length === 6 && tools.find(t => t[0] === "rect")[1] === "true", JSON.stringify(tools));
  const st = () => p.evaluate(() => { const s = mxSt(mxBid(matWinIds()[0])); return { r: s.r, c: s.c, er: s.er, ec: s.ec, roi: s.roi, draft: s.draft, roiId: s.roiId, tool: s.tool }; });
  const drag = async (a, b, steps = 8) => { await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(b.x, b.y, { steps }); await p.mouse.up(); await p.waitForTimeout(80); };
  // a rectangle dragged over cells
  let a = await cellAt(p, 40, 20), b = await cellAt(p, 34, 28); await drag(a, b); let q = await st();
  check(`Rectangle: a drag from one cell to another selects the cells between (rows ${Math.min(q.r, q.er) + 1}–${Math.max(q.r, q.er) + 1}, columns ${Math.min(q.c, q.ec) + 1}–${Math.max(q.c, q.ec) + 1}), with ImageJ's eight handles`,
    q.roi && q.roi.kind === "rect" && q.r === 40 && q.c === 20 && q.er === 34 && q.ec === 28 && (await p.evaluate(() => { const id = matWinIds()[0]; return mxHandles($("#w-" + id + " .mximg")._g, mxSt(mxBid(id)), matOf(matFront())).length; })) === 8, JSON.stringify(q));
  // its south-east handle and a move
  const hs = await p.evaluate(() => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), r = box.getBoundingClientRect(); return mxHandles(box._g, mxSt(mxBid(id)), matOf(matFront())).map(h => ({ k: h.k, x: r.x + h.x, y: r.y + h.y, mx: box._g.mx })); });
  const se = hs.find(h => h.k === "se"); await drag({ x: se.x, y: se.y }, { x: se.x + 3 * se.mx, y: se.y + 2 * se.mx }); q = await st();
  check(`its corner handle dragged three cells right and two down: the columns to ${Math.max(q.c, q.ec) + 1}, the rows from ${Math.min(q.r, q.er) + 1} (Y up)`, Math.max(q.c, q.ec) === 31 && Math.min(q.r, q.er) === 32 && Math.max(q.r, q.er) === 40 && Math.min(q.c, q.ec) === 20, JSON.stringify(q));
  a = await cellAt(p, 36, 24); await drag(a, { x: a.x + 2 * se.mx, y: a.y }); q = await st();
  check("dragged from inside, the rectangle moves two cells right whole", Math.min(q.c, q.ec) === 22 && Math.max(q.c, q.ec) === 33 && Math.min(q.r, q.er) === 32, JSON.stringify(q));
  await p.focus(`${W} .mximg`); await p.keyboard.press("ArrowUp"); await p.keyboard.press("ArrowLeft"); q = await st();
  check("↑ and ← move it a cell up the image (a larger Y) and left", Math.min(q.r, q.er) === 33 && Math.max(q.r, q.er) === 41 && Math.min(q.c, q.ec) === 21, JSON.stringify(q));
  // M: kept and measured into the book's Results, one undo step
  const n0 = await p.evaluate(() => undoStack.length); await p.keyboard.press("m"); await p.waitForTimeout(400);
  const m1 = await p.evaluate(() => { const b = matBooks()[0], a = anaList().find(x => x.kind === "ijrois"), s = matOf(matFront()), { X, Y } = matXYOf(s), st = mxSt(b.id), q = mxSel(st);
    const want = ijMeasure({ nx: s.nx, ny: s.ny, xs: X, ys: Y, z: s.z }, { kind: "rect", x0: X[q.c0], x1: X[q.c1], y0: Y[q.r0], y1: Y[q.r1] }, {});
    const col = k => P().cols.find(c => c.ana === (a && a.id) && c.ak === k); return { rois: (b.rois || []).map(r => r.name), a: a && a.name, mean: col("mean") && col("mean").data[0], n: col("n") && col("n").data[0], want: [want.mean, want.n], u: undoStack.length }; });
  check(`M keeps the rectangle (${m1.rois.join(", ")}) and measures it into ${m1.a}, ImageJ's Measure (mean ${m1.mean && m1.mean.toFixed(3)} of ${m1.n} cells), one undo step`, m1.rois.length === 1 && m1.mean === m1.want[0] && m1.n === m1.want[1] && m1.u === n0 + 1, JSON.stringify(m1));
  // an oval, then the dialog of Measure starting from it
  await p.click(`${W} [data-mxt="oval"]`); a = await cellAt(p, 20, 40); b = await cellAt(p, 12, 50); await drag(a, b);
  const om = await p.evaluate(() => ijmStart(matFront()));
  check(`Oval: a drag selects an oval, and Measure's dialog starts from it (${om.region}, X ${om.x0}–${om.x1})`, om.region === "oval" && om.x0 < om.x1 && om.y0 < om.y1, JSON.stringify(om));
  // a polygon clicked corner by corner, finished by Enter
  await p.click(`${W} [data-mxt="poly"]`); const corners = [[30, 10], [30, 20], [22, 22], [20, 12]]; for (const [r, c] of corners) { const t = await cellAt(p, r, c); await p.mouse.click(t.x, t.y); await p.waitForTimeout(60); }
  await p.keyboard.press("Enter"); q = await st(); const pm = await p.evaluate(() => ijmStart(matFront()));
  const pv = await p.evaluate((pts) => { const s = matOf(matFront()), { X, Y } = matXYOf(s); const r = ijMeasure({ nx: s.nx, ny: s.ny, xs: X, ys: Y, z: s.z }, { kind: "poly", pts }, {}); return [r.n, r.mean]; }, pm.pts || []);
  check(`Polygon: four corners clicked and Enter (${q.roi && q.roi.pts.length} corners), Measure's dialog starts from them (${pv[0]} cells inside)`, q.roi && q.roi.kind === "poly" && q.roi.pts.length === 4 && pm.region === "poly" && pm.pts.length === 4 && pv[0] > 20, JSON.stringify([q.roi, pm, pv]));
  await p.keyboard.press("t"); await p.waitForTimeout(200);
  // a straight line and K: the profile worked out and plotted at once
  await p.click(`${W} [data-mxt="line"]`); a = await cellAt(p, 50, 5); b = await cellAt(p, 50, 58); await drag(a, b); q = await st();
  await p.focus(`${W} .mximg`); const g0 = await p.evaluate(() => (P().graphs || []).length); await p.keyboard.press("k"); await p.waitForTimeout(500);
  const pk = await p.evaluate(() => { const a = anaList().filter(x => x.kind === "ijprofile").pop(), s = matOf(matFront()), r = mxSt(mxBid(matWinIds()[0])).roi, { X, Y } = matXYOf(s);
    const want = ijProfile({ nx: s.nx, ny: s.ny, xs: X, ys: Y, z: s.z }, { x0: a.p.x0, y0: a.p.y0, x1: a.p.x1, y1: a.p.y1 }), v = P().cols.find(c => c.ana === a.id && c.ak === "v");
    return { n: want.n, same: v && want.v.every((x, i) => x === v.data[i]), ends: [a.p.x0, a.p.x1, r.x0, r.x1].map(t => +t.toPrecision(10)), graphs: (P().graphs || []).length }; });
  check(`Straight line and K: the line's profile worked out (${pk.n} samples, Plot Profile's) and plotted at once`, pk.same && pk.graphs === g0 + 1 && Math.abs(pk.ends[0] - pk.ends[2]) < 1e-9 && Math.abs(pk.ends[1] - pk.ends[3]) < 1e-9, JSON.stringify(pk));
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(200);
  // points, kept and measured
  await p.click(`${W} [data-mxt="point"]`); for (const [r, c] of [[5, 5], [10, 40], [60, 60]]) { const t = await cellAt(p, r, c); await p.mouse.click(t.x, t.y); await p.waitForTimeout(50); }
  q = await st(); await p.focus(`${W} .mximg`); await p.keyboard.press("m"); await p.waitForTimeout(400);
  const pm2 = await p.evaluate(() => { const a = anaList().find(x => x.kind === "ijrois"), s = matOf(matFront()), cc = k => P().cols.find(c => c.ana === a.id && c.ak === k), nmc = cc("nm"), mean = cc("mean").data;
    const rows = mean.map((v, i) => [cellTxt(nmc, i), v]).filter(r => /^Points/.test(r[0] || "")); return { rows, want: [[5, 5], [10, 40], [60, 60]].map(([r, c]) => s.z[r * s.nx + c]), rois: matBooks()[0].rois.map(r => r.name) }; });
  check(`Points: three clicked, M measures each point's value (${pm2.rows.map(r => r[1]).join(", ")}) beside the selections kept (${pm2.rois.join(", ")})`, q.roi && q.roi.pts.length === 3 && JSON.stringify(pm2.rows.map(r => r[1])) === JSON.stringify(pm2.want) && pm2.rois.length === 3, JSON.stringify(pm2));
  // the ROI Manager: its list, a row shown, renamed, deleted and undone, Show all
  if (await p.getAttribute(`${W} [data-mxrm]`, "aria-pressed") !== "true") await p.click(`${W} [data-mxrm]`); await p.waitForTimeout(150); const rows = await p.evaluate(s => [...document.querySelectorAll(s + " .roirow .rl")].map(e => e.textContent), W);
  await p.click(`${W} .roirow >> nth=0`); await p.waitForTimeout(150); q = await st();
  check(`the ROI Manager lists the selections kept (${rows.join(", ")}); a click shows the first on the image`, rows.length === 3 && q.roi && q.roi.kind === "rect" && Math.min(q.c, q.ec) === 21, JSON.stringify([rows, q]));
  await p.dblclick(`${W} .roirow >> nth=1`); await p.waitForTimeout(200); await p.fill("#rnN", "Background"); await p.click("#formOk"); await p.waitForTimeout(200);
  const rn = await p.evaluate(() => matBooks()[0].rois.map(r => r.name));
  await p.click(`${W} .roirow >> nth=2`); await p.click(`${W} [data-rma="del"]`); await p.waitForTimeout(200); const dl = await p.evaluate(() => matBooks()[0].rois.length); await p.evaluate(() => undo()); await p.waitForTimeout(200); const ud = await p.evaluate(() => matBooks()[0].rois.length);
  check(`a double click renames one (${rn[1]}); Delete takes one away (${dl} left) and undo brings it back (${ud})`, rn[1] === "Background" && dl === 2 && ud === 3, JSON.stringify([rn, dl, ud]));
  await p.click(`${W} [data-rmall]`); await p.waitForTimeout(150);
  const cy = await p.evaluate(() => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, r = matBooks()[0].rois[1], ctx = box.querySelector("canvas").getContext("2d"); let n = 0;
    for (const q of r.pts) { const t = mxD2S(g, q[0], q[1]); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = ctx.getImageData(Math.round((t.x + dx) * g.dpr), Math.round((t.y + dy) * g.dpr), 1, 1).data; if (a[0] < 40 && a[1] > 200 && a[2] > 200) { n++; dx = dy = 2; } } } return n; });
  check(`Show all draws the other selections in ImageJ's cyan (the polygon's corners: ${cy} of 4)`, cy >= 3, cy);
  // the Results follow the matrix
  const before = await p.evaluate(() => { const a = anaList().find(x => x.kind === "ijrois"); return P().cols.find(c => c.ana === a.id && c.ak === "max").data[0]; });
  await p.evaluate(() => { const st = mxSt(mxBid(matWinIds()[0])), q = mxSel(st); mxWrite(st.sid, [[q.r0, q.c0, 999999]], "typed into a cell"); }); await p.waitForTimeout(500);
  const after = await p.evaluate(() => { const a = anaList().find(x => x.kind === "ijrois"); return P().cols.find(c => c.ana === a.id && c.ak === "max").data[0]; });
  check(`the Results follow the matrix: a value typed into the rectangle and its Max is ${after}`, before !== 999999 && after === 999999, JSON.stringify([before, after]));
  // results on the image: Find maxima's crosses in cyan, switched off
  await p.focus(`${W} .mximg`); await p.keyboard.press("Escape");
  const aidx = await p.evaluate(() => anaMakeTyped("ijmaxima", Object.assign(ijxStart(matFront()), { prom: 3000 }), {})); await p.evaluate(() => { focusWin(matWinIds()[0]); renderMatWin(matWinIds()[0]); }); await p.waitForTimeout(300);
  const ov = await p.evaluate(() => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, a = anaList().find(x => x.kind === "ijmaxima"), ctx = box.querySelector("canvas").getContext("2d");
    const cyan = (x, y) => { const d = ctx.getImageData(Math.floor(Math.round(x) * g.dpr), Math.floor(Math.round(y) * g.dpr), 1, 1).data; return d[0] < 40 && d[1] > 200 && d[2] > 200; };
    let n = 0, m = 0; for (const q of a.res.report.ijx.pts.slice(0, 8)) { const t = mxD2S(g, q[0], q[1]); if (t.x < 4 || t.y < 4 || t.x > g.W - 4 || t.y > g.H - 4) continue; m++; if (cyan(t.x + 3, t.y) || cyan(t.x, t.y + 3)) n++; }
    mxSt(mxBid(id)).ov = false; mxImgDraw(id); let k = 0; for (const q of a.res.report.ijx.pts.slice(0, 8)) { const t = mxD2S(g, q[0], q[1]); if (cyan(t.x + 3, t.y) || cyan(t.x, t.y + 3)) k++; } mxSt(mxBid(id)).ov = true; mxImgDraw(id); return { n, m, k }; });
  check(`Find maxima's maxima drawn on the image as ImageJ's cyan crosses (${ov.n} of ${ov.m} in view), gone when Results on the image is off`, ov.m > 3 && ov.n === ov.m && ov.k === 0, JSON.stringify(ov));
  // Escape lets go; Ctrl+A selects every cell
  await p.focus(`${W} .mximg`); await p.keyboard.press("Escape"); q = await st(); await p.keyboard.press("Control+a"); const qa = await st();
  check("Esc lets go of the selection, Ctrl+A selects every cell as a rectangle", !q.roi && qa.roi && qa.roi.kind === "rect" && Math.max(qa.r, qa.er) === 63 && Math.max(qa.c, qa.ec) === 63, JSON.stringify([q, qa]));
  // kept with the book
  await p.evaluate(() => flushEdits()); await p.waitForTimeout(800); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const rl = await p.evaluate(() => matBooks()[0].rois.map(r => [r.name, r.kind]));
  const jk = await p.evaluate(() => { const p0 = cloneProj(P()); p0.mats[0].rois = [{ id: "x", kind: "rect", x0: 1, x1: "a", y0: 0, y1: 1 }, { id: "y", kind: "blob" }, { id: "z", kind: "poly", pts: [[1, 2], [3, 4]] }, { id: "w", kind: "point", pts: [[1, 2], ["q", 3]] }, null]; matClean(p0); return p0.mats[0].rois; });
  check(`the selections are kept with the book across a reload (${rl.map(r => r[0]).join(", ")}), and broken ones from storage cleaned`, rl.length === 3 && rl[1][0] === "Background" && jk.length === 1 && jk[0].id === "w" && jk[0].pts.length === 1, JSON.stringify([rl, jk]));
}, { name: "I.4" });

console.log("I.5 Process");
await page(async p => {
  const sid = await nv(p); await p.evaluate(() => { const id = matWinIds()[0], st = winState(id); st.g = [0.03, 0.03, 0.62, 0.9]; st.max = false; applyWins(); }); await p.waitForTimeout(300);
  const id0 = await p.evaluate(() => matWinIds()[0]), W = `#w-${id0}`;
  // the menu by its items' names, a submenu opened by a click on its name
  const pick = async (btn, ...path) => { await p.click(btn); await p.waitForTimeout(120);
    for (const nm of path) { await p.locator(".menu .mi").filter({ hasText: new RegExp("^" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).last().click(); await p.waitForTimeout(150); } };
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i] || v == null && b[i] == null);
  const want = (src, o) => p.evaluate(([src, o]) => { const s = matOf(src), { X, Y } = matXYOf(s); const r = ijProcess({ nx: s.nx, ny: s.ny, xs: Array.from(X), ys: Array.from(Y), z: s.z }, o); return r.fail || r.z; }, [src, o]);
  const last = () => p.evaluate(() => { const a = anaList().filter(x => x.kind === "ijproc").pop(), s = a && anaMatSheet(a); return a && { aid: a.id, name: a.name, sid: s && s.id, sname: s && s.name, z: s && s.z, ana: s && s.ana, disp: s && s.disp, zname: s && s.zname, zunit: s && s.zunit, front: frontWinId(), win: s && mxWinId(a.out.mat), err: a.res && a.res.err }; });
  await p.evaluate(sid => matDispSet(sid, { lut: "ij:fire" }), sid); await p.waitForTimeout(100);
  const items = await p.evaluate(() => ijProcItems(matFront()).filter(x => x && x !== "-").map(x => x.label));
  check(`the image's bar has Process, ImageJ's menu (${items.join(", ")})`, await p.isVisible(`${W} [data-mxproc]`) && items.join("|") === "Smooth|Sharpen|Find edges|Gaussian blur…|Unsharp mask…|Binary|Subtract background…|Filters|Math", JSON.stringify(items));
  // Smooth: at once, a new matrix in its window, ImageJ's values, the source's lookup table, one undo step
  const u0 = await p.evaluate(() => undoStack.length); await pick(`${W} [data-mxproc]`, "Smooth"); await p.waitForTimeout(400); let r = await last();
  let w = await want(sid, { op: "smooth" });
  check(`Smooth makes ${r.sname}, a new matrix of ImageJ's values, in its own window in front, with the source's lookup table, one undo step`, r && same(r.z, w) && r.ana === r.aid && r.front === r.win && r.disp && r.disp.lut === "ij:fire" && !Number.isFinite(r.disp.lo) && await p.evaluate(() => undoStack.length) === u0 + 1, JSON.stringify([r && r.sname, r && r.front, r && r.win, r && r.disp]));
  const smooth = r;
  // Gaussian blur… through its dialog: sigma in the scan's unit
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  await pick(`${W} [data-mxproc]`, "Gaussian blur"); await p.waitForTimeout(200);
  const g0 = await p.evaluate(() => ({ title: $("#formTitle") && $("#formTitle").textContent, s: $("#aIPs").value, shown: [...document.querySelectorAll("#formBody [data-ipr]")].filter(e => !e.hidden).map(e => e.dataset.ipr) }));
  await p.fill("#aIPs", "0"); await p.waitForTimeout(80); const bad0 = [await p.isDisabled("#formOk"), await p.textContent("#aIPmsg")];
  await p.fill("#aIPs", "2"); await p.check("#aIPu"); await p.waitForTimeout(80); const conv = await p.inputValue("#aIPs");
  await p.fill("#aIPs", "0.25"); await p.waitForTimeout(80); const gm = await p.textContent("#aIPmsg");
  check(`its dialog (${g0.title}) starts at sigma ${g0.s} with only the Gaussian's fields, refuses 0 ("${bad0[1]}"); Scaled units turns 2 cells into ${conv} µm, and says the sigma in cells for 0.25 µm ("${gm}")`, g0.title === "Gaussian blur (ImageJ)" && conv === "0.254" && g0.s === "2" && [...new Set(g0.shown)].sort().join("") === "ksu" && bad0[0] && /above 0/.test(bad0[1]) && /1\.969 cells along X, 1\.969 along Y/.test(gm), JSON.stringify([g0, bad0, gm]));
  await p.click("#formOk"); await p.waitForTimeout(500); r = await last();
  const pw = await p.evaluate(sid => { const s = matOf(sid); return ijGeom(s.x, s.y, s.nx, s.ny).pw; }, sid);
  w = await want(sid, { op: "gauss", sigma: 0.25 / pw });
  check(`…and makes ${r.name}: ImageJ's Gaussian Blur with sigma 0.25 µm scaled, every cell; the method gives ImageJ's command`, same(r.z, w) && await p.evaluate(aid => /run\("Gaussian Blur\.\.\.", "sigma=0\.25 scaled"\)/.test(anaOf(aid).res.report.method), r.aid), r.name);
  // Filters › Median… and Math › Log, Math › NaN background…
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  await pick(`${W} [data-mxproc]`, "Filters", "Median"); await p.waitForTimeout(200); await p.fill("#aIPr", "200"); await p.waitForTimeout(80); const rb = [await p.isDisabled("#formOk"), await p.textContent("#aIPmsg")];
  await p.fill("#aIPr", "2"); await p.waitForTimeout(80); const rm = await p.textContent("#aIPmsg"); await p.click("#formOk"); await p.waitForTimeout(500); r = await last(); w = await want(sid, { op: "median", radius: 2 });
  check(`Filters › Median: a radius of 200 refused ("${rb[1]}"), 2 cells a circle of 21 ("${rm}"), ImageJ's median of every cell`, rb[0] && same(r.z, w) && /21 cells/.test(rm), JSON.stringify([rb, rm]));
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  await pick(`${W} [data-mxproc]`, "Math", "Log"); await p.waitForTimeout(400); r = await last(); w = await want(sid, { op: "math", mop: "log" });
  check(`Math › Log at once: ImageJ's natural log, named ${r.zname}, no unit`, same(r.z, w) && /^ln /.test(r.zname) && !r.zunit, JSON.stringify([r.zname, r.zunit]));
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  await pick(`${W} [data-mxproc]`, "Math", "NaN background"); await p.waitForTimeout(200);
  const nb = await p.evaluate(sid => { const { lo, hi } = matRange(matOf(sid).z); return [+$("#aIPl").value === lo, +$("#aIPh").value === hi, lo, hi]; }, sid);
  await p.fill("#aIPl", "20000"); await p.fill("#aIPh", "1e9"); await p.click("#formOk"); await p.waitForTimeout(500); r = await last(); w = await want(sid, { op: "math", mop: "nan", lo: 20000, hi: 1e9 });
  const kept = r.z.filter(v => v != null).length;
  check(`Math › NaN background starts with the values' range, and keeps only the cells from 20 000 up (${kept} of 4096)`, nb[0] && nb[1] && same(r.z, w) && kept > 20 && kept < 2000, JSON.stringify([nb, kept]));
  // Subtract background… as ImageJ's: the rolling ball, the sliding paraboloid
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  await pick(`${W} [data-mxproc]`, "Subtract background"); await p.waitForTimeout(200);
  const b0 = await p.evaluate(() => ({ r: $("#aIPb").value, sm: $("#aIPsm").checked, msg: $("#aIPmsg").textContent, title: $("#formTitle").textContent }));
  await p.fill("#aIPb", "0"); await p.waitForTimeout(80); const b1 = [await p.isDisabled("#formOk"), await p.textContent("#aIPmsg")];
  await p.fill("#aIPb", "6"); await p.waitForTimeout(80); await p.click("#formOk"); await p.waitForTimeout(600); r = await last(); w = await want(sid, { op: "bg", radius: 6 });
  const bm = await p.evaluate(aid => anaOf(aid).res.report.method, r.aid);
  check(`Subtract background… (${b0.title}): ImageJ's radius 50 and smoothing to begin with ("${b0.msg}"), 0 refused; a ball of 6 cells gives ImageJ's values (${r.zname}) and its command`, b0.r === "50" && b0.sm && /shrunk by 4/.test(b0.msg) && b1[0] && same(r.z, w) && /less its background/.test(r.zname) && /run\("Subtract Background\.\.\.", "rolling=6"\)/.test(bm), JSON.stringify([b0, b1, bm.slice(-80)]));
  await p.evaluate(sid => ijProcRun(sid, { op: "bg", radius: 8, parab: true, light: true, create: true }), sid); await p.waitForTimeout(500); r = await last(); w = await want(sid, { op: "bg", radius: 8, parab: true, light: true, create: true });
  check(`the sliding paraboloid, a light background, the background itself (${r.zname}): ImageJ's every cell`, same(r.z, w) && /^Background of/.test(r.zname), r.zname);
  // processed images follow their input; a chain of them; a matrix made from one is never its input
  await p.evaluate(() => { const st = mxSt(matBooks()[0].id); mxWrite(st.sid, [[30, 30, 500000]], "typed into a cell"); }); await p.waitForTimeout(600);
  const fol = await p.evaluate(aid => { const a = anaOf(aid); return anaMatSheet(a).z; }, smooth.aid); w = await want(sid, { op: "smooth" });
  check("a value typed into the scan: the smoothed matrix follows it", same(fol, w) && fol[30 * 64 + 30] > 50000, fol[30 * 64 + 30]);
  await p.evaluate(sm => ijProcRun(sm, { op: "edges" }), smooth.sid); await p.waitForTimeout(500); r = await last(); w = await want(smooth.sid, { op: "edges" });
  const offered = await p.evaluate(aid => { anaDlg("ijproc", { id: aid }); return [...document.querySelectorAll("#aIPm option")].map(o => o.textContent); }, smooth.aid); await p.waitForTimeout(150);
  await p.click("#formCancel").catch(() => p.keyboard.press("Escape")); await p.waitForTimeout(150);
  check(`Find edges of the smoothed matrix follows it in turn (${r.zname}); Smooth's own settings never offer its result or what is made from it (${offered.length} matrices)`, same(r.z, w) && /^Gradient of/.test(r.zname) && !offered.some(t => t === smooth.sname || t === r.sname) && offered.length === 7, JSON.stringify(offered));
  // the empty cells: ImageJ lets them spread, Kurve leaves them out when asked
  await p.evaluate(() => { const st = mxSt(matBooks()[0].id), cells = []; for (let r = 58; r < 64; r++) for (let c = 0; c < 64; c++) cells.push([r, c, null]); mxWrite(st.sid, cells, "cleared the unfinished rows"); }); await p.waitForTimeout(500);
  const sp = await p.evaluate(sid => { const a = anaMakeTyped("ijproc", { mat: sid, op: "gauss", sigma: 1.5 }), b = anaMakeTyped("ijproc", { mat: sid, op: "gauss", sigma: 1.5, skip: true });
    const n = id => anaMatSheet(anaOf(id)).z.filter(v => v == null).length; return { ij: n(a), kv: n(b), note: anaOf(a).res.notes.join(" ") }; }, sid);
  check(`six empty rows (384 cells): ImageJ's Gaussian spreads them (${sp.ij} empty, said in a note), Leave the empty cells out keeps 384`, sp.ij > 384 && sp.kv === 384 && /Leave the empty cells out/.test(sp.note), JSON.stringify(sp));
  const pb = await p.evaluate(sid => { const a = anaMakeTyped("ijproc", { mat: sid, op: "bg", radius: 8, parab: true }), b = anaMakeTyped("ijproc", { mat: sid, op: "bg", radius: 8 });
    return { err: anaOf(a).res.err, empty: anaMatSheet(anaOf(b)).z.filter(v => v == null).length }; }, sid);
  check(`with empty cells the sliding paraboloid is refused in words ("${pb.err}"), the rolling ball leaves only them empty (${pb.empty})`, /sliding paraboloid cannot pass an empty cell/.test(pb.err || "") && pb.empty === 384, JSON.stringify(pb));
  // Analyze › Image › Process; undo; the report's Open the matrix; a reload
  const az = await p.evaluate(() => { const im = menuItems("analyze").find(i => i && i.label === "Image"), sub = im && im.sub(); const pr = sub && sub.find(i => i && i.label === "Process"); return pr ? pr.sub().filter(x => x && x !== "-").map(x => x.label) : null; });
  const nb0 = await p.evaluate(() => matBooks().length); await p.evaluate(() => undo()); await p.waitForTimeout(300); const nb1 = await p.evaluate(() => matBooks().length);
  check(`Analyze › Image › Process has the same menu (${az && az.length} items); undo takes the last processed matrix away (${nb0} → ${nb1} books)`, az && az.length === 9 && nb1 === nb0 - 1, JSON.stringify(az));
  const acts = await p.evaluate(aid => anaActs(anaOf(aid)).map(a => a.label), smooth.aid);
  await p.evaluate(() => flushEdits()); await p.waitForTimeout(800); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const rl = await p.evaluate(aid => { const a = anaOf(aid), s = a && anaMatSheet(a); return s && { n: s.z.length, lut: s.disp && s.disp.lut, ok: anaSig(a) === a.sig }; }, smooth.aid);
  check(`its report opens the matrix or draws its map (${acts.join(", ")}); kept across a reload with its lookup table, up to date`, acts.includes("Open the matrix") && rl && rl.n === 4096 && rl.lut === "ij:fire" && rl.ok, JSON.stringify([acts, rl]));
}, { name: "I.5" });

console.log("I.6 Threshold");
await page(async p => {
  const sid = await nv(p); await p.evaluate(() => { const id = matWinIds()[0], st = winState(id); st.g = [0.03, 0.03, 0.8, 0.9]; st.max = false; applyWins(); }); await p.waitForTimeout(300);
  const id = await p.evaluate(() => matWinIds()[0]), W = `#w-${id}`;
  const want = (o) => p.evaluate(([o, sid]) => { const r = ijThreshold(ijOfSheet(matOf(sid)), o); return { lo: r.lower, hi: r.upper, t: r.t }; }, [o, sid]);
  const thr = () => p.evaluate(sid => matOf(sid).thr || null, sid);
  const red = () => p.evaluate(sid => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, s = matOf(sid), t = s.thr, ctx = box.querySelector("canvas").getContext("2d"), { X, Y } = matXYOf(s);
    let inR = 0, inN = 0, outR = 0, outN = 0;
    for (let r = 2; r < s.ny; r += 5) for (let c = 2; c < s.nx; c += 5) { const v = s.z[r * s.nx + c], q = mxCellRect(g, r, c); if (q.x < 1 || q.y < 1 || q.x + q.w > g.W - 1 || q.y + q.h > g.H - 1) continue;
      const d = ctx.getImageData(Math.floor((q.x + q.w / 2) * g.dpr), Math.floor((q.y + q.h / 2) * g.dpr), 1, 1).data, isRed = d[0] > 240 && d[1] < 20 && d[2] < 20, inside = t && Math.fround(v) >= t.lo && Math.fround(v) <= t.hi;
      if (inside) { inN++; if (isRed) inR++; } else { outN++; if (isRed) outR++; } } return { inR, inN, outR, outN }; }, sid);
  const u0 = await p.evaluate(() => undoStack.length);
  await p.click(`${W} [data-mxth]`); await p.waitForTimeout(400); let t = await thr(), w = await want({ method: "Default" }), rd = await red();
  check(`Threshold opens ImageJ's panel and thresholds by Default, as ImageJ's window does (${t && t.lo} to ${t && t.hi}), one undo step; the cells in range drawn in red (${rd.inR} of ${rd.inN} sampled, ${rd.outR} of ${rd.outN} outside)`,
    t && t.method === "Default" && t.lo === w.lo && t.hi === w.hi && await p.evaluate(() => undoStack.length) === u0 + 1 && rd.inN > 0 && rd.inR === rd.inN && rd.outR === 0, JSON.stringify([t, w, rd]));
  // every method, light and dark
  let bad = [];
  for (const m of ["Default", "Huang", "Intermodes", "IsoData", "Li", "MaxEntropy", "Mean", "MinError", "Minimum", "Moments", "Otsu", "Percentile", "RenyiEntropy", "Shanbhag", "Triangle", "Yen"]) {
    await p.selectOption(`${W} [data-thm]`, m); await p.waitForTimeout(60);
    for (const dark of [true, false]) { if (await p.isChecked(`${W} [data-thd]`) !== dark) { await p.click(`${W} [data-thd]`); await p.waitForTimeout(60); }
      t = await thr(); w = await want({ method: m, dark }); if (!(t.method === m && !!t.dark === dark && t.lo === w.lo && t.hi === w.hi)) bad.push([m, dark, t, w]); } }
  check("each of ImageJ's sixteen methods, dark background or not, chosen in the panel gives setAutoThreshold's range", !bad.length, JSON.stringify(bad.slice(0, 3)));
  await p.selectOption(`${W} [data-thm]`, "Otsu"); await p.waitForTimeout(60); if (!await p.isChecked(`${W} [data-thd]`)) await p.click(`${W} [data-thd]`); await p.waitForTimeout(150);
  t = await thr(); const note = await p.textContent(`${W} .thn`), n = await p.evaluate(sid => { const s = matOf(sid), t = s.thr; return s.z.filter(v => v != null && Math.fround(v) >= t.lo && Math.fround(v) <= t.hi).length; }, sid);
  check(`Otsu, dark background: the note counts the cells (${note.trim()})`, note.includes(`${n} of 4,096 cells`) && note.includes(`level ${(await want({ method: "Otsu", dark: true })).t} of 255`), note);
  // by hand, then shown or not
  await p.fill(`${W} [data-thl]`, "20000"); await p.fill(`${W} [data-thh]`, ""); await p.press(`${W} [data-thh]`, "Tab"); await p.waitForTimeout(200); t = await thr();
  check(`a range typed is a threshold by hand (from 20 000, no upper end: ${t.hi})`, t.method === "manual" && t.lo === 20000 && t.hi === 1e30, JSON.stringify(t));
  await p.click(`${W} [data-ths]`); await p.waitForTimeout(150); rd = await red(); await p.click(`${W} [data-ths]`); await p.waitForTimeout(150); const rd2 = await red();
  check("Show in red off draws no red; on again draws it", rd.inR === 0 && rd2.inR === rd2.inN && rd2.inN > 0, JSON.stringify([rd, rd2]));
  // Mask and NaN background from the panel; Convert to mask… from Process › Binary
  await p.click(`${W} [data-tha="mask"]`); await p.waitForTimeout(500);
  let mk = await p.evaluate(() => { const a = anaList().filter(x => x.kind === "ijproc").pop(), m = anaMatSheet(a), s = matOf(a.in.mat); return { ok: m.z.every((v, i) => v === (s.z[i] != null && Math.fround(s.z[i]) >= 20000 ? 255 : 0)), name: m.zname, meth: a.res.report.method.slice(-90) }; });
  check(`Mask: a new matrix of 255 in the range and 0 elsewhere (${mk.name}), its method ImageJ's commands`, mk.ok && /setThreshold\(20000, 1e\+30\); setOption\("BlackBackground", true\); run\("Convert to Mask"\);/.test(mk.meth), JSON.stringify(mk));
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  await p.click(`${W} [data-mxproc]`); await p.waitForTimeout(120); await p.locator(".menu .mi").filter({ hasText: /^Binary/ }).last().click(); await p.waitForTimeout(150); await p.locator(".menu .mi").filter({ hasText: /^Convert to mask/ }).last().click(); await p.waitForTimeout(250);
  const dm = await p.inputValue("#aIPtm"); await p.selectOption("#aIPtm", "Triangle"); await p.check("#aIPdk"); await p.waitForTimeout(80); const dmsg = await p.textContent("#aIPmsg"); await p.click("#formOk"); await p.waitForTimeout(500);
  w = await want({ method: "Triangle", dark: true });
  mk = await p.evaluate((w) => { const a = anaList().filter(x => x.kind === "ijproc").pop(), m = anaMatSheet(a), s = matOf(a.in.mat); return m.z.every((v, i) => v === (s.z[i] != null && Math.fround(s.z[i]) >= w.lo && Math.fround(s.z[i]) <= w.hi ? 255 : 0)); }, w);
  check(`Process › Binary › Convert to mask… starts from the threshold set (${dm}); Triangle, dark: ImageJ's level said ("${dmsg}") and the mask its range`, dm === "manual" && mk && new RegExp(`level ${w.t} of 255`).test(dmsg), JSON.stringify([dm, dmsg]));
  // undo, Reset, a reload, junk
  await p.evaluate(() => focusWin(matWinIds()[0])); await p.waitForTimeout(150);
  const t1 = await thr(); await p.click(`${W} [data-tha="reset"]`); await p.waitForTimeout(200); const t2 = await thr(); await p.evaluate(() => undo()); await p.waitForTimeout(250); const t3 = await thr();
  check("Reset takes the threshold off; undo puts it back", t1 && !t2 && t3 && t3.lo === t1.lo, JSON.stringify([t1, t2, t3]));
  // empty cells: counted in the lowest bin as ImageJ, or left out
  await p.evaluate(() => { const st = mxSt(matBooks()[0].id), cells = []; for (let r = 0; r < 20; r++) for (let c = 0; c < 64; c++) cells.push([r, c, null]); mxWrite(st.sid, cells, "cleared rows"); }); await p.waitForTimeout(400);
  await p.selectOption(`${W} [data-thm]`, "Li"); await p.waitForTimeout(150); const ta = await thr(), na = await p.textContent(`${W} .thn`); await p.click(`${W} [data-thk]`); await p.waitForTimeout(150); const tb = await thr();
  const wa = await want({ method: "Li", dark: true }), wb = await want({ method: "Li", dark: true, skip: true });
  check(`with 1 280 empty cells, Li counts them in the lowest bin as ImageJ does (said: "${na.trim()}"), Leave the empty cells out does not (${ta.lo} → ${tb.lo})`, ta.lo === wa.lo && tb.lo === wb.lo && tb.skip && ta.lo !== tb.lo && /1280 empty counted/.test(na), JSON.stringify([ta, tb, wa, wb]));
  await p.evaluate(() => flushEdits()); await p.waitForTimeout(800); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const rl = await thr(); const jk = await p.evaluate(() => { const p0 = cloneProj(P()); const ss = p0.mats[0].sheets; ss[0].thr = { method: "Otsu", lo: 5, hi: 1 }; ss.push(Object.assign({}, ss[0], { id: "q1", name: "Q1", thr: { method: "Bogus", lo: 1, hi: 2 } }), Object.assign({}, ss[0], { id: "q2", name: "Q2", thr: { method: "manual", lo: 1, hi: "x" } })); matClean(p0); return p0.mats[0].sheets.map(s => s.thr || null); });
  check(`the threshold is kept with the matrix across a reload (${rl && rl.method}), and broken ones from storage dropped`, rl && rl.method === "Li" && rl.skip && jk.every(x => x === null), JSON.stringify([rl, jk]));
}, { name: "I.6" });

console.log("I.6 Analyze particles");
await page(async p => {
  const sid = await nv(p); await p.evaluate(() => { const id = matWinIds()[0], st = winState(id); st.g = [0.03, 0.03, 0.8, 0.9]; st.max = false; applyWins(); }); await p.waitForTimeout(300);
  const id = await p.evaluate(() => matWinIds()[0]), W = `#w-${id}`;
  // the threshold panel's Particles… starts from its threshold
  await p.click(`${W} [data-mxth]`); await p.waitForTimeout(300); await p.selectOption(`${W} [data-thm]`, "Otsu"); if (!await p.isChecked(`${W} [data-thd]`)) await p.click(`${W} [data-thd]`); await p.waitForTimeout(200);
  await p.click(`${W} [data-tha="pa"]`); await p.waitForTimeout(300);
  const d0 = await p.evaluate(() => ({ t: $("#aPAt").value, d: $("#aPAd").checked, msg: $("#aPAmsg").textContent, title: $("#formTitle").textContent }));
  const want = (o) => p.evaluate(([o, sid]) => { const s = matOf(sid), T = ijThreshold(ijOfSheet(s), { method: o.method, dark: o.dark }); const r = ijParticles(ijOfSheet(s), Object.assign({ lo: T.lower, hi: T.upper }, o)); return r.rows.map(q => [q.cells, q.area, q.mean, q.x, q.y, q.perim, q.circ, q.feret, q.solidity]); }, [o, sid]);
  let w = await want({ method: "Otsu", dark: true });
  check(`Particles… from the Threshold panel starts from its threshold (${d0.t}, dark ${d0.d}) and counts them as they are set ("${d0.msg}")`, d0.t === "Otsu" && d0.d && d0.msg === `${w.length} particles`, JSON.stringify(d0));
  await p.click("#formOk"); await p.waitForTimeout(600);
  const got = await p.evaluate(() => { const a = anaList().filter(x => x.kind === "ijparticles").pop(), col = k => (P().cols.find(c => c.ana === a.id && c.ak === k) || { data: [] }).data;
    const n = col("n").filter(v => v != null).length; return { name: a.name, rows: [...Array(n).keys()].map(i => ["cells", "area", "mean", "x", "y", "perim", "circ", "feret", "solidity"].map(k => col(k)[i])), cnt: col("cnt")[0], meth: a.res.report.method }; });
  check(`it makes ${got.name}, a row a particle (${got.cnt}), each ImageJ's measurements as ijParticles gives them, and ImageJ's commands in its method`,
    got.cnt === w.length && JSON.stringify(got.rows) === JSON.stringify(w) && /setAutoThreshold\("Otsu dark"\); run\("Analyze Particles\.\.\.", "size=0-Infinity pixel circularity=0\.00-1\.00 display summarize"\);/.test(got.meth), JSON.stringify([got.cnt, w.length, got.meth.slice(-160)]));
  // the outlines on the image, in cyan
  const cy = await p.evaluate(() => { const a = anaList().filter(x => x.kind === "ijparticles").pop(); anaActs(a).find(x => x.key === "show").run(); const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, ctx = box.querySelector("canvas").getContext("2d");
    let hit = 0, tot = 0; for (const P of a.res.report.ijpa.polys.slice(0, 10)) { const q = P[0], t = mxD2S(g, q[0], q[1]); if (t.x < 3 || t.y < 3 || t.x > g.W - 3 || t.y > g.H - 3) continue; tot++;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const d = ctx.getImageData(Math.floor((Math.round(t.x) + 0.5 + dx) * g.dpr), Math.floor((Math.round(t.y) + 0.5 + dy) * g.dpr), 1, 1).data; if (d[0] < 60 && d[1] > 200 && d[2] > 200) { hit++; dx = dy = 9; } } } return { hit, tot }; });
  check(`Show the outlines draws each particle's outline on the image in cyan (${cy.hit} of ${cy.tot} corners found)`, cy.tot > 3 && cy.hit === cy.tot, JSON.stringify(cy));
  // sizes, circularity, edges, holes, a count mask, through the dialog's settings
  const aid = await p.evaluate(() => anaList().filter(x => x.kind === "ijparticles").pop().id);
  await p.evaluate(aid => { anaDlg("ijparticles", { id: aid }); }, aid); await p.waitForTimeout(250);
  await p.fill("#aPAs0", "20"); await p.fill("#aPAc0", "0.6"); await p.check("#aPAe"); await p.selectOption("#aPAx", "count"); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(600);
  w = await want({ method: "Otsu", dark: true, min: 20, cmin: 0.6, exclude: true });
  const g2 = await p.evaluate(aid => { const a = anaOf(aid), col = k => (P().cols.find(c => c.ana === a.id && c.ak === k) || { data: [] }).data, s = anaMatSheet(a); return { cnt: col("cnt")[0], cells: col("cells").filter(v => v != null), m: s && { max: Math.max(...s.z), zname: s.zname } }; }, aid);
  check(`20 cells at least, circularity 0.6 and more, the edges left out: ${g2.cnt} particles, as ijParticles; a count mask numbering them 1 to ${g2.m && g2.m.max}`, g2.cnt === w.length && JSON.stringify(g2.cells) === JSON.stringify(w.map(q => q[0])) && g2.cells.every(c => c >= 20) && g2.m && g2.m.max === w.length, JSON.stringify([g2, w.length]));
  // in units squared; refusals
  await p.evaluate(aid => { anaDlg("ijparticles", { id: aid }); }, aid); await p.waitForTimeout(250);
  await p.fill("#aPAs0", "abc"); await p.waitForTimeout(100); const r1 = [await p.isDisabled("#formOk"), await p.textContent("#aPAmsg")];
  await p.fill("#aPAs0", "0.3"); await p.selectOption("#aPAu", "units"); await p.fill("#aPAc0", "1.5"); await p.waitForTimeout(100); const r2 = [await p.isDisabled("#formOk"), await p.textContent("#aPAmsg")];
  await p.fill("#aPAc0", ""); await p.waitForTimeout(100); const ok3 = await p.textContent("#aPAmsg"); await p.click("#formOk"); await p.waitForTimeout(600);
  const pw = await p.evaluate(sid => { const s = matOf(sid); return ijGeom(s.x, s.y, s.nx, s.ny).pw; }, sid); w = await want({ method: "Otsu", dark: true, min: 0.3 / (pw * pw), exclude: true });
  const g3 = await p.evaluate(aid => { const a = anaOf(aid); return (P().cols.find(c => c.ana === a.id && c.ak === "cnt") || { data: [] }).data[0]; }, aid);
  check(`a size typed in µm² (0.3, ${(0.3 / (pw * pw)).toFixed(1)} cells) gives ${g3} particles; text and a circularity past 1 refused ("${r1[1]}", "${r2[1]}")`, g3 === w.length && r1[0] && r2[0] && /not a number/.test(r1[1]) && /from 0 to 1/.test(r2[1]) && /particle/.test(ok3), JSON.stringify([g3, w.length, r1, r2, ok3]));
  // following the scan, a reload
  const before = g3; await p.evaluate(() => { const st = mxSt(matBooks()[0].id), cells = []; for (let r = 10; r < 16; r++) for (let c = 10; c < 16; c++) cells.push([r, c, 50000]); mxWrite(st.sid, cells, "typed a spot"); }); await p.waitForTimeout(600);
  const after = await p.evaluate(aid => (P().cols.find(c => c.ana === aid && c.ak === "cnt") || { data: [] }).data[0], aid); w = await want({ method: "Otsu", dark: true, min: 0.3 / (pw * pw), exclude: true });
  check(`a spot typed into the scan is found when the particles are worked out again (${before} → ${after})`, after === w.length && after !== before, JSON.stringify([before, after, w.length]));
  await p.evaluate(() => flushEdits()); await p.waitForTimeout(800); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const rl = await p.evaluate(aid => { const a = anaOf(aid); return a && { cnt: (P().cols.find(c => c.ana === aid && c.ak === "cnt") || { data: [] }).data[0], ok: anaSig(a) === a.sig, items: menuItems("analyze").find(i => i && i.label === "Image").sub().map(i => i && i.label) }; }, aid);
  check(`kept across a reload and up to date; Analyze › Image has Analyze particles… (${rl.items.filter(Boolean).join(", ")})`, rl && rl.cnt === after && rl.ok && rl.items.includes("Analyze particles…"), JSON.stringify(rl));
}, { name: "I.6" });

console.log("I.7 Scale bar, channels, histogram");
await page(async p => {
  const sid = await nv(p); await p.evaluate(() => { const id = matWinIds()[0], st = winState(id); st.g = [0.03, 0.03, 0.8, 0.9]; st.max = false; applyWins(); }); await p.waitForTimeout(300);
  const id = await p.evaluate(() => matWinIds()[0]);
  // The menus.
  const mi = await p.evaluate(sid => ({ mat: matMenuItems(sid).filter(Boolean).map(i => i.label), ij: matMenuItems(sid).find(i => i && i.label === "ImageJ").sub().filter(i => i && i.label).map(i => i.label), an: menuItems("analyze").find(i => i && i.label === "Image").sub().filter(i => i && i.label).map(i => i.label) }), sid);
  check(`the Matrix menu has Scale bar… and Channels, its ImageJ submenu Histogram…, Analyze › Image both (${mi.an.join(", ")})`, mi.mat.includes("Scale bar…") && mi.mat.includes("Channels") && mi.ij.includes("Histogram…") && mi.an.includes("Histogram…") && mi.an.includes("Scale bar…"), JSON.stringify(mi));
  // The dialog opens on ImageJ's default width at the magnification on screen.
  await p.evaluate(sid => { matMenuItems(sid).find(i => i && i.label === "Scale bar…").run(); }, sid); await p.waitForTimeout(300);
  const d0 = await p.evaluate(sid => { const s = matOf(sid), st = mxStFor(sid), G = ijScaleBar({ W: s.nx, H: s.ny, pw: ijGeom(s.x, s.y, s.nx, s.ny).pw, ph: ijGeom(s.x, s.y, s.nx, s.ny).ph, mag: st.mag, unit: "µm" }); return { w: $("#sbW").value, want: ijD2s(G.hw, G.hd), lab: [...document.querySelectorAll("#formBody label")].map(l => l.textContent).slice(0, 3), mag: st.mag }; }, sid);
  check(`the dialog's width is ImageJ's default at ${Math.round(d0.mag * 100)} % (${d0.w}), in µm; the height and font in pixels`, d0.w === d0.want && /Width in µm/.test(d0.lab[0]) && /Height in pixels/.test(d0.lab[1]), JSON.stringify(d0));
  await p.fill("#sbW", "2"); await p.selectOption("#sbB", "black"); await p.click("#formOk"); await p.waitForTimeout(400);
  const sb = await p.evaluate(sid => { const s = matOf(sid); return { sb: s.sbar, G: sbarGeom(s, s.sbar, 1), pw: ijGeom(s.x, s.y, s.nx, s.ny).pw }; }, sid);
  check(`2 µm typed: kept with the matrix, ${sb.G.hPx} pixels of the image (2 ÷ ${sb.pw} µm a pixel), labelled "${sb.G.hLabel}"`, sb.sb.w === 2 && sb.sb.wd === 0 && sb.G.hPx === Math.round(2 / sb.pw) && sb.G.hLabel === "2 µm" && sb.sb.bg === "black", JSON.stringify(sb));
  // Drawn on the image: the bar's white run as long as its pixels at the magnification.
  const run = () => p.evaluate(sid => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, s = matOf(sid), G = sbarGeom(s, s.sbar, 1), ctx = box.querySelector("canvas").getContext("2d");
    const y = Math.round((g.ty + (G.hBar.y + G.hBar.h / 2) * g.mx) * g.dpr), x0 = Math.round((g.tx + G.hBar.x * g.mx) * g.dpr), x1 = Math.round((g.tx + (G.hBar.x + G.hBar.w) * g.mx) * g.dpr);
    const row = ctx.getImageData(0, y, Math.round(g.W * g.dpr), 1).data; let n = 0, a = -1; for (let x = Math.max(0, x0 - 20); x < Math.min(row.length / 4, x1 + 20); x++) if (row[4 * x] > 250 && row[4 * x + 1] > 250 && row[4 * x + 2] > 250) { n++; if (a < 0) a = x; }
    const bg = ctx.getImageData(Math.round((g.tx + (G.hBg.x + 1) * g.mx) * g.dpr), Math.round((g.ty + (G.hBg.y + G.hBg.h - 1) * g.mx) * g.dpr), 1, 1).data;
    return { n, want: x1 - x0, a, x0, mag: g.mx, px: G.hPx, bg: [...bg].slice(0, 3) }; }, sid);
  let r = await run();
  check(`on the image the bar is ${r.n} screen pixels white where ${r.px} image pixels at ${r.mag} make ${r.want}, its box black`, Math.abs(r.n - r.want) <= 2 && Math.abs(r.a - r.x0) <= 1 && r.bg.every(v => v < 20), JSON.stringify(r));
  await p.evaluate(() => { const id = matWinIds()[0]; mxZoomStep(id, true); }); await p.waitForTimeout(200); r = await run();
  check(`zoomed in, it grows with the image, as ImageJ's overlay does (${r.n} at ${r.mag})`, Math.abs(r.n - r.want) <= 2, JSON.stringify(r));
  // The picture: the bar k pixels a cell.
  const pic = await p.evaluate(async sid => { const got = []; const keep = saveFile; saveFile = async (n, b) => { got.push([n, b]); return true; }; await mxSavePng(sid); saveFile = keep;
    const bm = await createImageBitmap(got[0][1]), cv = document.createElement("canvas"); cv.width = bm.width; cv.height = bm.height; const g = cv.getContext("2d"); g.drawImage(bm, 0, 0);
    const s = matOf(sid), G = sbarGeom(s, s.sbar, 1), k = Math.max(1, Math.min(16, Math.round(800 / 64))), H = Math.max(64 * k, 120), y0 = Math.round((H - 64 * k) / 2), y = y0 + Math.round((G.hBar.y + G.hBar.h / 2) * k);
    const row = g.getImageData(0, y, 64 * k, 1).data; let n = 0; for (let x = 0; x < 64 * k; x++) if (row[4 * x] > 250 && row[4 * x + 1] > 250 && row[4 * x + 2] > 250) n++; return { n, want: G.hPx * k, k }; }, sid);
  check(`the PNG has it too: ${pic.n} pixels white for ${pic.want} (${pic.k} a cell)`, Math.abs(pic.n - pic.want) <= 1, JSON.stringify(pic));
  await p.evaluate(() => undo()); await p.waitForTimeout(250);
  check("one undo takes the bar away", await p.evaluate(sid => !matOf(sid).sbar, sid));
  await p.evaluate(() => redo()); await p.waitForTimeout(250);
  // Upper left, vertical too, text hidden: as ijScaleBar places them.
  await p.evaluate(sid => { matSbarSet(sid, Object.assign({}, matOf(sid).sbar, { loc: "ul", vert: true, hide: true, vh: 3 })); }, sid); await p.waitForTimeout(250);
  const ul = await p.evaluate(sid => { const s = matOf(sid), G = sbarGeom(s, s.sbar, 1), id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, ctx = box.querySelector("canvas").getContext("2d");
    const at = (x, y) => [...ctx.getImageData(Math.round((g.tx + x * g.mx) * g.dpr), Math.round((g.ty + y * g.mx) * g.dpr), 1, 1).data].slice(0, 3);
    return { h: at(G.hBar.x + G.hBar.w / 2, G.hBar.y + G.hBar.h / 2), v: at(G.vBar.x + G.vBar.w / 2, G.vBar.y + G.vBar.h / 2), vPx: G.vPx, want: Math.round(3 / ijGeom(s.x, s.y, s.nx, s.ny).ph), hBar: G.hBar, vBar: G.vBar, tw: G.hText.w, outer: G.outer, inner: G.inner }; }, sid);
  check(`upper left, a vertical bar of 3 µm (${ul.vPx} pixels), no text: both bars drawn white where ijScaleBar puts them, against the top and left edges, inside the box`, ul.h.every(v => v > 250) && ul.v.every(v => v > 250) && ul.vPx === ul.want && ul.tw === 0 && ul.vBar.x === ul.outer + ul.inner && ul.vBar.y < 10, JSON.stringify(ul));
  // Channels: three matrices of one size in the book.
  await p.evaluate(sid => { const s = matOf(sid), b = matBookOf(sid), mk = (nm, f) => Object.assign({}, s, { id: "mt" + nm, name: nm, z: s.z.map((v, i) => v == null ? null : f(v, i)), raw: undefined, sbar: undefined, disp: undefined });
    save({ mats: matBooks().map(q => q.id === b.id ? Object.assign({}, q, { sheets: q.sheets.concat([mk("Green", (v, i) => (i % 64) * 10), mk("Blue", (v, i) => Math.floor(i / 64) * 10)]) }) : q) }); }, sid); await p.waitForTimeout(400);
  await p.evaluate(sid => { mxChanItems(sid).find(i => i && /^Colours/.test(i.label)).run(); }, sid); await p.waitForTimeout(400);
  const ch = await p.evaluate(sid => { const b = matBookOf(sid); return { on: b.comp && b.comp.on, luts: b.sheets.map(q => q.disp && q.disp.lut), btn: !$("#w-" + matWinIds()[0] + " [data-mxch]").hidden, line: $("#w-" + matWinIds()[0] + " .mxdsp").textContent }; }, sid);
  check(`Colours: red, green, blue gives the channels ImageJ's colours and shows them together (${ch.luts.join(", ")}; "${ch.line}")`, ch.on && ch.luts.join() === "ij:red,ij:green,ij:blue" && ch.btn && /Composite of 3 channels, added/.test(ch.line), JSON.stringify(ch));
  const px = () => p.evaluate(sid => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"), g = box._g, ctx = box.querySelector("canvas").getContext("2d"), b = matBookOf(sid), s = matOf(sid), ch = mxChans(b, s), c = compClean(b.comp);
    const want = ijComposite(ch.map(q => { const d = matDispOf(q); return { z: q.z, lo: d.lo, hi: d.hi, lut: mxLut(d.lut, d.inv), on: !c.off.includes(q.id) }; }), s.nx * s.ny, c.mode); let bad = 0, n = 0;
    for (const [r, cc] of [[0, 0], [10, 50], [33, 33], [63, 5], [20, 61], [47, 12]]) { const q = mxCellRect(g, r, cc); if (q.x < 0 || q.y < 0 || q.x + q.w > g.W || q.y + q.h > g.H) continue; n++;
      const a = ctx.getImageData(Math.floor((q.x + q.w / 2) * g.dpr), Math.floor((q.y + q.h / 2) * g.dpr), 1, 1).data, v = want[r * s.nx + cc]; if (a[0] !== (v >> 16 & 255) || a[1] !== (v >> 8 & 255) || a[2] !== (v & 255)) bad++; }
    return { bad, n }; }, sid);
  await p.evaluate(() => mxZoomFit(matWinIds()[0])); await p.waitForTimeout(200);
  let cp = await px();
  check(`each cell drawn the colour ijComposite gives it (${cp.n} cells looked at)`, cp.bad === 0 && cp.n >= 4, JSON.stringify(cp));
  await p.evaluate(sid => { const it = mxChanItems(sid).find(i => i && i.label === "Green"); it.run(); }, sid); await p.waitForTimeout(250); cp = await px();
  const off = await p.evaluate(sid => compClean(matBookOf(sid).comp).off.length, sid);
  check("a channel switched off leaves it out", off === 1 && cp.bad === 0, JSON.stringify([off, cp]));
  await p.evaluate(sid => { mxChanItems(sid).find(i => i && i.label === "The brightest of them").run(); }, sid); await p.waitForTimeout(250); cp = await px();
  check("the brightest of them, as ImageJ's Max projection", await p.evaluate(sid => matBookOf(sid).comp.mode === "max", sid) && cp.bad === 0, JSON.stringify(cp));
  const rd = await p.evaluate(() => { const id = matWinIds()[0], box = $("#w-" + id + " .mximg"); mxRead(id, { x: box._g.W / 2, y: box._g.H / 2 }); return $("#w-" + id + " .mxread").textContent; });
  check(`the readout gives each channel's value ("${rd}")`, /M?\S* [\d.]+ .*Blue [\d.]+/.test(rd) && !/Green/.test(rd), rd);
  // The histogram: H on the image.
  await p.evaluate(sid => { const st = mxStFor(sid); st.roi = null; st.isel = false; st.r = st.er = 0; st.c = st.ec = 0; }, sid);
  await p.focus(`#w-${id} .mximg`); await p.keyboard.press("h"); await p.waitForTimeout(300);
  const hd = await p.evaluate(sid => { const s = matOf(sid), R = ijMeasure({ nx: s.nx, ny: s.ny, x: s.x, y: s.y, z: s.z }, { kind: "all" }, { single: true });
    return { title: $("#formTitle").textContent, rows: [...document.querySelectorAll("#formBody .ijhs tr")].map(t => [t.cells[0].textContent, t.querySelector("td").textContent]), want: [String(R.n), ijD2sHist(R.min), ijD2sHist(R.mean), ijD2sHist(R.max), ijD2sHist(R.sd)], bars: (document.querySelector("#formBody .ijhist path:last-child").getAttribute("d").match(/M/g) || []).length, nz: R.hist.counts.filter(v => v > 0).length }; }, sid);
  check(`H: the histogram of the whole matrix with ImageJ's numbers (${hd.rows.map(r => r.join(" ")).join(", ")})`, /Histogram of/.test(hd.title) && JSON.stringify(hd.rows.slice(0, 5).map(r => r[1])) === JSON.stringify(hd.want) && hd.bars === hd.nz, JSON.stringify(hd));
  await p.check("#ijhLog"); await p.waitForTimeout(100);
  check("Log draws the counts' logarithms behind", await p.evaluate(() => document.querySelectorAll("#formBody .ijhist path").length === 2));
  await p.click('#formBody [data-ijh="plot"]'); await p.waitForTimeout(700);
  const pl = await p.evaluate(() => ({ a: anaList().filter(x => x.kind === "ijmeasure").length, g: P().graphs.length }));
  check("Plot it: a Measure analysis of the same cells and its histogram on a graph", pl.a === 1 && pl.g >= 1, JSON.stringify(pl));
  // Kept across a reload.
  await p.evaluate(() => flushEdits()); await p.waitForTimeout(800); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const rl = await p.evaluate(() => { const b = matBooks()[0]; return { comp: b.comp, sb: b.sheets[0].sbar && b.sheets[0].sbar.w }; });
  check(`the scale bar and the composite are kept across a reload`, rl.sb === 2 && rl.comp && rl.comp.on && rl.comp.mode === "max", JSON.stringify(rl));
}, { name: "I.7" });

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
