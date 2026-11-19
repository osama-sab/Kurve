# Wave 6: many variables

The sixth wave of `PARITY_SPEC.md`. What Origin's Multivariate Analysis menu does that Kurve does not:
the factorisations underneath (6.1), principal components (6.2), clustering (6.3), discriminant
analysis (6.4) and partial least squares regression (6.5). This spec is the wave's: what Origin does,
where Kurve stands, the decisions, the data model, the order, and each slice with what it changes,
how it is checked and what it leaves out. It follows the plan's bar (`PARITY_SPEC.md`, "The bar"),
the user's rules of information hygiene (`ux/UX_SPEC.md` §3.8) and of numbers, not verdicts
(STATS_SPEC decision 9), none of which are repeated here.

Origin's documentation could not be opened from this session (its hosts are refused here, as for
waves 1 to 5); what follows rests on Origin's help as remembered, and the points to check in Origin
itself are marked *(to confirm)*:
[Principal Component Analysis](https://www.originlab.com/doc/Origin-Help/PrincipleComp-Analysis),
[K-Means Cluster Analysis](https://www.originlab.com/doc/Origin-Help/KMeans-Analysis),
[Hierarchical Cluster Analysis](https://www.originlab.com/doc/Origin-Help/Hierarchical-Cluster-Analysis),
[Discriminant Analysis](https://www.originlab.com/doc/Origin-Help/Discriminant-Analysis),
[Partial Least Squares](https://www.originlab.com/doc/Origin-Help/PLS).

## How Origin does it

- **Principal Component Analysis** (Statistics › Multivariate Analysis, Pro): variables are
  columns, observations rows; the analysis on the correlation matrix (the default) or the
  covariance matrix; the number of components to extract; missing values left out listwise or
  pairwise *(to confirm pairwise)*. Out: descriptive statistics, the correlation matrix, Bartlett's
  test of sphericity and the KMO measure *(to confirm)*, the eigenvalues with the share of
  variance and its running total, the eigenvectors (loadings), the scores, and the scree plot, the
  loading plot, the score plot and the biplot. A separate app does PCA for spectroscopy (spectra as
  observations, Hotelling's T² and the Q residuals) *(to confirm)*.
- **K-Means Cluster Analysis**: the number of clusters, the initial centres (from the data, or
  given), the iterations, the variables standardised or not; out: the final centres, the distances
  between them, an ANOVA of each variable over the clusters *(to confirm)*, each observation's
  cluster and its distance to the centre.
- **Hierarchical Cluster Analysis**: observations or variables clustered; the method (nearest
  neighbour, furthest neighbour, group average, centroid, median, Ward); the distance (Euclidean,
  squared Euclidean, city block, cosine, Pearson correlation, Jaccard *(to confirm)*); the
  variables standardised or not; out: the agglomeration schedule, the dendrogram, the membership
  for a number of clusters, the centroids, the distance matrix.
- **Discriminant Analysis**: linear or quadratic *(to confirm quadratic)*; the priors equal or from
  the group sizes; out: tests of equality of group means (Wilks' Λ per variable), the canonical
  discriminant functions (eigenvalues, the share of variance, the canonical correlations, Wilks' Λ
  with its χ²), the standardised and raw coefficients, the structure matrix, the functions at the
  group centroids, the classification function coefficients, the classification table (training
  and cross-validated, leave one out), each observation's posterior probabilities, the canonical
  score plot.
- **Partial Least Squares** (Pro): the method (SVD or Wold's iterative, NIPALS *(to confirm)*), the
  variables scaled or not, the number of factors by leave-one-out cross-validation (the root mean
  PRESS); out: the variance explained in X and Y by each factor, the coefficients, the VIP, the X
  and Y loadings, weights and scores, the fitted values and residuals; plots of the variance
  explained, the cross-validation, the scores, the loadings, the VIP and the coefficients.

## Where Kurve stands

- **Linear algebra** (NUMERICS): `svdVals` (singular values alone, one-sided Jacobi, for the linear
  model's condition number), Householder QR inside `lsqQR`, `eig3` (a 3 × 3 matrix's eigenvalues by
  its cubic, for the ellipse fit), `gaussSolve` (blocked LU), `inverse`. No singular vectors, no
  symmetric eigenproblem of any size.
- **Analyses** (FOUNDATION_SPEC 1.3): result sheets worked out again when their data change, in the
  worker when large, read only; inputs read through `anaRead` (processed values, rows, listwise) or
  `anaPts` (each column's processed points); reports with sections and actions that make graphs.
- **Spectra as observations**: a series of spectra on one X is Kurve's daily material (the heat
  map, batch fits, trends), and the series variable (`seriesOf`: the order, a number in the names,
  values typed, a header field) gives each spectrum a value. Nothing yet reads a set of spectra as
  a table of observations.
- **Correlation matrices** (STATS_SPEC 2.9) and the linear model (2.5) exist; nothing reduces,
  groups or classifies observations.

## Decisions

1. **Two layouts, chosen and said.** *Columns are the variables* (Origin's): each row an
   observation, each column ticked a variable, a row read only when every column has a value there
   (listwise always, the rows left out counted). *Each curve is an observation* (spectroscopy's):
   each column ticked a curve, its processed points the variables, read at its X. The curves must
   share an X: where they do not, every curve is read on the first curve's X over the range they
   all cover, by straight lines between its own points (masked ones left out, so bridged), and the
   notes say so with the number of points read. The layout is the first setting of every kind in
   this wave and is named in the report's method line.
2. **Signs are a stated convention.** A component's direction is arbitrary; each one (a PCA
   loading vector, a canonical discriminant function, a PLS weight vector) is turned so that its
   entry of largest magnitude is positive, the first such entry where two are equal (scikit-learn's
   rule for PCA since 1.5). The report says so. The references are compared after the same rule.
3. **Factorise the data, never square it.** PCA is the singular value decomposition of the centred
   (and scaled) data, not the eigenvalues of a covariance matrix formed from it; discriminant
   analysis whitens the within-group data by its own SVD (scikit-learn's `svd` solver); PLS works on
   the centred data by NIPALS or SIMPLS. So a small eigenvalue keeps its digits, and a nearly
   constant variable does not take them all.
4. **Scaling is a setting.** Each variable centred; then left as it is (the covariance), divided by
   its standard deviation with n − 1 (unit variance, the correlation), or by the square root of it
   (Pareto, as chemometrics has it). The defaults: unit variance for columns (their units differ),
   centred for curves (one unit for every point). A variable whose standard deviation is zero is
   refused in words under unit variance and Pareto, naming it; under centring it is kept and adds
   nothing.
5. **Results are sheets and graphs made from them.** Each method is an analysis kind with a result
   sheet (FOUNDATION_SPEC 1.3), worked out again when its data change, in the worker when large;
   its report's actions draw the graphs (scree, scores, loadings, biplot, dendrogram…) from the
   result sheet's columns, each one undo step. Per group, a graph is a curve per group (result
   columns per group), so each group has its colour and its legend entry.
6. **Numbers, not verdicts.** No "two components are enough", no "the clusters are distinct", no
   "the model predicts well". Limits (Hotelling's T², the Q residuals) are numbers at a level chosen;
   the observations past them are marks (masked or marked, as the outlier tests' marks).
7. **Randomness from a seed, folds without it.** k-means' starts (k-means++) and its restarts come
   from `mulberry32(seed)`, the seed a setting shown in the report, so the same seed gives the same
   clusters. Cross-validation is never random: leave one out, k contiguous blocks, or venetian
   blinds (observation i in fold i mod k), the folds said.
8. **Clusters are numbered by the data.** Cluster 1 is the one holding the first observation, 2 the
   one holding the first observation not in 1, and so on, for k-means and hierarchical alike; the
   references' labels are compared as partitions. Membership is written as text (1, 2, …) into the
   result sheet, a row per observation; *Put the clusters in the data* copies it into a categorical
   column on the data's sheet (one undo step, a record entry), a copy that a later recalculation does
   not change.
9. **Groups come from text.** In the columns layout a column of groups is a text or categorical
   column (or numbers, read as their values); in the curves layout, a header field the curves' files
   share, as written. Groups are written as text in the result sheets, so a later analysis (a
   discriminant analysis on a PCA's scores) can read them.
10. **The number of components is the user's.** PCA lists every eigenvalue and writes the scores and
    loadings of the first k (all up to 10 by default); PLS takes a number typed, or by default the
    number with the least RMSECV, which the method line says ("3 components, the least RMSECV").
11. **Composable.** A kind of this wave may read another analysis's result columns (`resIn`, as the
    inverse FFT reads an FFT's), so a clustering or a discriminant analysis can run on a PCA's scores
    with its groups.

## The data model

- NUMERICS: `svd(A, {vectors})` (A an array of rows; `{s (descending), U, V, rank}`: Householder QR
  with column pivoting of the orientation with fewer columns, then one-sided Jacobi (Hestenes) on R,
  as Drmač and Veselić; the rank where s falls below max(m, n)·ε·s₁), `symEig(A)` (`{vals
  (descending), vecs}`: Householder tridiagonalisation and the implicit QL iteration, EISPACK's
  `tred2` and `tql2`), `svdFlip` (decision 2). `svdVals` stays for the linear model.
- A pure block `==MV:START/END==` after SIG, loaded by the compute worker, `tools/ref/run.mjs` and
  `tools/mv-test.mjs`: `mvTable(ins, p)` (the two layouts into `{X (n rows of p), obs, vars, vx,
  groups, notes}`), `mvScale(X, how)`, `pca(X, {scale, k, level})` (with `pcaLimits`: T² by the F
  and beta distributions, Q by Jackson and Mudholkar), `kmeansPP`, `kmeans(X, {k, seed, restarts,
  maxIter})`, `silhouette(X, labels)`, `linkage(X, {method, metric})` (SciPy's table: the two
  clusters joined, the height, the size; the nearest-neighbour chain, the minimum spanning tree for
  single), `cutTree(Z, {k | h})`, `dendroXY(Z, names)`, `cophenet`, `lda(X, g, {priors})`,
  `ldaLoo`, `plsFit(X, Y, {algo: "nipals"|"simpls", a, scale})`, `plsCv(X, Y, {amax, folds})`,
  `plsVip`. Each returns plain arrays and `{fail}` in words; nothing reads the page.
- Analysis kinds (the MV block's): `pca`, `kmeans`, `hclust`, `lda`, `pls`, each with `p.layout`
  "cols"|"curves"; the curves layout reads `anaPts` (each curve's processed points), the columns
  layout `anaRead`'s values aligned by row (`K.pts` a function of the settings). Groups: `p.grp` a
  column id (columns) or `p.meta` a header field (curves). PLS's Y: `p.y` column ids (columns) or
  the series variable (curves: `seriesVals` of the curves, passed in the inputs and read by `anaSig`).
- Plots from the result sheet (report actions, as `anaRocPlot`): scree, scores by group, loadings
  (against X for curves), biplot, T² against Q; clusters, cluster means (curves), silhouettes,
  dendrogram (a curve with gaps, the leaves named along X by `ax.x.cats`); canonical scores by
  group; measured against predicted, RMSECV against components, coefficients and VIP.

## The order

6.1 the factorisations (everything else stands on them) → 6.2 PCA (the layouts, scaling, signs and
the plots that every later kind reuses) → 6.3 clustering (may run on 6.2's scores) → 6.4 discriminant
analysis (6.1's SVD; may run on 6.2's scores) → 6.5 PLS (6.2's layouts and scaling, 6.4's folds).
Each slice is committed and pushed when its checks pass; the wave ends as every wave does.

## References, by slice

| Slice | Outside reference | Tolerance |
|---|---|---|
| 6.1 | `numpy.linalg.svd`, `eigh`; mpmath's `svd_r` and `eigsy` at 40 digits for Hilbert matrices to 12 × 12; random matrices 1 × 1 to 60 × 200, both orientations, rank-deficient ones (products of thin factors), graded ones (rows and columns scaled over 10¹²), repeated singular values | singular values 1e-13 of s₁ (Hilbert: against 40 digits); UᵀU and VᵀV within 1e-13 of I; A − USVᵀ within 1e-14 of s₁; singular vectors by the angle to the reference's, times the gap, within 1e-12 of s₁ |
| 6.2 | `sklearn.decomposition.PCA(svd_solver="full")`: `components_`, `explained_variance_`, `explained_variance_ratio_`, `transform`; Hotelling's T² and the Q residuals with their limits written from Jackson (1991) and Jackson and Mudholkar (1979) in NumPy, the quantiles by `scipy.stats` | 1e-12 of the largest |
| 6.3 | `sklearn.cluster.KMeans(init=Kurve's starting centres, n_init=1, algorithm="lloyd", tol=0)`: labels as a partition, centres, inertia; `sklearn.metrics.silhouette_samples`; `scipy.cluster.hierarchy.linkage` (single, complete, average, Ward; Euclidean, correlation), `fcluster`, `cophenet`, `dendrogram`'s leaves | 1e-12 |
| 6.4 | `sklearn.discriminant_analysis.LinearDiscriminantAnalysis` (solvers `svd` and `eigen`, priors given): `predict`, `predict_proba`, `transform` (signs aligned); `cross_val_predict` with `LeaveOneOut`; statsmodels' `MANOVA` for Wilks' Λ; Bartlett's χ², the canonical correlations and the coefficients written from their definitions in NumPy | 1e-10 |
| 6.5 | `sklearn.cross_decomposition.PLSRegression` (scaled and not, `tol=1e-15`): `coef_`, `intercept_`, `x_scores_`, `x_weights_`, `x_loadings_`, `predict`; `cross_val_predict` with `KFold` (contiguous) and `LeaveOneOut`; SIMPLS written from de Jong (1993) in NumPy; VIP from its definition (Wold, Sjöström and Eriksson 2001) | 1e-12 one Y; 1e-10 several (NIPALS iterates) |

Each slice adds its fixtures (`tools/ref/mv_fixtures.py`, `tools/ref/fixtures/mv-*.json`), its
targets to `targets.json`, its generator to `diff-fuzz.py`, and its properties (invariance to the
rows' order, to a variable's units under unit variance, reconstruction from all components, a
partition's labels) to `tools/mv-test.mjs`.

## Budgets

The SVD of 50 × 50 in under 5 ms, of 300 × 2 000 in under 1 s; the eigenproblem of 200 × 200 in under
0.3 s; PCA of 10⁶ rows of 10 columns, or of 300 curves of 2 000 points, in under 1.5 s in the worker;
k-means of 10⁵ rows of 10 variables, k = 10, 10 restarts, in under 3 s in the worker; hierarchical
clustering of 3 000 observations in under 3 s in the worker (more refused in words, k-means named);
discriminant analysis of 10⁴ rows of 20 variables, leave one out included, in under 1 s; PLS of 100
curves of 1 000 points, 10 components, leave one out, in under 2 s in the worker; nothing on the page
for more than 100 ms. `perf.mjs` gains each.

## 6.1 SVD and eigenvalues

**What.** `svd` and `symEig` in NUMERICS, with nothing a user sees: the engine of the wave. `svd`
works on the orientation with fewer columns, preconditions it by Householder QR with column pivoting,
and orthogonalises R's columns by one-sided Jacobi rotations (Hestenes), which keeps the small
singular values of a graded matrix to their relative digits; U from the rotated columns, V from the
rotations, both completed to an orthonormal basis where the rank falls short. `symEig` is EISPACK's
tridiagonal reduction and implicit QL, eigenvalues descending, each vector turned by decision 2.

**Checks.** The references table; A = USVᵀ, orthogonality, invariance to a row or column permutation
and to an orthogonal factor, the singular values of a diagonal matrix, of a rank-one matrix, of the
zero matrix; `symEig` of a matrix built from known eigenvalues and of one with repeated ones.

**Not in it.** Non-symmetric eigenproblems; complex matrices; a partial SVD for a few components of a
huge matrix (the curves layout's matrices are a few hundred by a few thousand).

## 6.2 Principal components

**What.** Analyze › Statistics › Multivariate › *Principal component analysis…*. The layout (decision
1), the scaling (decision 4), the number of components to write (k, all up to 10 by default, at most
50), the group column or header field, the level of the limits (95 % by default, 99 %). Out, on the
result sheet: the eigenvalues (each component's variance, its share and the running total, every
component), the loadings (a row per variable: the variable's name and, for curves, its X; a column
per component), the scores (a row per observation: its name or row, its group, a column per
component), Hotelling's T² and the Q residuals of each observation with their limits at the level
(T² by the beta distribution for the observations themselves, Q by Jackson and Mudholkar), and the
descriptive statistics of each variable for the columns layout. The report: the method (layout,
scaling, the sign rule), the eigenvalue table, the limits, the observations past them; its actions:
*Scree plot*, *Scores plot* (two components chosen, a curve per group), *Loadings plot* (columns:
each variable a labelled point; curves: each loading a curve against X), *Biplot* (the standardised
scores as points, the loadings as lines from the origin, labelled, scaled by one factor said), *T²
against Q* (with the limits as lines), *Mask the observations past a limit* (columns layout: each
variable's point in those rows, one undo step) or *Mark them*.

**Checks.** The references table; scores times loadings plus the means giving the data back with every
component; unit variance invariant to a variable's units; the eigenvalues adding up to the total
variance; T²'s mean (k(n − 1)/n) over many rows; the curves layout equal to the columns layout of the
transposed table; curves on different X read on the first's and said.

**Not in it.** Rotations (varimax, oblimin) and factor analysis; pairwise missing values; robust PCA;
PCA of a matrix sheet (its rows as observations) unless asked.

## 6.3 Clustering

**What.** Analyze › Statistics › Multivariate › *k-means clustering…* and *Hierarchical clustering…*.
k-means: the layout, the variables standardised or not (unit variance, Pareto, as is), k, the seed,
the restarts (10), Lloyd's iterations from k-means++ starts until no observation changes cluster (at
most 300); a table of k from 2 to a number typed (the within-cluster sum of squares and the mean
silhouette, to help choose; not a verdict). Out: each observation's cluster (text), its distance to
its centre and its silhouette; the centres (a row per variable for curves, so each centre is a curve
against X); per cluster its size, within sum of squares and mean silhouette. Hierarchical: the layout,
the scaling, the method (single, complete, average, Ward), the distance (Euclidean, or 1 − r, the
correlation's), the cut (a number of clusters, or a height). Out: the merge table (SciPy's: the two
joined, the height, the size), the leaves' order, each observation's cluster, the cophenetic
correlation. Actions: *Plot the clusters* (two variables or two components, a curve per cluster),
*Plot the cluster means* (curves: each centre against X), *Silhouette plot*, *Plot against k*,
*Plot the dendrogram* (the leaves named along X, the cut a dashed line), *Put the clusters in the
data* (decision 8).

**Checks.** The references table; the partition invariant to the rows' order (k-means from the same
starts, hierarchical without ties); Ward's heights against the increase of the within sum of squares;
a cut into k giving k clusters; single linkage's heights the minimum spanning tree's; the dendrogram's
lines ending at their merges' heights.

**Not in it.** k-medoids, DBSCAN, Gaussian mixtures, fuzzy c-means; centroid and median linkage;
clustering the variables (only observations; transpose with Data › Reshape › Transpose); more than
3 000 observations hierarchically.

## 6.4 Discriminant analysis

**What.** Analyze › Statistics › Multivariate › *Discriminant analysis…*. The columns layout (a curves
layout would have more variables than observations: refused in words, *PCA first, then its scores*
named), the column of groups, the priors (equal, or from the group sizes), the classification
cross-validated (leave one out). Out: the group means and sizes; Wilks' Λ, F and p of each variable
alone; the canonical functions (eigenvalue, share, canonical correlation, Wilks' Λ of this function and
those after it with Bartlett's χ², df and p), their raw and standardised coefficients, the structure
matrix (the variables' within-group correlations with the functions), the functions at the group
means; Fisher's classification functions; the classification table (rows the true group, columns the
predicted, the share correct) from the data and left one out; per observation its group, predicted
group, posterior probabilities and canonical scores. Actions: *Plot the canonical scores* (a curve per
group, the group means marked; one function: the scores against the observation's number).

**Checks.** The references table; the classification invariant to the variables' units and to the rows'
order; two groups: the one function proportional to Hotelling's two-sample direction, Wilks' Λ = 1 −
R² of the regression of a group indicator; leave one out by refitting n times equal to the closed form
used.

**Not in it.** Quadratic and regularised discriminant analysis; stepwise selection of variables; a
curves layout with more variables than observations (through PCA's scores instead).

## 6.5 PLS regression

**What.** Analyze › Statistics › Multivariate › *PLS regression…*, and Analyze › Fit › *PLS
regression…* beside Multiple regression. Columns layout: the X columns, one or more Y columns; rows
with every X and no Y predicted. Curves layout: each curve a sample, its points the X variables, Y the
series variable (`seriesOf`: values typed, a number in the names, a header field); curves with no
value predicted. The algorithm (NIPALS, as scikit-learn's; SIMPLS, de Jong's; one Y gives both the
same), the scaling (decision 4), the most components to try (15), the cross-validation (leave one out,
k contiguous blocks, venetian blinds; decision 7), the number used (decision 10). Out: per number of
components RMSEC, RMSECV, R² of X and Y, Q²; the coefficients and intercept of each Y (curves: a curve
against X, the regression vector), VIP per variable; X weights, loadings and scores; per sample the
measured Y, the fitted, the cross-validated prediction and their residuals; per sample to predict its
predicted Y. Actions: *Plot measured against predicted* (fitted and cross-validated, with y = x),
*Plot RMSECV against components*, *Plot the coefficients*, *Plot VIP* (against X for curves), *Plot the
scores*.

**Checks.** The references table; NIPALS and SIMPLS equal for one Y; all components (the rank) giving
the least squares fit when n > p; RMSECV by leave one out against refitting n times; predictions of
the samples fitted equal to the fitted values; invariance to the rows' order (leave one out) and to
the units of a variable under unit variance.

**Not in it.** O-PLS, PLS-DA (a discriminant analysis on PLS scores can be made by hand), kernel PLS,
variable selection (iPLS, genetic algorithms), Monte Carlo cross-validation.

## Left out of the wave

Survival analysis, MANOVA and design of experiments (6.6: only if the user asks, decision 8 of the
plan); factor analysis and rotations; correspondence analysis; multidimensional scaling; canonical
correlation of two sets of variables; independent component analysis and non-negative matrix
factorisation (MCR-ALS), which spectroscopists may ask for later.
