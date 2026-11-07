/* Project files (ux/spec/FOUNDATION_SPEC.md, 1.1): saved, opened, refused, backed up, clicked and
   checked in a real browser.
   Needs Playwright with Chromium. Usage:
     node tools/file-drive.mjs [path/to/kurve.html]
   Set PLAYWRIGHT=/path/to/playwright/index.mjs if `playwright` is not
   installed where node can find it. */
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
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + String(detail).slice(0, 500))); }
};
const browser = await chromium.launch();
const ready = async (p) => { await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj && S.projects && S.projects.length, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(150); };
// In the page: a stand-in for the browser's file picker that writes into window.__files, and helpers.
const HELP = () => {
  window.__files = {}; window.__picks = 0;
  window.showSaveFilePicker = async (o) => { window.__picks++; const name = (o && o.suggestedName) || "x.kurve";
    return { name, createWritable: async () => { const parts = []; return { write: async (b) => parts.push(b), close: async () => { window.__files[name] = new Blob(parts); } }; } }; };
  window.__asFile = (name) => new File([window.__files[name]], name);
  window.__wait = (f, ms = 15000) => new Promise((res, rej) => { const t0 = Date.now(); const go = () => { let v; try { v = f(); } catch (e) {} if (v) res(v); else if (Date.now() - t0 > ms) rej(new Error("waited too long")); else setTimeout(go, 30); }; go(); });
  // An example opened: into the project on the desk when it is empty, else into a new one; either way its Y is the active one.
  window.__ex = async (ex) => { const y0 = P() && P().activeY; await loadExample(ex); await window.__wait(() => P() && P().activeY && P().activeY !== y0 && P().cols.length > 1); };
  window.__toast = () => (document.querySelector("#toast") || {}).textContent || "";
  // What a project is, without what opening it rightly changes (its id, name, file, the log of being opened).
  window.__core = (q) => { const o = JSON.parse(JSON.stringify(q)); ["id", "name", "file", "log", "_rev"].forEach(k => delete o[k]); return o; };
};
async function page(fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); localStorage.setItem("kurve.pref.anim", "false"); } catch (e) {} });
  await p.goto(URL); await ready(p); await p.evaluate(HELP);
  await p.evaluate(() => { prefSet("anim", false); applyAnim(); });
  try { await Promise.race([fn(p, ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out: the page hung")), opt.timeout || 120000))]); }
  catch (e) { check(opt.name + ": ran", false, e.message); }
  check(opt.name + ": no page errors", !errors.length, errors.slice(0, 3).join(" | "));
  await ctx.close().catch(() => {});
}

console.log("Every example saved to a file and opened again");
await page(async p => {
  for (const ex of ["decay", "ir", "ps", "raman"]) {
    const r = await p.evaluate(async (ex) => {
      await __ex(ex);
      await new Promise(r => setTimeout(r, 900));
      // Something of everything: a peak set, a band, an annotation, a thread with a reply, a step's discussion.
      const c = activeYCol(); try { findPeaksInto(); } catch (e) {}
      const d = finalOf(c), xs = d.x.filter(Number.isFinite), lo = Math.min(...xs.slice(0, 50)), hi = xs[Math.floor(xs.length / 3)];
      addBand(lo, hi);
      addAnno({ t: "text", x: d.x[5], y: d.y[5], text: "A note $\\alpha$", g: GID() });
      await S.store.addComment(S.pid, { uid: S.uid || "", text: "First", anchor: null, t: Date.now(), resolved: false });
      await __wait(() => S.comments.length === 1); const th = S.comments[0].id;
      await S.store.addComment(S.pid, { uid: S.uid || "", text: "A reply", anchor: null, parent: th, t: Date.now() + 1, resolved: false });
      await __wait(() => S.comments.length === 2); await new Promise(r => setTimeout(r, 300));
      const before = __core(P()), pid0 = S.pid, fp = P().raw.fp, nm = projName(P());
      window.__picks = 0; await saveProjectFile(false);
      const fname = Object.keys(__files).find(k => k.startsWith(safeName(nm, ""))), size = __files[fname] && __files[fname].size;
      const m0 = S.projects.length; await openProjectFile(__asFile(fname)); await __wait(() => S.projects.length > m0 && S.pid !== pid0);
      await __wait(() => /as they were saved|not those/.test(__toast()), 20000).catch(() => {});
      const after = __core(P()), cs = S.comments.slice().sort((a, b) => a.t - b.t);
      const diff = Object.keys(before).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
      return { ex, size, diff, fpSame: P().raw.fp === fp, toast: __toast(), name: projName(P()), nm, comments: cs.map(c => c.text), replyOk: cs.length === 2 && cs[1].parent === cs[0].id, other: S.pid !== pid0, undo: canUndo() };
    }, ex);
    check(`${ex}: opened as a new project, everything as it was (${Math.round(r.size / 1024)} kB)`, r.other && !r.diff.length && r.fpSame, JSON.stringify(r.diff));
    check(`${ex}: its comments with it, the reply under its thread`, JSON.stringify(r.comments) === '["First","A reply"]' && r.replyOk, JSON.stringify(r.comments));
    check(`${ex}: its check code compared and found the same, its name made its own, nothing to undo`, /as they were saved/.test(r.toast) && r.name !== r.nm && !r.undo, JSON.stringify([r.toast, r.name, r.nm, r.undo]));
  }
}, { name: "examples", timeout: 300000 });

console.log("A million rows, the same file twice, an older document");
await page(async p => {
  const r = await p.evaluate(async () => {
    const n = 1000000, x = new Array(n), y = new Array(n); for (let i = 0; i < n; i++) { x[i] = i * 1e-4; y[i] = i % 977 === 0 ? null : Math.sin(i / 300); }
    const X = makeCol("x", "Time", "s", x), Y = Object.assign(makeCol("y", "Signal", "mV", y), { pipe: [], mask: [] });
    const n0 = S.projects.length; await createProject(Object.assign(blankProject("Million"), { cols: [X, Y], activeY: Y.id }), "test"); await __wait(() => S.projects.length > n0 && P() && P().name === "Million");
    const t0 = performance.now(); await saveProjectFile(false); const tSave = performance.now() - t0, f = __asFile("Million.kurve");
    const pid0 = S.pid, m0 = S.projects.length, t1 = performance.now(); await openProjectFile(f); await __wait(() => S.projects.length > m0 && S.pid !== pid0 && P().cols.length === 2, 60000);
    const tOpen = performance.now() - t1, yd = P().cols[1].data;
    let same = yd.length === n; for (let i = 0; i < n && same; i += 1) if (yd[i] !== y[i]) same = false;
    // The same file again: another project, another name.
    const m1 = S.projects.length; await openProjectFile(f); await __wait(() => S.projects.length > m1);
    const names = S.projects.filter(q => /^Million/.test(q.name)).map(q => q.name).sort();
    return { size: f.size, tSave: Math.round(tSave), tOpen: Math.round(tOpen), same, names };
  });
  check(`a million rows saved (${r.tSave} ms, ${(r.size / 1e6).toFixed(1)} MB) and opened again (${r.tOpen} ms), every value and empty cell as it was`, r.same && r.tSave < 3000 && r.tOpen < 3000, JSON.stringify(r));
  check("the same file opened twice is two projects with names of their own", r.names.length === 3 && new Set(r.names).size === 3, JSON.stringify(r.names));
  const o = await p.evaluate(async () => {
    // A file whose project is of document version 3: its table-wide steps become each column's.
    const x = Array.from({ length: 40 }, (_, i) => 39 - i), X = makeCol("x", "X", "", x), Y = makeCol("y", "Y", "", x.map(v => v * v));
    const doc = { format: "kurve-project", fv: 1, v: 3, saved: "", by: "", fp: "", project: { name: "Old one", v: 3, cols: [X, Y], activeY: Y.id, steps: [{ op: "sortX" }], mask: [] }, comments: [] };
    const blob = await pfGzip(JSON.stringify(doc)), m0 = S.projects.length; await openProjectFile(new File([blob], "old.kurve")); await __wait(() => S.projects.length > m0 && P() && /^Old one/.test(P().name));
    await new Promise(r => setTimeout(r, 300)); const y = P().cols.find(c => c.role === "y");
    return { v: P().v, steps: (y.pipe || []).map(s => s.op), sorted: finalOf(y).x[0] === 0 };
  });
  check("a file from an older document version opens upgraded (its table-wide sort became the column's step)", o.v >= 5 && o.steps.includes("sort") && o.sorted, JSON.stringify(o));
}, { name: "large and old", timeout: 300000 });

console.log("Files that are not right are refused, and nothing is made");
await page(async p => {
  const r = await p.evaluate(async () => {
    const out = {}, gz = (s) => pfGzip(typeof s === "string" ? s : JSON.stringify(s));
    const X = makeCol("x", "X", "", Array.from({ length: 300 }, (_, i) => i)), good = { format: "kurve-project", fv: 1, v: 5, project: { name: "G", cols: [X] }, comments: [] };
    const packed = pfPackCol(X), short = Object.assign({}, packed, { data: Object.assign({}, packed.data, { n: 301 }) });
    const cases = {
      notGzip: new Blob(["x,y\n1,2\n"]),
      truncated: (await gz(good)).slice(0, 40),
      notJson: await gz("{ this is not json"),
      noProject: await gz({ format: "kurve-project", fv: 1 }),
      newer: await gz(Object.assign({}, good, { fv: 99 })),
      otherFormat: await gz({ format: "something-else", fv: 1, project: good.project }),
      badValues: await gz(Object.assign({}, good, { project: { name: "B", cols: [short] } })),
      twoIds: await gz(Object.assign({}, good, { project: { name: "D", cols: [X, X] } })),
      notColumn: await gz(Object.assign({}, good, { project: { name: "E", cols: [42] } })),
      emptyBackup: await gz({ format: "kurve-backup", fv: 1, projects: [] }) };
    // A bomb: the limit lowered for the test, a stream of zeros inflating past it.
    const keep = PF_MAXIN; PF_MAXIN = 4e6; const zeros = new Blob([new Uint8Array(6e6)]).stream().pipeThrough(new CompressionStream("gzip")); cases.bomb = await new Response(zeros).blob();
    for (const [k, b] of Object.entries(cases)) { const n0 = S.projects.length; await openProjectFile(new File([b], k + ".kurve")); await new Promise(r => setTimeout(r, 120)); out[k] = { made: S.projects.length - n0, said: __toast() }; }
    PF_MAXIN = keep; return out;
  });
  const said = { notGzip: /not a Kurve project file/, truncated: /cut short or damaged/, notJson: /does not read/, noProject: /holds no project/, newer: /newer Kurve/, otherFormat: /not a Kurve project file/,
    badValues: /holds 300 values where it says 301/, twoIds: /two columns have one id/, notColumn: /not a column/, emptyBackup: /no project in it/, bomb: /more than 4 MB/ };
  for (const [k, re] of Object.entries(said)) check(`${k}: refused in words, no project made`, r[k] && r[k].made === 0 && re.test(r[k].said), JSON.stringify(r[k]));
}, { name: "refusals" });

console.log("Ctrl+S, Save a copy, a picker refused, the menu, a drop, a backup");
await page(async p => {
  await p.evaluate(async () => { await __ex("decay"); });
  await p.waitForTimeout(600);
  await p.evaluate(() => { window.__picks = 0; window.__files = {}; });
  await p.keyboard.press("Control+s"); await p.waitForFunction(() => Object.keys(__files).length === 1);
  await p.evaluate(() => save({ name: "Decay, renamed" }, "renamed")); await p.waitForTimeout(200);
  await p.keyboard.press("Control+s"); await p.waitForTimeout(800);
  let r = await p.evaluate(async () => { const k = Object.keys(__files); const t = await new Response(__files[k[0]].stream().pipeThrough(new DecompressionStream("gzip"))).text();
    return { picks: __picks, files: k, name: JSON.parse(t).project.name, tip: document.querySelector("#projName").title }; });
  check("Ctrl+S asks once, then writes the same file again (it holds the new name)", r.picks === 1 && r.files.length === 1 && r.name === "Decay, renamed" && /Last saved to a file as/.test(r.tip), JSON.stringify(r));
  await p.keyboard.press("Control+Shift+S"); await p.waitForTimeout(600);
  r = await p.evaluate(() => ({ picks: __picks }));
  check("Ctrl+Shift+S, a copy, asks where again", r.picks === 2, JSON.stringify(r));
  r = await p.evaluate(async () => { const h = PF_HANDLES.get(S.pid); PF_HANDLES.set(S.pid, { name: h.name, createWritable: async () => { throw Object.assign(new Error("gone"), { name: "NotAllowedError" }); } });
    const p0 = __picks; await saveProjectFile(false); return { asked: __picks - p0, files: Object.keys(__files).length }; });
  check("a file that can no longer be written asks where again", r.asked === 1, JSON.stringify(r));
  r = await p.evaluate(() => { const items = menuItems("file"), lab = items.filter(i => i && i.label).map(i => i.label); return lab; });
  check("the File menu has Open a project file…, Save to a file…, Save a copy… and Back up every project…", ["Open a project file…", "Save to a file…", "Save a copy to a file…", "Back up every project…"].every(l => r.includes(l)), JSON.stringify(r));
  // A .kurve dropped on the window opens as a project.
  r = await p.evaluate(async () => { const f = __asFile(Object.keys(__files)[0]), dt = new DataTransfer(); dt.items.add(f); const n0 = S.projects.length;
    window.dispatchEvent(new DragEvent("dragenter", { dataTransfer: dt, bubbles: true }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, clientX: 700, clientY: 400 }));
    await __wait(() => S.projects.length > n0); return { made: S.projects.length - n0, name: projName(P()) }; });
  check("a project file dropped on the window opens as a project", r.made === 1 && /^Decay, renamed/.test(r.name), JSON.stringify(r));
  // The import picker takes one too.
  r = await p.evaluate(async () => { const n0 = S.projects.length; readFileIn(__asFile(Object.keys(__files)[0])); await __wait(() => S.projects.length > n0); return S.projects.length - n0; });
  check("a project file chosen to import opens as a project", r === 1, r);
  // A backup of every project, two of them restored.
  r = await p.evaluate(async () => { const orig = URL.createObjectURL; let blob = null; URL.createObjectURL = (b) => { blob = b; return orig.call(URL, b); };
    await backupProjects(); URL.createObjectURL = orig; return { n: S.projects.length, size: blob && blob.size, ok: !!blob, said: __toast() }; });
  check("Back up every project… writes one file of every project", r.ok && /backed up/.test(r.said), JSON.stringify(r));
}, { name: "keys and menus" });

console.log("A backup restored, two of its projects of three");
await page(async p => {
  const r = await p.evaluate(async () => {
    const mk = async (nm) => { const X = makeCol("x", "X", "", [1, 2, 3]), Y = makeCol("y", nm, "", [3, 1, 2]); const n0 = S.projects.length; await createProject(Object.assign(blankProject(nm), { cols: [X, Y], activeY: Y.id }), "t"); await __wait(() => S.projects.length > n0); };
    await mk("Alpha"); await mk("Beta"); await mk("Gamma");
    const docs = S.projects.filter(q => ["Alpha", "Beta", "Gamma"].includes(q.name)).map(q => pfDoc(q.id));
    const blob = await pfGzip(JSON.stringify({ format: "kurve-backup", fv: 1, saved: "", projects: docs }));
    const n0 = S.projects.length; openProjectFile(new File([blob], "backup.kurve"));
    await __wait(() => !document.querySelector("#formModal").hidden);
    const boxes = [...document.querySelectorAll("#formBody input[type=checkbox]")]; const labels = boxes.map(b => b.parentElement.textContent.trim());
    boxes[1].click(); document.querySelector("#formOk").click();
    await __wait(() => S.projects.length >= n0 + 2, 20000); await new Promise(r => setTimeout(r, 400));
    return { labels, made: S.projects.length - n0, names: S.projects.map(q => q.name).filter(n => /\(2\)/.test(n)).sort() };
  });
  check("the backup lists its three projects; the two ticked are restored as new projects", r.labels.length === 3 && r.made === 2 && JSON.stringify(r.names) === '["Alpha (2)","Gamma (2)"]', JSON.stringify(r));
}, { name: "backup" });

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
