# Kurve UI and interaction audit — round 3 (verification of round 2's fixes)

Audited `kurve.html` (207,669 bytes, 2026-09-22 18:55) by driving it in the browser pane and
by reading the relevant source. Rounds 1 and 2 are preserved untouched at
`UI_AUDIT_round1.md` and `UI_AUDIT.md`. No source was changed.

**Environment note, stated up front because it shaped the method:** in this preview pane,
`mcp__Claude_Browser__computer left_click` did not reliably reach the app's real event
handlers even when the reported coordinates matched the target element's `getBoundingClientRect()`
exactly (verified: `setMode` stayed `"zoom"` after a ref-click on the Mask button; a click on
"Example: Raman peak" at its own measured centre did nothing). Calling `element.click()` or
dispatching real `PointerEvent`/`KeyboardEvent`/`ClipboardEvent` objects via `javascript_exec`
on the same elements worked every time and exercises the same onclick/addEventListener code a
real click would. I used that path for interaction, and `computer screenshot` / `read_page` /
`get_page_text` (which do work) for visual and structural judgement — so every finding below
is about what the app actually did in response to a dispatched, handler-reaching event, not
about internals called in isolation. Also confirmed: `navigate()` back to the same `file://` URL
does **not** reset app state in this pane (a `window.__marker` set before a navigate survived
it), consistent with the "preview serves a snapshot" warning — clean-slate resets were done by
clearing `S.store.data` / `S.pid` / `S.proj` in place rather than by re-navigating.

---

## 1. Verdict

Round 2's integrity layer holds up under a much harder pass: every Critical/Major fix I tried
to break — decimal parsing as a class (not just the reported case), the derivative sign, Reverse
X's axis and both zoom gestures, four shapes of add-import alignment, the report's warning set,
dark-mode contrast, and all three staleness gaps — is genuinely fixed, most of them verified live
with dispatched events and screenshots, not just read from source. Round 2's own regressions
(the ×1000 paste bug, the unwired checkbox) are retired, not relabelled.

This round's new work (keyboard graph access, undo coverage for peak operations, per-card
flags, name-adoption logic, project-switch resets, units) is also real and mostly complete.

But three problems of exactly the family round 1 opened with — **the app telling you something
happened that didn't** — reappeared in narrower corners: (1) switching projects leaves the
graph's hover tooltip on screen showing the **previous** project's point, units and value until
the mouse next moves; (2) adding a column whose X axis has **zero overlap** with the project's
own falls back to pasting by row index (the exact silent-misalignment bug round 1 called C4),
while the toast says outright *"it has been interpolated onto this project's [axis]"* — the
opposite of what the log, two lines away, correctly records; (3) a near-noiseless fit's
uncertainty can land near machine epsilon, and the result table then prints values like
`5.000000000000000000000000 ± 0.000000000000000000000029` — harmless to the number, but it
reads exactly like a broken app. None of these corrupts data the way round 1's C1–C4 did, but
all three are the same species of bug: a message the user has no reason to distrust, that is
wrong.

---

## 2. Scores, all three rounds

