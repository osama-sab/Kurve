/* A week later (QUALITY_SPEC §3.1, the first flow). Someone opens last week's project, two samples with six files of one
   instrument in folders, and carries on: a folder for a third sample with its files imported into it, a sheet shown by one
   click, the background of one file subtracted from the column selected, every graph combined into one, and a reload. Every
   step through the interface; state only read. Usage: node tools/flows/week.mjs [kurve.html] */
import { join } from "node:path";
import { start, read, W, row, menu, ctxItem, FIX, openProjectFile, spectrum } from "./lib.mjs";

const { page, check, done } = await start();
// Where each sheet is filed: { name: folder or "top" }.
const where = p => read(p, () => { const t = treeOf(); return Object.fromEntries(sheetList().map(s => [s.name, t.at["ws:" + s.id] ? xFolderName(t.at["ws:" + s.id]) : "top"])); });

await page("A week later: last week's project opened and carried on", async p => {
  // File › Open a project file…, the file chosen in the picker.
  const fc = p.waitForEvent("filechooser"); await menu(p, "file", "Open a project file"); await (await fc).setFiles(join(FIX, "lived-in.kurve")); await W(p, 1500);
  const opened = await read(p, () => ({ name: projName(P()), sheets: sheetList().length, folders: treeOf().folders.map(f => f.name).sort().join(",") }));
  check("File › Open a project file…: last week's project, its sheets and its folders", opened.name.startsWith("Two samples") && opened.sheets === 7 && opened.folders === "Raw,Reports,Sample A,Sample B", JSON.stringify(opened));
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  const before = await where(p);

  // A folder for the third sample, and its files imported into it from the folder's menu.
  await p.click("#xplNew"); await W(p); await p.fill("#fdXf", "Sample C"); await p.keyboard.press("Enter"); await W(p);
  await row(p, "Sample C").click({ button: "right" }); await W(p);
  const fc2 = p.waitForEvent("filechooser"); await ctxItem(p, "Import files here"); await (await fc2).setFiles([{ name: "D_01.csv", mimeType: "text/csv", buffer: Buffer.from(spectrum(540, 300, 1.4)) }]); await W(p, 900);
  if (await p.locator("#impModal:not([hidden])").count()) { await p.click("#impGo"); await W(p, 900); }
  const after = await where(p);
  const moved = Object.keys(before).filter(k => before[k] !== after[k]);
  const newOnes = Object.keys(after).filter(k => !(k in before));
  check("Import files here… on Sample C: the file on a sheet of its own in Sample C", newOnes.length === 1 && after[newOnes[0]] === "Sample C", JSON.stringify({ newOnes, after }));
  check("…and no sheet that was there moved", !moved.length, JSON.stringify(moved.map(k => [k, before[k], after[k]])));
  const msg = await read(p, () => ({ toast: !document.getElementById("toast").hidden, sb: document.getElementById("sbMsg").textContent }));
  check("no message popped up over the work; the status bar said what came in", !msg.toast && /D_01|Added|Imported|columns/.test(msg.sb), JSON.stringify(msg));

  // One click shows a sheet.
  await row(p, "B_01").click(); await W(p, 500);
  check("one click on B_01 in the Explorer shows it", await read(p, () => sheetName(curSheet())) === "B_01");

  // Its Intensity selected by its letter, then Data › Baseline › Subtract baseline….
  await p.locator('#ws th.ch[data-ch="1"]').click(); await W(p, 300);
  await menu(p, "data", "Baseline", "Subtract baseline");
  const on = await read(p, () => { const c = colById(S.pending && S.pending.col); return c ? sheetName(sheetOf(c)) + "!" + colLetter(c) : null; });
  check("Subtract baseline… works on the column selected, B_01!B (six columns are called Intensity)", on === "B_01!B", on);
  const label = await read(p, () => (document.querySelector("#tlCol option:checked") || {}).textContent);
  check("…and the Tool window names it apart from the others", /B_01!B/.test(label || ""), label);
  await p.locator("#w-tool button", { hasText: /^OK$/ }).click(); await W(p, 900);
  const steps = await read(p, () => yCols().filter(c => hasVals(c)).map(c => sheetName(sheetOf(c)) + ":" + (c.pipe || []).length).join(" "));
  check("…the step on B_01's column only (A_01 kept last week's)", /B_01:1/.test(steps) && /A_01:1/.test(steps) && (steps.match(/:1/g) || []).length === 2, steps);

  // Every graph onto one new graph.
  const curves = await read(p, () => drawGraphIds().reduce((n, id) => n + graphCols(id).length, 0));
  const ng = await read(p, () => drawGraphIds().length);
  await menu(p, "window", "Graphs", "Combine graphs");
  await p.selectOption("#formBody #cgInto", "new"); await W(p, 200);
  const ticked = await read(p, () => [...document.querySelectorAll(".cglist input[type=checkbox]")].filter(b => b.checked).length);
  check("Window › Graphs › Combine graphs…, onto a new graph: every graph ticked", ticked === ng, `${ticked} of ${ng}`);
  await p.click("#formOk"); await W(p, 900);
  const comb = await read(p, () => drawGraphIds().map(id => graphCols(id).length));
  check("…one graph with every curve", comb.length === 1 && comb[0] === curves, JSON.stringify([comb, curves]));

  // A reload gives the same project back.
  const sig = await read(p, () => JSON.stringify([sheetList().map(s => s.name), treeOf().at, yCols().map(c => (c.pipe || []).length), drawGraphIds().length]));
  await p.reload(); await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 20000 }); await W(p, 600);
  const sig2 = await read(p, () => JSON.stringify([sheetList().map(s => s.name), treeOf().at, yCols().map(c => (c.pipe || []).length), drawGraphIds().length]));
  check("after a reload: the same sheets, folders, steps and graphs", sig === sig2, sig2.slice(0, 300));
  check("the document's rules hold", (await read(p, () => projCheck())).length === 0);
});
await done();
