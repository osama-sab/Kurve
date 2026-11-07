# Kurve UX rework: cold-user audit, scope reset, and redesign

Put this file in the repo root and tell Claude Code: "Read KURVE_UX_REWORK.md and run Phase 0."
Each phase ends at a STOP gate. Do not start the next phase until I reply.

---

## Why this exists

Kurve is meant to be a scientific data analysis app with **Excel's ease** and **Origin's
scientific depth**: someone who can use a spreadsheet should be able to type or import data,
plot it, fit it, run statistics and produce a publication figure without training, while a
trained Origin user finds every serious tool they expect.

It has drifted. Features were added one at a time, each coded and tested in isolation, and
nobody has used the whole app as a newcomer since it was about 200 KB. It is now 1.8 MB. The
three earlier UI audits (`UI_AUDIT*.md`) were bug hunts: they called internals and dispatched
synthetic events, which proves code paths work but says nothing about whether a person can
find them. This rework is different. **You will use the app as a stranger first, and read the
code second.**

## Non-negotiable ground rules

1. **Feature freeze.** No new features in any phase. Allowed changes: move, merge, rename,
   restyle, re-default, hide behind "Advanced", or remove (remove only with my approval at a
   STOP gate). If you think something new is needed, write it in the report instead.
2. **The science is untouchable.** Do not change fitting, statistics, parsing or processing
   numerics. Every script in `tools/` (`fit-test.mjs`, `parser-test.mjs`, `pipe-test.mjs`,
   `sheet-fuzz.mjs`, `odd-test.mjs`) must pass after every change, exactly as before. Raw data
   stays immutable, uncertainties stay visible, the processing history stays reproducible.
3. **Every change must make a real task measurably easier** (fewer clicks, fewer wrong turns,
   fewer guesses) or remove an inconsistency. "Looks more modern" alone is not a reason.
4. Keep the existing file conventions in `CLAUDE.md` (single file, CRLF line endings, no build).
5. Judge by what is on screen. Screenshots are the evidence.

---

## Phase 0: set up an honest test rig

The Claude browser MCP did not deliver real clicks to the app in round 3 of the earlier audits.
Use **Playwright** instead, which does:

```
pip install playwright
playwright install chromium
```

Write `tools/ux/drive.py`, a small helper that opens `kurve.html` in Chromium, takes
screenshots to `ux/shots/`, and logs every action (click, key, drag) with a timestamp to a
JSON file so clicks and time per task can be counted afterwards.

Rules for driving the app during Phase 1:

- Use only `page.mouse`, `page.keyboard`, `get_by_role`, `get_by_text` and `get_by_label`:
  the things a sighted user can perceive. **No `page.evaluate` against app internals, no
  `element.click()` in JS, no reading the DOM for hidden state.** If you cannot find a control
  by its visible label or role, that is a finding, not an obstacle to code around.
- Take a screenshot after every meaningful action and **look at it** before deciding the
  next action, exactly as a person looks at the screen.
- Test at three viewports: 1920×1080, 1366×768 and 1280×720 (common laptops), in light and
  dark themes. Do not test phone widths in this round.

Also generate test data into `tools/ux/fixtures/`, realistic and slightly messy:

- `calibration.csv`: concentration vs absorbance, 8 points, nearly linear, with a standard
  deviation column (a chemistry lab's daily task).
- `decay.txt`: tab-separated time vs counts, an exponential decay with noise and a 3-line
  instrument header.
- `growth_eu.csv`: semicolon-delimited, comma decimals, 3 Y columns (three samples), units in a
  second header row.
- `raman_raw.txt`: a Raman spectrum with a sloped background, two cosmic-ray spikes and
  overlapping bands.
- `survey.csv`: 200 rows of one measured quantity across 3 groups, for statistics.

**STOP 0:** Show me the rig working with one screenshot. Then go on to Phase 1 only after I reply.

---

## Phase 1: the cold-user walkthrough (no prior knowledge)

### Isolation

Copy `kurve.html` and the fixtures into a folder **outside the repository**
(e.g. `../kurve-coldtest/`) and run this phase there, ideally in a fresh Claude Code session
started in that folder, so no project memory is in reach. During this phase you must not
open `CLAUDE.md`, any `ORIGIN_*.md` or `UI_AUDIT*.md`, the source of `kurve.html`, or the
app's own Help window **unless the persona would plausibly open Help at that moment** (count
it when they do: needing Help for a basic task is a finding).