| Area | R1 | R2 | R3 | Why it moved this round |
|---|:--:|:--:|:--:|---|
| Orientation | 3 | 4 | **4** | Stale badges, project-switch resets, an import dialog that asks. Held back by the project-name field going stale when it has focus during a switch, and the misleading "interpolated" toast. |
| Information hierarchy | 2 | 3 | **4** | Peak cards now carry the same flag as the table; sticky action bar and collapsible groups hold up under a 9-peak fit. |
| Feedback | 2 | 4 | **4** | Not higher: two new "confirms the wrong thing" bugs (stale tooltip, false interpolation toast) are exactly what this score rewards the app for avoiding elsewhere. |
| Error and empty states | 3 | 4 | **4** | Report now carries every warning the panel does, verified live (dependency, excluded component, singular covariance). Held at 4, not 5, by the unbounded-decimal formatting failure on near-zero errors. |
| Direct manipulation | 2 | 2 | **3** | The graph is now genuinely keyboard-operable — arrow-key point selection, m/p/[/]/+/-/0, all announced — a real gesture surface, not just click-to-place. Still no dragging of centre/height/width. |
| Readability | 3 | 3 | **4** | Units, error-sized decimals, computed-column rounding with full value in the title, both widths of a split pseudo-Voigt. Held down by `fmtPM` producing 24-decimal strings on tiny errors. |
| Consistency | 2 | 3 | **4** | Delete buttons name their column, baseline Fixed checkboxes are distinct, download wording is honest about what happened, grammar fixed both singular and plural. |
| Keyboard and accessibility | 2 | 3 | **4** | Full keyboard graph access with a live region, confirmed correctly scoped (does not hijack `m` in a text field); Ctrl+Z in a worksheet cell confirmed working end-to-end via a real dispatched keydown. |
| Responsive | 3 | 3 | **4** | 380 px confirmed free of horizontal overflow (`scrollWidth===innerWidth`), legend auto-placement holds up there too. No new regressions found. |
| Dark mode | 3 | 2 | **5** | Full recovery: separate light/dark data palettes: all 16 dark-mode colours now measure 5.97–9.24:1 against the dark panel (was 8 of 16 below 3:1 last round). Exports confirmed via the real call sites to always use the light `EXPORT_PAL` regardless of the current theme. |
| Domain fit | 2 | 3 | **4** | Reverse X actually flips the axis and both zoom gestures now respect it; derivative sign confirmed correct on a descending axis; units throughout. Held back by the false "interpolated" toast on disjoint-axis imports, and the still-one-fit-per-project ceiling (documented, unchanged). |

**Would I trust it with real data now?** For the core single-spectrum workflow — import,
worksheet, peak fit, export — yes. The thing round 1 called the single most damaging problem
(a wrong number presented as a right one) is durably fixed, including through the exported
report and CSV. What I would still not trust without double-checking: **the "add as a new Y
column" path whenever two files might not share a common X range** — the toast will tell you
it interpolated even when it didn't, and you have to read the History log to know which
happened. I would also not trust a result table with more than ~8 significant digits of
uncertainty at face value; check whether the fit is a synthetic/near-noiseless case before
reading meaning into it. Everything else surfaced in this round is cosmetic or narrow-edge-case.

---

## 3. Part A — round 2's findings, re-verified as a class

**N1/C3 European decimals — FIXED, and fixed as a class.** `toNumber(s, ",")` now strips
thousands dots before the last group of 3 and swaps the decimal comma in one step; `detectFormat`
decides delimiter and decimal mark for the whole sample together, and a value that *cannot* be a
thousands group (`0,051`, `-0,073`) settles the question for the file. Verified directly:

| Input | Via `toNumber(s,",")` | Via `parseGrid` (auto-detect) |
|---|---|---|
| `0,051` | 0.051 | 0.051 |
| `-0,073` | -0.073 | -0.073 |
| `0,5` | 0.5 | 0.5 |
| `1.234,56` | 1234.56 | 1234.56 |
| `0,0001` | 0.0001 | 0.0001 |
| `1,5` | 1.5 | 1.5 |
| `12,345` | 12.345 | **12345** (single ambiguous value, no `.` anywhere — correctly documented as read point-decimal-first, i.e. comma-as-thousands) |
| `1.234.567,89` | 1234567.89 | 1234567.89 |

Also re-confirmed not broken: ordinary comma CSV (`1800,0.0534` → 2 columns), a header row
(`x,y`), and a full semicolon/comma-decimal file with a 6-line instrument preamble, embedded
`NaN`, duplicate row and 2-line footer (built and run through the real wizard, see below).

Critically, this was verified through the **real worksheet paste handler**, not just the pure
function: a synthetic `ClipboardEvent` with `0,051\n0,073\n0,022\n0,041\n0,038\n-0,073\n1,5\n0,0001`
pasted into a Y cell produced the column `[0.051, 0.073, 0.022, 0.041, 0.038, -0.073, 1.5, 0.0001]`
— no ×1000 corruption anywhere, and a plain `1800,0.0534` block pasted into an X cell still
split into two ordinary columns correctly.

