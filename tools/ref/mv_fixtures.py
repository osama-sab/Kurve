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

# ---- 6.4 discriminant analysis: scikit-learn's LinearDiscriminantAnalysis (svd solver) for the posteriors, the classes and
# leave one out (cross_val_predict), the canonical functions from SciPy's generalised eigenproblem eigh(B, W) in NumPy (raw
# coefficients with a within-group variance of 1, the sign rule on the standardised ones), Wilks' Λ against statsmodels' MANOVA,
# each variable alone against scipy.stats.f_oneway ----
cases = []
rng = np.random.default_rng(20261122)
from scipy import linalg as _la, stats as _st2
def lda_ref(X, g, priors):
    from sklearn.discriminant_analysis import LinearDiscriminantAnalysis as LDA
    from sklearn.model_selection import cross_val_predict, LeaveOneOut
    X = np.array(X); g = np.array(g); n, p = X.shape; G = g.max() + 1; ng = np.bincount(g); mean = X.mean(0)
    mu = np.array([X[g == k].mean(0) for k in range(G)]); D = X - mu[g]; W = D.T @ D; Bm = sum(ng[k] * np.outer(mu[k] - mean, mu[k] - mean) for k in range(G))
    lam, V = _la.eigh(Bm, W); o = np.argsort(-lam); q = min(p, G - 1); lam = lam[o][:q]; V = V[:, o][:, :q] * np.sqrt(n - G)
    sd = np.sqrt(np.sum(D * D, 0) / (n - G)); std = V * sd[:, None]
    for k in range(q):
        a = np.abs(std[:, k]); b = int(np.argmax(a >= a.max() * (1 - 1e-12)))
        if std[b, k] < 0: V[:, k] *= -1; std[:, k] *= -1
    cst = -mean @ V; Sw = W / (n - G); struct = (Sw @ V) / sd[:, None]
    wl = [float(np.prod(1 / (1 + lam[k:]))) for k in range(q)]; x2 = [-(n - 1 - (p + G) / 2) * np.log(L) for L in wl]
    pri = np.full(G, 1 / G) if priors == "equal" else ng / n; Si = np.linalg.inv(Sw); cf = (Si @ mu.T).T; c0 = -0.5 * np.sum(mu * cf, 1) + np.log(pri)
    # the posteriors by Fisher's functions with S_w = W/(n − G), as SPSS, R's MASS and Origin; left one out by refitting each time
    def postOf(Xq, mu_, Si_, pri_):
        d = Xq @ (Si_ @ mu_.T) - 0.5 * np.sum(mu_ * (Si_ @ mu_.T).T, 1) + np.log(pri_); e = np.exp(d - d.max(1, keepdims=True)); return e / e.sum(1, keepdims=True)
    post = postOf(X, mu, Si, pri); pred = np.argmax(post, 1); ploo = np.zeros((n, G))
    for i in range(n):
        keep = np.arange(n) != i; Xk, gk = X[keep], g[keep]; nk = np.bincount(gk, minlength=G); muk = np.array([Xk[gk == k].mean(0) for k in range(G)]); Dk = Xk - muk[gk]
        Swk = Dk.T @ Dk / (n - 1 - G); prk = pri if priors == "equal" else nk / (n - 1); ploo[i] = postOf(X[i:i + 1], muk, np.linalg.inv(Swk), prk)[0]
    loo = np.argmax(ploo, 1)
    # Wilks' Λ = det W / det T, in 40 digits on the data's own doubles
    mpmath.mp.dps = 40; Xm = [[mpmath.mpf(float(v)) for v in r] for r in X]; mm = [mpmath.fsum(Xm[i][j] for i in range(n)) / n for j in range(p)]
    mg = [[mpmath.fsum(Xm[i][j] for i in range(n) if g[i] == k) / ng[k] for j in range(p)] for k in range(G)]
    Wm = mpmath.matrix(p, p); Tm = mpmath.matrix(p, p)
    for i in range(n):
        for a in range(p):
            for b in range(p): Wm[a, b] += (Xm[i][a] - mg[g[i]][a]) * (Xm[i][b] - mg[g[i]][b]); Tm[a, b] += (Xm[i][a] - mm[a]) * (Xm[i][b] - mm[b])
    wl0 = float(mpmath.det(Wm) / mpmath.det(Tm))
    uniF = [float(_st2.f_oneway(*[X[g == k, j] for k in range(G)]).statistic) for j in range(p)]
    return {"ev": lam, "wl": wl, "wl0": wl0, "x2": x2, "raw": V.T.ravel(), "cst": cst, "std": std.T.ravel(), "struct": struct.T.ravel(), "scores": (X @ V + cst).T.ravel(),
            "cf": cf.ravel(), "c0": c0, "post": post.ravel(), "pred": pred, "loo": loo, "ploo": ploo.ravel(), "uniF": uniF}
