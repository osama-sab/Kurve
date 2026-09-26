# Origin menus, data tools and properties: reference for building Kurve

Audience: me (Claude), reading this before implementing features. It is a working reference, not
marketing. Companion to `ORIGIN_SPECTRA_RESEARCH.md` (which covers the Peak Analyzer in depth; not repeated here).

Evidence tags used throughout:
- **[doc]** read on an OriginLab documentation page or the official Origin vs OriginPro 2024b comparison PDF.
- **[web]** from a search-result snippet, not a full page.
- **[gen]** my own background knowledge or inference; not verified in this research. Treat as a hypothesis.
- **Pro** = OriginPro only (per the 2024b comparison PDF unless said otherwise).

Known gaps in what I could verify: the docs site returned 404 for the built-in fitting-function list, the graph
axes chapter, and the "average multiple curves" page. Origin has no single "menu reference" page, so the menu
lists below are reconstructed from chapters, the PDF and search snippets. Where I list a menu's contents from
memory it is tagged [gen].

---

## 1. Origin's architecture (this drives everything else)

### 1.1 Project and window types [doc]
An Origin **project** (.opju) holds child windows shown in a **Project Explorer** (folders on top, contents below).
Window types: **Workbook** (sheets of columns), **Graph**, **Matrix book** (2D grid data, images), **Layout page**
(publication page combining graphs, tables, text), **Notes**, plus Excel-in-Origin.
The **menu bar is context-sensitive**: it changes with the active window type; only relevant menus show. [doc]

### 1.2 Object Manager, Results Log, Code tools [doc]
- **Object Manager**: quick control of the active graph or workbook (select/hide plots or sheets).
- **Results Log**: timestamped record of every analysis result. **Messages Log**, **Smart Hint Log**.
- **Code Builder** (Origin C and Python IDE), **Command Window** (LabTalk with autocomplete), **Apps Gallery** (App Center).
- **Mini toolbars** appear on selection (pop up near the selected object, fade, come back with Shift). Toolbars dock/float/hide; Alt-drag moves buttons. 2025b adds a modern search box that searches menus, toolbars, apps, samples and FAQs by task keyword, key chords, and a window switcher. [doc]

### 1.3 The dataset naming and linking model [doc]
- A dataset = column, addressed `[BookName]SheetName!ColumnName` (short name A, B, C by default, or a **long name**
  in quotes). The **same dataset** is shared between worksheet and graph; edits propagate to both.
- Datasets carry **style-holder** info (plot type, e.g. line+symbol) that transfers between graphs.
- Deleting a dataset deletes its plots. Worksheet cells can also hold graphs, images, objects, links, variables.

### 1.4 The three concepts that make Origin feel "live" [doc]
1. **Recalculate: None / Auto / Manual** on almost every analysis and set-column-values dialog. Results are linked to
   their inputs; when data change (including masking or unmasking), outputs update.
2. **Themes**: saved dialog settings, recalled in the dialog or from scripts ("makes repeat analyses a snap").
3. **Analysis Templates + Batch Processing**: a workbook/graph with linked analysis, reused on new data.
Locked (padlock) output columns mean "computed; do not hand-edit". Right-click "Change Parameters" reopens the original dialog. [doc]

**Kurve implication:** its `S.proj` holds raw arrays (`x`,`y`,`e`). Adding a *derived-data pipeline* whose outputs
recompute when inputs, mask, or parameters change is the single most Origin-like architectural move.

---

## 2. Menus by window type

### 2.1 Workbook menus (names [web]/[gen], contents partly [doc])
File, Edit, View, Plot, Column, Worksheet, Analysis, Statistics, Image, Tools, Format, Window, Help.
Most-recently-used commands appear at the bottom of the analysis menus. [web]

**Plot menu** [gen]: creates graphs from selected columns. Graph type categories [doc, Appendix 2]: 2D line, scatter,
line+symbol, column/bar, pie, multi-axis, multi-panel, waterfall, statistics, grouped, map, area, specialised,
financial, 3D XYY, 3D surfaces, 3D symbol/bar/vector, contour, image and profiles (19 categories, 100+ types).

