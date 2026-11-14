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

if (want("3.2")) {
  console.log("3.2 Two worksheet windows");
  const two = () => { const cols = [makeCol("x", "X", "", [1, 2, 3, 4]), Object.assign(makeCol("y", "Signal", "", [1.5, 3, 4.5, 6]), { pipe: [], mask: [] }), Object.assign(makeCol("ignore", "Note", "", [null, null, null, null]), { txt: { 0: "a", 2: "c" } }),
    Object.assign(makeCol("x", "A", "", [101, 102, 103]), { sheet: "s2" }), Object.assign(makeCol("y", "Ref", "", [2, 4, 6]), { sheet: "s2", pipe: [], mask: [] })];
    save({ cols, sheets: [{ id: "s1", name: "Sheet 1" }, { id: "s2", name: "Calib" }], activeY: null }, "typed"); };
  const st = p => p.evaluate(() => ({ live: wsLiveWin(), cur: curSheet(), main: mainSheet(), wins: Object.keys(WINS).filter(k => WINS[k].swin), grid: $("#ws").closest(".win").id, pic: !!$("#w-sheet .win-b > .wssnap"),
    picText: ($("#w-sheet .wssnap") || { textContent: "" }).textContent, tk: [...document.querySelectorAll("#taskbar .tk[data-tk]")].map(b => b.dataset.tk), title: ($("#w-sw-s2 .win-t") || {}).textContent }));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let pid;
  await page(async p => {
    await p.evaluate(two); await p.waitForTimeout(300);
    // From the tab's right-click menu.
    await p.click('#wsTabs [data-wst="s2"]', { button: "right" }); await p.waitForTimeout(150);
    await p.locator(".menu button", { hasText: "Open in a window of its own" }).first().click(); await p.waitForTimeout(400);
    let r = await st(p);
    check("a sheet opened in a window of its own from its tab's menu: the grid there, the worksheet window a picture of the other sheet, both in the taskbar", r.live === "sw-s2" && r.cur === "s2" && r.grid === "w-sw-s2" && r.pic && /Signal/.test(r.picText) && !/Ref/.test(r.picText) && r.tk.join() === "sheet,sw-s2" && r.title === "Calib", JSON.stringify(r));
    // Typing in one window and then the other, the keys going to the window in front.
    await p.locator("#w-sheet .wssnap td[data-r='2'][data-ci='1']").click(); await p.waitForTimeout(250);
    await p.keyboard.type("9.5"); await p.keyboard.press("Enter"); await p.keyboard.type("8"); await p.keyboard.press("Enter"); await p.waitForTimeout(800);
    r = await p.evaluate(() => ({ s1: sheetCols("s1")[1].data, s2: sheetCols("s2")[1].data, live: wsLiveWin(), ws: [S.ws.r, S.ws.c] }));
    check("a press on the worksheet window's picture brings it forward with that cell selected; what is typed goes into its sheet", r.live === "sheet" && JSON.stringify(r.s1) === "[1.5,3,9.5,8]" && JSON.stringify(r.s2) === "[2,4,6]", JSON.stringify(r));
    await p.locator("#w-sw-s2 .wssnap td[data-r='1'][data-ci='1']").click(); await p.waitForTimeout(250);
    await p.keyboard.type("44"); await p.keyboard.press("Tab"); await p.keyboard.type("x1"); await p.keyboard.press("Enter"); await p.waitForTimeout(800);
    r = await p.evaluate(() => ({ s1: sheetCols("s1")[1].data, s2: sheetCols("s2").map(c => [c.name, c.data, txtOf(c)]), live: wsLiveWin() }));
    check("…and back in the other window, its sheet takes the keys, Tab moving within it", r.live === "sw-s2" && JSON.stringify(r.s1) === "[1.5,3,9.5,8]" && r.s2[1][1][1] === 44 && r.s2[2] && r.s2[2][2] && r.s2[2][2][1] === "x1", JSON.stringify(r));
    // The worksheet window's tab for a sheet in a window of its own brings that window forward.
    await p.evaluate(() => focusWin("sheet")); await p.waitForTimeout(200);
    r = await p.evaluate(() => { const t = document.querySelector('#wsTabs [data-wst="s2"]'); return { own: t.classList.contains("own"), title: t.title }; });
    await p.click('#wsTabs [data-wst="s2"]'); await p.waitForTimeout(300);
    const r2 = await st(p);
    check("the worksheet window's tab for that sheet says so, and brings its window forward", r.own && /window of its own/.test(r.title) && r2.live === "sw-s2", JSON.stringify([r, r2.live]));
    // A column dragged from the window worked in onto the other window moves to its sheet, one undo step.
    await p.evaluate(() => focusWin("sheet")); await p.waitForTimeout(250);
    const before = await p.evaluate(() => undoStack.length);
    await p.click("#ws th[data-ch='2']"); await p.waitForTimeout(150);
    const a = await p.locator("#ws th[data-ch='2']").boundingBox(), b2 = await p.locator("#w-sw-s2 .wssnap").boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 60, a.y + 40, { steps: 4 });
    await p.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2, { steps: 8 }); const marked = await p.evaluate(() => $("#w-sw-s2").classList.contains("dropin")); await p.mouse.up(); await p.waitForTimeout(500);
    r = await p.evaluate(() => ({ s1: sheetCols("s1").map(c => c.name), s2: sheetCols("s2").map(c => c.name), undo: undoStack.length, toast: $("#toast").textContent }));
    check("a column's letter dragged onto the other window (outlined while over it) moves the column to that sheet, one undo step, the toast with Undo", marked && JSON.stringify(r.s1) === '["X","Signal"]' && r.s2.includes("Note") && r.undo === before + 1 && /Moved column C \(Note\) to Calib/.test(r.toast) && /Undo/.test(r.toast), JSON.stringify([marked, r]));
    await p.evaluate(() => undo()); await p.waitForTimeout(400);
    r = await p.evaluate(() => ({ s1: sheetCols("s1").map(c => c.name), s2: sheetCols("s2").map(c => c.name) }));
    check("…undone, the column is back", JSON.stringify(r.s1) === '["X","Signal","Note"]' && !r.s2.includes("Note"), JSON.stringify(r));
    // Renamed, the window's title follows; deleted, its window goes, and undo brings both back.
    await p.evaluate(() => { const p = P(); p.sheets = p.sheets.map(s => s.id === "s2" ? Object.assign({}, s, { name: "Calibration" }) : s); save({ sheets: p.sheets }, "renamed"); }); await p.waitForTimeout(300);
    r = await st(p); check("the sheet renamed: its window's title and taskbar button follow", r.title === "Calibration" && await p.evaluate(() => WINS["sw-s2"].title) === "Calibration", JSON.stringify(r));
    await p.evaluate(() => { deleteSheet("s2"); }); await p.waitForTimeout(400); if (await p.evaluate(() => !$("#dlgModal").hidden)) { await p.click("#dlgOk"); await p.waitForTimeout(400); }
    r = await st(p);
    check("the sheet deleted: its window goes, the grid back in the worksheet window", !r.wins.length && r.grid === "w-sheet" && r.live === "sheet" && !r.tk.includes("sw-s2"), JSON.stringify(r));
    await p.evaluate(() => undo()); await p.waitForTimeout(400);
    r = await st(p); check("…undone: the sheet and its window back", r.wins.join() === "sw-s2", JSON.stringify(r));
    pid = await p.evaluate(() => { flushEdits(); saveLayout(); return S.pid; }); await p.waitForTimeout(600);
  }, { name: "two worksheet windows", ctx });
  await page(async p => {
    await p.evaluate(pid => { if (S.pid !== pid) switchProject(pid); }, pid); await p.waitForTimeout(600);
    let r = await st(p);
    check("after a reload the sheet's window is back with its sheet", r.wins.join() === "sw-s2" && r.tk.includes("sw-s2") && await p.evaluate(() => winOpen("sw-s2")), JSON.stringify(r));
    // Closed by its ×: the sheet stays, shown in the worksheet window.
    await p.evaluate(() => focusWin("sw-s2")); await p.waitForTimeout(200);
    await p.click("#w-sw-s2 [data-wclose]"); await p.waitForTimeout(400);
    r = await st(p);
    check("its window closed: the sheet stays, shown in the worksheet window", !r.wins.length && r.live === "sheet" && r.cur === "s2" && await p.evaluate(() => sheetList().length) === 2, JSON.stringify(r));
    // Window › New worksheet window lists the sheets; the last sheet of the worksheet window is kept.
    const items = await p.evaluate(() => newSheetWinItems().filter(i => i && i.label).map(i => [i.label, i.enabled !== false]));
    check("Window › New worksheet window lists the sheets and A new sheet", JSON.stringify(items) === JSON.stringify([["Sheet 1", true], ["Calibration", true], ["A new sheet", true]]), JSON.stringify(items));
    await p.evaluate(() => { openSheetWin("s1"); }); await p.waitForTimeout(300);
    await p.evaluate(() => { openSheetWin("s2"); }); await p.waitForTimeout(300);
    r = await p.evaluate(() => ({ wins: swList(), toast: $("#toast").textContent }));
    check("the worksheet window keeps a sheet: the last one cannot leave it", r.wins.join() === "s1" && /keeps a sheet/.test(r.toast), JSON.stringify(r));
    // Both windows at 1024 and 390 px wide.
    for (const [w, h] of [[1024, 768], [390, 844]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
      r = await p.evaluate(() => { const a = $("#w-sheet").getBoundingClientRect(), b = $("#w-sw-s1").getBoundingClientRect(); return { a: [a.width, a.height], b: [b.width, b.height], grid: $("#ws").closest(".win").id }; });
      check(`at ${w} px both windows are on the desk with something to see`, r.a[0] > 150 && r.a[1] > 100 && r.b[0] > 150 && r.b[1] > 100, JSON.stringify(r)); }
  }, { name: "worksheet windows after a reload", ctx });
  await ctx.close();
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

if (want("3.4")) {
  console.log("3.4 Conditional formatting");
  await page(async p => {
    // cfEval's kinds, as the page runs it.
    let r = await p.evaluate(() => { const v = [1, 5, 5, null, 9, 3, null], t = { 3: "a", 6: "b" }, n = 7;
      return { seq: cfEval(v, t, [{ kind: "scale", pal: "seq" }], n), div: cfEval(v, t, [{ kind: "scale", pal: "div" }], n), typed: cfEval(v, t, [{ kind: "scale", pal: "seq", lo: 0, hi: 10 }], n),
        gt: cfEval(v, t, [{ kind: "hi", op: "gt", a: 4, fill: "red" }], n), dup: cfEval(v, t, [{ kind: "hi", op: "dup", fill: "blue" }], n), uniq: cfEval(v, t, [{ kind: "hi", op: "uniq", fill: "grey" }], n),
        txt: cfEval(v, t, [{ kind: "hi", op: "teq", t: "A", fill: "green" }], n), empty: cfEval([1, null, 2], null, [{ kind: "hi", op: "empty", fill: "yellow" }], 3),
        order: cfEval(v, t, [{ kind: "hi", op: "gt", a: 4, fill: "red" }, { kind: "scale", pal: "seq" }], n), one: cfEval([4, 4], null, [{ kind: "scale", pal: "div" }], 2), top: cfEval(v, t, [{ kind: "hi", op: "top", n: 1, fill: "red" }], n) }; });
    check("a two-colour scale: smallest s0, largest s6, the rest by their place, text and empty left", JSON.stringify(r.seq) === JSON.stringify(["s0", "s3", "s3", null, "s6", "s2", null]), JSON.stringify(r.seq));
    check("a three-colour scale: the median (5) the middle d3, below it toward d0, above toward d6", JSON.stringify(r.div) === JSON.stringify(["d0", "d3", "d3", null, "d6", "d2", null]), JSON.stringify(r.div));
    check("ends typed (0 to 10) place the numbers on them", JSON.stringify(r.typed) === JSON.stringify(["s1", "s3", "s3", null, "s5", "s2", null]), JSON.stringify(r.typed));
    check("highlights: greater than, duplicates, values seen once, text (capitals ignored), empty, the largest", JSON.stringify(r.gt) === JSON.stringify([null, "red", "red", null, "red", null, null]) && JSON.stringify(r.dup) === JSON.stringify([null, "blue", "blue", null, null, null, null]) &&
      JSON.stringify(r.uniq) === JSON.stringify(["grey", null, null, "grey", "grey", "grey", "grey"]) && JSON.stringify(r.txt) === JSON.stringify([null, null, null, "green", null, null, null]) && JSON.stringify(r.empty) === JSON.stringify([null, "yellow", null]) && JSON.stringify(r.top) === JSON.stringify([null, null, null, null, "red", null, null]), JSON.stringify(r));
    check("the first rule that has something to say decides; a column of one value sits in the middle", JSON.stringify(r.order) === JSON.stringify(["s0", "red", "red", null, "red", "s2", null]) && JSON.stringify(r.one) === JSON.stringify(["d3", "d3"]), JSON.stringify([r.order, r.one]));
    // Through the dialogs, as a person sets them.
    await p.evaluate(() => { const x = [], b = [], ct = {}; for (let i = 0; i < 20; i++) { x.push(i + 1); b.push(i % 7); ct[i] = "pq"[i % 2]; }
      save({ cols: [makeCol("x", "X", "", x), Object.assign(makeCol("y", "B", "", b), { pipe: [], mask: [] }), Object.assign(makeCol("ignore", "G", "", new Array(20).fill(null)), { txt: ct })], activeY: null }, "typed"); focusWin("sheet"); });
    await p.waitForTimeout(300);
    r = await p.evaluate(() => cfItems(sheetCols()[1].id).map(i => i.label + (i.enabled === false ? " (off)" : "")));
    check("the column menu's Conditional formatting: a scale, a highlight, manage and clear (these two off with no rules)", JSON.stringify(r) === JSON.stringify(["Colour scale…", "Highlight cells…", "Manage the rules… (off)", "Clear the rules of column B (off)", "Clear the rules of this sheet (off)"]), JSON.stringify(r));
    await p.evaluate(() => { cfScaleDlg(sheetCols()[1].id); }); await p.waitForTimeout(150); await p.click("#formOk"); await p.waitForTimeout(250);
    const cells = (ci) => p.evaluate(ci => [...document.querySelectorAll(`#ws tbody td[data-ci="${ci}"]`)].slice(0, 8).map(t => (t.className.match(/cf-(\S+)/) || [])[1] || null), ci);
    r = await cells(1);
    check("a colour scale on B fills its cells by their place (0 → s0, 6 → s6)", JSON.stringify(r) === JSON.stringify(["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s0"]), JSON.stringify(r));
    r = await p.evaluate(() => ({ t: $("#toast").textContent, log: P().log.slice(-1)[0].text }));
    check("one toast with Undo and a log line", /^Put a colour scale on column B\.Undo$/.test(r.t) && r.log === "put a colour scale on column B", JSON.stringify(r));
    await p.evaluate(() => { cfHiDlg(sheetCols()[1].id); }); await p.waitForTimeout(150);
    await p.selectOption("#cfOp", "ge"); await p.fill("#cfA", "5"); await p.click('label[title="red"]'); await p.waitForTimeout(80);
    r = await p.textContent("#cfN");
    check("the highlight's dialog counts the cells it would fill", r === "B ≥ 5: red: 5 of 20 cells.", r);
    await p.click("#formOk"); await p.waitForTimeout(250);
    r = await cells(1);
    check("a highlight made after the scale goes first: B ≥ 5 red over the scale", JSON.stringify(r) === JSON.stringify(["s0", "s1", "s2", "s3", "s4", "red", "red", "s0"]), JSON.stringify(r));
    // Read as drawn: the fill under a cell is the token's, in both themes; the selection draws over it.
    r = await p.evaluate(() => { const td = document.querySelector('#ws tbody td[data-ci="1"][data-r="5"]'), bg = getComputedStyle(td).backgroundColor, probe = document.createElement("div"); probe.style.background = "var(--cf-red)"; document.body.appendChild(probe); const want = getComputedStyle(probe).backgroundColor; probe.remove(); return { bg, want }; });
    check("a red cell is drawn in --cf-red", r.bg === r.want, JSON.stringify(r));
    await p.locator('#ws tbody td[data-ci="1"][data-r="4"]').click(); await p.keyboard.down("Shift"); await p.locator('#ws tbody td[data-ci="1"][data-r="5"]').click(); await p.keyboard.up("Shift"); await p.waitForTimeout(150);
    r = await p.evaluate(() => { const td = document.querySelector('#ws tbody td[data-ci="1"][data-r="5"]'); return { in: td.classList.contains("in"), bg: getComputedStyle(td).backgroundColor, sel: getComputedStyle(document.documentElement).getPropertyValue("--ws-sel") }; });
    check("…and in a range selected it shows the selection, not the fill", r.in && !/rgba\(0, 0, 0, 0\)/.test(r.bg) && r.bg !== (await p.evaluate(() => { const probe = document.createElement("div"); probe.style.background = "var(--cf-red)"; document.body.appendChild(probe); const c = getComputedStyle(probe).backgroundColor; probe.remove(); return c; })), JSON.stringify(r));
    // Manage: move down, delete, change; undo.
    await p.evaluate(() => { cfManageDlg(sheetCols()[1].id); }); await p.waitForTimeout(150);
    r = await p.evaluate(() => [...document.querySelectorAll("#cfRows .cfrow .grow")].map(e => e.textContent));
    check("Manage lists the rules in order", JSON.stringify(r) === JSON.stringify(["B ≥ 5: red", "A two-colour scale"]), JSON.stringify(r));
    await p.click('[data-cfdn="0"]'); await p.click("#formOk"); await p.waitForTimeout(250);
    r = await cells(1);
    check("moved below the scale, the highlight no longer shows", JSON.stringify(r) === JSON.stringify(["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s0"]), JSON.stringify(r));
    await p.evaluate(() => undo()); await p.waitForTimeout(250); r = await cells(1);
    check("undo puts the order back", r[5] === "red", JSON.stringify(r));
    await p.evaluate(() => { cfManageDlg(sheetCols()[1].id); }); await p.waitForTimeout(150); await p.click('[data-cfed="0"]'); await p.waitForTimeout(250);
    r = await p.evaluate(() => ({ title: $("#formTitle").textContent, op: $("#cfOp").value, a: $("#cfA").value }));
    check("a rule's pencil opens its own dialog with its settings", r.title === "Highlight cells of column B" && r.op === "ge" && r.a === "5", JSON.stringify(r));
    await p.fill("#cfA", "6"); await p.click("#formOk"); await p.waitForTimeout(250); r = await cells(1);
    check("…changed to B ≥ 6", JSON.stringify(r) === JSON.stringify(["s0", "s1", "s2", "s3", "s4", "s5", "red", "s0"]), JSON.stringify(r));
    await p.evaluate(() => { cfHiDlg(sheetCols()[2].id); }); await p.waitForTimeout(150); await p.selectOption("#cfOp", "teq"); await p.fill("#cfA", "P"); await p.click('label[title="green"]'); await p.click("#formOk"); await p.waitForTimeout(250);
    r = await cells(2);
    check("text highlighted on a text column (P matches p)", JSON.stringify(r) === JSON.stringify(["green", null, "green", null, "green", null, "green", null]), JSON.stringify(r));
    // A value typed changes its fill at once.
    await p.locator('#ws td[data-r="0"][data-ci="1"]').click(); await p.keyboard.type("6"); await p.keyboard.press("Enter"); await p.waitForTimeout(400); r = await cells(1);
    check("a value typed (0 → 6) takes its fill at once", r[0] === "red", JSON.stringify(r));
    // A dialog's listeners go with it: a filter dialog, then this one typed into, no page errors (the page wrapper counts them).
    await p.evaluate(() => { filtDlg(sheetCols()[1].id); }); await p.waitForTimeout(150); await p.click("#formCancel"); await p.waitForTimeout(100);
    await p.evaluate(() => { cfScaleDlg(sheetCols()[1].id); }); await p.waitForTimeout(150); await p.fill("#csLo", "1"); await p.click("#formCancel"); await p.waitForTimeout(100);
    await p.evaluate(() => { constDlg(); }); await p.waitForTimeout(150); await p.click("#kAdd"); await p.fill("#kN_0", "q"); await p.click("#formCancel"); await p.waitForTimeout(100);
    // Clear the sheet's, undo; junk from storage.
    await p.evaluate(() => { cfItems(sheetCols()[1].id).find(i => i.label === "Clear the rules of this sheet").run(); }); await p.waitForTimeout(250);
    r = await p.evaluate(() => P().wsCf || null);
    check("Clear the rules of this sheet takes every column's", r === null, JSON.stringify(r));
    await p.evaluate(() => undo()); await p.waitForTimeout(250);
    r = await p.evaluate(() => Object.values(P().wsCf || {}).map(l => l.length));
    check("…undone", JSON.stringify(r) === JSON.stringify([2, 1]), JSON.stringify(r));
    r = await p.evaluate(() => { const q = JSON.parse(JSON.stringify(P())); q.wsCf = { a: [{ kind: "scale", pal: "seq" }, { kind: "scale", pal: "rainbow" }, { kind: "hi", op: "gt", a: 1, fill: "magenta" }, { kind: "hi", op: "dup", fill: "red" }, null, 7], b: "x", c: [] }; migrate(q); return q.wsCf; });
    check("junk in p.wsCf from storage: only rules that read stay", JSON.stringify(r) === JSON.stringify({ a: [{ kind: "scale", pal: "seq" }, { kind: "hi", op: "dup", fill: "red" }] }), JSON.stringify(r));
  }, { name: "conditional formatting" });
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let pid;
    await page(async p => { await p.evaluate(() => { save({ cols: [makeCol("x", "X", "", [1, 2, 3]), Object.assign(makeCol("y", "B", "", [3, 1, 2]), { pipe: [], mask: [] })], activeY: null }, "t"); }); await p.waitForTimeout(200);
      await p.evaluate(() => setCf(sheetCols()[1].id, [{ kind: "scale", pal: "seq" }], "put a colour scale on")); pid = await p.evaluate(() => { flushEdits(); return S.pid; }); await p.waitForTimeout(700); }, { name: "a scale before a reload", ctx });
    await page(async p => { await p.evaluate(pid => { if (S.pid !== pid) switchProject(pid); focusWin("sheet"); renderWs(); }, pid); await p.waitForTimeout(400);
      const r = await p.evaluate(() => [...document.querySelectorAll('#ws tbody td[data-ci="1"]')].slice(0, 3).map(t => (t.className.match(/cf-(\S+)/) || [])[1] || null));
      check("after a reload the cells keep their fills", JSON.stringify(r) === JSON.stringify(["s6", "s0", "s3"]), JSON.stringify(r)); }, { name: "a scale after a reload", ctx });
    await ctx.close();
  }
}

