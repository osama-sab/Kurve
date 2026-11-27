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
/* ---- a matrix for ImageJ (QUDI_SPEC Q.2): the TIFF matTiff writes today is the one the fixture read (its SHA-256), and
   what was read from it, by Pillow and by ImageJ's reading written out from its source: every value as single
   precision exactly, each pixel's calibrated centre the cell's position (an error over the axis's span), the units, the
   display range, the tags; the refusals refused ---- */
if (fixtures.imagej) {
  const { createHash } = await import("node:crypto");
  const T = get("matTiff"), AX = get("matAxis"), R = get("matRange");
  const sameStr = (a, b) => (a == null ? "" : a) === (b == null ? "" : b);
  for (const c of fixtures.imagej.cases) {
    const t = T(c.m, c.o); if (t.fail) { refBad.push(`matTiff ${c.name}: ${t.fail}`); continue; }
    if (createHash("sha256").update(t.bytes).digest("hex") !== c.sha) { refBad.push(`matTiff ${c.name}: it writes other bytes than the fixture read; make it again (node tools/ref/ij_fixtures.mjs)`); continue; }
    const { nx, ny } = c.m, X = AX(c.m.x, nx), Y = AX(c.m.y, ny), xs = X[nx - 1] >= X[0] ? X : X.slice().reverse(), ys = Y[ny - 1] >= Y[0] ? Y.slice().reverse() : Y;
    // values: Pillow's, each the cell's value rounded to single precision, the columns by rising X and the rows down from the largest Y
    let ev = 0; const pz = c.pil.z.map((v) => (v === "Infinity" ? Infinity : v === "-Infinity" ? -Infinity : v));
    for (let py = 0; py < ny; py++) for (let px = 0; px < nx; px++) {
      const r = Y[ny - 1] >= Y[0] ? ny - 1 - py : py, cc = X[nx - 1] >= X[0] ? px : nx - 1 - px, v = c.m.z[r * nx + cc], w = v == null ? null : Math.fround(v), g = pz[py * nx + px];
      if (!(w === g || (w == null && g == null))) ev = 1; }
    note("matTiff.values", ev, c.name);
    // against the axis's largest size or its span: ImageJ keeps the origin in pixels and the pixel size, so a position far from 0 carries their roundings
    const span = (a) => Math.max(Math.abs(a[0]), Math.abs(a[a.length - 1]), Math.abs(a[a.length - 1] - a[0]), a.length > 1 ? 0 : 1);
    let ep = 0; xs.forEach((v, k) => { ep = Math.max(ep, Math.abs(c.ij.cx[k] - v) / span(xs)); }); ys.forEach((v, k) => { ep = Math.max(ep, Math.abs(c.ij.cy[k] - v) / span(ys)); });
    note("matTiff.pos", ep, c.name);
    const um = (u) => (u === "um" ? "\u00b5m" : u || "pixel"), o = c.o || {}, rg = R(c.m.z);
    const bad = [];
    if (c.pil.mode !== "F" || c.pil.w !== nx || c.pil.h !== ny || c.pil.format[0] !== 3 || c.pil.bits[0] !== 32 || c.pil.resunit !== 1) bad.push(`tags ${JSON.stringify([c.pil.mode, c.pil.w, c.pil.h, c.pil.format, c.pil.bits, c.pil.resunit])}`);
    if (c.ij.unit !== um(o.xunit) || c.ij.yunit !== um(o.yunit || o.xunit) || !sameStr(c.ij.vunit, o.zunit) || !sameStr(c.ij.name, o.name)) bad.push(`units ${JSON.stringify([c.ij.unit, c.ij.yunit, c.ij.vunit, c.ij.name])}`);
    if (rg.n && (c.ij.min !== rg.lo || c.ij.max !== rg.hi)) bad.push(`display range ${c.ij.min}, ${c.ij.max}`);
    if (!c.ij.inv) bad.push("not inverted");
    if (bad.length) refBad.push(`matTiff ${c.name}: ${bad.join("; ")}`);
  }
  for (const c of fixtures.imagej.refusals) { const t = T(c.m, c.o); if (!t || !t.fail) refBad.push(`matTiff ${c.name}: written, where it should be refused`); }
  /* ImageJ's Measure (QUDI_SPEC Q.3) on each image's TIFF, over each region: the selection's cells, the order statistics and the
     mode (ImageJ's 256 bins) exactly as ImageJ's arithmetic gives them, the area and bounding rectangle to its size, and the
     moments, centroid and centre of mass against the same definitions worked out exactly (ImageJ's own raw sums are said beside) */
  const MS = get("ijMeasure"); let ijw = { sd: 0, skew: 0, kurt: 0 };
  for (const c of fixtures.imagej.meas || []) {
    const t = T(c.m, c.o);
    if (t.fail || createHash("sha256").update(t.bytes).digest("hex") !== c.sha) { refBad.push(`ijMeasure ${c.name}: the TIFF is not the one the fixture measured; make it again (node tools/ref/ij_fixtures.mjs)`); continue; }
    c.regs.forEach((reg, k) => {
      const at = `${c.name}, ${reg.kind} ${k}`, w = c.res[k], r = MS(c.m, reg, { single: true });
      if (w.fail) { if (!r.fail) refBad.push(`ijMeasure ${at}: measured where ImageJ has no value`); return; }
      if (r.fail) { refBad.push(`ijMeasure ${at}: ${r.fail}`); return; }
      const P = w.port, E = w.exact, roi = [r.region.x0, r.region.y0, r.region.w, r.region.h];
      note("ijMeasure.cells", r.n === P.n && r.cells === P.cells && roi.join() === P.roi.join() ? 0 : 1, `${at}: ${r.n}/${r.cells} [${roi}] against ${P.n}/${P.cells} [${P.roi}]`);
      let eo = 0; for (const q of ["min", "max", "mode", "median"]) if (r[q] !== P[q]) eo = Math.max(eo, relErr(r[q], P[q], 1e-300) || 1);
      if (r.hist.counts.join() !== P.hist.join()) eo = Math.max(eo, 1);
      note("ijMeasure.order", eo, at);
      const sz = Math.max(Math.abs(P.bx), Math.abs(P.by), Math.abs(P.w), Math.abs(P.h));
      let eg = relErr(r.area, P.area); for (const q of ["bx", "by", "w", "h"]) eg = Math.max(eg, Math.abs(r[q] - P[q]) / sz);
      note("ijMeasure.geo", eg, at);
      const xs = Math.max(...[E.x, E.y].map(Math.abs), sz); let es = 0;
      for (const q of ["mean", "sd", "raw"]) es = Math.max(es, relErr(r[q], E[q], 1e-300));
      for (const q of ["skew", "kurt"]) es = Math.max(es, E[q] == null ? (r[q] == null ? 0 : 1) : Math.abs(r[q] - E[q]) / Math.max(1, Math.abs(E[q])));
      for (const q of ["x", "y", "xm", "ym"]) es = Math.max(es, E[q] == null ? (r[q] == null ? 0 : 1) : Math.abs(r[q] - E[q]) / xs);
      note("ijMeasure.stats", es, at);
      // ImageJ's own arithmetic against the same exact answer: the port is checked where ImageJ is accurate, and its raw sums said
      let ep = relErr(P.mean, E.mean, 1e-300); for (const q of ["x", "y"]) ep = Math.max(ep, Math.abs(P[q] - E[q]) / xs);
      note("ijPort.mean", ep, at);
      if (E.sd > 0) { ijw.sd = Math.max(ijw.sd, relErr(P.sd, E.sd)); ijw.skew = Math.max(ijw.skew, Math.abs(P.skew - E.skew) / Math.max(1, Math.abs(E.skew))); ijw.kurt = Math.max(ijw.kurt, Math.abs(P.kurt - E.kurt) / Math.max(1, Math.abs(E.kurt))); }
    });
  }
  for (const c of fixtures.imagej.measFail || []) { const r = MS(c.m, c.reg); if (!r || !r.fail) refBad.push(`ijMeasure ${c.name}: measured, where it should be refused`); }
  /* Find Maxima and Plot Profile (QUDI_SPEC Q.4): every maximum in ImageJ's order, as ImageJ's MaximumFinder gives it in single precision
     (but a pixel ImageJ lists at an empty cell, NaN, which Kurve does not call a maximum), and each line's samples and distances */
  const MX = get("ijMaxima"), PR = get("ijProfile");
  for (const c of fixtures.imagej.peaks || []) {
    const t = T(c.m, c.o);
    if (t.fail || createHash("sha256").update(t.bytes).digest("hex") !== c.sha) { refBad.push(`ijMaxima ${c.name}: the TIFF is not the one the fixture read; make it again`); continue; }
    c.maxima.forEach((q, k) => { const r = MX(c.m, Object.assign({ single: true }, q)), W = c.m.nx, want = c.pmax[k].filter(([x, y]) => !c.nan[y * W + x]);
      const got = r.fail ? null : r.pts.map((p) => [p.px, p.py]);
      note("ijMaxima.list", got && got.join(";") === want.join(";") ? 0 : 1, `${c.name}, ${JSON.stringify(q)}: ${got ? got.length : r.fail} against ${want.length}${got && got.join(";") !== want.join(";") ? ` (${JSON.stringify(got.slice(0, 6))} / ${JSON.stringify(want.slice(0, 6))})` : ""}`); });
    c.profiles.forEach((q, k) => { const r = PR(c.m, Object.assign({ single: true }, q)), w = c.pprof[k];
      if (r.fail) { refBad.push(`ijProfile ${c.name} ${k}: ${r.fail}`); return; }
      let e = r.n === w.n ? 0 : 1; const sc = Math.max(1, ...w.v.filter((v) => v != null).map(Math.abs));
      for (let i = 0; i < Math.min(r.n, w.n); i++) { const a = r.v[i], b = w.v[i]; if (b == null || Number.isNaN(a)) { if (!(b == null && Number.isNaN(a))) e = 1; continue; } e = Math.max(e, Math.abs(a - b) / sc, Math.abs(r.d[i] - w.d[i]) / Math.max(1, Math.abs(w.d[w.n - 1]))); }
      note("ijProfile", e, `${c.name}, line ${k}: ${r.n} samples against ${w.n}`); });
  }
  if (fixtures.imagej.meas) console.log(`  ImageJ's own raw sums against exact arithmetic (said, not judged): SD ${ijw.sd.toExponential(1)}, skewness ${ijw.skew.toExponential(1)}, kurtosis ${ijw.kurt.toExponential(1)}`);
}

