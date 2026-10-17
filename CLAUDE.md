# Kurve: collaborative Origin-style data analysis

Single-file web app (`kurve.html`): HTML, CSS and vanilla JS, no build step, no dependencies
besides Google Fonts. Open the
file in a browser to run it. The file uses CRLF line endings;
keep them (see the rules at the end). **DESIGN.md** records why the interface looks and
behaves as it does (contrast, menus, typing, the worksheet's conventions); every round that
changes the interface updates it with the decision and the reason.

## The screen

A desktop-style frame, top to bottom: a title bar with the **menus** (File, Edit, Data, Plot,
Analysis, Statistics, Spectroscopy, Window, Help; the tree is `ux/spec/menus-after.txt`; each short, its kinds opening side submenus on
hover, and a tool opening its dialog) and the project name (click to rename; the arrow
beside it switches, creates and deletes projects); a **toolbar** (the Project Explorer's switch, Import, Export, undo/redo,
the pointer tools Zoom / Pan / Mask / Label / Arrow / Shape (a box or an ellipse, chosen from its menu) / Comment (in a
shared project only), show-all, and the Reverse X / Log Y / Grid toggles, off until there is data; it keeps to one row, dropping labels
in stages while it would wrap and last the Explorer's switch (not on a phone), `fitToolbar`); the **Project Explorer** docked at the desk's left
(the project as a tree, as Origin's: folders and subfolders of your own, the worksheet, each file
imported with its spectra and data columns, every graph, closed ones marked hidden, and the trend
graphs; Alt+1 or the toolbar's first button shows it, its edge drags; 220 px wide, and below 1600 px a
drawer over the desk);
the **desk**; and a **status bar**
(tool hint, live cursor readout, point counts, fit state, save state). A gear at the title bar's right
opens **Preferences** (File › Preferences…, Edit › Preferences…, Ctrl+,): whether a history of
changes is kept (off, nothing but errors is logged), the theme, the style, animations, what
opens after an import, and the errors met, all kept per browser. Window › Theme picks
light or dark, and Window › Style the look of the interface: **Bench** (the default: IBM Plex,
blue for everything you can change) or **Graphite** (Geist, black and white, blue only for the
keyboard focus). Both are remembered per browser; neither changes the graph's colours. Both are
made for screens with little contrast: a desk darker than its windows, dark window edges, the
front window's title bar filled, and whatever is on, chosen or in front filled rather than
tinted (DESIGN.md; `tools/contrast-test.mjs` checks the ratios).

The desk holds **windows**, as in Origin: Graph, Worksheet, History, Overview, Peaks,
Integrate, Fit, Results, Batch, any number of Trend graphs, Statistics, Discussion, Help, and the transient Tool dialog. Each moves by its title bar, resizes from
its edges, maximises on a double-click of the title, minimises to the **taskbar** along the
bottom of the desk and closes with its ×; opening, closing, minimising (into its taskbar
button), restoring, maximising, tiling and the dock animate briefly, as a desktop's windows do. As a workbook keeps a tab per sheet, the project's
**documents** (its graphs, the worksheet, its trend graphs) always have a taskbar button and
minimise (a graph can also be closed: off the desk and the taskbar, kept in the project, and
opened again from Window › Graphs); **panels** (History, Peaks, Fit…) are in the taskbar only while open or
minimised, so a panel never opened is in no list. An open window's button is raised with a
bar under it (the front one in colour), a minimised one's flat with no bar, and the words keep
the text colour in both. The taskbar starts with the project's name (every window on the desk
is that project's; click it to switch), groups more than four graphs (or three trend graphs)
under one button, puts what does not fit in one row under a "n more" button (least recently
used first, never the front window), and has Tile and Cascade. **Window** lists the windows in
use as Excel's Switch Windows does (the front one ticked, minimised ones marked; a search past
a dozen), **Window › Tool windows** every panel ticked while in use (Origin's View menu), Minimise
the others, Close the tool windows, Graphs (every graph, Combine graphs…, A figure of panels…, the linked
zoom), and Theme and Style as submenus. Every title bar has a **?** that opens
the window's article in the **Help window** (F1 does it for the window in front; a tool's
opens its step's article). The **dock** (UX_SPEC §3.2) is a column at the desk's right where the
tool windows open as tabs (Fit, Results, Peaks, Integrate, History, Statistics, the Overview,
Help, Discussion, the processing tools; Batch floats), one shown at a time; the
documents share what is left, and get it back when it empties. Its left edge sets its width
(360 px below 1320, 380 below 1700, 420 above); a tab double-clicked takes the whole desk,
dragged out floats (as does the title bar), and the title bar's dock button docks it again.
Below 1100 px, or when a 480 px graph and a 300 px worksheet would not fit beside it, it is a
drawer over the documents, with a pin and a button that puts it away. A first visit opens the
Worksheet alone, across the desk: nothing is plotted until the user plots it (select columns
and press Plot; an import's message offers to; a file dropped on the window is plotted), and a
graph then shares the desk with it. History opens in the dock with a column's first
processing step (unless the history is off). A project can
have **several graphs**, each in its own window (Plot › New graph: with the analysed
spectrum, with every spectrum, or one for each spectrum, tiled): the one clicked is worked on
(it is drawn live, its spectrum is analysed and every window follows), the others show a
picture and chips naming their spectra; each has a ⋯ menu (rename, spectra on it, duplicate,
export, delete), the X zoom is linked between them unless switched off, and with more than
four the taskbar gathers them under one Graphs button. Graphs plotted one by one are put
together by holding and dropping: a graph by the grip in its title bar onto another graph
(or its taskbar button) merges into it, a spectrum's chip adds that spectrum (or, dropped on
the empty desk, gets a graph of its own); Window › Graphs › Combine graphs… does it from a list, and
File › Copy from another project… copies spectra between projects. Graphs can also be
the **panels of a figure** (Plot › New graph › A figure…, Window › Graphs › A figure of panels…, a graph's Put in a figure, or a
graph dropped on a figure): one window with the graphs in rows and columns, their plot areas
lined up, X or Y shared, lettered (a), (b)…; the panel clicked is worked on. The **graph window** has its own bar repeating the Data, Plot, Analysis, Statistics
and Spectroscopy menus, then **Original / Processed / Both** (what the graph shows; only once a
column has processing, `anyProcessing()`, which also gates the worksheet's Original/Processed
sheets, Data › Show on the graph and the statistics' data switch: a first user has nothing to
compare), and a chip saying which stage of the processing is shown when it is not the final
data. Right-click on a curve (or Shift+F10) gives its
colour, plot type and style, then Add here (a line, text, a peak label, a shape, a title or a
comment where you clicked), Format graph…, Copy the graph as a picture and Export; on the empty
plot, Add here's items themselves; right-click a line, a label, the legend, a title or an axis's numbers for
its own options. Lines, shaded ranges, text, peak labels, the legend, the titles and the axes
(by their numbers) drag with the pointer; a double click (or Enter) on a label, a text or a
title opens a box over it to type in (Shift+Enter for a new line), and one on a line, a range
or an axis's numbers opens its page of the **Format dialog** (Plot › Format graph…): pages
for each spectrum and the fit, each axis (title and where it sits, scale, position: an edge,
zero or a value, set off outward; line, ticks, numbers; breaks), a second X axis in other
units, the frame and grid (with quick
styles), the text (each kind its own font, size in points, bold, italic, underline, colour,
like a word processor), the legend (place, columns, size, box), the layout and colours, and
the labels and lines (each with its own text, style, turn, box and place). The **Peaks
window** (Spectroscopy › Find peaks…) finds the peaks of the analysed spectrum and marks them on
the graph, each with a symbol, a drop line, a vertical line, a leader or nothing, and a label
you type (in its table, on the graph, or in the History); fitting them is one button, not
the way in. The **Integrate window** (Analysis › Integrate…) measures bands without a
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
**worksheet** is a spreadsheet grid as in Excel, with Origin's label rows: an **Original** sheet
(the data as typed or imported, editable, every change in the original-data record, unless the
project locks it) and a **Processed** sheet (the active column after processing, read only). An
import puts every column of the file there, as X, Y, error bars or other data (not plotted),
and plots nothing: columns are plotted when ready, by selecting them and pressing
**Plot** on the worksheet's bar, or in **Plot setup…** (kinds as pictures, X, the Ys ticked,
the graph, a sketch). Columns move by dragging their letters, their values align left, centre
or right, and the value box above the grid is a formula bar. Every text on the graph is
written in **LaTeX**, typeset by Kurve in the graph's own font (and so in every export), and
typed in place in one box with a preview; the legend is selected by a click and its entries
typed over; everything with text has one right-click menu order. Files **dropped** on the window are read with the automatic
choices and plotted at once (on the graph they are dropped on, a new graph, or a folder of
the Explorer), with "Read it differently" to undo and open the dialog. Error bars are Y or X,
both ways or one side, drawn as bars or a band; an axis can be linear, log, ln, log₂, 1/x,
1/(x + c), √x or a probability scale, numbered as dates and times, and have a second Y axis in
other units. A series of spectra can be drawn as a **map** (the heat map layout) against its
series variable at real spacing, as an image, filled contours or contour lines with their
levels, and cut at one X or one value; points can be joined by splines, symbols coloured or
sized by a third column (with a legend of the sizes), the area between two spectra filled,
fills hatched, and the graph copied to the clipboard as a picture. A column's values can be
a **histogram** (a spectrum of its own, made by a step, drawn as columns), and the spectra on
a graph **boxes or violins** side by side; a figure's panel can span several cells; a fit
can include the **X errors** (orthogonal distance regression). Below 860 px the windows stack in one column,
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
  `fillSeries(o, n)` makes the worksheet's fills (linear and growth series with a stop
  value, evenly spaced on a linear or log scale, row numbers, a list repeated, uniform, whole,
  normal and Poisson random numbers from `mulberry32(seed)`, a straight or growth trend through
  the values above), cleaning floating-point dust at the step's precision, refusing in words,
  at most `FILL_MAX` values; `lgammaFn` (Lanczos) and `poissonRand` (multiplication below a
  mean of 30, Hörmann's PTRS above) serve it.
  `polyfit` fits about the mean of X and shifts back, so a wavenumber axis is not hopeless;
  `lineFit` (the trend lines) is a weighted straight line about the mean of X too, and returns
  null when the X values do not spread beyond 10⁻¹² of their size.
  `compileExpr(src)` compiles a user's formula into a tree of closures, never run as JavaScript
  (so it works under a strict content policy, and nothing but arithmetic can run): numbers, `x`,
  names, `+ - * / ^` (or `**`), parentheses, `EXPR_FN` (exp, ln, log = ln, log10, sqrt, abs,
  trig and hyperbolic, erf, erfc, pow, min, max, sign, step) and `EXPR_CONST` (pi, e). Lines
  like `u = (x - xc)/w` name values for the lines below; the function is `y = …` or the last
  line; every other name is a parameter, in order of appearance. Errors are thrown with a
  message in words and `line`/`col`, limits included (more than 4000 parts on a line, brackets
  nested more than 200 deep), so a stack overflow never reaches the user. Lookups use `hasOwnProperty`, so `constructor(x)` is an
  unknown function, not `Object`. `compileExpr(src, {allowNone:true})` accepts a formula with
  no parameters (a worksheet column's). `guessUserParams(names, X, Y)` starts parameters from their
  names (y0/c baseline, A/H height, xc/x0 position of the largest point, w/sigma a tenth of the
  range, t/tau a third, k a rate, m a slope, anything else 1). `erfFn`/`erfcFn` are accurate
  to double precision (a series below 2.5, a continued fraction above).
  **Distributions**: `quantileSorted(s, p)` (type 7, as R and Excel's QUARTILE.INC),
  `boxStats(vals)` (`{n, min, max, q1, med, q3, iqr, lo, hi, out, mean, sd}`, whiskers at the
  furthest values within 1.5 IQR, Tukey), `kdeBandwidth` (Silverman: 0.9 min(SD, IQR/1.34)
  n^-1/5), `kdeAt(vals, xs, bw)` (Gaussian kernels, cut at 8 bandwidths), `niceWidth(w)` (the
  nearest of 1, 2, 2.5, 5 times a power of ten, by ratio), `histBins(vals, {rule, n, w,
  start})` (`fd` Freedman–Diaconis, `sturges`, `sqrt`, `n` bins, `w` a width; at most
  `HIST_MAX` bins; `{edges, counts, w, start, k, n, out}` or `{fail}` in words), `fmtW`.
  **Errors in X**: `odrFit(f, X, Y, SY, SX, p0, fixed, opt)` is orthogonal distance regression
  (as ODRPACK): it minimises the sum of ((y − f(x + d))/sy)² + (d/sx)² over the parameters and
  every point's shift d at once, by Levenberg–Marquardt with the shifts eliminated point by
  point (a Schur complement: each d moves only its own point, so a step costs an ordinary
  fit's); the covariance is the whole problem's. With `SY` null the Y scatter s, one value for
  every point, is found in rounds so that the reduced χ² is 1. A point with no X error keeps
  its X. It starts from `lmFit`'s result, settles when χ² stops falling or neither the
  parameters nor the shifts move (the first step moves the shifts alone), and returns
  `lmFit`'s fields plus `odr {s, iter, conv, rounds, dx}`. For a straight line with the same
  errors everywhere it is Deming regression.
- **Pipeline** (`==PIPE:START/END==`, pure, after PEAKS): the processing steps. `PIPE_OPS` maps an
  op to `{group, rank, label, short, help, params (a schema the panel renders), defaults,
  init(d, ctx) (suggested settings measured from the data the step will receive), summary,
  run(d, p, ctx) -> {d, extra, note, warn}, deps?, pick?}`. A series `d` is `{x, y, e, idx,
  xn, xu, yn, yu}`: idx is the raw row of each point, and the names and units travel with it
  because some steps change them (Raman shift, unit conversion, normalize). Ops: correct,
  crop, exclude, despike, sort, dedupe, resample; bg (arPLS, ALS, airPLS, ModPoly, I-ModPoly,
  SNIP, rolling ball, anchors with spline/PCHIP/lines, line, constant; all through one banded
  `whittaker` solve or `chebFit`); smooth (Savitzky–Golay, moving average, median, Gaussian,
  Whittaker); shift (wavelength to Raman shift), xunit, calib (reference peaks, `CAL_REFS`,
  Raman standards and gamma lines), ecal (channels to energy: E = a·ch + b + c·ch² from typed
  coefficients, or fitted to `pairs` `[{ch, en}]`, each channel refined to its peak's top by
  `peakTopNear`; names X `xn`/`xu`, keV by default), xlin (with an optional new name and unit);
  norm; scale (with an optional new Y name and unit, `yn`/`yu`: Count rate, counts/s), ref (another spectrum, interpolated), combine (mean, median or sum with
  other spectra, the spread as error bars), deriv, cumint (running integral), fft
  (zero-phase Butterworth low- or high-pass, `fftFilter`, ends mirrored), log, absorb, km,
  bose; hist (Statistics › Histogram: the values of Y, or of X, counted into `histBins`'
  bins, as counts, probability, percent or density, cumulative or not; X the bin centres named
  after the values (`d.yn0`, the source's value name, carried into a derived spectrum's input
  by `pipeOf`), `idx` negative, `bins {w, start, n, out}` for drawing; a start param is
  `blank:true`, empty for automatic, which `wireStepForms` writes as null); python ("Stored result
  (Python)": a step from a project made while Kurve had Python, which replays the output it
  stored, `{x, y, e?, xn?, xu?, yn?, yu?}`, and cannot be run or changed; in no menu, no
  settings; `stepPKey` keeps its output out of the cache key; the report prints its code).
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
  `peakSearch(X, Y, o)` is the finder behind Spectroscopy › Find peaks. Methods `max`, `window`,
  `deriv1`, `deriv2`; `log` searches on log10 of the data; `smooth` is `"auto"` (half the
  narrowest clear band's width in points), 0 or a window; `thr` is `{mode, v}` with modes
  `snr` (prominence over `noiseSigma`, default 4), `pct` (of the largest), `abs` and `decades`
  (below the largest); every mode but `abs` also needs three times the noise. It returns
  `found` and `rejected`, each candidate with `x, prom, promLin, h, base, snr, w, wPts`, and a
  rejected one with `code` (`thr`, `noise`, `spike`, `wide`, `sep`, `max`) and `why`, in words;
  `noise` counts maxima of the noise itself. A `deriv2` shoulder is measured against the lowest
  point within its own width, having no valley of its own. The noise a candidate's prominence
  is divided by is one figure (`noise:"global"`, the default), measured along the series
  (`"local"`, `localNoise`: second differences' median in stretches, a quarter of the global
  figure at least), or given per point (`sigma`, an array: counting statistics), taken where
  the candidate's base (its saddle) is; `res.noiseMode` says which (`given`), each candidate
  its `sig`. `findPeaks` stays for `detectBands` and the older tests.
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
  repeats, ties through `prep`, one set as an ordinary fit), `matchPeakTracks`, counting
  statistics (a Poisson continuum whose wiggles one noise figure takes for peaks and √N does
  not, with a weak line found), `matchLines`, and the fills (a series by 0.1 with no dust, a
  tiny step on a large start, stop values either way, growth, even and log spacing, lists, the
  mean and spread of each kind of random number from a seed, Poisson counts at small and
  large means, ln Γ, straight and growth trends), quantiles, boxes, kernel densities and
  histogram bins, and orthogonal distance regression (a line's slope not pulled flat by
  errors in X while an ordinary fit's is, its error against its spread over 300 repeats,
  Deming's closed form, no X errors equal to a weighted fit, the Y scatter found, a decay with
  errors in time). Run it after touching any of this.
  `matchPeakTracks(lists, {tol, dx})` follows the same peak through a series: each spectrum's
  peaks (`{x, w}`) join the track whose last position is nearest, within `tol` (0.5) of the
  larger FWHM (`dx` when neither has one), closest pairs first, two peaks of one spectrum never
  on one track; a peak matching none starts one. It returns tracks with `members [{s, k}]`, the
  median `x`, and `x0`, `x1`.
  `matchLines(peaks, lines, {tol, tolW})` names peaks (`{x, w}`) from known lines (`{x, name,
  i}`): a line within `tol` or `tolW` of the peak's FWHM, the nearest pairs first (equal ones to
  the stronger line), each line one peak at most; per peak `{line, j, d, alts}` (or `line:null`
  with alternatives taken by nearer peaks, or null), `n`, and `shift`, the median offset.
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
  **X errors in fits**: the curve and peak drafts carry `xerr` (default on when the spectrum
  has X error bars, `hasXErr(c)`), the Fit window's "Include the X errors" (`#wtx`, `#pwtx`);
  `runFit`, `runPeakFit` and `fitOne` (from the template's `xerr`) call `odrFit` with each
  point's X error (`xErrsOf(c, pts)`: half its X bar from `errGeom`, in the final X units) and
  its Y error if weighted; the fit stores `xerr:true` and `odr` (`odrNote`: s, iterations,
  converged; not the shifts). `weightText(f, ascii)` says how a fit was weighted everywhere
  (Results, the copied table, the report, the CSV); `fitWarnings` notes the Y scatter found;
  `fitStale` notices a lost X-error column; the prediction band uses s². A global fit does not
  use X errors. `fitUnits(f)` gives the units of the fit's own spectrum (Results, the copied
  table and the report used the analysed spectrum's).
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
  `mode:"meta"` with `key`, a header field (`metaParse`: a date and time (with its time zone, if
  written), a time of day (`tod`, unwrapped across midnight in the spectra's order), or a
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
  than fought), `parseMeta`, `detectRoles` (X is the first column that rises or falls steadily,
  else the first whose name matches `X_NAME`, an axis's name; with neither, `xi` is -1 and every
  column is a Y against its row number, error columns still found by name), `detectPaired`,
  `analyzeFile` (a last header line of units under a line of names, `isUnitsRow`/`isUnitWord`/
  `UNIT_RE`, fills the Units row: the names become "Sample A (OD600)" and `unitsAt` is the units
  line), and `checkColumns`
  which reports findings without applying them. `numNorm` reads numbers as documents write
  them (a minus sign −, superscript exponents 5×10⁻³, thousands set off by no-break spaces, or
  by plain spaces in a comma-decimal number, full-width digits and signs as an input method
  types them, １２，５) and refuses `0x`, `0b`, `0o` literals; `toNumber`
  and the worksheet's `parseNum` both use it. `unwrapQuoted` turns line breaks inside a quoted
  field that opens at a field's start and closes within four lines into spaces (a spreadsheet
  header cell written on two lines), before `analyzeFile` and the worksheet's paste split lines.
  `parseLineList(text)` reads a list of known lines as people write them (a name and a
  position in either order, an intensity, tabs, semicolons, decimal commas, `K 40 1460.8`, #
  notes; a line without a number skipped and counted). `parseFillList(text)` reads the Fill
  dialog's list (spaces, semicolons, or commas alone; decimal commas between spaces; the words
  that are not numbers returned in `bad`). `tools/parser-test.mjs` extracts this block
  straight out of the HTML and tests it under node (TKA files and line lists among the rest);
  run it after touching anything here.
  **Dates and times** (`timeOf`, `T_DATE`, `T_TIME`, in the block): an ISO date or date and
  time (with T, Z or an offset) is seconds since 1970 in UTC, `h:mm(:ss)` is seconds, year-first
  dates only; `toNumber` and `parseNum` read them, `splitLine` keeps a date and its time of day
  one field on whitespace, and `analyzeFile` returns `tkind` per column (`date`, `time`, null:
  80 % of its cells). A column made from one carries `tfmt` (`impBuild`, `batchFile`'s `xt`);
  the worksheet shows it with `tfmtText`, and a graph against such an X numbers its axis that
  way unless the axis's format is set (`buildPlot`, `timeTicks`).
  Files arrive through `readFileIn` (the Import button, Ctrl+O) and `importText`, which refuses
  binary instrument files with a reason (`looksBinary`). **The dialog never plots**: the
  columns go into the worksheet (`impGraphs(p, ids, "none", fresh)` closes an empty first
  graph), to be plotted from it. **Dropped files** (`setupDrop`) are read and plotted at once:
  `fileDropAt(x, y)` says where (a folder row `[data-xfold]` of the Explorer, a graph window or
  its taskbar button, or the desk) and the overlay's message says so (`#dzMsg`; the outline is
  the class `dropin`, never `fdrop`, the History's insertion line); `readDropped` reads them
  (60 MB at most each) and `autoImport(files, {gid, folder})` builds each with the dialog's
  automatic choices (a pseudo `S.imp` through `impBuild`), adds them as one undo entry and one
  record entry (a fresh project takes the files' name and header), files them in the folder,
  and `plotCols(ids, {into, noUndo, quiet})` puts them on the graph dropped on, the free first
  graph, or a new one; its toast offers "Read it differently" (undo, then the dialog). Every
  import gives its columns a file id `fid` and the file's name `file`, which the Explorer
  groups by.
  **The wizard's columns**: `S.imp.use` is what each column of the file becomes (`IMP_USE`:
  `x`, `y` a spectrum, `e` the error bars of the nearest Y to its left (else right,
  `impErrOf`), `data` (the worksheet's `ignore` role: kept for formulas, not a spectrum) or
  `skip`), started by `impUseDefault` (empty columns skipped; X,Y,X,Y only when
  `impPairsLikely`: `detectPaired` and every other column over much the same range as the
  first, else a "Read as X,Y pairs" fix). The table (`.impcols`, a `select[data-use]` per
  column, the name a `[data-pv]` button choosing the preview's spectrum, `impPv`) keeps the
  focus across its redraw. `impCols` is the preview's X (the nearest X to the left,
  `impXFor`, or the row number), Y and error. Error columns are `e` (±), `e+`, `e-` and `xe`
  (`impIsErr`; `impUseDefault` reads the kind from the name: `x err`, `dx`, a `+` or `−` at
  the end). `impGraphs(p, ids, how, fresh)` decides the graphs before the save (`how` is
  `none` from the dialog: fresh, the first graph is left open and empty, `cols:[]`, and says
  "Nothing plotted yet" with a Plot setup… button, `#emptyPlot`, instead of Import).
  `impBuild` makes the columns in the file's order (an X of row numbers when none is X; the
  fixes as steps on every spectrum; √N columns), `doImport` puts them in a new project, beside
  the project's (the first X shared with the last X column when `sameAxis`), or in place of
  it (the other graphs go), and `afterImport` brings the worksheet forward (`sheetForward`:
  it takes the graph's place) with a toast that plots them, or opens the graphs made (one
  spectrum: its History and Overview). A project just created is current only once the store
  lists it: `whenOpen(fn)` waits for it.
  **Many spectra at once**: several files chosen or dropped together go to `readFilesIn`.
  `batchFile(fname, text, opt)`
  reads a file into items `{fname, name, x, y, e, xn, xu, yu, n, x0, x1, meta}` (or `{fail}`
  in words), `batchImport(items, o)` lists them in a dialog (names editable; into this project
  or a new one; nothing plotted) and `doBatchImport` brings them in as
  one change: one undo entry, one log line, one raw-data record entry. A spectrum shares the X
  column of the one before it when `sameAxis`, and has its own otherwise; `impGraphs` and
  `afterImport` as above.
  **One column** (a multichannel analyser's counts, a line per channel): `analyzeFile(raw,
  {fname, tka})` marks `single`, and for a `.tka` name (or `tka:true`; `tka:false` refuses)
  reads the first two lines as live and real time (`res.tka`, into `meta` with the dead time;
  only when real ≥ live unless asked) and starts the data after them; `detectRoles` gives one
  column `xi:-1`. With no column as X the wizard's X is the row number ("The channel
  number", from `im.ch0`, 0 or 1), `√N error bars for the counts` (`im.sqrt`, for columns of
  non-negative whole numbers named or united as counts, `COUNT_NAME`, or from a TKA file
  (`impCounts`), with no error column, `impSqrtable`: an error column computed
  by the formula `SQRT_FX`, `sqrt(max(B,1))`), and the TKA line a `rate` fix (a `scale` step by 1/live, Count rate in
  counts/s). X is named Channel, Y Counts (counts) for TKA, the file's name otherwise (and
  beside other spectra); thousands of points are drawn as a line. `batchFile` reads one-column
  files the same way. A Y column whose X column holds no values is drawn against its row
  number (`rawSeries`, `anyVal`, xn "Row").
- **Columns and spectra**: a project is a table. `p.cols` is `[{id, role, name, unit, data, of?,
  pipe?, mask?, src?, from?, file?, meta?}]` (`file` and `meta`, the file a spectrum came from and
  its header's fields, `colMetaOf`, shown in its Original data box in the History) with roles `x` / `y` / `e` (an error column names its Y in `of`, and is one of six kinds, see
  Error bars) /
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
  `toggleColVis`, `deleteCol`. A spectrum may name its X column (`xcol`, honoured first by
  `xColFor`; `setXOf(yid, xid)`, the menu's Plot against and an X column's X of); a formula
  column that reads only X columns is an axis: setting it (`setColFormula`) or making it an X
  column offers `useAsXFor(id)`, which makes it X and points the spectra plotted against what
  it reads at it (`xReaders`), one undo entry. Making the analysed spectrum's column not a Y
  moves `activeY` on.
- **Raw data** is never changed by analysis, and its arrays are replaced, never edited in
  place. It is edited in the worksheet like any spreadsheet (typed over, cleared, pasted and
  filled over, rows inserted and deleted), each change one undo entry and an entry in the
  raw-data record, unless the project **locks** it (`p.rawLock`, in `UNDO_KEYS`; `rawLocked()`,
  `setRawLock(on)`: the lock button `#wsLockBtn` above the grid and Data › Lock the original data).
  Locked, empty cells can still be filled; typing over a recorded value opens `correctCell`,
  which asks for a reason and adds a `correct` step to the pipeline of every spectrum that uses
  the value; pasting over values offers new columns (`pasteAsNew`); Delete keeps values; rows
  cannot be inserted or deleted; a formula cannot replace recorded values. `rawFp()` is the SHA-256 of `rawText` of every raw column with data;
  `recordRaw(text)` appends to `p.raw.hist` whenever raw data changes (import, paste, a first
  value in a cell, a column deleted), and `rawVerified()` compares the data with the last
  recorded fingerprint. The raw-data CSV export writes exactly the hashed lines under `#`
  comments, so `grep -v '^#' file.csv | sha256sum` reproduces the fingerprint.
- **Worksheet** (`renderWs`, `setupWs`): a spreadsheet grid as in Excel, with Origin's label
  rows. Columns have fixed widths (`WS_W`, 100 px; `p.wsw[colId]` when dragged or autofitted by
  a double click on the header's edge, `wsSetWidth`, `wsAutofit`), never stretched to the
  window: empty "phantom" columns and rows fill the rest, and typing into one makes a column.
  Under the letters come Long Name, Units, Comments and F(x)= (rows -4 … -1, `WS_LABS`,
  `WS_TOP`, typed into like any cell) and a Sparklines row; only Long Name and Units show
  unless the corner's ⋯ (`[data-wsrows]`, `wsRowsMenu`) shows the others, per project and
  browser (`wsRowsPref`/`wsRowsSet`, `kurve.wsrows`); F(x)= shows itself when a column has a
  formula (`wsAnyFx`), and `wsLabShown`, `wsLabRows`, `wsLabSnap` keep the selection off the
  hidden ones. Rows are 22 px. A value typed into a cell that starts with `=` (`=log10(B1)`,
  as in a spreadsheet) moves to the column's F(x)= row, still being typed (`wsCommit` →
  `wsEditFormula(ci, init)`), with a toast that a letter is the whole column.
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
  goes; Ctrl+D and Ctrl+R copy the first row or column. Computed cells are never written, nor
  values while the raw data is locked (one undo entry); labels fill right. **The Fill dialog** (`openFillDlg(kind,
  {col})`: a column's Fill column with, a cell's Fill (`fillMenuItems`), Data › Fill; it is
  not on the bar, since a fill is done to a column): `FILL_KINDS` (series, growth series, evenly between two values, row
  numbers, repeat a list, random numbers with `FILL_DIST`, continue the trend), where
  (`fillTarget`: the selection, or the rows of the longest column; a column holding values
  there, chosen from one cell, gives way to a new one, with a role), `fillPlan(v)` (the
  dialog's values to `fillSeries`, the writes, the values `replaced`, or when locked the cells
  `skipped`, every refusal in words), the preview (cells, values, `fillSpark`), `doFill` (one undo entry, a
  raw-data record entry and a log line naming the fill and its seed); settings kept in
  `kurve.fill`. **Sort** (`S.wsSort`, `wsOrder`,
  `wsSortBy`) is the view only: `m.ord`/`m.inv` map sheet rows to data rows (`wsDR`), row
  numbers show the data row, and the data keep their recorded order; paste and fill ask to
  unsort first. **Find** (Ctrl+F, the search button; `wsFindOpen`, `wsFindRun`, `wsFindGo`,
  `S.wsFind`): every cell containing the text, labels included, marked `td.hit`; Enter,
  Shift+Enter and F3 step through them. `wsModel()` is the sheet (`S.wsm`: columns, row count, phantoms);
  rows are virtualised (`wsRows`, drawn around the scroll position). `S.ws` is the selection
  (`{r, c, ar, ac}`: the active cell and the anchor of a range, plus `extra`, `win`, `edit`).
  Click, Shift+click, drag, a header or row number, the corner; arrows, Shift+arrows,
  Ctrl+arrows, Home/End, Ctrl+Home/End, PageUp/Down, Tab and Enter move as in Excel (after a run
  of Tabs, Enter goes to the next row in the column the Tabs began from, `S.ws.tabFrom`, the
  `how` of `wsMove`); typing starts an edit (an input method's `Process`, `Dead` or composing
  key opens the box empty for its text), F2 or a double click edits in place, Esc cancels,
  Delete clears (`wsBeginEdit`, `wsCommit`, `wsSetCell`: a label, a value, or `correctCell` for
  a recorded value when locked). An edit (`S.ws.edit`) remembers its column by id (`cid`) and
  its data row (`k`), and `wsSetCell` writes there in the sheet as it is now (`wsLive()`: the
  model is made again when the project object is not the one it was made from, `m.p`), so a
  delayed save landing while the next value is typed loses nothing. A value that is not a
  number stays in the box, marked `.bad`, on Enter, Tab or an arrow (Esc gives the cell back);
  left by a click elsewhere, the cell keeps its value and a toast names what was not taken.
  `renderWs` puts a spacer as tall as the rows into the body before restoring the scroll, so a
  redraw never jumps to the top; `wsRows(false)` redraws only when the view leaves the rows
  drawn (at either end of the sheet the margin does not apply). A double click is read from
  the press itself (`e.detail === 2` in the mousedown: a cell opens, a resize edge fits, the
  fill handle fills down), the `dblclick` listener kept as a fallback (`S.ws.dblAt`). A move by
  the keys records `S.ws.want`: for 0.6 s the scroll handler brings that cell back if a scroll
  already under way (the wheel's smooth scroll) lands elsewhere; turning the wheel, or any
  new selection (`wsSelect`), clears it. Clicking
  a column letter, a row number, the corner or Ctrl+A makes the first cell the active one, as
  in a spreadsheet. `flushEdits` (on `pagehide`, `beforeunload` and the page hidden) enters a
  value still in its box and saves a delayed save at once, so leaving the page loses nothing. Rows: `wsRowsEdit("insert"|"delete")` (the cell and row-number
  menus; unlocked and unsorted only) moves every recorded column and, through
  `remapRawRows(p, fn)`, what names a raw row (masks, corrections, a peak label's `row`, a set's
  `ex` and `mem`, `S.sel`); one undo entry and a record entry. Copy and paste are TSV (`wsCopyText`, `wsPasteText`, the label rows
  included; a block pasted from A1 into an empty sheet is read as an import reads it, and with
  no X-like column, `detectRoles`, every pasted column is a Y and the sheet's empty X column
  moves after them, since `migrate` keeps an X column in every project). The bar above shows the cell's address (`#wsAddr`) and the **formula bar** (`#wsVal`:
  `#wsValIn` is typed into as Excel's, `wsBarBegin`, `wsBarEnd(dr, dc, stay)` (a computed
  column, or the F(x)= row, sets its formula through `setColFormula`; a value that is not a
  number is refused in `#wsValHint`), `wsBarCancel`), the alignment buttons (`#wsAlignSeg`,
  `wsAlignBar`), Plot (`#wsPlotBtn`: the quick list for the selected columns, or Plot setup
  with none, see Graphs), the lock and + Column, which lose their
  words in a worksheet narrower than 560 px (the `wsheet` container), the foot
  Count, Sum, Average, Min and Max of the selection (`wsStats`). Right-click is `wsCellMenu`
  (anchored by `pointerAnchor(x, y)`). `wsLetter(i)` names columns A…Z, AA…. The F(x)= cell
  opens for typing on one click (`wsEditFormula(ci)`). **Moving columns**: a mousedown on a
  letter of a whole-column selection starts a `colmove` drag (`body.colmoving`, `.wsmovebar`
  where they land, `wsMoveMark(x)`), and the column menu's Move (`colMoveItems`, Left, Right,
  To the start, To the end; `colMenuTargets` is the selection or the column) calls
  `wsMoveCols(ids, dir)` → `moveColsBefore(ids, beforeId)`: raw columns reordered among
  `p.cols` (derived spectra keep their slots), a Y whose nearest-left X would change gets its
  `xcol` pinned (and a redundant one dropped), the selection kept, one undo entry,
  `recordRaw` (the order is part of the fingerprint) and a toast with Undo. **Alignment**:
  `p.wsAlign` (`{colId: "l"|"c"|"r"}`, in `UNDO_KEYS`), `wsSetAlign(ids, a, toggle)` (the same
  button again clears it), `wsSelAlignIds`, `colAlignItems` (the column menu's Align); cells
  take `.al-l`/`.al-c`/`.al-r`. **Hiding** (Excel's Hide and Unhide): `p.wsHide` (`{cols:[column
  id], rows:[data row]}`, in `UNDO_KEYS`), a view only (hidden values are plotted, fitted and
  exported). `wsHideOf(p)` (cleaned of what is gone), `wsHideCols`, `wsShowCols(ids|null)`,
  `wsHideRows`, `wsShowRows(rows|null)`, `wsHideSave` (one undo entry, a log line, a toast with
  Undo), `hideItems()` (Data › Hide and show, the cell and row menus; the column menu has Hide,
  Show beside it, Show every). A hidden column stays in `wsModel`'s columns as
  `{hidden:true, w:WS_HIDW}`, a 6 px marked strip (`th.ch.hidc`, `td.hid`) so the letters keep
  their places; `wsMove` and `wsSelect` step over it (`wsVisCol`), and a double click on it shows
  the run of hidden columns there. Hidden rows leave `wsOrder`'s `ord` (`inv` null for them,
  `nd` the data's rows, `n` those shown, `hidR`), so `wsDR` maps around them; the row after them
  is marked (`th.rh.hidab`, `wsHiddenAbove`) and a double click on its number shows them. The
  address (`wsBar`) names the data row, as the row number does. The foot says how many are
  hidden, with Show. **Formula suggestions** (`fxsAttach(inp, {on, items})`, `fxsUpdate`,
  `fxsRender`, `fxsAccept`, `fxsKey`, `fxsClose`, `#fxSug` `.fxs`, `fxsOpen`): a list under a
  formula as it is typed, in the F(x)= cell (and a cell starting with `=`, `wsRestoreEditor`),
  the formula bar (`#wsValIn`) and a fit function (`#fbExpr`); `fxsSheetItems(self)` the columns
  by letter and long name (not the one computed), `x`, `i`, then `fxsBase()` (the functions from
  `FX_DOC`, `[args, what it does]`, and the constants, `FX_CDOC`); `fxsMatch` ranks by name
  prefix, then by a word of a column's name; `fxsSig(before)` the function whose brackets the
  caret is in and which argument. Keys: ↑/↓, Tab (Enter once an arrow has chosen), Esc
  (`_fxsHush` keeps it shut until the text changes), Ctrl+Space; its keydown is attached before
  the field's own, and the modal key handler leaves it Escape, Tab, Enter and the arrows; a
  letter after a digit (`1e5`) is a number. `wsFxHint` says an unfinished formula (an error at
  its end, or a name that a function starts with) quietly and marks a mistake inside it.
  `wsBarEnd` sends `=…` typed for a value to the F(x)= row, as `wsCommit` does. **The
  selection** is drawn by `td.in` (the `--ws-sel` fill)
  with 2 px edges on the range's outside only (`et`/`eb`/`el`/`er` setting `--et`… in one
  inset box-shadow), `td.cur` (a 2 px edge on the panel; with animations on, `wsCursor` draws
  it instead as `.wscur`, one frame in the scrolled content under the sticky headers that glides
  to the active cell in 90 ms, snaps on a jump of more than a screen or a redraw, hides while a
  cell is typed in, and `.ws.glide` takes `td.cur`'s own edge away), `th.hs` (a selected column's or
  row's header, tinted with a 3 px bar) and `th.hsel` (a whole selected column's letter,
  filled solid, the grab cursor). There are no colour swatches in the headers: a spectrum's
  colour belongs to the graph.
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
  (and onto every spectrum if `all`; a spectrum's first step opens History in the dock),
  `cancelTool` drops it. `stepById`, `colOfStep`,
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
  open, max, z, dock}`, saved per browser under `kurve.layout` (version 3, with `dockOrder`,
  `dockW` and `dockPin`; an older layout is ignored; every window state read back goes through
  `saneWin`, so NaN or absurd sizes put the window back where it starts). **The dock**: a
  window's `dock` (its default `WINS[id].dock`) puts it there while open (`isDocked`,
  `dockIds` in `dockOrder`, `dockRemember`/`dockForget` on opening and closing); `dockGeo()`
  is `{W, H, ids, on, dw, drawer, docsW}`, `deskSize()` the documents' part, which every
  fraction of a floating window is of; `applyWins` shows the docked window in front (highest
  `z`) below `#dockBar` and hides the others, a drawer's at z 8000, and `renderDock` draws the
  tabs (`[data-dtab]`, `[data-dclose]`, `[data-dpin]`, `[data-dhide]`) and puts `#dockEdge`
  over whatever window it touches; `wireDock` (tabs, keys, drag out, the edge), `undockAt`,
  `setDocked` (the title bar's `[data-wdock]`; a title-bar drag of 16 px undocks). Tile and
  Cascade leave the dock alone. **Motion** (`winMotionBegin`/`winMotionEnd` around `applyWins`'
  loop): the style rectangles before and after, and `WIN_VIS` (shown and minimised after the
  last layout). A window shown is `winIn` (from its taskbar button, `winTkRect`, when it was
  minimised; a docked one fades, so a tab change cross-fades; else it grows from 0.97); one
  closed or minimised is `winOut` (kept shown as `.wout`, inert and deaf to the pointer, at its
  old rectangle until it has faded or shrunk into its button, `S.winMinAnim` set by
  `minimiseWin`; reopened, `winStop`); one moved is `winFlip` (a transform from the old
  rectangle, 200 ms; at most 12 at once). Nothing animates while a pointer is down (a drag calls
  `applyWins` every frame), on the first layout, when the desk changed size (unless
  `S.animLayout`, set by the Explorer's switch), at phone width, or with `animOn()` false. Menus
  (`.still` when moving along the bar, `.up`, `.sub`), dialogs, pickers, the toast (and
  `hideToast`'s fade) and the Explorer animate by CSS keyframes on the individual `translate`
  and `scale` properties, so their own `transform` (the toast's centring, a dialog moved by its
  title bar) is kept; `details.grp`/`.more` slide where `interpolate-size` exists. `splitInto` gives a new graph its place: beside the worksheet
  (which keeps 300 to 44 %), else side by side, else stacked, never narrower than 480 px;
  else it takes the old graph's place and the old one is minimised. A window is open, minimised (`min`, its taskbar button kept;
  `minimiseWin`, the title bar's –, a click on the front window's button, tiling that leaves
  windows out) or closed (`closeWin`, the ×, a Done button: out of the taskbar). Documents
  (`isDoc`: graphs, the worksheet, trend graphs; `docWinIds`) keep their buttons
  (`keepsBtn`, all but a closed graph, `winShut`); a graph window's × closes the graph
  (`closeGraph`, see Graphs), and the others have none; panels (`panelIds`) are in the taskbar only while `inBar`, news or
  not. `barWinIds` is the windows in use in the taskbar's order. `renderTaskbar` draws the
  documents (graphs past four as `[data-tk-graphs]`, trend graphs past three as
  `[data-tk-trends]`), then the panels, then `fitTaskbar`, which hides the buttons that do not
  fit (panels before documents, minimised before open, the lowest `z` first, never the front
  window) into `S.tkMore` behind `[data-tk-more]`. `winMin`, `inBar`, `winStateName`,
  `frontWinId`; `winItem` (the front one ticked, "minimised" as a note), `panelItems`
  (Window › Tool windows: ticked while in use, a click opens or closes), `winFinder` (every window
  in use, searched), `windowItems` (the Window menu). `openWin(id, {render})`, `closeWin`, `toggleWin`, `focusWin`, `toggleMax`,
  `tileWins`, `cascadeWins`, `resetWins`, `renderWin(id)` (which window renders what),
  `renderTaskbar`, `setupWins` (move, resize, min/max buttons, and the "?" `[data-whelp]`
  that opens `helpFor(id)`). `renderAll` renders only open
  windows; a window renders when it opens. `showTab("fit"|"clean")` and `showDrawer(...)`
  remain as names for opening the Fit, History, Results and Discussion windows. `wireWin(el)`
  wires one window (the static ones at boot, a graph or trend window when it is made). Graph windows
  are placed per project (`saveGraphLayout`, `restoreGraphLayout`: `LAYOUT.proj[pid]` for a
  project with several graphs, `LAYOUT.single` for one graph), so twelve tiled graphs do not
  leave the next project's graph tiny.
- **Project Explorer** (`#xpl` in `.work` beside the desk, `#xplSplit` its edge): the project
  as a tree, as Origin's. `p.tree` (in `UNDO_KEYS`) is `{folders:[{id, name, parent}], at:{key:
  folderId}}`, read through `treeOf(p)` (folders whose parent is gone go to the top, `at`
  entries naming no folder dropped) and written by `saveTree(t, log, {noUndo, undo})`, which also
  drops entries for items the project no longer has (`xKeys`). Items are keyed `ws`, `f:<fid>`
  (a file: `xFiles(p)` groups non-derived columns by `fid`, else by `file` name, `"f:@"` for
  columns typed in the worksheet, listed only once something is typed), `g:<id>` (graphs, closed
  ones marked hidden with `i-eyeoff`), `t:<id>` (trend graphs); a file's children
  (`xFileKids`: its Y and data columns and the spectra derived from them) are `c:<colId>`.
  `xRows()` flattens it (folders open unless closed, files closed unless opened, `S.xplExp` per
  project; a filter `S.xplQ` keeps matches and their ancestors), `renderXpl()` draws `.xr` rows
  (`role=treeitem`, `aria-level`, a roving tabindex, `--lv` indent, `data-xfold` on folders and
  the project), called from `renderAll` and `renderTaskbar`. `xSelect` changes the selection in
  place (redrawing on the first click would lose the double click); `xOpen` opens (a graph:
  `showGraph`; a file or data column: `xRevealCols`, selected in the Original sheet; a spectrum:
  `goSpectrum`); `xMenu(r)` is each kind's menu with Move to; `xNewFolder`, `xRenameFolder`,
  `xDeleteFolder` (what it held moves up), `xMove` (no folder into itself), `xRenameFile` (gives
  an older file an id), `xDeleteFile` (confirmed; its columns and the spectra made from them,
  a record entry). `xFile(keys, folder)` files without an undo entry of its own (after a change
  that made one); `xNew(keys)` puts what is made while the Explorer is shown into the active
  folder (`xActiveFolder`: the folder selected, or the selected item's): new graphs
  (`plotCols`, `newGraphs`; a duplicate goes beside its source), trend graphs and imports.
  `wireXpl()`: keys (arrows, Home/End, Enter, F2, Delete, the menu key), HTML5 drag within the
  tree (`text/x-kurve-node`, `S.xdrag`; a drag counts only when its `dataTransfer` carries that
  type, since the row dragged can be redrawn away before its `dragend`) onto folders, and a
  spectrum, data column or file onto a graph window (plotted there); the splitter; Alt+1.
  `XPL` (`kurve.xpl`: shown, width 180–520, 220 by default) per browser; below 1600 px (`xplDrawer`) it is a
  drawer over the desk (`S.xplNarrow`, under the toolbar, or from the top on a phone), closed by
  opening an item or a press outside, so the windows keep a desk wide enough for them.
- **Graphs**: `p.graphs` (in `UNDO_KEYS`) is `[{id, name, cols, plot}]`; the first graph,
  "main", is `p.plot` (its name `p.plot.gname`, default "Graph 1") and shows every spectrum not
  hidden, or, once plotted from the worksheet or by an import, its own list `p.plot.cols`
  (`mainList`: `inGraph`, `graphCols`, `plotCfg`, `savePlot`'s hidden, `toggleGraphCol`,
  `combineGraphs`, `onePerSpectrum` and `bringIn` read it), so a column made later does not
  join it unasked; another shows `cols`, in order. **Closed graphs**: `plot.shut` (main's or a
  graph's; `graphShut`, `setGraphShut(id, on)` with an undo entry and no log line,
  `closeGraph` from the ×, the ⋯ menu's Close this graph) is the project's, so the graph is
  off the desk wherever it is opened: `syncGraphWins` closes a shut graph's window and opens
  one that was shut and no longer is (an undo, a colleague; `S.gshut` remembers per project),
  `saveGraphLayout` records a shut graph as open so its place is kept. `showGraph` opens a
  shut one; `graphsMenuItems` notes "closed" (Window › Graphs, the taskbar's Graphs button);
  the History's graph box says Closed with Open it. `mainFreeNow()`: the first graph closed
  with nothing on it, where the next plot goes. `plotBase(pl)` is a new graph's look from
  another's (no spectra, ranges, title, labels, list or state); `graphBase(from)` uses it.
  **Plotting** (`plotCols(cids, {type, layout, into, undo})`, one undo entry): a Y column as
  it is, an `ignore` column made a spectrum, a selected X column what the Ys are plotted
  against (each the selected X nearest to its left, `xcol`), into `into`, else the free first
  graph, else a new graph (with `plotBase` of the graph in hand); a graph coming onto the desk
  shares the worksheet's place (no graph open) or the front graph's (`splitInto`).
  `plotItems(cids)` is the menu (PLOT_TYPES, panels, offset, heat map, Add to a graph), from
  the worksheet's `#wsPlotBtn`, Plot › Plot the selected columns, the cell menu and the
  column menu (`wsSelColIds`, `plotTargets(cid)`); its first item is **Plot setup…**:
  `openPlotDlg(cids)` (also first in Plot, and what `#wsPlotBtn` opens when nothing plottable
  is selected), as Origin's Plot Setup: `PLOT_DLG_KINDS` as tiles drawn by `plotKindIcon` (a
  radiogroup the arrow keys move through; `S.plotDlgKind` remembered), the X column, the Y
  columns ticked with All and None and each one's error bars named, Into (a new graph or one
  of the project's), and `plotDlgSketch(st)`; OK is `plotCols` (or `histogramCols`). A
  `type` given to `plotCols` goes to every spectrum it plots, not only the analysed one. `ensureGraph()` (Peaks, Fit, Integrate)
  plots the analysed spectrum on a free first graph (open or shut) and opens a shut graph. `GID()` is the graph in hand (`S.gctx` while drawing
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
  and Ctrl, Alt or Cmd at the drop keeps the graph. `combineDlg(into)` (Window › Graphs ›
  Combine graphs…): which graphs, onto which (or a new one), the layout, keep or not.
  `syncGraphWins` moves the live plot out of a window before removing it (`rescueLive`). `tileWins` puts the graphs in a grid on the
  left (as near square as the desk allows, the last row stretched) and the rest in a column;
  when a graph would be under 250 × 235 px that way, the graphs take the whole desk and the
  other windows are minimised. A picture smaller than 250 × 160 px is drawn at that size and
  scaled down, so its labels never collide.
  **Figures** (panels, as Origin's graph layers and Merge Graphs): a figure is a graph in
  `p.graphs` with `fig = {rows, cols, cells:[{gid, r, c, rs, cs}], shareX, shareY, gap,
  letters, w, h}` and no spectra of its own; its panels are ordinary graphs (the first graph
  too) with no window of their own. `figOf(id)` (the figure a graph is a panel of), `isFigId`,
  `deskGraphIds` (the documents: figures, not their panels), `drawGraphIds` (what draws
  spectra: panels, not figures), `figOrder`, `figLetterOf`/`figLetter`, `graphTitle` ("Figure 1
  › (b) Graph 3"), `figNb` (the sides another panel touches). `winOfGraph(panel)` is the
  figure's window (`section.win.gwin.figw`: `.fbar` chips `[data-fpanel]`, `.figgrid` of
  `.fcell[data-fcell]` made by `figCells`); `winShut` counts a panel as shut, so the first
  graph's own window closes while it is a panel and comes back after (`S.gshut`). `layoutFigs(only,
  {quiet})` (in `renderAll` before `renderPlot`, and on the grid's ResizeObserver) measures each
  panel's margins (`figMeasure`: `buildPlot(…, {measure:true})` under `S.figMeasure`, memoised)
  and `figLayout` gives each cell its rectangle and the margins of its column (widest left and
  right) and row (tallest top and bottom), an inner shared edge keeping only what is really
  there; `S.figLay[fid] = {m, W, H}`, `S.figSmall[fid]` (one text size for every panel).
  `plotCfg` for a panel: the inner shared axes' numbers and titles off, the shared range
  (`figRange`: every panel's data, in the first's X units) as the limits when none are typed,
  `figPrune` (numbers at a touching edge give way, in `drawFrame`), `figLetter`, `figM` (its
  margins: `buildPlot` takes `opt.figM || cfg.figM`). `moveLive` puts the live pane into the
  panel's cell and the ribbon above the grid; `activateGraph(fig)` brings `S.figAct[fid]` or the
  first panel; `viewFor` links X (shareX) and Y (shareY) between panels (`xAuto` when only Y
  is linked, `resolveYAuto`); `runSnaps` draws a panel's picture at its cell's exact size.
  Pictures and exports: `figSvg(fid, W, H, colEx, k)` (every panel in its place, ids prefixed),
  `figH`, `handPic(W, H, k)` (the graph in hand as a still picture, a panel bringing its figure:
  `exportSvg`, `exportPng`, `exportVec`, `copyGraphPicture`), `expBuild` (at the size asked),
  `exportGraphIds`/`allGraphsSvg` (a figure is one item, lettered inside). Commands:
  `makeFigure(gids, o)`, `figPerSpectrum`, `figAddPanel(fid, {gid|cids})`, `figRemovePanel(gid,
  {del})`, `figMovePanel`, `figSave`, `deleteFigure(fid, withPanels)`, `duplicateFigure`,
  `figDlg` (Panels…), `newFigureDlg` (its Share X shows ticked and fixed while the panels will
  be in one column, from its `valid`), `figMenuItems` (the figure's ⋯), `figPanelItems`;
  **spans**: a cell's `rs`/`cs` (`figLayout` and `figNb` already honour them) are set by
  `figSpan(gid, dr, dc, whole)` (into empty cells only, `figFits`; refused in words) from the
  panel's Span submenu (`figSpanItems`: a column wider or narrower, a row taller or shorter,
  across the whole row); `figSpot` finds the first free place for a span, `figPackSpans` packs
  cells in reading order keeping their spans (adding and taking out panels, Panels… when the
  grid shrinks, and `normalize` when `figClash` finds cells outside the grid or overlapping),
  `figRowsOf`; `figMovePanel` swaps with a panel of the same size or moves into empty cells;
  `graphIn(el, w)` is the graph under a point of a graph window (a figure's panel), for drops;
  `gDropAt`'s `kind:"fig"` (`figTarget`) makes a dropped graph a panel and a chip a new panel.
  `normalize` keeps figures and cleans their cells (each graph in one cell, none a figure,
  inside the grid). The History has a box per panel (`graphTitle`), the Explorer a figure row
  with its panels inside.
- **Tools and menus**: `TOOL_GROUPS` lists every op by kind; `toolMenuItems({col, at})` is
  the menu the History's "+" and Step buttons open, one submenu per group (a group of one
  tool stays a plain item); `dataMenu`, `plotMenu`, `analysisMenu`,
  `statisticsMenu` and `spectroscopyMenu` build the menu bar (and the graph window's bar), each a short
  list of kinds with the tools in submenus (DESIGN.md, Menus and the toolbar; `tools/ux/menucheck.py`
  compares a crawl of them with `ux/spec/menus-after.txt`). Items that cannot apply are left out
  (Fit every column… with one column, Batch results without a batch, the second axes' pages while
  they are off). `sortViewItems(ci)` is Data › Sort the view and the cell
  menu's; Edit's Copy, Paste (`wsPasteMenu`), Clear and Find act on the worksheet. The menu bar
  moves to another menu only after the pointer rests 150 ms on its name.
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
  first so a derived spectrum branches off its source's original or processed box; an
  "Original data" box above the columns (their check codes); step boxes in order (dashed while
  pending); the processed box; a
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
  C on a box does too. `S.flowInsp` hides
  the inspector; `S.flowTab` is `flow` or `log`.
- **Python** was removed (round 6, the user's request): no window, menu item, worker or Pyodide.
  A project made with it keeps each Python step as a stored result (see the pipeline's
  `python` op); nothing can run code.
- **Preferences** (`openPrefs`, `#prefModal`, the gear `#prefBtn`, File and Edit ›
  Preferences…, Ctrl+,): `PREF_DEF` (`history`, `anim`, `flowAuto`), `prefGet(k)`/`prefSet(k, v)`
  under `kurve.pref.<k>`, per browser. **History off** (`histOn()` false) keeps nothing from then
  on: `save` writes no log line (a deferred error line aside), `makeStep` no `t`/`by`,
  `fitHistory` no new entry, `recordRaw` keeps the fingerprint but no record entry (so
  `rawVerified()` still holds), `who()` names nobody, the History does not open by itself, and
  the Log tab says the history is off; `clearHistory()` empties a project's log, fit history and
  record (confirmed, one undo entry). **Errors** are kept either way: `noteError` (the
  browser's list, `kurve.errors`, the last 50, shown in Preferences with Copy and Clear),
  `logError` (that, and a project log entry `{err:true}`), and the window's `error` and
  `unhandledrejection` listeners. **Animations**: `animOn()` (the preference and not the
  system's reduced motion), `applyAnim()` sets `data-noanim` on the root, which every CSS
  animation is guarded by. *Open the Overview* is `kurve.ovAuto`.
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
  raw, all X or the visible range: n, mean, SD, SE, median, min, max; the spectral measures,
  X at max, noise σ, S/N, area and centroid, behind *Noise, S/N and area*, `#stSpec`,
  `S.stOpt.spec` "on"/"off", else on when `looksLikeSpectrum` of the active column; `statsData`
  returns `spec`, and `statsTsv` copies the same columns), the visible-range integral
  (`measureHtml`, over `viewRng()`, never the fit's range), and Pearson r between spectra on the
  analysed one's X (`corrMatrix(cols, rng, only)`: each pair once; past 12 spectra a column of
  each against the analysed one, not a square table); Copy gives it as TSV.
- **Peak fit panel** (`renderPeakFit`): three numbered parts: 1 Find peaks (`pfPanelHtml`,
  the finder's settings in `S.pf`, a live preview on the graph from `pfRun`, the peaks it would
  find in a table and the ones not counted as peaks with their reasons, each with an Add button;
  `runPeakFinder(append)` seeds the draft from them, measuring a peak on a larger one's tail
  from its own valleys), 2 Peaks and baseline (its header's **Add a
  peak**, `#pfAddMode`, is the Add peak pointer mode, which left the toolbar), 3 Fit; both fits have
  Residuals under the graph (`fitResidHtml`, `#fitResid`), also Analysis › Fit: `residOn(cfg,
  fit)` is every reader's door (`resid` true or false by hand; "auto" or missing: on for a peak
  fit, off for a curve fit; `residHint()` the fit the window is set to make). Both stickies
  start with `weightHtml(d)` (how the fit will be weighted, naming the error column). The curve
  fit's model starts from `suggestModel()` (`{id, why}`, memoised per series: linear, expdec,
  boltz or gauss from the points' shape) unless the project has a `prefModel`; the window names
  it under the list, with `#useSugg` when another is chosen. `pfBaseline` subtracts the draft's
  baseline before searching without changing it. Its "Mark and label them" hands the peaks to
  the Peaks window's set instead (`findPeaksInto`, over the fit's range). Above both kinds of
  fit, `fitWhereHtml` says what is fitted: Spectrum (with several; `goSpectrum`) and Range from
  … to …: **all the data** unless typed or taken from the zoom with *Use the view* (`#fwView`;
  `fitRngOf(c)` reads `S.fitRng[pid:colId]` `{x0, x1, xu}`, null for all, or a fit's own `range`
  on the same processing; `setFitRange(a, b)`, `xExtent`; `fitRange`/`fitPoints` read it, and
  zooming never changes it; `buildPlot` shades what it leaves out, `g.fitrange`, while the Fit
  window is open and the Peaks window is not; `fitFoundPeaks` takes the set's range;
  `wireFitWhere`), and the
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
  optional Fit them…, Integrate them and Labels and legend…. **Regions**: parts of the spectrum
  searched each with its own finder settings. A set keeps them (`found[c].regs`, `[{id, x0, x1,
  o}]` in its units; `rng` too when there is one, for older readers); before a set,
  `S.pkRegs[c.id]`. `normRegs`, `regsOfSet(f)` (an older set's `rng` is one region with its
  `opts`), `pkRegsOf(c)`, `pkRangeOf(c)` (their span, or null), `pkSelReg` (the one whose
  settings the form shows, `S.pkReg`), `searchRegions(c, regs, xu, base)` (each region
  searched alone, results laid end to end, a peak found twice counted once), `setPkRegs(regs,
  why)` (one undo entry, searches again), `addPkRegion` (the view, or a drag: `pickPkRange`,
  `S.pick.pkr`, read in `setPickedRange`), `removePkRegion`, `setPkRange(rng)` (one region). The
  table (`.pkregs`: edges typed, `pfSummary` of its settings, the peaks in it, ×); the
  **Peak finder settings** (`#pkHow`, once "How to recognise a peak") edit the selected
  region's, with Use in every region, or with no regions `S.pf`. `findPeaksInto({regs|rng})`,
  `findPeaksEvery` (the analysed spectrum's regions on every spectrum on its axis) and
  `followPeakSets` (the set's own) all go through `searchRegions`. While the window is open
  `buildPlot` shades what no region covers (`.pkrange`) and numbers the regions, the selected
  one in the accent colour. **Noise** (`PF_NOISE`, `o.noise`): `pkSearchOpts(c, o, pts)`
  turns the settings into `peakSearch`'s, and for `auto` or `counts` gives counting statistics
  when it can (`countNoise`: √N from the counts as recorded in each point's row, averaged over
  five channels, through `countsPerY` (counts 1, counts per second the live time from
  `specMeta`/`liveTimeOf`) for the raw and the final units; null when the final unit is not
  counts), else `local` (counts asked for) or `global`. **Known lines** (`#pkId`, Name them
  from known lines): `LINE_LIBS` (the natural background's gamma lines and calibration
  sources, keV, with intensities), the project's lists `p.lines` (`[{id, name, unit,
  items}]`, in `UNDO_KEYS`; `editLineList` (paste or read a file, `parseLineList`),
  `deleteLineList`), `lineLibs`, `lineLib`, `lineScale` (eV, keV, MeV; null otherwise),
  `linesFor(lib, xu)` (the lines in the spectrum's units, or why not), `idfOpts` (`S.idf`,
  `kurve.idf`: list, tolerance, label form, keep typed), `idMatchOpts` (a typed tolerance, or
  each peak's FWHM with half the median as a floor), `identifyPeaks(c)` (`matchLines`, then each
  peak's annotation gets `line {x, name, lib, d}` and its label by `lineLabel`; a label typed
  by hand, `typed`, stays; one undo entry; `S.idLast` for the summary and the offset),
  `setPeakLine`/`peakLineMenu` (the table's Line column: the lines near a peak), and the copied
  table and the report carry the line and the peak's offset from it.
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
  has the step. It opens after an import that plots one column, when that column looks like a
  spectrum (`looksLikeSpectrum(c)`: 50 points or more, in order, evenly spaced, a band at least
  five times the noise; the same test gates *Label the peak at…* on a curve and the statistics'
  spectral measures) (`autoOverview`, off per browser under
  `kurve.ovAuto`), from Spectroscopy › Overview of the spectrum…, and from a raw box in the History.
- **Typing on the graph**: one box for every text, `inlineBox(o)` (`.inled`: `#inledIn`, an
  input or for several lines a textarea, `rtool("inledIn")`, ⋯ `data-inmore` for `o.more`,
  and `.inled-pv`: the text typeset by `texPreview(v, 17, o.st)` in its own style once it has
  LaTeX, else the keys and a few examples). `o.el` (or `o.rect`) is what it covers; Enter
  keeps (`o.keep(v)`), Esc leaves (`o.cancel`), a click elsewhere keeps unless the symbol grid
  is open (`spOpen`). Built on it: `inlineEditTitle(k)` (graph and axis titles,
  `titleStyleOf(k)` for the preview), `inlineEditLegend(hit)` (`"title"`, or `"leg:<id>"`: the
  series' `label`, `__fit` too; the title box goes above the legend when there is none),
  `inlineEditAnno(id, {fresh})` (labels and text, and the text of lines, ranges, arrows and
  shapes; a set's peak takes `lab`; empty text on a label or line shows its position) and
  `inlineNewText(pt)`. `annoDouble(id, onText)` is the double click (and Enter or F2 on a
  selected annotation): typing for labels and text, and for a line's, range's or shape's text
  when the press was on it (`S.andrag.txt`), else its Format page. Rich text groups carry
  `data-rt`, so `[data-rt], text` finds what to cover. In dialogs a rich field is `.rfield`: the
  field, `rtool(id)` and `texPv(id, v)` (`.texpv[data-texpv]`, kept up to date by an input
  listener in `setupRichTools`).
- **The legend selected** (`S.legSel = {g, hit}`, `hit` `"box"`, `"title"` or `"leg:<id>"`): a
  click selects (a dashed outline round the legend, the entry shaded, both drawn by
  `buildPlot` with `pointer-events="none"`; every entry and the title have a transparent hit
  rectangle, `geo.legOrd` their order); a click on what is selected, a double click, Enter or
  F2 types over it (`inlineEditLegend`); ↑/↓ move through `geo.legOrd`, Esc lets go; a click
  elsewhere, an annotation selected or a project switch clears it. Right-click selects too and
  opens `legendMenuItems(hit)`.
- **One menu order for text** (DESIGN.md): `textMenu(o)` builds the right-click menu of
  anything with text: its name; Edit text; Size (`TXT_PTS`), Bold, Italic, Colour (swatches,
  Automatic); `o.own`; Format…; Delete. `titleMenuItems(k)` (with `titleTxt(k)`: the graph
  title's `txt.title`, an axis title's own `ax[k].tst`), `legendMenuItems(hit)` (an entry's
  menu adds Hide this entry, Back to the name, its line…, and the legend's own items under
  Legend), `annoMenuItems(id)` (`ANNO_TX` maps the text keys onto the annotation's). An axis
  title's own style, `ax[k].tst` (`{fam, name, size, b, i, u, color}`, in `FMT_AX`), is drawn
  through `AT(k)` in `buildPlot` (every axis title's `TS.axis` under it) and edited on its axis
  page by `txtBarHtml("axt:"+k, …)` (`pdTxtGet`/`pdTxtSet` map `axt:` onto `ax.k.tst`).
- **Adding annotations**: the Format dialog's Labels and lines page has one Add button
  (`data-pdaddmenu`, a menu of `ANNO_ADD` with icons) calling `pdAddAnno(k)`; `addLineDlg(t)`
  (Plot › Annotate › Vertical line…, Horizontal line…) is one dialog: direction and text as
  segmented radiogroups (`data-lns`), the position in the axis's units, your own text in an
  `.rfield`, colour, style and width.
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
  the extra graphs, `batch` and `series`, `trends` the trend graphs, `tree` the Explorer's
  folders, `wsAlign` the worksheet's alignment, `wsHide` its hidden columns and rows) plus both drafts (`S.pdraft`, `S.draft`). A snapshot copies everything but the columns' data
  arrays, which it shares (`cloneCols`): raw values are only ever replaced. Undo and redo wait
  while a pointer button is held anywhere (`S.ptrDown`, `heldBlocks`), so a drag cannot write
  back what was undone under it. It is per-session and local on purpose — rewinding your
  own edits, not other people's. Destructive actions confirm themselves with a toast that
  carries an Undo button (`toast(msg,{action,run})`).
- **Storage**: `LocalStore` (localStorage, single user) and `makeDbStore(db)` (claude.ai artifact
  runtime, shared realtime). `LocalStore` keeps one key per project (`kurve.p.<id>`) and per
  project's comments (`kurve.c.<id>`), so a save writes only its own project; another tab's
  writes arrive through the `storage` event (`onStorage`) and are emitted like any change. A
  save starts from the project as stored (`read`), so two tabs changing different parts of one
  project keep both, unless an earlier write failed (`dirty[pid]`: then memory has it, and the
  next write that fits stores everything). A refused write throws (`fail`: `quota_exceeded` or
  `storage`): the status bar says Not saved and `writeErr` says why; a project deleted elsewhere
  throws `gone`. Ids carry a random part (two made in one millisecond). The single key of
  earlier versions (`kurve.v1`) is split up on `load`, or kept and used as before
  (`legacy`) if there is no room to. Both expose the same interface: `watchProjects`, `create`, `save`,
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
  gone project. Names: `projName`, `isUntitled` ("Untitled project", "(2)" too, and the older
  "Untitled analysis"),
  `uniqueProjName(nm, except)` (every new project; imports that rename an untitled one),
  `batchProjName(names)` (what the files' names share, or "first to last"); `switchProject`
  (the list's run) toasts what is in the project. **Bringing in** (File › Copy from
  another project…, the Explorer's project menu, `bringInDlg(gid)`, `bringIn(groups, onto, gid)`): `copySpectra(q, cids)`
  copies chosen spectra with their sources and what their steps read (`stepReads`, from each
  op's `deps`), their X (nearest left of the root) and error columns, with new column and step
  ids (`ref`, `cols`, `reads`, `readSigs` remapped), a computed column as values, and
  `origin {pid, proj, col, t, by, computed?}` (the History's Original data box says "Brought in");
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
  the stage and pending state above, `S.flowSel`/`S.flowTab`,
  `S.pf` (the peak finder's settings, saved per browser under `kurve.pf`), `S.pfPreview`,
  `S.pkLast` (the Peaks window's last search, for its turned-down list), `S.bandSel`,
  `S.bdrag`, `S.igEvery` (the Integrate window's selected band, band drag and every-spectrum
  view), `S.ovStage` (the Overview's raw or final data),
  `S.plotPreview` (the Format dialog's working copy; `S.pdTab` its page, `S.pdSel` the
  spectrum, `S.pdAnno` the annotation, `S.pdPos` where it was dragged), `S.ttdrag`/`S.axdrag`
  (a title or an axis being dragged), `S.arrowDraft` (an arrow being drawn), `S.shapeDraft`
  and `S.shapeKind` (a box or ellipse being drawn, and which), `S.guides` and
  `S.snapRing` (alignment guides and the point an arrow snaps to, drawn on screen only),
  `S.altKey` (Alt held: no snapping), `S.insetCfg` (an inset's settings while it is drawn),
  `S.exp` (the export dialog's settings), `S.pkRng` (a Peaks window range before there is a set),
  `S.fldrag`/`S.fplClick` (a fitted peak's label being dragged or clicked), `S.stOpt`, `S.fitRng` (the fit's
  range per column, see the Fit window), `S.annoSel` (the selected
  annotation; Delete removes it), `S.legSel` (the legend, its title or an entry, selected),
  `S.plotDlgKind` (Plot setup's last kind), `S.comments` with `S.cDrafts`, `S.cReply`, `S.cEdit` and
  `S.discFilter` (the Discussion window's Open/All). Window positions are `LAYOUT`.
- **Rendering**: `buildPlot(W,H,palette,colEx,opt)` returns an SVG string used both on screen and
  for export; on screen it also records `S.geo` (transforms, handle positions, `logX`, `heat`).
  `colEx` is the export's colours; inside, `forExport` means a still picture (no handles, hit
  zones or side effects on `S`), which is also what `opt.inset` asks for, drawn in the
  screen's colours. `opt.k` scales every text (for an export at a size in points), and ticks
  space out with larger text (`tkDen`).
  It reads the plot settings through `plotCfg()`, which is the Format dialog's working copy
  while that dialog is open. Each spectrum has a style from `serStyle(id, active, …)`: `type`
  (`PLOT_TYPES`: line, scatter, linesym, stick, area, step; with the graph's `style` "auto",
  the default of every new graph, `autoType(id)`: a line for 500 points or more, or 40 or more
  sorted with even spacing, symbols otherwise; a curve's own `series[id].type` wins, and
  `plotTypeItems(c, ro)` is the Plot type submenu, Automatic first), `color`, `lw`, `dash`, `sym`
  (`SYMS`, filled and open), `ss`, `fill`, `op`, `label`; the fit curve's is `series.__fit`.
  The Y axis's automatic title is `autoYTitle(d, others, layout)`: the active column's name and
  unit, or with several curves overlaid or offset their shared name, else their shared unit,
  else "Value" (`autoYOf()` for the graph in hand: the title's placeholders).
  `seriesSvg` draws one spectrum as a handful of paths whatever its length. `axisTicks` honours
  each axis's `min`, `max`, `step`, `minor`, `fmt` (auto, decimal, scientific) and `dec`. Ticks
  (`niceTicks`, `axisTicks`) are counted by index with a cap, never added up step by step, and
  `tickLabel` gives as many digits as the step needs (ticks 10⁹ apart on 1.7×10¹⁸ all differ).
  The drawn view goes through `saneView`/`saneRange`: finite, ascending, wider than nothing and
  than 10⁻¹⁰ of its own size, within ±10³⁰⁷; the wheel stops zooming at that width.
  **Scales, breaks and the second X axis**: X and the main Y go through `axScale(a, b, log,
  brks, gapFrac)`, a value to a fraction along the axis and back (`f`, `inv`), with `segs`
  (the visible stretches) and `gaps`; `S.geo.sx`/`sy` keep them, so `toData` inverts through
  the breaks, and `S.geo.rx`/`ry` (value per pixel within a stretch) make panning follow the
  pointer. **Breaks** are `ax.x.brk`/`ax.y.brk` (`[[a, b], …]`, data, not format), cleaned by
  `brkList` (sorted, merged, inside the view, at most 8, ignored past nine tenths of the
  axis): each a 10 px gap, the rest in proportion, so both sides keep one scale. X breaks in
  every layout but the heat map, Y breaks with overlaid or offset spectra, never in an inset.
  Ticks per stretch, merged so no numbers collide (`mergeTicks`); each gap is covered (`g.brk`)
  after the frames and cut with two strokes. `suggestBreak(k)` offers the widest empty stretch
  in view, `breakDlg(k)`, `clearBreaks(k)`; the axis page lists them (`data-pdbrkadd`,
  `data-pdbrkdel`, paths `ax.x.brk.i.j` in `pdSet`). **The second X axis** is `ax.x2` (`on`,
  `conv` one of `X2_KINDS`: nm, µm, cm⁻¹, eV, THz, Raman shift, `lin` a·x+b, `expr` a formula
  in x through `compileExpr`; `from` when the X units are not read by `xUnitKey`, `laser`
  (default from the spectrum's Raman shift step, `laserOf`), `a`, `b`, `f`, `name`, `unit`,
  and the usual axis style, which follows the X axis's unless set, `axisCfg(cfg,"x2")`).
  `x2Conv` gives the function or an error in words; `x2Layout(F, SX, len, o)` samples it per
  stretch (refusing one that is not finite or not one-to-one), tries evenly stepped numbers
  first (they must fit, fall within a factor of three and cover the axis), else takes
  candidates from short stretches and keeps the roundest (`niceScore`) that fit, each round
  for its interval (`stepOf`), placed by bisection. It sits across from the X axis (top,
  or the bottom when X is at the top), the X axis's mirrored ticks give way to it
  (`x2Edge`), its numbers are `data-axis="x2"` (double-click, right-click; not dragged), and
  `S.geo.x2err` is what the Format page shows. `showX2`, `x2AutoTitle`, `figNotes` (the
  report's caption: the ranges left out and what the second axis shows).
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
  `tkOut`), the ticks across from each axis (its mirror: `mirror`, their own direction
  `mticks` → `mdir`, and numbers there `mlabs`, room for them in the margins), and records
  where the numbers went (`drawn`) so the
  titles sit beside them wherever the axes are. Stacked panels keep X at the bottom and Y on
  the left; double Y keeps Y on the left. On screen the main frame also draws a transparent
  zone over each axis's numbers (`data-axis`: drag, right-click, double-click) and records
  `geo.axes`. The grid takes `gridColor`, `gridLw`, `gridDash`, `gridX`, `gridY`; `plotBg`
  fills the plot area. **Edge by edge** (the Format dialog's frame page): `frameEdges(cfg)`
  says whose ticks and numbers each of the four edges carries (an axis's own, the edge across
  from it, the right Y axis with two, the second X axis), `edgePicSvg` draws the frame small
  with each edge's state (click one, `S.pdEdge`), `pdEdgeSet(edge, "ticks"|"labs", v)` and
  `pdEdgesAll(v)` write the working copy; the quick style "Out on the axes, in across"; the
  axis page and the axis menu have the edge across too. The title takes `TS.title.align` and `titleDx`/`titleDy`. `layout` (`LAYOUTS`): overlay,
  offset (a waterfall, each trace labelled), stack (a panel per spectrum, shared X, the
  analysed one on top), dy (the others on a right axis), heat (one row per spectrum, drawn as
  one image from `heatImage`, with a colour bar; `CMAPS`), box and violin (`isDistLayout`:
  every spectrum on the graph a category along X, in the table's order, named under it,
  `dist`/`distC`/`distV` in `buildPlot`, its values the final data less masked points (and
  those at or below zero with Log Y); the view 0.5 to n + 0.5, Y over the values (a violin's
  kernels reach past them); boxes by `boxStats` (whiskers Tukey's, or the extremes with
  `cfg.distWhisk` `range`, `DIST_WHISK`), the median heavy, the mean a diamond, outliers open
  circles; violins by `kdeAt`, each as wide at its widest, the box a thin bar inside and the
  median a dot; `cfg.distPts` the values as jittered dots (at most 5000 a box); each `g[data-dist]`
  with a `<title>`; no legend, fit, annotations by data X, breaks, second axes or inset;
  `S.geo.dist`, the readout names the category; `distMenuItems` is the graph menu's Box chart /
  Violin plot, the Format dialog's layout page has both settings, and Plot (the worksheet's)
  has Box chart and Violin plot). **Columns** (`PLOT_TYPES` `column`): bars from zero, as wide as
  a histogram's bins (`histOf(id)`, the step's `bins.w`) or 0.8 of the median spacing, several
  spectra as columns side by side (`colGrp`, `cgk`/`cgn` through `zSt`); a graph of columns
  stands on zero and is widened to whole columns when nothing is typed or zoomed.
  **Histograms**: `histogramCols(cids)` (Plot › Histogram, Statistics › Histogram (the selected
  columns, or the active one), a spectrum's right-click; one undo entry) makes `Histogram of …`, a spectrum derived
  from each column's final data with a `hist` step, each on a graph of its own, several in a
  figure; `editHistStep(cid)` opens the step in the History (right-click Histogram bins…).
  **Maps** (the heat layout):
  `cfg.mapY` (`index`, or `series`: `mapRows` puts each spectrum at its `seriesVals`, sorted,
  falling back to the order with `why`), `cfg.mapKind` (`MAP_KINDS`: image, filled, lines,
  both), `cfg.mapLevels` (about n, `mapLevels`: round numbers inside the range, in log10 with
  Log Y), `cfg.mapLab`; rows between spectra interpolated in a straight line (`mapAt`); contour
  lines by marching squares (`contourLines`, saddles split by the cell's mean, segments joined
  into polylines), their values written along the longer stretches where they clear each
  other; the levels across the colour bar. `S.geo` keeps `mapRows`, `mapSeries`, `mapLevs`,
  `mapWhy`, `mapZ(x, y)` (the readout's value). Cuts: `mapCutX(x)` (the series' `cuts` `[{x,
  xu}]`, a dashed line and a trend graph of `cut@x`, `valueAtX`, one undo entry), `mapCutY(row)`
  (the nearest spectrum, `mapNearest`, on a graph of its own); `mapMenuItems` (the graph
  menu's Map). **Styling**: `serStyle`'s `conn` (`CONN_KINDS`: `smoothD`, Catmull–Rom or a
  clamped uniform B-spline, up to 4000 points), `zcol`/`scol` (`zMapOf`: a third column's
  value at each point's recorded row, as a colour from the map or a size; the first series
  coloured gets a colour bar, `zbar`, room made in the margin; the first series sized gets a
  size legend, `sb`, after it: a few round values from `axisTicks` within the range, largest at
  the top, in the series' symbol (`zMapOf`'s `sz(v)`), titled by the column, `g[data-sizeleg]`,
  off with `cfg.sizeLeg` false, in `FMT_KEYS` with `distWhisk` and `distPts`), `fillTo`/`fill2`
  (`fillBetweenSvg`: over the X both have, split where they cross, overlaid only, under every
  series) and `hatch` (`HATCHES`, `hatchSvg`: lines clipped to the region, so PDF and EPS draw
  them); `zSt` hands `seriesSvg` the mapping and an id (`hid`) for its clip. The legend goes in the emptiest
  corner, a chosen one, outside on the right, below the graph (`below`: as many columns as
  fit, rows read across), where it was dragged (`legend:"custom"`, `legendPos` as fractions
  of the plot area), or nowhere; it can have a title, columns (`legendCols`, filled down),
  its own text style, line samples of any length (`legendLine`), row spacing (`legendSp`), a
  frame and background of its own (`legendFrame`, `legendFill`, `legendOp`, `legendBd`,
  `legendLw`, `legendR`), and its text in each spectrum's colour (`legendText:"match"`); a
  series with `leg:false` is left out of it. **Colour schemes**: `SCHEMES` (Kurve's: the eight hues of `COL_TINTS_LIGHT`/`_DARK`,
  validated for colour-blind and normal vision on the graph's light and dark backgrounds,
  UX_SPEC §3.5; Okabe–Ito; viridis in table order; black and greys with dashes; the older
  `categorical`, the same hues, `hide`n from the list) and
  `PEAK_SCHEMES`; `yTint(id, light, scheme)` (the scheme passed by `serStyle`, else read from `plotCfg()`) and `peakColor(k)` read them, so the graph, the legend, the
  worksheet header, the fit panel and the results table change together. Every scheme colours
  by table order, so a colour stays with its spectrum; the analysed one is drawn heavier, never
  recoloured. On two Y axes with one
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
  **Boxes and ellipses** (`t:"rect"`/`"ellipse"`, `SHAPE_T`; corners `x, y, x2, y2` or pinned
  `fx, fy, fx2, fy2` like arrows, `twoEnds(a)`; `color`, `lw` (0: no outline), `dash`, `fill`
  and `op`, `rx` (a box's corners), `behind` (drawn in the layer under the data), `text` inside
  at `lpos` with `align`): `shapeSvg`, drawn with the Shape tool (`S.mode` `shape`,
  `shapeKind()`/`pickShape(k)` remembered in `kurve.shape`, the toolbar button opens
  `shapeMenu`; Shift makes a square or circle; `S.shapeDraft`, `makeShape`); corner handles
  `data-ah="00"…"11"` resize, the body moves. `annoWhere(a)` says where any annotation is.
  **Text with LaTeX** (the `==TEX:START==`/`==TEX:END==` block, pure, tested by
  `tools/tex-test.mjs`): titles, axis titles, legend entries and title, annotation text,
  colour-bar and size-legend titles and fitted peak labels are drawn by `richText(str, {x, y |
  tf, anchor, st, fill, attrs})`: plain text as one `<text>`, text that `texNeeds` laid out by
  `texBox` (`texLayout` measured with the text's own font through `textW`, cached in `TEXC`)
  and written by `texSvgOf` as positioned `<text>` pieces, rules and dots in a `<g data-rt>`
  carrying the attributes a `<text>` would; `richW` measures. `texParse` makes the tree
  (`TEX_SYM`, `TEX_FN`, `TEX_BIN`, `TEX_REL`, `TEX_ACC`, `TEX_FONT`, `TEX_SP`; text mode outside
  `$…$` with `^{}`/`_{}` only with braces, maths inside with LaTeX's italics and spacing;
  fractions, roots with an index, accents, `\left…\right`, `\mathrm`, `\text`; 2000
  characters at most; an unknown command stays as typed), `texHtml` writes HTML (Results, the
  report, the Format dialog's list) and `texPlain` plain text (menus, lists). `textBlock` uses
  `richText` per line. `rtool(id)` puts x², x₂ and a symbol grid (`openSymPicker`) beside a
  field, and Ctrl+Shift+= / Ctrl+= wrap the selection (`setupRichTools`, fields marked
  `data-rich` and the inline editors). The PDF and EPS writer maps what the standard fonts
  lack (`VEC_SAME`, `AFM_SYM`).
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
  (`namePeakDlg`), right-click for `fplMenuItems(k)`, hover
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
  items; `seriesAt` gives the curve within 14 px of a point, or none, and then the plot's own menu
  with Add here inline; `commentAt(pt)` is Add here › A comment here…). **The Format dialog**: `openPlotDetails(id, page)` (`#plotModal`; pages `series`
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
  journal, classic, slides, minimal), the project's (`p.formats`, in `UNDO_KEYS`, `projFormats`,
  `saveProjFormats`: saved and shared with the project, so a colleague has them) and a
  per-browser library (`fmtLib`, `fmtLibSave`, under `kurve.formats`); `saveFormatAs` asks
  which (the project by default when the store is shared), `renameFormat`, `copyFormat`,
  `deleteFormat`, `allFormats()`; `useFormat(f, every)` gives one to the graph or every
  graph, `formatMenuItems` lists them by group (Plot › Saved styles, and the Format dialog's Saved styles
  button, which applies to the working copy; "saved style" is the interface's word for a format). `txtAuto(cfg, el)` is a kind of text's automatic style.
  `renderTop`, `renderWs`, `renderPlot` (+ `renderStatusBar`), `renderStages` (now the graph
  window's stage chip and its Original/Processed/Both, `renderViewSeg`), `renderFit` (it also refreshes
  `renderResults`, `renderTabMarks` and the status bar), `renderFlow`, `renderTool`,
  `renderStats`, `renderPy`, `renderThread`, `renderLog`, `renderAll`. Dense data (over 1500
  points) is drawn as one path of dots, and error bars as one path.
- **Error bars** (`ERR_KINDS`): an error column (role `e`, `of` its spectrum) is Y both ways
  (the default), Y upward (`side:"+"`) or downward (`side:"-"`), or the same for X (`ax:"x"`);
  `errKind`, `errTag` (the worksheet's yEr±, yEr+, yEr−, xEr±…), `errKindName`, `errColsOf(id)`
  (by kind), `hasErrCols`. `errColFor(id)` is the ± Y column only; `yErrData(id)` is the
  spectrum's error as `rawSeries` reads it (the ± column, or the mean of + and −, memoised per
  pair of arrays), so processing, weighted fits and band areas carry one error as before.
  Drawing (`errGeom(c, d)`, memoised per series and arrays): a point's bars by its recorded row
  `q.i` and carried error `q.e`: + and − in their recorded ratio, scaled as the processing
  scaled the error; X bars times `xErrScale` (the local slope of drawn X against recorded X,
  signed, 1 when X is untouched), so a converted axis converts its errors. `errSvg(g, pts, st,
  X, Y, pal, masked, o)` returns `{under, over}`: a band (`st.eb==="band"`, runs split where a
  point has none) under the series, bars with caps over it, X bars either way; drawn for every
  spectrum shown (overlay, offset, double Y, stacked panels), at any stage. The style keys are
  the series' `eb` (`bars`, `band`, `none`), `ebColor`, `ebLw`, `ebCap`, `ebOp` (the Format
  dialog's Error bars group, the spectrum's right-click Error bars, headed by `errSourceText(c)`:
  the column they come from, or carried through the processing). `setErrKind(id, kind)` and
  `errKindItems` (the column menu's Use as error bars); a locked correction refuses a column that
  is only drawn. The fit's **prediction band** (`cfg.bandPred`, dashed, `data-pband`) beside the
  confidence band (`cfg.bandConf`, default on), both in `FMT_KEYS`: the curve's variance plus
  the residual variance (reduced χ²) unweighted, the nearest point's σ² weighted, or s² for an
  orthogonal distance fit that found the Y scatter.
- **Axis scales** (`AX_SCALES`): `scaleKind(cfg, k)` is `log10` when `logX`/`logY` (the old
  switches, still the only log10), else `ax[k].scale` (`ln`, `log2`, `recip`, `orecip` with
  `ax[k].c`, default 273.15, `sqrt`, `prob`), else `lin`. `scaleFn(kind, ax)` gives `{tf, ti, ok,
  lo, hi}`; `axScale(a, b, log, …)` takes it in place of `log` and sends a value it cannot show
  off the low (or high) end, never to NaN. `buildPlot` leaves such points out (`inDom`), pads the
  automatic view in the scale's coordinates and keeps any view where it can draw (`scaleRange`),
  draws Y through `SY`, puts `fx`/`fy` in `S.geo` (pan and wheel zoom move in fractions of the
  axis through them), and numbers the axis with `scaleTicks` (powers of e or 2, the probability
  paper's percentages, or round numbers by `x2Layout` with the identity; `lab.b` is a label's
  base for `tLab`/`labW`). Breaks are for linear and log10 axes only. `setAxisScale(k, kind)`
  (one undo entry; the axis menu's Scale, Plot › Axes, the Format dialog's Type through
  `pdSet("axscale.k")`); Log Y on the toolbar clears a curved Y scale. `probit` (in NUMERICS,
  tested) is the probability scale's transform. **Dates and times** on an axis: `ax.fmt` `time`
  (seconds as h:mm:ss) or `date` (seconds since 1970, UTC), `timeTicks` (steps from a second to
  a year, the day written where it changes), `fmtDur`, `fmtDate`. **The second Y axis** (`ax.yo`,
  like `ax.x2` across from Y: `on`, `conv` one of `YO_KINDS` (`lin` with `a`, `b`, `name`,
  `unit`; `A2T` transmittance from absorbance; `T2A`; `expr`, a formula in y), its style
  following Y's in `axisCfg`): `yoConv`, `yoAutoTitle`, `showYo`; laid out by `x2Layout(f, SY,
  mh, {rot:90})` (`yoL`, errors in `S.geo.yoerr`), on the right or the left when Y is on the
  right (`yoRight`, `yoEdge`, Y's mirrored ticks give way), `data-axis="yo"`, not with double
  Y, a heat map or stacked panels; `frameEdges`, the axis lists (`setAxisKeys("all")`,
  `allax.`, quick styles, `fmtOf`, `styleFrom`, `plotCfg`) and `figNotes` know it.
- **Styles and controls** (the tokens at the top of the `<style>`): one token set per theme
  and per style. Sizes are tokens too (UX_SPEC §3.5, `ux/spec/TOKEN_MAP.md`): six type sizes
  `--fs-cap` 11, `--fs-tab` 12, `--fs-body` 13, `--fs-title` 14, `--fs-head` 16, `--fs-hero`
  20 px; spacing `--sp-1` … `--sp-8` (2, 4, 6, 8, 12, 16, 24, 32 px; a negative margin that
  cancels a padding is `calc(var(--sp-n) * -1)`, and an offset tied to a scroller's padding,
  `.composer`, `.pkfoot`, the windows' `.fbar`, the menu's search, moves with it); radii
  `--r-s` 4, `--r` 6, `--r-l` 8 px (`--r-win`, `--cb-r` alias them). A raw size in the CSS is
  one TOKEN_MAP.md justifies (a pill, a font sample, a layout offset) or a mistake. States:
  disabled is `--ink-off` words (4.5:1 or more) and a dashed `--rule-2` edge, never opacity;
  pressed is `--press` with an inset shadow; words on a filled status shape (step numbers,
  badges on `--badge`, the danger button) are `--on-fill`; on a highlight (a menu item under
  the pointer, a selection) secondary words take `--ink`. Text has two colours: `--ink`, and `--muted` for what is secondary (7:1 or
  more against every panel, in both themes and both styles); `--ink-2` is a near-ink for
  labels and buttons, and `--faint` is for lines and icons, never words. Headings (`.gh`,
  `.sect`, `.pane-h h2`, menu groups) are sentence case in the text colour, not small grey
  capitals. Bench is bare `:root` plus the two dark blocks; Graphite is
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
  (the chosen one filled with the accent, white text; Graphite black), windows `--win-sh` and
  `--win-sh-act`. Numbers typed into forms and slider readouts are in `--mono`. **Contrast**
  (DESIGN.md; `tools/contrast-test.mjs` measures it in both themes and styles): words 7:1 or
  more on every surface, edges (`--rule`, `--win-bd`, `--cb-bd`, `--sw-off`, `--trk`) 3:1 or
  more, text on the accent 4.5:1. Surfaces from back to front: `--paper` (the desk, darker
  than any window), `--chrome`, `--well` (round a graph in its window: `.graph-win`,
  `.graph-pane`, `.gsnap`, `.figgrid`), `--panel`, `--panel-2`, `--panel-3`. Windows:
  `--win-bd` (every window's edge), `--win-bd-act`, `--win-h-bg`/`--win-h-ink` (a title bar),
  `--win-h-act-bg`/`--win-h-act-ink` (the front window's, filled with the accent; its icons,
  sub-title and buttons take the ink). Buttons `--btn-bg`/`--btn-bg-h`; a menu item under the
  pointer `--hi` with a 3 px accent bar; `--ws-grid` the worksheet's cell lines. What is on or
  in front is filled, not tinted: `.tb[aria-pressed="true"]`, `.seg` choices (`aria-pressed`
  or `aria-checked`), `.tk.front`, an open `.mb`.
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
- **Export**: file names come from `safeName(base, ext)` (any script kept; only what a file
  system refuses, control characters and leading dots go; "kurve" when nothing is left) and
  `figName()` (the project and, with several graphs, the graph).
  `saveFile(name,data,mime)` uses the claude.ai `downloads` runtime when present and
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
  itself with prefixed ids, and the settings are kept in `kurve.export`. **PDF and EPS**
  (`svgToVector(svg, {kind, wPt, hPt, title})` → `{blob, miss}`, `exportVec(kind, all)`, the
  dialog's PDF and EPS): the figure's SVG parsed and walked (`g`, nested `svg` with its
  viewBox and clip, `clip-path`, `transform`, `rect`, `circle`, `ellipse`, `line`, `path` with
  arcs and quadratics made cubics (`vecPath`), `polyline`, `image` decoded to RGB and alpha,
  `linearGradient` as strips, `text` and `tspan` as lines of runs) into PDF content (opacity
  by ExtGState, images as XObjects with an SMask, streams deflated by `CompressionStream`
  when there is one, a cross-reference table, the title in UTF-16) or PostScript (EPSF-3.0,
  colours mixed with white by their opacity, images as hex, fonts re-encoded to WinAnsi in
  the prolog). Text uses the standard fonts (`vecFont`: Helvetica, Times or Courier by the
  family's generic name, bold and italic; Symbol for Greek and signs, `AFM_SYM`) measured with
  their AFM widths (`AFM_W`, WinAnsi codes, from Adobe's metrics) so anchors land right;
  Unicode super- and subscript digits are drawn raised and small (`vecPieces`), a halo is a
  stroked pass under the fill, an underline a rule; a character none of the fonts has is
  written as ? and listed in `miss` (`vecMissNote`). `exportCsv` (every column with units, the mask
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
  every spectrum's final X and Y side by side with each one's steps. `copyGraphPicture` puts
  the graph (or a panel's figure, `handPic`) on the clipboard as a PNG at 2.5×, handing
  `ClipboardItem` a promise so the click still counts; a browser that refuses gets the PNG
  export offered (Edit, Export, the graph's right-click and ⋯ menus).
- **Boot**: `boot()` asks `window.claude.use(...)` for `db`, `user`, `room`, `downloads`. Outside
  claude.ai these are absent, so the app falls back to `LocalStore` and hides presence.

## Running outside claude.ai

Works fully as a single-user app, exports included. Only collaboration (shared projects,
presence, names) depends on the claude.ai runtime and would need a real backend behind the
`LocalStore` / `makeDbStore` interface.

## Checking a change

**Words.** What the app shows follows the glossary (`ux/UX_SPEC.md` §3.6): column (a curve on
the graph), active, original and processed data, check code, tool window, saved style,
Untitled project, not counted as a peak; spectroscopy's words (spectrum, band, background…)
only in the Spectroscopy menu and its panels. Code names (`raw`, `final`, `rawFp`, `p.raw`,
`S.sheet`) are not renamed. `python tools/ux/terms.py [path]` counts the
words off the glossary in every prose literal of the file, and in fragments joined to a number
or a name (`n + " spectra"`) (`--list term` shows where); it
reads 0, and a new string should keep it there. Help's search words (`kw`) keep the old words
so either finds the article.

`node tools/fit-test.mjs`, `node tools/pipe-test.mjs`, `node tools/parser-test.mjs` and
`node tools/tex-test.mjs` cover the numerics, the processing steps with their checks and the
fingerprint, the parser, and the LaTeX typesetter (nesting, italics, spacing, fractions, roots,
accents, escapes, limits). Each takes an optional path to test a working copy instead of
`kurve.html`. `node tools/contrast-test.mjs [path]` (Playwright) measures the interface's
colours as the browser resolves them, in both themes and both styles, against DESIGN.md's
rules; run it after touching a token or a state's look.
`node tools/odd-test.mjs [path]` (Playwright with Chromium) drives the app in unusual ways that
once hung it, lost data or drew nonsense: 300 turns of the wheel, a nanosecond time axis, equal
and crossed axis limits, two tabs saving, a full store, the old single-key store and a corrupt
layout, typographic minus signs, file names in any script, times across midnight, undo while
holding a label, 300 spectra, a long graph name, a straight line through one X, a formula 300
deep, breaks read from storage in every broken form, a second axis that cannot be numbered, a
curved one, a PDF's cross-reference table and size, an EPS's bounding box, characters no
standard font has, broken formats in the store. Run it after touching storage, the axes, the
parser, undo or the PDF and EPS writer. It serves the file over HTTP (a server of its own, on a
free port) and waits for each page to be ready (a project on the desk), never a fixed time.
`node tools/sheet-fuzz.mjs [path] [seed or a-b] [steps]` drives the worksheet as an erratic
user would (see its header) and checks the data, the drawing, the fingerprint and the store
after every step, and a reload at the end; a few minutes a seed, `V=1` prints every step. Run
some seeds after touching the worksheet, editing, saving or undo. To look at a PDF or EPS, render it: Ghostscript
(`gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r110 -dGraphicsAlphaBits=4 -dTextAlphaBits=4`,
with `-dEPSCrop` for an EPS) or PyMuPDF; at low resolution without anti-aliasing a small
circle looks like a star. For anything else the UI
has no test file: drive it in a real browser (Playwright with Chromium works headless),
click every control you touched, and watch for page errors. Screenshots at 1440, 1024 and
390 px wide, in both themes, catch most layout mistakes. Windows overlap: bring the one you
are about to click to the front (`focusWin`) or the click lands on whatever lies over it,
and a window that has just opened, closed or moved is still animating for about 220 ms (wait,
or set Preferences › Animations off with `prefSet("anim", false); applyAnim()`). Comments, ties and user functions have no store or network of
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

- **A step too small to change a number never arrives.** Ticks were made by adding the step to
  a value until it passed the axis's end; zoomed far in (the wheel turned a few hundred times)
  or on numbers near 10¹⁷, `v + step === v` and the tab froze for good. Count by index with a
  cap, and keep every drawn range wider than the precision of its own numbers.
- **Precision is relative.** Three significant digits label ticks at 1.7×10¹⁸ one second apart
  as eight copies of "1.7×10¹⁸"; a determinant from raw sums is rounding noise when every X is
  the same (a "slope" of 8 with R² −2) and loses every digit when X is near 10⁹. Size digits from
  the step; fit about the mean.
- **One key for everything is one writer for everything.** Every save wrote the whole store, so
  a second tab's save wiped the first tab's new projects, and a write the browser refused was
  swallowed while the status bar said Saved. One key per project, the storage event, and a
  refused write that says Not saved.
- **A flag set from a timestamp is not unique.** Two projects created in one millisecond got one
  id, and the second replaced the first. Ids carry a random part.
- **What comes back from storage is untrusted.** A saved layout of NaN and 10⁹ made a window
  757 000 000 000 px tall; it is checked (`saneWin`) like any other input.
- **Text from documents is not ASCII.** A column copied from a PDF has −, not -; a French
  spreadsheet writes 1 234,5 with a no-break space. Seven rows of eight were read as text, and a
  project named in Japanese exported as ".csv", a hidden file with no name.
- **Undo while holding something lets go of nothing.** Ctrl+Z during a drag undid the label's
  creation, and letting go wrote it back from the drag's copy. Undo waits for the button.
- **A square table of n spectra is n² cells.** The correlation table of 300 spectra was 90 000
  cells, redrawn on every save: ten seconds a save. Past a dozen it is a column.
- **A clock without a date wraps.** Times of day put 00:10 before 23:50; read in the order the
  spectra came, a reading twelve hours earlier than the last is the next day.

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

- **A copy made key by key drops the next key.** `plotCfg` rebuilt `ax` from x, y and y2, so
  the second X axis, saved and undone like any setting, was never drawn. Grep for the list of
  axes (`["x","y","y2"]`, `ax:{x:`) when adding one: `setAxisKeys("all")`, `allax.`, the
  quick styles and `fmtOf`/`styleFrom` had it too.
- **The first branch that matches wins.** `pdSet` sent `ax.x.brk.0.1` to its general `ax.`
  branch, which wrote a key called "brk" of value 0.1's parent. A specific path goes before the
  general one.
- **A tolerance for "is a whole number" needs a floor.** `stepOf(14)` asked whether 14/5×10¹⁵
  was a whole number within 10⁻⁹, and it was: zero. Every number came out as round as can be.
  Relative tolerance only, and a quotient of at least one half.
- **A curved axis cannot take a linear axis's numbers.** Wavelength over wavenumbers, stepped
  evenly, crowds at one end and leaves the other bare; picked for roundness alone it reads 35,
  20, 14. Even steps when they fit and cover the axis, else the roundest numbers, each round
  for the interval it falls in.
- **A text field that redraws its form on change takes itself away mid-event.** The redraw
  removed the focused field, its blur fired a second change, and the form was rebuilt inside
  its own rebuild. A field that redraws (`data-redraw`) does it after the event.
- **A row counted by offsetTop counts centred separators as rows.** A check of the toolbar said
  it wrapped at every width; it wrapped at none of them but 900 px. Measure as `fitToolbar`
  does. And text uppercased by CSS is uppercase in `innerText`.
- **A standard font has standard widths.** Text anchored at its middle or end is placed by the
  width of what is drawn; a PDF that names Helvetica without its metrics would set every
  centred title off by the difference. The writer carries the AFM widths of every font it
  names, and Symbol's for what Latin-1 lacks.

- **Counts are counted.** A gamma spectrum's noise is √N: tens of counts where the continuum is
  high, a few where it is not. One noise figure for the whole spectrum (a median, set by the
  quiet channels) made the Overview find 204 "spikes" and the finder call the continuum's
  wiggles peaks. The finder takes √N from the counts as recorded; any check that compares a
  height with "the noise" should ask which noise.
- **A name the user's code may reuse is not ours.** The epilogue read `e` (error bars) after a
  labelling example had used `e` for an energy, and every run failed with "e must be a
  sequence of numbers". A mode that returns no data does not read the data.
- **A constant used while the script loads must come before its user.** An array of examples
  naming a template string declared further down throws on load (the temporal dead zone) and
  takes the whole app with it.
- **file:// is no place to test storage.** Chromium sometimes gives two pages opened from
  file:// storage of their own, or reloads one without a write it just made: odd-test's tab and
  store checks failed about one run in three, on the committed version too, while two tabs over
  HTTP never did (16 of 16). odd-test serves the file over HTTP and waits for each page to have
  a project on the desk, not for a fixed time.
- **A wait that swallows its timeout hides that it never worked.** The first readiness check
  asked for `window.S`, which a top-level `const` never is, and every page waited its full 15 s
  before carrying on as if ready. Check a wait once without its `catch`.
- **"Not open" was two states.** Minimised and never opened looked alike (dashed) in a taskbar
  that listed every window, so nobody could tell what they had left where. Open, minimised and
  closed each look different now, and closed ones leave the taskbar.
- **Grey is not a hierarchy.** Four shades of text (ink, ink-2, muted, faint), faded buttons
  and small grey capitals made state words, headings and window names hard to read, and the
  app look like a template. Two text colours, the secondary one at 7:1 or more; headings in
  sentence case and the text colour; a state shown by shape (raised, flat, a bar), not by
  fading the words.
- **A list of everything is not a list of what is in use.** The Windows button listed every
  window, most never opened, under Open, Minimised and Closed. Lists show what is in use (as
  Excel's Switch Windows does); what is not is reached from its menu, and a list that can grow
  (twenty graphs) groups, folds into "more" or becomes a search.
- **Sticky inside padding floats.** A footer `position:sticky; bottom:0` in a scroller with
  14 px of padding stopped 14 px above the edge, and a table row showed beneath it. Offset it
  by the padding.
- **A string inside a template's expression is a string.** `${MP(…)}` written inside a
  double-quoted string in a `${DL([...])}` was not interpolated: it ended the string and broke
  the whole script. Inside those arrays, concatenate (`"+MP(…)+"`).
- **A model of the sheet goes stale with the project it was made from.** Every save hands back
  a fresh copy of the project; the worksheet's model held the old copy's columns, so a value
  typed while the 0.7 s delayed save landed went into a column nothing read any more: typed at
  an ordinary pace, ten values out of twelve came back blank. Writes go through `wsLive()`, and
  an edit names its column by id. Any object held across a save is a stale one.
- **A scroll put back before the content exists is put back to zero.** `renderWs` emptied the
  body and then restored `scrollTop`, which the browser clamped to the empty table's height:
  every value typed far down the sheet jumped the view to the top. The spacer goes in first.
- **A redraw on the first press swallows the double click, in the worksheet too.** At the top
  of the sheet `wsRows` redrew the rows on every selection (its margin test could never pass
  there), so the second click landed on a new element and the browser sent no dblclick:
  double-click to edit did nothing in the first rows. The margin test knows the ends, and the
  double click is read from the press's own count.
- **Leaving the page is an event.** A value saved 0.7 s after Enter was lost to a reload or a
  closed tab within that time; the page now enters and saves what waits when it is hidden.
- **A refusal that drops what was typed is a lost value.** "1.2.3" and Enter used to close the
  box with a toast; the text is kept in the box now, marked, until it is put right or
  cancelled.
- **Locked by default is not what a spreadsheet user expects.** Recorded values that could not
  be typed over made manual entry and correction a dialog per cell. Editing is the default and
  every edit is recorded; the lock is a choice of the project.
- **A random user finds what a script does not.** `tools/sheet-fuzz.mjs` (seeded clicks, typing at any speed, junk, scrolling and waiting mid-edit, undo, paste, sort, lock,
  resize, minimise) checks after every action that the data, the drawn cells and the
  fingerprint agree, what is stored is what is on screen, and a reload gives the same data. Its
  own mistakes (clicking the cell being typed in, `insertText` that fires no keydown) look like
  bugs: read the trail first. And it serves the page over HTTP: loaded from file://, two runs
  in thirty came back from a reload with an older project, the storage quirk odd-test met.
- **Plotting is the user's decision.** An import made every Y column a spectrum and asked
  how to graph them before anything else; columns meant for arithmetic first (a dark
  current, a reference) went straight onto graphs. Every column now comes into the worksheet
  with the role chosen for it, Plot is a choice that defaults to "Not yet", and graphs close.
- **A project just created is not current yet.** `afterImport` returned at once because `P()`
  was still null after `await createProject`: imports into a new project got no worksheet
  forward and no message. `whenOpen` waits for the store to list it.
- **Opening a window again opens it where it was.** Un-closing the first graph in
  `syncGraphWins` put it back at its full size, over the worksheet that had taken its place;
  the plot decided where it goes by whether it was open before the save, not after.
- **A column that drifts upward looks like an axis.** `detectPaired` took a dark current
  rising steadily for the X of an X,Y pair. Pairs are assumed only when every other column
  covers much the same range as the first.
- **A title with a fixed share pushes the buttons out.** `.win-t` did not shrink, and one more
  button (the graph's ×) put the minimise button out of reach with a long name. Titles shrink.
- **A cell kept in view must be let go when another is chosen.** After Enter the sheet keeps
  the new cell in view for 0.6 s (`S.ws.want`); a cell selected within that time was scrolled
  away from, and the edit begun in it closed, so Tab, Tab, Enter failed one run in two in a
  test that typed at once. `wsSelect` forgets it; `wsMove` sets it after.
- **An undone edit is not in the log.** An undo within 0.7 s of typing a value saved the
  snapshot with the waiting edit merged first, and the edit's log line was added after the
  snapshot's log: the log said a value had changed that the undo had put back. A save that
  brings its own `log` drops the waiting line.
- **An earlier stage drawn behind must be on the same X.** Channels drawn behind energies are
  another graph on one axis: the ghost and the before-and-after chart check X's name and unit,
  not only Y's scale.

- **A class name is global, again.** The outline of a graph a file is dragged over reused
  `fdrop`, which the History already uses for its 3 px insertion line, absolutely placed and
  deaf to the pointer: the graph window shrank to a line under the drag, and the drop fell
  through to the desk. A test that dispatched the drop at once never saw it, because the class
  was added a frame later. Grep a class before using it, and drop where the user would, after
  the dragover has done its work.
- **A drag's state belongs to the drag.** The tree remembered what was dragged in `S.xdrag`
  and forgot it on `dragend`; when the row dragged was redrawn away, its dragend reached
  nothing, and the next file dropped from the computer onto a folder was taken for a move
  within the tree and swallowed. A drop counts as the tree's only when its `dataTransfer`
  carries the tree's type.
- **A value a scale cannot show goes off the axis, not to NaN.** On a square-root or
  reciprocal axis a negative or zero value has no position; NaN in one coordinate breaks a
  whole path. Such values go off the low or high end (clipped), and the series leaves them out.
- **A date is only a date when its order is known.** 03/01/2024 is March in one country and
  January in another; only year-first dates are read, and in UTC, so a project reads the same
  wherever it is opened.

- **Two panels that touch share an edge.** With X shared the rows touch, and the top panel's
  lowest Y number and the next one's highest were drawn on the same pixels, one half hidden
  under the other's picture. Numbers within half a line of a touching edge give way.
- **A text size chosen by width differs between panels.** `buildPlot` draws smaller text below
  480 px, so a figure whose columns were 2 : 1 had two sizes of text side by side. A figure
  decides once for all its panels.
- **A label at the middle of every line piles up where the lines run together.** Every level
  of a narrow band's contours was written at one height, on top of the others. Labels go
  where they clear those placed before, along the longer stretches, or not at all.
- **A name is taken more often than you think.** The figure's panel menu was first written as
  `panelItems`, already the Window › Panels list; the duplicate-function check caught it
  before it replaced the other. Run it before the first drive.

- **Errors in X are not weights.** The first try at X errors in fits weighted each point by
  σ_y² + (f′σ_x)² (effective variance): the errors came out right and the slope stayed pulled
  flat, because X itself was still taken as exact. A test of the mean over 300 repeats caught
  it; orthogonal distance regression fits each point's X. Test a fit against its bias, not
  only its scatter, and against a closed form where there is one (Deming's line).
- **A first step can move only the hidden unknowns.** From an ordinary fit's result, the
  first orthogonal distance step moves the shifts in X and leaves the parameters where they
  are (the ordinary residuals are orthogonal to the model's gradient), and a convergence test
  on the parameters alone stopped there. Settled means nothing moves.
- **A statistic of 30 points is loose.** A drive expected the Y scatter found beside X errors
  ten times larger to be near its true 0.3; from 30 points it can be anywhere from 0 to 1.5.
  Check what is fixed by construction (the reduced χ² is 1), and test the estimate itself in a
  unit test with enough points.
- **A fit's units are its own spectrum's.** Results, the copied table and the report took the
  units from the analysed spectrum, so a batch row shown for another spectrum, or a fit kept
  while another spectrum was analysed, carried the wrong units. `fitUnits(f)`.
- **A derived spectrum's name is not its values' name.** A histogram's X was named "Histogram
  of Length" (the new spectrum's own name) instead of Length; the input of a derived spectrum
  now carries the source's value name (`yn0`).
- **A loop over the spectra must not rebuild the settings it was handed.** The columns and the
  size legend each asked every spectrum's style once per drawing, and every style asked
  `yTint`, which rebuilt the whole plot configuration: with 300 spectra a save went from about
  3.5 s to 5.6 s, and odd-test's limit caught it. `serStyle` passes its scheme to `yTint`; a
  save is now under 2 s. Pass what you have down rather than fetching it again per item.
- **Rounding up is not rounding.** Bin widths went to the next round number above, so a
  Freedman–Diaconis width of 1.09 became 2 and the histogram lost half its detail. The nearest
  round number, by ratio.

- **A tint is not a state on a poor screen.** The front window's title bar, a toolbar switch
  that was on and the chosen button of a segmented control were tints of 10 to 25 % of the
  accent, and borders were 1.4:1: on a low-contrast laptop the user could not make out what
  was on, chosen or in front. States are filled, edges are 3:1, words 7:1, and
  `tools/contrast-test.mjs` measures it in every theme and style.
- **Two editors for one job read as two jobs.** The axis title's box, the label's box and the
  legend's dialog had different buttons and keys, and the right-click menus around them listed
  different things in different orders: the user took the difference for a bug. One box
  (`inlineBox`), one rich field (`.rfield`), one menu order (`textMenu`).
- **A type for the plot is a type for every spectrum plotted.** `plotCols` gave a chosen plot
  type to the analysed spectrum alone: three columns plotted as symbols drew one as symbols
  and two as lines. It goes to every spectrum it plots.
- **Markup that cannot nest is not markup.** `PER_{log_{10}}` came out with a stray brace, as
  the old rich text read one level of braces. Text is LaTeX now, parsed into a tree; and a
  script's base joins the word before it (`PE` and `R` were two runs, measured apart).
- **A symbol the standard fonts lack must be mapped, or a PDF writes "?".** `\circ` came out
  as ? in the PDF. Every symbol the typesetter can produce is mapped (`VEC_SAME`, `AFM_SYM`)
  and the drive checks the PDF's missing list.
- **An attribute with no value is HTML, not XML.** A marker written `<g data-rt …>` worked on
  screen, and every export of a graph with typeset text failed: the figure's SVG is parsed as
  XML for PDF and EPS and loaded as an image for PNG. Attributes in drawn SVG always have a
  value (`data-rt="1"`); regression's ff4 caught it.
- **A patch that adds a function before deleting the old one finds two.** Inserting the new
  `annoMenuItems` and then looking for the old one by its first line found both, and the
  script stopped (writing nothing, as it must). Delete first, insert after.
- **A third value is not off.** `resid` gained "auto", and every reader that tested
  `resid !== false` read it as on, a drive's check included. A setting that grows a value gets
  one door (`residOn`), and every reader goes through it.
- **A project always has an X column.** `migrate` puts one back at the start when none is
  left, so making the first pasted column a Y only pushed the data one column to the right.
  The empty X column goes after the pasted ones instead.
- **A range that follows the zoom is a range nobody chose.** The fit's range was the graph's
  zoom; looking closer at a band changed the result and marked the fit out of date. The range
  is all the data until set, and shown.
- **One word is still a word.** The glossary counter skipped literals of fewer than two words,
  so `n + " spectra"` passed it 23 times. Fragments joined to a number or a name count now.

- **A test's helper builds today's project.** odd-test's `mkSpec` made its project with
  `blankProject`, which now starts with no graph; three checks failed for want of a graph to
  read ticks from, which looked like broken axes. The helper plots its column, as a user would.
- **A hint that shouts at what is not finished is noise.** The formula bar was red for every
  formula being typed (`max(A, B` is missing a bracket, `sq` is not a column): the only thing
  a user saw while typing was an error. A mistake at the end, or a name a function starts with,
  is said quietly.
- **Motion must not move what the user holds.** `applyWins` runs on every frame of a window
  drag; animating each change would chase the pointer. Only what the user asked for animates:
  not while a button is held, not when the desk is resized, not on the first layout.
- **A window on its way out is still on the desk.** Kept shown while it fades or shrinks into
  the taskbar, a closed window took clicks meant for what was under it; it is inert and deaf
  to the pointer until it is gone, and a window reopened mid-way stops going.
- **An animation on `transform` replaces the element's own.** The toast is centred and a
  dialog is placed by `transform`; an entrance written with `transform` snapped them to the
  wrong place at its end. Entrances use the individual `translate` and `scale` properties.
- **A class name is global, once more.** The pickers' entrance was first written for `.fp`,
  which is the History's code for a fingerprint: every check code would have faded in. The
  pickers are `.fpick` and `.cpick`; grep a class before styling it.

## Roadmap

Done in this round: the user's review after the UX rework's slice 5. The worksheet hides and shows
columns and rows, as Excel's Hide and Unhide (a marked strip, a marked row number, a double click
to show them, from the menus and Data › Hide and show), kept with the project and a view only.
A formula gets suggestions as it is typed (the columns by letter and name, x and i, every
function with its arguments and what it does, the constants; an argument hint inside a call),
in the F(x)= row, the formula bar and a fit function, and an unfinished formula is no longer an
error in red. Windows, menus, dialogs, toasts and the worksheet's cursor move briefly and
smoothly, as a desktop's and Excel's do, and not at all with Preferences › Animations off or
the system's reduced motion. Original and Processed appear only once there is processing. A
Preferences dialog (a gear in the title bar, File and Edit › Preferences…, Ctrl+,) has a
switch to keep no history at all, only errors. A new project, and an import, show the worksheet
alone: nothing is plotted until the user plots it. Python was removed (old projects keep their
Python steps' stored results).

Round before: the user's review of the interface. Columns move by dragging their letters,
or from their menu (Left, Right, To the start, To the end), each spectrum keeping its X; values
align left, centre or right; the value box above the grid is a formula bar, and F(x)= opens on
one click; the selection is a strong fill with a dark edge and filled headers; Fill moved from
the bar into the column's and the cell's menus, and the colour swatches above the columns went.
Plot setup, as Origin's: the kind of plot as pictures, the X, the Ys ticked, the graph, a
sketch. Text with LaTeX in every title, legend entry and label, typeset by Kurve's own engine
(scripts nested to any depth, maths in italics with its spacing, fractions, roots, accents,
fonts) in the graph's font, so the same on screen and in SVG, PNG, PDF and EPS, with a preview
wherever it is typed. The legend selected by a click and typed over in place; one typing box
and one right-click menu order for everything with text; each axis title's own font and style;
one Add menu in the Format dialog, and a proper dialog for a line. A new palette for screens
with little contrast, measured by `tools/contrast-test.mjs`. DESIGN.md now records the
interface's decisions and their reasons, round by round. A fix: plotting several columns with
a chosen type drew only the analysed one in that type.

Two rounds before: plots Origin has and Kurve lacked (the roadmap's next item). Histograms
of a column's values, made by a step so they follow the processing (bins chosen for the data
by Freedman–Diaconis, Sturges or the square root, or a number or width typed, a start; counts,
probability, percent or a density with area 1, cumulative), drawn as columns, a figure of
one per column; Columns as a plot type for any spectrum, several side by side. Box charts
(quartiles, median, mean, whiskers by Tukey's rule or to the extremes, outliers) and violin
plots (kernel densities with the box inside) of every spectrum on a graph, the values
scattered over them if asked. Fits with errors in X by orthogonal distance regression, for
curve, peak and batch fits, with or without Y errors. A legend of sizes for symbols sized by
a column. Figure panels spanning several rows or columns. A fix: Results showed a fit's units
from the analysed spectrum rather than its own.

Three rounds before: the next plotting options the user chose. Figures of panels, as Origin's
graph layers and Merge Graphs: graphs become the panels of one figure in rows and columns (a
panel per spectrum in one command, graphs chosen from a list, or a graph dropped on a figure),
their plot areas lined up by measuring every panel's margins, X or Y shared (one range and one
zoom, numbers on the outer edge only, the panels touching, the numbers at a shared edge giving
way), lettered (a), (b)…, columns and rows of chosen widths and heights; the panel clicked is
drawn live in its cell and the others as pictures; every export, the PDF and the report write
the whole figure. Maps of a series: the heat map against the series variable at real spacing
(rows between spectra interpolated), as an image, filled contours, contour lines with their
levels written along them, or the image with lines, the levels marked on the colour bar; cut
at one X (a trend graph of every spectrum's value there) or at one value of the series (the
nearest spectrum on a graph). Styling: points joined by a spline or a B-spline, symbols
coloured or sized by a third column with a colour bar, the area between two spectra filled
in two colours, hatched fills that PDF and EPS keep, and the graph copied to the clipboard as
a picture.

Four rounds before: the plotting options the user chose. The import dialog never plots, and
files dropped on the window are read and plotted at once (on the graph they land on, a new
graph, or an Explorer folder; "Read it differently" undoes and opens the dialog). A Project
Explorer as Origin's: folders and subfolders, the worksheet, each file with its spectra and
data columns, every graph (hidden ones too) and trend graph, dragged between folders, onto
graphs to plot, renamed, deleted, filtered, by the keys, and new things filed in the active
folder. Error bars in X and in Y, both ways or one side (Origin's six kinds), carried through
the processing and drawn as bars or a band, per spectrum; a prediction band beside the fit's
confidence band. Axis scales: ln, log₂, reciprocal and offset reciprocal (Arrhenius), square
root, probability; dates and times read from files and the worksheet and numbered on the axis;
a second Y axis in other units (transmittance over absorbance, a × y + b, a formula). Fixes:
a graph dragged over by a file shrank to a line (a class name shared with the History).

Five rounds before: plotting when you are ready, from a user's request. The import dialog
lists every column of the file with what it becomes (X, a spectrum, error bars, data kept for
formulas, or left out), reads X,Y pairs only when they look like pairs, and plots nothing
unless asked: Plot is Not yet (the worksheet takes the graph's place), one graph, one each
or stacked, remembered; several files the same. Columns are plotted from the worksheet
(select them, Plot: a type, panels, a new graph or added to one; a data column becomes a
spectrum, a selected X is the axis). Graphs close (×) and stay in the project, opened again
from Window › Open a graph, the History or Undo; graph tools open them. The first graph keeps
its own list of spectra once plotted, so later columns do not join it. Fixes: an import into a
new project did nothing after the import (no message, no worksheet); an undo just after typing
a value left the undone change in the log; a cell chosen just after Enter could lose the edit
begun in it.

Six rounds before: the worksheet for manual work, from a user's bug report. Typing far
down the sheet no longer jumps to the top, and values typed one after another are all kept
(they were lost whenever the delayed save landed mid-entry). Raw data is editable like any
spreadsheet (type over, clear, paste and fill over, insert and delete rows, every change one
undo step and an entry in the raw-data record), and the project can lock it, which brings back
the correction steps. A value that is not a number stays in its cell to be put right; input
methods type into cells (full-width digits are numbers); Tab, Tab, Enter returns to the first
column; double-click edits in the first rows too (it did nothing there); a column letter
selects with its first cell active; leaving the page saves what was just typed. A random-user
harness drives the worksheet in hundreds of unscripted steps and checks the data after each.

Seven rounds before: reading, windows and filling, from a user's review. Text has two
colours, the secondary one darker (7:1 or more in every theme and style), and headings are
sentence case in the text colour instead of small grey capitals; disabled controls are dimmer,
not unreadable. Windows as in Excel: the project's documents (graphs, worksheet, trend graphs)
keep their taskbar buttons, panels appear only while in use, open and minimised look different
by shape, many graphs share a button, and what does not fit goes under "n more"; the Window
menu lists the windows in use (a search past a dozen), Panels ticks every panel in use, with
Minimise the others and Close the panels. A Fill dialog as Excel's Fill › Series and Origin's
Fill Column With: series by a step or a factor with a stop value, evenly between two values
(linear or log), row numbers, a list repeated, random numbers (uniform, whole, normal,
Poisson counts) from a seed, and the trend of the values above; into empty cells of a column
or a new one, with a preview, one undo step and a record entry.

Eight rounds before: a gamma spectrum, from a user's file of background radiation. One-column
files of counts per channel are read (a .TKA file's live and real time into the metadata, X
the channel number from 0 or 1, √N error bars as a computed column, counts per second by a
step); calibrated to energy by a step (coefficients, remembered for the next file, or fitted
to peaks of known energy), by a worksheet formula that becomes the X axis (Use as X, Plot
against), or by Python. The peak finder knows that counts are counted: its noise is √N from the
counts as recorded, so the continuum's wiggles are not peaks and a line on a few counts is; it
searches regions, each with its own settings ("Peak finder settings", renamed from "How to
recognise a peak"). Peaks are named from known lines within a tolerance (each peak's FWHM by
default): the natural background's and calibration sources' gamma lines, or your own list
pasted or read from a file, kept with the project; or by your Python code, which gets the
peaks and the lines. The taskbar tells open, minimised and closed windows apart, with a close
button and a Windows list. Each edge of the frame has its own ticks and numbers, set by
clicking the edge in a picture of the frame.

Nine rounds before: figures, further. Boxes and ellipses drawn with a Shape tool (resized by
their corners, filled or not, behind the data or over it, with text inside, pinned or at data
values). Axis breaks on X and Y, suggested over the widest empty stretch, cut with two strokes,
the two sides on one scale, followed by zoom, wheel and pan, and named in the report. A second
X axis in other units (wavelength over Raman shift with its laser, micrometres over
wavenumbers, energy, frequency, a·x+b, any formula), numbered where the first axis has those
values, evenly when it can and with round numbers when it is curved, refusing a conversion
that is not one-to-one. Formats kept in the project, so a colleague who opens it has them,
or in the browser, renamed, copied and deleted from one menu. PDF and EPS from Kurve's own
writer: vectors, clipping, opacity (PDF), images, gradients, insets and every graph as one
figure, text in the standard fonts placed by their own widths. The toolbar keeps to one row
down to 860 px.

Ten rounds before: bugs found by using the app the way nobody does. A tab that froze for good
(ticks added up after a deep zoom), tick labels all alike on a nanosecond axis, NaN drawn for
equal or extreme limits; a second tab wiping the first's projects, a full store that still
said Saved, two projects sharing an id, a corrupt saved layout; typographic minus signs, French
thousands and multi-line headers lost on import, hex read as numbers, file names emptied of any
non-Latin script; a straight line through one X, slopes losing their digits near 10⁹, formulas
that overflowed the stack; times of day out of order across midnight, time zones ignored;
undo during a drag; ten-second saves with 300 spectra, 200 ms undo steps on big projects; long
names pushing title-bar buttons out of reach; batch rows of deleted spectra. Each fixed by its
class, and `tools/odd-test.mjs` keeps them fixed.

Eleven rounds before: graphs and projects, from a bug report. Deleting a project could leave its
graphs on the desk and the next import going into it (a store's events in the other order); a
graph in front that went away took the live plot with it. Both fixed. The taskbar names the
project its windows belong to, the project list says what each holds, new projects get names
of their own, the import dialogs name the project they add to, and exports name the graph.
Graphs plotted one by one are put together by holding and dropping (a graph by its grip, a
spectrum by its chip, onto a graph, its taskbar button or the desk; Ctrl keeps the graph
dropped; it scrolls on a phone), from menus, or in Combine graphs… with a layout; spectra
come from another project with their processing, peaks and colours.

Twelve rounds before: finding and labelling peaks, from what people asked. The Peaks window
says where it looks (the spectrum, always shown, and From … to … typed, taken from the view
or dragged on the graph, shaded there, kept with the set) and ends in Done; the Fit window
says which spectrum and range it fits, and ends in Done too. Fitted peaks are labelled with
any of their number, name, centre, height, FWHM, area and share, or your own text; with
errors and units; above, inside, or in a row along the top with leaders; turned, marked,
boxed, dragged; each peak can be named, and its name goes to Results, the report and the
exports.

Thirteen rounds before: many spectra at once. Global fits beyond Origin's NLFit: tick what every
spectrum shares (centres, widths, areas, shapes, the baseline, or parameter by parameter; a
curve model's parameters), each spectrum first fitted with those held so the fit starts where
it belongs, one block-sparse Levenberg–Marquardt problem, every row a normal fit that says what
it shares, errors from the whole covariance, out of date when any spectrum changes. The same
peak followed across the spectra, from the peaks found in each fit or marked in the Peaks
window, with one label for all of them and trends of their positions with no fit. Trend graphs
on the desk: several quantities, left and right axes, lines with slopes, SVG, PNG, the report.
Each spectrum keeps its file's header, and a field that differs (a temperature, the time it was
taken) is what a series can be plotted against.

Fourteen rounds before: figures for papers. Super- and subscripts, Greek letters and symbols in
every title, legend entry and label (`cm^{-1}`, `\alpha`), with buttons and a word
processor's keys; arrows drawn by dragging, their heads snapping to data points, with heads
of four kinds; insets made from a zoom, dragged and resized, outlined on the graph with
lines to the inset; guides that line text up with the plot's centre and other text; an
export for a journal column or a slide (sizes, the tick numbers at a size in points in
print, lines scaled with the text or not, SVG at its size, PNG with its dpi recorded, TIFF,
transparent backgrounds, a preview); formats saved by name and used on any graph in any
project, with five of Kurve's; a toolbar that keeps to one row at every width.

Fifteen rounds before: formatting the graph like a word processor, beyond Origin's Plot Details.
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

Sixteen rounds before: batch fits and trends. The analysed spectrum's fit fits every spectrum,
started from its result, from the neighbour in the series, or from the peaks found in each;
every result is a normal fit (drawn on every graph, in Results with its notes, a Fits box in
the History, replaced by a fit by hand, out of date when its processing changes). The Batch
window's table (each peak's centre, height, FWHM, area and share, or each curve parameter,
R², χ², band integrals and ratios) and trend plot against the order, a number in the names,
or typed values, with a weighted straight line (slope ± error). CSV, SVG and the report.
A fix to the runs test and peak checks, which read the analysed spectrum instead of the
fit's own.

Earlier still: several graphs per project, each in its own window, beyond Origin's:
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
1. Counting spectra, further: other analysers' files (Maestro .Spe with its calibration, N42;
   CHN and CNF are binary), FWHM and efficiency against energy, net peak areas over a local
   continuum with their counting errors and activities, a nuclide named by the set of its lines
   (their intensity ratios, interferences), region edges dragged on the graph
2. Plots Origin has and Kurve lacks, further: a distribution fitted over a histogram (normal,
   log-normal) with its parameters; box charts of one column grouped by another, notched
   boxes; stacked and grouped bars with category names; per-row or per-column shared axes in a
   figure; a map from scattered X, Y, Z (triangulated) rather than from spectra
3. Figures, further still: the graph's own fonts embedded in a PDF, a break at a chosen place
   with its own scale on each side, polygons and curved arrows
4. Getting around: a command search (Ctrl+K), a visible undo list, flow chart zoom and packed
   lanes, keyboard access to annotations and peak handles, handles for shape parameters
   (Lorentz fraction, Pearson m, Fano 1/q)
5. Many spectra, further: a parameter that follows the series in a global fit (a centre
   linear in temperature, a rate from Arrhenius), trend graphs formatted like any graph, the
   files' header fields as rows of the worksheet, global fits in a worker
6. More files: JCAMP-DX, then SPC; OPUS and SPE last
7. Under the hood: projects in IndexedDB rather than localStorage (no 5 MB limit, BroadcastChannel
   between tabs); `tools/odd-test.mjs` grown to run every example end to end; the worksheet
   drawing only the columns in view; speed with thousands of spectra
8. Collaboration follow-ups: mentions, a comment that proposes settings for a step and can be
   applied in one click, unread markers

## Known gaps

- Text with LaTeX: no matrices, arrays, aligned equations, `\newcommand`, or colours and sizes
  inside a text (the whole text has one colour and size); a legend's rows and a label's lines
  keep their spacing however tall a fraction in them is; the Help shows fractions and roots on
  one line (HTML), the graph sets them properly
- The legend: its entries are the spectra and the fit; there is no free line of text in it (a
  text pinned to the plot does that), and entries are typed over one at a time
- An axis title's own style is font, size, weight, slant, underline and colour; its place is
  the axis's (along it, or dragged)
- Moving columns moves whole columns of the Original sheet (not cells within a column, not the Processed
  sheet's); the colours of the interface follow DESIGN.md's rules, but the graph's own colours
  (data, grid, a colour picked for a label) are the figure's and are not checked
- Project Explorer: one item moves at a time (no multiple selection); a spectrum lives under its
  file and cannot be filed apart from it; folders organise the tree only (they do not hide or
  show windows as Origin's active folder can); dropping on a folder imports and plots with the
  automatic choices only
- Error bars: X errors are fitted (orthogonal distance) in curve, peak and batch fits, not in a
  global fit, a band's area or a trend line; the residual panel shows residuals at the
  measured X, and the prediction band leaves the X errors out; a weighted
  fit uses the mean of upward and downward errors (X errors too); a derived spectrum has its source's carried
  error only, both ways; an X error's scale under a step that resamples X is the local slope
  between neighbouring points
- Scales: breaks only on linear and log10 axes; the right axis of double Y, the heat map's
  colour bar and trend graphs stay linear or log10; ln and log₂ axes are numbered in whole
  powers; the probability scale is the normal one only (no Weibull, no logit). Dates are read
  year first and in UTC (no local time zone, no day-first or month-first dates), times of day
  as h:mm(:ss); the second Y axis needs a conversion one-to-one over the view, and is not drawn
  with double Y, a heat map or stacked panels

- One-column files: a .TKA file's two-line header is the only analyser header known; other text
  formats are read where their numbers make the longest block (their own calibration is not
  read), and binary ones (CHN, CNF) not at all
- Energy calibration is a line or a parabola; there is no FWHM or efficiency calibration, and
  from peaks each one's channel must be given (a source's lines are not matched on their own)
- Counting statistics: the noise comes from the counts as recorded in the same row, so after
  smoothing it is overstated (peaks look a little weaker than they are), and after a step that
  changes the unit (normalizing) the finder falls back to measuring the noise; it is the
  background's √N at a peak's base, not a net-area significance
- Regions are typed or added from the view or a drag; their edges cannot be dragged on the
  graph, and the Fit window's finder has none
- Known lines are matched by position alone, nearest first: a nuclide's other lines and their
  intensity ratios are not checked, nor interferences; no activities. Positions convert only
  among eV, keV and MeV
- The worksheet and trend graphs minimise but never close (graphs close, and stay in the
  project); a closed panel
  shows no news in the taskbar (open threads show in Window › Tool windows and on the History's
  boxes). One worksheet per project; windows have no tabs of their own
- Fill writes numbers down one column: no text or date series, no fill across a row by a
  series, no Excel-style flash fill; random numbers come from a seeded mulberry32, fine for
  simulation, not for cryptography
- Plotting from the worksheet plots whole columns (no range of rows, no plot of a selection
  of cells), against an X column; an older project's first graph shows every spectrum until
  it is plotted from the worksheet; a closed graph is closed for everyone who opens the
  project, and a viewer who cannot edit cannot open it
- The worksheet holds numbers only (no text cells); rows are inserted and deleted whole, never
  cells shifted within a column; a comment attached to a point keeps its row number when rows
  above it are inserted or deleted; the sorted view is a view, so a value typed into it takes
  its sorted place
- Numbers across from an axis: on the top panel only when stacked; not across from a second X
  axis; a heat map's Y edge has none
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
- Figures: a panel spans only empty cells (it never pushes another aside), and spans are set
  from the panel's menu, not by dragging its edges; a figure cannot be a panel of another; sharing X or Y is for the whole figure, not a row or
  a column; a shared range is the panels' data in the first panel's X units, and a panel in
  other units keeps its own; the text is small in every panel when the figure's columns are
  narrower than 400 px; a picture panel shows no readout until clicked
- Maps: the rows between two spectra are a straight-line interpolation; the side always spans
  the series (a Y zoom is not followed); contour levels are round numbers (about n), not
  values chosen one by one; a level whose lines have no stretch 60 px long goes unlabelled; a
  cut at one value of the series shows the nearest measured spectrum, not one interpolated
- Styling: the size legend is for the first spectrum sized by a column, in round values within
  its range; colour and size are read by
  recorded row, so a derived spectrum's points take its source's rows; a fill between two
  spectra is drawn only with overlaid spectra, and only between two spectra (not to a value or
  the fit); a spline can overshoot between unevenly spaced points; hatching is in the series'
  colour at one spacing; copying a picture needs a browser that allows images on the
  clipboard
- Histograms: bins of one width (no variable bins, no bins by quantile); a histogram is of one
  spectrum's Y or X, all its points (no range of rows), and no distribution is drawn over it
  unless fitted (a Gaussian fit works). Columns stand on zero (no other baseline, no stacking)
- Box and violin charts: one box per spectrum on the graph, in the table's order (no grouping
  by another column, no reordering but the table's, no notches); the names along X cannot be
  turned or styled apart from the tick numbers; a violin's bandwidth is Silverman's, not set;
  at most 5000 values scattered per box; no fit, annotations at data X or inset on them
- Several graphs: the X zoom is linked, not Y or the pointer (panels of a figure link Y when
  they share it); there is no keyboard shortcut to step through
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
- Python is gone: a project made with it keeps each Python step's stored result, which cannot
  be run again or changed (it does not follow a change to its input)
- With the history off, nothing is recorded from then on, so a report or the original data's
  record has nothing for that time; the switch is per browser, so in a shared project each
  person's choice covers only their own changes
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
- Annotations: no polygons, freehand or curved arrows, and a box or ellipse cannot be turned;
  rich text is scripts and symbols only (no
  bold or italic inside a text, no nested scripts); snapping is text to text and to the plot's
  centre, and an arrow's head to data points; nothing can be nudged with the keys
- Storage in this browser is localStorage: a few megabytes for every project together (a few
  hundred thousand points). A project larger than that says Not saved and must be exported;
  two tabs editing the same part of one project keep the later change
- The worksheet draws only the rows in view, but every column; with hundreds of columns it
  draws fewer rows around the view instead. An axis title longer than its axis is cut off at
  the plot's edge
- Export: a PDF or EPS sets its text in the standard fonts (Helvetica, Times, Courier,
  Symbol), not the graph's own, which only SVG keeps; a character outside Latin-1, Greek and
  common signs (Chinese, an emoji) is written as ? (the export says which); EPS has no
  transparency, so shading is mixed with white and hides what is under it, and its image of
  a heat map is hex, so large. A raster larger than the browser's canvas (about 16 000 px a
  side) is refused with a reason
- Fonts: web fonts come from Google Fonts, so offline only installed fonts show; an export
  embeds a web font only if it arrives within 10 s; a font is judged installed by its widths
  against two fallbacks, so one that measures exactly like one of them reads as missing
- Axes: an axis at zero or at a value stays at the bottom in stacked panels, and Y stays on
  the left with two Y axes; numbers turn 0°, 45° or 90° (Y: 0° or 90°); titles are dragged in
  pixels, so a resized graph keeps the offset, not the proportion. Breaks are a gap in
  proportion (one scale on both sides; no break at a chosen place with two scales), Y breaks
  only with overlaid or offset spectra, at most eight shown; the second axis is X only, sits
  across from the first and cannot be dragged, and a conversion must be one-to-one over the
  whole view
- A peak set follows its spectrum's processing, but not a change of the finder's settings made
  while another spectrum is analysed: "Every spectrum" applies them to all. Two identical
  spectra overlaid draw their labels on top of each other
- Worksheet formulas are whole-column (row by row); there are no cell formulas, no references
  to other rows (`B[i-1]`), no relative formulas when filling right, no replace in find, and
  sorting never reorders the recorded data (by design)
- Binary instrument formats (SPC, OPUS, SPE) and JCAMP-DX are not read; text exports only
- The preview pane serves a snapshot of the file, so `location.reload()` re-runs stale code —
  navigate to the file again after editing, or you will test the previous version