if (want("3.5")) {
  console.log("3.5 Reshaping");
  // Sheet 1: X 1…8, A numbers with a gap, G text a/b, H text p/q; Lookup: K keys, E values.
  const SET35 = () => { const ct = { 0: "a", 1: "b", 2: "a", 3: "b", 4: "a", 5: "b", 6: "a", 7: "b" }, ht = { 0: "p", 1: "p", 2: "q", 3: "q", 4: "p", 5: "p", 6: "q", 7: "q" };
    save({ cols: [makeCol("x", "X", "s", [1, 2, 3, 4, 5, 6, 7, 8]), Object.assign(makeCol("y", "A", "mV", [10, 20, null, 40, 50, 60, 70, 80]), { pipe: [], mask: [] }), Object.assign(makeCol("ignore", "G", "", new Array(8).fill(null)), { txt: ct }), Object.assign(makeCol("ignore", "H", "", new Array(8).fill(null)), { txt: ht }),
      Object.assign(makeCol("x", "K", "", [1, 2, 3, 4]), { sheet: "s2" }), Object.assign(makeCol("y", "E", "", [100, 200, 300, 400]), { sheet: "s2", pipe: [], mask: [] })], sheets: [{ id: "s1", name: "Sheet 1" }, { id: "s2", name: "Lookup" }], activeY: null }, "typed"); };
  const ids = p => p.evaluate(() => Object.fromEntries(sheetCols("s1").map(c => [c.name, c.id]).concat(sheetCols("s2").map(c => ["s2:" + c.name, c.id]))));
  const result = p => p.evaluate(() => { const a = P().ana[P().ana.length - 1]; return { name: a.name, err: a.res && a.res.err, notes: a.res && a.res.notes, sheet: a.out.sheet, cols: P().cols.filter(c => c.ana === a.id).map(c => [c.name, Array.from({ length: Math.max((c.data || []).length, txtLen(c)) }, (_, i) => catVal(c, i))]) }; });
  const open = async (p, kind) => { await p.evaluate(k => { showSheet("s1"); anaDlg(k); }, kind); await p.waitForTimeout(250); };
  const tickOnly = async (p, want) => { for (const [nm, id] of Object.entries(await ids(p))) { if (nm.startsWith("s2:")) continue; const on = want.includes(nm), b = await p.$("#aI_" + id); if (b && (await b.isChecked()) !== on) await b.click(); } };
  await page(async p => {
    await p.evaluate(SET35); await p.waitForTimeout(300); const I = await ids(p);
    let r = await p.evaluate(() => dataMenu().find(i => i.label === "Reshape").sub().map(i => i.label));
    check("Data › Reshape lists the ten kinds", JSON.stringify(r) === JSON.stringify(["Stack columns…", "Unstack…", "Split by groups…", "Pivot table…", "Reduce rows…", "Duplicate rows…", "A sorted copy…", "Transpose…", "Join two sheets…", "Append sheets…"]), JSON.stringify(r));
    // Stack: A stacked with X kept beside.
    await open(p, "stack"); await tickOnly(p, ["X", "A"]); await p.click("#aSk_" + I.X); await p.click("#formOk"); await p.waitForTimeout(400);
    r = await result(p);
    check("Stack columns: A under itself with X beside and a column naming it, the empty cell left out", !r.err && JSON.stringify(r.cols) === JSON.stringify([["X", [1, 2, 4, 5, 6, 7, 8]], ["Column", Array(7).fill("A")], ["Value", [10, 20, 40, 50, 60, 70, 80]]]), JSON.stringify(r));
    r = await p.evaluate(() => { const c = P().cols.find(c => c.ana && c.name === "Value"); return { role: c.role, unit: c.unit, tab: [...document.querySelectorAll("#wsTabs .wstab")].map(t => t.textContent.trim()) }; });
    check("…its values a Y in mV, on a result sheet of its own", r.role === "y" && r.unit === "mV" && r.tab.some(t => /Stacked 1/.test(t)), JSON.stringify(r));
    // It follows its data.
    await p.evaluate(id => { const c = colById(id), d = c.data.slice(); d[2] = 30; save({ cols: P().cols.map(o => o.id === id ? Object.assign({}, o, { data: d }) : o) }, "typed"); renderAll(); }, I.A); await p.waitForTimeout(400);
    r = await result(p);
    check("a value typed into A (row 3): the stack is worked out again, with it", JSON.stringify(r.cols[2][1]) === JSON.stringify([10, 20, 30, 40, 50, 60, 70, 80]), JSON.stringify(r.cols[2]));
    // Pivot: G down, H across, the mean of A, totals.
    await open(p, "pivot"); await tickOnly(p, ["A", "G", "H"]); await p.selectOption("#aVr", I.G); await p.selectOption("#aVc", I.H); await p.selectOption("#aVv", I.A); await p.selectOption("#aVa", "mean"); await p.click("#formOk"); await p.waitForTimeout(400);
    r = await result(p);
    check("Pivot table: G by H, the mean of A, with totals", JSON.stringify(r.cols) === JSON.stringify([["G", ["a", "b", "Total"]], ["p", [30, 40, 35]], ["q", [50, 60, 55]], ["Total", [40, 50, 45]]]), JSON.stringify(r.cols));
    // Unstack A by G, by order.
    await open(p, "unstack"); await tickOnly(p, ["A", "G"]); await p.selectOption("#aUv", I.A); await p.selectOption("#aUg", I.G); await p.click("#formOk"); await p.waitForTimeout(400);
    r = await result(p);
    check("Unstack: A in a column per level of G, in their order", JSON.stringify(r.cols) === JSON.stringify([["a", [10, 30, 50, 70]], ["b", [20, 40, 60, 80]]]), JSON.stringify(r.cols));
    // Duplicates of G and H: the first of each.
    await open(p, "dedup"); await tickOnly(p, ["A", "G", "H"]); await p.click("#aEk_" + I.G); await p.click("#aEk_" + I.H); const k0 = await p.isChecked("#aEk_" + I.X); if (k0) await p.click("#aEk_" + I.X);
    await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    check("Duplicate rows by G and H, the first of each kept", JSON.stringify(r.cols) === JSON.stringify([["A", [10, 20, 30, 40]], ["G", ["a", "b", "a", "b"]], ["H", ["p", "p", "q", "q"]]]), JSON.stringify(r.cols));
    // A sorted copy by A descending; the original keeps its order.
    await open(p, "sortcopy"); await tickOnly(p, ["X", "A"]); await p.selectOption("#aOb0", I.A); await p.selectOption("#aOd0", "-1"); await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    const orig = await p.evaluate(id => colById(id).data.slice(), I.X);
    check("A sorted copy by A, descending; X follows its rows; the original sheet's order unchanged", JSON.stringify(r.cols) === JSON.stringify([["X", [8, 7, 6, 5, 4, 3, 2, 1]], ["A", [80, 70, 60, 50, 40, 30, 20, 10]]]) && JSON.stringify(orig) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]), JSON.stringify(r.cols));
    // Reduce: merge every 3 rows by their mean.
    await open(p, "reduce"); await tickOnly(p, ["X", "A"]); await p.selectOption("#aDm", "merge"); await p.fill("#aDn", "3"); await p.selectOption("#aDa", "mean"); await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    check("Reduce rows: every 3 merged by their mean, the last two on their own (said)", JSON.stringify(r.cols) === JSON.stringify([["X", [2, 5, 7.5]], ["A", [20, 50, 75]]]) && r.notes.some(n => /last 2 rows merged on their own/.test(n)), JSON.stringify(r));
    // Split by G.
    await open(p, "split"); await tickOnly(p, ["A", "G"]); await p.selectOption("#aPg", I.G); await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    check("Split by G: a block of A per level", JSON.stringify(r.cols) === JSON.stringify([["A (a)", [10, 30, 50, 70]], ["A (b)", [20, 40, 60, 80]]]), JSON.stringify(r.cols));
    // Transpose, the rows named by X.
    await open(p, "transp"); await tickOnly(p, ["X", "A"]); await p.click("#aTn"); await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    check("Transpose: a column per row, named by X", r.cols.length === 9 && r.cols[0][0] === "Column" && r.cols[1][0] === "1" && JSON.stringify(r.cols[3][1]) === JSON.stringify([30]), JSON.stringify(r.cols.slice(0, 4)));
    // Join with Lookup on X = K, every row of this sheet.
    await open(p, "join"); await tickOnly(p, ["X", "A"]); await p.selectOption("#aJl", I.X); await p.selectOption("#aJs", "s2"); await p.selectOption("#aJr", I["s2:K"]); await p.selectOption("#aJh", "left"); await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    check("Join two sheets: every row of this one, E where X matches Lookup's K", JSON.stringify(r.cols) === JSON.stringify([["X", [1, 2, 3, 4, 5, 6, 7, 8]], ["A", [10, 20, 30, 40, 50, 60, 70, 80]], ["E", [100, 200, 300, 400]]]), JSON.stringify(r.cols));
    // Append Lookup under X and A by position, the sheet named.
    await open(p, "append"); await tickOnly(p, ["X", "A"]); await p.selectOption("#aAb", "pos"); await p.click("#formOk"); await p.waitForTimeout(400); r = await result(p);
    check("Append sheets by position, each row's sheet named", JSON.stringify(r.cols[0]) === JSON.stringify(["Sheet", Array(8).fill("Sheet 1").concat(Array(4).fill("Lookup"))]) && JSON.stringify(r.cols[2][1].slice(-4)) === JSON.stringify([100, 200, 300, 400]), JSON.stringify(r.cols));
    // A filter's rows taken: stack only the rows where G is a.
    await p.evaluate(gid => { showSheet("s1"); setFilter("s1", gid, { vals: ["a"] }); }, I.G); await p.waitForTimeout(200);
    await open(p, "stack"); await tickOnly(p, ["A"]); r = await p.evaluate(() => $("#aWhere") && $("#aWhere").checked); await p.click("#formOk"); await p.waitForTimeout(400);
    const rr = await result(p);
    check("on a filtered sheet a reshape offers the filter's rows, ticked, and keeps only them", r && JSON.stringify(rr.cols[1][1]) === JSON.stringify([10, 30, 50, 70]) && rr.notes.some(n => /^Rows where/.test(n)), JSON.stringify(rr));
    // Cut from its data: the cells stay, an ordinary sheet; undo.
    r = await p.evaluate(() => { const a = P().ana[P().ana.length - 1]; anaCut(a.id); const sid = a.out.sheet, cs = sheetCols(sid); return { ana: P().ana.some(x => x.id === a.id), n: cs.length, cut: cs.every(c => !c.ana), vals: cs.map(c => Array.from({ length: Math.max(c.data.length, txtLen(c)) }, (_, i) => catVal(c, i))) }; });
    check("Cut from its data: the cells stay, numbers and text, on an ordinary sheet", !r.ana && r.cut && JSON.stringify(r.vals) === JSON.stringify([["A", "A", "A", "A"], [10, 30, 50, 70]]), JSON.stringify(r));
    await p.evaluate(() => undo()); await p.waitForTimeout(300);
    r = await p.evaluate(() => P().ana.length);
    check("…undone, the analysis is back", r === 11, r);
  }, { name: "reshaping" });
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let pid;
    await page(async p => { await p.evaluate(SET35); await p.waitForTimeout(300); const I = await ids(p); await open(p, "pivot"); await tickOnly(p, ["A", "G"]); await p.selectOption("#aVr", I.G); await p.selectOption("#aVv", I.A); await p.selectOption("#aVa", "sum"); await p.click("#formOk"); await p.waitForTimeout(400);
      pid = await p.evaluate(() => { flushEdits(); return S.pid; }); await p.waitForTimeout(800); }, { name: "a pivot before a reload", ctx });
    await page(async p => { await p.evaluate(pid => { if (S.pid !== pid) switchProject(pid); }, pid); await p.waitForTimeout(500);
      const r = await result(p); check("after a reload the pivot table is there", JSON.stringify(r.cols) === JSON.stringify([["G", ["a", "b", "Total"]], ["Sum of A", [130, 200, 330]]]), JSON.stringify(r.cols)); }, { name: "a pivot after a reload", ctx });
    await ctx.close();
  }
}

