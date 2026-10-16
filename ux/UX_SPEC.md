# Kurve UX specification

Phase 3 of `KURVE_UX_REWORK.md`. It sets how Kurve should look and behave; Phase 4 builds it
in slices. It is short on purpose, and replaces most of CLAUDE.md's screen description.

**Decided at STOP 2:** remove R1 (the Graphite style), R2 (the "Raman: one band" example), R3
("Processing steps as JSON" and the History's "Export the steps") and R6 ("All graphs as one
figure"). R4 (the Plot › Format submenu, renamed here) and R5 (the graph window's own menu bar)
stay. **Feature freeze:** nothing here adds a feature; a command may gain a menu route where a
persona looked for it.

**With this file**, each written and checked by a script in `tools/ux/`: the wireframes, to
scale ([`spec/wireframe-1366.svg`](spec/wireframe-1366.svg), [`-1920`](spec/wireframe-1920.svg),
[`-1280`](spec/wireframe-1280.svg)); the menu bar, every item ([`spec/menus-after.txt`](spec/menus-after.txt))
and the fate of all 320 items today ([`spec/MENU_DIFF.md`](spec/MENU_DIFF.md)); the token sheet
([`spec/tokens.html`](spec/tokens.html)), 120 contrast pairs ([`spec/contrast.md`](spec/contrast.md)),
every hard-coded value and its token ([`spec/TOKEN_MAP.md`](spec/TOKEN_MAP.md)); and the
measurements of today's screen ([`inventory/measure.json`](inventory/measure.json)).

## 3.1 Principles

The rubric for every decision; the first ten are the plan's, the last five came from Phase 1.

1. **Data first.** The worksheet and the graph are the home. Nothing opens by default that is
   empty, or that a newcomer has no use for yet.
2. **Select, then act** (Excel). Select columns or a range, then choose from the menu or the
   right-click. Results land next to the data: a new column, a new sheet, a graph.
3. **Double-click what you see to change it** (Origin). Every axis, curve, label, legend and
   title opens its own formatting, on the right page.
4. **Defaults that fit the data.** A straight-looking line suggests a line fit, and peaks
   suggest a peak fit. Nothing defaults to a spectroscopy model for data that is not a
   spectrum (§3.7).
5. **Progressive disclosure.** A dialog shows the few settings that matter, with a live
   preview, and folds the rest under **Advanced**. In its default state it never scrolls at
   1366×768.
6. **One obvious way, at most two routes:** one place in the menu bar and the right-click of the
   thing it acts on. A toolbar button only for what is done many times a session. Keys and drag
   are extra and do not count.
7. **Never cover the data you are working on.** Tool panels dock beside the graph and the
   graph reflows. They do not float over it.
8. **Every number tells the truth.** Units on every quantity, digits sized by the uncertainty,
   the uncertainty always shown, and a stale result that looks different from a current one.
9. **Neutral core, specialist toolkits.** The general path speaks of columns, curves and fits.
   Spectroscopy is a menu of its own, one click away, not the frame for everything.
10. **Not a slideshow.** Density stays: dense tables, keyboard paths, 12–13 px text.
11. **Nothing lives only in a toast.** An action a toast offers (Plot it now, Read it
    differently, Undo) is also in a menu. At 1280×720 the Plot toast was gone twice before it
    could be used.
12. **What a graph shows is the graph's.** Original, processed or both is saved with each
    graph (each panel of a figure), and every export draws what the screen draws. In T9 the
    export showed something else.
13. **A default the app chose is said where it acts.** "Weighted by column C (SD)" beside the
    Fit button, not a switch already on and named nowhere (T3).
14. **Focus goes where the work is.** Bringing the worksheet forward puts the keyboard in its
    active cell (T13).
15. **Menus forgive a diagonal path.** With a menu open, another menu opens on hover only
    after the pointer rests 150 ms on its name; a click opens it at once. Today, aiming at
    File › New project hit Edit › Undo (T6).

## 3.2 Layout

Measured today (`measure.json`): the worksheet shows **0 data rows** on a first launch at
1280×720 and at 1366×768, and 6 at 1920×1080. Its header is 148 px: the letters plus five
label rows. After a Plot the graph is a **346 px strip** at 1366 px wide. The Explorer takes
250 px at every width.

The bars, top to bottom: menu bar 28 px, toolbar 40 (today 43), then the desk, the taskbar
30 (34) and the status bar 24 (26). At 1366×768 that leaves a 646 px desk.

```
1366×768, first launch: an empty project                  (to scale: spec/wireframe-1366.svg)
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Kurve  File Edit Data Plot Analysis Statistics Spectroscopy Window Help   Project name ▾│ 28
│ [Explorer] [Import][Export▾] [Undo][Redo] [Zoom][Pan][Mask][Label][Arrow][Shape▾] [Show │ 40
│  all] [Reverse X][Log Y][Grid]      (all but Explorer, Import, Undo, Redo disabled)       │
├────────────────────────────────────────┬─────────────────────────────────────────────────┤
│ Worksheet                              │ Graph 1                                     ? – │
│ A1 │ value or formula   Plot Find Lock │ Data Plot Analysis Statistics Spectroscopy  │O│P│B│
│ ⋯rows │ A (X)   │ B (Y)   │          │                                                 │
│ Long Name│      │         │          │      Type in the worksheet, or import a file    │
│ Units    │      │         │          │            [ Import… ]   [ Examples ▾ ]         │
│ 1        │      │         │          │                                                 │
│ …  22 data rows in view                │                                                 │
│ Count Sum Average Min Max              │                                                 │
├────────────────────────────────────────┴─────────────────────────────────────────────────┤
│ [Project name] [Worksheet] [Graph 1]                                                      │ 30
│ Click a cell and type · Saved in this browser                                             │ 24
└──────────────────────────────────────────────────────────────────────────────────────────┘
   worksheet 44 % (600 px)                    graph 56 % (766 px)

1366×768, working: columns plotted, a fit in the dock
├──────────────────────────┬──────────────────────────────────────┬────────────────────────┤
│ Worksheet  400 px        │ Graph 1                     ≥ 480 px │ [Fit][Results][History]│
│ 22 data rows in view     │  plot area 506 px wide (today 330)    │ Model [Straight line ▾]│
│                          │  · points, error bars, the line,     │ a, b with fix boxes    │
│                          │    "y = a + b·x, b = … ± …, R² = …"  │ Weighted by column C   │
│                          │                                      │ ▸ Advanced             │
│                          │                                      │ Reset       [Fit] Done │
├──────────────────────────┴──────────────────────────────────────┴────────────────────────┤
```

| | 1280×720 | 1366×768 | 1920×1080 |
|---|---|---|---|
| Project Explorer | a drawer (its button, Alt+1) | a drawer | docked, 220 px |
| First launch | Worksheet 44 % + Graph 56 % | the same | Explorer + Worksheet 680 + Graph |
| Working | Worksheet 300 · Graph ≥ 480 · Dock 360 | 400 · ≥ 480 · 380 | 220 · 520 · ≥ 760 · 420 |
| Worksheet data rows in view (today, first launch) | ≥ 18 (0) | ≥ 20 (0) | ≥ 32 (6) |

**Which windows open.** A first launch opens the Worksheet and the Graph side by side, and
nothing else. After an import, the same two: the new columns selected in the worksheet, the
graph showing them or offering Plot in its empty state (§3.7). The Overview opens only for
data that looks like a spectrum. History opens when asked, or as a dock tab after the first
processing step. A new graph shares the graph area, tiled, never narrower than 480 px; past
that, the older graphs are minimised to the taskbar.

**The dock** is one column on the right of the desk, holding the tool panels as tabs (Fit,
Results, Peaks, Integrate, History, Statistics, every processing tool, the Format graph panel).
Opening a panel takes the dock's width from the graph and the worksheet; closing it gives the
width back. Wider than 1100 px the dock reflows the graph; below that it is a drawer over the
right edge, with a pin to dock it. A tab can still be dragged out to float, as every window
can today, but floating is never the default. Below 860 px the phone layout stays as it is.

**The worksheet's header** is three rows: the letters, Long Name and Units (66 px; today 148).
Comments, F(x)= and Sparklines open from the "⋯ rows" corner and stay open per project; F(x)=
appears by itself when a column has a formula, and the formula bar always shows it. Rows are
22 px (today 25): 20 or more data rows in view at 1366×768, the minimum this spec sets.

**When space is short**, the Explorer is a drawer below 1600 px (today fixed at 250 px down to
1000 px); History lives in the dock, and a double-click on its tab gives it the desk for
reading, as T11 and T12 needed; the graph keeps 480 px, so the worksheet narrows to 300 px
first and then the dock becomes a drawer.

## 3.3 Information architecture

**The menu bar** (`spec/menus-after.txt`, every item). Marks: `~` renamed, `←` moved here,
`+` merged in, `↓` shown only when it can apply, `★` an existing command given a menu route,
`×` removed (approved). Of the 320 items today: 168 kept, 60 renamed, 57 moved, 19 merged, 6
hidden, 10 removed (MENU_DIFF.md).

```
File   New project · Import data… ^O · Copy from another project…~ · Examples ▸ · Export ▸ · Rename the project…~ · Delete the project…~
  Examples ▸ Infrared: overlapping bands · Raman: raw polystyrene (background, spikes) · Exponential decay (fluorescence)~   × Raman: one band (R2)
  Export ▸ Graph for a paper or slides…~ · Graph as SVG~ · Graph as PDF~ · Graph as EPS~ · Graph as PNG~ · Processed data and fit as CSV~ ·
           Original data as CSV~ · Report…~      × Processing steps as JSON (R3) · × All graphs as one figure ▸ (R6) · Copy… → Edit
Edit   Undo (what) ^Z · Redo ^Y · Copy ^C★ · Paste ^V★ · Clear Del★ · Find… ^F★ · Copy the graph as a picture+ · Copy the results table~   (Add a Y column → Data)
Data   Worksheet · Add a column+ · Fill ▸ · Sort the view ▸★ · Clean ▸ · Masks ▸ · Columns ▸~ · Show on the graph ▸ · Lock the original data~   (Import → File only)
  Fill ▸ Down ^D★ · Right ^R★ · Series… · Growth series… · Evenly between two values… · Row numbers… · Repeat a list… · Random numbers… · Continue the trend…
  Sort the view ▸ Ascending · Descending · Original order~
  Clean ▸ Crop…+ (opens on the range in view) · Leave out an X range…~ · Sort by X (as a step)~ · Average duplicate X · Resample to even spacing…   (spikes → Spectroscopy)
  Masks ▸ Mask points on the graph · Restore every masked point~
  Columns ▸ New column from the processed data~ · Copy with the same processing~ · Apply this processing to every column~ · Rename the column…~
  Show on the graph ▸ Original~ · Processed~ · Both~
Plot   Plot setup… · Plot the selected columns ▸ · New graph ▸← · Format graph… · Format a part ▸~ · Saved styles ▸~ · Plot type ▸ · Several curves ▸~ ·
       Axes ▸~ · Font ▸ · Legend ▸ · Annotate ▸ · Layout and colours… · Show all the data          (Open a graph → Window › Graphs)
  Plot the selected columns ▸ Plot setup… · Line · Symbols · Line + symbols · Drop lines~ · Columns · Area · Steps · Histogram · Box chart · Violin plot · Add to a graph ▸
  New graph ▸ With (active column) · With every column~ · One for each column~ · A figure, a panel for each column~ · A figure of panels… · A trend of the series↓
  Format a part ▸ X axis… · Y axis… · Second X axis…↓ · Second Y axis…↓ · Frame and grid… · Text and fonts…+ · Legend… · Lines and symbols…
  Saved styles ▸ (Kurve's own · Journal · Classic · Slides · Minimal · yours) · Save this style…~ · Give every graph a style ▸~
  Plot type ▸ Line · Symbols · Line + symbols · Drop lines~ · Columns · Area · Steps         (+ the toolbar's list)
  Several curves ▸ Overlay · Offset (waterfall) · Stacked panels · Two Y axes~ · Heat map   (+ the toolbar's list; Box, Violin → Plot the selected columns)
  Axes ▸ Reverse X~ · X scale ▸~ · Y scale ▸~+ (Logarithmic Y merged) · Grid lines   (Second axes, Breaks → the axis's right-click; Residuals → Analysis › Fit)
  Font ▸ (families) · Text and fonts…~ · Size of all the text: Small · Normal · Large · Larger · Largest   (Axis titles in italics → Format, Text and fonts)
  Legend ▸ Place ▸ (8 places) · Text in each curve's colour~ · Add a legend title…~
  Annotate ▸ Vertical line… · Horizontal line… · Text (click the graph)~ · Arrow · Box · Ellipse · Shade an X range · Inset of the zoomed region↓ ·
             Labels and lines…~ · Remove every annotation        (Find and mark peaks → Spectroscopy; Fitted peak labels → their right-click and the Fit panel)
Analysis  Fit ▸ · Results · Mathematics ▸← · Smooth and filter ▸← · Integrate…~+ · Python ▸←↓
  Fit ▸ Curve fit… · Peak fit… · New fit function… · Run the fit ^Enter · Residuals under the graph← · Fit every column…~↓ · Batch results↓ · Remove the fit
  Mathematics ▸ Scale and offset Y… · Scale and offset X… · Normalize… · Subtract or divide by another column…~ · Average with other columns…~ · Derivative…+ ·
                Cumulative integral… · Logarithm…
  Smooth and filter ▸ Smooth… · FFT filter…
  Python ▸ (until Python is used: under More) Python on the active column…~ · A new column with Python…~ · Python window   (Label the peaks → the Peaks panel)
Statistics  Descriptive statistics…+ (Integrate the visible range, Noise and S/N: sections of it) · Correlation between columns…~ · Histogram…~ (takes the selection)
Spectroscopy (new menu)  Overview of the spectrum…← · Remove cosmic-ray spikes…← · Subtract background…← · Find peaks…←+ · Name the peaks from known lines…← ·
                         X axis ▸ · Corrections ▸
  X axis ▸ Energy calibration… · Wavelength to Raman shift… · Convert X units… · Calibrate X on reference peaks…
  Corrections ▸ Transmittance to absorbance…+ · Kubelka–Munk…+ · Bose–Einstein correction…
Window  (windows in use) · Tool windows ▸~ · Project Explorer Alt+1 · Tile+ · Cascade · Minimise the others · Close the tool windows~ ·
        Restore the default arrangement · Graphs ▸~+ · Theme ▸        (New graph → Plot; Copy from another project → File; × Style ▸ (R1))
  Graphs ▸ (each graph) · Combine graphs…+ · Link the X zoom of the graphs+
Help   Kurve help F1 · Search help… · Getting started · Keyboard shortcuts ? · About processing~ · How Kurve computes · About Kurve
```

Why the bigger moves: Math folds into Analysis, as Origin's Analysis › Mathematics and Signal
Processing, so nine top menus stay nine. Spectroscopy gets a menu of its own, gathered from five
menus where it was mixed into the general path (principle 9). New graph moves to Plot: making a
graph is plotting, and T9 found the figure dialog under Window only by searching. Edit gains
Copy, Paste, Clear and Find from the worksheet's menu, because Persona A looks there first.

**The graph window's own bar (R5, kept)** repeats the menu bar, so it is the same menus, not a
second route: Data · Plot · Analysis · Statistics · Spectroscopy, in the menu bar's order and
names; then Original │ Processed │ Both (from the toolbar), the stage chip, and Python (↓ until
used). It costs one 30 px row per live graph.

**Toolbar:** Explorer │ Import · Export ▾ │ Undo · Redo │ Zoom · Pan · Mask · Label · Arrow ·
Shape ▾ │ Show all │ Reverse X · Log Y · Grid. Every button has a word at 1366 px and above,
an icon with a tooltip below (labels drop in stages, as `fitToolbar` does). Before there is
data, all but Explorer, Import, Undo and Redo are drawn disabled. Leaving it: Raw / Final /
Compare (to the graph's bar, as Original, Processed, Both), Add peak (to the Peak fit and
Peaks panels), Comment (shown when the project is shared), the plot-type and layout lists
(merged into Plot and the curve's right-click), Residuals (to Analysis › Fit and the Fit
panel).

**Right-click menus.** Each holds what belongs to the thing clicked, then "Add here", then
the graph's Format, Copy and Export. None repeats a Plot menu submenu, and none is taller than
22 rows. Today's runs to 116 items.

| Menu | Top level after |
|---|---|
| A curve | its name · colour swatches · Line, symbols and colour… · Plot type ▸ · Connect ▸ · Error bars ▸ (when it has them) · Fill between ▸↓ · Make it the active curve~ · Open in a new graph · Histogram of its values ‖ Add here ▸ (Vertical line at x · Horizontal line at y · Text · Arrow · Box · Ellipse · Shade an X range · A graph title) ‖ Format graph… · Copy the graph as a picture · Export ▸ |
| The empty plot | the Add here items, inline · Show all the data ‖ Format graph… · Copy the graph as a picture · Export ▸ |
| The fit curve | Fit curve · swatches · Line and colour… · 95% confidence band · 95% prediction band ‖ Format graph… · Copy · Export ▸ |
| Axis numbers | Scale ▸ · Where it is ▸ · Ticks ▸ · Numbers ▸ · Title ▸ · Break the axis… · A second axis in other units… · Format the axis… (Offset outward, Across from the axis and Edge by edge go to the Format panel) |
| Title, legend, legend entry, label, text, line, arrow, box | DESIGN.md's one text-menu order, unchanged; "Analyse this spectrum" becomes "Make it the active curve" |
| A worksheet cell | Copy · Paste · Clear · Insert a row above · Delete row n ‖ Plot the selected columns ▸ · Fill ▸ · Sort the view ▸ · Find… ‖ Mask this point · Select the whole column · Column options… |
| A column | Use as ▸ (X · Y · Error bars ▸ · Other data, not plotted~) · Active~ · Show on the graph · Its history and processing… ‖ Plot ▸ · Set column values (formula)… · Fill column with ▸ · Sort the view by this column~ ‖ Move ▸ · Align ▸ ‖ Delete column |

**Gone from the graph's right-click, all in Plot:** Graph ▸ (its "Add a title" moves to Add
here), Several spectra ▸, Font ▸, Legend ▸ (the legend's own menu keeps it), Find and mark
peaks…, Integrate bands…, and Lines, labels and legend….

The History, Explorer and figure menus keep their items under the glossary's names. The
Explorer's "Projects ▸" is merged into the project menu.

## 3.4 Dialog pattern

Two kinds. **A dialog** asks, then acts, and is modal: Import, Plot setup, Export, Fill, New
fit function, Add a line, Break the axis, A figure of panels, Combine graphs, Copy from another
project, the Rename dialogs. **A tool panel** previews live on the graph, so it docks (§3.2):
the 22 processing tools, Fit, Peaks, Integrate, Statistics, Results, History, and Format graph.

**One template.**

```
┌ Title ─────────────────────────────── ? × ┐   the name of what it does, not "Tool"
│ Essentials: at most 8 controls, one column, labels left, 440 px wide at most          │
│ (a preview inside only when the dialog makes something new: Plot setup's sketch,       │
│  Import's table, Export's page; a tool panel previews on the graph instead)            │
│ ▸ Advanced                 closed by default; remembered per browser                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Defaults   Help              (secondary, left)        [ Primary verb ]  [ Cancel ]      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**The button row is the same everywhere:** pinned to the bottom, secondary actions on the left;
on the right the **primary first**, named by its verb ("Import 3 columns", "Plot", "Fit", "Add
the step"), then **Cancel**, always rightmost. A panel that works rather than asks ends in
**Done** in Cancel's place (Fit · Done; Search again · Done). Enter presses the primary, Esc is
Cancel or Done. Primary first is Windows' order (Origin and Excel are Windows programs), and the
22 tools, Fit and Peaks use it already; today there are three orders (dialogs: Cancel then OK,
right; tools: OK then Cancel, left; panels: primary then Done). **The default state never
scrolls at 1366×768:** a panel's essentials fit in 520 px.

**To rebuild, worst first** (measured at 1366×768 with the IR example, `measure.json`):

| # | Window | Controls today | Scrolls today | Other | To do |
|---:|---|---:|---:|---|---|
| 1 | Format graph | 17–71 a page | 58–582 px on 4 of 5 pages | covers 44 % of the graph it previews | becomes a docked panel; at most 8 essentials a page, the rest under Advanced; the page list a column at ≥ 1600 px, a list at 1366 |
| 2 | Fit, Peak fit | 31 | 646 px | Fit disabled until "Use these N peaks", below the fold (T8) | Find: the threshold only, method, noise and limits under Advanced; the found peaks used at once; one shape for every peak at the top, the cards as rows |
| 3 | Peaks | 46 | 344 px | | where to look and the threshold; settings, known lines and On the graph under Advanced |
| 4 | Import | 15 | 142 px | | the column table and the preview fit; delimiter, decimal mark and first line under Advanced |
| 5 | Fit, Curve fit | 19 | 12 px | Gaussian by default for any data (T2, T7) | model, parameters, the weighting stated; bounds, X errors and method under Advanced |
| 6 | Export | 18 | — | | size, format, resolution; the rest under Advanced |
| 7 | Fill | 16 | — | | the kind and its two or three values; seed and stop under Advanced |
| 8 | Energy calibration, Calibrate X, Histogram, Raman shift tools | 6–10 | 23–92 px | | Advanced fold |
| 9 | Statistics, Batch, Python | 3–10 | — | float over 48–68 % of the graph | dock |
| 10 | Plot setup, New fit function, Add a line, the other tools | 4–21 | — | | button row only |

## 3.5 Design tokens

Measured today in the app's CSS: 18 font sizes, 23 radii, 27 spacing values, 81 custom
properties, 21 colours hard-coded outside the token blocks, and 119 colours in the script,
nearly all the figure's palettes. `spec/TOKEN_MAP.md` maps each to a token or says why it stays.

**Type: 6 sizes.**

| Token | Size | Role |
|---|---|---|
| `--fs-cap` | 11 px | caption: units, badges, row numbers, keys |
| `--fs-tab` | 12 px | table and label: cells, result tables, field labels, the status bar |
| `--fs-body` | 13 px | body: controls, menus, paragraphs |
| `--fs-title` | 14 px | window title |
| `--fs-head` | 16 px | heading: dialog titles, Help headings |
| `--fs-hero` | 20 px | the empty state, a Help article's title |

Weights 400 and 600 only (700 for the logo). Numbers in forms and tables use `--mono` with
tabular figures.

**Spacing: 8 steps**, `--sp-1` … `--sp-8` = 2 / 4 / 6 / 8 / 12 / 16 / 24 / 32 px; the nearest
step, ties down inside controls and up between blocks; 1 px hairlines stay; offsets over 32 px
tied to a measured size are layout, not spacing.

**Radii: 3.** `--r-s` 4 px (checkboxes, chips, cells, keys), `--r` 6 px (buttons, fields,
menus, toasts), `--r-l` 8 px (windows, dialogs, the dock); 50 % for round shapes (knobs,
swatches, pills) is a shape, not a step.

**Colour roles** (Bench, light / dark): Kurve's tokens today, all in `tokens.html`, plus four
new ones: `--ink-off` (disabled text), `--press` (a pressed fill), `--on-fill` (text on a status
fill), `--badge` (a badge's fill).

| Role | Tokens | Light | Dark | Worst ratio, light / dark (needs) |
|---|---|---|---|---|
| Surfaces, back to front | `--paper` `--chrome` `--well` `--panel` `--panel-2` `--panel-3` | #BCC6D2 … #FFFFFF | #06090E … #273345 | window edge 3.13 / 3.12 (3) |
| Text, primary | `--ink` | #0B1220 | #F2F5F9 | 11.79 / 7.80 (7, DESIGN.md) |
| Text, secondary | `--muted` | #364255 | #BAC4D1 | 7.86 / 7.23 (7), on resting surfaces |
| Text, disabled | `--ink-off` (new) | #56627A | #97A3B4 | 4.75 / 4.99 (4.5) |
| Border of a control | `--rule` | #717E90 | #6A788C | 3.25 / 3.18 (3) |
| Icons | `--faint` | #5F6C7E | #8D9AAC | 4.21 / 5.00 (3) |
| Accent; text on it | `--accent`, `--accent-ink` | #1D4ED8, #FFFFFF | #8CB2FF, #081022 | 6.70 / 8.96 (4.5) |
| Focus | `--focus` | #1D4ED8 | #8CB2FF | 5.28 / 7.39 (3) |
| Selection, highlight | `--sel`, `--hi`, `--ws-sel` | #D3E0FC, #C5D7FB, mix | #24375C, #2D4475, mix | ink on them 12.78 / 8.75 (7) |
| Danger, warning, success | `--bad`, `--warn`, `--ok` (+ `-bg`) | #B3261E, #7C4A03, #15603A | #FF8A70, #EDBA5A, #74CC98 | 5.27 / 6.37 (4.5) |
| Text on a status fill | `--on-fill` (new), `--badge` (new) | #FFFFFF, #7C4A03 | #0B1220, #EDBA5A | 6.54 / 8.13 (4.5). Today: white at 1.8–4.2 |

**One ink on a highlight:** on a hover, pressed, highlighted or selected surface every word
takes `--ink` (measured, `--muted` falls to 5.4–6.9:1 there). **All 120 pairs pass.**

**States** (shown in `tokens.html`):

| State | Look |
|---|---|
| rest | `--btn-bg`, edge `--rule` |
| hover | `--btn-bg-h`, edge `--ink-2` |
| pressed | `--press`, an inset shadow |
| focus | a 2 px `--focus` ring, 1 px off |
| on, chosen, in front | filled `--accent`, text `--accent-ink` |
| disabled | `--ink-off` text, a dashed `--rule-2` edge, no fill, no opacity |

No opacity: today disabled is opacity .40–.55 by control, which takes text below 4.5:1
unpredictably. Pressed differs from hover by fill (1.28:1 light, 1.37:1 dark) and by shadow.

**The data palette (curves): 8 hues, in worksheet order.** Kurve's "Distinct hues", with the
light violet lightened to #6250d6: light `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300
#6250d6 #e34948`, dark `#3987e5 #d95926 #199e70 #c98500 #d55181 #008300 #9085e9 #e66767`.
Validated with the six checks on the graph's #FFFFFF and #151C27: worst adjacent colour-blind
ΔE 9.1 light, 8.4 dark (needs 8); normal vision 19.6 / 19.3 (needs 15); three light slots are
below 3:1 on white, so the legend is always shown for two curves or more. Today's default fails
both themes (teal against green ΔE 8.5 for full colour vision in light; violet against
periwinkle 5.0 in dark). A colour stays with its column: the active curve is drawn heavier,
never recoloured (today it turns blue). Okabe–Ito, viridis and greys remain as choices; the fit
stays `--fit`, fitted peaks keep their warm scheme, and exports use the light set.

## 3.6 Terminology glossary

Every label, tooltip, toast and Help article uses these words. Spectroscopy words are right
inside the Spectroscopy menu and its panels (Peaks, Peak fit, Integrate, Overview, the
spectroscopy tools), and nowhere else.

| Word | Means | Where | Instead of |
|---|---|---|---|
| project | everything saved together: worksheet, graphs, fits, history | everywhere | analysis ("Untitled analysis" becomes "Untitled project") |
| worksheet | the grid of columns | everywhere | sheet, table |
| column | a column of the worksheet with its processing | the worksheet, Data, Analysis, History, Explorer | spectrum, spectra, data set |
| X column, Y column, error-bar column, other data | a column's use | the column menu, Plot setup, Import | "data (not a spectrum)" |
| curve | a column as drawn on a graph | the graph, its menus, Format, the legend | spectrum, series |
| active column / curve | the one the Fit, Results and tools work on | menus, History, status bar | analysed, "Being analysed" |
| original data | the values as typed or imported | the Original tab and view, History, exports | raw, recorded |
| processed data | the values after every processing step | the Processed tab and view, fits, exports | final |
| processing; a processing step | what is done to a column, one operation of it | History, Data › Columns, the tools | step (alone), steps |
| check code | the SHA-256 of the original data | the Original data box of the History, the original-data CSV | fingerprint, hash in titles |
| lock the original data | refuse changes to the original values | Data, the worksheet's lock | lock the raw data |
| graph | one plot window | everywhere, exports | figure (for one graph) |
| figure; panel | several graphs in one window; one graph in it | Plot › New graph, the figure's menus | layer |
| tool window; dock | a panel like Fit or History; the column on the right that holds them | Window, the dock | panels (for windows) |
| fit; curve fit; peak fit | a model fitted to a curve | Analysis › Fit, Results, the report | — |
| results; report | the numbers of a fit; the document that leaves the building | Results, File › Export | — |
| saved style | a named set of graph settings | Plot › Saved styles | format, formats |
| mask | leave points out of the fit (they stay in the data) | Data › Masks, the Mask tool | exclude, remove |
| spectrum, peak, band, background, spike, Raman shift, known line | spectroscopy's own terms | the Spectroscopy menu and its panels only | — |
| not counted as a peak | a candidate the finder set aside, with its reason | Peaks, Peak fit | turned down |
| series | the order or variable that a set of columns follows | Batch, trend graphs, heat map | — |

## 3.7 Defaults that fit the data

From the defaults audit (`FEATURE_INVENTORY.md` §3), to be built in Phase 4's slice 5.

- **Curve fit's model is suggested from the curve's shape.** A straight line when it is
  monotonic with little curvature, an exponential for a decay to an offset, a Gaussian for one
  clear peak. The suggestion is named beside the list.
- **Plot type follows density.** Symbols for a few points or uneven X, a line for many evenly
  spaced points. One rule for typing, importing and plotting.
- **Residuals:** off for a curve fit, on for a peak fit, one click in the Fit panel.
- **The weighting is stated by the Fit button.** Error bars name their column in the curve's
  Error bars menu.
- **Import:** a last header line of unit words becomes the Units row, with names from the line
  above; √N error bars only for counts named or formatted as counts; with no X-like column,
  every column is a Y against the row number.
- **The Overview and the peak items** appear for data that looks like a spectrum, by the test
  the Overview already makes.
- **Descriptive statistics** show n, mean, SD, SE, median, min and max. The spectral measures
  (noise σ, S/N, area, centroid) sit behind a switch that is on for spectra.
- **First launch:** the worksheet is the big window. The first example in the list is a
  general one; the Raman one-band example goes (R2).
- **The fit's range is all the data.** "Use the view" is a button, not an invisible default.
- **Axis titles typed by hand stay;** automatic ones follow the columns plotted. With several
  Y columns, the Y title is their shared unit.
- **A figure's "Share X"** shows ticked (and disabled) when it is automatic.
