# Kurve UI and interaction audit — round 2 (verification)

Audited `kurve.html` (192 KB, 2026-09-22 16:24) by driving it in a browser. Round 1's report
is preserved untouched at `UI_AUDIT_round1.md`. No source was changed.

Unlike round 1, **the desktop three-column layout at ≥1000 px was clicked through for the whole
session** (1400×900, ref- and coordinate-driven clicks, verified against measured
`getBoundingClientRect`). Everything below was done at that width unless stated.

Zero `window.onerror` captures and zero console errors across the entire session, including
every deliberate attempt to break the fitter.

---

## 1. Verdict

The fixes are real, not cosmetic. The thing round 1 called "the single most damaging problem" —
the app handing a scientist a wrong number that looks right — has been properly solved, and
solved better than I asked for: a collapsed peak is now flagged, excluded from Area %, given
`± unknown` instead of a silently absent error, and accompanied by prose that names the peak,
the reason, and the fitted range. The exported report and CSV carry that same exclusion note,
the instrument metadata, the range actually used and a timestamped method log. Eleven of the
twenty Critical/Major findings are fully fixed, six substantially.

It has not merely moved its problems around, but it has grown two new ones of the same family.
**Pasting European decimals with exactly three decimal places still multiplies them by 1000,
silently** — `0,051` becomes `51`. Round 1 caught the `0,01937` shape; the fix handles that one
case and leaves the commonest precision in spectroscopy corrupted. That is now the most damaging
problem in the app, because it is silent, it is in the paste path a spreadsheet user reaches
first, and it propagates into every export.

Second: **`Reverse X` shipped unwired.** The checkbox exists, the renderer supports it, the import
wizard still points at it — and there is no event handler, so ticking it does nothing and the tick
is discarded on the next render. Forced on through state, drag-zoom produces an inverted view range
and the fit panel reports "No unmasked points in view". The feature was built and never run.

---

## 2. Verification of round 1's findings

### Critical

