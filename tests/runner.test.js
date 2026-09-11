'use strict';
// THE RUNNER ITSELF (2026-09-11).
//
// ⚠⚠ WHY THIS EXISTS: NOTHING HAS EVER TESTED `run.js`, AND THAT IS EXACTLY HOW IT CAME
// TO SWALLOW A WHOLE SUITE. `group(name)` took one argument and ignored a second. The
// house style calls it bare as a label marker, so that was fine for 44 files — but
// `group('x', () => { ...assertions... })`, which is how every other tiny runner works
// and the first shape anyone reaches for, was a SILENT NO-OP. The body was never invoked.
//
// On 2026-09-11 `dashboard-utility-bar.test.js` was written that way: ~60 assertions, a
// cheerful `ok` beside the filename, and **zero checks actually run**. The only evidence
// was the grand total not moving — 3997 before the file existed and 3997 after. Had the
// total happened to move for another reason in the same commit, a test file that could
// not fail would have been committed as coverage. CLAUDE.md records a dozen individual
// assertions that could not fail; this is the shape that hides an entire FILE of them.
//
// Two fixes, and each is verified below by DRIVING THE REAL RUNNER as a subprocess
// against fixture suites — not by reading its source, which is what let this through.
//   1. `group` invokes a function body, so both shapes work.
//   2. A suite contributing ZERO checks is a FAILURE, not a pass. That is the general
//      net: whatever the reason a body does not execute — an uncalled callback, an early
//      return, a loop over an empty list — the file can no longer print `ok`.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

module.exports = function ({ group, ok, eq, has, lacks }) {

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ `group(name, body)` runs the body — and this group IS the proof');

  // Written in the callback style deliberately. If `group` stops invoking bodies, every
  // check in this file vanishes, the file contributes zero checks, and the guard tested
  // in the next group fails it. The two fixes hold each other up, which is the point:
  // neither can be quietly removed.
  group('callback style, nested', (api) => {
    ok(true, 'a callback group body is executed');
    ok(api && typeof api.eq === 'function', 'and it is handed the assertion API');
  });

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A SUITE THAT RAN NOTHING FAILS — driven, as a real subprocess');

  const RUN = path.join(__dirname, 'run.js');
  const runner = fs.readFileSync(RUN, 'utf8');

  // Spin up a throwaway tests/ directory holding `run.js` and whatever fixture suites the
  // case needs, then run it exactly as `npm test` would. Driving it is the only honest
  // way to check a guard whose whole job is to notice an ABSENCE.
  function runWith(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hav-runner-'));
    try {
      fs.writeFileSync(path.join(dir, 'run.js'), runner);
      Object.keys(files).forEach((name) => fs.writeFileSync(path.join(dir, name), files[name]));
      let out = '';
      let code = 0;
      try {
        out = execFileSync(process.execPath, [path.join(dir, 'run.js')], { encoding: 'utf8' });
      } catch (e) {
        out = String(e.stdout || '') + String(e.stderr || '');
        code = e.status === undefined ? -1 : e.status;
      }
      return { out, code };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  const REAL = "module.exports = function ({ ok }) { ok(true, 'a real check'); };\n";
  const EMPTY = 'module.exports = function () {};\n';
  const UNCALLED = "module.exports = function ({ group, ok }) { group('never runs', () => { ok(false, 'x'); }); };\n";

  // A healthy suite passes and exits 0 — the control, without which every check below
  // would pass against a runner that simply always failed.
  const good = runWith({ 'a.test.js': REAL });
  eq(good.code, 0, 'a suite with real checks exits 0');
  has(good.out, '1 passed, 0 failed', 'and reports them');
  has(good.out, 'a.test.js', 'naming the file');
  has(good.out, 'checks', '⚠ and printing its own check count, so a file going quiet is visible');

  // A suite that asserts nothing is a FAILURE. This is the guard.
  const empty = runWith({ 'a.test.js': REAL, 'b.test.js': EMPTY });
  eq(empty.code, 1, 'a suite that asserts nothing fails the run');
  has(empty.out, 'ran ZERO checks', 'and says so in those words');
  has(empty.out, 'b.test.js', 'naming the file that went quiet');
  lacks(empty.out, '0 failed', 'the run does not report itself clean');

  // ⚠ THE ACTUAL BUG, REPRODUCED: a file whose only assertions sit inside an uninvoked
  // callback. With `group` fixed it runs its checks and fails honestly on the `ok(false)`;
  // with `group` broken it would run nothing, and the ZERO-checks guard catches it. Either
  // way the run goes red — which is the guarantee, and it is why this asserts the exit
  // code rather than a particular message.
  const uncalled = runWith({ 'c.test.js': UNCALLED });
  eq(uncalled.code, 1, 'a callback-style suite can never pass silently');
  ok(/ran ZERO checks|1 failed/.test(uncalled.out),
    '…either its checks ran and failed, or the zero-check guard caught it');

  // And with `group` working, the callback body's checks really are counted — the
  // positive half, or "it went red" could be true for the wrong reason.
  const counted = runWith({
    'd.test.js': "module.exports = function ({ group, ok }) { group('g', () => { ok(true, '1'); ok(true, '2'); }); };\n",
  });
  eq(counted.code, 0, 'a callback suite whose checks pass, passes');
  has(counted.out, '2 passed, 0 failed', 'and both of its checks were counted');

  // ───────────────────────────────────────────────────────────────────────────
  group('The runner still does the things 44 suites rely on');

  // A throw partway through must fail the run rather than silently truncating the file —
  // the failure mode that would otherwise look identical to a suite that simply has
  // fewer checks than it used to.
  const thrower = runWith({
    'e.test.js': "module.exports = function ({ ok }) { ok(true, 'first'); throw new Error('boom'); };\n",
  });
  eq(thrower.code, 1, 'a suite that throws fails the run');
  has(thrower.out, 'threw before finishing', 'and is reported as a throw, not as a missing assertion');
  has(thrower.out, 'boom', 'with the real error in the output');

  // A failing check names its group and its label, or a red run is unreadable.
  const failing = runWith({
    'f.test.js': "module.exports = function ({ group, eq }) { group('THE GROUP'); eq(1, 2, 'THE LABEL'); };\n",
  });
  eq(failing.code, 1, 'a failing check fails the run');
  has(failing.out, 'THE GROUP › THE LABEL', 'naming the group and the label');
  has(failing.out, 'expected: 2', 'and showing what was expected');
  has(failing.out, 'actual:   1', 'against what came back');
};
