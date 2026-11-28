/* Workbooks (ux/spec/BOOK_SPEC.md, the story). Someone has two samples: a folder for each, a workbook in each (New workbook
   here), a sample's files imported into its workbook, a sheet a file. Each workbook's window shows its own sheets' tabs only. A
   sheet dragged by its tab onto the other workbook's window moves there, a formula reading it still reading it. A graph of
   columns from both. Undo and redo of the move, a reload, a project file saved and opened, Excel's export; then last week's
   project, made before workbooks, opened with its sheets where they were. Through the interface only; state only read.
   Usage: node tools/flows/books.mjs [kurve.html] */
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { start, read, W, row, menu, ctxItem, FIX, spectrum } from "./lib.mjs";

const { page, check, done } = await start();
// The books as the app has them: [{name, folder, sheets}] in order.
const books = p => read(p, () => bookList().map(b => ({ name: b.name, folder: treeOf().at["wb:" + b.id] ? xFolderName(treeOf().at["wb:" + b.id]) : "top", sheets: bookSheets(b.id).map(s => s.name) })));
// The tabs of the window that holds the grid, and that window's book.
const tabs = p => read(p, () => ({ win: wsLiveWin(), book: bookName(winBook(wsLiveWin())), tabs: [...document.querySelectorAll("#wsTabs [data-wst]")].map(t => t.textContent.trim()) }));
const csv = name => [name + ".csv", spectrum(300 + name.length * 7, 400 + name.charCodeAt(0), 1 + name.charCodeAt(2) % 3)];
async function importInto(p, folder, files) {
  await row(p, folder).click({ button: "right" }); await W(p);
  const fc = p.waitForEvent("filechooser"); await ctxItem(p, "Import files here"); await (await fc).setFiles(files.map(([name, text]) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) }))); await W(p, 900);
  // The import's dialog: the one-file dialog, or the list of several files.
  const dlg = await p.waitForSelector("#impModal:not([hidden]), #formModal:not([hidden])", { timeout: 8000 }).catch(() => null);
  if (dlg && (await dlg.getAttribute("id")) === "impModal") await p.click("#impGo"); else if (dlg) await p.click("#formOk");
  await W(p, 1000);
}
async function newFolder(p, name) { await p.click("#xplNew"); await W(p); await p.fill("#fdXf", name); await p.keyboard.press("Enter"); await W(p); }

