// TWO OFF THE FIVE-CLIENT TEST RUN (2026-09-22).
//
// (1) THE DRIVE FOLDER TAKES SECONDS AND THE "CREATE" BUTTON WAS OFFERED THROUGHOUT.
//     Anthony: "the old, create google drive folder button is stil there. but the folder is
//     created automatically. when i clicked it, it changed to a drive link."
//     saveIntake fires the create and navigates 800ms later; Apps Script cold-starts in
//     SECONDS. So the gap between "client created" and "folder landed" rendered a control
//     asserting the folder did not exist — and pressing it sent a SECOND createFolder.
//
// (2) THE MANAGER-APPROVAL EMAIL WENT OUT FROM A PERSONAL iCLOUD ACCOUNT.
//     Anthony: "ashley had her icloud account open on her computer so the email was sent
//     from her personal icloud, not havellin gmail."  mailto: hands the message to whatever
//     the MACHINE has set as its default mail program; nothing in the link can change that.
//
// ⚠ ONLY THE BROWSER PROVES EITHER. "driveFolderPending returns true" and "a person cannot
//   press the button" are two claims; so are "sendInternalEmail exists" and "no mailto opens".
// ⚠ The viewport option is `viewport`, NOT `viewportSize`.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

const FOLDER = 'https://drive.google.com/drive/folders/STEP15-FOLDER';
const SUBS = { 'Estate Inventory':'s1','As-Found Record':'s2','Walkthrough Notes':'s3',
               'Estimates':'s4','Agreement':'s5','Change Orders':'s6','Invoice':'s7' };

