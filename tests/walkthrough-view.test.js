'use strict';
// THE WALKTHROUGH RECORD, AND THE BUILD ESTIMATE DROPDOWN THAT SHOULD NOT HOLD A WON JOB
// (2026-09-19).
//
// Ashley's report, via Anthony: *"after we build an estimate there's no real easy way to go
// back and look at that estimate, like the rooms that are ticked to the notes that are taken
// … I might do that ahead of going to the client's house for the first day of the job just to
// refresh myself with what's going on there."*
//
// ⚠⚠ MEASURED BEFORE ANYTHING WAS BUILT, AND IT IS WORSE THAN THE REPORT. `privateNote` — the
// dictated note about access, hoarding and family dynamics, which is precisely what somebody
// re-reading this in the car needs — had EXACTLY TWO READERS in 31,000 lines: the textarea it
// is typed into, and the line in `restoreEstimateToUI` that writes it back into that same
// textarea. Per-room notes were barely better: they reach the Drive worksheet and a set of
// .txt sidecars, and no on-screen surface outside the Build Estimate room grid. The record
// was WRITE-ONLY on screen, and the only route back to it landed on a form that is locked by
// the time anybody wants to read it.
//
// ⚠⚠ AND THE DROPDOWN FILTER IS UNSAFE WITHOUT `forceJobId` — that is the load-bearing half of
// this file. A <select> silently rejects a value with no matching option, so a filtered-out
// job leaves `e-job` EMPTY, and fifteen downstream reads of `parseInt(e-job.value)` resolve to
// 0 — including the one that stamps `jobId` onto the saved snapshot. `dashEditEstimate` revokes
// the approval but leaves the job WON, so the dashboard's edit door lands on exactly that case
// every time. The test below models the browser's own select rule rather than trusting the
// stub, because the stub would accept the value and prove nothing.

