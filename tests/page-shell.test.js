'use strict';
// The page shell — the head <style> block and the build stamp (2026-09-10).
//
// ⚠ WHY THIS EXISTS. On 2026-09-10 three commits shipped with 368 lines of CSS deleted —
// the whole tail of the head <style> block, from `.hdr>*{min-width:0;}` to `</style>`.
// Field mode, the phone layout and every print path were broken on `main` for two hours.
// The cause was a regex written to move the build stamp:
//
//     re.sub(r'(hdr-ver[^>]*>)[^<]+(<)', ..., count=1)
//
// `hdr-ver` occurs TWICE — first as the CSS rule `.hdr-ver{...}`, then as the markup span.
// `count=1` took the CSS one; `[^>]*` ran on to the next `>` several lines below and
// `[^<]+` then swallowed everything up to the `<` of `</style>`.
//
// **The whole suite stayed green through all three builds**, because every other test here
// drives JavaScript lifted out of the file and none of them so much as looks at the CSS.
// A 1.2 MB single-file app whose stylesheet no test reads is a stylesheet that can be
// deleted silently. These checks are cheap and they are the tripwire.
//
// `tools/stamp-build.sh` is the supported way to move the stamp. Do not hand-roll it again.

const { source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  const headEnd = src.indexOf('</head>');
  const styleOpen = src.indexOf('<style>');
  const styleClose = src.indexOf('</style>');
  const css = src.slice(styleOpen + '<style>'.length, styleClose);

  group('the head <style> block is intact');
  {
    ok(styleOpen > -1 && styleClose > styleOpen, 'the page opens and closes a stylesheet');
    ok(styleClose < headEnd, 'and it closes inside <head> — a truncated block swallows the markup after it');

    // The damage collapsed 368 lines into one. A line count is crude and that is the point:
    // it fails on a wholesale deletion without pinning any individual rule.
    const lines = css.split('\n').length;
    ok(lines > 600, 'the stylesheet is still hundreds of lines long (found ' + lines + ')');

    // The tail specifically — everything the 2026-09-10 regex ate lived below `.hdr>*`.
    has(css, '.hdr>*{min-width:0;}', 'the phone header rule (first line of what was deleted)');
    has(css, '#print-target{display:none;}', 'the print target is hidden on screen (last line of what was deleted)');
  }

  group('the blocks that were deleted and that no other test would notice');
  {
    // Field mode: the four data-field tabs an iPad runs a job on.
    has(css, 'body.field-mode', 'field mode still has a stylesheet');

    // Printing: every client document goes out through _printDocument into #print-target.
    ok(css.split('@media print').length - 1 >= 2, 'both @media print blocks survive');

    // The phone layout, and the narrow-phone block under it.
    has(css, '@media (max-width:820px)', 'the phone breakpoint');
    has(css, '@media (max-width:400px)', 'the narrow-phone breakpoint');

    // Grid rules that only ever appear here.
    has(css, '#room-table-wrap', 'the room grid wrapper');
    has(css, '.vgrp-grid', 'the vendor group cards');
    has(css, '.adj-grid', 'the price-lever row');
    has(css, '.est-pair', 'the paired estimate cards');
    has(css, 'body.no-smf', 'the SMF column hide');
  }

  group('the build stamp is in the markup, not in the stylesheet');
  {
    const OPEN = '<span class="hdr-ver" style="opacity:0.5;margin-left:8px;font-size:10px;">';
    eq(src.split(OPEN).length - 1, 1, 'exactly one build-stamp span');

    const at = src.indexOf(OPEN) + OPEN.length;
    const stamp = src.slice(at, src.indexOf('</span>', at));
    ok(/^\d{4}\.\d{2}\.\d{2} · \d{1,2}:\d{2}[ap]m ET$/.test(stamp),
       'the stamp is a well-formed `YYYY.MM.DD · H:MMpm ET` (found ' + JSON.stringify(stamp) + ')');

    // The exact shape of the 2026-09-10 damage: the stamp written INTO the stylesheet.
    lacks(css, ' ET', 'no build stamp landed inside the <style> block');

    // And the trap itself, stated so the next author can see it rather than rediscover it:
    // the class name appears as a CSS rule FIRST, so anything anchored on the bare name
    // matches the stylesheet, not the header.
    has(css, '.hdr-ver{', 'the class exists as a CSS rule too');
    ok(src.indexOf('.hdr-ver{') < src.indexOf(OPEN),
       'the CSS rule comes BEFORE the span — anchor on the full opening tag, never on `hdr-ver`');
  }
};
