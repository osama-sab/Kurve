# Phase 1: cold-user walkthrough

Kurve as of commit ff7f3a8, driven in headless Chromium through `tools/ux/drive.py` and
`tools/ux/repl.py`. Every action was a real mouse move and click, a key press or a wheel turn,
at the place a person would aim. Controls were found by their visible label or role, never
through the app's internals. The run was done from a copy outside the repository
(`../kurve-coldtest/`).

**Read this first: how cold the "cold user" was.** This walkthrough was run in the same
session that built most of Kurve, not in a fresh one; that was the second option offered at
STOP 0, and "continue" took it. I did not open CLAUDE.md, the source or Help during the runs,
except where a persona opened Help (once, in T6). But I know where things are, so these
numbers are a **lower bound** on what a real stranger meets. Phase 5's fresh stranger is the
real test. Where my knowledge probably shortened a path, the narrative says so.

Evidence: screenshots in [`evidence/`](evidence/) (named `<run>-<step>.png`; quantised to
256 colours to keep the repository small), the full action logs in
[`evidence/logs/`](evidence/logs/) (one JSON per run: every click with its target and position,
every key, quote, wrong turn, guess and finding, with timestamps).

## 1. Summary

### All tasks at 1366×768, light

| Task | Persona | Done? | Clicks | Keys | Time, rig (s) | Time, KLM (s) | Wrong turns | Guesses | Help |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| T1 type 6 pairs, scatter, titles, PNG | A | yes | 7 | 60 | 73 | 35 | 0 | 0 | 0 |
| T2 straight-line fit, equation on graph | A | partly | 15 | 45 | 258 | 52 | 4 | 3 | 0 |
| T3 error bars from SD, weighted refit | A | yes | 2 | 2 | 30 | 6 | 0 | 1 | 0 |
| T4 growth curves with a correct legend | A | yes | 11 | 45 | 65 | 42 | 0 | 0 | 0 |
| T5 new column = log10, plot it | A | yes | 6 | 44 | 81 | 28 | 1 | 0 | 0 |
| T6 statistics and histogram per group | A | partly | 30 | 1 | 228 | 80 | 3 | 0 | 1 |
| T7 single exp., then own double exp. | B | partly | 22 | 60 | 180 | 75 | 2 † | 0 | 0 |
| T8 Raman: spikes, baseline, peaks, table | B | yes | 19 | 2 | 153 | 51 | 0 | 0 | 0 |
| T9 two-panel figure, SVG and PDF | B | **no** | 19 | 5 | 148 | 52 | 1 † | 1 † | 0 |
| T10 restyle, tick size, reverse X | B | partly | 10 | 4 | 69 | 29 | 0 | 0 | 0 |
| T11 fix a step three back | any | yes | 7 | 0 | 78 | 21 | 0 | 0 | 0 |
| T12 explain the project, trust the table | C | yes | 10 | 1 | 102 | 27 | 0 | 0 | 0 |
| T13 misuse: 2 points, broken file, text | A | yes | 12 | 52 | 103 | 46 | 1 † | 0 | 0 |

- **Done?** "Partly" means the "done when" condition was only half met. T2: the equation
  was typed by hand as free text. T6: the file could not be imported at all and had to be
  reshaped elsewhere. T7: the first fit's report could not be brought back. T10: one panel of
  a figure was restyled and reversed, and the other was not.
