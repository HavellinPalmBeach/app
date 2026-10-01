// Step 43 — P14: the small backlog (2026-09-30, workflow audit "Other" lows, approved by Anthony).
//
// Drives the REAL page through its own controls: the dashboard's band and strip, the Activate job button,
// the Contractors tab's ✕ and the directory PIN dialog, + Add Contractor and Save Contractor, the Job
// Admin & Inv tab's row chevron and "Another item in this photo", and the band's View final invoice.
// What is seeded is state a person could not type in one sitting (a finished job, a 3,000-line manifest).
//
//   A. the Drive links name their document: a finished job's strip and tray; no "File … to Drive" on an
//      estimate sent back for approval, and the retry named once it is approved again
//   B. Activate job, pressed: the Job active step shows today's date and the assigned concierge (items 3, 7)
//   C. a contractor's ✕: the manager PIN (wrong, then right) deletes one with no history; one named on a job
//      is refused with the way out, and no PIN is asked
//   D. a name with a quote, a tag and an ampersand saved through + Add Contractor: shown as text, and held
//      by the intake concierge select
//   E. a photo split at 3,000 lines: the new row is drawn in place, no full-tab render, an unrelated row's
//      element survives, and the time against a full render
//   F. a Home Prep final: its total is headed with what it is made of, with and without concierge hours
//   G. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step43.js [/abs/path/to/havellin.html]
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
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.evaluate(() => { window.open = function () { return null; }; });
    const toDash = async (id) => {
      await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, id);
      await p.waitForTimeout(350);
    };
    const labels = (sel) => p.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((x) => x.textContent.replace(/^\S+\s/, '').trim()), sel);

    // Each section runs on its own, so a section that throws (on an old build, say) reports and the rest still run.
    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const inList = (n) => p.evaluate((n) => (document.getElementById('tc-list').textContent + document.getElementById('ps-list').textContent).indexOf(n) >= 0, n);

    // ── A. the Drive links name their document ───────────────────────────────
    await section('A. the Drive links name their document', async () => {
      await p.evaluate(() => {
        const iso = '2026-09-22', ts = '2026-09-22T14:00:00.000Z';
        const filed = (k) => ({ draftedAt: ts, sentAt: ts, sentBy: 'Anthony Graziano', provider: 'gmail',
          filedAt: ts, filedUrl: 'https://drive.google.com/file/d/' + k + '/view' });
        jobs.unshift({ id: 4301, hvlId: 'HVL-2609-A431', name: 'Harriet Ames', svc: 'cleanout', addr: '12 Ocean Blvd', city: 'Palm Beach',
          executor: 'Tom Ames', executorRole: 'Personal Representative', matterType: 'probate', tc: 'Anthony Graziano',
          start: iso, walkthrough: '2026-09-01', created: 'Sep 1, 2026', status: 'closed', won: true, wonAt: iso, wonBy: 'Anthony Graziano',
          wonMethod: 'call', approved: true, estimateSentDate: 'September 22, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
          agrSent: true, agrSentAt: 'September 22, 2026', agrSigned: true, depositReceived: true, depositReceivedAt: iso,
          deliveredOn: iso, deliveredBy: 'Anthony Graziano', activatedOn: iso, activatedBy: 'Anthony Graziano',
          payments: [{ uid: 'a1', stage: 'deposit', amount: 12050, date: iso, method: 'wire', clearedOn: iso },
                     { uid: 'a2', stage: 'midpoint', amount: 6025, date: iso, method: 'wire', clearedOn: iso },
                     { uid: 'a3', stage: 'final', amount: 6025, date: iso, method: 'wire', clearedOn: iso }],
          docState: { estimate: filed('e'), agreement: Object.assign(filed('a'), { sig: { signedBy: 'Tom Ames', signedOn: iso, how: 'wet', recordedBy: 'Anthony Graziano', provider: 'manual' } }),
                      'invoice:deposit': filed('d'), 'invoice:midpoint': filed('m'), 'invoice:final': filed('f') } });
        estimateStore[4301] = { estimate: { jobId: 4301, svc: 'cleanout', rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }], totTC: 94, totPS: 100,
          tcRate: 150, psRate: 100, tcFee: 14100, psFee: 10000, havellinTotal: 24100, docTier: 'values' }, approved: true, approvedBy: 'Anthony Graziano',
          approvedAt: 'September 22, 2026', savedAt: Date.parse('2026-09-22T13:00:00Z') };
        // Logged exactly as estimated, so the final is inside the ±tolerance and View opens it.
        jobLogs[4301] = [{ id: 1, date: '2026-09-22', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 94 }, { name: 'Dana Ruiz', role: 'PS', hours: 100 }] }];
        saveJobs();
      });
      await toDash(4301);
      const strip = await labels('#client-dashboard-view .jt-quick button');
      const tray = await labels('#client-dashboard-view .jt-next .jt-doc-acts button');
      eq(strip.filter((l) => /^Filed /.test(l)), ['Filed estimate', 'Filed packet', 'Filed deposit invoice', 'Filed midpoint invoice'],
         '⚠⚠ each filed copy in the strip names its document');
      eq(strip.length, new Set(strip).size, 'no two buttons in the strip read the same (' + strip.length + ')');
      ok(tray.indexOf('Filed final invoice') >= 0, 'the big buttons name the final\'s (' + tray.join(' · ') + ')');
      // Pressing a named link opens that document's filed copy.
      const opened = [];
      await p.evaluate(() => { window.open = function (u) { window.__opened = u; return null; }; });
      await p.click('#client-dashboard-view .jt-quick button:has-text("Filed packet")');
      opened.push(await p.evaluate(() => window.__opened || ''));
      has(opened[0], 'file/d/a/view', 'Filed packet opens the packet\'s filed copy');

      // An estimate sent, never filed, then sent back to the manager by a discount.
      await p.evaluate(() => {
        jobs.unshift({ id: 4302, hvlId: 'HVL-2609-B432', name: 'Ben Cole', svc: 'home_cleanout', addr: '8 Via Roma', tc: 'Anthony Graziano',
          walkthrough: '2026-09-01', created: 'Sep 1, 2026', status: 'pending', approved: false, estimateSentDate: 'September 20, 2026',
          docState: { estimate: { draftedAt: '2026-09-20T14:00:00.000Z', sentAt: '2026-09-20T14:05:00.000Z', provider: 'gmail' } } });
        estimateStore[4302] = { estimate: { jobId: 4302, svc: 'home_cleanout', rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, note: 'seen' }],
          totTC: 20, totPS: 30, havellinTotal: 11750, docTier: 'contents' }, approved: false, submitted: true, savedAt: Date.parse('2026-09-20T13:00:00Z') };
        saveJobs();
      });
      await toDash(4302);
      const back = await labels('#client-dashboard-view button');
      ok(back.some((l) => /^View estimate/.test(l)), 'fixture: the estimate is on the dashboard, readable');
      ok(!back.some((l) => /to Drive/.test(l)), '⚠⚠ no "File … to Drive" while the estimate is back with the manager — the press would be refused');
      await p.evaluate(() => { const r = estimateStore[4302]; r.approved = true; r.submitted = false; r.approvedBy = 'Anthony Graziano'; r.approvedAt = 'September 21, 2026';
        const j = jobs.find((x) => x.id === 4302); j.approved = true; j.status = 'approved'; });
      await toDash(4302);
      const again = await labels('#client-dashboard-view button');
      ok(again.indexOf('File estimate to Drive') >= 0, 'approved again: the retry is back, named (' + again.filter((l) => /Drive/.test(l)).join(' · ') + ')');
    });

    // ── B. Activate job, pressed ──────────────────────────────────────────────
    await section('B. the Job active step shows its date and the assigned concierge', async () => {
      const today = await p.evaluate(() => _todayStr());
      await p.evaluate((today) => {
        contractors.push({ id: 'c-carla', name: 'Carla Mendes', role: 'TC', status: 'active', rate: 60 });
        jobs.unshift({ id: 4303, hvlId: 'HVL-2609-C433', name: 'Clara Diaz', svc: 'home_cleanout', addr: '3 Palm Way', tc: 'Carla Mendes',
          start: today, walkthrough: '2026-09-01', created: 'Sep 1, 2026', status: 'won', won: true, wonAt: '2026-09-10', wonBy: 'Anthony Graziano',
          wonMethod: 'call', approved: true, estimateSentDate: 'September 9, 2026', agrApproved: true, agrApprovedBy: 'Anthony Graziano',
          agrApprovedAt: 'September 10, 2026', agrSent: true, agrSentAt: 'September 10, 2026', agrSigned: true,
          depositReceived: true, depositReceivedAt: '2026-09-15',
          payments: [{ uid: 'c1', stage: 'deposit', amount: 5875, date: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }],
          docState: { estimate: { sentAt: '2026-09-09T14:00:00.000Z' }, agreement: { sentAt: '2026-09-10T14:00:00.000Z',
            sig: { signedBy: 'Clara Diaz', signedOn: '2026-09-12', how: 'wet', recordedBy: 'Anthony Graziano', provider: 'manual' } },
            'invoice:deposit': { sentAt: '2026-09-11T14:00:00.000Z' } } });
        estimateStore[4303] = { estimate: { jobId: 4303, svc: 'home_cleanout', rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3, note: 'seen' }],
          totTC: 20, totPS: 30, havellinTotal: 11750, docTier: 'contents', days: 4 }, approved: true, approvedBy: 'Anthony Graziano',
          approvedAt: 'September 8, 2026', savedAt: Date.parse('2026-09-08T13:00:00Z') };
        saveJobs();
      }, today);
      await toDash(4303);
      const band = await p.evaluate(() => { const bt = document.querySelector('#client-dashboard-view .jt-next .jt-btn-p'); return bt ? bt.textContent.trim() : ''; });
      has(band, 'Activate job', 'fixture: the band\'s filled button is Activate job');
      dialogs.length = 0;
      await p.click('#client-dashboard-view .jt-next .jt-btn-p');
      await p.waitForTimeout(500);
      const stamped = await p.evaluate(() => { const j = jobs.find((x) => x.id === 4303); return [j.status, j.activatedOn, j.activatedBy]; });
      eq(stamped, ['active', today, 'Carla Mendes'], '⚠⚠ Activate job stamps today and the ASSIGNED concierge — it recorded the approver');
      await toDash(4303);
      const step = await p.evaluate(() => {
        const s = Array.from(document.querySelectorAll('#client-dashboard-view .jt-track .jt-step')).filter((x) => (x.querySelector('.jt-slbl') || {}).textContent === 'Active')[0];
        return s ? { meta: (s.querySelector('.jt-smeta') || {}).textContent || '', sub: (s.querySelector('.jt-ssub') || {}).textContent || '' } : null;
      });
      const todayFmt = await p.evaluate(() => fmtDate2(_todayStr()));
      ok(!!step, 'fixture: the track has an Active step');
      eq(step && step.meta, todayFmt, '⚠⚠ the Job active step shows the day it started');
      eq(step && step.sub, 'Carla Mendes', 'and whose job it is');
    });

    // ── C. deleting a contractor ─────────────────────────────────────────────
    await section('C. a contractor\'s ✕: the manager PIN, or retire rather than delete', async () => {
      await p.evaluate(() => {
        contractors.push({ id: 'c-quinn', name: 'Quinn Park', role: 'PS', status: 'active', rate: 40 });
        saveContractors();
        showPanel('contractors', document.querySelector('.nb[onclick*="\'contractors\'"]'));
        renderContractors();
      });
      await p.waitForTimeout(300);
      ok(await inList('Quinn Park') && await inList('Carla Mendes'), 'fixture: both contractors are on the tab');
      dialogs.length = 0;
      await p.click('button.del[onclick="deleteContractor(\'c-quinn\')"]');
      await p.waitForTimeout(300);
      const pinShown = await p.evaluate(() => document.getElementById('dir-delete-pin-modal').checkVisibility());
      ok(pinShown, '⚠⚠ the ✕ asks for the manager PIN — it was a bare confirm');
      eq(dialogs, [], 'and no confirm() any more');
      has(await p.textContent('#dir-delete-sub'), 'Quinn Park', 'the dialog names who is being deleted');
      await p.fill('#dir-delete-pin-input', '1111');
      await p.waitForTimeout(200);
      has(await p.textContent('#dir-delete-pin-fb'), 'Incorrect PIN', 'a wrong PIN is refused');
      ok(await inList('Quinn Park'), 'and nothing is deleted');
      await p.fill('#dir-delete-pin-input', '3010');
      await p.waitForTimeout(300);
      ok(!(await inList('Quinn Park')), 'the manager PIN deletes a contractor named on no job');
      ok(!(await p.evaluate(() => document.getElementById('dir-delete-pin-modal').checkVisibility())), 'and the dialog closes');
      dialogs.length = 0;
      await p.click('button.del[onclick="deleteContractor(\'c-carla\')"]');
      await p.waitForTimeout(300);
      ok(dialogs.length === 1 && /Inactive/.test(dialogs[0]) && /Clara Diaz/.test(dialogs[0]),
         '⚠⚠ Carla, the concierge on Clara Diaz, is refused and told to set her Inactive (' + (dialogs[0] || '').slice(0, 90) + '…)');
      ok(!(await p.evaluate(() => document.getElementById('dir-delete-pin-modal').checkVisibility())), 'no PIN is asked for a delete that cannot happen');
      ok(await inList('Carla Mendes'), 'and she is still on the tab');
    });

    // ── D. a name that is not HTML ───────────────────────────────────────────
    await section('D. a name with a quote, a tag and an ampersand is text', async () => {
      await p.click('button[onclick="showAddContractor()"]');
      await p.waitForTimeout(200);
      await p.fill('#c-firstname', 'O\'Hara <b>&');
      await p.fill('#c-lastname', '"Sons"');
      await p.fill('#c-rate', '55');
      await p.click('#add-contractor-card button[onclick="saveContractor()"]');
      await p.waitForTimeout(300);
      const NAME = 'O\'Hara <b>& "Sons"';
      const fb = await p.evaluate(() => { const f = document.getElementById('c-fb'); return { text: f.textContent, bold: f.querySelectorAll('b').length }; });
      has(fb.text, NAME + ' added.', 'the notice shows the name as typed');
      eq(fb.bold, 0, '⚠ and renders no markup out of it');
      ok(await inList(NAME), 'the card shows it as text');
      const sel = await p.evaluate((n) => {
        showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]'));
        const s = document.getElementById('i-tc');
        const o = Array.from(s.options).filter((x) => x.textContent === n)[0];
        s.value = n;
        return { option: !!o, value: o ? o.value : null, held: s.value };
      }, NAME);
      ok(sel.option, 'the intake concierge select lists the name');
      eq(sel.value, NAME, '⚠⚠ the option\'s value is the whole name — a double quote used to cut it short');
      eq(sel.held, NAME, 'and the select can hold that person');
    });

    // ── E. a split at 3,000 lines ────────────────────────────────────────────
    await section('E. a photo split repaints in place', async () => {
      await p.evaluate(() => {
        jobs.unshift({ id: 4305, hvlId: 'HVL-2609-E435', name: 'Evelyn Park', svc: 'cleanout', addr: '5 Lake Trl', tc: 'Anthony Graziano',
          status: 'active', won: true, approved: true, executor: 'Sam Park', executorRole: 'Personal Representative', matterType: 'trust' });
        const refs = [];
        for (let i = 0; i < 3000; i++) {
          refs.push({ stableId: 'e' + i, roomIdx: i % 30, label: 'inventory', collId: null, seq: 1, filename: 'e' + i + '.jpg',
            driveFileUrl: 'https://drive.google.com/file/d/f' + i + '/view', driveFileId: 'f' + i, status: 'uploaded', ts: Date.parse('2026-09-20T12:00:00Z') + i,
            objectName: i % 3 ? 'Item ' + i : '', category: 'General/Household', disposition: i % 5 ? '' : 'Keep', itemNo: i + 1 });
        }
        _photoRefs[4305] = refs; savePhotoRefs(4305);
        setCurrentJob(4305);
        window.__renders = 0;
        const real = window.renderInventoryTab;
        window.renderInventoryTab = function () { window.__renders++; return real.apply(this, arguments); };
      });
      await p.click('.nb[onclick*="\'inventory\'"]');
      await p.waitForTimeout(1500);
      const shown = await p.evaluate(() => ({ job: document.getElementById('inv-job').value, rows: document.querySelectorAll('[id^="inv-row-"]').length }));
      eq(shown.job, '4305', 'fixture: the desk is on the 3,000-line job');
      ok(shown.rows === 3000, 'fixture: every line is drawn (' + shown.rows + ')');
      await p.click('#inv-row-e7 button[onclick="_invToggleOpen(\'e7\')"]');
      await p.waitForTimeout(1500);
      const beforeSplit = await p.evaluate(() => {
        const other = document.getElementById('inv-row-e2999'); other.__p14mark = 1;
        window.__renders = 0;
        return { panel: !!document.querySelector('#inv-row-e7 button[onclick="invSplitItemClick(4305,\'e7\')"]') };
      });
      ok(beforeSplit.panel, 'fixture: the open row offers "Another item in this photo"');
      const t0 = Date.now();
      await p.click('#inv-row-e7 button[onclick="invSplitItemClick(4305,\'e7\')"]');
      const clickMs = Date.now() - t0;
      const after = await p.evaluate(() => {
        const refs = _photoRefs[4305], n = refs[refs.length - 1];
        const el = document.getElementById('inv-row-' + n.stableId);
        const src = document.getElementById('inv-row-e7');
        return { renders: window.__renders, derived: n.derivedFrom, newShown: !!(el && el.checkVisibility()),
          afterSource: !!(src && el && (src.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
          survived: document.getElementById('inv-row-e2999').__p14mark === 1,
          sibling: (src ? src.textContent : '').indexOf('1 of 2 in this photo') >= 0,
          rows: document.querySelectorAll('[id^="inv-row-"]').length };
      });
      eq(after.derived, 'e7', 'fixture: the new line was split off e7');
      eq(after.renders, 0, '⚠⚠ no full-tab render');
      ok(after.newShown, 'the new line is on screen');
      ok(after.afterSource, 'below the photograph it came from');
      ok(after.sibling, 'and the source row now says 1 of 2 in this photo');
      ok(after.survived, '⚠ an unrelated row is the same element — the tab was not rebuilt under the desk');
      eq(after.rows, 3001, 'one row more, and only one');
      // Timed in the page, layout included: the split against a full render of the same tab.
      const timing = await p.evaluate(() => {
        const t = (f) => { const a = performance.now(); f(); void document.body.offsetHeight; return Math.round(performance.now() - a); };
        const split = t(() => document.querySelector('#inv-row-e7 button[onclick="invSplitItemClick(4305,\'e7\')"]').click());
        const full = t(() => renderInventoryTab());
        return { split, full, renders: window.__renders };
      });
      console.log('  timing at 3,000 lines: split ' + timing.split + ' ms (click to painted, via Playwright ' + clickMs + ' ms); full render ' + timing.full + ' ms');
      ok(timing.split < timing.full, '⚠ the split costs less than the render it replaced (' + timing.split + ' vs ' + timing.full + ' ms)');
    });

    // ── F. the Home Prep final ───────────────────────────────────────────────
    await section('F. a Home Prep final says what its total is made of', async () => {
      await p.evaluate(() => {
        const iso = '2026-09-25', ts = '2026-09-25T14:00:00.000Z';
        const mk = (id, name, hrs) => {
          jobs.unshift({ id, hvlId: 'HVL-2609-F' + id, name, svc: 'prep', addr: id + ' Seaspray Ave', tc: 'Anthony Graziano',
            start: '2026-09-20', walkthrough: '2026-09-01', created: 'Sep 1, 2026', status: 'closed', won: true, wonAt: '2026-09-10',
            wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, estimateSentDate: 'September 9, 2026', agrApproved: true,
            agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSigned: true, depositReceived: true, depositReceivedAt: '2026-09-12',
            activatedOn: '2026-09-20', deliveredOn: iso, deliveredBy: 'Anthony Graziano',
            payments: [{ uid: id + 'a', stage: 'deposit', amount: paymentSplit(3000 + hrs * 150).deposit, date: '2026-09-12', method: 'wire', clearedOn: '2026-09-12' }],
            docState: { estimate: { sentAt: ts }, agreement: { sentAt: ts, sig: { signedBy: name, signedOn: '2026-09-11', how: 'wet', recordedBy: 'Anthony Graziano', provider: 'manual' } },
                        'invoice:deposit': { sentAt: ts }, 'invoice:midpoint': { sentAt: ts } } });
          estimateStore[id] = { estimate: { jobId: id, svc: 'prep', rooms: [], prepEnabled: true, totTC: hrs, totPS: 0, tcRate: 150, psRate: 100,
            tcFee: hrs * 150, psFee: 0, declutterTCHrs: hrs, prepItems: [{ type: 'Painting', cost: 10000, lid: 'p' }], prepCost: 10000, prepFee: 3000,
            havellinTotal: 3000 + hrs * 150 }, approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 8, 2026', savedAt: Date.parse('2026-09-08T13:00:00Z') };
          if (hrs) jobLogs[id] = [{ id: 1, date: '2026-09-24', activity: 'declutter', members: [{ name: 'Anthony Graziano', role: 'TC', hours: 6 }] }];
        };
        mk(4306, 'Fiona Grant', 8); mk(4307, 'Gus Hale', 0);
        saveJobs();
      });
      // ⚠ The viewer is emptied first: a View that is refused leaves the LAST document in it, and the fee-only
      // heading is a prefix of the other one.
      const viewFinal = async (id) => {
        await toDash(id);
        await p.evaluate(() => { const m = document.getElementById('doc-viewer-body'); if (m) m.innerHTML = ''; });
        await p.click('#client-dashboard-view .jt-next .jt-doc-acts button:has-text("View final invoice")');
        await p.waitForTimeout(600);
        const t = await p.evaluate(() => { const m = document.getElementById('doc-viewer-body'); return m ? m.textContent.replace(/\s+/g, ' ') : ''; });
        await p.evaluate(() => { if (typeof closeDocViewer === 'function') closeDocViewer(); });
        return t;
      };
      const withHrs = await viewFinal(4306);
      has(withHrs, 'Fiona Grant', 'fixture: the viewer holds this job\'s final');
      // RESTATED 2026-10-01 (P17, Anthony's answer 5): the fee is the Home Sale Preparation Fee; this read "site management fee".
      has(withHrs, 'Services total (Home Sale Preparation Fee on actual vendor spend + logged concierge hours)', '⚠⚠ with concierge hours logged: the fee and the hours');
      lacks(withHrs, 'logged hours + actual fees', 'not the hourly heading');
      const feeOnly = await viewFinal(4307);
      has(feeOnly, 'Gus Hale', 'fixture: and this one\'s');
      has(feeOnly, 'Services total (Home Sale Preparation Fee on actual vendor spend)', '⚠⚠ with none logged: the fee alone');
      lacks(feeOnly, 'concierge hours)', 'and no hours claimed');
      const hourly = await viewFinal(4301);
      has(hourly, 'Actual Havellin services total (logged hours + actual fees)', 'an Estate Settlement final keeps its heading');
    });

    // ── G. layout ────────────────────────────────────────────────────────────
    await section('G. overflow and errors', async () => {
      await toDash(4301);
      for (const w of [1440, 390]) {
        await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300);
        const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(o <= 0, 'no horizontal overflow on the dashboard at ' + w + 'px (' + o + ')');
      }
      await p.click('.nb[onclick*="\'inventory\'"]').catch(() => {});
      await p.evaluate(() => { setCurrentJob(4305); showPanel('inventory', document.querySelector('.nb[onclick*="\'inventory\'"]')); });
      await p.waitForTimeout(1200);
      const o390 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(o390 <= 0, 'no horizontal overflow on the desk at 390px after the split (' + o390 + ')');
      eq(errs, [], 'no page errors');
    });

  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
    console.log(pass + ' passed, ' + fail + ' failed');
  }
})();
