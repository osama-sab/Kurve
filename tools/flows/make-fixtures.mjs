/* Makes the lived-in projects the flows start from (QUALITY_SPEC §3.2): a project that looks used, saved as a .kurve file.
   A maker may build through the app's own functions (a flow may not). Usage: node tools/flows/make-fixtures.mjs [kurve.html]

   lived-in.kurve, "Two samples, last week": folders Sample A (with Raw inside), Sample B and Reports; six files from one
   instrument, each on a sheet of its own named after the file, every one with the columns Wavenumber and Intensity, 300 to 800
   rows, over different ranges; A_01 and A_02 in Sample A › Raw, B_01 and B_02 in Sample B, C_01 and C_02 at the top; a graph of
   each, those of A and B filed with their sheets; C's two graphs the panels of a figure; a background step on A_01's Intensity;
   Statistics on columns of A_01 and A_02 (a result sheet). */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { start, FIX, spectrum } from "./lib.mjs";

const { page, check, done } = await start();
await page("making lived-in.kurve", async p => {
  const files = [["A_01", 500, 400, 1], ["A_02", 420, 410, 1.2], ["B_01", 800, 100, 2], ["B_02", 650, 120, 1.7], ["C_01", 300, 900, 3], ["C_02", 360, 880, 2.5]];
  for (const [i, [name, n, x0, k]] of files.entries()) {
    await p.evaluate(([t, nm, first]) => { importText(t, nm + ".csv"); if (!first) S.imp.mode = "sheet"; }, [spectrum(n, x0, k), name, i === 0]);
    await p.waitForTimeout(250); await p.evaluate(() => doImport()); await p.waitForTimeout(450);
  }
  const ids = await p.evaluate(() => {
    const q = P(); stampSheets(q);
    const ss = sheetList(q).map((s, i) => i === 0 ? Object.assign({}, s, { name: "A_01" }) : s);
    save({ sheets: ss, cols: q.cols, name: "Two samples, last week" });
    const by = {}; sheetList().forEach(s => { by[s.name] = s.id; });
    return by;
  });
  await p.waitForTimeout(300);
  // A graph of each file's Intensity.
  await p.evaluate(() => { sheetList().forEach(s => { const y = sheetCols(s.id).find(c => c.role === "y" && hasVals(c)); if (y) plotCols([y.id], {}); }); });
  await p.waitForTimeout(900);
  await p.evaluate(by => {
    const gOf = sn => drawGraphIds().find(id => graphCols(id).some(c => sheetOf(c) === by[sn]));
    const t = { folders: [{ id: "dA", name: "Sample A", parent: null }, { id: "dAr", name: "Raw", parent: "dA" }, { id: "dB", name: "Sample B", parent: null }, { id: "dR", name: "Reports", parent: null }], at: {} };
    for (const [sn, f] of [["A_01", "dAr"], ["A_02", "dAr"], ["B_01", "dB"], ["B_02", "dB"]]) { t.at["ws:" + by[sn]] = f; const g = gOf(sn); if (g) t.at["g:" + g] = f; }
    save({ tree: t });
    makeFigure([gOf("C_01"), gOf("C_02")].filter(Boolean));
  }, ids);
  await p.waitForTimeout(800);
  // A background step on A_01's Intensity.
  await p.evaluate(by => { const y = sheetCols(by.A_01).find(c => c.role === "y"); openTool("bg", { col: y.id }); }, ids); await p.waitForTimeout(600);
  await p.evaluate(() => applyTool({ here: true })); await p.waitForTimeout(600);
  // Statistics on columns of A_01 and A_02.
  await p.evaluate(by => { const cs = ["A_01", "A_02"].map(sn => sheetCols(by[sn]).find(c => c.role === "y").id); showSheet(by.A_01); anaDlg("desc", { cols: cs }); }, ids);
  await p.waitForTimeout(700); await p.click("#formOk").catch(() => {}); await p.waitForTimeout(900);
  const sum = await p.evaluate(() => ({ sheets: sheetList().map(s => s.name), graphs: deskGraphIds().map(graphName), folders: treeOf().folders.length, at: Object.keys(treeOf().at).length, steps: yCols().map(c => (c.pipe || []).length).join(""), ana: (P().ana || []).length, check: projCheck() }));
  check("the project made: six sheets and a result sheet, graphs and a figure, four folders, a step, an analysis", sum.sheets.length === 7 && sum.folders === 4 && sum.ana === 1 && /1/.test(sum.steps) && !sum.check.length, JSON.stringify(sum));
  const b64 = await p.evaluate(async () => { const blob = await pfGzip(JSON.stringify(pfDoc(S.pid))); const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); });
  writeFileSync(join(FIX, "lived-in.kurve"), Buffer.from(b64, "base64"));
  console.log("  wrote", join(FIX, "lived-in.kurve"), Math.round(b64.length * 0.75 / 1024), "kB");
});
await done();
