# Wave 2: statistics

The second wave of `PARITY_SPEC.md`: the statistics a lab reaches for, from descriptive numbers to
the linear model, each an analysis with a result sheet (FOUNDATION_SPEC 1.3), each checked against
numbers Kurve did not compute. This spec is the wave's: what Origin does, where Kurve stands, the
decisions, the one input panel and the one output every test shares, the order, and each slice with
what it changes, how it is checked and what it leaves out. It follows the plan's bar
(`PARITY_SPEC.md`, "The bar"), and the user's rule of information hygiene (`ux/UX_SPEC.md` §3.8),
which neither are repeated here.

Origin's pages read for it, through a search engine's reading (the site itself may refuse this
session): [Statistics on Columns](https://www.originlab.com/doc/Origin-Help/DescStats-Dialog),
[Statistics on Rows](https://www.originlab.com/doc/Origin-Help/DescStatsRow-Dialog),
[LabTalk's median and its methods](https://www.originlab.com/doc/en/LabTalk/ref/Median-func). The
points to check in Origin itself are marked *(to confirm)*.

## How Origin does it

- **Statistics on Columns** reads columns (or a range of rows), grouped by one or more columns,
  and writes a report sheet: the moments (N, missing, mean, SD, SE, the mean's interval, variance,
  sum, skewness, kurtosis, coefficient of variation, geometric and harmonic means, MAD, robust
  SD), the quantiles (minimum, Q1, median, Q3, maximum, IQR, range, chosen percentiles, the
  indices of the extremes), the mode, and plots (a histogram, a box chart). The quantiles take one
  of six interpolation methods (empirical distribution, with averaging, nearest, weighted average
  left and right, Tukey's hinges); LabTalk's default is *empirical distribution with averaging*,
  the dialog's *(to confirm)*. The moments' divisor is DF, N, the weights or the weights less one.
- **Frequency counts** bins a column (by a width, a number of bins or a start) and writes each
  bin's centre, count, cumulative count, percent and cumulative percent; **Discrete frequency**
  counts each distinct value or text.
- **Tests** each have a dialog in the same shape: *Input* (the data as raw columns, one a group, or
  indexed: a column of data and one of groups), the test's own settings (the null value, the
  alternative two-sided or one, the significance level, the interval), and *Output* (the report
  sheet, a sentence "At the 0.05 level, the population mean is significantly different from 0",
  plots). Kurve leaves the sentence out (decision 9). The report holds the descriptive statistics of the groups, the test's table (statistic,
  DF, p), the interval, the effect size where it has one, and the assumptions' tests.

## Where Kurve stands

- **Statistics on columns** (FOUNDATION_SPEC 1.3a) is one analysis kind, `desc`: N, missing,
  mean, SD, SE, minimum, Q1, median, Q3, maximum, sum, by group, into a result sheet that follows
  its data. The quartiles are R's type 7. No choice of statistics, no interval, no shape.
- **Distributions** (1.4): the incomplete beta and gamma, nine distributions with both tails and
  quantiles, every p value to 10⁻¹³; `distFit` (normal, log-normal, exponential) with
  Kolmogorov's series for its p (3e-2 off at 20 values, owned by 2.2).
- **The Statistics window** compares curves (each spectrum's n, mean, SD, SE, median, extremes,
  correlations); it stays what it is, a window of the curves, not a test.
- **Box charts, violins and histograms** are plots (PLOT_SPEC, roadmap 4); none is made from an
  analysis.
- **No test.** No t test, ANOVA, normality test, correlation test, χ², nonparametric test or power.

## Decisions

1. **The quartiles' default is R's type 7** (R, NumPy and Excel's QUARTILE.INC, and Kurve's own
   boxes), not Origin's: Origin's dialog default is not confirmed, and changing Kurve's would make
   a box chart and the statistics of the same column disagree. Every method is offered: R's nine
   types, each named as Origin, SAS or Excel name it (*Empirical distribution* type 1, *with
   averaging* 2, *Nearest* 3, *Weighted average left* 4, *Hazen* 5, *Weighted average right* 6,
   *Linear* 7, *Median-unbiased* 8, *Normal-unbiased* 9), and Tukey's hinges. The type chosen is
   said in the report.
2. **Skewness and kurtosis are the sample estimators G1 and G2** (Origin, SAS, Excel's SKEW and
   KURT, SciPy with `bias=False`); kurtosis is the excess (a normal reads 0). Said in the tooltip.
3. **The variance's divisor is n − 1**; *n* is a choice (a population's). Weights wait for a
   weighted analysis.
4. **The mode is the most frequent value, the smallest when several tie, with its count**; none
   when no value repeats ("every value once"). A continuous column rarely has one, and saying so
   is the truth.
5. **The statistics shown are chosen** (information hygiene): the dialog has every one as a tick,
   the default the eleven Statistics on columns had (so an analysis made before reads the same),
   and the report lists only what was chosen. A tick costs nothing; a column of numbers nobody
   asked for costs attention.
6. **Every test is an analysis** (1.3), so it follows its data, is undone, copied, reported,
   worked out in the worker past 200 000 values, and its sheet is read only.
7. **One input panel, one output** (below), so a test is learnt once.
8. **Tests are two-sided by default, intervals at 95 %**; both are the test's settings, stored.
   A level α is asked only where it changes a number (an outlier test's critical value).
9. **Kurve reports, the user judges** (the user's rule, 12.11, for every slice from here on). A
   test gives its numbers: statistic, degrees of freedom, p, interval, effect size, and a critical
   value where that is the test. No sentence of what they mean, no verdict column ("differs", "may
   be normal", "outlier: yes"), no advice ("use Welch's"), no assumption checks run unasked: the
   user runs Normality tests or Comparing spreads when they want them. Notes say only what was
   read (masked points, rows left out) and why a number is missing, in few words; how it was
   worked out is one line in the report. Help explains the tests; the windows do not.
10. **NIST's certified values come with the host.** This session's network refuses
    `www.itl.nist.gov`; a personal environment that allows it exists (11.11) and the next session
    runs in it. Until then each slice checks its arithmetic against exact rational arithmetic
    (Python's `fractions`, and mpmath at 40 digits), the way NIST made its certified values, on
    data built as NIST's are (NumAcc's: a constant far larger than the spread); the real sets are
    added to `tools/ref/nist/` and checked the first time a session can fetch them.

## The frame: one input panel, one output

**Inputs** (`anaDlg`'s first part, `anaInputHtml`/`anaInputRead`, the same for every kind):
- **The data**: *columns* (each ticked column a variable, or for a comparison each one a group),
  or *indexed* (a column of values and a column of groups, text or numbers: the *Group by* of 1.3).
- **Which rows**: all, or rows from … to … (counted from 1, as the worksheet numbers them).
- **Missing values**: each column's own (pairwise, the default), or only rows complete in every
  column chosen (listwise); a text cell counts as missing.
- **What each column reads**: its processed values, or its original ones when switched (1.3's
  reading, decision 4 of the plan).
- **Masked points** left out unless included.

All of it is `a.in` (`cols`, `by`, `read`, `masked`, and new `rows: [from, to] | null`,
`miss: "pair" | "list"`), read by one door, `anaInputs(a, p)`, which gives the kind its `ins`
(`[{name, ref, unit, vals, rows, groups, nMasked, missing, cats}]`) and the notes (masked points
left out, rows a step left out, rows dropped by listwise reading). A kind that reads levels (text
or categories) says so (`K.cats`), and its inputs carry `cats` (each value's level, in the column's
order).

**Output** (`ANA_KINDS[k].run` returns it; the page writes it):
- `tables[0]`, the result sheet's columns (text for names, numbers for numbers), kept by key
  across recalculations;
- `report.sections` (titled tables) and `report.notes`;
- `report.method`, one line; `report.marks` for what a result can act on (Mask, Mark).

Results shows the tables, then the method and notes. No sentence, verdict or check (decision 9).

## References, by slice

| Slice | Outside reference | Tolerance |
|---|---|---|
| 2.1 | exact rationals (moments, quantiles of all nine types); NumPy's quantile methods; SciPy's `skew`, `kurtosis`, `gmean`, `hmean`, `median_abs_deviation`, `mode`, `t`; NIST Lew, Lottery, Mavro, Michelso, NumAcc1–4, PiDigits when fetched | 1e-12 relative (1e-7 for NumAcc3–4 as NIST rates them) |
| 2.2 | SciPy's `shapiro` (Royston), statsmodels' `lilliefors`, `normal_ad`, SciPy's `normaltest`, `kstest`, `anderson`; the published tables of Dixon's Q and Grubbs' critical values | statistic 1e-10, p 1e-6 (Shapiro–Wilk's p is Royston's approximation in both) |
| 2.3 | SciPy's `ttest_*`, `levene`, `bartlett`, `fisher_exact`, `binomtest`; statsmodels' `proportions_ztest` | 1e-12 statistic, 1e-9 p |
| 2.4 | NIST SiRstv, SmLs01–09, AtmWtAg (in `tools/ref/nist/`); SciPy's `f_oneway`, `tukey_hsd`, `dunnett`; statsmodels' `anova_oneway` (Welch), `multipletests` | certified digits; 1e-9 |
| 2.5 | NIST Norris, Longley (statsmodels), Filip, Wampler 1–5, Pontius, NoInt (when fetched); statsmodels' `OLS`, `anova_lm` types I–III | certified digits (1e-7 for higher difficulty) |
| 2.6–2.7 | statsmodels' `anova_lm`, `AnovaRM`; pingouin-free closed forms for sphericity (Mauchly) checked against published examples | 1e-9 |
| 2.8 | SciPy's `mannwhitneyu`, `wilcoxon`, `kruskal`, `friedmanchisquare`, `median_test`, `ks_2samp`, `binomtest` | exact p 1e-12, normal p 1e-9 |
| 2.9 | SciPy's `pearsonr`, `spearmanr`, `kendalltau`; partial correlation by residuals | 1e-12 |
| 2.10 | SciPy's `chi2_contingency`, `fisher_exact`; statsmodels' `mcnemar` | 1e-12 |
| 2.11 | statsmodels' `TTestPower`, `FTestAnovaPower`, `NormalIndPower` | 1e-9 |
| 2.12 | closed forms (the trapezoid area is the Mann–Whitney U over n₁n₂), DeLong's variance against a published example | 1e-12 |

Each slice adds its fixtures to `make-fixtures.py`, its targets to `ref-test.mjs`, its generator to
`diff-fuzz.py`, and its simulations (a test's size over 20 000 null data sets within its binomial
interval, an interval's coverage, p uniform under the null) to `tools/stats-test.mjs`.

## Budgets

A test on 10⁶ values in under 1 s on the page or in the worker (2.1's statistics: one sort and two
passes); a dialog opening on a sheet of 2 000 columns in under 300 ms; nothing on the page for
more than 100 ms (past 200 000 values the worker, as 1.3c). `tools/perf.mjs` grows a line per slice
that reads a column.

## The order

2.1 descriptive statistics, whole → 2.2 normality and outliers (the checks every later test cites)
→ 2.3 comparing means and spreads → 2.4 one-way ANOVA → 2.8 nonparametric tests → 2.9
correlation → 2.10 counts in tables → 2.5 the linear model → 2.6 two- and three-way ANOVA → 2.7
repeated measures → 2.11 power → 2.12 ROC curves.

## 2.1 Descriptive statistics, whole

**What.** Statistics on columns grows to Origin's: the statistics chosen from N, missing, mean, SD,
SE, the mean's interval (its level), variance, coefficient of variation, sum, minimum, maximum,
range, Q1, median, Q3, IQR, MAD, robust SD (1.4826 × MAD), mode and its count, skewness, kurtosis,
geometric and harmonic means, and percentiles typed (`5, 95`); the quartiles' method (decision 1);
the divisor (decision 3); by group (indexed) or column by column; which rows; pairwise or listwise.
**Frequency counts**, a kind of its own (`freq`): numbers into bins (Freedman–Diaconis, Sturges,
the square root, a number, a width; a start), or each distinct value or text (a text or
categorical column counts its levels, in the column's order); each bin's from, to and centre (or
its level), count, cumulative count, percent and cumulative percent. **Graphical summary**
(Analyze › Statistics › Descriptive › Graphical summary): a figure of the column's histogram with
a normal curve over it and its box chart, made from the existing plots, so it follows the
processing as they do. Built (12.11): the normal curve's legend gives the mean and SD with their
errors, the box's tooltip the median and quartiles; N and the median are not written on the
histogram as text (information hygiene: the numbers are Statistics on columns' and Results'). The
Statistics window's item, *Descriptive statistics…* until then, is *Quick statistics…*, so it is
not mistaken for the *Descriptive* submenu beside it.

**Pure.** `quantileType(s, p, type)` (R's nine and Tukey's hinges, on sorted values),
`descStats(vals, o)` (every statistic `null` where it has no meaning, with the reason: a geometric
mean of values not all above zero, a skewness of fewer than three values), `freqBins(vals, o)` and
`freqLevels(keys, order)`. In the ANA block, loaded by the worker and `run.mjs`. Built (12.11): the
mean is Neumaier's compensated sum over n; the second pass that corrected it by the mean deviation
was measured by the fuzzer to make it worse where the values cancel (each deviation rounded at the
values' scale: 2.5e-14 against 2e-16 without it). The moments are of the deviations scaled by the
largest; the MAD's distances are taken from the two middle values, not from their rounded mean (a
column near 10¹³ had a MAD 2 % off); the order statistics, the mode and the geometric and harmonic
means are of the values as they are, and only the moments of values past 10³⁰⁰ are worked out a
power of two smaller (scaled with them, a value near 10⁻³⁰⁰ became subnormal and the quartiles
lost their digits).

**Stored.** The analysis's `p`: `stats` (keys, the order of `DESC_STATS`), `qtype`, `conf`, `pcts`,
`vdiv`; `freq`'s `bins {rule, n, w, start}` or `levels`. An analysis made before has none: it reads
as the eleven it had, type 7.

**Checked.** Fixtures of exact rationals and NumPy for every statistic on twelve sets (normal,
log-normal, ties, one value, two values, every value the same, a constant of 10¹³ plus a spread of
1, values from 10⁻³⁰⁰ to 10³⁰⁰ where the statistic can take them); each of the nine types against
NumPy's methods at p = 0, 0.1, 0.25, 0.5, 0.75, 0.9, 1; the fuzzer on random sets; invariances in
stats-test (reordered, shifted, scaled: the mean and quantiles follow, SD and IQR scale, skewness
changes sign under negation, kurtosis does not); ana-drive (the dialog's ticks, method, percentiles,
listwise, rows, a frequency table of numbers and of text, the graphical summary, undo, reload).
Built (12.11): fourteen sets in `fixtures/desc.json` (939 cases; the exact reference is `refs.hf`
and `refs.desc_ref`, shared with the fuzzer), measured: the mean, sum and order statistics exact or
within an ulp, the SD and variance 4e-16, skewness and kurtosis 3e-15 absolute (they are
differences of terms of order 1, judged absolutely below 1), the geometric mean 5e-15 on values
spread over 600 decades, a quantile 1.4e-14 there (the interpolation weight's rounding, which the
gap between the two values multiplies; R's is the same). NumPy agrees with the exact quantiles of
all nine types; SciPy was off where the exact arithmetic was not (its SD of the 10¹³ set 0.100629
against 0.100586, its skewness 0.087 against 2.9e-5, an infinite SD past 10³⁰⁰). NIST's StRD sets
wait for the host to be reachable (`www.itl.nist.gov`).

**Leaves out.** Weights; statistics on rows; the indices of the extremes; moments by the divisor of
weights; several grouping columns at once (one, as 1.3).

## 2.2 Normality and outliers

Shapiro–Wilk (Royston's algorithm, 3 to 5000 values), Lilliefors (Dallal and Wilkinson's
approximation for p, as statsmodels'), Anderson–Darling (the statistic with Stephens' adjustment;
p by D'Agostino and Stephens), D'Agostino's K² (skewness and kurtosis tests combined),
Kolmogorov–Smirnov against a fitted normal (the exact Kolmogorov distribution for its p: the
`distFit` gap closes here); a Q–Q plot made from the result (a graph of the sorted values against
the normal quantiles, its line through the quartiles). Grubbs (one side or two, once or repeated
until none) and Dixon's Q (3 to 30 values, its table), the outliers listed with *Mask* (their rows
in the column's mask, one undo step) and *Mark* (a label on the graph).

Built (12.11), with three departures, each for accuracy:
- **Lilliefors' p is statsmodels' default**, its table of ten million simulations (linear between its
  critical values, past 1600 values their fitted asymptotic form), not Dallal and Wilkinson's formula,
  which statsmodels offers as an option good to two or three decimals; p past the table's ends is
  said as below 0.001 or above 0.99, never printed as if it were a value.
- **Dixon's Q has no table.** r₁₀ for 3 to 30 values, its p for normal samples by integrating over
  the smallest value and the range (Gauss–Legendre, 1.5e-14 against SciPy's adaptive `dblquad`), its
  critical value by halving. A simulation of ten million samples settled a disagreement with the table
  as remembered (n = 6 at 5 %: 0.6275 exact, 0.625 printed, which rejects 5.15 % of normal samples).
- **Kolmogorov's distribution is SciPy's `_kolmogn` taken further.** Past 140 values SciPy takes Pelz
  and Good's expansion where Durbin's matrix would be slow: 5e-6 off at 500 values, 1e-7 at 2000, 1e-9
  at 5000, against the matrix in 40 digits. Kurve uses the matrix while it is 201 wide or less (a
  quarter of a second), and its tail 1 − P below n·x² = 4, where Miller's twice-one-sided was 4e-8 off.
  `distFit`'s p (roadmap 4) moved onto it: 3e-2 off before, 5e-15 now.
- Shapiro–Wilk subtracts the median first (as SciPy, which a 40-digit transcription showed), and every
  test standardises with the mean's own rounding taken out: values near 10⁹ had moved D, A², G and W at
  1e-8. Kolmogorov–Smirnov against the fitted normal is kept (Help says its p is too large).
- Checked: `fixtures/norm.json` (518 cases), each statistic against a 40-digit reference
  (`refs.sw_ref`, `ksnorm_d_ref`, `ad_ref`, `dago_ref`, `grubbs_ref`, `kolm_dmtw`); statsmodels' A² and
  SciPy's K² were 5e-7 off where Kurve was not. Each test's size at 5 % within its binomial interval
  over 20 000 normal samples, Shapiro–Wilk's p uniform below 0.3 (above, Royston's approximation runs
  high: it was fitted to the lower tail), Grubbs' critical values as ASTM E178 prints them, masking
  shown. ana-drive: the dialogs, the Q–Q plot, Mask (the analysis worked out again
  without them, one undo), Mark, groups' own rows, Dixon, a reload.

## 2.3 Comparing means and spreads

One-sample, two-sample (Welch's by default, Student's when chosen) and paired t tests: the
difference's interval, Cohen's d and Hedges' g with their intervals; the variance tests F, Levene
(mean, median: Brown–Forsythe) and Bartlett; one- and two-sample proportions (the normal
approximation and the exact binomial); Fisher's exact test for two by two.

Built (12.11), as above, with these choices: two samples are the first two columns ticked in the
sheet's order, or one column grouped into two; Brown and Forsythe's Levene (about the medians) is the
spreads' default, since about the means Levene's test runs 6 % at 5 % with
6 to 14 values (simulated; SciPy's W agrees with Kurve's to 1e-15); proportions and Fisher's test read
counts typed (`K.typed`: no columns), the 2.10 slice to count them from columns. The t tests carry the
mean's rounding (`msd`'s `e`) into the difference: with values near 10⁶ the double mean had moved t at
3e-9. The noncentral t (`nctCdf`) is Guenther's sum of incomplete betas, 3e-14 absolute against Boost,
whose own was found NaN deep in the lower tail. Checked: `fixtures/test23.json` (334 cases:
the t tests in 40 digits, d's interval against Boost inverted by brentq, SciPy and statsmodels for the
rest), the fuzzer (four generators), stats-test (16 new: each test's size, the intervals' coverage, the
exact tests at or below their level), ana-drive (15). The fuzzer's first full run failed a one-sided p of
2.5e-34 by 9e-9: the reference's, which formed 1 − (1 − tail) and kept six digits of the tail in 40;
Kurve's agreed with the tail computed as itself to 5e-15.

## 2.4 One-way ANOVA

The table (between, within, total: DF, sum of squares, mean square, F, p), η² and ω²; Welch's
ANOVA; comparisons of means: Tukey–Kramer (the studentized range, its distribution a part of this
slice with its fixtures), Bonferroni, Holm, Šidák, Scheffé, Fisher's LSD, Games–Howell, Dunnett
against a control; a means plot with intervals. No letters for groups that do not differ (a
verdict, decision 9); no Levene unasked (Comparing spreads is a click away). NIST's ANOVA sets to
their certified digits (SmLs07–09: centred, two-pass sums).

Built (12.11):
- **The table** is worked out on each group's values less one value (exact within a factor of two,
  Sterbenz), each group's mean with its rounding (`msd`). Against the exact answer for the doubles
  NIST's files parse to: 2e-16. Against the certified values: 13–15 digits for SiRstv and SmLs01–03,
  10 for SmLs04–06 and AtmWtAg, 4 for SmLs07–09. That is all the parsed doubles allow (0.4 near 10¹²
  parses to 0.40002).
- **The studentized range** (`tukeySf`) and **Dunnett's many-to-one t** (`dunnettSf`) are double
  integrals: over s (in ln s) and over the smallest value (or the shared normal). Each is taken about
  its peak in 20-point Gauss–Legendre panels three widths wide, and 1 − (…) is never formed. Dunnett's
  correlation is the many-to-one structure exactly, a one-dimensional integral; SciPy's `dunnett` is
  randomised (1e-1 off at a p of 1e-4).
- **Against 40-digit references** (`range.json`, `--slow`): see the targets. SciPy's studentized
  range is off by up to 5e-13 absolutely (7e-6 relative at a p of 3e-8), drifts past ν = 10⁴ and
  takes the normal's past 10⁵. The fuzzer judges against it at 1e-12, ν ≤ 1000.
- **Comparisons**: Tukey–Kramer, Bonferroni, Holm (no interval), Šidák, Scheffé, Fisher's LSD,
  Games–Howell, Dunnett (two-sided, a control chosen). Those estimated past 150 ms go to the worker
  (`anovaCost`).
- **Checked**: `anova.json` (58 cases), `range.json`, the fuzzer (`anova1@F`, `@p`, `@ssw` against
  rationals; `tukeySf`), stats-test (13), ana-drive (13), perf (two lines).

## 2.5 The linear model

A design matrix from numbers and factors (treatment or effect coding), interactions; Householder
QR with column pivoting (the rank, a dependent column named); the coefficients, their errors, t, p,
intervals; types I, II and III sums of squares; estimable contrasts. The engine 2.6, 2.7 and wave 4
use. NIST's Norris here, Longley from statsmodels; Filip, Wampler 1–5, Pontius and NoInt when the
host is reached (Filip, degree 10, defeats the normal equations: the test that QR is QR).

Built (12.11):
- **The engine** (`linModel`): the design from numbers and factors (treatment or effect coding; all levels for the first
  factor of a model with no intercept), interactions (none, every pair, every combination) and powers; Householder QR on
  columns scaled to length 1, in order, a column whose length left is under 1e-11 of its own aliased (R's rule, tighter:
  R's 1e-7 calls Filip singular); the solution refined on the augmented system with the residuals, the design's products
  and powers, and the solution itself in double-double; the covariance refined on XᵀX (condition up to 1e6) or the
  augmented system (past it). Types I (prefixes of the one QR), II and III (Wald's identity on the refined covariance, or
  refits where columns are aliased; III by effect coding). Contrasts typed by name, refused where not estimable.
- **Against exact rationals** (`lm.json`, 18 designs): coefficients, errors, t and sums of squares to 2–6e-16, p to 1e-14;
  NIST's Longley agrees with its certified values (asserted when the fixtures are made), statsmodels' `anova_lm` types II
  and III with sum coding. Filip itself waits for the host; a polynomial of degree 10 on 82 points over the same range,
  condition 1e8, is exact. The fuzzer's random designs agree to 5e-16 up to a condition of 1e11; past about 1e12 Kurve
  calls a column aliased that exact arithmetic would still separate.
- **Checked**: `lm.json`, the fuzzer (`linModel@b`, `@se`, `@ss`, `@pF`), stats-test (11), ana-drive (11), perf (two lines).

## 2.6 Two- and three-way ANOVA

Balanced and unbalanced (type III by default, the type in the method line), interactions, simple effects,
comparisons on the main effects; the interaction and main-effects plots made from the result.

Built (12.11):
- **On the linear model** (`anovan`): every column but the response a factor, effect coding, all interactions or none,
  types I to III; partial η² (a term's sum of squares over itself and the error's).
- **Rows of the model** (`lmCell`, `lmEmmL`, `lmEst`, `lmWaldL`): estimated means as the mean of the fitted cells, each
  alike; differences with their own errors; comparisons by one-way ANOVA's methods (`lmCompare`; Tukey's q √2|d|/se);
  simple effects as Wald's F on the error's df; a mean over an empty cell refused as not estimable.
- **Plots**: the interaction plot (the cells' means of the first two factors) and the main effects plot (a figure), made
  from the result sheet's columns.
- **Checked**: `nway.json` (exact rationals: means, cells, every difference, every simple effect; one design about 1e6), the
  fuzzer (`nway@se`, `nway@F`, through `anaRunKind`), stats-test (6), ana-drive (13), perf (one line).

## 2.7 Repeated measures

One- and two-way, the data wide or long with a subject column; Mauchly's test of sphericity,
Greenhouse–Geisser and Huynh–Feldt corrections.

Built (13.11):
- **The tests** (`rmAnova`): each within effect from integer Helmert contrasts of each subject's values, worked out in
  double-double and regressed on the between design; sums of squares by Wald's identity over the contrasts' norms, so exact
  and free of the basis. Greenhouse–Geisser's ε from the residuals' covariance; Huynh–Feldt's as SPSS (at most 1); the
  lower bound; Mauchly's W and its χ².
- **Data** (`rmData`): wide, the columns ticked the cells (two factors: the first's levels outermost), Group by the between
  factor; long, the response, subject, one or two within factors and a between one named; a subject's several values in a
  cell averaged, one missing a cell left out and counted.
- **Kind** `rm`: the tests with every correction's p, Mauchly's test, between subjects, partial η², the cells' means, paired t
  of each within factor's levels (Bonferroni or Holm); a profile plot from the result.
- **Checked**: `rm.json` (exact rationals, statsmodels' AnovaRM agreeing on the within-only designs), within 1e-15 for sums
  of squares, F, ε and W; the fuzzer (`rmAnova@…`, through the analysis too); stats-test (5); ana-drive (10); perf (one line).

## 2.8 Nonparametric tests

Mann–Whitney (exact without ties for small samples, else normal with the continuity and tie
corrections; the Hodges–Lehmann shift and its interval), Wilcoxon signed-rank (exact and
approximate, zeros as Pratt or Wilcoxon), the sign test, Kruskal–Wallis with Dunn's comparisons,
Friedman, Mood's median test, two-sample Kolmogorov–Smirnov (exact for small samples). Their exact
distributions are parts of this slice, with fixtures.

Built (12.11):
- **Exact distributions**: U by Mann and Whitney's recurrence in probabilities, T+ by its subset sums,
  both matching enumeration; used while there are no ties (and no zeros) and the samples are under 50,
  as R. Two-sample KS on the lattice of the two samples' steps, each point holding its share of the
  paths that have touched the boundary, so a small p is never 1 − (…).
- **Hodges–Lehmann**: the shift (every x − y) and pseudo-median (the Walsh averages), the interval from
  the exact distribution's quantile (R's order statistics) or Hollander and Wolfe's normal one; to two
  million differences.
- **Kinds**: Mann–Whitney (U, p, shift, rank-biserial r), Wilcoxon signed-rank (one sample or paired;
  Wilcoxon's or Pratt's zeros), sign test (the median's interval and its own level), Kruskal–Wallis
  (ε², Dunn's comparisons by Holm or Bonferroni), Friedman (Kendall's W; rows complete in every
  column), Mood's median test, two-sample KS.
- **Checked**: `np.json` (62 cases: SciPy's statistics and p, the intervals and Dunn's z in
  rationals), all within 4e-15; the fuzzer (four generators against SciPy, worst 4e-14, KS 2e-13);
  stats-test (8: enumeration, sizes, coverage, refusals); ana-drive (11); perf (one line, 430 ms a
  test on a million values).

## 2.9 Correlation

Pearson's r with p and its interval (Fisher's z), Spearman's ρ (ties), Kendall's τ-b (exact for
small n), partial correlation; the matrix of a table's columns (listwise or pairwise) into a
result sheet, with a scatter matrix made from it.

Built (12.11):
- **1 − r²** in double-double (two-sum, two-product) from the deviations, not from a rounded r, so t,
  p and Fisher's z keep their digits near ±1; the references take it as an exact rational.
- **Kendall's exact p** by the permutations' inversion counts as integers (BigInt), each tail summed
  from its own end; τ-b by Knight's merge sort.
- **Partial r** from the inverse of the correlation matrix, over the rows complete in every column.
- **p from 1 − r²**: t's tail is I_{1−r²}((n − 2)/2, ½), so p is taken from it with no t formed; the incomplete
  beta's x^a by `pow` far below its peak (it was e^{a ln x}, a·|ln x| roundings): t's tails 6.5e-14 → 2.8e-14.
- **Checked**: `corr.json` (57 cases, exact rationals), all within 6e-15; the fuzzer (worst 4e-14,
  with r within 10⁻¹³ of ±1); stats-test (8); ana-drive (9).

## 2.10 Counts in tables

χ² test of independence (the expected counts in the report), Fisher's exact
test (two by two; Freeman–Halton for small larger tables), McNemar; from two text columns (a
cross-table) or a table of counts.

Built (12.11):
- **One kind** (`xtab`): two columns of categories counted row by row, or a table of counts (its rows the
  sheet's, or a column of names'); the counts with totals, the expected counts, χ² (Yates' for two by two on a
  switch), G, Fisher's exact test (two by two fisher22's, with the odds ratio; past it Freeman–Halton, every
  table with the margins, up to two million), McNemar (χ² as R's, not clamped, and the exact binomial p),
  Cramér's V.
- **Checked**: `xtab.json` (exact rationals; Freeman–Halton enumerated in rationals), the fuzzer (χ²'s p, Fisher's
  r × c), stats-test (5), ana-drive (6).

## 2.11 Power and sample size

For the t tests, one-way ANOVA, proportions and variances, by the noncentral t, F and χ² (their
distributions a part of this slice, with fixtures): power for a size, the size for a power, a graph
of power against size.

## 2.12 ROC curves

From a score column and a group of two levels: the curve, the area with its interval (DeLong), the
cut-off by Youden's index.

## Words

The glossary holds (`tools/ux/terms.py` reads 0): *column*, not variable, where a column is meant;
*group*; *missing*; *the processed data*. A test's name is its name (Welch's t test, Shapiro–Wilk),
in Help's search words with the names people type (normality test, outlier test, t-test, ANOVA).
