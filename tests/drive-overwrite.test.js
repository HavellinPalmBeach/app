'use strict';
// Filing a document to Drive REPLACES the copy that is there. On a Shared Drive it did not.
//
// Anthony, 2026-09-09: "it looks like save to drive creates dupes endlessly if you keep
// hitting it. should a button even be there or do we automatically save estimates to drive
// in the background?"
//
// Two answers, and the second is the real fix.
//
// THE BUG: uploadHtmlToDrive removed the previous copy with folder.getFilesByName(name),
// which on a SHARED DRIVE can return an empty iterator for files that are plainly sitting
// there. The "remove the old copy first" loop then ran zero times and every save created
// another file — silently, because creating a file always succeeds. This project has hit
// exactly this class of failure before: drive.files.get answering "File not found" for a
// file DriveApp opens fine, until supportsAllDrives was passed (see _driveThumbnail).
//
// THE DESIGN ANSWER: the estimate already files itself — checkPin calls
// saveFolderEstimate(true) on approval, and editEstimateFromCE clears the stamp so a
// re-approval re-files. So on the normal path there was nothing for a person to press, and
// the button could only ever produce the same document a second time.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { matchBrace } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', 'havellin.html'), 'utf8');

function gsFn(src, name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(src);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = src.indexOf('{', re.lastIndex);
  const close = matchBrace(src, open);
  if (close === -1) throw new Error('unbalanced: ' + name);
  return src.slice(start, close + 1);
}

