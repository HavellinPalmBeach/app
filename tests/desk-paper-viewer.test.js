'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE DESK'S MORE ▾ PAPERS OPEN ON SCREEN FIRST (2026-10-26; Anthony, at the desk: "I'm not sure what the functionality is
// supposed to be here with the more dropdown, like the as found record ... as soon as I cancel or I launch a printer ... it
// just disappears"). The As-Found Record, the Court Inventory, the Trust Schedule, the Appraisal Worklist and the Incident
// Record went straight to the print dialog, and Cancel left nothing on screen. Each now opens in the document viewer
// (_printDocument's `view`), titled by the paper's name with its client under it; the viewer's Print / Save PDF prints the page
// it holds and the viewer comes back once the dialog closes (`after`), Cancel included; Close drops it.
//   · Every other caller of _printDocument prints straight away, as before; a test's stub still receives the page and title.
// Driven on the real _printDocument, _openViewer, printDocViewer and closeDocViewer over the DOM stub, with the timers held so
// the order is read: the page set, the dialog, the restore.
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, fn, domStub } = require('./harness');

const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const count = (h, n) => String(h).split(n).length - 1;

module.exports = function ({ group, ok, eq, has, lacks }) {
  function rig() {
    const timers = [], prints = [];
    const dom = domStub({});
    const S = sandbox({
      fns: ['_printDocument', '_openViewer', 'printDocViewer', 'closeDocViewer'],
      vars: ['_docViewerSpec'],
      stubs: {
        document: Object.assign(dom, { title: 'Havellin Palm Beach — Clients & Estimator — INTERNAL' }),
        window: { print() { prints.push({ html: dom.getElementById('print-target').innerHTML, title: dom.title,
                                          overlay: dom.getElementById('doc-viewer-modal').style.display }); } },
        setTimeout: (f) => { timers.push(f); return timers.length; },
        alert() {}, docAction() { ok(false, 'a desk paper has no docAction behind it'); },
      },
    });
    const run = () => { while (timers.length) timers.shift()(); };
    return { S, dom, timers, prints, run, el: (id) => dom.getElementById(id) };
  }
  const JOB = { id: 7, name: 'Estate of Harold Brennan', addr: '14 Seaspray Ave' };
  const PAGE = '<div style="padding:20px;">As-Found Record — Living Room · 4 photographs</div>';
  const TITLE = 'HVL-0007 - Havellin As-Found Record - 14 Seaspray Ave - Oct 26 2026';

  group('V1 · view: the page opens in the viewer, named, with its client, and nothing is printed');
  {
    const R = rig();
    const r = R.S._printDocument(PAGE, TITLE, { view: true, job: JOB, label: 'As-Found Record' });
    ok(r, 'it opens');
    eq(R.el('doc-viewer-modal').style.display, 'flex', '⚠⚠ the viewer is on screen');
    eq(R.el('doc-viewer-title').textContent, 'As-Found Record', 'titled by the paper’s name, not the file name');
    eq(R.el('doc-viewer-sub').textContent, 'Estate of Harold Brennan · 14 Seaspray Ave', 'its client under it');
    has(R.el('doc-viewer-body').innerHTML, PAGE, 'the page itself, to read');
    eq(R.el('doc-viewer-print').style.display, '', 'with Print / Save PDF offered');
    R.run();
    eq(R.prints.length, 0, '⚠ nothing is printed until Print / Save PDF');
    eq(R.el('print-target').innerHTML, '', 'and the print target is untouched');
  }

  group('V2 · Print / Save PDF: the page it holds, the viewer out of the way, then back once the dialog closes');
  {
    const R = rig();
    R.S._printDocument(PAGE, TITLE, { view: true, job: JOB, label: 'As-Found Record' });
    R.S.printDocViewer();
    eq(R.el('doc-viewer-modal').style.display, 'none', 'the viewer steps aside for the dialog');
    R.run();
    eq(R.prints.length, 1, 'the dialog opens once');
    eq((R.prints[0] || {}).html, PAGE, '⚠⚠ with the page the viewer held');
    eq((R.prints[0] || {}).title, TITLE, 'named by its file name (the PDF a Save makes)');
    eq((R.prints[0] || {}).overlay, 'none', 'the viewer is not on the printed page');
    eq(R.el('doc-viewer-modal').style.display, 'flex', '⚠⚠ and it comes back once the dialog closes (Cancel included)');
    has(R.el('doc-viewer-body').innerHTML, PAGE, 'still holding the page');
    eq(R.el('print-target').innerHTML, '', 'the print target cleared');
    eq(R.dom.title, 'Havellin Palm Beach — Clients & Estimator — INTERNAL', 'the tab’s title restored');
    // Printed twice: the same page each time.
    R.S.printDocViewer(); R.run();
    eq(R.prints.map((p) => p.html), [PAGE, PAGE], 'a second print prints the same page');
    // Close drops it.
    R.S.closeDocViewer();
    eq([R.el('doc-viewer-modal').style.display, R.el('doc-viewer-body').innerHTML], ['none', ''], 'Close takes the page away');
  }

  group('V3 · closed while the dialog is up: it stays closed; another document opened meanwhile is left alone');
  {
    const R = rig();
    R.S._printDocument(PAGE, TITLE, { view: true, job: JOB, label: 'As-Found Record' });
    R.S.printDocViewer();
    R.S.closeDocViewer();
    R.run();
    eq(R.prints.length, 1, 'the print still happens');
    eq(R.el('doc-viewer-modal').style.display, 'none', '⚠ the closed viewer does not come back');
    const S2 = rig();
    S2.S._printDocument(PAGE, TITLE, { view: true, job: JOB, label: 'As-Found Record' });
    S2.S.printDocViewer();
    S2.S._printDocument('<p>Other</p>', 'Other', { view: true, job: JOB, label: 'Appraisal Worklist' });
    S2.run();
    eq(S2.el('doc-viewer-title').textContent, 'Appraisal Worklist', 'the newer paper keeps the viewer');
  }

  group('V4 · straight printing is unchanged for every other caller');
  {
    const R = rig();
    R.S._printDocument(PAGE, TITLE);
    eq(R.el('doc-viewer-modal').style.display || 'none', 'none', 'no viewer');
    R.run();
    eq(R.prints.length, 1, 'printed at once, as before');
    const after = []; const R2 = rig();
    R2.S._printDocument(PAGE, TITLE, { after: () => after.push(1) }); R2.run();
    eq(after, [1], 'and `after` runs once the dialog has closed');
  }

  group('V5 · the five More ▾ papers open in the viewer; the work bar’s papers and the rest print straight away');
  {
    const VIEW = { printAsFoundRecord: "'As-Found Record'", printCourtInventory: "'Court Inventory'", printTrustSchedule: "'Trust Schedule'",
                   printAppraisalWorklist: "'Appraisal Worklist'", printIncidentRecord: 'title' };
    Object.keys(VIEW).forEach((f) => {
      const b = noComments(fn(f));
      eq(count(b, '_printDocument('), 1, f + ': one print call');
      has(b, '{ view: true, job: job, label: ' + VIEW[f] + ' }', '⚠ ' + f + ' opens in the viewer, named');
    });
    ['printContentsList', 'printEstateInventoryReport', 'printApprovalRequest', 'printContentsRecord', 'printDispositionLedger'].forEach((f) => {
      lacks(noComments(fn(f)), 'view: true', f + ' prints straight away (not asked)');
    });
    has(noComments(fn('printDocViewer')), 'if (s.paper) {', 'the viewer prints a desk paper from the page it holds');
  }
};
