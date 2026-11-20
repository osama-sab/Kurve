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
  return { id, view: st.view, img: !box.hidden, grid: !el.querySelector(".mxgrid").hidden, mag: st.mag, cx: st.cx, cy: st.cy, g, bx: r.x, by: r.y, W: r.width, H: r.height, dpr: devicePixelRatio,
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
  const cx0 = w.cx; await p.mouse.down(); await p.mouse.move(b.x + 120, b.y + 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100); w = await mxw(p);
  check(`a drag pans the image (${(cx0 - w.cx).toFixed(2)} cells for 120 px at ${w.mag} px a cell), selecting nothing`, Math.abs((cx0 - w.cx) - 120 / w.mag) < 0.02 && !(await p.evaluate(() => mxSt(mxBid(matWinIds()[0])).isel)), JSON.stringify([cx0, w.cx]));
  b = await cellAt(p, 32, 32); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + 3000, b.y + 3000, { steps: 10 }); await p.mouse.up(); w = await mxw(p);
  check(`dragged far, the image stops at its corner: it still covers the window (${w.g.tx.toFixed(0)}, ${w.g.ty.toFixed(0)})`, Math.abs(w.g.tx) < 1 && Math.abs(w.g.ty) < 1, JSON.stringify(w.g));
  // Fit: the button, 0 and a double click
  await p.click(`#w-${w.id} [data-mxz="fit"]`); w = await mxw(p); const fitm = w.mag;
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 24)); await p.focus(`#w-${w.id} .mximg`); await p.keyboard.press("0"); const k0 = (await mxw(p)).mag;
  await p.evaluate(() => mxZoomTo(matWinIds()[0], 24)); b = await cellAt(p, 32, 32); await p.mouse.dblclick(b.x, b.y); await p.waitForTimeout(100); const kd = (await mxw(p)).mag;
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

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
