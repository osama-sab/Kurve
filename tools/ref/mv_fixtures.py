"""Reference values for wave 6, many variables (ux/spec/MULTI_SPEC.md), made by NumPy, SciPy, scikit-learn and statsmodels,
and by mpmath at 40 digits where double precision is the question.

    PYREF=… python3.13 -I tools/ref/mv_fixtures.py [--check] [--only mv-svd,…]

Writes tools/ref/fixtures/mv-<slice>.json, each {"made": {...versions...}, "cases": [...]}, every case
{"fn": Kurve's function, "name", "args": [...], "want": the reference's answer, "kind": how ref-test.mjs judges it}:

    svd    {s, U, V}: the singular values over the largest, each pair of vectors by its angle to the reference's times its
           gap over the largest; the reconstruction and orthogonality are judged from Kurve's answer alone
    sval   {s}: each singular value relative to itself (a graded matrix, against 40 digits)
    eig    {vals, vecs}: the same for a symmetric matrix's eigenvalues and vectors
    fail   the reference refuses: Kurve must refuse in words

Kept apart from make-fixtures.py, with the same --check (every case made again and compared with the committed file to
1e-13 relative). Inputs come from fixed seeds, rounded to 6 significant digits so the files stay small.
"""
import json, math, os, sys, platform

here = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
check = "--check" in args
if os.environ.get("PYREF"):
    sys.path.insert(0, os.environ["PYREF"])
import numpy as np
import scipy
import mpmath

try:
    import sklearn
except ImportError:
    sklearn = None

MADE = {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__, "mpmath": mpmath.__version__,
        "sklearn": getattr(sklearn, "__version__", None), "by": "tools/ref/mv_fixtures.py"}

def j(v):
    if isinstance(v, dict): return {k: j(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)): return [j(x) for x in v]
    if isinstance(v, np.ndarray): return j(v.tolist())
    if isinstance(v, (np.floating, float)):
        v = float(v); return v if math.isfinite(v) else ("NaN" if v != v else ("Infinity" if v > 0 else "-Infinity"))
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, np.bool_): return bool(v)
    return v

def r6m(A): return [[float(f"{float(v):.6g}") for v in row] for row in np.asarray(A)]
out = {}

# The sign rule (MULTI_SPEC decision 2): each column of V turned so its entry of largest magnitude is positive, the first
# of equal ones; U's column with it.
def flip(U, V):
    U, V = U.copy(), V.copy()
    for c in range(V.shape[1]):
        a = np.abs(V[:, c]); b = int(np.argmax(a >= a.max() * (1 - 1e-12)))   # the first of equal ones, to 1e-12
        if V[b, c] < 0: V[:, c] *= -1; U[:, c] *= -1
    return U, V

# ---- 6.1 the singular value decomposition and the symmetric eigenproblem ----
cases = []
rng = np.random.default_rng(20261119)
def svd_case(A, name):
    A = np.array(A, dtype=float); U, s, Vt = np.linalg.svd(A, full_matrices=False); U, V = flip(U, Vt.T)
    cases.append({"fn": "svd", "name": name, "args": [A.tolist()], "want": {"s": s, "U": U, "V": V}, "kind": "svd"})
for m, n in ((1, 1), (1, 6), (6, 1), (2, 2), (3, 3), (5, 3), (3, 5), (10, 4), (4, 10), (12, 12), (30, 30), (40, 120), (120, 40)):
    svd_case(r6m(rng.normal(size=(m, n)) * 10 ** rng.uniform(-3, 3)), f"random {m}x{n}")
for m, n, k in ((20, 15, 3), (15, 20, 5), (30, 8, 1), (8, 30, 7)):
    svd_case(r6m(rng.normal(size=(m, k)) @ rng.normal(size=(k, n))), f"rank {k} of {m}x{n}")
# repeated singular values: orthogonal factors around a diagonal with ties (the vectors of a tie are judged by the subspace)
for m, n, d in ((8, 6, [5, 5, 2, 2, 2, 1]), (6, 9, [3, 1, 1, 1, 0.5, 0.5])):
    Q1, _ = np.linalg.qr(rng.normal(size=(m, m))); Q2, _ = np.linalg.qr(rng.normal(size=(n, n))); D = np.zeros((m, n)); np.fill_diagonal(D, d)
    svd_case(Q1 @ D @ Q2.T, f"repeated values {m}x{n}")