| # | Round-1 finding | Status | Evidence |
|---|---|---|---|
| **C1** | Collapsed peak reported as real; all uncertainties vanish | **FIXED** | Reproduced the exact pathology unprompted (quadratic baseline, Find peaks → 5, Fit): two components collapsed to `w = 1.0e-12`, `height 1.347e13`. Table rows read `2 !` and `3 !`, Area % `excluded`, values `± unknown`. Prose: *"2 components are not a usable peak and have been left out of Area %. Peak 2 (centre −4019.78): it is narrower (1.0e-12) than the spacing between points (2), so no data constrains it; its centre (−4019.78) lies outside the fitted data (1400 to 1800); it is far taller than the data."* Plus *"The covariance matrix is singular, so no uncertainties could be computed"* and *"One or more parameters stopped at a bound"*. Area % of the three real peaks sums to 100. |
| C1 | …survives save/reload? | **FIXED** | `f.errors` is now `null`, not `0` — `null` round-trips through JSON. `JSON.parse(JSON.stringify(project))` reproduced the table byte-identically. Injected `NaN` and `Infinity` params (which JSON collapses to `null`) are still flagged `!`, Area shows `—`, Area % `excluded`, no console error. |
| **C2** | Peak outside the data fits "successfully" | **FIXED** | `xc = 3000` on 1400–1800 data → `1 !`, `excluded`, *"its centre (3000) lies outside the fitted data (1400 to 1800)"*. Still flagged when the parameter is **fixed** at 3000. Pearson VII runaway to `xc = 1.555e6` produced a different, correct reason: *"it is wider than the fitted range, so it is acting as a baseline"*. **Two coincident peaks** (both seeded at 1725.35 over a 32-point window) now produce the dependency message round 1 asked for verbatim: *"peak 1 A is strongly tied to the other parameters (dependency 1). Its own value is less certain than its error suggests — check that these peaks are really separable, and consider fixing a width or removing a peak."* |
| **C3** | European-decimal paste corrupts by 10⁵ | **PARTLY FIXED** | `0,01937` → `0.01937` ✓ (the round-1 repro). `0,05` ✓, `0,0512` ✓, `0,05123` ✓. **`0,051` → `51`**, **`-0,073` → `-73`**, **`12,345` → `12345`** — any European decimal with *exactly three* decimal places is read as a thousands separator and inflated ×1000, silently, no toast. **`1.234,56` → two columns** (`1.234` and `56`). Genuine comma CSV still splits correctly: `1800,0.0534` → 2 columns ✓, `1,2,3` → 3 columns ✓, header row detected ✓, semicolon and tab European files ✓. Verified through the real worksheet paste handler, not just `parseGrid`. |
| **C4** | Second import silently destroys the data | **FIXED** | Second import shows *"This project already holds data"* with three radios; the **safe option is the default**. **Add** ✓ (3 columns, both datasets kept, logged "You added Absorbance from PET_200C.csv"). **Replace** ✓ (back to 2 columns, undoable). **New project** ✓ (created `PET_100C`, switched to it, original untouched). Different-X-axis case is *detected* — toast: *"The new column uses a different X axis. Interpolate it onto this one in Process before comparing."* — but see N4 below: the data is already misaligned by then. Minor: after **Replace**, the project keeps the old file's name. |
| **C5** | Reported ranges are not the ranges used | **FIXED** | Zoomed to view `[501.977, 529.778]`; panel read *"Fits 38 unmasked points, x from 502 to 529.75"* — the actual point extremes. `fit.range` after fitting = `[502, 529.75]`, identical. Process tab: view `[1709.59, 1773.72]` → *"Range integrated 1710 to 1772, Points 32"*. CSV carries `# fitted over x,1710,1772`; the report's Method section says *"Fitted over x = 1710 to 1772"*. |
| **C6** | Nothing can be exported from disk | **FIXED** | `#expSvg`/`#expCsv` are now shown whenever the project has points, regardless of `window.claude`. `saveFile()` falls back to `Blob` + `<a download>`; the anchor fired with `download="Si_Raman_band_532_nm_excitation.csv"`. **"Save report"** is new and good: a self-contained HTML file with the figure inlined as SVG, a Fitted-peaks table, Fit statistics, a **Method** block (instrument metadata, model, fit range, weighting, algorithm, iterations) and a timestamped **What was done** log. **"Copy table"** could not be verified here — the preview serves the page from a `data:` URL, so `navigator.clipboard` is undefined and `execCommand` is refused; the app reports it honestly (*"Couldn't copy — select the table and copy by hand."*). The TSV it builds is right: units in headers, separate error columns, and a **Status** column (`ok` / unusable). |
| **C7** | Import modal does not trap focus | **FIXED** | 14 × Tab from `#impGo` cycles 11 stops and wraps, never leaving the modal; 16 × Shift+Tab wraps backwards, also never leaving. `.app` carries **both** `inert` and `aria-hidden="true"`. Escape closes and returns focus to the exact opener — `#newProj` when opened from there, `#importLbl` when opened from the Import CSV control. |

### Major

