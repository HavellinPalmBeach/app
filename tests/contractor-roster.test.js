'use strict';
// "+ Add Contractor" OVERWROTE THE LAST PERSON YOU EDITED (FIXED 2026-09-11).
//
// ⚠⚠ THE THROW IS WHAT DESTROYED THE RECORD, not the field it named. `showAddContractor`
// reset `['c-name','c-phone','c-email','c-notes']` through an unguarded
// `document.getElementById(id).value=''`, and **`c-name` has never existed** — the form is
// `c-firstname` + `c-lastname`, which is what `saveContractor` reads back. So the sweep
// threw on its FIRST id and every line below it was skipped, including:
//
//     card.dataset.editId = '';   // clear any lingering edit target
//
// Edit Ashley → close → press "+ Add Contractor" → type a new person → Save, and
// `saveContractor` still sees an editId, so the new details are written over ASHLEY.
// A name is this app's only person key (CLAUDE.md, "Sr removed"), so there is no lookup
// that recovers her row — and `saveContractors()` writes `havellin_defaults_v3` AND posts
// the roster to the sheet as `defaults`, so the overwrite reaches the other device.
//
// ⚠ THE FIX IS THE ORDERING, NOT THE CORRECTED ID. Destructive state is cleared BEFORE
// anything that can throw. Resetting a field is cosmetic; failing to clear an edit target
// destroys a record, and a field renamed in six months must not be able to bring this back.

const { sandbox, source, fn } = require('./harness');

// A DOM small enough to read and real enough to fail: the elements the form actually has,
// plus the card carrying `dataset.editId`. `missing` drops one so the throw can be staged.
function formDom(missing) {
  const els = {};
  ['c-firstname','c-lastname','c-phone','c-email','c-notes','c-rate','c-bio',
   'c-role','c-status','c-fb','bio-field-wrap'].forEach((id) => {
    if (id === missing) return;
    els[id] = { value: 'STALE', textContent: '', innerHTML: 'stale', style: {} };
  });
  const saveBtn = { textContent: 'Update Contractor', className: 'btn-p' };
  els['add-contractor-card'] = {
    style: { display: 'none' },
    dataset: { editId: 'c-ashley' },
    querySelector: () => saveBtn,
  };
  return {
    els, saveBtn,
    document: { getElementById: (id) => els[id] || null },
  };
}

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();
  const noComments = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠⚠ OPENING THE FORM RELEASES THE EDIT TARGET, WHATEVER ELSE FAILS');
  {
    const d = formDom();
    const ctx = sandbox({ fns: ['showAddContractor'], stubs: { document: d.document } });
    ctx.showAddContractor();
    eq(d.els['add-contractor-card'].dataset.editId, '',
       '⚠⚠ the edit target is released — this is the whole defect');
    eq(d.saveBtn.textContent, 'Save Contractor', 'and the button stops offering to update somebody');
    eq(d.els['c-firstname'].value, '', 'the real name fields are cleared');
    eq(d.els['c-lastname'].value, '', 'both of them');
    eq(d.els['c-rate'].value, '', "and the previous person's rate does not carry over");
    eq(d.els['c-role'].value, 'TC', 'role resets to the default');
    eq(d.els['c-status'].value, 'active', 'and so does status');

    // ⚠ THE REGRESSION CASE, STAGED THE WAY IT REALLY HAPPENED: a field named in the sweep
    // that the page does not have. Before, that threw and the edit target survived.
    const g = formDom('c-notes');
    const ctx2 = sandbox({ fns: ['showAddContractor'], stubs: { document: g.document } });
    let threw = '';
    try { ctx2.showAddContractor(); } catch (e) { threw = e.message; }
    eq(threw, '', '⚠ a missing field does not throw');
    eq(g.els['add-contractor-card'].dataset.editId, '',
       '⚠⚠ and the edit target is released even so — the clear comes first');
    eq(g.els['c-firstname'].value, '', 'the fields after the missing one are still cleared');
    eq(g.saveBtn.textContent, 'Save Contractor', 'and the button is still corrected');

    // ⚠⚠ THE ORDERING ITSELF, AND THE FIRST VERSION OF THIS SUITE COULD NOT SEE IT.
    // With the ids corrected and the lookups guarded, nothing throws — so moving the
    // `dataset.editId = ''` back to the END of the function left every check above GREEN.
    // Caught by reverting, not by reading; the sixth time this repository has recorded it.
    //
    // The requirement is not "the ids are right". It is: WHATEVER GOES WRONG IN THE RESET,
    // the edit target is already released. So the reset is made to fail outright, the way
    // it really failed, and the claim is checked on the far side of that.
    const t = formDom();
    let reached = false;
    const realGet = t.document.getElementById;
    t.document.getElementById = function (id) {
      if (id === 'c-phone') { reached = true; throw new Error('boom'); }
      return realGet(id);
    };
    const ctx3 = sandbox({ fns: ['showAddContractor'], stubs: { document: t.document } });
    try { ctx3.showAddContractor(); } catch (e) { /* the reset is allowed to die */ }
    eq(reached, true, 'the staged failure really is inside the reset');
    eq(t.els['add-contractor-card'].dataset.editId, '',
       '\u26a0\u26a0 the edit target is released BEFORE anything that can throw');
    eq(t.saveBtn.textContent, 'Save Contractor',
       '\u26a0 and the button no longer offers to update the person you last edited');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('the form names the fields the page actually has');
  {
    const b = noComments(fn('showAddContractor'));
    lacks(b, "'c-name'", "⚠ `c-name` is gone — it has never existed in the markup");
    has(b, "'c-firstname'", 'the first-name field is reset');
    has(b, "'c-lastname'", 'and the last-name field');
    eq((src.match(/id="c-name"/g) || []).length, 0, 'and the page still has no such element');
    // Every id the reset names must be a real element, or this is back.
    const ids = new Set();
    for (const m of src.matchAll(/\bid="(c-[\w-]+)"/g)) ids.add(m[1]);
    const named = (b.match(/'(c-[\w-]+)'/g) || []).map((x) => x.slice(1, -1));
    eq(named.filter((id) => !ids.has(id)).sort().join(', '), '',
       '⚠ every field the reset touches exists on the page');
  }

  // ───────────────────────────────────────────────────────────────────────────
  group('⚠ AND THE WRITE END REFUSES TO RENAME SOMEBODY SILENTLY');
  {
    // Belt and braces. If the clear above is ever defeated again, this is what stands
    // between a stale edit target and a destroyed roster row: an edit that changes the
    // NAME is a different person, and it has to be confirmed rather than assumed.
    const b = noComments(fn('saveContractor'));
    has(b, '!samePerson(_prev.name, name)', '⚠ a rename is detected by the shared person key');
    has(b, 'confirm(', 'and challenged rather than performed');
    has(b, 'return;', 'with the save abandoned on a cancel');
    has(b, 'as a new person', 'and the message says what to do instead');
    // ⚠ It must read BOTH rosters — the founders live in DEFAULT_CONTRACTORS, and they are
    // exactly the rows whose loss propagates through `havellin_defaults_v3`.
    has(b, 'DEFAULT_CONTRACTORS.find', 'it looks in the built-in roster');
    has(b, 'contractors.find', 'and in the added one');
  }
};
