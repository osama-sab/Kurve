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
/* ---- power and sample size (STATS_SPEC 2.11): the noncentral tails relative; powers absolute; sizes exactly ---- */
for (const c of (fixtures.power || { cases: [] }).cases) {
  if (c.kind === "rel") { note(c.fn, relErr(get(c.fn)(...c.args), c.want), fmtA(c.args)); continue; }
  if (c.kind === "power") { const r = get("powerAt")(...c.args); note("powerAt", r ? Math.abs(r.pw - c.want) : Infinity, c.name); continue; }
  const r = get("powSize")(...c.args); const rn = r.n1 != null ? r.n1 : r.n; note("powSize.n", r.fail ? Infinity : rn === c.want.n ? 0 : Math.abs(rn - c.want.n), c.name); if (!r.fail) note("powerAt", Math.abs(r.pw - c.want.pw), c.name);
}
/* ---- ROC curves (STATS_SPEC 2.12): the area, DeLong's SE and interval, Youden's index, two scores compared, against exact pairs ---- */
for (const c of (fixtures.roc || { cases: [] }).cases) {
  const r = get("rocTest")(...c.args), w = c.want, at = c.name; if (r.fail) { note("rocTest.auc", Infinity, `${at}: ${r.fail}`); continue; }
  note("rocTest.auc", relErr(r.auc, w.auc), at); if (w.se != null) { note("rocTest.se", relErr(r.se, w.se), at); note("rocTest.ci", Math.max(relErr(r.ci[0], w.lo, 1e-300), relErr(r.ci[1], w.hi)), at); }
  note("rocTest.youden", Math.max(relErr(r.youden.c, w.c), relErr(r.youden.sens, w.sens), relErr(r.youden.spec, w.spec), relErr(r.youden.J, w.J)), at);
  if (c.pair) { const sg = c.args[2].dir === "low" ? -1 : 1, K = get("rocCore"), A = K(c.args[0].map((v) => sg * v), c.args[1].map((v) => sg * v)), B = K(c.pair[0].map((v) => sg * v), c.pair[1].map((v) => sg * v)), t = get("rocCompare")(A, B);
    note("rocCompare", Math.max(relErr(t.diff, w.diff), relErr(t.se, w.dse), relErr(t.z, w.z), relErr(t.p, w.p)), at); }
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

/* ---- worksheet formulas (SHEET_SPEC 3.1): fxCalc against NumPy, exact sums and exact SDs; a missing value where the
   reference has a number (or the other way), or a column of another length, is an infinite error ---- */
if (fixtures.fx) {
  const f = get("fxCalc");
  for (const c of fixtures.fx.cases) {
    let got; try { got = f(...c.args); } catch (e) { note("fxCalc", Infinity, `${c.name}: ${e.message}`); continue; }
    if (got.length !== c.want.length) { note("fxCalc", Infinity, `${c.name}: ${got.length} rows, the reference ${c.want.length}`); continue; }
    let e = 0;
    c.want.forEach((w, i) => { const g = got[i]; if (w == null || g == null) { if (w != null || g != null) e = Infinity; return; }
      const d = Math.abs(g - w); e = Math.max(e, d <= c.floor ? 0 : d / Math.max(Math.abs(w), c.floor)); });
    note("fxCalc", e, c.name);
  }
}

/* ---- filters (SHEET_SPEC 3.3): the rows each condition keeps, against pandas; any row kept or dropped
   differently is an error of 1 ---- */
if (fixtures.filt) {
  const f = get("filtList");
  for (const c of fixtures.filt.cases) {
    let got; try { got = f(...c.args); } catch (e) { note("filtList", Infinity, `${c.name}: ${e.message}`); continue; }
    note("filtList", JSON.stringify(got) === JSON.stringify(c.want) ? 0 : 1, c.name);
  }
}

/* ---- reshaping (SHEET_SPEC 3.5): every column of each result against pandas, by name; a number to its
   relative error, a text or an empty cell exactly (a difference there an error of 1) ---- */
if (fixtures.reshape) {
  const f = get("anaRunKind");
  for (const c of fixtures.reshape.cases) {
    let r; try { r = f(...c.args); } catch (e) { note("reshape", Infinity, `${c.name}: ${e.message}`); continue; }
    if (!r || r.fail) { note("reshape", Infinity, `${c.name}: ${r && r.fail}`); continue; }
    const cols = r.tables[0].cols; let e = 0;
    if (cols.length !== c.want.length) e = 1;
    c.want.forEach(([name, want], j) => { const got = cols[j]; if (!got || got.name !== name) { e = Math.max(e, 1); return; }
      const g = got.vals.slice(); while (g.length > want.length && g[g.length - 1] == null) g.pop(); const w = want.slice(); while (w.length > g.length && w[w.length - 1] == null) w.pop();
      if (g.length !== w.length) { e = Math.max(e, 1); return; }
      w.forEach((wv, i) => { const gv = g[i]; if (wv == null || gv == null || typeof wv === "string" || typeof gv === "string") { if (wv !== gv && !(wv == null && gv == null)) e = Math.max(e, 1); return; }
        e = Math.max(e, relErr(gv, wv, 1e-300)); }); });
    note("reshape", e, c.name);
  }
}

/* ---- matrices (SHEET_SPEC 3.6): NumPy's transpose, flips, rot90, slicing and arithmetic exactly,
   SciPy's bilinear resampling to its error over the matrix's largest value, PIL's grey exactly; the
   size, the X and Y where given, the check code's text; a missing cell where the other has a number,
   or the other way round, an error of 1 ---- */
if (fixtures.mat) {
  const XY = get("matXY");
  const same = (g, w, scale) => { if (!g || g.length !== w.length) return 1; let e = 0;
    w.forEach((wv, i) => { const gv = g[i]; if (wv == null || gv == null) { if (!(wv == null && gv == null)) e = 1; return; }
      e = Math.max(e, scale ? Math.abs(gv - wv) / scale : gv === wv ? 0 : relErr(gv, wv, 1e-300)); }); return e; };
  for (const c of fixtures.mat.cases) {
    let r; try { r = get(c.fn)(...c.args); } catch (e) { note(c.fn, Infinity, `${c.name}: ${e.message}`); continue; }
    if (r && r.fail) { note(c.fn, Infinity, `${c.name}: ${r.fail}`); continue; }
    const w = c.want; let e = 0;
    if (typeof w === "string") e = r === w ? 0 : 1;
    else if (w.cols) { e = r.cols.length === w.cols.length ? Math.max(0, ...w.cols.map((col, k) => same(Array.from(r.cols[k]), col))) : 1; }
    else {
      if (r.nx !== w.nx || r.ny !== w.ny) e = 1;
      const scale = c.fn === "matResample" ? w.z.reduce((m, v) => (v == null ? m : Math.max(m, Math.abs(v))), 0) || 1 : 0;
      e = Math.max(e, same(r.z, w.z, scale));
      if (w.X || w.Y) { const q = XY(r); if (w.X) e = Math.max(e, same(q.X, w.X)); if (w.Y) e = Math.max(e, same(q.Y, w.Y)); }
    }
    note(c.fn, e, c.name);
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

/* ---- Polynomials by QR (FIT2_SPEC 4.1) ----
   NIST's polynomial sets through polyLsq, the curve fit's straight line and polynomials: each coefficient, its standard
   deviation and the residual SD against the certified values (R² too, but for NoInt's, which NIST takes about 0); then the
   least-squares solution of the doubles given, exactly (fixtures/poly.json): the fitted values, the sums, the coefficients about
   Kurve's centre and their errors, and those in powers of x within their own conditioning. */
const nistRead = (name) => { const txt = readFileSync(join(here, "ref", "nist", name + ".dat"), "utf8").split(/\r?\n/);
  const k = txt.map((l) => l.trim().startsWith("Data:")).lastIndexOf(true);
  return { txt, rows: txt.slice(k + 1).filter((l) => l.trim()).map((l) => l.trim().split(/\s+/).map(Number)) }; };
{
  const lre = [];
  for (const [name, deg, noint] of [["Norris", 1], ["Pontius", 2], ["Filip", 10], ["Wampler1", 5], ["Wampler2", 5], ["Wampler3", 5], ["Wampler4", 5], ["Wampler5", 5], ["NoInt1", 1, 1], ["NoInt2", 1, 1]]) {
    const { txt, rows } = nistRead(name), Y = rows.map((r) => r[0]), X = rows.map((r) => r[1]), cert = [];
    for (const l of txt) { const m = /^\s*B(\d+)\s+(\S+)\s+(\S+)/.exec(l); if (m) cert[+m[1]] = [+m[2], +m[3]]; }
    const rsd = +txt.map((l) => /^\s*(?:Residual\s+)?Standard Deviation\s+(\S+)\s*$/.exec(l)).find(Boolean)[1];
    const r2 = +txt.find((l) => /R-Squared/.test(l)).trim().split(/\s+/).pop();
    const R = get("polyLsq")(X, Y, null, deg, noint ? { fixed: [true, false], p0: [0, 0] } : {});
    if (R.error) { note("nist.poly", Infinity, name + ": " + R.error); continue; }
    const big = Math.max(...cert.filter(Boolean).map((c) => Math.abs(c[0]))); let worstB = 0;
    cert.forEach((c, i) => { if (!c) return; const j = noint ? 1 : i, e = relErr(R.params[j], c[0]); worstB = Math.max(worstB, e); note("nist.poly", e, name + " B" + i);
      note("nist.poly.sd", c[1] === 0 ? Math.abs(R.errors[j]) / big : relErr(R.errors[j], c[1]), name + " sd B" + i); });
    note("nist.poly.sd", rsd === 0 ? Math.sqrt(R.stats.redChi2) / big : relErr(Math.sqrt(R.stats.redChi2), rsd), name + " residual SD");
    if (!noint) note("nist.poly.R2", relErr(R.stats.R2, r2), name + " R²");
    lre.push(name + " " + (worstB === 0 ? "15+" : Math.min(15, -Math.log10(worstB)).toFixed(1)));
  }
  console.log("  NIST's polynomials through polyLsq, digits right in the worst coefficient: " + lre.join(", "));
  for (const c of fixtures.poly.cases) {
    const [X, Y, W, k, o] = c.args, w = c.want, R = get("polyLsq")(X, Y, W, k, o);
    if (R.error) { note("polyLsq.fit", Infinity, c.name + ": " + R.error); continue; }
    if (R.poly.c !== w.c || R.poly.s !== w.s) note("polyLsq.fit", Infinity, c.name + ": centred elsewhere");
    const ys = Math.max(...w.fit) - Math.min(...w.fit) || 1, bs = Math.max(...w.b.map(Math.abs)) || 1;
    note("polyLsq.fit", Math.max(...X.map((x, i) => Math.abs(get("polyEval")(R.poly, x) - w.fit[i]) / ys)), c.name);
    note("polyLsq.fit", relErr(R.stats.rss, w.rss), c.name + " RSS"); note("polyLsq.fit", relErr(R.stats.chi2, w.chi2), c.name + " χ²");
    note("polyLsq.b", Math.max(...w.b.map((v, q) => Math.abs(R.poly.b[q] - v) / bs)), c.name);
    note("polyLsq.b", Math.max(...w.seb.map((v, q) => relErr(Math.sqrt(R.poly.V[q][q]), v))), c.name + " errors");
    note("polyLsq.params", Math.max(...w.params.map((v, j) => o.fixed[j] ? 0 : relErr(R.params[j], v) / w.cond[j])), c.name);
    note("polyLsq.errors", Math.max(...w.errors.map((v, j) => o.fixed[j] ? 0 : relErr(R.errors[j], v))), c.name);
    // the streamed path, which a design past POLY_DD values takes: in doubles, from R alone
    const G = get("polyLsq")(X, Y, W, k, Object.assign({}, o, { stream: true }));
    if (G.error) { note("polyLsq.stream", Infinity, c.name + ": " + G.error); continue; }
    note("polyLsq.stream", Math.max(...X.map((x, i) => Math.abs(get("polyEval")(G.poly, x) - w.fit[i]) / ys)), c.name);
    note("polyLsq.stream", Math.max(relErr(G.stats.rss, w.rss), relErr(G.stats.chi2, w.chi2)), c.name + " sums");
    note("polyLsq.stream", Math.max(...w.seb.map((v, q) => relErr(Math.sqrt(G.poly.V[q][q]), v))), c.name + " errors");
  }
}

/* ---- Multiple regression (FIT2_SPEC 4.2): statsmodels' WLS, its variance inflation factors, NumPy's condition number, the
   influence of each row (OLSInfluence on the whitened problem) and get_prediction's limits; best subsets against every subset
   enumerated by lstsq ---- */
{
  for (const c of fixtures.mreg.cases) {
    const w = c.want;
    if (c.fn === "bestSubsets") { const R = get("bestSubsets")(...c.args);
      if (R.fail || R.rows.length !== w.length) { note("bestSubsets", Infinity, c.name + ": " + (R.fail || `${R.rows.length} rows, not ${w.length}`)); continue; }
      R.rows.forEach((r, i) => { const q = w[i]; if (r.cols.join() !== q.cols.join()) note("bestSubsets", Infinity, `${c.name} row ${i}: ${r.cols} for ${q.cols}`);
        for (const k of ["rss", "r2", "ar2", "cp", "aic", "bic"]) note("bestSubsets", relErr(r[k], q[k], 1e-12), `${c.name} row ${i} ${k}`); });
      continue; }
    const M = get("linModel")(c.vars, c.y, c.spec); if (M.fail) { note("mreg.b", Infinity, c.name + ": " + M.fail); continue; }
    w.b.forEach((v, j) => { note("mreg.b", relErr(M.b[j], v, 1e-14 * Math.max(...w.b.map(Math.abs))), `${c.name} b${j}`); note("mreg.b", relErr(M.se[j], w.se[j]), `${c.name} se${j}`); });
    note("mreg.b", relErr(M.s, w.s), c.name + " s"); note("mreg.b", relErr(M.r2, w.r2), c.name + " R²");
    w.vif.forEach((v, j) => { if (v != null) note("mreg.vif", relErr(M.vif[j], v), `${c.name} VIF ${j}`); });
    note("mreg.cond", relErr(M.cond, w.cond), c.name + " condition number");
    const D = M.diag, sc = (a) => Math.max(...a.map((v) => Math.abs(v)));
    // over each quantity's largest: a residual near 0 is the reference's own rounding of y − ŷ, relatively
    for (const k of ["fit", "res", "std", "stud", "del", "h", "cook", "dffits"]) note("mreg.diag", Math.max(...w.diag[k].map((v, i) => Math.abs(D[k][i] - v))) / sc(w.diag[k]), `${c.name} ${k}`);
    if (c.new) { const P = get("lmPredict")(M, c.new.codes, c.new.w);
      w.pred.forEach((q, i) => { for (const k of ["fit", "se", "lo", "hi", "plo", "phi"]) note("mreg.pred", P[i] ? relErr(P[i][k], q[k], 1e-14 * Math.abs(q.fit)) : Infinity, `${c.name} new row ${i} ${k}`); }); }
  }
}

/* ---- Comparing fits (FIT2_SPEC 4.3): each setting's χ² and parameters against SciPy's curve_fit (and statsmodels' OLS for
   polynomials); AIC, AICc, BIC, ΔAICc and Akaike's weights in closed form; the nested F tests against compare_f_test; a
   comparison of data sets against curve_fit on the columns laid end to end ---- */
{
  for (const c of fixtures.cmp.cases) {
    const w = c.want;
    if (c.fn === "fitByDesc") { const r = get("fitByDesc")(...c.args); if (r.fail) { note("cmp.fit", Infinity, c.name + ": " + r.fail); continue; }
      const poly = !c.args[0].fn; note(poly ? "cmp.fit.poly" : "cmp.fit", relErr(r.chi2, w.chi2), c.name + " χ²");
      w.params.forEach((v, i) => note(poly ? "cmp.fit.poly" : "cmp.fit.params", relErr(r.res.params[i], v, 1e-12 * Math.max(...w.params.map(Math.abs))), `${c.name} p${i}`)); continue; }
    if (c.fn === "fitCompare") { const r = get("fitCompare")(...c.args);
      r.rows.forEach((q, i) => { for (const k of ["aic", "aicc", "bic", "w"]) note("fitCompare", relErr(q[k], w.rows[i][k], 1e-13), `${c.name} ${q.name} ${k}`); note("fitCompare", Math.abs(q.daicc - w.rows[i].daicc) / Math.max(1, Math.abs(w.rows[i].aicc)), `${c.name} ${q.name} ΔAICc`); });
      w.tests.forEach((t, i) => { const q = r.tests[i]; note("fitCompare", q && !q.fail ? Math.max(relErr(q.F, t.F), relErr(q.p, t.p), q.df1 === t.df1 && q.df2 === t.df2 ? 0 : 1) : Infinity, `${c.name} F test ${t.i}/${t.j}`); }); continue; }
    if (c.fn === "anaRunKind") { const r = get("anaRunKind")(...c.args); if (r.fail) { note("cmp.data", Infinity, c.name + ": " + r.fail); continue; }
      const t = Object.fromEntries(r.tables[0].cols.map((q) => [q.k, q.vals]));
      note("cmp.data", Math.max(relErr(t.chi2[0], w.chiSep), relErr(t.chi2[1], w.chiSh)), c.name + " χ²"); note("cmp.data", t.k[0] === w.kSep && t.k[1] === w.kSh ? 0 : Infinity, c.name + " parameters");
      note("cmp.data.F", Math.max(relErr(t.ftF[0], w.F), relErr(t.ftp[0], w.p)), c.name + " F and p"); }
  }
}

/* ---- More curve-fit models (FIT2_SPEC 4.6): each new model's function against the same formula in 30-digit mpmath, at five
   points across its typical range for two sets of values. A value near a zero of the function is compared with a thousandth
   of the largest the model takes in its cases. ---- */
{
  const M = get("MODELS"), by = {};
  fixtures.models.cases.forEach((c) => { const nm = c.fn.split(".")[1]; (by[nm] = by[nm] || []).push(c); });
  for (const [nm, cs] of Object.entries(by)) { const big = Math.max(...cs.map((c) => Math.abs(c.want)));
    let worst = 0, at = "";
    cs.forEach((c) => { const [x, p] = c.args, g = M[nm].f(x, p), e = Math.abs(g - c.want) / Math.max(Math.abs(c.want), 1e-3 * big, 1e-300); if (!(e <= worst)) { worst = e; at = `${nm} at x = ${x}`; } });
    note("models", worst, at); }
}

/* ---- Robust fits (FIT2_SPEC 4.8): robustFit (through robustPoly) on lines and polynomials against statsmodels' RLM at its fixed point: the
   parameters, their H1 errors, the scale and each point's weight ---- */
{
  for (const c of fixtures.robust.cases) {
    const [X, Y, k, kind] = c.args, w = c.want, R = get("robustPoly")(X, Y, k, kind);
    if (R.error) { note("robust", Infinity, c.name + ": " + R.error); continue; }
    w.params.forEach((v, j) => { note("robust", relErr(R.params[j], v, 1e-12 * Math.max(...w.params.map(Math.abs))), `${c.name} p${j}`); note("robust.se", relErr(R.errors[j], w.bse[j]), `${c.name} se${j}`); });
    note("robust", relErr(R.scale, w.scale), c.name + " scale"); note("robust", Math.max(...w.w.map((v, i) => Math.abs(R.w[i] - v))), c.name + " weights");
  }
}

/* ---- NIST's nonlinear sets: lmFit from both of NIST's starts, with the tolerance at 1e-15 (as Fit control can set it) ----
   Each parameter and its standard deviation against the certified values. From the first start four sets go to another
   minimum or none (as many fitters do): they are named, and a fifth would fail. Lanczos1's data are its function to 13
   digits, so its residuals are the rounding of the data: its standard deviations cannot be had in doubles, and are left out. */
{
  const E = Math.exp, PI = Math.PI;
  const NLS = {
  Misra1a: (x, b) => b[0] * (1 - E(-b[1] * x)),
  Chwirut2: (x, b) => E(-b[0] * x) / (b[1] + b[2] * x), Chwirut1: (x, b) => E(-b[0] * x) / (b[1] + b[2] * x),
  Lanczos3: (x, b) => b[0] * E(-b[1] * x) + b[2] * E(-b[3] * x) + b[4] * E(-b[5] * x),
  Gauss1: (x, b) => b[0] * E(-b[1] * x) + b[2] * E(-((x - b[3]) ** 2) / b[4] ** 2) + b[5] * E(-((x - b[6]) ** 2) / b[7] ** 2),
  Gauss2: (x, b) => b[0] * E(-b[1] * x) + b[2] * E(-((x - b[3]) ** 2) / b[4] ** 2) + b[5] * E(-((x - b[6]) ** 2) / b[7] ** 2),
  DanWood: (x, b) => b[0] * x ** b[1],
  Misra1b: (x, b) => b[0] * (1 - (1 + b[1] * x / 2) ** -2),
  Kirby2: (x, b) => (b[0] + b[1] * x + b[2] * x * x) / (1 + b[3] * x + b[4] * x * x),
  Hahn1: (x, b) => (b[0] + b[1] * x + b[2] * x ** 2 + b[3] * x ** 3) / (1 + b[4] * x + b[5] * x ** 2 + b[6] * x ** 3),
  Nelson: null,
  MGH17: (x, b) => b[0] + b[1] * E(-x * b[3]) + b[2] * E(-x * b[4]),
  Lanczos1: (x, b) => b[0] * E(-b[1] * x) + b[2] * E(-b[3] * x) + b[4] * E(-b[5] * x),
  Lanczos2: (x, b) => b[0] * E(-b[1] * x) + b[2] * E(-b[3] * x) + b[4] * E(-b[5] * x),
  Gauss3: (x, b) => b[0] * E(-b[1] * x) + b[2] * E(-((x - b[3]) ** 2) / b[4] ** 2) + b[5] * E(-((x - b[6]) ** 2) / b[7] ** 2),
  Misra1c: (x, b) => b[0] * (1 - (1 + 2 * b[1] * x) ** -0.5),
  Misra1d: (x, b) => b[0] * b[1] * x * (1 + b[1] * x) ** -1,
  Roszman1: (x, b) => b[0] - b[1] * x - Math.atan(b[2] / (x - b[3])) / PI,
  ENSO: (x, b) => b[0] + b[1] * Math.cos(2 * PI * x / 12) + b[2] * Math.sin(2 * PI * x / 12) + b[4] * Math.cos(2 * PI * x / b[3]) + b[5] * Math.sin(2 * PI * x / b[3]) + b[7] * Math.cos(2 * PI * x / b[6]) + b[8] * Math.sin(2 * PI * x / b[6]),
  MGH09: (x, b) => b[0] * (x * x + x * b[1]) / (x * x + x * b[2] + b[3]),
  Thurber: (x, b) => (b[0] + b[1] * x + b[2] * x ** 2 + b[3] * x ** 3) / (1 + b[4] * x + b[5] * x ** 2 + b[6] * x ** 3),
  BoxBOD: (x, b) => b[0] * (1 - E(-b[1] * x)),
  Rat42: (x, b) => b[0] / (1 + E(b[1] - b[2] * x)),
  MGH10: (x, b) => b[0] * E(b[1] / (x + b[2])),
  Eckerle4: (x, b) => (b[0] / b[1]) * E(-0.5 * ((x - b[2]) / b[1]) ** 2),
  Rat43: (x, b) => b[0] / (1 + E(b[1] - b[2] * x)) ** (1 / b[3]),
  Bennett5: (x, b) => b[0] * (b[1] + x) ** (-1 / b[2]),
};
  const HARD1 = new Set(["MGH17", "BoxBOD", "MGH10", "Eckerle4"]), miss1 = [], lreN = [];
  for (const name of Object.keys(NLS)) {
    const { txt, rows } = nistRead(name), P = [];
    for (const l of txt) { const m = /^\s*b(\d+)\s*=\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(l); if (m) P[+m[1] - 1] = [+m[2], +m[3], +m[4], +m[5]]; }
    let f = NLS[name], X = rows.map((r) => r[1]), Y = rows.map((r) => r[0]);
    if (name === "Nelson") { const x1 = rows.map((r) => r[1]), x2 = rows.map((r) => r[2]); X = rows.map((_, i) => i); Y = rows.map((r) => Math.log(r[0])); f = (i, b) => b[0] - b[1] * x1[i] * E(-b[2] * x2[i]); }
    let worstB = 0;
    for (const st of [0, 1]) {
      const p0 = P.map((q) => q[st]), r = get("lmFit")(f, X, Y, X.map(() => 1), p0, p0.map(() => false), { maxIter: 2000, tol: 1e-15 });
      const eb = r.error ? Infinity : Math.max(...P.map((q, i) => relErr(r.params[i], q[2]))), es = r.error ? Infinity : Math.max(...P.map((q, i) => relErr(r.errors[i], q[3])));
      if (st === 0 && HARD1.has(name) && !(eb <= TARGET["nist.nls"].tol)) { miss1.push(name); continue; }
      note("nist.nls", eb, name + " from start " + (st + 1)); if (name !== "Lanczos1") note("nist.nls.sd", es, name + " from start " + (st + 1));
      worstB = Math.max(worstB, eb);
    }
    lreN.push(name + " " + Math.min(15, -Math.log10(worstB)).toFixed(1));
  }
  console.log("  NIST's nonlinear sets through lmFit, digits right in the worst parameter: " + lreN.join(", "));
  if (miss1.length) console.log("  From NIST's first start, another minimum or none: " + miss1.join(", ") + " (each right from the second)");
  [...HARD1].filter((n) => !miss1.includes(n)).forEach((n) => console.log("  " + n + " is now right from NIST's first start too"));
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
