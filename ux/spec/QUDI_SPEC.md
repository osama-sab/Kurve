# qudi's confocal files and ImageJ's measurements

The user's request of 19.11: "Make it compatible with qudi Confocal data formats, it shouldn't lose the
positional information as well, I want to do some ImageJ statistics on the data as well". qudi is the
Ulm group's measurement suite for confocal microscopes (NV centres and the like); its confocal scans
are images of a count rate over x and y (or a depth), saved as text. This spec says what qudi writes,
what ImageJ measures, the decisions, and four slices, each checked against the programs themselves:
qudi's own writers make the test files, and ImageJ 1.54f, run headless, is the reference for every
number and for opening what Kurve writes.

## What qudi writes

**qudi (v0.x, `Ulm-IQO/qudi`, `logic/confocal_logic.py` and `logic/save_logic.py`).** A saved xy scan
is, per counter channel, `YYYYMMDD-HHMM-SS_confocal_xy_image_<channel>.dat`, and once
`…_confocal_xy_data.dat` (a depth scan: `confocal_depth_image_<channel>` and `confocal_depth_data`).
Each starts with a header written by `np.savetxt(…, comments='#')`, so each line begins with `#` and no space:

```
#Saved Data from the class ConfocalLogic on 19.11.2026 at 12h00m00s.
#
#Parameters:
#===========
#
#X image min (m): 1.0000000000000000e-06
#X image max (m): …            (and X image range (m))
#Y image min: …                (no unit written; it is metres too; and Y image max, Y image range)
#XY resolution (samples per range): 100
#XY Image at z position (m): …
#Clock frequency of scanner (Hz): …
#Return Slowness (Steps during retrace line): …
#
#Data:
#=====
#Confocal pure XY scan image data without axis.
#The upper left entry represents the signal at the upper left pixel position.
#A pixel-line in the image corresponds to a row of entries where the Signal is in counts/s:
1.234560e+03	…
```

(`Measured at POI: …` comes first among the parameters when a point of interest is active; a depth
image has Z image min, max and range, a Z resolution and `Depth Image at y position (m)`.) The image
file is the matrix `xy_image[:, :, 3 + n]`: a row a Y, from `image_y_range[0]` (the first row is the
smallest Y, despite the sentence about the upper left), a column an X; X and Y are
`np.linspace(min, max, n)` with the resolution on the longer side and the other side's count scaled
to the ranges' ratio, so the counts are the matrix's own shape. The data file has one row a pixel,
in the image's order (row-major), its columns `x position (m)`, `y position (m)`, `z position (m)`
and `count rate <channel> (Hz)` per channel, named on the last header line, numbers `%.6e`.

**qudi-iqo-modules (qudi ≥ 1.0, `qudi/logic/scanning_data_logic.py` with qudi-core's
`TextDataStorage`).** A saved scan is, per channel,
`YYYYMMDD-HHMM-SS_<n>D-scan with <axes> axes from channel <channel>.dat` (`back ` before the tag for
the scan back), its header an INI file written by `ConfigParser`, each line after `# `:

```
# [General]
# timestamp=2026-11-19T12:00:00.123456
# comments='# '
# delimiter='\t'
# column_dtypes=float;;float;;…
# column_headers='Image (columns is X, rows is Y)'
#
# [Metadata]
# x axis name='x'
# x axis unit='m'
# x scan range=(-5e-06, 5e-06)
# x axis resolution=100
# x axis min=-5e-06
# x axis max=5e-06
# … the same for y …
# pixel frequency=500.0
# scanner target at start={'x': 0.0, 'y': 0.0, 'z': 1e-06}
# measurement start='…'
# coordinate transform info=…
# z axis name='z'                (the other axes of the scanner, name and unit)
# ---- END HEADER ----
```

