# Phase 2: feature inventory and scope audit

Kurve as of commit 78bb498 (the Phase 1 commit; `kurve.html` has not changed since ff7f3a8).
This inventory lists every user-facing thing:

- every menu item, including submenus
- every toolbar button
- every window, dialog and panel
- every context-menu item
- every keyboard shortcut

Each row has a verdict. The three audits follow the tables, then the Remove candidates for STOP 2, then
corrections to the Phase 1 report.

## How it was made

- **Menus come from the app itself, not from screenshots.** [`tools/ux/crawl.py`](../tools/ux/crawl.py)
  sets up a project with something in every menu:
  - the IR example
  - a peak fit and a peak set
  - a band
  - a text, a line, an arrow and a box
  - a processing step and a folder
  - a second graph, then a figure of both graphs

  It then calls each of the 63 menu builders and walks their item trees, submenus included.
  For each item it records the label, shortcut, state, note, and the code the item runs.
  It also opens each of the 15 windows and records its visible controls. The toolbar,
  taskbar and Explorer header are read from the page. The raw result is
  [`inventory/crawl.json`](inventory/crawl.json): about 2,000 menu items in all.
- **Duplicates were found by the code they run.** Two items in different places that run the
  same code are one feature with two routes. The "Every place" column lists all of them.
- **Items that depend on data the crawl did not have** were read from the source and from
  Phase 1:
  - the Error bars submenu of a curve that has error bars
  - the X-error switch in the Fit window
  - the map options of the heat-map layout
  - a trend graph's ⋯ menu
- **Dialogs** were listed from every `formDlg`, `confirmDlg` and static modal in the source.
  **Shortcuts** come from the Help "Keyboard shortcuts" article and the key handlers
  (document, graph, worksheet, History, Explorer).
- **One setting is one row.** A list of values for one setting is a single row, for example:
  - the 8 axis scales
  - the 11 point sizes
  - the colour swatches
  - the frame's three choices

  A menu that appears in several places (Font, Legend, Several spectra) is also one row.
  An item that only reports state (a disabled "The first graph cannot be deleted") is left out.
- **Origin and Excel equivalents** are from `ORIGIN_MENUS_AND_TOOLS_REFERENCE.md` and
  `ORIGIN_UI_AND_WORKFLOWS.md` for Origin, and Excel 365's own menus. A dash means neither has one.
- **The Phase 1 column** names the tasks that used the feature, or saw it in a way that
  mattered (T1–T13, `ux/COLD_WALKTHROUGH.md`); "none" if no task did.

### Place codes

