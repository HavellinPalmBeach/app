'use strict';
// ⚠⚠ A FRESH ESTIMATE STARTS CLEAN — THE ONE RESET, AND THE NET UNDER IT (2026-09-29, workflow
// audit finding C1).
//
// Measured on the real page before anything changed: client A priced with a 10% discount, move
// styling, a private walkthrough note, a coin collection, a car, a planner date and a renamed
// "Other" row, then ← Clients WITHOUT saving (the bar keeps the work, by design), then client B's
// Build estimate. B opened carrying every one of them. B's client estimate printed A's collection,
// A's car and a discount line; on fixed price the leaked discount cut B's flat fee with no discount
// line printed; B's Walkthrough view read A's family note ("the son contests the will"); B named
// A's concierge as the person who walked a house they never saw; and A's $4.2M home value rode onto
// B, which had none, and let B save straight past the "Property value is required" refusal. Save
// was no better — clearEstimateTab missed the discount, the styling, the note and who walked the
// house, so all four survived into the next client: a 10% discount rode through five in a row.
//
// The reset lived in three hand-kept copies (neutralizeEstimateView, the fresh-build branch of
// applyOpenedEstimate, clearEstimateTab) plus resetEstimateExtras beside them, and each was a list
// of the controls somebody had remembered. It is ONE function now, resetEstimateJobState, and this
// file is the net under it. The net is DERIVED, never listed, because a list is exactly what failed:
//   · every control calcAll reads — the whole call tree, walked by name — plus every control on the
//     Build Estimate panel, is set to a previous client's answer, the real open path is run for a
//     DIFFERENT client, and any control still holding the old answer fails;
//   · every piece of module state a saved estimate puts back (read off restoreEstimateToUI's own
//     assignments) is seeded the same way and must come back to its declared starting value;
//   · every row of the room grid, and every dictation still running.
// So the next input added to that screen fails here until it is reset, rather than leaking quietly.

const { sandbox, source, fn, domStub } = require('./harness');

