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
const over = [], refBad = [], nistLRE = [];
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

/* ---- descriptive statistics and quantiles (STATS_SPEC 2.1), against exact rationals ---- */
{
  // Each statistic is judged under one of five names; a dimensionless shape statistic has an
  // absolute floor (a skewness of 3e-5 cannot be told from 0 to fifteen digits relative), an order
  // statistic one of an ulp of the largest value (a mix of two values can do no better).
  const GROUP = { mean: "mean", sum: "sum", sd: "spread", var: "spread", se: "spread", cv: "spread", skew: "shape", kurt: "shape",
    gmean: "means", hmean: "means", min: "order", max: "order", range: "order", q1: "order", med: "order", q3: "order", iqr: "order",
    mad: "order", rsd: "order", mode: "order", modeN: "order" };
  const f = get("descStats"), q = get("quantileType");
  for (const c of fixtures.desc.cases) {
    const big = Math.max(...c.args[0].map(Math.abs));
    if (c.kind === "qt") {
      const got = q(...c.args), d = Math.abs(got - c.want);
      note("quantileType", d === 0 ? 0 : d / Math.max(Math.abs(c.want), big * 2 ** -52), `type ${c.args[2]} p ${c.args[1]} n=${c.args[0].length}`);
      continue;
    }
    const r = f(...c.args);
    for (const [k, g] of Object.entries(GROUP)) {
      const w = c.want[k], got = r[k], name = `descStats.${g}`, at = `${k} of ${c.name}${c.args[1].vdiv === "n" ? " (n)" : ""}`;
      if (w === undefined || w === null) { note(name, got == null ? 0 : Infinity, at + " should be blank"); continue; }
      const t = TARGET[name] || {}, d = Math.abs(got - w);
      const floor = g === "shape" ? (t.floor || 0) : g === "order" ? big * 2 ** -52 : 0;
      note(name, typeof got !== "number" ? Infinity : d <= floor ? 0 : d / Math.max(Math.abs(w), floor || Number.MIN_VALUE), at);
    }
  }
}

/* ---- normality and outliers (STATS_SPEC 2.2): each field of a test's result under fn.field ---- */
for (const c of fixtures.norm.cases) {
  const at = c.name || fmtA(c.args);
  if (c.kind === "rel") { note(c.fn === "kolmogN" ? `kolmogN.${c.pg ? "pg" : c.args[2] ? "cdf" : "sf"}` : c.fn, relErr(get(c.fn)(...c.args), c.want), at); continue; }
  let r = get(c.fn)(...c.args); if (c.fn === "grubbsTest") r = r.rounds && r.rounds[0];
  for (const [k, w] of Object.entries(c.want)) {
    const name = `${c.fn}.${k}`, t = TARGET[name] || {};
    note(name, !r || typeof r[k] !== "number" ? Infinity : relErr(r[k], w, t.floor), `${at}: ${k}`);
  }
}

/* ---- comparing means and spreads (STATS_SPEC 2.3): fn.field, a field a path ("ci.0"); the noncentral t absolutely ---- */
for (const c of fixtures.test23.cases) {
  if (c.kind === "abs") { const g = get(c.fn)(...c.args); note(c.fn, typeof g === "number" ? Math.abs(g - c.want) : Infinity, fmtA(c.args)); continue; }
  const r = get(c.fn)(...c.args);
  for (const [k, w] of Object.entries(c.want)) {
    const name = `${c.fn}.${k.replace(/\.\d$/, "")}`, t = TARGET[name] || {}, got = k.split(".").reduce((o, x) => (o == null ? o : o[x]), r);
    note(name, typeof got !== "number" ? Infinity : relErr(got, w, t.floor), `${c.name}: ${k}`);
  }
}

