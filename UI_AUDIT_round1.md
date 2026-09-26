# Kurve UI and interaction audit

Audited `kurve.html` (164 KB, 2026-09-22 11:45) by driving it in a browser for a full
analysis session, including an end-to-end study (Session 9). No source was changed.

---

## 1. Verdict

The engine is excellent and the shell around it is not finished. Import, undo and the
mode-hint line are genuinely better than Origin; the fitting numerics recovered every
parameter of a four-sample synthetic study to within its stated error. But the app
**presents failed and physically meaningless fit components as ordinary results**, and
when the covariance matrix collapses it silently drops every uncertainty rather than
saying so. I produced a peak table containing a band 590 billion absorbance units tall
and 1e-12 cm⁻¹ wide, listed as "3.52 % of area", with R² = 0.9961 underneath and no
warning that named it. That is the single most damaging problem: the app is capable of
handing a scientist a wrong number that looks right.

Second in line: nothing a paper needs can leave the app. Opened from disk — the
documented single-user mode — both export buttons are `hidden`, there is no copy
affordance anywhere, and the import metadata that would form the method statement is
captured, promised to the user, and then never shown again.

---

## 2. Scores

| Area | Score | One-line justification |
|---|---|---|
| Orientation | 3 | Strong empty state and mode hints; nothing tells you the *next* step once data is in, and the Fit panel offers its whole apparatus before there is anything to fit. |
| Information hierarchy | 2 | The Fit panel is a 2299 px undifferentiated column; a phantom peak and a real one get identical typography. |
| Feedback | 2 | Undo and import confirm themselves well; masking, peak deletion, adding a peak by click, and switching the analysed column all produce no visible confirmation, and results never go stale. |
| Error and empty states | 3 | "Need more than 15 points to fit 15 free parameters (have 1)" is exemplary; the worst failures produce no message at all. |
| Direct manipulation | 2 | One gesture exists (click to place a peak) and it gives no visual feedback; no drag of centre/height/width, no draggable fit range. Worse than Origin, not better. |
| Readability | 3 | Good serif axis labels and tabular numerals; six significant figures everywhere, no units in any result table, ragged decimals within a column. |
| Consistency | 2 | The same tab offers a parameter table ("One curve") and stacked cards ("Peaks + baseline") for the same job; Enter commits in the worksheet but not in parameter fields. |
| Keyboard and accessibility | 2 | Modal is `role=dialog` + `aria-modal` and takes focus, but does not trap it and does not restore it; the graph is entirely mouse-only; Ctrl+Z is ignored in the worksheet. |
| Responsive | 3 | No horizontal page overflow at 380 px and the stack order is sensible; the worksheet header grows to ~92 px of controls and column names truncate to "PET as-re". |
| Dark mode | 3 | Chrome, text and axes adapt cleanly through tokens; the two data palettes are hard-coded light-mode hex and three of them fall below 3:1 on the dark panel. |
| Domain fit | 2 | No reversed wavenumber axis (and the wizard points at a "Reverse X" control that does not exist), no legend, no units on any reported quantity, absorbance relabelled "a.u.". |

---

## 3. Session 9: data to deliverable

**The study.** Four PET films annealed at 25, 100, 150 and 200 °C. Quantify the carbonyl
band at 1725 cm⁻¹ against the invariant ring band at 1410 cm⁻¹ and report how the ratio
changes with temperature. I generated four spectra (1800→1300 cm⁻¹ descending, 1 cm⁻¹
step, curved background, Gaussian noise, an overlapping 1690 cm⁻¹ degradation shoulder
that grows faster than the main band) in a Vertex 70 style text format: six `##KEY= value`
preamble lines, semicolon delimiters, comma decimals, a two-line footer; one copy also
carried an embedded `NaN` and a duplicate row. Files were handed to the app's own
`<input type=file>` as real `File` objects, so the real import path ran.

**What I got out.** The fits are right. Areas in Absorbance·cm⁻¹, ± from the app:

| Sample | A(1725) | A(1410) | Ratio | R² |
|---|---|---|---|---|
| as-received | 9.038 ± 0.026 | 6.145 ± 0.019 | 1.471 ± 0.006 | 0.99920 |
| 100 °C | 11.441 ± 0.027 | 6.147 ± 0.019 | 1.861 ± 0.007 | 0.99941 |
| 150 °C | 14.142 ± 0.027 | 6.147 ± 0.019 | 2.301 ± 0.008 | 0.99956 |
| 200 °C | 17.642 ± 0.027 | 6.148 ± 0.019 | 2.870 ± 0.010 | 0.99969 |

