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
7. **Information hygiene** (11.11, `ux/UX_SPEC.md` §3.8). A working window shows what was asked
   for and what judges it, nothing more: a setting only when it is not the usual one, no times,
   ids or counts of what is already listed, no line packing four half-labelled facts, no colour
   that does not say in words what it means. Everything else is in the report, the History and
   the tooltips. The user's words: the more useless text there is, the more cluttered the app
   looks and the worse it is to use.
8. **Kurve reports, the user judges** (12.11). An analysis shows numbers, never a verdict, a
   sentence of what they mean or advice: the user interprets. Wording kept to labels.

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
  the statistics' choice appears with the first step. (The graph's
  Original / Processed / Both and Data › Show on the graph went on 11.11: a graph shows the
  processed data, a step can go on a new graph, and the History's boxes show any stage.) The exports keep both names, where the
  difference matters.
- **The worksheet has no Original / Processed switch** (25.11, the user's report: it came back with
  the first step, a bar of two states to keep track of that nobody asked for). The worksheet holds
  the original data; a column's processed values are a view asked for from where the column is
  (its menu, Data › Processed values), and a chip on the bar says whose they are, with ✕ back, as
  the graph's stage chip does. One state on screen, named, with its way back.
- **A step goes where the work is** (25.11): spectra worked on together sit on one graph, so the
  Tool window's *Apply to* offers the curves of the graph in front beside the column and every
  column, and remembers the choice; the Project Explorer's selection adds *the ones chosen*. A
  command for several things at once is one undo step, as a command for one is.
- **Columns move like Excel's** (25.11): the empty columns past the last are a place a column can
  go, so Right and a drag reach them, leaving an empty column behind; a move never touches
  another sheet's columns.

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
- **The store was the next limit**, and is IndexedDB now (05.11, *Storage* below).
- **A typed value does not wait for the check code** (05.11). Typing into a million rows took
  1.5 s a value: the check code hashed the whole table, the status bar made a million points to
  count them, and the series was built again for one value. Decided: the check code keeps its
  definition (`sha256sum` of the exported lines) and, past 150 000 cells, is worked out in slices
  in the background; the record says *working it out…* meanwhile, and an export waits for it,
  since what leaves the building must be whole. The status bar counts without making points, and
  a few values typed over change the series of before. 70 ms a value now.
- **Only what is in view is drawn** (05.11). When X runs one way (as a scan's does), a curve
  reads the points in view and two beyond each side, so a line leaves the frame as it would; its
  per-pixel decimation is made as the points are read, with no pair made for each; the automatic
  view is worked out once per list of points. A million points: about 35 ms for the whole curve
  (118 before), a few for a zoom into it. Exports still draw every point.
- **Every row can be reached** (05.11). Browsers lay out nothing taller than about 2²⁵ px; a
  sheet of 1.6 million rows at 22 px is taller, and its last rows could not be scrolled to. Past
  15 000 000 px the scroll bar stands for the rows in proportion, as large spreadsheets do: a
  pixel of scrolling is more than a row, and every row is reachable by the bar, the wheel and the
  keys.

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
  inset when zoomed, the Original / Processed sheets once there is processing.
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
  in a shared project only (alone, Add here › A comment here…). Which curves the graph draws is
  *Curves* on the graph window's own bar, beside the menus it repeats; the plot
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

### 2026-10-29: what each curve of a graph uses (PLOT_SPEC slice 1)

The user asked why the range a curve draws and its axis could not be chosen, as in Origin's
Plot Setup. This slice gives each curve on a graph three things of its own; the dialog that sets
them all at once is slice 2.

- **A curve's range is the graph's, not the data's.** Rows from and to, or X from and to, chosen
  in *Range…* on the curve's right-click: the graph draws only that and fits its axes to it if
  asked, while the data, the processing, the fit and the other graphs are untouched (a crop step
  is still how the data change). By X is offered only where X rises or falls steadily, as in
  Origin; rows are counted as the worksheet shows them.
- **Any overlaid curve can take the right axis**, not only "every curve but the active one" (the
  *Two Y axes* layout, which stays as it was: an old project draws as before). The active curve
  stays on the left, so the left axis always has the curve the tools work on. The legend says
  left and right as soon as there are two axes.
- **Labels from a column** beside each point, in the labels' text style: a sample number or a
  temperature where the point is, the thing Origin's L designation does.
- All three are kept on the graph (`use`), undone with it, left out of saved styles and of a new
  graph's look, and dropped on opening when they no longer read.

### 2026-11-28: the bug bash on workbooks, imports and the subject (QUALITY_SPEC S.6)

Six scripts did what people do with S.3 to S.5 (files of every kind at once, workbooks renamed, moved and deleted, the Explorer's
gestures, odd subjects, two tabs at once) and a lab day of 40 minutes leant on them. What they found decided these:

- **One subject includes a step waiting to be applied.** With Subtract baseline open on one column, a curve clicked elsewhere made
  the status bar name it while the step stayed on the first: two subjects on one screen, the class of the 27.11 reports. The
  waiting step goes with the subject, as the Tool window's own Column list moves it.
- **After an import, what is in front is what is active.** Forty files as forty workbooks left the last file's in front with the
  grid and the first file's column active. The first file's workbook comes forward; where the next files go follows it.
- **On a phone the subject comes first.** The status bar squeezed *Working on …* to nothing at 390 px; below 520 px the point count
  and fit state give way to it (the graph and Results say them).
- **An undo step has a line in the log.** Making, renaming, deleting and moving folders could be undone but left no line, so the
  record and Edit › Undo list disagreed. A refusal says why where it is typed (a name taken), never in silence.
- **What another window shows is drawn again only when it changed.** With forty workbooks every save redrew 39 pictures of
  sheets nobody was looking at: 300 ms a save. A picture keeps what it was drawn from and is redrawn when that changes.
- **Two tabs' changes meet field by field, and in the order one of them chose.** Making the first workbook stamps every sheet with
  it; a merge that compared whole sheets took that stamp for a change and lost the other tab's rename, and an undo could not take
  a rename back. A sheet changed in both keeps each field from the tab that changed it, and the tab that reordered a list leads its
  order, both in the store and in undo.

### 2026-11-28: one subject for every command (QUALITY_SPEC S.5, SUBJECT_SPEC)

- **What a command acts on is what the person last chose, wherever they chose it.** A curve clicked on the graph, a column
  selected in the worksheet, a graph opened in the Explorer: each makes its column the one every command reads. The reports of
  27.11 came from a command acting on a column nobody was looking at.
- **The status bar says it**, always, at its left: *Working on Intensity (B_01!B)*. A command never has to be run to find out.
- **Choosing is not a change.** Nothing to undo, no line in the log, no message: an undo takes back what was done, not where the
  person looked. The worksheet's choice is taken once its selection rests, so arrows through the grid cost nothing.
- **Choosing never moves a window.** The graph in front stays in front when the column chosen is not on it, and shows no draft or
  estimate over curves that are not the column's; the windows that work on a graph (Fit, Peaks, Integrate) bring one that shows the
  column when they open, as they are commands.

### 2026-11-28: many files at once (QUALITY_SPEC S.4, IMPORT_SPEC)

- **Where each file goes is said before it goes.** The dialog for several files lists them with the sheet, workbook and
  folder each goes into, and draws the project's tree as it will be: the person reads the result, not a list of options, and
  says yes. The user asked how to put many files into several sheets cleanly; a move per sheet afterwards was the answer before.
- **An arrangement is one click; a field typed is an exception.** Grouping by name, by a header field or by the folders they
  came in fills every row; what is typed on a row wins, is marked, and survives a change of arrangement, as a cell typed over a
  formula would be told apart. Rows ticked are typed together, as a spreadsheet fills a selection.
- **A name that exists means that thing.** Typing a sheet's or a workbook's name puts the file there and fixes the rest of its
  row; a new name makes it. No row can ask for a sheet in a workbook it is not in. A sheet made by an arrangement is always new
  (data are never mixed by a coincidence of names); a workbook or a folder of the same name in the same place is reused.
- **A drop asks nothing.** Files dropped on the window go by the arrangement the project used last; the dialog is for when
  there is something to decide.
- **A folder is a folder.** Imported, its subfolders become folders of the project, each with a workbook, in the order of the
  paths, as a file manager lists them.

### 2026-11-28: workbooks (QUALITY_SPEC S.3, BOOK_SPEC)

- **A project holds workbooks, as Origin's and Excel's.** The user asked why sheets in different folders shared one window's
  tabs; a sheet belongs to a workbook, and a workbook is a window with its own sheets' tabs, filed in a folder as a whole. A
  project starts with one (Book 1, the worksheet window), so a project of one workbook looks as it always did.
- **A workbook is data; its window is its view.** Which sheets are together is the project's (undone, merged across tabs,
  saved in a file), not this browser's layout, as a sheet's own window was; a sheet that had one is offered as a workbook of its
  own, never moved without asking.
- **Where a new sheet goes is one rule, the folder rule's twin.** The workbook in front, unless the Explorer was the last place
  pressed and its selection is in another folder: then that folder's workbook, or one made there. So *the sheet made with +
  while a subfolder is selected goes into it* (27.11) still holds, now by its workbook, and a press in a window (its tabs and bar
  aside) makes that window's workbook the place again.
- **A sheet still called Sheet 3 that held nothing takes the name of the file that fills it**, however the file came: the name a
  sheet was made with is a placeholder, as its empty columns are.
- **Moving a sheet is a drag of its tab**, onto another workbook's window or taskbar button, as Excel moves a sheet between
  workbooks; the tab's menu says the same in words (*Move to workbook ›*). A formula reads a sheet by its name, which moving
  never changes, so nothing breaks.
- **A workbook's window minimises, never closes**, as the worksheet's never did; a workbook goes only when it is deleted, or
  its last sheet leaves it.
- **Older projects keep their screen**: each folder's sheets become a workbook in that folder, the top level's Book 1.

### 2026-11-27: the user's reports: folders, one click, messages, what a command acts on

- **What is made goes into the folder selected, and nothing else moves.** One rule in the save, not a call in each command: a
  sheet made by the worksheet's +, a graph, a trend graph, a matrix book or a file's sheet goes into the folder selected in the
  Explorer (or the folder of the item selected), as Origin's new windows go into the active folder. An import adds to a sheet
  without moving it: a sheet is where its user put it. A folder's right-click has *New sheet here* and *Import files here…*.
- **An import replaces only a blank project.** Sheets, folders, graphs or an analysis made before the first file are the user's
  plan for it; the file goes into them, and the dialog offers New sheet, Add to and New project as beside data.
- **One click opens.** A sheet, a graph, a matrix book or a trend graph opens on one click in the Explorer, as in every other list
  of Kurve and in a file manager's tree; the keys stay in the tree. A folder is selected by a click and opened or closed by a double
  click or its arrow; Ctrl and Shift build a selection and open nothing.
- **A command acts on what is selected.** While the worksheet is the last place worked in and its selection holds one Y column, the
  menus' commands act on that column (it becomes the active one, quietly: choosing is not a change, so no undo step and no message).
  A press on the menus, the toolbar or a dialog does not count as working somewhere else.
- **Two columns of one name are named apart by where they are.** "Intensity (s2!B)" wherever a column is named (lists, the legend,
  messages, the log), only when another Y column has the same name: files of one instrument all call their columns the same.
- **Messages after an action are quiet by default** (Preferences › Messages). What only reports that something was done (an import,
  a plot, a step recorded, graphs merged) is written in the status bar for a few seconds with its button (Undo, Plot…); a warning,
  a refusal or an error pops up as before. The user found the message after every import in the way; a refusal that went to the
  status bar would leave a command that did nothing looking as if it had.
- **Combine onto a new graph takes every graph**, the one in front too.
- And the way of working changes (ux/spec/QUALITY_SPEC.md): stories through the interface first, lived-in projects, invariants
  after every action, one rule in one place, done meaning used; then workbooks (S.3) and an import of many files that puts each
  where it belongs (S.4).

### 2026-11-27: Vectors and radar charts (PLOT2_SPEC 7.5)

- **Arrows are a way of drawing a curve.** A curve's arrows come from two more columns read in its rows (an angle and a length, or
  a second point), as a colour comes from a colour column; so the curve keeps its axes, colour, undo and export, and *Draw as a
  curve again* takes the arrows away. The angle is on the graph as drawn, counterclockwise from X, so the picture shows the angle
  the column holds whatever the axes' units.
- **One scale for every arrow, and its key.** Lengths are drawn at one scale for the whole graph (automatic: the longest a twelfth
  of the plot), so two arrows compare at a glance; the key in the corner says what length an arrow of its size is. A scale typed is
  pixels a unit, the only measure a screen and a page share.
- **A radar chart is rows against curves.** Each row a spoke and each curve a polygon (Origin's way), or the other way round; one
  range for every spoke so the polygons compare, or each spoke its own (said under its name) when the variables are of different
  kinds. A polygon with a value missing is left open, not closed across the gap or filled as if the value were zero.

### 2026-11-27: Ternary graphs (PLOT2_SPEC 7.4)

- **A curve with two more columns.** A ternary curve is a column of values (its first part) and two columns read in the same rows
  (its B and C), as a coloured curve has its colour column; so it is plotted, styled and undone as any curve, and Plot setup marks B
  and C as it marks a colour or a size. Three columns chosen (or six…) are grouped by threes at once, from Plot's menu or when
  Ternary is chosen in Plot setup: choosing the columns again as B and C was repeating oneself.
- **Symbols unless asked.** The rows of a composition have no order, so a ternary curve is drawn as symbols whatever Automatic would
  pick from its X; lines only when the curve's own type says so (a path through compositions).
- **What has no place is said.** A row with a part below zero, a part missing or a sum of zero is left out, and the graph says how
  many under the triangle; a curve whose B or C has gone says so rather than vanishing.
- **The corners name the parts.** Each corner is titled by its part's column (typed over in place, as any axis title), and each
  part's numbers rise along one side towards its corner: anticlockwise or clockwise, the two ways ternary diagrams are read.
- **The whole triangle, always.** A ternary graph has no zoom or pan: the triangle is the whole of what the parts can be.

### 2026-11-27: Polar graphs (PLOT2_SPEC 7.3)

- **A layout, not a kind of axis.** A polar graph is a graph's layout, as a pie is, so any curve (or a matrix) can be drawn in it
  and back, its curves keep their colours, symbols, lines and error bars, and the Format pane's Layout page has its settings. Origin's
  polar plot is its own template; here it is the same graph seen in other coordinates.
- **The circles and spokes are the axes.** They are drawn by their own switches (*Circles*, *Spokes*), not the toolbar's Grid,
  which is off by default: a polar graph without them cannot be read.
- **The radius's numbers make room.** They go along a spoke between two (along a sector's first edge), and one that would sit on
  the last kept or on an angle's label is left out, so a small graph shows fewer numbers rather than a pile of them.
