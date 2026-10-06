'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// NO WALKTHROUGH NOTES FOLDER IN DRIVE (Anthony, 2026-10-06: "in separate files in Google drive they really
// serve no useable purpose"). Three writers filed the walkthrough to a client's Walkthrough Notes subfolder:
// a dated .txt every time a room note was saved (so edits piled up), and on Save Estimate and on approval a .txt
// per room and collection plus <HVL>_walkthrough.json. Nothing read any of it. The notes live on the estimate and
// are read in the Job Plan's rooms, the Walkthrough view, Agent One's request and the INTERNAL worksheet.
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, source, domStub } = require('./harness');

module.exports = ({ group, ok }) => {
const attempt = (f) => { try { return f(); } catch (e) { ok(false, 'threw: ' + e.message); } };

const SRC = source();
const live = SRC.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
group('Saving a room note files nothing to Drive', () => {
  ok(live.length > SRC.length * 0.5, 'the comment-stripped source is still most of the file');
  const uploads = [];
  const S = sandbox({ fns: ['saveNotesModal'], stubs: {
    document: domStub({ 'notes-modal-text': 'Piano, sheet music in bench', 'note-r1': '', 'e-job': '7' }),
    jobs: [{ id: 7, hvlId: 'HVL-7', driveFolder: 'https://drive.google.com/drive/folders/F', driveSubfolders: { 'Walkthrough Notes': { id: 'W' } } }],
    closeNotesModal() {}, calcAll() {}, _cleanName: (s) => s, _todayStr: () => '2026-10-06',
    uploadToDrive(...a) { uploads.push(a); }, fetchSubfolderIds(j, cb) { cb(); } } });
  S._notesRoomId = 'r1';
  attempt(() => S.saveNotesModal());
  ok(S.document.getElementById('note-r1').value === 'Piano, sheet music in bench', 'the note lands on the room');
  ok(uploads.length === 0, 'and nothing is uploaded (got ' + uploads.length + ')');
});

group('No writer and no folder for walkthrough notes', () => {
  ok(!/function uploadWalkthroughNotesToDrive\(/.test(SRC), 'uploadWalkthroughNotesToDrive is gone');
  ok(!/uploadWalkthroughNotesToDrive\(/.test(live), 'and nothing calls it');
  ok(live.indexOf("'Walkthrough Notes'") < 0, 'no live code names a Walkthrough Notes subfolder');
  ok(live.indexOf('_walkthrough.json') < 0, 'no walkthrough.json is written');
});
};
