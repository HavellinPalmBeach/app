# Havellin Palm Beach — App Notes

## Always on every commit
- Update the version timestamp in `havellin.html` line ~233:
  `2026.MM.DD · H:MMpm ET`
  Use the current date and approximate ET time.
  Format: `YYYY.MM.DD · H:MMpm ET`

## Git identity — set this at the start of every session
```
git config user.email noreply@anthropic.com && git config user.name Claude
```
Do NOT pass `--author` on commits — let the repo config set both author and committer.
If the stop hook fires anyway, run `git commit --amend --no-edit --reset-author` and force-push.

## Branches
- Active feature branch: `claude/zen-ride-v4x393`
- Push to `main` after every commit so GitHub Pages stays current:
  `git push origin claude/zen-ride-v4x393:main`
- Keep the feature branch in sync with main after each push.

## App
- Single-file app: `havellin.html` — all CSS, JS, HTML in one file
- Hosted on GitHub Pages from `main` branch
- No build process

## Backlog / don't forget
- Warm up the **estimate email language** — add a personal touch tying back to the
  in-home walkthrough (e.g. "It was a pleasure meeting you and walking through your
  home..."). `buildEstimateMailto()` in `havellin.html`. Not yet executed.