for n, p, G, sep, priors in ((30, 2, 3, 2.0, "prop"), (60, 4, 3, 1.0, "prop"), (90, 5, 4, 0.8, "equal"), (40, 3, 2, 1.5, "prop"), (120, 8, 5, 0.7, "prop"), (25, 2, 2, 0.6, "equal")):
    M = rng.normal(0, sep, size=(G, p)); g = np.sort(np.concatenate([np.arange(G), rng.integers(0, G, n - G)])); L = rng.normal(size=(p, p)) * 0.4 + np.eye(p)
    X = np.array(r6m(M[g] + rng.normal(size=(n, p)) @ L + rng.uniform(-20, 20, p)))
    cases.append({"fn": "ldaFlat", "name": f"{n} rows, {p} variables, {G} groups, priors {priors}", "args": [X.tolist(), g.tolist(), {"priors": priors}], "want": lda_ref(X, g, priors), "kind": "obj"})
# the same arithmetic with W divided by n, as scikit-learn 1.9's svd solver: its posteriors, classes and leave one out
def lda_sk(X, g, priors):
    from sklearn.discriminant_analysis import LinearDiscriminantAnalysis as LDA
    from sklearn.model_selection import cross_val_predict, LeaveOneOut
    X = np.array(X); g = np.array(g); G = g.max() + 1; pri = np.full(G, 1 / G) if priors == "equal" else None
    l = LDA(solver="svd", priors=pri).fit(X, g); ploo = cross_val_predict(LDA(solver="svd", priors=pri), X, g, cv=LeaveOneOut(), method="predict_proba")
    return {"post": l.predict_proba(X).ravel(), "pred": l.predict(X), "ploo": ploo.ravel(), "loo": np.argmax(ploo, 1)}
for n, p, G, sep, priors in ((45, 3, 3, 1.2, "prop"), (60, 4, 4, 1.0, "equal"), (30, 2, 2, 0.8, "prop")):
    M = rng.normal(0, sep, size=(G, p)); g = np.sort(np.concatenate([np.arange(G), np.arange(G), rng.integers(0, G, n - 2 * G)])); X = np.array(r6m(M[g] + rng.normal(size=(n, p))))
    cases.append({"fn": "ldaFlat", "name": f"as scikit-learn 1.9 (W/n): {n} rows, {p} variables, {G} groups, priors {priors}", "args": [X.tolist(), g.tolist(), {"priors": priors, "cov": "n"}], "want": lda_sk(X, g, priors), "kind": "obj"})
cases.append({"fn": "ldaFlat", "name": "more variables than n − G", "args": [[[1.0, 2.0, 3.0], [2.0, 1.0, 0.5], [3.0, 3.0, 1.0], [0.0, 1.0, 2.0]], [0, 0, 1, 1], {}], "want": {"fail": "df"}, "kind": "fail"})
cases.append({"fn": "ldaFlat", "name": "one group", "args": [[[1.0, 2.0], [2.0, 1.0], [3.0, 3.0]], [0, 0, 0], {}], "want": {"fail": "groups"}, "kind": "fail"})
out["mv-lda"] = cases

# ---- 6.5 PLS regression: scikit-learn's PLSRegression (tol 1e-15) for one Y; NIPALS taken to its limit (each X weight the first
# left singular vector of XₖᵀYₖ, as scikit-learn's power iteration converges to) and SIMPLS from de Jong (1993) written in NumPy for
# several; cross-validated predictions by refitting on each fold's rest in NumPy (KFold's contiguous blocks, leave one out, venetian
# blinds as i mod k), checked against scikit-learn's cross_val_predict for one Y; VIP from Wold, Sjöström and Eriksson (2001) ----
cases = []
rng = np.random.default_rng(20261123)
def lead(v):
    a = np.abs(v); return int(np.argmax(a >= a.max() * (1 - 1e-12)))
