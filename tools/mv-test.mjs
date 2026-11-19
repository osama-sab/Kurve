/* Wave 6, many variables (ux/spec/MULTI_SPEC.md): the properties the references cannot show and the budgets. The pure
   blocks cut out of kurve.html as tools/ref/run.mjs does.

   Usage: node tools/mv-test.mjs [kurve.html]

   The values themselves are checked against NumPy, scikit-learn, SciPy, statsmodels and 40-digit mpmath by
   tools/ref-test.mjs (tools/ref/mv_fixtures.py); here: invariances, closed forms, refusals, the analyses run whole, and the
   times. */
import { loadKurve } from "./ref/run.mjs";

const get = loadKurve(process.argv[2]);
let pass = 0, fail = 0;
const ok = (c, msg, extra) => { if (c) { pass++; console.log(`  ok   ${msg}`); } else { fail++; console.log(`  FAIL ${msg}${extra ? ": " + extra : ""}`); } };
const time = (f) => { const t = performance.now(); const r = f(); return [r, performance.now() - t]; };
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-300)) * Math.cos(2 * Math.PI * rnd());
const mat = (m, n, f) => Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j)));
const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const T = (A) => A[0].map((_, j) => A.map((r) => r[j]));
const maxDiff = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
// An orthogonal matrix from Gram–Schmidt of random columns.
const orth = (n) => { const Q = []; for (let c = 0; c < n; c++) { let v = Array.from({ length: n }, gauss);
    for (let pass = 0; pass < 2; pass++) for (const q of Q) { const d = v.reduce((s, x, i) => s + x * q[i], 0); v = v.map((x, i) => x - d * q[i]); }
    const nv = Math.hypot(...v); Q.push(v.map((x) => x / nv)); } return T(Q); };

const svd = get("svd"), symEig = get("symEig");

console.log("6.1 the singular value decomposition and the symmetric eigenproblem");
{ const A = mat(9, 6, gauss), r = svd(A), s1 = r.s[0];
  const P = [3, 0, 5, 1, 8, 2, 7, 4, 6], Q = [2, 5, 0, 4, 1, 3];
  const Ap = P.map((i) => Q.map((j) => A[i][j]));
  ok(maxDiff(svd(Ap).s, r.s) < 1e-14 * s1, "rows and columns permuted: the same singular values");
  const O1 = orth(9), O2 = orth(6), B = mul(mul(O1, A), T(O2));
  ok(maxDiff(svd(B).s, r.s) < 1e-13 * s1, "an orthogonal factor on each side: the same singular values");
  ok(maxDiff(svd(T(A)).s, r.s) < 1e-14 * s1, "the transpose: the same singular values");
  const k = 7.5, rk = svd(A.map((row) => row.map((v) => v * k))); ok(maxDiff(rk.s, r.s.map((v) => v * k)) < 1e-13 * s1 * k, "scaled by 7.5: the values scale");
  // the sign rule: each V column's entry of largest magnitude positive
  ok(r.V[0].every((_, c) => { let b = 0; r.V.forEach((row, i) => { if (Math.abs(row[c]) > Math.abs(r.V[b][c])) b = i; }); return r.V[b][c] > 0; }), "each right vector's largest entry positive (the sign rule)");
}
{ const D = [[0, 0, 0], [0, -4, 0], [0, 0, 2], [0, 0, 0]], r = svd(D);
  ok(maxDiff(r.s, [4, 2, 0]) === 0 && r.rank === 2, "a diagonal matrix: |entries| sorted, rank 2", JSON.stringify(r.s));
  const z = svd(mat(3, 4, () => 0)), zo = T(z.V).map((a) => T(z.V).map((b) => a.reduce((s, x, i) => s + x * b[i], 0))); ok(z.s.every((v) => v === 0) && z.rank === 0 && z.U.length === 3 && z.V.length === 4 && zo.every((row, i) => row.every((v, j) => Math.abs(v - (i === j)) < 1e-15)), "the zero matrix: every value 0, rank 0, vectors still orthonormal");
  const u = [1, -2, 3], v = [4, 5, -6, 7], R1 = svd(u.map((a) => v.map((b) => a * b)));
  ok(Math.abs(R1.s[0] - Math.hypot(...u) * Math.hypot(...v)) < 1e-13 * R1.s[0] && R1.rank === 1, "a rank-one matrix: one value, |u|·|v|");
  ok(svd([]).fail && svd([[1, NaN]]).fail && svd([[1, 2], [3]]).fail, "an empty matrix, a NaN and rows of two lengths refused in words");
  ok(/Row 2/.test(svd([[1, 2], [3]]).fail), "…naming the row");
}
{ const O = orth(7), lam = [9, 9, 9, 2, -1, -1, -5], A = mul(mul(O, lam.map((l, i) => lam.map((_, j) => (i === j ? l : 0)))), T(O)), r = symEig(A);
  ok(maxDiff(r.vals, lam) < 1e-14 * 9, "eigenvalues from known ones, with ties", JSON.stringify(r.vals));
  let res = 0; for (let c = 0; c < 7; c++) { const v = r.vecs.map((row) => row[c]), Av = A.map((row) => row.reduce((s, x, i) => s + x * v[i], 0)); res = Math.max(res, maxDiff(Av, v.map((x) => x * r.vals[c]))); }
  ok(res < 1e-13 * 9, "each vector: A·v = λ·v");
  ok(symEig([[1, 2, 3], [2, 1, 0]]).fail && symEig([[NaN]]).fail, "a matrix not square, a NaN: refused in words");
  ok(maxDiff(symEig([[2, 99], [1, 2]]).vals, [3, 1]) < 1e-15, "only the lower triangle read (as LAPACK's 'L')");
}
{ const A = mat(300, 2000, gauss);
  const [r, ms] = time(() => svd(A, { k: 10 })); ok(r.U[0].length === 10 && r.V.length === 2000 && ms < 3000, `300 × 2000, the first 10 vectors, in ${ms.toFixed(0)} ms (budget 1 s in the worker; node cold gets three times)`);
  const [, ms2] = time(() => svd(mat(50, 50, gauss))); ok(ms2 < 15, `50 × 50 in ${ms2.toFixed(1)} ms (budget 5 ms; node cold gets three times)`);
  const B = mat(200, 200, gauss), S = B.map((row, i) => row.map((v, j) => (v + B[j][i]) / 2)); const [, ms3] = time(() => symEig(S)); ok(ms3 < 900, `the eigenproblem of 200 × 200 in ${ms3.toFixed(0)} ms (budget 0.3 s; node cold gets three times)`);
}

