'use strict';
// ⚠⚠ EVERY DATE THE APP STAMPS OR DEFAULTS IS THE LOCAL CALENDAR DAY (2026-09-29, workflow audit M7).
//
// `new Date().toISOString().slice(0, 10)` is the UTC date, and in Eastern it turns over at 8pm (7pm in
// winter). Havellin's day ends in the evening — a cheque handed over after dinner, a client saying yes
// on a call at 9pm, the day's hours logged from the car — so every one of those defaulted to TOMORROW'S
// date. Eleven sites wrote a date that way (the payment recorder, the Won modal, the signature recorder,
// the hours log twice, the Stripe and DocuSign read-backs, the rail's sent dates, the lost date, the
// vendor and partner contact logs, the Drive filenames) and every one of them was invisible in the
// container, which runs UTC.
//
// So this suite does two things. It drives the three helpers — `_todayStr`, `_ymdLocal`, `_localDateOf`
// — under America/New_York at 9:30pm on the 29th, which is 01:30 UTC on the 30th: the one moment the
// defect shows. And it forbids the UTC slice anywhere in the file, because the next one will be written
// the same way the last eleven were, by somebody reaching for the obvious line.

const { sandbox, source, fn } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // A 9:30pm Eastern clock. `new Date()` with no arguments returns the pinned instant; with arguments it
  // is the real constructor, so parsing a stored stamp still works. The prototype is the real one, so
  // `instanceof Date` inside the sandbox holds.
  const realDate = Date;
  const EVENING = realDate.parse('2026-09-30T01:30:00Z');   // 9:30pm on Tuesday 29 September, Eastern
  function clockAt(ms) {
    function Fake(...a) {
      if (!new.target) return new realDate(ms).toString();
      return a.length ? new realDate(...a) : new realDate(ms);
    }
    Fake.prototype = realDate.prototype;
    Fake.now = () => ms; Fake.parse = realDate.parse; Fake.UTC = realDate.UTC;
    return Fake;
  }
  // TZ takes effect mid-process on node 22; every group restores it, so no other suite runs in Eastern.
  function inZone(tz, body) {
    const prev = process.env.TZ;
    process.env.TZ = tz;
    try { return body(); } finally { process.env.TZ = prev; }
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE NET — no live line in the app takes the first ten characters of an ISO stamp');
  {
    // ⚠ LINE-BASED comment stripping. A `/\*[\s\S]*?\*\//` stripper pairs the `/*` inside every
    // `accept="image/*"` with a distant `*/` and eats ~170KB of live code — and a net that eats the
    // file passes on anything. The guard below asserts the stripper left the file standing.
    const live = src.split('\n').filter((l) => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')); });
    ok(live.length > src.split('\n').length * 0.5, 'the comment filter left the file standing (a net over nothing passes on anything)');
    ok(live.some((l) => l.indexOf('function _todayStr()') >= 0), '…and the helper this suite drives is on a live line');

    const hits = (re) => live.map((l, i) => ({ l, i })).filter((x) => re.test(x.l)).map((x) => x.l.trim().slice(0, 110));
    // The forms the eleven sites used. A site that needs a stored stamp's date asks _localDateOf; one that
    // needs a Date's date asks _ymdLocal; one that needs today asks _todayStr.
    eq(hits(/toISOString\(\)\s*\.\s*(slice|substr|substring)\s*\(\s*0/), [], '⚠⚠ no toISOString().slice(0, 10) — that is the UTC date');
    eq(hits(/toISOString\(\)\s*\.\s*split\s*\(\s*['"]T['"]/), [], "⚠ no toISOString().split('T')[0] — the same date by another spelling");
    // ⚠ AND NO SLICE OF A STORED STAMP. `(job.lostAt || '').slice(0, 10)` and `docSentAt(...).slice(0, 10)`
    // were the other shape: an ISO stamp written at 9:15pm reads as the next day by its first ten characters.
    // There is no legitimate `.slice(0, 10)` left in the app; if one is ever needed for something that is not
    // a date, exempt it here by name rather than loosening the rule.
    eq(hits(/\.slice\(\s*0\s*,\s*10\s*\)/), [], 'no .slice(0, 10) anywhere — the one way a stored ISO stamp was cut to a UTC date');
    eq(hits(/split\(\s*['"]T['"]\s*\)/), [], "no split('T') anywhere either");
    // The phone formatter's `.substring(0,10)` is ten DIGITS, not a date, and is the only survivor of the sweep.
    eq(hits(/\.substring\(\s*0\s*,\s*10\s*\)/).length, 1, "the phone formatter's ten-digit cut is the only 0–10 substring left");
    has(hits(/\.substring\(\s*0\s*,\s*10\s*\)/)[0] || '', "replace(/\\D/g,'')", '…and it cuts a digits-only string');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ _todayStr / _ymdLocal — 9:30pm on the 29th is the 29th');
  {
    inZone('America/New_York', () => {
      const t = sandbox({ fns: ['_todayStr', '_ymdLocal'], stubs: { Date: clockAt(EVENING) } });
      eq(t._todayStr(), '2026-09-29', '⚠⚠ the local calendar day');
      eq(new realDate(EVENING).toISOString().slice(0, 10), '2026-09-30',
         '…where the UTC slice says the 30th — the evening every cheque, yes and hour was being post-dated to');
      eq(t._ymdLocal(new realDate(2026, 0, 5, 23, 59)), '2026-01-05', 'a Date reads as its local calendar day, zero-padded');
      eq(t._ymdLocal(new realDate('rubbish')), '', '⚠ an Invalid Date is no date — never the string "NaN-NaN-NaN"');
      eq(t._ymdLocal('2026-09-29'), '', 'a string is not a Date and is refused rather than guessed at');
      eq(t._ymdLocal(null), '', 'nor is nothing');
    });
    // The morning is unchanged — the fix is invisible outside the evening window, which is why it hid.
    inZone('America/New_York', () => {
      const t = sandbox({ fns: ['_todayStr', '_ymdLocal'], stubs: { Date: clockAt(realDate.parse('2026-09-29T13:00:00Z')) } });
      eq(t._todayStr(), '2026-09-29', 'at 9am the two readings agree');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ _localDateOf — a stored stamp read as the day it happened here');
  {
    inZone('America/New_York', () => {
      const t = sandbox({ fns: ['_localDateOf', '_ymdLocal'] });
      eq(t._localDateOf('2026-09-30T01:15:00Z'), '2026-09-29',
         '⚠⚠ a document sent at 9:15pm on the 29th was stamped …-30T01:15Z, and the rail printed it as the 30th');
      eq(t._localDateOf('2026-09-30T01:15:00.000Z'), '2026-09-29', 'with milliseconds too');
      eq(t._localDateOf('2026-09-29'), '2026-09-29',
         '⚠ a bare yyyy-mm-dd is already a calendar date and is returned UNTOUCHED — parsed, it is UTC midnight and slips back a day');
      eq(t._localDateOf('2026-09-29T16:00:00Z'), '2026-09-29', 'a daytime stamp is the same day either way');
      eq(t._localDateOf(''), '', 'nothing stored is no date');
      eq(t._localDateOf(null), '', 'nor is null');
      eq(t._localDateOf('not a date'), '', 'and an unparseable value is no date, never "Invalid Date"');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ a date built as local midnight stays that day on a device in any zone');
  {
    // `_avdDate` builds the alternate valuation date as LOCAL midnight six months on. Cut with the UTC slice,
    // that is the previous day on any device east of UTC — a trip abroad was enough to move the §2032 date.
    const avd = (tz) => inZone(tz, () => sandbox({ fns: ['_avdDate', '_ymdLocal'] })._avdDate({ deathDate: '2026-03-15' }));
    eq(avd('America/New_York'), '2026-09-15', 'six months after a March 15 death is September 15 in Palm Beach');
    eq(avd('Asia/Tokyo'), '2026-09-15', '⚠ and still September 15 on a device set to Tokyo, where the UTC slice read the 14th');
    const dl = (tz) => inZone(tz, () => sandbox({ fns: ['inventoryDeadlineFrom', '_ymdLocal'] }).inventoryDeadlineFrom('2026-09-01'));
    eq(dl('America/New_York'), '2026-10-31', 'the §733.604 inventory falls 60 days after the Letters');
    eq(dl('Asia/Tokyo'), '2026-10-31', '…in any zone');
    const wd = (tz) => inZone(tz, () => sandbox({ fns: ['addWorkingDays', '_ymdLocal'] }).addWorkingDays('2026-09-25', 2));
    eq(wd('America/New_York'), '2026-09-28', 'two working days from a Friday is the Monday');
    eq(wd('Asia/Tokyo'), '2026-09-28', '…in any zone');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ THE SITES THE EVENING REACHES — driven at 9:30pm Eastern');
  {
    inZone('America/New_York', () => {
      const Clock = clockAt(EVENING);
      // The Won modal: "the client said yes on a call tonight".
      const els = {};
      const doc = { getElementById: (id) => (els[id] = els[id] || { value: 'x', innerHTML: '', style: {} }) };
      const W = sandbox({ fns: ['openWonModal', '_todayStr', '_ymdLocal'],
        stubs: { Date: Clock, document: doc, jobs: [{ id: 7 }], estimateStore: { 7: { approved: true } } } });
      W.openWonModal(7);
      eq(els['won-date'].value, '2026-09-29', '⚠⚠ the Won modal opens on the day the client said yes, not tomorrow');

      // The hours log, cleared after the day's entry is saved.
      const L = sandbox({ fns: ['clearLogEntry', '_todayStr', '_ymdLocal'], stubs: { Date: Clock, document: doc } });
      L.clearLogEntry();
      eq(els['log-date'].value, '2026-09-29', "the next entry defaults to today's date, not tomorrow's");

      // The signature record's own default, when a caller names no date.
      const S = sandbox({ fns: ['recordAgreementSignature', '_todayStr', '_ymdLocal', 'docState', 'docKeyFor', '_jobTouch'],
        stubs: { Date: Clock, jobs: [{ id: 7, agrSent: true }], isAgreementSent: () => true,
                 saveJobs() {}, syncJobToSheets() {}, _dashRedraw() {}, renderJobs() {} } });
      S.recordAgreementSignature(7, { how: 'wet', signedBy: 'Tripp Butler', recordedBy: 'Ashley Jerome' });
      const sig = (S.jobs[0].docState && S.jobs[0].docState.agreement && S.jobs[0].docState.agreement.sig) || {};
      eq(sig.signedOn, '2026-09-29', '⚠ a signature recorded tonight is dated tonight');

      // Stripe's read-back: an ACH transfer that settled at 9:30pm.
      const P = sandbox({ fns: ['_stripeRecordPayment', '_localDateOf', '_ymdLocal', '_todayStr', 'jobPayments'],
        stubs: { Date: Clock, _photoUid: () => 'u1', _jobTouch() {}, isJobFunded: () => true } });
      const job = { id: 7, payments: [] };
      P._stripeRecordPayment(job, 'deposit', { amount: 5000, piId: 'pi_1', createdAt: '2026-09-30T01:30:00Z' });
      const pay = job.payments[0] || {};
      eq(pay.receivedOn, '2026-09-29', '⚠⚠ the transfer is recorded as received on the day it landed here');
      eq(pay.clearedOn, '2026-09-29', '…and cleared the same day');
      P._stripeRecordPayment(job, 'deposit', { amount: 100, piId: 'pi_2' });
      eq((job.payments[1] || {}).receivedOn, '2026-09-29', 'with no stamp from Stripe it falls back to today — the local today');

      // The rail's sent dates: docState writes ISO stamps.
      const R = sandbox({ fns: ['_jtAtFmt', '_localDateOf', '_ymdLocal', 'fmtDate2'] });
      eq(R._jtAtFmt({ at: '2026-09-30T01:15:00Z', atKind: 'iso' }), 'Sep 29, 2026',
         '⚠⚠ an invoice sent at 9:15pm reads as sent on the 29th — it used to read the 30th');
      eq(R._jtAtFmt({ at: '2026-09-29', atKind: 'date' }), 'Sep 29, 2026', 'a calendar date formats as itself');
      const C = sandbox({ fns: ['_coFmt', '_localDateOf', '_ymdLocal', 'fmtDate2'] });
      eq(C._coFmt('2026-09-30T01:15:00Z'), 'Sep 29, 2026', 'the close-out card reads its stamps the same way');
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the sites that take a default date read the helper, not a clock of their own');
  {
    const liveFn = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    [['openDepositModal', "getElementById('dep-date').value = _todayStr()"],
     ['openWonModal', "getElementById('won-date').value = _todayStr()"],
     ['openSignatureModal', 'on.value = _todayStr()'],
     ['clearLogEntry', "getElementById('log-date').value = _todayStr()"],
     ['recordAgreementSignature', 'sig.signedOn || _todayStr()'],
     ['applyEsignStatus', 'signedOn: _localDateOf(status.completedAt)'],
     ['exportInventoryCSV', "'_Inventory_' + _todayStr()"],
     ['logVendorContact', 'var today = _todayStr()'],
     ['logReferralContact', 'var today = _todayStr()'],
     ['walkthroughHtml', 'fmtDate2(_localDateOf(src.at))'],
     ['jobTimeline', 'at: _localDateOf(job.lostAt)'],
    ].forEach(([f, needle]) => has(liveFn(f), needle, f + ' dates through the local helper'));
    has(liveFn('showPanel'), "logDateEl.value = _todayStr()", 'opening the Job Plan defaults the hours date to today');
    has(liveFn('loadJobPlanTab'), "logDateEl.value = _todayStr()", '…and so does loading it');
    has(liveFn('_todayStr'), 'return _ymdLocal(new Date())', 'and _todayStr is _ymdLocal of now — one definition of a local date');
  }
};
