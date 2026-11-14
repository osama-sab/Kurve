/* The worksheet as a table (ux/spec/SHEET_SPEC.md, wave 3), each slice through the page as a person
   uses it: typed into, clicked, undone, reloaded, read back from a project file and from junk in storage.
   Needs Playwright with Chromium. Usage: node tools/sheet-drive.mjs [kurve.html]; ONLY=3.1 runs one
   section. */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const server = createServer((req, res) => { if (req.url.split("?")[0] === "/kurve.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(FILE)); } else { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}/kurve.html`;
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }
let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log("  ok   " + name); } else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 600))); } };
const ONLY = process.env.ONLY || "";
const want = s => !ONLY || ONLY.split(",").includes(s);
const browser = await chromium.launch();
const ready = (p) => p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 30000 });
async function page(fn, opt = {}) {
  const ctx = opt.ctx || await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), 240000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  if (!opt.ctx) await ctx.close().catch(() => {});
}
const near = (a, b, tol = 1e-12) => a === b || (a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)));
const same = (a, b, tol) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => (v == null && b[i] == null) || near(v, b[i], tol));
const toastText = p => p.evaluate(() => document.querySelector("#toast").textContent);

/* Sheet 1: X 1…10, B numbers with an empty cell at row 4, C text groups (ctl/trt) with a number at row 8;
   Sheet 2: A 101…106, B 5 numbers. */
const SETUP = () => {
  const x = [], b = [], c = [], ct = {};
  for (let i = 0; i < 10; i++) { x.push(i + 1); b.push(i === 3 ? null : (i + 1) * 1.5); c.push(null); ct[i] = i % 2 ? "trt" : "ctl"; }
  c[7] = 7; delete ct[7];
  const s2 = { id: "s2", name: "Sheet 2" };
  const cols = [makeCol("x", "X", "", x), Object.assign(makeCol("y", "Signal", "", b), { pipe: [], mask: [] }), Object.assign(makeCol("ignore", "Group", "", c), { txt: ct }),
    Object.assign(makeCol("x", "A", "", [101, 102, 103, 104, 105, 106]), { sheet: "s2" }), Object.assign(makeCol("y", "Ref", "", [2, 4, 6, 8, 10]), { sheet: "s2", pipe: [], mask: [] })];
  save({ cols, sheets: [{ id: "s1", name: "Sheet 1" }, s2], activeY: null }, "typed");
};
// Types a formula into column ci's F(x)= cell, as a person would: one click opens it, Enter enters it.
const typeFx = async (p, ci, s) => { await p.evaluate(() => { focusWin("sheet"); if (S.sheet !== "raw") { S.sheet = "raw"; renderWs(); } }); await p.waitForTimeout(100);
  await p.locator(`#ws td[data-r="-1"][data-ci="${ci}"]`).click(); await p.waitForTimeout(100); await p.keyboard.press("Control+A"); await p.keyboard.type(s, { delay: 5 }); await p.keyboard.press("Enter"); await p.waitForTimeout(250); };
const colVals = (p, ci, sid) => p.evaluate(([ci, sid]) => { const c = sheetCols(sid || "s1")[ci]; return c ? { data: c.data.slice(), fx: c.fx ? fxShow(c) : null, err: FX_ERR.get(c.id) || null } : null; }, [ci, sid]);

