#!/usr/bin/env bash
# Browser regressions for the ESTATE_SCOPE_SPEC build. One script per step; each drives the
# REAL page in headless Chromium rather than asserting on source text, and each is re-run as a
# regression by every later step.
#
#   tests/browser/run.sh            # every step
#   tests/browser/run.sh 5 6        # just those
#
# ⚠ THESE ARE COMMITTED ON PURPOSE. CLAUDE.md records, at length, six earlier harnesses that
# were written into a session scratchpad and died with the session that wrote it — "the fix is
# committing them, not rewriting them from scratch". A scratchpad is session-scoped; this is not.
#
# ⚠ playwright is NOT a repo dependency and must not become one: Chromium is already installed
# at /opt/pw-browsers and every script passes `executablePath` to use it, so there is nothing to
# download. Point NODE_PATH at any node_modules that has playwright in it:
#
#   npm i --no-save playwright            # once, if it is not already somewhere
#   NODE_PATH=/path/to/node_modules tests/browser/run.sh
#
# ⚠ The viewport option is `viewport`, NOT `viewportSize`. The wrong one silently leaves the
# page at the 1280px default and every width measurement is a lie. CLAUDE.md records that one.
set -u
cd "$(dirname "$0")/../.."
APP_PATH="${APP_PATH:-$PWD/havellin.html}"
export APP="file://$APP_PATH"
steps=("$@"); [ ${#steps[@]} -eq 0 ] && steps=(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23)
rc=0
for n in "${steps[@]}"; do
  f="tests/browser/step$n.js"
  [ -f "$f" ] || { echo "  step$n: no such script"; rc=1; continue; }
  printf '  step%-3s ' "$n"
  out=$(node "$f" "$APP_PATH" 2>&1)
  echo "$out" | tail -1
  echo "$out" | grep -q " 0 failed" || rc=1
done
exit $rc
