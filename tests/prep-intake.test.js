'use strict';
// HOME PREP FOR SALE ON CLIENT INTAKE (2026-09-22).
// Prep sits first in the service dropdown, and a prep intake does not ask what is IN the
// house: nothing leaves it, so there is nothing to find and no contents to tick. The safety
// question and Notes stay — painters, cleaners and a stager still walk in. The documentation
// level is hidden too: a prep job inventories nothing and its Job Plan reads no custody rule.
// Hidden fields are NOT wiped (switching the service back must not lose typing), so the SAVE
// is what drops them, or a tick made before the switch rides onto a job that never showed it.

const { sandbox, domStub, source } = require('./harness');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const fnSrc = (n) => { const i = src.indexOf('function ' + n + '('); return src.slice(i, src.indexOf('\n}\n', i)); };

  group('prep leads the service dropdown and the catalogue');
  {
    const sel = src.slice(src.indexOf('<select id="i-svc"'), src.indexOf('</select>', src.indexOf('<select id="i-svc"')));
    const vals = (sel.match(/value="([^"]*)"/g) || []).map((m) => m.slice(7, -1)).filter(Boolean);
    eq(vals[0], 'prep', 'Home Prep for Sale is the first real option on intake');
    const c = sandbox({ vars: ['SVC_ORDER'] });
    eq(c.SVC_ORDER[0], 'prep', 'and first in SVC_ORDER, so the estimate picker agrees');
  }

  const run = (svc) => {
    const d = domStub({ 'i-svc': svc });
    const c = sandbox({
      fns: ['toggleIntakeFields', 'courtRecordShown', 'jobOnProbateTrack', 'matterDef', 'matterTypeOf', 'invFiduciaryMode', 'intakeAsksHouseContents', 'onDocGateChange', '_gateYes', '_gate706', 'gateDispute',
            'docLevelFloor', 'docTierOf', 'docTierDef', 'docTierScope', 'docTierScopeMirror', 'svcHasDocStep',
            'docLevelFloorReason', 'resolveDocLevel', 'isDecedentJob', 'invAppraisalThreshold', 'docStandardEffect', 'isFormalDoc', 'showHouseFlagRows', 'houseFlagAsked', 'roundCents', 'fmt'],
      vars: ['MATTER_TYPES', 'DECEDENT_SERVICES', 'INV_APPRAISAL_THRESHOLD', 'INV_APPRAISAL_THRESHOLD_DISPUTED', 'DOC_TIERS', 'DOC_TIER_FROM_SCOPE', 'JOB_STEPS', 'HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'],
      stubs: { document: d },
    });
    d.querySelectorAll = () => [];
    c.toggleIntakeFields();
    const g = (id) => d.getElementById(id).style.display;
    const rows = {};
    c.HOUSE_FLAGS.forEach((f) => { rows[f.key] = g('i-hfr-' + f.key); });
    return { find: g('i-house-find'), level: g('i-doclevel-block'), rows };
  };

  // ⚠ Q17 (Anthony, 2026-09-29): Home Prep intake asks the ACCESS & SECURITY row and the safety
  // question — vendors go through the house — but not the must-find question or the contents rows.
  // Until P9 it hid the whole tick list, access included.
  group('a prep intake hides the must-find question, the contents rows and the documentation level — and asks access & security');
  {
    const p = run('prep');
    eq(p.find, 'none', 'must-find question hidden on prep');
    eq(p.level, 'none', 'documentation level hidden on prep');
    eq(p.rows.access, '', '⚠ the access & security row is asked on prep (Q17)');
    const hidden = Object.keys(p.rows).filter((k) => k !== 'access');
    ok(hidden.length >= 6, 'the contents rows were measured (' + hidden.length + ')');
    eq(hidden.filter((k) => p.rows[k] !== 'none'), [], 'every contents row is hidden on prep');
    ['downsizing', 'downsizing_move', 'home_cleanout', 'cleanout', 'probate', 'contested_probate'].forEach((svc) => {
      const r = run(svc);
      eq([r.find, r.level], ['', ''], svc + ' still shows the must-find question and the level');
      eq(Object.keys(r.rows).filter((k) => r.rows[k] !== ''), [], svc + ' shows every row');
    });
  }

  group('the safety question and Notes are never inside a hidden block');
  {
    const findBlk = src.slice(src.indexOf('<div id="i-house-find">'), src.indexOf('id="i-safety-label"'));
    lacks(findBlk, 'id="i-safety"', 'safety is outside the must-find block');
    const t0 = src.indexOf('<div id="i-house-ticks">');
    const ticks = src.slice(t0, src.indexOf('<div id="i-houseflags"></div>\n      </div>', t0) + 40);
    ok(ticks.length > 40 && ticks.length < 600, 'the tick block was located');
    lacks(ticks, 'id="i-notes"', 'Notes is outside the tick-list block');
  }

  group('the save drops hidden answers on prep');
  {
    const save = fnSrc('saveIntake');
    has(save, "intakeAsksHouseContents(svc) ? ((document.getElementById('i-mustfind')", 'mustFind gated on the service');
    has(save, "readHouseFlagInputs('i', svc, null)", 'houseFlags read per the service: a row prep is not asked is saved off');
    has(save, "docLevel:(svc === 'prep') ? ''", 'docLevel blank on prep');
    lacks(save, "safetyNotes: intakeAsks", 'safety is saved on every service');
    const c = sandbox({ fns: ['houseFlagsOf'], vars: ['HOUSE_FLAGS', 'FIREARMS_PROTOCOL_DOC'] });
    const off = c.houseFlagsOf(null);
    ok(Object.keys(off).length > 0 && Object.keys(off).every((k) => off[k].on === false), 'the prep value is every flag off');
  }
};
