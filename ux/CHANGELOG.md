# UX rework changelog

One entry per Phase 4 slice: what changed, which finding it answers, and the measured effect.
Before-and-after screenshots are in [`evidence/slices/`](evidence/slices/) (`<slice>-before-…`
and `<slice>-after-…`, 1366×768, light and dark, taken by `tools/ux/shots.py`). Task re-runs
are in [`evidence/logs/slices/`](evidence/logs/slices/) (taken by `tools/ux/tasks.py`).

## Slice 1: design tokens and the colour and contrast pass

**What changed** (CSS, and the default curve colours):
- **Sizes became tokens** (UX_SPEC §3.5, `spec/TOKEN_MAP.md`):

  | Kind | Before | After |
  |---|---|---|
  | Type sizes | 17 | 6: `--fs-cap` 11 · `--fs-tab` 12 · `--fs-body` 13 · `--fs-title` 14 · `--fs-head` 16 · `--fs-hero` 20 px |
  | Spacing values | 36 | 8 steps: `--sp-1` … `--sp-8`, 2 · 4 · 6 · 8 · 12 · 16 · 24 · 32 px |
  | Radii | 13 | 3: `--r-s` 4 · `--r` 6 · `--r-l` 8 px |

- **Left raw, each justified** in TOKEN_MAP.md:
  - 3 sizes: the font sample, the symbol picker's glyphs, the x² button's script.
  - 5 radii: pills and round shapes.
  - 5 spacing values: hairlines and two layout offsets.
  - 10 colours: the colour picker's gradients, checkerboards, the export page.
- **Offsets tied to a padding moved with it**, so no sticky footer floats: the two sticky
  footers, the windows' search bars and the menu's search box.
- **States:**
  - Disabled controls are drawn with `--ink-off` words and a dashed edge, where before they
    were faded to opacity .40–.55.
  - Pressed has its own fill, `--press`, and an inset shadow.
  - On a menu highlight, shortcuts and arrows take the primary ink.
- **Words on filled status shapes** (step numbers, badges, the warning dot, the danger button)
  use `--on-fill`, and badges sit on `--badge`.
- **The default curve colours** are the validated eight hues, in worksheet order.
  - The analysed curve keeps its colour and is drawn heavier.
  - The older "Distinct hues" scheme is the same hues, and is hidden from the list.

**Findings it answers:**
- **The token audit** (Phase 3): 21 font sizes and 196 colours, as the plan counted them.
- **Contrast** (Phase 3 measurements):
  - White on dark mode's status fills read at 1.8–2.0:1.
  - White on light mode's badge read at 4.2:1.
  - Secondary words on highlights read at 5.4–6.9:1, where 7:1 is needed.
  - Disabled words were faded by an amount that depended on the control.
- **The curve palette:** the old default failed the colour-blind check in both themes.
  - Teal against green: ΔE 8.5 even for full colour vision, in light.
  - Violet against periwinkle: ΔE 5.0, in dark.

**Measured effect:**

| | Before | After |
|---|---|---|
| `tools/contrast-test.mjs` | 133 checks, all passing; 24 of the new checks fail on the old file | 189 checks, all passing |
| Text on status fills (step numbers, badges) | 1.8–4.2:1 | 6.5–8.1:1 |
| Disabled button, as drawn | faded by opacity | 6.1–6.9:1, opacity 1 |
| Curve palette, worst adjacent pair (light / dark) | fails: normal vision 8.5 / 5.0 | colour-blind ΔE 9.1 / 8.4, normal vision 19.6 / 19.3 |
| T1 re-run (1366×768, light and dark) | 7 clicks, 59 keys | 7 clicks, 59 keys: unchanged |

- **No task got worse.** No task's path changed: this slice changes what things look like,
  not where they are.
- **Tools, after the slice:**
  - fit, pipe, parser and tex tests: all pass.
  - odd-test: 51 of 51.
  - sheet-fuzz, seeds 1 and 2: clean.
  - Duplicate-function check: no function is declared twice.

## Slice 4: menu and toolbar restructure

**What changed** (`ux/spec/menus-after.txt`, UX_SPEC §3.3; DESIGN.md, Menus and the toolbar):
- **The menu bar**: File, Edit, Data, Plot, Analysis, Statistics, Spectroscopy, Window, Help.
  - Math is gone: its tools are Analysis › Mathematics and Analysis › Smooth and filter.
  - **Spectroscopy** is new: the Overview, cosmic-ray spikes, background, Find peaks, known
    lines, the X-axis tools and the corrections, which were spread over five menus.
  - New graph moved from Window to Plot. Copy from another project (once "Bring in…", in four
    places) is in File and the Explorer's project menu.
  - Edit gained the worksheet's Copy, Paste, Clear and Find, and the two Copy commands that
    were in Export.
  - Items show only when they can apply: Fit every column…, Batch results, a trend graph, the
    second axes' pages, the inset, and Python (under Analysis › More until a project uses it).
  - The labels are the spec's ("Original" and "Processed" for raw and final, "column" for
    spectrum in the menus, "saved style" for format, "Drop lines", "Two Y axes").
  - Moving along the bar opens the next menu only after the pointer rests 150 ms on its name.
- **The toolbar**: Explorer │ Import, Export │ Undo, Redo │ Zoom … Shape │ Show all │ Reverse X,
  Log Y, Grid.
  - The switches are off until there is data.
  - Comment shows only in a shared project; alone, it is the right-click's *Add here › A
    comment here…*.
  - Raw / Final / Compare is on the graph window's own bar as **Original · Processed · Both**,
    beside the same menus as the menu bar (Data, Plot, Analysis, Statistics, Spectroscopy).
  - The plot-type and layout lists went to Plot and a curve's right-click.
  - Residuals went to the Fit window and Analysis › Fit.
  - Add peak is a button in the peak fit's part 2.
- **Right-click menus**:
  - Each holds what belongs to the thing clicked, then Add here, then Format graph…, Copy the
    graph as a picture and Export (the File › Export list).
  - A curve's menu now needs a click on the curve; elsewhere the plot's menu has Add here
    inline. It used to give the active curve's menu wherever you clicked.
  - Graph ▸, Several spectra ▸, Font ▸, Legend ▸, Find peaks and Integrate bands left the
    graph's menu (all are in Plot, Analysis or Spectroscopy).
  - The axis menu leaves the outward offset and the edge across to the Format dialog.
  - The column menu has Use as ▸ (X, Y, Error bars, Other data) and Active.
  - The cell menu follows UX_SPEC's order.
- **Help** cites the new paths (every `MP(…)`, `DOC_MENU`, the toolbar, export and saved-style
  articles).
- **One route added to the spec**: Window › Graphs › *A figure of panels…*, beside Combine
  graphs…. Phase 1's T9 looked for the figure dialog under Window; without it, T9 would have
  gained a wrong turn when New graph moved to Plot.

**Kept for later slices, on purpose:**
- The approved removals (R1 Graphite, R2 the one-band example, R3 the steps as JSON, R6 all
  graphs as one figure) are slice 7's.
- The processing tools keep their names until slice 3: Remove a region, Sort by X, Subtract or
  divide by another spectrum, Average with other spectra.
- Derivative, as a new column… stays beside Derivative… until slice 6 merges them.
- *Report* and *Histogram* have no ellipsis, unlike the spec's names: both act at once.
- *Format graph…* carries no "Double-click": a double click on the plot shows all the data.

**Findings it answers:**
- **Phase 1 T1**: *Export the figure* was the last item of a 116-item right-click menu, off the
  screen at 1366 × 768.
- **T2**: crossing the menu bar opened a menu by itself.
- **T6**: Statistics › Histogram made one histogram for three selected columns.
- **T9**: *A figure of panels…* was found under Window only by searching.
- **The Phase 2 inventory**:
  - six routes to copy from a project, four names for one export, three menus for integrating;
  - spectroscopy mixed into the general path;
  - plot type, layout, Raw/Final/Compare, Residuals and Add peak on the toolbar.

**Measured effect:**

| | Before | After |
|---|---|---|
| Menu bar items (crawl) | 320 | 272 |
| A curve's right-click: rows / items | 28 / 116 | 12 / 45 |
| The plot's right-click: rows / items | 20 / 98 | 14 / 27 |
| The fit curve's right-click: rows / items | 25 / 102 | 9 / 31 |
| The X axis's right-click: items | 68 | 54 |
| `tools/ux/menucheck.py` | — | 0 spec items missing, 0 extra; 6 conditional; 9 kept for later slices |

Task re-runs: `tools/ux/tasks.py` runs the same paths on the slice-1 file and on this one, at
1366 × 768. Logs are `evidence/logs/slices/s4-before-*` and `s4-after-*`. Hovers (opening a
submenu) are now counted too; the second KLM column adds 1.1 s for each.

| Task | Before: clicks · keys · hovers · wrong turns · KLM (+hovers) | After | |
|---|---|---|---|
| T1 type, plot, titles, PNG | 7 · 59 · 1 · 0 · 35.1 s (36.2) | 7 · 59 · 1 · 0 · 35.1 s (36.2) | same |
| T2 straight-line fit | 13 · 45 · 2 · 4 · 47.0 s (49.2) | 13 · 45 · 2 · 4 · 47.0 s (49.2) | same |
| T5 log10 column, plot | 6 · 44 · 2 · 1 · 28.2 s (30.4) | 6 · 44 · 2 · 1 · 28.2 s (30.4) | same |
| T6 statistics and histograms | 21 · 2 · 0 · 2 · 56.2 s (56.2) | 19 · 2 · 1 · 1 · 50.9 s (52.0) | **better**: one Histogram for the three columns |
| T8 Raman: spikes, baseline, peaks | 18 · 2 · 2 · 0 · 48.3 s (50.5) | 19 · 0 · 2 · 0 · 50.4 s (52.6) | **worse by one click** (+2.1 s), see below |
| T9 two-panel figure, SVG, PDF | 18 · 4 · 5 · 1 · 48.8 s (54.3) | 18 · 4 · 4 · 1 · 48.8 s (53.2) | better by a hover (PDF is one level up) |
| T10 restyle, tick size, reverse X | 10 · 4 · 1 · 0 · 28.7 s (29.8) | 10 · 4 · 1 · 0 · 28.7 s (29.8) | same |
| T12 explain the project | 4 · 1 · 1 · 0 · 10.9 s (12.0) | 4 · 1 · 1 · 0 · 10.9 s (12.0) | same |

- **In dark mode** T1, T2 and T8 count the same as in light.
- **T8 got worse, and it is the one touched task that did.**
  - It drew the Raman spectrum (1024 points) as dots, and made it a line from the toolbar's
    plot-type list: one click and two keys.
  - That list is now in Plot and the curve's right-click: right-click, Plot type, Line, which
    is two clicks.
  - Slice 5's default (UX_SPEC §3.7: a line for many evenly spaced points) removes the step
    altogether, which would make T8 one click and two keys better than before. I did not pull
    it forward without asking, since slice 5 comes after the stop.
- **Phase 1's own counts** differ a little from the before column (T2 15, T8 19, T12 10 clicks):
  that run included a list click the headless browser did not take, and more History boxes
  read. The before and after columns run the identical script.

**Tools, after the slice:**
- fit, pipe, parser and tex tests: all pass.
- contrast-test: 189 of 189.
- odd-test: 51 of 51.
- sheet-fuzz, seeds 1 and 2: clean.
- Duplicate-function check: none.
- A drive of every control the slice touched: 41 of 41, no page errors. It covered the menu
  bar's order and delay, Edit's worksheet commands, Sort the view, the graph's Original,
  Processed and Both, the plot's and a curve's right-click, Add here › A graph title and A
  comment here…, Export › Graph as PNG, the axis and column menus, Statistics › Histogram,
  Residuals in the Fit window and Analysis › Fit, Add a peak, the Spectroscopy menu and its
  tools, Several curves, Window › Graphs, and Python appearing once used.

## Slice 2: layout and docking

**What changed** (UX_SPEC §3.2):
- **The first screen is two windows**: the worksheet (44 %) and the graph (56 %), side by
  side. History no longer opens on a first visit.
- **The dock.** The tool windows open as tabs in one column at the desk's right, one shown at
  a time, and the worksheet and the graph share the rest:
  - It holds Fit, Results, Peaks, Integrate, History, Statistics, the Overview, Help,
    Discussion and the processing tools. Batch and Python still float.
  - Its width is 360, 380 or 420 px by the screen. Its left edge drags, or takes the arrow
    keys.
  - A tab double-clicked takes the whole desk. A tab dragged out, or a title bar dragged,
    floats the window, and the window's dock button docks it again.
  - It becomes a drawer over the documents below 1100 px, or when a 480 px graph and a 300 px
    worksheet would not fit beside it. The drawer has a pin, to put the dock beside them, and an
    arrow that puts the windows away in the taskbar.
  - It is remembered per browser: layout version 3, with the dock order, width and pin.
- **Bars**: the toolbar is 40 px, the taskbar 30 and the status bar 24. The Project Explorer is
  220 px wide, and a drawer below 1600 px (it used to be docked down to 1000 px).
- **The worksheet's header** is the letters, Long Name and Units.
  - Comments, F(x)= and Sparklines are behind the ⋯ in the corner, per project.
  - F(x)= shows itself when a column has a formula.
  - Rows are 22 px.
  - A formula typed into a cell (`=LOG10(B1)`) moves to the column's F(x)= row, still being
    typed, with a message that a letter there is the whole column.
- **An import plots nothing and closes nothing.** The empty graph says *Nothing plotted yet*
  and offers *Plot setup…*. Fit, Peaks and Integrate plot the active column on it when it is
  empty.
- **History opens in the dock with a column's first processing step**, rather than with an
  import.
- **A new graph is never narrower than 480 px.**
  - Beside the worksheet, the worksheet keeps 300 px up to 44 %.
  - Otherwise the new graph goes beside or under the graph in front.
  - When neither fits, it takes that graph's place and the old one waits in the taskbar.
- **The graph's bar** drops its menus' arrows and some padding in a graph narrower than
  700 px, so *Original / Processed / Both* stays in view beside the dock.
- **Help**: *Windows and the desk* explains the dock; the Explorer and worksheet articles give
  the new widths and the ⋯.

**Findings it answers:**
- **Phase 3 measurements**:
  - no worksheet rows in view on a first visit at 1280 and 1366 px;
  - a 148 px worksheet header;
  - after a Plot, a 346 px graph at 1366 px, an eighth of it under the Fit window;
  - History hidden under other windows;
  - the Explorer taking 250 px at every width.
- **Phase 1 T5**: `=LOG10(B1)` typed into a cell was refused as "not a number". This slice
  hides F(x)= by default, which would have made T5 worse, so the cell now hands the formula
  to F(x)= instead.
- **Phase 1 summary, finding 7**: "Every size: windows cover the graph they are about". Tool
  dialogs, the Fit window and Results hid 50–75 % of the plot, and new graphs opened as
  280–510 px strips even at 1920 × 1080. In particular:
  - **T2**: the Fit window covered the graph's right third.
  - **T4 and T8**: the graph opened as a 345 px strip.
  - **T8**: after the fit, the Fit and Results windows covered three quarters of the graph.
- **T11 and T12**: History was read maximised, over the graph. It now takes the whole desk
  from a double-click on its tab, and goes back with another.

**Measured effect** (`tools/ux/measure.py --layout`: window rectangles, and the part of each
window not covered by another; `evidence/slices/s2-layout-before.json` and `-after.json`):

| | Before | After |
|---|---|---|
| Windows open on a first visit | 3 | 2 |
| Worksheet data rows in view, first visit: 1280 · 1366 · 1920 px | 0 · 0 · 6 | 19 · 21 · 35 |
| Worksheet header | 148 px | 66 px |
| Desk at 1366 × 768 | 1115 × 660 | 1366 × 663 |
| IR example, Fit open, 1366: graph window (width, share in view) | 346 px, 88 % | 552 px, 100 % |
| … its plot area | 330 px | 536 px |
| IR example, Fit open, 1280 · 1920: plot area | 303 · 501 px | 499 · 700 px |
| After an import and Plot, 1366: graph window | 346 px | 765 px |
| History, IR example | open, 0 % in view | closed until asked or a step is added |

