# Contrast of every colour role

Computed by `tools/ux/tokens.py` from the tokens in `kurve.html`, plus the two roles the
UX spec adds (`--ink-off`, disabled text; `--press`, a pressed fill). WCAG 2.1 relative
luminance. Thresholds: words 7:1 (DESIGN.md, stricter than AA's 4.5:1), disabled words,
status words and text on a fill 4.5:1, boundaries and icons 3:1. Three rows are not WCAG
pairs, they check that two states can be told apart (marked in the threshold column).

Secondary text (`--muted`) is checked on resting surfaces only. On a highlight (hover,
pressed, a menu item under the pointer, a selection) the spec's rule is that all text takes
`--ink`: measured, `--muted` falls to 5.4–6.9:1 there, below DESIGN.md's 7:1.

**120 pairs, 0 below their threshold.**

| Set | Role | Foreground | Background | Ratio | Needs | |
|---|---|---|---|---:|---:|---|
| Bench light | text, primary | `--ink` #0B1220 | `--panel` #FFFFFF | 18.72 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--panel-2` #EEF2F6 | 16.64 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--panel-3` #DDE3EA | 14.49 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--chrome` #DFE5EC | 14.76 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--well` #E6EBF1 | 15.62 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--btn-bg` #F4F6F9 | 17.29 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--win-h-bg` #E4E9EF | 15.34 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--btn-bg-h` #E1E7EE | 15.04 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--press` #C6CED8 | 11.79 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--hi` #C5D7FB | 12.92 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--sel` #D3E0FC | 14.12 | 7 | PASS |
| Bench light | text, primary | `--ink` #0B1220 | `--ws-sel` #C9D5F6 | 12.78 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--panel` #FFFFFF | 10.16 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--panel-2` #EEF2F6 | 9.03 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--panel-3` #DDE3EA | 7.86 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--chrome` #DFE5EC | 8.01 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--well` #E6EBF1 | 8.47 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--btn-bg` #F4F6F9 | 9.38 | 7 | PASS |
| Bench light | text, secondary | `--muted` #364255 | `--win-h-bg` #E4E9EF | 8.32 | 7 | PASS |
| Bench light | text, disabled | `--ink-off` #56627A | `--panel` #FFFFFF | 6.13 | 4.5 | PASS |
| Bench light | text, disabled | `--ink-off` #56627A | `--panel-2` #EEF2F6 | 5.45 | 4.5 | PASS |
| Bench light | text, disabled | `--ink-off` #56627A | `--panel-3` #DDE3EA | 4.75 | 4.5 | PASS |
| Bench light | text, disabled | `--ink-off` #56627A | `--chrome` #DFE5EC | 4.84 | 4.5 | PASS |
| Bench light | text, disabled | `--ink-off` #56627A | `--btn-bg` #F4F6F9 | 5.67 | 4.5 | PASS |
| Bench light | text, disabled | `--ink-off` #56627A | `--win-h-bg` #E4E9EF | 5.02 | 4.5 | PASS |
| Bench light | text on the accent | `--accent-ink` #FFFFFF | `--accent` #1D4ED8 | 6.70 | 4.5 | PASS |
| Bench light | text on the front title bar | `--win-h-act-ink` #FFFFFF | `--win-h-act-bg` #1D4ED8 | 6.70 | 4.5 | PASS |
| Bench light | text on a chosen segment | `--seg-on-ink` #FFFFFF | `--seg-on` #1D4ED8 | 6.70 | 4.5 | PASS |
| Bench light | status ok | `--ok` #15603A | `--panel` #FFFFFF | 7.59 | 4.5 | PASS |
| Bench light | status ok on its own fill | `--ok` #15603A | `--ok-bg` #DDF1E4 | 6.43 | 4.5 | PASS |
| Bench light | status warn | `--warn` #7C4A03 | `--panel` #FFFFFF | 7.40 | 4.5 | PASS |
| Bench light | status warn on its own fill | `--warn` #7C4A03 | `--warn-bg` #FCEFC7 | 6.45 | 4.5 | PASS |
| Bench light | status bad | `--bad` #B3261E | `--panel` #FFFFFF | 6.54 | 4.5 | PASS |
| Bench light | status bad on its own fill | `--bad` #B3261E | `--bad-bg` #FBE1DE | 5.27 | 4.5 | PASS |
| Bench light | comments (talk) | `--talk` #5B34B8 | `--panel` #FFFFFF | 7.99 | 4.5 | PASS |
| Bench light | text on a status fill | `--on-fill` #FFFFFF | `--ok` #15603A | 7.59 | 4.5 | PASS |
| Bench light | text on a status fill | `--on-fill` #FFFFFF | `--warn` #7C4A03 | 7.40 | 4.5 | PASS |
| Bench light | text on a status fill | `--on-fill` #FFFFFF | `--bad` #B3261E | 6.54 | 4.5 | PASS |
| Bench light | text on a status fill | `--on-fill` #FFFFFF | `--badge` #7C4A03 | 7.40 | 4.5 | PASS |
| Bench light | text on a comment badge | `--talk-ink` #FFFFFF | `--talk` #5B34B8 | 7.99 | 4.5 | PASS |
| Bench light | boundary: control edge | `--rule` #717E90 | `--panel` #FFFFFF | 4.13 | 3 | PASS |
| Bench light | icon | `--faint` #5F6C7E | `--panel` #FFFFFF | 5.34 | 3 | PASS |
| Bench light | boundary: control edge | `--rule` #717E90 | `--panel-2` #EEF2F6 | 3.67 | 3 | PASS |
| Bench light | icon | `--faint` #5F6C7E | `--panel-2` #EEF2F6 | 4.75 | 3 | PASS |
| Bench light | boundary: control edge | `--rule` #717E90 | `--chrome` #DFE5EC | 3.25 | 3 | PASS |
| Bench light | icon | `--faint` #5F6C7E | `--chrome` #DFE5EC | 4.21 | 3 | PASS |
| Bench light | boundary: control edge | `--rule` #717E90 | `--btn-bg` #F4F6F9 | 3.81 | 3 | PASS |
| Bench light | icon | `--faint` #5F6C7E | `--btn-bg` #F4F6F9 | 4.93 | 3 | PASS |
| Bench light | boundary: window edge | `--win-bd` #5E6B7D | `--paper` #BCC6D2 | 3.13 | 3 | PASS |
| Bench light | boundary: window edge | `--win-bd` #5E6B7D | `--panel` #FFFFFF | 5.42 | 3 | PASS |
| Bench light | boundary: desk vs window | `--paper` #BCC6D2 | `--panel` #FFFFFF | 1.73 | 1.1 | PASS |
| Bench light | focus ring | `--focus` #1D4ED8 | `--panel` #FFFFFF | 6.70 | 3 | PASS |
| Bench light | focus ring | `--focus` #1D4ED8 | `--chrome` #DFE5EC | 5.28 | 3 | PASS |
| Bench light | switch, off | `--sw-off` #8794A5 | `--panel` #FFFFFF | 3.08 | 3 | PASS |
| Bench light | checkbox edge | `--cb-bd` #5F6C7E | `--panel` #FFFFFF | 5.34 | 3 | PASS |
| Bench light | slider track | `--trk` #8794A5 | `--panel` #FFFFFF | 3.08 | 3 | PASS |
| Bench light | selection edge | `--ws-sel-bd` #1D4ED8 | `--panel` #FFFFFF | 6.70 | 3 | PASS |
| Bench light | accent as a fill | `--accent` #1D4ED8 | `--panel` #FFFFFF | 6.70 | 3 | PASS |
| Bench light | hover vs rest | `--btn-bg-h` #E1E7EE | `--btn-bg` #F4F6F9 | 1.15 | 1.08 | PASS |
| Bench light | pressed vs hover | `--press` #C6CED8 | `--btn-bg-h` #E1E7EE | 1.28 | 1.25 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--panel` #151C27 | 15.65 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--panel-2` #1C2533 | 14.10 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--panel-3` #273345 | 11.67 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--chrome` #1B2431 | 14.30 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--well` #0E141C | 16.91 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--btn-bg` #212B3A | 13.05 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--win-h-bg` #222C3B | 12.88 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--btn-bg-h` #2C394B | 10.71 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--press` #404D64 | 7.80 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--hi` #2D4475 | 8.75 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--sel` #24375C | 10.81 | 7 | PASS |
| Bench dark | text, primary | `--ink` #F2F5F9 | `--ws-sel` #32405B | 9.51 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--panel` #151C27 | 9.70 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--panel-2` #1C2533 | 8.74 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--panel-3` #273345 | 7.23 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--chrome` #1B2431 | 8.86 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--well` #0E141C | 10.48 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--btn-bg` #212B3A | 8.09 | 7 | PASS |
| Bench dark | text, secondary | `--muted` #BAC4D1 | `--win-h-bg` #222C3B | 7.98 | 7 | PASS |
| Bench dark | text, disabled | `--ink-off` #97A3B4 | `--panel` #151C27 | 6.69 | 4.5 | PASS |
| Bench dark | text, disabled | `--ink-off` #97A3B4 | `--panel-2` #1C2533 | 6.03 | 4.5 | PASS |
| Bench dark | text, disabled | `--ink-off` #97A3B4 | `--panel-3` #273345 | 4.99 | 4.5 | PASS |
| Bench dark | text, disabled | `--ink-off` #97A3B4 | `--chrome` #1B2431 | 6.11 | 4.5 | PASS |
| Bench dark | text, disabled | `--ink-off` #97A3B4 | `--btn-bg` #212B3A | 5.58 | 4.5 | PASS |
| Bench dark | text, disabled | `--ink-off` #97A3B4 | `--win-h-bg` #222C3B | 5.51 | 4.5 | PASS |
| Bench dark | text on the accent | `--accent-ink` #081022 | `--accent` #8CB2FF | 8.96 | 4.5 | PASS |
| Bench dark | text on the front title bar | `--win-h-act-ink` #081022 | `--win-h-act-bg` #8CB2FF | 8.96 | 4.5 | PASS |
| Bench dark | text on a chosen segment | `--seg-on-ink` #081022 | `--seg-on` #8CB2FF | 8.96 | 4.5 | PASS |
| Bench dark | status ok | `--ok` #74CC98 | `--panel` #151C27 | 8.83 | 4.5 | PASS |
| Bench dark | status ok on its own fill | `--ok` #74CC98 | `--ok-bg` #163021 | 7.33 | 4.5 | PASS |
| Bench dark | status warn | `--warn` #EDBA5A | `--panel` #151C27 | 9.59 | 4.5 | PASS |
| Bench dark | status warn on its own fill | `--warn` #EDBA5A | `--warn-bg` #3A2C10 | 7.61 | 4.5 | PASS |
| Bench dark | status bad | `--bad` #FF8A70 | `--panel` #151C27 | 7.43 | 4.5 | PASS |
| Bench dark | status bad on its own fill | `--bad` #FF8A70 | `--bad-bg` #3D211C | 6.37 | 4.5 | PASS |
| Bench dark | comments (talk) | `--talk` #BBA6FA | `--panel` #151C27 | 8.11 | 4.5 | PASS |
| Bench dark | text on a status fill | `--on-fill` #0B1220 | `--ok` #74CC98 | 9.66 | 4.5 | PASS |
| Bench dark | text on a status fill | `--on-fill` #0B1220 | `--warn` #EDBA5A | 10.50 | 4.5 | PASS |
| Bench dark | text on a status fill | `--on-fill` #0B1220 | `--bad` #FF8A70 | 8.13 | 4.5 | PASS |
| Bench dark | text on a status fill | `--on-fill` #0B1220 | `--badge` #EDBA5A | 10.50 | 4.5 | PASS |
| Bench dark | text on a comment badge | `--talk-ink` #160F26 | `--talk` #BBA6FA | 8.80 | 4.5 | PASS |
| Bench dark | boundary: control edge | `--rule` #6A788C | `--panel` #151C27 | 3.81 | 3 | PASS |
| Bench dark | icon | `--faint` #8D9AAC | `--panel` #151C27 | 5.99 | 3 | PASS |
| Bench dark | boundary: control edge | `--rule` #6A788C | `--panel-2` #1C2533 | 3.44 | 3 | PASS |
| Bench dark | icon | `--faint` #8D9AAC | `--panel-2` #1C2533 | 5.40 | 3 | PASS |
| Bench dark | boundary: control edge | `--rule` #6A788C | `--chrome` #1B2431 | 3.48 | 3 | PASS |
| Bench dark | icon | `--faint` #8D9AAC | `--chrome` #1B2431 | 5.47 | 3 | PASS |
| Bench dark | boundary: control edge | `--rule` #6A788C | `--btn-bg` #212B3A | 3.18 | 3 | PASS |
| Bench dark | icon | `--faint` #8D9AAC | `--btn-bg` #212B3A | 5.00 | 3 | PASS |
| Bench dark | boundary: window edge | `--win-bd` #5D6A7E | `--paper` #06090E | 3.64 | 3 | PASS |
| Bench dark | boundary: window edge | `--win-bd` #5D6A7E | `--panel` #151C27 | 3.12 | 3 | PASS |
| Bench dark | boundary: desk vs window | `--paper` #06090E | `--panel` #151C27 | 1.17 | 1.1 | PASS |
| Bench dark | focus ring | `--focus` #8CB2FF | `--panel` #151C27 | 8.09 | 3 | PASS |
| Bench dark | focus ring | `--focus` #8CB2FF | `--chrome` #1B2431 | 7.39 | 3 | PASS |
| Bench dark | switch, off | `--sw-off` #5B6A80 | `--panel` #151C27 | 3.11 | 3 | PASS |
| Bench dark | checkbox edge | `--cb-bd` #8D9AAC | `--panel` #151C27 | 5.99 | 3 | PASS |
| Bench dark | slider track | `--trk` #5B6A80 | `--panel` #151C27 | 3.11 | 3 | PASS |
| Bench dark | selection edge | `--ws-sel-bd` #8CB2FF | `--panel` #151C27 | 8.09 | 3 | PASS |
| Bench dark | accent as a fill | `--accent` #8CB2FF | `--panel` #151C27 | 8.09 | 3 | PASS |
| Bench dark | hover vs rest | `--btn-bg-h` #2C394B | `--btn-bg` #212B3A | 1.22 | 1.08 | PASS |
| Bench dark | pressed vs hover | `--press` #404D64 | `--btn-bg-h` #2C394B | 1.37 | 1.25 | PASS |
