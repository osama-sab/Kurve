# Wave 4: regression and fitting, wider

The fourth wave of `PARITY_SPEC.md`, continuing `FIT_SPEC.md` (the curve fit's ten slices, done
29.10) and the linear model of STATS_SPEC 2.5 (done 12.11). What Origin's fitting does that Kurve
does not: a polynomial solved rather than iterated (4.1), regression on several columns with its
diagnostics and best subsets (4.2), fits compared with each other and across data sets (4.3),
surfaces (4.4), implicit curves (4.5), many more models (4.6), the peak fit's shapes, backgrounds
and deconvolution (4.7), and intervals that do not lean on the fit being well behaved (4.8). This
spec is the wave's: what Origin does, where Kurve stands, the decisions, the data model, the order,
and each slice with what it changes, how it is checked and what it leaves out. It follows the
plan's bar (`PARITY_SPEC.md`, "The bar"), the user's rules of information hygiene (`ux/UX_SPEC.md`
§3.8) and of numbers, not verdicts (STATS_SPEC decision 9), none of which are repeated here.

Origin's documentation could not be opened from this session (its hosts are refused here, as for
waves 1 to 3); what follows rests on Origin's help as remembered and on search engines' readings of
these pages, and the points to check in Origin itself are marked *(to confirm)*:
[Linear and Polynomial Fit](https://www.originlab.com/doc/Origin-Help/LR-Dialog),
[Multiple Linear Regression](https://www.originlab.com/doc/Origin-Help/Multi-Regression),
[Compare Models](https://www.originlab.com/doc/Origin-Help/Compare-Models) and
[Compare Datasets](https://www.originlab.com/doc/Origin-Help/Compare-Datasets),
[3D surface fitting](https://www.originlab.com/doc/Tutorials/Fitting-3D-Surface),
[implicit fitting](https://www.originlab.com/doc/Tutorials/Fitting-Implicit),
[the built-in functions](https://www.originlab.com/doc/Origin-Help/Curve-Fitting-Function),
[Peak Analyzer's baselines](https://www.originlab.com/doc/Origin-Help/PA-Baseline),
[robust regression](https://www.originlab.com/doc/Origin-Help/Robust-Regression) and
[bootstrap](https://www.originlab.com/doc/Origin-Help/Bootstrap) *(to confirm: the last two are
apps or the 2023 Robust Regression tool)*.

NIST's Statistical Reference Datasets, which waves 0 to 3 could not reach, answered this session:
the linear sets (Filip, Longley, Pontius, Wampler 1–5, NoInt1–2), the univariate ones (Lew,
Lottery, Mavro, Michelso, NumAcc1–4, PiDigits) and the 27 nonlinear ones are in `tools/ref/nist/`.

## How Origin does it

- **Linear and polynomial fits** (Analysis › Fitting › Linear Fit, Polynomial Fit): solved by least
  squares, not iterated; the intercept fixed or free, the slope fixed; weights; the apparent fit;
  the coefficients in powers of x with SE, t, p and intervals; the ANOVA; R², adjusted R², the
  residual analysis; outliers. A polynomial's order goes to 9 *(to confirm: 9 or 10)*.
- **Multiple Linear Regression** (Analysis › Fitting › Multiple Linear Regression): a dependent
  column and several independent ones (numbers; categorical through dummy columns *(to
  confirm)*), the intercept fixed or free, weights; the coefficients with SE, t, p, intervals and
  the variance inflation factor; the ANOVA; R², adjusted R², root-MSE; the residuals in four kinds,
  leverage, Cook's distance, DFFITS, covariance ratio; residual plots and partial leverage plots;
  the fitted values and predictions into the worksheet with their confidence and prediction
  limits. **Best subsets** (Partial Least Squares aside, the "Stepwise" and "Best Subset" options
  in the regression dialogs *(to confirm)*): by R², adjusted R², Mallows' Cp, AIC or BIC, the
  best k models of each size.
- **Compare Models** (Analysis › Fitting › Compare Models): two fit results on one data set; the
  F test (nested models), AIC, AICc, BIC, Akaike's weights, the residual sums of squares, a table
  saying which is preferred. **Compare Datasets**: one model on two or more data sets; the
  parameters tested equal (each data set fitted alone against all fitted with every parameter, or
  some, shared) by an F test and by AIC.
- **3D surface fitting** (Analysis › Fitting › Nonlinear Surface Fit): z = f(x, y) from XYZ
  columns or a matrix; the built-in surfaces (Plane, Parabola, Gauss2D, Lorentz2D, Poly2D…,
  Extreme2D, Voigt2D *(to confirm the list)*), your function of x and y; the parameters and their
  statistics, the fitted surface into a matrix, the residuals, a 3D plot.
- **Implicit fitting** (the NLFit dialog's implicit functions): f(x, y; p) = 0 by orthogonal
  distance (ODR), Circle, Ellipse, your function; the parameters and the curve drawn.
- **Functions**: about 200 in categories (Origin Basic Functions, Exponential, Growth/Sigmoidal,
  Hyperbola, Logarithm, Peak Functions, Pharmacology, Power, Rational, Spectroscopy, Waveform,
  Chromatography, Electrophysiology, Statistics, Surface Fitting).
- **Peak Analyzer**: peaks of the built-in shapes and your function (marked as a peak function with
  its centre, area and width parameters *(to confirm)*), EMG and Doniach–Šunjić among the shapes,
  baselines (constant, straight line, exponential, user points, Shirley and Tougaard for XPS *(to
  confirm Tougaard)*), Fourier self-deconvolution *(to confirm: an app)*.
- **Robust regression** (Origin 2023b) and **bootstrap** intervals *(to confirm both)*.

## Where Kurve stands

- **The curve fit** (FIT_SPEC): 25 models and your functions; Levenberg–Marquardt (`lmFit`) or
  orthogonal distance (`odrFit`); limits, constraints, weights, the apparent fit, control, Find
  X/Y, the residual analysis, saved settings, fits that follow. A polynomial of order 1 to 9 is
  iterated like any model (its guess is an exact fit about the mean of X, `polyfit`), so a high
  order far from x = 0 is badly conditioned, and the straight line meets NIST's Norris only to
  3e-8 (`targets.json`).
- **The linear model** (STATS_SPEC 2.5, `linModel`): numbers and factors, interactions, powers,
  Householder QR refined in double-double (NIST's Filip to 14 digits, measured 14.11), the
  coefficients, ANOVA of types I to III, contrasts, estimated means. No weights, no diagnostics per
  row, no predictions, no subsets.
- **Global fits** (`globalFit`, `fitTogether`): shared parameters, a parameter following the
  series, in the worker. Nothing compares the shared fit with separate ones.
- **Peaks**: seven shapes, ties, baselines none to cubic; the background step's methods (arPLS…,
  rolling ball, anchors); no Shirley, no Tougaard, no deconvolution.
- **Matrices** (SHEET_SPEC 3.6): grids of Z, drawn as maps. Nothing fits them.
- **Intervals**: the delta method's (the covariance at the minimum), for every fit.

## Decisions

1. **What is linear in its parameters is solved, not iterated.** The straight line and the
   polynomials (order 1 to 10), in a curve fit, a fit of every column or a fit that follows, are
   solved by least squares through the linear model's QR (`lsqFit`, refined in double-double), in X
   centred and scaled to [−1, 1]; the method is named *Least squares (QR)*. What a direct solve
   cannot honour goes to the iterative fit, started from the solution: a limit typed that the
   solution breaks, a constraint between parameters, the X errors. A fixed coefficient is honoured
   by the direct solve (its column taken out). 1 iteration and Stop stay the iterative fit's.
2. **A polynomial is shown in powers of x and computed about its centre.** Its coefficients are
   reported in powers of x as written (as Origin, and as people write a polynomial), with their
   errors and intervals; the fit also keeps the coefficients and their covariance in the centred X
   it was solved in (`f.poly`), and the curve, its bands, Find X/Y, the residual analysis and the
   worksheet's `fit(B)` are worked out from those, so a narrow range far from zero (dates in
   seconds, a wavenumber window) keeps its digits. The report says about which X it was centred.
3. **Regression on several columns is the linear model analysis, grown.** One analysis kind
   (`lm`, STATS_SPEC 2.5) gains weights, the variance inflation factor and the condition number,
   the per-row diagnostics (leverage, the four residuals, Cook's distance, DFFITS) as columns of its
   result sheet, partial residual plots, and predictions for the rows that have every X and no Y.
   Best subsets is an analysis kind of its own. Neither is a curve fit: a regression on five columns
   has no single X to draw against.
4. **Comparisons are analyses.** Compare models (two to five curve-fit settings on one column) and
   Compare data sets (one setting on two or more columns) are analysis kinds with result sheets,
   History boxes and reports, worked out again when their data change (FOUNDATION_SPEC 1.3), never
   a dialog's passing table. Each reports the numbers (the F test, AIC, AICc, BIC, Akaike's
   weights, the residual sums of squares); none says which model is better (STATS_SPEC decision 9).
5. **Surface and implicit fits are analyses too**, with the data from columns or a matrix, the
   parameters in their report, and what they make (the fitted surface, a residual map, the implicit
   curve's points) written where Kurve keeps such things: a computed matrix sheet, result columns.
   They are not the Fit window's: it fits y against one x on the graph in front.
6. **More models keep the curve fit's bar** (FIT_SPEC slice 3): each with its meaning and units per
   parameter, a guess from the data, a sketch, derived values with errors, search words (Origin's
   names among them, never shown) and the recovery test (at 0.01 % and 2 % noise, within five
   errors). An id never changes once shipped.
7. **Backgrounds are steps first.** Shirley and Tougaard are methods of the Subtract background
   step (so they are seen, checked and undone as every step is) and baselines of the peak fit
   (fitted with the peaks, as XPS does it); Fourier self-deconvolution is a step that warns of the
   noise it raises, as smoothing reports the height it takes.
8. **Robust and bootstrap intervals sit beside the delta method's**, never in its place: a fit says
   which it is, Results shows both when asked, and the report gives both. A robust fit is a
   setting of the fit (its weights by reweighting), saved with it; a bootstrap is worked out in
   the worker, from a seed, and stored with the fit it belongs to.

## The data model

- A curve fit's `ctl.method` gains `"qr"`; a polynomial fit solved directly stores `poly: {c, s,
  b, V}` (the centre and half range of its X, the coefficients in t = (x − c)/s and their
  covariance, scaled as `cov` is); `fitView(f)` is the one door that gives the machinery a fit's
  function, parameters and covariance (the centred ones when `poly` is there and sane, else the
  fit's own).
- `ANA_KINDS.lm`'s settings gain `w` (a column of weights, its values; null none), `diag` (the
  per-row columns, on or off), `pred` (predictions, on or off); `ANA_KINDS.subsets` (`p.y`, `p.crit`,
  `p.best` models of each size, `p.force` columns always in).
- `ANA_KINDS.cmpmod` (`in.cols` one column; `p.fits`: two to five fit settings as `fitSetOf` makes
  them, each with a name) and `ANA_KINDS.cmpdata` (`in.cols` two or more; `p.set` one fit setting;
  `p.test` "all" or a parameter's name).
- `ANA_KINDS.sfit` (`in.cols` X, Y, Z or `p.mat` a matrix sheet; `p.model` a surface's id or `p.fn`
  a formula in x and y; `p.init`, `p.fixed`, `p.lim`; `p.out` the matrix sheet it writes) and
  `ANA_KINDS.ifit` (`in.cols` X, Y; `p.model` circle, ellipse or `p.fn` a formula in x and y equal
  to 0).
- A curve or peak fit's `robust: {kind: "huber"|"bisquare", k}` (null: least squares) and `boot:
  {kind: "cases"|"resid", B, seed, at, ci: [[lo, hi]…], se: […], fails}`.
- The background step's `method` gains `shirley` (`iter`, `tol`, `ends`) and `tougaard` (`B`, `C`,
  `D`, `ends`); the peak fit's `base` gains `shirley` and `tougaard`; a new step `fsd` (`fwhm`,
  `k` the narrowing, `apod`); `PEAKS` gains `emg` and `ds`; a user function marked as a peak
  shape carries `peak: {xc, A, w}` (the names of its centre, area and width parameters).

## The order

4.1 polynomials by QR (the engine and the bench every later slice reuses) → 4.2 multiple regression
(the linear model grown) → 4.3 comparing fits (reads both kinds of fit and the global fit) → 4.8
honest intervals (on every fit kind there is by then) → 4.6 more models (each new model gets 4.8's
intervals and 4.3's comparisons for free) → 4.7 peak fits, further (its shapes reuse 4.6's EMG and
Doniach–Šunjić) → 4.4 surface fits (a new kind of data, the matrix's) → 4.5 implicit fits (the most
special; `odrFit` grown). Each slice is committed and pushed when its checks pass; the wave ends as
every wave does (the suite, a lab day, Origin's tutorials where their data are public, screenshots,
the documents).

## References, by slice

| Slice | Outside reference | Tolerance |
|---|---|---|
| 4.1 | NIST's Norris, Pontius, Filip, Wampler 1–5, NoInt1–2 (certified values); exact rationals (Python's `fractions`) for random polynomials far from zero, weighted and with fixed coefficients; NIST's 27 nonlinear sets from both starts for `lmFit` | certified digits: 1e-12 relative (1e-9 for Filip, rated higher, whose doubles allow about 14 digits); exact: 1e-13; nonlinear: 1e-6 as NIST rates them |
| 4.2 | NIST's Longley; statsmodels' `OLS`, `WLS`, `OLSInfluence` (hat values, Cook's distance, DFFITS, studentized residuals), `variance_inflation_factor`, `get_prediction`; best subsets against every subset enumerated in Python | 1e-12; p 1e-9 |
| 4.3 | closed forms of the nested F test and of AIC, AICc and BIC from the residual sums of squares; SciPy's `curve_fit` for each model's sums; statsmodels' `compare_f_test` | 1e-10 |
| 4.4 | SciPy's `least_squares` (tight tolerances) for nonlinear surfaces; exact rationals for the plane and polynomial surfaces | 1e-8 nonlinear, 1e-12 linear |
| 4.5 | Gander, Golub and Strebel (1994)'s points and published circle and ellipse; SciPy's `odr` in its implicit mode | 1e-6 (as published), 1e-9 against ODRPACK |
| 4.6 | each model's function against mpmath at 30 digits on a grid (the EMG's erfc, Pearson IV's complex gamma, Planck, Debye's integral), each derived value against its definition, each model recovered from its own data | 1e-12 values; recovery within five errors |
| 4.7 | Shirley's iteration and Tougaard's convolution against a Python implementation in `make-fixtures.py` (NumPy, written from the papers); the self-deconvolution against `numpy.fft` | 1e-12 |
| 4.8 | statsmodels' `RLM` (`HuberT`, `TukeyBiweight`, the same scale) for robust lines and polynomials; the bootstrap by simulation (a 95 % interval's coverage over 2 000 data sets within its binomial interval) | 1e-8; coverage |

Each slice adds its fixtures to `make-fixtures.py`, its targets to `ref-test.mjs`, its generator to
`diff-fuzz.py` where a function takes random inputs, and its simulations to `tools/stats-test.mjs`.

## Budgets

A polynomial of order 10 on 10⁶ points solved in under 0.5 s; a regression of 10⁵ rows on 20
columns with its per-row diagnostics in under 1 s (in the worker past `ANA_BIG`); best subsets of 20
columns in under 10 s in the worker; a comparison of three models on 10⁴ points in under 2 s; a
bootstrap of 1 000 resamples of a five-parameter fit on 1 000 points in under 10 s in the worker; a
surface fit of 10⁴ points in under 2 s; nothing on the page for more than 100 ms. `perf.mjs` gains
each.

## 4.1 Polynomials by QR

Done 14.11, as below, with these changes of plan: past 2·10⁶ values of the design the solve is streamed a row at a time
(Givens rotations, `lsqStream`) in doubles, so a million points take 0.35 s in the browser and no copy of the design; NIST's nonlinear sets are checked with Fit control's tolerance at 1e-15 (6 to 11 digits; with the default 1e-12,
5 to 10), and from NIST's first start MGH17, BoxBOD, MGH10 and Eckerle4 end in another minimum or none, named in the
bench; a fixed coefficient is solved in powers of x, so far from zero it is refused in words when the powers cannot be
told apart; Results leaves the method out (the full list, the report and the CSV have it).

**What.** A straight line or a polynomial in the Fit window, a fit of every column, a fit that
follows its data and a saved fit setting are solved directly (decision 1), with no iterations: the
Iterations strip says *Solved directly: a polynomial is linear in its coefficients*; Results, the
report and the CSV name the method *Least squares (QR)* and, for a polynomial, the centre and half
range of X it was solved about. Limits typed that the solution keeps change nothing; one it breaks,
a constraint, or the X errors send the fit to Levenberg–Marquardt (or orthogonal distance) started
from the solution. A polynomial of order 10 (`poly10`) joins the list, for NIST's Filip. The guess
of a polynomial is the same solve.

**Pure** (ANA block, beside `linModel`): `polyLsq(X, Y, W, k, {fixed, p0, centre})` → lmFit's
fields (`params`, `errors`, `cov`, `dep`, `tval`, `pval`, `ci`, `atBound`, `stats` with `iter: 0`,
`converged: true`) and `poly {c, s, b, V}`; the columns t^j in double-double, rows weighted, solved
by `lsqFit` and `lsqCovU`; the coefficients and covariance carried to powers of x in double-double
(`polyRaw`); a fixed coefficient's column taken out in powers of x. `polyEval(poly, x)` (Horner in
t), `polyVar(poly, x)` (uᵀVu).

**Page.** `runFit`, `fitOne` and `followFits` call `polyLsq` for `linear` and `polyN` unless a
constraint, X errors or a broken limit say otherwise; `saveCurveFit` stores `poly` and
`ctl.method:"qr"`; `fitView(f)` (decision 2) feeds `fitModel`'s `f` for evaluation, the band
(`polyVar` in place of the numerical gradient), `findCtx`, `fitDiag`; `ctlText` names the method;
`statsList` *Solved about*; `#polyOrder` to 10; `unitFor` `y/x10`.

**Checked.** `ref-test`: NIST's Norris, Pontius, Filip, Wampler 1–5 (each coefficient, its standard
deviation, the residual SD, R²) and NoInt1–2 (the intercept fixed at 0) through `polyLsq`, closing
`norris.lmFit`'s gap; `fixtures/poly.json` (random polynomials of order 2 to 10 on X near 10⁹, near
10⁴ over a narrow window, weighted, with a fixed coefficient: the fitted values and the residual sum
exact to 1e-13 against rationals, the coefficients where they are determined); NIST's nonlinear
sets through `lmFit` from both starts (certified to 1e-6, those `lmFit` misses from the first start
named in the targets); the fuzzer (`polyLsq@…`); `fit-drive` (a polynomial fitted with no
iterations, the method in Results, a narrow window far from zero drawn smoothly with its band and
Find X/Y right, a limit it breaks sending it to the iterative fit, a fixed intercept, order 10,
undo, a reload, a fit stored before); `odd-test` (junk in `poly` from storage ignored); `perf`.

**Leaves out.** Orthogonal polynomials shown as such; a polynomial in another basis (Chebyshev,
Legendre) as a model of its own; weights from a column with the X errors (as today).

## 4.2 Multiple regression

Done 14.11, as below, with these changes of plan: the per-row columns are the result sheet's row table that *Fitted values
and residuals* made (a Row column, then the fitted value or the prediction, the residual and the rest), so a predicted row
sits among the others in its row's order; every row has its limits when predictions are on; weighted rows are judged as the
weighted fit sees them (R's definitions; statsmodels' influence is for unweighted fits, so the weighted references are its
influence on the whitened problem); best subsets uses a sweep in Gray-code order, swept afresh every 4096 steps, rather than
leaps and bounds (20 columns in 0.8 s), and refuses a column that is a combination of the others; the condition number comes
from a one-sided Jacobi SVD of R (`svdVals`, in NUMERICS for wave 6).

**What.** Analyze › Statistics › ANOVA › Linear model… becomes Analyze › Fit › Multiple regression…
too (the same kind, two doors), and grows:
- **Weights**: a column of weights (its values, as the curve fit's *a column's values*), rows with a
  missing or non-positive weight left out and counted.
- **Collinearity**: each coefficient's variance inflation factor (from the correlation of the
  design's columns, an intercept excluded) and the condition number of the scaled design, in the
  coefficients' table and the model's numbers.
- **Per row** (switched on, `diag`): the fitted value, the residual, the standardized, studentized
  and studentized deleted residuals, the leverage, Cook's distance, DFFITS, as columns of the result
  sheet in the input's rows (a row left out empty).
- **Predictions** (`pred`): the rows with every X and no Y get the predicted value with its
  confidence and prediction limits at the analysis's level, in the same columns.
- **Partial residual plots** (the report's button): a graph per numeric column, the partial
  residuals against it with the line of its coefficient, in a figure, one undo step.
- **Best subsets** (Analyze › Fit › Best subsets…): a response and up to 20 numeric columns (some
  forced in), every subset of each size by leaps and bounds, the best few of each size by R²,
  adjusted R², Mallows' Cp, AIC or BIC (all listed, the criterion the order), each row the columns
  in it and its numbers; a row's *Fit this one* makes a Linear model analysis of it.

**Pure.** `linModel` takes `spec.w` (each row's weight) and returns `vif`, `cond`, and with
`spec.diag` `rows: {fit, res, std, stud, del, h, cook, dffits}` (from the QR: h the squared rows of
Q, the deleted residuals in closed form); `lmPredict(M, rowsX)` (the fitted value, its SE, both
limits); `bestSubsets(X, y, {force, best, crit})` (Furnival and Wilson's leaps and bounds on the
sweep of the correlation matrix, exact sums refined by `lsqFit` for the rows reported).

**Checked.** NIST's Longley (its certified coefficients and SDs); `fixtures/mreg.json` against
statsmodels (`WLS`, `OLSInfluence`, `variance_inflation_factor`, `get_prediction`) on 12 designs; best
subsets against every subset enumerated; stats-test (a deleted residual against refitting without
the row; Cook's distance's definition; leverage summing to the rank); `ana-drive` (weights, the
per-row columns, predictions, VIF, the partial residual figure and its undo, best subsets and *Fit
this one*, a refusal past 20 columns, a reload); `perf`.

**Leaves out.** Stepwise selection (best subsets is exhaustive, and stepwise's p values mislead);
ridge, lasso and PLS (PLS is wave 6); factors in best subsets (numbers only).

## 4.3 Comparing fits

Done 14.11, as below, with these changes of plan: the settings to compare are chosen among the fit on screen, saved fit
settings, your functions and every built-in model from its own guess (not the fit history, whose records keep a summary, not a
setting); every setting is fitted over the same range and with the same weights, chosen in the dialog; Akaike's weights are
from AICc; a nested pair is found by `nestedOf` alone (the same model with parameters fixed, polynomials, the exponential
decays), not said by the user.

**What.** Analyze › Fit › Compare models…: one column, two to five fit settings (the fit on screen,
saved settings, the column's fit history, each a row: its model, name and settings), each fitted to
the same points; the table: each model's points, parameters, residual sum of squares, reduced χ²,
R², AIC, AICc, BIC, ΔAIC and Akaike's weight; for each nested pair (the same model with parameters
fixed, a polynomial of one order lower, the user saying so) the F test. Analyze › Fit › Compare data
sets…: one fit setting, two or more columns; every column fitted alone, then all together with
every parameter shared (or one chosen parameter shared, the others each column's own); the F test
and AIC of the two; each parameter's values side by side.

**Pure** (ANA block): `fitCompare(rows)` (the numbers from each fit's residual sum, n and m;
Akaike's weights; the nested F with its p), `nestedOf(a, b)`; the fits themselves by `lmFit`,
`polyLsq` and `globalFit`, on points the page hands over (the kinds take X, Y and W per column, and a
model description as the worker's `gfit` does).

**Checked.** Closed forms (the F test from two sums, AIC, AICc and BIC from one); `fixtures/cmp.json`
against SciPy's `curve_fit` sums and statsmodels' `compare_f_test`; stats-test (the F test's size
for a true smaller model over 20 000 data sets; data sets drawn from one model rejected at 5 %);
`ana-drive` (both dialogs, the table, a model nested by a fixed parameter, a refusal of models on
different points, followed after a value typed, a reload).

**Leaves out.** A verdict (decision 4); likelihood ratio tests of non-nested models (Vuong's);
comparing peak fits (their models are curve fits' only when written as a function).

## 4.4 Surface fits

Done 15.11, as below, with these changes of plan: the fit is an analysis kind, `surf`, whose dialog has the data's source, the
columns or the matrix, the model, the formula and a parameter grid (start, Fix, lowest, highest); the Gaussian and Lorentzian
surfaces take their height (not a volume) and their FWHM along their own axes, with the turn in degrees, and are described one
way only (the first axis the longer, the turn within ±90°), so two fits of one surface give the same numbers; a polynomial with a
coefficient fixed or limited is fitted by Levenberg–Marquardt from its direct solution; the fitted surface as a matrix is a
matrix computed by the surface's formula with its numbers written in (a polynomial about its centre), and from columns the
residuals are a map of the points coloured by them rather than a matrix. The bench: five polynomial surfaces against exact
rationals (worst 6e-16, each coefficient over its conditioning), six others against SciPy's `least_squares` (each parameter's
difference over its standard error at most 1.5e-6, the errors 1.3e-7), and the fuzzer's random polynomial surfaces, whose
residuals are 40-digit least squares rounded to doubles.

**What.** Analyze › Fit › Surface fit…: the data from three columns (X, Y, Z) or a matrix sheet;
the models plane, paraboloid, polynomial surface of order 2 to 5 (solved directly, decision 1),
two-dimensional Gaussian (turned, its angle a parameter) and Lorentzian, and your formula in x and
y; starts guessed, fixed, limits; the parameters with SE, t, p and intervals, the statistics; the
fitted surface into a computed matrix sheet (over the data's extent, or the matrix's own grid), the
residuals as a column or a matrix sheet drawn as a map.

**Pure.** `SURF_MODELS` (each `{params, f(x, y, p), guess(X, Y, Z), mean, dim}`); the fit by `lmFit`
with X the point's index (as `globalFit` lays sets end to end), the linear surfaces by `lsqFit`.

**Checked.** `fixtures/surf.json` (SciPy's `least_squares` on six surfaces, exact rationals on the
linear ones); recovery of each model; `ana-drive` (from columns and from a matrix, the fitted matrix
and its map, the residual map, a formula of x and y, a refusal, a reload); `perf`.

**Leaves out.** Weights per point from a matrix; surfaces with the X and Y errors; 3D drawing
(wave 7.8).

## 4.5 Implicit fits

Done 15.11, as below, with these changes of plan: each point's distance is the exact one to its nearest place on the curve,
not ODRPACK's penalty (a circle's in closed form, an ellipse's by Eberly's root worked by Newton's method in s and, below −½, in
s + 1, a formula's foot by Newton's projection), and Levenberg–Marquardt fits the parameters to those distances (a circle's and an
ellipse's points about their mean), so `odrFit` is unchanged; the fit is an analysis kind, `impl`, whose dialog has X, Y, the
curve, the formula and the parameter grid (start, Fix, limits), a formula needing a start for each parameter; an ellipse is
described one way (a the longer, θ within ±90°); the sheet has each point's signed distance and foot; Kåsa's circle starts the
circle; the reference is SciPy's least_squares on the parametric form polished on the distances with each foot found globally
(`impl_ref.py`: the parametric form alone left a point on the far side of a thin ellipse and stopped short), with SciPy's `odr`
in its implicit mode beside it, 40-digit distances to ellipses, and Gander, Golub and Strebel's circle and ellipse to every
digit they print.

**What.** Analyze › Fit › Implicit fit…: X and Y columns; a circle (centre and radius), an ellipse
(centre, half axes, turn) or your formula in x and y equal to zero; fitted by orthogonal distance;
the parameters with their errors; the curve's points into result columns (a circle's and an
ellipse's parametrically, a formula's by contouring f = 0 over the data's box), with *Plot it over
the data*.

**Pure.** `odrFit` grows an implicit mode (ODRPACK's: each point's shift in x and y, the constraint
f(x + dx, y + dy) = 0 by a penalty that is driven to zero, the Schur complement per point as
today); `circleGuess` and `ellipseGuess` (algebraic fits, Fitzgibbon's for the ellipse).

**Checked.** Gander, Golub and Strebel's points (their circle and ellipse); SciPy's `odr` in its
implicit mode on random circles, ellipses and a formula (`fixtures/implicit.json`); `ana-drive` (each
model, the plotted curve, a formula, a refusal, a reload).

**Leaves out.** Implicit surfaces; weights other than equal; constraints between parameters.

## 4.6 More models

Done 15.11, as below, with these changes of plan: 80 added (105 in all, polynomials counted once); the normal, Weibull and
Cauchy cumulative curves are the error-function step, Weibull growth and the arctangent step, which carry those names in their
search words, rather than copies; the double logarithm is left out (a power law on log–log axes, or the apparent fit), a
logarithm with an offset in its place; Planck's laws take X in nm or THz and Nernst's y in volts at 25 °C; the Tauc edges fit
the absorption coefficient itself, not its Tauc plot; the Urbach tail is y = exp((x − E1)/Eu); the mpmath fixtures are at
30 digits (each function written again from its formula; the integrals by mpmath's quadrature, Pearson IV's gamma complex);
`gammaInc` is STATS' `igamPQ` and `debyeInt` is `phononInt` (Debye's and Bloch–Grüneisen's integrals).

**What.** From 25 models to about 100, in the Fit window's picker and its kinds, each with the bar
of decision 6. The list, by kind (Origin's names in the search words):
- *Lines and polynomials*: rational functions (1/1, 2/1, 1/2, 2/2), a line through the origin,
  a two-segment line (a break point fitted), the reciprocal, the hyperbola.
- *Growth and decay*: exponential decay with an offset in x, stretched exponential (Kohlrausch),
  Weibull growth, Richards growth, von Bertalanffy, Chapman–Richards, logistic growth with an
  offset, the monomolecular, two-phase association, first-order kinetics A → B → C, the
  Bateman equation (decay through a daughter).
- *Steps and saturation*: the four- and five-parameter logistic, the dose–response with two
  sites, the biphasic dose–response, Langmuir, Freundlich, BET and Sips isotherms, Hill with an
  offset, the error-function step, the hyperbolic tangent step, the arctangent step.
- *Peaks*: the exponentially modified Gaussian, the split Gaussian, the split Lorentzian, Pearson
  IV, Gram–Charlier and Edgeworth peaks, the Doniach–Šunjić, the asymmetric double sigmoid, the
  logistic peak, the hyperbolic secant, the Student's t peak, the Breit–Wigner–Fano (from `PEAKS`),
  the Gaussian with a linear background, two Gaussians, two Lorentzians.
- *Powers and logarithms*: the power law with an offset, the allometric pair (y = a x^b, y = a + b
  x^c), Freundlich, the double logarithm, the Heaviside power, Vogel–Fulcher–Tammann, the Eyring
  equation, the Nernst equation.
- *Physics*: Debye's heat capacity (its integral), Einstein's, Planck's radiation (in wavelength and
  in frequency), Curie–Weiss, Wien, the Drude conductivity, the Bloch–Grüneisen resistivity, the
  Arrhenius with two terms, the Tauc plot's line (direct and indirect gaps), the Urbach tail.
- *Waves*: a sine squared, two sines, a sine with a linear drift, a square-root sine (the chirp),
  a sawtooth fitted smoothly, a Fourier series of order 1 to 4.
- *Distributions*: the normal, log-normal, gamma, Weibull, beta and Cauchy densities scaled by an
  area, and their cumulative curves.

**Pure.** The models in `MODELS` and `MODEL_GROUPS` (two kinds added, Physics and Distributions);
`gammaInc` from STATS for the cumulative curves; `debyeInt` (Debye's integral by Gauss–Legendre and
its series); guesses built on today's (`peakGuess`, `stepGuess`, `decayGuess`, `expGrid`, `waveGuess`,
`linFitXY`).

**Checked.** `fit-test`'s recovery for each new model; `fixtures/models.json` (each function against
mpmath on a grid); the picker's search finding each by an Origin name; `fit-drive` (a model of each
new kind picked, guessed, fitted, its derived values).

**Leaves out.** Models with more than one X (4.4's); models defined by a differential equation (an
ODE solver is wave 9's); Origin's electrophysiology and chromatography lists in full (their common
members are in).

## 4.7 Peak fits, further

Done 15.11, as below, with these changes of plan: a Shirley or Tougaard baseline in the peak fit is worked out from the points
fitted, which the fit keeps (`bx`, `by`), so it draws and refits the same background after a reload and in the worker; Shirley's
ends are fitted, the background for them found again by the iteration (the last four kept, as the Jacobian's central
differences alternate two vectors point by point); Tougaard's is y₀ + B·∫K(T)(y − y₀), the counts above the level being fitted,
so U and the kernel's own integral are worked out once; a fit of every column works each out from its own points, and fitting
them together refuses it in words. The Doniach–Šunjić's α is signed: above 0 its tail goes to higher x (a binding-energy axis),
below to lower (kinetic energy); |α| ≤ 0.9, the line continuous through 0 with a kink in its slope there. The self-deconvolution
says the noise's rise from the filter itself (Parseval: exact for white noise, as measured) and warns once the raised noise
reaches 2 % of the deconvolved bands' height, not at a fixed factor (every useful narrowing raises white noise more than
twice); the apodisations' FWHM by 40-point Gauss–Legendre, so it agrees with mpmath to the last digit. The bench: 12 Shirley,
12 Tougaard and 14 self-deconvolution cases (`fixtures/xps.json`, the references in `tools/ref/xps_ref.py`), worst 0 (bit for
bit), 4e-16 and 2e-15, and the fuzzer's random ones (Shirley bit for bit too, its rounds counted the same, once the ends' means are added
in order as the paper's sum is); the self-deconvolution was 1.2e-12 from `numpy.fft` until Kurve's FFT worked out each twiddle
factor directly instead of by repeated multiplication (its error, a few parts in 10¹⁶ a stage, raised ten thousand times by the
narrowing), and is 7.5e-15 now, its target 1e-13.

**What.** In the peak fit: the exponentially modified Gaussian and the Doniach–Šunjić as shapes;
your function as a shape, once its editor marks which parameters are the centre, the area and the
width; Shirley and Tougaard baselines, fitted with the peaks (Shirley iterated to its fixed point at
each step of the fit; Tougaard's universal cross-section with B fitted, C and D fixed). In the
processing: Shirley and Tougaard as methods of Subtract background (with the step's checks:
over-subtraction, eaten bands), and Fourier self-deconvolution (Data › Transform), its width, its
narrowing factor and its apodisation (Bessel, triangle, Happ–Genzel), the noise it raises measured
and warned of.

**Pure.** `PEAKS.emg` (`[xc, A, w, tau]`, by `erfcx` so a long tail does not overflow), `PEAKS.ds`
(`[xc, A, w, alpha]`), `peakOfUser(fn)`; `shirleyBg(x, y, {iter, tol, ends})`, `tougaardBg(x, y, {B,
C, D})` in PIPE; `fsd(y, {fwhm, k, apod})`.

**Checked.** `fit-test` (each shape's area and FWHM, a recovered doublet of each, a user's Gaussian
as a shape recovering the built-in's numbers); `fixtures/xps.json` (Shirley and Tougaard against
NumPy written from the papers, a self-deconvolution against `numpy.fft`); `pipe-test` (each step's
checks); `fit-drive` (each shape picked, a Shirley baseline fitted with two peaks, a user function as
a shape, the steps in the History).

**Leaves out.** Tougaard's cross-section other than the universal one; the active Shirley–Proctor
background; maximum entropy deconvolution.

## 4.8 Honest intervals

Done 15.11, as below, with these changes of plan: the weights are worked out again from a fit's residuals and its scale when
shown, not stored with it; a robust fit is refused with the X errors or constraints between parameters; the bootstrap is of
the fit on screen only (not a row of a fit of every column), its resamples fitted robustly for a robust fit; checked against
RLM also by the fuzzer, with a polynomial's derivatives exact so its errors agree to 1e-11 (a numerical Jacobian gave 1e-7);
the coverage check is 400 data sets of 30 points (2 000 took a minute), within 92 to 97.5 %, the percentile interval running a
little short at that size.

**What.** In the Fit window's options (curve and peak fits): *Robust* (none, Huber, bisquare), each
fitted by iteratively reweighted least squares with the scale from the median absolute deviation,
its weights shown under the graph as the points' size and in Results; *Bootstrap intervals* (cases or
residuals resampled, 200 to 10 000 resamples, a seed), worked out in the worker with a progress line
and Stop, each parameter's percentile interval and standard error beside the delta method's (Results'
*Bootstrap* section, the report, the CSV). A linear model analysis takes a bootstrap of its
coefficients too.

**Pure.** `robustFit(f, X, Y, p0, fixed, opt)` (IRLS on `lmFit` or `lsqFit`, Huber's k = 1.345 and
the bisquare's 4.685 by default, the scale re-estimated each round); `bootFit(job)` (resamples from
`mulberry32(seed)`, each refitted from the fit's values, failures counted).

**Checked.** statsmodels' `RLM` on lines and polynomials (`fixtures/robust.json`); stats-test (a
robust line not pulled by planted outliers while least squares is; the bootstrap's coverage of a
known slope over 2 000 data sets; the same seed giving the same interval); `fit-drive` (robust
chosen, its weights shown, a bootstrap run, stopped, run again, its section, a reload); `perf`.

**Leaves out.** Least trimmed squares and MM-estimators; the BCa interval (the percentile one only,
said); bootstrap of a global fit.

## Words

New words in the glossary (`ux/UX_SPEC.md` §3.6) with the slice that brings them: *multiple
regression*, *variance inflation factor*, *leverage*, *Cook's distance*, *prediction* (4.2);
*compare models*, *compare data sets*, *Akaike's weight* (4.3); *surface fit* (4.4); *implicit fit*
(4.5); *robust fit*, *bootstrap interval* (4.8). `terms.py` reads 0 at every slice.
