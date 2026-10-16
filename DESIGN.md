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
- **The first screen is the worksheet and the graph, side by side** (44 % and 56 %), and
  nothing else: a first visit used to open History too, and stacked it under a worksheet that
  then showed no data rows at all at 1366 × 768.
- **Tool windows dock.** Fit, Results, Peaks, Integrate, History, Statistics, the Overview,
  Help, Discussion and the processing tools open as tabs in one column at the desk's right
  (360, 380 or 420 px by the screen's width), one shown at a time. The worksheet and the graph
  share what is left, so a tool never covers the graph it acts on: at 1366 px the graph beside
  the Fit window went from a 346 px strip, an eighth of it under the Fit window, to 552 px in
  full. Batch and Python float, being worksheets of their own.
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
- **The empty graph says what to do next.** Before data: Import and the examples. With columns
  but nothing plotted (after an import, which plots nothing): "Nothing plotted yet" and Plot
  setup…, where before the import closed the graph and left an empty desk.

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

## Plotting

Two routes, as in Origin: **select columns and press Plot** (a quick list of plot types and
layouts), or **Plot setup…** (Plot menu, the top of the quick list, and what Plot opens when
nothing is selected): kinds as pictures, the X column, the Y columns ticked, the target graph,
and a sketch of the result. Plotting is never automatic after an import from the dialog.

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
  inset when zoomed, Python (a menu and the graph's button) once the project uses Python, under
  Analysis › More until then.
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
