# Wave 5: signal processing and mathematics

The fifth wave of `PARITY_SPEC.md`. What Origin's Signal Processing and Mathematics menus do that
Kurve does not: a Fourier transform you can read (5.1), filters designed by their kind and order
(5.2), correlation, convolution and deconvolution (5.3), the analytic signal and envelopes (5.4),
the short-time transform (5.5), wavelets (5.6), interpolation into columns and scattered points
into a matrix (5.7), and the calculus beyond the trapezoid (5.8). This spec is the wave's: what
Origin does, where Kurve stands, the decisions, the data model, the order, and each slice with what
it changes, how it is checked and what it leaves out. It follows the plan's bar (`PARITY_SPEC.md`,
"The bar"), the user's rules of information hygiene (`ux/UX_SPEC.md` §3.8) and of numbers, not
verdicts (STATS_SPEC decision 9), none of which are repeated here.

Origin's documentation could not be opened from this session (its hosts are refused here, as for
waves 1 to 4); what follows rests on Origin's help as remembered, and the points to check in Origin
itself are marked *(to confirm)*:
[FFT](https://www.originlab.com/doc/Origin-Help/FFT),
[IFFT](https://www.originlab.com/doc/Origin-Help/IFFT),
[STFT](https://www.originlab.com/doc/Origin-Help/STFT),
[IIR Filter](https://www.originlab.com/doc/Origin-Help/IIR-Filter),
[FFT Filters](https://www.originlab.com/doc/Origin-Help/FFT-Filter),
[Convolution](https://www.originlab.com/doc/Origin-Help/Convolution),
[Deconvolution](https://www.originlab.com/doc/Origin-Help/Deconvolution),
[Correlation](https://www.originlab.com/doc/Origin-Help/Correlation),
[Coherence](https://www.originlab.com/doc/Origin-Help/Coherence),
[Hilbert Transform](https://www.originlab.com/doc/Origin-Help/Hilbert-Transform),
[Envelope](https://www.originlab.com/doc/Origin-Help/Envelope),
[Wavelet](https://www.originlab.com/doc/Origin-Help/Wavelet-Transforms),
[Interpolate/Extrapolate](https://www.originlab.com/doc/Origin-Help/Interpolate-Extrapolate),
[XYZ Gridding](https://www.originlab.com/doc/Origin-Help/XYZ-Gridding),
[Integrate](https://www.originlab.com/doc/Origin-Help/Integration),
[Smoothing](https://www.originlab.com/doc/Origin-Help/Smoothing).

## How Origin does it

- **FFT** (Analysis › Signal Processing › FFT › FFT): a column (its X the sampling interval, or a
  typed one); a window (Rectangle, Welch, Triangular, Bartlett, Hanning, Hamming, Blackman,
  Gaussian, Kaiser, Flat top *(to confirm the list)*); the spectrum's kind (amplitude, power as
  MSA, RMS or dB, the power spectral density *(to confirm)*), its normalisation, one or two sides,
  shifted, the phase in degrees or radians and unwrapped; out: frequency, real, imaginary,
  amplitude, phase, power into a result sheet, and a graph. **IFFT** takes a real and an
  imaginary column back. **STFT** gives a matrix of amplitude or power against time and frequency,
  drawn as an image. The power spectral density by **Welch's method** is a gadget or app *(to
  confirm)*.
- **IIR Filter** (Pro): Butterworth, Chebyshev I and II, elliptic, Bessel; low, high, band pass
  and band stop; the order given or the least order for a ripple and an attenuation; the response
  drawn; the filter applied forwards, or forwards and backwards. **FFT Filters**: low, high, band,
  band block, threshold, parabolic low-pass *(to confirm)*. A notch is a band block *(to confirm)*.
- **Convolution** and **Deconvolution**: a signal and a response column, circular or linear,
  normalised *(to confirm)*; deconvolution by division in Fourier space. **Correlation**: auto and
  cross, circular or linear, normalised *(to confirm)*, out: lags and correlation. **Coherence**
  of two signals *(to confirm: Pro)*.
- **Hilbert Transform**: the transform, the analytic signal's amplitude (its envelope) and phase.
  **Envelope**: upper and lower envelopes by the local maxima and minima *(to confirm)*.
- **Wavelet** (Pro): DWT and IDWT, multi-scale DWT, denoise and smooth by thresholds, the CWT
  into a matrix, a decomposition of a signal at levels; the Haar, Daubechies, symlet, coiflet and
  biorthogonal families *(to confirm the families)*.
- **Interpolate/Extrapolate**: linear, cubic spline, cubic B-spline, Akima *(to confirm)*; onto
  another column's X, or n points over a range, extrapolation chosen; out: new columns. **3D
  interpolation** and **XYZ Gridding** (random or regular, Renka–Cline, Shepard, thin-plate
  spline, kriging, correlation *(to confirm)*) into a matrix.
- **Integrate**: the area by trapezoids, the area between the curve and a baseline, absolute
  areas *(to confirm Simpson)*. **Differentiate**, **Average multiple curves**, **Polygon area**.
  **Smoothing**: adjacent averaging, Savitzky–Golay, percentile filter, FFT filter, LOWESS and
  LOESS *(to confirm both)*, binomial.

## Where Kurve stands

- **Steps** (the PIPE block): an FFT filter (`fftFilter`, a zero-phase Butterworth magnitude
  applied in Fourier space, low or high, the ends mirrored), smoothing (Savitzky–Golay, moving
  average, median, Gaussian, Whittaker), a derivative and a running integral, resampling to even
  spacing by straight lines, the self-deconvolution (FIT2_SPEC 4.7). Every step checks its own
  work and warns of uneven or unsorted X.
- **The transform**: `fftInPlace`, radix 2 only, its twiddle factors worked out directly. Nothing
  shows a spectrum; nothing takes a length that is not a power of two except by padding.
- **Integration**: the trapezoid (`trapz`), `integrateBand` (a band less a local baseline, with
  its error), the Integrate window, the running integral. No Simpson, no area between curves, no
  integral of a fitted curve.
- **Interpolation**: straight lines (`interpOnto`), PCHIP and splines inside the anchors
  background; a map's Delaunay triangles; nothing writes interpolated values into columns, and
  nothing grids scattered points into a matrix.
- **Analyses and matrices**: analyses with result sheets (FOUNDATION_SPEC 1.3), worked out again
  when their data change, in the worker when large; matrix sheets (SHEET_SPEC 3.6), drawn as maps.
  Nothing yet writes a matrix as an analysis's result.

## Decisions

1. **A step keeps the X; an analysis makes a new one.** A transform of one column into one column
   on the same X is a step (filters, convolution with a kernel, deconvolution, the envelope and
   the analytic signal's parts, wavelet denoising, LOWESS), seen, checked and undone as every step
   is. One that makes another X (frequencies, lags, scales, a new grid, another column's X) is an
   analysis with a result sheet (FOUNDATION_SPEC 1.3), worked out again when its data change. A
   result that is a grid of two variables (the spectrogram, the continuous wavelet transform,
   scattered points gridded) is an analysis whose result is a **matrix sheet** it owns, read only,
   drawn as a map (decision 7).
2. **Even spacing is checked, and the cure is said.** Every tool that assumes evenly spaced X
   (all but interpolation, gridding and integration) reads the spacing: within 10⁻⁶ of the median
   step it is even; otherwise the analysis resamples onto as many evenly spaced points by straight
   lines and says so in its notes, and a step warns (as the FFT filter does) and names Resample.
   X out of order is sorted first, said the same way. The sampling interval is the median step,
   signed as `medianStep` is, and its units are X's; frequencies are in 1/X's unit (Hz for s, cm
   for cm⁻¹ — the reciprocal written out, never guessed).
3. **The numbers are the references' numbers, and the conventions are stated.** Where SciPy,
   NumPy or PyWavelets define a convention (Welch's defaults, `sosfiltfilt`'s padding and initial
   state, `detrend`, a wavelet's extension mode, `cwt`'s integration), Kurve follows it exactly, so
   a difference is rounding, not a choice; the report states each convention in words. An
   amplitude spectrum is normalised so that a sine of amplitude A reads A at its frequency (one
   side: 2|X|/Σw, the ends not doubled; two sides: |X|/Σw), a power spectrum so that it sums to
   the mean square (Parseval, the window's Σw² taken out), a power spectral density so that it
   integrates to the mean square (|X|²/(fs·Σw²)), dB as 10·log₁₀ of power and 20·log₁₀ of
   amplitude, relative to 1 in the data's units. Each result sheet names its normalisation.
4. **Any length.** The transform takes any n: a power of two by radix 2 (today's), anything else by
   Bluestein's chirp, so a prime length is as exact as a power of two (to a few ulps of the sum of
   magnitudes); padding is a choice (none, to the next power of two, to a length typed), never
   silent.
5. **A filter is designed, then applied in sections.** IIR filters are designed as SciPy designs
   them (the analog prototype's zeros, poles and gain; the band transformed; the bilinear
   transform with the edges pre-warped) and applied as second-order sections, forwards and
   backwards by default (zero phase, the order doubled in effect, said) with `sosfiltfilt`'s odd
   padding and initial state, or forwards only (its delay said). The design is shown before it is
   applied: the magnitude response drawn in the step's panel against the data's own frequencies,
   the edges marked. An unstable or degenerate design (a cut-off at or past Nyquist, a band with
   its edges crossed, an order that rings past the data's length) is refused in words. The FFT
   filter of today stays as it is.
6. **Deconvolution states its noise.** Wiener's deconvolution needs a noise-to-signal ratio; given,
   it is used; not given, it is estimated from the spectrum's high-frequency floor and stated. The
   step warns, as the self-deconvolution does, by how much the noise rises.
7. **A matrix an analysis makes is the analysis's.** It is a matrix sheet (`p.mats`) carrying
   `ana: <analysis id>`, read only as a result sheet is (`anaRO`), worked out again with the
   analysis, deleted with it, cut from it into an ordinary matrix by *Cut from its data* as a
   result column is; its map is drawn by the matrix window's Plot as any matrix's.
8. **Wavelets are PyWavelets'.** The filters (Haar, Daubechies 1–20, symlets 2–20, coiflets 1–17)
   are PyWavelets' coefficients, written into the file to 17 digits (they are constants, not
   code); the extension modes are its own (symmetric by default, periodization, zero, constant,
   reflect, periodic, smooth, antisymmetric, antireflect), so `wavedec` and `waverec` agree with it
   coefficient by coefficient. The continuous transform is `pywt.cwt`'s (the wavelet integrated,
   resampled per scale, convolved, differenced), so its matrix agrees cell by cell.
9. **Interpolation says where it is guessing.** Extrapolation is off by default (empty cells past
   the data), and chosen per analysis (the method's own curve, a straight line from the end, the
   end's value); the result sheet marks each row interpolated, extrapolated or measured (a point
   that lands on a measured X takes its value exactly). Methods follow SciPy's: `interp1d`/
   `numpy.interp` for straight lines, `CubicSpline` with its boundary conditions, `Akima1DInterpolator`,
   `PchipInterpolator`, `make_smoothing_spline` (λ given or found by generalised cross-validation).
10. **Integrals carry their error.** Simpson's rule (SciPy's `simpson`, its even-count correction)
    beside the trapezoid; the error of each from the Y errors, as `integrateBand` carries it; the
    integral of a fitted curve closed where the model's antiderivative is known, else by adaptive
    Gauss–Kronrod to 1e-12 relative, its parameter uncertainty by the delta method through the
    fit's covariance (as derived values are).
11. **LOWESS is a smoothing method.** Cleveland's LOWESS (degree 1, tricube weights, `it`
    robustifying iterations, `delta` skipping, statsmodels' `lowess` exactly) and LOESS (degree 2)
    are methods of the Smooth step, so they are checked (the height they take off the narrowest
    band) and undone as smoothing is. The fraction is the setting, not a window in points.

## The data model

- A new pure block `==SIG:START/END==` after MAT, loaded by the compute worker, `tools/ref/run.mjs`
  and `tools/sig-test.mjs`: the transform (`fftAny`, `rfft`, `irfft`), windows (`sigWindow`),
  `detrendV`, spectra (`spectrum`, `welch`, `csd`, `coherence`, `stft`), filter design and
  application (`iirDesign`, `firDesign`, `iirNotch`, `sosfilt`, `sosfiltfilt`, `firFiltfilt`,
  `sosFreqz`), `correlate`, `convolve`, `wiener`, `analytic`, `envelopes`, wavelets (`WAVELETS`,
  `dwt`, `idwt`, `wavedec`, `waverec`, `wdenoise`, `cwt`), interpolation (`interp1`, `splineFit`,
  `akima`, `pchip`, `smoothSpline`, `gridXYZ`), calculus (`simpson`, `areaBetween`, `gk21`,
  `lowess`). Each returns plain arrays and `{fail}` in words; nothing reads the page.
- Analysis kinds (the ANA block, `pts: true` unless said): `fft` (`p.win`, `p.wpar` the window's
  parameter, `p.pad` "none"|"pow2"|a length, `p.detrend` "none"|"mean"|"linear", `p.sides` 1|2,
  `p.shift`, `p.unwrap`, `p.deg`, `p.outs` the columns written), `psd` (Welch: `p.win`, `p.nseg`,
  `p.over`, `p.detrend`, `p.scaling` "density"|"spectrum", `p.avg` "mean"|"median", `p.sides`),
  `ifft` (`cells`: a real and an imaginary column and `p.dx` or a frequency column), `xcorr` (one
  column auto, two cross; `p.norm` "none"|"biased"|"unbiased"|"coeff", `p.maxlag`, `p.demean`),
  `coh` (two columns; Welch's settings), `stft` (`p.win`, `p.nseg`, `p.over`, `p.scaling`, `p.db`;
  out a matrix), `dwt` (`p.wav`, `p.level`, `p.mode`; out the coefficients a column a level), `cwt`
  (`p.wav` "morl"|"mexh"|"gaus1"…, `p.s0`, `p.s1`, `p.ns`, `p.log`; out a matrix), `interp`
  (`p.method`, `p.bc`, `p.lam`, `p.grid` "n"|"step"|"col", `p.n`, `p.step`, `p.x0`, `p.x1`,
  `p.at` a column's id, `p.extra` "none"|"method"|"line"|"end"), `grid` (`cells`: X, Y, Z columns;
  `p.method` "tri"|"tps"|"shepard"|"renka", `p.nx`, `p.ny`, `p.smooth`; out a matrix), `integ`
  (`p.rule` "trap"|"simpson", `p.x0`, `p.x1`, `p.base`), `between` (two columns; `p.x0`, `p.x1`).
- An analysis's matrix: `a.out.mat` the matrix book's id; the sheet carries `ana: a.id` and `ak`
  its key, as a result column does; `anaRO` and `matPut` refuse writes to it.
- Steps (the PIPE block): `iir` (`kind` "butter"|"cheby1"|"cheby2"|"ellip"|"bessel", `band`
  "low"|"high"|"pass"|"stop", `order`, `f1`, `f2` in 1/X's unit, `rp`, `rs`, `phase`
  "zero"|"causal"), `fir` (`band`, `taps`, `f1`, `f2`, `win`, `wpar`), `notch` (`f0`, `q`,
  `harm` harmonics taken too), `conv` (`kern` "gauss"|"lorentz"|"box"|"tri"|"exp"|"col", `w`, `col`
  a column's id, `norm` "area"|"none"), `deconv` (the same kernel, `nsr` null estimated), `hilb`
  (`out` "env"|"phase"|"freq"|"imag"), `env` (`side` "upper"|"lower"|"mean", `join`
  "pchip"|"spline"|"line", `gap` the least distance between extrema), `wden` (`wav`, `level`,
  `rule` "universal"|"sure"|"minimax", `mode` "soft"|"hard", `scope` "level"|"global"); the
  Smooth step's methods gain `lowess` and `loess` (`frac`, `it`, `delta`).
- A fit's integral: `fitIntegral(f, a, b)` → `{v, se, how: "closed"|"numerical", err}`, a row of
  Results' derived values when asked (Analyze › Fit › Integrate the fitted curve…), carried by the
  report and the CSV.

## The order

5.1 the transform and its output (the engine every later slice reuses) → 5.2 filters designed (the
response drawn with 5.1's frequencies) → 5.3 correlation and convolution (5.1's transform) → 5.7
interpolation (its splines are 5.4's envelopes' and 5.8's) → 5.4 envelopes → 5.5 the short-time
transform (the first analysis that writes a matrix) → 5.6 wavelets (the continuous transform is a
matrix too) → 5.8 calculus further. Each slice is committed and pushed when its checks pass; the
wave ends as every wave does.

## References, by slice

| Slice | Outside reference | Tolerance |
|---|---|---|
| 5.1 | `numpy.fft.fft`, `rfft`, `irfft`, `ifft` at lengths 1 to 4097 (primes, powers of two, products of small primes); `scipy.signal.get_window` for every window; `scipy.signal.periodogram` and `welch` (every scaling, detrend, average, side); `numpy.unwrap`; a sine's amplitude read back | 1e-12 of the largest magnitude; windows 1e-14 |
| 5.2 | `scipy.signal.butter`, `cheby1`, `cheby2`, `ellip`, `bessel` (zeros, poles, gain, `output="sos"` compared by response), `sosfilt`, `sosfiltfilt`, `freqz_sos`, `firwin`, `filtfilt`, `iirnotch` | response 1e-10; filtered output 1e-9 of the signal's scale |
| 5.3 | `numpy.correlate`, `numpy.convolve`, `scipy.signal.correlate`, `fftconvolve`, `coherence`, `csd`; Wiener's deconvolution written from its definition in NumPy | 1e-12 of the scale |
| 5.4 | `scipy.signal.hilbert`; `numpy.unwrap`; the envelope's extrema by `scipy.signal.argrelextrema` and its curve by `PchipInterpolator` / `CubicSpline` | 1e-12 |
| 5.5 | `scipy.signal.ShortTimeFFT` and `spectrogram` (every scaling, a detrend, padding at the ends as SciPy's default) | 1e-12 of the largest cell |
| 5.6 | `pywt.wavedec`, `waverec`, `dwt_max_level`, every family and mode; `pywt.cwt` (morl, mexh, gaus1–8); denoising written from Donoho and Johnstone in NumPy (universal, SURE, minimax thresholds as `pywt.threshold`) | 1e-12 of the scale; perfect reconstruction 1e-13 |
| 5.7 | `scipy.interpolate`: `interp1d`, `CubicSpline` (natural, not-a-knot, clamped), `Akima1DInterpolator`, `PchipInterpolator`, `make_smoothing_spline`; `griddata` (linear), `RBFInterpolator` (thin-plate), Shepard's and Renka–Cline's weights written from the papers | 1e-12 linear and splines; 1e-9 smoothing and radial |
| 5.8 | `scipy.integrate.simpson`, `trapezoid`, `quad` for a fit's curve; closed forms of each model's integral; `statsmodels.nonparametric.lowess` (degree 1, `it`, `delta`); LOESS of degree 2 written from Cleveland and Devlin (1988) in NumPy | 1e-12; LOWESS 1e-10 |

Each slice adds its fixtures to `make-fixtures.py` (`tools/ref/fixtures/sig-*.json`), its targets
to `ref-test.mjs`, its generator to `diff-fuzz.py` where a function takes random inputs, and its
properties (Parseval, a filter's response at its edges, linearity, shift invariance, perfect
reconstruction, an interpolant through its points) to `tools/sig-test.mjs`.

## Budgets

An FFT of 10⁶ points of any length (a prime included) in under 0.5 s; Welch's spectrum of 10⁶
points in under 0.3 s; a filter designed in under 5 ms and applied forwards and backwards to 10⁶
points in under 0.3 s; the correlation of two columns of 10⁵ in under 0.2 s; the analytic signal
of 10⁶ in under 0.5 s; a spectrogram of 10⁶ samples into up to 4·10⁶ cells in under 1.5 s in the
worker; a DWT of 10⁶ at eight levels in under 0.3 s; a CWT of 10⁴ points at 100 scales in under 3 s
in the worker; interpolation of 10⁶ points onto 10⁶ in under 0.5 s; a thin-plate grid of 2 000
points onto 200 × 200 in under 3 s in the worker; LOWESS of 10⁴ points in under 0.5 s; nothing on
the page for more than 100 ms. `perf.mjs` gains each.

## 5.1 The transform, with its output

Done 18.11, as below, with these changes of plan: no Welch window (SciPy has none, and its definitions differ), so ten
windows; a prime length of 10⁶ takes about a second (three transforms of 2²¹ by Bluestein's chirp), so a column past
400 000 points is transformed in the worker, the page never waiting, and the budget is a power of two of 10⁶ in 0.2 s and
any length in 1.5 s in the worker; a kind may read another analysis's result columns (`resIn`: the inverse reads an FFT's
real and imaginary parts), never its own or those of an analysis that reads it; the phase is judged against NumPy where
the bin holds at least 1 % of the largest magnitude (elsewhere its error is rounding over a small modulus; the real and
imaginary parts are held to 1e-12 everywhere).

**What.** Analyze › Signal processing › *FFT…*, *Power spectrum (Welch)…* and *Inverse FFT…*. The
FFT analysis reads one column's points (several ticked: each its own block of columns), checks the
spacing (decision 2), takes the trend off if asked (none, the mean, a straight line, as
`scipy.signal.detrend`), multiplies by the window, pads if asked, and transforms. Out, as chosen:
frequency, real and imaginary parts, amplitude, power, the power spectral density (the periodogram
with the window), the phase (radians or degrees, unwrapped or not), dB; one side (the
non-negative frequencies) or two (shifted to run from −fs/2 if asked). The Welch analysis averages
the periodograms of overlapping windowed segments (`scipy.signal.welch`'s defaults: Hann, 256 or
the whole if shorter, half overlap, constant detrend, density), mean or median, its units the
data's squared per frequency unit. The inverse takes a real and an imaginary column (and a
spacing, or a frequency column to read it from) back to a signal: time, real, imaginary.

**The windows**: rectangle, Hann, Hamming, Blackman, Blackman–Harris, flat top, Kaiser (β),
Tukey (α), Bartlett, Gaussian (σ in points), Welch *(Origin's names among the search words)*, each
`scipy.signal.get_window`'s periodic or symmetric form as SciPy uses it (periodic for spectra, as
`periodogram` does), each with its coherent gain Σw/n and its noise bandwidth n·Σw²/(Σw)² in the
report.

**The engine**: `fftAny(re, im, inv)` (radix 2 for a power of two; Bluestein's chirp with a power
of two at least 2n − 1 otherwise, the chirp's angles reduced modulo 2n before the cosine so that a
long transform keeps its digits), `rfft`/`irfft` on top. `fftInPlace` stays for the steps that use
it today, so no step's output moves.

**Checks.** Every case of the references table to its tolerance; Parseval's sum for every window
and length; a sine of amplitude 3 at a bin reads 3.000 in the amplitude column; a prime length of
10⁶ + 3 against NumPy; a column with uneven X resampled and said; a column of one point and of
two refused in words; masked points left out and said; the result sheet worked out again after a
value changes; the report, the copied table and the CSV carrying the normalisation and window.

**Not in it.** Zoom FFT and the chirp-z transform as a tool; two-dimensional FFTs of a matrix (wave
7's plots may want them); a spectrum's peak table (Peaks… finds peaks in any column, a result
column included).

## 5.2 Filters designed

Done 18.11, as below, with these changes of plan: the response is drawn on a log scale of frequency over the three decades below
Nyquist (a linear axis squeezed a low edge against 0), forwards and backwards in doubled dB; the notch says when its ringing reaches
a third of the data, as the designed filter does; Bessel is designed to order 20 like the others (its poles by Aberth's iteration
on the Bessel polynomial from Campos-Calderon's starts, as SciPy does); a design is compared with SciPy's as a set of sections, the
first (with the gain) in place, since two mirror poles equally near the unit circle may be paired in either order; filtering is
judged against SciPy on the scale of max|x|/(1 − max|pole|), since a resonant section loses those digits in both (5.8e-12 for each,
against 40 digits); the mean a detrend takes off is a compensated sum (a level a thousand times its spread showed at the lowest
frequencies), so Kurve's Welch agrees with 40 digits to 4e-16 where SciPy's least-squares line is 2e-12 off.

**What.** Analyze › Signal processing › *Filter…* opens a step: the kind (Butterworth, Chebyshev I,
Chebyshev II, elliptic, Bessel, FIR by a windowed sinc), the band (low, high, band pass, band
stop), the order (1 to 20; FIR: taps), the edges in 1/X's unit (with the Nyquist frequency shown
beside them), the ripple and attenuation for Chebyshev and elliptic, the phase (zero: forwards and
backwards; causal: forwards only). *Notch…* removes a frequency and, if asked, its harmonics (`iirnotch`
with Q). The step's panel draws the magnitude response in dB against frequency up to Nyquist, the
edges marked, before anything is applied. The step warns, as every filter step does, of uneven X, of
the band it would cut out of a clear band (the narrowest band's height lost), and of a filter whose
impulse response is longer than a third of the data (the edges it rings at).

**The design**: SciPy's analog prototypes (`buttap`, `cheb1ap`, `cheb2ap`, `ellipap` through the
complete elliptic integral and Jacobi's functions by the AGM and descending Landen
transformations, `besselap` with the phase normalisation, its roots by Aberth's method as SciPy
finds them), the band transformations `lp2lp`, `lp2hp`, `lp2bp`, `lp2bs` in zeros, poles and gain,
`bilinear_zpk` with the edges pre-warped at fs = 2, and `zpk2sos` with SciPy's pairing ("nearest");
`sosfiltfilt` with its odd extension of 3·(2·sections + 1) points less the trivial ones and
`sosfilt_zi`'s initial state. FIR: `firwin` (a windowed sinc, Hamming by default, scaled to unit
gain at the band's centre), applied forwards and backwards by `filtfilt`'s rule.

**Checks.** The references table; each design's magnitude at its edges (−3.0103 dB for
Butterworth, −rp for Chebyshev I and elliptic, −rs for Chebyshev II), monotone where it should be;
a step of order 20 high-pass on 10⁶ points in the budget; Nyquist and a crossed band refused in words.

**Not in it.** The least order for a given ripple and attenuation (`buttord` and the like: a later
addition to the same dialog); the FFT filter's threshold and parabolic kinds; filter banks; the
group delay drawn.

## 5.3 Correlation and convolution

Done 18.11, as below, with these changes of plan: the lag is counted from where each column starts (k times the spacing plus the
first's first X less the second's), so it is the true shift, and the report says in words which column follows which at the
largest value (NumPy's sign, a later copy at a negative lag, misleads otherwise); convolution offers the column mirrored past its
ends beside NumPy's zeros, and a kernel column's origin is X = 0 when its X spans 0, else its top; the deconvolution's ratio left
empty is estimated (a test caught `null >= 0` being true, which had made it 0: the raw inverse).

**What.** Analyze › Signal processing › *Correlation…* (an analysis: one column against itself, or
two; lags from −m to m; normalised none, biased, unbiased or as a coefficient; the means taken
off first or not; out: lag in X's unit, the correlation; the lag of the largest value in the
report), *Coherence…* (an analysis of two columns by Welch's segments: frequency, coherence, the
cross-spectrum's magnitude and phase), *Convolution…* and *Deconvolution…* (steps: with a kernel
shape — Gaussian, Lorentzian, box, triangle, one-sided exponential — of a width in X's unit, or
with another column read on this column's spacing; normalised to unit area or not; the result on
the same X, as `numpy.convolve(mode="same")` centres it). Deconvolution is Wiener's (decision 6).
Two columns on different spacings are read on the first's spacing by straight lines and said.

**Checks.** The references table; the correlation of a column with itself shifted by k points
peaks at lag k; convolution then Wiener deconvolution with a small ratio gives the column back to
the noise said; coherence of a signal with itself is 1.

**Not in it.** Circular correlation as a choice (padding makes every one linear); a matrix of
cross-correlations of many columns; blind deconvolution.

## 5.7 Interpolation into columns

Done 18.11, as below, with these changes of plan: Renka–Cline (SciPy's Clough–Tocher, its gradients by global minimisation) is
left for later, the three griddings here meeting the slice's cases; the thin-plate spline takes 3 000 points at most and 2 000
onto 200 × 200 take about 5 s in the worker (its system of 2 003 by blocked LU, which halved the time; a symmetric indefinite
factorisation would halve it again), so its budget is 6 s; the smoothing spline is Reinsch's (the same curve as SciPy's B-splines,
7e-12 from 40 digits where SciPy is 2e-11), its λ by GCV through a port of SciPy's bounded search, judged within that search's
1e-5; the thin plate is judged to 1e-8, its system's condition reaching 3e9 for points 2 500 times wider than tall (Kurve 3.8e-9
from 40 digits, SciPy 5.3e-9); the gridding is the first analysis with a matrix of its own (decision 7), the layer 5.5 and 5.6
use: `anaWriteMat`, read only through `matPut`, cut and deleted with the analysis.

**What.** Analyze › Calculus › *Interpolate…* (an analysis: one column or several, the method —
straight lines, cubic spline natural, not-a-knot or clamped with the end slopes given, Akima,
PCHIP, smoothing spline with λ given or by cross-validation — onto n points over a range, a step
over a range, or another column's X; extrapolation as decision 9; out: X, Y, and a column saying
measured, interpolated or extrapolated). Matrix › *From scattered X, Y, Z…* (an analysis writing a
matrix: Delaunay's triangles in straight lines (the map's own, scaled), thin-plate spline (with a
smoothing given), Shepard's inverse-distance weighting (modified, with its radius), Renka–Cline's
cubic over the triangles; nx × ny over the points' extent or a range).

**Checks.** The references table; each interpolant through its own points; a straight line kept
exactly by every method; a constant kept; extrapolated rows marked; repeated X averaged first and
said; a grid of points on one line refused in words.

**Not in it.** Kriging; three-dimensional interpolation (XYZ to a value at a fourth); B-splines as
a separate method (the smoothing spline covers fitting a smooth curve).

## 5.4 Envelope

Done 18.11, as below, with these changes of plan: the Hilbert envelope is put back on the column's mean so it lies over the data;
the frequency is NumPy's gradient of the unwrapped phase (central differences, so as many values as points); straight lines hold
the end extrema to the ends as numpy.interp does, PCHIP and the spline continue as SciPy's do; a million points of a length that is
not a power of two take two Bluestein transforms, about 2 s on the page (a mixed-radix transform for lengths of small primes is
left for later), so the budget is a power of two of 2²⁰ in 0.6 s.

**What.** Analyze › Signal processing › *Envelope…* (a step): the amplitude of the analytic signal
(`scipy.signal.hilbert`: the transform's negative frequencies set to zero, the positive doubled,
padded to a length the user may choose), its phase (unwrapped), its instantaneous frequency (the
phase's derivative over 2π, in 1/X's unit), the Hilbert transform itself; or the upper, lower or
middle envelope by the local maxima or minima joined by PCHIP, a spline or straight lines, the
extrema at least a distance apart. The analytic signal is taken after the mean is off (said),
since an envelope of an offset signal is the offset's.

**Checks.** The references table; the envelope of A·cos(ωt) is A to the edge effects said; the
instantaneous frequency of a chirp is its frequency; the upper envelope lies on or above every
point.

**Not in it.** Empirical mode decomposition; the Teager–Kaiser operator.

## 5.5 Short-time FFT

**What.** Analyze › Signal processing › *Spectrogram…* (an analysis writing a matrix, decision 7):
the window and its length, the overlap, padding, detrend, scaling (power spectral density,
power, amplitude, dB of either), one side; the matrix's X the segments' centres in X's unit, Y the
frequencies, Z the values; drawn as a map at once (the matrix window's Plot) with its colour bar.
In the worker past `ANA_BIG`.

**Checks.** The references table; a chirp's ridge follows its frequency; the matrix worked out
again when the column changes, refused to typing, cut from its analysis into an ordinary matrix.

**Not in it.** Reassigned and synchrosqueezed spectrograms; Wigner–Ville.

## 5.6 Wavelets

**What.** Analyze › Signal processing › Wavelets › *Decompose (DWT)…* (an analysis: the wavelet,
the levels (to `dwt_max_level`), the mode; out: a column per level of detail coefficients and the
last approximation, each with its own index X; and the reconstruction from each level alone, on the
data's X, so a level can be plotted against the signal), *Denoise…* (a step: decision 8's wavelets,
the universal, SURE or minimax threshold, soft or hard, one threshold for all levels or one per
level, the noise from the finest level's median absolute deviation, said), *Continuous (CWT)…* (an
analysis writing a matrix of |coefficients| or their real part against X and scale (or the
pseudo-frequency `pywt.scale2frequency` gives); Morlet, Mexican hat, Gaussian derivatives).

**Checks.** The references table; perfect reconstruction for every family and mode; denoising a
noisy sine brings the error down and says the threshold used; the CWT of a sine peaks at its
scale.

**Not in it.** Biorthogonal and reverse biorthogonal families, the discrete Meyer and complex
continuous wavelets (later additions to the same tables); wavelet packets; two-dimensional
transforms of a matrix.

## 5.8 Calculus, further

**What.** Integrate… (today's window) gains Simpson's rule beside the trapezoid (its result and its
error from the Y errors, decision 10); Analyze › Calculus › *Integrate as an analysis…* (`integ`: a
result sheet of each column's area, its absolute area, its centroid and its error, worked out
again with the data), *Area between two curves…* (`between`: two columns on a common X — the
union of their X, each read by straight lines — the signed area, the absolute area, the crossings
listed); Analyze › Fit › *Integrate the fitted curve…* (from a to b, closed or numerical, with its
error from the parameters' covariance, into Results' derived values, the report and the CSV);
Smooth gains LOWESS and LOESS (decision 11).

**Checks.** The references table; Simpson's rule exact for a cubic on even spacing; the area
between a curve and itself zero; the fitted curve's integral of a Gaussian peak its area parameter
with its error; LOWESS invariant to rows reordered.

**Not in it.** Double integrals over a matrix (the matrix window's sum, wave 7); differentiation
beyond Savitzky–Golay (a spline's derivative may come with 5.7's interpolants later).

## Left out of the wave

Decimation and resampling by a polynomial phase filter (resampling stays by straight lines, a
step); filter design by Parks–McClellan; the cepstrum; Hilbert–Huang; image processing on matrices
(wave 7's or not at all).
