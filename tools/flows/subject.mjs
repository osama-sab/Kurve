/* One subject for every command (ux/spec/SUBJECT_SPEC.md, the story). Last week's project, a graph of sample B's two columns
   in front. A curve clicked on the graph is what the status bar says it is working on, and what Data › Baseline › Subtract baseline… opens on; nothing
   to undo for the choice. A column clicked in another sheet's grid: the status bar names it, the graph in front stays in front,
   and Subtract baseline… opens on it. A graph clicked in the Explorer: its curve. A column reached with the arrow keys: no undo step, no log line,
   no window moved. A reload keeps the active column. Through the interface only; state only read.
   Usage: node tools/flows/subject.mjs [kurve.html] */
import { join } from "node:path";
import { start, read, W, row, menu, ctxItem, FIX } from "./lib.mjs";

const { page, check, done } = await start();
const subj = p => read(p, () => ({ bar: (document.getElementById("sbSubj") || {}).textContent || "", act: P().activeY, name: specName(colById(P().activeY)), gid: S.gid, front: frontWinId(), log: (P().log || []).length }));
const colOf = (p, sheet) => read(p, s => (sheetCols(sheetList().find(q => q.name === s).id).find(c => c.role === "y") || {}).id, sheet);
// A point of a column's curve on the live graph, on the screen.
const onCurve = (p, id) => read(p, id => { const d = finalOf(colById(id)), i = Math.floor(d.x.length / 2), r = document.getElementById("figure").getBoundingClientRect();
  return { x: r.left + S.geo.X(d.x[i]), y: r.top + S.geo.Y(d.y[i]) }; }, id);
const toolOn = p => read(p, () => S.pending ? S.pending.col : null);

await page("A curve, a column, a graph: the subject of every command", async p => {
  const fc = p.waitForEvent("filechooser"); await menu(p, "file", "Open a project file"); await (await fc).setFiles(join(FIX, "lived-in.kurve")); await W(p, 1500);
  if (!(await p.locator("#xplTree").isVisible())) { await p.click("#xplBtn"); await W(p); }
  const B1 = await colOf(p, "B_01"), B2 = await colOf(p, "B_02"), A1 = await colOf(p, "A_01"), A2 = await colOf(p, "A_02");

  // Sample B's two graphs, combined from the Explorer.
  await row(p, "Graph 3").click(); await W(p, 500);
  await row(p, "Graph 4").click({ modifiers: ["Control"] }); await W(p, 200);
  await row(p, "Graph 3").click({ button: "right" }); await W(p); await ctxItem(p, "Combine into one graph"); await W(p, 800);
  const g = await read(p, () => ({ gid: S.gid, cols: graphCols(S.gid).map(c => c.id) }));
  check("Graph 3 and Graph 4 combined from the Explorer: one graph of B_01 and B_02 in front", g.cols.length === 2 && g.cols.includes(B1) && g.cols.includes(B2), JSON.stringify(g));
  let s = await subj(p);
  check("the status bar says what the commands act on", /^Working on /.test(s.bar) && s.bar.includes(s.name), JSON.stringify(s));

  // A click on B_02's curve.
  const other = s.act === B2 ? B1 : B2, at = await onCurve(p, other);
  await p.mouse.click(at.x, at.y); await W(p, 500);
  const s1 = await subj(p);
  check("a curve clicked on the graph is the subject: the status bar names it, and it is the active column", s1.act === other && s1.bar.includes(s1.name) && s1.name.includes(other === B2 ? "B_02" : "B_01"), JSON.stringify(s1));
  check("…choosing it is no change: no log line", s1.log === s.log, JSON.stringify([s.log, s1.log]));
  await menu(p, "data", "Baseline", "Subtract baseline"); await W(p, 600);
  check("Data › Baseline › Subtract baseline… opens on the curve clicked", await toolOn(p) === other, String(await toolOn(p)));
  await p.click("#tlCancel"); await W(p, 400);
  check("…cancelled, nothing was made", (await toolOn(p)) === null && (await subj(p)).log === s.log);

  // A column of another sheet, clicked in the worksheet.
  await row(p, "A_01").click(); await W(p, 600);
  await p.locator('#ws th.ch[data-ch="1"]').click(); await W(p, 900);
  const s2 = await subj(p);
  check("column B of A_01 clicked in the grid: the status bar names it", s2.bar.includes("A_01") && s2.act === A1, JSON.stringify(s2));
  check("…and the graph in front is still sample B's: choosing brought no graph forward", s2.gid === g.gid, JSON.stringify([s2.gid, g.gid]));
  await menu(p, "data", "Baseline", "Subtract baseline"); await W(p, 600);
  check("Data › Baseline › Subtract baseline… opens on A_01's column", await toolOn(p) === A1, String(await toolOn(p)));

  // A graph clicked in the Explorer while the step waits: its curve is the subject, and the step goes with it.
  await row(p, "Graph 2").click(); await W(p, 600);
  const s3 = await subj(p);
  check("Graph 2 clicked in the Explorer: its curve (A_02's) is the subject", s3.act === A2 && s3.bar.includes("A_02"), JSON.stringify(s3));
  check("…and the step waiting in the Tool window goes with it: one subject", await toolOn(p) === A2, String(await toolOn(p)));
  await p.click("#tlCancel"); await W(p, 400);

  // B_01's column chosen with the keys: its first cell, then Right and Down; the choice taken once the keys rest.
  await row(p, "B_01").click(); await W(p, 600);
  await p.locator('#ws td[data-r="0"][data-ci="0"]').click(); await W(p, 200);
  await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await W(p, 900);
  const s4 = await subj(p);
  check("B_01's column reached with the arrow keys: the subject once they rest, with no log line", s4.act === B1 && s4.bar.includes("B_01") && s4.log === s.log, JSON.stringify(s4));
  // Ctrl+Z takes back the last change made (the combining), not a choice.
  await p.locator("#ws").click({ position: { x: 50, y: 300 } }); await W(p, 200);
  await p.keyboard.press("Control+z"); await W(p, 800);
  const u = await read(p, gid => !!graphOf(gid), g.gid);
  check("Ctrl+Z takes back the graphs' combining, the last change: no choice was an undo step", !u);
  await p.keyboard.press("Control+y"); await W(p, 800);

  // On a phone the status bar keeps the subject whole.
  await p.setViewportSize({ width: 390, height: 844 }); await W(p, 700);
  const ph = await read(p, () => { const e = document.getElementById("sbSubj"); return { w: e.clientWidth, sw: e.scrollWidth, t: e.textContent }; });
  check("at 390 px the status bar shows the subject whole", ph.t.startsWith("Working on") && ph.w > 0 && ph.sw <= ph.w + 1, JSON.stringify(ph));
  await p.setViewportSize({ width: 1600, height: 950 }); await W(p, 700);

  const kept = (await subj(p)).act;
  await p.reload(); await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 20000 }); await W(p, 800);
  check("a reload keeps the active column", (await subj(p)).act === kept);
});

await done();
