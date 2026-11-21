# Images: a matrix seen and worked as ImageJ works an image

The user's request of 20.11, after QUDI_SPEC's eight slices: *"Looks good, problem is zooming in and not being able to
easily zoom out, also resizing the window resizes the image, so you get rectangular pixels, which is not a good sight. So
resizing the window shouldn't resize the image to make it rectangular or change its pixel sizes. Add more options and
features from ImageJ, right now I only see few colormaps, no other options and settings. I want a different workflow for
ImageJ images that integrates really well into Kurve."*

What it was: a scan opened as a grid of numbers in the matrix window; its picture was a graph (Plot), whose plot area took
whatever the window gave it, so an 8 × 8 µm scan drew as a 2.6 : 1 rectangle; zooming in was a drag, zooming out a
double click or the toolbar's Show all, neither said anywhere; four colour maps, no display range, no selection drawn on
the picture, and every ImageJ command a dialog of numbers typed.

## Decisions

1. **A matrix opens as an image.** The matrix window has two views, *Image* (the default) and *Cells* (the grid as
   before), switched on its bar as the worksheet switches Original and Processed. A scan is looked at before it is read
   cell by cell; typing values is one click away.
2. **A pixel keeps its shape.** In the image view a cell is drawn at the scan's true shape: its width to its height is the
   X step to the Y step when X and Y share a unit (a qudi scan: square), else square. The window's size never stretches
   it: a larger window shows more of the image, or the space around it. On a graph a matrix's map keeps the same shape: the
   plot area takes the largest rectangle of that shape the window holds, and a zoom fills the window at that scale where
   the scan has cells to show.
3. **Zoom as ImageJ, out as easily as in.** ImageJ's magnifications (1/72 to 32, `ImageCanvas.zoomLevels`) by the wheel
   (about the pointer), + and − (keys and buttons), Fit (the largest that shows all of it) and 100 % (a cell a screen
   pixel), the magnification always shown; the Zoom tool's click zooms in a step about the point and Alt+click out, as
   ImageJ's magnifier. On a graph: + and − zoom both axes of a map, 0 shows all, and the Zoom tool's Alt+click zooms out.
4. **What is seen is ImageJ's display.** A lookup table and a display range, as ImageJ shows a 32-bit image: each value
   scaled to 0–255 by `(v − min)·255/(max − min) + 0.5` truncated (FloatProcessor.create8BitImage) and coloured by a table
   of 256. The tables are ImageJ's own (LutLoader: Grays, Fire, Ice, Spectrum, 3-3-2 RGB, Red, Green, Blue, Cyan, Magenta,
   Yellow, Red/Green), Kurve's maps (viridis, magma and the rest) and HiLo, each invertible. The range is set as ImageJ's
   Brightness and Contrast sets it: the histogram with the range over it, Minimum and Maximum, Auto (ContrastAdjuster's,
   each press saturating more), Reset, Set, and Enhance contrast with its saturated share (ContrastEnhancer).
5. **The display is a view of the matrix, kept with it.** The table and range are the sheet's `disp`, undone with it, never
   in its check code or record (they change no value). The matrix's graph, its TIFF's min and max, and a picture of the
   image follow them unless a graph has its own colour map.
6. **Selections are ImageJ's, drawn on the image.** Rectangle, oval, polygon, straight line, point and multi-point, moved
   and resized by their handles; the tools of the image view, not the graph's toolbar. A selection feeds every ImageJ and
   Kurve command on the matrix (Measure, Profile, Find maxima, Spots, Intensities): their dialogs start from it.
