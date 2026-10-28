/* The interface's colours, measured as the browser resolves them, in each
   theme (light, dark) and style (Bench, Graphite): words 7:1 or more against
   every surface they sit on, the edges of controls and windows 3:1 or more,
   and what is on, chosen or in front filled with a colour its own text reads
   on at 4.5:1 or more. See DESIGN.md. Needs Playwright with Chromium. Usage:
     node tools/contrast-test.mjs [path/to/kurve.html] */
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
  else { fail++; console.log("  FAIL " + name + (detail == null ? "" : "  — " + detail)); }
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); const errors = [];
p.on("pageerror", e => errors.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, r => r.abort());
await p.addInitScript(() => { try { localStorage.setItem("kurve.ovAuto", "0"); } catch (e) {} });
await p.goto(URL);
await p.waitForFunction(() => typeof S !== "undefined" && S.pid && S.proj, null, { timeout: 15000 });
await p.evaluate(async () => { await loadExample("ir"); }); await p.waitForTimeout(500);
// Colours are measured as they settle, not part way through a transition from the last theme or state.
await p.addStyleTag({ content: "*,*::before,*::after{transition:none!important}" });

// [what, foreground token, background token, at least]
const PAIRS = [];
for (const bg of ["--panel", "--panel-2", "--panel-3", "--chrome", "--win-h-bg", "--btn-bg"]) PAIRS.push(["words on " + bg, "--ink", bg, 7], ["secondary words on " + bg, "--muted", bg, 7]);
for (const bg of ["--panel", "--panel-2", "--chrome", "--btn-bg"]) PAIRS.push(["edges on " + bg, "--rule", bg, 3]);
PAIRS.push(["a window's edge on the desk", "--win-bd", "--paper", 3], ["a window's edge on its own panel", "--win-bd", "--panel", 3],
  ["the front window's title", "--win-h-act-ink", "--win-h-act-bg", 4.5], ["text on the accent (on, chosen, in front)", "--accent-ink", "--accent", 4.5],
  ["the accent on a panel", "--accent", "--panel", 4.5], ["the focus ring on a panel", "--focus", "--panel", 3],
  ["a switch that is off", "--sw-off", "--panel", 3], ["a checkbox's edge", "--cb-bd", "--panel", 3], ["a slider's track", "--trk", "--panel", 3],
  ["words on a menu's highlight", "--ink", "--hi", 7], ["words on a selection", "--ink", "--sel", 7],
  ["good news", "--ok", "--panel", 4.5], ["a warning", "--warn", "--panel", 4.5], ["an error", "--bad", "--panel", 4.5],
  ["words on the worksheet's selection", "--ink", "--ws-sel", 7], ["words on a pressed button", "--ink", "--press", 7],
  ["words on the graph bar's contextual menu", "--ink", "--accent-soft", 7], ["the contextual menu's bar on its fill", "--accent", "--accent-soft", 3]);
// Disabled words still read (UX_SPEC §3.5): 4.5:1 on every surface a control sits on.
for (const bg of ["--panel", "--panel-2", "--panel-3", "--chrome", "--btn-bg", "--win-h-bg"]) PAIRS.push(["disabled words on " + bg, "--ink-off", bg, 4.5]);
// Numbers and words on a filled status shape: step numbers, badges, the danger button.
for (const bg of ["--ok", "--warn", "--bad", "--badge"]) PAIRS.push(["words on a " + bg.slice(2) + " fill", "--on-fill", bg, 4.5]);

for (const theme of ["light", "dark"]) for (const style of ["bench", "graphite"]) {
  console.log(`${style}, ${theme}`);
  const r = await p.evaluate(([th, st, pairs]) => {
    document.documentElement.dataset.theme = th; applyStyle(st);
    const probe = document.createElement("div"); document.body.appendChild(probe);
    // A colour-mix() token computes to "color(srgb r g b)" with channels from 0 to 1.
    const rgb = c => { probe.style.color = ""; probe.style.color = c; const s = getComputedStyle(probe).color, m = s.match(/[\d.]+/g).map(Number); return s.startsWith("color(") ? m.map((v, i) => i < 3 ? v * 255 : v) : m; };
    const lum = c => { const v = rgb(c).slice(0, 3).map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const cs = getComputedStyle(document.documentElement), tok = n => cs.getPropertyValue(n).trim();
    const out = pairs.map(([n, f, b, need]) => ({ n, v: cr(tok(f), tok(b)), need, f: tok(f), b: tok(b) }));
    // Elements as drawn: the front window's title bar, a switched-on toolbar button, the front taskbar button.
    { const w = winOfGraph(S.gid) || "sheet"; focusWin(w); }
    const el = (sel, n, need) => { const e = document.querySelector(sel); if (!e) { out.push({ n: n + " (not found: " + sel + ")", v: 0, need }); return; } const s = getComputedStyle(e); out.push({ n, v: cr(s.color, s.backgroundColor), need, f: s.color, b: s.backgroundColor }); };
    el(".win.active .win-h", "the front window's title bar, as drawn", 4.5);
    el(".tb[aria-pressed=\"true\"]", "a switched-on toolbar button, as drawn", 4.5);
    el(".tk.front", "the front window's taskbar button, as drawn", 4.5);
    // A disabled button as drawn: no fill of its own, so its words are read against the panel under it.
    const db = document.createElement("button"); db.className = "btn"; db.disabled = true; db.textContent = "Fit";
    const host = document.querySelector("#w-fit .win-b") || document.body; host.appendChild(db);
    const painted = e => { while (e && e !== document.documentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; };
    { const s = getComputedStyle(db), bgc = painted(host); out.push({ n: "a disabled button, as drawn", v: cr(s.color, bgc), need: 4.5, f: s.color, b: bgc });
      out.push({ n: "a disabled button is not faded (opacity 1)", v: +s.opacity >= 1 ? 99 : 0, need: 1, f: s.opacity, b: "" }); }
    db.remove();
    probe.remove(); return out;
  }, [theme, style, PAIRS]);
  for (const q of r) check(`${q.n}: ${q.v.toFixed(2)}:1 (at least ${q.need}:1)`, q.v >= q.need, `${q.f} on ${q.b}`);
}
check("no page errors", !errors.length, errors.slice(0, 3).join(" | "));
await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
