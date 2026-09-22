// CLOSE-OUT, THE BAND ON BOTH JOB TABS, AND A PREP JOB'S DESK (2026-09-22).
//
// Anthony, off Job Admin & Inv on a Home Prep job: everything below the desk paperwork is
// immaterial to prep; every vendor used should be rated, and mandatorily; close out with a
// Google review request by email; the client header and "the brown band with actions and the
// deposit & start timeline" on the Job Plan AND on Job Admin, so the midpoint invoice is
// reminded where the work is done.
//
// ⚠ ONLY THE BROWSER PROVES THE WRONG-JOB HALF. A dashboard opened on one client keeps its
//   inline display:block when you leave for another tab; the unit suite drives _jobBandHost
//   against a stub, and this drives the real nav.
// ⚠ The viewport option is `viewport`, NOT `viewportSize`.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(a === b, m + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');
const APP = process.env.APP || 'file:///home/user/app/havellin.html';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const dlg = []; p.on('dialog', async d => { dlg.push(d.message()); await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);

  // Two clients: a prep job worked through to the midpoint, and a second client whose dashboard
  // is left open behind the job tabs — the wrong-job trap.
  const ids = await p.evaluate(() => {
    const today = new Date(); const iso = today.toISOString().slice(0, 10);
    const mk = (id, name, svc) => ({ id, hvlId: 'HVL-2609-T' + id, name, fname: name.split(' ')[0], svc,
      addr: '231 Seaspray Ave', city: 'Palm Beach', email: name.split(' ')[0].toLowerCase() + '@example.com',
      phone: '(561) 555-0142', start: iso, walkthrough: iso, created: iso, status: 'active', won: true,
      approved: true, estimateSentDate: iso, agrApproved: true, agrSent: true, agrSigned: true, depositReceived: true,
      payments: [{ id: 1, uid: 'p' + id, stage: 'deposit', amount: 7125, date: iso, method: 'wire', clearedOn: iso }],
      docState: { 'invoice:deposit': { sentAt: today.toISOString() } } });
    const a = mk(901, 'Margaret Whitfield', 'prep');
    a.prepSourcing = {
      La: { vendorId: 'Ace Painting', vendorName: 'Ace Painting', status: 'Confirmed' },
      Lb: { vendorId: 'Sparkle Cleaning', vendorName: 'Sparkle Cleaning', status: 'Confirmed' },
      Lc: { vendorId: 'Green Thumb', vendorName: 'Green Thumb', status: 'Quote requested' },
    };
    const c = mk(902, 'Tripp Butler', 'home_cleanout');
    jobs.unshift(c); jobs.unshift(a);
    const est = { jobId: 901, svc: 'prep', rooms: [], prepEnabled: true, totTC: 0, totPS: 0,
      prepItems: [{ type: 'Painting', cost: 18000, lid: 'a' }, { type: 'Cleaning', cost: 6000, lid: 'b' },
                  { type: 'Landscaping', cost: 9000, lid: 'c' }],
      havellinTotal: 14250, prepFee: 14250 };
    estimateStore[901] = { estimate: est, approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
    estimateStore[902] = { estimate: { jobId: 902, svc: 'home_cleanout', rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }],
      totTC: 20, totPS: 30, havellinTotal: 6000 }, approved: true, submitted: true, savedAt: Date.now() };
    saveJobs();
    return [901, 902];
  });

  // Leave Tripp Butler's dashboard open behind everything.
  await p.evaluate(() => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(902); });
  await p.waitForTimeout(300);

  // ── THE JOB PLAN ─────────────────────────────────────────────────────────────
  await p.click('.nb:has-text("Job Plan")'); await p.waitForTimeout(300);
  await p.evaluate(() => { populateLogAndInvSelects(); const s = document.getElementById('plan-job'); s.value = '901'; loadJobPlanTab(); });
  await p.waitForTimeout(500);
  const plan = await p.evaluate(() => {
    const slot = document.getElementById('jband-slot-plan');
    const band = slot && slot.querySelector('.jt-next');
    const track = slot && slot.querySelector('.jt-track');
    const vis = (el) => !!(el && el.offsetParent !== null);
    const co = document.getElementById('closeout-plan-901');
    const hdr = document.getElementById('job-plan-header');
    return {
      bandStep: band ? band.querySelector('.jt-next-step').textContent : '',
      prim: band && band.querySelector('.jt-btn-p') ? band.querySelector('.jt-btn-p').textContent : '',
      nPrim: slot ? slot.querySelectorAll('.jt-btn-p').length : -1,
      trackVis: vis(track),
      groups: track ? Array.from(track.querySelectorAll('.jt-sgrp')).map(e => e.textContent).filter(Boolean) : [],
      steps: track ? Array.from(track.querySelectorAll('.jt-slbl')).map(e => e.textContent) : [],
      bandAboveContent: slot && document.getElementById('job-plan-content') ?
        !!(slot.compareDocumentPosition(document.getElementById('job-plan-content')) & 4) : false,
      bandBelowHeader: !!(hdr.compareDocumentPosition(slot) & 4),
      co: co ? co.textContent : '',
      reviewDisabled: co ? !!co.querySelector('button[disabled]') : null,
      vendorsListed: co ? Array.from(co.querySelectorAll('.co-vendor strong')).map(e => e.textContent) : [],
    };
  });
  eq(plan.bandStep, 'Midpoint invoice sent', 'the Job Plan band names the midpoint invoice as the next step');
  ok(/Send midpoint invoice/.test(plan.prim), 'with Send midpoint invoice as its one filled button (' + plan.prim + ')');
  eq(plan.nPrim, 1, 'exactly one filled button in the band');
  ok(plan.trackVis, 'the timeline track shows at 1440');
  ok(/^deposit & start$/i.test(plan.groups[0] || ''), 'the leg starts at DEPOSIT & START (' + plan.groups.join(' / ') + ')');
  ok(plan.steps.indexOf('Intake') < 0 && plan.steps.length >= 6, 'and only the second leg is drawn (' + plan.steps.length + ' steps)');
  ok(plan.bandBelowHeader && plan.bandAboveContent, 'the band sits under the client header, above the plan');
  ok(/Satisfaction call/.test(plan.co) && /Google review/.test(plan.co) && /Referral ask/.test(plan.co) && /Vendor scorecard/.test(plan.co),
    'the prep Job Plan carries the whole close-out card');
  eq(plan.reviewDisabled, true, 'the review button is disabled before the satisfaction call');
  eq(JSON.stringify(plan.vendorsListed), JSON.stringify(['Ace Painting', 'Sparkle Cleaning']), 'the scorecard lists the confirmed prep vendors, and not the unconfirmed one');

  // The wrong-job trap: a band button on THIS tab resolves THIS client, not the dashboard left open.
  const who = await p.evaluate(() => ({ host: _jobBandHost(), agr: (_agrJob() || {}).name, fb: _dashFbTarget('agr-fb') }));
  eq(who.host.kind, 'plan', 'on the Job Plan, the band host is the Job Plan');
  eq(who.agr, 'Margaret Whitfield', '⚠⚠ and the job a payment would be recorded against is this one — not Tripp Butler\'s dashboard left open');
  eq(who.fb, 'jband-fb-plan', 'and messages land on this tab');

  // Tick the call on the real checkbox — the review button unlocks.
  await p.click('#closeout-plan-901 input[type=checkbox]'); await p.waitForTimeout(200);
  const unlocked = await p.evaluate(() => {
    const co = document.getElementById('closeout-plan-901');
    const btn = Array.from(co.querySelectorAll('button')).find(b => /Draft review request/.test(b.textContent));
    return { disabled: btn ? btn.disabled : null, onclick: btn ? btn.getAttribute('onclick') : '' };
  });
  eq(unlocked.disabled, false, 'ticking the satisfaction call unlocks the review request');
  eq(unlocked.onclick, 'draftReviewRequest(901)', 'which drafts the review email for this job');

  // Close the job with the vendors unrated — refused, naming them.
  dlg.length = 0;
  await p.evaluate(() => activateOrCycle(901));
  await p.waitForTimeout(200);
  ok(dlg.length === 1 && /Cannot close the job yet/.test(dlg[0]) && /Ace Painting/.test(dlg[0]), 'closing with vendors unrated is refused, naming them');
  eq(await p.evaluate(() => jobs.find(j => j.id === 901).status), 'active', 'and the job stays active');

  // Rate them by clicking the real stars.
  // Two real clicks on the rendered stars (querySelector, because the rows share a parent with the
  // step's heading, so :nth-of-type counts the wrong divs).
  await p.evaluate(() => document.querySelectorAll('#closeout-plan-901 .co-vendor')[0].querySelectorAll('.co-star')[4].click());
  await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelectorAll('#closeout-plan-901 .co-vendor')[1].querySelectorAll('.co-star')[3].click());
  await p.waitForTimeout(250);
  const rated = await p.evaluate(() => ({ r: jobs.find(j => j.id === 901).vendorRatings, txt: document.getElementById('closeout-plan-901').textContent }));
  eq(rated.r['Ace Painting'].rating, 5, 'a star click records the rating');
  ok(/2 of 2 rated/.test(rated.txt), 'the scorecard reads 2 of 2 rated');
  ok(/not yet saved to the directory|Saved to the Vendor Directory|Saving to the Vendor Directory/.test(rated.txt), 'each row says whether it reached the directory');

  // ── JOB ADMIN & INV on the same prep job ─────────────────────────────────────
  await p.click('.nb:has-text("Job Admin")'); await p.waitForTimeout(500);
  const admin = await p.evaluate(() => {
    const c = document.getElementById('inventory-content');
    const t = c.textContent;
    return {
      job: document.getElementById('inv-job').value,
      hdr: !!c.querySelector('.job-hdr') && /Margaret Whitfield/.test(c.querySelector('.job-hdr').textContent) && /Home Prep/.test(c.querySelector('.job-hdr').textContent),
      band: c.querySelector('#jband-slot-admin .jt-next-step') ? c.querySelector('#jband-slot-admin .jt-next-step').textContent : '',
      order: [c.querySelector('.job-hdr'), c.querySelector('#jband-slot-admin'), c.querySelector('.ja-card'), c.querySelector('.co-card')]
        .every((el, i, a) => el && (i === 0 || (a[i - 1].compareDocumentPosition(el) & 4))),
      contents: /Contents Record|Approval Request|Add line item|Appraisers|No items yet/i.test(t),
      rooms: /All rooms cleared/.test(t), hours: /Hours logged/.test(t), donation: /Donation receipts/.test(t),
      jaOpen: !!c.querySelector('.ja-body'),
      host: _jobBandHost().kind, agr: (_agrJob() || {}).name,
      closeoutSat: !!document.querySelector('#closeout-admin-901 input[type=checkbox]:checked'),
    };
  });
  eq(admin.job, '901', 'Job Admin follows the job picked on the Job Plan');
  ok(admin.hdr, 'Job Admin carries the client header — client, service, property');
  eq(admin.band, 'Midpoint invoice sent', 'and the same band, reminding the midpoint invoice');
  ok(admin.order, 'in order: header, band, desk paperwork, close-out');
  eq(admin.contents, false, '⚠⚠ no inventory on a prep job — no Contents Record, Approval Request, line items or appraisers');
  eq(admin.rooms, false, 'no "All rooms cleared — 0 of 0"');
  eq(admin.hours, false, 'no hours line on a fee-only engagement');
  eq(admin.donation, false, 'no donation receipts on a prep job');
  eq(admin.jaOpen, true, 'the desk paperwork opens by default on a prep job');
  eq(admin.host, 'admin', 'the band host is Job Admin');
  eq(admin.agr, 'Margaret Whitfield', 'and the right client');
  eq(admin.closeoutSat, true, 'the call ticked on the Job Plan reads ticked here — one record');

  // Close now that every used vendor is rated.
  dlg.length = 0;
  await p.evaluate(() => activateOrCycle(901)); await p.waitForTimeout(250);
  eq(dlg.length, 0, 'with every used vendor rated, closing raises nothing');
  eq(await p.evaluate(() => jobs.find(j => j.id === 901).status), 'closed', 'and the job closes');

  // A labour job keeps its inventory on the tab, with the close-out beside it.
  await p.evaluate(() => { const s = document.getElementById('inv-job'); s.value = '902'; onInventoryJobChange(); });
  await p.waitForTimeout(400);
  const lab = await p.evaluate(() => {
    const c = document.getElementById('inventory-content');
    return { inv: /Appraisers|Contents Record|No items yet/i.test(c.textContent), co: !!c.querySelector('#closeout-admin-902'),
             band: !!c.querySelector('#jband-slot-admin .jt-next') };
  });
  ok(lab.inv, 'a labour job still has its inventory');
  ok(lab.co && lab.band, 'and gets the band and the close-out too');

  // Overflow, both tabs, both widths.
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    for (const tab of ['plan', 'admin']) {
      await p.evaluate((t) => {
        if (t === 'plan') { document.querySelector('.nb[onclick*="job-plan"]').click(); document.getElementById('plan-job').value = '901'; loadJobPlanTab(); }
        else { document.querySelector('.nb[onclick*="\'inventory\'"]').click(); document.getElementById('inv-job').value = '901'; onInventoryJobChange(); }
      }, tab);
      await p.waitForTimeout(300);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      eq(ov, 0, tab + ' overflow at ' + w);
    }
  }
  const railAt390 = await p.evaluate(() => { const r = document.querySelector('#jband-slot-admin .jt-rail'); return !!(r && r.offsetParent !== null); });
  ok(railAt390, 'at 390 the leg renders as the vertical rail');

  eq(errs.length, 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log('step14: ' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
