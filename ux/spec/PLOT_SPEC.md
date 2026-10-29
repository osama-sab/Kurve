# Plot setup: closing the gap with Origin's

The user, on 2026-10-23: "Why is the plot setup so primitive, why can I not choose how I want
to plot the graph, for example the range, which axis is the error axis and so on, that is
basic Origin plot setup." This is the plan. It compares Kurve's Plot setup (`openPlotDlg`)
and the graph's data model with Origin's Plot Setup dialog and its Layer Contents dialog, and
sets out the decisions and the slices that close the gap.

Origin's help pages it was compared with: the Plot Setup dialog's
[Available Data (top) panel](https://docs.originlab.com/origin-help/ps-dialog-top/),
[Plot Designations (middle) panel](https://docs.originlab.com/origin-help/ps-dialog-middle/),
[Plot List (bottom) panel](https://docs.originlab.com/origin-help/ps-dialog-bottom/) and
[Quick Start](https://docs.originlab.com/origin-help/plot-setup/);
[Editing the plot's display range](https://docs.originlab.com/origin-help/plotsetup-editdisplayrange/);
[the Layer Contents dialog](https://docs.originlab.com/origin-help/layern-dialog/);
[setting column designations](https://docs.originlab.com/origin-help/wkscol-setdesignation/);
[error bars in Plot Setup](https://www.originlab.com/doc/Quick-Help/Show-XErr-in-PS) and
[2D and 3D error bars](https://docs.originlab.com/quick-help/errbar-display-in-plot/);
[the plotxy X-Function](https://docs.originlab.com/x-function/ref/plotxy/). OriginLab's site
could not be opened from the session that wrote this (the network policy refused it), so the
comparison rests on the search engine's reading of those pages and on how the dialog is known
to work; the details to check in Origin itself are marked *(to confirm)*.

## How Origin does it

Origin's Plot Setup (Plot › Plot Setup…, or the layer icon of a graph) has three panels, top to
bottom, and a preview:

- **Available Data.** A list chooses where the data comes from (the worksheets of the active
  folder, of the whole project, of one book, matrices…), with options to include shortcuts and
  hidden sheets; the books and sheets found are listed with their long name, sheet, folder,
  number of rows and columns and file. Several can be selected at once, and what follows uses
  every one.
- **Plot designations.** On the left, the **Plot Type** list (line, scatter, line and symbols,
  columns and bars, area, 3D, contour, statistical and specialised kinds, each with its
  picture); on the right, the columns of the sheets chosen, each with check boxes for what it
  is in this plot: **X**, **Y**, **Z**, **yEr** (and **yEr+**, **yEr−** from the right-click
  menu), **xEr**, **L** (labels), and, for kinds that need them, size or colour. The boxes shown
  follow the plot type. Two modes: *custom designation* (the boxes, which override the
  worksheet) and *default* (the worksheet's own designations). Only one column is X at a time;
  **autoX** uses the row numbers (or a sampling interval) as X. Any column can be an error
  column, whatever its designation and wherever it is. A **Range** column shows each column's
  rows, and a sub-range can be typed *(to confirm)*.
- **Plot List.** The graph's layers as a tree (Layer 1, Layer 2…), each with its data plots and
  their groups. **Add** puts the designated columns into the layer selected; **Replace** gives
  the selected plot the designation now set (a plot type changed on a grouped plot changes the
  whole group; a designation does not); plots are removed, reordered (drawing order), grouped
  and ungrouped (a group shares one plot type and steps its colour, symbol and line together).
  Each plot's **Range** opens the Range dialog: *Auto*, or **From** and **To**, **by index** or
  **by X** (X must be monotonic), with **Rescale** to fit the axes to the new range or not; a
  range can be applied to the whole group, the layer or the page from the right-click menu.
  A layer can be added (another Y axis, another panel) and plots moved between layers.
- **OK, Apply, Cancel**, with a preview of the graph.

The **Layer Contents** dialog is the same idea for a graph that exists: available data on the
left, the layer's plots on the right, Add, Remove, Replace, Group, Ungroup, Up, Down, *Rescale
on Apply*, a Range column, a layer switch without closing, and a button to Plot Setup.

## Where Kurve stands

| Origin's part | Kurve now | Gap |
|---|---|---|
| Where the data comes from | the sheet shown only (`sheetCols()`) | every sheet of the project, a filter, several sheets at once, each column's long name, units, rows and first values |
| X | one X column for every Y, or the row number; a Y's own X (`xcol`) is set elsewhere (Plot against) | each Y with its own X in the dialog, as X,Y pairs; the row number as X for some and not others |
| Y | ticked from the sheet's Y and "other data" columns | as Origin's; also from other sheets |
| Error bars | only what the worksheet says (an error column's `of` and kind); shown as "± C" beside a Y, not changeable | choose, for each Y, its Y error (±, +, −) and its X error from any column, in the dialog |
| Labels, colour, size | colour and size by a column live in the Format dialog (`zcol`, `scol`); labels from a column do not exist | labels from a column (its values beside each point); colour and size chosen in the dialog, for the kinds that use them |
| Plot type | 14 kinds as pictures (`PLOT_DLG_KINDS`), all on one graph | the boxes shown follow the kind; kinds that need more columns (bubbles, colour-mapped symbols, labelled points) |
| Range | none: only the zoom, the fit's range, or a crop step that changes the data | each curve's range on each graph, by row or by X, automatic or typed, the axes rescaled or not, applied to one curve or every curve of the graph |
| Axes | *Two Y axes* puts every curve but the active one on the right axis (`layout:"dy"`) | each curve on the left or right axis, chosen per curve; a new panel from the dialog |
| The plot list | *Into* a new graph or an existing one; nothing listed | the curves of the graph being made or edited, with their X, errors, range, axis, group and order; Add, Replace, Remove, Up, Down |
| Groups | colours by table order (`SCHEMES`), each curve's style its own | groups that share a plot type and step colour, symbol and line style together |
| Preview | a sketch drawn from the recorded values (`plotDlgSketch`): no processing, no errors, no ranges, no axes | the graph itself, as it will be drawn (`buildPlot` with the dialog's working copy) |
| Editing a graph's curves | *Curves on it* (ticks), drag and drop, Combine graphs | Plot setup opened on a graph, with its curves in the list (Origin's Layer Contents) |
| Default and custom | the worksheet's roles only | the dialog starts from the worksheet's designations and changes them there, saying so |

What Kurve has that Origin's dialog does not: plots against the series variable (maps), box and
violin charts and histograms from the same dialog, processing per column carried into every
curve, figures of panels with their plot areas lined up.

## Decisions (the defaults; the user may change them)

1. **One truth for what a column is.** A Y's X (`xcol`) and its error columns (an error
   column's `of`, `ax`, `side`) stay the column's, as now, because the processing and the fits
   use them (a background step reads X; a weighted fit reads the Y error). Plot setup changes
   them where the worksheet keeps them, and says so ("C's X is now A, on every graph"). What
   belongs to one graph only (a curve's range, its axis, its group, its labels, its order, its
   style) is kept on the graph. Origin's per-plot X, which Kurve's processing cannot follow
   without running a column's steps twice, is not copied.
2. **A graph keeps what each curve uses**, beside its list of curves: `g.plot.use = {colId:
   {rng, ax, grp, lab}}`, read through one door (`curveUse(id)`, as `GP()` is for settings),
   undone with the graph, left out of saved styles (`fmtOf`, `FMT_KEYS`: it is data, not
   format), cleaned by `normalize` (a range that is not two finite numbers, an axis that is not
   left or right, a label column that has gone). `g.cols` stays the order of the curves.
3. **A range is the graph's, not the data's.** A curve's range (`rng = {by: "row"|"x", a, b}`)
   decides which of its points this graph draws; the data, the processing, the fit and the other
   graphs are untouched (a crop step is still the way to change the data, and the Fit window's
   range the way to fit part of it). The fit's range gains *Use the graph's range*. By X needs
   the X to rise or fall steadily; otherwise only rows are offered, as in Origin.
4. **Each curve on its axis.** `ax:"r"` puts a curve on the right Y axis on any graph; the
   *Two Y axes* layout becomes "every curve but the first on the right", written as `ax` on each,
   so the two agree and an old project draws as before.
5. **A modal dialog with the real graph in it.** Plot setup stays a dialog (it makes a graph or
   changes one in one undo entry, and Cancel leaves everything as it was), and its preview is
   the graph itself drawn from the dialog's working copy, processing, errors and ranges
   included, decimated as the screen is (see the speed work). Three parts as Origin's, in
   Kurve's words: **Columns** (where from: the sheets, a filter), **What each column is** (the
   kind of plot, and a row per column with X, Y, Y error, X error, Labels, Colour, Size, as the
   kind needs) and **Curves on the graph** (the list, with Range, Axis, Group, order, and Add,
   Replace, Remove). Below 860 px the parts are tabs.
6. **Words.** Kurve's own (`tools/ux/terms.py` at 0): columns and curves, the graph, its left
   and right axes, a range; never "data plot", "layer", "designation", "autoX" or "plot list".

## The work, in slices

Each slice ships on its own: unit tests where there are numbers, a drive clicking every new
control, odd-test for what can come back broken from storage, its help article, DESIGN.md's
reason, CLAUDE.md, the menu spec when a menu changes.

1. **What a graph's curves use** (done 2026-10-29; the *Two Y axes* layout kept as it was rather
   than written as `ax` on each, so an old project draws as before with nothing rewritten; the
   active curve stays on the left; the readers read the left axis's curves only) (the model and the drawing). `g.plot.use` and `curveUse`;
   `normalize` and the upgrade (`dy` written as `ax`); `buildPlot` draws a curve's range (by
   row, by X; the autoscale over what is drawn) and each curve on its axis (the right axis's
   title and numbers from its curves, as `dy` does now); labels from a column beside each
   point, in the labels' text style. The curve's right-click gains *Range…* (a small dialog:
   all, rows from and to, X from and to, *Fit the axes to it*, *Every curve of this graph*)
   and *Right axis*. Exports, pictures, figures and the report draw the same.
2. **Plot setup, rebuilt** (done 2026-10-29; the kind of plot kept as a gallery above the
   parts, the columns' boxes one *Use* list per column, ticks to mark several at once and to
   say what Add and Replace take; a column's role changes only where nothing is lost, so a Y is
   never made an X or error bars there; the row number as X is a column's own, `xcol:"row"`).
   The three parts and the preview. Columns from every sheet (a list
   of sheets with their files, a filter, several ticked); a row per column with its letter,
   long name, units, rows and a sparkline, and the boxes the kind needs; one X for the Ys
   below it or each Y its own (X,Y pairs, as the worksheet's nearest X reads them), the row
   number as X; any column as a Y's error (±, +, −) or X error; labels, colour and size from a
   column. Curves on the graph: Add (what is ticked, as new curves), Replace (the selected
   curve takes what is ticked), Remove, Up, Down, Range, Axis. OK makes the graph (or changes
   it) in one undo entry, writing the column changes (an X, an error column's owner and kind)
   with it and saying which; the worksheet's roles are the starting point, as Origin's default
   designation.
3. **Plot setup on a graph** (done 2026-10-29; no kind chosen when it opens, so each curve keeps
   how it is drawn; the Plot menu's item is *What this graph plots…*) (Origin's Layer Contents). The graph's ⋯ menu, the Graph menu
   and the plot's right-click have *What it plots…*: the dialog opened with that graph's curves
   in the list, to add, replace, remove, reorder, re-range or move between axes; a figure's
   panel the same. *Curves on it* stays as the quick list.
4. **Groups** (done 2026-10-29; the legend lists every curve of a group, as Origin's does by
   default, so no group entry; a group is set per curve, from its right-click or the list's Group
   column, rather than by selecting several rows). Curves selected in the list grouped: a group shares its plot type; its colour,
   symbol and line style step together (colour only, symbol only, line style only, or all), from
   the graph's scheme, each curve's own style still winning; the legend can show a group as one
   entry *(to confirm what Origin's legend does)*. Group and ungroup in the list and the curve's
   right-click.
5. **Kinds that need more columns** (done 2026-10-29; error boxes for X and Y errors, the
   crosses being the bars Kurve already draws; the cards a row of their own, *With another
   column*; Plot waits with a note naming what to mark). Bubbles (size from a column), colour-mapped symbols
   (colour from a column, with its colour bar), labelled points (labels from a column), a plot
   of X and Y errors as boxes or crosses; each a picture in the kinds, with the boxes it needs.
   What exists (`zcol`, `scol`) moves under these, the Format dialog keeping the look.
6. **Remembered setups** (done 2026-10-29; per project and sheet in this browser; what it
   remembers never changes a column, so an X or error bars come back only where the column still
   is one; Plot like the last time opens the dialog when the kind's column is missing). The
   dialog remembers the last kind and how the columns were used per
   sheet (as `S.plotDlgKind` does for the kind), and *Plot like the last time* plots the
   selection that way from the worksheet's Plot menu.

## Rules to keep

- What a column is (its X, its error columns) has one place, the column; what a curve on one
  graph uses has one door, `curveUse`; nothing reads `g.plot.use` directly.
- Old projects open and draw as before; a range or an axis that comes back broken from storage
  is dropped by `normalize`, never drawn as nonsense.
- One undo entry per OK; Cancel changes nothing, the preview included.
- Every curve the dialog makes is an ordinary curve: the Format dialog, the readers, the fit,
  the Peaks and Integrate windows, exports and the report treat it as any other.
- The preview costs what the graph costs: large columns are decimated for the screen, never
  for an export.