await page("Two samples, a workbook each", async (p, ctx) => {
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  await newFolder(p, "Sample A");
  await row(p, "Sample A").click({ button: "right" }); await W(p); await ctxItem(p, "New workbook here"); await W(p, 600);
  let bs = await books(p);
  check("a folder's New workbook here: a workbook in that folder, named after it, with a sheet", bs.some(b => b.name === "Sample A" && b.folder === "Sample A" && b.sheets.length === 1), JSON.stringify(bs));
  let tb = await tabs(p);
  check("…its window has the grid, its tabs its own sheet alone", tb.book === "Sample A" && tb.tabs.length === 1 && tb.win !== "sheet", JSON.stringify(tb));
  // A sample's files one at a time (several at once go on one sheet until S.4's import).
  await importInto(p, "Sample A", [csv("A_01")]);
  await importInto(p, "Sample A", [csv("A_02")]);
  bs = await books(p);
  const A = bs.find(b => b.name === "Sample A");
  check("Import files here…, a file and then another: each on a sheet named after it, both in Sample A's workbook (the empty sheet taking the first)", A && A.sheets.join() === "A_01,A_02", JSON.stringify(bs));
  check("…and nothing went into Book 1", bs[0].sheets.join() === "Sheet 1", JSON.stringify(bs[0]));

  // The project's own row first, so the folder is made at the top (the new folder goes into the one selected).
  await p.locator("#xplTree .xr[data-xk='root']").click(); await W(p);
  await newFolder(p, "Sample B");
  await row(p, "Sample B").click({ button: "right" }); await W(p); await ctxItem(p, "New workbook here"); await W(p, 600);
  await importInto(p, "Sample B", [csv("B_01")]);
  await importInto(p, "Sample B", [csv("B_02")]);
  bs = await books(p);
  check("Sample B's workbook, its two files", bs.some(b => b.name === "Sample B" && b.folder === "Sample B" && b.sheets.join() === "B_01,B_02"), JSON.stringify(bs));
  tb = await tabs(p);
  check("B's window shows B's tabs and only those", tb.book === "Sample B" && tb.tabs.join() === "B_01,B_02", JSON.stringify(tb));
  const tree = await read(p, () => xRows().map(r => ({ key: r.key, kind: r.kind, name: r.name, parent: r.parent })));
  const node = (kind, name) => tree.find(r => r.kind === kind && r.name === name) || {};
  check("the Explorer lists each workbook in its folder, its sheets inside it", node("ws", "B_01").parent === node("book", "Sample B").key && node("book", "Sample B").parent === node("folder", "Sample B").key && node("ws", "Sheet 1").parent === node("book", "Book 1").key, JSON.stringify(tree));

  // One click on A's workbook brings its window forward with the grid.
  await p.locator("#xplTree .xr[data-xk^='wb:']").filter({ has: p.locator(".xn", { hasText: /^Sample A$/ }) }).click(); await W(p, 500);
  tb = await tabs(p);
  check("one click on Sample A's workbook in the Explorer: its window takes the grid, its tabs A's", tb.book === "Sample A" && tb.tabs.join() === "A_01,A_02", JSON.stringify(tb));

  // A formula in Book 1 reading A_02's Intensity, typed in the F(x)= row.
  await row(p, "Sheet 1").click(); await W(p, 500);
  check("one click on Sheet 1: Book 1's window has the grid", (await tabs(p)).win === "sheet");
  await p.locator('#ws tr.lab td[data-r="-1"][data-ci="1"]').click(); await W(p, 300);
  await p.keyboard.type("A_02!B*2"); await p.keyboard.press("Enter"); await W(p, 600);
  const fx = () => read(p, () => { const c = sheetCols(sheetList().find(s => s.name === "Sheet 1").id).find(q => q.role === "y"), a = sheetCols(sheetList().find(s => s.name === "A_02").id).find(q => q.role === "y");
    return { n: (c.data || []).filter(v => v != null).length, ok: c.data.every((v, i) => v == null || Math.abs(v - 2 * a.data[i]) < 1e-9), err: !!(c.fx && c.fx.err) }; });
  let f = await fx();
  check("Sheet 1's formula A_02!B*2, read from another workbook by the sheet's name", f.n > 100 && f.ok && !f.err, JSON.stringify(f));

  // A_02 dragged by its tab onto B's window.
  await p.locator("#xplTree .xr[data-xk^='wb:']").filter({ has: p.locator(".xn", { hasText: /^Sample A$/ }) }).click(); await W(p, 500);
  // Onto B's button in the taskbar: B's window lies under A's, as windows do.
  const bWin = await read(p, () => bkWin(bookList().find(b => b.name === "Sample B").id));
  const tab = p.locator("#wsTabs [data-wst]", { hasText: /^A_02$/ }), tbb = await tab.boundingBox(), dst = await p.locator(`.tk[data-tk="${bWin}"]`).boundingBox();
  await p.mouse.move(tbb.x + tbb.width / 2, tbb.y + tbb.height / 2); await p.mouse.down(); await W(p, 60);
  for (let k = 1; k <= 12; k++) { await p.mouse.move(tbb.x + (dst.x + dst.width / 2 - tbb.x) * k / 12, tbb.y + (dst.y + dst.height / 2 - tbb.y) * k / 12); await W(p, 25); }
  await p.mouse.up(); await W(p, 800);
  bs = await books(p);
  check("A_02 dragged by its tab onto Sample B's taskbar button: it is in B's workbook", bs.find(b => b.name === "Sample B").sheets.includes("A_02") && !bs.find(b => b.name === "Sample A").sheets.includes("A_02"), JSON.stringify(bs));
  f = await fx();
  check("…Sheet 1's formula still reads it", f.ok && !f.err, JSON.stringify(f));
  await p.keyboard.press("Control+z"); await W(p, 700);
  bs = await books(p);
  check("Ctrl+Z: A_02 back in Sample A's workbook", bs.find(b => b.name === "Sample A").sheets.includes("A_02"), JSON.stringify(bs));
  await p.keyboard.press("Control+y"); await W(p, 700);
  bs = await books(p);
  check("Ctrl+Y: in B's again", bs.find(b => b.name === "Sample B").sheets.includes("A_02"), JSON.stringify(bs));

  // The tab's menu: Move to workbook › a new one.
  await p.locator("#xplTree .xr[data-xk^='ws:']").filter({ has: p.locator(".xn", { hasText: /^B_02$/ }) }).click(); await W(p, 500);
  await p.locator("#wsTabs [data-wst]", { hasText: /^B_02$/ }).click({ button: "right" }); await W(p);
  await p.locator(".menu:visible [role=menuitem]", { hasText: "Move to workbook" }).last().hover(); await W(p, 350);
  await ctxItem(p, "A new workbook"); await W(p, 600);
  bs = await books(p);
  const nb = bs.find(b => b.sheets.join() === "B_02");
  check("a tab's Move to workbook › A new workbook: B_02 in a workbook of its own, filed where B's is", !!nb && nb.folder === "Sample B" && !bs.find(b => b.name === "Sample B").sheets.includes("B_02"), JSON.stringify(bs));

  // A graph of columns from both workbooks: A_01's Intensity plotted, then B_01's sheet dragged from the Explorer onto it.
  await row(p, "A_01").click(); await W(p, 500);
  await p.locator('#ws th.ch[data-ch="1"]').click(); await W(p, 300);
  await p.click("#wsPlotBtn"); await W(p, 300); await p.locator(".menu:visible [role=menuitem]", { hasText: /^Line$/ }).first().click(); await W(p, 900);
  const gid = await read(p, () => drawGraphIds()[0]);
  await row(p, "B_01").dragTo(p.locator("#w-" + gid)); await W(p, 900);
  const g = await read(p, gid => graphCols(gid).map(c => sheetName(sheetOf(c))).sort().join(), gid);
  check("a graph of A_01's Intensity, B_01's sheet dragged onto it from the Explorer: columns of two workbooks on one graph", g === "A_01,B_01", g);

  // A reload keeps it all.
  const sig = async () => JSON.stringify([await books(p), await read(p, () => graphCols(drawGraphIds()[0]).length)]);
  const s1 = await sig();
  await p.reload(); await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 20000 }); await W(p, 800);
  check("after a reload: the same workbooks, folders, sheets and graph", await sig() === s1, await sig());

  // A project file saved (a download) and opened: the same workbooks.
  const dl = p.waitForEvent("download"); await menu(p, "file", "Save a copy to a file"); const path = await (await dl).path();
  const fc = p.waitForEvent("filechooser"); await menu(p, "file", "Open a project file"); await (await fc).setFiles(path); await W(p, 1800);
  check("saved to a project file and opened again: the same workbooks", JSON.stringify(await books(p)) === JSON.stringify(JSON.parse(s1)[0]), JSON.stringify(await books(p)));

  // Excel's export: one workbook, every sheet, named by its workbook.
  const dx = p.waitForEvent("download"); await menu(p, "publish", "Data as Excel"); const xp = await (await dx).path();
  const names = xlsxSheets(readFileSync(xp));
  check("Publish › Data as Excel: every sheet with values, each named by its workbook", names.some(n => /Sample A · A_01/.test(n)) && names.some(n => /Sample B · B_01/.test(n)), JSON.stringify(names));
  check("the document's rules hold", (await read(p, () => projCheck())).length === 0, JSON.stringify(await read(p, () => projCheck())));
}, { setup: ctx => ctx.addInitScript(() => { delete window.showSaveFilePicker; }) });