/* ---- Spots (QUDI_SPEC Q.5): SciPy's least_squares on Kurve's spot model, the seeds from ImageJ's port, every definition
   (windows, groups, Poisson's maximum likelihood, splitting) worked out again in tools/ref/spot_fixtures.py ---- */
if (fixtures.spots) {
  const SF = get("spotFit"), MA = get("matAxis");
  for (const c of fixtures.spots.cases) {
    const m = c.m, w = c.want, r = SF({ nx: m.nx, ny: m.ny, xs: MA(m.x, m.nx), ys: MA(m.y, m.ny), z: m.z }, c.o);
    if (r.fail) { refBad.push(`spotFit ${c.name}: ${r.fail}`); continue; }
    const same = r.seeds === w.seeds && r.spots.length === w.spots.length && r.groups.map((g) => g.split).join() === w.groups.map((g) => g.split).join() && Math.abs(r.R - w.R) <= 1e-12 * w.R;
    note("spotFit.count", same ? 0 : 1, `${c.name}: ${r.seeds} seeds, ${r.spots.length} spots, splits ${r.groups.map((g) => g.split).join("")} against ${w.seeds}, ${w.spots.length}, ${w.groups.map((g) => g.split).join("")}`);
    if (!same) continue;
    let ev = 0, ee = 0, at = "", ae = "";
    r.spots.forEach((s, i) => { const q = w.spots[i];
      // against the value's standard error; a noise-free case (its errors at the rounding) against the value, and its truth
      for (const k of ["x", "y", "w", "A", "B", "I", "w1", "w2", "th"]) { if (q[k] == null) continue; const d = Math.abs(s[k] - q[k]) / (c.exact ? Math.abs(q[k]) + 1 : (q["s" + k] || 0) + 1e-12 * (Math.abs(q[k]) + 1)); if (!(d <= ev)) { ev = d; at = `spot ${i + 1} ${k}`; } }
      if (c.exact) { const [x0, y0, A0, w0] = c.exact[i]; note("spotFit.truth", Math.max(Math.abs(s.x - x0), Math.abs(s.y - y0), Math.abs(s.w - w0) / w0, Math.abs(s.A - A0) / A0, Math.abs(s.B - 100) / 100), `${c.name}, spot ${i + 1}`); }
      for (const k of ["sx", "sy", "sw", "sA", "sB", "sI", "sw1", "sw2", "sth"]) { if (q[k] == null || c.exact) continue; const d = s[k] == null ? Infinity : Math.abs(s[k] - q[k]) / Math.max(q[k], 1e-300); if (!(d <= ee)) { ee = d; ae = `spot ${i + 1} ${k}`; } } });
    note("spotFit.values", ev, `${c.name}, ${at} (against its standard error)`); note("spotFit.errors", ee, `${c.name}, ${ae}`);
  }
  /* intensities with their noise (Q.7): the sums against exact fractions, the errors against fsum */
  const KM = get("kMeasure"), s0 = fixtures.spots.cases[0].m;
  for (const c of fixtures.spots.kmeasure || []) {
    const r = KM({ nx: s0.nx, ny: s0.ny, x: s0.x, y: s0.y, xs: MA(s0.x, s0.nx), ys: MA(s0.y, s0.ny), z: s0.z }, c.reg, c.o), w = c.want;
    if (r.fail) { refBad.push(`kMeasure ${c.name}: ${r.fail}`); continue; }
    note("kMeasure.cells", r.n === w.n && r.nb === w.nb ? 0 : 1, `${c.name}: ${r.n}, ${r.nb} against ${w.n}, ${w.nb}`);
    let e = 0, at = ""; for (const k of ["sum", "mean", "bg", "net", "ssum", "smean", "sbg", "snet"]) { const a = r[k], b = w[k];
      const d = b == null ? (a == null ? 0 : Infinity) : a == null ? Infinity : Math.abs(a - b) / Math.max(Math.abs(b), 1e-300); if (!(d <= e)) { e = d; at = k; } }
    note("kMeasure.values", e, `${c.name}, ${at}`);
  }
}

/* ---- A profile across a width, fitted (QUDI_SPEC Q.6): each sample's mean across and its error, and the fit by SciPy's curve_fit
   with the samples' covariance, worked out again in tools/ref/profile_fixtures.py ---- */
