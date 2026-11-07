# Closing the gap with Origin: the plan

The user, on 2026-11-07, after the comparison of Kurve with OriginPro 2026 and 2026b made the same
day: "I want to implement them, not for show, but properly and robustly, which means we have to
create a fool-proof plan to create quality first app features, even if it takes long time and
tokens." This is that plan. It is the order of the work, the bar every piece of it has to clear,
and the decisions, all taken on 07.11. Each wave below gets a spec of its own (as `FIT_SPEC.md` and
`PLOT_SPEC.md` were), written at the start of the wave, before its code: Origin's behaviour from
its documentation, the decisions, the data model, the slices with their acceptance tests.

The comparison found eleven weak points; in the order of their cost to a user:

1. A project cannot leave the browser (no project file).
2. Statistics stop at descriptive numbers (no tests, no ANOVA, no nonparametric tests, no
   multivariate methods).
3. The worksheet is not a data table (numbers only, column formulas only, no filter, no reshaping,
   one sheet on screen, no matrices).
4. A whole analysis cannot be run again on new files (no analysis templates, no batch of files
   into a summary sheet; results live in windows, not in sheets).
5. Fitting is deep but narrow (25 models, one independent variable, no multiple regression, no
   surface or implicit fits, no model comparison, no Shirley or Tougaard, no deconvolution).
6. Signal processing is thin (no FFT output, no correlation or convolution, no filter design, no
   wavelets, no interpolation into a column).
7. Few graph types (no 3D, polar, ternary, pie, statistical charts).
8. A simple graph structure (no free axes beyond one right axis, no templates that re-plot).
9. Few file formats (no xlsx, MATLAB, HDF5, NetCDF; no digitizer).
10. No scripting or extensions.
11. Fits on the page (scale).

Most of 2, 3, 4 and 7 come from one root: a column is a curve against an X and holds numbers. So
the plan starts with the foundations that change that, and builds the features on them, rather
than adding features one by one on a model that cannot carry them.

## The bar: what "properly" means

A slice is done only when it clears every gate below. The gates are the plan's point; the features
are the easy part.

