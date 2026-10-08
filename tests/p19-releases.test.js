'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P19 · W3 · THE DESK'S RELEASES (2026-10-03). Anthony, on the estate workflow: "i'm good with all of your calls.
// build it all".
//
//   C1  Beneficiaries and specific bequests (call 7): a roster and the designated items as the representative or
//       counsel gives them, matched to inventory lines by item number. A flagged line no bequest covers is named; a
//       bequest with no line reads "not yet found"; a matched line proposed to go anywhere but its beneficiary carries
//       a caution, naming them, through invReleaseCautions (the request, its badge, the desk row, the bulk sweep).
//   C2  Beneficiary receipts: "a signed receipt is held for every item released to a beneficiary" (the estate
//       agreement's §5.3 and the client estimate). A printed receipt per recipient, filed back as a signed copy; a
//       line counts as receipted only when a live filed receipt lists it (a typed Receipt / Doc does not).
//   C3  Every co-representative approves a release (call 4): one predicate, invApprovalComplete; the request prints a
//       line per fiduciary; Record approval is a dialog that refuses, naming who is missing, until all are ticked.
//   C4  Signed copies on the desk: the approvals, the adopted Court Inventory, the received Trust Schedule.
//   C5  Staff never buy (call 6): a sale or a release To a person naming one of Havellin's people is refused in the
//       handler (the row and panel, the bulk bar).
//   C6  The wording on a trust: the request's fallback by matter, the bequest caution's "designated by the will or
//       the trust", the property and records by matter.
//
// Everything is DRIVEN through the real functions, each sandbox the root's own call graph derived from the source,
// with the boundaries (the network, the printer, the store saves, the repaint) stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// The functions and top-level vars `roots` reach. `stop` names what the test supplies itself.
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
  return { fns: [...fns], vars: [...vars] };
}
// The boundaries every desk sandbox stubs. A lifted `var jobs = []` would overwrite the job the test hands in.
const BOUNDARY = ['jobs', '_photoRefs', 'estimateStore', 'contractors', 'showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync',
  'saveJobs', 'syncJobToSheets', '_printDocument', 'alert', 'document', '_invPrintThumb', '_invThumbHTML', '_signedCopyRepaint',
  'uploadToDrive', 'resolveSubfolderId', 'FileReader', 'SHEETS_SYNC_URL', '_invPick', '_invFilter', '_invBulkLast', 'jobPlanStore',
  'changeOrders', '_invOpen', '_agDupSet', '_invThumbFailed'];
