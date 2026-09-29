# Kurve: collaborative Origin-style data analysis

Single-file web app (`kurve.html`): HTML, CSS and vanilla JS, no build step, no dependencies
besides Google Fonts, and Pyodide from jsDelivr, loaded only when Python is first run. Open the
file in a browser to run it. The file uses CRLF line endings;
keep them (see the rules at the end).

## The screen

A desktop-style frame, top to bottom: a title bar with the **menus** (File, Edit, Plot, Data,
Math, Analysis, Statistics, Window, Help) and the project name (click to rename; the arrow
beside it switches, creates and deletes projects); a **toolbar** (Import, Export, undo/redo,
**Raw / Final / Compare** (what the graph shows), the pointer tools Zoom / Pan / Mask / Add
peak / Label / Comment, show-all, the analysed spectrum's plot type, the layout of several spectra,
and the Reverse X / Log Y / Grid / Residuals toggles); the **desk**; and a **status bar**
(tool hint, live cursor readout, point counts, fit state, save state).

The desk holds **windows**, as in Origin: Graph, Worksheet, History, Fit, Results, Statistics,
Python, Discussion, and the transient Tool dialog. Each moves by its title bar, resizes from
its edges, maximises on a double-click of the title and minimises to the **taskbar** along the
bottom of the desk, which also has Tile and Cascade. A first visit opens Graph, History and
Worksheet. The **graph window** has its own bar repeating the Data, Math, Analysis, Statistics
and Plot menus, a Python button, and a chip saying which stage of the processing is shown
when it is not the final data. Right-click on the graph (or Shift+F10) gives the spectrum's
colour, plot type and style, a line, text or peak label where you clicked, axes, layout and
legend; right-click a line, a label, the legend or a title for its own options. Lines, shaded
ranges, text, peak labels and the legend drag with the pointer; a double click edits them,
and edits an axis or graph title in place. The **History window** is a flow chart
of the data with an inspector beside it (below it when narrow), and a Log tab. The
**worksheet** has a **Raw** sheet (the data as recorded, locked) and a **Final** sheet (the
analysed spectrum after processing, read only). Below 860 px the windows stack in one column,
graph first, with the taskbar kept at the bottom of the screen.

## Code layout (all inside the `<script>` block of kurve.html)

- **Numerics** (`==NUMERICS:START/END==`): `solve`, `inverse`, `lmFit`, `polyfit`, `tPvalue`.
  `lmFit` is Levenberg–Marquardt with a central-difference Jacobian, covariance scaled by reduced
  chi² when unweighted (as Origin does), box bounds by projection, normal equations solved in
  units of each parameter's own curvature, and finite-difference steps sized from an optional
  `pscale`. Those last two are what let a model mixing areas of 1e6 with widths of 10 converge.
  It returns standard errors, 95% CI, t and p values, `dep` (dependency), `atBound`, AIC and BIC.
  `polyfit` fits about the mean of X and shifts back, so a wavenumber axis is not hopeless.
