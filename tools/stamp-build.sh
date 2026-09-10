#!/usr/bin/env bash
# Stamp the build version in havellin.html's header.
#
# ⚠ USE THIS. DO NOT HAND-ROLL A REGEX ON `hdr-ver`.
# On 2026-09-10 three commits shipped with the whole tail of the <style> block
# deleted, because `re.sub(r'(hdr-ver[^>]*>)[^<]+(<)', ..., count=1)` matched the
# CSS RULE `.hdr-ver{...}` (which appears first) instead of the markup span:
# `[^>]*` then ran on to the next `>` several lines later and `[^<]+` swallowed
# everything up to `</style>`. Field mode, the phone layout and printing were
# broken on main for two hours. The stamp itself never moved off 10:20am, which
# is how it went unnoticed.
#
# The clock is read here, from the machine, in ET. The container runs UTC and
# the stamp already in the file is NOT a counter to increment.
set -euo pipefail
cd "$(dirname "$0")/.."

STAMP="${1:-$(TZ=America/New_York date '+%Y.%m.%d · %-I:%M%P ET')}"

python3 - "$STAMP" <<'PY'
import io, re, sys
stamp = sys.argv[1]
path = 'havellin.html'
s = io.open(path, encoding='utf-8').read()

# Anchored on the OPENING TAG OF THE SPAN, not on the bare class name. The
# class also exists as a CSS rule earlier in the file; matching that one is the
# bug this script exists to prevent.
OPEN = '<span class="hdr-ver" style="opacity:0.5;margin-left:8px;font-size:10px;">'
if s.count(OPEN) != 1:
    sys.exit('hdr-ver span found %d times, expected 1 — markup changed, fix this script'
             % s.count(OPEN))

start = s.index(OPEN) + len(OPEN)
end = s.index('</span>', start)
old = s[start:end]
if not re.fullmatch(r'\d{4}\.\d{2}\.\d{2} · \d{1,2}:\d{2}[ap]m ET', old):
    sys.exit('current stamp %r is not a build stamp — refusing to overwrite' % old)

out = s[:start] + stamp + s[end:]

# The failure this guards is silent: the tests are JS-only and stayed green
# through all three broken builds.
if out.count('</style>') != s.count('</style>'):
    sys.exit('style block count changed — refusing to write')
if len(out) - len(s) != len(stamp) - len(old):
    sys.exit('unexpected size change — refusing to write')

io.open(path, 'w', encoding='utf-8').write(out)
print('%s  ->  %s' % (old, stamp))
PY
