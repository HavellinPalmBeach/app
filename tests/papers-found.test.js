'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PAPERS FOUND IN THE HOUSE (2026-11-06; Anthony approved, off the estate reference and a Florida probate inventory report).
// Exhibit A promised that deeds, titles and financial records go to the representative and counsel against a signed
// receipt, and Found on site recorded only a will or cash. Papers are a third kind: listed one per line, handed to counsel
// (else the representative) against a signed receipt, red on the desk's Urgent strip while Havellin holds them.
// The rig is p19-site-plan's: the real card, dialog, handlers and filer, with the network and the clock stubbed.
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, domStub, source, fn, decl } = require('./harness');

const SRC = source();
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
// Live source of one function: comment lines stripped (a needle must not match the comment that explains it).
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');

const CTX_FNS = ['planTaskCtx', 'planTaskApplies', 'logisticsLineOn', 'jobOnProbateTrack', 'planTasksFor', 'invFiduciaryMode', 'isDecedentJob', 'firearmsFlaggedAtIntake',
  'houseFlagsOf', 'matterTypeOf', 'matterDef', 'docTierOf', 'docTierDef', 'docTierProduces', 'docTierScope', 'docTierScopeMirror',
  'svcHasDocStep', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'docScopeDef'];
const CTX_VARS = ['PLAN_VALUABLES_VENDOR_TYPES', 'PLAN_COI_PTYPES', 'PLAN_TASKS', 'JOB_ADMIN_TASKS', 'DECEDENT_SERVICES', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
  'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC', 'DOC_SCOPES'];
// planDerivedLines and what it reads, as job-desk-scope lifts it, plus the P19 answers it now asks.
const DERIVED_FNS = ['invPrimaryDoc', 'invDocContractBlock', 'probatePackageDocs', 'estatePackageRoute', 'estateDeliveryLine', 'proceedsReceivedLine', 'derivedLinesHtml', 'logisticsLineOn', 'planTaskApplies', 'planDerivedLines', 'prepVendorsConfirmed', 'planDerivedHtml', 'planTaskCtx', 'jobOnProbateTrack', 'invFiduciaryMode', 'isDecedentJob', '_planRooms',
  'roomStatusNormalize', 'firearmsFlaggedAtIntake', 'houseFlagsOf', '_jobInvRefs', '_srcLineKey', 'matterTypeOf', 'matterDef', 'docTierOf',
  'docTierDef', 'docTierProduces', 'svcHasDocStep', 'estimateIsFeeOnly', 'estDeclutterHrs', 'jobIsFeeOnly', 'coAcceptedHours', 'coHoursTotal',
  'coHours', 'jobAppraisalDuty', 'approvedEstimateFor', 'appraisalDuty', 'estimateDocScope', 'estimateAppraiserLines', 'docScopeDef',
  'jobPrepLines', 'coPrepVendorLines', 'coVendorAdds', 'roundCents', 'fmtHrs', 'fmt', '_hrsTxt',
  'estateAuthority', 'estateTaxReturn', '_ymdLocal', 'fmtDate2', 'esc', 'escLines', 'jobListEntries', 'jobFiduciaries', 'signedRecordsOf',
  'siteFindLines', 'siteFindsOf', 'siteFindPaperItems', 'siteFindToCounsel', 'siteFindDefaultHolder', 'willDepositDue',
  'donationReceiptLine', 'ledgerDerivedLines', 'ledgerSignedCopies', 'ledgerSignState', 'signedCopySignState', 'signedByNames', 'ledgerSigners', 'fiduciaryCapacity', 'ledgerSignerRole', '_agrApprover', 'jobTakesProceedsStatements', 'proceedsLine'];
const DERIVED_VARS = ['FIDUCIARY_PR_ROLE_RE', 'FIDUCIARY_TRUSTEE_ROLE_RE', 'PROBATE_PKG_TITLES', 'INV_CONTRACT_DOCS', 'ESTATE_PKG_ROUTES', 'PLAN_COI_PTYPES', 'PLAN_COI_ACCESS_RE', 'PLAN_VALUABLES_VENDOR_TYPES', 'DECEDENT_SERVICES', 'jobPlanStore', 'TC_DONE_STATUSES', 'PS_DONE_STATUSES', 'ROOM_STATUS_META', 'ROOM_STATUS_LEGACY',
  'INV_RELEASE_DISPOSITIONS', 'FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'changeOrders', 'MATTER_TYPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE',
  'JOB_STEPS', 'DOC_SCOPES', 'ESTATE_AUTHORITIES', 'SITE_FIND_KINDS', 'WILL_DEPOSIT_DAYS', 'LEDGER_SIGNED_REF', 'INV_SALE_DISPOSITIONS'];
