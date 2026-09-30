// Step 41 — P9: Edit Client brought up to Client Intake's rules (2026-09-30, audit H7–H9, M13–M16, Q4,
// Q15–Q18 and the intake lows).
//
// Drives the REAL page: the real + Add New Client screen typed into and saved with its own Save Client
// button, the real dashboard's Edit Client button, the real modal typed into and saved with Save Changes.
// Setup that is directory data rather than a person's action (a concierge on the roster, two referral
// partners in the cached directory) is seeded, because the directories are separate backends.
//
//   A. intake: the referral source list is built from the catalogue; a partner chosen and then hidden by a
//      personal source is not saved; the partner saved is keyed by uid; a second client at the same street
//      address is named in a warning and still saves (Q16); the reset leaves no referral block behind
//   B. ⚠⚠ H7: an estate with a Curator and a directory concierge — Edit Client opened and saved UNTOUCHED
//      changes nothing; the roles offered equal intake's
//   C. H8: the estate modal asks no phone or email for the deceased and offers only estate services; a living
//      client only living ones
//   D. H9: a start typed past the hard target keeps both, the conflict is named in red, and both save
//   E. M13: years in home, bed and bath counts, the referral partner corrected through the modal
//   F. Q17: a Home Prep intake shows access & security and safety, and hides must-find and the contents rows
//   G. overflow at 1440 and 390 with the modal open; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step41.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    p.setDefaultTimeout(8000);
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.evaluate(() => {
      window.open = function () { return null; };
      contractors.push({ name: 'Carla Mendes', role: 'TC', status: 'active' });
      referralDirectory.push(
        { _row: 5, uid: 'u-ann', partner_name: 'Ann Lowe', partner_type: 'Estate attorney', status: 'Active Partner' },
        { _row: 6, uid: 'u-bob', partner_name: 'Bob Reyes', partner_type: 'Estate attorney', status: 'Active Partner' });
      rebuildDropdowns && rebuildDropdowns();
    });
    const wd = (days) => { const d = new Date(); d.setDate(d.getDate() + days);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const WT = wd(10), START = wd(20), END = wd(45);
    // checkVisibility, not offsetParent: the modal is position:fixed, whose offsetParent is always null.
    const shown = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); return !!(e && e.checkVisibility()); }, sel);
    const job = (id) => p.evaluate((id) => JSON.parse(JSON.stringify(jobs.find(x => x.id === id) || {})), id);
    const newest = () => p.evaluate(() => (jobs[0] || {}).id);
    const openIntake = async () => {
      await p.evaluate(() => { const v = document.getElementById('edit-client-modal'); if (v) v.style.display = 'none';
        showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); if (typeof goToClientDashboard === 'function') goToClientDashboard(); });
      await p.waitForTimeout(300);
      await p.click('#btn-add-client'); await p.waitForTimeout(400); };
    const date = async (sel, v) => { await p.fill(sel, v); await p.dispatchEvent(sel, 'change'); };
    const saveIntakeBtn = async () => { await p.click('button[onclick="saveIntake()"]'); await p.waitForTimeout(900); };
    const openEdit = async (id) => {
      await p.evaluate(() => { const v = document.getElementById('edit-client-modal'); if (v) v.style.display = 'none'; });
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id);
      await p.waitForTimeout(400);
      await p.click('#client-dashboard-view button[onclick="dashEditClient(' + id + ')"]');
      await p.waitForTimeout(400);
    };
    const saveEdit = async (id) => { await p.click('#edit-client-modal button[onclick="saveClientEdit(' + id + ')"]'); await p.waitForTimeout(500); };
    const opts = (sel) => p.evaluate((sel) => Array.from(document.querySelectorAll(sel + ' option')).map(o => o.value), sel);

    // ── A. intake ─────────────────────────────────────────────────────────
    console.log('\n## A. intake: referral as shown, keyed by uid; an address on file named, never refused');
    await openIntake();
    const srcOpts = await opts('#i-src');
    ok(srcOpts.length === 16 && srcOpts.indexOf('Estate attorney') > 0, 'the source list is built from the catalogue (' + srcOpts.length + ')');
    await p.selectOption('#i-svc', 'downsizing');
    await p.fill('#i-fname', 'Tripp'); await p.fill('#i-lname', 'Butler');
    await p.fill('#i-phone', '5615550142'); await p.fill('#i-email', 'tripp@example.com');
    await p.fill('#i-addr', '12 Ocean Blvd'); await p.fill('#i-city', 'Palm Beach'); await p.fill('#i-zip', '33480');
    await p.fill('#i-sqft', '4500'); await p.selectOption('#i-ptype', { index: 1 });
    await p.selectOption('#i-src', 'Estate attorney');
    ok(await shown('#i-refpartner-wrap'), 'a professional source shows the partner picker');
    await p.selectOption('#i-refpartner', 'u-ann');
    await p.selectOption('#i-src', 'Family');
    ok(!(await shown('#i-refpartner-wrap')), 'a personal source hides it');
    await p.fill('#i-referredby', 'Joan Butler');
    await date('#i-walkthrough', WT); await date('#i-start', START); await date('#i-completion', END);
    await p.fill('#i-years-in-home', '22');
    await saveIntakeBtn();
    const idL = await newest();
    const jL = await job(idL);
    eq([jL.src, jL.refPartnerId, jL.referredByName], ['Family', '', 'Joan Butler'], '⚠ M16: the hidden partner was not saved');
    ok(!!jL.id && jL.fname === 'Tripp', 'the client was created through the real Save Client');

    await openIntake();
    ok(!(await shown('#i-refpartner-wrap')) && !(await shown('#i-referredby-wrap')), 'M14: the next intake opens with no referral block from the last');
    await p.selectOption('#i-svc', 'home_cleanout');
    await p.fill('#i-fname', 'Pat'); await p.fill('#i-lname', 'Butler');
    await p.fill('#i-phone', '5615550143'); await p.fill('#i-email', 'pat@example.com');
    await p.fill('#i-addr', '12 Ocean Boulevard'); await p.dispatchEvent('#i-addr', 'change');
    await p.fill('#i-zip', '33480'); await p.dispatchEvent('#i-zip', 'change');
    ok(await shown('#i-addr-match'), '⚠ Q16: an address already on file is named');
    has(await p.textContent('#i-addr-match'), 'Tripp Butler', 'with the client on file');
    await p.fill('#i-city', 'Palm Beach'); await p.fill('#i-sqft', '3000'); await p.selectOption('#i-ptype', { index: 1 });
    await p.selectOption('#i-src', 'Estate attorney'); await p.selectOption('#i-refpartner', 'u-bob');
    await date('#i-start', START);
    await saveIntakeBtn();
    const idP = await newest();
    ok(idP !== idL, 'and the save goes ahead — a warning, never a gate');
    eq([(await job(idP)).refPartnerId, (await job(idP)).refPartnerName], ['u-bob', 'Bob Reyes'], 'M16: the partner is stored by uid');

    // ── B. H7 open-and-save untouched ─────────────────────────────────────
    console.log('\n## B. ⚠⚠ an estate with a Curator and a directory concierge: save untouched changes nothing');
    await openIntake();
    await p.selectOption('#i-svc', 'probate');
    await p.evaluate(() => toggleIntakeFields());
    const intakeRoles = await opts('#i-executor-role');
    ok(intakeRoles.indexOf('Curator') >= 0 && intakeRoles.indexOf('Administrator ad litem') >= 0, 'intake offers the court-appointed roles');
    await p.fill('#i-fname', 'Eleanor'); await p.fill('#i-lname', 'Vance');
    await p.fill('#i-addr', '4 Via Mizner'); await p.fill('#i-city', 'Palm Beach'); await p.fill('#i-zip', '33480');
    await p.fill('#i-sqft', '6200'); await p.selectOption('#i-ptype', { index: 1 }); await p.selectOption('#i-src', 'Website');
    await date('#i-start', START);
    await p.fill('#i-executor-fname', 'Joan'); await p.fill('#i-executor-lname', 'Vance');
    await p.selectOption('#i-executor-role', 'Curator');
    await p.fill('#i-executor-phone', '5615550199'); await p.fill('#i-executor-email', 'joan@example.com');
    await date('#i-date-of-death', wd(-90)); await p.selectOption('#i-matter-type', 'probate');
    await p.fill('#i-probate-case', '50-2026-CP-004411');
    await p.fill('#i-probate-atty-fname', 'Ann'); await p.fill('#i-probate-atty-lname', 'Lowe'); await p.fill('#i-probate-atty-firm', 'Lowe PA');
    await p.fill('#i-probate-atty-phone', '5615550111'); await p.fill('#i-probate-atty-email', 'ann@lowe.law');
    await p.selectOption('#i-tc', 'Carla Mendes');
    await saveIntakeBtn();
    const idE = await newest();
    const before = await job(idE);
    eq([before.executorRole, before.tc], ['Curator', 'Carla Mendes'], 'the estate was created with a Curator and Carla');
    await openEdit(idE);
    ok(await shown('#edit-client-modal'), 'Edit Client opened from the dashboard button');
    eq((await opts('#ec-exec-role')).slice().sort(), intakeRoles.slice().sort(), 'Edit Client offers exactly intake\'s roles');
    dialogs.length = 0;
    await saveEdit(idE);
    const after = await job(idE);
    const K = ['name', 'svc', 'phone', 'email', 'addr', 'city', 'zip', 'sqft', 'ptype', 'src', 'start', 'tc', 'executorRole',
      'executor', 'executorEmail', 'deathDate', 'matterType', 'probateCase', 'probateAttyEmail', 'yearsInHome'];
    const pick = (j) => K.map((k) => k + '=' + (j[k] == null ? '' : j[k]));
    eq(pick(after), pick(before), '⚠⚠ H7: an untouched save changes nothing');
    eq(dialogs, [], 'and nothing is refused');

    // ── C. H8 ─────────────────────────────────────────────────────────────
    console.log('\n## C. the estate modal asks nothing of the deceased and stays in its family');
    await openEdit(idE);
    ok(!(await p.$('#ec-phone')) && !(await p.$('#ec-email')), '⚠ no phone or email field for the deceased');
    eq(await opts('#ec-svc'), ['cleanout', 'probate', 'contested_probate'], 'estate services only');
    await openEdit(idL);
    eq(await opts('#ec-svc'), ['prep', 'downsizing', 'downsizing_move', 'home_cleanout'], 'a living client: living services only');

    // ── D. H9 ─────────────────────────────────────────────────────────────
    console.log('\n## D. a start past the hard target is kept and flagged');
    const late = wd(60);
    await date('#ec-start', late);
    ok(await shown('#ec-date-flag'), '⚠ the conflict is on screen');
    has(await p.textContent('#ec-date-flag'), 'is after the hard target', 'and named');
    eq(await p.inputValue('#ec-completion'), END, '⚠⚠ the hard target was not cleared');
    const red = await p.evaluate(() => getComputedStyle(document.getElementById('ec-date-flag')).color);
    ok(/rgb\(\s*1\d\d|rgb\(\s*2\d\d/.test(red), 'in red (' + red + ')');

    // ── E. M13 ────────────────────────────────────────────────────────────
    console.log('\n## E. years in home, beds and baths, the referral partner');
    await p.fill('#ec-years-in-home', '40'); await p.fill('#ec-beds', '5'); await p.fill('#ec-baths', '4'); await p.fill('#ec-half-baths', '1');
    await p.selectOption('#ec-src', 'Estate attorney');
    ok(await shown('#ec-refpartner-wrap'), 'the partner picker appears for a professional source');
    await p.selectOption('#ec-refpartner', 'u-ann');
    await saveEdit(idL);
    const jE = await job(idL);
    eq([jE.start, jE.completion], [late, END], '⚠⚠ both dates saved as they stand');
    eq([jE.yearsInHome, jE.beds, jE.baths, jE.halfBaths], ['40', '5', '4', '1'], 'the four counts saved');
    eq([jE.src, jE.refPartnerId, jE.refPartnerName, jE.referredByName], ['Estate attorney', 'u-ann', 'Ann Lowe', ''],
       '⚠ Q15: the referral corrected, and the old personal name dropped with its source');

    // ── F. Q17 ────────────────────────────────────────────────────────────
    console.log('\n## F. Home Prep intake: access & security and safety, no must-find');
    await openIntake();
    await p.selectOption('#i-svc', 'prep');
    await p.evaluate(() => toggleIntakeFields());
    ok(await shown('#i-hfr-access'), '⚠ the access & security row is asked');
    ok(await shown('#i-safety'), 'and the safety question');
    ok(!(await shown('#i-hfr-firearms')) && !(await shown('#i-hfr-cash')), 'the contents rows are not');
    ok(!(await shown('#i-mustfind')), 'nor the must-find question');
    await p.selectOption('#i-svc', 'downsizing');
    await p.evaluate(() => toggleIntakeFields());
    ok(await shown('#i-hfr-firearms') && await shown('#i-mustfind'), 'switching back asks them again');

    // ── G. layout ─────────────────────────────────────────────────────────
    console.log('\n## G. overflow and errors');
    await openEdit(idE);
    for (const w of [1440, 390]) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(o <= 0, 'no horizontal overflow at ' + w + 'px with Edit Client open (' + o + ')');
    }
    eq(errs, [], 'no page errors');
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
    console.log(pass + ' passed, ' + fail + ' failed');
  }
})();