if (want("3.1")) {
  console.log("3.1 Formulas, further");
  await page(async p => {
    await p.evaluate(SETUP); await p.waitForTimeout(300);
    const B = [1.5, 3, 4.5, null, 7.5, 9, 10.5, 12, 13.5, 15], nb = B.filter(v => v != null), mean = nb.reduce((a, v) => a + v, 0) / nb.length;
    // Aggregates and rows of other rows, typed into the F(x)= row.
    await typeFx(p, 3, "B - mean(B)");
    let r = await colVals(p, 3);
    check("B - mean(B) typed into D's F(x)= row: each value less the mean of B's numbers, the empty row empty", same(r.data, B.map(v => v == null ? null : v - mean), 1e-14) && r.fx === "B - mean(B)", JSON.stringify(r));
    await typeFx(p, 4, "B[i-1]");
    r = await colVals(p, 4);
    check("B[i-1] is the row above, the first row and the row after an empty cell empty", same(r.data, [null, 1.5, 3, 4.5, null, 7.5, 9, 10.5, 12, 13.5]), JSON.stringify(r.data));
    await typeFx(p, 5, "B/B[1]");
    r = await colVals(p, 5);
    check("B/B[1] divides by the first row", same(r.data, B.map(v => v == null ? null : v / 1.5)), JSON.stringify(r.data));
    await typeFx(p, 6, "cumsum(B)");
    r = await colVals(p, 6); { let s = 0; const want = B.map(v => { if (v == null) return null; s += v; return s; });
      check("cumsum(B) is the running sum, an empty row empty and adding nothing", same(r.data, want), JSON.stringify(r.data)); }
    await typeFx(p, 7, 'if(C == "ctl", B, 0/0)');
    r = await colVals(p, 7);
    check('if(C == "ctl", B, 0/0) keeps B where the text is ctl; a number in C (row 8) is not ctl', same(r.data, B.map((v, i) => i % 2 === 0 && i !== 7 ? v : null).concat().slice(0, 9)), JSON.stringify(r.data));
    await typeFx(p, 8, "if(C = \"trt\", 1, 0) + (B > 10)");
    r = await colVals(p, 8);
    check("= inside brackets is equality, as a spreadsheet's; a comparison is 1 or 0", same(r.data, B.map((v, i) => v == null ? null : (i % 2 && i !== 7 ? 1 : 0) + (v > 10 ? 1 : 0))), JSON.stringify(r.data));
    // Another sheet, by a name with spaces ignored, shown as Excel writes it.
    await typeFx(p, 9, "Sheet2!B * 2");
    r = await colVals(p, 9);
    check("Sheet2!B reads column B of “Sheet 2” (spaces ignored when only one sheet fits), rows by number", same(r.data, [4, 8, 12, 16, 20]) && r.fx === "'Sheet 2'!B * 2", JSON.stringify(r));
    await typeFx(p, 10, "sum('Sheet 2'!B) + count(B)");
    r = await colVals(p, 10);
    check("an aggregate of another sheet's column; a formula reading no row has the sheet's rows", r.data.length === 10 && r.data.every(v => v === 30 + 9), JSON.stringify(r.data));
    await p.evaluate(() => { renameSheet("s2"); }); await p.waitForTimeout(100); await p.fill("#fdSn", "Raw data"); await p.click("#formOk"); await p.waitForTimeout(250);
    r = await colVals(p, 9);
    check("the sheet renamed: the formula shows its new name and reads the same column", r.fx === "'Raw data'!B * 2" && same(r.data, [4, 8, 12, 16, 20]), JSON.stringify(r));
    await p.evaluate(() => { showSheet("s2"); }); await p.waitForTimeout(150);
    await p.evaluate(() => { wsSelect(0, 1, false); wsInsertCols("left"); }); await p.waitForTimeout(250);
    await p.evaluate(() => { showSheet("s1"); }); await p.waitForTimeout(150);
    r = await colVals(p, 9);
    check("a column inserted before it on that sheet: the formula follows the column, now C", r.fx === "'Raw data'!C * 2" && same(r.data, [4, 8, 12, 16, 20]), JSON.stringify(r));
    // Refusals in words, the box kept open to put it right.
    await typeFx(p, 11, 'B < "a"');
    r = await p.evaluate(() => ({ t: document.querySelector("#toast").textContent, edit: !!(S.ws && S.ws.edit) }));
    check('B < "a" refused: text is compared with == or !=', /compares numbers; a text can only be compared with == or !=/.test(r.t) && r.edit, JSON.stringify(r));
    await p.keyboard.press("Escape");
    await typeFx(p, 11, "Sheet9!B");
    r = await toastText(p);
    check("Sheet9!B refused: there is no sheet called Sheet9, the sheets named", /no sheet called “Sheet9”: the sheets are Sheet 1 and Raw data/.test(r), r);
    await p.keyboard.press("Escape");
    await typeFx(p, 4, "E[i-1] + B");
    r = await toastText(p);
    check("E[i-1] in E itself refused, pointing at cumsum", /cannot read its own values, at another row either.*cumsum/.test(r), r);
    await p.keyboard.press("Escape");
    await typeFx(p, 11, "B[i-1");
    r = await toastText(p);
    check("an unclosed row bracket says what is missing", /Expected \] to close the row of B/.test(r), r);
    await p.keyboard.press("Escape");
    // The live check and the suggestions while typing.
    await p.locator('#ws td[data-r="-1"][data-ci="11"]').click(); await p.waitForTimeout(100);
    await p.keyboard.type("if(B > ", { delay: 5 }); await p.waitForTimeout(150);
    r = await p.evaluate(() => ({ h: $("#wsValHint").textContent, cls: $("#wsValHint").className, sig: (document.querySelector("#fxSug .fxs-sig") || {}).textContent || "" }));
    check("if(B >  being typed: said quietly as not finished, and if's arguments shown", /Not finished yet/.test(r.h) && !/badt/.test(r.cls) && /if\(condition, when it holds/.test(r.sig), JSON.stringify(r));
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
    await p.locator('#ws td[data-r="-1"][data-ci="11"]').click(); await p.waitForTimeout(100);
    await p.keyboard.type("med", { delay: 5 }); await p.waitForTimeout(150);
    r = await p.evaluate(() => [...document.querySelectorAll("#fxSug .fxs-i code")].map(e => e.textContent));
    check("“med” offers median, a worksheet function", r.includes("median"), JSON.stringify(r));
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
    await p.locator('#ws td[data-r="-1"][data-ci="11"]').click(); await p.waitForTimeout(100);
    await p.keyboard.type("'Raw data'!", { delay: 5 }); await p.waitForTimeout(150);
    r = await p.evaluate(() => [...document.querySelectorAll("#fxSug .fxs-i")].map(e => e.textContent));
    check("after 'Raw data'! the list is that sheet's columns", r.length === 3 && /^.*A.*Raw data: A/.test(r[0]) && /Raw data: Ref/.test(r[2]), JSON.stringify(r));
    await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
    r = await p.evaluate(() => { const items = fxsSheetItems(null, ""); return { sheets: items.filter(i => i.kind === "sheet").map(i => i.name), fit: (() => { try { compileExpr("y = sum(x)*a"); return "compiled"; } catch (e) { return e.message; } })() }; });
    check("the list offers the other sheet as 'Raw data'!, and a fit function still knows no sum", JSON.stringify(r.sheets) === JSON.stringify(["'Raw data'!"]) && /no function called “sum”/.test(r.fit), JSON.stringify(r));
    // Undo takes a formula back.
    const n0 = await p.evaluate(() => sheetCols("s1").length);
    await typeFx(p, 11, "sd(B)");
    r = await p.evaluate(() => { const c = sheetCols("s1")[11]; return c && c.data[0]; });
    { const m = nb.reduce((a, v) => a + v, 0) / nb.length, sd = Math.sqrt(nb.reduce((a, v) => a + (v - m) ** 2, 0) / (nb.length - 1));
      check("sd(B) is the standard deviation of B's numbers (n − 1)", near(r, sd, 1e-14), [r, sd]); }
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    r = await p.evaluate(() => sheetCols("s1").length);
    check("undo takes the new formula column away", r === n0, [r, n0]);
  }, { name: "formulas" });

  await page(async p => {
    await p.evaluate(SETUP); await p.waitForTimeout(300);
    // Constants: Data › Constants… adds one, a formula reads it.
    await p.evaluate(() => { constDlg(); }); await p.waitForTimeout(150);
    await p.click("#kAdd"); await p.waitForTimeout(80);
    await p.fill("#kN_0", "k_B"); await p.fill("#kV_0", "1.380649e-23"); await p.fill("#kU_0", "J/K"); await p.fill("#kT_0", "Boltzmann"); await p.waitForTimeout(80);
    await p.click("#kAdd"); await p.waitForTimeout(80);
    await p.fill("#kN_1", "B"); await p.fill("#kV_1", "2"); await p.waitForTimeout(80);
    let r = await p.evaluate(() => ({ dis: $("#formOk").disabled, hint: $("#kHint").textContent }));
    check("a constant named B is refused: Done waits, the hint says why", r.dis && /Row 2: B is a column's letters/.test(r.hint), JSON.stringify(r));
    await p.fill("#kN_1", "N_A"); await p.fill("#kV_1", "6.02214076e23"); await p.waitForTimeout(80);
    r = await p.evaluate(() => ({ dis: $("#formOk").disabled, hint: $("#kHint").textContent }));
    check("…named N_A it is taken", !r.dis && !r.hint, JSON.stringify(r));
    await p.click("#formOk"); await p.waitForTimeout(250);
    r = await p.evaluate(() => ({ k: P().consts, log: P().log.slice(-1)[0].text, t: document.querySelector("#toast").textContent }));
    check("Done stores both constants, one log line naming them", r.k && r.k.length === 2 && r.k[0].name === "k_B" && r.k[0].v === 1.380649e-23 && r.k[0].unit === "J/K" && /added the constant k_B = 1\.380649e-23 J\/K; added the constant N_A/.test(r.log), JSON.stringify(r));
    await typeFx(p, 3, "B*k_B*N_A");
    r = await colVals(p, 3);
    const R = 1.380649e-23 * 6.02214076e23;
    check("B*k_B*N_A reads both constants", same(r.data, [1.5, 3, 4.5, null, 7.5, 9, 10.5, 12, 13.5, 15].map(v => v == null ? null : v * 1.380649e-23 * 6.02214076e23), 1e-14) && r.fx === "B*k_B*N_A", JSON.stringify(r));
    r = await p.evaluate(() => [...(fxsSheetItems(null, "") || [])].filter(i => i.kind === "const").map(i => i.name + " " + i.desc));
    check("the suggestions list the constants with their values", r.some(s => /^k_B 1\.380649e-23 J\/K · Boltzmann/.test(s)), JSON.stringify(r));
    // Changed and renamed: the formula follows.
    await p.evaluate(() => { constDlg(); }); await p.waitForTimeout(150);
    await p.fill("#kN_0", "kB"); await p.fill("#kV_0", "2e-23"); await p.waitForTimeout(80); await p.click("#formOk"); await p.waitForTimeout(250);
    r = await colVals(p, 3);
    check("renamed kB and changed: the formula shows kB and is worked out again", r.fx === "B*kB*N_A" && near(r.data[0], 1.5 * 2e-23 * 6.02214076e23, 1e-14), JSON.stringify(r));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    r = await colVals(p, 3);
    check("undo puts k_B and its value back, and the column with them", r.fx === "B*k_B*N_A" && near(r.data[0], 1.5 * R, 1e-14), JSON.stringify(r));
    // Deleting one a formula reads: a second press, the formula's error, undo.
    await p.evaluate(() => { constDlg(); }); await p.waitForTimeout(150);
    await p.click('[data-kdel="0"]'); await p.waitForTimeout(80);
    r = await p.evaluate(() => ({ rows: document.querySelectorAll("#kRows tr[data-ki]").length, hint: $("#kHint").textContent }));
    check("the first press on a constant in use says which column reads it and keeps it", r.rows === 2 && /Column Sheet 1!D reads k_B.*Press × again/.test(r.hint), JSON.stringify(r));
    await p.click('[data-kdel="0"]'); await p.waitForTimeout(80); await p.click("#formOk"); await p.waitForTimeout(250);
    r = await colVals(p, 3);
    check("the second deletes it: the formula says the constant has gone, the column empty", /the constant it called k_B has been deleted/.test(r.err) && !r.data.length, JSON.stringify(r));
    await p.evaluate(() => undo()); await p.waitForTimeout(200);
    r = await colVals(p, 3);
    check("undo brings it back and the column works again", !r.err && near(r.data[0], 1.5 * R, 1e-14), JSON.stringify(r));
    // The report's Method names the formulas and the constants.
    r = await p.evaluate(() => methodLines().filter(l => /^Column formulas|^Constants/.test(l)));
    check("the report's Method lists the column formulas and the constants with their readers", r.length === 2 && /Sheet 1!D = B\*k_B\*N_A/.test(r[0]) && /k_B = 1\.380649e-23 J\/K \(Boltzmann\), read by Sheet 1!D; N_A = 6\.02214076e23, read by/.test(r[1]), JSON.stringify(r));
    // A project file carries them.
    r = await p.evaluate(async () => { const doc = JSON.parse(JSON.stringify(pfDoc(S.pid))); await pfOpenDoc(doc, "Copy.kurve"); await new Promise(r => setTimeout(r, 300)); const c = sheetCols("s1")[3]; return { k: (P().consts || []).map(k => k.name), fx: c && fxShow(c), v: c && c.data[0] }; });
    check("a project file opens with its constants and the formula reading them", JSON.stringify(r.k) === JSON.stringify(["k_B", "N_A"]) && r.fx === "B*k_B*N_A" && near(r.v, 1.5 * R, 1e-14), JSON.stringify(r));
  }, { name: "constants" });

  // Reloaded, and junk from storage.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let pid;
    await page(async p => {
      await p.evaluate(SETUP); await p.waitForTimeout(300);
      await p.evaluate(() => { setConsts([{ id: "kq", name: "q", v: 1.602176634e-19, unit: "C", note: "" }]); });
      await typeFx(p, 3, "B*q + Sheet2!B[i]");
      pid = await p.evaluate(() => { flushEdits(); return S.pid; });
      await p.waitForTimeout(800);
    }, { name: "before a reload", ctx });
    await page(async p => {
      await p.evaluate(pid => { if (S.pid !== pid) switchProject(pid); }, pid); await p.waitForTimeout(500);
      let r = await colVals(p, 3);
      check("after a reload the constant and the formula are there, worked out again (rows past Sheet 2's B empty)", r && r.fx === "B*q + 'Sheet 2'!B[i]" && same(r.data, [1.5 * 1.602176634e-19 + 2, 3 * 1.602176634e-19 + 4, 4.5 * 1.602176634e-19 + 6, null, 7.5 * 1.602176634e-19 + 10], 1e-15), JSON.stringify(r));
      r = await p.evaluate(() => { const q = JSON.parse(JSON.stringify(P())); q.consts = [null, 5, {}, { id: "a", name: "B", v: 1 }, { id: "b", name: "ok", v: "x" }, { id: "c", name: " good ", v: 2, unit: 7 }, { id: "c", name: "again", v: 3 }, { id: "d", name: "good", v: 4 }, { id: "e", name: "inf", v: Infinity }];
        migrate(q); return q.consts; });
      check("junk in p.consts from storage: only a good constant stays, its name trimmed, a unit that is no text dropped", JSON.stringify(r) === JSON.stringify([{ id: "c", name: "good", v: 2, unit: "", note: "" }]), JSON.stringify(r));
      r = await p.evaluate(() => { const q = JSON.parse(JSON.stringify(P())); q.consts = "nonsense"; migrate(q); return "consts" in q; });
      check("p.consts that is not a list is dropped", r === false, r);
    }, { name: "after a reload", ctx });
    // Two tabs, each adding a constant at once: both kept.
    const [a, b] = [await ctx.newPage(), await ctx.newPage()];
    for (const q of [a, b]) { await q.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort()); await q.goto(URL); await ready(q); await q.evaluate(pid => { if (S.pid !== pid) switchProject(pid); }, pid); }
    await a.waitForTimeout(500);
    await Promise.all([a.evaluate(() => setConsts(constList().concat([{ id: "ka", name: "fromA", v: 1, unit: "", note: "" }]))), b.evaluate(() => setConsts(constList().concat([{ id: "kb", name: "fromB", v: 2, unit: "", note: "" }])))]);
    await a.waitForTimeout(1500);
    const ka = await a.evaluate(() => constList().map(k => k.name).sort()), kb = await b.evaluate(() => constList().map(k => k.name).sort());
    check("two tabs each adding a constant at once: both tabs end with both", JSON.stringify(ka) === JSON.stringify(["fromA", "fromB", "q"]) && JSON.stringify(kb) === JSON.stringify(ka), JSON.stringify([ka, kb]));
    await ctx.close();
  }

  // Every formula of before gives the values it gave: today's grammar against the arithmetic alone.
  await page(async p => {
    const r = await p.evaluate(() => { const srcs = ["B*2", "(B-C)/A", "log10(B)", "1e7/x", "B/max(B, 1e-9)", "B*2 + i", "pow(B, 0)", "step(B - 3)", "sqrt(abs(B)) - C", "min(B, C, 4)", "u = B*2; u + 1", "-B^2", "atan2(B, C)"];
      const B = [1, 2, null, 4, -5, 6, 0], C = [2, null, 3, 0.5, 1, 7, 2], A = [3, 3, 3, 3, 3, 3, 3], X = [10, 20, 30, 40, 50, null, 70], bad = [];
      srcs.forEach(src => { const old = compileExpr(src, { allowNone: true }), nw = compileExpr(src, { allowNone: true, sheet: true });
        const cols = { A, B, C }, ins = old.params.map(n => n === "i" ? "i" : cols[n]);
        const want = []; for (let r = 0; r < 7; r++) { let ok = true; const pv = ins.map(o => { if (o === "i") return r + 1; const u = o[r]; if (u == null) ok = false; return u; }); let v = null; if (ok) { const xv = old.usesX ? X[r] : r + 1; if (xv != null) { const y = old.f(xv, pv); v = Number.isFinite(y) ? y : null; } } want.push(v); }
        while (want.length && want[want.length - 1] == null) want.pop();
        const got = fxRun(nw, nw.params.map(n => cols[n]), nw.params.map(() => null), old.usesX ? X : null, 7);
        if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(src + ": " + JSON.stringify(got) + " ≠ " + JSON.stringify(want)); });
      return bad; });
    check("thirteen formulas of before give the same values in the worksheet's grammar (missing in, missing out)", !r.length, r.join(" | "));
  }, { name: "formulas of before" });
}

