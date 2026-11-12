/* The pure blocks of kurve.html, loaded under node for the reference bench.

   As a module: `import { loadKurve } from "./run.mjs"`; `loadKurve(path)` returns `get(name)`,
   any function or constant of the blocks NUMERICS, PEAKS, PIPE, MODELS, STATS and PARSER by its name
   (the blocks are cut out of the HTML as tools/fit-test.mjs does, and a name is looked up in their
   scope, so nothing needs to be listed). `toJSON(v)` writes a result as JSON: functions left out,
   NaN and ±Infinity as the strings "NaN", "Infinity" and "-Infinity", typed arrays as arrays.

   As a program: `node tools/ref/run.mjs [kurve.html]` reads one case a line on stdin,
   `{"id": …, "fn": "name", "args": [...]}` (the strings "NaN", "Infinity", "-Infinity" read as
   those numbers), and writes `{"id": …, "out": …}` or `{"id": …, "err": "message"}` a line on
   stdout, so tools/ref/diff-fuzz.py can run thousands of cases through one node. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const here = dirname(fileURLToPath(import.meta.url));
export const BLOCKS = ["NUMERICS", "PEAKS", "PIPE", "MODELS", "STATS", "ANA", "PARSER"];

export function loadKurve(path) {
  const html = readFileSync(path || join(here, "..", "..", "kurve.html"), "utf8");
  const grab = (tag) => {
    const m = html.match(new RegExp(`==${tag}:START==[\\s\\S]*?\\*\\/([\\s\\S]*?)\\/\\* ==${tag}:END==`));
    if (!m) throw new Error(`Could not find the ${tag} block`);
    return m[1];
  };
  // A direct eval inside the blocks' own function finds any name declared in them.
  const src = BLOCKS.map(grab).join("\n") + "\nreturn (name) => eval(name);";
  const look = new Function(src)();
  const memo = new Map();
  // A name, a path into it (`DIST.t.isf`), and `#i` for the i-th element of what a function returns
  // (`igamPQ#1`, the upper part), or `@key` for one field of it (`descStats@sd`).
  return (name) => {
    const m = /^([A-Za-z_$][\w$]*)((?:\.[A-Za-z_$][\w$]*)*)(?:#(\d+)|@([A-Za-z_$][\w$]*))?$/.exec(name);
    if (!m) throw new Error(`Not a name: ${name}`);
    if (!memo.has(name)) {
      let v = look(m[1]);
      for (const k of m[2].split(".").slice(1)) v = v[k];
      if (m[3] != null) { const f = v, i = +m[3]; v = (...a) => f(...a)[i]; }
      if (m[4] != null) { const f = v, k = m[4]; v = (...a) => f(...a)[k]; }
      memo.set(name, v);
    }
    return memo.get(name);
  };
}

const num = (v) => (Number.isNaN(v) ? "NaN" : v === Infinity ? "Infinity" : v === -Infinity ? "-Infinity" : v);
export function toJSON(v) {
  return JSON.stringify(v, (k, x) => {
    if (typeof x === "function") return undefined;
    if (typeof x === "number") return num(x);
    if (ArrayBuffer.isView(x)) return Array.from(x, num);
    if (x instanceof Map) return Object.fromEntries(x);
    if (x instanceof Set) return [...x];
    return x;
  });
}
export const fromJSON = (s) =>
  JSON.parse(s, (k, x) => (x === "NaN" ? NaN : x === "Infinity" ? Infinity : x === "-Infinity" ? -Infinity : x));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const get = loadKurve(process.argv[2]);
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let c;
    try { c = fromJSON(line); } catch (e) { process.stdout.write(toJSON({ id: null, err: "Not JSON: " + e.message }) + "\n"); return; }
    try {
      const f = get(c.fn);
      const out = typeof f === "function" ? f(...(c.args || [])) : f;
      process.stdout.write(toJSON({ id: c.id, out }) + "\n");
    } catch (e) {
      process.stdout.write(toJSON({ id: c.id, err: String(e && e.message || e) }) + "\n");
    }
  });
}
