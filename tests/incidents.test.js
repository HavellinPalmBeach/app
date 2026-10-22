'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P26 · INCIDENT REPORTING (2026-10-16). Anthony: capture anything that goes wrong or needs attention on a job, the same
// day, with enough detail to support an insurance or bond claim and to answer a client, attorney or trustee
// (INCIDENT_REPORTING_SPEC.md; Q64 to Q71 in the tracker).
//   · Seven kinds; who, when, where, what, who was present, photographs; a report written once, every later act a new entry;
//     status derived from the entries; void with a reason, never a removal.
//   · Q64: an injury, a missing item or a vulnerable adult concern reads red (Call Anthony immediately, his number) until the
//     call is confirmed; a report Anthony records himself carries the entry at once; the app sends nothing.
//   · Q66: a vulnerable adult concern is internal: off the client's Incident Record, out of the package.
//   · Q68: no close with an open incident (jobCloseBlockers, the handler); Deposit Retained refused too; Lost flagged.
//   · The Incident Record filed at close through the one close-out path, on a prep job too, without reading the manifest; in
//     the estate package where the job has one.
// Driven through the real dialog handlers, the real derived lines, the real close gate and the real filer; the network, the
// reader, the store saves and the print dialog are stubbed by name. Dates run in Eastern; today is always an argument or a stub.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { sandbox, domStub, source, fn } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');

// What the incidents block reads, with the foundation's list writers under it.
const INC_FNS = ['incidentReportsOf', 'incidentUpdatesOf', 'incidentNo', 'incidentStatus', 'openIncidents', 'incidentResolution', 'incidentHasAct',
  'incidentAlertOwed', 'incidentHotlineCalled', 'incidentDayPlus', '_incTime', '_incWhen', '_incStampTxt', 'incidentRefusal', 'incidentLines',
  '_incidentPeople', '_incidentPlaces', '_incidentRowHtml', '_incHowWord', 'incidentsCardHtml', 'incidentBannerState', 'incidentHeaderHtml', 'goToIncidents', '_repaintIncidents',
  'openIncident', 'incPickKind', 'closeIncident', 'saveIncident', 'incidentRecordCall', 'voidIncident',
  'incidentPhotoControlHtml', 'incidentPhotosFromInput', '_incidentPhotoName', 'incidentUploadPhotos', '_incidentWritePhotos',
  'incidentRecordHtml', 'printIncidentRecord', 'fileIncidentRecord', '_fileCloseoutPaper', '_cpWhere', 'docState', '_invJob', '_invDocDriveName', '_invDocName',
  'derivedLinesHtml', '_invDocHead', '_invDocPartyHead', 'guideLinkHtml',
  'jobListEntries', 'jobListGet', 'jobListPut', 'jobListVoid', 'newJobListId', '_saveJobEdit', '_jobTouch', '_actor', '_invStampBy', 'deviceUser', 'samePerson', 'canonPersonName',
  'isCrewPlaceholder', '_andJoin', 'showFB', '_armFiling', '_jobRootFolderId', '_siteFindTeamNames', '_planRooms', 'invFiduciaryMode', 'isDecedentJob', 'jobFiduciaries',
  'jobCloseBlockers', 'moneyToNumber', 'escLines', 'esc', 'fmt', 'fmtDate2', '_ymdLocal', 'roundCents',
  'probatePackageDocs', 'probatePackagePage'];
const INC_VARS = ['INCIDENT_KINDS', 'INCIDENT_KIND_ORDER', 'INCIDENT_ACTS', 'INCIDENT_ALERT_TO', 'INCIDENT_CARRIER_FLOOR', 'INCIDENT_HOTLINE', 'INCIDENT_SUBFOLDER',
  'INCIDENT_DOC_KEY', 'INCIDENT_GUIDE_DOC', 'INCIDENT_RECORD_TITLE', 'INCIDENT_INTERNAL_TITLE', 'INCIDENT_PHOTO_MAX_PX', 'INCIDENT_PHOTO_QUALITY', '_incidentPhotoFlight', '_incidentFiling',
  '_incidentPhotoSpecs', '_incidentPhotoKeys', 'CLOSEOUT_PAPERS', 'PHOTO_SUBFOLDER', 'JOB_RECORD_LISTS', 'FILING_WATCHDOG_MS', 'PERSON_NAME_ALIASES', 'CONTRACTOR_TC_NAME',
  'LOG_PLACEHOLDER_NAMES', 'DECEDENT_SERVICES', 'PROBATE_PKG_TITLES', 'DEFAULT_CONTRACTORS', '_ledgerFiling', '_contentsFiling', 'LEDGER_DOC_KEY', 'CONTENTS_DOC_KEY'];