| # | Round-1 finding | Status | Evidence |
|---|---|---|---|
| **M1** | No legend | **FIXED** | Legend present, keyed by colour, listing every plotted column plus `fit (sum)` and `peak 1…N`. Seen with 1, 2, 4 and 6 entries. Y axis is still titled with the active column only, which the legend now makes acceptable. Two gaps: duplicate column names give two identical legend entries (both "Absorbance" after an add-import), and the legend is drawn over the data — see N11. |
| **M2** | Peak and column palettes 7/8 identical | **FIXED** | `PEAK_COLORS` is now entirely warm (`#C23B22 #B26B00 #B03060 #8A5A00 #D2691E #9B2D5E #A0522D #C2185B`), `COL_TINTS` entirely cool (`#1D5FA8 #0E7C86 #2E7D4F #4C6EF5 #5B4FBF #00695C #3A6EA5 #1B7A3E`). Zero overlap. But see N7: dark-mode contrast got worse, and each palette now contains near-duplicate pairs (three magentas; three blues). |
| **M3** | Results never go stale | **MOSTLY FIXED** | `fitStale()` covers column change, mask, cleanup steps, baseline, peak count and peak shape, and the result header is bound to its column ("Result: Exponential decay **on Photon counts**"). Verified live: masking a point → *"Points have been masked or restored since this fit. Fit again to bring it up to date."*; switching the analysed column → *"This fit was made on Photon counts, not the current column."* plus a toast. **Three gaps, all verified**: (a) **zooming changes the fit range and raises no badge** — a 201-point fit sat on screen while the panel underneath read "Fits 38 unmasked points"; (b) the mask check compares `mask.length`, i.e. the **count**, so unmasking point 3 and masking point 7 leaves `fitStale()` returning `null` (fit made on `[3,10]`, mask now `[7,10]`, no badge); (c) deleting the Y-error column leaves a weighted fit labelled *"Errors from instrumental weights"* with no badge. |
| **M4** | Find peaks ignores the baseline | **FIXED** | `autoFindPeaks` subtracts the chosen baseline before searching, with a comment saying why. On the same 3-band spectrum that gave round 1 twelve peaks, Quadratic + Find peaks gave **5** (1410, 1458, 1470, 1692, 1724) — three real, two spurious. Logged as "You found 5 peaks (local maximum, threshold 5%)". |
| **M5** | Fit panel is a 2299 px structureless column | **MOSTLY FIXED** | Collapsible `<details>` groups with live summaries ("Setup — quadratic baseline · gaussian · threshold 5%", "Peaks — 5"), a **sticky action bar** pinning "Fit N peaks" / "Reset to estimates" to the bottom, and each peak card showing its fitted result beside the initial value. Still one long scroll (1602 px with a single peak). |
| **M6** | Peak table is not a result table | **MOSTLY FIXED** | Units in headers (`Centre (cm⁻¹)`, `FWHM (cm⁻¹)`); **sorted by centre** with the original peak number preserved (`2 ! / 1 / 3 ! / 4 / 5`); **Height and FWHM now carry ±** (`0.80 ± 0.12`, `21.8 ± 1.8`); decimals sized from the error. Remaining: the **Area unit is wrong** — with a Y column that has no unit the header reads `Area (cm⁻¹)`, the X unit alone, which is dimensionally false; the "One curve" result block still has **no units at all** (`Half-life 1.666 ± 0.021`, `FWHM 5.178 ± 0.073`); split-width shapes get one FWHM column (see N5). |
| **M7** | Frozen header rows overlap the data | **FIXED (vertical)** | Offsets are now measured at runtime in a `requestAnimationFrame` after each render. With **5 columns**: measured row heights 129 / 29 / 29 / 18, applied `style.top` 0 / 128.4 / 157.4 / 186.4 — exact, no overlap, confirmed visually. The **row-label column is still `position: static`**, so it scrolls away horizontally. The header is now 205 px tall with 5 columns (see N14). |
| **M8** | Ctrl+Z is a silent no-op in a worksheet cell | **FIXED** | Focus in cell (3,1), Ctrl+Z → value reverts, toast *"Undid that cell edit."* The handler carries the comment *"A cell has no undo of its own, so the app's undo must still work there."* Focus is dropped afterwards, though. |
| **M9** | Column delete is one unconfirmed click on a 15×14 px target | **FIXED** | Toast: *"Deleted σ and its 60 values. Ctrl+Z puts it back."* Logged as "You deleted column σ", undoable, undo tooltip updates. Header controls are now **24×24** (add-column 28×28). Remaining: all three delete buttons share `aria-label="Delete column"` with no column name. |
| **M10** | History is not a record | **MOSTLY FIXED** | Now records baseline changes ("You set the baseline to quadratic"), peak finding ("You found 5 peaks (local maximum, threshold 5%)"), peak removal ("You removed peak 3"), fits with R² and n, column deletes, and carries the footnote *"This record is rolled back by undo, so it always describes the project as it stands."* — and it **is** rolled back: undoing an import removed its entry. Grammar fixed. The exported report gives the same log with **absolute timestamps**. **Gap**: peak add/remove/find are *logged* but are **not on the undo stack**, so the promise is false around them — after "You removed peak 3", one Ctrl+Z undid the *fit* and left the draft with **zero** peaks while the log still read "You found 5 peaks". See N13. |
| **M11** | The graph is entirely mouse-only | **NOT FIXED** | `#plot` has no `tabindex`, `role="img"`, `aria-label="Data plot"` — unchanged. No keyboard path to zoom, mask, place a peak or select a point. |
| **M12** | Captured metadata promised then hidden | **FIXED** | The Process tab now has a **"From the source file"** panel listing TITLE / INSTRUMENT / SAMPLE / RESOLUTION / XUNITS / YUNITS / DATE, with the line *"These travel with the project and appear in the exported data and report."* — and they do: `# Source file metadata` block in the CSV, Method section in the report. The `;`-splitting bug is fixed too: `##XUNITS= 1/cm; YUNITS= ABSORBANCE` now yields two fields ("7 metadata fields read from 6 header lines"). |
| **M13** | "Reverse X" does not exist | **PARTLY FIXED — the control exists and does nothing** | `grep revX` finds the checkbox (line 326), the render mapping (1427–1430), the inverse mapping (1600) and the state→checkbox sync (2677). There is **no `$("#revX").onchange`**, while `#style`, `#logY`, `#grid` and `#resid` are all wired at lines 1643–1646. Clicking it leaves `P().plot.revX === undefined`, the axis unchanged, and the tick is cleared by the next `renderTop()`. Forced on through state the renderer is correct (axis 1800→1400, curves, peaks, baseline and residual strip all flip), **add-peak lands correctly** (clicked the 1726 position → `xc = 1726`) and **click-to-mask lands correctly** (masked row 37, x = 1726). **Drag-zoom is broken**: one drag produced `view = {x0: 1720.16, x1: 1596.83}` — inverted — and the panel then read *"No unmasked points in view. Zoom out, or unmask some points."* with a single stray axis tick. |

