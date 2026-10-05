'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P19 · W5 LEDGER (2026-10-03). Anthony, on the estate workflow: "i'm good with all of your calls. build it all".
// The record of where everything went and what it brought:
//
//   E1  The Disposition Ledger is the close-out summary the client signs: printDispositionLedger(jobId, opt) returns its
//       page with opt.asHtml; the proceeds are net to whoever holds them (estateProceedsHolder); a sign-off line per
//       fiduciary (the client on living work), withheld while a line has no disposition; the signed copy filed through
//       the foundation's control (kind `ledger`, ref `ledger`); "Disposition Ledger signed by the <approver>" derived
//       on an estate's desk and close-out stage, in place of the ct_pr_signoff box.
//   E2  Filed to Drive as the job closes (activateOrCycle → fileDispositionLedger), one filing at a time, through the
//       sync badge, recorded on docState.dispositionLedger as a person's edit; on demand from the desk; an estate whose
//       ledger is unsigned is named in the close question, never refused.
//   E3  The estate package attaches the ledger on both routes.
//   E4  Donations: receipted line by line (the check passed on any ONE), a Donation Record per charity, the charity's
//       receipt filed through the control; fin_donation_receipts is a derived line now.
//   E5  Snapshots are voided with a reason, never deleted, and compared by item number (with now, with the previous).
//   E6  Proceeds statements, reconciled against the ledger to the cent; fin_proceeds is a derived line now.
//   E7  "Net to Estate" is "Net Proceeds" wherever a person reads it; the workbook keeps the name its script resolves.
//
// Driven through the real functions, each lifted with its call graph derived from the source; only the boundaries are
// stubbed by name (the network at `fetch`, the store saves, the screen's notices, the print dialog).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const INVGS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
function gsFn(src, name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  return src.slice(start, matchBrace(src, src.indexOf('{', re.lastIndex)) + 1);
}
function gsVar(src, name) {
  const m = src.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}

// The functions and vars `roots` reach (comments and string literals stripped, so an onclick naming a function is not a
// call), less `stop`: the closure p17/p18 use, so a helper added tomorrow is lifted without a list to keep.
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
  return { fns: [...fns], vars: [...vars] };
}
// Every top-level function's body, read once (fn() per name scans the whole file each time).
const BODY = (() => {
  const out = {};
  const re = /(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = re.exec(SRC))) {
    const open = SRC.indexOf('{', re.lastIndex);
    const close = matchBrace(SRC, open);
    if (close > open && !out[m[2]]) out[m[2]] = SRC.slice(m.index, close + 1);
  }
  return out;
})();
const STATE = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'changeOrders', 'jobLogs'];
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {}), STATE, ['_printDocument']));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’')
  .replace(/&mdash;/g, '—').replace(/&rarr;/g, '→').replace(/&#10003;/g, '✓').replace(/&#9888;/g, '⚠').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/ ([:;,.)])/g, '$1').trim();
const count = (h, n) => String(h).split(n).length - 1;

// A synchronous, already-settled promise: the runner is synchronous, so every fetch chain runs inside the call.
function sp(v) {
  if (v && v.__sync) return v;
  return { __sync: true, then(f) { try { return sp(f ? f(v) : v); } catch (e) { return sr(e); } }, catch() { return this; } };
}
function sr(e) {
  return { __sync: true, then(f, g) { if (!g) return this; try { return sp(g(e)); } catch (e2) { return sr(e2); } },
           catch(h) { try { return sp(h(e)); } catch (e2) { return sr(e2); } } };
}
const res = (obj) => ({ ok: true, status: 200, json: () => sp(obj) });

// ── Fixtures ────────────────────────────────────────────────────────────────
const SYNC = 'https://script.google.com/macros/s/P19LEDGER/exec';
const T0 = Date.parse('2026-09-28T15:00:00Z');
const ESTATE = (o) => Object.assign({
  id: 7, hvlId: 'HVL-0007', name: 'Walter Ellsworth', svc: 'cleanout', status: 'active', won: true, approved: true,
  addr: '69 Beach Blvd', city: 'Palm Beach', tc: 'Ashley Jerome', agrApprovedBy: 'Anthony Graziano',
  matterType: 'probate', docTier: 'values', deathDate: '2026-08-01',
  executor: 'Rex Hale', executorRole: 'Personal Representative', executorEmail: 'rex@hale.example',
  driveFolder: 'https://drive.google.com/drive/folders/ROOT7',
  driveSubfolders: { 'Estate Inventory': 'INV7', 'As-Found Record': 'AF7', 'Signed Records': 'SR7' },
  docState: {}, at: {}, updatedAt: T0, payments: [],
}, o || {});
const LIVING = (o) => ESTATE(Object.assign({ name: 'Ann Smith', svc: 'home_cleanout', matterType: '', docTier: '', deathDate: '', executor: '', executorRole: '', executorEmail: '' }, o || {}));
const ROW = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, status: 'uploaded', ts: T0, updatedAt: T0,
  objectName: 'Sideboard', category: 'Furniture', qty: 1, condition: 'Good', fmv: '',
}, over || {});
// A small estate: an auction pair on one statement, a consignment line on none, two donations to Goodwill (one receipted
// by reference), one to an unnamed charity, a line kept, and — unless asked not to — one line nobody has decided.
const LINES = (o) => {
  const opt = Object.assign({ undecided: true }, o || {});
  const rows = [
    ROW('a', { itemNo: 1, objectName: 'Sargent portrait', disposition: 'Auction', channel: 'Kodner Galleries', gross: 1000, fees: 250, dispDate: '2026-09-30', authBy: 'Rex Hale', approvalDate: '2026-09-25' }),
    ROW('b', { itemNo: 2, objectName: 'Silver tea set', disposition: 'Auction', channel: 'Kodner Galleries', gross: 237.5, fees: 59.38, dispDate: '2026-09-30' }),
    ROW('c', { itemNo: 3, objectName: 'Tabriz rug', disposition: 'Consign', channel: 'Palm Consign', gross: '', fees: '' }),
    ROW('d', { itemNo: 4, objectName: 'Sofa', disposition: 'Donate', channel: 'Goodwill', qty: 1, condition: 'Fair', fmv: 300, dispDate: '2026-09-29', receiptDoc: 'Goodwill #4411' }),
    ROW('e', { itemNo: 5, objectName: 'Lamps (pair)', disposition: 'Donate', channel: ' goodwill ', qty: 2, condition: 'Good', fmv: 80, dispDate: '2026-09-29' }),
    ROW('f', { itemNo: 6, objectName: 'Bookcase', disposition: 'Donate', channel: '', qty: 1, condition: 'Poor' }),
    ROW('g', { itemNo: 7, objectName: 'Family Bible', disposition: 'Keep', channel: '' }),
  ];
  if (opt.undecided) rows.push(ROW('h', { itemNo: 8, objectName: 'Desk clock', disposition: '' }));
  return rows;
};
const STATEMENT = (over) => Object.assign({ id: 'ps1', vendor: 'Kodner Galleries', statementDate: '2026-10-01',
  lines: [{ stableId: 'a', itemNo: 1 }, { stableId: 'b', itemNo: 2 }], gross: 1250, fees: 309.38, netPaid: 940.62,
  paidOn: '2026-10-02', paidTo: 'Estate of W. Ellsworth, checking ending 4417', reference: 'Settlement 2026-118' }, over || {});