- **The pointer's tools keep their meaning.** The wheel zooms (here the radius at the rim, the only range a circle has), the Pan
  tool moves (here it turns the circle, the zero with it), a double-click shows everything; the status bar reads θ and r.
- **A line goes the short way round.** Points at 350° and 10° are neighbours: their line crosses the zero, never the whole circle,
  and every line is drawn in pieces of 3° at most, so a constant radius is an arc, in an export too.

### 2026-11-27: Statistical charts (PLOT2_SPEC 7.2)

- **A chart is an analysis that draws.** A control chart, a Pareto chart, a Bland–Altman plot, a forest plot and a Q–Q plot are each
  an analysis with a result sheet and a report, as the statistics are; the graph is drawn from the sheet's columns by the report's
  button. So the numbers are in the worksheet and the report, follow their data, are undone in one step, and the graph is an
  ordinary graph (formatted, exported, put in a figure) rather than a special picture.
- **Numbers, not verdicts** (principle 8). A control chart rings the points that break a rule and writes the rule's number beside
  each; nothing says a process is in or out of control. A Bland–Altman plot gives the bias and the limits with their intervals and
  no "agreement is good"; a forest plot gives Q, I² and τ² and no "heterogeneous".
- **The limits look like limits.** Centre lines green, limits red and dashed, as every quality chart draws them; limits that change
  with the subgroup's size are steps, not lines between points. Two charts (X̄ and R) are one figure sharing X, with the legends
  outside the plot so no point is hidden.
- **A dialog's lists start from what is ticked.** Choosing the columns for a role (Method A, Estimates, Values) starts from the
  columns ticked in the dialog's list, in order; ticking and then choosing them again was repeating oneself.
- **Graphs made together take their room together.** A figure made of graphs that were just plotted takes the space their windows
  had, not the half of one, and its first panel is in hand.
- **A heat map shows its trees beside it.** The clustered rows and columns of a heat map only mean something next to the
  dendrograms that ordered them; the figure lines each leaf up with its row or column (the axes' limits at the cells' edges, the
  side tree's root at the left), and the map's colours run cool to warm about zero, since the values are scaled.

### 2026-11-26: Charts of categories (PLOT2_SPEC 7.1)

- **New kinds are layouts.** A pie, a dot plot, means and columns by category are a graph's layout, as the box chart is, so the
  Format pane, saved styles, figures, every export, undo and the History treat them as any graph; the curves keep their data.
- **A pie says what it can about each slice, and no more.** Labels go inside a slice only when their whole box fits in it (a
  test of the box's corners, not of the arc's length), else outside with a leader, the labels on each side pushed apart so none
  overlap; the legend is shown only when the labels do not name the slices (information hygiene: the same names twice are noise).
  Several rings are named under the chart, since nothing else says which is which. Words on a slice are dark or white by the
  slice's luminance, with no halo.
- **A slice is pulled out by a double-click**, the gesture that edits in place everywhere else on the graph; its right-click says
  so. A pie has no axes, so the zoom, pan, mask and the readers do nothing on it rather than something odd.
- **What is aggregated is said.** A chart of means or columns names its statistic and interval on the Y axis ("Mean of Yield
  (t/ha), 95 % interval") and in each tooltip; an interval that cannot be had (one value) is said, not drawn as nothing.
- **A beeswarm that cannot fit is not a beeswarm.** Past 1.6 times its room a swarm is unreadable and slow to work out; it is laid
  in rows, pressed together, and its tooltip says so.
- **Text on a chart without a data X is pinned.** Adding a text, an arrow or a box to a pie or a chart of categories pins it to the
  plot where it was put; before, on a box chart, it was saved and never drawn.

### 2026-11-25: Scale bar, channels, histogram (IMAGE_SPEC I.7)

- **A scale bar in the image's pixels.** ImageJ's bar is an overlay sized in the image's pixels, so it is the same part of the
  picture at any zoom and in the PNG; Kurve keeps that rather than a bar of fixed screen size, because the picture saved is what
  goes into a paper. Its width opens where ImageJ's does (80 screen pixels' worth, rounded down to 1, 2 or 5), and the label has
  the decimals typed.
- **Channels are the book's matrices of one size.** A qudi scan's counters and a processed copy are sheets of one book already;
  showing them together needs no new object, only a switch on the book (*Channels*), each channel keeping the table and range it
  has when shown alone, so Contrast on the channel in front is ImageJ's current channel.
- **The histogram is a look, not a result.** It opens in a dialog with ImageJ's numbers written as ImageJ writes them; *Plot it*
  makes the result (a Measure analysis that follows the matrix) when the histogram is to be kept.

### 2026-11-21: A threshold as ImageJ's (IMAGE_SPEC I.6)

- **The panel beside the image, as Brightness and contrast is.** A threshold is looked at while it is set: the red cells follow the
  method and the range as they change, each change one undo step.
- **The macro's arithmetic.** ImageJ's Threshold window and its `setAutoThreshold` can disagree on a 32-bit image; Kurve gives the
  command's (made 8-bit, the level turned back into values), which a script can repeat, and says the level beside the count.
- **Particles as an analysis.** ImageJ's Results grow a row each run; here the particles are a result sheet that follows the scan
  and its threshold (a method is worked out again on new values), with the outlines drawn where they were found.
- **A threshold is part of the matrix's view.** Kept with it and undone with it, it stays as numbers when the values change, as
  ImageJ's does; a mask made from it is a result that follows, with the method rather than the numbers when a method set it.

### 2026-11-21: Processing as ImageJ processes (IMAGE_SPEC I.5)

- **A new image, never the scan changed.** ImageJ filters an image in place and keeps one undo; Kurve keeps the scan as recorded and
  puts each filter's result in a matrix of its own, which follows the scan and can be filtered again: a chain of steps that can each
  be changed later, as a column's processing can.
- **Exactly ImageJ's numbers.** Each filter is ImageJ's own arithmetic in single precision, edges and all, so a blurred scan here and
  in ImageJ are the same to the last bit, and the method says the command that does it there.
- **ImageJ's behaviour first, the better one asked for.** An empty cell spreads through ImageJ's blur and mean; that stays the default,
  and *Leave the empty cells out* is beside it, saying why, rather than silently differing from ImageJ.
- **Process on the image's bar**, as ImageJ's Process menu is beside its image: what needs no setting runs at once, the rest asks.

### 2026-11-20: A scan keeps its shape (IMAGE_SPEC I.1)

- **A pixel is not stretched to fit a window.** A matrix's map takes the largest area of the scan's own shape that the window
  holds; the window's size decides how much is seen, never the cells' shape. A series' heat map still fills its window: its
  two axes are different quantities.
- **Out is one gesture, as in is.** The Zoom tool zooms in by a click and out by Alt+click, as ImageJ's magnifier; − and + and 0
  on the keys; and a map is never zoomed out past the scan, so zooming out ends at the whole of it.

### 2026-11-20: Selecting as ImageJ selects (IMAGE_SPEC I.4)

- **Rectangle first, as ImageJ.** A drag on the image draws a selection; moving the image is the Hand, Space or the middle button, as in
  ImageJ, because selecting is what an image is opened for. A click still picks one cell.
- **ImageJ's keys do ImageJ's things.** M measures, K plots a line's profile, T keeps a selection, so a hand that knows ImageJ works at
  once. M is one undo step: the selection kept and the Results worked out again together.
- **Results are an analysis, not a log.** ImageJ's Results grows a row at each M and forgets where they came from; Kurve's Results is
  the book's selections measured, worked out again when the matrix changes, so a row never disagrees with its data.
- **What was found is drawn where it was found.** Maxima, spots, lines and regions are shown on the image they came from, in ImageJ's
  overlay cyan, beside the yellow of what is selected.

### 2026-11-20: What an image is shown in (IMAGE_SPEC I.3)

- **ImageJ's names, ImageJ's numbers.** The tables are called what ImageJ calls them and Auto behaves as ImageJ's (each press
  saturating more, then starting again), so someone who has worked in ImageJ finds the same image at the same press.
- **Contrast beside the image, not in a dialog.** The panel stays open while the image is looked at, the image follows a slider as it
  moves, and letting go is the one undo step: adjusting contrast is looking, and the record of it should be one line.
- **A view, kept.** The table and range belong to the matrix (a colleague opening the project sees it the same), are undone with it,
  and never touch its values or its record; the graph, the TIFF and a PNG follow them, so a figure shows what was looked at.

### 2026-11-20: A matrix is an image first (IMAGE_SPEC I.2)

- **Looked at before it is read.** A scan opens as an image in its own window, and the grid of numbers is one click away (Cells);
  a matrix with nothing in it yet opens as cells, since there is nothing to look at and something to type.
- **The window shows more, never wider.** Its size decides how much of the image is in view; the magnification is kept when it is
  resized, the cells keep their shape, and Fit makes each cell a whole number of the screen's pixels so no column of cells is wider
  than its neighbour.
- **ImageJ's numbers where ImageJ's users look.** The magnification as ImageJ's percentages and levels, its size line over the
  image, the cell under the pointer beside it; the wheel zooms (about the pointer, as a map does) and a drag pans, because looking
  comes before selecting; Shift selects.

### 2026-11-20: The shift between two scans (QUDI_SPEC Q.8)

- **In cells and in the scan's units.** A drift is read in nanometres and judged against the cell; both are columns, so neither has to
  be worked out by hand.
- **Two lists, one size.** The second scan is chosen from the matrices; one of another size, or the same one twice, is refused in the
  dialog before anything runs.

### 2026-11-20: A profile across a width, fitted (QUDI_SPEC Q.6)

- **ImageJ's column kept, Kurve's beside it.** The profile's *Value* stays ImageJ's sample; the mean across, its error, the fit and the
  residuals are columns of their own, so a pixel-wide profile still reads value for value against ImageJ's.
- **A plot that shows the errors.** With a fit, *Plot the profile* draws the samples as symbols with their error bars and the fit as a
  line; a pixel-wide profile with no fit is drawn as ImageJ draws it, a line.

### 2026-11-20: Intensities with their noise (QUDI_SPEC Q.7)

- **Beside ImageJ's columns, not instead.** Measure stays ImageJ's, value for value; Kurve's own numbers come after, under
  *Beyond ImageJ*, so a table read against ImageJ's still lines up and what Kurve adds is plain to see.
- **The background is a place, said.** A ring of cells about the region, by a distance in the scan's units, not a number typed: the
  background then follows the data, and its noise is measured with it.

### 2026-11-20: Spots, beyond ImageJ (QUDI_SPEC Q.5)

- **Every number with its error.** The user asked for analysis better than ImageJ's. ImageJ gives a spot's position to a pixel and
  nothing about how sure it is. Kurve fits each spot and gives its position, width, peak, background and volume each with a standard
  error, and the errors are honest: over 300 Poisson repeats each value's spread is its error (pulls of SD 1), which the test keeps.
- **Counts are counts.** A confocal scan's cells are photon counts over the pixel time, which qudi's header states. The fit is
  Poisson's maximum likelihood (the weights from the model until they settle), not least squares weighted by the counts seen, which
  put the background a standard error low; the reduced χ² then says whether Poisson's noise is all there is.
- **Two spots in one maximum are two.** ImageJ's maxima are the seeds; a spot is added where the residual is largest and kept only
  when the likelihood ratio says so, it looks like another emitter (its size, half a FWHM away), and, round, it beats one elliptical
  spot clearly. A spot merely elliptical is not split (0 of 100), a pair 0.8 FWHM apart is (98 of 100).
- **The dialog starts from the scan.** The pixel time from the header, the prominence from the values' scatter, the radius from the
  spots' own width: Work it out at once gives a sensible answer, and each setting says where it came from in its tooltip.

### 2026-11-20: ImageJ's Find Maxima and Plot Profile (QUDI_SPEC Q.4)

- **ImageJ's algorithm, not one like it.** Find Maxima's answer depends on its order (from the highest down), its prominence
  test and how it breaks ties; a list that differs from ImageJ's by one maximum is a list nobody can compare. Kurve does what
  ImageJ 1.54f's MaximumFinder does, its float arithmetic included, and the method gives ImageJ's command for the same.
- **Positions in X and Y, pixels beside them.** A maximum's row gives the cell's X and Y in the matrix's units, and ImageJ's pixel
  next to it, so the list reads beside ImageJ's and beside the scan. A line for a profile is given by its ends in X and Y, and
  the dialog gives the `makeLine` that draws it in ImageJ.
- **A centre meant is a centre.** Positions typed in micrometres are a hair off a cell's centre in pixels (2.8333… µm); a line's
  end within 10⁻⁹ of a pixel of a centre is taken as that centre, so a profile along a row of cells is that row's values, as a
  line drawn on the row in ImageJ is.
- **Empty is not a maximum.** ImageJ lists a NaN pixel as a maximum; a cell with no value never is one here.
- **One submenu for ImageJ.** The matrix window's ImageJ items (Measure…, Find maxima…, Profile…, Save as a TIFF) are under
  Matrix › ImageJ, as Analyze › Image has the three measurements: the menu says where the numbers' definitions come from.

### 2026-11-20: ImageJ's Measure (QUDI_SPEC Q.3)

- **ImageJ's names and definitions.** The user asked for ImageJ's statistics, so the result sheet's columns are ImageJ's (Area,
  Mean, StdDev, Mode, Min, Max, X, Y, XM, YM, BX, BY, Width, Height, IntDen, RawIntDen, Median, Skew, Kurt) with the matrix's
  units, and each is what ImageJ means by it: its mode the middle of the fullest of 256 bins, its bounding rectangle's upper
  edge, its kurtosis less 3. A table read beside ImageJ's must not need a translation.
