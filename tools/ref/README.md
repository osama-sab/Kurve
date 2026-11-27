# The reference bench

Kurve's numbers checked against numbers Kurve did not compute (`ux/spec/PARITY_SPEC.md`, wave 0).

| What | Where |
|---|---|
| NIST's Statistical Reference Datasets, with their certified values | `nist/` (Norris, and the ANOVA sets SiRstv, SmLs01–09, AtmWtAg; copied from SciPy's tests, which ship NIST's own files) |
| Reference values made by SciPy, NumPy and statsmodels | `fixtures/*.json`, made by `make-fixtures.py` |
| The pure blocks of `kurve.html` under node | `run.mjs` (a module, and a program reading cases on stdin) |
| Kurve against the fixtures and NIST | `../ref-test.mjs` (node alone; part of the suite) |
| Random cases against SciPy | `diff-fuzz.py` (needs the Python packages) |
| Exact references shared by both | `refs.py` (rationals and 40-digit mpmath), `xps_ref.py` (Shirley's and Tougaard's backgrounds and the self-deconvolution in NumPy, written from the papers), `impl_ref.py` (implicit fits by orthogonal distance: each point's foot on a circle, an ellipse or a parabola found globally, the parameters polished with the distances' exact Jacobian) |

`node tools/ref-test.mjs` needs nothing but node: the fixtures are committed. It prints each
function's worst error against its target. A function short of its target fails unless
`TARGET` in `ref-test.mjs` names the slice of the plan that brings it there; it must then not get
worse than the error it was measured at (`now`), so an accuracy once reached is kept.

## Making the fixtures again

The Python packages are not in the repository. In a fresh cloud container (whose `pip` installs
for Python 3.13; the default `python3` is 3.11):

```sh
PYREF=/tmp/pyref                      # anywhere outside the repository
pip install --quiet --target "$PYREF" numpy scipy statsmodels
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py --check   # compare with the committed files
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py --slow    # also range.json: 40-digit studentized range and Dunnett (about half an hour, four cores)
PYREF=$PYREF python3.13 -I tools/ref/make-fixtures.py           # write them again
```

`--check` makes every case again and compares it with the committed file to 1e-13 relative; a
newer SciPy that answers differently is seen there, before any test is changed. The fixtures were
first made with Python 3.13.17, NumPy 2.5.4, SciPy 1.18.1 and statsmodels 0.15.0 (each file says
what made it). `scipy.odr` is deprecated from SciPy 1.17 and goes in 1.19; its successor is the
`odrpack` package, the same Fortran.

NIST's site (`www.itl.nist.gov`) holds the certified values SciPy and statsmodels do not ship.
It answered on 14.11 (wave 4), and its files are committed in `nist/`: the linear sets (Norris,
Pontius, Filip, Longley, Wampler 1–5, NoInt1–2), the univariate ones (Lew, Lottery, Mavro, Michelso,
NumAcc1–4, PiDigits), the ANOVA ones (SiRstv, SmLs01–09, AtmWtAg) and the 27 nonlinear ones (Misra1a
to Bennett5), each read by the tests as NIST wrote it.

## Wave 5's references

`tools/ref/sig_fixtures.py` makes `fixtures/sig-*.json` (signal processing and mathematics, `ux/spec/SIGNAL_SPEC.md`) from
NumPy, SciPy, statsmodels and PyWavelets, apart from `make-fixtures.py` so a slice's references are made in seconds; `--check` and
`--only` as there. It needs PyWavelets beside the others (`pip install --target "$PYREF" PyWavelets`). First made with Python
3.13.18, NumPy 2.5.5, SciPy 1.18.1 and PyWavelets 1.8.0. `ref-test.mjs` judges each array by its worst error over the
reference's largest |value| (a `scale` given where the answer is rounding, as a detrended residual), a complex one over its
largest modulus, a refusal of SciPy's as one of Kurve's.

## Wave 6's references

