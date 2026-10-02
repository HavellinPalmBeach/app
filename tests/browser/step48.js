// Step 48 — P16 W4 (screens-text): the screen defects on the known-bug list, on the real page.
//
// Drives the REAL page through its own controls: the header's Field button, the real intake typed into and saved,
// Build Estimate's room grid and Save Estimate, ← Back to client, Edit Client's pickers and Save Changes, the
// band's Build estimate / Submit for approval / Manager approval and the PIN box, ✎ Edit estimate, the Contractors
// tab's Add Contractor, the Job Plan's end-of-job vendor picker, quote box and Remove, and the Referral Partners
// tab. The Vendor Directory and the partners sheet are answered by routes; Drive, where the save files the internal
// worksheet, is the one boundary replaced in the page (resolveSubfolderId / uploadHtmlToDrive). What is seeded is
// state a person could not type in one sitting (a job mid-flight, a closed job).
//
//   A. B3: field mode on a 390 px phone and two iPad widths — the banner, the save card on screen, a refusal
//      printed where it can be read, two rooms scored and saved, landing on the client with the save notice
//   B. B4: a client whose name, notes, representative and email carry markup, typed at intake: the dashboard
//      shows them as text, the notes keep their line, Edit Client's notes box keeps it through a save; a
//      concierge typed on the Contractors tab with markup in the name, email and bio: the client estimate's
//      viewer shows them as text
//   C. B13 (and B21's twin on Edit Client): an estate with no tier — Save refused, the tier answered on Edit
//      Client, the open estimate follows (Full → Capture only), saved, submitted, approved; the tier changed
//      again: flagged with ✎ Edit estimate, not repriced; the held-field alert names ✎ Edit estimate; ✎ Edit
//      estimate reopens it following the tier, with the note saying so; Submit refuses the saved copy until
//      Save records the new pricing
//   D. B21: intake's "How is this estate being administered?" carries the red mark, on screen
//   E. B23 and removeLogisticsLine: the Job Plan's end-of-job vendor names each number beside whom it reaches;
//      Remove says the quote comes off the vendor costs the invoices list
//   F. B24: a Home Prep estimate with declutter hours files the vendor list and the hours, no room table
//   G. the stale text, read off the page: Premium, the heirs subtitle (estate and Home Editing), the prep
//      vendor card, the prep plan's cards, the referral leaderboard, a one-day job's schedule strip
//   H. overflow at 1440 and 390; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step48.js [/abs/path/to/havellin.html]
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
  { vendor_name: 'Acme Hauling', category_group: 'Disposal & Waste Management', category: 'Junk Removal & Dumpster', status: 'Active', _row: 5,
    phone: '5615550100', contact_first: 'Andy', contact_last: 'Ramirez', contact_mobile: '5615550199',
    contact2_first: 'Bea', contact2_last: 'Cole', contact2_email: 'bea@acme.test' },
];
const PARTNERS = [{ uid: 'u-ann', partner_name: 'Ann Lowe', partner_type: 'Estate attorney', status: 'Active Partner', _row: 2 }];

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
    const answer = (list, key) => async (r) => {
      if (r.request().method() === 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
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

    // Each section starts at a desk, with no dialog open and field mode off, so one that throws half-way (on an old
    // build, say) does not leave the next section's first press under a modal or on a phone.
    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
      await p.evaluate(() => { ['edit-client-modal', 'pin-modal', 'doc-viewer-modal']
        .forEach((id) => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
        if (document.body.classList.contains('field-mode')) setFieldMode(false); }).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n === 1 && await vis(sel);
      ok(v, (what || sel) + ' — one control, on screen (' + n + ')');
      if (v) { await p.locator(sel).scrollIntoViewIfNeeded().catch(() => {}); await p.click(sel, { timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(350); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const html = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerHTML : ''; }, sel);
    const shown = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return !!el && el.checkVisibility(); }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(450); };
    const fieldOn = () => p.evaluate(() => document.body.classList.contains('field-mode'));
    const days = async (off) => p.evaluate((off) => { const d = new Date(); d.setDate(d.getDate() + off);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + (off < 0 ? -1 : 1));
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }, off);

    // The real intake, TYPED: text boxes filled, pickers chosen, then Save Client pressed. Dates are set as the
    // picker sets them (the date boxes refuse typed keys by design).
    async function intake(o) {
      await p.evaluate(() => { if (typeof closeClientDashboard === 'function') closeClientDashboard(); document.getElementById('btn-add-client').click(); });
      await p.waitForTimeout(300);
      await p.selectOption('#i-svc', o.svc); await p.waitForTimeout(150);
      await p.fill('#i-fname', o.fname); await p.fill('#i-lname', o.lname);
      await p.fill('#i-addr', o.addr || '1 A St'); await p.fill('#i-city', 'Palm Beach'); await p.fill('#i-zip', '33480');
      await p.fill('#i-sqft', o.sqft || '3500'); await p.fill('#i-home-value', '4200000');
      await p.selectOption('#i-ptype', 'Single Family Home'); await p.selectOption('#i-src', 'Website');
      if (o.tc) await p.selectOption('#i-tc', o.tc);
      if (!o.estate) { await p.fill('#i-phone', '5615550199'); await p.fill('#i-email', o.email || 'c@example.com'); }
      if (o.notes != null) await p.fill('#i-notes', o.notes);
      if (o.estate) {
        await p.fill('#i-executor-fname', o.estate.fname); await p.fill('#i-executor-lname', o.estate.lname);
        await p.selectOption('#i-executor-role', 'Personal Representative');
        await p.fill('#i-executor-phone', '5615550141'); await p.fill('#i-executor-email', o.estate.email);
        await p.selectOption('#i-matter-type', 'probate');
      }
      const wt = await days(o.walkPast ? -3 : 30), st = await days(o.walkPast ? 10 : 40);
      await p.evaluate(([wt, st, dod]) => {
        const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
        set('i-walkthrough', wt); set('i-start', st); if (dod) set('i-date-of-death', dod);
      }, [wt, st, o.estate ? '2026-07-01' : '']);
      await press('#panel-intake button[onclick="saveIntake()"]', 'Save Client');
      await p.waitForTimeout(1200);
      return p.evaluate(() => (jobs[0] || {}).id);
    }
    // A room ticked and scored with the grid's own controls; its section opened first when it is folded.
    async function tick(rid) {
      if (!(await shown('#chk-' + rid))) {
        const sec = await p.evaluate((rid) => { const b = document.getElementById('chk-' + rid); const s = b && b.closest('.room-sec'); return s ? s.id : ''; }, rid);
        await press('#' + sec + ' .sec-toggle', 'open the room section holding ' + rid);
      }
      await press('#chk-' + rid, 'the scope box for ' + rid);
      const v = await p.evaluate((rid) => [document.getElementById('vol-' + rid).value, document.getElementById('cplx-' + rid).value], rid);
      if (!v[0]) await p.fill('#vol-' + rid, '3');
      if (!v[1]) await p.fill('#cplx-' + rid, '3');
    }
    const saveBtn = '#est-save-card button:has-text("Save Estimate")';

    // ── A. B3: field mode keeps Save Estimate on the phone ─────────────────────────────────────────────
    let idA = 0;
    await section('A. field mode: Save Estimate and its message strip are on a 390 px phone and on two iPad widths', async () => {
      for (const [w, h] of [[390, 844], [820, 1180], [1024, 1366]]) {
        await p.setViewportSize({ width: w, height: h });
        const id = await intake({ svc: 'downsizing', fname: 'Fay', lname: 'Field' + w });
        if (w === 390) idA = id;
        await toDash(id);
        if (!(await fieldOn())) await press('#field-toggle', 'the Field button in the header');
        ok(await fieldOn(), w + ': field mode is on');
        await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + id + ')"]', w + ': Build estimate on the band');
        await p.waitForTimeout(800);
        ok(await shown('#field-banner'), w + ': the field banner is on screen');
        const bn = await txt('#field-banner');
        has(bn, 'Save Estimate is at the foot of this screen and saves everything, the hidden parts included.', w + ': ⚠ the banner says where Save is, and that it saves it all');
        lacks(bn, 'saved in full', w + ': and no longer promises a save nobody pressed');
        ok(!(await shown('#est-summary-col')), w + ': the totals are hidden, as designed');
        ok(await shown('#est-save-card'), w + ': ⚠⚠ the save card is on screen');
        await press(saveBtn, w + ': Save Estimate, with nothing scored');
        has(await txt('#e-fb'), 'No rooms scored', w + ': ⚠ the refusal prints…');
        ok(await shown('#e-fb .alert, #e-fb > div'), w + ': …where it can be read');
        await tick('r1'); await tick('r4');
        await press(saveBtn, w + ': Save Estimate, two rooms scored');
        await p.waitForTimeout(1500);
        const rec = await p.evaluate((id) => { const r = estimateStore[id]; return r && r.estimate ? r.estimate.rooms.length : 0; }, id);
        eq(rec, 2, w + ': ⚠⚠ the walkthrough scored on the phone is saved');
        ok(await shown('#client-dashboard-view'), w + ': and the save lands on the client');
        has(await txt('#dash-fb'), 'Saved: 2 rooms', w + ': with the save summary');
        ok(await fieldOn(), w + ': still in field mode');
        ok(await overflow() <= 0, w + ': no horizontal overflow (' + await overflow() + ')');
      }
      await press('#field-toggle', 'the Field button, to leave');
      ok(!(await fieldOn()), 'desk view again');
      await p.setViewportSize({ width: 1440, height: 1000 });
      // On a desk the save card still sits under the summary.
      await toDash(idA);
      const g = await p.evaluate((id) => { const b = document.querySelector('#client-dashboard-view button[onclick="dashGoEstimate(' + id + ')"],#client-dashboard-view button[onclick="dashEditEstimate(' + id + ')"]');
        if (b) b.click(); return !!b; }, idA);
      ok(g, 'the estimate reopens at the desk');
      await p.waitForTimeout(900);
      const pos = await p.evaluate(() => { const s = document.getElementById('est-summary-col').getBoundingClientRect(), c = document.getElementById('est-save-card').getBoundingClientRect();
        return { below: c.top >= s.bottom - 1, left: Math.round(c.left - s.left) }; });
      ok(pos.below && pos.left === 0, 'at the desk the save card sits directly under the summary, as it did (' + JSON.stringify(pos) + ')');
      await p.click('#est-back'); await p.waitForTimeout(400);
    });

    // ── B. B4: typed markup is text ────────────────────────────────────────────────────────────────────
    await section('B. what a person types is shown as text: intake, Edit Client, and the concierge on the client estimate', async () => {
      // A concierge added on the Contractors tab, with markup in the name, the email and the bio.
      await p.click('.nb[onclick*="\'contractors\'"]'); await p.waitForTimeout(500);
      await press('button[onclick="showAddContractor()"]', '+ Add Contractor');
      await p.fill('#c-firstname', 'Zed'); await p.fill('#c-lastname', '<b>Bold</b> & Co');
      await p.selectOption('#c-role', 'TC');
      await p.fill('#c-phone', '(561) 555-0123'); await p.fill('#c-email', 'z<b>@x.com');
      await p.fill('#c-bio', 'First line <i>it</i> & more\nSecond line');
      await press('button[onclick="saveContractor()"]', 'Save Contractor');
      ok(await p.evaluate(() => contractors.some((c) => c.name === 'Zed <b>Bold</b> & Co')), 'fixture: the concierge is on the roster');

      const id = await intake({ svc: 'downsizing', fname: 'Pat <b>Bold</b>', lname: '& Co', tc: 'Zed <b>Bold</b> & Co',
        email: 'p<b>@x.com', notes: 'Line one <i>x</i> & y\nLine two', walkPast: true });
      await toDash(id);
      const name = await p.evaluate(() => { const e = document.querySelector('#client-dashboard-view .dash-id-who div[style*="font-size:19px"]'); return e ? [e.textContent, e.children.length] : null; });
      eq(name, ['Pat <b>Bold</b> & Co', 0], '⚠⚠ the name typed at intake is shown as typed — no bold, no swallowed ampersand');
      const card = await html('#client-dashboard-view .card');
      has(card, 'Zed &lt;b&gt;Bold&lt;/b&gt; &amp; Co', '⚠ the concierge is text');
      has(card, 'p&lt;b&gt;@x.com', 'the email is text');
      const notes = await p.evaluate(() => { const lbl = Array.from(document.querySelectorAll('#client-dashboard-view .dfl')).find((e) => e.textContent.trim() === 'Notes');
        const span = lbl && lbl.nextElementSibling; return span ? { t: span.textContent, tags: Array.from(span.querySelectorAll('*')).map((x) => x.tagName) } : null; });
      eq(notes, { t: 'Line one <i>x</i> & yLine two', tags: ['BR'] }, '⚠⚠ the notes are text, and their one line break is the one element in them');
      ok(!(await p.evaluate(() => !!document.querySelector('#client-dashboard-view .card b, #client-dashboard-view .card i'))), 'nothing typed became an element on the card');
      // Edit Client keeps the note's line through a save that changes something else.
      await press('#client-dashboard-view .d-util button[onclick="dashEditClient(' + id + ')"]', 'Edit Client');
      eq(await p.evaluate(() => { const e = document.getElementById('ec-notes'); return e ? [e.tagName, e.value] : null; }), ['TEXTAREA', 'Line one <i>x</i> & y\nLine two'],
         '⚠ Edit Client shows the note in a box that keeps its line');
      await p.fill('#ec-city', 'West Palm Beach');
      await press('#edit-client-modal button:has-text("Save Changes")', 'Save Changes');
      eq(await p.evaluate((id) => (jobs.find((j) => j.id === id) || {}).notes, id), 'Line one <i>x</i> & y\nLine two', '⚠⚠ …and the save keeps it (a one-line input stripped the break)');

      // The client estimate, as its viewer shows it.
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + id + ')"]', 'Build estimate');
      await p.waitForTimeout(800);
      eq(await p.evaluate(() => document.getElementById('e-prepared-by').value), 'Zed <b>Bold</b> & Co', 'fixture: the estimate is prepared by the concierge');
      await tick('r1'); await tick('r4');
      await press(saveBtn, 'Save Estimate'); await p.waitForTimeout(1500);
      const viewSel = '#client-dashboard-view button[onclick="docAction(' + id + ',\'estimate\',\'view\')"]';
      const nView = await p.locator(viewSel).count();
      ok(nView >= 1, 'the dashboard offers View on the estimate (' + nView + ')');
      if (nView >= 1) {
        await p.locator(viewSel).first().click(); await p.waitForTimeout(600);
        const vh = await html('#doc-viewer-body');
        const vt = await txt('#doc-viewer-body');
        has(vt, 'Contact Zed <b>Bold</b> & Co', '⚠⚠ the estimate names the concierge as typed');
        has(vt, 'First line <i>it</i> & more', '⚠ the bio is text');
        has(vh, '&amp; more<br>Second line', 'and keeps its line');
        has(vt, 'z<b>@x.com', 'the email is text');
        ok(!(await p.evaluate(() => !!document.querySelector('#doc-viewer-body b, #doc-viewer-body i'))) ||
           !(await p.evaluate(() => Array.from(document.querySelectorAll('#doc-viewer-body b, #doc-viewer-body i')).some((e) => /Bold|it/.test(e.textContent)))),
           'nothing typed became an element in the document');
        await p.evaluate(() => { const m = document.getElementById('doc-viewer-modal'); if (m) m.style.display = 'none'; });
      }
      // Every invoice is built by the same kind of line; the builder on this page, for this client.
      const inv = await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return invoiceHtml(j, 'deposit').html; }, id);
      has(inv, 'Zed &lt;b&gt;Bold&lt;/b&gt; &amp; Co', 'the deposit invoice on this page names the concierge as text');
      has(inv, 'First line &lt;i&gt;it&lt;/i&gt; &amp; more<br>Second line', 'with the bio as text on its lines');
    });

    // ── C. B13: the tier and the estimate ──────────────────────────────────────────────────────────────
    let idC = 0;
    await section('C. the documentation tier: a draft follows it, an approved estimate is flagged with the route', async () => {
      idC = await intake({ svc: 'cleanout', fname: 'Ruth', lname: 'Vale', walkPast: true,
        estate: { fname: 'Mark', lname: 'Vale <b>Rep</b>', email: 'mark@example.com' } });
      eq(await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); return [j.svc, j.docTier || '', j.executor]; }, idC),
         ['cleanout', '', 'Mark Vale <b>Rep</b>'], 'fixture: an Estate Settlement with no documentation tier answered');
      await toDash(idC);
      has(await html('#client-dashboard-view .card'), 'Mark Vale &lt;b&gt;Rep&lt;/b&gt;', 'B4: the representative is text on the card');
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + idC + ')"]', 'Build estimate');
      await p.waitForTimeout(800);
      has(await txt('#adj-heirs-sub'), 'about a quarter of total concierge hours', 'stale text: on an estate the heirs uplift names a quarter of the concierge hours');
      await tick('r1'); await tick('r4'); await tick('r8');
      eq(await p.evaluate(() => document.getElementById('e-docscope').value), 'full', 'with the tier blank the estimate prices at the top of the scale');
      const totFull = await p.evaluate(() => currentEstimate.havellinTotal);
      await press(saveBtn, 'Save Estimate');
      has(await txt('#e-fb'), 'What we are contracted to produce', '⚠ Save refuses a blank tier, by name');
      await press('#est-back', '← Back to client');
      await press('#client-dashboard-view .d-util button[onclick="dashEditClient(' + idC + ')"]', 'Edit Client');
      ok(/How is this estate being administered\?\s*\*/.test(await txt('#edit-client-modal')), 'B21: Edit Client marks the administration question required');
      await p.selectOption('#ec-doc-tier', 'contents');
      await press('#edit-client-modal button:has-text("Save Changes")', 'Save Changes, the tier answered');
      has(await txt('#dash-fb'), 'The estimate open on Build Estimate follows it: repriced from Full to Capture only.', '⚠⚠ the open estimate follows the answer, and the notice says so');
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + idC + ')"]', 'Build estimate, to the walkthrough still open');
      await p.waitForTimeout(700);
      eq(await p.evaluate(() => document.getElementById('e-docscope').value), 'capture', '⚠⚠ the Documentation scope now reads Capture only');
      const totCap = await p.evaluate(() => currentEstimate.havellinTotal);
      ok(totCap < totFull, 'and the price followed it ($' + totFull + ' → $' + totCap + ')');
      eq(await p.evaluate(() => [document.getElementById('vol-r1').value !== '', document.getElementById('vol-r8').value !== '']), [true, true], 'the rooms scored before are all still there');
      await press(saveBtn, 'Save Estimate'); await p.waitForTimeout(1500);
      eq(await p.evaluate((id) => { const e = estimateStore[id].estimate; return [e.docScope, e.docTier]; }, idC), ['capture', 'contents'], 'saved at Capture only, recording the tier it answers to');
      await press('#client-dashboard-view .jt-next button[onclick="dashSubmitEstimate(' + idC + ')"]', 'Submit for approval');
      await press('#client-dashboard-view .jt-next button[onclick="dashApproveEstimate(' + idC + ')"]', 'Manager approval');
      await p.fill('#pin-input', '3010'); await p.waitForTimeout(700);
      ok(await p.evaluate((id) => !!(estimateStore[id] && estimateStore[id].approved), idC), 'fixture: approved with the PIN');
      await p.evaluate(() => { const m = document.getElementById('pin-modal'); if (m) m.style.display = 'none'; });
      await toDash(idC);

      // The tier changed again, on an approved estimate: flagged, the route named, nothing repriced.
      await press('#client-dashboard-view .d-util button[onclick="dashEditClient(' + idC + ')"]', 'Edit Client');
      await p.selectOption('#ec-doc-tier', 'values');
      await press('#edit-client-modal button:has-text("Save Changes")', 'Save Changes, the tier changed after approval');
      const n2 = await txt('#dash-fb');
      has(n2, 'The approved estimate is priced at Capture only, and the app does not reprice it on its own.', '⚠⚠ an approved estimate is flagged, not repriced');
      has(n2, 'press ✎ Edit estimate on the client’s dashboard', 'the notice names the route');
      has(n2, 'Reopened for editing, it follows the new tier.', 'and what the route does');
      eq(await p.evaluate((id) => [estimateStore[id].approved, estimateStore[id].estimate.docScope], idC), [true, 'capture'], 'the approved record is untouched');
      // The held-field alert names the same route.
      await press('#client-dashboard-view .d-util button[onclick="dashEditClient(' + idC + ')"]', 'Edit Client');
      await p.fill('#ec-sqft', '5200');
      dialogs.length = 0;
      await press('#edit-client-modal button:has-text("Save Changes")', 'Save Changes with a held field changed');
      const al = dialogs.join(' | ');
      has(al, 'press ✎ Edit estimate on the client’s dashboard', '⚠ the held-field alert names ✎ Edit estimate');
      has(al, 'Then change them here.', 'and says the field opens after it');
      lacks(al, 'Raise a change order instead', 'not a change order');
      eq(await p.evaluate((id) => jobs.find((j) => j.id === id).sqft, idC), '3500', 'the square footage is held');

      // ✎ Edit estimate: un-approves it, and the reopened estimate follows the tier, saying why its price moved.
      const eSel = '#client-dashboard-view button[onclick="dashEditEstimate(' + idC + ')"]';
      const nE = await p.locator(eSel).count();
      ok(nE >= 1, '✎ Edit estimate is offered (' + nE + ')');
      if (nE >= 1) { await p.locator(eSel).first().click(); await p.waitForTimeout(1000); }
      eq(await p.evaluate(() => document.getElementById('e-docscope').value), 'full', '⚠⚠ reopened, the estimate follows the new tier: Full');
      has(await txt('#e-docscope-hint'), 'changed to Inventory with values after this estimate was saved, so it follows it here: priced at Full, where the saved copy is at Capture only. Save Estimate keeps it.',
          '⚠ and says why its price moved');
      // Not saved yet: Submit refuses the saved copy, still at the old tier.
      await press('#est-back', '← Back to client, without saving');
      await press('#client-dashboard-view .jt-next button[onclick="dashSubmitEstimate(' + idC + ')"]', 'Submit for approval, the saved copy still at Capture only');
      has(await txt('#dash-fb'), 'Cannot submit — the documentation tier on this client changed to Inventory with values after this estimate was saved, and it is still priced at Capture only.',
          '⚠⚠ Submit refuses a saved copy priced against the older tier');
      has(await txt('#dash-fb'), 'Open it with ✎ Edit estimate on the dashboard', 'and names the control on this screen that opens it');
      eq(await p.evaluate((id) => !!estimateStore[id].submitted, idC), false, 'and nothing went to the manager');
      const e2 = await p.locator(eSel).count();
      ok(e2 >= 1, '✎ Edit estimate reopens the draft (' + e2 + ')');
      if (e2 >= 1) { await p.locator(eSel).first().click(); await p.waitForTimeout(900); }
      eq(await p.evaluate(() => document.getElementById('e-docscope').value), 'full', 'still following the tier');
      await press(saveBtn, 'Save Estimate, at the new tier'); await p.waitForTimeout(1500);
      await press('#client-dashboard-view .jt-next button[onclick="dashSubmitEstimate(' + idC + ')"]', 'Submit for approval');
      eq(await p.evaluate((id) => [!!estimateStore[id].submitted, estimateStore[id].estimate.docScope], idC), [true, 'full'], 'now it goes, priced at Full');
    });

    // ── D. B21 on intake ─────────────────────────────────────────────────────────────────────────────────
    await section('D. intake marks the administration question required, on screen', async () => {
      await p.evaluate(() => { if (typeof closeClientDashboard === 'function') closeClientDashboard(); document.getElementById('btn-add-client').click(); });
      await p.waitForTimeout(300);
      await p.selectOption('#i-svc', 'cleanout'); await p.waitForTimeout(200);
      const mark = await p.evaluate(() => { const sel = document.getElementById('i-matter-type'); const lab = sel && sel.parentElement.querySelector('label');
        const star = lab && lab.querySelector('span'); return star ? [lab.textContent.trim(), star.checkVisibility(), getComputedStyle(star).color] : null; });
      eq(mark, ['How is this estate being administered? *', true, 'rgb(163, 45, 45)'], '⚠ the label carries the red mark, as the date of death beside it does');
      const dod = await p.evaluate(() => { const lab = document.getElementById('i-date-of-death').parentElement.querySelector('label span'); return lab ? getComputedStyle(lab).color : ''; });
      eq(dod, 'rgb(163, 45, 45)', 'the same red as its neighbour');
      await p.click('#panel-intake .screen-back'); await p.waitForTimeout(300);
    });

    // ── E. B23 and removeLogisticsLine on the Job Plan ─────────────────────────────────────────────────
    await section('E. the Job Plan\'s end-of-job vendor pairs each number with whom it reaches; Remove says what the quote does', async () => {
      await p.evaluate(() => {
        jobs.unshift({ id: 4801, hvlId: 'HVL-2609-E481', name: 'Gil Hart', fname: 'Gil', lname: 'Hart', svc: 'home_cleanout', sqft: '3000',
          addr: '5 Lake Trl', city: 'Palm Beach', zip: '33480', email: 'gil@example.com', phone: '(561) 555-0146', start: '2026-10-19',
          walkthrough: '2026-09-28', created: '2026-09-20', status: 'won', won: true, approved: true, tc: 'Anthony Graziano' });
        estimateStore[4801] = { approved: true, approvedBy: 'Anthony Graziano', estimate: { jobId: 4801, svc: 'home_cleanout', rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }],
          totTC: 40, totPS: 60, tcRate: 150, psRate: 100, havellinTotal: 12000, grandTotal: 12000, vendors: [], prepItems: [], collections: [], vehicles: [] } };
        saveJobs();
      });
      ok(await p.evaluate(() => openJobPlanFor(4801, 'vendors')), 'the Job Plan opens on the client');
      await p.waitForTimeout(800);
      const addSel = '#panel-job-plan select[onchange="addLogisticsLine(4801,this.value)"]';
      ok((await p.locator(addSel).count()) === 1, 'the plan offers an end-of-job vendor');
      await p.selectOption(addSel, 'dumpster'); await p.waitForTimeout(500);
      const vSel = '#panel-job-plan select[onchange="setLogisticsVendor(4801,\'dumpster\',this.value)"]';
      const vOpts = await p.evaluate((s) => { const e = document.querySelector(s); return e ? Array.from(e.options).map((o) => o.value + ':' + o.textContent.trim()) : null; }, vSel);
      ok(!!vOpts && vOpts.some((o) => /^5:/.test(o)), 'the Dumpster Rental line offers the directory\'s Acme Hauling (' + JSON.stringify(vOpts) + ')');
      await p.selectOption(vSel, '5'); await p.waitForTimeout(500);
      const card = await p.evaluate(() => { const s = document.querySelector('#panel-job-plan select[onchange="setLogisticsVendor(4801,\'dumpster\',this.value)"]');
        const c = s && s.closest('div[style*="border:1px solid var(--border)"]'); return c ? c.textContent.replace(/\s+/g, ' ').trim() : ''; });
      has(card, 'Acme Hauling · ☎ (561) 555-0100 office · Andy Ramirez ☎ (561) 555-0199 mobile · Bea Cole', '⚠⚠ the office line is the office\'s, and Andy\'s mobile is beside Andy');
      const tels = await p.evaluate(() => Array.from(document.querySelectorAll('#panel-job-plan a[href^="tel:"]')).map((a) => a.getAttribute('href')));
      ok(tels.indexOf('tel:5615550100') >= 0 && tels.indexOf('tel:5615550199') >= 0, 'both numbers dial (' + tels.join(', ') + ')');
      // A quote, then Remove.
      const qSel = '#panel-job-plan input[onchange="setLogisticsQuote(4801,\'dumpster\',this.value)"]';
      await p.fill(qSel, '1200'); await p.press(qSel, 'Tab'); await p.waitForTimeout(400);
      dialogs.length = 0;
      await press('#panel-job-plan button[onclick="removeLogisticsLine(4801,\'dumpster\')"]', 'Remove');
      has(dialogs.join(' | '), 'Acme Hauling comes off it, and its $1,200 quote comes off the vendor costs the invoices list.', '⚠ Remove says what the quote does');
      lacks(dialogs.join(' | '), 'no longer billed', 'not that Havellin stops billing what it never billed');
      eq(await p.evaluate(() => !!(jobs.find((j) => j.id === 4801).logisticsSourcing || {}).dumpster), false, 'and the line is removed');
    });

    // ── F. B24: the prep worksheet ─────────────────────────────────────────────────────────────────────
    await section('F. a Home Prep estimate with declutter hours files the vendor list and the hours', async () => {
      const id = await intake({ svc: 'prep', fname: 'Sam', lname: 'Prepper', walkPast: true });
      await toDash(id);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + id + ')"]', 'Build estimate');
      await p.waitForTimeout(800);
      const sub = await html('#vendors-card-sub');
      lacks(sub, 'no hours are billed', 'stale text: the prep vendor card no longer says no hours are billed');
      has(sub, 'declutter hours, where the house needs them, are quoted separately and billed as worked', 'it says declutter hours bill');
      const gi = await p.evaluate(() => VENDOR_GROUP_CARDS.findIndex((c) => c.group === 'Property Preparation'));
      await p.selectOption('#vgrp-cat-' + gi, 'Painting');
      await p.fill('#vgrp-cost-' + gi, '20000');
      await press('button[onclick="addFromVendorGroup(' + gi + ')"]', 'the card\'s +');
      await p.fill('#e-declutter-hrs', '5.5'); await p.waitForTimeout(300);
      await p.evaluate(() => { window.__ws = null; window.resolveSubfolderId = (job, name, cb) => { if (name === 'Estimates') cb('F-EST'); };
        window.uploadHtmlToDrive = (folder, name, h, cb) => { if (/Worksheet/.test(name)) window.__ws = { name, h }; if (cb) cb(true); }; });
      await press(saveBtn, 'Save Estimate');
      await p.waitForTimeout(2200);
      const ws = await p.evaluate(() => window.__ws);
      ok(!!ws, 'the save files the internal worksheet');
      const w = ws ? ws.h : '';
      has(w, '<th>Prep vendor line</th>', '⚠⚠ it files the vendor list the estimate quoted');
      has(w, 'Painting', 'with the painter');
      lacks(w, '<th>Room</th>', '⚠⚠ and no empty room table');
      // RESTATED 2026-10-01 (P17, Anthony's answer 6): billed hours are the quoted quarter hours, so 5.5 bill as 5.5 ($825; they billed
      // 6 whole hours, $900) and the total is $6,825 (it was $6,900); the "billed as" clause is said only where they differ.
      // RESTATED 2026-10-02 (P18, Anthony's answer B; re-measured on this page): estimates are whole hours, rounded up, and a typed 5.5
      // is SAVED as 6, so the worksheet quotes and bills 6 ($900) over a $6,900 total, with no "billed as" clause.
      has(w, 'Declutter hours (Transition Concierge):</strong> 6.0 quoted &times; $150/hr = $900', '⚠ the declutter hours as they bill');
      lacks(w, 'billed as', 'the hours quoted are the hours billed');
      has(w, 'Havellin Total:</strong> $6,900', 'over the total the fee and the hours make');
    });

    // ── G. the stale text, read off the page ──────────────────────────────────────────────────────────
    await section('G. the stale text says what is true, read off the page', async () => {
      // Premium and heirs on a Home Editing estimate.
      await toDash(idA);
      await p.evaluate((id) => { const b = document.querySelector('#client-dashboard-view button[onclick="dashGoEstimate(' + id + ')"],#client-dashboard-view button[onclick="dashEditEstimate(' + id + ')"]'); if (b) b.click(); }, idA);
      await p.waitForTimeout(900);
      // RESTATED 2026-10-01 (P17, Anthony's answer 1): Premium is the rates only. The toggle said it added 25 concierge hours, and did.
      has(await txt('#adj-pricing'), '$185 TC / $125 PS rates only. Coordination comes from the vendor lines you add, as on every job.', 'the Premium toggle says it is the rates only');
      const t0 = await p.evaluate(() => currentEstimate.totTC);
      await press('label.toggle:has(#e-prem)', 'Premium estate');
      const t1 = await p.evaluate(() => currentEstimate.totTC);
      eq(t1 - t0, 0, '⚠ and pressing it adds no hours');
      await press('label.toggle:has(#e-prem)', 'Premium estate, off again');
      has(await txt('#adj-heirs-sub'), 'about half of total concierge hours', 'on Home Editing the heirs uplift names half the concierge hours');
      await p.click('#est-back'); await p.waitForTimeout(400);
      // The prep plan's cards.
      await p.evaluate(() => {
        jobs.unshift({ id: 4802, hvlId: 'HVL-2609-P482', name: 'Nia Park', fname: 'Nia', lname: 'Park', svc: 'prep', sqft: '2800', addr: '3 Royal Palm Way',
          city: 'Palm Beach', zip: '33480', email: 'nia@example.com', phone: '(561) 555-0144', start: '2026-09-21', walkthrough: '2026-09-10',
          created: '2026-09-08', status: 'active', won: true, approved: true, agrSigned: true, agrSent: true, depositReceived: true, tc: 'Ashley Jerome',
          activatedOn: '2026-09-21', payments: [{ uid: 'd1', stage: 'deposit', amount: 450, date: '2026-09-15', method: 'wire', clearedOn: '2026-09-15' }] });
        estimateStore[4802] = { approved: true, approvedBy: 'Anthony Graziano', estimate: { jobId: 4802, svc: 'prep', prepEnabled: true,
          prepItems: [{ type: 'Staging', cost: 3000, lid: 'st1' }], prepCost: 3000, prepFee: 900, totTC: 0, totPS: 0, tcRate: 150, psRate: 100,
          havellinTotal: 900, grandTotal: 3900, vendors: [], rooms: [] } };
        saveJobs();
      });
      ok(await p.evaluate(() => openJobPlanFor(4802, 'vendors')), 'the prep Job Plan opens');
      await p.waitForTimeout(800);
      const plan = await txt('#panel-job-plan');
      // RESTATED 2026-10-01 (P17, Anthony's answer 5): the fee is the Home Sale Preparation Fee; this read "site management fee".
      has(plan, 'Havellin’s 30% Home Sale Preparation Fee is billed on the actual vendor spend logged here', '⚠ the budget card names the Home Sale Preparation Fee');
      has(plan, 'Havellin\'s 30% Home Sale Preparation Fee is calculated on these actuals', 'and the sourcing card');
      lacks(plan, 'GC / Site', 'not a GC fee');
      // The referral leaderboard.
      await p.evaluate(() => { const j = jobs.find((x) => x.id === 4801); j.refPartnerId = 'u-ann'; j.refPartnerName = 'Ann Lowe'; j.src = 'Estate attorney'; saveJobs(); });
      await p.click('.nb[onclick*="\'referrals\'"]'); await p.waitForTimeout(700);
      has(await txt('#referrals-leaderboard'), 'jobs attributed to each partner at intake or on Edit Client', 'the leaderboard says where attribution is set');
      // A job that took one working day.
      const d0 = await days(-6);
      await p.evaluate((d0) => {
        jobs.unshift({ id: 4803, hvlId: 'HVL-2609-S483', name: 'Ola Swift', fname: 'Ola', lname: 'Swift', svc: 'downsizing', sqft: '2000', addr: '8 Palm Way',
          city: 'Palm Beach', zip: '33480', email: 'ola@example.com', phone: '(561) 555-0147', start: d0, walkthrough: '2026-09-10', created: '2026-09-08',
          status: 'closed', won: true, approved: true, agrSigned: true, agrSent: true, depositReceived: true, tc: 'Ashley Jerome',
          activatedOn: d0, deliveredOn: d0, payments: [{ uid: 'd1', stage: 'deposit', amount: 4000, date: d0, method: 'wire', clearedOn: d0 }] });
        estimateStore[4803] = { approved: true, approvedBy: 'Anthony Graziano', estimate: { jobId: 4803, svc: 'downsizing', days: 6,
          rooms: [{ idx: 0, name: 'Kitchen', vol: 3, cplx: 3 }], totTC: 40, totPS: 60, tcRate: 150, psRate: 100, havellinTotal: 8000, grandTotal: 8000,
          vendors: [], prepItems: [], collections: [], vehicles: [] } };
        saveJobs();
      }, d0);
      await p.click('.nb[onclick*="showPanel(\'jobs\'"]'); await p.waitForTimeout(300);
      await toDash(4803);
      const sch = await txt('#client-dashboard-view .jt-sched');
      has(sch, '1 working day against a 6-day plan', '⚠ a job that took one working day says "1 working day"');
      lacks(sch, '1 working days', 'not "1 working days"');
    });

    // ── H. overflow, and errors ──────────────────────────────────────────────────────────────────────
    await section('H. overflow at 1440 and 390; no page errors', async () => {
      await toDash(idC);
      ok(await overflow() <= 0, 'the estate\'s dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 });
      await toDash(idC); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await press('#client-dashboard-view .d-util button[onclick="dashEditClient(' + idC + ')"]', 'Edit Client at 390');
      ok(await p.evaluate(() => document.getElementById('ec-notes').checkVisibility()), 'the notes box is on screen at 390');
      ok(await overflow() <= 0, 'the modal fits at 390 (' + await overflow() + ')');
      await p.evaluate(() => { document.getElementById('edit-client-modal').style.display = 'none'; });
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
