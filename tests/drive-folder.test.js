'use strict';
// THE CLIENT FOLDER WAS NEVER MADE, AND THE APP SAID NOTHING (2026-09-11).
//
// A client was taken all the way through intake → estimate → approval → agreement →
// deposit, and there were no files in Google Drive at all. The first symptom anybody
// saw was a crew standing in the entryway watching every photograph of the first room
// fail to upload.
//
// ⚠⚠ THE PHOTOS ARE THE SYMPTOM, NOT THE DEFECT. `_doPhotoUpload` resolves its target
// through `resolveSubfolderId`, which answers `null` when the job has no `driveFolder`
// — so every shot on a folderless job fails, forever, whatever is wrong with Drive.
//
// ⚠⚠ THE DEFECT IS THAT `createDriveJobFolder` HAD THREE SILENT RETURN PATHS AND ZERO
// COMMITTED COVERAGE. Driven on the real function against a fake backend, each of these
// produced NO badge, NO console line and NOTHING written to the job:
//
//   backend answers {ok:false, error:'…No item with the given ID…'}   → silence
//   backend answers {ok:false, error:'Unknown action: createFolder'}  → silence
//   SHEETS_SYNC_URL not configured on this device                      → silence
//
// A well-formed {ok:false} is not a network error, so it never reached the `.catch`; the
// success arm simply required `data.folderUrl` and did nothing when it was absent.
//
// ⚠ AND THE FAILURE WAS UNRECOVERABLE. `createDriveJobFolder` has exactly ONE caller —
// the end of `saveIntake`. Nothing later in the lifecycle creates a folder, and the
// dashboard's Drive button fell back to the Drive ROOT, which looks exactly like a
// working button. So the one automatic attempt was the only attempt there would ever be.
//
// ⚠ RECORDING THE DEPOSIT HAS NOTHING TO DO WITH IT, and this was asked: the folder is
// made at CLIENT CREATION. Payment gates hours logging; photo capture gates on `won`.

const { sandbox, source } = require('./harness');

// A synchronous thenable, so the real promise chain runs inside the runner's flat,
// synchronous assertion order. A real Promise resolves on a later microtask and every
// assertion below would run before the code under test did — green, and proving nothing.
function syncOk(value) {
  return {
    then(onOk) {
      try {
        const out = onOk(value);
        // Unwrap, exactly as a real promise does: `.then(r => r.json())` must hand the
        // NEXT `.then` the parsed body, not the thenable that produces it.
        return (out && typeof out.then === 'function') ? out : syncOk(out);
      } catch (e) { return syncErr(e); }
    },
    catch() { return this; },
  };
}
function syncErr(err) {
  return {
    then() { return this; },
    catch(onErr) { return syncOk(onErr(err)); },
  };
}

// Drive the REAL createDriveJobFolder against a backend that answers `resp`, then the
// REAL photo path on the same job, and report everything the person would have seen.
function run(resp, opts) {
  opts = opts || {};
  const badges = [];
  const warns = [];
  const ctx = sandbox({
    fns: ['createDriveJobFolder', '_driveFolderFailed', 'createDriveFolderNow',
          '_backendErrorKind', 'resolveSubfolderId', '_subfolderId', 'fetchSubfolderIds',
          '_normalizeSubfolders', 'uploadToDrive', '_doPhotoUpload', '_getPhotoRef', '_setPhotoRef'],
    stubs: {
      SHEETS_SYNC_URL: opts.noUrl ? '' : 'https://script.google.com/macros/s/AAA/exec',
      DRIVE_FOLDER_ID: '',
      showSyncBadge: (m) => badges.push(String(m)),
      openClientDashboard: () => {},
      saveJobs: () => {},
      syncJobToSheets: () => {},
      savePhotoRefs: () => {},
      _savePendingPhotoData: () => {},
      _photoRetryData: {},
      console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} },
      fetch: () => (opts.unreachable ? syncErr(new Error('network')) : syncOk({ json: () => syncOk(resp) })),
    },
  });
  const job = { id: 7, hvlId: 'HVL-2609-ABCD', name: 'Butler' };
  ctx.jobs.push(job);
  ctx.createDriveJobFolder(job);
  ctx._photoRefs[7] = [{ stableId: 's1', status: 'uploading', seq: 1, roomIdx: 0, label: 'before' }];
  ctx._doPhotoUpload(7, 'data:image/jpeg;base64,AAAA', 'entry.jpg', 's1', 'Estate Inventory', () => {});
  return { ctx, job, badges, warns, photo: (ctx._photoRefs[7][0] || {}).status };
}

const HAPPY = {
  ok: true,
  folderUrl: 'https://drive.google.com/drive/folders/FOLDER1',
  subfolders: { 'Estate Inventory': { id: 'SUB1' } },
};

