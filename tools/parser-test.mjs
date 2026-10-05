/* Tests for the import parser in kurve.html.
   The app has no build step, so this pulls the parser block straight out of
   the HTML between the ==PARSER:START==/==PARSER:END== markers and runs it.
   Usage: node tools/parser-test.mjs [path/to/kurve.html]                   */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(process.argv[2] || join(here, "..", "kurve.html"), "utf8");
const m = html.match(/==PARSER:START==[\s\S]*?\*\/([\s\S]*?)\/\* ==PARSER:END==/);
if (!m) { console.error("Could not find the parser block in kurve.html"); process.exit(1); }

// checkColumns formats numbers with the app's fmt(); a plain stub is enough here.
const src = `const fmt=(v)=>String(v);\n${m[1]}\nreturn {analyzeFile,toNumber,detectFormat,checkColumns,splitLine,splitColName};`;
const P = new Function(src)();

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push(["ok", name, ""]); }
  else { fail++; results.push(["FAIL", name, detail == null ? "" : String(detail)]); }
}
const close = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-9;

/* ---------- toNumber ---------- */
check("plain decimal", close(P.toNumber("3.14", "."), 3.14));
check("comma decimal", close(P.toNumber("3,14", ","), 3.14));
check("euro thousands + decimal", close(P.toNumber("1.234,56", ","), 1234.56));
check("us thousands", close(P.toNumber("1,234.56", "."), 1234.56));
check("scientific", close(P.toNumber("1.23E+04", "."), 12300));
check("fortran D exponent", close(P.toNumber("1.23D+04", "."), 12300));
check("quoted number", close(P.toNumber('"42.5"', "."), 42.5));
check("NaN is missing", P.toNumber("NaN", ".") === null);
check("N/A is missing", P.toNumber("N/A", ".") === null);
check("dashes are missing", P.toNumber("--", ".") === null);
check("excel error is missing", P.toNumber("#DIV/0!", ".") === null);
check("infinity is missing", P.toNumber("-Inf", ".") === null);
check("empty is missing", P.toNumber("", ".") === null);
check("text is missing", P.toNumber("abc", ".") === null);
/* Numbers as documents write them */
check("unicode minus", close(P.toNumber("\u22120.5", "."), -0.5));
check("unicode minus in an exponent", close(P.toNumber("5E\u22123", "."), 0.005));
check("en dash as a minus", close(P.toNumber("\u20132.25", "."), -2.25));
check("times ten to the", close(P.toNumber("5\u00d710^-3", "."), 0.005));
check("superscript exponent", close(P.toNumber("1.5\u00d710\u207b\u00b3", "."), 0.0015));
check("superscript exponent, comma decimal", close(P.toNumber("2,5\u00d710\u00b2", ","), 250));
check("no-break space thousands", close(P.toNumber("1\u00a0234\u00a0567,5", ","), 1234567.5));
check("narrow no-break space thousands, point", close(P.toNumber("12\u202f345.25", "."), 12345.25));
check("space thousands with a decimal comma", close(P.toNumber("1 234,5", ","), 1234.5));
check("plain spaces are not thousands without a decimal comma", P.toNumber("100 200 300", ".") === null);
check("hex is a label", P.toNumber("0x10", ".") === null);
check("binary is a label", P.toNumber("0b11", ".") === null);
check("2x105 is not 2e5", P.toNumber("2x105", ".") === null);
{ const r = P.analyzeFile("x,y\n1,\u22120.5\n2,\u22121.25\n3,0.75\n4,\u22122\n5,1\n6,\u22123\n7,2\n8,\u22121\n");
  check("a file with typographic minus signs keeps every row", r.rows.length === 8 && close(r.cols[1][0], -0.5) && close(r.cols[1][5], -3), r.rows.length); }
{ const r = P.analyzeFile("x;y\n1;1\u00a0234,5\n2;2\u00a0345,5\n3;3\u00a0456,5\n4;4\u00a0567,5\n5;5\u00a0678,5\n");
  check("a French export with no-break space thousands", r.rows.length === 5 && close(r.cols[1][2], 3456.5), r.rows.length+" "+(r.cols[1]||[]).join(" ")); }
{ const r = P.analyzeFile("100 200 300\n110 210 310\n120 220 320\n130 230 330\n140 240 340\n");
  check("space-separated columns stay columns", r.cols.length === 3 && r.rows.length === 5, r.cols.length+" cols"); }
{ const r = P.analyzeFile('Shift,"Intensity\n(counts)"\n100,5\n101,6\n102,7\n103,8\n104,9\n');
  check("a header cell with a line break stays one header", r.rows.length === 5 && r.headerRow && /Intensity \(counts\)/.test(r.headerRow[1]), JSON.stringify(r.headerRow)); }
{ const r = P.analyzeFile('size,len\n12" pipe,1\n2,3\n4,5\n6,7\n8,9\n10,11\n');
  check("a stray inch mark does not swallow lines", r.rows.length >= 5, r.rows.length); }
{ const r = P.analyzeFile('a,b\n"unclosed,1\n2,3\n4,5\n6,7\n8,9\n10,11\n12,13\n');
  check("an unclosed quote is left alone", r.rows.length >= 6, r.rows.length); }
