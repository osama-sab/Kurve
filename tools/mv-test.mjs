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

console.log("6.3 clustering");
{ const kmLloyd = get("kmLloyd"), kmeans = get("kmeans"), linkage = get("linkage"), mvDist = get("mvDist"), cutTree = get("cutTree"), dendroXY = get("dendroXY"), silhouette = get("silhouette");
  const blob = (n, m, k, sp) => { const C = mat(k, m, () => 8 * gauss()), lab = Array.from({ length: n }, (_, i) => i % k); return { X: lab.map((c) => C[c].map((v) => v + sp * gauss())), lab }; };
  const { X, lab } = blob(90, 3, 3, 0.4), n = 90, m = 3, R = Float64Array.from(X.flat());
  const K = kmeans(R, n, m, { k: 3, seed: 7, restarts: 5 });
  ok(K.lab.every((c, i) => c === lab[i]), "three blobs far apart: k-means finds them, numbered by their first observation");
  let ine = 0; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) ine += (X[i][j] - K.C[K.lab[i] * m + j]) ** 2;
  ok(Math.abs(ine - K.inertia) < 1e-9 * ine, "…its within sum of squares the squared distances to the centres");
  ok(JSON.stringify(Array.from(kmeans(R, n, m, { k: 3, seed: 7, restarts: 5 }).lab)) === JSON.stringify(Array.from(K.lab)), "the same seed: the same clusters");
  const perm = Array.from({ length: n }, (_, i) => (i * 37) % n), Rp = Float64Array.from(perm.map((i) => X[i]).flat()), C0 = Float64Array.from([X[0], X[1], X[2]].flat());
  const a1 = kmLloyd(R, n, m, C0, 300), a2 = kmLloyd(Rp, n, m, C0, 300);
  ok(perm.every((i, j) => a2.lab[j] === a1.lab[i]), "from the same starts, the rows reordered: each row in the same cluster");
  ok(kmeans(R, n, m, { k: 91 }).fail && /cannot make 91 clusters/.test(kmeans(R, n, m, { k: 91 }).fail), "more clusters than observations refused in words");
  const same = Float64Array.from(Array.from({ length: 10 }, () => [1, 2]).flat()); ok(/differ/.test(kmeans(same, 10, 2, { k: 2 }).fail || ""), "ten equal observations into two clusters refused in words");
  const D = mvDist(R, n, m, "euclidean"), W = linkage(D, n, "ward"), ws = (members) => { let t = 0; for (let j = 0; j < m; j++) { const mu = members.reduce((s, i) => s + X[i][j], 0) / members.length; t += members.reduce((s, i) => s + (X[i][j] - mu) ** 2, 0); } return t; };
  const mem = Array.from({ length: 2 * n - 1 }, (_, i) => (i < n ? [i] : null)); let wErr = 0;
  W.forEach((z, i) => { const A = mem[z[0]], B = mem[z[1]], d = ws(A.concat(B)) - ws(A) - ws(B); wErr = Math.max(wErr, Math.abs(z[2] * z[2] / 2 - d) / Math.max(d, 1e-12)); mem[n + i] = A.concat(B); });
  ok(wErr < 1e-10, `Ward's heights: h²/2 the rise in the within sum of squares at each merge (${wErr.toExponential(1)})`);
  // single linkage: its heights the minimum spanning tree's edges (Kruskal's, by itself)
  const S1 = linkage(D, n, "single").map((z) => z[2]), edges = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([Math.hypot(...X[i].map((v, t) => v - X[j][t])), i, j]);
  edges.sort((a, b) => a[0] - b[0]); const par = Array.from({ length: n }, (_, i) => i), f = (x) => (par[x] === x ? x : (par[x] = f(par[x]))), mst = [];
  for (const [w, i, j] of edges) { const a = f(i), b = f(j); if (a !== b) { par[a] = b; mst.push(w); } }
  ok(maxDiff(S1, mst) < 1e-12 * mst[mst.length - 1], "single linkage's heights are the minimum spanning tree's edges");
  ok([1, 2, 3, 5, 90].every((k) => new Set(cutTree(W, n, { k })).size === k), "cut into k gives k clusters (1, 2, 3, 5, 90)");
  ok(Array.from(cutTree(W, n, { k: 3 })).every((c, i) => c === lab[i]), "…Ward's three clusters are the blobs, numbered by their first observation");
  const dg = dendroXY(W, n); let dOk = true; for (let i = 0; i < W.length; i++) { const y = dg.y.slice(5 * i, 5 * i + 4); if (y[1] !== W[i][2] || y[2] !== W[i][2] || dg.y[5 * i + 4] !== null) dOk = false; }
  ok(dOk && new Set(dg.leaves).size === n, "the dendrogram: each merge a ⊓ at its height, a gap after it, every leaf once");
  const si = silhouette(R, n, m, Int32Array.from([0].concat(Array(n - 1).fill(1))), 1e9); ok(si.s[0] === 0, "an observation alone in its cluster has a silhouette of 0");
  ok(/Ward's method needs Euclidean/.test(run("hclust", [{ id: "a", name: "A", vals: [1, 2, 3, 4], rows: [0, 1, 2, 3] }, { id: "b", name: "B", vals: [2, 1, 4, 3], rows: [0, 1, 2, 3] }], { method: "ward", metric: "correlation" }).fail || ""), "Ward's on correlation distances refused in words");
  const big = run("hclust", [{ id: "a", name: "A", vals: Array.from({ length: 3001 }, gauss), rows: Array.from({ length: 3001 }, (_, i) => i) }, { id: "b", name: "B", vals: Array.from({ length: 3001 }, gauss), rows: Array.from({ length: 3001 }, (_, i) => i) }], {});
  ok(/3001 observations/.test(big.fail || "") && /k-means/.test(big.fail || ""), "3001 observations hierarchically refused in words, k-means named");
  // the kinds whole
  const ins = [0, 1, 2].map((j) => ({ id: "v" + j, name: "V" + j, unit: "mm", vals: X.map((r) => r[j]), rows: X.map((_, i) => i) }));
  const KM = run("kmeans", ins, { k: 3, kmax: 5, scale: "none" }), col = (R, k) => R.tables[0].cols.find((c) => c.k === k);
  ok(!KM.fail && col(KM, "cl").vals.slice(0, 4).join() === "1,2,3,1" && col(KM, "kin").vals.length === 4 && col(KM, "c1").vals.length === 3 && col(KM, "py2").name === "Cluster 3", "the k-means analysis: clusters as text, centres a row a variable, k compared from 2 to 5, a curve a cluster", KM.fail);
  const HC = run("hclust", ins, { k: 3, scale: "none" });
  ok(!HC.fail && col(HC, "cl").vals.slice(0, 4).join() === "1,2,3,1" && col(HC, "dy").vals.length === 5 * (n - 1) && col(HC, "cy").vals[0] > W[n - 4][2] && col(HC, "cy").vals[0] < W[n - 3][2], "the hierarchical analysis: Ward's clusters, the dendrogram's lines, the cut drawn between the merges either side", HC.fail);
  const curves = Array.from({ length: 12 }, (_, c) => { const x = Array.from({ length: 50 }, (_, i) => i); return { id: "k" + c, name: "S" + c, unit: "V", xn: "t", xu: "s", pts: { x, y: x.map((v) => (c % 2 ? Math.sin(v / 5) : Math.cos(v / 7)) + 0.05 * gauss()), e: [], rows: x } }; });
  const KC = run("kmeans", curves, { layout: "curves", k: 2 });
  ok(!KC.fail && col(KC, "cl").vals.join() === "1,2,1,2,1,2,1,2,1,2,1,2" && col(KC, "cvx").role === "x" && col(KC, "c1").role === "y" && col(KC, "c1").vals.length === 50, "twelve curves of two shapes: two clusters, each cluster's mean a curve against X", KC.fail);
  const HCc = run("hclust", curves, { layout: "curves", method: "average", metric: "correlation", k: 2 }); ok(!HCc.fail && col(HCc, "cl").vals.join() === "1,2,1,2,1,2,1,2,1,2,1,2", "…and by average linkage on 1 − r", HCc.fail);
}
{ const kmeans = get("kmeans"), linkage = get("linkage"), mvDist = get("mvDist"), n = 1e5, m = 10, R = Float64Array.from({ length: n * m }, (_, i) => gauss() + 6 * ((Math.floor(i / m) % 10) - 5) * (i % m === 0));
  const [K, ms] = time(() => kmeans(R, n, m, { k: 10, seed: 1, restarts: 10 })); ok(!K.fail && ms < 9000, `k-means of 10⁵ rows of 10, k 10, 10 starts, in ${ms.toFixed(0)} ms (budget 3 s in the worker; node cold gets three times)`);
  const N = 3000, Q = Float64Array.from({ length: N * 5 }, gauss); const [, ms2] = time(() => linkage(mvDist(Q, N, 5, "euclidean"), N, "ward")); ok(ms2 < 9000, `Ward's linkage of 3000 observations in ${ms2.toFixed(0)} ms (budget 3 s in the worker; node cold gets three times)`);
}

