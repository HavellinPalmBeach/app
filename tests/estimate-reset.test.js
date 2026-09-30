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

  // `status` is what the stubbed fetch answers. 'offline' drives the branch that restores this device's
  // unsaved-draft copy (the scratch), which is where a discarded build used to come back from.
  function build({ seed = {}, state = {}, jobs = [JOB_A, JOB_B], store = {}, current = null, confirmSays = true, status = 'cloud' } = {}) {
    const dom = domStub(seed);
    const log = [];
    let ctx = null;
    ctx = sandbox({
      fns: ['resetEstimateJobState', 'neutralizeEstimateView', 'loadJobIntoEstimate', 'applyOpenedEstimate',
            'clearEstimateTab', 'startEstimateOver', 'resetEstimate', 'restoreEstimateToUI', 'loadEstimateForJob',
            'estimateHasContent', 'loadEstimateScratch', 'clearEstimateScratch', 'clearAllRooms', 'setRoomState', 'roomState',
            'roomDefault', 'volPresetSeed', 'volPresetShift', 'paintVolPreset', 'seedDocScopeFromJob',
            'docScopeDef', 'docTierOf', 'docTierDef', 'docTierScope', 'svcHasDocStep', 'estDeclutterHrs',
            '_fxAmtSet',
            // Reset's approved refusal asks the price-change rule (whether Edit estimate is still there):
            // lifted, never stubbed, so this suite's refusal and the rule cannot come to disagree.
            'estimateEditBlocker', 'priceChangeBlocker', 'isAgreementSigned', 'agreementSignature', 'isAgreementSent',
            'docSentAt', 'docKeyFor', 'fixedFeeForCharge', 'discountOnFixedFee', 'discountOnLabor', 'volPresetSeedFor', 'estimateOpensFixed', 'isDecedentJob', 'pinVendorLineHours', 'vendorDirectoryReady', 'vendorLineTCHrs', 'coordHrsFor', 'coordTouches', 'vendorGroupOfLine', 'vendorGroupCategories', 'directoryCategories', 'vendorCats'],
      vars: ['ROOMS', 'ROOM_DEFAULTS', 'VOL_PRESETS', 'DOC_SCOPES', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS',
             'AGR_NOT_AN_ACCOUNTING', 'MATTER_TYPES', 'DECEDENT_SERVICES', 'EST_TOLERANCE_PCT',
             'TC_ONSITE_ALPHA_DEFAULT', '_activeRecognitions', ...STATE, 'RUSH_PCT', 'VENDOR_GROUP_CARDS', 'COORD_TOUCHES', 'COORD_TOUCHES_BY_GROUP', 'COORD_TOUCHES_DEFAULT', 'TOUCH_HRS', 'vendorDirectory', 'GROUP_JOB_MENU', 'LOGISTICS_CATEGORIES'],
      stubs: {
        document: dom, jobs: jobs.map((j) => Object.assign({}, j)), estimateStore: store,
        currentEstimate: current, estimateApproved: false, estimateSubmitted: false, discountRevision: false,
        approvedBy: '', approvedAt: '', _engineInputs: null,
        confirm: (msg) => { log.push('confirm:' + msg); return confirmSays; },
        calcAll: () => log.push('calcAll'),
        updateRoomSectionCounts() {}, collapseEmptyRoomSections() {},
        paintEstimateService: (svc) => log.push('svc:' + svc),
        paintEstimateScreenHead() {}, svcTypeChanged() {}, renderJobRefStrip() {},
        refreshEstimateFromCloud: (id, cb) => { log.push('fetch:' + id); cb(status); },
        renderVendors: () => log.push('renderVendors v' + ctx.vendors.length + ' p' + ctx.prepItems.length),
        renderPrepItems: () => log.push('renderPrepItems p' + ctx.prepItems.length),
        renderCollections: () => log.push('renderCollections ' + ctx.collectionsData.length),
        renderVehicles: () => log.push('renderVehicles ' + ctx.vehiclesData.length),
        applyEstimateLock() {}, updateApprovalUI() {}, populateJobSelect() {}, toggleRoom() {},
        showFB: (id, kind, msg) => log.push('fb:' + kind + ':' + msg),
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
      // ⚠ An estate opens on fixed price (Anthony, Q10, 2026-09-30): for the billing basis "where a fresh build
      // starts" is the job's answer (estimateOpensFixed), not the markup's.
      const want = c.id === 'e-fixed' ? ctx.estimateOpensFixed(jobFor || null) : c.def;
      eq(got, want, `${label}: #${c.id} is back to the value it ships at${TREE.ids.has(c.id) ? ' (calcAll reads it)' : ''}`);
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
    eq(v('fixed-amount-row').style.display, ctx.estimateOpensFixed(jobFor || null) ? 'flex' : 'none',
       `${label}: the fixed-fee amount row is hidden again (shown, for an estate, beside the fixed-price box)`);
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
  group('⚠⚠ THE BOTTOM Reset BUTTON RUNS THE ONE RESET, FOR THE CLIENT THE SCREEN IS BOUND TO');
  {
    // It was a fifth hand-kept list. Measured on the real page (a premium Estate Settlement contracted
    // at Contents list): it unticked Premium Estate, set the scope to Full, and kept the discount, the
    // styling, the private note, the collections, the vehicles, the prep lines and the planner date —
    // asking nothing. So: the whole net, driven through the real resetEstimate, on the SAME client.
    // Read defensively: a Reset that throws must fail the checks after it, not stop the file with them unrun.
    const press = (ctx, label) => { let err = null; try { ctx.resetEstimate(); } catch (e) { err = e; }
      ok(!err, `${label}: Reset does not throw` + (err ? ' — threw ' + err.message : '')); };
    const JOB_E = { id: 12, name: 'Pat Estate', svc: 'cleanout', docTier: 'contents', premium: true,
                    siteVisitBy: 'Ashley Jerome', tc: 'Anthony Graziano', sqft: 3500, start: '2026-11-16', propVal: 4200000 };
    const a = aLeftItThisWay(JOB_E.id);
    const b = build({ seed: a.seed, state: a.state, jobs: [JOB_E] });
    press(b.ctx, 'nothing saved');
    const asked = (b.log.find((l) => l.startsWith('confirm:')) || '');
    ok(asked.length > 0, 'it asks before it clears — it takes the private note and the lists with the rooms');
    has(asked, 'blank estimate for Pat Estate', 'the question names the client the blank estimate is for');
    has(asked, 'the discount', 'names the discount');
    has(asked, 'the private walkthrough note', 'and the private note');
    has(asked, 'None of it has been saved', 'and, with nothing saved, says so plainly');
    lacks(asked, 'Start over reopens', 'and does not send anyone to a saved estimate that does not exist');
    checkFresh(b, 'after Reset', JOB_E);
    eq(b.v('e-prem').checked, true, '⚠ Premium Estate follows the job: a premium client stays premium (the old Reset unticked it — $8,900 off the measured job)');
    eq(b.ctx._estimateDocScope, 'capture', '⚠ the documentation scope is what intake recorded (Contents list), not Full ($4,095 on the measured job)');
    eq(b.v('e-prepared-by').value, JOB_E.siteVisitBy, 'and who walked the house is the job\'s answer again');
    // Reset is not a job switch: the binding and the four fields read off the job record stay as they are.
    eq(b.v('e-job').value, String(JOB_E.id), 'it stays bound to the same client');
    ['e-svc', 'e-sqft', 'e-propval', 'e-start-date'].forEach((id) => eq(b.v(id).value, 'A:' + id,
      `#${id} is untouched — Reset never writes a field the job record owns`));
    ok(!b.log.some((l) => l.startsWith('fetch:')), 'and nothing is reloaded — a Reset is not an open');
    ['r3', 'private_note', 'coll_1'].forEach((k) => eq(a.calls.find((c) => c.endsWith(' ' + k)), 'abort ' + k,
      `a dictation still running on "${k}" is aborted, as on every other path`));
    ok(b.log.some((l) => l.startsWith('fb:ok:Cleared to a blank estimate.')), 'and the line under the button says it happened');

    // Cancel changes nothing.
    const c0 = aLeftItThisWay(JOB_E.id);
    const c = build({ seed: c0.seed, state: c0.state, jobs: [JOB_E], confirmSays: false });
    press(c.ctx, 'Cancel');
    eq(c.v('e-discount').value, 'A:e-discount', 'answering Cancel leaves the discount');
    eq(c.ctx._privateWalkNote, 'The son contests the will.', 'the private note');
    eq(c.ctx.roomState('r0'), 'in', 'and the rooms');
    eq(c0.calls, [], 'and does not even stop a dictation');

    // ⚠ WITH AN ESTIMATE SAVED, Reset IS NOT Start over: it gives a blank estimate and leaves the saved
    // record where it is. Nothing is written until Save.
    const savedE = { jobId: JOB_E.id, svc: JOB_E.svc, discountPct: 5, privateNote: 'Saved note.', collections: [{ id: 3, name: 'Saved silver' }],
                     rooms: [{ idx: 0, section: ROWS[0].section, name: ROWS[0].name, vol: 3, cplx: 3 }] };
    const store = { [JOB_E.id]: { estimate: savedE, approved: false } };
    const before = JSON.stringify(store);
    const d0 = aLeftItThisWay(JOB_E.id);
    const d = build({ seed: d0.seed, state: d0.state, jobs: [JOB_E], store });
    press(d.ctx, 'saved');
    const askedSaved = (d.log.find((l) => l.startsWith('confirm:')) || '');
    has(askedSaved, 'The saved estimate is not changed unless you press Save', 'with an estimate saved, the question says the saved one is not touched');
    has(askedSaved, 'Start over reopens it instead', 'and points at the button that goes back to it');
    lacks(askedSaved, 'None of it has been saved', 'and never claims nothing is saved');
    eq(JSON.stringify(store), before, 'the saved record is exactly as it was');
    eq(d.v('e-discount').value, '0', 'and the screen is BLANK — not the saved 5%, which is what Start over would bring back');
    eq(d.ctx._privateWalkNote, '', 'no private note, saved or unsaved');
    eq(d.ctx.collectionsData, [], 'no collection');
    ok(d.log.some((l) => l.includes('The saved estimate is unchanged until you press Save')), 'and the line under the button repeats that the saved one is unchanged');
    // An empty record is not a saved estimate — the open treats it as a fresh build — so the question
    // must not promise one.
    const f0 = aLeftItThisWay(JOB_E.id);
    const f = build({ seed: f0.seed, state: f0.state, jobs: [JOB_E], store: { [JOB_E.id]: { estimate: { jobId: JOB_E.id, svc: JOB_E.svc, rooms: [] } } } });
    press(f.ctx, 'empty record');
    has((f.log.find((l) => l.startsWith('confirm:')) || ''), 'None of it has been saved', 'an EMPTY saved record gets the nothing-saved question');

    // ⚠ A LOCKED ESTIMATE IS REFUSED WHERE THE ACTION RUNS, not only by the disabled button: calcAll would
    // put a blank working copy under an estimate a manager is reviewing, and checkPin approves the working copy.
    [['estimateSubmitted', 'out for manager approval'], ['estimateApproved', 'Edit estimate']].forEach(([flag, says]) => {
      const l0 = aLeftItThisWay(JOB_E.id);
      const l = build({ seed: l0.seed, state: Object.assign({}, l0.state, { [flag]: true }), jobs: [JOB_E] });
      press(l.ctx, flag);
      ok(!l.log.some((x) => x.startsWith('confirm:')), `${flag}: nothing is asked`);
      eq(l.v('e-discount').value, 'A:e-discount', `${flag}: nothing is cleared`);
      eq(l.ctx.roomState('r0'), 'in', `${flag}: the rooms stay`);
      ok(l.log.some((x) => x.startsWith('fb:warn:') && x.includes(says)), `${flag}: the refusal says why ("${says}")`);
    });

    // It resets for the job it is bound to — the object, by id — and for nobody when unbound, with the
    // scratch auto-save suppressed while it runs, like the open does.
    const seen = [];
    const r = sandbox({ fns: ['resetEstimate', 'clearEstimateScratch'],
      stubs: { document: domStub({ 'e-job': { value: '12' } }), jobs: [JOB_E], estimateStore: {}, window: {},
               estimateApproved: false, estimateSubmitted: false, confirm: () => true, showFB() {},
               estimateHasContent: () => false,
               resetEstimateJobState(job) { seen.push([job, r.window._suppressEstimateAutoSave]); } } });
    press(r, 'bound');
    eq(seen.map((x) => x[0] && x[0].id), [12], 'the bound job is what the reset seeds from');
    ok(seen.every((x) => x[1] === true), 'with the scratch auto-save suppressed while it runs');
    eq(r.window._suppressEstimateAutoSave, false, 'and released afterwards');
    const u = sandbox({ fns: ['resetEstimate', 'clearEstimateScratch'],
      stubs: { document: domStub({ 'e-job': { value: '' } }), jobs: [JOB_E], estimateStore: {}, window: {},
               estimateApproved: false, estimateSubmitted: false, confirm: () => true, showFB() {},
               estimateHasContent: () => false, resetEstimateJobState(job) { seen.push([job]); } } });
    press(u, 'unbound');
    eq((seen[1] || [])[0], null, 'and an unbound screen resets for nobody (null)');

    // The button's tooltip is the first thing that says what it does.
    const rsBtn = (src.match(/<button[^>]*onclick="resetEstimate\(\)"[^>]*>/) || [''])[0];
    has(rsBtn, 'blank estimate for this client', 'the Reset tooltip says it gives a blank estimate for this client');
    has(rsBtn, 'not changed unless you press Save', 'and that a saved estimate is not changed');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  group('⚠⚠ WHAT THE TWO BUTTONS DISCARD, THIS DEVICE FORGETS TOO — the unsaved-draft copy goes with it');
  {
    // calcAll keeps an unsaved-draft copy of the working estimate on this device (saveEstimateScratch),
    // and an open that is offline with nothing saved restores it — the field safety net. It refuses to
    // write an empty-rooms state, so after Reset or Start over it went on holding the build just
    // discarded. Measured on the real page: offline with nothing saved, Start over put the four discarded
    // rooms straight back under "restored an unsaved draft"; Reset, a reload and an offline open did the same.
    // Driven here through the REAL Start over / Reset, the real clear, the real open and the real restore.
    const KEY = 'havellin_est_scratch';
    const draftFor = (job) => JSON.stringify({ jobId: job.id, savedAt: 1, approved: false, submitted: false,
      estimate: { jobId: job.id, svc: job.svc, discountPct: 10, privateNote: 'The discarded note.',
                  rooms: [{ idx: 0, section: ROWS[0].section, name: ROWS[0].name, vol: 5, cplx: 4 }] } });
    const draftOwner = (b) => { const s = b.ctx.localStorage.getItem(KEY); return s ? JSON.parse(s).jobId : null; };
    const said = (b, needle) => b.log.some((l) => l.startsWith('fb:') && l.includes(needle));
    // Read defensively: a handler that throws must fail the checks after it, not stop the file.
    const press = (b, name) => { let err = null; try { b.ctx[name](); } catch (e) { err = e; }
      ok(!err, `${name} does not throw` + (err ? ' — threw ' + err.message : '')); };

    // START OVER, OFFLINE, NOTHING SAVED — the case that restored the discarded build on the spot.
    const s0 = aLeftItThisWay(JOB_A.id);
    const s = build({ seed: s0.seed, state: s0.state, status: 'offline' });
    s.ctx.localStorage.setItem(KEY, draftFor(JOB_A));
    press(s, 'startEstimateOver');
    eq(draftOwner(s), null, '⚠ Start over drops this client\'s unsaved-draft copy');
    ok(!said(s, 'restored an unsaved draft'), '⚠⚠ and its own reopen, offline with nothing saved, does NOT bring the discarded build back');
    ok(said(s, 'no estimate for "' + JOB_A.name + '" is stored on this device'), 'it says nothing is stored here, and starts from the intake answers');
    eq(s.v('e-discount').value, '0', 'no discount from the discarded build');
    eq(s.ctx._privateWalkNote, '', 'no private note from it');
    eq(s.ctx.roomState(ROWS[0].id), 'off', 'and no room from it');

    const sc0 = aLeftItThisWay(JOB_A.id);
    const sc = build({ seed: sc0.seed, state: sc0.state, status: 'offline', confirmSays: false });
    sc.ctx.localStorage.setItem(KEY, draftFor(JOB_A));
    press(sc, 'startEstimateOver');
    eq(draftOwner(sc), JOB_A.id, 'answering Cancel keeps it — nothing was discarded');

    // With an estimate saved, Start over offline reopens THAT, never the draft — and still drops the draft,
    // which is the unsaved work it was asked to throw away.
    const w0 = aLeftItThisWay(JOB_A.id);
    const savedW = { jobId: JOB_A.id, svc: JOB_A.svc, discountPct: 5, privateNote: 'Saved note.',
                     rooms: [{ idx: 0, section: ROWS[0].section, name: ROWS[0].name, vol: 3, cplx: 3 }] };
    const w = build({ seed: w0.seed, state: w0.state, status: 'offline', store: { [JOB_A.id]: { estimate: savedW, approved: false } } });
    w.ctx.localStorage.setItem(KEY, draftFor(JOB_A));
    press(w, 'startEstimateOver');
    eq(w.v('e-discount').value, 5, 'with an estimate saved, it reopens the SAVED 5% offline, never the draft\'s 10%');
    eq(draftOwner(w), null, 'and the draft is gone too');

    // RESET blanks the screen in place, so the copy is what an offline open would bring back LATER.
    const r0 = aLeftItThisWay(JOB_A.id);
    const r = build({ seed: r0.seed, state: r0.state, status: 'offline' });
    r.ctx.localStorage.setItem(KEY, draftFor(JOB_A));
    press(r, 'resetEstimate');
    eq(draftOwner(r), null, '⚠ Reset drops this client\'s unsaved-draft copy');
    // …then the open that used to bring it back: a reload, and this client opened offline with nothing saved.
    r.log.length = 0;
    r.ctx.currentEstimate = null;   // a reload holds no working copy
    press(r, 'loadJobIntoEstimate');
    ok(!said(r, 'restored an unsaved draft'), '⚠⚠ opened offline afterwards, the discarded build does NOT come back');
    eq([r.v('e-discount').value, r.ctx._privateWalkNote, r.ctx.roomState(ROWS[0].id)], ['0', '', 'off'],
       'no discount, no private note and no room from it');

    const rc0 = aLeftItThisWay(JOB_A.id);
    const rc = build({ seed: rc0.seed, state: rc0.state, confirmSays: false });
    rc.ctx.localStorage.setItem(KEY, draftFor(JOB_A));
    press(rc, 'resetEstimate');
    eq(draftOwner(rc), JOB_A.id, 'answering Cancel on Reset keeps it');
    ['estimateSubmitted', 'estimateApproved'].forEach((flag) => {
      const l0 = aLeftItThisWay(JOB_A.id);
      const l = build({ seed: l0.seed, state: Object.assign({}, l0.state, { [flag]: true }) });
      l.ctx.localStorage.setItem(KEY, draftFor(JOB_A));
      press(l, 'resetEstimate');
      eq(draftOwner(l), JOB_A.id, `${flag}: a locked Reset clears nothing, this device's copy included`);
    });

    // Only THIS client's copy. There is one slot on the device and it may hold another client's draft.
    const o0 = aLeftItThisWay(JOB_A.id);
    const o = build({ seed: o0.seed, state: o0.state });
    o.ctx.localStorage.setItem(KEY, draftFor(JOB_B));
    press(o, 'resetEstimate');
    eq(draftOwner(o), JOB_B.id, 'Reset on one client leaves ANOTHER client\'s unsaved draft where it is');
    const so0 = aLeftItThisWay(JOB_A.id);
    const so = build({ seed: so0.seed, state: so0.state });
    so.ctx.localStorage.setItem(KEY, draftFor(JOB_B));
    press(so, 'startEstimateOver');
    eq(draftOwner(so), JOB_B.id, 'and so does Start over');
    const ub = build({ seed: { 'e-job': { value: '' } } });
    ub.ctx.localStorage.setItem(KEY, draftFor(JOB_B));
    press(ub, 'resetEstimate');
    eq(draftOwner(ub), JOB_B.id, 'and a Reset on an unbound screen names nobody\'s draft, so it clears none');
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
      // A record under today's rules: the premium and the discount are lines on the fee (fixedLines), so the
      // fee comes back as saved. An older record is restated on reopen (tests/estimator-p12.test.js).
      fixedPrice: true, fixedAmount: 21000, fixedSuggested: 21600, prepFeeOnTop: true, fixedLines: true, rushExPrepFee: true,
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
     'editEstimateForJob', 'startEstimateOver', 'resetEstimate'].forEach((name) => {
      const body = live(fn(name));
      const named = [...NET.keys()].filter((id) => body.includes("'" + id + "'") && !(id in OWNED_BY_THE_JOB));
      eq(named, [], `${name} names no per-client control of its own — the one list is resetEstimateJobState`);
      eq(assignedTopVars(name).filter((v) => STATE.includes(v)), [], `${name} assigns none of the state a saved estimate carries`);
    });
    ['neutralizeEstimateView', 'applyOpenedEstimate', 'clearEstimateTab', 'resetEstimate'].forEach((name) =>
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