check("negative kept", close(P.toNumber("-999", "."), -999));

/* ---------- 1. plain CSV ---------- */
{
  const f = P.analyzeFile("Wavelength (nm),Intensity (counts)\n400,120\n401,133\n402,151\n");
  check("csv: delimiter", f.delim === ",", f.delim);
  check("csv: decimal", f.dec === ".", f.dec);
  check("csv: rows", f.rows.length === 3, f.rows.length);
  check("csv: header", f.headerRow && f.headerRow[0] === "Wavelength (nm)", JSON.stringify(f.headerRow));
  check("csv: x values", close(f.cols[0][0], 400) && close(f.cols[0][2], 402));
  check("csv: roles", f.roles.join() === "x,y", f.roles.join());
  const c = P.splitColName(f.headerRow[0]);
  check("csv: unit split", c.long === "Wavelength" && c.unit === "nm", JSON.stringify(c));
}

/* ---------- 2. European semicolon + comma decimals ---------- */
{
  const f = P.analyzeFile("Wellenlänge;Intensität\n400,5;1234,56\n401,0;1300,10\n401,5;1450,00\n");
  check("euro: delimiter", f.delim === ";", f.delim);
  check("euro: decimal", f.dec === ",", f.dec);
  check("euro: x parsed", close(f.cols[0][0], 400.5), f.cols[0][0]);
  check("euro: y parsed", close(f.cols[1][0], 1234.56), f.cols[1][0]);
  check("euro: 3 rows", f.rows.length === 3, f.rows.length);
}

/* ---------- 3. instrument preamble + tabs ---------- */
{
  const text = [
    "## Spectrum file v2.1", "Sample ID: PET-004", "Operator: R. Whitfield",
    "Integration Time (msec): 200", "Temperature = 21.4 C", "Spectra Averaged: 25", "",
    "Raman shift\tIntensity", "500.0\t1201", "501.0\t1320", "502.0\t1455", "503.0\t1390",
  ].join("\n");
  const f = P.analyzeFile(text);
  check("preamble: delimiter", f.delim === "\t", f.delim);
  check("preamble: data start", f.start === 8, f.start);
  check("preamble: rows", f.rows.length === 4, f.rows.length);
  check("preamble: header found", f.headerRow && f.headerRow[0] === "Raman shift", JSON.stringify(f.headerRow));
  check("preamble: sample id", f.meta["Sample ID"] === "PET-004", JSON.stringify(f.meta));
  check("preamble: equals form", f.meta["Temperature"] === "21.4 C", JSON.stringify(f.meta));
  check("preamble: hash stripped", f.meta["Integration Time (msec)"] === "200", JSON.stringify(f.meta));
  check("preamble: unit guess", P.splitColName("Raman shift").unit === "cm⁻¹");
}

/* ---------- 4. whitespace, no header ---------- */
{
  const f = P.analyzeFile("  1.0   2.5\n  2.0   3.5\n  3.0   4.5\n");
  check("ws: delimiter", f.delim === "ws", f.delim);
  check("ws: no header", f.headerRow === null, JSON.stringify(f.headerRow));
  check("ws: rows", f.rows.length === 3, f.rows.length);
  check("ws: parsed", close(f.cols[1][2], 4.5), f.cols[1][2]);
}

/* ---------- 5. descending X plus trailing junk ---------- */
{
  const text = ["cm-1,A", "4000,0.01", "3999,0.02", "3998,0.05", "3997,0.03",
                "", "End of data", "Total points: 4"].join("\n");
  const f = P.analyzeFile(text);
  check("footer: rows", f.rows.length === 4, f.rows.length);
  check("footer: junk counted", f.footerCount === 2, f.footerCount);
  const findings = P.checkColumns(f.cols[0], f.cols[1]);
  check("footer: descending flagged", findings.some(v => v.id === "descX"), JSON.stringify(findings));
  check("footer: not called unsorted", !findings.some(v => v.id === "nonmono"));
}

