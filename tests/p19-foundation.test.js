'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P19 · THE FOUNDATION (2026-10-03, the lead), built before the five workstreams so each reads one definition.
// Anthony, 2026-10-03, on the estate workflow: "i'm good with all of your calls. build it all".
//
//   · estateAuthority(job): which paper proves the representative's authority. The Letters on the probate track
//     (Both included), the Certification of Trust (§736.1017) on a trust-only matter, nothing on Neither, on an
//     Estate Settlement whose matter is unanswered, or on living work.
//   · jobFiduciaries(job): the representative intake records, then each co-representative (job.coFiduciaries).
//   · estateTaxReturn(job): Form 706 due nine months after death, the last day of the month where the day is
//     missing (Treas. Reg. §20.6075-1); firm on a yes, unfirm on an unanswered 706, nothing on a no.
//   · estateProceedsHolder(job): the estate, the trust, either, or the client.
//   · The job's record lists (JOB_RECORD_LISTS): put, remove (stamped), void; the sheet merges each entry on its id
//     (main-sync.gs JOB_KEYED_LISTS, BACKEND_VERSION 2026-10-03), and the two lists are held level.
//   · Signed copies filed to Drive (fileSignedCopy): refused by name before anything is read, filed to Signed
//     Records or the job's root folder, recorded on signedRecords, one filing per paper at a time.
// Driven through the real functions; the boundaries (the network, FileReader, the store saves) are stubbed by name.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, matchBrace } = require('./harness');

const SRC = source();
const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const close = matchBrace(GS, GS.indexOf('{', re.lastIndex));
  return GS.slice(start, close + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[^;]*;)'));
  if (!m) throw new Error('not in .gs: var ' + name);
  return m[2];
}
const inEastern = (body) => { const prev = process.env.TZ; process.env.TZ = 'America/New_York'; try { return body(); } finally { process.env.TZ = prev; } };
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }

