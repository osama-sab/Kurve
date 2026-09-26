# Origin's UI and workflows: layout, interaction, and how to translate to Kurve

Audience: me (Claude). Third document; read together with:
- `ORIGIN_SPECTRA_RESEARCH.md` (Peak Analyzer feature detail)
- `ORIGIN_MENUS_AND_TOOLS_REFERENCE.md` (menus, tools, data model, feature→code mapping)

This one records **what the UI actually looks like and how you drive it**. Everything tagged **[seen]** comes from screenshots
I looked at directly (about 60 images from OriginLab's tutorials, help pages and the Peak Deconvolution app page). **[doc]** =
text documentation. **[infer]** = my inference or design judgement, not something OriginLab states.

Not seen: live motion, timing, hover feedback, drag feel, keyboard flow beyond what captions state, or any video. Screenshots come
from many Origin versions (2014-2025), so visual style varies (older ones are Windows 7 look).

---

## 1. The overall workspace [seen: interface overview figure]

Origin is a classic desktop MDI app. Regions, as labelled in Origin's own overview figure:
- **Menu bar + docked toolbars** at top (context-sensitive per window type). A **Search** box sits at the right end of the menu bar; typing a task word ("batch") returns grouped results: Toolbars, Menus (with full menu path), Shortcut Menus, Apps (with install status ticks/download arrows), FAQ, Help, Samples, Web search. [seen]
- **Project Explorer** (docked left): folder tree on top, contents below. Preview-pane toggle shows thumbnails of every graph (Alt+P). [seen]
- **Child windows** (the workbooks and graphs) float in the centre, tiled or cascaded; each has its own title bar, min/max/close. [seen]
- **Object Manager** (docked right): tree of the active graph's layers and plots with a checkbox per plot to show/hide (e.g. Amplitude, Baseline, Fit Peak 1…, Cumulative Fit Peak). [seen]
- **Apps Gallery** (docked far right): icon list of installed apps (LaTeX, Heat Map with Dendrogram, ODE Solver, Peak Deconvolution, Correlation Shift, ...) each opens a panel. [seen]
- **Results Log / Messages Log / Smart Hint Log** (floating or hidden), **Script Window** (LabTalk output), **Status Bar** at bottom (active dataset, units mode like Radian, masking counts). **Start menu (F1)** button bottom-left. [seen]

**Character:** dense, many windows, everything is a window you arrange yourself. Powerful but heavy; new users rely on the Learning Center (a modal gallery with Graph Samples / Analysis Samples / Learning Resources tabs, a plot-type filter dropdown and search box). [seen]

[infer] For a browser app this maps to *one canvas with docked panels*, not floating windows.

---

## 2. Workbook (worksheet) anatomy [seen]

Top to bottom inside a workbook window:
1. **Title bar**: `BookShortName - Workbook Long Name`, with a small icon; a lock icon on columns that are analysis outputs.
2. **Column header**: short name + designation, e.g. `A(X)`, `B(Y)`, `C(Y)`; `(Er)`, `(L)`, `(Z)` others. Designation is set from the Column menu or a toolbar. Analysis output columns show a padlock.
3. **Label rows (yellow rows)**, all optional and reorderable: **Long Name, Units, Comments, F(x)=** (a formula that fills the column), **Sparklines** (tiny plot of the column), plus **user-defined parameter rows** (e.g. Correction Factor, Peak Value `=max(D)`, Version, Sample, Measured on, Run Type, SampleID, BatchNo, RunNo). Right-click a label area → *Edit Column Label Rows…* opens a dialog: drag rows to reorder, checkbox per row for Show, a Height column, Reset Order, and "Add User Parameters". A data file's metadata (date, integration time, spectra averaged, temperature, pixel count) is placed into the Comments row on import. [seen]
4. **Row numbers** (grey) and data cells; masked cells red. Cells can contain images/graphs/hyperlinks with a tooltip preview (Alkane sheet shows structure images and a hover card). [seen]
5. **Sheet tabs** at bottom with ◀ ▶ + ∨ (add sheet, organiser); sheet names like `S15-125-03`, `Batch No. 1`.
6. A workbook can have **many sheets**; **Custom Report** sheets are laid out pages with a header, a logo, tables and embedded graphs. [seen]

**Pattern:** spreadsheet data + metadata rows *are part of the data model* (sample IDs, wavelengths, units), and everything else (legend, axis titles, offsets, batch IDs) reads from those rows.

---

## 3. Graph window anatomy and tools [seen]

- **Layer tabs** in the top-left corner of the graph page (`1 2 3 4`); the current one is highlighted. Multi-layer pages (four panels shown, each a layer with its own axes). A small **"H" icon** top-right toggles something (theme/gadget hint). [seen]
- **Tools toolbar** (vertical, left edge), labelled in Origin's tutorial: Pointer (object select); **Scale In** (zoom; double-click restores; Ctrl-drag creates a zoom graph); Scale Out; **Screen Reader** (reads screen coordinates); **Data Reader** with flyout {Data Reader, Data Cursor, Data Highlighter}; **Data Selector** (range along x) with flyout {Selection on Active Plot, Selection on All Plots}; **Mask points** flyout {Mask on Active Plot, Mask on All Plots, Unmask Active, Unmask All}; **Draw Data** (freehand points); Text tool; Arrow/Line/Rectangle; **Zoom-Panning tool (hand)** hold A: drag to pan, mouse wheel or +/- to zoom; **Rescale tool** hold Z/X (Z zoom, X pan, Shift for Y) with Space toggling panning mode. [seen]
- **Data Point Tooltip / Data Plot Tooltip**: right-click on a point → *Show Data Point Tooltip* (shows Row, X, Y values), *Show Data Plot Tooltip* (shows dataset name and which columns are X and Y as hyperlinks), *Pick Data Points…*, *Go to Sheet*, *Copy*, *Copy Coordinates*, *Preferences…*. Tooltips can show custom columns and images. [seen]
- **Data Highlighter** ring on a point highlights its row in the worksheet (row 338 lights up); the reverse also works. [seen]
- **Vertical Cursor gadget**: a red vertical line across stacked panels; a docked table lists X, Y, Name, Graph per curve with a Status checkbox and *Snap Cursor to Nearest X*; toolbar for step buttons and typed `X =`. [seen]
- **Data Slicer**: a left sub-panel with a filter list (e.g. a dropdown of makes) that re-filters the plotted data live. [seen]
- **Plot Setup dialog** ("Configure Data Plots in Layer"): five numbered steps overlaid by tutorial annotations: 1 choose data source, 2 choose plot type list (Line, Scatter, Line+Symbol, Column/Bar, Area, ...), 3 assign columns with X / Y / yEr / L checkboxes, 4 Add, 5 OK/Apply. A plot list at the bottom shows each plot with Range, Show checkbox, Plot Type, Legend text; Ctrl-select then right-click → **Group**; drag icons to reorder; layer nodes. [seen]
- **Plot Details / Plot Properties** dialog: tabs Symbol, Subset, Panel, Drop Lines, Label, Centroid (Pro), Shape List; with a live **preview** at left. Symbol colour/shape can be driven by a column ("Index:Col(C): Label"). [seen]
- **Group tab**: *Edit Mode* Independent/Dependent, table of style properties (Border Color, Fill Color, Border Type, Fill Pattern) each with an **Increment** dropdown (None/By One/…), **Subgroup**, and a **Details** swatch strip; a **Group Members** colour list at right; subgrouping (None / By Size / By Column Label / By Axis). [seen]
- **Axis Scale mini dialog**: Axis selector, Log checkbox, From, To, Tick Increment, buttons More…/Apply/OK/Cancel. [seen]
- **Fit dialogs can link to graph state**: an arrow-menu next to Input Data lists *Add Plot(1)*, *Add all plots in active layer*, *Reset*, *Reselect All Data from Graph*, **Use X Scale Range**, *Select Columns…*. Choosing the last one copies the graph's zoom range into `Rows: By X From/To`. [seen]

**Interaction summary:** the graph is manipulated through a *tool palette* (modal cursors) plus *right-click context menus*, and data are read via cursors/tooltips. Selection ↔ worksheet cross-highlighting is two-way.

---

## 4. The dialog design language (very consistent across Origin) [seen]

Every analysis dialog shares these elements:
1. **Dialog Theme** bar at top: a dropdown of saved settings plus a **▶ arrow button** that opens a menu (Save As, Load, Manage). Names like `<default>`, `<Last used>`, `Linear (System)`.
2. **Recalculate** dropdown (`Manual` shown in screenshots; None/Auto/Manual).
3. **Tabs** for sections (Settings | Code | Parameters | Bounds, or Input | Fit Control | Quantities | Residual Analysis | Output | Fitted Curves Plot | Find X/Y | Residual Plots), or a **left navigation list** inside a tab (Function Selection, Data Selection, Fitted Curves, Find X/Y, Advanced, Output).
4. **Tree-style option panels** with `[+]`/`[-]` collapsible groups and blue read-only status text ("Current Number of Points  8"; "Adjacent-Averaging smoothing is used.").
5. **Auto** checkboxes next to numeric fields (Smoothing Window Size 3 ☑ Auto; Threshold 0.05 ☑ Auto): default computed, user can override.
6. **Range/input pickers**: an edit field with `[Book]Sheet!Col` text, a small icon button that picks from the graph, and a **▶ menu** for shortcuts.
7. **Bottom buttons** vary: OK/Cancel/Apply, or Fit/Done/Cancel; a **▲▼ chevron pair** to collapse/expand the dialog into a compact form.
8. Tutorial annotations show intent: *hint text at the top of each page* (`Move the yellow rectangles to change integration limits`), and a small grey **page-id line** (`pa_goal`, `pa_basemode`, `pa_peaks`, ...) + one-line description under the nav buttons.

[infer] The strengths worth copying: saved themes, Auto-with-override, blue status text, and a hint line. The weaknesses to avoid: modal dialogs that hide the graph, tiny dense controls, and inconsistent window chrome.

---

## 5. Peak Analyzer wizard in detail [seen]

### 5.1 Frame
A **narrow dialog (about 390px wide)** with a **live preview window** (a separate small graph window titled *Peak Analyzer Preview*) beside it. Layout of the dialog, top to bottom:
1. Title bar; **Dialog Theme** selector with ▶ button.
2. **Step tree on a black panel** (yellow text): `Goal - <goal name>` → `Baseline Mode` → `Create Baseline` → `Baseline Treatment` → `Find Peaks` → `Fit Peaks (Pro)` → `Finish`. Each node has a small coloured square: **orange = completed, green = current (label in bold white/yellow), yellow = pending, red = Finish**. The steps shown depend on the Goal (Integrate goal shows Integrate Peaks as last step; Find Peaks stops at Find Peaks; Create Baseline goal would show fewer). Clicking a node presumably jumps to it [infer].
3. Buttons: **Prev, Next, Finish, Cancel** plus a ▲▼ chevron pair (collapse the tree).
4. The **page-id/description line**, e.g. `pa_goal` / "Select spectrum data and Goal".
5. A **scrollable page body** with the controls for the current step.

### 5.2 Page bodies
- **Start (Goal)**: `Recalculate` dropdown; heading "Define a baseline, find and fit peaks"; **Goal** radio list: Integrate Peaks, Create Baseline, Subtract Baseline, Find Peaks, Fit Peaks (Pro); `Input` expandable field showing the data range like `[Graph1]1!1"B"`. The wizard can be launched from a graph (uses plotted data) or a worksheet column.
- **Baseline Mode**: dropdown; content changes by mode:
  - *Constant*: `Y=` value shown blue, radios Minimum / Maximum / Mean / Median / Custom.
  - *User Defined*: `Snap to Spectrum`, then **Baseline Anchor Points** group: sub-group *Anchor Points Finding* (Method radios: 2nd Derivative (zeroes), 1st and 2nd Derivative, Use Script to Search, Use Existing Dataset, 2nd Derivative (peaks); blue note "Adjacent-Averaging smoothing is used."; Smoothing Window Size (3, Auto ☑); Threshold (0.05, Auto ☑)), `Current Number of Points 8`, `Enable Auto Find ☑`, `Number of Points to Find 8`, **Find** button, then **Add / Modify/Del / Clear All** (greyed while Auto Find is on), **Save… / Load… / Anchor Points Info…**.
  - *Asymmetric Least Squares*: Settings group with Asymmetric Factor (0-1) (0.001 for positive peaks, 0.99 for negative), Threshold (0.02), Smoothing Factor (5.5 or 6), Number of Iterations (10). A blue hint: "Asymmetric factor represents weight of points above baseline. For positive peaks, a small number close to 0 can be chosen."
  - *XPS*: Computation Range; Method dropdown {Shirley, Tougaard}; for Tougaard an Option dropdown {Final Height,...}; `Final Height` value (blue) with Auto ☑. The preview shows the raw data, the computed baseline (red) and a blue "baseline snapped into spectrum".
- **Create Baseline** (only appears for User Defined mode): **Connect by** dropdown {Interpolation…, Fitting (Pro)}; `Snap to Spectrum`; `Baseline Anchor Points` Add / Modify/Del; `Number of Baseline Points 346`, `Same as Input Data ☑`; when Fitting: **Function** dropdown (ExpDec2), an expandable *Parameters* section, and a blue hint pointing to Fitting Function Builder (F8) / Organizer (F9), Baseline category.
- **Baseline Treatment**: checkboxes `Auto Subtract Baseline`, `Auto Rescale`; buttons **Subtract Now / Undo / Rescale**; `Fit Baseline with Peaks` (enabled only in Fit goal with fitted-baseline); blue "Fit Function: ExpDec2"; `Fix Baseline Parameters`; blue note "as Determined from Baseline Anchors".
- **Find Peaks**: `Current Number of Peaks 7` (blue), `Enable Auto Find ☑`, **Find**, Add / Modify/Del / Clear All / Save… / Load… / **Peaks Info…**, `Snap to Spectrum`. Collapsible groups: **Peak Finding Settings** (Show 2nd Derivative ☐; Smoothing Window Size 0 with Auto; Direction Both/Positive/Negative; Method dropdown; nested Smooth Derivative Method), **Peak Filtering** (Method: None/By Height/By Number/…; Threshold Height(%) 20 Auto ☑ or Number of Peaks 5), **Labels and Markers**, **Peak Fitting Bounds** (Fit goal only); `Output Baseline Subtracted Peaks`; output targets like `Baseline [<input>]<new>` and `Peak Centers [<input>]<new>` with checkboxes and pick buttons. Preview shows peak centres as red dots with numeric labels above.
- **Integrate Peaks**: hint "Move the yellow rectangles to change integration limits"; `Number of Ranges to Integrate 2` with an "All Peaks" checkbox; **Integration Window Width** radios: Auto / Adjust on Preview Graph / Fix Width For All Peaks / Width by Anchor Points; `Integrate From` dropdown (Baseline / Y=0); `Show Integrated Area ☑`; a **Quantities** checklist (Peak Area, Percent Area, Curve Area, Row Index, Beginning X, Ending X, ...). Preview shows **yellow hatched vertical bands with blue borders and a numbered box** per peak, area shaded.
- **Fit Peaks**: `Snap to Spectrum ☑`, `Peaks` Add / Modify/Del, `Weight` group (Method: No Weighting…), `Show Residuals ☐`, `Show 2nd Derivative ☐`, collapsible `Result` (Output Settings, Configure Report, Configure Graph), `Generate Report from Current Fitting Result ☐`, bottom **Fit Control** and **Fit** buttons. [seen]

### 5.3 The Preview window
Separate small floating graph: axis ticks, the curve, **red squares = baseline anchors**, red baseline curve (or cyan when fitted), peak centres labelled with their x values, peak sub-curves in green/cyan, total fit in red; after "Subtract Now" the plot changes to baseline-subtracted data (before/after pair shown in Origin's tutorial). The preview updates as soon as you press Find / Subtract / Fit. [seen]

### 5.4 Editing markers directly on the preview [seen: annotated figure]
For both anchors and peaks: (1) untick **Enable Auto Find**; (2) click **Add** (double-click in the preview at the wanted position), or **Modify/Del** (click a red circle to select; drag or use arrow keys to move; Tab cycles through points; Delete removes; Space toggles cross-hair size); (3) a **mini toolbar with a `Done` button** (or Ctrl+Enter) appears at the top of the preview: "Get Points: Click DONE…". [seen]

### 5.5 Peak Fit Parameters dialog (opened from Fit Control) [seen]
A **table dialog**, resizable, with:
- `Auto Parameter Initialization ☑` and a **Hide…** button (top-right).
- Tabs: **Parameters | Bounds | Fit Control**.
- **Parameters table** columns: `NO.` (0 = baseline/offset; 1..n = peak index; alternating grey bands per peak), `Peak Type` (or Function), `Param` (`xc_1`, `A_1`, `w_1`, `y0`), `Meaning` (center, area/amplitude, FWHM, offset, decay constant), `Share` (dropdown group number, 0 = none), `Fixed` (checkbox), `Value` (editable), `Error`, `Dependency`, `Lower Conf Limits`, `Upper Conf Limits` (scroll right). Baseline parameters have their own rows (ExpDec2: y0, A1, t1, A2, t2).
- **Bounds tab**: columns NO., Meaning, Value, `Lower Bounds`, `< or <=`, `Param`, `< or <=`, `Upper Bounds`. E.g. FWHM `0 < w_1`.
- **Bottom toolbar**: a **peak-type dropdown** (applied to selected/all peaks) and a row of icon buttons (peak-type tools, Sort peaks, Reset values, χ² (compute reduced chi-sqr), **iterate one step**, **fit until converged**), and `OK`, with a ▼▲ chevron that expands a **lower panel with tabs Messages | Formula | Sample Curve | Function File | Hints**. The Messages tab logs: `Levenberg-Marquardt`, `Reduced Chi-sqr = 15.12`, `COD(R^2)= 0.988`, `Iterations Performed = 8`, `Fit converged. Chi-Sqr tolerance value of 0.05 was reached.` [seen]
- The **peak-type dropdown list** (all built-in peak functions): AsymSig, Bigaussian, BWF, CCE, ConsGaussian, DoniachSunjic, ECS, FraserSuzuki, Gauss, GaussAmp, **Gaussian**, Gaussian_LorenCross, GCAS, HVL, InvsPoly, **Lorentz**, LogNormal, **PearsonVII**, Pulse, **PsdVoigt1**, **PsdVoigt2**, Sine, SineDamp, SineSqr, SchultzFlory, **Voigt**, Weibull3, plus `NewPeakFitting (User)`. (This closes the "function list" gap flagged earlier.) [seen]
- **Peak parameterisation in Origin's peak fits:** each peak is `xc` (center), `A` (**area**), `w` (**FWHM**), on top of a shared baseline `y0`. [seen]
- Per-parameter share/fix example: "xc_1 and xc_2 are shared, A_1 is fixed". [seen]

### 5.6 Result output [seen]
- **Results appear in three places at once**: a *Peak Analysis* report **graph page** (title, dataset, date, baseline, χ², adj R², SS, DOF, the fit plot with sub-peaks in green and total in red, and a **table below with Peak Index, Peak Type, Area Intg, FWHM, Max Height, Center Grvty, Area IntgP**), a **worksheet** of the same values, and the Preview. `Configure Report` opens a tree with Quantities (Fit Parameters, Fit Statistics, ANOVA, Covariance matrix, Correlation matrix) and Peak Properties (Dataset Identifier, Data Range, Peak Index, Peak Function Type, ... ). `Configure Graph` sets plots. [seen]
- Baseline and peak-centre sheets are **separate output worksheets** (`Baseline_Data1`, `Peak_Centers1`) with locked column headers and long-name/comment rows explaining the content (for example "Peak Centers of Baseline Subtracted 'Amplitude'"). [seen]

### 5.7 End-to-end flow (fit peaks on an exponential background) [seen]
1. Select column; Analysis → Peaks and Baseline → Peak Analyzer. 2. Goal = Fit Peaks. 3. Baseline Mode = User Defined → Find (8 anchors appear as red squares). 4. Create Baseline → Connect by Fitting, Function ExpDec2. 5. Baseline Treatment → tick *Fit Baseline with Peaks*. 6. Find Peaks → Find (2 peaks appear labelled 103, 277). 7. Fit Peaks → Fit Control → check Peak Type Gaussian for all rows, baseline rows now ExpDec2 → *Fit until converged*. 8. Finish → report graph + worksheets.
Total: **7 clicks of Next/Find/Fit and 1 dialog**, plus manual review at each stage.

---

## 6. Peak Deconvolution app (Origin's modern, panel-based version) [seen]

This app is the closest thing to a web-style layout and is the best template for Kurve.
- **Layout**: one window. **Graph on top** (a light-grey plot with the data in blue and baseline as a horizontal red line; a magnifier icon and a reset/scale icon overlaid at its top-left corner). **Control panel below the graph, docked**, split in two columns.
- **Left column**: three tabs **Baseline | Peaks | Save/Load**.
  - *Baseline tab*: `Baseline Model` dropdown (Constant, Straight Line, …), `Y=` field, radios Minimum/Maximum/Mean/Median/Custom, a group with `Fit Baseline with Peaks ☑` and a blue `Fit Function: Constant`, and a primary button **Subtract Baseline & Close**.
  - *Peaks tab*: blue `Current Number of Peaks: 3`; `Allow Auto Peak Fit If Less Than [20]`; `Re-find Peak for Each Dataset in Batch ☑`; buttons **Find** and **Init Fit**, then **Add / Modify/Del / Clear All**, **Save… / Load…**, an orange **Peak Finding Settings…** which opens a modal card (Smoothing Window Size with Auto, Peak Resolution Enhancement, Direction, Method (2nd Derivative (search Hidden peaks)), Smooth Derivative Method + Points of Window, Peak Filtering Method + Number of Peaks, Allow Auto Peak Fit If Less Than), and **Find Peak & Close**.
  - *Save/Load*: themes.
- **Right column**: an **icon toolbar** (find/show peaks, add, fit-until-converged (highlighted), previous/next dataset arrows ◀ ▶, "batch fit" icon, table icon, and a dropdown **Use X Range from Graph**), then tabs **Parameters | Fit Control | Result Settings**. Parameters tab: a peak-type dropdown, `Auto Parameter Initialization ☑`, a **table with teal header** (No., Peak Type, Param, Meaning, Share, Fixed, Value, Lower Bound, Upper Bound) where Peak Type is a per-row dropdown and baseline rows use `Line` (A intercept, B slope). *Result Settings* has orange buttons **Configure Report…** and **Configure Graph…** with the same tree of quantities.
- **Feedback**: after a fit, an info toast at the graph edge: "Peak Fit. Fit converged. Chi-Sqr tolerance value of 1E-6 was reached." Peaks are labelled in the graph (`5253`, `5633`, `6302`) with green sub-curves and a red total. Zoom is by a magnifier tool: drag a rectangle in the source graph to crop the fit region **before** opening the app.
- **Batch across spectra**: the source graph holds 8 offset spectra with legend labels (angle, 31.8 … 53.3). ◀ ▶ steps through datasets, the "batch" button fits all, and the result worksheet has one row per (dataset × peak) with Dataset Identifier = plot legend text, Peak Index, Peak Type, Area Fit, Area FitT, Area FitTP, Center Max, Center Grvt, Max Height, FWHM. A second graph plots `Center Max` (peak position) **vs dataset identifier** to show the trend. [seen]

[infer] This layout (graph on top, tabbed controls beneath, parameter table with per-row dropdown, toast feedback, result table → trend graph) is a direct blueprint for Kurve.

---

## 7. Gadgets: ROI on the graph [seen]

- A **yellow translucent rectangle (ROI)** is dragged onto the graph; its top-right corner shows two small controls: **✕** (close) and **▸** (flyout). The rectangle edges are draggable; results update live.
- **Quick Peaks**: text above the ROI "3 peak(s) found", peak markers as red ticks with `(x,y)` labels rotated along the peak, a red baseline segment; area of a peak can be shaded (grey) in the graph. Settings live in *Preferences…* [seen]
- **Quick Fit**: a **label box** inside the graph (title with function name and date, `Equation: y = -0.00289 + 0.00194*x`, Weighting line, a **parameter table** (Value | Error), Reduced Chi-Sqr, R-Square, Pearson's r) and, optionally, a text line above the plot summarising Intercept/Slope. Equation can be shown "with Values", "with Names" etc. via the Preferences.
- **Flyout menu (▸)**: `New Output (O)`, `Go to Report Worksheet`, `Tag Points`, `Change Data ▸` (checklist of plots + All Plots + Select…), `Expand to Full Plot's Range`, `Save Theme…`, `Save as <default>`, `Load Theme ▸`, `Preferences…`. Note the pattern: results are *ephemeral* until the user chooses **New Output** to freeze them into a worksheet.
- **Preferences dialog** (per gadget): tabs **Settings | ROI Box | Label Box | Report | Fit Curve**, Dialog Theme at top, `Add Label Box to Graph`, Significant Digits, Function, Date & Time, Input, Range, Output, Add Legend Symbols, Weighting, Equation, Parameter Table, Show Error, Reduced Chi-Sqr, R-Square, Pearson's r.
- **Multiple gadgets in different layers** (three layers each hosting a Quick Peaks/Quick Fit/Intersect gadget); an Intersect gadget writes to a results worksheet and the Script Window. [seen]

---

## 8. Fit dialogs and report sheets [seen]

### 8.1 NLFit (nonlinear curve fit)
Window title `NLFit (Gauss)`. Top: Dialog Theme, Recalculate. Tabs: **Settings | Code | Parameters | Bounds**.
- *Settings* uses a left list (Function Selection, Data Selection, Fitted Curves, Find X/Y, Advanced, Output). Function Selection: **Category** dropdown (Origin Basic Functions), **Function** dropdown (Gauss) with **New / Add / Search** buttons, **Iteration Algorithm** (Levenberg Marquardt), read-only Description ("Area version of Gaussian Function") and the `.FDF` file path.
- *Parameters*: `Auto Parameter Initialization ☑`; a hint line ("Double click cells to change operator. Right click cells for more options. Drag column header to change column orders."); table `NO. | Param | Meaning | Fixed | Value | Error | Dependency | Lower Conf Limits | Upper Conf Limits | Significant Digits (per-row dropdown) | Initial...`.
- Bottom: toolbar (Sort peaks, Reset, χ², iterate, converge), buttons **Fit / Done / Cancel**, chevrons.
- **Lower panel tabs**: `Fit Curve | Residual | Formula | Sample Curve | Messages | Function File | Hints`, with a zoom toolbar (zoom in/out/rescale) at the plot's left. The residual tab shows a regular-residual scatter with a zero line; a systematic pattern in residuals signals a bad model. When a user function is started with bad values the message reads "Chi-sqr is reduced."
- **Fitting Function Builder**: a **wizard** (left "Hints" pane + right options pane, `<<` collapse toggle, Back / Next / Finish / Cancel) with steps Goal (Create New / Edit), Name and Type, parameters, expression, constraints, initialization code, etc. [seen: Goal page]

### 8.2 The report sheet [seen]
A worksheet hosting a **collapsible tree** with a padlock at the root and a title like `Nonlinear Curve Fit (Gauss) (7/31/2018 09:11:54)`. Nodes: **Notes, Input Data, Masked Data - Values Excluded from Computations, Bad Data (missing values), Parameters, Statistics, Summary, ANOVA, Fitted Curves Plot, Residual Plots**. Each node has a small ▾ menu. Tables have yellow header cells. Parameters table: rows y0, xc, w, A, then *derived* sigma, FWHM, Height; columns Value, Standard Error, t-Value, Prob>|t|, Dependency. Under it a blue-text block (Reduced Chi-sqr, COD, iterations, "Fit converged...", "Standard Error was scaled with square root of reduced Chi-Sqr.", "sigma, FWHM, Height are derived parameter(s)"). Statistics: Number of Points, Degrees of Freedom, Reduced Chi-Sqr, Residual Sum of Squares, R-Square (COD), Adj. R-Square, Fit Status (`Succeeded(100)`) and a "Fit Status Code" footnote.
**Right-click menu on the report:** Copy ▸ (Copy, Copy Transposed, Copy All Open Tables, ... (HTML), ... as Image, Copy Table (Text)…), Send to Layout / Word / PowerPoint, Send All Open Branches to Word, Create Copy As New Sheet, Create Transposed Copy, Export ASCII…, Expand / Collapse (+Recursively), Save Node Configuration, **Change Parameters…** (re-open dialog), Reset All Graphs, Dataset Identifier ▸, Arrange Plots of Same Type in One Graph, Digits…, View ▸. [seen]
Reports can be placed in a **custom layout page** with a logo, a title date, an embedded graph and a parameter table for publication. [seen]

---

## 9. Batch dialogs [seen]

- **Batch Peak Analysis Using Theme**: Dialog Theme; `Input` (multi-range list of columns); `Theme` dropdown (saved Peak Analyzer theme); `Result Sheet` dropdown (Peak Properties); `Include Fit Statistics in Report ☑`; `Output Sheet` (`[MySummary]MyResults!`); `Delete Intermediate Result ☑`; **Options**: Dataset Identifier list-builder (Range, ...), Designation, Starting Row of Output Sheet, Clear Output Sheet on Start, Append Label Rows, Append by Rows/Columns; **Script** section with three boxes (**Before Each Process**, After Each Process, At the End), e.g. `if (nSD^2/sSD^2>0.3) _skip=1;` to skip poor-quality inputs; `Use Background Instance(s) to Process`.
- **Batch Processing (analysis template)**: Mode radio (Repeatedly Import into Active Analysis Template Window / Load Analysis Template); Analysis Template path; Word/PDF export group (Export to, Word Template, Export Path, multi-page); Data Source (Import Specified Files); File List; Dataset Identifier (File Name); Data Sheets; Result Sheet; Output Sheet; Options; Script. [seen]

---

## 10. Workflow maps for the tasks Kurve cares about

**A. One spectrum: baseline → peaks → fit → report** (Origin: Peak Analyzer wizard or Peak Deconvolution app)
Import → (optionally crop range) → choose baseline model → preview → subtract → find peaks (auto + manual edit) → assign peak function → Fit Control (fix/share/bounds) → fit until converge → read messages/toast → report (graph + worksheet) → optional trend plot.

**B. Many spectra**: overlay/offset graph with legend from a label row → open Peak Deconvolution → tune on the first → ◀ ▶ through datasets or batch-fit → result table with Dataset Identifier → plot parameter vs identifier.

**C. Quick look at a region**: drop a gadget ROI → drag edges → read numbers on the graph → *New Output* only if you want to keep them.

**D. Repeat analysis**: save Dialog Theme → Batch Peak Analysis Using Theme → summary sheet.

**E. Investigating a point**: tooltip → Data Highlighter → row highlights in worksheet → mask → dependent results recalculate.

---

## 11. Design principles distilled

What Origin does well [seen + infer]:
1. **Stepper with state** (orange/green/yellow) so users know where they are and can go back.
2. **Preview is always visible and updates immediately**; markers are draggable with a Done confirmation.
3. **Auto with override** (checkbox beside numeric fields) and **blue read-only status** text.
4. **Parameter table** that carries value, error, dependency, and per-row controls (Fixed, Share, peak type).
5. **Messages log** in the fit dialog says exactly why fitting stopped, plus a **Residual** tab one click away.
6. **Results frozen only on demand** (gadgets: New Output), and **many output views** (graph report, table, worksheet).
7. **Dataset identifier** concept: legend/label text carries through to batch result tables.
8. **Themes** and a **Search** box for discoverability.

Where Origin is weak (opportunities) [infer]:
- Modal, floating windows; small dense controls; two or three windows open at once for one task.
- Wizard is linear and heavy; users often only want "subtract baseline, fit these 3 peaks".
- No inline drag of a peak's height/width on the graph in the wizard (markers only pick centres); in a web app you can drag centre, height and width handles.
- Preview is a separate window; results, residuals and parameters are on different tabs.
- Weak error feedback (a message log you have to open).

---

## 12. Proposed Kurve UI (translated from the above)

### 12.1 Current Kurve layout (`kurve.html:187-275`)
Header (brand, project selector, name, New project, presence avatars, status, export buttons) → 3 columns: **Worksheet** (import CSV; grid; footer hint) | **Graph** (tools: Zoom/Mask/Comment segmented; Reset view; style; Log Y; Grid; Residuals; canvas with SVG, zoom rectangle, tooltip, empty state; hint line) | **Side pane** tabs *Fit | Discussion | History*.

### 12.2 Target layout
```
+--------------------------------------------------------------------------------------+
| Header: project · presence · Recalc: Auto|Manual · Theme ▾ · Search (Ctrl+K) · Export |
+-------------+---------------------------------------------------+--------------------+
| Datasets    | Graph toolbar: Pointer|Zoom|Pan|Mask|Anchor|Peak|  | Inspector          |
|  ☑ spec 1   |   ROI |Cursor · style · Log · Rev-X · Offset ▾    |  Stepper:          |
|  ☑ spec 2   |---------------------------------------------------|  ① Data            |
|  ...        |                                                   |  ② Baseline        |
| Worksheet   |   GRAPH  (data, baseline, peaks, fit, ROI,        |  ③ Peaks           |
| (columns,   |   anchors, peak handles, integration bands)      |  ④ Fit             |
|  label rows,|                                                   |  ⑤ Report          |
|  sparklines)|---------------------------------------------------|  (each = collapsible|
|             | Residual strip (toggle) · Cursor readout          |   section w/ status)|
+-------------+---------------------------------------------------+--------------------+
| Bottom drawer (tabs): Parameters | Peaks | Statistics | Messages | Discussion | History |
+--------------------------------------------------------------------------------------+
```
Rationale: keep Kurve's collaboration tabs (Discussion, History) but move them into the drawer; add the stepper and parameter table.

### 12.3 Components and interaction specs
1. **Stepper** (Data ▸ Baseline ▸ Peaks ▸ Fit ▸ Report): status squares copy Origin's colours **but with accessible shape/labels** (done ✓, current ●, pending ○, warning ⚠). Clicking jumps. Each step is optional; Goal picker at the start ("Just fit a curve", "Baseline + peaks", "Integrate only") sets which steps show, like Origin's Goal.
2. **Live preview inside the graph**, no separate window: baseline shown as a dashed line, subtracted view as a toggle ("Show: Raw | Subtracted | Both").
3. **Baseline step**: mode dropdown; per-mode compact form; Auto ☑ next to numeric fields; blue/secondary status text ("8 anchors"); anchor markers as draggable squares; double-click adds, drag moves, Delete removes; Enable-Auto-Find toggle; **Done/Esc** when editing. Modes v1: Constant, Straight line, Anchors (linear/spline/poly connect), ALS. Later: Shirley, Tougaard, fit function.
4. **Peaks step**: Find with method/direction/filter; peak markers with labels; drag a marker to move centre; drag vertical handle for height and side handles for width [improvement over Origin]; double-click adds; Delete removes. Right-click a peak → type, fix, share.
5. **Fit step**: **parameter table** (columns per Origin: No, Peak, Param, Meaning, Share, Fixed, Value, Error, Dependency, Lower/Upper bound) with inline editing, per-row peak-type dropdown, Fit / Iterate once / Reset / Undo; **toast** on completion with the convergence message; Messages tab holds the log; residual strip under the graph.
6. **Peak/report table**: Peak Index, Type, Centre, Height, FWHM, Area, Area %, Centroid; row hover highlights the peak in the graph and vice versa (like Data Highlighter ↔ worksheet).
7. **ROI gadget**: yellow translucent draggable box with ✕ and ▸ handles; flyout: New Output (freeze), Change Data, Expand to full range, Save/Load theme, Preferences. Live "n peaks / area / FWHM" text above; Quick Fit label box with equation, params ± error, R², reduced χ². ROI also drives the fit range (like Origin's "Use X Scale Range", but explicit: *Use zoom range* vs *Use ROI*).
8. **Cursor**: Data Reader tooltip (row, x, y), plus a **vertical cursor** that reads all visible spectra at one x, with a docked table; click a point to highlight its worksheet row.
9. **Multiple spectra**: datasets list with visibility checkboxes (Object-Manager style), colour ramp from Group-tab logic (None / By One / Stretch), offset controls, legend text from a label-row variable (Dataset Identifier). ◀ ▶ steps the analysis through spectra; **Batch fit** button applies the current setup to all.
10. **Themes**: "Save setup" stores baseline + peak setup + fit options + report layout; shown as a chip at the top; applying to other spectra seeds parameters from the previous fit ("sequentially initialise").
11. **Recalculate toggle** (Auto/Manual) with a lock icon on derived columns; a stale-result badge when in Manual and data changed.
12. **Search palette (Ctrl+K)** listing actions, settings and examples (Origin's search box).
13. **Results tree** for reports: collapsible Notes / Input / Masked / Parameters / Statistics / Peaks / Residuals; per-node copy as text/TSV/HTML/image; "Change parameters…" scrolls back to the relevant step.
14. **Empty state**: examples buttons (Kurve already has two) extended with a multi-peak example and a many-spectra example.

### 12.4 Keyboard and pointer conventions to adopt
- Origin: `Space` cycles mask modes, double-click zoom restore, Ctrl+Enter = Done, Tab cycles markers, Delete removes, hold A/Z/X for pan/zoom tools, Alt+P preview pane. [seen/caption]
- Kurve: `Esc` cancel edit, `Enter` commit, `Tab/Shift+Tab` cycle markers, arrows nudge selected marker, `M` mask mode, `A` add anchor, `P` add peak, `R` residuals, `Ctrl+K` search, `Ctrl+Z/Y` undo/redo.

### 12.5 Mapping to code
- Header additions (`.top`): Recalc, Theme, Search. Layout change from 3 columns to 3 columns + bottom drawer (`.main` grid-template).
- Left `.ws-pane` gets a datasets list above the worksheet; `renderWs` extended for label rows and sparklines.
- `.graph-pane .gtools`: extend the segmented `.seg` (Zoom/Mask/Comment) with Pan, Anchor, Peak, ROI, Cursor; `setMode` and `setupGraph` gain the new modes; `buildPlot` renders baseline, anchors, peak handles, ROI, integration bands, residual strip, offsets.
- `.side-pane` tabs → stepper sections; `#pane-fit` content from `renderFit` is split per step; `Discussion` and `History` move to the drawer (keep `renderThread` and `renderLog`).
- State: extend `S` with `S.step`, `S.roi`, `S.anchors`, `S.peaks`, `S.datasetId`; persist with `save(patch, logText)`; add a `theme` object to the project.
- Toasts already exist (`toast()`); use them for fit completion.

---

## 13. Confidence and remaining unknowns

High confidence: layout, controls, labels, and flows for the Peak Analyzer wizard, Peak Fit Parameters dialog, NLFit, report sheet, gadgets, Peak Deconvolution app, workbook anatomy, graph tools palette, batch dialogs.
Medium: how step-tree navigation behaves when clicking nodes; whether Origin animates previews; behaviour of Auto checkboxes beyond the defaults shown.
Low / unseen: motion and timing, undo behaviour, dark mode look, 2025-2026 UI refinements (Graph Options dialog, project browser list view, window switcher, key chords) beyond text descriptions, Life Science GUI mode.
The colour meanings for the step tree (orange done, green current, yellow pending, red finish) are read from screenshots and consistent across 5+ images.

---

## 14. Sources (pages whose screenshots were viewed)
[Peak Analyzer Quick Start](https://docs.originlab.com/origin-help/peakanalyzer-qs/) · [Peak Fitting with Baseline](https://docs.originlab.com/tutorials/peakfitting-baseline/) · [Baseline Mode page](https://docs.originlab.com/origin-help/peakanalyzer-baselinemode/) · [Baseline Treatment](https://docs.originlab.com/origin-help/peakanalyzer-baselinetreat/) · [Find Peaks](https://docs.originlab.com/origin-help/peakanalyzer-findpeaks/) · [Fit Peaks](https://docs.originlab.com/origin-help/peakanalyzer-fitpeak/) · [Peak Fit Parameters dialog](https://docs.originlab.com/origin-help/peakanalyzer-fitpara-dialog/) · [Peak Deconvolution app](https://docs.originlab.com/app/peak-deconvolution/) · [Quick Peaks gadget](https://docs.originlab.com/origin-help/gadget-quickpeaks/) · [Quick Fit gadget tutorial](https://docs.originlab.com/tutorials/quick-fit-gadget/) · [Using multiple gadgets](https://docs.originlab.com/tutorials/using-multiple-gadgets/) · [Nonlinear Curve Fit tool](https://docs.originlab.com/tutorials/fitting-nlfit-basic/) · [Analysis report sheets](https://docs.originlab.com/origin-help/analysis-rep-wks-cols/) · [Batch peak analysis with script](https://docs.originlab.com/tutorials/batchpa-script-before/) · [Batch processing](https://docs.originlab.com/origin-help/batch-processing/) · [Origin interface](https://docs.originlab.com/user-guide/origin-interface/) · [Worksheets and columns](https://docs.originlab.com/user-guide/worksheets-columns/) · [Graphical exploration of data](https://docs.originlab.com/user-guide/graphical-exploration-of-data/) · [Graphing](https://docs.originlab.com/user-guide/graphing/) · [Data analysis](https://docs.originlab.com/user-guide/data-analysis/) · [Plot group tab](https://docs.originlab.com/origin-help/pd-dialog-group-tab/)
