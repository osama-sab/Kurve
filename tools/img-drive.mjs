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

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