svd_case([[0.0, 0.0], [0.0, 0.0]], "zero 2x2")
svd_case([[3.0, 0, 0], [0, -4.0, 0], [0, 0, 1e-5]], "diagonal")
svd_case(np.outer(r6m([rng.normal(size=7)])[0], r6m([rng.normal(size=5)])[0]), "rank one 7x5")
svd_case(r6m(rng.normal(size=(9, 7)) * 1e150), "large values 9x7")
svd_case(r6m(rng.normal(size=(7, 9)) * 1e-150), "small values 7x9")
# Hilbert matrices, against 40 digits on the doubles themselves
mpmath.mp.dps = 40
def mp_svd(A):
    M = mpmath.matrix([[mpmath.mpf(float(v)) for v in row] for row in A])
    m, n = M.rows, M.cols; T = m < n
    U, S, V = mpmath.svd_r(M.T if T else M)          # M = U·diag(S)·V, V holding the right vectors as rows
    k = min(m, n); s = [float(S[i]) for i in range(k)]
    Uf = np.array([[float(U[i, c]) for c in range(k)] for i in range(U.rows)]); Vf = np.array([[float(V[c, i]) for c in range(k)] for i in range(V.cols)])
    if T: Uf, Vf = Vf, Uf
    o = np.argsort(-np.array(s), kind="stable"); s = np.array(s)[o]; Uf = Uf[:, o]; Vf = Vf[:, o]
    Uf, Vf = flip(Uf, Vf); return s, Uf, Vf
for n in (2, 3, 4, 6, 8, 10, 12):
    H = np.array([[1.0 / (i + jj + 1) for jj in range(n)] for i in range(n)]); s, U, V = mp_svd(H)
    cases.append({"fn": "svd", "name": f"Hilbert {n} (40 digits)", "args": [H.tolist()], "want": {"s": s, "U": U, "V": V}, "kind": "svd"})
H = np.array([[1.0 / (i + jj + 1) for jj in range(6)] for i in range(10)]); s, U, V = mp_svd(H)
cases.append({"fn": "svd", "name": "Hilbert 10x6 (40 digits)", "args": [H.tolist()], "want": {"s": s, "U": U, "V": V}, "kind": "svd"})
# Graded by columns: a well-conditioned matrix times a diagonal spanning ten decades. One-sided Jacobi after QR with column
# pivoting keeps each singular value to its own digits (Demmel and Veselić): judged relative to itself, against 40 digits.
for m, n in ((12, 6), (8, 8), (6, 10)):
    G = rng.normal(size=(m, n)); D = 10.0 ** (-10 * np.arange(n) / (n - 1)); A = np.array(r6m(G * D)) if m >= n else np.array(r6m((G.T * 10.0 ** (-10 * np.arange(m) / (m - 1))).T))
    s, _, _ = mp_svd(A)
    cases.append({"fn": "svd", "name": f"graded {m}x{n} (40 digits)", "args": [A.tolist()], "want": {"s": s}, "kind": "sval"})
cases.append({"fn": "svd", "name": "empty", "args": [[]], "want": {"fail": "empty"}, "kind": "fail"})
cases.append({"fn": "svd", "name": "a value that is not a number", "args": [[[1.0, "NaN"], [2.0, 3.0]]], "want": {"fail": "NaN"}, "kind": "fail"})
cases.append({"fn": "svd", "name": "rows of two lengths", "args": [[[1.0, 2.0], [3.0]]], "want": {"fail": "ragged"}, "kind": "fail"})

def eig_case(A, name, mp=False):
    A = np.array(A, dtype=float)
    if mp:
        M = mpmath.matrix([[mpmath.mpf(float(v)) for v in row] for row in A]); E, Q = mpmath.eigsy(M)
        w = np.array([float(E[i]) for i in range(M.rows)]); Vv = np.array([[float(Q[i, c]) for c in range(M.rows)] for i in range(M.rows)])
    else:
        w, Vv = np.linalg.eigh(A)
    o = np.argsort(-w, kind="stable"); w = w[o]; Vv = Vv[:, o]; _, Vv = flip(Vv, Vv)
    cases.append({"fn": "symEig", "name": name, "args": [A.tolist()], "want": {"vals": w, "vecs": Vv}, "kind": "eig"})
for n in (1, 2, 3, 5, 10, 25, 60):
    B = rng.normal(size=(n, n)) * 10 ** rng.uniform(-2, 2); eig_case(r6m((B + B.T) / 2), f"random symmetric {n}")
for n, d in ((6, [4, 4, 4, 1, -2, -2]), (5, [1e-8, 0, 0, -3, 7])):
    Q, _ = np.linalg.qr(rng.normal(size=(n, n))); eig_case(Q @ np.diag(d) @ Q.T, f"known eigenvalues {d}")
for n in (4, 8, 12):
    eig_case([[1.0 / (i + jj + 1) for jj in range(n)] for i in range(n)], f"Hilbert {n} (40 digits)", mp=True)
