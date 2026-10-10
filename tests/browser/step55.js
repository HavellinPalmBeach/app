// Step 55 — P19 (W2, estate-docs): the documents a client, a trustee or a court reads, on a trust (2026-10-03; Anthony:
// "i'm good with all of your calls. build it all").
//
// Drives the REAL page through its own controls: Build Estimate (the band's Build estimate and the room checkboxes) prices
// each estate on the real engine; the Client Dashboard's View opens the signing packet and the viewer's Print / Save PDF
// prints it; the Job Admin & Inv tab's More menu prints the Trust Schedule and the Court Inventory. What is seeded is state
// a person could not type in one sitting: a won client whose estimate is approved, the trust and a co-trustee recorded
// (W1 builds those inputs), and an inventory on the desk. The jobs backend is answered by a route.
//
//   A. a TRUST-ONLY estate's agreement names the trust (The Adler Family Trust, dated March 3, 2015) and the decedent, a
//      Certification of Trust row, the Trustee's Attorney, no case number, no court and no "Estate of"; §6.3, §7.1 and the
//      signature page name the successor trustee; Daniel Adler has a Co-Signer block of his own; §5.4 No Purchase by
//      Havellin and the Disposition Ledger sentence are on it; Exhibit A in the same packet asks for the Certification of
//      Trust, routes proceeds to the trust account and names the Disposition Ledger, and never asks for Letters
//   B. the viewer's Print / Save PDF prints that packet, and under print media at Letter width it fits
//   C. More → Trust Schedule: the trust named under the decedent, one named line per trustee; it fits a Letter page
//   D. a PROBATE estate with a co-personal representative: More → Court Inventory gives two named adoption lines, and its
//      agreement keeps the probate words (Letters, case number, Estate Attorney, Client / Personal Representative)
//   E. an estate whose matter is UNANSWERED signs exactly the probate words
//   F. overflow at 1440 and 390 with the packet open and on the desk; no page errors
//
//   NODE_PATH=/opt/node22/lib/node_modules node tests/browser/step55.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');
const count = (t, n) => String(t).split(n).length - 1;