// Comment lines out, LINE-BASED: a /\*[\s\S]*?\*\// stripper eats ~170KB of this file, because
// `accept="image/*"` reads as a comment opener.
const live = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const FN_NAMES = new Set((src.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || [])
    .map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
  const isTopVar = (w) => new RegExp('(^|\\n)var\\s+' + w.replace(/\$/g, '\\$') + '\\s*=').test(src);

  // Every function reachable from `root` by name, every LITERAL element id they touch, and every
  // id PREFIX they build ('vol-' + id). The closure converges (89 functions from calcAll on
  // 2026-09-29), so there is no depth limit to tune and nothing a new helper can hide behind.
  function callTree(root) {
    const fns = new Set(); const ids = new Set(); const prefixes = new Set();
    (function visit(name) {
      if (fns.has(name)) return;
      fns.add(name);
      let body; try { body = fn(name); } catch (e) { return; }
      for (const m of body.matchAll(/getElementById\(\s*(['"])([^'"]+)\1\s*\)/g)) ids.add(m[2]);
      for (const m of body.matchAll(/getElementById\(\s*(['"])([^'"]*)\1\s*\+/g)) prefixes.add(m[2]);
      for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (FN_NAMES.has(m[1]) && m[1] !== name) visit(m[1]);
    })(root);
    return { fns, ids, prefixes };
  }

  // The STATIC markup — <body> to the first <script> — and every input/select/textarea in it, with
  // the value it ships at. A select ships at its `selected` option, else its first.
  const bodyAt = src.indexOf('<body>');
  const MARKUP = src.slice(bodyAt, src.indexOf('<script>', bodyAt));
  function controlsIn(seg) {
    const out = [];
    const tagRe = /<(input|select|textarea)\b([^>]*)>/gi;
    let m;
    while ((m = tagRe.exec(seg))) {
      const tag = m[1].toLowerCase(); const attrs = m[2];
      const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
      if (!id) continue;
      const type = ((attrs.match(/\btype="([^"]+)"/) || [])[1] || (tag === 'input' ? 'text' : tag)).toLowerCase();
      let def;
      if (tag === 'input' && (type === 'checkbox' || type === 'radio')) def = /\schecked\b/.test(attrs);
      else if (tag === 'input') def = (attrs.match(/\bvalue="([^"]*)"/) || [null, ''])[1];
      else if (tag === 'textarea') def = seg.slice(tagRe.lastIndex, seg.indexOf('</textarea>', tagRe.lastIndex));
      else {
        const inner = seg.slice(tagRe.lastIndex, seg.indexOf('</select>', tagRe.lastIndex));
        const opts = [...inner.matchAll(/<option\b([^>]*)>([^<]*)/gi)]
          .map((o) => ({ v: (o[1].match(/\bvalue="([^"]*)"/) || [null, o[2].trim()])[1], sel: /\sselected\b/.test(o[1]) }));
        def = (opts.find((o) => o.sel) || opts[0] || { v: '' }).v;
      }
      out.push({ id, tag, type, def, checkbox: tag === 'input' && type === 'checkbox' });
    }
    return out;
  }
  const panelAt = MARKUP.lastIndexOf('<div', MARKUP.indexOf('id="panel-estimate"'));
  let panelEnd = -1;
  { let depth = 0; const re = /<(\/?)div\b/gi; re.lastIndex = panelAt; let m;
    while ((m = re.exec(MARKUP))) { if (!m[1]) depth++; else { depth--; if (!depth) { panelEnd = re.lastIndex; break; } } } }
  const PANEL = controlsIn(MARKUP.slice(panelAt, panelEnd));
  const ANYWHERE = new Map(controlsIn(MARKUP).map((c) => [c.id, c]));
  const TREE = callTree('calcAll');

  // THE NET: every control on the Build Estimate panel, plus every static control anywhere that
  // calcAll's tree reads (none outside the panel today — if one appears, it lands here and has to
  // be classified rather than slipping past).
  const NET = new Map(PANEL.map((c) => [c.id, c]));
  TREE.ids.forEach((id) => { if (ANYWHERE.has(id) && !NET.has(id)) NET.set(id, ANYWHERE.get(id)); });

  // The four ways a control legitimately does NOT go back to the value it ships at. Each has its
  // own driven assertion below, and each must name a control that exists, so an exception cannot
  // outlive the control it excused and quietly cover a new one.
  const OWNED_BY_THE_JOB = {    // written from the job being opened by loadJobIntoEstimate, blanked on unbind
    'e-job': 'the binding itself — which client this screen is for',
    'e-svc': 'the service type, painted from the job by paintEstimateService',
    'e-sqft': 'square footage, read off the job record',
    'e-propval': 'the home value, read off the job record',
    'e-start-date': 'the target start, read off the job record',
  };
  const SEEDED_FROM_THE_JOB = {  // start from an answer on the job rather than from blank
    'e-prem': 'the Premium Estate flag',
    'e-prepared-by': 'who walked the house: the site-visit concierge, else the assigned one, else nobody',
  };
  const PAINTED_FROM_A_PIN = {   // calcAll paints them from a pin the reset clears
    'e-alpha': ['paintEstimateAlpha', '_estimateAlphaPin', 'activeAlpha()'],
    'e-docscope': ['paintEstimateDocScope', '_estimateDocScope', 'activeDocScope()'],
  };
  const POPULATED_AT_LOAD = {    // ships empty; filled at load, whose own default is the fresh value
    'new-col-disp': 'populateCollDispSelect',
  };
  const EXCEPTED = new Set([OWNED_BY_THE_JOB, SEEDED_FROM_THE_JOB, PAINTED_FROM_A_PIN, POPULATED_AT_LOAD]
    .flatMap((o) => Object.keys(o)));

  // Every piece of module state a SAVED estimate puts back — read off restoreEstimateToUI's own
  // assignments, so a new one there joins the net by itself. A fresh build must take away exactly
  // what a saved one gives back.
  const assignedTopVars = (name) => {
    const s = new Set();
    for (const m of live(fn(name)).matchAll(/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*(?:\[[^\]]*\])?\s*=(?!=)/g)) {
      if (isTopVar(m[1])) s.add(m[1]);
    }
    return [...s].sort();
  };
  const STATE = assignedTopVars('restoreEstimateToUI');
  const INIT = {};
  STATE.forEach((n) => { INIT[n] = JSON.parse(JSON.stringify(sandbox({ vars: [n] })[n])); });
  const sentinelFor = (n, init) => Array.isArray(init) ? [{ prev: 'A:' + n }]
    : init === null ? { prev: 'A:' + n }
    : typeof init === 'object' ? { r0: true, prev: 'A:' + n }
    : typeof init === 'boolean' ? !init
    : typeof init === 'number' ? init + 7
    : 'A:' + n;

  // The room grid, read off ROOMS rather than counted by hand.
  const ROOMS = sandbox({ vars: ['ROOMS'] }).ROOMS;
  const ROWS = [];
  ROOMS.forEach((sec) => sec.rooms.forEach((r) => ROWS.push({ id: 'r' + ROWS.length, section: sec.section, name: r.name, custom: !!r.custom })));
  const CUSTOM = ROWS.filter((r) => r.custom);
  // The glyph the grid draws on each room's note button — read off buildRoomTable, not typed here.
  const NOTE_GLYPH = ((fn('buildRoomTable').match(/id="notes-btn-'\+id\+'"[^>]*>([^<]*)<\/button>/) || [])[1] || '')
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)));

  // ── The sandbox: the REAL open path, end to end ───────────────────────────────────────────────
  // loadJobIntoEstimate → neutralizeEstimateView → resetEstimateJobState → (the fetch, stubbed to
  // answer at once) → applyOpenedEstimate → restoreEstimateToUI, or the same reset again for a fresh
  // build. Everything that paints or prices is stubbed and RECORDED; everything that decides what
  // the screen holds is the real code.
  const JOB_A = { id: 7, name: 'Pat Alpha', svc: 'downsizing_move', sqft: 3500, start: '2026-10-19',
                  propVal: 4200000, premium: true, tc: 'Ashley Jerome', siteVisitBy: 'Ashley Jerome' };
  const JOB_B = { id: 8, name: 'Pat Bravo', svc: 'downsizing_move', sqft: 2800, start: '2026-11-02' };

  function build({ seed = {}, state = {}, jobs = [JOB_A, JOB_B], store = {}, current = null, confirmSays = true } = {}) {
    const dom = domStub(seed);
    const log = [];
    let ctx = null;
    ctx = sandbox({
      fns: ['resetEstimateJobState', 'neutralizeEstimateView', 'loadJobIntoEstimate', 'applyOpenedEstimate',
            'clearEstimateTab', 'startEstimateOver', 'restoreEstimateToUI', 'loadEstimateForJob',
            'estimateHasContent', 'loadEstimateScratch', 'clearAllRooms', 'setRoomState', 'roomState',
            'roomDefault', 'volPresetSeed', 'volPresetShift', 'paintVolPreset', 'seedDocScopeFromJob',
            'docScopeDef', 'docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep', 'estDeclutterHrs',
            '_fxAmtSet'],
      vars: ['ROOMS', 'ROOM_DEFAULTS', 'VOL_PRESETS', 'DOC_SCOPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
             'AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'EST_TOLERANCE_PCT',
             'TC_ONSITE_ALPHA_DEFAULT', '_activeRecognitions', ...STATE],
      stubs: {
        document: dom, jobs: jobs.map((j) => Object.assign({}, j)), estimateStore: store,
        currentEstimate: current, estimateApproved: false, estimateSubmitted: false, discountRevision: false,
        approvedBy: '', approvedAt: '', _engineInputs: null,
        confirm: (msg) => { log.push('confirm:' + msg); return confirmSays; },
        calcAll: () => log.push('calcAll'),
        updateRoomSectionCounts() {}, collapseEmptyRoomSections() {},
        paintEstimateService: (svc) => log.push('svc:' + svc),
        paintEstimateScreenHead() {}, svcTypeChanged() {}, renderJobRefStrip() {},
        refreshEstimateFromCloud: (id, cb) => { log.push('fetch:' + id); cb('cloud'); },
        renderVendors: () => log.push('renderVendors v' + ctx.vendors.length + ' p' + ctx.prepItems.length),
        renderPrepItems: () => log.push('renderPrepItems p' + ctx.prepItems.length),
        renderCollections: () => log.push('renderCollections ' + ctx.collectionsData.length),
        renderVehicles: () => log.push('renderVehicles ' + ctx.vehiclesData.length),
        applyEstimateLock() {}, updateApprovalUI() {}, populateJobSelect() {}, toggleRoom() {},
        showFB: (id, kind) => log.push('fb:' + kind),
      },
    });
    Object.assign(ctx, state);
    return { ctx, dom, log, v: (id) => dom.getElementById(id) };
  }

  // A's screen, as a person left it: every control in the net at a previous client's answer, every
  // room scored with a note, the "Other" rows renamed, the private note dictated, a recognizer still
  // listening in a room, the private note and a collection note — and B's job bound, because that is
  // what editEstimateForJob sets before it calls loadJobIntoEstimate.
  function aLeftItThisWay(boundTo) {
    const seed = {};
    NET.forEach((c) => { seed[c.id] = c.checkbox ? { checked: !c.def } : { value: 'A:' + c.id }; });
    seed['e-job'] = { value: String(boundTo) };
    ROWS.forEach((r) => {
      seed['chk-' + r.id] = { attrs: { 'data-state': 'in' } };
      seed['vol-' + r.id] = { value: '5' };
      seed['cplx-' + r.id] = { value: '4' };
      seed['spcl-' + r.id] = { checked: true };
      seed['note-' + r.id] = { value: 'A: a note on ' + r.name };
      seed['note-ta-' + r.id] = { value: 'A: a note on ' + r.name };
      seed['notes-btn-' + r.id] = { style: { color: 'var(--bronze)', fontWeight: '600' }, textContent: '📝 Walkthrough' };
      seed['name-' + r.id] = r.custom ? { tagName: 'INPUT', value: 'A: renamed ' + r.name } : { tagName: 'SPAN', textContent: r.name };
    });
    seed['e-private-note'] = { tagName: 'TEXTAREA', value: 'The son contests the will.' };
    seed['pnote-mic-status'] = { textContent: 'Listening…' };
    seed['fixed-amount-row'] = { style: { display: 'flex' } };
    const state = {};
    STATE.forEach((n) => { state[n] = sentinelFor(n, INIT[n]); });
    state._privateWalkNote = 'The son contests the will.';
    const calls = [];
    const rec = (key, withAbort) => Object.assign({ stop: () => calls.push('stop ' + key) },
      withAbort ? { abort: () => calls.push('abort ' + key) } : {});
    state._activeRecognitions = { r3: rec('r3', true), private_note: rec('private_note', true), coll_1: rec('coll_1', true), legacy: rec('legacy', false) };
    return { seed, state, calls };
  }

  // What every control in the net must read once B's fresh build has run. `v` reads the screen.
  function checkFresh(b, label, jobFor) {
    const { ctx, v } = b;
    NET.forEach((c) => {
      if (EXCEPTED.has(c.id)) return;
      const got = c.checkbox ? v(c.id).checked : v(c.id).value;
      eq(got, c.def, `${label}: #${c.id} is back to the value it ships at${TREE.ids.has(c.id) ? ' (calcAll reads it)' : ''}`);
    });
    // the dynamic controls
    const survivors = ROWS.filter((r) => ctx.roomState(r.id) !== 'off' || v('vol-' + r.id).value !== '' || v('cplx-' + r.id).value !== ''
      || v('spcl-' + r.id).checked || v('note-' + r.id).value !== '' || v('note-ta-' + r.id).value !== ''
      || v('notes-btn-' + r.id).style.color !== 'var(--gray)' || v('notes-btn-' + r.id).style.fontWeight !== ''
      || v('notes-btn-' + r.id).textContent !== NOTE_GLYPH);
    eq(survivors.map((r) => r.id), [], `${label}: every one of the ${ROWS.length} room rows is out of scope, unscored, unnoted, its note button grey and back to the bare glyph`);
    eq(CUSTOM.filter((r) => v('name-' + r.id).value !== r.name).map((r) => v('name-' + r.id).value), [],
       `${label}: every renamed "Other" row reads its own name again — A's wine cellar is not a room on B's grid`);
    eq(v('e-private-note').value, '', `${label}: the private walkthrough note box is empty`);
    eq(v('pnote-mic-status').textContent, '', `${label}: and its dictation status line with it`);
    eq(v('fixed-amount-row').style.display, 'none', `${label}: the fixed-fee amount row is hidden again`);
    STATE.forEach((n) => {
      const want = n === '_estimateDocScope' ? ctx.seedDocScopeFromJob(jobFor || null) : INIT[n];
      eq(JSON.parse(JSON.stringify(ctx[n])), want, `${label}: ${n} is back to ${JSON.stringify(want)}`);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the net is derived from the code, and it is not vacuous');
  {
    ok(NOTE_GLYPH.length > 0 && NOTE_GLYPH !== '📝 Walkthrough', `the note button's own glyph is read off the grid (${JSON.stringify(NOTE_GLYPH)})`);
    ok(TREE.fns.size > 40, `the walk from calcAll reaches its whole call tree (${TREE.fns.size} functions)`);
    ok(PANEL.length >= 20, `the Build Estimate panel's static controls are found (${PANEL.length})`);
    ['e-discount', 'e-move-styling', 'e-prepared-by', 'tp-target', 'e-fixed', 'e-rush', 'e-pkg', 'ps-crew-size'].forEach((id) => {
      ok(TREE.ids.has(id) && NET.has(id), `#${id} is reached by walking calcAll, not by being listed here`);
    });
    ['new-col-name', 'new-veh-desc'].forEach((id) => ok(NET.has(id), `#${id} (an add-a-line box calcAll never reads) is in the net as a panel control`));
    ['collectionsData', 'vehiclesData', '_privateWalkNote', 'vendors', 'prepItems', '_estimateAlphaPin', '_volPreset'].forEach((n) => {
      ok(STATE.includes(n), `${n} is found as state a saved estimate puts back — read off restoreEstimateToUI, not listed`);
    });
    ok(STATE.length >= 12, `every piece of that state is in the net (${STATE.length})`);
    eq(assignedTopVars('resetEstimateJobState'), STATE,
       'the reset takes away exactly the module state a saved estimate gives back — no more, no less');
    // Each exception names a control that exists, and never one of the seven the brief found leaking.
    EXCEPTED.forEach((id) => ok(NET.has(id), `the exception for #${id} names a control that really is in the net`));
    ['e-discount', 'e-move-styling', 'tp-target'].forEach((id) => ok(!EXCEPTED.has(id), `#${id} is never excused`));
    // The dynamic ids the tree builds are all accounted for: the room grid (driven below), the vendor
    // group cards (re-rendered from the arrays the reset empties), or readouts that are never inputs.
    const ROOM_GRID = ['vol-', 'cplx-', 'spcl-', 'name-', 'note-', 'chk-'];
    const CARD_ROWS = { 'vgrp-cat-': 'renderVendorGroupCards', 'vgrp-cost-': 'renderVendorGroupCards', 'vendor-smf-': 'renderVendors' };
    const READOUTS = ['el-', 'tc-', 'ps-'];
    TREE.prefixes.forEach((p) => ok(ROOM_GRID.includes(p) || p in CARD_ROWS || READOUTS.includes(p),
      `the dynamic id "${p}…" calcAll's tree reads is classified — room grid, a vendor card row, or a readout`));
    Object.keys(CARD_ROWS).forEach((p) => has(fn(CARD_ROWS[p]), `id="${p}`, `"${p}…" is drawn by ${CARD_ROWS[p]}, which the reset re-runs over emptied lists`));
    const grid = fn('buildRoomTable');
    READOUTS.forEach((p) => ok(new RegExp(`<(span|td)[^>]*id="${p}'`).test(grid) && !new RegExp(`<(input|select|textarea)[^>]*id="${p}'`).test(grid),
      `"${p}…" is a readout on the room grid, never an input`));
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A FRESH BUILD FOR A DIFFERENT CLIENT CARRIES NOTHING OF THE LAST ONE — driven through the real open path');
  {
    const a = aLeftItThisWay(JOB_B.id);
    const b = build({ seed: a.seed, state: a.state, current: { jobId: JOB_A.id, rooms: [{ name: 'Kitchen' }] } });
    b.ctx.loadJobIntoEstimate();
    ok(b.log.includes('fetch:' + JOB_B.id), 'the open went all the way through the fetch to B');
    checkFresh(b, 'B fresh', JOB_B);
    // The exceptions, each driven.
    eq(b.v('e-job').value, String(JOB_B.id), 'the binding is untouched — still B');
    ok(b.log.includes('svc:' + JOB_B.svc), 'the service is painted from B\'s job');
    eq(b.v('e-sqft').value, JOB_B.sqft, 'the square footage is B\'s — the reset never blanks a field the job owns');
    eq(b.v('e-start-date').value, JOB_B.start, 'and so is the target start');
    eq(b.v('e-propval').value, '', '⚠ B has no home value on file, so the field is BLANK — not A\'s $4.2M, which let B save past the gate');
    eq(b.v('e-prem').checked, false, 'Premium Estate follows B, who is not premium');
    eq(b.v('e-prepared-by').value, '', '⚠ nobody walked B\'s house on record, so nobody is named — not A\'s concierge');
    eq(b.ctx._estimateAlphaPin, null, '#e-alpha is painted from a pin the reset cleared (B prices at the Settings α)');
    // The lists are rendered AFTER they are emptied, or the screen shows A's rows over B's empty list.
    ok(b.log.includes('renderCollections 0'), 'the collections are drawn empty');
    ok(b.log.includes('renderVehicles 0'), 'the vehicles are drawn empty');
    ok(b.log.includes('renderVendors v0 p0'), 'the vendor cards are drawn from empty lists');
    lacks(b.log.join('|'), 'renderCollections 1', 'and never from A\'s');
    // Dictation still running belonged to A.
    ['r3', 'private_note', 'coll_1'].forEach((k) => eq(a.calls.find((c) => c.endsWith(' ' + k)), 'abort ' + k,
      `a dictation still running on "${k}" is ABORTED first — stop() would still deliver its last words into B's screen`));
    ok(a.calls.includes('stop legacy'), 'a recognizer with no abort() is stopped rather than left running');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the unbind — Save and "Start over" run the same reset');
  {
    // clearEstimateTab is what runs after a SAVE (t+1000). It unbinds the screen, so it resets for
    // nobody — and it was the copy that missed the discount, the styling, the note and the walker.
    const a = aLeftItThisWay(JOB_A.id);
    const b = build({ seed: a.seed, state: a.state });
    b.ctx.clearEstimateTab();
    checkFresh(b, 'after Save', null);
    ['e-job', 'e-sqft', 'e-propval', 'e-start-date'].forEach((id) => eq(b.v(id).value, '', `#${id} is blanked — the screen belongs to nobody`));
    eq(b.v('e-prem').checked, false, 'Premium Estate is off with no job to seed it');
    eq(b.v('e-prepared-by').value, '', 'nobody walked a house nobody is bound to');
    eq(b.ctx.currentEstimate, null, 'and there is no working copy left');

    // "Start over" on a client with NOTHING saved asks, names what goes, and starts again from THIS
    // client's intake answers.
    const c0 = aLeftItThisWay(JOB_A.id);
    const c = build({ seed: c0.seed, state: c0.state });
    c.ctx.startEstimateOver();
    const asked = (c.log.find((l) => l.startsWith('confirm:')) || '');
    has(asked, 'start again from the intake answers', 'with nothing saved, the question promises the intake answers');
    has(asked, 'the discount', 'names the discount');
    has(asked, 'the private walkthrough note', 'and the private note — the one thing somebody would be sorry to lose unasked');
    has(asked, 'None of it has been saved', 'and says plainly none of it is saved');
    checkFresh(c, 'Start over', JOB_A);
    eq(c.v('e-job').value, String(JOB_A.id), 'it stays bound to the same client');
    eq(c.v('e-prem').checked, true, 'and re-seeds from their intake: Premium Estate');
    eq(c.v('e-prepared-by').value, JOB_A.siteVisitBy, 'who walked the house');
    eq(c.v('e-propval').value, JOB_A.propVal, 'and the home value on file');

    const d0 = aLeftItThisWay(JOB_A.id);
    const d = build({ seed: d0.seed, state: d0.state, confirmSays: false });
    d.ctx.startEstimateOver();
    eq(d.v('e-discount').value, 'A:e-discount', 'answering Cancel changes nothing');
    eq(d.ctx._privateWalkNote, 'The son contests the will.', 'the note included');

    // ⚠ ON A CLIENT WITH A SAVED ESTIMATE "Start over" REOPENS THAT ESTIMATE — it clears the screen and
    // opens the client again, and the open restores what was saved. The question used to promise the
    // intake answers either way; it says what actually happens now.
    const e0 = aLeftItThisWay(JOB_A.id);
    const savedA = { jobId: JOB_A.id, svc: JOB_A.svc, discountPct: 5, privateNote: 'Saved note.', collections: [{ id: 3, name: 'Saved silver' }],
                     rooms: [{ idx: 0, section: ROWS[0].section, name: ROWS[0].name, vol: 3, cplx: 3 }] };
    const e = build({ seed: e0.seed, state: e0.state, store: { [JOB_A.id]: { estimate: savedA, approved: false } } });
    e.ctx.startEstimateOver();
    const askedSaved = (e.log.find((l) => l.startsWith('confirm:')) || '');
    has(askedSaved, 'reopen the saved estimate', 'with an estimate saved, the question says it goes back to that estimate');
    lacks(askedSaved, 'intake answers', 'and does not promise the intake answers');
    eq(e.v('e-discount').value, 5, 'and it does: the saved 5% discount, not the unsaved one on screen');
    eq(e.ctx._privateWalkNote, 'Saved note.', 'the saved private note');
    eq(e.ctx.collectionsData.map((x) => x.name), ['Saved silver'], 'the saved collection, and nothing of what was unsaved');
    eq(e.ctx.vehiclesData, [], 'and no vehicle, because none was saved');
    // A record with nothing in it is not a saved estimate — the open treats it as a fresh build — so the
    // question must not promise to reopen it.
    const f0 = aLeftItThisWay(JOB_A.id);
    const f = build({ seed: f0.seed, state: f0.state, store: { [JOB_A.id]: { estimate: { jobId: JOB_A.id, svc: JOB_A.svc, rooms: [] }, approved: false } } });
    f.ctx.startEstimateOver();
    const askedEmpty = (f.log.find((l) => l.startsWith('confirm:')) || '');
    has(askedEmpty, 'start again from the intake answers', 'an EMPTY saved record gets the intake-answers question, because that is what the open does with it');
    lacks(askedEmpty, 'reopen the saved estimate', 'and is never promised back as a saved estimate');
    // The button's tooltip is the first thing that says what it does, so it names both outcomes too.
    const soBtn = (src.match(/<button[^>]*onclick="startEstimateOver\(\)"[^>]*>/) || [''])[0];
    has(soBtn, 'saved estimate', 'the Start over tooltip names the saved estimate');
    has(soBtn, 'intake answers if nothing is saved', 'and the intake answers only when nothing is saved');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ A SAVED ESTIMATE STILL GETS EVERYTHING BACK — A, then B, then A again');
  {
    const customRow = CUSTOM[0];
    const REC_A = {
      jobId: JOB_A.id, svc: JOB_A.svc, sqft: 3500, propVal: 4200000,
      rooms: [
        { idx: 0, section: ROWS[0].section, name: ROWS[0].name, vol: 4, cplx: 2, spcl: true, note: 'Piano by the stairs', volSet: true },
        { idx: Number(customRow.id.slice(1)), section: customRow.section, name: 'Alpha wine cellar', vol: 5, cplx: 5, spcl: false, note: '' },
      ],
      prem: true, pkgCost: 750, discountPct: 10, rush: true,
      fixedPrice: true, fixedAmount: 21000, fixedSuggested: 21600, prepFeeOnTop: true,
      access: true, heirs: true, preparedBy: 'Ashley Jerome', needsTC2: true, psSlots: [1, 2, 3, 4],
      privateNote: 'The son contests the will.', moveStyling: true, volPreset: 'packed', docScope: 'capture',
      tcAlpha: 0.4, costRates: { founderTC: 100, contractorTC: 60, psStandard: 30, psSenior: 35 },
      collections: [{ id: 1, name: 'Alpha coin collection' }], vehicles: [{ id: 2, desc: '1960 Alpha Corvette' }],
      vendors: [{ type: 'Mover', cost: 3000, lid: 'L1' }], prepItems: [{ type: 'Painting', cost: 5000, lid: 'L2' }],
    };
    const fresh = {};
    NET.forEach((c) => { fresh[c.id] = c.checkbox ? { checked: c.def } : { value: c.def }; });
    ROWS.forEach((r) => {
      fresh['name-' + r.id] = r.custom ? { tagName: 'INPUT', value: r.name } : { tagName: 'SPAN', textContent: r.name };
      fresh['notes-btn-' + r.id] = { style: { color: 'var(--gray)', fontWeight: '' }, textContent: NOTE_GLYPH };
    });
    fresh['e-job'] = { value: String(JOB_A.id) };
    fresh['e-private-note'] = { tagName: 'TEXTAREA', value: '' };
    const b = build({ seed: fresh, store: { [JOB_A.id]: { estimate: REC_A, approved: false } } });
    const screenOf = () => {
      const s = {};
      NET.forEach((c) => { if (c.id !== 'e-job' && c.id !== 'e-svc') s[c.id] = c.checkbox ? b.v(c.id).checked : b.v(c.id).value; });
      ROWS.forEach((r) => { if (b.ctx.roomState(r.id) !== 'off') s[r.id] = [b.ctx.roomState(r.id), b.v('vol-' + r.id).value, b.v('cplx-' + r.id).value, b.v('spcl-' + r.id).checked, b.v('note-' + r.id).value, b.v('name-' + r.id).value]; });
      s.privateNote = b.v('e-private-note').value;
      STATE.forEach((n) => { s[n] = JSON.parse(JSON.stringify(b.ctx[n])); });
      return s;
    };

    // 1. A opens and its saved estimate is restored.
    b.ctx.loadJobIntoEstimate();
    const A1 = screenOf();
    eq(A1['e-discount'], 10, 'A reopens at its 10% discount');
    eq(A1['e-move-styling'], true, 'with move styling');
    eq(A1['e-prepared-by'], 'Ashley Jerome', 'walked by Ashley');
    eq(A1.privateNote, 'The son contests the will.', 'its private note');
    eq(A1.collectionsData.map((c) => c.name), ['Alpha coin collection'], 'its collection');
    eq(A1.vehiclesData.map((x) => x.desc), ['1960 Alpha Corvette'], 'its car');
    eq(A1['e-fixed'], true, 'fixed price');
    eq(A1['e-fixed-amount'], '$21,000', 'at its own flat fee');
    eq(A1[customRow.id] && A1[customRow.id][5], 'Alpha wine cellar', 'and its renamed row reads its own name');
    eq(A1._estimateDocScope, 'capture', 'at the scope it was priced at');

    // 2. B, fresh. Nothing of A.
    b.v('e-job').value = String(JOB_B.id);
    b.ctx.loadJobIntoEstimate();
    checkFresh(b, 'B after A', JOB_B);

    // 3. A again — everything back, from its own record.
    b.v('e-job').value = String(JOB_A.id);
    b.ctx.loadJobIntoEstimate();
    const A2 = screenOf();
    const diff = Object.keys(A1).filter((k) => JSON.stringify(A1[k]) !== JSON.stringify(A2[k]));
    eq(diff, [], 'A reopened after B reads exactly as it did before: every control, every room, every list, every pin');
    eq(A2['tp-target'], '', 'the planner date is the one thing no record carries — a question asked on site, not a term of the estimate');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the three inputs a fresh build seeds from the job, rather than from blank');
  {
    const seeded = (job) => {
      const b = build({ seed: { 'e-prem': true, 'e-prepared-by': { value: 'A: somebody' } }, state: { _estimateDocScope: 'capture' } });
      b.ctx.resetEstimateJobState(job);
      return { prem: b.v('e-prem').checked, by: b.v('e-prepared-by').value, scope: b.ctx._estimateDocScope };
    };
    eq(seeded({ id: 9, premium: true }).prem, true, 'a premium client opens premium');
    eq(seeded({ id: 9 }).prem, false, 'and one who is not, is not — whatever the last client was');
    eq(seeded({ id: 9, siteVisitBy: 'Ashley Jerome', tc: 'Anthony Graziano' }).by, 'Ashley Jerome', 'the site-visit concierge walked the house');
    eq(seeded({ id: 9, tc: 'Anthony Graziano' }).by, 'Anthony Graziano', 'else the assigned one');
    eq(seeded({ id: 9 }).by, '', 'else nobody — never the last client\'s walker');
    eq(seeded({ id: 9, svc: 'cleanout', docScope: 'none' }).scope, 'none', 'the documentation scope intake recorded');
    eq(seeded({ id: 9, svc: 'cleanout' }).scope, 'full', 'full when intake never answered');
    eq(seeded(null).scope, 'full', 'and full for nobody');
    // The intake answer never restates a PRICED estimate: restore pins the record's own scope over it.
    const b = build({ seed: { 'e-job': { value: '11' } }, jobs: [{ id: 11, svc: 'cleanout', docScope: 'none', sqft: 3000 }],
      store: { 11: { estimate: { jobId: 11, svc: 'cleanout', docScope: 'capture', rooms: [{ idx: 0, section: ROWS[0].section, name: ROWS[0].name, vol: 3, cplx: 3 }] } } } });
    b.ctx.loadJobIntoEstimate();
    eq(b.ctx._estimateDocScope, 'capture', 'a saved estimate reopens at the scope it was priced at, not at intake\'s');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('the exceptions are what they say they are');
  {
    // Painted from a pin: calcAll paints the control from the pin the reset clears.
    const calc = live(fn('calcAll'));
    Object.keys(PAINTED_FROM_A_PIN).forEach((id) => {
      const [painter, pin, getter] = PAINTED_FROM_A_PIN[id];
      has(calc, painter + '(', `calcAll paints #${id} (${painter})`);
      has(live(fn(painter)), getter, `from ${getter}, which reads ${pin}`);
      ok(assignedTopVars('resetEstimateJobState').includes(pin), `and the reset sets ${pin}`);
    });
    // Populated at load: the fresh value is the one the populator picks for an empty select.
    const pd = domStub({ 'new-col-disp': { value: '' } });
    sandbox({ fns: ['populateCollDispSelect'], vars: ['COL_DISP_LABELS'], stubs: { document: pd } }).populateCollDispSelect();
    const picked = (pd.getElementById('new-col-disp').innerHTML.match(/<option value="([^"]+)" selected>/) || [])[1];
    ok(!!picked, 'populateCollDispSelect picks a default for an empty add-a-collection picker');
    const b = build({ seed: { 'new-col-disp': { value: 'firearms' } } });
    b.ctx.resetEstimateJobState(JOB_B);
    eq(b.v('new-col-disp').value, picked, 'and the reset puts the picker back on that default');
    // Owned by the job: loadJobIntoEstimate writes each one from the job, EVERY time — a blank on the
    // job is a blank on screen, never the last client's value (the $4.2M that rode onto B).
    const lj = live(fn('loadJobIntoEstimate'));
    has(lj, "ePropValEl.value = job.propVal || ''", 'the home value is written from the job unconditionally');
    lacks(lj, 'if (ePropValEl && job.propVal)', 'never only when the job happens to have one');
    has(lj, "eSqftEl.value = job.sqft || ''", 'so is the square footage');
    has(lj, "startDisplayEl.value = job.start || ''", 'and the target start');
    has(lj, 'paintEstimateService(job.svc', 'and the service');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('every path runs the one reset, and none keeps a copy of its own');
  {
    // neutralizeEstimateView passes the job straight through, with auto-save suppressed around it.
    const seen = [];
    const n = sandbox({ fns: ['neutralizeEstimateView'],
      stubs: { window: {}, resetEstimateJobState(job) { seen.push([job, n.window._suppressEstimateAutoSave]); } } });
    n.neutralizeEstimateView(JOB_B);
    n.neutralizeEstimateView();
    eq(seen.map((s) => s[0] && s[0].id), [8, undefined], 'neutralizeEstimateView resets for the job being opened, and for nobody with none');
    eq((seen[1] || [])[0], null, 'nobody is null, not undefined');
    ok(seen.every((s) => s[1] === true), 'with the scratch auto-save suppressed while it runs');
    eq(n.window._suppressEstimateAutoSave, false, 'and released afterwards');

    // Both opens reset BEFORE their fetch — the screen never shows the last client while it waits.
    const order = [];
    const o = sandbox({ fns: ['loadJobIntoEstimate'],
      stubs: { document: domStub({ 'e-job': { value: '8' } }), jobs: [JOB_B],
               neutralizeEstimateView: (job) => order.push('reset:' + (job && job.id)), renderJobRefStrip() {}, paintEstimateService() {},
               svcTypeChanged() {}, refreshEstimateFromCloud: (id) => order.push('fetch:' + id) } });
    o.loadJobIntoEstimate();
    eq(order, ['reset:8', 'fetch:8'], 'loadJobIntoEstimate resets for the job it opens, before it fetches');
    const order2 = [];
    const e = sandbox({ fns: ['editEstimateForJob'],
      stubs: { document: domStub({ 'e-job': { value: '', options: [] } }), jobs: [JOB_B], window: {},
               _showDashScreen() {}, populateJobSelect() {}, paintEstimateService() {}, svcTypeChanged() {}, setEstimateLoading() {},
               neutralizeEstimateView: (job) => order2.push('reset:' + (job && job.id)),
               refreshEstimateFromCloud: (id) => order2.push('fetch:' + id) } });
    e.editEstimateForJob(8);
    eq(order2, ['reset:8', 'fetch:8'], 'editEstimateForJob resets for the job it opens (not for nobody), before it fetches');

    // The fresh-build branch resets for the job; the saved branch restores and never resets.
    const run = (saved) => {
      const calls = [];
      const c = sandbox({ fns: ['applyOpenedEstimate'],
        stubs: { document: domStub({ 'e-job': { value: '8' } }), window: {}, currentEstimate: null,
                 loadEstimateForJob: () => saved, estimateHasContent: () => saved, loadEstimateScratch: () => null,
                 restoreEstimateToUI: () => calls.push('restore'), resetEstimateJobState: (j) => calls.push('reset:' + (j && j.id)),
                 updateApprovalUI() {}, calcAll() {}, showFB() {} } });
      c.applyOpenedEstimate(8, JOB_B, 'cloud');
      return calls;
    };
    eq(run(false), ['reset:8'], 'a fresh build runs the one reset, for this job');
    eq(run(true), ['restore'], 'a saved estimate is restored, and the reset is not run over it');

    // No path keeps a private list: the only controls any of them names are the ones the job owns,
    // and none of them assigns the state a saved estimate carries.
    ['neutralizeEstimateView', 'applyOpenedEstimate', 'clearEstimateTab', 'loadJobIntoEstimate',
     'editEstimateForJob', 'startEstimateOver'].forEach((name) => {
      const body = live(fn(name));
      const named = [...NET.keys()].filter((id) => body.includes("'" + id + "'") && !(id in OWNED_BY_THE_JOB));
      eq(named, [], `${name} names no per-client control of its own — the one list is resetEstimateJobState`);
      eq(assignedTopVars(name).filter((v) => STATE.includes(v)), [], `${name} assigns none of the state a saved estimate carries`);
    });
    ['neutralizeEstimateView', 'applyOpenedEstimate', 'clearEstimateTab'].forEach((name) =>
      has(live(fn(name)), 'resetEstimateJobState(', `${name} calls the one reset`));
    lacks(src, 'function resetEstimateExtras', 'resetEstimateExtras, the fourth copy, is gone rather than left beside it');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('going back to the SAME client resumes the unsaved work — the ← Clients promise');
  {
    const resume = (bound, currentJob, loading) => {
      const calls = [];
      const dom = domStub({ 'e-job': { value: String(bound) }, 'est-loading-bar': { style: { display: loading ? 'block' : 'none' } },
                            'e-discount': { value: '10' } });
      const c = sandbox({ fns: ['openEstimateScreen'],
        stubs: { document: dom, currentEstimate: currentJob ? { jobId: currentJob } : null,
                 _showDashScreen() {}, calcAll: () => calls.push('calcAll'), applyEstimateLock() {},
                 editEstimateForJob: (id) => calls.push('open:' + id), resetEstimateJobState: () => calls.push('reset'),
                 neutralizeEstimateView: () => calls.push('reset') } });
      return { got: c.openEstimateScreen(7), calls, discount: dom.getElementById('e-discount').value };
    };
    const same = resume(7, 7, false);
    eq(same.got, 'resumed', 'the same client, bound and not loading, resumes');
    ok(!same.calls.includes('reset') && !same.calls.some((c) => c.startsWith('open:')), 'without any reset or reload');
    eq(same.discount, '10', 'so the discount the concierge was still deciding on is still there');
    eq(resume(8, 8, false).got, 'opened', 'a different client takes the open (and so the reset)');
    ok(resume(8, 8, false).calls.includes('open:7'), 'for the client asked for');
    eq(resume(7, 7, true).got, 'opened', 'and so does the same client while its own open is still in flight');
  }
};
