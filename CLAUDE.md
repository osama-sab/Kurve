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
peak / Label / Arrow / Comment, show-all, the analysed spectrum's plot type, the layout of several
spectra, and the Reverse X / Log Y / Grid / Residuals toggles; it keeps to one row, dropping labels
in stages while it would wrap, `fitToolbar`); the **desk**; and a **status bar**
(tool hint, live cursor readout, point counts, fit state, save state). Window › Theme picks
light or dark, and Window › Style the look of the interface: **Bench** (the default: IBM Plex,
blue for everything you can change) or **Graphite** (Geist, black and white, blue only for the
keyboard focus). Both are remembered per browser; neither changes the graph's colours.

The desk holds **windows**, as in Origin: Graph, Worksheet, History, Overview, Peaks,
Integrate, Fit, Results, Batch, any number of Trend graphs, Statistics, Python, Discussion, Help, and the transient Tool dialog. Each moves by its title bar, resizes from
its edges, maximises on a double-click of the title and minimises to the **taskbar** along the
bottom of the desk, which starts with the project's name (every window on the desk is that
project's; click it to switch) and also has Tile and Cascade. Every title bar has a **?** that opens
the window's article in the **Help window** (F1 does it for the window in front; a tool's
opens its step's article). A first visit opens Graph, History and Worksheet. A project can
have **several graphs**, each in its own window (Window › New graph: with the analysed
spectrum, with every spectrum, or one for each spectrum, tiled): the one clicked is worked on
(it is drawn live, its spectrum is analysed and every window follows), the others show a
picture and chips naming their spectra; each has a ⋯ menu (rename, spectra on it, duplicate,
export, delete), the X zoom is linked between them unless switched off, and with more than
four the taskbar gathers them under one Graphs button. Graphs plotted one by one are put
together by holding and dropping: a graph by the grip in its title bar onto another graph
(or its taskbar button) merges into it, a spectrum's chip adds that spectrum (or, dropped on
the empty desk, gets a graph of its own); Window › Combine graphs… does it from a list, and
File › Bring in from another project… copies spectra between projects. The **graph window** has its own bar repeating the Data, Math, Analysis, Statistics
and Plot menus, a Python button, and a chip saying which stage of the processing is shown
when it is not the final data. Right-click on the graph (or Shift+F10) gives the spectrum's
colour, plot type and style, a line, text or peak label where you clicked, the frame, ticks,
layout and legend; right-click a line, a label, the legend, a title or an axis's numbers for
its own options. Lines, shaded ranges, text, peak labels, the legend, the titles and the axes
(by their numbers) drag with the pointer; a double click (or Enter) on a label, a text or a
title opens a box over it to type in (Shift+Enter for a new line), and one on a line, a range
or an axis's numbers opens its page of the **Format dialog** (Plot › Format graph…): pages
for each spectrum and the fit, each axis (title and where it sits, scale, position: an edge,
zero or a value, set off outward; line, ticks, numbers), the frame and grid (with quick
styles), the text (each kind its own font, size in points, bold, italic, underline, colour,
like a word processor), the legend (place, columns, size, box), the layout and colours, and
the labels and lines (each with its own text, style, turn, box and place). The **Peaks
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
  `opt.blocks = {seg, of}` makes it block-sparse: `seg` the point ranges (covering every point),
  `of[i]` the range parameter i alone moves (or -1 for all); each point then keeps only the
  derivatives that can be non-zero, so the Jacobian and the normal equations cost the number of
  spectra, not its square. `globalFit(sets, f, p0s, shared, fixed, opt)` is built on it: the
  sets laid end to end with X the point's index, the shared parameters once and each set's own
  once per set (`opt.lo`/`hi`/`pscale` flat or per set, `start` the shared starts, `prep(p, k)`
  to finish a set's vector, e.g. ties); a set's vector is built once per trial vector (two kept,
  since the Jacobian alternates them). It returns each set's params, errors, covariance block,
  dep, t, p, CI and atBound, its own statistics (its degrees of freedom less its share of the
  shared parameters), and the whole fit's (`K`, `shared`). `inverse` eliminates once and replays
  it on each column: solve()'s arithmetic exactly, at n³ instead of n⁴.
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
  recovered, the degrees of freedom and the carried errors), the formula compiler (order,
  precedence, named values, every error message, nothing but arithmetic), the inverse (the
  identity, each column exactly solve()'s), global fits (shared values recovered and equal in
  every set, each set's own, the degrees of freedom, a smaller shared error than one fit's,
  the block-sparse fit equal to the same problem dense, the shared error against 150 noisy
  repeats, ties through `prep`, one set as an ordinary fit) and `matchPeakTracks`. Run it after
  touching any of this.
  `matchPeakTracks(lists, {tol, dx})` follows the same peak through a series: each spectrum's
  peaks (`{x, w}`) join the track whose last position is nearest, within `tol` (0.5) of the
  larger FWHM (`dx` when neither has one), closest pairs first, two peaks of one spectrum never
  on one track; a peak matching none starts one. It returns tracks with `members [{s, k}]`, the
  median `x`, and `x0`, `x1`.
