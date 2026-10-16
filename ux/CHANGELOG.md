# UX rework changelog

One entry per Phase 4 slice: what changed, which finding it answers, and the measured effect.
Before-and-after screenshots are in [`evidence/slices/`](evidence/slices/) (`<slice>-before-…`
and `<slice>-after-…`, 1366×768, light and dark, taken by `tools/ux/shots.py`). Task re-runs
are in [`evidence/logs/slices/`](evidence/logs/slices/) (taken by `tools/ux/tasks.py`).

## Slice 1: design tokens and the colour and contrast pass

**What changed** (CSS, and the default curve colours):
- **Sizes became tokens** (UX_SPEC §3.5, `spec/TOKEN_MAP.md`):

  | Kind | Before | After |
  |---|---|---|
  | Type sizes | 17 | 6: `--fs-cap` 11 · `--fs-tab` 12 · `--fs-body` 13 · `--fs-title` 14 · `--fs-head` 16 · `--fs-hero` 20 px |
  | Spacing values | 36 | 8 steps: `--sp-1` … `--sp-8`, 2 · 4 · 6 · 8 · 12 · 16 · 24 · 32 px |
  | Radii | 13 | 3: `--r-s` 4 · `--r` 6 · `--r-l` 8 px |

- **Left raw, each justified** in TOKEN_MAP.md:
  - 3 sizes: the font sample, the symbol picker's glyphs, the x² button's script.
  - 5 radii: pills and round shapes.
  - 5 spacing values: hairlines and two layout offsets.
  - 10 colours: the colour picker's gradients, checkerboards, the export page.
- **Offsets tied to a padding moved with it**, so no sticky footer floats: the two sticky
  footers, the windows' search bars and the menu's search box.
- **States:**
  - Disabled controls are drawn with `--ink-off` words and a dashed edge, where before they
    were faded to opacity .40–.55.
  - Pressed has its own fill, `--press`, and an inset shadow.
  - On a menu highlight, shortcuts and arrows take the primary ink.
- **Words on filled status shapes** (step numbers, badges, the warning dot, the danger button)
  use `--on-fill`, and badges sit on `--badge`.
- **The default curve colours** are the validated eight hues, in worksheet order.
  - The analysed curve keeps its colour and is drawn heavier.
  - The older "Distinct hues" scheme is the same hues, and is hidden from the list.

**Findings it answers:**
- **The token audit** (Phase 3): 21 font sizes and 196 colours, as the plan counted them.
- **Contrast** (Phase 3 measurements):
  - White on dark mode's status fills read at 1.8–2.0:1.
  - White on light mode's badge read at 4.2:1.
  - Secondary words on highlights read at 5.4–6.9:1, where 7:1 is needed.
  - Disabled words were faded by an amount that depended on the control.
- **The curve palette:** the old default failed the colour-blind check in both themes.
  - Teal against green: ΔE 8.5 even for full colour vision, in light.
  - Violet against periwinkle: ΔE 5.0, in dark.

**Measured effect:**

| | Before | After |
|---|---|---|
| `tools/contrast-test.mjs` | 133 checks, all passing; 24 of the new checks fail on the old file | 189 checks, all passing |
| Text on status fills (step numbers, badges) | 1.8–4.2:1 | 6.5–8.1:1 |
| Disabled button, as drawn | faded by opacity | 6.1–6.9:1, opacity 1 |
| Curve palette, worst adjacent pair (light / dark) | fails: normal vision 8.5 / 5.0 | colour-blind ΔE 9.1 / 8.4, normal vision 19.6 / 19.3 |
| T1 re-run (1366×768, light and dark) | 7 clicks, 59 keys | 7 clicks, 59 keys: unchanged |

- **No task got worse.** No task's path changed: this slice changes what things look like,
  not where they are.
- **Tools, after the slice:**
  - fit, pipe, parser and tex tests: all pass.
  - odd-test: 51 of 51.
  - sheet-fuzz, seeds 1 and 2: clean.
  - Duplicate-function check: no function is declared twice.
