// Step 18 — a finished job's documents (2026-09-23). Drives the REAL Client Dashboard on a job
// with every milestone recorded, the shape of Anthony's screenshot: a Home Prep job, $14,250, the
// final paid.
//
// Anthony first asked for the final invoice to be added to the links under the timeline, then —
// told that meant taking it out of the band — reversed it: *"actually, i like the big [buttons]
// with view final invoice, etc. dont' get rid of those … the big buttons are always the most
// current stage."* So this pins the layout he confirmed: the final invoice in the band's big
// buttons, the four documents before it in the strip, nothing on screen twice. It also pins the
// one real defect in that screenshot: the Approved step read "September 22, 2026" beside seven
// steps reading "Sep 22, 2026".
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step18.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const dlg = []; p.on('dialog', async (d) => { dlg.push(d.message()); await d.dismiss(); });
  await p.goto(APP); await p.waitForTimeout(1500);

  await p.evaluate(() => {
    const iso = '2026-09-22', ts = '2026-09-22T14:00:00.000Z';
    // Filed on send, the way `docAction(...,'send')` files every document.
    const filed = (k) => ({ draftedAt: ts, sentAt: ts, sentBy: 'Anthony Graziano', provider: 'gmail',
                            filedAt: ts, filedUrl: 'https://drive.google.com/file/d/' + k + '/view' });
    const job = { id: 931, hvlId: 'HVL-2609-T931', name: 'Margaret Whitfield', fname: 'Margaret', svc: 'prep',
      addr: '231 Seaspray Ave', city: 'Palm Beach', email: 'margaret@example.com', phone: '(561) 555-0142',
      start: iso, walkthrough: '2026-09-25', created: 'Sep 22, 2026', status: 'closed',
      won: true, wonAt: iso, wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true,
      // ⚠ Both LONG FORM, because that is what markEstimateSent and checkPin write.
      estimateSentDate: 'September 22, 2026',
      agrApproved: true, agrApprovedBy: 'Anthony Graziano', agrSent: true, agrSentAt: 'September 22, 2026', agrSentBy: 'Anthony Graziano',
      agrSigned: true, depositReceived: true, depositReceivedAt: iso,
      deliveredOn: iso, deliveredBy: 'Anthony Graziano', activatedOn: iso,
      payments: [{ id: 1, uid: 'p931a', stage: 'deposit', amount: 7125, date: iso, method: 'wire', clearedOn: iso },
                 { id: 2, uid: 'p931b', stage: 'midpoint', amount: 3563, date: iso, method: 'wire', clearedOn: iso },
                 { id: 3, uid: 'p931c', stage: 'final', amount: 3562, date: iso, method: 'wire', clearedOn: iso }],
      docState: { estimate: filed('e'), agreement: Object.assign(filed('a'),
                    { sig: { signedBy: 'Margaret Whitfield', signedOn: iso, how: 'wet', recordedBy: 'Anthony Graziano', provider: 'manual' } }),
                  'invoice:deposit': filed('d'), 'invoice:midpoint': filed('m'), 'invoice:final': filed('f') } };
    jobs.unshift(job);
    estimateStore[931] = { estimate: { jobId: 931, svc: 'prep', rooms: [], prepEnabled: true, totTC: 0, totPS: 0,
      prepItems: [{ type: 'Painting', cost: 30000, lid: 'a' }, { type: 'Cleaning', cost: 10000, lid: 'b' },
                  { type: 'Landscaping', cost: 7500, lid: 'c' }],
      havellinTotal: 14250, prepFee: 14250 },
      approved: true, submitted: true, approvedBy: 'Anthony Graziano',
      approvedAt: 'September 22, 2026', savedAt: Date.parse('2026-09-22T13:00:00Z') };
    saveJobs();
    showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]'));
    openClientDashboard(931);
  });
  await p.waitForTimeout(400);

  const read = () => p.evaluate(() => {
    const dv = document.getElementById('client-dashboard-view');
    const band = dv.querySelector('.jt-next');
    const big = band ? Array.from(band.querySelectorAll('.jt-doc-acts button')) : [];
    const strip = Array.from(dv.querySelectorAll('.jt-quick button'));
    const clicks = Array.from(dv.querySelectorAll('[onclick]')).map((x) => x.getAttribute('onclick'));
    const steps = Array.from(dv.querySelectorAll('.jt-track .jt-step')).map((s) => ({
      lbl: (s.querySelector('.jt-slbl') || {}).textContent || '',
      meta: (s.querySelector('.jt-smeta') || {}).textContent || '',
      done: s.classList.contains('jt-done') }));
    const trackShown = getComputedStyle(dv.querySelector('.jt-track')).display !== 'none';
    const railShown = getComputedStyle(dv.querySelector('.jt-rail')).display !== 'none';
    const rail = Array.from(dv.querySelectorAll('.jt-rail .jt-row')).map((r) => r.textContent.replace(/\s+/g, ' ').trim());
    return {
      done: !!(band && band.classList.contains('jt-next-done')),
      lbl: band ? band.querySelector('.jt-next-lbl').textContent.trim() : '',
      head: band && band.querySelector('.jt-doc-hd') ? band.querySelector('.jt-doc-hd').textContent.trim() : '',
      big: big.map((x) => x.textContent.trim()), bigCalls: big.map((x) => x.getAttribute('onclick')),
      bigCls: big.map((x) => x.className),
      strip: strip.map((x) => x.textContent.trim()), stripCalls: strip.map((x) => x.getAttribute('onclick')),
      dupes: clicks.length - new Set(clicks).size, steps, trackShown, railShown, rail,
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });

  console.log('\n=== 1440: A FINISHED JOB ===');
  let r = await read();
  ok(r.done, 'the band is the Complete band');
  eq(r.lbl, 'Complete', 'and says so');
  ok(r.steps.length === 16 && r.steps.every((s) => s.done), 'every node on the track is done (' + r.steps.length + ')');
  eq(r.head, 'Last sent — Invoice — Final', '⚠⚠ the big buttons are the final invoice — the most current stage');
  eq(r.big.map((t) => t.replace(/^\S+\s/, '')), ['View final invoice', 'Print final invoice', 'Filed copy'],
     'View · Print · Filed copy, as big buttons');
  ok(r.bigCls.every((c) => /\bjt-btn\b/.test(c)), 'drawn as the band\'s own buttons, not strip links');
  ok(r.bigCalls.every((c) => /final/.test(c)), 'every one of them acts on the final invoice');
  eq(r.strip.map((t) => t.replace(/^\S+\s/, '')),
     ['View estimate', 'Print estimate', 'Filed copy', 'View packet', 'Print packet', 'Filed copy',
      'View deposit invoice', 'Print deposit invoice', 'Filed copy',
      'View midpoint invoice', 'Print midpoint invoice', 'Filed copy'],
     'the strip is the four documents before it, in lifecycle order');
  ok(r.stripCalls.every((c) => !/final/.test(c)), '⚠ and does not repeat the final invoice');
  eq(r.dupes, 0, '⚠⚠ no control on the dashboard renders twice');

  console.log('\n=== THE DATES ON THE TRACK ===');
  const step = (l) => r.steps.filter((s) => s.lbl === l)[0] || {};
  eq(step('Approved').meta, 'Sep 22, 2026', '⚠⚠ Approved reads like every other date — it read "September 22, 2026"');
  eq(step('Intake').meta, 'Sep 22, 2026', 'Intake');
  eq(step('Sent').meta, 'Sep 22, 2026', 'Sent');
  eq(step('Packet sent').meta, 'Sep 22, 2026', 'Packet sent');
  const dates = r.steps.map((s) => s.meta).filter((m) => /\d{4}/.test(m) && !/^\$/.test(m));
  ok(dates.length >= 6, 'the track carries dates on most steps (' + dates.length + ')');
  ok(dates.every((d) => /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(d)), '⚠ every date on the track is one format (' + dates.join(' | ') + ')');
  eq(r.overflow, 0, 'no horizontal overflow at 1440');

  console.log('\n=== THE BIG BUTTON WORKS ===');
  await p.evaluate(() => {
    const bt = document.querySelector('#client-dashboard-view .jt-next .jt-doc-acts button');
    bt.click();
  });
  await p.waitForTimeout(600);
  const v = await p.evaluate(() => {
    const m = document.getElementById('doc-viewer-modal');
    const shown = m ? getComputedStyle(m).display !== 'none' : false;
    const t = (id) => (document.getElementById(id) || {}).textContent || '';
    return { shown, txt: (t('doc-viewer-title') + ' · ' + t('doc-viewer-sub')).replace(/\s+/g, ' ').trim(),
             body: t('doc-viewer-body').length };
  });
  ok(v.shown, 'View final invoice opens the document viewer' + (dlg.length ? ' (dialogs: ' + dlg.join(' | ') + ')' : ''));
  ok(/final/i.test(v.txt), 'titled as the final invoice (' + v.txt + ')');
  ok(v.body > 500, 'with the invoice rendered in it (' + v.body + ' chars)');
  await p.evaluate(() => { if (typeof closeDocViewer === 'function') closeDocViewer(); });

  console.log('\n=== 390: THE SAME JOB ON A PHONE ===');
  await p.setViewportSize({ width: 390, height: 900 });
  await p.evaluate(() => openClientDashboard(931));
  await p.waitForTimeout(300);
  r = await read();
  ok(!r.trackShown && r.railShown, 'the vertical rail replaces the track');
  eq(r.head, 'Last sent — Invoice — Final', 'the big buttons still carry the final invoice');
  eq(r.strip.length, 12, 'and the strip still carries the four documents before it');
  const apRow = r.rail.filter((t) => /^Estimate approved/.test(t))[0] || '';
  ok(/Sep 22, 2026/.test(apRow) && !/September/.test(apRow), 'the rail\'s approval row is short form too (' + apRow + ')');
  eq(r.dupes, 0, 'nothing renders twice');
  eq(r.overflow, 0, 'no horizontal overflow at 390');

  eq(errs, [], 'no page errors');
  await b.close();
  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