if (fixtures.profile) {
  const KP = get("kProfile"), MA = get("matAxis");
  for (const c of fixtures.profile.cases) {
    const m = c.m, w = c.want, r = KP({ nx: m.nx, ny: m.ny, x: m.x, y: m.y, xs: MA(m.x, m.nx), ys: MA(m.y, m.ny), z: m.z }, c.o);
    if (r.fail || r.fitFail) { refBad.push(`kProfile ${c.name}: ${r.fail || r.fitFail}`); continue; }
    if (r.n !== w.n || r.m !== w.m) { note("kProfile.samples", 1, `${c.name}: ${r.n} samples, ${r.m} across, against ${w.n}, ${w.m}`); continue; }
    const sc = Math.max(1, ...w.kv.filter((v) => v != null).map(Math.abs)); let e = 0, at = "";
    for (let i = 0; i < w.n; i++) for (const [a, b, k] of [[r.kv[i], w.kv[i], "value"], [r.ksv[i], w.ksv[i], "error"]]) {
      const d = b == null ? (Number.isNaN(a) ? 0 : Infinity) : Number.isNaN(a) ? Infinity : Math.abs(a - b) / (k === "value" ? sc : Math.max(b, 1e-300)); if (!(d <= e)) { e = d; at = `sample ${i + 1}'s ${k}`; } }
    note("kProfile.samples", e, `${c.name}, ${at}`);
    if (!w.fit) continue;
    const F = r.fit, keys = ["d0", "A", "B", "w"]; let ev = 0, ee = 0, av = "", ae = "";
    keys.forEach((k, j) => { const dv = Math.abs(F.p[k] - w.fit.p[j]) / (c.exact ? Math.abs(w.fit.p[j]) + 1 : w.fit.e[j] + 1e-12 * (Math.abs(w.fit.p[j]) + 1)); if (!(dv <= ev)) { ev = dv; av = k; }
      if (!c.exact) { const de = Math.abs(F.e[k] - w.fit.e[j]) / w.fit.e[j]; if (!(de <= ee)) { ee = de; ae = k; } } });
    note("kProfile.values", ev, `${c.name}, ${av} (against its standard error)`); if (!c.exact) note("kProfile.errors", ee, `${c.name}, ${ae}`);
    if (c.exact) note("kProfile.truth", Math.max(...keys.map((k, j) => Math.abs(F.p[k] - c.exact[j]) / Math.abs(c.exact[j]))), `${c.name}`);
  }
}

/* ---- Charts of categories and pies (PLOT2_SPEC 7.1): catSummary and pieSlices against exact rationals, NumPy and SciPy
   (tools/ref/plot2_fixtures.py). The mean, SD, SE and t interval relative to the values' scale; the order statistics exactly; a
   pie's shares and the ends of its slices relative to a turn. ---- */
if (fixtures["plot2-cats"]) {
  const CS = get("catSummary"), PS = get("pieSlices");
  for (const c of fixtures["plot2-cats"].cases) { const sc = Math.max(...c.vals.map(Math.abs)) || 1, lab = `${c.name} at ${c.conf}`;
    const m = CS(c.vals, { stat: "mean", err: "ci", conf: c.conf }), sd = CS(c.vals, { stat: "mean", err: "sd" }), md = CS(c.vals, { stat: "median", err: "iqr" }), mc = CS(c.vals, { stat: "median", err: "ci", conf: c.conf });
    let e = Math.abs(m.v - c.mean) / sc;
    if (c.n > 1) e = Math.max(e, Math.abs(m.sd - c.sd) / c.sd, Math.abs(m.se - c.se) / c.se, Math.abs(m.lo - c.ci[0]) / sc, Math.abs(m.hi - c.ci[1]) / sc, Math.abs(sd.hi - (c.mean + c.sd)) / sc);
    else e = Math.max(e, m.lo === null && m.hi === null ? 0 : Infinity);
    e = Math.max(e, Math.abs(CS(c.vals, { stat: "sum" }).v - c.sum) / (sc * c.n), CS(c.vals, { stat: "count" }).v === c.n ? 0 : Infinity);
    note("catSummary.values", e, lab);
    let o = Math.max(Math.abs(md.v - c.median), Math.abs(md.lo - c.q1), Math.abs(md.hi - c.q3)) / sc;
    if (c.mci) o = Math.max(o, mc.lo === c.mci[0] && mc.hi === c.mci[1] ? 0 : Infinity, Math.abs(mc.level - c.mlevel)); else o = Math.max(o, mc.lo === null && mc.hi === null ? 0 : Infinity);
    note("catSummary.order", o, lab); }
  for (const c of fixtures["plot2-cats"].pies) { const r = PS(c.vals.map((v, i) => ({ i, v })), c.sort); let e = r.left === c.left && r.slices.length === c.slices.length ? 0 : Infinity, at = c.name;
    r.slices.forEach((z, k) => { const w = c.slices[k]; if (!w || z.i !== w.i) { e = Infinity; at = `${c.name}: slice ${k} is row ${z.i}`; return; }
      const d = Math.max(Math.abs(z.share - w.share) / w.share, Math.abs(z.a - w.a), Math.abs(z.b - w.b)); if (d > e) { e = d; at = `${c.name}, slice ${k}`; } });
    note("pieSlices", e, at); }
}

/* ---- Statistical charts (PLOT2_SPEC 7.2): control-chart constants against 20-digit integrals and charts against Montgomery's formulas
   written again in NumPy; Pareto against pandas; Bland–Altman against NumPy and SciPy; meta-analysis against statsmodels; Q–Q plots
   against SciPy's fits and quantiles (tools/ref/plot2_stats.py). ---- */
