'use strict';
// Tiny zero-dependency runner. `node tests/run.js` runs every *.test.js beside it.
// Exits non-zero on the first failing suite so it is usable as a pre-commit check.

const fs = require('fs');
const path = require('path');

const results = { pass: 0, fail: 0, failures: [] };
let current = '(none)';

function group(name) { current = name; }

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
  try {
    require(path.join(__dirname, f))(api);
  } catch (err) {
    results.fail++;
    results.failures.push(`${f} threw before finishing\n      ${err && err.stack ? err.stack : err}`);
  }
  const delta = results.fail - before;
  console.log(`  ${delta === 0 ? 'ok  ' : 'FAIL'}  ${f}`);
}

console.log(`\n${results.pass} passed, ${results.fail} failed`);
if (results.failures.length) {
  console.log('\nFailures:');
  for (const f of results.failures) console.log(`  ✗ ${f}`);
}
process.exit(results.fail ? 1 : 0);
