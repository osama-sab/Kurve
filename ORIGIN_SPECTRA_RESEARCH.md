# OriginLab features for spectra analysis: research for Kurve

Purpose: catalogue what makes spectra analysis easy in Origin/OriginPro, then map it to Kurve.
Items marked **[doc]** were read from OriginLab's documentation. Items marked **[gen]** are general
spectroscopy practice or my own knowledge, not confirmed from a fetched page. Verify before relying on them.

## 0. Where Kurve stands today

From `kurve.html` and `CLAUDE.md`: 5 models (linear, Gaussian, Lorentzian, exponential decay, Boltzmann),
one Y column per project, Levenberg-Marquardt with reduced-chi² scaling, masking points, zoom, comments,
SVG/CSV export, and history. There is **no** baseline, smoothing, peak finding, multi-peak fitting,
parameter bounds/fixing, weighting, residual plot, or batch mode. Those absences are the core of the gap.

## 1. The central idea: Peak Analyzer is a goal-driven wizard

Origin's key UX decision is a wizard with a live preview graph and one **goal** picked up front **[doc]**:
Create Baseline → Integrate Peaks → Find Peaks → Fit Peaks (Fit is Pro only). Each goal is a prefix of the
same pipeline, so the user never leaves one screen:

1. **Baseline**: pick a mode, edit anchors, preview.
2. **Baseline treatment**: subtract now or auto-subtract, undo, rescale preview.
3. **Find peaks**: method, direction, filters, manual add/edit.
4. **Integrate** (set peak boundaries) **or Fit** (functions, parameters, converge, report).

Every step keeps the previous results visible (source, baseline, subtracted, fit curve, optional residual and
2nd-derivative plots). The whole session can be saved as a **theme** and replayed on other data.

## 2. Baseline handling (the most important missing piece)

Modes in Peak Analyzer **[doc]**:

| Mode | Behaviour |
|---|---|
| None (Y=0) | Zero baseline |
| Constant | Min / Max / Mean / Median of range, or custom Y |
| Straight line | Intercept A and slope B, defaulted from endpoints, "Auto" checkbox |
| End Points Weighted | Smooth curve from a chosen fraction of points at both ends; sensitive to the choice |
| Min & Max | Min for positive peaks, max for negative (Find Peaks goal only) |
| Use existing dataset | Baseline from another column, with an offset |
| **User Defined (anchor points)** | Auto-find + manual editing, see below |
| XPS (Shirley, Tougaard) | Physics-based backgrounds for photoemission |
| **ALS** (Asymmetric Least Squares) | Smooth baseline; asymmetry ~0.001 for positive peaks, ~0.99 for negative |

**User Defined anchors** (the workhorse) **[doc]**:
- Auto-detection methods: 2nd Derivative (zeroes), 1st + 2nd Derivative, 2nd Derivative (peaks), existing dataset, script.
- Parameters: Smoothing Window Size (bigger = smoother), Threshold (controls anchor density), Smoothing Polynomial Order, Number of Points to Find.
- Controls: Enable Auto Find toggle, Find, Add (double-click on graph), Modify/Del (drag or keyboard), Clear All, Save/Load anchors as .dat, Snap to Spectrum, an Anchor Info table (sort, copy, paste, add, delete rows).
- **Connect by**: interpolation, or **Fitting** with a function (e.g. ExpDec2 for exponential background; the doc tutorial does exactly this).
- **Fit Baseline with Peaks** simultaneously, and **Fix Baseline Parameters**; this option exists only for the Fit Peaks goal with a straight-line or fitted-anchor baseline.

Not documented on the pages I fetched: exact ALS λ/iteration names and Shirley/Tougaard parameters. Standard ALS (Eilers & Boelens) uses smoothness λ, asymmetry p, and iterations **[gen]**. Shirley is an iterative integral-proportional background **[gen]**; Origin says its Shirley/Tougaard parameters are adjustable **[doc]**.

## 3. Peak finding

Methods **[doc]**: Local Maximum, Window Search (absolute or % windows), 1st Derivative (zero crossings, optional pre-smoothing), **2nd Derivative** (hidden/shoulder peaks), **Residual after 1st Derivative** (hidden peaks), **Fourier Self-Deconvolution** (overlapping peaks; parameters Gamma and Smoothing Factor 0–1). The last three are Pro only.

Options **[doc]**:
- Direction: Positive / Negative / Both.
- Smoothing: window size (0 = off, Auto checkbox), smooth-derivative method (None, FFT, Adjacent Averaging, Savitzky-Golay, Quadratic S-G).
- Filter: None, By Height %, By Height Value, By Number, or **Custom expression** with keywords `hp` (height %), `h` (height), `n` (peak number), `x` (position) and logical operators.
- Manual: Add (double-click), Modify/Del, Snap to Spectrum, Clear All, Load/Save peak list.
- Labels: show center label as X, Y, index or (X,Y); output baseline-subtracted peaks.
- For fit goal: initial **bounds by difference or percentage** on center, width, height/area.