**Column menu** [doc/web/gen mixed]:
- Set as X / Y / Z / X Error / Y Error / Label / Group(Subject) / Disregard: the 9 **designations** [doc].
- Set Column Values (see 3.5). Fill Column With: row numbers, uniform random, normal random, patterned numeric
  (patternN), date/time (patternD), arbitrary text/numeric (patternT); modes Repeat or Random. [doc]
- Add New Columns, Move Columns (first/last/left/right), Add/Update Sparklines (tiny in-cell plot of each column in a header row). [doc/web]
- Mask Cells by Condition (mathematical criteria, e.g. ≤ 0). [doc]
- Column Properties (long name, short name, units, comments, width, format, digits, plot designation). [doc]

**Worksheet menu** [doc/web]:
- Sort Worksheet / Sort Columns (asc/desc, multi-key), Sort Columns by Labels.
- **Restructure**: Transpose (all columns must share the same format), Stack Columns / Unstack Columns (inverse, incl. unstack by time interval), Split Columns, Convert to XYZ, Split Worksheet into new sheets, Append worksheets, Join two/multiple sheets by column, Join by label, Stack worksheets by column label.
- Freeze rows/columns, Dividers (split into panels), Select/Hide Columns, Column List View.
- **Worksheet Query** (SQL-like extraction, incl. multi-sheet in 2025b), **Pivot Table**, **Time Series Pivot**, **Data Filter**, **Conditional Formatting** (min/max highlighting, top/bottom, Pareto, outlier detection, 2025b).
- Clean data: Remove masked cells (2025b). Paste Insert (2025b).

**Edit menu** [doc]: Insert/Delete rows and columns (new columns are Y by default), Convert to Matrix (direct, 2D binning, XYZ regular, XYZ random via gridding).

**Analysis menu** [doc]: Mathematics (Interpolate/Extrapolate, Differentiate, Integrate, Normalize, Simple Math,
Average Multiple Curves, Subtract Straight Line, Subtract Reference Data), Fitting (Linear, Polynomial, Multiple
Linear, Nonlinear, Quick Fit, Implicit, Surface, Fit Comparison, Rank Models, Fitting Function Builder/Organizer,
Simulate), Peaks and Baseline (Peak Analyzer, Multiple Peak Fit, Batch Peak Analysis, Quick Peaks), Signal
Processing (Smooth, FFT, FFT Filters, IIR, Convolution, Deconvolution, Correlation, Coherence, Wavelet, 2D versions,
Envelope, Decimation, Hilbert, STFT), Statistics, Image tools. Find Apps lives under Fitting/peak submenus. [doc]

**Statistics menu** [doc]: Descriptive Statistics, Hypothesis Testing, ANOVA, Nonparametric tests (Pro), Survival (Pro),
Multivariate (PCA, cluster, discriminant, PLS; Pro), Power and sample size (Pro), ROC (Pro), and statistics charts.