### Round-1 minors, re-checked

Fixed: metadata `;` splitting; the theme toggle now exists in the header (`◐`, persisted);
`Saved in this browser only` is muted grey, not error red (`class="status"`, `rgb(91,103,120)`);
unchecked checkboxes have visible borders in dark mode (with a comment saying why); **Enter now
commits a fit parameter field** (`input[data-pinit]` gets an Enter→blur handler; verified by real
typing — my first attempt failed only because the automation sends "Return", which the page does
not see as Enter); adding a peak by click now toasts *"Peak 1 placed at 1726. Adjust it in the Fit
panel, then fit."* and highlights the new card; the baseline now states its reference
(*"Measured from x = 1600, the centre of the fitted range."*); the empty state and the "Analyse this
column" / "Toggle … on the graph" labels replaced the opaque `use`.

Still present: the wizard prints "X 1400 to 1800" above "X decreases down the file"; "1 row has no
Y value. They are skipped"; focus drops to `<body>` after deleting a peak and after a cell undo;
the data-reader tooltip carries no units; baseline Fixed checkboxes are still three identical
"Hold this value".

---

## 3. New findings

### Critical

**N1 — European decimals with exactly three decimal places are multiplied by 1000 on paste.**
Steps: add a Y column; paste `0,051 / 0,073 / 0,022 / 0,041 / 0,038` into row 1.
Got: `51, 73, 22, 41, 38`. No warning, no toast. Same for negatives (`-0,073` → `-73`) and for
non-zero integer parts (`12,345` → `12345`). `0,05` (2 dp), `0,0512` (4 dp) and `0,01937` (5 dp)
are all correct — the three-digit group is being read as a thousands separator. Three decimal
places is the commonest precision in IR, UV-Vis and chromatography exports.
Also: `1.234,56` becomes **two columns**, `1.234` and `56`.
Should: the heuristic at `parseGrid` (lines 923–933) only rescues the case where the two-column
split yields an all-zero first column. Decide the decimal mark for the block as a whole — if every
value matches `^-?\d+,\d+$` and a `.` never appears, it is a decimal comma — or warn when a paste
into one target column produces more than one column, or when a rescue is ambiguous.
Fix size: one function.

### Major