**Import wizard, full messy-file run.** Built a file with a 6-line `##KEY= value` preamble
(one line using `;` to pack two keys, `##XUNITS= 1/cm; YUNITS= ABSORBANCE`), semicolon
delimiters, comma decimals, a descending X axis, a duplicate row, an embedded `NaN`, and a
2-line footer. The wizard: detected Semicolon + comma decimal correctly; the raw pane showed
all 16 lines; findings list read *"5 metadata fields read from 5 header lines… 2 lines after
the data ignored… X is not sorted… 1 duplicate X value… Point spacing is uneven… 1 row has no
Y value. It is skipped…"* (correct singular grammar, fixed from round 1/2). Deliberately set
Delimiter to **Comma** (wrong on purpose): button became disabled **"Nothing to import"**,
finding read **"0 usable points of 4 rows"** — clean, specific recovery, matching round 2.
Clicking **Auto** restored Semicolon/comma-decimal exactly. Clicking **Average duplicates**
correctly toggled to "Will apply" and the import completed with `dedupeX` recorded as a
row-level step (not a silent data mutation) and every value correct: `[0.051, 0.073, 0.022,
0.022, null, 0.041, 0.038, 0.9]`.

One caveat worth naming precisely, not a regression: `isMonotonic`'s 97%-of-steps threshold
flagged this file's genuinely-descending X ("X is not sorted") instead of the correct
"X decreases down the file" note, because one tied duplicate row among only 7 comparisons pushed
the down-fraction to 6/7 = 85.7%. On a real-sized file this never bites (see Findings, Minor).

**N2 derivative sign — FIXED.** Built X descending 1800→1760 (41 points), Y = 100 − 0.5·X
(exact constant slope). Added a real Savitzky–Golay 1st-derivative column via the Process tab's
own code path (`col.formula={op:"sg",…}` + `recomputeFormulas()`). Result: **−0.5** throughout
(sample: `[-0.5, -0.5, -0.49999999999994, -0.5, ...]`), not +0.5. `medianStep` is now correctly
signed by the down/up step-count comparison.

**N3/M13 Reverse X — FIXED, wiring and both zoom gestures.** `#revX` has a real `onchange`
that persists `plot.revX` and re-renders. Confirmed visually: with `revX=true` on 1760–1800 data,
tick `1800` sits at SVG `x=96.7` (left) and `1760` at `x=664` (right) — high-to-low, left-to-right,
correct. **Drag-zoom**, dispatched as real `pointerdown`/`pointermove`/`pointerup` on the SVG
while reversed, produced `view={x0:1775.03, x1:1796.17,…}` — correctly ordered low→high
regardless of drag direction. **Wheel-zoom**, dispatched as a real `WheelEvent`, also produced a
correctly-ordered `[x0,x1]`. Neither gesture inverts or empties the graph.

**N4 add-import interpolation — FIXED for four of five cases, one gap found (see Findings).**
Built a 101-point base project (X 1000–1100, step 1) and imported, one at a time, with the
default "Add" mode:
- **Same axis** (identical X): added directly, no interpolation note, correct values.
- **Offset axis** (X shifted +0.5): *"interpolated onto this project's X axis; 100 of 101 points
  overlap"*, values correctly resampled (constant-2 test column reads `[null,2,2,2,2,2,…]`).
- **Different step** (step 2 over the same range): *"…101 of 101 points overlap"*, correct.
- **Partial overlap** (X 1050–1150): *"…51 of 101 points overlap"*, leading/trailing rows
  correctly `null` rather than extrapolated, matching values only where X actually overlaps.
- **No overlap** (X 2000–2050): see Finding 2 below — this one is not clean.