**Tools menu**: in the *workbook*, Tools includes the Fitting Function Organizer (F9) and Fitting Function Builder. [doc] (The Tools menu page I
fetched was the X-Function Builder's own Tools menu: tree view, edit in Code Builder, clear document.)

### 2.2 Graph menus [gen/web]
Graph-window menus include Graph, Data, Gadgets, Analysis, Format. Key commands:
- **Insert → Plot to Layer** (add/swap datasets, Layer Contents dialog: add/remove/group/reorder plots). [doc]
- **Data → Data Selector (regional), Data Reader, Screen Reader, Pick Points, Data Highlighter, Set Display Range/Edit Range.** [doc/web]
- **Gadgets** (see 5). **Format → Plot Details / Axes / Layer / Page.**
- Add Text, drawing objects, axis-related objects (reference lines), data labels, error bars, insert graph/table/image in graph. [doc]
- Layer management: multi-layer graphs (layer = axes set); active layer indicator; hide/delete plots/layers. [doc]

### 2.3 Matrix and Layout menus [doc]
Matrix: image processing (adjustments, arithmetic, geometric transforms, spatial filters, conversion), gridding, 2D FFT etc.
Layout: master page layouts, print, export, animation. Both are lower priority for a 1D spectra tool.

---

## 3. Worksheet data model and manipulation

### 3.1 Column designations [doc]
X, Y, Z, X Error, Y Error, Label, Group/Subject, Disregard. Designation decides how a column is plotted and analysed
(e.g. a Y Error column becomes error bars and weighting). *Kurve today: fixed x, y, e (=yEr).*

### 3.2 Header (label) rows [doc]
Metadata rows above the data: Long Name, Units, Comments, Sampling Interval, Parameters, F(x) (formula), Sparklines,
plus user-defined rows. Label values feed axis titles, legends, and **Z-value source for waterfall offsets**.
Data import can pull instrument header metadata into these rows. *Kurve today: `xLong`, `xUnit`, etc. exist per project only.*

### 3.3 Column properties [doc]
Data type (text, numeric, date/time, container), format (decimal, scientific, engineering), digits (decimal places or
significant digits), width, plot designation, "Sampling Interval" (uniform x spacing declared instead of stored).

### 3.4 Cell/column ranges [doc]
Range notation like `[Book1]Sheet1!Col(B)[1:100]`, `(A,C),(2,3)`, output strings `<new>`, `<input>`, `<source>`, `<none>`;
a Range Browser and Range String Builder. Row selection "By Row" or "By X" (value-based; "By X" supports named ranges).

### 3.5 Set Column Values dialog [doc]
Formula-driven columns. Parts: Column Formula (one-line expression), **Before Formula Scripts** (multi-line LabTalk),
Row range, Target column(s). Menus: Formula (load sample, load/save formula), Column references (`wcol(N)` or `Col(LongName)`), Function
(categorised, Recent, Search and Insert), Variables (predefined: `This`, `[i]` row index, `pi`, `j` column index; project, range, info, and
label-cell variables). **Recalculation: None / Auto / Manual**, so a column stays live as its inputs change.
2025b/2026: click-to-reference cells (Excel-like), Flash Fill/Smart Formula, mirror columns (reference data without copying), formula copy across sheets. [doc]

### 3.6 Generating data [doc]
Row numbers, uniform random, normal random (mean/sigma), patterned numeric (start, end, increment, repeat/random),
date/time patterns, arbitrary text/numeric lists.

### 3.7 Masking [doc]
- Mask worksheet cells (Mask toolbar: Mask Range, Unmask, Swap Mask, Change Color, Hide/Show, Disable) or by condition.
- Mask graph points: three modes toggled with Space: rectangular region, freehand region, row-index range; double-click a single point.
- Masked cells show red in the sheet; masking is **bidirectional** (graph ↔ sheet); masked counts in status bar.
- **Masking or unmasking triggers recalculation of linked operations.** Masked data excluded from fitting and analysis by default, optionally hidden in graphs, colour customisable, per-graph toggle (2025b).
*Kurve already has masking; recalculation-on-mask is the piece to copy.*

### 3.8 Selecting data for analysis [doc]
Pre-select, or use in-dialog range controls; **Regional Data Selector** (rectangular/freehand ROI) on a graph; Pick Points; Data
Highlighter; active plot vs whole group (Shift-click). Data markers editable with keyboard (`s`, Tab, Enter, arrows).

### 3.9 Import and export [doc]
- Excel import; third-party formats via X-Functions; simple ASCII import with an **Import Wizard** (define delimiter, header lines, column types; save as a filter); **Import Filter Manager**.
- **Data Connector**: worksheet holds a link, not the data. Refresh on open, on file change, or periodically (5 s to 3 days); optional LabTalk **post-processing script** runs after each import; dependent analysis recalculates. 2026: periodic refresh, remove connector after import. [doc]
- Drag-and-drop import, partial import and re-import, metadata from file headers, database import, export of sheets.
- Spectroscopy formats: Thermo SPC/CGM, JCAMP-DX, Princeton SPE. [doc]

### 3.10 Other
Unit handling is per-column; dates/times are first-class numeric types. Notes windows document projects. [doc]

---

## 4. Analysis tools: mathematics, fitting, signal processing

### 4.1 Mathematics [doc; Pro flags from the PDF]
| Tool | What it does |
|---|---|
| Simple Column/Curve Math | Arithmetic between columns or curves. |
| Interpolate/Extrapolate | 1D (linear, cubic spline, B-spline), Y from X; trace interpolation on XY and XYZ; 2D; 3D (Pro). |
| Differentiate | Any order; centred-difference default; optional Savitzky-Golay smoothing (poly 1-9); can plot result. |
| Integrate | Trapezoid; mathematical (signed) vs absolute area; 2D volume (Pro). |
| Normalize | 16 modes (see spectra doc); composite dataset option. |
| Average/Merge Multiple Curves | Interpolates curves to a common X, then mean, SD, SE. (page 404; from summaries.) |
| Subtract Straight Line | Linear detrend. |
| Subtract Reference Data | Curve minus reference curve. |
| Polygon Area, XYZ/matrix surface area (Pro) | Geometry. |

### 4.2 Curve fitting [doc]
**Linear/polynomial**: Linear Regression (with X error: Pro), confidence ellipse, Polynomial, Multiple Linear, partial leverage plots, residual analysis.
**Nonlinear Curve Fit (NLFit)** dialog structure:
- *Function Selection*: category → function; `<New>` opens the Builder, `<Add>` imports an .fdf, `<Search>` finds functions/Fitting Function Library.
- *Iteration algorithm*: **Levenberg-Marquardt** (default) or **ODR** (Pro; default for implicit fits, handles X and Y errors).
- *Data Selection*: multi-dataset modes: Independent (consolidated or separate report), **Concatenate**, **Global Fit** (shared parameters). Per-range weighting, rows All / By Row / By X.
- *Parameters*: initial values (auto from initialization code), Fixed, Shared; derived parameters; *Bounds* and general constraints; *Code* for user functions.
- *Weighting*: none, instrumental (from error column), statistical, arbitrary dataset, direct.
- *Fit Control*: max iterations, tolerance (chi-square change), derivative delta (fixed or adaptive), CI method (asymptotic-symmetry vs model-comparison), "Scale error with sqrt(reduced χ²)" (default on), invalid-weight handling.
- *Quantities*: which parameter columns and statistics appear (list in spectra doc), plus covariance, correlation, ANOVA, summary stats.
- *Fitted curves*: X data (same as input, uniform, log, existing dataset, follow curve shape), point count, range, **confidence and prediction bands**, plotting on source graph, preview.
- *Residual analysis*: regular, standardised, studentised, studentised-deleted residuals; six plots (vs independent, histogram, vs predicted, vs order, lag, normal probability).
- *Find X/Y*: lookup tables (Y from X, X from Y) for standard curves.
- *Replica* (peak fitting): fit n identical-form peaks by "replicas" using a peak-finding method to seed.
- *Output*: report sheet tables, result table on graph, dataset identifier (range, book, sheet, long name, units, comments), grouping of result graphs.
**Fitting Function Organizer (F9) / Builder** [doc]: functions stored as `.fdf` (category, parameters, expression, constraints,
initialization code). Builder is a wizard: Name and Type, parameters, expression, initialization code, etc.
**Extras**: Fit Comparison (F-test, AIC, BIC; Pro), Fit and Rank Multiple Models (Pro), Surface fitting (Pro), Implicit fitting (Pro),
Simple Fit and Find a Fitting Function apps, Sequential Fit, Global Fit with multiple functions, Composite Spectrum Regression (Pro apps).
**Reporting** is a **collapsible tree** of tables in one report sheet, copyable as text/HTML/image, exportable to Word/PowerPoint. [doc]

### 4.3 Signal processing [doc]
Smoothing (Adjacent Averaging, S-G, Percentile, FFT filter, LOWESS/LOESS, Binomial), FFT filters (low pass, low pass
parabolic, high pass, band pass, band block, threshold), FFT with options, **Convolution/Deconvolution** (Fourier-theorem
based), 1D Correlation, and Pro: IIR design, 2D FFT, STFT, wavelets (DWT/CWT/denoise/smooth), Hilbert, envelope, decimation,
coherence, 2D correlation, rise/fall time. Apps: **Fourier Self-Deconvolution** (Pro), Signal-to-noise ratio (Pro), PSD (Pro),
**2D Correlation Spectroscopy Analysis** (Pro), **PCA for Spectroscopy** (Pro), Empirical mode decomposition, FFT Examiner.

### 4.4 Statistics (relevant to spectra) [doc]
Descriptive statistics, normality tests, Grubbs/Q outlier tests, t-tests, ANOVA with mean comparison, statistics charts
(histogram, box, QQ, probability). Multivariate (PCA, cluster, PLS) is Pro. Lower priority for Kurve, except **outlier detection** and **descriptive stats of a selected region**.

### 4.5 Peak Analyzer algorithm notes worth remembering [doc, pa-algorithm page]
- 2nd-derivative baseline: smooth (adjacent averaging), take y″, choose points where y″≈0 (low curvature κ = y″/(1+y′²)^1.5), fit a polynomial through them.
- **ALS**: minimise S = Σ wᵢ(yᵢ − bᵢ)² + λ Σ (Δ²bᵢ)²; weights updated iteratively by asymmetry p; λ is on a log scale in the UI.
- **Shirley**: Bₙ(E) = kₙ ∫ [I − I_max − Bₙ₋₁] dE′ iterated; **Tougaard**: adds the (E′−E)/(1643+(E′−E)²)² kernel.
- End-points-weighted: 6% window adjacent-average smoothing, then linear interpolation.
- Peak finding: local maximum (brute force n-point window), window search, first-derivative zero crossings, 2nd-derivative (amplifies hidden peaks), residual-after-first-derivative (subtract Gaussian fit and re-derive), Fourier self-deconvolution followed by local max.

---

## 5. Gadgets (ROI-driven quick tools) [doc]

A **gadget** draws a rectangle (ROI) on a graph; results appear in a small output and update live as the ROI moves or resizes.
List: Quick Fit, Quick Sigmoidal Fit, Quick Peaks, Cluster (Pro), Rise Time (Pro), Data Extraction, Differentiate, Integrate,
Interpolate, Intersect, FFT, 2D Integration (Pro), Vertical Cursor (global across graphs), Image/Contour Profile, Statistics, Digitizer
(extract data from an image of a plot).
Design pattern to copy: *one drag region → immediate numbers*, no dialogs.

---

## 6. Graphing

### 6.1 Page-Layer-Plot hierarchy [doc]
A graph **page** holds **layers** (each with its own axes) which hold **plots** (datasets). Templates (.otpu) and *themes* store
formats. A **Graph Options** dialog sets defaults for active/folder/all graphs (2025b).

### 6.2 Plot Details dialog tabs [doc/web]
Symbol, Line, Drop Lines, Group, Offset, Stack, Waterfall (X/Y offset and Z-value source), Spacing, plus Layer and Page properties.
Reuse of **grouped plots**: style lists for colour, symbol shape and size; increment modes **None / By One / Stretch / Binned**;
**Concerted vs Nested** hierarchy. This is how 30 spectra get 30 distinct colours in two clicks.

### 6.3 Axes [web; graph-axes page 404]
Scale type (linear, log, reciprocal, etc. [gen]), **Reverse** checkbox (needed for wavenumber and binding energy), from/to, increments, ticks, grid, titles, axis breaks (mini-toolbar button in 2026), secondary/multiple axes, custom tick labels [gen].

### 6.4 Annotation and extras [doc]
Text and drawing objects, axis-related reference lines (mini dialog; from label-row values in 2026), data labels, error bars, slope annotation (2026), trend lines (linear, polynomial, power, log, exponential, moving average, with fixed parameters; 2025b), insets, multi-panel/stack, waterfall (2D/3D), graph protection, masked-point toggle, Slicer tool for browser graphs.

### 6.5 Export and publishing [doc]
Copy/paste or OLE embed, export to image files (EPS, BMP, JPG, TIF listed; others exist [gen]), **Layout page** with master pages, animation, print, DPI control.

---

## 7. Apps, extensibility, automation

- **Apps** (free add-ons from File Exchange) are how Origin grows: Peak Deconvolution, Tangential Baseline, XRD Analysis, Align Peaks, Global Peak Fit, Fourier Self-Deconvolution, PCA for Spectroscopy, 2D Correlation, Piecewise Peak Fitting (2025b), Nyquist plot, Metrohm and Neware connectors, Tauc/Kubelka-Munk templates [web]. [doc]
- **X-Functions** are the single unit of computation: every dialog is an X-Function with input, output and options and a category (it appears on menus). Recalculate and Theme both hang off X-Functions. [doc]
- Scripting: LabTalk, Origin C, Python (and external Python via `originpro`). Button scripts, custom menus/toolbars. [doc]
- 2026: Flash Fill, smart formula, Excel cell-formula import, hotkey to reopen the last analysis dialog, repeat last action, Find in Project Files, graph maker. [web]

---

## 8. Pro vs standard (relevant to spectra) [doc, PDF]

Standard Origin includes: baseline detection and subtraction, peak finding, peak integration, batch peak analysis, Savitzky-Golay/adjacent/FFT/percentile smoothing, FFT filters, FFT, convolution/deconvolution, correlation, differentiation, integration, interpolation, normalization, multiple linear regression, nonlinear fit with bounds, weights, global fit, fit with Y error, quick gadgets.
**Pro only**: *peak fitting, fit baseline with peaks, fit individual peaks with different functions*, hidden-peak finding methods, ODR/X-error fits, implicit fits, fit comparison, model ranking, wavelets, IIR, STFT, PCA/cluster/PLS.
Note the PDF says peak *fitting* itself is Pro, even though it is the workhorse of spectral analysis, a strong argument that Kurve giving it away is a real differentiator.

---

## 9. Mapping to Kurve

### 9.1 What Kurve has today (from `kurve.html`)
- Numerics: `solve`, `inverse`, `lmFit(f,X,Y,W,p0,fixed)` (LM with weights and fixed parameters already in the signature!), `tQuantile975`, `polyfit`, `peakGuess`; `MODELS` = linear, gauss, lorentz, expdec, boltz with `derived` values and delta-method errors (`derivedWithErr`).
- Data model: `S.proj` = `{x[], y[], e[], mask[], plot{style,logY,grid,resid}, fit, log, xLong,xUnit,...}`; `nRows`, `pointsAll`, `fitPoints` (zoom range ∩ unmasked).
- Rendering: `buildPlot(W,H,pal,forExport)` builds an SVG string for screen and export; `renderWs` (3 fixed columns), `renderFit`, `renderThread`, `renderLog`, `renderAll`.
- Storage: `LocalStore` / `makeDbStore` share an interface; `save`/`saveSoon` persist patches; comments, presence, history.
- Import: `parseGrid`, `importText`, `splitHeader` (long name and unit from header).

### 9.2 Feature → Origin source → where it lands in Kurve
| Kurve feature | Origin equivalent | Where in code | Notes |
|---|---|---|---|
| Multiple Y columns (spectra) | Column designations; multi-column workbook | Replace `x,y,e` in `S.proj` with `cols[]` (each: name, unit, role, data) and `datasets[]`; `renderWs` iterates columns | Prerequisite for everything below. Keep a migration in `normalize()` that maps old `x,y,e`. |
| Column metadata rows (long name, unit, comment, F(x)) | Header label rows | New header rows in `renderWs`; used by `axisLabel` and legends | Also feeds waterfall offsets. |
| Derived columns / formulas | Set Column Values with Recalculate | New `deriveCol(expr)` with a small safe expression parser (no `eval`); dependency graph so changes recompute | Use for normalise, subtract, unit conversion. |
| Processing pipeline (baseline, smooth, normalise, derivative) | Peak Analyzer stages plus Mathematics and Signal Processing menus, each with Recalculate | New `pipeline: [ {op, params} ]` stored per dataset; `getProcessed(ds)` cached; UI stage list with toggles and preview overlays | Lets fit run on baseline-subtracted data while the original is preserved. Log each op in `log`. |
| Baseline tools | Baseline Mode page; ALS; Shirley; anchors | Pure functions `baselineALS`, `baselineShirley`, `baselineAnchors(interp)`; interactive anchors in `setupGraph` as a new `mode` | Add to the `data-mode` toolbar: Zoom, Mask, Comment, +Anchor, +Peak. |
| Smoothing/derivative | Smooth and Differentiate tools | Savitzky-Golay via least-squares coefficient solve (reuse `solve`); median; FFT optional | Preview as a translucent overlay. |
| Peak finding | Find Peaks page | `findPeaks(X,Y,{method,dir,minHeightPct,smooth})` | Local max and derivative methods first. |
| Multi-peak fit | Peak Fit Parameters dialog | Compose model: `sum(peaks_i) + baseline`; parameter vector flattened; `lmFit` already accepts `fixed`; add bounds by transforming or clamping in the LM step; sharing by tying indices | `MODELS` needs a `peak` category with per-peak functions (add pseudo-Voigt, Voigt, asymmetric). |
| Bounds, share, constraints | Bounds tab; Shared groups | Extend `lmFit` signature (`lo`,`hi`, `share` map) | Origin auto-sets height > 0 for positive peaks: copy that. |
| Weighting modes | Weight tab | `W` array already passed to `lmFit`; add modes none / instrumental (from `e`) / statistical (1/y) | |
| Fit statistics | Quantities tab | Extend `renderFit`: RSS, reduced χ², R², adj-R², dependency, t, p, CI half-width, correlation matrix | Kurve has covariance and `tQuantile975`; need general-level t quantile and p-value (t CDF, incomplete beta). |
| Residual and diagnostic plots | Residual analysis | `p.plot.resid` already exists; add histogram, vs order, normal-probability | |
| Confidence and prediction bands | Fit Curve tab | Already draws a `band`; add prediction band | |
| Model comparison | Fit Comparison (F-test, AIC, BIC) | Small function from RSS, n, k of two saved fits | Needs the ability to store multiple fits per dataset. |
| Peak table and area | Peak properties/Quick Peaks | Table under fit: centre, height, FWHM, area (analytic or trapezoid), centroid, area % | |
| ROI gadgets | Quick Fit/Peaks/Integrate | Fit range is already the zoom range (`fitRange`); add a draggable ROI box that is independent of zoom, with live stats | Rename or extend "Zoom" range semantics: keep zoom for view, ROI for analysis. |
| Batch/theme | Peak Analyzer theme; Batch Peak Analysis | Serialise the pipeline plus fit setup as a JSON "theme"; `applyTheme(datasets)` with sequential seeding of parameters | Needs multi-dataset support first. |
| Global fit / shared parameters | NLFit Global Fit | Stack datasets into one residual vector in `lmFit`, with a parameter map | Do after multi-peak. |
| Waterfall/stack | Plot Details Waterfall/Offset/Stack | `buildPlot`: per-dataset offset transform, colour ramp, reverse-X flag | Reuse the same SVG builder. |
| Reverse X axis | Axis Scale → Reverse | `plot.revX` flag in `buildPlot`/`toData`/`autoView` | Small but essential for IR/XPS. |
| Normalize / reference subtraction | Normalize, Subtract Reference | Pipeline ops | |
| Data reader / cursors | Data Reader, Vertical Cursor | Extend the existing point-select mode with a cursor readout | |
| Report | Report sheet tree | Export a markdown/CSV "report" of parameters, stats, peaks | Replaces the SVG-only export; note `exportSvg`/`exportCsv` depend on claude.ai runtime. |
| Recalculation | Recalculate None/Auto/Manual | Add "auto" flag per fit and pipeline; on mask/data change, rerun (debounced, like `saveSoon`) | Mask changes already flow through `toggleMask`. |
| Import | Import Wizard, JCAMP-DX | Extend `importText` with delimiter detection and a JCAMP-DX parser; multi-column paste in `parseGrid` | |
| Undo | (Origin: limited; recalc + history log) | Kurve has none. Because all transformations become pipeline params, undo = stack of `S.proj` snapshots (`clone`) | Named as a known gap in `CLAUDE.md`. |

### 9.3 Interaction principles to import from Origin
1. **Preview before commit**: every operation shows an overlay curve while parameters change (Peak Analyzer preview graph, Fit Curve tab).
2. **Everything is re-runnable**: recalculate, lock icons, "Change Parameters" reopen. Store the *recipe*, not just the result.
3. **Direct manipulation on the graph**: drag anchors, drag peak markers, drag ROI edges, right-click for exact values.
4. **Progressive disclosure**: dialog trees with collapsible sections; report sheets as collapsible tables.
5. **Themes for repeat work**: save/apply a recipe across many spectra.
6. **Sensible auto-defaults with an escape hatch** (Auto checkboxes beside values, bounds auto-set for peak sign).

### 9.4 Suggested build sequence (revised after this research)
1. **Data model generalisation** (multi-column, roles, header rows, migration). Blocks the rest.
2. **Processing pipeline + preview overlays** (baseline, smoothing, normalise, derivative) with Recalculate.
3. **Multi-peak model composer** + parameter table (fixed/bounds/share) + fit stats.
4. **Peak finding + peak table + integration**; ROI gadget.
5. **Multi-spectrum view** (list, visibility toggles, waterfall/offset, reverse-X, colour ramp).
6. **Themes and batch fit**, then **global fit** and **model comparison**.
7. **Import (JCAMP-DX, delimiters), report export, undo.**

### 9.5 Risks and cautions
- `lmFit` uses a **numerical Jacobian and reduced-χ² scaling**; multi-peak fits with many parameters will need bounds handling and better conditioning (centre/scale x). `CLAUDE.md` already flags polynomial conditioning.
- Adding a safe formula parser is safer than `eval`/`Function`; the app also runs inside the claude.ai artifact sandbox.
- Origin's numbers should not be assumed identical to Kurve's; verify with known spectra (e.g. compare a fit against `scipy.optimize.curve_fit`).
- Collaboration (`makeDbStore`) syncs `S.proj` patches. A larger data model means bigger documents, so check size limits per document.

---

## 10. Sources

Documentation index: [Origin Help contents](https://docs.originlab.com/origin-help/) · [Origin interface](https://docs.originlab.com/user-guide/origin-interface/) · [Data analysis user guide](https://docs.originlab.com/user-guide/data-analysis/)
Comparison: [Origin vs OriginPro 2024b (PDF)](https://d2mvzyuse3lwjc.cloudfront.net/pdfs/Origin2024b_Documentation/English/Origin_vs_OriginPro_2024b_E.pdf)
Worksheet: [Columns](https://docs.originlab.com/origin-help/wks-cols/) · [Arranging](https://docs.originlab.com/origin-help/arrange-wks/) · [Rearranging/filtering](https://docs.originlab.com/origin-help/rearranging-filtering-conditional-formatting/) · [Generating datasets](https://docs.originlab.com/origin-help/wks-generatedataset/) · [Set Column Values](https://docs.originlab.com/origin-help/wks-setcolval-menuopt-dialog/) · [Masking](https://docs.originlab.com/origin-help/mask-data/) · [Data Connector](https://docs.originlab.com/origin-help/data-connector/) · [Import/export](https://docs.originlab.com/origin-help/import-export-data/)
Analysis: [Mathematics](https://docs.originlab.com/origin-help/mathematics/) · [Signal processing](https://docs.originlab.com/origin-help/signal-processing/) · [Regression and fitting](https://docs.originlab.com/origin-help/regression-curve-fitting/) · [NLFit Settings tab](https://docs.originlab.com/origin-help/nlfit-dialog-settingstab) · [Fitting Function Organizer](https://docs.originlab.com/origin-help/fitfunc-organizer-builder/) · [Peak Analyzer algorithms](https://docs.originlab.com/origin-help/pa-algorithm/) · [Statistics](https://docs.originlab.com/origin-help/statistics/) · [Report sheets](https://docs.originlab.com/origin-help/analysis-rep-wks-cols/) · [Gadgets](https://docs.originlab.com/origin-help/gadgets/)
Graphing: [Graphing](https://docs.originlab.com/origin-help/graphing/) · [Customizing graphs](https://docs.originlab.com/origin-help/customize-graph/) · [Graph types](https://docs.originlab.com/origin-help/graphtypes/) · [Grouped plots](https://docs.originlab.com/origin-help/pd-dialog-group-tab/) · [Exporting graphs](https://docs.originlab.com/origin-help/export-publish-graphs/)
Automation: [Customization and automation](https://docs.originlab.com/origin-help/customization-automation/) · [Origin basics](https://docs.originlab.com/origin-help/origin-basics/)
Release notes: [Origin 2025b](https://www.originlab.com/2025b) · [Origin 2026b](https://www.originlab.com/index.aspx?go=Products%2FOrigin%2F2026&amp=&pid=5487)