The ratio column and its errors are **mine, computed outside the app**. The app cannot
combine two fitted quantities or propagate their uncertainties, and it cannot hold more
than one fit at a time, so the six numbers it produced per sample had to be read off the
screen and written down before the next fit overwrote them.

**Can the numbers leave? No.** `#expSvg` ("Export figure") and `#expCsv` ("Export data")
are `display:none` whenever `window.claude.use("downloads")` is unavailable, which is
every time the file is opened from disk. There is no copy button, no TSV view, no print
stylesheet. The `exportCsv()` code that is unreachable is actually good — it writes every
column with label and unit, the mask flag, the fit, the residual, the baseline, each peak
curve, then commented blocks with `centre error`, `area error`, per-parameter
`value,error,dependency`, and reduced χ²/R²/adjusted R². The content is right; the
delivery is missing. Even it omits the captured instrument metadata and the recipe.

**Could a second person reproduce this? No.** The History tab records imports, pastes,
fits and masks, but *not* the baseline change, *not* the deletion of eight spurious peaks,
*not* the peak I added by hand, *not* column renames or unit edits. It is also never
rolled back by undo, so it still lists `imported 501 rows from PET_100C.csv` and
`deleted column PET 200C` for actions I undid — a reader would conclude the project holds
data it does not. Entries read `You analysing PET 200C` (sic) and carry relative
timestamps only. The captured metadata (`INSTRUMENT: Vertex 70 FT-IR`, `SAMPLE`,
`RESOLUTION`) is stored in `p.meta` and displayed nowhere after the wizard closes.

### Hurdle log, ranked by cost