if (fixtures["plot2-stats"]) {
  const F = fixtures["plot2-stats"], CC = get("ctrlConst"), CH = get("ctrlChart"), PA = get("paretoOf"), BA = get("blandAltman"), MA = get("metaAnalysis"), QQ = get("qqData");
  for (const k of F.const) { const c = CC(k.n); note("ctrlConst", Math.max(...["d2", "d3", "c4"].map(q => Math.abs(c[q] - k[q]) / k[q])), `n = ${k.n}`); }
  const rel = (a, b, sc) => a == null || b == null ? (a == b ? 0 : Infinity) : Math.abs(a - b) / (sc || Math.max(Math.abs(b), 1e-300));
  for (const c of F.charts) { const r = CH(c.o), w = c.want; if (r.fail) { refBad.push(`ctrlChart ${c.name}: ${r.fail}`); continue; }
    const sc = Math.max(...r.A.v.map(Math.abs)) || 1; let e = r.k === w.k ? 0 : Infinity, at = c.name;
    const cmp = (got, want, lab) => { const d = rel(got, want, sc); if (d > e) { e = d; at = `${c.name}: ${lab}`; } };
    if (w.v) w.v.forEach((v, i) => cmp(r.A.v[i], v, `point ${i + 1}`));
    if (w.cl != null) cmp(r.A.cl[0], w.cl, "centre"); if (w.ucl != null) cmp(r.A.ucl[0], w.ucl, "upper limit"); if (w.lcl != null) cmp(r.A.lcl[0], w.lcl, "lower limit");
    if (w.ucla != null) cmp(r.A.ucl[0], w.ucla, "upper limit as x̄̄ + A₂R̄");
    if (w.uclv) w.uclv.forEach((v, i) => cmp(r.A.ucl[i], v, `upper limit ${i + 1}`)); if (w.lclv) w.lclv.forEach((v, i) => cmp(r.A.lcl[i], v, `lower limit ${i + 1}`));
    if (w.sigma != null) cmp(r.sigma, w.sigma, "σ̂");
    if (w.B) { const B = r.B, sb = Math.max(...B.v.filter(v => v != null).map(Math.abs)) || 1; if (w.B.v) w.B.v.forEach((v, i) => { const d = rel(B.v[i], v, sb); if (d > e) { e = d; at = `${c.name}: ${B.name} ${i + 1}`; } });
      for (const [k, lab] of [["cl", "centre"], ["ucl", "upper"], ["lcl", "lower"]]) { if (w.B[k] != null) { const d = rel(B[k][0], w.B[k], sb); if (d > e) { e = d; at = `${c.name}: ${B.name} ${lab}`; } } if (w.B[k + "v"]) w.B[k + "v"].forEach((v, i) => { const d = rel(B[k][i], v, sb); if (d > e) { e = d; at = `${c.name}: ${B.name} ${lab} ${i + 1}`; } }); } }
    note("ctrlChart.limits", e, at);
    const m = JSON.stringify(r.marks), mw = JSON.stringify(w.marks); note("ctrlChart.rules", m === mw ? 0 : Infinity, `${c.name}: ${m.slice(0, 120)} against ${mw.slice(0, 120)}`); }
  for (const c of F.pareto) { const r = PA(c.keys, c.vals); let e = r.rows.length === c.rows.length ? 0 : Infinity, at = c.name;
    r.rows.forEach((z, i) => { const w = c.rows[i]; if (!w || z.key !== w.key) { e = Infinity; at = `${c.name}: row ${i} is ${z.key}`; return; } const d = Math.max(rel(z.v, w.v), rel(z.pct, w.pct), rel(z.cum, w.cum)); if (d > e) { e = d; at = `${c.name}, ${z.key}`; } });
    note("paretoOf", e, at); }
  for (const c of F.bland) { const r = BA(c.a, c.b, { mode: c.mode, conf: c.conf }), w = c.want, sc = Math.max(...w.d.map(Math.abs)); let e = r.n === w.n ? 0 : Infinity;
    w.d.forEach((v, i) => { e = Math.max(e, rel(r.d[i], v, sc), rel(r.m[i], w.m[i])); });
    for (const [k, i] of [["bias"], ["sd"], ["lo"], ["hi"]]) e = Math.max(e, rel(r[k], w[k], sc));
    for (const k of ["biasCI", "loCI", "hiCI"]) e = Math.max(e, rel(r[k][0], w[k][0], sc), rel(r[k][1], w[k][1], sc));
    note("blandAltman", e, c.name); }
  for (const c of F.meta) { const r = MA(c.y, c.v, { conf: c.conf }), w = c.want; let e = 0;
    ["fixed", "random"].forEach(k => { const R = r[k], W = w[k], sc = Math.max(Math.abs(W[0]), W[1]); e = Math.max(e, rel(R.est, W[0], sc), rel(R.se, W[1]), rel(R.lo, W[2], sc), rel(R.hi, W[3], sc)); });
    e = Math.max(e, rel(r.Q, w.Q), r.df === w.df ? 0 : Infinity, rel(r.tau2, w.tau2, Math.max(w.tau2, 1e-12)), rel(r.I2, w.I2, Math.max(w.I2, 1e-12)));
    w.wF.forEach((v, i) => { e = Math.max(e, rel(r.fixed.w[i], v), rel(r.random.w[i], w.wR[i])); });
    note("metaAnalysis", e, c.name); }
  for (const c of F.qq) { const r = QQ(c.vals, { dist: c.dist, pos: c.pos, line: "quartiles" }), w = c.want; if (r.fail) { refBad.push(`qqData ${c.name}: ${r.fail}`); continue; }
    const sc = Math.max(...c.vals.map(Math.abs)); let e = 0, ep = 0, at = c.name;
    w.x.forEach((v, i) => { const d = Math.max(rel(r.x[i], v, sc), rel(r.lo[i], w.lo[i], sc), rel(r.hi[i], w.hi[i], sc)); if (d > e) { e = d; at = `${c.name}, point ${i + 1}`; } });
    e = Math.max(e, rel(r.line.a, w.qa, sc), rel(r.line.b, w.qb));
    c.par.forEach((v, i) => { ep = Math.max(ep, rel(r.par[i], v)); });
    note("qqData.quantiles", e, at); note("qqData.fit", ep, c.name); }
}

/* ---- Polar graphs (PLOT2_SPEC 7.3): polarFrame, polarFwd and polarInv against mpmath at 40 digits from the definition with complex
   numbers (tools/ref/plot2_polar.py), every unit, zero and direction, holes, sectors (across the seam too) and a turned zero; the frame
   and each place in pixels, a point with no place none; θ as the arc it is off by (in units of the radius, so the centre's angle, which is none, counts nothing), r relative to its range as drawn (R(1 − hole) pixels), less its own last bit; polarJoin's pieces. ---- */
if (fixtures["plot2-polar"]) {
  const FR = get("polarFrame"), FW = get("polarFwd"), IV = get("polarInv"), JN = get("polarJoin");
  for (const c of fixtures["plot2-polar"].cases) { const [L, T, pw, mh] = c.box, F = FR(c.o, L, T, pw, mh), w = c.want;
    note("polarFrame", Math.max(Math.abs(F.cx - w.cx), Math.abs(F.cy - w.cy), Math.abs(F.R - w.R)), c.name);
    let e = 0, at = c.name;
    c.pts.forEach(([th, r], i) => { const q = FW(F, th, r), wq = c.xy[i]; const d = wq == null ? (q == null ? 0 : Infinity) : q == null ? Infinity : Math.hypot(q[0] - wq[0], q[1] - wq[1]);
      if (!(d <= e)) { e = d; at = `${c.name}: θ ${th}, r ${r}${wq == null ? " (has no place)" : ""}`; } });
    note("polarFwd", e, at);
    let ei = 0, ai = c.name; const sp = Math.abs(c.o.r1 - c.o.r0);
    c.inv.forEach(([x, y, th, r]) => { const q = IV(F, x, y); let dt = Math.abs(q.th - th) % c.turn; dt = Math.min(dt, c.turn - dt) / c.turn * 2 * Math.PI * q.rho; const d = Math.max(dt, Math.max(0, Math.abs(q.r - r) - Math.abs(r) * 2 ** -52) / sp * (1 - c.o.hole));
      if (!(d <= ei)) { ei = d; ai = `${c.name}: (${x}, ${y})`; } });
    note("polarInv", ei, ai); }
  for (const c of fixtures["plot2-polar"].joins) { const r = JN(c.pts, c.turn, 3); let e = r.length === c.want.length ? 0 : Infinity;
    if (e === 0) r.forEach((q, i) => { e = Math.max(e, Math.abs(q[0] - c.want[i][0]) / c.turn, Math.abs(q[1] - c.want[i][1]) / 5); });
    note("polarJoin", e, `${c.name}: ${r.length} pieces against ${c.want.length}`); }
}

/* ---- Ternary graphs (PLOT2_SPEC 7.4): ternFrame, ternNorm with ternFwd, ternInv, ternGrid and ternTick against mpmath at 40 digits
   from the definitions, each place checked there against python-ternary's projection (tools/ref/plot2_ternary.py): fractions and
   percentages, counts of any size, parts from 1e-200 to 1e200, a part below 0, missing or a sum of 0 with no place; pixels, the
   inverse's parts absolutely (each is at most about 1), the ticks' directions as unit vectors. ---- */
if (fixtures["plot2-ternary"]) {
  const TF = get("ternFlat");
  for (const c of fixtures["plot2-ternary"].cases) { const r = TF(c.box, c.rows, c.vs, c.cw, c.scr), w = c.want, d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    note("ternFrame", Math.max(d2(r.A, w.A), d2(r.B, w.B), d2(r.C, w.C)), c.name);
    let e = 0, at = c.name;
    r.xy.forEach((q, i) => { const wq = w.xy[i], d = wq == null ? (q == null ? 0 : Infinity) : q == null ? Infinity : d2(q, wq); if (!(d <= e)) { e = d; at = `${c.name}: row ${JSON.stringify(c.rows[i])}${wq == null ? " (has no place)" : ""}`; } });
    note("ternFwd", e, at);
    let eg = 0; for (let k = 0; k < 3; k++) c.vs.forEach((v, j) => { const g = r.grid[k][j], wg = w.grid[k][j], t = r.tick[k][j], wt = w.tick[k][j];
      eg = Math.max(eg, d2(g[0], wg[0]), d2(g[1], wg[1]), d2(t, wt), Math.hypot(t[2] - wt[2], t[3] - wt[3])); });
    note("ternGrid", eg, c.name);
    let ei = 0; r.inv.forEach((q, i) => { ei = Math.max(ei, ...q.map((v, k) => Math.abs(v - w.inv[i][k]))); });
    note("ternInv", ei, c.name); }
}