eig_case(np.diag([3.0, -1.0, 2.0, 0.0]), "diagonal")
T = np.diag(np.full(20, 2.0)) - np.diag(np.ones(19), 1) - np.diag(np.ones(19), -1); eig_case(T, "the second difference, 20")
eig_case(r6m(np.cov(rng.normal(size=(50, 8)) @ rng.normal(size=(8, 8)), rowvar=False)), "a covariance matrix 8")
cases.append({"fn": "symEig", "name": "not square", "args": [[[1.0, 2.0, 3.0], [2.0, 1.0, 0.0]]], "want": {"fail": "square"}, "kind": "fail"})
out["mv-svd"] = cases

# ---- 6.2 principal components, against scikit-learn's PCA (svd_solver="full", whose signs follow the same rule since 1.5);
# Hotelling's T² and the Q residuals with their limits written from Tracy, Young and Mason (1992) and Jackson and Mudholkar
# (1979) in NumPy, the quantiles by scipy.stats ----
from scipy import stats as _st
cases = []
rng = np.random.default_rng(20261120)
def pca_ref(X, scale, k, level):
    X = np.array(X, dtype=float); n, m = X.shape; mu = X.mean(axis=0); sd = X.std(axis=0, ddof=1)
    f = sd if scale == "unit" else np.sqrt(sd) if scale == "pareto" else np.ones(m)
    Z = (X - mu) / f; r = min(n - 1, m); k = max(1, min(r, k))
    from sklearn.decomposition import PCA
    P = PCA(n_components=min(n, m), svd_solver="full").fit(Z)
    ev_all = P.explained_variance_; ev = ev_all[:r]; share = P.explained_variance_ratio_[:r]
    V = P.components_[:k].T; T = P.transform(Z)[:, :k]
    t2 = np.sum(T ** 2 / ev[:k], axis=1); E = Z - T @ V.T; q = np.sum(E ** 2, axis=1); a = 1 - level
    t2lim = (n - 1) ** 2 / n * _st.beta.isf(a, k / 2, (n - k - 1) / 2) if n - k - 1 > 0 else None
    rest = ev_all[k:]; rest = rest[rest > 0]; t1, tt2, t3 = rest.sum(), (rest ** 2).sum(), (rest ** 3).sum(); qlim = None
    if t1 > 1e-12 * ev_all[ev_all > 0].sum() and tt2 > 0:
        h0 = 1 - 2 * t1 * t3 / (3 * tt2 ** 2); c = _st.norm.isf(a); b = c * np.sqrt(2 * tt2 * h0 * h0) / t1 + 1 + tt2 * h0 * (h0 - 1) / t1 ** 2
        qlim = t1 * b ** (1 / h0) if h0 > 0 and b > 0 else (tt2 / t1) * _st.chi2.isf(a, t1 * t1 / tt2)
    out = {"ev": ev, "share": share, "V": V.ravel(), "T": T.ravel(), "t2": t2, "q": q, "mean": mu, "f": f}
    if t2lim is not None: out["t2lim"] = t2lim
    if qlim is not None: out["qlim"] = qlim
    return out
def pca_case(X, scale, k, level, name):
    cases.append({"fn": "pcaFlat", "name": name, "args": [np.array(X).tolist(), {"scale": scale, "k": k, "level": level}], "want": pca_ref(X, scale, k, level), "kind": "obj"})
