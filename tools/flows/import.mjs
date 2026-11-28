/* Importing many files (ux/spec/IMPORT_SPEC.md, the story). Back from the lab with a run: four files of two samples, a
   reference and a file that is not data, imported all at once into last week's project. The dialog lists the six, the bad one
   with its reason; by default each file on a sheet of its own in the workbook in front, the tree beside the list showing them.
   By their names, each group a workbook: three workbooks. The two of sample A ticked and given a folder once: both go there.
   Import is one step, undone and redone. Then a folder of files kept in subfolders, File › Import a folder…: the same folders,
   each a workbook, a sheet a file. Files with the same axis on one sheet share their X; a sheet named that holds data takes
   the files after its columns; several files dropped on a folder of the Explorer go into its workbook. A reload keeps it all.
   Through the interface only; state only read. Usage: node tools/flows/import.mjs [kurve.html] */
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { start, read, W, row, menu, FIX, spectrum, dropFiles } from "./lib.mjs";

const { page, check, done } = await start();
// The books as the app has them: [{name, folder (its path), sheets}] in order.
const books = p => read(p, () => bookList().map(b => { const t = treeOf(), path = []; let f = t.at["wb:" + b.id] || null;
  while (f) { const o = t.folders.find(x => x.id === f); if (!o) break; path.unshift(o.name); f = o.parent; }
  return { name: b.name, folder: path.join(" › ") || "top", sheets: bookSheets(b.id).map(s => s.name) }; }));
const book = (bs, name) => bs.find(b => b.name === name) || null;
const counts = p => read(p, () => ({ sheets: sheetList().length, books: bookList().length, folders: treeOf().folders.length, cols: P().cols.length }));
const csv = (name, x0 = 400) => [name + ".csv", spectrum(240 + name.length * 5, x0, 1 + name.charCodeAt(name.length - 1) % 3)];
const files = list => list.map(([name, text]) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) }));
// The dialog's rows and tree as shown.
const dialog = p => read(p, () => { const m = document.getElementById("formModal"), rows = [...m.querySelectorAll("tr[data-bik]")];
  const v = id => { const e = document.getElementById(id); return e ? { v: e.value, off: e.disabled, typed: e.classList.contains("typed") } : null; };
  return { open: !m.hidden, title: m.querySelector("#formTitle") ? m.querySelector("#formTitle").textContent : "", group: (document.getElementById("biGroup") || {}).value, as: (document.getElementById("biAs") || {}).value,
    rows: rows.map(r => { const k = r.dataset.bik; return { file: r.querySelector(".nm") ? r.querySelector(".nm").firstChild.textContent.trim() : "", fail: r.classList.contains("skip") ? r.textContent : "",
      n: v("biN" + k), g: v("biG" + k), s: v("biS" + k), b: v("biB" + k), f: v("biF" + k) }; }),
    tree: (document.getElementById("biTree") || {}).innerText || "", ok: (document.getElementById("formOk") || {}).textContent }; });
const run = [csv("sampleA_01"), csv("sampleA_02"), csv("sampleB_01"), csv("sampleB_02"), csv("ref"), ["notes.txt", "Some words about the run\nand no numbers at all\n"]];

