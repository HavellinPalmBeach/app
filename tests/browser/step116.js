// Step 116 — P2, only Havellin's devices reach the data (the desk audit of 2026-10-27, RT-01; backend 2026-10-27b).
//
// Drives the REAL page against the REAL main-sync.gs and saveInventory.gs, run whole in node over a fake spreadsheet, with
// every request the page makes to the jobs backend answered by the real doGet / doPost. A: the check is off (no key in Script
// Properties): a client saved with no key lands, and Settings says the Apps Script asks for no key yet. B: Anthony sets the key;
// the page reloads: the red banner says this device has no key, the cached client stays on the list, an edit is held with the
// chip saying why, and the sheet is untouched. C: the banner's Open Settings, a wrong key typed in the masked box: still held,
// the banner says the key is wrong. D: the right key typed as a phone types it (lower case, spaces): the held edit lands, and the
// page does NOT reload itself (P2's review): the banner turns green and offers Reload from the sheet; pressed while a write is
// still on its way it refuses and says why; pressed once it has landed it reloads, the banner is gone and Settings says Accepted.
// E: every request to the jobs backend after that carries the key once, nothing else does, and the key is nowhere on the page.
// F: 390 px, zero page errors. G: the order the manual recommends, on a second device: the key typed while the check is off
// (Settings: sent and not checked), the property set last: accepted at once, no banner, nothing held, an edit lands.
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step116.js [/abs/path/to/havellin.html]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
const ROOT = path.resolve(path.dirname(APP.replace(/^file:\/\//, '')));
let pass = 0, fail = 0;
let b = null;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, e, m) => ok(JSON.stringify(a) === JSON.stringify(e), m + '  [got ' + JSON.stringify(a) + ', want ' + JSON.stringify(e) + ']');
const has = (t, n, m) => ok(String(t).indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(String(t).indexOf(n) < 0, m + '  [present: ' + n + ']');

const SYNC = 'https://sync.example.test/exec';
const KEY = 'K7QM-3XWP-9TRA-HC4N-2ZBE';
const JOB = Date.parse('2026-10-20T14:00:00Z');   // a client's id is the moment it was made, after the sheet's ledger was born

// ── The server: the two .gs files, whole, over a fake spreadsheet ────────────────────────────────────────────
function fakeSheet(name) {
  const rows = [];
  return {
    _rows: rows,
    getName: () => name,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    getMaxRows: () => Math.max(1000, rows.length),
    appendRow(r) { rows.push(r.slice()); },
    deleteRow(n) { rows.splice(n - 1, 1); },
    deleteRows(n, k) { rows.splice(n - 1, k); },
    getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
    getRange(r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      return {
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const cells = []; for (let j = 0; j < nc; j++) cells.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(cells); } return out; },
        getValue() { const row = rows[r - 1] || []; return row[c - 1] === undefined ? '' : row[c - 1]; },
        setValue(v) { while (rows.length < r) rows.push([]); rows[r - 1][c - 1] = v; },
        setValues(v) { v.forEach((cells, i) => { while (rows.length < r + i) rows.push([]); cells.forEach((cell, j) => { rows[r - 1 + i][c - 1 + j] = cell; }); }); },
        clearContent() {
          for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; }
          while (rows.length > 1 && rows[rows.length - 1].every((x) => x === '' || x === undefined)) rows.pop();
        },
      };
    },
  };
}
function server() {
  const sheets = {};
  const props = { HAVELLIN_DEVICE_KEY: null };
  const log = [];
  const ctx = {
    console: { log() {}, error() {}, warn() {} }, JSON, Math, Date, String, Number, Object, Array, RegExp, Error,
    Logger: { log: (s) => log.push(String(s)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null), setProperty() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (t) => ({ setMimeType() { return this; }, getContent: () => t }) },
    SpreadsheetApp: { openById: () => ({ getName: () => 'fake', getSheetByName: (n) => sheets[n] || null, insertSheet(n) { sheets[n] = fakeSheet(n); return sheets[n]; } }) },
    DriveApp: { getFolderById() { throw new Error('no Drive here'); }, getFileById() { throw new Error('no Drive here'); } },
    Utilities: { base64Encode: (s) => Buffer.from(String(s)).toString('base64') },
  };
  vm.createContext(ctx);
  const gs = fs.readFileSync(path.join(ROOT, 'apps-script', 'main-sync.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'apps-script', 'saveInventory.gs'), 'utf8');
  vm.runInContext(gs, ctx, { filename: 'main-sync.gs + saveInventory.gs' });
  return {
    ctx, sheets, props, log,
    jobsOnSheet() { try { return ctx.getJobsFromSheet(); } catch (e) { return null; } },
    exec(method, q, body) {
      const e = { parameter: q };
      if (method === 'POST') e.postData = { contents: body };
      const out = method === 'POST' ? ctx.doPost(e) : ctx.doGet(e);
      return out && typeof out.getContent === 'function' ? out.getContent() : JSON.stringify(out);
    },
  };
}

(async () => {
  const srv = server();
  // The sheet's ledger was born when the deployment first ran, before this client existed (the normal case; JobLedger).
  srv.ctx._writeStoreBlob('JobLedger', { since: Date.parse('2026-01-01T00:00:00Z'), seen: {}, restore: {} });
  const seen = [];   // every request the page sent anywhere, as it left
  try {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    let holdPosts = 0;   // ms to hold each POST before the server answers it (D: a write still on its way)
    const route = async (r) => {
      const req = r.request();
      if (holdPosts && req.method() === 'POST') await new Promise((res) => setTimeout(res, holdPosts));
      const url = req.url();
      const q = {};
      (url.split('?')[1] || '').split('&').forEach((kv) => { if (kv) { const i = kv.indexOf('='); q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } });
      let text;
      try { text = srv.exec(req.method(), q, req.postData() || ''); } catch (e) { text = JSON.stringify({ ok: false, error: String(e) }); }
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: text });
    };
    await ctx.route(SYNC + '**', route);
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    p.on('request', (req) => { const u = req.url(); if (u.indexOf('file://') !== 0 && u.indexOf('data:') !== 0) seen.push({ url: u, method: req.method(), body: req.postData() || '' }); });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const consoleText = []; p.on('console', (m) => consoleText.push(m.text()));
    let loads = 0; p.on('load', () => { loads++; });
    p.on('dialog', async (d) => { await d.accept(); });

    const section = async (name, body) => {
      console.log('\n## ' + name);
      try { await body(); } catch (e) { fail++; console.log('  ✗ ' + name + ' threw: ' + String(e && e.message || e).split('\n')[0]); }
    };
    const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
    const visible = (sel) => p.locator(sel).first().isVisible().catch(() => false);
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const openSettings = async () => { await p.click('button[title="Settings"]'); await p.waitForTimeout(300); };
    const saveSettings = async () => { await p.click('#settings-modal button.btn-p'); await p.waitForTimeout(1200); };
    const chip = () => p.evaluate(() => { const el = document.getElementById('sync-pending-label'); return el && el.offsetParent !== null ? el.textContent : ''; });

    await p.goto(APP); await p.waitForTimeout(1500);

    await section('A · the check is off: the redeploy breaks nothing, and Settings says so', async () => {
      // The URL typed in Settings, through the real box, as on any device.
      await openSettings();
      await p.fill('#set-sheets-url', SYNC);
      ok(await visible('#set-device-key'), 'the Device key box is on the form, beside the URL');
      eq(await p.getAttribute('#set-device-key', 'type'), 'password', 'and it is a masked box');
      await saveSettings();
      // A client, saved by the app with no key on the device.
      await p.evaluate((id) => {
        jobs.unshift({ id, hvlId: 'HVL-2610-K116', name: 'Margaret Hale', svc: 'downsizing_move', status: 'new', phone: '555-0101', email: 'meg@hale.example',
          addr: '9 Ocean Blvd', city: 'Palm Beach', zip: '33480', created: '2026-10-20', updatedAt: Date.now() });
        saveJobs();
      }, JOB);
      await p.waitForTimeout(2500);
      eq((srv.jobsOnSheet() || []).map((j) => j.id), [JOB], 'the client reached the sheet with no key (the check is off)');
      await p.evaluate(() => checkBackendVersion()); await p.waitForTimeout(700);
      await openSettings();
      eq(await txt('#set-device-key-status'), 'The Apps Script does not ask for a key yet (none is set in its Script Properties).', 'Settings says the Apps Script asks for no key yet');
      await p.click('#settings-modal button.btn-s[onclick*="none"]').catch(() => {});
      await p.evaluate(() => { document.getElementById('settings-modal').style.display = 'none'; });
      ok(!(await visible('#device-key-banner')), 'and no banner');
    });

    await section('B · Anthony sets the key: this device is turned away, says so, keeps its client and holds its edit', async () => {
      srv.props.HAVELLIN_DEVICE_KEY = KEY;
      await p.reload(); await p.waitForTimeout(2200);
      ok(await visible('#device-key-banner'), 'the red banner is up');
      has(await txt('#device-key-banner'), 'This device has no key: ask Anthony', 'and says this device has no key');
      eq(await p.evaluate(() => jobs.length), 1, '⚠⚠ the cached client stays on this device: a refusal is never read as an empty sheet');
      eq(await p.evaluate(() => _jobsState), 'offline', 'and the list reads as unreachable');
      const refused = seen.filter((s) => s.url.indexOf(SYNC) === 0 && /action=loadJobs/.test(s.url)).pop();
      lacks((refused && refused.url) || '', 'deviceKey', 'the read went with no key');
      // An edit on this device (the app's own writer, as an Edit Client save makes it).
      await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); j.phone = '555-0199'; _saveJobEdit(j); }, JOB);
      await p.waitForTimeout(2500);
      has(await chip(), 'not saved', 'the chip says the edit is not saved');
      has(await chip(), 'this device has no key: ask Anthony', 'and why');
      eq((srv.jobsOnSheet() || [])[0] && srv.jobsOnSheet()[0].phone, '555-0101', '⚠⚠ the sheet is untouched: the refused write changed nothing');
      const held = await p.evaluate(() => Object.keys(_pendingWrites).map((k) => [_pendingWrites[k].kind, _pendingWrites[k].blocked]));
      ok(held.length >= 1 && held.every(([k, bl]) => k === 'key' && bl === true), 'the write is held as a key refusal, not retried by itself (' + JSON.stringify(held) + ')');
      const before = seen.length;
      await p.waitForTimeout(6000);
      eq(seen.slice(before).filter((s) => s.method === 'POST').length, 0, 'no retry goes out on its own while the key is missing');
    });

    await section('C · a wrong key, typed through the banner\'s Open Settings: still held, and the banner says the key is wrong', async () => {
      await p.click('#device-key-banner button');
      await p.waitForTimeout(300);
      ok(await visible('#settings-modal'), 'the banner\'s button opens Settings');
      has(await txt('#set-device-key-status'), 'This device has no key: ask Anthony.', 'the line under the box says the same');
      await p.fill('#set-device-key', 'K7QM-3XWP-9TRA-HC4N-0000');
      await saveSettings();
      await p.waitForTimeout(1500);
      has(await txt('#device-key-banner'), 'The key on this device is wrong: ask Anthony', 'the banner says the key is wrong');
      has(await chip(), 'the key on this device is wrong', 'and the chip');
      eq(srv.jobsOnSheet()[0].phone, '555-0101', 'the sheet still untouched');
    });

    await section('D · the right key, typed as a phone types it: the held edit lands; the page waits for the person\'s Reload from the sheet', async () => {
      await openSettings();
      eq((await p.inputValue('#set-device-key')).length, 'K7QM-3XWP-9TRA-HC4N-0000'.length, 'the box holds the key on the device, masked');
      const loadsBefore = loads;
      await p.fill('#set-device-key', 'k7qm 3xwp 9tra hc4n 2zbe');
      await saveSettings();
      await p.waitForTimeout(4000);
      eq(srv.jobsOnSheet()[0].phone, '555-0199', '⚠⚠ the edit held while the key was missing has landed');
      await p.waitForTimeout(3000);
      eq(loads, loadsBefore, '⚠⚠ the page has NOT reloaded by itself (the first build reloaded here, and could again hours later)');
      ok(await visible('#device-key-banner'), 'the banner stays up');
      has(await txt('#device-key-banner'), 'Key accepted ✓', 'turned to Key accepted');
      const tones = await p.evaluate(() => { const t = document.createElement('div'); t.style.color = 'var(--ok-tx)'; document.body.appendChild(t); const c = getComputedStyle(t).color; t.remove(); return [getComputedStyle(document.getElementById('device-key-banner')).borderLeftColor, c]; });
      eq(tones[0], tones[1], 'in green, not the refusal\'s red');
      ok(await visible('#device-key-banner button:has-text("Reload from the sheet")'), 'with Reload from the sheet');
      eq(await chip(), '', 'and nothing waiting');
      // A write still on its way (the server slow to answer): the press refuses and says why, and nothing reloads.
      holdPosts = 3500;
      await p.evaluate((id) => { const j = jobs.find((x) => x.id === id); j.city = 'West Palm Beach'; _saveJobEdit(j); }, JOB);
      await p.waitForTimeout(900);
      await p.click('#device-key-banner button:has-text("Reload from the sheet")');
      await p.waitForTimeout(400);
      has(await txt('#device-key-reload-why'), 'Not reloaded: changes made here have not reached the sheet yet', '⚠⚠ pressed while a write is on its way: refused, by name');
      eq(loads, loadsBefore, 'and the page is not reloaded over it');
      holdPosts = 0;
      await p.waitForTimeout(4500);
      eq(srv.jobsOnSheet()[0].city, 'West Palm Beach', 'the write lands');
      await p.click('#device-key-banner button:has-text("Reload from the sheet")');
      await p.waitForTimeout(2500);
      ok(loads > loadsBefore, 'pressed once it has landed: the page reloads from the sheet (' + (loads - loadsBefore) + ')');
      ok(!(await visible('#device-key-banner')), 'the banner is gone');
      eq(await p.evaluate(() => [jobs.length, jobs[0] && jobs[0].phone, jobs[0] && jobs[0].city, _jobsState]), [1, '555-0199', 'West Palm Beach', 'ready'], 'the client list is read from the sheet, with both edits');
      eq(await chip(), '', 'and nothing is waiting');
      await openSettings();
      eq(await txt('#set-device-key-status'), '✓ Accepted by the Apps Script.', 'Settings says the key is accepted');
      await p.evaluate(() => { document.getElementById('settings-modal').style.display = 'none'; });
    });

    await section('E · every request to the jobs backend carries the key once; nothing else does; the key is nowhere on the page', async () => {
      const typed = encodeURIComponent('k7qm 3xwp 9tra hc4n 2zbe');
      const after = seen.filter((s) => s.url.indexOf(typed) >= 0 || s.url.indexOf(SYNC) === 0);
      const lastKeyless = seen.map((s, i) => [s, i]).filter(([s]) => s.url.indexOf(SYNC) === 0 && s.url.indexOf('deviceKey=') < 0).pop();
      const firstKeyed = seen.findIndex((s) => s.url.indexOf('deviceKey=' + typed) >= 0);
      ok(firstKeyed >= 0, 'requests went with the key');
      const sinceKey = seen.slice(firstKeyed).filter((s) => s.url.indexOf(SYNC) === 0);
      ok(sinceKey.length >= 5 && sinceKey.every((s) => s.url.split('deviceKey=').length === 2), '⚠⚠ every request to the jobs backend since the key was typed carries it exactly once (' + sinceKey.length + ')');
      ok(!lastKeyless || lastKeyless[1] < firstKeyed, 'none went without it after');
      ok(seen.filter((s) => s.url.indexOf(SYNC) !== 0).every((s) => s.url.toLowerCase().indexOf('k7qm') < 0 && s.body.toLowerCase().indexOf('k7qm') < 0), 'no request anywhere else carries it');
      ok(seen.every((s) => s.body.toLowerCase().indexOf('k7qm') < 0), 'and no request body carries it');
      const pageText = await p.evaluate(() => { const c = document.querySelector('.wrap') || document.body; return c.textContent; });
      ok(pageText.toLowerCase().indexOf('k7qm') < 0, 'the key is nowhere in the page\'s text');
      ok(consoleText.every((t) => t.toLowerCase().indexOf('k7qm') < 0), 'nor in the console');
      ok(srv.log.every((l) => l.toLowerCase().indexOf('k7qm') < 0), 'nor in the Apps Script\'s log');
      ok(srv.log.some((l) => /Refused GET loadJobs: device key missing/.test(l)), 'which records each refusal by state');
      eq(await p.evaluate(() => localStorage.getItem('hav_device_key')), 'k7qm 3xwp 9tra hc4n 2zbe', 'the device keeps the key as typed');
    });

    await section('F · a phone (390 px): the banner fits, and nothing errs', async () => {
      srv.props.HAVELLIN_DEVICE_KEY = 'ANOTHER-KEY-FOR-ROTATION';
      await p.setViewportSize({ width: 390, height: 844 });
      await p.reload(); await p.waitForTimeout(2200);
      ok(await visible('#device-key-banner'), 'a key changed by Anthony turns the device away again (rotation)');
      has(await txt('#device-key-banner'), 'The key on this device is wrong: ask Anthony', 'and says the key is wrong');
      eq(await overflow(), 0, 'no horizontal overflow at 390 px');
      eq(errs, [], 'zero page errors');
    });

    await section('G · the recommended order, on a second device: the key typed while the check is off, the property set last', async () => {
      srv.props.HAVELLIN_DEVICE_KEY = null;
      const ctx2 = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
      await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await ctx2.route(SYNC + '**', route);
      const q = await ctx2.newPage();
      q.setDefaultTimeout(10000);
      const errs2 = []; q.on('pageerror', (e) => errs2.push(String(e)));
      let loads2 = 0; q.on('load', () => { loads2++; });
      q.on('dialog', async (d) => { await d.accept(); });
      const txt2 = (sel) => q.evaluate((s2) => { const el = document.querySelector(s2); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
      await q.goto(APP); await q.waitForTimeout(1500);
      await q.click('button[title="Settings"]'); await q.waitForTimeout(300);
      await q.fill('#set-sheets-url', SYNC);
      await q.fill('#set-device-key', 'G2KQ-7MXP-4RTA-WC9N-3ZBE');
      await q.click('#settings-modal button.btn-p'); await q.waitForTimeout(2500);
      await q.click('button[title="Settings"]'); await q.waitForTimeout(300);
      eq(await txt2('#set-device-key-status'), 'The Apps Script does not ask for a key yet (none is set in its Script Properties): this one is sent and not checked.', 'typed while the check is off: sent and not checked');
      await q.evaluate(() => { document.getElementById('settings-modal').style.display = 'none'; });
      ok(!(await q.locator('#device-key-banner').first().isVisible().catch(() => false)), 'no banner');
      // Anthony sets the property last.
      srv.props.HAVELLIN_DEVICE_KEY = 'ANOTHER-KEY-FOR-ROTATION, G2KQ7MXP4RTAWC9N3ZBE';
      await q.reload(); await q.waitForTimeout(2500);
      ok(!(await q.locator('#device-key-banner').first().isVisible().catch(() => false)), '⚠⚠ the property set: this device is let in, no banner, nothing turned away');
      await q.click('button[title="Settings"]'); await q.waitForTimeout(300);
      eq(await txt2('#set-device-key-status'), '✓ Accepted by the Apps Script.', 'Settings reads Accepted');
      await q.evaluate(() => { document.getElementById('settings-modal').style.display = 'none'; });
      eq(await q.evaluate(() => [jobs.length, _jobsState]), [1, 'ready'], 'the client list is read from the sheet');
      await q.evaluate((id) => { const j = jobs.find((x) => x.id === id); j.zip = '33405'; _saveJobEdit(j); }, JOB);
      await q.waitForTimeout(2500);
      eq(srv.jobsOnSheet()[0].zip, '33405', 'an edit lands');
      eq(await q.evaluate(() => Object.keys(_pendingWrites).length), 0, 'and nothing is held');
      eq(errs2, [], 'zero page errors on the second device');
      await ctx2.close().catch(() => {});
    });
  } catch (e) {
    fail++;
    console.log('  ✗ threw: ' + String(e && e.stack || e));
  } finally {
    if (b) await b.close().catch(() => {});
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