/* ---------- 6. missing values and gaps ---------- */
{
  const f = P.analyzeFile("x,y\n1,10\n2,NaN\n3,30\n4,\n5,50\n");
  check("missing: rows kept", f.rows.length === 5, f.rows.length);
  check("missing: NaN null", f.cols[1][1] === null);
  check("missing: empty null", f.cols[1][3] === null);
  const findings = P.checkColumns(f.cols[0], f.cols[1]);
  const gaps = findings.find(v => v.id === "gaps");
  check("missing: gaps reported", gaps && /2 rows/.test(gaps.text), gaps && gaps.text);
}

/* ---------- 7. X,Y,X,Y paired export ---------- */
{
  const f = P.analyzeFile("x1,y1,x2,y2\n1,5,1,9\n2,6,2,8\n3,7,3,7\n");
  check("paired: detected", f.paired === true, f.paired);
  check("paired: 4 columns", f.ncol === 4, f.ncol);
}

/* ---------- 8. error column detection ---------- */
{
  const f = P.analyzeFile("Time,Signal,Std Dev\n0,100,3\n1,90,2.8\n2,81,2.6\n");
  check("error col: roles", f.roles.join() === "x,y,e", f.roles.join());
}

/* ---------- 9. quoted fields containing commas ---------- */
{
  const f = P.analyzeFile('"x","y, corrected"\n1,2\n2,4\n3,6\n');
  check("quoted: 2 columns", f.ncol === 2, f.ncol);
  check("quoted: header kept whole", f.headerRow[1] === "y, corrected", JSON.stringify(f.headerRow));
}

/* ---------- 10. unsorted with duplicates ---------- */
{
  const f = P.analyzeFile("x,y\n3,30\n1,10\n2,20\n2,22\n");
  const findings = P.checkColumns(f.cols[0], f.cols[1]);
  check("dirty: unsorted flagged", findings.some(v => v.id === "nonmono"), JSON.stringify(findings));
  check("dirty: duplicate flagged", findings.some(v => v.id === "dupX"), JSON.stringify(findings));
}

/* ---------- 11. saturation ---------- */
{
  let text = "x,y\n";
  for (let i = 0; i < 20; i++) text += `${i},${i > 7 && i < 14 ? 65535 : 1000 + i * 30}\n`;
  const f = P.analyzeFile(text);
  const findings = P.checkColumns(f.cols[0], f.cols[1]);
  check("saturation flagged", findings.some(v => v.id === "sat"), JSON.stringify(findings));
}

/* ---------- 12. uneven spacing ---------- */
{
  const xs = [0, 1, 2, 3, 4, 5, 9, 14, 20, 27, 35];
  const f = P.analyzeFile("x,y\n" + xs.map(x => `${x},${x * 2}`).join("\n") + "\n");
  const findings = P.checkColumns(f.cols[0], f.cols[1]);
  check("uneven spacing flagged", findings.some(v => v.id === "uneven"), JSON.stringify(findings));
  const even = P.analyzeFile("x,y\n" + [0,1,2,3,4,5,6,7,8,9,10].map(x => `${x},${x}`).join("\n") + "\n");
  check("even spacing not flagged", !P.checkColumns(even.cols[0], even.cols[1]).some(v => v.id === "uneven"));
}

/* ---------- 13. BOM and CRLF ---------- */
{
  const f = P.analyzeFile("﻿x,y\r\n1,2\r\n3,4\r\n");
  check("bom: header clean", f.headerRow[0] === "x", JSON.stringify(f.headerRow));
  check("bom: rows", f.rows.length === 2, f.rows.length);
}

/* ---------- 14. overrides beat detection ---------- */
{
  const text = "x;y\n1,5;2,5\n2,5;3,5\n";
  const f = P.analyzeFile(text, { dec: "." });
  check("override: decimal honoured", f.dec === ".", f.dec);
  check("override: values differ", f.cols[0][0] === null || f.cols[0][0] !== 1.5, f.cols[0][0]);
}

/* ---------- 15. single column (pasting one column of numbers) ---------- */
{
  const f = P.analyzeFile("1\n2\n3\n4\n");
  check("single col: 4 rows", f.rows.length === 4, f.rows.length);
  check("single col: values", close(f.cols[0][3], 4), f.cols[0][3]);
}

/* ---------- 16. two blocks: the longer one wins ---------- */
{
  const text = ["x,y", "1,1", "2,2", "", "# second run", "x,y", "10,10", "11,11", "12,12", "13,13"].join("\n");
  const f = P.analyzeFile(text);
  check("two blocks: longer chosen", f.rows.length === 4, f.rows.length);
  check("two blocks: starts at 10", close(f.cols[0][0], 10), f.cols[0][0]);
}

