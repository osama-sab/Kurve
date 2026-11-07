# The reference bench

Kurve's numbers checked against numbers Kurve did not compute (`ux/spec/PARITY_SPEC.md`, wave 0).

| What | Where |
|---|---|
| NIST's Statistical Reference Datasets, with their certified values | `nist/` (Norris, and the ANOVA sets SiRstv, SmLs01–09, AtmWtAg; copied from SciPy's tests, which ship NIST's own files) |
| Reference values made by SciPy, NumPy and statsmodels | `fixtures/*.json`, made by `make-fixtures.py` |
| The pure blocks of `kurve.html` under node | `run.mjs` (a module, and a program reading cases on stdin) |
| Kurve against the fixtures and NIST | `../ref-test.mjs` (node alone; part of the suite) |
| Random cases against SciPy | `diff-fuzz.py` (needs the Python packages) |

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
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py           # write them again
```

`--check` makes every case again and compares it with the committed file to 1e-13 relative; a
newer SciPy that answers differently is seen there, before any test is changed. The fixtures were
first made with Python 3.13.17, NumPy 2.5.4, SciPy 1.18.1 and statsmodels 0.15.0 (each file says
what made it). `scipy.odr` is deprecated from SciPy 1.17 and goes in 1.19; its successor is the
`odrpack` package, the same Fortran.

NIST's site (`www.itl.nist.gov`) holds the certified values SciPy and statsmodels do not ship
(Longley, Filip, Wampler 1–5, Pontius, NoInt, the univariate sets); this session's network refused
it, so it is asked for in the environment's settings when the plan's wave 2 needs it.

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