Every value is a Python `repr`. The data are `scan_data.data[channel]`, shaped `(nx, ny)` and indexed
`[ix, iy]`, written a row at a time: **a line of the file is one X and runs along Y**, whatever the
column header says (qudi's own picture of it transposes before drawing, origin lower). The channel
and its unit are in the file's name only. A 1D scan is one value a line.

## What ImageJ measures

ImageJ 1.54f (`ij/process/FloatStatistics.java`, `ij/plugin/filter/Analyzer.java`,
`ij/plugin/filter/MaximumFinder.java`, `ij/gui/ProfilePlot.java`). A pixel covers [i, i + 1) and its
centre is i + 0.5; the calibration turns pixels into units: x = (px − xorigin)·pixelWidth, and y the
same, or (yorigin − py)·pixelHeight with *inverty*. Analyze › Measure over a region (the image, a
rectangle, an oval, a polygon): Area (pixels × pixel area), Mean, StdDev (n − 1), Mode (for 32-bit
images the middle of the fullest of 256 bins between min and max; its lower edge when a bin is exactly 1 wide), Min, Max, Centroid (X, Y: the
pixels' centres), Center of mass (XM, YM: weighted by the values), Bounding rectangle, Integrated
density (Area × Mean) and its raw form (the sum), Median, Skewness and Kurtosis (its formulas from
the sums), Feret's diameters and the perimeter of the region. A 32-bit image's values are single
precision; the sums are doubles. Process › Find Maxima: local maxima standing out from their
surroundings by more than a prominence, strict or not, edges excluded or not, as a list of points.
Analyze › Plot Profile: the values along a line, sampled a pixel apart by bilinear interpolation.
ImageJ's TIFF: 32-bit float pixels, XResolution and YResolution the pixels per unit as rationals, and
an ImageDescription of `key=value` lines (`ImageJ=1.54f`, `unit=micron`, `min=`, `max=`, `xorigin=`,
`yorigin=`, `inverty=true`) that ImageJ reads back as the calibration.

## Where Kurve stands

Kurve's matrices (SHEET_SPEC 3.6) are what a qudi image is: a grid of Z with its X and Y (evenly
spaced as `{a, b}` from NumPy's linspace, or listed), a name and unit each, drawn as a map whose
readout names the cell, with a check code of its values. Its import reads text into worksheet
columns; a qudi image read that way loses its positions (the matrix is columns of numbers with the
ranges left in a header nobody reads), and the data file's x, y, z columns come in but not as an
image. Nothing measures a matrix as ImageJ does, and nothing writes one for ImageJ.

## Decisions

1. **A qudi image becomes a matrix**, its X and Y the scan's positions: the classic image's from its
   header's ranges and its own shape (NumPy's linspace, as qudi made them), the new format's from its
   axes' min, max and resolution; a classic data file's from its own x and y columns, which are the
   grid (checked to be one; else its columns come in as a table, said). A 1D scan is a curve.
2. **Positions in micrometres.** qudi writes metres; a position axis in metres whose range is below a
   millimetre comes in in µm (× 10⁶, one rounding, a part in 10¹⁶), as qudi's own windows show it, and
   the header's metres are kept as written in the matrix's header fields. Other units come as they are.
3. **Kurve's orientation.** A matrix's first row is its smallest Y and its first column its smallest
   X, as the classic file has it; the new format's lines (X) are turned into columns.
4. **The header kept.** Every parameter of the header is kept with the matrix sheet (`meta`, as a
   spectrum keeps its file's header fields), shown in its Dimensions and labels dialog, carried by the
   project file and the ImageJ TIFF's description where ImageJ has a key for it; the channel (from the
   file name) names Z, its unit counts per second for the classic files.
5. **Recorded data.** The matrix is original data: the check code of its values and a record entry
   *read from <file>*, as a picture's is.
6. **ImageJ's definitions, Kurve's arithmetic.** The measurements are ImageJ's, value for value
   (its mode, its moment formulas, its centroid convention, its region masks), worked out in doubles on
   the values as they are; checked against ImageJ on the same values rounded to single precision.
7. **A TIFF ImageJ opens as Kurve shows it.** The rows written top down from the largest Y, `inverty`
   so ImageJ's Y rises as Kurve's does, the origin and pixel size such that every pixel's centre is
   its position, the pixel size the best rational ImageJ's reader allows (ImageJ's own writer keeps six
   digits), the header's fields in the description where ImageJ has keys. Values as single precision,
   said.
8. **Numbers, not verdicts** (STATS_SPEC decision 9). No "a spot", "the background": counts, positions
   and values.

