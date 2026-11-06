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
const src = `const fmt=(v)=>String(v);\n${m[1]}\nreturn {analyzeFile,toNumber,detectFormat,checkColumns,splitLine,splitColName,detectRoles,parseLineList,parseFillList,timeOf,spcFile,spcTable};`;
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

/* ---------- 15b. a multichannel analyser's file: one column, TKA times ---------- */
{
  const counts = Array.from({ length: 40 }, (_, i) => Math.round(50 + 400 * Math.exp(-0.5 * ((i - 20) / 2) ** 2)));
  const text = ["1800", "1809", ...counts.map(String)].join("\r\n") + "\r\n";
  const f = P.analyzeFile(text, { fname: "aufgabe-3-untergrund.TKA" });
  check("tka: one column", f.ncol === 1 && f.single === true, f.ncol);
  check("tka: live and real time read", f.tka && f.tka.live === 1800 && f.tka.real === 1809, JSON.stringify(f.tka));
  check("tka: the times are not channels", f.rows.length === 40 && f.cols[0][0] === counts[0], `${f.rows.length} rows, first ${f.cols[0][0]}`);
  check("tka: the times are metadata", f.meta["Live time"] === "1800 s" && f.meta["Real time"] === "1809 s" && f.meta["Dead time"] === "0.5 %", JSON.stringify(f.meta));
  check("tka: the one column is Y, against its row number", f.roles[0] === "y" && P.detectRoles(null, f.cols).xi === -1, f.roles.join());
  const same = P.analyzeFile(text, { fname: "spectrum.txt" });
  check("tka: another extension keeps every line as a channel", !same.tka && same.rows.length === 42, same.rows.length);
  const asked = P.analyzeFile(text, { fname: "spectrum.txt", tka: true });
  check("tka: asked for, read whatever the extension", asked.tka && asked.rows.length === 40, asked.rows.length);
  const refused = P.analyzeFile(text, { fname: "a.tka", tka: false });
  check("tka: switched off, every line is a channel", !refused.tka && refused.rows.length === 42, refused.rows.length);
  const odd = P.analyzeFile(["1809", "1800", "5", "6", "7"].join("\n"), { fname: "b.TKA" });
  check("tka: real time shorter than live is not taken for times", !odd.tka && odd.rows.length === 5, JSON.stringify(odd.tka));
  const big = P.analyzeFile(["300", "301", ...Array.from({ length: 8190 }, (_, i) => String(i % 97))].join("\n"), { fname: "c.tka" });
  check("tka: 8190 channels", big.rows.length === 8190 && big.cols[0][8189] === 8189 % 97, big.rows.length);
}