const DERIVED_STUBS = () => ({ isFormalDoc: () => false, docSentAt: () => null, jobLogEntries: () => [], stagePaidTotal: () => 0,
  isAgreementSigned: () => false, isJobFunded: () => false, depositPaidTotal: () => 0, _photoRefs: { 7: [], 41: [] },
  estimateStore: { 7: { estimate: { rooms: [{ idx: 0, name: 'Kitchen' }] } } } });
// The Found on site card and its dialog, the foundation's list writers and the signed-copy path, on top.
const FIND_FNS = ['_invDocPartyHead', 'siteFindsCardHtml', '_siteFindRowHtml', '_repaintSiteFinds', 'openSiteFind', 'closeSiteFind', 'saveSiteFind', 'voidSiteFind',
  'siteFindRefusal', 'siteFindHandFlag', 'siteFindHolderFlag', 'siteFindPresentFlag', 'siteFindPresentNames', 'siteFindDay', '_siteFindTeamNames', '_siteFindHolderNames',
  'willReceiptHtml', 'cashReceiptHtml', 'papersReceiptHtml', 'printSiteFindReceipt', '_siteFindFormRow', '_siteFindSigLine', '_invDocHead', '_invDocName',
  'jobListPut', 'jobListGet', 'jobListVoid', 'newJobListId', '_saveJobEdit', '_jobTouch', '_actor', '_invStampBy', 'deviceUser', 'samePerson', 'canonPersonName',
  'isCrewPlaceholder', '_andJoin', 'showFB', 'fileSignedCopy', '_armFiling', '_signedCopyName', '_jobRootFolderId', 'signedCopyControlHtml',
  'fileSignedCopyFromInput', 'signedRecordLinksHtml', 'estateValueDateLabel', 'deskNowLine'];
const FIND_VARS = ['JOB_RECORD_LISTS', 'SIGNED_RECORD_KINDS', 'SIGNED_COPY_MAX_BYTES', '_signedFiling', 'FILING_WATCHDOG_MS', 'SIGNED_RECORDS_SUBFOLDER',
  '_signedCopySpecs', '_signedCopyKeys', 'PERSON_NAME_ALIASES', 'CONTRACTOR_TC_NAME', 'LOG_PLACEHOLDER_NAMES', '_SITE_FIND_BLANK',
  'WILL_RECEIPT_STATEMENT', 'CASH_RECEIPT_STATEMENT', 'PAPERS_RECEIPT_STATEMENT', 'DESK_NOW_KEY_RE'];