console.log("6.2 principal components");
const pca = get("pca"), run = get("anaRunKind");
{ const n = 50, X = mat(n, 5, () => gauss()).map((r) => [r[0], 2 * r[0] + 0.3 * r[1], r[2], r[2] - r[3], 100 + r[4]]);
  const r = pca(X, { scale: "none", k: 5 });
  let rec = 0; for (let i = 0; i < n; i++) for (let j = 0; j < 5; j++) { let v = r.mean[j]; for (let a = 0; a < 5; a++) v += r.T[i][a] * r.V[j][a]; rec = Math.max(rec, Math.abs(v - X[i][j])); }
  ok(rec < 1e-12, `every component kept: scores × loadings + the means give the data back (${rec.toExponential(1)})`);
  ok(r.q.every((v) => v < 1e-24) && r.qlim == null, "…Q is 0 and has no limit");
  const tot = X[0].map((_, j) => { const c = X.map((r) => r[j]), m = c.reduce((s, v) => s + v, 0) / n; return c.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1); }).reduce((s, v) => s + v, 0);
  ok(Math.abs(r.ev.reduce((s, v) => s + v, 0) - tot) < 1e-12 * tot, "the eigenvalues add up to the total variance");
  const u = pca(X, { scale: "unit", k: 2 });
  ok(Math.abs(u.ev.reduce((s, v) => s + v, 0) - 5) < 1e-12, "under unit variance they add up to the number of variables");
  const k = 3, t = pca(X, { scale: "unit", k }), mt2 = t.t2.reduce((s, v) => s + v, 0) / n;
  ok(Math.abs(mt2 - k * (n - 1) / n) < 1e-12, `T²'s mean over the observations is k(n − 1)/n (${mt2.toFixed(12)})`);
  const Y = X.map((r) => [r[0] * 1000, r[1], r[2] * 1e-6, r[3], r[4]]), w = pca(Y, { scale: "unit", k: 3 });
  ok(w.ev.every((v, i) => Math.abs(v - t.ev[i]) < 1e-12) && w.T.every((r, i) => r.every((v, a) => Math.abs(v - t.T[i][a]) < 1e-11)), "unit variance: a variable in other units (× 1000, × 10⁻⁶) changes nothing");
  const perm = X.map((_, i) => (i * 17) % n), P2 = pca(perm.map((i) => X[i]), { scale: "unit", k: 3 });
  ok(P2.ev.every((v, i) => Math.abs(v - t.ev[i]) < 1e-12) && perm.every((i, j) => P2.T[j].every((v, a) => Math.abs(v - t.T[i][a]) < 1e-11)), "the rows reordered: the same eigenvalues, each observation's scores moved with it");
  const sh = pca(X.map((r) => r.map((v) => v + 1e6)), { scale: "none", k: 3 });
  ok(sh.ev.every((v, i) => Math.abs(v - t.ev[i] * 0 - pca(X, { scale: "none", k: 3 }).ev[i]) < 1e-8 * r.ev[0]), "every value shifted by 10⁶: the same eigenvalues (to the shift's rounding)");
  ok(pca(X, { scale: "unit", k: 99 }).k === 5 && pca(X.slice(0, 3), { scale: "none" }).ev.length === 2, "k past the rank is held to it; three observations have two components");
  const two = pca(X.map((r) => [r[0], r[1]]), { scale: "unit", k: 2 });
  ok(two.V[0][0] > 0 && two.V[0][1] > 0 && Math.abs(Math.abs(two.V[0][1]) - Math.SQRT1_2) < 1e-14, "two variables under unit variance: loadings of ±1/√2, each component's first entry positive (equal magnitudes: the first decides)", JSON.stringify(two.V));
  ok(/Variable 2 has the same value/.test((pca(X.map((r) => [r[0], 7, r[2]]), { scale: "unit" }).fail) || "") && !pca(X.map((r) => [r[0], 7, r[2]]), { scale: "none" }).fail, "a constant variable refused under unit variance, naming it; kept when centred");
}
{ // the curves layout is the columns layout of the transposed table
  const m = 40, x = Array.from({ length: m }, (_, i) => i), curves = Array.from({ length: 9 }, (_, c) => ({ id: "c" + c, name: "C" + c, unit: "V", xn: "t", xu: "s", pts: { x, y: x.map((v) => Math.sin(v / (3 + c)) + 0.1 * gauss()), e: [], rows: x } }));
  const A = run("pca", curves, { layout: "curves", k: 3 }), cols = x.map((_, j) => ({ id: "v" + j, name: "V" + j, unit: "V", vals: curves.map((q) => q.pts.y[j]), rows: curves.map((_, i) => i) }));
  const B = run("pca", cols, { layout: "cols", scale: "none", k: 3 }), col = (R, k) => R.tables[0].cols.find((c) => c.k === k).vals;
  ok(!A.fail && !B.fail && col(A, "ev").every((v, i) => Math.abs(v - col(B, "ev")[i]) < 1e-12) && col(A, "t2").every((v, i) => Math.abs(v - col(B, "t2")[i]) < 1e-11), "nine curves of 40 points equal 40 columns of nine rows");
  ok(col(A, "vx").length === 40 && A.tables[0].cols.find((c) => c.k === "l1").role === "y" && B.tables[0].cols.find((c) => c.k === "l1").role === "ignore", "…the curves' loadings Y columns against X, the columns' not");
  const one = run("pca", curves.slice(0, 1), { layout: "curves" }); ok(one.fail && /two curves/.test(one.fail), "one curve refused in words");
  const sep = curves.map((q, i) => i === 0 ? q : Object.assign({}, q, { pts: { x: x.map((v) => v + 100), y: q.pts.y, e: [], rows: x } }));
  ok(/share no stretch/.test(run("pca", sep, { layout: "curves" }).fail || ""), "curves that share no stretch of X refused in words");
  const tooFew = run("pca", [{ id: "a", name: "A", vals: [1, 2], rows: [0, 1] }, { id: "b", name: "B", vals: [3, 4], rows: [5, 6] }], {}); ok(/No row has a value in every column/.test(tooFew.fail || ""), "columns with no row in common refused in words");
}
{ const n = 1e6, a0 = Float64Array.from({ length: n }, gauss), X = [a0].concat(Array.from({ length: 9 }, (_, j) => Float64Array.from(a0, (v) => (j < 3 ? v : 0) + gauss())));
  const [r, ms] = time(() => pca({ cols: X, n }, { scale: "unit", k: 3, rows: false })); ok(!r.fail && ms < 4500, `10⁶ rows of 10 columns in ${ms.toFixed(0)} ms (budget 1.5 s in the worker; node cold gets three times)`);
  const C = Array.from({ length: 300 }, () => Array.from({ length: 2000 }, gauss)); const [r2, ms2] = time(() => pca(C, { scale: "none", k: 10 })); ok(!r2.fail && ms2 < 4500, `300 curves of 2000 points in ${ms2.toFixed(0)} ms (budget 1.5 s in the worker; node cold gets three times)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
