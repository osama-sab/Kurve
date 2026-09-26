# Kurve: collaborative Origin-style data analysis

Single-file web app (`kurve.html`): HTML, CSS and vanilla JS, no build step, no dependencies
besides Google Fonts. Open the file in a browser to run it. The file uses CRLF line endings;
keep them (see the rules at the end).

## The screen

A desktop-style frame, top to bottom: a title bar with the **menus** (File, Edit, View, Data,
Analysis, Help) and the project name (click to rename; the arrow beside it switches, creates and
deletes projects); a **toolbar** (Import, Export, undo/redo, the pointer tools Zoom / Pan / Mask /
Add peak / Comment, show-all, plot style and the Reverse X / Log Y / Grid / Residuals toggles);
the **workspace**; and a **status bar** (tool hint, live cursor readout, point counts, fit
state, save state). The workspace is three resizable panes: the **worksheet** on the left, the
**graph** in the middle with a foldable **drawer** under it (Results / Discussion / History),
and the **inspector** on the right, whose tabs are the analysis steps: 1 Data, 2 Process, 3 Fit.
Below 860 px everything stacks: graph, drawer, inspector, worksheet.

## Code layout (all inside the `<script>` block of kurve.html)

- **Numerics** (`==NUMERICS:START/END==`): `solve`, `inverse`, `lmFit`, `polyfit`, `tPvalue`.
  `lmFit` is Levenberg–Marquardt with a central-difference Jacobian, covariance scaled by reduced
  chi² when unweighted (as Origin does), box bounds by projection, normal equations solved in
  units of each parameter's own curvature, and finite-difference steps sized from an optional
  `pscale`. Those last two are what let a model mixing areas of 1e6 with widths of 10 converge.
  It returns standard errors, 95% CI, t and p values, `dep` (dependency), `atBound`, AIC and BIC.
  `polyfit` fits about the mean of X and shifts back, so a wavenumber axis is not hopeless.
- **Peaks** (`==PEAKS:START/END==`): `PEAKS` (Gaussian, Lorentzian, pseudo-Voigt, split-width
  pseudo-Voigt, Pearson VII — all parametrised centre/**area**/FWHM, with `height()` and
  `fwhm()`), `BASELINES` (none/constant/line/quadratic/cubic, evaluated in `x - x0`),
  `compileModel` which flattens a `{base, peaks[]}` spec into one parameter vector,
  `modelBounds`, `sgCoeffs`/`sgApply` (Savitzky–Golay, needs even spacing), `findPeaks`
  (`max`, or `deriv2` for shoulders that never form a maximum), `seedPeak`, `noiseSigma` and
  `peakAreaForHeight`. `findPeaks` takes `minPts` (a candidate needs that many points above its
  own half height; 2 sets one-point spikes aside and returns them in `.rejected`) and
  `prominence` (`"auto"` = four times `noiseSigma`, applied to `max` only, never to `deriv2`,
  whose shoulders have no prominence by definition). The app passes both. `seedPeak` takes the
  half width from whichever side reaches half height first, and returns the height `h` it saw;
  callers turn that into each shape's own area with `peakAreaForHeight`.
  `tools/fit-test.mjs` checks each shape integrates to its stated area and has its stated FWHM,
  that known multi-peak spectra are recovered, and the spike, prominence and seeding rules.
  Run it after touching any of this.
- **Fits** come in two kinds. `MODELS` (each with `params`, `ph`, `formula`, `f(x,p)`,
  `guess`, optional `derived` with delta-method errors) drives "Curve fit".
  `{kind:"composite", spec, x0, …}` drives "Peak fit". `fitModel(fit)` hands either to
  the plot, the CSV export and the report; `activeFit()` returns the current one if it is valid,
  and `shownFit()` is the one the graph draws (only on the column it was fitted to). Anything
  that reads `p.fit` must go through those, not `MODELS[p.fit.model]`. Stored fits carry `dep`,
  `tval`, `pval` and `ci` with non-finite values written as `null`.
- **Caveats** have one source: `fitWarnings(fit)` returns `{level, kind, text}` for staleness
  (`fitStale`), non-convergence, unusable components (`peakProblems`), a singular covariance,
  dependency, parameters at a bound, and residuals that run in long same-sign stretches
  (`runsTest`, Wald–Wolfowitz). The results drawer, the fit panel's summary line, the copied
  table and the exported report all read it, so the report can never say less than the screen.