/* ---- Vectors and radar charts (PLOT2_SPEC 7.5): vecEnd and vecHead, radarFrame and radarPlace against mpmath at 40 digits from the
   definitions (tools/ref/plot2_vectors.py): angles in degrees and radians, of many turns, lengths below 0, a tiny scale, a missing
   value; radar frames of three to forty spokes, values outside the range with no place; in pixels. ---- */
if (fixtures["plot2-vectors"]) {
  const VF = get("vecFlat"), RF = get("radarFlat"), d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const c of fixtures["plot2-vectors"].vectors) { const r = VF(c.rows, c.k, c.unit, c.h, c.w); let e = 0, eh = 0, at = c.name;
    r.forEach((q, i) => { const w = c.want[i]; if ((q == null) !== (w == null)) { e = Infinity; at = `${c.name}: arrow ${i} has an end in one and none in the other`; return; } if (!q) return;
      const d = d2(q.e, w.e); if (d > e) { e = d; at = `${c.name}: arrow ${i}`; }
      if ((q.head == null) !== (w.head == null)) { eh = Infinity; return; } if (q.head) eh = Math.max(eh, ...q.head.map((p, j) => d2(p, w.head[j]))); });
    note("vecEnd", e, at); note("vecHead", eh, c.name); }
  for (const c of fixtures["plot2-vectors"].radar) { const r = RF(c.box, c.K, c.vals, c.lo, c.hi), w = c.want; let e = Math.max(Math.abs(r.F.cx - w.F[0]), Math.abs(r.F.cy - w.F[1]), Math.abs(r.F.R - w.F[2])), at = c.name;
    r.pts.forEach((q, i) => { const wq = w.pts[i], d = wq == null ? (q == null ? 0 : Infinity) : q == null ? Infinity : d2(q, wq); if (!(d <= e)) { e = d; at = `${c.name}: ${JSON.stringify(c.vals[i])}`; } });
    note("radarPlace", e, at); }
}

/* ---- The shift between two scans (QUDI_SPEC Q.8): Guizar-Sicairos, Thurman and Fienup's registration written again in NumPy,
   tools/ref/shift_fixtures.py; the shift the same grid point, the correlation at it to the rounding ---- */
if (fixtures.shift) {
  const RS = get("regShift");
  for (const c of fixtures.shift.cases) { const r = RS(c.A, c.B, c.o), w = c.want;
    if (r.fail) { refBad.push(`regShift ${c.name}: ${r.fail}`); continue; }
    note("regShift.shift", Math.max(Math.abs(r.sx - w.sx), Math.abs(r.sy - w.sy)), `${c.name}: (${r.sx}, ${r.sy}) against (${w.sx}, ${w.sy})`);
    note("regShift.r", Math.abs(r.r - w.r) / Math.abs(w.r), c.name); }
}

/* ---- ImageJ's display of a 32-bit image (IMAGE_SPEC I.3): LutLoader's tables, create8BitImage, FloatStatistics' histogram,
   ContrastAdjuster's Auto and sliders and ContrastEnhancer's saturation, written again in Python from ImageJ 1.54f's source
   (tools/ref/ij_display.py, float32 where Java computes in float); every number the same ---- */
if (fixtures["ij-display"]) {
  const FX = fixtures["ij-display"], LUT = get("ijLut"), I8 = get("ij8"), HI = get("ijHist"), AU = get("ijAuto"), AS = get("ijAutoStep"), EN = get("ijEnhance"), BR = get("ijBCRange"), BP = get("ijBCPlaces"), BS = get("ijBCSet");
  let bad = 0, at = "";
  for (const [k, want] of Object.entries(FX.luts)) { const L = LUT(k); for (let i = 0; i < 768; i++) if (!L || L[i] !== want[i]) { bad++; at = `${k}, entry ${Math.floor(i / 3)}`; break; } }
  note("ijLut.tables", bad, at || `${Object.keys(FX.luts).length} tables of 256`);
  const same = (a, b) => a === b || (a == null && b == null);
  for (const c of FX.cases) { const H = HI(c.z), w = c.hist;
    let hb = (H.n !== w.n) + (H.n ? (H.min !== w.min) + (H.max !== w.max) + (H.binSize !== w.binSize) : 0); for (let i = 0; i < 256; i++) if (H.counts[i] !== w.counts[i]) hb++;
    note("ijHist.bins", hb, c.name);
    if (c.idx) { let ib = 0, iat = ""; c.z.forEach((v, i) => { if (v == null) return; const a = I8(v, w.min, w.max), b2 = I8(v, c.shown2[0], c.shown2[1]); if (a !== c.idx[i] || b2 !== c.idx2[i]) { ib++; iat = `cell ${i}: ${a}, ${b2} against ${c.idx[i]}, ${c.idx2[i]}`; } });
      note("ij8.index", ib, `${c.name}${iat ? ", " + iat : ""}`); }
    let ab = 0, aat = "", a = 0; c.auto.forEach((want, k) => { a = AS(a); const r = AU(H, a); const ok = want == null ? r == null : r && r.min === want[0] && r.max === want[1] && a === want[2]; if (!ok) { ab++; aat = `press ${k + 1}: ${JSON.stringify(r)} against ${JSON.stringify(want)}`; } });
    note("ijAuto.range", ab, `${c.name}${aat ? ", " + aat : ""}`);
    let eb = 0, eat = ""; c.enh.forEach(([sat, want]) => { const r = EN(H, sat); const ok = want == null ? r == null : r && r.min === want[0] && r.max === want[1]; if (!ok) { eb++; eat = `${sat} %: ${JSON.stringify(r)} against ${JSON.stringify(want)}`; } });
    note("ijEnhance.range", eb, `${c.name}${eat ? ", " + eat : ""}`);
    let sb = 0, sat2 = ""; const dmin = w.min, dmax = w.max > w.min ? w.max : w.min + 1;
    for (const q of c.sliders) { const [mn, mx] = q.shown, sr = BR(dmin, dmax, mn, mx), pl = BP(dmin, dmax, mn, mx, q.sr);
      if (sr !== q.sr) { sb++; sat2 = `range ${sr} against ${q.sr}`; }
      for (const k of ["min", "max", "brightness", "contrast"]) if (pl[k] !== q.places[k]) { sb++; sat2 = `${k}'s place ${pl[k]} against ${q.places[k]}`; }
      for (const [k, v, want] of q.sets) { const r = BS(k, v, dmin, dmax, mn, mx, q.sr); if (!(same(r.min, want[0]) && same(r.max, want[1]))) { sb++; sat2 = `${k} at ${v}: ${r.min}, ${r.max} against ${want}`; } } }
    note("ijBC.sliders", sb, `${c.name}${sat2 ? ", " + sat2 : ""}`); }
}

/* ---- ImageJ's Process menu (IMAGE_SPEC I.5): every cell of each operation against tools/ref/ij_process.py's port of ImageJ 1.54f
   (the count of cells that differ, so 0 is every one equal, NaN and empty alike) ---- */