const MATTER_FNS = ['jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'isDecedentJob'];
const MATTER_VARS = ['MATTER_TYPES', 'DECEDENT_SERVICES'];
const LIST_FNS = ['jobListEntries', 'jobListGet', 'jobListPut', 'jobListRemove', 'jobListVoid', 'newJobListId', '_saveJobEdit', '_jobTouch'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ── 1 ─────────────────────────────────────────────────────────────────────
  group('estateAuthority: the Letters on the probate track, the Certification of Trust on a trust-only matter, nothing elsewhere');
  {
    const S = sandbox({ fns: ['estateAuthority'].concat(MATTER_FNS), vars: ['ESTATE_AUTHORITIES'].concat(MATTER_VARS) });
    const key = (j) => { const r = attempt(() => S.estateAuthority(j)); return r.ok ? (r.val ? r.val.key : null) : 'threw: ' + r.err; };
    const cases = [
      [{ svc: 'probate' }, 'letters', 'a Probate service with the matter unanswered (a case was open at intake)'],
      [{ svc: 'contested_probate' }, 'letters', 'Contested Probate, unanswered'],
      [{ svc: 'cleanout' }, null, 'an Estate Settlement with the matter unanswered: nothing waits'],
      [{ svc: 'cleanout', matterType: 'probate' }, 'letters', 'an Estate Settlement administering a probate estate'],
      [{ svc: 'cleanout', matterType: 'both' }, 'letters', 'Both stays on the Letters (the court governs a pour-over)'],
      [{ svc: 'cleanout', matterType: 'trust' }, 'certification', 'a trust-only Estate Settlement takes the Certification of Trust'],
      [{ svc: 'probate', matterType: 'trust' }, 'certification', 'a Probate service recorded as a trust administration'],
      [{ svc: 'contested_probate', matterType: 'trust' }, 'certification', 'and a contested one'],
      [{ svc: 'cleanout', matterType: 'neither' }, null, 'Neither: no court and no trust, so no paper'],
      [{ svc: 'downsizing', matterType: 'trust' }, null, 'a living client has no matter and no paper'],
      [{ svc: 'home_cleanout' }, null, 'Home Cleanout'],
      [null, null, 'no job'],
    ];
    cases.forEach(([j, want, why]) => eq(key(j), want, why));
    const L = S.ESTATE_AUTHORITIES.letters, C = S.ESTATE_AUTHORITIES.certification;
    eq([L.doc, L.short, L.holder], ['Letters of Administration', 'Letters', 'Personal Representative'], 'the Letters entry names the paper and who holds it');
    eq([C.doc, C.cite, C.holder], ['Certification of Trust', '§736.1017', 'successor trustee'], 'the Certification entry cites §736.1017');
    // A form's two values answer the same as a saved record (intake and Edit Client ask before anything is saved).
    eq(key({ svc: 'cleanout', matterType: 'trust', executor: 'x' }), key({ svc: 'cleanout', matterType: 'trust' }), 'a draft {svc, matterType} answers as the record does');
  }

  // ── 2 ─────────────────────────────────────────────────────────────────────
  group('jobFiduciaries: the representative, then every co-representative; an estate only');
  {
    const S = sandbox({ fns: ['jobFiduciaries', 'samePerson', 'canonPersonName', 'jobListEntries'].concat(MATTER_FNS), vars: MATTER_VARS.concat(['PERSON_NAME_ALIASES']) });
    const job = { svc: 'cleanout', matterType: 'trust', executor: '  Ruth Adler ', executorRole: 'Trustee', executorEmail: 'ruth@x.com', executorPhone: '(561) 555-0101',
      coFiduciaries: [{ id: 'c1', name: 'Daniel Adler', role: 'Trustee', email: 'dan@x.com' }, { id: 'c2', name: '  ' }, null, { id: '', name: 'No Id' },
        { id: 'c3', name: 'Voided Person', voidedAt: 5 }] };
    const f = S.jobFiduciaries(job);
    eq(f.map((x) => x.name), ['Ruth Adler', 'Daniel Adler'], 'the representative first, trimmed; a blank name, a missing id and a voided entry are no one');
    eq([f[0].primary, f[1].primary, f[0].id, f[1].id], [true, false, 'rep', 'c1'], 'the representative is primary; each co-representative keeps its id');
    eq([f[0].role, f[0].email, f[1].email], ['Trustee', 'ruth@x.com', 'dan@x.com'], 'with the role and email each was recorded with');
    eq(S.jobFiduciaries({ svc: 'downsizing', executor: 'Somebody', coFiduciaries: [{ id: 'c1', name: 'x' }] }), [], 'a living client\'s family are not fiduciaries');
    eq(S.jobFiduciaries({ svc: 'probate', coFiduciaries: [{ id: 'c1', name: 'Only Co' }] }).map((x) => x.name), ['Only Co'], 'no representative recorded: the co-representatives alone');
    eq(S.jobFiduciaries(null), [], 'no job');
  }

  // ── 3 ─────────────────────────────────────────────────────────────────────
  group('estateTaxReturn: nine months after death, the last day of the month where the day is missing');
  inEastern(() => {
    const S = sandbox({ fns: ['estateTaxReturn', '_ymdLocal'].concat(MATTER_FNS), vars: MATTER_VARS });
    const due = (d, a, svc) => { const r = S.estateTaxReturn({ svc: svc || 'cleanout', deathDate: d, gate706: a }); return r ? r.due + (r.firm ? '' : ' (unfirm)') : null; };
    eq(due('2026-01-15', 'yes'), '2026-10-15', 'the same day nine months on');
    eq(due('2026-03-31', 'yes'), '2026-12-31', 'into the next calendar month without trouble');
    eq(due('2026-04-30', 'yes'), '2027-01-30', 'across the year');
    eq(due('2026-05-31', 'yes'), '2027-02-28', '⚠ 31 May has no 31 February: the last day of February (setMonth would say 3 March)');
    eq(due('2027-05-31', 'yes'), '2028-02-29', 'and in a leap year, the 29th');
    eq(due('2026-06-30', 'yes'), '2027-03-30', 'a 30th lands on the 30th');
    eq(due('2026-01-15', ''), '2026-10-15 (unfirm)', 'an unanswered 706 still has its date, unfirm (unknown counts as yes for the documentation standard)');
    eq(due('2026-01-15', 'no'), null, 'a 706 answered no: nothing to track');
    eq(due('2026-01-15', 'yes', 'downsizing'), null, 'a living client: no estate return');
    eq(due('', 'yes'), null, 'no date of death: nothing to compute');
    eq(due('15/01/2026', 'yes'), null, 'a date not in the stored form is not guessed at');
    eq(S.estateTaxReturn(null), null, 'no job');
  });

  // ── 4 ─────────────────────────────────────────────────────────────────────
  group('estateProceedsHolder: whose the proceeds are, in a document\'s words');
  {
    const S = sandbox({ fns: ['estateProceedsHolder'].concat(MATTER_FNS), vars: MATTER_VARS });
    eq(S.estateProceedsHolder({ svc: 'probate' }), 'the estate', 'probate, unanswered: the wording every estate document used');
    eq(S.estateProceedsHolder({ svc: 'cleanout', matterType: 'probate' }), 'the estate', 'a probate matter');
    eq(S.estateProceedsHolder({ svc: 'cleanout', matterType: 'trust' }), 'the trust', 'a trust-only matter');
    eq(S.estateProceedsHolder({ svc: 'cleanout', matterType: 'both' }), 'the estate or the trust, as the property is held', 'a pour-over');
    eq(S.estateProceedsHolder({ svc: 'cleanout', matterType: 'neither' }), 'the estate', 'Neither');
    eq(S.estateProceedsHolder({ svc: 'home_cleanout' }), 'the client', 'living work: there is no estate');
  }

  // ── 5 ─────────────────────────────────────────────────────────────────────
  group('The job\'s record lists: every write is a person\'s edit, stamped on the entry; a removal is stamped; a void keeps the record');
  {
    let saves = 0, syncs = 0;
    const S = sandbox({ fns: LIST_FNS, vars: ['JOB_RECORD_LISTS'], stubs: { saveJobs: () => { saves++; }, syncJobToSheets: () => { syncs++; } } });
    const job = { id: 7, updatedAt: 1 };
    const rec = S.jobListPut(job, 'coFiduciaries', { name: 'Daniel Adler', role: 'Trustee' });
    ok(rec && typeof rec.id === 'string' && rec.id.length > 6, 'an entry with no id is given one');
    eq(job.coFiduciaries.length, 1, 'and is added to the list');
    ok(typeof (job.at || {})['coFiduciaries:' + rec.id] === 'number', 'the entry is stamped on its own key (coFiduciaries:<id>)');
    ok(job.updatedAt > 1, 'and the job\'s clock moves');
    eq([saves, syncs], [1, 1], 'saved and synced once: _saveJobEdit, a person\'s edit');
    S.jobListPut(job, 'coFiduciaries', { id: rec.id, name: 'Daniel J. Adler', role: 'Trustee' });
    eq(job.coFiduciaries.map((c) => c.name), ['Daniel J. Adler'], 'a put with the same id replaces the entry rather than adding a second');
    eq(S.jobListPut(job, 'notAList', { name: 'x' }), null, 'a kind that is not one of the record lists is refused');
    ok(!('notAList' in job), 'and writes nothing');
    const second = S.jobListPut(job, 'coFiduciaries', { id: 'c2', name: 'Second' });
    eq(S.jobListEntries(job, 'coFiduciaries').map((c) => c.id), [rec.id, 'c2'], 'entries in the order recorded');
    eq(S.jobListGet(job, 'coFiduciaries', 'c2'), second, 'jobListGet finds one by id');
    delete job.at['coFiduciaries:c2'];
    ok(S.jobListRemove(job, 'coFiduciaries', 'c2'), 'a removal answers true');
    eq(job.coFiduciaries.map((c) => c.id), [rec.id], 'the entry is gone');
    ok(typeof job.at['coFiduciaries:c2'] === 'number', '⚠ and its key is stamped: absence alone is never a removal on the sheet');
    eq(S.jobListRemove(job, 'coFiduciaries', 'nope'), false, 'removing an id the list does not hold changes nothing');
    const sr = S.jobListPut(job, 'signedRecords', { id: 'sr1', kind: 'receipt' });
    const v = S.jobListVoid(job, 'signedRecords', 'sr1', '  filed against the wrong paper ', 'Ashley Jerome');
    ok(v === sr && typeof v.voidedAt === 'number', 'a void marks the record, which stays on the list');
    eq([v.voidedBy, v.voidReason], ['Ashley Jerome', 'filed against the wrong paper'], 'with who voided it and why (trimmed)');
    eq(S.jobListEntries(job, 'signedRecords').length, 0, 'live readers leave a voided record out');
    eq(S.jobListEntries(job, 'signedRecords', true).length, 1, 'and the full list keeps it');
    eq(S.jobListVoid(job, 'signedRecords', 'sr1', 'again'), null, 'a void is not voided twice');
  }

  // ── 6 ─────────────────────────────────────────────────────────────────────
  group('The sheet merges each record list entry by entry on its id, and the two lists are held level');
  {
    const A = sandbox({ vars: ['JOB_RECORD_LISTS'] });
    const ctx = vm.createContext({ console });
    vm.runInContext([gsVar('JOB_KEYED_LISTS'), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord'),
      'this.S = { JOB_KEYED_LISTS: JOB_KEYED_LISTS, JOB_LIST_KEY: JOB_LIST_KEY, merge: _mergeJobRecord };'].join('\n\n'), ctx);
    const S = ctx.S;
    A.JOB_RECORD_LISTS.forEach((k) => {
      ok(S.JOB_KEYED_LISTS.indexOf(k) >= 0, k + ' is on the backend\'s per-entry list (JOB_KEYED_LISTS)');
      eq(S.JOB_LIST_KEY[k], 'id', k + ' is keyed on id');
    });
    const p19 = S.JOB_KEYED_LISTS.filter((k) => ['payments', 'appraisers', 'invSnapshots'].indexOf(k) < 0);
    eq(p19.slice().sort(), A.JOB_RECORD_LISTS.slice().sort(), 'and the backend lists nothing the app does not name');
    eq(A.JOB_RECORD_LISTS.length, 6, 'six lists');
    // Two devices, each holding the morning copy, each add one co-trustee. The second one saved is newer.
    const desk = { id: 1, updatedAt: 100, coFiduciaries: [{ id: 'c1', name: 'Desk Added' }], at: { 'coFiduciaries:c1': 100 } };
    const field = { id: 1, updatedAt: 200, coFiduciaries: [{ id: 'c2', name: 'Field Added' }], at: { 'coFiduciaries:c2': 200 } };
    const m = S.merge(desk, field);
    eq((m.coFiduciaries || []).map((c) => c.id).sort(), ['c1', 'c2'], 'both entries survive the merge: neither device drops the other\'s');
    // A stamped removal on the newer side wins against the older copy still holding it.
    const removed = { id: 1, updatedAt: 300, coFiduciaries: [{ id: 'c2', name: 'Field Added' }], at: { 'coFiduciaries:c1': 300, 'coFiduciaries:c2': 200 } };
    eq(S.merge(m, removed).coFiduciaries.map((c) => c.id), ['c2'], 'a stamped removal is kept');
    // And the control: the same merge with the list taken off the backend's list rides the whole record and drops one.
    const ctx2 = vm.createContext({ console });
    vm.runInContext([gsVar('JOB_KEYED_LISTS').replace(/,\s*'coFiduciaries'/, ''), gsVar('JOB_KEYED_MAPS'), gsVar('JOB_LIST_KEY'), gsVar('JOB_PAYMENT_STICKY'),
      gsFn('_paymentSticky'), gsFn('_jobStamp'), gsFn('_jobListKey'), gsFn('_mergeJobKeyed'), gsFn('_mergeJobRecord'),
      'this.merge = _mergeJobRecord;'].join('\n\n'), ctx2);
    eq(ctx2.merge(desk, field).coFiduciaries.map((c) => c.id), ['c2'], '(control: without the backend list entry the newer whole record wins and the desk\'s co-trustee is lost)');
    const bv = (GS.match(/var BACKEND_VERSION = '([^']+)';/) || [])[1];
    // RESTATED 2026-10-05 (P20): at or past this pack's version, not equal to it: P20's .gs change (the co-signers on the
    // envelope) carries this merge forward, and the app asks for that later deployment.
    ok(bv >= '2026-10-03', 'BACKEND_VERSION is bumped with the .gs change (' + bv + ')');
    const B = sandbox({ vars: ['BACKEND_MIN_VERSION', 'BACKEND_FEATURE_COST'] });
    ok(B.BACKEND_MIN_VERSION >= '2026-10-03', 'the app asks for it: on an older deployment these lists ride the whole record (' + B.BACKEND_MIN_VERSION + ')');
    has(B.BACKEND_FEATURE_COST.version, 'a co-trustee, a beneficiary, a signed copy filed to Drive', 'and the banner names that consequence');
  }

  // ── 7 ─────────────────────────────────────────────────────────────────────
  group('fileSignedCopy: refused by name before anything is read; filed to Signed Records, else the root; recorded once filed');
  inEastern(() => {
    function rig(o) {
      o = Object.assign({ sub: 'SUBSIGNED', upload: 'ok', url: 'https://script.google.com/macros/s/P19/exec' }, o || {});
      const log = { uploads: [], reads: 0, resolves: [] };
      const job = Object.assign({ id: 41, hvlId: 'HVL-2610-ABCD', name: 'Estate of Adler', svc: 'cleanout', tc: 'Ashley Jerome',
        driveFolder: 'https://drive.google.com/drive/folders/ROOT41' }, o.job || {});
      const state = { jobs: [job] };
      const stubs = {
        SHEETS_SYNC_URL: o.url,
        saveJobs() {}, syncJobToSheets() {},
        resolveSubfolderId(j, name, cb) { log.resolves.push(name); cb(o.sub); },
        uploadToDrive(folderId, filename, dataUrl, cb) {
          log.uploads.push({ folderId, filename, dataUrl });
          if (o.upload === 'hang') return;
          if (o.beforeAnswer) o.beforeAnswer(S);
          cb(o.upload === 'ok', o.upload === 'ok' ? 'https://drive.google.com/file/d/F1/view' : undefined, o.upload === 'ok' ? 'F1' : undefined);
        },
        FileReader: function () {
          const self = this;
          self.readAsDataURL = function (file) { log.reads++; self.result = 'data:' + file.type + ';base64,QUJD'; if (self.onload) self.onload(); };
        },
      };
      const S = sandbox({ fns: ['fileSignedCopy', '_signedCopyName', 'signedRecordsOf', '_jobRootFolderId', '_ymdLocal', '_actor'].concat(LIST_FNS),
        vars: ['SIGNED_RECORD_KINDS', 'SIGNED_COPY_MAX_BYTES', '_signedFiling', 'SIGNED_RECORDS_SUBFOLDER', 'JOB_RECORD_LISTS'], stubs });
      S.jobs = state.jobs;
      return { S, log, job };
    }
    const PDF = { name: 'Release approval signed.PDF', type: 'application/pdf', size: 250000 };
    let out;
    const cb = (ok2, msg, rec) => { out = { ok: ok2, msg, rec }; };

    let r = rig();
    const started = r.S.fileSignedCopy(41, 'approval', { ref: 'ap-1', stableIds: [3, 'x9'], signedBy: 'Ruth Adler; Daniel Adler', signedOn: '2026-10-02' }, PDF, cb);
    ok(started, 'a filing that starts answers true');
    eq(r.log.resolves, ['Signed Records'], 'it looks for the client\'s Signed Records folder');
    eq(r.log.uploads.length, 1, 'one upload');
    eq(r.log.uploads[0].folderId, 'SUBSIGNED', 'into Signed Records');
    ok(/^HVL-2610-ABCD - Signed release approval - ap-1 - \d{4}-\d{2}-\d{2} \d{6}\.pdf$/.test(r.log.uploads[0].filename), 'named for the client, the paper and the moment, with the file\'s own extension: ' + r.log.uploads[0].filename);
    eq(r.log.uploads[0].dataUrl, 'data:application/pdf;base64,QUJD', 'carrying the file as read');
    ok(out && out.ok, 'the callback answers ok');
    has(out.msg, 'Signed release approval filed to Drive', 'and says what was filed');
    const rec = r.job.signedRecords && r.job.signedRecords[0];
    ok(!!rec, 'the copy is recorded on the job');
    eq([rec.kind, rec.ref, rec.stableIds, rec.signedBy, rec.signedOn], ['approval', 'ap-1', ['3', 'x9'], 'Ruth Adler; Daniel Adler', '2026-10-02'], 'with what it signs, the lines it covers and who signed when');
    eq([rec.fileUrl, rec.fileId, rec.filedBy], ['https://drive.google.com/file/d/F1/view', 'F1', 'Ashley Jerome'], 'its Drive link and id, and who filed it (the concierge where no approver is recorded)');
    ok(typeof r.job.at['signedRecords:' + rec.id] === 'number', 'stamped on its own key');
    eq(r.S.signedRecordsOf(r.job, 'approval', 'ap-1').length, 1, 'signedRecordsOf finds it by kind and paper');
    eq(r.S.signedRecordsOf(r.job, 'receipt').length, 0, 'and not under another kind');
    eq(Object.keys(r.S._signedFiling).length, 0, 'the in-flight mark is cleared');

    r = rig({ sub: null });
    r.S.fileSignedCopy(41, 'receipt', { ref: 'Mary Smith' }, { name: 'IMG_0042.JPG', type: 'image/jpeg', size: 900000 }, cb);
    eq(r.log.uploads.length && r.log.uploads[0].folderId, 'ROOT41', 'a folder made before P19 has no Signed Records: the job\'s root folder');
    ok(/\.jpg$/.test(r.log.uploads[0].filename), 'a photograph keeps its own extension');

    r = rig({ sub: null, job: { driveFolder: '' } });
    r.S.fileSignedCopy(41, 'receipt', { ref: 'x' }, PDF, cb);
    eq(r.log.uploads.length, 0, 'no Drive folder at all: nothing is uploaded');
    has(out.msg, 'no Drive folder yet', 'and the notice says how to fix it');
    ok(!r.job.signedRecords, 'nothing is recorded');
    eq(Object.keys(r.S._signedFiling).length, 0, 'and the paper is not left marked as being filed');

    const refusals = [
      [() => r.S.fileSignedCopy(99, 'receipt', {}, PDF, cb), 'could not be found', 'an unknown client'],
      [() => r.S.fileSignedCopy(41, 'ransom', {}, PDF, cb), 'not a kind of paper', 'an unknown kind'],
      [() => r.S.fileSignedCopy(41, 'receipt', {}, null, cb), 'Choose the PDF or the photograph', 'no file chosen'],
      [() => r.S.fileSignedCopy(41, 'receipt', {}, { name: 'notes.txt', type: 'text/plain', size: 10 }, cb), 'File a PDF or a photograph', 'a text file'],
      [() => r.S.fileSignedCopy(41, 'receipt', {}, { name: 'big.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 }, cb), 'over 10 MB', 'a file over 10 MB'],
    ];
    r = rig();
    refusals.forEach(([go, words, why]) => {
      out = null;
      const ans = go();
      ok(ans === false && out && !out.ok, why + ': refused');
      has(out && out.msg, words, why + ': named');
    });
    eq([r.log.reads, r.log.uploads.length], [0, 0], 'every refusal comes before the file is read or anything is sent');
    r = rig({ url: '' });
    r.S.fileSignedCopy(41, 'receipt', {}, PDF, cb);
    has(out.msg, 'no Apps Script URL', 'no Apps Script URL on this device: refused, named');
    eq(r.log.reads, 0, 'before reading');

    r = rig({ upload: 'hang' });
    r.S.fileSignedCopy(41, 'cash', { ref: 'find-1' }, PDF, cb);
    out = null;
    eq(r.S.fileSignedCopy(41, 'cash', { ref: 'find-1' }, PDF, cb), false, 'a second press while the same paper is still being filed is refused');
    has(out && out.msg, 'being filed now', 'and says so');
    out = null;
    r.S.fileSignedCopy(41, 'cash', { ref: 'find-2' }, PDF, cb);
    eq(r.log.uploads.length, 2, 'a different paper is not held up by it');

    r = rig({ upload: 'fail' });
    r.S.fileSignedCopy(41, 'will', { ref: 'w1' }, PDF, cb);
    ok(out && !out.ok && /not filed to Drive/.test(out.msg), 'an upload that fails is reported');
    ok(!r.job.signedRecords, 'and nothing is recorded');
    eq(Object.keys(r.S._signedFiling).length, 0, 'and the paper can be filed again');

    // The jobs store replaced by a load while the upload was out: the record lands on the record held now.
    const fresh = { id: 41, hvlId: 'HVL-2610-ABCD', svc: 'cleanout', tc: 'Ashley Jerome', updatedAt: 9 };
    r = rig({ beforeAnswer: (S) => { S.jobs = [fresh]; } });
    r.S.fileSignedCopy(41, 'ledger', { ref: 'close' }, PDF, cb);
    ok(fresh.signedRecords && fresh.signedRecords.length === 1, 'the copy is recorded on the job record the store holds when the answer lands');
    ok(!r.job.signedRecords, 'not on the copy the load replaced');
  });

  // ── 8 ─────────────────────────────────────────────────────────────────────
  group('The control: a stable index per paper, nothing a person typed in the attribute; filing repaints the surface');
  {
    const calls = [];
    let badge = null, repaint = 0;
    const S = sandbox({ fns: ['signedCopyControlHtml', 'fileSignedCopyFromInput', 'esc'], vars: ['_signedCopySpecs', '_signedCopyKeys'],
      stubs: { fileSignedCopy(jobId, kind, meta, file, cb) { calls.push({ jobId, kind, meta, file }); cb(true, 'Signed receipt filed to Drive.', { id: 'r1' }); },
               showSyncBadge(m, err) { badge = { m, err: !!err }; }, _signedCopyRepaint() { repaint++; } } });
    const h1 = S.signedCopyControlHtml(5, 'receipt', { ref: 'Mary "Mae" O\'Neil' }, 'File signed receipt');
    const h2 = S.signedCopyControlHtml(5, 'receipt', { ref: 'Mary "Mae" O\'Neil' }, 'File signed receipt');
    const h3 = S.signedCopyControlHtml(5, 'receipt', { ref: 'Someone Else' });
    const idx = (h) => (/fileSignedCopyFromInput\(this,(\d+)\)/.exec(h) || [])[1];
    ok(idx(h1) !== undefined, 'the input files through fileSignedCopyFromInput with an index');
    eq(idx(h1), idx(h2), 'the same paper keeps its index across redraws');
    ok(idx(h3) !== idx(h1), 'another paper has its own');
    lacks(h1, 'O\'Neil', 'a recipient\'s name never reaches the markup');
    has(h1, 'File signed receipt', 'the label is the caller\'s');
    has(h3, 'File signed copy', 'with a default');
    has(h1, 'accept="application/pdf,image/*"', 'the picker offers PDFs and photographs');
    const input = { files: [{ name: 'a.pdf', type: 'application/pdf', size: 1 }], value: 'C:/fakepath/a.pdf' };
    S.fileSignedCopyFromInput(input, Number(idx(h1)));
    eq(calls.length, 1, 'choosing a file files it');
    eq([calls[0].jobId, calls[0].kind, calls[0].meta.ref], [5, 'receipt', 'Mary "Mae" O\'Neil'], 'for the paper the control was drawn for');
    eq(input.value, '', 'the picker is cleared, so the same file can be chosen again');
    eq(badge, { m: 'Signed receipt filed to Drive.', err: false }, 'the result is shown');
    eq(repaint, 1, 'and the surface repaints');
    let after = null;
    const h4 = S.signedCopyControlHtml(5, 'will', { ref: 'w1' }, 'File signed receipt', (rec) => { after = rec; });
    S.fileSignedCopyFromInput({ files: [{ type: 'application/pdf', size: 1 }] }, Number(idx(h4)));
    eq(after, { id: 'r1' }, 'a caller\'s own follow-up runs instead, with the record');
    eq(repaint, 1, 'in place of the default repaint');
  }

  // ── 9 ─────────────────────────────────────────────────────────────────────
  group('The filed copies listed, and a void that keeps the record and its file');
  {
    let prompt = '', repaint = 0, badge = '';
    const S = sandbox({ fns: ['signedRecordLinksHtml', 'voidSignedRecord', 'jobListVoid', 'jobListGet', 'jobListEntries', '_saveJobEdit', '_jobTouch', '_actor', 'esc', 'fmtDate2'],
      stubs: { saveJobs() {}, syncJobToSheets() {}, showSyncBadge(m) { badge = m; }, _signedCopyRepaint() { repaint++; } } });
    S.window.prompt = () => prompt;
    const job = { id: 9, tc: 'Ashley Jerome', signedRecords: [{ id: 's<1>', kind: 'receipt', label: 'Signed receipt <b>', signedBy: 'Mary <i>', signedOn: '2026-10-02', fileUrl: 'https://drive.google.com/file/d/A/view' }] };
    S.jobs = [job];
    const h = S.signedRecordLinksHtml(9, job.signedRecords);
    has(h, 'href="https://drive.google.com/file/d/A/view"', 'each copy links to its Drive file');
    lacks(h, '<b>', 'the label is escaped');
    lacks(h, 'Mary <i>', 'and the signer');
    has(h, 'voidSignedRecord(9,', 'with a Void');
    eq(S.signedRecordLinksHtml(9, []), '', 'nothing filed: nothing drawn');
    prompt = '';
    eq(S.voidSignedRecord(9, 's<1>'), false, 'a void with no reason given is not made');
    ok(!job.signedRecords[0].voidedAt, 'and changes nothing');
    prompt = 'filed against the wrong paper';
    eq(S.voidSignedRecord(9, 's<1>'), true, 'with a reason it is made');
    eq([job.signedRecords.length, job.signedRecords[0].voidReason, job.signedRecords[0].voidedBy], [1, 'filed against the wrong paper', 'Ashley Jerome'], 'the record stays, marked, with why and by whom');
    has(badge, 'stays in Drive', 'and the notice says the file is kept');
    eq(repaint, 1, 'the surface repaints');
    eq(S.voidSignedRecord(9, 's<1>'), false, 'a voided copy cannot be voided again');
  }

  // ── 10 ────────────────────────────────────────────────────────────────────
  group('New client folders get a Signed Records subfolder');
  {
    const posted = [];
    const sp = (v) => ({ then(f) { try { return sp(f(v)); } catch (e) { return { then() { return this; }, catch(h) { h(e); return this; } }; } }, catch() { return this; } });
    const S = sandbox({ fns: ['createDriveJobFolder'], vars: ['SIGNED_RECORDS_SUBFOLDER', '_driveFolderInFlight'],
      stubs: { SHEETS_SYNC_URL: 'https://script.google.com/macros/s/P19/exec', DRIVE_FOLDER_ID: 'ROOT', saveJobs() {}, syncJobToSheets() {}, showSyncBadge() {},
               _driveFolderLanded() {}, _driveFolderFailed() {}, _backendErrorKind() { return ''; },
               fetch(url, init) { posted.push(JSON.parse(init.body)); return sp({ json: () => ({ ok: true, folderUrl: 'https://drive.google.com/drive/folders/NEW', subfolders: {} }) }); } } });
    S.jobs = [{ id: 3, hvlId: 'HVL-1', name: 'X', svc: 'cleanout' }];
    attempt(() => S.createDriveJobFolder(S.jobs[0]));
    eq(posted.length, 1, 'the folder request is posted');
    ok(posted[0] && posted[0].subfolders.indexOf('Signed Records') >= 0, 'and asks for a Signed Records subfolder');
    eq(posted[0] && posted[0].subfolders.slice(0, 6), ['Estate Inventory', 'As-Found Record', 'Estimates', 'Agreement', 'Change Orders', 'Invoice'], 'beside the six it makes (no Walkthrough Notes since 2026-10-06)');
  }

  // ── 11 ────────────────────────────────────────────────────────────────────
  group('One definition each: no second copy of a foundation rule in the file');
  {
    ['estateAuthority', 'jobFiduciaries', 'estateTaxReturn', 'estateProceedsHolder', 'fileSignedCopy', 'jobListPut', 'signedCopyControlHtml']
      .forEach((n) => eq((SRC.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1, n + ' is defined once'));
    eq((SRC.match(/\nvar JOB_RECORD_LISTS = /g) || []).length, 1, 'JOB_RECORD_LISTS once');
    ok(fn('fileSignedCopy').indexOf('jobListPut(j2, \'signedRecords\'') >= 0, 'a filed copy is recorded through the list writer (a stamped, person\'s edit)');
  }
};