- **Import** (between the `==PARSER:START==`/`==PARSER:END==` markers): pure, DOM-free functions
  that sniff a file — `detectFormat` (delimiter and decimal mark decided together, since `1,5;2,5`
  only parses if you treat `;` plus comma-decimal as one hypothesis), `findBlock` (the longest run
  of consistent numeric lines, so an instrument preamble and a trailing footer are found rather
  than fought), `parseMeta`, `detectRoles`, `detectPaired`, `analyzeFile`, and `checkColumns`
  which reports findings without applying them. `tools/parser-test.mjs` extracts this block
  straight out of the HTML and tests it under node; run it after touching anything here.
  Files arrive through `readFileIn` (the Import button, Ctrl+O, or a drop anywhere on the
  window) and `importText`, which refuses binary instrument files with a reason.
- **Columns**: a project is a table. `p.cols` is `[{id, role, name, unit, data, of?, formula?}]`
  with roles `x` / `y` / `e` (an error column names its Y in `of`) / `ignore`, and `p.activeY`
  says which Y the fit and the analysis panels use; the others are drawn behind it for
  comparison and can be hidden via `p.plot.hidden`. Helpers: `xCol`, `yCols`, `activeYCol`,
  `errColFor`, `colById`, `makeCol`, `colLabel`. Nothing should reach for `p.x`/`p.y`/`p.e`
  any more — `migrate()` converts those v1/v2 documents to v3 columns and deletes them. A
  column's role, error-bar owner, visibility and deletion live in its header menu
  (`openColMenu`: the arrow in the header, or right-click) and go through `setColRole`,
  `setErrOf`, `setActiveCol`, `toggleColVis`, `deleteCol`. The analysed column is always drawn
  in the data colour; `yTint` gives the others the rest of the palette.
- **Recipe**: raw column data is the record and analysis never edits it. Two layers:
  `p.steps` holds row-level cleanup (`STEPS`: sortX, dedupeX, trim) applied to the whole table
  at once by `derivedTable()`, and a column may carry a `formula` (`==COLMATH:START/END==`:
  subtract/add/multiply/divide another column or a constant, normalise, or Savitzky–Golay
  smooth/differentiate) recomputed by `recomputeFormulas()` whenever its inputs change.
  Every step carries an index map back to the original rows, so masking and row selection still
  refer to the same observation after sorting, averaging or cropping. `derived()` is the active
  series as x/y/e; `pointsAll()` reads it. The worksheet shows raw data and marks computed
  columns read-only. `interpOnto` lets columns on different X spacings be combined; `trapz`
  integrates and returns a negative area on a descending axis, which is why callers take the
  magnitude. The Data tab adds and removes steps (`addStep`, `removeStep`, `cropToView`).
- **Peak draft**: the peak set being built is `S.pdraft` (`{base, peaks, init, fixed, x0,
  fitAt}`), outside the document. `draftOverlay()` draws it on the graph before it is fitted:
  dashed curves per peak plus their sum, a numbered dot per peak (drag: centre and height) and,
  for the selected peak, side handles (drag: FWHM). `applyHandle` keeps area/width consistent
  and respects fixed parameters. `fitAt` equals the fit's `at` while the draft is exactly that
  fit, which is how the overlay knows not to draw a duplicate; every edit to the draft clears
  it. `recenterBase` re-expresses the baseline coefficients when the view (and so `x0`) moves.
  `setPeakShape` changes a shape keeping centre, width and height.
- **Undo**: `pushUndo(label)` before any mutation, `undo`/`redo`, snapshots of `UNDO_KEYS` plus
  both drafts (`S.pdraft`, `S.draft`). It is per-session and local on purpose — rewinding your
  own edits, not other people's. Destructive actions confirm themselves with a toast that
  carries an Undo button (`toast(msg,{action,run})`).
- **Storage**: `LocalStore` (localStorage, single user) and `makeDbStore(db)` (claude.ai artifact
  runtime, shared realtime). Both expose the same interface: `watchProjects`, `create`, `save`,
  `remove`, `watchComments`, `addComment`, `updateComment`, `deleteComment`. To add a real
  backend (Firebase, Supabase, a custom server with WebSockets), implement this interface.
  With LocalStore and no projects at all, `onProjects` creates an empty one, so a first visit
  has a worksheet to paste into.