1. **Right against an outside reference.** Every number is compared with one that Kurve did not
   compute:
   - NIST's Statistical Reference Datasets, with their certified values (the ANOVA sets SiRstv,
     SmLs01–09 and AtmWtAg and the regression set Norris ship with SciPy's tests, so they can be
     copied from there; Longley ships with statsmodels; Filip, Wampler 1–5, Pontius, NoInt and the
     univariate sets Lew, Lottery, Mavro, Michelso, NumAcc1–4 and PiDigits need
     `www.itl.nist.gov`, which this session's network refused: the environment's network
     settings can allow it when wave 2 needs it).
   - SciPy 1.18, statsmodels 0.15 and, where needed, scikit-learn and PyWavelets, installed for
     Python 3.13 into the scratchpad (`pip install --target`; the container's pip installs for
     3.13, not the default 3.11). The scripts that make the reference values live in
     `tools/ref/` and their outputs in `tools/ref/fixtures/*.json`, both committed, so the tests
     run with node alone and the fixtures can be made again in a fresh container.
   - Closed forms and published tables (Dixon's Q, the studentized range, Shapiro–Wilk's
     coefficients) where they exist.
   Tolerances are stated per quantity: about 1e-12 relative for closed forms and certified values
   (1e-7 for the NIST sets rated "higher difficulty", as SciPy's own tests use), 1e-9 for
   iterative results, and p values to 1e-6 relative down to 1e-300 in the tails.
2. **Right in behaviour, not only at points.** Statistical properties are checked by simulation
   in the unit tests: a test's size (its rate of rejecting a true null at 5 %) over 20 000 null
   data sets within its binomial interval; a 95 % interval's coverage; p values uniform under the
   null (Kolmogorov–Smirnov); invariances (rows reordered, groups renamed or reordered, data
   scaled and shifted, columns swapped where the method is symmetric).
3. **Fuzzed against the reference.** `tools/ref/diff-fuzz.py` makes random data sets (0 to 10⁴
   values, ties, constant columns, missing values, magnitudes from 1e-300 to 1e300, groups of one,
   empty groups, collinear columns) and runs each through Kurve's function (under node) and the
   reference; a difference past the tolerance, a NaN, or a number where the reference refuses, is
   a failure. A seed reproduces it.
4. **Refusals in words.** Every input a method cannot take (too few values, every value the same,
   a group of one, a singular design, a negative count) gives `{fail}` in words, never NaN and
   never a number that means nothing. Every assumption a method rests on (normality, equal
   variances, sphericity, expected counts of 5) is checked and said, from one source as
   `fitWarnings` is for fits, so the result, the copied table, the CSV and the report say the same.
5. **One door per concept.** Each new concept has one reader and one writer, as `GP()` and
   `savePlot` are for a graph's settings: a column's type through `colType(c)` and `numData(c)`,
   an analysis through `anaOf(id)` and `saveAna`, what it reads through `anaRead`, a matrix
   through `matOf(id)`. A grep for the old
   way of reading it is part of the slice.
6. **The document holds.** Every key stored is versioned (document version 6, then 7…), upgraded
   by `migrate` and cleaned by `normalize`; junk from storage is tested (odd-test); undo covers it
   (`UNDO_KEYS`, and `UNDO_BYID` for lists of things with ids); two tabs merge it (`mergeProj`);
   the project file round-trips it; the report and the CSV carry everything the screen shows.
   Numeric projects keep their check code exactly: a regression test reads the check codes of
   every fixture and example before and after.
7. **The interface holds.** The design system's components; the glossary (`tools/ux/terms.py`
   reads 0); a Help article per tool and a hint per setting; tooltips that name; Find a command
   finds it (`ux/spec/menus-after.txt` and `tools/ux/menucheck.py`); the keys; the contrast test;
   screenshots at 1440, 1024 and 390 px in both themes and both styles; no window explains itself
   in paragraphs; menus stay short (Origin's sprawl is not the model).
8. **Fast enough, measured.** Budgets in the spec of each wave, checked by a drive at the sizes
   people use (10⁶ rows for anything that reads a column, 2 000 columns for anything that lists
   them). Heavy work runs in the compute worker (wave 0) with progress and Stop; nothing blocks
   the page for more than 100 ms.
9. **The suite stays green.** Every slice adds its section to a drive, and clicks every control
   it adds; the full suite passes on the commit before a push; each wave ends with a 40-minute
   lab day (`tools/lab-day.mjs`, grown to use the wave's tools), sheet-fuzz seeds after any
   worksheet change, and screenshots read by eye.
10. **Origin's own examples.** Each wave ends by working Origin's tutorials for its tools, where
    the tutorial publishes its data and its numbers, and getting the same numbers (a drive per
    tutorial, in `tools/origin-drive.mjs`).
11. **Committed as it goes.** Each slice is committed and pushed when its tests pass; the specs,
    drives, fixtures and the scripts that make them are in the repository, not the scratchpad (the
    container is not a disk).

## The order, and why

```
wave 0  the bench ─────────────────────────────────────────────┐
wave 1  foundations: project files · column types ·             │ every wave
        analyses with result sheets · distributions             │ uses the bench
          ├─ wave 2  statistics            (types, analyses, distributions)
          ├─ wave 3  the worksheet as a table (types; reshaping are analyses; matrices)
          │    └─ wave 4  regression and fitting breadth (the linear model of wave 2; matrices)
          │    └─ wave 5  signal processing and mathematics (result sheets; matrices)
          ├─ wave 6  multivariate          (result sheets; text groups; SVD)
          ├─ wave 7  plots                 (text columns; tests; dendrograms; matrices for 3D)
          ├─ wave 8  automation            (project files; analyses; templates)
          └─ wave 9  more files            (matrices; text columns)
```

Waves 2 to 9 depend on wave 1, and wave 1 on wave 0. After wave 1, waves 2 and 3 can alternate
slice by slice; the rest follow in order, because each uses what the one before made (the linear
model engine of wave 2 is wave 4's, wave 3's matrices are wave 5's and 7's, wave 6's dendrograms
are wave 7's).

## Wave 0: the bench

Nothing in this plan can be checked without it, so it comes first and ships nothing a user sees.

- **0.1 Reference values.** `tools/ref/`: a README (how to install SciPy, statsmodels and the rest
  for Python 3.13 in the scratchpad, and which versions), `make-fixtures.py` (data sets and the
  reference's answers, written to `fixtures/*.json` with the versions that made them), the NIST
  sets with their certified values in `tools/ref/nist/` (public data of the US government), and a
  check that a fixture made again equals the one committed.
- **0.2 The fuzzer.** `tools/ref/diff-fuzz.py` and `tools/ref/run.mjs` (loads the pure blocks
  out of `kurve.html` as `tools/fit-test.mjs` does and calls one function on a case): random cases
  by seed, the comparison, a minimised failing case written out.
- **0.3 The compute worker.** `gfitWorker` grown into one worker for every heavy job: the pure
  blocks loaded once, jobs `{kind, args}` by message, progress, Stop (the worker ended and made
  again), and the same function on the page when no worker can be made; `computeRun(job, stopped)`
  as `gfitRun` is. The global fit moves onto it; its tests unchanged.
- **0.4 Budgets.** `tools/perf.mjs`: the boot time, a save, a typed value, a draw and a scroll at
  10⁶ rows and at 2 000 columns, each against its budget, into a CSV, so a wave that makes the
  file slower is seen the day it does.
- **0.5 One command for the suite.** `tools/suite.sh` (what `scratchpad/suite-snap.sh` does
  today: every test and drive, in parallel, on a snapshot of the commit, one summary), in the
  repository.

## Wave 1: foundations

Its spec: `ux/spec/FOUNDATION_SPEC.md`.

- **1.1 Project files.** File › Save to a file… (Ctrl+S, which the browser would otherwise take
  for saving the page) and File › Open a project file…, a `.kurve` file dropped on the window,
  and File › Back up every project (one file). The file is gzip (`CompressionStream`) of a JSON
  header (`format`, document version, when, by, the check code) and the project, its comments,
  its saved styles, fit settings and functions; columns' values as base64 of little-endian
  `Float64Array` (NaN for a missing value), text as JSON. Opening always makes a new project (new
  ids, never over another), checks the check code (a mismatch said and kept, as the record does),
  upgrades an older version, refuses a newer one in words, and refuses a file that is not one, is
  cut short, or inflates past a limit. Tests: every example and a project of 10⁶ rows round-trip
  to the same check code, fits, steps, peaks, bands, graphs, comments and undo-free state; a file
  opened with IndexedDB, with localStorage and in the shared store; junk files.
- **1.2 Column types.** The deepest change of the plan. A column has a type, `c.type`: `num` (the
  default, every column today) or `text`; a date stays a number with its `tfmt`. A text column
  holds strings (null for an empty cell) and has the role `ignore` (data), `lab` (labels) or a
  group; it is never a Y. Categorical, as Origin's: `c.cat {order: "first"|"sorted"|"custom",
  levels}`, the order the levels are listed, plotted and tested in. One door: `colType(c)`,
  `numData(c)` (the numbers, or null for a text column), `textData(c)`; every place that reads
  `.data` (212 matches today) is gone through and sent through a door (the list is in the spec, and a grep
  in the drive finds any left). Four slices:
  - 1.2a the model and the worksheet: typing text (into a text column; into a number column it
    offers to make it text), shown left-aligned, sorted (natural order, by the locale), found,
    filled (copied; "Sample 1, Sample 2…" continued), pasted, copied, the CSV quoted (RFC 4180),
    stored (text stays JSON, `idbPack` only for numbers), merged cell by cell (`mergeCols`), undone,
    and the check code: a project of numbers keeps its code exactly, and a text cell is hashed in
    one stated form (written in the raw-data CSV's header, so `sha256sum` still reproduces it);
    sheet-fuzz types text.
  - 1.2b imports keep text columns (`findBlock` and `analyzeFile` take a block whose columns are
    numbers or text, a sample name beside the values; the wizard's Use gains Text, Labels and
    Group), xlsx in wave 3.
  - 1.2c categorical columns: Set as categorical, the levels' order (first seen, sorted, typed),
    the column menu and the header showing it.
  - 1.2d graphs read text: labels from a text column, a categorical X (positions 1…k named, the
    names along X of today from a column), box and violin charts grouped by a text column,
    Plot setup's Group by a column (a curve per level, or a panel per level in a figure).
- **1.3 Analyses and result sheets.** The framework every statistical test, reshaping, transform
  and multivariate method uses, as Origin's operations with their report sheets and Recalculate.
  `p.ana` (in `UNDO_KEYS`, merged by id): `{id, kind, name, in {cols, groups, rows, sheet, read}, p,
  out {sheet}, recalc: "auto"|"manual", sig, at, by, v}`. `ANA_KINDS` registers each kind as
  `PIPE_OPS` registers steps: `{group, label, inputs (what columns of what type), params (the
  form's schema), run(inputs, p) → {tables, report, notes} or {fail}, help}`, `run` pure and in
  the worker when heavy. Its tables go into a result sheet of its own (read only, its columns
  computed, so not original data and not in the check code; plotted and read by formulas like any
  column); its report (sections of numbers, tables and notes, not HTML) is drawn in Results and
  in the exported report; its notes say every assumption checked. Recalculation as Origin's:
  `auto` when an input's values, rows or the settings change (a signature as `pipeSig`), `manual`
  marked out of date with Recalculate. The History has a box per analysis, fed by its inputs, with
  its discussion; Change settings… reopens its dialog; deleting its sheet deletes it (confirmed).

  **What an analysis reads** (decision 4, taken on 07.11: always the processed values). One rule,
  whatever the command was started from (the worksheet in either view, a curve, the menu bar, the
  graph's bar, Find a command, a detached window): an analysis reads each input column's
  processed values, which are its original values when it has no steps, through one door,
  `anaRead(input)`, the reading fits, peak finding, Integrate, the status bar and the Statistics
  window already use. So a column's mean is one number in every window.
  - **Named and switched per input.** The dialog's input line names the steps ("B, processed:
    background (arPLS), normalise") and has a switch to Original for that input; the choice is
    stored per input (`in.read[colId]`: `"proc"`, the default, or `"orig"`), never changed by
    anything but that switch, and stated in the report with the original data's check code and
    each step by name, so the result can be made again. A derived column has no original values:
    its switch is not offered.
  - **Recalculated with the steps.** With `recalc:"auto"`, a change to an input's steps, masks or
    original values recalculates the analysis (its signature includes each input's `pipeSig`);
    with `"manual"` it is marked out of date.
  - **Masked points left out** of either reading, as fits leave them out (and as Origin does), with
    *Include masked points* in the dialog and the number left out in the report.
  - **Rows paired by the recorded row.** Analyses that pair values across columns row by row
    (paired tests, signed ranks, correlation, regression, cross-tables) pair processed values by
    each point's recorded row (`idx`); rows one column lacks are left out pairwise or listwise, as
    chosen, and counted.
  - **What a step does to the rows,** a flag on each op in `PIPE_OPS` (as `COUNT_SAFE` is for
    counting), read by `anaRead`, which returns the values with what they may be used for:

    | `rows` | Steps today | The processed values may be |
    |---|---|---|
    | `keep` | correct, bg, shift, xunit, calib, ecal, xlin, norm, scale | used by every analysis |
    | `keep` and `dep` (neighbours depend on each other) | smooth, fft, deriv, cumint, despike (the points it replaced) | used; an analysis that assumes independent values says so in its notes |
    | `drop` (rows left out or reordered) | crop, exclude, sort; log, absorb and km (values at or below 0); ref and combine (where another column has no value); bose (points it cannot correct) | used, on the rows that remain, the number dropped said |
    | `merge` or `new` (rows averaged together, or points made) | dedupe, resample, hist, python | descriptive numbers only, said; an analysis that counts or pairs observations refuses them in words (300 points resampled from 100 measured are not 300 observations) and offers Original |

    A new step must declare its flag; the drive fails on a step without one.
  - **Tested** in 1.3a, before any statistic is built on it: a column with steps of each class read
    both ways; the same reading from every place a command can start; pairing refused after
    resampling and averaging duplicates; the note after smoothing; masked points left out and
    counted; a step changed and the analysis recalculated; an undo of the step and the old result
    back; the reading kept through a reload, a project file and another tab.

  Three slices: 1.3a the framework with one kind (descriptive statistics into a result sheet) and
  the reading above; 1.3b recalculation, the History box, the report; 1.3c in the worker.
- **1.4 Distributions.** A block of its own (`==STATS:START/END==`, pure, tested by
  `tools/stats-test.mjs`): the regularised incomplete beta and gamma (the `betai` of today checked
  and, if needed, replaced), normal (Wichura's AS 241 quantile), t, F, χ², gamma, beta, binomial,
  Poisson, hypergeometric; noncentral t, F and χ² (for power); the studentized range (Copenhaver
  and Holland, for Tukey); exact Wilcoxon signed-rank and Mann–Whitney distributions (by
  recursion, small n); Shapiro–Wilk (Royston's AS R94); Anderson–Darling's p (Marsaglia).
  Each with its cdf, upper tail (accurate far out, not 1 − cdf) and quantile; checked against
  SciPy at thousands of points, tails included; `tCrit` and `fPvalue` keep their names.

## Wave 2: statistics

Its spec: `ux/spec/STATS_SPEC.md`. Every test is an analysis (1.3). One input panel for all of
them, as Origin's: the data as columns (one column a group), or indexed (a column of values and a
column of groups, text or numbers); which rows; missing values left out listwise or pairwise; each
column's processed values, or its original ones when switched (1.3's reading). One output for all: a
result sheet, the report with the statistic, its degrees of freedom, p, the interval, the effect
size, the assumptions checked, and a sentence in words of what it found, at the α chosen,
one-sided or two.

- **2.1 Descriptive statistics, whole.** n, missing, mean, SD, SE, the mean's interval, variance,
  coefficient of variation, minimum, maximum, range, quartiles (the method chosen, R's nine types;
  Origin's default *to confirm*), median, IQR, MAD, mode, skewness and kurtosis (the sample
  estimators G1 and G2, as Origin, SAS and Excel), geometric and harmonic means, sum, chosen
  percentiles; by group; frequency counts (bins of numbers, levels of text); a graphical summary
  (histogram, box, normal curve and the numbers as one figure). Columns as variables, rows as
  observations (the Statistics window's comparison of curves stays, as what it is). NIST's
  univariate sets.
- **2.2 Normality and outliers.** Shapiro–Wilk (3 to 5000 values), Lilliefors, Anderson–Darling,
  D'Agostino's K², Kolmogorov–Smirnov against a fitted normal; a Q–Q plot made from the result;
  Grubbs (one side or two, once or repeated) and Dixon's Q (3 to 30 values), the outliers listed
  with Mask and Mark.
- **2.3 Comparing means and spreads.** One-sample, two-sample (Welch's by default, Student's when
  chosen) and paired t tests with the difference's interval and Cohen's d and Hedges' g; F,
  Levene (mean and median, Brown–Forsythe) and Bartlett tests of variance; one- and two-sample
  proportion tests (normal and exact binomial), Fisher's exact test for two by two.
- **2.4 One-way ANOVA.** The table, Welch's ANOVA, Levene's test beside it; comparisons of means:
  Tukey–Kramer, Bonferroni, Holm, Šidák, Scheffé, Fisher's LSD, Games–Howell, and Dunnett's
  against a control (by the multivariate t, Genz's method: its own sub-slice); letters for the
  groups that do not differ, ready for a plot; a means plot with intervals. NIST's ANOVA sets to
  their certified digits (SmLs07–09, values near 10¹² differing in the thirteenth digit, are the
  test of the arithmetic: centred, two-pass sums).
- **2.5 The linear model.** The engine that two-way ANOVA, multiple regression and ANCOVA share:
  a design matrix from numbers and factors (treatment or effect coding), interactions,
  Householder QR with column pivoting (the rank found, a dependent column named), types I, II and
  III sums of squares, estimable contrasts. NIST's Longley, Filip, Wampler 1–5, Pontius and NoInt
  to their certified digits (Filip, a polynomial of degree 10, defeats the normal equations: the
  test that QR is QR); statsmodels on the rest.
- **2.6 Two- and three-way ANOVA.** Balanced and unbalanced (type III by default, the type
  stated), interactions, simple effects, comparisons on the main effects; the interaction plot
  and the main-effects plot made from the result.
- **2.7 Repeated measures.** One- and two-way, the data wide or long with a subject column;
  Mauchly's test of sphericity, Greenhouse–Geisser and Huynh–Feldt corrections.
- **2.8 Nonparametric tests.** Mann–Whitney (exact without ties for small samples, else normal
  with the continuity and tie corrections; the Hodges–Lehmann shift and its interval), Wilcoxon
  signed-rank (exact and approximate, zeros as Pratt or Wilcoxon), the sign test, Kruskal–Wallis
  with Dunn's comparisons, Friedman, Mood's median test, two-sample Kolmogorov–Smirnov (exact for
  small samples).
- **2.9 Correlation.** Pearson's r with p and its interval (Fisher's z), Spearman's ρ (ties),
  Kendall's τ-b (exact for small n), partial correlation; the matrix of a table's columns
  (listwise or pairwise), with a scatter matrix from it.
- **2.10 Counts in tables.** χ² test of independence (expected counts below 5 said), Fisher's
  exact test (two by two; Freeman–Halton for small larger tables), McNemar; from two text columns
  (a cross-table) or a table of counts.
- **2.11 Power and sample size.** For the t tests, one-way ANOVA, proportions and variances, by
  the noncentral distributions: power for a size, the size for a power, a graph of power against
  size.
- **2.12 ROC curves.** From a score column and a group of two levels: the curve, the area with its
  interval (DeLong), the cut-off by Youden's index.

## Wave 3: the worksheet as a table

Its spec: `ux/spec/SHEET_SPEC.md`.

- **3.1 Formulas, further.** Within column formulas (no free cell formulas, see the decisions):
  rows by offset and by number (`B[i-1]`, `B[1]`, missing past the ends), a column's aggregate as
  a value (`mean(B)`, `sum(B)`, `sd(B)`, `median(B)`, `count(B)`…), `if`, comparisons, `and`,
  `or`, `not`, equality with a text column's values (`if(C == "control", B, 0/0)`), references to
  another sheet typed (`Sheet2!B`, kept by id as letters are), and the project's named constants
  (`k_B = 1.380649e-23`), a list of their own, read by any formula. `compileExpr` grows with them,
  still arithmetic only.
- **3.2 Two sheets side by side.** A worksheet window per sheet when asked (Window › New
  worksheet window), each a document in the taskbar; columns dragged between them.
- **3.3 Filters.** As Excel's: conditions per column (between, equal, among values, text contains,
  top n), a view as sorting and hiding are, marked in the header and the foot. An analysis does
  not read the view: its rows are its own (a filter, when one is on, is copied into the analysis
  as its rows when the analysis is made, and said), so a result never changes because a view did.
- **3.4 Conditional formatting.** Colour scales, thresholds, a text matched, per column, a view
  kept with the project.
- **3.5 Reshaping.** Each an analysis (1.3) whose result sheet is recalculated: stack (wide to
  long, with the group column), unstack, split a column by its groups, pivot table (rows by
  columns by an aggregate), reduce rows (every n, the mean of n, by bins of X), remove or keep
  duplicates, a sorted copy (the rows really reordered, into a new sheet), transpose, join two
  sheets by a key column, append sheets.
- **3.6 Matrices.** A matrix: Z on a grid, its X and Y given by their ends or by vectors, several
  in one matrix book as Origin's (`p.mats`, its own store packing, its own check code when its
  values are recorded); from XYZ columns by gridding (wave 5.7), from an image's grey values,
  from a 2D result (5.5); shown as a grid with its X and Y; drawn as the heat map and contours of
  today and, later, a surface (7.8); arithmetic between matrices, transpose, flip, turn, crop,
  resample. Surface fits (4.4), the short-time FFT (5.5), gridding and 3D read and write them.
- **3.7 Excel.** xlsx read (the zip by `DecompressionStream("deflate-raw")`, shared strings,
  numbers, text, dates in the 1900 and 1904 systems, formulas' last values, merged cells: a Kurve
  sheet per Excel sheet, header rows to Long Name and Units) and written (a sheet per Kurve sheet,
  the label rows as header rows); an HTML table pasted from a web page.

## Wave 4: regression and fitting, wider

Its spec: `ux/spec/FIT2_SPEC.md`, continuing `FIT_SPEC.md`.

- **4.1 Polynomials by QR.** The polynomial models fitted through the linear model's QR in a
  centred, scaled X (the known gap: a high order far from x = 0); Filip to its certified digits.
- **4.2 Multiple regression.** Several X columns, numbers and factors, with or without an
  intercept, weighted; coefficients with SE, t, p and interval; the ANOVA; R², adjusted R²; VIF
  and the condition number; Cook's distance, leverage and DFFITS; partial residual plots;
  predictions with their intervals into a column; best subsets (adjusted R², Mallows' Cp, AIC,
  BIC) up to about 20 predictors.
- **4.3 Comparing fits.** Two models on one data set (the nested F test; AIC, AICc and BIC with
  Akaike's weights); one model on several data sets (are the parameters the same: the global
  fit's machinery, shared against separate, by an F test), as Origin's Compare Models and Compare
  Datasets.
- **4.4 Surface fits.** z = f(x, y): a plane, a paraboloid, a two-dimensional Gaussian (turned)
  and Lorentzian, polynomial surfaces, your formula in x and y; from XYZ columns or a matrix;
  the map of residuals; the fitted surface into a matrix.
- **4.5 Implicit fits.** f(x, y) = 0 by orthogonal distance (ODRPACK's implicit mode on the
  `odrFit` of today): a circle, an ellipse, your formula; tested on Gander, Golub and Strebel's
  points.
- **4.6 More models.** From 25 to about 100, each with its guess, sketch, meaning, units, derived
  values and the recovery test of slice 3 of `FIT_SPEC.md`: Richards and Weibull growth, the
  exponentially modified Gaussian, Pearson IV, Gram–Charlier, Doniach–Šunjić, the four- and
  five-parameter logistic, rational functions, Debye, Einstein, Planck and Curie–Weiss, Langmuir,
  Freundlich and BET isotherms, more waves; the list is the spec's, from Origin's categories and
  what Kurve's users meet.
- **4.7 Peak fits, further.** Your function as a peak shape (with a centre, an area and a width
  named), the exponentially modified Gaussian and Doniach–Šunjić shapes; Shirley (iterative) and
  Tougaard (the universal cross-section) backgrounds, as steps and as a peak fit's baseline;
  Fourier self-deconvolution as a step (its apodisation, its narrowing factor, a warning for the
  noise it raises).
- **4.8 Honest intervals.** Robust fits (Huber, bisquare, by reweighting); bootstrap intervals for
  any fit's parameters (cases or residuals resampled, in the worker), beside the delta method's.

## Wave 5: signal processing and mathematics

Its spec: `ux/spec/SIGNAL_SPEC.md`. A transform of one column into one column on the same X stays
a step; one that makes another X (a spectrum of frequencies, lags) is an analysis with a result
sheet. Checked against `numpy.fft`, `scipy.signal`, `scipy.interpolate` and PyWavelets.

- **5.1 FFT, with its output.** A column on even X (or resampled, with a note), a window
  (rectangle, Hann, Hamming, Blackman, Blackman–Harris, flat top, Kaiser, Tukey), padding,
  detrending; out: frequency, real and imaginary parts, amplitude (normalised so that a sine of
  amplitude A reads A, stated), power, the power spectral density by Welch's method (segments and
  overlap, its units), phase (unwrapped), dB, one or two sides; the inverse; any length (Bluestein
  where it is not a power of two).
- **5.2 Filters designed.** Butterworth, Chebyshev I and II, Bessel and elliptic, low, high, band
  and band-stop, of order n, zero-phase in second-order sections (as `sosfiltfilt`); FIR by a
  windowed sinc; a notch at 50 or 60 Hz; the response drawn in the tool. The FFT filter of today
  stays.
- **5.3 Correlation and convolution.** Auto- and cross-correlation (lags, normalisations),
  convolution with a column or a kernel, deconvolution (Wiener, with the noise stated), coherence.
- **5.4 Envelope.** The analytic signal by the Hilbert transform: amplitude, phase, frequency;
  upper and lower envelopes.
- **5.5 Short-time FFT.** The spectrogram into a matrix, drawn as a map.
- **5.6 Wavelets.** The discrete transform (Haar, Daubechies, symlets, coiflets) over levels and
  back, denoising (universal and SURE thresholds, soft and hard) as a step; the continuous one
  (Morlet, Mexican hat) into a matrix.
- **5.7 Interpolation into columns.** At another column's X or a new grid: straight lines, cubic
  splines (natural, not-a-knot, clamped), Akima, PCHIP, smoothing splines; extrapolation chosen.
  XYZ into a matrix: Delaunay (today's), thin-plate splines, Shepard and Renka–Cline.
- **5.8 Calculus, further.** Simpson's rule, the area between two curves, the integral of a fit's
  curve (closed where the model has one, else numerical with its error), LOWESS and LOESS.

## Wave 6: many variables

Its spec: `ux/spec/MULTI_SPEC.md`. Checked against scikit-learn and statsmodels, signs fixed by a
stated convention.

- **6.1 SVD and eigenvalues** in NUMERICS (one-sided Jacobi; the symmetric QR algorithm), to 1e-12
  on Hilbert matrices, random and rank-deficient ones.
- **6.2 PCA.** On the covariance or the correlation; the layout said and chosen (columns as
  variables, or each curve an observation and its points the variables, as spectroscopy has it);
  eigenvalues, the variance explained, scores, loadings, the scree plot, the biplot, scores
  coloured by a group, Hotelling's T² and the Q residuals.
- **6.3 Clustering.** k-means (k-means++ from a seed, restarts, the silhouette), hierarchical
  (single, complete, average, Ward; Euclidean or correlation distance) with its dendrogram;
  membership into a text column.
- **6.4 Discriminant analysis.** Linear and canonical, with cross-validation and the confusion
  table.
- **6.5 PLS regression.** NIPALS and SIMPLS for calibration from spectra: the number of components
  by cross-validation (RMSECV), coefficients, VIP, predictions for new curves into a column. With
  Kurve's processing steps in front of it, this is where Kurve can be better than Origin.
- **6.6 Asked first.** Survival (Kaplan–Meier, log-rank, Cox, Weibull), MANOVA and design of
  experiments are Origin's and far from Kurve's users so far: built only if the user asks.

## Wave 7: plots

Its spec: `ux/spec/PLOT2_SPEC.md`.

- **7.1 Categories.** Columns by the levels of a text column (grouped and stacked, as today's),
  pie and doughnut charts (labels, shares, a slice pulled out), a curve or a panel per level (a
  trellis, as Origin's Graph Maker), dot plots, means with intervals per group.
- **7.2 Statistical charts.** Q–Q plots (against the normal and other distributions, the line and
  its band), the scatter matrix, Pareto charts, control charts (X̄–R, X̄–S, I–MR, p, np, c, u; the
  limits from the data or given; the Western Electric rules marked), Bland–Altman, the interaction
  and main-effects plots (2.6), dendrograms and the heat map with dendrograms (6.3), forest plots.
- **7.3 Polar.** Lines and symbols on polar axes (degrees or radians, where zero is, which way
  round, the radial range, the grid); a polar map from a matrix.
- **7.4 Ternary.** Three parts of a whole (normalised), its grid, ticks and titles, symbols and
  lines.
- **7.5 Vectors and radar.** Vector fields (X, Y, angle and length, or two ends), radar charts.
- **7.6 More axes.** Any curve on any of several Y axes, the extra ones set off outward on either
  side (today's right axis grown); axes linked by a formula as today's second X. A general layer
  model is not planned (see the decisions).
- **7.7 Graph templates.** A template is a saved style, Plot setup's data mapping (kinds, and the
  use of each column by its role and name) and the layout (a figure's grid, the axes): Plot into
  a template, one graph per group of columns, kept in the project and the browser.
- **7.8 3D, last.** Its own spec: a renderer of our own (projection; a depth-sorted surface drawn to
  a canvas on screen; lines and symbols as vectors), turned by dragging, a box with its axes;
  surfaces from matrices (coloured, wireframe, contours under them), 3D scatter with drop lines,
  the 3D waterfall of a series; exported to SVG and PDF as polygons up to a budget, past it as an
  image inside the vector file (said).

## Wave 8: automation

Its spec: `ux/spec/AUTO_SPEC.md`.

- **8.1 Recipes both ways.** The processing's JSON (exported today) read back onto columns;
  recipes of steps, saved fit settings, the peak finder's settings, band windows and analyses.
- **8.2 Analysis templates.** A project saved as a template: its structure without its data
  (sheets, column roles and names, steps, analyses, fits that follow, graphs and their mapping,
  the report's layout); opened on new data mapped onto it, by name or position, with what is
  missing said before anything runs.
- **8.3 Batch processing.** Many files through a template, into one project or one per file, and a
  summary sheet: a row per file of the outputs chosen (parameters with their errors, results of
  analyses, band areas, peak positions, header fields); a file that fails is listed with why and
  the run goes on; progress, Stop, carry on; a report per file and one for the batch; in the
  worker.
- **8.4 Reading a file again.** A column remembers its file (name, size, date, hash); where the
  browser lets a page keep a file's handle (Chrome and Edge), Read it again and Watch it (while
  the project is open, after asking); elsewhere Replace from a file…, matched by name; the
  analyses that read it recalculate.
- **8.5 Macros, if wanted.** Commands recorded and replayed by name (menu commands with their
  dialogs' settings); never code.

## Wave 9: more files

Its spec: `ux/spec/FILES_SPEC.md`. Each reader in the PARSER block, tested by `parser-test.mjs`
on files made by the reference tools (`scipy.io`, `netCDF4`, `h5py`).

- **9.1 MATLAB** `.mat` levels 5 and 7 (numbers, text, structures flattened, compressed elements).
- **9.2 NetCDF classic** (CDF-1, 2 and 5): variables and attributes.
- **9.3 HDF5, a subset.** Superblocks 0 to 3, object headers 1 and 2, groups, contiguous and
  chunked data sets with deflate and shuffle, integers, floats and strings: what h5py writes, and
  NetCDF-4 and MATLAB 7.3 with it; anything else refused in words.
- **9.4 JSON and HTML tables.**
- **9.5 The digitiser.** A picture of a graph (a file or pasted) behind a graph, its axes set by two
  points each (linear or log), points picked by clicks or traced along a colour, into a sheet;
  tested on pictures of known curves to within a pixel.

## Left out, and why

- **Code** (Python, LabTalk): the user removed Python; templates, recipes and perhaps macros (8.5)
  do the repeating without running code.
- **Origin's project files** (`.opju`): undocumented.
- **Databases**: a page cannot reach a database; their CSV or xlsx exports come in.
- **Word and PowerPoint files**: the report is HTML and the figures SVG, PDF and PNG; a `.docx` or
  `.pptx` writer only if asked.
- **Survival, MANOVA, design of experiments**: only if asked (6.6).

## Decisions

All taken on 07.11: the fourth by the user's choice between three, the rest as this plan
recommended them (the user: "go with your recommendation for the rest"). The waves' specs follow
them; changing one later is a decision of its own, written here with its date.

1. **Ctrl+S** saves the project to a file (the browser would save the page). Decided.
2. **Cell formulas**: none; column formulas grow (rows by offset, aggregates, `if`, other sheets)
   and the project gets named constants. Every value keeps one dependency graph, column to
   column, which recalculation, the check code and the History rely on. Decided.
3. **Filters and analyses**: an analysis keeps its own rows; a filter is a view. Decided.
4. **What statistics read**: always the processed values (the original ones when
   a column has no steps), switched per input to Original, stored, and said in the report; the
   rules are in 1.3. Chosen over "what you were looking at" (a default that depends on where the
   command was started, the kind of state that has bitten Kurve most, and that a user cannot
   predict) and "always original" (silently wrong after processing, two numbers for one column,
   and a derived column needs the processed reading anyway).
5. **Text in the check code**: projects of numbers keep their check code exactly; text is hashed
   in one stated form (anything else changes every project's code). Decided.
6. **Free graph layers**: not planned; several Y axes, linked axes, insets and figures instead.
   Decided.
7. **3D**: a renderer of our own, last, SVG and PDF as polygons up to a budget. Decided.
8. **Survival, MANOVA, design of experiments**: out unless asked. Decided.
9. **The NIST host**: allow `www.itl.nist.gov` in the environment's network settings when wave 2
   starts, for the certified values SciPy and statsmodels do not ship. Decided: asked for when
   wave 2 needs it, through the environment's settings.

## Size, and how each wave ends

About 72 slices: wave 0, 5; wave 1, 9; wave 2, 12; wave 3, 7; wave 4, 8; wave 5, 8; wave 6, 5;
wave 7, 8; wave 8, 5; wave 9, 5. Each wave ends with: the full suite green; a 40-minute lab day
with the wave's tools in it; Origin's tutorials for the wave worked to the same numbers; screenshots
at three widths in both themes and styles, read by eye; `CLAUDE.md`, `DESIGN.md`,
`ux/CHANGELOG.md`, the Help and `menus-after.txt` brought up to date; the wave's new known gaps
written down, so the next comparison starts from the truth.

## Risks, and what is done about them

- **Text columns touch everything.** About 200 places (212 matches of `.data` today) read a
  column's values as numbers. The doors
  (`numData`, `textData`) and a list of every reader in the spec, gone through one by one; a grep
  in the drive for any reader left; sheet-fuzz with text; odd-test with text from storage in every
  broken form.
- **The arithmetic.** Cancellation (NIST SmLs07–09), ill-conditioned designs (Filip, Longley),
  far tails (p near 1e-300), ties in rank tests, unbalanced designs, empty and single groups: each
  has its fixture before its code.
- **The file grows.** `kurve.html` is 2.6 MB and 26 000 lines and this plan could double it. The
  boot time is a budget (0.4); if it is passed, the pure blocks move into the page as text loaded
  when first used (one script element each, no build step).
- **The suite grows.** It runs in parallel (0.5); each drive stays under ten minutes; a wave's
  drive runs alone while it is being written.
- **Menus grow.** Analyze › Statistics gains kinds (Descriptive, Normality, Means, ANOVA,
  Nonparametric, Correlation, Tables, Power, Multivariate), each a short list; Find a command
  reaches the rest; the menu tree is checked against `menus-after.txt` as now.
- **The reference tools vanish with the container.** The fixtures are committed and the README
  says how to make them again.
- **Scope.** Each wave's spec lists what it does not do, and the comparison with Origin is made
  again after waves 2, 4 and 7, so the plan follows what is still missing, not what was missing
  today.
