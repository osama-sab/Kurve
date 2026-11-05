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

console.log("Slice 2: net counts over a local continuum, detection and activity, in the Integrate window");
await page(async p => {
  const counts = gamma(7); await p.evaluate(t => autoImport([{ name: "soil.spe", text: t }]), spe(counts)); await p.waitForTimeout(1200);
  const E = ch => 0.12 + 0.452 * ch + 1.1e-7 * ch * ch;
  await p.evaluate(([a, b, c, d]) => { addBand(a, b, { lab: "Line" }); addBand(c, d, { lab: "Nothing" }); openIntegrate(); }, [E(282), E(318), E(440), E(470)]); await p.waitForTimeout(800);
  const want = Array.from({ length: 1024 }, (_, i) => i).filter(i => E(i) >= E(282) - 1e-9 && E(i) <= E(318) + 1e-9).slice(3, -3).reduce((s, i) => s + peak(i, 300, 900, 3), 0);
  const r = await p.evaluate(() => { const res = bandCalc(activeYCol()); return { why: res.cs.why, kc: res.cs.kc, t: res.cs.t, rows: res.map(q => q.cnt && [q.cnt.N, q.cnt.sigN, q.cnt.det, q.cnt.lc]), html: (document.querySelector("#igCnt") || {}).innerText || "" }; });
  check("a counted spectrum's bands: the line's net counts within 4 σ of the counts it holds, detected", r.kc === 1 && r.t === 3600 && Math.abs(r.rows[0][0] - want) < 4 * r.rows[0][1] && r.rows[0][2], JSON.stringify([r.rows[0], want]));
  check("…a window with no line is not detected", r.rows[1][2] === false && /not detected/.test(r.html), JSON.stringify(r.rows[1]));
  // Emission and efficiency typed: the activity, and for the band with nothing, the detection limit.
  for (const [k, v] of [["ig", "85.1"], ["eff", "2.5"]]) for (const b of await p.evaluate(() => integOf().bands.map(b => b.id))) { const f = p.locator(`#ig-${k}-${b}`); await f.fill(v); await f.press("Enter"); await p.waitForTimeout(250); }
  const a = await p.evaluate(() => { const res = bandCalc(activeYCol()); return [activityOf(res[0].cnt, res.cs.t, res[0].b.eff, res[0].b.ig), activityOf(res[1].cnt, res.cs.t, res[1].b.eff, res[1].b.ig), document.querySelector("#igCnt").innerText]; });
  check("emission and efficiency typed: the activity, N ÷ (t ε I)", a[0] && Math.abs(a[0].A - r.rows[0][0] / (3600 * 0.025 * 0.851)) < 1e-6 * a[0].A && new RegExp(String(Math.round(a[0].A)).slice(0, 2)).test(a[2]), JSON.stringify(a.slice(0, 2)));
  check("…not detected, the detection limit as an activity (‹ MDA)", a[1] && !a[1].det && /< /.test(a[2]), a[2].slice(0, 300));
  check("one undo step a field", (await p.evaluate(() => { undo(); return [integOf().bands[1].eff, integOf().bands[0].eff]; })).join() === ",2.5");
  await p.evaluate(() => redo()); await p.waitForTimeout(200);
  check("a percentage out of range is refused in words", await p.evaluate(() => { const b = integOf().bands[0], f = document.getElementById("ig-ig-" + b.id); f.value = "140"; f.dispatchEvent(new Event("change")); return integOf().bands[0].ig === 85.1 && /percentage/.test(document.querySelector(".toast") ? document.querySelector(".toast").textContent : ""); }));
  // Copied and in the report.
  const tsv = await p.evaluate(() => integTableText(activeYCol()));
  check("Copy has the net counts, the critical level, the activity and the detection limit", /Net counts\t±\tRate \(counts\/s\)/.test(tsv) && /Activity \(Bq\)/.test(tsv) && tsv.split("\n").length === 3, tsv.split("\n")[0]);
  check("the report has the counted bands", await p.evaluate(() => /counted<\/h3>/.test(reportBandsHtml()) && /Currie/.test(reportBandsHtml())));
  // A count rate counts the same; smoothing makes them not counts.
  await p.evaluate(() => { const c = activeYCol(); pushUndo("rate"); save({ cols: P().cols.map(q => q.id === c.id ? Object.assign({}, q, { pipe: q.pipe.concat([makeStep("scale", { a: 1 / 3600, b: 0, yn: "Count rate", yu: "counts/s" })]) }) : q) }, "rate"); }); await p.waitForTimeout(500);
  const rr = await p.evaluate(() => { const res = bandCalc(activeYCol()); return [res.cs.kc, res[0].cnt.N]; });
  check("as a count rate (counts/s), the same net counts through the live time", rr[0] === 3600 && Math.abs(rr[1] - r.rows[0][0]) < 1e-6, JSON.stringify(rr));
  await p.evaluate(() => { const c = activeYCol(); save({ cols: P().cols.map(q => q.id === c.id ? Object.assign({}, q, { pipe: q.pipe.concat([makeStep("smooth", { method: "sg", win: 7, order: 2 })]) }) : q) }, "smooth"); }); await p.waitForTimeout(500);
  const w = await p.evaluate(() => [bandCalc(activeYCol()).cs.why, document.querySelector("#igCnt").innerText]);
  check("smoothed, they are not counts: the window says why", /counts as recorded: .*Smooth.* changes them/i.test(w[0]) && /counts as recorded/.test(w[1]), JSON.stringify(w));
  // In the dock, the counting table fits.
  await p.evaluate(() => undo()); await p.waitForTimeout(400);
  const fit = await p.evaluate(() => { const t = document.querySelector("#igCnt table"), b = document.querySelector("#w-integ .win-b"); return [t && Math.round(t.getBoundingClientRect().width), b && b.clientWidth]; });
  check("in the dock the counting table fits", fit[0] && fit[0] <= fit[1], JSON.stringify(fit));
}, { name: "counting", timeout: 120000 });