`tools/ref/mv_fixtures.py` makes `fixtures/mv-*.json` (many variables, `ux/spec/MULTI_SPEC.md`) from NumPy, SciPy, scikit-learn and
statsmodels, and from mpmath at 40 digits for Hilbert matrices and graded ones; `--check` and `--only` as there. It needs
scikit-learn beside the others (`pip install --target "$PYREF" scikit-learn`; 1.9.1 on 19.11). A factorisation is judged by its
values over the largest, its vectors by their angle to the reference's times their gap (a group of equal values by the part of
Kurve's vectors outside the reference group's span; on a matrix's longer side the gap is to 0 too, Wedin's bound, as no method
knows those vectors better), and its reconstruction and orthogonality from Kurve's own answer.

The suite's menu crawl (`tools/ux/crawl.py`) needs Python's `playwright` package of the same version as node's (1.63.0 on
18.11: `pip install --target "$PYREF" playwright==1.63.0`; the browser already installed is used, nothing is downloaded).
`tools/suite.sh` puts `$PYREF` on its path.

## ImageJ's references (QUDI_SPEC)

`node tools/ref/ij_fixtures.mjs` writes a TIFF of each test matrix with Kurve's `matTiff`, reads them with `tools/ref/ij_read.py`
(`python3.13 -I`, Pillow on the path: Pillow's pixels and tags, and ImageJ 1.54f's reading of them written out from its source)
and writes `fixtures/imagej.json` with each file's SHA-256, which ref-test checks matTiff still writes. `tools/ref/ij/IJRef.java`
is the same readout from ImageJ itself, for where its jar may be run (not run in this repository's checks: the environment that
built them refused it). The same script measures (QUDI_SPEC Q.3): `jobs.json` beside the TIFFs names regions, and each is measured by
ImageJ's Measure written out from its source (its FloatStatistics' raw sums, OvalRoi's mask, PolygonFiller with float corners) and by
the same definitions in exact rationals, which ref-test judges Kurve's `ijMeasure` against. And it finds maxima and profiles
(QUDI_SPEC Q.4): `jobs.json` names each image's Find Maxima settings and lines, run through MaximumFinder and ProfilePlot written
out from ImageJ's source with its float arithmetic where it is float; ref-test judges `ijMaxima` and `ijProfile` against them,
exactly. `tools/ref/spot_fixtures.py` (QUDI_SPEC Q.5) writes a realistic NV scan in qudi's classic format into `tools/ref/qudi/nv/`
and `fixtures/spots.json`: six cases of Kurve's spot model worked out again from its definitions (seeds from ImageJ's port, windows,
groups, Poisson's maximum likelihood, splitting) with SciPy's least_squares; ref-test's `spotFit.*` judge `spotFit` against them.
`tools/ref/profile_fixtures.py` (QUDI_SPEC Q.6) works out a profile across a width again (ImageJ's samples, the mean across, each
sample's error through the interpolation's weights) and fits it with SciPy's curve_fit given the samples' covariance, on the NV scan,
an edge in counts and a noise-free spot: `fixtures/profile.json`, judged by ref-test's `kProfile.*`.
`tools/ref/shift_fixtures.py` (QUDI_SPEC Q.8) is the registration of two scans in NumPy, written from Guizar-Sicairos, Thurman and
Fienup (2008), on synthetic scans and a back scan of the NV scan: `fixtures/shift.json`, judged by ref-test's `regShift.*`.
`tools/ref/ij_display.py` (IMAGE_SPEC I.3) is ImageJ 1.54f's display of a 32-bit image written again in Python from its source (read as
text): LutLoader's tables (fire and ice from their 32 entries by its interpolate, spectrum by java.awt.Color.HSBtoRGB in float32), HiLo,
FloatProcessor.create8BitImage, FloatStatistics' 256 bins, ContrastAdjuster's Auto over twelve presses and its four sliders,
ContrastEnhancer's saturation, on eight matrices (the NV scan, empty cells, one value, a range of millions, thirds single precision
rounds, small counts, none); `fixtures/ij-display.json`. ref-test's `ijLut.tables`, `ijHist.bins`, `ij8.index`, `ijAuto.range`,
`ijEnhance.range` and `ijBC.sliders` must be exact.
`tools/ref/ij_process.py` (IMAGE_SPEC I.5) is ImageJ 1.54f's Process menu on a 32-bit image written again in Python from its source,
float32 where Java computes in float and Python's float where it computes in double: FloatProcessor.filter3x3 (Smooth, Sharpen, Find
Edges), GaussianBlur (makeGaussianKernel, convolveLine, and past σ 8.5 its down- and upscaling), RankFilters (makeLineRadii, the padded
cache, Mean and Variance from its double sums kept as it keeps them, Minimum, Maximum, the NaN-aware Median), UnsharpMask,
BackgroundSubtracter (the rolling ball, shrunk and enlarged, and the sliding paraboloid with its corners), Math, and Kurve's own empty
cells left out, on eight images and 122 operations; `fixtures/ij-process.json`. ref-test's `ijProcess.*` (filter3x3, gauss, unsharp,
rank, bg, math, skip) count the cells that differ and must be 0.
`tools/ref/ij_threshold.py` (IMAGE_SPEC I.6) is ImageJ 1.54f's AutoThresholder (its sixteen methods and bilevel; Java's int arithmetic
where it has it, numpy's float64 for its doubles so a log of 0 is −∞) and setAutoThreshold of a 32-bit image (resetMinAndMax,
create8BitImage, the byte histogram, scaleAndSetThreshold), written again from the source, on 32 histograms and four images;
`fixtures/ij-threshold.json`. ref-test's `ijThreshold.methods` and `.levels` count the cases that differ and must be 0.
`tools/ref/ij_particles.py` (IMAGE_SPEC I.6) is ImageJ 1.54f's Analyze Particles written again from its source: ParticleAnalyzer's scan
and fill, Wand.autoOutline (threshold and legacy mode), PolygonFiller, FloodFiller.particleAnalyzerFill, getTracedPerimeter,
EllipseFitter, FloatPolygon.getConvexHull, Roi.getFeretValues and Analyzer's circularity, AR, Round and Solidity, on four images
(shapes with a hole and a particle inside it, a diagonal line, a pixel, one on the edge; Poisson spots; a smoothed random field; cells
2 by 0.5 with empty cells) and 18 settings (holes, edges, sizes, circularity, ranges from below and between): 244 particles;
`fixtures/ij-particles.json`. ref-test's `ijParticles.cells` (count and cells, exact), `.shape` (1e-14) and `.stats` (1e-14).