9. **Counts known, errors given** (20.11, the user's request: "analysis better than ImageJ"). Both of
   qudi's formats say how long each pixel counted (the classic header's *Clock frequency of scanner*,
   the new format's *pixel frequency*): a count-rate cell is N/t, N Poisson, so its standard error is
   √(max(N, 1))/t. Kurve's own image analyses (Q.5 to Q.8) use it: every number they give has a
   standard error, and their fits are weighted by it, the reduced χ² saying whether Poisson's noise is
   all there is. Without the pixel time (a channel in volts, a time typed as none), the errors come from
   the scatter (covariance scaled by the reduced χ²), and the method says which.
10. **Beyond ImageJ, beside it.** The ImageJ kinds stay ImageJ's, value for value. The analyses that
   go further are Kurve's own, named so, each saying in its method what it adds: sub-pixel positions
   and sizes with their errors, spots that overlap fitted together, a profile across a width with its
   errors and a fit, intensities with their shot noise and a background taken off, and the shift
   between two scans. Where ImageJ would give a number they give it too, so the two can be compared.

## Beyond ImageJ (Q.5 to Q.8)

What ImageJ's core cannot say about a confocal scan, and a person measuring emitters needs: where a
spot is to better than a pixel and how sure that is; how wide the point-spread function is (the
resolution); how bright a spot is above its background, with the shot noise that limits it; whether
two spots that touch are two; and how far a scan has drifted from the last.

**Q.5 Spots.** Analyze › Image › Spots…: seeds from ImageJ's Find Maxima (Q.4) above a prominence;
each spot fitted by a two-dimensional Gaussian (round, or elliptical and turned) on a flat
background over the cells within a radius of it (in µm; by default 1.5 times the median FWHM measured
at the seeds), spots whose windows overlap fitted together as one group (their background shared),
by Levenberg–Marquardt weighted by decision 9. A row a spot: X ± and Y ± in µm, the FWHM (or both and
the angle) ±, the peak above the background ±, the background ±, the integrated intensity (the
Gaussian's volume, Z·µm²) ±, the peak's t (A/σ_A), the nearest other spot, the group and its size,
the reduced χ², whether it settled, whether its window reached the edge; a summary (spots, density
per µm², the median FWHM and its spread, the median background). The report rings each spot at its
FWHM on the matrix's map and puts the model or the residuals in a matrix. **Checks**: SciPy's
least_squares on the same windows and model (parameters and covariance, `fixtures/spots.json`);
simulation: Poisson scans of known spots, each error against the spread of its value over 300 repeats
(pulls with SD 1), no bias in position at a quarter pixel, two spots closer than their FWHM recovered
together and biased apart alone; NIST-like exactness on noise-free spots.

**Done 20.11.** `spotFit` in the MAT block, the kind `spots`, its dialog (the pixel time from the header, the prominence from the
scatter), Show the spots on its map and Plot the positions. Three findings shaped it: weights from the counts seen (Neyman's χ²) put
the background a standard error low, so shot noise is fitted by Poisson's maximum likelihood (weights from the model until they
settle); an elliptical start at w1 = w2 has no slope in θ, so it starts from the light's second moments; and splitting by the
likelihood ratio alone split elliptical spots fitted round and made spikes of bright spots fitted unweighted, so an added spot must
look like another emitter (its FWHM within a factor of two of the median's, half of it from the others) and, round, beat one
elliptical spot by Akaike's criterion by more than 10. SciPy (`tools/ref/spot_fixtures.py`, six cases, the NV scan among them)
agrees on the seeds, groups and splits, every value within 1e-7 of its error; over 300 Poisson repeats the pulls' SD is 0.96 to 1.01.

**Q.6 Profile across a width, fitted.** Profile… grows a width (µm): each sample the mean of the
values a pixel apart across the line (bilinear, as the samples along it), with its standard error
(decision 9, or the spread across); and a fit of the profile (a Gaussian peak: FWHM ±; an
error-function edge: the 10–90 % width ±; or none), the curve beside the samples. **Checks**: the
samples against NumPy's same sums; the fit against SciPy's curve_fit with the same σ; a width of
one pixel gives ImageJ's profile back.

**Done 20.11.** `kProfile` in MAT, Profile's *Beyond ImageJ* in columns beside ImageJ's. One finding shaped it: samples a pixel apart
along an oblique line share cells, so their errors are correlated, and a fit weighted by each sample's error alone underestimated the
FWHM's error by a fifth; the fit is generalised least squares with C_ij = Σ_c a_ic a_jc σ_c² (banded), with shot noise each cell's σ²
from the fitted values until it settles. SciPy's curve_fit with that covariance agrees to 6e-8 of the errors; pulls of SD 0.95 to 1.06.

**Q.7 Intensities with their noise.** Measure… grows Kurve's own columns beside ImageJ's: the sum
and the mean with their shot-noise errors (decision 9) or the scatter's, and, given a background
region (an annulus about the region, or a region typed), the background per cell ±, the integrated
intensity less it ±, and the signal to noise. **Checks**: exact sums; the errors against the spread
over 2000 Poisson repeats.

**Done 20.11.** `kMeasure` in MAT, Measure's *Beyond ImageJ* (its noise and pixel time from the header, a ring typed); the ring is the
cells outside the region within the distance of a region cell. Exact against fractions; pulls of SD 1.00 to 1.03 over 2000 repeats.
A ring inside a spot's tails measures a higher background, as it must; Help says to take a region that holds the light.

**Q.8 The shift between two scans.** Analyze › Image › Shift between scans…: two matrices on the same
grid (two scans, a forward and a back scan), their shift by the peak of their cross-correlation,
refined to a fraction of a pixel by an upsampled DFT about it (Guizar-Sicairos, Thurman and Fienup,
2008), in µm with an error (the spread of the shift between halves of the data), and the second
matrix shifted onto the first (bilinear). **Checks**: NumPy's FFT-based reference written from the
paper; known shifts recovered to a hundredth of a pixel; noise.

## The order

Q.1 reading qudi's files → Q.2 the TIFF for ImageJ (which the checks of Q.3 and Q.4 go through) →
Q.3 Measure → Q.4 Find Maxima and Plot Profile → Q.5 Spots → Q.6 a profile's width and fit → Q.7
intensities with their noise → Q.8 the shift between two scans. Each slice committed and pushed when
its checks pass.

## Q.1 Reading qudi's files

**What.** The import (the Import button, a drop, several files at once) recognises qudi's files by
their headers (`Saved Data from the class ConfocalLogic` with `X image min (m)` or `Z image min`;
`[General]` … `---- END HEADER ----` with `axis min`/`axis max`/`axis resolution`) and makes, per
image, a matrix book named after the file's channel, its sheet's X, Y, Z named and in units, its header
fields kept, recorded; a classic data file's columns go into the worksheet as any table, and an image
per count rate channel is made from them; a 1D scan is a curve against its axis. One undo step, one log
line, a message with *Plot it* (the map). Several files at once each make their own, in one step.

**Checks.** Files made by qudi's own code (qudi-core's `TextDataStorage` for the new format, the
classic `save_logic`'s header code for the old), forward and back, square and not, xy and depth, 1D,
odd channel names, a POI line; every value and every position equal to what was written (positions to
the one rounding of decision 2); refusals in words (a header without its ranges, a matrix of the wrong
shape); `tools/parser-test.mjs` for the parser, a drive for the import, the drop and the map.

**Done 19.11.** `qudiFile` and `qudiIqo` in the PARSER block, `qudiTake` on the page, the header kept as a sheet's `meta`
and listed in *Dimensions and labels…*; `tools/ref/qudi_fixtures.py` reproduces qudi-core 1.5.0's `TextDataStorage` and the classic
`save_logic` (their code read, not run) and writes 13 files; parser-test 38 checks, `tools/qudi-drive.mjs` 14. One change from the
plan: a classic data file whose images came with it adds only what they did not give (a varying z), never a second copy of a channel.

## Q.2 A matrix for ImageJ

**What.** Publish › Matrix for ImageJ (.tif), and the matrix's own menu: the sheet shown as a 32-bit
TIFF with ImageJ's description and resolution (decision 7).

**Checks.** ImageJ 1.54f opens it headless: width, height, every value (as single precision), pixel
width and height, unit, and each pixel's calibrated centre equal to Kurve's position, for square,
oblong, descending and offset axes; tifffile reads the same.

**Done 19.11.** `matTiff` and `tiffRational` in the MAT block, `exportMatTiff` on the page; `tools/ref/ij_fixtures.mjs` and
`tools/ref/ij_read.py` make `fixtures/imagej.json` (15 matrices: square, oblong, either axis descending, a qudi scan, far from zero,
listed, the yorigin that would be 0, one column, missing cells, values past single precision, units of their own and none, a pixel
larger than its unit, 120 × 80), judged by ref-test: every value exact in single precision, every centre within 2.7e-16 of its
position's size. One change from the plan: **ImageJ itself was not run.** This environment refused to run its jar (and to install
tifffile); the TIFF is read by Pillow instead, and ImageJ's reading is its own arithmetic written out from its source
(`TiffDecoder`, `FileOpener`, `Calibration`), the same IEEE operations in the same order. `tools/ref/ij/IJRef.java` prints
ImageJ's own readout of the same files once its jar may be run.

## Q.3 ImageJ's Measure

**What.** Analyze › Image › Measure… on the matrix in front: the whole image, a rectangle or an oval
given by its edges in X and Y, or a polygon of points; a result sheet with ImageJ's columns (Area,
Mean, StdDev, Mode, Min, Max, X, Y, XM, YM, BX, BY, Width, Height, IntDen, RawIntDen, Median, Skew,
Kurt, and the pixel count), in the matrix's units, following the matrix when its values change; a
missing cell left out and counted. A histogram of the region's values (ImageJ's 256 bins) on the same
sheet.