/* ---------- 17. a comma file is not mistaken for comma decimals ---------- */
{
  const f = P.analyzeFile("x,y\n1.5,2.5\n2.5,3.5\n3.5,4.5\n");
  check("us csv: decimal is point", f.dec === ".", f.dec);
  check("us csv: 2 columns", f.ncol === 2, f.ncol);
  check("us csv: value", close(f.cols[1][0], 2.5), f.cols[1][0]);
}

/* ---------- 18. empty and junk-only input ---------- */
{
  check("empty input", P.analyzeFile("").rows.length === 0);
  check("prose only", P.analyzeFile("hello there\nthis is not data\n").rows.length === 0);
}

/* ---------- 19. a pasted European column must not split on its own decimals ---------- */
{
  // This shipped as a silent 10^5 corruption: "0,01937" became two columns.
  const pasted = "0,01937\n0,02238\n0,02242\n0,01988\n0,02011\n";
  const f = P.analyzeFile(pasted);
  check("euro paste: one column", f.ncol === 1, `${f.ncol} columns, delim ${JSON.stringify(f.delim)}`);
  check("euro paste: value preserved", close(f.cols[0][0], 0.01937), f.cols[0][0]);
  check("euro paste: no zero column", !(f.cols[1] && f.cols[1].every(v => v === 0)));
  // with a header line too
  const withHead = P.analyzeFile("Absorbance\n0,01937\n0,02238\n0,02242\n");
  check("euro paste: header kept", withHead.headerRow && withHead.headerRow[0] === "Absorbance",
    JSON.stringify(withHead.headerRow));
  check("euro paste: header does not eat a row", withHead.rows.length === 3, withHead.rows.length);
  // a genuine two-column comma file must still parse as two columns
  const real = P.analyzeFile("x,y\n1.5,2.5\n2.5,3.5\n3.5,4.5\n");
  check("euro paste: real CSV unaffected", real.ncol === 2 && close(real.cols[1][0], 2.5), real.ncol);
  // and a genuine comma file whose values happen to be integers
  const ints = P.analyzeFile("10,20\n11,21\n12,22\n");
  check("euro paste: integer CSV still two columns", ints.ncol === 2, ints.ncol);
}

/* ---------- 20. metadata with several fields on one line ---------- */
{
  const text = ["##TITLE= PET film", "##XUNITS= 1/cm; YUNITS= ABSORBANCE", "##NPOINTS= 3",
    "x,y", "1,2", "2,3", "3,4"].join("\n");
  const f = P.analyzeFile(text);
  check("meta: split on semicolon", f.meta["XUNITS"] === "1/cm" && f.meta["YUNITS"] === "ABSORBANCE",
    JSON.stringify(f.meta));
  check("meta: plain fields still work", f.meta["TITLE"] === "PET film", JSON.stringify(f.meta));
  check("meta: a value containing a semicolon survives",
    P.analyzeFile("##NOTE= a; b\nx,y\n1,2\n2,3\n").meta["NOTE"] === "a; b",
    JSON.stringify(P.analyzeFile("##NOTE= a; b\nx,y\n1,2\n2,3\n").meta));
}

/* ---------- 21. absorbance is a quantity, not arbitrary units ---------- */
{
  check("units: absorbance is not a.u.", P.splitColName("Absorbance").unit === "",
    JSON.stringify(P.splitColName("Absorbance")));
  check("units: explicit unit in brackets still wins",
    P.splitColName("Absorbance (a.u.)").unit === "a.u.");
  check("units: wavenumber still inferred", P.splitColName("Raman shift").unit === "cm⁻¹");
}

/* ---------- 22. a large file stays quick ---------- */
{
  let text = "x,y\n";
  for (let i = 0; i < 50000; i++) text += `${(i * 0.1).toFixed(2)},${Math.sin(i / 100).toFixed(5)}\n`;
  const t0 = Date.now();
  const f = P.analyzeFile(text);
  const ms = Date.now() - t0;
  check("large: all rows", f.rows.length === 50000, f.rows.length);
  check("large: under 2s", ms < 2000, `${ms}ms`);
  results.push(["note", `50k rows parsed in ${ms}ms`, ""]);
}

for (const [state, name, detail] of results) {
  if (state === "ok") console.log(`  ok   ${name}`);
  else if (state === "note") console.log(`  --   ${name}`);
  else console.log(`  FAIL ${name}${detail ? `  (${detail})` : ""}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