- **Fits** come in two kinds. `MODELS` (each with `params`, `ph`, `formula`, `f(x,p)`,
  `guess`, optional `derived` with delta-method errors) drives "Curve fit".
  `{kind:"composite", spec, x0, …}` drives "Peak fit". `fitModel(fit)` hands either to
  the plot, the CSV export and the report; `activeFit()` returns the analysed spectrum's fit
  (`p.fit` when it was made on that spectrum, else its row of the batch fit, else `p.fit`
  whatever it was made on), and `shownFit()` is the one the graph draws (only on the column it
  was fitted to, so every graph, pictures included, draws its spectrum's batch fit). The Fit
  window's drafts start from `activeFit()` too. Anything
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
- **Batch fits and series** (`p.batch`, `p.series`, both in `UNDO_KEYS`): the analysed
  spectrum's fit is the template (`batchTemplate`: model, peaks with shapes, ties and fixed
  parameters, baseline or curve model, X range, weighting, X units). `runBatch({tmpl, seed,
  cols})` fits every spectrum on the same X units, one per tick (`setTimeout`, so the window
  shows progress and Stop works), with `fitOne(c, t, seed, spec)`, which is `runPeakFit` and
  `runFit` for any spectrum (its final data, its mask, its error bars). Seeds (`SEEDS`):
  `tmpl` the template's result; `chain` the neighbour's result, starting at the template's
  spectrum and running out both ways in series order; `found` the peak finder's peaks in each
  spectrum with the template's first shape (`batchFoundSeed`, as `runPeakFinder` seeds).
  `p.batch = {at, by, tmpl, seed, rows:[{col, fit|null, fail|null}]}`; each row's fit is a
  normal fit with `batch:true` (and `byHand` when `batchWith(fit)` put a fit made by hand in
  its row), whose staleness is its own spectrum's `pipeSig`/`maskSig` (`batchStale`,
  `fitStaleFor`); `batchRowOf`, `batchFitOf`, `laneFit` (the History's Fits box per spectrum),
  `batchAgain`, `clearBatch`, and `removeFit` removes a batch row when that is what is shown.
  **The series variable** (`seriesOf()`: `{mode, label, unit, vals, q, line}`): the order of
  the spectra, a number in their names (`numsInName`; `seriesVals` takes the position, counted
  from the end, whose values vary most), or typed values; `seriesCols()` is the spectra in that
  order, `seriesLabel()` its axis title, `setSeries(patch, log)` saves it (with undo when it is
  logged). **The Batch window** (`renderBatch`, `wireBatch`): Fit every spectrum…, Fit again,
  progress (`S.batchRun`, `renderBatchProgress`), a summary line, the trend (`batchQuantities`:
  peak centre/height/FWHM/area/area % per template peak, curve parameters and derived values,
  R², reduced χ², band integrals and ratios, which need no fit; `batchValue(c, q)` →
  `{v, e, bad, bound}`; `trendData`, `trendSvg`, `lineFit` a weighted straight line), and the
  table (`batchTableText` for Copy and `exportBatchCsv`, `exportTrendSvg`, `reportBatchHtml`).
  Clicking a name or a point is `goSpectrum`.
  **Global fits** (`runBatch({…, share})`, `fitTogether(list, t, share)`): every spectrum is
  first fitted with the shared parameters held at the template's values (a template `tf` whose
  `fixed` includes them), then all are fitted at once by `globalFit` from those results, the
  shared ones from the template's. `p.batch.glob = {share, stats}` (`stats`: `K, n, dof, chi2,
  redChi2, R2, m, sh, own, iter, converged`); each row's fit carries `global:true`, `shared` (a
  flag per parameter) and `gstats`, its errors from the whole covariance. Weighted only if
  every spectrum can be; at most 900 parameters. A failure keeps the first fits and says so.
  `SHARE_KINDS`/`shareKindOf` (centres, widths, areas, shapes, baseline), `tmplTied`,
  `tmplParamName`, `shareSummary` ("every centre and every width"); the dialog's sharing list
  (`#bfShare`, `bfK_<kind>`, `bfP<i>`, listeners on its own elements). `activeFit` and `laneFit`
  prefer a global row to a fit by hand made before it; `batchWith` never replaces a global row;
  `batchStale` puts every global row out of date when any of its spectra changes;
  `fitWarnings` adds a `global` note; `statsList` gives the row's and the whole fit's numbers;
  Results and the batch table mark what is shared.
  **Tracks** (the same peak across the spectra): `fitTracks()` matches a `found`-seeded batch's
  usable peaks (quantities `fk@<x>.<f>` with `trk.byCol`), `markedTracks(xu)` the Peaks
  window's sets (`mk@<x>.x|y`, position and Y at the peak, no fit needed; `labelTrack`,
  `trackTableText`); `qFind(qs, id)` finds a track's quantity again within its width after it
  moved, `qFindStrict` returns null rather than another quantity. **Series from the files**:
  `mode:"meta"` with `key`, a header field (`metaParse`: a date and time, a time of day, or a
  number with its unit; `metaKeys` lists the fields most spectra have as numbers and that
  differ; `metaSeries` gives the values, dates as time elapsed since the first in s, min, h or
  d); `seriesUnit`, `seriesModeOptions` (the list in the Batch and trend windows),
  `pickSeriesMode`. **Trend graphs** (`p.trends = [{id, name, ys:[{q, ax}], line}]`, in
  `UNDO_KEYS`): windows made like graph windows (`syncTrendWins`, `WINS[id].trend`, after Batch
  in the taskbar, help `batch#desk`), `renderTrendWin` (chips with L/R and ×, + Quantity
  `trendAddItems`, against, Lines), `drawTrendPlot` (sized to its box, redrawn by a
  ResizeObserver), `saveTrend`, `newTrend` (the Batch window's On the desk, Window › New
  graph), `trendWinItems` (rename, copy, SVG, PNG, delete), `trendTableText`, `exportTrendWin`,
  `reportTrendsHtml`. `trendPlotSvg(ser, {W, H, pal, forExport, idp, single})` draws any number
  of quantities on a left and a right axis (margins measured, a legend row, symbols per
  quantity, an axis of one kind titled by the kind); `trendSvg` is it with one series.
- **Caveats** have one source: `fitWarnings(fit)` returns `{level, kind, text}` for staleness
  (`fitStale`), non-convergence, unusable components (`peakProblems`), a singular covariance,
  dependency, parameters at a bound, and residuals that run in long same-sign stretches
  (`runsTest`, Wald–Wolfowitz), and warnings from the processing the data went through
  (`procWarnings`), plus advice on a Voigt whose Gaussian or Lorentzian width went to zero and
  the meaning of a Fano's area. The results drawer, the fit panel's summary line, the copied table and
  the exported report all read it, so the report can never say less than the screen. The
  checks that look at data (`fitResiduals` for the runs test, `peakProblems`, the Voigt
  width check) read the fit's own spectrum through `fitPts(f)`, not the analysed one.
- **Import** (between the `==PARSER:START==`/`==PARSER:END==` markers): pure, DOM-free functions
  that sniff a file — `detectFormat` (delimiter and decimal mark decided together, since `1,5;2,5`
  only parses if you treat `;` plus comma-decimal as one hypothesis), `findBlock` (the longest run
  of consistent numeric lines, so an instrument preamble and a trailing footer are found rather
  than fought), `parseMeta`, `detectRoles`, `detectPaired`, `analyzeFile`, and `checkColumns`
  which reports findings without applying them. `tools/parser-test.mjs` extracts this block
  straight out of the HTML and tests it under node; run it after touching anything here.
  Files arrive through `readFileIn` (the Import button, Ctrl+O, or a drop anywhere on the
  window) and `importText`, which refuses binary instrument files with a reason (`looksBinary`).
  **Many spectra at once**: several files chosen or dropped together go to `readFilesIn`; a
  file with several Y columns does too when the wizard's Spectra list says all (`S.imp.all`,
  `impYs`, on by default when more than one column is a Y). `batchFile(fname, text, opt)`
  reads a file into items `{fname, name, x, y, e, xn, xu, yu, n, x0, x1, meta}` (or `{fail}`
  in words), `batchImport(items, o)` lists them in a dialog (names editable; into this project
  or a new one; one graph each, all in one, or stacked) and `doBatchImport` brings them in as
  one change: one undo entry, one log line, one raw-data record entry. A spectrum shares the X
  column of the one before it when `sameAxis`, and has its own otherwise; a project that held
  nothing gives its first graph to the new spectra.
- **Columns and spectra**: a project is a table. `p.cols` is `[{id, role, name, unit, data, of?,
  pipe?, mask?, src?, from?, file?, meta?}]` (`file` and `meta`, the file a spectrum came from and
  its header's fields, `colMetaOf`, shown in its Raw data box in the History; Python's `meta` is
  the project's with the spectrum's over it) with roles `x` / `y` / `e` (an error column names its Y in `of`) /
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
  remain as names for opening the Fit, History, Results and Discussion windows. `wireWin(el)`
  wires one window (the static ones at boot, a graph or trend window when it is made). Graph windows
  are placed per project (`saveGraphLayout`, `restoreGraphLayout`: `LAYOUT.proj[pid]` for a
  project with several graphs, `LAYOUT.single` for one graph), so twelve tiled graphs do not
  leave the next project's graph tiny.