module.exports = ({ group, ok, eq, has, lacks }) => {
  const src = source();

  group('the happy path still works, so the loud arms below are not the only thing proven', () => {
    const r = run(HAPPY);
    eq(r.job.driveFolder, 'https://drive.google.com/drive/folders/FOLDER1', 'the folder URL lands on the job');
    eq(r.job.driveSubfolders['Estate Inventory'].id, 'SUB1', 'and the subfolder ids with it');
    eq(r.photo, 'uploaded', 'so the entryway photograph uploads');
    ok(r.badges.some((b) => /created/.test(b)), 'and it says so');
    ok(!r.badges.some((b) => /NOT created/.test(b)), 'with no failure notice');
  });

  group('⚠⚠ a well-formed {ok:false} is reported — it used to be silent', () => {
    const r = run({ ok: false, error: 'Exception: No item with the given ID could be found' });
    eq(r.job.driveFolder, undefined, 'no folder is recorded, which is the truth');
    ok(r.badges.some((b) => /NOT created/.test(b)), 'a failure notice is shown');
    ok(r.badges.some((b) => /Butler/.test(b)), 'naming the client it happened to');
    ok(r.badges.some((b) => /No item with the given ID/.test(b)),
       "⚠ carrying the SERVER'S OWN WORDS — a sentence with no cause in it is what made a defect survive three rounds of reports");
    ok(r.badges.some((b) => /Create Drive folder/.test(b)), 'and it names the fix');
    ok(r.warns.some((w) => /\[Drive\]/.test(w)), 'it also reaches the console');
    ok(!!r.job.driveFolderError, '⚠ and it is RECORDED on the job, not only flashed in a badge that is gone in four seconds');
    has(r.job.driveFolderError.serverError, 'No item with the given ID', 'the record keeps the cause too');
  });

  group('⚠ a stale deployment is diagnosed as a stale deployment', () => {
    const r = run({ ok: false, error: 'Unknown action: createFolder' });
    eq(r.job.driveFolder, undefined, 'still no folder');
    ok(r.badges.some((b) => /redeploy/i.test(b)), 'the notice says to redeploy the Apps Script');
    ok(r.badges.some((b) => /New version/.test(b)),
       '⚠ naming Deploy → Manage deployments → New version, because Save alone does not change what /exec serves');
  });

  group('⚠ no Sheets URL on this device is its own answer, and used to be the quietest of the three', () => {
    const r = run(HAPPY, { noUrl: true });
    eq(r.job.driveFolder, undefined, 'no folder');
    ok(r.badges.some((b) => /Settings/.test(b)), 'the notice points at Settings, not at Drive');
    eq(r.photo, 'failed', 'and the photograph fails, as it must');
  });

  group('an unreachable backend falls back to the legacy GET, and that failing speaks too', () => {
    const r = run(HAPPY, { unreachable: true });
    ok(r.badges.some((b) => /NOT created/.test(b)), 'the fallback failing is reported rather than swallowed');
  });

  group('⚠⚠ "no folder" and "the upload failed" are different answers, and the fix is different', () => {
    const r = run({ ok: false, error: 'boom' });
    eq(r.photo, 'failed', 'the shot is marked failed, so the bytes are held and Retry stays live');
    ok(r.badges.some((b) => /no Google Drive folder/.test(b)),
       'but the reason is named — before, this was a bare "shot 1 not saved" with a Retry that could never succeed');
    ok(r.badges.some((b) => /Create Drive folder/.test(b)), 'and it says what to press');
  });

  group('⚠ the repair door: nothing after intake ever created a folder', () => {
    // Pinned at source: ONE automatic caller, at the end of the intake save.
    const calls = (src.match(/createDriveJobFolder\(/g) || []).length;
    eq(calls, 3, 'exactly three: the definition, the intake save, and the repair door — no other lifecycle step creates a folder');
    const intakeFrom = src.indexOf('\nfunction saveIntake(');
    const intakeBody = src.slice(intakeFrom, src.indexOf('\nfunction ', intakeFrom + 10));
    has(intakeBody, 'createDriveJobFolder(job)', 'the intake save is still what creates it automatically');

    // And the door itself, driven: a folderless job gets a folder on one press.
    const r = run(HAPPY, {});
    delete r.job.driveFolder;
    delete r.job.driveSubfolders;
    r.badges.length = 0;
    r.ctx.createDriveFolderNow(7);
    eq(r.job.driveFolder, 'https://drive.google.com/drive/folders/FOLDER1',
       'pressing Create Drive folder on a folderless job really creates one');

    // ⚠ AND IT REFUSES ON A JOB THAT ALREADY HAS ONE. The server reuses by name, but an
    // older deployment does not, so the app must not ask twice.
    r.badges.length = 0;
    r.ctx.createDriveFolderNow(7);
    ok(r.badges.some((b) => /already exists/.test(b)), 'and refuses to ask twice for a job that has one');
  });

  group('⚠ the Drive root fallback must not come back', () => {
    const barBody = src.slice(src.indexOf('function dashUtilityBar('),
                              src.indexOf('function _dashUtilityBarHtml('));
    lacks(barBody, "'https://drive.google.com/drive/folders/' + DRIVE_FOLDER_ID",
      '⚠⚠ a folderless job never links to the Drive ROOT — that is what made a real failure look like a working button');
    has(barBody, 'createDriveFolderNow(', 'it offers to create the folder instead');
  });
};