Task re-runs (`tools/ux/tasks.py`, the same paths on the slice-4 file and on this one, at
1366 × 768). Logs are `evidence/logs/slices/s2-before-*` and `s2-after-*`.

| Task | Before: clicks · keys · hovers · wrong turns · KLM (+hovers) | After | |
|---|---|---|---|
| T1 type, plot, titles, PNG | 7 · 59 · 1 · 0 · 35.1 s (36.2) | 7 · 59 · 1 · 0 · 35.1 s (36.2) | same |
| T2 straight-line fit | 13 · 45 · 2 · 4 · 47.0 s (49.2) | 13 · 45 · 2 · 4 · 47.0 s (49.2) | same |
| T5 log10 column, plot | 6 · 44 · 2 · 1 · 28.2 s (30.4) | 5 · 33 · 2 · 0 · 22.5 s (24.7) | **better**: the formula typed into a cell is taken |
| T6 statistics and histograms | 19 · 2 · 1 · 1 · 50.9 s (52.0) | 19 · 2 · 1 · 1 · 50.9 s (52.0) | same |
| T8 Raman: spikes, baseline, peaks | 19 · 0 · 2 · 0 · 50.4 s (52.6) | 19 · 0 · 2 · 0 · 50.4 s (52.6) | same |
| T9 two-panel figure, SVG, PDF | 18 · 4 · 4 · 1 · 48.8 s (53.2) | 18 · 4 · 4 · 1 · 48.8 s (53.2) | same |
| T10 restyle, tick size, reverse X | 10 · 4 · 1 · 0 · 28.7 s (29.8) | 10 · 4 · 1 · 0 · 28.7 s (29.8) | same |
| T12 explain the project | 4 · 1 · 1 · 0 · 10.9 s (12.0) | 4 · 1 · 1 · 0 · 10.9 s (12.0) | same |

- **No touched task got worse.** Clicks and keys do not measure what this slice changed: how
  much of the graph and the worksheet a person sees while working. The layout table above
  measures that.
- **The paths run with their windows where they now open.** The rig aims at what is drawn, so
  a control under another window would have failed the run.
- **In dark mode** T1, T2, T5 and T8 count the same as in light.

**Tools, after the slice:**
- fit, pipe, parser and tex tests: all pass.
- contrast-test: 189 of 189.
- odd-test: 51 of 51.
- sheet-fuzz, seeds 1 and 2: clean.
- Duplicate-function check: none.
- A drive of every control the slice touched: 45 of 45 in light and in dark, no page errors.
  It covered:
  - the first screen's two windows and their shares;
  - the bars' heights;
  - the Explorer as a drawer, opened by Alt+1;
  - the worksheet's three header rows, 22 px rows, the ⋯ menu, and ↑ skipping hidden rows;
  - Fit docking and the documents sharing the rest;
  - a second tab, switching tabs, a tab's ×;
  - the edge widening the dock;
  - floating a window by its tab and by its title bar, and docking it again;
  - a tab maximised;
  - the drawer at 1024 px, its pin, putting it away;
  - an import leaving the empty graph with Plot setup…, which plots;
  - History docking with the first step;
  - two graphs of 765 px;
  - no dock on a phone;
  - the dock restored after a reload.
- Slice 4's drive still passes: 41 of 41.
- Two bugs the drive found and the slice fixed before measuring:
  - the dock's edge lay under the windows, so it could not be held;
  - an empty graph counted the active column's points, so it drew empty axes instead of
    offering Plot.

## Slice 3: terminology

**What changed** (UX_SPEC §3.6, the glossary): every label, tooltip, toast, History box,
report and CSV line, and Help article uses the glossary's words.

| Instead of | Now | Where it shows most |
|---|---|---|
| spectrum, spectra (outside spectroscopy) | column; curve for what is drawn | the worksheet, Data, Analysis, Batch, History, Help |
| the analysed spectrum, being analysed | the active column | menus, History, Fit, Batch |
| raw data, the Raw sheet | original data, the Original sheet | the worksheet's tabs, History, exports |
| final data, the Final sheet | processed data, the Processed sheet | the same |
| recorded data or values | original data or values | the worksheet's toasts, the lock |
| fingerprint | check code | the History, the original-data CSV, Help |
| panels (for windows) | tool windows | Help's desk article |
| formats | saved styles | log lines and toasts |
| Untitled analysis | Untitled project | new projects; older names still count as untitled |
| turned down | not counted as a peak | the peak finder |
| Data, not a spectrum | Other data (not plotted) | the import dialog, Fill, the column's use |

- **Renamed tools:**
  - *Remove a region…* is *Leave out an X range…*.
  - *Sort by X* is *Sort by X (as a step)*. Its History box keeps the short name *Sort by X*.
  - *Subtract or divide by another spectrum…* is *…another column…*.
  - *Average with other spectra…* is *…other columns…*.
  - `tools/ux/menucheck.py` no longer defers any rename.
- **Kept on purpose:**
  - **Spectroscopy's words** inside the Spectroscopy menu and its windows (Peaks, Peak fit,
    Integrate, Overview, the spectroscopy tools).
  - **The gamma-spectrum part** of the import article.
  - **The examples' names and descriptions.**
  - **Python's API names** (`spectra`, `peaks`).
  - **Code names** (`raw`, `final`, `p.raw`).
  - **Help's search words**, so a search for "fingerprint" or "spectrum" still finds its
    article.
- **A new tool, `tools/ux/terms.py`**, counts the words off the glossary in every prose literal
  of the file. Its contexts tell the spectroscopy windows from the rest. CLAUDE.md asks that
  it stay at 0.

**Findings it answers:**
- **The Phase 2 language audit** (FEATURE_INVENTORY §2): one thing under several names.
  - spectrum, column, data set and series;
  - raw, recorded and original;
  - final and processed;
  - fingerprint and hash;
  - panel for both a window and a figure's graph.
- **Phase 1 T1 and T6:** "I don't have a spectrum". Persona A met spectroscopy's words in the
  worksheet, the statistics and the Fit window, with a distance–time chart and a survey.

**Measured effect:**