- **Kurve's arithmetic.** ImageJ works out the standard deviation and the higher moments from running sums of powers; on
  values with a large offset that loses digits (its kurtosis can be meaningless). Kurve keeps the definitions and works them out
  from the deviations, and says so in Help. *Values as ImageJ holds them* rounds to single precision for whoever wants ImageJ's
  numbers to the last digit.
- **A region is given in X and Y, and taken as ImageJ would.** People think in micrometres, not pixels: the dialog takes the
  edges or corners in the matrix's units, picks the cells ImageJ's selection would (its oval mask, its polygon rule for a centre
  on an edge), says how many, and gives the selection in ImageJ's macro language, so the same region can be measured there.
- **Seen on the map.** *Show the region on its map* draws it over the matrix's image, so the cells measured are the ones meant;
  a matrix's map takes annotations for it (a map of a series still does not, its Y being an index).

### 2026-11-19: a matrix for ImageJ (QUDI_SPEC Q.2)

- **ImageJ opens it as Kurve shows it.** The image is written with its top row the largest Y and ImageJ told to count Y upwards
  (`inverty`), so the picture is the right way up in both and a position read in ImageJ is the position Kurve and qudi give.
  Every pixel's centre is the cell's X and Y: ImageJ puts a pixel's position at its centre for measurements, and the matrix's
  cells are positions, not edges.
- **The pixel size ImageJ reads back is Kurve's step.** ImageJ's own writer keeps six digits of it; a scan's 0.1 µm would be fine,
  but a 4 µm range over 7 pixels would not. The rational is the one ImageJ's arithmetic turns back into the step exactly, where
  one exists (about two steps in three), else to a part in 10¹⁴, and the message says so.
- **Refused rather than approximated**: an axis that is not evenly spaced (ImageJ's calibration is one pixel size), said in
  words with the way out (Resample…). Values past single precision's range are written as ImageJ would hold them and counted
  in the message.
- **Where people look**: Publish, beside the other files Kurve writes, and the matrix window's own Matrix menu.

### 2026-11-19: qudi's confocal scans (QUDI_SPEC Q.1)

From the user's request: qudi's files must keep their positions, and the data go on to ImageJ's measurements.
- **A scan is a matrix, not columns.** Read as text, a qudi image was a block of numbers whose positions stayed in a header nobody
  read. It is recognised by its header (never by its name alone, which people change) and becomes a matrix book whose X and Y are
  the scan's positions as qudi made them (NumPy's linspace from the header's range and the image's own shape; the new format's
  axes' min, max and resolution; a data file's own x and y columns, checked to be a grid).
- **Micrometres, as qudi shows them.** qudi writes metres; a position axis below a millimetre comes in in µm, one rounding, and the
  header's metres stay in the header fields as written. A position that is the map's axis in "0.000004 m" helps nobody.
- **Kurve's orientation.** Row 1 the smallest Y, as the classic file; the new format's lines are X, whatever its column header
  says, and are turned into columns, so a map of either reads as qudi's own window.
- **The header kept, every line.** The matrix keeps it as header fields (the Dimensions dialog lists them, the project file
  carries them), so the scanner's frequency, the z it was taken at and the time are there when the figure is questioned.
