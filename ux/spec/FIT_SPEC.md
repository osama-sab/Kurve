# Curve fit: closing the gap with Origin's fitting dialogs

The next round's task. On 2026-10-21 the curve fit was compared with Origin's fitting dialogs
(Nonlinear Curve Fit, Linear and Polynomial Fit, the Fitting Function Builder and Organizer),
from OriginLab's public help pages and a reading of `kurve.html`. The numbers and the results
are at Origin's level and in places beyond it (a model suggested from the data, every caveat
in `fitWarnings`, orthogonal distance in every fit, global fits); what is missing is mostly
settings fixed inside the code, and a few outputs. The peak fit is not part of this task.

Origin's help pages it was compared with: the NLFit dialog's
[Settings](https://www.originlab.com/doc/en/Origin-Help/NLFit-Dialog-SettingsTab),
[Parameters](https://www.originlab.com/doc/Origin-Help/NLFit-Dialog-ParaTab),
[Bounds](https://www.originlab.com/doc/en/Origin-Help/NLFit-Dialog-BoundsTab) and
[buttons](https://docs.originlab.com/origin-help/nlfit-dialog-button/), the
[Linear Regression dialog](https://www.originlab.com/doc/Origin-Help/LR-Dialog), the
[user-defined functions](https://docs.originlab.com/origin-help/userdef-fitfunc/) and the
[Function Organizer](https://docs.originlab.com/origin-help/fitfunc-organizer/).

## Where it stands

| Origin's part | Kurve now | Gap |
|---|---|---|
| Function selection | 25 built-in models in 6 kinds (`MODELS`, `MODEL_GROUPS`), each with a sketch, searched by name, purpose, parameter or Origin's name; your functions and a library; a suggestion (slice 3) | none |
| Data selection | one column, its range, its mask; every column, alone or together | none worth the work (no concatenated fit) |
| Weights | none, or 1/σ² from the Y error column; X errors by orthogonal distance | counting (1/y), a column's values as weights, apparent fit |
| Fitted curves | drawn with a confidence band and a prediction band at the fit's level (slice 4) | the points, the curve past the data |
| Find X/Y | in Results: Y at an X with its interval, every X at a Y with each one's error; a column filled either way (slice 5) | none |
| Fit control | Levenberg–Marquardt, 400 iterations and a tolerance of 10⁻¹² fixed in `lmFit` | shown and set: method, iterations, tolerance |
| Quantities | every parameter's value, error, t, p, CI at any level, dependency; derived values; n, dof, χ²ᵣ, R², adjusted R², RSS, AIC, BIC, iterations; ANOVA, covariance and correlation matrices (slice 4) | none |
| Residual analysis | regular, standardised, studentised and studentised deleted residuals, under the graph and in six views in Results; outliers with Mask them; a runs test (slice 4) | none |
| Output | Results, copied table, report, CSV, fit history; the fitted values and residuals as computed worksheet columns (slice 6) | none |
| Code tab | none (Kurve runs no code) | starting values and constraints as formulas |
| Parameters tab | one grid: name, unit, meaning, start, Fix, limits, fitted ± error, 95 % interval, dependency, digits (slice 2) | share in the grid |
| Bounds tab | limits for every model, < or ≤, over a function's own (slice 2) | none |
| Buttons | Fit, Guess, Fit every column…, Remove fit, Done | 1 Iteration |
| Saved settings, Recalculate | none; an out-of-date fit is marked | fit settings by name; refit when the data change |
| Lower panel | the live graph, the residual panel, the formula, a summary line, the iterations as they go (slice 1), the model's sketch on its button (slice 3) | none |
| Linear and Polynomial | a polynomial of order 1 to 9, its order beside the model (slice 3); Fix on a or b fixes the intercept or slope; outliers (slice 4) | apparent fit |
| Function Builder | one editor: name, formula, live check, parameters with start, limits and unit, preview | category, meanings, start formulas, constraints, derived values |
| Function Organizer | the model list's groups | your functions filed by category |

## Decisions (the defaults; the user may change them)

1. **Where it lives.** In the docked Fit window, beside the live graph, never a modal dialog
   (DESIGN.md: a dialog makes the desk inert, and the graph is the preview). Origin's upper
   panel becomes the window's parts: Model, Parameters (with the limits), Options (data,
   weights, fit control) and Output; its lower panel becomes a strip at the foot of the
   window (the iterations, the formula, the model's sketch) above Fit and Done. In a dock
   360 to 420 px wide the parameter grid drops columns by container query, as the band table
   does, and the full grid is in Results.
2. **No code.** Kurve runs nothing but arithmetic. Starting values and constraints are
   formulas compiled by `compileExpr`, with the data's own measures (`max(y)`, `x at max`,
   the half width) as names; there is no script before or after a fit.
3. **Linear and polynomial fits** are models of the same window (a polynomial with an order),
   not a dialog of their own; their own options (apparent fit, outliers) are in Options.
4. **Words.** Kurve's own (the glossary, `tools/ux/terms.py` at 0), never Origin's names
   (NLFit, LabTalk, X-Function, ExpDec1): "Exponential decay, two terms", not ExpDec2.

## The work, in slices

Each slice ships on its own: unit tests, a drive, its help article, DESIGN.md's reason,
CLAUDE.md, the menu spec when a menu changes.

1. **Fit control and stepping** (done 2026-10-21; *Remove fit* moved into the fit's summary
   to keep the footer one row; 1 iteration is not offered with the X errors). The draft carries `ctl = {maxIter, tol, method}` (method:
   Levenberg–Marquardt, or orthogonal distance when X errors are on); `lmFit` and `odrFit`
   take `opt.maxIter` and `opt.tol` instead of their fixed 400 and 10⁻¹². A **1 Iteration**
   button takes one step from the current starts and makes the result the new starts; Fit
   runs on to convergence. A strip lists the iterations as they go (number, χ²ᵣ, λ, the
   parameters) with Stop for a long fit. The fit stores `ctl`; Results, the report's Method
   and the CSV state it; `fitWarnings` says when the iteration limit stopped the fit.
2. **One parameter grid** (done 2026-10-22; Share stays in Fit every column…, where fitting
   together is chosen; the digits change what is shown, not the numbers exported).
   Parameter (and unit), its meaning, Start, Fix, Lowest, Highest
   (each `<` or `≤`), Fitted ± error, CI and dependency; Share when fitting columns together.
   Every model gets limits, kept on the draft (`d.lo`, `d.hi`, `d.strict`) over the model's
   own; a strict limit stops just inside it, and a parameter that reaches it is "at its
   limit" as now. Digits per parameter.
3. **More models, found easily** (done 2026-10-22; Origin's names find a model in the search,
   never name it; the picker shares the font picker's popover). About 25 built-in models, each with its parameters'
   meanings and units, a guess from the data, derived values with errors, and a recovery test
   in `tools/fit-test.mjs`: polynomial of order 1 to 9 (one model, its order a setting;
   `polyfit` about the mean); exponential decay with one, two and three terms, growth, rise
   to a plateau; power law, logarithm; logistic, dose–response, Hill, Gompertz, Boltzmann;
   Gaussian, Lorentzian, Voigt and pseudo-Voigt (from `PEAKS`), log-normal, extreme value;
   sine and damped sine; Michaelis–Menten, Arrhenius. The picker becomes a searchable list by
   kind, each with its formula and a sketch drawn from typical values. Stored fits keep
   working: a model's id never changes once shipped (`poly2` reads as a polynomial of order 2).
4. **Quantities and residual analysis** (done 2026-10-22; the views other than against X are in Results, since the panel under the
   graph shares the graph's X; outliers past a Bonferroni limit, so clean data rarely flag one; a heavy fit's analysis is worked out
   when opened). A confidence level (90, 95, 99 % or typed) for the
   intervals and both bands, which needs a t quantile for any level (`tQuantile975` is the
   97.5 % one only); an ANOVA table (regression, residual and total sums of squares, degrees
   of freedom, mean squares, F and its p, which needs the F distribution); the covariance and
   correlation matrices from `f.cov`. Residuals regular, standardised, studentised (the
   leverage from the Jacobian) or studentised deleted, in the panel under the graph, which
   can also show them against the fitted value, in order, as a histogram, on probability
   paper and against the one before. Outliers: points whose studentised deleted residual is
   past the t limit, listed, with "Mask them" (one undo entry).
5. **Find X/Y** (done 2026-10-29; answered as it is typed, a section of Results chosen under
   *In the results*; a touch without a crossing found and said, with no error; a column filled
   is data, recorded as a fill is, not following a later fit). In Results: type a Y, get every X within the fit's range where the curve
   takes it (bisection), and type an X, get Y with its confidence interval (the delta
   method); or fill a worksheet column with either, from a column of values.
6. **The fit in the worksheet** (done 2026-10-29; the columns are formulas of their own,
   `fit(B)` and `resid(B)`, typed like any; once per column; a masked point's residual kept). "Put the fit in the worksheet": columns of the fitted values
   and the residuals beside the column fitted, computed, not recorded (out of `rawCols` and
   the fingerprint, as formula columns are), written again by a new fit and marked out of date
   with it.
7. **How points count.** Weights: none, the Y error column (1/σ²), counting (1/y, for counts;
   refused where y ≤ 0), or a column's values as the weights. An apparent fit fits in the
   graph's log space when an axis is logarithmic. `weightText` names every case.
8. **Starting values and constraints as formulas.** A parameter's start may be a formula of
   the data in range (`max(y) - min(y)`, `xmax`, `fwhm`); equalities between parameters
   (`xc2 = xc1 + 5`) work as ties do in the peak fit (the tied one fixed, the model applying
   it, `linkResult` carrying the errors); inequalities between two parameters (`w1 < w2`) by
   reparametrisation. The hardest slice; the last of the fit itself.
9. **Saved fit settings, and refitting.** Fit settings saved by name (model, starts or their
   formulas, limits, fixed, weights, control, range rule), in the project or the browser as
   saved styles are; a fit can follow its data (refit when its column's processing or data
   change, as peak sets follow theirs, `followPeakSets`), with a log line and no undo entry of
   its own.
10. **The function editor, grown.** A category, each parameter's meaning, start formulas,
    constraints and derived values (formulas of the parameters, with errors by the delta
    method); and an organizer for your functions (by category, renamed, moved, deleted, taken
    from the library).

## Rules to keep

- Every reader of a fit goes through `fitModel`, `activeFit`, `shownFit`; a new caveat goes
  into `fitWarnings`, so the report never says less than the screen.
- Non-finite numbers are stored as `null`. Old projects' fits load and draw as before.
- Changes to the draft and the fit are undoable (`S.draft` is in the snapshot).
- Tests: `tools/fit-test.mjs` for every new number (an iteration limit, one step equal to the
  first step of a fit, every model's recovery, ANOVA against a closed form for a line,
  leverage and studentised residuals against known values, the t and F quantiles, Find X/Y,
  each weighting); `tools/odd-test.mjs` for the edges (one iteration, a tolerance of zero,
  equal limits, a strict limit at the start); a drive clicking every new control; the help
  articles for the Fit window, Results, Find X/Y and the residual analysis.
