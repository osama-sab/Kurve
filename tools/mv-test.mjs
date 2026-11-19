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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