- **State**: global `S`; the current project is `S.proj` with `cols` (see Columns above),
  `activeY`, `mask` (raw row indices), `steps`, `meta` (captured from the imported file's
  header), `plot` settings (`style`, `logY`, `grid`, `resid`, `revX`, `hidden`), `fit`, `log`,
  optional `prefFit`/`prefModel` (what an example opens with), and `v` (document version;
  `migrate()` upgrades older projects in place). Panel state is `S.tab` (inspector step),
  `S.dtab` (drawer tab), `S.mode` (pointer tool), `S.fitMode` (`curve`/`peaks`). Pane sizes and
  which panes are shown are `LAYOUT`, saved per browser under `kurve.layout`.
- **Rendering**: `buildPlot(W,H,palette,forExport)` returns an SVG string used both on screen and
  for export; on screen it also records `S.geo` (transforms and handle positions).
  `renderTop` (title bar and toolbar state), `renderWs`, `renderPlot` (+ `renderStatusBar`),
  `renderFit` (always; it also refreshes `renderResults`, the step marks and the status bar),
  `renderData`, `renderProc`, `renderThread`, `renderLog`, `renderAll`. `showTab(t)` and
  `showDrawer(t)` switch the inspector and drawer.
- **Menus and dialogs**: `openMenu(trigger, items, opt)` renders any menu (menu bar, project
  list, Export, column header) from `{label, run, kbd, checked, radio, enabled, danger}` items,
  `"-"` separators and `{group}` headings, with arrow-key, type-ahead and Escape handling;
  `menuItems(name)` defines the menu bar. `openModal`/`closeModal` make everything behind a
  dialog inert, trap Tab, route Escape to the dialog's `_cancel`, and return focus; the import
  wizard, `confirmDlg` and the help (`openHelp`) all use them.
- **Export**: `saveFile(name,data,mime)` uses the claude.ai `downloads` runtime when present and
  falls back to `Blob` + `<a download>` otherwise, so exports work from disk. `exportSvg` and
  `exportPng` (the same SVG rasterised at 2.5×), `exportCsv` (every column with units, the mask
  flag, the fit, residual, baseline and each peak curve, plus commented blocks for metadata,
  cleanup, computed columns and fit statistics), and `exportReport`, a self-contained HTML
  document for either kind of fit (figure, notes from `fitWarnings`, peak table, full parameter
  table with t, p, CI and dependency, statistics, method, session log). `resultsText` is the
  same as TSV for `copyResults`.
- **Boot**: `boot()` asks `window.claude.use(...)` for `db`, `user`, `room`, `downloads`. Outside
  claude.ai these are absent, so the app falls back to `LocalStore` and hides presence.

## Running outside claude.ai

Works fully as a single-user app, exports included. Only collaboration (shared projects,
presence, names) depends on the claude.ai runtime and would need a real backend behind the
`LocalStore` / `makeDbStore` interface.

## Checking a change

`node tools/fit-test.mjs` and `node tools/parser-test.mjs` cover the numerics and the parser.
The UI has no test file: drive it in a real browser (Playwright with Chromium works headless),
click every control you touched, and watch for page errors. Screenshots at 1440, 1024 and
390 px wide, in both themes, catch most layout mistakes.

## Things that have bitten, and the rules that came out of them

- **NaN and Infinity do not survive `JSON.stringify`**, and every project round-trips through it
  on save. An uncertainty that could not be computed is stored as `null`, never `NaN`, or the
  "± unknown" it should print silently becomes a bare number after a reload.
- **`medianStep` is signed on purpose.** A wavenumber axis runs high to low, so an odd-order
  Savitzky-Golay derivative taken with a positive step comes back with the wrong sign.
- **Thousands grouping never starts with `0`.** `0,051` is a decimal comma, not `51`. The
  US-thousands rule in `toNumber` requires a leading `1-9` for that reason. `12,345` on its own
  is genuinely ambiguous and is read as a point-decimal; the import wizard's decimal override
  and preview plot are the escape hatch.
- **Fix the class, not the reported case.** Both of the above shipped as fixes to one example
  and failed on the next one along.
- **Anything added to the UI must be clicked once before it is called done.** "Reverse X"
  shipped with a checkbox, a renderer and no `onchange`; the derivative sign and the Add-peak
  hint were the same shape of mistake.
- **Patch scripts must report what they applied and what they missed.** One that threw partway
  wrote nothing, and five fixes were believed to be in the file for an hour.
- **Patch scripts must not eat backslashes, or line endings.** A CSS escape `\25B8` went through
  a tool that read `\25` as an escape and left a control byte plus a literal "b8" beside every
  collapsible heading for several releases. Prefer real characters or SVG over escapes in CSS.
  And a script that reads `kurve.html` in text mode writes it back with LF: convert back to
  CRLF, or the diff claims every line changed and hides what really did.
