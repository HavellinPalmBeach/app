// Step 44 — P15: Anthony's answers of 2026-09-30, and the small items he asked to be fixed.
//
// Drives the REAL page through its own controls: the real intake and Build Estimate, the dashboard's
// Change Orders card (+ New, the modal, Create, Get Acceptance, the acceptance panel, PDF), the vendor
// cards on Build Estimate, the band's View on the signing packet, the Job Plan, the Job Admin & Inv tab's
// When filter, and the Vendors and Referral Partners tabs' Full edit, Delete and the manager PIN dialog.
// The Vendor Directory and the Referral Partners sheet are answered by routes, as the real Apps Script
// would answer them. What is seeded is state a person could not type in one sitting (a signed job, a
// manifest with a shot from today).
//
//   A. a fixed-price RUSH job's change order carries the 20% premium (the Q14 follow-up): the modal's note
//      and readout say so, the record pins it, the acceptance shows the price; a plain fixed job's does not
//   B. Q20 on Build Estimate: the coordination is "Inventory scheduling"; the Inventory + appraisals tier
//      asks for an appraiser while none is on the estimate; adding one through the vendor card books its
//      own 2.0 concierge hours and withdraws the ask
//   C. Q20 in the signing packet: a values-tier estate whose estimate lists an appraiser names it; without
//      one, counsel arranges them all
//   D. a Home Prep change order adds a painter: the vendor block, the refusal without a cost, the readout,
//      the card, the acceptance, the PDF, and the painter on the Job Plan; no vendor block on a labour job
//   E. the desk's All filter stays chosen through a repaint, and another client's desk starts clean
//   F. the vendor and partner deletes ask their history question behind the PIN too; an unread client
//      list refuses a partner delete
//   G. the Vendor Directory not loaded warning on a labour job, on a device with no directory
//   H. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step44.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const VENDORS_URL = 'https://vendors.example.test/exec';
const PARTNERS_URL = 'https://partners.example.test/exec';
const DIR = [
  { vendor_name: 'Brushworks Painting', category_group: 'Property Preparation', category: 'Painting', status: 'Active', _row: 2 },
  { vendor_name: 'Stage Right Staging', category_group: 'Property Preparation', category: 'Staging', status: 'Active', _row: 3 },
  { vendor_name: 'Gallery Fine Art Appraisals', category_group: 'Asset Liquidation & Valuation', category: 'Art Appraiser', status: 'Active', _row: 4 },
  { vendor_name: 'Acme Hauling', category_group: 'Disposal & Waste Management', category: 'Junk Removal', status: 'Active', _row: 5, jobs_rated: '0' },
];
const PARTNERS = [{ uid: 'p-dana', partner_name: 'Dana Broker', partner_type: 'Realtor', status: 'Active Partner', _row: 2 }];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(([vu, dir, pu, partners]) => {
      try {
        localStorage.setItem('hav_vendor_url', vu); localStorage.setItem('hav_vendor_dir', JSON.stringify(dir));
        localStorage.setItem('hav_referral_url', pu); localStorage.setItem('hav_referral_dir', JSON.stringify(partners));
      } catch (e) {}
    }, [VENDORS_URL, DIR, PARTNERS_URL, PARTNERS]);
    const posts = [];
    const answer = (list, key) => async (r) => {
      const req = r.request();
      if (req.method() === 'POST') { posts.push(req.url() + ' ' + (req.postData() || '')); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ [key]: list }) });
    };
    await ctx.route(VENDORS_URL + '**', answer(DIR, 'vendors'));
    await ctx.route(PARTNERS_URL + '**', answer(PARTNERS, 'partners'));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const dialogs = []; p.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.evaluate(() => { window.open = function () { return null; }; window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; });

    // Each section starts with no dialog open, so one that throws with a modal up (on an old build, say)
    // does not leave the next section's first press under it.
    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => ['change-order-modal', 'co-accept-modal', 'dir-delete-pin-modal', 'add-vendor-modal', 'add-referral-modal', 'doc-viewer-modal']
        .forEach((id) => { const m = document.getElementById(id); if (m) m.style.display = 'none'; })).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(350); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const shown = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return !!el && el.checkVisibility(); }, sel);
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div');
      d.innerHTML = String(h).replace(/<\/td>/g, ' </td>').replace(/<\/th>/g, ' </th>').replace(/<br>/g, ' ');
      return d.textContent.replace(/\s+/g, ' '); }, h);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(400); };
    const coOf = (id) => p.evaluate((id) => { const c = changeOrders.filter((x) => x.jobId === id).pop();
      return c ? JSON.parse(JSON.stringify(c)) : null; }, id);
    // A date far enough ahead to be a walkthrough, on a weekday (intake refuses weekends).
    const future = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 30);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });

    ok(await p.evaluate(() => vendorDirectoryReady() && referralDirectory.length === 1), 'fixture: the directory and the partners sheet are loaded');

    // The real intake (Home Editing), then the real Build Estimate with the expedite toggle, the discount
    // box and the fixed fee set on the form itself; approved, won and signed — where a change order is raised.
    async function make(last) {
      await p.evaluate(() => { const bt = document.getElementById('btn-add-client'); if (bt) bt.click(); }); await p.waitForTimeout(300);
      const id = await p.evaluate(([wt, last]) => {
        const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
        const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
        set('i-svc', 'downsizing'); toggleIntakeFields();
        set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '1 A St'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
        set('i-sqft', '3500'); set('i-phone', '(561) 555-0199'); set('i-email', 'c@example.com'); set('i-home-value', '4200000');
        pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
        const st = new Date(wt + 'T12:00:00'); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
        set('i-start', st.getFullYear() + '-' + String(st.getMonth() + 1).padStart(2, '0') + '-' + String(st.getDate()).padStart(2, '0'));
        saveIntake(); return (jobs[0] || {}).id;
      }, [future, last]);
      await p.waitForTimeout(1500); return id;
    }
    async function build(id, o) {
      await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
      return p.evaluate(([id, o]) => {
        const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
        for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
        document.getElementById('e-rush').checked = !!o.rush;
        document.getElementById('e-discount').value = String(o.disc || 0);
        calcAll();
        if (o.fixed) {
          const fx = document.getElementById('e-fixed'); if (!fx.checked) { fx.checked = true; toggleFixedPrice(); } calcAll();
          _fxAmtSet(o.fixed); markFixedAmountEdited(); calcAll();
        }
        const e = JSON.parse(JSON.stringify(currentEstimate));
        estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', estimate: e };
        const job = jobs.find(j => j.id === id);
        job.won = true; job.status = 'active'; job.agrSigned = true; job.agrSent = true;
        return e;
      }, [id, o]);
    }

    // ── A. the Q14 follow-up ─────────────────────────────────────────────────
    let idF = 0;
    await section('A. a fixed-price rush job\'s change order carries the 20% premium; a plain fixed job\'s does not', async () => {
      idF = await make('Rushfix');
      const eF = await build(idF, { rush: true, disc: 10, fixed: 24000 });
      eq([eF.fixedPrice, eF.rush, eF.fixedLines, eF.fixedAmount], [true, true, true, 24000], 'fixture: a $24,000 fixed fee, expedited, its premium a line on it');
      await toDash(idF);
      await press('#client-dashboard-view button[onclick="openChangeOrder(' + idF + ')"]', '+ New on the Change Orders card');
      has(await txt('#co-basis-note'), 'plus the 20% expedited-delivery premium, because this job is expedited', '⚠ the modal says the price will carry the premium');
      ok(!(await shown('#co-vendor-wrap')), 'and offers no vendor on a labour job');
      await p.fill('#co-tc-hrs', '8'); await p.fill('#co-ps-hrs', '8'); await p.waitForTimeout(200);
      const ro = await txt('#co-hrs-note');
      has(ro, 'plus the 20% expedited-delivery premium, as this job is expedited', 'the readout names it');
      has(ro, '$2,400', '⚠⚠ and prices 8 + 8 hours at $2,400: the rate card\'s $2,000 plus 20%');
      await p.fill('#co-description', 'Added the pool house to scope.');
      await p.evaluate(() => { const s = document.getElementById('co-reason'); const vs = Array.from(s.options).map(o => o.value).filter(Boolean); s.value = vs.indexOf('scope_add') >= 0 ? 'scope_add' : vs[0]; });   // P25 (Q54): no reason is pre-picked; a person picks one
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create Change Order');
      const co = await coOf(idF);
      ok(!!co && co.rushPct === 0.2, '⚠ the premium is pinned on the change order (' + (co && co.rushPct) + ')');
      await press('#client-dashboard-view button[onclick="openCOAcceptModal(' + co.id + ')"]', 'Get Acceptance on its row');
      has(await txt('#coa-summary'), '2,400', 'the client accepts the $2,400 price');
      await p.fill('#coa-client-name', 'Pat Rushfix');
      await press('#co-accept-modal button:has-text("I Accept This Change Order")', 'I Accept');
      ok(!!(await coOf(idF) || {}).clientApproved, 'accepted');
      await p.evaluate(() => { window.__prints = []; });
      await press('#client-dashboard-view button[onclick="printChangeOrder(' + co.id + ')"]', 'the row\'s PDF');
      const pr = await T(await p.evaluate(() => window.__prints[0] || ''));
      has(pr, '+ $2,400', 'the page prints the price the client signed');
      has(pr, 'It is priced at the hourly rates shown plus the 20% expedited-delivery premium, as this engagement is expedited; the preferred-client discount on your fixed project fee does not apply to it.',
          'and says why, in one line');

      const idP = await make('Flatplain');
      await build(idP, { fixed: 24000 });
      await toDash(idP);
      await press('#client-dashboard-view button[onclick="openChangeOrder(' + idP + ')"]', '+ New on a plain fixed job');
      lacks(await txt('#co-basis-note'), 'expedited-delivery premium', 'a fixed job with no rush says nothing of a premium');
      await p.fill('#co-tc-hrs', '8'); await p.fill('#co-ps-hrs', '8'); await p.waitForTimeout(200);
      has(await txt('#co-hrs-note'), '$2,000', 'and prices the same hours at the rate card');
      await press('#change-order-modal button:has-text("Cancel")', 'Cancel');
    });

    // ── B. Q20 on Build Estimate ─────────────────────────────────────────────
    await section('B. Q20: the appraisals tier asks for an appraiser line; adding one prices it and withdraws the ask', async () => {
      await p.evaluate(() => {
        jobs.unshift({ id: 4401, hvlId: 'HVL-2609-Q441', name: 'Estate of Ruth Vale', fname: 'Ruth', lname: 'Vale', svc: 'cleanout',
          sqft: '3500', addr: '40 Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '3000000', beds: '3', baths: '3', halfBaths: '1',
          executor: 'Mark Vale', executorRole: 'Personal Representative', executorEmail: 'mark@example.com', executorPhone: '(561) 555-0141',
          matterType: 'probate', docTier: 'appraisals', start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20',
          status: 'new', tc: 'Anthony Graziano', siteVisitBy: 'Anthony Graziano', dateOfDeath: '2026-08-01' });
        saveJobs();
      });
      await toDash(4401);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4401)"]', 'the band\'s Build estimate');
      await p.waitForTimeout(600);
      await p.evaluate(() => { for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in'); calcAll(); });
      has(await txt('#e-docscope-hint'), 'This tier promises the specialist appraisals: add each appraiser under Vendors, so its scheduling is priced on its own line.',
          '⚠⚠ the appraisals tier asks for an appraiser while none is on the estimate');
      // The hourly breakdown names the coordination; on a fixed price its row is hidden, so untick Fixed price as a person would.
      if (await p.evaluate(() => document.getElementById('e-fixed').checked)) await press('label.toggle:has(#e-fixed)', 'untick Fixed price');
      ok(!(await p.evaluate(() => document.getElementById('e-fixed').checked)), 'the estimate is hourly now, its fee rows on screen');
      const lbl = await txt('#tc-fee-label');
      has(lbl, 'Inventory scheduling', '⚠ the concierge breakdown names inventory scheduling');
      lacks(lbl, 'Appraiser & inventory scheduling', 'not appraiser scheduling');
      const before = await p.evaluate(() => currentEstimate.totTC);
      // Add the appraiser through the Asset Liquidation & Valuation card, as a person does.
      const gi = await p.evaluate(() => VENDOR_GROUP_CARDS.findIndex((c) => c.group === 'Asset Liquidation & Valuation'));
      ok(gi >= 0, 'fixture: the valuation card is on the page');
      const opts = await p.evaluate((gi) => Array.from((document.getElementById('vgrp-cat-' + gi) || { options: [] }).options).map((o) => o.value), gi);
      ok(opts.indexOf('Art Appraiser') >= 0, 'the card offers the directory\'s Art Appraiser (' + opts.join(', ') + ')');
      await p.selectOption('#vgrp-cat-' + gi, 'Art Appraiser');
      await p.fill('#vgrp-cost-' + gi, '1500');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the card\'s +');
      const after = await p.evaluate(() => currentEstimate.totTC);
      eq(Math.round((after - before) * 10) / 10, 2, '⚠⚠ the appraiser line books its own 2.0 concierge hours (' + before + ' → ' + after + ')');
      lacks(await txt('#e-docscope-hint'), 'This tier promises the specialist appraisals', 'and the ask is withdrawn');
      has(await txt('#tc-fee-label'), 'Third-party vendor coordination', 'the hours sit on the vendor line, where the appraiser is');
      ok(!(await txt('#vendor-group-cards')).includes('Vendor Directory not loaded'), 'with the directory loaded, no "not loaded" warning');
    });

    // ── C. Q20 in the signing packet ─────────────────────────────────────────
    await section('C. Q20: a values-tier estate names the appraisers its estimate lists; without one, counsel arranges them', async () => {
      await p.evaluate(() => {
        const mk = (id, name, vendors) => {
          jobs.unshift({ id, hvlId: 'HVL-2609-Q' + id, name, fname: 'Ada', lname: name.split(' ').pop(), svc: 'cleanout', sqft: '3500',
            addr: id + ' Lake Trl', city: 'Palm Beach', zip: '33480', executor: 'Sam Heir', executorRole: 'Personal Representative',
            executorEmail: 'sam@example.com', executorPhone: '(561) 555-0142', matterType: 'probate', docTier: 'values',
            start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20', status: 'won', won: true, wonAt: '2026-09-29',
            wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, estimateSentDate: 'September 28, 2026', tc: 'Anthony Graziano',
            dateOfDeath: '2026-08-01', docState: { estimate: { sentAt: '2026-09-28T14:00:00.000Z' } } });
          estimateStore[id] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 28, 2026', savedAt: Date.parse('2026-09-28T13:00:00Z'),
            estimate: { jobId: id, svc: 'cleanout', docScope: 'full', docTier: 'values', rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }],
              totTC: 60, totPS: 120, tcRate: 150, psRate: 100, tcFee: 9000, psFee: 12000, havellinTotal: 21000, grandTotal: 22500,
              vendors: vendors, prepItems: [], collections: [], vehicles: [] } };
        };
        mk(4402, 'Ada Listed', [{ type: 'Art Appraiser', cost: 1500, lid: 'ap1', tcHrs: 2 }]);
        mk(4403, 'Ada Counsel', []);
        saveJobs();
      });
      const packet = async (id) => {
        await toDash(id);
        const sel = '#client-dashboard-view button[onclick="docAction(' + id + ',\'agreement\',\'view\')"]';
        const n = await p.locator(sel).count();
        if (n !== 1) { ok(false, 'the band offers View packet (' + n + ')'); return ''; }
        await p.click(sel); await p.waitForTimeout(500);
        const t = await txt('#doc-viewer-body');
        await p.evaluate(() => { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; });
        return t;
      };
      const listed = await packet(4402);
      has(listed, 'Havellin will coordinate the professional appraisals listed in Exhibit A (Art Appraiser); any other appraisal remains the responsibility of the Client and the estate attorney.',
          '⚠⚠ §2 names the appraisal its Exhibit A prices');
      has(listed, 'Havellin will coordinate the professional appraisals listed in Exhibit A (Art Appraiser) within the 60-day inventory deadline from Letters of Administration issuance.',
          'and §5.2 promises it inside the 60 days');
      has(listed, 'Arrange the appraisals listed in Exhibit A', 'the authority table lists it');
      lacks(listed, 'The coordination of professional appraisals is not within this engagement', 'no carve-out beside a priced appraiser');
      const counsel = await packet(4403);
      has(counsel, 'The coordination of professional appraisals is not within this engagement', 'with no appraiser listed, counsel arranges them all');
      has(counsel, 'Professional appraisals are arranged by the estate attorney', 'and §5.2 says so');
    });

    // ── D. a Home Prep change order adds a painter ───────────────────────────
    await section('D. a Home Prep change order adds a painter, and the Job Plan books it once the client accepts', async () => {
      await p.evaluate(() => {
        jobs.unshift({ id: 4404, hvlId: 'HVL-2609-P444', name: 'Sam Marston', fname: 'Sam', lname: 'Marston', svc: 'prep', sqft: '2800',
          addr: '3 Royal Palm Way', city: 'Palm Beach', zip: '33480', email: 'sam@example.com', phone: '(561) 555-0144',
          start: '2026-09-21', walkthrough: '2026-09-10', created: '2026-09-08', status: 'active', won: true, wonAt: '2026-09-12',
          wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, agrApproved: true, agrApprovedBy: 'Anthony Graziano',
          agrSent: true, agrSigned: true, depositReceived: true, tc: 'Ashley Jerome', activatedOn: '2026-09-21', activatedBy: 'Ashley Jerome',
          payments: [{ uid: 'd1', stage: 'deposit', amount: 450, date: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }] });
        estimateStore[4404] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: 'September 12, 2026', savedAt: Date.parse('2026-09-12T13:00:00Z'),
          estimate: { jobId: 4404, svc: 'prep', prepEnabled: true, prepItems: [{ type: 'Staging', cost: 3000, lid: 'st1' }], prepFee: 900,
            totTC: 0, totPS: 0, tcRate: 150, psRate: 100, havellinTotal: 900, grandTotal: 3900, vendors: [], rooms: [] } };
        saveJobs();
      });
      await toDash(4404);
      await press('#client-dashboard-view button[onclick="openChangeOrder(4404)"]', '+ New on the prep job');
      ok(await shown('#co-vendor-wrap'), '⚠ the modal offers a prep vendor');
      const vopts = await p.evaluate(() => Array.from(document.getElementById('co-vendor-type').options).map((o) => o.value));
      eq(vopts, ['', 'Painting', 'Staging'], 'from the directory\'s Property Preparation categories, and nothing else');
      has(await txt('#co-basis-note'), 'A change order can also add a preparation vendor found mid-job', 'and the note says it can');
      await p.selectOption('#co-vendor-type', 'Painting');
      await p.fill('#co-description', 'Repaint the guest house before listing.');
      await p.evaluate(() => { const s = document.getElementById('co-reason'); const vs = Array.from(s.options).map(o => o.value).filter(Boolean); s.value = vs.indexOf('scope_add') >= 0 ? 'scope_add' : vs[0]; });   // P25 (Q54): no reason is pre-picked; a person picks one
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create, with no cost typed');
      has(await txt('#co-fb'), 'Enter the added vendor’s estimated cost, so the client sees the fee it carries.', '⚠ a vendor with no cost is refused, by name');
      ok(!(await coOf(4404)), 'and nothing is recorded');
      await p.fill('#co-vendor-cost', '4500'); await p.waitForTimeout(200);
      // RESTATED 2026-10-01 (P17, Anthony's answer 5): the fee is the Home Sale Preparation Fee; this read "site management fee".
      // ⚠ RESTATED (P25, Q52; Anthony, 2026-10-09: "quotes, then trued"): the prep fee's basis reads what the app bills, the quotes recorded, updated if an invoice differs.
      has(await txt('#co-hrs-note'), 'the 30% Home Sale Preparation Fee applies to its quote as recorded, updated if its invoice differs — about $1,350 at the estimated $4,500',
          'the readout names the fee at the estimated cost');
      await press('#change-order-modal button:has-text("Create Change Order")', 'Create');
      const co = await coOf(4404);
      eq(co && co.vendorAdds && co.vendorAdds.map((v) => [v.type, v.cost]), [['Painting', 4500]], '⚠⚠ the change order records the painter and its estimated cost');
      eq(co && co.tcHrs, 0, 'and no hours');
      const card = await txt('#client-dashboard-view');
      has(card, 'adds Painting (est. $4,500)', 'the card names what it adds');
      await press('#client-dashboard-view button[onclick="openCOAcceptModal(' + co.id + ')"]', 'Get Acceptance');
      const sum = await txt('#coa-summary');
      has(sum, 'Added vendor', 'the client sees the vendor it adds');
      has(sum, 'Painting, est. $4,500, billed to you directly', 'at its estimated cost, billed to them directly');
      lacks(sum, 'an hour, billed as worked', 'and no hourly rate row on a change with no hours');
      has(await txt('#coa-terms'), 'and the addition of Painting to the preparation vendors, billed to them directly at cost', 'the terms name it');
      await p.fill('#coa-client-name', 'Sam Marston');
      await press('#co-accept-modal button:has-text("I Accept This Change Order")', 'I Accept');
      has(await txt('#dash-fb'), 'Painting now sits with the prep vendors on the Job Plan, to be booked and quoted.', 'the notice says where it went');
      await p.evaluate(() => { window.__prints = []; });
      await press('#client-dashboard-view button[onclick="printChangeOrder(' + co.id + ')"]', 'the row\'s PDF');
      const pr = await T(await p.evaluate(() => window.__prints[0] || ''));
      has(pr, 'Added preparation vendor: Painting', 'the page names the vendor');
      has(pr, 'The other preparation vendors’ costs are unaffected by this change.', 'and says the others are unaffected');
      lacks(pr, 'Vendor costs are unaffected', 'never that vendor costs are unaffected');
      // The Job Plan.
      ok(await p.evaluate(() => openJobPlanFor(4404)), 'the Job Plan opens on the prep job');
      await p.waitForTimeout(600);
      const plan = await txt('#panel-job-plan');
      ok((plan.match(/Painting/g) || []).length >= 2, '⚠⚠ the painter is on the plan, in the budget and the sourcing list (' + (plan.match(/Painting/g) || []).length + ')');
      has(plan, 'Staging', 'beside the estimate\'s own line');
      const pick = await p.evaluate(() => Array.from(document.querySelectorAll('#panel-job-plan select')).some((s) =>
        Array.from(s.options).some((o) => /Brushworks Painting/.test(o.textContent))));
      ok(pick, 'and its row offers the directory\'s painter to book');
      // The block is Home Prep only.
      await toDash(idF);
      await press('#client-dashboard-view button[onclick="openChangeOrder(' + idF + ')"]', '+ New on the labour job again');
      ok(!(await shown('#co-vendor-wrap')), '⚠ one modal serves every job: the vendor block is hidden again on a labour job');
      await press('#change-order-modal button:has-text("Cancel")', 'Cancel');
    });

    // ── E. the desk's All filter ─────────────────────────────────────────────
    await section('E. the desk\'s All filter stays chosen', async () => {
      await p.evaluate(() => {
        jobs.unshift({ id: 4405, hvlId: 'HVL-2609-D445', name: 'Dora Fields', svc: 'home_cleanout', addr: '7 Palm Way', tc: 'Anthony Graziano',
          status: 'active', won: true, approved: true });
        const at = (ts, i, name) => ({ stableId: 'd' + i, roomIdx: 0, label: 'inventory', collId: null, seq: 1, filename: 'd' + i + '.jpg',
          driveFileUrl: 'https://drive.google.com/file/d/g' + i + '/view', driveFileId: 'g' + i, status: 'uploaded', ts,
          objectName: name, category: 'General/Household', disposition: 'Keep', itemNo: i + 1 });
        _photoRefs[4405] = [at(Date.parse('2026-09-20T12:00:00Z'), 1, 'Oak sideboard'), at(Date.now(), 2, 'Brass lamp')];
        savePhotoRefs(4405); setCurrentJob(4405);
      });
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      const rows = () => p.evaluate(() => Array.from(document.querySelectorAll('[id^="inv-row-"]')).filter((e) => e.checkVisibility()).length);
      eq([await p.evaluate(() => _invFilter.when), await rows()], ['today', 1], 'fixture: a day with a capture opens on Today');
      await press('#panel-inventory button[onclick="setInvWhen(\'all\')"]', 'All');
      eq([await p.evaluate(() => _invFilter.when), await rows()], ['all', 2], '⚠⚠ pressing All shows All — it drew Today again');
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(400);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      eq([await p.evaluate(() => _invFilter.when), await rows()], ['all', 2], 'and stays through a repaint');
      // Another client's desk starts clean: Today and a search chosen here do not follow.
      await press('#panel-inventory button[onclick="setInvWhen(\'today\')"]', 'Today');
      await p.fill('#inv-q', 'lamp'); await p.waitForTimeout(700);
      eq(await p.evaluate(() => [_invFilter.when, _invFilter.q]), ['today', 'lamp'], 'fixture: Today and a search on this desk');
      await p.evaluate(() => {
        jobs.unshift({ id: 4407, hvlId: 'HVL-2609-D447', name: 'Evan Moss', svc: 'home_cleanout', addr: '9 Palm Way', tc: 'Anthony Graziano',
          status: 'active', won: true, approved: true });
        _photoRefs[4407] = [{ stableId: 'm1', roomIdx: 0, label: 'inventory', collId: null, seq: 1, filename: 'm1.jpg',
          driveFileUrl: 'https://drive.google.com/file/d/m1/view', driveFileId: 'm1', status: 'uploaded', ts: Date.parse('2026-09-20T12:00:00Z'),
          objectName: 'Walnut desk', category: 'General/Household', disposition: 'Keep', itemNo: 1 }];
        savePhotoRefs(4407); saveJobs(); populateInventorySelect();
      });
      ok(await p.evaluate(() => Array.from(document.getElementById('inv-job').options).some((o) => o.value === '4407')), 'fixture: the second client is in the desk\'s picker');
      await p.selectOption('#inv-job', '4407'); await p.waitForTimeout(800);
      eq(await p.evaluate(() => [_invFilter.when, _invFilter.q, (document.getElementById('inv-q') || {}).value]), ['all', '', ''],
         '⚠ another client\'s desk starts clean: All with nothing shot there today, and no search carried over');
      eq(await rows(), 1, 'and shows its line');
    });

    // ── F. the directory deletes ─────────────────────────────────────────────
    await section('F. the vendor and partner deletes ask their history question behind the PIN too', async () => {
      await p.click('.nb[onclick*="\'vendors\'"]'); await p.waitForTimeout(600);
      await press('#panel-vendors div[onclick^="toggleVendorGroup("]:has-text("Disposal & Waste Management")', 'open the Disposal & Waste Management group');
      await press('#panel-vendors div[onclick^="toggleVendorCat("]:has-text("Junk Removal")', 'open Junk Removal');
      await press('#panel-vendors button[onclick="editVendor(\'5\')"]', 'Acme Hauling\'s Full edit');
      await press('button[onclick="requestDeleteVendor(document.getElementById(\'v-edit-row\').value)"]', 'Delete this vendor permanently');
      ok(await shown('#dir-delete-pin-modal'), 'fixture: a vendor with no history is asked for the manager PIN');
      // A rating lands while the PIN box is open (another device closed a job with them).
      await p.evaluate(() => { lookupVendorById('5').jobs_rated = '1'; });
      dialogs.length = 0; posts.length = 0;
      await p.fill('#dir-delete-pin-input', '3010'); await p.waitForTimeout(400);
      has(dialogs.join(' | '), 'This vendor has job history', '⚠⚠ behind the PIN the delete asks again, and refuses');
      eq(posts.filter((x) => /deleteVendor/.test(x)).length, 0, 'nothing is sent to the sheet');
      ok(!!(await p.evaluate(() => lookupVendorById('5'))), 'and the vendor is still in the directory');
      await p.evaluate(() => closeVendorForm());

      await p.click('.nb[onclick*="\'referrals\'"]'); await p.waitForTimeout(600);
      await press('#panel-referrals div[onclick^="toggleReferralCat("]:has-text("Realtor")', 'open the Realtor list');
      await press('#panel-referrals button[onclick="editReferral(\'p-dana\')"]', 'Dana Broker\'s Full edit');
      const del = 'button[onclick="requestDeleteReferral(document.getElementById(\'r-edit-row\').value)"]';
      await press(del, 'Delete this partner permanently');
      ok(await shown('#dir-delete-pin-modal'), 'fixture: a partner with no referrals is asked for the manager PIN');
      await p.evaluate(() => { jobs[0].refPartnerId = 'p-dana'; });   // a referral attributed while the box is open
      dialogs.length = 0; posts.length = 0;
      await p.fill('#dir-delete-pin-input', '3010'); await p.waitForTimeout(400);
      has(dialogs.join(' | '), 'This partner has 1 referral attributed to them', '⚠⚠ behind the PIN the partner delete asks again, and refuses');
      eq(posts.filter((x) => /deletePartner|deleteReferral/.test(x)).length, 0, 'nothing is sent to the sheet');
      // An unread client list counts no referrals, so it refuses rather than guess.
      await p.evaluate(() => { jobs[0].refPartnerId = ''; window.__jobs = jobs.splice(0, jobs.length); window.__state = _jobsState; _jobsState = 'loading'; });
      dialogs.length = 0;
      await press(del, 'Delete this partner permanently, with the client list unread');
      has(dialogs.join(' | '), 'The client list has not loaded, so the referrals attributed to Dana Broker cannot be counted yet.', '⚠ refused while the client list is unread');
      ok(!(await shown('#dir-delete-pin-modal')), 'and no PIN is asked');
      await p.evaluate(() => { window.__jobs.forEach((j) => jobs.push(j)); _jobsState = window.__state; });
      await p.evaluate(() => closeReferralForm());
    });

    // ── G. the Vendor Directory warning, on a device with none ───────────────
    await section('G. a labour job\'s Build Estimate says the Vendor Directory is not loaded, on a device without one', async () => {
      const bare = await b.newContext({ viewport: { width: 1440, height: 1000 } });
      const q = await bare.newPage(); q.setDefaultTimeout(10000);
      const qerrs = []; q.on('pageerror', e => qerrs.push(String(e))); q.on('dialog', async d => { await d.accept(); });
      await q.goto(APP); await q.waitForTimeout(1500);
      await q.evaluate(() => {
        jobs.unshift({ id: 4406, hvlId: 'HVL-2609-L446', name: 'Lee Grant', fname: 'Lee', lname: 'Grant', svc: 'home_cleanout', sqft: '3000',
          addr: '5 Lake Trl', city: 'Palm Beach', zip: '33480', email: 'lee@example.com', phone: '(561) 555-0146', start: '2026-10-19',
          walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Anthony Graziano' });
        saveJobs(); goToClientDashboard(4406);
      });
      await q.waitForTimeout(400);
      await q.click('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(4406)"]'); await q.waitForTimeout(700);
      const w = await q.evaluate(() => { const e = document.getElementById('vendor-group-cards'); return e ? e.textContent : ''; });
      has(w, 'Vendor Directory not loaded', '⚠⚠ the warning shows on a labour job — it never could');
      // Above the cards, not instead of them: the End-of-Job Logistics card lists its own slots and stays usable.
      ok(await q.evaluate(() => { const c = document.getElementById('vendor-group-cards'); const f = c && c.firstElementChild;
        return !!f && /Vendor Directory not loaded/.test(f.textContent) && f.checkVisibility(); }), 'first, above the cards, on screen');
      ok(await q.evaluate(() => Array.from(document.querySelectorAll('#vendor-group-cards .vgrp-card')).some((c) => /End-of-Job Logistics/.test(c.textContent))),
         'and the End-of-Job Logistics card, which needs no directory, is still offered');
      eq(qerrs, [], 'no page errors there');
      await bare.close();
    });

    // ── H. overflow, and errors ──────────────────────────────────────────────
    await section('H. overflow at 1440 and 390; no page errors', async () => {
      await toDash(4404);
      ok(await overflow() <= 0, 'the prep dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await toDash(4404); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await press('#client-dashboard-view button[onclick="openChangeOrder(4404)"]', '+ New at 390');
      ok(await shown('#co-vendor-cost'), 'the vendor cost box is on screen at 390');
      ok(await overflow() <= 0, 'the modal fits at 390 (' + await overflow() + ')');
      await press('#change-order-modal button:has-text("Cancel")', 'Cancel');
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'no page errors');
    });

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    await b.close();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('✗ threw: ' + (e && e.stack || e));
    console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
    if (b) await b.close().catch(() => {});
    process.exit(1);
  }
})();
