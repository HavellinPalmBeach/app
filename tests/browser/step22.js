// Step 22 — who arranges the appraisals follows the TIER, not the pricing scope (2026-09-24).
//
// `values` and `appraisals` both price at scope `full`, and the estate agreement and Exhibit A read the
// scope — so on the `values` tier (counsel arranges the appraisals) the contract promised Havellin
// coordinates them "within the 60-day inventory deadline", and the estimate promised "independent
// appraisals attached". The desk checklist and the Court Inventory's DRAFT fix already read the tier and
// said the opposite. `weArrangeAppraisals(docScope, job)` is the one answer now.
//
// Drives the REAL intake, the REAL Build Estimate screen and the REAL document builders on five estates:
// Estate Settlement at `values` and at `appraisals` (probate matter), the same on a trust matter, and a
// Probate-service job at both tiers (the only service whose close-out carries the §733.604 sentence).
//
//   NODE_PATH=/path/to/node_modules node tests/browser/step22.js [/abs/path/to/havellin.html]
const { chromium } = require('playwright');
const APP = process.env.APP || ('file://' + (process.argv[2] || '/home/user/app/havellin.html'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };
const has = (t, n, m) => ok(t.indexOf(n) >= 0, m + '  [missing: ' + n + ']');
const lacks = (t, n, m) => ok(t.indexOf(n) < 0, m + '  [present: ' + n + ']');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { await d.accept(); });
  await p.goto(APP); await p.waitForTimeout(1500);
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 30);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); })();

  async function make(svc, last, tier, matter) {
    await p.evaluate(() => { const b = document.getElementById('btn-add-client'); if (b) b.click(); }); await p.waitForTimeout(300);
    const id = await p.evaluate(([wt, svc, last, tier, matter]) => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; if (e.onchange) e.onchange(); } };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find(x => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', svc); toggleIntakeFields();
      set('i-fname', 'Pat'); set('i-lname', last); set('i-addr', '69 Beach Blvd'); set('i-city', 'Palm Beach'); set('i-zip', '33480');
      set('i-sqft', '3500'); set('i-home-value', '4200000');
      set('i-date-of-death', '2026-06-01'); set('i-executor-fname', 'Tripp'); set('i-executor-lname', 'Butler');
      set('i-executor-email', 'tb@example.com'); set('i-executor-phone', '(561) 555-0111'); pick('i-executor-role');
      set('i-matter-type', matter); set('i-doc-tier', tier);
      if (svc === 'probate') {
        set('i-probate-case', '50-2026-CP-001234'); set('i-letters-date', '2026-07-01');
        set('i-probate-atty-fname', 'Richard'); set('i-probate-atty-lname', 'Comiter'); set('i-probate-atty-firm', 'Comiter Singer');
        set('i-probate-atty-phone', '(561) 555-0122'); set('i-probate-atty-email', 'rc@example.com');
      }
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt);
      const st = new Date(wt); st.setDate(st.getDate() + 7); while (st.getDay() === 0 || st.getDay() === 6) st.setDate(st.getDate() + 1);
      set('i-start', st.toISOString().slice(0, 10)); saveIntake(); return (jobs[0] || {}).id;
    }, [future, svc, last, tier, matter]);
    await p.waitForTimeout(1200); return id;
  }

  // Build an estimate on the real Build Estimate screen and render the two client documents off it.
  async function docs(id) {
    await p.evaluate((id) => dashGoEstimate(id), id); await p.waitForTimeout(700);
    return p.evaluate((id) => {
      const js = document.getElementById('e-job'); js.value = String(id); if (js.onchange) js.onchange();
      for (let i = 0; i < 6; i++) setRoomState('r' + i, 'in');
      calcAll();
      const e = JSON.parse(JSON.stringify(currentEstimate));
      const job = jobs.find(j => j.id === id);
      const txt = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' '); };
      const legacy = Object.assign({}, job); delete legacy.docTier; legacy.docScope = 'full';
      return {
        tier: job.docTier, scope: e.docScope, svc: e.svc,
        helper: typeof weArrangeAppraisals === 'function' ? weArrangeAppraisals(e.docScope, job) : null,
        desk: planTaskCtx(job, e).weAppraise,
        agr: txt(agreementHtml(job, e)),
        ce: txt(clientEstimateHtml(e, job)),
        legacyAgr: txt(agreementHtml(legacy, e)),
      };
    }, id);
  }

  const OURS_S2 = 'appraisal coordination for all asset categories';
  const CARVE = 'The coordination of professional appraisals is not within this engagement';
  const OURS_52 = 'Havellin will coordinate professional appraisals';
  const OURS_53 = 'Arrange professional appraisal';
  const THEIRS_53 = 'Admit an appraiser engaged by counsel';
  const REC = 'Independent appraisals attached as supporting documentation';

  // ── A. Estate Settlement, probate matter, VALUES — counsel arranges the appraisals ──
  console.log('\n## A. Estate Settlement · probate matter · Inventory with values');
  const idV = await make('cleanout', 'Valued', 'values', 'probate');
  const V = await docs(idV);
  ok(V.tier === 'values' && V.scope === 'full', 'values tier prices at the full scope (tier ' + V.tier + ', scope ' + V.scope + ')');
  ok(V.helper === false, 'weArrangeAppraisals answers NO on the values tier');
  ok(V.desk === false, 'and the desk checklist agrees (planTaskCtx.weAppraise false)');
  has(V.agr, CARVE, '§2 states the carve-out');
  lacks(V.agr, OURS_S2, '§2 no longer lists appraisal coordination');
  lacks(V.agr, OURS_52, '§5.2 no longer promises Havellin coordinates the appraisals');
  has(V.agr, 'Professional appraisals are arranged by the estate attorney', '§5.2 names who arranges them');
  lacks(V.agr, 'within the 60-day inventory deadline from Letters', 'the 60-day appraisal promise is gone');
  has(V.agr, THEIRS_53, '§5.3 admits counsel’s appraiser');
  lacks(V.agr, OURS_53, '§5.3 no longer authorises Havellin to arrange one');
  has(V.agr, 'Havellin will prepare a documented asset inventory', 'the valued inventory is still promised — values is still our deliverable');
  lacks(V.ce, REC, 'Exhibit A no longer lists independent appraisals among the records');
  has(V.ce, 'A verified inventory to the standard the court requires', 'Exhibit A still promises the verified inventory');

  // ── B. The same estate at the TOP tier — Havellin arranges them, word for word as before ──
  console.log('\n## B. Estate Settlement · probate matter · Inventory + appraisals');
  const idA = await make('cleanout', 'Appraised', 'appraisals', 'probate');
  const A = await docs(idA);
  ok(A.tier === 'appraisals' && A.scope === 'full', 'appraisals tier, full scope');
  ok(A.helper === true && A.desk === true, 'the helper and the desk both answer YES');
  has(A.agr, OURS_S2, '§2 lists appraisal coordination');
  lacks(A.agr, CARVE, 'and states no carve-out');
  has(A.agr, 'Havellin will coordinate professional appraisals for all required asset categories within the 60-day inventory deadline', '§5.2 keeps the 60-day promise');
  has(A.agr, OURS_53, '§5.3 authorises Havellin to arrange the appraisal');
  lacks(A.agr, THEIRS_53, 'and does not defer to counsel');
  has(A.ce, REC, 'Exhibit A lists the appraisals among the records');

  // A pre-tier record (a scope and no tier) reads `values`, as the desk and the Court Inventory do.
  has(A.legacyAgr, CARVE, 'a pre-tier estate reads as values: counsel arranges the appraisals');
  lacks(A.legacyAgr, OURS_52, '…and is not promised Havellin’s appraisal coordination');

  // ── C. Trust matter at values ──
  console.log('\n## C. Estate Settlement · trust matter · Inventory with values');
  const idT = await make('cleanout', 'Trustee', 'values', 'trust');
  const T = await docs(idT);
  has(T.agr, 'Professional appraisals are arranged by the trustee or their counsel', '§5.2 (trust) names the trustee');
  lacks(T.agr, OURS_52, '…and makes no appraisal promise of its own');
  lacks(T.agr, '733.604', 'a trust matter still cites no §733.604');

  // ── D/E. Probate service — the close-out sentence ──
  console.log('\n## D. Probate · values  /  E. Probate · appraisals');
  const idPV = await make('probate', 'CourtValued', 'values', 'probate');
  const PV = await docs(idPV);
  ok(PV.svc === 'probate' && PV.scope === 'full', 'a probate-service estimate at the full scope');
  has(PV.ce, 'date-of-death fair market value for every asset, non-probate assets excluded',
    'close-out on values: the verified inventory without "appraisals attached"');
  lacks(PV.ce, 'appraisals attached as supporting documentation', 'no appraisal attachment promised anywhere on values');
  const idPA = await make('probate', 'CourtAppraised', 'appraisals', 'probate');
  const PA = await docs(idPA);
  has(PA.ce, 'date-of-death fair market value for every asset, appraisals attached as supporting documentation, non-probate assets excluded',
    'close-out on appraisals: unchanged, appraisals attached');

  // ── Overflow + errors ──
  for (const w of [1440, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.evaluate((id) => openClientDashboard(id), idV); await p.waitForTimeout(500);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(ov <= 0, 'overflow 0 at ' + w + 'px on the dashboard (got ' + ov + ')');
  }
  ok(errs.length === 0, 'no page errors (' + errs.join(' | ') + ')');

  await b.close();
  console.log('\nstep22: ' + pass + ' passed, ' + fail + ' failed');
})().catch(e => { console.log('THREW ' + (e && e.stack || e)); console.log('step22: ' + pass + ' passed, ' + (fail + 1) + ' failed'); });
