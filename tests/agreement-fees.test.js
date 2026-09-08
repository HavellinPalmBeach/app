'use strict';
// The Service Management Fee (2026-09-08). SMF_PCT went to 0 on 2026-08-02 and the estimate,
// the invoice and the Terms all stopped charging it that day. Both agreements kept promising
// it: the standard form's §3.5 named "15% of vendor invoices" outright and the probate form's
// fee table carried a "Vendor Management Fee — 15% of vendor invoice" row. Anthony found it
// reading a filed copy. Both now read SMF_PCT, so the fee cannot be stated in a contract the
// invoice does not bill. Standalone Home Prep keeps its 30% — that engagement bills no hours.

const { fn, decl, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const smfDecl = decl('SMF_PCT');
  const agr = fn('renderAgreement');
  const prob = fn('renderProbateAgreement');

  group('the fee is off, and both agreements read the constant rather than a literal');
  {
    has(smfDecl, 'SMF_PCT = 0', 'SMF_PCT is 0 — the fee was struck on 2026-08-02');
    lacks(agr, "15% of vendor invoices", 'the standard agreement carries no literal 15%');
    lacks(prob, "'15% of vendor invoice'", 'nor does the probate fee table');
    has(agr, 'SMF_PCT > 0', '§3.5 is gated on the constant');
    has(prob, 'SMF_PCT > 0', 'the probate fee row is gated on the constant');
    has(agr, "Math.round(SMF_PCT*100)+'%", 'and when it is ever switched back on the clause prints the real rate');
  }

  group('what the client reads today');
  {
    has(agr, '3.5 Vendor Coordination.', 'the standard form states the no-fee rule under the same clause number');
    has(agr, 'Contractor adds no fee or markup to third-party vendor invoices', 'in plain words');
    has(agr, 'billed as Transition Concierge time under Section 3.3', 'and says where the coordination time IS billed — hourly or inside the fixed fee, §3.3 is both');
    has(agr, "3.5 Management Fee.", 'standalone Home Prep keeps its own clause');
    has(agr, 'thirty percent (30%) of the total third-party vendor costs', 'at 30%, the only fee that engagement bills');
    has(prob, "'Third-Party Vendors', 'At cost — no fee'", 'the probate fee table names the vendors as at-cost with no fee');
    lacks(prob, 'materials, and vendor fees based on', '§3.2 no longer describes the estimate as carrying vendor fees');
  }

  group('nowhere else in a client document does a vendor-fee percentage survive unguarded');
  {
    // The estimate and invoice already gate their SMF rows on the computed amount; this pins
    // that the constant is the only place the rate is defined.
    const src = source();
    const literal15 = (src.match(/15% of vendor/g) || []).length;
    eq(literal15, 0, 'no "15% of vendor" literal anywhere in the file');
  }
};