// A fake Drive. `sharedDrive: true` reproduces the reported failure exactly — DriveApp's
// name lookup answers empty while the files are really in the folder and the Drive API,
// asked with supportsAllDrives, finds them.
function fakeDrive({ sharedDrive = false, canUpdateInPlace = true } = {}) {
  let nextId = 1;
  const files = [];                       // {id, name, parent, bytes, created, trashed}
  const log = { updates: [], creates: [], listArgs: [] };

  function wrap(f) {
    return {
      getId: () => f.id,
      getName: () => f.name,
      getUrl: () => 'https://drive.google.com/file/d/' + f.id + '/view',
      getDateCreated: () => f.created,
      getLastUpdated: () => f.created,
      setTrashed: (t) => { f.trashed = !!t; },
      _raw: f,
    };
  }
  const live = (folderId, name) =>
    files.filter((f) => !f.trashed && f.parent === folderId && (name == null || f.name === name));

  const folder = {
    getId: () => 'FOLDER',
    getName: () => 'Estimates',
    getFilesByName(name) {
      // The whole bug: on a Shared Drive this comes back empty.
      const hits = sharedDrive ? [] : live('FOLDER', name);
      let i = 0;
      return { hasNext: () => i < hits.length, next: () => wrap(hits[i++]) };
    },
    getFiles() {
      const hits = live('FOLDER', null);
      let i = 0;
      return { hasNext: () => i < hits.length, next: () => wrap(hits[i++]) };
    },
    createFile(blob) {
      const f = { id: 'F' + nextId++, name: blob.getName(), parent: 'FOLDER',
                  bytes: blob._bytes, created: new Date(Date.now() + files.length), trashed: false };
      files.push(f);
      log.creates.push(f.name);
      return wrap(f);
    },
  };

  const ctx = {
    console,
    Logger: { log() {} },
    Utilities: {
      newBlob: (content, type, name) => {
        let _n = name, _b = String(content);
        const b = {
          getName: () => _n,
          setName(n) { _n = n; return b; },
          getAs: () => b,
          get _bytes() { return _b; },
        };
        return b;
      },
    },
    DriveApp: {
      getFolderById: () => folder,
      getFileById: (id) => {
        const f = files.find((x) => x.id === id);
        if (!f) throw new Error('File not found: ' + id);
        return wrap(f);
      },
    },
    Drive: {
      Files: {
        list(args) {
          log.listArgs.push(args);
          // The real API only answers for a Shared Drive when told to.
          if (sharedDrive && !(args.supportsAllDrives && args.includeItemsFromAllDrives)) return { items: [] };
          const m = /title = '((?:[^'\\]|\\.)*)'/.exec(args.q || '');
          const name = m ? m[1].replace(/\\'/g, "'") : null;
          return { items: live('FOLDER', name).map((f) => ({ id: f.id })) };
        },
        update(resource, fileId, blob, args) {
          if (!canUpdateInPlace) throw new Error('Insufficient permissions');
          const f = files.find((x) => x.id === fileId);
          if (!f) throw new Error('File not found');
          f.bytes = blob._bytes;
          log.updates.push({ fileId, args });
          return { id: fileId };
        },
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(gsFn(GS, '_filesNamedInFolder') + '\n' + gsFn(GS, 'uploadHtmlToDrive'),
                  ctx, { filename: 'main-sync.gs (extracted)' });
  return { ctx, files, log, liveNames: () => live('FOLDER', null).map((f) => f.name).sort() };
}

const NAME = 'HVL-2609-D5HF - Havellin Service Estimate.html';
const PDF = 'HVL-2609-D5HF - Havellin Service Estimate.pdf';

module.exports = function ({ group, ok, eq, has, lacks }) {

  group('pressing it ten times leaves ONE file — on an ordinary folder');
  {
    const d = fakeDrive({ sharedDrive: false });
    for (let i = 0; i < 10; i++) d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>v' + i + '</p>');
    eq(d.liveNames(), [PDF], 'ten saves, one file');
    eq(d.files.filter((f) => !f.trashed)[0].bytes, '<p>v9</p>', 'holding the newest content');
  }

  group('⚠ and on a SHARED DRIVE, which is where the estate folders actually live');
  {
    // Without the fix this is 10 files. It is the exact reported symptom.
    const d = fakeDrive({ sharedDrive: true });
    for (let i = 0; i < 10; i++) d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>v' + i + '</p>');
    eq(d.liveNames(), [PDF], 'still one file, where getFilesByName answers nothing');
    ok(d.log.listArgs.length > 0, 'because the Drive API is asked as well as DriveApp');
    ok(d.log.listArgs.every((a) => a.supportsAllDrives && a.includeItemsFromAllDrives),
       'and asked with BOTH shared-drive flags — either one missing and it answers empty');
  }

  group('the file keeps its id, because its link has been handed out');
  {
    const d = fakeDrive({ sharedDrive: true });
    const first = d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>one</p>');
    const again = d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>two</p>');
    eq(again.fileId, first.fileId, 'a re-file updates in place rather than replacing the id');
    eq(again.fileUrl, first.fileUrl, 'so job.estimateDriveUrl still points at a live file');
    ok(again.replaced, 'and the response says it replaced rather than created');
    eq(d.files.find((f) => f.id === first.fileId).bytes, '<p>two</p>', 'with the new content');
  }

  group('a folder that ALREADY accumulated duplicates collapses on the next save');
  {
    const d = fakeDrive({ sharedDrive: true });
    // Six copies, the way the folder looks today.
    for (let i = 0; i < 6; i++) d.files.push({ id: 'OLD' + i, name: PDF, parent: 'FOLDER',
                                               bytes: 'old' + i, created: new Date(1000 + i), trashed: false });
    const res = d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>fresh</p>');
    eq(d.liveNames(), [PDF], 'six become one');
    eq(res.duplicatesRemoved, 5, 'and the response says how many it cleared');
    eq(res.fileId, 'OLD0', 'keeping the OLDEST — that is the id anyone was given a link to');
    eq(d.files.find((f) => f.id === 'OLD0').bytes, '<p>fresh</p>', 'refreshed to the current document');

    // Trashed, never deleted. Photographs and client documents get Drive's 30-day undo —
    // the same rule trashJobFoldersConfirm follows.
    ok(d.files.filter((f) => f.trashed).length === 5, 'the other five are trashed, not destroyed');
  }

  group('no in-place update permission still leaves one file');
  {
    const d = fakeDrive({ sharedDrive: true, canUpdateInPlace: false });
    d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>a</p>');
    const two = d.ctx.uploadHtmlToDrive('FOLDER', NAME, '<p>b</p>');
    eq(d.liveNames(), [PDF], 'falls back to trash-then-create rather than duplicating');
    ok(!two.replaced, 'and reports honestly that it did not replace in place');
  }

  group('two different documents in one folder do not collide');
  {
    // The client estimate and the INTERNAL worksheet share a folder and must not evict
    // each other — the whole reason estimateDocNames gives them distinct names.
    const d = fakeDrive({ sharedDrive: true });
    d.ctx.uploadHtmlToDrive('FOLDER', 'HVL-1 - Havellin Service Estimate.html', '<p>client</p>');
    d.ctx.uploadHtmlToDrive('FOLDER', 'HVL-1 - Estimate Worksheet (INTERNAL).html', '<p>internal</p>');
    d.ctx.uploadHtmlToDrive('FOLDER', 'HVL-1 - Havellin Service Estimate.html', '<p>client v2</p>');
    eq(d.liveNames(), ['HVL-1 - Estimate Worksheet (INTERNAL).pdf', 'HVL-1 - Havellin Service Estimate.pdf'],
       'both survive; only the re-filed one is replaced');
  }

  group('a name with an apostrophe does not break the Drive query');
  {
    const d = fakeDrive({ sharedDrive: true });
    const n = "O'Hara - Havellin Service Estimate.html";
    d.ctx.uploadHtmlToDrive('FOLDER', n, '<p>a</p>');
    d.ctx.uploadHtmlToDrive('FOLDER', n, '<p>b</p>');
    eq(d.liveNames(), ["O'Hara - Havellin Service Estimate.pdf"],
       'the apostrophe is escaped, so the lookup still matches and does not duplicate');
  }

  group('the deployment says which vintage it is, and cannot lie about it');
  {
    // ⚠ THIS IS THE GUARD FOR THE MOST EXPENSIVE FAILURE IN THIS PROJECT'S HISTORY.
    // Three features shipped against a deployment that did not have them — saveMedia
    // (the inventory manifest silently never synced), htmlToPdf (no PDF on any client
    // email, reported three separate times) and the Shared-Drive fix to uploadHtmlToDrive
    // (duplicate estimates piling up). The cause, found only from a screenshot of the
    // browser address bar: the .gs was being copied from a DEAD BRANCH SIX WEEKS STALE.
    // The deploy itself was done correctly every time. Nothing anywhere named the vintage
    // that was answering, so a perfect redeploy of ancient code looked like a fresh one.

    // The declared lists are what the app checks itself against, so a list that drifts from
    // the dispatch beneath it is worse than no list — it would report a capability the
    // deployment does not have. Both directions are asserted.
    const declaredActions = JSON.parse(
      '[' + /var BACKEND_ACTIONS = \[([\s\S]*?)\]/.exec(GS)[1].replace(/'/g, '"').replace(/,\s*$/, '') + ']');
    const declaredTypes = JSON.parse(
      '[' + /var BACKEND_TYPES = \[([\s\S]*?)\]/.exec(GS)[1].replace(/'/g, '"').replace(/,\s*$/, '') + ']');

    const doPost = GS.slice(GS.indexOf('function doPost('));
    const dispatch = doPost.slice(0, doPost.indexOf('\n}\n'));

    const realActions = [...dispatch.matchAll(/data\.action === '([^']+)'/g)].map(m => m[1]);
    const realTypes = [...dispatch.matchAll(/type === '([^']+)'/g)].map(m => m[1]);

    eq(declaredActions.slice().sort(), [...new Set(realActions)].sort(),
       'BACKEND_ACTIONS matches every action doPost dispatches');
    eq(declaredTypes.slice().sort(), [...new Set(realTypes)].sort(),
       'BACKEND_TYPES matches every type doPost dispatches');

    // doGet must answer it, or the app can never tell a current deployment from an old one.
    const doGet = GS.slice(GS.indexOf('function doGet('));
    has(doGet.slice(0, doGet.indexOf('\n}\n')), "action === 'version'",
        'doGet answers the version probe');
    has(GS, 'var BACKEND_VERSION', 'and the file carries a version to report');

    // Everything the app actually needs must be in the declared list, or the banner fires
    // against a deployment that is in fact current — crying wolf, which is how a real
    // warning gets ignored.
    const needs = JSON.parse('[' + /var BACKEND_NEEDS = \[([^\]]*)\]/.exec(APP)[1].replace(/'/g, '"') + ']');
    const needTypes = JSON.parse('[' + /var BACKEND_NEEDS_TYPES = \[([^\]]*)\]/.exec(APP)[1].replace(/'/g, '"') + ']');
    needs.forEach(a => ok(declaredActions.includes(a), 'the current backend provides ' + a));
    needTypes.forEach(t => ok(declaredTypes.includes(t), 'the current backend provides ' + t));

    // Every named requirement has to be explainable to a person in terms of what BREAKS.
    // A banner listing function names tells the reader nothing they can act on.
    needs.concat(needTypes).forEach(a =>
      ok(new RegExp(a + ':').test(APP), 'BACKEND_FEATURE_COST says what is lost without ' + a));

    // The check is a READ. If it could write, a stale-deployment probe would become a way
    // to make things worse on exactly the deployment that is already misbehaving.
    const cbv = APP.slice(APP.indexOf('function checkBackendVersion('));
    const cbvBody = cbv.slice(0, cbv.indexOf('\n}\n'));
    lacks(cbvBody, 'method:', 'the probe never POSTs');
    lacks(cbvBody, 'postSyncBadge', 'and never queues a write');
    has(cbvBody, '.catch(', 'and stays silent when the backend cannot be reached');
  }

  group('the estimate files itself, so the button is only the retry');
  {
    // The design half of Anthony's question. checkPin files on approval; the control is
    // shown only when that did not leave a stamp, and hidden the moment one exists.
    has(APP, "saveFolderEstimate(true)", 'approval files the estimate automatically');
    has(APP, "btnDriveEst.style.display = (ceJob && ceJob.estimateDriveAt) ? 'none' : 'inline-block'",
        'so the button is hidden once the estimate is on Drive');
    lacks(APP, "btnDriveEst.style.display = 'inline-block';",
          'no unconditional show survives — that is what made it pressable ten times');
    // editEstimateFromCE clears the stamp, which is what brings the retry back when the
    // filed copy is genuinely stale.
    has(APP, 'estimateDriveAt', 'the stamp is what both the button and the banner read');
  }
};
