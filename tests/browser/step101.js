// Step 101 — The Close-out card's vendor scorecard: grey until the close, red at it (Q92, 2026-10-23).
//
// Anthony, asked how the ratings should look before the close: *"Grey until the close (Recommended): Mid-job they read 'Not
// rated yet' in grey; they turn red ('required to close the job') once the job reaches the close. Close job still refuses
// until every vendor is rated."*
//
// Drives the REAL page with two active probate estates, each with two vendors confirmed on the Job Plan: one mid-job (a room
// still to clear), one at the close (every room cleared and the midpoint paid: the Close-out stage). On each, Job Admin & Inv
// through its own nav button and the client through its picker: the Closing the job bar (shut and grey mid-job, pressed open
// by its header; open by itself at the close, naming the vendors in red), the Close-out card inside it (each unrated vendor
// "Not rated yet" in grey mid-job, "Not rated — required to close the job" in red at the close, the count over the scorecard
// and the card's header count in the same tone, the computed colours read off the page), a star pressed with the mouse (the
// card repaints itself and the one still unrated keeps its tone, on the desk and in the bar's line); then the Job Plan
// through its nav button: the Close-out stage's copy of the card in the same tone; then Close job, pressed in the band,
// refusing on the mid-job estate as it always did, naming the vendors. At 1440 and 390 px: no horizontal overflow; zero page
// errors throughout.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step101.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const VENDORS = 'https://vendors.example.test/exec';
const MID = 9811, END = 9812;