### Personas

Play each persona honestly, including their impatience and their habits.

- **A: Excel-native grad student.** Uses Excel daily, has never used Origin, is not a
  spectroscopist. Expects: click a cell and type, select columns then insert a chart,
  right-click for options, "Add trendline". Gives up on a dialog with more than about ten
  visible controls.
- **B: Origin-trained spectroscopist.** Ten years of Origin. Expects: worksheet with Long
  Name / Units rows, Plot menu, double-click any graph element to format it, Analysis >
  Fitting > Nonlinear Curve Fit, Peak Analyzer, a fit report with errors. Irritated by
  anything slower than Origin.
- **C: Collaborating PI.** Opens a project a student shared. Wants to understand what was
  done to the data and whether the numbers are trustworthy, without redoing anything.

### Tasks

For every task, record: success (yes / partly / no), clicks and keystrokes, wall time,
**wrong turns** (each place you went first that was not the way), **guesses** (each time you
acted without being confident what would happen), every moment of confusion **quoted as the
persona's inner voice**, and screenshots of the confusing moments.

| # | Persona | Task | Done when |
|---|---|---|---|
| T1 | A | Type 6 x,y pairs by hand, make a scatter plot, give both axes titles with units, export a PNG | PNG exists with correct titles |
| T2 | A | Fit a straight line to `calibration.csv`, read slope ± error and R², show the line and equation on the graph | Numbers readable on screen and on the graph |
| T3 | A | Add Y error bars from the SD column of `calibration.csv` and refit weighted | Weighted fit result visible |
| T4 | A | Import `growth_eu.csv`, plot all three samples against time with a legend | Legend names the samples correctly |
| T5 | A | Make a new column = log10 of a sample column, plot it | New curve on a graph |
| T6 | A | Descriptive statistics and a histogram per group for `survey.csv`; compare the groups | Mean, SD, n per group visible |
| T7 | B | Fit `decay.txt` with a single exponential with offset, then with a user-defined double exponential | Both fit reports with errors |
| T8 | B | `raman_raw.txt`: remove spikes, subtract baseline, find and fit the peaks, get a table of position, FWHM, area with errors | Table exportable to CSV |
| T9 | B | Make a two-panel publication figure (raw and fitted) with matching axes, export as SVG/PDF | File exported |
| T10 | B | Restyle one curve (colour, line width), change the axis tick font size, reverse the X axis | Graph looks as intended |
| T11 | any | Make a mistake three steps back in T8 and fix it without starting over | Corrected result |
| T12 | C | Reload the project from T8 and explain, from the app alone, every step done to the data and whether the peak table can be trusted | Written explanation |
| T13 | A | Deliberately misuse things: fit with 2 points, import a broken file, type text in a number column | Each error understood and recovered from |

Do every task at 1366×768 first. Repeat T1, T2 and T8 at 1280×720 and 1920×1080 and in dark
mode, noting only what changes.

### Phase 1 report: `ux/COLD_WALKTHROUGH.md`

1. A table of all tasks with success, clicks, time, wrong turns, guesses.
2. For each task, the narrative of what happened, with the persona's quoted confusion and
   screenshot links.
3. The **first-five-minutes verdict**: could Persona A do anything useful without help?
4. Screen-level observations: what is visible at each viewport, what is covered, what is
   squeezed, what draws the eye first versus what matters most.

**STOP 1.** Send me the summary table and the ten worst moments.

---

## Phase 2: feature inventory and scope audit (now read the code)

Now you may read `CLAUDE.md`, the `ORIGIN_*.md` research and the source.

Build `ux/FEATURE_INVENTORY.md`: one row for **every user-facing thing**: every menu item
(including submenus), toolbar button, window, dialog, panel, context-menu item and keyboard
shortcut. Columns:

| Feature | Every place it can be reached | Name used in each place | Used in which Phase 1 task (or none) | Origin equivalent | Excel equivalent | Domain (general / spectroscopy / power user) | Verdict |
|---|---|---|---|---|---|---|---|

Verdicts, with one line of reason each:

- **Keep**: core and well placed.
- **Rename**: label is jargon, inconsistent or ambiguous.
- **Merge**: duplicates or near-duplicates another entry.
- **Move**: belongs elsewhere (another menu, a context menu, an "Advanced" section, the
  Spectroscopy toolkit).
