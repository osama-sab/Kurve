/* Checks that a flow test does through the interface what a person does (QUALITY_SPEC §3.1): no flow calls evaluate itself,
   and the body of each read() calls only the functions in lib.mjs's READ (a method after a dot is the object's own: arrays,
   elements, strings). Usage: node tools/flows/lint.mjs   (every tools/flows/*.mjs but lib, lint and the fixtures' maker) */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { here, READ } from "./lib.mjs";

const SKIP = new Set(["lib.mjs", "lint.mjs", "make-fixtures.mjs"]);
const JS = new Set(["if", "for", "while", "switch", "return", "function", "typeof", "new", "catch", "await", "async"]);
const allow = new Set(READ.concat([...JS]));
let bad = 0, n = 0;
for (const f of readdirSync(here).filter(f => f.endsWith(".mjs") && !SKIP.has(f))) {
  const s = readFileSync(join(here, f), "utf8"); n++;
  const say = (line, msg) => { bad++; console.log(`${f}:${line}: ${msg}`); };
  const lineOf = i => s.slice(0, i).split("\n").length;
  for (const m of s.matchAll(/\.evaluate\s*\(/g)) say(lineOf(m.index), "calls evaluate: look with read(), act through the interface");
  // Each read( … ) call's text, by matching its brackets.
  for (const m of s.matchAll(/\bread\s*\(/g)) {
    let i = m.index + m[0].length, d = 1, q = null;
    for (; i < s.length && d > 0; i++) { const ch = s[i];
      if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'" || ch === "`") q = ch; else if (ch === "(") d++; else if (ch === ")") d--; }
    const body = s.slice(m.index + m[0].length, i - 1).replace(/(["'`])(?:\\.|(?!\1).)*\1/gs, '""');
    for (const c of body.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[2];
      if (!allow.has(name) && !/^[a-z]$/.test(name)) say(lineOf(m.index), `read() calls ${name}(), which is not one that only looks (lib.mjs READ)`);
    }
  }
}
console.log(`${n} flow${n === 1 ? "" : "s"} read, ${bad} thing${bad === 1 ? "" : "s"} wrong`);
process.exit(bad ? 1 : 0);