(async () => {
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    // The Vendor Directory's web app answers every write, so a star's save lands and its row reads Saved (not this step's subject).
    const dirWrites = [];
    await ctx.route(VENDORS + '**', async (r) => {
      if (r.request().method() === 'POST') dirWrites.push(String(r.request().postData() || ''));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/loadVendors/.test(r.request().url()) ? { ok: true, vendors: [] } : { ok: true }) });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const said = []; p.on('dialog', async (d) => { said.push(d.message()); await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate((u) => { VENDOR_SYNC_URL = u; try { localStorage.setItem('hav_device_user', 'Ashley Jerome'); } catch (e) {} }, VENDORS);
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
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    // ── Seed: two active probate estates, two vendors confirmed on each ──
    await p.evaluate(([MID, END]) => {
      const T = Date.now() - 6 * 86400000;
      vendorDirectory = [{ _row: 2, vendor_name: 'Ace Movers', category: 'Movers' }, { _row: 3, vendor_name: 'Bee Haulers', category: 'Junk Removal' }];
      const est = (id) => ({ approved: true, submitted: true, approvedBy: 'Anthony Graziano', savedAt: T,
        estimate: { jobId: id, svc: 'probate', havellinTotal: 40000, fixedPrice: true, fixedAmount: 40000, fixedLines: true, totTC: 100, totPS: 150, tcRate: 150, psRate: 100, days: 8,
          vendors: [], prepItems: [], pkgCost: 0, rooms: [{ idx: 0, name: 'Living Room', st: 'in', vol: 3, cplx: 3 }, { idx: 1, name: 'Kitchen', st: 'in', vol: 3, cplx: 3 }] } });
      const job = (id, name, extra) => Object.assign({ id, hvlId: 'HVL-2610-Q' + id, name, svc: 'probate', matterType: 'probate', addr: id + ' Via Bellaria', city: 'Palm Beach', zip: '33480',
        executor: 'Thomas ' + name.split(' ')[1], executorRole: 'Personal Representative', executorEmail: 'pr' + id + '@example.com', deathDate: '2026-04-02', executorAuth: 'received',
        probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', docTier: 'values', gate706: 'yes', status: 'active', won: true, wonAt: '2026-09-25', approved: true,
        tc: 'Ashley Jerome', created: '2026-09-20', start: '2026-10-06', activatedOn: '2026-10-05', agrApproved: true, agrSent: true, agrSigned: true, sqft: 4200,
        driveFolder: 'https://drive.google.com/drive/folders/R' + id, at: {},
        docState: { agreement: { sentAt: '2026-09-26T14:00:00Z', sig: { signedBy: 'Thomas', signedAt: '2026-09-28' } }, 'invoice:deposit': { sentAt: '2026-09-29T14:00:00Z' } },
        vendorSourcing: { m: { vendorId: 2, vendorName: 'Ace Movers', status: 'Confirmed' }, n: { vendorId: 3, vendorName: 'Bee Haulers', status: 'Confirmed' } },
        payments: [{ uid: 'd' + id, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' }] }, extra || {});
      const item = (id, sid) => ({ stableId: sid, itemNo: 1, label: 'inventory', roomIdx: 0, status: 'uploaded', category: 'Furniture', objectName: 'Walnut sideboard', namedBy: 'desk',
        disposition: 'Keep', ts: T, updatedAt: T, filename: 'HVL_' + id + '_INV_' + sid + '.jpg', driveFileId: 'f-' + sid, driveFileUrl: 'https://drive.google.com/file/d/f-' + sid + '/view' });
      // Mid-job: the Living Room locked, the Kitchen cleared (In the house / Midpoint, never the close).
      jobs.unshift(job(MID, 'Eleanor Ashworth'));
      estimateStore[MID] = est(MID);
      jobPlanStore[MID] = { rooms: { 0: { status: 'locked' }, 1: { status: 'cleared' } }, tasks: {}, at: {} };
      _photoRefs[MID] = [item(MID, 'm1')]; savePhotoRefs(MID);
      // At the close: every room cleared and the midpoint paid (the Close-out stage), still active.
      jobs.unshift(job(END, 'Harold Pemberton', { payments: [
        { uid: 'd' + END, stage: 'deposit', amount: 20000, receivedOn: '2026-10-01', method: 'wire', clearedOn: '2026-10-01' },
        { uid: 'm' + END, stage: 'midpoint', amount: 10000, receivedOn: '2026-10-15', method: 'wire', clearedOn: '2026-10-15' }] }));
      estimateStore[END] = est(END);
      jobPlanStore[END] = { rooms: { 0: { status: 'cleared' }, 1: { status: 'cleared' } }, tasks: {}, at: {} };
      _photoRefs[END] = [item(END, 'e1')]; savePhotoRefs(END);
      saveJobs(); localStorage.setItem('havellin_est_v4', JSON.stringify(estimateStore));
      _logsState = 'ready';
    }, [MID, END]);

    // The desk through its own nav button; a client through its own picker.
    const toDesk = async (id) => {
      await p.click('.nb[onclick*="\'inventory\'"]'); await p.waitForTimeout(800);
      const cur = String(await p.evaluate(() => (document.getElementById('inv-job') || {}).value));
      if (cur !== String(id)) { await p.selectOption('#inv-job', String(id)); await p.waitForTimeout(1000); }
    };
    const toPlan = async (id) => {
      await p.click('.nb[onclick*="\'job-plan\'"]'); await p.waitForTimeout(900);
      const cur = await p.evaluate(() => document.getElementById('plan-job').value);
      if (String(cur) !== String(id)) { await p.selectOption('#plan-job', String(id)); await p.waitForTimeout(900); }
    };
    // What a scorecard on screen shows: each row's words and colours (computed), the count's colour, the header count's.
    const readCard = (host, id) => p.evaluate(([host, id]) => {
      const box = document.getElementById('closeout-' + host + '-' + id);
      if (!box) return null;
      const probe = (v) => { const s = document.createElement('span'); s.style.color = v; box.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
      const GREY = probe('var(--gray)'), RED = probe('var(--err-tx)'), OK = probe('var(--ok-tx)');
      const name = (c) => (c === RED ? 'red' : c === GREY ? 'grey' : c === OK ? 'green' : c);
      const rows = Array.from(box.querySelectorAll('.co-vendor')).map((r) => {
        const word = Array.from(r.querySelectorAll('span')).find((s) => /Not rated|Saved to the Vendor Directory|Saving to|Rated here/.test(s.textContent) && !s.querySelector('span'));
        return { vendor: r.querySelector('strong').textContent.trim(), says: word ? word.textContent.trim() : '', tone: word ? name(getComputedStyle(word).color) : '',
          border: name(getComputedStyle(r).borderTopColor) };
      });
      const cnt = Array.from(box.querySelectorAll('.co-meta span')).find((s) => / rated$/.test(s.textContent.trim()));
      const meta = document.getElementById('closeout-meta-' + host + '-' + id);
      const metaRed = meta ? Array.from(meta.querySelectorAll('span')).some((s) => getComputedStyle(s).color === RED) : null;
      const anyRed = Array.from(box.querySelectorAll('*')).filter((el) => el.offsetParent !== null || el.checkVisibility())
        .some((el) => getComputedStyle(el).color === RED && el.textContent.trim() && !/not yet saved/.test(el.textContent));
      return { rows, count: cnt ? [cnt.textContent.trim(), name(getComputedStyle(cnt).color)] : null,
        meta: meta ? [meta.textContent.replace(/\s+/g, ' ').trim(), metaRed ? 'red' : name(getComputedStyle(meta).color)] : null, anyRed,
        shown: box.checkVisibility(), line: (box.querySelector('.co-meta') || {}).textContent || '' };
    }, [host, id]);
    const barLine = (id) => p.evaluate((id) => Array.from(document.querySelectorAll('#desk-stat-closing-' + id + ' span'))
      .map((s) => [s.textContent.trim(), s.className.replace('desk-st-', '')]), id);
    const barOpen = (id) => p.evaluate((id) => { const b = document.getElementById('desk-body-closing-' + id); return !!b && b.style.display !== 'none'; }, id);

    // ── A ─────────────────────────────────────────────────────────────────────────────────────
    await section('A. mid-job, the desk: the Closing bar shut and grey; pressed open, "Not rated yet" in grey, nothing red', async () => {
      await toDesk(MID);
      ok(await vis('#desk-hd-closing-' + MID), 'the Closing the job bar is on the desk');
      eq(await barOpen(MID), false, 'mid-job: shut');
      const line = await barLine(MID);
      eq(line.filter((x) => /rated/.test(x[0])).length, 0, 'its line names no vendor before the close');
      eq([...new Set(line.map((x) => x[1]))], ['grey'], 'and every part is grey: ' + line.map((x) => x[0]).join(' · '));
      await press('#desk-hd-closing-' + MID, 'the Closing the job bar\'s header');
      eq(await barOpen(MID), true, 'pressed: open');
      const c = await readCard('admin', MID);
      ok(c && c.shown, 'the Close-out card is on screen inside it');
      eq((c && c.rows || []).map((r) => [r.vendor, r.says, r.tone]), [['Ace Movers', 'Not rated yet', 'grey'], ['Bee Haulers', 'Not rated yet', 'grey']],
        '⚠⚠ each unrated vendor reads "Not rated yet" in grey');
      ok(c && c.rows.every((r) => r.border !== 'red'), 'no row in a red border');
      eq(c && c.count, ['0 of 2 rated', 'grey'], 'the count over the scorecard grey');
      has(c && c.line, 'required before the job can close', 'and the card still says ratings are required to close, as plain information');
      eq(c && c.meta, ['0 of 3 done · 0 of 2 vendors rated', 'grey'], 'the card\'s header count grey');
      eq(c && c.anyRed, false, '⚠ nothing on the card is red');
    });

    // ── B ─────────────────────────────────────────────────────────────────────────────────────
    await section('B. mid-job, a star pressed: the card repaints itself, the vendor still unrated stays grey, the bar stays grey', async () => {
      await press('#closeout-admin-' + MID + ' .co-vendor >> nth=0 >> .co-star >> nth=3', 'four stars on Ace Movers');
      await p.waitForTimeout(600);
      const c = await readCard('admin', MID);
      eq((c && c.rows || []).map((r) => [r.vendor, r.says, r.tone]),
        [['Ace Movers', '✓ Saved to the Vendor Directory', 'green'], ['Bee Haulers', 'Not rated yet', 'grey']], 'Ace Movers saved; Bee Haulers still "Not rated yet", grey');
      eq(c && c.count, ['1 of 2 rated', 'grey'], 'the count moves and stays grey');
      eq(c && c.meta, ['0 of 3 done · 1 of 2 vendors rated', 'grey'], 'the header count moves and stays grey');
      eq(c && c.anyRed, false, 'nothing red after the press');
      ok(dirWrites.some((w) => /rateVendor/.test(w)), 'the star saved itself to the Vendor Directory');
      eq([...new Set((await barLine(MID)).map((x) => x[1]))], ['grey'], 'the bar\'s line still grey');
      eq(await p.evaluate((id) => (jobs.find((j) => j.id === id).vendorRatings || {})[2].rating, MID), 4, 'the rating is on the job');
    });

    // ── C ─────────────────────────────────────────────────────────────────────────────────────
    await section('C. mid-job, the Job Plan: the Close-out stage\'s card in the same grey', async () => {
      await toPlan(MID);
      ok(await vis('#closeout-plan-' + MID), 'the Close-out card is on the Job Plan\'s Close-out stage');
      const c = await readCard('plan', MID);
      eq((c && c.rows || []).map((r) => [r.vendor, r.says, r.tone]),
        [['Ace Movers', '✓ Saved to the Vendor Directory', 'green'], ['Bee Haulers', 'Not rated yet', 'grey']], '⚠⚠ "Not rated yet" in grey on the Job Plan too');
      eq(c && c.count, ['1 of 2 rated', 'grey'], 'the count grey');
      eq(c && c.anyRed, false, 'nothing red on the stage\'s card');
    });

    // ── D ─────────────────────────────────────────────────────────────────────────────────────
    await section('D. Close job still refuses mid-job, naming the vendor not rated', async () => {
      await toDesk(MID);
      said.length = 0;
      await press('#panel-inventory button:has-text("Close job")', 'Close job, in the band');
      await p.waitForTimeout(500);
      has(said.join(' | '), 'Cannot close the job yet', '⚠⚠ Close job refuses');
      has(said.join(' | '), 'Bee Haulers', 'naming the vendor still unrated');
      eq(await p.evaluate((id) => jobs.find((j) => j.id === id).status, MID), 'active', 'and the job stays active');
      eq(await barOpen(MID), true, 'the Closing bar is open behind the refusal');
      const c = await readCard('admin', MID);
      eq((c && c.rows || [])[1] && [c.rows[1].says, c.rows[1].tone], ['Not rated yet', 'grey'], 'the card still grey: the refusal is not the close');
    });

    // ── E ─────────────────────────────────────────────────────────────────────────────────────
    await section('E. at the close, the desk: the Closing bar open by itself, the vendors named in red; the card red', async () => {
      await toDesk(END);
      eq(await barOpen(END), true, 'at the close: the Closing bar opens by itself');
      const line = await barLine(END);
      eq(line[0], ['2 vendors not yet rated', 'red'], '⚠⚠ its line opens with the vendors, in red, as the scorecard is');
      const c = await readCard('admin', END);
      eq((c && c.rows || []).map((r) => [r.vendor, r.says, r.tone, r.border]),
        [['Ace Movers', 'Not rated — required to close the job', 'red', 'red'], ['Bee Haulers', 'Not rated — required to close the job', 'red', 'red']],
        '⚠⚠ each unrated vendor reads "Not rated — required to close the job" in red, in a red border');
      eq(c && c.count, ['0 of 2 rated', 'red'], 'the count red');
      eq(c && c.meta, ['0 of 3 done · 0 of 2 vendors rated', 'red'], 'the header count red with it');
      await press('#closeout-admin-' + END + ' .co-vendor >> nth=0 >> .co-star >> nth=4', 'five stars on Ace Movers');
      await p.waitForTimeout(600);
      const c2 = await readCard('admin', END);
      eq((c2 && c2.rows || []).map((r) => [r.vendor, r.says, r.tone]),
        [['Ace Movers', '✓ Saved to the Vendor Directory', 'green'], ['Bee Haulers', 'Not rated — required to close the job', 'red']], 'after the press: the one still unrated stays red');
      eq(c2 && c2.count, ['1 of 2 rated', 'red'], 'the count red');
      eq(c2 && c2.meta, ['0 of 3 done · 1 of 2 vendors rated', 'red'], 'the header count red');
      eq((await barLine(END))[0], ['1 vendor not yet rated', 'red'], 'and the bar\'s line follows the press, still red');
    });

    // ── F ─────────────────────────────────────────────────────────────────────────────────────
    await section('F. at the close, the Job Plan: the Close-out stage\'s card red', async () => {
      await toPlan(END);
      const c = await readCard('plan', END);
      ok(c && c.shown, 'the Close-out card is on the stage');
      eq((c && c.rows || []).map((r) => [r.vendor, r.says, r.tone]),
        [['Ace Movers', '✓ Saved to the Vendor Directory', 'green'], ['Bee Haulers', 'Not rated — required to close the job', 'red']], '⚠⚠ red on the Job Plan at the close');
      eq(c && c.count, ['1 of 2 rated', 'red'], 'the count red');
      // Rated, the last one: the count green, nothing red.
      await press('#closeout-plan-' + END + ' .co-vendor >> nth=1 >> .co-star >> nth=2', 'three stars on Bee Haulers');
      await p.waitForTimeout(600);
      const c2 = await readCard('plan', END);
      eq(c2 && c2.count, ['2 of 2 rated', 'green'], 'every vendor rated: the count green');
      eq(c2 && c2.anyRed, false, 'nothing red');
    });

    // ── G ─────────────────────────────────────────────────────────────────────────────────────
    await section('G. both widths: no horizontal overflow with the card open; zero page errors', async () => {
      await toDesk(MID);
      for (const w of [1440, 390]) {
        await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(500);
        eq(await overflow(), 0, 'the desk at ' + w + ' px: no horizontal overflow');
        const c = await readCard('admin', MID);
        eq((c && c.rows || [])[1] && [c.rows[1].says, c.rows[1].tone], ['Not rated yet', 'grey'], w + ' px: still "Not rated yet" in grey');
      }
      await p.setViewportSize({ width: 1440, height: 1000 });
      eq(errs, [], 'zero page errors');
    });
  } catch (e) {
    fail++; console.log('  ✗ step101 threw: ' + (e && e.stack || e));
  } finally {
    if (b) await b.close();
  }
  console.log('\nstep101: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
