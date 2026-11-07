# Wave 1: the foundations

The first wave of `PARITY_SPEC.md` after the bench: what the statistics, the worksheet as a table,
the reshaping, the transforms and the multivariate methods are built on. Four parts: project files
(1.1), text in the worksheet (1.2), analyses with result sheets (1.3), and the distributions
(1.4). This spec is the wave's: what Origin does, where Kurve stands, the decisions, the order, and
each slice with what it changes, how it is checked and what it leaves out. It follows the plan's
bar (`PARITY_SPEC.md`, "The bar"), which is not repeated here.

Origin's documentation could not be opened from this session (its network refused
docs.originlab.com); what follows rests on search engines' readings of these pages, and the
points to check in Origin itself are marked *(to confirm)*:
[Recalculating analysis results](https://docs.originlab.com/origin-help/analydialog-recalculate/),
[the Recalculate list](https://docs.originlab.com/quick-help/recalculation-in-dialog/),
[analysis report sheets](https://d2mvzyuse3lwjc.cloudfront.net/doc/Origin-Help/Analysis-Rep-Wks-Cols),
[the Categories tab](https://docs.originlab.com/origin-help/colproperties-dialog-categories-tab/),
[categorical ordering](https://docs.originlab.com/tutorials/categorical-values-ordering/),
[the Properties tab](https://docs.originlab.com/origin-help/colproperties-dialog-properties-tab/),
[numbers in Origin](https://docs.originlab.com/origin-help/number-in-origin),
[dates and times in the worksheet](https://docs.originlab.com/origin-help/wkscol-datetime/).

## How Origin does it

- **Projects** are files (`.opju`), saved with Ctrl+S and opened anywhere; a project holds every
  workbook, matrix, graph and note of the work.
- **Cells.** A column's format is *Text & Numeric* by default (since Origin 6): a cell holds a
  number or text, and what is typed is a number when it reads as one. *Numeric* columns take only
  numbers; *Text* columns keep what is typed as text; *Date* and *Time* columns store numbers shown
  as dates. Analyses read a column's numbers; its text cells count as missing. A check box (*Do not
  convert text to numeric during data entry*) keeps "007" as typed *(to confirm: its scope)*.
- **Categorical columns.** *Set as Categorical* makes a column's values the levels of a factor; the
  Categories tab orders them unsorted (in the order first seen: BBACB gives B, A, C), ascending,
  descending, or by hand (add, delete, any order). The order is the order of plots, legends,
  grouped statistics and the category index; the worksheet can be sorted by it.
- **Analyses.** An analysis dialog writes a *report sheet* (tables of results, read only) and often
  result columns, each marked by a lock. Its *Recalculate* list is None (the results are cut from
  their input), Manual (the default: the lock turns yellow when the input changes, and Recalculate
  updates) or Auto (updated when the input changes). The lock's menu has *Change Parameters*
  (the dialog again, with its settings), the mode (ticked), Recalculate, and *Block
  Recalculation*. Setting None removes the operation.

## Where Kurve stands

- Projects live in the browser's storage (IndexedDB) or the claude.ai store; nothing can open a
  whole project again from a file. The CSV, the steps' JSON and the report leave; the work does not.
- A cell holds a number or nothing. An import keeps the longest block of numeric lines and drops a
  column of names; a value that does not read as a number is refused when typed. The check code is
  the SHA-256 of the cells written as text (`rawText`: `String(v)`, commas between, a line a row).
- Statistics are the Statistics window's (n, mean, SD, SE, median, min, max of each curve, Pearson
  r between curves) and a fit's own analysis. Nothing writes results into the worksheet but Find
  X/Y's fill and `fit(B)`/`resid(B)`, and nothing is recalculated but formulas and fits that follow.
- The distributions are `betai` (Numerical Recipes' continued fraction and log-gamma: 1e-9
  relative), `tPvalue`, `tCrit` (bisection, 1e-8 at a million degrees of freedom), `fPvalue`,
  `erfFn`, `erfcFn` and `probit` (now Cody's and the lower tail, 1e-16), and `distFit`'s
  Kolmogorov–Smirnov p (an approximation, 3 % off at n = 20).

## Decisions

1. **A cell holds a number, text or nothing, in any column**, as Origin's Text & Numeric: what is
   typed or imported is a number when it reads as one, text otherwise. Lab data has "<LOD", "n/a",
   "sat." among its numbers: kept and seen, never lost on import, and left out of what reads
   numbers, which says how many it left out. (This replaces the plan's either-or `c.type`.)
2. **A column can be made Text** (`c.fmt = "text"`): what is typed stays as typed, "007" and "1e3"
   too; its cells are never numbers. A column can be made *Numbers only* (`c.fmt = "num"`), which
   refuses text as today. The default, no `fmt`, is the first decision's.
3. **Categorical** is a property of a column (`c.cat`), not a type: its levels are its distinct
   values (text, or numbers), in the order chosen (first seen by default, as Origin's Unsorted).
4. **The check code of a project of numbers does not change.** A text cell is written into the
   hashed text as an RFC 4180 quoted field (`"<LOD"`, a quote doubled), so text that looks like a
   number is not the number, and the original-data CSV, which writes exactly the hashed lines, is a
   valid CSV.
5. **Project files open as new projects**, never over one, whatever is in them, with a new
   project id, a name made unique, their comments with them, and their check code checked.
6. **Ctrl+S saves the project to a file**, the same file again where the browser can keep a file's
   handle (Chrome and Edge: the File System Access API), a download each time elsewhere.
7. **An analysis's results are a sheet of their own** (read only, computed, outside the check code,
   plotted and read by formulas like any sheet), marked with a lock in its tab and its columns'
   headers, and its whole report (tables, notes, the sentence of what it found) is shown in
   Results, as a fit's is. One window for formatted results, as now.
8. **Recalculation is Auto by default** (Origin's default is Manual). Kurve's processing, peak sets
   and fits that follow their data already update by themselves, and a user who changes a step
   expects what reads it to follow; Manual is a choice per analysis, None is "Cut from its data"
   (the sheet's values stay, the analysis goes).
9. **The distributions are rebuilt where the bench found them short**, not patched: the incomplete
   beta and gamma from accurate log-gamma and log-beta (the large-argument corrections of
   Didonato and Morris), each function with its cdf, upper tail and quantile, accurate to its
   target from 1e-300 to 1.

## The order

1.1 project files, 1.4 the distributions (pure, independent, and what 1.3's first analysis needs),
1.2a–d text in the worksheet, 1.3a–c analyses. Each is committed and pushed when its checks pass;
the wave ends with the plan's end of a wave (the suite, a lab day, screenshots, the documents).

## 1.1 Project files

Done 07.11 (as below; where it differs from what was planned, the text says so).

**The file.** `<name>.kurve`: gzip (`CompressionStream("gzip")`) of UTF-8 JSON,
`{format: "kurve-project", fv: 1, v (the document version), saved (ISO time), by, fp (the check
code at saving), project, comments, extra}`: `project` the document as stored, its columns' values
of 256 or more that are all numbers or empty as `{$f64: base64}` (little-endian Float64Array, NaN
for empty), the rest as JSON (text cells after 1.2 among them); `comments` the project's threads;
`extra` the browser-only things the project uses. As built it is empty: a fit keeps a copy of its
function (`fit.fn`), a library function used in a fit is adopted into the project, and fit settings
saved in the project are in it, so nothing a project's results need lives in the browser alone; the
key stays for what a later version adds. Unknown keys are kept on open and ignored.

**Saving.** File › Save to a file… (Ctrl+S; File › Save a copy to a file…, Ctrl+Shift+S, always
asks): with the File System Access API the first save asks where and keeps the handle for the rest
of the session (after a reload the browser would ask for its permission again anyway, so the next
Ctrl+S asks where), and Ctrl+S writes there again silently with a toast; a refusal (permission gone,
file moved) asks again. Elsewhere it downloads
`<name>.kurve` each time (`saveFile`). Pending check codes are settled first (`fpSettle`). The title
bar's project field shows the file's name and time in its tooltip after a save (`p.file {name, at}`, not in `UNDO_KEYS`).
File › Back up every project… writes one file (`format: "kurve-backup"`, every project of this
browser with its comments).

**Opening.** File › Open a project file… (Ctrl+O stays Import; the import dialog's picker and a
file dropped on the window take a `.kurve` too): the file is checked before anything is made: the
gzip read through `DecompressionStream`, counted as it streams and refused past 512 MB inflated (a
bomb; built at 512 MB rather than the 2 GB first planned, as one JSON string cannot be much longer in
a browser: `PF_MAXIN`), the JSON parsed, `format` and `fv` known (a newer `fv` refused in words: "made by a newer
Kurve"), the project's shape checked (`cols` an array of columns with ids, the rest through
`migrate` and `normalize` as storage is), every `$f64` decoded and its length checked. Then a new
project: a new id, the name made unique (`uniqueProjName`), the comments copied under it, the
project opened, a toast with what it holds and its check code compared with the file's (`fp`) and
with the record's last entry: equal, said; different, said with both codes, the file kept as it is.
A backup offers its projects in a list, each opened as above. A file of another kind (a CSV named
`.kurve`, a truncated gzip) is refused in words, nothing made.

**Checked** (a new drive, `tools/file-drive.mjs`): every example saved and opened again equal
(columns, steps, peaks, bands, fits, graphs, annotations, comments, the check code); a project of a
million rows saved and opened (budget: 2 s each way in tools/perf.mjs; 570 and 655 ms measured); the same file opened
twice (two projects, names unique); a file from an older document version upgraded; a newer `fv`
refused; truncated, not gzip, not JSON, wrong shape, a `$f64` of the wrong length, a gzip bomb (a
200 MB stream of zeros inflating past the limit) refused with nothing made; Ctrl+S twice with a
mocked handle writing the same file; a backup of three projects restoring two; undo after opening
(nothing to undo: opening is not a change of a project). The junk files are file-drive's eleven
refusals, not odd-test's, so the slice's checks are in one place.

**Not in 1.1:** merging a file into an open project (Copy from another project does that once both
are open); keeping a file in step with the project (the browser cannot watch a file; a save is a
copy at that moment); `.opju`.

## 1.4 The distributions

A block of its own, `==STATS:START==`/`==STATS:END==`, pure, after MODELS; loaded by
`tools/ref/run.mjs` (its BLOCKS list), the compute worker and a new `tools/stats-test.mjs`.

**Functions** (each `{cdf, sf, ppf, isf}` where it has them, `sf` the upper tail computed as such,
never 1 − cdf; `ppf` and `isf` by a starting approximation and Newton or Halley steps on the
accurate tail, bisection where they fail):
- the log-gamma `lgam` (the Lanczos one of today, 2e-15, with Stirling's series past 10⁷ and
  `lgam1p` near 1 and 2), the log-beta `lbeta` (with the correction terms for large arguments, so
  `lbeta(5e6, 0.5)` keeps its digits), `lgamma` and `gammaln` both going through it;
- the regularised incomplete beta `ibeta(a, b, x)` and its complement `ibetac`, by Lentz's
  continued fraction on the side that converges, its prefactor x^a (1 − x)^b / (a B(a, b)) in logs
  (the cause of today's 1e-9), with the power series for small b·x; the incomplete gamma `igam`,
  `igamc` (series and continued fraction, the prefactor in logs); their inverses;
- the normal (`norm`), Student's t, F, χ², gamma, beta, binomial, Poisson, hypergeometric;
- noncentral t (Lenth's AS 243), noncentral F and χ² (Poisson mixtures, summed from the mode out),
  for power (2.11);
- the studentized range (`ptukey`, `qtukey`: Copenhaver and Holland's integration, R's), for
  Tukey's comparisons (2.4);
- the Kolmogorov distribution exact for one sample of n (Marsaglia, Tsang and Wang, 2003) and its
  limit; the Wilcoxon signed-rank and Mann–Whitney exact distributions by counting (n up to 50 and
  sizes to 50 by 50; the normal with its corrections beyond);
- Shapiro–Wilk's W and p (Royston's AS R94, 3 to 5000 values); Anderson–Darling's p for a known
  distribution (Marsaglia and Marsaglia, 2004) and for the normal with its parameters estimated
  (D'Agostino and Stephens' table, as R's nortest).

`betai`, `tPvalue`, `tCrit`, `fPvalue` keep their names and become the block's (`tPvalue(t, dof)` is
`2·t.sf(|t|, dof)`), so every caller gains the precision; `distFit`'s `pks` takes the exact
distribution (2.2 adds Lilliefors' for estimated parameters).

**Checked:** `tools/ref/make-fixtures.py` gains cases for every function (mpmath at 40 digits:
`mp.betainc`, `mp.gammainc`, `mp.ncdf`, noncentral and studentized range by integration in mpmath;
the exact rank distributions by counting in Python; Shapiro–Wilk against `scipy.stats.shapiro` and
Royston's published table); `targets.json` their targets (1e-13 relative for the special functions,
1e-12 for cdfs and tails to 1e-300, 1e-11 for quantiles, 1e-7 for the studentized range); the
fuzzer a generator each; `stats-test.mjs` the properties (cdf + sf = 1 where both are large, the
quantile of the cdf is the value, symmetry, monotonicity, the limits at 0 and ∞, the rank
distributions summing to 1). `betai`'s, `tCrit`'s and `pks`' `until` in targets.json are removed:
they must reach their targets.

**Not in 1.4:** distributions no planned test uses (Weibull, log-logistic, the multivariate t
beyond Dunnett's own sub-slice in 2.4); random numbers beyond `fillSeries`' own.

## 1.2 Text in the worksheet

### 1.2a The model and the worksheet

**The cells.** `c.data[i]` is a number, a string (never empty: an empty cell is null) or null.
`c.fmt`: missing (numbers and text), `"text"`, `"num"`. One door each:
- `cellRead(c, s)`: what typing `s` into a cell of `c` makes (a number by `parseNum` unless the
  column is text; text unless the column is numbers only, where it is refused as today);
- `numData(c)` (a column's numbers, text as null, memoised per array) and `textCount(c)`;
- `cellText(v)` (how a cell is shown: a number by the column's format, text as it is).
Every place that reads `.data` (212 matches today) goes through one of them or is a copy that
needs neither; the list, file and line, goes in the spec of the slice's drive, and the drive greps
for readers left (`\.data\b` outside the doors and an allow-list of copies).

**What reads numbers** says what it left out: a curve (`rawSeries`) leaves text out as it leaves
out an empty cell, and the History's Original data box, the status bar's cell numbers and the
Statistics window name how many text cells (*3 text values left out*). A formula reads a text
cell as empty (comparisons with text are wave 3's). A fit or a step never sees text.

**The worksheet.** Text is drawn as typed, left-aligned unless the column is aligned otherwise;
a number column's text cells in the text colour with a dotted underline (`td.txt`, a tooltip
*Text, not counted as a number*), so "<LOD" among numbers is seen. Typing: `cellRead`; Enter in a
number column on text that is not meant (`1,2.3`) keeps it as text, said once by a toast with
*Make it a number*… (the cell as typed, the number read from it if one can be, else nothing). The
column menu: *Cells hold* → Numbers and text (the default), Text only (every number becomes its
text as shown), Numbers only (refused while text is there, saying where). Sorting the view: numbers
before text, text in natural order (`localeCompare` with numbers and accents, the browser's
locale), empty last. Find matches text cells. Fill: text is copied; "Sample 1, Sample 2" continues
by its last number, as Excel's. Copy and paste carry text as it is (TSV, a field with a tab or a
newline quoted). The label rows are unchanged.

**Stored, merged, undone.** Text stays JSON (`idbPack` packs only arrays of numbers and nulls, as
now); `mergeCols` compares cells with `===` (strings work); undo snapshots share arrays (strings
are values). The check code (decision 4): `rawText` writes a string cell as a quoted field;
numbers as now. The raw-data CSV export writes the same lines; its header says how text is
written.

**Checked:** `pipe-test` (the check code of every numeric fixture unchanged, a text cell's
quoting, `sha256sum` of the export reproducing it), a drive section (typing text into each kind of
column, the marks, the toast, *Cells hold* each way and its refusal, sort, find, fill, copy,
paste, undo, a reload, two tabs typing text and numbers into one column), `sheet-fuzz` typing text
among numbers (its checks reading `cellText`), `odd-test` text from storage in every broken form
(objects, booleans, empty strings, a megabyte of text in one cell).

### 1.2b Imports keep text

`findBlock` takes a block whose lines have the same number of fields, each column numbers in most
lines or text in all, so "Sample A,1.2,3.4" lines are one block; a numeric column's stray text
("n/a") is kept as text cells; a column of text is a data column (`ignore`) named by its header,
or a labels column when it is the first and every value differs. The wizard's *Use* list gains
*Text* (a data column kept as text, `fmt:"text"`), and its preview marks text cells.
`parser-test` gains the cases (names beside values, "n/a" and "<0.01" among numbers, quoted
fields with commas, a column of IDs like "007", a file whose last column is notes).

### 1.2c Categorical columns

The column menu's *Categorical…* (ticked when set): the levels listed with their counts, ordered
first seen, ascending, descending (natural order for text, by value for numbers) or by hand (drag,
or ↑/↓); one undo step; `c.cat = {order, levels}` (`levels` only for `custom`, cleaned of values
no longer there, new values after them). `catLevels(c)` is the one door. The header shows a small
*cat* tag. Data › Sort the view gains *By categories*. A column with more than 200 levels is
refused in words.

### 1.2d Graphs read text

Labels from a text column (Plot setup's Labels and *Labels from* already take a column: text now
too); a categorical X (Plot setup's X, a text or categorical column: positions 1…k in its order,
named along X: the names along X of today from a column, `ax.x.cats` written from it); box and
violin charts grouped by a categorical column (`distBy` takes text; its 60-group limit kept);
Plot setup's *Group by* (a curve per level of a categorical column, in its order, as Origin's plot
by group, each named after its level, a group of PLOT_SPEC slice 4 made of them). `plot-drive`
gains the sections.

## 1.3 Analyses and result sheets

The framework, as `PARITY_SPEC.md` 1.3 sets it out (`p.ana`, `ANA_KINDS`, `anaRead`, the reading
of decision 4 there, its step flags), with what this spec adds:

- **The result sheet** (`sheet.ana = id`): its tab carries the lock (`i-lock`), the columns a lock
  in their header; read only (typing into it says *These are the results of …: change its
  settings instead*, with the button); a column of it can be plotted, read by a formula, copied,
  and moved to another sheet (then it is a copy, cut from the analysis, said). Its first row of
  labels names what each column is (Long Name, Units) and Comments say the analysis.
- **The lock's menu** (the tab's, the header's, the History box's): *Report* (Results, open at the
  analysis), *Change settings…* (the dialog with its settings), *Recalculate* (Manual; greyed when
  up to date), *Recalculate by itself* (ticked for Auto) and *Only when asked* (Manual), *Cut from
  its data* (the values kept as an ordinary sheet, the analysis gone; one undo step), *Delete the
  analysis* (its sheet too; confirmed when anything reads its columns).
- **Out of date** (Manual, or Auto while recalculating is impossible: an input column deleted, a
  step that refuses): the lock turns to the warning colour with a tooltip saying why, the report
  says so first, a formula or graph reading it is not stopped.
- **Results** shows the fit or an analysis: a list at its top when the project has analyses
  (*Showing: the fit of B | Descriptive statistics 1 | …*), the History's box or the result sheet
  selecting it. The report is drawn from `res.report` (`{sections: [{title, rows: [[name, value,
  error?]], tables: [{head, rows}], notes}]}`), never from HTML, so the copied table, the CSV and
  the exported report read the same object.
- **The first kind**, to prove the framework (1.3a): *Descriptive statistics* of the selected
  columns (the Statistics window's numbers for columns as variables, by group when a categorical
  column is chosen), its table into the result sheet, its report, recalculated when a value
  changes. Wave 2.1 grows it to the whole of descriptive statistics.
- **History and report.** A box per analysis (`ana:<id>`), fed by dashed lines from its inputs'
  last boxes, with its discussion and the lock's menu; the exported report a section per analysis
  (its report, its inputs with their steps and check codes, its settings).

**Checked** (a drive section per slice): the result sheet made, read only, its lock and menu; a
value changed and the result recalculated (Auto) or marked (Manual) and recalculated; a step added
to an input and the result following (the processed reading); masked points left out and counted;
an input deleted (out of date, why); *Cut from its data*; delete with a reader; undo and redo of
each; a reload, a project file and another tab; the reading of decision 4 from every place a
command starts; a job of 10⁶ rows in the worker with Stop; the report's three outputs equal.

**Not in 1.3:** analyses that write into the input's own sheet (Origin's result columns beside the
data: `fit(B)` already does that its way); blocking recalculation (Manual does it); an analysis of
another analysis's report (its result sheet's columns are columns, which is enough).

## Words

New words in the glossary (`ux/UX_SPEC.md` §3.6) with the slice that brings them: *text value*
(a cell that is not a number), *categorical*, *level*, *result sheet*, *analysis*, *recalculate*,
*project file*. `terms.py` reads 0 at every slice.
