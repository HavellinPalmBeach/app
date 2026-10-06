'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P20 · WB · THE DESK'S RELEASES, ANSWERED (2026-10-05). Anthony, on Q22 to Q27: "A, and yes to all the others".
//
//   Q24  A partial approval: Record approval saves who signed and when, even when not every fiduciary is ticked, says
//        so plainly before saving ("Daniel Adler has not signed yet: these lines stay on the next request until they
//        do") and never refuses for it. Each signer's own date rides `authBy` ("Ruth Adler (2026-10-01); Daniel Adler
//        (2026-10-08)"), read through one parser, with `approvalDate` the latest. No new item field, no .gs change.
//        Every place a signer prints shows them readably, never a raw ISO date. The Releases & signed papers card lists
//        each signing act, and a copy filed for a partial act stays listed after a later signature completes the lines.
//   Q23  Ratification: a line recorded as gone whose written approval is incomplete is listed apart on the next
//        Approval Request, already released, for the missing fiduciaries' signature; nothing is undone. One predicate,
//        read by the request, the desk row's badge and the Job Plan's release-authority line.
//   Q25  The staff rule on a living client's job: flagged, never refused, through one caution in INV_RELEASE_CAUTIONS;
//        estates keep P19's refusal. One definition of "this line goes to a Havellin person", on any job.
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
  return { fns: [...fns].filter((n) => ALL_FNS.has(n)), vars: [...vars] };
}
const BOUNDARY = ['jobs', '_photoRefs', 'estimateStore', 'contractors', 'showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync',
  'saveJobs', 'syncJobToSheets', '_printDocument', 'alert', 'document', '_invPrintThumb', '_invThumbHTML', '_signedCopyRepaint',
  'uploadToDrive', 'resolveSubfolderId', 'FileReader', 'SHEETS_SYNC_URL', '_invPick', '_invFilter', '_invBulkLast', 'jobPlanStore',
  'changeOrders', '_invOpen', '_agDupSet', '_invThumbFailed', '_invRefreshSummary', '_invRefreshGuardrail', '_invRefreshFlagStrip',
  '_invRefreshRecords'];