/* ---- one-way ANOVA (STATS_SPEC 2.4): the table against exact rationals, the comparisons against
   SciPy's studentized range (absolutely) and 40-digit t and F tails, NIST's sets against the exact
   answer for the doubles they parse to (their certified values beside, as digits right) ---- */
{
  const A = get("anova1"), C = get("anovaComp");
  const GRP = { ssb: "ss", ssw: "ss", F: "F", p: "p", eta2: "effect", omega2: "effect" };
  for (const c of fixtures.anova.cases) {
    if (c.kind === "test") {
      const r = A(...c.args);
      for (const [k, w] of Object.entries(c.want)) {
        const name = k.startsWith("welch.") ? "anova1.welch" : `anova1.${GRP[k]}`, got = k.split(".").reduce((o, x) => (o == null ? o : o[x]), r);
        note(name, typeof got !== "number" ? Infinity : relErr(got, w, (TARGET[name] || {}).floor), `${c.name}: ${k}`);
      }
      if (!c.want["welch.F"]) note("anova1.welch", r.welch && r.welch.fail ? 0 : Infinity, `${c.name}: Welch's F refused`);
    } else if (c.kind === "comp") {
      const [gs, kind, o] = c.args, res = C(A(gs), kind, o), q = kind === "tukey" || kind === "gh" ? "q" : "t";
      c.want.forEach((w, i) => { const x = res.rows && res.rows[i]; if (!x) { note(`anovaComp.${q}.p`, Infinity, `${c.name}: row ${i} missing`); return; }
        for (const k of ["diff", "se", "stat"]) note("anovaComp.arith", relErr(x[k], w[k]), `${c.name} ${i}: ${k}`);
        note(`anovaComp.${q}.p`, relErr(x.p, w.p, (TARGET[`anovaComp.${q}.p`] || {}).floor), `${c.name} ${i}: p`);
        for (const k of ["lo", "hi"]) note(`anovaComp.${q}.ci`, w[k] === null ? (x[k] === null ? 0 : Infinity) : relErr(x[k], w[k], (TARGET[`anovaComp.${q}.ci`] || {}).floor), `${c.name} ${i}: ${k}`); });
    } else if (c.kind === "nist") {
      const txt = readFileSync(join(here, "ref", "nist", c.args[0]), "utf8").split(/\r?\n/), k = txt.map((l) => l.trim().startsWith("Data:")).lastIndexOf(true), by = new Map();
      txt.slice(k + 1).filter((l) => l.trim()).forEach((l) => { const [t, y] = l.trim().split(/\s+/); if (!by.has(t)) by.set(t, []); by.get(t).push(+y); });
      const r = A([...by.values()]);
      for (const key of ["ssb", "ssw", "F", "msw"]) note("nist.anova", relErr(r[key], c.want[key]), `${c.name}: ${key}`);
      const lre = Math.min(...["ssb", "ssw", "F"].map((key) => -Math.log10(Math.max(1e-16, Math.abs(r[key] - c.info[key]) / Math.abs(c.info[key])))));
      nistLRE.push(`${c.name.replace(/\.dat$/, "")} ${lre.toFixed(1)}`);
    }
  }
}
/* ---- rank tests (STATS_SPEC 2.8): SciPy's statistics and p, the Hodges–Lehmann intervals and Dunn's z exactly ---- */
for (const c of fixtures.np.cases) {
  const r = get(c.fn)(...c.args);
  if (c.kind === "kw") { note("kwTest.H", relErr(r.H, c.want.H), c.name); note("kwTest.p", relErr(r.p, c.want.p), c.name);
    c.want.dunn.forEach((w, i) => { const x = r.dunn[i]; note("kwTest.dunn", Math.max(relErr(x.z, w.z), relErr(x.p, w.p)), `${c.name} ${i}`); }); continue; }
  for (const [k, w] of Object.entries(c.want)) {
    const name = `${c.fn}.${k.replace(/\.\d$/, "")}`, got = k.split(".").reduce((o, x) => (o == null ? o : o[x]), r);
    note(name, typeof got !== "number" ? Infinity : relErr(got, w, (TARGET[name] || {}).floor), `${c.name}: ${k}`);
  }
}
/* ---- correlation (STATS_SPEC 2.9): r, ρ, τ-b, partial r and their p and intervals, exactly ---- */
for (const c of (fixtures.corr || { cases: [] }).cases) {
  const r = get(c.fn)(...c.args);
  if (c.kind === "partial") { c.want.rows.forEach((w, i) => { const x = r.rows[i]; note("partialCorr.r", relErr(x.r, w.r, TARGET["partialCorr.r"].floor), `${c.name} ${i}`); note("partialCorr.p", relErr(x.p, w.p), `${c.name} ${i}`); }); continue; }
  for (const [k, w] of Object.entries(c.want)) {
    const name = `${c.fn}.${k.replace(/\.\d$/, "")}`, got = k.split(".").reduce((o, x) => (o == null ? o : o[x]), r);
    note(name, typeof got !== "number" ? Infinity : relErr(got, w, (TARGET[name] || {}).floor), `${c.name}: ${k}`);
  }
}
/* ---- counts in tables (STATS_SPEC 2.10): χ², G, V, Freeman–Halton and McNemar, exactly ---- */
for (const c of (fixtures.xtab || { cases: [] }).cases) {
  const r = get(c.fn)(...c.args);
  for (const [k, w] of Object.entries(c.want)) { const name = `${c.fn}.${k}`; note(name, typeof r[k] !== "number" ? Infinity : relErr(r[k], w, (TARGET[name] || {}).floor), `${c.name}: ${k}`); }
}
/* ---- the linear model (STATS_SPEC 2.5): linModel's every number and lmContrast's, against exact rationals. An interval's end is
   judged against the larger of the estimate and its half-width (it is their difference); an exact fit (Wampler 1, whose
   residuals are nothing) has its scatter judged against the response's size, and no t or p. ---- */
