# Menu tree diff

Every item of today's menu bar (`ux/inventory/crawl.json`) and what becomes of it in the
proposed menu bar (`ux/spec/menus-after.txt`, shown in full in `ux/UX_SPEC.md` §3.3). Written
and checked by `tools/ux/menudiff.py`: an item with no fate fails the check.

**320 items today:** 169 kept, 60 renamed, 56 moved, 19 merged, 10 removed, 6 hidden.

*kept*: same place (a list the app fills in counts as its parent). *moved*: same name,
another menu. *renamed*: a new name, perhaps a new place. *merged*: one entry now does it.
*hidden*: shown only when it can apply, or reached from the Format dialog. *removed*:
approved at STOP 2 (R1, R2, R3, R6). The R4 submenu and the R5 bar stay.

## File (28 items)

| Today | Fate | Where it is now |
|---|---|---|
| New project | kept | same place |
| Import data… [Ctrl+O] | kept | same place |
| Bring in from another project… | renamed | File › Copy from another project… |
| Examples | kept | same place |
| Examples › Infrared: overlapping bands | kept | same place |
| Examples › Raman: raw polystyrene (background, spikes) | kept | same place |
| Examples › Raman: one band | removed | removed (R2, approved at STOP 2) |
| Examples › Fluorescence decay | renamed | File › Examples › Exponential decay (fluorescence) |
| Export | kept | same place |
| Export › Figure for a paper or slides… | renamed | File › Export › Graph for a paper or slides… |
| Export › Figure as SVG (vector, for papers) | renamed | File › Export › Graph as SVG |
| Export › Figure as PDF or EPS | merged | its two items now sit in File › Export |
| Export › Figure as PDF or EPS › PDF (vector, standard fonts) | renamed | File › Export › Graph as PDF |
| Export › Figure as PDF or EPS › EPS (vector, standard fonts) | renamed | File › Export › Graph as EPS |
| Export › Figure as PNG (image, for slides) | renamed | File › Export › Graph as PNG |
| Export › Copy the figure as a picture | merged | Edit › Copy the graph as a picture |
| Export › All graphs as one figure | removed | removed (R6, approved at STOP 2) |
| Export › All graphs as one figure › As SVG (vector, for papers) | removed | removed (R6, approved at STOP 2) |
| Export › All graphs as one figure › As PDF | removed | removed (R6, approved at STOP 2) |
| Export › All graphs as one figure › As EPS | removed | removed (R6, approved at STOP 2) |
| Export › All graphs as one figure › As PNG (image, for slides) | removed | removed (R6, approved at STOP 2) |
| Export › Final data and fit as CSV | renamed | File › Export › Processed data and fit as CSV |
| Export › Raw data as CSV, with its fingerprint | renamed | File › Export › Original data as CSV |
| Export › Processing steps as JSON | removed | removed (R3, approved at STOP 2) |
| Export › Report as HTML | renamed | File › Export › Report… |
| Export › Copy results table | moved | Edit › Copy the results table (and Results' Copy table); no longer in Export |
| Rename project | renamed | File › Rename the project… |
| Delete project… | renamed | File › Delete the project… |

## Edit (5 items)

| Today | Fate | Where it is now |
|---|---|---|
| Undo making a figure [Ctrl+Z] | kept | Edit › Undo (what it undoes) |
| Redo [Ctrl+Shift+Z] | kept | same place |
| Copy results table | moved | Edit › Copy the results table (and Results' Copy table); no longer in Export |
| Copy the graph as a picture | kept | same place |
| Add a Y column | merged | Data › Add a column |

## Plot (152 items)

| Today | Fate | Where it is now |
|---|---|---|
| Plot setup… | kept | same place |
| Plot the selected columns | kept | same place |
| Plot the selected columns › Plot setup… | kept | Plot › Plot setup… |
| Plot the selected columns › Line | kept | same place |
| Plot the selected columns › Symbols | kept | same place |
| Plot the selected columns › Line + symbols | kept | same place |
| Plot the selected columns › Sticks | renamed | Drop lines (Plot › Plot type and Plot the selected columns) |
| Plot the selected columns › Columns | kept | same place |
| Plot the selected columns › Area | kept | same place |
| Plot the selected columns › Steps | kept | same place |
| Plot the selected columns › Histogram | kept | same place |
| Plot the selected columns › Box chart | kept | same place |
| Plot the selected columns › Violin plot | kept | same place |
| Plot the selected columns › Add to a graph | kept | same place |
| Plot the selected columns › Add to a graph › Figure 1 › (a) Graph 1 | kept | the list of graphs |
| Plot the selected columns › Add to a graph › Figure 1 › (b) Graph 2 | kept | the list of graphs |
| Open a graph | merged | Window › Graphs (one menu route, and the taskbar's Graphs button) |
| Open a graph › Figure 1 · 2 panels | kept | the list of graphs |
| Open a graph › Combine graphs… | merged | Window › Graphs › Combine graphs… (one menu route) |
| Open a graph › Tile the graphs | merged | Window › Tile, which runs the same tiling |
| Open a graph › Link the X zoom | merged | Window › Graphs › Link the X zoom of the graphs |
| Format graph… | kept | same place |
| Formats | renamed | Plot › Saved styles |
| Formats › Kurve's own | kept | Plot › Saved styles (the list of styles) |
| Formats › Journal: sans serif, axes, ticks out | kept | Plot › Saved styles (the list of styles) |
| Formats › Classic: serif, box, ticks in | kept | Plot › Saved styles (the list of styles) |
| Formats › Slides: large text, heavy axes | kept | Plot › Saved styles (the list of styles) |
| Formats › Minimal: open axes, light grid | kept | Plot › Saved styles (the list of styles) |
| Formats › Save this format… | renamed | Plot › Saved styles › Save this style… |
| Formats › Give every graph a format | renamed | Plot › Saved styles › Give every graph a style |
| Formats › Give every graph a format › Kurve's own | kept | Plot › Saved styles › Give every graph a style (the list) |
| Formats › Give every graph a format › Journal: sans serif, axes, ticks out | kept | Plot › Saved styles › Give every graph a style (the list) |
| Formats › Give every graph a format › Classic: serif, box, ticks in | kept | Plot › Saved styles › Give every graph a style (the list) |
| Formats › Give every graph a format › Slides: large text, heavy axes | kept | Plot › Saved styles › Give every graph a style (the list) |
| Formats › Give every graph a format › Minimal: open axes, light grid | kept | Plot › Saved styles › Give every graph a style (the list) |
| Format | renamed | Plot › Format a part (R4 kept, renamed) |
| Format › X axis… | kept | Plot › Format a part › X axis… |
| Format › Second X axis… | hidden | Plot › Format a part › Second X axis… (while there is none) |
| Format › Second Y axis… | hidden | Plot › Format a part › Second Y axis… (while there is none) |
| Format › Y axis… | kept | Plot › Format a part › Y axis… |
| Format › Frame and grid… | kept | Plot › Format a part › Frame and grid… |
| Format › Text and fonts… | kept | Plot › Format a part › Text and fonts… |
| Format › Legend… | kept | Plot › Format a part › Legend… |
| Format › Lines and symbols… | kept | Plot › Format a part › Lines and symbols… |
| Show all the data [Double-click] | kept | same place |
| Plot type | kept | same place |
| Plot type › Line | kept | Plot › Plot the selected columns › Line |
| Plot type › Symbols | kept | Plot › Plot the selected columns › Symbols |
| Plot type › Line + symbols | kept | Plot › Plot the selected columns › Line + symbols |
| Plot type › Sticks | renamed | Drop lines (Plot › Plot type and Plot the selected columns) |
| Plot type › Columns | kept | Plot › Plot the selected columns › Columns |
| Plot type › Area | kept | Plot › Plot the selected columns › Area |
| Plot type › Steps | kept | Plot › Plot the selected columns › Steps |
| Several spectra | renamed | Plot › Several curves |
| Several spectra › Overlay | kept | Plot › Several curves › Overlay |
| Several spectra › Offset (waterfall) | kept | Plot › Several curves › Offset (waterfall) |
| Several spectra › Stacked panels | kept | Plot › Several curves › Stacked panels |
| Several spectra › Double Y | renamed | Plot › Several curves › Two Y axes |
| Several spectra › Heat map | kept | Plot › Several curves › Heat map |
| Several spectra › Box chart | moved | Plot › Plot the selected columns › Box chart, and Plot setup: a chart kind, not a layout |
| Several spectra › Violin plot | moved | Plot › Plot the selected columns › Violin plot, and Plot setup |
| Axis options | renamed | Plot › Axes |
| Axis options › Reverse X axis | renamed | Plot › Axes › Reverse X |
| Axis options › Logarithmic Y axis | merged | Plot › Axes › Y scale › Logarithmic (log₁₀): it set the same thing |
| Axis options › Second X axis in other units… | moved | the X axis's right-click (A second X axis in other units…) and Plot › Format a part › Second X axis… |
| Axis options › Second Y axis in other units… | moved | Plot › Format a part › Second Y axis… |
| Axis options › X axis scale | renamed | Plot › Axes › X scale |
| Axis options › X axis scale › Linear | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Logarithmic (log₁₀) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Natural log (ln) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Log₂ | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Reciprocal (1/x) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Offset reciprocal, 1/(x + c) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Square root | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › X axis scale › Probability (%) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale | renamed | Plot › Axes › Y scale |
| Axis options › Y axis scale › Linear | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Logarithmic (log₁₀) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Natural log (ln) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Log₂ | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Reciprocal (1/x) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Offset reciprocal, 1/(x + c) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Square root | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Y axis scale › Probability (%) | kept | Plot › Axes › X scale / Y scale (the list) |
| Axis options › Break the X axis… | moved | the X axis's right-click › Break the axis… |
| Axis options › Break the Y axis… | moved | the Y axis's right-click › Break the axis… |
| Axis options › Grid lines | kept | Plot › Axes › Grid lines |
| Axis options › Residual panel | moved | Analysis › Fit › Residuals under the graph |
| Font | kept | same place |
| Font › Kurve's (Source Sans, axis titles in Source Serif) | kept | Plot › Font (the list) |
| Font › Source Sans 3 | kept | Plot › Font (the list) |
| Font › Source Serif 4 | kept | Plot › Font (the list) |
| Font › Inter | kept | Plot › Font (the list) |
| Font › STIX Two Text | kept | Plot › Font (the list) |
| Font › Arial | kept | Plot › Font (the list) |
| Font › Helvetica | kept | Plot › Font (the list) |
| Font › Times New Roman | kept | Plot › Font (the list) |
| Font › Courier New | kept | Plot › Font (the list) |
| Font › More fonts, and each element's own… | renamed | Plot › Font › Text and fonts… (the page Plot › Format a part › Text and fonts… opens) |
| Font › Small | kept | Plot › Font (the list) |
| Font › Normal | kept | Plot › Font (the list) |
| Font › Large | kept | Plot › Font (the list) |
| Font › Larger | kept | Plot › Font (the list) |
| Font › Largest | kept | Plot › Font (the list) |
| Font › Axis titles in italics | hidden | the Format dialog's Text and fonts page (it was there too) |
| Legend | kept | Plot › Format a part › Legend… |
| Legend › Emptiest corner | kept | Plot › Legend › Place (the list) |
| Legend › Top right | kept | Plot › Legend › Place (the list) |
| Legend › Top left | kept | Plot › Legend › Place (the list) |
| Legend › Bottom right | kept | Plot › Legend › Place (the list) |
| Legend › Bottom left | kept | Plot › Legend › Place (the list) |
| Legend › Outside, right | kept | Plot › Legend › Place (the list) |
| Legend › Below the graph | kept | Plot › Legend › Place (the list) |
| Legend › No legend | kept | Plot › Legend › Place (the list) |
| Legend › Text in each spectrum's colour | renamed | Plot › Legend › Text in each curve's colour |
| Legend › Legend title… | renamed | Plot › Legend › Add a legend title… |
| Annotate | kept | same place |
| Annotate › Vertical line… | kept | same place |
| Annotate › Horizontal line… | kept | same place |
| Annotate › Shade an X range (drag on the graph) | kept | Plot › Annotate |
| Annotate › Arrow (drag on the graph) | kept | same place |
| Annotate › Box (drag on the graph) | kept | same place |
| Annotate › Ellipse (drag on the graph) | kept | same place |
| Annotate › Inset of the zoomed region | hidden | Plot › Annotate › Inset of the zoomed region (until the graph is zoomed) |
| Annotate › Label peaks with the Label tool | renamed | Plot › Annotate › Text (click the graph): the same tool |
| Annotate › Find and mark peaks… | merged | Spectroscopy › Find peaks… |
| Annotate › Lines, labels and legend… | renamed | Plot › Annotate › Labels and lines… |
| Annotate › Remove every annotation | kept | same place |
| Fitted peak labels | moved | a fitted peak label's right-click, and the Fit window's label chips |
| Fitted peak labels › Each label shows | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › Number | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › Name | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › Centre | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › Height | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › FWHM | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › Area | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Each label shows › Area % | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Place | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Place › Above the peak | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Place › Inside the peak | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Place › In a row along the top, with leaders | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Mark each peak with | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Mark each peak with › Nothing | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Mark each peak with › A dot on its top | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Mark each peak with › A line down to the baseline | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Mark each peak with › A line through the graph | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › With their errors | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › With their units | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Stacked, one item per line | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › Turned 90° | moved | a fitted peak label's right-click and the Fit window |
| Fitted peak labels › More options… | moved | a fitted peak label's right-click and the Fit window |
| Layout and colours… | kept | same place |

## Data (32 items)

| Today | Fate | Where it is now |
|---|---|---|
| Import data… [Ctrl+O] | merged | File › Import data… (and the toolbar, Ctrl+O): one menu route |
| Worksheet | kept | same place |
| Add a column | kept | same place |
| Lock the raw data | renamed | Data › Lock the original data |
| Fill | kept | same place |
| Fill › Series… | kept | same place |
| Fill › Growth series… | kept | same place |
| Fill › Evenly between two values… | kept | same place |
| Fill › Row numbers… | kept | same place |
| Fill › Repeat a list… | kept | same place |
| Fill › Random numbers… | kept | same place |
| Fill › Continue the trend… | kept | same place |
| Clean | kept | same place |
| Clean › Crop… | kept | same place |
| Clean › Crop to the visible range | merged | Data › Clean › Crop…, which opens on the range in view |
| Clean › Remove a region… | renamed | Data › Clean › Leave out an X range… |
| Clean › Remove cosmic-ray spikes… | moved | Spectroscopy › Remove cosmic-ray spikes… |
| Clean › Sort by X | renamed | Data › Clean › Sort by X (as a step) |
| Clean › Average duplicate X | kept | same place |
| Clean › Resample to even spacing… | kept | same place |
| Masks | kept | same place |
| Masks › Mask points on the graph | kept | same place |
| Masks › Restore all masked points | renamed | Data › Masks › Restore every masked point |
| Spectra | renamed | Data › Columns |
| Spectra › New spectrum from the processed data | renamed | Data › Columns › New column from the processed data |
| Spectra › Copy with the same steps | renamed | Data › Columns › Copy with the same processing |
| Spectra › Give every spectrum these steps | renamed | Data › Columns › Apply this processing to every column |
| Spectra › Rename the spectrum… | renamed | Data › Columns › Rename the column… |
| Show on the graph | kept | same place |
| Show on the graph › Raw data | renamed | Data › Show on the graph › Original |
| Show on the graph › Final data | renamed | Data › Show on the graph › Processed |
| Show on the graph › Final, with the raw data behind | renamed | Data › Show on the graph › Both |

## Math (22 items)

| Today | Fate | Where it is now |
|---|---|---|
| Arithmetic | moved | Analysis › Mathematics |
| Arithmetic › Scale and offset Y… | kept | Analysis › Mathematics › Scale and offset Y… |
| Arithmetic › Scale and offset X… | kept | Analysis › Mathematics › Scale and offset X… |
| Arithmetic › Normalize… | kept | Analysis › Mathematics › Normalize… |
| Arithmetic › Subtract or divide by another spectrum… | renamed | Analysis › Mathematics › Subtract or divide by another column… |
| Arithmetic › Average with other spectra… | renamed | Analysis › Mathematics › Average with other columns… |
| Calculus | moved | Analysis › Mathematics |
| Calculus › Derivative… | kept | Analysis › Mathematics › Derivative… |
| Calculus › Derivative, as a new spectrum… | merged | Analysis › Mathematics › Derivative…, a choice in the tool |
| Calculus › Cumulative integral… | kept | Analysis › Mathematics › Cumulative integral… |
| Transforms | moved | Analysis › Mathematics (Logarithm) and Spectroscopy › Corrections |
| Transforms › Logarithm… | kept | Analysis › Mathematics › Logarithm… |
| Transforms › Transmittance to absorbance… | moved | Spectroscopy › Corrections (Math's copy merged) |
| Transforms › Kubelka–Munk… | moved | Spectroscopy › Corrections (Math's copy merged) |
| Smooth and filter | moved | Analysis › Smooth and filter |
| Smooth and filter › Smooth… | kept | same place |
| Smooth and filter › FFT filter… | kept | same place |
| Python | moved | Analysis › Python (under More until used) |
| Python › Python on this spectrum… | renamed | Analysis › Python › Python on the active column… |
| Python › A new spectrum with Python… | renamed | Analysis › Python › A new column with Python… |
| Python › Label the peaks with Python… | moved | the Peaks window's With Python… (one route, beside what it labels) |
| Python › Python window | kept | same place |

## Analysis (22 items)

| Today | Fate | Where it is now |
|---|---|---|
| Overview… | moved | Spectroscopy › Overview of the spectrum… |
| Find peaks… | moved | Spectroscopy › Find peaks… |
| Name the peaks from known lines… | moved | Spectroscopy › Name the peaks from known lines… |
| Integrate bands… | renamed | Analysis › Integrate… (one menu route; the Peaks window's Integrate them stays) |
| Fit | kept | same place |
| Fit › Curve fit | renamed | Analysis › Fit › Curve fit… |
| Fit › Peak fit | renamed | Analysis › Fit › Peak fit… |
| Fit › New fit function… | kept | same place |
| Fit › Run the fit [Ctrl+Enter] | kept | same place |
| Fit › Fit every spectrum… | renamed | Analysis › Fit › Fit every column… (hidden until there are two columns) |
| Fit › Batch results | hidden | Analysis › Fit › Batch results (until there is a batch) |
| Fit › Remove the fit | kept | same place |
| Results | kept | same place |
| Subtract background… | moved | Spectroscopy › Subtract background… |
| Spectroscopy | moved | a menu of its own, Spectroscopy |
| Spectroscopy › Energy calibration… | moved | Spectroscopy › X axis |
| Spectroscopy › Wavelength to Raman shift… | moved | Spectroscopy › X axis |
| Spectroscopy › Convert X units… | moved | Spectroscopy › X axis |
| Spectroscopy › Calibrate X on reference peaks… | moved | Spectroscopy › X axis |
| Spectroscopy › Bose–Einstein correction… | moved | Spectroscopy › Corrections |
| Spectroscopy › Transmittance to absorbance… | moved | Spectroscopy › Corrections (Math's copy merged) |
| Spectroscopy › Kubelka–Munk… | moved | Spectroscopy › Corrections (Math's copy merged) |

## Statistics (7 items)

| Today | Fate | Where it is now |
|---|---|---|
| Overview of the spectrum | moved | Spectroscopy › Overview of the spectrum… |
| Descriptive statistics | renamed | Statistics › Descriptive statistics… |
| Integrate the visible range | merged | Statistics › Descriptive statistics… (a section of the same window) |
| Integrate bands… | renamed | Analysis › Integrate… (one menu route; the Peaks window's Integrate them stays) |
| Noise and signal to noise | merged | Statistics › Descriptive statistics… (a section of the same window) |
| Correlation between spectra | renamed | Statistics › Correlation between columns… |
| Histogram of the values | renamed | Statistics › Histogram… (takes the selected columns) |

## Window (45 items)

| Today | Fate | Where it is now |
|---|---|---|
| Figure 1 | kept | Window › (the windows in use) |
| Worksheet | kept | Window › (the windows in use) |
| History | kept | Window › (the windows in use) |
| Fit | kept | Window › (the windows in use) |
| Results | kept | Window › (the windows in use) |
| Panels | renamed | Window › Tool windows |
| Panels › History | kept | Window › (the windows in use) |
| Panels › Overview | kept | Window › Tool windows (the list) |
| Panels › Peaks | kept | Window › Tool windows (the list) |
| Panels › Integrate | kept | Window › Tool windows (the list) |
| Panels › Fit | kept | Window › (the windows in use) |
| Panels › Results | kept | Window › (the windows in use) |
| Panels › Batch | kept | Window › Tool windows (the list) |
| Panels › Statistics | kept | Window › Tool windows (the list) |
| Panels › Python | kept | Window › Tool windows (the list) |
| Panels › Discussion | kept | Window › Tool windows (the list) |
| Panels › Help | kept | Window › Tool windows (the list) |
| Project Explorer [Alt+1] | kept | same place |
| Tile | kept | same place |
| Cascade | kept | same place |
| Minimise the others | kept | same place |
| Close the panels | renamed | Window › Close the tool windows |
| Restore the default arrangement | kept | same place |
| Open a graph | renamed | Window › Graphs |
| Open a graph › Figure 1 · 2 panels | kept | the list of graphs |
| Open a graph › Combine graphs… | merged | Window › Graphs › Combine graphs… |
| Open a graph › Tile the graphs | merged | Window › Tile, which runs the same tiling |
| Open a graph › Link the X zoom | merged | Window › Graphs › Link the X zoom of the graphs |
| New graph | moved | Plot › New graph |
| New graph › With Absorbance | kept | Plot › New graph › With (the active column) |
| New graph › With every spectrum | renamed | Plot › New graph › With every column |
| New graph › One for each spectrum | renamed | Plot › New graph › One for each column |
| New graph › A figure, a panel for each spectrum | renamed | Plot › New graph › A figure, a panel for each column |
| New graph › A figure of panels… | kept | Window › Graphs › A figure of panels… |
| New graph › A trend of the series | hidden | Plot › New graph › A trend of the series (until there is a series (several columns)) |
| Combine graphs… | merged | Window › Graphs › Combine graphs… |
| Bring in from another project… | merged | File › Copy from another project… |
| Link the X zoom of the graphs | moved | Window › Graphs › Link the X zoom of the graphs |
| Theme | kept | same place |
| Theme › Light | kept | Window › Theme |
| Theme › Dark | kept | Window › Theme |
| Theme › Match the system | kept | Window › Theme |
| Style | removed | removed (R1, approved at STOP 2): the Graphite style goes |
| Style › Bench: blue for what you can change | removed | removed (R1, approved at STOP 2): the Graphite style goes |
| Style › Graphite: black and white | removed | removed (R1, approved at STOP 2): the Graphite style goes |

## Help (7 items)

| Today | Fate | Where it is now |
|---|---|---|
| Kurve help [F1] | kept | same place |
| Search help… | kept | same place |
| Getting started | kept | same place |
| Keyboard shortcuts [?] | kept | same place |
| Processing steps | renamed | Help › About processing |
| How Kurve computes | kept | same place |
| About Kurve | kept | same place |

## New in the menu bar

Not new features: existing commands given a menu route because a persona looked for them
there (Edit's Copy and Paste, as in every program) or because the toolkit needed a home.

- Edit › Copy: new route: the worksheet's Copy
- Edit › Paste: new route: the worksheet's Paste
- Edit › Clear: new route: the worksheet's Clear
- Edit › Find…: new route: the worksheet's Find
- Data › Fill › Down: new route: the cell menu's Fill › Down
- Data › Fill › Right: new route: the cell menu's Fill › Right
- Data › Sort the view: new route: the cell and column menus' "Sort the sheet by …"
- Spectroscopy: new menu: the toolkit, gathered from Data, Math, Analysis, Statistics and Plot
- Window › Graphs › A figure of panels…: new route (slice 4): Plot › New graph's, beside Combine graphs…, where T9 looked first
