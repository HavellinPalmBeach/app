'use strict';
// Tiny zero-dependency runner. `node tests/run.js` runs every *.test.js beside it.
// Exits non-zero on the first failing suite so it is usable as a pre-commit check.

const fs = require('fs');
const path = require('path');

const results = { pass: 0, fail: 0, failures: [] };
let current = '(none)';

// ⚠ `group` is a LABEL MARKER, and the house style is to call it bare and let the
// assertions run flat after it. But a caller writing `group('x', () => { ... })` — the
// other obvious shape, and the one every other tiny runner uses — got a silent no-op:
// the body was never invoked, so an ENTIRE suite of assertions ran zero checks and the
// file still printed `ok`. That happened for real on 2026-09-11 with
// dashboard-utility-bar.test.js, and the only thing that gave it away was the total not
// moving. Accept both shapes rather than leaving a trap that costs a whole file.
function group(name, body) {
  current = name;
  if (typeof body === 'function') body(api);
}

function ok(cond, label) {
  if (cond) { results.pass++; return; }
  results.fail++;
  results.failures.push(`${current} › ${label}`);
}

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { results.pass++; return; }
  results.fail++;
  results.failures.push(`${current} › ${label}\n      expected: ${e}\n      actual:   ${a}`);
}

function has(hay, needle, label) {
  if (String(hay).includes(needle)) { results.pass++; return; }
  results.fail++;
  results.failures.push(`${current} › ${label}\n      missing: ${JSON.stringify(needle)}`);
}

function lacks(hay, needle, label) {
  if (!String(hay).includes(needle)) { results.pass++; return; }
  results.fail++;
  results.failures.push(`${current} › ${label}\n      unexpectedly present: ${JSON.stringify(needle)}`);
}

const api = { group, ok, eq, has, lacks };

const files = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

if (!files.length) {
  console.error('no *.test.js files found in tests/');
  process.exit(1);
}

for (const f of files) {
  const before = results.fail;
  const beforeRan = results.pass + results.fail;
  try {
    require(path.join(__dirname, f))(api);
  } catch (err) {
    results.fail++;
    results.failures.push(`${f} threw before finishing\n      ${err && err.stack ? err.stack : err}`);
  }
  // ⚠⚠ A SUITE THAT RAN NOTHING IS A FAILURE, NOT A PASS. This is the general net behind
  // the `group` fix above: whatever the reason an assertion body does not execute — a
  // callback nobody calls, an early return, a loop over an empty list — the file used to
  // print `ok` and the only evidence was the grand total failing to move. CLAUDE.md
  // records a dozen assertions that could not fail; this is the one shape that hides a
  // whole FILE of them.
  const ran = results.pass + results.fail - beforeRan;
  if (ran === 0) {
    results.fail++;
    results.failures.push(`${f} ran ZERO checks — the file loaded but nothing asserted`);
  }
  const delta = results.fail - before;
  console.log(`  ${delta === 0 ? 'ok  ' : 'FAIL'}  ${f}  ${String(ran).padStart(5)} checks`);
}

console.log(`\n${results.pass} passed, ${results.fail} failed`);
if (results.failures.length) {
  console.log('\nFailures:');
  for (const f of results.failures) console.log(`  ✗ ${f}`);
}
process.exit(results.fail ? 1 : 0);