`tools/ref/ij_scalebar.py` (IMAGE_SPEC I.7) is ImageJ 1.54f's Scale Bar, its numbers and its composite written again from its source:
ScaleBar's computeDefaultBarWidth, Utils.round and getDigits and the positions of the bars, the text and the boxes; IJ.d2s as
DecimalFormat with half-even rounding (Python's Decimal of the double); CompositeImage's COMPOSITE mode through
ImageProcessor.updateComposite with Java's int arithmetic, the tables from `fixtures/ij-display.json`. It writes
`fixtures/ij-scalebar.json`; ref-test's `ijScaleBar.numbers`, `ijScaleBar.bars` and `ijComposite.colours` (exact).
Usage: `PYREF=$SC/pyref python3.13 -I tools/ref/ij_scalebar.py`.

`tools/ref/plot2_fixtures.py` (PLOT2_SPEC 7.1) is the charts of categories' numbers: each category's mean against exact rationals, its
SD and SE, the t interval by SciPy, the median and quartiles (NumPy's linear) and the median's interval from the order statistics as
the sign test gives it; the pies' shares and slices' ends from exact sums. `fixtures/plot2-cats.json`; ref-test's `catSummary.values`,
`.order` and `pieSlices`.
`tools/ref/plot2_stats.py` (PLOT2_SPEC 7.2) is the statistical charts': the control charts' constants d₂ and d₃ from the range's
distribution in mpmath at 24 digits (d₂ one integral, E[R²] = ∫ 2w P(R > w) dw by Gauss–Legendre panels at two orders agreeing to
1e-17; Φ at each node worked out once for every n), c₄ by the gamma function, checked against Montgomery's table; eleven charts written again from Montgomery (2019) with the
rules in plain Python; Pareto by pandas; Bland and Altman (1999) in NumPy; statsmodels' `combine_effects` (τ² truncated at 0 where
statsmodels leaves it below, as DerSimonian and Laird do, and its table asked for the level); Q–Q plots with the Weibull and gamma
fitted at 30 digits (SciPy's fits, a few parts in 10⁵ short, a check), the quantiles and the band by SciPy. `fixtures/plot2-stats.json`
(the constants kept as they come in `fixtures/.ctrl-const2.json`, so a run cut short starts where it stopped); ref-test's `ctrlConst`,
`ctrlChart.limits`, `.rules`, `paretoOf`, `blandAltman`, `metaAnalysis`, `qqData.quantiles` and `.fit`.

`tools/ref/plot2_polar.py` (PLOT2_SPEC 7.3) is the polar graphs': a point (θ, r) as ρ·e^{iφ} from the definition in mpmath at 40 digits
(not Kurve's sines and cosines), every unit (degrees, radians, gradians), zero and direction, holes, sectors (across the zero too), a
turned zero and a box too small; the region fitted into the box from its arcs' extremes; the inverse by arg and |z|; the joins the
short way round in pieces of 3°. `fixtures/plot2-polar.json`; ref-test's `polarFrame`, `polarFwd` (pixels), `polarInv` (the arc off
in units of the radius, r along R(1 − hole) less its last bit), `polarJoin`; the fuzzer's `polarFlat` imports its functions.

`tools/ref/plot2_ternary.py` (PLOT2_SPEC 7.4) is the ternary graphs': each row's parts over their exact sum, its place the corners
weighted by them in mpmath at 40 digits, checked there against python-ternary's projection as its source writes it (written out, not
run); the grid lines and ticks from their definitions, the inverse by areas; fractions, percentages, counts of any size, parts from
1e-200 to 1e200 and the rows with no place. `fixtures/plot2-ternary.json`; ref-test's `ternFrame`, `ternFwd`, `ternGrid`, `ternInv`; the
fuzzer's `ternFlat` imports its functions.

`tools/ref/plot2_vectors.py` (PLOT2_SPEC 7.5) is the arrows' and radar charts': an arrow's end from its point, angle (degrees or radians,
of many turns) and length at a scale, its head's corners, in mpmath at 40 digits; a radar chart's frame and each value's corner along
its spoke, none outside the range. `fixtures/plot2-vectors.json`; ref-test's `vecEnd`, `vecHead`, `radarPlace`; the fuzzer's `vecFlat` and
`radarFlat` import its functions.

ImageJ's own readout, where its jar may be run:

```sh
javac -cp ij.jar -d /tmp/ijref tools/ref/ij/IJRef.java
echo "open /path/to/file.tif" | java -Djava.awt.headless=true -cp ij.jar:/tmp/ijref IJRef
```

## The fuzzer

```sh
PYREF=$PYREF python3.13 -I tools/ref/diff-fuzz.py [seed] [cases per function]
```

Makes random inputs from a seed (values spread over many orders of magnitude, edges, ties), runs
each through Kurve's function (one `node tools/ref/run.mjs` for all of them) and through SciPy,
and reports every case past its tolerance with the seed that makes it again. It ends 1 when
something failed.

## Adding a function

1. Its cases in `make-fixtures.py` (from a fixed seed), and the file made again.
2. Its target in `TARGET` in `ref-test.mjs`, and its check there.
3. Its generator in `diff-fuzz.py`.
4. A new function of Kurve is called through `run.mjs` by its name: nothing needs listing.
