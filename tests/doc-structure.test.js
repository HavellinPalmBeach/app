'use strict';
// The STRUCTURE of the three HTML documents — manual.html, concierge-guide.html and
// firearms-protocol.html (2026-09-23).
//
// ⚠⚠ WHY THIS EXISTS. For weeks the operations manual rendered its back two-thirds — the second
// half of §7 and every section from §8 to §17 — INSIDE one `.note` box and OUTSIDE the page
// column. Line 630 ended its note with `</div></div>`: the second close shut the `.page` wrapper
// early. The note that opens two lines later ("The stages branch on the JOB FAMILY…") was never
// closed, so it swallowed everything after it, until the file's last `</div>` — the one written
// for `.page` — closed it instead. Measured in headless Chromium before the fix, at 1440px:
// sections 8–17 ran 1,343px wide against the 722px column, in the note's brown ink rather than
// the body's, with 255 of the manual's 387 notes and 35 of its 57 tables rendered inside that one;
// under print media only 20 of 57 tables reached the full column width, against 51 of 57 after
// (the six left over sit inside real notes, correctly).
//
// ⚠⚠ AND EVERY CHECK THIS PROJECT RAN ON THE FILE PASSED, BECAUSE THE HTML WAS WELL-FORMED. One
// close missing and one extra: the open/close COUNTS balanced, which is the "tag balance clean"
// line every documentation pass recorded. A strict stack parse was clean too — every `</div>`
// really did close the innermost open `<div>`. It was a valid document with the wrong tree. Only
// a rule about what the tree MEANS can catch that: a note never holds a heading, a note never
// holds a note, and the page wrapper holds everything. Those are the checks below. The stack
// parse is kept beside them because it is cheap and catches the other shape — a close missing
// with no stray to cancel it.

const fs = require('fs');
const path = require('path');

// `wrapper` is the class of the document's page column. The floors are not pins: they fail a
// file the parser read as empty, so the rules below cannot pass vacuously.
const DOCS = [
  { file: 'manual.html', wrapper: 'page', minH2: 15, minBoxes: 100 },
  { file: 'concierge-guide.html', wrapper: 'page', minH2: 10, minBoxes: 50 },
  { file: 'firearms-protocol.html', wrapper: 'wrap', minH2: 3, minBoxes: 0 },
];

// The boxes a reader sees as a callout. None of them may hold a section heading or another box.
const BOX = ['note', 'stop', 'flow'];
const VOID = ['br', 'meta', 'link', 'img', 'hr', 'input', 'col', 'area', 'base', 'wbr', 'source', 'track', 'embed', 'param'];

// A source-level parse. Comments, <style> and <script> are blanked first — the manual's phone
// block carries prose inside a CSS comment, which is why a raw count of `<code>` has read one
// high for months. Blanking keeps every newline, so the line numbers reported stay true.
function parse(src) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const clean = src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, blank);
  const lineAt = (i) => clean.slice(0, i).split('\n').length;
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  const bodyAt = clean.search(/<body\b/i);

  const stack = [];      // every open, non-void element
  const nesting = [];    // a close that does not match the innermost open, or nothing left to close
  const heads = [];      // { tag, line, divs }  divs = the open <div>s around it, outermost first
  const boxes = [];      // { cls, line, divs }
  const divCloses = [];  // { line, div }  in document order
  let firstDiv = null;   // the first <div> opened inside <body>: the page column
  let m;
  while ((m = tagRe.exec(clean))) {
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (VOID.includes(tag)) continue;
    const line = lineAt(m.index);
    const cls = ((m[3].match(/\bclass\s*=\s*"([^"]*)"/) || [])[1] || '').split(/\s+/).filter(Boolean);
    const divs = () => stack.filter((e) => e.tag === 'div');
    if (!close) {
      if (m.index > bodyAt && /^h[1-4]$/.test(tag)) heads.push({ tag, line, divs: divs() });
      if (m.index > bodyAt && tag === 'div' && cls.some((c) => BOX.includes(c))) boxes.push({ cls, line, divs: divs() });
      const el = { tag, cls, line };
      if (tag === 'div' && !firstDiv && m.index > bodyAt) firstDiv = el;
      stack.push(el);
      continue;
    }
    const top = stack[stack.length - 1];
    if (!top) { nesting.push('L' + line + ' </' + tag + '> closes nothing — nothing is open'); continue; }
    if (top.tag !== tag) { nesting.push('L' + line + ' </' + tag + '> but the innermost open element is <' + top.tag + '> from L' + top.line); continue; }
    stack.pop();
    if (tag === 'div') divCloses.push({ line, div: top });
  }
  for (const e of stack) nesting.push('<' + e.tag + (e.cls.length ? ' class="' + e.cls.join(' ') + '"' : '') + '> from L' + e.line + ' is never closed');
  return { nesting, heads, boxes, divCloses, firstDiv };
}

