# The reference bench

Kurve's numbers checked against numbers Kurve did not compute (`ux/spec/PARITY_SPEC.md`, wave 0).

| What | Where |
|---|---|
| NIST's Statistical Reference Datasets, with their certified values | `nist/` (Norris, and the ANOVA sets SiRstv, SmLs01–09, AtmWtAg; copied from SciPy's tests, which ship NIST's own files) |
| Reference values made by SciPy, NumPy and statsmodels | `fixtures/*.json`, made by `make-fixtures.py` |
| The pure blocks of `kurve.html` under node | `run.mjs` (a module, and a program reading cases on stdin) |
| Kurve against the fixtures and NIST | `../ref-test.mjs` (node alone; part of the suite) |
| Random cases against SciPy | `diff-fuzz.py` (needs the Python packages) |
| Exact references shared by both | `refs.py` (rationals and 40-digit mpmath), `xps_ref.py` (Shirley's and Tougaard's backgrounds and the self-deconvolution in NumPy, written from the papers), `impl_ref.py` (implicit fits by orthogonal distance: each point's foot on a circle, an ellipse or a parabola found globally, the parameters polished with the distances' exact Jacobian) |

`node tools/ref-test.mjs` needs nothing but node: the fixtures are committed. It prints each
function's worst error against its target. A function short of its target fails unless
`TARGET` in `ref-test.mjs` names the slice of the plan that brings it there; it must then not get
worse than the error it was measured at (`now`), so an accuracy once reached is kept.

## Making the fixtures again

The Python packages are not in the repository. In a fresh cloud container (whose `pip` installs
for Python 3.13; the default `python3` is 3.11):

```sh
PYREF=/tmp/pyref                      # anywhere outside the repository
pip install --quiet --target "$PYREF" numpy scipy statsmodels
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py --check   # compare with the committed files
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py --slow    # also range.json: 40-digit studentized range and Dunnett (about half an hour, four cores)
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py           # write them again
```

`--check` makes every case again and compares it with the committed file to 1e-13 relative; a
newer SciPy that answers differently is seen there, before any test is changed. The fixtures were
first made with Python 3.13.17, NumPy 2.5.4, SciPy 1.18.1 and statsmodels 0.15.0 (each file says
what made it). `scipy.odr` is deprecated from SciPy 1.17 and goes in 1.19; its successor is the
`odrpack` package, the same Fortran.

NIST's site (`www.itl.nist.gov`) holds the certified values SciPy and statsmodels do not ship.
It answered on 14.11 (wave 4), and its files are committed in `nist/`: the linear sets (Norris,
Pontius, Filip, Longley, Wampler 1–5, NoInt1–2), the univariate ones (Lew, Lottery, Mavro, Michelso,
NumAcc1–4, PiDigits), the ANOVA ones (SiRstv, SmLs01–09, AtmWtAg) and the 27 nonlinear ones (Misra1a
to Bennett5), each read by the tests as NIST wrote it.

## Wave 5's references

`tools/ref/sig_fixtures.py` makes `fixtures/sig-*.json` (signal processing and mathematics, `ux/spec/SIGNAL_SPEC.md`) from
NumPy, SciPy and PyWavelets, apart from `make-fixtures.py` so a slice's references are made in seconds; `--check` and
`--only` as there. It needs PyWavelets beside the others (`pip install --target "$PYREF" PyWavelets`). First made with Python
3.13.18, NumPy 2.5.5, SciPy 1.18.1 and PyWavelets 1.8.0. `ref-test.mjs` judges each array by its worst error over the
reference's largest |value| (a `scale` given where the answer is rounding, as a detrended residual), a complex one over its
largest modulus, a refusal of SciPy's as one of Kurve's.

The suite's menu crawl (`tools/ux/crawl.py`) needs Python's `playwright` package of the same version as node's (1.63.0 on
18.11: `pip install --target "$PYREF" playwright==1.63.0`; the browser already installed is used, nothing is downloaded).
`tools/suite.sh` puts `$PYREF` on its path.

## The fuzzer

```sh
PYREF=$PYREF python3.13 -I tools/ref/diff-fuzz.py [seed] [cases per function]
```

Makes random inputs from a seed (values spread over many orders of magnitude, edges, ties), runs
each through Kurve's function (one `node tools/ref/run.mjs` for all of them) and through SciPy,
and reports every case past its tolerance with the seed that makes it again. It ends 1 when
something failed.

## Adding a function

1. Its cases in `make-fixtures.py` (from a fixed seed), and the file made again.
2. Its target in `TARGET` in `ref-test.mjs`, and its check there.
3. Its generator in `diff-fuzz.py`.
4. A new function of Kurve is called through `run.mjs` by its name: nothing needs listing.