| # | What I was trying to do | What blocked me | Cost | What a competent tool does |
|---|---|---|---|---|
| 1 | Trust the peak table | A peak that collapsed to zero width was listed as a normal band: height 5.900e11, FWHM 1.000e-12, **Area % 3.52**. Every other peak's Area % was wrong as a result. All 15 standard errors became exactly 0 and the UI simply stopped printing `±`, indistinguishable from a tool that never reports errors. Only clue: one grey line, "One or more parameters stopped at a bound", naming neither peak nor parameter. | Total loss of trust. Everything after this has to be checked by hand. | Flag the row, exclude it from Area %, name the parameter and the peak, and print `± —` with "error not available" when the covariance is singular (Origin reports dependency ≈ 1 and says why in the Messages log). |
| 2 | Get the figure and the table out | Both export buttons hidden outside claude.ai; no copy, no print, nothing. | The deliverable cannot be produced at all. Manual retyping of 24 numbers, screenshot of the graph. | A `Blob` + `<a download>` fallback; it is ~5 lines and the CSV builder already exists. |
| 3 | Put four spectra in one project | Importing a second file **silently replaced** the first dataset. No warning, no "add as a new column" option; the project kept the first file's name. I had to build the other three columns by paste. | 15 minutes and a near-miss data loss (recoverable only because I checked). | Ask: "Replace the data, or add Absorbance as a new Y column?" — Spectragryph's apply-to convention (pattern 14). |
| 4 | Paste a column out of a European spreadsheet | `0,01937` was split on the comma into two columns: one all zeros, one holding `1937`, `2238`, … — wrong by 10⁵. No warning. The import wizard detects comma decimals and says so; the paste path does not. | Would have silently produced a spectrum with absurd absorbance and a plausible-looking fit. | Reuse `detectFormat` on pasted text, or at minimum warn when a paste creates more columns than the user targeted. |
| 5 | State the fit and integration limits in the method | The panel says "Fits 501 unmasked points with **1280 ≤ x ≤ 1820**". `fit.range` is **[1301, 1800]**. The Process tab likewise reports "Range 1280 to 1820" while integrating 1300–1800. The displayed limit is the padded *view* window, never the range used. | The one number a method statement needs is wrong on screen by 20 cm⁻¹ at each end. | Report the range actually used; show the view window separately if at all. |
| 6 | Compare samples | One fit per project. Switching the active Y column leaves the previous sample's fit displayed, over the new sample's data, with no column name on the result and no stale badge. Ratios, error propagation and a parameter-vs-sample table do not exist. | All cross-sample arithmetic done by hand outside the app. | Store a fit per column; a batch-fit button; a summary table (Origin's batch dialogs, §12.3 item 9). |
| 7 | Find the four real bands | "Find peaks" on raw data returned **12** peaks, eight of them artefacts riding the sloping background, with widths of 256–304 cm⁻¹ in a 500 cm⁻¹ window. The baseline I had just chosen was ignored. Deleting eight peaks = eight locate-scroll-clicks on 26×23 px targets in a 2299 px list, losing keyboard focus each time. | ~4 minutes of pure deletion; the wrong default for every real spectrum. | Find peaks on the baseline-corrected signal, as Origin's Peak Analyzer does by step order; offer "keep the N largest by area"; multi-select. |
| 8 | Write down the instrument conditions | The wizard says "6 metadata fields read from 6 header lines and kept with the project" — and they are never shown again, anywhere, nor exported. Also parsed wrong: `XUNITS` = `"1/cm; YUNITS= ABSORBANCE"` because the parser splits on the first `=` only. | Had to reopen the source file. | A metadata panel or a project-info disclosure; split on `;` too. |
| 9 | Label the Y axis honestly | The file declares `YUNITS= ABSORBANCE`; the app assigned **"a.u."** (`/absorbance/i → "a.u."`, line 947). Absorbance is a defined dimensionless quantity, not arbitrary units. Peak areas then read as "a.u.·cm⁻¹". | Every unit on the deliverable silently wrong. | Map absorbance to `Absorbance` or dimensionless, and never invent "a.u." from a named quantity. |
| 10 | Tell four spectra apart on the graph | No legend. The SVG contains only tick labels and two axis titles. The Y axis is labelled with the **active** column only ("PET 200C (Absorbance)") while four curves are drawn. Colour is no help: `PEAK_COLORS` and `COL_TINTS` share **7 of their 8 hex values**. | The figure is not publishable. | A legend keyed to the worksheet colour dot; two disjoint palettes. |
| 11 | Report the areas with units | No result table anywhere carries a unit. Area of Absorbance vs cm⁻¹ is Absorbance·cm⁻¹; the header just says "Area". Height carries no uncertainty at all although Centre, FWHM and Area do. | Every number needs annotating by hand. | Units in the column headers; delta-method error on height (the `derived` machinery already does this for `MODELS`). |
| 12 | Keep a descending wavenumber axis | There is none. The import wizard tells you "use Reverse X to flip the display" — **`Reverse X` does not exist anywhere in the file**. | A spectroscopist's first objection to every figure. | Build it, or stop promising it. |
| 13 | Undo a mistyped cell with the keyboard | Ctrl+Z while focus is in a worksheet cell is explicitly ignored (line 2471 bails out "let fields handle their own"), and the cells have no undo of their own. Nothing happens, no message; the Undo button's tooltip still reads "Undo that cell edit". | Silent no-op on the most reflexive gesture in a spreadsheet. | Handle it, or blur first. |

### Where the workflow forces you back and forth

Choosing a baseline is in the Fit tab, but peak finding ignores it, so the order the
panel implies does not work. Setting which column is analysed is in the **worksheet**
(a 26×17 px "use" button), while the consequences appear in the **Fit tab** and the
**graph** — three panes, and at ≥1000 px the worksheet is capped at 300 px on the far
left while the Fit panel is on the far right. Integration lives in **Process** but is
driven by the graph zoom in the middle pane. Nothing carries a step or a status, so at
every point you are checking three places to find out what state you are in. §12.2's
stepper with per-step status is precisely the missing piece.

---

## 4. Findings

### Critical

**C1 — A collapsed peak is reported as a real band, and all uncertainties silently vanish.**
Steps: import a spectrum with two overlapping bands; Baseline = Quadratic; Find peaks;
delete the spurious ones; Fit.
Got: table row `3 | 1704.92 | 5.900e11 | 1.000e-12 | 0.627991 | 3.52`, styled identically
to the real rows, with a coloured dot. `fit.errors` is `[0,0,0,…]` for all 15 parameters;
`fmtPM()` (line 810) treats `!e` as "no error available" and prints the bare value, so the
table looks like a tool that never reports errors rather than one whose covariance
collapsed. Area % of the three genuine peaks is wrong because the phantom is included
(peak 4 shows 50.5 % instead of ~52.3 %). The zero-width peak draws as nothing on the
graph, so there is no visual clue either.
Should: mark the row failed, exclude it from Area %, name the parameter that hit its
bound, and print an explicit "error not available" instead of an absent `±`.
Violates §11 principle 5 (a messages log that says exactly why fitting stopped) and
pattern 4 (parameter table carrying error and dependency).
Fix size: one function (`fmtPM` + the peak-table renderer) plus a guard in `peakMetrics`.

**C2 — A peak outside the data fits "successfully" with no warning of any kind.**
Steps: set peak 1's `xc` to 3000 (data spans 1300–1800); Tab out; Fit.
Got: R² = 0.993888, `Result: 4 gaussian peaks…`, row `1 | 3000 | 0.070479 | 25.169 |
1.88825 | **6.07**`. `S.fitError` empty, no bound message, nothing. All errors 0 again.
Should: detect parameters with no leverage (the app already computes `dep`, and displays
it nowhere) and refuse or flag.
Fix size: one function.

**C3 — Pasting comma-decimal numbers silently corrupts them by 10⁵.**
Steps: add a Y column; paste a column of `0,01937`-style values into row 1.
Got: two new columns — one all `0`, one holding `1937`, `2238`, `2242`… No message.
Screenshot evidence captured. The header line was also dropped.
Should: run the same decimal-mark detection the import wizard uses, or warn that the
paste produced more columns than cells targeted.
Fix size: one function (`parseGrid` already calls `analyzeFile`; pass a decimal hint).

**C4 — A second import silently destroys the project's data.**
Steps: import `A.csv`; then import `B.csv` into the same project.
Got: `p.cols` still has exactly two columns; A's data is gone; the project is still
**named** after A; History lists both imports as though both are present. Undo recovers
it, with a good toast, but only if you notice.
Should: ask whether to replace or add as a new Y column (pattern 14).
Fix size: needs design (a small dialog plus a merge path).

**C5 — The reported fit and integration ranges are not the ranges used.**
Fit panel: "Fits 501 unmasked points with 1280 ≤ x ≤ 1820"; `fit.range` = `[1301, 1800]`.
Process panel: "Range 1280 to 1820" while integrating the 501 points from 1300 to 1800.
Both print `fitRange()`, the padded view window, rather than the extent of the points
actually included.
Fix size: one line each.

**C6 — Nothing can be exported when the file is opened from disk.**
`#expSvg` and `#expCsv` are `hidden` when `S.downloads` is falsy, with no explanation and
no fallback. No copy-to-clipboard exists anywhere in the app.
Fix size: one function (`Blob` + `<a download>`); the CSV/SVG builders already exist.

**C7 — The import modal does not trap focus, and the escape lands on a destructive control.**
Steps: open the import wizard; press Tab once from the focused "Import 501 points" button.
Got: focus moves to `#projSel`, then `#projName`, then `#newProj` — all behind the
overlay, none `inert` or `aria-hidden`. Pressing Enter there **created a new project and
switched to it while the import was still pending**; the subsequent import landed in the
new project. Escape closes the modal correctly but drops focus to `<body>` instead of
returning it to the Import CSV control.
Fix size: one function (focus trap + `inert` on `.app` + restore).

### Major

**M1 — No legend, and the Y axis is labelled with one of several plotted columns.**
With four Y columns plotted the SVG's only text is tick labels and two axis titles.
Breaks patterns 1 and 2 and §12.3 item 9. Fix: needs design (small).

**M2 — `PEAK_COLORS` and `COL_TINTS` are 7/8 identical.**
`["#C23B22"|"#1D5FA8", "#2E7D4F", "#7A4FBF", "#B26B00", "#0E7C86", "#B03060", "#4C6EF5",
"#7A6A00"]` — only index 0 differs. Y column 2 and peak 2 are the same green. Colour
therefore cannot tie card ↔ curve ↔ readout (pattern 1). Fix: one line.

**M3 — Results never go stale.**
Delete a peak, add a peak, change the baseline, mask 44 points, or switch the analysed
column: the `Result:` block and the fitted curve stay exactly as they were, with no badge
and no column name. I watched the as-received fit drawn over the 100 °C data. §12.3 item
11 calls for exactly this badge. Fix: one function.

**M4 — "Find peaks" ignores the chosen baseline.** 12 peaks on a 4-band spectrum, widths
up to 304 cm⁻¹. See hurdle 7. Fix: one function.

**M5 — The Fit panel is a 2299 px single column with no structure.**
Measured `#pane-fit.scrollHeight = 2299` with 12 peaks; the Fit button sits at the bottom.
No collapse, no sticky action bar, no parameter table — while the sibling "One curve" view
*does* have a proper `Parameter | Initial value | Fixed | Result` table. Two patterns for
one job in one tab. Fix: needs design.

**M6 — The peak table is not a result table.** No units in any header (Centre should be
cm⁻¹, Height Absorbance, Area Absorbance·cm⁻¹); Height and Area % carry no uncertainty
although Centre, FWHM and Area do; decimals ragged within a column ("1340.39 ± 0.13" next
to "1410.173 ± 0.023", "18" next to "19.6"); peaks are not sorted by centre, so a peak
added by hand appears last (mine: 1340, 1410, 1725, 1689). Fix: one function.

**M7 — The worksheet's frozen header rows overlap the data.**
Steps: have 3+ Y columns (so each header wraps to two lines); scroll the worksheet body.
Got: the control row is 53 px tall but `.ws thead tr:nth-child(2) th{top:31px}` and
`nth-child(3){top:59px}` are hard-coded for a one-line header, and the `F(x)` row has no
sticky `top` at all. Measured tops: 42 / 95 / 124 / 153 against sticky offsets 0 / 31 / 59
/ auto. Result: "Name", "F(x)" and a half-clipped "Units" row stack over row 1.
The row-label column is not horizontally sticky either, so scrolling right hides the X
column and the row numbers. Fix: one function (measure the offsets).

**M8 — Ctrl+Z is a silent no-op in the worksheet.** See hurdle 13. The Undo *button* works
correctly in the same state. Fix: one line.

**M9 — Deleting a column is a single unconfirmed click on a 15×14 px target.**
No dialog, no toast; 501 values gone. Only the Undo button's tooltip changes. Measured
header control sizes: role select 42×20, colour dot 15×14, add-column 16×17, delete 15×14,
"use" 26×17 — all below the 24×24 minimum. Fix: one function (toast with Undo).

**M10 — The History log is not a record.** Not rolled back by undo; omits peak
add/delete, baseline choice, column rename, unit edits; "You analysing PET 200C"; relative
timestamps only; not exportable. Fix: needs design.

**M11 — The graph is entirely mouse-only.** `.canvas-wrap` and its `<svg>` are
`tabindex="-1"`; the SVG is `role="img" aria-label="Data plot"`. Zooming, masking, placing
a peak, selecting a point and anchoring a comment have no keyboard path, and the aria-label
describes nothing. Fix: needs design.

**M12 — Captured metadata is promised and then hidden.** See hurdle 8. Fix: one function.

**M13 — "Reverse X" does not exist** but the import wizard names it (line 1026). No
descending-wavenumber display anywhere. Fix: one function to add the toggle.

### Minor

- **Import wizard is unusable on a short window.** At the 325 px-tall viewport this pane
  gave me, the raw pane shows four lines and the controls two rows, each with its own
  scrollbar; the entire findings list — including the `Average duplicates` fix button —
  is below an inner scroll the user has no reason to suspect.
- **The "Auto" reset next to Delimiter/Decimal looks like static text.** It replaces the
  grey "detected Semicolon" hint with a grey `btn ghost` reading "Auto" at
  `padding:0 6px`, sitting beside the still-static "detected comma". It works; nothing
  says it is clickable.
- **Metadata parser splits on the first `=` only**, so `##XUNITS= 1/cm; YUNITS= ABSORBANCE`
  becomes one field whose value is `1/cm; YUNITS= ABSORBANCE`.
- **A pasted header containing a space is silently discarded.** Verified: `"Absorbance"`
  and `"Abs_100C"` are accepted as column names, `"A 100C"` and
  `"Absorbance 100C (a.u.)"` return `header: null` and the column stays unnamed.
- **Enter does not commit a fit parameter field.** Typing `3000` into `xc` and pressing
  Enter leaves `S.pdraft.init` at the old value while the field shows the new one; Tab or
  a click commits. The worksheet, by contrast, commits on Enter. No indication that a
  typed value is uncommitted.
- **Adding a peak by clicking the graph produces no visible feedback at all** — no marker,
  no label, no toast. The only confirmation is scrolling down to the Fit panel. This is
  the app's one direct-manipulation gesture.
- **Errors appear far from the control that caused them.** Clicking "Find peaks" with no
  data put "Not enough points in view to look for peaks." ~450 px below, next to the Fit
  button. The message is also wrong: there were no points at all, not too few.
- **The empty-state Fit panel is fully furnished.** With no data it offers Find peaks,
  Find hidden peaks, a Baseline card pre-filled `y0 = 1`, `slope = 1`, and the line
  "Fits 0 unmasked points with 0 ≤ x ≤ 10". Only the Fit button is disabled.
- **Two projects can both be called "Untitled analysis"** and are indistinguishable in the
  selector.
- **`Saved in this browser only` is permanently rendered in the error red** (`#C23B22`,
  the same hex as the fit curve and `PEAK_COLORS[0]`) via `class="status warn"`. It is the
  normal state of the app when opened from disk.
- **Focus is dropped to `<body>`** after closing the import modal and after deleting a
  peak — in a 2299 px list that loses the keyboard user's place entirely.
- **`aria-label="Name of column"` and `"Units of column"` are identical for every column**
  (lines 1542–1543); five textboxes with the same name.
- **Grammar:** "You analysing PET 200C"; "Fits 1 unmasked points"; "1 row has no Y value.
  They are skipped".
- **The wizard's range readout contradicts its own finding.** It prints "X 1300 to 1800"
  (ascending) directly above "X decreases down the file".
- **No theme control**, although `:root[data-theme="dark"]` exists and works. §12.2 asks
  for one in the header. Dark mode is reachable only through OS preference.
- **Dark mode:** `#B03060` (2.72:1), `#7A4FBF` (2.92:1) and `#7A6A00` (3.07:1) fall below
  the 3:1 non-text contrast minimum against the dark panel `#161F2B`; all eight clear
  4.2:1 on white. Unchecked checkboxes render as filled grey blocks with no visible
  border, reading as checked-and-disabled.
- **The data-reader tooltip** (`#197 x = 1604 y = 0.08679`) carries no units and cannot be
  pinned.

### Polish

- Undo/redo are bare glyphs `↶ ↷` at 35×31 px; the useful text ("Undo that fit") is in a
  tooltip only.
- "use" is an opaque three-letter button label for "make this the analysed column".
- Baseline parameters are named `y0`, `b1`, `b2` with no meaning column and no statement
  of the `x0` they are referenced to — the polynomial cannot be reconstructed from the
  panel. Origin's parameter table has a Meaning column.
- The "Peaks + baseline" view never shows the peak-shape formula, while "One curve" does
  (and does it well, with proper `<sub>`/`<sup>`).
- `w` means FWHM in the peaks model and the Gaussian σ in the "One curve" Gaussian.
- Long project names truncate without an ellipsis in both the selector and the header.

---

## 5. What is already good — do not break it

- **The import wizard.** Delimiter and decimal mark detected *together* and stated
  ("detected Semicolon", "detected comma"); data-start line and names row identified;
  a findings list with ✓ / · / ! markers that explains the descending X axis, the ignored
  footer, the missing Y value and the duplicate X — with an **inline "Average duplicates"
  fix button**. Pattern 15 done properly, and better than Origin's import.
- **Wrong-input recovery in the wizard.** Setting the delimiter to Comma on purpose turned
  the primary button into a disabled **"Nothing to import"**, reported "0 usable points of
  361 rows", and auto-scrolled the raw pane to the new data-start line. The button label
  carries the state.
- **Undo/redo.** Ctrl+Z / Ctrl+Shift+Z, per-action toasts ("Undid deleting a column.",
  "Undid that cell edit.", "Undid the import."), and both button tooltips naming the next
  action in each direction. Verified across an import, a fit, a cell edit, a column delete
  and a mask. Far beyond Origin. (The one gap is M8.)
- **Error messages when they exist are excellent.** "Need more than 15 points to fit 15
  free parameters (have 1)." and "Every parameter is fixed. Unfix at least one to fit."
- **The mode hint line** under the graph changes per tool ("Click a point, or drag a box,
  to mask points from the fit. Click a masked point again to restore it.") — Fityk's
  pattern 10, and one of the best things in the app.
- **The worksheet's Origin anatomy**: column letter, role, Long Name row, Units row, F(x)
  row, computed columns marked read-only and italic.
- **Number formatting when an error exists.** `fmtPM` sizes the value's decimals from the
  error's magnitude — `1410.173 ± 0.023`, `30.0 ± 1.2`. That is correct scientific
  practice and most tools get it wrong.
- **The residual strip**, on by default, sharing the X axis (pattern 4).
- **"Discuss this fit"** switches tab, focuses the composer and attaches an "On the peak
  fit ×" chip. A genuinely nice bridge from result to conversation.
- **Typography**: serif italic axis titles, `font-variant-numeric: tabular-nums`, proper
  `cm⁻¹` from `1/cm`, real `<sub>`/`<sup>` in the model formulas.
- **Robustness.** `localStorage` throws in this sandbox and the app degrades to an
  in-memory store without a single console error. Zero errors and zero unhandled
  rejections across the entire session.
- **The unreachable `exportCsv()`** is well designed — it already carries labels+units,
  the mask flag, per-peak curves, `centre error`, `area error`, dependency and fit
  statistics.

---

## 6. The five changes that would most improve it

1. **Never present a failed component as a result.** Flag zero-width, out-of-range and
   zero-error parameters explicitly; exclude them from Area %; print "error not available"
   rather than nothing; name the offending peak and parameter in the message. (C1, C2)
2. **Let the numbers and the figure leave.** A `Blob` + `<a download>` fallback for the
   two existing builders, plus copy-as-TSV on the peak table; add the captured metadata
   and the fit range to the export. (C6, hurdles 2 and 8)
3. **Report the range you actually used, everywhere**, and bind the result to the column
   it came from with a stale badge when the model, column, baseline or mask changes.
   (C5, M3)
4. **Give the Fit panel the parameter table that "One curve" already has**, with units,
   dependency, per-row peak type, sorted by centre, and a sticky action bar — and find
   peaks on the baseline-corrected signal. (M4, M5, M6)
5. **Make the multi-spectrum case real**: a legend keyed to the worksheet colour dot, two
   disjoint palettes, a fit stored per column, and a batch-fit + summary table. Add the
   Reverse X toggle the wizard already promises. (M1, M2, M13, hurdles 6 and 10)

---

## 7. What I could not verify, and how the environment constrained this

- **The pane was 558 × 325 CSS px.** Viewport emulation in this preview pane mis-maps
  click coordinates (a click aimed at `#newProj` landed on `<html>`), so **all
  interaction was done at 558 px — the stacked, sub-1000 px layout.** The three-column
  desktop layout was judged from scaled screenshots and from direct DOM measurement
  (`grid-template-columns: 300px 380px 360px` at 1040 px, worksheet capped at 300 px,
  side pane at 360 px). I did not click through the desktop layout.
- **Emulated screenshots only paint the top ~325 CSS px**, so the 380 px and 1400 px
  captures show the top of the page only. The 380 px conclusions (no horizontal page
  overflow, `scrollWidth == innerWidth`, worksheet header ~92 px tall, names truncated to
  "PET as-re") come from measurement plus the painted region.
- **Dark mode** cannot be emulated here ("local documents always render light"), so I set
  the app's own `:root[data-theme="dark"]` hook and screenshotted that. The token values
  are the app's; the contrast figures are computed from the literal hex values.
- **The OS file picker was not exercised.** Files were constructed as real `File` objects
  and dispatched to the app's own `<input type=file>` change handler, so the real
  `importText` path ran, but drag-and-drop onto the page (if any) was not tested.
- **Fit accuracy was not re-verified** (as briefed) beyond noting that all four samples'
  known parameters were recovered within their stated errors.
- **Not tested:** the collaboration features (presence, shared projects, comment
  threading) — unavailable outside the claude.ai runtime; Savitzky–Golay smoothing and
  derivative columns; the fluorescence-decay example; `Log Y`; the split-width
  pseudo-Voigt and Pearson VII shapes; printing.