const isBox = (d) => d.cls.some((c) => BOX.includes(c));
const label = (d) => (d.cls.join('.') || 'div') + ' from L' + d.line;
const list = (xs, n) => xs.slice(0, n || 4).join(' · ') + (xs.length > (n || 4) ? ' · … ' + xs.length + ' in all' : '');

module.exports = function ({ group, ok, eq }) {
  for (const doc of DOCS) {
    const p = path.join(__dirname, '..', doc.file);
    const t = parse(fs.readFileSync(p, 'utf8'));
    const h2 = t.heads.filter((h) => h.tag === 'h2');

    group(doc.file + ' — the parser actually read the document');
    {
      ok(h2.length >= doc.minH2, 'at least ' + doc.minH2 + ' section headings (found ' + h2.length + ')');
      ok(t.boxes.length >= doc.minBoxes, 'at least ' + doc.minBoxes + ' notes/flows (found ' + t.boxes.length + ')');
    }

    group(doc.file + ' — every element it opens, it closes, in order');
    {
      eq(t.nesting.length, 0, 'no unmatched or unclosed tag — ' + (list(t.nesting) || 'clean'));
    }

    group(doc.file + ' — the page column holds the whole document');
    {
      // The first <div> in the body is the column. It has to be the LAST <div> closed: an early
      // close is exactly the stray that hid the unclosed note, and everything after it falls out
      // of the column and runs the full width of the screen.
      const first = t.firstDiv;
      ok(!!first && first.cls.includes(doc.wrapper), 'the first <div> in the body is the .' + doc.wrapper + ' column');
      const last = t.divCloses[t.divCloses.length - 1];
      ok(last && last.div === first, 'and it is the last <div> closed (the last close ends ' + (last ? label(last.div) : 'nothing') + ')');
      const outside = t.heads.filter((h) => !h.divs.includes(first)).map((h) => h.tag + ' L' + h.line)
        .concat(t.boxes.filter((b) => !b.divs.includes(first)).map((b) => b.cls.join('.') + ' L' + b.line));
      eq(outside.length, 0, 'no heading or box sits outside the column — ' + (list(outside) || 'none'));
    }

    group(doc.file + ' — a box never holds a heading or another box');
    {
      // This is the rule that fires on an unclosed note whatever else is going on in the file:
      // the next section heading lands inside it.
      const headInBox = t.heads.filter((h) => h.divs.some(isBox)).map((h) => h.tag + ' L' + h.line + ' inside ' + label(h.divs.filter(isBox).pop()));
      eq(headInBox.length, 0, 'no h1–h4 inside a note, stop or flow — ' + (list(headInBox) || 'none'));
      const boxInBox = t.boxes.filter((b) => b.divs.some(isBox)).map((b) => b.cls.join('.') + ' L' + b.line + ' inside ' + label(b.divs.filter(isBox).pop()));
      eq(boxInBox.length, 0, 'no note, stop or flow inside another — ' + (list(boxInBox) || 'none'));
    }

    if (doc.wrapper === 'page') {
      group(doc.file + ' — every section heading sits directly in the column');
      {
        const stray = h2.filter((h) => {
          const inner = h.divs[h.divs.length - 1];
          return !inner || !inner.cls.includes('page');
        }).map((h) => 'h2 L' + h.line + ' in ' + (h.divs.length ? label(h.divs[h.divs.length - 1]) : 'the body'));
        eq(stray.length, 0, 'every <h2> is a direct child of .page — ' + (list(stray) || 'all ' + h2.length));
      }
    }
  }
};