console.log("Slice 3: the detector's efficiency and resolution against energy");
await page(async p => {
  // A calibration source: three single lines and a doublet, noiseless so the numbers are exact.
  const counts = Array.from({ length: 1024 }, (_, i) => Math.round(200 * Math.exp(-i / 300) + 20 + peak(i, 300, 900, 3) + peak(i, 600, 400, 4) + peak(i, 800, 150, 4.5) + peak(i, 450, 300, 3.6) + peak(i, 458, 300, 3.6)));
  await p.evaluate(t => autoImport([{ name: "source.spe", text: t }]), spe(counts)); await p.waitForTimeout(1200);
  const E = ch => 0.12 + 0.452 * ch + 1.1e-7 * ch * ch;
  await p.evaluate(([w]) => { w.forEach(([a, b, nm]) => addBand(a, b, { lab: nm })); openIntegrate(); }, [[[E(282), E(318), "A"], [E(576), E(624), "B"], [E(773), E(827), "C"], [E(430), E(478), "Two"]]]); await p.waitForTimeout(600);
  const ids = await p.evaluate(() => integOf().bands.map(b => b.id));
  for (const [k, v] of [[0, "85.1"], [1, "50"], [2, "30"], [3, "10"]]) { const f = p.locator(`#ig-ig-${ids[k]}`); await f.fill(v); await f.press("Enter"); await p.waitForTimeout(200); }
  // The efficiency dialog, from Analyze › Spectroscopy › Detector.
  await p.evaluate(() => { const it = analyzeMenu ? null : null; detCalDlg("eff"); }); await p.waitForTimeout(400);
  await p.fill("#dcAct", "1000"); await p.click("#dcFrom"); await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ rows: [...document.querySelectorAll("#dcRows tr")].map(tr => [...tr.querySelectorAll("input")].map(i => +i.value)), msg: $("#dcMsg").textContent, svg: !!document.querySelector("#dcPv svg path") }));
  const want = await p.evaluate(() => { const res = bandCalc(activeYCol()); return res.filter(q => q.b.lab !== "Two").map(q => 100 * q.cnt.N / (1000 * 3600 * q.b.ig / 100)); });
  check("from the counted windows: an efficiency per line, N ÷ (A t I), the curve drawn", d.rows.length === 4 && want.every((w, i) => Math.abs(d.rows[i][1] / w - 1) < 1e-5) && d.svg && /4 points added/.test(d.msg), JSON.stringify([d.rows, want, d.msg]));
  // The doublet's point is not one line's: remove it, and save.
  await p.locator('#dcRows [data-dcdel="3"]').click(); await p.waitForTimeout(150);
  await p.click("#formOk"); await p.waitForTimeout(500);
  const sv = await p.evaluate(() => ({ cal: detCalOf().eff, log: P().log.slice(-1)[0].text }));
  check("saved with the project, one log line", sv.cal.pts.length === 3 && sv.cal.deg === 2 && sv.cal.xu === "keV" && /efficiency against energy from 3 points/.test(sv.log), JSON.stringify(sv));
  // With no efficiency typed, the counting uses the curve: the source's activity comes back.
  const a = await p.evaluate(() => { const c = activeYCol(), res = bandCalc(c), ec = detCurve("eff", finalOf(c).xu); return res.map(q => { const ef = bandEff(q, ec); return [q.b.lab, ef.from, activityOf(q.cnt, res.cs.t, ef.v, q.b.ig, ef.err)]; }); });
  check("no efficiency typed: the curve's, and the activity of each line is the source's 1000 Bq", a.slice(0, 3).every(r => r[1] === "curve" && Math.abs(r[2].A - 1000) < 1e-3), JSON.stringify(a.slice(0, 3).map(r => [r[0], r[1], r[2] && r[2].A])));
  const ph = await p.evaluate(id => { const f = document.getElementById("ig-eff-" + id); return [f.value, f.placeholder, f.title]; }, ids[0]);
  check("…its value shown in the field, greyed, with where it comes from", ph[0] === "" && +ph[1] > 0 && /efficiency curve/.test(ph[2]), JSON.stringify(ph));
  // The resolution, from the windows; the doublet's window is marked.
  await p.evaluate(() => detCalDlg("fwhm")); await p.waitForTimeout(300); await p.click("#dcFrom"); await p.waitForTimeout(200);
  await p.locator('#dcRows [data-dcdel="3"]').click(); await p.waitForTimeout(100); await p.click("#formOk"); await p.waitForTimeout(500);
  const w = await p.evaluate(() => [detCalOf().fwhm.pts.length, document.querySelector("#igCnt").innerText]);
  check("the resolution saved; the doublet's window is marked wider than a line there", w[0] === 3 && /wider than the resolution .* two lines\?/.test(w[1]) && (w[1].match(/two lines/g) || []).length === 1, JSON.stringify(w));
  // Points typed by hand, refused when too few, and one undo.
  await p.evaluate(() => undo()); await p.waitForTimeout(300);
  check("one undo takes the resolution back", await p.evaluate(() => detCalOf().fwhm.pts.length === 0 && detCalOf().eff.pts.length === 3));
  await p.evaluate(() => detCalDlg("eff")); await p.waitForTimeout(300);
  await p.locator("#dcRows [data-dcdel='0']").click(); await p.locator("#dcRows [data-dcdel='0']").click(); await p.waitForTimeout(100);
  check("too few points for the curve: said in words", /needs 3 points at least/.test(await p.textContent("#dcMsg")), await p.textContent("#dcMsg"));
  await p.click("#dcAdd"); const ins = p.locator("#dcRows tr:last-child input"); await ins.nth(0).fill("1408"); await ins.nth(1).fill("0.9"); await p.waitForTimeout(150);
  await p.click("#dcAdd"); const in2 = p.locator("#dcRows tr:last-child input"); await in2.nth(0).fill("80"); await in2.nth(1).fill("9.5"); await p.waitForTimeout(150);
  check("points typed by hand: the curve again", /^3 points; the curve is within/.test(await p.textContent("#dcMsg")) && await p.evaluate(() => !!document.querySelector("#dcPv svg path")), await p.textContent("#dcMsg"));
  await p.click("#formCancel"); await p.waitForTimeout(200);
  check("Cancel changes nothing", await p.evaluate(() => detCalOf().eff.pts.length === 3));
  check("the report names the curve", await p.evaluate(() => /efficiency curve's \(ln ε of degree 2 in ln E, 3 points\)/.test(reportBandsHtml())));
}, { name: "the detector's curves", timeout: 120000 });