console.log("6.4 discriminant analysis");
{ const lda = get("lda"), mvCols = get("mvCols"), n = 75, p = 4, G = 3;
  const M = mat(G, p, () => 2 * gauss()), gi = Int32Array.from({ length: n }, (_, i) => i % G), X = Array.from({ length: n }, (_, i) => M[gi[i]].map((v) => v + gauss()));
  const R = lda(mvCols(X), gi, G, {});
  ok(!R.fail && R.q === 2 && R.ev[0] >= R.ev[1], "three groups of four variables: two functions, the eigenvalues descending", R.fail);
  const Y = X.map((r) => [r[0] * 1000, r[1], r[2] * 1e-3 + 7, r[3]]), Ru = lda(mvCols(Y), gi, G, {});
  ok(maxDiff(Ru.ev, R.ev) < 1e-12 * R.ev[0] && Ru.pred.every((v, i) => v === R.pred[i]) && Ru.post.every((r, i) => maxDiff(r, R.post[i]) < 1e-12) && maxDiff(Ru.std.flat(), R.std.flat()) < 1e-11,
    "a variable in other units (× 1000, × 10⁻³ + 7): the same eigenvalues, probabilities, classes and standardised coefficients");
  const perm = Array.from({ length: n }, (_, i) => (i * 7) % n), Rp = lda(mvCols(perm.map((i) => X[i])), Int32Array.from(perm, (i) => gi[i]), G, {});
  ok(perm.every((i, j) => maxDiff(Rp.post[j], R.post[i]) < 1e-12 && Rp.loo[j] === R.loo[i]), "the rows reordered: each row's probabilities and its class left one out move with it");
  // leave one out by the updates equals refitting without the row
  let worst = 0; for (const i of [0, 5, 31, 74]) { const keep = X.map((_, k) => k).filter((k) => k !== i), Ri = lda(mvCols(keep.map((k) => X[k])), Int32Array.from(keep, (k) => gi[k]), G, {});
    const x = X[i], d = R.mu.map((_, g) => x.reduce((s, v, j) => s + v * Ri.cf[g][j], 0) + Ri.c0[g]), mx = Math.max(...d), e = d.map((v) => Math.exp(v - mx)), z = e.reduce((s, v) => s + v, 0); worst = Math.max(worst, maxDiff(e.map((v) => v / z), R.ploo[i])); }
  ok(worst < 1e-11, `left one out by updating W and the means: as refitting without the row (${worst.toExponential(1)})`);
  // two groups: Wilks' Λ = 1 − R² of the regression of an indicator on the variables
  const g2 = Int32Array.from({ length: n }, (_, i) => (i < 40 ? 0 : 1)), X2 = X.map((r, i) => r.map((v, j) => v + (g2[i] ? 0.8 * (j + 1) : 0))), R2 = lda(mvCols(X2), g2, 2, {});
  const lm = get("linModel"), fit = lm(X2[0].map((_, j) => ({ name: "v" + j, num: true, x: X2.map((r) => r[j]) })), Array.from(g2), {});
  ok(!fit.fail && Math.abs(R2.wl[0] - (1 - fit.r2)) < 1e-12, `two groups: Wilks' Λ is 1 − R² of the indicator regressed on the variables (${R2.wl[0].toFixed(10)})`, fit.fail);
  const dmu = R2.mu[1].map((v, j) => v - R2.mu[0][j]), Sd = R2.cf[1].map((v, j) => v - R2.cf[0][j]), ratio = R2.raw[0].map((v, j) => v / Sd[j]);
  ok(Math.max(...ratio) - Math.min(...ratio) < 1e-10 * Math.abs(ratio[0]), "…its one function points along S_w⁻¹(μ₂ − μ₁)", JSON.stringify(dmu.length));
  ok(/at least as many/.test(lda(mvCols(X.slice(0, 6)), gi.slice(0, 6), G, {}).fail || ""), "too few rows for the variables refused in words");
  ok(/Two groups/.test(lda(mvCols(X), new Int32Array(n), 1, {}).fail || ""), "one group refused in words");
  const dep = X.map((r) => [r[0], r[1], r[0] + r[1], r[3]]); ok(/linearly dependent/.test(lda(mvCols(dep), gi, G, {}).fail || ""), "a column the sum of two others refused in words");
  const ins = [0, 1, 2, 3].map((j) => ({ id: "v" + j, name: "V" + j, unit: "", vals: X.map((r) => r[j]), rows: X.map((_, i) => i) })).concat([{ id: "g", name: "Kind", cats: { keys: Array.from(gi, (g) => ["a", "b", "c"][g]), order: null }, rows: X.map((_, i) => i) }]);
  const K = run("lda", ins, { grp: "g" }), col = (k) => K.tables[0].cols.find((c) => c.k === k);
  ok(!K.fail && col("gname").vals.join() === "a,b,c" && col("pred").vals.length === n && col("dy2").name === "c" && col("cy").vals.length === 3 && K.report.sections.some((s) => /^Left one out: /.test(s.title)), "the analysis: groups by their text, each row classified, the scores a curve a group with the means, the table left one out", K.fail);
  ok(/curves/.test(run("lda", ins, { grp: "g", layout: "curves" }).fail || "") && /Choose the column/.test(run("lda", ins, {}).fail || ""), "curves and no column of groups refused in words");
  const N = 10000, P = 20, Xb = Array.from({ length: P }, () => Float64Array.from({ length: N }, gauss)), gb = Int32Array.from({ length: N }, (_, i) => i % 4); for (let j = 0; j < 3; j++) for (let i = 0; i < N; i++) Xb[j][i] += gb[i] * (j + 1) * 0.3;
  const [Rb, ms] = time(() => lda(Xb, gb, 4, {})); ok(!Rb.fail && ms < 3000, `10⁴ rows of 20 variables in 4 groups, left one out included, in ${ms.toFixed(0)} ms (budget 1 s; node cold gets three times)`);
}