def pls_np(X, Y, a, scale, algo):
    X = np.array(X, float); Y = np.array(Y, float).reshape(len(X), -1); n, p = X.shape; q = Y.shape[1]
    xm, ym = X.mean(0), Y.mean(0)
    if scale:
        xs, ys = X.std(0, ddof=1), Y.std(0, ddof=1); xs[xs == 0] = 1; ys[ys == 0] = 1
    else:
        xs, ys = np.ones(p), np.ones(q)
    Z, F = (X - xm) / xs, (Y - ym) / ys
    W, T, P, C, R = [], [], [], [], []
    if algo == "nipals":
        Xk, Yk = Z.copy(), F.copy()
        for k in range(a):
            U_, s_, Vt = np.linalg.svd(Xk.T @ Yk, full_matrices=False); w = U_[:, 0].copy()
            if w[lead(w)] < 0: w = -w
            t = Xk @ w; tt = t @ t; pl = Xk.T @ t / tt; c = Yk.T @ t / tt
            Xk = Xk - np.outer(t, pl); Yk = Yk - np.outer(t, c)
            W.append(w); T.append(t); P.append(pl); C.append(c)
        W, T, P, C = (np.array(v).T for v in (W, T, P, C))
        R = W @ np.linalg.inv(P.T @ W)
    else:
        S = Z.T @ F; V = np.zeros((p, 0))
        for k in range(a):
            c = np.array([1.0]) if q == 1 else np.linalg.eigh(S.T @ S)[1][:, -1]
            r = S @ c; t = Z @ r; nt = np.linalg.norm(t); t = t / nt; r = r / nt
            if r[lead(r)] < 0: r, t = -r, -t
            pl = Z.T @ t; cl = F.T @ t
            v = pl - V @ (V.T @ pl); v = v - V @ (V.T @ v); v = v / np.linalg.norm(v)
            V = np.column_stack([V, v]); S = S - np.outer(v, v @ S)
            R.append(r); T.append(t); P.append(pl); C.append(cl); W.append(r / np.linalg.norm(r))
        W, T, P, C, R = (np.array(v).T for v in (W, T, P, C, R))
    B = R @ C.T; coef = (B * ys[None, :] / xs[:, None]).T; b0 = ym - coef @ xm; fit = ym + (X - xm) @ coef.T
    ssy = np.sum(T ** 2, 0) * np.sum(C ** 2, 0); Wn = W / np.linalg.norm(W, axis=0); vip = np.sqrt(p * (Wn ** 2 @ ssy) / ssy.sum())
    ssx = np.sum(T ** 2, 0) * np.sum(P ** 2, 0); r2x = np.cumsum(ssx) / np.sum(Z ** 2)
    return {"coef": coef.ravel(), "b0": b0, "xw": W.ravel(), "xs": T.ravel(), "xl": P.ravel(), "yl": C.ravel(), "xr": R.ravel(), "fit": fit.ravel(), "vip": vip, "r2x": r2x}
