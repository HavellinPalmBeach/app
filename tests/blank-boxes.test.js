'use strict';
// BLANK BOXES (2026-10-23).
//
// Anthony, on Client Intake's Move Destination: *"on any forms, remove the example stuff that is in the fields. we
// don't need prompts for these things and in the worst case, they look like they are already filled out. just need
// blank boxes to fill in, no suggestions. check the whole app and correct."*
//
// The net over the attribute itself is in doc-send.test.js (the markup tripwire it has held since P9). This file holds
// the other half: where the grey words were a box's ONLY name, or carried a rule, they moved onto a label or a caption
// outside the box, and a box with neither is a blank square nobody can fill in. Each check names the box and the words
// that now sit beside it. The behaviour of the three that a script writes (the change order's specialist hint, the
// appraiser's name caption, a house row's prompt) is driven in prep-co-hours, vendor-categories and intake-house-flags;
// the intake form is driven in browser step 97.

const { source } = require('./harness');

module.exports = function ({ group, ok, has, lacks }) {
  const src = source();
  // Bounded: the snippet must sit within a few hundred characters of the box it names, never anywhere in 2.7 MB.
  const near = (boxNeedle, words, msg, span) => {
    const i = src.indexOf(boxNeedle);
    ok(i >= 0, msg + ': the box is there  [missing: ' + boxNeedle + ']');
    if (i < 0) return;
    const slice = src.slice(Math.max(0, i - (span || 400)), i + boxNeedle.length + 80);
    has(slice, words, msg);
    lacks(slice.slice(slice.indexOf(boxNeedle)), 'placeholder', msg + ', and nothing inside it');
  };

  group('intake and Edit Client: the names and the rules are on the labels');
  {
    near('<input type="text" id="i-fname">', '<label>First name <span style="color:#A32D2D;font-weight:700;">*</span></label>', "the client's first name box is labelled", 120);
    near('<input type="text" id="i-lname">', '<label>Last name <span style="color:#A32D2D;font-weight:700;">*</span></label>', 'and the last name box', 120);
    lacks(src, 'i-name-label', 'the one label over both boxes is gone, with the script that swapped it');
    near('<input type="text" id="i-probate-court"', '<label>Court <span style="font-weight:400;color:var(--gray);">(filled from the case number)</span></label>', "intake's Court says it fills itself", 160);
    near('<input type="text" id="ec-probate-court"', '(filled from the case number)</span>', "and so does Edit Client's", 300);
    near('<input type="text" id="inc-present"', '<label>Who was present <span class="lbl-hint">&mdash; names, with ; between them</span></label>', 'who was present at an incident: names, with ; between them', 120);
    near('<input type="number" step="1" id="co-tc-hrs"', 'Additional concierge hours <span class="lbl-hint">&mdash; negative to reduce</span>', 'change order concierge hours: negative to reduce', 200);
    near('<input type="number" step="1" id="co-ps-hrs"', '<span class="lbl-hint" id="co-ps-hrs-hint">&mdash; negative to reduce</span>', 'and the specialist hours, on a label the script rewrites on Home Prep', 200);
  }

  group('dialogs: a label for every box that had only grey words');
  {
    near('<input type="text" id="cust-party">', '<label style="margin-top:0;">To or from whom</label>', 'chain of custody: to or from whom', 80);
    near('<input type="text" id="cust-method">', '<label>Method</label>', 'its method', 60);
    near('<input type="text" id="cust-receipt">', '<label>Receipt or document reference</label>', 'its receipt', 80);
    near('<textarea id="closeout-note"', 'Note <span style="font-weight:400;color:var(--gray);">(optional)</span></label>', 'Close Out Client: the note', 200);
  }

  group('built by scripts: a caption over each box');
  {
    near("'<textarea rows=\"1\" oninput=\"updatePrepNote(", '>Scope for this trade</div>', 'a prep line\'s scope', 200);
    near("cap('Name', '<input type=\"text\" id=\"bq-ben-name-'", "cap('Name', ", 'a beneficiary\'s name', 20);
    near("cap('Relationship', '<input type=\"text\" id=\"bq-ben-rel-'", "cap('Relationship', ", 'relationship', 20);
    near("cap('Phone', '<input type=\"tel\" id=\"bq-ben-phone-'", "cap('Phone', ", 'phone', 20);
    near("cap('Email', '<input type=\"email\" id=\"bq-ben-email-'", "cap('Email', ", 'email', 20);
    near("cap('The bequest, as given', '<input type=\"text\" id=\"bq-desc-'", "cap('The bequest, as given', ", 'the bequest', 20);
    near("cap('Item #s (optional)', '<input type=\"text\" id=\"bq-items-'", "cap('Item #s (optional)', ", 'its item numbers', 20);
    near("'<input type=\"text\" id=\"bq-match-'", ">Item #</span>'", 'a bequest\'s match box', 80);
    has(src, "var cap = function (t, ctl, cell) { return '<div style=\"min-width:0;' + (cell || '') + '\"><div style=\"", 'the caption helper puts the words over the box');
    near('class="ps-lot-g"', ">Gross</span>'", 'a sold lot\'s gross', 120);
    near('class="ps-lot-f"', ">Fees</span>'", 'and its fees', 120);
    near('<input type="text" id="appr-name"', '<div id="appr-name-lbl"', 'an appraiser\'s name, its caption rewritten by the pick', 250);
    near('<input type="text" id="appr-firm"', '>Firm</div>', 'and the firm', 200);
    near("'<input id=\"av-wp-'", "p.split(':')[1] + '</div>'", 'a WorthPoint sale\'s five boxes', 250);
    near("<input type=\"number\" id=\"log-m'+i+'-hrs\"", "'<div><label style=\"margin:0;\">Hours</label>", 'a specialist\'s hours on the log, as the concierge\'s', 60);
    near("'onchange=\"setVendorRatingNote(", '>Close-out note</div>', 'a vendor\'s close-out note', 200);
    near("'<textarea id=\"coll-note-'", ">Note</div>' +", 'a walkthrough collection\'s note', 200);
    near("'<textarea rows=\"2\" oninput=\"updateVehicleField(", ">Notes</div>' +", 'a vehicle\'s notes', 200);
    near("+ '<input type=\"text\" id=\"fc-note-input\" class=\"fc-note-in\"'", '<label for="fc-note-input" class="fc-note-lbl">Note</label>', 'the camera\'s note box', 120);
    has(src, ".hf-ask{", 'the house row\'s prompt has its own line style');
    has(src, ".fc-note-lbl{", 'and the camera\'s label');
  }
};