console.log("6.5 PLS regression");
{ const plsFit = get("plsFit"), plsCv = get("plsCv"), plsPredict = get("plsPredict"), plsCoef = get("plsCoef"), plsVip = get("plsVip"), mvCols = get("mvCols");
  // 40 samples of 6 variables driven by 3 factors, one response; and the same with three responses
  const n = 40, p = 6, Fc = mat(n, 3, gauss), L = mat(3, p, gauss), X = mul(Fc, L).map((r) => r.map((v, j) => v + 0.3 * gauss() + 10 * j)), y = Fc.map((r) => 2 * r[0] - r[1] + 0.1 * gauss() + 5);
  const Y3 = Fc.map((r) => [2 * r[0] - r[1] + 0.1 * gauss(), r[2] + 0.1 * gauss(), r[0] + r[2] + 0.1 * gauss()]);
  const Xc = mvCols(X), yc = [Float64Array.from(y)];
  const N = plsFit(Xc, yc, { a: 4, scale: "unit" }), Sm = plsFit(Xc, yc, { a: 4, scale: "unit", algo: "simpls" });
  let worst = 0; for (let a = 1; a <= 4; a++) worst = Math.max(worst, maxDiff(Array.from(plsCoef(N, a).B[0]), Array.from(plsCoef(Sm, a).B[0])) / Math.max(...plsCoef(N, a).B[0].map(Math.abs)));
  ok(worst < 1e-12, `one response: NIPALS and SIMPLS the same coefficients at every number of components (${worst.toExponential(1)})`);
  // every component, more samples than variables: the least squares fit
  const all = plsFit(Xc, yc, { a: p, scale: "none" }), lm = get("linModel")(X[0].map((_, j) => ({ name: "v" + j, num: true, x: X.map((r) => r[j]) })), y, {});
  const cb = plsCoef(all, p); ok(!lm.fail && maxDiff(Array.from(cb.B[0]), lm.b.slice(1)) < 1e-10 * Math.max(...lm.b.map(Math.abs)) && Math.abs(cb.b0[0] - lm.b[0]) < 1e-9 * Math.abs(lm.b[0]), "every component of a table with more samples than variables: the least squares fit");
  // the fitted values: X·B (predict) equals the scores times the Y loadings
  const f1 = plsPredict(N, 3, Xc, n)[0]; let tc = 0; for (let i = 0; i < n; i++) { let s = 0; for (let a = 0; a < 3; a++) s += N.T[a][i] * N.C[a][0]; tc = Math.max(tc, Math.abs(N.ym[0] + N.yf[0] * s - f1[i])); }
  ok(tc < 1e-12 * Math.max(...y.map(Math.abs)), `the samples fitted, predicted again: their fitted values (${tc.toExponential(1)})`);
  // leave one out: as refitting n times
  const C = plsCv(Xc, yc, { amax: 4, scale: "unit", cv: { kind: "loo" } }); let lo = 0;
  for (const i of [0, 7, 19, 39]) { const keep = X.map((_, k) => k).filter((k) => k !== i), Fi = plsFit(mvCols(keep.map((k) => X[k])), [Float64Array.from(keep, (k) => y[k])], { a: 4, scale: "unit", zeroOk: true });
    for (let a = 1; a <= 4; a++) lo = Math.max(lo, Math.abs(plsPredict(Fi, a, X[i].map((v) => Float64Array.of(v)), 1)[0][0] - C.pred[a - 1][0][i])); }
  ok(lo < 1e-12 * Math.max(...y.map(Math.abs)), `leave one out: each sample as a model made without it predicts it (${lo.toExponential(1)})`);
  // the rows' order and a variable's units change nothing
  const perm = Array.from({ length: n }, (_, i) => (i * 13) % n), Cp = plsCv(mvCols(perm.map((i) => X[i])), [Float64Array.from(perm, (i) => y[i])], { amax: 4, scale: "unit", cv: { kind: "loo" } });
  ok(perm.every((i, j) => Math.abs(Cp.pred[2][0][j] - C.pred[2][0][i]) < 1e-12 * 20), "the rows reordered, left one out: each sample's prediction moves with it");
  const Xu = X.map((r) => r.map((v, j) => (j === 2 ? v * 1000 : v))), Nu = plsFit(mvCols(Xu), yc, { a: 3, scale: "unit" });
  ok(maxDiff(Array.from(plsPredict(Nu, 3, mvCols(Xu), n)[0]), Array.from(f1)) < 1e-11 * 20 && Math.abs(plsCoef(Nu, 3).B[0][2] * 1000 - plsCoef(N, 3).B[0][2]) < 1e-11, "a variable in units a thousand times smaller, under unit variance: the same predictions, its coefficient a thousandth");
  const v = plsVip(N, 3); ok(Math.abs(v.reduce((s, x) => s + x * x, 0) / p - 1) < 1e-12, "VIP: its squares average to 1");
  // several responses: each fitted, the two algorithms each their own model
  const N3 = plsFit(Xc, mvCols(Y3), { a: 3, scale: "unit" }), S3 = plsFit(Xc, mvCols(Y3), { a: 3, scale: "unit", algo: "simpls" });
  ok(N3.q === 3 && S3.q === 3 && N3.A === 3 && plsPredict(N3, 3, Xc, n).length === 3, "three responses: a model of three components predicting each");
  // the analysis whole, columns: a row with no response predicted, the number of components the least RMSECV
  const ins = Array.from({ length: p }, (_, j) => ({ id: "v" + j, name: "V" + j, unit: "", vals: X.map((r) => r[j]).concat([X[0][j] + 0.1]), rows: Array.from({ length: n + 1 }, (_, i) => i) }))
    .concat([{ id: "y", name: "Conc", unit: "mg/L", vals: y, rows: y.map((_, i) => i) }]);
  const K = run("pls", ins, { y: ["y"] }), col = (k) => K.tables && K.tables[0].cols.find((c) => c.k === k);
  const rv = col("rv0") && col("rv0").vals, best = rv ? rv.indexOf(Math.min(...rv)) + 1 : -1;
  ok(!K.fail && col("pp0") && col("pp0").vals.length === 1 && K.report.pls.used === best && col("b0").vals.length === p && col("yv0").vals.length === n && K.report.sections.some((s) => /^Components \(\d+ used: the least RMSECV\)$/.test(s.title)),
    `the analysis of columns: ${K.report && K.report.pls && K.report.pls.used} components (the least RMSECV), a row with no response predicted`, K.fail);
  // curves: each a sample, its value of the series the response, one with none predicted
  const xs = Array.from({ length: 200 }, (_, j) => 400 + j), curves = Array.from({ length: 30 }, (_, i) => { const h = 0.5 + (i % 7) * 0.3; return { id: "c" + i, name: "S" + i, unit: "", xn: "Wavelength", xu: "nm",
    pts: { x: xs, y: xs.map((x) => h * Math.exp(-(((x - 500) / 15) ** 2)) + 0.01 * gauss() + 0.2), e: [], rows: xs.map((_, j) => j) }, sv: i === 29 ? null : 10 * h + 0.05 * gauss(), svn: "Concentration", svu: "mM" }; });
  const Kc = run("pls", curves, { layout: "curves", ncomp: 2 }), cc = (k) => Kc.tables && Kc.tables[0].cols.find((c) => c.k === k);
  ok(!Kc.fail && cc("vx").vals.length === 200 && cc("pp0").vals.length === 1 && Math.abs(cc("pp0").vals[0] - 10 * (0.5 + (29 % 7) * 0.3)) < 0.5 && Kc.report.pls.used === 2 && cc("rc0").unit === "mM",
    `curves: the series the response, the curve with none predicted (${cc("pp0") && cc("pp0").vals[0].toFixed(3)} for ${(10 * (0.5 + (29 % 7) * 0.3)).toFixed(3)})`, Kc.fail);
  ok(/Choose the column/.test(run("pls", ins, {}).fail || "") && /three are needed/.test(run("pls", curves.map((c, i) => Object.assign({}, c, { sv: i < 2 ? 1 : null })), { layout: "curves" }).fail || "")
    && /holds text/.test(run("pls", ins.concat([{ id: "t", name: "Label", cats: { keys: y.map(() => "a"), order: null }, rows: y.map((_, i) => i) }]), { y: ["t"] }).fail || ""), "no response, too few samples with a value, a response of text: refused in words");
  ok(/same value in every observation: there is nothing to predict/.test(plsFit(Xc, [new Float64Array(n).fill(3)], {}).fail || ""), "a response of one value refused in words");
  // the budget: 100 curves of 1000 points, 10 components, left one out
  const Xb = Array.from({ length: 1000 }, () => new Float64Array(100)), yb = new Float64Array(100);
  for (let i = 0; i < 100; i++) { const h = rnd(); yb[i] = h + 0.01 * gauss(); for (let j = 0; j < 1000; j++) Xb[j][i] = h * Math.exp(-(((j - 400) / 40) ** 2)) + 0.3 * rnd() * Math.exp(-(((j - 600) / 60) ** 2)) + 0.01 * gauss(); }
  const [Fb, ms] = time(() => { const F = plsFit(Xb, [yb], { a: 10 }); return [F, plsCv(Xb, [yb], { amax: 10, cv: { kind: "loo" } })]; });
  ok(!Fb[0].fail && !Fb[1].fail && ms < 6000, `100 curves of 1000 points, 10 components, left one out, in ${ms.toFixed(0)} ms (budget 2 s in the worker; node cold gets three times)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
