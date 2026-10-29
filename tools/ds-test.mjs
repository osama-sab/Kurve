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
      ribbon: [...document.querySelectorAll("#gRibbon [data-rmenu]")].filter(b => !b.hidden).map(b => b.textContent.trim()).join(),
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

console.log("Slice 4: what is selected has its menu in the graph's bar");
await page(async p => {
  await raman(p);
  await p.evaluate(() => { focusWin(winOfGraph(GID())); }); await p.waitForTimeout(250);
  const ctx = () => p.evaluate(() => ({ hid: $("#ctxBtn").hidden, sep: $("#ctxSep").hidden, lab: $("#ctxLab").textContent, title: $("#ctxBtn").title, css: ($("#gselCss") || {}).textContent || "" }));
  const labels = () => p.evaluate(() => [...document.querySelectorAll(".menu")].pop() ? [...[...document.querySelectorAll(".menu")].pop().querySelectorAll("[role^=menuitem]")].map(e => e.textContent.trim()).filter(Boolean) : []);
  check("nothing selected, no contextual menu", (await ctx()).hid);
  // A curve, clicked on.
  const pt = await p.evaluate(() => { const r = $("#plot").getBoundingClientRect(), q = S.shownPts[Math.floor(S.shownPts.length * 0.3)]; return { x: r.x + S.geo.X(q.x), y: r.y + S.geo.Y(q.y) }; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(150);
  let c = await ctx();
  check("a click on a curve puts Curve at the end of the graph's bar", !c.hid && !c.sep && c.lab === "Curve" && /Intensity/.test(c.title), JSON.stringify(c));
  check("and outlines the curve on the graph", /g\[data-ser=.*drop-shadow/.test(c.css), c.css);
  await p.click("#ctxBtn"); await p.waitForTimeout(150); const bar = await labels(); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  await p.mouse.click(pt.x, pt.y, { button: "right" }); await p.waitForTimeout(150); const rc = await labels(); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  check("its menu is the curve's right-click menu, item for item", bar.length > 6 && bar.includes("Line, symbols and colour…") && JSON.stringify(bar) === JSON.stringify(rc.filter(l => !/^(Add here|Vertical line|Horizontal line|Text here|An arrow|A box|An ellipse|Shade an X|A comment|Label the peak|A graph title|Make this zoom)/.test(l))), JSON.stringify({ bar, rc }));
  // Nothing: a click on an empty spot lets go.
  const empty = await p.evaluate(() => { const r = $("#plot").getBoundingClientRect(), g = S.geo; return { x: r.x + g.L + g.pw * 0.12, y: r.y + g.T + 12 }; });
  await p.mouse.click(empty.x, empty.y); await p.waitForTimeout(150);
  c = await ctx(); check("a click on nothing lets go", c.hid && !c.css, JSON.stringify(c));
  // An axis, by its numbers.
  const ax = await p.evaluate(() => { const r = document.querySelector('#plot rect[data-axis="x"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(ax.x, ax.y); await p.waitForTimeout(150);
  c = await ctx(); check("an axis's numbers clicked: Axis, the axis outlined", c.lab === "Axis" && /X axis/.test(c.title) && /data-axis="x"/.test(c.css), JSON.stringify(c));
  await p.click("#ctxBtn"); await p.waitForTimeout(150); const axm = await labels(); await p.keyboard.press("Escape");
  check("with the axis's own menu", axm.some(l => /^Scale/.test(l)), axm);
  await p.focus("#plot"); await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  check("Esc lets go", (await ctx()).hid);
  // The fit's curve.
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); }); await p.waitForTimeout(300);
  await p.evaluate(() => runFit()); await p.waitForTimeout(900);
  await p.evaluate(() => { focusWin(winOfGraph(GID())); hideToast(); }); await p.waitForTimeout(250);
  const fp = await p.evaluate(() => { const r = $("#plot").getBoundingClientRect(), fp = S.geo.fitPx || [], pts = S.shownPts.map(q => [S.geo.X(q.x), S.geo.Y(q.y)]); let best = null;
    for (const f of fp) { let dm = 1e9; for (const q of pts) dm = Math.min(dm, Math.hypot(q[0] - f[0], q[1] - f[1])); if (dm > 9 && (!best || dm > best.dm)) best = { f, dm }; }
    return best ? { x: r.x + best.f[0], y: r.y + best.f[1] } : null; });
  if (fp) { await p.mouse.click(fp.x, fp.y); await p.waitForTimeout(150); }
  c = await ctx(); check("a click on the fit's curve: Fit, the curve outlined", !!fp && c.lab === "Fit" && /data-fitc/.test(c.css), JSON.stringify(c));
  await p.click("#ctxBtn"); await p.waitForTimeout(150); const fm = await labels(); await p.keyboard.press("Escape");
  check("the fit's menu has Results and Remove fit", ["Results", "Copy the results table", "Show residuals", "Remove fit"].every(l => fm.includes(l)), fm);
  // A band: Region, with what can be done over it.
  await p.evaluate(() => { addBand(510, 530); focusWin(winOfGraph(GID())); }); await p.waitForTimeout(300);
  const bb = await p.evaluate(() => { const e = document.querySelector("#plot [data-bb]"); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (bb) { await p.mouse.click(bb.x, bb.y); await p.waitForTimeout(250); await p.evaluate(() => focusWin(winOfGraph(GID()))); await p.waitForTimeout(150); }
  c = await ctx(); check("a band clicked: Region", c.lab === "Region" && /Band 1/.test(c.title), JSON.stringify(c));
  await p.click("#ctxBtn"); await p.waitForTimeout(150); const bm = await labels();
  check("its menu zooms, fits and removes", ["Zoom to it", "Fit in this range", "Remove the band", "Baseline"].every(l => bm.includes(l)), bm);
  await p.evaluate(() => { [...document.querySelectorAll(".menu [role^=menuitem]")].find(e => e.textContent.trim() === "Fit in this range").click(); }); await p.waitForTimeout(300);
  check("Fit in this range sets the fit's range", await p.evaluate(() => { const r = fitRngOf(activeYCol()); return !!r && Math.abs(Math.min(r[0], r[1]) - 510) < 1e-9 && Math.abs(Math.max(r[0], r[1]) - 530) < 1e-9; }));
  // A whole column selected in the worksheet, while the graph shows it.
  await p.evaluate(() => { focusWin("sheet"); }); await p.waitForTimeout(200);
  await p.click('#ws th.ch[data-ch="1"] .cl'); await p.waitForTimeout(200);
  await p.evaluate(() => { focusWin(winOfGraph(GID())); }); await p.waitForTimeout(200);
  c = await ctx(); check("a column selected in the worksheet: Column, its curve outlined, with the graph brought forward", c.lab === "Column" && /^Column B: Intensity$/.test(c.title) && /data-ser/.test(c.css), JSON.stringify(c));
  await p.click("#ctxBtn"); await p.waitForTimeout(150); const cm = await labels(); await p.keyboard.press("Escape");
  check("with the column's own menu", cm.some(l => /^Use as/.test(l)) && cm.includes("Show on the graph"), cm);
  // Shift+F10 on the graph opens the menu of what is selected.
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(150); await p.focus("#plot"); await p.keyboard.press("Shift+F10"); await p.waitForTimeout(150);
  check("Shift+F10 opens the selected curve's menu", await p.evaluate(() => $("#ctxBtn").getAttribute("aria-expanded") === "true"));
  await p.keyboard.press("Escape");
}, { name: "contextual" });

console.log("Slice 5: the Format pane, docked and live");
await page(async p => {
  await raman(p);
  await p.evaluate(() => { focusWin(winOfGraph(GID())); }); await p.waitForTimeout(200);
  await p.evaluate(() => { menuItems("figure").find(i => i && i.label === "Format graph…").run(); }); await p.waitForTimeout(400);
  const o = await p.evaluate(() => ({ open: winOpen("format"), docked: isDocked("format"), modals: MODALS.length, dialog: !!document.getElementById("plotModal"),
    btns: [...document.querySelectorAll("#w-format .fmtfoot button")].filter(b => !b.hidden).map(b => b.textContent.trim()), sel: !!$("#fmtSel"), tab: (document.querySelector('#dockBar .dtab.on span') || {}).textContent }));
  check("Figure › Format graph… opens the Format pane in the dock, not a dialog", o.open && o.docked && !o.modals && !o.dialog && o.tab === "Format", JSON.stringify(o));
  check("it has Selected at its top and no OK or Cancel", o.sel && o.btns.join() === "Defaults,Saved styles", JSON.stringify(o.btns));
  // A change shows at once and is kept as one undo step.
  await p.selectOption("#fmtSel", "p:frame"); await p.waitForTimeout(200);
  const u0 = await p.evaluate(() => undoStack.length);
  await p.click("#pdGrid"); await p.waitForTimeout(80);
  const now = await p.evaluate(() => ({ cfg: !!plotCfg().grid, saved: !!GP().grid }));
  await p.waitForTimeout(600);
  const later = await p.evaluate(u0 => ({ saved: !!GP().grid, undo: undoStack.length - u0, pending: !!S.plotPreview }), u0);
  check("a change shows on the graph at once", now.cfg && !now.saved, JSON.stringify(now));
  check("and is kept, as one undo step, with no OK", later.saved && later.undo === 1 && !later.pending, JSON.stringify(later));
  await p.keyboard.press("Control+z"); await p.waitForTimeout(200);
  check("Ctrl+Z takes it back", await p.evaluate(() => !GP().grid));
  // A change still in its burst is saved before an undo, and the undo takes it back.
  await p.click("#pdGrid"); await p.waitForTimeout(50);
  const mid = await p.evaluate(() => { const was = !!S.plotPreview; undo(); return { was, grid: !!GP().grid, pending: !!S.plotPreview, redo: redoStack.length }; });
  check("an undo in the middle of a burst saves it, then takes it back", mid.was && !mid.grid && !mid.pending && mid.redo > 0, JSON.stringify(mid));
  // A click on the curve turns the pane to it; a double click on an axis's numbers to the axis.
  const pt = await p.evaluate(() => { const r = $("#plot").getBoundingClientRect(), q = S.shownPts[Math.floor(S.shownPts.length * 0.3)]; return { x: r.x + S.geo.X(q.x), y: r.y + S.geo.Y(q.y) }; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300);
  const fc = await p.evaluate(() => ({ v: $("#fmtSel").value, id: activeYCol().id }));
  check("a click on a curve turns the pane to the curve", fc.v === "s:" + fc.id, JSON.stringify(fc));
  const ax = await p.evaluate(() => { const r = document.querySelector('#plot rect[data-axis="y"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.dblclick(ax.x, ax.y); await p.waitForTimeout(300);
  check("a double click on an axis's numbers opens its page", await p.evaluate(() => $("#fmtSel").value === "p:ax:y"));
  // A number being typed survives a redraw from a save, and is kept when entered.
  await p.selectOption("#fmtSel", "s:" + fc.id); await p.waitForTimeout(200);
  await p.fill("#pdLw", "2.5"); await p.waitForTimeout(50);
  await p.evaluate(() => { renderAll(); }); await p.waitForTimeout(100);
  const typed = await p.evaluate(() => ({ v: $("#pdLw") && $("#pdLw").value, f: document.activeElement && document.activeElement.id }));
  check("a number being typed survives a redraw from a save", typed.v === "2.5" && typed.f === "pdLw", JSON.stringify(typed));
  await p.keyboard.press("Enter"); await p.waitForTimeout(600);
  check("and is kept when entered", await p.evaluate(id => ((GP().series || {})[id] || {}).lw === 2.5, fc.id));
  // A saved style is used at once, and undone.
  const fr0 = await p.evaluate(() => GP().frame || "box");
  await p.click("#pdFormats"); await p.waitForTimeout(200);
  await p.evaluate(() => { const it = [...document.querySelectorAll(".menu [role^=menuitem]")].find(e => /^Journal/.test(e.textContent.trim())); if (it) it.click(); }); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ frame: GP().frame, pending: !!S.plotPreview }));
  check("a saved style is used at once", st.frame === "l" && !st.pending, JSON.stringify(st));
  await p.evaluate(() => { hideToast(); undo(); }); await p.waitForTimeout(200);
  check("and undone in one step", await p.evaluate(f => (GP().frame || "box") === f, fr0));
  // A colour picker over the pane keeps Escape for itself.
  await p.selectOption("#fmtSel", "p:frame"); await p.waitForTimeout(200);
  const cb = await p.evaluate(() => { const e = document.querySelector("#pdBody [data-pdc]"); return e ? true : false; });
  if (cb) { await p.click("#pdBody [data-pdc] >> nth=0"); await p.waitForTimeout(200); }
  const cp = await p.evaluate(() => !!(cpOpen && cpOpen.el));
  await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  check("a colour picker opens from the pane and Esc closes it, the pane staying", cb && cp && await p.evaluate(() => !(cpOpen && cpOpen.el) && winOpen("format")), JSON.stringify({ cb, cp }));
  // Closing the pane saves what waits.
  await p.click("#pdGrid"); await p.waitForTimeout(50); await p.evaluate(() => closeWin("format")); await p.waitForTimeout(150);
  check("closing the pane keeps the change still in its burst", await p.evaluate(() => !!GP().grid && !S.plotPreview));
}, { name: "format pane" });

console.log("Slice 6: the status bar answers questions");
await page(async p => {
  await raman(p);
  const ro = () => p.evaluate(() => ({ t: $("#readout").textContent, cells: [...document.querySelectorAll("#readout .sb-stats > span")].map(s => s.textContent) }));
  await p.evaluate(() => focusWin("sheet")); await p.waitForTimeout(200);
  await p.click('#ws td[data-r="0"][data-ci="1"]'); await p.click('#ws td[data-r="8"][data-ci="1"]', { modifiers: ["Shift"] }); await p.waitForTimeout(200);
  const want = await p.evaluate(() => { const v = activeYCol().data.slice(0, 9), n = v.length, mu = v.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1)); return ["N9", "Mean" + fmt(mu, 5), "SD" + fmt(sd, 5), "Min" + fmt(Math.min(...v), 5), "Max" + fmt(Math.max(...v), 5)]; });
  let r = await ro();
  check("cells selected in the worksheet: their range, N, mean, SD, minimum and maximum", r.cells[0] === "B1:B9" && JSON.stringify(r.cells.slice(1)) === JSON.stringify(want), JSON.stringify({ r, want }));
  await p.evaluate(() => openWin("stats", { render: true })); await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const tr = [...document.querySelectorAll("#pane-stats table.stt tbody tr")].find(x => /^Cells B1:B9/.test(x.textContent)); return tr ? [...tr.children].slice(1, 3).map(td => td.textContent) : null; });
  check("the Statistics window has the same numbers for the cells", !!st && st[0] === "9" && want[1] === "Mean" + st[1], JSON.stringify({ st, want }));
  await p.evaluate(() => { closeWin("stats"); focusWin(winOfGraph(GID())); }); await p.waitForTimeout(200);
  const pt = await p.evaluate(() => { const r = $("#plot").getBoundingClientRect(), q = S.shownPts[Math.floor(S.shownPts.length * 0.3)]; return { x: r.x + S.geo.X(q.x), y: r.y + S.geo.Y(q.y) }; });
  await p.mouse.click(pt.x, pt.y); await p.mouse.move(3, 3); await p.waitForTimeout(200);
  r = await ro(); const row = await p.evaluate(() => { const q = statRow(activeYCol(), "final", null); return ["N" + q.n, "Mean" + fmt(q.mu, 5), "SD" + fmt(q.sd, 5), "Min" + fmt(q.mn, 5), "Max" + fmt(q.mx, 5)]; });
  check("a curve selected: the Statistics window's numbers for it", r.cells[0] === "Intensity" && JSON.stringify(r.cells.slice(1)) === JSON.stringify(row), JSON.stringify({ r, row }));
  // Over the graph the readout follows the pointer; off it, the selection again.
  await p.mouse.move(pt.x + 30, pt.y - 40); await p.waitForTimeout(120); const hov = await ro();
  await p.mouse.move(3, 3); await p.waitForTimeout(120); const back = await ro();
  check("on the graph it reads the pointer, off it the selection", /^x /.test(hov.t) && back.cells[0] === "Intensity", JSON.stringify({ hov, back }));
  // A band: its area, peak, FWHM and span, as the Integrate window measures them.
  await p.evaluate(() => { addBand(510, 530); focusWin(winOfGraph(GID())); }); await p.waitForTimeout(300);
  const bb = await p.evaluate(() => { const e = document.querySelector("#plot [data-bb]"); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(bb.x, bb.y); await p.mouse.move(3, 3); await p.waitForTimeout(300);
  r = await ro(); const bc = await p.evaluate(() => { const q = bandCalc(activeYCol())[0].r; return { a: fmtPM(q.area, q.err), pos: fmt(q.pos, 6), w: fmt(q.fwhm, 4) }; });
  check("a band selected: area, peak, FWHM and span, the Integrate window's", /^510 – 530/.test(r.cells[0]) && r.cells.some(c => c.startsWith("Area" + bc.a)) && r.cells.some(c => c.startsWith("Peak at" + bc.pos)) && r.cells.some(c => c.startsWith("FWHM" + bc.w)) && r.cells.some(c => c.startsWith("Span20")), JSON.stringify({ r, bc }));
  // Nothing selected, nothing said.
  const empty = await p.evaluate(() => { const r = $("#plot").getBoundingClientRect(), g = S.geo; return { x: r.x + g.L + g.pw * 0.12, y: r.y + g.T + 12 }; });
  await p.mouse.click(empty.x, empty.y); await p.mouse.move(3, 3); await p.waitForTimeout(200);
  check("nothing selected, the readout is empty", (await ro()).t === "");
}, { name: "status bar" });

console.log("Slice 7: the Fit window and Results as designed");
await page(async p => {
  await raman(p);
  await p.evaluate(() => { S.fitMode = "curve"; showTab("fit"); chooseModel("linear"); }); await p.waitForTimeout(300);
  // The range a readout, the suggestion one word with its reason as the tooltip.
  let r = await p.evaluate(() => { const b = $("#pane-fit"), sg = b.querySelector(".msugg"), us = b.querySelector("#useSugg");
    return { n: (b.querySelector("#fwN") || {}).textContent, want: fitPoints().length + " points", view: (b.querySelector("#fwView") || {}).textContent,
      sugg: sg && sg.textContent, tip: us && us.title, name: us && MODELS[suggestModel().id].name }; });
  check("the range says how many points it holds, in a readout", r.n === r.want && r.view === "From view", JSON.stringify(r));
  check("the suggestion is one word, its reason the tooltip", !!r.sugg && r.sugg === "Suggested:" + r.name && /^The data /.test(r.tip || ""), JSON.stringify(r));
  await p.click("#useSugg"); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ model: ensureDraft().model, sugg: suggestModel().id, shown: !!$("#pane-fit .msugg") }));
  check("its button chooses it, and then it says nothing", r.model === r.sugg && !r.shown, JSON.stringify(r));
  // In the results: switches chosen before the fit; the footer only its buttons.
  r = await p.evaluate(() => { const g = document.querySelector('#pane-fit .fitshow[aria-label="In the results"]'), st = document.querySelector("#pane-fit .sticky");
    return { sw: g ? [...g.querySelectorAll("input[data-rshow]")].map(i => i.dataset.rshow + (i.checked ? "+" : "-")) : null,
      foot: [...st.children].map(e => e.tagName === "BUTTON" ? e.textContent.trim() : e.tagName) }; });
  check("In the results: intervals, ANOVA, the matrices and residuals, as switches", JSON.stringify(r.sw) === JSON.stringify(["ci+", "anova-", "corr+", "cov-", "resid+"]), JSON.stringify(r.sw));
  check("the footer is its buttons: Fit, 1 iteration, Guess, Done", JSON.stringify(r.foot) === JSON.stringify(["Fit", "1 iteration", "Guess", "Done"]), JSON.stringify(r.foot));
  await p.evaluate(() => runFit()); await p.waitForTimeout(500);
  // The grid: the fitted value and its error apart.
  r = await p.evaluate(() => { const th = [...document.querySelectorAll("#pane-fit .ptab.pg thead th")].map(t => t.textContent), tr = document.querySelector("#pane-fit .ptab.pg tbody tr"), f = P().fit;
    const cells = [...tr.querySelectorAll("td.res")].map(t => t.textContent); return { th, cells, want: fmtVE(f.params[0], f.errors[0]) }; });
  check("the grid has Fitted and Error in columns of their own", r.th.includes("Fitted") && r.th.includes("Error") && r.cells[0] === r.want[0] && r.cells[1] === r.want[1], JSON.stringify(r));
  // Results: value and standard error apart, derived under a group row, the sections open as chosen.
  await p.evaluate(() => { showDrawer("res"); renderResults(); }); await p.waitForTimeout(300);
  const res = () => p.evaluate(() => { const b = $("#pane-res"), t = b.querySelector(".rtab");
    return { th: [...t.querySelectorAll("thead th")].map(x => x.textContent), val: !!t.querySelector("td.val"), se: !!t.querySelector("td.se"), grp: [...t.querySelectorAll("tr.rgrp")].map(x => x.textContent),
      secs: [...b.querySelectorAll("section.rsec")].map(x => x.dataset.rd), details: b.querySelectorAll("details").length, side: [...b.querySelectorAll(".rside dt")].map(x => x.textContent), foot: !!b.querySelector(".rfoot") }; });
  r = await res();
  check("Results: Value and Standard error in columns of their own", r.th[1] === "Value" && r.th[2] === "Standard error" && r.val && r.se, JSON.stringify(r.th));
  check("derived quantities under a Derived row", r.grp.join() === "Derived", JSON.stringify(r.grp));
  check("the sections chosen are open, none behind a disclosure arrow", JSON.stringify(r.secs) === JSON.stringify(["corr", "resid"]) && r.details === 0, JSON.stringify(r));
  check("the residuals' scatter and the outlier limit sit with the statistics, no loose text at the foot", r.side.includes("Residual scatter, s") && r.side.includes("Outlier limit") && !r.foot, JSON.stringify(r.side));
  await p.evaluate(() => { showTab("fit"); }); await p.waitForTimeout(200);
  await p.click('#pane-fit input[data-rshow="anova"]'); await p.click('#pane-fit input[data-rshow="ci"]'); await p.click('#pane-fit input[data-rshow="cov"]'); await p.waitForTimeout(200);
  await p.evaluate(() => showDrawer("res")); await p.waitForTimeout(200); r = await res();
  const rep = await p.evaluate(() => /confidence interval/.test(paramTableHtml(P().fit, true)));
  check("switching them in the Fit window changes Results at once", JSON.stringify(r.secs) === JSON.stringify(["anova", "corr", "cov", "resid"]) && !r.th.some(t => /confidence interval/.test(t)), JSON.stringify(r));
  check("the report keeps every column whatever Results shows", rep);
  check("kept for this browser", await p.evaluate(() => JSON.parse(localStorage.getItem("kurve.rshow")).anova === true));
  // Notes: one line, the number first, the fix at its end.
  await p.evaluate(() => { const c = activeYCol(), d = c.data.slice(), k = d.length >> 2; d[k] += 6000; c.data = d; save({ cols: P().cols }); showTab("fit"); runFit(); showDrawer("res"); renderResults(); }); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const n = [...document.querySelectorAll("#pane-res .note")].find(x => /outlier/.test(x.textContent)); if (!n) return null;
    const pp = n.querySelector("p"); return { t: pp.textContent, tip: pp.title, acts: [...n.querySelectorAll(".acts button")].map(b => b.textContent), mask: maskOf(activeYCol()).length }; });
  check("an outlier's note is one line, number first, with Mask at its end", !!r && /^1 outlier at x = /.test(r.t) && r.t.length < 110 && r.tip.length > r.t.length && JSON.stringify(r.acts) === '["Mask"]', JSON.stringify(r));
  await p.click('#pane-res .note button[data-nact="mask"]'); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const n = [...document.querySelectorAll("#pane-res .note")].find(x => /masked/.test(x.textContent)); return { mask: maskOf(activeYCol()).length, stale: n ? [...n.querySelectorAll(".acts button")].map(b => b.textContent) : null }; });
  check("Mask masks it, and the fit out of date offers Fit again", r.mask === 1 && JSON.stringify(r.stale) === '["Fit again"]', JSON.stringify(r));
  await p.click('#pane-res .note button[data-nact="fitagain"]'); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ stale: !!fitStale(P().fit), notes: [...document.querySelectorAll("#pane-res .note p")].map(x => x.textContent) }));
  check("Fit again fits again, and the note goes", !r.stale && !r.notes.some(t => /masked/.test(t)), JSON.stringify(r));
  // A peak fit: Every parameter among its switches, Remove fit with the fit's line.
  await p.evaluate(() => { S.fitMode = "peaks"; showTab("fit"); renderFit(); }); await p.waitForTimeout(300);
  r = await p.evaluate(() => { const g = document.querySelector('#pane-fit .fitshow[aria-label="In the results"]'); return { sw: g ? [...g.querySelectorAll("input[data-rshow]")].map(i => i.dataset.rshow) : null, wt: !!document.querySelector("#pane-fit .fitwt") }; });
  check("a peak fit's switches start with Every parameter, and no weighting text in its footer", !!r.sw && r.sw[0] === "par" && r.sw.length === 6 && !r.wt, JSON.stringify(r));
}, { name: "fit and results" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