- **One scan, one book.** The files saved together (one stamp) are one book, a sheet a channel; a data file adds what the images
  did not give (a tilted sample's z), never a second copy of a channel. One undo step, one record entry a sheet.
- **A 1D scan is a curve** and goes through the import dialog as any table; a data file that is not a grid comes in as columns,
  said.

### 2026-11-19: PLS regression (MULTI_SPEC 6.5)

- **Two doors, one dialog.** PLS is a regression to people who predict a concentration from spectra and a multivariate method to
  those who read loadings, so it is in Analyze › Fit beside Multiple regression and in Statistics › Multivariate beside the
  principal components; both open the same dialog.
- **The response is chosen, not guessed from the order.** With columns the dialog lists the columns ticked as Response ticks,
  starting with the last (where a calibration table usually keeps it); every other column ticked is a variable. With curves the
  response is the series variable the Batch window already sets (typed values, a number in the names, a field of the files), and
  the dialog says how many curves have one: those without are predicted, which is what a calibration is for.
- **The number of components is the user's, the least RMSECV the default, and the reason said.** The Components section's title
  says how many were used and why (*the least RMSECV*, *as asked*, *the most there are*), and every number up to the most is in
  the table, so the choice can be checked rather than trusted; the RMSECV plot is one click.
- **Folds are never random** (decision 7): leave one out, contiguous blocks or venetian blinds, so a recalculation, a reload and a
  colleague get the same RMSECV.
- **No verdict.** Q², RMSECV and VIP are numbers; nothing says a model is good, a variable important past 1, or a component one too
  many.

### 2026-11-19: the user's reports: =9 on an empty sheet, a radius drawn as a line

- **A formula on an empty sheet has rows.** A column formula reading no column (a number, `i`, a column's mean) took the sheet's
  rows, and a new sheet has none: `9` typed into its F(x)= row showed nothing, and said "0 values". Origin's new sheet has 32 rows,
  so Kurve gives such a formula 32 until the sheet holds values, and the toast says so. A column of names counts as rows (its text
  cells were not counted). The rows stay the sheet's once there are values: no number of rows of its own to keep in step.
- **A line joins the points in the order that reads, not always the rows'.** A radius read from 280 down to 50 with jitter in its
  positions stepped back now and then, and a line through it in the rows' order zigzagged on the steep parts, where a spreadsheet's
  line chart (X as its rows) and a seaborn line (sorted) did not. Automatic: in the order of X when every point is within a few
  places of where its X puts it (noise in X); each part on its own across a jump back over half the data (an angle from 359° to 0°,
  a sweep starting again), so no line crosses the graph; as recorded otherwise, for a loop or a sweep there and back, which go back as
  far as they came and mean their order, as Origin and matplotlib join them. *In the order recorded* and *In the order of X* choose
  it by hand, from the curve's right-click (*Join the points*) and the Format pane (*Order*). The drawing alone: the points, the fit
  and every step keep the rows' order. No periodic axis: an angle across 0° is two parts on a linear axis, which is what the numbers
  are; a formula column (`if(A<180, A+360, A)`) makes one axis of it.
- **The import takes such a radius as X.** It took a column that rises or falls steadily (97 % of its steps), else one named as
  an axis, else none; a jittered radius was neither, and the user's file came in as two curves against the row number. A first
  column that runs one way apart from noise is X now, and *radius*, *radial*, *azimuth*, θ and φ name an axis. 2θ and φ never
  matched: the name list ended in `\b`, and a Greek letter is not a word character to JavaScript; it ends in a look-ahead for
  letters now.

### 2026-11-19: discriminant analysis (MULTI_SPEC 6.4)

- **The statistics packages' covariance, said.** The pooled within-group covariance divides by n − G, as SPSS, R's MASS and
  Origin do; scikit-learn 1.9 divides by n, which moves the probabilities. Help says which, so a number that differs from
  scikit-learn's is explained rather than doubted.
- **Columns only, and the way round said.** With curves the points outnumber the observations and the covariance cannot be
  estimated; rather than offer a layout that always fails, the dialog has none, and the refusal names the way: the principal
  components first, then discriminate on their scores, which the dialog offers with the PCA's sheet in front.
- **Every table a reader of SPSS or Origin expects, in their words.** Unstandardised and standardised coefficients, the structure
  matrix, the functions at the group means, Fisher's classification functions, the classification table with the share correct in
  its title, and the same left one out: the left-one-out table is what says how well the groups are told apart, so it is never
  hidden behind a setting.

### 2026-11-19: clustering (MULTI_SPEC 6.3)

- **Clusters are numbered by the data.** k-means' numbers come from its random starts and SciPy's from the order of merges, so
  the same clusters could come out as 2, 3, 1 on another run; cluster 1 is always the one holding the first observation, so
  two runs, two methods and a reload name the same group the same way.
- **The seed is a setting, and shown.** k-means starts at random; a seed (1 by default) makes it repeat, and the report says
  which seed and how many starts. A clustering that changed by itself when its data had not would read as a bug.
- **A dendrogram is a curve.** The tree is drawn as one curve whose line breaks at its empty rows (a series setting, `gap`), the
  observations named along X (turned when there are more than twelve), the cut a dashed line between the merges either side:
  nothing new for the graph to learn, and every format, export and zoom works on it.
- **Choosing k is helped, not decided.** *Compare up to* lists every k's within sum of squares and mean silhouette side by side,
  and *Plot against k* draws both (the silhouette on the right axis); the number of clusters stays the user's.
- **Membership goes back into the data as a copy.** *Put the clusters in the data* writes a categorical column of text at the
  end of the data's sheet, recorded as any added column is; it does not follow a later recalculation, which the toast says, so
  a box chart or a test grouped by it never changes under the user's feet.

### 2026-11-19: principal components (MULTI_SPEC 6.2)

- **Two layouts, said.** A table of measurements has its variables in columns; a set of spectra has its observations in
  columns (each curve one sample, its points the variables). Both are common, and guessing from the data would sometimes
  guess wrong, so the layout is the dialog's first setting and the report's method line names it. It starts as *each column
  an observation* when the active column looks like a spectrum, else as columns.
- **The scaling follows the layout until it is chosen.** Unit variance is right for columns of different quantities and
  wrong for curves in one unit (it would weigh the noise of an empty stretch like a band); left untouched, the scaling changes
  with the layout, and once chosen it stays.
- **A graph per question, each a curve per group.** The scree, scores, loadings, T² against Q and the biplot are buttons of
  the report, each one undo step, drawn from the result sheet's own columns, so they follow a recalculation. The scores are a
  curve per group (written as a pair of columns per group) so each group has its colour and its entry in the legend, with no
  colouring rule of its own. With curves, the loadings are curves against X: they show which bands a component moves, which is
  the spectroscopist's question.
- **Numbers, not verdicts, for outliers too.** T² and Q have limits at a level chosen; the observations past them are listed,
  named on the T²–Q plot, and can be masked, never called outliers. Q with every component kept is 0, not the rounding noise
  it would otherwise print.
- **A sign by a rule, and a tie that does not flip it.** Components have no sign of their own; each is turned so its largest
  loading is positive, and loadings equal to 10⁻¹² (two variables under unit variance give ±1/√2) leave the first to decide, so
  the sign does not depend on the last bit of rounding.

### 2026-11-18: wave 5's end

- **A placeholder is words, set as words.** A field for a number is monospaced, so its digits line up; its placeholder ("the first
  X", "auto") is a phrase, and in the monospaced face it was cut in four of the wave's dialogs. Placeholders take the interface's
  face everywhere, and an analysis's range fields are as wide as their words; `sig-drive.mjs` measures every placeholder of the
  wave's dialogs against its field.
- **A method's cost is the interface's business.** LOWESS fitted at every point froze the page for a minute on a long column; it is
  fitted at points a hundredth of the range apart, as R does, and the Help says so. A step a person can choose must finish while
  they watch.

### 2026-11-18: calculus, further (SIGNAL_SPEC 5.8)

- **An integral is an analysis when it is of columns, a sentence when it is of a fit.** Each column's area by the trapezoid and
  Simpson's rule goes into a result sheet that follows the data, as every measurement of columns does; the fitted curve's integral
  is one number asked of the fit in front, so its dialog answers as the ends are typed and puts it in the History, with no sheet.
- **The Integrate window keeps its one rule.** Its windows measure bands, each with its own baseline; Simpson's rule there would be
  a second answer to the same question with no way to tell which to report. The analysis gives both, side by side.
- **LOWESS is a way to smooth, not a tool of its own.** It goes where smoothing is chosen (Smooth's methods), with its two settings
  shown in place of a window's, so the before-and-after and the checks on what it takes off a band come with it.
- **A readout is the number.** How the integral was worked out (the rule, its tolerance, the delta method) is the readout's
  tooltip and the Help's; the dialog shows the value and its error.

### 2026-11-18: wavelets (SIGNAL_SPEC 5.6)

- **Denoising is a step, decomposing and the continuous transform are analyses** (decision 1): a denoised column keeps its X and
  goes through its processing like smoothing; levels of coefficients and a grid of scales are new things with X of their own.
- **Each level alone, on the column's X.** Coefficients by level are indices, which nobody can lay over the data; the levels
  reconstructed alone add up to the column and can be plotted with it, which is what a person reading a decomposition wants.
- **The noise the threshold used is said.** The noise read from the finest level is printed in the step's form, so a threshold
  that took too much can be seen to have read too much noise.

### 2026-11-18: the spectrogram (SIGNAL_SPEC 5.5)

- **A grid an analysis makes is the analysis's matrix** (decision 7): read only, worked out again with its column, cut from it or
  deleted with it, drawn as a map by its report's *Draw the map*; a person never has to ask where the numbers went.
- **Named as the analysis, its axes the column's.** The matrix takes the analysis's name (CWT1, Spectrogram1) and the column's own X
  name and unit; the wave's screenshots showed "CWT11" and "X (s)" until this was so.

### 2026-11-18: envelopes (SIGNAL_SPEC 5.4)

- **One step, its output chosen.** The Hilbert envelope, its phase, its instantaneous frequency and the curves through the maxima
  and minima are one step (*Envelope…*) with a list of what it writes, not five tools: they are one question asked five ways.

### 2026-11-18: interpolation into columns (SIGNAL_SPEC 5.7)

- **Past the data is asked for.** Extrapolation is off unless chosen, and the result sheet marks each value measured, interpolated
  or extrapolated (decision 9), so a guess is never read as a measurement.
- **Scattered points into a matrix live under Data › Matrix**, beside the other ways a matrix is made, though the work is an
  analysis's; a person looks for a grid where grids are made.

### 2026-11-18: correlation and convolution (SIGNAL_SPEC 5.3)

- **A lag is read in words.** The correlation's report says "B follows A by 6.5 s" beside the lag of the largest value, since the
  sign convention of a cross-correlation is the first thing people get wrong.
- **Deconvolution states its noise** (decision 6): estimated unless typed, and the ratio used said, because Wiener's result
  depends on it entirely.

### 2026-11-18: filters designed (SIGNAL_SPEC 5.2)

- **The response is drawn in the form.** A designed filter's gain against frequency, on a log scale to the Nyquist frequency with
  its edges dashed, sits under its settings in the Tool window and the History, so an edge typed in the wrong unit shows at once.
- **The step warns in the data's terms.** A filter that lowers a band says by how much and how wide the band is in points, as
  smoothing does, and a notch that rings says so; a filter is a step like the others, with their checks.

### 2026-11-18: the transform, with its output (SIGNAL_SPEC 5.1)

- **A transform is an analysis with a sheet** (decision 1): its X is frequency, not the column's, so it cannot be a step; its
  columns (amplitude, phase, power…) are chosen as switches and written to a result sheet that follows the column.
- **Uneven spacing is said, then cured** (decision 2): X not evenly spaced is resampled by straight lines first and the note says
  so, rather than refusing or transforming wrong numbers in silence.
- **Kurve's words, SciPy's numbers** (decision 3): windows, scalings and sides are named in words in the dialog, and give exactly
  NumPy's and SciPy's results, so a number can be checked against a script.

### 2026-11-15: implicit fits (FIT2_SPEC 4.5)

- **A curve through points measured in both coordinates is fitted by its distances.** A circle, an ellipse or a formula f(x, y)
  = 0 counts x and y alike: each point's distance to its nearest place on the curve, not its offset in y, which is why a curve
  that turns back on itself can be fitted at all. The sheet gives each point's signed distance and foot, so the fit can be read
  point by point as a curve fit's residuals are.
- **A formula asks for its starts.** Where a circle and an ellipse start from an algebraic fit of the points, a formula's zero
  set can be many curves; the dialog asks for a start for each parameter and says why, rather than guessing a curve the user did
  not mean.
- **One dialog with the surface fit's parts.** X and Y, the curve, the formula when it applies, and the same parameter grid
  (start, Fix, limits), so a fit of Analyze › Fit beyond the curve and peak fits looks the same whatever it fits.

### 2026-11-15: surface fits (FIT2_SPEC 4.4)

- **A surface fit is an analysis, not a second Fit window.** It reads three columns or a matrix, writes its sheet and follows
  its data, as the other fits of Analyze › Fit beyond the curve and peak fits do; the Fit window stays about a curve on a graph.
- **One dialog, its parts shown as they apply.** The columns' lists or the matrix's, and the formula's field, appear when the
  data's source or the model asks for them; the parameter grid follows the model and the formula as it is typed, so starts,
  fixes and limits are set where the parameters are named.
- **A result that can be looked at is offered under the report.** The fitted surface and the residuals become matrices computed
  by a formula with the numbers written in, each drawn as a map at once, one undo step for both: a surface is understood by
  seeing it against the data, not from a table of coefficients.

### 2026-11-15: peak fits, further (FIT2_SPEC 4.7)

- **A baseline that comes from the data is fitted like any other.** Shirley's and Tougaard's backgrounds sit in the same
  baseline list and card as a straight line, their parameters named in words (*At the lowest X*, *At the highest X*, *B*), and
  Tougaard's settings (the side the losses fall on, C, D) in that card rather than a dialog: they belong to the baseline, and
  changing one seeds it again on the graph at once.
- **A setting that cannot be read is refused where it is typed.** A C of 0 puts the field back with a message, as crossed
  limits do in the parameter grid.
- **One direction setting, not two shapes.** A Doniach–Šunjić leaning either way is one shape with a signed asymmetry, so a
  binding-energy axis and a kinetic-energy one use the same line; the sign is in its meaning and its help, not a second entry
  in the list.
- **Your function joins the built-ins' list**, marked *(yours)*, once it says which parameters are its centre, area and width:
  areas, shares and labels then read as for any shape, and a function without them is not offered as one.
- **A step says what it costs.** The self-deconvolution's note gives the noise's rise, worked out from the filter itself, and
  warns only when the raised noise is a visible fraction of the bands, since every useful narrowing raises it.

### 2026-11-15: more models (FIT2_SPEC 4.6)

- **A long list is still one list.** 105 models are found the way 25 were: by kind, by a word of the name, the purpose or a
  parameter, or by Origin's name, which is searched but never shown. Two kinds were added (Physics, Distributions) rather
  than one long *Other*, because a person looking for Debye's law thinks of physics, not of powers.
- **A model says what its X must be in.** Planck's law takes X in nanometres or terahertz and Nernst's y in volts at 25 °C,
  in the formula shown beside the model; a model whose X must lie between 0 and 1 refuses other X in words, as one that needs
  X above 0 does.
- **No duplicates under new names.** Where a requested model is one already there (the normal cumulative is the error-function
  step, the Cauchy cumulative the arctangent step, the Weibull cumulative Weibull growth), the existing one carries the name in
  its search words instead of a second copy whose results would differ only in their labels.

### 2026-11-15: honest intervals (FIT2_SPEC 4.8)

- **Robust is a way of fitting, chosen before the fit**, beside the weights, so it changes the next fit and not the one on
  screen; the bootstrap is a question about the fit on screen, so ticking it answers at once and each later fit answers again.
- **Weights seen where the residuals are.** A robust fit's weights are drawn as the size of each residual under the graph (a
  point left out an open ring), not as another chart: the residual panel is where a person already looks for outliers.
- **Two errors side by side, no verdict.** The bootstrap error and percentile interval sit beside the curvature's, and the
  method is said (percentile, not BCa; the seed); which to trust is the person's call, as everywhere else in Kurve.
- **Long work in the background.** A bootstrap of a thousand refits runs in the compute worker with a progress line and Stop
  in Results, so the window stays usable; stopped, nothing changes.

### 2026-11-14: comparing fits (FIT2_SPEC 4.3)

- **A comparison is an analysis**, so it follows the data, sits in the History and is reported, as every other result does; a
  table that vanished with its dialog would be one more thing to redo after a value changes.
- **The same points and weights for every model.** Criteria compare fits of the same data only, so the dialog sets one range
  and one weighting for all; a setting's own are not used, and the method says what was fitted.
- **Numbers, not a winner.** Akaike's weights and the F tests are shown; no model is called better, as no test is called
  significant elsewhere.

### 2026-11-14: multiple regression (FIT2_SPEC 4.2)

- **One analysis, two doors.** Regression on several columns is the linear model already in Analyze › Statistics; a person
  looking for it under Fit finds *Multiple regression…* there too, the same dialog and result. Best subsets is its own kind,
  because what it gives is a list of models, not one.
- **Influence in the rows, not the report.** Leverage, Cook's distance and the rest are a value a row, so they are columns of
  the result sheet in each row's place (sortable, plottable, filterable); the report keeps to the model and its numbers. A row
  to predict sits among them in its order, its residuals empty.
- **Numbers, not verdicts.** No row is called influential and no subset best: Cook's distance and the criteria are shown,
  and the order of the subsets is the criterion the person chose.

### 2026-11-14: polynomials solved, not iterated (FIT2_SPEC 4.1)

- **What is linear is solved.** A straight line or a polynomial has one least-squares answer, and iterating towards it
  only adds a tolerance to how close it gets. The Fit window says *Solved directly* where its Iterations would be, and
  the method is named; the iterative fit stays for what a direct solve cannot honour (a limit the answer breaks, a
  constraint, the X errors), started from the answer.
- **Shown in powers of x, computed about the centre.** People write and read a polynomial in powers of x, and Origin
  reports it so; but those coefficients, rounded to doubles, cannot give back a curve on a narrow window far from zero.
  So the numbers shown are the familiar ones, and everything drawn or read from the fit uses the centred ones the
  solve found. Results keeps to the numbers (information hygiene); the full list, the report and the CSV say about
  which X it was solved.

### 2026-11-14: matrices (SHEET_SPEC 3.6)

- **A matrix is a thing of its own, in a window of its own.** A grid of Z is not columns: its X runs along
  the top and its Y down the side, as Origin's matrix window shows it, and a book of them is a document in
  the taskbar and the Explorer, minimised rather than closed, as a trend graph is. Row 1 is at the top, as in
  any table; a picture is read with its top row first and Y counting from the bottom, so it is upright both
  in the window and on a graph.
- **It is typed into as the worksheet is**: the same selection's look (a filled range with an edge, the
  active cell outlined, the headers of what is selected filled), the same keys (arrows, Shift, Ctrl, Home,
  End, Tab, Enter, F2, Delete, Ctrl+A, C, V), a value that is not a number kept in its box, marked. It is
  drawn a whole row and column at a time, as a spreadsheet scrolls, so a million cells scroll as a hundred.
- **Original data or computed, said in the foot.** Values typed, read or transformed in place are the
  matrix's original data, each change in its own record with its check code; a formula makes it computed,
  worked out again when what it reads changes, and the foot says the formula, or why it cannot be worked
  out, in the warning colour. The selection's N, mean, minimum and maximum are in the foot too, as the
  worksheet's are in the status bar.
- **A matrix's name is a formula's name** (a letter, then letters, digits and _), because other matrices
  read it by that name; renamed, their formulas follow, as a column formula follows a column moved.
- **Transforms act in place**, as Origin's do, one undo step each; arithmetic makes a new computed sheet,
  so the result follows what it was made from.
- **A graph of a matrix draws it alone**, as a map (image, filled contours, lines, both): the image is made
  at the screen's pixels, each the cell that holds it, never smoothed, so a cell is a cell; the colour bar
  is titled by Z; the readout names the cell under the pointer.

### 2026-11-14: two worksheet windows (SHEET_SPEC 3.2)

- **One live grid, pictures elsewhere, as the graph windows.** The worksheet's grid holds the selection, the edit, the keys,
  the bar and the foot; two of them would mean two of each and a question of which one a menu acts on. The grid moves into
  the worksheet window in front, and the window behind shows its sheet's cells as a picture, which the wheel scrolls.
- **A press on a picture is a press on the cell.** The cell pressed is selected as its window comes forward, so a click
  does what it would do if the window were already in front, and the next key types into it.
- **The worksheet window keeps a sheet and its tabs.** A sheet's own window has no tabs (its title is the sheet); the
  worksheet window's tab for that sheet brings its window forward, so a sheet is never shown twice. The last sheet the
  worksheet window could show stays with it.
- **A column is dragged to another sheet by its letter**, onto the other window or its taskbar button, outlined while
  over it; the toast offers Undo, since the sheet it went to is already in view.
- **Which sheets have windows is this browser's**, as where windows sit is: a colleague opening the project gets the
  worksheet window alone.

### 2026-11-14: Excel workbooks (SHEET_SPEC 3.7)

- **A workbook is read from its cells, then through the import's own reading.** Each sheet is turned into the text the import
  dialog already understands (a tab between cells, every digit of a number, dates in ISO), so a sheet gets the same header
  detection, roles, findings and preview as a text file; what text cannot say travels with it on a first line (the sheet's
  name, a column's formula, its frozen rows), and a text that would read as a number is marked so that 007 stays 007.
- **Several sheets are a choice, one sheet a dialog.** The list comes first (sizes, a hidden sheet said) because a workbook's
  other sheets are often notes or charts; one ticked goes through the dialog, several come in with its automatic choices on
  sheets of their own, one undo step, as a batch of files does. Asking every question for every sheet would be ten dialogs.
- **Frozen rows are the header.** A row a person froze at the top is the most reliable sign of what names the columns: two
  rows are names and units, three add the comments, as Origin writes them. Publish › Data as Excel freezes them so its own
  files come back exactly; without frozen rows the line above the numbers is read, as for text.
- **A formula's value, not the formula.** Excel's language is not Kurve's; carrying the cached value and saying the formula in
  the column's comment keeps the numbers without pretending to recompute them.
- **A pasted web table fills its spans.** A merged cell in a web table names every row or column it spans; leaving all but
  the first empty would lose that. A spreadsheet's own copy (tab-separated, no spans) is read as before.

### 2026-11-14: reshaping (SHEET_SPEC 3.5)

- **Analyses, not commands.** A stacked or pivoted table that does not follow its data is a copy that goes stale silently; as an
  analysis it is worked out again, said in the History and the report, and cut from its data only when asked.
- **Cells, not processed values.** Reshaping moves cells around; reading a column after its processing would reshape a curve,
  drop rows a step dropped and lose its text. A reshape reads the worksheet as it is.
- **Split is one result sheet of blocks**, not a sheet a level: one analysis keeps one sheet, and side-by-side blocks are what is
  compared anyway. Sheets per level wait for a need.
- **A pivot's levels sorted, an unstack's in their order** (as pandas and Origin respectively): a table of aggregates is read by
  its labels; unstacked columns follow the data's own sequence.

### 2026-11-14: conditional formatting (SHEET_SPEC 3.4)

- **Fills are tokens mixed from the panel, never a colour typed.** A colour picked freely would be unreadable in one of the four
  looks; mixed from `--panel`, each fill follows the theme and the contrast test holds every one.
- **A scale in seven steps, not a gradient.** Steps are tokens the test can measure, and seven are more than the eye sorts in a
  column; a three-colour scale's middle is the panel itself, so "nothing to see" looks like nothing.
- **The newest rule first**, as a spreadsheet's manager: otherwise a highlight added after a scale is never seen, and the user
  thinks it failed.
- **Highlights reuse a filter's conditions**, so one set of words and one evaluation serve both; duplicates and values seen once
  are the two a filter has no use for.

### 2026-11-14: filters (SHEET_SPEC 3.3)

- **A dialog, not a drop-down under the header.** Kurve's dialogs already have the keys, focus and undo a panel would need
  again; the funnel in the header opens it, so the column is never more than one click from its filter.
- **The rows stay put until asked.** A spreadsheet that hides the row you just typed into loses your place; the filter is
  marked older than the data instead, in the warning colour the stale fit uses, and *Apply again* is one click.
- **Text conditions ignore capitals; `==` in a formula does not.** A filter is a search people type into; a formula is a
  definition. Both are said where they are used.
- **The opposite of a number's condition keeps every other cell**, text and empty ones too, as a spreadsheet's does: *does
  not equal 5* hides only the fives.
- **An analysis copies the conditions, not the rows.** Rows as a list would freeze it; conditions follow new data, and the
  filter can change without the analysis changing under the user's feet (the plan's decision 3).

### 2026-11-14: formulas, further (SHEET_SPEC 3.1)

- **Missing in, missing out, said once for everything.** The rule formulas already had (a row with an empty input is
  empty) now holds for comparisons and every function too, and `if` is the one way round it. So every formula from
  before gives the values it gave, and `if(missing(B), C, B)` says what it does.
- **A spreadsheet's `=` inside brackets.** People coming from Excel type `if(C = "x", …)`; at the start of a line `=`
  still names a value, so nothing typed before changes meaning.
- **Text is compared, never ordered or computed.** Exactly, as categorical levels are; a number never equals a text, as
  Excel's `=`. `<` on text is refused in words rather than given a meaning nobody can predict.
- **A sheet's name as Excel writes it**, bare or in single quotes, but forgiving spaces and capitals when one sheet fits:
  `Sheet2!B` is what people type for "Sheet 2", and the F(x)= row then shows it as Kurve keeps it.
- **Constants are the project's, kept by id, never the fit functions'.** A saved fit function with a parameter called
  `k_B` must not become a fixed number because a constant of that name appeared.

### 2026-11-13: ROC curves (STATS_SPEC 2.12)

- **The group column is one of the columns ticked**, chosen in a list that starts on a text column (or one of numbers with
  two values); the others are the scores, a curve each, so several markers are compared on one sheet.
- **Positive is named, not guessed from a sign**: the dialog lists the group's two values; which way a score points is a
  choice of its own, so a marker that falls with the condition needs no column made by hand.
- **The cut-off is a score itself**, with the rule at or beyond it, so it can be typed into a protocol as it reads.

### 2026-11-13: power and sample size (STATS_SPEC 2.11)

- **An analysis with no columns**: the settings typed, as Proportions and Fisher's test are; its result sheet holds the table
  and the curve's columns, so the curve is a graph like any other.
- **Power at sizes, or the size for a power, in one dialog**: the fields a test needs are shown, the others hidden; several
  sizes or powers at once, separated by spaces.
- **The test Kurve runs**: one proportion's power is the exact binomial test's (the one under Hypothesis tests), not a normal
  approximation of it, so the number matches what the test will do.

### 2026-11-13: repeated measures (STATS_SPEC 2.7)

- **Wide or long, one dialog**: wide data (a column a condition) is the common case and needs only the columns ticked;
  long data names its response, subject and factors, the subject started on the text column with most levels.
- **Every correction in the table, none chosen for you**: the uncorrected p, Greenhouse–Geisser's, Huynh–Feldt's and the
  lower bound side by side with Mauchly's test; which to read is the user's call.
- **A subject missing a cell is left out and counted**, as the univariate tests need every cell; the note says how many.

### 2026-11-12: two- and three-way ANOVA (STATS_SPEC 2.6)

- **Every column ticked but the response is a factor**: the dialog asks only for the response, the interactions, the type,
  the comparisons and simple effects; a covariate is the linear model's.
- **Means are the model's** (each cell weighted alike), shown with their N, so an unbalanced design's means and its plain
  means are both readable; a mean over an empty cell is left empty and said.
- **The plots are made from the result**, under the report as one-way ANOVA's means plot is: the interaction plot titles
  its Y axis "Mean of …", since its curves are named by the second factor's levels.

### 2026-11-12: the linear model (STATS_SPEC 2.5)

- **The response is one of the columns ticked**, chosen in a list that starts on the first Y; the others model it. A
  column of text is a factor and its switch cannot be turned off; a column of numbers is a variable unless switched.
  X columns may be ticked here, since a model's variables are often the sheet's X.
- **The report fits a docked window**: Term, Estimate, Standard error and p; Source, df, Sum of squares, F and p. t (the
  estimate over its error) and the mean squares (the sum over its df) are on the result sheet and in the copy, not on
  screen twice.
- **Contrasts are typed by the names the table gives**, a line each, an interaction's parts in any order, so what is
  tested is what is read; one that cannot be worked out is a note in words, never a number.
- **A column that is a combination of others has no coefficient**, and the notes name it, rather than a number that
  means nothing.

### 2026-11-12: counts in tables (STATS_SPEC 2.10)

- **One dialog for a cross-table and a table of counts**: *Read as* says which; the tests are ticks. The
  expected counts are a table of the report, not a judgement on them.

### 2026-11-12: Plot setup refined (PLOT_SPEC slice 7)

The user: show which column is X, Y, Y error, X error (Z and Z error for a map) as they are chosen;
let the symbols be seen; more flexible, clean rather than crowded.
- **The kind is one button** with its picture; the gallery opens over the dialog. Three rows of
  cards took the top third of it.
- **What a column is, as a grid** of the roles the kind takes, as Origin's designation boxes: a
  column's role is seen at a glance, and the headers say what the kind can use.
- **Each curve in one line** of what it uses; a part it lacks behind +. Range, axis and group only
  for the curve selected: columns of them for every row was what crowded the list.
- **Symbols as a grid of pictures**, the same in Plot setup, the Format pane and a curve's menu.
- **A Z error is the Z column's**, as other error columns are their Y's, so it outlives the graph.

### 2026-11-12: correlation (STATS_SPEC 2.9)

- **A section a coefficient** in the report: its matrix, then each pair's N and p; Pearson's interval
  a section of its own. One table of every number was 900 px wide in a 354 px dock. The result sheet
  keeps one table, a row a pair.
- **Pairwise by default**: each pair over the rows where both have a value, its N said; listwise on
  the dialog's switch.
- **Scatter matrix** under the report: a graph a pair, in a figure, one undo step.

### 2026-11-12: nonparametric tests (STATS_SPEC 2.8)

- **Exact while small, as R**: no ties (and no zeros) and samples under 50; *p* in the dialog forces
  the exact distribution or the normal approximation. The method line says which was used.
- **The sign test's interval states its own level**: order statistics give at least the level asked,
  so the sheet holds the level reached beside it.
- **A test per menu item, as Origin's**, sharing two dialogs' worth of fields: one sample or paired;
  two samples; groups of one factor.

### 2026-11-12: one-way ANOVA (STATS_SPEC 2.4)

- **What judges a comparison comes first**: difference, p, the interval's ends; SE and the statistic
  after them, in the sheet and the report alike. In the docked Results the first four fit.
- **A table of one row is names and values**: a t test's fourteen numbers in a column, not a row
  scrolled sideways. Report headers wrap, and text cells sit left.
- **No letters for groups that do not differ**: they are a verdict at α (principle 8).
- **Comparisons that take time go to the worker**, the report saying it is being worked out.

### 2026-11-12: numbers, not verdicts

The user: the software need not interpret results, the user does that. 2.2 and 2.3 had opened each
report with a sentence ("At the 0.05 level, … finds …"), verdict columns (*not normal*, *differs*,
*outlier: yes*), assumption checks with advice (*Use Welch's t*) and notes on how far to trust a p.
All of it went; the rule is principle 8 and STATS_SPEC's decision 9, for every slice after.

- **A level only where it changes a number.** The t tests, proportions, Fisher's test and the F
  ratio ask for their interval (95 % by default); normality tests and the other spreads tests ask
  for nothing; the outlier tests keep α, which sets the critical value and so what Mask and Mark take.
- **What a result can act on stays a button**: *Q–Q plot*, *Mask*, *Mark*. Acting is the user's
  choice; the button names no conclusion.

### 2026-11-12: comparing means and spreads (STATS_SPEC 2.3)

- **Welch's t is the default**, and Student's a tick shown only for two samples: Welch's is as good
  when the variances are equal and right when they are not (simulated: Student's runs far off its
  level with unequal variances and sizes).
- **Counts are typed where Origin types them.** Proportions and Fisher's test take numbers in their
  dialog, with no columns to choose.
- **Effect sizes beside p**: Cohen's d with its interval and Hedges' g.

### 2026-11-12: normality and outliers (STATS_SPEC 2.2)

- **Shapiro–Wilk alone is ticked**; each other test's tooltip says when it is used.
- **A table's end is a bound**: Lilliefors' p past its table is said as below 0.001 (or above
  0.99), and the sheet holds 0.001, not the 0.000999… the table's rounding gives.

### 2026-11-12: descriptive statistics, whole (STATS_SPEC 2.1)

- **The statistics are ticks**, the eleven Statistics on columns gave ticked at first, so an
  analysis made before reads as it did and a new one starts where people expect. Each tick's
  tooltip says what it is (G1, the excess kurtosis, 1.4826 × MAD); the dialog does not.
- **A setting shows only while something ticked uses it** (information hygiene): the quartiles'
  method while a quartile, the median, the IQR or a percentile is asked for, the interval's level
  while the interval is ticked, the divisor while a spread is. A dialog of every setting at once
  reads as a questionnaire.
- **The quartiles' method is named**, Origin's way, with Kurve's own (R's type 7) marked, and the
  report says which was used and the divisor: two programs disagreeing on Q1 is the commonest
  question about descriptive statistics, and the answer is the method.
- **An empty cell says why**, once, in the notes ("Mode: left blank for values that never
  repeat"), not by a dash or a red cell.
- **Quick statistics… and Descriptive ›** sit side by side: the old *Descriptive statistics…*
  (the Statistics window, a look at every column with no sheet made) was renamed, because Origin's
  name for the analyses that make sheets is *Descriptive Statistics* and two items that read
  alike in one menu are one too many.
- **The graphical summary writes no numbers on the histogram**: the normal curve's legend gives
  the mean and SD with their errors, the box its median and quartiles in its tooltip. N and the
  median as text on the figure would be a third place for numbers the sheet and Results have.

### 2026-11-11: the user's review: information hygiene, curves, a step on a new graph, calibration

- **Information hygiene**, the user's rule, is a principle now (above, and UX_SPEC §3.8), and
  this round applied it where they pointed. Results' parameter table is three columns (the
  parameter with its meaning as a tooltip, value, standard error). t and p, the interval and the
  dependency are switches under *In the results*, off until chosen, each a column with a
  heading. The packed second line under each parameter (`t 1538 · Prob > |t| < 0.0001 · 95% … ·
  dependency 0.9376`) is gone, and the peak table and the counting table lost theirs. The
  statistics beside the table keep what judges the fit (`statsBrief`). A setting is listed only
  when it is not the usual one, and the residual sum of squares, AIC, BIC, the free parameters
  and the counts of a global fit are left to the report. *Fitted by … at …* left Results: when
  and by whom is the History's, and the report's. In a narrow Results (the dock) those statistics
  come straight after the table, before Find X/Y and the residuals, and *Fitted over* is said
  only when the range leaves points out.
- **The stage chip is short**: *Preview: Smooth*, *After step 2: Baseline*, *Original data*; the
  sentence it was (which step, the processed data, its input in grey, not applied until OK) is
  its tooltip.
- **The counting table** (the Integrate window's) lost its packed second line too, which in the
  dock had been the only place a window's verdict was shown. *Detected* is a column of its own,
  *Yes* or *No*, the critical level its tooltip; a window wider than a line there is marked by its
  name and said in a note under the table; docked, the emission and efficiency headings are the
  field's symbols, I<sub>γ</sub> and ε, the words in their tooltips, so the table fits.
- **No red rows.** A row of the parameter table was painted red when its dependency passed 0.99
  and the user could not tell why. Red said nothing in words. The note under the table says
  which parameter and what it means. A correlation above 0.95 is bold, its threshold in the
  tooltip.
- **The Project Explorer lists sheets, not files.** A file row counted every column (X and error
  columns too) and listed only some of them, 4 against 3. A file's columns are on its sheet,
  and the worksheet shows them, so the tree lists the sheet once, its count the columns with
  values. Dragging a sheet onto a graph plots its Y columns.
- **No Original / Processed / Both on the graph.** It was a third way to say which stage a graph
  shows, beside the History's boxes and the stage chip, and could leave a graph showing raw data
  with nothing on the graph saying why. A graph shows the processed data. A box selected in the
  History shows its stage with the chip and its ✕. To compare, a step goes onto a new graph.
- **A step on this graph or a new graph.** The tool window asks (*Show it on: This graph / A new
  graph*, remembered in the browser). A new graph gets a new column made from this one with the
  step (from its processed data, or, when the step goes earlier, from its original data with the
  steps before it copied), and the column the step was set up on is not changed. One undo step.
  A step for every column stays on each column.
- **Hiding a curve is one click.** *Curves* on the graph's bar lists each curve, ticked while
  drawn; a curve's right-click and its legend entry have Hide, Show only this curve and Show
  every curve. Before, hiding meant the legend entry's menu or the worksheet's header, and
  isolating one curve meant hiding the others one by one. A hidden curve stays on the graph;
  hiding the active one makes a shown one active, and the last shown cannot be hidden. "Hide
  this entry" of the legend is now *Leave it out of the legend*, as it never hid the curve.
- **Data › Calibrate** gathers X on reference peaks (now a parabola with three references or
  more, for a wavelength error that curves across a detector), channels to energy, scaling X,
  and dividing Y by a reference's response (a lamp or a white standard).
- **Subtracting another column cancels it.** The scale can be fitted by least squares, with or
  without an offset, over a stretch where only the other column's features are (a solvent band)
  or wherever both have values. The other column can be shifted along X, and can be a data
  column that is not plotted. The scale found is said in the step.

### 2026-11-07: analyses and result sheets (PARITY_SPEC wave 1, slice 1.3a)

- **Results on a sheet of their own, locked.** Origin writes an analysis's numbers into a report
  sheet; so does Kurve, so they can be plotted, read by a formula and copied like any column. The
  lock on its tab says at a glance that the sheet is worked out, and typing into it says where to
  change it instead (Change settings…), rather than failing in silence.
- **The processed values, named.** An analysis reads what the graph shows, so a column's mean is
  one number everywhere; the dialog names the steps it reads after, and Original is one switch away.
  The report says what the steps did to the rows, because a mean of resampled points is not a mean
  of measurements.
- **Out of date is shown, not hidden.** Set to recalculate only when asked, a changed input turns
  the tab's lock into the warning sign with the reason in its tooltip.
- **One report, three readers.** Results, Copy and the exported report draw from the same report
  object, so what is copied can never differ from what is shown (1.3b). Results gains a *Showing*
  list only once there is an analysis: a first user sees the fit alone, as before.
- **Long work does not hold the page** (1.3c): a million values are worked out beside it, with a
  message carrying Stop, and the results come in when they are ready.

### 2026-11-07: graphs read text (PARITY_SPEC wave 1, slice 1.2d)

- **Group by makes ordinary curves.** Origin's plot by group draws a curve per value of a column;
  here each is a derived column with a *Category* step, so it has a History lane, a colour, a fit
  and a legend entry like any curve, and follows the column's cells. They form one group stepping
  the colour, so they read as one family.
- **A categorical X is placed, not measured.** Text has no position, so its levels go at 1, 2, 3…
  in the column's order and the axis is numbered by their names: the order the person set in
  *Categorical…* is the order on the graph.

### 2026-11-07: categorical columns (PARITY_SPEC wave 1, slice 1.2c)

- **A property of the column, not a new kind of cell.** Making a column categorical changes none of
  its values: it says that its different values are levels with an order. So it lives in the
  column's menu beside *Cells hold*, is one undo step, and leaves the check code alone.
- **The order is shown with the counts.** The dialog lists every level with how many rows hold it,
  so a typo ("hgih", one row) is seen before it becomes a group of its own on a graph.
- **A limit in words.** Past 200 different values a column is values, not categories; it is
  refused saying so rather than listing a thousand levels.

### 2026-11-07: text in the worksheet (PARITY_SPEC wave 1, slice 1.2a)

- **Kept, not refused.** Lab data carry "<LOD", "n/a", "sat." among their numbers; a cell that
  refused them made the person throw the information away or keep it elsewhere. What does not read
  as a number is kept as text, said once a column with Undo, so a mistyped number is not silently
  accepted either.
- **Seen where it is.** In a column of numbers a text cell sits left as text does in a spreadsheet,
  with a dotted underline and a tooltip, *Text, not counted as a number*: the eye finds it among
  right-aligned numbers, and the underline says why the graph has a gap there. A text column's
  cells are plain.
- **Left out, and said.** Everything that reads numbers leaves text out as it leaves out an empty
  cell; the status bar's numbers of the selected cells say *Text n left out*, so a mean of nine
  values is not taken for a mean of ten.
- **One choice, in the column's menu.** *Cells hold* (Numbers and text, Text only, Numbers only)
  is Origin's Format, in Kurve's words; Numbers only is refused while text is there, naming the
  rows, rather than throwing the text away.

### 2026-11-07: project files (PARITY_SPEC wave 1, slice 1.1)

- **A project leaves the browser as one file.** Until now a project lived only in this browser:
  exports carried its data or its picture, never the project, so it could not be taken to another
  computer, sent to a colleague outside a shared workspace or kept safe from a cleared browser. A
  `.kurve` file is the whole project (values, steps, peaks, bands, fits, graphs, styles, the
  original data's record, the discussion), compressed.
- **Ctrl+S saves to a file, as every desktop program's does.** The project still saves itself into
  the browser at every change (nothing is lost by not pressing it); Ctrl+S is the copy outside. The
  first press asks where, and for the rest of the session the same file is written again silently,
  as Origin's and Excel's Save does; *Save a copy* always asks. The browser forgets the file's
  permission at a reload, so the next session asks once again rather than pretending to remember.
  Where the browser cannot ask (Firefox, Safari), each save is a download.
- **Opening never changes what is here.** A file opens as a new project beside the others, under a
  name of its own, with nothing to undo: merging a file into an open project would make "which
  values are these" a question, and Copy from another project already does it on purpose.
- **Checked before anything is made, said in words.** A file that is not a project, is cut short,
  was made by a newer Kurve or holds a column whose values do not add up is refused with what is
  wrong, and nothing appears half-opened. Once open, its values' check code is worked out again and
  the message says whether they are as they were saved: the file is evidence, as the record is.
- **The menu names the outcome** (*Save to a file…*, *Open a project file…*), not the format, beside
  *Import data…*, which reads someone else's file into this project; a `.kurve` dropped or chosen to
  import opens as a project rather than being refused, since what was meant is clear.
- **A backup is every project at once**, for a person changing computers or clearing a browser;
  restoring lists them, each ticked, so a backup is never an all-or-nothing replacement.

### 2026-11-06: Proposed settings (roadmap 10, slice 3)

- **A suggestion that can be taken in one click.** A colleague who would set a step differently can
  say so as settings, not prose: *Propose settings…* in the step's discussion opens a copy of its
  form, and the comment lists each change as *Window 9 → 15*. Nothing changes until someone presses
  *Apply*, which is one undo step and a log line naming whose proposal it was.
- **Where it stands is said, not guessed.** The comment says when the step has those settings, when
  it has changed since the proposal, or that the step has gone (and offers nothing then). Only the
  settings a form shows as a list, a switch or a number can be proposed; the rest is said in words.

### 2026-11-06: Mentions (roadmap 10, slice 2)

- **@ and a name, as everywhere.** Any comment box offers the people the project knows as a name is
  typed after @, in the list the formula suggestions already use, its keys taken before the box's
  own (Escape closes the list, not the reply). Only people known by name: a mention is for someone
  who can read it.
- **Named is marked, naming you is said.** A comment keeps whom it names, marks their names in the
  talk colour, and one naming you says *Mentions you* and is announced by a message with Go when it
  arrives; *For you* gathers those threads.

### 2026-11-06: New comments (roadmap 10, slice 1)

- **New is someone else's, since you last looked.** A comment a colleague wrote after this browser
  last showed its thread says *New*, in the talk colour the badges already use; its History box's
  badge is ringed and the Discussion's button counts it, so a person returning to a project sees
  where to look without opening anything. One's own comments are never new.
- **Shown is read, a moment later.** A thread on screen in the Discussion window or a box's
  inspector is read 1.5 s after it is drawn there, long enough to see what was new; *Mark all read*
  does all of them. A project opened here for the first time is not all new: what was there before
  this browser had it is read.

### 2026-11-06: Thousands of columns (roadmap 9, slice 3)

- **Asked once, not once per column.** Two thousand columns made every save take a second or more,
  though no part looked slow: each column's colour, X and error bars walked the whole list. A render
  works out the answers about the columns once; a map keeps its picture until what it shows changes.
- **What cannot be read is not drawn.** The History draws the boxes about the view (a thousand
  lanes are four thousand boxes), and Statistics lists 200 columns with *Show them all*, Copy giving
  every one: a table of 2000 rows is a thing to copy, not to read.
- **A line that only stripes is a short line.** With the lanes wrapped into bands, the lines from the
  original data's box ran down behind every band above, hundreds of them a grey stripe; a lane of a
  lower band now shows a short line over its box.

### 2026-11-06: The worksheet draws the columns in view (roadmap 9, slice 2)

- **A wide sheet behaves as a long one.** Rows were drawn about the view and columns all of them:
  600 columns laid out 20 000 cells for the 40 on screen, a second a save. Past 40 columns only those
  about the view are drawn (half a screen either side), a spacer standing for the rest, so the scroll
  bar, every column's place and the keys are as before; a narrower sheet is drawn whole, as it was.
- **What waits stays put.** A name being typed in a column scrolled away waits, the grid keeping the
  keys, and comes back with its text when typed into, as an edit in a row scrolled away does.

### 2026-11-06: Every example, end to end (roadmap 9, slice 1)

- **The first demo is the product, so each example is run as a newcomer would**: its fit, its peaks,
  its Overview's first steps, its report and CSV, in one pass, with no page error. Each part had its
  own test; run together, the Raman example's peak finder called a wiggle beside the band a second
  peak.
- **The noise the data state comes first.** The finder's Automatic noise takes the error bars when
  every point has one, before √N from the counts or a figure it works out: a camera's counts carry
  read noise and gain that √N leaves out, and the error bars a file brings are the person's own
  statement of their noise.

### 2026-11-06: Princeton Instruments SPE (roadmap 8, slice 4)

- **One name, two formats.** `.spe` is Maestro's text and Princeton's binary; every `.spe` is read as
  bytes and decoded as text unless its header is Princeton's (a NUL in its first bytes, the end mark
  or a version 3 header), so the analyser files that read before still read.
- **X as the camera's software gave it**: LightField's list of wavelengths, else WinSpec's
  calibration polynomial, else the pixel, said in the dialog; the laser line kept as a field, since
  Raman shift needs it.

### 2026-11-06: OPUS (roadmap 8, slice 3)

- **Told by its bytes, not its name.** OPUS files are named `sample.0`, `sample.1`, a name many text
  files share; such a file is tried as OPUS by its first four bytes, and read as text when they are
  not OPUS's, so nothing that read before stops reading.
- **One spectrum, the one people mean**: the absorbance (or transmittance) block when there is one,
  else the single channel, else the interferogram, with the sample's name and the measurement's
  settings as the column's header fields.

### 2026-11-06: SPC (roadmap 8, slice 2)

- **The first binary format, read the way text is.** An SPC file is decoded from its bytes into the
  same table a text export would give (its header's fields as `Key: value` lines, then the columns
  under their names), and the import goes on from there: the dialog, a drop and several files at
  once read it as they read text, with nothing of their own to learn.
- **Subfiles are columns**: several on one X are one X and a column each; each with its own X are
  X, Y pairs, as two exported tables would be.
- **The old format is refused** with the reason and what to do: it is rare now, and read wrongly a
  spectrum is worse than none.

### 2026-11-06: JCAMP-DX (roadmap 8, slice 1)

- **Decoded before it is shown.** A JCAMP-DX file is mostly a compressed code no one reads; the
  import dialog shows the decoded table (X and Y under their names) with a line saying the file was
  JCAMP-DX and in which form, so its settings mean what they mean for any table.
- **Its words, not its codes**: `1/CM` is Wavenumber in cm⁻¹ (Raman shift for a Raman spectrum),
  `ABSORBANCE` Absorbance; the rest of its labels are the column's header fields, as an
  instrument's header is, and the worksheet shows them as rows.
- **Refused in words** where it is not read (data in pages, as NMR writes): a file read wrongly
  would be worse than one refused.

### 2026-11-06: a trend graph as a graph like any other (roadmap 7, slice 4)

- **Origin's way: the results are a worksheet, and a graph is plotted from it.** Rather than a
  second set of formatting controls for trend graphs, *As a graph like any other* puts a trend's
  numbers on a sheet of their own and plots them: the graph then has everything any graph has
  (the Format pane, saved styles, figures, panels, every export), and nothing new to learn.
- **A copy, and said to be one**: each column's comment says which trend and when, since a fit
  made again changes the trend graph and not the sheet; the trend graph stays, following the data.

### 2026-11-06: global fits in a worker (roadmap 7, slice 3)

- **A long fit must not take the page.** Eighty spectra fitted together held the page for seconds:
  no scrolling, no Stop. The solving now runs in a worker made from the page's own numerics (the
  blocks the tests already run under node), so nothing is duplicated and the result is the same to
  the last digit; the windows stay live and the progress line's Stop is heard (the worker is ended).
- **Where a worker cannot be made, nothing is lost**: the fit runs on the page as before.

### 2026-11-06: the files' header fields as rows (roadmap 7, slice 2)

- **Where Origin keeps them.** A file's header (the temperature, when it was taken, the exposure)
  was kept with each column and shown only in the History's Original data box; Origin shows such
  fields as rows under a column's Long Name and Units. They are rows here too, from the corner's ⋯
  beside Comments and Sparklines, so the sheet stays short until someone asks.
- **Read only, and outside the selection**: the header is what the file said, as the original data
  are; typing over it would be a second record of the measurement. A press on a value does nothing.
- **A field's name is where its use is**: *Use as the series* (what the Batch window, the trend
  graphs, maps and a parameter that follows the series run over), offered only for a field with
  numbers or dates that differ, the reason said when it is not.
- **Eight at most**, the most common first: header rows are sticky as the label rows are, and a
  file with forty fields would push the data off the screen.

### 2026-11-06: a parameter that follows the series (roadmap 7, slice 1)

- **The line through the results, fitted with them.** People fit each spectrum and then draw a line
  through the centres against temperature; the slope's error then ignores each centre's own error
  and its trade-off with the width. A parameter can follow the series inside the global fit
  instead: two numbers for all the columns, their errors from the whole covariance, as Origin's
  global fit with a parameter defined by a function of a dataset's variable.
- **A choice per parameter, in the same list.** Its own, Shared, A line in the series, Arrhenius in
  the series: one list beside each parameter, as the dialog already listed them, the kinds' ticks
  still setting Shared for a whole kind. The line is offered only when every column has a value of
  the series, Arrhenius only when those are temperatures (K, °C or °F), so nothing offered fails.
- **Said where the shared values are said**: the Batch window's summary names it after the shared
  ones, with the line under it in words (the value at the middle of the series and the change per
  unit, or the activation energy in kJ/mol); Results marks the parameter *follows*, as it marks
  *shared*.

### 2026-11-06: a peak's shape by its own handle (roadmap 6, slice 4)

- **A shape is a slider, not a place.** The dot is where a peak is and the side handles how wide;
  a pseudo-Voigt's Lorentzian fraction, a Pearson VII's m and a Fano's 1/q are neither, so they get
  a short track of their own with a diamond, as a range slider has, over the peak's number (the
  space above a top is the emptiest there is), below the top when that is off the plot.