function lift(roots, stubs) {
  const c = closure(roots, BOUNDARY.concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&#39;/g, "'")
  .replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&rarr;/g, '→').replace(/&mdash;/g, '—')
  .replace(/&#9888;/g, '⚠').replace(/&#10003;/g, '✓').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const count = (h, needle) => String(h || '').split(needle).length - 1;
// The text as a reader sees it where markup sits inside a sentence (a <strong> name): tags removed, not spaced.
const flat = (h) => text(String(h || '').replace(/<[^>]+>/g, ''));
const ISO_IN_BRACKETS = /\(\s*\d{4}-\d{2}-\d{2}\s*\)/;

// ── Fixtures: a trust estate administered by two co-trustees, a probate estate, a living client ───────────────────
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
const TWO_DAYS = 'Ruth Adler (2026-10-01); Daniel Adler (2026-10-08)';

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
      _invRefreshSummary() {}, _invRefreshGuardrail() {}, _invRefreshFlagStrip() {}, _invRefreshRecords() {},
      SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P20WB/exec',
    }, extra || {});
    const S = lift(roots, stubs);
    S.window.confirm = () => true;
    S.__log = log; S.__doc = doc;
    return S;
  }
  const specOf = (S, html, kind) => [...String(html).matchAll(/fileSignedCopyFromInput\(this,(\d+)\)/g)]
    .map((m) => S._signedCopySpecs[Number(m[1])]).filter((s) => s && (!kind || s.kind === kind));

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q24 · the one parser: each signer with their own day; the P19 form reads as before; the writer adds, never drops', () => {
    const S = desk(['invApprovalSigners', 'invApprovalNames', 'invApprovalSignedText', 'invApprovalWithSigners', 'invApprovalComplete',
                    'invApprovalMissing', 'invApprovalGap'], TRUST(), []);
    const job = S.jobs[0];
    const sig = (authBy, approvalDate) => S.invApprovalSigners({ authBy, approvalDate }).map((s) => [s.name, s.date]);
    // Backward compatible: an authBy with no bracketed dates (P19 and before) reads each name at approvalDate.
    eq(sig(BOTH, '2026-10-02'), [['Ruth Adler', '2026-10-02'], ['Daniel Adler', '2026-10-02']], 'the P19 form: every name on approvalDate');
    eq(sig('Tripp Butler', '2026-09-10'), [['Tripp Butler', '2026-09-10']], 'one name, as before');
    eq(sig(TWO_DAYS, '2026-10-08'), [['Ruth Adler', '2026-10-01'], ['Daniel Adler', '2026-10-08']], '⚠⚠ each signer with their own day');
    eq(sig('Ruth Adler (Trustee) (2026-10-01) / Daniel Adler', '2026-10-08'), [['Ruth Adler', '2026-10-01'], ['Daniel Adler', '2026-10-08']],
       'a role and a day, and a name without a day of its own signed on approvalDate');
    // The separators people type still split; never inside brackets.
    eq(S.invApprovalNames({ authBy: 'ruth adler and DANIEL  ADLER' }), ['ruth adler', 'DANIEL ADLER'], '"and" still separates');
    eq(S.invApprovalNames({ authBy: 'Ruth Adler (Oct 1, 2026); Daniel Adler (niece, by marriage)' }), ['Ruth Adler', 'Daniel Adler'],
       '⚠ a comma inside brackets is not a separator');
    eq(S.invApprovalNames({ authBy: 'Ruth Anderson; Daniel Adler' }), ['Ruth Anderson', 'Daniel Adler'], '"And" inside a name is not one');
    eq(S.invApprovalNames({ authBy: '' }), [], 'nothing recorded: nobody');
    // Readable, never an ISO date.
    eq(S.invApprovalSignedText({ authBy: 'Ruth Adler', approvalDate: '2026-10-01' }), 'Ruth Adler (Oct 1, 2026)', 'one signer, readably');
    eq(S.invApprovalSignedText({ authBy: BOTH, approvalDate: '2026-10-02' }), 'Ruth Adler; Daniel Adler (Oct 2, 2026)', 'the P19 form: the names as recorded and the day');
    eq(S.invApprovalSignedText({ authBy: TWO_DAYS, approvalDate: '2026-10-08' }), 'Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)', '⚠⚠ each with their own day');
    eq(S.invApprovalSignedText({ authBy: '', approvalDate: '2026-10-08' }), '', 'no signer: nothing to print');
    // The writer: added to whoever is recorded, the first date kept, the plain form while every signer signed one day.
    eq(S.invApprovalWithSigners({ authBy: 'Ruth Adler', approvalDate: '2026-10-01' }, ['Daniel Adler'], '2026-10-08'),
       { authBy: TWO_DAYS, approvalDate: '2026-10-08' }, '⚠⚠ a second signature a week later: each day kept, approvalDate the latest');
    eq(S.invApprovalWithSigners({ authBy: 'Ruth Adler', approvalDate: '2026-10-02' }, ['Daniel Adler'], '2026-10-02'),
       { authBy: BOTH, approvalDate: '2026-10-02' }, 'the same day: written plainly, as P19 wrote it');
    eq(S.invApprovalWithSigners({ authBy: TWO_DAYS, approvalDate: '2026-10-08' }, ['ruth adler', 'Sam Adler'], '2026-10-03'),
       { authBy: TWO_DAYS + '; Sam Adler (2026-10-03)', approvalDate: '2026-10-08' }, '⚠ never drops a name; a name recorded twice keeps its first date');
    eq(S.invApprovalWithSigners({ authBy: BOTH, approvalDate: '2026-10-02' }, ['Daniel Adler'], '2026-10-09'),
       { authBy: BOTH, approvalDate: '2026-10-02' }, 'a name already on the line changes nothing');
    eq(S.invApprovalWithSigners({}, ['Margaret Ellsworth'], '2026-10-02'), { authBy: 'Margaret Ellsworth', approvalDate: '2026-10-02' },
       'nothing recorded yet: the name and the day');
    // Complete reads the parser: both co-trustees, whatever day each signed.
    ok(S.invApprovalComplete({ authBy: TWO_DAYS, approvalDate: '2026-10-08' }, job), 'two signatures on two days: complete');
    ok(!S.invApprovalComplete({ authBy: 'Ruth Adler (2026-10-01)', approvalDate: '2026-10-01' }, job), 'one of two: open');
    eq(S.invApprovalMissing({ authBy: 'Ruth Adler (2026-10-01)', approvalDate: '2026-10-01' }, job), ['Daniel Adler'], 'and who is missing');
    // The gap reads the readable form, never the field.
    const gap = S.invApprovalGap({ authBy: 'Ruth Adler (2026-10-01); Sam Adler (2026-10-03)', approvalDate: '2026-10-03' }, job);
    eq(gap, 'Daniel Adler has not approved it, and every co-trustee must. Signed so far by Ruth Adler (Oct 1, 2026); Sam Adler (Oct 3, 2026).',
       '⚠ the flag names each signer with their own day');
    ok(!ISO_IN_BRACKETS.test(gap), 'and carries no ISO date');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q24 · Record approval saves a partial approval, says so before saving, and never refuses for it', () => {
    const lines = [LINE('a', 1, { disposition: 'Auction', clearedAt: { authBy: 5 } }), LINE('b', 2, { disposition: 'Donate' }), LINE('c', 3, { disposition: 'Keep' })];
    const S = desk(['invRecordApproval', 'invSaveApproval', 'closeInvApproval', 'invApprovalDialogNote', 'invApprovalComplete', 'fileSignedCopyFromInput'],
      TRUST(), lines, { _invPick: { a: 1, b: 1 }, _todayStr: () => '2026-10-01' });
    const doc = S.__doc, job = S.jobs[0];
    ok(S.invRecordApproval(7), 'the dialog opens');
    const body = doc.getElementById('ia-body').innerHTML;
    has(body, 'id="ia-note"', 'it carries a note the ticks repaint');
    eq(count(body, 'onchange="invApprovalDialogNote()"'), 2, 'each co-trustee\'s tick repaints it');
    has(text(body), 'Every co-trustee must sign before a line is approved: a signature recorded now is kept, and the lines stay on the next request until all 2 have signed.',
        '⚠ the rule, stated as it now is');
    lacks(text(body), 'not recorded until all', 'never says a partial approval will be refused');
    eq(S.invApprovalDialogNote(), '', 'nothing ticked: nothing said yet');
    // Ruth alone, before anything is saved: the dialog says Daniel has not signed.
    doc.__seed('ia-fid-0', true); doc.__seed('ia-fid-1', false); doc.__seed('ia-date', '2026-10-01');
    S.invApprovalDialogNote();
    eq(text(doc.getElementById('ia-note').innerHTML).trim(), 'Daniel Adler has not signed yet: these lines stay on the next request until they do.',
       '⚠⚠ the dialog says so plainly, before saving');
    ok(!lines[0].authBy && !lines[1].authBy, 'and nothing is written by saying it');
    // Saved, never refused.
    ok(S.invSaveApproval(), '⚠⚠ one co-trustee ticked: saved');
    eq(doc.getElementById('ia-fb').innerHTML, '', 'no refusal');
    eq([lines[0].authBy, lines[0].approvalDate], ['Ruth Adler', '2026-10-01'], 'who signed and when, on the first line');
    eq([lines[1].authBy, lines[1].approvalDate], ['Ruth Adler', '2026-10-01'], 'and the second');
    ok(!lines[2].authBy, 'and on no other line');
    ok(!('authBy' in (lines[0].clearedAt || {})), 'an old deliberate clear no longer outranks it');
    ok(lines[0].updatedAt > 101, 'the line\'s clock moved (it wins the manifest merge)');
    ok(!S.invApprovalComplete(lines[0], job), '⚠ the line stays open until every co-trustee has signed');
    const done = flat(doc.getElementById('ia-body').innerHTML);
    has(done, 'Approval recorded on 2 items, signed by Ruth Adler on Oct 1, 2026.', 'the confirmation');
    has(done, 'Daniel Adler has not signed yet: these lines stay on the next request until they do.', 'says it again');
    const sp = specOf(S, doc.getElementById('ia-actions').innerHTML, 'approval')[0] || { meta: {} };
    eq([sp.meta.ref, sp.meta.signedBy, sp.meta.signedOn, sp.meta.stableIds], ['2026-10-01 Ruth Adler', 'Ruth Adler', '2026-10-01', ['a', 'b']],
       'the signed request Ruth signed is offered to Drive as its own act');
    // A week later Daniel signs the same lines.
    S._invPick = { a: 1, b: 1 };
    ok(S.invRecordApproval(7), 'the dialog opens again');
    has(text(doc.getElementById('ia-body').innerHTML), 'Ruth Adler · Trustee · already signed all 2 lines', 'it says who has signed these lines already');
    doc.__seed('ia-fid-0', false); doc.__seed('ia-fid-1', true); doc.__seed('ia-date', '2026-10-08');
    S.invApprovalDialogNote();
    has(text(doc.getElementById('ia-note').innerHTML), 'With this signature every co-trustee has signed: the lines are approved.', 'the note says the ticks complete it');
    ok(S.invSaveApproval(), 'Daniel\'s signature is recorded');
    eq([lines[0].authBy, lines[0].approvalDate], [TWO_DAYS, '2026-10-08'], '⚠⚠ each signer keeps their own day; approvalDate is the latest');
    eq([lines[1].authBy, lines[1].approvalDate], [TWO_DAYS, '2026-10-08'], 'on every line it covers');
    ok(S.invApprovalComplete(lines[0], job), 'and the line is approved');
    lacks(text(doc.getElementById('ia-body').innerHTML), 'has not signed', 'nothing left to say');
    // Both ticked again later: a name recorded twice keeps its first date, and nothing is dropped.
    S._invPick = { a: 1 }; S.invRecordApproval(7);
    doc.__seed('ia-fid-0', true); doc.__seed('ia-fid-1', true); doc.__seed('ia-date', '2026-10-09');
    ok(S.invSaveApproval(), 'recorded again');
    eq([lines[0].authBy, lines[0].approvalDate], [TWO_DAYS, '2026-10-08'], '⚠ a name recorded twice keeps its first date');
    // Nobody ticked: refused, and nothing written.
    S._invPick = { c: 1 }; S.invRecordApproval(7);
    doc.__seed('ia-fid-0', false); doc.__seed('ia-fid-1', false);
    eq(S.invSaveApproval(), false, 'nobody ticked: refused');
    has(text(doc.getElementById('ia-fb').innerHTML), 'Not recorded: tick the signatures on the returned request.', 'with the fix');
    ok(!lines[2].authBy, 'nothing written');
    // A co-trustee recorded while the dialog was open: the save goes through and names them as still to sign.
    const L2 = [LINE('d', 4, { disposition: 'Sell' })];
    const T = desk(['invRecordApproval', 'invSaveApproval'], TRUST(), L2, { _invPick: { d: 1 }, _todayStr: () => '2026-10-02' });
    T.invRecordApproval(7);
    T.jobs[0].coFiduciaries.push({ id: 'cf2', name: 'Sam Adler' });
    T.__doc.__seed('ia-fid-0', true); T.__doc.__seed('ia-fid-1', true); T.__doc.__seed('ia-date', '2026-10-02');
    ok(T.invSaveApproval(), '⚠ a co-trustee recorded since the dialog opened: saved, not refused');
    eq(L2[0].authBy, BOTH, 'with the two who signed');
    has(text(T.__doc.getElementById('ia-body').innerHTML), 'Sam Adler has not signed yet: this line stays on the next request until they do.', 'naming the one still to sign');
    // Lines in different states: the note names the lines that stay open.
    const L3 = [LINE('e', 5, { disposition: 'Sell', authBy: 'Daniel Adler', approvalDate: '2026-09-30' }), LINE('f', 6, { disposition: 'Sell' })];
    const U = desk(['invRecordApproval', 'invApprovalDialogNote'], TRUST(), L3, { _invPick: { e: 1, f: 1 }, _todayStr: () => '2026-10-02' });
    U.invRecordApproval(7);
    U.__doc.__seed('ia-fid-0', true); U.__doc.__seed('ia-fid-1', false); U.__doc.__seed('ia-date', '2026-10-02');
    U.invApprovalDialogNote();
    eq(text(U.__doc.getElementById('ia-note').innerHTML).trim(), 'Daniel Adler has not signed #6 Line 6 yet: that line stays on the next request until they do.',
       'only the line still open is named');
    // The living client: who signed, typed, as before.
    const V = [LINE('l', 1, { disposition: 'Distribute', channel: 'Sarah Ellsworth (daughter)' })];
    const W = desk(['invRecordApproval', 'invSaveApproval'], LIVING(), V, { _invPick: { l: 1 }, _todayStr: () => '2026-10-03' });
    W.invRecordApproval(2);
    has(W.__doc.getElementById('ia-body').innerHTML, 'id="ia-signer" value="Margaret Ellsworth"', 'a living client: who signed, prefilled with the client');
    lacks(W.__doc.getElementById('ia-body').innerHTML, 'ia-note', 'and no fiduciary note');
    W.__doc.__seed('ia-signer', 'Margaret Ellsworth'); W.__doc.__seed('ia-date', '2026-10-03');
    ok(W.invSaveApproval(), 'recorded');
    eq([V[0].authBy, V[0].approvalDate], ['Margaret Ellsworth', '2026-10-03'], 'as typed, on the day given');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q24 · every place a signer prints reads them readably: the request, the ledger, the package record, the workbook, the panel, the worklist', () => {
    const lines = () => [
      LINE('a', 1, { objectName: 'Sargent portrait', disposition: 'Auction', fmv: '4000', channel: 'Kodner Galleries', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
      LINE('b', 2, { objectName: 'Desk', disposition: 'Sell', fmv: '900', channel: 'Kodner Galleries', authBy: 'Ruth Adler (2026-10-01); Sam Adler (2026-10-03)', approvalDate: '2026-10-03' }),
      LINE('c', 3, { objectName: 'Lamp', disposition: 'Donate', channel: 'Goodwill', authBy: TWO_DAYS, approvalDate: '2026-10-08', dispDate: '2026-10-09' }),
      LINE('g', 4, { objectName: 'Remington 870', category: 'Firearms', fmv: '900', disposition: 'Consign', channel: 'Palm Beach Arms (FFL)', serial: 'RS1',
                     authBy: 'Ruth Adler', approvalDate: '2026-10-01' })];
    // The request: who has signed so far, each with their day.
    const R = desk(['printApprovalRequest'], TRUST(), lines());
    R.printApprovalRequest(7);
    const rh = (R.__log.printed[0] || {}).html || '', rt = text(rh);
    has(rt, 'Signed so far by Ruth Adler (Oct 1, 2026); still to sign: Daniel Adler', '⚠⚠ "Signed so far by Ruth Adler (Oct 1, 2026); still to sign: Daniel Adler"');
    has(rt, 'Signed so far by Ruth Adler (Oct 1, 2026); Sam Adler (Oct 3, 2026); still to sign: Daniel Adler', 'two signers on two days, each readably');
    lacks(rt, 'Lamp', 'a line every co-trustee approved is not asked for again');
    ok(!ISO_IN_BRACKETS.test(rt), '⚠ no raw ISO date on the request');
    // The Disposition Ledger's Authorized by column.
    const D = desk(['printDispositionLedger'], TRUST(), lines(), { maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }) });
    const dr = attempt(() => D.printDispositionLedger(7));
    ok(dr.ok, 'the ledger prints' + (dr.ok ? '' : ': ' + dr.err));
    const dt = text((D.__log.printed[0] || {}).html);
    has(dt, 'Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)', '⚠⚠ the ledger names each signer with their own day');
    has(dt, 'Ruth Adler (Oct 1, 2026); Sam Adler (Oct 3, 2026)', 'every line');
    ok(!ISO_IN_BRACKETS.test(dt), 'and no raw ISO date');
    // The package's record of release approvals.
    const P = desk(['probatePackageRecordHtml'], TRUST(), lines());
    const pr = attempt(() => text(P.probatePackageRecordHtml(7)));
    has(pr.ok ? pr.val : 'threw: ' + pr.err, '3 Lamp Donate Goodwill Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)', '⚠ the package\'s record, readably');
    has(pr.val, 'Ruth Adler (Oct 1, 2026); Sam Adler (Oct 3, 2026) Not complete: no approval recorded from Daniel Adler', 'marked where it is not complete');
    ok(!ISO_IN_BRACKETS.test(pr.val || ''), 'and no raw ISO date');
    // The client's workbook (and the CSV built off it).
    const B = desk(['buildInventoryPayload', 'buildInventoryCSV'], TRUST(), lines());
    const pay = attempt(() => B.buildInventoryPayload(7));
    ok(pay.ok, 'the workbook payload builds' + (pay.ok ? '' : ': ' + pay.err));
    const col = ((pay.val || {}).columns || []).indexOf('Authorized By');
    ok(col > 0, 'fixture: the workbook has an Authorized By column');
    const cells = ((pay.val || {}).rows || []).map((r) => r[col]);
    eq(cells, ['Ruth Adler (Oct 1, 2026)', 'Ruth Adler (Oct 1, 2026); Sam Adler (Oct 3, 2026)', 'Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)', 'Ruth Adler (Oct 1, 2026)'],
       '⚠⚠ the spreadsheet the client keeps carries each signer readably, never the stored field');
    ok(!ISO_IN_BRACKETS.test(String(attempt(() => B.buildInventoryCSV(7)).val)), 'nor does the CSV');
    // The item panel: the box holds the record; the line under it reads it.
    const Q = desk(['_renderInvPanel'], TRUST(), lines(), { _invDetailRefs: () => [], _invPhotoSiblings: () => [] });
    const pc = text(Q._renderInvPanel(Q.jobs[0], Q._photoRefs[7][2]));
    has(pc, 'Signed: Ruth Adler (Oct 1, 2026); Daniel Adler (Oct 8, 2026)', '⚠ the item panel reads who signed, each on their own day');
    lacks(pc, 'still to sign', 'complete: nobody still to sign');
    has(text(Q._renderInvPanel(Q.jobs[0], Q._photoRefs[7][1])), 'Signed: Ruth Adler (Oct 1, 2026); Sam Adler (Oct 3, 2026) · still to sign: Daniel Adler',
        'and, where it is open, who is still to sign');
    // The Appraisal Worklist's firearm line.
    const Wk = desk(['printAppraisalWorklist'], TRUST(), lines(), { maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }) });
    const wr = attempt(() => Wk.printAppraisalWorklist(7));
    const wt = wr.ok ? text((Wk.__log.printed[0] || {}).html) : 'threw: ' + wr.err;
    has(wt, '#4 Remington 870 — Written authority is not complete. Daniel Adler has not approved it, and every co-trustee must. Signed so far by Ruth Adler (Oct 1, 2026).',
        '⚠ the worklist\'s firearm line names who has signed, readably');
    ok(!ISO_IN_BRACKETS.test(wt), 'and no raw ISO date');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q24 · the desk lists each signing act with its filed copy; a copy filed for a partial act stays after the lines complete', () => {
    const lines = [LINE('a', 1, { disposition: 'Auction', authBy: TWO_DAYS, approvalDate: '2026-10-08' }),
                   LINE('b', 2, { disposition: 'Sell', authBy: TWO_DAYS, approvalDate: '2026-10-08' }),
                   LINE('c', 3, { disposition: 'Donate', authBy: BOTH, approvalDate: '2026-10-02' }),
                   LINE('d', 4, { disposition: 'Junk', authBy: 'Ruth Adler', approvalDate: '2026-10-01' })];
    const rec = (id, ref, signedBy, signedOn, ids) => ({ id, kind: 'approval', ref, label: 'Signed release approval', signedBy, signedOn,
      fileUrl: 'https://drive.google.com/file/d/' + id + '/view', stableIds: ids });
    const job = Object.assign(TRUST(), { signedRecords: [
      rec('S1', '2026-10-01 Ruth Adler', 'Ruth Adler', '2026-10-01', ['a', 'b']),
      // P19's ref for a batch both signed the same day, with no signedOn: it still finds its act by the day it names.
      rec('S2', '2026-10-02 ' + BOTH, BOTH, '', ['c']),
      // A copy filed for a day no line records any more (the line was removed): still listed.
      rec('S0', '2026-09-20 ' + BOTH, BOTH, '2026-09-20', ['z']) ] });
    const S = desk(['_renderInvReleasesCard', 'invApprovalBatches'], job, lines);
    const acts = S.invApprovalBatches(job, lines);
    eq(acts.map((b) => [b.date, b.who, b.lines.map((r) => r.stableId), b.filed.map((s) => s.id)]),
       [['2026-10-08', 'Daniel Adler', ['a', 'b'], []], ['2026-10-02', BOTH, ['c'], ['S2']],
        ['2026-10-01', 'Ruth Adler', ['a', 'b', 'd'], ['S1']], ['2026-09-20', BOTH, [], ['S0']]],
       '⚠⚠ one act per day, newest first: who signed that day, the lines, the copies filed for it');
    eq(acts.map((b) => b.ref), ['2026-10-08 Daniel Adler', '2026-10-02 ' + BOTH, '2026-10-01 Ruth Adler', '2026-09-20 ' + BOTH],
       'each under the ref Record approval files it by (P19\'s refs unchanged)');
    const h = S._renderInvReleasesCard(job, lines), t = text(h);
    has(t, 'Approved Oct 8, 2026 by Daniel Adler · 2 lines (#1, #2)', 'the second signing act');
    has(t, 'Approved Oct 1, 2026 by Ruth Adler · 3 lines (#1, #2, #4)', '⚠⚠ the first signing act stays listed after the lines completed');
    has(h, 'href="https://drive.google.com/file/d/S1/view"', '⚠⚠ with the copy filed for it');
    has(t, 'Approved Oct 2, 2026 by Ruth Adler; Daniel Adler · 1 line (#3)', 'a P19 batch');
    has(h, 'href="https://drive.google.com/file/d/S2/view"', '⚠ P19\'s ref keeps matching its copy');
    has(t, 'Approved Sep 20, 2026 by Ruth Adler; Daniel Adler · no line on the inventory now', '⚠ a copy whose lines are gone is still listed');
    has(t, 'No line records a signature of this day now; the copy filed for it stays here and in Drive.', 'saying why');
    has(h, 'href="https://drive.google.com/file/d/S0/view"', 'with its link');
    has(t, '#4 goes back on the next approval request', 'the one line of the first act still open is named');
    has(t, 'Daniel Adler has not approved it, and every co-trustee must. Signed so far by Ruth Adler (Oct 1, 2026).', 'with who is missing');
    ok(t.indexOf('Approved Oct 8, 2026') < t.indexOf('Approved Oct 1, 2026'), 'newest first');
    const controls = specOf(S, h, 'approval').map((s) => s.meta.ref).sort();
    eq(controls, ['2026-09-20 ' + BOTH, '2026-10-01 Ruth Adler', '2026-10-02 ' + BOTH, '2026-10-08 Daniel Adler'], 'a File signed copy for each act');
    has(t, 'Signed request not filed to Drive yet.', 'the act with no copy says so');
    // ⚠ A copy filed from the dialog under the names ticked (both co-trustees on Oct 8, Ruth's own day being Oct 1 on
    // these lines) belongs to the Oct 8 act by its day, whatever the act's names read.
    const job2 = Object.assign(TRUST(), { signedRecords: [rec('S3', '2026-10-08 ' + BOTH, BOTH, '2026-10-08', ['a', 'b'])] });
    const S2 = desk(['invApprovalBatches'], job2, lines);
    const oct8 = S2.invApprovalBatches(job2, lines).filter((b) => b.date === '2026-10-08')[0] || { filed: [] };
    eq([oct8.who, oct8.filed.map((x) => x.id)], ['Daniel Adler', ['S3']], '⚠⚠ a copy finds its act by the day it records, not by the exact names');
    // An act's names run in the job's fiduciary order, as the dialog ticks them, whatever order a line recorded them in.
    // (The act of Oct 4 by its day: the copy S3 files for Oct 8 is an act of its own here, and sorts first.)
    const oct4 = S2.invApprovalBatches(job2, [LINE('x', 9, { authBy: 'Daniel Adler; Ruth Adler', approvalDate: '2026-10-04' })])
      .filter((b) => b.date === '2026-10-04')[0] || {};
    eq(oct4.who, BOTH, 'names in the job\'s fiduciary order, whatever order the line recorded them in');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q23 · a line that left before every fiduciary approved: listed apart for ratification, badged, counted apart', () => {
    const mk = () => [
      LINE('r1', 1, { objectName: 'Tea service', disposition: 'Distribute', channel: 'Mary Smith', dispDate: '2026-10-02', authBy: 'Ruth Adler', approvalDate: '2026-09-30' }),
      LINE('r2', 2, { objectName: 'Desk', disposition: 'Sell', channel: 'Kodner Galleries', custodyLog: [{ cid: 'x', action: 'Released', party: 'Kodner Galleries', date: '2026-10-03' }] }),
      LINE('r3', 3, { objectName: 'Sargent portrait', disposition: 'Auction', authBy: 'Ruth Adler', approvalDate: '2026-10-01' }),
      LINE('r4', 4, { objectName: 'Sofa', disposition: 'Donate', dispDate: '2026-10-02', authBy: BOTH, approvalDate: '2026-10-01' }),
      LINE('r5', 5, { objectName: 'Clock', disposition: 'Distribute', channel: 'John Smith' }),
      LINE('r6', 6, { objectName: 'Bible', disposition: 'Keep', dispDate: '2026-10-02' })];
    const job = Object.assign(TRUST(), { signedRecords: [{ id: 'R1', kind: 'receipt', ref: 'John Smith', signedBy: 'John Smith', stableIds: ['r5'],
      label: 'Signed receipt — John Smith', fileUrl: 'https://drive.google.com/file/d/R1/view' }] });
    const lines = mk();
    const S = desk(['invRatificationOwed', 'invRecordedGone', 'invReleasedToPerson', 'printApprovalRequest', '_renderInvRow', 'planDerivedLines',
                    'invRecordApproval', 'invSaveApproval', '_renderInvReleasesCard'], job, lines, { isAgreementSigned: () => true, isJobFunded: () => true, _todayStr: () => '2026-10-05' });
    eq(lines.map((r) => S.invRatificationOwed(r, job)), [true, true, false, false, true, false],
       '⚠⚠ owed a ratification: gone (a disposition date, a Released event, a filed receipt) with the approval incomplete; not a line still here, a complete one, or one not leaving');
    eq(lines.map((r) => S.invRecordedGone(r, job)), [true, true, false, true, true, true], 'recorded as gone: one definition');
    ok(S.invReleasedToPerson(lines[0], job) && S.invReleasedToPerson(lines[4], job), 'and what counts as released to a person reads it');
    // A living client has no fiduciary to ratify.
    const V = desk(['invRatificationOwed'], LIVING(), []);
    eq(V.invRatificationOwed(LINE('v', 1, { disposition: 'Sell', dispDate: '2026-10-02' }), V.jobs[0]), false, 'a living client: never');
    // The request: the line still here is asked for; the gone ones are listed apart.
    S.printApprovalRequest(7);
    const h = (S.__log.printed[0] || {}).html || '', t = text(h);
    const at = (s) => h.indexOf(s);
    ok(at('Already released: for ratification') > 0, '⚠⚠ the ratification section prints');
    has(t, 'These items left the property before every co-trustee had approved their release in writing. They are listed apart from the item above, for the signature of Ruth Adler and Daniel Adler, which ratifies each release; nothing is undone.',
        'its sentence: already released, for whose signature, nothing undone');
    const main = h.slice(0, at('Already released: for ratification')), rat = h.slice(at('Already released: for ratification'), at('Approved by:'));
    has(text(main), 'Sargent portrait', 'the line still here is asked for in the main list');
    ['Tea service', 'Desk', 'Clock'].forEach((x) => { lacks(text(main), x, x + ' is not "ready to be released"'); has(text(rat), x, x + ' is listed for ratification'); });
    lacks(t, 'Sofa', 'a line every co-trustee approved is not asked for');
    lacks(t, 'Bible', 'nor a line not leaving');
    has(text(rat), 'Released Oct 2, 2026 Signed so far by Ruth Adler (Sep 30, 2026); still to sign: Daniel Adler', 'when it went, who signed, who has not');
    has(text(rat), 'Released Oct 3, 2026 to Kodner Galleries No written approval recorded; to sign: Ruth Adler and Daniel Adler', 'a Released custody event');
    has(text(rat), 'Released: John Smith’s signed receipt is on file', 'a filed receipt');
    has(rat, '>Disposition<', 'the column is the disposition recorded, not proposed');
    has(text(rat), '3 items already released', 'counted');
    has(text(main), '1 item ', 'and the main list counts only what is asked for');
    ok(at('Proposed disposition') < at('Already released: for ratification') && at('Already released: for ratification') < at('Approved by:'),
       'after the lines asked for, before the signatures');
    // The desk row: ratification owed, never "approval incomplete".
    const row = (i) => text(S._renderInvRow(job, lines[i]));
    has(row(0), 'ratification owed', '⚠⚠ the row says a ratification is owed');
    lacks(row(0), 'approval incomplete', 'not "approval incomplete"');
    has(row(1), 'ratification owed', 'a line gone with no approval at all');
    has(row(2), 'approval incomplete', 'a partial approval on a line still here reads as before');
    lacks(row(2), 'ratification owed', 'and owes no ratification');
    has(S._renderInvRow(job, lines[0]), 'Left the property before every co-trustee had approved it in writing: Daniel Adler has not signed.', 'its title says why');
    // The Job Plan counts them apart.
    const est = { svc: 'cleanout', rooms: [], vendors: [], totTC: 10, totPS: 10 };
    const pl = attempt(() => S.planDerivedLines(7, job, est, 'p2'));
    const line = ((pl.val || []).filter((l) => l.key === 'release_authority')[0]) || {};
    ok(pl.ok, 'the p2 lines compute' + (pl.ok ? '' : ': ' + pl.err));
    eq(line.ok, false, 'not every line leaving has complete authority');
    has(line.detail, '1 of 5', 'counted by the one predicate');
    has(line.detail, '; 1 still needs the approval of Daniel Adler (every co-trustee signs)', 'the line awaiting approval');
    has(line.detail, '; 3 already left and await ratification by Ruth Adler and Daniel Adler (the request lists them apart)', '⚠⚠ the lines awaiting ratification, apart');
    // The desk's approvals list says it too, on the act that recorded the gone line's first signature.
    has(text(S._renderInvReleasesCard(job, lines)), 'Approved Sep 30, 2026 by Ruth Adler · 1 line (#1) ⚠ Daniel Adler has not approved it, and every co-trustee must. Signed so far by Ruth Adler (Sep 30, 2026). These lines go back on the next approval request, #1 apart, for ratification: it has already left.',
        'the card names the line that goes apart, for ratification');
    // Record approval completes a ratification like any other signature.
    S._invPick = { r1: 1 };
    S.invRecordApproval(7);
    S.__doc.__seed('ia-fid-0', false); S.__doc.__seed('ia-fid-1', true); S.__doc.__seed('ia-date', '2026-10-05');
    ok(S.invSaveApproval(), 'Daniel\'s ratification is recorded');
    eq(lines[0].authBy, 'Ruth Adler (2026-09-30); Daniel Adler (2026-10-05)', 'each with their own day');
    eq(S.invRatificationOwed(lines[0], job), false, '⚠ and nothing is owed any more');
    lacks(text(S._renderInvRow(job, lines[0])), 'ratification owed', 'the row is clear');
    S.printApprovalRequest(7);
    lacks(text((S.__log.printed[1] || {}).html), 'Tea service', 'and the next request no longer lists it');
    // A firearm that already left is not counted by the request's firearms note (it tells how a firearm leaves).
    const F = desk(['printApprovalRequest'], TRUST(), [LINE('f1', 1, { objectName: 'Shotgun', category: 'Firearms', disposition: 'Consign', channel: 'Palm Beach Arms',
      dispDate: '2026-10-02', authBy: 'Ruth Adler', approvalDate: '2026-09-30' }), LINE('f2', 2, { objectName: 'Desk', disposition: 'Sell' })]);
    F.printApprovalRequest(7);
    const ft = text((F.__log.printed[0] || {}).html);
    has(ft, 'Already released: for ratification', 'fixture: the firearm is listed for ratification');
    lacks(ft, 'firearm is on this list', '⚠ and the firearms note does not count a firearm that already left');
    // A request carrying only lines already gone says so, and never that anything is ready to be released.
    const O = desk(['printApprovalRequest'], TRUST(), [LINE('o', 1, { objectName: 'Clock', disposition: 'Sell', dispDate: '2026-10-02', authBy: 'Ruth Adler', approvalDate: '2026-09-30' })]);
    O.printApprovalRequest(7);
    const ot = flat((O.__log.printed[0] || {}).html);
    has(ot, 'To Ruth Adler and Daniel Adler: the item listed below has already left the property and is listed for your signature.', 'the intro says so (one line: singular, P22)');
    lacks(ot, 'ready to be released', 'never "ready to be released"');
    lacks(ot, 'Nothing on this list will be moved', 'nor that nothing will be moved');
    has(ot, 'Verbal approval is not accepted.', 'verbal approval is still not accepted');
    has(ot, 'It is listed here for the signature of Daniel Adler, which ratifies the release; nothing is undone.', 'and the section names who signs');
    // One representative on a probate estate: the role's words.
    const PR = desk(['printApprovalRequest'], PROBATE(), [LINE('p', 1, { objectName: 'Clock', disposition: 'Sell', dispDate: '2026-10-02' })]);
    PR.printApprovalRequest(8);
    has(text((PR.__log.printed[0] || {}).html), 'This item left the property before the Personal Representative had approved its release in writing. It is listed here for the signature of Tripp Butler',
        'one representative: named by role and by name');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('Q25 · a sale or a gift to one of Havellin\'s people on a living client\'s job: flagged everywhere, never refused; estates refused as before', () => {
    const mk = () => [LINE('v1', 1, { objectName: 'Armchair', disposition: 'Sell' }),
                      LINE('v2', 2, { objectName: 'Lamp', disposition: 'Distribute' }),
                      LINE('v3', 3, { objectName: 'Rug', disposition: 'Donate', channel: 'Anthony Graziano' }),
                      LINE('v4', 4, { objectName: 'Clock', disposition: 'Keep', channel: 'Ashley Jerome', flagDisputed: true })];
    const lines = mk();
    const S = desk(['_invEdit', '_invBulkApply', 'invReleaseCautions', '_renderInvRow', '_renderInvPanel', 'printApprovalRequest', 'invHavellinRecipient',
                    'invStaffRefused', 'havellinPeople'], LIVING(), lines,
                   { contractors: [{ id: 'c9', name: 'Carla Ortiz', role: 'PS', status: 'inactive' }], _invDetailRefs: () => [], _invPhotoSiblings: () => [] });
    const job = S.jobs[0];
    const el = (v) => ({ value: v, type: 'text' });
    // The row's recipient box: written, never refused.
    S._invEdit(2, 'v1', 'channel', el('Ashley Jerome'));
    eq(lines[0].channel, 'Ashley Jerome', '⚠⚠ a sale to the concierge on a living client\'s job is written');
    eq(S.__log.alerts, [], 'and nothing is refused');
    eq(S.invHavellinRecipient(lines[0], job), 'Ashley Jerome', '⚠ the one definition answers on a living job');
    eq(S.invStaffRefused(lines[0], job), '', 'and the estate\'s refusal does not');
    eq(S.invReleaseCautions(lines[0], 2).map((c) => c.key), ['staffRecipient'], '⚠⚠ it is flagged, through the one rule');
    ok(S.invReleaseCautions(lines[3], 2).map((c) => c.key).indexOf('staffRecipient') < 0, 'a line not leaving raises no staff caution');
    eq(S.invReleaseCautions(LINE('x', 9, { disposition: 'Donate', channel: 'Ashley Jerome' }), 2).map((c) => c.key), [], 'nor a donation (outside the rule)');
    // The row and the item panel.
    has(text(S._renderInvRow(job, lines[0])), '⚠ Ashley Jerome works with Havellin', 'the row carries the caution');
    has(S._renderInvRow(job, lines[0]), 'Conflict of interest: Ashley Jerome works with Havellin; proposed: Sell. It is the client’s property and the client’s decision, so it is not refused',
        'its title says why it is flagged and not refused');
    has(text(S._renderInvPanel(job, lines[0])), '⚠ Conflict of interest. Ashley Jerome works with Havellin; proposed: Sell. It is the client’s property and the client’s decision, so it is not refused: the release approval request names it above the line the client initials.',
        '⚠ the item panel too');
    lacks(text(S._renderInvPanel(job, lines[3])), 'Conflict of interest', 'and not on a line it does not apply to');
    const disputed = LINE('w', 8, { objectName: 'Mirror', disposition: 'Sell', channel: 'Marie Delgado', flagDisputed: true });
    lacks(text(S._renderInvRow(job, disputed)), 'works with Havellin', '⚠ a line with another caution and no Havellin recipient carries no staff chip');
    // The bulk bar: a recipient swept across the selection names it.
    S._invPick = { v2: 1, v4: 1 };
    S._invBulkApply(2, 'channel', 'carla  ortiz (crew)');
    eq([lines[1].channel, lines[3].channel], ['carla  ortiz (crew)', 'carla  ortiz (crew)'], 'the bulk recipient is written on a living client\'s lines');
    eq(S.__log.alerts, [], 'nothing refused');
    has(S.__log.badges.map((b) => b.m).join(' | '), '2 items updated. ⚠ 1 of them is flagged conflict of interest — #2 Lamp (Carla Ortiz works with Havellin; proposed: Distribute). Check before the release request goes to the representative.',
        '⚠⚠ the bulk bar\'s confirmation names the line and the person (and not the line kept)');
    lacks(S.__log.badges.map((b) => b.m).join(' | '), 'flagged disputed', '⚠ a recipient sweep asks only the lines leaving: the disputed line kept is not named');
    // A disposition swept onto a line already naming one of ours names it too.
    S._invPick = { v3: 1 };
    S._invBulkApply(2, 'disposition', 'Sell');
    eq(lines[2].disposition, 'Sell', 'written');
    has(S.__log.badges.map((b) => b.m).pop(), 'flagged conflict of interest — #3 Rug (Anthony Graziano works with Havellin; proposed: Sell)', 'and named');
    // The request the client initials: the notice above the table, the badge on the line.
    S.printApprovalRequest(2);
    const h = (S.__log.printed[0] || {}).html || '', t = text(h);
    has(t, 'Property going to someone who works with Havellin', '⚠⚠ the request carries the caution');
    has(t, '#1 Armchair (Ashley Jerome works with Havellin; proposed: Sell)', 'naming the line and the person');
    has(t, 'What happens to your own property is your decision, and you may sell it or give it to whomever you choose; because the person works with us, it is a conflict of interest for Havellin, so we put it on the record before anything leaves. Initialling a line below confirms that you know who is receiving it.',
        'and why: the client signs knowing');
    has(h, '&#9888; GOING TO ASHLEY JEROME, WHO WORKS WITH HAVELLIN', 'the row is badged with the person');
    ok(h.indexOf('Property going to someone who works with Havellin') < h.indexOf('Where it is going'), 'above the table');
    // The Contents Record and the Disposition Ledger, which badge their rows through the same rule, carry it too.
    const CR = desk(['printContentsRecord', 'printDispositionLedger'], LIVING(),
      [LINE('v1', 1, { objectName: 'Armchair', disposition: 'Sell', channel: 'Ashley Jerome', gross: 200, dispDate: '2026-10-02' })]);
    const cr = attempt(() => CR.printContentsRecord(2));
    ok(cr.ok, 'the Contents Record prints' + (cr.ok ? '' : ': ' + cr.err));
    has((CR.__log.printed[0] || {}).html, 'GOING TO ASHLEY JEROME, WHO WORKS WITH HAVELLIN', '⚠ the Contents Record badges the line');
    const dl = attempt(() => CR.printDispositionLedger(2));
    ok(dl.ok, 'the Disposition Ledger prints' + (dl.ok ? '' : ': ' + dl.err));
    has((CR.__log.printed[1] || {}).html, 'GOING TO ASHLEY JEROME, WHO WORKS WITH HAVELLIN', '⚠ and so does the Disposition Ledger the client signs');
    // An estate keeps P19's refusal, unchanged, and never prints the living caution.
    const E = desk(['_invEdit', '_invBulkApply', 'invReleaseCautions', 'printApprovalRequest'], PROBATE(), mk(),
      { contractors: [{ id: 'c9', name: 'Carla Ortiz', role: 'PS', status: 'inactive' }] });
    E._invEdit(8, 'v1', 'channel', el('Ashley Jerome'));
    eq(E._photoRefs[8][0].channel, undefined, '⚠ an estate still refuses the write');
    has(E.__log.alerts.pop(), 'Havellin and its people never buy or receive estate property, and take no share of the proceeds. Ashley Jerome is with Havellin, so #1 Armchair cannot be sold or released to them. Nothing was changed.',
        'with P19\'s refusal, word for word');
    E._invPick = { v2: 1 };
    E._invBulkApply(8, 'channel', 'Carla Ortiz');
    eq(E._photoRefs[8][1].channel, undefined, 'the bulk bar too');
    const pre = LINE('q', 7, { objectName: 'Vase', disposition: 'Sell', channel: 'Ashley Jerome' });
    eq(E.invReleaseCautions(pre, 8).map((c) => c.key), [], 'and an estate never prints the living caution');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  G('One definition each, and who reads it', () => {
    const callers = (name) => [...ALL_FNS].filter((n) => n !== name && (() => { try { return new RegExp('\\b' + name + '\\(').test(noComments(fn(n))); } catch (e) { return false; } })()).sort();
    ['invApprovalSigners', 'invApprovalSignedText', 'invApprovalWithSigners', 'invRecordedGone', 'invRatificationOwed', 'invStaffRefused',
     'invApprovalLeftOpen', 'invApprovalOpenText', 'invApprovalDialogNote', 'invHavellinRecipient', 'invApprovalBatches']
      .forEach((n) => eq((SRC.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1, n + ' is defined once'));
    eq(callers('invApprovalWithSigners'), ['invApprovalLeftOpen', 'invSaveApproval'], 'the writer\'s rule: the save and what the dialog says it will leave open');
    eq(callers('invRecordedGone'), ['invRatificationOwed', 'invReleasedToPerson'], '⚠ recorded as gone: one definition, two readers');
    eq(callers('invRatificationOwed'), ['_renderInvReleasesCard', '_renderInvRow', 'planDerivedLines', 'printApprovalRequest'],
       '⚠⚠ left before every fiduciary approved: the request, the desk row, the desk\'s approvals list, the Job Plan');
    eq(callers('invStaffRefused'), ['_invBulkApply', '_invEdit'], 'the estate\'s refusal: both handlers that write a channel or a disposition');
    eq(callers('invHavellinRecipient'), ['_renderInvRow', 'invStaffRefused'], 'the one definition: the estate\'s refusal and the row\'s name (the caution reads it too)');
    has(noComments(decl('INV_RELEASE_CAUTIONS')), 'invHavellinRecipient(r, _invJob(jobId))', 'the living caution reads the same definition');
    ['_invEdit', '_invBulkApply'].forEach((n) => lacks(noComments(fn(n)), 'invHavellinRecipient(', n + ' never asks the definition bare (the estate refusal is invStaffRefused)'));
    // Every surface that prints who signed reads the one readable form.
    eq(callers('invApprovalSignedText'), ['_invApprovalReadHtml', '_invExportValue', 'invApprovalBoxText', 'invApprovalGap', 'printApprovalRequest', 'printDispositionLedger', 'probatePackageRecordHtml'],
       '⚠ the request, the flag, the panel, the ledger, the package\'s record, the workbook');
    ['printApprovalRequest', 'printDispositionLedger', 'probatePackageRecordHtml', '_invExportValue', 'invApprovalGap'].forEach((n) =>
      ok(!/esc\(r\.authBy|String\(r\.authBy\)|String\(ref\.authBy\)\.trim\(\) \+ ', '/.test(noComments(fn(n))), n + ' never prints the stored field'));
    // The dialog's note and the save's confirmation say one sentence.
    has(noComments(fn('invSaveApproval')), 'invApprovalOpenText(', 'the save says it with the one sentence');
    has(noComments(fn('invApprovalDialogNote')), 'invApprovalOpenText(', 'and so does the note');
    lacks(noComments(fn('invSaveApproval')), 'is not ticked. Every', '⚠ the partial-approval refusal is gone');
    // The caution is living-only by its flag, read by the one rule.
    has(noComments(fn('invReleaseCautions')), '!c.living', 'the one rule reads the `living` flag');
    const modal = SRC.slice(SRC.indexOf('<!-- RECORD A SIGNED RELEASE APPROVAL'), SRC.indexOf('id="inv-approval-modal"'));
    lacks(modal, 'refuses, naming who is missing', 'the modal\'s own note no longer says it refuses');
  });
};