- **Hide by default**: power-user or niche; reachable but not in the newcomer's path.
- **Remove candidate**: unused by any realistic task, redundant, or out of scope for a
  scientific analysis app. I decide on these.

Then add three sections:

1. **Duplicate and inconsistent entry points**: things reachable by more than two routes,
   or with different names in different places.
2. **Language audit**: every term a non-spectroscopist would not understand in the general
   path ("spectrum" used for any XY data, "Raw/Final", "Recorded data", hashes, "step",
   "turned down"), with a proposed plain replacement. Spectroscopy words are fine *inside*
   spectroscopy tools.
3. **Defaults audit**: every default that assumes spectroscopy or a particular data shape
   when the data says otherwise.

**STOP 2.** Present the inventory summary and the full list of Remove candidates. I will
mark each one.

---

## Phase 3: UX specification and design system (write, don't code)

Write `ux/UX_SPEC.md`. It must be short enough to keep in your head (aim for under 400
lines) because it replaces most of the screen description in `CLAUDE.md`.

### 3.1 Principles (the Excel + Origin synthesis)

Use these as the rubric for every decision, and add to them if Phase 1 shows the need:

- **Data first.** The worksheet and the graph are the home. Nothing opens by default that
  is empty or that a newcomer has no use for yet.
- **Select, then act** (Excel). Select columns or a range, then pick an action from the menu
  or a right-click. Results land next to the data: a new column, a new sheet, a graph.
- **Double-click what you see to change it** (Origin). Any axis, curve, label, legend or
  title opens its own formatting, already on the right page.
- **Defaults that fit the data.** A straight-looking line suggests a line fit; peaks suggest a
  peak fit; nothing defaults to a spectroscopy model for non-spectral data.
- **Progressive disclosure.** Every dialog shows the few settings that matter, with a live
  preview, and folds everything else under "Advanced". A dialog never needs scrolling at
  1366×768 in its default state.
- **One obvious way, at most two routes** (menu plus context menu) to each common action.
  A toolbar button only for things done many times per session.
- **Never cover the data you are working on.** Tool panels dock beside the graph or reflow
  it; they do not float over it.
- **Every number tells the truth.** Units on every quantity, sensible significant figures,
  uncertainties always shown, and an obvious difference between stale and current results.
- **Neutral core, specialist toolkits.** The general path speaks in columns, data sets,
  curves and fits. Spectroscopy (baselines, peak finding, Raman shift, unit conversions)
  is a first-class toolkit, one click away, not the frame for everything.
- **Not a slideshow.** Do not trade density for prettiness. A trained user must still be
  fast; keyboard paths and dense tables stay.

### 3.2 Layout

Specify the default workspace for 1366×768 and 1920×1080 with a wireframe for each (ASCII or
SVG). Specify which windows open on first launch and after an import, how tool panels dock,
how many worksheet rows must be visible at minimum (the label rows must not starve the data:
consider collapsing them to one line or making them toggleable), and how the History and
Project Explorer behave when space is short.

### 3.3 Information architecture

The final menu tree, every item, with what changed and why. Decide whether the graph
window's own menu bar earns its space or duplicates the main menu. Decide the toolbar
contents (with labels or tooltips for every icon, and nothing that is useless before data
exists shown as active).

### 3.4 Dialog pattern

One template every tool dialog follows: title, the essential controls, live preview on the
graph, "Advanced" fold, and the same button row in the same order everywhere (e.g.
Apply / OK / Cancel, primary on the right or left, but the same everywhere). Name the
dialogs that must be rebuilt to fit it, worst first.

### 3.5 Design tokens

The app currently has 22 distinct font sizes, 196 distinct hard-coded hex colours and about
13 distinct raw border-radius values beside its CSS variables. Define:

- a type scale of at most 6 sizes, with roles (graph-window title, label, body, table,
  caption, heading);
- a spacing scale (e.g. 4 / 8 / 12 / 16 / 24 / 32 px);
- at most 3 radii;
- colour roles (surface levels, border, text primary/secondary/disabled, accent, focus,
  danger, warning, success, selection) for light and dark, each checked for contrast:
  at least 4.5 to 1 for text, at least 3 to 1 for UI boundaries and icons (WCAG AA);
