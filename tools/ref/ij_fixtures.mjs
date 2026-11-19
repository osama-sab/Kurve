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
const dir = mkdtempSync(join(tmpdir(), "kurve-ij-")), out = [];
cases.forEach((c, k) => { const t = matTiff(c.m, c.o); if (t.fail) throw new Error(`${c.name}: ${t.fail}`);
  const f = `c${String(k).padStart(2, "0")}.tif`; writeFileSync(join(dir, f), t.bytes); c.file = f; c.sha = createHash("sha256").update(t.bytes).digest("hex"); });
const read = JSON.parse(execFileSync("python3.13", ["-I", join(here, "ij_read.py"), dir], { encoding: "utf8", maxBuffer: 1 << 28 }));
rmSync(dir, { recursive: true, force: true });
for (const c of cases) out.push({ name: c.name, m: c.m, o: c.o, sha: c.sha, pil: read[c.file].pil, ij: read[c.file].ij });
const fx = { about: "Kurve's TIFF for ImageJ (QUDI_SPEC Q.2), read by Pillow and by ImageJ 1.54f's reading written out from its source (tools/ref/ij_read.py)", cases: out,
  refusals: refusals.map((c) => ({ name: c.name, m: c.m, o: c.o, fail: true })) };
writeFileSync(join(here, "fixtures", "imagej.json"), JSON.stringify(fx) + "\n");
console.log(`${out.length} cases, ${refusals.length} refusals → tools/ref/fixtures/imagej.json`);
