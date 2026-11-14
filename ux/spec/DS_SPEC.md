# The design system into the app

The user, on 2026-10-26, pointed at the Kurve design system (a claude.ai Design System artifact,
`https://claude.ai/artifact/AiTBmugEiiwRMxJMwmoRxf`, built from this repository on 23 October and
reviewed on 25 October) and chose to bring the app up to it: "Design into the app". The design
system is the spec. This file lists every difference found, the decisions taken where the
system leaves a choice, and the slices that close the gap.

## What the design system is

- **38 components**, each with guidelines (`components/<Name>/README.md`) and a preview drawn with
  the app's own markup and stylesheet. The previews "show Kurve as it should be rather than as
  the 23 October build has it: name-only tooltips, short labels and one-line notes, menus in
  stage order, the Format settings in a docked pane, spin boxes for sizes, and the status bar
  answering questions."
- **A stylesheet** (`components/bundle.css`) that is the app's CSS of 23 October, rule for rule
  (checked: 1661 rules against the app's 1662, the only differences the theme selectors the
  system writes as `data-theme` light, dark, graphite and graphite-dark, and one line of the
  dock bar), followed by two blocks the app does not have:
  - **Design-system additions**: `.rb.ctx` (a contextual menu in the graph's ribbon), `.sb-stats`
    (the status bar's statistics of a selection), `.note .acts` (a note's fixes), `.cmdk` (the
    command palette), `.pgal` (a gallery drawn with the user's data).
  - **The review of 25 October**: controls as wide as their content, windows rounded to 12 px
    (9 in Graphite), a cleaner taskbar, a dock bar of icon tabs, the project name as a field,
    the results table with the value and its standard error apart, detected import settings
    tinted, read-only fields for facts, real superscripts, and the two-display classes (`.dwin`,
    `.tk.away`, `.mdisp`).
- **Rules** (the README): principles, content fundamentals, visual foundations. Those that the
  app does not yet keep are listed under each slice.

## Where Kurve stands

What already matches: the tokens, the two styles and two themes, the contrast rules, the
surfaces, the fonts, the six type sizes and the spacing standard; windows, menus, the toolbar,
the worksheet, the parameter grid, switches, segmented controls, sliders, the colour and font
pickers, toasts, the confirmation dialog, the History, Help, the Explorer. The previews of those
components and the app's screens differ only in what the slices below change.

What does not, component by component:

| Component | The design system | Kurve today |
|---|---|---|
| TitleBar | Menus in the stage of work: File, Edit, Data, Plot, Analyze, Figure, Publish, Window, Help. The project name a visible field (a panel box, up to 320 px) with its projects menu joined to it | File, Edit, Data, Plot, Graph, Analysis, Statistics, Spectroscopy, Window, Help. The name is text on the chrome |
| GraphWindow | Its ribbon in stage order (Data, Plot, Analyze, Figure), then, while something is selected, its contextual menu (Curve, Axis, Column, Fit results, Region), filled `accent-soft` | Data, Plot, Graph, Analysis, Statistics, Spectroscopy; no contextual menu (a right-click menu instead) |
| Menu | Analyze: Fit ▸, Peaks…, Integrate…, then Signal processing ▸, Calculus ▸, Statistics ▸, then Results. Data › Baseline holds Subtract baseline and Linear detrend | Mathematical and spectroscopic menus of their own |
| CommandPalette | Ctrl+K: every command by its name or a synonym, grouped by stage, each with where it lives | None |
| FormatPane | The Format settings in a pane docked beside the graph, live, every change undoable, the selected thing chosen on the graph or in a list at the top | A modal dialog with a page list, OK and Cancel |
| StatusBar | Answers questions: the selection's range, N, mean, SD, minimum and maximum; a range dragged on a curve, its integral, peak position, FWHM and span. "Saved" | A hint, the point count, the fit, "Saved in this browser" |
| Taskbar | 42 px. The project switcher first, a white field with a folder icon. Windows flat on the chrome; the front one a raised white key with an accent pill, open ones a grey pill, minimised none; Tile and Cascade in a tray | Raised buttons, the front one filled with the accent |
| Dock | A tab strip: a small "Tools" label, inactive tools as icon-only tabs, the shown one a raised tab with its name, its close button and an accent cap, joined to the window under it | Tabs with names and × each, the window's own title bar below |
| Window | Title-bar buttons: Move to new window, Dock, Help, Minimise, Maximise, Close. Radius 12 px (9 in Graphite) | No Move to new window; radius 8 px |
| DetachedWindow, DisplayMenu, Taskbar's `.tk.away`, Preferences' Displays | A window moved into its own browser window, on another display, live with the main one (Live or Paused, Return to desk); the Window menu's Move to new window, Open on display ▸, Return all to desk | None |
| PlotGallery | Plot types as thumbnails drawn with the selected columns' own data; hovering one previews it on the open graph; the same pattern for saved styles and colour schemes | Plot setup's kinds as fixed pictures |
| FitPanel | The range as a readout ("81 points"), "Suggested: [Gaussian peak]", the formula typeset, the grid, options as switches, **In the results** switches (confidence intervals, ANOVA, matrices, residual analysis) chosen before the fit; footer Fit, 1 iteration, Guess, Done | The range in a sentence, the suggestion in a sentence, no "In the results" |
| Results | Value and standard error in columns of their own; the statistics in a list beside the table; the sections chosen in the Fit window shown open, never behind disclosure arrows; notes one line with their fix | "Value ± standard error" in one column; Analysis of variance, Correlation and Residuals behind disclosure arrows; a paragraph per note |
| Note | One line, number first, the fix as small buttons at its end ("1 outlier at x = 503.5 (studentised residual > 3.57)." [Mask]) | Paragraphs, fixes elsewhere |
| ImportDialog | Detected settings tinted `ok-bg` with a "Detected" key, not spelled out; Put it in: New sheet, Add to Sheet 1, New project (replacing the project lives in File, behind a confirmation); ranges as readouts; the footer only its buttons | "detected Semicolon" beside each field; four long choices with a paragraph; the footer carries "4 rows · 1 Y column" |
| ExportFigure | Facts in read-only fields (Pixels 2006 × 1419); the footer only Cancel and Export | A paragraph under Tick numbers and one under the format; a summary line in the footer |
| Preferences | History (the switches and Clear history…), Appearance (Theme Light, Dark, System; Style Bench, Graphite), Animations, Displays | No System theme in the dialog; no Displays |
| ToolWindow | "Input: Raw data" (the stage the step reads), spin boxes with units for sizes and counts, sliders only beside a number | "Position: The first step" |
| PeakFinder | Short labels: Search, Settings, Peaks, Find, Copy, Clear, Add peak, Rejected, Identify; footer Done, Fit…, Integrate, Labels… | Find peaks in, Peak finder settings, Search again, Add a peak by clicking the graph, Not counted as peaks, Name them from known lines, Fit them…, Integrate them, Labels and legend… |
| Worksheet | The status line says what a person can use: "81 rows · 3 columns", no file hashes | "81 rows · sha256 fb44fe9c436a" |
| EmptyState | A serif headline ("Import data"), one line, Import… (and Plot setup…), then Examples | A one-line hint in the worksheet's foot and the status bar |
| Field | Text fields 12em, number fields 7em, selects as wide as their choices; units written out ("pixels"), superscripts real `<sup>` (cm<sup>−1</sup>) | Fields stretch to the row; units with the Unicode ⁻¹ glyphs |
| Batch | Results land in a new sheet, one row per spectrum | A table in the Batch window (planned in FIT_SPEC slice 6) |

And from the rules (README), where the app falls short:

- **Tooltips give the name only**, plus the shortcut ("Zoom (Z)"); a few still explain.
- **No internal identifiers** in the interface: the worksheet's check code link, "Saved in this
  browser".
- **Real superscripts and subscripts**: units are written with Unicode ⁻¹ ² ₀ in HTML and SVG.
- **Settings before the run**: the Results sections behind disclosure arrows.
- **Readouts, not sentences**, and no loose text under a form or in a footer: the import and
  export dialogs, the fit's range.
- **Destructive choices never peers of safe ones**: "Replace everything in this project" is a
  radio beside three safe choices in the import dialog.
- **Failures explain and offer the fix as a button**: notes say what to do in words.

## Decisions (where the system leaves a choice)

1. **Where the design system and DESIGN.md disagree, the system wins**, and DESIGN.md is
   rewritten with the reason (the round of 25 October is later than DESIGN.md's decisions on the
   taskbar, the Graph menu and the Format dialog).
2. **The menu tree in stage order** (slice 2), every item of today's menus kept or given a fate
   (a crawl before and after, compared leaf by leaf):
   - **File**: New project, Import data…, Copy from another project…, Examples, Rename the
     project…, Delete the project…, Preferences… (Replace the data…, the import's "Replace
     everything" behind a confirmation, comes with slice 8).
   - **Edit**: Undo, Redo, Copy, Paste, Clear, Insert, Delete, Find…, Preferences….
   - **Data**: the worksheet's commands (Worksheet, Sheets, Add a column, Fill, Sort the view,
     Hide and show, Columns, Masks, Lock the original data), then the processing that prepares
     data: Clean ▸ (crop, exclude, sort, average repeats, resample), **Baseline ▸** (Subtract
     baseline…, Linear detrend…: the background step under the word the system uses,
     "background" kept as a synonym), Transform ▸ (scale, normalize, logarithm, linear X,
     another column, average).
   - **Plot**: Plot setup…, Plot the selected columns, New graph, Plot type, Several curves, Show
     on the graph, View ▸ (Zoom, Pan, Reader, X–Y lines, Show all the data).
   - **Analyze**: Fit ▸ (Curve fit…, Peak fit…, New function…, Fit, Fit every column…, Show
     residuals, the bands, Remove fit), Peaks…, Integrate…, then Signal processing ▸ (Smooth…,
     FFT filter…), Calculus ▸ (Derivative…, Cumulative integral…), Statistics ▸ (Descriptive
     statistics…, Correlation…, Histogram), Spectroscopy ▸ (Overview…, Remove cosmic-ray
     spikes…, Name the peaks from known lines…, X axis ▸, Corrections ▸), then Results, Batch
     results.
   - **Figure**: Format graph…, Format a part ▸, Saved styles ▸, Axes ▸ (Reverse X, Log Y, the
     scales, Grid lines), Font ▸, Legend ▸, Annotate ▸ (lines, text, arrow, box, ellipse, a
     shaded range, an inset, a comment), Layout and colours….
   - **Publish**: the exports (the figure for a paper or slides, SVG, PDF, EPS, PNG, the data as
     CSV, the steps as JSON), the report, Copy the graph as a picture, Copy the results table.
   - **Window**: as now; slice 10 adds Move to new window, Open on display ▸, Return all to desk.
   - **Help**: Kurve help, Search help…, Find a command… (Ctrl+K, slice 3), Getting started,
     Keyboard shortcuts, About processing, How Kurve computes, About Kurve.
   The graph window's ribbon: Data, Plot, Analyze, Figure. The Graph menu goes: its pointer
   tools to Plot › View and Figure › Annotate (Mask points to Data › Masks), its switches to
   Figure › Axes, the fit's bands to Analyze › Fit; the toolbar's graph group stays. The
   glossary's rule "spectroscopy's words only in the Spectroscopy menu" becomes "only in
   Analyze › Spectroscopy and its windows".
3. **The contextual menu** (slice 4) is the right-click menu of the thing selected, put in the
   ribbon while it is selected: a curve (clicked on it), an axis (its numbers), a column (in the
   worksheet, while the graph shows it), the fit (its curve), a region (a range dragged). The
   right-click menus stay, with the same items.
4. **The Format pane** (slice 5) is a tool window docked like the others (`format`), its page
   chosen by a list at the top ("Selected"); every change is saved at once, one undo entry per
   burst of one setting, and Cancel goes; Defaults, Saved styles and Use on every graph stay as
   buttons.
5. **Two displays** (slice 10): the detached window is a page of its own opened by
   `window.open` from the main one, which owns the project; it shows the window's body (a graph
   drawn live, or a tool window), sends its edits to the main window and redraws from what comes
   back. The Window Management API (`getScreenDetails`) places it where the browser offers it;
   elsewhere it opens beside and is dragged by hand.
6. **The docked window's title bar gives way to the dock's strip**, as the Dock component draws
   it: the strip carries the shown window's name, its ×, and Help, Undock and Hide (Help is the
   Window component's title-bar button, kept on the strip).
7. **What is not taken**: the system's README gives the taskbar and dock bar 30 px in one place
   and 42 and 36 px in the review's stylesheet; the stylesheet, being later, wins. The review
   sizes the fit's range fields 5.5em; a seven-character value (1550.25) does not show whole at
   that width, so they take the system's own number-field width, 7em.

## The work, in slices

Each slice is a round: built, clicked, screenshot beside the system's previews at 1440, 1024
and 390 px in both themes and both styles, the tests run (`tools/ds-test.mjs` drives what the
slices add), DESIGN.md, CLAUDE.md and the menu spec updated, committed and pushed.

1. **The frame and the rules.** The review of 25 October's stylesheet: controls as wide as their
   content, windows rounded to 12 px (9 in Graphite), the taskbar (the project switcher as a
   field, windows flat, the front a raised key with an accent pill, open ones a grey pill,
   Tile and Cascade in a tray), the dock bar ("Tools", icon tabs, the shown tab raised and joined
   to its window), the project name as a field in the title bar, `.ro`, `sup`/`sub`, search
   fields. Then the rules: tooltips name-only with their shortcut; no internal identifiers (the
   worksheet's foot "81 rows · 3 columns", the status bar "Saved"); units with real
   superscripts in HTML and, on the graph, Unicode scripts typeset as scripts.
2. **Menus in stage order** (decision 2), the graph's ribbon, every Help path (`MP`), the
   menu tree and its check, the glossary.
3. **Find a command** (Ctrl+K): every command of the menu bar, found by name or synonym (the
   field's vocabulary: background, baseline, detrend; Fourier, FFT, power spectrum…), grouped by
   stage, each with where it lives; Enter runs it.
4. **Commands that appear when they apply**: a selection on the graph (curve, axis, fit,
   region, and the worksheet's column) and its contextual menu in the ribbon.
5. **The Format pane**: the Format dialog as a docked tool window, live and undoable, following
   what is selected on the graph.
6. **The status bar answers questions**: the worksheet selection's statistics, a range dragged
   on a curve measured; the Statistics window the same numbers.
7. **The Fit window and Results as designed**: the range readout, the suggestion, *In the
   results* switches before the fit, Results with Value and Standard error apart and the
   statistics beside, sections open, notes one line with their fixes (`.note .acts`) across the
   app.
8. **Dialogs and windows as designed**: the import dialog (tinted detected settings, three short
   places, Replace in File behind a confirmation, readouts, a footer of buttons), the export
   dialog (`.ro` facts, a footer of buttons), Preferences (System theme, groups), tool windows
   ("Input"), the Peaks window's short labels, the empty desk's headline.
9. **Galleries drawn with the data**: Plot setup's kinds, Saved styles and colour schemes as
   thumbnails of the user's own columns; hovering one previews it on the graph.
10. **Two displays**: Move to new window, the detached window (Live, Paused, Return to desk, a
    display picker), the Window menu's display entries, the taskbar's marker, Preferences ›
    Displays.

## Rules to keep

- The previews are the reference: a screen is done when it reads as its preview does, in both
  themes and both styles; where the preview has a class the app lacks, the class comes from the
  design system's stylesheet unchanged.
- Nothing the user could do before is lost: a command that moves keeps a route, a dialog that
  becomes a pane keeps its keys and its undo.
- The contrast rules stand (`tools/contrast-test.mjs`), and every new control is drawn from the
  tokens.
- Each slice is committed and pushed as soon as its tests pass: the session's container can be
  reclaimed at any time, and work that is only on its disk goes with it (it did, once: three
  slices were rebuilt from the conversation).