if (want("3.7")) {
  console.log("3.7 Excel");
  const XD = join(here, "ref", "xlsx"), dlg = p => p.evaluate(() => !$("#formModal").hidden), imp = p => p.evaluate(() => !$("#impModal").hidden);
  await page(async p => {
    // A workbook of several sheets: listed first, the first that Excel shows ticked, the empty one left out.
    await p.setInputFiles("#fileIn", join(XD, "sheets.xlsx")); await p.waitForFunction(() => !$("#formModal").hidden, null, { timeout: 8000 });
    let r = await p.evaluate(() => ({ title: $("#formTitle").textContent, rows: [...document.querySelectorAll("#formBody .xlpick label")].map(l => l.textContent.trim().replace(/\s+/g, " ")), ticked: [...document.querySelectorAll("#formBody .xlpick input:checked")].map(i => i.id) }));
    check("sheets.xlsx: its four sheets that hold anything listed with their sizes, a hidden one said, the first ticked", r.title === "Import sheets.xlsx" && r.rows.length === 5 && /^Raw data 33 rows × 3 columns/.test(r.rows[0]) && /Calc 14 rows × 3 columns/.test(r.rows[1]) && /Hidden one .*hidden in Excel/.test(r.rows[2]) && /Every sheet/.test(r.rows[4]) && r.ticked.join() === "xlS0", JSON.stringify(r));
    await p.click("#xlAll"); r = await p.evaluate(() => [...document.querySelectorAll("#formBody .xlpick input:checked")].length);
    check("Every sheet ticks them all", r === 5, r);
    await p.click("#xlAll"); r = await p.evaluate(() => $("#formOk").disabled);
    check("…and none ticked, Import waits", r === true, r);
    await p.click("#xlS1"); await p.click("#formOk");
    await p.waitForFunction(() => !$("#impModal").hidden, null, { timeout: 8000 });
    r = await p.evaluate(() => ({ title: $("#impTitle").textContent, side: $("#impSide").textContent.replace(/\s+/g, " "), delim: !!$("#impDelim"), start: !!$("#impStart") }));
    check("one sheet ticked: the import dialog on it, named, its cells read without a delimiter to choose", r.title === "Import sheets.xlsx › Calc" && /Read from the cells of the sheet Calc/.test(r.side) && !r.delim && r.start && /names and units from its 2 frozen rows/.test(r.side), JSON.stringify(r));
    await p.click("#impGo"); await p.waitForTimeout(600);
    r = await p.evaluate(() => ({ sheets: sheetList().map(s => s.name), cols: sheetCols().map(c => [c.role, c.name, c.unit, c.data.slice(0, 3)]), file: sheetCols()[1].file }));
    check("imported into the empty project: its sheet named Calc, names and units from the frozen rows, the values", r.sheets.join() === "Calc" && JSON.stringify(r.cols) === JSON.stringify([["x", "Time", "s", [0, 10, 20]], ["y", "Temperature", "°C", [20, 21.5, 23]], ["y", "2019", "K", [293.15, 294.15, 295.15]]]) && r.file === "sheets.xlsx", JSON.stringify(r));
    // Every sheet at once: each on a sheet of its own, one undo step.
    const before = await p.evaluate(() => ({ n: P().cols.length, rec: (P().raw.hist || []).length, undo: undoStack.length }));
    await p.setInputFiles("#fileIn", join(XD, "sheets.xlsx")); await p.waitForFunction(() => !$("#formModal").hidden, null, { timeout: 8000 });
    await p.click("#xlAll"); await p.click("#formOk"); await p.waitForTimeout(800);
    r = await p.evaluate(() => ({ sheets: sheetList().map(s => s.name), origin: sheetCols(sheetList().find(s => s.name === "Origin").id).map(c => [c.name, c.unit, c.comm || ""]), raw: sheetCols(sheetList().find(s => s.name === "Raw data").id).map(c => [c.name, c.data.length, textCount(c)]), rec: (P().raw.hist || []).length, undo: undoStack.length, log: P().log[P().log.length - 1].text, toast: $("#toast").textContent }));
    check("every sheet ticked: four sheets more, each named after its Excel sheet, Calc again as Calc (2)", r.sheets.join("|") === "Calc|Raw data|Calc (2)|Hidden one|Origin", JSON.stringify(r.sheets));
    check("…the third frozen row is each column's comment", JSON.stringify(r.origin) === JSON.stringify([["Wavelength", "nm", ""], ["Absorbance", "", "sample A"], ["Absorbance", "a.u.", "sample B"]]), JSON.stringify(r.origin));
    check("…under a merged title, thirty rows, the note kept as text", JSON.stringify(r.raw) === JSON.stringify([["Shift", 30, 0], ["Counts", 30, 0], ["Note", 8, 1]]), JSON.stringify(r.raw));
    check("…one undo step, one record entry, one log line naming the sheets", r.undo === before.undo + 1 && r.rec === before.rec + 1 && /added 4 sheets of sheets\.xlsx \(Raw data, Calc, Hidden one, Origin\)/.test(r.log), JSON.stringify([r.undo, before.undo, r.rec, before.rec, r.log]));
    await p.evaluate(() => undo()); await p.waitForTimeout(400);
    r = await p.evaluate(() => ({ sheets: sheetList().map(s => s.name), n: P().cols.length }));
    check("…undone: the project as it was", r.sheets.join() === "Calc" && r.n === before.n, JSON.stringify(r));
    // A column computed by one formula in Excel: its values as Excel worked them out, the formula its comment.
    await p.setInputFiles("#fileIn", join(XD, "formulas.xlsx")); await p.waitForFunction(() => !$("#impModal").hidden, null, { timeout: 8000 });
    r = await p.evaluate(() => $("#impSide").textContent.replace(/\s+/g, " "));
    check("formulas.xlsx: one sheet, straight to the dialog, which says a column is a formula's", /1 column computed by one formula in Excel/.test(r), r);
    await p.click("#impGo"); await p.waitForTimeout(600);
    r = await p.evaluate(() => { const c = sheetCols().find(c => c.name === "Twice"); return c ? { d: c.data, comm: c.comm, sheet: sheetName(sheetOf(c)) } : null; });
    check("…the column's values and its comment", r && r.d.join() === "2,4,6,8,10" && r.comm === "Computed in Excel by =A2*2" && r.sheet === "Formulas", JSON.stringify(r));
    // A workbook refused, in words.
    await p.setInputFiles("#fileIn", join(XD, "password.xlsx")); await p.waitForTimeout(600);
    check("a workbook protected by a password is refused in words", /password\.xlsx is protected by a password/.test(await toastText(p)), await toastText(p));
    await p.setInputFiles("#fileIn", join(XD, "cut.xlsx")); await p.waitForTimeout(600);
    check("…and one cut short", /cut\.xlsx is cut short/.test(await toastText(p)), await toastText(p));
  }, { name: "Excel import" });
  await page(async p => {
    // A drop on the desk: the sheets Excel shows, with the automatic choices, text that reads as a number kept as text.
    const b64 = readFileSync(join(XD, "basic.xlsx")).toString("base64");
    await p.evaluate(b64 => { const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), dt = new DataTransfer(); dt.items.add(new File([u], "basic.xlsx"));
      const at = $("#desk").getBoundingClientRect(), x = at.left + at.width / 2, y = at.top + at.height / 2;
      for (const t of ["dragenter", "dragover", "drop"]) window.dispatchEvent(new DragEvent(t, { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true })); }, b64);
    await p.waitForFunction(() => sheetList().some(s => s.name === "Data"), null, { timeout: 8000 });
    let r = await p.evaluate(() => { const cs = sheetCols(sheetList().find(s => s.name === "Data").id); return cs.map(c => [c.name, c.data.slice(0, 9), txtOf(c)]); });
    check("basic.xlsx dropped: on a sheet named Data, every digit of its numbers, 007 and 1.5 kept as text, booleans 1 and 0", r[1][1].join() === [0.1, 1 / 3, -2.5e-300, 1.7976931348623157e308, 5e-324, 123456789012345.6, 0, 42, 0.30000000000000004].join() && r[2][2] && r[2][2][0] === "007" && r[2][2][1] === "1.5" && r[3][1].slice(0, 2).join() === "1,0", JSON.stringify(r));
    // Publish › Data as Excel: every sheet, read back.
    await p.evaluate(() => { const s = sheetList().find(q => q.name === "Data"); const cs = sheetCols(s.id); cs[0].unit = "s"; cs[1].comm = "the signal"; const t = Object.assign(makeCol("ignore", "When", "", [1709294730.25, 0, null, -2203891200]), { tfmt: "date", sheet: s.id }); P().cols.push(t); save({ cols: P().cols }, "typed"); });
    await p.waitForTimeout(300);
    const items = await p.evaluate(() => exportItems().filter(Boolean).filter(i => i.label).map(i => [i.label, i.enabled !== false]));
    check("Publish has Data as Excel (.xlsx)", items.some(([l, e]) => l === "Data as Excel (.xlsx)" && e), JSON.stringify(items));
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }), p.evaluate(() => { exportXlsx(); })]);
    const path = await dl.path(), bytes = readFileSync(path);
    r = await p.evaluate(b64 => { const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), b = xlsxRead(u); if (b.fail) return { fail: b.fail };
      const e = zipEntries(u); const sh = b.sheets.map(s => ({ name: s.name, frozen: s.frozen, res: analyzeFile(xlsxSheetText(s), {}) }));
      return { names: b.sheets.map(s => s.name), by: b.by, deflated: e.entries.filter(q => q.method === 8).length, n: e.entries.length, sh: sh.map(q => ({ name: q.name, frozen: q.frozen, head: q.res.headerRow, cols: q.res.cols.map(c => c.slice(0, 9)), txt: q.res.txt, tk: q.res.tkind, comm: q.res.xl.comm })) }; }, bytes.toString("base64"));
    check("Data as Excel: a workbook of the project's sheets that hold anything (not the empty first one), written by Kurve, its parts deflated", !r.fail && r.names.join() === "Data" && r.by === "Kurve" && r.deflated >= 3, JSON.stringify(r).slice(0, 400));
    const d = r.sh && r.sh[0];
    check("…names, units and comments frozen at the top, every digit, text as text, a date as a date", d && d.frozen === 3 && d.head.slice(0, 2).join("|") === "Time (s)|Signal" && d.comm[1] === "the signal" && d.cols[1].join() === [0.1, 1 / 3, -2.5e-300, 1.7976931348623157e308, 5e-324, 123456789012345.6, 0, 42, 0.30000000000000004].join() && d.txt[2][0] === "007" && d.tk[d.tk.length - 1] === "date" && d.cols[d.cols.length - 1][0] === 1709294730.25, JSON.stringify(d).slice(0, 600));
    // A table pasted from a web page, its spans filled.
    await p.evaluate(() => { newSheet(); focusWin("sheet"); S.ws = { r: 1, c: 2, ar: 1, ac: 2, extra: 0 }; renderWs(); });
    await p.waitForTimeout(200);
    await p.evaluate(() => { const dt = new DataTransfer(); dt.setData("text/plain", "Sample\tSignal\nA\t1.5\nB\t2"); dt.setData("text/html", '<table><tr><td rowspan="2">ctl</td><td colspan="2">x &amp; y</td></tr><tr><td>1.5</td><td>2</td></tr><tr><td>trt</td><td>3</td><td>4</td></tr></table>');
      $("#ws").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); });
    await p.waitForTimeout(400);
    r = await p.evaluate(() => sheetCols().map(c => ({ n: c.name, d: c.data.slice(0, 4), t: txtOf(c) })));
    check("an HTML table pasted from row 2: its rows and cells, a cell spanning two rows or two columns in each", JSON.stringify(r.slice(2, 5).map(q => ({ d: q.d, t: q.t }))) === JSON.stringify([{ d: [null, null, null, null], t: { 1: "ctl", 2: "ctl", 3: "trt" } }, { d: [null, null, 1.5, 3], t: { 1: "x & y" } }, { d: [null, null, 2, 4], t: { 1: "x & y" } }]), JSON.stringify(r));
  }, { name: "Excel drop, export and paste" });
}

await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
