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
// ⚠ THE SYNCHRONOUS THENABLE ABOVE CANNOT SEE THE IN-FLIGHT WINDOW, AND THAT WINDOW IS THE
// WHOLE DEFECT BELOW. It resolves inside the call, so `createDriveJobFolder` returns with the
// answer already applied and "is a create in progress" is never true for an observable moment.
// This one HOLDS its callback until `fire()` is called, which is what a real Apps Script cold
// start does for several seconds.
function deferred() {
  const d = { _ok: null, _err: null, chain: [] };
  const mk = (self) => ({
    then(onOk) { self.chain.push(onOk); return mk(self); },
    catch(onErr) { self._err = onErr; return mk(self); },
  });
  d.handle = mk(d);
  d.fire = (value) => {
    let v = value;
    for (const fn of d.chain) {
      const out = fn(v);
      v = (out && typeof out.then === 'function') ? out : out;
      // Unwrap a syncOk handed back by `r => r.json()`, exactly as a real promise does.
      if (v && typeof v.then === 'function') { let inner; v.then((x) => { inner = x; }); v = inner; }
    }
  };
  return d;
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
  const timers = [];
  const ctx = sandbox({
    vars: ['_driveFolderInFlight', 'PHOTO_UPLOAD_TIMEOUT_MS'],
    fns: ['createDriveJobFolder', '_driveFolderFailed', 'createDriveFolderNow', 'driveFolderPending',
          '_backendErrorKind', 'resolveSubfolderId', '_subfolderId', 'fetchSubfolderIds',
          '_normalizeSubfolders', 'uploadToDrive', '_doPhotoUpload', '_getPhotoRef', '_setPhotoRef'],
    stubs: {
      // _doPhotoUpload arms a watchdog now — "Uploading…" used to have no exit at all.
      // Captured rather than run, so a test can fire it deliberately.
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearTimeout: (id) => { if (id) timers[id - 1] = null; },
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

  // ⚠⚠ THE FOLDER TAKES SECONDS AND THE BUTTON WAS OFFERED THROUGHOUT (2026-09-22).
  //
  // Anthony, on the first dummy client of the five-client test run: *"the old, create google
  // drive folder button is stil there. but the folder is created automatically. when i clicked
  // it, it changed to a drive link"*.
  //
  // `saveIntake` fires the create and navigates to the Clients tab 800ms later, while Apps
  // Script cold-starts in SECONDS. So the whole window between "client created" and "folder
  // landed" rendered a control asserting the folder does not exist, on a job where it was
  // being made right then — and pressing it sent a SECOND createFolder for the same job.
  // Measured in a browser at 2 calls for one client.
  //
  // ⚠ THE GUARD ALREADY THERE CANNOT SEE THIS. It tests `job.driveFolder`, which is absent in
  // BOTH calls; its own comment names the race it was written for ("auto-create and the manual
  // button both fire") and this is a different one.
  group('⚠⚠ a folder being created right now is neither absent nor present', () => {
    const d = deferred();
    let creates = 0;
    const badges = [];
    const ctx = sandbox({
      fns: ['createDriveJobFolder', 'createDriveFolderNow', 'driveFolderPending',
            '_driveFolderFailed', '_backendErrorKind', 'dashUtilityBar'],
      vars: ['_driveFolderInFlight', '_estStoreState'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
        DRIVE_FOLDER_ID: '',
        showSyncBadge: (m) => badges.push(String(m)),
        openClientDashboard: () => {},
        saveJobs: () => {}, syncJobToSheets: () => {},
        estimateStore: {},
        console: { warn() {}, log() {}, error() {} },
        fetch: () => { creates++; return d.handle; },
      },
    });
    const job = { id: 7, hvlId: 'HVL-2609-ABCD', name: 'Butler' };
    ctx.jobs.push(job);

    ctx.createDriveJobFolder(job);
    eq(creates, 1, 'the automatic create at intake goes out once');
    eq(ctx.driveFolderPending(7), true, 'and the job is marked as having one in flight');

    // What a person actually sees while it is in the air.
    const mid = ctx.dashUtilityBar(job);
    const drive = mid.filter((a) => /Drive/.test(a.label));
    eq(drive.length, 1, 'the bar carries exactly one Drive control');
    ok(/Creating Drive folder/.test(drive[0].label),
       '⚠ it READS as being created rather than offering to create it');
    ok(!drive[0].call, '⚠⚠ and it is not pressable — this is the press that sent the second call');
    ok(!drive[0].href, 'nor a link, because there is no url yet and one that 404s is worse than none');

    // ⚠ THE HANDLER CARRIES THE SAME GATE, or the control is simply reached around.
    badges.length = 0;
    ctx.createDriveFolderNow(7);
    eq(creates, 1, '⚠⚠ pressing the repair door mid-flight sends NO second createFolder');
    ok(badges.some((b) => /being created right now/.test(b)), 'and says why rather than doing nothing');

    // Now let the answer land.
    d.fire({ json: () => syncOk(HAPPY) });
    eq(ctx.driveFolderPending(7), false, 'the flag clears when the answer lands');
    eq(job.driveFolder, 'https://drive.google.com/drive/folders/FOLDER1', 'the folder is recorded');
    const done = ctx.dashUtilityBar(job).filter((a) => /Drive/.test(a.label));
    ok(done[0].href, 'and the control is a link again');
    ok(!done[0].idle, 'not still reading as pending');
  });

  // ⚠ THE FLAG MUST CLEAR ON A FAILURE TOO, AND THIS IS THE ARM THAT MATTERS. A marker that
  // leaks on the failure path withholds the repair door on the ONE job that needs it — the
  // state-with-no-exit this project calls worse than the failure itself.
  group('⚠ a refused create clears the flag and gives the repair door back', () => {
    const d = deferred();
    const badges = [];
    const ctx = sandbox({
      fns: ['createDriveJobFolder', 'createDriveFolderNow', 'driveFolderPending',
            '_driveFolderFailed', '_backendErrorKind', 'dashUtilityBar'],
      vars: ['_driveFolderInFlight', '_estStoreState'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
        DRIVE_FOLDER_ID: '',
        showSyncBadge: (m) => badges.push(String(m)),
        openClientDashboard: () => {}, saveJobs: () => {}, syncJobToSheets: () => {},
        estimateStore: {},
        console: { warn() {}, log() {}, error() {} },
        fetch: () => d.handle,
      },
    });
    const job = { id: 7, name: 'Butler' };
    ctx.jobs.push(job);
    ctx.createDriveJobFolder(job);
    eq(ctx.driveFolderPending(7), true, 'in flight');
    d.fire({ json: () => syncOk({ ok: false, error: 'Exception: No item with the given ID could be found' }) });
    eq(ctx.driveFolderPending(7), false, '⚠⚠ the flag clears on a refusal, not only on success');
    ok(!!job.driveFolderError, 'the failure is recorded on the job');
    const bar = ctx.dashUtilityBar(job).filter((a) => /Drive/.test(a.label));
    ok(/Create Drive folder/.test(bar[0].label), 'and the repair door is offered again');
    ok(!!bar[0].call, 'as a real button, because now there IS something to press');
  });

  // ⚠ SESSION STATE, NEVER A RECORD. Persisting "creating…" would sync it to the other device,
  // and a tab closed mid-flight would leave the job reading pending forever with nothing able
  // to clear it.
  group('⚠ the in-flight marker is never written to the job or to storage', () => {
    // ⚠ BOUNDED TO THE MARKER AND ITS READER. The first cut ran to createDriveFolderNow and
    // swallowed the whole of createDriveJobFolder, which legitimately calls syncJobToSheets to
    // stamp the folder URL — so this failed on correct code. The claim is about the MARKER,
    // not about the function it happens to sit above.
    const body = src.slice(src.indexOf('var _driveFolderInFlight'),
                           src.indexOf('function createDriveJobFolder('));
    lacks(body, 'localStorage', 'it is module state, not site data');
    lacks(body, 'syncJobToSheets', 'and it never reaches the sheet');
    lacks(body, 'job.driveFolderPending', 'nor is it parked on the job record');
    const decl = src.indexOf('var _driveFolderInFlight');
    const usedAt = src.indexOf('_driveFolderInFlight[job.id] = true');
    ok(decl > -1 && decl < usedAt,
       '⚠ declared ABOVE its first use — a `var` referenced before its declaration hoists as undefined');
  });

  // ⚠⚠ THE LEGACY GET FALLBACK CLEARS IT TOO, AND BOTH ITS ARMS CAME BACK GREEN ON THE FIRST
  // REVERT SWEEP. When the POST rejects — an Apps Script too old to take one, or a dropped
  // connection — the code falls through to a legacy GET, and NOTHING in this suite had ever
  // driven that path. A marker that leaks there leaves the job reading "Creating Drive
  // folder…" forever, with the repair door withheld on the one job that needs it.
  //
  // ⚠ The outer .catch must NOT clear it: that arm is not terminal, it hands off to the GET
  // and the attempt is still in flight. Only the GET's own two arms end it.
  function legacy(getAnswer) {
    const badges = [];
    let n = 0;
    const ctx = sandbox({
      fns: ['createDriveJobFolder', 'createDriveFolderNow', 'driveFolderPending',
            '_driveFolderFailed', '_backendErrorKind', 'dashUtilityBar'],
      vars: ['_driveFolderInFlight', '_estStoreState'],
      stubs: {
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/AAA/exec',
        DRIVE_FOLDER_ID: '',
        showSyncBadge: (m) => badges.push(String(m)),
        openClientDashboard: () => {}, saveJobs: () => {}, syncJobToSheets: () => {},
        estimateStore: {},
        console: { warn() {}, log() {}, error() {} },
        // First call is the POST and it REJECTS, exactly as an older deployment does.
        // Second is the legacy GET.
        fetch: () => (++n === 1 ? syncErr(new Error('network'))
                                : (getAnswer ? syncOk({ json: () => syncOk(getAnswer) }) : syncErr(new Error('network')))),
      },
    });
    const job = { id: 7, name: 'Butler' };
    ctx.jobs.push(job);
    ctx.createDriveJobFolder(job);
    return { ctx, job, badges, calls: n };
  }

  group('⚠⚠ the legacy GET fallback ends the attempt — both of its arms', () => {
    const won = legacy(HAPPY);
    eq(won.calls, 2, 'the POST rejected and the legacy GET went out');
    eq(won.ctx.driveFolderPending(7), false,
       '⚠⚠ the marker clears when the LEGACY GET succeeds — it used to leak, leaving the job reading "Creating…" forever');
    eq(won.job.driveFolder, 'https://drive.google.com/drive/folders/FOLDER1', 'and the folder is recorded');
    const wb = won.ctx.dashUtilityBar(won.job).filter((a) => /Drive/.test(a.label));
    ok(!!wb[0].href, 'the control is a link');

    const lost = legacy(null);
    eq(lost.calls, 2, 'both calls went out');
    eq(lost.ctx.driveFolderPending(7), false,
       '⚠⚠ and it clears when the legacy GET fails too — otherwise the repair door is withheld on exactly the job that needs it');
    const lb = lost.ctx.dashUtilityBar(lost.job).filter((a) => /Drive/.test(a.label));
    ok(/Create Drive folder/.test(lb[0].label), 'the repair door is offered');
    ok(!!lb[0].call, 'as a real button');
    lost.badges.length = 0;
    lost.ctx.createDriveFolderNow(7);
    ok(!lost.badges.some((b) => /being created right now/.test(b)),
       '⚠ and pressing it is no longer refused — the attempt really is over');
  });

  group('⚠ the Drive root fallback must not come back', () => {
    const barBody = src.slice(src.indexOf('function dashUtilityBar('),
                              src.indexOf('function _dashUtilityBarHtml('));
    lacks(barBody, "'https://drive.google.com/drive/folders/' + DRIVE_FOLDER_ID",
      '⚠⚠ a folderless job never links to the Drive ROOT — that is what made a real failure look like a working button');
    has(barBody, 'createDriveFolderNow(', 'it offers to create the folder instead');
  });
};