await page("A run of six files into last week's project", async (p, ctx) => {
  const fc = p.waitForEvent("filechooser"); await menu(p, "file", "Open a project file"); await (await fc).setFiles(join(FIX, "lived-in.kurve")); await W(p, 1500);
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  const before = await books(p), c0 = await counts(p);
  const front = await read(p, () => bookName(winBook(wsLiveWin())));

  // The toolbar's Import, the six chosen together in the picker.
  const fc2 = p.waitForEvent("filechooser"); await p.click("#importBtn"); await (await fc2).setFiles(files(run)); await W(p, 1200);
  let d = await dialog(p);
  check("six files chosen together: one dialog listing the six", d.open && d.rows.length === 6, JSON.stringify(d).slice(0, 400));
  const bad = d.rows.find(r => r.file.startsWith("notes"));
  check("…the file that is not data listed with its reason, and nothing to choose for it", bad && /no rows of numbers|not imported/i.test(bad.fail) && !bad.s, JSON.stringify(bad));
  const good = d.rows.filter(r => r.s);
  check("by default each file on a sheet of its own, named after it, in the workbook in front", good.length === 5 && good.every(r => r.s.v === r.file.replace(/\.csv$/, "") && r.b.v === front), JSON.stringify(good.map(r => [r.s.v, r.b.v])) + " front " + front);
  check("…the tree beside the list shows the five new sheets in it", ["sampleA_01", "sampleA_02", "sampleB_01", "sampleB_02", "ref"].every(n => d.tree.includes(n)) && d.tree.includes(front) && /new/i.test(d.tree), d.tree);
  check("…the button says how many files", /Import 5 files/.test(d.ok), d.ok);

  // By their names, each group a workbook.
  await p.selectOption("#biGroup", "name"); await W(p, 300);
  await p.selectOption("#biAs", "book"); await W(p, 300);
  d = await dialog(p);
  const gr = d.rows.filter(r => r.g).map(r => r.g.v);
  check("By their names: the part before the last number, in the Group column", gr.join() === "sampleA,sampleA,sampleB,sampleB,ref", JSON.stringify(gr));
  check("…each group a workbook: sampleA, sampleB and ref in the rows and the tree, a sheet a file", d.rows.filter(r => r.b).map(r => r.b.v).join() === "sampleA,sampleA,sampleB,sampleB,ref" && ["sampleA", "sampleB", "ref"].every(n => d.tree.includes(n)), JSON.stringify(d.rows.map(r => r.b && r.b.v)) + " | " + d.tree);

  // The two of sample A ticked, their folder typed once.
  await p.check("#biT0"); await p.check("#biT1"); await W(p, 200);
  await p.fill("#biF0", "Run 3"); await W(p, 400);
  d = await dialog(p);
  check("two rows ticked, Run 3 typed as the first's folder: both go there, marked as typed", d.rows[0].f.v === "Run 3" && d.rows[1].f.v === "Run 3" && d.rows[0].f.typed && d.rows[1].f.typed && d.rows[2].f.v !== "Run 3", JSON.stringify(d.rows.slice(0, 3).map(r => r.f)));
  check("…the tree shows Run 3, new, with sampleA in it", /Run 3/.test(d.tree), d.tree);

  await p.click("#formOk"); await W(p, 1500);
  let bs = await books(p);
  const A = book(bs, "sampleA"), B = book(bs, "sampleB"), R = book(bs, "ref");
  check("Import: sampleA in the new folder Run 3, its two files a sheet each", A && A.folder === "Run 3" && A.sheets.join() === "sampleA_01,sampleA_02", JSON.stringify(A));
  check("…sampleB and ref beside the workbook that was in front, a sheet a file", B && R && B.sheets.join() === "sampleB_01,sampleB_02" && R.sheets.join() === "ref" && B.folder === R.folder, JSON.stringify([B, R]));
  check("…every workbook that was there unchanged", before.every(o => JSON.stringify(book(bs, o.name)) === JSON.stringify(o)), JSON.stringify(bs));
  const lg = await read(p, () => (P().log || []).slice(-1)[0] || {});
  check("…one line in the log says where they went", /5 files into 3 workbooks/.test(lg.text || "") && /notes/.test(lg.text || ""), lg.text);
  const ys = await read(p, () => sheetList().filter(s => /^sample|^ref$/.test(s.name)).map(s => sheetCols(s.id).filter(c => c.role === "y" && hasVals(c)).map(c => c.name).join("+")));
  check("…each sheet holds its file's column, named after the file", ys.join() === "sampleA_01,sampleA_02,sampleB_01,sampleB_02,ref", JSON.stringify(ys));

  // One step: undone, nothing left; redone, all of it.
  await p.locator("#ws").click({ position: { x: 60, y: 140 } }); await W(p, 200);
  await p.keyboard.press("Control+z"); await W(p, 900);
  check("Ctrl+Z: one step takes the five sheets, the three workbooks and the folder away", JSON.stringify(await counts(p)) === JSON.stringify(c0) && JSON.stringify(await books(p)) === JSON.stringify(before), JSON.stringify([await counts(p), c0]));
  await p.keyboard.press("Control+y"); await W(p, 900);
  bs = await books(p);
  check("Ctrl+Y: all of it back", book(bs, "sampleA") && book(bs, "sampleA").folder === "Run 3" && book(bs, "ref"), JSON.stringify(bs));

  // A folder of files kept in subfolders, File › Import a folder….
  const dir = mkdtempSync(join(tmpdir(), "kimp-")), top = join(dir, "run4");
  mkdirSync(join(top, "sampleC"), { recursive: true }); mkdirSync(join(top, "sampleD"), { recursive: true });
  for (const [n, t] of [csv("c_01"), csv("c_02")]) writeFileSync(join(top, "sampleC", n), t);
  writeFileSync(join(top, "sampleD", csv("d_01")[0]), csv("d_01")[1]);
  writeFileSync(join(top, csv("blank")[0]), csv("blank")[1]);
  const fc3 = p.waitForEvent("filechooser"); await menu(p, "file", "Import a folder"); await (await fc3).setFiles(top); await W(p, 1200);
  d = await dialog(p);
  check("File › Import a folder…: its four files listed, As their folders the arrangement", d.open && d.rows.length === 4 && d.group === "path" && d.as === "folder", JSON.stringify({ g: d.group, as: d.as, n: d.rows.length }));
  check("…the tree shows run4 › sampleC and sampleD", /run4/.test(d.tree) && /sampleC/.test(d.tree) && /sampleD/.test(d.tree), d.tree);
  await p.click("#formOk"); await W(p, 1500);
  bs = await books(p);
  check("…the project has the same folders, each a workbook, a sheet a file", (book(bs, "sampleC") || {}).folder === "run4 › sampleC" && book(bs, "sampleC").sheets.join() === "c_01,c_02" && (book(bs, "sampleD") || {}).folder === "run4 › sampleD" && (book(bs, "run4") || {}).folder === "run4" && book(bs, "run4").sheets.join() === "blank", JSON.stringify(bs.slice(-3)));

  // A reload keeps it.
  const kept = await books(p);
  await p.reload(); await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 20000 }); await W(p, 800);
  check("a reload: every workbook, folder and sheet as it was", JSON.stringify(await books(p)) === JSON.stringify(kept), JSON.stringify(await books(p)));
});