**N5 report warnings — FIXED, verified live end-to-end.** Fit two deliberately near-coincident
Gaussians (same seed centre): live panel read *"Highest parameter dependency 0.9548 (peak 2 A).
Above about 0.99 the parameters stop being independently determined."* Captured the actual
`saveFile()` call (monkey-patched to intercept, not simulated) from `exportReport()`: the saved
HTML contained the same sentence verbatim. Then added a third peak seeded outside the data with
a sub-spacing width: live panel and the captured report **both** carried *"1 component was
excluded as unusable: peak 3 (it is narrower (0.5) than the spacing between points (0.75)…"*
and *"The covariance matrix is singular, so no uncertainties could be computed for this fit."*
At-bound and non-converged report lines were confirmed present in source (`FM_slots`-driven,
same code shape as the two lines just verified live) but I did not manage to force a genuine
non-convergent fit inside the time available — stated as unverified-live rather than assumed.

**N6 Add-peak hint — FIXED.** `setMode('peak')` now sets `#hint` to *"Click where you see a
peak to place one there. It appears in the Fit panel, ready to fit."* — not the Comment text.

**N7 dark-mode contrast — FIXED, thoroughly.** The single shared palette from round 2 is now
two: `PEAK_COLORS_LIGHT`/`PEAK_COLORS_DARK` and `COL_TINTS_LIGHT`/`COL_TINTS_DARK`, selected by
`darkMode()`. Computed WCAG contrast of all 16 dark-mode colours against `--panel` (`#161F2B`):
lowest is `#F0785C` at **5.97:1**, highest `#7FD39B` at **9.24:1** — every one clears the 3:1
non-text minimum and the stricter 4.5:1 text minimum. Verified the **export path specifically**
(not just the on-screen theme) calls `buildPlot(…, EXPORT_PAL, true)` at both real export call
sites (report figure, SVG/data export); with the UI in dark mode, `EXPORT_PAL.bg` (`#FFFFFF`)
was confirmed as the first fill in the generated SVG. A 9-peak dark-mode fit was also visually
screenshotted: legible, no colour collisions apparent.

**N8/N9/M3 staleness — ALL FIXED, verified live via `fitStale()` and the rendered panel.**
- **N8 (mask hash, not count):** fit made with mask `[3,10]`; unmasked 3, masked 7 (mask now
  `[7,10]`, same length): `fitStale()` returned *"Points have been masked or restored since this
  fit."* — the exact case round 2 said slipped through a length-only check.
- **N9 (fit-range change):** fit made over the full range; zoomed to `[5,40]` via `S.view`:
  `fitStale()` returned *"This fit covered x 0 to 49; the view now selects 5 to 40."*
- **M3 gap-c (Y-error column deleted):** fit made weighted by a real error column; deleted that
  column: `fitStale()` returned *"The Y-error column this fit was weighted by is gone."*, and
  the string appeared in the rendered `#pane-fit` text, not just the function's return value.

---

## 4. Part B — this round's claimed fixes, verified

**M11 keyboard graph — FULLY VERIFIED, real dispatched `KeyboardEvent`s.** Focusing `#plot`
sets the hint to the full key list. Tested every key individually against real point/view state,
not just the announcement:
- `→`/`←` move `S.sel` and announce *"Point N of M. x … y …"* (with units).
- `Home`/`End` jump to first/last point.
- `+`/`-` zoom in/out around the current view centre (verified `S.view` narrows/widens).
- `0` clears the view and announces *"Showing all the data."*
- `m` toggles mask on the selected point and re-announces with *", masked"*.
- `p` calls `addPeakAt`, switches to the Fit tab, and a peak actually appears in `S.pdraft`.
- `[`/`]` set a view edge at the selected point, correctly ordered, with a message naming the
  new range; refuses (*"That edge would leave nothing in view."*) if it would invert.
- Confirmed **scoped correctly**: dispatching the same `m` keydown at the project-name text field
  changed nothing (`P().mask` unchanged, `S.mode` unchanged) — the listener lives on the SVG,
  not `document`, so it does not hijack typing elsewhere.

**N10 computed-column formatting — FIXED.** A Savitzky–Golay derivative column's cells show
`-0.25`, `-0.4`, `-0.5` (rounded), each with `title="Computed column. Full value -0.4999999…"` —
confirmed on real rendered `<input>` elements, not just the formatter in isolation.

**N11 legend — duplicate naming FIXED.** Two Y columns both named "Absorbance": legend text
reads `Absorbance`, `Absorbance (2)`.

**N12 flagged peak card — FIXED.** Reproduced the round-1/2 collapsed-peak pathology (tiny
fixed width, seeded far outside the data): the peak's own card in the Setup panel carries
class `pcard sel badrow` and its header reads **"Peak 2 !"**, matching the table's `!` — not
only visible several hundred pixels down in the result table as round 2 left it.

**N13 undo coverage for peak operations — FULLY FIXED, each verified individually with a real
`undo()` round-trip:**
- **Find peaks:** pushes `"finding those peaks"`; undo removes the found peak(s).
- **Clear:** (button click) pushes and undoes correctly — peak count 2→0→2 across click/undo.
- **Delete peak** (via its `✕` button): 2→1→2 across click/undo.
- **Shape change:** `gauss`→`lorentz`→`gauss` across change/undo.
- **Baseline change:** `linear`→`quad`→`linear` across change/undo.
- **Reset to estimates:** init vector fully round-trips through click/undo.
All six also correctly roll the History log back (log entries for undone actions do not remain).

**N16 non-convergence — not independently reproduced live.** Verified by source only: both the
"One curve" and "Peaks + baseline" statistics blocks render `${st.iter}${st.converged?"":" (not
converged)"}` from the same `stats.converged` flag returned by `lmFit`; I attempted several
pathological fits (noisy non-smooth data, tight bounds, 8 overlapping peaks) and all converged
within a handful of iterations, so I could not force the true non-converged path inside the time
available. Flagging as unverified-live rather than claiming confirmation.

**N17 Replace-name adoption — FIXED, both branches verified.** Imported `sample1.csv` → project
named "sample1" (`srcName="sample1"`). Renamed to "My Custom Name". Replaced with `sample2.csv`
→ name **stayed** "My Custom Name" (user's own name preserved). Separately: imported
`sample3.csv` → "sample3", replaced *without* renaming, with `sample4.csv` → name **became**
"sample4" (auto-derived name correctly tracks the latest file).

**N18 project-switch reset — FIXED.** Set `S.fitMode="peaks"`, `S.peakType="pearson7"` in
project A; created project B: `S.fitMode` reset to `"curve"`, `S.peakType` to `"gauss"`,
`S.pdraft` to `null`.

**N19 Reset to estimates re-measures a runaway peak — mostly confirmed.** A hand-placed peak
that had run away to `A=-190` (negative area), `w=1e-12` (collapsed) was, after "Reset to
estimates", reseeded to `A=1233.7`, `w=37.5` — a wide, plausible estimate over the visible
range, not left collapsed and not re-diverging. Did not verify the specific "goes to the
largest unexplained feature" phrasing against a constructed multi-feature case.

**M6 units — FIXED, plus one new formatting problem (see Findings).** One-curve parameter table
now reads `y0 (counts)`, `A (counts)`, `τ (ns)`; the derived row reads `Half-life (ns) 1.62882 ±
0.00031`. With a unitless Y column, the peak-table **Area** header correctly prints bare `Area`
(no unit) rather than the dimensionally-false X-only unit round 2 flagged. Split-width
pseudo-Voigt's FWHM cell now reads `10.989 (wG 8.64, wL 4.1)` with the same detail in its
`title` — both halves genuinely visible, not collapsed to one number.

**M7 sticky row-label column — FIXED.** Computed style of the worksheet's row-index cells:
`position: sticky; left: 0px; z-index: 3` — confirmed on real rendered `<td>` elements after a
render with 3 Y columns.

**M9 delete-button naming — FIXED.** With three columns present, the delete buttons read
`aria-label="Delete column A"`, `"Delete column B"`, `"Delete column Sigma"` and
`title="Delete Sigma"` etc. — each names its own column, not a shared generic label.

**Minors — re-checked:**
- "1 row has no Y value. **It is** skipped…" (singular) and "4 rows have no Y value. **They
  are** skipped…" (plural) both correct, confirmed live in the same wizard session.
- Baseline Fixed checkboxes: `aria-label="Fix baseline y0"` / `"b1"` / `"b2"`, `title="Hold y0
  at its initial value"` etc. — distinct per parameter, not three identical "Hold this value".
- Download wording is now honest about which thing happened: the claude.ai dialog path toasts
  *"Data saved."*; the browser-fallback path (used here) toasts *"Sent
  {filename} to your downloads."* — a claim about intent, not a guarantee of receipt.
- Data-reader tooltip carries units: `"#3   x = 3 s   y = 30 V"`.
- Focus-after-delete-peak: confirmed **in source** (`const nx=$("#pane-fit").querySelector(
  "[data-delpeak]")||$("#clrPeaks")||$("#doPeakFit"); if(nx) nx.focus();`) but not independently
  click-tested end-to-end, given the `computer` click-tool limitation noted above.
- Wizard caption/finding order: unchanged from round 2's already-fixed state (metadata → footer
  → sortedness → duplicates → spacing → gaps), matches file order.

---

## 5. Part C — regressions found

### Major

**F1 — The hover tooltip does not clear on project switch, and shows the previous project's
data.** Steps: hover a point in project A (units `s`/`V`) so `#tip` shows e.g. `"#3 x = 3 s
y = 30 V"`; switch to project B (different data, units `Hz`/`mA`) via the project `<select>`
**or** via "New project" — either way, without moving the mouse again. Got: `#tip` stays
`display:block` with the exact same stale text from project A, now floating over project B's
completely different graph. Screenshotted twice (once via the dropdown, once via "New project"):
in both, a black tooltip reading wrong units and wrong values sits in the middle of an unrelated
plot. Should: `openProject()` (or `renderPlot()`) should hide `#tip` on a project change, the
same way it already resets `S.view`, `S.sel` and `S.pdraft`. Violates the same "don't tell the
user something that isn't true" principle round 1's C1/C2 were built to fix, just relocated to
the tooltip. Fix size: one line (`document.getElementById('tip').style.display='none'` in
`openProject`).

**F2 — Zero-overlap "add as a new Y column" still silently misaligns by row, and the toast
falsely claims it interpolated.** Steps: base project X=1000–1100 (101 pts); import a second
file with X=2000–2050 (51 pts, no overlap at all), accept the default "Add" mode. Got: the new
column's values are pasted by raw row index against the base project's own X (so row 0, X=1000,
receives the new file's row-0 value, which was really measured at X=2000) — `nonNullCount: 51`
of 101, first 51 cells filled positionally, not by X. The **History log correctly and honestly**
records *"added no_overlap from no_overlap.csv (its X range does not overlap this project's, so
it was added unaligned)"* — but the **toast**, generated from the same `note` variable via one
shared message, says *"no_overlap was on a different X axis, so it has been **interpolated**
onto this project's."* This is the exact opposite of what happened, shown to the user in the
more prominent, harder-to-miss channel. Should: use a distinct toast for the zero-overlap
fallback (e.g. *"…its X range didn't overlap, so it was added lined up by row, not by X — check
before using it."*), or refuse the add and require the user to pick a remedy, per round 1's C4
recommendation which this exact path re-opens. Fix size: one line (split the ternary that
currently reuses `note` for both the toast and the log into two distinct messages).

**F3 — `fmtPM` has no cap on decimal places, and prints ~24-digit garbage when a fit's error
is near machine epsilon.** Steps: fit a Gaussian ("One curve") to a perfectly clean synthetic
peak (no noise added) so the residual is ~1e-45 and the reduced-χ²-scaled errors land around
1e-23. Got: `A 5.000000000000000000000000 ± 0.000000000000000000000029`,
`xc (s)20.000000000000000000000000 ± 0.000000000000000000000020`,
`Area 37.59942411946500584463138 ± 0.00000000000000000000027`. Root cause:
`const d=Math.max(0, 1-Math.floor(Math.log10(e)));` in `fmtPM` (no upper bound on `d`); when
`e≈1e-23`, `d≈24`, and `v.toFixed(24)` prints far past `Number`'s real precision (~15–17
significant digits), so most of those digits are floating-point noise, not information. Real
instrument data never has errors this small, but any very smooth/idealised or simulated dataset
fit by its own generating function will hit this — and the result looks exactly like a broken
app, undermining trust in a genuinely correct fit. Should: cap `d` (e.g. `Math.min(d, 12)`), or
switch to significant-figure formatting once `e/|v|` is below a sane threshold (~1e-10). Fix
size: one line. Affects both fit panels (shared formatter), the peak table, and the exported
report/CSV equally.

### Minor

**F4 — The project-name field can show a different project's name after a switch.** Root cause:
`renderTop()` guards the name `<input>` with `if(document.activeElement!==ni) ni.value=…` so an
in-progress rename isn't clobbered mid-keystroke — reasonable in itself, but it doesn't
distinguish "still the same project, still typing" from "switched to an entirely different
project while this field happened to have focus." Reproduced: focus `#projName`, click "New
project" (which does not itself move focus) — the field keeps showing the old project's name
while every other panel (graph, worksheet, tabs) has already switched to the new, unrelated
project. Fix size: one line (compare `p.id` against the last-rendered id, and refresh the field
even while focused if the underlying project changed).

**F5 — `isMonotonic`'s 97% threshold can misclassify a small, genuinely-sorted file.** A
descending 8-row test file with a single duplicated X value scored 6/7 = 85.7% "down" steps
(the tie counts as neither up nor down), which is below the 97% cutoff, so the wizard reported
"X is not sorted" instead of the correct "X decreases down the file" info note. Only visible on
small files — a real multi-hundred-row spectrum with one duplicate is unaffected. Fix size: one
line (exclude ties from the denominator, or lower the threshold for small `n`), low priority.

### Not a regression (investigated and ruled out)

Two things looked like bugs during testing and were not, worth recording so they are not
mis-attributed to the app: (1) `computer left_click` failing to trigger the app's handlers is a
**pane/tooling limitation** in this session, not an app defect — confirmed by dispatching the
identical event via `element.click()`/`dispatchEvent` at the same target and getting the correct
result every time. (2) An apparent Ctrl+Z-in-a-cell failure (edit applied, toast said "Undid
that cell edit," value unchanged) was traced to my own rapid, overlapping test sequencing
leaving `S.pid` and the undo stack referring to different projects created in quick succession;
a clean, properly-paced repeat (fresh project, one edit, one `Ctrl+Z`) reverted correctly both
via a direct `undo()` call and via a realistic dispatched `keydown` on `document`. M8 stands as
fixed.

---

## 6. What is already good — do not break it

Everything round 1 and round 2 called out as good is still present and, on this pass, further
strengthened:
- The import wizard's detection-plus-recovery loop (wrong delimiter → disabled button with an
  honest count; Auto restores; inline fix buttons apply and are logged as row-level steps).
- Undo/redo: now demonstrably covers cell edits, column deletes, imports, fits, masks, **and**
  every peak-panel action (find, clear, delete, shape, baseline, reset) with matching History
  rollback in both directions.
- The stale-fit badge family (column, mask, range, cleanup steps, error-column) — the app now
  tells you, specifically, why a result on screen is no longer trustworthy, in every case tried.
- The exported report's Warnings are not an afterthought: dependency, exclusion and singular-
  covariance notes were confirmed to match the on-screen panel byte-for-byte in the captured
  file, not summarised or dropped.
- Zero `window.onerror` and zero uncaught console errors across a very long, deliberately
  adversarial session (dozens of projects, hundreds of programmatic mutations, four import
  formats, dark/light switching, keyboard and pointer event storms).

---

## 7. The five changes that would most improve it now

1. **Clear the hover tooltip on project switch.** One line; it is the same "don't show a true-
   looking lie" defect class as round 1's headline finding, just in a new spot. (F1)
2. **Fix the zero-overlap add-import toast to say what happened.** The log already gets this
   right; make the toast agree with it, or better, require an explicit choice when there is no
   overlap at all, per round 1's original C4 recommendation. (F2)
3. **Cap `fmtPM`'s decimal places.** One line, `Math.min(d, 12)` or similar; a near-noiseless
   fit should not look like a stack trace. (F3)
4. **Verify (or fix) the non-convergence and at-bound report lines live**, and construct a case
   that forces `lmFit` to stop at 400 iterations without converging, to close the one warning
   type this round could not independently reproduce. (N16)
5. **Make the project-name field switch-aware, not just focus-aware.** Compare project id, not
   only `document.activeElement`, before deciding whether to skip a refresh. (F4)