- **Graphs**: `p.graphs` (in `UNDO_KEYS`) is `[{id, name, cols, plot}]`; the first graph,
  "main", is `p.plot` (its name `p.plot.gname`, default "Graph 1") and shows every spectrum not
  hidden; another shows `cols`, in order. `GID()` is the graph in hand (`S.gctx` while drawing
  another, else `S.gid`, the one in front); `GP()`/`plotOf(id)` its settings, and every
  reader of plot settings goes through them; `savePlot(patch, log)` writes them (an extra
  graph's `hidden` becomes its `cols`; its log line is prefixed with the graph's name).
  `plotCfg()` counts a spectrum not on the graph as hidden, so every `cfg.hidden` check works
  unchanged. Annotations of every graph stay in `p.plot.annos`, another graph's tagged `g`
  (`annoInGraph`; `addAnno`, `labelFoundPeaks` and the Format dialog tag them); a peak set
  (`grp`) belongs to its spectrum and shows on every graph that draws it. `graphIds`,
  `graphOf`, `graphName`, `inGraph`, `graphShows`, `graphCols`, `multiGraph`, `winOfGraph`
  (main's window is `graph`, another's is its id), `graphOfWin`. **Live and pictures**: one
  ribbon and one plot (`#gRibbon`, `#gPane`, with `#plot`, `#figure` and their handlers) move
  into the window of the graph in front (`moveLive`); the others show `.gbar` (chips of their
  spectra) and `.gsnap` (a picture). `activateGraph(id, colId)` brings one forward: it keeps
  the old one's zoom and spectrum (`S.gv`, `S.glead`), parks drafts per spectrum
  (`stashDrafts`, `S.dstash`), sets everything before `save({activeY})` (which redraws at
  once in this browser), and draws the old one's picture straight away. A pointerdown on a
  graph window activates it (a chip's click is read there, since activation hides the chip);
  `syncGraphWins()` (first in `renderAll`) makes and removes windows, and brings forward the
  graph that shows the analysed spectrum when the one in front does not (`graphForCol`).
  `withGraph(id, fn)` draws as another graph: its settings, lead (`leadOf`) and zoom
  (`viewFor`) put in place and every live state (stage, selection, drafts, preview) set aside,
  then restored. `runSnaps` redraws only pictures whose `snapSig` changed (size, palette,
  settings, annotations, each spectrum's `pipeSig`, name and mask, zoom, fit, bands, a
  pending step on it), 24 ms at a time; `scheduleSnaps(delay)` coalesces. Ids in a picture
  are prefixed so its clip paths are its own. **Linked zoom** (`S.linkX`, `kurve.linkX`,
  `setLinkX`): another graph takes the front one's X range as `{x0, x1, xu, yAuto}` and
  `resolveYAuto` fits Y to what is in range (offset and heat layouts are left whole).
  Making and changing: `newGraphs(groups, opt)`, `newGraphFrom(ids)` (it takes half of the
  front graph's window, `splitInto`), `onePerSpectrum`, `allInOneGraph`, `duplicateGraph`,
  `renameGraph`, `deleteGraph` (its annotations go with it, never data), `toggleGraphCol`,
  `showGraph`; menus `graphWinItems(id)` (the ⋯), `graphsMenuItems` (the taskbar's Graphs
  button and Window › Graphs), `newGraphItems`. **Combining**: `combineGraphs(srcs, into,
  {cids, keep, layout, at})` puts the spectra of graphs `srcs` (and spectra `cids`) on `into`
  (a graph id, `"main"`, which un-hides them, or `"new"`), copies each spectrum's series style
  from where it came unless the target has one, and unless `keep` deletes the source graphs
  (never main) with their annotations re-tagged to the target; one undo entry, a log line and
  a toast. A new graph takes a deleted source's window, the drop point (`placeWinAt`) or half
  the source's (`splitInto`). Dragging is `startGraphDrag(e, {gid, cid, click})`, pointer
  events on `window` (a click under 6 px runs `click`; Escape cancels; at phone width holding
  near the top or above the taskbar scrolls): from the grip `[data-gdrag]` in every graph
  window's title bar (shown only with several graphs, `body.mgraph`; a click opens
  `combineMenuItems(id)`, also the ⋯ menu's Combine) or a picture's chip `[data-gchip]`
  (the window's capture-phase pointerdown no longer activates on these; their click does).
  `gDropAt(x, y, o)` reads `elementsFromPoint`: a graph window or a graph's taskbar button
  (`dropTarget`, `already` when a chip's spectrum is on it), the bare desk for a chip; the
  ghost (`.gghost`) says what a drop would do (`dropText`), the target is outlined (`.gdrop`),
  and Ctrl, Alt or Cmd at the drop keeps the graph. `combineDlg(into)` (Window › Combine
  graphs…): which graphs, onto which (or a new one), the layout, keep or not.
  `syncGraphWins` moves the live plot out of a window before removing it (`rescueLive`). `tileWins` puts the graphs in a grid on the
  left (as near square as the desk allows, the last row stretched) and the rest in a column;
  when a graph would be under 250 × 235 px that way, the graphs take the whole desk and the
  other windows are minimised. A picture smaller than 250 × 160 px is drawn at that size and
  scaled down, so its labels never collide.
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
  fits; with several graphs a box per graph (`kind:"graph"`, key `figure` for the first and
  `graph:<id>` for the others) below the spectra, fed by dotted lines from the last box of
  each spectrum it shows, with its layout, annotations, recent changes and discussion
  (selecting it brings the graph forward); otherwise a Figure box below everything when the
  graph has lines, ranges, text or labels
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
  the Peaks window's set instead (`findPeaksInto`, over the fit's range). Above both kinds of
  fit, `fitWhereHtml` says what is fitted: Spectrum (with several; `goSpectrum`) and Range from
  … to …, which is the graph's zoom (`setViewX(a, b)`, null for all; `wireFitWhere`), and the
  footer ends in **Done** (`#fitDone`, closes the window). Each peak card has a name field
  (`data-pname`, `setPeakName(k, v, "draft")`), and under the fit a row of chips says what the
  labels show (`data-fplf`, `fplToggleField`) with More… (the Format dialog's `fpeaks` page).
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
  opens the Fit window: fitting is optional). The window's parts: **Find peaks in** (which
  spectrum, always shown, with In every spectrum; From … to … in X units; Whole spectrum,
  What's in view, Pick on the graph), how to recognise a peak (`pfFormHtml`, the finder's form
  under `pk-pf…` ids so the Fit window's can be open too), the peaks (a table with a label field
  each, Search again, remove, Copy, Clear, add by clicking the graph, the turned-down candidates
  with Add), Across the spectra (with several sets on one axis: each matched peak once, its
  spread, in how many, one label for every one, a chart button for its trend), how they look on
  the graph, and a pinned footer: **Done** (closes the window; the peaks stay), then the
  optional Fit them…, Integrate them and Labels and legend…. **The range**: `pkRangeOf(c)` is
  the set's own (`found[c].rng` in its units) or, before a set, `S.pkRng[c.id]`; null is the
  whole spectrum. `findPeaksInto({rng})` searches it (its own range by default, never the zoom;
  the log names it), `setPkRange(rng)` sets it with an undo entry of its own, `viewRng()` is the
  zoom as a range, `pickPkRange()` the drag (`S.pick.pkr`, read in `setPickedRange`); the first
  search when the window opens takes the view, and `findPeaksEvery` uses the analysed
  spectrum's range on every spectrum on its axis. While the window is open `buildPlot` shades
  what lies outside the range (`.pkrange`).
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
  `userFns` the project's fit functions, `found` the peak sets, `integ` the bands, `graphs`
  the extra graphs, `batch` and `series`, `trends` the trend graphs)
  plus both drafts (`S.pdraft`, `S.draft`). It is per-session and local on purpose — rewinding your
  own edits, not other people's. Destructive actions confirm themselves with a toast that
  carries an Undo button (`toast(msg,{action,run})`).
- **Storage**: `LocalStore` (localStorage, single user) and `makeDbStore(db)` (claude.ai artifact
  runtime, shared realtime). Both expose the same interface: `watchProjects`, `create`, `save`,
  `remove`, `watchComments`, `addComment`, `updateComment`, `deleteComment`. To add a real
  backend (Firebase, Supabase, a custom server with WebSockets), implement this interface.
  With LocalStore and no projects at all, `onProjects` creates an empty one, so a first visit
  has a worksheet to paste into. **Projects coming and going**: `S.pendingOpen` is set by
  `createProject` only when the new project is not listed yet (a shared store lists it before
  `create` resolves), and `onProjects` keeps the current id only while it is that pending one;
  `S.gone` holds projects deleted here, filtered out of every list. `deleteProject` adds to it,
  removes, then (if no list has done so) `leaveProject(pid)` (drops a waiting worksheet save,
  forgets its layout, clears `S.pid`) and opens the most recent other project, saying which;
  a project deleted elsewhere is left the same way, with a toast. `save` never writes to a
  gone project. Names: `projName`, `isUntitled` ("Untitled analysis", "(2)" too),
  `uniqueProjName(nm, except)` (every new project; imports that rename an untitled one),
  `batchProjName(names)` (what the files' names share, or "first to last"); `switchProject`
  (the list's run) toasts what is in the project. **Bringing in** (File › Bring in from
  another project…, `bringInDlg(gid)`, `bringIn(groups, onto, gid)`): `copySpectra(q, cids)`
  copies chosen spectra with their sources and what their steps read (`stepReads`, from each
  op's `deps`), their X (nearest left of the root) and error columns, with new column and step
  ids (`ref`, `cols`, `reads`, `readSigs` remapped), a computed column as values, and
  `origin {pid, proj, col, t, by, computed?}` (the History's Raw data box says "Brought in");
  an X column equal to the last one here is shared. Peak sets (`found`, `pk:` annotations) and
  series styles come too; one undo entry, a raw-data record entry and a log line naming the
  project. Onto the graph in hand, a new graph, or one each (an empty project's first graph
  takes them). `projSpectra(q)`, `otherProjects()`.
- **State**: global `S`; the current project is `S.proj` with `cols` (see Columns above),
  `activeY`, `raw` (`{fp, hist}`), `meta` (captured from the imported file's header), `plot`
  settings (`style`, `logY`, `grid`, `resid`, `revX`, `hidden`, and from the Format dialog
  `logX`, `gridMinor`, `gridColor`, `gridLw`, `gridDash`, `gridX`, `gridY`, `plotBg`, `mL`,
  `mR`, `mT`, `mB` (margins, null measured), `layout`, `offset`, `legend`, `legendPos`,
  `legendText`, `legendTitle`, `legendFrame`, `legendCols`, `legendLine`, `legendSp`,
  `legendFill`, `legendOp`, `legendBd`, `legendLw`, `legendR`, `frame` (`box`, `l` or the
  older `axes`, `none`), `frameLw`, `frameColor`, `font`, `fontFam`, `fontName`, `titleItalic`,
  `txt` (per kind of text), `title`, `titleDx`, `titleDy`, `cmap`, `scheme`, `peakScheme`,
  `peakLab`, `peakLabRot`, `peakLabDec`, `axisMatch`, `annos`, `series[id]` and `ax.x|y|y2`,
  see Rendering; `gname`, the first graph's name), `graphs` (see Graphs), `batch`, `series` and
  `trends` (see Batch fits), `fit`, `fits` (the fit history:
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
  `S.plotPreview` (the Format dialog's working copy; `S.pdTab` its page, `S.pdSel` the
  spectrum, `S.pdAnno` the annotation, `S.pdPos` where it was dragged), `S.ttdrag`/`S.axdrag`
  (a title or an axis being dragged), `S.arrowDraft` (an arrow being drawn), `S.guides` and
  `S.snapRing` (alignment guides and the point an arrow snaps to, drawn on screen only),
  `S.altKey` (Alt held: no snapping), `S.insetCfg` (an inset's settings while it is drawn),
  `S.exp` (the export dialog's settings), `S.pkRng` (a Peaks window range before there is a set),
  `S.fldrag`/`S.fplClick` (a fitted peak's label being dragged or clicked), `S.stOpt`, `S.annoSel` (the selected
  annotation; Delete removes it), `S.comments` with `S.cDrafts`, `S.cReply`, `S.cEdit` and
  `S.discFilter` (the Discussion window's Open/All). Window positions are `LAYOUT`.
- **Rendering**: `buildPlot(W,H,palette,colEx,opt)` returns an SVG string used both on screen and
  for export; on screen it also records `S.geo` (transforms, handle positions, `logX`, `heat`).
  `colEx` is the export's colours; inside, `forExport` means a still picture (no handles, hit
  zones or side effects on `S`), which is also what `opt.inset` asks for, drawn in the
  screen's colours. `opt.k` scales every text (for an export at a size in points), and ticks
  space out with larger text (`tkDen`).
  It reads the plot settings through `plotCfg()`, which is the Format dialog's working copy
  while that dialog is open. Each spectrum has a style from `serStyle(id, active, …)`: `type`
  (`PLOT_TYPES`: line, scatter, linesym, stick, area, step), `color`, `lw`, `dash`, `sym`
  (`SYMS`, filled and open), `ss`, `fill`, `op`, `label`; the fit curve's is `series.__fit`.
  `seriesSvg` draws one spectrum as a handful of paths whatever its length. `axisTicks` honours
  each axis's `min`, `max`, `step`, `minor`, `fmt` (auto, decimal, scientific) and `dec`.
  **Text styles**: `TS` in `buildPlot` holds one style per kind of text (`TXT_ELS`: title,
  axis, ticks, legend, labels, peaks), each `txtStyle(cfg, el, base, kfam)` = the graph's font
  and size (`fs`) under `cfg.txt[el]` (`fam`, `name`, `size` in points, `b`, `i`, `u`,
  `color`, `align`; `fam:"default"` is Kurve's own face); `tAt(st, fill)` writes its SVG
  attributes, `tLab` draws a tick label (plain or m×10ⁿ, turned), `textBlock` draws text of
  several lines, turned, in a box. `textW`/`labW` measure text with a canvas in its own font.
  **Axes and frame**: `axisCfg(cfg, k)` resolves an axis's `ticks` (in/out/both/none), `tlen`,
  `mlen`, `tw`, `mirror` (default: on with a box frame), `labs`, `lrot` (0/45/90), `color`,
  `lw`, `line`, `pos` (x: bottom, top, zero, at; y: left, right, zero, at; the right axis is
  always right), `at`, `off` (outward, px), `tshow`, `talign` (start/center/end along the
  axis, `axAlign`) and `tdx`/`tdy` (the title dragged, px); `frameOf(cfg)` is `box`, `l` (the
  axis lines alone) or `none`, with `frameLw`/`frameColor`. Margins are measured: the numbers
  in their font, ticks pointing out, offsets, titles, a right axis, a colour bar, an outside
  legend; `mL`/`mR`/`mT`/`mB` override them. `drawFrame(top, h, yt, Yf, showXLab, yLabels,
  labCol, main)` draws the frame, the axis lines (one path at a corner), ticks (`tkSpan`,
  `tkOut`), mirrored ticks and numbers, and records where the numbers went (`drawn`) so the
  titles sit beside them wherever the axes are. Stacked panels keep X at the bottom and Y on
  the left; double Y keeps Y on the left. On screen the main frame also draws a transparent
  zone over each axis's numbers (`data-axis`: drag, right-click, double-click) and records
  `geo.axes`. The grid takes `gridColor`, `gridLw`, `gridDash`, `gridX`, `gridY`; `plotBg`
  fills the plot area. The title takes `TS.title.align` and `titleDx`/`titleDy`. `layout` (`LAYOUTS`): overlay,
  offset (a waterfall, each trace labelled), stack (a panel per spectrum, shared X, the
  analysed one on top), dy (the others on a right axis), heat (one row per spectrum, drawn as
  one image from `heatImage`, with a colour bar; `CMAPS`). The legend goes in the emptiest
  corner, a chosen one, outside on the right, below the graph (`below`: as many columns as
  fit, rows read across), where it was dragged (`legend:"custom"`, `legendPos` as fractions
  of the plot area), or nowhere; it can have a title, columns (`legendCols`, filled down),
  its own text style, line samples of any length (`legendLine`), row spacing (`legendSp`), a
  frame and background of its own (`legendFrame`, `legendFill`, `legendOp`, `legendBd`,
  `legendLw`, `legendR`), and its text in each spectrum's colour (`legendText:"match"`); a
  series with `leg:false` is left out of it. **Colour schemes**: `SCHEMES` (Kurve's, distinct hues from a validated
  categorical palette, Okabe–Ito, viridis in table order, black and greys with dashes) and
  `PEAK_SCHEMES`; `yTint(id)` and `peakColor(k)` read them, so the graph, the legend, the
  worksheet header, the fit panel and the results table change together. Every scheme but
  Kurve's colours by table order, so a colour stays with its spectrum. On two Y axes with one
  other spectrum each axis's numbers and title take its spectrum's colour (`axisMatch`).
  **Annotations** (`p.plot.annos`, each `{id, t, x, y, x2, text, color, lw, dash, size, unit,
  rot, bold, font, ser, dx, dy, xu, yu}`, and on labels `mk`, plus `grp`, `lab`, `pk`,
  `manual` on a peak set's, `t` one of `v`, `h`, `band`, `text`, `label`; and from the Format
  dialog `fontName`, `pt` (size in points, over `size`), `i`, `u`, `align`, `ang` (any angle;
  the older `rot` means 90, `annoAng`), `box` (`line`, `fill`, `both`) with `bg` and `bd`,
  `lpos` (where a line's or range's text goes), `edge` (a range's edge lines), `op`, and on
  text `pin:"plot"` with `fx`, `fy`: placed by fractions of the plot, so it stays put when
  zooming; `annoTextStyle` gives a text's style over `TS.labels`) are drawn by
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
  `addAnno`, `updateAnno`, `deleteAnno`, `editAnno` (the Format dialog's Labels and lines page,
  open at it), `annoMenuItems` (type its label, mark it with, turn, box, align, centre,
  pin, text position, width, and for a set's peak mark or label every peak with), `pinAnno`,
  `centreAnno`, `peakNear` (the top of the peak under a click), `addPeakLabel`,
  **Arrows** (`t:"arrow"`, tail `x, y`, head `x2, y2`, or pinned `fx, fy, fx2, fy2`; `head`
  `end`/`open`/`both`/`none`, `hs` its size; text beyond the tail): `arrowSvg`, `annoEnds`
  (an annotation's ends on screen), drawn with the Arrow tool (`S.mode` `arrow`, `makeArrow`)
  whose head snaps to a data point (`snapNear`), ends dragged by their handles (`data-ah`).
  **Insets** (`t:"inset"`, the range `x0, x1, y0, y1` with empty Y fitted to the data,
  placed by `fx, fy, fw, fh`, `box`, `conn`, `titles`, `ts`): `insetSvg` draws the graph again
  through `buildPlot(…, {inset})` with `S.insetCfg` (no legend, title, annotations or residuals,
  smaller text), ids prefixed, the region outlined and joined to the inset by the corners
  whose lines run outside both boxes; `makeInset` makes one from the zoom on view, in the
  emptiest corner that does not cover the region; its corner handle (`data-ah="se"`) resizes
  it. Dragged text snaps to the plot's centre and other text (`S.guides`).
  **Rich text**: titles, axis titles, legend entries and annotation text go through
  `richSvg(str, size)` (`^{…}` superscript, `_{…}` subscript, `\name` from `RT_SYM`; only
  braces make scripts) and `richW` measures it; `rtool(id)` puts x², x₂ and a symbol grid
  (`openSymPicker`) beside a field, and Ctrl+Shift+= / Ctrl+= wrap the selection
  (`setupRichTools`, fields marked `data-rich` and the inline editors).
  `labelFoundPeaks`, `shadeRange` (a range pick), `addLineDlg`, `clearAnnos`.
  **Fitted peak labels** (`fitLabels` in `buildPlot`; a draft being set up shows `numLabel`, its
  number and name; straight after a fit, `ov.same`, the fitted labels are drawn with the
  handles): what each says is `fplText(cfg, k, name, m, u)`, from `fplFields(cfg)` (`peakLab`
  `"custom"` with `peakLabShow`, a list from `FPL_FIELDS`: number, name, centre, height, FWHM,
  area, area %; the older `num`, `pos`, `numpos` read as lists; `off`) or your own text
  (`peakLabTpl`, `fplTpl`, with `{n} {name} {xc} {h} {fwhm} {area} {pct}`), numbers by
  `fplVal` (`peakLabDec`, `peakLabErr` ± errors, `peakLabUnit`), one line or stacked
  (`peakLabSep`). Where: `peakLabPos` (`FPL_POS`: above, inside, a row along the top spread so
  none overlap, with leaders), `peakLabRot`; a label that would rise above the plot sits beside
  its peak. Look: `peakLabMk` (`FPL_MARKS`: dot, drop line, vertical line), `peakLabCol` (each
  peak's or the text's), `peakLabBox`, `TS.peaks`. All these are format (`FMT_KEYS`); drag
  offsets are not (`peakLabOff`, pixels by peak id, `S.fldrag`, a leader back to the peak).
  On screen each label is `g[data-fpl][data-fplid]`: drag, double-click to name its peak
  (`namePeakDlg`), right-click for `fplMenuItems(k)` (also Plot › Fitted peak labels), hover
  tip. A peak's **name** is `spec.peaks[k].lab` (carried by the draft, `runPeakFit` and
  `batchTemplate`; `peakMetrics` returns it as `name`): `setPeakName(k, v, from)` writes it on
  the fit, the draft and every batch row by peak id, and turns the name field on; Results, the
  copied table, the report and the CSV show it. The Format dialog's page is `fpeaks` (Defaults
  resets it, `fploff:` puts dragged labels back).
  **Fonts**: `FONT_LIB` (`[key, label, stack, kind, web family?]`: web fonts from Google,
  then common installed ones; `FONTS` adds Kurve's), `fontStack(key, name)` (loads a web font
  the first time it is drawn, `loadWebFont`, and tries Google for a name not installed),
  `fontInstalled` (a canvas width test against two fallbacks; `document.fonts.check` says yes
  to anything), `fontOk`, `fontNameOf`, `fontRedraw` (redraws when a font arrives).
  `openFontPicker(btn, cur, pick, opt)` lists them by kind, each in its own face
  (`loadFontPreviews`: subsets named `KP <family>`), with search, a name box and, where the
  browser allows, this computer's fonts (`queryLocalFonts`). The graph's font is
  `fontFam`/`fontName` and `font` (a scale); `fontMenuItems` is Plot › Font.
  **Colours**: `openColorPicker(btn, cur, onInput, onDone, opt)` (a saturation/value square
  and hue strip drawn in CSS, hex, Kurve's colours, recent ones in `kurve.colors`, an eye
  dropper; `onInput` at most once a frame while dragging), `colorBtn`. **Text bars**:
  `txtBarHtml(path, st, auto, opt)` (font, size in points with `#ptSizes`, B, I, U, colour,
  alignment) and `wireTxtBars(root, get, set)`. Axis and graph titles carry `data-axtitle`:
  dragged (`dragTitle`, `commitTitleDrag`; home within 5 px), typed in place
  (`inlineEditTitle`; `editAxisTitle` calls it), `setAxisTitle`; their menu is
  `titleMenuItems(k)`. An axis's numbers (`data-axis`) drag the axis (`dragAxis`: off its
  edge, snapping to zero, or to a value; `commitAxisDrag`), and their menu is
  `axisMenuItems(k)`; `setAxisKeys(k|"all", patch, log)`, `setTxtKey(el, patch, log)`. The
  peak finder's preview marks (`S.pfPreview`) are drawn on screen only. Right-click:
  `openGraphMenu` → `graphMenuItems` (swatch rows are `{swatches, current, pick}` menu
  items). **The Format dialog**: `openPlotDetails(id, page)` (`#plotModal`; pages `series`
  with `S.pdSel`, `ax:x|y|y2`, `frame`, `text`, `legend`, `layout`, `labels`, or
  `anno:<id>`; the old tab names map through `PD_PAGES`), `renderPlotDetails` (a side list
  of pages, each page in groups; focus and scroll kept across redraws), `pdSet(path, v)` on
  the working copy (`series.`, `ax.`, `allax.`, `txt.`, `annos.<id>[.key]`, `hidden.`, or a
  top-level key) with `pdGet`, `pdTxtGet`/`pdTxtSet` (an annotation's text bar maps to its
  own keys, `ANNO_TX`), `pdPreset` (quick styles), `pdAct`, `pdAnnoEditor(a)`, and
  `closePlotDetails(ok)` (one undo entry; `pdLog` names what changed). It moves by its title
  bar (`S.pdPos`); *Defaults* resets the page (top-level keys to null: `savePlot` merges);
  *Use on every graph* is `formatEveryGraph` (`FMT_KEYS`, `FMT_AX`: format, not data,
  ranges, titles or annotations; through `styleFrom(src, pl)`, which puts a missing key back to
  its default). **Formats**: `fmtOf(pl)` is a graph's format alone; `FMT_BUILTIN` (Kurve's,
  journal, classic, slides, minimal) and a per-browser library (`fmtLib`, `fmtLibSave`, under
  `kurve.formats`, `saveFormatAs`); `useFormat(f, every)` gives one to the graph or every
  graph, `formatMenuItems` lists them (Plot › Formats, and the Format dialog's Formats button,
  which applies to the working copy). `txtAuto(cfg, el)` is a kind of text's automatic style.
  `renderTop`, `renderWs`, `renderPlot` (+ `renderStatusBar`), `renderStages` (now the graph
  window's stage chip and the toolbar's Raw/Final/Compare), `renderFit` (it also refreshes
  `renderResults`, `renderTabMarks` and the status bar), `renderFlow`, `renderTool`,
  `renderStats`, `renderPy`, `renderThread`, `renderLog`, `renderAll`. Dense data (over 1500
  points) is drawn as one path of dots, and error bars as one path.
- **Styles and controls** (the tokens at the top of the `<style>`): one token set per theme
  and per style. Bench is bare `:root` plus the two dark blocks; Graphite is
  `:root[data-style="graphite"]` plus its own two dark blocks, and every token Graphite sets in
  light it sets again in dark (see the rules below). `styleSetting()`/`applyStyle(s)` keep
  `kurve.style` and the root's `data-style`, and the inline script in `<body>` applies it
  before the first paint, as it does the theme. The data colours (`--data`, `--fit`, …) are
  shared, so the figure does not change with the style. Controls are drawn from tokens, never
  from the browser's own look: `--r`/`--r-win` (radii), `--ctl-on` (what "on" looks like:
  a slider's fill, a switch, a ticked box), `--focus`/`--focus-soft` (focus rings; blue in
  both styles). Sliders (`input[type=range]`) have a track filled up to the value from `--p`,
  which CSS cannot read from the value: `paintRange(el)` sets it on every input and change,
  and `setupRanges` watches the document (a `MutationObserver` that looks only at added nodes
  holding a slider, one `paintRanges` per frame) for sliders a render adds. A checkbox inside
  `.chk` or `.switch` is a **switch** (`--sw-*`; its knob is a radial gradient whose
  `background-position` slides, so it animates with no pseudo-elements); one in `.colpick` or
  a fit table stays a **box** (`--cb-*`, the tick an SVG in `--chk-img`, dark on light
  accents); radios are drawn too. Lists get a drawn chevron (`select:not([multiple])`).
  Segmented controls take `--seg-bg`, `--seg-bd`, `--seg-on`, `--seg-on-ink`, `--seg-sh`
  (Bench: a raised white pill; Graphite: black with white text), windows `--win-sh` and
  `--win-sh-act`. Numbers typed into forms and slider readouts are in `--mono`.
- **Menus and dialogs**: `openMenu(trigger, items, opt)` renders any menu (menu bar, project
  list, Export, column header, graph) from `{label, run, kbd, note, checked, radio, enabled, danger}` items
  (`note` is muted text on the right, as the project list's "3 spectra · 2 graphs"),
  `"-"` separators and `{group}` headings, with arrow-key, type-ahead and Escape handling.
  An item `{label, sub}` (`sub` a list or a function returning one) opens a submenu to the
  side on hover (after 110 ms, with the same grace leaving it), on a click, or with →; ← and
  Escape close it (`buildMenu`, `openSub`, `closeSubs`, `menuOpen.subs`). A menu with a
  search box (`opt.search`) searches every submenu and lists the matches flat with their path;
  `menuItems(name)` defines the menu bar and the graph window's bar. `openModal`/`closeModal` make everything behind a
  dialog inert, trap Tab, route Escape to the dialog's `_cancel`, and return focus; the import
  wizard, `confirmDlg`, `formDlg` and the Format dialog use them. A font or colour picker
  open over a dialog keeps Escape and Tab for itself: the modal key handler looks at
  `fpOpen`/`cpOpen`/`spOpen` first, and a menu opened from a dialog closes on Escape.
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
  `exportPng` (the same SVG rasterised at 2.5×) go through `embedFonts(svg)`, as do the
  all-graphs figure and the report: each web font face the SVG draws (family, italic, bold)
  is fetched from Google Fonts as a subset of the letters drawn and embedded as data in a
  `<style>`, in parallel, cached per request (`FONT_EMB`), whatever arrived after 10 s;
  offline the figure goes out as it is. **For a paper or slides** (`openExportFigure`,
  `renderExportFigure`, `doExportFigure`, `#expModal`): a size (`EXP_SIZES`: journal columns,
  a slide, as on screen, or any in mm, in or px), the tick numbers at a size in points there,
  lines and symbols scaled with the text (laid out k times smaller and drawn k times larger,
  so everything keeps its screen proportions) or as drawn (`opt.k` scales only the text),
  SVG at a physical size (`expDress`), PNG at 150–1200 dpi with a pHYs chunk (`pngWithDpi`,
  `crc32`) or TIFF (`tiffEncode`, PackBits, with its resolution), white or transparent, this
  graph or all; `expBuild` makes the SVG, `expInfo` says its size, the preview is the SVG
  itself with prefixed ids, and the settings are kept in `kurve.export`. `exportCsv` (every column with units, the mask
  flag, the fit, residual, baseline and each peak curve, plus commented blocks for metadata,
  the fingerprint, the processing steps with their warnings, the marked peaks with their
  labels, the band integrals, and fit statistics),
  `exportRawCsv` (the raw data under a comment header that says how to check its
  fingerprint), `exportRecipe` (the steps as JSON), and `exportReport`, a self-contained HTML
  document with or without a fit (figure, notes from `fitWarnings`, fitted peak table, the
  marked peaks of every spectrum with their labels (`reportPeaksHtml`), every spectrum's band
  integrals with how they were measured (`reportBandsHtml`), full parameter
  table with t, p, CI and dependency, statistics, the raw-data record, every processing step
  with its warnings and a filmstrip, the fit history, method, session log; with several graphs
  every graph too). `resultsText` is the same as TSV for `copyResults`. With several graphs,
  `allGraphsSvg(pw, ph)` draws each (through `withGraph`, as it is on the desk) into one SVG
  lettered (a), (b)…, for `exportAllSvg`, `exportAllPng` and the report; `exportAllCsv` writes
  every spectrum's final X and Y side by side with each one's steps.
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

- **A style's light tokens follow the theme's dark ones.** `:root[data-style="graphite"]` and
  `:root:not([data-theme="light"])` have the same specificity, and Graphite comes later, so in
  dark mode its light values win over Bench's dark ones. Graphite's dark blocks therefore set
  again every token its light block sets; tokens it leaves alone (the data colours) keep
  Bench's value for the theme.
- **`none` cannot join a list.** A thumb's hover ring is `var(--th-sh), 0 0 0 5px …`; with
  `--th-sh: none` the whole declaration is invalid and the ring never shows. "No shadow"
  tokens are `0 0 0 0 transparent`.
- **A re-rendered form detaches what you held.** Clicking a step's switch re-renders its form,
  so a test that kept the element handle read a detached node. Look controls up again after
  anything that saves.

- **Every reader of a setting goes through one door.** With one graph, `p.plot` was read in
  sixty places. Several graphs meant sending every one of them through `GP()` and every write
  through `savePlot`; a reader left on `p.plot` would quietly show the first graph's setting
  on another. Grep `\.plot\b` after touching plot settings: only annotations and the first
  graph's own code may use it.
- **A picture must not borrow ids.** Every graph drawn by `buildPlot` has a `clipM`; eleven
  pictures on one page share ids, and a clip path resolves to the first. Pictures and the
  combined figure prefix their ids.
- **A click that hides what it pressed is not a click.** Bringing a graph forward on
  pointerdown hides its chip bar, so the chip's click never arrived. What was pressed is
  read in the pointerdown itself.
- **Set the state before the save.** In this browser `save()` redraws synchronously, so the
  graph in front, its zoom and its spectrum are all in place before `save({activeY})`, or
  the redraw paints the new spectrum with the old zoom.
- **Compare before you save.** Plot details decided whether to reset the zoom by comparing
  the new layout with `P().plot` after saving it, which is always equal: the reset never
  happened. Capture the old value first.
- **A check reads the data its result came from.** The runs test and the peak checks
  compared a fit with the analysed spectrum's points; with one fit shown at a time that was
  nearly always the same spectrum. A batch showed seven rows of "residuals run in long
  stretches" that were the first spectrum's points against the others' fits. `fitPts(f)`
  reads the spectrum a fit was made on.
- **A layout belongs to its project.** Twelve tiled graphs in one project left the next
  project's only graph a twelfth of the desk. Graph windows are placed per project.
- **A flag that waits for an event must know the event may have come first.** `pendingOpen`
  kept a new project on the desk until the store listed it; a shared store lists it before
  `create` resolves, so the flag was set after the fact and never cleared, and deleting that
  project left its graphs on screen with the next import going into it. The flag is set only
  if the project is not listed yet, deletions are remembered (`S.gone`), and the desk leaves a
  deleted project at once. Test a store's events in both orders.
- **A window that goes takes what it holds.** The live plot is moved into the window of the
  graph in front; removing that window (the graph merged, deleted, or of the project just
  left) removed the plot, and every later render threw. Windows give the plot back first.
- **Two projects with one name are one project to the eye.** Every batch import was called
  "3 spectra", every graph "Graph 1": after a switch nobody could tell which graphs were
  whose. New projects get names of their own, and the taskbar says whose windows these are.

- **A font that is not there looks like no change.** Choosing Calibri or Helvetica on a
  computer without them drew the fallback, so "changing the font of the axis titles did
  nothing". The picker says which fonts are not on this computer (`fontInstalled` measures
  widths; `document.fonts.check` answers yes for any name), and the web fonts load from Google.
- **An SVG drawn as an image sees no fonts but its own.** A PNG export is the figure's SVG
  drawn on a canvas, and an image cannot use the page's fonts: a graph in Inter came out in
  the fallback, and an SVG opened elsewhere has only that computer's fonts. Exports embed the
  web fonts they use (`embedFonts`), only the letters drawn.
- **A margin in pixels cannot fit a font chosen later.** The left margin was 74 px whatever
  the numbers; larger tick numbers or a longer number ran into the axis title. Margins are
  measured from the text in its own font.
- **A picker over a dialog needs its own keys.** The dialog's capture-phase Escape closed
  the whole Format dialog when it was meant for the colour picker, and Tab was pulled back
  into the dialog. The modal handler lets an open picker have both.
- **Deleting a key does not reset it.** `savePlot` merges, so a key deleted from the working
  copy kept its saved value. Resetting writes null.
- **A slow network is still a network.** Fetching fonts one after another timed out and threw
  away what had arrived. Every face is requested at once and what is there at the cutoff is
  used.

- **One flag, one meaning.** `forExport` meant both "export colours" and "a still picture
  with no handles". An inset needed a still picture in the screen's colours, so `buildPlot`
  takes `colEx` for the colours and derives the still flag from it or `opt.inset`.
- **Markup must not eat names.** Spectra are called `sample_01` and `run^2` by their files;
  only braces (`_{…}`, `^{…}`) make scripts, and an unknown `\name` stays as typed.
- **A wrapping toolbar hides its own bug.** The toolbar had been two rows at 1200–1366 and
  1600 px, unnoticed, until one more button made 1440 wrap too. Measuring rows, not looking
  at one width, found it; `fitToolbar` now drops labels in stages while it would wrap.
- **A test must find things again after anything that scrolls.** At phone width, clicking a
  toolbar button scrolled the page, and a drag computed from the graph's earlier position
  landed elsewhere: it looked like the arrow tool was broken.
- **Printed size and screen size are different questions.** A figure 85 mm wide is 321 CSS
  pixels: drawn there with screen fonts its text was huge beside the data. The export sets the
  tick numbers' size in points at the printed size and scales the rest of the figure with it.

- **A global fit's starts must agree with what it shares.** Seeded from each spectrum's own free
  fit, a spectrum without the second band brought a width of 10⁴⁸ and an area to match, and
  the whole fit went with it. Each spectrum is now first fitted with the shared parameters held
  at the template's values.
- **An inverse by n solves is n⁴.** Fine for a peak fit's twelve parameters; a global fit's
  hundreds took seconds. The elimination is done once and replayed per column, which is the
  same arithmetic.
- **A dialog's body outlives the dialog.** A change listener added to `#formBody` kept firing in
  the next dialog (renaming a trend) and threw. Listen on the elements the dialog made.
- **A label's markup is not its text.** Curve parameters are HTML (`<i>&tau;</i>`); stripping
  the tags left `&tau;` in the batch table's headings. `phPlain` decodes what it strips.
- **A test that returns a dialog's promise still waits forever.** `page.evaluate(()=>
  openBatchDialog())` hung a drive for ten minutes: write `()=>{ openBatchDialog(); }`.

- **A window with no way out reads as a wizard.** The Peaks window ended in Fit these peaks,
  Integrate them and Lines, labels and legend, so people thought they had to pick one to
  finish. A window that does a job ends in Done, and the rest is marked optional.
- **An implicit range is an invisible one.** The finder searched whatever the graph was
  zoomed to and said so nowhere, and changing a setting while zoomed changed the range too.
  The range is shown, typed, picked on the graph, shaded, kept with the set, and its own undo
  step.
- **An overlay can hide what it is for.** With the Fit window open after a fit, the draft's
  overlay drew only peak numbers, so label settings could not be seen where they were
  chosen. When the draft is the fit, the fitted labels are drawn.
- **A template literal in static HTML is printed as typed.** The Format dialog's footer showed
  `Formats ${ICON("chev","sm")}`. Static markup cannot call functions; scan it for `${` (strip
  the scripts, then search).
- **A backslash in a template literal is an escape.** A help example `\nu_{1}` would have
  become a newline and "u_{1}"; rich-text examples in `DOCS` double the backslash.

## Roadmap

Done in this round: graphs and projects, from a bug report. Deleting a project could leave its
graphs on the desk and the next import going into it (a store's events in the other order); a
graph in front that went away took the live plot with it. Both fixed. The taskbar names the
project its windows belong to, the project list says what each holds, new projects get names
of their own, the import dialogs name the project they add to, and exports name the graph.
Graphs plotted one by one are put together by holding and dropping (a graph by its grip, a
spectrum by its chip, onto a graph, its taskbar button or the desk; Ctrl keeps the graph
dropped; it scrolls on a phone), from menus, or in Combine graphs… with a layout; spectra
come from another project with their processing, peaks and colours.

Round before: finding and labelling peaks, from what people asked. The Peaks window
says where it looks (the spectrum, always shown, and From … to … typed, taken from the view
or dragged on the graph, shaded there, kept with the set) and ends in Done; the Fit window
says which spectrum and range it fits, and ends in Done too. Fitted peaks are labelled with
any of their number, name, centre, height, FWHM, area and share, or your own text; with
errors and units; above, inside, or in a row along the top with leaders; turned, marked,
boxed, dragged; each peak can be named, and its name goes to Results, the report and the
exports.

Two rounds before: many spectra at once. Global fits beyond Origin's NLFit: tick what every
spectrum shares (centres, widths, areas, shapes, the baseline, or parameter by parameter; a
curve model's parameters), each spectrum first fitted with those held so the fit starts where
it belongs, one block-sparse Levenberg–Marquardt problem, every row a normal fit that says what
it shares, errors from the whole covariance, out of date when any spectrum changes. The same
peak followed across the spectra, from the peaks found in each fit or marked in the Peaks
window, with one label for all of them and trends of their positions with no fit. Trend graphs
on the desk: several quantities, left and right axes, lines with slopes, SVG, PNG, the report.
Each spectrum keeps its file's header, and a field that differs (a temperature, the time it was
taken) is what a series can be plotted against.

Three rounds before: figures for papers. Super- and subscripts, Greek letters and symbols in
every title, legend entry and label (`cm^{-1}`, `\alpha`), with buttons and a word
processor's keys; arrows drawn by dragging, their heads snapping to data points, with heads
of four kinds; insets made from a zoom, dragged and resized, outlined on the graph with
lines to the inset; guides that line text up with the plot's centre and other text; an
export for a journal column or a slide (sizes, the tick numbers at a size in points in
print, lines scaled with the text or not, SVG at its size, PNG with its dpi recorded, TIFF,
transparent backgrounds, a preview); formats saved by name and used on any graph in any
project, with five of Kurve's; a toolbar that keeps to one row at every width.

Four rounds before: formatting the graph like a word processor, beyond Origin's Plot Details.
Each kind of text (title, axis titles, tick numbers, legend, labels, fitted peak numbers) has
its own font, size in points, bold, italic, underline and colour; a real font picker (each
name in its face, search, web fonts that look the same everywhere, which fonts this computer
lacks, any name, this computer's fonts) and colour picker (smooth, hex, recent, eye dropper);
fonts embedded in exports. Axes: position (an edge, zero, a value, set off outward), line,
ticks in, out or both with their lengths and widths, mirrored or not, numbers turned, titles
placed along the axis and dragged anywhere, typed in place; axes dragged by their numbers.
The frame as a box, the axes only or none, quick styles, a styled grid, a background, margins
measured from the text. The legend's columns, size, samples, box, and a place below the graph.
The Format dialog as a pane of pages with live preview, moved by its title bar, used on every
graph at once. Labels and text over several lines, turned to any angle, in a box, aligned,
pinned to the plot or centred in it; lines and ranges with their text placed and their edges;
richer right-click menus on axes, titles, the legend and annotations.

Five rounds before: batch fits and trends. The analysed spectrum's fit fits every spectrum,
started from its result, from the neighbour in the series, or from the peaks found in each;
every result is a normal fit (drawn on every graph, in Results with its notes, a Fits box in
the History, replaced by a fit by hand, out of date when its processing changes). The Batch
window's table (each peak's centre, height, FWHM, area and share, or each curve parameter,
R², χ², band integrals and ratios) and trend plot against the order, a number in the names,
or typed values, with a weighted straight line (slope ± error). CSV, SVG and the report.
A fix to the runs test and peak checks, which read the analysed spectrum instead of the
fit's own.

Six rounds before: several graphs per project, each in its own window, beyond Origin's:
one graph per spectrum in one command, tiled; click any graph to work on it (its zoom,
spectrum and drafts come back, every window follows); only the graph in front is live and the
others are pictures redrawn when what they show changes, so twelve graphs cost little more
than one; linked X zoom; chips, a ⋯ menu per graph, a Graphs button in the taskbar; a box per
graph in the History with its log lines and discussion; all graphs as one lettered figure,
every spectrum in one CSV, every graph in the report; importing many files, or every column
of one file, as one change with a graph each; applying a step to every spectrum with
settings measured on each; graph windows placed per project.

Earlier still: two interface styles, Bench and Graphite, chosen in Window › Style, with
every control drawn from tokens (sliders with a filled track, switches, checkboxes, radios,
lists, segmented controls, windows) instead of the browser's own look.

Earlier still: a Help window (an article for every window, tool and step, search, a "?"
on every window, F1), and a review of every window: explanations moved into Help and
tooltips, one-line empty states (the History of an empty project included), short status-bar
hints and toasts, spectrum pickers only when there is a choice, forms that stop at a
readable width, and the Peaks window's sections in one style.

Earlier still: integration without a fit (bands dragged on the graph, local baselines,
areas with noise-propagated errors, heights, positions, FWHM, shares and ratios to a chosen
band, windows around the peaks, every spectrum at once, a Bands box in the History, the CSV and
the report) and the Overview of a new spectrum (spacing, noise, bands, spikes, flat tops,
background, and first steps that open their tools), opened after an import.

Earlier still: worksheet formulas in Origin's F(x)= row, the fill handle (series and
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
1. Figures, further: axis breaks, a second X axis in other units (wavelength over Raman
   shift), graph layers and panels of different spectra, PDF and EPS, formats kept in the
   project for colleagues, boxes and ellipses on the graph
2. Getting around: a command search (Ctrl+K), a visible undo list, flow chart zoom and packed
   lanes, keyboard access to annotations and peak handles, handles for shape parameters
   (Lorentz fraction, Pearson m, Fano 1/q)
3. Many spectra, further: a parameter that follows the series in a global fit (a centre
   linear in temperature, a rate from Arrhenius), trend graphs formatted like any graph, the
   files' header fields as rows of the worksheet, global fits in a worker
4. More files: JCAMP-DX, then SPC; OPUS and SPE last
5. Under the hood: a UI test script in `tools/` (Playwright) that runs every example end to end;
   speed with hundreds of spectra
6. Collaboration follow-ups: mentions, a comment that proposes settings for a step and can be
   applied in one click, unread markers; Python steps that re-run on their own when asked

## Known gaps

- Help cannot be opened over a dialog (a dialog makes the desk inert), so the import wizard
  and the Format dialog have no "?" of their own; their articles are in the contents. Articles have
  no pictures, and search matches words, not meanings
- A global fit shares a parameter's value exactly: a parameter cannot follow the series (a
  centre linear in temperature) or be tied to another parameter across spectra; it runs on the
  page, so a large one holds the page for a few seconds, and stops at 900 parameters. It needs
  the template's peaks in every spectrum (not with the peaks found in each)
- Fitted peak labels are styled as a set (one font, colour rule and box for all); a label can
  be moved on its own but not restyled on its own. In a row along the top they can sit under
  the legend. A peak's name reaches a batch fitted from the template's peaks, not one fitted
  from the peaks found in each spectrum
- Peaks are matched across spectra by position alone, nearest first: two bands that cross
  along the series swap tracks. A marked peak's trend gives its position and the Y at its top,
  not an area (integrate it, or fit)
- Trend graphs have their own fixed style (not the Format dialog), linear axes only, and
  plot every quantity against the one series variable of the project
- Combining: a spectrum is held by its chip on a graph that is not in front, not from the live
  graph's legend or a worksheet column; a graph merged into another brings its spectra, their
  styles and its labels, not its axes, titles or format. Bringing in copies (a later change in
  the other project does not follow), and leaves behind fits, band windows, comments and
  trends; a computed column arrives as its values
- Several graphs: the X zoom is linked, not Y or the pointer; there are no graph layers or
  graphs with panels of different spectra, and no keyboard shortcut to step through
  the graphs (the browser keeps Ctrl+Tab); a picture shows no readout until it is clicked. A
  graph's annotations stay on it if one of its spectra moves to another graph
- A batch import reads each file with the automatic choices (the single-file dialog's
  overrides of delimiter, decimal mark and start line apply to one file). Each spectrum keeps
  its own header's fields, but they are not rows of the worksheet, and the project's own
  metadata is the first file's
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
- Double Y puts every other spectrum on one right axis; there are no free graph layers or
  per-panel settings in the stacked layout. An inset shows the graph's own spectra over a
  range, overlaid or offset, never in a heat map, and not another graph
- Annotations: no boxes, ellipses or curved arrows; rich text is scripts and symbols only (no
  bold or italic inside a text, no nested scripts); snapping is text to text and to the plot's
  centre, and an arrow's head to data points; nothing can be nudged with the keys
- Export: no PDF or EPS (SVG is the vector format); formats are kept in the browser, not in
  the project, so a colleague does not get them; a raster larger than the browser's canvas
  (about 16 000 px a side) is refused with a reason
- Fonts: web fonts come from Google Fonts, so offline only installed fonts show; an export
  embeds a web font only if it arrives within 10 s; a font is judged installed by its widths
  against two fallbacks, so one that measures exactly like one of them reads as missing
- Axes: an axis at zero or at a value stays at the bottom in stacked panels, and Y stays on
  the left with two Y axes; numbers turn 0°, 45° or 90° (Y: 0° or 90°); no axis breaks, no
  second X axis in other units, and titles are dragged in pixels, so a resized graph keeps
  the offset, not the proportion
- A peak set follows its spectrum's processing, but not a change of the finder's settings made
  while another spectrum is analysed: "Every spectrum" applies them to all. Two identical
  spectra overlaid draw their labels on top of each other
- Worksheet formulas are whole-column (row by row); there are no cell formulas, no references
  to other rows (`B[i-1]`), no relative formulas when filling right, no replace in find, and
  sorting never reorders the recorded data (by design)
- Binary instrument formats (SPC, OPUS, SPE) and JCAMP-DX are not read; text exports only
- The preview pane serves a snapshot of the file, so `location.reload()` re-runs stale code —
  navigate to the file again after editing, or you will test the previous version
