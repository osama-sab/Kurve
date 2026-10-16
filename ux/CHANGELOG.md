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
