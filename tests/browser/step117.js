// Step 117 — firearms go only to a licensed dealer (P4, 2026-10-27; the desk audit, audits/2026-10-27-desk/PLAN.md: EST-02,
// FLD-01, REL-03, REL-04, REL-15, FLD-07, LIV-05, SYN-14). Anthony's Ask 4, the same day: *"it's always safer for the client
// just to take it, but I'm not going to mandate that they take it in a locked case … They put it in a backpack in their
// trunk. There's nothing wrong with that."*
//
// Drives the REAL page: an active probate estate whose Job Plan has Kodner Galleries (an auction house) and Goodwill
// confirmed, with four shotguns, a lamp and a rug in the garage, a rifle sold to Goodwill (typed), a clock and a Colt revolver
// approved to the daughter, and a flintlock pistol filed under Antiques; and a living Home Transition with a shotgun kept, a
// revolver going to the new home and a rifle sold to a licensed dealer. The Vendor Directory lists Jupiter Gun Exchange under
// Firearms Dealer (FFL).
//   A. The bulk bar: the four shotguns, the lamp and the rug ticked, Set disposition… Donate: the lamp and the rug go to
//      Donate, the shotguns stay as they were, and the bar says "4 firearms left as they were"; Set recipient Goodwill: the
//      same.
//   B. A shotgun's own Where it goes offers no Donate and no Junk; the lamp's does.
//   C. A shotgun put on Auction through its row: the Job Plan's Kodner does not fill Who takes it, and the row reads
//      "no licensed dealer". Another put on Sell. The Approval Request (the work bar's, on screen) reads "licensed dealer not
//      named yet" for both; Jupiter Gun Exchange typed into one's Who takes it box (a directory dealer): the request names it.
//   D. The rifle on Sell to Goodwill: its record reads Not cleared to carry, Goodwill being no licensed dealer, and its box
//      suggests the directory's dealers; Jupiter typed: Cleared to carry, to Jupiter.
//   E. The custody dialog on the Colt: it opens on Choose…; Add event with nothing chosen records nothing; Released to Uncle
//      Bob asks first (the protocol, and what the gate says), Cancel records nothing, OK records it.
//   F. The Releases bar: the daughter's row carries the clock and not the revolver; Print receipt prints the clock and not
//      the revolver; Jupiter Gun Exchange has its own row with File the dealer's receipt (#7).
//   G. The flintlock's record: Category set to Firearms: its row and open record repaint by id (Firearms, the Firearm block)
//      with no full render.
//   H. The Job Plan's banner reads FIREARMS IN THIS HOUSE — found on site, naming the shotgun and its room; the Garage's
//      room screen carries the firearm line; the desk's Urgent strip too.
//   I. The living job: the kept shotgun and the revolver to the new home read "client takes it" in grey, never held; their
//      record says the client takes it themselves and names no case; no Firearms held chip; the shotgun is offered New home
//      and no Donate or Junk; the rifle sold to Jupiter has the dealer's row with File the dealer's receipt (#3).
//   K–O, the review's findings (2026-10-27):
//   K. The living job: with the rifle sold to a dealer the Job Plan's banner keeps the crew's rule; the rifle put on Keep through
//      its row, every firearm stays with the client and the banner says the client takes it themselves (Ask 4).
//   L. The kept shotgun put on Hold through its row: its record says it is going to no dealer, with the client's own choices, and
//      never sends anyone to Record approval (LIV-05).
//   M. The estate: the walkthrough's "Dad's hunting gear" (donate) joined to a photographed shotgun by Use that line: the question
//      says Donate is not carried onto a firearm, and the shotgun stays Undecided.
//   N. The Colt going to the daughter: Through a licensed dealer… answered "Goodwill Palm Beach" is refused and records nothing;
//      answered with the directory's Jupiter Gun Exchange, the route is recorded and the row reads via Jupiter.
//   O. The Vendor Directory unread (a cold device): the shotgun sold to Jupiter reads "dealer not yet checked", never "is not a
//      licensed dealer"; the directory lands from its web app while the desk is on screen, and the desk is drawn again with it.
//   J. 1440 and 390 px: no horizontal overflow; zero page errors.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step117.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const SYNC = 'https://sync.example.test/exec';
const VSYNC = 'https://vendors.example.test/exec';
const J = 11701, L = 11702;
const ME = 'Ashley Jerome';
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    let sheet = {};
    await ctx.route(SYNC + '**', async (r) => {
      const req = r.request();
      const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (req.method() === 'POST') return json({ ok: true });
      if (/action=loadMedia/.test(req.url())) return json({ ok: true, media: sheet });
      return json({ ok: true });
    });
    // The Vendor Directory's web app (section O): the directory the seed lists.
    const DIR = [
      { vendor_name: 'Jupiter Gun Exchange', category: 'Firearms Dealer (FFL)', status: 'Active' },
      { vendor_name: 'Goodwill Palm Beach', category: 'Donation Organization', status: 'Active' },
      { vendor_name: 'Kodner Galleries', category: 'Auction House', status: 'Active' }];
    await ctx.route(VSYNC + '**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, vendors: DIR }) }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    // Every dialog is answered as a person would; `answer` says what the next confirm gets.
    const said = []; let answer = true; let promptAnswer = null;
    p.on('dialog', async (d) => {
      said.push({ type: d.type(), m: d.message() });
      if (d.type() === 'prompt' && promptAnswer !== null) return d.accept(promptAnswer);
      await (d.type() === 'confirm' && !answer ? d.dismiss() : d.accept());
    });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => {
      SHEETS_SYNC_URL = u;
      window.open = function () { return null; };
      window.__prints = [];
      window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); };
    }, SYNC);

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const press = async (sel, what) => {
      const n = await p.locator(sel).count();
      const v = n >= 1 && await vis(sel);
      ok(v, (what || sel) + ' — on screen (' + n + ')');
      if (v) { await p.locator(sel).first().click({ timeout: 5000 }).catch((e) => ok(false, (what || sel) + ' — ' + e.message.split('\n')[0])); await p.waitForTimeout(700); }
      return v;
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const val = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const line = (j, id) => p.evaluate(([j, id]) => { const r = (_photoRefs[j] || []).find((x) => x.stableId === id) || {};
      return { disp: r.disposition || '', ch: r.channel || '', from: r.channelFrom || '', cat: r.category || '', log: (r.custodyLog || []).filter((e) => !e.deletedAt).map((e) => e.action + ' · ' + e.party) }; }, [j, id]);
    const opts = (j, id) => p.evaluate(([j, id]) => { const s = document.querySelector('#inv-row-' + id + ' .inv-c-disp select'); return s ? [...s.options].map((o) => o.value).filter(Boolean) : null; }, [j, id]);
    const toDesk = async (id) => {
      await p.evaluate((id) => { setCurrentJob(id); populateInventorySelect(); }, id);
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(900);
      if (String(await val('#inv-job')) !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(900); }
      await p.evaluate(() => { _invCloudSeen = _invCloudSeen || {}; });
      if (await p.locator('#panel-inventory button[onclick="setInvWhen(\'all\')"]').count()) { await p.click('#panel-inventory button[onclick="setInvWhen(\'all\')"]'); await p.waitForTimeout(600); }
    };
    const openRec = async (id) => {
      if (!(await p.locator('#inv-row-' + id + ' .inv-c-open').count())) return false;
      const open = await p.evaluate((id) => !!_invOpen[id], id);
      if (!open) await press('#inv-row-' + id + ' .inv-c-open', 'the record of ' + id);
      return true;
    };
    const releasesOpen = async (j) => {
      const shown = await p.evaluate((j) => { const el = document.getElementById('desk-body-releases-' + j); return !!el && el.style.display !== 'none'; }, j);
      if (!shown) await press('#desk-hd-releases-' + j, 'the Releases bar');
    };
    const viewerOpen = () => p.evaluate(() => { const o = document.getElementById('doc-viewer-modal'); return !!o && o.style.display === 'flex'; });
    const typeWho = async (id, v) => {
      const sel = '#inv-row-' + id + ' input.inv-recip';
      ok(await vis(sel), 'the Who takes it box of ' + id + ' is on screen');
      await p.fill(sel, v); await p.press(sel, 'Tab'); await p.waitForTimeout(800);
    };

    // ── Seed ──
    sheet = await p.evaluate(([J, L, ME]) => {
      try { localStorage.setItem('hav_device_user', ME); } catch (e) {}
      vendorDirectory = [
        { vendor_name: 'Jupiter Gun Exchange', category: 'Firearms Dealer (FFL)', status: 'Active' },
        { vendor_name: 'Goodwill Palm Beach', category: 'Donation Organization', status: 'Active' },
        { vendor_name: 'Kodner Galleries', category: 'Auction House', status: 'Active' }];
      try { localStorage.setItem('hav_vendor_dir', JSON.stringify(vendorDirectory)); } catch (e) {}
      const T = Date.now() - 2 * 86400000;
      const base = (id, o) => Object.assign({ id, hvlId: 'HVL-2610-F' + id, addr: id + ' Ocean Blvd', city: 'Palm Beach', zip: '33480', ptype: 'Single Family Home',
        status: 'active', won: true, wonAt: '2026-10-01', approved: true, tc: ME, created: '2026-09-28', start: '2026-10-12', activatedOn: '2026-10-10',
        agrApproved: true, agrSent: true, agrSigned: true, docState: {}, at: {},
        driveFolder: 'https://drive.google.com/drive/folders/R' + id, driveSubfolders: { 'Estate Inventory': 'INV' + id, 'As-Found Record': 'AF' + id, 'Signed Records': 'SR' + id },
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 12000, receivedOn: '2026-10-08', method: 'wire', clearedOn: '2026-10-08' }] }, o);
      jobs.unshift(base(L, { name: 'Margaret Hale', fname: 'Margaret', lname: 'Hale', svc: 'downsizing_move', email: 'meg@example.com', phone: '5615550100',
        destAddr: '801 Sunset Ave', destCity: 'Jupiter', destSqft: 1600 }));
      jobs.unshift(base(J, { name: 'Walter Price', fname: 'Walter', lname: 'Price', svc: 'probate', matterType: 'probate', executor: 'Ruth Price', executorFname: 'Ruth',
        executorLname: 'Price', executorRole: 'Personal Representative', executorEmail: 'ruth@example.com', executorPhone: '(561) 555-0142', deathDate: '2026-08-01',
        executorAuth: 'received', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', probateCase: '50-2026-CP-001234', docTier: 'values', gate706: 'no',
        vendorSourcing: { Lv1: { status: 'Confirmed', vendorName: 'Kodner Galleries' } },
        logisticsSourcing: { donation: { status: 'Confirmed', vendorName: 'Goodwill Palm Beach' } } }));
      const est = (id, svc, vendors) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: id, svc, havellinTotal: 24000, fixedPrice: true, fixedAmount: 24000, fixedLines: true, totTC: 60, totPS: 90, days: 5,
          vendors: vendors || [], prepItems: [], rooms: [{ idx: 1, name: 'Garage', st: 'in', vol: 3, cplx: 3 }, { idx: 2, name: 'Study', st: 'in', vol: 3, cplx: 3 }] } });
      estimateStore[J] = est(J, 'probate', [{ lid: 'v1', type: 'Auction House' }]);
      estimateStore[L] = est(L, 'downsizing_move');
      const item = (j, id, n, name, o) => Object.assign({ stableId: id, itemNo: n, label: 'inventory', collId: null, roomIdx: 1, seq: n, status: 'uploaded', ts: T + n * 60000,
        filename: 'HVL_' + j + '_Garage_INV_' + n + '.jpg', driveFileId: 'F' + j + id, driveFileUrl: 'https://drive.google.com/file/d/F' + j + id + '/view',
        objectName: name, namedBy: 'desk', category: 'General/Household', disposition: '', qty: 1, condition: 'Good', updatedAt: T + n * 60000 }, o);
      const gun = (j, id, n, name, o) => item(j, id, n, name, Object.assign({ category: 'Firearms', serial: 'SN' + n }, o));
      const appr = { authBy: 'Ruth Price', approvalDate: '2026-10-12' };
      _photoRefs[J] = [
        gun(J, 'g1', 1, 'Remington 870 shotgun'), gun(J, 'g2', 2, 'Remington 870 shotgun'), gun(J, 'g3', 3, 'Remington 870 shotgun'), gun(J, 'g4', 4, 'Remington 870 shotgun'),
        item(J, 'l5', 5, 'Brass floor lamp'), item(J, 'l6', 6, 'Wool area rug'),
        gun(J, 'g7', 7, 'Browning rifle', Object.assign({ disposition: 'Sell', channel: 'Goodwill Palm Beach' }, appr)),
        item(J, 'c8', 8, 'Mantel clock', Object.assign({ roomIdx: 2, disposition: 'Distribute', channel: 'Margaret Price' }, appr)),
        gun(J, 'g9', 9, 'Colt revolver', Object.assign({ roomIdx: 2, disposition: 'Distribute', channel: 'Margaret Price' }, appr)),
        item(J, 'p10', 10, 'Flintlock pistol', { roomIdx: 2, category: 'Antiques', disposition: 'Sell', channel: 'Jupiter Gun Exchange', serial: 'FL10', fmv: 1200 }),
        item(J, 's11', 11, 'Pine bench', { roomIdx: 2 })];
      const lappr = { authBy: 'Margaret Hale', approvalDate: '2026-10-12' };
      _photoRefs[L] = [
        gun(L, 'k1', 1, 'Mossberg shotgun', { disposition: 'Keep' }), gun(L, 'm2', 2, 'Ruger revolver', { disposition: 'Move' }),
        gun(L, 'r3', 3, 'Winchester rifle', Object.assign({ disposition: 'Sell', channel: 'Jupiter Gun Exchange' }, lappr))];
      savePhotoRefs(J); savePhotoRefs(L);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      const out = {}; [J, L].forEach((id) => { out[id] = { items: JSON.parse(localStorage.getItem('hav_media_' + id) || '[]') }; }); return out;
    }, [J, L, ME]);

    // ── A ───────────────────────────────────────────────────────────────────
    await section('A. the bulk bar skips the four shotguns and says so', async () => {
      await toDesk(J);
      for (const id of ['g1', 'g2', 'g3', 'g4', 'l5', 'l6']) {
        const sel = '#inv-row-' + id + ' input[onchange^="_invTogglePick"]';
        ok(await vis(sel), 'the pick box of ' + id + ' is on screen');
        await p.click(sel); await p.waitForTimeout(250);
      }
      const menu = '#inv-bulk-' + J + ' select[onchange*="\'disposition\'"]';
      ok(await vis(menu), 'Set disposition… is on the bulk bar');
      await p.selectOption(menu, 'Donate'); await p.waitForTimeout(900);
      const d = {}; for (const id of ['g1', 'g2', 'g3', 'g4', 'l5', 'l6']) d[id] = (await line(J, id)).disp;
      eq(d, { g1: '', g2: '', g3: '', g4: '', l5: 'Donate', l6: 'Donate' }, '⚠⚠ EST-02: the shotguns stay as they were; the lamp and the rug go to Donate');
      const msg = await p.evaluate(() => (_invBulkLast || {}).msg || '');
      has(msg, 'Donate set on 2 items', 'the bar says what it set');
      has(msg, '4 firearms left as they were', '⚠ and how many firearms it left');
      has(msg, 'a firearm goes only to a licensed dealer', 'and why');
      // Set recipient Goodwill across what is still picked (the shotguns, the lamp and the rug).
      const still = await p.evaluate(() => Object.keys(_invPick).sort());
      eq(still, ['g1', 'g2', 'g3', 'g4', 'l5', 'l6'], 'fixture: the selection is still picked');
      await p.fill('#inv-bulk-recip', 'Goodwill Palm Beach');
      await press('#inv-bulk-' + J + ' button[onclick*="\'channel\'"]', 'Set recipient');
      eq([(await line(J, 'g1')).ch, (await line(J, 'l5')).ch], ['', 'Goodwill Palm Beach'], '⚠ a recipient swept across the selection never lands on a firearm');
      await p.evaluate(() => { _invClearPicks(); });
      await p.waitForTimeout(500);
    });

    // ── B ───────────────────────────────────────────────────────────────────
    await section('B. a shotgun\'s own Where it goes offers no Donate and no Junk', async () => {
      const g = await opts(J, 'g1');
      ok(!!g, 'the shotgun\'s select is on its row');
      eq(g, ['Auction', 'Consign', 'Distribute', 'Hold', 'Keep', 'Sell'], '⚠⚠ a dealer, a person through one, Hold or Keep');
      const l = await opts(J, 'l5');
      ok((l || []).indexOf('Donate') >= 0 && (l || []).indexOf('Junk') >= 0, 'the lamp\'s offers Donate and Junk, as before');
    });

    // ── C ───────────────────────────────────────────────────────────────────
    await section('C. the Job Plan\'s Kodner never fills a shotgun; the request reads "licensed dealer not named yet" until one is named', async () => {
      await p.selectOption('#inv-row-g2 .inv-c-disp select', 'Auction'); await p.waitForTimeout(900);
      const g2 = await line(J, 'g2');
      eq([g2.disp, g2.ch, g2.from], ['Auction', '', ''], '⚠⚠ FLD-01: on Auction the plan\'s Kodner is not its recipient');
      has(await txt('#inv-row-g2'), 'no licensed dealer', 'and the row says it has no licensed dealer');
      // A bench on Auction still takes Kodner (the rule is the firearm's alone).
      await p.selectOption('#inv-row-s11 .inv-c-disp select', 'Auction'); await p.waitForTimeout(900);
      eq([(await line(J, 's11')).ch, (await line(J, 's11')).from], ['Kodner Galleries', 'plan'], 'the bench on Auction takes the plan\'s Kodner, as before');
      await p.selectOption('#inv-row-g1 .inv-c-disp select', 'Sell'); await p.waitForTimeout(900);
      const reqSel = '#inv-workbar button[onclick="printApprovalRequest(' + J + ')"]';
      // Kodner typed by hand onto the shotgun on Auction: a name, and no licensed dealer.
      await typeWho('g2', 'Kodner Galleries');
      has(await txt('#inv-row-g2'), 'no licensed dealer', 'Kodner typed by hand is still no licensed dealer');
      await typeWho('g1', 'Jupiter Gun Exchange');
      eq((await line(J, 'g1')).ch, 'Jupiter Gun Exchange', 'the dealer typed is recorded');
      lacks(await txt('#inv-row-g1'), 'no licensed dealer', '⚠ and the row no longer says it has none, at once');
      await press(reqSel, 'the work bar\'s Approval Request');
      ok(await viewerOpen(), 'the request is on screen');
      const body = await txt('#doc-viewer-body');
      has(body, 'Serial SN2 · licensed dealer not named yet', '⚠⚠ the shotgun going to Kodner reads no dealer');
      lacks(body, 'to Kodner Galleries, a licensed dealer', 'Kodner is nobody\'s dealer');
      has(body, 'Serial SN1 · to Jupiter Gun Exchange, a licensed dealer', '⚠ the dealer a person named is printed');
      has(body, '1 of them has no serial or no dealer recorded yet', 'the authority block counts the one not covered');
      await press('#doc-viewer-modal button[onclick="closeDocViewer()"]', 'Close');
    });

    // ── D ───────────────────────────────────────────────────────────────────
    await section('D. the rifle sold to Goodwill: not cleared to carry until a licensed dealer is named', async () => {
      await openRec('g7');
      let rec = await txt('#inv-row-g7');
      has(rec, 'Not cleared to carry: No dealer named — Goodwill Palm Beach is not a licensed dealer on the Vendor Directory', '⚠⚠ EST-02: Goodwill is no dealer');
      lacks(rec, 'Cleared to carry. Havellin', 'and the record never clears it');
      has(await p.evaluate(() => (document.querySelector('#inv-row-g7 input.inv-recip') || {}).getAttribute('list')), 'inv-ffl-list-' + J, 'its box suggests the directory\'s dealers');
      has(await p.evaluate((j) => { const d = document.getElementById('inv-ffl-list-' + j); return d ? [...d.options].map((o) => o.value).join('|') : ''; }, J), 'Jupiter Gun Exchange', 'Jupiter among them');
      await typeWho('g7', 'Jupiter Gun Exchange');
      await openRec('g7');
      rec = await txt('#inv-row-g7');
      has(rec, 'Cleared to carry. Havellin’s named principal alone takes it to Jupiter Gun Exchange', 'a licensed dealer named: cleared to carry');
    });

    // ── E ───────────────────────────────────────────────────────────────────
    await section('E. the custody dialog opens on Choose… and asks before the Colt is Released', async () => {
      await openRec('g9');
      await press('#inv-row-g9 button[onclick^="openCustodyModal(' + J + ',\'g9\')"]', 'Chain of custody');
      eq(await val('#cust-action'), '', '⚠⚠ REL-04: it opens on Choose…');
      eq(await txt('#cust-action option[value=""]'), 'Choose…', 'in those words');
      await p.fill('#cust-party', 'Uncle Bob Price'); await p.fill('#cust-date', '2026-10-25');
      let n = said.length;
      await press('#custody-modal button[onclick="addCustodyEvent()"]', 'Add event');
      eq((await line(J, 'g9')).log, [], 'nothing chosen: nothing recorded');
      has((said[n] || {}).m, 'Choose what happened', 'and it says what to choose');
      await p.selectOption('#cust-action', 'Released');
      answer = false; n = said.length;
      await press('#custody-modal button[onclick="addCustodyEvent()"]', 'Add event');
      const q = (said[n] || {}).m || '';
      eq((said[n] || {}).type, 'confirm', '⚠⚠ a firearm Released is asked first');
      has(q, '#9 Colt revolver is a firearm.', 'naming it');
      has(q, 'nobody else carries one out, family included', 'with the protocol');
      has(q, 'Not cleared to carry:', 'and what the gate says of it');
      eq((await line(J, 'g9')).log, [], 'Cancel: nothing recorded');
      answer = true;
      await press('#custody-modal button[onclick="addCustodyEvent()"]', 'Add event');
      eq((await line(J, 'g9')).log, ['Released · Uncle Bob Price'], 'OK: recorded as it happened');
      eq(await val('#cust-action'), '', 'and the dialog is back on Choose…');
      await press('#custody-modal button[onclick="closeCustodyModal()"]', 'Close');
      // Voided again so the receipts below read the line as approved, not gone.
      await p.evaluate(([j]) => { const r = _photoRefs[j].find((x) => x.stableId === 'g9'); (r.custodyLog || []).forEach((e) => { e.deletedAt = Date.now(); }); savePhotoRefs(j); renderInventoryTab(); }, [J]);
      await p.waitForTimeout(500);
    });

    // ── F ───────────────────────────────────────────────────────────────────
    await section('F. no beneficiary receipt lists a firearm; the dealer has its own row', async () => {
      await releasesOpen(J);
      const rows = await p.evaluate(() => [...document.querySelectorAll('#inv-releases .inv-leaving-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
      const meg = rows.filter((t) => t.indexOf('Margaret Price') === 0)[0] || '';
      has(meg, '#8', 'the daughter\'s row carries the clock');
      lacks(meg, '#9', '⚠⚠ REL-03: and never the revolver');
      const before = await p.evaluate(() => window.__prints.length);
      await press('#inv-releases button[onclick^="printBeneficiaryReceipt("]', 'Print receipt');
      const printed = await p.evaluate((n) => (window.__prints[n] || '').replace(/<[^>]+>/g, ' '), before);
      has(printed, 'Mantel clock', 'the receipt prints the clock');
      lacks(printed, 'Colt revolver', '⚠⚠ and not the revolver');
      const jup = rows.filter((t) => t.indexOf('Jupiter Gun Exchange') === 0)[0] || '';
      has(jup, '(licensed dealer', 'the dealer has its own row');
      has(jup, 'File the dealer’s receipt (#7', '⚠⚠ REL-15: with File the dealer\'s receipt for the rifle');
    });

    // ── G ───────────────────────────────────────────────────────────────────
    await section('G. the flintlock filed as Firearms in its record: the row and the record repaint by id', async () => {
      await openRec('p10');
      await p.evaluate(() => { window.__renders = 0; if (!window.__origRender) { window.__origRender = renderInventoryTab; window.renderInventoryTab = function () { window.__renders++; return window.__origRender.apply(this, arguments); }; } });
      const cat = '#inv-row-p10 select[onchange*="\'category\'"]';
      ok(await vis(cat), 'the record\'s Category select');
      await p.selectOption(cat, 'Firearms'); await p.waitForTimeout(900);
      const t = await txt('#inv-row-p10');
      has(t, 'Firearms ·', '⚠⚠ SYN-14: the row reads Firearms at once');
      has(t, '⚠ held', 'with the held warning');
      has(t, 'Not cleared to carry: No written authority on file', 'and its open record carries the Firearm block');
      eq(await p.evaluate(() => window.__renders), 0, 'by id: no full render');
      await p.evaluate(() => { if (window.__origRender) { window.renderInventoryTab = window.__origRender; delete window.__origRender; } });
    });

    // ── H ───────────────────────────────────────────────────────────────────
    await section('H. a firearm found on site lights the Job Plan, the room and the desk', async () => {
      has(await txt('#desk-alerts-' + J), 'Firearm found on this job (#1 Remington 870 shotgun · Garage', '⚠⚠ FLD-07: the desk\'s Urgent strip');
      await p.evaluate((j) => { setCurrentJob(j); }, J);
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(1200);
      const banner = await txt('#panel-job-plan .fa-banner');
      has(banner, 'FIREARMS IN THIS HOUSE — found on site', '⚠⚠ the Job Plan\'s banner lights');
      has(banner, 'Found on site: #1 Remington 870 shotgun · Garage', 'naming the line and its room');
      const room = '#panel-job-plan button.rl-row[onclick="openRoomWorkspace(' + J + ',1)"]';
      if (await press(room, 'the Garage on the room list')) {
        has(await txt('#room-ws .fa-line'), 'Firearm found on this job', '⚠⚠ the room\'s screen carries the line');
        await press('#room-ws button[onclick="closeRoomWorkspace()"]', '← Rooms');
      }
    });

    // ── I ───────────────────────────────────────────────────────────────────
    await section('I. a living client\'s own firearm: the client takes it, in grey, never held (Ask 4)', async () => {
      await toDesk(L);
      const k = await txt('#inv-row-k1');
      has(k, 'client takes it', '⚠⚠ LIV-05: the kept shotgun reads the client takes it');
      lacks(k, 'held', 'never held');
      eq(await p.evaluate(() => { const s = document.querySelector('#inv-row-k1 .inv-fa-client'); return s ? getComputedStyle(s).color : ''; }),
        await p.evaluate(() => { const s = document.createElement('span'); s.style.color = 'var(--gray-dk)'; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; }), 'in grey');
      has(await txt('#inv-row-m2'), 'client takes it', 'the revolver to the new home too');
      await openRec('m2');
      const rec = await txt('#inv-row-m2');
      has(rec, 'The client takes it themselves: Havellin and the movers never carry it.', 'the record says who takes it');
      lacks(rec, 'Not cleared to carry', 'never as a refusal');
      lacks(rec, 'locked case', 'and prescribes no case');
      has(await txt('#panel-inventory button[onclick="setInvFlag(\'firearm\')"]'), 'Firearms held 0', 'the Firearms held chip counts none');
      const ko = await opts(L, 'k1');
      ok((ko || []).indexOf('Move') >= 0 && (ko || []).indexOf('Donate') < 0 && (ko || []).indexOf('Junk') < 0, 'New home offered, Donate and Junk not');
      await releasesOpen(L);
      const rows = await p.evaluate(() => [...document.querySelectorAll('#inv-releases .inv-leaving-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
      const jup = rows.filter((t) => t.indexOf('Jupiter Gun Exchange') === 0)[0] || '';
      has(jup, 'File the dealer’s receipt (#3', '⚠⚠ REL-15: on a client\'s own home too');
    });

    // ── K ───────────────────────────────────────────────────────────────────
    await section('K. the living job\'s banner: the crew\'s rule while a firearm goes to a dealer; the client\'s once every one stays with them', async () => {
      const toPlan = async (j) => { await p.evaluate((j) => { setCurrentJob(j); }, j); await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(1200); };
      await toPlan(L);
      let banner = await txt('#panel-job-plan .fa-banner');
      has(banner, 'FIREARMS IN THIS HOUSE — found on site', 'the banner lights on the living job');
      has(banner, 'family included', 'with the rifle sold to a dealer, the crew\'s rule');
      await toDesk(L);
      await p.selectOption('#inv-row-r3 .inv-c-disp select', 'Keep'); await p.waitForTimeout(900);
      eq((await line(L, 'r3')).disp, 'Keep', 'the rifle put on Keep through its row');
      await toPlan(L);
      banner = await txt('#panel-job-plan .fa-banner');
      has(banner, 'The client takes it themselves: Havellin and the movers never carry it. Photograph it where it lies, and tell the concierge the same day.', '⚠⚠ every firearm stays with the client: the banner says so (Ask 4)');
      lacks(banner, 'family included', 'and drops "let nobody carry one out — family included"');
      lacks(banner, 'locked case', 'and names no container');
      await toDesk(L);
    });

    // ── L ───────────────────────────────────────────────────────────────────
    await section('L. the kept shotgun put on Hold: going to no dealer, never "press Record approval" (LIV-05)', async () => {
      await p.selectOption('#inv-row-k1 .inv-c-disp select', 'Hold'); await p.waitForTimeout(900);
      eq((await line(L, 'k1')).disp, 'Hold', 'on Hold through its row');
      await openRec('k1');
      const rec = await txt('#inv-row-k1');
      has(rec, 'Not cleared to carry: Not going to a dealer — choose Auction, Consign or Sell to a licensed dealer, or To a person through one; or Keep or New home, which the client takes themselves.', '⚠⚠ the record says where it can go');
      lacks(rec, 'Record approval once the signed authority is back', 'and never the dead end');
    });

    // ── M ───────────────────────────────────────────────────────────────────
    await section('M. Use that line never carries the walkthrough\'s Donate onto a shotgun', async () => {
      // The walkthrough recorded "Dad's hunting gear" for donation (state a person could not type in one sitting: the estimate).
      await p.evaluate((j) => { estimateStore[j].estimate.collections = [{ id: 51, name: "Dad's hunting gear", disp: 'donate', qty: 1 }]; }, J);
      await toDesk(J);
      const cl = await p.evaluate((j) => { const r = (_photoRefs[j] || []).find((x) => x.sourceCollId === 51 && !x.deletedAt); return r ? { id: r.stableId, disp: r.disposition } : null; }, J);
      ok(!!cl, 'the collection is on the inventory by itself');
      eq((cl || {}).disp, 'Donate', 'marked Donate, as the walkthrough said');
      if (!cl) return;
      await openRec(cl.id);
      const pick = '#coll-use-' + cl.id;
      ok(await vis(pick), 'its record offers the photographed lines');
      await p.selectOption(pick, 'g3');
      const n = said.length;
      await press('#inv-row-' + cl.id + ' button[onclick^="collectionUseLine("]', 'Use that line');
      has((said[n] || {}).m, 'is a firearm, so the walkthrough’s Donate is not carried onto it: A firearm is never donated.', '⚠⚠ the question says so before anything is written');
      const g3 = await p.evaluate((j) => { const r = _photoRefs[j].find((x) => x.stableId === 'g3'); return { coll: r.sourceCollId, disp: r.disposition || '' }; }, J);
      eq(g3, { coll: 51, disp: '' }, '⚠⚠ the shotgun takes the link and stays Undecided, never Donate');
      const o = await opts(J, 'g3');
      ok(!!o && o.indexOf('Donate') < 0, 'and its row still offers no Donate');
    });

    // ── N ───────────────────────────────────────────────────────────────────
    await section('N. the Colt\'s dealer route: Goodwill refused, the directory\'s Jupiter recorded', async () => {
      await openRec('g9');
      const btn = '#inv-row-g9 button[onclick="invSetDealerRoute(' + J + ',\'g9\',true)"]';
      promptAnswer = 'Goodwill Palm Beach';
      let n = said.length;
      await press(btn, 'Through a licensed dealer…');
      has((said[n] || {}).m, 'Licensed dealers on the Vendor Directory: Jupiter Gun Exchange.', 'the prompt lists the directory\'s dealers');
      has(said.slice(n).map((x) => x.m).join(' | '), 'Goodwill Palm Beach is not a licensed dealer on the Vendor Directory', '⚠⚠ Goodwill typed as the route is refused, by name');
      eq(await p.evaluate((j) => (_photoRefs[j].find((x) => x.stableId === 'g9') || {}).viaDealer || '', J), '', 'and nothing is recorded');
      lacks(await txt('#inv-row-g9'), 'through Goodwill', 'the record names no route through Goodwill');
      promptAnswer = 'jupiter gun exchange';
      await openRec('g9');
      await press(btn, 'Through a licensed dealer… again');
      eq(await p.evaluate((j) => (_photoRefs[j].find((x) => x.stableId === 'g9') || {}).viaDealer || '', J), 'Jupiter Gun Exchange', 'the directory\'s dealer is recorded as the directory names it');
      has(await txt('#inv-row-g9'), 'via Jupiter Gun Exchange', 'and the row reads via Jupiter');
      promptAnswer = null;
    });

    // ── O ───────────────────────────────────────────────────────────────────
    await section('O. the Vendor Directory unread: "dealer not yet checked", and the desk drawn again when it lands', async () => {
      await p.evaluate(() => { vendorDirectory = []; try { localStorage.removeItem('hav_vendor_dir'); } catch (e) {} renderInventoryTab(); });
      await p.waitForTimeout(600);
      const row = await txt('#inv-row-g1');
      has(row, 'dealer not yet checked', '⚠ the shotgun sold to Jupiter reads "dealer not yet checked"');
      lacks(row, 'no licensed dealer', 'never "no licensed dealer"');
      const why = await p.evaluate(() => { const s = document.querySelector('#inv-row-g1 .inv-fa-nodealer'); return s ? s.getAttribute('title') : ''; });
      has(why, 'Dealer not yet checked — the Vendor Directory has not loaded on this device, so Jupiter Gun Exchange cannot be checked', 'its reason says why');
      await openRec('g1');
      lacks(await txt('#inv-row-g1'), 'is not a licensed dealer', 'and its record never says it is not one: no negative from an empty store');
      // The directory's web app answers while the desk is on screen (as at boot on a cold device).
      await p.evaluate((u) => { VENDOR_SYNC_URL = u; loadVendorDirectory(); }, VSYNC);
      await p.waitForTimeout(1500);
      eq(await p.evaluate(() => vendorDirectory.length), 3, 'the directory lands');
      const after = await txt('#inv-row-g1');
      lacks(after, 'dealer not yet checked', '⚠ the desk is drawn again: the dealer is checked');
      lacks(after, 'no licensed dealer', 'and Jupiter is its licensed dealer');
    });

    // ── J ───────────────────────────────────────────────────────────────────
    await section('J. 1440 and 390 px: no horizontal overflow; no page errors', async () => {
      eq(await overflow(), 0, 'no horizontal overflow at 1440 px');
      await p.setViewportSize({ width: 390, height: 860 }); await p.waitForTimeout(700);
      await toDesk(J);
      eq(await overflow(), 0, 'no horizontal overflow at 390 px');
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close().catch(() => {});
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }
})();
