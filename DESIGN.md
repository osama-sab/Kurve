# Kurve design notes

Why Kurve looks and behaves the way it does. Every round that changes the interface
updates this file: the decision, the reason, and where it lives in the code. CLAUDE.md
describes the code; this file describes the choices. The newest decisions are listed by
round at the end.

## Principles

1. **Do what Origin and Excel users already expect.** Kurve's users come from OriginLab
   and spreadsheets. Where those programs have a convention (a column dragged by its
   letter, a Plot Setup dialog, a formula bar, Fill › Series, a legend you type over),
   Kurve follows it unless there is a reason in this file not to.
2. **Readable on a poor screen.** Many people run Kurve on laptops and lab monitors with
   little contrast. Every surface must be told from its neighbour, every control must
   show its edge, and every state (on, chosen, in front) must be visible without colour
   vision or a good screen. See *Colour and contrast*.
3. **One way to do one thing, drawn the same everywhere.** The same text box for every text
   on the graph, the same right-click menu order for everything with text, the same rich
   text field in every dialog. Two implementations of one idea read as two ideas.
4. **The user decides.** Nothing is plotted, fitted or changed without being asked; an
   import goes into the worksheet; a window that does a job ends in **Done**.
5. **Windows carry little text.** A setting is explained by its tooltip and its Help
   article, not by paragraphs in the window. Windows keep labels, numbers, warnings about
   this data, and one-line empty states.
6. **Everything can be undone, and the report says everything the screen says.** Caveats
   come from one place (`fitWarnings`) so the exported report can never say less.

## Colour and contrast

