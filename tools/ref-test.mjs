/* Kurve's numerics against outside references (PARITY_SPEC.md, wave 0, the bar's first gate).

   Usage: node tools/ref-test.mjs [kurve.html] [--all]

   Reads tools/ref/fixtures/*.json (made by SciPy, NumPy and statsmodels; tools/ref/README.md) and
   NIST's certified values in tools/ref/nist/, runs Kurve's own functions on the same inputs, and
   prints, for every function, the worst error found against its target. A function short of its
   target fails, unless the table below names the slice that brings it there (`until`): then it is
   listed as short and must not get worse than the `now` it was measured at, so the bench is a
   ratchet: an accuracy once reached is kept. --all prints every case past its target. */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadKurve, fromJSON } from "./ref/run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), all = argv.includes("--all");
const get = loadKurve(argv.find((a) => !a.startsWith("--")));
const fixtures = Object.fromEntries(readdirSync(join(here, "ref", "fixtures")).filter((f) => f.endsWith(".json"))
  .map((f) => [f.replace(/\.json$/, ""), fromJSON(readFileSync(join(here, "ref", "fixtures", f), "utf8"))]));

/* What each function must reach, as a relative error (an absolute one beside it for values near 0,
   `floor`). `until` names the slice of PARITY_SPEC.md that brings a function short of its target
   there, `now` the worst error it was measured at when that was written down. */
const TARGET = JSON.parse(readFileSync(join(here, "ref", "targets.json"), "utf8"));

const worst = new Map(); // name -> {err, at}
const over = [], refBad = [];
function relErr(got, want, floor = 0) {
  if (typeof want === "number" && !Number.isFinite(want)) return Object.is(got, want) || (Number.isNaN(want) && Number.isNaN(got)) ? 0 : Infinity;
  if (typeof got !== "number" || !Number.isFinite(got)) return Infinity;
  const d = Math.abs(got - want);
  return d <= floor ? 0 : d / Math.max(Math.abs(want), floor || Number.MIN_VALUE);
}
function note(name, err, at) {
  const w = worst.get(name);
  if (!w || err > w.err || Number.isNaN(err)) worst.set(name, { err, at });
  const t = TARGET[name];
  if (all && t && !(err <= t.tol)) over.push(`${name} ${at}: ${err.toExponential(2)}`);
}
const fmtA = (a) => JSON.stringify(a).slice(0, 70);

/* ---- special functions, distributions, quantiles ---- */
for (const set of ["special", "dist", "stats", "quantile"]) {
  for (const c of fixtures[set].cases) {
    const f = get(c.fn), got = f(...c.args), t = TARGET[c.fn] || {};
    if (c.kind === "vec-rel") {
      const mag = Math.hypot(...c.want);
      note(c.fn, Math.max(...c.want.map((w, i) => Math.abs(got[i] - w) / Math.max(mag, t.floor || 1e-300))), fmtA(c.args));
    } else if (c.kind === "abs-rel") note(c.fn, Math.abs(got - c.want) / Math.max(1, Math.abs(c.want)), fmtA(c.args));
    else note(c.fn, relErr(got, c.want, t.floor), fmtA(c.args));
  }
}

/* ---- distributions fitted to values ---- */
for (const c of fixtures.distfit.cases) {
  const r = get("distFit")(...c.args), at = `${c.args[1]} n=${c.args[0].length}`;
  c.want.p.forEach((w, i) => note("distFit.p", relErr(r.p[i], w), at));
  note("distFit.ks", relErr(r.ks, c.want.ks), at);
  note("distFit.pks", relErr(r.pks, c.info.pks_exact), at);
}