**N2 — The Savitzky–Golay 1st derivative has the wrong sign on a descending X axis.**
Steps: import any file with X running high→low (the app's own wizard calls this "normal for
infrared and XPS"); Process → Smooth or differentiate → Output "1st derivative" → Add column.
Got: at x = 1760 with y(1762) = 0.063463 and y(1758) = 0.086872, the true `dY/dx` is **−0.00585**;
the column holds **+0.005439**. The derivative is taken with respect to index, scaled by |Δx|
rather than Δx. The 2nd derivative is unaffected (even power). Derivative spectroscopy is used to
locate shoulders by the sign of the slope; on the axis this app explicitly supports, every sign is
inverted.
Fix size: one line.

**N3 — Reverse X ships unwired, and its zoom is broken.** See M13 above. Two defects in one:
the control has no handler, and the one interaction that was never exercised inverts the view
range and empties the graph. Fix size: one line for the handler, one line to normalise
`[min, max]` in the zoom rect.

**N4 — "Add as a new Y column" aligns by row, not by X.**
Steps: import `A.csv` (203 rows after averaging a duplicate and keeping a NaN row); import
`B.csv` (201 rows, same 2 cm⁻¹ grid) and accept the default "Add as a new Y column".
Got: B's 201 values are written into rows 1–201 of a sheet whose X column has 203 entries.
Proof: at row 201 the X column reads 1404 while column C holds 0.413596, which is B's value at
**1400** — a constant 2-row (4 cm⁻¹) offset for the whole spectrum. The graph immediately draws
the second spectrum shifted. A toast does appear — *"The new column uses a different X axis.
Interpolate it onto this one in Process before comparing."* — but it is transient, it names no
remedy that undoes what already happened, and the misaligned curve is already on screen and in
every export.
Should: interpolate on import when the X axes differ (the `interpOnto` machinery already exists),
or refuse to add and offer the interpolation as the action.
Fix size: one function.

**N5 — The exported report drops the dependency warning.**
Steps: fit two near-coincident peaks (dependency 1.000); read the panel; click "Save report".
Got: the app says *"peak 1 A is strongly tied to the other parameters (dependency 1) …"*; the
report contains no `dependency`, no `strongly tied`, no Warnings section. Its Fitted-peaks table
shows `1721.3 ± 8.0 | 0.6 ± 1.4 | 47 %` under `R² = 0.9999735` with no caveat. The report *does*
carry the unusable-component exclusion note and the singular-covariance note, so this is a gap,
not an absence — but the report is the artefact that leaves the building.
Also missing from the report: the "stopped at a bound" note and the "not converged" flag.
Fix size: one function (a Warnings section fed from the same strings the panel uses).

**N6 — The Add-peak mode shows the Comment hint.**
Steps: click "Add peak" in the graph toolbar.
Got: the hint line reads *"Click a point or any spot on the graph to start a comment anchored
there."* Line 1652 is a two-branch ternary — zoom, mask, and *everything else* gets the comment
text. The app's one direct-manipulation gesture is the one with no instruction, and round 1
singled this hint line out as one of the best things in the app.
Fix size: one line.

**N7 — The new palettes are worse in dark mode.** Round 1: three of eight below 3:1.
Now, against `--panel` `#161F2B`: `PEAK_COLORS` — `#9B2D5E` 2.32, `#B03060` 2.72, `#8A5A00` 2.80,
`#C2185B` 2.83, `#A0522D` 2.96 (**5 of 8** below 3:1); `COL_TINTS` — `#00695C` 2.51, `#1D5FA8` 2.57,
`#5B4FBF` 2.62 (**3 of 8**). That is **8 of 16 data colours below the 3:1 non-text minimum**. All 16
clear 3.6:1 on white. The palettes were made disjoint without being re-checked against the dark
token set. Within each palette there are also near-duplicate pairs (`#B03060`/`#9B2D5E`/`#C2185B`;
`#1D5FA8`/`#3A6EA5`; `#2E7D4F`/`#1B7A3E`), so peaks 3, 6 and 8 are hard to tell apart even in light
mode. Fix size: one line, plus a contrast check.

**N8 — The stale check on masking compares counts, not points.** See M3(b). Fit made over
mask `[3, 10]`; unmask 3, mask 7; mask is now `[7, 10]`, `fitStale()` returns `null`, no badge.
Unmask-one-mask-another is the normal mask edit. Fix: hash the mask, not its length. One line.

**N9 — Zooming silently invalidates the displayed fit.** See M3(a). Verified: a fit over 201
points stayed on screen, unbadged, while the panel directly above it read *"Fits 38 unmasked
points, x from 502 to 529.75"*. The fit range is the one fit property driven by an
unrelated gesture, so it is the one that most needs the badge. Fix size: one line
(`fitStale` already has `f.range`).

### Minor

- **N10 — Computed columns are shown as raw doubles.** The SG columns put
  `-0.0002427999999999996` and `0.000030758658008658173` into 47–65 px cells; the imported column
  beside them is formatted to 6 significant figures. A small-magnitude derivative column reads as
  a stack of `0.000`. The formatter is simply not applied to computed columns.
- **N11 — The legend is drawn over the data.** With 6 entries at 380 px it covers the entire
  1725 cm⁻¹ band; at 1400 px with 7 entries it covers the top-right quadrant. It is not movable,
  collapsible or auto-placed.
- **N12 — Flagged peaks are flagged only in the result table.** The Peaks cards above show peak 2
  (`xc = -4019.78`, `w = 1.0000e-12`) with the same styling and coloured dot as the real ones. The
  `!` and the prose live several hundred pixels further down.
- **N13 — "Clear" discards the peak set unconfirmed, unlogged and un-undoable.** One click removed
  five peaks; the History log gained no entry; the undo tooltip still read "Undo that fit", and
  Ctrl+Z undid the fit and left zero peaks. Peak add/remove/find are logged but off the undo stack,
  so the log's own promise ("always describes the project as it stands") is false around them — in
  both directions: after a redo the log read "You removed peak 3" with all five peaks present.
- **N14 — The worksheet header eats the pane.** With 5 columns the frozen header is **205 px**
  (control row alone 129 px). At 380 px that is ~42 % of the worksheet; at desktop width the
  worksheet is capped at ~275 px so name fields are 47 px and all four Y columns read "Absor…".
- **N15 — "Data saved." is claimed, not confirmed.** `saveFile` returns `true` as soon as
  `a.click()` does not throw. In a sandboxed or opaque-origin context Chrome blocks the download
  silently and the app still toasts success. (In this preview the page is a `data:` URL, so I could
  not confirm the file reached disk either way; from `file://` it should work.)
- **N16 — A non-converged fit still prints a full result.** `Iterations 400 (not converged)` and
  `Iterations 0` both sit as an ordinary stats row under R² = 0.996 with no badge.
- **N17 — After "Replace everything in this project" the project keeps the old file's name.**
  `PET_asrec` held nothing but `PET_150C.csv` data.
- **N18 — Peak shape and fit view leak between projects.** Opening the fluorescence example
  landed in "Peaks + baseline" with "Pearson VII" selected, carried over from the previous
  spectrum, for an exponential decay.
- **N19 — "Reset to estimates" does not re-seed after a shape change.** Changing an existing
  peak to Pearson VII and pressing it left the old seed; the subsequent fit ran away to
  `xc = 1.555e6`. Seeded by "Find peaks" instead, Pearson VII converges cleanly
  (`1725.41 ± 0.20`, FWHM `21.8 ± 1.8`).

### Items round 1 could not test — now covered

- **Savitzky–Golay** — smoothing and both derivatives produce recipe-bearing columns that
  recompute; UI states "Needs evenly spaced X". Sign bug in the 1st derivative (N2).
- **Log Y** — works well. The fluorescence decay renders as a straight line, decade ticks
  `10²`/`10³`, error bars scaled correctly, no `y ≤ 0` crashes.
- **Fluorescence-decay example** — loads, and `Exponential decay` fits it correctly
  (reduced χ² 0.9645, R² 0.9988, τ = 2.404 ± 0.030 ns, half-life 1.666 ± 0.021 against a true
  τ of 2.35). The half-life carries no unit (M6).
- **Split-width pseudo-Voigt** — fits, but collapses `wG` to 1e-12 readily; the table shows a
  single `FWHM` column so the collapsed width is invisible, and the diagnostic says only "it is
  far taller than the data" without naming the zero width (N5-adjacent, see M6).
- **Pearson VII** — works when seeded by Find peaks (N19).
- **Desktop three-column layout** — clicked through for the whole session; no layout defects
  found beyond the worksheet's 275 px cap (N14).

### Still not verifiable in this environment

Printing; drag-and-drop of a file onto the page; the collaboration features; whether the
object-URL download and `Copy table` actually reach disk/clipboard from `file://` (this preview
serves the page from a `data:` URL, so it is neither a secure context nor download-permitted).
Screenshots below the top ~820 px of an emulated viewport still do not paint, so the 380 px
worksheet was measured from the DOM rather than seen.

---

## 4. Rubric, re-scored

| Area | R1 | R2 | Why it moved |
|---|:--:|:--:|---|
| Orientation | 3 | **4** | Stale badges, results bound to their column, toasts that name the action, the metadata panel, and an import dialog that asks instead of assuming. Still no stepper; mode and peak shape leak between projects. |
| Information hierarchy | 2 | **3** | Collapsible groups with live summaries, a sticky action bar, flagged rows, a Status column in the copy text. Still one long scroll, and the peak cards do not carry the flag the table does. |
| Feedback | 2 | **4** | Nearly every action now confirms itself, and the fit tells you when it is out of date, when a parameter is tied, when it hit a bound and when it did not converge. Held back only by the mask-count and fit-range staleness gaps. |
| Error and empty states | 3 | **4** | The unusable-component prose names the peak, the reason and the numbers. The clipboard failure is reported honestly rather than silently. |
| Direct manipulation | 2 | **2** | Unchanged. Click-to-place is still the only gesture — now with a toast, which is not the same thing. No dragging of centre, height or width; no draggable fit range; the one new axis gesture (Reverse X) is unwired and its zoom is broken. |
| Readability | 3 | **3** | Units and error-sized decimals in the peak table are a real gain; computed columns dumping 20-digit doubles into 47 px cells, four columns reading "Absor…", and a legend over the data cancel it out. |
| Consistency | 2 | **3** | The peak table now matches the ambition of the "One curve" table. But One curve still has no units, split shapes show one FWHM, baseline checkboxes are still three identical "Hold this value", and Add peak shows the Comment hint. |
| Keyboard and accessibility | 2 | **3** | Real focus trap with `inert` and focus restoration; Ctrl+Z in cells; Enter commits; 24×24 targets; per-parameter checkbox labels. The graph is still entirely mouse-only and focus is still dropped to `<body>` after a peak delete. |
| Responsive | 3 | **3** | No overflow at 380 px and the stack order still reads well, but a 205 px frozen header and a legend covering the tallest band are new costs of the fixes. |
| Dark mode | 3 | **2** | **Regressed.** A theme toggle and visible checkbox borders are wins, but 8 of the 16 data colours now fall below 3:1 on the dark panel, up from 3 of 8. |
| Domain fit | 2 | **3** | Legend, units in the peak table, captured metadata, a printable method statement, the fit range stated everywhere, Log Y and SG derivatives all working. Held down by Reverse X not working at all — the spectroscopist's first objection, now promised twice — a sign-inverted derivative on the descending axis, and an Area column labelled cm⁻¹. |

**Has it improved?** Yes, substantially and in the right place. The integrity layer — flagging,
uncertainty reporting, provenance, export — went from the app's worst feature to its best, and
round 1's Critical list is genuinely retired rather than relabelled. The regressions are narrower
and of two kinds: fixes applied to the exact reported case rather than the class it belonged to
(C3), and features written but never run (M13, N2, N6). Nothing was shuffled; some things were
finished carelessly.

---

## 5. The five changes that would most improve it now

1. **Fix the European paste properly, as a class.** Decide the decimal mark for the whole pasted
   block, not per value; three decimal places is not a thousands group when no `.` appears
   anywhere. Warn when a paste into one target column yields more than one, and when the rescue
   was ambiguous. (N1 — silent 1000× data corruption is worse than anything left on this list.)
2. **Run `Reverse X` once.** Add the missing `onchange`, and normalise the zoom rectangle to
   `[min, max]` so the first drag does not empty the graph. While there, fix the SG 1st-derivative
   sign on a descending axis and give Add-peak its own hint line. (M13, N2, N3, N6 — four one-line
   fixes that together decide whether a spectroscopist keeps using the app.)
3. **Close the last three staleness holes.** Hash the mask instead of counting it; treat a change
   of fit range as staleness; treat deleting the Y-error column as staleness. The badge is the
   app's best new idea and these are the cases a working analyst hits hourly. (N8, N9, M3)
4. **Make the deliverable carry every caveat the screen does.** The report already carries the
   exclusion note; add dependency, at-bound and non-convergence, and mark the flagged rows in the
   report table the way the panel marks them. Then fix the Area unit so it is blank rather than
   the X unit when Y has none, and put units on the "One curve" results. (N5, M6)
5. **Interpolate on import, and re-check the palettes in the dark.** Adding a column with a
   different X axis should interpolate, not paste by row; and the two new disjoint palettes need a
   dark-mode pass — half of them currently fail 3:1 against `--panel`. (N4, N7)