await page("Last week's project, made before workbooks", async p => {
  const fc = p.waitForEvent("filechooser"); await menu(p, "file", "Open a project file"); await (await fc).setFiles(join(FIX, "lived-in.kurve")); await W(p, 1500);
  const bs = await books(p);
  const by = Object.fromEntries(bs.map(b => [b.folder, b]));
  check("its sheets where they were: Raw's a workbook in Raw, Sample B's one in Sample B, the top level's one at the top", by.Raw && by.Raw.sheets.join() === "A_01,A_02" && by["Sample B"] && by["Sample B"].sheets.join() === "B_01,B_02" && by.top && by.top.sheets.slice(0, 2).join() === "C_01,C_02", JSON.stringify(bs));
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  await row(p, "B_01").click(); await W(p, 500);
  const tb = await tabs(p);
  check("one click on B_01: its workbook's window, B's tabs only", tb.tabs.join() === "B_01,B_02", JSON.stringify(tb));
  // The folder Sample B renamed by F2 and deleted by Delete: each an undo step with its line in the log (the bug bash of S.6).
  const last = () => read(p, () => ((P().log || []).slice(-1)[0] || {}).text || "");
  const held = name => read(p, n => { const t = treeOf(), f = t.folders.find(f => f.name === n); return f ? Object.keys(t.at).filter(k => t.at[k] === f.id).sort() : null; }, name);
  const inB = await held("Sample B");
  check("the folder Sample B holds its workbook and its two graphs", (inB || []).length === 3, JSON.stringify(inB));
  await row(p, "Sample B").click(); await W(p, 300); await p.keyboard.press("F2"); await W(p, 500);
  await p.keyboard.press("Control+a"); await p.keyboard.type("Sample B 2024"); await p.keyboard.press("Enter"); await W(p, 600);
  check("F2 on the folder Sample B: renamed, holding what it held, and the log says so", JSON.stringify(await held("Sample B 2024")) === JSON.stringify(inB) && /renamed the folder Sample B to Sample B 2024/.test(await last()), await last());
  await row(p, "Sample B 2024").click(); await W(p, 300); await p.keyboard.press("Delete"); await W(p, 600);
  const top = await read(p, ks => ks.every(k => !treeOf().at[k]), inB);
  check("Delete on it: the folder goes, what it held at the top, and the log says so", (await held("Sample B 2024")) === null && top && /deleted the folder Sample B 2024; what it held is at the top of the project now/.test(await last()), await last());
  await p.keyboard.press("Control+z"); await W(p, 700);
  check("Ctrl+Z: the folder back, holding the same", JSON.stringify(await held("Sample B 2024")) === JSON.stringify(inB), JSON.stringify(await held("Sample B 2024")));
  check("the document's rules hold", (await read(p, () => projCheck())).length === 0, JSON.stringify(await read(p, () => projCheck())));
});
await done();

// The sheets' names in an .xlsx, read from its workbook.xml (a zip's central directory, the part inflated).
function xlsxSheets(buf) {
  let e = buf.length - 22; while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  const n = buf.readUInt16LE(e + 10); let o = buf.readUInt32LE(e + 16);
  for (let i = 0; i < n; i++) {
    const meth = buf.readUInt16LE(o + 10), csz = buf.readUInt32LE(o + 20), nl = buf.readUInt16LE(o + 28), xl = buf.readUInt16LE(o + 30), cl = buf.readUInt16LE(o + 32), lo = buf.readUInt32LE(o + 42);
    const name = buf.toString("utf8", o + 46, o + 46 + nl);
    if (name === "xl/workbook.xml") { const ln = buf.readUInt16LE(lo + 26), lx = buf.readUInt16LE(lo + 28), d = buf.subarray(lo + 30 + ln + lx, lo + 30 + ln + lx + csz);
      const t = (meth === 8 ? inflateRawSync(d) : d).toString("utf8"); return [...t.matchAll(/<sheet [^>]*name="([^"]*)"/g)].map(m => m[1].replace(/&amp;/g, "&")); }
    o += 46 + nl + xl + cl;
  }
  return [];
}