function rig(o) {
  o = o || {};
  const dom = domStub({});
  const log = { saves: 0, syncs: 0, badges: [], uploads: [], htmlUploads: [], prompts: [], printed: null, manifestReads: 0, notices: [], navs: [] };
  const S = sandbox({
    fns: INC_FNS, vars: INC_VARS,
    stubs: {
      document: dom, setTimeout: () => 0, clearTimeout() {},
      _todayStr: () => o.today || '2026-10-16',
      saveJobs: () => { log.saves++; }, syncJobToSheets: () => { log.syncs++; },
      showSyncBadge: (m, err) => { log.badges.push({ m: String(m), err: !!err }); },
      _docNotice: (type, msg) => { log.notices.push({ type, msg: String(msg) }); },
      resolveValBasis: () => 'Fair Market Value', estateValueDate: () => '', jobOnProbateTrack: () => false, jobProbateCourt: () => '',
      docPartyIdent: (job) => ({ value: job.name, estate: false }),
      SHEETS_SYNC_URL: o.noUrl ? '' : 'https://script.google.com/macros/s/P26/exec',
      resolveSubfolderId: (j, name, cb) => { log.folderAsked = name; cb(o.noSubfolder ? null : 'SUB-' + name.replace(/\s/g, '')); },
      uploadToDrive: (folderId, filename, dataUrl, cb) => {
        log.uploads.push({ folderId, filename, dataUrl });
        if (o.failUploads && /-2\.jpg$/.test(filename)) return cb(false);
        cb(true, 'https://drive.google.com/file/d/F' + log.uploads.length + '/view', 'F' + log.uploads.length);
      },
      uploadHtmlToDrive: (folderId, name, html, cb) => { log.htmlUploads.push({ folderId, name, html }); cb(true, 'https://drive.google.com/file/d/H1/view', { fileId: 'H1' }); },
      _exportDoc: (title, inner) => '<html><title>' + title + '</title>' + inner + '</html>',
      compressImage: (d, w, q, cb) => { log.compressed = (log.compressed || 0) + 1; cb('shrunk:' + d); },
      FileReader: function () { const self = this; self.readAsDataURL = function (f) { self.result = 'data:' + f.type + ';base64,QUJD'; if (self.onload) self.onload(); }; },
      _invEnsureLoaded() { log.manifestReads++; }, refreshPhotoRefs: (jobId, cb) => { log.manifestReads++; cb(); }, _invCloudSeen: {}, _jobInvRefs: () => [],
      _ledgerCardRepaint() {}, _repaintSiteFinds() {},
      openJobPlanFor: (id) => { log.navs.push(id); return true; },
      _assignedVendorsForJob: () => [{ vendorId: 3, name: 'Palm Beach Movers' }],
      unratedVendorsForJob: () => [],
      invDocContractBlock: () => false, invPrimaryDoc: () => 'schedule', matterDef: () => ({ trust: false }),
      printCourtInventory: () => ({ why: 'x' }), printTrustSchedule: () => ({ why: 'x' }), printEstateInventoryReport: () => ({ html: '<p>schedule</p>', title: 'S' }),
      printContentsList: () => ({ why: 'x' }), printDispositionLedger: () => ({ html: '<p>ledger</p>', title: 'L' }), printAppraisalWorklist: () => ({ html: '<p>w</p>', title: 'W' }),
      estimateStore: {},
    },
  });
  S.window.prompt = (msg) => { log.prompts.push(msg); return o.prompt === undefined ? 'recorded twice' : o.prompt; };
  const job = Object.assign({ id: 41, hvlId: 'HVL-2611-HALL', name: 'Margaret Halloran', svc: 'downsizing_move', status: 'active', tc: 'Ashley Jerome',
    addr: '200 Seaview Ave', city: 'Palm Beach', driveFolder: 'https://drive.google.com/drive/folders/ROOT41', activatedOn: '2026-11-02',
    crew: { tc: { name: 'Ashley Jerome' }, ps: [{ name: 'Anthony Graziano Jr' }, { name: 'Contractor TBD' }] } }, o.job || {});
  S.jobs = [job];
  S.estimateStore[41] = { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Study' }, { idx: 1, name: 'Primary Bedroom' }] }, approved: true };
  if (o.device !== undefined) S.localStorage.setItem('hav_device_user', o.device); else S.localStorage.setItem('hav_device_user', 'Ashley Jerome');
  const val = (id) => dom.getElementById(id).value;
  const set = (id, v) => { dom.getElementById(id).value = v; };
  const fb = () => dom.getElementById('inc-fb').innerHTML;
  const est = () => S.estimateStore[41].estimate;
  // A good damage report, through the real dialog.
  const report = (kind, over) => {
    over = over || {};
    S.openIncident(41, 'report');
    S.incPickKind(kind);
    set('inc-date', over.day || o.today || '2026-10-16'); set('inc-time', over.time === undefined ? '14:35' : over.time);
    set('inc-where', over.where === undefined ? 'Study' : over.where);
    set('inc-what', over.what === undefined ? 'The crystal decanter slipped off the tray while it was being wrapped and shattered on the floor.' : over.what);
    set('inc-present', over.present === undefined ? 'Ashley Jerome; Anthony Graziano Jr' : over.present);
    set('inc-reported-by', over.by === undefined ? 'Ashley Jerome' : over.by);
    set('inc-f1', over.f1 === undefined ? 'Waterford decanter, item 14' : over.f1);
    if (over.f2 !== undefined) set('inc-f2', over.f2);
    if (over.yn !== undefined) set('inc-yn', over.yn);
    if (over.money !== undefined) set('inc-money', over.money);
    return S.saveIncident();
  };
  const update = (id, act, over) => {
    over = over || {};
    const opened = S.openIncident(41, 'update', id, act);
    if (!opened) return false;
    if (over.note !== undefined) set('inc-note', over.note);
    if (over.on !== undefined) set('inc-on', over.on);
    if (over.how !== undefined) set('inc-how', over.how);
    return S.saveIncident();
  };
  const reports = (opt) => S.incidentReportsOf(S.jobs[0], opt);
  return { S, dom, log, job, val, set, fb, est, report, update, reports };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ── 1 ──────────────────────────────────────────────────────────────
  group('P26 — the catalogue: seven kinds, three that alert, one internal; one Managing Member; the literals held to their constants');
  {
    const S = sandbox({ vars: INC_VARS, fns: ['incidentReportsOf', 'printIncidentRecord', 'jobListEntries'] });
    eq(S.INCIDENT_KIND_ORDER.slice().sort(), ['complaint', 'damage', 'hazard', 'injury', 'missing', 'valuable', 'vulnerable'], 'the seven kinds Anthony asked for');
    eq(Object.keys(S.INCIDENT_KINDS).sort(), S.INCIDENT_KIND_ORDER.slice().sort(), 'and the order names each once');
    eq(S.INCIDENT_KIND_ORDER.filter((k) => S.INCIDENT_KINDS[k].alert).sort(), ['injury', 'missing', 'vulnerable'], 'injury, missing item and vulnerable adult concern alert');
    eq(S.INCIDENT_KIND_ORDER.filter((k) => S.INCIDENT_KINDS[k].internal), ['vulnerable'], 'Q66: the vulnerable adult concern alone is internal');
    S.INCIDENT_KIND_ORDER.forEach((k) => ok(!!S.INCIDENT_KINDS[k].f1 && !!S.INCIDENT_KINDS[k].label, k + ' has a label and its one required fact'));
    const anthony = S.DEFAULT_CONTRACTORS.find((c) => c.name === 'Anthony Graziano');
    eq(S.INCIDENT_ALERT_TO.phone, anthony.phone, '⚠ the banner\'s number is the one the roster records for Anthony');
    eq(S.INCIDENT_ALERT_TO.tel, 'tel:+1' + anthony.phone.replace(/\D/g, ''), 'and the tap-to-call link is the same number');
    eq(S.INCIDENT_CARRIER_FLOOR, 500, 'the carrier floor is §6.3\'s $500');
    has(fn('probateAgreementHtml'), 'Engage insurance carrier if damage exceeds $500', 'which the estate form prints');
    // The close-out catalogue is evaluated before the constants are assigned, so it carries literals: held equal here.
    const C = S.CLOSEOUT_PAPERS.incidents;
    eq(C.key, S.INCIDENT_DOC_KEY, 'CLOSEOUT_PAPERS.incidents.key is INCIDENT_DOC_KEY');
    eq(C.name, S.INCIDENT_RECORD_TITLE, '…its name the record\'s title');
    eq(C.title, S.INCIDENT_RECORD_TITLE, '…its title too');
    eq(C.folder, S.INCIDENT_SUBFOLDER, '…its folder the Incident Reports subfolder');
    ok(C.jobOnly === true && C.noInventory === true, '…read off the job alone, never the manifest');
    eq(S.PROBATE_PKG_TITLES.incidents, S.INCIDENT_RECORD_TITLE, 'the package names it by the same title');
    eq(S.JOB_RECORD_LISTS.indexOf('incidents') >= 0, true, 'incidents is a job record list');
    // The backend merges it entry by entry on its id, and the deployment the app relies on is this one.
    const gsLists = /var JOB_KEYED_LISTS = \[([\s\S]*?)\];/.exec(GS)[1];
    has(gsLists, "'incidents'", 'main-sync.gs merges incidents entry by entry (JOB_KEYED_LISTS)');
    has(/var JOB_LIST_KEY = \{([\s\S]*?)\};/.exec(GS)[1], "incidents: 'id'", '…keyed on id');
    const bv = /var BACKEND_VERSION = '([^']+)'/.exec(GS)[1];
    const mv = /var BACKEND_MIN_VERSION = '([^']+)'/.exec(SRC)[1];
    ok(mv >= '2026-10-16', 'the app relies on the 2026-10-16 deployment or a later one (' + mv + ')');
    ok(bv >= mv, 'and the backend in the repo is at least that (' + bv + ')');
    has(/version:\s+'([^']+)'/.exec(SRC)[1], 'on a deployment older than 2026-10-16, an incident reported on one device', 'the stale banner names the gap by its vintage (beside the same day\'s key custody gap; 2026-10-19\'s inventory reset leads now)');
  }

  // ── 2 ──────────────────────────────────────────────────────────────
  group('P26 — the dialog: today, the device\'s user, the kind\'s fields; every missing piece named at once and nothing written');
  inEastern(() => {
    const r = rig();
    eq(r.S.openIncident(41, 'report'), true, 'Report an incident opens the dialog');
    eq(r.dom.getElementById('inc-modal').style.display, 'flex', 'on screen');
    eq(r.val('inc-date'), '2026-10-16', 'the day: today by default');
    eq(r.val('inc-reported-by'), 'Ashley Jerome', 'reported by: the device\'s user');
    has(r.dom.getElementById('inc-kinds').innerHTML, 'incPickKind(\'injury\')', 'the seven kinds as chips');
    eq(r.dom.getElementById('inc-fields').style.display, 'none', 'the fields wait for a kind');
    has(r.dom.getElementById('inc-rooms').innerHTML, 'value="Primary Bedroom"', 'the plan\'s rooms are offered as the place');
    has(r.dom.getElementById('inc-rooms').innerHTML, 'value="New home"', '…and the new home on a Home Transition');
    has(r.dom.getElementById('inc-people').innerHTML, 'value="Palm Beach Movers"', 'the vendors on the job are offered as present');
    has(r.dom.getElementById('inc-people').innerHTML, 'value="Margaret Halloran"', '…and the client');
    lacks(r.dom.getElementById('inc-people').innerHTML, 'Contractor TBD', 'never a placeholder');
    r.S.incPickKind('damage');
    eq(r.val('inc-kind'), 'damage', 'the kind is picked');
    eq([r.dom.getElementById('inc-fields').style.display, r.dom.getElementById('inc-money-wrap').style.display, r.dom.getElementById('inc-f2-wrap').style.display, r.dom.getElementById('inc-yn-wrap').style.display],
       ['', '', 'none', 'none'], 'damage asks the item and an estimated value, nothing else of its own');
    eq(r.dom.getElementById('inc-f1-lbl').textContent, 'The item (its inventory number where it has one)', 'labelled for the kind');
    r.S.incPickKind('injury');
    eq([r.dom.getElementById('inc-yn-wrap').style.display, r.dom.getElementById('inc-money-wrap').style.display], ['', 'none'], 'injury asks whether medical help was called');
    has(r.dom.getElementById('inc-kind-note').innerHTML, '(617) 650-6588', 'and says to call Anthony at once');
    r.S.incPickKind('vulnerable');
    has(r.dom.getElementById('inc-kind-note').innerHTML, '1-800-962-2873', 'the vulnerable adult concern states the hotline');
    has(r.dom.getElementById('inc-kind-note').innerHTML, '415.1034', '…and the statute');
    has(r.dom.getElementById('inc-kind-note').innerHTML, 'never goes on the record the client', '…and that it is internal');

    // Nothing filled in: every piece named at once, nothing written.
    r.S.incPickKind('damage');
    r.set('inc-date', '');
    eq(r.S.saveIncident(), false, 'an empty report is refused');
    has(r.fb(), 'Enter the day it happened, where it happened, what happened and the item.', 'every missing piece named at once (reported by is the device\'s user already)');
    r.set('inc-reported-by', '');
    eq(r.S.saveIncident(), false, 'and with that cleared too');
    has(r.fb(), 'who reported it and the item.', '…who reported it is named');
    eq(r.reports({ withVoided: true }).length, 0, 'and nothing was written');
    eq(r.log.saves, 0, 'no store save');
    // A day after today.
    eq(r.report('damage', { day: '2026-10-17' }), false, 'a day after today is refused');
    has(r.fb(), 'after today', '…by name');
    eq(r.reports({ withVoided: true }).length, 0, 'still nothing written');
    // No kind.
    r.S.openIncident(41, 'report'); r.set('inc-what', 'x');
    eq(r.S.saveIncident(), false, 'no kind: refused');
    has(r.fb(), 'Choose what kind of incident this is.', '…by name');
  });

  // ── 3 ──────────────────────────────────────────────────────────────
  group('P26 — a report is written once; a note, the resolution and a reopening are new entries; the report itself never changes');
  inEastern(() => {
    const r = rig();
    eq(r.report('damage', { money: '$1,250' }), true, 'a damage report records');
    const reps = r.reports();
    eq(reps.length, 1, 'one report');
    const rep = reps[0];
    eq([rep.entry, rep.kind, rep.occurredOn, rep.occurredTime, rep.where, rep.reportedBy, rep.recordedBy, rep.f1, rep.estValue, rep.present],
       ['report', 'damage', '2026-10-16', '14:35', 'Study', 'Ashley Jerome', 'Ashley Jerome', 'Waterford decanter, item 14', 1250, 'Ashley Jerome; Anthony Graziano Jr'],
       'who, when, where, what, who was present, the item and its value, and who recorded it');
    ok(!!rep.id && rep.recordedAt > 0, 'with its own id and stamp');
    eq(r.S.incidentNo(r.job, rep.id), 1, 'Incident 1');
    eq(r.S.incidentStatus(r.job, rep.id), 'open', 'open');
    eq(r.S.openIncidents(r.job).length, 1, 'one open incident');
    eq(r.log.saves, 1, 'one stamped save');
    eq(r.log.syncs, 1, '…and one sync: a person\'s edit');
    ok(!!r.job.at && !!r.job.at['incidents:' + rep.id], 'stamped on its own key, so the sheet merges it entry by entry');
    eq(r.S.incidentAlertOwed(r.job, rep), false, 'property damage owes no call');
    eq(r.log.badges[r.log.badges.length - 1].err, false, 'the badge is plain');
    const snapshot = JSON.stringify(rep);

    // A note.
    eq(r.update(rep.id, 'note'), false, 'a note with nothing in it is refused');
    has(r.fb(), 'Enter the note.', '…by name');
    eq(r.update(rep.id, 'note', { note: 'Pieces bagged and left on the study desk; nothing moved.' }), true, 'a note records');
    eq(r.S.incidentUpdatesOf(r.job, rep.id).map((u) => u.act), ['note'], 'as a new entry');
    eq(JSON.stringify(r.S.jobListGet(r.job, 'incidents', rep.id)), snapshot, '⚠ the report itself is byte for byte as written');

    // The resolution needs its note.
    eq(r.update(rep.id, 'resolved'), false, 'resolving without a note is refused');
    has(r.fb(), 'the resolution note: what was done and how it ended', '…by name');
    eq(r.S.incidentStatus(r.job, rep.id), 'open', 'still open');
    eq(r.update(rep.id, 'resolved', { note: 'Client told the same afternoon; she declined a claim and kept the pieces.' }), true, 'resolved with a note');
    eq(r.S.incidentStatus(r.job, rep.id), 'resolved', 'resolved');
    eq(r.S.openIncidents(r.job).length, 0, 'nothing open');
    eq(r.S.incidentResolution(r.job, rep.id).note, 'Client told the same afternoon; she declined a claim and kept the pieces.', 'the resolution reads back');
    eq(r.update(rep.id, 'resolved', { note: 'again' }), false, 'resolving a resolved incident is refused');
    has(r.fb(), 'already resolved', '…by name');
    eq(r.update(rep.id, 'reopened', { note: 'The client\'s daughter is asking about a claim after all.' }), true, 'reopened, with why');
    eq(r.S.incidentStatus(r.job, rep.id), 'open', 'open again');
    eq(r.update(rep.id, 'reopened', { note: 'x' }), false, 'reopening an open incident is refused');
    eq(r.S.incidentUpdatesOf(r.job, rep.id).map((u) => u.act), ['note', 'resolved', 'reopened'], 'every act stays on the record in order');
    eq(JSON.stringify(r.S.jobListGet(r.job, 'incidents', rep.id)), snapshot, '⚠ and the report is still as written');

    // Void: with a reason, kept, counted as void.
    eq(r.S.voidIncident(41, rep.id), true, 'voided with a reason');
    eq(r.S.incidentStatus(r.job, rep.id), 'void', 'its status is void');
    eq(r.reports().length, 0, 'live readers leave it out');
    eq(r.reports({ withVoided: true }).length, 1, 'the full list keeps it');
    eq(r.S.jobListGet(r.job, 'incidents', rep.id).voidReason, 'recorded twice', 'with the reason');
    eq(r.update(rep.id, 'note', { note: 'x' }), false, 'nothing more is recorded on a voided incident');
    const r2 = rig({ prompt: '' });
    r2.report('damage');
    eq(r2.S.voidIncident(41, r2.reports()[0].id), false, 'a void with no reason does nothing');
    eq(r2.reports().length, 1, '…and the report stands');
    // A second report takes the next number, the void's number stays spent.
    eq(r.report('complaint', { f1: 'Mrs Halloran, by phone', f2: 'An apology and the decanter replaced' }), true, 'a second report');
    eq(r.S.incidentNo(r.job, r.reports()[0].id), 2, 'numbered 2: the voided report\'s number is spent');
  });

  // ── 4 ──────────────────────────────────────────────────────────────
  group('P26 — Q64: an alert kind reads red until the call is confirmed; Anthony\'s own device records the call at once');
  inEastern(() => {
    const r = rig();
    eq(r.report('injury', { f1: 'Anthony Graziano Jr', yn: 'no', what: 'Cut his hand on the broken decanter; cleaned and bandaged on site.' }), true, 'an injury records');
    const rep = r.reports()[0];
    eq(r.S.incidentAlertOwed(r.job, rep), true, 'the call to Anthony is owed');
    const badge = r.log.badges[r.log.badges.length - 1];
    has(badge.m, 'CALL ANTHONY IMMEDIATELY: (617) 650-6588', 'the badge says to call him, with the number');
    eq(badge.err, true, '…in red');
    const card = r.S.incidentsCardHtml(41, r.job, r.est());
    has(card, 'CALL ANTHONY IMMEDIATELY', 'the row carries the red alert');
    has(card, 'href="tel:+16176506588"', '…with the tap-to-call link');
    has(card, 'I called Anthony', '…and the one-tap confirmation');
    const hdr = r.S.incidentHeaderHtml(r.job);
    has(hdr, 'class="inc-banner"', 'the Job Plan header is red');
    has(hdr, 'CALL ANTHONY IMMEDIATELY', '…and says so');
    has(hdr, 'Incident 1: injury, Study', '…naming the incident');
    const lines = r.S.incidentLines(r.job, '2026-10-16');
    const call = lines.find((l) => l.key === 'inc_call_' + rep.id);
    ok(!!call && call.red === true, 'the derived line is red');
    has(call.label, 'Call Anthony immediately: (617) 650-6588', '…and names the number');
    // Confirmed: one tap.
    eq(r.S.incidentRecordCall(41, rep.id), true, 'I called Anthony records the call');
    const al = r.S.incidentUpdatesOf(r.job, rep.id).find((u) => u.act === 'alerted');
    eq([al.how, al.by], ['call', 'Ashley Jerome'], 'how, and who confirmed it');
    eq(r.S.incidentAlertOwed(r.job, rep), false, 'no longer owed');
    eq(r.S.incidentRecordCall(41, rep.id), false, 'a second confirmation is refused');
    lacks(r.S.incidentsCardHtml(41, r.job, r.est()), 'CALL ANTHONY IMMEDIATELY', 'the row\'s alert is gone');
    const hdr2 = r.S.incidentHeaderHtml(r.job);
    has(hdr2, 'class="inc-banner"', 'Q69: an open injury still reads red in the header');
    has(hdr2, 'Open until it is resolved', '…as open');
    lacks(hdr2, 'CALL ANTHONY', '…without the call');
    // Nothing is sent: no draft, no text, no server mail.
    const blk = live('saveIncident') + live('incidentRecordCall') + live('incidentHeaderHtml') + live('_incidentRowHtml');
    lacks(blk, 'sendInternalEmail', 'the app drafts no email for the alert');
    lacks(blk, 'sms:', '…and opens no text');
    lacks(blk, 'gmailCreateDraft', '…and no Gmail draft');

    // Anthony's own device.
    const a = rig({ device: 'Anthony Graziano' });
    eq(a.report('missing', { f1: 'Item 22, the gold pocket watch', f2: 'On the dresser at the end of Monday', by: 'Anthony Graziano' }), true, 'a missing item recorded by Anthony');
    const rep2 = a.reports()[0];
    eq(a.S.incidentAlertOwed(a.job, rep2), false, 'owes no call: he recorded it');
    const self = a.S.incidentUpdatesOf(a.job, rep2.id).find((u) => u.act === 'alerted');
    eq(self && self.how, 'self', 'the entry records that he recorded it himself');
    lacks(a.log.badges[a.log.badges.length - 1].m, 'CALL ANTHONY', 'and the badge does not tell him to call himself');
    lacks(a.S.incidentHeaderHtml(a.job), 'CALL ANTHONY', 'nor does the header');
    has(a.S.incidentHeaderHtml(a.job), '1 open incident on this job', '…which reads amber with the count');
  });

  // ── 5 ──────────────────────────────────────────────────────────────
  group('P26 — photographs: shrunk, filed to Incident Reports, recorded as one entry per batch; a failure named, nothing lost');
  inEastern(() => {
    const r = rig({ failUploads: true });
    r.report('damage');
    const rep = r.reports()[0];
    const files = [{ name: 'a.jpg', type: 'image/jpeg' }, { name: 'b.jpg', type: 'image/jpeg' }, { name: 'c.jpg', type: 'image/jpeg' }, { name: 'notes.pdf', type: 'application/pdf' }];
    eq(r.S.incidentUploadPhotos(41, rep.id, files), true, 'three photographs go up (the PDF is not a photograph)');
    eq(r.log.uploads.length, 3, 'three uploads');
    eq(r.log.compressed, 3, 'each shrunk on the device first');
    eq(r.log.folderAsked, 'Incident Reports', 'into the Incident Reports subfolder');
    eq(r.log.uploads[0].folderId, 'SUB-IncidentReports', '…by its id');
    has(r.log.uploads[0].filename, 'HVL-2611-HALL - Incident 1 - Property damage - ', 'named for the client, the incident and the kind');
    const ph = r.S.incidentUpdatesOf(r.job, rep.id).filter((u) => u.act === 'photos');
    eq(ph.length, 1, 'one photos entry for the batch');
    eq(ph[0].photos.length, 2, '…with the two that landed');
    eq(ph[0].photos.map((p) => p.fileId), ['F1', 'F3'], '…by file id');
    const badge = r.log.badges[r.log.badges.length - 1];
    has(badge.m, '2 photographs filed on Incident 1; 1 did not reach Drive', 'the failure is named');
    eq(badge.err, true, '…in red');
    has(r.S.incidentsCardHtml(41, r.job, r.est()), '>photo 2</a>', 'the row links each photograph');
    has(r.S.incidentRecordHtml(r.job), 'photograph 2</a>', '…and so does the record');
    // Refusals by name, before anything is read.
    eq(r.S.incidentUploadPhotos(41, rep.id, [files[3]]), false, 'a PDF alone is refused');
    has(r.log.badges[r.log.badges.length - 1].m, 'Choose one or more photographs', '…by name');
    const n = rig({ noUrl: true });
    n.report('damage');
    eq(n.S.incidentUploadPhotos(41, n.reports()[0].id, [files[0]]), false, 'no Apps Script URL: refused');
    has(n.log.badges[n.log.badges.length - 1].m, 'no Apps Script URL', '…by name');
    eq(n.log.uploads.length, 0, 'and nothing was sent');
    // The report's own photographs upload after it lands.
    const p = rig();
    p.S.openIncident(41, 'report'); p.S.incPickKind('hazard');
    p.set('inc-where', 'Garage'); p.set('inc-what', 'Mold across the back wall behind the shelving.'); p.set('inc-f1', 'Mold'); p.set('inc-yn', 'yes');
    p.dom.getElementById('inc-photos').files = [files[0]];
    eq(p.S.saveIncident(), true, 'a hazard with a photograph records');
    eq(p.reports().length, 1, 'the report is written');
    eq(p.S.incidentUpdatesOf(p.job, p.reports()[0].id).filter((u) => u.act === 'photos').length, 1, '…and its photograph arrives as an entry after it');
    has(p.S.incidentHeaderHtml(p.job), 'Incident 1: hazardous condition, Garage', 'Q69: an open hazard reads red in the header');
  });

  // ── 6 ──────────────────────────────────────────────────────────────
  group('P26 — the reminders: §6.3\'s deadlines on damage, red once past; the hotline on a vulnerable adult concern; the clock is an argument');
  inEastern(() => {
    const r = rig({ today: '2026-10-16' });
    r.report('damage', { day: '2026-10-14', money: '2400' });
    const rep = r.reports()[0];
    let L = r.S.incidentLines(r.job, '2026-10-14');
    eq(L.map((l) => l.key.replace(rep.id, 'ID')), ['inc_open_ID', 'inc_client_ID', 'inc_report_ID', 'inc_carrier_ID'], 'open, the client, the report to Anthony, the carrier');
    eq(L.map((l) => !!l.red), [false, false, false, false], 'none red on the day');
    has(L[1].detail, 'by ' + r.S.fmtDate2('2026-10-15'), 'the client within 24 hours');
    has(L[3].detail, 'by ' + r.S.fmtDate2('2026-10-16'), 'the carrier\'s contact within 48 hours');
    has(L[3].detail, 'above $500', '…because the value is above the floor');
    L = r.S.incidentLines(r.job, '2026-10-16');
    eq(L.map((l) => !!l.red), [false, true, true, false], 'two days on: the 24-hour lines are red, the 48-hour line is not yet');
    L = r.S.incidentLines(r.job, '2026-10-17');
    eq(L.map((l) => !!l.red), [false, true, true, true], 'three days on: all three');
    r.update(rep.id, 'client_notified', { on: '2026-10-14', note: 'Mrs Halloran, in the kitchen' });
    r.S.incidentRecordCall(41, rep.id);
    r.update(rep.id, 'carrier', { on: '2026-10-15', note: 'Claim 88-1234; contact card left with the client' });
    L = r.S.incidentLines(r.job, '2026-10-20');
    eq(L.map((l) => [l.ok, !!l.red]), [[false, false], [true, false], [true, false], [true, false]], 'each act clears its line');
    eq(r.update(rep.id, 'carrier', { on: '2026-10-21' }), false, 'a day after today is refused on an act too');
    // Below the floor: no carrier line.
    const s = rig();
    s.report('damage', { money: '$120' });
    eq(s.S.incidentLines(s.job, '2026-10-16').map((l) => l.key.split('_')[1]), ['open', 'client', 'report'], 'at $120 no carrier line');
    // The vulnerable adult concern.
    const v = rig();
    v.report('vulnerable', { f1: 'Mr Halloran left alone without food or his medication; bruising on both arms.', yn: 'no' });
    const vr = v.reports()[0];
    let VL = v.S.incidentLines(v.job, '2026-10-16');
    const hot = VL.find((l) => l.key === 'inc_hotline_' + vr.id);
    ok(!!hot && hot.red, 'the hotline not recorded as called: red');
    has(hot.detail, '1-800-962-2873', '…with the number');
    v.update(vr.id, 'hotline', { on: '2026-10-16', note: 'Ashley; reference 2026-99' });
    eq(v.S.incidentHotlineCalled(v.job, vr), true, 'the hotline entry answers it');
    VL = v.S.incidentLines(v.job, '2026-10-16');
    eq(VL.some((l) => l.key === 'inc_hotline_' + vr.id), false, '…and the line is gone');
    const w = rig();
    w.report('vulnerable', { f1: 'x', yn: 'yes' });
    eq(w.S.incidentLines(w.job, '2026-10-16').some((l) => /hotline/.test(l.key)), false, 'answered yes on the report: no line');
    // No clock inside.
    lacks(live('incidentLines'), 'new Date(', 'incidentLines reads no clock');
    lacks(live('incidentLines'), '_todayStr', '…today is an argument');
    lacks(live('incidentRefusal'), '_todayStr', 'and so is the refusal\'s');
  });

  // ── 7 ──────────────────────────────────────────────────────────────
  group('P26 — the close gate: the handler refuses an open incident; Deposit Retained too; Lost is flagged');
  inEastern(() => {
    const r = rig();
    eq(r.S.jobCloseBlockers(r.job), [], 'nothing blocks a job with no incident');
    r.report('damage');
    const rep = r.reports()[0];
    const cb = r.S.jobCloseBlockers(r.job);
    eq(cb.length, 1, 'one blocker');
    has(cb[0], 'Resolve the open incident with a resolution note (Incident 1, property damage)', 'named, with its number and kind');
    has(cb[0], 'The Incidents card is on the Job Plan, under In the house.', 'and where to go');
    has(live('applyJobTransition'), 'jobCloseBlockers(j)', 'the handler asks the same gate (Close job cannot be reached around)');
    r.update(rep.id, 'resolved', { note: 'Settled with the client.' });
    eq(r.S.jobCloseBlockers(r.job), [], 'resolved: the close is free');
    r.report('complaint', { f1: 'x', f2: 'y' });
    r.report('missing', { f1: 'item 3', f2: 'z' });
    has(r.S.jobCloseBlockers(r.job)[0], 'the 2 open incidents', 'two open: counted');
    // The rail's Work complete row carries the flag (source: jobTimeline is lifted by 28 suites, so the join is checked here by text).
    const jt = live('jobTimeline');
    has(jt, "key: 'work_complete', group: 'Work', label: 'Work complete', flag: _incFlag,", 'Work complete carries the incident flag');
    has(jt, "var _incOpenN = (typeof openIncidents === 'function' && job) ? openIncidents(job).length : 0;", '…read off openIncidents');
    // Deposit Retained is a close.
    const C = sandbox({ fns: ['confirmMarkLost', 'openCloseoutModal', 'openIncidents', 'incidentReportsOf', 'incidentStatus', 'incidentUpdatesOf', 'incidentNo', 'jobListEntries', 'jobListGet', 'esc', 'fmt', 'walkawayWorkNote'],
      vars: ['INCIDENT_KINDS', 'INCIDENT_ACTS', 'LOSS_REASONS'],
      stubs: { document: domStub({}), closeoutRetainedTotal: () => 5000, closeCloseoutModal() {}, renderJobs() {}, saveJobs() {}, syncJobToSheets() {},
               jobIsSettled: () => false, walkawaySettlement: () => ({ basis: 'fixed' }), stagePaidTotal: () => 0 } });
    C.closeoutJobId = 41;
    C.jobs = [{ id: 41, name: 'Margaret Halloran', status: 'active', incidents: [{ id: 'i1', entry: 'report', kind: 'damage', occurredOn: '2026-10-16', where: 'Study', recordedAt: 1 }] }];
    C.document.getElementById('closeout-reason').value = 'price';
    C.confirmMarkLost();
    eq(C.jobs[0].status, 'active', 'Q68: with money in and an incident open, Deposit Retained is refused');
    has(C.document.getElementById('closeout-fb').innerHTML, 'Resolve the open incident first (Incident 1, property damage)', '…by name');
    C.jobs[0].incidents.push({ id: 'u1', entry: 'update', of: 'i1', act: 'resolved', status: 'resolved', note: 'done', at: 2 });
    C.confirmMarkLost();
    eq(C.jobs[0].status, 'closed_retained', 'resolved: the close-out records');
    const Lo = sandbox({ fns: ['confirmMarkLost', 'openCloseoutModal', 'openIncidents', 'incidentReportsOf', 'incidentStatus', 'incidentUpdatesOf', 'incidentNo', 'jobListEntries', 'jobListGet', 'esc', 'fmt', 'walkawayWorkNote'],
      vars: ['INCIDENT_KINDS', 'INCIDENT_ACTS', 'LOSS_REASONS'],
      stubs: { document: domStub({}), closeoutRetainedTotal: () => 0, closeCloseoutModal() {}, renderJobs() {}, saveJobs() {}, syncJobToSheets() {},
               jobIsSettled: () => false, walkawaySettlement: () => null, stagePaidTotal: () => 0 } });
    Lo.jobs = [{ id: 41, name: 'Margaret Halloran', status: 'won', incidents: [{ id: 'i1', entry: 'report', kind: 'hazard', occurredOn: '2026-10-16', where: 'Garage', recordedAt: 1 }] }];
    Lo.document.querySelector = () => null;
    Lo.openCloseoutModal(41);
    has(Lo.document.getElementById('closeout-sub').innerHTML, '1 open incident stays open on the record.', 'a loss with nothing paid names the open incident as a flag');
    Lo.closeoutJobId = 41; Lo.document.getElementById('closeout-reason').value = 'price';
    Lo.confirmMarkLost();
    eq(Lo.jobs[0].status, 'lost', '…and records the loss');
  });

  // ── 8 ──────────────────────────────────────────────────────────────
  group('P26 — the Incident Record: the client\'s page leaves the vulnerable adult concern out; the footer adds up; VOID marked; text escaped');
  inEastern(() => {
    const r = rig();
    eq(r.S.printIncidentRecord(41, { asHtml: true }).why, 'no incident is recorded on this job', 'nothing recorded: the record refuses by name');
    eq(r.S.printIncidentRecord(41), false, '…and prints nothing');
    r.report('damage', { what: 'A <b>bold</b> account & "quotes"' });
    r.report('vulnerable', { f1: 'Observed <i>this</i>', yn: 'no' });
    r.report('complaint', { f1: 'Mrs Halloran', f2: 'A call back' });
    const ids = r.reports().map((x) => x.id);
    r.update(ids[2], 'resolved', { note: 'Called her back; <script>alert(1)</script> settled.' });
    r.S.voidIncident(41, ids[0]);
    const page = r.S.incidentRecordHtml(r.job);
    has(page, 'Incident Record', 'titled');
    has(page, 'Margaret Halloran', 'headed with the client');
    has(page, 'Incident 1 &middot; Property damage', 'the damage report, numbered 1');
    has(page, 'Incident 3 &middot; Client complaint', 'the complaint, numbered 3');
    lacks(page, 'Vulnerable adult concern', 'Q66: the vulnerable adult concern is not on the client\'s record');
    lacks(page, 'Observed', '…nor its account');
    has(page, 'A &lt;b&gt;bold&lt;/b&gt; account &amp; &quot;quotes&quot;', 'person-typed text is escaped');
    has(page, '&lt;script&gt;alert(1)&lt;/script&gt;', '…in the entries too');
    lacks(page, '<script>', 'no markup reaches the page');
    has(page, '<span style="color:#A32D2D;">VOID</span>', 'the voided report prints VOID');
    has(page, 'recorded twice', '…with its reason');
    has(page, '2 incidents listed: 0 open, 1 resolved, 1 void.', 'the footer adds up to the rows it lists');
    has(page, 'not an admission of liability or a statement of value', 'and says what the record is not');
    const internal = r.S.incidentRecordHtml(r.job, { internal: true });
    has(internal, 'Internal Incident Record', 'the internal page');
    has(internal, 'Vulnerable adult concern', '…carries the concern');
    lacks(internal, 'Client complaint', '…and nothing else');
    has(internal, 'for Havellin’s Managing Member only', '…and says who it is for');
    const pr = r.S.printIncidentRecord(41, { asHtml: true });
    has(pr.title, 'Havellin Incident Record', 'the printed name');
    eq(r.S.printIncidentRecord(41), true, 'and it prints');
    has(r.S.__printed, 'Incident 3', 'what was printed is the record');
    // The card and the header escape too.
    const card = r.S.incidentsCardHtml(41, r.job, r.est());
    has(card, 'Observed &lt;i&gt;this&lt;/i&gt;', 'the card escapes');
    has(card, '<span class="inc-int">internal</span>', '…and marks the internal concern');
    has(card, 'Print Internal Incident Record', '…offering its own page');
    has(card, 'Print Incident Record', '…and the client\'s');
    // The desk's More menu offers the client's record only where there is one.
    const wb = live('_renderInvWorkbar');
    has(wb, "incidentReportsOf(job, { client: true }).length) ? btn('printIncidentRecord(' + jid + ')', 'Incident Record'", 'the desk offers the Incident Record where the job has one');
  });

  // ── 9 ──────────────────────────────────────────────────────────────
  group('P26 — filed at close through the one path, on a prep job too, without reading the manifest; carried in the package');
  inEastern(() => {
    const r = rig({ job: { svc: 'prep' } });
    r.S.estimateStore[41].estimate.svc = 'prep';
    eq(r.S.fileIncidentRecord(41, { auto: true }), false, 'no incident: nothing files, silently');
    eq(r.log.htmlUploads.length, 0, '…nothing sent');
    r.report('damage', { where: 'Kitchen', f1: 'Counter top chipped by the painter\'s ladder', money: '900' });
    eq(r.S.fileIncidentRecord(41, { auto: true }), true, 'a prep job with an incident files its record');
    eq(r.log.manifestReads, 0, '⚠ without reading the manifest: the page reads the job alone');
    eq(r.log.folderAsked, 'Incident Reports', 'into the Incident Reports folder');
    eq(r.log.htmlUploads.length, 1, 'one upload');
    eq(r.log.htmlUploads[0].name, 'HVL-2611-HALL - Havellin Incident Record.html', 'under its undated name, so a re-file replaces');
    has(r.log.htmlUploads[0].html, 'Counter top chipped', 'carrying the record');
    const st = r.job.docState && r.job.docState.incidentRecord;
    ok(!!st && !!st.filedAt && st.filedUrl === 'https://drive.google.com/file/d/H1/view' && st.filedHow === 'close', 'recorded on docState.incidentRecord as filed at the close');
    has(r.log.badges[r.log.badges.length - 1].m, 'Incident Record filed to Drive', 'and said so');
    has(r.S.incidentsCardHtml(41, r.job, r.est()), 'Incident Record filed to Drive', 'the card shows the filing');
    has(r.S.incidentsCardHtml(41, r.job, r.est()), 'Re-file to Drive', '…and offers a re-file');
    // Internal only: nothing to file for the client.
    const v = rig();
    v.report('vulnerable', { f1: 'x', yn: 'yes' });
    eq(v.S.fileIncidentRecord(41, { auto: true }), false, 'a vulnerable adult concern alone files no client record');
    eq(v.log.htmlUploads.length, 0, '…nothing sent');
    has(live('activateOrCycle'), "fileIncidentRecord(jobId, { auto: true })", 'the close files it beside the ledger and the Contents Record');
    // The folder is made at intake.
    has(live('createDriveJobFolder'), 'SIGNED_RECORDS_SUBFOLDER, INCIDENT_SUBFOLDER]', 'new client folders get an Incident Reports subfolder');
    // The package.
    const e = rig({ job: { svc: 'probate', name: 'Estate of Harold Brandt', executor: 'Ruth Brandt', matterType: 'probate' } });
    e.S.estimateStore[41].estimate.svc = 'probate';
    eq(e.S.probatePackageDocs(e.job), ['schedule', 'ledger', 'worklist'], 'no incident: the package as before');
    e.report('vulnerable', { f1: 'x', yn: 'yes', by: 'Ashley Jerome' });
    eq(e.S.probatePackageDocs(e.job), ['schedule', 'ledger', 'worklist'], 'Q66: a vulnerable adult concern never joins the package');
    e.report('damage', { f1: 'The hall mirror', money: '300' });
    eq(e.S.probatePackageDocs(e.job), ['schedule', 'ledger', 'incidents', 'worklist'], 'a damage incident puts the Incident Record in the package, after the ledger');
    const pg = e.S.probatePackagePage(41, 'incidents');
    has(pg.html, 'The hall mirror', 'the package page is the record');
    lacks(pg.html, 'Vulnerable', '…without the internal concern');
    has(pg.title, 'Havellin Incident Record', 'titled');
  });

  // ── 10 ─────────────────────────────────────────────────────────────
  group('P26 — the card and the plan: on every service, Report an incident; the derived lines through planDerivedLines; every write a stamped edit');
  inEastern(() => {
    const r = rig();
    const card0 = r.S.incidentsCardHtml(41, r.job, r.est());
    has(card0, 'id="plan-incidents-41"', 'the card, by id');
    has(card0, 'openIncident(41,\'report\')">Report an incident', 'with the one button');
    lacks(card0, 'Print Incident Record', 'and no record to print yet');
    has(card0, 'Record it today,', 'the note');
    lacks(card0, 'Found on site', 'a living client\'s card does not point at Found on site');
    const est = rig({ job: { svc: 'cleanout', name: 'Estate of Harold Adler', executor: 'Ruth Adler' } });
    has(est.S.incidentsCardHtml(41, est.job, est.est()), 'goes on Found on site, above, not here', 'an estate\'s card sends a will or cash to Found on site');
    eq(r.S.incidentHeaderHtml(r.job), '<div id="inc-hdr-41"></div>', 'no incident: the header element is there and empty, so a repaint can fill it');
    r.report('complaint', { f1: 'x', f2: 'y' });
    has(r.S.incidentHeaderHtml(r.job), '1 open incident on this job. The job cannot close until each is resolved.', 'a complaint: the amber chip with the count');
    // goToIncidents opens the plan on In the house.
    eq(r.S.goToIncidents(41), true, 'Open Incidents navigates');
    eq(r.log.navs, [41], '…through openJobPlanFor');
    // renderJobPlan draws the card on the playbook, the no-playbook and the prep renderers, and the header on both.
    const rp = live('renderJobPlan');
    has(rp, "(ctx.fid ? siteFindsCardHtml(jobId, job, est) : '') + (typeof incidentsCardHtml === 'function' ? incidentsCardHtml(jobId, job, est) : '')", 'In the house carries the card');
    has(rp, "+ roomDocsCard + (typeof incidentsCardHtml === 'function' ? incidentsCardHtml(jobId, job, est) : '');", '…on a service with no playbook too (beside the keys card since the same day)');
    has(rp, "firearmsBannerHtml(job) + (typeof incidentHeaderHtml === 'function' ? incidentHeaderHtml(job) : '')", '…and the header banner under the firearms banner');
    const pp = live('renderPrepJobPlan');
    has(pp, "(typeof incidentsCardHtml === 'function' ? incidentsCardHtml(jobId, job, est) : '') + renderCloseoutCard(jobId, job, 'plan')", 'Home Prep carries the card');
    has(pp, "firearmsBannerHtml(job) + (typeof incidentHeaderHtml === 'function' ? incidentHeaderHtml(job) : '')", '…and the banner');
    // planDerivedLines, the real one, for the card's phase and the desk's.
    const pdl = live('planDerivedLines');
    has(pdl, "if ((phase === 'incidents' || phase === 'admin') && typeof incidentLines === 'function'", 'planDerivedLines draws the incident lines on the card and the desk');
    has(pdl, "l.action = { label: 'Open Incidents', call: 'goToIncidents(' + jobId + ')' };", '…the desk\'s with Open Incidents');
    has(pdl, 'incidentReportsOf(job).length) {\n    incidentLines(job, day())', '…and reads the clock only on a job with one');
    // Every write goes through the list writers: a stamped edit, never a bare save.
    const block = SRC.slice(SRC.indexOf('var INCIDENT_KINDS = {'), SRC.indexOf('function fileIncidentRecord(jobId, opt)'));
    ok(block.length > 20000 && block.length < 60000, 'the block is bounded (' + block.length + ' bytes)');
    const liveBlock = block.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    lacks(liveBlock, 'saveJobs()', 'no bare saveJobs() in the incidents block');
    lacks(liveBlock, 'syncJobToSheets(', '…and no sync of its own: jobListPut and jobListVoid are the writers');
    eq((liveBlock.match(/jobListPut\(/g) || []).length, 4, 'four puts: the report or an update (one writer), Anthony\'s own alert, the call, a photo batch');
    eq((liveBlock.match(/jobListVoid\(/g) || []).length, 1, 'one void');
    lacks(liveBlock, 'toISOString().slice', 'no UTC day sliced off a stamp');
    lacks(liveBlock, '.incidents.splice', 'nothing removes an entry');
    lacks(liveBlock, '.incidents = ', 'nothing rewrites the list');
    // After the close: recorded and flagged.
    const c = rig({ job: { status: 'closed', deliveredOn: '2026-10-10' } });
    c.report('complaint', { f1: 'x', f2: 'y' });
    eq(c.reports()[0].afterClose, true, 'a report after the close is flagged');
    has(c.log.badges[c.log.badges.length - 1].m, 'after the job closed, and flagged so', '…and said');
    has(c.S.incidentsCardHtml(41, c.job, c.est()), 'recorded after the job closed', '…on the card');
    // The localStorage walk: no new key.
    lacks(liveBlock, 'localStorage.setItem', 'the block writes no localStorage key of its own');
  });
};
