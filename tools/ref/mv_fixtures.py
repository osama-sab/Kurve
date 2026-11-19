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
        b = int(np.argmax(np.abs(V[:, c])))
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