| | Before | After |
|---|---|---|
| Words off the glossary in the file's prose (`tools/ux/terms.py`) | 696 | 0 |
| … of them "spectrum" or "spectra" outside spectroscopy | 421 | 0 |
| … "raw", "final", "recorded" | 201 | 0 |
| Old words on screen: text, tooltips and lists of 13 windows on the IR example, with a step, a peak fit and a peak set | 60 | 0 |
| Menu items under a name the spec replaces (`menucheck.py`'s deferred renames) | 4 | 0 |
| Help articles that render, and links that resolve | all | all |

Task re-runs (`tools/ux/tasks.py`, the same paths on the slice-2 file and on this one, at
1366 × 768). Logs are `evidence/logs/slices/s3-before-*` and `s3-after-*`.

| Task | Before: clicks · keys · hovers · wrong turns · KLM (+hovers) | After |
|---|---|---|
| T1 | 7 · 59 · 1 · 0 · 35.1 s (36.2) | the same |
| T2 | 13 · 45 · 2 · 4 · 47.0 s (49.2) | the same |
| T5 | 5 · 33 · 2 · 0 · 22.5 s (24.7) | the same |
| T6 | 19 · 2 · 1 · 1 · 50.9 s (52.0) | the same |
| T8 | 19 · 0 · 2 · 0 · 50.4 s (52.6) | the same |
| T9 | 18 · 4 · 4 · 1 · 48.8 s (53.2) | the same |
| T10 | 10 · 4 · 1 · 0 · 28.7 s (29.8) | the same |
| T12 | 4 · 1 · 1 · 0 · 10.9 s (12.0) | the same |

- **No task got worse, and none got faster.** The paths go to the same controls, and none of
  them was renamed.
- **What the words change is reading:** the guesses Phase 1 logged ("Raw?", "a spectrum?"). A
  scripted path cannot measure that. Phase 5's fresh walkthrough will.

**Tools, after the slice:**
- fit, pipe, parser and tex tests: all pass.
- contrast-test: 189 of 189.
- odd-test: 51 of 51.
- sheet-fuzz, seeds 1 and 2: clean.
- Duplicate-function check: none.
- `menucheck.py`: 0 missing, 0 extra.
- `terms.py`: 0.
- A drive of the slice: 10 of 10 in light and dark. It covered the new project's name, the
  older names, the worksheet's sheets, the History's boxes, the words on screen in 13 windows,
  the renamed tools, every Help article and link, and Help's search for the old word.
- Slices 2 and 4's drives still pass: 45 of 45 and 41 of 41.

## Slice 5: defaults that fit the data

**What changed** (UX_SPEC §3.7, from the defaults audit in FEATURE_INVENTORY §3). Each default
now follows the data; a choice made by hand, or kept in an older project, is left alone.

| Default | Before | Now |
|---|---|---|
| Plot type | Symbols for the active curve, lines for the others; a line only for an import of over 3000 points or one column | **Automatic**: a line for 500 points or more, or 40 or more in order and evenly spaced; symbols otherwise. One rule for typing, pasting, importing, dropping and plotting. *Automatic* is first in the curve's Plot type, with what it picked; a type chosen there is the curve's own |
| Residual panel | Under every fit | Under a peak fit, not a curve fit; the Fit window's switch turns it on or off for any fit |
| Curve fit's model | Gaussian | Suggested from the shape of the points: a straight line, an exponential, a sigmoid or a Gaussian, named under the list with a button to choose it again |
| Weighting | Said only by the Weight switch | Stated by the Fit button: *Weighted by column C (σ)* or *Unweighted: every point counts the same* (curve and peak fits) |
| Error bars | The curve's Error bars menu did not say where they came from | Its first line names the column (*From column C (σ)*), or *Carried through the processing* |
| The fit's range | The graph's zoom, without saying so | **All the data**. A typed range, or *Use the view*, sets it; zooming alone does not. What the fit leaves out is shaded while the Fit window is open. *Fit them…* from the Peaks window takes the set's range |
| A units row | A last header line of units became the names (Sample A, B, C lost) | Under a line of names it fills the Units row: *Sample A (OD600)* |
| No X-like column | The first column was X, whatever it held | X is the first column that rises or falls steadily, else the first named as an axis (time, wavelength, concentration…). With neither, every column is a Y against the row number. The same holds for a file, a drop, and a paste into an empty sheet, where the sheet's empty X column moves after the pasted ones |
| √N error bars | Offered for any column of whole numbers of zero or more | Only for whole numbers named as counts (*counts*, *cts*, *cps*, *events*) or read from a TKA file |
| The Overview, and *Label the peak at…* on a curve | After every import that plots one column; on any curve | Only for data that looks like a spectrum, by the Overview's own measures (50 points or more, in order, evenly spaced, with a band at least five times the noise). Spectroscopy › Overview still opens it for any data |
| Descriptive statistics | Points, min, max, X at max, mean, SD, median, noise σ, S/N, area, centroid | **n, mean, SD, SE, median, min, max**. *Noise, S/N and area* adds the spectral measures; it starts on for a spectrum and off otherwise. The copied table follows |
| Examples | Infrared first | The fluorescence decay first (File › Examples, the empty graph, Help). The Raman one-band example stays until slice 7 (R2) |
| The Y axis's automatic title | The active column's name and unit | The same for one curve. With several overlaid or offset: their name when they share it, else their shared unit, else *Value*. A title typed by hand stays |
| A figure's Share X | "Share X (automatic for one column)", unticked | Ticked and fixed while the panels will be in one column, a choice again with two or more |

- **The glossary counter** (`tools/ux/terms.py`) now also reads fragments joined to a number,
  such as `n + " spectra"` or `${n} spectra`. On the slice-3 file it finds 23 more words off the
  glossary, in toasts, log lines, dialog titles and menu notes. They are fixed, with three in
  this slice's own new text. A name in code type
  (`<code>spectra</code>`, Python's API) is skipped.
- **Removed:** `setViewX`. The Fit window no longer zooms the graph.

**Findings it answers:**
- **FEATURE_INVENTORY §3, the defaults audit:** each row above is one of its lines. The
  wrong-for-most-users defaults were the plot type, the residual panel, the Gaussian, the
  hidden fit range, the units row, the first column as X, √N for whole numbers, and the
  spectral statistics.
- **Phase 1 T2:** the model list had to be scrolled from Gaussian to Straight line.
- **Phase 1 T4:** the units row took the place of the names.
- **Phase 1 T6:** the first pasted group (Control) was made X and left out of the statistics.
- **Phase 1 T8, and slice 4's one regression:** the Raman spectrum was drawn as dots and had to
  be made a line by hand.

**Measured effect.** The same probes on the slice-3 file and on this one
(`measure5.py`, at 1366 × 768):

| Probe | Before | After |
|---|---|---|
| 400 evenly spaced points pasted | symbols | line |
| Six typed points | symbols | symbols |
| growth_eu.csv's names | h, OD600, OD600, OD600 | Time (h), Sample A (OD600), Sample B (OD600), Sample C (OD600) |
| Three groups side by side (Control, Placebo, Drug), imported or pasted | X, Y, Y | Y, Y, Y (against the row number) |
| … groups in the descriptive statistics | 2 of 3 | 3 of 3 |
| … the Y title | "Placebo" | "Value" |
| √N offered for a column of ages | yes | no |
| A decay's curve fit starts from | Gaussian | Exponential decay |
| Residual panel under that curve fit | on | off |
| Residual panel under a peak fit (IR example) | on | on |
| Points fitted after zooming to a third of the IR example | 76 of 201, and the fit said it was out of date | 201 of 201, up to date |
| The Overview opening by itself after a dropped file: 60 scattered points; a straight line; a band | yes; yes; yes | no; no; yes |

Task re-runs (`tools/ux/tasks.py`, the same paths on the slice-3 file and on this one, at
1366 × 768; dark counts the same as light). T2 and T6 take the step only while it is still
needed, as T5 and T8 already did. Logs are `evidence/logs/slices/s5-before-*` and `s5-after-*`.

| Task | Before: clicks · keys · hovers · wrong turns · KLM (+hovers) | After | |
|---|---|---|---|
| T1 | 7 · 59 · 1 · 0 · 35.1 s (36.2) | the same | |
| T2 | 13 · 45 · 2 · 4 · 47.0 s (49.2) | 12 · 41 · 2 · 4 · 43.3 s (45.5) | **better**: Straight line is suggested, no list to scroll |
| T5 | 5 · 33 · 2 · 0 · 22.5 s (24.7) | the same | |
| T6 | 19 · 2 · 1 · 1 · 50.9 s (52.0) | 16 · 2 · 0 · 1 · 43.0 s (43.0) | **better**: Control is a Y, no Use as › Y |
| T8 | 19 · 0 · 2 · 0 · 50.4 s (52.6) | 17 · 0 · 1 · 0 · 45.0 s (46.1) | **better**: the spectrum is a line from the start |
| T9 | 18 · 4 · 4 · 1 · 48.8 s (53.2) | the same | |
| T10 | 10 · 4 · 1 · 0 · 28.7 s (29.8) | the same | |
| T12 | 4 · 1 · 1 · 0 · 10.9 s (12.0) | the same | |

- **No task got worse.**
- **Slice 4's regression on T8 is gone.** Before slice 4, T8 took 18 clicks, 2 keys and 2
  hovers. Now it takes 17 clicks, no keys and 1 hover.
- **T6 still ends "partial".** survey.csv (participant, group, value in rows) is still refused
  and reshaped by hand. Reading a long table into groups is a feature, so it is outside the
  freeze.

**Tools, after the slice:**
- Unit tests:
  - fit, pipe and tex tests: all pass.
  - parser test: 148, of which 10 are new (units rows of four kinds, a second line of names that
    is not units, groups with no X, an unsorted column named as an axis, error columns).
- contrast-test: 189 of 189.
- odd-test: 51 of 51.
- sheet-fuzz, seeds 1 and 2: clean.
- Duplicate-function check: none.
- `menucheck.py`: 0 missing, 0 extra. Plot type's *Automatic* was added to `spec/menus-after.txt`.
- `terms.py`: 0, with the fragment rule.
- A drive of the slice: 48 of 48. It covered:
  - the plot type for typed, even and uneven data, and the Plot type menu;
  - the suggestion for four shapes, and its button;
  - the residual switch under both kinds of fit;
  - the weighting line;
  - the fit's range: all, zoom, Use the view, the shading, out of date, All;
  - the statistics' columns, switch and copy;
  - pasted groups;
  - the units row through the dialog;
  - the shared-unit title, and a typed title that stays;
  - √N by name;
  - the examples' order;
  - no Overview for five points;
  - Share X in one and two columns;
  - an older project's settings.
- Slices 2, 3 and 4's drives still pass: 45 of 45, 10 of 10, 41 of 41. Slice 4's residual check
  now asks `residOn`, since "auto" is not `false`.

## Round 6: the user's review after slice 5

**What changed**, request by request:

| The user asked | Now |
|---|---|
| Hide and Unhide for columns and rows | From the column's, the cell's and the row number's menus, and Data › Hide and show. A hidden column is a thin marked strip (double-click it to show it again); hidden rows leave a mark on the next row number (double-click it). The foot says how many are hidden, with *Show*. A view only: hidden values are still plotted, fitted and exported. Kept with the project, undone like any change |
| Suggestions for functions in the formula row, not only errors | A list under the formula as it is typed: the columns by letter and by name, x and i, every function with its arguments and what it does, the constants. ↑ ↓, Tab, Esc, Ctrl+Space, a click. Inside a function's brackets, its arguments with the one being typed in bold. In the F(x)= row, a cell that starts with =, the formula bar and a fit function's formula. A formula not finished yet is said quietly; only a mistake is red |
| Transitions refined and smooth, like Excel | Windows grow in, fade out, shrink into their taskbar button and grow back out, and glide when maximised, tiled, cascaded or moved by the dock or the Explorer; dock tabs cross-fade; the worksheet's cursor glides from cell to cell; menus, dialogs, pickers and messages come in from a few pixels away, and messages fade out. Nothing moves during a drag or a resize of the browser; Preferences › Animations and the system's reduced motion turn it off |
| "Raw and final" only when exporting | The Original / Processed sheets, the graph's Original / Processed / Both, Data › Show on the graph and the statistics' choice appear only once a column has a processing step; the exports keep both |
| A history switch in preferences, easy to find; off captures no history, only errors | Preferences (a gear in the title bar, File › and Edit › Preferences…, Ctrl+,). *Keep a history of changes* off: no log, no names or times on steps, no fit history, no record of the original data, History does not open by itself; errors are still logged (in the browser and the project's log) and listed in Preferences with Copy and Clear. *Clear this project's history…* |
| Only a worksheet at the start; a graph only when I choose to plot | A new project, and an import, show the worksheet alone across the desk; the status bar and the import's message say how to plot. A file dropped on the window is still plotted (the drop is the choice) |
| Remove the built-in Python | No Python window, menu item, button or worker. A project made with it keeps each Python step as a stored result that replays its output |

**Measured effect.** Task re-runs (`tools/ux/tasks.py`, 1366 × 768; logs
`evidence/logs/slices/round6-*`): T2, T5, T6, T8, T9, T10 and T12 take exactly what they took
after slice 5. **T1 takes 11 clicks instead of 7**: typed data no longer makes a graph, so the
path selects columns A and B and chooses Plot › Symbols. That is the cost of plotting being the
user's choice, as asked; the status bar names the step.

**Checks.** The unit tests (fit 243, pipe 125, parser 148, tex 25), contrast (189), odd-test
(51; its test helper now plots its column, since a new project has no graph), sheet-fuzz seeds 1
and 2 (117 steps each, no failures), menucheck (the spec gains Preferences… and Data › Hide and
show), terms (0), every Help article rendering with every link resolving, and the slices'
drives (44, 10, 43 and 48 checks) with their expectations brought up to this round: no graph on
a first visit or after an import, no Python, the Original / Processed switches only after a
step.

**Afterwards: the first graph can be deleted.** Its menu said "The first graph cannot be deleted"
(the graph's ⋯, the Project Explorer, a figure's panel menu, and no button in its History box).
Now *Delete this graph* works on it as on any other: its curves and its own labels go, the
other graphs' labels and the peak sets stay, it leaves a figure it was a panel of, and it is
left out of Window › Graphs, the taskbar, the Explorer, the History and the exports until the
next plot uses it again. Its columns stay; Undo brings it back; with no graph left the
worksheet takes the whole desk. Checked: deleting with one graph, with two (the other comes
forward, keeps its labels), as a figure's panel, undo and redo, plotting again; odd-test (51),
sheet-fuzz seed 1, menucheck and the drives (44, 43) pass.

**Then: nothing of a deleted first graph passes to the next.** The next plot reuses the deleted
first graph's place, and two things still named it: a comment on its History box sat on the
new graph's box, and the Explorer folder it was in took the new graph. The first graph now takes
a new generation when it is deleted; its History box is keyed by it, so the old comments read
"(since removed)" in the Discussion window and come back with Undo, and its folder, zoom and
History selection are cleared. odd-test deletes it with a comment and a folder, plots again and
checks that neither passed over and that Undo gives both back (55 checks; the new ones fail on
the previous commit).

## The curve fit, slice 1: fit control (2026-10-21)

From `ux/spec/FIT_SPEC.md`, the user's request to replicate Origin's fitting dialogs.

- **Fit control** in the Fit window: the method (Levenberg–Marquardt, or orthogonal distance
  regression with the X errors), *Iterations, at most* (400) and *Tolerance* (1e-12), back to
  the defaults in one click. Each fit keeps what it ran with; Results, the report's Method and
  the CSV say it; a fit stopped by its limit says so in Results, with how to carry on. Fits of
  every column run with the template's control.
- **1 iteration**: one step from the starting values, which it replaces; undone like any
  change; no fit saved.
- **Iterations**: the starting values and every step (reduced χ², λ, the parameters), steps
  taken one at a time following Fit's own path; a note on how the run ended.
- **Stop**: a long fit runs in slices of about 80 ms, listing its steps as it goes; Stop makes
  its last values the starting values and saves nothing.
- **The starting values on the graph**: dashed, "estimate" in the legend, while the Fit window
  is open, until they are the fit.
- *Remove fit* moved into the fit's summary, so the footer keeps to one row in the dock.

Checked: fit-test 252 (9 new: the limit, the tolerance, one step equal to a fit's first, steps
one at a time and slices ending exactly where one fit does, orthogonal distance's limit),
odd-test 58 (2 new), a drive of every new control (26, Stop and its undo included), the
slices' drives (44, 10, 43, 48), contrast 189, menucheck, terms 0, the help's 70 articles,
sheet-fuzz seed 4; screenshots at 1024, 1366 and 1440 (dark) and 390 px.

## Graphs as one list (2026-10-22)

From the user's bug reports, before the curve fit's slice 2.
- **No graph until something is plotted**: a new project, an import and a paste make none; the
  worksheet has the desk. Examples still open plotted.
- **The first graph is a graph like the others**: deleted from the project (not emptied and
  hidden), with an id of its own; there is no fixed graph window, and nothing reuses an id.
- **Annotations** are a list of their own, each tagged with its graph.
- **Older projects move over** when opened (document version 5): the first graph keeps what it
  showed but for the columns with graphs of their own, which it used to draw as well (two
  curves meant to be apart, drawn together); its labels, figure place, Explorer folder and the
  comments on its History box follow it.
- **Turning a curve off**: the analysed curve taken off a graph of two leaves that graph in front
  (it used to jump to another graph); a graph's last curve stays, with Delete the graph offered.
- **Closed graphs**: closing the graph in front brings an open one forward; a column shown with
  every graph closed gets a graph of its own, not a place on a closed graph.
- **"Not plotted"** over a column means on no graph.

Checked: odd-test 65 (a new block, Graphs come and go: 10 checks), a smoke drive (17), an upgrade
drive of four old projects (13: a first graph with no list, one deleted, one a panel, one beside
graphs of every column; an old form read twice), a drive of combining, figures, duplicating,
copying in and the History's boxes (15), the slices' drives (44, 10, 43, 48) and slice 1's (26),
contrast 189 (now measured with transitions off: one run in five caught a colour mid-change),
menucheck, terms 0, the help's articles, sheet-fuzz; screenshots at 1440, 1024 and 390 px in
both themes.

## Curve fit, slice 2: one parameter grid (2026-10-22)

`ux/spec/FIT_SPEC.md` slice 2.
- **One grid** in the Fit window: each parameter with its unit and what it means (also in
  Results), Start and Fix, Lowest and Highest, Fitted ± error, the 95% interval, Dependency and
  Digits. In the dock one view at a time (Starting values, Limits, Results), the fitted value
  beside the starts too; in a wider window every column.
- **Limits for every model**: typed, the function's own (its placeholder), or none; each
  "or equal" (≤) or strict (<, the fit stays just inside it). A parameter that reaches one is
  at its limit, with no standard error. Equal limits hold a parameter there; crossed ones are
  refused in words. A start outside its limits is marked and the fit begins at the nearest.
- **Kept with the fit**: Results' Limits row, the report's Method and the CSV state them; fits
  of every column, one by one or together, run within the template's.
- **Digits** per parameter: the grid, Results and the report show the value with them; the
  CSV and the copied table keep every digit.
- **A fix to the fitter**: a limit that binds used to leave the other parameters crawling
  along it (a decay held at τ ≥ 2 ran all 400 iterations, short of the minimum; orthogonal
  distance all 300). A parameter on its limit that a step would push past now sits that step
  out, and the fit settles in a few iterations where the same fit with it fixed there does.
  Fits without a binding limit take exactly the path they took before.

Checked: fit-test (17 on limits: typed over the model's own, strict, equal, crossed, fixed,
binding and not, a start outside, and a binding limit settling quickly in both fitters),
odd-test (4: a strict limit at the start, every parameter held, crossed limits and junk from
storage), a drive of the grid (31), screenshots in the dock, wide, dark and at 390 px, and
every suite from the round before (drive5b now scrolls to the Residuals switch, which the
taller grid moved below the fold; the Fit window's scroller stops what it brings into view
above its sticky footer).

## Curve fit, slice 4: the confidence level, ANOVA and residual analysis (2026-10-22)

`ux/spec/FIT_SPEC.md` slice 4.
- **A confidence level** for every fit (90, 95, 99, 99.9% or any typed), in both Fit windows: the
  parameters' intervals (the grid, Results, the copied table, the report, the CSV), the confidence
  and prediction bands and the outlier limit are at it; the fit on screen takes it at once; fits of
  every column take the template's. t for any level is exact now (it was an expansion good to 10⁻³).
- **Analysis of variance** in Results, as Origin's: the model, the residual, the totals about zero
  and about the mean; F and its probability (weighted fits weighted).
- **Correlation and covariance** of the free parameters, a correlation above 0.95 marked.
- **Residuals** regular, standardised, studentised (each point's leverage from the Jacobian) or
  studentised deleted: under the graph against X, and in Results against X, the fitted value, the
  order recorded, as a histogram with its normal curve, on probability paper with its line, or
  against the residual before.
- **Outliers**: past a Bonferroni t limit on the studentised deleted residual at the fit's level;
  ringed, listed with their leverage, named in the notes and the report, and masked in one step.
- **In the report, the copied table and the CSV**: the level, the ANOVA, the correlation, the
  residuals' chart (the report) and the outliers.
- A peak fit of thousands of points works its analysis out only when asked (a third of a second
  for 4000 points and eight Voigt peaks).

Checked: fit-test (19: t against the tables, F's closed form, a straight line's leverage, the
deleted residual against refitting without each point, a fixed parameter, weights, a curve's
leverages, a planted outlier found and clean data rarely flagged in 200 sets, the ANOVA's sums,
the correlation matrix), odd-test (7: a level or a kind of residual that is junk from storage, a
fit from before, every parameter fixed, two points), a drive (32: the level and its undo, Other…,
a refusal, Results' three parts, every kind in every view without NaN, the limit and the ring on
the graph and in the chart, the copied table, the CSV and the report, Mask it, undo, fitting
again), a timing of a large peak fit, screenshots, and every suite from the round before. The
worksheet fuzzer's seed 9 fails when three runs share the machine, on the version before this one
too (a value typed just after leaving a cell whose text was not a number, or a double click, is
lost), and is clean alone: a timing issue in the worksheet, not this slice's, left for its own round.

## Curve fit, slice 3: more models, found easily (2026-10-22)

`ux/spec/FIT_SPEC.md` slice 3.
- **25 models in six kinds**: lines and polynomials (a straight line; a polynomial of order 2 to
  9, its order chosen beside the model), growth and decay (exponential decay with one, two or
  three terms, growth, rise to a plateau), steps and saturation (Boltzmann, logistic,
  dose–response, Hill, Gompertz, Michaelis–Menten), peaks (Gaussian, Lorentzian, Voigt,
  pseudo-Voigt, Pearson VII, log-normal, extreme value), powers and logarithms (power law,
  logarithm, Arrhenius) and waves (sine, damped sine). Each parameter has its meaning and unit;
  each model guesses its starting values from the data (a straight line through the logarithms,
  the step's levels and width, a grid of decay times, the strongest period); many give derived
  values with errors (half-lives, FWHM and area, the dose halfway, an activation energy in
  kJ/mol and eV, a frequency).
- **The picker**: the model is a button with the model's sketch that opens a list by kind, each
  model with its sketch and formula; typing searches names, formulas, what the parameters mean
  and other names (Origin's included); the keys move and choose; your functions and the
  browser's library follow, and New function… is at the foot.
- **X a model cannot take** (a logarithm of x at 0) is refused in words before fitting, in a
  fit of every column too.
- **Stored fits keep working**: the ids shipped before are unchanged (`poly2` is the polynomial
  of order 2), and the models are a block of their own (`==MODELS==`), tested under node.

Checked: fit-test (18 on models: every model recovered from its own guess at 0.01% and 2% noise
within five standard errors, derived values against their definitions, a wave of 1.3 cycles, a
peak leaning left, the X checks, the ids shipped before), a drive of the picker (42: opening,
the kinds, search by name, Origin's name, purpose and parameter, the keys, undo, the order,
refusing X, Arrhenius and a sine fitted from the window, every guess finite, the help, a phone
screen), odd-test's Models block (8: a fit stored as `poly2` before, a model that is gone, every
guess on X through 0, X refused alone and in a fit of every column, a function that does not
compile, a search of brackets), screenshots in light, dark and at 390 px, and every suite from
the round before (drive4b now scrolls to the Residuals switch, which the straight line's longer
meanings moved under the Fit window's footer).

## Sheets (2026-10-22)

From the user's question, "why not several worksheets?".
- **Sheets, as a workbook has**: tabs under the grid (a click shows a sheet, a double click or
  F2 renames it, the right-click menu moves or deletes it, + adds one), Data › Sheets, and a row
  per sheet in the Project Explorer.
- **A sheet's own**: columns lettered from A, rows, X columns (a Y is plotted against the nearest
  X to its left on its sheet), formulas' letters, sort, hidden rows and selection.
- **The project's**: graphs (any sheet's columns), the processing, fits, and the original data's
  check code.
- **Moving columns to another sheet** (the column menu's Move › To another sheet, or a new
  sheet): with their error bars, each keeping the X it is plotted against; noted in the
  original-data record.
- **Bringing data in**: beside data, a file imported (the dialog's default, Add them on a new
  sheet), files dropped and columns copied from another project go on a sheet of their own,
  named after them; into the sheet shown when it is empty.
- **Words**: the worksheet's two views are the Original and Processed views.
- **A fix the random user found** (seed 9, on the version before too): a value being typed in a
  cell that was then scrolled far away was entered at once, so Esc afterwards kept it. The edit
  now waits while its cell is out of view, as a spreadsheet's does: Esc cancels it, Enter, Tab
  and the arrows enter it, typing brings the cell back, and leaving the grid enters it.

Checked: a drive of the sheets (19: tabs, paste, X per sheet, formulas, rename, move with the
X kept, undo, hidden rows, the Explorer, import on a new sheet, delete and undo, reload, plot),
odd-test's Sheets block (7: a project from before sheets, broken stored sheets, a sheet moved
first, hidden rows per sheet, the last sheet kept), and every suite from the round before.


## Two worksheet bugs the random user found (2026-10-23)

The worksheet fuzzer's seed 9 failed only when three runs shared the machine, and was put down
to load. It was not timing: running several at once changed what the random user had in view,
and so where it clicked.
- **A double click on a cell half out of view edited another place.** The first press scrolls a
  cell cut by the view's edges into view, as Excel's does; the second press, at the same spot on
  the screen, was then over a different part of the cell. With the cell cut by both the bottom
  and the right edge, that part was the fill handle: a double click meant to edit one value
  filled the column down over recorded values (233 cells in the test). The second press now
  acts on the cell the first pressed.
- **Typing after restoring the worksheet went nowhere.** Minimised, the worksheet lost the
  keyboard focus to the page, and restoring it from its taskbar button did not give it back. A
  window brought forward from its taskbar button or the Window menu now takes the keys: the
  worksheet's active cell takes what is typed next.
- The fill handle shows again as soon as Esc leaves a cell (it waited for the next redraw).
- **The fuzzer** aims as a person does: at a worksheet whose window, scroll and place on the
  page have held still for 150 ms. It had clicked cells measured while the window grew out of its
  taskbar button, or while a wheel's smooth scroll (of the grid, or of the page below 860 px) was
  still running, and landed up to 136 rows away. It restores the worksheet from its taskbar button half the
  time, and checks that a click on a cell gives the grid the keys and that a double click opens
  the cell aimed at. Backspace on a selected cell clears it, as Delete does, so Esc afterwards has
  nothing to give back. `SLOW=n` runs the page n times slower.

Checked: odd-test (5 new: a cell cut by both edges of the view double-clicked, which opens that
cell and fills nothing, where before it filled 233 cells; typing into it; typing at once after a
restore from the taskbar, which before went to the page), the fuzzer on seeds 1 to 24 three at a
time (and 1 to 8 three times slower), all clean, and every suite from the round before.

## The user's issues from before 19.10 (2026-10-23)

Eight points, asked to be fixed before the fit's slice 5. Each, what changed:

- **"Why is there no setting to choose if I want a shading on the fitted curve or not?"** The
  Fit window has an *On the graph* group: the residuals under the graph, the confidence band
  (shaded), the prediction band (dashed) and, for a peak fit, each fitted peak shaded. The
  Graph menu has the same switches.
- **Graph quick tools: a data point finder and X–Y lines.** The *Reader* rings the plotted point
  nearest the pointer and pins it on a click; a card on the graph gives its curve, row, X and Y,
  steps along the curve (←/→) and between curves (↑/↓), and finds the nearest point to a typed
  X or Y. The *X–Y lines* are a vertical and a horizontal line dragged across the graph; the
  card gives every curve's Y at the vertical line and where each curve crosses the horizontal
  one, with either line alone if chosen.
- **"A separate menu for the graph tools … not there when I am using the worksheet."** A Graph
  menu after Plot, and the toolbar's graph group, shown only while a graph is on the desk.
- **The edge-by-edge choices were far too wide.** They keep their own width now, beside a
  picture of the frame that keeps its size.
- **Text settings for every kind of text were confusing.** The Text and fonts page has the
  graph's font and size, then a folding line per kind of text saying how it looks now (font,
  size, bold, italic, *its own*); open one to change it, and it stays open across redraws.
- **"Don't use sliders everywhere."** 26 sliders (line sample, row spacing, widths, lengths,
  offsets, sizes, levels…) became fields with a list, as Excel's font size box: typed, picked,
  or stepped through with ↑/↓, and clamped. Opacity and fill stay sliders. The list opens on the
  value it holds.
- **"Either LaTeX or natural language … for natural language no renderer."** Every text field
  (titles, the legend, labels, line text, a peak's name, the second axes' units) types either
  way, switched by its *LaTeX* button or in Preferences, kept per browser. Formatted, the
  default: the field shows the text as Word does, raised and lowered characters (x², x₂,
  Ctrl+Shift+= and Ctrl+=) and symbols as themselves, and no preview. LaTeX: the source with its
  preview, as before. The symbols are about 240 in eleven kinds, searched by name. Both store the
  same text (LaTeX), so nothing migrates and exports are unchanged; a text a word processor
  cannot show (maths, fractions, roots) stays in LaTeX and says so.
- **"Some toggles don't have smooth transitions … boxes placed at weird locations."** A switch or
  a segmented choice keeps its slide or fade through the redraw it causes. Boxes were put in
  their rows: a text bar is a row labelled Font, a lone link became a link in its row, Add sits
  in its list's heading, and the fit's range, which showed "1(" for 1550 in the dock, wraps.

Checked: `tools/tex-test.mjs` (10 new: the conversion both ways draws the same, what stays LaTeX,
escapes, placeholders, a sub- then a superscript, lines, symbols), new drives of the Format
dialog (19), the transitions (4), formatted and LaTeX typing in the dialog, on the graph and in
the line dialog (29), the readers (18), and every suite from the rounds before.

## The user's review: one formula row, insert, Plot setup, large data (2026-10-23)

Four points. Each, what changed:

- **"You either have the function row visible from the start, or use the Excel per-cell version,
  not both."** The user chose the row: F(x)= is always under Long Name and Units (the corner's ⋯
  lists it ticked and fixed). A value typed into a cell starting with `=` still works; it moves
  to the F(x)= row, still being typed.
- **"Where is insert new row and column?"** Where Excel has them. A cell's right-click menu has
  *Insert* (Row above, Row below, Column to the left, Column to the right, A column at the end,
  A sheet) and *Delete* (Rows…, Columns…); a column's menu has *Insert a column to the left /
  right* and *Delete*; Edit has Insert and Delete; the bar's "+ Column" became **Insert**, with
  the same list; Ctrl+Shift+= inserts and Ctrl+− deletes (columns when whole columns are
  selected, else rows). As many as are selected, one undo step each, in the original-data
  record. Before, rows were only in the cell menu and columns only at the end.
- **"Why is the plot setup so primitive … the range, which axis is the error axis … look into it
  very thoroughly, then create a new plan."** Origin's Plot Setup (its Available Data, Plot
  Designations and Plot List panels, the Range dialog by index or by X with Rescale) and Layer
  Contents were compared with Kurve's, part by part, and the plan is
  [`spec/PLOT_SPEC.md`](spec/PLOT_SPEC.md): the gap table, six decisions (what a column is stays
  the column's; what a curve uses on one graph is the graph's, `curveUse`; a range is the graph's,
  not the data's; each curve on its axis; a modal dialog with the real graph as its preview;
  Kurve's words) and six slices. Nothing of it is built yet: it is the roadmap's second item.
- **"The app struggles with plotting more than 50k datapoints."** Measured, then fixed where the
  time went:

  | At 200 000 points | Before | After |
  |---|---|---|
  | Drawing the graph | 173 ms | 37 ms |
  | Longest path on screen | 2.7 MB | 0.18 MB |
  | Ten turns of the wheel | 9.3 s | 1.3 s |
  | Twenty steps of a pan | 14 s | 1.8 s |
  | Twenty pointer moves with the Reader | 154 ms | 17 ms |
  | Smoothing (a new step's checks) | 4.6 s | 0.27 s |
  | A redraw with a fit and its residuals | about 200 ms | about 115 ms |
  | The worksheet's redraw | 109 ms | 56 ms |
  | Opening the Peaks window (finding the peaks) | 14 s | 1.3 s |
  | Opening Statistics | 1.9 s | 0.6 s |

  The graph is drawn as the screen can show it (per column of pixels, the first, lowest,
  highest and last point of a line; one symbol per half-pixel spot; error bars merged where they
  overlap), compared pixel by pixel with the full drawing; exports draw every point. Where each
  point is on the screen, the mask, the fit's points and residuals are worked out once per
  drawing rather than per frame or per pointer move. Three quadratic steps became linear (the spike check, a model's suggestion, and the peak
  finder's duplicate candidates, compared pairwise), the Overview's background is worked out only
  when the Overview is read, and the
  Fit window is no longer re-guessed after a zoom while it is closed. Columns past about 120 000
  values had thrown "Maximum call stack size exceeded" in the Fit and Peaks windows and the
  statistics (an array spread into `Math.min`); nothing spreads a column now. Still a limit:
  this browser's storage holds a few megabytes, so three columns of 200 000 rows say Not saved.

Checked: every unit suite, a new large-data drive (16 checks: each plot type and both kinds of
error bars against the full drawing, a zoom, a fit with residuals, the export, the Reader and
the X–Y lines), six new checks in `tools/odd-test.mjs` (104 pass), and the random user over six
seeds, whose two failures this round were its own (a stillness clock left running from before a
wheel, and a correction's reason typed as a cell's value) and are fixed in the harness.

## The design system into the app, slice 1: the frame and the rules (2026-10-26)

The user pointed at the Kurve design system (a claude.ai Design System artifact made from this
repository, reviewed on 25 October) and chose to bring the app up to it. Every difference, the
decisions and ten slices are [`spec/DS_SPEC.md`](spec/DS_SPEC.md). Slice 1:

- **The taskbar** as the system draws it: the project switcher first, a white field with a
  folder and a chevron; the windows flat on the chrome; the front one a raised white key with an
  accent bar, open ones a short grey bar, minimised ones none; Tile and Cascade in a tray. 42 px.
- **The dock** a strip the docked window hangs from: *Tools*, the windows not shown as icons
  (named by their tooltip), the shown one a raised tab with its name and ×; the docked window's
  own title bar gives way, Help, Undock and Hide on the strip.
- **The project name** a field in the title bar; **windows** rounded to 12 px (9 in Graphite);
  **fields** as wide as what they hold (text 12em, numbers 7em, lists their choices').
- **Tooltips** name the thing and its shortcut (toolbar, title bar, window buttons, taskbar,
  dock): "Zoom", "Import (Ctrl+O)", "Help (F1)".
- **No internal identifiers**: the worksheet's foot says "81 rows · 3 columns" instead of
  "sha256 fb44fe9c436a"; the status bar says "Saved" instead of "Saved in this browser".
- **Real superscripts**: cm⁻¹, R², x₀ are set as `<sup>`/`<sub>` in every window, typeset as
  scripts on the graph, and written as HTML's in the report; fields, lists and code keep the
  characters as typed.

Checked by the new `tools/ds-test.mjs` (27 checks), and the unit, contrast, odd and fuzz tests.

## The design system into the app, slice 2: menus in the order of the work (2026-10-28)

The system's menu bar follows the stage of work; the app's had three menus by subject
(Analysis, Statistics, Spectroscopy) and a Graph menu that came and went with the graph.

- **The bar**: File, Edit, Data, Plot, Analyze, Figure, Publish, Window, Help. The graph
  window's own bar repeats Data, Plot, Analyze and Figure.
- **Data** prepares: the worksheet, Clean, a new **Baseline** submenu (*Subtract baseline…*,
  the old Subtract background, and *Linear detrend…*, the same step on a straight line) and
  **Transform** (scale, normalize, logarithm, X, another column, averaging).
- **Plot** makes graphs and looks at them: **View** holds Zoom, Pan, the Reader, the X–Y lines
  and Show all the data; *Show on the graph* moved here from Data.
- **Analyze** measures: Fit (with the switches for residuals, bands and peak shading), Peaks…
  (the old Find peaks…), Integrate…, Signal processing, Calculus, Statistics and
  **Spectroscopy** as submenus, Results, Batch results.
- **Figure** is the graph's look: Format, saved styles, axes (Log Y beside Reverse X), font,
  legend, annotations (the Graph menu's Label, Arrow, Shape and Comment). Greyed, not hidden,
  with no graph, so the bar keeps its shape.
- **Publish** is what leaves Kurve: every export, the report, Copy the graph as a picture and
  Copy the results table (out of File › Export and Edit).
- Help's menu paths follow; `ux/spec/menus-after.txt` is the new tree.

Every item kept a home: the crawl before and after compared leaf by leaf, `menucheck.py` with
nothing missing either way, the glossary count at 0. `tools/ds-test.mjs` has 18 new checks (45).

## The design system into the app, slice 3: Find a command (2026-10-28)

- **Ctrl+K** (or Help › Find a command…) opens the system's command palette over the desk: a
  search box and every command of the menu bar (about 250), found by its name, the menu it is in,
  or a word people use for it (*background*, *detrend* → Subtract baseline… and Linear detrend…;
  *fourier*, *power spectrum* → FFT filter…; *export* → the Publish menu; *cosmic ray* → Remove
  cosmic-ray spikes…), grouped by menu with each one's path, the words typed in bold and the word
  that matched named. ↑/↓ move, Enter runs, Escape or Ctrl+K closes.
- A command that cannot apply now is listed dimmed and passed over, not hidden. With nothing
  typed: the commands run last, else six places to start.
- A fix from slice 1: a superscript set into a flex label (the Fit window's "1/σ²") had become an
  item of its own with the label's gap around it.

`tools/ds-test.mjs` has 18 new checks (63); the glossary count skips the palette's list of words
people type (`CMDK_SYN`).

## The design system into the app, slice 4: what is selected has its menu in the graph's bar (2026-10-28)

- **A click selects** a curve, the fit's curve (it could not be clicked before), an axis by its
  numbers, a band, a shaded range, an annotation or the legend; a right-click selects what it is
  on. What is selected is outlined on the graph: a glow in the focus colour on a curve or the fit,
  a dashed box round an axis's numbers.
- **Its menu appears at the end of the graph's own bar** as the system's contextual button:
  *Curve*, *Fit*, *Axis*, *Region*, *Text*, *Legend*…, the same items as its right-click menu.
  A whole column selected in the worksheet does the same for its curve (*Column*). A click on
  nothing, or Esc, lets go; Shift+F10 opens the menu.
- **New commands where the menus lacked them**: the fit's curve has Show residuals, Results,
  Copy the results table, Fit window and Remove fit; a band and a shaded range have Zoom to it,
  Fit in this range and (for a shaded range) Integrate it; a band its baseline, Divide the others
  by it and Remove the band, from the graph.
- The button's words are ink on the accent fill with an accent bar: the system's accent words on
  that fill measured 5:1, and words here take 7:1 (`tools/contrast-test.mjs` checks it now).

`tools/ds-test.mjs` has 17 new checks (80).

## The design system into the app, slice 5: the Format pane (2026-10-28)

- **The Format dialog is now the Format pane**, a tool window in the dock beside the graph (the
  system's FormatPane), not a dialog over the desk: the graph can be clicked, zoomed and read
  while it is open.
- **Live, with no OK or Cancel.** Every change shows on the graph at once and is kept; a burst of
  changes is one undo step (Ctrl+Z takes it back), and a burst still running is saved before an
  undo, another graph, another project, the pane closed or the page left.
- **Selected**, at its top, chooses what it sets (each curve and the fit, each axis, each part of
  the graph); a click on the graph chooses it too: the pane turns to the curve, the fit, the axis,
  the annotation or the legend selected.
- Defaults, Saved styles (applied at once, with Undo) and Use on every graph at its foot.
- A number being typed stays in its field through a redraw from a save.

`tools/ds-test.mjs` has 14 new checks (95); the UX scripts that closed the dialog close the pane.

## The design system into the app, slice 6: the status bar answers questions (2026-10-28)

- **The status bar's readout gives the numbers of what is selected** while the pointer is off the
  graph, as Excel's does: cells selected in the worksheet (*B1:B9 · N 9 · Mean · SD · Min · Max*),
  a curve selected on the graph (the same, of its processed data), a band or a shaded range
  (*Area* with its error, *Peak at*, *FWHM*, *Span*). On the graph it still reads the pointer.
- **The same numbers as the windows that have them**: the Statistics window's for cells and
  curves (it now lists the cells selected as a row of its own and marks the selected curve), the
  Integrate window's for a band, each to the same digits.

`tools/ds-test.mjs` has 7 new checks (102).

## The design system into the app, slice 7: the Fit window and Results (2026-10-29)

- **The Fit window as the system's FitPanel**: the range is its fields, *From view*, *All* and a
  readout of its points (*81 points*); the suggestion is *Suggested:* and the model as a button,
  its reason the tooltip; the grid has *Fitted* and *Error* in columns of their own; the *On the
  graph* switches have short names (*Residuals*, *Confidence band*, *Prediction band*).
- **In the results**: switches chosen before the fit for what Results reports (confidence
  intervals, analysis of variance, correlation matrix, covariance matrix, residual analysis; a
  peak fit adds every parameter), kept per browser. The report, the copied table and the CSV
  carry all of it whatever is chosen.
- **Footers of buttons only**: the line saying how the fit is weighted went (the switch, *Weight
  by Y error*, names the column in its tooltip), and so did *Fit every column…* (Analyze › Fit
  and the Batch window have it); a peak fit's *Remove fit* joined the fit's summary.
- **Results as journals print it**: *Value* and *Standard error* in columns of their own, derived
  quantities under a *Derived* row, the residuals' scatter and the outlier limit in the
  statistics beside the table, the sections chosen open instead of folded, no paragraph at the
  foot. In a narrow Results a parameter's meaning goes under its name, so the error stays in view.
- **Notes of one line with their fix**: the number first, the fix a button at the end (*Mask*,
  *Fit again*, *Guess*, *Fit control*, *Limits*, *Show residuals*, *History*, *Go to its column*,
  *Fit window*), the whole text the tooltip and the report's. The Peaks window's and the
  History's out-of-date peaks offer *Search again* and *Peaks window*, the Fit window with no
  data *Import…*.

`tools/ds-test.mjs` has 18 new checks (120).

## The design system into the app, slice 8: dialogs and windows (2026-10-29)

- **Import**: the settings Kurve detected are tinted, with a *Detected* key, instead of
  "detected Semicolon" beside each; a setting chosen by hand offers *Auto*. *Put it in* offers
  New sheet, Add to Sheet 1, New project, the project's name beside it and both X ranges as a
  readout when they do not overlap. *Replace everything in this project* left the dialog for
  File › Replace the data…, which asks first. The rows are counted beside *Columns*; the footer
  is Cancel and Import.
- **Export figure**: the pixel size (and the tick numbers' size when they are as on the graph)
  in read-only fields, what each format is for in its tooltip, no paragraphs; Cancel and Export
  alone in the footer.
- **Preferences**: History, Appearance (Light, Dark, System; Bench, Graphite; Animations),
  Typing text, After an import, Errors; each switch's explanation its tooltip; Done alone.
- **Tool windows**: *Input* (Original data, After smooth…) where *Position* was.
- **Peaks**: Search, Range (All, + View, + Select on graph), Settings (Method, Keep if,
  Threshold, Noise, Log scale, Direction, Smoothing, Min width, Min spacing, Max peaks,
  Auto-update, Defaults), Find, Add peak, Rejected, Identify, Mark, Label; the footer Done,
  Fit…, Integrate, Labels… on one row in the dock. *Rejected* in the Fit window's finder too.
- **The empty desk**: *Import data*, one line, Import… and the examples, over an empty
  worksheet until the grid is pressed or typed in; the empty graph says the same.

`tools/ds-test.mjs` has 16 new checks (136).

## The design system into the app, slice 9: galleries drawn with the data (2026-10-29)

- **Plot setup**: each kind of plot is a card drawn with the columns ticked (line, symbols,
  columns, areas, steps, sticks, panels, offsets, two axes, a heat map's rows, boxes, violins, a
  histogram), and the sketch shows a card's kind while the pointer or the focus is on it.
- **Colour schemes** (the Format pane's Layout and colours page): a card per scheme drawn with
  the graph's own curves; the graph shows a scheme while its card is hovered or focused, and a
  click chooses it.
- **Saved styles** (the Format pane's button): a gallery of the graph drawn in each style, by
  group (Kurve's, the project's, this browser's); hovering one shows it on the graph, a click
  applies it, Escape puts the graph back, More… is the menu with save, rename and delete.

`tools/ds-test.mjs` has 9 new checks (145).

## Closing the gap with Origin, wave 2, slice 2.8: nonparametric tests (2026-11-12)

- **Analyze › Statistics › Nonparametric**: Mann–Whitney (U, the Hodges–Lehmann shift with its
  interval, rank-biserial r), Wilcoxon signed-rank (one sample or paired, Wilcoxon's or Pratt's
  zeros, the pseudo-median), the sign test, Kruskal–Wallis with Dunn's comparisons, Friedman with
  Kendall's W, Mood's median test, two-sample Kolmogorov–Smirnov.
- p exact while small and untied (as R), else the normal approximation, ties and continuity
  corrected; the dialog can force either.

Checked: `fixtures/np.json` (62), the fuzzer (four new generators), stats-test (8 new), ana-drive
(11 new, 104), perf (one new line), the suite.

## Closing the gap with Origin, wave 2, slice 2.4: one-way ANOVA (2026-11-12)

- **Analyze › Statistics › ANOVA › One-way ANOVA…**: groups as columns, or one column grouped by
  another. The table (between, within, total), η² and ω², Welch's F if asked, each group's mean with
  its interval, and comparisons: Tukey–Kramer, Bonferroni, Holm, Šidák, Scheffé, Fisher's LSD,
  Games–Howell, Dunnett against a control. *Means plot* under the report.
- The studentized range and Dunnett's many-to-one t, to about 1e-15 against 40-digit references
  (SciPy's studentized range is off by up to 5e-13; its Dunnett is randomised).
- NIST's ANOVA sets: 2e-16 from the exact answer for the doubles their decimals parse to.
- Report tables of one row are shown as names and values; headers wrap.

Checked: `fixtures/anova.json` (58), `range.json` (40 digits), the fuzzer, stats-test (13 new),
ana-drive (13 new, 92), perf (2 new lines), the suite.

## Numbers, not verdicts (2026-11-12)

The user's rule: the software reports, the user judges. Recorded once (STATS_SPEC decision 9,
UX_SPEC §3.8, DESIGN principle 8) for every slice after.

- Gone from Normality tests, Outliers, t tests, Comparing spreads, Proportions and Fisher's test:
  the opening sentence, the verdict columns (*not normal*, *may be normal*, *differs*, *unequal*,
  *Outlier*), the assumption checks and their *Use Welch's t* button, and notes of advice.
- A level is asked only where it changes a number: an interval (95 % by default) for the t tests,
  proportions, Fisher's test and the F ratio; α for the outlier tests' critical value. An analysis
  stored with α reads one minus it as its interval.
- Outliers' *Mask* and *Mark* take the values past the critical value. Method lines shortened;
  Help's article trimmed to what each number is.

ana-drive: 79 checks.

## Closing the gap with Origin, wave 2, slice 2.3: comparing means and spreads (2026-11-12)

- **Hypothesis tests** (Analyze › Statistics): **t tests** (one sample against a value; two
  samples, Welch's by default or Student's; paired), each with t, its degrees of freedom, p, the
  difference's interval, Cohen's d with its exact interval and Hedges' g; **Comparing spreads**
  (Levene about the medians or the means, Bartlett, F); **Proportions** (the exact binomial test
  with Clopper–Pearson's and Wilson's intervals; two proportions with Newcombe's) and **Fisher's
  exact test** (the conditional odds ratio and its exact interval), from counts typed.
- (A sentence, checks and a *Use Welch's t* button were removed the same day: see above.)
- The noncentral t distribution, for d's interval.

Checked: `fixtures/test23.json` (334 cases; the t tests in 40 digits), the fuzzer, stats-test (16
new, 98: each test's size under its null, the t and d intervals' coverage, the exact tests at or
below their level, Levene's about the means found 6 % at 5 % with small samples), ana-drive's 2.3
section (15, 80 in all), the menu crawl and the suite.

## Closing the gap with Origin, wave 2, slice 2.2: normality and outliers (2026-11-12)

- **Normality tests** (Analyze › Statistics › Descriptive): Shapiro–Wilk (Royston's, 3 to 5000
  values), Lilliefors (statsmodels' simulated table), Anderson–Darling, D'Agostino's K² and
  Kolmogorov–Smirnov, each column or group a row with each statistic, p and verdict, the first test's
  finding in a sentence; a **Q–Q plot** from the result (the sorted values against the normal
  quantiles, the line through their quartiles).
- **Outliers**: Grubbs (either side or one, once or repeated until none) or Dixon's Q (3 to 30
  values, its p and critical value worked out, not read from a table); **Mask the outliers** (one
  undo step, the analysis worked out again without them) and **Mark them on the graph**.
- **Kolmogorov's distribution, exact**: a histogram's distribution's Kolmogorov–Smirnov p was
  Kolmogorov's series, 3e-2 off at 20 values; it is now exact to 5e-15.

Checked: `fixtures/norm.json` (518 cases against 40-digit references; SciPy's Kolmogorov
distribution was found 5e-6 off past 140 values, statsmodels' A² and SciPy's K² 5e-7 off with values
near 10⁹; Kurve's are not), ref-test (20 new names, 55 in all), the fuzzer (six generators), stats-test
(13 new, 82: sizes at 5 % over 20 000 samples, Grubbs' published critical values, masking), ana-drive's
2.2 section (17, 65 in all), the menu crawl and the suite.

## Closing the gap with Origin, wave 2, slice 2.1: descriptive statistics, whole (2026-11-12)

- **Statistics on columns** (Analyze › Statistics › Descriptive) gives what Origin's does: N,
  missing, mean, SD, SE, the mean's interval at 90 to 99.9 %, variance, coefficient of variation,
  minimum, Q1, median, Q3, maximum, sum, range, IQR, MAD, robust SD, the mode and its count,
  skewness, kurtosis, geometric and harmonic means, and percentiles typed. The quartiles by any of
  R's nine types or Tukey's hinges (Kurve's own, type 7, unchanged), divided by n − 1 or n, over a
  range of rows, column by column or listwise; the report says the method and the divisor, and
  why a cell is empty.
- **Frequency counts**: numbers into bins (Freedman–Diaconis, Sturges, the square root, a number,
  a width from a start) or each value; text and categorical columns by their values, in the
  column's order; counts, running counts, percents.
- **Graphical summary**: a figure of the column's histogram with a normal curve over it and its
  box chart, one undo step.
- The Statistics window's item is *Quick statistics…*.
- Fixed on the way, each found against exact arithmetic: the mean's second pass made a cancelling
  mean worse (2.5e-14, now 2e-16); a MAD near 10¹³ was 2 % off (its distances measured from the
  rounded mean of the two middle values); values past 10³⁰⁰ took every statistic through a scaling
  that made a value near 10⁻³⁰⁰ subnormal (the quartiles lost their digits); two values near
  1.6e308 had an infinite median.

Checked: `tools/ref/fixtures/desc.json` (939 cases on fourteen sets against exact rationals; NumPy
agrees on all nine quantile types, SciPy was off on three sets where the exact answer was not),
ref-test's six new names, the fuzzer (`quantileType` and seven statistics, three seeds of 300–400
cases each), stats-test (12 new, 69: shift, scale, order, sign, every type within the values and
rising, one, two and equal values, the hinges), ana-drive's 2.1 section (15, 48 in all), the menu
crawl and the suite.

## The user's review: information hygiene, curves, a step on a new graph, calibration (2026-11-11)

- **Information hygiene** is a principle of the spec (`ux/UX_SPEC.md` §3.8, DESIGN.md principle 7):
  a working window shows what was asked for and what judges it; the rest is in the report, the
  History and the tooltips.
- **Results** in three columns (parameter, value, standard error): t and p, the interval and the
  dependency are switches under *In the results*, off until chosen, each a column. No second line
  of `t · Prob > |t| · 95% · dependency` under each parameter, peak or counted window; no red rows
  (the note says which parameter is tied to the others); no *Fitted by … at …*; beside the table
  only what judges the fit, and a setting only when it is not the usual one. The report, the copied
  table and the CSV keep everything. The counting table's verdict has a *Detected* column of its
  own, and a window wider than a line there a note in words.
- **The Project Explorer** lists the sheets, not the files and their columns (a file row counted 4
  and listed 3). Dragging a sheet onto a graph plots its Y columns.
- **The graph's Original / Processed / Both** and Plot › Show on the graph are gone: a graph shows
  the processed data, and a box selected in the History shows its stage with the chip's ✕ to go back.
- **Curves** on the graph's bar: each curve ticked while drawn, *Show only…*, *Show every curve*; a
  curve's right-click and its legend entry have *Hide this curve*, *Show only this curve*, *Show
  every curve*. Hiding the active curve makes a shown one active; the last one shown stays.
- **Show it on: This graph / A new graph** in every tool window: a new graph gets a new column made
  from this one with the step, the column itself untouched; one undo.
- **Data › Calibrate**: X on reference peaks (a parabola through three references or more, new),
  energy, scale X, Y by a reference's response.
- **Subtract another column** at a scale fitted so it cancels (with or without an offset, over a
  range or wherever both have values), the other column shifted along X, a data column allowed.
- Fixed: a dropped file threw (a name left from the Explorer's files).

Checked: pipe-test (11 new, 140: a fitted solvent scale, over a stretch, with an offset, shifted,
refusals; a parabola through three references, between them, a line's larger residuals, two asked
as a parabola), review-drive's 11.11 section (24: the Explorer's rows and count, no switch, the
stage chip, Curves, hide, undo, the active curve, the last one, show only and every, the curve's
menu, a step on a new graph and its undo, a data column subtracted with its fitted scale said,
Data › Calibrate, Results' three columns, no time, no packed lines), ds-test, odd-test, plot-drive,
fit-drive, text-drive, ana-drive, the menu crawl and the suite.

## Closing the gap with Origin, wave 0: the bench (2026-11-07)

The first wave of `ux/spec/PARITY_SPEC.md`, which ships nothing a user sees: what every later slice
is checked with.
- **Reference values** (`tools/ref/`): 850 cases made by 40-digit arithmetic (mpmath) for the special
  functions and the distributions' tails, and by SciPy, NumPy and statsmodels for the procedures
  (curve fits, orthogonal distance, distribution fits); NIST's certified data sets (Norris, and the
  ANOVA sets for wave 2). `tools/ref-test.mjs` (node alone) prints each function's worst error
  against its target; one short of it names the slice that brings it there and must not get worse.
- **A fuzzer** (`tools/ref/diff-fuzz.py`): thousands of random cases a second against the
  references, from a seed.
- **The compute worker**: the global fit's worker grown into one for every heavy job, which can
  also call any function of the pure blocks by its name, say how far it has got, and be stopped.
- **Speed budgets** (`tools/perf.mjs`) and **one command for the suite** (`tools/suite.sh`).

What the bench found at once, and what was fixed:
- `erf` lost every digit for a small argument (it was 1 − erfc: 7e-10 relative at 1e-8) and `erfc`
  lost five near 2.5; both are now Cody's rational approximations, to a few parts in 10¹⁶.
- The normal quantile (the probability scale) lost six digits near p = 1; it now works from the
  other tail, to 4e-16.
- SciPy itself was wrong where the bench first trusted it: its incomplete beta was 7e-3 off at
  a = 883 and gave 0 for values near 1e-290, and a quantile asked of it as (1 + level)/2 lost the
  tail's digits. The references for special functions are now 40-digit ones.

- **A change saved just before a reload could be lost** (found by the suite, reproduced with the
  processor slowed: a rename on a project of a million rows lost one time in four, two in four
  slowed): the page's last flush waited behind a write still reading, which then put the stored old
  name back. The flush now ends writes under way and keeps its books once it has completed: none
  lost in 24 tries at three speeds. odd-test's check repeats it eight times, slowed six times.

What it found, and left for the slice that owns it (each recorded in `tools/ref/targets.json`):
the incomplete beta behind every p value is good to 1e-9, not 1e-12 (slice 1.4), and t's quantile
at a million degrees of freedom to 1e-8; a straight line fitted by Levenberg–Marquardt meets NIST's
certified Norris values to 3e-8, not 1e-12 (slice 4.1, by QR); the Kolmogorov–Smirnov p beside a
histogram's distribution is an approximation off by up to 3 % (slice 2.2).

Checked: `tools/ref-test.mjs` (17 at their targets, 5 short with their slice named),
`tools/plot-drive.mjs` (6 new: the compute worker), `tools/odd-test.mjs` (the reload check made to
fail on the old code), `tools/perf.mjs` (10 within budget), the menu crawl (three items of earlier
rounds written into `ux/spec/menus-after.txt`).

## Closing the gap with Origin, wave 1, slices 1.3a to 1.3c: analyses and result sheets (2026-11-07)

`ux/spec/FOUNDATION_SPEC.md` 1.3a.
- **Statistics on columns** (Analyze › Statistics): the columns ticked, each a row of a sheet of its
  own (N, missing, mean, SD, SE of the mean, minimum, quartiles, median, maximum, sum), by group if a
  column of text or categories is chosen.
- **What it reads**: each column's processed values (its original ones when it has no steps), the
  steps named in the dialog with a switch to Original; masked points left out and counted; after a
  step that makes, averages or drops points, or makes neighbours depend on each other, the report
  says so.
- **The result sheet**: its tab has a lock, it is read only (typing says why, with Change
  settings…), its values are not original data. Worked out again by itself when what it reads
  changes, or only when asked (its tab then says it is out of date); its tab's menu has Report,
  Change settings…, Recalculate, Cut from its data and Delete the analysis….
- **Its report** (1.3b) in Results (a *Showing* list at its top: the fit or an analysis), with Copy,
  Show its sheet, Change settings… and Recalculate; a box in the History fed by its inputs, with its
  discussion; a section in the exported report.
- **Large ones beside the page** (1.3c): an analysis of 200 000 values or more is worked out by the
  compute worker, with Stop, the page going on meanwhile.

`tools/ana-drive.mjs` (32 checks) in the suite.

## Closing the gap with Origin, wave 1, slices 1.2a to 1.2d: text in the worksheet, kept by imports, categorical, read by graphs (2026-11-07)

`ux/spec/FOUNDATION_SPEC.md` 1.2a. A cell holds a number, text or nothing, in any column.
- **Typed**: what does not read as a number ("<LOD", "n/a", "1,2.3") is kept as text, said once a
  column with Undo; it used to be refused. In a column of numbers it is drawn left-aligned with a
  dotted underline and a tooltip.
- **Left out** of the graph, fits, processing, formulas and statistics, as an empty cell is; the
  status bar's numbers of selected cells say how many text cells they left out.
- **Cells hold** in the column menu: Numbers and text, Text only ("007" stays 007; numbers become
  their text), Numbers only (text refused; not while text is there, naming the rows).
- Sorting the view (numbers, then text in natural order, then empty), find, copy, clear, paste (a
  spreadsheet's block keeps its text cells), rows inserted and deleted, undo, two tabs, project
  files and reloads carry text. Text is part of the original data: hashed as a quoted field
  (RFC 4180), as the original-data CSV writes it; a project of numbers keeps its check code.
- Text from storage is cleaned: what is not text at a row that holds no number goes, a cell past
  10 000 characters is cut.

- **Imports keep text** (1.2b): a column of names or notes comes in as a text column, the words
  among numbers ("n/a", "<0.01") as text cells, a quoted name with a comma in it as one field; a
  line with a stray word inside a block of data no longer ends the block. The dialog's *Use* list
  has *Text (kept as written)*, for IDs like 007.
- **Categorical columns** (1.2c): the column menu's *Categorical…* lists a column's different values
  as its levels with their rows, in order as they first come, ascending, descending or by hand; the
  header says *cat*; the view sorts *By its categories*. More than 200 values are refused in words.
- **Graphs read text** (1.2d): labels from a column of names; box charts grouped by a text or
  categorical column, in its order; a categorical or text column as X, each point at its level's
  place and X named by them; Plot setup's *Group by*, a curve per value, named after it, the curves
  of one column a group stepping the colour (each a derived column with a *Category* step, which
  follows the column's cells).

`tools/text-drive.mjs` (60 checks) in the suite; the worksheet fuzzer types text too; parser-test
has six new cases (197).

## Closing the gap with Origin, wave 1, slice 1.4: the distributions (2026-11-07)

`ux/spec/FOUNDATION_SPEC.md` 1.4. Nothing new on screen; every p value, interval and test reads
its numbers from one new block, checked against 40-digit references.
- **ln Γ** from a series about 2 (ζ(k) − 1 as coefficients), the recurrence and Stirling's series:
  2e-16 (the old Numerical Recipes one was 4e-13). **ln B** keeps its digits for large arguments.
- **The incomplete beta** (behind t and F): 1.5e-13, where it was 1e-9; its leading factor in
  logarithms about the peak, and near x = 1 with a large first parameter Didonato and Morris's
  BGRAT, as TOMS 708 does. **The incomplete gamma** (χ², gamma, Poisson): 7e-14.
- **Nine distributions**, each with both tails (the upper computed as such) and quantiles: the
  normal, t, F, χ², gamma, beta, binomial, Poisson, hypergeometric. t's p value at 10⁷ degrees of
  freedom went from 3e-10 to 7e-14 off, its 97.5% from 1e-8 to 3e-15.
- `tools/stats-test.mjs` (57 checks) in the suite; fixtures `tools/ref/fixtures/stats.json`;
  eight new fuzzer generators. The noncentral, studentized-range, rank and normality distributions
  of the plan move to the wave-2 slices that use them.

## Closing the gap with Origin, wave 1, slice 1.1: project files (2026-11-07)

`ux/spec/FOUNDATION_SPEC.md` 1.1. A project can now leave the browser as one file.
- **File › Save to a file…** (Ctrl+S) writes the project as a `.kurve` file (compressed JSON, long
  numeric columns packed as binary): every column, step, peak set, band, fit, graph, annotation and
  style, the original data's record with its check code, the discussion. The first save asks
  where; for the rest of the session Ctrl+S writes the same file again. **Save a copy to a file…**
  (Ctrl+Shift+S) always asks. Without the browser's file picker each save is a download. The
  project's name in the title bar says which file it was last saved to.
- **File › Open a project file…**, a `.kurve` chosen in the import dialog or dropped on the window:
  checked first (not a project, cut short, damaged, made by a newer Kurve, a column whose values do
  not add up, more than 512 MB inflated: refused in words, nothing made), then opened as a new
  project under a name of its own with its comments and replies, nothing to undo, its check code
  worked out again and compared with the file's and the record's.
- **File › Back up every project…**: one file of every project; opened, it lists them to restore.
- Ctrl+S used to show only a message that every change is saved as it is made; it now saves to
  a file (the project still saves itself into the browser at every change).

Measured: a project of a million rows is 11.4 MB, saved in 570 ms and opened in 655 ms (budgets of
2 s each in `tools/perf.mjs`). `tools/file-drive.mjs` (39 checks, in `tools/suite.sh`): every
example saved and opened equal (columns, steps, peaks, bands, annotations, comments with a reply,
the check code), a million rows, the same file twice, a file of an older document version upgraded,
eleven kinds of bad file refused with nothing made (a gzip bomb among them), Ctrl+S twice writing
one file, a copy, a file that can no longer be written asking again, the menu, a drop, the import
picker, a backup made and two of its three projects restored.

## Working together, slice 3: proposed settings (2026-11-06)

- *Propose settings…* in a step's discussion: a copy of its settings, changed and posted with a reason
  as a thread on the step; the comment lists each change and where it stands, and *Apply* sets them
  (one undo step, a log line naming whose proposal). The report lists the proposals. Roadmap item 10
  is done, and with it the roadmap.

Checked: `tools/plot-drive.mjs` (9 new: the dialog and its waiting Post, ids not doubled, the thread
posted with only what changed, the comment's list and Apply, the log line, undo offering Apply again, a
colleague's proposal in their name, a step removed, the report).

## Working together, slice 2: mentions (2026-11-06)

- @ and the start of a name in any comment box lists the people the project knows; the comment keeps
  whom it names and marks their names; one naming you says *Mentions you*, a message says so when it
  arrives, and the Discussion window's *For you* lists those threads.

Checked: `tools/plot-drive.mjs` (8 new: the list, Enter, the comment posted with whom it names and the
name marked, a reply naming you with its message and mark, For you, Escape keeping the reply, an edit).

## Working together, slice 1: new comments (2026-11-06)

- A colleague's comment written since this browser last showed its thread says *New*; its History
  box's badge is ringed, and the Discussion's button and title count the new ones. Shown in the
  Discussion window or a box's inspector, a thread is read a moment later; *Mark all read* reads
  every one. Kept per browser and project.

Checked: `tools/plot-drive.mjs` (9 new: two comments by someone else new on the box and the button,
New in the window and read after it, a reply new again, one's own never new, Mark all read, a
reload, junk from storage).

## Under the hood, slice 3: thousands of columns (2026-11-06)

- A render asks about the columns once (by id, the Y columns' order, a sheet's columns, each
  column's X and error bars); a curve's points are kept per series; a heat map keeps its grid and
  picture and colours through a table; the check code keeps the last few states, so an undo is not
  hashed again.
- The History draws only the boxes about the view past 300, and a lane of a lower band is fed by a
  short line over its box; Statistics lists 200 columns with *Show them all*.
- 2000 files of 400 points: a save with their map 563 → 71 ms, a value typed 1266 → 400 ms, an undo
  2180 → 390 ms, the History opened 770 → 80 ms (a save with it open 1580 → 160), Statistics opened
  808 → 60 ms; 1000 columns overlaid on one graph: a save 1160 → 280 ms.

Checked: `tools/odd-test.mjs` (10 new: 2000 files imported and mapped, a save's time, the History's
boxes, forty presses of ↓ past them, a far box gone to, Statistics' rows and Show them all, a value
typed and undone).

## Under the hood, slice 2: the worksheet draws the columns in view (2026-11-06)

- Past 40 columns the worksheet draws only the columns about the view, with a spacer either side for
  the rest, and makes a column's sparkline only when the row of them is shown. A sheet of 600 columns
  and 2000 rows: drawn in about 50 ms (670 before), saved in about 80 ms (1080); scrolled across, each
  cell and letter is its own column.

Checked: `tools/odd-test.mjs` (15 new: the cells drawn, the time, five places across, End and a value
typed, a name typed while its column is scrolled away, a range across 300 columns, a column sized).

## Under the hood, slice 1: every example, end to end (2026-11-06)

- `tools/odd-test.mjs` runs each example as a newcomer would: the Raman band fitted (a Lorentzian at
  520.7) and its peaks found, the cosmic-ray spike not among them; the decay fitted; the infrared
  bands found (one a shoulder) and fitted; the raw polystyrene's Overview steps applied (spikes,
  background) and its bands found, the 1001 cm⁻¹ ring band among them; every report and CSV written;
  no page error.
- The finder's Automatic noise takes the error bars when every point has one (before √N): the Raman
  example's error bars are about 1.6 times √N, and √N had made a wiggle at 541.75 cm⁻¹ a peak.

Checked: `tools/odd-test.mjs` (15 new), `tools/count-drive.mjs` (45, all still passing).

## More files, slice 4: Princeton Instruments SPE (2026-11-06)

- WinSpec's and LightField's binary SPE files are read: each row and frame a column of counts (float,
  32- or 16-bit integers), X in nm from the file's wavelengths or its calibration polynomial, else by
  pixel; the exposure, date, detector temperature, laser line and comments as header fields. Maestro's
  text `.Spe` still reads as an analyser's counts. Roadmap item 8 is done.

Checked: `tools/parser-test.mjs` (8 new, files built byte by byte: version 2 with its polynomial and
fields, 16-bit rows by pixel, frames, version 3's XML wavelengths, through the import's table,
Maestro's text not taken for one, the refusals) and `tools/plot-drive.mjs` (2 new: a WinSpec file
chosen into the dialog, a Maestro file still an analyser's).

## More files, slice 3: OPUS (2026-11-06)

- Bruker OPUS files (`sample.0`, `sample.1`…) are read from their bytes: the absorbance block (else
  the single channel or interferogram) with its points, X range, scale and unit, and the sample's
  name, operator, instrument, resolution, scans, apodization, beamsplitter, source and detector as
  the column's header fields. A file so named that is not OPUS is read as text, as before.

Checked: `tools/parser-test.mjs` (6 new, files built byte by byte: the block chosen and scaled, the
fields, through the import's table, a single channel in micrometres, a text file, the refusals) and
`tools/plot-drive.mjs` (2 new: a file chosen into the dialog with its line, a text file named `.1`).

## More files, slice 2: SPC (2026-11-06)

- SPC files (`.spc`, Thermo Galactic's binary format) are read: floats or scaled 32- or 16-bit
  integers, X even or as written, several subfiles as columns (one X, or X, Y pairs), the X and Y
  types as names or the file's own labels, the memo, source, resolution, method, date and experiment
  as the columns' header fields. Choosing, dropping and importing several at once all read them; the
  old format (before 1996) and a file that ends early are refused in words.

Checked: `tools/parser-test.mjs` (11 new, files built byte by byte: floats, the header's fields,
32-bit and 16-bit integers with their exponents, several subfiles on one X and each with its own,
axis labels, big-endian, the refusals) and `tools/plot-drive.mjs` (4 new: a file chosen into the
dialog and the worksheet, two dropped, one refused, the old format).

## More files, slice 1: JCAMP-DX (2026-11-06)

- JCAMP-DX files (`.jdx`, `.dx`) are read: `##XYDATA` in plain numbers or compressed (ASDF), point
  pairs and peak tables, the factors and X range, the first block with data of a linked file; units
  become names (Wavenumber in cm⁻¹, Raman shift, Wavelength, Absorbance…), the other labels the
  column's header fields. The import dialog says it was JCAMP-DX and in which form; files in pages
  (`##NTUPLES`) are refused with the reason. Import, drop and several files at once all read them.

Checked: `tools/parser-test.mjs` (9 new: plain numbers with exponents, the units and labels, the
compressed forms with the check value, SQZ signs and an E, point pairs with a missing value and a
factor, a linked file, the refusals, a text that only mentions it) and `tools/plot-drive.mjs` (4 new:
the dialog and its line, the worksheet's columns and header fields, a dropped file, a refusal).

## Many spectra, slice 4: a trend graph as a graph like any other (2026-11-06)

- A trend graph's ⋯ menu has *As a graph like any other*: its numbers on a sheet of their own (the
  series as X, each quantity a column with its errors as error bars, each comment dated) plotted on
  an ordinary graph, a quantity on the right axis kept there; one undo step. The Format pane, saved
  styles, figures and every export then work on it. Roadmap item 7 is done.

Checked: `tools/plot-drive.mjs` (5 new: the menu, the sheet's columns and values against the
trend's, the graph and its right axis, the Format pane on it, undo).

## Many spectra, slice 3: global fits in a worker (2026-11-06)

- Fit every column… together solves in a worker made from the page's own numerics: the page stays
  live while it runs, and the progress line's Stop now works then too (each column keeps its own
  fit, and the message says so). Where no worker can be made, the fit runs on the page as before.

Checked: `tools/plot-drive.mjs` (4 new: the worker used and its result equal to the page's, the
page answering within 300 ms while 80 columns of 3000 points are fitted together, Stop heard, the
page's own fit where no worker can be made).

## Many spectra, slice 2: the files' header fields as rows (2026-11-06)

- The worksheet's ⋯ corner has *Header fields* when its columns came from files with a header: a row
  per field under Long Name, Units and F(x)=, the most common first (eight at most), each column's
  value as written, read only. A field's name gives its menu: *Use as the series* (one undo step;
  not offered for text, with the reason), *Copy the row*, *Hide the header fields*.

Checked: `tools/plot-drive.mjs` (9 new: the ⋯'s count, the rows in order with an empty value, the
field's menu, the series set from it in its unit and undone, a text field refused, a press on a
value leaving the selection, none in the Processed view, hidden).

## Many spectra, slice 1: a parameter that follows the series (2026-11-06)

- Fit every column…, Together: each parameter is its own, shared, a straight line in the series, or
  Arrhenius in it (a rate against temperature, the series in K, °C or °F). The line is two numbers
  fitted with everything else, so its slope or activation energy comes with its error from the
  whole fit; each column's value is read off it.
- The Batch window gives the line under its summary, Results marks the parameter *follows* and
  gives the line in its statistics, the report says it and the CSV gives its numbers, errors and
  covariance. Refusals in words: a column without a value of the series, one value for all, a
  series that is not a temperature, a start not above zero.

Checked: `tools/fit-test.mjs` (12 new: a centre linear in temperature recovered, each set on the
line, its error by the delta method, the degrees of freedom, the slope's error against 60 noisy
repeats, an activation energy recovered by Arrhenius, the refusals) and `tools/plot-drive.mjs` (9
new: the dialog's choices and count, the fit, the Batch window, Results, the CSV and the report,
the refusals, °C turned into kelvin, the order of the columns as the series).

## Getting around, slice 4: a peak's shape by its own handle (2026-11-06)

- The selected peak, when its shape has a parameter of its own, has a diamond on a short track over
  its number: a pseudo-Voigt's Lorentzian fraction (Gaussian at the left, Lorentzian at the right),
  a Pearson VII's m (on a log scale), a Fano's 1/q (zero marked and caught). Dragging it keeps the
  peak's height; `,` and `.` step it (`<` `>` ten steps). A fixed shape has none; its tooltip and
  the hover readout give the value.

Checked: `tools/plot-drive.mjs` (13 new: the diamond where its value is, its tooltip, a drag past
the end to 1 with the height and FWHM kept as one undo step, the keys and what they say, undo, a
Fano's zero marked and caught, none on a Gaussian or a fixed shape, Pearson's m on a log scale).

## Getting around, slice 3: annotations and peaks by the keys (2026-11-06)

- On the graph, Tab and Shift+Tab select each annotation in turn (in the order they are drawn), then
  each peak being set up; past the last the focus moves on. The arrows move what is selected a
  pixel (Shift: ten); a peak's arrows move its centre and height, and [ ] change its width ({ }:
  ten). A burst of presses is one undo step and one log line; Esc lets go.
- A press on a peak's dot lets go of a selected annotation, so the arrows move what was pressed.

Checked: `tools/plot-drive.mjs` (14 new: Tab's order and what it says, a text moved 13 right and 1
up as one undo step and one log line, undone, a line moved ten left, the first peak after the
annotations, its centre, height and width, one undo for the burst, Tab and Shift+Tab leaving, Esc,
a viewer's arrows).

## Getting around, slice 2: the History's zoom and wrapped lanes (2026-11-06)

- The History's bar has −, the zoom as a percentage (back to 100 %), + and Fit; Ctrl and the wheel
  zoom too; kept in this browser. *Wrap lanes* (on) puts lanes that do not fit across the view in
  bands below.
- Fixed: dragging a step's box to reorder it did nothing after anything had been saved, and a
  step's right-click menu said "Step 0" with Move earlier and later off.

Checked: `tools/plot-drive.mjs` (10 new: twelve lanes wrapping and not, zoom out, back, Fit,
Ctrl+wheel, a step dragged at 80 %, the step's menu after a save, a reload).

## Getting around, slice 1: the undo list (2026-11-06)

- Edit › Undo list…, and a right-click on the Undo or Redo button: every change that can be undone,
  the newest first with how long ago, and what can be redone; choosing one undoes it and every
  change after it (or redoes it and every change before it), with one message and *Redo them*.

Checked: `tools/plot-drive.mjs` (6 new: the list in order with its times, opened under the Undo
button, three changes undone in one choice, the redo part, two redone, the right-click).

## Figures, slice 3: the graph's own fonts in a PDF (2026-11-06)

- A PDF embeds the faces its text is drawn in (TrueType from Fontsource's copy of Google Fonts, as
  CIDFontType2 with widths and a ToUnicode map), so it looks as on screen and its text can be
  searched and copied; the message says which fonts went in, or which could not be fetched and had
  the standard fonts stand in. EPS keeps the standard fonts. The roadmap's item 5 is done.

Checked: `tools/plot-drive.mjs` (8 new, with this machine's TrueType fonts served in Fontsource's
place: the files asked for, embedded and said, `pdffonts` showing CID TrueType embedded, `pdftotext`
reading the text back, `pdfinfo` reading the file, a CFF face falling back, offline, EPS).

## Figures, slice 2: a break at a chosen place, each side its own scale (2026-11-06)

- A break can be given a place (*Gap at*, 5 to 95 % along the axis from its low end) in Break the
  axis… and on the axis page: the gap sits there and each side has a scale of its own. Empty, it is
  a break in proportion as before.

Checked: `tools/plot-drive.mjs` (12 new: the field and its refusal, the log, the gap's middle in
proportion and placed, the two scales, numbers both sides and an export, a reversed axis, the axis
page's field typed and emptied, crossing places, junk from storage).

## Figures, slice 1: polygons and curved arrows (2026-11-06)

- The Shape tool's *Polygon*: a click a corner; the first corner again, a double click or Enter
  finishes; Backspace takes a corner off, Escape stops. Corners drag one at a time, the body moves
  it; outline, fill, text, behind the data, pinned, and *Closed* (open, a line through its points);
  in the Format pane's Add menu.
- Arrows curve: *Curve* in the menu (left, right, straight), a diamond at the middle to drag, a
  number from −1 to 1 in the Format pane; the heads follow the curve; swapping the ends keeps it;
  PDF and EPS draw it.

Checked: `tools/plot-drive.mjs` (17 new: the tool's clicks and outline, finishing on the first
corner, the handles, a corner dragged and undone, open and closed, fill, pinned through a zoom, an
export, Enter, Backspace, Escape, two corners refused; the curve menu, the diamond, a drag bending it
the other way, swapping the ends, an export and a PDF).

## Plots, slice 5: a map from scattered X, Y, Z (2026-11-06)

- Plot setup's kind *Map from X, Y, Z* (and *Map from X, Y and its colour column* in a curve's Plot
  type): the points joined by Delaunay triangles, the value interpolated across each, drawn as an
  image in the colour map with its colour bar; the curve's *Map* menu adds contour lines or draws
  them alone, with the levels and colour map; the status bar reads the value under the pointer. Up
  to 20 000 points (6000 in about 35 ms). The roadmap's item 4 is done.

Checked: `tools/fit-test.mjs` (5 new: a grid's triangles, the empty-circle property and the hull
covered on 400 random points, contour lines lying on a plane, refusals, 5000 points within two
seconds), `tools/plot-drive.mjs` (9 new: the kind and its note, OK, the image, colour bar and legend,
the value under the pointer, contour lines with and without the image, an export, undo, the plot type
list, points on one line).

## Plots, slice 4: axes shared per column or per row in a figure (2026-11-06)

- A figure's Panels… dialog shares X with every panel or with the panels of each column, and Y with
  every panel or with the panels of each row: each column (row) then has a range and a zoom of its
  own, the panels in it still touching with numbers on the outer edge. Kept with the figure, one
  undo step, said in the log.

Checked: `tools/plot-drive.mjs` (10 new: the dialog's lists, the log, each column's X and each row's Y
range, the numbers on the outer edges, a zoom followed in its column only, every panel again, undo,
what storage gives back, a reload).

## Plots, slice 3: stacked columns and names along X (2026-11-06)

- A column curve's right-click has *Columns*: Side by side, Stacked, Stacked to 100 % (also on the
  Format pane's layout page). Stacked, each column curve stands on the ones before it at the same
  X, values below zero downward, the view taking in the stacks; to 100 %, each column is its share,
  Y is titled Share (%) and the legend goes below. The legend's corner keeps clear of the stacks.
- *Names along X…* (the X axis's right-click, and under *Columns*): a name for each X value of the
  graph's curves, written under it in place of the number, in every export; one undo step; more
  than 60 X values is refused in words.

Checked: `tools/plot-drive.mjs` (12 new: the menu, a stacked column from where the one before it
ends, the whole width, the view, to 100 % with its title and the legend below, undo, an export and
saved styles, the names typed in the dialog and drawn, undo, names from storage that do not read,
the refusal).

## Plots, slice 2: boxes grouped by another column, notched boxes (2026-11-06)

- A box or violin chart can be *Grouped by* a column of the sheet (its right-click's Box chart menu,
  the Format pane's layout page): each curve's values are split by that column's value in their row,
  a cluster per group along X with a box per curve in its colour, X numbered by the groups and titled
  by the column, a legend for several curves, the readout naming the group under the pointer. A
  column of more than 60 values is greyed with the reason. Deleting the column puts the chart back
  to a box per curve.
- *Notches* (boxes): narrowed round the median over ± 1.58 IQR/√n, the span in the tooltip; a format,
  so saved styles carry it.

Checked: `tools/fit-test.mjs` (4 new: the notch's formula, its coverage of the true median over 600
samples, groups split and refused), `tools/plot-drive.mjs` (12 new: the menu and its refusal, six
boxes in three groups with their ticks, title, legend and log, the medians of each group, the
readout, notches in the graph, the tooltip and an export, undo, violins, the Format pane, the column
deleted and undone, a new graph's look).

## Plots, slice 1: a distribution over a histogram (2026-11-06)

- A histogram's right-click has *Distribution over it*: None, Normal, Log-normal, Exponential. The
  distribution is fitted to the values by maximum likelihood and drawn over the columns as they are
  shown (counts, probability, percent, a density, cumulative); its parameters with their errors are
  in the legend, and Kolmogorov–Smirnov's D and p in the message and the curve's tooltip. A kind the
  values cannot have is greyed with the reason. One undo step; kept with the graph; in every export;
  fitted again when the bins or the data change.

Checked: `tools/fit-test.mjs` (5 new: each kind's parameters and errors, the K–S distance against
its own sample and a wrong one, the refusals), `tools/plot-drive.mjs` (15 new: the menu, the curve,
μ and σ, its height against the bins, the view, the export, undo and redo, density and cumulative,
log-normal, the refusals, a reload).

## Counting spectra, slice 5: region edges dragged on the graph (2026-11-05)

- The Peaks window's regions have edges that drag on the graph, as bands' do (Zoom, Pan or Label):
  the region follows with a tip, and letting go searches again with it, one undo step. A click on an
  edge selects its region. The roadmap's item 3, counting spectra, is done.

Checked: `tools/count-drive.mjs` (6 new: the edges there to hold, a drag followed with its tip, one
undo step and a new search with the new edge, undo, a press selecting the region).

## Counting spectra, slice 4: a nuclide named by the set of its lines (2026-11-05)

- **Nuclides** under the Peaks window's *Identify*: each nuclide whose lines name peaks is judged by
  all its lines in the spectrum's range at a tenth of its strongest or more: *Present* (its strongest
  and half of them found), *Possible*, or *Unlikely* (its strongest missing), with the lines found
  and missing listed.
- **Strengths**: with counted windows around the peaks, each line's net counts over efficiency ×
  intensity; from one nuclide they agree (χ² per degree of freedom, with the detector's efficiency
  curve; else their spread).
- **Interferences**: a peak another nuclide's line could also be is marked shared, and naming takes a
  present nuclide's line over an unlikely one's.

Checked: `tools/fit-test.mjs` (6 new: present, possible and unlikely sets, the order, a shared peak,
strengths that agree and a line three times too strong, a narrower range), `tools/count-drive.mjs`
(6 new: a background spectrum's ²¹⁴Bi and ¹³⁷Cs present and a lone ²⁰⁸Tl line unlikely, the table,
the strengths with and without the efficiency curve, the dock), a screenshot.

## Counting spectra, slice 3: the detector's efficiency and resolution (2026-11-05)

- **Analyze › Spectroscopy › Detector** has *Efficiency against energy…* and *Resolution against
  energy…*: a table of points beside a drawing of them and the curve, kept with the project.
- **Efficiency** points are typed, or come from a calibration source: windows around its lines with
  their emission typed, the source's activity typed, *From the counted windows*. The curve is ln ε, a
  polynomial in ln E of degree 1 to 4, weighted by the points' errors.
- **Activities without an efficiency typed**: the Counting part uses the curve's at each window's
  centre, shown greyed in its field, and carries the curve's error into the activity.
- **Resolution** points come from the windows' and the fitted peaks' FWHM; the curve is FWHM² = a +
  b·E. A counted window much wider than a line there is marked: two lines, perhaps.
- Help has an article on both; Copy and the report say where each efficiency came from.

Checked: `tools/fit-test.mjs` (8 new: a curve of degree 2 recovered, beyond its points, refusals, its
error against 400 curves from noisy points, unweighted, the resolution curve, the efficiency's error
carried into the activity), `tools/count-drive.mjs` (11 new: a source counted into efficiency points,
saved with a log line, the source's 1000 Bq back from the curve, the greyed field, the resolution and
a doublet's window marked, undo, too few points said, points typed, Cancel, the report), a
screenshot of the dialog.

## Counting spectra, slice 2: net counts, detection and activity (2026-11-05)

- **The Integrate window counts** a spectrum of counts (or counts per second with its live time):
  each window's net counts over a straight continuum through the channels at its edges, with the
  counting error; the rate; detected or not against Currie's critical level (95 %).
- **Activity**: type a window's emission probability and the detector's efficiency (%), and it
  gives the activity in becquerel with its counting error, or, not detected, the detection limit
  as an activity.
- **Only counts are counted**: after smoothing or a subtracted background the part says why it
  cannot; an energy calibration, a count rate or a crop keep the counts.
- Copy, the report and Help have the counting too; in the dock its secondary numbers go on a line
  under each window.

Checked: `tools/fit-test.mjs` (10 new: a line of 2000 counts on flat and sloping continua, σ
against its formula and against 1500 Poisson repeats, Currie's levels, about 5 % false detections on
a continuum alone, counts per second, refusals, the activity), `tools/count-drive.mjs` (12 new: the
net counts of an imported .Spe line within 4 σ, a window with nothing not detected, emission and
efficiency typed and undone, a percentage refused, Copy, the report, a count rate, a smoothed
spectrum refused in words, the table in the dock).

## Counting spectra, slice 1: an analyser's own files (2026-11-05)

The roadmap's item 3. Kurve read a multichannel analyser's counts from a .TKA file or a column of
numbers; the calibration, times and date an analyser writes in its own formats were lost.

- **Maestro's and the IAEA's .Spe files** and **ANSI N42.42** (2006 and 2011) are read: the counts,
  numbered from the file's first channel, the live and real time (and the dead time), the date
  (Maestro writes it month first; Kurve keeps it year first), the title, and the energy calibration
  with its unit. N42's zeros written as counts of zeros are unfolded, and of several spectra the
  longest is read.
- **The calibration is a step**, an Energy calibration on the counts with the file's
  coefficients, on by default (the dialog's *Will apply*, which turns it off), so the spectrum is
  against energy at once and the counts stay as recorded. A dropped file and several files at once
  are read the same way, each with its own date, which a series can then be plotted against.
- **The dialog shows the file as written**, its counts marked, and says what it read; the
  delimiter and line controls, meaningless for such a file, are not shown.
- The Import button's file list offers .tka, .spe, .n42 and .xml.

Checked: `tools/parser-test.mjs` (9 new: a Maestro file with $MCA_CAL over $ENER_FIT, an IAEA file
from channel 10 with several counts a line, a .spe that is not one, N42 2011 with CountedZeroes and
durations, N42 2006), a new drive `tools/count-drive.mjs` (10: the dialog's findings, the step and
the axis in keV, the metadata, the calibration left off, a drop, an N42 file, two files at once with
their dates), screenshots of the dialog and the plot.

## Known gaps closed: drags past the edge, undo beside another tab, Results in the dock (2026-11-05)

- **A drag past the grid's edge goes on**: the fill handle held below the grid kept filling only
  while the pointer moved, and a range dragged out of view stopped at the last row shown. Held past
  any edge, the grid scrolls, faster the further out, and the fill or the selection follows.
- **An undo beside another tab**: undoing an annotation took back the other tab's newer graph name
  (only the columns were merged with what came in). Every part of a step now goes back beside what
  came in since: graphs, annotations, sheets and the other lists thing by thing, the log and the
  record keeping what was added elsewhere, any other part another window changed keeping that change.
- **Results in the dock**: the parameter table ran 270 px off the dock's side. Narrow, t, p, the
  interval and the dependency go on a line under each parameter, and a peak's shape, height, FWHM
  and share under its centre and area.

Checked: `tools/review-drive.mjs` (5 new: the fill handle held still past the bottom, a range
dragged past it, an undo keeping the other tab's newer graph name, its newer annotation, its newer
change to the same graph; they failed before), Results measured in the dock after a curve and a
peak fit, and every suite.

## Known gaps closed: a million rows typed into, drawn and scrolled (2026-11-05)

- **A value typed into a million rows** took 1.5 s; it takes about 70 ms. The check code is the
  same (`sha256sum` of the exported lines still reproduces it) but is worked out in the background
  past 150 000 cells, a stretch of rows at a time; the History's record says *working it out…*
  until it is there, a second or so later, and every export works it out first. A record still
  waiting when the page went is worked out again when the project is opened.
- **The status bar** counted the points by making a million of them; it counts them. A copy of a
  column is noticed by comparing values instead of a key of every value, and a few values typed
  over change the series of before instead of building it again.
- **Column values are stored as one block of numbers** in IndexedDB, quicker to write; older
  projects read as before.
- **A graph of a million points** draws the whole curve in about 35 ms (118 before) and a zoom
  into part of it in a few: only the points in view are read when X runs one way, the per-pixel
  decimation is made as they are read, and the automatic view is worked out once.
- **A sheet of 1.6 million rows**: the browser lays out nothing taller than about 2²⁵ px, and the
  last 75 000 rows could not be scrolled to. Past 15 000 000 px the scroll bar stands for the rows
  in proportion; the bar, the wheel, Ctrl+End and the arrows reach every row.
- Measured: the worksheet draws a screen of rows in about 14 ms at 10 000 rows and at 1.6 million,
  so the gap that said it scrolled at 20 frames a second is closed too.

Checked: `tools/pipe-test.mjs` (4 new: the check code in one run and in paused stretches equal to
`sha256sum`, SHA-256 fed seven bytes at a time), `tools/odd-test.mjs` (6 new: a value typed into a
million rows at once, its check code worked out exactly, an export settling one still to come, one
still to come when the page went, the values back as numbers, a missing value kept missing), the
decimation made as points are read against `m4` on 40 random series, a 1.6-million-row sheet driven
to its end and back, and every suite.

## A day of lab work: heavy files, tabs, windows, rows (2026-11-05)

Kurve driven as a lab technician would, through the pointer and keys: typing a calibration table
by hand, sizing columns and rows, a million-row scan, a 200 000-row logger file with a preamble,
300 columns, 80 spectra at once, a European file dropped on the window, six projects in three
tabs, every tool window dragged, stacked, resized, maximised, minimised, docked and floated, the
graph in a window of its own, six screen sizes, and a 40-minute day of 1 300 random actions.

- **Heavy files were lost.** A project larger than localStorage's few megabytes said Not saved,
  said Saved once another project was opened, and was empty after a reload. Projects are now in
  IndexedDB (moved there from localStorage on the first load); a refused write says Not saved
  whenever that project is shown, and leaving the page asks first.
- **Large projects were slow**: every save copied every value. A save of a million-row project
  took 1 s; it takes 35 ms. Typing a value into it no longer builds an array per row for the
  check code.
- **Two tabs typing in two columns of one project** kept only one tab's column; both stay now.
  An undo in one tab took back what the other had changed since (a column, a cell); it takes back
  only its own change. A tab closed mid-edit stored its value but the other tab did not show it;
  it does.
- **Keys after a press on a graph's numbers or a title bar** went to the worksheet behind; the
  window pressed takes them.
- **A window's corner dragged past the browser's edge** selected every word on the page; nothing
  is selected now.
- **Rows can be sized**: the line under a row number sets the height of the sheet's data rows,
  kept with the project; a double click gives 22 px back.
- **A graph in a window of its own narrower than 860 px** filled half of it; it fills it.
- **The dock's edge dragged far left** turned the dock into a drawer over the whole desk, with no
  edge to drag back; it stops where the documents keep 780 px, and selects no text.
- **Small things**: "not plotted" ends in an ellipsis when its column is narrow, and fitting a
  column to its contents makes room for it; counts of ten thousand and more are grouped
  (1 000 000); error columns named in German, French, Italian or Spanish are error bars.

Measured and fine: memory, page elements and listeners flat over the 40-minute day; three tabs on
one set of projects, deleting a project another tab shows, closing a tab mid-edit (the value
kept); rapid switching between six projects.

Checked: `tools/review-drive.mjs` (a new section), `tools/odd-test.mjs` (storage, 117),
`tools/lab-day.mjs` (new: the 40-minute day), and every suite.

## The user's reports: sheets, linked zoom, the readers' card (2026-10-29)

- **Importing into a sheet made with +** (the dialog's Add to the sheet shown, a dropped file,
  several files at once, Copy from another project) put the file beside the sheet's empty X and
  Y, one of them between the file's columns. The empty columns now give way; one undo brings
  them back; a column someone named is kept.
- **Linked zoom is off** until ticked, in a graph's ⋯ menu (new) or Window › Graphs.
- **The Reader's and X–Y lines' card** goes anywhere on the screen, dragged by its head, and is
  resized by the grip at its corner; its place and size are kept per browser, always whole on the
  screen; a double-click on its head puts it back by the graph. Numbers in its table no longer
  break across lines.

Checked: a new drive, `tools/review-drive.mjs` (23), screenshots at 1440 dark and 390 light, and
every suite.

## Plot setup, slice 6: remembered setups (2026-10-29)

`ux/spec/PLOT_SPEC.md` slice 6, the last.
- Plot setup remembers, per sheet in this browser, the kind it last plotted and what each column
  was, and starts from them on that sheet (the columns selected still the curves).
- **Plot like the last time** (the worksheet's Plot list, Plot › Plot the selected columns) plots
  the selection that way at once; it opens Plot setup when the kind's column is missing.
- What it remembers never changes a column: an X or error bars come back only where the column
  still is one.

Checked: `tools/plot-drive.mjs` (9 new, 79), and every suite from the round before. Plot setup's six
slices are done.

## Plot setup, slice 5: kinds that need another column (2026-10-29)

`ux/spec/PLOT_SPEC.md` slice 5.
- Four kinds in a row of their own, drawn with the data: **Bubbles** (sized by a column marked
  Size), **Colour by value** (a column marked Colour, with its colour bar), **Labelled points** (a
  column marked Labels), **Error boxes** (a box round each point spanning its X and Y errors).
- Until each curve has what its kind needs, a note says what to mark (and which curves lack it),
  and Plot waits.
- Error boxes are also a way to draw any curve's error bars: *Boxes (X and Y)* in its Error bars
  menu and the Format pane.

Checked: `tools/plot-drive.mjs` (10 new, 70), ds-test's gallery (18 cards), screenshots, and every
suite from the round before.

## Plot setup, slice 4: groups (2026-10-29)

`ux/spec/PLOT_SPEC.md` slice 4.
- **Group** on a curve's right-click: not grouped, a group, a new group with another curve, every
  curve of the graph in one; and how the group steps: colour, symbol and line together, colour
  only, symbol only or line style only.
- A group's curves share their plot type (*Plot type* on one changes all) and step their look
  from the first curve's; a curve's own colour, symbol or line still wins.
- Plot setup has a Group column (and *New group*) and each group's steps under the list.
- A group of one is dropped, and so is what storage gives back that does not read.

Checked: `tools/plot-drive.mjs` (13 new, 60), screenshots, and every suite from the round before.

## Plot setup, slice 3: on a graph (2026-10-29)

`ux/spec/PLOT_SPEC.md` slice 3.
- **What it plots…** in a graph's ⋯ menu, a figure panel's menu, the graph's right-click and Plot ›
  What this graph plots…: Plot setup opened on that graph's curves, to add, replace, take off,
  reorder, re-range or move between axes; the preview is the graph itself, labels included.
- No kind is chosen until one is picked, so each curve keeps how it is drawn.
- OK is one undo step (none when nothing changed), said in the log and a toast; a curve taken off
  that was the active one hands that to the graph's first.

Checked: `tools/plot-drive.mjs` (10 new, 47), a screenshot, and every suite from the round before.

## Plot setup, slice 2: rebuilt, in three parts beside the graph (2026-10-29)

`ux/spec/PLOT_SPEC.md` slice 2.
- **Kind**: the gallery of cards, drawn with the curves.
- **Columns**: a sheet's or every sheet's, filtered, each with its rows, a sparkline and its
  *Use* (X, Y, Y error ±/+/−, X error ±/+/−, labels, colour, size), started from the worksheet's
  roles; tick several to mark them at once. A Y column is never made an X or error bars here.
- **Curves on the graph**: Add, Replace, Remove, Up, Down; each curve's X (any X of its sheet,
  or the row number), range (all, rows, X) and axis.
- **The preview is the graph itself**, drawn as it will be, into a new graph or one you have.
- **OK is one undo step**; what it changes of the columns (an X, error bars) is said in the toast
  and the log. The column menu's *Plot against* has *Its row number*.
- Below 860 px the three parts are tabs.

Checked: `tools/plot-drive.mjs` (26 new, 37), ds-test's gallery checks, screenshots at 1440 and
1024 (light and dark) and 390 px, and every suite from the round before.

## Plot setup, slice 1: what each curve of a graph uses (2026-10-29)

`ux/spec/PLOT_SPEC.md` slice 1, the user's question of 23.10 about ranges and axes.
- **Range…** on a curve's right-click: all of it, rows from and to, or X from and to; the axes
  fitted to it or not; this curve or every curve of the graph. The graph's alone: the data, the
  processing, the fit and the other graphs are untouched.
- **Right axis** for any overlaid curve but the active one, with its own range and title, the
  legend saying left and right, and the Format pane's Right Y axis page.
- **Labels from** a column: each point drawn labelled with that column's value in its row.
- Kept on the graph, undone with it, in every export; a new graph's look leaves them out; junk from
  storage is dropped.

Checked: a new drive, `tools/plot-drive.mjs` (11), a screenshot, and every suite from the round
before.

## Curve fit, slice 10: the function editor grown, and your functions (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 10, the last of the curve fit.
- **The function editor** has a category, each parameter's meaning, starts as formulas of the data,
  constraints (the Fit window starts with them when the function is chosen) and derived values (a
  name = a formula of the parameters, given in Results with its error). Each is checked as typed.
- **Your functions** (Analyze › Fit, and the model list's foot): every function of the project and
  of this browser by category, renamed and filed in place, edited, deleted, copied between the two.
  The model list files your functions under their categories.

Checked: fit-test (3 new: derived values, their refusals and errors), fit-drive (14 new), and
every suite from the round before.

## Curve fit, slice 9: saved fit settings, and fits that follow their data (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 9.
- **Saved settings**, in the Model heading and Analyze › Fit: a curve fit's settings by name (the
  model, starts or their formulas, Fix, limits, constraints, weights, the apparent fit, fit control,
  the level, the range), kept in the project or in this browser, renamed, deleted, copied between
  the two. Choosing them sets the Fit window up (one undo step) and offers Fit.
- **Fit again when the data change**: a fit made again, with its own settings, whenever its
  column's processing, data or mask change; a log line and no undo step of its own; a refit that
  fails keeps the fit and says why.

Checked: fit-drive (13 new, 79), screenshots, and every suite from the round before.

## Curve fit, slice 8: starting values and constraints as formulas (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 8.
- **A start can be a formula of the data** in the fit's range (`max(y) - min(y)`, `xat`, `fwhm/2.3548`,
  fifteen measures), typed in its own field, shown as typed in italics with its value as the
  tooltip, measured again by Guess and each fit, refused in words when it names nothing.
- **Constraints**, one a line under the parameters, read as they are typed: `b = 2*a + 1` makes b
  follow (not fitted on its own, its error carried, shown in the grid as its formula, said in
  Results); `t1 < t2` keeps two parameters in order at every iteration.
- Unknown names, two rules for one parameter, a circle and a fixed parameter kept above another are
  refused in words; the constraints and formula starts are kept with the fit, in Results, the
  report and the CSV, and used by fits of every column one by one.

Checked: fit-test (11 new, 347: the data's measures, start formulas and their refusals, every
refusal of a constraint, the order rules apply in, an equality against the one-parameter fit it
amounts to with the carried error, an inequality binding and not, two decays started the wrong way
round coming out in order), fit-drive (13 new, 66), screenshots, and every suite from the round
before.

## Curve fit, slice 7: the apparent fit (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 7, its second half.
- **Apparent fit** in the curve fit's options, while the graph has a logarithmic axis: the points
  fitted as they look there (log₁₀ y against x, say), so a straight line fits a straight line on
  the graph. Ticking it measures the starting values again.
- The curve is drawn and read (Find X/Y, the worksheet) in the data's terms; the parameters, R²,
  χ², residuals and bands are in the logarithms, and Results, the report and the CSV say so.
- Errors go with the logarithm; zeros on a logarithmic axis and the X errors are refused in words.
  Fits of every column carry it.

Checked: fit-test (6 new, 336: a power law as a line on log–log axes, the model in the data's
terms, the weights through ln and log₁₀, what a logarithm cannot take), fit-drive (10 new, 53),
a screenshot, and every suite from the round before.

## Curve fit, slice 7: how points count, the weights (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 7, its first half.
- **Weights** in both Fit windows is a list: None, Y error (1/σ²), Counting (1/y, for counts) and the
  sheet's columns by name (their values as the weights), each option's tooltip saying what it does.
- Y errors and counting are taken as they are; a column's weights only say how the points compare,
  so the errors are scaled by √(reduced χ²), as with none.
- A point that cannot be weighted (no error, a count of 0, no weight) is refused, with how many and
  what to do. The kind is said in Results, the report, the copied table and the CSV; the residual
  analysis and the prediction band use it; a column of weights deleted puts the fit out of date.
- Fits of every column, together or not, use the Y error or counting where every point allows it.

Checked: fit-test (9 new, 330: each kind's factors and refusals, the covariance scaled or not, a
column's weights relative, counting weights on Poisson counts against 300 repeats), fit-drive (8
new, 43), screenshots, and every suite from the round before.

## Curve fit, slice 6: the fit in the worksheet (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 6.
- **To worksheet** in Results (also Analyze › Fit › Put the fit in the worksheet, and the fit
  curve's right-click menu) puts the fitted values and the residuals beside the column fitted,
  in each point's row.
- They are **computed columns**, `fit(B)` and `resid(B)` in their F(x)= rows: out of the original
  data and its check code, never typed over; the formulas can be typed into any column too.
- **A new fit writes them again**; while the fit is out of date their *fx* mark says so; with the
  fit removed they are empty and say why. Asked again, the worksheet shows the pair it has.

Checked: `tools/fit-drive.mjs` (16 new, 34: the values against the model, the check code and the
record untouched, the selection and the toast, no second pair, a new fit written and stored, out
of date after a mask, `resid(B)` typed, `fit(B)*2` and `fit(A)` refused, the menu, the fit removed
and undone, a reload), screenshots, and every suite from the round before.

## Curve fit, slice 5: Find X/Y (2026-10-29)

`ux/spec/FIT_SPEC.md` slice 5, the first after the design system's ten.
- **Find X/Y** in Results, answered as it is typed: *Y at X*, the curve's value with its standard
  error and its interval at the fit's level (the confidence band's at that X), an X past the fit's
  points marked as outside the fitted range; *X at Y*, every X in the fit's range where the curve
  takes the value, each with its error and interval, a touch without a crossing said (with no
  error), a value never reached with the range the curve takes there.
- **Fill a column…**: a column of the sheet read either way (the lowest or highest X where there
  are several) into new data columns beside it, with their errors and intervals if asked; one undo
  step and an entry in the original-data record.
- *In the results* has a Find X/Y switch, on.

Checked: fit-test (16 new, 321: a straight line's Y error against its closed form, X's error over
the slope and against 6000 draws, a parabola's two crossings, its vertex as a touch, a value below
it, a fixed parameter's unknown covariance not read, a free one's giving no error, a decay that
never reaches a value and one it reaches once, a Gaussian's top, a sine's forty crossings), a new
drive `tools/fit-drive.mjs` (18: the readouts against the functions, a redraw while typing,
Escape, extrapolation, Fill a column… both ways with undo and the record, the switch, a peak fit),
ds-test's In the results list, screenshots in the dock, dark at 1024 and at 390 px, and every
suite from the round before.

## The design system into the app, slice 10: two displays (2026-10-29)

- **Move to new window** (a window's title-bar button, Window › Move to new window, Ctrl+Shift+D)
  puts a graph, or the Results, Statistics, Help, Overview or Discussion window, into a browser
  window of its own, for another display. Window › Open on display lists the screens where the
  browser can (it asks once).
- **The main window keeps the project.** A graph is drawn in its own window at that window's
  size and kept up to date; the wheel zooms it, a drag pans it, a double click shows it all, and
  the strip reads the pointer's X and Y. A tool window there is the same window: its buttons,
  lists and fields act on the window here, and its messages show there too.
- **The strip**: the window's name, the project, *Live* (or *Paused* when the main window is gone,
  with Reconnect and Close), the display list, *Return to desk*.
- **The taskbar** shows a window away with a dashed edge and the display's tag; the Window menu
  says where it is and has *Return all to desk*. Closing the window returns it; switching projects
  returns them all, and Preferences › Displays can offer to reopen them and send new graphs to
  another display.

`tools/ds-test.mjs` has 13 new checks (158). The design system's ten slices are done.
