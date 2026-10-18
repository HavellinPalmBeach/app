'use strict';
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// P28 (2026-10-18) · SIGN-OUT ON THE IPAD. Anthony, on the appraiser taking twenty items: *"signing things on the ipad is
// genius. let's do that for anything that leaves the house, on estate, once the PR signs off on disposition."*
//
//   1  One dialog for every taker: a vendor (pickup), a charity (donation), a person (receipt, estates), an appraiser
//      (appraisal_out, and appraisal_back for the return). signoutLineKind and signoutGroups: what each may sign for now,
//      what waits on the written approval (an estate's leaving line: invApprovalComplete, never a flag), what is done.
//   2  Firearms never appear: they move on their own protocol.
//   3  invOutForAppraisal: out until a later return covers the line; never "gone" (invRecordedGone reads neither kind).
//   4  The sheet, pure: numbers, rooms, the approval column on an estate, the acknowledgement, the signature block with the
//      image drawn on the glass, who, the day, and the concierge for Havellin; blank lines without an image.
//   5  The pad: strokes count, a tap is not a signature; the dialog refuses by name; the glass route makes the PDF through
//      htmlToPdf, files it as a signed copy (glass: true) and writes the custody events the paper calls for; a void takes
//      them off again.
//   6  The readers: the row's chip, the Releases card, the Appraisal Worklist, the close question, the record links.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
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
function lift(roots, stubs) {
  const c = closure(roots, Object.keys(stubs || {}));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#39;/g, "'")
  .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&#9878;/g, '⚖').replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const NOW = Date.parse('2026-10-18T15:00:00Z');
const FixedDate = (t) => class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
const readers = (name) => [...ALL_FNS].filter((f) => { try { return f !== name && noComments(fn(f)).includes(name + '('); } catch (e) { return false; } }).sort();

const LINE = (id, n, o) => Object.assign({ stableId: id, label: 'inventory', roomIdx: 1, itemNo: n, status: 'uploaded', qty: 1,
  objectName: 'Line ' + n, category: 'Furniture', ts: 100 + n, updatedAt: 100 + n }, o || {});
const OK = { authBy: 'Ruth Adler', approvalDate: '2026-10-05' };
const APPR = [{ id: 'ap1', name: 'Mary Whalen', firm: 'Appraisals by the Sea' }];
const TRUSTJ = (o) => Object.assign({ id: 7, name: 'Walter Ellsworth', hvlId: 'HVL-0007', svc: 'cleanout', matterType: 'trust', docTier: 'values',
  executor: 'Ruth Adler', deathDate: '2026-04-02', won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1, signedRecords: [], at: {},
  appraisers: APPR.slice() }, o || {});
const LIVINGJ = (o) => Object.assign({ id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing_move', won: true, status: 'active',
  tc: 'Ashley Jerome', updatedAt: 1, signedRecords: [], at: {}, appraisers: APPR.slice() }, o || {});

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // A sandbox with the dialog, the sheet, the filer stubbed to record what it was handed, and the pad as the browser holds it.
  function rig(job, lines, opt) {
    opt = opt || {};
    const log = { badges: [], syncs: 0, saves: 0, repaint: 0, posts: [], filed: [] };
    const doc = domStub({});
    const padCanvas = { width: 1000, height: 280, toDataURL: () => 'data:image/png;base64,SIGNATURE', getContext: () => ({ clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }) };
    const c = lift(['signoutGroups', 'signoutLineKind', 'invOutForAppraisal', 'signoutSheetHtml', 'openSignoutDialog', 'openPickupDialog', 'signoutFileFromPad',
      'pickupFileFromDialog', '_signoutAfterFile', '_signoutRecordCustody', 'pickupRecordCustody', 'pickupVoidCustody', 'voidSignedRecord', 'invRecordedGone',
      'invGoneText', '_renderInvReleasesCard', '_renderInvRow', 'closeOpenWorkFlag', 'signPadSigned', 'signPadDataUrl', 'signPadClear', 'signPadInit',
      'signedRecordLinksHtml', 'jobListPut', 'custodyEvents', 'invReceiptHtml'], {
      jobs: [job], _photoRefs: { [job.id]: lines }, estimateStore: {}, contractors: [], vendorDirectory: [{ vendor_name: "Sotheby's  Palm Beach" }],
      showSyncBadge(m) { log.badges.push(String(m)); }, _scheduleInventorySync() { log.syncs++; }, savePhotoRefs() { log.saves++; },
      saveJobs() {}, syncJobToSheets() {}, _signedCopyRepaint() { log.repaint++; }, document: doc, jobPlanStore: {}, changeOrders: [],
      _invThumbHTML() { return ''; }, _invPrintThumb() { return ''; }, _invPick: {}, _invOpen: {}, _agDupSet: {}, Date: FixedDate(NOW), setTimeout: () => 0, clearTimeout() {},
      SHEETS_SYNC_URL: opt.url === undefined ? 'https://sync.example/exec' : opt.url,
      _planRooms: () => ({ rooms: [] }), _planRoomStatus: () => 'cleared',
      deviceUser: () => 'Ashley Jerome',
      _signPads: { 'ip-pad': { canvas: padCanvas, strokes: opt.strokes === undefined ? 12 : opt.strokes } },
      File: class { constructor(parts, name, o) { this.parts = parts; this.name = name; this.type = (o || {}).type; this.size = parts[0].length; } },
      atob: (b) => Buffer.from(b, 'base64').toString('binary'),
      _appsScriptPost(url, body, cb) { log.posts.push(body); cb(!opt.pdfFails, opt.pdfFails ? { error: 'conversion failed' } : { ok: true, base64: Buffer.from('%PDF-1.4 signed').toString('base64') }); },
      fileSignedCopy(jobId, kind, meta, file, cb) {
        log.filed.push({ jobId, kind, meta, file });
        const rec = c.jobListPut(job, 'signedRecords', { id: 'sr' + (job.signedRecords.length + 1), kind, ref: meta.ref, stableIds: meta.stableIds,
          label: meta.label, signedBy: meta.signedBy, signedOn: meta.signedOn, glass: !!meta.glass, fileUrl: 'https://drive/p', filedAt: NOW + job.signedRecords.length });
        cb(true, meta.label + ' filed to Drive.', rec);
        return true;
      } });
    c.window.prompt = () => 'filed against the wrong taker';
    c.__log = log; c.__doc = doc;
    return c;
  }
  const ticks = (c, ids) => { c.document.querySelectorAll = (sel) => /ip-tick/.test(sel) ? ids.map((id) => ({ checked: true, disabled: false, getAttribute: () => id })) : []; };

  G('1 · which paper a line\'s leaving files, and for whom', () => {
    const job = TRUSTJ();
    const c = rig(job, []);
    const k = (o) => c.signoutLineKind(LINE('x', 1, o), job);
    eq(k({ disposition: 'Auction', channel: 'Kodner' }), 'pickup', 'a selling line with a vendor named: the pickup list');
    eq(k({ disposition: 'Sell', channel: 'Jane Buyer' }), 'pickup', 'a buyer too');
    eq(k({ disposition: 'Donate', channel: 'Goodwill' }), 'donation', 'a named donation: the charity\'s receipt');
    eq(k({ disposition: 'Distribute', channel: 'Daniel Adler (son)' }), 'receipt', 'to a person on an estate: the beneficiary\'s receipt');
    eq(k({ disposition: 'Junk', channel: 'Haul Co' }), '', 'a removal: nobody signs for junk');
    eq(k({ disposition: 'Keep' }), '', 'a kept line leaves with nobody');
    eq(k({ disposition: 'Auction', channel: '' }), '', 'no taker named: nothing to sign');
    eq(k({ disposition: 'Auction', channel: 'Kodner', category: 'Firearms', serial: 'S1' }), '', '⚠⚠ a firearm never: the protocol');
    eq(c.signoutLineKind(LINE('x', 1, { disposition: 'Distribute', channel: 'Pat' }), LIVINGJ()), '', 'a living client\'s gift to a person: no receipt kind (the Contents Record is the one paper)');
  });

  G('1 · the groups on an estate: ready once approved in writing, waiting until then, done once signed for', () => {
    const lines = [LINE('a', 1, Object.assign({ disposition: 'Auction', channel: "Sotheby's Palm Beach" }, OK)),
      LINE('b', 2, { disposition: 'Auction', channel: "sotheby's palm beach" }),
      LINE('c', 3, Object.assign({ disposition: 'Donate', channel: 'Goodwill' }, OK)),
      LINE('d', 4, Object.assign({ disposition: 'Distribute', channel: 'Daniel Adler' }, OK)),
      LINE('e', 5, Object.assign({ disposition: 'Auction', channel: 'Kodner', category: 'Firearms', serial: 'S1' }, OK)),
      LINE('f', 6, { disposition: 'Keep', apprId: 'ap1', category: 'Art' }),
      LINE('g', 7, { disposition: 'Keep', apprId: 'ap1', category: 'Art', valSource: 'Appraisal', fmv: '4000' }),
      LINE('h', 8, { disposition: 'Keep', apprId: 'ap1', category: 'Art', apprWaived: true })];
    const job = TRUSTJ();
    const c = rig(job, lines);
    const gs = c.signoutGroups(job, lines);
    eq(gs.map((g) => [g.kind, g.taker, g.ready.map((r) => r.stableId), g.waiting.map((r) => r.stableId), g.done.map((r) => r.stableId)]),
      [['pickup', "Sotheby's Palm Beach", ['a'], ['b'], []], ['donation', 'Goodwill', ['c'], [], []], ['receipt', 'Daniel Adler', ['d'], [], []],
       ['appraisal_out', 'Mary Whalen', ['f'], [], []]],
      '⚠⚠ one group per taker; the unapproved line waits; the firearm is nowhere; the appraiser gets the linked line still to be appraised, never the appraised or waived one');
    ok(gs.every((g) => !g.lines.some((r) => r.stableId === 'e')), 'the firearm is on no group at all');
  });

  G('1 · living work has no gate, and no receipt kind', () => {
    const lines = [LINE('a', 1, { disposition: 'Sell', channel: 'Kaminski Auctions' }), LINE('b', 2, { disposition: 'Distribute', channel: 'Pat Neighbour' }),
      LINE('c', 3, { disposition: 'Donate', channel: 'Habitat ReStore' })];
    const job = LIVINGJ();
    const c = rig(job, lines);
    const gs = c.signoutGroups(job, lines);
    eq(gs.map((g) => [g.kind, g.taker, g.ready.map((r) => r.stableId), g.waiting.length]),
      [['pickup', 'Kaminski Auctions', ['a'], 0], ['donation', 'Habitat ReStore', ['c'], 0]], 'the vendor and the charity, nothing waiting; the gift to a person has no sign-out paper');
  });

  G('3 · out for appraisal until a return covers the line, and never gone', () => {
    const lines = [LINE('f', 6, Object.assign({ disposition: 'Keep', apprId: 'ap1', category: 'Art' }, OK))];
    const job = TRUSTJ();
    const c = rig(job, lines);
    eq(c.invOutForAppraisal(lines[0], job), null, 'nothing filed: not out');
    const out = c.jobListPut(job, 'signedRecords', { id: 'o1', kind: 'appraisal_out', ref: 'Mary Whalen', stableIds: ['f'], signedOn: '2026-10-10', filedAt: NOW - 1000 });
    eq((c.invOutForAppraisal(lines[0], job) || {}).id, 'o1', '⚠⚠ a filed hand-off: out');
    eq(c.invRecordedGone(lines[0], job), false, '⚠⚠ and never gone: it is coming back');
    eq(c.signoutGroups(job, lines).map((g) => g.kind), ['appraisal_back'], 'the appraiser\'s group is now the return');
    c.jobListPut(job, 'signedRecords', { id: 'b1', kind: 'appraisal_back', ref: 'Mary Whalen', stableIds: ['f'], signedOn: '2026-10-15', filedAt: NOW - 500 });
    eq(c.invOutForAppraisal(lines[0], job), null, 'a later return covers it: back');
    eq(c.signoutGroups(job, lines).map((g) => g.kind), ['appraisal_out'], 'and it can go out again');
    c.jobListPut(job, 'signedRecords', { id: 'o2', kind: 'appraisal_out', ref: 'Mary Whalen', stableIds: ['f'], signedOn: '2026-10-16', filedAt: NOW - 100 });
    eq((c.invOutForAppraisal(lines[0], job) || {}).id, 'o2', 'a second hand-off after the return: out again, on the newer list');
    out.voidedAt = 1;   // a voided hand-off never counts
    c.jobListPut(job, 'signedRecords', { id: 'o3', kind: 'appraisal_out', ref: 'Mary Whalen', stableIds: ['f'], signedOn: '2026-10-17', filedAt: NOW - 50, voidedAt: NOW });
    eq((c.invOutForAppraisal(lines[0], job) || {}).id, 'o2', 'a voided hand-off is not the live one');
  });

  G('4 · the sheet: numbers, rooms, the approval column, the acknowledgement, the signature block', () => {
    const lines = [LINE('a', 1, Object.assign({ disposition: 'Auction', channel: "Sotheby's Palm Beach", objectName: 'Walnut sideboard', qty: 1 }, OK)),
      LINE('b', 2, Object.assign({ disposition: 'Auction', channel: "Sotheby's Palm Beach", objectName: 'Dining chairs', qty: 6 }, OK))];
    const job = TRUSTJ();
    const c = rig(job, lines);
    const g = c.signoutGroups(job, lines)[0];
    const sig = { img: 'data:image/png;base64,SIGNATURE', name: 'Sam Driver', date: '2026-10-18', by: 'Ashley Jerome' };
    const html = inEastern(() => c.signoutSheetHtml(job, g, lines, sig));
    const t = text(html);
    has(t, 'Vendor Pickup List', 'the title');
    has(t, "Taken away by Sotheby's Palm Beach", 'who took it');
    has(t, '1 Walnut sideboard 1', 'the first line by number');
    has(t, '2 Dining chairs 6', 'the second, with its quantity');
    has(t, 'Approved in writing by', '⚠⚠ on an estate the sheet carries each line\'s written approval');
    has(t, 'Ruth Adler', 'naming the trustee who signed it');
    has(t, '2 items', 'the count adds up');
    has(t, 'I received the items listed above from Havellin Palm Beach, LLC', 'the acknowledgement');
    has(t, 'it does not decide what the items are worth', 'and what it is not');
    has(html, '<img src="data:image/png;base64,SIGNATURE"', '⚠⚠ the signature drawn on the glass is on the page');
    has(t, 'Signed by: Sam Driver , signed on the iPad · Oct 18, 2026', 'who signed, how, when');
    has(t, 'Witnessed for Havellin Palm Beach, LLC: Ashley Jerome', 'the concierge for Havellin');
    lacks(t, '______', 'no blank lines when it is signed on the glass');
    // Without an image: the blank lines a paper copy is signed on.
    const paper = text(inEastern(() => c.signoutSheetHtml(job, g, lines, null)));
    has(paper, 'Signed by: ______', 'a paper sheet has its lines');
    has(paper, 'Witnessed for Havellin Palm Beach, LLC: ______', 'and the witness line');
    // The appraiser's two sheets.
    const art = [LINE('f', 6, { disposition: 'Keep', apprId: 'ap1', category: 'Art', objectName: 'Oil on canvas' })];
    const c2 = rig(TRUSTJ(), art);
    const go = c2.signoutGroups(c2.jobs[0], art)[0];
    const outT = text(inEastern(() => c2.signoutSheetHtml(c2.jobs[0], go, art, sig)));
    has(outT, 'Appraisal Hand-off', 'the hand-off title');
    has(outT, 'Handed to Mary Whalen for appraisal, to be returned to the property', 'says it comes back');
    has(outT, 'Title stays with', 'and whose it stays');
    lacks(outT, 'Approved in writing by', 'a hand-off is not a release: no approval column');
    c2.jobListPut(c2.jobs[0], 'signedRecords', { id: 'o1', kind: 'appraisal_out', ref: 'Mary Whalen', stableIds: ['f'], signedOn: '2026-10-10', filedAt: NOW - 1000 });
    const gb = c2.signoutGroups(c2.jobs[0], art)[0];
    const backT = text(inEastern(() => c2.signoutSheetHtml(c2.jobs[0], gb, art, Object.assign({}, sig, { name: 'Ashley Jerome' }))));
    has(backT, 'Appraisal Items Returned', 'the return title');
    has(backT, 'Received for Havellin Palm Beach, LLC by: Ashley Jerome', 'signed by the concierge receiving it');
    // A release to a person is the estate's receipt, signed.
    const dist = [LINE('d', 4, Object.assign({ disposition: 'Distribute', channel: 'Daniel Adler', objectName: 'Grandfather clock' }, OK))];
    const c3 = rig(TRUSTJ(), dist);
    const gr = c3.signoutGroups(c3.jobs[0], dist)[0];
    const rT = text(inEastern(() => c3.signoutSheetHtml(c3.jobs[0], gr, dist, sig)));
    has(rT, 'Receipt for Property Released', 'the receipt the estate already prints');
    has(rT, 'Received by: Sam Driver , signed on the iPad', 'with the signature in place of the blank lines');
    lacks(rT, '______', 'and no blank lines');
  });

  G('5 · the dialog: what it offers, who signs, and the refusals', () => {
    const lines = [LINE('a', 1, Object.assign({ disposition: 'Auction', channel: "Sotheby's Palm Beach" }, OK)),
      LINE('b', 2, { disposition: 'Auction', channel: "Sotheby's Palm Beach" }),
      LINE('f', 6, { disposition: 'Keep', apprId: 'ap1', category: 'Art' })];
    const job = TRUSTJ();
    const c = rig(job, lines);
    ok(c.openSignoutDialog(7, 'pickup', "sotheby's palm beach"), 'the dialog opens for the vendor');
    const body = c.__doc.getElementById('ip-body').innerHTML;
    ok(/data-sid="a"[^>]*checked/.test(body), 'the approved line is ticked');
    ok(/data-sid="b"[^>]*disabled/.test(body) && /awaiting written approval: not offered/.test(body), '⚠⚠ the unapproved line is disabled and says why');
    has(c.__doc.getElementById('ip-sub').innerHTML, 'Only lines the Successor Trustee has approved in writing are offered', 'the sub says the gate (invEveryFiduciaryPhrase: one trustee here, by the matter\'s title)');
    eq(c.__doc.getElementById('ip-signer').value, "Sotheby's Palm Beach", 'the signer box opens on the taker');
    eq(c.__doc.getElementById('ip-title').textContent, "Vendor Pickup List — Sotheby's Palm Beach", 'the title names the paper and the taker');
    ok(c.openPickupDialog(7, "sotheby's palm beach"), 'P22\'s opener still opens it');
    // The appraiser's return: the concierge signs.
    c.jobListPut(job, 'signedRecords', { id: 'o1', kind: 'appraisal_out', ref: 'Mary Whalen', stableIds: ['f'], signedOn: '2026-10-10', filedAt: NOW - 1000 });
    ok(c.openSignoutDialog(7, 'appraisal_back', 'Mary Whalen'), 'the return dialog opens');
    eq(c.__doc.getElementById('ip-signer').value, 'Ashley Jerome', 'the device\'s user signs the return');
    has(c.__doc.getElementById('ip-sub').innerHTML, 'You sign as the one receiving it', 'and the sub says so');
    eq(c.openSignoutDialog(7, 'pickup', 'Nobody Here'), false, 'a taker with no line: refused');
    // Refusals on the glass route, by name, nothing filed.
    c.openSignoutDialog(7, 'pickup', "sotheby's palm beach");
    ticks(c, []);
    eq(c.signoutFileFromPad(), false, 'nothing ticked: refused');
    has(c.__doc.getElementById('ip-fb').innerHTML, 'Tick the lines being signed for.', 'and says so');
    ticks(c, ['a']);
    c.__doc.getElementById('ip-signer').value = '';
    eq(c.signoutFileFromPad(), false, 'no signer: refused');
    has(c.__doc.getElementById('ip-fb').innerHTML, 'Type the name of the person signing.', 'by name');
    c.__doc.getElementById('ip-signer').value = 'Sam Driver';
    c._signPads['ip-pad'].strokes = 1;
    eq(c.signoutFileFromPad(), false, '⚠⚠ a tap is not a signature');
    has(c.__doc.getElementById('ip-fb').innerHTML, 'Sign the sheet first', 'and says so');
    eq(c.__log.filed.length, 0, 'nothing reached the filer');
    const c0 = rig(TRUSTJ(), lines, { url: '' });
    c0.openSignoutDialog(7, 'pickup', "sotheby's palm beach"); ticks(c0, ['a']); c0.__doc.getElementById('ip-signer').value = 'Sam Driver';
    eq(c0.signoutFileFromPad(), false, 'no Apps Script URL: refused');
    has(c0.__doc.getElementById('ip-fb').innerHTML, 'cannot make the PDF', 'and offers the paper route');
    const cf = rig(TRUSTJ(), lines, { pdfFails: true });
    cf.openSignoutDialog(7, 'pickup', "sotheby's palm beach"); ticks(cf, ['a']); cf.__doc.getElementById('ip-signer').value = 'Sam Driver';
    inEastern(() => cf.signoutFileFromPad());
    has(cf.__doc.getElementById('ip-fb').innerHTML, 'the PDF could not be made', 'a failed conversion is named');
    eq(cf.__log.filed.length, 0, 'and nothing is filed');
  });

  G('5 · the glass route: the PDF made, the copy filed as signed on the iPad, the custody event written; a void takes it off', () => {
    const lines = [LINE('a', 1, Object.assign({ disposition: 'Auction', channel: "Sotheby's Palm Beach" }, OK)),
      LINE('f', 6, { disposition: 'Keep', apprId: 'ap1', category: 'Art', objectName: 'Oil on canvas' })];
    const job = TRUSTJ();
    const c = rig(job, lines);
    c.openSignoutDialog(7, 'pickup', "sotheby's palm beach"); ticks(c, ['a']); c.__doc.getElementById('ip-signer').value = 'Sam Driver';
    ok(inEastern(() => c.signoutFileFromPad()), 'the vendor\'s sheet goes');
    eq(c.__log.posts.map((p) => p.action), ['htmlToPdf'], '⚠⚠ one PDF through the backend\'s one conversion');
    has(c.__log.posts[0].html, 'data:image/png;base64,SIGNATURE', 'carrying the signature');
    has(c.__log.posts[0].html, 'Vendor Pickup List', 'and the sheet');
    const f = c.__log.filed[0];
    eq([f.kind, f.meta.ref, f.meta.stableIds, f.meta.signedBy, f.meta.signedOn, f.meta.glass, f.file.type, f.file.name], ['pickup', "Sotheby's Palm Beach", ['a'], 'Sam Driver', '2026-10-18', true, 'application/pdf', 'Vendor Pickup List.pdf'],
      '⚠⚠ filed as the vendor\'s pickup list, the signer named, signed on the glass, a PDF');
    eq(c.invRecordedGone(lines[0], job), true, 'the line is gone');
    eq(c.custodyEvents(lines[0]).map((e) => [e.action, e.party, e.method]), [['Released', "Sotheby's Palm Beach", 'Vendor pickup']], 'a Released custody event (a trust keeps the log)');
    has(c.__log.badges.join(' '), '1 line recorded as picked up, each with a custody event.', 'the notice');
    eq(c.__doc.getElementById('inv-pickup-modal').style.display, 'none', 'the dialog closes');
    has(c.signedRecordLinksHtml(7, job.signedRecords), 'signed by Sam Driver on the iPad', 'the record link says it was signed on the iPad');
    // The appraiser's hand-off and return.
    c.openSignoutDialog(7, 'appraisal_out', 'Mary Whalen'); ticks(c, ['f']); c.__doc.getElementById('ip-signer').value = 'Mary Whalen';
    ok(inEastern(() => c.signoutFileFromPad()), 'the hand-off goes');
    eq(c.__log.filed[1].kind, 'appraisal_out', 'filed as the hand-off');
    eq(c.custodyEvents(lines[1]).map((e) => [e.action, e.party, e.method]), [['Transferred', 'Mary Whalen', 'Out for appraisal']], '⚠⚠ a Transferred event, never Released: the line is not gone');
    eq(c.invRecordedGone(lines[1], job), false, 'and invRecordedGone agrees');
    ok(c.invOutForAppraisal(lines[1], job), 'out');
    has(text(c._renderInvRow(job, lines[1], {})), '⚖ with Mary Whalen since Oct 18, 2026', '⚠⚠ the row says where it is');
    has(c.closeOpenWorkFlag(job), '1 line is still out with an appraiser (#6 with Mary Whalen)', 'the close question names it');
    has(text(c._renderInvReleasesCard(job, lines)), 'Mary Whalen · back from appraisal · 1 line (#6) Check 1 back in from Mary Whalen', 'the card offers the return');
    c.openSignoutDialog(7, 'appraisal_back', 'Mary Whalen'); ticks(c, ['f']);
    ok(inEastern(() => c.signoutFileFromPad()), 'the return goes');
    eq(c.__log.filed[2].kind, 'appraisal_back', 'filed as the return');
    eq(c.custodyEvents(lines[1]).map((e) => e.action), ['Transferred', 'Returned'], 'and a Returned event');
    eq(c.invOutForAppraisal(lines[1], job), null, 'back');
    eq(c.closeOpenWorkFlag(job), '', 'nothing out');
    // A void takes the events off with the paper.
    c.voidSignedRecord(7, 'sr3');
    eq(c.custodyEvents(lines[1]).map((e) => e.action), ['Transferred'], '⚠⚠ voiding the return tombstones its event');
    ok(c.invOutForAppraisal(lines[1], job), 'and the line is out again');
    c.voidSignedRecord(7, 'sr2');
    eq(c.custodyEvents(lines[1]).length, 0, 'voiding the hand-off tombstones that one too');
  });

  G('6 · one definition each, and who reads it', () => {
    has(noComments(decl('SIGNED_RECORD_KINDS')), "appraisal_out:  { label: 'Appraisal hand-off list' }", 'the hand-off kind');
    has(noComments(decl('SIGNED_RECORD_KINDS')), "appraisal_back: { label: 'Appraisal items returned' }", 'the return kind');
    has(noComments(fn('fileSignedCopy')), 'glass: !!meta.glass', 'the filer records a signature on the glass');
    has(noComments(fn('voidSignedRecord')), "rec.kind === 'pickup' || rec.kind === 'appraisal_out' || rec.kind === 'appraisal_back'", 'a void of any of the three takes its custody events');
    eq(readers('_signoutRecordCustody'), ['_signoutAfterFile', 'pickupRecordCustody'], 'the one custody writer: the dialog and P22\'s vendor call');
    eq(readers('invOutForAppraisal'), ['_renderInvRow', 'closeOpenWorkFlag', 'printAppraisalWorklist', 'signoutCovered', 'signoutGroups'], 'who asks whether a line is out: the row, the close, the worklist, the groups');
    lacks(noComments(fn('invRecordedGone')), 'appraisal', '⚠⚠ gone never reads the appraiser\'s papers');
    has(noComments(fn('signoutLineKind')), 'invIsFirearm(ref)) return \'\'', 'firearms are refused at the one gate');
    has(noComments(fn('signoutGroups')), "(fid && !invApprovalComplete(r, job)) ? 'waiting' : 'ready'", '⚠⚠ an estate\'s leaving line waits on the one approval predicate');
    // The documents.
    const root = path.join(__dirname, '..');
    ['MANUAL.md', 'manual.html', 'CONCIERGE_GUIDE.md', 'concierge-guide.html'].forEach((f) => {
      const d = fs.readFileSync(path.join(root, f), 'utf8');
      has(d, 'sign out on the iPad', f + ' names the sign-out');
      has(d, 'Appraisal Hand-off', f + ' names the appraiser\'s sheet');
    });
    has(fs.readFileSync(path.join(root, 'COUNSEL_REVIEW_BUNDLE.md'), 'utf8'), 'D17.', 'the sheet\'s words are in the counsel bundle');
  });
};
