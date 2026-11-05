/* Counting spectra (the roadmap's item 3), each slice clicked and typed into in a real browser.
   Needs Playwright with Chromium. Usage:
     node tools/count-drive.mjs [path/to/kurve.html]
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
const peak = (i, c, h, w) => h * Math.exp(-0.5 * ((i - c) / w) ** 2);
// A gamma spectrum of 1024 channels: a falling continuum and three lines, as an analyser counts.
const gamma = (seed = 1) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 1024 }, (_, i) => { const m = 200 * Math.exp(-i / 300) + 20 + peak(i, 300, 900, 3) + peak(i, 600, 400, 4) + peak(i, 800, 150, 4.5);
    let k = 0, t = Math.exp(-m), p = 1; if (m > 50) return Math.max(0, Math.round(m + Math.sqrt(m) * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()))); do { k++; p *= r(); } while (p > t); return k - 1; }); };
const spe = (counts, o = {}) => ["$SPEC_ID:", o.title || "Soil sample 7, HPGe", "$DATE_MEA:", o.date || "03/14/2024 09:05:07", "$MEAS_TIM:", `${o.live || 3600} ${o.real || 3712}`, "$DATA:", `0 ${counts.length - 1}`,
  ...counts.map(v => "       " + v), "$ROI:", "0", "$ENER_FIT:", "0.155 0.4521", "$MCA_CAL:", "3", "1.2E-01 4.52E-01 1.1E-07 keV"].join("\r\n") + "\r\n";
const n42 = counts => `<?xml version="1.0"?><RadInstrumentData xmlns="http://physics.nist.gov/N42/2011/N42"><EnergyCalibration id="ec"><CoefficientValues>-0.5 1.465 0</CoefficientValues></EnergyCalibration><RadMeasurement id="m"><StartDateTime>2023-11-02T14:30:00Z</StartDateTime><RealTimeDuration>PT310.5S</RealTimeDuration><Spectrum id="s1"><LiveTimeDuration>PT5M</LiveTimeDuration><ChannelData>${counts.join(" ")}</ChannelData></Spectrum></RadMeasurement></RadInstrumentData>`;
const spec = p => p.evaluate(() => { const c = sheetCols(curSheet()).find(q => q.role === "y"), x = xColFor(c), d = finalOf(c);
  return { name: c.name, unit: c.unit, x: x && x.name, x0: x && x.data[0], steps: (c.pipe || []).map(s => s.op + (s.op === "ecal" ? `(${s.p.a},${s.p.b},${s.p.c},${s.p.xu})` : "")).join(" "), xu: d.xu, e400: d.x[400], meta: c.meta || null }; });

console.log("Slice 1: an analyser's own files, Maestro's or the IAEA's .Spe and N42, with their calibration");
await page(async p => {
  const counts = gamma(3), text = spe(counts);
  await p.evaluate(([t, n]) => { importText(t, n); }, [text, "soil7.Spe"]); await p.waitForTimeout(500);
  const d = await p.evaluate(() => ({ find: impFindings().map(f => f.id + (f.fix ? ":" + f.fix + (S.imp.fixes[f.fix] ? "=on" : "=off") : "")).join(" "), tka: !!document.getElementById("impTka"),
    txt: document.querySelector("#impModal .sheet").innerText, ch0: S.imp.ch0 }));
  check("the dialog says what the file is, its times and its date, and offers its calibration, on", /mca:rate=off/.test(d.find) && /ecal:ecal=on/.test(d.find) && /1 ?024 channels|1 024 channels|1024 channels/.test(d.txt) && /2024-03-14/.test(d.txt) && /E = 0\.12 \+ 0\.452·ch \+ 1\.1e-7·ch²|E = 0\.12 \+ 0\.452/.test(d.txt), JSON.stringify([d.find, d.txt.slice(0, 600)]));
  check("…with no TKA switch, and channels from 0", !d.tka && d.ch0 === 0);
  await p.evaluate(() => doImport()); await p.waitForTimeout(800);
  const s = await spec(p), want = 0.12 + 0.452 * 400 + 1.1e-7 * 400 * 400;
  check("imported: counts against the channel from 0, an Energy calibration step with the file's coefficients", s.x === "Channel" && s.x0 === 0 && s.steps === "ecal(0.452,0.12,1.1e-7,keV)" && s.unit === "counts", JSON.stringify(s));
  check("…so the counts are against energy in keV", s.xu === "keV" && Math.abs(s.e400 - want) < 1e-9, JSON.stringify([s.xu, s.e400, want]));
  check("…and the file's fields are the spectrum's: live time, measured, title", s.meta && s.meta["Live time"] === "3600 s" && s.meta.Measured === "2024-03-14 09:05:07" && s.meta.Title === "Soil sample 7, HPGe", JSON.stringify(s.meta));
  // The calibration turned off in the dialog.
  await p.evaluate(([t, n]) => { importText(t, n); }, [text, "soil8.Spe"]); await p.waitForTimeout(400);
  await p.locator('#impModal [data-fix="ecal"]').click(); await p.waitForTimeout(200);
  await p.evaluate(() => doImport()); await p.waitForTimeout(800);
  check("its calibration can be left off in the dialog", (await spec(p)).steps === "", (await spec(p)).steps);
  // Dropped, it is read the same way.
  await p.evaluate(t => autoImport([{ name: "dropped.spe", text: t }]), text); await p.waitForTimeout(1200);
  const s2 = await spec(p);
  check("a dropped .Spe file is calibrated as the dialog would", s2.steps === "ecal(0.452,0.12,1.1e-7,keV)" && s2.xu === "keV", JSON.stringify(s2));
  // An N42 file, and several files at once.
  await p.evaluate(t => autoImport([{ name: "survey.n42", text: t }]), n42(counts)); await p.waitForTimeout(1200);
  const s3 = await spec(p);
  check("an N42 file: its counts, live time and calibration", s3.steps === "ecal(1.465,-0.5,0,keV)" && s3.meta && s3.meta["Live time"] === "300 s", JSON.stringify(s3));
  await p.evaluate(([a, b]) => { batchImport([batchFile("day1.spe", a), batchFile("day2.spe", b)].flat(), {}); }, [spe(gamma(5), { date: "03/15/2024 10:00:00" }), spe(gamma(6), { date: "03/16/2024 10:00:00" })]); await p.waitForTimeout(500);
  await p.locator(".modal:not([hidden]) button.primary").first().click(); await p.waitForTimeout(1200);
  const b = await p.evaluate(() => sheetCols(curSheet()).filter(c => c.role === "y").map(c => [c.name, (c.pipe || []).map(s => s.op).join(), finalOf(c).xu, (c.meta || {}).Measured]));
  check("several .Spe files at once: each calibrated, each with its own date", b.length === 2 && b.every(r => r[1] === "ecal" && r[2] === "keV") && b[0][3] === "2024-03-15 10:00:00" && b[1][3] === "2024-03-16 10:00:00", JSON.stringify(b));
}, { name: "an analyser's files" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