if (want("3.3")) {
  console.log("3.3 Filters");
  // X 1…40, B = (i*7) % 23 (ties), C text groups a/b/c with an empty cell every 9th row, D = i.
  const SET33 = () => { const x = [], b = [], d = [], ct = {}; for (let i = 0; i < 40; i++) { x.push(i + 1); b.push((i * 7) % 23); d.push(i); if (i % 9 !== 4) ct[i] = "abc"[i % 3]; }
    save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "B", "", b), { pipe: [], mask: [] }), Object.assign(makeCol("ignore", "Group", "", new Array(40).fill(null)), { txt: ct }), Object.assign(makeCol("y", "D", "", d), { pipe: [], mask: [] })], activeY: null }, "typed"); };
  const B = Array.from({ length: 40 }, (_, i) => (i * 7) % 23), G = Array.from({ length: 40 }, (_, i) => i % 9 !== 4 ? "abc"[i % 3] : null);
  const view = p => p.evaluate(() => ({ n: S.wsm.n, rows: S.wsm.ord ? S.wsm.ord.slice() : null, foot: $("#wsFoot").textContent, funnels: [...document.querySelectorAll("#ws [data-filt]")].map(b => ({ id: b.dataset.filt, old: b.classList.contains("old"), title: b.title })) }));
  await page(async p => {
    await p.evaluate(SET33); await p.waitForTimeout(300); await p.evaluate(() => focusWin("sheet"));
    // A condition through the dialog, from the column menu's Filter submenu.
    let r = await p.evaluate(() => { const c = sheetCols()[1]; const it = colMenuItems ? null : null; return filterItems(c.id).map(i => i.label); });
    check("the column menu's Filter lists Filter by column B…, Apply again and Clear every filter", r[0] === "Filter by column B…" && r.includes("Apply the filter again") && r.some(l => /Clear every filter/.test(l)), JSON.stringify(r));
    await p.evaluate(() => { filtDlg(sheetCols()[1].id); }); await p.waitForTimeout(150);
    r = await p.evaluate(() => ({ cond: $("#fdMc").checked, list: document.querySelectorAll(".fdv").length }));
    check("B has 23 values, so the dialog opens on conditions (its values listed too)", r.cond && r.list === 23, JSON.stringify(r));
    await p.selectOption("#fd1Op", "gt"); await p.fill("#fd1A", "15"); await p.waitForTimeout(80);
    const wantGt = B.map((v, i) => v > 15 ? i : -1).filter(i => i >= 0);
    r = await p.textContent("#fdN");
    check("the hint counts the rows it would show as it is set", r === `B > 15: ${wantGt.length} of 40 rows would be shown.`, r);
    await p.click("#formOk"); await p.waitForTimeout(250);
    r = await view(p);
    check("B > 15: the view keeps those rows, in their order", JSON.stringify(r.rows) === JSON.stringify(wantGt) && r.n === wantGt.length, JSON.stringify(r.rows));
    check("…B's letter carries the funnel, its tooltip the condition", r.funnels.length === 1 && /Filtered: B > 15/.test(r.funnels[0].title) && !r.funnels[0].old, JSON.stringify(r.funnels));
    check("…and the foot says how many rows are shown, filtered by B", new RegExp(`${wantGt.length} of 40 rows shown, filtered by B`).test(r.foot) && /Clear/.test(r.foot), r.foot);
    r = await p.evaluate(() => ({ t: $("#toast").textContent, log: P().log.slice(-1)[0].text, data: sheetCols()[1].data.length, fp: P().raw.fp }));
    check("a toast with Undo and a log line; the data are untouched", /^Filtered by B > 15: \d+ of 40 rows shown\.Undo$/.test(r.t) && /filtered by B > 15/.test(r.log) && r.data === 40, JSON.stringify(r));
    // Values ticked on the text column, searched; two columns combine by and.
    await p.evaluate(() => { filtDlg(sheetCols()[2].id); }); await p.waitForTimeout(150);
    r = await p.evaluate(() => ({ vals: $("#fdMv").checked, list: [...document.querySelectorAll(".fdv")].map(e => e.querySelector("label").textContent.trim() + " " + e.querySelector(".num").textContent) }));
    check("the text column opens on its values: a, b, c and (empty), with their counts", r.vals && JSON.stringify(r.list) === JSON.stringify(["a 14", "b 9", "c 13", "(empty) 4"]), JSON.stringify(r.list));
    await p.fill("#fdQ", "b"); await p.waitForTimeout(80);
    r = await p.evaluate(() => [...document.querySelectorAll(".fdv")].filter(e => !e.hidden).map(e => e.querySelector("label").textContent.trim() + " " + e.querySelector(".num").textContent));
    check("the search keeps the values containing it in the list", JSON.stringify(r) === JSON.stringify(["b 9"]), JSON.stringify(r));
    await p.fill("#fdQ", ""); await p.click("#fdNone"); await p.click("#fdV_0"); await p.click("#fdV_2"); await p.waitForTimeout(80);
    await p.click("#formOk"); await p.waitForTimeout(250);
    const wantTwo = wantGt.filter(i => G[i] === "a" || G[i] === "c");
    r = await view(p);
    check("C is a or c, with B > 15: both columns' conditions hold in every row shown", JSON.stringify(r.rows) === JSON.stringify(wantTwo) && r.funnels.length === 2 && /filtered by B, C/.test(r.foot), JSON.stringify([r.rows, wantTwo, r.foot]));
    // Two conditions joined by or, then undo and redo.
    await p.evaluate(() => { filtDlg(sheetCols()[1].id); }); await p.waitForTimeout(150);
    await p.selectOption("#fd1Op", "lt"); await p.fill("#fd1A", "3"); await p.selectOption("#fdJoin", "or"); await p.selectOption("#fd2Op", "top"); await p.fill("#fd2A", "2"); await p.waitForTimeout(80);
    r = await p.textContent("#fdN");
    check("two conditions read back as words: B < 3 or B among the 2 largest", /^B < 3 or B among the 2 largest: \d+ of 40 rows would be shown \(with the other columns' filters\)\.$/.test(r), r);
    await p.click("#formOk"); await p.waitForTimeout(250);
    const top2 = [...B].sort((a, b) => b - a)[1], wantOr = B.map((v, i) => (v < 3 || v >= top2) && (G[i] === "a" || G[i] === "c") ? i : -1).filter(i => i >= 0);
    r = await view(p);
    check("…its rows: the two largest kept with their ties", JSON.stringify(r.rows) === JSON.stringify(wantOr), JSON.stringify([r.rows, wantOr]));
    await p.evaluate(() => undo()); await p.waitForTimeout(250); r = await view(p);
    check("undo puts B > 15 back", JSON.stringify(r.rows) === JSON.stringify(wantTwo), JSON.stringify(r.rows));
    await p.evaluate(() => redo()); await p.waitForTimeout(250); r = await view(p);
    check("redo the or", JSON.stringify(r.rows) === JSON.stringify(wantOr), JSON.stringify(r.rows));
    // A value typed that fails stays in view until the filter is applied again.
    const first = wantOr[0];
    await p.locator('#ws td[data-r="0"][data-ci="1"]').click(); await p.keyboard.type("10"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
    r = await view(p); const t = await toastText(p);
    check("a value typed that fails the filter (10 in a row of B < 3) stays in view, the funnels and foot saying the filter is older", r.rows.includes(first) && r.funnels.every(f => f.old) && /Apply again/.test(r.foot), JSON.stringify([r.rows.slice(0, 3), r.funnels, r.foot]));
    check("…said once, with Apply it again", /stay as they were in view until the filter is applied again\.Apply it again$/.test(t), t);
    await p.click("#wsFiltRe"); await p.waitForTimeout(250); r = await view(p);
    check("Apply again: the row leaves the view, the funnels are themselves again", !r.rows.includes(first) && r.funnels.every(f => !f.old) && !/Apply again/.test(r.foot), JSON.stringify([r.rows.slice(0, 3), r.foot]));
    await p.evaluate(() => undo()); await p.waitForTimeout(250);
    // What a filter blocks: a block pasted, a fill, rows inserted; each with the way out.
    r = await p.evaluate(() => { wsSelect(0, 1, false); wsPasteText("1\t2\n3\t4"); return $("#toast").textContent; });
    check("a block pasted is refused with Clear it", /^Clear the filter first: a block fills every row, the filter's hidden ones too\.Clear it$/.test(r), r);
    r = await p.evaluate(() => { openFillDlg("rows"); return $("#toast").textContent; });
    check("a fill is refused the same way", /^Clear the filter first: a fill follows every row/.test(r), r);
    r = await p.evaluate(() => { wsRowsEdit("insert", false); return $("#toast").textContent; });
    check("rows inserted are refused the same way", /^Clear the filter first: rows are inserted and deleted/.test(r), r);
    // Sorted with a filter on: the rows shown, in the sort's order.
    r = await p.evaluate(() => { wsSortBy(sheetCols()[3].id, -1); const o = S.wsm.ord.slice(); wsSortBy(null, 0); return o; });
    check("sorting with a filter on orders the rows shown", JSON.stringify(r) === JSON.stringify([...wantOr].reverse()), JSON.stringify(r));
    // An analysis made on the filtered sheet takes the conditions as its rows; a later filter does not change it.
    await p.evaluate(() => { wsSelect(0, 3, false); anaDlg("desc", { cols: [sheetCols()[3].id] }); }); await p.waitForTimeout(200);
    r = await p.evaluate(() => ({ on: $("#aWhere") && $("#aWhere").checked, lab: $("#aWhere") && $("#aWhere").parentElement.textContent.trim() }));
    check("Statistics on columns on a filtered sheet offers its rows, ticked, naming the conditions", r.on && r.lab === "Only the rows where (B < 3 or B among the 2 largest) and (C is “a” or “c”)", JSON.stringify(r));
    await p.click("#formOk"); await p.waitForTimeout(400);
    const nTwo = wantOr.length;
    r = await p.evaluate(() => { const a = P().ana[0]; return { N: a.res.report.sections[0].tables[0].rows[0][1], notes: a.res.report.notes || [] }; });
    check("its N is the rows the filter showed, and its report says which rows", r.N === nTwo && r.notes.some(n => n === `Rows where (Sheet 1!B < 3 or Sheet 1!B among the 2 largest) and (Sheet 1!C is “a” or “c”) (${nTwo} of 40).`), JSON.stringify(r));
    await p.evaluate(() => { showSheet("s1"); setFilter("s1", null, null); }); await p.waitForTimeout(300);
    r = await p.evaluate(() => P().ana[0].res.report.sections[0].tables[0].rows[0][1]);
    check("clearing the filter afterwards leaves the analysis's rows as they were", r === nTwo, r);
    await p.evaluate((k) => { const c = sheetCols("s1")[1]; const d = c.data.slice(); d[k] = 10; save({ cols: P().cols.map(o => o.id === c.id ? Object.assign({}, o, { data: d }) : o) }, "changed B"); renderAll(); }, wantOr[0]); await p.waitForTimeout(400);
    r = await p.evaluate(() => P().ana[0].res.report.sections[0].tables[0].rows[0][1]);
    check("a value of B changed so its row fails its conditions: the analysis follows them (one row fewer)", r === nTwo - 1, r);
    // Junk from storage.
    r = await p.evaluate(() => { const q = JSON.parse(JSON.stringify(P())); q.wsFilter = { s1: { x: { c1: { op: "gt", a: "7" } }, y: { vals: [1, "a", null, {}] }, z: { c1: { op: "nope" } }, ok: { c1: { op: "top", n: 150, pct: true } }, good: { c1: { op: "between", a: 1, b: 2 }, c2: { op: "teq", t: "x" }, join: "or" } }, s2: 5, s3: [] };
      migrate(q); const a = q.ana[0]; a.in.where = { k: { c1: { op: "le", a: NaN } } }; migrate(q); return { f: q.wsFilter, w: q.ana[0].in.where }; });
    check("junk in p.wsFilter from storage: only a condition that reads stays; an analysis's junk rows go", JSON.stringify(r.f) === JSON.stringify({ s1: { good: { c1: { op: "between", a: 1, b: 2 }, c2: { op: "teq", t: "x" }, join: "or" } } }) && r.w === undefined, JSON.stringify(r));
  }, { name: "filters" });
  // Kept across a reload and in a project file.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let pid;
    await page(async p => { await p.evaluate(SET33); await p.waitForTimeout(300); await p.evaluate(() => setFilter("s1", sheetCols("s1")[1].id, { c1: { op: "ge", a: 20 } })); pid = await p.evaluate(() => { flushEdits(); return S.pid; }); await p.waitForTimeout(800); }, { name: "a filter before a reload", ctx });
    await page(async p => {
      await p.evaluate(pid => { if (S.pid !== pid) switchProject(pid); focusWin("sheet"); }, pid); await p.waitForTimeout(500);
      let r = await view(p); const want = B.map((v, i) => v >= 20 ? i : -1).filter(i => i >= 0);
      check("after a reload the sheet is filtered as it was", JSON.stringify(r.rows) === JSON.stringify(want) && r.funnels.length === 1, JSON.stringify(r.rows));
      r = await p.evaluate(async () => { const doc = JSON.parse(JSON.stringify(pfDoc(S.pid))); await pfOpenDoc(doc, "F.kurve"); await new Promise(r => setTimeout(r, 300)); focusWin("sheet"); renderWs(); return { f: P().wsFilter, n: S.wsm.n }; });
      check("a project file carries the filter", r.f && Object.values(r.f.s1 || {})[0].c1.op === "ge" && r.n === want.length, JSON.stringify(r));
    }, { name: "a filter after a reload", ctx });
    await ctx.close();
  }
}

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
