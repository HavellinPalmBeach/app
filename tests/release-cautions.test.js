'use strict';
// A SPECIFIC BEQUEST LISTED FOR AUCTION, WITH NOTHING ON THE PAGE SAYING SO (2026-09-11).
//
// ⚠⚠ `flagBequest` and `flagDisputed` reached NO printed document. Both were editable on the
// manifest, both exported to the attorney's workbook, both painted as chips on screen — and
// every print path ignored them. Measured on the real `printApprovalRequest`: a $48,000
// Sargent portrait the will leaves to a named person printed identically to a set of dining
// chairs, proposed for **Auction**, with an initial box beside it. The words "bequest" and
// "dispute" appeared nowhere in the 6,217 bytes of that document.
//
// ⚠ AND THE CLIENT ESTIMATE PROMISES THE OPPOSITE IN WRITING, four times over — every estate
// arm of its sorting stage says "specific bequests are set aside". So the engagement letter
// said set aside while the release request asked the representative to authorise the sale.
//
// The rule is the firearms rule: FLAG AND EXPLAIN, NEVER REFUSE, and never silently withhold
// the line. A bequest can properly be sold; that is the representative's decision on counsel's
// advice. What must not happen again is being asked to initial one without being told.

const { sandbox, source, fn } = require('./harness');

const FNS = ['printApprovalRequest', 'printDispositionLedger', '_invBulkApply',
             'invReleaseCautions', '_invCautionBadges', '_invCautionNotices', '_invNamed',
             '_invItemNo', '_invAwaitingApproval', '_jobInvRefs', '_invAssignItemNos',
             '_invTouch', '_invPrintThumb', '_invFileId', '_invRoomName', '_invMoney',
             'invIsFirearm', '_invDocHead', 'resolveValBasis', 'estateValueDate',
             'esc', 'fmtDate2', '_invPicked', '_invMatchesFilter', '_invJob', '_setPhotoRef'];
const VARS = ['INV_RELEASE_CAUTIONS', 'INV_RELEASE_DISPOSITIONS', 'INV_CAT_GLYPH'];

const JOB = { id: 1, hvlId: 'HVL-0007', name: 'Butler Estate', client: 'Butler Estate',
              svc: 'probate', executor: 'Tripp Butler', tc: 'Anthony Graziano' };

const mk = (o) => Object.assign({ label: 'inventory', jobId: 1, roomIdx: null, qty: 1,
                                  ts: 1, updatedAt: 1 }, o);

// The estate from the measurement: an ordinary line, a bequest proposed for auction, a
// disputed line proposed for sale, and one carrying both.
const ROWS = () => [
  mk({ stableId: 'a', ts: 1, itemNo: 1, objectName: 'Dining chairs (set of 8)', category: 'Furniture',
       fmv: '4000', disposition: 'Auction' }),
  mk({ stableId: 'b', ts: 2, itemNo: 2, objectName: 'Sargent portrait', category: 'Art & Decor',
       fmv: '48000', disposition: 'Auction', flagBequest: true }),
  mk({ stableId: 'c', ts: 3, itemNo: 3, objectName: 'Tabriz rug', category: 'Rugs & Carpets',
       fmv: '9000', disposition: 'Sell', flagDisputed: true }),
  mk({ stableId: 'd', ts: 4, itemNo: 4, objectName: "Mother's locket", category: 'Jewelry & Watches',
       fmv: '1200', disposition: 'Donate', flagBequest: true, flagDisputed: true }),
];