/* ---------- 15b3. JCAMP-DX ---------- */
{
  const eq = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  const affn = ["##TITLE= Polystyrene film", "##JCAMP-DX= 4.24", "##DATA TYPE= INFRARED SPECTRUM", "##ORIGIN= Lab 3", "##OWNER= public", "##XUNITS= 1/CM", "##YUNITS= ABSORBANCE",
    "##XFACTOR= 1", "##YFACTOR= 1", "##FIRSTX= 400", "##LASTX= 404", "##NPOINTS= 5", "##XYDATA= (X++(Y..Y))", "400 1.0E-01 2.0E-01 3.0E-01  $$ a comment", "403 4.0E-01 5.0E-01", "##END="].join("\r\n");
  const a = P.analyzeFile(affn, { fname: "ps.jdx" });
  check("jcamp: plain numbers with exponents, X from FIRSTX to LASTX", a.jdx && /AFFN/.test(a.jdx.form) && eq(a.cols[0], [400, 401, 402, 403, 404]) && eq(a.cols[1], [0.1, 0.2, 0.3, 0.4, 0.5]), JSON.stringify([a.jdx, a.cols]));
  check("jcamp: the units named, its labels kept as the header's fields", a.headerRow && a.headerRow[0] === "Wavenumber (cm⁻¹)" && a.headerRow[1] === "Absorbance" && a.meta["ORIGIN"] === "Lab 3" && a.meta["DATA TYPE"] === "INFRARED SPECTRUM" && !("XYDATA" in a.meta) && !("FIRSTX" in a.meta), JSON.stringify([a.headerRow, a.meta]));
  // Compressed: SQZ, DIF and DUP, the next line's check value counted once.
  const asdf = ["##TITLE= compressed", "##JCAMP-DX= 5.01", "##XUNITS= NANOMETERS", "##YUNITS= TRANSMITTANCE", "##XFACTOR= 1", "##YFACTOR= 0.01", "##FIRSTX= 1000", "##LASTX= 1006", "##NPOINTS= 7",
    "##XYDATA=(X++(Y..Y))", "1000A00NT%Tk", "1006A08q", "##END="].join("\n");
  const b = P.analyzeFile(asdf, { fname: "c.dx" });
  check("jcamp: ASDF decoded (SQZ, DIF, DUP, the check value)", b.jdx && /ASDF/.test(b.jdx.form) && eq(b.cols[1], [1, 1.05, 1.1, 1.1, 1.1, 1.08, 1]) && eq(b.cols[0], [1000, 1001, 1002, 1003, 1004, 1005, 1006]) && b.headerRow[0] === "Wavelength (nm)", JSON.stringify([b.cols, b.headerRow]));
  const sq = ["##TITLE= squeezed", "##JCAMP-DX= 5.01", "##XUNITS= HZ", "##YUNITS= ARBITRARY UNITS", "##XYDATA=(X++(Y..Y))", "10@a5E5", "13j2", "##END="].join("\n");
  const s = P.analyzeFile(sq, { fname: "s.jdx" });
  check("jcamp: SQZ signs, E read as +5 not an exponent, a difference on the next line, X from the lines when FIRSTX is missing", s.jdx && eq(s.cols[1], [0, -15, 55, 43]) && eq(s.cols[0], [10, 11, 12, 13]) && s.headerRow[1] === "Intensity", JSON.stringify(s.cols));
  const pts = ["##TITLE= peaks", "##JCAMP-DX= 4.24", "##DATA TYPE= RAMAN SPECTRUM", "##XUNITS= 1/CM", "##YUNITS= COUNTS", "##XFACTOR= 1", "##YFACTOR= 2", "##XYPOINTS=(XY..XY)", "100, 1.5; 200, 2.5", "300,3.5 400,?", "##END="].join("\n");
  const c = P.analyzeFile(pts, { fname: "p.jdx" });
  check("jcamp: XYPOINTS pairs, YFACTOR applied, a missing value left empty, Raman shift named", c.jdx && eq(c.cols[0], [100, 200, 300, 400]) && c.cols[1][2] === 7 && c.cols[1][3] == null && c.headerRow[0] === "Raman shift (cm⁻¹)" && c.headerRow[1] === "Counts (counts)", JSON.stringify([c.cols, c.headerRow]));
  const link = ["##TITLE= a linked file", "##JCAMP-DX= 5.01", "##BLOCKS= 2", "##OWNER= A. Chemist", "##TITLE= the structure", "##JCAMP-CS= 3.7", "##END=",
    "##TITLE= the spectrum", "##JCAMP-DX= 5.01", "##XUNITS= MICROMETERS", "##YUNITS= REFLECTANCE", "##FIRSTX= 2", "##LASTX= 3", "##NPOINTS= 3", "##XYDATA=(X++(Y..Y))", "2 10 20 30", "##END=", "##END="].join("\n");
  const d = P.analyzeFile(link, { fname: "l.jdx" });
  check("jcamp: a linked file's first block with data, the outer block's labels kept", d.jdx && eq(d.cols[1], [10, 20, 30]) && eq(d.cols[0], [2, 2.5, 3]) && d.meta["OWNER"] === "A. Chemist" && d.headerRow[0] === "Wavelength (µm)", JSON.stringify([d.cols, d.meta]));
  const nt = P.analyzeFile(["##TITLE= nmr", "##JCAMP-DX= 5.01", "##NTUPLES= NMR SPECTRUM", "##VAR_NAME= FREQUENCY, SPECTRUM/REAL", "##END NTUPLES=", "##END="].join("\n"), { fname: "n.jdx" });
  check("jcamp: NTUPLES refused in words", /in pages \(##NTUPLES/.test(nt.jdxFail || "") && !nt.rows.length, nt.jdxFail);
  const none = P.analyzeFile(["##TITLE= empty", "##JCAMP-DX= 4.24", "##END="].join("\n"), { fname: "e.jdx" });
  check("jcamp: no data refused in words", /no ##XYDATA=/.test(none.jdxFail || ""), none.jdxFail);
  check("jcamp: a text that merely mentions JCAMP is read as text", !P.analyzeFile("note: ##JCAMP is a format\n1 2\n3 4\n5 6", {}).jdx);
}
/* ---------- 15b4. SPC (Thermo Galactic, binary) ---------- */
{
  const eq = (a, b) => a.length === b.length && a.every((v, i) => (v == null && b[i] == null) || Math.abs(v - b[i]) < 1e-6);
  // An SPC file built byte by byte: o.flags, o.fexp, o.ys (per subfile), o.xs (per subfile, with TXYXYS),
  // o.xvals (shared X with TXVALS), o.kind ("f32" | "i32" | "i16"), o.sexp, o.ver.
  const mkSpc = o => {
    const ver = o.ver || 0x4B, le = ver !== 0x4C, ys = o.ys, K = ys.length, w = o.kind === "i16" ? 2 : 4;
    let size = 512 + (o.xvals ? 4 * o.xvals.length : 0); ys.forEach((Y, k) => { size += 32 + (o.xs ? 4 * o.xs[k].length : 0) + w * Y.length; });
    const b = new Uint8Array(size), dv = new DataView(b.buffer);
    b[0] = o.flags || 0; b[1] = ver; b[2] = o.exper || 0; dv.setInt8(3, o.fexp == null ? -128 : o.fexp);
    dv.setUint32(4, o.xs ? 0 : ys[0].length, le); dv.setFloat64(8, o.x0 == null ? 400 : o.x0, le); dv.setFloat64(16, o.x1 == null ? 404 : o.x1, le); dv.setUint32(24, K, le);
    b[28] = o.xt == null ? 1 : o.xt; b[29] = o.yt == null ? 2 : o.yt; dv.setUint32(32, o.date || 0, le);
    const put = (at, s, n) => { for (let i = 0; i < Math.min(n, s.length); i++) b[at + i] = s.charCodeAt(i); };
    put(45, o.source || "", 9); put(88, o.memo || "", 130); if (o.cat) put(218, o.cat, 30);
    let at = 512; if (o.xvals) { o.xvals.forEach((v, i) => dv.setFloat32(at + 4 * i, v, le)); at += 4 * o.xvals.length; }
    ys.forEach((Y, k) => { dv.setInt8(at + 1, o.sexp == null ? (o.fexp == null ? -128 : 0) : o.sexp); dv.setUint32(at + 16, Y.length, le); at += 32;
      if (o.xs) { o.xs[k].forEach((v, i) => dv.setFloat32(at + 4 * i, v, le)); at += 4 * o.xs[k].length; }
      Y.forEach((v, i) => { if (o.kind === "i16") dv.setInt16(at + 2 * i, v, le); else if (o.kind === "i32") dv.setInt32(at + 4 * i, v, le); else dv.setFloat32(at + 4 * i, v, le); }); at += w * Y.length; });
    return b; };
  const viaTable = b => { const sp = P.spcFile(b); return sp.fail ? sp : Object.assign(P.analyzeFile(P.spcTable(sp), { fname: "t.spc" }), { sp }); };
  // date: 2024-03-01 10:05 packed as minutes | hour<<6 | day<<11 | month<<16 | year<<20
  const date = 5 | (10 << 6) | (1 << 11) | (3 << 16) | (2024 << 20);
  let r = viaTable(mkSpc({ ys: [[1, 2, 3, 4, 5]], exper: 4, memo: "Polystyrene, 4 scans", source: "Bench3", date }));
  check("spc: float Y, X evenly from first to last, its types named", r.sp && eq(r.cols[0], [400, 401, 402, 403, 404]) && eq(r.cols[1], [1, 2, 3, 4, 5]) && r.headerRow[0] === "Wavenumber (cm⁻¹)" && r.headerRow[1] === "Absorbance", JSON.stringify([r.cols, r.headerRow]));
  check("spc: its header's fields kept: memo, source, the measured date, the experiment", r.meta.Memo === "Polystyrene, 4 scans" && r.meta.Source === "Bench3" && r.meta.Measured === "2024-03-01 10:05" && r.meta.Experiment === "FT-IR, FT-NIR or FT-Raman", JSON.stringify(r.meta));
  r = viaTable(mkSpc({ ys: [[65536, 131072, -32768]], kind: "i32", fexp: 16, sexp: 0, x0: 1, x1: 3, xt: 13, yt: 4 }));
  check("spc: 32-bit integers scaled by 2^(exp − 32), the file's exponent when the subfile has none; Raman shift and counts", r.sp && eq(r.cols[1], [1, 2, -0.5]) && r.headerRow[0] === "Raman shift (cm⁻¹)" && r.headerRow[1] === "Counts (counts)", JSON.stringify([r.cols, r.headerRow]));
  r = viaTable(mkSpc({ ys: [[-3, 7, 12]], kind: "i16", flags: 1, fexp: 18, sexp: 18 }));
  check("spc: 16-bit integers (TSPREC) scaled by 2^(exp − 16)", r.sp && eq(r.cols[1], [-12, 28, 48]), JSON.stringify(r.cols));
  r = viaTable(mkSpc({ ys: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], flags: 4 | 128, xvals: [1, 2, 4], xt: 3, yt: 128 }));
  check("spc: several subfiles on one uneven X (TMULTI, TXVALS) are one X and a column each", r.sp && r.ncol === 4 && eq(r.cols[0], [1, 2, 4]) && eq(r.cols[3], [7, 8, 9]) && r.headerRow.join("|") === "Wavelength (nm)|Transmittance 1|Transmittance 2|Transmittance 3" && r.meta.Subfiles === "3", JSON.stringify([r.cols, r.headerRow]));
  r = viaTable(mkSpc({ ys: [[1, 2, 3], [5, 6]], xs: [[10, 20, 30], [15, 25]], flags: 4 | 64 | 128 }));
  check("spc: each subfile with its own X (TXYXYS) as X, Y pairs, the shorter one left empty", r.sp && r.ncol === 4 && eq(r.cols[2], [15, 25, null]) && eq(r.cols[3], [5, 6, null]), JSON.stringify(r.cols));
  r = viaTable(mkSpc({ ys: [[1, 2]], flags: 32, cat: "Shift\u0000Signal\u0000" }));
  check("spc: its own axis labels (TALABS)", r.headerRow && r.headerRow.join("|") === "Shift|Signal", JSON.stringify(r.headerRow));
  r = viaTable(mkSpc({ ys: [[1, 2, 3]], ver: 0x4C }));
  check("spc: the big-endian new format", r.sp && eq(r.cols[1], [1, 2, 3]), JSON.stringify(r.cols));
  check("spc: the old format refused in words", /old format \(before 1996\)/.test(P.spcFile(mkSpc({ ys: [[1]], ver: 0x4D })).fail || ""));
  check("spc: a file that ends before its data refused in words", /ends before its data/.test(P.spcFile(mkSpc({ ys: [[1, 2, 3, 4, 5]] }).slice(0, 540)).fail || ""));
  check("spc: too short, and not one, refused in words", /too short/.test(P.spcFile(new Uint8Array(100)).fail) && /not an SPC file/.test(P.spcFile(new Uint8Array(600)).fail));
}
/* ---------- 15b2. analysers' own formats: Maestro and IAEA .Spe, N42 ---------- */
{
  const counts = Array.from({ length: 1024 }, (_, i) => Math.round(30 + 900 * Math.exp(-0.5 * ((i - 400) / 3) ** 2)));
  const spe = ["$SPEC_ID:", "Soil sample 7, HPGe", "$SPEC_REM:", "DET# 1", "$DATE_MEA:", "03/14/2024 09:05:07", "$MEAS_TIM:", "3600 3712", "$DATA:", "0 1023",
    ...counts.map(v => "       " + v), "$ROI:", "0", "$PRESETS:", "Live Time", "3600", "0", "$ENER_FIT:", "0.155 0.4521", "$MCA_CAL:", "3", "1.2E-01 4.52E-01 1.1E-07 keV", "$SHAPE_CAL:", "3", "1 0 0"].join("\r\n") + "\r\n";
  const f = P.analyzeFile(spe, { fname: "soil7.Spe" });
  check("spe: the counts are one column of 1024 channels", f.single && f.rows.length === 1024 && f.cols[0][400] === counts[400], f.rows.length);
  check("spe: live and real time, the date year first, the title", f.tka && f.tka.live === 3600 && f.tka.real === 3712 && f.meta.Measured === "2024-03-14 09:05:07" && f.meta.Title === "Soil sample 7, HPGe", JSON.stringify([f.tka, f.meta]));
  check("spe: the calibration from $MCA_CAL, with its unit (over $ENER_FIT)", f.mca && f.mca.cal && f.mca.cal.co.join() === "0.12,0.452,1.1e-7" && f.mca.cal.unit === "keV", JSON.stringify(f.mca && f.mca.cal));
  check("spe: channels from the first written", f.mca.ch0 === 0);
  const iaea = ["$SPEC_ID:", "", "$MEAS_TIM:", "100 120", "$DATA:", "10 13", "5 6", "7 8", "$ENER_FIT:", "1.5 0.25"].join("\n");
  const g = P.analyzeFile(iaea, { fname: "x.spe" });
  check("spe: counts several on a line, from channel 10, the calibration from $ENER_FIT", g.rows.length === 4 && g.mca.ch0 === 10 && g.cols[0].join() === "5,6,7,8" && g.mca.cal.co.join() === "1.5,0.25,0", JSON.stringify([g.cols[0], g.mca]));
  check("spe: a file named .spe without the tags is read as text", !P.analyzeFile("1\n2\n3\n", { fname: "y.spe" }).mca);
  const n42 = `<?xml version="1.0"?><RadInstrumentData xmlns="http://physics.nist.gov/N42/2011/N42"><EnergyCalibration id="ec"><CoefficientValues>-0.5 1.465 0</CoefficientValues></EnergyCalibration>
<RadMeasurement id="m"><StartDateTime>2023-11-02T14:30:00Z</StartDateTime><RealTimeDuration>PT310.5S</RealTimeDuration>
<Spectrum id="s1"><LiveTimeDuration>PT5M</LiveTimeDuration><ChannelData compressionCode="CountedZeroes">0 3 7 9 0 2 4</ChannelData></Spectrum>
<Spectrum id="s2"><LiveTimeDuration>PT1S</LiveTimeDuration><ChannelData>1 2</ChannelData></Spectrum></RadMeasurement></RadInstrumentData>`;
  const h = P.analyzeFile(n42, { fname: "survey.n42" });
  check("n42: CountedZeroes unfolded, the longest spectrum", h.mca && h.cols[0].join() === "0,0,0,7,9,0,0,4", h.cols[0] && h.cols[0].join());
  check("n42: durations read (PT5M, PT310.5S), the start, the coefficients", h.tka && h.tka.live === 300 && h.tka.real === 310.5 && h.meta.Measured === "2023-11-02T14:30:00Z" && h.mca.cal.co.join() === "-0.5,1.465,0", JSON.stringify([h.tka, h.mca.cal, h.meta.Measured]));
  const old = `<N42InstrumentData><Measurement><Spectrum><LiveTime>PT60S</LiveTime><RealTime>PT61S</RealTime><Calibration Type="Energy"><Equation><Coefficients>0 3 0</Coefficients></Equation></Calibration><ChannelData>4 5 6</ChannelData></Spectrum></Measurement></N42InstrumentData>`;
  const k = P.analyzeFile(old, { fname: "old.xml" });
  check("n42 (2006): LiveTime, Coefficients", k.mca && k.tka.live === 60 && k.mca.cal.co.join() === "0,3,0" && k.cols[0].join() === "4,5,6", JSON.stringify(k.mca));
}

/* ---------- 15c. a list of known lines, as people write them ---------- */
{
  const L = P.parseLineList(["# my literature values", "Nuclide, E (keV), I (%)", "Bi-214, 609.312, 45.49", "609.32  Pb-214?", "²¹⁴Bi;1120,29;14,9", "K 40 1460.82", "Ra 226 186.21 3.64", "1764.5\tBi-214", "2614.511", "", "Tl-208 583.187 85"].join("\n"));
  const it = L.items;
  check("lines: a header without a number is skipped and counted", L.skipped === 1 && it.length === 8, `${L.skipped} skipped, ${it.length} read`);
  check("lines: name, energy, intensity in that order", it[0].name === "Bi-214" && close(it[0].x, 609.312) && close(it[0].i, 45.49), JSON.stringify(it[0]));
  check("lines: energy first, then the name", close(it[1].x, 609.32) && it[1].name === "Pb-214?", JSON.stringify(it[1]));
  check("lines: semicolons and decimal commas", it[2].name === "²¹⁴Bi" && close(it[2].x, 1120.29) && close(it[2].i, 14.9), JSON.stringify(it[2]));
  check("lines: a mass number after the symbol stays in the name", it[3].name === "K 40" && close(it[3].x, 1460.82) && it[4].name === "Ra 226" && close(it[4].x, 186.21) && close(it[4].i, 3.64), JSON.stringify([it[3], it[4]]));
  check("lines: a tab between energy and name", close(it[5].x, 1764.5) && it[5].name === "Bi-214", JSON.stringify(it[5]));
  check("lines: a bare number is named by itself", close(it[6].x, 2614.511) && it[6].name === "2614.511", JSON.stringify(it[6]));
  check("lines: whole-number intensity after a decimal energy", close(it[7].x, 583.187) && it[7].i === 85, JSON.stringify(it[7]));
}

/* ---------- 15d. a list of values typed for a fill ---------- */
{
  const F = (t) => P.parseFillList(t);
  const eq = (a, b) => a.length === b.length && a.every((v, i) => close(v, b[i]));
  check("fill list: spaces", eq(F("1 2 3").vals, [1, 2, 3]), JSON.stringify(F("1 2 3")));
  check("fill list: commas alone separate", eq(F("1,2,3").vals, [1, 2, 3]), JSON.stringify(F("1,2,3")));
  check("fill list: comma and space", eq(F("1, 2, 3").vals, [1, 2, 3]), JSON.stringify(F("1, 2, 3")));
  check("fill list: decimal commas between spaces", eq(F("1,5 2,5").vals, [1.5, 2.5]), JSON.stringify(F("1,5 2,5")));
  check("fill list: semicolons, lines, a typographic minus, an exponent", eq(F("1;2\n−2 3e2").vals, [1, 2, -2, 300]), JSON.stringify(F("1;2\n−2 3e2")));
  const b = F("1 two 3");
  check("fill list: a word is not a number, and is named", eq(b.vals, [1, 3]) && b.bad.length === 1 && b.bad[0] === "two", JSON.stringify(b));
  check("fill list: nothing typed", F("  ").vals.length === 0 && F("").bad.length === 0);
  check("full-width digits and signs, as an input method types them", close(P.toNumber("\uFF11\uFF12", "."), 12) && close(P.toNumber("\uFF11\uFF12,\uFF15", ","), 12.5) && close(P.toNumber("\uFF0D\uFF13\uFF0E\uFF15\uFF45\uFF12", "."), -350), [P.toNumber("\uFF11\uFF12", "."), P.toNumber("\uFF0D\uFF13\uFF0E\uFF15\uFF45\uFF12", ".")].join(" "));
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

/* ---------- 21b. dates and times are numbers ---------- */
{
  const f = P.analyzeFile("Time,Temp,Signal\n2024-03-01 12:00:00,21.5,0.12\n2024-03-01 12:05:00,21.7,0.15\n2024-03-01 12:10:00,21.9,0.19\n2024-03-01 12:15:00,22.0,0.22\n");
  check("dates: a date-time column is seconds since 1970 (UTC)", f.cols[0][0] === Date.UTC(2024, 2, 1, 12) / 1000 && f.cols[0][1] - f.cols[0][0] === 300, JSON.stringify(f.cols[0]));
  check("dates: the column is known as dates, and is X", f.tkind[0] === "date" && f.tkind[1] === null && f.roles[0] === "x", JSON.stringify([f.tkind, f.roles]));
  const g = P.analyzeFile("t\ty\n12:00:00\t1\n12:00:30\t2\n12:01:00\t3\n12:01:30\t4\n");
  check("times: h:mm:ss is seconds, and the column is times", g.cols[0][1] === 43230 && g.tkind[0] === "time", JSON.stringify([g.cols[0], g.tkind]));
  const h = P.analyzeFile("Date;Value\n2024-03-01;5\n2024-03-02;6\n2024-03-03;7\n2024-03-04;8\n");
  check("dates: a file that starts with dates is read", h.rows.length === 4 && h.cols[0][1] - h.cols[0][0] === 86400, JSON.stringify(h.cols));
  const w = P.analyzeFile("2024-03-01 06:00 1.5\n2024-03-01 07:00 1.7\n2024-03-01 08:00 1.6\n2024-03-01 09:00 1.9\n");
  check("dates: a date and its time split by a space stay one field", w.ncol === 2 && w.cols[0][1] - w.cols[0][0] === 3600, JSON.stringify([w.ncol, w.cols]));
  check("dates: a zone offset is taken off", P.toNumber("2024-03-01T12:00:00+02:00") === Date.UTC(2024, 2, 1, 10) / 1000 && P.toNumber("2024-03-01T12:00:00Z") === Date.UTC(2024, 2, 1, 12) / 1000);
  check("dates: not a date when it cannot be one", P.toNumber("2024-13-01") === null && P.toNumber("12:75") === null && P.toNumber("03/01/2024") === null);
  check("dates: ordinary numbers are untouched", P.toNumber("2024") === 2024 && P.toNumber("1,5", ",") === 1.5 && P.toNumber("-0.5") === -0.5);
}

/* ---------- 21b. a units row, and files with no X (UX_SPEC 3.7) ---------- */
{
  const u = P.analyzeFile("Time;Sample A;Sample B;Sample C\nh;OD600;OD600;OD600\n0,0;0,112;0,093;0,085\n1,0;0,140;0,114;0,095\n2,0;0,174;0,137;0,119\n3,0;0,215;0,160;0,140\n");
  check("units row: the names come from the line above it", u.headerRow.join("|") === "Time (h)|Sample A (OD600)|Sample B (OD600)|Sample C (OD600)", u.headerRow.join("|"));
  check("units row: split back into name and unit", P.splitColName(u.headerRow[1]).long === "Sample A" && P.splitColName(u.headerRow[1]).unit === "OD600");
  check("units row: the data still start after it", u.rows.length === 4 && u.cols[1][0] === 0.112, JSON.stringify(u.cols[1]));
  const u2 = P.analyzeFile("Wavelength,Absorbance\n(nm),a.u.\n400,0.1\n410,0.2\n420,0.3\n430,0.25\n");
  check("units row: brackets and a.u.", u2.headerRow.join("|") === "Wavelength (nm)|Absorbance (a.u.)", u2.headerRow.join("|"));
  const u3 = P.analyzeFile("Raman shift (cm-1),Intensity (counts)\nx,y\n100,1\n101,2\n102,3\n103,2\n");
  check("units row: a second line of names is not units", u3.headerRow.join("|") === "x|y", u3.headerRow.join("|"));
  const u4 = P.analyzeFile("Energy,Rate\nkeV,counts/s\n1,5\n2,7\n3,6\n4,9\n");
  check("units row: keV and counts/s", u4.headerRow.join("|") === "Energy (keV)|Rate (counts/s)", u4.headerRow.join("|"));
  const g = P.analyzeFile("Control,Placebo,Drug\n310,322,301\n295,340,288\n330,301,295\n301,315,310\n288,333,279\n");
  check("no X: groups side by side are every one a Y", g.roles.join() === "y,y,y" && P.detectRoles(g.headerRow, g.cols).xi === -1, g.roles.join());
  const n = P.analyzeFile("Temperature,Yield\n40,3.1\n20,2.2\n30,2.9\n25,2.5\n35,3.0\n");
  check("no X: a column named as an axis is X even unsorted", n.roles.join() === "x,y", n.roles.join());
  const m = P.analyzeFile("t,y\n0,5\n1,4\n2,3.5\n3,3.1\n");
  check("no X: a column that rises is X as before", m.roles.join() === "x,y", m.roles.join());
  const e = P.analyzeFile("A,A err,B\n5,0.1,7\n3,0.2,9\n6,0.1,8\n4,0.2,6\n");
  check("no X: error columns are still errors", e.roles.join() === "y,e,y", e.roles.join());
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
