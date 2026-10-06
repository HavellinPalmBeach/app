'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// P16 · THE INVENTORY DESK (2026-09-30, workstream W3). Anthony's answers of 2026-09-30, round 2,
// and the desk's share of the known-bug list.
//
//   A5   A firearm going to a named person could never clear transport: the beneficiary arm refused
//        anything marked Distribute and no disposition meant "to a family member through a dealer".
//        Anthony: "sure". The line now records its DEALER ROUTE (the licensed dealer, who, when),
//        offered only on a non-NFA firearm going to a person; written authority, the serial and the
//        dealer are still required, and an NFA item never travels under any authority.
//   B10  A living client's Approval Request printed the estate-only "not yet valued … reported under
//        oath" notice: `_invCautionNotices` skipped the fiduciary filter the row badge applies.
//   B11  A failed DETAIL shot had no Retry and no bin once the camera moved on, yet lit the room
//        card's "⚠ not saved" for good.
//   B12  The bulk bar offered *Set valuation source…* on a living job, where the field is hidden,
//        and its handler wrote it.
//   B22  (a) the None tier's workbar drew Approval Request twice; (b) no desk control removed one
//        photographed or split line.
//   And the stale text: the Job Plan's import banner, the worklist's "add them on the Job Plan"
//   (whose count was also wrong), the Share w/ Counsel tooltip, and three code comments.
//
// Everything is DRIVEN through the real functions. Each sandbox is the root's own call graph,
// derived from the source (comments and string literals stripped first, so an onclick naming a
// function is not a call), with boundaries stubbed by name — never the rule under test.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const noComments = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

// The functions and top-level vars `roots` reach. `stop` names what the test supplies itself.
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}
// Everything the test supplies is a stop as well: a lifted `var jobs = []` would otherwise overwrite
// the job the test handed in, and a lifted function would override its stub.
function lift(roots, stop, stubs) {
  const c = closure(roots, (stop || []).concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: stubs || {} });
}
// A call that may throw on the unfixed code: a revert must fail its assertions, not end the file.
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·')
  .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&hellip;/g, '…').replace(/\s+/g, ' ');
const count = (h, needle) => String(h || '').split(needle).length - 1;

const ESTATE = { id: 7, name: 'Butler Estate', hvlId: 'HVL-0007', svc: 'probate', addr: '69 Beach Blvd',
                 executor: 'Tripp Butler', deathDate: '2026-04-02', won: true, status: 'won', tc: 'Ashley Jerome',
                 matterType: 'probate', docTier: 'values' };
const LIVING = { id: 2, name: 'Margaret Ellsworth', hvlId: 'HVL-0002', svc: 'downsizing_move', addr: '14 Coconut Row',
                 destAddr: '801 Sunset Ave', won: true, status: 'won', tc: 'Ashley Jerome' };
const ROOMS = [{ idx: 1, name: 'Study', st: 'in' }, { idx: 4, name: 'Kitchen', st: 'in' }];
const LINE = (id, over) => Object.assign({
  stableId: id, label: 'inventory', collId: null, roomIdx: 1, seq: 1, status: 'uploaded',
  objectName: 'Sideboard', category: 'Furniture', ts: 100, updatedAt: 100,
  driveFileId: 'f' + id, driveFileUrl: 'https://drive.google.com/file/d/f' + id + '/view',
}, over || {});
// A firearm going to the daughter, papered in every other respect.
const GUN = (id, over) => LINE(id, Object.assign({
  objectName: 'Remington 870', category: 'Firearms', serial: 'RS12345678',
  authBy: 'Tripp Butler', approvalDate: '2026-09-20', disposition: 'Distribute', channel: 'Marie Delgado (daughter)',
}, over || {}));