function lift(roots, stubs) {
  const c = closure(roots, BOUNDARY.concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#39;/g, "'")
  .replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&rarr;/g, '→').replace(/&mdash;/g, '—')
  .replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const count = (h, needle) => String(h || '').split(needle).length - 1;

// ── Fixtures: a trust estate administered by two co-trustees, and its inventory ─────────────────────────────────
const TRUST = () => ({ id: 7, name: 'Walter Ellsworth', hvlId: 'HVL-0007', svc: 'cleanout', matterType: 'trust', docTier: 'values',
  trustName: 'Ellsworth Family Trust', addr: '69 Beach Blvd', city: 'Palm Beach', executor: 'Ruth Adler', executorRole: 'Trustee',
  deathDate: '2026-04-02', won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1,
  coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', role: 'Co-trustee' }] });
const PROBATE = () => ({ id: 8, name: 'Tripp Butler Sr', hvlId: 'HVL-0008', svc: 'probate', matterType: 'probate', docTier: 'values',
  addr: '12 Ocean Way', executor: 'Tripp Butler', deathDate: '2026-03-01', won: true, status: 'active', tc: 'Ashley Jerome', updatedAt: 1 });
const LIVING = () => ({ id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing_move', addr: '14 Coconut Row',
  destAddr: '801 Sunset Ave', won: true, status: 'won', tc: 'Ashley Jerome', updatedAt: 1 });
const LINE = (id, n, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, itemNo: n, status: 'uploaded', qty: 1,
  objectName: 'Line ' + n, category: 'Furniture', condition: 'Good', ts: 100 + n, updatedAt: 100 + n,
}, over || {});
const BOTH = 'Ruth Adler; Daniel Adler';

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // A desk sandbox: the job, its lines, and the boundaries recorded.
  function desk(roots, job, lines, extra) {
    const log = { alerts: [], badges: [], printed: [], renders: 0, syncs: 0, saves: 0 };
    const doc = domStub({});
    const stubs = Object.assign({
      jobs: [job], _photoRefs: { [job.id]: lines || [] }, estimateStore: {}, contractors: [],
      showSyncBadge(m, err) { log.badges.push({ m: String(m), err: !!err }); },
      renderInventoryTab() { log.renders++; }, _scheduleInventorySync() { log.syncs++; },
      saveJobs() { log.saves++; }, syncJobToSheets() {},
      _printDocument(h, t) { log.printed.push({ html: h, title: t }); return true; },
      alert(m) { log.alerts.push(String(m)); },
      document: doc, _invPrintThumb() { return ''; }, _invThumbHTML() { return '<div></div>'; },
      _signedCopyRepaint() {}, _invPick: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' }, _invBulkLast: null,
      jobPlanStore: {}, changeOrders: [], _invOpen: {}, _agDupSet: {}, _invThumbFailed: {},
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P19W3/exec',
    }, extra || {});
    const S = lift(roots, stubs);
    S.window.confirm = () => true;
    S.__log = log; S.__doc = doc;
    return S;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  G('C3 · invApprovalComplete: every fiduciary on the job, compared as people; with nobody recorded, the rule before P19', () => {
    const S = desk(['invApprovalComplete', 'invApprovalGap', 'invApprovalMissing', 'invApprovalNames'], TRUST(), []);
    const job = S.jobs[0];
    const L = (authBy, approvalDate) => ({ stableId: 'x', authBy, approvalDate });
    ok(S.invApprovalComplete(L(BOTH, '2026-10-02'), job), 'both co-trustees named, with a date: approved');
    ok(!S.invApprovalComplete(L('Ruth Adler', '2026-10-02'), job), '⚠⚠ one co-trustee alone is not an approval');
    eq(S.invApprovalMissing(L('Ruth Adler', '2026-10-02'), job), ['Daniel Adler'], 'and the one missing is named');
    has(S.invApprovalGap(L('Ruth Adler', '2026-10-02'), job), 'Daniel Adler has not approved it, and every co-trustee must',
        'the flag says why, in the trust\'s word for them');
    // RESTATED 2026-10-05 (P20, Q24): who has signed is read through invApprovalSignedText, never the field (which carries
    // each signer's own ISO date once their days differ), so "(recorded: Ruth Adler, Oct 2, 2026)" reads as below.
    has(S.invApprovalGap(L('Ruth Adler', '2026-10-02'), job), '. Signed so far by Ruth Adler (Oct 2, 2026).', 'and what was recorded');
    ok(!S.invApprovalComplete(L(BOTH, ''), job), 'no date is no approval');
    ok(!S.invApprovalComplete(L('', '2026-10-02'), job), 'no signer is no approval');
    // Typed by hand: the separators people use, a bracketed role, case and spacing.
    ['Ruth Adler, Daniel Adler', 'Ruth Adler & Daniel Adler', 'ruth adler and DANIEL  ADLER', 'Ruth Adler (Trustee) / Daniel Adler (Co-trustee)']
      .forEach((t) => ok(S.invApprovalComplete(L(t, '2026-10-02'), job), 'typed as "' + t + '": both are named'));
    ok(!S.invApprovalComplete(L('Ruth Anderson; Daniel Adler', '2026-10-02'), job), 'a different person is not Ruth Adler ("and" inside a name is not a separator)');
    // A co-trustee recorded AFTER the approval makes it incomplete.
    const later = Object.assign(TRUST(), { coFiduciaries: TRUST().coFiduciaries.concat([{ id: 'cf2', name: 'Sam Adler' }]) });
    ok(!S.invApprovalComplete(L(BOTH, '2026-10-02'), later), '⚠⚠ a co-trustee recorded since the approval makes it incomplete');
    has(S.invApprovalGap(L(BOTH, '2026-10-02'), later), 'Sam Adler has not approved it', 'and the flag names them');
    const voided = Object.assign(TRUST(), { coFiduciaries: [{ id: 'cf1', name: 'Daniel Adler', voidedAt: 5 }] });
    ok(S.invApprovalComplete(L('Ruth Adler', '2026-10-02'), voided), 'a voided co-trustee is no one');
    // With nobody recorded, the rule before P19: a name and a date.
    ok(S.invApprovalComplete(L('Margaret Ellsworth', '2026-10-02'), LIVING()), 'a living client: the name and the date');
    ok(S.invApprovalComplete(L('Anyone', '2026-10-02'), Object.assign(TRUST(), { executor: '', coFiduciaries: [] })), 'an estate with nobody named yet: the same');
    ok(S.invApprovalComplete(L('Anyone', '2026-10-02')), 'and with no job at all');
    // One representative: their name must be the one on the approval.
    const solo = PROBATE();
    ok(S.invApprovalComplete(L('Tripp Butler', '2026-10-02'), solo), 'the representative alone, as recorded');
    ok(!S.invApprovalComplete(L('Jane Counsel, Esq.', '2026-10-02'), solo), '⚠ a signature from somebody who is not the fiduciary is not written authority');
    // RESTATED 2026-10-05 (P20, Q24): the same sentence, read through the one readable form.
    has(S.invApprovalGap(L('Jane Counsel, Esq.', '2026-10-02'), solo), 'Tripp Butler has not approved it. Signed so far by Jane Counsel, Esq. (Oct 2, 2026).', 'and says so, without a co- word');
    eq(S.invApprovalGap(L(BOTH, '2026-10-02'), job), '', 'a complete approval has no gap');
    eq(S.invApprovalGap(L('', ''), job), '', 'and no approval recorded is not a gap (the line simply awaits one)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C3 · every reader of "this line has written authority" asks the one predicate (counted)', () => {
    const live = noComments(SRC);
    // Who reads authBy / approvalDate at all, by function. A writer, the store's field lists and the displays are named;
    // anything else reading them is a second opinion of what approved means.
    const FN_RE = /(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g;
    const owners = new Set();
    let m;
    while ((m = FN_RE.exec(SRC))) {
      const name = m[2];
      let body; try { body = noComments(fn(name)); } catch (e) { continue; }
      if (/\.authBy\b|\.approvalDate\b|\bauthBy:|\bapprovalDate:/.test(body)) owners.add(name);
    }
    const ALLOWED = {
      invApprovalNames: 'the rule: parses who signed', invApprovalComplete: 'the rule', invApprovalGap: 'the rule: why it is not complete',
      invApprovalBatches: 'the desk\'s list of recorded approvals, grouped as they were recorded',
      invSaveApproval: 'the writer (Record approval)', savePhotoRefs: 'the manifest\'s field whitelist',
      _invCellRead: 'the panel\'s read-only date display', printApprovalRequest: 'prints who has signed so far, beside the gap',
      probatePackageRecordHtml: 'the package\'s record of what was recorded, marked where it is not complete',
      printDispositionLedger: 'W5\'s ledger: prints who authorized each line, as recorded',
      // RESTATED 2026-10-05 (P20, Q24): each signer's own date rides authBy, so the field has one parser, one readable
      // form and one merge, and the displays read those instead of the field.
      invApprovalSigners: 'the one parser (P20): who signed and when each signed',
      invApprovalSignedText: 'the one readable form (P20): never a raw ISO date in front of a reader',
      invApprovalWithSigners: 'the writer\'s rule (P20): names added, never dropped, each keeping its first date',
      // P22: the item record's box shows the readable form and saves the stored one, and the merge unions the signers.
      invApprovalBoxText: 'the Authorized By box (P22): the readable form where a signer\'s own day is stored',
      invApprovalBoxToStored: 'the box\'s save (P22): a reader\'s date back to the stored one',
      _invEdit: 'the box\'s writer (P22): stores the stored form and stamps the hand edit',
      _invApprovalEntries: 'the merge (P22): the entries Record approval writes, keyed by name',
      invMergeApprovals: 'the merge (P22): signers unioned per line, as the server does',
      _invApprovalSetAt: 'the merge (P22): when the list was last edited by hand',
    };
    const extra = [...owners].filter((n) => !ALLOWED[n]).sort();
    eq(extra, [], '⚠⚠ no function outside the rule, the writer and the displays reads authBy or approvalDate');
    ok(owners.has('invApprovalComplete') && owners.has('invSaveApproval'), 'fixture: the scan finds the rule and the writer');
    // And the readers of the answer: each one asks invApprovalComplete (directly, or through invFirearmAuthorized).
    const callers = [...ALL_FNS].filter((n) => { try { return /\binvApprovalComplete\(/.test(noComments(fn(n))) && n !== 'invApprovalComplete'; } catch (e) { return false; } }).sort();
    // RESTATED 2026-10-05 (P20): three more read the one predicate, and none decides it on its own: what left before it was
    // complete (invRatificationOwed, Q23), an act's lines still open (invApprovalBatches) and what Record approval's dialog
    // says it will leave open (invApprovalLeftOpen, Q24).
    eq(callers, ['_invAwaitingApproval', 'invApprovalBatches', 'invApprovalLeftOpen', 'invFirearmAuthorized', 'invRatificationOwed',
                 'invReleasedToPerson', 'planDerivedLines'].sort(),
       'the direct readers: the request\'s list, the desk\'s acts, the dialog, the firearm gate, ratification, what counts as released for a receipt, the Job Plan line');
    const viaFirearm = [...ALL_FNS].filter((n) => { try { return /\binvFirearmAuthorized\(/.test(noComments(fn(n))) && n !== 'invFirearmAuthorized'; } catch (e) { return false; } }).sort();
    eq(viaFirearm, ['invReleaseBlocked', 'invTransportBlocked'], 'and the two firearm gates read it through invFirearmAuthorized');
    // Every caller of the firearm gates hands the job over, so a co-trustee recorded on it holds the firearm.
    const gateCalls = live.match(/\binv(?:ReleaseBlocked|TransportBlocked|TransportReason|Transportable)\(([^)]*)\)/g) || [];
    const noJob = gateCalls.filter((c) => !/,/.test(c));
    eq(noJob, [], '⚠ no live call of a firearm gate leaves the job out');
    ok(gateCalls.length >= 10, 'fixture: the scan sees the gate calls (' + gateCalls.length + ')');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C3 · Record approval: a dialog, every co-trustee ticked or nothing written, then the signed request offered to Drive', () => {
    const lines = [LINE('a', 1, { disposition: 'Auction', clearedAt: { authBy: 5 } }), LINE('b', 2, { disposition: 'Donate' }), LINE('c', 3, { disposition: 'Keep' })];
    const S = desk(['invRecordApproval', 'invSaveApproval', 'closeInvApproval', 'fileSignedCopyFromInput'], TRUST(), lines,
      { _invPick: { a: 1, b: 1 }, _todayStr: () => '2026-10-03' });
    const doc = S.__doc;
    ok(S.invRecordApproval(7), 'the dialog opens');
    eq(doc.getElementById('inv-approval-modal').style.display, 'flex', 'the modal is shown');
    const body = doc.getElementById('ia-body').innerHTML;
    has(body, 'id="ia-fid-0"', 'a tick for the first fiduciary');
    has(body, 'id="ia-fid-1"', 'and one for the second');
    has(text(body), 'Ruth Adler · Trustee', 'each named with their role');
    has(text(body), 'Daniel Adler · Co-trustee', 'both of them');
    has(text(body), 'Every co-trustee must sign', 'and the rule is stated');
    lacks(body, 'ia-signer', 'no free-text signer where fiduciaries are recorded');
    has(doc.getElementById('ia-sub').innerHTML, '#1 Line 1', 'the lines it covers are named');
    eq(doc.getElementById('ia-date').value || (/id="ia-date" value="([^"]+)"/.exec(body) || [])[1], '2026-10-03', 'dated today by default');
    // RESTATED 2026-10-05 (P20, Q24; Anthony: "yes", let Record approval save a partial approval). P19 refused one
    // co-trustee ticked alone, naming the other, and a co-trustee recorded since the dialog opened; both are now saved as a
    // partial approval, said before saving and never refused (tests/p20-approvals.test.js drives both). What is still
    // refused: nobody ticked, and a date not in the stored form, each with nothing written.
    doc.__seed('ia-fid-0', false); doc.__seed('ia-fid-1', false); doc.__seed('ia-date', '2026-10-02');
    eq(S.invSaveApproval(), false, 'nobody ticked: refused');
    has(text(doc.getElementById('ia-fb').innerHTML), 'Not recorded: tick the signatures on the returned request.', 'and the refusal says what to do');
    ok(!lines[0].authBy && !lines[1].authBy, 'nothing was written to either line');
    doc.__seed('ia-fid-0', true); doc.__seed('ia-fid-1', true);
    doc.__seed('ia-date', '02/10/2026');
    eq(S.invSaveApproval(), false, 'a date not in the stored form: refused');
    ok(!lines[0].authBy && !lines[1].authBy, 'and nothing written');
    doc.__seed('ia-date', '2026-10-02');
    // The desk repaints as the approval lands, and its approvals list draws a control for this same batch (one spec per
    // paper): the dialog's own control must be drawn after it, or the dialog would stay open over a filed request.
    S.renderInventoryTab = () => { S.__log.renders++; S.signedCopyControlHtml(7, 'approval', { ref: '2026-10-02 ' + BOTH }, 'File signed copy'); };
    ok(S.invSaveApproval(), 'every co-trustee ticked: recorded');
    eq([lines[0].authBy, lines[0].approvalDate], [BOTH, '2026-10-02'], '⚠⚠ authBy is every name, joined by "; ", and the date');
    eq([lines[1].authBy, lines[1].approvalDate], [BOTH, '2026-10-02'], 'on every line it covers');
    ok(!lines[2].authBy, 'and on no other');
    ok(!('authBy' in (lines[0].clearedAt || {})), 'an old deliberate clear no longer outranks the new approval');
    ok(lines[0].updatedAt > 101, 'the line\'s clock moved (it wins the manifest merge)');
    eq(S.__log.syncs >= 1, true, 'and the inventory sync is scheduled');
    // The file offer: the foundation's control, for the approval batch and exactly the lines it covers.
    const acts = doc.getElementById('ia-actions').innerHTML;
    const idx = (/fileSignedCopyFromInput\(this,(\d+)\)/.exec(acts) || [])[1];
    ok(idx !== undefined, 'the dialog offers File the signed request');
    has(acts, 'File the signed request', 'labelled for what it files');
    const spec = S._signedCopySpecs[Number(idx)] || {};
    eq([spec.kind, spec.meta && spec.meta.ref, spec.meta && spec.meta.stableIds, spec.meta && spec.meta.signedBy, spec.meta && spec.meta.signedOn],
       ['approval', '2026-10-02 ' + BOTH, ['a', 'b'], BOTH, '2026-10-02'], 'kind approval, the batch\'s ref, its lines, who signed and when');
    eq(typeof spec.after, 'function', '⚠ and the dialog\'s follow-up (close, repaint) survives the desk\'s repaint of the same paper');
    ok(S.__log.renders >= 1, 'fixture: the desk did repaint');
    // The living client: who signed, typed; blank refused.
    const L2 = [LINE('l', 1, { disposition: 'Distribute', channel: 'Sarah Ellsworth (daughter)' })];
    const V = desk(['invRecordApproval', 'invSaveApproval'], LIVING(), L2, { _invPick: { l: 1 }, _todayStr: () => '2026-10-03' });
    V.invRecordApproval(2);
    const vb = V.__doc.getElementById('ia-body').innerHTML;
    has(vb, 'id="ia-signer" value="Margaret Ellsworth"', 'a living client: who signed, prefilled with the client');
    lacks(vb, 'ia-fid-0', 'and no fiduciary ticks');
    V.__doc.__seed('ia-signer', '  '); V.__doc.__seed('ia-date', '2026-10-03');
    eq(V.invSaveApproval(), false, 'a blank signer is refused');
    V.__doc.__seed('ia-signer', 'Margaret Ellsworth');
    ok(V.invSaveApproval(), 'a named one is recorded');
    eq(L2[0].authBy, 'Margaret Ellsworth', 'as typed');
    // Nothing selected: refused before any dialog.
    const N = desk(['invRecordApproval'], TRUST(), lines, { _invPick: {} });
    eq(N.invRecordApproval(7), false, 'nothing selected: refused');
    has(N.__log.alerts.join(' '), 'Select the items the signed approval covers', 'with the fix');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C3/C6 · the release approval request: every fiduciary signs; a partial approval is named; the wording follows the matter', () => {
    const lines = [LINE('a', 1, { disposition: 'Auction', fmv: '4000' }),
                   LINE('b', 2, { disposition: 'Sell', fmv: '900', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
                   LINE('c', 3, { disposition: 'Donate', fmv: '50', authBy: BOTH, approvalDate: '2026-10-01' })];
    const S = desk(['printApprovalRequest'], TRUST(), lines);
    S.printApprovalRequest(7);
    const h = (S.__log.printed[0] || {}).html || '';
    const t = text(h);
    has(h, 'To <strong>Ruth Adler and Daniel Adler</strong>', '⚠ addressed to both co-trustees');
    // RESTATED 2026-10-08 (the job-flow audit): two signers read "both", never "all 2".
    has(t, 'Every co-trustee named below must sign: nothing on this list is approved until both of you have.', 'and says every one must sign');
    eq(count(h, 'Approved by: ____'), 2, '⚠⚠ one signature line per fiduciary');
    has(t, 'Ruth Adler, Trustee / authorized fiduciary', 'each named, with the role recorded');
    has(t, 'Daniel Adler, Co-trustee / authorized fiduciary', 'both of them');
    has(t, 'Every co-trustee named below signs. A line is approved only when both signatures are here.', 'above the signature block too');
    has(t, 'Line 2', '⚠ a line one co-trustee approved is back on the request');
    has(t, 'Signed so far by Ruth Adler (Oct 1, 2026); still to sign: Daniel Adler', 'saying who has signed and who has not');
    lacks(t, 'Line 3', 'a line both approved is not asked for again');
    // C6 on a trust: the property, the records, no court words.
    has(t, 'Havellin and its people never purchase or receive trust property, and take no share of the proceeds of its sale.', '⚠⚠ the staff rule for all property, in the trust\'s words');
    has(t, 'it is filed with the trust’s records', 'filed with the trust\'s records');
    lacks(t, 'Personal Representative', 'no Personal Representative on a trust');
    lacks(t, 'estate record', 'nor an estate record');
    // No fiduciary recorded: the role by matter.
    const roleOf = (job) => { const R = desk(['printApprovalRequest'], Object.assign(job, { executor: '', coFiduciaries: [] }), [LINE('q', 1, { disposition: 'Donate' })]);
      R.printApprovalRequest(job.id); return (R.__log.printed[0] || {}).html || ''; };
    has(roleOf(TRUST()), 'To <strong>Successor Trustee</strong>', '⚠ a trust with nobody named: the Successor Trustee');
    has(roleOf(PROBATE()), 'To <strong>Personal Representative</strong>', 'a probate matter: the Personal Representative, as before');
    has(roleOf(Object.assign(TRUST(), { matterType: 'both' })), 'To <strong>Personal Representative or Successor Trustee</strong>', 'a pour-over: either');
    has(roleOf(Object.assign(TRUST(), { matterType: 'neither' })), 'To <strong>Authorized Representative</strong>', 'neither a court nor a trust: the authorized representative');
    has(roleOf(Object.assign(TRUST(), { matterType: '' })), 'To <strong>Personal Representative</strong>', 'unanswered: the wording before P19');
    // The firearms note: title stays with the holder, and the purchase rule is the general one now.
    const gun = LINE('g', 4, { category: 'Firearms', objectName: 'Remington 870', disposition: 'Consign' });
    const F = desk(['printApprovalRequest'], TRUST(), [gun]);
    F.printApprovalRequest(7);
    const ft = text((F.__log.printed[0] || {}).html || '');
    has(ft, 'title stays with the trust throughout.', '⚠ on a trust, title stays with the trust');
    lacks(ft, 'neither purchases estate firearms', 'the firearms-only purchase clause gave way to the general rule');
    has(ft, 'never purchase or receive trust property', 'which is printed');
    const P = desk(['printApprovalRequest'], PROBATE(), [gun]);
    P.printApprovalRequest(8);
    const pt = text((P.__log.printed[0] || {}).html || '');
    has(pt, 'title stays with the estate throughout.', 'on probate, the estate');
    has(pt, 'never purchase or receive estate property', 'and estate property');
    has(pt, 'filed with the estate record and retained for seven years', 'filed with the estate record, as before');
    eq(count((P.__log.printed[0] || {}).html, 'Approved by: ____'), 1, 'one representative: one line, as before');
    // The living client's request is unchanged: one line, no fiduciary, no staff sentence.
    const V = desk(['printApprovalRequest'], LIVING(), [LINE('v', 1, { disposition: 'Donate' })]);
    V.printApprovalRequest(2);
    const vh = (V.__log.printed[0] || {}).html || '';
    has(vh, 'To <strong>Margaret Ellsworth</strong>', 'a living client is addressed by name');
    eq(count(vh, 'Approved by: ____'), 1, 'one line');
    lacks(vh, 'authorized fiduciary', 'not a fiduciary');
    lacks(vh, 'never purchase or receive', 'and the estate rule is not printed on a living client\'s request');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C3 · the firearm gate and the Job Plan\'s release-authority line wait for every co-trustee', () => {
    const gun = LINE('g', 5, { category: 'Firearms', objectName: 'Remington 870', disposition: 'Consign', channel: 'Palm Beach Arms (FFL)',
                               serial: 'RS1', authBy: 'Ruth Adler', approvalDate: '2026-10-01' });
    const S = desk(['invTransportBlocked', 'invTransportReason', 'invReleaseBlocked', 'invTransportable'], TRUST(), [gun]);
    const job = S.jobs[0];
    eq(S.invTransportBlocked(gun, job), 'authority', '⚠⚠ one co-trustee\'s approval does not clear a firearm to carry');
    ok(S.invReleaseBlocked(gun, job), 'and it is held');
    has(S.invTransportReason(gun, job), 'Written authority is not complete. Daniel Adler has not approved it, and every co-trustee must',
        'the reason names who, not "no written authority on file"');
    gun.authBy = BOTH;
    eq(S.invTransportBlocked(gun, job), '', 'both: cleared to carry');
    ok(S.invTransportable(gun, job), 'transportable');
    eq(S.invTransportBlocked(Object.assign({}, gun, { authBy: 'Ruth Adler' })), '', 'without the job, the rule before P19 (a name and a date)');
    // The Appraisal Worklist's withheld block: a firearm one co-trustee authorised stays on it, and it names who authorises.
    const wl = (job, g) => { const W = desk(['printAppraisalWorklist'], job, [g], { maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }) });
      const r2 = attempt(() => W.printAppraisalWorklist(job.id)); return r2.ok ? text((W.__log.printed[0] || {}).html) : 'threw: ' + r2.err; };
    const held = (o) => LINE('h', 6, Object.assign({ category: 'Firearms', objectName: 'Shotgun', fmv: '900', disposition: 'Consign', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }, o || {}));
    has(wl(TRUST(), held()), '1 firearm is awaiting written authority', '⚠ one co-trustee\'s approval leaves the firearm withheld on the worklist');
    has(wl(TRUST(), held()), 'Nothing is released until every co-trustee has authorised the transfer', 'and it says every co-trustee authorises');
    has(wl(PROBATE(), held({ authBy: '' })), 'Nothing is released until the Personal Representative has authorised the transfer', 'on probate, the Personal Representative');
    has(wl(Object.assign(TRUST(), { executor: '', coFiduciaries: [] }), held({ authBy: '' })), 'until the Successor Trustee has authorised', '⚠ on a trust with nobody named, never "the personal representative"');
    // The Job Plan's p2 line.
    const lines = [LINE('a', 1, { disposition: 'Auction', authBy: BOTH, approvalDate: '2026-10-01' }),
                   LINE('b', 2, { disposition: 'Sell', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
                   LINE('c', 3, { disposition: 'Donate' })];
    const J = Object.assign(TRUST(), { coFiduciaries: [{ id: 'cf1', name: 'Daniel <Adler>' }] });
    lines[0].authBy = 'Ruth Adler; Daniel <Adler>';
    const P = desk(['planDerivedLines'], J, lines, { isAgreementSigned: () => true, isJobFunded: () => true });
    const est = { svc: 'cleanout', rooms: [], vendors: [], totTC: 10, totPS: 10 };
    const r = attempt(() => P.planDerivedLines(7, P.jobs[0], est, 'p2'));
    ok(r.ok, 'the p2 lines compute' + (r.ok ? '' : ': ' + r.err));
    const line = ((r.val || []).filter((l) => l.key === 'release_authority')[0]) || {};
    eq(line.ok, false, 'not every line leaving has complete authority');
    has(line.detail, '1 of 3', '⚠⚠ counted by the one predicate: the partial approval does not count');
    has(line.detail, '1 still needs the approval of Daniel &lt;Adler&gt; (every co-trustee signs)', 'and the missing co-trustee is named, escaped');
    // The estate package's record of signed approvals marks one that not every co-trustee signed.
    const pl = [LINE('a', 1, { objectName: 'Sargent portrait', disposition: 'Auction', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
                LINE('b', 2, { objectName: 'Desk', disposition: 'Sell', authBy: BOTH, approvalDate: '2026-10-02' })];
    const PK = desk(['probatePackageRecordHtml'], TRUST(), pl);
    const pr = attempt(() => text(PK.probatePackageRecordHtml(7)));
    // RESTATED 2026-10-05 (P20, Q24): who approved prints through invApprovalSignedText, each signer with their day.
    has(pr.ok ? pr.val : 'threw: ' + pr.err, 'Ruth Adler (Oct 1, 2026) Not complete: no approval recorded from Daniel Adler',
        '⚠ the package record marks the approval one co-trustee signed as not complete, naming who is missing');
    eq(count(pr.val, 'Not complete'), 1, 'and only that one');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C1 · the bequest list: handlers write through the record lists; matching marks the line; refusals name the fix', () => {
    const lines = [LINE('a', 1, { objectName: 'Sargent portrait', disposition: 'Auction' }), LINE('b', 2, { objectName: 'Tea service' }),
                   LINE('c', 3, { objectName: 'Locket', disposition: 'Distribute', channel: 'John Smith' }),
                   LINE('e', 5, { objectName: 'Tabriz rug', disposition: 'Sell', flagBequest: true })];
    const S = desk(['invSaveBeneficiary', 'invEditBeneficiary', 'invRemoveBeneficiary', 'invSaveBequest', 'invMatchBequest',
                    'invUnmatchBequest', 'invRemoveBequest', 'invEditBequest', '_invEdit'], TRUST(), lines);
    const job = S.jobs[0], doc = S.__doc;
    doc.__seed('bq-ben-name-7', 'Mary Smith'); doc.__seed('bq-ben-rel-7', 'niece'); doc.__seed('bq-ben-phone-7', '(561) 555-0110'); doc.__seed('bq-ben-email-7', 'mary@x.com');
    ok(S.invSaveBeneficiary(7), 'a beneficiary is saved');
    const mary = (job.beneficiaries || [])[0] || {};
    eq([mary.name, mary.relationship, mary.phone, mary.email, mary.recordedBy], ['Mary Smith', 'niece', '(561) 555-0110', 'mary@x.com', 'Ashley Jerome'], 'with what was typed, and who recorded it');
    ok(typeof (job.at || {})['beneficiaries:' + mary.id] === 'number', 'stamped on its own key: a person\'s edit, through jobListPut');
    eq(doc.getElementById('bq-ben-name-7').value, '', 'the form clears');
    doc.__seed('bq-ben-name-7', 'mary  SMITH (niece)');
    eq(S.invSaveBeneficiary(7), false, 'the same person twice is refused');
    eq(job.beneficiaries.length, 1, 'and not added');
    S.invEditBeneficiary(7, mary.id);
    eq(doc.getElementById('bq-ben-name-7').value, 'Mary Smith', 'Edit fills the form');
    doc.__seed('bq-ben-phone-7', '(561) 555-0199');
    ok(S.invSaveBeneficiary(7), 'and saves over the same entry');
    eq([job.beneficiaries.length, job.beneficiaries[0].phone, job.beneficiaries[0].id], [1, '(561) 555-0199', mary.id], 'one entry, corrected, the same id');
    // A bequest: description as given, the beneficiary, lines by item number.
    doc.__seed('bq-desc-7', 'the Sargent portrait of my mother'); doc.__seed('bq-benid-7', mary.id); doc.__seed('bq-items-7', '#1, 99');
    eq(S.invSaveBequest(7), false, 'an item number no line carries: refused');
    has(S.__log.alerts.pop(), 'No line on this inventory carries item #99', 'named');
    eq((job.bequests || []).length, 0, 'nothing recorded');
    doc.__seed('bq-items-7', '1');
    ok(S.invSaveBequest(7), 'the bequest is recorded');
    const bq = job.bequests[0] || {};
    eq([bq.description, bq.beneficiaryId, bq.stableIds], ['the Sargent portrait of my mother', mary.id, ['a']], 'in the representative\'s words, for Mary, matched to line #1');
    ok(lines[0].flagBequest === true, '⚠⚠ matching a line marks it a specific bequest');
    ok(S.__log.syncs >= 1, 'and the manifest syncs');
    // Match another line by number, then a line another bequest holds.
    doc.__seed('bq-match-' + bq.id, '3');
    ok(S.invMatchBequest(7, bq.id), 'Match adds #3');
    eq(job.bequests[0].stableIds, ['a', 'c'], 'to the same bequest');
    ok(lines[2].flagBequest === true, 'and marks it');
    doc.__seed('bq-ben-name-7', 'John Smith');
    S.invSaveBeneficiary(7);
    const john = job.beneficiaries[1];
    doc.__seed('bq-desc-7', 'my locket'); doc.__seed('bq-benid-7', john.id); doc.__seed('bq-items-7', '3');
    eq(S.invSaveBequest(7), false, 'a line already matched to another bequest: refused');
    has(S.__log.alerts.pop(), '#3 Locket is matched to the bequest to Mary Smith. A line belongs to one bequest: unmatch it there first.', 'naming the bequest that holds it');
    // The flag cannot be cleared on a matched line from its record.
    const box = { type: 'checkbox', checked: false };
    S._invEdit(7, 'c', 'flagBequest', box);
    ok(lines[2].flagBequest === true && box.checked === true, '⚠ a matched line keeps its Specific Bequest flag, and the box is put back');
    has(S.__log.alerts.pop(), 'Unmatch it on the Beneficiaries & specific bequests card first', 'with the fix');
    // A beneficiary a bequest names is not removed.
    eq(S.invRemoveBeneficiary(7, mary.id), false, 'Mary is named on a bequest: not removed');
    has(S.__log.alerts.pop(), 'Mary Smith is named on a bequest (“the Sargent portrait of my mother”)', 'named, with the bequest');
    ok(S.invRemoveBeneficiary(7, john.id), 'John, named on none, is removed');
    eq(job.beneficiaries.map((b) => b.name), ['Mary Smith'], 'off the list');
    ok(typeof job.at['beneficiaries:' + john.id] === 'number', '⚠ a stamped removal, so the sheet keeps it removed');
    // Unmatch keeps the flag; removing the bequest keeps the flags.
    ok(S.invUnmatchBequest(7, bq.id, 'c'), 'unmatch #3');
    eq(job.bequests[0].stableIds, ['a'], 'off the bequest');
    ok(lines[2].flagBequest === true, 'and the line keeps its flag until somebody decides (the card names it)');
    ok(S.invRemoveBequest(7, bq.id), 'the bequest is removed');
    eq((job.bequests || []).length, 0, 'off the list');
    ok(lines[0].flagBequest === true, 'its line keeps its flag');
    // A living client has no bequest list.
    const V = desk(['invSaveBeneficiary', 'invSaveBequest'], LIVING(), []);
    V.__doc.__seed('bq-ben-name-2', 'Sarah');
    eq(V.invSaveBeneficiary(2), false, 'a living client: refused');
    ok(!V.jobs[0].beneficiaries, 'nothing written');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C1 · the checks: unmatched flags named, "not yet found", and a designated item going elsewhere, through invReleaseCautions', () => {
    const mk = () => {
      const job = Object.assign(TRUST(), {
        beneficiaries: [{ id: 'b1', name: 'Mary Smith', relationship: 'niece' }, { id: 'b2', name: 'John Smith' }],
        bequests: [{ id: 'q1', description: 'the Sargent portrait', beneficiaryId: 'b1', stableIds: ['a', 'b', 'c'] },
                   { id: 'q2', description: 'the gold watch', beneficiaryId: 'b2', stableIds: [] }] });
      const lines = [LINE('a', 1, { objectName: 'Sargent portrait', disposition: 'Auction', flagBequest: true }),
                     LINE('b', 2, { objectName: 'Tea service', disposition: 'Distribute', channel: 'Mary Smith (niece)', flagBequest: true }),
                     LINE('c', 3, { objectName: 'Locket', disposition: 'Distribute', channel: 'John Smith', flagBequest: true }),
                     LINE('e', 5, { objectName: 'Tabriz rug', disposition: 'Sell', flagBequest: true }),
                     LINE('k', 6, { objectName: 'Desk', disposition: 'Keep' })];
      return { job, lines };
    };
    const { job, lines } = mk();
    const S = desk(['invReleaseCautions', '_invCautionBadges', '_invCautionNotices', '_renderInvBequestCard', '_renderInvRow', 'printApprovalRequest', '_invBulkApply'], job, lines);
    const keys = (r) => S.invReleaseCautions(r, 7).map((c) => c.key);
    eq(keys(lines[0]), ['bequestElsewhere'], '⚠⚠ a matched line proposed for Auction carries the bequest caution (and not the generic one)');
    eq(keys(lines[1]), [], 'a matched line going to the person its bequest names carries none: the bequest is being carried out');
    eq(keys(lines[2]), ['bequestElsewhere'], 'a matched line going to ANOTHER person carries it');
    eq(keys(lines[3]), ['flagBequest'], 'a flagged line no bequest covers keeps the generic caution');
    eq(keys(lines[4]), [], 'a line not leaving carries nothing');
    const c = S.INV_RELEASE_CAUTIONS.filter((x) => x.key === 'bequestElsewhere')[0];
    eq(c.badgeFor(lines[0], 7), 'BEQUEST TO MARY SMITH', 'the badge names the beneficiary');
    eq(c.note(lines[2], 7), 'bequest to Mary Smith; proposed: Distribute to John Smith', 'and the note what is proposed');
    // The request: the notice above the table names the line and the person; the row is badged.
    S.printApprovalRequest(7);
    const h = (S.__log.printed[0] || {}).html || '', t = text(h);
    has(t, 'Designated items proposed to go elsewhere', 'the notice renders');
    has(t, '#1 Sargent portrait (bequest to Mary Smith; proposed: Auction)', '⚠⚠ naming the line, its beneficiary and the proposal');
    has(t, '#3 Locket (bequest to Mary Smith; proposed: Distribute to John Smith)', 'and the one going to someone else');
    has(h, '&#9888; BEQUEST TO MARY SMITH', 'the row carries the badge');
    ok(h.indexOf('Designated items proposed to go elsewhere') < h.indexOf('Proposed disposition'), 'above the table');
    has(t, 'Confirm it with counsel before initialling.', 'it flags and explains, never refuses');
    has(t, 'Tea service', 'the line going to its beneficiary is still on the request');
    // C6: the generic caution's wording.
    has(t, 'designated by the will or the trust for a particular person', '⚠ "designated by the will or the trust"');
    lacks(t, 'left by the will', 'never "left by the will"');
    lacks(SRC.slice(SRC.indexOf('var INV_RELEASE_CAUTIONS'), SRC.indexOf('function invReleaseCautions(')), 'estate may need the proceeds', 'nor "the estate may need the proceeds"');
    // The desk card: the three checks.
    const card = S._renderInvBequestCard(job, lines), ct = text(card);
    has(ct, 'Flagged Specific Bequest, and no bequest on the list covers it: #5 Tabriz rug', '⚠ the flagged line no bequest covers is named');
    has(ct, '“the gold watch” → John Smith', 'each bequest, in the words given, with its beneficiary');
    has(ct, '“the gold watch” → John Smith not yet found', '⚠ a bequest with no line reads "not yet found" on its own row');
    has(ct, '1 bequest not yet found on the inventory', 'and is counted');
    has(ct, 'Designated items proposed to go elsewhere: #1 Sargent portrait (bequest to Mary Smith; proposed: Auction) · #3 Locket', 'the lines going elsewhere');
    has(card, '<datalist id="inv-ben-list-7"><option value="Mary Smith"></option><option value="John Smith"></option></datalist>', 'the roster as suggestions');
    has(ct, 'Havellin never reads or interprets the will or the trust', 'and the card says whose list it is');
    // The desk row's chip, through the same rule.
    const row = S._renderInvRow(job, lines[0]);
    has(text(row), '⚠ bequest to Mary Smith · going elsewhere', '⚠ the desk row says so');
    has(text(S._renderInvRow(job, lines[1])), 'bequest to Mary Smith', 'a line going to its beneficiary names them quietly');
    lacks(text(S._renderInvRow(job, lines[1])), 'going elsewhere', 'without the caution');
    has(text(S._renderInvRow(job, lines[3])), 'bequest · not on the list', 'and the unmatched flag says so');
    // The bulk bar's sweep names the person.
    S._invPick = { b: 1 };
    S._invBulkApply(7, 'disposition', 'Donate');
    has(S.__log.badges.map((b) => b.m).join(' '), 'flagged bequest going elsewhere — #2 Tea service (bequest to Mary Smith; proposed: Donate)',
        '⚠ the bulk bar names a designated item it just swept to Donate, and whose it is');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C2 · receipts: what counts as released, printed per recipient, filed back as a signed copy, counted on the desk', () => {
    const job = Object.assign(TRUST(), { coFiduciaries: [] });
    const lines = [
      LINE('a', 1, { objectName: 'Tea service', qty: 1, condition: 'Excellent', disposition: 'Distribute', channel: 'Mary Smith (niece)', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
      LINE('b', 2, { objectName: 'Silver tray', qty: 2, condition: 'Fair', disposition: 'Distribute', channel: 'mary smith', dispDate: '2026-10-02', receiptDoc: 'signed' }),
      LINE('c', 3, { objectName: 'Clock', disposition: 'Distribute', channel: 'Mary Smith', custodyLog: [{ cid: 'x', action: 'Released', party: 'Mary Smith', date: '2026-10-02' }] }),
      LINE('d', 4, { objectName: 'Lamp', disposition: 'Distribute', channel: 'Mary Smith' }),
      LINE('e', 5, { objectName: 'Chairs', disposition: 'Donate', authBy: 'Ruth Adler', approvalDate: '2026-10-01' })];
    const uploads = [];
    const S = desk(['invReleasedToPerson', 'invReceiptOwed', 'invReceiptGroups', 'printBeneficiaryReceipt', 'fileSignedCopy', 'voidSignedRecord',
                    '_renderInvReleasesCard', 'planDerivedLines'], job, lines, {
      resolveSubfolderId(j, name, cb) { cb('SIGNED7'); },
      uploadToDrive(folderId, filename, dataUrl, cb) { uploads.push({ folderId, filename }); cb(true, 'https://drive.google.com/file/d/R' + uploads.length + '/view', 'R' + uploads.length); },
      FileReader: function () { const self = this; self.readAsDataURL = function (f) { self.result = 'data:' + f.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
      isAgreementSigned: () => true, isJobFunded: () => true,
    });
    const rel = lines.map((r) => S.invReleasedToPerson(r, job));
    eq(rel, [true, true, true, false, false], '⚠⚠ released to a person: approved, or recorded as gone (a disposition date, a Released custody event); not a line still awaiting approval, and never a donation');
    eq(lines.map((r) => S.invReceiptOwed(r, job)), [true, true, true, false, false], 'every one released is owed a receipt — a typed "signed" in Receipt / Doc included');
    const g = S.invReceiptGroups(job, lines);
    eq(g.length, 1, 'one recipient, however her name was typed');
    eq([g[0].name, g[0].released.map((r) => r.stableId), g[0].owed.length, g[0].waiting.map((r) => r.stableId)],
       ['Mary Smith', ['a', 'b', 'c'], 3, ['d']], 'released, owed and still waiting');
    // The desk card.
    const card = text(S._renderInvReleasesCard(job, lines));
    has(card, 'Mary Smith · released: #1, #2, #3 · ⚠ no signed receipt filed for #1, #2, #3', 'the card names what is owed');
    has(card, '#4 going to them awaits written approval, so it is not on a receipt yet', 'and what is not yet released');
    has(card, '#2’s Receipt / Doc reads “signed”: a typed reference, not a signed receipt filed to Drive', '⚠ a typed receiptDoc is shown as what it is');
    has(card, 'File signed receipt (#1, #2, #3)', 'the filing names the lines it covers');
    const rspec = [...S._renderInvReleasesCard(job, lines).matchAll(/fileSignedCopyFromInput\(this,(\d+)\)/g)]
      .map((m) => S._signedCopySpecs[Number(m[1])]).filter((s) => s && s.kind === 'receipt')[0] || { meta: {} };
    eq([rspec.meta.ref, (rspec.meta.stableIds || []).slice().sort()], ['Mary Smith', ['a', 'b', 'c']],
       '⚠⚠ and files against exactly those lines: never #4, still awaiting approval');
    const pd0 = (S.planDerivedLines(7, job, { svc: 'cleanout', rooms: [], vendors: [], totTC: 0, totPS: 0 }, 'admin') || [])
      .filter((l) => l.key === 'beneficiary_receipts')[0] || {};
    has(pd0.detail, '0 of 3', '⚠ the Job Admin line does not count a typed Receipt / Doc as a receipt');
    // Print: the receipt.
    ok(S.printBeneficiaryReceipt(7, 'Mary Smith (niece)'), 'the receipt prints');
    const p = S.__log.printed[S.__log.printed.length - 1] || {}, ph = p.html || '', pt = text(ph);
    has(pt, 'Receipt for Property Released', 'titled');
    // RESTATED 2026-10-08 (the job-flow audit): the trust is named by its title, through trustInstrumentTitle (the agreement's
    // and the Trust Schedule's namer), and "the trustees" where more than one fiduciary is recorded (job-flow-audit.test.js).
    has(pt, 'Released to Mary Smith from the trustee of The Ellsworth Family Trust', '⚠ who it came from, by matter: the trustee of the trust');
    ['Tea service', 'Silver tray', 'Clock'].forEach((x) => has(pt, x, 'lists ' + x));
    lacks(pt, 'Lamp', 'not the line awaiting approval');
    has(ph, '>Excellent<', 'with its condition');
    has(ph, 'text-align:right;">2<', 'and quantity');
    has(pt, 'I acknowledge that I received the property listed above, in the condition described, from the trustee of The Ellsworth Family Trust, delivered to me by Havellin Palm Beach, LLC as directed in writing by Ruth Adler.',
        'the acknowledgment, naming who directed the delivery');
    has(pt, 'it does not decide who owns the property or what it is worth, and it does not release or waive any right or claim concerning the trust.', 'and what it is not');
    has(pt, 'Signature of Mary Smith', 'the recipient\'s signature');
    has(pt, 'Printed name:', 'printed name');
    has(pt, 'Witnessed for Havellin Palm Beach, LLC', 'and Havellin\'s witness line');
    has(pt, 'Havellin keeps the signed receipt with the trust’s records', 'kept with the trust\'s records');
    lacks(pt, 'Case ', 'no court on a trust\'s paper');
    has(String(p.title), 'Receipt - Mary Smith', 'the PDF named for the recipient');
    // By matter: an estate, and a pour-over.
    const E = desk(['printBeneficiaryReceipt'], Object.assign(PROBATE(), { id: 7 }), lines);
    E.printBeneficiaryReceipt(7, 'Mary Smith');
    has(text((E.__log.printed[0] || {}).html), 'from the Estate of Tripp Butler Sr', 'a probate matter: the Estate of the decedent');
    has(text((E.__log.printed[0] || {}).html), 'concerning the estate.', 'and the estate');
    const B = desk(['printBeneficiaryReceipt'], Object.assign(TRUST(), { matterType: 'both', coFiduciaries: [] }), lines);
    B.printBeneficiaryReceipt(7, 'Mary Smith');
    has(text((B.__log.printed[0] || {}).html), 'from the Estate of Walter Ellsworth or the trustee of The Ellsworth Family Trust, as the property is held', 'a pour-over: either, as held');
    // Refusals. A living client's line released to a person is owed no receipt and prints none.
    const vline = LINE('v', 1, { objectName: 'Armchair', disposition: 'Distribute', channel: 'Sarah Ellsworth', authBy: 'Margaret Ellsworth', approvalDate: '2026-10-02' });
    const V = desk(['printBeneficiaryReceipt', 'invReceiptOwed', 'invReleasedToPerson'], LIVING(), [vline]);
    ok(V.invReleasedToPerson(vline, V.jobs[0]), 'fixture: a living client\'s line released to a person');
    eq(V.invReceiptOwed(vline, V.jobs[0]), false, '⚠ no receipt is owed on a living client (the living-client agreement has none)');
    eq(V.printBeneficiaryReceipt(2, 'Sarah Ellsworth'), false, 'a living client: no receipt');
    eq([V.__log.printed.length, (V.__log.alerts[0] || '').indexOf('A receipt is kept for property released from an estate') >= 0], [0, true],
       '⚠ nothing printed, and it says why');
    eq(S.printBeneficiaryReceipt(7, 'Nobody'), false, 'nothing released to that person: refused');
    has(S.__log.alerts.pop(), 'Nothing has been released to Nobody yet', 'and says why');
    // File the signed receipt through the real fileSignedCopy, a stubbed upload.
    let res = null;
    S.fileSignedCopy(7, 'receipt', { ref: 'Mary Smith', stableIds: ['a', 'b'], signedBy: 'Mary Smith', label: 'Signed receipt — Mary Smith' },
      { name: 'receipt.pdf', type: 'application/pdf', size: 1000 }, (okd, msg, rec) => { res = { okd, msg, rec }; });
    ok(res && res.okd, 'the signed receipt files');
    eq(uploads[0] && uploads[0].folderId, 'SIGNED7', 'to Signed Records');
    eq(lines.map((r) => S.invReceiptOwed(r, job)), [false, false, true, false, false], '⚠⚠ the two lines it lists are receipted; the third is still owed');
    const pd = (S.planDerivedLines(7, job, { svc: 'cleanout', rooms: [], vendors: [], totTC: 0, totPS: 0 }, 'admin') || [])
      .filter((l) => l.key === 'beneficiary_receipts')[0] || {};
    eq([pd.label, pd.ok], ['Signed receipt for every item released to a person', false], 'the Job Admin line');
    has(pd.detail, '2 of 3', 'N of M');
    // A receipt voided as filed against the wrong paper no longer counts.
    S.window.prompt = () => 'filed against the wrong recipient';
    ok(S.voidSignedRecord(7, res.rec.id), 'the receipt is voided');
    eq(S.invReceiptOwed(lines[0], job), true, 'and the line is owed a receipt again');
    // Everything receipted: the line is green.
    S.fileSignedCopy(7, 'receipt', { ref: 'Mary Smith', stableIds: ['a', 'b', 'c'] }, { name: 'r2.pdf', type: 'application/pdf', size: 1 }, () => {});
    const pd2 = (S.planDerivedLines(7, job, { svc: 'cleanout', rooms: [], vendors: [], totTC: 0, totPS: 0 }, 'admin') || [])
      .filter((l) => l.key === 'beneficiary_receipts')[0] || {};
    eq([pd2.ok, pd2.detail], [true, '3 of 3'], 'every one receipted: done');
    has(text(S._renderInvReleasesCard(job, lines)), '✓ every one receipted', 'and the card says so');
    // ⚠ A receipt one person signed never clears a line since re-routed to somebody else.
    lines[1].channel = 'John Ruiz';
    eq([S.invReceiptOwed(lines[1], job), S.invReceiptOwed(lines[0], job)], [true, false],
       '⚠⚠ #2 re-routed to John Ruiz: Mary Smith\'s receipt does not clear it; #1, still hers, stays receipted');
    const g2 = S.invReceiptGroups(job, lines);
    const john = g2.filter((x) => x.name === 'John Ruiz')[0] || { owed: [], filed: [] };
    const mary = g2.filter((x) => x.name === 'Mary Smith')[0] || { owed: [], filed: [] };
    eq([john.owed.map((r) => r.stableId), john.filed.length, mary.filed.length], [['b'], 0, 1],
       'John is owed a receipt for #2 and lists none filed; Mary\'s signed receipt stays listed under her');
    has(text(S._renderInvReleasesCard(job, lines)), 'John Ruiz · released: #2 · ⚠ no signed receipt filed for #2', 'and the card says so');
    lines[1].channel = 'mary smith';
    // A co-trustee recorded after the handover makes the approval incomplete, and does not unmake the receipt: the
    // recipient's signed word that it went is itself a record that it went.
    job.coFiduciaries = [{ id: 'cf9', name: 'Sam Adler' }];
    ok(!S.invApprovalComplete(lines[0], job), 'fixture: line #1\'s approval is incomplete now');
    ok(S.invReleasedToPerson(lines[0], job), '⚠ and it still counts as released: a signed receipt is filed for it');
    eq(S.invReceiptOwed(lines[0], job), false, 'with nothing owed');
    eq(S.invReleasedToPerson(LINE('w', 9, { disposition: 'Distribute', channel: 'Mary Smith', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }), job), false,
       'while a line with the same incomplete approval and no receipt is not released');
    job.coFiduciaries = [];
    // No line released to a person: no line at all.
    const none = desk(['planDerivedLines'], TRUST(), [LINE('z', 1, { disposition: 'Donate' })], { isAgreementSigned: () => true, isJobFunded: () => true });
    eq((none.planDerivedLines(7, none.jobs[0], { svc: 'cleanout', rooms: [], vendors: [] }, 'admin') || []).filter((l) => l.key === 'beneficiary_receipts').length, 0,
       'nothing released to a person: no receipt line');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C5 · staff never buy: refused in the row, the panel and the bulk bar, naming the rule', () => {
    const mk = () => [LINE('a', 1, { objectName: 'Sargent portrait', disposition: 'Sell' }),
                      LINE('b', 2, { objectName: 'Desk', disposition: 'Distribute', channel: '' }),
                      LINE('c', 3, { objectName: 'Lamp', disposition: 'Keep', channel: 'Anthony Graziano Jr (crew)' }),
                      LINE('d', 4, { objectName: 'Sofa', disposition: 'Donate' })];
    let lines = mk();
    const S = desk(['_invEdit', '_invBulkApply'], PROBATE(), lines, {
      contractors: [{ id: 'c9', name: 'Carla Ortiz', role: 'PS', status: 'inactive' }], _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {} });
    S.jobs[0].id = 8;
    const el = (v) => ({ value: v, type: 'text' });
    // The channel written on a sale.
    const e1 = el('Ashley Jerome');
    S._invEdit(8, 'a', 'channel', e1);
    eq(lines[0].channel, undefined, '⚠⚠ a sale to the job\'s concierge is refused: nothing written');
    eq(e1.value, '', 'and the box is put back');
    has(S.__log.alerts.pop(), 'Havellin and its people never buy or receive estate property, and take no share of the proceeds. Ashley Jerome is with Havellin, so #1 Sargent portrait cannot be sold or released to them. Nothing was changed.',
        'the refusal names the rule, the person and the line');
    S._invEdit(8, 'b', 'channel', el('carla  ortiz (crew)'));
    eq(lines[1].channel, '', 'a release To a person naming a contractor, inactive and typed loosely: refused');
    S._invEdit(8, 'b', 'channel', el('Anthony Graziano'));
    eq(lines[1].channel, '', 'a manager: refused');
    // The disposition written where the channel already names one of ours.
    const e2 = el('Distribute');
    S._invEdit(8, 'c', 'disposition', e2);
    eq([lines[2].disposition, e2.value], ['Keep', 'Keep'], '⚠ turning a line already naming a crew member into a release To a person: refused, and the select put back');
    S._invEdit(8, 'c', 'disposition', el('Auction'));
    eq(lines[2].disposition, 'Keep', 'or into a sale');
    S._invEdit(8, 'd', 'channel', el('Ashley Jerome'));
    eq(lines[3].channel, 'Ashley Jerome', 'a donation is outside the rule (the crew hauls to the charity)');
    S._invEdit(8, 'b', 'channel', el('Marie Delgado'));
    eq(lines[1].channel, 'Marie Delgado', 'an ordinary recipient is written');
    // The bulk bar refuses the whole sweep and names every line.
    lines = mk(); S._photoRefs[8] = lines;
    S._invPick = { a: 1, b: 1, d: 1 };
    S._invBulkApply(8, 'channel', 'Anthony Graziano Jr');
    eq(lines.map((r) => r.channel || ''), ['', '', 'Anthony Graziano Jr (crew)', ''], '⚠⚠ the bulk recipient is refused on every line');
    has(S.__log.alerts.pop(), 'Anthony Graziano Jr is with Havellin, so #1 Sargent portrait, #2 Desk cannot be sold or released to them. Nothing was changed.',
        'naming the lines it would have sold or released, and not the donation');
    S._invPick = { c: 1 };
    S._invBulkApply(8, 'disposition', 'Consign');
    eq(lines[2].disposition, 'Keep', 'the bulk disposition is refused where the channel names one of ours');
    // A living client gives their own things to whom they like.
    const V = desk(['_invEdit'], LIVING(), [LINE('v', 1, { disposition: 'Distribute' })], { _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {} });
    V._invEdit(2, 'v', 'channel', el('Ashley Jerome'));
    eq(V._photoRefs[2][0].channel, 'Ashley Jerome', 'a living client is not refused');
    // Havellin's people, one answer.
    const P = desk(['havellinPeople'], PROBATE(), [], { contractors: [{ name: 'Carla Ortiz', status: 'inactive' }] });
    const people = P.havellinPeople(P.jobs[0]);
    ['Anthony Graziano', 'Ashley Jerome', 'Anthony Graziano Jr', 'Carla Ortiz'].forEach((n) => ok(people.indexOf(n) >= 0, n + ' is one of Havellin\'s people'));
    // Each source on its own: a manager in no directory, and the job's own concierge in none.
    const M = desk(['havellinPeople'], Object.assign(PROBATE(), { tc: '' }), [], { MANAGER_PINS: [{ pin: '0000', name: 'Morgan Lee' }] });
    ok(M.havellinPeople(M.jobs[0]).indexOf('Morgan Lee') >= 0, '⚠ a manager in no directory is one of Havellin\'s people');
    const T = desk(['havellinPeople', '_invEdit'], Object.assign(PROBATE(), { tc: 'Pat Quinn (concierge)' }), [LINE('q', 1, { objectName: 'Clock', disposition: 'Sell' })],
      { _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {} });
    ok(T.havellinPeople(T.jobs[0]).indexOf('Pat Quinn') >= 0, '⚠ the job\'s own concierge, in no directory, is one of Havellin\'s people');
    T._invEdit(8, 'q', 'channel', el('pat quinn'));
    eq(T._photoRefs[8][0].channel, undefined, 'and a sale to them is refused');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('C4 · the desk\'s signed papers: approvals, receipts and the schedules by matter, each with File signed copy and its copies', () => {
    const lines = [LINE('a', 1, { disposition: 'Auction', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
                   LINE('b', 2, { disposition: 'Sell', authBy: BOTH, approvalDate: '2026-10-02' }),
                   LINE('c', 3, { disposition: 'Donate', authBy: BOTH, approvalDate: '2026-10-02' })];
    const job = Object.assign(TRUST(), { signedRecords: [{ id: 's1', kind: 'approval', ref: '2026-10-02 ' + BOTH, label: 'Signed release approval',
      signedBy: BOTH, signedOn: '2026-10-02', fileUrl: 'https://drive.google.com/file/d/AP/view', stableIds: ['b', 'c'] },
      { id: 's2', kind: 'schedule', ref: 'Trust Schedule', label: 'Received Trust Schedule', fileUrl: 'https://drive.google.com/file/d/TS/view' }] });
    const S = desk(['_renderInvReleasesCard'], job, lines);
    const h = S._renderInvReleasesCard(job, lines), t = text(h);
    has(t, 'Approved Oct 2, 2026 by Ruth Adler; Daniel Adler · 2 lines (#2, #3)', 'each recorded approval, with its lines');
    has(h, 'href="https://drive.google.com/file/d/AP/view"', 'its filed copy linked');
    has(t, 'File another copy', 'and a further copy offered');
    has(t, 'Approved Oct 1, 2026 by Ruth Adler · 1 line (#1)', 'the partial approval is listed too');
    has(t, '⚠ Daniel Adler has not approved it, and every co-trustee must', '⚠ with who is missing');
    has(t, 'Signed request not filed to Drive yet.', 'and that its paper is not filed');
    const idx = [...h.matchAll(/fileSignedCopyFromInput\(this,(\d+)\)/g)].map((m) => S._signedCopySpecs[Number(m[1])]);
    const appr = idx.filter((s) => s.kind === 'approval').map((s) => s.meta.ref).sort();
    eq(appr, ['2026-10-01 Ruth Adler', '2026-10-02 ' + BOTH], 'one control per approval batch, under the batch\'s ref');
    const sched = idx.filter((s) => s.kind === 'schedule').map((s) => s.meta.ref);
    eq(sched, ['Trust Schedule'], '⚠ a trust matter files the received Trust Schedule, and no Court Inventory');
    has(h, 'href="https://drive.google.com/file/d/TS/view"', 'its filed copy linked');
    const schedOf = (mt) => { const j = Object.assign(TRUST(), { matterType: mt }); const R = desk(['_renderInvReleasesCard'], j, lines);
      return [...R._renderInvReleasesCard(j, lines).matchAll(/fileSignedCopyFromInput\(this,(\d+)\)/g)].map((m) => R._signedCopySpecs[Number(m[1])])
        .filter((s) => s.kind === 'schedule').map((s) => s.meta.ref); };
    eq(schedOf('probate'), ['Court Inventory'], 'probate: the adopted Court Inventory');
    eq(schedOf('both'), ['Court Inventory', 'Trust Schedule'], 'a pour-over: both');
    eq(schedOf('neither'), [], 'neither a court nor a trust: neither instrument');
    eq(schedOf(''), ['Court Inventory'], 'unanswered: the Court Inventory, as the desk prints it');
    const cj = Object.assign(TRUST(), { docTier: 'contents' }); const C = desk(['_renderInvReleasesCard'], cj, lines);
    lacks(C._renderInvReleasesCard(cj, lines), 'Trust Schedule', 'not ours to issue at the contents tier: not offered');
    // A living client with a recorded approval: the approval list, no receipts, no schedules.
    const V = desk(['_renderInvReleasesCard'], LIVING(), [LINE('v', 1, { disposition: 'Donate', authBy: 'Margaret Ellsworth', approvalDate: '2026-10-02' })]);
    const vt = text(V._renderInvReleasesCard(V.jobs[0], V._photoRefs[2]));
    has(vt, 'Approved Oct 2, 2026 by Margaret Ellsworth', 'a living client\'s signed approval can be filed too');
    lacks(vt, 'receipt', 'no receipt requirement');
    eq(V._renderInvReleasesCard(V.jobs[0], []), '', 'nothing recorded: no card');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('The desk: the cards are drawn, the To a person box offers the roster, the flag strip counts receipts owed, the modal exists', () => {
    const tab = noComments(fn('renderInventoryTab'));
    has(tab, '_renderInvReleasesCard(job, all)', 'the releases card is on the desk');
    has(tab, '_renderInvBequestCard(job, all)', 'and the bequests card');
    const job = Object.assign(TRUST(), { beneficiaries: [{ id: 'b1', name: 'Mary "Mae" O\'Neil' }] });
    const S = desk(['_invRecipientInput', '_renderInvBulk', '_renderInvBequestCard', 'invWorkFlags'], job, [LINE('a', 1, { disposition: 'Distribute' })]);
    has(S._invRecipientInput(7, S._photoRefs[7][0], job), 'list="inv-ben-list-7"', '⚠ the To a person box offers the roster');
    lacks(S._invRecipientInput(7, LINE('s', 2, { disposition: 'Sell' }), job), 'list=', 'a sale\'s box does not');
    lacks(S._invRecipientInput(7, S._photoRefs[7][0], LIVING()), 'list=', 'nor a living client\'s');
    S._invPick = { a: 1 };
    has(S._renderInvBulk(job), 'list="inv-ben-list-7"', 'the bulk bar\'s recipient box too');
    const card = S._renderInvBequestCard(job, S._photoRefs[7]);
    has(card, '<option value="Mary &quot;Mae&quot; O&#39;Neil"></option>', 'a typed name is text in the datalist');
    has(card, 'onclick="invEditBeneficiary(7,&quot;b1&quot;)"', 'ids reach the handlers JSON-then-HTML escaped');
    eq(S._renderInvBequestCard(LIVING(), []), '', 'no bequest card on a living client');
    const flags = (j) => S.invWorkFlags(j).map((f) => f.key);
    ok(flags(job).indexOf('noreceipt') >= 0, 'the flag strip counts lines released with no signed receipt on an estate');
    ok(flags(LIVING()).indexOf('noreceipt') < 0, 'and not on a living job');
    const modal = SRC.slice(SRC.indexOf('id="inv-approval-modal"'), SRC.indexOf('id="inv-approval-modal"') + 700);
    ['id="ia-sub"', 'id="ia-body"', 'id="ia-fb"', 'id="ia-actions"'].forEach((x) => has(modal, x, 'the dialog carries ' + x));
    lacks(noComments(fn('invRecordApproval')), 'window.prompt', '⚠ Record approval no longer asks with two prompts');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('One definition each', () => {
    ['invApprovalComplete', 'invApprovalGap', 'invBequestFor', 'invBequestElsewhere', 'invReleasedToPerson', 'invReceiptOwed',
     'invHavellinRecipient', 'havellinPeople', 'invRecipientName', 'printBeneficiaryReceipt', '_renderInvReleasesCard', '_renderInvBequestCard']
      .forEach((n) => eq((SRC.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1, n + ' is defined once'));
    // The handlers write the lists only through the foundation's helpers.
    ['invSaveBeneficiary', 'invRemoveBeneficiary', 'invSaveBequest', 'invMatchBequest', 'invUnmatchBequest', 'invRemoveBequest'].forEach((n) => {
      const b = noComments(fn(n));
      ok(/jobList(Put|Remove)\(/.test(b), n + ' writes through jobListPut / jobListRemove');
      ok(!/\.(beneficiaries|bequests)\s*(=|\.push)/.test(b), n + ' never writes the list itself');
      ok(!/\bsaveJobs\(\)/.test(b), n + ' never saves the job store bare');
    });
    // The staff rule is asked by both handlers that write a channel or a disposition.
    // RESTATED 2026-10-05 (P20, Q25): invHavellinRecipient answers on every job now (the living client's caution reads it
    // too), so the estate's refusal is its own predicate, invStaffRefused, which reads it; both handlers ask that.
    ['_invEdit', '_invBulkApply'].forEach((n) => has(noComments(fn(n)), 'invStaffRefused(', n + ' asks the staff rule'));
    has(noComments(fn('invStaffRefused')), 'invHavellinRecipient(', 'which reads the one definition');
  });
};
