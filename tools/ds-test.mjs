/* The design system in the app (ux/spec/DS_SPEC.md): what each slice changed, checked in a
   real browser, slice by slice.
   Needs Playwright with Chromium. Usage:
     node tools/ds-test.mjs [path/to/kurve.html]
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
  const T = opt.timeout || 60000;
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), T))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}
const raman = async p => { await p.evaluate(async () => { await loadExample("raman"); }); await p.waitForTimeout(600); };

console.log("Slice 1: the frame and the rules");
await page(async p => {
  await raman(p);
  // The taskbar: the project's field first, windows flat, the front one a raised white key, Tile and Cascade in a tray.
  const tk = await p.evaluate(() => { const tb = $("#taskbar"), pr = tb.querySelector(".tk.proj"), fr = tb.querySelector(".tk.front"), cs = e => getComputedStyle(e);
    return { h: tb.offsetHeight, proj: !!pr, chev: !!(pr && pr.querySelector(".tk-chev")), tray: [...tb.querySelectorAll(".tkacts [data-tk-act]")].map(b => b.dataset.tkAct),
      frontBg: fr && cs(fr).backgroundColor, panel: getComputedStyle(document.body).getPropertyValue("--panel").trim(), titles: [...tb.querySelectorAll(".tk[data-tk]")].map(b => b.title) }; });
  check("the taskbar is 42 px", tk.h === 42, tk.h);
  check("it starts with the project's field and its chevron", tk.proj && tk.chev, JSON.stringify(tk));
  check("Tile and Cascade sit together in a tray", tk.tray.join() === "tile,cascade", tk.tray);
  check("the front window's button is a white key, not filled with the accent", !!tk.frontBg && !/rgb\(2[0-9], 7[0-9], 2[0-9]{2}\)/.test(tk.frontBg) && tk.frontBg !== "rgba(0, 0, 0, 0)", tk.frontBg);
  check("window buttons are named by their tooltip, nothing more", tk.titles.length && tk.titles.every(t => !/click|:/.test(t)), tk.titles);
  // Tooltips: the name, and the shortcut if there is one.
  const tips = await p.evaluate(() => ({ zoom: document.querySelector('#modeSeg [data-mode="zoom"]').title, imp: $("#importBtn").title, undo: $("#undoBtn").title, pref: $("#prefBtn").title,
    win: [...document.querySelectorAll(".win-h [data-wmin], .win-h [data-wmax], .win-h [data-wclose], .win-h [data-whelp]")].map(b => b.title) }));
  check("toolbar tooltips are names", tips.zoom === "Zoom" && tips.imp === "Import (Ctrl+O)" && /^Undo.*\(Ctrl\+Z\)$/.test(tips.undo) && tips.pref === "Preferences (Ctrl+,)", JSON.stringify(tips));
  check("window buttons are named", tips.win.length && tips.win.every(t => ["Minimise", "Maximise", "Close", "Help (F1)"].includes(t)), [...new Set(tips.win)]);
  // The title bar's project name is a field.
  const pf = await p.evaluate(() => { const e = document.querySelector(".titlebar .proj"), c = getComputedStyle(e); return { bw: c.borderTopWidth, bg: c.backgroundColor }; });
  check("the project's name sits in a field", pf.bw === "1px" && pf.bg !== "rgba(0, 0, 0, 0)", JSON.stringify(pf));
  // No internal identifiers.
  const foot = await p.evaluate(() => $("#wsFoot").textContent), st = await p.evaluate(() => document.querySelector(".statusbar").textContent);
  check("the worksheet's foot counts rows and columns, with no hash", /81 rows · 3 columns/.test(foot) && !/sha256/i.test(foot), foot);
  check("the status bar says Saved, not where", /\bSaved\b/.test(st) && !/browser/.test(st), st);
  // Real superscripts: the worksheet's units, on the graph, never in a field.
  const sup = await p.evaluate(() => { const td = [...document.querySelectorAll("#ws td")].find(t => /cm/.test(t.textContent) && t.querySelector("sup"));
    const ax = [...document.querySelectorAll("#plot [data-rt]")].map(g => g.textContent).join("|");
    return { cell: td ? td.innerHTML : null, ax, sel: [...document.querySelectorAll("option")].some(o => o.querySelector("sup")) }; });
  check("the worksheet's Units cell has a real superscript", !!sup.cell && /<sup>−1<\/sup>/.test(sup.cell), sup.cell);
  check("the graph typesets cm⁻¹ as a script", /cm.*−1/.test(sup.ax), sup.ax);
  check("a list's options keep their characters", !sup.sel);
  // The dock: a strip of icon tabs, the shown one named, the docked window without a title bar of its own.
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); }); await p.waitForTimeout(400);
  await p.evaluate(() => { openWin("stats", { render: true }); }); await p.waitForTimeout(400);
  const dk = await p.evaluate(() => { const bar = $("#dockBar"), fit = bar.querySelector('[data-dtab="fit"]'), on = bar.querySelector(".dtab.on");
    return { lab: (bar.querySelector(".dk-lab") || {}).textContent, h: bar.offsetHeight, fitTitle: fit.title, fitX: getComputedStyle(fit.querySelector(".dx")).display, fitName: getComputedStyle(fit.querySelector("span")).display,
      on: on && on.dataset.dtab, onName: on && getComputedStyle(on.querySelector("span")).display, hdr: getComputedStyle(document.querySelector("#w-stats > .win-h")).display,
      btns: [...bar.querySelectorAll(".tb")].map(b => b.title) }; });
  check("the strip is headed Tools and 36 px tall", /tools/i.test(dk.lab) && dk.h === 36, JSON.stringify(dk));
  check("a tool not shown is an icon, named by its tooltip, with no ×", dk.fitTitle === "Fit" && dk.fitX === "none" && dk.fitName === "none", JSON.stringify(dk));
  check("the shown tool's tab has its name", dk.on === "stats" && dk.onName !== "none", JSON.stringify(dk));
  check("a docked window's title bar gives way to the strip", dk.hdr === "none", dk.hdr);
  check("the strip has Help, Undock and Hide", ["Help (F1)", "Undock", "Hide dock"].every(t => dk.btns.includes(t)), dk.btns);
  // The dock's edge stays over the windows it touches after the tabs alone are drawn again.
  await p.evaluate(() => { renderTaskbar(); });
  const edge = await p.evaluate(() => { const e = $("#dockEdge"), b = e.getBoundingClientRect(), t = document.elementFromPoint(b.x + b.width / 2, b.y + 200); return t === e; });
  check("the dock's edge can still be held after a redraw of the tabs", edge);
  await p.click("#dockBar [data-dundock]"); await p.waitForTimeout(300);
  check("Undock floats the window", await p.evaluate(() => !isDocked("stats") && winOpen("stats")));
  // A tool's tab says which step it is.
  await p.evaluate(() => { openTool("deriv"); }); await p.waitForTimeout(500);
  const tn = await p.evaluate(() => { const t = document.querySelector('#dockBar [data-dtab="tool"] span'); return t && t.textContent; });
  check("a tool window's tab is named after its step", tn === "Derivative", tn);
  await p.evaluate(() => cancelTool());
  // Fields as wide as their content: the fit's range shows a value of seven characters whole.
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); focusWin("fit"); }); await p.waitForTimeout(400);
  const fits = await p.evaluate(() => { const i = $("#fwX1"); if (!i) return null; const v = i.value; i.value = "1550.25"; const ok = i.scrollWidth <= i.clientWidth + 1; i.value = v; return ok; });
  check("the fit's range fields show 1550.25 whole", fits === true, fits);
  // The formatted editor keeps the browser's own superscript, which its x² button reads.
  const va = await p.evaluate(() => { const d = document.createElement("div"); d.className = "ned"; d.innerHTML = "a<sup>2</sup>"; document.body.appendChild(d); const v = getComputedStyle(d.querySelector("sup")).verticalAlign; d.remove(); return v; });
  check("the formatted editor's superscripts keep vertical-align: super", va === "super", va);
}, { name: "frame" });
await page(async p => {
  await raman(p);
  const g = await p.evaluate(() => getComputedStyle(document.querySelector(".win")).borderTopLeftRadius);
  check("windows are rounded to 12 px", g === "12px", g);
  await p.evaluate(() => applyStyle("graphite")); await p.waitForTimeout(200);
  const gg = await p.evaluate(() => getComputedStyle(document.querySelector(".win")).borderTopLeftRadius);
  check("and to 9 px in Graphite", gg === "9px", gg);
}, { name: "windows" });

console.log("Slice 2: menus in the order of the work");
await page(async p => {
  await raman(p);
  const m = await p.evaluate(() => {
    const labs = items => (typeof items === "function" ? items() : items || []).filter(i => i && i !== "-" && i.label).map(i => i.label);
    const find = (items, l) => (typeof items === "function" ? items() : items || []).find(i => i && i.label === l);
    const an = menuItems("analyze"), sp = find(an, "Spectroscopy"), pub = menuItems("publish"), ed = menuItems("edit"), pl = menuItems("plot"), dt = menuItems("data");
    return { bar: [...document.querySelectorAll(".menubar .mb")].map(b => b.textContent.trim()).join(),
      ribbon: [...document.querySelectorAll("#gRibbon [data-rmenu]")].map(b => b.textContent.trim()).join(),
      an: labs(an), sp: labs(sp && sp.sub), pub: labs(pub), ed: labs(ed), view: labs((find(pl, "View") || {}).sub), base: labs((find(dt, "Baseline") || {}).sub),
      tr: labs((find(dt, "Transform") || {}).sub), fit: labs((find(an, "Fit") || {}).sub) }; });
  check("the menu bar is in the order of the work", m.bar === "File,Edit,Data,Plot,Analyze,Figure,Publish,Window,Help", m.bar);
  check("the graph window's bar repeats Data, Plot, Analyze and Figure", m.ribbon === "Data,Plot,Analyze,Figure", m.ribbon);
  check("Analyze measures: Fit, Peaks, Integrate, then kinds", m.an.join("|") === ["Fit", "Peaks…", "Integrate…", "Signal processing", "Calculus", "Statistics", "Spectroscopy", "Results"].join("|"), m.an);
  check("Spectroscopy is a submenu of Analyze", m.sp.join("|") === ["Overview of the spectrum…", "Remove cosmic-ray spikes…", "Name the peaks from known lines…", "X axis", "Corrections"].join("|"), m.sp);
  check("Data has Baseline: Subtract baseline… and Linear detrend…", m.base.join("|") === "Subtract baseline…|Linear detrend…", m.base);
  check("Data's Transform holds what changes values or units", m.tr.length === 6 && m.tr[0] === "Scale and offset Y…", m.tr);
  check("Plot's View has the graph's pointer tools", ["Zoom", "Pan", "Reader", "X–Y lines", "Show all the data"].every(l => m.view.includes(l)), m.view);
  check("Analyze › Fit switches what of the fit is drawn", ["Show residuals", "Confidence band", "Prediction band", "Remove fit"].every(l => m.fit.includes(l)), m.fit);
  check("Publish has every export and the two copies", ["Graph as PDF", "Report", "Copy the graph as a picture", "Copy the results table"].every(l => m.pub.includes(l)), m.pub);
  check("Edit no longer copies the graph", !m.ed.some(l => /graph|results/i.test(l)), m.ed);
  // Linear detrend is the baseline step with its straight line chosen.
  const ld = await p.evaluate(() => { const b = menuItems("data").find(i => i && i.label === "Baseline"); b.sub().find(i => i.label === "Linear detrend…").run();
    return S.pending ? { op: S.pending.step.op, m: S.pending.step.p.method } : null; });
  check("Linear detrend… opens the baseline step on a straight line", ld && ld.op === "bg" && ld.m === "line", JSON.stringify(ld));
  await p.evaluate(() => cancelTool());
  // The menu bar opens the new menus.
  await p.click('.menubar [data-menu="analyze"]'); await p.waitForTimeout(250);
  const open = await p.evaluate(() => [...document.querySelectorAll(".menu [role=menuitem]")].map(e => e.textContent.trim()).slice(0, 3));
  check("Analyze opens from the bar", /^Fit/.test(open[0] || ""), open);
  await p.keyboard.press("Escape");
  // Help's articles render and every link goes somewhere.
  const h = await p.evaluate(() => { const bad = [], ids = new Set(docList().map(d => d.id)); let n = 0;
    for (const d of docList()) { try { openHelp(d.id); n++; const b = document.querySelector("#w-help .win-b"); if (!b || /\$\{/.test(b.innerHTML)) bad.push(d.id + ": ${");
      b.querySelectorAll("[data-doc]").forEach(a => { const id = a.dataset.doc.split("#")[0]; if (id && !ids.has(id)) bad.push(d.id + " → " + a.dataset.doc); }); } catch (e) { bad.push(d.id + ": " + e.message); } }
    const txt = docList().map(d => d.lead + " " + (typeof d.body === "string" ? d.body : "")).join(" ");
    return { n, bad, old: (txt.match(/(Analysis|Statistics|Spectroscopy|File) › (Fit|Integrate|Histogram|Find peaks|Subtract|Export|Overview)/g) || []).slice(0, 5) }; });
  check("every help article renders, every link resolves", h.n > 60 && !h.bad.length, h.n + " " + h.bad.slice(0, 5).join("; "));
  check("help names the new menu paths", !h.old.length, h.old);
}, { name: "menus" });
await page(async p => {
  // With the worksheet alone, the graph's menus keep their place and are greyed.
  const g = await p.evaluate(() => { const f = menuItems("figure"), v = menuItems("plot").find(i => i && i.label === "View");
    return { gid: GID(), fig: f.filter(i => i && i.label).every(i => i.enabled === false), view: v && v.enabled === false, bar: !!document.querySelector('.menubar [data-menu="figure"]') }; });
  check("with no graph, Figure is on the bar and greyed", g.gid == null && g.bar && g.fig, JSON.stringify(g));
  check("and so is Plot › View", g.view === true, JSON.stringify(g));
}, { name: "no graph" });

console.log("Slice 3: Find a command");
await page(async p => {
  await raman(p);
  await p.keyboard.press("Control+k"); await p.waitForTimeout(200);
  const o = await p.evaluate(() => ({ open: !$("#cmdkModal").hidden, focus: document.activeElement && document.activeElement.id, n: CMDK.items.length,
    start: [...document.querySelectorAll("#cmdkL .cmdk-i .lab")].map(e => e.textContent) }));
  check("Ctrl+K opens it, the search box focused", o.open && o.focus === "cmdkQ", JSON.stringify(o));
  check("it knows every command of the menu bar", o.n > 150, o.n);
  check("with nothing typed it offers where to start", o.start[0] === "Import data…" && o.start.includes("Curve fit…"), o.start);
  const first = async q => { await p.fill("#cmdkQ", q); await p.waitForTimeout(50);
    return p.evaluate(() => ({ labs: [...document.querySelectorAll("#cmdkL .cmdk-i")].map(e => e.querySelector(".lab").textContent),
      on: (document.querySelector("#cmdkL .cmdk-i.on .lab") || {}).textContent, where: (document.querySelector("#cmdkL .cmdk-i.on .where") || {}).textContent,
      syn: (document.querySelector("#cmdkL .cmdk-i.on .syn") || {}).textContent, ad: $("#cmdkQ").getAttribute("aria-activedescendant") })); };
  let r = await first("background");
  check("“background” finds Subtract baseline… first, and Linear detrend…", r.on === "Subtract baseline…" && r.labs.includes("Linear detrend…") && /matches background/.test(r.syn || ""), JSON.stringify(r));
  r = await first("fourier");
  check("“fourier” finds the FFT filter", r.on === "FFT filter…" && r.where === "Analyze › Signal processing", JSON.stringify(r));
  r = await first("power spectrum");
  check("a phrase people use is kept whole", r.on === "FFT filter…", JSON.stringify(r));
  r = await first("export");
  check("“export” finds the Publish menu", /^Graph/.test(r.on || "") && /^Publish/.test(r.where || ""), JSON.stringify(r));
  r = await first("log y");
  check("“log y” finds Figure › Axes › Log Y first", r.on === "Log Y" && r.where === "Figure › Axes" && !!r.ad, JSON.stringify(r));
  await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  const lg = await p.evaluate(() => ({ log: !!plotCfg().logY, closed: $("#cmdkModal").hidden }));
  check("Enter runs it and closes", lg.log && lg.closed, JSON.stringify(lg));
  await p.keyboard.press("Control+k"); await p.waitForTimeout(150);
  const rec = await p.evaluate(() => ({ h: (document.querySelector("#cmdkL .cmdk-h") || {}).textContent, l: (document.querySelector("#cmdkL .cmdk-i .lab") || {}).textContent }));
  check("what was run comes back under Recent", rec.h === "Recent" && rec.l === "Log Y", JSON.stringify(rec));
  await p.fill("#cmdkQ", "curve fit"); await p.waitForTimeout(50);
  await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowUp");
  const cf = await p.evaluate(() => (document.querySelector("#cmdkL .cmdk-i.on .lab") || {}).textContent);
  await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  check("the arrows move and come back; Curve fit… opens the Fit window", cf === "Curve fit…" && await p.evaluate(() => winOpen("fit") && S.fitMode === "curve"), cf);
  await p.keyboard.press("Control+k"); await p.waitForTimeout(150);
  await p.fill("#cmdkQ", "zzzqqq"); await p.waitForTimeout(50);
  check("nothing found says so", /No command matches/.test(await p.evaluate(() => $("#cmdkL").textContent)));
  await p.keyboard.press("Control+k"); await p.waitForTimeout(150);
  check("Ctrl+K again closes it", await p.evaluate(() => $("#cmdkModal").hidden));
  await p.keyboard.press("Control+k"); await p.waitForTimeout(150); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  check("Escape closes it", await p.evaluate(() => $("#cmdkModal").hidden));
  // A command that cannot apply is listed, dimmed, and Enter passes over it.
  await p.keyboard.press("Control+k"); await p.waitForTimeout(150); await p.fill("#cmdkQ", "remove fit"); await p.waitForTimeout(50);
  const off = await p.evaluate(() => { const e = [...document.querySelectorAll("#cmdkL .cmdk-i")].find(x => x.querySelector(".lab").textContent === "Remove fit"); return e && { off: e.classList.contains("off"), on: e.classList.contains("on"), title: e.title }; });
  check("a command that cannot apply now is dimmed, not hidden", off && off.off && !off.on && off.title === "Not available now", JSON.stringify(off));
  await p.keyboard.press("Escape");
  // From the Help menu.
  await p.evaluate(() => { menuItems("help").find(i => i && i.label === "Find a command…").run(); }); await p.waitForTimeout(200);
  check("Help › Find a command… opens it", await p.evaluate(() => !$("#cmdkModal").hidden));
  await p.keyboard.press("Escape");
  // Unicode scripts in a flex box stay one piece of text.
  const fl = await p.evaluate(async () => { const l = document.createElement("label"); l.style.cssText = "display:flex;gap:9px"; l.textContent = "Weight (1/σ²)"; document.body.appendChild(l);
    await new Promise(r => setTimeout(r, 50)); const n = l.children.length, k = l.firstElementChild && l.firstElementChild.tagName, s = !!l.querySelector("sup"); l.remove(); return { n, k, s }; });
  check("a superscript in a flex label is not an item of its own", fl.n === 1 && fl.k === "SPAN" && fl.s, JSON.stringify(fl));
}, { name: "palette" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
