'use strict';
// The shipped files are plain text — no raw control bytes (2026-09-29).
//
// ⚠ WHY THIS EXISTS. `_vendorCatKey` joined a group and a category on a LITERAL NUL byte typed into
// the source, at line 33,010 of 39,236. Two things followed, and neither shows up in a test run:
//   • A search stops at it. Measured: a repo-wide search for the vendor form's own 45-second watchdog
//     message (line 33,647) found NOTHING, and a search for a line above 33,010 found havellin.html
//     fine — so every repo-wide search silently skipped the last 6,000 lines of the app, 227 top-level
//     functions: the Vendor Directory, Referral Partners, both agreement builders, the Drive folder
//     code and the Contractors roster among them. GNU grep prints "binary file matches" in place of
//     the lines instead. A session hunting for every caller of a function it
//     is about to delete gets a false "none", and that is how a ReferenceError ships.
//   • The page did not even run the character the source said. The HTML parser replaces a NUL inside
//     a <script> with U+FFFD, so the browser joined on U+FFFD while the test harness, which reads the
//     source text, joined on U+0000.
// The file's two other NUL-joined keys already wrote the escape, '\u0000'. This one does now too.
// The key is only ever an in-memory object key, reached by index and never through markup, so the
// change moves nothing a person sees.

const fs = require('fs');
const path = require('path');
const { sandbox } = require('./harness');

const ROOT = path.join(__dirname, '..');
const SHIPPED = ['havellin.html', 'manual.html', 'concierge-guide.html', 'firearms-protocol.html', 'MANUAL.md', 'CONCIERGE_GUIDE.md']
  .concat(fs.readdirSync(path.join(ROOT, 'apps-script')).filter((f) => f.endsWith('.gs')).map((f) => 'apps-script/' + f));

module.exports = function ({ group, ok, eq }) {
  group('every shipped file is plain text: no raw control byte but tab, line feed and carriage return');
  SHIPPED.forEach((f) => {
    const b = fs.readFileSync(path.join(ROOT, f));
    const bad = [];
    for (let i = 0; i < b.length && bad.length < 3; i++) {
      const c = b[i];
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) {
        const line = b.slice(0, i).toString('latin1').split('\n').length;
        bad.push('0x' + c.toString(16).padStart(2, '0') + ' at line ' + line);
      }
    }
    ok(bad.length === 0, f + ' carries no raw control byte' + (bad.length ? ' — found ' + bad.join(', ') + '; write it as an escape (\\u0000) instead' : ''));
  });
  ok(SHIPPED.length >= 7, 'the list covers the app, the three documents, both markdown copies and the Apps Script files (' + SHIPPED.length + ')');

  group('the vendor category key still joins on U+0000, so two names cannot collide');
  {
    const ctx = sandbox({ fns: ['_vendorCatKey'] });
    eq(ctx._vendorCatKey('Moving & Logistics', 'Movers'), 'Moving & Logistics\u0000Movers', 'it joins the group and the category on U+0000, written as an escape');
    ok(ctx._vendorCatKey('a b', 'c') !== ctx._vendorCatKey('a', 'b c'), 'a space inside a name cannot make two different pairs read as one key');
  }
};