const { source, fn, sandbox, domStub } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ── fixtures ───────────────────────────────────────────────────────────────
  const JOB = { id: 7, hvlId: 'HVL-0007', name: 'Butler', addr: '69 Beach Blvd, Palm Beach FL',
    svc: 'cleanout', tc: 'Ashley Jerome', status: 'won', won: true };

  // A live (unapproved) estimate: rooms carry `tcH`/`psH`/`spcl`.
  const LIVE = () => ({
    preparedBy: 'Ashley Jerome',
    privateNote: 'Son & daughter disagree about the silver.\nSide gate code 4417 — front door sticks.',
    rooms: [
      { idx: 4, section: 'Kitchen & Utility', name: 'Kitchen', vol: 4, cplx: 3, tcH: 3.2, psH: 8.1, note: 'Butler’s pantry <b>packed</b> to the ceiling & then some' },
      { idx: 1, section: 'Entry & Living', name: 'Foyer', vol: 1, cplx: 1, tcH: 0.4, psH: 1.1, note: '' },
      { idx: 9, section: 'Kitchen & Utility', name: 'Laundry Room', vol: 0, cplx: 0, tcH: 0, psH: 0, note: 'Client keeping this', excluded: true },
    ],
    collections: [{ name: 'Sterling flatware', dispLabel: 'Auction', note: 'Gorham, monogrammed' }],
    vehicles: [{ desc: '1960 Corvette Stingray', year: '1960', collector: true, titleLocated: false, note: 'In the detached garage' }],
    prepItems: [],
  });

  // The frozen copy `buildLockSnapshot` writes at approval. ⚠ IT RENAMES THE HOUR FIELDS.
  const LOCKED = () => Object.assign(LIVE(), {
    lockedAt: '2026-09-14T15:04:00.000Z', lockedBy: 'Anthony Graziano',
    lockedRooms: [
      { section: 'Entry & Living', name: 'Foyer', vol: 2, cplx: 1, estimated_tc_hours: 0.9,
        estimated_ps_hours: 2.2, special_items: true, note: 'Chandelier needs a lift', excluded: false },
    ],
    lockedCollections: [{ name: 'Sterling flatware', dispLabel: 'Auction', note: 'Gorham, monogrammed' }],
  });

  const WT_FNS = ['walkthroughHtml', 'walkthroughSource', '_wtRoomHrs', 'esc', 'fmtDate2',
    'svcLabelOf', '_vehicleLineName'];
  const WT_VARS = ['SVC_LABELS'];

  function build(est, job) {
    const c = sandbox({ fns: WT_FNS, vars: WT_VARS, stubs: { document: domStub({}) } });
    return c.walkthroughHtml(job || JOB, est);
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ the private walkthrough note finally has a reader');
  {
    // The whole reason this exists. Reverting the private block fails here.
    const h = build(LIVE());
    has(h, 'Private walkthrough notes', 'the note gets its own band');
    has(h, 'Side gate code 4417', 'and the note itself is on the page');
    has(h, 'Son &amp; daughter disagree', 'escaped — it is free text a person dictated');
    lacks(h, 'Son & daughter disagree', 'never raw, whatever a client name or a note contains');

    // ⚠ FIRST, ABOVE THE ROOM TABLE, AND THAT IS NOT LAYOUT. It is what somebody reading
    // this in the car actually needs; under a table nobody scrolls to would rebuild the
    // defect this closes.
    ok(h.indexOf('Private walkthrough notes') < h.indexOf('Rooms walked'),
      'and it is above the rooms, not buried under them');

    // An estimate with no private note prints no band — an empty heading explaining an
    // absence is the standing client-copy rule applied to our own screen.
    const bare = build(Object.assign(LIVE(), { privateNote: '   ' }));
    lacks(bare, 'Private walkthrough notes', 'a job with no note renders no band at all');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ it is NOT a client document, and nothing can make it one');
  {
    // ⚠ THE LOAD-BEARING CLAIM IN THIS FILE, after the dropdown. Registering it in
    // DOC_ACTIONS would give it `send` and `file`, and `file` writes into the CLIENT'S OWN
    // Drive folder — which is exactly how the internal worksheet reached a client on
    // 2026-09-08. This document carries the private note verbatim.
    const reg = src.slice(src.indexOf('var DOC_ACTIONS = {'), src.indexOf('var DOC_STAGE_WORD'));
    lacks(reg, 'walkthrough', 'the walkthrough is not a kind in the document registry');
    const wt = noComments(fn('walkthroughHtml'));
    lacks(wt, 'docAction', 'and the builder reaches no document verb');
    lacks(wt, 'uploadToDrive', 'nothing in it writes to Drive');
    lacks(wt, 'uploadHtmlToDrive', 'by either upload path');

    // The banner is what tells a reader which kind of document they are holding.
    has(build(LIVE()), 'not a client document', 'the page stamps itself internal, on its face');

    // ⚠ DOM-FREE, so these tests read the real wording rather than grepping rendered HTML.
    lacks(wt, 'document.getElementById', 'the builder reads no element');
    lacks(wt, 'innerHTML', 'and writes none');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ the LOCKED copy wins, and the header says which one is on screen');
  {
    const h = build(LOCKED());
    has(h, 'Chandelier needs a lift', 'an approved estimate shows the frozen snapshot');
    lacks(h, 'packed</b> to the ceiling', 'not the live rooms, which an edit could since have moved');
    has(h, 'Locked', 'and it says so');
    has(h, 'Anthony Graziano', 'naming who locked it');

    // ⚠ THE HOUR FIELDS ARE RENAMED IN THE LOCK SNAPSHOT (`estimated_tc_hours` against the
    // live record's `tcH`), so a reader that knows one shape prints 0.0 on half the jobs —
    // silently, which is the worst way for a number to be wrong.
    has(h, '0.9 TC', 'the locked record’s own hour fields are read');
    has(h, '2.2 PS', 'on both columns');
    has(h, 'special items', 'and `special_items` is read beside `spcl`');

    // A draft says it is a draft. Reading a draft as though it were the quote is the
    // failure that matters in the other direction.
    const d = build(LIVE());
    has(d, 'has not been approved', 'an unapproved estimate says its scores can still change');
    lacks(d, 'Locked ', 'and does not claim to be locked');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the rooms read the way the walkthrough ran');
  {
    const h = build(LIVE());
    // ⚠ WALKTHROUGH ORDER (`idx` ascending), the rule the Job Plan already follows — sorting
    // any other way reads as random to the person who walked the house.
    ok(h.indexOf('Foyer') < h.indexOf('Kitchen'), 'rooms run in walkthrough order, not as stored');
    has(h, 'Entry &amp; Living', 'grouped under their section');
    has(h, 'Butler\u2019s pantry', 'per-room notes render');
    // ⚠ A NOTE IS FREE TEXT SOMEBODY DICTATED OR TYPED, so it is escaped on the way in.
    // This page is opened straight off a client record; markup in a note that RENDERED
    // would be the app executing whatever a walkthrough happened to contain.
    has(h, '&lt;b&gt;packed&lt;/b&gt;', 'and are escaped — markup in a note never renders');
    has(h, '&amp; then some', 'ampersands with them');
    lacks(h, '<b>packed</b>', 'the raw tag is nowhere on the page');
    has(h, '3.2 TC', 'with the hours the room was priced at');

    // ⚠ AN EXCLUDED ROOM IS AN ANSWER, NOT A GAP. `setRoomState` clears and disables its
    // scores, so printing "0 / 5" against it reads as a room scored empty rather than one
    // the client is handling themselves.
    has(h, 'Out of scope', 'an excluded room says so');
    has(h, 'Client keeping this', 'and still carries its note, which is the reason why');
    const lr = h.slice(h.indexOf('Laundry Room'), h.indexOf('Laundry Room') + 400);
    lacks(lr, '0 / 5', 'rather than printing a zero score it never had');

    // The count reconciles what is on the page, so a half-scored walkthrough is visible.
    has(h, '2 rooms in scope', 'the footer counts what is in scope');
    has(h, '1 out of scope', 'separately from what is not');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ one heading per section, whatever order the record is in');
  {
    // ⚠⚠ FOUND IN THE BROWSER, NOT BY A TEST, AND IT IS THE CASE THAT ACTUALLY HAPPENS.
    // `includedRooms` pushes every in-scope room first and then appends the EXCLUDED ones,
    // so an out-of-scope room from an early section arrives last. A lock snapshot written
    // before 2026-09-19 carries no `idx` to sort it back, so a renderer that walks and
    // compares prints its section heading a SECOND time — on a prep job with the guest
    // wing and the laundry out of scope, which is Anthony's own example.
    const noIdx = { rooms: [], lockedAt: '2026-09-01T00:00:00.000Z', lockedBy: 'A',
      lockedRooms: [
        { section: 'Entry & Living', name: 'Foyer', vol: 1, cplx: 1, estimated_tc_hours: 0.4, estimated_ps_hours: 1 },
        { section: 'Kitchen & Utility', name: 'Kitchen', vol: 4, cplx: 3, estimated_tc_hours: 3, estimated_ps_hours: 8 },
        { section: 'Entry & Living', name: 'Half Bath', vol: 0, cplx: 0, estimated_tc_hours: 0, estimated_ps_hours: 0, excluded: true },
      ] };
    const h = build(noIdx);
    eq((h.match(/Entry &amp; Living/g) || []).length, 1, 'a section appears once, not once per run of rooms');
    eq((h.match(/wt-sec/g) || []).length, 2, 'two sections, two headings');
    ok(h.indexOf('Half Bath') > h.indexOf('Foyer') && h.indexOf('Half Bath') < h.indexOf('Kitchen'),
      'and the stray excluded room is pulled back under its own section');

    // ⚠ THE RECORD GAINS THE ORDERING KEY TOO, so a locked estimate sorts by the same rule
    // as a live one rather than relying on array order. One rule, not two.
    const lock = noComments(fn('buildLockSnapshot'));
    has(lock, 'idx: r.idx', 'the lock snapshot carries the room index');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('collections, vehicles and prep scope notes come with it');
  {
    const h = build(LIVE());
    has(h, 'Sterling flatware', 'notable collections are listed');
    has(h, 'Gorham, monogrammed', 'with their notes');
    has(h, 'Auction', 'and the disposition recorded at the walkthrough');
    has(h, '1960 Corvette Stingray', 'vehicles too');
    has(h, 'title to be located', 'flagged the way the estimate flagged them');
    // ⚠ `_vehicleLineName`, never year + desc joined here. Two copies of that rule is what
    // printed "2025 2025 Mercedes E63" in a real client workbook on 2026-08-24.
    lacks(noComments(fn('walkthroughHtml')), 'v.year', 'the vehicle name is not re-joined here');

    // A fee-only prep job scores no rooms at all — the scope notes ARE its walkthrough.
    const prep = build({ rooms: [], prepItems: [{ type: 'Painting', note: 'Interior only, no trim' }] });
    has(prep, 'Interior only, no trim', 'a prep job’s scope notes are the walkthrough');
    has(prep, 'No rooms were scored', 'and the empty room table says why rather than just being blank');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE VIEWER WITHHOLDS PRINT ON AN INTERNAL PAGE');
  {
    // The modal is shared with the five client documents, so the Print button has to be
    // set in BOTH directions on every open — a viewer that only ever hides it leaves the
    // next client document with no way to print.
    const ov = noComments(fn('_openViewer'));
    has(ov, "getElementById('doc-viewer-print')", 'the opener reaches the print button');
    has(ov, "spec ? '' : 'none'", 'showing it for a document and hiding it for an internal page');
    has(src, 'id="doc-viewer-print"', 'and the button carries the id it is found by');

    const plain = noComments(fn('openPlainViewer'));
    has(plain, '_openViewer(', 'the plain viewer goes through the shared opener');
    has(plain, 'null', 'with no spec, which is what withholds every verb');

    // ⚠ BELT AND BRACES, AND SAID SO RATHER THAN DRESSED UP AS COVERAGE: `printDocViewer`
    // already returns early on a null spec, so hiding the button is the second line of
    // defence rather than the only one. Both are checked because either alone would let a
    // Print control onto a page carrying the private note.
    const pv = noComments(fn('printDocViewer'));
    has(pv, 'if (!_docViewerSpec) return;', 'and printing refuses outright without a spec');

    // Driven: the real opener against a real stub, both ways round.
    const dom = domStub({});
    const c = sandbox({ fns: ['_openViewer', 'openPlainViewer', 'openDocViewer', 'docTitle', 'printDocViewer'],
      vars: ['DOC_ACTIONS', 'DOC_STAGE_WORD', 'DOC_KIND_WORD', '_docViewerSpec'],
      stubs: { document: dom, docAction: () => { throw new Error('printed an internal page'); } } });
    c.openPlainViewer('Walkthrough & Scope', 'Butler', '<p>x</p>');
    eq(dom.getElementById('doc-viewer-print').style.display, 'none', 'the internal page hides Print');
    has(dom.getElementById('doc-viewer-body').innerHTML, 'ce-page', 'and is still wrapped as a page');
    c.printDocViewer();   // throws through the stub if it ever reaches docAction
    ok(true, 'pressing print on an internal page does nothing at all');

    c.openDocViewer({ kind: 'estimate', stage: '', job: { id: 7, name: 'Butler', addr: 'x' } }, '<p>y</p>');
    eq(dom.getElementById('doc-viewer-print').style.display, '', 'and a client document gets Print back');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the dashboard offers it, and says which kind of nothing it found');
  {
    function barFor(rec, storeState) {
      const stubs = { document: domStub({}), estimateStore: rec === null ? {} : { 7: rec } };
      if (storeState !== undefined) stubs._estStoreState = storeState;
      const c = sandbox({ fns: ['dashUtilityBar'], vars: [], stubs });
      return c.dashUtilityBar({ id: 7, driveFolder: 'https://drive.google.com/x' });
    }
    const calls = (b) => b.map((x) => x.call || '').join(' ');

    ok(/dashWalkthrough\(7\)/.test(calls(barFor({ estimate: LIVE(), approved: true }, 'ready'))),
      'a job with an estimate gets the Walkthrough button');
    ok(!/dashWalkthrough/.test(calls(barFor(null, 'ready'))),
      'a job with none does not — the fix is to go and build one');

    // ⚠ AN UNREAD STORE STILL GETS THE BUTTON, AND THAT IS THE OPPOSITE OF A BUG. On a cold
    // cache `estimateStore` is {} at first paint, so gating on the record alone would
    // WITHHOLD the control on a job that has a walkthrough — a missing button reads as "this
    // job has none", which is a false claim about the job rather than about this device.
    ok(/dashWalkthrough\(7\)/.test(calls(barFor(null, 'loading'))),
      'a store still loading gets the button anyway');
    ok(/dashWalkthrough\(7\)/.test(calls(barFor(null, 'offline'))),
      'and so does one this device cannot reach');

    // ⚠ AND THE HANDLER SAYS WHICH IT IS. Three states, three sentences: "still loading" is
    // about this device, "no estimate built" is about the job, and saying the second over
    // the first is the false-negative the button above is offered to avoid.
    const dw = noComments(fn('dashWalkthrough'));
    has(dw, "_estStoreState === 'loading'", 'loading is told apart');
    has(dw, "_estStoreState === 'offline'", 'from unreachable');
    has(dw, 'No estimate has been built', 'and from a job that genuinely has none');
    // It reads the record and builds a string. There is no global to prime and none to leave
    // pointed at this job — the reason every other dash* handler calls _primeEstimateFor.
    lacks(dw, 'currentEstimate', 'it touches no estimate global');
    lacks(dw, '_primeEstimateFor', 'so it has nothing to prime');
    has(dw, 'openPlainViewer(', 'and it opens the internal viewer, never the document one');
    lacks(dw, 'openDocViewer', 'which is what keeps send, file and print off it');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A WON JOB COMES OFF THE BUILD ESTIMATE DROPDOWN');
  {
    // The browser's own rule, modelled once and named: assigning a <select> a value with no
    // matching option leaves it EMPTY. The stub accepts anything, so without this the test
    // would pass on the defect.
    // ⚠ IT COERCES BEFORE IT REJECTS, because a real <select> does both and the stub does
    // neither — it stores whatever it is handed, number included. A model that skipped the
    // coercion would fail on correct code; one that skipped the rejection would PASS on the
    // defect, which is the direction that matters.
    function settle(sel) {
      sel.value = String(sel.value == null ? '' : sel.value);
      const opts = (sel.innerHTML.match(/value="([^"]*)"/g) || []).map((m) => m.slice(7, -1));
      if (opts.indexOf(sel.value) < 0) sel.value = '';
      return sel.value;
    }
    function dropdown(jobList, store, force, preselect) {
      const dom = domStub({});
      if (preselect !== undefined) dom.getElementById('e-job').value = String(preselect);
      const c = sandbox({ fns: ['populateJobSelect', 'estimateTabHidesJob', 'isJobWon'],
        stubs: { document: dom, jobs: jobList, estimateStore: store } });
      c.populateJobSelect(force);
      const sel = dom.getElementById('e-job');
      return { html: sel.innerHTML, value: settle(sel) };
    }

    const WON = { id: 7, name: 'Butler', addr: '69 Beach Blvd, Palm Beach', status: 'won', won: true };
    const OPEN = { id: 8, name: 'Ellsworth', addr: '12 Ocean Way', status: 'new' };
    const STORE = { 7: { estimate: LIVE(), approved: true }, 8: { estimate: LIVE() } };

    const d1 = dropdown([WON, OPEN], STORE);
    lacks(d1.html, 'value="7"', 'a job the client has accepted is off the dropdown');
    has(d1.html, 'value="8"', 'a job still being priced stays on it');

    // ⚠⚠ THE TRAP, AND IT IS THE REASON `forceJobId` EXISTS. `dashEditEstimate` revokes the
    // approval and leaves the job WON, so the dashboard's edit door lands here every single
    // time. Without the argument the select refuses the value, `e-job` reads empty, and
    // fifteen downstream reads of parseInt(e-job.value) resolve to 0 — including the one
    // that stamps jobId onto the saved snapshot.
    const d2 = dropdown([WON, OPEN], STORE, 7);
    has(d2.html, 'value="7"', 'the job being opened is listed whatever its state');
    eq(d2.value, '7', 'so the select really holds it');
    eq(dropdown([WON, OPEN], STORE).value, '', 'and without the argument it does not — this is the defect');

    // ⚠ THE CURRENTLY-SELECTED JOB IS A SECOND CASE, not the same one. `showPanel('estimate')`
    // repopulates with NO argument, so tapping across to Vendors and back while editing a won
    // job's estimate would drop its option and unbind the form under the work in progress.
    const d3 = dropdown([WON, OPEN], STORE, undefined, 7);
    eq(d3.value, '7', 'a job already selected survives a bare repopulate');

    // ⚠ A WON JOB WITH NO ESTIMATE STAYS VISIBLE. `isJobWon` migrates legacy active/closed
    // records, so keying on it alone would hide a job that has never been priced — on the one
    // tab where pricing is done.
    const d4 = dropdown([WON, OPEN], { 8: STORE[8] });
    has(d4.html, 'value="7"', 'a won job with no estimate is still listed, so it can be built');

    // ⚠ AND IT FAILS IN THE SAFE DIRECTION ON A COLD CACHE: an unread store reads as "no
    // estimate", so the job is LISTED rather than hidden.
    const d5 = dropdown([WON, OPEN], {});
    has(d5.html, 'value="7"', 'an unread estimate store lists everything rather than hiding it');

    // The rule is the CLIENT'S acceptance, not the manager's approval — an approved estimate
    // can still legitimately be re-priced, and `Offer discount` is on the rail for as long as
    // `!job.agrSigned`. Hiding at `approved` would close a tab on a job with a door still open.
    const APPROVED_ONLY = { id: 9, name: 'Pratt', addr: '4 Dunbar Rd', status: 'approved' };
    has(dropdown([APPROVED_ONLY], { 9: { estimate: LIVE(), approved: true } }).html, 'value="9"',
      'an approved but unaccepted estimate stays on the tab');

    // The door that reaches a hidden job passes its id. A source check, because the browser
    // run is what proves the join end to end — but a missing argument here is the whole bug.
    has(noComments(fn('editEstimateForJob')), 'populateJobSelect(jobId)',
      'and the dashboard’s edit door names the job it is about to select');
  }
};