- **Time, rig** is wall time in the rig. It includes my thinking between batches of actions
  (often longer than a person's) and excludes the pauses inside a batch (shorter than a
  person's). **Time, KLM** is the keystroke-level estimate from the counts:

  $$t_{KLM} = 2.65\,n_{click} + 0.28\,n_{key} + 1.1\,n_{drag}$$

  It has no reading or thinking time in it, so it is a floor.
- **†** marks counts corrected on review: the run logged these detours as findings, not as
  wrong turns or guesses.
  - T7: looked in Results, then in History, for the first fit's report.
  - T9: tried the figure dialog with one spectrum.
  - T9 guess: switched Share X on without knowing whether it was already on.
  - T13: typed while no cell had the focus.

### T1, T2 and T8 again at other sizes and in dark mode (paths already known)

| Task | 1280×720 | 1920×1080 | 1366×768 dark |
|---|---|---|---|
| T1 | yes · 9 clicks · KLM 41 s | yes · 7 clicks · KLM 36 s | yes · 8 clicks · KLM 49 s · 1 wrong turn |
| T2 | partly · 17 clicks · KLM 58 s · 1 wrong turn | partly · 7 clicks · KLM 20 s | partly · 7 clicks · KLM 20 s |
| T8 | yes · 21 clicks · KLM 56 s · 1 wrong turn | yes · 18 clicks · KLM 48 s | yes · 19 clicks · KLM 51 s |

The repeats followed paths already found, so they measure layout, not discovery. At 1920 and
in dark mode, T2 stopped after the fit, since the equation result was already known, so it
has fewer clicks. The 1280 T2 was interrupted (see section 5) and redone from the import.

## 2. What happened, task by task

### T1 (A): type six pairs, scatter plot, titles with units, PNG. Done.

- The first screen speaks to a spectroscopist: *"'Bring in a spectrum or a curve'? I don't
  have a spectrum, I just want to type six numbers. The big middle window wants a file."*
  ([first screen](evidence/1366-01-first-screen.png))
- The worksheet is the smallest window on the desk and shows **one data row** under five
  label rows. *"There's a little table bottom-right called Worksheet. It shows one row. Is
  that where I type?"*
- Typing works as in Excel and the points plot at once. But the window then shows only the
  row being typed: *"the table scrolled and I can only see the row I'm typing in, not what I
  typed above"* ([typed](evidence/1366-03-six-pairs-typed.png)).
- History fills with "Recorded data 2 columns · e563fbf5cf90", "column B · Raw · 1 points"
  and "What the fit, the peak finder and the exports use". The worksheet footer shows a
  sha256 link.
- Double-clicking an axis title opens a box to type in, with a LaTeX hint the persona
  ignores ([title box](evidence/1366-04-dblclick-x-title.png)).
- To save a PNG, the persona right-clicks the graph (Excel's "Save as Picture"). The menu is
  taller than the screen, and Export is only reached by scrolling it
  ([menu](evidence/1366-06-graph-rightclick.png),
  [scrolled](evidence/1366-07-graph-rightclick-scrolled.png)). On a distance-time chart it
  also offers "Find and mark peaks" and "Integrate bands".

### T2 (A): fit a line, read slope ± error and R², equation on the graph. Partly done.

- The File menu has no Open or Save; the persona notices "Saved in this browser" at the
  bottom. ([File menu](evidence/1366-10-file-menu.png))
- Import guesses everything right, including the SD column as Y error.
  ([dialog](evidence/1366-11-import-dialog.png))
- Afterwards the graph shows the new data under the **old typed titles** ("Time (s)",
  "Distance (m)"). The toast says the columns are "not plotted yet" while the graph shows
  them. ([after import](evidence/1366-12-after-import.png))
- Wrong turn 1: right-click a point for "Add Trendline". It offers "Label the peak at 20…"
  instead. ([menu](evidence/1366-14-point-rightclick.png))
- The Analysis menu is mostly peaks; Fit › Curve fit is the guess.
  ([Analysis](evidence/1366-15-analysis-menu.png))
- **The model defaults to "Gaussian peak"** for a straight line, and the window covers the
  graph's right third, hiding the top point. *"'Gaussian peak'?! My data is a straight
  line."* ([Fit window](evidence/1366-17-curve-fit-window.png))
- "Weight by the Y error column" is already on; the persona leaves it, not knowing what it
  does.
- After Fit: *"Slope 0.02420 plus or minus 0.00021, R squared 0.9994. Got those."*
  ([after fit](evidence/1366-21-after-fit.png))
- Wrong turns 2–4 hunt for "Display equation on chart": the fit line's right-click menu
  (it is the data's menu), Plot › Annotate, and the Results window.
  ([fit line menu](evidence/1366-23-fitline-menu-scrolled.png),
  [Plot menu](evidence/1366-24-graph-plot-menu.png))
- In the end the persona types the equation as free text. `R^2` stays literal (only
  `R^{2}` makes a superscript), and the text will not follow a refit.
  ([typed](evidence/1366-29-text-typed.png), [placed](evidence/1366-30-text-placed.png))
- A residual panel appeared under the graph unasked.

### T3 (A): error bars from SD and a weighted refit. Done, but nothing was chosen.

- The error bars and the weighting were both already on from the import, so the persona
  only confirmed them. *"I guess the import did it."* Nothing on the graph or its Error bars
  menu names the SD column. ([menu](evidence/1366-32-errorbars-sub-2.png))
- The refit says "Converged in 0 iterations", which reads as "nothing happened".
  ([refit](evidence/1366-33-refit-weighted.png))
- "Weighting: instrumental, 1/σ²" is at the bottom of the statistics, below the fold.
  ([Results](evidence/1366-34-results-scrolled.png))

### T4 (A): growth curves with a legend. Done, after retyping the names.

- The semicolons and decimal commas are read correctly. But the second header row (units,
  "h;OD600;OD600;OD600") became the column names, so **"Sample A/B/C" were lost**.
  ([dialog](evidence/1366-35-growth-import-dialog.png))
- The legend reads "OD600, OD600 (2), OD600 (3)". The first curve is dots and the other two
  are lines. The graph opens as a 345 px strip beside a Fit window left over from the last
  project. ([plotted](evidence/1366-37-growth-plotted.png))
- Renaming the Long Name cells fixes the legend, but the Y axis then reads "Sample A" for
  all three curves. ([renamed](evidence/1366-39-renamed.png))

### T5 (A): a log10 column, plotted. Done, on the third formula.

- The worksheet's buttons are bare icons at the default size.
  ([bar](evidence/1366-41-plus-hover.png))
- Wrong turn: `=LOG10(B1)` typed into a cell is refused as "not a number", with no pointer
  to where formulas go. ([refused](evidence/1366-45-excel-formula-entered.png))
- In the F(x)= row, `LOG10` is "no function called LOG10" (only `log10` works), and `B1` is
  "one cell… so write B". The hints led the way.
  ([F(x)](evidence/1366-46-fx-typed.png), [lower case](evidence/1366-47-fx-lower.png))
- The column then works, headed "fx hidden" with 16-digit values cut off by an ellipsis.
  ([done](evidence/1366-48-fx-done.png))
- Plotted, it is "column E" against an axis titled "Y", and the toast says "Plotted column ?
  in Graph 2." ([plotted](evidence/1366-51-log-plotted.png))

### T6 (A): statistics and a histogram per group. Partly done.

- **survey.csv is refused**: "No rows of numbers were found in that file", with no dialog
  and no preview. The file has two text columns (participant, group) and one numeric column,
  which is how most survey, clinical and psychology data comes.
  ([refused](evidence/1366-52-survey-import-dialog.png))
- Help's "Importing data" says nothing about text columns, and its heading overlaps the
  Back bar. ([Help](evidence/1366-56-help-importing.png))
- **File › New project performed an Undo instead**, twice: "Undid plotting column E." and
  T5's graph vanished. ([first](evidence/1366-60-new-project.png),
  [second](evidence/1366-63-new-project-2.png)) The project switcher's "New project" worked.
- The persona reshaped the file "in Excel" (one column per group) and pasted it. Because a
  real clipboard cannot be used headless, the rig wrote that table to the clipboard from
  another tab. ([pasted](evidence/1366-67-survey-pasted.png))
- Descriptive statistics leaves out the first pasted column (Control was made X by
  position), and lists X at max, Noise σ and area above zero for reaction times.
  ([stats](evidence/1366-69-desc-stats.png))
- "Use as Y" on Control inserts a new empty X column.
  ([after](evidence/1366-71-after-use-as-Y.png)) Then mean, SD and n ("Points") are there for
  all three groups, with no standard error and no test.
  ([stats](evidence/1366-72-stats-after-Y.png))
- Statistics › Histogram makes one histogram (of the analysed column) for three selected
  columns. ([one](evidence/1366-73-histograms.png))
- The worksheet's Plot › Histogram of each makes three panels lettered (a)–(c), without
  group names and each with its own X range. ([three](evidence/1366-75-hist-each.png))
- The box chart compares the groups, but its names overlap ("CaffeSleep-deprived") in a
  258 px window. ([box](evidence/1366-76-boxchart.png))

### T7 (B): ExpDec1, then a user-defined ExpDec2. Partly done.

- The import is clean, √N error bars are offered for counts, and a new project is offered.
  ([imported](evidence/1366-79-decay-imported.png))
- The model again defaults to Gaussian peak. ([Fit](evidence/1366-82-decay-fitwin.png))
- The single exponential gives τ = 6.343 ± 0.027 ns with a reduced χ² of 9, and a clear
  note that the residuals run in stretches. ([fit](evidence/1366-84-expdec-fitted.png),
  [note](evidence/1366-86-expdec-note-2.png))
- The function editor is the high point of the walkthrough. Its live preview of the
  formula over the data drew *"nice"*. ([editor](evidence/1366-88-fn-typed.png))
- The double exponential gives 3.873 ± 0.089 and 14.95 ± 0.81 ns with a reduced χ² of 1.00.
  ([fit](evidence/1366-91-expdec2-fitted.png))
- **But the first fit's report is gone.** Results shows only the new fit. History keeps a
  line for the earlier fit (R², χ², a thumbnail) and clicking it does nothing.
  *"In Origin both report sheets stay in the workbook."*
  ([History](evidence/1366-97-history-fits-list-2.png),
  [click](evidence/1366-98-earlier-fit-clicked.png))

### T8 (B): Raman spikes, baseline, peaks, table. Done.

- The 1024-point spectrum is drawn as **dots** in a 345 px strip.
  ([plotted](evidence/1366-101-raman-plotted.png))
- The spike tool ("2 spikes removed", with before and after) and the background tool (arPLS,
  dashed baseline) are clear. Both open over the 1200–1800 cm⁻¹ region being judged.
  ([spikes](evidence/1366-105-despike-tool.png), [background](evidence/1366-107-bg-tool.png))
- Peak fit finds the right nine peaks. It also scatters open triangles for turned-down
  candidates over the noise.
- The Fit button stays disabled until "Use these 9 peaks", which is below the fold.
  ([Peak fit](evidence/1366-109-peakfit-win.png),
  [scrolled](evidence/1366-110-peakfit-scrolled.png))
- The shape is set per peak card, nine lists for nine peaks.
  ([cards](evidence/1366-111-peaks-used.png))
- The fit table has every value with its error. The unweighted reduced χ² of 6063 is shown
  without explanation. ([fitted](evidence/1366-112-peaks-fitted.png))
- Copy table gives a complete TSV. **Export data** writes the 1026 data rows, with the peak
  table at the end as `#` comment lines and no errors for height or FWHM.
- After the fit, the Fit and Results windows cover about three quarters of the graph.

### T9 (B): two-panel figure, raw above fitted, SVG and PDF. Not done (wrong file).

- "A figure of panels…" is found under Window › New graph. It wants graphs, not views, and
  with one spectrum Make it stays disabled. ([dialog](evidence/1366-117-figure-dialog.png),
  [Panels list](evidence/1366-118-panels-list.png))
- The persona duplicates the graph and presses Raw on the copy, then makes the figure: one
  column, Share X. The "Share X (automatic for one column)" switch stays off, so its state
  was a guess. ([raw copy](evidence/1366-121-graph2-raw.png),
  [columns](evidence/1366-124-columns-1.png))
- On screen: (a) fitted, (b) raw, with the two Y titles overlapping at the join.
  ([figure](evidence/1366-125-figure-made.png))
- **The exported PDF and SVG show the fitted spectrum in both panels.** "Raw" is a view of
  the graph in front, not saved with the panel. Nothing says so, and the files are named
  "raman_raw_Graph_2". ([PDF rendered](evidence/1366-127b-pdf-render.png))

### T10 (B): restyle a curve, tick size, reverse X. Partly done.

- Clicking panel (a) moved the Raw view to it, so the panels swapped content.
  ([swapped](evidence/1366-130-panel-a-rightclick.png))
- Colour (a swatch in the right-click menu) and line width (Format dialog) were easy.
  ([Format](evidence/1366-131-series-format.png),
  [fonts](evidence/1366-133-text-fonts-page.png))
- Tick numbers at 13 pt changed only the panel in front.
- **Reverse X reversed only panel (a) under a shared, still ascending axis**, so (a)'s bands
  sit over the wrong wavenumbers (the 1600 doublet over "400"). That is a wrong figure.
  ([after](evidence/1366-134-after-style.png))

### T11 (any): change the background three steps back. Done.

- Maximised, History reads like a lab notebook, and the background step's settings are in
  its inspector. ([History](evidence/1366-136-t11-history-max.png))
- Dragging the stiffness slider made a before/after chart appear above it mid-drag. The
  slider jumped about 140 px, and the value landed at 10^2.6 instead of 10^4. There is no box
  to type a value. ([jump](evidence/1366-137-t11-lambda.png),
  [second try](evidence/1366-138-t11-lambda-2.png))
- The fit is marked out of date in three places (a badge on the box, the status bar, and
  "The processing has changed since") and refits from the box.
  ([box](evidence/1366-139-t11-fitbox.png), [refit](evidence/1366-141-t11-refit.png))
- The new baseline was never seen on the big graph.

### T12 (C): the PI reloads and explains. Done (explanation below).

- The project reopens as the student left it, with History, Fit and Results stacked.
  ([reloaded](evidence/1366-142-t12-reloaded.png))
- The figure now shows the fitted spectrum in both panels.
  ([History](evidence/1366-143-t12-history.png))
- History, maximised, shows the chain. Its inspector is the live editor (one slip changes a
  setting). ([max](evidence/1366-144-t12-history-max.png),
  [background](evidence/1366-146-t12-bg.png))
- The Log tab gives the whole sequence, written as "You …" (with a grammar slip: "You
  Graph 1: reversed the X axis"). ([Log](evidence/1366-147-t12-log.png))
- The HTML report records provenance completely but gives no notes for this fit.
  ([report](evidence/1366-147r-report-0.png))

The PI's written explanation, from the app alone:

> The raw file `raman_raw.txt` (1024 points, SHA-256 dca39377…) was imported unchanged. Two
> steps were applied:
>
> 1. Cosmic-ray spikes removed: threshold 8 × noise, at most 2 points wide; 2 removed.
> 2. Background subtracted by arPLS: first with stiffness 10^5, later softened to 10^3.5.
>
> Nine peaks were found at a signal-to-noise of at least 4 and fitted as nine **Gaussians**
> on a straight baseline, unweighted, twice: R² 0.98715 at 10^5 and 0.98889 at 10^3.5. The
> table in the project is the second fit.
>
> I can trust the **positions**: errors of 0.02–0.33 cm⁻¹ and stable between the two fits.
> I cannot yet trust the **areas and widths**. Gaussian shapes are wrong for Raman bands,
> the fit is unweighted (reduced χ² 4936), and the residuals spike at the 1001 band. The
> areas moved by up to 20 % when the baseline changed (peak 5: 19606 → 15721). The app
> showed me all of this but **judged none of it**: I needed my own expertise to see it.

### T13 (A): misuse. Done; every error explained and recovered from.

- An .xlsx renamed .csv is refused as "a binary instrument file … export it from the
  instrument software". That is the right refusal with the wrong remedy for an Excel file.
  ([refused](evidence/1366-149-t13-broken-file.png))
- A new project inherited the maximised History ("1 spectrum", "No data yet").
  ([new](evidence/1366-150-t13-newproj.png))
- **Keys typed after bringing the worksheet forward from the taskbar went to shortcuts.**
  The graph came forward and the project name opened for renaming.
  ([lost keys](evidence/1366-152-t13-text-in-number.png))
- "about four" in a number cell is kept, red, with "not a number… or press Esc".
  ([cell](evidence/1366-154-t13-text-in-number-2.png))
- A Gaussian on two points is refused after Fit ("Need more than 4 points…"), and so is a
  line through two points; Excel would draw that line.
  ([Gaussian](evidence/1366-156-t13-fit-2pts-result.png),
  [line](evidence/1366-157-t13-line-2pts.png))

## 3. First-five-minutes verdict

**Persona A gets something useful without help, narrowly.** T1 succeeded in seven clicks:
typing works as in Excel, the scatter plot appears by itself, and titles are typed in place.
But almost everything they meet in those five minutes speaks a spectroscopist's language:

- "Bring in a spectrum or a curve", "column B · Raw · 1 points", a SHA-256 hash, Raw / Final
  / Compare and peak tools before any data exists.
- The worksheet, the one thing they understand, is the smallest window and shows one row
  (none at 1280×720).
- Export is two scrolls down a context menu taller than the screen.

The first fit (T2) is where A starts failing: no trendline, a Gaussian peak offered for a
line, and no way to put the equation on the chart. Their first ordinary file with a text
column (T6) does not open at all.

## 4. What the screen shows at each size

**1366×768.**

- The desk shows the graph (about 690×560 px), an empty History (420×360 px) and the
  worksheet (420×260 px), which shows **one data row** under five label rows.
- New graphs from the worksheet or an import open as 345 px strips between other windows.
- Every tool window (spikes, background, Fit) opens over the graph's right third, and
  Results over its lower half. After a peak fit, about a quarter of the graph is visible.
- Context menus run off the screen. Toasts carrying the only "Plot it now" button vanish in
  a few seconds.
- What draws the eye first is the large empty-state panel and its blue Import button. What
  matters to A, the grid, is in the corner.

**1280×720.** Everything above, squeezed further.

- The worksheet shows **no data row at all**.
  ([first screen](evidence/1280-01-first-screen.png))
- The graph's right-click menu opened at mid-height is 390 px tall and shows 13 items.
  Export is two scrolls down. ([menu](evidence/1280-04-menu-1280.png))
- Plotted from the worksheet, the graph is a 280 px strip, with the points past 30 mg/L
  under the Fit window. ([strip](evidence/1280b-05-t2-linear-b.png))
- A new Raman graph opens 320×290 px in a corner, the worksheet squeezed to two rows above
  it, while the middle of the desk stays empty grey. ([corner](evidence/1280b-09-t8-plotted-1280.png))
- The Peak fit window hides five of the nine bands. Results shows two of nine rows.
  ([peak fit](evidence/1280b-12-t8-peakfit-1280.png),
  [fitted](evidence/1280b-13-t8-fitted-1280.png))
- The "Plot it now" toast was gone before it could be used, twice.

**1920×1080.** The toolbar gains words (Import, Export, Zoom, Pan, Mask, Add peak, Label,
Reverse X, Log Y, Grid, Residuals); the labelled Export button made T1 the fastest of all
runs. ([first screen](evidence/1920-01-first-screen-1920.png))

- The worksheet shows six rows.
- The import dialog shows a note hidden at smaller sizes: "Point spacing is uneven.
  Savitzky–Golay smoothing and derivatives need even spacing", on eight calibration
  standards. ([dialog](evidence/1920-04-t2-import-1920.png))
- Results sets parameters and statistics side by side.
  ([fitted](evidence/1920-07-t2-fitted-1920.png))
- **The extra room goes to the panels, not the graph.** A new spectrum opens in a 510 px
  strip beside the previous project's Fit window, and the Fit window is 700 px wide with
  400 px input fields. After the peak fit, the graph keeps a 960×480 px corner showing
  peaks 1–4. ([strip](evidence/1920-08-t8-plotted-1920.png),
  [fitted](evidence/1920-12-t8-fitted-1920.png))

**Dark, 1366×768.** Readable throughout; contrast of words and controls is good.

- The desk behind a closed window is near-black, a hole on the right of the screen.
  ([typed](evidence/dark-03-t1-typed-dark-2.png))
- The fit's confidence band (dark red on navy) is almost invisible.
  ([fit](evidence/dark-07-t2-fitted-dark.png))
- 1024 points drawn as dots fade into the plot along the baseline.
  ([dots](evidence/dark-08-t8-plotted-dark.png))
- The exported PNG is black on white while the screen is light on navy; reasonable for a
  paper, but unannounced. ([PNG](evidence/dark-exported-png.png))
- The worksheet showed only an empty row 7 after six values were typed.

## 5. Rig incidents (not findings about Kurve)

- **Native lists.** In headless Chromium, the popup of a native `<select>` does not take
  clicks, so models and plot types were chosen with the arrow keys and Enter.
- **Clipboard.** The rig wrote the clipboard from a second tab of the same browser to stand
  in for Excel (T6), and read it there to stand in for pasting into a spreadsheet (T8).
- **The 1280 run was killed and restarted.** The 1280×720 browser was stopped by the
  session's 30-minute limit in the middle of T2, and restarted. The restarted browser showed
  none of the earlier projects. The cause is the rig: each server picks a free port, and a
  page on another port is another origin with its own browser storage. A check after a
  normal close, on a third port, showed the same empty list
  ([check](evidence/persist-01-project-list-after-normal-close.png)).
  - **What it means for a person:** projects live only in this browser's storage for this
    address. File has no Save or Open of a project file, so another browser, another
    computer, or the app served from another address shows an empty app, with nothing
    saying where the work went.
- **Misaimed clicks.** A few clicks missed their target: one landed on the menu bar's Plot
  instead of the worksheet's, and one on the worksheet footer instead of row 1. Each was
  continued as a person would, and the footer miss is counted as a wrong turn (dark T1).

## 6. The sealed appendix, checked

| Appendix item | Verdict |
|---|---|
| No data rows at 1280×720; the worksheet is the smallest window | **Confirmed.** One row at 1366×768, six at 1920×1080. |
| Gaussian peak is the default model for a straight line; no Linear fit or trendline in sight | **Confirmed**, also for an exponential decay (T7). |
| The Fit window covers the data it fits | **Confirmed** at every size. The same holds for the spike and background tools, Peak fit and Results. |
| Plot menu has "Format graph…", "Formats", "Format" in a row | **Visible in my screenshot** ([Plot menu](evidence/1366-24-graph-plot-menu.png)) but **missed**: not logged. |
| The graph window repeats Data / Math / Analysis / Statistics / Plot | **Missed** as a finding, though in every screenshot. It caused one misaimed click (T5). |
| History calls a 6-point table "1 spectrum" and "column B"; a SHA-256 link | **Confirmed** (T1). Also: plotted formula columns are "column E" on an axis "Y" (T5), and the import dialog counts histograms as spectra (T7). |
| Raw/Final/Compare, the dropdowns and nine unlabelled tools are active before data | **Seen, not logged: missed.** At 1920 the tools gain labels. |
| Peak fit opens with nine detection settings; the Fit button looks disabled | **Confirmed, and it is disabled** until "Use these N peaks", which is below the fold at 1366 and 1280. |
| Typed data plots at once; imported data waits for Plot | **Confirmed.** It is worse in practice: the only quick way to plot is a toast that vanishes in seconds (missed twice at 1280×720), and in T2 the toast said "not plotted yet" while the graph showed the data. |
| Protect: short grouped menus, the empty state with examples, dark mode, typing like Excel | **Mostly confirmed.** See the note below this table. |

On the last row:
- **Menus.** Short and grouped, but Analysis is a spectroscopist's menu.
- **Empty state.** Clean, but it confused A ("a spectrum?").
- **Dark mode.** Clean except the near-black desk and the faint confidence band.
- **Typing like Excel.** Yes once a cell has the focus. Without the focus, keys trigger
  window shortcuts (T13, dark T1).

## 7. The ten worst moments

Ranked by harm: a silently wrong result first, then lost work or a dead end, then confusion.

1. **T9: the exported figure is not the figure on screen.**
   - Panel (b) showed the raw spectrum; the SVG and the PDF show the fitted one in both
     panels, with no warning.
   - After a reload the figure on screen is wrong too.
   - ([PDF](evidence/1366-127b-pdf-render.png))
2. **T10: Reverse X reverses one panel of a shared-X figure.**
   - The shared axis stays ascending, so the bands sit over the wrong wavenumbers.
   - Tick size also changed in one panel only.
   - ([after](evidence/1366-134-after-style.png))
3. **T6: an ordinary CSV with text columns is refused outright.**
   - "No rows of numbers were found in that file": no dialog, no preview, and no way to
     keep the numeric column or group by the text one.
   - ([refused](evidence/1366-52-survey-import-dialog.png))
4. **T6: File › New project performs an Undo.**
   - Twice: "Undid plotting column E.", taking the last action away instead of making a
     project.
   - ([undo](evidence/1366-63-new-project-2.png))
5. **T7: a second fit replaces the first fit's report.**
   - The earlier fit's parameters and errors cannot be brought back, so two models cannot
     be compared.
   - ([History](evidence/1366-98-earlier-fit-clicked.png))
6. **T2: fitting a straight line is a hunt.**
   - Right-clicking the data offers peak labels.
   - Curve fit defaults to "Gaussian peak".
   - There is no way to show the equation or R² on the graph, so the persona retyped them by
     hand, as text that will not follow a refit (four wrong turns, three guesses).
   - ([Fit](evidence/1366-17-curve-fit-window.png))
7. **Every size: windows cover the graph they are about.**
   - Tool dialogs, the Fit window and Results hide 50–75 % of the plot, including the bands
     being fitted.
   - New graphs open as 280–510 px strips while panels take the room, even at 1920×1080.
   - ([1366](evidence/1366-112-peaks-fitted.png),
     [1920](evidence/1920-12-t8-fitted-1920.png))
8. **T4: the sample names are lost on import.**
   - The units row became the column names: "OD600, OD600 (2), OD600 (3)".
   - After renaming, the Y axis is titled after the first sample.
   - In T2, axis titles typed for one data set stayed on the graph over another.
   - ([legend](evidence/1366-37-growth-plotted.png))
9. **The worksheet hides what is typed and loses keys.**
   - It shows one data row at 1366×768 and none at 1280×720.
   - Keys typed when no cell has the focus close windows or open a rename instead.
   - ([1280](evidence/1280-01-first-screen.png),
     [lost keys](evidence/1366-152-t13-text-in-number.png))
10. **T8/T12: the outputs a colleague receives under-inform.**
    - The CSV holds the peak table only as `#` comments, without FWHM or height errors.
    - The report records every step but gives no verdict on the fit: an unweighted reduced
      χ² of 4936 is not explained, and the residual structure at the strongest band is not
      mentioned.

Close behind these:
- T5's formulas: an Excel formula in a cell is refused, and `LOG10` is case-sensitive.
- T11's slider jumps mid-drag and cannot be typed.
- T3: weighting and error bars arrive by default without being chosen.
- Projects live only in the browser's storage, with no Save or Open (section 5).