# SIMPLS in 40 digits: written as de Jong has it, S deflated a component at a time, which in doubles lost up to 2e-9 of the
# coefficients where the later components are small (against NIPALS's, which in exact arithmetic are the same for one Y)
def pls_mp(X, Y, a, scale):
    mpmath.mp.dps = 40; mf = mpmath.mpf; X = np.array(X, float); Y = np.array(Y, float).reshape(len(X), -1); n, p = X.shape; q = Y.shape[1]
    Xm = [[mf(float(v)) for v in r] for r in X]; Ym = [[mf(float(v)) for v in r] for r in Y]
    xm = [mpmath.fsum(Xm[i][j] for i in range(n)) / n for j in range(p)]; ym = [mpmath.fsum(Ym[i][k] for i in range(n)) / n for k in range(q)]
    if scale:
        xs = [mpmath.sqrt(mpmath.fsum((Xm[i][j] - xm[j]) ** 2 for i in range(n)) / (n - 1)) for j in range(p)]; ys = [mpmath.sqrt(mpmath.fsum((Ym[i][k] - ym[k]) ** 2 for i in range(n)) / (n - 1)) for k in range(q)]
        xs = [v if v != 0 else mf(1) for v in xs]; ys = [v if v != 0 else mf(1) for v in ys]
    else:
        xs, ys = [mf(1)] * p, [mf(1)] * q
    Z = [[(Xm[i][j] - xm[j]) / xs[j] for j in range(p)] for i in range(n)]; F = [[(Ym[i][k] - ym[k]) / ys[k] for k in range(q)] for i in range(n)]
    S = [[mpmath.fsum(Z[i][j] * F[i][k] for i in range(n)) for k in range(q)] for j in range(p)]; V = []
    R, T, P, C, W = [], [], [], [], []
    for _ in range(a):
        if q == 1: c = [mf(1)]
        else:
            M = mpmath.matrix([[mpmath.fsum(S[j][u] * S[j][v] for j in range(p)) for v in range(q)] for u in range(q)]); E, Q = mpmath.eigsy(M)
            b = max(range(q), key=lambda i: E[i]); c = [Q[k, b] for k in range(q)]
        r = [mpmath.fsum(S[j][k] * c[k] for k in range(q)) for j in range(p)]; t = [mpmath.fsum(Z[i][j] * r[j] for j in range(p)) for i in range(n)]
        nt = mpmath.sqrt(mpmath.fsum(v * v for v in t)); t = [v / nt for v in t]; r = [v / nt for v in r]
        rf = np.array([float(v) for v in r])
        if rf[lead(rf)] < 0: r = [-v for v in r]; t = [-v for v in t]
        pl = [mpmath.fsum(Z[i][j] * t[i] for i in range(n)) for j in range(p)]; cl = [mpmath.fsum(F[i][k] * t[i] for i in range(n)) for k in range(q)]
        v = pl[:]
        for _r in range(2):
            for u in V:
                d = mpmath.fsum(u[j] * v[j] for j in range(p)); v = [v[j] - d * u[j] for j in range(p)]
        nv = mpmath.sqrt(mpmath.fsum(x * x for x in v)); v = [x / nv for x in v]; V.append(v)
        for k in range(q):
            d = mpmath.fsum(v[j] * S[j][k] for j in range(p))
            for j in range(p): S[j][k] -= v[j] * d
        nr = mpmath.sqrt(mpmath.fsum(x * x for x in r))
        R.append(r); T.append(t); P.append(pl); C.append(cl); W.append([x / nr for x in r])
    A = len(R)
    B = [[mpmath.fsum(R[l][j] * C[l][k] for l in range(A)) * ys[k] / xs[j] for j in range(p)] for k in range(q)]
    b0 = [ym[k] - mpmath.fsum(B[k][j] * xm[j] for j in range(p)) for k in range(q)]
    fit = [[ym[k] + mpmath.fsum(B[k][j] * (Xm[i][j] - xm[j]) for j in range(p)) for k in range(q)] for i in range(n)]
    ssy = [mpmath.fsum(c * c for c in C[l]) for l in range(A)]; den = mpmath.fsum(ssy)
    vip = [mpmath.sqrt(p * mpmath.fsum(ssy[l] * W[l][j] ** 2 for l in range(A)) / den) for j in range(p)]
    ss0 = mpmath.fsum(z * z for r_ in Z for z in r_); cum = mpmath.mpf(0); r2x = []
    for l in range(A): cum += mpmath.fsum(x * x for x in P[l]); r2x.append(cum / ss0)
    fl = lambda L, m: [float(L[l][i]) for i in range(m) for l in range(A)]
    return {"coef": [float(v) for b in B for v in b], "b0": [float(v) for v in b0], "xw": fl(W, p), "xs": fl(T, n), "xl": fl(P, p), "yl": fl(C, q), "xr": fl(R, p),
            "fit": [float(v) for r_ in fit for v in r_], "vip": [float(v) for v in vip], "r2x": [float(v) for v in r2x]}
def pls_sk(X, Y, a, scale):
    from sklearn.cross_decomposition import PLSRegression
    X = np.array(X, float); Y = np.array(Y, float).reshape(len(X), -1)
    m = PLSRegression(n_components=a, scale=scale, tol=1e-15, max_iter=100000).fit(X, Y)
    coef = m.coef_.reshape(Y.shape[1], -1)
    return {"coef": coef.ravel(), "b0": m.intercept_ - coef @ X.mean(0), "xw": m.x_weights_.ravel(), "xs": m.x_scores_.ravel(), "xl": m.x_loadings_.ravel(),
            "yl": m.y_loadings_.ravel(), "fit": m.predict(X).reshape(len(X), -1).ravel()}
def folds(n, kind, k):
    if kind == "loo": return [[i] for i in range(n)]
    if kind == "venetian": return [list(range(f, n, k)) for f in range(k)]
    from sklearn.model_selection import KFold
    return [list(te) for _, te in KFold(k).split(np.zeros((n, 1)))]
