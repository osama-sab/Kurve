# Token map

Every raw value in Kurve's own CSS (the first `<style>` block of `kurve.html`) and every
interface colour in its script, with the token it becomes under `ux/UX_SPEC.md` §3.5, or the
reason it stays. Written by `tools/ux/tokenmap.py`; Phase 4's token slice works from it.

## Type: 18 sizes become 6

Rule: the nearest step of 11 / 12 / 13 / 14 / 16 / 20 px, a half pixel going down; a heading
goes to `--fs-head` whatever its size; sizes in `em` inside rich text (scripts, units beside a
number) stay relative, since they scale with the text they sit in.

| Value | Uses | Becomes | Where |
|---|---:|---|---|
| 9px | 1 | `--fs-cap` | .rtool sup,.rtool sub |
| 10px | 1 | `--fs-cap` | .edgepic |
| 10.5px | 3 | `--fs-cap` | .fn-c ; .tk .badge ; .fp-i em |
| 11px | 18 | `--fs-cap` | kbd ; .ws .hc .hoff ; .ws th.rl ; .ws .fxm ; .stepn ; .badge ; .rtab th .unit ; .anchor .num ; .fn-n ; .fn-w ; .trend-win .tchip .tb ; .pd-h ; .cp-lab |
| 11.5px | 14 | `--fs-cap` | .ws tbody th.rh ; .fbhelp code ; .ptab th ; .coltab th ; .fi-disc ; .fn-b ; .ba-leg ; .rawlog code,.fp ; .bsum .chip ; .pdann th ; .doc ol.dsteps>li:: |
| 12px | 66 | `--fs-tab` | input[inputmode="decimal"]:not(.wsed),output.pv,.pd-panel output ; .xr .xnote ; .pane-h .sub ; .statusbar ; .ws .hc .cd ; .ws thead td.lc.fxc ; .ws in |
| 12.5px | 61 | `--fs-tab` | .lab ; .btn.sm ; .xpl-h h2 ; .pane-h h2 ; .ws thead td.lc ; .wsval ; .fprev .fpv ; .fprev .fpn ; .hint ; .fbmsg ; .fbwarn ; .fbhelp p ; .range ; .note |
| 13px | 22 | `--fs-body` | body ; .nothing ; .xr ; .xempty ; .ws table.grid ; .gh ; .formula .ufx ; .fnb textarea ; .err ; .pcard-h strong ; .find li ; .sect ; .help h3 ; .toast |
| 13.5px | 8 | `--fs-body` | .proj input ; .fi-t ; .fpbtn ; .doc h3 ; .doc-tip ; .doc-tab ; .inled input,.inled textarea ; .inled textarea |
| 14px | 4 | `--fs-title` | .btn.lg ; .empty p ; .rtitle ; .doc |
| 14.5px | 2 | `--fs-title` | .ptab td.pn i ; .doc-tab td.eqi |
| 15px | 6 | `--fs-title`; `--fs-head` for .pd-title; stays for .sympick button (the symbol picker's glyphs: content, drawn large enough to tell apart) | .fbpars td.pn ; .pd-title ; .sympick button ; .fp-i ; .tbt ; .doc .eq |
| 15.5px | 1 | `--fs-head` | .doc-lead |
| 16px | 4 | `--fs-head` | .formula ; .sheet-h h2 ; .dropzone>div ; .doc h2 |
| 18px | 2 | `--fs-head`; stays for .fonteg (a font sample in the font picker: content shown at a size to judge the face) | .brand ; .fonteg |
| 23px | 1 | `--fs-hero` | .empty h3 |
| 24px | 1 | `--fs-hero` | .doc h1 |
| .92em | 1 | stays (relative) | .unit |

## Radii: 23 values become 3

A badge or chip as tall as its text keeps a radius of half its height: it is a round shape (a
pill), like a switch's knob, not a corner on the radius scale.

| Value | Uses | Becomes | Where |
|---|---:|---|---|
| `4px` | 26 | `--r-s` (4 px) | :root ; kbd ; .xr ; .mb ; .proj input ; .wsaddr ; .wsval ; .figure ; .tip ; .tieb ; .thr ; .menu .mi ; .toast #toastAct ; .toast #toastX ; .rb ; .befo |
| `var(--r)` | 24 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | .btn ; select,.inp,input[type=text],input[type=number],textarea ; .tb ; .seg>button ; .bimp ; .pdk ; .pdlg-ys ; .pdlg-sk ; .impcols ; .tk ; .gghost ;  |
| `50%` | 21 | stays: a round shape (knobs, swatches, pills), not a radius | input[type=radio] ; input[type=range]::-webkit-slider-thumb ; input[type=range]::-moz-range-thumb ; .people img ; .stepn ; .dot ; .cmt img ; .anchor . |
| `5px` | 13 | `--r` (6 px) | :root[data-style="graphite"] ; .formula ; .tiechip ; .note ; .steps li ; .fonteg ; .pyout,.pyerr ; .pd-an ; .pd-anb ; .pd-item ; .fp-i ; .cp-prev ; .d |
| `6px` | 12 | `--r` (6 px) | :root ; .fkl label ; .fprev ; .fitsum ; details.grp ; .pcard ; .rside ; .impmode ; .impprev ; .pd-ax ; .cp-sv ; .docs-toc a |
| `3px` | 8 | `--r-s` (4 px) | :root[data-style="graphite"] ; .xtw ; .impcn:focus-visible ; .ffit svg ; .pd-ent .sw,.pd-an .sw ; .pd-place button ; .pd-item .sw ; .inled-pv code,.te |
| `2px` | 8 | `--r-s` (4 px) | .sw ; .tk.on::after ; .fnode.cur::before ; .fdrop ; .ba-leg i ; .bprog .bar ; .docs-toc mark,.doc mark ; .igsw |
| `7px` | 6 | `--r` (6 px) | .menu ; .toast ; .fnode ; .cp-hue ; .docs-q ; .inled |
| `8px` | 5 | `--r-l` (8 px) | :root ; :root[data-style="graphite"] ; .doc-tip ; .doc .eq ; .doc-pn a |
| `0` | 5 | stays: square on purpose | .ws input.wsed ; .win.max ; .fcell .figure ; .pyed textarea ; .tbgrp .tbt |
| `9px` | 5 | `--r-l` (8 px); stays as a pill for .badge, .fn-c, .fn-n | .badge ; .fn-c ; .sheet ; .fn-n ; .pkregs .rgn |
| `999px` | 4 | stays: a round shape (knobs, swatches, pills), not a radius | .gchip ; .bsum .chip ; .trend-win .tchip ; .fplc |
| `99px` | 3 | stays: a round shape (knobs, swatches, pills), not a radius | input[type=range]::-webkit-slider-runnable-track ; input[type=range]::-moz-range-track ; input[type=range]::-moz-range-progress |
| `var(--r-win)` | 3 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | .win ; .sympick ; .fpick,.cpick |
| `11px` | 2 | stays as a pill for .fi-disc, .chipb | .fi-disc ; .chipb |
| `12px` | 2 | `--r-l` (8 px); stays as a pill for .stagechip | .dropzone>div ; .stagechip |
| `var(--cb-r)` | 1 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | input[type=checkbox] |
| `calc(var(--sw-h) / 2)` | 1 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | .chk>input[type=checkbox]:not(.colpick input),.switch>input[type=checkbox] |
| `calc(var(--r) + 2px)` | 1 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | .seg |
| `10px` | 1 | `--r-l` (8 px) | .anchor |
| `var(--r) 0 0 var(--r)` | 1 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | .tbgrp .tbt:first-child |
| `0 var(--r) var(--r) 0` | 1 | already a token (`--r` → `--r`, `--r-win` → `--r-l`, `--cb-r` → `--r-s`) | .tbgrp .tbt:last-child |
| `0 0 4px 4px` | 1 | `--r-s` (4 px) | .inled-pv.tex |

## Spacing: 27 values become 8 steps

Steps 2 / 4 / 6 / 8 / 12 / 16 / 24 / 32 px (`--sp-1` … `--sp-8`). Rule: the nearest step; a tie
goes down for padding (inside a control, density first) and up for margins and gaps (between
blocks, separation first). Negative values map by their size.

| Value | In padding | In margins and gaps | Becomes (padding) | Becomes (margins, gaps) |
|---|---:|---:|---|---|
| 0 px | 2 | 0 | 0 | 0 |
| 1 px | 11 | 13 | stays: a hairline adjustment | stays: a hairline adjustment |
| 2 px | 20 | 40 | `--sp-1` (2 px) | `--sp-1` (2 px) |
| 3 px | 25 | 22 | `--sp-1` (2 px) | `--sp-2` (4 px) |
| 4 px | 57 | 45 | `--sp-2` (4 px) | `--sp-2` (4 px) |
| 5 px | 25 | 18 | `--sp-2` (4 px) | `--sp-3` (6 px) |
| 6 px | 68 | 84 | `--sp-3` (6 px) | `--sp-3` (6 px) |
| 7 px | 16 | 8 | `--sp-3` (6 px) | `--sp-4` (8 px) |
| 8 px | 70 | 73 | `--sp-4` (8 px) | `--sp-4` (8 px) |
| 9 px | 13 | 6 | `--sp-4` (8 px) | `--sp-4` (8 px) |
| 10 px | 53 | 45 | `--sp-4` (8 px) | `--sp-5` (12 px) |
| 11 px | 3 | 0 | `--sp-5` (12 px) | `--sp-5` (12 px) |
| 12 px | 26 | 25 | `--sp-5` (12 px) | `--sp-5` (12 px) |
| 14 px | 17 | 19 | `--sp-5` (12 px) | `--sp-6` (16 px) |
| 16 px | 6 | 7 | `--sp-6` (16 px) | `--sp-6` (16 px) |
| 18 px | 6 | 9 | `--sp-6` (16 px) | `--sp-6` (16 px) |
| 20 px | 1 | 0 | `--sp-6` (16 px) | `--sp-7` (24 px) |
| 22 px | 0 | 1 | `--sp-7` (24 px) | `--sp-7` (24 px) |
| 23 px | 1 | 0 | `--sp-7` (24 px) | `--sp-7` (24 px) |
| 24 px | 6 | 0 | `--sp-7` (24 px) | `--sp-7` (24 px) |
| 26 px | 0 | 1 | `--sp-7` (24 px) | `--sp-7` (24 px) |
| 28 px | 4 | 0 | `--sp-7` (24 px) | `--sp-8` (32 px) |
| 30 px | 2 | 1 | `--sp-8` (32 px) | `--sp-8` (32 px) |
| 31 px | 0 | 1 | `--sp-8` (32 px) | `--sp-8` (32 px) |
| 32 px | 2 | 0 | `--sp-8` (32 px) | `--sp-8` (32 px) |
| 37 px | 0 | 3 | stays: a layout dimension, not spacing | stays: a layout dimension, not spacing |
| 40 px | 2 | 0 | stays: a layout dimension, not spacing | stays: a layout dimension, not spacing |

Layout dimensions over 32 px (offsets and indents tied to a measured size): `37px` in .thr>.anchor, .replies, .rbox; `40px` in .dropzone>div, .doc.

## Colours in the CSS outside the token blocks

The token blocks hold 110 colour values, which are the tokens. Outside them the CSS has these:

| Selector | Property | Value | Becomes |
|---|---|---|---|
| `.btn.danger` | color | `#fff` | `--on-fill` (new: white in light, near-black in dark) |
| `:root[data-theme="dark"] .btn.danger` | color | `#1B0B07` | `--on-fill` |
| `.stepn.done` | color | `#fff` | `--on-fill`: white on dark mode's light green reads at 1.9:1 today |
| `.stepn.stale` | color | `#fff` | `--on-fill`: 1.8:1 on dark mode's amber today |
| `.badge` | color | `#fff` | `--on-fill`, on `--badge` (new) instead of `--pin`: white on `--pin` is 4.2:1 in light, 2.0:1 in dark |
| `.anchor .num` | color | `#fff` | `--on-fill` on `--badge`, as `.badge` |
| `.fn-w` | color | `#fff` | `--on-fill` |
| `.bsum .chip` | color | `#B26B00` | drop the fallback: `--warn` is always defined |
| `.btab .bst.bad .ic` | color | `#C23B22` | drop the fallback: `--bad` |
| `.btab .bst.warn .ic` | color | `#B26B00` | drop the fallback: `--warn` |
| `.exp-page` | background | `#fff` | stays: the export preview is the printed page, white in both themes |
| `.exp-page.clear` | background-color | `#fff` | stays: the page under a transparent export |
| `.exp-page.clear` | background-image | `#e6e8eb` | stays: the transparency checkerboard |
| `.exp-info.bad` | color | `#C23B22` | drop the fallback: `--bad` |
| `.cp-sv` | background | `#000` | stays: the colour picker's value gradient (black to the hue) |
| `.cp-sv` | background | `#fff` | stays: the colour picker's saturation gradient |
| `.cp-dot` | border | `#fff` | stays: the picker's handle must show on any colour; it has a dark ring too |
| `.cp-hue` | background | `#f00` | stays: the colour picker's hue strip (the spectrum itself) |
| `.cp-hue` | background | `#ff0` | stays: the colour picker's hue strip (the spectrum itself) |
| `.cp-hue` | background | `#0f0` | stays: the colour picker's hue strip (the spectrum itself) |
| `.cp-hue` | background | `#0ff` | stays: the colour picker's hue strip (the spectrum itself) |
| `.cp-hue` | background | `#00f` | stays: the colour picker's hue strip (the spectrum itself) |
| `.cp-hue` | background | `#f0f` | stays: the colour picker's hue strip (the spectrum itself) |
| `.cp-hk` | background | `#fff` | stays: as `.cp-dot` |
| `.cbtn>span` | background-image | `#ccc` | stays: the transparency checkerboard under a colour swatch |

## Colours in the script: 119 distinct

Counted by the definition they sit in (`kurve.html` after the `<script>` tag).

| Where | Distinct | What it is | Becomes |
|---|---:|---|---|
| `SCHEMES`, `PEAK_COLORS_LIGHT`/`DARK`, `SER_COLORS`, `ANNO_COLORS`, `CP_EXTRA`, the `mono` greys in `yTint` | 67 | the figure's colours: curve schemes, fitted-peak colours, the swatches offered for a curve or a label | stay: data, not interface. The default scheme changes (§3.5, data palette). |
| `CMAPS` | 29 | colour maps for heat maps and contours (viridis, magma, cool to warm, grey) | stay: published colour maps |
| `COL_TINTS_LIGHT`/`DARK` | 16 | the default curve colours today (the analysed curve in blue, the others in cool hues) | replaced by the data palette, `--c1` … `--c8`: they fail the palette check in both themes |
| `EXPORT_PAL`, the export and picture code (`#FFFFFF` fills), the report's own `<style>` | 9 + report | colours of a figure or a report printed on white | stay: an export is printed on white whatever the theme |
| `openColorPicker`, `cb`, `c` (a picker's fallback `#1d5fa8`, `#111820`) | 2 | the colour shown when a setting has none | `--data` and `--ink`, read from the light set (a figure's colours are light-set colours) |
| `avatarOf` (`#8a96a8`) | 1 | a person's placeholder picture | `--faint` |
| the peak draft's numbered dots (`#fff` text) | 1 | a number on a peak's coloured dot, on the graph | `--on-fill` |

**Unmapped CSS colours: 0.**