function ctx(rows, extra) {
  const state = { printed: '', alerted: '', badge: '' };
  const s = sandbox({
    fns: FNS, vars: VARS,
    stubs: Object.assign({
      jobs: [Object.assign({}, JOB)],
      _photoRefs: { 1: rows || ROWS() },
      estimateStore: {},
      alert(m) { state.alerted = String(m); },
      _printDocument(h) { state.printed = h; },
      showSyncBadge(m) { state.badge = String(m); },
      renderInventoryTab() {}, savePhotoRefs() {}, _scheduleInventorySync() {},
      _invPick: {}, _invFilter: { when: 'all', room: '', q: '', flag: '' },
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    }, extra || {}),
  });
  s.__state = state;
  return s;
}
// The rendered document with tags stripped, which is what a representative actually reads.
// ⚠ `&#39;` is decoded here because the REAL `esc` is lifted rather than the harness stub,
// which does not escape apostrophes — a stub that does not match the real source is what cost
// this project a whole round on the `&amp;amp;` defect.
const readable = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·')
  .replace(/&#9888;/g, '⚠').replace(/&rsquo;|&#8217;/g, '’')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RULE — DOM-free, so the tests read it rather than grepping HTML');
  {
    const s = ctx();
    eq(s.invReleaseCautions({}).length, 0, 'an ordinary item raises nothing');
    eq(s.invReleaseCautions(null).length, 0, 'no item is no cautions, not a throw');
    eq(s.invReleaseCautions({ flagBequest: true }).map((c) => c.key).join(), 'flagBequest',
       'a specific bequest raises the bequest caution');
    eq(s.invReleaseCautions({ flagDisputed: true }).map((c) => c.key).join(), 'flagDisputed',
       'a recorded dispute raises the dispute caution');
    eq(s.invReleaseCautions({ flagBequest: true, flagDisputed: true }).length, 2,
       '⚠ an item can be both, and both must show — one is not a substitute for the other');

    // ⚠ THE ORDER IS BEQUEST THEN DISPUTE, and it is not arbitrary: a bequest question is
    // answered by counsel and a dispute question by the representative, so the one that may
    // have to go out of the room comes first.
    eq(s.INV_RELEASE_CAUTIONS.map((c) => c.key).join(','), 'flagBequest,flagDisputed',
       'two cautions, in that order');
    s.INV_RELEASE_CAUTIONS.forEach((c) => {
      ok(c.head && c.body && c.badge && c.tone, c.key + ' carries a heading, a body and a badge');
    });

    // ⚠ THE COLOURS MATCH THE CHIPS THESE SAME ROWS ALREADY WEAR ON SCREEN — bronze for a
    // bequest (check before you sign), red for a dispute (we hold and wait). A document that
    // paints a fact differently from the screen it was entered on is two opinions of one fact.
    eq(s.INV_RELEASE_CAUTIONS[1].tone, '#A32D2D', 'a recorded dispute prints red');
    ok(s.INV_RELEASE_CAUTIONS[0].tone !== s.INV_RELEASE_CAUTIONS[1].tone,
       'and a bequest does not — red is reserved for the thing we simply hold');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE RELEASE APPROVAL REQUEST — the document that authorises property to leave');
  {
    const s = ctx();
    s.printApprovalRequest(1);
    const doc = s.__state.printed;
    const txt = readable(doc);
    ok(doc.length > 0, 'the document renders');

    // ⚠ NOTHING IS DROPPED. Withholding the line would be the silent-omission defect this
    // file records over and over, and it is the representative's decision, not ours.
    has(txt, 'Sargent portrait', 'the bequest is still ON the request');
    has(txt, '4 items', 'all four lines are listed — none is quietly withheld');

    // Named, with its permanent item number, never counted.
    has(txt, 'Specific bequests on this request', 'the bequest notice renders');
    has(txt, '#2 Sargent portrait', '⚠ and NAMES the object with its item number');
    has(txt, "#4 Mother's locket",
        '⚠ including the one carrying both flags — and through the REAL esc, so the '
        + "apostrophe survives as an apostrophe rather than as &#39;");
    has(txt, 'Disputed property on this request', 'the dispute notice renders');
    has(txt, '#3 Tabriz rug', 'and names its object too');
    lacks(txt, '#— ', '⚠ never a placeholder in the position a reader quotes back');

    // The row itself carries the badge — the notice is read before the table, the badge is
    // met inside it, and a reader initialling line by line needs both.
    has(doc, 'SPECIFIC BEQUEST', 'the bequest row is badged');
    has(doc, 'DISPUTED', 'and so is the disputed one');

    // ⚠ THE NOTICES COME BEFORE THE TABLE. A caveat printed under a list of lines to initial
    // has arrived after the signature it exists to come before. This is an index into the
    // RENDERED DOCUMENT — the reading order itself — not two positions in the source.
    ok(doc.indexOf('Specific bequests on this request') < doc.indexOf('Proposed disposition'),
       '⚠⚠ the bequest notice is above the table, not under it');
    ok(doc.indexOf('Disputed property on this request') < doc.indexOf('Proposed disposition'),
       'and so is the dispute notice');
    ok(doc.indexOf('Proposed disposition') < doc.indexOf('Approved by:'),
       'and the table still comes before the signature block');

    // What it actually tells the representative to do.
    has(txt, 'Confirm it with counsel before initialling',
        '⚠ the bequest notice carries the action, not just the fact');
    has(txt, 'set its disposition to Keep or Hold',
        'and the way to take the line off the request instead — a panel reporting a blocker '
        + 'carries the fix');
    has(txt, 'written instruction to release it notwithstanding the dispute',
        '⚠ and the dispute notice says plainly what initialling that line means');
    has(txt, 'nothing moves on a verbal request',
        'which is the same promise the client estimate makes at stage 3');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ A CLEAN ESTATE PRINTS NO NOTICE AT ALL — a caution on every job is noise');
  {
    const s = ctx([
      mk({ stableId: 'a', ts: 1, objectName: 'Dining chairs', category: 'Furniture',
           fmv: '4000', disposition: 'Auction' }),
      mk({ stableId: 'b', ts: 2, objectName: 'Side table', category: 'Furniture',
           fmv: '600', disposition: 'Donate' }),
    ]);
    s.printApprovalRequest(1);
    const doc = s.__state.printed;
    ok(doc.length > 0, 'the request still renders');
    lacks(doc, 'Specific bequests on this request', 'no bequest notice');
    lacks(doc, 'Disputed property on this request', 'no dispute notice');
    lacks(doc, 'SPECIFIC BEQUEST', 'and no badge on any row');
    lacks(doc, 'DISPUTED', 'on either count');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the notice is number-neutral — one item and several both read as English');
  {
    const s = ctx();
    const one = s._invCautionNotices([{ itemNo: 2, objectName: 'Sargent portrait', flagBequest: true }]);
    const many = s._invCautionNotices([
      { itemNo: 2, objectName: 'Sargent portrait', flagBequest: true },
      { itemNo: 4, objectName: 'Locket', flagBequest: true },
    ]);
    has(readable(one), '#2 Sargent portrait', 'one item names itself');
    has(readable(many), '#2 Sargent portrait · #4 Locket', 'several are listed');
    // ⚠ The trap this pins: a body built round "is"/"are" reads as broken English on whichever
    // case the author was not picturing, and the author only ever pictures one of them.
    [one, many].forEach((h, i) => {
      const t = readable(h);
      lacks(t, ' are is ', 'no verb collision (' + (i ? 'many' : 'one') + ')');
      lacks(t, ' is are ', 'in either direction (' + (i ? 'many' : 'one') + ')');
    });
    eq(s._invCautionNotices([]), '', 'nothing flagged renders nothing');
    eq(s._invCautionNotices(null), '', 'and a missing list is not a throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ _invNamed never asserts a number that was not issued');
  {
    const s = ctx();
    eq(s._invNamed({ itemNo: 12, objectName: 'Sargent portrait' }), '#12 Sargent portrait',
       'a numbered item is quoted by its number');
    eq(s._invNamed({ objectName: 'Sargent portrait' }), 'Sargent portrait',
       '⚠ an unnumbered one is named bare — "#—" in the position a reader quotes back is '
       + 'worse than no number at all');
    eq(s._invNamed({ itemNo: 3 }), '#3 unnamed item', 'and an unnamed object still resolves');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE ACCOUNTING LEDGER MARKS THEM TOO — warning on the request and going quiet '
        + 'on the permanent record is one verb out of step');
  {
    const s = ctx();
    s.printDispositionLedger(1);
    const led = s.__state.printed;
    ok(led.length > 0, 'the ledger renders');
    has(led, 'Disposition &amp; Accounting Ledger', 'it is the ledger');
    has(led, 'SPECIFIC BEQUEST', '⚠ a bequest that WAS disposed is findable in the accounting');
    has(led, 'DISPUTED', 'and so is a disputed item');
    has(readable(led), 'Sargent portrait', 'beside the object it belongs to');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE EARLIER CATCH — the bulk bar names what it just swept into a disposition');
  {
    const s = ctx(null, { _invPick: { b: 1, c: 1, a: 1 } });
    s._invBulkApply(1, 'disposition', 'Auction');
    const msg = s.__state.badge;
    has(msg, 'Auction set on 3 items', 'it still says what it did');
    has(msg, '#2 Sargent portrait', '⚠ and NAMES the bequest it just proposed for auction');
    has(msg, '#3 Tabriz rug', 'and the disputed one');
    has(msg, 'Check before the release request goes to the representative',
        'and says what to do about it');

    // A sweep that catches nothing flagged says nothing extra.
    const clean = ctx(null, { _invPick: { a: 1 } });
    clean._invBulkApply(1, 'disposition', 'Auction');
    lacks(clean.__state.badge, 'flagged', 'an ordinary sweep is not decorated');

    // ⚠ AND KEEP / HOLD RAISE NOTHING, BY DEFINITION — nothing is leaving the property, so
    // there is no release to caution about. Cautioning there would train people past it.
    const keep = ctx(null, { _invPick: { b: 1, c: 1 } });
    keep._invBulkApply(1, 'disposition', 'Hold');
    lacks(keep.__state.badge, 'Sargent', 'moving a bequest to Hold is the RIGHT answer, not a warning');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('one rule, stated once');
  {
    const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    // ⚠ THE DEFECT WAS THAT THESE TWO FIELDS REACHED NO DOCUMENT. Assert they reach one
    // through the SHARED definition, rather than each print path growing its own opinion of
    // what a bequest means — which is the drift this file records more often than anything.
    // ⚠ SETTING A DISPOSITION MUST NOT ISSUE AN ITEM NUMBER. `_invBulkApply` names what it
    // swept and nothing more; a number, once issued, is spent forever, and spending one as a
    // side effect of a dropdown is not something a bulk edit gets to do.
    lacks(noComments(fn('_invBulkApply')), '_invAssignItemNos',
          'the bulk bar names items, it does not number them');

    const catSites = (src.match(/INV_RELEASE_CAUTIONS/g) || []).length;
    ok(catSites >= 4, 'one catalogue, read by the badge, the notice and the bulk bar');
    lacks(noComments(fn('printApprovalRequest')), 'flagBequest',
          '⚠ the request asks the shared definition rather than testing the raw field');
    lacks(noComments(fn('printDispositionLedger')), 'flagBequest', 'and so does the ledger');
    has(noComments(fn('printApprovalRequest')), '_invCautionNotices(items)',
        'the request renders the named notices');
    has(noComments(fn('printApprovalRequest')), '_invCautionBadges(r)', 'and badges the rows');
    has(noComments(fn('printDispositionLedger')), '_invCautionBadges(r)', 'the ledger badges its rows');
    has(noComments(fn('_invBulkApply')), 'INV_RELEASE_CAUTIONS',
        'and the bulk bar reads the same catalogue');
  }
};