// Fill the real intake form. The ids are the real ones — guessing them is what made an
// earlier probe read `jobs=0` while the form said plainly what it wanted.
async function intake(p, name) {
  await p.evaluate((nm) => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const pick = (id) => { const el = document.getElementById(id);
      if (el && el.options) for (const o of el.options) if (o.value) { el.value = o.value; break; } };
    openIntakeScreen();   // + Add New Client — Intake left the nav 2026-09-23
    set('i-fname', nm); set('i-lname', 'Probe');
    set('i-phone', '(561) 555-0100'); set('i-email', 'probe@example.com');
    set('i-addr', '1 Probe Way'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
    set('i-svc', 'downsizing');
    if (typeof toggleIntakeFields === 'function') toggleIntakeFields();
    pick('i-src'); pick('i-ptype');
    set('i-sqft', '3500'); set('i-start', '2026-10-01'); set('i-walkthrough', '2026-09-25');
  }, name);
  await p.evaluate(() => saveIntake());
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // ── 1. THE THREE DRIVE STATES, ON A REAL INTAKE, AGAINST A SLOW BACKEND ──────────────
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    let creates = 0;
    await p.route('**/exec*', async route => {
      let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      // ⚠ COUNTED WHEN THE REQUEST IS SENT, not when it is answered. Counting after the
      // delay reports 0 for the whole in-flight window — which is precisely the window
      // this step is about, so the check would measure nothing.
      if (body.action === 'createFolder') creates++;
      await new Promise(r => setTimeout(r, 2500));           // an Apps Script cold start
      if (body.action === 'createFolder') {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, folderUrl: FOLDER, subfolders: SUBS }) }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await p.addInitScript(() => localStorage.setItem('hav_sheets_url', 'https://script.google.com/macros/s/FAKE/exec'));
    await p.goto(APP); await p.waitForTimeout(1200);
    await intake(p, 'Drive');
    eq(await p.evaluate(() => jobs.length), 1, 'the intake saved — the form is filled the way it asks');

    // 900ms in: saveIntake has navigated, the create is still in the air.
    await p.waitForTimeout(900);
    const id = await p.evaluate(() => jobs[0].id);
    await p.evaluate((i) => openClientDashboard(i), id);
    await p.waitForTimeout(250);
    eq(await p.evaluate((i) => driveFolderPending(i), id), true, 'the job is marked as having a create in flight');
    const midHtml = await p.evaluate(() => {
      const el = document.querySelector('#client-dashboard-view .d-util'); return el ? el.innerHTML : ''; });
    ok(/Creating Drive folder/.test(midHtml), 'the bar reads "Creating Drive folder…" while it is in the air');
    ok(!/createDriveFolderNow/.test(midHtml), '⚠⚠ and offers no button — this is the press that sent a second createFolder');
    const midBtn = await p.$('#client-dashboard-view .d-util button[onclick^="createDriveFolderNow"]');
    eq(midBtn, null, '⚠ there is nothing to press mid-flight');
    ok(!/onclick="undefined"/.test(midHtml), '⚠ nor a handler-less button, which is what dropping the idle branch produced');

    // The handler carries the same gate, so it cannot be reached around.
    await p.evaluate((i) => createDriveFolderNow(i), id);
    await p.waitForTimeout(150);
    eq(creates, 1, '⚠⚠ calling the handler directly mid-flight sends NO second createFolder');

    // Let it land.
    await p.waitForTimeout(3000);
    eq(await p.evaluate((i) => driveFolderPending(i), id), false, 'the marker clears when the answer lands');
    eq(await p.evaluate(() => jobs[0].driveFolder), FOLDER, 'the folder URL is on the job');
    await p.evaluate((i) => openClientDashboard(i), id);
    await p.waitForTimeout(250);
    const doneHtml = await p.evaluate(() => document.querySelector('#client-dashboard-view .d-util').innerHTML);
    ok(/<a href="https:\/\/drive\.google\.com/.test(doneHtml), 'and the control is an anchor with a real href');
    ok(!/Creating Drive folder/.test(doneHtml), 'no longer reading as pending');
    eq(creates, 1, 'exactly one createFolder was ever sent for this client');

    const w1440 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
    const w390 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(w1440 <= 0, 'no horizontal overflow at 1440  (' + w1440 + ')');
    ok(w390 <= 0, 'no horizontal overflow at 390  (' + w390 + ')');
    eq(errs.length, 0, 'no page errors on the Drive pass  ' + JSON.stringify(errs.slice(0, 2)));
    await p.close();
  }

  // ── 2. A REFUSED CREATE GIVES THE REPAIR DOOR BACK ───────────────────────────────────
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('**/exec*', async route => {
      let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      await new Promise(r => setTimeout(r, 800));
      if (body.action === 'createFolder')
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: 'Exception: No item with the given ID could be found' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await p.addInitScript(() => localStorage.setItem('hav_sheets_url', 'https://script.google.com/macros/s/FAKE/exec'));
    await p.goto(APP); await p.waitForTimeout(1200);
    await p.evaluate(() => { window.jobs = [{ id: 801, name: 'Fail Probe', hvlId: 'HVL-0801', svc: 'downsizing', status: 'new' }]; });
    await p.evaluate(() => createDriveJobFolder(jobs[0]));
    eq(await p.evaluate(() => driveFolderPending(801)), true, 'in flight');
    await p.waitForTimeout(2200);
    eq(await p.evaluate(() => driveFolderPending(801)), false,
       '⚠⚠ the marker clears on a REFUSAL too — otherwise the repair door is withheld on the one job that needs it');
    ok(await p.evaluate(() => !!jobs[0].driveFolderError), 'the failure is recorded on the job');
    await p.evaluate(() => openClientDashboard(801));
    await p.waitForTimeout(250);
    const failHtml = await p.evaluate(() => document.querySelector('#client-dashboard-view .d-util').innerHTML);
    ok(/createDriveFolderNow\(801\)/.test(failHtml), 'and the repair door is a real button again');
    eq(errs.length, 0, 'no page errors on the refusal pass  ' + JSON.stringify(errs.slice(0, 2)));
    await p.close();
  }

  // ── 3. THE APPROVAL REQUEST DRAFTS IN THE FIRM MAILBOX, NOT THE OS MAIL CLIENT ───────
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://gmail.googleapis.com/**', r => r.fulfill({ status: 200,
      contentType: 'application/json', body: JSON.stringify({ id: 'd1', message: { id: 'm1' } }) }));
    await p.route('https://www.googleapis.com/oauth2/**', r => r.fulfill({ status: 200,
      contentType: 'application/json', body: JSON.stringify({ email: 'ashley@havellinpalmbeach.com' }) }));
    await p.goto(APP); await p.waitForTimeout(1200);
    const r = await p.evaluate(async () => {
      const opened = []; window.open = (u) => { opened.push(String(u)); return null; };
      const badges = []; window.showSyncBadge = (m, e) => badges.push((e ? 'ERR ' : '') + m);
      // Google Identity Services cannot load from a file:// page, so stand in for it. The
      // token exchange is Google's, not ours; what is under test is the route the app takes.
      window.google = { accounts: { oauth2: { initTokenClient: (o) => ({
        requestAccessToken: () => o.callback({ access_token: 'tok', expires_in: 3600 }) }) } } };
      window.jobs = [{ id: 802, name: 'Gmail Probe', addr: '2 Probe Way', svc: 'cleanout' }];
      let spec = null; const real = window.buildMimeMessage;
      window.buildMimeMessage = (o) => { spec = o; return real(o); };
      notifyManagerForApproval({ jobId: 802, havellinTotal: 25715 }, null);
      await new Promise(r => setTimeout(r, 700));
      return { opened, badges, to: spec && spec.to, subject: spec && spec.subject, text: spec && spec.text };
    });
    eq(r.opened.filter(u => u.indexOf('mailto:') === 0).length, 0,
       '⚠⚠ NO mailto: — that is the line that sent a pricing approval from a personal iCloud account');
    eq(r.to, 'estimates@havellinpalmbeach.com', 'the draft is addressed to the estimates group');
    ok(/Estimate Ready for Approval: Gmail Probe/.test(r.subject || ''), 'naming the client');
    ok(!/%20|%E2%80%94/.test(r.subject || ''), '⚠ and the subject is not double-encoded');
    ok(/25,715/.test(r.text || ''), 'carrying the figure a manager is approving');
    ok(r.opened.some(u => /mail\.google\.com/.test(u)), 'the draft is opened in Gmail');
    ok(r.badges.some(x => /ashley@havellinpalmbeach\.com/.test(x)),
       '⚠ and the badge NAMES THE MAILBOX, because the draft link can only open Google account 0');
    eq(errs.length, 0, 'no page errors on the Gmail pass  ' + JSON.stringify(errs.slice(0, 2)));
    await p.close();
  }

  // ── 4. NO GMAIL → mailto: STILL OPENS, AND IT WARNS ABOUT THE FROM ADDRESS ───────────
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(APP); await p.waitForTimeout(1200);
    const r = await p.evaluate(async () => {
      const opened = []; window.open = (u) => { opened.push(String(u)); return null; };
      const badges = []; window.showSyncBadge = (m, e) => badges.push((e ? 'ERR ' : '') + m);
      window.GMAIL_CLIENT_ID = '';
      window.jobs = [{ id: 803, name: 'Fallback Probe', svc: 'downsizing' }];
      notifyManagerForApproval({ jobId: 803, havellinTotal: 100 }, null);
      await new Promise(r => setTimeout(r, 400));
      return { opened, badges };
    });
    eq(r.opened.filter(u => u.indexOf('mailto:') === 0).length, 1,
       '⚠ with no Gmail configured a compose window still opens — a button that only errors is worse');
    ok(r.badges.some(x => /CHECK THE FROM ADDRESS/i.test(x)),
       '⚠⚠ and it says so — the whole defect is that a wrong From address is invisible to the person pressing send');
    ok(r.badges.some(x => /^ERR /.test(x)), 'raised as a warning rather than a quiet success');
    eq(errs.length, 0, 'no page errors on the fallback pass  ' + JSON.stringify(errs.slice(0, 2)));
    await p.close();
  }

  await b.close();
  console.log('step16: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
