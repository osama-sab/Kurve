/* Tests for the LaTeX typesetter in kurve.html (the ==TEX== block): the parser,
   the layout (measured with a stand-in width of half the size per character),
   the SVG and the HTML it writes.
   Usage: node tools/tex-test.mjs [path to kurve.html]                       */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(process.argv[2] || join(here, "..", "kurve.html"), "utf8");
const m = html.match(/==TEX:START==[\s\S]*?\*\/([\s\S]*?)\/\* ==TEX:END==/);
if (!m) { console.error("Could not find the TEX block"); process.exit(1); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const T = new Function("esc", m[1] + "\nreturn {texParse,texLayout,texSvgOf,texHtml,texPlain,texNeeds};")(esc);
let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) { pass++; console.log("  ok   " + name); } else { fail++; console.log("  FAIL " + name + (info !== undefined ? "  (" + (typeof info === "string" ? info : JSON.stringify(info)) + ")" : "")); } };
const meas = (s, z) => [...s].length * 0.5 * z;
const L = s => T.texLayout(s, 12, meas, {});
const texts = b => b.items.filter(q => q.k === "t");
const find = (b, s) => texts(b).find(q => q.s === s);
const allFinite = b => [b.w, b.a, b.d].concat(...b.items.map(q => q.k === "p" ? q.c.flatMap(c => c.slice(1)) : [q.x, q.y])).every(Number.isFinite);

check("plain text needs no typesetting; markup does", !T.texNeeds("Wavenumber (cm-1)") && !T.texNeeds("sample_01") && !T.texNeeds("run^2") && T.texNeeds("cm^{-1}") && T.texNeeds("$x$") && T.texNeeds("\\alpha"));
{ const b = L("PER_{log_{10}} (dB)"), per = find(b, "PER"), lg = find(b, "log"), ten = find(b, "10");
  check("nested scripts: PER, log smaller and lower, 10 smaller and lower still", per && lg && ten && lg.z < per.z && ten.z < lg.z && lg.y > per.y && ten.y > lg.y && lg.x >= per.x + meas("PER", 12) - 1e-9 && ten.x > lg.x, b.items);
  check("the text after the scripts comes back to the baseline at full size", find(b, " (dB)") && find(b, " (dB)").y === 0 && find(b, " (dB)").z === 12);
  check("every number is finite", allFinite(b)); }
{ const b = L("$x_i^2$"), x = find(b, "x"), i = find(b, "i"), two = find(b, "2");
  check("math: a letter in italic, digits upright; sub and sup stacked at one x", x.it === true && two.it === false && i.it === true && Math.abs(i.x - two.x) < 1.2 && two.y < 0 && i.y > 0, b.items); }
{ const b = L("$\\log_{10} x$"), lg = find(b, "log");
  check("\\log is upright, one piece, with a thin space before x", lg && lg.it === false && find(b, "x").x > lg.x + meas("log", 12) + meas("10", 8.52) - 0.01, b.items); }
{ const a = L("$-x$"), b = L("$a-b$"), m1 = find(a, "−"), x = find(a, "x"), mb = find(b, "−");
  check("a minus sign: no spaces as a sign, spaces as an operation", m1 && Math.abs(x.x - meas("−", 12)) < 1e-9 && mb.x > meas("a", 12) + 0.1 && find(b, "b").x > mb.x + meas("−", 12) + 0.1, { a: a.items, b: b.items }); }
{ const b = L("$\\frac{a}{b}$"), na = find(b, "a"), db = find(b, "b"), bar = b.items.find(q => q.k === "p");
  check("a fraction: numerator above the bar, denominator below, both smaller", na.y < 0 && db.y > 0 && bar && na.z < 12 && db.z < 12 && b.a > 12 * 0.71 && b.d > 12 * 0.21, b.items); }
{ const b = L("$\\sqrt{x}$"), p = b.items.find(q => q.k === "p");
  check("a root: its sign and bar drawn as one stroke over the body", p && p.c.length >= 5 && find(b, "x").x > 0, b.items); }
{ const b = L("$\\hat{x}\\,\\dot{y}\\vec{v}$");
  check("accents: a hat and an arrow as strokes, a dot as a dot", b.items.filter(q => q.k === "p").length === 2 && b.items.filter(q => q.k === "o").length === 1); }
{ const b = L("$f'(x)$");
  check("a prime is a superscript", find(b, "′") && find(b, "′").y < 0); }
check("Greek and symbols by name, in text and in math", texts(L("\\alpha + \\beta")).map(q => q.s).join("") === "α + β" && find(L("$\\alpha$"), "α").it === true && find(L("$\\Omega$"), "Ω").it === false);
check("\\deg C is °C; \\nu = 1 keeps its space", T.texPlain("\\deg C") === "°C" && T.texPlain("\\nu = 1") === "ν = 1");
check("escapes: \\% \\$ \\_ \\{ \\}", T.texPlain("50\\% \\$ a\\_b \\{x\\}") === "50% $ a_b {x}");
check("an unclosed brace shows, so the mistake is seen", T.texPlain("x^{2") === "x{2" && T.texPlain("a_{b") === "a{b");
check("a single $ is a dollar sign", T.texPlain("costs $5") === "costs $5" && !texts(L("costs $5")).some(q => q.it));
check("text: x^2 and sample_01 stay as typed; braces make scripts", T.texPlain("x^2 sample_01") === "x^2 sample_01" && find(L("cm^{-1}"), "-1") && find(L("cm^{-1}"), "-1").y < 0);
check("an unknown command stays as it was typed", T.texPlain("a \\foo b") === "a \\foo b");
check("\\mathrm and \\text are upright inside math, \\text keeps its spaces", find(L("$\\mathrm{d}x$"), "d").it === false && T.texPlain("$x \\text{ if } y$") === "x if y");
check("\\left( and \\right) draw the delimiters", T.texPlain("$\\left(\\frac{1}{2}\\right)$") === "(1/2)");
check("HTML: nested scripts, italic math, the root", T.texHtml("PER_{log_{10}}") === "PER<sub>log<sub>10</sub></sub>" && T.texHtml("$x^2$") === "<i>x</i><sup>2</sup>" && /√<span style="text-decoration:overline"><i>x<\/i><\/span>/.test(T.texHtml("$\\sqrt{x}$")));
check("HTML escapes what it is given", T.texHtml("a<b & $c$") === "a&lt;b &amp; <i>c</i>");
{ const deep = "x" + "^{x".repeat(300) + "}".repeat(300), b = L(deep);
  check("300 nested braces: no stack overflow, a finite layout", allFinite(b)); }
{ const b = L("$x^2_i + \\frac{a}{b}$"), svg = T.texSvgOf(b, "#123456", 10, 20);
  check("SVG: positioned text in its sizes and styles, the rule in the text's colour", /<text x="10\.00" y="20\.00" font-size="12\.00" font-style="italic">x<\/text>/.test(svg) && /<path d="M[^"]+" fill="none" stroke="#123456"/.test(svg), svg); }
check("SVG leaves out spaces at the ends but keeps their width", (() => { const b = L("a $x$"), svg = T.texSvgOf(b, "#000", 0, 0); return />a<\/text>/.test(svg) && !/> a</.test(svg); })());
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