def cv_np(X, Y, A, scale, algo, kind, k):
    X = np.array(X, float); Y = np.array(Y, float).reshape(len(X), -1); n, q = Y.shape; pred = np.full((A, n, q), np.nan)
    for te in folds(n, kind, k):
        tr = np.setdiff1d(np.arange(n), te); Xt, Yt = X[tr], Y[tr]
        xm, ym = Xt.mean(0), Yt.mean(0)
        if scale:
            xs, ys = Xt.std(0, ddof=1), Yt.std(0, ddof=1); xs[xs == 0] = 1; ys[ys == 0] = 1
        else:
            xs, ys = np.ones(X.shape[1]), np.ones(q)
        ref = pls_mp(Xt, Yt, A, scale) if algo == "simpls" else pls_np(Xt, Yt, A, scale, algo)
        R = np.array(ref["xr"]).reshape(X.shape[1], A); C = np.array(ref["yl"]).reshape(q, A)
        Zt = (X[te] - xm) / xs; acc = np.zeros((len(te), q))
        for a in range(A):
            acc = acc + np.outer(Zt @ R[:, a], C[:, a]); pred[a][te] = ym + ys * acc
    return pred
def cv_sk(X, Y, A, scale, kind, k):
    from sklearn.cross_decomposition import PLSRegression
    from sklearn.model_selection import cross_val_predict, LeaveOneOut, KFold, PredefinedSplit
    X = np.array(X, float); Y = np.array(Y, float).reshape(len(X), -1); n = len(X)
    cv = LeaveOneOut() if kind == "loo" else KFold(k) if kind == "blocks" else PredefinedSplit(np.arange(n) % k)
    return np.array([cross_val_predict(PLSRegression(n_components=a, scale=scale, tol=1e-15, max_iter=100000), X, Y, cv=cv).reshape(n, -1) for a in range(1, A + 1)])
def data(n, p, q, kind):
    if kind == "spectra":   # bands on a slope, the responses their heights
        x = np.linspace(0, 1, p); H = rng.uniform(0.2, 2, size=(n, 3)); base = [np.exp(-((x - c) / w) ** 2) for c, w in ((0.3, 0.05), (0.55, 0.08), (0.75, 0.04))]
        X = H @ np.array(base) + rng.normal(0, 0.01, size=(n, p)) + rng.uniform(-0.1, 0.1, size=(n, 1)) * x
        Y = H[:, :q] * np.array([3.0, -1.5, 0.7])[:q] + rng.normal(0, 0.02, size=(n, q))
    else:
        L = rng.normal(size=(3, p)); Fc = rng.normal(size=(n, 3)); X = Fc @ L + rng.normal(0, 0.3, size=(n, p)) + rng.uniform(-50, 50, p)
        Y = Fc @ rng.normal(size=(3, q)) + rng.normal(0, 0.2, size=(n, q)) + rng.uniform(-5, 5, q)
    return np.array(r6m(X)), np.array(r6m(Y))
worst = 0.0
for n, p, q, kind, a, scale in ((30, 5, 1, "cols", 3, True), (40, 6, 1, "cols", 2, False), (35, 120, 1, "spectra", 5, False), (25, 4, 1, "cols", 4, True)):
    X, Y = data(n, p, q, kind); want = pls_sk(X, Y, a, scale); ref = pls_np(X, Y, a, scale, "nipals")
    worst = max(worst, max(float(np.max(np.abs(np.array(want[k]) - np.array(ref[k]))) / (np.max(np.abs(ref[k])) or 1)) for k in want))
    want.update({"vip": ref["vip"], "r2x": ref["r2x"]})
    # one Y: the coefficients, intercept and fitted values are SIMPLS's too, so from 40 digits (scikit-learn's intercept less the
    # coefficients times the means, in doubles, carries 1e-12 of cancellation where the variables sit far from 0)
    exact = pls_mp(X, Y, a, scale); want.update({"coef": exact["coef"], "b0": exact["b0"], "fit": exact["fit"]})
    cases.append({"fn": "plsFlat", "name": f"NIPALS, one Y: {n} × {p}{', scaled' if scale else ''}, {a} components (scikit-learn)", "args": [X.tolist(), Y[:, 0].tolist(), {"a": a, "scale": scale}], "want": want, "kind": "obj"})
    cases.append({"fn": "plsFlat", "name": f"SIMPLS, one Y: {n} × {p}{', scaled' if scale else ''}, {a} components", "args": [X.tolist(), Y[:, 0].tolist(), {"a": a, "scale": scale, "algo": "simpls"}],
                  "want": pls_mp(X, Y, a, scale), "kind": "obj"})
