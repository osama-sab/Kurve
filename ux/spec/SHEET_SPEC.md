# Wave 3: the worksheet as a table

The third wave of `PARITY_SPEC.md`: what makes the worksheet a data table rather than a list of
curves. Formulas that reach other rows, aggregates, conditions, text and other sheets (3.1); two
sheets on screen at once (3.2); filters (3.3); conditional formatting (3.4); reshaping as analyses
(3.5); matrices (3.6); Excel files read and written (3.7). This spec is the wave's: what Origin
does, where Kurve stands, the decisions, the data model, the order, and each slice with what it
changes, how it is checked and what it leaves out. It follows the plan's bar (`PARITY_SPEC.md`,
"The bar"), the plan's decisions 2 (column formulas, no cell formulas) and 3 (a filter is a view,
an analysis keeps its own rows), and the user's rules of information hygiene (`ux/UX_SPEC.md`
§3.8) and of numbers, not verdicts (STATS_SPEC decision 9), none of which are repeated here.

Origin's documentation could not be opened from this session (its host does not resolve here, as
for waves 1 and 2); what follows rests on search engines' readings of these pages, and the points
to check in Origin itself are marked *(to confirm)*:
[Set Column Values](https://docs.originlab.com/origin-help/wks-setcolval-menuopt-dialog/),
[entering expressions](https://docs.originlab.com/origin-help/wks-setcolval-expression/),
[using a formula to set cell values](https://docs.originlab.com/origin-help/using-formulae-to-set-cell-values/),
[Data Filter](https://docs.originlab.com/origin-help/wks-datafilter/),
[Conditional Formatting](https://docs.originlab.com/origin-help/conditional-format/),
[Rearranging, filtering and conditional formatting](https://docs.originlab.com/origin-help/rearranging-filtering-conditional-formatting/),
[stacking](https://docs.originlab.com/origin-help/wks-stacking-cols/) and
[unstacking](https://docs.originlab.com/origin-help/wks-unstacking-cols/),
[splitting into sheets](https://docs.originlab.com/origin-help/split-wks-into-sheets/),
[transposing](https://docs.originlab.com/origin-help/transpose-wks/),
[Reduce Rows](https://docs.originlab.com/origin-help/reduce-rows/),
[Reduce Duplicated Rows](https://docs.originlab.com/origin-help/reduce-duplicate-rows/),
[matrix books](https://docs.originlab.com/user-guide/matrix-book-matrix-sheet-matrix-objects/),
[matrix dimensions and XY](https://docs.originlab.com/origin-help/mats-dim-xycoord/),
[setting matrix values](https://docs.originlab.com/origin-help/set-mat-value/),
[importing from Excel](https://docs.originlab.com/origin-help/import-excel/),
[the Excel Connector](https://docs.originlab.com/app/excel-connector/).

## How Origin does it

- **Column formulas** (Set Column Values, and the F(x)= row since 2017): an expression of other
  columns by their short names (`A`, `col(A)`), `i` the row and `j` the column (lower case: `I`
  is column I), a row of a column by `A[i-1]` or a range `A[i-2:i]` (`total(A[i-3:i+3])`),
  aggregates of a whole column (`mean(B)`, `total`, `sum`, `sd`, `min`, `max`, `count`), a
  conditional (`ifelse(cond, a, b)` and `cond ? a : b`), comparisons and logic (`>`, `==`, `&&`,
  `||`, `!`), other sheets and books (`[Book2]Sheet1!B`), and LabTalk variables; a formula is
  recalculated Auto, Manual or None. Missing values are `--` and propagate *(to confirm: through
  `ifelse`)*.
- **Data Filter** (Worksheet › Data Filter, a funnel in a column's header): by the column's
  format, numbers (Equals, Less than, Greater than, Between, Top 10 and Bottom 10 by count or
  percent, Above or Below average, and a second condition by And or Or), text (a list of the
  values ticked, a custom filter of conditions), dates; filters on several columns combine by
  And; rows not passing are hidden and *(to confirm: leave plots and analyses)*; after the data
  change the funnel turns yellow and *Reapply* brings the filter up to date.
- **Conditional Formatting** (Origin 2019; Worksheet › Conditional Formatting): *Highlight* (rules:
  greater, less, between, equal, text containing, top and bottom n, above and below average,
  duplicates, each a fill and font colour), *Duplicate*, *Heatmap* (a palette or a list of colours
  over the values, by levels), and a *Manager* that lists, edits, orders and removes the rules of
  the sheet.
- **Rearranging** (Worksheet › Restructure and Worksheet menus): Stack Columns (several columns
  into one with a column of their names, *Include Label* rows), Unstack (indexed data into a
  column per group), Split Worksheet (rows into sheets by a column's values or every n rows),
  Pivot Table (row source, column source, data, method sum, mean, count…), Reduce Rows (delete n
  rows then skip m, or merge every n rows by mean, sum…), Reduce Duplicated Rows (remove all, keep
  the first or last, average, with a tolerance), Sort (the rows reordered for real), Transpose,
  Join by a key column, Append. Each writes a new sheet or book, most with Recalculate.
- **Matrices**: a matrix book holds matrix sheets, each one or more matrix objects: Z on a grid of
  rows (Y) and columns (X), the X and Y evenly spaced from their first to their last value (a
  matrix's "XY mapping"), or given by vectors *(to confirm)*; Set Matrix Values (an expression of
  `x`, `y`, `i`, `j`); Transpose, Flip (horizontal or vertical, with or without the coordinates),
  Rotate by 90°, Shrink, Expand (biquadratic), Crop by X and Y, Set Dimensions and Labels;
  converted from a worksheet (direct, XYZ gridding, by columns) and to one; imported from images
  (grey or RGB channels); plotted as heat maps, contours and 3D surfaces.
- **Excel** (the Excel Connector since 2021b): the first sheet or a chosen one, or every sheet;
  header lines into Long Name, Units and Comments, automatic or chosen; the sheet's name kept as a
  parameter; values as the workbook stored them (formulas' cached values); merged cells *(to
  confirm)*; the 1904 date system *(to confirm)*. Origin writes `.xlsx` with File › Export ›
  Excel.

## Where Kurve stands

- **Formulas** (CLAUDE.md, Formulas): a column computed row by row, `c.fx = {src, refs}` kept by
  column id; letters, `x` the row's X, `i` the row; `compileExpr`'s arithmetic and its functions;
  a row where a column read is empty is empty; `fit(B)` and `resid(B)` a formula of their own;
  recalculated by `recalcFx` from `save` and `normalize` in the order of their dependencies; a
  circle and a deleted input said in `FX_ERR`. A formula reads only its own sheet's letters
  (`fxShow` already *writes* `Sheet!L` for a column moved away); no row of another row, no
  aggregate, no condition, no text, no constant.
- **Views of a sheet**: sorting (`S.wsSort`, per session) and hiding (`p.wsHide`, kept, undone)
  through `wsOrder`'s `ord`/`inv`; Find. No filter; no colour but the selection, text marks and
  computed columns' tint.
- **Analyses** (FOUNDATION_SPEC 1.3, STATS_SPEC): result sheets that follow their data, rows
  `[from, to]`, listwise or pairwise, groups by a column; text in a result sheet's columns. No
  analysis reshapes.
- **Maps**: a series of columns drawn as a heat map, contours or contour lines against the series
  variable (`p.series`). No matrix: a grid of Z exists only as columns of a series.
- **Files**: CSV and text in many shapes, JCAMP-DX, SPC, OPUS, SPE, project files. No Excel; a
  paste reads tab-separated text only.

## Decisions

1. **Column formulas grow; fit functions and steps' formulas do not.** Everything 3.1 adds
   (rows, aggregates, conditions, text, other sheets, constants) is the worksheet's grammar,
   `compileExpr(src, {sheet:true})`. A fit function, an X conversion and a step's formula keep
   theirs exactly (wave 4 decides on conditions in fit functions), so no saved function changes
   its meaning: a parameter called `sum` or `if` stays a parameter there.
2. **Missing in, missing out.** A missing value (an empty cell, a text cell read as a number, a
   row past a column's end or before its start, a result that is not a finite number) makes
   missing every operation and function it enters, comparisons included; `if` works out only the
   branch it chooses; `missing(v)` is 1 for a missing value and 0 otherwise. This is today's rule
   (a row where a column read is empty is empty) said for every new construct, so every formula
   from before gives the same values (a check over every example and fixture).
3. **An aggregate reads the whole column as it is**: its numbers, text and empty cells left out,
   every row (never a view: a filter, a sort or hidden rows change nothing a formula computes).
   `count` counts numbers. `sd` and `var` divide by n − 1, as Origin, Excel's STDEV and STATS_SPEC
   decision 3; `median` and `percentile` are type 7 (STATS_SPEC decision 1).
4. **Rows by number, from 1.** `B[k]` is row k of B (as the row numbers of the sheet), `B[i-1]`
   the row above; a row before the first or past the last is missing; a row number that is not
   whole (to 1e-9) is missing, never rounded. A column never reads itself, even at another row
   (no recursion; a running sum is `cumsum(B)`).
5. **Text is compared, never computed with.** `C == "control"` and `!=` compare a cell's text
   exactly (case and spaces count, as categorical levels do); a number never equals a text (as
   Excel's `=`); an empty cell compared is missing. Ordering text (`<`) is refused in words; two
   columns compared with `==` compare numbers as numbers and text as text.
6. **Another sheet by its name**: `Sheet2!B`, or `'Sheet name'!B` when the name is not one word
   (a quote in it doubled, as Excel's); kept by column id, so renaming or moving the sheet, or the
   column, never makes the formula read another one; rows are matched by row number.
7. **Constants are the project's**, a list of their own (`p.consts`), named as a formula names
   them (a letter, then letters, digits or `_`; never a column's letters A–ZZZ, `x`, `i`, a
   function or `pi`/`e`), each a number with a unit and a note; read by any column formula, kept
   in it by id, so a renamed constant follows; changing one recalculates what reads it; deleting
   one in use is confirmed and leaves those formulas' error in words. Not read by fit functions
   (decision 1).
8. **A filter is a view of its sheet** (plan decision 3): per sheet, a condition per column,
   combined by And with each other and with hidden rows; kept with the project and undone like
   hiding (`p.wsFilter`); the graphs, fits, steps, formulas, analyses and exports read every row.
   An analysis made while its sheet is filtered takes the filter's conditions as its own rows
   (`a.in.where`, ticked in its dialog, said in its report), worked out again on its data at each
   recalculation, and never changed by the filter afterwards.
9. **Filtered rows are not edited through.** With a filter on, pasting, filling, inserting and
   deleting rows ask to clear it first (as sorting does), so a block never lands half on hidden
   rows. Typing into a cell shown is always allowed.
10. **Conditional formatting is a view kept with the project**, per column, an ordered list of
    rules where the first that matches fills the cell; fills from a fixed list made for both
    themes and both styles (the contrast test holds every one under the text at 4.5:1), never a
    colour typed. Not in the check code, the CSV or the report.
11. **Reshaping is analyses** (FOUNDATION_SPEC 1.3): each writes a result sheet that follows its
    data, is undone, copied, reported, cut from its data into an ordinary sheet; never a change
    of the original data. *A sorted copy* is the only way rows are really reordered, and it is a
    copy.
12. **A matrix is a thing of its own** (`p.mats`), not columns: a grid of Z with its X and Y
    (ends, evenly spaced, or vectors), in a matrix book of sheets, shown in a window of its own
    as the worksheet is, drawn by a graph as a map. Values typed, imported or read from a picture
    are recorded, with a check code of their own (the SHA-256 of the grid written as the
    worksheet's original data is, a line a row); values made from something else (a formula,
    arithmetic, a transform) are computed and outside it, as computed columns are.
13. **Excel is read and written without a library**: the zip read by our own code, deflate by
    the browser (`DecompressionStream("deflate-raw")`, `CompressionStream` to write), the XML by
    a small reader of our own in the PARSER block, so `parser-test` runs it under node. A browser
    without the streams is told so in words.
14. **Two worksheet windows, one worked in.** Window › New worksheet window shows a sheet in a
    window of its own (a document in the taskbar and the Explorer); as with graphs, the window in
    front is the one worked in (the grid, the selection, the keys), the others show their sheet's
    cells and scroll; a click brings one forward. A column's letter dragged onto another window
    moves the column to that sheet.

## The data model

- `c.fx` keeps `{src, refs}`; `refs` maps each name as typed to a column id (`B`, `Sheet2!B`) or
  to `"k:" + constant id`. `src` keeps the sheet's name as typed; `fxShow` writes today's.
- `p.consts`: `[{id, name, v, unit, note}]`, in `UNDO_KEYS` and `UNDO_BYID`, merged by id
  (`mergeProj`), cleaned by `constClean` in `migrate` (a name that is not a name, a value that is
  not a finite number, a duplicate name: dropped), in the project file and the report's Method.
- `p.wsFilter`: `{sheetId: {colId: cond}}`, in `UNDO_KEYS`; `cond` is `{vals: [cell keys]}` (the
  values ticked) or `{c1: rule, c2?: rule, join: "and"|"or"}`, a rule `{op, a?, b?, n?, pct?, t?}`
  (`FILT_OPS`). Cleaned by `filtClean` (a column gone, an op unknown, a number that is not one).
- `p.wsCf`: `{colId: [rule]}`, a rule `{kind, …, fill}` (`CF_KINDS`), `fill` a key of `CF_FILLS`;
  in `UNDO_KEYS`; cleaned by `cfClean`.
- An analysis's `in.where`: the filter's conditions as they were when it was made, `{colId: cond}`.
- `p.mats`: `[{id, name, sheets: [{id, name, nx, ny, x: {a, b} | {v: []}, y: {…}, z: [] (row
  major, a row a Y), zname, zunit, xname, xunit, yname, yunit, fx?, rec?}]}]`, in `UNDO_KEYS` and
  `UNDO_BYID`; `z` packed as columns are (`idbPack`, the project file's `$f64`); `m.raw` its record
  (`{fp, hist}`) when its values are recorded. `matOf(id)` is the one reader, `saveMat` the writer.
- `S.wsWins`: the worksheet windows open beyond the first, `{winId: sheetId}`, in the layout as
  every window is.

## The order

3.1 formulas (the grammar the rest reuse: a filter's and a rule's conditions are its comparisons),
3.3 filters (the rows analyses take), 3.4 conditional formatting (the same condition editor), 3.5
reshaping (analyses, which read filters and text), 3.7 Excel (independent; its many sheets are
what reshaping and two windows serve), 3.2 two worksheet windows (the riskiest change to the
frame, done once the sheet's own features are in), 3.6 matrices (the largest; waves 4, 5 and 7
read them). Each slice is committed and pushed when its checks pass; the wave ends as every wave
does (the suite, a lab day, Origin's tutorials, screenshots, the documents).

## References, by slice

- 3.1: NumPy and pandas on the same columns (`np.nansum`, `np.nanmean`, `np.nanstd(ddof=1)`,
  `np.nanmedian`, `np.nanpercentile` linear, `Series.shift`, `cumsum` skipping NaN, comparisons
  and `np.where`) for a hundred random formulas over fixtures with gaps, text and other sheets
  (`fixtures/fx.json`); exact rationals for sums that cancel.
- 3.3: pandas' boolean indexing for every condition (`between` inclusive, `nlargest`/`nsmallest`
  with ties kept as Excel's Top 10, `str.contains` and the rest), the row sets compared
  (`fixtures/filt.json`).
- 3.5: pandas `melt` (stack), `pivot` (unstack), `pivot_table` (sum, mean, count, min, max,
  median, sd with `ddof=1`), `groupby` (split), `drop_duplicates` (first, last) and `groupby().mean()`
  (average), `sort_values(kind="stable", na_position="last")`, `DataFrame.T`, `merge` (inner, left,
  outer), `concat`; every result sheet against them (`fixtures/reshape.json`).
- 3.6: NumPy (`transpose`, `flip`, `rot90`, slicing, arithmetic with NaN) and SciPy
  (`RegularGridInterpolator`, linear, for resampling) (`fixtures/mat.json`).
- 3.7: workbooks made by openpyxl (numbers, text, booleans, errors, shared and inline strings,
  dates in both systems, merged cells, several sheets, empty rows and columns), and cached formula
  values written by hand into the XML; Kurve's written files read back by openpyxl and pandas,
  every cell compared (`tools/ref/xlsx/`).

## Budgets

A formula with an aggregate and an offset over 10⁶ rows worked out in under 0.5 s; a filter of
10⁶ rows applied, and the sheet scrolled with it on, within the worksheet's budgets of today; a
sheet of 2 000 columns with a colour scale on each drawn as fast as without (min and max worked
out once per change); a stack of 20 columns of 10⁵ rows, a pivot of 10⁶ rows by two text columns,
and a join of two sheets of 10⁵ rows each in under 2 s (in the worker past `ANA_BIG`); an `.xlsx`
of 10⁵ rows and 10 columns read in under 3 s and written in under 2 s; a matrix of 1000 × 1000
drawn as a heat map in under 0.5 s and transposed, flipped or turned in under 0.2 s. `perf.mjs`
gains each.

## 3.1 Formulas, further

Done 14.11, as below, with these changes of plan: a constant in use is deleted by a second press in the dialog (a
confirmation over a dialog would open under it), the hint naming the columns that read it; two tabs' constants are
merged constant by constant (`mergeProj`); the old-formula check is in `sheet-drive` (thirteen formulas through both
grammars) and `fit-test` checks that a fit function keeps its language; `fxCalc` and `fxCalcAt` (by names) serve the
bench and the fuzzer. The fuzzer found a constant counted as a column when the rows were decided (fixed), and, once
its packages were installed, a wave-2 slip: the exact binomial test's power for small sizes (fixed, CLAUDE.md's rules).

**What.** The F(x)= row and Set column values… take, beside today's letters, `x`, `i` and
arithmetic:
- **Rows**: `B[k]` (any expression for k), so `B[i-1]`, `B[i+1]`, `B[1]`, `B[count(B)]`.
- **Aggregates** of a whole column or an expression over every row: `sum`, `mean`, `sd`, `var`,
  `se`, `median`, `count`, `min` and `max` with one value (with two or more they stay the row's
  smallest and largest, as today), `percentile(B, p)` (p in 0 to 100, a number or constant), and
  the running `cumsum(B)` (missing values add nothing; a row missing in B is missing).
- **Conditions**: `<`, `<=`, `>`, `>=`, `==`, `!=` (and `<>`), giving 1 or 0; `and(a, b, …)`,
  `or(a, b, …)`, `not(a)`; `if(cond, a, b)`; `missing(v)`. Comparisons bind looser than
  arithmetic (`B + 1 > C` is `(B + 1) > C`).
- **Text**: `"control"` in quotes (straight or curly), only beside `==` or `!=` with a column.
- **Other sheets**: `Sheet2!B`, `'Raw data'!B`, at any row (`Sheet2!B[i-1]`) and in aggregates.
- **Constants**: names from Data › Constants… (`k_B`, `N_A`, `h`); the window (a dialog: a row
  each, name, value, unit, note; Add, Delete, one undo step a change, a log line) checks a name as
  it is typed and refuses one that is a column's letters, a function, `x`, `i`, `pi`, `e`, or
  another constant's.
- The suggestions list offers the new functions with what they do, the constants by name with
  their values, and each other sheet as `Sheet2!`; the live check says a mistake in the new
  constructs in words (`“<” compares numbers; text can only be compared with == or !=`, `There is
  no sheet called “Sheet9”`, `B[i-1] reads row i − 1 of B: write the row in brackets after a
  column's letter`).

**Pure.** In NUMERICS: `exprTokens(src, sheet)` (strings, `<`, `<=`, `>`, `>=`, `==`, `!=`, `<>`,
`!` between a sheet and a column, `'…'` sheet names, `[`/`]` kept as such in sheet mode),
`compileExpr(src, {sheet:true})`: nodes `cmp`, `str`, `if`, `and`, `or`, `not`, `miss`, `idx`
(a column at a row), `agg` (worked out once over every row, cached per evaluation), `cum`, `row`
(`i`); in sheet mode every function returns missing for a missing argument (`pow(B, 0)` too), and
the closures take `(x, p, L, R)` where `R` is the evaluation's context (`r`, the row; `col(k)`,
`txt(k)` a parameter's values and text; `n`; the cache). `fxRun(cm, ins, n, xs)` evaluates a
compiled formula over n rows (pure, so `run.mjs` and the fuzzer call it with plain arrays).

**Page.** `fxParse` resolves the names (a letter on its own sheet, `Sheet!L` on another, a
constant), `fxEval` builds the inputs (each column's numbers and text, the X column) and calls
`fxRun`; `recalcFx` orders by every column read, other sheets' included; `fxShow` writes each name
as it is today (a sheet quoted when its name needs it, a constant by its name now). `constDlg`
(Data › Constants…), `constClean`, `setConsts(list, log)`; `fxsSheetItems` and `fxsBase` grow;
`FX_DOC` gains the new functions (shown in the sheet's suggestions only).

**Checked.** `fx.json` against NumPy and pandas, the fuzzer (`fxRun@…` generators: random
expressions over random columns with gaps and text), `fit-test`'s formula section (every formula
of before giving the same values; fit functions refusing the sheet's grammar as before), a drive
section in the new `tools/sheet-drive.mjs` (each construct typed into the F(x)= row and the bar,
the suggestions, the live check's words, another sheet renamed and the formula following, a
constant added, used, changed, renamed and deleted with its confirmation, undo of each, a reload,
a project file, two tabs), `odd-test` junk in `p.consts` and in formulas from storage, a budget in
`perf.mjs`.

**Leaves out.** Ranges `B[i-2:i]` (an offset in a sum does it: `B[i-2] + B[i-1] + B[i]`); `j`;
cell formulas (the plan's decision 2); constants in fit functions and steps (decision 1); dates in
formulas.

## 3.2 Two worksheet windows

**What.** Window › New worksheet window, a sheet tab's right-click *Open in a window of its own*,
and the Explorer's sheet row's: a worksheet window (`ws:<sheet id>`) showing that sheet, its tabs
hidden (its title the sheet's name), in the taskbar and the Explorer as a document. The window in
front is worked in: the grid, its bar, selection, editing, keys and menus are its; a window behind
shows its sheet's cells (the rows in view, the label rows, the computed and text marks, the
filter's and formats' views) and scrolls, and a press on it brings it forward with the cell
pressed selected. A column letter dragged from the window worked in onto another window (or its
taskbar button) moves the column, with its error bars, to that window's sheet (`moveColsToSheet`,
one undo step, the toast with Undo). Closing a sheet's window leaves the sheet; deleting the sheet
closes its window. The first worksheet window keeps its tabs.

**Checked.** A drive section: two windows open, each showing its sheet; typing in one and then
the other; the keys going to the window in front; a column dragged across, undone; a sheet
renamed and deleted with its window open; the layout across a reload; both windows at 1024 and
390 px; `lab-day` with two windows open.

**Leaves out.** Two windows on one sheet; editing in a window behind; a window per worksheet
of another project.

## 3.3 Filters

Done 14.11, as below, with these changes of plan: the filter is a dialog opened from the column menu, Data › Filter and the
funnel (not a panel under the header); a filter older than the data is *applied again* when asked (Origin's Reapply), and
undo and redo work it out afresh; the hidden rows are a byte mask with the view's order kept until either changes (the
budget); the reference is `filt.json` (pandas, every row) without a fuzzer generator, and junk from storage is checked in
`sheet-drive` rather than `odd-test`. On its new path the worksheet fuzzer found a fill overwriting text cells and a formula
keeping a column's names (fixed).

**What.** A column's menu and Data › Filter: *Filter by this column…* opens the filter's panel
under the column's header (as Excel's): the column's distinct values with their counts, each
ticked (text, categorical, or numbers with at most 200 distinct values), a search over them, and
*Conditions* (numbers: equals, does not equal, less than, at most, greater than, at least,
between, not between, top n, bottom n (a count or a percent, ties kept), above the mean, below the
mean, empty, not empty; text: equals, does not equal, contains, does not contain, begins with,
ends with, empty, not empty), two joined by *and* or *or*. A filtered column's letter carries the
funnel (`i-filter`), its tooltip the condition in words; the foot says *Rows 112 of 400 shown*
with *Clear the filter*; Data › Filter › Clear every filter of this sheet. A filtered-out row
leaves the view as a hidden row does (the row numbers keep the data's rows); a filter and hidden
rows combine. A value typed that makes its row fail the filter stays in view until the next
change of the filter (as Excel's), said once. Paste, fill and rows inserted or deleted ask to
clear the filter first.

An analysis's dialog, opened on a filtered sheet, has *Only the rows the filter shows* ticked,
naming the conditions; made so, the analysis keeps them (`a.in.where`), its report says *Rows
where B > 3 and C is control (112 of 400)*, and *Change settings…* can untick them.

**Pure.** `FILT_OPS` (each `[key, name, needs, test]`), `filtRows(cols, conds)` (the rows that
pass, by the column's numbers or text; top n and the mean worked out once on the column's numbers),
`filtText(cond, colName)` (the condition in words).

**Checked.** `filt.json` against pandas; a drive section (each condition through its panel, the
list of values with a search, two conditions and/or, two columns, the funnel and foot, a typed
value that fails, Clear, paste refused, undo, an analysis made on a filtered sheet and the filter
then changed, a reload, a project file); `sheet-fuzz` with filters on; `odd-test` junk in
`p.wsFilter`; the budget.

**Leaves out.** Filters by colour; dates' own conditions (a date column filters as numbers, shown
as dates); a filter that plots (a curve's rows by a condition: wave 7).

## 3.4 Conditional formatting

Done 14.11, as below, with these changes of plan: a new rule goes first (a spreadsheet's order, so the last one made is seen);
the scale is seven steps of tokens mixed from the panel (`--cf-s*`, `--cf-d*`) and the eight fills likewise, which the contrast
test measures; highlights take a filter's conditions (top and bottom, above and below the mean included) plus duplicates and
values seen once; `cfEval`'s cases are checked in `sheet-drive` through the page. A single active cell keeps its fill under its
edge; a selected range shows the selection.

**What.** A column's menu and Data › Conditional formatting: *Colour scale* (two or three
colours from the list, over the column's smallest and largest numbers or values typed, the middle
at the median or a value), *Highlight cells* (greater than, less than, between, equal to, text
contains, text equal to, empty, duplicates, unique values, top n, bottom n, above or below the
mean), each with a fill from the list, and *Manage the rules…* (the column's rules in order: edit,
move up and down, delete; one undo step each); *Clear the rules* of the column or the sheet. The
first rule that matches a cell fills it; a colour scale fills every number; the selection draws
over a fill.

**Pure.** `CF_KINDS`, `cfEval(col, rules)` (a fill key per row; min, max, median and the
duplicates worked out once per column and change, memoised by the data array), `CF_FILLS` (eight
fills, each a light and a dark value per style, `--cf-<k>` tokens).

**Checked.** Unit cases of `cfEval` (every kind, ties, text, empty, a column of one value); a drive
section (each kind through its dialog, the order, a rule edited, deleted and undone, the fills read
from the cells in both themes, a reload); `contrast-test` holding each fill under the text and the
selection over it; screenshots at three widths in both themes and styles.

**Leaves out.** Icons and data bars; fonts by rule; rules across several columns; formats in the
exported xlsx.

## 3.5 Reshaping

**What.** Data › Reshape, each an analysis (FOUNDATION_SPEC 1.3) with its dialog's input panel,
writing a result sheet:
- **Stack columns**: the columns ticked into one value column and a column of their names (the long
  name, else the letter); the other columns chosen repeated beside (*identifier columns*).
- **Unstack**: a value column into a column per level of a group column (in its order), rows by
  their order within the group, or matched by an identifier column.
- **Split by groups**: a sheet of results per level of a group column (each the rows of that
  level, every column ticked), or every n rows.
- **Pivot table**: rows by the levels of one column, columns by another's, each cell an aggregate
  of a value column (count, sum, mean, SD, min, max, median), with totals.
- **Reduce rows**: keep every nth row from a start, or the mean (sum, median, min, max) of every n
  rows, or by bins of X (a width and a start), each bin's X its centre.
- **Duplicates**: rows whose key columns repeat removed (keep the first or last) or averaged, or
  only the duplicates kept; numbers equal within a tolerance typed (0: exactly).
- **A sorted copy**: the rows sorted by one to three columns, each up or down, numbers before text
  before empty, stable.
- **Transpose**: rows to columns, the first column's text as the new columns' names when chosen.
- **Join**: two sheets by a key column each, inner, left or full, the columns of both.
- **Append**: sheets one under another, columns matched by name or by position.
Each follows its data, is reported (rows in, rows out, levels, what was left out), copied and cut
from its data like any analysis; Undo takes each back in one step.

**Pure.** In ANA: `reshapeStack`, `reshapeUnstack`, `reshapeSplit`, `pivotTable`, `reduceRows`,
`dedupRows`, `sortRows`, `transposeRows`, `joinRows`, `appendRows`, on columns of numbers and
text; `ANA_KINDS` `stack`, `unstack`, `split` (several result sheets: `out.sheets`), `pivot`,
`reduce`, `dedup`, `sortcopy`, `transp`, `join`, `append`.

**Checked.** `reshape.json` against pandas, `stats-test`'s properties (stack then unstack gives the
columns back; a sorted copy is a permutation and sorted; a pivot's totals are the column's
aggregate; a join's inner rows are in both), the fuzzer, an `ana-drive` section per kind (through
its dialog, followed after a value, cut, undone, a reload), the budgets.

**Leaves out.** Pivot charts; joins on several keys; unpivot of label rows; Origin's
*Combine duplicated rows* by text concatenation.

## 3.6 Matrices

**What.** A matrix book (`p.mats`) of matrix sheets: Data › New matrix… (rows, columns, X and Y
from first to last, a value or a formula of `x`, `y`, `i`, `j`), *From columns* (a block of the
worksheet as Z, its first row and column as X and Y when they are), *From a picture* (PNG or JPEG:
its grey values, or one channel, 0 to 255, X and Y the pixels), and later from gridding (5.7), a
2D result (5.5) and fits (4.4). A matrix window (a document like the worksheet: the grid of Z with
the X values along the top and the Y down the side, read only where computed, typed into where
recorded, the selection's numbers in the foot, a tab per matrix sheet); Matrix menu items:
*Set values…* (a formula of `x`, `y`, `i`, `j`, other matrices by name), *Dimensions and
labels…*, *Transpose*, *Flip* (left–right or up–down, the coordinates with them or not), *Turn*
(90° either way, 180°), *Crop…* (by X and Y), *Resample…* (a number of rows and columns, bilinear),
*Arithmetic…* (two matrices of one size, or one and a number: + − × ÷), *To columns* (a sheet of
X, Y, Z, or Z as a block). A graph draws a matrix as a heat map, filled contours or contour lines
(the map layout of today, reading the matrix through `matOf`); Plot › Plot a matrix. Each change
is one undo step, a log line, and a record entry where values are recorded.

**Pure.** `MAT` block: `matNew`, `matT`, `matFlip`, `matTurn`, `matCrop`, `matResample`,
`matArith`, `matXY`, `matFromCols`, `matToCols`, `matGrey(rgba, w, h, channel)`.

**Checked.** `mat.json` against NumPy and SciPy; properties (a transpose twice, four turns, two
flips give it back; a crop's values are the slice; resampling to the same size changes nothing);
the check code of a recorded matrix against SHA-256 of its lines; a drive section (each command,
a picture read, a heat map drawn, values typed, undo, a reload, a project file, two tabs); `odd-test`
junk in `p.mats` (a grid of the wrong size, NaN, strings, a matrix of 10⁷ cells); the budgets.

**Leaves out.** Several matrix objects in one sheet (Origin's); complex values; 3D (wave 7.8);
gridding (5.7); images kept as colour.

## 3.7 Excel

**What.** An `.xlsx` (or `.xlsm`) imported, chosen or dropped, goes through the import dialog:
every sheet of the workbook listed with its size, the first ticked (or all), each becoming a
Kurve sheet named after its Excel sheet; the rows before the data offered as header rows (Long
Name, Units, Comments, as the dialog does for text files, detected as a text row over numbers);
numbers, text, booleans (1 and 0), error cells (`#DIV/0!`, kept as text), dates and times (by the
cell's number format: Excel's built-in date formats and any format with d, m, y, h or s outside
quotes and brackets) read as dates (seconds since 1970 in UTC, `tfmt` set) from either date system
(`date1904`); a formula's cached value (its formula said in the column's comment when the whole
column is one formula); merged cells' value in their first cell. Publish › Data as Excel (.xlsx):
every sheet of the project as a sheet, its label rows as header rows (Long Name, then Units when
any), numbers as numbers, text as shared strings, dates as dates. A table pasted from a web page
(`text/html`) is read as its rows and cells (row and column spans filled), as a paste of
tab-separated text is.

**Pure.** In PARSER: `zipEntries(u8)` (the central directory: names, methods, sizes, offsets;
refusals in words for a zip64, an encrypted entry, a method other than stored or deflate), `xmlRead
(text)` (elements, attributes, text, entities; no DTDs), `xlsxBook(files)` (sheets, shared strings,
styles' number formats, `date1904`), `xlsxSheet(xml, ctx)` (`{rows, merges, dims}`), `xlsxDateFmt`,
`xlsxSerialToUnix`, `xlsxWrite(sheets)` (the parts as text), `zipWrite(files, deflate)` (CRC-32,
stored or deflated), `htmlTable(html)`.

**Checked.** `parser-test` with the workbooks of `tools/ref/xlsx/` (every cell against openpyxl's
reading), Kurve's written workbooks read back by openpyxl and pandas, a workbook of each refusal,
a drive section (an import through the dialog with two sheets and header rows, a drop, Publish
writing a file that is read back, a pasted HTML table with spans), the budgets.

**Leaves out.** `.xls` (the binary format before 2007), `.ods`; styles, charts and pictures;
formulas written into the exported file; password-protected workbooks.

## Words

New words in the glossary (`ux/UX_SPEC.md` §3.6) with the slice that brings them: *constant* (3.1),
*filter* and *filtered* (3.3), *conditional formatting* and *rule* (3.4), *stack*, *unstack*,
*pivot table*, *sorted copy*, *transpose*, *join*, *append* (3.5), *matrix*, *matrix book*, *matrix
sheet* (3.6). `terms.py` reads 0 at every slice.
