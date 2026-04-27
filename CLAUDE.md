# Havellin Palm Beach — App Notes

## Always on every commit
- Update the version timestamp in `havellin.html` line ~233:
  `2026.MM.DD · H:MMpm ET`
  Use the current date and approximate ET time.
  Format: `YYYY.MM.DD · H:MMpm ET`

## Branches
- Feature branch: `claude/pricing-app-continued-U6cuL`
- After every feature branch commit: merge to `main` and push both branches
  so GitHub Pages (https://havellinpalmbeach.github.io/app/havellin.html) stays current

## App
- Single-file app: `havellin.html` — all CSS, JS, HTML in one file
- Hosted on GitHub Pages from `main` branch
- No build process
