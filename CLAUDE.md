# Kurve: collaborative Origin-style data analysis

Single-file web app (`kurve.html`): HTML, CSS and vanilla JS, no build step, no dependencies
besides Google Fonts, and Pyodide from jsDelivr, loaded only when Python is first run. Open the
file in a browser to run it. The file uses CRLF line endings;
keep them (see the rules at the end).

## The screen

A desktop-style frame, top to bottom: a title bar with the **menus** (File, Edit, Plot, Data,
Math, Analysis, Statistics, Window, Help; each short, its kinds opening side submenus on
hover, and a tool opening its dialog) and the project name (click to rename; the arrow
beside it switches, creates and deletes projects); a **toolbar** (Import, Export, undo/redo,
**Raw / Final / Compare** (what the graph shows), the pointer tools Zoom / Pan / Mask / Add
peak / Label / Comment, show-all, the analysed spectrum's plot type, the layout of several spectra,
and the Reverse X / Log Y / Grid / Residuals toggles); the **desk**; and a **status bar**
(tool hint, live cursor readout, point counts, fit state, save state).

The desk holds **windows**, as in Origin: Graph, Worksheet, History, Overview, Peaks,
Integrate, Fit, Results, Statistics, Python, Discussion, Help, and the transient Tool dialog. Each moves by its title bar, resizes from
its edges, maximises on a double-click of the title and minimises to the **taskbar** along the
bottom of the desk, which also has Tile and Cascade. Every title bar has a **?** that opens
the window's article in the **Help window** (F1 does it for the window in front; a tool's
opens its step's article). A first visit opens Graph, History and Worksheet. The **graph window** has its own bar repeating the Data, Math, Analysis, Statistics
and Plot menus, a Python button, and a chip saying which stage of the processing is shown
when it is not the final data. Right-click on the graph (or Shift+F10) gives the spectrum's
colour, plot type and style, a line, text or peak label where you clicked, axes, layout and
legend; right-click a line, a label, the legend or a title for its own options. Lines, shaded
ranges, text, peak labels and the legend drag with the pointer; a double click (or Enter)
on a label or a text opens a box over it to type in, a double click on a line or a range
opens its settings, and one on an axis or graph title edits it in place. The **Peaks
window** (Analysis › Find peaks…) finds the peaks of the analysed spectrum and marks them on
the graph, each with a symbol, a drop line, a vertical line, a leader or nothing, and a label
you type (in its table, on the graph, or in the History); fitting them is one button, not
the way in. The **Integrate window** (Analysis › Integrate bands…) measures bands without a
fit: windows dragged on the graph, each with a local baseline, giving areas with errors,
heights, positions, FWHM, shares of the total and ratios to a chosen band, for one spectrum
or every one. The **Help window** is the documentation: a contents list by kind, a search over every
article, and an article per feature and per processing step, beside the work it explains.
Windows carry little text of their own: a setting's explanation is its tooltip and its
article. The **Overview** opens after an import and says what a new spectrum is like
(spacing, noise, bands, spikes, background) and what to do first. The **History window** is a flow chart
of the data with an inspector beside it (below it when narrow), and a Log tab. Every box in
it (a step, the raw data, the final data, the peaks, the fits, the recorded data, the
figure) has its own
**discussion** at the foot of its inspector, with a badge on the box counting open threads;
the Discussion window lists every thread with a link back. The
**worksheet** is a spreadsheet grid as in Excel, with Origin's label rows: a **Raw** sheet (the
data as recorded, locked) and a **Final** sheet (the analysed spectrum after processing, read
only). Below 860 px the windows stack in one column,
graph first, with the taskbar kept at the bottom of the screen.

## Code layout (all inside the `<script>` block of kurve.html)

