#!/bin/bash
# The whole suite, one summary (PARITY_SPEC.md, wave 0.5).
#
#   tools/suite.sh [--snap] [kurve.html]
#
# Runs every node test, the reference bench, the browser drives, a seed of the worksheet fuzzer and
# the menu crawl, the slow ones in parallel, each into a log of its own, and prints one line a test
# with its result. With --snap it first copies the repository's committed files into a fresh folder
# under $TMPDIR (or /tmp) and runs there, so editing goes on while it runs. Ends 1 when anything
# failed. The Python parts (the fuzzer against SciPy, the menu crawl) run when python3.13 and the
# reference packages ($PYREF, tools/ref/README.md) are there, and say so when they are not.
set -u
here="$(cd "$(dirname "$0")/.." && pwd)"
snap=0; html=""
for a in "$@"; do case "$a" in --snap) snap=1 ;; *) html="$a" ;; esac; done
root="$here"
if [ "$snap" = 1 ]; then
  root="$(mktemp -d "${TMPDIR:-/tmp}/kurve-suite.XXXXXX")"
  (cd "$here" && git ls-files -z | xargs -0 -I{} cp --parents {} "$root/")
  echo "snapshot of $(cd "$here" && git rev-parse --short HEAD) in $root"
fi
cd "$root"
html="${html:-kurve.html}"
logs="$root/.suite-logs"; mkdir -p "$logs"
pids=(); names=()
run() { # name, timeout in seconds, command…
  local n="$1" t="$2"; shift 2
  ( timeout "$t" "$@" > "$logs/$n.log" 2>&1; echo $? > "$logs/$n.code" ) &
  pids+=($!); names+=("$n")
}
# The quick ones first, one after another (they take seconds).
for t in fit pipe parser tex ref stats; do
  timeout 300 node "tools/$t-test.mjs" "$html" > "$logs/$t.log" 2>&1; echo $? > "$logs/$t.code"
  names+=("$t")
done
# The browser drives, in parallel.
run contrast 900 node tools/contrast-test.mjs "$html"
run odd 1800 node tools/odd-test.mjs "$html"
run ds 1500 node tools/ds-test.mjs "$html"
run fitdrive 900 node tools/fit-drive.mjs "$html"
run plotdrive 900 node tools/plot-drive.mjs "$html"
run reviewdrive 900 node tools/review-drive.mjs "$html"
run countdrive 900 node tools/count-drive.mjs "$html"
run filedrive 900 node tools/file-drive.mjs "$html"
run textdrive 900 node tools/text-drive.mjs "$html"
run anadrive 900 node tools/ana-drive.mjs "$html"
run sheetdrive 900 node tools/sheet-drive.mjs "$html"
run sheetfuzz 900 node tools/sheet-fuzz.mjs "$html" 9 150
if command -v python3.13 > /dev/null; then
  run menus 900 bash -c "PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3.13 tools/ux/crawl.py '$html' > '$logs/crawl.json' 2>/dev/null && python3.13 tools/ux/menucheck.py '$logs/crawl.json'"
  if [ -n "${PYREF:-}" ]; then run diff-fuzz 900 python3.13 -I tools/ref/diff-fuzz.py 1 1000
  else echo "diff-fuzz not run: \$PYREF, the reference packages, is needed (tools/ref/README.md)"; fi
else
  echo "menus and diff-fuzz not run: python3.13 is needed"
fi
wait "${pids[@]}"
# The speed budgets alone, once nothing else shares the processor.
timeout 900 node tools/perf.mjs "$html" > "$logs/perf.log" 2>&1; echo $? > "$logs/perf.code"; names+=("perf")
fail=0
printf '\n%-12s %s\n' test result
for n in "${names[@]}"; do
  code="$(cat "$logs/$n.code" 2>/dev/null || echo '?')"
  last="$(grep -E 'passed|FAIL|failed|ok\b|differences|same' "$logs/$n.log" | tail -1 | cut -c1-110)"
  [ "$code" = 0 ] || fail=1
  printf '%-12s %s  %s\n' "$n" "$([ "$code" = 0 ] && echo ok || echo "FAILED ($code)")" "$last"
done
echo "logs in $logs"
exit $fail
