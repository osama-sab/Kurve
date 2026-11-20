/* The matrices Kurve gives ImageJ, and what is read back (ux/spec/QUDI_SPEC.md, slice Q.2): each case's TIFF written by
   Kurve's own matTiff, read by Pillow and by ImageJ's reading written out from its source (tools/ref/ij_read.py), into
   tools/ref/fixtures/imagej.json with the SHA-256 of the bytes read, so the bench knows the readout is of what Kurve writes
   today.   node tools/ref/ij_fixtures.mjs [kurve.html]   (python3.13 with Pillow on the path) */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { loadKurve } from "./run.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const get = loadKurve(process.argv[2]), matTiff = get("matTiff");
let seed = 20261119; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const vals = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const C = (name, m, o) => ({ name, m, o });
const cases = [
  C("square", { nx: 5, ny: 5, x: { a: -2, b: 2 }, y: { a: -2, b: 2 }, z: vals(25, () => 1000 + 500 * rnd()) }, { xunit: "µm", yunit: "µm", zunit: "c/s", name: "Square" }),
  C("oblong", { nx: 7, ny: 3, x: { a: 0, b: 6 }, y: { a: 10, b: 12.5 }, z: vals(21, (i) => i * 1.5 - 7) }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
  C("X descending", { nx: 6, ny: 4, x: { a: 5, b: -5 }, y: { a: 0, b: 3 }, z: vals(24, (i) => Math.sin(i)) }, { xunit: "µm", yunit: "µm" }),
  C("Y descending", { nx: 4, ny: 6, x: { a: 0, b: 3 }, y: { a: 3, b: -1 }, z: vals(24, (i) => i * i) }, { xunit: "µm", yunit: "µm" }),
  C("a qudi scan", { nx: 7, ny: 5, x: { a: -1.9999999999999998, b: 1.9999999999999998 }, y: { a: -0.9999999999999999, b: 4.999999999999999 }, z: vals(35, () => Math.round(5e4 * rnd()) / 7) }, { xunit: "µm", yunit: "µm", zunit: "c/s", name: "Confocal xy 20261118-0930-46 Dev1Ctr1" }),
  C("far from zero, fine", { nx: 9, ny: 4, x: { a: 1234.5678, b: 1234.5678 + 8 * 0.0123456789012345 }, y: { a: -987.654321, b: -987.654321 + 3 * 0.003 }, z: vals(36, () => rnd() * 1e-3) }, { xunit: "µm", yunit: "µm", zunit: "V" }),
  C("listed, evenly to a few digits", { nx: 6, ny: 3, x: { v: [0.1, 0.2, 0.30000000000000004, 0.4, 0.5, 0.6000000000000001].map((v) => +v.toPrecision(6)) }, y: { v: [1e-3, 2e-3, 3e-3] }, z: vals(18, (i) => i) }, { xunit: "mm", yunit: "mm" }),
  C("yorigin would be 0", { nx: 3, ny: 5, x: { a: 0, b: 2 }, y: { a: -4.5, b: -0.5 }, z: vals(15, (i) => 10 - i) }, { xunit: "µm", yunit: "µm" }),
  C("one column", { nx: 1, ny: 4, x: { a: 7, b: 7 }, y: { a: 0, b: 0.75 }, z: [1, 2, 3, 4] }, { xunit: "µm", yunit: "µm" }),
  C("missing cells", { nx: 4, ny: 3, x: { a: 1, b: 4 }, y: { a: 1, b: 3 }, z: [1, null, 3, 4, null, null, 7, 8, 9, 10, 11, null] }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
  C("values past single precision", { nx: 3, ny: 2, x: { a: 0, b: 2 }, y: { a: 0, b: 1 }, z: [1e39, -1e39, 1e-46, 0, 1.0000000001, 3.4e38] }, {}),
  C("units of their own", { nx: 3, ny: 3, x: { a: 400, b: 800 }, y: { a: 0, b: 2 }, z: vals(9, (i) => i) }, { xunit: "nm", yunit: "s", zunit: "Zählrate µ/s", name: "Spektrum über Zeit" }),
  C("no units", { nx: 3, ny: 2, x: { a: 1, b: 3 }, y: { a: 1, b: 2 }, z: vals(6, (i) => i) }, {}),
  C("a pixel far larger than its unit", { nx: 3, ny: 3, x: { a: 0, b: 2e5 }, y: { a: 0, b: 2e5 }, z: vals(9, (i) => i) }, { xunit: "nm", yunit: "nm" }),
  C("a large picture", { nx: 120, ny: 80, x: { a: -10, b: 10 }, y: { a: -5, b: 5 }, z: vals(9600, (i) => Math.exp(-(((i % 120) - 60) ** 2 + (Math.floor(i / 120) - 40) ** 2) / 200) * 1e4 + rnd() * 50) }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
];
const refusals = [
  C("listed, not evenly spaced", { nx: 4, ny: 2, x: { v: [0, 1, 3, 4] }, y: { a: 0, b: 1 }, z: vals(8, (i) => i) }, {}),
  C("X one value throughout", { nx: 3, ny: 2, x: { v: [2, 2, 2] }, y: { a: 0, b: 1 }, z: vals(6, (i) => i) }, {}),
];
/* Measure (QUDI_SPEC Q.3): images of noise, a spot with empty cells, steps, whole numbers making bins exactly 1 wide, values on
   a large offset, descending axes, one value throughout, a polygon whose edges pass through the cells' centres; each measured
   over the whole image, rectangles, ovals and polygons (convex, concave, partly outside) given in X and Y. */
const gauss = () => { let t = 0; for (let k = 0; k < 6; k++) t += rnd(); return (t - 3) * Math.SQRT2; };
const R = (kind, a) => Object.assign({ kind }, a), ALL = R("all");
const meas = [
  Object.assign(C("noise", { nx: 9, ny: 7, x: { a: -2, b: 2 }, y: { a: 0, b: 3 }, z: vals(63, () => Math.round((1000 + 30 * gauss()) * 100) / 100) }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
    { regs: [ALL, R("rect", { x0: -1, x1: 1.2, y0: 0.4, y1: 2 }), R("oval", { x0: -2, x1: 2, y0: 0, y1: 3 }), R("oval", { x0: -1.5, x1: 1.5, y0: 0.5, y1: 2.5 }),
      R("poly", { pts: [[-1.7, 0.2], [1.6, 0.4], [0.3, 2.8]] }), R("poly", { pts: [[-2, 0], [2, 0], [2, 1], [-0.4, 1.1], [-0.6, 3], [-2, 3]] }),
      R("poly", { pts: [[-3, -1], [1, -0.5], [0.5, 1.7]] })] }),
  Object.assign(C("a spot with empty cells", { nx: 15, ny: 11, x: { a: 0, b: 7 }, y: { a: 0, b: 5 }, z: vals(165, (i) => { const c = i % 15, r = Math.floor(i / 15); return (c * 7 + r * 3) % 23 === 0 ? null : 200 + 5000 * Math.exp(-((c - 9) ** 2 + (r - 4) ** 2) / 6) + 10 * gauss(); }) }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
    { regs: [ALL, R("oval", { x0: 3, x1: 6, y0: 0.5, y1: 3.5 }), R("rect", { x0: 0, x1: 2, y0: 0, y1: 5 }), R("poly", { pts: [[2.2, 0.3], [6.9, 1.1], [5.1, 4.6], [3.3, 3.9]] })] }),
  Object.assign(C("steps", { nx: 8, ny: 6, x: { a: 1, b: 8 }, y: { a: 1, b: 6 }, z: vals(48, (i) => 1 + Math.floor((i % 8) / 3) + (Math.floor(i / 8) > 2 ? 1 : 0)) }, { xunit: "µm", yunit: "µm" }),
    { regs: [ALL, R("rect", { x0: 2, x1: 5, y0: 2, y1: 5 }), R("oval", { x0: 1, x1: 8, y0: 1, y1: 6 })] }),
  Object.assign(C("whole numbers, bins 1 wide", { nx: 17, ny: 16, x: { a: 0, b: 16 }, y: { a: 0, b: 15 }, z: vals(272, (i) => (i * 37) % 257) }, {}), { regs: [ALL, R("rect", { x0: 3, x1: 12, y0: 2, y1: 13 })] }),
  Object.assign(C("a large offset", { nx: 10, ny: 10, x: { a: 0, b: 0.9 }, y: { a: 0, b: 0.9 }, z: vals(100, () => 1e4 + 1e-3 * Math.round(1000 * rnd())) }, { xunit: "mm", yunit: "mm", zunit: "V" }),
    { regs: [ALL, R("oval", { x0: 0.1, x1: 0.8, y0: 0, y1: 0.9 })] }),
  Object.assign(C("descending axes", { nx: 6, ny: 5, x: { a: 5, b: -5 }, y: { a: 3, b: -3 }, z: vals(30, (i) => i * i - 7 * i) }, { xunit: "µm", yunit: "µm" }),
    { regs: [ALL, R("rect", { x0: -3, x1: 3.5, y0: -2, y1: 1 }), R("poly", { pts: [[4, 2], [-4, 2.5], [0, -2.8]] })] }),
  Object.assign(C("one value throughout", { nx: 4, ny: 3, x: { a: 0, b: 3 }, y: { a: 0, b: 2 }, z: vals(12, () => 42.5) }, { xunit: "µm", yunit: "µm" }), { regs: [ALL, R("rect", { x0: 1, x1: 1, y0: 1, y1: 1 })] }),
  Object.assign(C("edges through the centres", { nx: 5, ny: 5, x: { a: 0, b: 4 }, y: { a: 0, b: 4 }, z: vals(25, (i) => i + 0.25) }, { xunit: "µm", yunit: "µm" }),
    { regs: [R("poly", { pts: [[1, 3], [4, 3], [4, 0], [1, 0]] }), R("poly", { pts: [[0, 0], [4, 0], [4, 4]] })] }),
  Object.assign(C("a qudi scan", { nx: 7, ny: 5, x: { a: -1.9999999999999998, b: 1.9999999999999998 }, y: { a: -0.9999999999999999, b: 4.999999999999999 }, z: vals(35, () => Math.round(5e4 * rnd()) / 7) }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
    { regs: [ALL, R("oval", { x0: -1, x1: 1.4, y0: 0.5, y1: 3.5 })] }),
];
const measFail = [
  { name: "a rectangle between the columns", m: meas[0].m, reg: R("rect", { x0: 0.1, x1: 0.3, y0: 0, y1: 3 }) },
  { name: "a polygon of two corners", m: meas[0].m, reg: R("poly", { pts: [[0, 0], [1, 1]] }) },
  { name: "a polygon outside the matrix", m: meas[0].m, reg: R("poly", { pts: [[10, 10], [12, 10], [11, 12]] }) },
  { name: "every cell empty", m: { nx: 2, ny: 2, x: { a: 0, b: 1 }, y: { a: 0, b: 1 }, z: [null, null, null, null] }, reg: ALL },
];
/* Find Maxima and Plot Profile (QUDI_SPEC Q.4): two spots on noise with a flat top and a maximum at the edge, ties of whole numbers,
   a spot with empty cells, a range under the prominence, one value; each with prominences, strict, edges left out and minima
   (light background); lines across them, diagonal, the full width, from beyond the edge, along a row a third apart (its ends a hair
   off the centres, taken as them), on pixels that are not square. */
const twoSpots = vals(24 * 18, (i) => { const c = i % 24, r = Math.floor(i / 24); let v = 20 + 400 * Math.exp(-((c - 6) ** 2 + (r - 5) ** 2) / 8) + 150 * Math.exp(-((c - 17) ** 2 + (r - 12) ** 2) / 5) + 3 * gauss();
  if (c >= 11 && c <= 13 && r >= 2 && r <= 3) v = 90; if (c === 23 && r === 9) v = 120; return Math.round(v * 8) / 8; });
const PK = [
  Object.assign(C("two spots, a flat top, an edge maximum", { nx: 24, ny: 18, x: { a: 0, b: 5.75 }, y: { a: 0, b: 4.25 }, z: twoSpots }, { xunit: "µm", yunit: "µm", zunit: "c/s" }),
    { maxima: [{ prom: 1 }, { prom: 10 }, { prom: 50 }, { prom: 200 }, { prom: 10, strict: true }, { prom: 10, edges: true }, { prom: 10, light: true }, { prom: 60, light: true, strict: true }],
      profiles: [{ x0: 0.3, y0: 0.4, x1: 5.1, y1: 3.9 }, { x0: -0.125, y0: 1.25, x1: 5.875, y1: 1.25 }, { x0: 1.5, y0: -1, x1: 1.5, y1: 5 }, { x0: 4.4, y0: 3.3, x1: 4.6, y1: 3.4 }] }),
  Object.assign(C("ties of whole numbers", { nx: 13, ny: 11, x: { a: 1, b: 13 }, y: { a: 1, b: 11 }, z: vals(143, () => Math.floor(6 * rnd())) }, {}),
    { maxima: [{ prom: 0 }, { prom: 1 }, { prom: 2 }, { prom: 1, strict: true }, { prom: 1, edges: true }], profiles: [{ x0: 1, y0: 1, x1: 13, y1: 11 }] }),
  Object.assign(C("a spot with empty cells", meas[1].m, meas[1].o), { maxima: [{ prom: 20 }, { prom: 300, edges: true }, { prom: 20, light: true }], profiles: [{ x0: 0.2, y0: 2.1, x1: 6.8, y1: 2.9 }] }),
  Object.assign(C("a range under the prominence", { nx: 7, ny: 6, x: { a: 0, b: 6 }, y: { a: 0, b: 5 }, z: vals(42, (i) => 100 + ((i * 13) % 5)) }, {}), { maxima: [{ prom: 10 }, { prom: 10, strict: true }] }),
  Object.assign(C("one value throughout", { nx: 5, ny: 4, x: { a: 0, b: 4 }, y: { a: 0, b: 3 }, z: vals(20, () => 7) }, {}), { maxima: [{ prom: 0 }, { prom: 0, strict: true }] }),
  Object.assign(C("rows a third apart, a line along one", { nx: 6, ny: 4, x: { a: 1, b: 6 }, y: { a: 2, b: 4.5 }, z: vals(24, (i) => 1000 + 37 * ((i * 7) % 11)) }, { xunit: "µm", yunit: "µm" }),
    { maxima: [{ prom: 50 }], profiles: [{ x0: 1, y0: 2.8333333333333335, x1: 6, y1: 2.8333333333333335 }, { x0: 1, y0: 2.833333333333, x1: 6, y1: 2.833333333333 }, { x0: 2, y0: 2, x1: 2, y1: 4.5 }] }),
  Object.assign(C("pixels not square, axes descending", { nx: 11, ny: 7, x: { a: 5, b: -5 }, y: { a: 3, b: 0 }, z: vals(77, (i) => Math.sin(i / 3) * 50 + (i % 11) * 2) }, { xunit: "µm", yunit: "µm" }),
    { maxima: [{ prom: 5 }], profiles: [{ x0: 4.5, y0: 0.2, x1: -4.5, y1: 2.8 }, { x0: -5, y0: 1.5, x1: 5, y1: 1.5 }, { x0: 2, y0: -0.5, x1: 2.4, y1: 3.5 }] }),
];
const dir = mkdtempSync(join(tmpdir(), "kurve-ij-")), out = [], jobs = {};
const write = (c, k, pre) => { const t = matTiff(c.m, c.o); if (t.fail) throw new Error(`${c.name}: ${t.fail}`);
  const f = `${pre}${String(k).padStart(2, "0")}.tif`; writeFileSync(join(dir, f), t.bytes); c.file = f; c.sha = createHash("sha256").update(t.bytes).digest("hex"); };
cases.forEach((c, k) => write(c, k, "c"));
meas.forEach((c, k) => { write(c, k, "m"); jobs[c.file] = { ax: { x: c.m.x, y: c.m.y, nx: c.m.nx, ny: c.m.ny }, regs: c.regs }; });
PK.forEach((c, k) => { write(c, k, "p"); jobs[c.file] = { maxima: c.maxima || [], profiles: c.profiles || [] }; });
writeFileSync(join(dir, "jobs.json"), JSON.stringify(jobs));
const read = JSON.parse(execFileSync("python3.13", ["-I", join(here, "ij_read.py"), dir], { encoding: "utf8", maxBuffer: 1 << 28 }));
rmSync(dir, { recursive: true, force: true });
for (const c of cases) out.push({ name: c.name, m: c.m, o: c.o, sha: c.sha, pil: read[c.file].pil, ij: read[c.file].ij });
const mout = meas.map((c) => ({ name: c.name, m: c.m, o: c.o, sha: c.sha, regs: c.regs, res: read[c.file].meas }));
const pout = PK.map((c) => ({ name: c.name, m: c.m, o: c.o, sha: c.sha, maxima: c.maxima || [], profiles: c.profiles || [], pmax: read[c.file].maxima, nan: read[c.file].pil.z.map((v) => v === null),
  pprof: read[c.file].profiles }));
const fx = { peaks: pout, about: "Kurve's TIFF for ImageJ (QUDI_SPEC Q.2), read by Pillow and by ImageJ 1.54f's reading written out from its source; ImageJ's Measure on it (Q.3), its own arithmetic written out from its source and the same definitions in exact arithmetic (tools/ref/ij_read.py)", cases: out,
  refusals: refusals.map((c) => ({ name: c.name, m: c.m, o: c.o, fail: true })), meas: mout, measFail };
writeFileSync(join(here, "fixtures", "imagej.json"), JSON.stringify(fx) + "\n");
console.log(`${out.length} cases, ${refusals.length} refusals, ${mout.length} images measured over ${mout.reduce((t, c) => t + c.regs.length, 0)} regions, ${pout.length} images for maxima and profiles → tools/ref/fixtures/imagej.json`);