if (fixtures["ij-process"]) {
  const PR = get("ijProcess"), grp = (p) => p.skip ? "skip" : ["smooth", "sharpen", "edges"].includes(p.op) ? "filter3x3" : ["mean", "median", "min", "max", "var"].includes(p.op) ? "rank" : p.op;
  for (const c of fixtures["ij-process"].cases) c.ops.forEach((p, k) => { const r = PR({ nx: c.nx, ny: c.ny, xs: c.xs, ys: c.ys, z: c.z }, p), w = c.want[k];
    let bad = 0, at = ""; if (r.fail) { bad = w.length; at = r.fail; }
    else for (let i = 0; i < w.length; i++) { const a = r.z[i], b = w[i]; if (!(a === b || a == null && b == null)) { bad++; if (!at) at = `cell ${i}: ${a} against ${b}`; } }
    note("ijProcess." + grp(p), bad, `${c.name}, ${JSON.stringify(p)}${at ? ", " + at : ""}`); });
}

/* ---- ImageJ's AutoThresholder and setAutoThreshold of a 32-bit image (IMAGE_SPEC I.6): each method's level on 32 histograms,
   each image's level, range and count against tools/ref/ij_threshold.py's port of ImageJ 1.54f (the count that differ) ---- */
if (fixtures["ij-threshold"]) {
  const AT = get("ijAutoThreshold"), TH = get("ijThreshold"), FX = fixtures["ij-threshold"];
  FX.hists.forEach((c, k) => { for (const [m, w] of Object.entries(c.want)) { const t = AT(Int32Array.from(c.h), m); note("ijThreshold.methods", t === w ? 0 : 1, `histogram ${k}, ${m}: ${t} against ${w}`); } });
  for (const im of FX.images) { const M = { nx: im.nx, ny: im.ny, xs: [...Array(im.nx).keys()], ys: [...Array(im.ny).keys()], z: im.z };
    for (const w of im.want) { const r = TH(M, { method: w.method, dark: w.dark, skip: w.skip });
      const ok = !r.fail && r.t === w.t && r.lower === w.lower && r.upper === w.upper && r.inside === w.inside;
      note("ijThreshold.levels", ok ? 0 : 1, `${im.name}, ${w.method}${w.dark ? " dark" : ""}${w.skip ? " skip" : ""}: ${r.fail || [r.t, r.lower, r.upper, r.inside]} against ${[w.t, w.lower, w.upper, w.inside]}`); } }
}

/* ---- ImageJ's Analyze Particles (IMAGE_SPEC I.6): every particle's cells (the count of particles or cells that differ), its shape
   (perimeter, ellipse, circularity, Feret, solidity: relative error) and statistics, against tools/ref/ij_particles.py ---- */
if (fixtures["ij-particles"]) {
  const PA = get("ijParticles"), rel = (a, b) => a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
  for (const c of fixtures["ij-particles"].cases) c.ops.forEach((p, k) => { const r = PA({ nx: c.nx, ny: c.ny, xs: c.xs, ys: c.ys, z: c.z }, p), w = c.want[k], tag = `${c.name}, ${JSON.stringify(p)}`;
    if (r.fail || r.rows.length !== w.length) { note("ijParticles.cells", 1, `${tag}: ${r.fail || r.rows.length} particles against ${w.length}`); return; }
    let bc = 0, ws = 0, wt = 0, at = "";
    r.rows.forEach((q, i) => { const e = w[i]; if (q.cells !== e.cells) bc++;
      for (const f of ["perim", "major", "minor", "angle", "circ", "feret", "feretangle", "minferet", "feretx", "ferety", "solidity", "ar", "round"]) {
        const d = e[f] == null ? (Number.isFinite(q[f]) ? 1 : 0) : rel(q[f], e[f]); if (d > ws) { ws = d; at = `#${i + 1} ${f}`; } }
      for (const f of ["area", "mean", "min", "max", "x", "y"]) wt = Math.max(wt, rel(q[f], e[f])); });
    note("ijParticles.cells", bc, `${tag}: ${w.length} particles`); note("ijParticles.shape", ws, `${tag}${at ? ", " + at : ""}`); note("ijParticles.stats", wt, tag); });
}

/* ---- ImageJ's Scale Bar, its numbers and the composite of channels (IMAGE_SPEC I.7): IJ.d2s (DecimalFormat, half even), the
   histogram's numbers, Utils.round and getDigits, every bar's width, label and rectangles, each composite's colours, against
   tools/ref/ij_scalebar.py's port of ImageJ 1.54f (the count that differ) ---- */