for n, m, scale, k, level in ((10, 3, "unit", 2, 0.95), (40, 6, "unit", 3, 0.95), (40, 6, "none", 2, 0.99), (40, 6, "pareto", 4, 0.9), (200, 12, "unit", 5, 0.95),
                              (5, 4, "none", 2, 0.95), (3, 2, "unit", 1, 0.95), (25, 25, "unit", 6, 0.95), (60, 30, "none", 10, 0.95)):
    L = rng.normal(size=(m, max(1, m // 2))); X = r6m(rng.normal(size=(n, L.shape[1])) @ L.T + 0.3 * rng.normal(size=(n, m)) + rng.uniform(-50, 50, m))
    pca_case(X, scale, k, level, f"{n} observations of {m}, {scale}, k {k}")
# curves: each an observation, its points the variables (n < m)
xs = np.arange(300)
for n in (8, 20):
    Y = np.array([3 * (1 + rng.random()) * np.exp(-((xs - 100) / 15) ** 2) + 2 * rng.random() * np.exp(-((xs - 180) / 9) ** 2) + 0.02 * rng.normal(size=300) for _ in range(n)])
    pca_case(r6m(Y), "none", 3, 0.95, f"{n} curves of 300 points, centred")
# a variable at another scale: unit variance does not see it
X = rng.normal(size=(30, 4)) @ rng.normal(size=(4, 4)); X[:, 2] *= 1e6
pca_case(r6m(X), "unit", 2, 0.95, "one variable a million times the others, unit variance")
cases.append({"fn": "pca", "name": "a constant variable under unit variance", "args": [[[1.0, 2.0], [1.0, 3.0], [1.0, 5.0]], {"scale": "unit"}], "want": {"fail": "constant"}, "kind": "fail"})
cases.append({"fn": "pca", "name": "one observation", "args": [[[1.0, 2.0]], {}], "want": {"fail": "n"}, "kind": "fail"})
out["mv-pca"] = cases

# ---- 6.3 clustering: Lloyd's k-means against scikit-learn from the same starting centres, silhouettes against scikit-learn,
# linkage, cophenetic correlation, the dendrogram's leaves and cuts against SciPy; labels renumbered by the data (decision 8) ----
from scipy.cluster import hierarchy as _hc
from scipy.spatial.distance import pdist as _pdist
cases = []
rng = np.random.default_rng(20261121)
def renum(lab):
    mp = {}; return [mp.setdefault(int(v), len(mp)) for v in lab]
def blobs(n, m, k, spread):
    C = rng.normal(0, 4, size=(k, m)); lab = rng.integers(0, k, n); return np.array(r6m(C[lab] + rng.normal(0, spread, size=(n, m))))
for n, m, k, spread in ((30, 2, 3, 1.0), (100, 4, 4, 1.5), (200, 3, 5, 2.5), (60, 10, 2, 3.0), (12, 2, 4, 0.5)):
    X = blobs(n, m, k, spread); init = X[rng.choice(n, k, replace=False)]
    from sklearn.cluster import KMeans
    K = KMeans(n_clusters=k, init=init, n_init=1, algorithm="lloyd", tol=0.0, max_iter=300).fit(X)
    lab = renum(K.labels_); order = []; [order.append(int(v)) for v in K.labels_ if int(v) not in order]
    C = K.cluster_centers_[order]
    cases.append({"fn": "kmeansFrom", "name": f"k-means of {n} × {m}, k {k}", "args": [X.tolist(), init.tolist()], "want": {"lab": lab, "C": C.ravel(), "inertia": float(K.inertia_)}, "kind": "obj"})
    from sklearn.metrics import silhouette_samples
    cases.append({"fn": "silFlat", "name": f"silhouettes of {n} × {m}, k {k}", "args": [X.tolist(), lab], "want": silhouette_samples(X, lab), "kind": "vec"})
for n, m in ((8, 2), (25, 3), (60, 5), (40, 30)):
    X = blobs(n, m, 3, 2.0)
    for method in ("single", "complete", "average", "ward"):
        for metric in (("euclidean", "correlation") if method != "ward" and m > 2 else ("euclidean",)):
            D = _pdist(X, metric); Z = _hc.linkage(D, method=method); want = {"pairs": Z[:, [0, 1, 3]].ravel(), "h": Z[:, 2], "coph": float(_hc.cophenet(Z, D)[0]), "leaves": _hc.dendrogram(Z, no_plot=True)["leaves"]}
            for k in range(2, min(5, n) + 1): want["k%d" % k] = renum(_hc.fcluster(Z, k, criterion="maxclust"))
            cases.append({"fn": "linkFlat", "name": f"{method} on {metric}, {n} × {m}", "args": [X.tolist(), method, metric], "want": want, "kind": "obj"})
cases.append({"fn": "linkFlat", "name": "Ward on correlation", "args": [[[1.0, 2.0, 3.0], [2.0, 1.0, 0.0], [5.0, 5.0, 4.0]], "ward", "correlation"], "want": {"fail": "ward"}, "kind": "fail"})
out["mv-clu"] = cases

def write_or_check(name, cases):
    doc = {"made": MADE, "cases": j(cases)}
    path = os.path.join(here, "fixtures", name + ".json")
    if not check:
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(doc, fh, indent=0, separators=(",", ":"))
            fh.write("\n")
        print(f"wrote {path} ({len(cases)} cases)")
        return 0
    old = json.load(open(path, encoding="utf-8"))
    bad = 0
    def same(a, b):
        if isinstance(a, list) and isinstance(b, list):
            return len(a) == len(b) and all(same(u, v) for u, v in zip(a, b))
        if isinstance(a, dict) and isinstance(b, dict):
            return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return a == b or abs(a - b) <= 1e-13 * max(abs(a), abs(b))
        return a == b
    for i, (a, b) in enumerate(zip(doc["cases"], old["cases"])):
        if not same(a, b):
            bad += 1
            print(f"  {name}[{i}] {a.get('fn')}: differs from the committed value")
    if len(doc["cases"]) != len(old["cases"]):
        bad += 1
        print(f"  {name}: {len(doc['cases'])} cases made, {len(old['cases'])} committed")
    print(f"{name}: {'same' if not bad else str(bad) + ' different'} (committed with {old['made']}, made with {MADE})")
    return bad

only = args[args.index("--only") + 1].split(",") if "--only" in args else None
bad = sum(write_or_check(k, v) for k, v in out.items() if not only or k in only)
sys.exit(1 if bad else 0)