print(f"  NIPALS in NumPy against scikit-learn, one Y: {worst:.1e}")
worst = 0.0
for n, p, q, kind, a, scale in ((50, 8, 3, "cols", 4, True), (40, 150, 2, "spectra", 4, False), (30, 5, 2, "cols", 3, False)):
    X, Y = data(n, p, q, kind)
    for algo in ("nipals", "simpls"):
        ref = pls_np(X, Y, a, scale, algo) if algo == "nipals" else pls_mp(X, Y, a, scale)
        if algo == "nipals":
            sk = pls_sk(X, Y, a, scale); worst = max(worst, max(float(np.max(np.abs(np.array(sk[k]) - np.array(ref[k]))) / (np.max(np.abs(ref[k])) or 1)) for k in sk))
        cases.append({"fn": "plsFlat", "name": f"{algo.upper()}, {q} Ys: {n} × {p}{', scaled' if scale else ''}, {a} components", "args": [X.tolist(), Y.tolist(), {"a": a, "scale": scale, "algo": algo}], "want": ref, "kind": "obj"})
print(f"  NIPALS at its limit against scikit-learn's power iteration (tol 1e-15), several Ys: {worst:.1e}")
# every component, n > p: the least squares fit
X, Y = data(30, 4, 1, "cols"); Xa = np.column_stack([np.ones(30), X]); bl = np.linalg.lstsq(Xa, Y[:, 0], rcond=None)[0]
cases.append({"fn": "plsFlat", "name": "every component of 30 × 4: the least squares fit", "args": [X.tolist(), Y[:, 0].tolist(), {"a": 4, "scale": True}], "want": {"coef": bl[1:], "b0": [bl[0]], "fit": Xa @ bl}, "kind": "obj"})
# cross-validated predictions
worst = 0.0
for n, p, q, kind, A, scale, algo, cvk, k in ((30, 5, 1, "cols", 4, True, "nipals", "loo", 0), (36, 80, 1, "spectra", 5, False, "nipals", "blocks", 5), (32, 6, 1, "cols", 4, True, "nipals", "venetian", 4),
                                               (34, 7, 1, "cols", 4, False, "simpls", "blocks", 7), (40, 8, 3, "cols", 4, True, "nipals", "loo", 0), (36, 60, 2, "spectra", 4, False, "simpls", "venetian", 6)):
    X, Y = data(n, p, q, kind); pred = cv_np(X, Y, A, scale, algo, cvk, k)
    if q == 1 and algo == "nipals": worst = max(worst, float(np.max(np.abs(cv_sk(X, Y, A, scale, cvk, k) - pred)) / np.max(np.abs(pred))))
    Yarg = Y[:, 0].tolist() if q == 1 else Y.tolist()
    cases.append({"fn": "plsCvFlat", "name": f"{algo.upper()} cross-validated, {cvk}{' ' + str(k) if k else ''}: {n} × {p}, {q} Y{'s' if q > 1 else ''}, {A} components", "args": [X.tolist(), Yarg, {"amax": A, "scale": scale, "algo": algo, "cv": {"kind": cvk, "k": k}}],
                  "want": {"pred": pred.ravel()}, "kind": "obj"})
print(f"  cross-validation in NumPy against scikit-learn's cross_val_predict, one Y: {worst:.1e}")
cases.append({"fn": "plsFlat", "name": "a constant variable, scaled", "args": [[[1.0, 2.0], [1.0, 3.0], [1.0, 5.0], [1.0, 4.0]], [1.0, 2.0, 4.0, 3.0], {"scale": True}], "want": {"fail": "constant"}, "kind": "fail"})
cases.append({"fn": "plsFlat", "name": "a constant response", "args": [[[1.0, 2.0], [2.0, 3.0], [3.0, 5.0], [4.0, 4.0]], [2.0, 2.0, 2.0, 2.0], {}], "want": {"fail": "constant"}, "kind": "fail"})
cases.append({"fn": "plsFlat", "name": "two observations", "args": [[[1.0, 2.0], [2.0, 3.0]], [1.0, 2.0], {}], "want": {"fail": "n"}, "kind": "fail"})
out["mv-pls"] = cases

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