if (fixtures["ij-scalebar"]) {
  const FX = fixtures["ij-scalebar"], D = get("ijD2s"), DH = get("ijD2sHist"), R = get("ijRound125"), DG = get("ijDigits"), SB = get("ijScaleBar"), CP = get("ijComposite");
  let bad = 0, at = ""; FX.nums.forEach(([x, d, w]) => { const r = D(x, d); if (r !== w) { bad++; if (!at) at = `d2s(${x}, ${d}): ${r} against ${w}`; } });
  note("ijScaleBar.numbers", bad, `${FX.nums.length} numbers${at ? ", " + at : ""}`);
  bad = 0; at = ""; FX.hist.forEach(([x, w]) => { const r = DH(x); if (r !== w) { bad++; if (!at) at = `${x}: ${r} against ${w}`; } });
  FX.r125.forEach(([x, w, dw]) => { const r = R(x), d = DG(r); if (r !== w || d !== dw) { bad++; if (!at) at = `round(${x}): ${r}, ${d} against ${w}, ${dw}`; } });
  note("ijScaleBar.numbers", bad, `the histogram's ${FX.hist.length}, ${FX.r125.length} roundings${at ? ", " + at : ""}`);
  const keys = ["hw", "hd", "vh", "vd", "hLabel", "vLabel", "hPx", "vPx", "hBar", "hText", "vBar", "vText", "hBg", "vBg", "outer", "inner", "auto"];
  bad = 0; at = ""; FX.bars.forEach(([o, w], k) => { const fs = o.font == null ? 14 : o.font, r = SB(Object.assign({}, o, { tw: t => Math.floor(t.length * fs * 3 / 5) }));
    const diff = r.fail ? "fail" : keys.find(q => JSON.stringify(r[q]) !== JSON.stringify(w[q])); if (diff) { bad++; if (!at) at = `bar ${k} (${JSON.stringify(o)}): ${diff} ${JSON.stringify(r[diff])} against ${JSON.stringify(w[diff])}`; } });
  note("ijScaleBar.bars", bad, `${FX.bars.length} bars${at ? ", " + at : ""}`);
  const L = fixtures["ij-display"] ? fixtures["ij-display"].luts : null;
  if (L) FX.comps.forEach(c => { const px = CP(c.chs.map(h => ({ z: h.z, lo: h.lo, hi: h.hi, on: h.on, lut: L[h.lut] })), c.n, c.mode); let b = 0, a = "";
    for (let i = 0; i < c.n; i++) if (px[i] !== c.px[i]) { b++; if (!a) a = `cell ${i}: ${px[i].toString(16)} against ${c.px[i].toString(16)}`; }
    note("ijComposite.colours", b, `${c.name}, ${c.mode}${a ? ", " + a : ""}`); });
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

/* ---- XPS backgrounds and self-deconvolution (FIT2_SPEC 4.7): Shirley's iteration (its iterations counted the same),
   Tougaard's integral and B, and the self-deconvolution, against NumPy written from the papers; each background over the
   largest value of the data, the deconvolved series over its largest ---- */
if (fixtures.xps) {
  const mx = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  for (const c of fixtures.xps.cases) {
    const w = c.want;
    if (c.fn === "apodWidth") { for (const k of Object.keys(w)) note("xps.fsd", relErr(get("apodWidth")(k), w[k]), "apodWidth " + k); continue; }
    if (c.fn === "fsd") { const [y, o] = c.args, r = get("fsd")(y, o), big = mx(w.y);
      note("xps.fsd", Math.max(...w.y.map((v, i) => Math.abs(r.y[i] - v) / big)), c.name); note("xps.fsd", relErr(r.T, w.T), c.name + " T");
      if (r.clamped !== w.clamped) note("xps.fsd", Infinity, c.name + ": clamped differs"); continue; }
    const [x, y, o] = c.args, r = get(c.fn)(x, y, o), big = mx(y), key = c.fn === "shirleyBg" ? "xps.shirley" : "xps.tougaard";
    note(key, Math.max(...w.b.map((v, i) => Math.abs(r.b[i] - v) / big)), c.name);
    if (c.fn === "shirleyBg" && (r.iter !== w.iter || r.conv !== w.conv)) note(key, Infinity, `${c.name}: ${r.iter} iterations, NumPy ${w.iter}`);
    if (c.fn === "tougaardBg") { note(key, relErr(r.B, w.B), c.name + " B"); note(key, relErr(r.lev, w.lev), c.name + " level"); }
  }
}

/* ---- Surface fits (FIT2_SPEC 4.4): polynomial surfaces against the same fit in exact rationals (each coefficient's error over
   its conditioning, as for 4.1's polynomials; the centred coefficients, the fitted values and the errors directly), and six other
   surfaces against SciPy's least_squares from Kurve's own guess: the same optimum, its parameters and their errors ---- */
if (fixtures.surf) {
  for (const c of fixtures.surf.cases) {
    const [X, Y, Z, id, o] = c.args, w = c.want, F = get("surfFit")(X, Y, Z, id, o || {});
    if (F.fail) { note(w.nl ? "surfFit.nl" : "surfFit", Infinity, c.name + ": " + F.fail); continue; }
    const r = F.res, big = Math.max(...w.params.map(Math.abs));
    // the same optimum: each parameter's difference over its standard error (a round peak's turn is barely determined at all)
    if (w.nl) { w.params.forEach((v, j) => note("surfFit.nl", Math.abs(r.params[j] - v) / Math.max(w.errors[j], 1e-12 * Math.abs(v), 1e-300), `${c.name} p${j}`));
      w.errors.forEach((v, j) => note("surfFit.nl.se", relErr(r.errors[j], v), `${c.name} se${j}`)); note("surfFit.nl", relErr(r.stats.rss, w.rss), c.name + " rss"); continue; }
    w.params.forEach((v, j) => note("surfFit", Math.abs(r.params[j] - v) / Math.max(Math.abs(v), 1e-300) / Math.max(1, w.cond[j]), `${c.name} c${j}`));
    w.errors.forEach((v, j) => note("surfFit", relErr(r.errors[j], v), `${c.name} se${j}`));
    w.b.forEach((v, j) => note("surfFit", Math.abs(r.surf.b[j] - v) / Math.max(...w.b.map(Math.abs)), `${c.name} b${j}`));
    const fb = Math.max(...w.fit.map(Math.abs)); note("surfFit", Math.max(...w.fit.map((v, i) => Math.abs(F.f(X[i], Y[i]) - v) / fb)), c.name + " fitted values");
  }
}

/* ---- Implicit fits (FIT2_SPEC 4.5): circles, ellipses and formulas f(x, y) = 0 by exact orthogonal distance against SciPy's least_squares
   on the curve's parametric form (each point's place on it an unknown of its own): the same optimum, each parameter's difference over
   its standard error, the errors and the sum of squared distances; and against SciPy's odr in its implicit mode, which reaches the
   same curve by a penalty ---- */
if (fixtures.implicit) {
  for (const c of fixtures.implicit.cases) {
    // a distance to an ellipse in 40 digits: relative to itself, or to 1e-4 of the longer half axis for a point nearer the curve
    // than that (whose distance its coordinates' last digits already decide)
    if (c.fn === "ellDist") { const [a, b, u, v] = c.args; note("ellDist", Math.abs(get("ellDist")(a, b, u, v) - c.want) / Math.max(Math.abs(c.want), 1e-4 * a), `${c.name} (${a}, ${b}, ${u}, ${v})`); continue; }
    const [X, Y, id, o] = c.args, w = c.want, F = get("implFit")(X, Y, id, o || {});
    if (F.fail) { note("implFit", Infinity, c.name + ": " + F.fail); continue; }
    // a formula's parameters are in the order they appear in it; the fixture lists them in the order of its starting values' names
    const r = F.res, at = o && o.start ? Object.keys(o.start).map(nm => F.m.params.indexOf(nm)) : w.params.map((_, j) => j);
    w.params.forEach((v, j) => note("implFit", Math.abs(r.params[at[j]] - v) / Math.max(w.errors[j], 1e-12 * Math.abs(v), 1e-300), `${c.name} p${j}`));
    w.errors.forEach((v, j) => note("implFit.se", relErr(r.errors[at[j]], v), `${c.name} se${j}`));
    note("implFit", relErr(r.dist.reduce((t, d) => t + d * d, 0), w.ss), c.name + " sum of squared distances");
    if (w.odr) w.odr.forEach((v, j) => note("implFit.odr", Math.abs(r.params[at[j]] - v) / Math.max(w.errors[j], 1e-300), `${c.name} odr p${j}`));
    // their published values, to four decimals (the turn in radians): within half a unit of the last place
    if (w.pub) w.pub.forEach((v, j) => note("implFit.pub", Math.abs(r.params[j] - v) / (j === 4 ? 0.00005 * 180 / Math.PI : 0.00005), `${c.name} p${j} against the paper`));
  }
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

/* ---- Signal processing (SIGNAL_SPEC, wave 5): every tools/ref/fixtures/sig-*.json, made by NumPy, SciPy and PyWavelets
   (tools/ref/sig_fixtures.py). An array is judged by its worst error over the reference's largest |value| (a complex one
   over its largest modulus), so a value near zero beside large ones is held to the scale of the whole; an object's keys
   each so under `fn.key`; a refusal of SciPy's must be a refusal ({fail} in words) of Kurve's. ---- */
{
  const mx = (a) => { let m = 0; for (const v of a) if (Number.isFinite(v)) m = Math.max(m, Math.abs(v)); return m; };
  // `scale` the size errors are judged against (the reference's largest |value| unless given); `wrap` a phase, compared
  // modulo 2π; a null in the reference a value it does not judge (a phase where the transform is rounding).
  const vecErr = (got, want, scale, wrap) => { if (!got || got.length !== want.length) return Infinity; const big = scale || mx(want) || 1; let e = 0;
    for (let i = 0; i < want.length; i++) { const w = want[i], g = got[i]; if (w === null) continue;
      if (wrap && Number.isFinite(w) && Number.isFinite(g)) { const d = Math.abs(((g - w) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); e = Math.max(e, d / big); continue; }
      if (!Number.isFinite(w)) { if (!(Object.is(w, g) || (Number.isNaN(w) && Number.isNaN(g)) || (w === null && g === null))) return Infinity; continue; }
      if (typeof g !== "number" || !Number.isFinite(g)) return Infinity; e = Math.max(e, Math.abs(g - w) / big); } return e; };
  const cErr = (got, want) => { if (!got || !got.re || got.re.length !== want.re.length) return Infinity; let big = 0;
    for (let i = 0; i < want.re.length; i++) big = Math.max(big, Math.hypot(want.re[i], want.im[i])); big = big || 1; let e = 0;
    for (let i = 0; i < want.re.length; i++) e = Math.max(e, Math.hypot(got.re[i] - want.re[i], got.im[i] - want.im[i]) / big); return e; };
  for (const [set, fx] of Object.entries(fixtures).filter(([k]) => k.startsWith("sig-"))) {
    for (const c of fx.cases) {
      let r; try { r = get(c.fn)(...c.args); } catch (e) { note(c.fn, Infinity, `${c.name}: threw ${e.message}`); continue; }
      if (c.kind === "fail") { note(`${c.fn}.fail`, r && r.fail ? 0 : Infinity, `${c.name}: SciPy refused (${c.want.fail}), Kurve did not`); continue; }
      if (r && r.fail) { note(c.fn, Infinity, `${c.name}: refused, ${r.fail}`); continue; }
      const flat = (a) => (a && typeof a === "object" && typeof a.length === "number" ? Array.from(a).flat(Infinity) : a);
      if (c.kind === "vec") note(c.fn, vecErr(r && Array.from(r), c.want, c.scale), c.name);
      else if (c.kind === "flat") note(c.fn, vecErr(flat(r), c.want.flat(Infinity), c.scale), c.name);
      // second-order sections: the first (it carries the gain) in place, the others as a set (a tie between mirror poles
      // may order them differently, the cascade the same)
      else if (c.kind === "sos") { const rows = (a) => { const o = []; for (let i = 0; i < a.length; i += 6) o.push(a.slice(i, i + 6)); return o; },
          canon = (a) => { const R = rows(Array.from(a)); return R.slice(0, 1).concat(R.slice(1).sort((u, v) => u[4] - v[4] || u[5] - v[5] || u[1] - v[1])).flat(); };
        note(c.fn, r && r.length === c.want.length ? vecErr(canon(r), canon(c.want), c.scale) : Infinity, c.name); }
      else if (c.kind === "cvec") note(c.fn, cErr(r, c.want), c.name);
      else if (c.kind === "rel") note(c.fn, relErr(r, c.want), c.name);
      else if (c.kind === "obj") for (const [k, w] of Object.entries(c.want)) {
        const name = `${c.fn}.${k}`;
        note(name, Array.isArray(w) ? vecErr(r[k] && Array.from(r[k]).flat(Infinity), w.flat(Infinity), c.scale, k === "phase") : typeof w === "number" ? relErr(r[k], w, (TARGET[name] || {}).floor) : (JSON.stringify(r[k]) === JSON.stringify(w) ? 0 : Infinity), c.name);
      }
    }
  }
}

/* ---- Many variables (MULTI_SPEC, wave 6): every tools/ref/fixtures/mv-*.json (tools/ref/mv_fixtures.py). A factorisation
   is judged by its values over the largest, its vectors by their angle to the reference's times their gap over the largest
   (a group of equal values by the part of Kurve's vectors outside the reference's span), and its reconstruction and
   orthogonality from Kurve's answer alone. ---- */
{
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const col = (M, c) => M.map((r) => r[c]);
  // Groups of equal values (within 1e-6 of the largest); a group at the rounding level is the null space, not judged.
  const groups = (s, big, floor) => { const g = []; let cur = [0];
    for (let i = 1; i < s.length; i++) { if (Math.abs(s[i] - s[i - 1]) <= 1e-6 * big) cur.push(i); else { g.push(cur); cur = [i]; } } g.push(cur);
    return g.filter((q) => Math.abs(s[q[0]]) > floor); };
  // The worst of: each of Kurve's vectors in a group, its part outside the reference group's span, times the group's gap.
  // On the longer side of a matrix (U of a tall one, V of a wide one) the vectors past the shorter side belong to singular
  // values of 0, so a group's gap is to 0 too (Wedin): its vectors are known no better, by any method.
  const vecErr = (got, want, s, big, floor, zero) => { let e = 0; const gs = groups(s, big, floor);
    for (const g of gs) { let gap = Infinity; const lo = g[0], hi = g[g.length - 1];
      if (lo > 0) gap = Math.min(gap, Math.abs(s[lo - 1] - s[lo])); if (hi < s.length - 1) gap = Math.min(gap, Math.abs(s[hi] - s[hi + 1]));
      if (zero) gap = Math.min(gap, Math.abs(s[hi]));
      if (!Number.isFinite(gap)) gap = big;
      for (const c of g) { const u = col(got, c), w = g.map((d) => col(want, d)), r = u.slice();
        for (const q of w) { const t = dot(r, q); for (let i = 0; i < r.length; i++) r[i] -= t * q[i]; }
        e = Math.max(e, Math.hypot(...r) * gap / big); } }
    return e; };
  const orthErr = (M, k) => { let e = 0; for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) e = Math.max(e, Math.abs(dot(col(M, a), col(M, b)) - (a === b ? 1 : 0))); return e; };
  for (const [, fx] of Object.entries(fixtures).filter(([k]) => k.startsWith("mv-"))) {
    for (const c of fx.cases) {
      let r; try { r = get(c.fn)(...c.args); } catch (e) { note(c.fn, Infinity, `${c.name}: threw ${e.message}`); continue; }
      if (c.kind === "fail") { note(`${c.fn}.fail`, r && r.fail ? 0 : Infinity, `${c.name}: the reference refused, Kurve did not`); continue; }
      if (!r || r.fail) { note(c.fn, Infinity, `${c.name}: refused, ${r && r.fail}`); continue; }
      // an object of arrays and numbers (an analysis's numbers flat): each key over the reference's largest |value|, under fn.key
      if (c.kind === "obj") { for (const [k, w] of Object.entries(c.want)) { const name = `${c.fn}.${k}`, g = r[k];
          if (Array.isArray(w)) { const big = Math.max(...w.map(Math.abs)) || 1, gg = g && Array.from(g); note(name, gg && gg.length === w.length ? Math.max(...w.map((v, i) => Math.abs(gg[i] - v) / big)) : Infinity, c.name); }
          else note(name, relErr(g, w), c.name); } continue; }
      if (c.kind === "vec") { const big = Math.max(...c.want.map(Math.abs)) || 1, g = r && Array.from(r); note(c.fn, g && g.length === c.want.length ? Math.max(...c.want.map((v, i) => v === null ? (g[i] === null ? 0 : Infinity) : Math.abs(g[i] - v) / big)) : Infinity, c.name); continue; }
      const A = c.args[0];
      if (c.kind === "sval") { note("svd.graded", Math.max(...c.want.s.map((w, i) => relErr(r.s[i], w))), c.name); continue; }
      if (c.kind === "svd") {
        const s = c.want.s, big = s[0] || 1, k = s.length, floor = Math.max(A.length, A[0].length) * 2.3e-16 * big * 4;
        note("svd.s", Math.max(...s.map((w, i) => Math.abs(r.s[i] - w) / big)), c.name);
        let rec = 0; for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) { let t = 0; for (let q = 0; q < k; q++) t += r.U[i][q] * r.s[q] * r.V[j][q]; rec = Math.max(rec, Math.abs(t - A[i][j]) / big); }
        note("svd.recon", rec, c.name); note("svd.orth", Math.max(orthErr(r.U, k), orthErr(r.V, k)), c.name);
        note("svd.vec", Math.max(vecErr(r.U, c.want.U, s, big, floor, A.length > A[0].length), vecErr(r.V, c.want.V, s, big, floor, A[0].length > A.length)), c.name);
      }
      if (c.kind === "eig") {
        const w = c.want.vals, big = Math.max(...w.map(Math.abs)) || 1, n = w.length;
        note("symEig.vals", Math.max(...w.map((v, i) => Math.abs(r.vals[i] - v) / big)), c.name);
        let rec = 0; for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let t = 0; for (let q = 0; q < n; q++) t += r.vecs[i][q] * r.vals[q] * r.vecs[j][q]; rec = Math.max(rec, Math.abs(t - A[i][j]) / big); }
        note("symEig.recon", rec, c.name); note("symEig.orth", orthErr(r.vecs, n), c.name);
        note("symEig.vec", vecErr(r.vecs, c.want.vecs, w, big, -1), c.name);
      }
    }
  }
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