## 4. Peak integration

Peak boundaries **[doc]**: draggable yellow rectangles on the preview (drag edges; right-click for exact X1/X2), "Fix Width For All Peaks" with left/right half-width, apply-to-all from one peak, or use adjacent baseline anchors as bounds. Integrate-only output (area, area %, FWHM, height, centre, centroid) is confirmed for the Quick Peaks gadget **[doc]**.

## 5. Multi-peak fitting

**Peak function per peak**, mixable in one fit **[doc]**: choose from a categorised built-in list (auto-initialised) or a user-defined function. Documented peak functions include Gaussian, Lorentzian, Voigt, PsdVoigt1 (y0, xc, A, w, mu) and PsdVoigt2 (y0, xc, A, wG, wL, mu) **[doc]**. Origin also ships Pearson VII, Gauss/Lorentz asymmetric variants, log-normal and others **[gen]**; not verified against a list page (the list URL 404'd).

**Peak Fit Parameters dialog** **[doc]**:
- Per-parameter **Fixed** checkbox and **Shared** group number (e.g. one common width across peaks).
- **Bounds** tab with lower/upper values and `<` / `<=` operators; positive peaks automatically get height > 0, negative < 0.
- **Linear constraints** entered as expressions.
- **Fit / Fit Until Converge** buttons (Levenberg-Marquardt) and a "Generate report even if not converged" option.
- **Snap to Spectrum** when placing peaks, live **Show Residuals** and **Show 2nd Derivative** toggles.
- **Weighting**: No weighting, Instrumental (from error column), Statistical, Arbitrary dataset, Direct.
- Optionally fit several datasets with the same or different functions.

**Fit statistics** reported **[doc]**: points, degrees of freedom, reduced χ², R, RSS, R² (COD), adjusted R², root-MSE, iterations, fit status, ANOVA, covariance and correlation matrices.
**Parameter table** **[doc]**: value, fixed/shared flags, standard error, confidence limits (LCL/UCL), t-value, p-value, **dependency** (1 − 1/[c_ii (c⁻¹)_ii], near 1 means the parameter is redundant), CI half-width, bounds.
**Peak properties** **[doc]**: index, function type, fitted and integrated area, centre, max height, FWHM, width at a custom % of height, area above threshold, cumulative area, variance, skew, excess kurtosis, resolution between neighbouring peaks, 3rd/4th moments (speed mode = trapezoid, accurate mode = function integral).
**Model comparison** (Pro) **[doc]**: F-test (significance default 0.05), AIC, BIC.
**Bands** **[doc]**: confidence and prediction bands with adjustable level and fill, residual-vs-x plot, stacked residual panel.

## 6. Pre-processing tools around the fit

- **Smoothing** **[doc]**: Adjacent Averaging, Savitzky-Golay (preserves height and width), Percentile/median filter (spike removal, envelopes), FFT filter, LOWESS/LOESS, Binomial. Origin's own comparison says S-G best preserves peaks and FFT is worst.
- **Differentiate** **[doc]**: any order, optional S-G smoothing (polynomial 1–9, window), centred-difference default, plots the derivative.
- **Integrate** **[doc]**: trapezoid, mathematical (signed) vs absolute area.
- **Normalize** **[doc]**: divide by value/max/min/mean/median/SD/norm/mode/sum/reference cell/reference curve, scale to [0,1], [0,100] or [v1,v2], Z-score, normalize to a point picked on the graph, treat all columns as one composite set.
- **Subtract reference data** and **interpolate/extrapolate** (linear, cubic spline, B-spline) **[doc]**.
- Every one of these has a **Recalculate: None / Auto / Manual** setting so results update when data change **[doc]**.
- Conversions among absorbance / transmittance / reflectance / Kubelka-Munk, ATR and Kramers-Kronig correction, Tauc plots for band gap, and wavenumber/wavelength/eV conversion are standard in spectroscopy **[gen]**; Origin offers Tauc and Kubelka-Munk templates per one secondary source, not OriginLab docs.

## 7. Interactive gadgets on the graph (ROI-driven)

Region-of-interest box on the plot; results update live as it is dragged **[doc]**:
- **Quick Peaks**: per-ROI baseline (7 modes), 5 find methods, direction, filter by height %/count, area from baseline or from 0, 18 selectable quantities (ID, x, y, height, area, FWHM, centroid, left/right half-widths, base markers), peak tags, "send to Peak Analyzer".
- **Quick Fit**: drag ROI, fit a chosen function to that part only.
- **Integrate**, **Interpolate**, **Rise Time** gadgets, plus statistics and data reader.

## 8. Multiple spectra and batch work

- Peak Analyzer on several Y columns at once, plotted with legend-based dataset IDs **[doc]**.
- **Batch Peak Analysis**: save Peak Analyzer settings as a **theme**, import new data, analysis reruns automatically; can also use an analysis template or script **[doc]**.
- **Sequentially initialise parameter values** so peak positions carry over between similar spectra instead of being lost **[doc]**.
- Summary table across all datasets (dataset ID × peak index × centre/area/etc.), ready to plot as a trend **[doc]**.
- **Global fit** with shared parameters across datasets **[doc]**.

## 9. Plotting features that spectroscopists rely on

- Stacked lines by Y offset, stack graphs (panels), 2D/3D waterfall, inset graphs **[doc]**. Offsets can be set uniformly or read from a worksheet label row (temperature, time, ...); the order can be reversed **[doc]**.
- **Reverse X axis** (wavenumber, binding energy) via the axis Scale tab **[doc]**.
- Peak tags with X/Y/centre labels **[doc]**; fitted curves drawn per peak plus cumulative sum, optionally with baseline added back **[doc]**.
- Result graph with an embedded peak table **[doc]**.

## 10. Data import

Thermo SPC/CGM, JCAMP-DX (DX, DX1, JDX, JCM), Princeton SPE, with header metadata pulled into worksheet label rows **[doc]**. Also CSV/text with delimiter detection, and column-header rows (long name, unit, comments) as first-class metadata **[doc]**.

## 11. Suggested build order for Kurve (my recommendation, ranked by payoff)

1. **Baseline subtraction** on the existing plot: anchor-point baseline (click to add/drag/delete) with linear/spline connect, plus straight-line, constant, and ALS. Show source, baseline, subtracted.
2. **Multi-peak fitting**: N peaks in one fit, per-peak type (Gaussian, Lorentzian, pseudo-Voigt, Voigt), sum curve plus individual components shaded, residual panel underneath.
3. **Parameter controls**: fixed, bounds, shared; plus a table with SE, 95% CI, t, p, dependency, and R², adj-R², reduced χ². (Kurve already has covariance and the t quantile.)
4. **Peak finding**: local max + S-G smoothed 2nd-derivative for hidden peaks, height-% filter, click to add/remove, "Fit these peaks" button seeding initial guesses.
5. **Smoothing and derivative**: Savitzky-Golay (window/order) and median despike, with preview overlay.
6. **Integrate and peak table**: area, FWHM, centroid, height, area %.
7. **Weighting** from the error column; **model comparison** via AIC/BIC/F-test.
8. **Multiple spectra**: several Y columns, stacked/offset view, reverse-X toggle, batch apply of a saved "theme", summary table across spectra.
9. **Normalize, subtract reference, unit conversions, Tauc**.
10. **Import** JCAMP-DX and generic spectrometer text formats.

Fewer-clicks design cues taken from Origin: keep one live preview, make every stage optional and undoable,
show residuals and derivative as toggles, and let any tuned workflow be saved and reapplied.

## Sources

- [Peak Analyzer Quick Start](https://docs.originlab.com/origin-help/peakanalyzer-qs/)
- [Peak Analyzer: Baseline Mode](https://docs.originlab.com/origin-help/peakanalyzer-baselinemode)
- [Peak Analyzer: Baseline Treatment](https://docs.originlab.com/origin-help/peakanalyzer-baselinetreat)
- [Peak Analyzer: Find Peaks](https://docs.originlab.com/origin-help/peakanalyzer-findpeaks)
- [Peak Analyzer: Fit Peaks page](https://docs.originlab.com/origin-help/peakanalyzer-fitpeak)
- [Fitting peaks with the Peak Analyzer](https://docs.originlab.com/origin-help/fitpeak-pa/)
- [Peak Fit Parameters dialog](https://docs.originlab.com/origin-help/peakanalyzer-fitpara-dialog/)
- [Tutorial: Peak fitting with baseline](https://docs.originlab.com/tutorials/peakfitting-baseline/)
- [Peak Deconvolution app](https://docs.originlab.com/app/peak-deconvolution/)
- [Origin for Spectroscopy](https://www.originlab.com/index.aspx?go=Solutions%2FApplications%2FSpectroscopy)
- [Smoothing](https://docs.originlab.com/origin-help/smoothing/)
- [Differentiate](https://docs.originlab.com/origin-help/math-differentiate/)
- [Normalize](https://docs.originlab.com/origin-help/math-normalize/)
- [Theory of nonlinear curve fitting](https://docs.originlab.com/origin-help/nlfit-theory/)
- [Comparing two models](https://docs.originlab.com/origin-help/postfit-comparefitfunc-dialog/)
- [Quick Peaks gadget](https://docs.originlab.com/origin-help/gadget-quickpeaks/)
- [Customizing waterfall graphs](https://docs.originlab.com/origin-help/customizewaterfall/)
- [PsdVoigt1](https://www.originlab.com/doc/Origin-Help/PsdVoigt1-FitFunc), [PsdVoigt2](https://www.originlab.com/doc/Origin-Help/PsdVoigt2-FitFunc)
- [Batch peak analysis with themes](https://www.originlab.com/videos/details.aspx?id=69)