/* ---- fits ---- */
const MODEL = {
  "expdec-c": (x, p) => p[0] * Math.exp(-x / p[1]) + p[2],
  "gauss-c": (x, p) => { const s = p[2] / (2 * Math.sqrt(2 * Math.log(2))); return p[1] / (s * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * ((x - p[0]) / s) ** 2) + p[3]; },
  line: (x, p) => p[0] + p[1] * x,
};
for (const c of fixtures.fits.cases) {
  const f = MODEL[c.model], fixed = c.p0.map(() => false);
  if (c.fn === "lmFit") {
    const W = c.sy ? c.sy.map((s) => 1 / s) : c.x.map(() => 1);
    const r = get("lmFit")(f, c.x, c.y, W, c.p0, fixed, { scale: !c.sy, tol: 1e-15, maxIter: 2000 });
    c.want.params.forEach((w, i) => note("lmFit.params", relErr(r.params[i], w), `${c.model}${c.sy ? " weighted" : ""} p${i}`));
    c.want.errors.forEach((w, i) => note("lmFit.errors", relErr(r.errors[i], w), `${c.model}${c.sy ? " weighted" : ""} p${i}`));
  } else if (c.fn === "odrFit") {
    const r = get("odrFit")(f, c.x, c.y, c.sy, c.sx, c.p0, fixed, { tol: 1e-15, maxIter: 2000 });
    c.want.params.forEach((w, i) => note("odrFit.params", relErr(r.params[i], w), `line p${i}`));
    // ODRPACK's sd_beta is scaled by the residual variance; its cov_beta is not, and is what Kurve's errors are with σ given.
    c.info.cov_beta.forEach((row, i) => note("odrFit.errors", relErr(r.errors[i], Math.sqrt(row[i])), `line p${i}`));
  }
}

/* ---- NIST's Norris: certified values read from the file itself ---- */
{
  const txt = readFileSync(join(here, "ref", "nist", "Norris.dat"), "utf8").split(/\r?\n/);
  const num = (s) => +s.replace(/E/i, "e");
  const cert = (name) => { const l = txt.find((l) => l.trim().startsWith(name)); return l.trim().split(/\s+/).slice(1).map(num); };
  const [b0, sb0] = cert("B0"), [b1, sb1] = cert("B1");
  const r2 = num(txt.find((l) => l.includes("R-Squared")).trim().split(/\s+/).pop());
  const k = txt.map((l) => l.trim().startsWith("Data:")).lastIndexOf(true);
  const rows = txt.slice(k + 1).filter((l) => l.trim()).map((l) => l.trim().split(/\s+/).map(Number));
  const Y = rows.map((r) => r[0]), X = rows.map((r) => r[1]);
  const pf = get("polyfit")(X, Y, 1);
  note("norris.polyfit", relErr(pf[0], b0), "B0"); note("norris.polyfit", relErr(pf[1], b1), "B1");
  const r = get("lmFit")(MODEL.line, X, Y, X.map(() => 1), [0, 1], [false, false], { scale: true, tol: 1e-15 });
  note("norris.lmFit", relErr(r.params[0], b0), "B0"); note("norris.lmFit", relErr(r.params[1], b1), "B1");
  note("norris.lmFit.errors", relErr(r.errors[0], sb0), "sd B0"); note("norris.lmFit.errors", relErr(r.errors[1], sb1), "sd B1");
  note("norris.R2", relErr(r.stats.R2, r2), "R²");
  const sm = fixtures.nist.cases[0].want; // statsmodels beside the certified values: the reference checked too
  if (!(relErr(sm.params[0], b0) < 1e-10 && relErr(sm.bse[1], sb1) < 1e-10)) refBad.push("statsmodels disagrees with NIST's certified Norris values");
}

/* ---- the table ---- */
let fail = 0, short = 0, pass = 0;
console.log("\n  function              worst error   target");
for (const [name, w] of worst) {
  const t = TARGET[name] || { tol: 0 }, ok = w.err <= t.tol;
  let state;
  if (ok) { state = "ok"; pass++; }
  else if (t.until && w.err <= t.now) { state = `short of target until slice ${t.until}`; short++; }
  else { state = t.until ? `WORSE than ${t.now} (slice ${t.until})` : "FAIL"; fail++; }
  console.log(`  ${name.padEnd(20)}  ${(Number.isFinite(w.err) ? w.err.toExponential(2) : String(w.err)).padStart(9)}   ${t.tol.toExponential(0).padStart(6)}   ${state}${ok ? "" : `  at ${w.at}`}`);
}
for (const o of over) console.log(`  past target: ${o}`);
for (const b of refBad) { console.log(`  FAIL ${b}`); fail++; }
console.log(`\n${pass} passed, ${short} short of their target with a slice named, ${fail} failed`);
process.exit(fail ? 1 : 0);
