'use strict';
// PRINT JOB PLAN PRINTED THE HEADINGS AND NOTHING UNDER THEM (2026-09-11).
//
// ⚠⚠ The phases are an accordion. `planPhaseWrap` renders every body with an INLINE
// `display:none` and `togglePhase` opens one by writing `body.style.display` — and
// `printJobPlan` copied `#job-plan-content`'s innerHTML, closed state and all. An inline
// style cannot be out-ranked by a print stylesheet without `!important`, so the printed
// copy carried the five phase HEADINGS and nothing inside any of them.
//
// Measured in a browser on a seeded probate job: 9,018 characters of plan, 919 printed.
// **90% of the document gone** — every room card, every checklist, the disposition streams
// and the court-filing tasks — on the one document that exists to be carried round a house
// on paper.

const { sandbox, source, fn } = require('./harness');

// A root just large enough to drive the real expander: the rule is which elements it
// selects and what it does to them, and neither needs a browser to state.
function el(id, display) { return { id: id, style: { display: display }, textContent: '▶' }; }
function root(els) {
  return {
    querySelectorAll: function (sel) {
      const m = /^\[id\^="([^"]+)"\]$/.exec(sel);
      if (!m) throw new Error('unexpected selector: ' + sel);
      return els.filter(function (e) { return String(e.id).indexOf(m[1]) === 0; });
    },
  };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const s = sandbox({ fns: ['_jpExpandForPrint', 'planPhaseWrap'], vars: [] });

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ EVERY PHASE BODY IS OPENED FOR THE PRINTED COPY');
  {
    const bodies = [el('phase-body-p0', 'none'), el('phase-body-p1', 'none'),
                    el('phase-body-p2', 'none'), el('phase-body-p4', 'none')];
    const chevs = [el('phase-chev-p0'), el('phase-chev-p4')];
    const flags = [el('photo-fail-flag-1-r3-before', 'none'),
                   el('photo-fail-flag-1-r3-after', 'none')];
    const n = s._jpExpandForPrint(root(bodies.concat(chevs, flags)));

    eq(n, 4, 'all four phase bodies are reported opened');
    eq(bodies.filter((b) => b.style.display === 'none').length, 0,
       '⚠⚠ and none is still closed — this is the whole defect');

    // ⚠ IT TOUCHES ONLY phase-body-*. A blanket strip of display:none would also reveal the
    // per-room photo-fail flags, which are hidden because they are EMPTY until an upload
    // fails. Printing those is not more of the document, it is noise with no content.
    eq(flags.filter((f) => f.style.display === 'none').length, 2,
       '⚠ the hidden upload-failure flags stay hidden');

    // The chevron is a control's affordance and there is nothing to press on paper.
    eq(chevs.filter((c) => c.textContent === '').length, 2, 'the chevrons are blanked');
    eq(s._jpExpandForPrint(root([])), 0, 'a plan with no phases is 0, not a throw');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ THE SELECTOR AND THE MARKUP MUST AGREE — driven off the real planPhaseWrap');
  {
    // The coupling is the silent one: rename the id prefix in planPhaseWrap and the print
    // goes back to blank with nothing failing. So the id is read out of the REAL markup and
    // handed to the REAL expander.
    const html = s.planPhaseWrap('p2', 'Phase 2 — Pack & Disposition', '<p>the checklist</p>');
    has(html, 'style="display:none;', '⚠ a phase still renders CLOSED on screen — the '
        + 'accordion is the point of the tab and printing must not change it');
    const id = (/id="(phase-body-[^"]+)"/.exec(html) || [])[1];
    ok(!!id, 'the body carries an id');
    const chev = (/id="(phase-chev-[^"]+)"/.exec(html) || [])[1];
    ok(!!chev, 'and so does the chevron');

    const live = [el(id, 'none'), el(chev)];
    eq(s._jpExpandForPrint(root(live)), 1,
       '⚠ the expander selects the id the renderer actually writes');
    eq(live[0].style.display, '', 'and opens it');
    eq(live[1].textContent, '', 'and blanks its chevron');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ IT EXPANDS A CLONE, AND HANDS THE DOCUMENT OVER IN ONE PIECE');
  {
    const body = noComments(fn('printJobPlan'));
    has(body, 'content.cloneNode(true)',
        '⚠⚠ a CLONE. Opening the real accordion to print would leave every phase hanging '
        + 'open behind the dialog, and closing them again afterwards would fight whatever '
        + 'the crew had deliberately opened');
    has(body, '_jpExpandForPrint(copy)', 'and the clone is what gets expanded');
    lacks(body, 'content.innerHTML +', 'the live innerHTML is not what is printed');

    // ⚠ THE TARGET BELONGS TO _printDocument. This used to write #print-target, read it back,
    // and pass that to the one function whose whole job is writing #print-target.
    lacks(body, 'pt.innerHTML', '⚠ printJobPlan never writes the print target itself');
    lacks(body, "getElementById('print-target')", 'nor reaches for it at all');
    has(body, '_printDocument(html, title)', 'it builds the document and hands it over');

    // ⚠ THE TITLE IS THE PDF FILENAME. Without one Chrome names a Save-as-PDF after the page
    // title — "Havellin Palm Beach — Clients & Estimator — INTERNAL" — which is the same
    // defect Slice 3 fixed on the agreement.
    has(body, "'Havellin Job Plan'", 'the PDF is named after the document');
    has(body, 'street', 'and carries the property');
    has(body, 'stamp', 'and the date');

    // The header block is what carries the standing job flags onto the page.
    has(body, 'hdrEl ? hdrEl.innerHTML', 'the plan header is printed with the content');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('one rule, stated once');
  {
    // Every phase in the tab goes through planPhaseWrap, so there is one place the closed
    // state is written and one prefix for the expander to find.
    const wraps = (src.match(/planPhaseWrap\(/g) || []).length;
    ok(wraps >= 5, 'the phases are wrapped by the shared renderer, not hand-rolled');
    eq((src.match(/id="phase-body-/g) || []).length, 1,
       '⚠ the body id is written in exactly one place');
    // togglePhase is the on-screen behaviour and must keep working.
    has(noComments(fn('togglePhase')), "body.style.display === 'none'",
        'the accordion still opens and closes on screen');
  }
};
