'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P22 · GROUP B (2026-10-06): eleven items off CLAUDE.md's "Known, not fixed", each driven through the real functions
// (closure-lifted); only the store, the network, the clock and the screen are stubbed.
//   B1  a shot the page was still uploading when it reloaded reads as failed, with its tile and its bytes
//   B2  Handed over in person names the Gmail draft it leaves in the mailbox
//   B3  the executed agreement's and certificate's Drive links on the Agreement signed row
//   B4  one watchdog for the three filings' in-flight flags
//   B5  who can see the photographs is recorded on the job and shown; B6 Revoke's prefill
//   B7  the package shares the folders with the copied fiduciary too, never agreements@
//   B8  a package draft whose card a moved matter took away is named where the card was
//   B9  an offer is linked as an offer
//   B10 the band's host through the print window; a find's Void repaints the card; the desk's way to the card
//   B11 the envelope's record kept by the check; the attorney as the Client signer named; every co-signer measured
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns].filter((n) => ALL_FNS.has(n)), vars: [...vars] };
}
// `stubs` names what the test supplies; `stop` names more the closure must not lift (screens, network).
function lift(roots, stubs, stop) {
  const c = closure(roots, Object.keys(stubs || {}).concat(stop || []));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const NOW = Date.parse('2026-10-06T15:00:00Z');
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')
  .replace(/&middot;/g, '·').replace(/\s+/g, ' ').trim();
// A timer queue the test fires by hand: nothing here ever waits on a clock.
function timers() {
  const q = [];
  return { q, setTimeout: (f, ms) => { q.push({ f, ms, live: true }); return q.length; }, clearTimeout: (i) => { if (i && q[i - 1]) q[i - 1].live = false; },
           fire() { q.forEach((t) => { if (t.live) { t.live = false; t.f(); } }); } };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } };

  // ═══════════════════════════════════════════════════════════════════════════
  G('B1 · a shot still "Uploading…" when the page died reads as failed on the next load, with its tile and its bytes', () => {
    const S = lift(['loadPhotoRefs', '_roomShotStripHtml', '_savePendingPhotoData', 'photoUploadStale'], {
      Date: FixedDate(NOW), _photoRefs: {}, _photoRetryData: {}, _localShotThumbs: {}, estimateStore: {}, jobs: [{ id: 7 }],
      _invThumbCache: () => ({}), _warnPhotoStoreFull() {}, _warnPhotoRetryUnsaved() { S.__warned = (S.__warned || 0) + 1; },
    });
    const T = S.PHOTO_UPLOAD_TIMEOUT_MS;
    ok(T > 0, 'the watchdog\'s own figure is the bound');
    // The pure rule: still uploading, not this page's, and older than the watchdog.
    eq(S.photoUploadStale({ stableId: 'a', status: 'uploading', ts: NOW - T - 1 }, NOW, {}), true, '⚠ an upload older than the watchdog that this page is not making has died');
    eq(S.photoUploadStale({ stableId: 'a', status: 'uploading', ts: NOW - T - 1 }, NOW, { a: true }), false, 'one this page is still making is left alone');
    eq(S.photoUploadStale({ stableId: 'a', status: 'uploading', ts: NOW - 1000 }, NOW, {}), false, 'a recent one (another device\'s, merged in) is left alone');
    eq(S.photoUploadStale({ stableId: 'a', status: 'failed', ts: 0 }, NOW, {}), false, 'a failure is already a failure');
    eq(S.photoUploadStale({ stableId: 'a', status: 'uploaded', ts: 0 }, NOW, {}), false, 'and a landed shot is never touched');

    // The load: two stuck shots (an item and its detail) and one a moment old, as localStorage held them when the page died.
    const refs = [
      { stableId: 'i1', roomIdx: 2, label: 'inventory', seq: 1, status: 'uploading', ts: NOW - T - 5000, filename: 'k.jpg', updatedAt: 1 },
      { stableId: 'd1', roomIdx: 2, label: 'detail', seq: 1, groupId: 'i1', status: 'uploading', ts: NOW - T - 4000, filename: 'kd.jpg', updatedAt: 1 },
      { stableId: 'i2', roomIdx: 2, label: 'inventory', seq: 2, status: 'uploading', ts: NOW - 2000, filename: 'k2.jpg', updatedAt: 1 },
    ];
    S.localStorage.setItem('hav_media_7', JSON.stringify(refs));
    S.localStorage.setItem('hav_media_pending_7', JSON.stringify({ i1: 'data:image/jpeg;base64,AAA', d1: 'data:image/jpeg;base64,BBB', i2: 'data:image/jpeg;base64,CCC' }));
    S.loadPhotoRefs(7);
    const st = (id) => (S._photoRefs[7].find((r) => r.stableId === id) || {}).status;
    eq([st('i1'), st('d1'), st('i2')], ['failed', 'failed', 'uploading'], '⚠⚠ the two the dead page left read as failed; the live one is untouched');
    eq(S._photoRefs[7].find((r) => r.stableId === 'i1').updatedAt, 1, 'a write the app makes on its own: the item\'s clock does not move');
    eq(JSON.parse(S.localStorage.getItem('hav_media_7')).filter((r) => r.status === 'failed').length, 2, 'and the verdict is saved, so the next load agrees');
    eq(S._photoRetryData.i1, 'data:image/jpeg;base64,AAA', 'the bytes came back with it, so Retry can resend');
    const strip = S._roomShotStripHtml(7, 2);
    has(strip, 'Detail shots not saved', '⚠ the stuck detail shot has a tile now, under the failed details');
    has(strip, "retryPhotoUpload(7,'d1')", 'with its own Retry');
    has(strip, "retryPhotoUpload(7,'i1')", 'and so has the item');

    // An upload in flight keeps its bytes on the device, so a page that dies mid-upload has them on the next load.
    S._photoRefs[8] = [{ stableId: 'u1', status: 'uploading', ts: NOW }, { stableId: 'u2', status: 'uploaded', ts: NOW }];
    S._photoRetryData.u1 = 'data:U1'; S._photoRetryData.u2 = 'data:U2';
    S._savePendingPhotoData(8);
    eq(JSON.parse(S.localStorage.getItem('hav_media_pending_8') || '{}'), { u1: 'data:U1' }, '⚠ an uploading shot\'s bytes are held; a landed one\'s never are');
  });

  G('B1 · the upload marks itself live while it runs, and stops on its verdict', () => {
    const t = timers();
    let finish = null;
    const S = lift(['_doPhotoUpload'], {
      jobs: [{ id: 7, driveFolder: 'x' }], _photoRefs: { 7: [{ stableId: 's1', status: 'uploading', ts: 0 }] }, _photoRetryData: { s1: 'data:A' },
      setTimeout: t.setTimeout, clearTimeout: t.clearTimeout, showSyncBadge() {}, savePhotoRefs() {}, _savePendingPhotoData() {},
      resolveSubfolderId: (j, n, cb) => cb('SUB'), uploadToDrive: (f, n, d, cb) => { finish = cb; },
    });
    S._doPhotoUpload(7, 'data:A', 'a.jpg', 's1', 'Estate Inventory');
    eq(!!S._photoUploadsLive.s1, true, 'in flight: this page\'s, so a reload-time sweep on this page never calls it dead');
    finish(true, 'https://drive/x', 'F1');
    eq(!!S._photoUploadsLive.s1, false, 'and released on its verdict');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  const handJob = (st) => ({ id: 7, name: 'Tripp Butler', svc: 'downsizing', status: 'won', won: true, approved: true, agrApproved: true,
    docState: { agreement: Object.assign({}, st) }, at: {}, payments: [] });
  G('B2 · Handed over in person names the Gmail draft it leaves in the mailbox, on the row and before the press', () => {
    const S = lift(['agreementHandOverDraftNote', 'jobTimeline'], { estimateStore: {}, jobs: [], Date: FixedDate(NOW), _todayStr: () => '2026-10-06' });
    const drafted = '2026-10-04T14:00:00.000Z', handed = '2026-10-05T14:00:00.000Z';
    const pending = handJob({ draftedAt: drafted, provider: 'gmail', mailbox: 'ashley@havellin.com', draftUrl: 'u' });
    const pre = S.agreementHandOverDraftNote(pending, true);
    has(pre, 'Gmail draft of the packet from Oct 4 (ashley@havellin.com) is still in Gmail', '⚠ before the press: which draft, from when, in whose mailbox');
    eq(S.agreementHandOverDraftNote(pending), '', 'and nothing as a hand-over: none is on record yet');
    const after = handJob({ draftedAt: drafted, provider: 'gmail', mailbox: 'ashley@havellin.com', sentAt: handed, sentHow: 'in_person', sentHowAt: handed });
    has(S.agreementHandOverDraftNote(after), 'delete it, so a second copy is not sent', '⚠⚠ after it: the draft the app no longer watches is named');
    const rows = S.jobTimeline(after, null, [], []);
    const row = rows.find((r) => r.key === 'agreement_sent') || {};
    has(row.sub, 'Handed over in person. The Gmail draft of the packet from Oct 4', 'on the Signing packet sent row, under the route');
    // Not where there is nothing to name.
    eq(S.agreementHandOverDraftNote(handJob({ sentAt: handed, sentHow: 'in_person', sentHowAt: handed })), '', 'no draft, no line');
    eq(S.agreementHandOverDraftNote(handJob({ draftedAt: drafted, provider: 'gmail', sentAt: handed })), '', 'a send by another route is not a hand-over');
    eq(S.agreementHandOverDraftNote(handJob({ draftedAt: drafted, provider: 'docusign', sentAt: handed, sentHow: 'in_person', sentHowAt: handed })), '', 'an envelope leaves no draft in a mailbox');
    has(S.agreementHandOverDraftNote(handJob({ draftedAt: drafted, provider: 'mailto', sentAt: handed, sentHow: 'in_person', sentHowAt: handed })),
      'may still be in your mail app unsent', 'a plain email the app opened is named as one');
    eq((rows.find((r) => r.key === 'agreement_sent') || {}).done, true, 'and the row is still done: the hand-over is the send');
  });

  G('B2 · the press: the confirmation names the draft, and the notice after it', () => {
    const asked = [], notices = [];
    const job = handJob({ draftedAt: '2026-10-04T14:00:00.000Z', provider: 'gmail', mailbox: 'ashley@havellin.com' });
    const S = lift(['dashMarkAgreementSent'], {
      jobs: [job], Date: FixedDate(NOW), confirm: (m) => { asked.push(String(m)); return true; },
      _primeAgreementFor: () => true, markAgreementSent() { job.agrSent = true; }, _dashRedraw() {}, dashNotice: (t, m) => notices.push({ t, m: String(m) }),
      saveJobs() {}, syncJobToSheets() {}, _actor: () => 'Anthony Graziano',
    });
    S.dashMarkAgreementSent(7);
    has(asked[0] || '', 'The Gmail draft of the packet from Oct 4 (ashley@havellin.com) is still in Gmail', '⚠ the confirm says so before anything is recorded');
    eq(job.docState.agreement.sentHow, 'in_person', 'the hand-over is recorded');
    eq((notices[0] || {}).t, 'warn', 'and the notice after it is amber');
    has((notices[0] || {}).m, 'delete it, so a second copy is not sent', 'naming the draft');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B3 · the executed agreement and its certificate are offered on the Agreement signed row', () => {
    const opened = [];
    const S = lift(['jobTimelineActions', 'openEsignFiled'], { estimateStore: {}, jobs: [], window: { open: (u) => opened.push(u) }, _dashRedraw() {}, dashNotice() {} });
    const sig = { how: 'esign', signedBy: 'Tripp Butler', signedOn: '2026-10-02', envelopeId: 'E1' };
    const job = handJob({ sentAt: '2026-10-01T12:00:00Z', sig, esign: { envelopeId: 'E1', status: 'completed', filedUrl: 'https://drive/AGR', certUrl: 'https://drive/CERT' } });
    S.jobs = [job];
    const acts = S.jobTimelineActions({ key: 'agreement_signed', state: 'done' }, job, null);
    const labels = acts.secondary.map((a) => a.label);
    ok(labels.some((l) => /Filed signed packet/.test(l)), '⚠ the executed agreement, named with the agreement\'s document word');
    ok(labels.some((l) => /Filed certificate of completion/.test(l)), '⚠ and the certificate');
    lacks(labels.join('|'), 'File signed copy', 'nothing left to file, so no File signed copy');
    const call = (acts.secondary.find((a) => /certificate/.test(a.label)) || {}).call || '';
    eq(call, "openEsignFiled(7,'certificate')", 'each opens through its own handler');
    S.openEsignFiled(7, 'certificate'); S.openEsignFiled(7, 'agreement');
    eq(opened, ['https://drive/CERT', 'https://drive/AGR'], 'to the link the filing recorded');
    // Only what was recorded.
    const half = handJob({ sentAt: '2026-10-01T12:00:00Z', sig, esign: { envelopeId: 'E1', status: 'completed', filedUrl: 'https://drive/AGR' } });
    const l2 = S.jobTimelineActions({ key: 'agreement_signed', state: 'done' }, half, null).secondary.map((a) => a.label).join('|');
    has(l2, 'Filed signed packet', 'the agreement that came back is offered');
    has(l2, 'File signed copy', 'beside the button that fetches the missing certificate');
    lacks(l2, 'certificate of completion', 'and no link to a certificate that is not in Drive');
    eq(S.esignFiledCopies(handJob({ sig: { how: 'hand' } })), [], 'a wet signature has no executed copy to link');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B4 · one watchdog: a filing that never answers stops holding its flag, and says so', () => {
    const t = timers();
    const S = sandbox({ fns: ['_armFiling'], vars: ['FILING_WATCHDOG_MS'], stubs: { setTimeout: t.setTimeout, clearTimeout: t.clearTimeout } });
    const map = {}, said = [];
    const release = S._armFiling(map, 7, () => said.push('timeout'));
    ok(!!map[7], 'the flag is set while the request is out');
    eq(t.q[0].ms, S.FILING_WATCHDOG_MS, 'with a watchdog at the one figure');
    eq(release(), true, 'an answer in time owns the flag and clears it');
    eq(map[7], undefined, 'cleared');
    t.fire();
    eq(said, [], 'and the watchdog stays quiet');
    const r2 = S._armFiling(map, 7, () => said.push('timeout'));
    t.fire();
    eq(said, ['timeout'], '⚠⚠ no answer: the watchdog speaks');
    eq(map[7], undefined, '⚠⚠ and the flag is cleared, so the next press is not refused as "being filed now"');
    eq(r2(), false, 'a late answer learns the watchdog already spoke');
    const r3 = S._armFiling(map, 7, null);
    eq(r2(), false, 'and never clears a newer press\'s flag');
    ok(!!map[7], 'which stays set');
    r3();
  });

  G('B4 · the change order, the signed copy and the ledger each release on a hang', () => {
    // The change order: Drive never answers.
    {
      const t = timers(), badges = [];
      const co = { id: 1700000000001, jobId: 7, clientApproved: true };
      const S = lift(['fileChangeOrder'], {
        changeOrders: [co], jobs: [{ id: 7, hvlId: 'HVL-7', driveFolder: 'x' }], SHEETS_SYNC_URL: 'https://x', setTimeout: t.setTimeout, clearTimeout: t.clearTimeout,
        printChangeOrder: () => ({ html: '<p>co</p>' }), _exportDoc: (a, h) => h, resolveSubfolderId: (j, n, cb) => cb('CO'),
        docNames: () => ({ drive: 'CO.html' }), uploadHtmlToDrive() {}, showSyncBadge: (m) => badges.push(String(m)), _docNotice() {},
      });
      S.fileChangeOrder(co.id, { auto: true });
      ok(!!S._coFiling[co.id], 'the change order\'s upload is out');
      t.fire();
      eq(S._coFiling[co.id], undefined, '⚠ the hang lets go of the flag');
      ok(badges.some((b) => /no answer from Drive/.test(b) && /File to Drive/.test(b)), 'and names the button that tries again');
    }
    // The signed copy: the Apps Script never answers.
    {
      const t = timers(), notices = [];
      const job = { id: 7, docState: { agreement: { esign: { envelopeId: 'E1' }, sig: { how: 'esign', signedBy: 'T', signedOn: '2026-10-02', envelopeId: 'E1' } } } };
      const S = lift(['esignArchiveSigned'], {
        jobs: [job], SHEETS_SYNC_URL: 'https://x', setTimeout: t.setTimeout, clearTimeout: t.clearTimeout, Date: FixedDate(NOW),
        resolveSubfolderId: (j, n, cb) => cb('AGR'), _appsScriptPost() {}, docNames: () => ({ drive: 'A.pdf' }),
        _docNotice: (ty, m) => notices.push(String(m)), saveJobs() {}, syncJobToSheets() {},
      });
      S.esignArchiveSigned(7);
      ok(!!S._esignFiling[7], 'the fetch is out');
      t.fire();
      eq(S._esignFiling[7], undefined, '⚠ the hang lets go of the flag');
      ok(notices.some((m) => /File signed copy/.test(m)), 'and names the button');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  const ESTATE = (o) => Object.assign({ id: 7, hvlId: 'HVL-0007', name: 'Walter Ellsworth', svc: 'probate', matterType: 'probate', status: 'active',
    won: true, approved: true, driveFolder: 'https://drive.google.com/drive/folders/ROOT', executor: 'Rex Hale', executorEmail: 'rex@hale.example',
    probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law', tc: 'Ashley Jerome', docState: {}, at: {}, updatedAt: 1, payments: [] }, o || {});
  G('B5/B6 · who can see the photographs is recorded on the job, shown, and Revoke offers the address last shared with', () => {
    const prompts = [], posts = [];
    const S = lift(['shareInventoryWithCounsel', 'unshareInventory', 'photoSharesLine', 'photoShareLive'], {
      jobs: [ESTATE()], SHEETS_SYNC_URL: 'https://x', Date: FixedDate(NOW), document: domStub({}), alert() {},
      window: { prompt: (q, d) => { prompts.push(d); return d; } }, saveJobs() {}, syncJobToSheets() {}, _actor: () => 'Anthony Graziano',
      resolveSubfolderId: (j, n, cb) => cb(n === 'Estate Inventory' ? 'INV' : 'AF'),
      fetch: (u, o) => { posts.push(JSON.parse(o.body)); return { then(f) { const v = f({ json: () => ({ ok: true }) }); return { then(g) { g(v); return { catch() {} }; } }; } }; },
    });
    S.shareInventoryWithCounsel(7);
    const job = S.jobs[0];
    const rec = job.docState.photoShares.shares['ann@lowe.law'];
    eq([rec.email, rec.via, rec.folders, rec.sharedBy], ['ann@lowe.law', 'desk', 2, 'Anthony Graziano'], '⚠⚠ the share is recorded: who, how, how many folders');
    ok(!!job.at['docState:photoShares'], 'as a person\'s edit: the record\'s own stamp, so the sheet merges it by key');
    has(S.photoSharesLine(job), 'Photographs shared read-only with ann@lowe.law (Oct 6, by Anthony Graziano)', 'and said in one line');
    // Revoke offers the address last shared with, and records the revoke.
    prompts.length = 0;
    S.unshareInventory(7);
    eq(prompts[0], 'ann@lowe.law', 'Revoke offers the address the record says can see them');
    ok(!!job.docState.photoShares.shares['ann@lowe.law'].revokedAt, 'the revoke is recorded');
    has(S.photoSharesLine(job), 'Access revoked for ann@lowe.law', 'and said');
    eq(S.photoShareLive(job), [], 'nobody can see them now');
    const Card = lift(['probatePackageCardHtml'], { jobs: [job], estimateStore: {}, _photoRefs: {}, SHEETS_SYNC_URL: 'https://x' });
    has(text(Card.probatePackageCardHtml(job)), 'Access revoked for ann@lowe.law', 'the package row on the Probate card says it too');
    // ⚠ B6: with nothing recorded and no attorney, the representative, as Share falls back to.
    const S2 = lift(['unshareInventory'], {
      jobs: [ESTATE({ probateAttyEmail: '' })], SHEETS_SYNC_URL: 'https://x', alert() {},
      window: { prompt: (q, d) => { prompts.push(d); return ''; } }, resolveSubfolderId: (j, n, cb) => cb('INV'),
    });
    prompts.length = 0;
    S2.unshareInventory(7);
    eq(prompts[0], 'rex@hale.example', '⚠ Revoke falls back to the representative, as Share does');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B7 · the package shares the folders with whoever it copies, never a Havellin mailbox, and names who it could not', () => {
    const S = lift(['pkgShareEmails', '_pkgShareFolders'], {
      resolveSubfolderId: (j, n, cb) => cb(n === 'Estate Inventory' ? 'INV' : 'AF'),
      _invShareEach: (ids, action, email, done) => done(email === 'rex@hale.example' && ids[0] === 'AF' ? 0 : 1, email === 'rex@hale.example' ? 'permission denied' : ''),
    });
    eq(S.pkgShareEmails({ to: 'ann@lowe.law', cc: ['rex@hale.example', 'agreements@havellinpalmbeach.com', 'REX@hale.example'] }),
      ['ann@lowe.law', 'rex@hale.example'], '⚠⚠ the addressee and the copied fiduciary, once each; never agreements@');
    eq(S.pkgShareEmails({ to: 'rex@hale.example', cc: ['agreements@havellinpalmbeach.com'] }), ['rex@hale.example'], 'a package to the trustee shares with the trustee alone');
    let got = null;
    S._pkgShareFolders(ESTATE(), ['ann@lowe.law', 'rex@hale.example'], (list) => { got = list; });
    const af = got.find((f) => f.id === 'AF'), inv = got.find((f) => f.id === 'INV');
    eq([af.shared, inv.shared], [true, true], 'the addressee\'s answer is the one the email\'s links rest on');
    eq(inv.sharedWith, ['ann@lowe.law', 'rex@hale.example'], 'shared with both');
    eq(af.notShared, [{ email: 'rex@hale.example', error: 'permission denied' }], '⚠ and a copied address that could not be shared is kept, by name, with why');
    has(fn('sendProbatePackage'), 'who is copied (', 'the send\'s notice names it');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B8 · a package draft whose card a moved matter took away is named where the card was', () => {
    const S = lift(['estatePackageOrphanDraftNote'], { _photoRefs: {}, SHEETS_SYNC_URL: 'https://x' });
    const draft = { draftedAt: '2026-10-03T14:00:00.000Z', provider: 'gmail', mailbox: 'ashley@havellin.com', draftUrl: 'u',
      pkg: { owed: ['court', 'tier', 'ledger', 'worklist'], docs: ['court'], to: 'ann@lowe.law', cc: [] } };
    const moved = ESTATE({ matterType: 'neither', svc: 'cleanout', docState: { probatePackage: Object.assign({}, draft) } });
    const n = S.estatePackageOrphanDraftNote(moved);
    has(n, 'An inventory package Gmail draft from Oct 3 (ashley@havellin.com) to ann@lowe.law', '⚠⚠ the draft, its day, its mailbox and its addressee');
    has(n, 'Delete it in Gmail; don’t send it.', 'and what to do');
    eq(S.estatePackageOrphanDraftNote(ESTATE({ docState: { probatePackage: Object.assign({}, draft) } })), '', 'with a card on screen the card names it');
    eq(S.estatePackageOrphanDraftNote(ESTATE({ matterType: 'neither', svc: 'cleanout' })), '', 'nothing drafted, nothing named');
    eq(S.estatePackageOrphanDraftNote(ESTATE({ matterType: 'neither', svc: 'cleanout',
      docState: { probatePackage: Object.assign({}, draft, { sentAt: '2026-10-04T14:00:00.000Z' }) } })), '', 'a draft confirmed sent is not outstanding');
    has(fn('renderClientDashboard'), 'estatePackageOrphanDraftNote(job)', 'the dashboard draws it where the card would be (driven in browser step 65)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B9 · an offer is linked as an offer, a receipt as a receipt; an old upload keeps its hedged name', () => {
    const job = ESTATE();
    const S = lift(['probatePackageReports', '_renderCollDocs', '_renderCollPhotoCapture'], { _photoRefs: { 7: [
      { stableId: 'a', label: 'appraisal', docKind: 'appraisal', collId: '3', objectName: 'Coins.pdf', status: 'uploaded', driveFileUrl: 'https://d/a' },
      { stableId: 'o', label: 'appraisal', docKind: 'offer', collId: '3', objectName: 'Dealer bid.pdf', status: 'uploaded', driveFileUrl: 'https://d/o' },
      { stableId: 'r', label: 'appraisal', docKind: 'receipt', collId: '3', objectName: 'Paid.pdf', status: 'uploaded', driveFileUrl: 'https://d/r' },
      { stableId: 'x', label: 'appraisal', collId: '3', objectName: 'Old.pdf', status: 'uploaded', driveFileUrl: 'https://d/x' },
    ] } });
    eq(S.probatePackageReports(job).map((r) => r.title + ' — ' + r.name),
      ['Appraisal report — Coins.pdf', 'Offer — Dealer bid.pdf', 'Receipt — Paid.pdf', 'Appraisal report or offer — Old.pdf'], '⚠⚠ each named for what it is');
    has(fn('sendProbatePackage'), "r.title + ' — ' + r.name", 'and the package links them by that name');
    lacks(fn('sendProbatePackage'), "'Appraisal report or offer — '", 'never the one hedged label for all');
    const list = text(S._renderCollDocs(7, 3));
    has(list, 'Offer · Dealer bid.pdf', 'the collection\'s list says which is which');
    const ctl = S._renderCollPhotoCapture(7, 3);
    ['appraisal', 'offer', 'receipt'].forEach((k) => has(ctl, "attachCollectionDoc(this,7,3,'" + k + "')", 'an upload for ' + k));
    has(fn('savePhotoRefs'), 'docKind:r.docKind', '⚠ the kind is kept on the manifest (the whitelist drops any key it does not name)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B10 · the band\'s host through the print window; a find\'s Void repaints its card; the desk\'s lines lead to the card', () => {
    const dom = domStub({ 'plan-job': '7', 'jband-slot-plan': {} });
    const panel = dom.getElementById('panel-job-plan');
    panel.dataset.wasActive = '1';   // _printDocument has taken it down for the print
    const S = lift(['_jobBandHost', '_signedCopyRepaint'], { document: dom, _dashboardJobId: 0,
      _repaintSiteFinds: (id) => { S.__finds = (S.__finds || 0) + 1; return true; }, loadJobPlanTab() { S.__plan = (S.__plan || 0) + 1; },
      renderInventoryTab() {}, _dashRedraw() { S.__dash = (S.__dash || 0) + 1; } });
    eq((S._jobBandHost() || {}).kind, 'plan', '⚠⚠ a panel taken down for the print still owns the band');
    S._signedCopyRepaint(7, 'will');
    eq([S.__finds || 0, S.__plan || 0, S.__dash || 0], [1, 0, 0], '⚠ a will\'s receipt repaints the Found on site card, not the plan, nor the dashboard');
    S._signedCopyRepaint(7, 'approval');
    eq(S.__plan || 0, 1, 'any other paper repaints the plan as before');
    has(fn('voidSignedRecord'), '_signedCopyRepaint(jobId, rec.kind)', 'and the Void passes the record\'s kind');

    const L = lift(['planDerivedLines'], { _todayStr: () => '2026-10-06', jobPlanStore: {}, estimateStore: {} },
      ['_planRooms', 'ledgerDerivedLines']);
    L._planRooms = () => ({ rooms: [] }); L.ledgerDerivedLines = () => [];
    const job = ESTATE({ siteFinds: [{ id: 'f1', kind: 'will', foundOn: '2026-10-05', foundBy: 'Ashley Jerome', where: 'study', description: 'sealed', at: 1 }] });
    const est = { rooms: [], collections: [], vehicles: [], vendors: [], prepItems: [], svc: 'probate' };
    const desk = L.planDerivedLines(7, job, est, 'admin', '2026-10-06').filter((l) => /will/.test(l.key));
    ok(desk.length > 0 && desk.every((l) => l.ok || (l.action && l.action.call === 'goToSiteFinds(7)')), '⚠⚠ each open find line on the desk carries the way to the card');
    const card = L.planDerivedLines(7, job, est, 'finds', '2026-10-06').filter((l) => /will/.test(l.key));
    ok(card.length > 0 && card.every((l) => !l.action), 'and none on the card itself, where it would lead');
    has(fn('goToSiteFinds'), "openJobPlanFor(jobId, 'p1')", 'the way opens In the house');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('B11 · the check keeps the envelope\'s record; the attorney as the Client signer is named; every co-signer is measured', () => {
    const S = lift(['applyEsignStatus'], { jobs: [], Date: FixedDate(NOW), saveJobs() {}, _saveArrivalCheck() {} }, ['recordAgreementSignature', 'esignArchiveSigned']);
    const job = { id: 7, docState: { agreement: { esign: { envelopeId: 'E1', status: 'sent', coSigners: [{ name: 'Dan' }], futureField: 'kept', checkedAt: 'old' } } } };
    S.jobs = [job];
    S.applyEsignStatus(7, { envelopeId: 'E1', status: 'delivered' });
    const e = job.docState.agreement.esign;
    eq([e.status, e.futureField, (e.coSigners || []).length, e.checkedAt !== 'old'], ['delivered', 'kept', 1, true],
      '⚠⚠ a check writes the status and when, and keeps every other fact about the envelope');
    S.applyEsignStatus(7, { envelopeId: 'E2', status: 'sent' });
    eq([job.docState.agreement.esign.envelopeId, job.docState.agreement.esign.futureField, job.docState.agreement.esign.coSigners],
      ['E2', undefined, undefined], 'an answer for a different envelope carries none of the old one\'s facts');

    const C = lift(['esignCounselSignsNote'], {});
    const est = (o) => Object.assign({ id: 7, svc: 'probate', executor: 'Rex Hale', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law' }, o);
    has(C.esignCounselSignsNote(est({ executorEmail: '' })), 'Ann Lowe, the estate attorney, was sent the Client’s signature line: no email is recorded for Rex Hale',
      '⚠⚠ an envelope whose Client signer is counsel says so');
    eq(C.esignCounselSignsNote(est({ executorEmail: 'rex@hale.example' })), '', 'the representative signs where their email is recorded');
    has(fn('docSend'), "provider === 'docusign' ? esignCounselSignsNote(spec.job) : ''", 'read by the DocuSign send\'s notice alone');

    const A = sandbox({ fns: ['esignAnchorsPresent', 'esignCoSignerAnchors', 'esignCoSignerTop'], vars: ['ESIGN_ANCHORS', 'ESIGN_COSIGNER_ANCHOR'] });
    const page = '/hsc/ /hdc/ /hsh/ /hdh/ /hcs1/ /hcd1/ /hcs3/ /hcd3/';
    eq(A.esignAnchorsPresent(page), ['clientSig', 'clientDate', 'havSig', 'havDate', 'coSig1', 'coDate1', 'coSig3', 'coDate3'],
      '⚠⚠ a gap at the second co-signer no longer hides the third');
    eq(A.esignCoSignerTop('/hcs1/ /hcd12/ text /hcs4/'), 12, 'the highest number the page carries, off the namer\'s own template');
    eq(A.esignCoSignerTop(''), 0, 'none');
  });
};