module.exports = function ({ group, ok, eq, has, lacks }) {
  function rig(o) {
    o = o || {};
    const dom = domStub({});
    const log = { saves: 0, syncs: 0, badges: [], uploads: [], prompts: [], printed: null };
    const S = sandbox({
      fns: DERIVED_FNS.concat(FIND_FNS), vars: DERIVED_VARS.concat(FIND_VARS),
      stubs: Object.assign(DERIVED_STUBS(), {
        document: dom, setTimeout: () => 0, clearTimeout() {},
        _todayStr: () => o.today || '2026-10-03',
        saveJobs: () => { log.saves++; }, syncJobToSheets: () => { log.syncs++; },
        showSyncBadge: (m, err) => { log.badges.push({ m: m, err: !!err }); },
        resolveValBasis: () => 'Fair Market Value', estateValueDate: () => '',
        _printDocument: (html, title) => { log.printed = { html: html, title: title }; return true; },
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P19/exec',
        resolveSubfolderId: (j, name, cb) => cb('SUBSIGNED'),
        uploadToDrive: (folderId, filename, dataUrl, cb) => { log.uploads.push({ folderId, filename }); cb(true, 'https://drive.google.com/file/d/F' + log.uploads.length + '/view', 'F' + log.uploads.length); },
        FileReader: function () { const self = this; self.readAsDataURL = function (f) { self.result = 'data:' + f.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
      }),
    });
    S.window.prompt = (msg) => { log.prompts.push(msg); return o.prompt === undefined ? '' : o.prompt; };
    const job = Object.assign({ id: 41, hvlId: 'HVL-2610-ADLR', name: 'Estate of Harold Adler', svc: 'cleanout', matterType: 'trust',
      executor: 'Ruth Adler', executorRole: 'Trustee', executorEmail: 'ruth@example.com', probateAttyName: 'Richard Comiter',
      tc: 'Ashley Jerome', addr: '100 Ocean Blvd', city: 'Palm Beach', driveFolder: 'https://drive.google.com/drive/folders/ROOT41',
      crew: { tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Anthony Graziano Jr' }, { name: 'Contractor TBD' }] } }, o.job || {});
    S.jobs = [job];
    S.estimateStore[41] = { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Study' }] }, approved: true };
    const val = (id) => dom.getElementById(id).value;
    const set = (id, v) => { dom.getElementById(id).value = v; };
    const fb = () => dom.getElementById('fos-fb').innerHTML;
    const lines = (phase, today) => S.planDerivedLines(41, S.jobs[0], S.estimateStore[41].estimate, phase || 'finds', today || o.today || '2026-10-03');
    const card = () => S.siteFindsCardHtml(41, S.jobs[0], S.estimateStore[41].estimate);
    return { S, dom, log, job, val, set, fb, lines, card };
  }

  group('PF1 — the card offers papers, and the dialog shows the papers fields');
  inEastern(() => {
    const r = rig();
    const c = r.card();
    has(c, "openSiteFind(41,'papers')\">Record papers found", 'the card offers Record papers found');
    // RESTATED (2026-11-07): a safe is the fourth kind on the card.
    has(c, 'an original will, cash, the estate&rsquo;s papers, or a safe', 'its heading names papers');
    has(c, '<strong>Papers:</strong>', 'and its note says what papers are and what happens to them');
    eq(r.S.openSiteFind(41, 'papers'), true, 'Record papers found opens the dialog');
    eq([r.dom.getElementById('fos-sec-papers').style.display, r.dom.getElementById('fos-sec-will').style.display, r.dom.getElementById('fos-sec-cash').style.display],
       ['', 'none', 'none'], 'the papers fields shown, the will and cash fields hidden');
    eq(r.dom.getElementById('fos-title').textContent, 'Record papers found', 'titled for the act');
    eq(r.dom.getElementById('fos-date-lbl').textContent, 'Found on', 'dated as found');
    eq(r.val('fos-handed-to'), 'Richard Comiter', '⚠ handed to counsel by default, as a will is');
    has(r.dom.getElementById('fos-holders').innerHTML, 'value="Richard Comiter"', 'counsel offered among the holders');
    has(r.dom.getElementById('fos-summary').innerHTML, 'Never copy them or use a password, key or device among them', 'the dialog states the rule');
  });

  group('PF2 — refused only without the day, the finder or the list; one per line; red while held');
  inEastern(() => {
    const r = rig();
    r.S.openSiteFind(41, 'papers');
    r.set('fos-date', ''); r.set('fos-papers', '  \n ');
    eq(r.S.saveSiteFind(), false, 'nothing filled in is refused');
    has(r.fb(), 'Enter the day they were found, who found them and what was found, one per line.', 'naming all three at once');
    ok(!r.job.siteFinds || r.job.siteFinds.length === 0, 'and writes nothing');
    r.set('fos-date', '2026-10-03'); r.set('fos-where', 'study, filing cabinet'); r.set('fos-p-found-by', 'Anthony Graziano Jr');
    r.set('fos-papers', 'Deed to 100 Ocean Blvd\n\n  Chase statements, 2025 <b>box</b>  \nLedger Nano hardware wallet');
    eq(r.S.saveSiteFind(), true, 'recorded');
    const f = r.job.siteFinds[0];
    eq([f.kind, f.foundOn, f.where, f.foundBy], ['papers', '2026-10-03', 'study, filing cabinet', 'Anthony Graziano Jr'], 'as typed');
    eq(f.items, 'Deed to 100 Ocean Blvd\nChase statements, 2025 <b>box</b>\nLedger Nano hardware wallet', 'one per line, blanks dropped, trimmed');
    ok(!('handedOn' in f), 'the prefilled holder alone is not a hand-over');
    const L = r.lines('finds', '2026-10-03').filter((l) => /^papers_/.test(l.key));
    eq(L.map((l) => [l.key.replace(/_[^_]+$/, ''), l.ok, !!l.red]), [['papers_held', false, true]], '⚠ red while Havellin holds them');
    has(L[0].detail, '3 papers and items found Oct 3, 2026 in study, filing cabinet', 'counting what was listed');
    has(L[0].detail, 'hand them to Richard Comiter today, against a signed receipt', 'and saying to whom');
    has(r.card(), 'Chase statements, 2025 &lt;b&gt;box&lt;/b&gt;', 'the card lists each, escaped');
    eq(r.S.deskNowLine(L[0], r.job), 'strip', '⚠ on the desk\'s Urgent strip while held');
  });

  group('PF3 — the hand-over, the flag, the receipt form and the signed copy');
  inEastern(() => {
    const r = rig({ today: '2026-10-04' });
    r.S.openSiteFind(41, 'papers');
    r.set('fos-date', '2026-10-03'); r.set('fos-p-found-by', 'Ashley Jerome'); r.set('fos-papers', 'Title, 2019 Lexus');
    r.S.saveSiteFind();
    const id = r.job.siteFinds[0].id;
    eq(r.S.openSiteFind(41, 'papers', 'handover', id), true, 'Record the hand-over opens');
    r.set('fos-handed-to', 'Richard Comiter'); r.set('fos-handed-on', '2026-10-04');
    eq(r.S.saveSiteFind(), true, 'recorded');
    const f = r.job.siteFinds[0];
    eq(r.S.siteFindHandFlag(f), 'handed over Oct 4, 2026, not the day it was found (Oct 3, 2026)', 'another day is flagged, never refused');
    const L = r.lines('finds', '2026-10-04').filter((l) => /^papers_/.test(l.key));
    eq(L.map((l) => [l.key.replace(/_[^_]+$/, ''), l.ok]), [['papers_receipt', false]], 'then open until the signed receipt is filed');
    eq(r.S.deskNowLine(L[0], r.job), 'strip', 'still on the strip until the receipt is filed');
    eq(r.S.printSiteFindReceipt(41, id), true, 'Print Receipt for Papers Found');
    has(r.log.printed.html, 'Receipt for Papers Found', 'the papers form');
    has(r.log.printed.html, '1. Title, 2019 Lexus', 'numbering what was found');
    has(r.log.printed.html, 'has not used any password, key or device among them', 'with its statement');
    has(r.log.printed.html, 'Received by: __', 'and a signature line for the holder');
    has(r.card(), 'File signed receipt', 'the card offers the signed copy once handed over');
    eq(r.S.SIGNED_RECORD_KINDS.papers.label, 'Signed receipt for papers found', 'filed under its own kind');
    r.job.signedRecords = [{ id: 's1', kind: 'papers', ref: String(id), url: 'https://drive.google.com/file/d/X/view', at: 1 }];
    const L2 = r.lines('finds', '2026-10-04').filter((l) => /^papers_/.test(l.key));
    eq(L2.map((l) => l.ok), [true], 'green once the receipt is filed');
    eq(r.S.deskNowLine(L2[0], r.job), 'admin', 'and off the strip');
  });

  group('PF4 — estates only, and a void stays on the record');
  inEastern(() => {
    const r = rig({ job: { svc: 'downsizing', matterType: '' } });
    eq(r.S.openSiteFind(41, 'papers'), false, 'a living client has no Found on site');
    const r2 = rig({ prompt: 'recorded twice' });
    r2.S.openSiteFind(41, 'papers'); r2.set('fos-date', '2026-10-03'); r2.set('fos-p-found-by', 'Ashley Jerome'); r2.set('fos-papers', 'Savings bonds');
    r2.S.saveSiteFind();
    eq(r2.S.voidSiteFind(41, r2.job.siteFinds[0].id), true, 'voided with a reason');
    has(r2.card(), '<s>Papers found Oct 3, 2026</s>', 'listed struck through, never removed');
    eq(r2.lines('finds', '2026-10-03').filter((l) => /^papers_/.test(l.key)).length, 0, 'and asks nothing more');
  });
};