- **The preview pane serves a snapshot**, so `location.reload()` re-runs stale code. Navigate to
  the file again after editing.
- **Undo has to cover the panel you are working in, not just the document.** The peak set being
  built lives in `S.pdraft`, outside `UNDO_KEYS`, so Find peaks / Clear / Delete peak were logged
  and not undoable — the History note promises a record the app then could not keep. `snapshot()`
  now carries `pdraft` (and the curve draft) too.
- **A unit built from two others is not a unit when half of it is missing.** An area printed as
  `cm⁻¹` because the Y column had no unit is dimensionally false; `unitFor` returns nothing rather
  than half an answer.
- **"Reset to estimates" means all of it.** It re-seeded only the baseline, so after a shape change
  it handed the fitter back the seed that had just failed. A peak that has run off the end of
  the spectrum is now put back on the largest feature no other peak is describing, not on the
  nearest edge point.
- **The report is the artefact that leaves the building.** Every caveat on screen — excluded
  components, dependency, at-bound, singular covariance, non-convergence, staleness, patterned
  residuals — has to be in it. That is why they all come from `fitWarnings`.
- **Two spectra with no common X do not belong in one row.** Adding a column whose X range does
  not overlap the project's appends rows instead of lining up by row number, so every value
  keeps the X it was measured at, and the import dialog now suggests a new project instead.
  The toast and the log say the same thing, because they used to say opposite things from one
  shared string.
- **Transient UI has to be torn down on a project switch too.** The hover tooltip stayed on
  screen across a switch, showing the previous project's point, value and units. So does any
  field guarded by `document.activeElement` — guard on the project id as well, or a rename in
  progress freezes the name of a project you are no longer looking at.
- **`toFixed` sized from an uncertainty needs a ceiling.** A synthetic curve fitted by its own
  generating function drives the error to ~1e-23, and 24 decimals of floating-point noise makes a
  correct fit look broken. Past 12 decimals `fmtPM` states the error as an exponent instead.
- **The first demo is the product.** Raman example → Find peaks used to take the cosmic-ray
  spike for a peak and end in a wall of red errors; the IR example found noise bumps on a band's
  flank, and seeds three times too wide collapsed a component. Spikes (`minPts`), prominence and
  the one-sided width seed fixed the class. Run each example end to end after touching peak
  finding or seeding.
- **Hiding a grid item moves its siblings.** With the drawer folded, its splitter went
  `display:none` and auto-placement dropped the drawer into the splitter's zero-height row, under
  the status bar. Grid children that can be hidden get an explicit `grid-row`/`grid-column`.
- **A `<details>` created open fires `toggle` later**, after a re-render may already have
  replaced it, and the stale event reopened a group the user had just seen close. Toggle handlers
  check `isConnected` before recording anything.
- **A fit belongs to its column.** Drawn over another column it is a curve through data it never
  saw; `shownFit()` keeps it off the graph while Results still lists it, marked out of date.
- **v3 has no `p.x`.** "Attach to point" and a comment's anchor chip still read `P().x[i]` and
  threw on click. Look points up with `pointByRow(i)`.

## Known gaps / next steps

- Only one Y column is fitted at a time: no batch across a series, no global fit with shared
  parameters, and no summary table of a parameter against sample
- The import wizard reads one Y column; extra columns have to be added by hand afterwards
- Peak handles move centre, height and width; there is no handle for a shape parameter
  (Lorentz fraction, Pearson m), and no keyboard nudging of a selected peak on the graph
- No parameter sharing between peaks (a common instrument width), and no custom expressions
- Baseline is only ever fitted with the peaks; there is no subtract-and-bake path (ALS, anchor
  points, Shirley/Tougaard). Those belong in `STEPS` so they inherit `derived()` and undo.
- Integration is over the visible range only — no per-peak integration bands to drag, and no
  peak table from integration alone (areas currently come from the fit)
- Overlaid columns share one Y axis, so a derivative drawn behind its spectrum sits near zero;
  there are no graph layers or a second axis yet
- Binary instrument formats (SPC, OPUS, SPE) and JCAMP-DX are not read; text exports only
- True Voigt is approximated by the pseudo-Voigt shapes; there is no Faddeeva implementation
- The preview pane serves a snapshot of the file, so `location.reload()` re-runs stale code —
  navigate to the file again after editing, or you will test the previous version