- **Pipeline** (`==PIPE:START/END==`, pure, after PEAKS): the processing steps. `PIPE_OPS` maps an
  op to `{group, rank, label, short, help, params (a schema the panel renders), defaults,
  init(d, ctx) (suggested settings measured from the data the step will receive), summary,
  run(d, p, ctx) -> {d, extra, note, warn}, deps?, pick?}`. A series `d` is `{x, y, e, idx,
  xn, xu, yn, yu}`: idx is the raw row of each point, and the names and units travel with it
  because some steps change them (Raman shift, unit conversion, normalize). Ops: correct,
  crop, exclude, despike, sort, dedupe, resample; bg (arPLS, ALS, airPLS, ModPoly, I-ModPoly,
  SNIP, rolling ball, anchors with spline/PCHIP/lines, line, constant; all through one banded
  `whittaker` solve or `chebFit`); smooth (Savitzky–Golay, moving average, median, Gaussian,
  Whittaker); shift (wavelength to Raman shift), xunit, calib (reference peaks, `CAL_REFS`),
  xlin; norm; scale, ref (another spectrum, interpolated), combine (mean, median or sum with
  other spectra, the spread as error bars), deriv, cumint (running integral), fft
  (zero-phase Butterworth low- or high-pass, `fftFilter`, ends mirrored), log, absorb, km,
  bose; python (stores its code and its output `{x, y, e?, xn?, xu?, yn?, yu?}`, plus the
  `inSig` (`serSig`) of the input it ran on and `ranCode`, and warns when either has changed;
  `stepPKey` keeps its output out of the cache key).
  **Every step checks its own work**: the background checks for over-subtraction (a stretch
  below −3σ) and for eating bands (`bgBandLoss`); spike removal warns about wide "spikes" and
  points changed inside a band; smoothing reports the height it takes off the narrowest band,
  measured on an ideal band of that width (`idealLoss`), and uneven spacing (so does the FFT
  filter, in both directions); `orderWarnings`
  catches steps that are fine alone but wrong in order (normalize before background, smooth
  before despike). `detectBands` (local prominence, so a noise maximum on a long flat stretch
  does not count) feeds the checks and the suggestions. `runPipe(input, steps, ctx, prev)`
  returns every stage and reuses the stages before the first changed step. `sha256` and
  `rawText` make the raw-data fingerprint. `tools/pipe-test.mjs` tests all of it.
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
  `peakSearch(X, Y, o)` is the finder behind Analysis › Find peaks. Methods `max`, `window`,
  `deriv1`, `deriv2`; `log` searches on log10 of the data; `smooth` is `"auto"` (half the
  narrowest clear band's width in points), 0 or a window; `thr` is `{mode, v}` with modes
  `snr` (prominence over `noiseSigma`, default 4), `pct` (of the largest), `abs` and `decades`
  (below the largest); every mode but `abs` also needs three times the noise. It returns
  `found` and `rejected`, each candidate with `x, prom, promLin, h, base, snr, w, wPts`, and a
  rejected one with `code` (`thr`, `noise`, `spike`, `wide`, `sep`, `max`) and `why`, in words;
  `noise` counts maxima of the noise itself. A `deriv2` shoulder is measured against the lowest
  point within its own width, having no valley of its own. `findPeaks` stays for
  `detectBands` and the older tests.
  `tools/fit-test.mjs` checks each shape integrates to its stated area and has its stated FWHM,
  that known multi-peak spectra are recovered, the spike, prominence and seeding rules, and
  `peakSearch`'s thresholds (a band three decades below the main one), reasons and methods.
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
  (`runsTest`, Wald–Wolfowitz), and warnings from the processing the data went through
  (`procWarnings`). The results drawer, the fit panel's summary line, the copied table and
  the exported report all read it, so the report can never say less than the screen.
- **Import** (between the `==PARSER:START==`/`==PARSER:END==` markers): pure, DOM-free functions
  that sniff a file — `detectFormat` (delimiter and decimal mark decided together, since `1,5;2,5`
  only parses if you treat `;` plus comma-decimal as one hypothesis), `findBlock` (the longest run
  of consistent numeric lines, so an instrument preamble and a trailing footer are found rather
  than fought), `parseMeta`, `detectRoles`, `detectPaired`, `analyzeFile`, and `checkColumns`
  which reports findings without applying them. `tools/parser-test.mjs` extracts this block
  straight out of the HTML and tests it under node; run it after touching anything here.
  Files arrive through `readFileIn` (the Import button, Ctrl+O, or a drop anywhere on the
  window) and `importText`, which refuses binary instrument files with a reason.
- **Columns and spectra**: a project is a table. `p.cols` is `[{id, role, name, unit, data, of?,
  pipe?, mask?, src?, from?}]` with roles `x` / `y` / `e` (an error column names its Y in `of`) /
  `ignore`. There may be several X columns: as in Origin, a Y column is plotted against the
  nearest X column to its left (`xColFor`), so a spectrum imported on a different axis gets its
  own X column instead of being interpolated. Every Y column is a **spectrum** with its own
  processing `pipe` (steps `{id, op, on, p, t, by}`) and its own `mask` (raw row numbers left out
  of the fit). A **derived** spectrum has no data of its own: it starts from another spectrum's
  raw input or final output (`src`, `from`), for a derivative beside the spectrum or a second
  route to compare. `p.activeY` is the one being analysed. Helpers: `xCol`, `yCols`,
  `activeYCol`, `errColFor`, `colById`, `makeCol`, `colLabel`, `colLetter` (letters count raw
  columns only), `specName`. A raw column's role, error-bar owner, visibility and deletion live
  in its header menu (`openColMenu`) and go through `setColRole`, `setErrOf`, `setActiveCol`,
  `toggleColVis`, `deleteCol`.
- **Raw data is locked**: raw arrays are replaced, never edited in place, and never changed by
  analysis. Filling an empty cell or pasting into empty cells records new raw data; typing over
  a recorded value opens `correctCell`, which asks for a reason and adds a `correct` step to the
  pipeline of every spectrum that uses the value; pasting over values offers new columns
  (`pasteAsNew`). `rawFp()` is the SHA-256 of `rawText` of every raw column with data;
  `recordRaw(text)` appends to `p.raw.hist` whenever raw data changes (import, paste, a first
  value in a cell, a column deleted), and `rawVerified()` compares the data with the last
  recorded fingerprint. The raw-data CSV export writes exactly the hashed lines under `#`
  comments, so `grep -v '^#' file.csv | sha256sum` reproduces the fingerprint.
- **Pipelines**: `pipeOf(c)` runs a spectrum's steps on its input (`rawSeries(c)`, or its
  source's input or output) and caches the result per column; raw series are cached by array
  identity and, after a save hands back a deep copy, by content (`arrKey`, memoised per array).
  `finalOf(c)` is the output; `derived()` and `pointsAll()` are the analysed spectrum's final
  data, which is what the fit, the peak finder, the status bar and the exports use.
  `pipeSig(c)` summarises every enabled step and the raw data; a fit stores it, and `fitStale`
  says so when it changes. `stepParams(op, d)` gives a new step's settings from the data it
  will receive; `insertAt` places a step by `rank` (spikes before background before smoothing
  before normalizing).
- **Pending step**: a tool dialog previews its step as `S.pending` (`{col, at, step, all}`).
  `pipeSteps(c)` puts it into the spectrum's steps for `pipeOf`, so the graph, the History and
  every check see it, but it is not in the document: `applyTool` splices it into `c.pipe`
  (and onto every spectrum if `all`), `cancelTool` drops it. `stepById`, `colOfStep`,
  `stageOfStep` and `inputOfStep` look steps up by id in any spectrum, pending included, and
  `procWarnings` and the report skip the pending one. A project switch drops it.
- **Stages**: `S.stage` is the stage the graph shows (`null` = final, 0 = raw, k = after step k,
  n = final with step n in focus); `S.selStep` is the step being edited; `S.cmp` draws the
  raw data behind the final. `plotState()` gives the series, the stage before it (drawn grey,
  when on a comparable scale) and the step whose marks to draw (`stageMarks`: background curve,
  replaced spikes, anchors, regions, calibration lines). Fits and peak drafts are drawn on the
  final data only, and opening the Fit window returns the graph there. A zoom (`S.view`) remembers
  the X units it was made in (`S.view.xu`), so a wavelength range is not applied to Raman
  shifts; the fit's view is `curView()`, the drawn one is `S.geo.v`.
- **Windows** (`WINS`, `LAYOUT`): each window is `section.win#w-<id>` with a `.win-h` title bar
  and a `.win-b` body; `LAYOUT.wins[id]` keeps `{g: [x, y, w, h] as fractions of the desk,
  open, max, z}`, saved per browser under `kurve.layout` (version 2; an older layout is
  ignored). `openWin(id, {render})`, `closeWin`, `toggleWin`, `focusWin`, `toggleMax`,
  `tileWins`, `cascadeWins`, `resetWins`, `renderWin(id)` (which window renders what),
  `renderTaskbar`, `setupWins` (move, resize, min/max buttons). `renderAll` renders only open
  windows; a window renders when it opens. `showTab("fit"|"clean")` and `showDrawer(...)`
  remain as names for opening the Fit, History, Results and Discussion windows.
- **Tools and menus**: `TOOL_GROUPS` lists every op by kind; `toolMenuItems({col, at})` is
  the menu the History's "+" and Step buttons open; `dataMenu`, `mathMenu`, `analysisMenu`,
  `statisticsMenu` and `plotMenu` build the menu bar (and the graph window's bar).
  `openTool(op, {col, at, p})` opens the Tool window with a pending step (ops without settings
  are added at once by `addPipeStep`); `renderTool` shows the target spectrum, the position,
  a before-and-after chart (`beforeAfter`) and the step's form.
- **Step forms** (`stepForm(s)`, `wireStepForms(box)`): one form per step, generated from its
  op's `params` schema (types `num`, `int`, `odd`, `log`, `sel`, `bool`, `col`, `cols`,
  `anchors`, `refs`, `code`), the same in the Tool window and the History inspector. Sliders
  preview live (`setParam(s, k, v, false)` + `schedulePreview` → `refreshLive`) and commit on
  change, with one undo entry per control per burst (`beginStepEdit`); a pending step is never
  saved. Anchor and range picking are pointer modes (`S.mode` `anchor` / `range`, `S.pick`).
- **History** (`renderFlow`, `flowLayout`): lanes of boxes, one per spectrum, placed depth
  first so a derived spectrum branches off its source's raw or final box; a "Recorded data"
  box above the raw spectra; step boxes in order (dashed while pending); the final box; a fit
  box when the spectrum has fits. Steps that read another spectrum (`deps`) get a dashed line
  from it. `S.flowSel` is the selected box (`table`, `raw:`, `src:`, `step:`, `final:`,
  `fit:` + id); selecting drives the graph's stage. Boxes drag to reorder, the "+" on a line
  inserts a step there, arrows move between boxes, Alt+↑/↓ moves a step, Delete deletes it,
  right-click opens its menu. `flowInspector(node)` shows a step's form and actions, the
  raw record and fingerprint, the final data's numbers and new-spectrum actions, or the list
  of fits. `S.flowInsp` hides the inspector; `S.flowTab` is `flow` or `log`.
- **Python** (`pyWorkerMain`, `pyStart`, `pyRun`, `renderPy`, `pyRunUI`): Pyodide
  (`PY_VER`, from `cdn.jsdelivr.net/npm/pyodide@…`, packages from the Pyodide CDN) in a module
  Web Worker made from a Blob, or on the page if workers are refused; it loads on first use and
  Stop terminates it. The code gets `x, y, e`, the names and units, `meta` and `spectra`
  (`PY_PRELUDE`, numpy arrays when numpy loads) and returns x and y (`PY_EPILOGUE`, lengths
  checked). Run makes a pending `python` step; "Record as a step" is `applyTool`. In the
  History a Python step's code is editable and "Run again" is `rerunPythonStep`.
- **Statistics window** (`renderStats`): descriptive statistics of every spectrum (final or
  raw, all X or the visible range: points, min, max, mean, SD, median, noise σ, S/N, area,
  centroid), the visible-range integral (`measureHtml`), and Pearson r between spectra on the
  analysed one's X; Copy gives it as TSV.
- **Peak fit panel** (`renderPeakFit`): three numbered parts: 1 Find peaks (`pfPanelHtml`,
  the finder's settings in `S.pf`, a live preview on the graph from `pfRun`, the peaks it would
  find in a table and the ones it turned down with their reasons, each with an Add button;
  `runPeakFinder(append)` seeds the draft from them, measuring a peak on a larger one's tail
  from its own valleys), 2 Peaks and baseline, 3 Fit. `pfBaseline` subtracts the draft's
  baseline before searching without changing it.
- **Peak draft**: the peak set being built is `S.pdraft` (`{base, peaks, init, fixed, x0,
  fitAt}`), outside the document. `draftOverlay()` draws it on the graph before it is fitted:
  dashed curves per peak plus their sum, a numbered dot per peak (drag: centre and height) and,
  for the selected peak, side handles (drag: FWHM). `applyHandle` keeps area/width consistent
  and respects fixed parameters. `fitAt` equals the fit's `at` while the draft is exactly that
  fit, which is how the overlay knows not to draw a duplicate; every edit to the draft clears
  it. `recenterBase` re-expresses the baseline coefficients when the view (and so `x0`) moves.
  `setPeakShape` changes a shape keeping centre, width and height.
- **Undo**: `pushUndo(label)` before any mutation, `undo`/`redo`, snapshots of `UNDO_KEYS`
  (`cols` carries the pipelines and masks, `raw` the fingerprint record, `fits` the fit history)
  plus both drafts (`S.pdraft`, `S.draft`). It is per-session and local on purpose — rewinding your
  own edits, not other people's. Destructive actions confirm themselves with a toast that
  carries an Undo button (`toast(msg,{action,run})`).
- **Storage**: `LocalStore` (localStorage, single user) and `makeDbStore(db)` (claude.ai artifact
  runtime, shared realtime). Both expose the same interface: `watchProjects`, `create`, `save`,
  `remove`, `watchComments`, `addComment`, `updateComment`, `deleteComment`. To add a real
  backend (Firebase, Supabase, a custom server with WebSockets), implement this interface.
  With LocalStore and no projects at all, `onProjects` creates an empty one, so a first visit
  has a worksheet to paste into.
- **State**: global `S`; the current project is `S.proj` with `cols` (see Columns above),
  `activeY`, `raw` (`{fp, hist}`), `meta` (captured from the imported file's header), `plot`
  settings (`style`, `logY`, `grid`, `resid`, `revX`, `hidden`, and from the Plot details
  `logX`, `gridMinor`, `layout`, `offset`, `legend`, `legendPos`, `legendText`, `legendTitle`,
  `legendFrame`, `frame`, `font`, `title`, `cmap`, `scheme`, `peakScheme`, `peakLab`,
  `peakLabRot`, `peakLabDec`, `axisMatch`, `annos`, `series[id]` and `ax.x|y|y2`, see
  Rendering), `fit`, `fits` (the fit history:
  numbers, the processing, and a decimated thumbnail of each fit), `log`, optional
  `prefFit`/`prefModel` (what an example opens with), and `v` (document version 4; `migrate()`
  upgrades v1–v3 in place, turning v3's table-wide `steps` into steps on every spectrum and
  computed columns into derived spectra, and `normalize()` saves the upgrade at once). Panel
  state is `S.mode` (pointer tool), `S.fitMode` (`curve`/`peaks`), `S.sheet` (`raw`/`final`),
  the stage and pending state above, `S.flowSel`/`S.flowTab`, `S.py` (the Python window),
  `S.pf` (the peak finder's settings, saved per browser under `kurve.pf`), `S.pfPreview`,
  `S.plotPreview` (the Plot details' working copy), `S.stOpt`, `S.annoSel` (the selected
  annotation; Delete removes it). Window positions are `LAYOUT`.
- **Rendering**: `buildPlot(W,H,palette,forExport)` returns an SVG string used both on screen and
  for export; on screen it also records `S.geo` (transforms, handle positions, `logX`, `heat`).
  It reads the plot settings through `plotCfg()`, which is the Plot details' working copy
  while that dialog is open. Each spectrum has a style from `serStyle(id, active, …)`: `type`
  (`PLOT_TYPES`: line, scatter, linesym, stick, area, step), `color`, `lw`, `dash`, `sym`
  (`SYMS`, filled and open), `ss`, `fill`, `op`, `label`; the fit curve's is `series.__fit`.
  `seriesSvg` draws one spectrum as a handful of paths whatever its length. `axisTicks` honours
  each axis's `min`, `max`, `step`, `minor`, `ticks` (in/out/both/none), `fmt` (auto, decimal,
  scientific) and `title`; `frame` is a box or L-shaped axes. `layout` (`LAYOUTS`): overlay,
  offset (a waterfall, each trace labelled), stack (a panel per spectrum, shared X, the
  analysed one on top), dy (the others on a right axis), heat (one row per spectrum, drawn as
  one image from `heatImage`, with a colour bar; `CMAPS`). The legend goes in the emptiest
  corner, a chosen one, outside on the right, where it was dragged (`legend:"custom"`,
  `legendPos` as fractions of the plot area), or nowhere; it can have a title, no frame, and
  its text in each spectrum's colour (`legendText:"match"`); a series with `leg:false` is left
  out of it. **Colour schemes**: `SCHEMES` (Kurve's, distinct hues from a validated
  categorical palette, Okabe–Ito, viridis in table order, black and greys with dashes) and
  `PEAK_SCHEMES`; `yTint(id)` and `peakColor(k)` read them, so the graph, the legend, the
  worksheet header, the fit panel and the results table change together. Every scheme but
  Kurve's colours by table order, so a colour stays with its spectrum. On two Y axes with one
  other spectrum each axis's numbers and title take its spectrum's colour (`axisMatch`).
  **Annotations** (`p.plot.annos`, each `{id, t, x, y, x2, text, color, lw, dash, size, unit,
  rot, bold, ser, dx, dy, xu, yu}`, `t` one of `v`, `h`, `band`, `text`, `label`) are drawn by
  `annoSvg(layer)` in three layers (ranges under the data, lines over it, text and labels on
  top, under the legend) and only on data in the units they were placed in (`xu`, `yu`).
  `text` null shows the value, `""` shows nothing. A `label` points at a spectrum point
  (`ser`, in that spectrum's colour unless `color` is set) with its text offset by `dx, dy`
  pixels and a leader line. `addAnno`, `updateAnno`, `deleteAnno`, `editAnno` (a form),
  `annoMenuItems`, `peakNear` (the top of the peak under a click), `addPeakLabel`,
  `labelFoundPeaks`, `shadeRange` (a range pick), `addLineDlg`, `clearAnnos`. Fitted peaks
  are labelled by `numLabel` with their number, position, both or nothing (`peakLab`), in
  their own colour. Axis and graph titles carry `data-axtitle` and are edited by
  `editAxisTitle`/`setAxisTitle`. The peak finder's preview marks
  (`S.pfPreview`) are drawn on screen only. Right-click: `openGraphMenu` → `graphMenuItems`
  (swatch rows are `{swatches, current, pick}` menu items); `openPlotDetails(id, tab)` is the
  dialog (`#plotModal`, tabs Line and symbols / Axes / Graph / Labels and lines, the last
  listing every annotation to edit or delete; OK saves one undo entry).
  `renderTop`, `renderWs`, `renderPlot` (+ `renderStatusBar`), `renderStages` (now the graph
  window's stage chip and the toolbar's Raw/Final/Compare), `renderFit` (it also refreshes
  `renderResults`, `renderTabMarks` and the status bar), `renderFlow`, `renderTool`,
  `renderStats`, `renderPy`, `renderThread`, `renderLog`, `renderAll`. Dense data (over 1500
  points) is drawn as one path of dots, and error bars as one path.
- **Menus and dialogs**: `openMenu(trigger, items, opt)` renders any menu (menu bar, project
  list, Export, column header, graph) from `{label, run, kbd, checked, radio, enabled, danger}` items,
  `"-"` separators and `{group}` headings, with arrow-key, type-ahead and Escape handling;
  `menuItems(name)` defines the menu bar and the graph window's bar. `openModal`/`closeModal` make everything behind a
  dialog inert, trap Tab, route Escape to the dialog's `_cancel`, and return focus; the import
  wizard, `confirmDlg` and the help (`openHelp`) all use them.
- **Export**: `saveFile(name,data,mime)` uses the claude.ai `downloads` runtime when present and
  falls back to `Blob` + `<a download>` otherwise, so exports work from disk. `exportSvg` and
  `exportPng` (the same SVG rasterised at 2.5×), `exportCsv` (every column with units, the mask
  flag, the fit, residual, baseline and each peak curve, plus commented blocks for metadata,
  the fingerprint, the processing steps with their warnings, and fit statistics),
  `exportRawCsv` (the raw data under a comment header that says how to check its
  fingerprint), `exportRecipe` (the steps as JSON), and `exportReport`, a self-contained HTML
  document with or without a fit (figure, notes from `fitWarnings`, peak table, full parameter
  table with t, p, CI and dependency, statistics, the raw-data record, every processing step
  with its warnings and a filmstrip, the fit history, method, session log). `resultsText` is
  the same as TSV for `copyResults`.
- **Boot**: `boot()` asks `window.claude.use(...)` for `db`, `user`, `room`, `downloads`. Outside
  claude.ai these are absent, so the app falls back to `LocalStore` and hides presence.

## Running outside claude.ai

Works fully as a single-user app, exports included. Only collaboration (shared projects,
presence, names) depends on the claude.ai runtime and would need a real backend behind the
`LocalStore` / `makeDbStore` interface.

## Checking a change

`node tools/fit-test.mjs`, `node tools/pipe-test.mjs` and `node tools/parser-test.mjs` cover the
numerics, the processing steps with their checks and the fingerprint, and the parser. The first
two take an optional path to test a working copy instead of `kurve.html`.
The UI has no test file: drive it in a real browser (Playwright with Chromium works headless),
click every control you touched, and watch for page errors. Screenshots at 1440, 1024 and
390 px wide, in both themes, catch most layout mistakes. Windows overlap: bring the one you
are about to click to the front (`focusWin`) or the click lands on whatever lies over it.
Python needs the Pyodide files: a Playwright route does not reach requests made inside a
worker, so serve the app and a local copy of the `pyodide` npm package over HTTP and point
`PY_INDEX` at it.

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

- **A save hands back a fresh copy of the project.** In this browser the store notifies
  synchronously and `onProjects` replaces `S.proj` with a deep copy, so a step or column object
  held from before `save()` is stale afterwards: a toast that counted a new step's warnings
  through the old object always said there were none. Look things up again by id after saving.
- **Noise on a band's top is not distortion.** Measuring what smoothing took off a band by
  comparing noisy tops counted the noise it removed as damage, and flagged every window.
  Distortion is measured on an ideal band of the same width in points (`idealLoss`). A band
  four points wide is barely sampled: even a 5-point Savitzky–Golay takes 5% off it, and the
  suggestion falls back to higher orders (6 over 9 points keeps 97.7%).
- **arPLS bridges under bands even when soft**, because it weights their points to nothing.
  The band-eating check is for methods that do follow bands (a symmetric ALS, a small rolling
  ball or SNIP window); test it with one of those.
- **Thousands of SVG elements make every layout read slow.** 20 000 circles made each forced
  layout cost about 200 ms, and the Clean up panel reads one. Dense data is one path of dots.
- **A slider has no undo of its own.** Ctrl+Z was swallowed while focus sat on a range input;
  the app's undo now applies unless focus is in a text field.
- **A zoom belongs to the units it was made in.** A wavelength range applied to Raman shifts
  shows nothing; `S.view.xu` records the units and the view is ignored where they differ.
- **A threshold as a percentage of the largest peak cannot see a small peak.** The finder's 5%
  floor hid a band three decades below the main one, however clear of the noise it stood. The
  default is now signal to noise, with percent, absolute height, decades and a log-scale
  search as choices, and every candidate turned down says why.
- **A shoulder has no valley.** Measured against the higher of its two saddles, a
  second-derivative candidate on a band's top had a prominence of zero and was thrown out as a
  one-point spike. Shoulders are measured within their own width.
- **Windows climb.** Every focus raises a window's z-index, and with the desk not a stacking
  context of its own they rose above the menus and dialogs. `.desk` has `isolation:isolate`.
- **`scrollIntoView` scrolls clipped ancestors too.** Bringing a section into view scrolled the
  whole desk, which has no scroll bar, and moved every window. The desk, the windows and their
  bodies are `overflow:clip`; scroll the inner container by hand.
- **Two ids in two places are one id too many.** The Plot details heading and its Title field
  were both `#pdTitle`, and the field could not be reached.
- **This Pyodide release does not run in a classic worker.** It says "Classic web workers are
  not supported": the worker is a module worker that imports `pyodide.mjs`.
- **A slider's readout is its own.** A text field in the same form row wrote its value into the
  row's first `<output>`; only range inputs update an output.
- **A click that redraws the graph swallows the double click.** The graph redraws on the first
  click (to select a point or an annotation), the element pressed is gone, and the browser
  then fires neither the second click nor `dblclick`: "double-click to see all the data" had
  quietly stopped working. With the pointer captured, `click` and `dblclick` are addressed to
  the graph, not what was pressed. `pointerup` detects double clicks itself (`S.gClick`,
  `S.annoClick`, `S.legClick`), `downEl` remembers what was pressed, and `onGraphDouble`
  does what the old handler did; the `dblclick` listener stays as a fallback, guarded by
  `S.noDbl` so nothing happens twice.
- **A test that awaits a dialog waits forever.** `page.evaluate(()=>editLegendTitle())`
  returns the dialog's promise, which resolves only when the dialog closes; call it without
  returning it. And a toast can lie over the thing a test clicks: hide it first.
- **Old keys come back from storage.** An upgrade that only wrote the new keys left `x` and `y`
  of a v1 project in storage, and the next reload brought them back. `migrate` deletes legacy
  keys every time, and the upgrade writes them as null.

## Known gaps / next steps

- Next in the plan: an automatic Overview of a new spectrum, user-defined fit functions, Voigt
  and Fano shapes, shared parameters, batch processing with summary tables, and per-peak
  integration windows in the peak finder
- Only one Y column is fitted at a time: no batch across a series, no global fit with shared
  parameters, and no summary table of a parameter against sample (a step can already be
  applied to every spectrum)
- The import wizard reads one Y column; extra columns have to be added by hand afterwards, or
  imported one file at a time with "Add" (each keeps its own X column when its axis differs)
- Peak handles move centre, height and width; there is no handle for a shape parameter
  (Lorentz fraction, Pearson m), and no keyboard nudging of a selected peak on the graph
- No parameter sharing between peaks (a common instrument width), and no custom expressions
- No Shirley or Tougaard background (XPS); no Fourier self-deconvolution
- Python steps store their output and must be run again by hand when their input changes (they
  say so); every other step stores only its settings. numpy loads from the Pyodide CDN, which a
  strict content policy may block: the code then gets plain lists
- The History lays lanes out in a grid; with many spectra it scrolls rather than packs, and
  there is no zoom on the flow chart
- Integration is over the visible range only — no per-peak integration bands to drag, and no
  peak table from integration alone (areas currently come from the fit)
- Double Y puts every other spectrum on one right axis; there are no free graph layers, insets
  or per-panel settings in the stacked layout
- Annotations have no arrows, boxes or rich text (sub- and superscripts only as Unicode), and
  are not snapped to data or to each other
- Binary instrument formats (SPC, OPUS, SPE) and JCAMP-DX are not read; text exports only
- True Voigt is approximated by the pseudo-Voigt shapes; there is no Faddeeva implementation
- The preview pane serves a snapshot of the file, so `location.reload()` re-runs stale code —
  navigate to the file again after editing, or you will test the previous version