const SYNC = 'https://script.google.com/macros/s/STEP55/exec';
const HOUSE = ['Living Room', 'Kitchen', 'Dining Room', 'Primary Suite', 'Bedroom 2'];

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(SYNC + '**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, fileUrl: 'https://drive.google.com/file/d/f55/view', fileId: 'f55' }) }));
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1800);
    const hook = () => p.evaluate((u) => {
      SHEETS_SYNC_URL = u; window.open = function () { return null; }; window.__prints = window.__prints || [];
      window.print = function () { const pt = document.getElementById('print-target');
        const d = document.createElement('div'); d.innerHTML = (pt ? pt.innerHTML : '').replace(/<\/(td|th|div|p|li|tr)>/g, ' </$1>').replace(/<br>/g, ' ');
        window.__prints.push({ html: pt ? pt.innerHTML : '', text: d.textContent.replace(/\s+/g, ' '),
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth }); };
    }, SYNC);
    await hook();

    const section = async (name, body) => {
      console.log('\n## ' + name);
      await p.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; })).catch(() => {});
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(400); }
      return v;
    };
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const toDash = async (id) => { await p.evaluate((id) => goToClientDashboard(id), id); await p.waitForTimeout(500); };
    const est = () => p.evaluate(() => JSON.parse(JSON.stringify(currentEstimate || {})));
    const lastPrint = () => p.evaluate(() => (window.__prints || []).slice(-1)[0] || { html: '', text: '', over: 0 });
    // Text as a reader sees it: a cell boundary is a space (textContent runs adjacent cells together).
    const T = (h) => p.evaluate((h) => { const d = document.createElement('div'); d.innerHTML = String(h).replace(/<\/(td|th|div|p|li|tr)>/g, ' </$1>').replace(/<br>/g, ' ');
      return d.textContent.replace(/\s+/g, ' '); }, h);
    const viewerText = async () => T(await p.evaluate(() => { const v = document.getElementById('doc-viewer-body'); return v ? v.innerHTML : ''; }));
    const viewerHtml = () => p.evaluate(() => { const v = document.getElementById('doc-viewer-body'); return v ? v.innerHTML : ''; });
    const viewSel = (id, kind) => '#client-dashboard-view button[onclick="docAction(' + id + ',\'' + kind + '\',\'view\')"]';
    const tickHouse = async () => {
      const ids = await p.evaluate((names) => {
        const out = []; const used = new Set(); let ri = 0;
        ROOMS.forEach((sec) => sec.rooms.forEach((r) => { const id = 'r' + ri; ri++;
          const i = names.findIndex((n, k) => n === r.name && !used.has(k)); if (i >= 0) { used.add(i); out.push(id); } }));
        return out;
      }, HOUSE);
      const closed = await p.evaluate(() => Array.from(document.querySelectorAll('[id^="sec-body-"]')).filter((el) => el.style.display === 'none').map((el) => el.id.replace('sec-body-', '')));
      for (const si of closed) await p.click(`.sec-hdr.sec-toggle[onclick="toggleRoomSection(${si})"]`).catch(() => {});
      for (const id of ids) await p.click('#chk-' + id).catch(() => ok(false, 'tick ' + id));
      await p.waitForTimeout(300);
      return ids;
    };
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(700);
      const sel = await p.evaluate(() => (document.getElementById('inv-job') || {}).value);
      if (String(sel) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(700); }
    };

    // An estate client, priced on Build Estimate's real engine, then won with that estimate approved (the PIN and the Won
    // modal leave exactly this on a job). `extra` carries the matter, the trust and the co-representatives.
    const BASE = (id, extra) => Object.assign({ id, hvlId: 'HVL-2610-' + id, name: 'Margaret Doe', fname: 'Margaret', lname: 'Doe', svc: 'cleanout', sqft: '3200',
      addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', propVal: '2500000', deathDate: '2026-04-02', docTier: 'values', gate706: 'no',
      executor: 'Ruth Adler', executorRole: 'Personal Representative', executorEmail: 'ruth@example.com', executorPhone: '(561) 555-0101', executorAuth: 'pending',
      probateAttyName: 'Ann Lowe', probateAttyFirm: 'Lowe & Co', probateAttyPhone: '(561) 555-0102', probateAttyEmail: 'ann@lowe.law', probateCase: '2026-CP-001234',
      start: '2026-10-19', walkthrough: '2026-09-28', created: '2026-09-20', status: 'new', tc: 'Ashley Jerome', payments: [] }, extra || {});
    const priced = async (id, extra) => {
      await p.evaluate((j) => { jobs = jobs.filter((x) => x.id !== j.id); jobs.unshift(j); delete estimateStore[j.id]; saveJobs(); }, BASE(id, extra));
      await toDash(id);
      await press('#client-dashboard-view .jt-next button[onclick="dashGoEstimate(' + id + ')"]', 'the band\'s Build estimate (' + id + ')');
      await p.waitForTimeout(600);
      await tickHouse();
      const e = await est();
      ok(e && e.havellinTotal > 0, 'fixture: the real engine priced ' + id + ' ($' + (e && e.havellinTotal) + ')');
      await p.evaluate(([id, e]) => {
        const j = jobs.find((x) => x.id === id);
        Object.assign(j, { status: 'won', won: true, wonAt: '2026-09-29', wonBy: 'Anthony Graziano', wonMethod: 'call', approved: true, estimateSentDate: 'September 28, 2026' });
        estimateStore[id] = { estimate: Object.assign({}, e, { jobId: id }), approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: Date.now() };
        saveJobs();
      }, [id, e]);
      await toDash(id);
    };
    const openPacket = async (id) => {
      const sel = viewSel(id, 'agreement');
      const n = await p.locator(sel).count();
      if (!n) { ok(false, 'View the signing packet is offered on the dashboard (' + id + ')'); return { text: '', html: '' }; }
      await p.locator(sel).first().click(); await p.waitForTimeout(600);
      return { text: await viewerText(), html: await viewerHtml() };
    };
    const closeViewer = () => p.evaluate(() => closeDocViewer());
    const item = (sid, o) => Object.assign({ stableId: sid, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', category: 'Furniture',
      condition: 'Good', qty: '1', ts: Date.parse('2026-10-01T15:00:00Z'), updatedAt: Date.parse('2026-10-01T15:00:00Z'), reviewed: true }, o);

    // ── A. the trust-only estate's agreement and Exhibit A ────────────────────────────────────────────────────────
    const TRUST_ID = 5501;
    let A = { text: '', html: '' };
    await section('A. a trust-only estate\'s signing packet names the trust, the Certification, the trustee and the co-trustee', async () => {
      await priced(TRUST_ID, { matterType: 'trust', executorRole: 'Trustee', trustName: 'Adler Family Trust', trustDate: '2015-03-03',
        coFiduciaries: [{ id: 'c1', name: 'Daniel Adler', role: 'Trustee', email: 'dan@example.com' }] });
      A = await openPacket(TRUST_ID);
      ok(A.text.length > 20000, 'fixture: the packet is open in the viewer (' + A.text.length + ' chars)');
      // The agreement is the packet up to Exhibit A; §1.2 and §1.3 are its two tables.
      const agrH = A.html.slice(0, Math.max(0, A.html.indexOf('packet-exhibit')));
      ok(agrH.length > 20000, 'fixture: the agreement half of the packet (' + agrH.length + ')');
      const s12 = await T(A.html.slice(A.html.indexOf('1.2 Client / Authorized Party'), A.html.indexOf('1.3 Property')));
      const s13 = await T(A.html.slice(A.html.indexOf('1.3 Property'), A.html.indexOf('Scope of Services')));
      // RESTATED 2026-10-05 (P20, Q27; Anthony: "yes"): the trust's date is spelled out, as an instrument is cited; P19 printed
      // the app's short date, "Mar 3, 2015".
      has(s12, 'Trust The Adler Family Trust, dated March 3, 2015', '⚠⚠ §1.2: the party is the trust, named as the instrument');
      has(s12, 'Decedent Margaret Doe', 'with the decedent beside it');
      lacks(s12, 'Estate of', '⚠⚠ no "Estate of" as the party');
      has(s12, 'Certification of Trust Pending', '⚠⚠ the Certification of Trust row, Pending');
      lacks(s12, 'Letters of Administration', 'and no Letters row');
      has(s12, "Trustee's Attorney Ann Lowe", '⚠ the trustee\'s attorney');
      lacks(s13, 'Probate Case Number', '⚠⚠ no probate case number');
      lacks(agrH, '2026-CP-001234', 'though the record carries one from an earlier answer');
      lacks(agrH, '>Court</td>', 'and no court row');
      has(A.text, 'Section 5 · Authority, Trust & Legal Compliance', 'Section 5 names the trust');
      has(A.text, 'Notify Client / successor trustee within 24 hours of discovery', '⚠⚠ §6.3 notifies the successor trustee');
      has(A.text, 'anyone the successor trustee authorizes in writing — counsel, the appraiser. It is retained', '⚠⚠ §7.1: the trustee authorizes, no court');
      has(A.text, 'Havellin will provide them to the successor trustee, to counsel of record', '§7.1: the records go to the trustee');
      has(A.html, '>Client / successor trustee</div>', '⚠⚠ the signature page is headed Client / successor trustee');
      lacks(A.text, 'Client / Personal Representative', 'never Client / Personal Representative');
      has(A.html, '>Co-Signer</div>', '⚠⚠ the co-trustee has a Co-Signer block');
      has(A.html, '<div class="sig-label">Daniel Adler</div>', 'with his name printed');
      lacks(A.text, 'co-PR', 'and nobody is called a co-PR');
      has(A.text, 'The Client acts together with the co-representative named on the signature page.', '§5.1 states his joinder');
      has(A.text, '5.4 No Purchase by Havellin', '⚠⚠ §5.4 is on the form');
      has(A.text, 'will not purchase or otherwise acquire any of the contents of the property', 'staff never buy');
      has(A.text, 'Havellin delivers the Disposition Ledger, the Project Records’ final statement of where every item went, to the successor trustee for review and signature.', '§7.1 names the Disposition Ledger');
      // Exhibit A, in the same packet.
      has(A.text, 'the successor trustee’s Certification of Trust, with any limits on the trustee’s powers noted in writing', '⚠⚠ Exhibit A asks the trustee for the Certification of Trust');
      has(A.text, 'we do not need the will or the trust instrument itself', 'and not for the instrument');
      lacks(A.text, 'Letters of Administration or Testamentary', '⚠⚠ and never for Letters');
      has(A.text, 'routed to the trust account', '⚠ proceeds go to the trust account');
      has(A.text, 'Sign-off on the Disposition Ledger, the final record of where every item went.', 'the close-out names the Disposition Ledger');
      lacks(A.text, 'claimed as exempt', 'no exempt-property claim off the probate track');
      ok(await overflow() <= 0, 'the open packet fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 }); await p.waitForTimeout(200);
    });

    // ── B. print it ───────────────────────────────────────────────────────────────────────────────────────────────
    await section('B. the viewer\'s Print / Save PDF prints the packet, and it fits a Letter page in print', async () => {
      await toDash(TRUST_ID);
      await openPacket(TRUST_ID);
      const before = await p.evaluate(() => (window.__prints || []).length);
      await press('#doc-viewer-print', 'Print / Save PDF on the viewer');
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === before; i++) await p.waitForTimeout(150);
      const pr = await lastPrint();
      ok(pr.html.length > 20000, 'the packet reached the print target (' + pr.html.length + ')');
      // Under print media at Letter width, through the same print path (the viewer's button is not on a printed page).
      await p.waitForTimeout(800); await hook();
      await p.setViewportSize({ width: 816, height: 1056 });
      await p.emulateMedia({ media: 'print' });
      await p.evaluate((id) => docAction(id, 'agreement', 'print'), TRUST_ID);
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) < before + 2; i++) await p.waitForTimeout(150);
      const pp = await lastPrint();
      ok(pp.html.length > 20000 && pp.over <= 0, '⚠ the packet fits a Letter page in print (' + pp.over + ')');
      has(pr.text, 'Client / successor trustee', 'the printed page names the trustee');
      has(pr.html, '<div class="sig-label">Daniel Adler</div>', 'and carries the co-trustee\'s block');
      has(pr.text, '5.4 No Purchase by Havellin', 'and §5.4');
      await p.emulateMedia({ media: 'screen' });
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.waitForTimeout(800); await hook();
    });

    // ── C. the Trust Schedule, from the desk ──────────────────────────────────────────────────────────────────────
    await section('C. More → Trust Schedule names the trust and gives each trustee a line; it fits a Letter page', async () => {
      await p.evaluate((id) => {
        _photoRefs[id] = [
          { stableId: 'a1', label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', category: 'Furniture', objectName: 'Chesterfield sofa', condition: 'Good', qty: '1', fmv: '4000', valSource: 'Comparable', assetTrack: 'Trust', reviewed: true, ts: 1, updatedAt: 1 },
          { stableId: 'a2', label: 'inventory', collId: null, roomIdx: 1, seq: 2, status: 'uploaded', category: 'Furniture', objectName: 'Dining suite', condition: 'Good', qty: '1', fmv: '9000', valSource: 'Comparable', assetTrack: 'Trust', reviewed: true, ts: 2, updatedAt: 2 }];
        try { savePhotoRefs(id); } catch (e) {}
        const j = jobs.find((x) => x.id === id); j.status = 'active'; j.activatedOn = '2026-10-01'; saveJobs();
      }, TRUST_ID);
      await toDesk(TRUST_ID);
      await press('#inv-workbar details > summary', 'More');
      const before = await p.evaluate(() => (window.__prints || []).length);
      await press('#inv-workbar button[onclick="printTrustSchedule(' + TRUST_ID + ')"]', 'Trust Schedule');
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === before; i++) await p.waitForTimeout(150);
      const pr = await lastPrint();
      ok(pr.html.indexOf('Schedule of Tangible Personal Property Held in Trust') >= 0, 'fixture: the Trust Schedule printed');
      // RESTATED 2026-10-05 (P20, Q27): the month spelled out, as on the agreement.
      has(pr.text, 'The Adler Family Trust, dated March 3, 2015', '⚠⚠ the header names the trust');
      // RESTATED (2026-10-10): the schedule heads with the trust (the one party rule), the decedent in brackets after it.
      ok(pr.text.indexOf('The Adler Family Trust') < pr.text.indexOf('Margaret Doe'), 'the trust heads the page, the decedent after it');
      eq(count(pr.text, 'Received for the trust’s records by'), 2, '⚠⚠ two trustees recorded: two lines');
      has(pr.text, 'Ruth Adler · Successor Trustee', 'the representative named under hers');
      has(pr.text, 'Daniel Adler · Successor Trustee', 'and the co-trustee under his');
      // Under print media at Letter width, through the same printer.
      await p.waitForTimeout(800); await hook();
      await p.setViewportSize({ width: 816, height: 1056 });
      await p.emulateMedia({ media: 'print' });
      const b2 = await p.evaluate(() => (window.__prints || []).length);
      await p.evaluate((id) => printTrustSchedule(id), TRUST_ID);
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === b2; i++) await p.waitForTimeout(150);
      const pp = await lastPrint();
      ok(pp.html.indexOf('The Adler Family Trust') >= 0 && pp.over <= 0, '⚠ it fits a Letter page in print (' + pp.over + ')');
      await p.emulateMedia({ media: 'screen' });
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.waitForTimeout(800); await hook();
      ok(await overflow() <= 0, 'the desk fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
      await p.setViewportSize({ width: 1440, height: 1000 });
    });

    // ── D. a probate estate with a co-personal representative ──────────────────────────────────────────────────────
    const PRO_ID = 5502;
    await section('D. a probate estate: two named adoption lines on the Court Inventory, and the probate words on its agreement', async () => {
      await priced(PRO_ID, { matterType: 'probate', name: 'Harold Finch', fname: 'Harold', lname: 'Finch',
        coFiduciaries: [{ id: 'c1', name: 'Paul Finch', role: 'Personal Representative', email: 'paul@example.com' }] });
      const P = await openPacket(PRO_ID);
      const p12 = await T(P.html.slice(P.html.indexOf('1.2 Client / Authorized Party'), P.html.indexOf('1.3 Property')));
      has(p12, 'Estate Estate of Harold Finch', 'the party is the estate');
      has(p12, 'Letters of Administration Pending', 'the Letters row');
      has(P.text, 'Probate Case Number 2026-CP-001234', 'the case number');
      has(p12, 'Estate Attorney Ann Lowe', 'the estate attorney');
      has(P.html, '>Client / Personal Representative</div>', 'the Client / Personal Representative signature page');
      has(P.html, '<div class="sig-label">Paul Finch</div>', 'and the co-personal representative\'s block');
      has(P.text, '5.4 No Purchase by Havellin', '§5.4 on a probate form too');
      await closeViewer();
      await p.evaluate((id) => {
        _photoRefs[id] = [{ stableId: 'p1', label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded', category: 'Furniture', objectName: 'Walnut desk', condition: 'Good', qty: '1', fmv: '6000', valSource: 'Comparable', reviewed: true, ts: 1, updatedAt: 1 }];
        try { savePhotoRefs(id); } catch (e) {}
      }, PRO_ID);
      await toDesk(PRO_ID);
      await press('#inv-workbar details > summary', 'More');
      const before = await p.evaluate(() => (window.__prints || []).length);
      await press('#inv-workbar button[onclick="printCourtInventory(' + PRO_ID + ')"]', 'Court Inventory');
      for (let i = 0; i < 20 && (await p.evaluate(() => (window.__prints || []).length)) === before; i++) await p.waitForTimeout(150);
      const pr = await lastPrint();
      ok(pr.html.indexOf('Estate Inventory — Tangible Personal Property') >= 0, 'fixture: the Court Inventory printed');
      eq(count(pr.text, 'Reviewed and adopted by'), 2, '⚠⚠ two personal representatives: two adoption lines');
      has(pr.text, 'Ruth Adler · Personal Representative / authorized fiduciary', 'each named');
      has(pr.text, 'Paul Finch · Personal Representative / authorized fiduciary', 'the co-personal representative too');
      await p.waitForTimeout(800); await hook();
    });

    // ── E. an unanswered matter signs the probate words ───────────────────────────────────────────────────────────
    await section('E. an estate whose matter is unanswered signs exactly the probate words', async () => {
      const UN_ID = 5503, PB_ID = 5504;
      await priced(UN_ID, { name: 'Iris Vale', fname: 'Iris', lname: 'Vale' });
      const U = await openPacket(UN_ID); await closeViewer();
      await priced(PB_ID, { name: 'Iris Vale', fname: 'Iris', lname: 'Vale', matterType: 'probate' });
      const Pb = await openPacket(PB_ID); await closeViewer();
      const norm = (t) => t.replace(/HVL-2610-55\d\d/g, 'HVL').replace(/550[34] Ocean Blvd/g, 'ADDR');
      ok(U.text.length > 20000, 'fixture: both packets opened');
      eq(norm(U.text) === norm(Pb.text), true, '⚠⚠ the unanswered packet reads word for word as the probate one (ids and addresses aside)');
      ['Letters of Administration Pending', 'Probate Case Number', 'Estate Attorney', 'Notify Client / Personal Representative within 24 hours of discovery',
       'anyone the Personal Representative authorizes in writing — counsel, the appraiser, the court.', '(if applicable — second beneficiary or co-PR)']
        .forEach((w) => has(U.text, w, 'unanswered keeps: ' + w.slice(0, 60)));
    });

    // ── F. errors ─────────────────────────────────────────────────────────────────────────────────────────────────
    await section('F. no page errors', async () => {
      await toDash(TRUST_ID);
      ok(await overflow() <= 0, 'the trust client\'s dashboard fits at 1440 (' + await overflow() + ')');
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
      ok(await overflow() <= 0, 'and at 390 (' + await overflow() + ')');
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