for (const c of (fixtures.lm || { cases: [] }).cases) {
  const M = get("linModel")(c.vars, c.y, c.spec), w = c.want, at = c.name;
  if (M.fail) { note("linModel.b", Infinity, `${at}: ${M.fail}`); continue; }
  if (M.names.join("|") !== w.names.join("|") || M.rank !== w.rank || M.dfr !== w.dfr) note("linModel.b", Infinity, `${at}: the columns or the rank differ`);
  const rms = Math.sqrt(c.y.reduce((a, v) => a + v * v, 0) / c.y.length), ex = c.exact ? 1e-14 * rms : 0;
  w.b.forEach((v, j) => {
    if (v == null) { if (M.b[j] != null) note("linModel.b", Infinity, `${at}: ${w.names[j]} should be aliased`); return; }
    note("linModel.b", relErr(M.b[j], v), `${at}: b ${w.names[j]}`); note("linModel.se", relErr(M.se[j], w.se[j], ex), `${at}: se ${w.names[j]}`);
    if (w.t[j] != null) { note("linModel.t", relErr(M.t[j], w.t[j]), `${at}: t ${w.names[j]}`); note("linModel.p", relErr(M.p[j], w.p[j]), `${at}: p ${w.names[j]}`); }
    const sz = Math.abs(v) + Math.abs(w.hi[j] - w.lo[j]) / 2;
    note("linModel.ci", Math.max(Math.abs(M.lo[j] - w.lo[j]), Math.abs(M.hi[j] - w.hi[j])) / sz, `${at}: interval ${w.names[j]}`); });
  note("linModel.s", relErr(M.s, w.s, ex), at); note("linModel.rss", relErr(M.rss, w.rss, ex * ex * c.y.length), at);
  if (w.r2 != null) { note("linModel.r2", relErr(M.r2, w.r2), at); note("linModel.r2", relErr(M.ar2, w.ar2), `${at}: adjusted`); }
  if (w.F != null) { note("linModel.F", relErr(M.F, w.F), at); note("linModel.p", relErr(M.pF, w.pF), `${at}: the model's p`); }
  w.anova.forEach((row, i) => { const q = M.anova.rows[i]; if (!q || q.df !== row.df) { note("linModel.ss", Infinity, `${at}: df of ${i}`); return; }
    note("linModel.ss", relErr(q.ss, row.ss, 1e-15 * w.rss), `${at}: ${q.term}`); if (row.F != null) { note("linModel.F", relErr(q.F, row.F), `${at}: ${q.term}`); note("linModel.p", relErr(q.p, row.p), `${at}: ${q.term}`); } });
  (c.spec.con || []).forEach((q, i) => { const r = get("lmContrast")(M, q.text), v = w.con[i];
    if (r.fail) { note("lmContrast.est", Infinity, `${at}: ${q.text}: ${r.fail}`); return; }
    note("lmContrast.est", Math.abs(r.est - v.est) / (Math.abs(v.est) + v.se), `${at}: ${q.text}`); note("lmContrast.se", relErr(r.se, v.se), `${at}: ${q.text}`); note("lmContrast.p", relErr(r.p, v.p), `${at}: ${q.text}`); });
}
/* ---- two- and three-way ANOVA (STATS_SPEC 2.6): estimated means (lmEmmL, lmEst), their differences, simple effects (lmWaldL) ---- */
for (const c of (fixtures.nway || { cases: [] }).cases) {
  const M = get("linModel")(c.vars, c.y, { coding: "effect", inter: c.spec.inter, ss: c.spec.ss }), EM = get("lmEmmL"), ES = get("lmEst"), WL = get("lmWaldL"), w = c.want, at = c.name;
  const dif = (fa, fb) => { const L = EM(M, fa), L2 = EM(M, fb); for (let j = 0; j < L.length; j++) L[j] -= L2[j]; return L; };
  c.vars.forEach((v, i) => v.levels.forEach((_, l) => { const e = ES(M, EM(M, { [i]: l })); note("lmEst.est", relErr(e.est, w.means[i][l].m), `${at}: mean ${i}.${l}`); note("lmEst.se", relErr(e.se, w.means[i][l].se), `${at}: mean ${i}.${l}`); }));
  let k = 0; c.vars[0].levels.forEach((_, a) => c.vars[1].levels.forEach((_, b) => { const e = ES(M, EM(M, { 0: a, 1: b })), r = w.cells[k++]; note("lmEst.est", relErr(e.est, r.m), `${at}: cell ${a}.${b}`); note("lmEst.se", relErr(e.se, r.se), `${at}: cell ${a}.${b}`); }));
  w.pairs.forEach((q) => { const e = ES(M, dif({ [q.f]: q.a }, { [q.f]: q.b })); note("lmEst.est", Math.abs(e.est - q.diff) / (Math.abs(q.diff) + q.se), `${at}: difference ${q.f}: ${q.a} − ${q.b}`); note("lmEst.se", relErr(e.se, q.se), `${at}: difference ${q.f}`); });
  w.simple.forEach((q) => { const Ls = []; for (let a = 1; a < c.vars[q.f].levels.length; a++) Ls.push(dif({ [q.f]: a, [q.g]: q.l }, { [q.f]: 0, [q.g]: q.l }));
    const r = WL(M, Ls); note("lmWaldL.F", relErr(r.F, q.F), `${at}: simple ${q.f} at ${q.g}.${q.l}`); note("lmWaldL.p", relErr(r.p, q.p), `${at}: simple ${q.f} at ${q.g}.${q.l}`); });
}
/* ---- repeated measures (STATS_SPEC 2.7): rmAnova against rational projections: sums of squares, F, ε, Mauchly's W and χ², p ---- */
for (const c of (fixtures.rm || { cases: [] }).cases) {
  const r = get("rmAnova")(...c.args), at = c.name; if (r.fail) { note("rmAnova.ss", Infinity, `${at}: ${r.fail}`); continue; }
  c.want.effs.forEach((w, i) => { const e = r.effs[i], k = `${at}: effect ${i}`;
    note("rmAnova.ss", Math.max(relErr(e.ss, w.ss), relErr(e.sse, w.sse), w.ssg ? relErr(e.ssg, w.ssg) : 0), k); note("rmAnova.F", Math.max(relErr(e.F, w.F), w.Fg != null ? relErr(e.Fg, w.Fg) : 0), k);
    note("rmAnova.eps", Math.max(relErr(e.gg, w.gg), relErr(e.hf, w.hf)), k);
    note("rmAnova.p", Math.max(relErr(e.p, w.p), relErr(e.pgg, w.pgg), relErr(e.phf, w.phf), w.pg != null ? relErr(e.pg, w.pg) : 0), k);
    if (w.W != null) { note("rmAnova.W", relErr(e.mau.W, w.W), k); note("rmAnova.x2", relErr(e.mau.x2, w.x2), k); note("rmAnova.p", relErr(e.mau.p, w.mp), `${k}: Mauchly`); } });
  const b = c.want.between; note("rmAnova.ss", relErr(r.between.sse, b.sse), `${at}: between`); if (b.Fg != null) { note("rmAnova.F", relErr(r.between.Fg, b.Fg), `${at}: between`); note("rmAnova.p", relErr(r.between.pg, b.pg), `${at}: between`); }
}
for (const c of (fixtures.range || { cases: [] }).cases) note(c.fn, relErr(get(c.fn)(...c.args), c.want), fmtA(c.args));

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
if (nistLRE.length) console.log(`  NIST ANOVA, digits right against the certified values (as many as the doubles the data parse to allow): ${nistLRE.join(", ")}`);
console.log(`\n${pass} passed, ${short} short of their target with a slice named, ${fail} failed`);
process.exit(fail ? 1 : 0);
