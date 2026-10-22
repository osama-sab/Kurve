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
  while open or minimised. Open buttons are raised with a bar, minimised ones flat, the front
  one filled.
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
  it is on top) with a pin to put it beside them and an arrow to put it away. Floating is
  always one drag away (a tab, or the title bar), never the default; the window's dock button
  brings it back.
- **The bars are thin**: toolbar 40, taskbar 30, status bar 24 px. The Project Explorer is
  220 px and a drawer below 1600 px, so at 1366 it no longer takes 250 px from every window.
- **New graphs keep 480 px.** A graph made beside the worksheet takes its share; otherwise it
  goes beside or below the graph in front, and when neither leaves 480 by 300 px it takes the
  old graph's place and the old one waits in the taskbar.
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
- **Three header rows**: the letters, Long Name and Units (66 px; it was 148). Comments, F(x)=
  and Sparklines are behind the ⋯ in the corner, per project. F(x)= shows itself once a
  column has a formula, and a formula typed into a cell as in a spreadsheet (`=log10(B1)`)
  moves there, still being typed, with a message that a letter is the whole column: Phase 1's
  user typed exactly that and was told it was not a number. Rows are 22 px: 21 data rows in
  view at 1366 × 768 on a first visit, where there were none.
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
- **The footer keeps to one row** in the dock: Fit, 1 iteration, Guess, Done. *Remove fit* is
  in the fit's summary, beside Results, with the fit it removes.

## Menus and the toolbar

The menu tree is `ux/spec/menus-after.txt`; `tools/ux/menucheck.py` compares the app's with it.

- **Nine menus**: File, Edit, Data, Plot, Analysis, Statistics, Spectroscopy, Window, Help. Math
  folded into Analysis (Mathematics, Smooth and filter), as Origin's Analysis does.
  Spectroscopy has a menu of its own: the Overview, spikes, background, peaks, known lines, the
  X-axis tools and the corrections were spread over five menus where a general user met them.
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
- **Moving along the menu bar** opens the next menu only after the pointer rests on its name for
  150 ms: a pointer crossing the bar on its way into a submenu changed menus (Phase 1, T2).
- **Toolbar**: Explorer │ Import, Export │ Undo, Redo │ Zoom, Pan, Mask, Label, Arrow, Shape │
  Show all │ Reverse X, Log Y, Grid. The switches are off until there is data. Comment shows
  in a shared project only (alone, Add here › A comment here…). What the graph shows, Original,
  Processed or Both, is on the graph window's own bar, beside the menus it repeats; the plot
  type and the layout are in Plot and a curve's right-click; the residual panel is switched in
  the Fit window and Analysis › Fit; Add a peak is a button in the peak fit's second part.
- **Right-click menus** hold what belongs to the thing clicked, then Add here, then Format
  graph…, Copy the graph as a picture and Export (the File › Export list). A curve's menu needs
  the click on the curve (within 14 px of a point); elsewhere it is the plot's, with Add here
  inline. None repeats a Plot submenu; the axis menu leaves the outward offset and the edge
  across to the Format dialog. The worksheet's column menu chooses a use (Use as › X, Y, Error
  bars, Other data) and the active column.

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

### One box for typing

`inlineBox` is the only in-place editor: a field over the text, the superscript, subscript
and symbol buttons, a line showing the LaTeX typeset as it will be drawn (or, before any
LaTeX, the keys and a few examples), Enter to keep, Esc to leave, ⋯ for every setting. Titles,
legend entries, the legend's title, labels, text and line text all use it. In dialogs, every
rich field is `.rfield`: the field, the same three buttons, and the same preview under it.

### One menu order

Everything with text has the same right-click menu, built by `textMenu`:

1. its name (a heading)
2. **Edit text** (Double-click)
3. **Size** › points, **Bold**, **Italic**, **Colour** › swatches and Automatic
4. what is its own (an axis title's place, a line's style and width, a label's mark, the
   legend's place and columns…)
5. **Format…**, its page of the Format dialog
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

- The Format dialog's Labels and lines page has **one Add button** with a menu (each kind with
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
- **Saved style**, not format, for a named set of graph settings; the Format dialog keeps its
  name.
- **Untitled project**, not Untitled analysis.
- **Not counted as a peak**, not turned down, for a candidate the finder set aside.
- **Spectroscopy's words** (spectrum, band, background, spike, Raman shift, known line) belong
  to the Spectroscopy menu and its windows (Peaks, Peak fit, Integrate, Overview, the
  spectroscopy tools), where they are the right words, and nowhere else.

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
  the Overview's own test. The Spectroscopy menu always has them.
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
analysis of variance, the correlation and covariance, the residuals) fold, so the parameters
stay at the top of a short dock; Residuals opens by itself when there are outliers, and the
notes above the table say so, so the report does too.

An outlier is a point whose studentised deleted residual is past the t limit for the largest
of all the points (Bonferroni), not past a per-point 95% limit, which would flag one point in
twenty of perfectly good data and teach people to ignore the flag. Outliers are ringed on the
graph and in the chart, listed with their leverage, and masked in one step, which leaves the
fit out of date until it is fitted again: masking is the user's decision, refitting too.

The analysis costs a Jacobian, which for a peak fit of thousands of points is a third of a
second. It is worked out only while Results is open, and for a fit that heavy only when its
section is opened; the notes check for outliers only when the model is cheap (timed on one
sweep), so a fit never waits on its own diagnostics.

### 2026-10-17: defaults (UX rework, Phase 4 slice 5)

From the Phase 2 defaults audit and Phase 1 T2, T4, T6 and T8: a Gaussian offered for a
straight line, a units row taken for the names, the first of three groups made X and left
out of the statistics, a spectrum drawn as dots, residuals under every fit, a fit range that
silently followed the zoom, √N offered for ages, spectroscopy's measures for a survey.
Decided: the defaults above, each shown and one click from changed. T2, T6 and T8 each lost a
step (T8's was slice 4's one regression); no task got worse.