7. **The ROI Manager is the book's.** Selections added (T, as ImageJ) are kept with the matrix book, named, shown all at
   once or one at a time, measured together into one result sheet (a row a selection, ImageJ's Results), which follows the
   matrix as every analysis does. M measures the selection, K profiles a line.
8. **Results are drawn on the image.** Maxima, spots, profiles and particles found on a matrix are drawn over its image (an
   overlay, as ImageJ's), switched in the image view; the graph's map keeps its annotations for figures.
9. **Process makes new matrices.** ImageJ's filters and math change the image in place; Kurve keeps the original and makes
   the result a matrix of its own beside it (an analysis that follows its input, as interpolation's), named after the
   command, with ImageJ's arithmetic written out from its source and checked against a port of it.
10. **Every number ImageJ gives, Kurve gives as ImageJ does**, checked against ports of ImageJ 1.54f's source (its jar
    still not run here), and Kurve's own beside them where it can say more (QUDI_SPEC decision 10).

## Slices

**I.1 The map keeps its shape.** A matrix's graph draws its cells at the true shape (decision 2), the plot area the
largest of that shape in the window and centred, a zoom filling the window at the same scale over the cells there are;
+ − 0 on the graph zoom a map's both axes and show it all; the Zoom tool's Alt+click zooms out a step and a click
without a drag zooms in a step. **Checks**: the drawn cell's width and height in pixels against the steps, at three window
shapes; a box zoom, the wheel and the keys keep it; a heat map of a series and a figure's panel unchanged.

**Done 20.11.** `matFit` (the view at the cells' shape in the window's area, the binding axis as asked, the other grown about its
middle over the scan) in `buildPlot` before the plot area is sized, not for a figure's panel; `mapZoomBy` (a map's zoom about a
point, in the window's whole area so the cell clicked stays near the pointer, never past the scan); the keys and the Zoom tool's
clicks. On the graph the cell clicked moves a few pixels when the axes' numbers change width; the image view (I.2) is exact.

**I.2 The image view.** The matrix window's Image and Cells; a canvas drawn at the magnification (each cell a block of
screen pixels, no smoothing), ImageJ's levels, the wheel about the pointer, + − and their buttons, Fit, 100 %, the
magnification on the bar; the Hand tool and Space+drag pan, the image kept in reach; ImageJ's info line over the image
(*8.00 × 8.00 µm (64 × 64); 32-bit*), the readout under the pointer (X, Y, value, row and column); the sheets' tabs as
channels. **Checks**: a cell's drawn size at every level, square at any window shape; the pointer's cell; zoom about the
pointer keeps the cell under it; at phone width.

**Done 20.11.** The matrix window's Image and Cells (an image unless the sheet holds nothing yet); the canvas at the magnification,
each cell drawn with ImageJ's 8-bit index of its value (`ij8`, create8BitImage) in grays over the values' range as floats (the
tables and range are I.3's); `IJ_ZOOM` with `ijZoomUp`/`ijZoomDown`; Fit with each cell a whole number of the screen's pixels from two
up; the wheel a level a notch about the pointer (Ctrl+wheel, a trackpad's pinch, and two fingers continuous); a drag pans, the image
centred while smaller than the window and covering it once larger; the info line *8.13 × 8.13 µm (64 × 64); 64-bit, c/s* (ImageJ's
size is the cells' extent, 64 × 0.127 µm; Kurve's values are 64-bit) and the readout; a click or Shift a selection the commands start
from, the arrows with Y up, F2 into the Cells view. **Checks** (`tools/img-drive.mjs`, 25): those named, the pixels read back against
`ij8`, the selection feeding Measure, a second sheet keeping the zoom, at 390 px and two fingers.

**I.3 Lookup tables and contrast.** Decisions 4 and 5: the tables (LutLoader's twelve exactly, with its interpolation of
32 entries), invert, HiLo; the Brightness and Contrast panel; the calibration bar beside the image; the graph's map, the
TIFF's min and max and *Save the view as PNG* (the image at a whole multiple of its cells, with the bar) following.
**Checks**: each of ImageJ's tables against LutLoader ported; the 8-bit index of every cell against create8BitImage; Auto
over repeated presses and Enhance at 0.35 % against ContrastAdjuster and ContrastEnhancer ported; undo; a reload.

**Done 20.11.** In MAT `IJ_LUTS`, `ijLut` (LutLoader: fire and ice by its interpolate, spectrum by `ijHSB`, Java's HSBtoRGB in
floats, 3-3-2 RGB, the primaries, red/green, HiLo), `ijLutInv`, `ijHist` (FloatStatistics' 256 bins of the floats), `ijAutoStep`/`ijAuto`
(ContrastAdjuster.autoAdjust), `ijEnhance` (ContrastEnhancer), `ijBCRange`, `ijBCPlaces`, `ijBCSet` (the four sliders); the tables are
colour maps too (`ij:<table>`, `~` inverted: `cmapStops`), so the graph's maps and colour bars have them. A sheet's `disp` {lut, inv, lo,
hi} (`dispClean`, `matDispOf`, `matDispSet`: one undo step, a burst for a slider; kept by `matClean`; no record entry), shown on the image
bar (the table's button with its strip, Contrast) and the info line; the panel beside the image (`mxBcDraw`, `mxBcWire`, `mxBcAct`: the
histogram with ImageJ's line, the table's strip and ends, the four sliders previewing as they move, Auto, Reset, Set… (every sheet of the
book), Enhance…, the table and Inverted; C); the graph of the matrix following unless it has a colour map of its own; the TIFF's min and
max; *Save the image as PNG* (whole pixels a cell, a calibration bar). The calibration bar beside the image itself is the panel's table
strip (ImageJ's Calibration Bar as an overlay is I.7's). **Checks**: `tools/ref/ij_display.py` against ImageJ's source, exact on every
table entry, bin, index, Auto press, saturation and slider (six bench entries); `tools/img-drive.mjs` (17): each table drawn at its index,
Inverted, undo, the panel, Auto three times, a slider's preview and one undo step, Set… refusing, Enhance, the graph following and not,
the record untouched, the TIFF's range, the PNG's pixels, a reload, junk from storage.

**I.4 Selections and the ROI Manager.** Decisions 6 to 8: the tools, handles, keys (M, K, T, Delete, Escape, arrows move a
selection a pixel), the manager's list (name, show all, measure, delete, rename), the Results sheet of the book, the
dialogs started from the selection, overlays of an analysis's maxima, spots and lines. **Checks**: a selection's cells as
`ijRegion` takes them (ImageJ's), its macro; Measure on the manager's selections against ijMeasure one by one; undo;
a reload; the keys.

**Done 20.11.** The image bar's tools (`MX_TOOLS`: Hand, Rectangle as ImageJ's first, Oval, Polygon, Straight line, Points; `st.tool`),
the selection (`st.roi`: a rectangle's and an oval's cells the cell selection, a polygon's corners, a line's ends and points in X and Y;
`st.draft` a polygon being drawn) drawn in yellow with its handles (`mxShape`, `mxHandles`, `mxOnRoi`; an edge to the nearest cells'
boundary), moved by a drag or an arrow (`mxRoiShift`), Esc, Ctrl+A; M (`mxMeasure`: kept and measured, one undo step), K (`mxProfile`:
worked out and plotted), T (`mxRoiAdd`); Measure's and Profile's dialogs start from it. The ROI Manager (`b.rois` on the book, kept by
`matClean`; `mxRoiDraw`, `mxRoiWire`, `matRoisSet`) and the book's Results (kind `ijrois`: ijMeasure over a rectangle's, an oval's or a
polygon's cells, a line's profile statistics with its length and angle, each point's value), made without a dialog by `anaMakeTyped`.
Overlays (`mxOverlay`): Find maxima's crosses, Spots' ellipses, a profile's line, Measure's region in cyan, the manager's with Show all.
**Checks** (`tools/img-drive.mjs`, 18): each tool, a handle and a move, the arrows, M against ijMeasure in one undo step, an oval's and a
polygon's dialogs, K against ijProfile with its graph, points' values, the manager's list, a rename, a delete undone, Show all's cyan, the
Results following a value typed, the overlay's crosses and their switch, Esc and Ctrl+A, a reload, junk from storage.

**I.5 Process.** ImageJ's Smooth, Sharpen, Find Edges (3 × 3), Gaussian Blur (σ in cells or the scan's units, ImageJ's
kernel and edges), Mean, Median, Minimum, Maximum, Variance (RankFilters' circular kernels), Unsharp Mask, Subtract
Background (the rolling ball and the sliding paraboloid), Math (add, subtract, multiply, divide, min, max, gamma, log, exp,
square, square root, abs, reciprocal, NaN background) as new matrices following their input. **Checks**: each against
the port of its ImageJ source on scans with edges and empty cells.

**Done 21.11.** `ijProcess` in MAT: FloatProcessor.filter3x3 (Smooth, Sharpen, Find Edges), GaussianBlur (its kernel, edges and the
downscaling past σ 8.5), RankFilters (Mean, Median, Minimum, Maximum, Variance on its circle, its sums in doubles as it keeps them, its
NaN-aware median), UnsharpMask, BackgroundSubtracter (the rolling ball with its shrinking and interpolation, the sliding paraboloid with
its corner correction, a light background, smoothing, the background itself; one guard ImageJ lacks, where its parabola would loop for
ever on a value that is not a number, and the paraboloid refused on a matrix with empty cells), and Math (FloatProcessor.process and
ImageMath), each in Java's float arithmetic step by step. The kind `ijproc`: a new matrix that follows its input, named after the
operation, with the source's lookup table, opened in its window; its sheet a line of what was done and the method ImageJ's command. Its
dialog (σ in cells or in the scan's unit, converted when the unit is switched; a radius; the background's checkboxes; a value; a range
kept), the window's *Process* button, Matrix › Process, Analyze › Image › Process. Beyond ImageJ (decision 10): *Leave the empty cells
out* for the Gaussian, Unsharp mask, Mean and Variance, so an unfinished scan's empty rows do not spread through the image (normalised
convolution; ImageJ lets NaN spread). **Checks**: `tools/ref/ij_process.py` (ImageJ's Java written again in NumPy's float32 from the
source, an independent transcription) on eight images (a field with offsets, gaps and a zero; the same on falling axes; a wide blur with
two spots that makes ImageJ shrink its lines, and balls from 3 to 150 cells, shrunk by 1 to 8; Poisson counts; a bright corner for the
paraboloid's corner correction; a row; a column; an unfinished scan), 122 operations, every cell equal (`ijProcess.*`, seven bench
entries; three one-bit changes to the filters make 20 of them differ, three to the background 20 of its 26); `tools/img-drive.mjs` I.5 (16).

**I.6 Threshold and particles.** ImageJ's AutoThresholder (Default, Huang, Intermodes, IsoData, Li, MaxEntropy, Mean,
MinError, Minimum, Moments, Otsu, Percentile, RenyiEntropy, Shanbhag, Triangle, Yen) on the 256-bin histogram, the range
shown on the image in red, dark or light background; Analyze Particles (size and circularity ranges, edges excluded, holes
included) into a result sheet (area, mean, centroid, perimeter, circularity, Feret…) with the outlines on the image and a
mask matrix. **Checks**: each method's level and every particle's numbers against the ports.

**I.7 Scale bar, channels, histogram.** ImageJ's Scale Bar on the image and its picture (width, height, place, colour,
text); a composite of the book's channels (each its table, added), Analyze › Histogram as a quick look with ImageJ's
numbers. **Checks**: the bar's length in pixels against its width; the composite's colours.

## The order

I.1 → I.2 → I.3 → I.4 → I.5 → I.6 → I.7, each committed and pushed when its checks pass.