- **Numerics** (`==NUMERICS:START/END==`): `solve`, `inverse`, `lmFit`, `polyfit`, `tPvalue`.
  `lmFit` is Levenberg–Marquardt with a central-difference Jacobian, covariance scaled by reduced
  chi² when unweighted (as Origin does), box bounds by projection, normal equations solved in
  units of each parameter's own curvature, and finite-difference steps sized from an optional
  `pscale`. Those last two are what let a model mixing areas of 1e6 with widths of 10 converge.
  It returns standard errors, 95% CI, t and p values, `dep` (dependency), `atBound`, AIC and BIC.
  `polyfit` fits about the mean of X and shifts back, so a wavenumber axis is not hopeless.
  `compileExpr(src)` compiles a user's formula into a tree of closures, never run as JavaScript
  (so it works under a strict content policy, and nothing but arithmetic can run): numbers, `x`,
  names, `+ - * / ^` (or `**`), parentheses, `EXPR_FN` (exp, ln, log = ln, log10, sqrt, abs,
  trig and hyperbolic, erf, erfc, pow, min, max, sign, step) and `EXPR_CONST` (pi, e). Lines
  like `u = (x - xc)/w` name values for the lines below; the function is `y = …` or the last
  line; every other name is a parameter, in order of appearance. Errors are thrown with a
  message in words and `line`/`col`. Lookups use `hasOwnProperty`, so `constructor(x)` is an
  unknown function, not `Object`. `compileExpr(src, {allowNone:true})` accepts a formula with
  no parameters (a worksheet column's). `guessUserParams(names, X, Y)` starts parameters from their
  names (y0/c baseline, A/H height, xc/x0 position of the largest point, w/sigma a tenth of the
  range, t/tau a third, k a rate, m a slope, anything else 1). `erfFn`/`erfcFn` are accurate
  to double precision (a series below 2.5, a continued fraction above).
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
  **Integrating a band** (`integrateBand(X, Y, E, x1, x2, {base, avg, sigma})`, pure, beside
  `trapz`): the points in the window (either way round, on an axis running either way) less a
  local baseline (`line` through the means of the first and last `avg` points, `zero`, or
  `min`, level at the lowest point); the area is the trapezoidal sum, its `err` the noise
  (`sigma`, or each point's error bar in `E`) carried through the trapezoid weights and the
  baseline's ends; `height`/`pos` from a parabola through the top three points (the lowest,
  for a dip, whose area is negative), `fwhm` where it crosses half height inside the window or
  null, `centroid`, `snr`, and the points and baseline for drawing. Fewer than three points
  gives `fail`, in words, never a number. `bandsFromPeaks(X, Y, [{x, w}])` puts a window around
  each peak: neighbours split at the lowest point between them, outer edges two widths out.
  `tools/fit-test.mjs` checks both (area over a sloping background, height, position, FWHM,
  centroid, a descending axis, a dip, the error against 400 noisy repeats, error bars, the
  split at the valley).
- **Peaks** (`==PEAKS:START/END==`): `PEAKS` (Gaussian, Lorentzian, pseudo-Voigt, split-width
  pseudo-Voigt, Pearson VII, Voigt, Fano — parametrised centre/**area**/width, with `height()`
  and `fwhm()`; optional `short` (the name mid-sentence), `labels` (per-shape parameter labels),
  `wSeed` (each width's share of a measured FWHM, `wSeedOf`), `top` (where an asymmetric
  shape's maximum is), `bounds`, `init`). **Voigt** is `[xc, A, wG, wL]`, the true
  convolution through `faddeeva(x, y)` (Weideman's 32-term rational expansion, about 1e-13,
  smooth for finite differences); its FWHM is found by bisection, with `fwhmApprox` (Olivero)
  for error propagation, and `convolved` exempts its widths from the "collapsed" check because
  either may rightly go to zero. **Fano** (Breit–Wigner–Fano) is `[xc, A, w, iq]` with iq =
  1/q in [-0.9, 0.9]; its area is not finite, so A is the area of its Lorentzian limit
  (`fitWarnings` says so), `height` is the true maximum at `top`, and `fwhm` the true width,
  Γ(1+iq²)/|1-iq²|. **Ties** (`peakLinks(peaks, m)`, `applyPeakLinks`, `linkResult`): a peak's
  `tie[nm] = {to: peakId, mul, add}` makes that parameter `mul·(the other's) + add`; ties to a
  peak that is itself tied are not followed, so they never chain or loop. `BASELINES`
  (none/constant/line/quadratic/cubic, evaluated in `x - x0`),
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
  `peakSearch`'s thresholds (a band three decades below the main one), reasons and methods,
  the Faddeeva function against known values, Voigt and Fano (area, height, true FWHM, limits,
  recovery by a fit), ties (a doublet with a 0.5 area ratio, one width and a fixed spacing:
  recovered, the degrees of freedom and the carried errors), and the formula compiler (order,
  precedence, named values, every error message, nothing but arithmetic). Run it after
  touching any of this.
- **Fits** come in two kinds. `MODELS` (each with `params`, `ph`, `formula`, `f(x,p)`,
  `guess`, optional `derived` with delta-method errors) drives "Curve fit".
  `{kind:"composite", spec, x0, …}` drives "Peak fit". `fitModel(fit)` hands either to
  the plot, the CSV export and the report; `activeFit()` returns the current one if it is valid,
  and `shownFit()` is the one the graph draws (only on the column it was fitted to). Anything
  that reads `p.fit` must go through those, not `MODELS[p.fit.model]`; a model by id is
  `getModel(id)` (one of `MODELS`, or `"u:<fnId>"` for a user's function). Stored fits carry
  `dep`, `tval`, `pval` and `ci` with non-finite values written as `null`.
  **User functions**: `p.userFns` (`[{id, name, expr, params:[{n, init, lo, hi, dim}]}]`, in
  `UNDO_KEYS`) and a per-browser library (`libFns`, `libSave`, under `kurve.fns`). `userModel(fn)`
  compiles one into a MODELS-like object (`user`, `def`, `expr`, `lo`/`hi` bounds, `guess` from
  the stored starts or `guessUserParams`), cached. A fit with one stores a copy in `fit.fn`, and
  `fitModel` uses that copy, so editing or deleting the function never changes a result; a
  library function used in a fit is added to the project. `draftModel(d)` is the curve
  panel's model (falling back to the fit's copy, then to a Gaussian). `editUserFn(id, {from})`
  is the editor (formula, live check with the line of a mistake, a preview of the function at
  its starts over the data, start/limits/unit per parameter), `deleteUserFn`, `adoptLibFn`.
  The report's Method and the CSV state the formula and its limits.
  A parameter that stopped at a limit (`atBound`) has no meaningful standard error: tables
  show "at its limit" instead of ±, and derived peak quantities (height, FWHM) leave it out of
  the delta method. A tied parameter shows its value with the carried error and what it follows.
- **Caveats** have one source: `fitWarnings(fit)` returns `{level, kind, text}` for staleness
  (`fitStale`), non-convergence, unusable components (`peakProblems`), a singular covariance,
  dependency, parameters at a bound, and residuals that run in long same-sign stretches
  (`runsTest`, Wald–Wolfowitz), and warnings from the processing the data went through
  (`procWarnings`), plus advice on a Voigt whose Gaussian or Lorentzian width went to zero and
  the meaning of a Fano's area. The results drawer, the fit panel's summary line, the copied table and
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
- **Worksheet** (`renderWs`, `setupWs`): a spreadsheet grid as in Excel, with Origin's label
  rows. Columns have fixed widths (`WS_W`, 100 px; `p.wsw[colId]` when dragged or autofitted by
  a double click on the header's edge, `wsSetWidth`, `wsAutofit`), never stretched to the
  window: empty "phantom" columns and rows fill the rest, and typing into one makes a column.
  Under the letters come Long Name, Units, Comments and F(x)= (rows -4 … -1, `WS_LABS`,
  `WS_TOP`, typed into like any cell) and a Sparklines row.
  **Formulas** (the F(x)= row, or "Set column values…" in the column and cell menus): a
  column computed row by row from others, `c.fx = {src, refs}`: the formula as typed and the
  column id each letter meant, so inserting or deleting a column never makes it read the
  wrong one (`fxShow` writes it with today's letters). Letters are columns, `x` the row's X,
  `i` the row number; `col(B)` and a leading `=` are accepted; the arithmetic is
  `compileExpr`'s, so nothing else can run. `fxParse` (with errors in words: an unknown name,
  a cell reference like `B2`, a column using itself), `fxEval`, `recalcFx(p)` (every formula
  column after the ones it uses; a circle or a deleted input is an error in `FX_ERR`, shown in
  the header and the F(x)= cell), `setColFormula`, `wsFxHint` (the live check while typing).
  Values live in `c.data` and are computed again by `save` (whenever `cols` is saved) and
  `normalize`. A computed column is not raw data: `rawCols` and the fingerprint leave it out,
  and it cannot be typed, pasted or filled over. **Fill** (`wsFillPlan`, `wsFill`,
  `wsFillDrag`, `wsFillDbl`, `wsFillCtrl`): the square on the selection's corner (`td.fh`)
  drags down or right; two or more numbers continue their least-squares line, one number or
  text is copied, Ctrl swaps the two; a double click fills down as far as the column beside
  goes; Ctrl+D and Ctrl+R copy the first row or column. Only empty cells are written (new
  recorded values, one undo entry); labels fill right. **Sort** (`S.wsSort`, `wsOrder`,
  `wsSortBy`) is the view only: `m.ord`/`m.inv` map sheet rows to data rows (`wsDR`), row
  numbers show the data row, and the data keep their recorded order; paste and fill ask to
  unsort first. **Find** (Ctrl+F, the search button; `wsFindOpen`, `wsFindRun`, `wsFindGo`,
  `S.wsFind`): every cell containing the text, labels included, marked `td.hit`; Enter,
  Shift+Enter and F3 step through them. `wsModel()` is the sheet (`S.wsm`: columns, row count, phantoms);
  rows are virtualised (`wsRows`, drawn around the scroll position). `S.ws` is the selection
  (`{r, c, ar, ac}`: the active cell and the anchor of a range, plus `extra`, `win`, `edit`).
  Click, Shift+click, drag, a header or row number, the corner; arrows, Shift+arrows,
  Ctrl+arrows, Home/End, Ctrl+Home/End, PageUp/Down, Tab and Enter move as in Excel; typing
  starts an edit, F2 or a double click edits in place, Esc cancels, Delete clears
  (`wsBeginEdit`, `wsCommit`, `wsSetCell`: a label, an empty cell, or `correctCell` for a
  recorded value). Copy and paste are TSV (`wsCopyText`, `wsPasteText`, the label rows
  included). The bar above shows the cell's address and value (`#wsAddr`, `#wsVal`), the foot
  Count, Sum, Average, Min and Max of the selection (`wsStats`). Right-click is `wsCellMenu`
  (anchored by `pointerAnchor(x, y)`). `wsLetter(i)` names columns A…Z, AA….
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
  `renderTaskbar`, `setupWins` (move, resize, min/max buttons, and the "?" `[data-whelp]`
  that opens `helpFor(id)`). `renderAll` renders only open
  windows; a window renders when it opens. `showTab("fit"|"clean")` and `showDrawer(...)`
  remain as names for opening the Fit, History, Results and Discussion windows.
- **Tools and menus**: `TOOL_GROUPS` lists every op by kind; `toolMenuItems({col, at})` is
  the menu the History's "+" and Step buttons open, one submenu per group (a group of one
  tool stays a plain item); `dataMenu`, `mathMenu`, `analysisMenu`,
  `statisticsMenu` and `plotMenu` build the menu bar (and the graph window's bar), each a short
  list of kinds with the tools in submenus.
  `openTool(op, {col, at, p})` opens the Tool window with a pending step (ops without settings
  are added at once by `addPipeStep`); `renderTool` shows the target spectrum, the position,
  a before-and-after chart (`beforeAfter`) and the step's form.
- **Step forms** (`stepForm(s)`, `wireStepForms(box)`): one form per step, generated from its
  op's `params` schema (types `num`, `int`, `odd`, `log`, `sel`, `bool`, `col`, `cols`,
  `anchors`, `refs`, `code`), the same in the Tool window and the History inspector. Sliders
  preview live (`setParam(s, k, v, false)` + `schedulePreview` → `refreshLive`) and commit on
  change, with one undo entry per control per burst (`beginStepEdit`); a pending step is never
  saved. Anchor and range picking are pointer modes (`S.mode` `anchor` / `range`, `S.pick`).
  The op's `help` is not printed in the form: it is the step's help article's lead and the
  menu item's tooltip. A setting's `hint` is its label's tooltip (`.tipd`, a dotted
  underline). In the History the form ends with "About this step" (`data-act="help"`); the
  Tool window has its title bar's "?" instead, so it calls `stepForm(s, {tool:true})`.
- **History** (`renderFlow`, `flowLayout`): lanes of boxes, one per spectrum, placed depth
  first so a derived spectrum branches off its source's raw or final box; a "Recorded data"
  box above the raw spectra; step boxes in order (dashed while pending); the final box; a
  Peaks box when the spectrum has a peak set (its labels typed in the inspector, what it was
  found with, a warning when the processing changed since); a Bands box when bands are drawn on
  its axis (`integ:` + id: the areas, shares and ratios); a fit box when the spectrum has
  fits; and a Figure box below everything when the graph has lines, ranges, text or labels
  of its own (each listed with Edit and Delete, and the recent changes to the figure from the
  log). Steps that read another spectrum (`deps`) get a dashed line
  from it. `S.flowSel` is the selected box (`table`, `figure`, or `raw:`, `src:`, `step:`,
  `final:`, `peaks:`, `fit:` + id); selecting drives the graph's stage. Boxes drag to reorder, the "+" on a line
  inserts a step there, arrows move between boxes, Alt+↑/↓ moves a step, Delete deletes it,
  right-click opens its menu. `flowInspector(node)` shows a step's form and actions, the
  raw record and fingerprint, the final data's numbers and new-spectrum actions, or the list
  of fits, and under each its discussion (`flowDiscHtml`). A box with comments carries a badge
  (`.fn-c`, open threads, or the resolved count greyed); clicking it opens the discussion, and
  C on a box does too. A Python step that reads other spectra gets a dashed arrow from each;
  when any Python step is out of date the bar offers "Run Python again (n)". `S.flowInsp` hides
  the inspector; `S.flowTab` is `flow` or `log`.
- **Python** (`pyWorkerMain`, `pyStart`, `pyRun`, `renderPy`, `pyRunUI`): Pyodide
  (`PY_VER`, from `cdn.jsdelivr.net/npm/pyodide@…`, packages from the Pyodide CDN) in a module
  Web Worker made from a Blob, or on the page if workers are refused; it loads on first use and
  Stop terminates it. The code gets `x, y, e`, the names and units, `meta` and `spectra`
  (`PY_PRELUDE`, numpy arrays when numpy loads) and returns x and y (`PY_EPILOGUE`, lengths
  checked). The result is **a step** (`S.py.dest` `step`: Run makes a pending `python` step;
  "Record as a step" is `applyTool`) or **a new spectrum** (`new`: Run previews it in the window,
  `S.py.preview`, over its input; `pyRecordNew` makes a derived spectrum from the raw or final
  data, `newDerived(from, {src, bare, steps})`, whose first step is the code). `spectra` is a
  dict subclass that records the names taken out of it; `pyRun(code, d, {target})` leaves out
  the target and every spectrum made from it (`usesSpectrum`), so a step can never read itself,
  and returns `readIds`. A step stores `reads` and `readSigs` (`pyParams`), its op declares them
  as `deps` (dashed arrows, cache keys, `pipeSig`), and it warns when one of them changed.
  `pyStale(s)` says why a step is out of date (`notrun`, `code`, `input`, `read`),
  `rerunStalePython` runs every such step in order as one undo entry, and `rerunPythonStep`
  one. In the History a Python step's code is editable, with "Also reads" chips. The report
  prints each Python step's code.
- **Discussion** (`threadIndex`, `threadHtml`, `wireThreads`, `threadAct`, `renderThread`,
  `flowDiscHtml`, `renderFlowDisc`, `refreshComments`, `goNode`, `goAnchor`,
  `reportDiscussionHtml`): a comment is `{uid, text, anchor, t, resolved, resolvedBy, parent?,
  edited?, deleted?}`. The first comment of a thread carries the anchor: a point, a spot, the
  fit, or a History box (`{type:"node", key, col, label}`; `nodeAnchor(key)`, and `nodeLabel`
  says "(since removed)" when the step is gone, until undo brings it back). A reply names its
  thread in `parent` and a reply to a resolved thread reopens it; deleting a first comment that
  has replies leaves "This comment was deleted" (`deleted`), and every delete offers Undo.
  Only your own comments can be edited or deleted. The same thread markup and handlers serve
  the Discussion window (Open/All filter) and a box's inspector; drafts live in `S.cDrafts`
  keyed `node:<key>`, `reply:<id>` or `edit:<id>`, so a redraw never loses what is typed, and
  the caret is kept (`keepCaret`/`putCaret`). Comments live beside the project, not in it:
  undo never takes a colleague's words back. The report ends with every thread, and each step
  in its Processing list says how many threads it has.
- **Statistics window** (`renderStats`): descriptive statistics of every spectrum (final or
  raw, all X or the visible range: points, min, max, mean, SD, median, noise σ, S/N, area,
  centroid), the visible-range integral (`measureHtml`), and Pearson r between spectra on the
  analysed one's X; Copy gives it as TSV.
- **Peak fit panel** (`renderPeakFit`): three numbered parts: 1 Find peaks (`pfPanelHtml`,
  the finder's settings in `S.pf`, a live preview on the graph from `pfRun`, the peaks it would
  find in a table and the ones it turned down with their reasons, each with an Add button;
  `runPeakFinder(append)` seeds the draft from them, measuring a peak on a larger one's tail
  from its own valleys), 2 Peaks and baseline, 3 Fit. `pfBaseline` subtracts the draft's
  baseline before searching without changing it. Its "Mark and label them" hands the peaks to
  the Peaks window's set instead (`findPeaksInto`).
- **Peaks window** (`openPeakFinder`, `renderPeaks`, `wirePeaks`): finding peaks without
  fitting them. A spectrum's **peak set** is peak labels on the graph, annotations with
  `grp:"pk:<colId>"`, each with its typed label `lab`, its mark `mk`, the finder's numbers
  `pk:{h, w, snr}` and `manual` when placed by hand; `p.found[colId]` records the set
  (`{opts, sig, at, by, style, ex, mem, n, rng, xu, follow, re}`: the finder's settings, the
  processing it was found on, the style shared by the set (`PK_STYLE`: `mk`, `show`, `rot`,
  `dec`, `unit`, `color`, `size`), peaks removed by hand that a new search leaves out
  (`{x, xu, row}`), the labels of peaks a search no longer finds, given back when one finds
  them again, the range and X units it was found over, whether it follows the processing, and
  when it last did). Each peak's annotation carries its recorded `row`. `peakSearchOn(c, opts,
  rng, xu)` searches any spectrum's final data (masked points out, a straight baseline through
  the lowest fifth; never the fit's), and `mergePeakSet` makes the result the set: the same
  peak is within a quarter of its width in the same units, or on the same recorded row give or
  take three after a change of units, so labels survive a conversion to wavelength.
  `findPeaksInto` (the analysed spectrum, over the view) and `findPeaksEvery` (every spectrum,
  one undo entry) use them; every change to the finder's settings searches again at once.
  **Following**: `followPeakSets()`, first thing in `renderAll`, finds a set again with its own
  settings and range whenever its spectrum's `pipeSig` changes, with no undo entry of its own
  (undoing the step brings the old set back with it) and a log line; off per set
  (`follow:false`, "Find them again whenever the processing changes"), and then the set says
  it is out of date. `allFoundTableText` is every set in one table (Copy all).
  `peakText(style, lab)` is what a label shows (`show`: the position, your label or else the
  position, both, only yours, nothing); `{x}` in any label or line text stands for the
  position (`annoPos`). `setPeakStyle` restyles the whole set, `setPeakLabel` types one
  label, `removeFoundPeak` (also what Delete on a set's label does), `clearFoundPeaks`,
  `addToPeakSet` (the Label tool on a spectrum with a set), `peakRows`/`foundTableText` (the
  table; `said` has `{x}` written out), `fitFoundPeaks` (seeds `S.pdraft` from the set and
  opens the Fit window: fitting is optional). The window's four parts: how to find them
  (`pfFormHtml`, the finder's form under `pk-pf…` ids so the Fit window's can be open too),
  the peaks (a table with a label field each, remove, Copy, Clear, add by clicking the graph,
  the turned-down candidates with Add), how they look on the graph, and Fit these peaks.
  `pkUndo` makes one undo entry per burst of the same kind of change.
- **Integrate window** (`openIntegrate`, `renderInteg`, `wireInteg`): bands measured without
  a fit. `p.integ = {bands, ref, avg, show}`: each band a window `{id, x1, x2, xu, lab, base}`
  in the X units it was drawn in, applying to every spectrum on that axis (`bandsFor(c)`), so
  the same windows give the same bands of every sample; `ref` the band the others are divided
  by, `avg` the points averaged at each end of a line baseline, `show` whether the graph shades
  them. Nothing measured is stored: `bandCalc(c)` runs `integrateBand` on the final data
  (masked points out, the spectrum's `noiseSigma`, its error bars if any), memoised per final
  series, and adds `pct` of the total and `ratio`/`ratioErr` to the reference, so the numbers
  follow the processing. `addBand`, `updateBand`, `removeBand` (and Delete on a selected band,
  `S.bandSel`), `clearBands`, `saveInteg`; `pickBands()` turns on the range pick
  (`S.pick = {integ:true}`), which stays on for the next band until Esc; `bandsFromPeaksUI`
  puts windows around the Peaks window's set, or around peaks found now, in place of the bands
  on that axis. The table (name, edges, baseline, area ± error, height, position, FWHM, %,
  ratio, the reference radio; narrower windows drop columns by container query, and on a phone
  the edges are dragged on the graph instead) or, for several spectra, a row per spectrum
  (`integEveryRows`, `integAllText`); Copy is TSV (`integTableText`). On the graph
  `bandsSvg("under")` shades each band between the curve and its baseline and dashes the
  baseline, and `bandsSvg("top")` draws its edges (`data-bh`, drag one) and a strip along the
  top with its name (`data-bb`, drag it to move the window): `S.bdrag`, `dragBand`,
  `commitBandDrag` (one undo entry per drag). Only the analysed spectrum's, on the final data,
  overlaid or on its own axis. The Peaks window's "Integrate them" is `bandsFromPeaksUI` too.
- **Overview** (`openOverview`, `renderOverview`, `overviewOf(d)`, `overviewSteps(o, c)`):
  what a spectrum is like before anything is done to it, from the data as recorded or after
  processing (`S.ovStage`). `overviewOf` (memoised per series) measures the points (missing,
  order, repeats, gaps, evenness from `spacing`), the noise, the bands (`detectBands`, after
  `despikeY` has set spikes aside) with their widths in points, the spikes, flat tops at the
  maximum, points below zero (a warning only past five times the noise), and the background
  the Subtract background step would take with its own suggested settings, called flat,
  sloping or curved against the strongest band. `overviewSteps` turns that into first steps
  in pipeline order (sort, average repeats, remove spikes, resample, subtract the background,
  smooth only if the narrowest band spans 7 points or more), each opening its tool
  (`openTool`) with settings measured from the data, and marked done when the spectrum already
  has the step. It opens after an import (`autoOverview`, off per browser under
  `kurve.ovAuto`), from Analysis and Statistics, and from a raw box in the History.
- **Typing on the graph** (`inlineEditAnno(id, {fresh})`, `inlineNewText(pt)`, `.inled`): a
  box over a label or text, Enter keeps, Esc leaves it, a click elsewhere keeps, "More"
  opens `editAnno`. The Label tool opens it on the label it just placed; an empty spot gets a
  box for new text, and nothing is added unless something is typed. `annoDouble(id)` is the
  double click (and Enter or F2 on a selected annotation): typing for labels and text, the
  settings form for lines and ranges.
- **Peak draft**: the peak set being built is `S.pdraft` (`{base, peaks, init, fixed, x0,
  fitAt}`), outside the document. `draftOverlay()` draws it on the graph before it is fitted:
  dashed curves per peak plus their sum, a numbered dot per peak (drag: centre and height) and,
  for the selected peak, side handles (drag: FWHM). `applyHandle` keeps area/width consistent
  and respects fixed parameters. `fitAt` equals the fit's `at` while the draft is exactly that
  fit, which is how the overlay knows not to draw a duplicate; every edit to the draft clears
  it. `recenterBase` re-expresses the baseline coefficients when the view (and so `x0`) moves.
  `setPeakShape` changes a shape keeping centre, width and height. Every peak has a stable `id`
  (assigned in `pdraftModel`, which also writes tied values into `init`); ties are set from
  the chain-link button beside a parameter (`tieMenuItems`, `setTie`, `askTie` for a ratio or a
  spacing) or "One width" (`shareWidths`, `widthsShared`). `setTie` re-points peaks that
  followed the newly tied one, `removePeak` frees peaks tied to the removed one, and dragging a
  tied peak moves what it follows, so a group moves together. `runPeakFit` fits only the free
  parameters (tied ones fixed, the model applying the ties) and `linkResult` fills in the tied
  values, errors, covariances; the spec stores `id` and `tie`, and Method lists every tie.
- **Saving**: `save(patch, log)` writes at once; `saveSoon` (typing in the worksheet, column
  widths) waits 0.7 s, and any `save` before then carries the waiting patch with it, first
  (`wsPatch`, `wsPid`), as does a project switch.
- **Undo**: `pushUndo(label)` before any mutation, `undo`/`redo`, snapshots of `UNDO_KEYS`
  (`cols` carries the pipelines and masks, `raw` the fingerprint record, `fits` the fit history,
  `userFns` the project's fit functions, `found` the peak sets, `integ` the bands)
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
  `legendFrame`, `frame`, `font`, `fontFam`, `fontName`, `titleItalic`, `title`, `cmap`,
  `scheme`, `peakScheme`, `peakLab`,
  `peakLabRot`, `peakLabDec`, `axisMatch`, `annos`, `series[id]` and `ax.x|y|y2`, see
  Rendering), `fit`, `fits` (the fit history:
  numbers, the processing, and a decimated thumbnail of each fit), `userFns`, `found` (the
  peak sets, see the Peaks window), `integ` (the bands, see the Integrate window), `wsw`
  (worksheet column widths), `log`, optional
  `prefFit`/`prefModel` (what an example opens with), and `v` (document version 4; `migrate()`
  upgrades v1–v3 in place, turning v3's table-wide `steps` into steps on every spectrum and
  computed columns into derived spectra, and `normalize()` saves the upgrade at once). Panel
  state is `S.mode` (pointer tool), `S.fitMode` (`curve`/`peaks`), `S.sheet` (`raw`/`final`),
  `S.ws`/`S.wsm` (the worksheet's selection and model),
  the stage and pending state above, `S.flowSel`/`S.flowTab`, `S.py` (the Python window),
  `S.pf` (the peak finder's settings, saved per browser under `kurve.pf`), `S.pfPreview`,
  `S.pkLast` (the Peaks window's last search, for its turned-down list), `S.bandSel`,
  `S.bdrag`, `S.igEvery` (the Integrate window's selected band, band drag and every-spectrum
  view), `S.ovStage` (the Overview's raw or final data),
  `S.plotPreview` (the Plot details' working copy), `S.stOpt`, `S.annoSel` (the selected
  annotation; Delete removes it), `S.comments` with `S.cDrafts`, `S.cReply`, `S.cEdit` and
  `S.discFilter` (the Discussion window's Open/All). Window positions are `LAYOUT`.
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
  rot, bold, font, ser, dx, dy, xu, yu}`, and on labels `mk`, plus `grp`, `lab`, `pk`,
  `manual` on a peak set's, `t` one of `v`, `h`, `band`, `text`, `label`) are drawn by
  `annoSvg(layer)` in three layers (ranges under the data, lines over it, text and labels on
  top, under the legend) and only on data in the units they were placed in (`xu`, `yu`).
  `text` null shows the value, `""` shows nothing, and `{x}` in it the position. A `label`
  points at a spectrum point (`ser`, in that spectrum's colour unless `color` is set) and
  marks it (`mk`): `sym` a triangle above it, `drop` a line down to the axis, `vline` a
  dashed line through the plot with the text along it at the top, `lead` (the default, and
  what older labels are) a leader line, `none`. Its text is offset by `dx, dy` pixels from
  where the mark leaves room (`labDy`); a moved text gets a leader back to its mark. Another
  spectrum's labels are drawn only where that spectrum is drawn on these axes: overlaid, and
  not hidden.
  `addAnno`, `updateAnno`, `deleteAnno`, `editAnno` (a form, with the mark and, for a set's
  peak, its label), `annoMenuItems` (type its label, mark it with, and for a set's peak mark
  or label every peak with), `peakNear` (the top of the peak under a click), `addPeakLabel`,
  `labelFoundPeaks`, `shadeRange` (a range pick), `addLineDlg`, `clearAnnos`. Fitted peaks
  are labelled by `numLabel` with their number, position, both or nothing (`peakLab`), in
  their own colour, just inside the peak when a marked peak's label is on its top.
  **Fonts**: `FONTS` (Kurve's, serif, sans, mono and common families, or one typed by name,
  `fontStack`), `FONT_SIZES`; the graph's are `fontFam`/`fontName` and `font` (the size),
  and axis titles are italic unless `titleItalic` is false; an annotation may have its own
  `font` (Plot › Font, the graph menu, Plot details › Graph, the annotation form). Axis and graph titles carry `data-axtitle` and are edited by
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
  `"-"` separators and `{group}` headings, with arrow-key, type-ahead and Escape handling.
  An item `{label, sub}` (`sub` a list or a function returning one) opens a submenu to the
  side on hover (after 110 ms, with the same grace leaving it), on a click, or with →; ← and
  Escape close it (`buildMenu`, `openSub`, `closeSubs`, `menuOpen.subs`). A menu with a
  search box (`opt.search`) searches every submenu and lists the matches flat with their path;
  `menuItems(name)` defines the menu bar and the graph window's bar. `openModal`/`closeModal` make everything behind a
  dialog inert, trap Tab, route Escape to the dialog's `_cancel`, and return focus; the import
  wizard, `confirmDlg`, `formDlg` and Plot details use them.
- **Help** (`DOCS`, `openHelp(id, {search})`, `renderHelp`): a window (`#w-help`, not in
  `WIN_ORDER`; in the taskbar only while open), not a dialog, so it stays open beside what it
  explains. `DOCS` is the articles, each `{id, g (one of DOC_GROUPS), t, kw, lead, body, win?}`
  with HTML bodies built from small helpers (`K` keys, `DL` a definition list, `DA` a link,
  `MP` a menu path, `TIP`). Links are `<a data-doc="id">` or `"id#anchor"`; `data-doc-open`
  opens the window an article describes, `data-doc-ex` an example. A processing step's
  article is written by `stepDoc(op)` from `PIPE_OPS` (its `help` as the lead, its `params`
  with their `hint`, or `DOC_PARAM["op.k"]`, and options), plus `DOC_STEP[op]` (methods,
  checks), `DOC_MENU[op]` (where it is) and `DOC_KW[op]` (search words); `docList()` puts them
  after "Processing steps". `docBody` fills the generated parts (the step list, the curve
  models from `MODELS`, where data are stored). `docSearch(q)` needs every word somewhere
  (title 8, keywords 4, body 1), `docSnip` shows where; an article opened from a search has
  its words marked (`docMark`). `S.help` is `{id, q, back, nav}`: Back, and the contents shown
  over the article when the window is narrower than 620 px (a container query on
  `#w-help .win-b`, with a "Contents" button). `WIN_DOC` maps a window to its article,
  `helpFor(id)` adds the tool's step and the Fit window's mode, `frontWin()` is the window F1
  asks about. The old ids `h-start`, `h-keys`, `h-about` still work. A new window, tool or
  setting needs its article, `DOC_STEP` notes or `hint`: the drive checks every article
  renders and every link resolves.
- **Export**: `saveFile(name,data,mime)` uses the claude.ai `downloads` runtime when present and
  falls back to `Blob` + `<a download>` otherwise, so exports work from disk. `exportSvg` and
  `exportPng` (the same SVG rasterised at 2.5×), `exportCsv` (every column with units, the mask
  flag, the fit, residual, baseline and each peak curve, plus commented blocks for metadata,
  the fingerprint, the processing steps with their warnings, the marked peaks with their
  labels, the band integrals, and fit statistics),
  `exportRawCsv` (the raw data under a comment header that says how to check its
  fingerprint), `exportRecipe` (the steps as JSON), and `exportReport`, a self-contained HTML
  document with or without a fit (figure, notes from `fitWarnings`, fitted peak table, the
  marked peaks of every spectrum with their labels (`reportPeaksHtml`), every spectrum's band
  integrals with how they were measured (`reportBandsHtml`), full parameter
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
`PY_INDEX` at it. That package has no numpy wheel, so drive Python with plain lists; the examples that
use numpy need the real CDN. Comments, ties and user functions have no store or network of
their own: `postNodeComment`, `setTie` and `editUserFn` can be driven directly.

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

- **A parameter at its limit has no standard error.** A Voigt whose Gaussian width went to zero
  reported a height of 2282 ± 151 553: the curvature at the bound gave the width an error of
  3e7, and the bisection noise in its FWHM, divided by a 1e-10 step, multiplied it. Tables now
  say "at its limit", the delta method leaves such a parameter out, and FWHM errors use a
  smooth approximation.
- **A width going to zero is not always a broken peak.** The "collapsed width" check was written
  for the split pseudo-Voigt, whose halves must each be real; a Voigt at a Gaussian width of
  zero is a Lorentzian, and was flagged unusable until shapes could say they are `convolved`.
- **A dictionary of built-ins needs `hasOwnProperty`.** `EXPR_FN["constructor"]` is `Object`, so a
  formula calling `constructor(x)` compiled. Any lookup keyed by user text uses own properties,
  and objects keyed by parameter names are `Object.create(null)` (a parameter may be called
  `__proto__`).
- **Names of people keep their capitals.** "1 fano (breit–wigner–fano) peak" came from lower-casing
  model names for sentences. `lcFirst` lower-cases only names that are not eponyms, and shapes
  have a `short` name for the middle of a sentence.
- **A thing centred with `left:50%` gets half the screen.** The toast's auto width was computed
  against the half of the viewport to the right of its left edge, so on a phone it wrapped
  into six lines. It is `width:max-content` under its `max-width`.
- **A comment on a step outlives the step, and must say so.** Anchors keep the label the box had
  when the thread began; the live label is used while the step exists.

- **A function declared twice is the last one, silently.** `copyText` existed twice with
  different signatures; the later won, and "Results table" was toasted as a whole sentence for
  several releases. A new `peakTableText` nearly shadowed the fit's. Grep for
  `function name(` before adding one; the duplicate check is
  `grep -oE '^(async )?function [A-Za-z0-9_]+' kurve.html | sort | uniq -d`.
- **A redraw from a save must not take what is being typed.** Every save re-renders the open
  windows, so a table of text fields loses a half-typed value to a colleague's save (or any
  save). The Peaks window keeps the focused field's value and caret across its redraw.
- **A threshold is not a verdict on a peak someone has named.** Raising the finder's threshold
  and lowering it again dropped the labels typed on the peaks in between. A set now remembers
  the labels of peaks a search no longer finds (`mem`) and gives them back.
- **One undo entry per burst means one kind of change.** Merging every peak change within
  2.5 s let "find again" ride on a style change's entry, so one undo took back both, and a
  removal in between. `pkUndo` merges only the same kind of change with nothing else between.
- **A labelled mark and a fit's number compete for the same pixels.** Both sat on the peak's
  top. The fit's number moves inside the peak where a set's label is.
- **An example with one band cannot test a peak finder.** The Raman example is a single Si
  band; drive peak finding with the IR example (four bands, one a shoulder).
- **A menu's anchor must be an element.** The worksheet's cell menu handed `openMenu` a
  plain object with a rectangle, and the outside-click test (`contains`) threw.
  `pointerAnchor(x, y)` places a real (invisible) button there.

- **A delayed save must not outlive a later one.** Typing a value saves 0.7 s later; a fill
  within that time saved at once, and then the delayed save wrote back the raw-data record
  from before the fill, so the fingerprint no longer matched. Any save now carries the
  waiting patch with it, first, and a project switch flushes it.
- **A formula must name columns, not positions.** Letters are positions; stored as letters,
  deleting column C would make `D*2` read what used to be E. A formula stores the id each
  letter meant and is shown with today's letters.
- **Computed is not recorded.** A formula column's values are derived from raw data; hashed
  with it, adding a formula would have said the raw data changed. `rawCols` leaves computed
  columns out, and they cannot be typed over.
- **A sorted view is not a sorted table.** Reordering recorded rows would change what the
  fingerprint hashes and every mask and correction that names a row. Sorting maps sheet rows
  to data rows and shows the data row's number.
- **Adding a label row renumbers the others.** Label rows were -3 … -1 in a dozen places;
  F(x)= made them -4 … -1. They are `WS_LABS` and `WS_TOP` now, and a test that typed into
  "row -3" had to change with them.

- **One name, one meaning.** `integrateBand` returned `err` for the area's uncertainty and, when
  a window was too small, `err` for the reason. Every band then looked failed, its ± blank and
  its reference disabled. The reason is `fail` now; a field that is sometimes a number and
  sometimes a sentence will be read as the wrong one somewhere.
- **Equal numbers are not always a bug.** Two bands showed the same "area" to 17 digits: it
  was the error, and the windows held the same number of points with the same noise. Check
  what is printed before chasing it.
- **Below zero after a background is noise, not news.** The Overview warned about 332 points
  below zero on a spectrum whose background had just been subtracted. It warns past five
  times the noise only, and otherwise says "within the noise".
- **A table must fit the window it opens in.** The band table overflowed its default window
  and hid the reference and delete columns. Secondary columns go by container query, and on a
  phone the editable edges give way to dragging on the graph.

- **A window is not a manual.** Every window explained itself in paragraphs, read once and
  then in the way. Explanations live in the Help window, a setting's in its tooltip; a window
  keeps its labels, its numbers, warnings about this data, and one-line empty states.
- **A container query cannot restyle its own container.** The help's two columns were set on
  the element that was the container, so a narrow window hid the contents and squeezed the
  article into the 216 px column meant for them. The container is the window body.
- **A class name is global.** The help's numbered list was `ol.steps`, which already styled
  the pipeline's step list as flex rows: every sentence broke into columns. New components get
  names of their own (`dsteps`); grep a class before using it.
- **A form stretched across a maximised window is hard to read.** Controls in a `.frow` stop
  at 440 px, and the Fit button at 360 px.

## Roadmap

Done in this round: a Help window (an article for every window, tool and step, search, a "?"
on every window, F1), and a review of every window: explanations moved into Help and
tooltips, one-line empty states (the History of an empty project included), short status-bar
hints and toasts, spectrum pickers only when there is a choice, forms that stop at a
readable width, and the Peaks window's sections in one style.

Round before: integration without a fit (bands dragged on the graph, local baselines,
areas with noise-propagated errors, heights, positions, FWHM, shares and ratios to a chosen
band, windows around the peaks, every spectrum at once, a Bands box in the History, the CSV and
the report) and the Overview of a new spectrum (spacing, noise, bands, spikes, flat tops,
background, and first steps that open their tools), opened after an import.

Two rounds before: worksheet formulas in Origin's F(x)= row, the fill handle (series and
copies, double-click, Ctrl+D/R), sorting the view, find (Ctrl+F); peak sets that follow the
processing (labels kept, even through a change of X units) and peaks found in every spectrum
at once; a fix for a delayed worksheet save overwriting a later one.

Earlier still: the worksheet as a spreadsheet grid (fixed column widths, empty cells
beyond the data, range selection with Count/Sum/Average, Excel's keys, resizable and
autofitting columns, Origin's Long Name/Units/Comments rows); short menus with side submenus;
fonts for the graph and its labels; the Peaks window (find, mark with a symbol, drop line,
vertical line or leader, type each label, fit only if you choose); typing labels and text
straight on the graph; Peaks and Figure boxes in the History.

Earlier: comments on every History box (threads, replies, resolve, edit, delete
with undo, badges, the Discussion window's filter, the report); Python in the flow chart (new
spectra from Python, dashed arrows from the spectra code reads, out-of-date warnings and "Run
Python again"); user-defined fit functions with a library; true Voigt and Fano shapes; tied
peak parameters (one width, area ratios, fixed spacings).

Next, in order:
1. Many spectra at once: batch fits with a summary table and a trend plot of a parameter
   (or a band integral, or a band ratio) against sample, temperature or time; global fits with
   shared parameters; a multi-column import wizard
2. Figures for papers: export presets (journal column widths, DPI, fixed font sizes), style
   templates shared between projects, annotation arrows, boxes, real sub- and superscripts,
   snapping, insets
3. Getting around: a command search (Ctrl+K), a visible undo list, flow chart zoom and packed
   lanes, keyboard access to annotations and peak handles, handles for shape parameters
   (Lorentz fraction, Pearson m, Fano 1/q)
4. More files: JCAMP-DX, then SPC; OPUS and SPE last
5. Under the hood: a UI test script in `tools/` (Playwright) that runs every example end to end;
   speed with hundreds of spectra
6. Collaboration follow-ups: mentions, a comment that proposes settings for a step and can be
   applied in one click, unread markers; Python steps that re-run on their own when asked

## Known gaps

- Help cannot be opened over a dialog (a dialog makes the desk inert), so the import wizard
  and Plot details have no "?" of their own; their articles are in the contents. Articles have
  no pictures, and search matches words, not meanings
- Only one Y column is fitted at a time: no batch across a series, no global fit with shared
  parameters across spectra, and no summary table of a parameter against sample (a step can
  already be applied to every spectrum)
- The import wizard reads one Y column; extra columns have to be added by hand afterwards, or
  imported one file at a time with "Add" (each keeps its own X column when its axis differs)
- Peak handles move centre, height and width; there is no handle for a shape parameter
  (Lorentz fraction, Pearson m, Fano 1/q), and no keyboard nudging of a selected peak
- Ties are between the same parameter of two peaks; there are no free-form constraints between
  different parameters, and a user's function cannot be a peak shape in a peak fit
- Comments have no mentions, unread markers or notifications; they are plain text
- No Shirley or Tougaard background (XPS); no Fourier self-deconvolution
- Python steps store their output and must be run again when their input or a spectrum they
  read changes (they say so, and "Run Python again" does all of them); every other step stores
  only its settings. Reads are recorded when code takes a spectrum out of `spectra` by name,
  `get`, `items`, `values` or `copy`; `dict(spectra)` goes unseen. numpy loads from the Pyodide CDN, which a
  strict content policy may block: the code then gets plain lists
- The History lays lanes out in a grid; with many spectra it scrolls rather than packs, and
  there is no zoom on the flow chart
- Band integration uses the same windows for every spectrum on an axis (no per-spectrum
  shift of a window to follow a moving band), straight or level local baselines only (no
  curved local baseline, no Shirley), and the points inside the window (no interpolation to
  the exact edges); overlapping bands are integrated separately, not deconvolved, which is
  what the peak fit is for. Bands are shaded only in the overlaid and double-Y layouts
- The Overview's judgements (a spike's height, a flat background, 7 points for smoothing,
  5 below zero) are fixed thresholds; it describes the analysed spectrum only, not a batch
- Double Y puts every other spectrum on one right axis; there are no free graph layers, insets
  or per-panel settings in the stacked layout
- Annotations have no arrows, boxes or rich text (sub- and superscripts only as Unicode), and
  are not snapped to data or to each other
- A peak set follows its spectrum's processing, but not a change of the finder's settings made
  while another spectrum is analysed: "Every spectrum" applies them to all. Two identical
  spectra overlaid draw their labels on top of each other
- Worksheet formulas are whole-column (row by row); there are no cell formulas, no references
  to other rows (`B[i-1]`), no relative formulas when filling right, no replace in find, and
  sorting never reorders the recorded data (by design)
- Binary instrument formats (SPC, OPUS, SPE) and JCAMP-DX are not read; text exports only
- The preview pane serves a snapshot of the file, so `location.reload()` re-runs stale code —
  navigate to the file again after editing, or you will test the previous version
