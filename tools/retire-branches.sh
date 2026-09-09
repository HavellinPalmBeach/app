#!/usr/bin/env bash
# Delete every remote claude/* working branch except the ones named in KEEP.
#
# WHY THIS EXISTS. apps-script/main-sync.gs was being copied for deployment from
# claude/concierge-hours-pricing-3dv2gq — last touched 2026-07-29 — so the live Apps Script
# served six-week-old code for weeks while every redeploy was performed correctly. Three
# features shipped against a backend that never had them. One branch is one fewer wrong
# thing to copy; main is the only source.
#
# REVERSIBLE. Every tip SHA is recorded in BRANCH_ARCHIVE.md at the repo root. Restore any
# branch with:  git push origin <sha>:refs/heads/<branch-name>
#
# Dry run by default. Pass --yes to actually delete.
#
#   bash tools/retire-branches.sh          # list what would go
#   bash tools/retire-branches.sh --yes    # do it
set -uo pipefail

# ⚠ ANCHORED AND FULLY QUALIFIED. An earlier attempt matched on the bare name and so did not
# protect claude/eager-euler-u5lt65 — the ACTIVE branch — which would have been deleted along
# with the rest. Keep the "claude/" prefix in these patterns.
KEEP='^(main|claude/eager-euler-u5lt65)$'

cd "$(git rev-parse --show-toplevel)" || exit 1
git fetch origin --prune >/dev/null 2>&1

mapfile -t DOOMED < <(git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin \
  | grep -v '^HEAD$' | grep -vE "$KEEP")

if [ "${#DOOMED[@]}" -eq 0 ]; then echo "Nothing to retire."; exit 0; fi

# Refuse to delete anything the manifest does not record — the manifest is the undo.
if [ ! -f BRANCH_ARCHIVE.md ]; then echo "BRANCH_ARCHIVE.md missing — refusing."; exit 1; fi
missing=0
for b in "${DOOMED[@]}"; do
  grep -qF "\`$b\`" BRANCH_ARCHIVE.md || { echo "NOT IN MANIFEST: $b"; missing=1; }
done
[ "$missing" -eq 1 ] && { echo "Refusing: regenerate BRANCH_ARCHIVE.md first."; exit 1; }

echo "Keeping:"
git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin \
  | grep -v '^HEAD$' | grep -E "$KEEP" | sed 's/^/  /'
echo
echo "${#DOOMED[@]} branches to delete, all recorded in BRANCH_ARCHIVE.md."

if [ "${1:-}" != "--yes" ]; then
  printf '%s\n' "${DOOMED[@]}" | sed 's/^/  /'
  echo
  echo "Dry run. Re-run with --yes to delete."
  exit 0
fi

ok=0; fail=0
for b in "${DOOMED[@]}"; do
  if git push origin --delete "$b" >/dev/null 2>&1; then
    ok=$((ok+1)); printf '.'
  else
    fail=$((fail+1)); echo; echo "  FAILED: $b"
  fi
done
echo; echo "deleted: $ok   failed: $fail"
[ "$fail" -gt 0 ] && echo "Failures are usually permissions or a branch protection rule."
exit 0
