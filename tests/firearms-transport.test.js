'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// FIREARMS TRANSPORT — the gate that decides what may go in the car (2026-09-13).
//
// Anthony, having checked with a dealer: "for me to take from a home to a licensed gun
// dealer for purposes of purchase or consignment isn't it fine?" For a NON-NFA firearm the
// answer is yes, and the standing rule that Havellin never transports was too broad. For an
// NFA item the answer is no, and it is not close.
//
// ⚠⚠ THE ONE CHECK THIS FILE EXISTS FOR: an NFA item with EVERY other box ticked — written
// authority from the representative, a serial on the record, a named dealer — is still
// blocked. No representative can authorise it, because the registration is federal and not
// theirs to assign. If that assertion ever goes green with the arm removed, the gate is
// decorative and somebody is carrying a suppressor on a piece of paper that cannot authorise
// it. 26 U.S.C. 5861 is ten years.
//
// The other three gates are ordinary preconditions and clear themselves.

const { sandbox, source, fn } = require('./harness');

const FNS = ['invIsFirearm', 'invFirearmAuthorized', 'invReleaseBlocked',
             'invTransportBlocked', 'invTransportReason', 'invTransportable'];
const VARS = ['INV_TRANSPORT_REASONS'];

// A firearm with everything the protocol asks for: authority, serial, named dealer.
const READY = () => ({ category: 'Firearms', objectName: 'Remington 870',
                       authBy: 'Tripp Butler', approvalDate: '2026-09-14',
                       serial: 'RS12345678', channel: 'Palm Beach Firearms (FFL)' });

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const s = sandbox({ fns: FNS, vars: VARS });
  const blocked = (o) => s.invTransportBlocked(Object.assign(READY(), o));

  group('⚠⚠ NFA IS ABSOLUTE — no authority reaches it', () => {
    // The whole point. Everything else on this row is complete.
    eq(blocked({ flagNFA: true }), 'nfa',
       'a fully-papered NFA item is still blocked');
    ok(!s.invTransportable(Object.assign(READY(), { flagNFA: true })),
       'and is therefore not transportable');

    // It outranks every other gate, so the reason a person reads names the real problem
    // rather than whichever field they happen to be missing as well.
    eq(blocked({ flagNFA: true, authBy: '', approvalDate: '' }), 'nfa',
       'NFA outranks a missing authority');
    eq(blocked({ flagNFA: true, serial: '' }), 'nfa',
       'NFA outranks a missing serial');
    eq(blocked({ flagNFA: true, channel: '' }), 'nfa',
       'NFA outranks a missing dealer');

    // ⚠ Filling in MORE of the record must never help. This is the assertion that fails if
    // someone later "improves" the gate into a scoring function.
    eq(blocked({ flagNFA: true, receiptDoc: 'signed', apprDoc: 'appraised',
                 assetTrack: 'Probate', dispDate: '2026-09-20' }), 'nfa',
       'no combination of other fields unblocks an NFA item');

    has(s.invTransportReason(Object.assign(READY(), { flagNFA: true })), 'ATF paperwork',
        'the reason names the route that IS lawful, rather than only refusing');
  });

  group('the three ordinary gates, and the order they answer in', () => {
    eq(blocked({ authBy: '', approvalDate: '' }), 'authority', 'no written authority');
    eq(blocked({ authBy: 'Tripp Butler', approvalDate: '' }), 'authority',
       'half an authority is not an authority — both fields or neither');
    eq(blocked({ serial: '' }), 'serial', 'no serial recorded');
    eq(blocked({ serial: '   ' }), 'serial', 'whitespace is not a serial');
    eq(blocked({ channel: '' }), 'dealer', 'no receiving dealer named');

    // Authority outranks the two record-keeping gates: it is the one a person cannot fix
    // themselves at the desk.
    eq(blocked({ authBy: '', approvalDate: '', serial: '', channel: '' }), 'authority',
       'authority is reported before serial or dealer');

    eq(blocked({}), '', 'authority + serial + dealer, not NFA — it may be carried');
    ok(s.invTransportable(READY()), 'and invTransportable agrees');
  });

  group('a non-firearm is not this gate\'s business', () => {
    const sofa = { category: 'Furniture', objectName: 'Chesterfield', disposition: 'Auction' };
    eq(s.invTransportBlocked(sofa), '', 'a sofa is not blocked by the firearms gate');
    ok(!s.invTransportable(sofa), 'but it is not "transportable" either — the word is about firearms');
    eq(s.invTransportReason(sofa), '', 'and it raises no sentence');

    // ⚠ flagNFA on a non-firearm must not block anything. `_invColEditable` already refuses
    // to offer the tick there, but a stale value on an imported row must not strand it.
    eq(s.invTransportBlocked({ category: 'Furniture', flagNFA: true }), '',
       'a stale NFA tick on a sofa blocks nothing');
  });

  group('the transport gate is stricter than the release gate, not a rename of it', () => {
    // invReleaseBlocked asks whether the item may leave AT ALL. invTransportBlocked asks the
    // narrower question of who carries it. Collapsing them would let an NFA item ride on the
    // representative's authority, which is exactly the defect.
    const nfa = Object.assign(READY(), { flagNFA: true });
    ok(!s.invReleaseBlocked(nfa), 'an authorised NFA item may be RELEASED (to the dealer)');
    eq(s.invTransportBlocked(nfa), 'nfa', 'and may still never be TRANSPORTED by us');

    // And the converse: a firearm with authority but no serial may be released to a dealer
    // who collects, and simply may not be driven there.
    const noSerial = Object.assign(READY(), { serial: '' });
    ok(!s.invReleaseBlocked(noSerial), 'a missing serial does not block release');
    eq(s.invTransportBlocked(noSerial), 'serial', 'it blocks transport only');
  });

  group('one definition — no second copy of the rule', () => {
    const body = fn('invTransportBlocked');
    has(body, 'flagNFA', 'the NFA arm is in the shared predicate');

    // ⚠ A PREDICATE WITH NO READER IS DECORATIVE, and that is what the first cut of this
    // build shipped — the gate existed and nothing on any screen asked it. Name the reader
    // rather than counting occurrences: a count passes on the definition plus its own
    // helpers, which is exactly the state that was wrong.
    has(fn('_apprTransport'), 'invTransportBlocked(',
        'the worklist asks the predicate per item');
    has(fn('printAppraisalWorklist'), '_apprTransport(',
        'and the rendered document reads it — the gate reaches a person');

    // A render site that inlines `ref.flagNFA` to decide whether to offer transport is how
    // the screen and the gate come to disagree.
    lacks(fn('_apprTransport'), 'flagNFA',
          'the reader does not re-derive the NFA rule for itself');

    // The sentences live with the predicate, not at the call sites.
    has(fn('invTransportReason'), 'INV_TRANSPORT_REASONS',
        'the wording comes from the shared catalogue');
    lacks(fn('invTransportable'), 'flagNFA',
          'invTransportable delegates rather than re-testing the flag');
  });

  group('the serial number column', () => {
    const cols = src.slice(src.indexOf('var INVENTORY_COLUMNS'));
    const decl = cols.slice(0, cols.indexOf('\n];'));
    has(decl, "key:'serial'", 'the column exists');
    has(decl, "header:'Serial Number'", 'and carries a header');

    // ⚠ THE WHITELIST IS WHAT BITES. A column not named in savePhotoRefs is dropped silently
    // on every save — this file records that risk twice already, on flagMAIV and on clearedAt.
    has(fn('savePhotoRefs'), 'serial:r.serial',
        'serial is on the savePhotoRefs whitelist or it never survives a reload');

    // Once the object has left the property the serial cannot be re-read, so a merge that
    // drops it destroys the only link between our manifest and the dealer's receipt.
    const sticky = src.slice(src.indexOf('var INV_STICKY_FIELDS'));
    has(sticky.slice(0, sticky.indexOf(']')), "'serial'",
        'serial survives a merge from a device that never saw it');

    // ⚠ NOT firearms-gated, deliberately: a vehicle has a VIN, a watch and an instrument have
    // serials. Gating it would make the field unreachable on the rows that also need it.
    lacks(fn('_invColEditable'), "col.key === 'serial'",
          'the serial column is offered on every row, not only firearms');
  });

  group('the protocol is one tap from the flag', () => {
    // ⚠ DECLARED ABOVE ITS FIRST READER. HOUSE_FLAGS is a top-level `var` evaluated at load,
    // so a constant declared below it hoists as `undefined` and the entry silently carries
    // nothing — no error, no symptom, exactly the _rushRate shape. Assert the ORDER.
    ok(src.indexOf('var FIREARMS_PROTOCOL_DOC') < src.indexOf('var HOUSE_FLAGS'),
       'the constant is declared before HOUSE_FLAGS evaluates');

    // ⚠ A RELATIVE, SAME-ORIGIN PATH. This is opened on a phone in somebody's house at the
    // moment a firearm turns up; a Drive or claude.ai URL needs a sign-in and a good signal.
    const c = src.slice(src.indexOf('var FIREARMS_PROTOCOL_DOC'));
    has(c.slice(0, c.indexOf(';')), "'firearms-protocol.html'", 'it points at the repo copy');
    lacks(c.slice(0, c.indexOf(';')), 'http', 'not an off-site URL that needs authenticating');

    // The document rides on the catalogue entry, so a render site never learns a flag's name.
    lacks(fn('standingFlagsBlock'), 'firearms',
          'the brief renders whatever doc it is given rather than keying on firearms');
    has(fn('standingFlagLines'), 'doc:f.doc', 'the line builder carries it through');

    // Both readers use the constant; neither retypes the filename.
    const strip = (t) => t.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    const literals = (strip(src).match(/'firearms-protocol\.html'/g) || []).length;
    eq(literals, 1, 'the filename appears exactly once in live code');
    has(strip(fn('printAppraisalWorklist')), 'FIREARMS_PROTOCOL_DOC',
        'the worklist links it through the constant');

    // ⚠⚠ AND THE JOIN, WHICH EVERYTHING ABOVE MISSES. The first sweep came back GREEN on
    // deleting `doc:` from the firearms catalogue entry — every assertion drove a PIECE
    // (the constant, the line builder, the renderer's indifference to the key) and none
    // drove the whole chain, so the link could be absent from the brief with the suite
    // passing. That is the shape this repo records more often than any other. Drive the
    // REAL brief on a job with the flag ticked and read the anchor out of the markup.
    const b = sandbox({
      fns: ['standingFlagsBlock', 'standingFlagLines', 'activeHouseFlags', 'houseFlagsOf',
            '_houseFlagRowClass', 'esc'],
      vars: ['FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS'],
    });
    const armed = { id: 1, houseFlags: { firearms: { on: true, note: 'Gun safe in the study, 4 long guns.' } } };
    const brief = b.standingFlagsBlock(armed);
    has(brief, 'href="firearms-protocol.html"', 'the crew brief renders the link');
    has(brief, 'Read the firearms protocol', 'under a label that says what it is');
    has(brief, 'target="_blank"', 'opening it does not navigate off the Job Plan');
    has(brief, 'Gun safe in the study', 'beside the detail taken at intake');

    // A flag carrying no document renders no link rather than an empty one.
    const safes = { id: 1, houseFlags: { safes: { on: true, note: 'Wall safe, combination unknown.' } } };
    lacks(b.standingFlagsBlock(safes), 'href=',
          'a flag with no protocol behind it links nowhere');
  });

  group('the two notices that were false until today', () => {
    const wl = fn('printAppraisalWorklist');
    // Form 5 eForms clear in about two days as of 2026, not months. The old sentence put a
    // closing-timeline worry in front of the representative that no longer exists.
    lacks(wl, 'months, not days', 'the stale Form 5 timeline is gone');
    // And this one became false the moment a non-NFA firearm could be carried.
    lacks(wl, 'Havellin does not transport firearms',
          'the blanket no-transport claim is gone');
    has(wl, 'does not transport an NFA item',
        'replaced by the claim that is still true, scoped to NFA');
  });
};