module.exports = function ({ group, ok, eq, has, lacks }) {
  // Each group runs guarded: a throw (a helper missing on an older build, a revert that breaks a
  // lift) fails that group's check and the rest of the file still runs.
  const G = (name, body) => { group(name); try { body(); } catch (e) { ok(false, name + ' — threw: ' + String(e && e.message || e).split('\n')[0]); } };

  // ═══════════════════════════════════════════════════════════════════════════
  // A5 · TO A PERSON, THROUGH A LICENSED DEALER
  // ═══════════════════════════════════════════════════════════════════════════
  G('A5 · the gate: the route clears the beneficiary arm, and nothing else does', () => {
    const g = lift(['invTransportBlocked', 'invTransportReason', 'invTransportable', 'invDealerRouteText']);
    const T = (o) => g.invTransportBlocked(GUN('g', o));
    eq(T({}), 'beneficiary', 'fixture: a papered firearm going to a named person is held, as before');
    eq(T({ viaDealer: 'Palm Beach Arms (FFL)' }), '',
       '⚠⚠ with its dealer route recorded it is cleared to carry — it never could be');
    ok(g.invTransportable(GUN('g', { viaDealer: 'Palm Beach Arms (FFL)' })), 'and invTransportable agrees');
    // Everything else still gates it, in the gate's own order.
    eq(T({ viaDealer: 'Palm Beach Arms', authBy: '', approvalDate: '' }), 'authority', 'written authority is still required');
    eq(T({ viaDealer: 'Palm Beach Arms', serial: ' ' }), 'serial', 'and the serial');
    eq(T({ viaDealer: 'Palm Beach Arms', flagNFA: true }), 'nfa',
       '⚠⚠ and an NFA item never travels, route or no route — the arm has no override');
    // The dealer is the route's; Channel / Recipient holds the PERSON on this line.
    eq(T({ viaDealer: 'Palm Beach Arms', channel: '' }), '',
       '⚠ a routed line with nobody named in Channel / Recipient still clears — the dealer is the route\'s');
    eq(g.invTransportDealer(GUN('g', { viaDealer: 'Palm Beach Arms' })), 'Palm Beach Arms',
       'the dealer it is carried to is the route\'s, not the person in Channel / Recipient');
    // A route with no dealer in it is not a route.
    eq(T({ viaDealer: '   ' }), 'beneficiary', 'a blank dealer records no route');
    // The route is read only while the line goes to a person.
    eq(g.invTransportBlocked(GUN('g', { disposition: 'Consign', channel: '', viaDealer: 'Palm Beach Arms' })), 'dealer',
       'on a consigned firearm the route is ignored: the dealer is named in Channel / Recipient');
    eq(g.invTransportBlocked(GUN('g', { disposition: 'Consign', channel: 'Palm Beach Arms (FFL)' })), '',
       'and the ordinary dealer route is untouched');
    // The reason says what clears it now.
    has(g.invTransportReason(GUN('g')), 'dealer route', 'the held line\'s reason names the route that clears it');
    has(g.invTransportReason(GUN('g')), 'licensed dealer', 'and still says who makes the transfer');
    eq(g.invDealerRouteText(GUN('g', { viaDealer: 'Palm Beach Arms' })),
       'to Marie Delgado (daughter), through Palm Beach Arms, a licensed dealer', 'the route as a phrase');
    // Offered only where it can mean something.
    ok(g.invDealerRouteOffered(GUN('g')), 'offered on a non-NFA firearm going to a person');
    ok(!g.invDealerRouteOffered(GUN('g', { flagNFA: true })), '⚠ never on an NFA item');
    ok(!g.invDealerRouteOffered(GUN('g', { disposition: 'Sell' })), 'not on one a dealer buys');
    ok(!g.invDealerRouteOffered(LINE('s', { disposition: 'Distribute' })), 'and not on a sideboard going to a person');
  });

  G('A5 · the handler records the route with who and when, and refuses where the control is withheld', () => {
    const answers = { prompt: 'Palm Beach Arms (FFL)', confirm: true };
    const alerts = [], prompts = [], confirms = [];
    let painted = 0, synced = 0;
    const rig = (refs) => lift(['invSetDealerRoute', 'invTransportBlocked', 'loadPhotoRefs'],
      ['renderInventoryTab', '_scheduleInventorySync', 'alert', '_invReclaimSpace', '_invNoteReclaim', '_warnPhotoStoreFull'], {
        jobs: [Object.assign({}, ESTATE)], _photoRefs: { 7: refs }, _photoRetryData: {},
        renderInventoryTab: () => { painted++; }, _scheduleInventorySync: () => { synced++; },
        alert: (m) => alerts.push(String(m)), _warnPhotoStoreFull: () => {},
        window: { prompt: (m, d) => { prompts.push([m, d]); return answers.prompt; }, confirm: (m) => { confirms.push(m); return answers.confirm; } },
      });
    const s = rig([GUN('g', { updatedAt: 100 })]);
    const r = attempt(() => s.invSetDealerRoute(7, 'g', true));
    ok(r.ok && r.val === true, 'the route is recorded');
    const g = s._getPhotoRef(7, 'g');
    eq(g.viaDealer, 'Palm Beach Arms (FFL)', 'the dealer is the one named at the prompt');
    eq(g.viaDealerBy, 'Ashley Jerome', 'stamped with who: the concierge assigned, as the desk\'s other ticks are');
    ok(g.viaDealerAt > 100, 'and when');
    ok(g.updatedAt > 100, 'the line\'s clock moves, so the record wins the merge');
    has(prompts[0] && prompts[0][0], 'Marie Delgado (daughter)', 'the prompt names the person it is going to');
    eq(s.invTransportBlocked(g), '', '⚠⚠ and the firearm is cleared to carry through the real handler');
    ok(painted >= 1 && synced >= 1, 'the desk repaints and the manifest is queued for the sheet');
    // Saved through the real whitelist: a reload keeps it.
    s._photoRefs[7] = [];
    s.loadPhotoRefs(7);
    const back = s._getPhotoRef(7, 'g') || {};
    eq([back.viaDealer, back.viaDealerBy, !!back.viaDealerAt], ['Palm Beach Arms (FFL)', 'Ashley Jerome', true],
       '⚠ the route survives a reload — its three keys are on the savePhotoRefs whitelist');

    // Taking it off is a deliberate, stamped clear.
    answers.confirm = true;
    s.invSetDealerRoute(7, 'g', false);
    const off = s._getPhotoRef(7, 'g');
    eq(off.viaDealer, '', 'the route comes off');
    ok(off.clearedAt && off.clearedAt.viaDealer > 0, 'and the clear is stamped, so a stale copy cannot put it back');
    eq(s.invTransportBlocked(off), 'beneficiary', 'and the firearm is held again');
    answers.confirm = false;
    s.invSetDealerRoute(7, 'g', true);   // record again, then refuse to take it off
    s.invSetDealerRoute(7, 'g', false);
    eq(s._getPhotoRef(7, 'g').viaDealer, 'Palm Beach Arms (FFL)', 'a cancelled confirm leaves the route as it was');

    // A blank answer records nothing.
    const b = rig([GUN('b')]);
    answers.prompt = '   ';
    eq(b.invSetDealerRoute(7, 'b', true), false, 'no dealer named, no route');
    eq(b._getPhotoRef(7, 'b').viaDealer, undefined, 'nothing is written');

    // ⚠ THE HANDLER ASKS WHAT THE CONTROL ASKS.
    answers.prompt = 'Palm Beach Arms';
    const n = rig([GUN('n', { flagNFA: true }), GUN('c', { disposition: 'Consign', channel: 'Palm Beach Arms' }), LINE('s', { disposition: 'Distribute' })]);
    alerts.length = 0; prompts.length = 0;
    eq(n.invSetDealerRoute(7, 'n', true), false, '⚠⚠ refused on an NFA item');
    has(alerts[0], 'NFA item never travels with Havellin', 'and it says why');
    eq(n.invSetDealerRoute(7, 'c', true), false, 'refused on a firearm a dealer is consigned');
    has(alerts[1], 'Set its disposition to Distribute first', 'naming what the route is for');
    eq(n.invSetDealerRoute(7, 's', true), false, 'refused on anything that is not a firearm');
    eq(prompts.length, 0, 'none of them was even asked for a dealer');
    eq(['n', 'c', 's'].map((id) => n._getPhotoRef(7, id).viaDealer), [undefined, undefined, undefined], 'and none carries a route');
    eq(n.invTransportBlocked(n._getPhotoRef(7, 'n')), 'nfa', 'the NFA item is exactly as blocked as before');
  });

  G('A5 · the route is release authority\'s neighbour: it survives a stale device\'s newer edit', () => {
    const m = lift(['mergeMediaItems']);
    const mine = GUN('g', { updatedAt: 10, viaDealer: 'Palm Beach Arms', viaDealerBy: 'Ashley Jerome', viaDealerAt: 10 });
    const stale = GUN('g', { updatedAt: 20, condition: 'Good' });   // never saw the route
    [m.mergeMediaItems([mine], [stale])[0], m.mergeMediaItems([stale], [mine])[0]].forEach((x, i) => {
      eq([x.viaDealer, x.viaDealerBy, x.viaDealerAt, x.condition], ['Palm Beach Arms', 'Ashley Jerome', 10, 'Good'],
         '⚠ the route is sticky and the newer edit still lands (order ' + i + ')');
    });
    const cleared = GUN('g', { updatedAt: 30, viaDealer: '', viaDealerBy: '', viaDealerAt: '',
                               clearedAt: { viaDealer: 30, viaDealerBy: 30, viaDealerAt: 30 } });
    eq(m.mergeMediaItems([mine], [cleared])[0].viaDealer, '', 'and a deliberate clear wins over the older route');
  });

  G('A5 · the line\'s record and the desk row name the route; the control is offered only where it applies', () => {
    const rowRig = (refs) => {
      const s = lift(['_renderInvRow', 'invSetDealerRoute'],
        ['_invInput', '_invThumbHTML', 'custodyEvents', '_invPanelCols', 'renderInventoryTab', '_scheduleInventorySync', 'alert'], {
          jobs: [Object.assign({}, ESTATE)], _photoRefs: { 7: refs },
          _invInput: () => '', _invThumbHTML: () => '<div></div>', custodyEvents: () => [], _invPanelCols: () => [],
          renderInventoryTab: () => {}, _scheduleInventorySync: () => {}, alert: () => {},
          estimateStore: { 7: { estimate: { rooms: ROOMS } } },
          window: { prompt: () => 'Palm Beach Arms (FFL)', confirm: () => true },
        });
      s._invOpen = {}; s._agDupSet = {};
      return s;
    };
    const s = rowRig([GUN('g'), GUN('n', { flagNFA: true, stableId: 'n' }), GUN('c', { disposition: 'Consign', channel: 'Palm Beach Arms' })]);
    const row = (id, open) => { s._invOpen = open ? { [id]: 1 } : {}; return s._renderInvRow(ESTATE, s._getPhotoRef(7, id)); };
    const r0 = attempt(() => row('g', true));
    ok(r0.ok, 'the row and its record render' + (r0.ok ? '' : ': ' + r0.err));
    const before = r0.val || '';
    has(before, "invSetDealerRoute(7,'g',true)", '⚠⚠ the line\'s record offers the route, wired to the real handler');
    has(text(before), 'Through a licensed dealer…', 'in those words');
    has(text(before), 'Not cleared to carry', 'with the firearm\'s transport status');
    has(text(row('g', false)), 'no dealer route', 'and the desk row says the route is missing before the record is opened');
    lacks(row('n', true), 'invSetDealerRoute(', '⚠⚠ never offered on an NFA item');
    has(text(row('n', true)), 'NFA item — never transported by Havellin', 'which says why it cannot travel');
    lacks(row('c', true), 'invSetDealerRoute(', 'not offered on a firearm a dealer is consigned');
    has(text(row('c', true)), 'Cleared to carry', 'which is carried to the dealer in its Channel / Recipient');
    // Press it (the handler is the real one), then read the record and the row again.
    s.invSetDealerRoute(7, 'g', true);
    const after = text(row('g', true));
    has(after, 'To Marie Delgado (daughter), through Palm Beach Arms (FFL), a licensed dealer', 'the record names the route');
    has(after, 'recorded by Ashley Jerome', 'and who recorded it');
    has(after, 'Cleared to carry. Havellin’s named principal alone takes it to Palm Beach Arms (FFL)', 'and that it may now be carried, by whom and to where');
    has(row('g', true), "invSetDealerRoute(7,'g',false)", 'with a way to take it off');
    has(text(row('g', false)), 'via Palm Beach Arms (FFL)', 'and the desk row names the route');
    lacks(text(row('g', false)), 'no dealer route', 'in place of the missing-route chip');
    // A sideboard carries no firearm block.
    const plain = rowRig([LINE('p', { disposition: 'Distribute', channel: 'Marie' })]);
    plain._invOpen = { p: 1 };
    lacks(text(plain._renderInvRow(ESTATE, plain._getPhotoRef(7, 'p'))), 'Firearm', 'a sideboard has no firearm block');
  });

  G('A5 · the release approval request and the worklist name the route', () => {
    const printed = [];
    const docRig = (job, refs) => lift(['printApprovalRequest', 'printAppraisalWorklist'],
      ['_printDocument', '_invPrintThumb', 'maivAggregate'], {
        jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: refs },
        _printDocument: (html, title) => { printed.push({ html, title }); return true; },
        _invPrintThumb: () => '', maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }),
        estimateStore: { [job.id]: { estimate: { rooms: ROOMS } } }, document: domStub({}),
      });
    const refs = [GUN('g', { itemNo: 1, viaDealer: 'Palm Beach Arms (FFL)', viaDealerBy: 'Ashley Jerome', viaDealerAt: 5 }),
                  GUN('u', { itemNo: 2, objectName: 'Colt 1911', serial: 'C99' }),
                  GUN('n', { itemNo: 3, objectName: 'Suppressor', serial: 'S1', flagNFA: true, disposition: 'Consign', channel: 'Palm Beach Arms' })];
    // The request goes out BEFORE the authority comes back, so its lines carry none yet (a line with an
    // approval date is not awaiting one and is not on the request at all).
    const unsigned = refs.map((x) => Object.assign({}, x, { authBy: '', approvalDate: '' }));
    const q = docRig(ESTATE, unsigned);
    const r = attempt(() => q.printApprovalRequest(7, false));
    ok(r.ok, 'the request prints' + (r.ok ? '' : ': ' + r.err));
    const req = text((printed[printed.length - 1] || {}).html);
    has(req, 'Marie Delgado (daughter) through Palm Beach Arms (FFL), a licensed dealer',
        '⚠⚠ the routed line names the dealer it goes through, on the line the representative initials');
    eq(count(req, ', a licensed dealer'), 1, 'only the routed line carries a route');
    has(req, 'A firearm going to a named person goes to the dealer as well, and the dealer makes the transfer to that person',
        'and the firearms note says how a firearm reaches a person');
    has(req, 'Havellin never hands a firearm to anyone', 'including that Havellin hands none over');
    has(req, 'flagged NFA', 'the NFA sentence is untouched');
    // Without a person on the list the note says nothing about one.
    const t = docRig(ESTATE, [GUN('c', { itemNo: 1, disposition: 'Consign', channel: 'Palm Beach Arms', authBy: '', approvalDate: '' })]);
    const n0 = printed.length;
    t.printApprovalRequest(7, false);
    eq(printed.length, n0 + 1, 'fixture: the consigned firearm\'s request printed');
    lacks(text((printed[printed.length - 1] || {}).html), 'going to a named person', 'no person on the list, no person in the note');

    // The worklist is read once the authority is back: the same three firearms, signed for.
    const s = docRig(ESTATE, refs);
    const w = attempt(() => s.printAppraisalWorklist(7));
    ok(w.ok, 'the worklist prints' + (w.ok ? '' : ': ' + w.err));
    const wl = text((printed[printed.length - 1] || {}).html);
    has(wl, '1 cleared to carry.', '⚠⚠ the routed firearm is cleared to carry on the worklist');
    has(wl, '#1 Remington 870 · RS12345678 · to Marie Delgado (daughter), through Palm Beach Arms (FFL), a licensed dealer',
        'with its serial and its route');
    has(wl, '#2 Colt 1911 — Going to a named person', 'the unrouted one is held with the reason');
    has(wl, 'record its dealer route', 'which names the fix');
    has(wl, '#3 Suppressor — NFA item — never transported by Havellin', 'and the NFA item stays blocked');
    // Before the authority comes back, the worklist's awaiting-authority note says where a person-bound firearm's dealer goes.
    const u = docRig(ESTATE, unsigned);
    u.printAppraisalWorklist(7);
    const held = text((printed[printed.length - 1] || {}).html);
    has(held, '3 firearms are awaiting written authority', 'fixture: all three await authority');
    has(held, 'with the dealer in Channel / Recipient (on a firearm going to a named person, on its dealer route)',
        'and the note says where the dealer is recorded on a firearm going to a person');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B10 · THE ESTATE-ONLY NOTICE IS ESTATE-ONLY
  // ═══════════════════════════════════════════════════════════════════════════
  G('B10 · a living client\'s Approval Request prints no valuation caution; an estate\'s still does', () => {
    const printed = [];
    const docRig = (job) => lift(['printApprovalRequest', '_invBulkApply'],
      ['_printDocument', '_invPrintThumb', 'showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync'], {
        jobs: [Object.assign({}, job)],
        _photoRefs: { [job.id]: [
          LINE('a', { itemNo: 1, objectName: 'Oil painting', category: 'Art & Décor', disposition: 'Auction', needsAppr: true }),
          LINE('b', { itemNo: 2, objectName: 'Locket', category: 'Jewelry & Watches', disposition: 'Distribute', channel: 'Karen', flagBequest: true, fmv: '200' }),
        ] },
        _printDocument: (html) => { printed.push(html); return true; }, _invPrintThumb: () => '',
        showSyncBadge: () => {}, renderInventoryTab: () => {}, _scheduleInventorySync: () => {},
        estimateStore: { [job.id]: { estimate: { rooms: ROOMS } } }, document: domStub({}),
      });
    const L = docRig(LIVING);
    const r = attempt(() => L.printApprovalRequest(2, false));
    ok(r.ok, 'the living request prints' + (r.ok ? '' : ': ' + r.err));
    const living = text(printed[printed.length - 1]);
    lacks(living, 'reported under oath', '⚠⚠ no "reported under oath" on a living client\'s request');
    lacks(living, 'has not been valued yet', 'no valuation notice at all above the table');
    lacks(living, 'NOT YET APPRAISED', 'and none on the row (as before)');
    has(living, 'Specific bequests on this request', 'the bequest caution is not fiduciary and still prints');
    has(living, 'Oil painting', 'the line is on the request, going where the family said');
    const E = docRig(ESTATE);
    E.printApprovalRequest(7, false);
    const estate = text(printed[printed.length - 1]);
    has(estate, 'Property on this request has not been valued yet', 'an estate\'s request keeps the notice');
    has(estate, 'reported under oath', 'with the federal-return sentence');
    // The notice asks the one rule the badge asks, so notice and badge agree line by line.
    [L, E].forEach((s, i) => {
      const job = i ? ESTATE : LIVING;
      const rows = s._jobInvRefs(job.id);
      const byRule = s.INV_RELEASE_CAUTIONS.filter((c) => rows.some((x) => s.invReleaseCautions(x, job.id).indexOf(c) >= 0)).map((c) => c.head);
      const printedHeads = s.INV_RELEASE_CAUTIONS.filter((c) => s._invCautionNotices(rows, job.id).indexOf(c.head) >= 0).map((c) => c.head);
      eq(printedHeads, byRule, (i ? 'estate' : 'living') + ': the notices printed are exactly the cautions the rule raises');
    });
    // The bulk bar's own warning reads the same rule.
    const badges = [];
    const B = lift(['_invBulkApply'], ['showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync'], {
      jobs: [Object.assign({}, LIVING)], _photoRefs: { 2: [LINE('a', { objectName: 'Oil painting', category: 'Art & Décor', needsAppr: true })] },
      showSyncBadge: (m) => badges.push(String(m)), renderInventoryTab: () => {}, _scheduleInventorySync: () => {},
    });
    B._invPick = { a: 1 };
    B._invBulkApply(2, 'disposition', 'Auction');
    ok(badges.length === 1 && /Auction set on 1 item/.test(badges[0]), 'fixture: the bulk bar set the disposition');
    lacks(badges[0], 'not yet appraised', 'and on a living job it does not call the line "not yet appraised"');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B11 · A FAILED DETAIL SHOT CAN ALWAYS BE CLEARED
  // ═══════════════════════════════════════════════════════════════════════════
  G('B11 · a failed detail shot has a tile with Retry and the bin, so "not saved" can always be cleared', () => {
    const trashed = [];
    const refs = () => [
      LINE('i1', { objectName: 'Tiffany lamp', seq: 3, ts: 1 }),
      { stableId: 'd1', roomIdx: 1, label: 'detail', groupId: 'i1', seq: 1, status: 'failed', ts: 2, collId: null },
      { stableId: 'd2', roomIdx: 1, label: 'detail', groupId: 'i1', seq: 2, status: 'uploaded', driveFileId: 'fd2', ts: 3, collId: null },
      { stableId: 'b1', roomIdx: 1, label: 'before', seq: 1, status: 'uploaded', driveFileId: 'fb1', ts: 0, collId: null },
    ];
    const rig = () => lift(['_roomShotStripHtml', '_planRoomListHtml', 'discardShot', 'retryPhotoUpload'],
      ['_doPhotoUpload', '_trashShotFiles', '_scheduleInventorySync', '_repaintPlanRooms', '_paintRoomWorkspace', 'confirm', 'alert', '_invCacheLocalThumb'], {
        jobs: [Object.assign({}, ESTATE)], _photoRefs: { 7: refs() }, jobPlanStore: {},
        estimateStore: { 7: { estimate: { rooms: ROOMS } } }, document: domStub({}),
        _doPhotoUpload: (jobId, data, name, sid, sub, cb) => { const x = ctx._getPhotoRef(jobId, sid); x.status = 'uploaded'; x.driveFileId = 'new'; if (cb) cb(); },
        _trashShotFiles: (ids) => trashed.push(...ids), _scheduleInventorySync: () => {}, _repaintPlanRooms: () => {}, _paintRoomWorkspace: () => {},
        confirm: () => true, alert: () => {}, _invCacheLocalThumb: () => {},
      });
    let ctx = rig();
    ctx._photoRetryData = { d1: 'data:image/jpeg;base64,AAAA' };
    const strip = ctx._roomShotStripHtml(7, 1);
    has(ctx._planRoomListHtml(7), 'not saved', 'fixture: the room card reads "⚠ not saved" for the failed detail');
    has(strip, "retryPhotoUpload(7,'d1')", '⚠⚠ the failed detail shot has a Retry');
    has(strip, "discardShot(7,'d1')", '⚠⚠ and the bin');
    has(text(strip), 'Detail of Tiffany lamp', 'and says which object it is a close-up of');
    has(text(strip), 'Detail shots not saved · 1', 'under its own heading, counting only what is not saved');
    lacks(strip, "discardShot(7,'d2')", 'an uploaded close-up is not drawn: it is counted on its item (+2 detail)');
    // ⚠ THE RULE, DERIVED: every shot the room card counts as not saved has a Retry in the strip.
    const failing = ctx._photoRefs[7].filter((x) => x.roomIdx === 1 && !x.collId && !x.deletedAt && x.status === 'failed');
    ok(failing.length === 1 && failing.every((x) => strip.indexOf("retryPhotoUpload(7,'" + x.stableId + "')") >= 0),
       'every shot behind "not saved" is reachable from the room');
    // Retry lands it: the tile and the warning go.
    ctx.retryPhotoUpload(7, 'd1');
    eq(ctx._getPhotoRef(7, 'd1').status, 'uploaded', 'Retry resends it (the upload answered)');
    lacks(ctx._planRoomListHtml(7), 'not saved', 'and the room card stops reading "not saved"');
    lacks(ctx._roomShotStripHtml(7, 1), "retryPhotoUpload(7,'d1')", 'and the tile goes');
    // The bin clears it too, and never touches the item or the as-found shot.
    ctx = rig();
    ctx._fieldCam = { open: false };
    const binned = attempt(() => ctx.discardShot(7, 'd1'));
    ok(binned.ok && binned.val === true, 'the bin takes the failed detail shot' + (binned.ok ? '' : ': ' + binned.err));
    ok(ctx._getPhotoRef(7, 'd1').deletedAt > 0, 'tombstoned');
    lacks(ctx._planRoomListHtml(7), 'not saved', '⚠ and the warning clears');
    ok(!ctx._getPhotoRef(7, 'i1').deletedAt && !ctx._getPhotoRef(7, 'b1').deletedAt, 'the item and the as-found shot are untouched');
    eq(trashed, [], 'and nothing is asked of Drive: the shot never reached it');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B12 · THE BULK BAR OFFERS ONLY WHAT THE JOB SHOWS
  // ═══════════════════════════════════════════════════════════════════════════
  G('B12 · Set valuation source… only where the field shows, and the handler refuses elsewhere', () => {
    const badges = [];
    const rig = (job) => {
      const s = lift(['_renderInvBulk', '_invBulkApply', '_invPanelCols'],
        ['showSyncBadge', 'renderInventoryTab', '_scheduleInventorySync'], {
          jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: [LINE('a')] },
          showSyncBadge: (m) => badges.push(String(m)), renderInventoryTab: () => {}, _scheduleInventorySync: () => {},
          estimateStore: { [job.id]: { estimate: { rooms: ROOMS } } },
        });
      s._invPick = { a: 1 };
      return s;
    };
    const L = rig(LIVING), E = rig(ESTATE);
    const lb = attempt(() => L._renderInvBulk(LIVING));
    ok(lb.ok, 'the living bar renders' + (lb.ok ? '' : ': ' + lb.err));
    lacks(lb.val, 'Set valuation source', '⚠⚠ a living job\'s bulk bar does not offer the valuation source');
    has(E._renderInvBulk(ESTATE), 'Set valuation source', 'an estate\'s still does');
    has(lb.val, 'Set disposition', 'and the rest of the living bar is untouched');
    L._invBulkApply(2, 'valSource', 'Appraisal');
    eq(L._photoRefs[2][0].valSource, undefined, '⚠⚠ the handler writes no valuation source on a living job');
    has(badges[badges.length - 1], 'not recorded on this job', 'and says so');
    E._invBulkApply(7, 'valSource', 'Appraisal');
    eq(E._photoRefs[7][0].valSource, 'Appraisal', 'on an estate it writes it');
    // ⚠ ONE RULE: for every column, the bar's offer and the handler's answer match the panel's.
    E.INVENTORY_COLUMNS.forEach((c) => {
      [LIVING, ESTATE].forEach((job) => {
        const s = job === LIVING ? L : E;
        const onPanel = s._invPanelCols(job).some((x) => x.key === c.key) || c.hideInTab || ['seq', 'fmv', 'disposition'].indexOf(c.key) >= 0;
        if (c.fid) eq(s._invKeyOnJob(job, c.key), onPanel, c.key + ' on ' + (job === LIVING ? 'a living job' : 'an estate') + ': the bulk rule is the panel\'s');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B22 (a) · ONE APPROVAL REQUEST BUTTON
  // ═══════════════════════════════════════════════════════════════════════════
  G('B22a · the workbar draws the Approval Request once, at every tier', () => {
    const bar = (job) => {
      const s = lift(['_renderInvWorkbar'], [], {
        jobs: [Object.assign({}, job)], _photoRefs: { [job.id]: [LINE('a')] },
        estimateStore: { [job.id]: { estimate: { rooms: ROOMS } } }, document: domStub({}),
      });
      return s._renderInvWorkbar(Object.assign({}, job), s._jobInvRefs(job.id));
    };
    const none = bar(Object.assign({}, ESTATE, { docTier: 'none' }));
    eq(count(none, 'onclick="printApprovalRequest(7)"'), 1, '⚠⚠ at the None tier the Approval Request is drawn once — it was twice');
    ok(/background:var\(--gray-dk\)[^>]*>Approval Request</.test(none), 'as the primary');
    ['contents', 'values', 'appraisals'].forEach((tier) => {
      eq(count(bar(Object.assign({}, ESTATE, { docTier: tier })), 'onclick="printApprovalRequest(7)"'), 1, tier + ': once');
    });
    eq(count(bar(LIVING), 'onclick="printApprovalRequest(2)"'), 1, 'a living job: once');
    // The Share w/ Counsel tooltip names both folders, by the rule that files the shots.
    has(bar(ESTATE), 'Read-only access to the Estate Inventory and As-Found Record Drive folders',
        'Share w/ Counsel names both photograph folders it shares');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B22 (b) · REMOVE ONE LINE
  // ═══════════════════════════════════════════════════════════════════════════
  G('B22b · Remove line takes the line — photographed, split or typed — and never the photograph', () => {
    const confirms = [], trashCalls = [], discards = [];
    let answer = true;
    const rig = (refs) => lift(['invRemoveLine', 'restoreInventoryItem', '_renderRemovedRows', 'loadPhotoRefs', '_invAssignItemNos'],
      ['renderInventoryTab', '_scheduleInventorySync', 'driveTrashFile', '_trashShotFiles', 'discardShot', 'showSyncBadge', '_warnPhotoStoreFull'], {
        jobs: [Object.assign({}, ESTATE)], _photoRefs: { 7: refs },
        renderInventoryTab: () => {}, _scheduleInventorySync: () => {}, showSyncBadge: () => {}, _warnPhotoStoreFull: () => {},
        driveTrashFile: (id) => trashCalls.push(id), _trashShotFiles: (ids) => trashCalls.push(...ids), discardShot: (j, id) => discards.push(id),
        _invMoney: (v) => '$' + v, fmtDate2: (d) => String(d || '—'),
        window: { confirm: (m) => { confirms.push(String(m)); return answer; }, prompt: () => '' },
      });
    const refs = () => [
      LINE('p', { itemNo: 1, objectName: 'Bar console', ts: 10 }),
      LINE('d1', { itemNo: 2, objectName: 'Banksy print', derivedFrom: 'p', driveFileId: 'fp', ts: 10 }),
      LINE('d2', { itemNo: 3, objectName: 'B&O speaker', derivedFrom: 'p', driveFileId: 'fp', ts: 10 }),
      { stableId: 'det', roomIdx: 1, label: 'detail', groupId: 'p', seq: 1, status: 'uploaded', driveFileId: 'fdet', ts: 11 },
      { stableId: 'af', roomIdx: 1, label: 'before', seq: 1, status: 'uploaded', driveFileId: 'faf', ts: 1 },
      LINE('m', { itemNo: 4, objectName: 'Cash in the safe', manual: true, driveFileId: null, driveFileUrl: null, ts: 12 }),
      LINE('x', { itemNo: 5, objectName: 'Walnut desk', status: 'failed', driveFileId: null, driveFileUrl: null, ts: 13 }),
    ];
    const s = rig(refs());
    s._photoRetryData = { x: 'data:image/jpeg;base64,AAAA' };
    const r = attempt(() => s.invRemoveLine(7, 'p'));
    ok(r.ok && r.val === true, 'a photographed line is removed' + (r.ok ? '' : ': ' + r.err));
    has(confirms[0], 'Remove item #1 — Bar console?', '⚠ it asks first, naming the line');
    has(confirms[0], 'The photograph is not deleted', 'and says the photograph stays');
    has(confirms[0], 'the 2 other lines that share it keep it', 'naming the lines that share it');
    const p = s._getPhotoRef(7, 'p');
    ok(p.deletedAt > 0, 'a recorded removal: tombstoned');
    eq(p.deletedBy, 'Ashley Jerome', 'with who removed it');
    ok(p.updatedAt >= p.deletedAt, 'and its clock moved, so the removal wins the merge');
    eq(s._jobInvRefs(7).map((x) => x.stableId), ['d1', 'd2', 'm', 'x'], 'it is off the inventory; the split lines are not');
    eq([s._getPhotoRef(7, 'd1').driveFileId, s._getPhotoRef(7, 'd2').driveFileId], ['fp', 'fp'], 'they keep the photograph');
    ok(!s._getPhotoRef(7, 'det').deletedAt, 'its detail shot is untouched');
    eq([trashCalls.length, discards.length], [0, 0], '⚠⚠ Drive is never asked to trash anything, and the shot binner is never called');
    eq(p.driveFileId, 'fp', 'the removed line still points at its photograph, for Restore');

    // A split line, a typed one and one whose photo never reached Drive.
    confirms.length = 0;
    s.invRemoveLine(7, 'd1');
    ok(s._getPhotoRef(7, 'd1').deletedAt > 0 && !s._getPhotoRef(7, 'd2').deletedAt, 'a split line comes off alone');
    has(confirms[0], 'Remove item #2 — Banksy print?', 'asked about by name');
    s.invRemoveLine(7, 'm');
    ok(s._getPhotoRef(7, 'm').deletedAt > 0, 'a typed line comes off through the same writer');
    eq(s._getPhotoRef(7, 'm').deletedBy, 'Ashley Jerome', 'recording who');
    lacks(confirms[1], 'photograph', 'and a typed line\'s question does not mention a photograph it never had');
    s.invRemoveLine(7, 'x');
    ok(s._getPhotoRef(7, 'x').deletedAt > 0, 'a line whose photograph failed to upload can be removed too');
    eq(s._photoRetryData.x, 'data:image/jpeg;base64,AAAA', '⚠ and its held bytes stay, so Restore and Retry still work');

    // Refusals: never an as-found shot, a detail shot or a line already gone; a cancel changes nothing.
    confirms.length = 0;
    eq([s.invRemoveLine(7, 'af'), s.invRemoveLine(7, 'det'), s.invRemoveLine(7, 'p')], [false, false, false],
       '⚠⚠ an as-found shot, a detail shot and a removed line are refused');
    eq(confirms.length, 0, 'without being asked about');
    ok(!s._getPhotoRef(7, 'af').deletedAt && !s._getPhotoRef(7, 'det').deletedAt, 'and are untouched');
    answer = false;
    eq(s.invRemoveLine(7, 'd2'), false, 'a cancelled confirm removes nothing');
    ok(!s._getPhotoRef(7, 'd2').deletedAt, 'the line is still there');
    answer = true;

    // The number stays spent.
    s._photoRefs[7].push(LINE('new', { objectName: 'Rug', ts: 50, itemNo: null }));
    s._invAssignItemNos(7);
    eq(s._getPhotoRef(7, 'new').itemNo, 6, '⚠ a new line is numbered past every removed one — #1, #2, #4 and #5 stay spent');

    // Removed items names who, and Restore gives the line back whole.
    const panel = text(s._renderRemovedRows(7));
    has(panel, '#1 · Bar console', 'Removed items lists it');
    has(panel, 'by Ashley Jerome', 'with who removed it');
    has(panel, 'removed as a line and kept its photograph, so Restore gives both back', 'and says what Restore gives back');
    s.restoreInventoryItem(7, 'p');
    const back = s._getPhotoRef(7, 'p');
    ok(!back.deletedAt && !back.deletedBy, 'Restore brings the line back and drops the removal\'s stamp');
    eq([back.itemNo, back.driveFileId], [1, 'fp'], 'under its own number, with its photograph');
    // The removal is written through: a reload finds the tombstone and who made it.
    s.invRemoveLine(7, 'd2');
    s._photoRefs[7] = [];
    s.loadPhotoRefs(7);
    const again = s._getPhotoRef(7, 'd2') || {};
    ok(again.deletedAt > 0 && again.deletedBy === 'Ashley Jerome', '⚠ a removal survives a reload of this device');
  });

  G('B22b · the removal survives a sync from a stale device, on the app and on the server', () => {
    const m = lift(['mergeMediaItems', 'loadPhotoRefs', 'savePhotoRefs'], ['_warnPhotoStoreFull'], { _warnPhotoStoreFull: () => {} });
    const stale = LINE('p', { itemNo: 1, updatedAt: 100 });
    const removed = LINE('p', { itemNo: 1, updatedAt: 200, deletedAt: 200, deletedBy: 'Ashley Jerome' });
    [m.mergeMediaItems([removed], [stale])[0], m.mergeMediaItems([stale], [removed])[0]].forEach((x, i) => {
      eq([x.deletedAt, x.deletedBy], [200, 'Ashley Jerome'], '⚠⚠ the stale copy does not bring the line back (app, order ' + i + ')');
    });
    // The server's own merge (saveInventory.gs), lifted and driven beside the app's.
    const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'saveInventory.gs'), 'utf8');
    const grab = (name) => (gs.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')) || [''])[0];
    const gctx = {}; vm.createContext(gctx);
    vm.runInContext([(gs.match(/var INV_STICKY_FIELDS = \[[\s\S]*?\];/) || [''])[0], grab('_invHasVal'), grab('_invStickyValue'),
                     grab('_custodyEventId'), grab('_mergeCustodyLogs'), grab('_invApprovalEntries'), grab('_invApprovalSetAt'), grab('_invMergeApprovals'),
                     grab('_mergeMediaItems')].join('\n\n'), gctx);
    ok(typeof gctx._mergeMediaItems === 'function', 'fixture: the server merge is lifted');
    [gctx._mergeMediaItems([removed], [stale])[0], gctx._mergeMediaItems([stale], [removed])[0]].forEach((x, i) => {
      eq([x.deletedAt, x.deletedBy], [200, 'Ashley Jerome'], 'nor on the sheet (server, order ' + i + ')');
    });
    // And a reload keeps both halves of the record.
    m._photoRefs[7] = [removed];
    m.savePhotoRefs(7);
    m._photoRefs[7] = [];
    m.loadPhotoRefs(7);
    eq([m._photoRefs[7][0].deletedAt, m._photoRefs[7][0].deletedBy], [200, 'Ashley Jerome'],
       '⚠ deletedBy is on the savePhotoRefs whitelist, or it is dropped on the next save');
    // A field discard's Drive-bin marker is kept too, so Removed items tells the two apart after a reload.
    m._photoRefs[7] = [LINE('q', { deletedAt: 5, driveTrashed: 1 })];
    m.savePhotoRefs(7); m._photoRefs[7] = []; m.loadPhotoRefs(7);
    eq(m._photoRefs[7][0].driveTrashed, 1, 'driveTrashed survives a reload (it did not)');
  });

  G('B22b · the control: one Remove line in every line\'s record', () => {
    const s = lift(['_renderInvRow'], ['_invInput', '_invThumbHTML', 'custodyEvents', '_invPanelCols'], {
      jobs: [Object.assign({}, ESTATE)],
      _photoRefs: { 7: [LINE('p', { itemNo: 1 }), LINE('d1', { itemNo: 2, derivedFrom: 'p', driveFileId: 'fp' }),
                        LINE('m', { itemNo: 3, manual: true, driveFileId: null })] },
      _invInput: () => '', _invThumbHTML: () => '<div></div>', custodyEvents: () => [], _invPanelCols: () => [],
      estimateStore: { 7: { estimate: { rooms: ROOMS } } },
    });
    s._agDupSet = {};
    ['p', 'd1', 'm'].forEach((id) => {
      s._invOpen = { [id]: 1 };
      const h = s._renderInvRow(ESTATE, s._getPhotoRef(7, id));
      eq(count(h, "invRemoveLine(7,'" + id + "')"), 1, id + ': the record offers Remove line once, wired to the real handler');
      has(h, '>Remove line</button>', id + ': in those words');
    });
    s._invOpen = {};
    lacks(s._renderInvRow(ESTATE, s._getPhotoRef(7, 'p')), 'invRemoveLine(', 'a closed row carries no removal (it is a deliberate act)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STALE TEXT, AND WHAT IS TRUE NOW
  // ═══════════════════════════════════════════════════════════════════════════
  G('stale text · the worklist counts only what is not in the inventory, and says where to bring it in', () => {
    const printed = [];
    const est = { rooms: ROOMS, collections: [{ id: 11, name: 'Silver service', disp: 'appraise' }], vehicles: [] };
    const s = lift(['printAppraisalWorklist'], ['_printDocument', '_invPrintThumb', 'maivAggregate'], {
      jobs: [Object.assign({}, ESTATE)], _photoRefs: { 7: [LINE('a')] },
      _printDocument: (html) => { printed.push(html); return true; }, _invPrintThumb: () => '',
      maivAggregate: () => ({ count: 0, total: 0, settled: true, over: false, unvalued: 0 }),
      estimateStore: { 7: { estimate: est } }, document: domStub({}),
    });
    s.printAppraisalWorklist(7);
    const before = text(printed[printed.length - 1]);
    has(before, '1 collection flagged to appraise from the estimate is not yet in the inventory', 'fixture: the note, before the import');
    has(before, 'bring them in on the Job Admin & Inv tab, under From the Estimate Walkthrough', '⚠ it names where the import is');
    lacks(before, 'add them on the Job Plan', 'not the Job Plan, which has no import');
    s._photoRefs[7].push(LINE('silver', { objectName: 'Silver service', sourceCollId: 11 }));
    s.printAppraisalWorklist(7);
    lacks(text(printed[printed.length - 1]), 'not yet in the inventory',
          '⚠⚠ once the collection is imported the worklist stops saying it is missing — it said so for ever');
  });

  G('stale text · the Job Plan\'s banner, and three code comments', () => {
    const plan = noComments(fn('renderJobPlan'));
    const at = plan.indexOf('from the estimate walkthrough');
    const banner = at >= 0 ? plan.slice(at, at + 900) : '';
    ok(banner.length > 100, 'fixture: the import banner is found in renderJobPlan');
    has(banner, 'Bring them in on the <strong>Job Admin &amp; Inv</strong> tab, under <strong>From the Estimate Walkthrough</strong>',
        'the banner names the tab the panel is on');
    lacks(banner, 'Inventory &rarr;', 'not a tab called Inventory, which no longer exists');
    // The comments describe the code they sit on.
    const fdAt = SRC.indexOf('var FIELD_DISPOSITIONS');
    const fdNote = SRC.slice(SRC.lastIndexOf('THE FIELD HAS', fdAt), fdAt);
    const n = (SRC.slice(fdAt, SRC.indexOf('];', fdAt)).match(/\{ key:/g) || []).length;
    const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    ok(fdNote.length > 0 && fdNote.length < 3000, 'fixture: the FIELD_DISPOSITIONS note is found');
    has(fdNote, 'THE FIELD HAS ' + words[n] + ' CHIPS', 'the chip count in the comment is the list\'s own (' + n + ')');
    const gate = SRC.slice(SRC.indexOf('WHO MAY CARRY IT'), SRC.indexOf('function invTransportBlocked('));
    const arms = (noComments(fn('invTransportBlocked')).match(/return '[a-z]+';/g) || []).length;
    has(gate, words[arms].charAt(0) + words[arms].slice(1).toLowerCase() + ' arms', 'the gate\'s comment counts its arms (' + arms + ')');
    lacks(SRC, 'the trustee\'s schedule these would verify does not exist yet', 'the JOB_ADMIN_TASKS note no longer says the Trust Schedule does not exist');
  });
};