Made for low-contrast displays (round of 2026-10-12, at the user's request: "introduce clear
differences in contrast and colors for the user to be able to make out the app features").

**Rules** (checked by `tools/contrast-test.mjs` in both themes and both styles):

| What | Against | At least |
|---|---|---|
| Words (`--ink`) and secondary words (`--muted`) | every panel, the chrome, title bars, buttons | 7:1 |
| Edges of buttons, fields, boxes, menus (`--rule`) | the surface they sit on | 3:1 |
| A window's edge (`--win-bd`) | the desk and the window's own panel | 3:1 |
| Focus ring, a switch that is off, a checkbox's edge, a slider's track | the panel | 3:1 |
| Text on the accent (on, chosen, in front) | the accent | 4.5:1 |
| Good news, warnings, errors | the panel | 4.5:1 |
| Words on a menu's highlight or a selection | that highlight | 7:1 |
| Disabled words (`--ink-off`) | every surface a control sits on | 4.5:1 |
| Words on a filled status shape (`--on-fill`) | `--ok`, `--warn`, `--bad`, `--badge` | 4.5:1 |

**Surfaces, from back to front** (Bench light; the other three sets follow the same order):

| Token | Bench light | Use |
|---|---|---|
| `--paper` | `#BCC6D2` | the desk: clearly darker than any window on it |
| `--chrome` | `#DFE5EC` | title bar, status bar, taskbar |
| `--well` | `#E6EBF1` | the area around a graph inside its window |
| `--panel` | `#FFFFFF` | window bodies, fields, menus |
| `--panel-2` / `--panel-3` | `#EEF2F6` / `#DDE3EA` | headers and groups / segmented controls, pressed |
| `--win-h-bg` | `#E4E9EF` | the title bar of a window not in front |
| `--win-h-act-bg` | the accent, `#1D4ED8` | the title bar of the window in front, white text |

**States are filled, not tinted.** A tint of the accent is invisible on a washed-out screen.
What is on, chosen or in front is filled with the accent and its text turns white: the
window in front's title bar, a toolbar switch that is on, the chosen button of a segmented
control, the front window's taskbar button, an open menu-bar menu. A menu's item under the
pointer gets a strong highlight (`--hi`) and a 3 px accent bar on its left.

**Text has two colours**, `--ink` and `--muted`; `--faint` is for icons and lines, never words.
Headings are sentence case in the text colour, not small grey capitals. **On a highlight, one
ink:** on a menu item under the pointer, a selection, a hovered or pressed button, every word is
`--ink`, since `--muted` falls to 5.4–6.9:1 there.

**States differ by more than a shade.** Rest, hover (`--btn-bg-h`, a darker edge), pressed
(`--press` and an inset shadow), focus (a 2 px `--focus` ring), on (filled with the accent) and
disabled (`--ink-off` words, a dashed `--rule-2` edge, no fill). Disabled is never opacity: at
.40–.55 it took words below 4.5:1, by an amount that depended on the control. A number or word
on a filled status shape (a step's number, a badge, the danger button) is `--on-fill`, white in
light and near-black in dark: white on dark mode's light green and amber read at 1.8–2.0:1.

**Sizes are tokens.** Six type sizes (11, 12, 13, 14, 16, 20 px), eight spacing steps (2, 4, 6, 8,
12, 16, 24, 32 px) and three radii (4, 6, 8 px) replaced 17 sizes, 36 spacing values and 13
radii (`ux/UX_SPEC.md` §3.5). What is left raw is justified in `ux/spec/TOKEN_MAP.md`: pills,
round shapes, a font sample, the symbol picker's glyphs, the x² button's script, two offsets.

**Styles and themes.** Bench (default): IBM Plex, blue for everything you can change.
Graphite: Geist, black and white, blue only for the keyboard focus; its "accent" is black in
light and near-white in dark, so the front window's title bar is black (or light) there.
Light and dark each have their own set. The data colours (`--data`, `--fit`…) are shared, so
a figure does not change with the style. Graphite's dark blocks set again every token its
light block sets (CSS specificity: see CLAUDE.md).

**Curves are coloured by worksheet order**, from eight hues that pass the colour-blind and
normal-vision checks on the graph's light and dark backgrounds (`ux/UX_SPEC.md` §3.5). The
earlier default drew the analysed curve in blue and the others in cool tints; teal and green, and
in dark violet and periwinkle, could not be told apart even with full colour vision, and a curve
changed colour when another was analysed. The analysed curve is now drawn heavier instead.

**The worksheet's grid** has its own line colour (`--ws-grid`, 1.5:1, as Excel's) so cells
show without competing with the data; the graph's grid (`--grid`) is part of the figure.

## Windows and the desk

- The desk is darker than the windows; every window has a dark 1 px edge; the window in front
  has a 2 px accent edge and a filled title bar. A graph that is live but not in front keeps
  a 3 px accent line under its title bar.
- Documents (graphs, the worksheet, trend graphs) always have a taskbar button; panels only
  while open or minimised. **The taskbar is the design system's** (DS_SPEC slice 1): the project
  switcher first, a white field with a folder and a chevron; the windows flat on the chrome; the
  front window a raised white key with a 20 px accent bar under it, other open ones a short grey
  bar, minimised ones none and their names lighter; Tile and Cascade together in a tray at the
  right. Before, every button was a raised box and the front one filled with the accent: the
  system's review of 25 October found a row of boxes noisier than the windows it names, and a
  white key reads as "in front" as surely as a fill.
- **The first screen is the worksheet, alone, across the desk.** A graph appears only when the
  user plots something: "I don't want to see a graph until I choose to plot". The empty graph
  that used to stand beside an empty worksheet said "nothing plotted yet" before anything had
  been typed, and took 56 % of the desk from the data. An import plots nothing either; its
  message offers *Plot them now*, and the status bar says *select columns in the worksheet and
  press Plot*. A file dropped on the window is still plotted at once: dropping it on the app is
  the choice. (Earlier: the worksheet and the graph side by side, 44 % and 56 %, after a first
  visit had opened History too and stacked it under a worksheet with no rows in view.)
- **Tool windows dock.** Fit, Results, Peaks, Integrate, History, Statistics, the Overview,
  Help, Discussion and the processing tools open as tabs in one column at the desk's right
  (360, 380 or 420 px by the screen's width), one shown at a time. The worksheet and the graph
  share what is left, so a tool never covers the graph it acts on: at 1366 px the graph beside
  the Fit window went from a 346 px strip, an eighth of it under the Fit window, to 552 px in
  full. Batch floats, being a worksheet of its own.
- **A drawer when the room is not there.** Below 1100 px, or when a 480 px graph and a 300 px
  worksheet would not fit beside it, the dock lies over the right of the desk (a shadow says
  it is on top) with a pin to put it beside them. Floating is always one drag away (a tab), or
  Undock, never the default; the window's dock button brings it back.
- **The dock is a tab strip the window hangs from** (the design system's Dock): a small *Tools*
  label, the tools not shown as icons alone (named by their tooltip), the one shown a raised
  tab with its name, its × and a 3 px accent cap, sharing the window's fill so tab and window
  read as one sheet. The docked window has no title bar of its own: its name is on the tab, and
  Help, Undock and Hide are at the strip's right. Before, a docked window had its own title bar
  under a row of named tabs, two headings for one window, and the tabs ran out of room at
  four.
- **The bars are thin**: toolbar 40, the dock's strip 36, taskbar 42 (the design system's: room
  for the raised key and its bar), status bar 24 px. The Project Explorer is
  220 px and a drawer below 1600 px, so at 1366 it no longer takes 250 px from every window.
- **New graphs keep 480 px.** A graph made beside the worksheet takes its share; otherwise it
  goes beside or below the graph in front, and when neither leaves 480 by 300 px it takes the
  old graph's place and the old one waits in the taskbar.
- **A window brought forward takes the keys**, as a desktop's does: restored from its taskbar
  button or chosen in the Window menu, the worksheet's active cell takes what is typed next
  (before, a minimised worksheet had lost the focus to the page, and typing after restoring it
  went nowhere). A window brought forward by the app itself (History opening on a first step)
  leaves the keys where they are, so it never takes them from a field being typed in.
- **The status bar answers questions** (the design system's slice 6), as Excel's does. While the
  pointer is on the graph its readout is the pointer's X and Y; off it, the numbers of what is
  selected: cells in the worksheet (their range, N, mean, SD, minimum and maximum), a curve (the
  same of its processed data), a band or a shaded range (its area with its error, where its peak
  is, its FWHM, its span). Each number is the one the window that has it shows, to its digits:
  the Statistics window's (which lists the cells selected and marks the curve selected), the
  Integrate window's for a band. Nothing selected, nothing said. The worksheet's own foot keeps
  its Count, Sum and Average, as a spreadsheet's does.
- **What to do next is said where the user looks.** Before data, the worksheet's foot and the
  status bar: type, paste or Import. With columns and nothing plotted: the status bar, the
  worksheet's *Plot* button, and the import's message. A graph closed, or one in a project made
  before this, still says "Nothing plotted yet" with Plot setup… when it is opened.

## Motion

The user found the interface's changes abrupt and asked for transitions "refined and smooth,
like Excel". Motion here says where something came from and went to; it never decorates.

- **Short and eased.** 90 ms for the worksheet's cursor, 120 to 180 ms for menus, dialogs and
  windows coming in, 140 ms going out, 200 to 220 ms for a window that moves or goes into the
  taskbar; one curve for things arriving (fast, then settling: `cubic-bezier(.2,.8,.2,1)`),
  an ease-in for things leaving.
- **Windows as a desktop's.** Opened, a window grows in from 97 %; closed, it fades; minimised,
  it shrinks into its taskbar button, and grows out of it when restored, so the button reads as
  where it went. Maximised, tiled, cascaded, or pushed aside by the dock or the Explorer, it
  glides from its old place (its content already at the new size, scaled, as the operating
  system does). Changing dock tabs cross-fades rather than growing.
- **The worksheet's cursor glides** from cell to cell, as Excel's animated cursor does, so the
  eye follows Enter, Tab and the arrows. A jump of more than a screen (Ctrl+End) is not
  animated: a frame flying over thousands of rows says nothing.
- **Menus, dialogs, pickers and messages** come in from 4 to 10 px away and fade; moving along
  the menu bar does not replay each menu's entrance; a message fades out. Groups that fold slide
  open where the browser can size them.
- **Only what the user asked for moves.** Nothing animates while a button is held (a drag, a
  resize: the window must stay under the pointer), when the browser is resized, on the first
  layout, or at phone width; more than twelve windows moving at once are simply put in place.
- **Off is a choice.** Preferences › Animations turns all of it off, and so does the system's
  reduced-motion setting; nothing depends on an animation to work, and a window on its way out
  takes no clicks.
- **A change survives the redraw it causes.** Most forms draw themselves again when a setting
  changes, so a switch flicked or a segmented choice clicked was replaced by a control already
  in its new state, and the slide or the fill never showed (the user: "some toggles don't have
  smooth transitions"). The control changed is remembered for half a second (`MKEEP`); when a
  redraw puts its twin in its place, the knob's slide or the choice's fill is played on the
  twin. A segmented choice cross-fades its fill rather than sliding a pill, which would stretch
  the words.

## The worksheet

Excel's and Origin's conventions, unless noted.

- **Selection**: a blue fill (24% accent) with a 2 px accent edge around the range; the active
  cell has a 2 px edge on white; the letters and row numbers of the selection are filled, and a
  whole selected column's letter is filled solid, so it is clear what *Plot* will take.
- **Moving columns**: drag the letters of selected columns left or right (a line shows where
  they land), or *Move* › Left, Right, To the start, To the end in the column menu. A spectrum
  keeps its X (its `xcol` is pinned when its nearest-left X would change), error bars and
  formulas follow by id. One undo step and an entry in the raw-data record.
- **Alignment**: three buttons on the bar and *Align* in the column menu; the same button again
  returns to automatic (numbers right). Stored per column in `p.wsAlign`.
- **Formula bar**: the value box beside the address is editable, as Excel's; a computed cell
  shows and edits its formula. The **F(x)=** cell opens for typing on a single click (it did
  nothing before, which read as broken).
- **Four header rows**: the letters, Long Name, Units and **F(x)=** (88 px; it was 148).
  Comments and Sparklines are behind the ⋯ in the corner, per project. F(x)= is always there
  (the ⋯ shows it ticked and fixed): it used to appear only once a column had a formula, so
  there were two places a formula seemed to live and the row came and went under the user's
  hand, which they found unintuitive and chose the visible row. A formula typed into a cell as
  in a spreadsheet (`=log10(B1)`) still works: it moves to the F(x)= row, still being typed,
  with a message that a letter is the whole column (Phase 1's user typed exactly that and was
  told it was not a number). Rows are 22 px: about 20 data rows in view at 1366 × 768 on a
  first visit, where there were none.
- **Insert and delete rows and columns** where a spreadsheet user looks for them: *Insert* and
  *Delete* in the cell's right-click menu (Row above, Row below, Column to the left, Column to
  the right, A column at the end, A sheet; Rows…, Columns…), the column menu's *Insert a column
  to the left / right* and *Delete*, the bar's **Insert** button (it was "+ Column", which only
  added at the end), Edit › Insert and Delete, and Excel's keys, Ctrl+Shift+= and Ctrl+−
  (whole columns selected: columns; else rows). The user could not find them: rows were only in
  the cell menu, by other names, and columns only at the end. As many as are selected are
  inserted, a new column is a Y (the role a typed column gets), each change one undo step and an
  entry in the original-data record; rows still need the data unlocked and unsorted, and are
  refused past the data's end, where the rows are empty already.
- **Fill** lives in the column's and the cell's right-click menus and in Data › Fill, not on the
  bar: a fill is something you do to a column. The fill handle on the selection's corner stays,
  as in Excel.
- **No colour swatches above the columns.** A spectrum's colour belongs to the graph (its
  Format page and right-click menu); a coloured chip in a header looked like noise.
- **Hide and show columns and rows**, as Excel's Hide and Unhide: from the column's, the cell's
  and the row number's menus, and Data › Hide and show. A hidden column is a thin marked strip,
  so the letters keep their places and the strip is something to double-click; hidden rows
  leave a mark on the next row number, and the numbers skip, so nothing looks lost. The foot
  says how many are hidden, with *Show*. Hiding is a view: hidden values are still plotted,
  fitted and exported (Excel's charts drop hidden cells, which surprises people more often than
  it helps). Kept with the project and undone like any change.
- **Formula suggestions**, as Excel's: a list under the formula as it is typed, of the columns
  (by letter, and by the start of their name, since people think "Absorbance", not "B"), x and
  i, every function with its arguments and what it does in a few words, and the constants;
  inside a function's brackets, its arguments with the one being typed in bold. Tab puts a
  suggestion in; Enter does only once an arrow has chosen, so Enter still means "keep the
  formula as typed". The user saw "only errors" while typing: a formula not finished yet is now
  said quietly, and only a mistake is red.
- **A double click is on the cell first pressed.** A click on a cell half out of view scrolls
  it in, as Excel's does, so the second press of a double click is no longer over the same spot
  of the cell; when the cell was cut by both the bottom and the right edge, it was over the fill
  handle, and a double click meant to edit filled the column down. Both presses count as one
  gesture on the first one's cell, as the person meant.
- **Original and Processed appear when there is something to tell apart.** A first user does
  not know what "raw" or "final" data are, and before any processing step the two are the same:
  the sheets' switch, the graph's Original / Processed / Both, Data › Show on the graph and the
  statistics' choice appear with the first step. The exports keep both names, where the
  difference matters.

## Plotting

Two routes, as in Origin: **select columns and press Plot** (a quick list of plot types and
layouts), or **Plot setup…** (Plot menu, the top of the quick list, and what Plot opens when
nothing is selected): kinds as pictures, the X column, the Y columns ticked, the target graph,
and a sketch of the result. Plotting is never automatic after an import from the dialog.

### Large data

A graph of 50 000 points or more was slow to zoom, pan and hover, and a curve's processing could
take seconds: the user asked for it to be made usable. Decided:

- **Draw what the screen can show.** Past 3000 points, a line keeps per column of pixels (half
  a pixel on a high-density screen) its first, lowest, highest and last point, in order (M4):
  the line drawn covers the same pixels as one through every point. Areas and steps the same;
  symbols one per spot of half a pixel; sticks per half column; Y error bars merged per half
  column where they overlap, their caps one per quarter-pixel spot, X bars one per pixel; a
  band per column at its widest; the residual panel as two paths. A drive compares the two
  drawings pixel by pixel: no pixel inked in one is blank in the other for lines, areas, steps,
  bands and zooms, and fewer than 0.2 % for symbols and error bars (edge shading differs, since
  hundreds of overlapping strokes darken an edge that one stroke shades). 200 000 points draw in
  about 40 ms (170 before), and ten turns of the wheel take 1.3 s where they took 9.
- **Never in an export.** SVG, PNG, PDF, EPS, the clipboard and the report draw every point;
  the data, the processing, the fits and the peak finder always use every point.
- **Work out once what each frame asks again.** Where each point is on the screen (per drawing,
  so a pointer move searches only the points near it), the mask, the fit's points and
  residuals, the data's extent, the worksheet's sparklines (four points per bucket of rows, in
  one pass). Moving the pointer with the Reader over 200 000 points went from about 8 ms a move
  to under 1 ms; a redraw with a fit and its residuals from about 200 ms to about 110.
- **What was quadratic is not.** The spike check walked a whole band from every noise maximum on
  it (four seconds to smooth 200 000 points; now 0.3 s); a model suggestion smoothed with a
  window per point; the peak finder compared each candidate with every earlier one to drop
  duplicates (fourteen seconds to open the Peaks window; now 1.3). And Statistics no longer fits
  the Overview's background to decide whether to show spectral measures (1.9 s; now 0.6). The tests now time 200 000 points (`tools/odd-test.mjs`).
- **The store is the next limit.** This browser keeps projects in localStorage, a few megabytes
  for all of them: three columns of 200 000 rows do not fit, and the status bar says Not saved.
  Moving projects to IndexedDB is on the roadmap.

### The Format pane

- **Docked and live, with no OK** (the design system's Format pane, slice 5). The Format dialog
  was a modal over the desk, its changes previewed on a working copy and kept by OK: the graph
  could not be clicked while it was open, and a change was one step from being thrown away by
  Cancel or Escape. It is now a tool window in the dock beside the graph. *Selected*, a list at
  its top, chooses what it sets (each curve and the fit, each axis, each part of the graph), and
  a click on the graph chooses it too: the pane turns to what is selected, when the selection
  changes, never on a redraw. Every change shows at once and is saved; a burst of changes (400 ms
  apart at most) is one undo step, and a burst is saved before anything else changes the project
  (an undo, another graph, the pane closed, the page left), so no change waits to be lost.
  Defaults, Saved styles and Use on every graph stay at its foot; Saved styles applies at once,
  with Undo in its toast. A redraw from a save leaves a field being typed in alone.
- **Typed or picked, as Excel does; sliders where the feel is the point.** Sizes, widths,
  lengths, offsets and spacings (a legend's line sample and row spacing, tick lengths, a
  frame's width, a font size) are a field with a list beside it (`comboHtml`): typed, picked
  from the usual values, or stepped through them with ↑ and ↓, and clamped to what makes sense.
  The user: "don't use sliders everywhere … a slider for opacity, on the other hand, makes
  total sense". Opacity and fill stay sliders.
- **Each kind of text folds** (the user found the six text styles in a row confusing). The Text
  and fonts page has the graph's font and size for all text, then a line per kind (title, axis
  titles, tick numbers, legend, labels, fitted peak labels) saying how it looks now (font, size,
  bold, italic, *its own* when set apart); open one to change it. What is open stays open
  across the dialog's redraws.
- **Rows line up.** A text bar is a row labelled *Font* in the label column like any setting,
  not a block of its own; the edge-by-edge picture keeps its size and its choices their width
  (they were stretched across the page); a link is a link in the value column, not a button
  floating on its own line; Add sits in the heading of the list it adds to.
- **What of the fit is drawn is chosen where the fit is made.** The Fit window's *On the graph*
  group switches the residuals, the confidence band (shaded), the prediction band (dashed) and,
  for a peak fit, each fitted peak's shading (the user: "why is there no setting to choose if I
  want a shading on the fitted curve or not?"); Analyze › Fit has the same switches.

## Fitting

The fit is set up in the docked Fit window, beside the live graph, never in a dialog: a
dialog makes the desk inert, and the graph is the fit's preview, as the small preview in
Origin's dialog is there. Origin's upper panel becomes the window's parts and its lower panel
a strip at the foot (`ux/spec/FIT_SPEC.md`). What Kurve lets you type into a fit is formulas,
never code.

- **Fit control** is a group closed by default, its values in its heading ("400 iterations ·
  tolerance 1e-12"), since most fits never need it. Its fields write the draft and update the
  group in place: redrawing the form on a change would take away the field just tabbed to.
- **The starting values are drawn.** While the Fit window is open the model at its starting
  values is a dashed curve over the data ("estimate"), as the peak fit's draft is: a guess can
  be judged before fitting, and *1 iteration* is watched moving towards the data.
- **Iterations** are listed as Origin's messages list them, the starting values as row 0. The
  list opens by itself only while a fit runs or after a single step; after an ordinary Fit it
  stays closed, its heading saying how many there were. Steps taken one at a time follow the
  same path as Fit, so the list reads as one run.
- **A long fit can be stopped.** It runs in slices of about 80 ms, listing its steps between
  them, with *Stop* in Fit's place. A stopped fit is not a result: nothing is saved, its last
  values become the starting values, and Fit carries on from them.
- **The footer keeps to one row** in the dock: Fit, 1 iteration, Guess, Done (a peak fit: Fit n
  peaks, Reset to estimates, Done). *Remove fit* is in the fit's summary, beside Results, with the
  fit it removes. The footer holds buttons only (the design system's rule: no loose text in a
  footer): how the fit is weighted is said by its switch, *Weight by Y error*, whose tooltip
  names the column, and *Fit every column…* is in Analyze › Fit and the Batch window.
- **Readouts, not sentences** (slice 7). The range is its two fields, *From view*, *All* and a
  readout of the points it holds ("81 points"); the suggestion is one word, *Suggested:* and the
  model as a button, its reason the tooltip, and nothing while it is the model chosen.
- **What Results reports is chosen before the fit**, as the design system's FitPanel has it:
  *In the results* switches (confidence intervals, analysis of variance, correlation matrix,
  covariance matrix, residual analysis; a peak fit adds every parameter), kept per browser.
  Intervals, correlation and residuals start on (what most readers look at); the analysis of
  variance and the covariance start off (what a statistician asks for). They choose what Results
  shows, not what is recorded: the report, the copied table and the CSV carry all of it.
- **Results reads as a journal prints it**: the value and its standard error in columns of their
  own, figures on tabular numerals, derived quantities under a *Derived* row, the statistics in
  a list beside the table (the residuals' scatter and the outlier limit with them; a long value,
  the fit control, takes the list's width under its name), the sections chosen open, never
  behind a disclosure arrow, and no paragraph at the foot. In a narrow Results (the dock, a
  phone) a parameter's meaning goes under its name, so its value and error stay in view.
- **A note is one line with its fix** (the system's Note): the number first ("1 outlier at
  x = 503.5 (studentised residual beyond ±3.57)."), the fix a small button at its end (*Mask*,
  *Fit again*, *Guess*, *Fit control*, *Limits*, *Show residuals*, *History*, *Go to its column*).
  What it says in full (the test, the limit, the advice) is its tooltip and the report's. Notes
  elsewhere follow: out-of-date peaks offer *Search again* (the Peaks window) or *Peaks window*
  (the History), the Fit window with no data *Import…*.

## Menus and the toolbar

The menu tree is `ux/spec/menus-after.txt`; `tools/ux/menucheck.py` compares the app's with it.

- **Menus in the order of the work** (the design system's slice 2): File, Edit, Data, Plot,
  Analyze, Figure, Publish, Window, Help. Data is the worksheet and what prepares it (cleaning,
  Baseline, Transform); Plot makes graphs and looks at them (View: zoom, pan, the Reader, the X–Y
  lines); Analyze measures (Fit, Peaks, Integrate, Signal processing, Calculus, Statistics, and
  Spectroscopy as one submenu); Figure is the graph's look (Format, saved styles, axes, font,
  legend, annotations); Publish is what leaves Kurve (every export, the report, the two copies).
  Never a menu for a kind of mathematics: someone who wants a baseline off their data looks in
  the stage they are at, not under "Mathematics" or "Spectroscopy", and a baseline, peaks and a
  linear detrend belong to any data, not only spectra. The last menu bar had nine menus too,
  but three were by subject (Analysis, Statistics, Spectroscopy) and a fourth, Graph, came and
  went with the graph, so the bar changed under the pointer; five of them had to be tried to
  find a command.
- **Find a command** (Ctrl+K, Help › Find a command…; the design system's command palette): a
  box over the desk that finds any command of the menu bar by its name, by the menu it is in,
  or by a word people use for it (*background* finds Subtract baseline… and Linear detrend…,
  *fourier* or *power spectrum* the FFT filter, *export* the Publish menu), grouped by menu,
  each with where it lives, so a search also teaches the menus. It runs what the menu item runs,
  so it can never do what the menus cannot. A command that cannot apply now is listed dimmed
  ("Not available now") and passed over by the keys, rather than left out: a search that finds
  nothing would say the command does not exist. A word for a command is matched when it is in
  the command's name or its menu's ("export" is Publish), and a phrase people use ("power
  spectrum") is kept whole. With nothing typed it lists the commands run last, else six places
  to start. On a phone the notes and the key hints give way to the names.
- **One place each, by what it is.** Making a graph is plotting (Plot › New graph); Window
  lists and arranges windows. Copying from another project is File's. Edit has the worksheet's
  Copy, Paste, Clear and Find, because a spreadsheet user looks there. A command that combines
  graphs already made sits in Window › Graphs beside Combine graphs… (A figure of panels…
  too, where T9 looked first).
- **Shown when it can apply**: Fit every column… with two columns or more, Batch results after
  a batch, a trend graph with several columns, the second axes' pages once they are on, the
  inset when zoomed, the Original / Processed switches once there is processing.
- **An ellipsis means more to come**: a dialog or a window that asks before it acts. Report and
  Histogram act at once and have none. A shortcut beside an item is a real one (Format graph…
  has no "Double-click": a double click on the plot shows all the data).
- **Tooltips name the thing**, with its shortcut ("Zoom", "Import (Ctrl+O)", "Help (F1)"),
  on the toolbar, the title bar, the window buttons, the taskbar and the dock. They used to
  explain ("Zoom: drag a box to zoom, click a point to select it (Esc returns here)"), and an
  explanation read on every hover is noise; what a tool does is said by the status bar's hint
  while it is on, and by Help. A setting's dotted hint (`.tipd`) still explains it.
- **Moving along the menu bar** opens the next menu only after the pointer rests on its name for
  150 ms: a pointer crossing the bar on its way into a submenu changed menus (Phase 1, T2).
- **The graph's tools only with a graph** (the user: "they shouldn't be there when I am using
  the worksheet and no graph is open"). The toolbar's graph group is there while a graph is on
  the desk and gone with the worksheet alone (`syncGraphTools`, `body.nograph`). The Graph menu
  that did the same for the menu bar went in slice 2: its pointer tools are in Plot › View and
  Figure › Annotate, its switches in Figure › Axes and Analyze › Fit. Plot › View and Figure stay
  on the bar and are greyed with no graph, so the bar keeps its shape; the graph window's own
  bar repeats Data, Plot, Analyze and Figure.
- **Reading values, two ways** (Origin's Data Reader and its screen reader's crosshair): the
  Reader snaps to the plotted point nearest the pointer and pins it on a click, with a card on
  the graph that names the curve, the row, X and Y, steps along the curve and between curves
  with the arrows, and finds a point by a typed X or Y; the X–Y lines are two lines dragged
  across the graph, the card giving every curve's Y at the vertical one and where each curve
  crosses the horizontal one, either line alone if asked. Both are pointer tools, so they leave
  the zoom and the selection alone, and neither writes to the project.
- **Toolbar**: Explorer │ Import, Export │ Undo, Redo │ Zoom, Pan, Mask, Label, Arrow, Shape,
  Reader, X–Y lines │ Show all │ Reverse X, Log Y, Grid. The switches are off until there is data. Comment shows
  in a shared project only (alone, Add here › A comment here…). What the graph shows, Original,
  Processed or Both, is on the graph window's own bar, beside the menus it repeats; the plot
  type and the layout are in Plot and a curve's right-click; the residual panel is switched in
  the Fit window and Analyze › Fit; Add a peak is a button in the peak fit's second part.
- **Right-click menus** hold what belongs to the thing clicked, then Add here, then Format
  graph…, Copy the graph as a picture and Export (the Publish list). A curve's menu needs
  the click on the curve (within 14 px of a point); elsewhere it is the plot's, with Add here
  inline. None repeats a Plot submenu; the axis menu leaves the outward offset and the edge
  across to the Format pane. The worksheet's column menu chooses a use (Use as › X, Y, Error
  bars, Other data) and the active column.
- **What is selected has its menu in the graph's bar** (the design system's contextual menu,
  slice 4): a click on a curve, on the fit's curve, on an axis's numbers, on a band or a shaded
  range, on an annotation or the legend selects it, outlines it on the graph (a glow in the focus
  colour, a dashed box round an axis's numbers), and puts its right-click menu, item for item, at
  the end of the graph's own bar: *Curve*, *Fit*, *Axis*, *Region*, *Text*… The right-click
  menus stay: the bar's button is the same menu for whoever does not right-click, or does not
  know there is one. A click on nothing, or Esc, lets go; a right-click selects what it is on. A
  whole column selected in the worksheet does the same for its curve, while the worksheet was
  the last place pressed or typed in, not while it is in front, since in front it can cover the
  graph whose bar it is. The button is the system's accent fill with the words in ink and an
  accent bar under them: the system's accent words on that fill are 5:1, short of the 7:1 words
  take here. A band and a shaded range share their region's commands (Zoom to it, Fit in this
  range, Integrate it), and the fit's curve got its own (Results, Show residuals, Remove fit).

## Text on the graph

### LaTeX, typeset by Kurve

Every text on the graph (titles, axis titles, legend entries and title, labels, text, the text
of lines, ranges, arrows and shapes, peak names and label templates) is written in a subset of
LaTeX: text outside `$…$` with `^{}`/`_{}` nested to any depth and `\commands`; maths inside
`$…$` with LaTeX's spacing and italics, fractions, roots, accents, `\left…\right`, fonts.

**Not KaTeX or MathJax**, on purpose: Kurve has no dependencies but fonts; the text must be
drawn into the figure's SVG and from there into PNG, PDF and EPS with the graph's own font
and size; and it must be measured to lay out margins. KaTeX renders HTML and MathML, which
cannot go into an SVG exported as a figure or into Kurve's PDF writer. The typesetter
(`==TEX:START==` block) parses into a tree, lays out boxes with the text's own font metrics,
and writes positioned text and rules. Nothing in it runs code; an unknown command is shown as
typed so a mistake is visible. The earlier markup could not nest (`PER_{log_{10}}` broke).

### Two ways to type it: formatted, or LaTeX

The user found the LaTeX field with its buttons and preview "unpolished", and asked for a
choice: LaTeX, or natural text with symbols and raised and lowered characters picked from a
large list, shown as in Word, with no renderer. So every rich field types either way, chosen by
its *LaTeX* button (or Preferences › Typing text), kept per browser:

- **Formatted** (the default): a contenteditable editor over the field (`.ned`) shows the text
  as it reads, raised and lowered characters raised and lowered, symbols as themselves. x² and
  x₂ (Ctrl+Shift+= and Ctrl+=) raise or lower the selection or what is typed next, and show
  whether the caret is raised; αΩ opens the symbols. No preview: what is in the field is what
  is drawn. Bold, italic and colour are not per letter (the text's style is set whole), so
  Ctrl+B and the like do nothing there rather than show something that would not be drawn.
- **LaTeX**: the source, with its preview under it, the buttons writing `^{}`/`_{}` and a
  symbol's command where LaTeX has a usual one.
- **One stored text.** Both keep the same text (with LaTeX), so a project typed one way opens
  the other, exports are unchanged and nothing migrates. `texToNat`/`natToTex` (in the TEX
  block, tested) convert, and a text written back draws exactly as it did. A text a word
  processor cannot show (maths, a fraction, a root, an accent, a font, a script on a script)
  stays in LaTeX and says so; a sub- then a superscript are written with `{}` between, so they
  follow one another as the field showed them; `{x}`, `{name}` and the other placeholders are
  kept as typed.
- **The input stays the field.** The editor writes the field's own input on every change and
  announces input and change as the input would, so every form reads it unchanged; focus sent
  to the input goes to the editor, and Enter in a one-line field enters it (a change, and OK in
  a dialog that takes Enter).
- **A large list of symbols** (about 240, by kind: Greek, units and letters, operators,
  relations, arrows, raised and lowered digits, fractions, brackets, punctuation, accented
  letters), searched by name (*alpha*, *degree*, *arrow*), with the hovered one named and its
  command shown; Shift+click picks several.

### One box for typing

`inlineBox` is the only in-place editor: a field over the text (formatted or LaTeX, as
chosen), the superscript, subscript, symbol and LaTeX buttons, a line showing the LaTeX
typeset as it will be drawn (formatted: only the keys), Enter to keep, Esc to leave, ⋯ for
every setting. Titles, legend entries, the legend's title, labels, text and line text all use
it. In dialogs, every rich field is `.rfield`: the field, the same four buttons, and in LaTeX
the same preview under it.

### One menu order

Everything with text has the same right-click menu, built by `textMenu`:

1. its name (a heading)
2. **Edit text** (Double-click)
3. **Size** › points, **Bold**, **Italic**, **Colour** › swatches and Automatic
4. what is its own (an axis title's place, a line's style and width, a label's mark, the
   legend's place and columns…)
5. **Format…**, its page of the Format pane
6. **Delete**, where it can be deleted

An axis title's Size, Bold, Italic and Colour change that axis's title only (`ax[k].tst`),
as Origin does; the style of every axis title stays on the Text and fonts page.

### The legend

Click the legend to select it: an outline round it and the entry clicked shaded. Click the
entry again (as in a file list), double-click it, or press Enter to type over it; ↑ and ↓ move
between the title and the entries; Esc lets go. An entry's text is its spectrum's legend
label, so the spectrum keeps its name and clearing the text brings the name back. Right-click
for Add a title, Hide this entry, and the legend's place, columns and frame.

### Lines and annotations

- The Format pane's Labels and lines page has **one Add button** with a menu (each kind with
  its icon), not a row of eight "+ chips" that read like tags on a form.
- **Add a line** is one dialog: direction (vertical, horizontal) as a segmented choice, the
  position in the axis's units, the text (its position, your own words with LaTeX and a
  preview, or none), and the line's colour, style and width.

## Words

One word for each thing, everywhere it is shown (UX_SPEC §3.6, checked by `tools/ux/terms.py`):

- **Column**, not spectrum, data set or series, for a column of the worksheet with its
  processing; **curve** for one drawn on a graph (its colour, the legend, overlaid curves).
  A column's use is **X**, **Y**, **error bars** or **other data (not plotted)**.
- **Active** column, not analysed.
- **Original** data (as typed or imported) and **processed** data (after every step), not raw
  and final: the worksheet's two sheets, the graph's view switch, the History's boxes, exports.
- **Check code**, not fingerprint, for the SHA-256 of the original data.
- **Tool window** (and the **dock**), not panel, for Fit, History, Peaks…; a **panel** is one
  graph of a figure.
- **Saved style**, not format, for a named set of graph settings; the Format pane keeps its
  name.
- **Untitled project**, not Untitled analysis.
- **Not counted as a peak**, not turned down, for a candidate the finder set aside.
- **Spectroscopy's words** (spectrum, band, background, spike, Raman shift, known line) belong
  to Analyze › Spectroscopy and its windows (Peaks, Peak fit, Integrate, Overview, the
  spectroscopy tools), where they are the right words, and nowhere else. The background step
  is *Subtract baseline* in Data › Baseline, since any data can have one; *Linear detrend…*
  is the same step with its straight line chosen.

- **No internal identifiers** in the interface (the design system): no hash in the worksheet's
  foot, no "in this browser" in the status bar. The check code is still in the History's
  Original data box, the report and the exports, where it is the record; the worksheet says
  "Original data changed" only when it no longer matches.
- **Real superscripts and subscripts.** Unicode's ⁻¹ ² ₀ sit too high and look clipped (the
  design system): text arriving in the page has them set as `<sup>` and `<sub>` (`supifyText`, a
  MutationObserver, never in a field, a list, code, the formatted editor, the symbol list or the
  graph's SVG), the graph typesets them as LaTeX's scripts (`texUni` in `richText`), and the
  report as HTML's (`supHtml`). The data keep the characters as typed.
- **Fields as wide as what they hold** (the review of 25 October): text fields 12em, numbers
  7em, lists as wide as their choices, a control in a form row starting at the row's left
  rather than stretching to its end. A form of stretched fields reads as one wide band; sized
  fields say how much each one takes.

Code keeps its names (`raw`, `final`, `p.raw`): renaming them would buy
nothing and break saved projects. Help's search words keep the old words too, so a person who
searches for "fingerprint" or "spectrum" still finds the article.

## Defaults

A default is the choice most people would make for **this** data, decided from the data
(UX_SPEC §3.7), not one setting for everyone. It is always shown, and one click changes it.
A choice made by hand, or kept in an older project, is never re-decided.

- **Plot type: Automatic.** A line for many evenly spaced points (500 or more, or 40 or more
  in order and evenly spaced): a spectrum, a time series. Symbols for a few or unevenly spaced
  points: a calibration, measurements. One rule for typing, pasting, importing and plotting.
  The curve's Plot type lists *Automatic* first, with what it picked.
- **Residuals** under a peak fit, where they show a missing component, and not under a curve
  fit, where they mostly take room from the graph. One switch in the Fit window.
- **The curve fit's model** is suggested from the points' shape, and the suggestion is named
  in words (it "changes quickly at first and then levels off"), so it reads as advice, not a
  verdict.
- **Say what is assumed.** The weighting is stated beside the Fit button; the Error bars menu
  names the column the bars come from.
- **The fit's range is all the data.** A range that followed the zoom changed a result without
  a word; *Use the view* is a button, and the range left out is shaded.
- **Import reads what people write:** a line of units under a line of names, groups side by
  side with no X, counts named as counts. Whole numbers alone are not counts.
- **Spectroscopy appears for spectra.** The Overview, *Label the peak*, and the statistics'
  noise, S/N and area are offered by themselves only for data that looks like a spectrum, by
  the Overview's own test. Analyze › Spectroscopy always has them.
- **Automatic titles follow the curves:** with several, their shared name or unit, else
  *Value*, never one curve's name for all of them.
- **A setting that is automatic shows its value:** a figure's Share X is ticked and fixed while
  the panels are in one column.

## Preferences and the history

- **Easy to find**: a gear at the right of the title bar, always there, beside Help and the
  theme; File › Preferences… (where Office keeps its Options), Edit › Preferences… (where Mac
  apps keep theirs) and Ctrl+,. One small dialog of switches, each taking effect at once.
- **The history can be off.** Some people do not want their work tracked. Off, Kurve keeps
  nothing from then on: no log of changes, no names or times on steps, no fit history, no
  record of the original data, and History does not open by itself. Only errors are logged, in
  this browser and in the project's log, so a problem can still be reported; Preferences lists
  them, with Copy and Clear. The processing steps stay: they are the processed data, not a
  record of it. A project's existing history can be cleared from the same place.
- **Per browser**, like the theme: a person's choice about their own tracking, not the
  project's; a colleague in a shared project keeps theirs.

## Help

An article per window, tool and step, opened by the **?** on every title bar or F1. The
LaTeX article lists what can be typed, with examples rendered beside their source.

## Decisions by round

### 2026-10-12: worksheet, plotting, LaTeX, legend, menus, contrast

From the user's review: columns could not be moved; selection shades were unclear; there was
no plot dialog; the F(x)= box did nothing on a click; values could not be centred; the text
markup could not nest and was confusing; the legend could not be clicked to edit; the axis
title's and the line label's menus differed; the add-a-line UI looked unprofessional; Fill sat
on the bar instead of the column's menu; colour swatches above the columns looked sloppy; the
colour scheme was disliked and hard to read on low-contrast displays.

Decided: column moves by dragging letters and from the menu; alignment; an editable formula
bar; F(x)= on a single click; a strong selection; Fill in the context menus; no swatches;
Plot setup; a LaTeX typesetter of Kurve's own with previews; one typing box; one menu order;
per-axis title styles; the legend selectable and typed over in place; one Add menu; a proper
line dialog; and the high-contrast palette above, enforced by `tools/contrast-test.mjs`.

### 2026-10-16: tokens and contrast (UX rework, Phase 4 slice 1)

From the UX spec (`ux/UX_SPEC.md`), measured in Phase 3: 17 type sizes, 36 spacing values and 13
radii in the CSS; disabled controls faded by opacity; white on light status fills in dark mode;
secondary words on highlights below 7:1; a default curve palette that fails colour-blind and
normal-vision checks. Decided: the type, spacing and radius tokens; `--ink-off`, `--press`,
`--on-fill` and `--badge`; one ink on a highlight; the validated palette in worksheet order.
`tools/contrast-test.mjs` checks the new roles and a disabled button as drawn.

### 2026-10-16: menus and toolbar (UX rework, Phase 4 slice 4)

From the Phase 1 walkthrough and the Phase 2 inventory: a menu bar that put spectroscopy in the
way of general work and New graph under Window; right-click menus of up to 120 items with
Export at the very bottom, off the screen at 1366 × 768; the same command under several names
in several places; a toolbar holding the plot type, the layout, Raw/Final/Compare, Residuals and
Add peak; the pointer crossing the menu bar changing menus. Decided: the nine menus above, a
Spectroscopy menu, short right-click menus that end in Format, Copy and Export, the toolbar
above, the menu-bar delay, and items hidden until they can apply. The approved removals (R1,
R2, R3, R6) wait for slice 7, and the processing tools keep their names until slice 3.

### 2026-10-16: layout and the dock (UX rework, Phase 4 slice 2)

From the Phase 3 measurements: no worksheet rows in view on a first visit at 1280 and 1366 px; a
graph squeezed to 346 px beside the worksheet after a Plot, then partly covered by the Fit
window; History open on a first visit; the Explorer taking 250 px at every width; an import
closing the graph. Decided: the two-window first screen, the dock with its drawer and pin,
thinner bars, the Explorer as a drawer below 1600 px, the three-row worksheet header with its ⋯,
22 px rows, the empty graph's Plot setup…, History in the dock with the first step, 480 px for
any graph, and a formula typed into a cell moving to the F(x)= row.

### 2026-10-16: words (UX rework, Phase 4 slice 3)

From the Phase 2 inventory and the Phase 3 glossary: one thing under several names (spectrum,
column, data set, series; raw, recorded, original; final, processed; fingerprint, hash), and
spectroscopy's words in general places, which told a person with a calibration line or a
survey that the app was not for them. Decided: the glossary's words in every label, tooltip,
toast, History box, report line and Help article (696 words off the glossary in the file's
prose before, 0 after), the two tools renamed (Leave out an X range…, Sort by X (as a step)),
and `tools/ux/terms.py` to keep it so.

### 2026-10-17: the user's review after slice 5

From the user: no Hide and Unhide for columns and rows; no suggestions for functions in the
formula row, only errors; transitions not yet "refined and smooth as something like Excel";
"raw and final" not understood by a first user, and wanted only when exporting; a history
switch in preferences, easy to find, that when off captures no history, only error logs; no
graph until the user chooses to plot, only a worksheet at the start; and Python, baked in, to
be removed. Decided: hiding as above; suggestions as above, with unfinished formulas said
quietly; the motion rules above; Original and Processed shown once there is processing (and
always in the exports); the Preferences dialog with the history switch; the worksheet alone on
the first screen and after an import; Python removed, its steps in old projects kept as stored
results. T1 takes four more clicks (select the two columns, Plot, Symbols): the cost of
plotting being the user's choice. No other task changed.

Then, from a question ("why can't the first graph be deleted?"): every graph can be deleted,
the first one too. It could not be because of how it is stored (the project's own plot
settings, which also hold every graph's labels), which is no reason to show the user. Deleting
it empties and closes it, and it is left out of every list until the next plot uses it; its
columns stay, Undo brings it back, and with no graph left the worksheet takes the desk.
A graph made after it starts clean: the old graph's comments say it was removed, and its
folder in the Explorer is not given to the new one, since a thing the user deleted must not
reappear on what replaced it.

### 2026-10-21: the curve fit, slice 1 (fit control)

From the user: replicate Origin's curve-fitting dialogs, in the docked Fit window and with
formulas rather than code. Slice 1 decided as above: Fit control closed with its values in
its heading; the starting values drawn dashed; the iterations listed, opening only while
running or stepping; Stop for a long fit, saving nothing; Remove fit moved into the fit's
summary when the new button made the footer two rows and covered the switch above it.

### 2026-10-22: graphs as one list (from the user's bug reports)

From the user: delete the first graph in the interface and in the project alike; no graph
until something is plotted, since a project may be worksheet calculations alone; two curves
drawn together that were meant to be apart; a graph lost when a curve was turned off. A project
starts with no graph and the worksheet across the desk; every Plot makes a graph or adds to
one, and every graph, the first too, is deleted the same way. A graph lists the curves it
shows and nothing else, and keeps one at least: taking off the last is deleting the graph,
which the message offers rather than leaving an empty frame. Taking the analysed curve off a
graph keeps that graph in front, with another of its curves analysed, so the desk does not
jump to another graph. A closed graph is never where a column goes: closing the graph in front
brings an open one forward, and a column shown with every graph closed gets a graph of its own.
"Not plotted" over a column means on no graph, not "not on the graph in front", which read as
false with several graphs.

### 2026-10-22: the curve fit's parameter grid (FIT_SPEC slice 2)

Origin spreads a parameter over two tabs (Parameters, Bounds); Kurve keeps one grid, a row per
parameter, because a limit is only read beside the value it limits. The dock is 360 to 420 px
wide, too narrow for nine columns, so there the grid shows one view at a time (Starting values,
Limits, Results, a segmented control above it); the fitted value sits beside the starts as
well, since that is what is compared after a fit. A wider Fit window (700 px or more, a
container query) shows every column and no switch. Each parameter says what it means under
its name, in the muted colour, so the grid needs no legend and Results says the same. A limit
is a field and a button: the button reads ≤ or <, the relation itself, rather than a word or a
tick, and clicking it changes it; the lowest's button follows its field and the highest's
precedes it, so a row reads "1 ≤ … ≤ 5". An empty field is the model's own limit, shown as its
placeholder; "none" is typed, because an empty field cannot mean two things. Nothing in the
grid redraws the form while it is typed in (the lesson of Fit control): a start outside its
limits is marked in place in the warning colour, and a parameter held by equal limits is said
under the grid; crossed limits are refused with a toast and the field put back, never kept
half-wrong. Digits are a list per parameter (Auto first) in the Results view, because they are
how the result is read; the exports keep every digit.

### 2026-10-22: sheets (from the user's question)

"We are limited to one worksheet per project, why not multiple?" The worksheet has sheets, as
a workbook has, rather than several worksheet windows: one grid stays live (its keys, its
formula bar, its selection), and sheets are what Excel and Origin users switch between by a
tab. The tabs sit under the grid, as Excel's do; the sheet shown is filled, as anything chosen
is; a double click renames, the right-click menu moves and deletes, + adds. A sheet is a
place, not a separate project: its columns are lettered from A, its rows and X columns are its
own, but graphs show columns from any sheet and the processing, fits and check code are the
project's. A column moved to another sheet keeps the X it is plotted against, so no graph
changes under the move. A file brought in beside data goes on a sheet of its own, named after
it, as Origin opens a book per file; the dialog offers the sheet shown instead. The two
views of the worksheet are now called views (Original, Processed), since "sheet" names a tab.

A value being typed stays open while its cell is scrolled out of view, as Excel's does: Esc
still cancels it, Enter, Tab and the arrows enter it, typing brings the cell back. Entering it
when it scrolled away (as the grid did) made a scroll an answer the user had not given.

### 2026-10-22: the curve fit's models (FIT_SPEC slice 3)

Twenty-five models do not fit a drop-down: a native list of that length is a wall of names
that says nothing of their shapes, cannot be searched, and in the dock is as tall as the
screen. The model is a button showing the model in use (its sketch and name) that opens a
list by kind, as the font picker does and in its popover, so one such list is open at a time
and the same things close it. Each model has a sketch drawn from typical values, because a
shape is recognised before a name is remembered (an extreme-value peak, a Gompertz rise), and
its formula under the name, in the formula's own face. The search box is focused when the list
opens and every word typed must match: the name, the formula, what the parameters mean, or
other names. Origin's names (ExpDec2, DoseResp, SineDamp) find a model but never name it: the
words on screen are Kurve's, and someone coming from Origin still finds what they knew. The
list scrolls to the model in use, ticked as a menu ticks a radio item; Enter takes the first
found, the arrows, Home and End move, Escape gives the focus back to the button. A polynomial
is one entry: its order is a list beside the button (1 to 9, 1 the straight line), since nine
rows of "Polynomial of order k" would bury the other kinds. A model that takes the logarithm
of x refuses X it cannot take in words before fitting, rather than letting the fit fail on a
NaN; the message says what to do (a range of X above 0).

### 2026-10-22: the fit's level and its residuals (FIT_SPEC slice 4)

A fit has one confidence level, and it is a way of reading the fit rather than a way of making
it: the intervals, the two bands and the outlier limit follow it, and changing it changes the
fit on screen at once (as its digits do), with one undo entry. It sits with the fit's options,
a list of the usual levels (90, 95, 99, 99.9) and Other… for any, so the common choice is one
click and an odd one (68.27) is still possible; a level outside 0 to 100 is refused in words.

The panel under the graph keeps one view, against X, because it shares the graph's X axis and
that is where a reader looks for where the model misses; it shows the kind of residual chosen.
The other views (against the fitted value, in the order recorded, as a histogram, on
probability paper, against the residual before) are a chart in Results, beside the numbers
they explain, as Origin puts its residual plots in the report sheet. Results' new parts (the
analysis of variance, the correlation and covariance, the residuals) first folded, so the
parameters stayed at the top of a short dock; since the design system's slice 7 they are chosen
before the fit and shown open (see Fitting), and the notes above the table name the outliers,
so the report does too.

An outlier is a point whose studentised deleted residual is past the t limit for the largest
of all the points (Bonferroni), not past a per-point 95% limit, which would flag one point in
twenty of perfectly good data and teach people to ignore the flag. Outliers are ringed on the
graph and in the chart, listed with their leverage, and masked in one step, which leaves the
fit out of date until it is fitted again: masking is the user's decision, refitting too.

The analysis costs a Jacobian, which for a peak fit of thousands of points is a third of a
second. It is worked out only while Results is open, and for a fit that heavy only when its
section is opened; the notes check for outliers only when the model is cheap (timed on one
sweep), so a fit never waits on its own diagnostics.

### 2026-10-23: two worksheet bugs the random user found

Both had been put down to load, since the fuzzer's seed 9 failed only when three runs shared the
machine; neither was about timing. A double click on a cell cut by the view's bottom and right
edges scrolled it in on the first press and landed the second on the fill handle (filling the
column down over recorded values): the second press now acts on the first's cell. And a
worksheet minimised and restored had no keyboard focus, so typing straight after went nowhere:
a window the user brings forward takes the keys. The fill handle also comes back at once after
Esc (it waited for the next redraw).

### 2026-10-23: the user's issues from before 19.10

Eight points from the user, each answered above: a Graph menu and the toolbar's graph group
only while a graph is on the desk; a Data reader and X–Y lines for reading values; the fit's
shading and bands switched in the Fit window; values typed or picked rather than slid; each
kind of text folded under its own line; formatted text or LaTeX, with a large list of symbols
and no preview for formatted text; transitions that survive the redraw they cause; boxes put in
their rows (the edge-by-edge choices, a lone Add, a link, the Fit window's range clipped to two
characters in the dock).

### 2026-10-23: the user's review: one formula row, insert, Plot setup, large data

The F(x)= row is always shown (the user's choice between it and formulas only in cells; typing
`=` in a cell still works). Insert and Delete for rows and columns where Excel has them. Plot
setup compared with Origin's, and a plan to close the gap (`ux/spec/PLOT_SPEC.md`: ranges,
which axis, which columns are the errors, curves on the graph, groups). Large data drawn as the
screen can show it, and what every frame asked again worked out once.

### 2026-10-29: Find X/Y (FIT_SPEC slice 5)

Reading a fit at a value is reading it, not making it, so Find X/Y is a part of Results, beside
the numbers it uses, rather than of the Fit window. It answers as the value is typed, as the
Reader does on the graph, rather than behind a button: two fields, *Y at X* and *X at Y*, each
with its answer beside it (under it in the dock). Decisions:

- **Y at X is the band at that X.** The value comes with its standard error and its interval at
  the fit's level, worked out as the confidence band is, so the number read and the shading seen
  never disagree. An X past the fit's points is answered and said to be extrapolated, since
  calibration curves are read just past their last standard.
- **X at Y is every X, not the first.** A peak, a wave or a polynomial takes a value more than
  once, and one answer would be a guess about which was meant. Each X has its error (the curve's
  there over its slope) and its interval; where the curve only touches the value (a peak's top
  typed exactly) the X has no error, and says so rather than showing an infinite one. A value never
  reached says what the curve does take there, which tells the reader what to type instead.
- **A column filled is values, recorded.** *Fill a column…* reads a column of the sheet the same
  way into new data columns beside it, as the Fill dialog writes a series: one undo step, an
  entry in the original-data record naming the fit and the column read. They do not follow a later
  fit; the fitted values and residuals that do are slice 6's.
- **In the results** has a *Find X/Y* switch, on, like the other parts: a person who never reads
  a fit at a value can put it away.

### 2026-10-29: the design system into the app, slice 10 (two displays)

The system's DetachedWindow and DisplayMenu, as DS_SPEC's decision 5 planned: the detached window
is a page the main window writes and keeps up to date, and the main window keeps the project,
its undo and its saving, so there is never a second copy of it. Decisions:

- **A graph is drawn there, a tool window is mirrored there.** The graph is the main window's
  drawing at the detached window's size, which zooms (the wheel), pans (a drag), shows everything
  (a double click) and reads the pointer's X and Y, as a second screen is for looking. A tool
  window's body is the original's HTML, copied after every change, and what is pressed, chosen or
  typed there is sent back to the original, which runs exactly the code it always runs: the two
  cannot disagree, and nothing had to be written twice.
- **What goes**: a graph (not a figure, whose panels are live cells), and the tool windows that
  are read more than typed into: Results, Statistics, Help, the Overview, Discussion. The
  worksheet, the History's flow chart and the forms of Fit, Peaks and the processing tools stay on
  the desk: their menus, pickers and drags open in the main window, which a copy cannot follow.
- **Live, then Paused.** The detached page notices on its own when the main window is gone
  (closed or reloaded) and says Paused, with Reconnect and Close; it never edits on its own.
- **Closing is returning.** The detached window's close, Return to desk, Ctrl+Shift+D there, or
  Window › Return all to desk puts the window back where it was; switching projects brings every
  one back first, and Preferences can offer to reopen them, one at a time, since a browser opens
  one window per click.
- **Where it is shows where you look for it**: the taskbar's button dashed, with no pill and the
  display's tag, its tooltip and the Window menu saying "on Display 2" or "in a window of its own";
  the Window menu's Open on display lists the screens where the browser can (it asks once, from a
  click), and the strip's list moves the window between them.

### 2026-10-29: the design system into the app, slice 9 (galleries drawn with the data)

The system's PlotGallery: choosing by the result, not by a name. Plot setup's kinds are cards
drawn with the columns ticked (the picture of a kind only while nothing is ticked), and the
sketch shows a card's kind while the pointer or the focus is on it. In the Format pane the
curves' colour scheme is chosen from cards of the graph's own curves, and Saved styles opens a
gallery of the graph drawn in each style; both show a card on the graph itself while it is
hovered or focused, and a click applies it (one undo step, as any change in the pane). The
preview is a copy of its own, never saved: a hover is a look, not a change. Figure › Saved styles
stays a menu (menus are lists; the gallery is where the look is chosen), and More… in the
gallery is that menu, for saving, renaming and deleting.

### 2026-10-29: the design system into the app, slice 8 (dialogs and windows)

The system's ImportDialog, ExportFigure, Preferences, ToolWindow, PeakFinder and EmptyState.
Decisions:

- **Detected is a tint, not a sentence.** The import's delimiter, decimal mark and first line
  of data are tinted when Kurve chose them, with one *Detected* key under them; a choice made by
  hand loses the tint and gets *Auto* beside it to go back. "detected Semicolon" beside each
  field said the same thing three times.
- **Replacing a project is not a peer of adding to it.** *Replace everything in this project*
  was a radio beside three safe choices; one slip lost the project's columns (undo aside). It
  is File › Replace the data…, which asks first, and the dialog it opens says it replaces in a
  note instead of offering choices. The three left are short: New sheet, Add to Sheet 1, New
  project, with the project's name beside *Put it in*, as the round on projects asked.
- **Facts are read-only fields, footers are buttons.** The export's pixel size and tick size
  are `.ro` fields where the settings that make them are; what each format is for is its
  button's tooltip; the import's and Preferences' footers lost their summary and "Kept in this
  browser" (Help says it, and Done's tooltip).
- **A tool window names its input**, the data the step reads (Original data, After smooth),
  not its position in a list (First, before…): a scientist thinks of what a step works on.
- **One or two words in the Peaks window**, the sense in the tooltip: Search, Settings, Find,
  Add peak, Rejected, Identify, Mark, Label; the footer Done, Fit…, Integrate, Labels… on one
  row in the dock. The finder's lists keep their long names for the log and the History, where
  they are read in a sentence ("found with local maxima, signal to noise at least 4").
  *Rejected* is the system's heading; the glossary's "not counted as a peak" stays the prose
  and the tooltip.
- **The empty desk has a headline.** A first visit is an empty worksheet; over it, as the
  system's EmptyState, *Import data*, one line, Import… and the examples, in a card the grid
  stays usable around, put away by the first press or key in the grid. The empty graph says
  the same.
- **Kept as Kurve has them**: the export's *Tick numbers* and *Lines and symbols* (the Format
  pane's words; the system's preview says "Tick labels" and "Line width", and symbols scale
  too), and *Formatted* for the text input (the word used everywhere else; the system's
  preview says "Rich text").

### 2026-10-29: the design system into the app, slice 7 (the Fit window and Results)

The system's FitPanel, Results and Note: the range a readout, the suggestion one word, *In the
results* switches before the fit, Results with the value and its error apart and its sections
open, notes of one line with their fixes. Two things found on the way. Results' parameter table
is also the report's, so the switch for the intervals would have taken them out of the report;
the report now asks for the whole table. And a screenshot of the dock showed the standard error
off its right edge, the parameter's name, unit and meaning on one line taking the width; in a
narrow Results the meaning goes under the name. The table's *Derived* row is the system's own
(small capitals, like the dock's *Tools* label), taken as its stylesheet has it.

### 2026-10-28: the design system into the app, slice 6 (the status bar answers questions)

The system's status bar has a readout of the selection's statistics; the app's readout was only
the pointer's place. It now measures what is selected when the pointer is off the graph. The
first version wrote its numbers to six digits and the Statistics window to five, and a test
comparing the two caught it: the same number twice must read the same, so each is written as its
window writes it. The worksheet's address above the grid is drawn after the selection is
painted, so the range is named from the selection itself.

### 2026-10-28: the design system into the app, slice 5 (the Format pane)

The Format dialog became the system's Format pane: a docked tool window, live, following what is
selected on the graph. Its working copy is kept for a burst of changes only, and every other
change to the project saves it first. One mistake on the way, found by a test: the pane was not
among the windows `renderAll` redraws, so after an undo it still showed the undone value, and the
next click put it back to what the graph already had; the burst then saved nothing and the undo
that followed took back the step before it.

### 2026-10-28: the design system into the app, slice 4 (what is selected has its menu)

The system's graph window grows a contextual menu after its Data, Plot, Analyze and Figure when
something is selected. The app had selections for annotations, the legend and bands, none for a
curve, the fit or an axis, and the fit's curve could not be clicked at all: a click on it was
read as a click near the data. A curve, the fit and an axis are now selected by a click (the fit
when its curve is nearer than any point), and each kind's menu is its right-click menu. Two
mistakes on the way: the Column menu first followed the window in front, and the worksheet in
front covered the graph whose bar held it (a test found it, clicking the button behind the
worksheet); and the system's accent words on the accent fill measured 5:1, so the words are ink.

### 2026-10-28: the design system into the app, slice 3 (Find a command)

The system has a command palette and the app had none: a command was found by trying menus.
Ctrl+K finds every item of the menu bar (about 250) by name, menu or a word for it, from a list
of the field's words (`CMDK_SYN`: baseline and background, Fourier and FFT, regression and fit,
cosmic ray and spike, …). Its first answers were judged by eye on twenty queries, and four were
wrong: *export* found "Save this style…" (save had been put among export's words) and not the
Publish menu, whose name the matching did not read; *power spectrum* found nothing (split into
two words); *fourier transform* found nothing (a word nowhere sinks the command, so with no
command having every word, one word may now be missing). A fifth was in slice 1: a superscript
set into a flex label became an item of its own, the gap of the flex box around it ("1/σ 2 )");
it is wrapped in a span there.

### 2026-10-28: the design system into the app, slice 2 (menus in the order of the work)

The system's menu bar is File, Edit, Data, Plot, Analyze, Figure, Publish, Window, Help, and
the app's had three menus by subject and a Graph menu that came and went. Every item kept a home
(the crawl before and after, compared leaf by leaf, and `menucheck.py` in both directions):
the Graph menu's tools went into Plot › View, Figure › Annotate, Figure › Axes and Analyze ›
Fit; Statistics and Spectroscopy became submenus of Analyze; Subtract background became Data ›
Baseline › Subtract baseline…, beside Linear detrend…; Find peaks… became Analyze › Peaks…;
File › Export and Edit's two copies became Publish. Help's menu paths follow.

### 2026-10-26: the design system into the app, slice 1 (the frame and the rules)

The user pointed at the Kurve design system (built from this repository, then reviewed on 25
October) and chose to bring the app up to it; `ux/spec/DS_SPEC.md` lists every difference and
ten slices. Slice 1: the review's stylesheet (fields as wide as their content, windows rounded
to 12 px and 9 in Graphite, the taskbar, the dock's strip, the project name as a field in the
title bar), tooltips that name, no internal identifiers in the interface (the worksheet's foot
says "81 rows · 3 columns", not a SHA-256; the status bar says "Saved", not where), and real
superscripts. Where the system and this file disagreed (the taskbar's filled front button), the
system won, and the entries above say why.

### 2026-10-17: defaults (UX rework, Phase 4 slice 5)

From the Phase 2 defaults audit and Phase 1 T2, T4, T6 and T8: a Gaussian offered for a
straight line, a units row taken for the names, the first of three groups made X and left
out of the statistics, a spectrum drawn as dots, residuals under every fit, a fit range that
silently followed the zoom, √N offered for ages, spectroscopy's measures for a survey.
Decided: the defaults above, each shown and one click from changed. T2, T6 and T8 each lost a
step (T8's was slice 4's one regression); no task got worse.