**Checks.** ImageJ's Measure on the TIFF of Q.2 with the same region, over images of noise, peaks and
steps, every region kind, odd sizes and offsets: each value to 1e-12 of ImageJ's where its arithmetic
allows (its variance from raw sums is worse: judged against two-pass doubles), the mode and median
exactly.

**Done 20.11.** `ijGeom`, `ijRegion`, `ijMeasure` in the MAT block, the kind `ijmeasure` in ANA, the dialog, Show the region on its
map and Plot the histogram; `tools/ref/ij_read.py` ports ImageJ's Measure from its source (FloatStatistics, OvalRoi, PolygonFiller)
and works the same definitions out in exact rationals, over 9 images and 27 regions (noise, a spot with empty cells, steps, bins
exactly 1 wide, a large offset, descending axes, one value, a polygon through the centres, a qudi scan): the cells, order
statistics, mode and histogram exactly ImageJ's, the moments within 8e-16 of exact. Two findings: the mode is the middle of its
bin (this spec first said the lower edge; ImageJ uses the lower edge only for a bin exactly 1 wide), and ImageJ's own StdDev,
Skew and Kurt come from running sums of powers, 1.8e-7 off on an SD and with a meaningless kurtosis on values with a large
offset; Kurve keeps ImageJ's definitions and works them out from the deviations. ImageJ itself was not run (see Q.2). A matrix's
map draws annotations now, so the region measured can be shown on it.

