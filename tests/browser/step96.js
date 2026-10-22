// Step 96 — the desk's layout (2026-10-22): Job Admin & Inv in the order of an evening at the desk. Anthony, asked
// whether to build the new desk under the feature freeze: "Build all of it now." The job today and Job Admin at the
// top; tonight's items (the work bar, the vehicles still to bring in, the chips, the filter, the rows, the bulk bar)
// open in the middle; four fold bars below them, each one line until opened (Releases & signed papers, Values &
// appraisals, Closing the job, Removed items & snapshots); the summary last, outside every bar.
//
// One part per group of the build, each driving the REAL page on the same two seeded desks: an active probate estate
// (Ashworth) and a living Home Transition (Hale), seeded as the measurement run that planned the build seeded them.
//
//   Part 1 (G1, the fold machinery and the order): the order read off the rendered page; every bar's body in the page;
//   the first row's y at 1440 and 390 against the old desk's on this same seed (estate 3,103 / 5,120 px; living 2,076 /
//   3,447 px, measured on the tree before the build; the planning run's fuller estate read 3,527 / 5,842); a bar shut
//   and opened by a real press of its header, in place, without a redraw; the shut outliving a full redraw pressed
//   through a real filter button; Job Admin's bar and the four bars alike; zero page errors.
//
//   Part 2 (G2, each bar's line and when it opens by itself): the four lines read off the page in their tones; each bar
//   pressed open and shut; an open bar outliving a Reviewed press and a background sheet read; a cold desk saying
//   "loading…" until its manifest is read, then its lines; Releases drawn and opening by itself the moment a line is set to
//   Donate (Anthony's Q2: when a request is owed); Closing open on a closed job and opened behind a refused Close job; the
//   dashboard's Open the desk landing on the Releases card with its bar opened, though the person had shut it.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step96.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const EST = 9601, LIV = 9602, NEW = 9603, DONE = 9604;
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    let hold = null;   // part 2: a promise the sheet's read waits on, to see the desk before its manifest is read
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) { if (hold) await hold; return json({ ok: true, media: sheet }); }
      if (/action=getDriveThumbnails/.test(req.url())) return json({ ok: true, thumbs: {} });
      return json({ ok: true });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(15000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const dialogs = [];
    p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 6000)) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      try { localStorage.setItem('hav_device_user', 'Anthony Graziano'); } catch (e) {}
      window.open = function () { return null; };
    }, SYNC);

    // ── Seed: the two desks the build was measured on ─────────────────────────────────────────────
    sheet = await p.evaluate(([EST, LIV]) => {
      const NOW = Date.now();
      const T_OLD = NOW - 6 * 86400000, T_Y = NOW - 86400000, T_TODAY = NOW - 3 * 3600000;
      vendorDirectory = [
        { _row: 41, vendor_name: 'Kodner Galleries', category: 'Auction House', coi_received: '2026-09-01', coi_expires: '2027-09-01' },
        { _row: 42, vendor_name: 'Goodwill Palm Beach', category: 'Donation Pickup' },
        { _row: 43, vendor_name: 'Palm Beach Estate Buyers', category: 'Estate Buyer' },
        { _row: 44, vendor_name: 'Haul-It Junk Removal', category: 'Junk Removal' },
        { _row: 45, vendor_name: 'Navis Moving', category: 'Movers' }];
      jobs.unshift({ id: EST, hvlId: 'HVL-2610-E960', name: 'Eleanor Ashworth', svc: 'probate', matterType: 'probate', addr: '210 Via Bellaria', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas Ashworth', executorRole: 'Personal Representative', executorEmail: 't.ashworth@example.com', executorPhone: '(561) 555-0101', deathDate: '2026-04-02', executorAuth: 'received',
        coFiduciaries: [{ id: 'cf1', name: 'Nora Ashworth', role: 'Co-Personal Representative', email: 'nora@example.com', phone: '' }],
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-001234', probateCourt: 'Palm Beach County',
        docTier: 'values', gate706: 'yes', status: 'active', won: true, wonAt: '2026-09-25', wonBy: 'Ashley Jerome', approved: true, tc: 'Ashley Jerome', estimateSentDate: '2026-09-24',
        mustFind: 'Father’s pocket watch\nSafe deposit box key', safetyNotes: 'Loose stair rail to the attic.',
        created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, sqft: 4200, beds: 4, baths: 4,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT960', driveSubfolders: { 'Estate Inventory': 'INV960', 'As-Found Record': 'AF960', 'Signed Records': 'SR960' },
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Thomas Ashworth', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'e1', stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }],
        appraisers: [{ id: 501, name: 'Carla Mendes', firm: 'Mendes Fine Art Appraisals', credential: 'ASA', independent: true, effectiveDate: '2026-04-02', reportDate: '', dueDate: '2026-11-05' }],
        beneficiaries: [{ id: 'bn1', name: 'Margaret Ashworth', relationship: 'Daughter', phone: '', email: 'meg@example.com', recordedBy: 'Ashley Jerome', recordedAt: T_OLD }],
        bequests: [{ id: 'bq1', description: 'Grandfather clock in the hall', beneficiaryId: 'bn1', stableIds: ['e07'], recordedBy: 'Ashley Jerome', recordedAt: T_OLD }],
        signedRecords: [{ id: 'sr1', kind: 'approval', ref: 'approval:2026-10-12', stableIds: ['e01', 'e02'], signedBy: 'Thomas Ashworth; Nora Ashworth', signedOn: '2026-10-12', filedAt: T_OLD, filedBy: 'Ashley Jerome', url: 'https://drive.google.com/file/d/s1/view' }],
        invSnapshots: [{ ts: T_OLD, label: 'Before the first sale', valueDate: '2026-04-02', count: 12, totalFMV: 18400, items: [] }] });
      estimateStore[EST] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T_OLD,
        estimate: { jobId: EST, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100,
          days: 8, vendors: [{ type: 'Auction House', name: 'Kodner Galleries', cost: 0 }], prepItems: [], pkgCost: 0,
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Dining Room', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 },
                  { idx: 3, name: 'Primary Bedroom', st: 'in', vol: 3, cplx: 3 }] } };
      const item = (job, id, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 0, seq: 1, status: 'uploaded', category: 'Furniture', disposition: '',
        objectName: '', ts: T_OLD, updatedAt: T_OLD, filename: 'HVL_' + job + '_INV_' + id + '.jpg', driveFileId: 'f-' + id, driveFileUrl: 'https://drive.google.com/file/d/f-' + id + '/view' }, o);
      const E = (id, o) => item(EST, id, o);
      _photoRefs[EST] = [
        E('e01', { itemNo: 1, roomIdx: 0, objectName: 'Harbor scene oil painting', category: 'Art & Décor', fmv: '2400', valSource: 'Auction comps', disposition: 'Auction', channel: 'Kodner Galleries', authBy: 'Thomas Ashworth; Nora Ashworth', approvalDate: '2026-10-12', reviewed: 1, namedBy: 'desk' }),
        E('e02', { itemNo: 2, roomIdx: 1, objectName: 'Sterling flatware service for 12', category: 'Silver & Precious Metal', fmv: '1800', valSource: 'Auction comps', disposition: 'Auction', channel: 'Kodner Galleries', authBy: 'Thomas Ashworth; Nora Ashworth', approvalDate: '2026-10-12', reviewed: 1, namedBy: 'desk' }),
        E('e04', { itemNo: 4, roomIdx: 0, objectName: 'Pair of brass table lamps', category: 'General/Household', fmv: '80', disposition: 'Donate', channel: 'Goodwill Palm Beach', reviewed: 1, namedBy: 'desk' }),
        E('e07', { itemNo: 7, roomIdx: 0, objectName: 'Grandfather clock', category: 'Antiques', fmv: '3500', disposition: 'Distribute', channel: 'Margaret Ashworth', flagBequest: true, needsAppr: true, apprId: 501, reviewed: 1, namedBy: 'desk' }),
        E('e10', { itemNo: 10, roomIdx: 3, objectName: 'Walnut dresser', category: 'Furniture', fmv: '450', disposition: 'Sell', channel: 'Palm Beach Estate Buyers', namedBy: 'agent', reviewed: 0 }),
        E('e18', { itemNo: 18, roomIdx: 2, objectName: 'Stand mixer', category: 'Electronics & Appliances', fmv: '120', disposition: 'Keep', namedBy: 'desk', reviewed: 1 }),
        E('e20', { itemNo: 20, roomIdx: 3, objectName: 'Nightstand', category: 'Furniture', disposition: '', namedBy: 'agent', reviewed: 0, ts: T_Y, updatedAt: T_Y }),
        E('e23', { itemNo: 23, roomIdx: 2, objectName: 'Copper cookware set', category: 'General/Household', disposition: '', namedBy: 'agent', reviewed: 0, ts: T_TODAY, updatedAt: T_TODAY }),
        E('e26', { itemNo: 26, roomIdx: 1, objectName: '', category: '', ts: T_TODAY + 1000, updatedAt: T_TODAY + 1000 }),
        E('e31', { itemNo: 31, roomIdx: 2, objectName: 'Drawer of twist ties', category: 'General/Household', deletedAt: T_Y, removedBy: 'Ashley Jerome', updatedAt: T_Y }),
        E('b01', { label: 'before', roomIdx: 0, objectName: '', category: '' })];
      savePhotoRefs(EST);
      jobs.unshift({ id: LIV, hvlId: 'HVL-2610-T961', name: 'Robert Hale', fname: 'Robert', svc: 'downsizing_move', addr: '44 Sandpiper Ln', city: 'Jupiter', zip: '33458',
        email: 'rhale@example.com', phone: '(561) 555-0144', destAddr: '1200 Harbourside Dr, Apt 4B', destCity: 'Jupiter', destSqft: 1400,
        docTier: '', status: 'active', won: true, wonAt: '2026-09-25', wonBy: 'Ashley Jerome', approved: true, tc: 'Ashley Jerome', sqft: 3100, beds: 3, baths: 2, estimateSentDate: '2026-09-24',
        mustFind: 'Wedding album', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true,
        driveFolder: 'https://drive.google.com/drive/folders/ROOT961', driveSubfolders: { 'Estate Inventory': 'INV961', 'As-Found Record': 'AF961', 'Signed Records': 'SR961' },
        docState: { estimate: { sentAt: '2026-09-24T14:00:00Z' }, agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Robert Hale', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        payments: [{ uid: 'l1', stage: 'deposit', amount: 9000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] });
      estimateStore[LIV] = { approved: true, submitted: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 23, 2026', savedAt: T_OLD,
        estimate: { jobId: LIV, svc: 'downsizing_move', havellinTotal: 18000, fixedPrice: false, totTC: 40, totPS: 80, tcRate: 150, psRate: 100,
          days: 6, vendors: [{ type: 'Movers', name: 'Navis Moving', cost: 4500 }], prepItems: [], pkgCost: 600,
          rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Garage', st: 'in', vol: 3, cplx: 3 }] } };
      const L = (id, o) => item(LIV, id, o);
      _photoRefs[LIV] = [
        L('l01', { itemNo: 1, roomIdx: 0, objectName: 'Leather recliner', disposition: 'Move', reviewed: 1, namedBy: 'desk' }),
        L('l02', { itemNo: 2, roomIdx: 0, objectName: 'Coffee table', disposition: 'Donate', channel: 'Goodwill Palm Beach', reviewed: 1, namedBy: 'desk' }),
        L('l03', { itemNo: 3, roomIdx: 0, objectName: 'Oil landscape painting', category: 'Art & Décor', disposition: 'Sell', channel: 'Kodner Galleries', needsAppr: true, namedBy: 'desk', reviewed: 1 }),
        L('l07', { itemNo: 7, roomIdx: 2, objectName: 'Golf clubs', category: 'Collectibles', disposition: 'Distribute', channel: 'Susan Hale', namedBy: 'agent', reviewed: 0 }),
        L('l12', { itemNo: 12, roomIdx: 2, objectName: 'Lawn mower', category: 'Electronics & Appliances', disposition: '', namedBy: 'agent', reviewed: 0, ts: T_TODAY, updatedAt: T_TODAY }),
        L('l14', { itemNo: 14, roomIdx: 1, objectName: '', category: '', ts: T_TODAY + 1000, updatedAt: T_TODAY + 1000 }),
        L('b11', { label: 'before', roomIdx: 0, objectName: '', category: '' })];
      savePhotoRefs(LIV);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {};
      out[EST] = { items: JSON.parse(localStorage.getItem('hav_media_' + EST) || '[]') };
      out[LIV] = { items: JSON.parse(localStorage.getItem('hav_media_' + LIV) || '[]') };
      return out;
    }, [EST, LIV]);

    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const vis = n === 1 ? await p.locator(sel).isVisible() : false;
      ok(n === 1 && vis, what + ': exactly one control, on screen  [' + sel + ' × ' + n + (n === 1 ? (vis ? '' : ', hidden') : '') + ']');
      if (n === 1 && vis) { await p.click(sel); await p.waitForTimeout(500); }
    };
    // The desk through its own nav button and its own client picker.
    const toDesk = async (id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(cur) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1200); }
      await p.waitForTimeout(500);
    };
    // Every section's top, read off the page (document y).
    const layout = () => p.evaluate(() => {
      const cont = document.getElementById('inventory-content');
      const y = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);
      const q = (s) => cont.querySelector(s);
      const vis = (el) => !!el && (el.checkVisibility ? el.checkVisibility() : !!(el.offsetWidth || el.offsetHeight));
      const bar = (f) => { const w = q('[id^="desk-fold-' + f + '-"]'); const bd = q('[id^="desk-body-' + f + '-"]'); const t = q('[id^="desk-ttl-' + f + '-"]');
        return { y: y(w), shown: vis(w), body: !!bd, open: vis(bd), parentIsTab: !!w && w.parentElement === cont, title: t ? t.textContent : null }; };
      return {
        hdr: y(q('.job-hdr')), band: y(document.getElementById('jband-slot-admin')), sf: y(document.getElementById('sf-host-desk')), ja: y(q('.ja-card')),
        workbar: y(document.getElementById('inv-workbar')), row: y(q('[id^="inv-row-"]')), summary: y(document.getElementById('inv-summary')),
        summaryParentIsTab: (document.getElementById('inv-summary') || {}).parentElement === cont,
        closeoutInClosing: !!(q('[id^="closeout-admin-"]') && q('[id^="closeout-admin-"]').closest('[id^="desk-body-closing-"]')),
        releasesInBar: !!(document.getElementById('inv-releases') && document.getElementById('inv-releases').closest('[id^="desk-body-releases-"]')),
        recordsInBar: !!(document.getElementById('inv-records') && document.getElementById('inv-records').closest('[id^="desk-body-closing-"]')),
        guardrailInBar: !!(document.getElementById('inv-guardrail') && document.getElementById('inv-guardrail').closest('[id^="desk-body-values-"]')),
        releases: bar('releases'), values: bar('values'), closing: bar('closing'), history: bar('history'),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // the outermost elements past the right edge (a table in its own scroller is not one)
        culprits: (function () {
          const W = document.documentElement.clientWidth, out = [];
          cont.querySelectorAll('*').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (!(r.right > W + 1 && r.width > 0) || el.closest('.tbl-scroll')) return;
            const pr = el.parentElement.getBoundingClientRect();
            if (pr.right > W + 1) return;
            out.push({ tag: el.tagName, right: Math.round(r.right), text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) });
          });
          return out;
        })(),
      };
    });

    // ══ PART 1 (G1): the fold machinery and the new order ══════════════════════════════════════════
    console.log('\n## Part 1 · the order, the bars, the press');
    const OLD = { [EST]: { 1440: 3103, 390: 5120 }, [LIV]: { 1440: 2076, 390: 3447 } };   // the desk before this build, this seed
    for (const [id, who] of [[EST, 'the estate'], [LIV, 'the living job']]) {
      await p.setViewportSize({ width: 1440, height: 1000 });
      await toDesk(id);
      await press('#panel-inventory button[onclick="setInvWhen(\'all\')"]', who + ': All, so every line is drawn');
      const L = await layout();
      const seq = [['the client line', L.hdr], ['the band', L.band], ['the must-finds', L.sf], ['Job Admin', L.ja], ['the work bar', L.workbar], ['the first row', L.row],
        ['Releases', L.releases.y], ['Values', L.values.y], ['Closing', L.closing.y]];
      seq.forEach(([what, v]) => ok(v != null, who + ': ' + what + ' is drawn'));
      for (let i = 1; i < seq.length; i++) ok(seq[i - 1][1] < seq[i][1], who + ': ' + seq[i - 1][0] + ' (' + seq[i - 1][1] + ') above ' + seq[i][0] + ' (' + seq[i][1] + ')');
      ok(L.summary > L.closing.y && L.summaryParentIsTab, who + ': the summary is last, outside every bar');
      ['releases', 'values', 'closing', 'history'].forEach((f) => ok(L[f].body && L[f].parentIsTab, who + ': the ' + f + ' bar\'s body is in the page, the bar a child of the tab'));
      // ⚠ RESTATED BY G2 (2026-10-22): each bar opens by its own rule now. Both desks have lines waiting on written approval
      // that no request carried, so Releases opens (Q2); the living job's ⚑ painting has no appraiser linked, so its Values
      // opens; the estate's flagged clock has one linked, so its Values stays shut; neither job is at its close.
      const want = id === EST ? { releases: true, values: false, closing: false } : { releases: true, values: true, closing: false };
      ['releases', 'values', 'closing'].forEach((f) => ok(L[f].shown && L[f].open === want[f], who + ': ' + f + ' is shown, ' + (want[f] ? 'open' : 'shut') + ' by its rule'));
      ok(L.closeoutInClosing, who + ': the close-out card is in Closing the job');
      ok(L.recordsInBar && L.guardrailInBar, who + ': the close-out papers and the guardrail sit in their bars');
      ok(L.row < OLD[id][1440], who + ': ⚠ the first row is higher up the page at 1440 (' + L.row + ' px, was ' + OLD[id][1440] + ')');
      eq(L.overflow, 0, who + ': no sideways scroll at 1440');
      if (id === EST) {
        ok(L.releasesInBar, 'the estate: the Releases card is in its bar');
        eq(L.releases.title, 'Releases & signed papers · Beneficiaries & bequests', 'the estate: the Releases title names the bequests card');
        eq(L.closing.title, 'Closing the job: close-out call, vendor ratings, Disposition Ledger, proceeds, donations', 'the estate: Closing names the cards it draws');
        ok(L.history.shown && !L.history.open && L.history.y > L.closing.y, 'the estate: Removed items & snapshots is drawn last of the four, shut');
      } else {
        eq(L.releases.title, 'Releases & signed papers', 'the living job: no bequests named');
        has(L.closing.title, 'Contents Record', 'the living job: Closing names the Contents Record');
        ok(!L.history.shown, 'the living job: nothing removed and no snapshot, so the history bar is not drawn');
      }
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
      const M = await layout();
      ok(M.row != null && M.row < OLD[id][390], who + ': ⚠ the first row is higher up the page at 390 (' + M.row + ' px, was ' + OLD[id][390] + ')');
      // ⚠ The estate scrolled 109 px sideways at 390 before this build: the guardrail's appraiser picker and a row's chip
      // line, neither of which wraps (the phone group of this build fixes both at the source). The guardrail now sits in a
      // padded bar body, so the same two read further right; what is held here is that NOTHING ELSE overflows.
      const known = /^(— link an appraiser —|bequest to )/;
      const strays = M.culprits.filter((c) => !known.test(c.text));
      eq(strays, [], who + ': no new sideways scroll at 390 (' + M.overflow + ' px, from ' + M.culprits.length + ' known element(s))');
      console.log('    ' + who + ': first row at ' + L.row + ' px (1440) and ' + M.row + ' px (390); was ' + OLD[id][1440] + ' / ' + OLD[id][390]);
    }

    console.log('\n## Part 1 · a bar folds where it stands, and stays as it was left');
    await p.setViewportSize({ width: 1440, height: 1000 });
    await toDesk(EST);
    const HD = (f) => '#desk-hd-' + f + '-' + EST;
    const BODY = (f) => '#desk-body-' + f + '-' + EST;
    // A mark on the work bar's element: a redraw replaces the element and the mark goes with it.
    // ⚠ RESTATED BY G2 (2026-10-22): Closing is shut mid-job now, so the first press opens it and the second shuts it, and
    // each state outlives a full redraw.
    ok(!(await p.locator(BODY('closing')).isVisible()), 'fixture: Closing is shut mid-job');
    ok(await p.evaluate((id) => !!document.querySelector('#desk-body-closing-' + id + ' #inv-records'), EST), 'its cards are in the page, hidden');
    await p.evaluate(() => { document.getElementById('inv-workbar').__mark = 'still here'; });
    await press(HD('closing'), 'the Closing bar\'s header');
    ok(await p.locator(BODY('closing')).isVisible(), 'pressed once: Closing is open');
    eq(await p.evaluate(() => document.getElementById('inv-workbar').__mark), 'still here', '⚠⚠ in place: the tab was not redrawn under the person');
    eq(await p.evaluate((id) => document.getElementById('desk-chev-closing-' + id).textContent, EST), '▾', 'the caret reads open');
    await press('#panel-inventory button[onclick="setInvWhen(\'today\')"]', 'Today (a full redraw)');
    ok(await p.locator(BODY('closing')).isVisible(), '⚠ the redraw drew Closing OPEN, as it was left (mid-job its rule says shut)');
    ok(await p.locator(BODY('releases')).isVisible(), 'and Releases open, as it was');
    await press(HD('closing'), 'the Closing bar\'s header again');
    ok(!(await p.locator(BODY('closing')).isVisible()), 'pressed again: shut');
    eq(await p.evaluate((id) => document.getElementById('desk-chev-closing-' + id).textContent, EST), '▸', 'caret shut');
    await press('#panel-inventory button[onclick="setInvWhen(\'all\')"]', 'All (another full redraw)');
    ok(!(await p.locator(BODY('closing')).isVisible()), '⚠ and the redraw drew it SHUT, as it was left');
    // The keyboard: the header takes focus, and Enter presses it.
    await p.focus(HD('values')); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok(await p.locator(BODY('values')).isVisible(), 'Enter on a focused bar header opens it');
    await p.keyboard.press(' '); await p.waitForTimeout(300);
    ok(!(await p.locator(BODY('values')).isVisible()), 'and Space shuts it again');
    // Another client's desk on the same device keeps its own: shut the estate's Releases by hand; the living job's is open.
    await press(HD('releases'), 'the estate\'s Releases header, to shut it');
    await toDesk(LIV);
    ok(await p.locator('#desk-body-releases-' + LIV).isVisible(), 'per job: the other client\'s Releases is at its own rule, open');
    await toDesk(EST);
    ok(!(await p.locator(BODY('releases')).isVisible()), 'and the estate\'s stays shut as it was left');
    await press(HD('releases'), 'the estate\'s Releases header, to open it again');

    console.log('\n## Part 1 · Job Admin\'s bar and the four bars are one control');
    await toDesk(EST);
    const look = await p.evaluate((id) => {
      const cs = (el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, size: s.fontSize, tt: s.textTransform, h: Math.round(el.getBoundingClientRect().height) }; };
      const ja = document.querySelector('#inventory-content .ja-hd'), bar = document.getElementById('desk-hd-values-' + id);
      const left = (hd, caret, title) => caret.getBoundingClientRect().left < title.getBoundingClientRect().left && caret.getBoundingClientRect().left - hd.getBoundingClientRect().left < 20;
      return { ja: cs(ja), bar: cs(bar), jaCaretLeft: left(ja, ja.children[0], ja.children[1]), barCaretLeft: left(bar, bar.children[0], bar.children[1]),
        jaCount: getComputedStyle(ja.querySelector('.ja-n')).textTransform, stat: getComputedStyle(bar.querySelector('.desk-stat')).textTransform };
    }, EST);
    eq([look.ja.bg, look.ja.size, look.ja.tt], [look.bar.bg, look.bar.size, look.bar.tt], 'Job Admin\'s bar wears the same colour, size and case as the bars');
    ok(Math.abs(look.ja.h - look.bar.h) <= 2, 'and the same height (' + look.ja.h + ' / ' + look.bar.h + ' px)');
    ok(look.jaCaretLeft && look.barCaretLeft, 'both carets on the LEFT of the title');
    eq([look.jaCount, look.stat], ['none', 'none'], 'the count and the line are not shouted in capitals');
    await press('#inventory-content .ja-hd[onclick="toggleJobAdmin(' + EST + ')"]', 'Job Admin\'s header');
    ok(await p.locator('#inventory-content .ja-body').isVisible(), 'Job Admin opens on its own press, as before');
    await press('#inventory-content .ja-hd[onclick="toggleJobAdmin(' + EST + ')"]', 'Job Admin\'s header, to shut it');


    // ══ PART 2 (G2): what each bar says shut, and when it opens by itself ═══════════════════════════
    console.log('\n## Part 2 · each bar\'s line, read off the page');
    await p.setViewportSize({ width: 1440, height: 1000 });
    await toDesk(EST);
    const stat = (f, id) => p.evaluate(([f, id]) => { const el = document.getElementById('desk-stat-' + f + '-' + id); return el ? el.textContent : null; }, [f, id || EST]);
    const tones = (f, id) => p.evaluate(([f, id]) => { const el = document.getElementById('desk-stat-' + f + '-' + id); return el ? [...el.children].map((c) => c.className) : []; }, [f, id || EST]);
    const isOpen = (f, id) => p.locator('#desk-body-' + f + '-' + (id || EST)).isVisible();
    eq(await stat('releases'), '3 items need written approval: send a request · 2 ready to sign out',
      '⚠⚠ Releases: the three lines waiting that no request carried, and the two approved for Kodner Galleries to sign out');
    eq(await tones('releases'), ['desk-st-amber', 'desk-st-amber'], 'both in amber: nothing is signed out to Kodner today');
    eq(await stat('values'), '1 needs an appraisal, each linked · 1 ready to hand to Carla Mendes (under Releases & signed papers) · 1 appraiser',
      'Values: the clock linked to Carla Mendes, her hand-off pointed to the sign-out list');
    eq((await tones('values'))[0], 'desk-st-red', 'in red, as the guardrail is on a Formal estate');
    has(await stat('closing'), 'close-out 0 of 3 done', 'Closing: grey before the close');
    ok((await tones('closing')).every((c) => c === 'desk-st-grey' || c === 'desk-st-amber'), 'never red mid-job');
    eq(await stat('history'), '1 removed · 1 snapshot', 'History: what it holds');
    eq((await tones('history')), ['desk-st-grey', 'desk-st-grey'], 'in grey');
    eq([await isOpen('releases'), await isOpen('values'), await isOpen('closing'), await isOpen('history')], [true, false, false, false],
      'open: Releases (a request is owed); shut: the rest');

    console.log('\n## Part 2 · each bar opened and shut by its header');
    for (const f of ['values', 'closing', 'history', 'releases']) {
      const was = await isOpen(f);
      await press('#desk-hd-' + f + '-' + EST, f + '\'s header');
      eq(await isOpen(f), !was, f + ': flipped');
      await press('#desk-hd-' + f + '-' + EST, f + '\'s header again');
      eq(await isOpen(f), was, f + ': and back');
    }

    console.log('\n## Part 2 · an open bar stays open across a Reviewed press and a sheet refresh');
    await press('#desk-hd-values-' + EST, 'Values\' header');
    ok(await isOpen('values'), 'fixture: Values opened by hand');
    await press('#panel-inventory button[onclick="setInvWhen(\'all\')"]', 'All, so the dresser is drawn');
    ok(await isOpen('values'), 'still open after the filter\'s redraw');
    await press('#inv-row-e10 input[onchange*="_invSetReviewed"]', 'Reviewed on the dresser');
    ok(await p.evaluate((id) => !!(_photoRefs[id].find((r) => r.stableId === 'e10') || {}).reviewed, EST), 'fixture: the line is reviewed');
    ok(await isOpen('values'), '⚠ still open after the redraw the tick made');
    // Another device names a line: the sheet's next read changes the manifest and the tab redraws by itself.
    sheet[EST].items = sheet[EST].items.map((r) => r.stableId === 'e26' ? Object.assign({}, r, { objectName: 'Silver candlesticks', updatedAt: Date.now() + 60000 }) : r);
    await p.evaluate(() => _invRefreshFromCloud());
    ok(await until(async () => (await p.evaluate((id) => (_photoRefs[id].find((r) => r.stableId === 'e26') || {}).objectName, EST)) === 'Silver candlesticks'),
      'fixture: the sheet\'s copy landed');
    ok(await isOpen('values'), '⚠⚠ and a background redraw never shut a bar under the person');

    console.log('\n## Part 2 · Releases opens by itself once a line is decided');
    await p.evaluate(([NEW, DONE]) => {
      const T = Date.now() - 86400000;
      const base = (id, o) => Object.assign({ id, svc: 'downsizing', addr: '5 Oleander Way', city: 'Jupiter', zip: '33458', email: 'c' + id + '@example.com', docTier: '',
        status: 'active', won: true, approved: true, tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05',
        agrApproved: true, agrSent: true, agrSigned: true, driveFolder: 'https://drive.google.com/drive/folders/R' + id,
        driveSubfolders: { 'Estate Inventory': 'I' + id, 'Signed Records': 'S' + id }, docState: {}, payments: [] }, o);
      jobs.unshift(base(NEW, { hvlId: 'HVL-2610-N963', name: 'Dorothy Pratt' }));
      jobs.unshift(base(DONE, { hvlId: 'HVL-2610-D964', name: 'Walter Crane', status: 'closed', deliveredOn: '2026-10-20' }));
      [NEW, DONE].forEach((id) => {
        estimateStore[id] = { approved: true, submitted: true, estimate: { jobId: id, svc: 'downsizing', havellinTotal: 9000, rooms: [{ idx: 0, name: 'Den', st: 'in', vol: 3, cplx: 3 }], vendors: [] } };
        _photoRefs[id] = ['n1', 'n2'].map((s, i) => ({ stableId: s, label: 'inventory', roomIdx: 0, seq: i + 1, itemNo: i + 1, status: 'uploaded', category: 'Furniture',
          objectName: i ? 'Bookcase' : 'Armchair', disposition: '', ts: T, updatedAt: T, filename: 'x' + s + '.jpg', driveFileId: 'f' + s }));
        savePhotoRefs(id);
      });
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
    }, [NEW, DONE]);
    sheet[NEW] = { items: await p.evaluate((id) => _photoRefs[id], NEW) };
    sheet[DONE] = { items: await p.evaluate((id) => _photoRefs[id], DONE) };
    // The sheet holds its answer back, so the desk is seen as a cold device sees it first.
    let release; hold = new Promise((res) => { release = res; });
    await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(600);
    await p.selectOption('#inv-job', String(NEW)); await p.waitForTimeout(700);
    eq([await stat('values', NEW), await stat('closing', NEW)], ['loading…', 'loading…'], '⚠⚠ before the manifest is read: "loading…", never a ✓');
    release(); hold = null;
    ok(await until(async () => (await stat('values', NEW)) !== 'loading…'), 'the read lands, and the lines are drawn without a press');
    eq(await stat('values', NEW), '✓ nothing needs an appraisal · no appraisers yet', 'Values, read');
    eq(await p.evaluate((id) => { const w = document.getElementById('desk-fold-releases-' + id); return w && getComputedStyle(w).display; }, NEW), 'none',
      'nothing leaving yet: the Releases bar is not drawn');
    await press('#panel-inventory button[onclick="setInvWhen(\'all\')"]', 'All');
    await p.selectOption('#inv-row-n1 select[onchange*="\'disposition\'"]', 'Donate'); await p.waitForTimeout(700);
    ok(await isOpen('releases', NEW), '⚠⚠ the armchair set to Donate: the Releases bar is drawn, open by itself (Q2)');
    eq(await stat('releases', NEW), '1 item needs written approval: send a request', 'saying the request is owed');

    console.log('\n## Part 2 · Closing opens at the close, and when Close job is refused');
    await p.selectOption('#inv-job', String(DONE)); await p.waitForTimeout(1200);
    ok(await isOpen('closing', DONE), '⚠ a closed job\'s desk: Closing open by itself');
    await toDesk(EST);
    ok(!(await isOpen('closing')), 'fixture: the estate\'s Closing is shut mid-job');
    dialogs.length = 0;
    await press('#inventory-content button[onclick="activateOrCycle(' + EST + ')"]', 'Close job, on the desk\'s band');
    has(dialogs.join(' | '), 'Cannot close the job yet', 'fixture: refused (Kodner Galleries is not rated)');
    has(dialogs.join(' | '), 'under Closing the job on Job Admin & Inv', 'and the refusal says where the scorecard is, by the bar\'s title');
    ok(await isOpen('closing'), '⚠⚠ the Closing bar is open behind the refusal, with the scorecard in it');
    ok(await p.locator('#closeout-admin-' + EST).isVisible(), 'the close-out card on screen');

    console.log('\n## Part 2 · Open the desk lands on the Releases card, open, whatever the person left');
    await p.evaluate((id) => {
      const j = jobs.find((x) => x.id === id);
      j.docState.approvalRequest = { draftedAt: '2026-10-20T14:00:00.000Z', sentAt: '2026-10-20T15:00:00.000Z', sentBy: 'Ashley Jerome', provider: 'gmail',
        req: { to: ['t.ashworth@example.com'], cc: [], noEmail: [], stableIds: ['e04', 'e07', 'e10'], asked: 3, ratify: 0 } };
      saveJobs(); renderInventoryTab();
    }, EST);
    await p.waitForTimeout(500);
    eq(await stat('releases'), '3 on the request still unsigned · 2 ready to sign out', 'the request sent: what is out for signature, and the sign-out still owed');
    if (await isOpen('releases')) await press('#desk-hd-releases-' + EST, 'the Releases header, to shut it');
    ok(!(await isOpen('releases')), 'fixture: Releases shut by hand');
    await p.evaluate((id) => { showPanel('jobs', document.querySelector('.nb[onclick*="\'jobs\'"]')); openClientDashboard(id); }, EST);
    await p.waitForTimeout(900);
    await press('#dash-approval-' + EST + ' button[onclick="openJobDeskFor(' + EST + ')"]', 'Open the desk, on the dashboard\'s card');
    await p.waitForTimeout(600);
    eq(String(await p.evaluate(() => document.getElementById('inv-job').value)), String(EST), 'landed on the desk, on this client');
    ok(await p.locator('#inv-releases').isVisible(), '⚠⚠ with the Releases card on screen, its bar opened');

    eq(errs, [], 'zero page errors');
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('step96: ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