module.exports = function ({ group, ok, eq, has, lacks }) {
  const G = (name, body) => { group(name); try { inEastern(body); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };

  // The ledger, its page and its figures, on one job at a time.
  function ledgerRig(job, rows) {
    const c = lift(['printDispositionLedger', 'dispositionLedger', 'ledgerDerivedLines', 'ledgerCloseFlag', 'ledgerSigners', 'ledgerSignedCopies',
      '_renderLedgerCards', 'donationGroups', 'donationReceiptLine', 'printDonationRecord', 'proceedsReconciliation', 'proceedsLine', 'jobTakesProceedsStatements'],
      ['savePhotoRefs', 'saveJobs', 'syncJobToSheets', 'showSyncBadge', '_docNotice', 'renderInventoryTab'], {
        savePhotoRefs() {}, saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {}, _docNotice() {}, renderInventoryTab() {},
        document: domStub({}), jobs: [job], _photoRefs: { 7: rows }, estimateStore: {}, jobPlanStore: {} });
    c.jobs = [job];
    c._photoRefs = { 7: rows };
    return c;
  }

  // ── E1 ────────────────────────────────────────────────────────────────────
  G('E1 · the ledger names whose the proceeds are, on every matter and on living work', () => {
    const cases = [
      [ESTATE(), 'the estate', 'a probate matter'],
      [ESTATE({ matterType: 'trust' }), 'the trust', 'a trust-only matter'],
      [ESTATE({ matterType: 'both' }), 'the estate or the trust, as the property is held', 'a pour-over'],
      [ESTATE({ matterType: 'neither' }), 'the estate', 'Neither'],
      [LIVING(), 'the client', 'living work'],
    ];
    cases.forEach(([job, holder, why]) => {
      const c = ledgerRig(job, LINES({ undecided: false }));
      const r = attempt(() => c.printDispositionLedger(7, { asHtml: true }));
      const html = (r.ok && r.val && r.val.html) || '';
      ok(html.length > 2000, why + ': the page is returned with opt.asHtml (' + (r.ok ? html.length : r.err) + ')');
      has(text(html), 'proceeds net to ' + holder, why + ': the head says the proceeds are net to ' + holder);
      has(text(html), 'Net, the difference, is the proceeds to ' + holder + '.', why + ': and so does the footer');
      lacks(html, 'Fiduciary accounting', why + ': ⚠ never "Fiduciary accounting" — it is not an accounting, and a living job has no fiduciary');
      lacks(html, 'Accounting Ledger', why + ': and never "Accounting Ledger"');
      eq(c.__printed, '', why + ': asking for the page prints nothing');
      if (holder !== 'the estate') lacks(text(html), 'net to the estate.', why + ': ⚠ "net to the estate" is gone where it is false');
    });
    const living = text(attempt(() => ledgerRig(LIVING(), LINES({ undecided: false })).printDispositionLedger(7, { asHtml: true })).val.html);
    lacks(living, 'Personal Representative', 'a living client\'s ledger names no representative');
    // An empty inventory: nothing to record, and no sign-off under nothing — refused by name, so the package leaves it out.
    eq(ledgerRig(ESTATE(), []).printDispositionLedger(7, { asHtml: true }), { why: 'There is nothing in the inventory to record yet.' }, 'an empty inventory: refused, named');
  });

  G('E1 · item numbers, the lines, the totals to the cent, and the gaps above the table', () => {
    const job = ESTATE();
    job.proceedsStatements = [STATEMENT()];
    const c = ledgerRig(job, LINES());
    const page = c.printDispositionLedger(7, { asHtml: true });
    const html = page.html, t = text(html);
    has(page.title, 'Havellin Disposition Ledger - 69 Beach Blvd', 'the page carries the desk\'s dated title');
    has(html, '<th style="padding:2px 5px;">Item #</th>', 'an Item # column: the numbers every inventory document cites');
    has(t, '1 Sargent portrait Auction Kodner Galleries Rex Hale Sep 25, 2026 Sep 30, 2026 $1,000 $250 $750', 'a line: number, item, disposition, recipient, authority, date, gross, fees, net');
    has(t, '2 Silver tea set Auction Kodner Galleries — Sep 30, 2026 $237.50 $59.38 $178.12', 'to the cent');
    has(t, '3 Tabriz rug Consign Palm Consign — — — — pending', '⚠ a consignment with nothing recorded reads pending, not $0');
    has(t, 'Totals $1,237.50 $309.38 $928.12', 'the totals add the lines: $1,237.50 less $309.38');
    has(t, 'This ledger is not yet complete.', 'its gaps are named');
    ok(html.indexOf('This ledger is not yet complete.') < html.indexOf('<th style="padding:2px 5px;">Item #</th>'), '⚠ above the table, before anyone signs');
    has(t, '1 line has no disposition recorded: #8 Desk clock. The sign-off below is withheld until every line has one.', 'an undecided line, by number');
    has(t, '1 item left the property with no recipient recorded: #6 Bookcase.', 'a donation with no charity named');
    has(t, '1 line sold, consigned or at auction with no proceeds recorded yet: #3 Tabriz rug.', 'a sale with nothing received');
    has(t, 'The Kodner Galleries statement of Oct 1, 2026 does not agree with this ledger: Gross: $1,250 on the statement, $1,237.50 on its lines ($12.50 apart).',
        '⚠⚠ a statement $12.50 over its lines, with both figures');
    has(t, '1 sold line is on no proceeds statement: #3 Tabriz rug.', 'and the sold line on no statement');
    has(t, 'Kodner Galleries Settlement 2026-118 Oct 1, 2026 #1, #2 $1,250 $309.38 $940.62 Oct 2, 2026 to Estate of W. Ellsworth, checking ending 4417 Differs — see above',
        'the statement beside the lines it covers');
  });

  G('E1 · every sum is carried to the cent, and a service that takes no statements is asked for none', () => {
    const rows = [ROW('p', { itemNo: 1, objectName: 'Vase', disposition: 'Sell', channel: 'A buyer', gross: 0.1, fees: 0.07, dispDate: '2026-09-30' }),
                  ROW('q', { itemNo: 2, objectName: 'Bowl', disposition: 'Sell', channel: 'A buyer', gross: 0.2, fees: 0.02, dispDate: '2026-09-30' })];
    const L = ledgerRig(ESTATE(), rows).dispositionLedger(7);
    eq([L.gross, L.fees, L.net], [0.3, 0.09, 0.21], '⚠ $0.10 and $0.20 is $0.30, not 0.30000000000000004 (roundCents on every sum)');
    const ht = ledgerRig(LIVING({ svc: 'downsizing_move' }), LINES({ undecided: false }));
    eq(ht.dispositionLedger(7).recon, null, 'Home Transition takes no proceeds statements (jobTakesProceedsStatements): nothing to reconcile');
    const page = text(ht.printDispositionLedger(7, { asHtml: true }).html);
    lacks(page, 'on no proceeds statement', 'and its ledger asks for none');
    has(page, '1 line sold, consigned or at auction with no proceeds recorded yet: #3 Tabriz rug.', 'while still naming the sale with nothing received');
  });

  G('E1 · the sign-off: one line per fiduciary, the client on living work, withheld while a line is undecided', () => {
    const co = [{ id: 'c1', name: 'Daniel Hale', role: 'Co-Personal Representative' }, { id: 'c2', name: 'Voided Person', voidedAt: 5 }];
    const est = ledgerRig(ESTATE({ coFiduciaries: co }), LINES({ undecided: false })).printDispositionLedger(7, { asHtml: true }).html;
    has(text(est), 'Sign-off Reviewed and approved as the final record of the disposition of the property listed above.', 'the sign-off says what is approved');
    eq(count(est, 'Signature: __'), 2, '⚠⚠ one signature line per fiduciary: the representative and the live co-representative');
    has(text(est), 'Rex Hale, Personal Representative', 'the representative by name and role');
    has(text(est), 'Daniel Hale, Co-Personal Representative', 'the co-representative too');
    lacks(est, 'Voided Person', 'a voided co-representative signs nothing');
    const trust = ledgerRig(ESTATE({ matterType: 'trust', executor: '', executorRole: '' }), LINES({ undecided: false })).printDispositionLedger(7, { asHtml: true }).html;
    eq(count(trust, 'Signature: __'), 1, 'no representative recorded: one line');
    has(text(trust), 'Date: ______________ successor trustee', 'labelled with the matter\'s approver (_agrApprover)');
    const living = ledgerRig(LIVING(), LINES({ undecided: false })).printDispositionLedger(7, { asHtml: true }).html;
    eq(count(living, 'Signature: __'), 1, 'living work: one line');
    has(text(living), 'Ann Smith, Client', 'for the client');
    const open = ledgerRig(ESTATE(), LINES()).printDispositionLedger(7, { asHtml: true }).html;
    eq(count(open, 'Signature: __'), 0, '⚠⚠ a line with no disposition: no signature line is offered');
    has(text(open), 'The sign-off is withheld. This page cannot be approved as the final record of the disposition of the property while 1 line has no disposition recorded.',
        'and the page says why, and what to do');
    // Person-entered text is text.
    const rows = LINES({ undecided: false });
    rows[0].channel = 'Kodner <b>Galleries</b>';
    const esc = ledgerRig(ESTATE({ executor: 'Rex <i>Hale</i>' }), rows).printDispositionLedger(7, { asHtml: true }).html;
    lacks(esc, '<b>Galleries', 'a typed recipient is escaped');
    lacks(esc, '<i>Hale', 'and a typed representative');
  });

  G('E1 · the receipt column shows a filed receipt, charity receipt or statement by the lines it covers', () => {
    const job = ESTATE({ signedRecords: [
      { id: 'r1', kind: 'donation', ref: 'Goodwill', stableIds: ['e'], label: 'Charity receipt — Goodwill', fileUrl: 'https://drive.google.com/file/d/RC/view', filedAt: T0 },
      { id: 'r2', kind: 'statement', ref: 'ps1', stableIds: ['a'], label: 'Proceeds statement — Kodner', fileUrl: '', filedAt: T0 },
      { id: 'r3', kind: 'receipt', ref: 'x', stableIds: ['b'], label: 'Signed receipt', voidedAt: T0, filedAt: T0 },
    ] });
    const html = ledgerRig(job, LINES({ undecided: false })).printDispositionLedger(7, { asHtml: true }).html;
    has(html, '<a href="https://drive.google.com/file/d/RC/view" style="color:#7a5c2e;">Charity receipt — Goodwill</a>', 'a donated line covered by a filed charity receipt links it');
    has(text(html), '1 Sargent portrait Auction Kodner Galleries Rex Hale Sep 25, 2026 Sep 30, 2026 $1,000 $250 $750 Proceeds statement — Kodner', 'an auctioned line names its filed statement');
    has(text(html), 'Goodwill #4411', 'a line with its own reference keeps it');
    lacks(text(html), 'Signed receipt', '⚠ a voided copy is no receipt');
  });

  // ── The signed copy and the derived line ─────────────────────────────────
  G('E1 · the signed copy is filed through the foundation\'s control, and the derived line follows it', () => {
    const job = ESTATE();
    const uploads = [];
    const c = lift(['_renderLedgerCard', 'fileSignedCopyFromInput', 'ledgerDerivedLines', 'ledgerSignedCopies'],
      ['savePhotoRefs', 'saveJobs', 'syncJobToSheets', 'showSyncBadge', '_signedCopyRepaint', 'resolveSubfolderId', 'uploadToDrive'], {
        savePhotoRefs() {}, saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {}, _signedCopyRepaint() {}, SHEETS_SYNC_URL: SYNC,
        resolveSubfolderId: (j, name, cb) => cb(name === 'Signed Records' ? 'SR7' : null),
        uploadToDrive: (folder, name, data, cb) => { uploads.push({ folder, name }); cb(true, 'https://drive.google.com/file/d/SIGNED/view', 'SIGNED'); },
        FileReader: function () { const self = this; self.readAsDataURL = function () { self.result = 'data:application/pdf;base64,QUJD'; self.onload(); }; },
        document: domStub({}), jobs: [job], _photoRefs: { 7: LINES({ undecided: false }) }, estimateStore: {}, jobPlanStore: {} });
    c.jobs = [job]; c._photoRefs = { 7: LINES({ undecided: false }) };
    const line = () => (c.ledgerDerivedLines(7, c.jobs[0], 'admin').filter((l) => l.key === 'ledger_signed')[0] || {});
    eq([line().ok, line().label], [false, 'Disposition Ledger signed by the Personal Representative'], 'before: open, naming who signs (_agrApprover)');
    has(line().detail, 'print it from the Disposition Ledger card on Job Admin & Inv, have it signed, and file the signed copy there', 'and saying where');
    const card = c._renderLedgerCard(job, c._photoRefs[7]);
    const idx = (/fileSignedCopyFromInput\(this,(\d+)\)/.exec(card) || [])[1];
    ok(idx !== undefined, 'the card carries the File signed copy control');
    has(text(card), 'No signed copy on file — the Personal Representative signs it at close-out.', 'and says nobody has signed yet');
    c.fileSignedCopyFromInput({ files: [{ name: 'ledger signed.pdf', type: 'application/pdf', size: 1000 }], value: 'x' }, Number(idx));
    eq(uploads.map((u) => u.folder), ['SR7'], 'choosing the scan files it to Signed Records');
    has(uploads[0] && uploads[0].name, 'HVL-0007 - Signed Disposition Ledger - ledger - ', 'under the paper\'s name');
    const rec = (c.jobs[0].signedRecords || [])[0] || {};
    eq([rec.kind, rec.ref], ['ledger', 'ledger'], '⚠⚠ recorded as kind ledger, ref ledger');
    eq(line().ok, true, '⚠⚠ the derived line is satisfied once a live signed copy is filed');
    has(line().detail, 'signed copy filed', 'and says when');
    has(text(c._renderLedgerCard(c.jobs[0], c._photoRefs[7])), '✓ Signed Disposition Ledger', 'the card lists the filed copy');
    rec.voidedAt = Date.now();
    eq(line().ok, false, 'a voided copy is no signature: the line opens again');
    // Where it appears: an estate's desk and close-out stage, never a living job's.
    eq(c.ledgerDerivedLines(7, c.jobs[0], 'p4').map((l) => l.key), ['ledger_signed'], 'on the close-out stage (p4)');
    eq(c.ledgerDerivedLines(7, LIVING(), 'p4').map((l) => l.key), [], 'and never on living work');
    const trust = c.ledgerDerivedLines(7, ESTATE({ matterType: 'trust' }), 'p4')[0] || {};
    eq(trust.label, 'Disposition Ledger signed by the successor trustee', 'a trust names the successor trustee');
  });

  // ── E2: the close ────────────────────────────────────────────────────────
  function closeRig(job, opts) {
    const o = Object.assign({ media: true, upload: 'ok', url: SYNC, rows: LINES({ undecided: false }) }, opts || {});
    const log = { gets: 0, uploads: [], badges: [], asked: [], notices: [], saves: 0, syncs: 0 };
    let answer = true;
    const fetch = (url, init) => {
      const u = String(url);
      if (!init) {
        log.gets++;
        if (o.media === 'fail') return sp(res({ ok: false, error: 'offline' }));
        return sp(res({ ok: true, media: o.media ? { 7: { items: JSON.parse(JSON.stringify(o.rows)) } } : {} }));
      }
      const body = JSON.parse(init.body || '{}');
      if (body.action === 'uploadHtml') {
        log.uploads.push({ folderId: body.folderId, filename: body.filename, html: body.html });
        if (o.upload === 'hang') return { then() { return this; }, catch() { return this; } };
        return sp(res(o.upload === 'ok' ? { ok: true, fileUrl: 'https://drive.google.com/file/d/LEDGER/view', fileId: 'LEDGER' } : { ok: false, error: 'Drive said no' }));
      }
      if (body.action === 'getSubfolders') return sp(res({ ok: true, subfolders: null }));
      return sp(res({ ok: true }));
    };
    const c = lift(['activateOrCycle', 'fileDispositionLedger'],
      ['saveJobs', 'syncJobToSheets', 'showSyncBadge', '_docNotice', 'openJobPlanFor', '_dashRedraw', 'renderClientDashboard', 'savePhotoRefs',
       'loadPhotoRefs', 'jobCloseBlockers'], {
        saveJobs() { log.saves++; }, syncJobToSheets() { log.syncs++; }, showSyncBadge(m, err) { log.badges.push({ m: String(m), err: !!err }); },
        _docNotice(t, m) { log.notices.push({ t, m: String(m) }); }, openJobPlanFor() { return false; }, _dashRedraw() { return true; },
        renderClientDashboard() {}, savePhotoRefs() {}, loadPhotoRefs() {}, jobCloseBlockers: () => [],
        confirm(m) { log.asked.push(String(m)); return answer; }, alert() {}, _todayStr: () => '2026-10-03',
        SHEETS_SYNC_URL: o.url, fetch, document: domStub({}), jobs: [job], _photoRefs: {}, estimateStore: {}, jobPlanStore: {} });
    c.jobs = [job]; c._photoRefs = {};
    return { c, log, job, answer: (a) => { answer = a; } };
  }
  const PAID = [{ uid: 'd1', stage: 'deposit', amount: 5000, receivedOn: '2026-09-20', method: 'wire' },
                { uid: 'm1', stage: 'midpoint', amount: 2500, receivedOn: '2026-09-28', method: 'wire' }];

  G('E2 · the close names an estate\'s unsigned ledger in its one question, and never refuses', () => {
    let r = closeRig(ESTATE({ payments: PAID }));
    r.answer(false);
    eq(r.c.applyJobTransition(r.job), false, 'Cancel keeps the job open');
    eq(r.log.asked.length, 1, '⚠⚠ an estate with its midpoint paid and no signed ledger is asked once');
    const q = r.log.asked[0] || '';
    has(q, 'The Disposition Ledger has no signed copy on file. It is filed to Drive as the job closes; have the Personal Representative sign it, then file the signed copy on the Disposition Ledger card (Job Admin & Inv).',
        'naming the ledger, who signs it and where its copy goes');
    lacks(q, 'payment is recorded', 'and not the midpoint, which is paid');
    r.answer(true);
    eq(r.c.applyJobTransition(r.job), true, '⚠ OK closes it: flagged, never refused');
    eq(r.job.status, 'closed', 'closed');
    // Both reasons: one question, both paragraphs.
    r = closeRig(ESTATE({ payments: [PAID[0]] }));
    r.c.applyJobTransition(r.job);
    eq(r.log.asked.length, 1, 'no midpoint and no signature: still one question');
    has(r.log.asked[0] || '', 'No midpoint payment is recorded', 'the midpoint paragraph');
    has(r.log.asked[0] || '', 'The Disposition Ledger has no signed copy on file', 'and the ledger\'s');
    // Signed: nothing to ask on a paid job.
    r = closeRig(ESTATE({ payments: PAID, signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', filedAt: T0 }] }));
    r.c.applyJobTransition(r.job);
    eq(r.log.asked.length, 0, 'a signed ledger on file: the paid close asks nothing');
    // A voided copy is no signature.
    r = closeRig(ESTATE({ payments: PAID, signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', filedAt: T0, voidedAt: T0 }] }));
    r.c.applyJobTransition(r.job);
    eq(r.log.asked.length, 1, 'a voided copy: asked again');
    // Living work is never asked about a ledger signature.
    r = closeRig(LIVING({ payments: PAID }));
    r.c.applyJobTransition(r.job);
    eq(r.log.asked.length, 0, 'living work with its midpoint paid: no question');
  });

  G('E2 · closing files the ledger to Drive, recorded as a person\'s edit', () => {
    const r = closeRig(ESTATE({ payments: PAID, signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', filedAt: T0 }] }));
    r.c.activateOrCycle(7);
    eq(r.job.status, 'closed', 'the job closes');
    eq(r.log.gets, 1, '⚠ the manifest is read from the sheet first');
    eq(r.log.uploads.length, 1, 'one filing');
    const up = r.log.uploads[0] || {};
    eq([up.folderId, up.filename], ['INV7', 'HVL-0007 - Havellin Disposition Ledger.html'], 'to Estate Inventory, under the undated name the package uses');
    has(up.html || '', 'Disposition Ledger', 'the ledger page');
    has(up.html || '', 'Sargent portrait', 'built from the manifest the sheet returned');
    const st = (r.job.docState || {}).dispositionLedger || {};
    eq([st.filedUrl, st.filedId, st.filedHow, st.filedBy], ['https://drive.google.com/file/d/LEDGER/view', 'LEDGER', 'close', 'Anthony Graziano'], '⚠⚠ recorded on docState.dispositionLedger');
    ok(/^\d{4}-\d{2}-\d{2}T/.test(st.filedAt || ''), 'with when');
    ok(typeof (r.job.at || {})['docState:dispositionLedger'] === 'number', '⚠ stamped on its own key, so a stale device cannot drop it');
    ok(r.log.syncs >= 2, 'and synced (the close, then the filing)');
    eq(r.log.badges.map((b) => b.m), ['Disposition Ledger filed to Drive ✓'], 'reported through the sync badge');
    eq(Object.keys(r.c._ledgerFiling).length, 0, 'the in-flight mark is cleared');
    // A re-open is not a close.
    const r2 = closeRig(ESTATE({ status: 'closed', deliveredOn: '2026-10-02', payments: PAID }));
    r2.c.activateOrCycle(7);
    eq([r2.job.status, r2.log.uploads.length], ['active', 0], 'a re-open files nothing');
  });

  G('E2 · what stops the close-time filing, and what each says', () => {
    let r = closeRig(ESTATE({ payments: PAID }), { url: '' });
    r.c.activateOrCycle(7);
    eq([r.job.status, r.log.uploads.length], ['closed', 0], 'no Apps Script URL: the job still closes, nothing is filed');
    has((r.log.badges[0] || {}).m, 'no Apps Script URL in Settings. Press File to Drive on the Disposition Ledger card (Job Admin & Inv) once one is set.', 'the badge says why and where to go');
    eq((r.log.badges[0] || {}).err, true, 'as an error');
    r = closeRig(ESTATE({ payments: PAID }), { media: 'fail' });
    r.c.activateOrCycle(7);
    eq(r.log.uploads.length, 0, '⚠⚠ the manifest could not be read: nothing is filed (an empty ledger would replace a true one)');
    has((r.log.badges[0] || {}).m, 'the inventory could not be read from the sheet', 'and the badge says so');
    ok(!(r.job.docState || {}).dispositionLedger, 'nothing recorded');
    r = closeRig(ESTATE({ payments: PAID }), { upload: 'fail' });
    r.c.activateOrCycle(7);
    has((r.log.badges[0] || {}).m, 'The Disposition Ledger was not filed to Drive — Drive said no. Press File to Drive on the Disposition Ledger card (Job Admin & Inv) to try again.', 'a failed upload names the fix');
    ok(!(r.job.docState || {}).dispositionLedger, 'and records nothing, so the card offers File to Drive');
    eq(Object.keys(r.c._ledgerFiling).length, 0, 'and the next press is not refused as in flight');
    r = closeRig(ESTATE({ payments: PAID, driveFolder: '' }));
    r.c.activateOrCycle(7);
    has((r.log.badges[0] || {}).m, 'this client has no Drive folder yet', 'no Drive folder: said');
    r = closeRig(ESTATE({ svc: 'prep', matterType: '', payments: PAID }));
    r.c.activateOrCycle(7);
    eq([r.log.gets, r.log.uploads.length, r.log.badges.length], [0, 0, 0], 'a Home Prep close files nothing and says nothing: it has no inventory');
    r = closeRig(ESTATE({ payments: PAID }), { rows: [] });
    r.c.activateOrCycle(7);
    eq([r.log.uploads.length, r.log.badges.length], [0, 0], 'an inventory with no lines: nothing to file, nothing said');
    // One at a time, and on demand from the desk.
    r = closeRig(ESTATE({ status: 'closed', deliveredOn: '2026-10-02' }), { upload: 'hang' });
    eq(r.c.fileDispositionLedger(7), true, 'File to Drive from the desk starts a filing');
    eq(r.c.fileDispositionLedger(7), false, 'a second press while it is out is refused');
    has((r.log.notices[0] || {}).m, 'being filed now', 'and says so');
    r = closeRig(ESTATE({ status: 'closed', deliveredOn: '2026-10-02' }));
    r.c.fileDispositionLedger(7);
    eq(((r.job.docState || {}).dispositionLedger || {}).filedHow, 'desk', 'a desk filing is recorded as such');
    has((r.log.notices[0] || {}).m, 'Disposition Ledger filed to the client’s Estate Inventory folder in Drive.', 'with a notice, not a badge');
  });

  G('E2 · the filing lands on the record the store holds when Drive answers, and repaints only that client\'s desk', () => {
    // A load can replace the jobs store while the upload is out: the record is written to the job held now.
    const r = closeRig(ESTATE({ status: 'closed', deliveredOn: '2026-10-02' }));
    const fresh = JSON.parse(JSON.stringify(r.job));
    fresh.note = 'loaded while the upload was out';
    const inner = r.c.fetch;
    r.c.fetch = (url, init) => {
      if (init && JSON.parse(init.body || '{}').action === 'uploadHtml') r.c.jobs = [fresh];
      return inner(url, init);
    };
    r.c.fileDispositionLedger(7);
    eq(((fresh.docState || {}).dispositionLedger || {}).filedId, 'LEDGER', '⚠⚠ recorded on the record the store holds now');
    ok(!(r.job.docState || {}).dispositionLedger, 'not on the copy the load replaced');
    eq(r.c.jobs[0], fresh, 'and the store still holds that record');
    // The repaint: only a records host drawn for this client is redrawn.
    const job = ESTATE();
    const paint = (host) => {
      const doc = domStub({ 'inv-records': { innerHTML: 'ANOTHER CLIENT', attrs: { 'data-job': host } } });
      const c = lift(['_ledgerCardRepaint'], ['savePhotoRefs'], { savePhotoRefs() {}, document: doc, jobs: [job], _photoRefs: { 7: LINES() }, estimateStore: {}, jobPlanStore: {} });
      c.jobs = [job]; c._photoRefs = { 7: LINES() };
      c._ledgerCardRepaint(7);
      return doc.getElementById('inv-records').innerHTML;
    };
    eq(paint('9'), 'ANOTHER CLIENT', '⚠ the desk open on another client is left alone');
    has(paint('7'), 'id="inv-ledger-card"', 'the desk open on this client is repainted');
  });

  G('E2 · every early stop clears the in-flight mark; the root folder where Estate Inventory is missing; who filed it; the card repaints', () => {
    const CLOSED = (o) => ESTATE(Object.assign({ status: 'closed', deliveredOn: '2026-10-02' }, o || {}));
    let r = closeRig(CLOSED(), { media: 'fail' });
    r.c.fileDispositionLedger(7);
    eq(Object.keys(r.c._ledgerFiling).length, 0, 'an unread manifest: the next press is not refused as in flight');
    r = closeRig(CLOSED(), { rows: [] });
    r.c.fileDispositionLedger(7);
    eq(Object.keys(r.c._ledgerFiling).length, 0, 'an empty inventory: likewise');
    has((r.log.notices[0] || {}).m, 'The inventory holds no lines, so there is no ledger to file yet.', 'and the desk is told why');
    r = closeRig(CLOSED({ driveSubfolders: { 'As-Found Record': 'AF7' } }));
    r.c.fileDispositionLedger(7);
    eq((r.log.uploads[0] || {}).folderId, 'ROOT7', '⚠ an older folder with no Estate Inventory subfolder: filed to the job\'s root');
    r = closeRig(CLOSED({ agrApprovedBy: '' }));
    r.c.fileDispositionLedger(7);
    eq(((r.job.docState || {}).dispositionLedger || {}).filedBy, 'Ashley Jerome', 'nobody approved the agreement: the concierge is recorded as the filer');
    r = closeRig(CLOSED());
    r.c.document = domStub({ 'inv-records': { innerHTML: 'BEFORE', attrs: { 'data-job': '7' } } });
    r.c.fileDispositionLedger(7);
    has(text(r.c.document.getElementById('inv-records').innerHTML), 'Filed to Drive', '⚠ the card on screen says it is filed, repainted by id');
  });

  G('E2 · the filing survives a device saving an older copy of the job (the sheet\'s per-key merge)', () => {
    const ctx = vm.createContext({ console });
    vm.runInContext([gsVar(GS, 'JOB_KEYED_LISTS'), gsVar(GS, 'JOB_KEYED_MAPS'), gsVar(GS, 'JOB_LIST_KEY'), gsVar(GS, 'JOB_PAYMENT_STICKY'),
      gsFn(GS, '_paymentSticky'), gsFn(GS, '_jobStamp'), gsFn(GS, '_jobListKey'), gsFn(GS, '_mergeJobKeyed'), gsFn(GS, '_mergeJobRecord'),
      'this.merge = _mergeJobRecord;'].join('\n\n'), ctx);
    const r = closeRig(ESTATE({ payments: PAID, signedRecords: [{ id: 's1', kind: 'ledger', ref: 'ledger', filedAt: T0 }] }));
    r.c.activateOrCycle(7);
    const desk = JSON.parse(JSON.stringify(r.job));
    const stale = Object.assign(JSON.parse(JSON.stringify(ESTATE({ payments: PAID }))), { updatedAt: desk.updatedAt + 1000, note: 'edited later on a morning copy' });
    const m = ctx.merge(desk, stale);
    eq(((m.docState || {}).dispositionLedger || {}).filedId, 'LEDGER', '⚠⚠ the filing record survives a newer save from a device that never saw it');
    eq(m.note, 'edited later on a morning copy', 'while that device\'s own edit lands');
  });

  // ── E3: the package ──────────────────────────────────────────────────────
  G('E3 · the estate package attaches the Disposition Ledger, on both routes and at every tier', () => {
    const c = lift(['probatePackageDocs', 'probatePackagePage', 'buildProbatePackageEmailText'], ['savePhotoRefs'],
      { savePhotoRefs() {}, document: domStub({}), jobs: [], _photoRefs: {}, estimateStore: {}, jobPlanStore: {} });
    c.PROBATE_PKG_TITLES = sandbox({ vars: ['PROBATE_PKG_TITLES'] }).PROBATE_PKG_TITLES;
    const docs = (o) => c.probatePackageDocs(ESTATE(o));
    eq(docs({}), ['court', 'schedule', 'ledger', 'worklist'], 'the probate route');
    eq(docs({ matterType: 'trust' }), ['trustee', 'schedule', 'ledger', 'worklist'], 'the trust route');
    eq(docs({ matterType: 'both' }), ['court', 'trustee', 'schedule', 'ledger', 'worklist'], 'a pour-over');
    eq(docs({ docTier: 'contents' }), ['contents', 'ledger', 'worklist'], 'a contents engagement: the ledger is our own work, never a valuation');
    eq(docs({ docTier: 'none' }), ['ledger', 'worklist'], 'tier none: the ledger and the worklist');
    eq(c.probatePackageDocs(LIVING()), [], 'a living client has no package');
    eq(c.PROBATE_PKG_TITLES.ledger, 'Disposition Ledger', 'named Disposition Ledger');
    c.jobs = [ESTATE()]; c._photoRefs = { 7: LINES({ undecided: false }) };
    const pg = c.probatePackagePage(7, 'ledger');
    has(pg.html || '', 'Where each item went and what it brought', '⚠ the page is the desk\'s own ledger');
    const email = c.buildProbatePackageEmailText({ job: ESTATE(), asOf: 'October 3, 2026', scope: '', inDrive: [], unshared: [],
      attached: ['court', 'schedule', 'ledger', 'worklist'].map((k) => ({ title: c.PROBATE_PKG_TITLES[k] })) });
    has(email, '  - Estate Inventory Report\n  - Disposition Ledger\n  - Appraisal Worklist', 'the email\'s list of what is attached says so');
    // One file in Drive: the package files the ledger under the name the close does.
    has(noComments(fn('_pkgFileAll')), '_invDocDriveName(job, d.title)', 'fixture: the package files each page under _invDocDriveName(job, its title)');
    has(noComments(fn('fileDispositionLedger')), '_invDocDriveName(job, title)', 'the close files under the same namer');
    has(noComments(fn('fileDispositionLedger')), 'var title = PROBATE_PKG_TITLES.ledger;', 'with the package\'s title for the ledger');
    has(noComments(fn('fileDispositionLedger')), 'resolveSubfolderId(job, PHOTO_SUBFOLDER,', 'into the folder the package files to');
  });

  // ── E4: donations ────────────────────────────────────────────────────────
  G('E4 · every donated line is receipted, not any one; a charity\'s filed receipt counts its lines', () => {
    const c = ledgerRig(ESTATE(), LINES());
    const line = (job, rows) => c.donationReceiptLine(job, rows || c._photoRefs[7]);
    let l = line(ESTATE());
    eq([l.key, l.ok, l.label], ['donation_receipt', false, 'Donation receipts on file'], '⚠⚠ one receipted line of three does not pass (it did)');
    eq(l.detail, '1 of 3 donated lines receipted — file each charity’s receipt on the Donations card, Job Admin & Inv (1 with no charity recorded: name it in Channel / Recipient first)', 'N of M, and the fix');
    const groups = c.donationGroups(ESTATE(), c._photoRefs[7]);
    eq(groups.map((g) => [g.charity, g.lines.map((r) => r.stableId), g.receipted]), [['Goodwill', ['d', 'e'], 1], ['', ['f'], 0]],
       'grouped by charity, case and spaces aside; the unnamed together, last');
    const first = [c._photoRefs[7][5]].concat(c._photoRefs[7].filter((r) => r.stableId !== 'f'));
    eq(c.donationGroups(ESTATE(), first).map((g) => g.charity), ['Goodwill', ''], '⚠ the unnamed group is last even when its line comes first');
    const rec = { id: 'r1', kind: 'donation', ref: 'Goodwill', stableIds: ['d', 'e'], filedAt: T0 };
    l = line(ESTATE({ signedRecords: [rec] }));
    eq([l.ok, l.detail.slice(0, 32)], [false, '2 of 3 donated lines receipted —'], 'the charity\'s receipt covers its two lines');
    const rows = c._photoRefs[7].map((r) => r.stableId === 'f' ? Object.assign({}, r, { channel: 'Habitat ReStore' }) : r);
    l = line(ESTATE({ signedRecords: [rec, { id: 'r2', kind: 'donation', ref: 'Habitat ReStore', stableIds: ['f'], filedAt: T0 }] }), rows);
    eq([l.ok, l.detail], [true, '3 of 3 donated lines receipted'], 'every line receipted: the line is green');
    l = line(ESTATE({ signedRecords: [Object.assign({}, rec, { voidedAt: T0 })] }));
    eq(l.detail.slice(0, 32), '1 of 3 donated lines receipted —', 'a voided receipt counts for nothing');
    eq(line(ESTATE(), c._photoRefs[7].filter((r) => r.disposition !== 'Donate')), null, 'no donations: no line');
  });

  G('E4 · the Donation Record, per charity', () => {
    const c = ledgerRig(ESTATE({ signedRecords: [{ id: 'r1', kind: 'donation', ref: 'Goodwill', stableIds: ['d'], label: 'Charity receipt — Goodwill', fileUrl: 'https://drive.google.com/file/d/GW/view', filedAt: Date.parse('2026-09-30T15:00:00Z') }] }), LINES());
    const p = c.printDonationRecord(7, 'e', { asHtml: true });
    const t = text(p.html);
    has(p.title, 'Havellin Donation Record - Goodwill', 'a record per charity, named for it');
    has(t, 'Charity: Goodwill', 'the charity');
    has(t, 'Donated on behalf of the estate, by Rex Hale, Personal Representative.', 'on whose behalf');
    has(t, '4 Sofa Furniture 1 Fair Sep 29, 2026 $300', 'each item: number, item, qty, condition, date, value');
    has(t, '5 Lamps (pair) Furniture 2 Good Sep 29, 2026 $80', 'and its quantity');
    has(t, '2 lines · 3 items · estimated value $380', 'the totals');
    has(t, 'The charity’s receipt: filed Sep 30, 2026 · Charity receipt — Goodwill (1 of the 2 lines below is receipted)', '⚠ a list not wholly receipted says so');
    has(t, 'Values are Havellin’s estimates of what each item would sell for, given for the donor’s records. They are not appraisals.', 'values are marked as estimates, not appraisals');
    has(t, 'Whether a charitable deduction is available, and in what amount, is for the donor’s tax adviser to determine.', 'the deduction is left to the donor\'s tax adviser');
    lacks(t, 'Bookcase', 'another charity\'s line is not on it');
    const nov = ledgerRig(LIVING(), LINES().map((r) => Object.assign({}, r, { fmv: '' }))).printDonationRecord(7, 'd', { asHtml: true });
    lacks(nov.html, 'Estimated value', 'no value recorded: no value column');
    lacks(text(nov.html), 'not appraisals', 'and no sentence about values it does not state');
    has(text(nov.html), 'Donated by Ann Smith.', 'living work: the client is the donor');
    eq(c.printDonationRecord(7, 'f', { asHtml: true }).why, 'That line is not a donation with a charity recorded. Name the charity in Channel / Recipient first.', 'a line with no charity: refused, named');
    const typed = LINES().map((r) => r.stableId === 'd' || r.stableId === 'e' ? Object.assign({}, r, { channel: 'Good<b>will</b>' }) : r);
    const tc = ledgerRig(ESTATE(), typed);
    lacks(tc.printDonationRecord(7, 'd', { asHtml: true }).html, '<b>will', 'a typed charity name is text on the record');
    lacks(tc._renderLedgerCards(ESTATE(), typed), '<b>will', 'and on the card');
  });

  G('E4 · the Donations card: a record and a receipt control per charity, the unnamed listed as such', () => {
    const c = ledgerRig(ESTATE(), LINES());
    const html = c._renderLedgerCards(ESTATE(), c._photoRefs[7]);
    has(html, 'id="inv-donations-card"', 'the card is drawn');
    has(html, 'printDonationRecord(7,\'d\')', 'Print Donation Record for Goodwill, by one of its lines');
    has(text(html), 'Goodwill · 2 lines · 1 of 2 receipted', 'its count');
    has(text(html), 'No charity recorded · 1 line · 0 receipted #6 Bookcase', '⚠ the unnamed lines are listed as such');
    eq(count(html, 'printDonationRecord('), 1, 'and only a named charity has a record to print');
    const spec = c._signedCopySpecs.filter((s) => s && s.kind === 'donation')[0] || {};
    eq([spec.meta && spec.meta.ref, spec.meta && spec.meta.stableIds], ['Goodwill', ['d', 'e']], '⚠ the receipt control files kind donation, ref the charity, its lines');
  });

  // ── E4/E6: the desk boxes ────────────────────────────────────────────────
  G('E4/E6 · fin_proceeds and fin_donation_receipts are derived lines now; fin_settlement and fin_vendor_invoices stay', () => {
    const c = lift(['planTaskCtx', 'planTasksFor', 'jobTakesProceedsStatements'], [], { jobs: [], estimateStore: {}, _photoRefs: {}, jobPlanStore: {} });
    const keys = sandbox({ vars: ['JOB_ADMIN_TASKS'] }).JOB_ADMIN_TASKS.map((t) => t.key);
    ok(keys.indexOf('fin_proceeds') < 0 && keys.indexOf('fin_donation_receipts') < 0, '⚠ the two boxes are gone from the catalogue');
    ok(keys.indexOf('fin_vendor_invoices') >= 0 && keys.indexOf('fin_settlement') >= 0, 'the two actions nothing in the app can see stay');
    ['downsizing', 'downsizing_move', 'home_cleanout', 'prep', 'cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      eq(c.jobTakesProceedsStatements({ svc }), c.planTaskCtx({ svc }, { svc }).isDisposal, svc + ': statements are taken exactly where fin_settlement asks (isDisposal)');
    });
  });

  // ── E5: snapshots ────────────────────────────────────────────────────────
  // A clock that moves a second each time it is read, so a take and a void are never the same millisecond (the sheet
  // breaks a stamp tie toward the incoming copy, which no two real presses produce).
  let tick = Date.parse('2026-10-03T14:00:00Z');
  const Clock = class extends Date { constructor(...a) { if (a.length) super(...a); else super(tick); } static now() { tick += 1000; return tick; } };
  function snapRig(job, rows) {
    const log = { badges: [], renders: 0, saves: 0, syncs: 0 };
    let reply = '';
    const c = lift(['takeInventorySnapshot', 'voidInventorySnapshot', '_renderInventorySnapshots', 'printInventorySnapshot', 'printSnapshotComparison', 'snapshotDiff'],
      ['saveJobs', 'syncJobToSheets', 'showSyncBadge', 'renderInventoryTab', 'savePhotoRefs'], { Date: Clock,
        saveJobs() { log.saves++; }, syncJobToSheets() { log.syncs++; }, showSyncBadge(m, e) { log.badges.push({ m: String(m), err: !!e }); },
        renderInventoryTab() { log.renders++; }, savePhotoRefs() {}, document: domStub({}),
        jobs: [job], _photoRefs: { 7: rows }, estimateStore: {}, jobPlanStore: {} });
    c.jobs = [job]; c._photoRefs = { 7: rows };
    c.window.prompt = () => reply;
    return { c, log, job, reply: (v) => { reply = v; } };
  }
  G('E5 · a snapshot is voided with a reason, never deleted, and still prints', () => {
    const r = snapRig(ESTATE(), LINES());
    r.reply(null);
    r.c.takeInventorySnapshot(7);
    ok(!(r.job.invSnapshots || []).length, '⚠ Cancel takes no snapshot (a snapshot can no longer be removed)');
    r.reply('Filed with court');
    r.c.takeInventorySnapshot(7);
    const snap = (r.job.invSnapshots || [])[0] || {};
    eq([snap.label, snap.count, snap.items && snap.items[0] && snap.items[0].itemNo], ['Filed with court', 8, 1], 'a snapshot is taken, by item number');
    const listed = r.c._renderInventorySnapshots(r.job);
    lacks(listed, 'removeInventorySnapshot', '⚠⚠ there is no Remove');
    has(listed, 'voidInventorySnapshot(7,' + snap.ts + ')', 'Void instead');
    r.reply('');
    eq(r.c.voidInventorySnapshot(7, snap.ts), false, 'no reason given: not voided');
    has((r.log.badges[r.log.badges.length - 1] || {}).m, 'voided only with a reason', 'and it says why');
    r.reply(null);
    eq(r.c.voidInventorySnapshot(7, snap.ts), false, 'Cancel: not voided');
    ok(!snap.voidedAt, 'nothing changed');
    r.reply('  taken before the rug was recorded  ');
    delete r.job.at['invSnapshots:' + snap.ts];
    eq(r.c.voidInventorySnapshot(7, snap.ts), true, 'with a reason it is voided');
    eq([r.job.invSnapshots.length, snap.voidReason, snap.voidedBy], [1, 'taken before the rug was recorded', 'Anthony Graziano'], '⚠⚠ the snapshot stays, with why and by whom');
    ok(typeof snap.voidedAt === 'number', 'and when');
    ok(typeof r.job.at['invSnapshots:' + snap.ts] === 'number', '⚠ stamped on its own key (invSnapshots:<ts>), the key the sheet merges it on');
    eq(r.c.voidInventorySnapshot(7, snap.ts), false, 'a void is not voided twice');
    const after = r.c._renderInventorySnapshots(r.job);
    has(text(after), 'VOIDED', 'listed as voided');
    has(text(after), 'taken before the rug was recorded', 'with the reason');
    has(after, 'printInventorySnapshot(7,' + snap.ts + ')', 'still printable');
    lacks(after, 'voidInventorySnapshot(7,' + snap.ts + ')', 'and not voidable again');
    r.c.printInventorySnapshot(7, snap.ts);
    has(text(r.c.__printed), 'VOIDED — the snapshot of', '⚠ the print is marked VOIDED');
    has(text(r.c.__printed), 'taken before the rug was recorded', 'with the reason');
    has(r.c.__printed, '<h2 style="font-family:\'Cormorant Garamond\',serif;margin-bottom:2px;">Inventory Snapshot</h2>', 'titled Inventory Snapshot, not Estate Inventory, which a trust is not');
    const cents = snapRig(ESTATE(), [ROW('x', { itemNo: 1, fmv: 0.1 }), ROW('y', { itemNo: 2, fmv: 0.2 })]);
    cents.reply('cents'); cents.c.takeInventorySnapshot(7);
    eq(((cents.job.invSnapshots || [])[0] || {}).totalFMV, 0.3, '⚠ the snapshot\'s total is carried to the cent');
  });

  G('E5 · the sheet keeps the void against a device that never saw it', () => {
    const ctx = vm.createContext({ console });
    vm.runInContext([gsVar(GS, 'JOB_KEYED_LISTS'), gsVar(GS, 'JOB_KEYED_MAPS'), gsVar(GS, 'JOB_LIST_KEY'), gsVar(GS, 'JOB_PAYMENT_STICKY'),
      gsFn(GS, '_paymentSticky'), gsFn(GS, '_jobStamp'), gsFn(GS, '_jobListKey'), gsFn(GS, '_mergeJobKeyed'), gsFn(GS, '_mergeJobRecord'),
      'this.merge = _mergeJobRecord;'].join('\n\n'), ctx);
    const r = snapRig(ESTATE(), LINES());
    r.reply('As of walkthrough'); r.c.takeInventorySnapshot(7);
    const morning = JSON.parse(JSON.stringify(r.job));
    r.reply('recorded in error'); r.c.voidInventorySnapshot(7, r.job.invSnapshots[0].ts);
    const desk = JSON.parse(JSON.stringify(r.job));
    const stale = Object.assign(morning, { updatedAt: desk.updatedAt + 5000 });
    const m = ctx.merge(desk, stale);
    eq(((m.invSnapshots || [])[0] || {}).voidReason, 'recorded in error', '⚠⚠ a newer save of the morning copy does not bring the snapshot back unvoided');
    eq((m.invSnapshots || []).length, 1, 'and the snapshot is still there');
  });

  G('E5 · what changed: by item number, with now and with the previous snapshot', () => {
    const before = [
      { itemNo: 1, object: 'Sargent portrait', category: 'Art', fmv: '45000', disposition: '', track: 'Probate' },
      { itemNo: 2, object: 'Tea set', category: 'Silver', fmv: '', disposition: 'Keep', track: 'Probate' },
      { itemNo: 3, object: 'Rug', category: 'Rugs', fmv: '900', disposition: 'Sell', track: 'Probate' },
      { itemNo: 4, object: 'Clock', category: 'Furniture', fmv: '120', disposition: '', track: 'Probate' },
      { itemNo: '', object: 'Old unnumbered line', fmv: '50' },
    ];
    const after = [
      { itemNo: 1, object: 'Sargent portrait', category: 'Art', fmv: '48000', disposition: 'Auction', track: 'Probate' },
      { itemNo: 2, object: 'Silver tea set', category: 'Silver', fmv: '', disposition: 'Keep', track: 'Trust' },
      { itemNo: 3, object: 'Rug', category: 'Rugs', fmv: '900', disposition: 'Sell', track: 'Probate' },
      { itemNo: 5, object: 'Desk', category: 'Furniture', fmv: '300.255', disposition: '', track: 'Probate' },
    ];
    const r = snapRig(ESTATE(), LINES());
    const d = r.c.snapshotDiff(before, after);
    eq(d.added.map((x) => x.no), ['5'], 'added: #5');
    eq(d.removed.map((x) => x.no), ['4'], 'removed: #4');
    eq(d.renamed.map((x) => [x.no, x.from, x.to]), [['2', 'Tea set', 'Silver tea set']], '⚠ renamed, not removed and added: the number is the identity');
    eq(d.value.map((x) => [x.no, x.from, x.to]), [['1', 45000, 48000]], 'value changed, old → new');
    eq(d.disposition.map((x) => [x.no, x.from, x.to]), [['1', '', 'Auction']], 'disposition changed');
    eq(d.track.map((x) => [x.no, x.from, x.to]), [['2', 'Probate', 'Trust']], 'track changed');
    eq([d.unchanged, d.unkeyed], [1, 1], 'one unchanged, one line with no number set aside');
    eq(d.totals, { before: { count: 5, value: 46070, valued: true }, after: { count: 4, value: 49200.26, valued: true } }, 'totals before and after, to the cent');
    eq(r.c.snapshotDiff([{ itemNo: 1, fmv: '0.1' }, { itemNo: 2, fmv: '0.2' }], []).totals.before.value, 0.3, '⚠ $0.10 and $0.20 total $0.30, not 0.30000000000000004 (roundCents on the sum)');
    // Printed against the inventory now, and against the previous snapshot (a voided one is skipped).
    const job = ESTATE({ invSnapshots: [
      { ts: 1000, label: 'Walkthrough', count: 5, totalFMV: 46070, items: before },
      { ts: 2000, label: 'Mistake', count: 1, totalFMV: 0, items: [], voidedAt: 2500, voidReason: 'wrong job' },
      { ts: 3000, label: 'Filed with court', count: 4, totalFMV: 49200.26, items: after },
    ] });
    const s = snapRig(job, LINES());
    const prev = s.c.printSnapshotComparison(7, 3000, 'prev', { asHtml: true });
    const pt = text(prev.html);
    has(pt, 'Inventory Snapshot — What Changed', 'the comparison page');
    has(pt, '(Walkthrough) compared with the snapshot of', '⚠ "previous" is the last live snapshot, skipping the voided one');
    has(pt, 'Items 5 → 4 Total recorded value $46,070 → $49,200.26', 'totals before and after');
    has(pt, 'Added 1 · Removed 1 · Renamed 1 · Value changed 1 · Disposition changed 1 · Track changed 1 · Unchanged 1', 'every kind of change counted');
    has(pt, 'Value changed (1) Item # Item Was Now 1 Sargent portrait $45,000 $48,000', 'value: old → new');
    has(pt, 'Renamed (1) Item # Was Now 2 Tea set Silver tea set', 'renamed');
    has(pt, '1 line carries no item number (taken before item numbers existed), so it is not compared.', 'the unnumbered line is named, not guessed');
    const now = s.c.printSnapshotComparison(7, 3000, 'now', { asHtml: true });
    has(text(now.html), 'compared with the inventory as it stands on', 'against the inventory now');
    has(text(now.html), 'Items 4 → 8', 'which holds eight lines');
    has(text(now.html), 'Added 4 · Removed 0 · Renamed 2 ·', '⚠ the inventory now is read as a snapshot reads it: #3 and #5 renamed, not every line');
    eq(s.c.printSnapshotComparison(7, 1000, 'prev', { asHtml: true }).why, 'There is no earlier snapshot to compare this one with.', 'the first snapshot has no previous');
    const voided = text(s.c.printSnapshotComparison(7, 2000, 'now', { asHtml: true }).html);
    has(voided, 'VOIDED — the snapshot of', 'a voided snapshot\'s comparison is marked VOIDED');
    const list = s.c._renderInventorySnapshots(job);
    has(list, 'printSnapshotComparison(7,3000,\'prev\')', 'the list offers Compare with previous');
    has(list, 'printSnapshotComparison(7,3000,\'now\')', 'and Compare with now');
    lacks(list, 'printSnapshotComparison(7,1000,\'prev\')', 'and not where there is no earlier live snapshot');
    s.c.printSnapshotComparison(7, 3000, 'now');
    has(s.c.__printed, 'What Changed', 'and it prints');
  });

  // ── E6: proceeds statements ──────────────────────────────────────────────
  G('E6 · a statement is reconciled against the ledger to the cent, with both figures', () => {
    const c = ledgerRig(ESTATE(), LINES());
    const rows = c._photoRefs[7];
    const R = (stmts) => c.proceedsReconciliation(ESTATE({ proceedsStatements: stmts }), rows);
    let x = R([STATEMENT({ gross: 1237.5, netPaid: 928.12 })]);
    eq([x.statements[0].agrees, x.statements[0].linesGross, x.statements[0].linesFees], [true, 1237.5, 309.38], 'gross and fees equal to the lines\', net paid gross less fees: agrees');
    x = R([STATEMENT()]);
    eq(x.statements[0].flags.map((f) => [f.key, f.statement, f.ledger]), [['gross', 1250, 1237.5]], '⚠⚠ $12.50 over: flagged with both figures');
    eq(c._reconFlagText(x.statements[0].flags[0]), 'Gross: $1,250 on the statement, $1,237.50 on its lines ($12.50 apart)', 'in words');
    x = R([STATEMENT({ gross: 1237.5, netPaid: 928.11 })]);
    eq(x.statements[0].flags.map((f) => [f.key, f.statement, f.ledger]), [['net', 928.11, 928.12]], '⚠ a cent short on the net paid is flagged');
    x = R([STATEMENT({ gross: 1237.5, netPaid: 928.124 })]);
    eq(x.statements[0].flags.length, 0, 'under a cent, after rounding to the cent, is no difference');
    x = R([STATEMENT({ gross: 1237.5, fees: 300 , netPaid: 937.5 })]);
    eq(x.statements[0].flags.map((f) => f.key), ['fees'], 'fees against the lines\' fees');
    eq(x.unlisted.map((r) => r.stableId), ['c'], 'the consignment on no statement is listed');
    x = R([STATEMENT({ gross: 1237.5, netPaid: 928.12 }), STATEMENT({ id: 'ps2', vendor: 'Palm Consign', lines: [{ stableId: 'a', itemNo: 1 }, { stableId: 'c', itemNo: 3 }], gross: 1000, fees: 250, netPaid: 750 })]);
    eq(x.twice.map((r) => r.stableId), ['a'], 'a line on two statements is named');
    x = R([STATEMENT({ lines: [{ stableId: 'a', itemNo: 1 }, { stableId: 'zz', itemNo: 99 }], gross: 1000, fees: 250, netPaid: 750 })]);
    eq([x.statements[0].agrees, x.statements[0].gone.map((l) => l.itemNo)], [false, [99]], 'a line no longer on the inventory is named');
    x = R([Object.assign(STATEMENT(), { voidedAt: T0, voidReason: 'duplicate' })]);
    eq(x.statements.length, 0, 'a voided statement reconciles nothing');
  });

  G('E6 · recorded through the modal, voided with a reason, never removed', () => {
    const job = ESTATE();
    const dom = domStub({ 'ps-job': '', 'ps-vendor': '', 'ps-date': '', 'ps-gross': '', 'ps-fees': '', 'ps-net': '', 'ps-paidon': '', 'ps-paidto': '', 'ps-ref': '' });
    const boxes = [];
    const linesEl = dom.getElementById('ps-lines');
    linesEl.querySelectorAll = () => boxes;
    const log = { badges: [], renders: 0, saves: 0, syncs: 0 };
    const c = lift(['openProceedsStatement', 'saveProceedsStatement', 'voidProceedsStatement', 'proceedsReconciliation'],
      ['saveJobs', 'syncJobToSheets', 'showSyncBadge', 'renderInventoryTab', 'savePhotoRefs'], {
        saveJobs() { log.saves++; }, syncJobToSheets() { log.syncs++; }, showSyncBadge(m, e) { log.badges.push({ m: String(m), err: !!e }); },
        renderInventoryTab() { log.renders++; }, savePhotoRefs() {}, document: dom, jobs: [job], _photoRefs: { 7: LINES() }, estimateStore: {}, jobPlanStore: {} });
    c.jobs = [job]; c._photoRefs = { 7: LINES() };
    ok(c.openProceedsStatement(7), 'the modal opens on the client');
    eq(dom.getElementById('ps-modal').style.display, 'flex', 'shown');
    const listed = dom.getElementById('ps-lines').innerHTML;
    eq((listed.match(/data-sid="([^"]+)"/g) || []).map((s) => s.slice(10, -1)), ['a', 'b', 'c'], 'its sold lines listed to tick, and nothing else');
    has(dom.getElementById('ps-vendor-list').innerHTML, '<option value="Kodner Galleries">', 'the channels on them offered as who it is from');
    // Refused by name, everything missing at once.
    c.saveProceedsStatement();
    has(dom.getElementById('ps-fb').innerHTML, 'To record this statement, enter who it is from, the statement date, the lines it covers, the gross and the net paid. Nothing was saved.', 'an empty form: everything missing, named');
    ok(!job.proceedsStatements, 'and nothing recorded');
    const set = (o) => Object.keys(o).forEach((k) => { dom.getElementById(k).value = o[k]; });
    set({ 'ps-vendor': 'Kodner Galleries', 'ps-date': '2026-10-01', 'ps-gross': '-1250', 'ps-fees': '309.375', 'ps-net': '940.62', 'ps-paidon': '2026-10-02',
          'ps-paidto': 'Estate account ending 4417', 'ps-ref': 'Settlement 2026-118' });
    boxes.push({ checked: true, getAttribute: () => 'a' }, { checked: true, getAttribute: () => 'b' }, { checked: false, getAttribute: () => 'c' });
    eq(c.saveProceedsStatement(), false, 'a negative gross is refused');
    has(dom.getElementById('ps-fb').innerHTML, 'To record this statement, enter the gross. Nothing was saved.', 'by name');
    set({ 'ps-gross': '1250' });
    eq(c.saveProceedsStatement(), true, 'a complete statement is recorded');
    const st = (job.proceedsStatements || [])[0] || {};
    eq([st.vendor, st.statementDate, st.lines, st.gross, st.fees, st.netPaid, st.paidOn, st.paidTo, st.reference],
       ['Kodner Galleries', '2026-10-01', [{ stableId: 'a', itemNo: 1 }, { stableId: 'b', itemNo: 2 }], 1250, 309.38, 940.62, '2026-10-02', 'Estate account ending 4417', 'Settlement 2026-118'],
       'every field, the lines by stableId with their item numbers, the figures to the cent');
    ok(typeof st.id === 'string' && typeof (job.at || {})['proceedsStatements:' + st.id] === 'number', '⚠ through the list writer: given an id and stamped on its own key');
    eq([log.saves, log.syncs], [1, 1], 'saved and synced once, a person\'s edit');
    eq(log.badges.map((b) => [b.m, b.err]), [['Statement recorded — it does not agree with the ledger; the card says where.', true]], '⚠⚠ $12.50 over: said at once');
    // Void.
    c.window.prompt = () => '';
    eq(c.voidProceedsStatement(7, st.id), false, 'no reason: not voided');
    c.window.prompt = () => null;
    eq(c.voidProceedsStatement(7, st.id), false, 'Cancel: not voided');
    ok(!st.voidedAt, 'nothing changed');
    c.window.prompt = () => 'recorded against the wrong sale';
    eq(c.voidProceedsStatement(7, st.id), true, 'with a reason: voided');
    eq([job.proceedsStatements.length, st.voidReason, st.voidedBy], [1, 'recorded against the wrong sale', 'Anthony Graziano'], '⚠ the statement stays on the record, marked void');
  });

  G('E6 · the derived line and the card', () => {
    const c = ledgerRig(ESTATE(), LINES());
    const rows = c._photoRefs[7];
    const pl = (stmts, recs) => c.proceedsLine(ESTATE({ proceedsStatements: stmts, signedRecords: recs || [] }), rows);
    let l = pl([]);
    eq([l.key, l.ok, l.label], ['proceeds_reconciled', false, 'Sale proceeds reconciled'], 'no statements yet: open');
    eq(l.detail, '0 statements; 3 sold lines on no statement — the Proceeds statements card, below the inventory', 'N statements; M sold lines on no statement');
    const filed = [{ id: 'f1', kind: 'statement', ref: 'ps1', stableIds: ['a', 'b'], filedAt: T0 }];
    l = pl([STATEMENT({ gross: 1237.5, netPaid: 928.12 })], filed);
    eq(l.detail, '1 statement, all agree; 1 sold line on no statement — the Proceeds statements card, below the inventory', 'one that agrees, and the consignment still on none');
    const all = rows.map((r) => r.stableId === 'c' ? Object.assign({}, r, { disposition: 'Keep' }) : r);
    l = c.proceedsLine(ESTATE({ proceedsStatements: [STATEMENT({ gross: 1237.5, netPaid: 928.12 })], signedRecords: filed }), all);
    eq([l.ok, l.detail], [true, '1 statement, all agree; 0 sold lines on no statement'], '⚠⚠ every sold line on a statement that agrees, and filed: green');
    l = c.proceedsLine(ESTATE({ proceedsStatements: [STATEMENT({ gross: 1237.5, netPaid: 928.12 })] }), all);
    eq([l.ok, l.detail], [false, '1 statement, all agree; 0 sold lines on no statement; 1 statement not yet filed to Drive — the Proceeds statements card, below the inventory'], 'a statement not filed keeps it open');
    l = c.proceedsLine(ESTATE({ proceedsStatements: [STATEMENT()], signedRecords: filed }), all);
    eq(l.detail.slice(0, 51), '1 statement, 1 disagrees with the ledger; 0 sold li', 'one that disagrees');
    eq(c.proceedsLine(ESTATE(), rows.filter((r) => ['Auction', 'Consign', 'Sell'].indexOf(r.disposition) < 0)), null, 'nothing sold and no statements: no line');
    eq(c.ledgerDerivedLines(7, ESTATE(), 'admin').map((l) => l.key), ['ledger_signed', 'donation_receipt', 'proceeds_reconciled'], 'an estate\'s desk carries all three lines');
    eq(c.ledgerDerivedLines(7, LIVING({ svc: 'downsizing_move' }), 'admin').map((l) => l.key), ['donation_receipt'],
       '⚠ a Home Transition that sells a line is not asked to reconcile statements it has no card to record (jobTakesProceedsStatements)');
    // The card.
    const card = c._renderLedgerCards(ESTATE({ proceedsStatements: [STATEMENT()] }), rows);
    has(card, 'id="inv-proceeds-card"', 'the card is drawn on a disposal job');
    has(card, 'openProceedsStatement(7)', 'with + Record a statement');
    has(text(card), '⚠ Gross: $1,250 on the statement, $1,237.50 on its lines ($12.50 apart)', '⚠⚠ the disagreement, with both figures, on the statement\'s row');
    has(text(card), 'Sold lines on no statement: #3 Tabriz rug.', 'the sold line on no statement');
    has(card, 'voidProceedsStatement(7,\'ps1\')', 'Void, never Remove');
    const spec = c._signedCopySpecs.filter((s) => s && s.kind === 'statement')[0] || {};
    eq([spec.meta && spec.meta.ref, spec.meta && spec.meta.stableIds], ['ps1', ['a', 'b']], 'the statement itself is filed through the control, kind statement, against its lines');
    lacks(c._renderLedgerCards(LIVING({ svc: 'downsizing' }), rows), 'inv-proceeds-card', 'no statements card on a Home Editing job (not a disposal service)');
    has(card, '>File the statement<', 'a statement not yet filed offers its control');
    lacks(c._renderLedgerCards(ESTATE({ proceedsStatements: [STATEMENT()], signedRecords: filed }), rows), '>File the statement<', 'once filed, it is listed instead');
    const gone = c._renderLedgerCards(ESTATE({ proceedsStatements: [Object.assign(STATEMENT(), { voidedAt: T0, voidReason: 'duplicate', voidedBy: 'Anthony Graziano' })] }), rows);
    has(text(gone), 'Voided: Kodner Galleries of Oct 1, 2026 — duplicate (Anthony Graziano)', '⚠ a voided statement stays listed, with its reason');
  });

  // ── The desk ─────────────────────────────────────────────────────────────
  G('The desk: the Disposition Ledger card under the inventory, and out of the More menu', () => {
    const c = ledgerRig(ESTATE(), LINES());
    const html = c._renderLedgerCards(ESTATE({ docState: { dispositionLedger: { filedAt: '2026-10-03T14:00:00.000Z', filedUrl: 'https://drive.google.com/file/d/LEDGER/view', filedHow: 'close' } } }), c._photoRefs[7]);
    has(html, 'id="inv-ledger-card"', 'the ledger card');
    has(html, 'printDispositionLedger(7)', 'Print');
    has(html, 'fileDispositionLedger(7)', 'File to Drive');
    has(html, '>Update the filed copy<', 'which, once filed, updates it');
    has(text(html), 'Filed to Drive Oct 3, 2026, as the job closed · Filed copy', 'when it was filed, and the link');
    has(text(html), '7 of 8 lines on the ledger · Gross $1,237.50 · Fees $309.38 · Net to the estate $928.12', 'the figures, net to whoever holds them');
    const tr = ledgerRig(ESTATE({ matterType: 'trust' }), LINES());
    has(text(tr._renderLedgerCards(tr.jobs[0], tr._photoRefs[7])), 'Net to the trust $928.12', '⚠ the trust\'s, on a trust');
    has(text(html), '1 line has no disposition yet — the sign-off is withheld until every line has one.', 'and the gap that holds the signature');
    has(text(c._renderLedgerCards(ESTATE(), c._photoRefs[7])), 'Not in Drive yet — it is filed when the job closes, or now with File to Drive.', 'not yet filed: said');
    eq(c._renderLedgerCards(ESTATE(), []), '', 'no lines: no cards');
    const bar = noComments(fn('_renderInvWorkbar'));
    lacks(bar, 'printDispositionLedger(', '⚠ the More menu no longer carries the ledger (no control renders twice)');
    has(noComments(fn('renderInventoryTab')), "'<div id=\"inv-records\" data-job=\"' + esc(String(jobId)) + '\">' + _renderLedgerCards(job, all) + '</div>'", 'the cards sit in one host on the desk');
    has(noComments(fn('_invEdit')), '_invRefreshRecords(jobId);', 'a field edited on a row repaints them');
    has(noComments(fn('_invSplitRepaint')), '_invRefreshRecords(jobId);', 'and so does a split');
  });

  // ── E7 ───────────────────────────────────────────────────────────────────
  G('E7 · the Net column is neutral wherever a person reads it; the workbook keeps the name its script resolves', () => {
    const c = sandbox({ vars: ['INVENTORY_COLUMNS'] });
    const net = c.INVENTORY_COLUMNS.filter((x) => x.key === 'net')[0] || {};
    eq(net.header, 'Net Proceeds', '⚠ "Net Proceeds", true on an estate, a trust and a living job');
    eq(net.sheetHeader, 'Net to Estate', 'the workbook\'s wire name, held until saveInventory.gs accepts the neutral one');
    // The real payload and the real CSV.
    const p = lift(['buildInventoryPayload', 'buildInventoryCSV'], ['savePhotoRefs'], { savePhotoRefs() {}, document: domStub({}),
      jobs: [ESTATE()], _photoRefs: { 7: LINES() }, estimateStore: {}, jobPlanStore: {} });
    p.jobs = [ESTATE()]; p._photoRefs = { 7: LINES() };
    const cols = p.buildInventoryPayload(7).columns;
    ok(cols.indexOf('Net to Estate') > 0 && cols.indexOf('Net Proceeds') < 0, 'the payload sends the name the workbook resolves');
    const head = (p.buildInventoryCSV(7).split('\r\n')[0] || '').split(',');
    ok(head.indexOf('Net Proceeds') > 0 && head.indexOf('Net to Estate') < 0, '⚠ the CSV a person opens reads Net Proceeds');
    eq(head.length, cols.length, 'with every column of the payload');
    // And the real workbook writer, against the real payload: the formula lands on the Net column.
    const g = vm.createContext({});
    vm.runInContext(gsFn(INVGS, '_invColLetter') + '\n' + gsFn(INVGS, '_writeInventorySheet'), g);
    const cap = [];
    const sheet = { clear() {}, setFrozenRows() {}, autoResizeColumns() {},
      getRange(r, col) { return { setValues() { return this; }, setFormulas(f) { cap.push(col); return this; }, setNumberFormat() { return this; }, setFontWeight() { return this; }, setBackground() { return this; } }; } };
    g._writeInventorySheet({ getSheetByName: () => sheet, insertSheet: () => sheet }, { columns: cols, rows: [cols.map(() => '')] });
    eq(cap, [cols.indexOf('Net to Estate') + 1], '⚠⚠ the deployed workbook still writes its Net formula on the Net column');
    // The panel reads the header.
    has(noComments(fn('_renderInvPanel')), '+ c.header +', 'the item panel heads the field with `header`');
  });

  // ── One definition each ──────────────────────────────────────────────────
  G('One definition each, and the readers counted', () => {
    const live = noComments(SRC);
    ['printDispositionLedger', 'dispositionLedger', 'fileDispositionLedger', 'ledgerSignedCopies', 'ledgerCloseFlag', 'donationGroups', 'invDonationReceipted',
     'donationReceiptLine', 'proceedsReconciliation', 'proceedsLine', 'snapshotDiff', 'voidInventorySnapshot', 'printSnapshotComparison', 'jobTakesProceedsStatements']
      .forEach((n) => eq((SRC.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1, n + ' is defined once'));
    eq((SRC.match(/\nfunction removeInventorySnapshot\(/g) || []).length, 0, '⚠ there is no removeInventorySnapshot');
    const callers = (name) => Object.keys(BODY).filter((f) => f !== name && new RegExp('\\b' + name + '\\(').test(codeOnly(BODY[f]))).sort();
    eq(callers('ledgerSignedCopies'), ['_renderLedgerCard', 'ledgerCloseFlag', 'ledgerDerivedLines'], 'whether the ledger is signed: one answer, three readers');
    eq(callers('donationReceiptLine'), ['ledgerDerivedLines', 'planDerivedLines'], 'the donation line: built once, read by the Job Plan and the desk');
    eq(callers('ledgerCloseFlag'), ['applyJobTransition'], 'the close question reads the flag');
    eq(callers('fileDispositionLedger'), ['activateOrCycle'], 'the close files the ledger (the desk\'s button is the other caller)');
    eq(callers('ledgerDerivedLines'), ['planDerivedLines'], 'the derived lines are asked for once, by planDerivedLines');
    const saleReaders = Object.keys(BODY).filter((f) => /\bINV_SALE_DISPOSITIONS\b/.test(codeOnly(BODY[f]))).sort();
    eq(saleReaders, ['_renderProceedsCard', 'dispositionLedger', 'invHavellinRecipient', 'openProceedsStatement', 'printDispositionLedger', 'proceedsLine', 'proceedsReconciliation'], 'the sale dispositions: one list (P19 W3\'s staff rule reads it too)');
    eq(count(live, "['Auction', 'Consign', 'Sell']"), 1, 'and no second copy of it written out');
  });
};