await page("Into a sheet that holds data, files on one axis, Read by itself…", async p => {
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  // A first file, the usual way, into the empty project: the sheet the project had takes it.
  const fc = p.waitForEvent("filechooser"); await p.click("#importBtn"); await (await fc).setFiles(files([csv("base_01")])); await W(p, 1000);
  if (await p.locator("#impModal:not([hidden])").count()) { await p.click("#impGo"); await W(p, 1000); }
  const s0 = await read(p, () => sheetList().map(s => s.name));
  // Three more: two named onto base_01's sheet (they share its axis), one read by itself.
  const fc2 = p.waitForEvent("filechooser"); await p.click("#importBtn"); await (await fc2).setFiles(files([csv("base_02"), csv("base_03"), csv("other", 900)])); await W(p, 1200);
  await p.check("#biT0"); await p.check("#biT1"); await p.fill("#biS0", s0[0]); await W(p, 400);
  let d = await dialog(p);
  check("a sheet that exists typed for two ticked rows: both say it, its workbook and folder fixed", d.rows[0].s.v === s0[0] && d.rows[1].s.v === s0[0] && d.rows[0].b.off && d.rows[0].f.off, JSON.stringify(d.rows.slice(0, 2)));
  check("…the tree shows the sheet as there already, with the two files", d.tree.includes(s0[0]) && d.tree.includes("base_02"), d.tree);
  await p.click('[data-biself="2"]'); await W(p, 300);
  d = await dialog(p);
  check("Read by itself… takes the third file out of the list", /Import 2 files/.test(d.ok), d.ok);
  await p.click("#formOk"); await W(p, 1200);
  const on = await read(p, () => sheetCols(sheetList()[0].id).map(c => c.role + ":" + c.name));
  check("the two files after the sheet's columns, sharing its X: one X, three Ys", on.length === 4 && on[0] === "x:Wavenumber" && on[1].startsWith("y:") && on[2] === "y:base_02" && on[3] === "y:base_03", JSON.stringify(on));
  check("…then the one-file dialog for the file read by itself", await p.locator("#impModal:not([hidden])").count() === 1 && /other/.test(await p.locator("#impModal").innerText()));
  await p.click("#impGo"); await W(p, 1000);
  check("…which goes on a sheet of its own", await read(p, () => sheetList().some(s => s.name === "other")));
});

await page("Several files dropped on a folder of the Explorer", async p => {
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  const fc = p.waitForEvent("filechooser"); await p.click("#importBtn"); await (await fc).setFiles(files([csv("first")])); await W(p, 1000);
  if (await p.locator("#impModal:not([hidden])").count()) { await p.click("#impGo"); await W(p, 1000); }
  const b0 = (await books(p))[0];
  await p.click("#xplNew"); await W(p); await p.fill("#fdXf", "Dropped"); await p.keyboard.press("Enter"); await W(p);
  await dropFiles(p, row(p, "Dropped"), [csv("drop_01"), csv("drop_02")]); await W(p, 1500);
  const bs = await books(p), D = bs.find(b => b.folder === "Dropped");
  check("two files dropped on a folder: its workbook, made there, a sheet a file", D && D.sheets.join() === "drop_01,drop_02", JSON.stringify(bs));
  check("…the first workbook kept its sheet", JSON.stringify(bs[0]) === JSON.stringify(b0), JSON.stringify([bs[0], b0]));
});

await done();
