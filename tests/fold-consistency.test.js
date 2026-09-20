'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE JOB PLAN'S FOLDS AND BUILD ESTIMATE'S SECTION HEADERS ARE ONE CONTROL (2026-09-20)
//
// Anthony, off a screenshot of the two dark bars at the top of the Job Plan: *"can we move the
// expanding triangles that are all the way over on the right to the left? And make it look like it
// does in build estimate … we have the little triangle carrot to the left and somehow it looks
// smaller … can you just check the formatting so that the pages are consistent."*
//
// He was right on every count. Measured in Chromium at 1440 before the change:
//
//                         Job Plan fold        Build Estimate
//   caret side            RIGHT, 1228px in     LEFT, 12px in
//   caret glyph / size    ▶ 13px               ▸ 9px
//   title                 13px / 700 / none    10px / 600 / UPPERCASE
//   bar height            40px                 30px
//
// The fold was ~90 characters of inline style drawing the same dark bar three points larger. It
// wears `.sec-hdr .sec-toggle` now — the class, not a copy of it.
//
// ⚠⚠ EVERY ASSERTION HERE EXISTS BECAUSE A REVERT CAME BACK GREEN. The first sweep backed out the
// caret's position, the shared classes, the room sections' glyphs, the CSS reset and the tab name,
// and the suite passed through all five: every check drove a PIECE and nothing drove what a person
// would see. The gap this project records more than any other.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');
const fnBody = (name) => {
  const at = SRC.indexOf('function ' + name + '(');
  return SRC.slice(at, SRC.indexOf('\n}\n', at));
};
// ⚠ LINE-BASED, NEVER /\*[\s\S]*?\*\//. The app carries `accept="image/*"`, whose `/*` reads as a
// comment opener and swallows ~170KB to the next `*/` — this file records that eating 166KB and
// four assertions reading as failures on correct code.
const live = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');

// ⚠ THE FIRST <style> BLOCK ONLY. A regex over every `<style` in this file matches four "blocks"
// totalling about a megabyte, because the JS builds that tag inside quoted strings.
const CSS = SRC.slice(SRC.indexOf('<style>'), SRC.indexOf('</style>'));

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('⚠⚠ the caret is on the LEFT of the bar, which is the thing that was asked for');
  {
    const w = sandbox({ fns: ['planPhaseWrap', 'secCaret'], vars: ['_planOpenPhases'] });
    const out = w.planPhaseWrap('hours', 'Hours &amp; daily close', 'BODY', 'today 3 hrs');

    const caretAt = out.indexOf('sec-caret');
    const titleAt = out.indexOf('Hours &amp; daily close');
    const metaAt  = out.indexOf('stage-meta');
    ok(caretAt > -1, 'the fold draws a caret at all');
    ok(caretAt < titleAt, '⚠ the caret comes BEFORE the title — it sat at the far right until 2026-09-20');
    ok(titleAt < metaAt, 'and the count still trails at the end of the bar');
  }

  group('⚠ the fold wears Build Estimate’s own bar rather than a second copy of it');
  {
    const w = sandbox({ fns: ['planPhaseWrap', 'secCaret'], vars: ['_planOpenPhases'] });
    const out = w.planPhaseWrap('vendors', 'Vendors', 'BODY', '8 of 8 confirmed');

    has(out, 'class="sec-hdr sec-toggle"', 'the bar IS the room sections’ bar');
    has(out, 'class="sec-caret"', 'and the caret is their caret');
    // The inline styles are what made the two drift three points apart in the first place.
    lacks(out, 'background:var(--gray-dk)', 'no inline copy of the bar’s colour');
    lacks(out, 'font-size:13px', 'no inline copy of its type size');
    lacks(out, 'justify-content:space-between', 'and not its own flex row either');
  }

  group('⚠⚠ ONE caret definition — no live line anywhere may carry a glyph of its own');
  {
    // The rule, not a list of today's four call sites: two headers RENDER a caret and two toggles
    // REWRITE it, so a fifth writer added next year with its own glyph is the defect this catches.
    // Both spellings, because the code uses \u escapes and a hand edit would use the character.
    const GLYPHS = ['▾', '▸', '▼', '▶', '\\u25BE', '\\u25B8', '\\u25BC', '\\u25B6'];
    const liveSrc = live(SRC);
    const def = fnBody('secCaret');
    let stray = [];
    for (const g of GLYPHS) {
      let from = 0, at;
      while ((at = liveSrc.indexOf(g, from)) !== -1) {
        const lineStart = liveSrc.lastIndexOf('\n', at) + 1;
        const line = liveSrc.slice(lineStart, liveSrc.indexOf('\n', at));
        if (!def.includes(line.trim())) stray.push(line.trim().slice(0, 70));
        from = at + 1;
      }
    }
    eq(stray.length, 0, '⚠ every caret glyph in live code is inside secCaret — stray: ' + JSON.stringify(stray));

    // And all four writers really do read it, so the net above is not vacuously true.
    has(fnBody('togglePhase'), 'secCaret(', 'the fold’s toggle reads it');
    has(fnBody('applyRoomSectionState'), 'secCaret(', 'the room section’s toggle reads it');
    has(fnBody('planPhaseWrap'), 'secCaret(', 'the fold header renders it');
    has(fnBody('buildRoomTable'), 'secCaret(', 'the room header renders it');
  }

  group('⚠⚠ the count resets the bar’s uppercase — a CSS rule no other test reads');
  {
    // The meta sits INSIDE .sec-hdr now, which is uppercase with .1em tracking. Inherited,
    // "no hours logged today · 0 of 157 logged" renders as a shouted TODAY 0 HRS on the one line
    // that carries the amber nag. Dropping this reset is silent and invisible to every source
    // check — the shape that let a stamp regex delete 368 lines of this stylesheet once.
    const rule = (CSS.match(/\.stage-meta\{[^}]*\}/) || [''])[0];
    ok(rule.length > 0, 'the rule exists');
    has(rule, 'text-transform:none', '⚠ it resets the bar’s uppercase');
    has(rule, 'margin-left:auto', 'and sits at the right-hand end, now the row is not space-between');

    // The fold body has to close the bar it hangs under, at the bar's own radius.
    const body = (CSS.match(/\.plan-fold-body\{[^}]*\}/) || [''])[0];
    has(body, 'border-radius:0 0 4px 4px', 'the body closes the 4px bar above it');
  }

  group('the tab says what is on it');
  {
    // Job Admin had been folded at the top of this tab since 2026-09-19 while the tab read
    // "Inventory", so the name described half of what was there.
    has(SRC, ">Job Admin &amp; Inv</button>", 'the nav names both halves');
    ok(/showPanel\('inventory',this\)">Job Admin &amp; Inv<\/button>/.test(SRC),
       'and it is the inventory panel’s own button, not some other tab');
    has(SRC, 'Job Admin &amp; Inventory</div>', 'the page itself says it in full');
  }
};
