# Wave 7: plots

The seventh wave of `PARITY_SPEC.md`. What Origin's Plot menu draws that Kurve does not: charts of
categories (7.1), statistical charts (7.2), polar (7.3) and ternary (7.4) graphs, vectors and radar
charts (7.5), more Y axes (7.6), graph templates (7.7), and 3D last (7.8). This spec is the wave's:
what Origin does, where Kurve stands, the decisions, the data model, the order, and each slice with
what it changes, how it is checked and what it leaves out. It follows the plan's bar
(`PARITY_SPEC.md`, "The bar"), information hygiene (`ux/UX_SPEC.md` §3.8) and numbers, not verdicts
(STATS_SPEC decision 9), none of which are repeated here.

Origin's documentation could not be opened from this session (its hosts are refused here, as for
waves 1 to 6: `curl` to www.originlab.com, CONNECT 403); what follows rests on Origin's help as
remembered, and the points to check in Origin itself are marked *(to confirm)*:
[Pie charts](https://www.originlab.com/doc/Origin-Help/Pie-Chart),
[Polar graphs](https://www.originlab.com/doc/Origin-Help/Polar-Graph),
[Ternary graphs](https://www.originlab.com/doc/Origin-Help/Ternary-Graph),
[Control charts](https://www.originlab.com/doc/Origin-Help/Control-Chart),
[Graph templates](https://www.originlab.com/doc/Origin-Help/Graph-Templates),
[3D graphs](https://www.originlab.com/doc/Origin-Help/3D-Graphs).

## How Origin does it

- **Categories.** Column and bar charts take a text column as X: each level a place, the values
  of the rows of a level drawn side by side (grouped) or on each other (stacked, or stacked to
  100 %). Graph Maker (Pro) drags columns onto X, Y, Group, Colour, Panel, so a long table becomes
  a chart per level of a column, in panels sharing their axes (a trellis). Statistics' charts of
  categories: Column Scatter (each value a dot, jittered or in a beeswarm), Interval Plot (each
  group's mean with its SD, SE or confidence interval, as a point or a bar), Box and Half Box with
  the data beside it *(to confirm the names)*.
- **Pie and doughnut.** One column of values (and one of names): each row a slice, its size the
  value's share; labels of the name, the value and the percentage, inside or outside with leader
  lines; the first slice's angle, clockwise or not; a slice pulled out; a 3D look *(left out)*; a
  doughnut is a pie with a hole, several columns concentric rings *(to confirm)*.
- **Statistical charts.** Q–Q and probability plots against several distributions with a reference
  line and a confidence band *(to confirm the band)*; the scatter matrix; Pareto charts (counts or
  values sorted, the running percentage on a right axis); quality control charts (X̄ and R, X̄ and
  S, individuals and moving range, p, np, c, u; the limits from the data or typed; the Western
  Electric rules marked) *(to confirm the rules offered)*; Bland–Altman (the difference against the
  mean, the bias and the limits of agreement with their intervals); interaction plots; dendrograms
  and the heat map with dendrograms; forest plots of a meta-analysis *(to confirm: an app)*.
- **Polar.** θ(X) r(Y) or r(X) θ(Y); θ in degrees or radians; where zero is and which way round;
  the radial range and its start (a hole in the middle); grids of circles and spokes; lines,
  symbols, filled areas; the radial axis's numbers along a spoke. A polar contour from a matrix
  *(to confirm)*.
- **Ternary.** Three columns, each row normalised to its sum (to 1 or to 100); the triangle's
  three axes clockwise or anticlockwise *(to confirm)*, each with ticks and a title; grid lines
  parallel to each side; symbols, lines, and a ternary contour *(left out)*.
- **Vectors and radar.** Vector XYAM (a start, an angle and a length) and XYXY (two ends), the
  arrows' heads and a length scale; radar (spider) charts, each column a spoke, each row a polygon,
  or each row a spoke *(to confirm which)*.
- **More axes.** Layers linked to the first, a Y axis each, offset outward; Plot setup puts any
  curve on any layer; templates of 3 or 4 Y axes.
- **Graph templates.** A graph saved as a template (`.otpu`) keeps its layers, axes, styles and
  how many curves of which kind; Plot into a template picks it from a list, and the graph is
  made from it with the columns selected; a template can be the default for a kind of plot.
- **3D.** Surfaces from a matrix (colour map, wireframe, the contour projected under it), 3D
  scatter with drop lines, 3D bars, waterfalls; rotated by dragging; OpenGL on screen, exports
  as vectors where possible *(to confirm)*.

## Where Kurve stands

- **Drawing**: `buildPlot` draws a Cartesian graph with layouts (overlay, offset, stacked panels,
  two Y axes, heat map, box, violin), plot types (line, symbols, line and symbols, drop lines,
  columns, area, steps, a map from scattered X, Y, Z), groups, names along X (`ax.x.cats`, or a
  categorical X column's levels by `xCatPos`), stacked columns (`cfg.colStack`), boxes grouped by a
  column (`cfg.distBy`, text allowed) and notched, histograms with a distribution, a second X and a
  second Y axis in other units, breaks, insets, figures of panels with shared axes.
- **Categories**: text and categorical columns (FOUNDATION_SPEC 1.2), their levels in a stated
  order (`catLevels`); Plot setup's *Group by* makes a derived column per level (`psuSplit`), each a
  curve, the curves of a column a group stepping the colour.
- **Statistical charts already there**: the normal Q–Q plot of a normality analysis (`anaQQ`), the
  scatter matrix of a correlation (`anaScatter`), the means plot of a one-way ANOVA, the interaction
  and main-effects plots (2.6), the profile plot (2.7), ROC curves (2.12), PCA's plots and the
  dendrogram as a curve (6.2, 6.3), the partial residual plots (4.2). Each is a report's action that
  draws a graph from the analysis's result columns, one undo step.
- **Not there**: pies, polar, ternary, vectors, radar, a Y axis beyond the right one, templates, 3D,
  and the statistical charts above that are not.

## Decisions

1. **New kinds are layouts.** Pie, polar, ternary, radar, the category charts and 3D are values of a
   graph's `layout`, as the heat map and the box chart are, so a graph keeps one list of curves and
   everything that works on a graph (the Format pane and saved styles, figures, pictures, every
   export, the History's box, undo) works on them. Each new layout has its own drawing function,
   called by `buildPlot`, which shares the graph's text styles, title, legend, annotations pinned to
   the plot, and the readout (`S.geo` with a `toData` of its own). A curve keeps its own data; a
   layout only says how it is drawn.
2. **Categories come from text.** A category is a level of a text or categorical column, in that
   column's order (`catLevels`), else a number's value; a chart of categories never invents an
   order. Values in a level are aggregated only by a statistic the chart names (the mean, the sum,
   the count, the median) and the interval it names (SD, SE, a confidence interval at a level), each
   said on the axis title and in the readout.
3. **Statistical charts are analyses.** A control chart, a Pareto chart, a Bland–Altman plot and a
   forest plot are worked out by an analysis kind (the ANA block: a result sheet, a report, followed
   when the data change, in the worker when large) and drawn from its result columns by the report's
   action, as the Q–Q plot is. So their numbers have references and fixtures, and the graph is
   ordinary columns anyone can restyle or plot again.
4. **Numbers, not verdicts.** A control chart marks the points that break a rule and names the rule
   in the readout; it never says "in control". A Bland–Altman plot draws the limits of agreement; it
   never says "the methods agree".
5. **Polar and ternary are coordinates, not pictures.** A point's place is computed from its values
   by stated formulas (polar: x = r cos θ, y = r sin θ after the zero and the direction; ternary:
   each row divided by its sum, the point the barycentric combination of the triangle's corners),
   and the readout inverts them. Values a coordinate cannot take (r below the radial minimum, a
   negative part, a row summing to zero) are left out, counted, and said.
6. **More axes generalise the right axis.** A curve's `use.ax` is "r" (the right axis, as now) or
   "y3", "y4" (further axes, each left or right, set off outward by their own block); the left axis
   stays the active curve's. No free layers (PARITY decision 6).
7. **A template is a style plus a mapping.** A saved style (format) and what Plot setup chose: the
   kind, each role's column by name or by place, the layout (a figure's grid, shared axes, which
   curve on which axis). Plot into a template makes the graph from the columns selected; what the
   template needs and the selection lacks is said before anything is made. Kept in the project or
   the browser, as saved styles are.
8. **3D is drawn by Kurve.** An orthographic projection turned by two angles (and a perspective
   option), the box and its axes, surfaces as polygons sorted back to front (the painter's
   algorithm, each cell split in two triangles where it folds), on screen to a canvas, in an export
   as SVG and PDF polygons up to a budget (40 000), past it as an image inside the vector file, said
   (PARITY decision 7). Lines and symbols are vectors always.
9. **The readout everywhere.** Every new kind names what is under the pointer in its own terms (a
   slice's name, value and share; θ and r; the three parts; a spoke's value; a point's X, Y, Z), and
   the status bar's statistics of a selected curve are unchanged.

## The data model

- `g.plot.layout`: new values `"dot"`, `"mean"`, `"catbar"` (7.1, the box family: `isDistLayout`
  grows), `"pie"` (7.1), `"polar"` (7.3), `"ternary"` (7.4), `"radar"` (7.5), `"3d"` (7.8).
- Category charts (7.1), in `FMT_KEYS`: `distStat` (`mean`, `median`, `sum`, `count`), `distErr`
  (`none`, `sd`, `se`, `ci`), `distConf` (a level, 95 by default), `distMark` (`point`, `bar`),
  `distJoin` (a line through the means of one curve), `dotKind` (`jitter`, `swarm`, `stack`), with
  `distBy`, `distPts`, `colStack` as now.
- Pie (7.1): `pieStart` (degrees, the first slice's start, 90 the top), `pieCw` (clockwise),
  `pieHole` (0 to 0.8, a doughnut's hole as a fraction of the radius), `pieLab` (a list of `name`,
  `value`, `pct`), `pieLabPos` (`inside`, `outside`, `auto`), `pieDec`, `pieSort` (`data`, `desc`);
  per curve `series[id].pull` (`{row: fraction}`, a slice pulled out). Every curve on the graph a
  ring, the first the outermost.
- Trellis (7.1): Plot setup's *Group by* with *Panels* makes a figure, a panel per level, X and Y
  shared.
- Analysis kinds (7.2, the ANA block): `ctrl` (control charts), `pareto`, `bland`, `meta` (a
  forest plot's numbers), each with its result sheet and report actions; the Q–Q plot grows other
  distributions and a band (the `norm` kind's `qq`, and a `qq` kind of its own); `heatDendro` is a
  report action of hierarchical clustering (6.3) that draws a figure: the dendrograms and the map.
- Polar (7.3), in `FMT_KEYS`: `polMap` (`theta-r`: X is θ, Y is r; `r-theta`), `polUnit` (`deg`,
  `rad`, `grad`), `polZero` (`e`, `n`, `w`, `s`), `polCw`, `polR0`, `polR1` (the radial range;
  empty automatic), `polHole` (a fraction of the radius left empty), `polT0`, `polT1` (a sector),
  `polGridR`, `polGridT`; the radial axis styled as `ax.y`, the angular as `ax.x`.
- Ternary (7.4): the curve's Y is the first part, `series[id].tB` and `series[id].tC` the columns of
  the other two (a column id each, set in Plot setup as roles *B* and *C*); `ternSum` (1 or 100),
  `ternCw`, the three axes `ax.ta`, `ax.tb`, `ax.tc` (title, ticks, numbers, grid).
- Vectors (7.5): a curve's `series[id].vec` (`{kind: "am"|"xy", a, m}` or `{kind: "xy", x2, y2}`:
  column ids), `vecHead`, `vecScale`. Radar (7.5): `radarBy` (`cols`: each curve a spoke and each row
  a polygon; `rows`: each row a spoke and each curve a polygon), `radarFill`, `radarR0`, `radarR1`.
- More axes (7.6): `use[id].ax` `"r"`, `"y3"`, `"y4"`; `ax.y3`, `ax.y4` as `ax.y2` with `side`
  (`l`, `r`) and `off`.
- Templates (7.7): `p.templates` (in `UNDO_KEYS`) and the browser's `kurve.templates`, each `{id,
  name, at, by, fmt (a saved style), kind, layout, roles [{role, by: "name"|"place", name, place}],
  curves [{y, x, e, ax, grp, type}], fig {rows, cols, shareX, shareY} | null}`.
- 3D (7.8): layout `"3d"` with `g.plot.d3 = {az, el, persp, box, wire, proj}` and the curves' or
  the matrix's data; its spec, `ux/spec/D3_SPEC.md`, written when it starts.

## The order

7.1 categories (pie, the box family's dot, mean and bar charts, the trellis) → 7.2 statistical
charts (analyses drawn by 7.1's charts and the existing graph) → 7.3 polar (the first non-Cartesian
frame; its drawing function is the model for the next) → 7.4 ternary → 7.5 vectors and radar →
7.6 more axes → 7.7 templates (they remember what 7.1 to 7.6 made) → 7.8 3D. Each slice is
committed and pushed when its checks pass; the wave ends as every wave does.

## References, by slice

| Slice | Outside reference | Tolerance |
|---|---|---|
| 7.1 | the shares and angles from their definitions (exact rationals in Python); each group's mean, SD, SE and the t interval by NumPy and SciPy (`scipy.stats.t.ppf`); a beeswarm's points no closer than a symbol's width (a property) | 1e-14; angles 1e-12 of a turn |
| 7.2 | control-chart constants d₂, d₃, c₄ and A₂, A₃, B₃, B₄, D₃, D₄ from their integrals at 40 digits (mpmath), and against ASTM E2587's table; each chart's limits and the Western Electric rules written from Montgomery (2019) in NumPy; Pareto by pandas; Bland and Altman (1999)'s bias, limits and their intervals in NumPy; `statsmodels.stats.meta_analysis.combine_effects` (fixed, DerSimonian–Laird; Q, I², τ²); `scipy.stats.probplot` and the order statistics' beta quantiles for the Q–Q band | 1e-12; constants 1e-15 |
| 7.3 | polar to Cartesian and back from the formulas, at every zero and direction (NumPy); the drawn points' places read from the SVG | 1e-9 of a pixel |
| 7.4 | barycentric coordinates (NumPy, and `python-ternary`'s formula as written in its source, not run); the grid's lines from their definitions | 1e-12 |
| 7.5 | arrows' ends from (x, y, angle, length) by NumPy; a radar polygon's corners | 1e-12 |
| 7.6 | each axis's mapping (a curve drawn on y3 against its own range) | exact |
| 7.7 | a graph made from a template equal to the graph it was saved from, setting by setting | exact |
| 7.8 | the projection by NumPy's matrices; the painter's order against a depth sort of the polygons' centres; surfaces of known functions | 1e-12 |

Each slice adds its fixtures (`tools/ref/plot2_fixtures.py`, `tools/ref/fixtures/plot2-*.json`) where
there are numbers, its targets to `targets.json`, and its drive (`tools/plot2-drive.mjs`, one
section a slice, `ONLY=7.1`) that clicks every control the slice adds, reads the drawn SVG back
against the formulas, exports to SVG, PNG and PDF, undoes, reloads and checks junk from storage.

## Budgets

A pie of 200 slices, a dot plot of 50 000 values in 20 categories, a polar graph of 200 000 points
and a ternary graph of 50 000 points each drawn in under 60 ms on screen; a control chart of 10⁵
subgroups worked out in under 0.5 s; a 3D surface of 200 × 200 cells turned at 30 frames a second
on screen. `perf.mjs` gains each.

## 7.1 Categories

Done 26.11, as below, with these changes of plan: a slice is pulled out by a double-click or its right-click, not a Pull tool
(the double-click edits in place everywhere else on the graph); groups along X follow a categorical column's own order, else
numbers rising then text in its natural order (as the box chart's grouping always has: "the column's order" meant that); a
beeswarm that would need more than 1.6 times its room is laid in rows instead and says so (past that it is unreadable, and its
places took a third of a second to work out for 50 000 values); a text, arrow or box added on any chart of categories is pinned to
the plot (on a box chart it was saved and not drawn). Measured: the means, SDs, SEs and t intervals to 8.5e-16 of the values' scale
against exact rationals and SciPy, the order statistics and the median's interval exactly, the pies' shares and slice ends to
2.2e-16; every slice's angles read back from the drawing to a hundredth of a degree; a pie of 200 slices in 9 ms and a beeswarm of
50 000 values in 20 categories in 42 ms.

**What.**
- **Pie and doughnut** (layout `pie`; Plot › Pie chart, Plot setup's card, a curve's Plot type
  menu's layouts): each point of a curve a slice, its value its size (a value of zero or below, or
  missing, left out and counted in the readout's note), its name the X column's text or level, else
  the curve's label column (`use.lab`), else its row number; labels of the name, value and share
  (`pieLab`), inside, outside with a leader, or automatically outside when a slice is too thin;
  the first slice's start and the direction; a hole for a doughnut; slices in the data's order or
  largest first; a slice pulled out by a click on it in the Pull tool or its right-click (*Pull
  out*, *Put back*), one undo step; the slices in the legend (each its colour, the scheme's,
  stepping through the curve's points); several curves concentric rings, the first outside. The
  readout: the slice's name, value and share of its ring.
- **Charts of categories** (the box family: `dot`, `mean`, `catbar`): each curve, or each group of
  `distBy` (a text column's levels, in its order), a category along X. *Dot plot*: every value a
  dot, jittered (the same jitter every time), in a beeswarm (dots packed side by side, none
  overlapping), or stacked in columns of a bin's width. *Means with intervals*: each category's
  mean (or median, sum, count) as a point or a column, with its SD, SE or a confidence interval at a
  level (the t interval), the values beside it if asked, the means of a curve joined by a line if
  asked. *Columns by category* is the same chart drawn as columns, side by side by curve, or
  stacked (`colStack`), so a long table (a value, a category, a group) is a grouped or stacked
  column chart through Plot setup's *Group by* without a pivot. The axis title says what is drawn
  ("Mean of Yield (t/ha), 95 % interval").
- **Trellis**: Plot setup's *Group by* has *Show the levels as* — *Curves on one graph* (as now) or
  *Panels* (a figure, a panel per level, named after it, X and Y shared, in the level's order).

**Checks.** A pie's slice angles equal 360° times each share (read from the SVG paths' arcs), the
labels the shares to the decimals chosen; a slice pulled out moved along its bisector; zero and
negative values left out and said; a doughnut's hole; rings; the legend; export to PDF keeps the
arcs as curves; each category's mean, SD, SE and t interval against NumPy and SciPy; a beeswarm's
dots apart; *Columns by category* stacked equal to the sums; the trellis's panels, one per level,
sharing X and Y; undo of each; junk in every new key from storage; the readout.

**Leaves out.** 3D pies; a pie of a text column's counts without a Frequency counts analysis (made
in one step from it); exploded slices dragged by the pointer (a click pulls by a fixed fraction,
typed in the menu).

## 7.2 Statistical charts

Done 27.11, as below, with these changes of plan: the Q–Q plot is a kind of its own (`qq`), the normality tests' Q–Q columns
left as they were; the heat map is the hierarchical clustering's report action, with the analysis keeping its matrix (its `p.heat`)
so the map follows the data, and a matrix's map takes names along its axes; a Pareto chart's names along X come from its text X,
not `ax.x.cats`; graphs made one by one into a figure take their windows' room together (`stFigure`); the dialogs' lists start from
the columns ticked. Measured: the constants to 1.6e-15 of 24 digits (d₃ from the range's density; by E[R²] − d₂² it was up to 9e-15), the charts'
limits 3.7e-15 and their rules exactly, Pareto exactly, Bland–Altman 1.0e-15, the meta-analysis 6.0e-15, the Q–Q quantiles 6.1e-15
(from the upper tail near 1) and fits 1.2e-14; each run rule's false alarms at its exact rate.

**What.**
- **Q–Q plots further**: against the normal, log-normal, exponential, Weibull and gamma
  distributions (parameters by maximum likelihood, said), the plotting positions chosen (R's
  `ppoints`, Filliben's, Blom's), the reference line, and a pointwise band at a level from the order
  statistics' beta distribution, as columns of the result sheet and drawn with the points.
- **Pareto charts** (kind `pareto`): a text column's levels counted, or a value column summed per
  level, sorted from the largest, the running percentage; drawn as columns with the running
  percentage as a line on the right axis (0 to 100 %), the levels' names along X.
- **Control charts** (kind `ctrl`): X̄–R, X̄–S, I–MR, p, np, c, u; subgroups by a column or a size;
  the centre line and limits from the data (the constants d₂, d₃, c₄ worked out, not tabled) or
  typed; Western Electric's four rules (and Nelson's eight, chosen) marked on the points that break
  them, each mark naming its rule; the chart a figure of two panels where it has two (X̄ and R).
- **Bland–Altman** (kind `bland`): two columns' differences against their means (or ratios, or
  percentages), the bias with its confidence interval, the limits of agreement with theirs (Bland
  and Altman 1999), drawn as lines and a shaded band.
- **Forest plots** (kind `meta`): each study's estimate with its interval (from an SE or the
  interval's ends), the fixed and DerSimonian–Laird pooled estimates, Q, I², τ²; drawn with the
  studies' names along Y (`ax.y.cats`, the names-along-Y twin of the X axis's), squares sized by
  weight, a diamond for each pooled estimate, a line of no effect.
- **Heat map with dendrograms**: hierarchical clustering's report draws its observations and
  variables as a matrix map with each side's dendrogram, a figure of three panels sharing axes.

**Checks.** The references table's; each chart drawn from its result columns (the limits as lines at
their values, the marks at the points the rules name); a follow after a value changes; refusals
(fewer than two subgroups, a subgroup of one for R, a proportion over its size, a study with no
error); undo; a reload.

## 7.3 Polar

Done 27.11, as below, with these changes of plan: the circles and spokes are the graph's own switches, not the toolbar's Grid; the
angular axis's title is not drawn (the rim's units say it); the polar map is a matrix's only (a series of spectra keeps the heat
map). Measured: every place within 4.0e-13 px of 40-digit mpmath (the target was 1e-9 of a pixel), the inverse 1.4e-15 of the radius;
an angle of several turns reduced first, exactly.

**What.** Layout `polar`: each curve's X and Y as θ and r (or r and θ), in degrees, radians or
gradians, zero at the east, north, west or south, clockwise or not, a radial range with its start
and a hole, a sector of the circle; lines (joined along θ, across the 360° seam the short way),
symbols, an area filled to the centre, error bars in r; a grid of circles and spokes; the radial
axis's numbers along a spoke, the angle's round the rim; the readout θ and r; the zoom the radial
range (the wheel), the pan the rotation of the zero (a drag with the Pan tool). A matrix drawn as a
polar map (X its angle, Y its radius).

**Checks.** Every point at r cos θ, r sin θ for every zero and direction; the seam; the hole; a
sector; the readout's inverse; export to PDF; undo; the matrix's map.

## 7.4 Ternary

**What.** Layout `ternary`: a curve's three parts (Y and the columns marked *B* and *C*), each row
normalised to 1 or to 100, a row with a negative part or a sum of zero left out and counted; the
triangle with its three axes clockwise or not, each with title, ticks, numbers and grid lines
parallel to a side; symbols and lines; the readout the three parts.

**Checks.** Barycentric places against NumPy; grid lines; the rows left out; Plot setup's B and C;
export; undo.

## 7.5 Vectors and radar

**What.** Vectors: a curve's points as arrows, from (X, Y) by an angle and a length, or to a second
point (X₂, Y₂), heads of the arrow kinds, a scale for the length and its key in a corner. Radar:
each spoke a variable, each polygon an observation (or the transpose), its own range or one for
all, filled or not, the readout the spoke's value.

## 7.6 More axes

**What.** Up to four Y axes: any overlaid curve but the active one on the right axis or on y3 and
y4, each left or right, set off outward, its own range, scale, ticks, title and colour; Plot setup's
Axis column and the curve's right-click list them; the Format pane has a page each.

## 7.7 Graph templates

**What.** *Save as a template…* (a graph's ⋯ menu, Figure › Templates): its saved style, kind,
layout and mapping, in the project or the browser; *Plot into a template* (Plot › Templates, Plot
setup's Kind gallery's own row): the graph made from the selected columns by the template's roles,
by name where the names match and else by place, what is missing said; renamed, copied, deleted,
used as the default for a kind.

## 7.8 3D, last

Its own spec (`ux/spec/D3_SPEC.md`): surfaces from matrices (coloured, wireframe, contours under
them), 3D scatter with drop lines, the 3D waterfall of a series; turned by dragging; exported as
decision 8 says.

## Left out of the wave

Free layers (PARITY decision 6); 3D pies and bars; maps of countries; a ternary contour; a smith
chart; stock charts (open, high, low, close); polar contour of scattered points; charts with
pictures as symbols.