- a data palette for curves that is colour-blind safe and readable on both themes;
- disabled, hover, pressed and focus states that are visibly different from each other.

Every remaining hard-coded value must map to a token or be justified.

### 3.6 Terminology glossary

One table: the word the app uses, for which concept, and where. Every label, tooltip, toast
and Help article must follow it.

**STOP 3.** Send me the wireframes, the menu tree diff and the token sheet.

---

## Phase 4: implement in thin slices

Work in slices small enough to review, each on its own commit. Suggested order (adjust from
what Phase 1 found):

1. Design tokens and the colour/contrast pass (pure CSS, low risk, high visual payoff).
2. Default layout and docking: data visible first, panels never covering the graph.
3. Terminology pass through labels, tooltips, toasts and the History.
4. Menu and toolbar restructure from the approved inventory.
5. Data-aware defaults (fit model suggestion, plot type).
6. Dialog rebuilds to the template, worst first.
7. Approved removals and relocations.

For **every** slice:

- Before and after screenshots of the affected screens at 1366×768, light and dark.
- Re-run the Phase 1 tasks the slice touches, with the same persona rules, and record the
  new clicks, wrong turns and guesses. **No touched task may get worse.**
- Run every script in `tools/`. All must pass.
- A changelog entry in `ux/CHANGELOG.md`: what changed, which finding it answers, the
  measured effect.

---

## Phase 5: verify with a fresh stranger

Repeat Phase 1 completely, in a fresh session, on the reworked app, without reading the
Phase 1 report first. Then compare: `ux/BEFORE_AFTER.md` with the task table side by side
and the five biggest improvements and the five remaining worst moments.

---

## Phase 6: stop the drift from coming back

1. **Shrink `CLAUDE.md`.** It is about 2,400 lines (over 200 KB), which crowds out
   everything else in every session and is one reason features stopped fitting together.
   Move the long screen description and code map into `docs/` files that are read on demand.
   Keep `CLAUDE.md` to the file conventions, the rules learned the hard way, a pointer to
   `ux/UX_SPEC.md`, and the UX gate below. Aim for under 300 lines.
2. **Add a UX gate to `CLAUDE.md`** that every future feature must pass before it is done:
   - Which menu does it live in, and does that fit the spec's information architecture?
   - Does its dialog follow the template? Does it use only tokens?
   - Does it use only glossary terms?
   - Is it reachable by at most two routes? Does it cover the graph?
   - Persona A can complete its main use without Help, verified with the rig.
3. **Save the cold-user persona as a reusable subagent** in `.claude/agents/cold-user.md`
   (the Phase 1 rules, personas and rig), replacing or sitting beside the existing
   `ui-quality.md`, so a stranger's walkthrough can be repeated after every few features.

---

## Appendix (sealed): an independent first look

**Do not read this until Phase 1 is finished.** Then check each item against your own
findings: confirm it, refute it, or note that you missed it. These come from a short
first session in headless Chromium with real clicks, before this plan was written.

- At 1280×720 the worksheet shows **no data rows at all**: the five label rows (Long Name,
  Units, Comments, F(x)=, Sparklines) fill it. At 1440×900 it shows two or three rows. The
  Excel-like core is the smallest window on the desk, smaller than an empty History panel.
- With six hand-typed points on an obvious straight line, Analysis > Fit > Curve fit opens
  with **Gaussian peak** as the model. There is no "Linear fit" or "Add trendline" in sight.
- The Fit window floats over the right side of the graph, covering data points it is fitting.
- Plot menu lists "Format graph…", "Formats" and "Format" one under another.
- The graph window repeats Data / Math / Analysis / Statistics / Plot directly under the
  main menu bar that already has them.
- The History calls a 6-point x,y table "1 spectrum" and its column "column B"; the
  worksheet footer shows a SHA-256 hash link. Persona A has no use for either.
- Raw / Final / Compare, the plot-type and layout dropdowns and nine unlabelled pointer-tool
  icons are all shown and active before any data exists.
- Peak fit opens with nine peak-detection settings expanded before the first fit; the Fit
  button below them looks disabled (pale) even when it may not be.
- Typed data plots immediately, but imported data deliberately plots nothing until you
  select columns and press Plot: two behaviours for the same intent.
- The menus themselves are short and well grouped, the empty state with examples is good,
  dark mode is mostly clean, and typing into the grid feels like Excel. Protect these.
