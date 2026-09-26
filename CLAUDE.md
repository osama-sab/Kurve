# Kurve: collaborative Origin-style data analysis

Single-file web app (`kurve.html`): HTML, CSS and vanilla JS, no build step, no dependencies
besides Google Fonts. Open the file in a browser to run it.

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
  (`max`, or `deriv2` for shoulders that never form a maximum) and `seedPeak`.
  `tools/fit-test.mjs` checks each shape integrates to its stated area and has its stated FWHM,
  and that known multi-peak spectra are recovered. Run it after touching any of this.
- **Fits** come in two kinds. `MODELS` (each with `params`, `ph`, `formula`, `f(x,p)`,
  `guess`, optional `derived` with delta-method errors) drives the "One curve" panel.
  `{kind:"composite", spec, x0, …}` drives "Peaks + baseline". `fitModel(fit)` hands either to
  the plot, the CSV export and the report; `activeFit()` returns the current one if it is valid.
  Anything that reads `p.fit` must go through those, not `MODELS[p.fit.model]`.
- **Import** (between the `==PARSER:START==`/`==PARSER:END==` markers): pure, DOM-free functions
  that sniff a file — `detectFormat` (delimiter and decimal mark decided together, since `1,5;2,5`
  only parses if you treat `;` plus comma-decimal as one hypothesis), `findBlock` (the longest run
  of consistent numeric lines, so an instrument preamble and a trailing footer are found rather
  than fought), `parseMeta`, `detectRoles`, `detectPaired`, `analyzeFile`, and `checkColumns`
  which reports findings without applying them. `tools/parser-test.mjs` extracts this block
  straight out of the HTML and tests it under node; run it after touching anything here.
- **Columns**: a project is a table. `p.cols` is `[{id, role, name, unit, data, of?, formula?}]`
  with roles `x` / `y` / `e` (an error column names its Y in `of`) / `ignore`, and `p.activeY`
  says which Y the fit and the analysis panels use; the others are drawn behind it for
  comparison and can be hidden via `p.plot.hidden`. Helpers: `xCol`, `yCols`, `activeYCol`,
  `errColFor`, `colById`, `makeCol`, `colLabel`. Nothing should reach for `p.x`/`p.y`/`p.e`
  any more — `migrate()` converts those v1/v2 documents to v3 columns and deletes them.
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
  magnitude.
- **Undo**: `pushUndo(label)` before any mutation, `undo`/`redo`, snapshots of `UNDO_KEYS`. It is
  per-session and local on purpose — rewinding your own edits, not other people's.
- **Storage**: `LocalStore` (localStorage, single user) and `makeDbStore(db)` (claude.ai artifact
  runtime, shared realtime). Both expose the same interface: `watchProjects`, `create`, `save`,
  `remove`, `watchComments`, `addComment`, `updateComment`, `deleteComment`. To add a real
  backend (Firebase, Supabase, a custom server with WebSockets), implement this interface.
- **State**: global `S`; the current project is `S.proj` with `cols` (see Columns above),
  `activeY`, `mask` (raw row indices), `steps`, `meta` (captured from the imported file's
  header), `plot` settings (`style`, `logY`, `grid`, `resid`, `revX`, `hidden`), `fit`, `log`,
  and `v` (document version; `migrate()` upgrades older projects in place).
- **Rendering**: `buildPlot(W,H,palette,forExport)` returns an SVG string used both on screen and
  for export. `renderWs`, `renderFit`, `renderThread`, `renderLog`, `renderTop`, `renderAll`.
- **Export**: `saveFile(name,data,mime)` uses the claude.ai `downloads` runtime when present and
  falls back to `Blob` + `<a download>` otherwise, so exports work from disk. `exportCsv` carries
  every column with units, the mask flag, the fit, residual, baseline and each peak curve, plus
  commented blocks for metadata, cleanup, computed columns and fit statistics. `exportReport`
  writes a self-contained HTML document (figure, parameter table with units and uncertainties,
  statistics, method, session log); `peakTableText` is the same table as TSV for `copyText`.
- **Boot**: `boot()` asks `window.claude.use(...)` for `db`, `user`, `room`, `downloads`. Outside
  claude.ai these are absent, so the app falls back to `LocalStore` and hides presence.

## Running outside claude.ai

Works fully as a single-user app, exports included. Only collaboration (shared projects,
presence, names) depends on the claude.ai runtime and would need a real backend behind the
`LocalStore` / `makeDbStore` interface.

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
- **The preview pane serves a snapshot**, so `location.reload()` re-runs stale code. Navigate to
  the file again after editing.
- **Undo has to cover the panel you are working in, not just the document.** The peak set being
  built lives in `S.pdraft`, outside `UNDO_KEYS`, so Find peaks / Clear / Delete peak were logged
  and not undoable — the History note promises a record the app then could not keep. `snapshot()`
  now carries `pdraft` too.
- **A unit built from two others is not a unit when half of it is missing.** An area printed as
  `cm⁻¹` because the Y column had no unit is dimensionally false; `unitFor` returns nothing rather
  than half an answer.
- **"Reset to estimates" means all of it.** It re-seeded only the baseline, so after a shape change
  it handed the fitter back the seed that had just failed. A peak that has run off the end of the
  spectrum is now put back on the largest feature no other peak is describing, not on the nearest
  edge point.
- **The report is the artefact that leaves the building.** Every caveat on screen — excluded
  components, dependency, at-bound, singular covariance, non-convergence — has to be in it.
- **Two spectra with no common X do not belong in one row.** Adding a column whose X range does
  not overlap the project's now appends rows instead of lining up by row number, so every value
  keeps the X it was measured at. The toast and the log say the same thing, because they used to
  say opposite things from one shared string.
- **Transient UI has to be torn down on a project switch too.** The hover tooltip stayed on
  screen across a switch, showing the previous project's point, value and units. So does any
  field guarded by `document.activeElement` — guard on the project id as well, or a rename in
  progress freezes the name of a project you are no longer looking at.
- **`toFixed` sized from an uncertainty needs a ceiling.** A synthetic curve fitted by its own
  generating function drives the error to ~1e-23, and 24 decimals of floating-point noise makes a
  correct fit look broken. Past 12 decimals `fmtPM` states the error as an exponent instead.

## Known gaps / next steps

- Only one Y column is fitted at a time: no batch across a series, no global fit with shared
  parameters, and no summary table of a parameter against sample
- The import wizard reads one Y column; extra columns have to be added by hand afterwards
- Peaks cannot yet be dragged on the graph; you place one by clicking, then type values
- No parameter sharing between peaks (a common instrument width), and no custom expressions
- Baseline is only ever fitted with the peaks; there is no subtract-and-bake path (ALS, anchor
  points, Shirley/Tougaard). Those belong in `STEPS` so they inherit `derived()` and undo.
- Integration is over the visible range only — no per-peak integration bands to drag, and no
  peak table from integration alone (areas currently come from the fit)
- Binary instrument formats (SPC, OPUS, SPE) and JCAMP-DX are not read; text exports only
- True Voigt is approximated by the pseudo-Voigt shapes; there is no Faddeeva implementation
- The preview pane serves a snapshot of the file, so `location.reload()` re-runs stale code —
  navigate to the file again after editing, or you will test the previous version
