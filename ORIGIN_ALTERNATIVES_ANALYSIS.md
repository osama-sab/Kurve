# Apps that do what Origin does, some of it better: features and UI

Audience: me (Claude). Fourth research document. Companions:
- `ORIGIN_SPECTRA_RESEARCH.md` (Peak Analyzer features)
- `ORIGIN_MENUS_AND_TOOLS_REFERENCE.md` (menus, tools, data model, code mapping)
- `ORIGIN_UI_AND_WORKFLOWS.md` (Origin's UI and interaction flows, proposed Kurve layout)

Evidence tags: **[seen]** = I looked at the screenshot; **[doc]** = read on the tool's own page/paper; **[web]** = search-result
snippet; **[infer]** = my judgement. "Better" always means *better along a stated axis*, not universally.

Source caveat: the roundup page SpectraComp ranks its own product (SpectralBench) 2nd, so its ratings are treated as marketing
[web]. Feature claims come from each tool's own documentation wherever I could fetch it.

---

## 1. Landscape

| Tool | Platform / cost | Scope | Beats Origin at | Loses to Origin at |
|---|---|---|---|---|
| **SpectraFit XPS** (2026) | **Browser, free**, fully client-side (TypeScript/React) [doc] | XPS peak fit + quantification | Interactivity (drag peaks, animated fit), no install, privacy, doublet/link/expression constraints, one-click BE calibration, templates | XPS only; no parameter uncertainties yet; no general math/graphing |
| **MagicPlot** | Desktop, $19 student to $390 commercial [doc] | Fitting + plotting | Instant peak-by-peak model building, drag curves, mouse-wheel parameter tweak, undo of fits, price, NIST-tested [doc] | Fewer analysis tools, Pro-only auto-peak-guess, smaller ecosystem |
| **Fityk** | Desktop, free, open source [doc] | Peak fitting on any XY | Function/variable model with parameter dependencies, multiple fit algorithms (NLopt, MPFIT), scripting/macro, shared parameters across datasets, price | Dated UI, "steep learning curve", little format support [web] |
| **Igor Pro Multipeak Fit 2** | Desktop, commercial [web] | Analysis + graphs | Baseline **fitted with peaks** (advised over subtraction), per-graph control panel, marquee edit, graph-cursor fit range, full undo/redo, programmable batch | Fewer built-in peak types (6), coding needed for custom functions |
| **PeakFit (Systat)** | Desktop, commercial [web] | Peak separation | 3 auto-placement methods (residuals, 2nd derivative, deconvolution), up to 100 peaks, visual FFT filter, ~100 line shapes | No batch across similar spectra (per ResearchGate) [web] |
| **Spectragryph** | Windows, free, **no further updates after developer's death Dec 2024** [web] | Optical spectroscopy | 80+ instrument formats, reproducible processing **sequences**, library search, EEM, live acquisition, spectral math | Windows only, closed source, EOL |
| **KherveFitting** | Desktop (Python), open source [doc] | XPS | CasaXPS-compatible, RSF database, sample manager, validated vs CasaXPS/Avantage | XPS-specific |
| **SpectraFit (Python)** | CLI/Jupyter, BSD [doc] | XAS and general | JSON/TOML project reproducibility, global fit with auto-generated constraint expressions, AIC/BIC, 23 lmfit methods | Needs code; fixed fitting backend |
| **Orange + Quasar (Spectroscopy add-on)** | Desktop visual programming [doc] | Hyperspectral, chemometrics | Node workflow, preprocessing pipeline, Peak Fit widget on lmfit | Steeper conceptual model |
| **SpectralBench** | Browser [web, vendor claim] | FTIR/Raman/UV-Vis suite | Shareable links, PDF reports, projects in the cloud | Needs internet, "newer platform" |
| **GraphPad Prism** | Desktop, commercial [web] | Biostats fitting | Everything hot-linked; "freeze" results; consistently clear guides | Not a spectroscopy tool |

**The closest thing to Kurve's target already exists: SpectraFit XPS** (browser, React, client-side, real-time). It is worth studying closely.

---

## 2. Tool-by-tool: features and UI

### 2.1 SpectraFit XPS [doc + seen: 4 screenshots]

**Layout [seen]** (dark theme):
- **Header**: logo; right side: PESAnaLab, Guide, Export, Save, Reset, **At%** (opens quantification), **Plot** (publication plotter).
- **Left sidebar (~18% width)**: big green **Run Fit** and outlined **Add Peak** buttons; **Undo / Redo**; **Calibrate BE**, **Templates**; a **Background** segmented control (Shirley / Dynamic / Linear / Tougaard); then **Components (n)** list.
- **Component cards**: colour dot + editable name (C-C / C-H, C-O, O-C=O, π-π* sat.), drag handle, collapse arrow, **lock**, **delete**, shape icon, a "**MASTER**" tag on the reference peak. Per card, four rows: **POS, HIGT, W-G, W-L**, each = coloured **slider** + **numeric field** (green/orange outline when linked/edited) + **lock icon**; child peaks show a **link** icon (to master), an **expression (fx)** icon and a "**12 more matches**" hint (auto-assign to chemical states from a library). The selected card gets an amber outline and the peak label on the graph turns amber to match.
- **Centre**: tabs for regions **Dashboard > Sample <name> > Survey | C 1s | O 1s | C KVV | O KVV | Valence**. Graph with binding energy reversed, data as white dots, components as coloured lines with **labels on the peaks**, total fit in blue, background as a dashed grey line, **two dashed orange vertical handles** for the fit range, and a **stacked residual panel** below the main plot. A small floating checklist at top-right (Components ☑, Residuals ☑).
- **Bottom readout strip**: `BE: 291.40 eV | Raw | Fit | BG | Res | per-component values at the cursor`, then a status footer: `235/421 pts | True Voigt | Algo: LMA | BG: Static Shirley | RSE: 0.372 | converged (425ms) | Scienta (Al Kα)`.
- **Quantification modal**: instrument, RSF set, ECF, hν, angle dropdowns, a green auto-detect banner ("Auto-detected: Scienta (Al Kα) …"), a table of Spectrum / Peak / BE / Raw Area / RSF / ECF / At% / Wt% with per-row checkboxes, a **stoichiometry bar chart** to the right and CSV export.

**Features [doc]**: line shapes = true Voigt (numerical convolution), Doniach-Šunjić asymmetric, SGL; backgrounds = static Shirley, **dynamic Shirley optimised with peaks**, linear, Tougaard 2-/4-parameter with presets; **spin-orbit doublet generator** with locked area ratios; per-component lock/link/expression, **expression constraints re-evaluated every iteration** (`P1.pos + 1.18`, `P1.fwhm_g * 1.2`); **fits animate** via intermediate optimiser states; LM with early stop at ΔRSS < 1e-6; **BE calibration to standard references** for one or all regions; **templates**; sessions saved as **one JSON project**; VAMAS/CSV/XLSX/ASC/PHI/VG import and VAMAS/CSV/SVG/PNG export; depth profiles open as slice series; bilingual illustrated guide; a bundled demo dataset; 100 automated tests and a 30-case regression suite against a reference implementation (±2%); Google Drive integration; anonymous usage stats.
**Stated limits [doc]**: no parameter uncertainties yet; survey quantification unreliable for weak peaks.

**Why it is "better than Origin" here [infer, supported by doc]**: no install, immediate visual feedback on every change, constraints expressed as formulas, domain physics baked in (doublets, calibration), and one-window layout with cursor readouts.

### 2.2 MagicPlot [doc + seen: 3 screenshots]

- **Fit Plot window [seen]**: the plot on the left; a **right panel with tabs `Fit Curves | Fit Intervals | Report`**. Fit Curves is a **table**: colour swatch, Type (Line, Lorentzian-A, ...), Legend name, and three checkboxes per curve: **Show, Baseline, Sum**. Below: `Data ☑ · Sum ☑ · Residual` toggle buttons (hold Residual to see residuals), **Add ▾ / Guess ▾ / Fit by Sum**, then a **parameter table** for the selected curve (Param, Description, Value, **Lock**, StdDev; e.g. `a Area 13.79 ± 0.72`, `x0 X Position`, `dx HWHM`), a **formula box showing the function's equation**, and buttons **Join, Edit Interval, Fit One Curve**.
- **On-plot handles [seen]**: the selected curve is thick with small circles on the curve you drag (peak top for position/height, a shoulder point for width). A vertical zoom slider (+, −, 1x) sits at the right edge of the plot.
- **Workflow ideas [doc]**: baseline is *just another fit curve* flagged Baseline; **Fit by Sum** (all curves marked Sum) vs **Fit One Curve** (e.g. baseline on peak-free intervals); **fit intervals** drawn on the plot, double-click to split, drag borders, or type values; **Join** couples parameters between curves; **mouse-wheel over a parameter changes it (Ctrl; +Shift for bigger steps)**; guessed peaks are only initial estimates; **progress window with two bars, "Break Iterations" and "Undo Fit"**; undo applies to fits and to parameter changes; weights `1/σ²` applied automatically if a Y-error column exists.
- **Data table [seen]**: right-click on selected columns → *Set Column Formula (Ctrl+F2)*, *Create Figure*, *Create Fit Plot ▸ Line/Markers/Line & Markers/Area/Vertical Bars*, cut/copy/paste, Set Column Type, Insert, Delete, Sort.
- Also: smoothing, FFT, integration, differentiation, histogram, convolution, correlation; batch processing without scripts; style templates; vector export EPS/PDF/SVG/EMF; tested against the 26 NIST statistical reference datasets. Price $19 to $390.

### 2.3 Fityk [doc + seen: 1 screenshot]

- **Layout [seen]**: menu bar (Session, Data, Functions, Fit, Tools, GUI, Help); a toolbar with **mouse-mode buttons** (zoom, range, baseline, add-peak) plus a peak-function dropdown (PseudoVoigt); **main plot** (dark background), a **helper plot** below it (residuals), an **output window** ("levenberg_marquardt: 6 iterations, 7 evaluations, 0.01 s CPU; WSSR 9377.66 (-99.6002%)"), and a one-line **input box** (command line); a right **sidebar** with tabs **data | functions | variables**, a dataset list (`No | #F+z | Name`), a "show only selected" filter, and for the selected function **height / center / hwhm** each with a **text field, lock toggle and slider**. A bottom **mouse-hints bar** explains what each button does in the current mode, and pops up a full tooltip of all bindings.
- **Model [doc]**: *everything is a command in a small DSL*, all GUI actions echo as commands and can be saved as a script/macro; functions and *variables* are separate so widths can be expressions of other variables (parameter dependencies); several datasets with shared parameters; several optimisers (LM, NLopt, MPFIT); scripting via Lua; undo/history.
- **Lesson**: *record every action as a re-playable command* (this is how you get reproducibility without code from the user).

### 2.4 Igor Pro Multipeak Fit 2 [doc + seen: 3 images]

- **Workflow [doc]**: Analysis → Start New Multi-peak Fit → pick X and Y → a **dedicated graph with its own control panel** (each graph has one, so several analyses can be open) shows peaks, total fit, baseline, and a **residuals plot** ("helps identify hidden peaks").
- **Initial values**: **AutoFind** = maxima in the smoothed second derivative with automatic noise/smoothing estimation; user-adjustable smoothing factor; negative-peak checkbox because polarity is not auto-detected. Or **drag a marquee on the graph → Add or Edit Peaks**: click-drag to set width/height/position, **right-click to delete**, click empty area to add, **full undo/redo**.
- **Peak types (mixable)**: Gaussian, Lorentzian, Voigt, ExpModGauss, ExpConvExp, LogNormal; **baselines**: none, offset, linear, cubic. The docs say it is *much better to fit with a baseline function than to subtract the baseline first*.
- **Fit range**: zoom the graph, or place **graph cursors** and tick "Use Graph Cursors"; results of earlier ranges are preserved.
- **Output**: Peak Results table (location, amplitude, area, FWHM, coefficients with errors; numerical methods where no closed form), notebook reports, publication graphs, tab-delimited files; **batch peak fitting for programmers**.

### 2.5 PeakFit (Systat) [web]
Automatic placement: **Residuals** (local maxima in smoothed data + peaks added where residuals show them), **Second Derivative**, **Deconvolution** (Gaussian response with Fourier filter); up to 100 peaks; sophisticated smoothing/baseline; **visual FFT filter** where you zero high-frequency points and see the result immediately; 18+ (up to about 100) line shapes. Lesson: **offer several auto-placement strategies and let the user compare.**

### 2.6 Spectragryph [doc + seen: ~33 small screenshots]
- **Layout [seen]**: Office-style **ribbon** (File, Plot/Views, Spectra, Process, Transform, Analyze, Fluorescence/EEM, Report, Automate, Identify, Support) with a status bar line `Position | value`; a full-window **spectra plot** with multi-cursor readout; small **floating dialogs** for each operation with consistent options: *apply to* "all spectra / selected spectra", *result* "keep original / remove original", "keep legend"; integration dialogs show a table of results with **Copy results** button; EEM contours and 3D surfaces.
- **Features [doc]**: 80+ instrument formats, JCAMP-DX; baseline (linear, adaptive, scattering); 4 smoothing algorithms + advanced; **spectral math** incl. scaled subtraction and averaging (mean/median); normalisation by peak, area or value; 1st-4th derivatives; conversions (absorbance, transmittance, reflectance, Kubelka-Munk, Log(1/R), Raman shift); library search with PDF reports; multi-mixture analysis by multilinear regression; Gaussian deconvolution; film thickness; **the Automate module builds a "sequence" of 40+ processing nodes (Manipulations + Analysis lists), saveable, interruptible, with a protocol log**; live acquisition from instruments; dark themes; undo/redo; command-line switches.
- **Status**: no updates after Dec 2024; Windows only. Opportunity: users need a maintained, cross-platform replacement.

### 2.7 Orange + Quasar Peak Fit widget [doc + seen: 1 screenshot]
- **Layout [seen]**: left column **"Add model…"** (dropdown of lmfit-style models); each model is a **coloured card** (green, purple) with a ✕ and ▶ (preview), and rows `center | amplitude | sigma | gamma`, each with **three boxes `min | value | max`** and a **"limits / fix / expr / delta" dropdown**; gamma shows an **expression** default `sigma`. Below: **Preview: Show spectra [3]**, **Output: Commit**. Right: graph with red vertical line labelled `center` (the parameter being edited), several input spectra in grey, sum in red, components in colour, dashed black fit; coordinates top-right; a **Menu** button on the plot.
- Lesson: the **min / value / max + mode** row is a compact universal parameter control; a preview of *several spectra at once* shows whether one model fits the whole set.

### 2.8 KherveFitting, SpectraFit (Python), SPECTROview, PyRamanGUI, Fitspy, jupyter-lmfit [doc/web]
- **KherveFitting**: sample manager for multi-sample work, CasaXPS compatibility, automated multipeak fitting with constraints, RSFs from common suppliers, Excel output with plot; validated against CasaXPS and Avantage (2026 journal paper).
- **SpectraFit (Python)**: JSON/TOML input; all lmfit methods; **simultaneous fit of many spectra with auto-generated constraint expressions**; AIC/BIC; Pearson correlation matrix; uncertainty from covariance; `.lock` project files with unique IDs; Plotly interactive output in Jupyter.
- **SPECTROview / PyRamanGUI / Fitspy**: open-source GUIs for preprocessing (crop, baseline), multi-peak fitting with constraints, visualisation, batch. (SPECTROview paper page returned 403, so details unverified.)
- **jupyter-lmfit**: composite models of Voigt, Lorentzian, Gaussian, Pearson7 plus linear/quadratic/exponential in a notebook.

### 2.9 GraphPad Prism [web]
Key idea: **everything is hot-linked**. Edit data → results and graphs update; a **Freeze** button stops one results sheet updating; **orphaned** results (data gone) stay readable. Guides are consistently clear; nonlinear regression has been tested against NIST datasets. Lesson: the linking model is the same as Origin's Recalculate, but **exposed as "live" by default with an explicit freeze**.

### 2.10 SpectralBench [web; vendor claims]
Browser suite, 15 tools (conversion, peak ID, library, preprocessing, curve fitting with locking/residuals/areas, PCA, comparison, AI interpreter), 30+ formats, shareable links, PDF reports. Not verified by me; treat as a direction, not evidence of quality.

---

## 3. What these tools do better than Origin (by axis)

| Axis | Better tool(s) and how | Evidence |
|---|---|---|
| **Direct manipulation** | MagicPlot (drag curve handles), Igor (marquee + drag width/height, right-click delete), SpectraFit XPS (drag peaks, backgrounds and residuals update live) vs Origin's picking of peak *centres* only | [seen/doc] |
| **Feedback speed** | SpectraFit XPS animates fits; ms-level footer (`converged (425ms)`); MagicPlot two-bar progress with Break and Undo Fit | [seen/doc] |
| **Parameter control density** | Card per peak with slider + number + lock + link + expression (SpectraFit XPS); `min / value / max / mode` rows (Orange); mouse-wheel tweak (MagicPlot) vs Origin's wide table in a modal dialog | [seen/doc] |
| **Constraints as formulas** | SpectraFit XPS expression constraints, Fityk variables, lmfit `expr` in Orange and SpectraFit-Python | [doc/seen] |
| **Baseline strategy** | Igor and MagicPlot treat baseline as a **fitted curve, not a subtraction step** (Origin also can, but buried behind "Fit Baseline with Peaks") | [doc] |
| **Residuals always visible** | SpectraFit XPS stacked panel; Igor residual plot; MagicPlot one-hold residual | [seen/doc] |
| **One-window layout / no wizard** | SpectraFit XPS, MagicPlot, Fityk, Orange: single window, live preview; Origin uses a wizard + separate preview window + report windows | [seen] |
| **Reproducibility without code** | Fityk (every action a script line), Spectragryph sequences with protocol log, SpectraFit XPS templates and single-file JSON session, SpectraFit-Python `.lock` file | [doc] |
| **Multiple auto-peak strategies** | PeakFit (3 methods to compare), Igor (2nd-derivative with noise estimation) | [web/doc] |
| **Install, price, privacy** | SpectraFit XPS runs fully client-side, no server, free; MagicPlot $19-$390; Fityk free; vs OriginPro subscription | [doc] |
| **Validation transparency** | MagicPlot tested on NIST 26; SpectraFit XPS 100 tests and 30 regression cases; KherveFitting compared with CasaXPS | [doc] |
| **Domain physics built in** | SpectraFit XPS doublets, BE calibration, RSF quantification; Spectragryph conversions/Kubelka-Munk/library search | [doc] |
| **Learning curve** | Fityk (simple cases: "place peaks and click fit"), MagicPlot, Prism | [doc/web] |
| **Uncertainty reporting** (Origin strength; competitors vary) | SpectraFit-Python has covariance/AIC/BIC; **SpectraFit XPS has none yet** | [doc] |

## 4. What Origin still does better (do not regress)

- Parameter **statistics**: standard errors, confidence limits, t/p values, **dependency**, ANOVA, covariance/correlation, bands, model comparison (F/AIC/BIC); SpectraFit XPS lacks errors entirely. [doc]
- **Breadth**: worksheets with label rows, signal processing, statistics, hundreds of graph types, Apps; report sheets; templates; batch with themes. [doc]
- **Peak function library** (≈28 in the Peak Analyzer) and user-defined function builder. [seen]
- **Batch to summary sheet with dataset identifier** and trend plot. [seen]
- Published-quality **graph customisation**. [doc]

---

## 5. UI pattern catalogue (transferable to Kurve)

1. **Component card list** (SpectraFit XPS): coloured dot, name, collapse, lock, delete; four slider+field rows; link icon to a master; expression mode; selected-card outline matched by the peak's highlight and label on the graph. Colour identity ties card ↔ curve ↔ readout.
2. **Bidirectional highlight**: click peak on graph ↔ card highlights; MagicPlot table row ↔ thick curve; Origin's Data Highlighter (row ↔ point).
3. **Readout strip**: cursor X and, for each component, its value at the cursor (SpectraFit XPS), plus fit stats footer.
4. **Stacked residual panel** under the main graph, same X axis, toggled by a checkbox.
5. **Draggable range handles** on the plot (dashed vertical lines) for the fit interval (SpectraFit XPS, MagicPlot Fit Intervals, Igor cursors).
6. **Baseline as a component** with Show / Baseline / Sum flags (MagicPlot) *or* a segmented background control (SpectraFit XPS). Choose one; the segmented control is simpler for beginners, the flags are more general.
7. **Fit progress**: animate intermediate states, show iterations/ΔRSS, allow **Break** and **Undo fit** (MagicPlot, SpectraFit XPS).
8. **Undo / redo** as first-class buttons in the sidebar; undo covers fits and parameter edits (MagicPlot, Igor).
9. **Templates** for recurring models (SpectraFit XPS) and **sequences/protocols** (Spectragryph) → same as Origin's themes but simpler.
10. **Mode hints bar** (Fityk): a line that tells you what the mouse buttons do *now*.
11. **Command echo / history**: every action logged as a replayable line (Fityk) — Kurve already has a History tab.
12. **Single session file**: one JSON project including data, model, results (SpectraFit XPS, SpectraFit-Python).
13. **Guided empty state**: bundled demo dataset + illustrated guide (SpectraFit XPS).
14. **Apply-to dialog convention** (Spectragryph): every operation asks "all / selected spectra" and "keep / replace original".
15. **Auto-detect and tell the user** (SpectraFit XPS banner "Auto-detected: Scienta (Al Kα)…"): defaults are explained, not silent.

---

## 6. What Kurve should adopt, keep, and avoid

**Adopt (highest value first)**
1. One-window layout with **component cards** (pattern 1) instead of Origin's parameter table dialog; keep a table view as an alternate tab for power users (Origin's columns: Error, Dependency, Bounds).
2. **Baseline as either a background type (segmented) or a fitted component**, with a toggle "fit baseline with peaks" defaulted **on** (Igor's advice).
3. **Expression constraints** (`P1.pos + 1.18`, `P1.w * 1.2`) with link/master; evaluate every iteration; use a tiny safe parser (no `eval`).
4. **Animated fitting** with Break and Undo fit; convergence message as a toast; iteration count/RSE in a footer.
5. **Stacked residual panel and cursor readout strip.**
6. **Draggable fit-range handles** and draggable peak handles (position, height, width).
7. **Undo/redo** stack for everything (Kurve's noted gap).
8. **Mouse-wheel parameter tweak** (Ctrl/Shift steps).
9. **Multiple auto-peak strategies** (local max, smoothed 2nd derivative, residual-based) offered as "Suggest peaks ▾".
10. **Templates + action log → replayable "sequence"** (Fityk/Spectragryph idea) to power batch without a wizard.
11. **Bundled demos + inline guide**, **Save session as one JSON** (Kurve's store already serialises `S.proj`).

**Keep (Kurve strengths and Origin strengths worth matching)**
- Parameter **uncertainties, dependency, R², reduced χ², confidence bands** (Origin-grade statistics; competitors often lack them, e.g. SpectraFit XPS). Kurve already has covariance and delta-method derived errors.
- **Collaboration** (comments anchored to points/fits, presence, history): none of the alternatives above offer this except cloud suites; it is Kurve's differentiator.

**Avoid**
- Modal wizard windows and separate preview windows (Origin).
- Hiding statistics in a second window; show them beside the fit.
- Silent defaults (Auto-with-explanation instead).
- Over-specialising (XPS-only tools cover their domain; Kurve's edge is general spectra + collaboration).

**Differentiation hypothesis [infer]**: *"SpectraFit XPS's interaction quality + Origin's statistics + shared workspaces, for general spectra (Raman, IR, UV-Vis, PL, XRD), free and in the browser."* Spectragryph's abandonment and Origin's cost/complexity are the market gap.

---

## 7. Adjustments to the earlier Kurve UI proposal (`ORIGIN_UI_AND_WORKFLOWS.md` §12)
- Replace the "stepper-first" inspector with **cards-first**: the right pane shows *Background* segmented control + *Components* card list + a compact *Fit* section (Run Fit, Undo, Redo, algorithm, convergence). Keep the stepper only for onboarding (a collapsed "Guide" ribbon).
- Add the **cursor readout strip** and **status footer** under the graph.
- Add **fit-range handles** (dashed vertical) and a **residual panel** toggle (already partly present in Kurve: `plot.resid`).
- Move the **statistics table** (Value, Error, Dependency, CI) into a drawer tab beside Discussion and History.
- Add a **"Suggest peaks ▾"** menu (Local max, 2nd derivative, Residual).
- Keep Kurve's pointer modes (Zoom, Mask, Comment) and add Pan, Add peak, Add anchor.

---

## 8. Confidence and gaps
- High: SpectraFit XPS, MagicPlot fit window, Fityk, Orange Peak Fit (all seen). Igor's workflow (doc + partial visuals; I did not see its control panel). Spectragryph (thumbnails only: layout and dialog conventions, not fine detail).
- Medium: KherveFitting (paper page fetched failed; details from search snippets), PeakFit (snippets), SpectralBench (vendor site JS-rendered; no screenshots).
- Not covered: CasaXPS, LabSpec, OMNIC, Mnova (commercial, NMR), OpenChrom, HyperSpy UI; also SPECTROview details (403).
- No hands-on use of any tool; "better" is inferred from documentation, screenshots and reviews, not from head-to-head timing.

## 9. Sources
[SpectraFit XPS paper](https://arxiv.org/html/2609.16789) · [MagicPlot fitting manual](https://magicplot.com/wiki/fitting) · [MagicPlot](https://magicplot.com/) · [Fityk intro](https://fityk.readthedocs.io/en/latest/intro.html) · [Fityk getting started](https://fityk.readthedocs.io/en/latest/getstarted.html) · [Igor Multipeak Fitting](https://www.wavemetrics.com/products/igorpro/dataanalysis/peakanalysis/multipeakfitting) · [PeakFit overview](https://systatsoftware.com/peakfit/) · [Spectragryph features](https://www.effemm2.de/spectragryph/about_feat.html) · [Spectragryph screenshots](https://www.effemm2.de/spectragryph/about_descr_screens.html) · [Orange Peak Fit widget](https://orangedatamining.com/widget-catalog/spectroscopy/peakfit/) · [Orange-Spectroscopy docs](https://orange-spectroscopy.readthedocs.io/) · [SpectraFit (Python) paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11155667/) · [KherveFitting paper](https://analyticalsciencejournals.onlinelibrary.wiley.com/doi/full/10.1002/sia.70032) · [SpectralBench](https://spectralbench.com/) · [SpectraComp roundup (vendor-affiliated)](https://spectracomp.com/software/best-free-spectral-analysis-software) · [GraphPad Prism: everything is hot linked](https://www.graphpad.com/guides/prism/latest/user-guide/everything_is_hot_linked.htm) · [jupyter-lmfit](https://github.com/wholden/jupyter-lmfit)