- **The top stays where it was put.** Changing the shape keeps the height (and a pseudo-Voigt's or
  Pearson VII's FWHM, which their width is): only the tails change, which is what the parameter
  means; a handle that also moved the top would undo what the dot just set.
- **Each on its own scale**: the fraction from Gaussian at the left to Lorentzian at the right; m
  on a log scale, as 0.5 to 50 is; 1/q with its zero marked and caught within 3 px, a symmetric
  line being the one value people look for. The track sits at the peak's centre parameter, not its
  top, since a Fano's top moves with 1/q and would carry the track from under the pointer.
- **The keys too**: `,` and `.` a fiftieth of the track, `<` and `>` ten, next to `[` `]` for the
  width.

### 2026-11-06: annotations and peaks by the keys (roadmap 6, slice 3)

- **Tab, as a drawing program has it.** On the graph, Tab selects each thing that can be moved in
  turn (the annotations in the order they are drawn, then the peaks being set up), and the arrows
  move it a pixel, Shift ten, as PowerPoint and Illustrator nudge. A peak's arrows are its centre
  and height, the dot's drag; `[` and `]` its width, as an image editor sizes a brush.
- **No trap.** Past the last (or before the first) Tab lets go and the focus moves on, so a
  keyboard user is never held by the graph (WCAG 2.1.2); Esc lets go without leaving.
- **A burst is one step**, as a held slider's: presses on one thing within a second and a half are
  one undo entry and one log line, so undo is not forty presses long.
- **Said, not shown**: the screen reader hears what is selected and where it is among the others
  ("A vertical line at x = 85, 1 of 2"), and each move's new place.

### 2026-11-06: the History's zoom and wrapped lanes (roadmap 6, slice 2)

- **Twenty columns are twenty lanes**, and the History scrolled sideways past the third. Lanes now
  wrap into bands that fit across the view, as text wraps, on unless switched off (*Wrap lanes*);
  each lane keeps its boxes in order, so reading a column's processing is unchanged.
- **Zoom as a map does**: −, the percentage (back to 100 %), +, and Fit, the same four a viewer has;
  Ctrl and the wheel too. Kept in this browser, as the dock's width is.
- Found on the way: dragging a step's box did nothing once anything had been saved (the boxes
  hold the processing cache's copies of the steps, and the drag looked them up by identity); the
  step's menu said "Step 0". Both find the step by its id now.

### 2026-11-06: the undo list (roadmap 6, slice 1)

- **Where the undo button is, and where Office keeps it.** A right-click on Undo or Redo lists every
  change that can be undone, newest first, then those that can be redone; Edit › Undo list… opens
  the same list under the Undo button. Choosing one takes back it and everything after it, as the
  same number of Ctrl+Z would, so nothing about undo changes but how far it goes in one step.
- **The tooltip stays a name**: "Undo adding text (Ctrl+Z)", as every tooltip names its thing and
  its shortcut; the list is found by the right-click every list in Kurve is, and in the menu.

### 2026-11-06: the graph's own fonts in a PDF (roadmap 5, slice 3)

- **A PDF looks like the graph.** It was set in the standard fonts, the nearest to the graph's; a
  journal figure in Source Sans came out in Helvetica. The faces drawn are now embedded, fetched as
  TrueType from the same Google fonts the page uses (Fontsource's copy, which serves TrueType where
  Google serves only WOFF2), so the text is the graph's and stays searchable and copyable.
- **It falls back quietly but says so.** Offline, or for a face that is not TrueType, the standard
  fonts stand in as before and the export's message names the fonts it could not fetch; when it
  embedded them, the message says that too.

### 2026-11-06: a break at a chosen place (roadmap 5, slice 2)

- **A break's place is a third number**, beside the two ends it already had, in the same dialog
  and the same row of the axis page; left empty it is the break it always was (one scale). A place
  is a percentage of the axis from its low end, so it means the same whether the axis is reversed.
- **What cannot be drawn is not drawn wrongly**: two places that would cross, or crowd an end, are
  set aside and the gaps fall back to proportion, rather than a scale that runs backwards.

### 2026-11-06: polygons and curved arrows (roadmap 5, slice 1)

- **A polygon is a shape.** It is the Shape tool's third choice beside the box and the ellipse,
  and has what they have (outline, fill, text inside, behind the data, pinned), so nothing about it
  needs learning twice. It is drawn as polygons are everywhere: a click a corner, the first corner
  again (or a double click, or Enter) to finish, Backspace to take a corner back, Escape to stop.
- **A curve is a handle, not a setting.** The arrow's bend is dragged by a diamond at its middle,
  the one place on the curve that moves when it bends; its menu offers the two usual curves and the
  Format pane takes a number. Left and right are as seen going from the tail to the head, and
  swapping the ends keeps the curve.

### 2026-11-06: a map from scattered X, Y, Z (roadmap 4, slice 5)

- **A map is a curve drawn another way**, not a layout: the Y column against its X, with the colour
  column it already had for symbols coloured by value. So it is a kind in Plot setup beside Colour
  by value (needing the same Colour column, with the same note until it has one), and a plot type of
  any curve that has a colour column; its colour bar is the one those symbols have.
- **Triangles, in proportion.** The points are joined by Delaunay triangles worked out with X and Y
  each scaled to their range, so a map in millimetres against micrometres is not made of slivers;
  the value is interpolated linearly in each triangle, which never invents a value beyond the
  measured ones, and nothing is drawn outside the points' outline.
- **What it cannot draw it says**, in the curve's Map menu (points on one line, too many points),
  rather than drawing nothing silently.

### 2026-11-06: axes shared per column or per row in a figure (roadmap 4, slice 4)

- **Sharing has a scope.** A figure of a spectrum beside its detail, or two instruments side by
  side, has columns on different X; sharing X across the whole figure squeezed both into one range.
  Share X is now a list (No, Every panel, Panels in one column), and Share Y the same with rows, in
  the figure's Panels… dialog where the sharing already was.
- **The scope changes the range and the zoom, not the look**: panels sharing an axis touch and
  number only the outer edge either way, so switching between the two never moves the panels.

### 2026-11-06: stacked columns and names along X (roadmap 4, slice 3)

- **Stacking is how the columns stand, not a kind of plot.** Columns already stood side by side
  when several curves were columns; *Columns* (side by side, stacked, stacked to 100 %) is a choice
  on any column curve's right-click and the Format pane, so a graph changes how its columns stand
  without being made again. It is a format, carried by saved styles.
- **To 100 %, the axis says Share (%)** and the legend goes below the graph, since every stack
  reaches the top and no corner is free; a legend placed by hand stays where it was put.
- **A stack's error bars are not drawn**: a bar's error is its own value's, and drawn at the top of
  a stack it would read as the stack's.
- **Names along X are typed, per graph.** The worksheet holds numbers, so categories are X values
  (1, 2, 3) named on the graph, the names written in place of the numbers; a graph of more than 60 X
  values is a measurement, not categories, and is told so rather than given 200 fields.

### 2026-11-06: boxes grouped by another column, notched boxes (roadmap 4, slice 2)

- **Groups are a column, as the data are kept.** A lab writes a batch, a dose or a temperature in a
  column beside the measurements, not a column per group; the chart now splits each curve by such a
  column (*Grouped by*, in the box chart's menu and the Format pane), rather than asking for the data
  to be rearranged into a column per group first.
- **A cluster per group, a box per curve in it**, in the curve's colour as everywhere else, with a
  legend only then (one curve needs none: the axis names its groups). X is numbered by the groups'
  values and titled by the column, as an axis is by its column.
- **What cannot be groups is offered greyed, with the reason** (a column of more than 60 values is
  measurements, not groups), so the list stays the sheet's columns and the reason teaches.
- **Notches** follow McGill, Tukey and Larsen, the convention every statistics package shares, and
  the tooltip says what the notch spans, since a notch past a quartile is drawn within it.

### 2026-11-06: a distribution over a histogram (roadmap 4, slice 1)

- **Fitted to the values, not the bins.** A Gaussian curve fit through a histogram's columns
  depends on the bins chosen; the distribution is fitted to the values themselves by maximum
  likelihood, so it is the same whatever the bins, and is drawn in whatever the histogram shows
  (counts, probability, percent, a density, cumulative).
- **Where the histogram is.** It is the histogram's right-click, *Distribution over it*, with
  None first: a choice of one among few, ticked, with a kind the values cannot have greyed and its
  reason as the tooltip, rather than a dialog.
- **Its numbers are in the legend**, with their errors (the unit beside a normal's μ and σ; a
  log-normal's are of the logarithm, so they have none), as the graph will be printed; how well it
  fits (Kolmogorov–Smirnov's D and p) is in the message and the curve's tooltip, where it is read
  once and not printed.
- **In the fit's colour**, as a fitted curve, and the automatic view rises to its top so it is
  never cut.

### 2026-11-05: counting spectra, slice 5 (region edges dragged on the graph)

- **Where a region is, it moves.** The Peaks window's regions were typed or dragged out new; to move
  an edge a user had to read its number off the graph and type it. An edge now drags on the graph as
  a band's does, in the same tools (Zoom, Pan, Label), with a tip saying where it is; letting go
  searches again with it, as one undo step. A press without moving selects the region, so its
  settings show. The roadmap's counting spectra (item 3) are done with this slice.

### 2026-11-05: counting spectra, slice 4 (a nuclide by the set of its lines)

- **A nuclide is its lines, not one peak.** Naming each peak after the nearest line made a single
  weak line enough to "find" a nuclide whose strong lines were nowhere. Under *Identify*, each
  nuclide is now judged by its lines in the spectrum's range at a tenth of its strongest or more:
  present, possible, or unlikely when its strongest line is missing; the lines found and missing
  are listed under it. The verdict words are plain and coloured (present green, unlikely red), the
  reason in the line beneath.
- **Strengths agree or not.** With counted windows (and the detector's efficiency curve), the lines
  of one nuclide must give the same activity: χ² per degree of freedom, or only their spread when
  no efficiency is known (it changes with energy, so a spread then is not a verdict).
- **A shared peak is said**, for both nuclides, and naming prefers a present nuclide's line to an
  unlikely one's when both are in reach. Its counts are not divided between them; that is a fit's
  job.

### 2026-11-05: counting spectra, slice 3 (the detector's efficiency and resolution)

- **A curve, not a number per window.** An efficiency typed into each window does not carry from one
  sample to the next and says nothing between the calibration lines. The project keeps one curve
  of each against energy (the efficiency as ln ε, a polynomial in ln E, as gamma spectroscopy
  writes it; the resolution as FWHM² = a + b·E), made in a dialog from typed points or from a
  calibration source counted in the Integrate window. A window with no efficiency typed uses the
  curve's, shown greyed in its field with where it came from; typing a value still wins.
- **The curve's error goes into the activity**, from the fit's covariance, so an activity from a
  curve made of three uncertain points says so.
- **A window wider than a line is marked.** With a resolution curve, a counted window more than 1.3
  times as wide as a single line there is marked: two lines in one window, which the net counts
  cannot tell apart.
- **A dialog, not a window.** The curves are set once per detector and geometry, not worked beside:
  a dialog with the points, the curve drawn beside them, and Save (one undo step). Its listeners are
  its own elements' (a dialog body outlives the dialog).

### 2026-11-05: counting spectra, slice 2 (net counts, detection, activity)

- **Counted where the counts are counts.** A window on a spectrum of counts is an analyser's
  region of interest: net counts over a straight continuum through the channels at its edges,
  with the counting error, and Currie's critical level and detection limit. The Integrate
  window's area (a trapezoid in counts·keV) stays for the other uses; the counting is a part of
  its own under it, shown only for counts. A smoothed or background-subtracted spectrum is not
  counted: the numbers would look right and be wrong, so the part says why instead.
- **Detected or not, said.** A net count below the critical level is shown as not detected,
  with the level, and its activity as the detection limit (‹ MDA), as a gamma report would; a
  number that is noise is not shown as a result.
- **The efficiency typed, for now.** Each window takes an emission probability and an efficiency
  in %, the two numbers an activity needs beyond the counts and the live time; the next slice
  makes the efficiency a curve against energy. The activity's error is the counting error only,
  and says so in its tooltip and the report.
- **In the dock**, the rate, detection and activity go on a line under each window, as Results'
  secondary numbers do.

### 2026-11-05: counting spectra, slice 1 (an analyser's own files)

- **A file that states its calibration is calibrated.** Maestro's and the IAEA's .Spe and N42
  carry the energy calibration the analyser was set to; the import makes it an Energy calibration
  step on the counts, on by default, so the spectrum is against energy at once while the counts
  stay as recorded (the step can be switched off, changed or deleted like any other). The dialog
  says it in one line with *Will apply*, which turns it off.
- **The file as written.** The dialog's left side shows the file's own lines with the counts
  marked, not the column Kurve made of them, and the delimiter and line controls are not shown:
  the format is the file's own, and nothing a user could choose there would apply.
- **Dates kept year first.** Maestro writes month first (03/14/2024); Kurve reads only year-first
  dates elsewhere, since 03/01 is March in one country and January in another. Here the format
  says which it is, so the date is turned year first on reading, and a series of spectra can be
  plotted against it.

### 2026-11-05: a day of lab work (heavy files, tabs, windows, rows)

- **Nothing a person imports is lost to the browser's storage.** Projects are kept in IndexedDB,
  as large as the browser lets a page be, not in localStorage's few megabytes; a million-row scan
  had been "Not saved" and gone after a reload. When the browser does refuse a write, the status
  bar says Not saved for that project whenever it is shown (not Saved because another project
  was), and leaving the page asks first: a quiet status word is not enough warning for a loss.
- **Size costs nothing where it need not.** A change to a large project is written as that change
  (a column's values only when they are new), and the page's copy shares the values with the
  store's, so renaming a project of a million rows takes a moment, not a second.
- **Two windows of one project are one project.** Two tabs typing in two columns at once keep
  both, column by column and cell by cell; the same cell keeps the later value, as a shared
  spreadsheet does. An undo takes back this window's change and nothing another window did
  since (Kurve's rule, "your own edits, not other people's", which a snapshot did not keep). And
  not only in the columns (05.11): graphs, annotations, sheets and the other lists of things are
  put back thing by thing, and a part another window changed since keeps that change; an undo
  never takes back what someone else did after it.
- **A drag past the grid's edge goes on** (05.11), as a spreadsheet's does: the fill handle, a range,
  the letters or the row numbers held beyond the grid scroll it, faster the further out, while the
  pointer is still, and the selection or the fill follows. It used to stop at the last row in view.
- **Results fits the dock** (05.11). Its parameter table had seven columns and ran 270 px off the
  dock's side. Narrower than 520 px, t, p, the interval and the dependency go on a line under each
  parameter, and a peak's shape, height, FWHM and share under its centre and area: nothing is
  hidden, nothing scrolls sideways. The report keeps one wide table.
- **The keys follow the pointer into a window**, as on a desktop: a press on a graph's numbers or a
  title bar gives that window the keys, so Delete or Ctrl+V pressed while looking at the graph
  does not change cells behind it. What the press focused itself (a field, a button) keeps it.
- **Rows are sized as columns are**, by the line under a row number, all the data rows of the
  sheet at once (a person sizes rows to read them, and one row taller than its neighbours is
  rarely the point); the line follows the pointer, a double click gives 22 px back, and the
  height is the sheet's, kept with the project.
- **Moving a window selects nothing**, even when the pointer leaves the browser's window.
- **The dock's edge stops where the documents would lose their room** (780 px, a graph and a
  worksheet side by side) instead of turning the dock into a drawer over the whole desk.
- **A window of its own is laid out as itself** at any width, not as the main window's phone
  layout.
- **Counts read as counts**: 1 000 000 rows, grouped by narrow spaces past ten thousand.
- **Error columns are found in the languages lab files come in** (Fehler, Std.Abw., erreur,
  incertitude, errore, incertidumbre), not only English.

### 2026-10-29: the user's reports: sheets, linked zoom, the readers' card

- **A new sheet's empty columns give way.** They are there so a sheet can be typed into at once;
  a file brought in is the answer to them, not something to put beside them. Only what holds
  nothing and was given nothing (no name, formula, steps, place on a graph) goes: a column
  someone named stays, the file beside it.
- **Linked zoom starts off.** Zooming one graph zoomed every graph, which reads as a bug when it
  was never asked for. It is offered in the graph's ⋯ menu (where the person is when they want
  it) as well as Window › Graphs, and the choice is kept per browser.
- **The readers' card floats over the whole app**, not inside the graph: on a small graph it
  covered what it read. Dragged by its head anywhere (over the worksheet, the dock), resized by
  a grip at its corner, never smaller than it can show, always whole on the screen, and kept
  where it was put and at its size for next time; a double-click on its head puts it back at the
  graph's top right. It stays under dialogs, menus and toasts, and a dialog makes it inert.

### 2026-10-29: remembered setups (PLOT_SPEC slice 6)

- **The second plot of a series is like the first.** Plot setup remembers, per sheet, the kind it
  last plotted and what each column was, and starts from them; *Plot like the last time* plots a
  new selection that way without the dialog, which is what a person plotting twenty samples one
  by one wants.
- **The columns selected are still the curves.** A remembered Y does not join a plot it was not
  selected for.
- **What it remembers never changes a column.** A first version gave back error bars an undo had
  taken away, as the drive found: a later plot quietly made a column error bars again. Remembered
  X columns and error bars apply only where the column still is one; labels, colour and size,
  which belong to the graph, always do.
- **When the kind cannot be made, the dialog opens** with its note, rather than a plot that
  silently lacks its sizes.
- Kept in this browser, per project: a habit of the person plotting, not part of the project.

### 2026-10-29: kinds that need another column (PLOT_SPEC slice 5)

- **Chosen by what they look like, as every kind is**: bubbles, colour by value, labelled points
  and error boxes are cards in a row of their own, *With another column*, drawn with the data.
  They were settings inside the Format pane (size by a column, colour by a column, labels from a
  column), where nobody looking for "a bubble chart" would find them.
- **The kind says what it still needs.** A note under *Curves on the graph* says which column to
  mark beside each curve, and names the curves that have none; Plot waits until it is there. A
  kind that silently drew plain symbols would look broken.
- **Error boxes** draw a point's X and Y errors as one box: two errors read as one region. They
  are also a third way to draw any curve's error bars (the curve's menu, the Format pane), and a
  point with only one error keeps its bar.
- The Format pane keeps the look of each (sizes, the colour map, the labels' text).

### 2026-10-29: groups of curves (PLOT_SPEC slice 4)

- **A group is a way to say "these go together"**, as in Origin: a series measured at several
  temperatures, two samples' repeats. Its curves share their plot type and step their look
  together from the first curve's.
- **What steps is a choice**: colour, symbol and line style together (the default), or one of
  them with the others alike. *Symbol only* is the figure for a journal printed in one colour;
  *Colour only* is the screen's. Colours step through the graph's scheme from the first curve's
  place, so a group looks like the rest of Kurve.
- **A curve's own style still wins.** Grouping never takes away a colour someone chose for one
  curve; it only fills in what was left to the defaults.
- **One type for the group.** *Plot type* on any of its curves changes them all, and a curve
  joining a group takes the group's, or "shares its plot type" would be a promise the menu
  breaks.
- **Set per curve**, from its right-click (*Group*: not grouped, a group, a new group with
  another, every curve in one; how the group steps) or Plot setup's Group column: no
  multiple selection to learn. A group of one is no group, and goes.
- **The legend lists every curve.** Origin's does by default; one entry for a group would hide
  which symbol is which.

### 2026-10-29: Plot setup on a graph (PLOT_SPEC slice 3)

*What it plots…* opens Plot setup on a graph's own curves, as Origin's Layer Contents does, from
every menu that is about that graph (its ⋯ menu, a panel's, its right-click, Plot).

- **The same dialog, not a second one.** One place to learn: the list, Add and Replace, ranges
  and axes work as when making a graph. What differs is said in the title (*What Graph 1 plots*)
  and where Into was (*On Graph 1*).
- **No kind is chosen when it opens.** A graph's curves may each be drawn differently (one as
  symbols, one as a line); a kind checked by default would have redrawn them all on OK. Until a
  card is picked, each keeps its own; the histogram card is off, since a histogram is a column of
  its own.
- **The preview is that graph**, changed for one drawing and put back, so its labels, its zoom
  and its look are there.
- **One step, or none.** OK with nothing changed adds no step to undo; otherwise the log and the
  toast name what changed ("Graph 1: took off Third and put the curves in a new order").
- *Curves on it* stays beside it: ticking one curve is quicker than a dialog.

### 2026-10-29: Plot setup rebuilt (PLOT_SPEC slice 2)

The old dialog chose one X and ticked Ys: nothing could say which column was the error, against
which X each curve went, or what a curve drew. It is now Origin's Plot Setup in Kurve's words.

- **Three parts beside the graph itself.** Kind, Columns, Curves on the graph; the preview is
  the graph drawn as OK will make it (processing, error bars, ranges, axes), from the dialog's
  working copy, taken back after each drawing, so Cancel changes nothing. A sketch could not
  show what a range or a right axis would do; the graph can.
- **What a column is, then what is on the graph.** Origin keeps the two apart (designations,
  then a plot list filled by Add), and so does Kurve: marking a column changes nothing until Add
  or Replace. A list that followed the marks live was tried first and gave a curve the wrong X
  whenever a Y's X was not the nearest to its left; an explicit list keeps each curve's X,
  shown and changed in its row.
- **Rules a person can predict.** A Y takes its own X when that is marked, else the nearest X
  marked to its left (X,Y pairs read as the worksheet reads them); an error column goes to its
  own Y, else the nearest Y to its left. Ticks say what Add and Replace take, and mark several
  columns at once.
- **A column's role changes only where nothing is lost.** Other data can become an X or error
  bars here; a Y column, with its processing and its place on other graphs, cannot (its header
  menu does it, on purpose). The options are there, disabled, with the reason as their tooltip.
- **What changes for every graph is said.** A column's X, or error bars given to a column, are
  the column's (the processing and the fits read them), so the toast and the log name them
  ("Column C is the upward Y error bars of B, on every graph"); a range, an axis and labels are
  this graph's alone.
- Below 860 px the parts are tabs, with the graph under each.

### 2026-10-29: the function editor grown, and your functions (FIT_SPEC slice 10)

- **A function of yours is a model like the built-in ones**: a category (the model list files it
  under *Your functions: Kinetics*), each parameter's meaning (shown where a built-in model's is),
  starts that may be formulas of the data, constraints the Fit window starts with when it is
  chosen, and derived values (a name = a formula of the parameters) that Results gives with their
  errors, as it does a half-life. Each is checked as it is typed, with its line, in the editor's one
  message, as the formula already was.
- **One organizer for every function**, the project's and the browser's in one table by category,
  renamed and filed by typing in place (an organizer is for many small changes; a dialog each would
  be slower than typing), with Edit, Delete and the copy between the project and the browser as
  buttons on the row. It is reached where functions are chosen (the model list's foot) and from
  Analyze › Fit.

### 2026-10-29: saved fit settings, and fits that follow their data (FIT_SPEC slice 9)

- **Fit settings are kept as saved styles are**, by name, in the project (shared and undone with
  it) or in this browser, from one menu (*Saved settings*, in the Model heading, where what they
  set begins; Analyze › Fit has it too), with Rename, Delete and a copy between the two. Choosing
  them sets the Fit window up rather than fitting, since the data may need a look first; the toast
  offers Fit. What depends on the project's columns (a column of weights) is not kept; a range
  is kept with its X units and used only on data in the same units; formula starts are measured
  on the data they are used on.
- **A fit can follow its data**, as a set of peaks does: made again with its own settings, from
  its last values, whenever the column's processing, data or mask change, with a line in the log
  and no undo step of its own, so one undo takes back the change and the refit together. A refit
  that fails changes nothing and says why in the fit's notes, and is not tried again until the
  data change again. Off unless ticked: a fit that changes by itself must be asked for.
- The *Saved settings* button sits in the Model heading rather than beside the model's button,
  which then kept too little room for the model's name in the dock.

### 2026-10-29: starting values and constraints as formulas (FIT_SPEC slice 8)

Origin has a Code tab for both (LabTalk run before a fit); Kurve runs no code (FIT_SPEC's
decision 2), so both are formulas of `compileExpr`'s arithmetic, typed where they belong.
Decisions:

- **A start is typed in its own field**, a number or a formula of the data (`max(y) - min(y)`,
  `xat`, `fwhm`), and shown as typed, in italics, its value the tooltip: the grid stays one grid,
  and a formula is visibly not a number. It is measured again by Guess and by every fit, so a
  setting made on one column starts well on the next; 1 iteration and Stop, which say "carry
  on from here", replace it by their numbers.
- **Constraints are rules, one a line, in one box** under the grid, read as typed (what each
  does, or the line and what is wrong): an equality is a parameter that follows the others
  (fitted through them, its error carried, shown in the grid as its formula with Fix off, as a
  tie is in the peak fit); an inequality keeps two parameters in order by fitting the larger as
  the smaller plus a difference that cannot go below 0, so the order holds at every iteration
  rather than being checked after. Free text over a form of pickers: two decays in order is
  `t1 < t2`, and a person who needs it can type it faster than choose it.
- **Refused in words** where it cannot mean anything: a name that is no parameter, two rules for
  one parameter, a circle, a fixed parameter kept above another, the X errors, a fit of every
  column together.
- A new model clears them, as it clears the limits: they name the old model's parameters.

### 2026-10-29: the apparent fit (FIT_SPEC slice 7, its second half)

Origin's *Apparent fit*: a fit made as the points look on the graph's logarithmic axes, so a
straight line on log–log axes is a power law and one on Log Y an exponential. Decisions:

- **Offered only where it means something**: the switch is there while the graph has a
  logarithmic axis (log₁₀, ln or log₂) and says what it will fit ("log₁₀ y against x"); with
  the axis made linear again it stays, unticked and disabled, beside the fit it made.
- **Drawn and read in the data's terms, analysed in the axes'.** The curve, Find X/Y and the
  worksheet's columns read y = 10^f(x), because that is what is on the graph and in the sheet;
  the parameters, R², χ², the residuals and the bands are in the logarithms, because that is
  what was fitted, so the parameters have no units and the residual analysis tests the fit it
  belongs to. Results says *Fitted as* and a note; the report and the CSV say it too.
- **Ticking it measures the starting values again**: a slope in the logarithms is not a slope
  in the data, and the old starting values would only mislead the first iteration.
- **Errors go with the logarithm** (σ' = σ/(y ln 10)); no weights stay none, which is the point
  of fitting as it looks. Zeros and negatives on a logarithmic axis, and the X errors, are refused
  in words rather than dropped.

### 2026-10-29: how points count (FIT_SPEC slice 7, the weights)

The switch *Weight by Y error* became a list, *Weights*, as Origin's Data Selection has: None,
Y error (1/σ²), Counting (1/y) and the sheet's columns by name. Decisions:

- **One list, its consequence in the tooltip.** The choice is between kinds of knowledge (no
  errors, measured errors, counts, a weighting of one's own), not a yes or no, and each option's
  tooltip says what it does to the errors.
- **Absolute and relative weights are treated as what they are.** Y errors and counting say how
  large each point's scatter is, so the errors are taken as they are and the reduced χ² is a test
  (near 1); a column of weights says only how the points compare, so, as with none, the errors are
  scaled by √(reduced χ²). Weights from a column of 1/σ² give the Y error fit's values exactly.
- **Refused in words, never quietly dropped.** A count of 0 cannot be weighted by 1/y, nor a
  point without an error or a weight: the fit says how many points, and what to do (mask them, fill
  them in, choose other weights), rather than leaving them out on its own.
- **Said everywhere the fit is**: Results' Weighting, the report, the copied table, the CSV,
  each kind in words; a column of weights deleted puts the fit out of date.
- A column's weights belong to the column they were made for, so fits of every column use Y
  errors or counting, and otherwise none, each row saying which.

### 2026-10-29: the fit in the worksheet (FIT_SPEC slice 6)

Origin writes a fit's fitted values and residuals into a sheet of their own; Kurve puts them
beside the column fitted, where the data they describe are, as two columns the worksheet
computes. Decisions:

- **Computed, not recorded.** They are formula columns with a formula of their own,
  `fit(B)` and `resid(B)`, shown in their F(x)= rows: out of the original data and its check
  code, never typed over, and a person reading the sheet sees where they come from. The formula
  can be typed into any column too; it is a whole formula (`fit(B)*2` is refused in words),
  because a fit is not a function of a row's value and pretending otherwise would mislead.
- **They follow the fit.** A new fit of the column writes them again (a save that carries a
  fit or a batch fit recalculates them); a fit removed empties them, with the reason in the
  header; while the fit is out of date (the data, the processing or the mask changed since)
  their *fx* mark turns to the warning colour and says so, as the notes say it of the fit.
- **Once per column.** Asked again, the worksheet shows the two it has rather than making
  another pair: two copies of one fit's values would only drift apart.
- **In each point's row**, at the points in the fit's range: a residual beside the value it
  belongs to, a masked point's included (its residual is what shows why it was masked). A
  column made from another has no rows of its own, and the CSV export gives its fit instead.

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