| Code | Place |
|---|---|
| File ›, Edit ›, Plot ›, Data ›, Math ›, Analysis ›, Statistics ›, Window ›, Help › | the menu bar |
| GB | the graph window's own bar (Data, Math, Analysis, Statistics, Plot: the menu bar's lists, again) |
| TB | the toolbar |
| RC | the graph's right-click menu: the common part, on empty plot, a curve or the fit |
| RC-curve, RC-fit | the curve's or the fit curve's own section at the top of RC |
| Axis RC, Title RC, Legend RC, Label RC, Peak-label RC | the right-click menu of axis numbers, an axis or graph title, the legend, an annotation, a fitted peak's label |
| G⋯, F⋯ | a graph window's ⋯ menu, a figure window's ⋯ menu |
| Grip | the grip in a graph window's title bar (several graphs only): drag, or click for its menu |
| TK, PJ | the taskbar; the project menu (the taskbar's project button, the arrow by the project name) |
| XP | a Project Explorer row's menu (right-click or the menu key) |
| WS, Cell RC, Col | the worksheet's bar; a cell's right-click menu; a column's header menu |
| H+, H-step, H-box | the History's Step button and the "+" between boxes; a step box's menu; a raw or final box's menu and the spectrum's ⋯ |
| dbl, key | a double-click; a keyboard shortcut |

## Summary

**327 rows.**

| Verdict | Rows | Share |
|---|---:|---:|
| Keep | 201 | 61 % |
| Rename | 45 | 14 % |
| Merge | 34 | 10 % |
| Move | 18 | 6 % |
| Hide by default | 23 | 7 % |
| Remove candidate | 6 | 2 % |

| Domain | Rows |
|---|---:|
| general | 235 |
| spectroscopy | 36 |
| power user | 56 |

| Used by a Phase 1 task | Rows |
|---|---:|
| at least one task | 98 |
| none | 229 |

Rows are counted by their first verdict. Many rows say "Keep" and then name a rename or a
move for one of its places; those are counted once, as Keep.

What the counts say:
- **Most of Kurve is in the right place.** Three rows in five are Keep.
- **What goes wrong is how things are reached and named.** Rename and Merge together are a
  quarter of the rows.
- **The menus are deep.** 229 of 327 rows were not needed by any of the thirteen tasks,
  which is expected of an analysis program. But many of those 229 are in the newcomer's path:
  - The graph's right-click menu has 98 to 116 items.
  - The Plot menu has 152.

**Remove candidates: 6.** They are listed in full at the end, for STOP 2:
- the Graphite interface style
- the one-band Raman example
- the processing-steps JSON export
- the Plot › Format submenu
- the graph window's own menu bar
- the "All graphs as one figure" exports

Every other change proposed here is a move, merge, rename, re-default or hide, which the plan
allows without approval.

**Looked for in Phase 1 and not there.** These are not verdicts, since nothing can be added
during the freeze. Phase 3 has to decide whether the freeze holds for them:
- **No Save or Open of a project file.** T2 looked for one. Projects live in this browser
  only.
- **No "Add trendline" and no "Show equation on chart"** (T2).
- **A file with a text column is refused** (T6).
- **The Edit menu has no Cut, Copy, Paste, Delete or Select all.** Seen in the crawl, not in
  a task.
- **An earlier fit's report cannot be brought back** (T7).

---

## A. Projects, files and export

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| New project | File ›; PJ; XP root › Projects | "New project" in all three | T6, T13 | File › New › Project | File › New | general | **Keep**: core, one name. Going from File down to New project, the pointer can pass over Edit, the menu changes to Edit, and the click lands on Undo (see Corrections). |
| Switch project | PJ list; TK project button; XP root › Projects | the project's name, with "1 spectrum · 3 graphs" | T6, T13 (its New project) | File › Recent Projects | File › Open › Recent | general | **Keep**: the notes say what each project holds. |
| Rename project | File ›; PJ; XP root; a click on the name in the title bar | "Rename project"; "Rename this project"; "Rename the project…"; (click) | T13 (opened by stray keys) | Project Explorer › Rename | Save As | general | **Rename**: four routes, three names; use one. |
| Delete project | File ›; PJ | "Delete project…"; "Delete this project…" | none | (delete the .opju) | (delete the file) | general | **Rename**: one name. |
| Import data | File ›; Data ›; TB Import; Ctrl+O | "Import data…"; "Import"; Ctrl+O | T2, T4, T6, T7, T8, T13 | File › Import; Data › Import From File | Data › Get Data; File › Open | general | **Keep**: File is where A looks first and Data is where B does, so both menus earn it. Ctrl+O imports, where Origin and Excel open a project. |
| Drop files on the window | drag from the computer onto a graph, the desk or an Explorer folder | the overlay's message | none | drag onto a book or graph | drag onto the sheet | general | **Keep**: plots at once, as Excel does. |
| Read it differently (after a drop) | the toast after a drop | "Read it differently" | none | Import Wizard › re-import | — | general | **Move**: the vanishing toast is its only route (toasts were missed twice at 1280 px). Add it to the file's Explorer menu too. |
| Bring in from another project | File ›; Window ›; PJ; XP root › Projects; G⋯ › Combine; Grip menu | "Bring in from another project…"; "Bring in spectra from another project…" | none | File › Append | Move or Copy Sheet | power user | **Merge**: six routes, two names. Keep File › and the Explorer, and rename it "Copy from another project…". |
| Example: infrared, overlapping bands | File › Examples; Help window (Getting started) | "Infrared: overlapping bands"; "Infrared example" | none | Learning Center samples | templates | spectroscopy | **Keep**: the one example with several bands and a shoulder. |
| Example: raw Raman polystyrene | File › Examples; Help window | "Raman: raw polystyrene (background, spikes)"; "Raw Raman example" | none | Learning Center | — | spectroscopy | **Keep**: shows spikes and background. |
| Example: Raman, one band | File › Examples | "Raman: one band" | none | — | — | spectroscopy | **Remove candidate**: a second Raman example that shows less than the polystyrene one. With one band it cannot show peak finding (CLAUDE.md's own lesson). |
| Example: fluorescence decay | File › Examples | "Fluorescence decay" | none | Learning Center | — | general (a curve fit) | **Rename**: "Exponential decay (fluorescence)". The only example that is not about peaks. There is no general example (a calibration line, growth curves, groups). |
| Export menu | File › Export; TB Export (the same list) | "Export" | T9, T12 | File › Export Graphs; Export ASCII | File › Export; Save As | general | **Keep**: two routes, one list. |
| Export dialog for a paper or slides | File › Export; TB Export; RC › Export the figure; F⋯ › Export the figure | "Figure for a paper or slides…"; "For a paper or slides…" | none | Export Graphs (Advanced) | Save As › PDF | general | **Keep**: the real export dialog, with size, points, dpi and format. The one-format entries below are its presets. |
| Export the graph as SVG | File › Export; TB Export; RC › Export the figure; G⋯ › Export; F⋯ › Export | "Figure as SVG (vector, for papers)"; "As SVG (vector, for papers)"; "This graph as SVG"; "As SVG" | T9 | Export Graphs › SVG | Save as Picture › SVG | general | **Merge**: five routes, four names, one action. One Export list, with one set of names. |
| Export the graph as PDF or EPS | File › Export › Figure as PDF or EPS; TB Export; RC; G⋯; F⋯ | "PDF (vector, standard fonts)"; "As PDF (vector, standard fonts)"; "This graph as PDF"; "As PDF". EPS has the same four forms. | T9 | Export Graphs › PDF, EPS | Save As › PDF | general (EPS: power user) | **Merge**: as SVG. EPS can live in the export dialog only. |
| Export the graph as PNG | File › Export; TB Export; RC; G⋯; F⋯ | "Figure as PNG (image, for slides)"; "As PNG (image, for slides)"; "This graph as PNG"; "As PNG" | T1 | Export Graphs › PNG | Save as Picture | general | **Merge**: as SVG. In RC it is two scrolls down a menu taller than the screen (T1). |
| Copy the graph as a picture | Edit ›; File › Export; TB Export; RC; G⋯ › Export; F⋯ › Export | "Copy the graph as a picture"; "Copy the figure as a picture"; "Copy as a picture" | none | Edit › Copy Page | Copy; Copy as Picture | general | **Merge**: six routes, three names. Keep it in Edit and RC, with one name. |
| All graphs as one figure | File › Export (SVG, PDF, EPS, PNG); TB Export; G⋯ › Export (SVG and PNG only) | "All graphs as one figure › As SVG (vector, for papers)…"; "All graphs as one SVG"; "All graphs as one PNG" | none | Layout page | — | power user | **Remove candidate**: a figure of panels does this properly, with the plot areas lined up and shared axes. These entries letter the graphs in a plain grid, and G⋯ offers half the formats under other names. The report would keep using the same drawing internally. |
| Processed data and fit as CSV | File › Export; TB Export; Results "Export data"; History final box "Export data" | "Final data and fit as CSV"; "Export data" | T8 | Export ASCII | Save As › CSV | general | **Rename**: "Processed data and fit as CSV", and the same name in Results and History. |
| Original data as CSV, with its check code | File › Export; TB Export | "Raw data as CSV, with its fingerprint" | none | Export ASCII | Save As › CSV | general | **Rename**: "Original data as CSV". The fingerprint is explained in the file's header, not in the menu. |
| Processing steps as JSON | File › Export; TB Export; History final box "Export the steps" | "Processing steps as JSON"; "Export the steps" | none | (Analysis Template, which Origin can load back) | — | power user | **Remove candidate**: nothing in Kurve reads the file back, and the report and the CSV already carry every step with its settings. |
| Report | File › Export; TB Export; Results "Save report" | "Report as HTML"; "Save report" | T12 | report sheet › Export to PDF | — | general | **Rename**: one name, "Report…". |
| Copy results table | Edit ›; File › Export; TB Export; Results "Copy table" | "Copy results table"; "Copy table" | T8 | copy from the report sheet | Copy | general | **Merge**: a copy is not an export. Keep it in Edit and Results. |

## B. Edit

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Undo | Edit ›; TB; Ctrl+Z | "Undo <what it undoes>" | T6 (by accident) | Edit › Undo | Ctrl+Z | general | **Keep**: the label names what it undoes. That is how the New project slip was traced. |
| Redo | Edit ›; TB; Ctrl+Y, Ctrl+Shift+Z | "Redo" | T6 | Edit › Redo | Ctrl+Y | general | **Keep** |
| Add a column | Edit ›; Data ›; WS + Column | "Add a Y column"; "Add a column"; "Add a Y column" | T5 | Column › Add New Columns | Insert › Columns | general | **Merge**: Edit is not where Origin or Excel put it. Keep Data › and the worksheet's button, with one name. |

## C. Plot menu, plotting and the graph's look

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Plot setup | Plot ›; Plot › Plot the selected columns ›; WS Plot (nothing selected); Cell RC; Col › Plot; XP file and column › Plot | "Plot setup…" | none | Plot › Plot Setup | Insert › Recommended Charts | general | **Keep**: one name everywhere. |
| Plot the selected columns | Plot ›; WS Plot; Cell RC; Col › Plot; XP file › Plot its columns; XP column › Plot | "Plot the selected columns"; "Plot"; "Plot its columns"; heading "Plot Absorbance in a new graph as" or "Or select the columns to plot first" | T5, T6 (T4 used the toast's "Plot them now") | Plot › Basic 2D, with columns selected | Insert › Chart | general | **Keep**: six routes for the commonest action, near one name. Rename the Explorer's "Plot its columns" to "Plot". |
| Plot types (Line, Symbols, Line + symbols, Sticks, Columns, Area, Steps) | Plot › Plot the selected columns; Plot › Plot type; RC-curve › Plot type; TB plot-type list; WS Plot; Cell RC; Col; XP | the same seven names; the toolbar list has six (no Columns) | T5, T8 | Plot › Basic 2D (Line, Scatter, Line+Symbol, Column, Area, Step, Drop Line) | Insert › Chart types | general | **Rename**: "Sticks" is Origin's "Drop lines". Excel users know "Columns" and "Scatter", not "Symbols". |
| Histogram | Plot › Plot the selected columns; WS Plot; Cell RC; Col; XP; Statistics › Histogram of the values; RC-curve › Histogram of its values; H+ › Histogram… | "Histogram"; "Histogram of the values"; "Histogram of its values"; "Histogram…" | T6 | Plot › Statistical › Histogram | Insert › Histogram | general | **Merge**: Statistics' entry makes one histogram of the analysed column whatever is selected (T6). Make it one action that takes the selection. |
| Box chart, violin plot | Plot › Plot the selected columns; Plot › Several spectra; RC › Several spectra; TB layout list; WS Plot; Cell RC; Col; XP | "Box chart"; "Violin plot" | T6 | Plot › Statistical › Box Chart, Violin Plot | Insert › Box and Whisker | general | **Move**: they are chart kinds, not ways for "several spectra" to share a graph. Keep them in Plot setup and the Plot lists. |
| Add to a graph | Plot › Plot the selected columns; WS Plot; Cell RC; Col; XP | "Add to a graph" | none | Layer Contents; drag onto a graph | Select Data › Add | general | **Keep** |
| Open a graph (the list, Combine graphs…, Tile the graphs, Link the X zoom) | Plot ›; Window ›; TK Graphs button | "Open a graph" | none | Project Explorer; Window list | View › Switch Windows | general | **Merge**: the same submenu in Plot and Window, and the taskbar. Keep Window and the taskbar. |
| Format dialog | Plot › Format graph…; RC › Format graph…; dbl on a line, axis numbers or range; every "Format…" | "Format graph…"; "Format…" | T10 | Format › Plot Properties (Plot Details) | Format pane | general | **Keep**: B double-clicked and found it at once. |
| Formats (Kurve's own, Journal, Classic, Slides, Minimal; Save this format…; Give every graph a format) | Plot ›; the Format dialog's Formats button | "Formats" | none | Theme Organizer; Copy/Paste Format | Chart Styles; Save as Template | power user | **Rename**: "Formats" sits beside "Format" and "Format graph…" (the sealed appendix). Call it "Saved styles". |
| Format submenu (X axis…, Second X axis…, Second Y axis…, Y axis…, Frame and grid…, Text and fonts…, Legend…, Lines and symbols…) | Plot › Format | "Format" | none | Format › Axes, Layer | per-element Format pane | general | **Remove candidate**: eight shortcuts into the dialog that "Format graph…" opens. The dialog's page list reaches each page, and so does a double-click on the element. The submenu's name is one letter from its neighbours'. |
| Show all the data | Plot ›; RC › Graph ›; TB; dbl the graph; key 0 | "Show all the data" | none | Graph › Rescale to Show All | (charts scale themselves) | general | **Keep** |
| Several curves on one graph (Overlay, Offset, Stacked panels, Double Y, Heat map, plus Box chart and Violin plot) | Plot › Several spectra; RC › Several spectra; TB layout list | "Several spectra"; toolbar tooltip "Layout of several spectra"; "Offset (waterfall)" | none | Plot › Multi-Panel/Axis (Stack, Double-Y); Waterfall; Heatmap | combo chart | general | **Rename**: "Several curves" (any XY data). "Double Y" becomes "Two Y axes". |
| Heat map options (drawn as, up the side, the series variable, contour numbers, levels, colour map) | RC › Map (heat layout only) | "Drawn as"; "Up the side"; "The series variable"; "Levels"; "Colour map" | none | Plot › Contour; Image Plot | — | power user | **Hide by default**: shown only with the heat layout, which is right. Its "series variable" submenu repeats the Batch window's choice. |
| Reverse X | Plot › Axis options; RC › Graph ›; TB; Format dialog X page | "Reverse X axis"; "Reverse X"; "Reversed (high to low)" | T10 | Axes › Scale › Reverse | Format Axis › Values in reverse order | general | **Keep**: names close enough. In a shared-X figure it reverses one panel (T10), which is a bug, not a placement. |
| Logarithmic Y | Plot › Axis options; RC › Graph ›; TB Log Y; Plot › Axis options › Y axis scale › Logarithmic (log₁₀); Axis RC › Scale | "Logarithmic Y axis"; "Logarithmic Y"; "Log Y"; "Logarithmic (log₁₀)" | none | Axes › Scale › Type Log10 | Format Axis › Logarithmic scale | general | **Merge**: a separate switch and a scale choice set the same thing, and the switch clears a curved scale. Make it one setting, with the toolbar button kept as its shortcut. |
| Axis scales (Linear, log₁₀, ln, log₂, 1/x, 1/(x + c), √, probability) | Plot › Axis options › X/Y axis scale; Axis RC › Scale; Format dialog axis page "Type" | "X axis scale"; "Scale"; "Type" | none | Axes › Scale › Type | Format Axis (linear and log only) | power user (beyond log) | **Keep**: in a submenu already, as in Origin. |
| Second X axis in other units | Plot › Axis options; Plot › Format › Second X axis…; Axis RC (X) › A second X axis in other units…; Format dialog | "Second X axis in other units…"; "Second X axis…"; "A second X axis in other units…" | none | New Layer › Linked Top X | — | spectroscopy (power user) | **Move**: to the X axis's own menu and the Format dialog. Hidden from the Plot menu. |
| Second Y axis in other units | Plot › Axis options; Plot › Format › Second Y axis…; Format dialog | "Second Y axis in other units…"; "Second Y axis…" | none | Linked Right Y | Secondary axis | power user | **Move**: as the second X axis. |
| Axis breaks | Plot › Axis options › Break the X/Y axis…; Axis RC › Break the axis… | "Break the X axis…"; "Break the axis…" | none | Axes › Breaks | — | power user | **Move**: to the axis's menu only. |
| Grid lines | Plot › Axis options; RC › Graph › Grid; TB Grid | "Grid lines"; "Grid" | none | Axes › Grids | Chart Elements › Gridlines | general | **Keep** |
| Residual panel | Plot › Axis options; TB Residuals | "Residual panel"; "Residuals" | T2 (appeared unasked) | NLFit residual plots | (regression output sheet) | general (fits) | **Move**: it belongs with the fit (the Fit window and Results), not under Axis options. Re-default it (see Defaults). |
| Graph font (family list, size Small…Largest, Axis titles in italics) | Plot › Font; RC › Font | "Font"; "Font of all the text"; sizes in words | none | Format toolbar; Plot Details › Page | Home › Font | general | **Keep**. Note: the graph's size is in words and every other size is in points. |
| More fonts, each element's own | Plot › Font; RC › Font; Plot › Format › Text and fonts…; RC › Graph › Text and fonts… | "More fonts, and each element's own…"; "Text and fonts…" | T10 | Plot Details › Text | Format pane › Text | general | **Merge**: the same page under two names. |
| Axis titles in italics | Plot › Font; RC › Font | "Axis titles in italics" | none | (Plot Details) | — | power user | **Hide by default**: the Format dialog's Text page has it. |
| Legend (Place, Text in each spectrum's colour, Legend title) | Plot › Legend; RC › Legend (also size, bold, italic, colour, columns, frame, title, Format…); Legend RC | "Legend"; "Place"; "Legend title…" in Plot, "Add a title" in RC | T4 | Graph › Legend; right-click › Properties | Chart Elements › Legend | general | **Merge**: Plot › Legend and RC › Legend are different lists under one name. Keep the legend's own right-click and one Plot entry. |
| Legend columns (1–4) | RC › Legend; Legend RC | "Columns" | none | Legend › Columns | — | power user | **Hide by default**: the Format dialog's Legend page has it. |
| Vertical or horizontal line | Plot › Annotate; RC "Vertical line at x = …", "Horizontal line at y = …" (at the click); Format dialog › Labels and lines › Add | "Vertical line…"; "Vertical line at x = 1554" | none | Graph › Add Straight Line | Shapes › Line | general | **Keep** |
| Shade an X range | Plot › Annotate; RC | "Shade an X range (drag on the graph)"; "Shade an X range…" | none | Rectangle; Highlight | — | general | **Keep** |
| Arrow | Plot › Annotate; RC; TB Arrow | "Arrow (drag on the graph)"; "An arrow (drag on the graph)"; "Arrow" | none | Tools › Arrow | Shapes › Arrow | general | **Keep** |
| Box or ellipse | Plot › Annotate; RC; TB Shape (its menu: Box, Ellipse) | "Box (drag on the graph)"; "A box (drag on the graph)"; "Shape" | none | Tools › Rectangle, Circle | Shapes | general | **Keep** |
| Text on the graph | RC "Text here…"; TB Label (on an empty spot); Format dialog › Add | "Text here…"; "Label" | T2 | Tools › Text | Insert › Text Box | general | **Keep**: A found it in RC. |
| Inset of the zoomed region | Plot › Annotate | "Inset of the zoomed region" | none | New Layer › Inset | — | power user | **Hide by default** |
| Label peaks with the Label tool | Plot › Annotate (only picks the tool); TB Label | "Label peaks with the Label tool"; "Label" | none | Annotation tool | Data Labels | spectroscopy | **Merge**: a menu entry that only presses a toolbar button. |
| Find and mark peaks | Plot › Annotate; RC; Analysis › Find peaks…; Overview "Find and label the peaks" | "Find and mark peaks…"; "Find peaks…"; "Find and label the peaks" | none (T8 used the Peak fit's finder) | Peak Analyzer › Find Peaks | — | spectroscopy | **Move**: keep Analysis › Find peaks… and the Overview. Drop it from the general right-click and Plot › Annotate: it was offered on a distance–time chart (T1). |
| The Format dialog's Labels and lines page | Plot › Annotate; RC; Peaks window "Labels and legend…" | "Lines, labels and legend…"; "Labels and legend…" | none | Object Manager | Selection Pane | general | **Merge**: one page, two names, three routes. |
| Remove every annotation | Plot › Annotate | "Remove every annotation" | none | (select all, Delete) | Delete | general | **Keep**: confirmed by a toast with Undo. |
| Fitted peak labels (what each shows, place, mark, errors, units, stacked, turned, More options…) | Plot › Fitted peak labels; Peak-label RC; Fit window chips (Number…Area %, More…) | "Fitted peak labels"; "More options…"; "More…" | none | Peak Analyzer label options | Data labels | spectroscopy | **Move**: out of the general Plot menu, to the label's right-click and the Fit window, where it already is. |
| Layout and colours | Plot ›; Format dialog page | "Layout and colours…" | none | Plot Details › Group | Chart Styles › Colors | general | **Keep** |

## D. Data menu, cleaning and masks

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Worksheet | Data ›; TK; Window list; XP "Worksheet" | "Worksheet" | T1, T4, T5, T6 | (the workbook window) | (the sheet) | general | **Keep** |
| Lock the original data | Data ›; WS lock button | "Lock the raw data" | none | — | Review › Protect Sheet | power user | **Rename**: "Lock the original data". |
| Fill (series, growth, evenly between, row numbers, repeat a list, random, continue the trend) | Data › Fill; Cell RC › Fill; Col › Fill column with | "Fill"; "Fill column with" | none | Column › Fill Column With | Home › Fill › Series | general | **Keep**: three routes, one family of names. |
| Fill down, fill right | Cell RC › Fill; Ctrl+D, Ctrl+R; the fill handle | "Down"; "Right" | none | (in Origin Ctrl+D adds a column) | Ctrl+D, Ctrl+R | general | **Keep**: Excel's keys. |
| Crop | Data › Clean; H+ › Clean | "Crop…" | none | Data Selector; Extract | delete rows | general | **Keep** |
| Crop to the visible range | Data › Clean | "Crop to the visible range" | none | Data Selector › range | — | general | **Merge**: a preset of Crop. |
| Leave out an X range | Data › Clean; H+ | "Remove a region…" | none | Mask a range | delete rows | general | **Rename**: "Leave out an X range…". "Remove" sounds as if the data is deleted, and it is not. |
| Remove cosmic-ray spikes | Data › Clean; H+ | "Remove cosmic-ray spikes…" | T8 | (no built-in tool) | — | spectroscopy | **Move**: into the Spectroscopy toolkit. Cosmic rays belong to Raman and CCDs, not to Data › Clean. |
| Sort by X (a processing step) | Data › Clean; H+ | "Sort by X" | none | Sort Worksheet | Data › Sort | general | **Rename**: "Sort by X (as a step)". The worksheet's "Sort the sheet by…" sorts the view only, and the two read as one. |
| Average duplicate X | Data › Clean; H+ | "Average duplicate X" | none | Reduce Duplicate X Data | (a pivot) | general | **Keep** |
| Resample to even spacing | Data › Clean; H+ | "Resample to even spacing…" | none | Interpolate/Extrapolate | — | general | **Keep** |
| Mask points | Data › Masks; TB Mask; Cell RC "Mask this point in …"; key M | "Mask points on the graph"; "Mask"; "Mask this point in Absorbance" | none | Mask tool | (filter rows) | general | **Keep**: Origin's word. Say "leave out of the fit" in its tooltip, for A. |
| Restore every masked point | Data › Masks | "Restore all masked points" | none | Unmask all | — | general | **Keep** |
| New column from the processed data | Data › Spectra; H-box "From this one's processed data"; History inspector "From this processed data" | three names | none | (results go to new columns) | Paste Values | general | **Rename**: "New column from the processed data", in all three places. |
| Copy with the same processing | Data › Spectra; H-box; inspector | "Copy with the same steps"; "A copy with the same steps" | none | Duplicate with operations | — | power user | **Rename**: "…the same processing". |
| Apply this processing to every column | Data › Spectra; H-box | "Give every spectrum these steps" | none | Batch Processing | — | power user | **Rename** |
| Rename the column | Data › Spectra; H-box Rename…; its Long Name cell | "Rename the spectrum…"; "Rename…"; (type in Long Name) | T4 | Column Properties › Long Name | (type the header) | general | **Merge**: the Long Name cell is the name. Call the menu items "Rename the column…". |
| What the graph shows: original, processed, both | Data › Show on the graph; TB Raw/Final/Compare; the graph window's stage chip | "Raw data", "Final data", "Final, with the raw data behind"; "Raw", "Final", "Compare" | T9 | — | — | general (processing) | **Rename**: "Original / Processed / Both". **Move**: to the graph window, since it is a view of one graph. In T9 it was not kept with a figure's panel, and the export showed something else. |
| Delete a column | Col › Delete column; H-box "Delete this spectrum"; XP file "Delete it and its columns…" | three names | none | Delete Column | Delete | general | **Keep** |

## E. Math

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Scale and offset Y, X | Math › Arithmetic; H+ | "Scale and offset Y…"; "…X…" | none | Set Column Values; Simple Column Math | a formula | general | **Keep** |
| Normalize | Math › Arithmetic; H+ | "Normalize…" | none | Mathematics › Normalize | a formula | general | **Keep** |
| Subtract or divide by another column | Math › Arithmetic; H+ | "Subtract or divide by another spectrum…" | none | Simple Curve Math | a formula | general | **Rename**: "…another column". |
| Average with other columns | Math › Arithmetic; H+ | "Average with other spectra…" | none | Average Multiple Curves | AVERAGE | general | **Rename** |
| Derivative | Math › Calculus ("Derivative…", "Derivative, as a new spectrum…"); H+ ("Derivative…") | two entries | none | Mathematics › Differentiate | — | general | **Merge**: one tool, with "as a new column" as its choice. |
| Cumulative integral | Math › Calculus; H+ | "Cumulative integral…" | none | Mathematics › Integrate | — | general | **Keep** |
| Logarithm | Math › Transforms; H+ | "Logarithm…" | none (T5 used a formula) | Set Column Values | LOG10 | general | **Keep** |
| Transmittance to absorbance | Math › Transforms; Analysis › Spectroscopy; H+ › Transforms | "Transmittance to absorbance…" | none | Set Column Values | — | spectroscopy | **Merge**: listed twice in the menu bar. Keep it in the Spectroscopy toolkit only. |
| Kubelka–Munk | Math › Transforms; Analysis › Spectroscopy; H+ | "Kubelka–Munk…" | none | — | — | spectroscopy | **Merge**: as above. |
| Smooth | Math › Smooth and filter; H+ | "Smooth…" | none | Signal Processing › Smooth | (moving-average trendline) | general | **Keep** |
| FFT filter | Math › Smooth and filter; H+ | "FFT filter…" | none | Signal Processing › FFT Filters | — | power user | **Hide by default** |
| Python on this column | Math › Python; GB Python button; H+ › Python…; Python window | "Python on this spectrum…"; "Python"; "Python…" | none | Connectivity › Python | Python in Excel | power user | **Hide by default** |
| A new column with Python | Math › Python; H-box "With Python code…"; inspector "With Python code" | three names | none | Python | — | power user | **Hide by default** |
| Label the peaks with Python | Math › Python; Peaks window "With Python…" | "Label the peaks with Python…"; "With Python…" | none | — | — | power user | **Merge**: keep it in the Peaks window, beside what it labels. |
| Python window | Math › Python; Window › Panels | "Python window"; "Python" | none | Code Builder | — | power user | **Hide by default** |

## F. Analysis

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Overview of the data | Analysis ›; Statistics ›; opens itself after a drop or an import that plots one column; History raw box | "Overview…"; "Overview of the spectrum" | T6 (read and passed over: "These aren't spectra") | — | — | spectroscopy | **Merge**: one entry. Re-default it (see Defaults). |
| Peaks window | Analysis › Find peaks…; Plot › Annotate; RC; Overview | (see Find and mark peaks) | none | Peak Analyzer | — | spectroscopy | **Keep**: in Analysis. |
| Name the peaks from known lines | Analysis ›; the Peaks window's section | "Name the peaks from known lines…"; "Name them from known lines" | none | — | — | spectroscopy (gamma) | **Move**: into the Spectroscopy toolkit. In the Peaks window, behind "optional" (already). |
| Integrate | Analysis ›; Statistics ›; RC; Peaks "Integrate them"; Overview "Integrate them" | "Integrate bands…"; "Integrate them" | none | Peak Analyzer › Integrate; Integrate gadget | — | spectroscopy (bands), general (areas) | **Merge**: three menus. Keep Analysis ›, named for the general path "Areas under the curve…". |
| Curve fit | Analysis › Fit; GB; the Fit window's toggle | "Curve fit" | T2, T7, T13 | Analysis › Fitting › Nonlinear Curve Fit | Add Trendline; LINEST | general | **Keep**: re-default its model (see Defaults). |
| Peak fit | Analysis › Fit; the Fit window's toggle; Peaks "Fit them…"; Overview "Fit…"; History final box "Fit…" | "Peak fit"; "Fit them…"; "Fit…" | T8 | Peak Analyzer; Multiple Peak Fit | — | spectroscopy | **Keep** |
| New fit function | Analysis › Fit | "New fit function…" | T7 | Fitting Function Builder | — | power user | **Keep**: T7's best moment. |
| Run the fit | Analysis › Fit; the Fit window's button; Ctrl+Enter | "Run the fit"; "Fit"; "Fit 4 peaks" | T2, T3, T7, T8, T11, T13 | the Fit button | — | general | **Keep** |
| Fit every column (batch and global fits) | Analysis › Fit; Batch window | "Fit every spectrum…" | none | NLFit with multiple data; Batch Peak Analysis | — | power user | **Hide by default**: until there are several columns. Rename "Fit every column…". |
| Batch results | Analysis › Fit; Window › Panels › Batch | "Batch results"; "Batch" | none | batch summary sheet | — | power user | **Rename**: one name. |
| Remove the fit | Analysis › Fit; Fit window | "Remove the fit"; "Remove fit" | none | delete the report | Delete trendline | general | **Keep** |
| Results window | Analysis ›; Window list; Window › Panels; Fit window "Results" | "Results" | T2, T3, T7, T8 | report sheet | (LINEST output) | general | **Keep** |
| Subtract background | Analysis ›; H+ | "Subtract background…" | T8, T11 | Peak Analyzer › Subtract Baseline | — | spectroscopy (also chromatography) | **Keep** |
| Spectroscopy toolkit (energy calibration, wavelength to Raman shift, convert X units, calibrate X on reference peaks, Bose–Einstein) | Analysis › Spectroscopy; H+ › Spectroscopy | the five names | none | — (Set Column Values) | — | spectroscopy | **Keep**: this is where spectroscopy belongs. "Convert X units" is general and could also sit under Math. |

## G. Statistics

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Statistics window: descriptive statistics | Statistics › Descriptive statistics; Window › Panels | "Descriptive statistics"; "Statistics" | T6 | Descriptive Statistics › Statistics on Columns | Data Analysis › Descriptive Statistics | general | **Keep**. Its spectroscopy columns are in Defaults. |
| Integrate the visible range | Statistics › (opens the same window) | "Integrate the visible range" | none | Integrate gadget | — | general | **Merge**: one of four entries that open the one window. |
| Noise and signal to noise | Statistics › (the same window) | "Noise and signal to noise" | none | — | — | spectroscopy | **Merge**: as above. |
| Correlation between columns | Statistics › (the same window) | "Correlation between spectra" | none | Correlation Coefficient | CORREL | general | **Merge**, and **rename** "…between columns". |

## H. Window

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Windows in use (the list) | Window ›; TK buttons | each window's name | T6, T7, T11, T13 (taskbar buttons) | Window menu | View › Switch Windows | general | **Keep** |
| Tool windows | Window › Panels | "Panels" | none | View menu | — | general | **Rename**: "panel" also means a figure's panel, the stacked panels and the residual panel. Call these "Tool windows". |
| Project Explorer | Window ›; TB first button; XP header ×; Alt+1 | "Project Explorer" | none | View › Project Explorer (Alt+1) | (Navigation pane) | general | **Keep** |
| Tile | Window › Tile; TK button; Window › Open a graph › Tile the graphs; Plot › Open a graph; G⋯; TK Graphs | "Tile"; "Tile the open windows"; "Tile the graphs" | none | Window › Tile | View › Arrange All | general | **Merge**: "Tile the graphs" runs the same tiling as Tile. |
| Cascade | Window ›; TK button | "Cascade"; "Cascade the open windows" | none | Window › Cascade | Arrange › Cascade | general | **Keep** |
| Minimise the others | Window › | "Minimise the others" | none | — | — | general | **Keep** |
| Close the tool windows | Window › | "Close the panels" | none | — | — | general | **Rename**: with Panels. |
| Restore the default arrangement | Window › | "Restore the default arrangement" | none | Reset layout | — | general | **Keep** |
| New graph (with the active column, with every column, one each, a figure with a panel each, a figure of panels…, a trend) | Window › New graph; G⋯ › New graph | "With Absorbance"; "With every spectrum"; "One for each spectrum"; "A figure, a panel for each spectrum"; "A figure of panels…"; "A trend of the series" | T9 | File › New › Graph | Insert › Chart | general (figure, trend: power user) | **Move**: making a graph is plotting, so it belongs in Plot. T9 found the figure under Window by search. **Rename** the spectrum words. |
| Combine graphs | Window ›; Window › Open a graph; Plot › Open a graph; TK Graphs; G⋯ › Combine; Grip | "Combine graphs…" | none | Graph › Merge Graph Windows | — | power user | **Merge**: five routes. Keep Window › and the grip. |
| Link the X zoom | Window ›; Window › Open a graph; Plot › Open a graph; TK Graphs; G⋯ | "Link the X zoom"; "Link the X zoom of the graphs" | none | Layer linking | — | power user | **Merge**: five routes, two names. |
| Theme (Light, Dark, Match the system) | Window › Theme | "Theme" | none | — | File › Account › Office Theme | general | **Keep** |
| Interface style (Bench, Graphite) | Window › Style | "Bench: blue for what you can change"; "Graphite: black and white" | none | — | — | general | **Remove candidate**: a second look for the same layout, which doubles every token block (DESIGN.md's rules, the contrast test). Theme already covers light and dark, and nothing in a scientific task depends on it. |

## I. Help

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Help window | Help › Kurve help; "?" on every title bar; F1 | "Kurve help"; "?"; tooltip "Help on the X window" | T6 | Help › Origin (F1) | F1 | general | **Keep**: help on the window in front is right. Its heading overlapped the Back bar in T6. |
| Search help | Help ›; the Help window's search | "Search help…" | none | Help search | Tell me | general | **Keep** |
| Getting started | Help › | "Getting started" | none | Learning Center | — | general | **Keep** |
| Keyboard shortcuts | Help ›; key ? | "Keyboard shortcuts" | none | (shortcut list) | — | general | **Keep** |
| About processing | Help › | "Processing steps" | none | — | — | general | **Rename**: "About processing". |
| How Kurve computes | Help › | "How Kurve computes" | none | Help › Algorithms | — | power user | **Keep** |
| About Kurve | Help › | "About Kurve" | none | Help › About | — | general | **Keep** |

## J. Toolbar

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Project Explorer switch | TB (also Window ›, Alt+1) | (icon), "Project Explorer" | none | Standard toolbar | — | general | **Keep** |
| Import, Export | TB (also File ›) | "Import"; "Export" | T6 (Import) | Standard toolbar | Quick Access | general | **Keep** |
| Undo, Redo | TB (also Edit ›, keys) | (icons) | T6 | Standard toolbar | Quick Access | general | **Keep** |
| Original, Processed, Both | TB (also Data › Show on the graph) | "Raw"; "Final"; "Compare" | T9 | — | — | general | **Rename** and **Move** (see D). Active before any data exists (the sealed appendix). |
| Zoom tool | TB; Esc returns to it | "Zoom" | (the default tool) | Zoom tool | — | general | **Keep** |
| Pan tool | TB; middle-drag | "Pan" | none | Scroll tool | — | general | **Keep** |
| Mask tool | TB (see D) | "Mask" | none | Mask tool | — | general | **Keep** |
| Add peak tool | TB; key P | "Add peak" | none | Peak Analyzer › add | — | spectroscopy | **Move**: into the Fit window's Peak fit and the Peaks window. It does nothing for data that has no peaks. |
| Label tool | TB | "Label" | none | Annotation tool | Data Labels | general | **Keep** |
| Arrow tool | TB | "Arrow" | none | Arrow tool | — | general | **Keep** |
| Shape tool | TB (menu: Box, Ellipse) | "Shape" | none | Rectangle, Circle tools | Shapes | general | **Keep** |
| Comment tool | TB | "Comment" | none | (Notes window) | Review › New Comment | general (sharing) | **Hide by default**: a comment pinned to the graph matters in a shared project. Alone it is a note, which a text or the History's box discussion does. |
| Show all the data | TB | (icon) | none | Rescale | — | general | **Keep** |
| Plot type list | TB | tooltip "Plot type" | T8 | Plot Details | Change Chart Type | general | **Merge**: a third route to Plot type. It changes the analysed curve only and lacks Columns. |
| Several curves list | TB | tooltip "Layout of several spectra" | none | — | — | general | **Merge**: a second route to Several spectra. |
| Reverse X | TB | "Reverse X" | T10 | — | — | general | **Keep**. Its tooltip is in Language. |
| Log Y | TB | "Log Y" | none | — | — | general | **Merge**: see Logarithmic Y. |
| Grid | TB | "Grid" | none | — | — | general | **Keep** |
| Residuals | TB | "Residuals" | T2 | — | — | general | **Move**: see Residual panel. |

## K. Graph and figure windows

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Graph window | desk; TK; Window list; XP | "Graph 1" | T1–T10 | Graph window | Chart | general | **Keep** |
| The graph window's own menu bar (Data, Math, Analysis, Statistics, Plot) | GB, in the graph in front | the menu bar's five names | T2, T5 (T5: a misaimed click) | — (Origin's main menu changes with the window) | Chart Design tab | general | **Remove candidate**: five menus that repeat, item for item, five of the menu bar's nine, a short way below them (the sealed appendix). They take a row from the graph, and they are what the T5 click hit by mistake. Its Python button and stage chip would need a place of their own (the graph's title bar). |
| Python button | GB | "Python" | none | — | — | power user | **Hide by default**: with the Python items. |
| Stage chip (what the graph shows when not the final data) | GB | "Raw data"; "After step 2: …" | T9 | — | — | general | **Keep**: it says what is shown. Rename with Original and Processed. |
| Combining by dragging the grip | Grip (several graphs only); its click menu | tooltip "Combine this graph with another"; menu "Combine Graph 2" | none | Merge Graph | — | power user | **Keep**: shown only when it can apply. |
| Graph ⋯ menu | the title bar's ⋯ | "Options for this graph" | T9 | (right-click the title) | (right-click the chart) | general | **Keep** |
| Rename graph | G⋯; XP (F2) | "Rename…" | none | Rename | (chart name) | general | **Keep** |
| Curves on a graph | G⋯; F⋯ panel; XP figure panel | "Spectra on it" | none | Layer Contents | Select Data | general | **Rename**: "Curves on it". |
| Duplicate graph | G⋯; XP | "Duplicate" | T9 | Duplicate | Copy | general | **Keep** |
| Merge graphs | G⋯ › Combine; Grip menu | "Merge it into"; "Merge every other graph into this one" | none | Merge Graph | — | power user | **Hide by default** |
| Put in a figure | G⋯ | "Put in a figure"; "A new figure, with other graphs…" | none | Merge Graph | — | power user | **Keep** |
| Close a graph | G⋯; the ×; XP | "Close this graph"; "Close (hide it)" | none | Hide window | — | general | **Rename**: one name. |
| Delete a graph | G⋯; XP; Delete key in XP | "Delete this graph"; "Delete the graph" | none | Delete window | Delete chart | general | **Rename**: one name. |
| Figure window | desk; TK; XP | "Figure 1" | T9, T10 | a graph with layers | — | general | **Keep** |
| Figure ⋯ menu | the figure's ⋯ | "Options for this figure" | none | Layer Management | — | general | **Keep** |
| Panels of a figure (dialog) | F⋯ › Panels… | "Panels…" | none | Layer Management | — | general | **Keep** |
| Add a panel | F⋯ | "Add a panel" | none | Add Layer | — | general | **Keep** |
| Move a panel | F⋯ panel ›; a panel's menu | "Move" › Up, Down, Left, Right | none | Arrange layers | — | general | **Keep** |
| Span a panel | F⋯ panel ›; a panel's menu | "Span" › wider, narrower, taller, shorter, across the row | none | layer size | — | power user | **Hide by default** |
| Take a panel out, delete it | F⋯ panel › | "Take it out of the figure"; "Delete the panel" | none | — | — | general | **Keep** |
| Rename, duplicate, export, close, delete a figure | F⋯ | "Rename the figure…"; "Duplicate the figure"; "Export the figure"; "Close the figure"; "Delete the figure"; "Delete the figure and its panels" | T9 | — | — | general | **Keep** |

## L. The graph's right-click menu

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| The menu itself | RC; Shift+F10; the menu key | (heading: the curve's name) | T1, T2 | right-click | right-click | general | **Move**: 98 items on empty plot and 116 on a curve, taller than a 768 px screen. Export is two scrolls down (T1). What repeats the Plot menu should go to Plot (Graph ›, Several spectra, Font, Legend), leaving what is about the thing clicked. |
| Curve colour (swatches) | RC-curve | (swatches) | T10 | Plot Details | Format Data Series | general | **Keep**: B found it at once. |
| Line, symbols and colour | RC-curve; Legend entry RC "Its line, symbols and colour…"; Plot › Format › Lines and symbols…; dbl on the line | "Line, symbols and colour…"; "Its line, symbols and colour…"; "Lines and symbols…" | T10 | Plot Details › Line | Format Data Series | general | **Rename**: one name. |
| Make it the active curve | RC-curve (a curve not analysed) | "Analyse this spectrum" | none | (active dataset) | — | general | **Rename** (see Language). |
| Connect (straight lines, spline, B-spline) | RC-curve | "Connect" | none | Plot Details › Line › Connect | Smoothed line | general | **Keep** |
| Fill between it and another curve | RC-curve | "Fill between it and" | none | Fill area between | — | power user | **Hide by default** |
| Error bars (bars, a band, none) | RC-curve, when it has error bars | "Error bars" | T3 | Plot Details › Error Bar | Chart Elements › Error Bars | general | **Keep**. It names no column: T3 could not tell where they came from. |
| Open in a new graph | RC-curve | "Open in a new graph" | none | Create a copy as new graph | — | general | **Keep** |
| Histogram of its values, histogram bins | RC-curve | "Histogram of its values"; "Histogram bins…" | none | Histogram | — | general | **Merge**: see Histogram. |
| Fit curve's line and bands | RC-fit | "Line and colour…"; "95% confidence band"; "95% prediction band" | T2 (looked here for the equation) | NLFit bands | Trendline options | general | **Keep** |
| Add here (line at x, line at y, text, arrow, box, ellipse, shade) | RC | "Vertical line at x = 1554"… | T2 | — | — | general | **Keep**: placed where you clicked. |
| Graph submenu (Axes…, Frame and grid…, Text and fonts…, Frame, Ticks on every axis, Add a title, Show all, Reverse X, Logarithmic Y, Grid) | RC › Graph | "Graph" | none | Layer properties | Chart Elements | general | **Move**: it repeats the Plot menu. In RC, keep only "Add a title". |
| Frame (Box, Axes only, None) | RC › Graph; Format dialog | "Frame" | none | Layer › Border | Chart Area border | general | **Keep** |
| Ticks on every axis | RC › Graph | "Ticks on every axis" | none | Axes › Ticks | Tick marks | general | **Keep** |
| Add a title (to the graph) | RC › Graph | "Add a title" (also the legend's, in the same menu) | none | Insert › Text | Chart Title | general | **Rename**: two "Add a title" items in one menu, the graph's and the legend's. |
| Find and mark peaks, Integrate bands | RC | "Find and mark peaks…"; "Integrate bands…" | T1 (offered on a distance–time chart) | — | — | spectroscopy | **Move**: off the general right-click (see C and F). |
| Export the figure | RC | "Export the figure" | T1 | (Export Graphs) | Save as Picture | general | **Move**: to the top of RC. It is A's first route, at the very bottom now. |

## M. Axes, titles and the legend

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Axis menu (Scale, Where it is, Ticks, Numbers, Title, Break the axis…, A second X axis…, Format the X axis…) | Axis RC; dbl on the numbers (the Format page) | heading "X axis" and the item names | none | right-click axis › Properties | Format Axis | general | **Keep** |
| Where an axis is (an edge, at zero, at a value) | Axis RC; Format dialog | "Where it is"; "At y = 0"; "At a value of y…" | none | Axes › Line and Ticks › Axis position | Format Axis › Vertical axis crosses | general | **Keep** |
| Offset outward (4, 8, 12, 20 px) | Axis RC; Format dialog | "Offset outward" | none | Axes › Offset | — | power user | **Hide by default**: it is in the Format dialog. |
| Ticks across from the axis, edge by edge | Axis RC › Ticks › Across from the axis; Format dialog frame page | "Across from the axis"; "Numbers there too"; "Edge by edge…" | none | Axes › Top/Right | — | power user | **Hide by default** |
| Tick numbers (show, turned, font and size) | Axis RC › Numbers | "Show them"; "Upright"; "Turned 45°"; "Turned 90°"; "Font and size…" | T10 | Axes › Tick Labels | Format Axis › Labels | general | **Keep**. In T10 the size changed one panel of a figure only. |
| Drag an axis by its numbers | drag | — | none | drag the axis | — | power user | **Keep** |
| Title menu (Edit text, Size, Bold, Italic, Colour, Along the axis, Show it, Back to the automatic title, Format…) | Title RC; Axis RC › Title | the text menu's names | T1 | right-click › Properties | Format Axis Title | general | **Keep**: one menu order for all text (DESIGN.md). |
| Type a title in place | dbl; Enter or F2 when selected | (the box) | T1 | dbl on the text | click the title | general | **Keep**: T1's best moment. |
| Graph title menu (… Align, Remove the title) | Title RC on the graph title | "Graph title" | none | — | Chart Title | general | **Keep** |
| Legend menu (Size, Bold, Italic, Colour, Place, Columns, Text in each spectrum's colour, Frame, Add a title, Format…) | Legend RC; RC › Legend | "Legend" | T4 | right-click › Properties | Format Legend | general | **Keep** |
| Legend entry menu (Edit text, Hide this entry, Its line, symbols and colour…, Legend ›, Format…) | Legend RC on an entry | "Legend entry: <name>" | T4 | — | — | general | **Keep** |
| Select the legend and type over an entry | click; Enter or F2; ↑ and ↓ | — | none | dbl on the legend | click the entry | general | **Keep** |

## N. Annotations and labels

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Text menu (Edit text, Size, Bold, Italic, Colour, Turn, Box, Align, Centre it across the plot, Pinned to the plot, Format…, Delete) | Label RC | heading "Text: <text>" | T2 | Text properties | Format Shape | general | **Keep** |
| Line menu (… Text shows, Text at, Line style, Width, Show the unit) | Label RC on a line | "Vertical line" | none | Line properties | Format Shape | general | **Keep** |
| Arrow menu (Head, Line style, Width, Swap its ends, Pinned) | Label RC on an arrow | "Arrow" | none | Arrow properties | Format Shape | general | **Keep** |
| Box and ellipse menu (Fill, Outline, Behind the data, Pinned, Make it an ellipse) | Label RC | "Box" | none | Rectangle properties | Format Shape | general | **Keep** |
| Peak label menu (Mark it with, Turn, Box, Every peak of the set, The peak table…, Show the unit, Remove this peak) | Label RC on a peak set's label | "Peak label" | none | Annotation properties | Data Labels | spectroscopy | **Keep** |
| Fitted peak label menu (Name this peak…, Each label shows, Place, Mark each peak with, errors, units, stacked, turned, More options…) | Peak-label RC | "Peak 1" | none | Peak Analyzer labels | — | spectroscopy | **Keep**: the place for these settings (see C). |
| Drag text, labels, the legend and titles; snapping guides | drag; Alt stops the snapping | — | T2 | drag | drag | general | **Keep** |
| Delete the selected annotation | Delete; Label RC › Delete | "Delete" | none | Delete | Delete | general | **Keep** |

## O. Worksheet

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Original and processed sheets | WS tabs | "Raw"; "Final" | none | (results in the book) | sheet tabs | general | **Rename**: "Original"; "Processed". |
| Cell address and formula bar | WS | (address); the value box | none (T5 typed a formula into a cell) | (Set Values dialog) | Name Box; formula bar | general | **Keep**: but T5's `=LOG10(B1)` typed into a cell was refused with no pointer to the F(x)= row. |
| Alignment buttons | WS (wide windows only); Col › Align | "Align" › Left, Centre, Right, Automatic | none | Format Cells | Home › Alignment | general | **Keep** |
| Find in the sheet | WS button; Cell RC "Find…"; Ctrl+F; F3 | "Find in the sheet"; "Find…" | none | Find in Sheet | Ctrl+F | general | **Keep** |
| Plot button | WS | "Plot" | T5, T6 | Plot menu | Insert › Chart | general | **Keep** |
| Lock button | WS | (icon), "Lock the raw data" | none | — | Protect Sheet | power user | **Keep**, renamed with Lock the original data. |
| Add a column | WS + Column | "Add a Y column" | T5 (a bare icon at this size) | Add New Columns | Insert column | general | **Keep**. It needs its word at 1366 px. |
| Column menu | the header's menu button; right-click the header | "Column B options" | T6 | column right-click | column right-click | general | **Keep** |
| Column roles: X, Y, error bars (six kinds), other data | Col | "Use as X"; "Use as Y"; "Use as error bars"; "Use as data (not a spectrum)" | T6 | Set As › X, Y, Error, Label, Disregard | — | general | **Rename**: "Use as other data (not plotted)". T6: "Use as Y" on the first column inserted an empty X column, unasked. |
| Make it the active column | Col; H-box; XP column | "Being analysed"; "Analyse this spectrum"; "Analyse it" | none | (the active dataset) | — | general | **Rename**: one plain name in all three places. |
| Its history and processing | Col; XP column | "Its history and processing…" | none | — | — | general | **Keep** |
| Show on the graph | Col (check); H-box "Hide from the graph" | "Show on the graph"; "Hide from the graph" | none | Layer Contents | Select Data | general | **Keep** |
| Column formula | Col › Set column values (formula)…; the F(x)= row | "Set column values (formula)…"; "F(x)=" | T5 | Set Column Values; F(x)= | a formula | general | **Keep**: T5 got there by the hints. |
| Sort the view | Col › Sort the sheet by this column; Cell RC › Sort the sheet by column B | "Ascending"; "Descending"; "As recorded (unsort)" | none | Sort Worksheet | Data › Sort | general | **Rename**: "Sort the view by this column", since it never reorders the data. "As recorded" becomes "Original order". |
| Move columns | Col › Move; drag the letters | "Left"; "Right"; "To the start"; "To the end" | none | Move Column | drag | general | **Keep** |
| Cell menu (Copy, Paste, Clear, Mask this point, Select the whole column, Insert a row above, Delete row, Sort, Find, Plot, Fill, Column options…) | Cell RC | heading "A1" | none | cell right-click | cell right-click | general | **Keep** |
| Label rows (Long Name, Units, Comments, F(x)=, Sparklines) | WS | the five names | T4, T5 | the same rows | the header row | general | **Keep**. The worksheet shows them before the data, and one data row at 1366 px (see Defaults). |
| Fill handle (drag, double-click, Ctrl swaps) | WS | — | none | — | fill handle | general | **Keep** |
| Column widths (drag, double-click to fit) | WS | — | none | drag | drag, double-click | general | **Keep** |
| Count, Sum, Average, Min, Max of the selection | WS foot | the five names | none | — | status bar | general | **Keep** |
| The fingerprint link | WS foot | "sha256 …" | T1 | — | — | power user | **Hide by default**: provenance belongs in the History's Original data box. |
| Correct a value (locked data) | typing over a value while locked | "Raw data is locked" | none | — | — | power user | **Keep** |
| Paste as new columns | pasting over values while locked | — | none | — | — | power user | **Keep** |

## P. History

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| History window | Window list; TK; Window › Panels; Col "Its history and processing…" | "History" | T1 (seen), T7, T11, T12 | Project Explorer and the operation's lock icon | — | general | **Keep**: T11 and T12 both worked because of it. It opens on a first visit (see Defaults). |
| Flow chart and Log tabs | History | "Flow chart"; "Log" | T12 | (Results Log) | — | general | **Keep** |
| Show or hide the settings pane | History bar | "Details" | none | — | — | general | **Keep** |
| Add a processing step | History bar "Step"; the "+" on a line; H+ | "Step"; "Insert a step here"; "Insert a step after step 1 of …" | none | — | — | general | **Rename**: "Add processing…". |
| Boxes: original data, each column, steps, processed data, peaks, bands, fit, graphs | History | "Recorded data"; "Absorbance Raw · 201 points"; "1 Smooth …"; "Final 201 points"; "Peaks: 6"; "Bands: 1"; "Fit: …" | T11, T12 | — | — | general | **Rename**: see Language ("Recorded data", "Raw", "Final", the hash). |
| Step menu (Switch off, Move earlier, Move later, Duplicate, Apply to every spectrum, Comment on this step…, Delete step) | H-step; Alt+↑, Alt+↓, Delete, C | the item names | none | — | — | general | **Keep** |
| Column box menu (Comment on this box…, Analyse this spectrum, Hide from the graph, Rename…, New spectrum, Give every spectrum these steps, Delete this spectrum) | H-box; the spectrum's ⋯ | the item names | none | — | — | general | **Keep**. Its names are in Language. |
| Settings pane: a step's settings, About this step | the selected box | the step's form | T11 | (Recalculate › Change Parameters) | — | general | **Keep**. T11's slider jumped mid-drag and could not be typed into; that is a fault, not a placement. |
| Settings pane: processed data (Fit…, New spectrum, Export data, Export the steps) | the final box | the four names | none | — | — | general | **Merge**: the export buttons repeat File › Export (see A). |
| A box's discussion | the settings pane's foot; badges on boxes | "Comment on the final data…"; "Comment" | none | — | Review › Comments | general (sharing) | **Keep** |
| Earlier fits (the list, thumbnails) | the Fit box's pane | "Fits" | T7 (a click did nothing) | the report sheets | — | general | **Keep**. Gap: the earlier fit's report cannot be opened (T7). |
| Run Python again | History bar (only when a Python step is out of date) | "Run Python again (n)" | none | — | — | power user | **Keep** |

## Q. Tool windows

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Fit window: Curve fit, Peak fit | Fit window toggle; Analysis › Fit | "Curve fit"; "Peak fit" | T2, T7, T8 | NLFit; Peak Analyzer | — | general | **Keep** |
| Fit range | Fit window | "Range": "Fit from", "Fit up to", "All" | none | NLFit › Data Selection | — | general | **Keep**. It defaults to the zoom (see Defaults). |
| Curve fit: model, parameters, weighting, Fit, Done | Fit window | the model list; the parameter table; "Weight by the Y error column (1/σ²)" | T2, T3, T7 | NLFit › Function Selection | Trendline Options | general | **Keep**. Re-default the model; the weighting is in Language. |
| Include the X errors | Fit window, when the curve has X errors | "Include the X errors" | none | Fit with X errors (ODR) | — | power user | **Keep**: shown only when it can apply. |
| Peak fit, 1 Find peaks (the finder's settings, preview, turned down) | Fit window | "Find peaks"; the nine settings | T8 | Peak Analyzer › Find Peaks | — | spectroscopy | **Hide by default**: the nine settings past the threshold (the sealed appendix). |
| Use the found peaks | Fit window, part 1 | "Use these 9 peaks" | T8 (below the fold) | Peak Analyzer › Next | — | spectroscopy | **Move**: above the fold. The Fit button stays disabled until it is pressed. |
| Peak fit, 2 Peaks and baseline (baseline, new peaks' shape, One width, Clear, a card per peak: name, shape, centre, area, FWHM, Fix, Tie) | Fit window | the names shown | T8 | Peak Analyzer › Fit Peaks | — | spectroscopy | **Keep**. Nine shape lists for nine peaks (T8): one "every peak's shape" control at the top would do. |
| Ties between peaks | the chain button beside a parameter | "Equal to peak 2's (1602.8)"; "Peak 2's plus a spacing…" | none | Parameters › Share, Bounds | — | power user | **Keep** |
| One width for every peak | Fit window | "One width" | none | Share | — | power user | **Keep** |
| Fitted label chips | Fit window | "Number" … "Area %"; "More…" | none | — | — | spectroscopy | **Keep** |
| Fit, Reset to estimates, Remove fit, Done | Fit window | "Fit 4 peaks"; "Reset to estimates"; "Remove fit"; "Done" | T8 | NLFit buttons | — | general | **Keep** |
| Peaks window: where to look (Whole spectrum, What's in view, Drag on the graph, regions) | Peaks window | "Find peaks in"; "Whole spectrum"; "What's in view"; "Drag on the graph" | none | Peak Analyzer › ROI | — | spectroscopy | **Keep** |
| Peaks window: peak finder settings (Look for, Keep a peak if, Threshold, Noise, log scale, Peaks point, Smoothing, Narrowest, Closest pair, At most, Follow the processing, Default settings, Search again) | Peaks window | the names shown | none | Peak Analyzer › Find Peaks | — | spectroscopy | **Hide by default**: everything after "Keep a peak if" and "Threshold". |
| Peaks window: the peak table (labels, remove, add by clicking, Copy, Clear) and Turned down (Add) | Peaks window | "Peaks 6"; "Turned down 1" | none | Peak Analyzer › table | — | spectroscopy | **Keep**. "Turned down" is in Language. |
| Peaks window: name them from known lines | Peaks window | "Lines"; "Within ±"; "Label with"; "Keep the labels typed by hand"; "Name the peaks"; "With Python…" | none | — | — | spectroscopy (gamma) | **Keep**: behind "optional", where it is. |
| Peaks window: on the graph (Mark each with, Label with, Decimals, Text size, Colour, Vertical labels, Unit after the position) | Peaks window | the names shown | none | Peak Analyzer › Labels | — | spectroscopy | **Keep** |
| Peaks window: Done, Fit them…, Integrate them, Labels and legend… | Peaks window foot | the four names | none | — | — | spectroscopy | **Keep** |
| Integrate window (Add by dragging, Around the peaks, the band table, Copy, Clear, Shade them on the graph, Line baselines) | Integrate window | "Integrate"; "Name of band 1"; "Divide the others by Band 1" | none | Integrate gadget; Peak Analyzer › Integrate | — | spectroscopy, general | **Rename**: "bands" for the general path (see Language). |
| Overview window (As recorded, After n steps; Suggested first steps, each with Open…; Then: Find and label the peaks, Integrate them, Fit…; Show the overview after every import) | Overview window | the names shown | none | — | — | spectroscopy | **Hide by default**: for data that is not a spectrum (see Defaults). |
| Results window (Copy table, Save report, Export data, Discuss; the parameter table, statistics, notes) | Results window | the names shown | T2, T3, T7, T8 | the report sheet | LINEST output | general | **Keep**. The weighting line is below the fold (T3). |
| Batch window (Fit every spectrum…, Copy, More, Plot … against …, Straight line, On the desk, the table) | Batch window | the names shown | none | the batch summary | — | power user | **Hide by default**: until there are several columns. |
| Trend graph windows (quantity chips L/R, + Quantity, against, Lines, ⋯: rename, copy, SVG, PNG, delete) | Window › New graph › A trend; Batch "On the desk" | the names shown | none | a graph of the summary sheet | — | power user | **Keep**, inside the hidden Batch. |
| Statistics window (Final, Raw data; All X, Visible range; Copy; the table, the integral, correlation) | Statistics › | the names shown | T6 | Statistics on Columns | Descriptive Statistics | general | **Keep**. Its columns are in Defaults. |
| Python window (column, on raw or final data, as a step, a new column or peak labels, Examples, the code, Run, Record as a step, Stop) | Math › Python | the names shown | none | Python console | Python in Excel | power user | **Hide by default** |
| Discussion window (Open, All; Comment; attach to the box; Post comment) | Window › Panels | "Discussion" | none | — | Review › Comments | general (sharing) | **Hide by default**: when the project is not shared. |
| Help window (contents, search, Back, Contents, examples) | Help › | "Help" | T6 | Help | Help | general | **Keep** |
| Tool window (a step's preview, before and after, its settings, Apply, Cancel) | any tool from the menus or H+ | "Tool" (the title bar) | T8 | an analysis dialog | — | general | **Rename**: the title bar says "Tool". Give it the tool's own name. |

## R. Project Explorer

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| The tree (folders, the worksheet, each file with its columns, graphs, figures, trend graphs) | the Explorer | — | none | Project Explorer | (Navigation pane) | general | **Keep** |
| Header: New folder, Collapse everything, Help, Hide | the Explorer's header | (icons) | none | — | — | general | **Keep** |
| Project row (New folder…, Rename the project…, Expand everything, Collapse everything, Projects) | XP root | the names shown | none | the root folder's menu | — | general | **Merge**: "Projects" is a third copy of the project menu. |
| Folder row (New folder inside…, Rename…, Move to, Delete the folder) | XP folder | the names shown | none | the folder's menu | — | general | **Keep** |
| Worksheet row (Open, Move to) | XP | "Open" | none | — | — | general | **Keep** |
| File row (Show in the worksheet, Plot its columns, Rename…, Move to, Delete it and its columns…) | XP file | the names shown | none | — | — | general | **Keep** |
| Column row (Analyse it, Plot, Show in the worksheet, Its history and processing…) | XP column | the names shown | none | — | — | general | **Rename**: "Analyse it" (see Language). |
| Graph and figure rows (Bring to the front, Close (hide it), Rename…, Duplicate, Curves on it, Move to, Delete the graph) | XP graph | the names shown | none | — | — | general | **Keep** |
| Drag rows into folders and onto graphs | drag | — | none | drag | — | general | **Keep** |
| Filter | the Explorer | — | none | — | — | general | **Keep** |

## S. Taskbar and status bar

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| The project's button | TK | the project's name | none | — | — | general | **Keep** |
| Window buttons (documents always, tool windows while in use), the Graphs group, "n more" | TK | each window's name | T13 (the focus stayed there) | window tabs | sheet tabs | general | **Keep** |
| Tile and Cascade buttons | TK | tooltips "Tile the open windows", "Cascade the open windows" | none | — | — | general | **Keep** |
| Status bar (tool hint, cursor readout, point counts, fit state, save state) | the foot of the screen | "Saved in this browser" | T2 | the status bar | the status bar | general | **Keep**. "Saved in this browser" is the only clue to where the work is kept. |

## T. Dialogs

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Import dialog (what each column becomes, delimiter, decimal mark, first line, fixes, which project, preview) | Import | "Import" | T2, T4, T7 | Import Wizard | Text Import Wizard | general | **Keep**: it guessed T2's file right. T4 took the units row for the names. |
| Import several files | choosing or dropping several files | "Import 3 spectra from 3 files" | none | Import Multiple ASCII | — | general | **Rename**: "Import 3 files". |
| Plot setup | Plot ›, etc. | "Plot" (the dialog's title) | none | Plot Setup | Insert Chart | general | **Rename**: call it "Plot setup", as the menus do. |
| Format dialog (each curve and the fit; X, second X, Y, second Y, right Y or colour scale; frame and grid; text and fonts; legend; layout and colours; labels and lines; fitted peak labels; Defaults, Use on every graph, Formats, Cancel, OK) | Plot › Format graph…, RC, dbl, every "Format…" | "Format graph" | T10 | Plot Details | Format pane | general | **Keep** |
| Export dialog | File › Export › Figure for a paper or slides…, etc. | "Export the figure" | none | Export Graphs | Save As | general | **Keep** |
| Fill dialog | Data › Fill, etc. | "Fill" | none | Fill Column With | Fill › Series | general | **Keep** |
| Add a line | Plot › Annotate › Vertical line…, Horizontal line… | "Add a line" | none | Add Straight Line | — | general | **Keep** |
| Break the axis; axis at a value | Plot › Axis options; Axis RC | "Break the X axis"; "X axis at" | none | Axis Breaks; Axis position | — | power user | **Keep** |
| A figure of panels; Panels of … | Window › New graph; F⋯ | "A figure of panels"; "Panels of Figure 1" | T9 | Merge Graph; Layer Management | — | general | **Keep**. "Share X (automatic for one column)" left T9 guessing whether it was on. |
| Combine graphs | Window ›, etc. | "Combine graphs" | none | Merge Graph Windows | — | power user | **Keep** |
| Copy from another project | File ›, etc. | "Bring in from another project" | none | Append | — | power user | **Rename**: with the menu items. |
| Fit every column (batch and global fit) | Analysis › Fit › Fit every spectrum… | "Fit 3 spectra" | none | NLFit with multiple data | — | power user | **Rename**: "Fit 3 columns". |
| New fit function | Analysis › Fit | "New fit function"; "Edit “name”" | T7 | Fitting Function Builder | — | power user | **Keep** |
| Tie two peaks (a ratio, a spacing) | the tie menu | "Peak 1's centre at a fixed spacing from peak 2's" | none | — | — | power user | **Keep** |
| Name a peak | dbl on a fitted label; Peak-label RC | "Name peak 1" | none | — | — | spectroscopy | **Keep** |
| A list of known lines | the Peaks window | "New list of lines" | none | — | — | spectroscopy | **Keep** |
| Rename dialogs (column, file, folder, format, graph, trend graph) | their menus | "Rename spectrum"; "Rename the file"… | none | Rename | Rename | general | **Rename**: "Rename spectrum" becomes "Rename the column". |
| Save or rename a format | Plot › Formats | "Save this format"; "Rename the format" | none | Save Format as Theme | Save as Template | power user | **Keep** |
| New folder | XP | "New folder" | none | New Folder | — | general | **Keep** |
| Correct a recorded value (locked) | typing while locked | "Raw data is locked" | none | — | — | power user | **Rename**: "The original data is locked". |
| Record the data as it is now? (a fingerprint mismatch) | the History's Original data box | "Record the raw data as it is now?" | none | — | — | power user | **Rename**: "Accept the data as it is now?". |
| Delete confirmations (project, file) | their menus | "Delete “name”?" | none | — | — | general | **Keep** |
| Font, colour and symbol pickers | Format dialog; text bars; rich-text fields | — | none | Font dialog; colour chooser; symbol map | Font; Colors; Symbol | general | **Keep** |

## U. Keyboard and mouse

| Feature | Every place it can be reached | Name used in each place | Phase 1 | Origin | Excel | Domain | Verdict |
|---|---|---|---|---|---|---|---|
| Undo, redo | Ctrl+Z; Ctrl+Y, Ctrl+Shift+Z | — | none | Ctrl+Z | Ctrl+Z, Ctrl+Y | general | **Keep** |
| Import a file | Ctrl+O | — | none | (Ctrl+O opens a project) | (Ctrl+O opens a workbook) | general | **Keep**: the nearest thing to Open there is. |
| Save | Ctrl+S (a toast: changes are saved as made) | — | none | Ctrl+S | Ctrl+S | general | **Keep**: it says where the work is. |
| Run the fit, run Python, post a comment | Ctrl+Enter | — | none | — | — | general | **Keep** |
| Help on the window in front; this list | F1; ? | — | none | F1 | F1 | general | **Keep** |
| Close a menu or dialog, back to Zoom | Esc | — | T2, T3, T5, T9, T13 | Esc | Esc | general | **Keep** |
| Project Explorer | Alt+1 | — | none | Alt+1 | — | general | **Keep** |
| Graph keys (← →, Home, End, + − 0, [ ], M, P, Delete, Enter or F2, ↑ ↓ in the legend, Shift+F10) | the graph, focused | — | none | (Data Reader keys) | — | power user | **Keep** |
| Superscript, subscript while typing | Ctrl+Shift+=, Ctrl+= | — | none | — | Ctrl+Shift+=, Ctrl+= | general | **Keep**: Excel's and Word's keys. |
| Alt while dragging; Ctrl while dropping a graph; Esc while holding one | — | — | none | — | — | power user | **Keep** |
| Middle-drag pans, the wheel zooms, a double-click shows all | the graph | — | none | Scroll tool; Ctrl+R | — | general | **Keep** |
| Worksheet keys (arrows with Shift and Ctrl, Enter, Tab, F2, Delete, Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+R, Ctrl+F, F3, Ctrl+Home, Ctrl+End, PgUp, PgDn) | the worksheet | — | T1, T4, T5, T13 | mostly Excel's (Ctrl+D adds a column in Origin) | the same | general | **Keep** |
| History keys (arrows, Alt+↑ and Alt+↓, Delete, C, the menu key) | the History | — | none | — | — | general | **Keep** |
| Explorer keys (arrows, Home, End, Enter, F2, Delete, the menu key) | the Explorer | — | none | — | — | general | **Keep** |

---

## 1. Duplicate and inconsistent entry points

These are reachable by more than two routes, or under different names in different places.
Routes were counted from the crawl, by the code each item runs.

| What | Routes | Names | Proposal |
|---|---:|---|---|
| Plot the selected columns, with its seven types, Histogram, Box, Violin, Add to a graph, Plot setup | 6 | "Plot the selected columns"; "Plot"; "Plot its columns" | One name, "Plot". Six routes are right for the commonest action. |
| Bring in from another project | 6 | "Bring in from another project…"; "Bring in spectra from another project…" | File › and the Explorer, as "Copy from another project…". |
| Copy the graph as a picture | 6 | "Copy the graph as a picture"; "Copy the figure as a picture"; "Copy as a picture" | Edit › and RC, one name. |
| Export the graph as SVG, PDF, EPS, PNG | 5 each | four names each ("Figure as SVG…", "As SVG…", "This graph as SVG", "As SVG") | One Export list, used everywhere. |
| Combine graphs | 5 | "Combine graphs…" | Window › and the grip. |
| Link the X zoom | 5 | "Link the X zoom"; "Link the X zoom of the graphs" | Window › and the taskbar's Graphs button. |
| Tile | 6 | "Tile"; "Tile the open windows"; "Tile the graphs" | Window › and the taskbar. Same code as "Tile the graphs". |
| Integrate | 5 | "Integrate bands…"; "Integrate them" | Analysis ›, the Peaks window, the Overview. |
| Find peaks | 4 | "Find peaks…"; "Find and mark peaks…"; "Find and label the peaks" | Analysis › and the Overview, one name. |
| Logarithmic Y | 5 | "Logarithmic Y axis"; "Logarithmic Y"; "Log Y"; "Logarithmic (log₁₀)" | One setting: the Y scale, with the toolbar button as its shortcut. |
| Reverse X | 4 | "Reverse X axis"; "Reverse X"; "Reversed (high to low)" | Fine; one name. |
| Line, symbols and colour of a curve | 4 | "Line, symbols and colour…"; "Its line, symbols and colour…"; "Lines and symbols…"; (double-click) | One name. |
| Rename the project | 4 | "Rename project"; "Rename this project"; "Rename the project…"; (click the name) | One name. |
| Import data | 4 | "Import data…"; "Import"; Ctrl+O | Fine: the two menus are where A and B look. |
| Report | 3 | "Report as HTML"; "Save report" | One name. |
| Processed data as CSV | 4 | "Final data and fit as CSV"; "Export data" (Results); "Export data" (History) | One name. |
| Copy results table | 4 | "Copy results table"; "Copy table" | Edit › and Results, not Export. |
| Open a graph | 3 | "Open a graph", in Plot and in Window | Window › and the taskbar. |
| The Format dialog's text page | 4 | "Text and fonts…"; "More fonts, and each element's own…" | One name. |
| The Format dialog's labels page | 3 | "Lines, labels and legend…"; "Labels and legend…" | One name. |
| The legend's title | 3 | "Legend title…"; "Add a title" (which is also the graph's, in the same menu) | "Add a legend title". |
| Overview | 3 | "Overview…"; "Overview of the spectrum" | Analysis › only. |
| Statistics window | 4 menu items, one window | "Descriptive statistics"; "Integrate the visible range"; "Noise and signal to noise"; "Correlation between spectra" | One item, "Descriptive statistics…". |
| Transmittance to absorbance, Kubelka–Munk | 3 each | the same names in Math › Transforms and Analysis › Spectroscopy | The Spectroscopy toolkit only. |
| Histogram | 9 | "Histogram"; "Histogram of the values"; "Histogram of its values"; "Histogram…" | One action that takes the selection. |
| Add a column | 3 | "Add a Y column"; "Add a column" | Data › and the worksheet, one name. |
| Make it the active column | 4 | "Being analysed"; "Analyse this spectrum"; "Analyse it" | One plain name. |
| New column from the processed data | 3 | "New spectrum from the processed data"; "From this one's processed data"; "From this processed data" | One name. |
| Plot type of a curve | 3 | "Plot type"; the toolbar list (six types, no Columns) | Plot › and RC-curve. |
| Several curves | 3 | "Several spectra"; "Layout of several spectra" | Plot › and RC. |
| Box chart, violin plot | 9 | "Box chart"; "Violin plot" | Plot setup and the Plot lists; not under "Several spectra". |
| Figure exports | in File, TB, RC, G⋯, F⋯ | "Export the figure" is RC's name for exporting one graph; "figure" is also a figure of panels | "Graph" for one graph, "figure" for panels only. |
| Two sorts | 2 | Data › Clean › "Sort by X" (a step that reorders the data); Col › "Sort the sheet by this column" (a view) | Names that say which is which. |
| Two "Remove" items that do not delete data | 2 | Data › Clean › "Remove a region…"; Results "Remove fit" (which does delete the fit) | "Leave out an X range…". |
| The project menu | 3 | PJ; the taskbar's project button; XP root › Projects | PJ and the taskbar (one menu). |

**One different kind of inconsistency: the menu bar changes menus on hover.** With a menu
open, moving the pointer across another menu's name opens that menu. A diagonal path from
File to its first item crosses Edit, so the click on New project lands on Edit › Undo.
This is the real cause of Phase 1's "New project performs an Undo"; see the Corrections at
the end. It is behaviour, not an entry point, and the fix is a matter of timing or path.
It is recorded here because it makes two entry points (New project, Undo) collide.

## 2. Language audit

These are terms a non-spectroscopist would not understand, in the general path: the first
screen, the worksheet, the History, the general menus and the general windows. Spectroscopy
words stay where they are inside the spectroscopy tools: the Peaks, Fit (peak), Integrate and
Overview windows, and Analysis › Spectroscopy.

| Term | Where it appears in the general path | Proposed plain replacement |
|---|---|---|
| "spectrum", "spectra" for any Y column | Several spectra; Spectra on it; Analyse this spectrum; Delete this spectrum; Rename the spectrum…; New spectrum from…; Give every spectrum these steps; With every spectrum; One for each spectrum; Correlation between spectra; Fit every spectrum…; Subtract or divide by another spectrum…; Average with other spectra…; Use as data (not a spectrum); Python on this spectrum…; the History's "1 spectrum"; the import dialog's "Import 3 spectra"; Text in each spectrum's colour | **"column"** in the worksheet and the processing ("Rename the column…", "Fit every column…"); **"curve"** on the graph ("Several curves", "Curves on it", "Text in each curve's colour"). "Spectrum" only inside the spectroscopy tools. |
| "Bring in a spectrum or a curve" | the empty graph's heading, the first thing A reads | "Type in the worksheet, or import a file" |
| "Raw", "Final", "Compare" | toolbar; worksheet tabs; Data › Show on the graph; History boxes ("Raw · 201 points", "Final") | **"Original"**, **"Processed"**, **"Both"** |
| "Recorded data" | the History's top box; its pane ("Locked: no analysis ever changes these values") | "Original data" |
| "the raw data", "the final data" | Python window (on the raw data, the final data); Statistics window (Final data, Raw data); Discussion ("Final data of Absorbance") | "the original data", "the processed data" |
| the hash: "8a1d674c5e6a", "sha256 …", "fingerprint" | History box subtitle; worksheet foot; File › Export "Raw data as CSV, with its fingerprint"; "Record the raw data as it is now?" | Leave the hash out of box titles and menu names. Inside the Original data pane: "check code (SHA-256)". The dialog: "The original data has changed since it was recorded. Accept it as it is now?" |
| "step", "steps" | History bar "Step"; "Insert a step here"; "Delete step"; "Copy with the same steps"; "Give every spectrum these steps"; Python "a step", "Record as a step"; Overview "After 1 step"; Help › Processing steps | **"processing"**: "Add processing…", "Remove this processing", "Copy with the same processing", Python "Add it to the processing". A single entry is "a processing step" in full, the first time it is named on a screen. |
| "analysed", "Analyse this spectrum", "Being analysed", "Analyse it" | RC-curve; H-box; Col; XP; History bar tooltip "the analysed spectrum" | **"active"**: "Make it the active column"; "Active"; "the active column" |
| "Turned down" | the Peaks window's heading; Peak fit's finder ("turned-down candidates") | "Not counted as peaks". Each one's reason stays. |
| "Mask" (alone) | TB Mask; Data › Masks; Cell RC "Mask this point in …" | Keep Origin's word, and say what it does once: "Mask (leave points out of the fit)". |
| "bands", "Integrate bands…" | Statistics › Integrate bands…; RC › Integrate bands… | In the general path, "Areas under the curve…". "Bands" inside the Integrate window is fine. |
| "Overview of the spectrum" | Statistics › | Overview is a spectroscopy tool; under Statistics it reads "Overview of the data". |
| Statistics columns "Noise σ", "S/N", "centroid", "X at max" | Statistics window, for any column | See Defaults: they are spectral measures shown for every column. "Points" becomes **"n"**. |
| "Several spectra" › "Double Y", "Offset (waterfall)", "Stacked panels", "Heat map" | Plot ›; RC; TB | "Two Y axes"; "Offset (waterfall)" stays; "Stacked panels" stays; "Heat map" stays |
| "Sticks" | every plot-type list | "Drop lines" (Origin's word) |
| "Panels" for tool windows | Window › Panels; "Close the panels" | "Tool windows". "Panel" is kept for a figure's panels. |
| "Residual panel", "Residuals" | Plot › Axis options; TB | "Residuals (what the fit misses)" in the tooltip; the name can stay. |
| "Weight by the Y error column (1/σ²)" | Fit window | "Use the error bars as weights (1/σ²)" |
| "Converged in 0 iterations" | Results after a refit that moved nothing (T3) | "Already at the best fit: nothing changed." |
| "Recorded data … 2 columns", "column B · Raw · 1 points" | History, after six typed rows (T1) | "Original data · 6 rows"; "B: 6 rows" |
| "What the fit, the peak finder and the exports use" | the History's processed-data pane | "Used by fits and exports" |
| "Final data and fit as CSV" | File › Export | "Processed data and fit as CSV" |
| "Run the X axis high to low, as wavenumber and binding-energy axes do" | TB Reverse X tooltip | "Run the X axis from high to low". The examples can go in Help. |
| "Tie the fwhm of peak 1 to another peak" | Fit window (screen-reader names) | "FWHM", as in the visible label. |
| "Tool" as a window's title | the Tool window | The tool's own name ("Smooth", "Subtract background"). |
| "Untitled analysis" | a new project's name | "Untitled project" |
| "Figure" for one graph | File › Export "Figure as SVG…", "Copy the figure as a picture"; RC "Export the figure" | "Graph", keeping "figure" for a figure of panels. |
| "Bring in" | File ›; Window ›; PJ; XP | "Copy from another project" |
| "Formats" beside "Format" and "Format graph…" | Plot › | "Saved styles" |
| Graph text sizes "Small … Largest" | Plot › Font; RC › Font | Fine as words, but say "(whole graph)". Every other size is in points. |

## 3. Defaults audit

These are defaults that assume spectroscopy or a particular data shape when the data says
otherwise. Each was met in Phase 1 or confirmed in the source.

| Default | Where | What it assumes | What the data said in Phase 1 | Proposal |
|---|---|---|---|---|
| The curve fit's model is "Gaussian peak" | Fit window, Curve fit (`draftModel` falls back to a Gaussian) | every curve is a peak | T2: a straight line. T7: an exponential decay. Both opened on Gaussian peak. | Start from the data's shape: a straight line for monotonic data with little curvature; an exponential for a decay to an offset; a Gaussian only for one clear peak. Origin and Excel both start at a line. |
| A new peak fit's peaks are Gaussian | Fit window, "New peaks" | Gaussian bands | T12: the PI judged Gaussians wrong for Raman bands. | Voigt or pseudo-Voigt when the X units say Raman shift; keep Gaussian otherwise. It is a choice in plain view either way. |
| A new project's curves are drawn as symbols | `PLOT_DEF.style: "scatter"` (a batch import uses "line") | few, uneven points | T1: six points, symbols, right. T8: a 1024-point Raman spectrum drawn as dots. T4: the first of three curves as dots and the others as lines. | Symbols for a few points or uneven X; a line for dense, evenly spaced data. One rule for every way data arrives. |
| The residual panel is on | `resid: true` | that whoever fits wants residuals under the graph | T2: it appeared unasked under a straight-line fit. | Off for a curve fit; on for a peak fit (where B expects it); always one click away in the Fit window. |
| Weighting by the error column is on when there is one | Fit window ("Weight by the Y error column") | that an error column holds standard deviations | T3: on before it was chosen, and named nowhere. Origin does the same (Instrumental weighting when error bars are plotted). | Keep the default, as Origin does, but say it beside the Fit button: "Weighted by column D (SD)". |
| The import takes a column of standard deviations as Y error bars, and draws them | Import dialog | a column named SD or error is a ± error | T2, T3: right for calibration.csv; but nothing on the graph names the column. | Keep it; name the column in the curve's Error bars menu and the legend's tooltip. |
| √N error bars offered for any column of non-negative whole numbers | Import dialog (`impSqrtable`) | whole numbers are counts | T7: right for photon counts. For a survey's scores or ages it would be wrong. | Offer it only when the column is named or united as counts, or the file is a counting format (TKA); otherwise leave it in the fixes list, unticked. |
| The second header line is taken as the names | Import (the header rows above the numbers) | one header row, or the second is the names | T4: "h;OD600;OD600;OD600" (a units row) became the names, and Sample A/B/C were lost. | When the last header line looks like units (short, repeated, unit words), make it the Units row, and take names from the line above. |
| A file with a text column is refused | Import (the reader looks for rows of numbers) | every column is a number | T6: an ordinary CSV of participants, groups and a score was refused outright. | (A gap, not a default: needs text cells. Recorded for Phase 3.) |
| The first column is always X | Import; paste into an empty sheet | XY data with X first | T6: the first pasted group (Control) was made X and left out of the statistics; "Use as Y" then inserted an empty X. | When no column is evenly spaced or rising, read every column as Y against the row number. |
| The Overview opens itself after an import that plots one column (a dropped file, or the dialog when it plots) | `ovAuto`, on by default; `autoOverview` | the data is a spectrum (it reports bands, spikes and background) | Not met: Phase 1's imports went through the dialog, which does not plot. A file of distances or reaction times dropped on the window would open it. | Open it only when the data looks like a spectrum (many evenly spaced points, bands). It already measures that. |
| Peaks and bands are offered for any data | RC "Find and mark peaks…", "Integrate bands…"; a point's right-click "Label the peak at …" | the data has peaks | T1: offered on a distance–time chart. T2: right-clicking a point to add a trendline offered a peak label. | Show peak items when the curve has peaks the finder can see, or keep them in Analysis ›. |
| The statistics table shows noise σ, S/N, area, centroid and X at max | Statistics window | every column is a spectrum | T6: listed for reaction times; no standard error, and n is "Points". | For any column: n, mean, SD, SE, median, min, max. The spectral columns behind a "Spectral measures" switch, on for spectra. |
| The examples are all spectra (and one decay) | File › Examples; the empty graph's examples | the newcomer is a spectroscopist | T1: "I don't have a spectrum." | A general example first (a calibration line with error bars, growth curves), then the spectra. |
| The first window layout gives the graph the most room and the worksheet the least | first visit (Graph, History, Worksheet) | data arrives by import | T1: the worksheet showed one row at 1366 px and none at 1280 px. A started by typing. | With an empty project, the worksheet is the big window. The graph takes over once there is something to plot. The History opens when there is processing to show. |
| The fit range is the zoom | Fit window, "Range" (Curve fit: "One model through the points in view") | a zoom means "fit this part" | no task tripped over it, but it is invisible until read. | Fit all the data unless a range is typed or picked. The zoom can offer itself as a range ("Use the view"). |
| Typed data plots at once; imported data waits for Plot | the worksheet; the import | typing is quick, importing is deliberate | T2: the toast said "not plotted yet" while the graph showed the data. T4: the toast was the only quick way to plot, and vanished. | One rule: plot as soon as there is an X and a Y, as Excel does with a selection, with Undo. Or neither, with a Plot button that stays in view. |
| Axis titles follow the old data | the graph after an import into a project that had typed titles | the new data is the same kind | T2: "Time (s)" and "Distance (m)" stayed over calibration data. After T4's renames the Y axis read "Sample A" for three samples. | Axis titles typed by hand stay. Automatic ones follow the columns plotted; with several Y columns, the Y title is the shared unit, not the first name. |
| Reverse X is off, and the examples switch it on | `revX: false`; the IR example sets it | wavenumber axes are reversed by convention | no task met it. | Fine as it is. Only the tooltip needs plain words (see Language). |
| "Share X" in a one-column figure reads as off | Figure dialog: "Share X (automatic for one column)" | that "automatic" is understood | T9: switched on as a guess. | Show it on (ticked and disabled) when it is automatic. |
| The peak finder's threshold is S/N ≥ 4, smoothing automatic, noise automatic | Peaks window; Peak fit, part 1 | spectra with noise | T8: right for Raman. | Fine inside the spectroscopy tools. |
| The background method is arPLS; spikes over 8 × noise | Subtract background; Remove cosmic-ray spikes | spectra | T8: right. | Fine inside the spectroscopy tools. |

---

## Remove candidates, for STOP 2

Six. Nothing else in this inventory needs removing to make a task easier. Every other proposal
moves, merges, renames, re-defaults or hides. Mark each one: remove, keep, or hide.

| # | Feature | Where | Why it is a candidate | What removing it would cost |
|---|---|---|---|---|
| R1 | **The Graphite interface style** | Window › Style | A second look for the same layout. It doubles every token block in the CSS, DESIGN.md's rules and `tools/contrast-test.mjs`, and no task depends on it. Theme already covers light and dark. | Anyone who chose Graphite goes back to Bench. A round of the CLAUDE.md roadmap built it. |
| R2 | **The "Raman: one band" example** | File › Examples | It shows less than "Raman: raw polystyrene", and a single band cannot show peak finding. | Nothing that the other Raman example does not show. |
| R3 | **"Processing steps as JSON"** and the History's "Export the steps" | File › Export; TB Export; History, processed-data pane | Nothing in Kurve reads the file back, so it is not a recipe. The report and the CSV already list every step with its settings. | A machine-readable list of the steps, for someone's own scripts. |
| R4 | **The Plot › Format submenu** (X axis…, Second X axis…, Second Y axis…, Y axis…, Frame and grid…, Text and fonts…, Legend…, Lines and symbols…) | Plot › Format | Eight shortcuts into the one dialog that "Format graph…" opens, one line above. The dialog's page list reaches each page, as does a double-click on the element. Its name sits between "Formats" and "Format graph…" (the sealed appendix). | One click more to land on a page directly from the menu bar. |
| R5 | **The graph window's own menu bar** (Data, Math, Analysis, Statistics, Plot) | the graph in front | Five menus that repeat, item for item, five of the menu bar's nine, a row below them, in the graph window in front (the sealed appendix). They cost the graph a row and caused a misaimed click in T5. | A route to the menus that stays with the graph when it is maximised. Its Python button and stage chip would move to the graph's title bar. |
| R6 | **"All graphs as one figure"** (SVG, PDF, EPS, PNG) | File › Export; TB Export; G⋯ › Export (SVG and PNG only) | A figure of panels does this properly: plot areas lined up, shared axes, lettered panels. These entries tile every graph in a plain grid, and the ⋯ menu offers half the formats under other names. The report keeps the drawing for its own use. | One click to dump every graph into one file, without making a figure first. |

**Decided at STOP 2 (2026-10-16):** remove R1, R2, R3 and R6. R4 and R5 were not marked, so they
stay; the UX spec renames R4 ("Format a part") and keeps R5 matched to the menu bar.

## Corrections to the Phase 1 report

Reading the code for Phase 2 turned up two findings in `ux/COLD_WALKTHROUGH.md` that were
misattributed. The report has been corrected in place, with a note at its end.

1. **"File › New project performs an Undo" (worst moment 4, T6) was the menu bar, not New
   project.**
   - `newProject` is correct.
   - What happened: with a menu open, the menu bar opens whichever menu's name the pointer
     passes over. The rig moved diagonally from "File" to New project, across "Edit", so
     Edit's menu opened and the click landed on its first item, Undo.
   - Reproduced on purpose with the same path, while a vertical-then-across path worked.
   - A person who moves diagonally can hit the same thing, so it is still a real finding, but
     about the menu bar's hover. It is not a wrong action behind the right label. It moves down
     the ranking: an action is lost, and Undo's own label says what it undid.
2. **"Keys typed after bringing the worksheet forward from the taskbar went to shortcuts"
   (T13, dark T1) was focus, not shortcuts.**
   - There are no single-key window shortcuts.
   - What happened: the focus stayed on the taskbar button that brought the worksheet forward.
     Typed text went nowhere. Tab moved the focus along the taskbar and the title bar, and
     Enter pressed the button that had it. That is how the graph came forward and the project
     name opened for renaming.
   - The finding stands as "after the taskbar brings the worksheet forward, no cell has the
     focus". Only the mechanism changes.