console.log("Slice 4: a nuclide named by the set of its lines");
await page(async p => {
  // A background spectrum, 0.75 keV a channel: ²¹⁴Bi's six strong lines, ¹³⁷Cs, and ²⁰⁸Tl's 860 keV line alone.
  const eff = E => 6 * (E / 200) ** -0.9, fw = E => Math.sqrt(1 + 0.002 * E);
  const L = [[609.31, 45.49], [768.36, 4.89], [1120.29, 14.91], [1238.11, 5.83], [1764.49, 15.31], [2204.21, 4.91], [661.66, 85.1], [860.56, 12.5]];
  let sd = 9; const u = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const counts = Array.from({ length: 4096 }, (_, ch) => { const E = 0.75 * ch; let m = 300 * Math.exp(-E / 400) + 15; L.forEach(([x, i]) => { m += 45 * i * eff(x) / fw(x) * Math.exp(-0.5 * ((E - x) / (fw(x) / 2.3548)) ** 2); }); return Math.max(0, Math.round(m + Math.sqrt(m) * Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u()))); });
  const text = ["$SPEC_ID:", "Background", "$MEAS_TIM:", "80000 80400", "$DATA:", "0 4095", ...counts.map(String), "$MCA_CAL:", "2", "0 0.75 keV"].join("\n");
  await p.evaluate(t => autoImport([{ name: "bg.spe", text: t }]), text); await p.waitForTimeout(1200);
  await p.evaluate(() => { S.pkIdOpen = true; openPeakFinder(); }); await p.waitForTimeout(800);
  await p.evaluate(() => findPeaksInto()); await p.waitForTimeout(800);
  await p.evaluate(() => { S.idf = Object.assign(idfOpts(), { lib: "gbg" }); identifyPeaks(activeYCol()); }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const ns = nuclidesFor(activeYCol()); return { sets: ns.sets.map(s => [s.name, s.verdict, s.found, s.of]), html: (document.querySelector("#pkId .nuctab") || {}).innerText || "" }; });
  const v = n => (r.sets.find(s => s[0] === n) || [])[1];
  check("²¹⁴Bi present (6 of its 6 strong lines), ¹³⁷Cs present, ²⁰⁸Tl unlikely: its strongest lines are missing", v("²¹⁴Bi") === "present" && (r.sets.find(s => s[0] === "²¹⁴Bi") || [])[2] === 6 && v("¹³⁷Cs") === "present" && v("²⁰⁸Tl") === "unlikely", JSON.stringify(r.sets));
  check("the Peaks window's Identify part lists them, present first", /^Nuclide/.test(r.html) && /214Bi\s+Present[\s\S]*137Cs\s+Present[\s\S]*208Tl\s+Unlikely/.test(r.html), r.html.slice(0, 300));
  // With counted windows and the detector's efficiency, the strengths of one nuclide's lines agree.
  await p.evaluate(() => bandsFromPeaksUI()); await p.waitForTimeout(800);
  const noEff = await p.evaluate(() => nuclidesFor(activeYCol()).sets.find(s => s.name === "²¹⁴Bi").ratio);
  await p.evaluate(() => { const f = E => 6 * (E / 200) ** -0.9; save({ detcal: { eff: { pts: [100, 300, 600, 1200, 2400].map(E => ({ E, eff: f(E) })), deg: 1, xu: "keV" } } }, "efficiency"); }); await p.waitForTimeout(300);
  const withEff = await p.evaluate(() => nuclidesFor(activeYCol()).sets.find(s => s.name === "²¹⁴Bi").ratio);
  check("with no efficiency the strengths spread with energy; with the detector's curve they agree", noEff && noEff.spread > 2 && withEff && withEff.chi2 != null && withEff.chi2 / withEff.dof < 3 && withEff.spread < 1.4, JSON.stringify([noEff, withEff]));
  await p.evaluate(() => renderPeaks()); await p.waitForTimeout(200);
  check("…said in the table", /agree/.test(await p.evaluate(() => document.querySelector("#pkId .nuctab").innerText)));
  const w = await p.evaluate(() => { const t = document.querySelector("#pkId .nuctab"), b = document.querySelector("#w-peaks .win-b"); return [Math.round(t.getBoundingClientRect().width), b.clientWidth]; });
  check("in the dock the table fits", w[0] <= w[1], JSON.stringify(w));
}, { name: "nuclides", timeout: 120000 });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