## Q.4 Find Maxima and Plot Profile

**What.** Analyze › Image › Find maxima…: the prominence, strict or not, edges excluded or not, light
or dark background; a result sheet of the maxima (X, Y, the value), their number, and the points drawn
over the map. Analyze › Image › Profile…: the values along a line from (x₀, y₀) to (x₁, y₁) a pixel
apart, bilinear, into a column against the distance, plotted.

**Checks.** ImageJ's MaximumFinder and ProfilePlot on the same TIFFs: the same maxima in the same
order, the same profile values.

**Done 20.11.** `ijImage`, `ijMaxima`, `ijProfile` in the MAT block, the kinds `ijmaxima` and `ijprofile` in ANA, their dialogs,
the report's Show the maxima on its map, Plot the profile and Show the line on its map, and the matrix window's Matrix › ImageJ
submenu (Measure…, Find maxima…, Profile…, Save as a TIFF). `tools/ref/ij_read.py` ports MaximumFinder and ProfilePlot from
ImageJ 1.54f's source with its float arithmetic, over 7 images, 26 settings and 12 lines: every maximum in ImageJ's order and every
sample exactly the port's. Two differences, both meant: an empty cell is never a maximum (ImageJ lists a NaN pixel), and a line's end
within 10⁻⁹ of a pixel of a cell's centre is that centre, so a profile along a row given in micrometres is the row's values. ImageJ
itself was not run (see Q.2).

**Not in it** (asked for when wanted). Analyze Particles and thresholds, filters on images (Gaussian
blur, background subtraction), stacks (a z-series), colour images, ImageJ's ROI files.
