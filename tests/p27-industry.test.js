'use strict';
// P27 (2026-10-17): the industry's senior-move practice, sense-checked against the Job Plan and built as Anthony decided it,
// one question at a time (Q75 to Q85 in the tracker): procedure lines and four short pages, never boxes; two intake rows
// (offsite storage, who decides for the family); the destination's move-in contact; move day's damage read off the Incidents
// card; the Bill of Lading filed like every signed paper; the settle-in check-in on a closed Home Transition's dashboard; and a
// living client's ⚑ line sold unvalued flagged on the paper they initial.
//
// Each page sentence a person acts on is held here to the code that makes it true, so a change to the app goes red until the
// page is updated in the same commit (the photography guide's rule). The last group nets the build's shorthand out of the pages.

const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = source();
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;
const text = (html) => String(html)
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, '’').replace(/&ldquo;|&rdquo;/g, '"')
  .replace(/&middot;/g, '·').replace(/&sect;/g, '§').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ');

const PAGES = ['sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html'];
const SVCS = ['downsizing', 'downsizing_move', 'home_cleanout', 'prep', 'cleanout', 'probate', 'contested_probate'];

module.exports = function ({ group, ok, eq, has, lacks }) {
  // ═══ Q76, Q77 · THE TWO INTAKE ROWS ═══
  group('Q76 · offsite storage is a house-list row on every service but Home Prep; Q77 · who decides is asked on a living client only');
  {
    const c = sandbox({
      vars: ['FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'DECEDENT_SERVICES'],
      fns: ['esc', 'houseFlagsOf', 'activeHouseFlags', 'standingFlagLines', 'mustFindItems', 'mustFoundOf', '_mustFindKey',
            'houseFlagAsked', 'houseFlagInputsHtml', '_houseFlagRowClass', 'readHouseFlagInputs', 'showHouseFlagRows'],
    });
    const F = c.HOUSE_FLAGS, storage = F.find((f) => f.key === 'storage'), decider = F.find((f) => f.key === 'decider');
    ok(storage && decider, 'both rows are in the catalogue');
    eq(storage.label, 'Offsite storage or a second property', 'the storage row, in plain words');
    has(storage.ask, 'who has the key', 'and it asks who holds the key');
    lacks(storage.ask.toLowerCase(), 'the code,', 'but never the code (Q72: codes go on the Keys & access card)');
    has(storage.ask, 'Keys & access card', 'and says where the code goes');
    eq(decider.label, 'Who decides for the family', 'the decider row');
    eq(decider.living, true, 'marked living');
    has(decider.ask, 'phone number', 'and asks for a number');

    SVCS.forEach((svc) => {
      eq(c.houseFlagAsked(storage, svc), svc !== 'prep', 'storage is asked on ' + svc + (svc === 'prep' ? ' — no: nothing leaves a prep house' : ''));
      eq(c.houseFlagAsked(decider, svc), !c.DECEDENT_SERVICES[svc] && svc !== 'prep', 'the decider is asked on ' + svc + ' only where the client is living and it is not a prep');
    });
    // The other seven are unchanged by the new rule.
    ['cash', 'valuables', 'firearms', 'safes', 'documents', 'sentimental'].forEach((k) => {
      const f = F.find((x) => x.key === k);
      ok(SVCS.every((svc) => c.houseFlagAsked(f, svc) === (svc !== 'prep')), k + ' still follows the prep rule alone');
    });
    ok(SVCS.every((svc) => c.houseFlagAsked(F.find((x) => x.key === 'access'), svc)), 'access is still asked everywhere');

    // Both forms render through the one rule: on a probate intake the decider row is hidden, the storage row shown.
    const probateHtml = c.houseFlagInputsHtml('i', null, 'probate');
    has(probateHtml, 'id="i-hfr-decider" style="display:none;"', 'the decider row is hidden on a probate intake');
    has(probateHtml, 'id="i-hfr-storage">', 'and the storage row is shown');
    const livingHtml = c.houseFlagInputsHtml('i', null, 'downsizing');
    has(livingHtml, 'id="i-hfr-decider">', 'on a living intake the decider row is shown');

    // The save keeps the record's value for a row the service does not ask (readHouseFlagInputs), so a living client's
    // decider survives a save on an estate form that never showed it — and is never written from a hidden control.
    const prior = { houseFlags: { decider: { on: true, note: 'Ruth, the daughter, 561-555-0100' }, storage: { on: true, note: 'Public Storage, Okeechobee' } } };
    const dom = domStub({});
    const c2 = sandbox({
      vars: ['FIREARMS_PROTOCOL_DOC', 'HOUSE_FLAGS', 'DECEDENT_SERVICES'],
      fns: ['houseFlagsOf', 'houseFlagAsked', 'readHouseFlagInputs'], stubs: { document: dom },
    });
    dom.getElementById('ec-hf-storage').checked = true; dom.getElementById('ec-hfn-storage').value = 'Unit 14, Public Storage, Okeechobee Blvd';
    dom.getElementById('ec-hf-decider').checked = false; dom.getElementById('ec-hfn-decider').value = '';
    const onEstate = c2.readHouseFlagInputs('ec', 'cleanout', prior);
    eq(onEstate.decider, { on: true, note: 'Ruth, the daughter, 561-555-0100' }, 'an estate save keeps the record’s decider untouched (the control was hidden)');
    eq(onEstate.storage.note, 'Unit 14, Public Storage, Okeechobee Blvd', 'and reads the storage row the form showed');
    const onLiving = c2.readHouseFlagInputs('ec', 'downsizing', prior);
    eq(onLiving.decider, { on: false, note: '' }, 'a living save reads the decider row as the form shows it');

    // The brief carries both, in catalogue order, with their notes.
    const lines = c.standingFlagLines({ houseFlags: { storage: { on: true, note: 'Unit 14' }, decider: { on: true, note: 'Ruth' } } });
    eq(lines.map((l) => l.label), ['Offsite storage or a second property', 'Who decides for the family'], 'both reach the crew brief');
    eq(lines.map((l) => l.note), ['Unit 14', 'Ruth'], 'with what intake wrote');
  }

  group('Q76 · the walkthrough grid prices the storage unit as an exterior row, weighted like the storage room');
  {
    const c = sandbox({ vars: ['ROOMS', 'ROOM_WEIGHT', 'EXTERIOR_ROOMS'], fns: ['engineIsExterior'] });
    const sec = c.ROOMS.find((s) => s.section === 'Garage & Storage');
    ok(sec && sec.rooms.some((r) => r.name === 'Storage Unit (offsite)'), 'the row is under Garage & Storage');
    eq(c.ROOM_WEIGHT['Storage Unit (offsite)'], 2.5, 'weighted as Storage Room / Oversized Closets');
    eq(c.ROOM_WEIGHT['Storage Room / Oversized Closets'], 2.5, '(which is 2.5)');
    eq(c.engineIsExterior('Storage Unit (offsite)'), true, '⚠ exterior: its load is added on top of the house, not averaged into its square footage');
    eq(c.engineIsExterior('Storage Room / Oversized Closets'), false, 'where the storage room inside the house is interior');
    const row = sec.rooms.find((r) => r.name === 'Storage Unit (offsite)');
    eq([row.tc, row.ps], [0.70, 1.45], 'the same per-room hours as the storage room');
  }

  // ═══ Q81 · THE MOVE-IN CONTACT ═══
  group('Q81 · the destination block takes the move-in contact, on intake and Edit Client, never held, read by the plan header');
  {
    const intake = SRC.slice(SRC.indexOf('id="i-dest-sqft"'), SRC.indexOf('id="i-dest-sqft"') + 1200);
    has(intake, 'id="i-dest-contact"', 'intake has the control under the new home sq ft');
    has(intake, 'optional', 'and says it is optional');
    const fields = codeOnly(decl('INTAKE_FIELDS'));
    has(fields, "'i-dest-contact'", 'the reset clears it with the other destination fields');
    const save = codeOnly(fn('saveIntake'));
    has(save, "var destContact = String((document.getElementById('i-dest-contact')||{}).value || '').trim();", 'intake reads it trimmed');
    has(save, 'destContact:destContact', 'and writes it on the job');
    const ec = codeOnly(fn('showEditClient'));
    has(ec, "txt('dest-contact', job.destContact)", 'Edit Client renders it from the record');
    const ecSave = codeOnly(fn('saveClientEdit'));
    has(ecSave, "var _ecDestContact = document.getElementById('ec-dest-contact');", 'the save looks for the control');
    has(ecSave, "if (_ecDestContact) job.destContact = String(_ecDestContact.value || '').trim();", 'and writes it only when rendered, with no lock');
    lacks(ecSave.slice(ecSave.indexOf('_ecDestContact')), '_locked) job.destContact', 'never held after approval: it prices nothing');
    const plan = codeOnly(fn('renderJobPlan'));
    has(plan, "if (isMM && String(job.destContact || '').trim()) _hdrBits.push(['Move-in contact', esc(String(job.destContact).trim())]);",
        'the Job Plan header names the contact on a Home Transition');
    // The sentence in the pages that points at it.
    has(text(read('move-day-guide.html')), 'the name and number are on Edit Client and the Job Plan header', 'Move Day says where the number is');
  }

  // ═══ Q79, Q80 · MOVE DAY: THREE FACTS, THE DAMAGE LINE, THE BILL OF LADING ═══
  const STATE = ['jobs', 'estimateStore', 'jobPlanStore', 'vendors', 'prepItems', '_photoRefs'];
  group('Q80 · move day records three facts; damage is a derived line off the Incidents card');
  {
    const c = sandbox({
      vars: ['PLAN_TASKS', 'PLAN_COI_PTYPES', 'PLAN_COI_ACCESS_RE', 'PLAN_VALUABLES_VENDOR_TYPES', 'INCIDENT_KINDS', 'INCIDENT_ACTS', 'DECEDENT_SERVICES'],
      fns: ['planTasksFor', 'planTaskCtx', 'planTaskApplies', 'planDerivedLines', 'incidentReportsOf', 'incidentUpdatesOf', 'incidentStatus',
            'jobListEntries', 'jobListGet', 'isDecedentJob', 'houseFlagsOf', 'fmt', 'roundCents'],
      stubs: {
        _planRooms: () => ({ rooms: [] }), jobPlanStore: {}, matterDef: () => null, matterTypeOf: () => '', jobOnProbateTrack: () => false,
        docTierOf: () => '', docTierProduces: () => false, jobAppraisalDuty: () => '', invFiduciaryMode: () => false, isFormalDoc: () => false,
        firearmsFlaggedAtIntake: () => false, logisticsLineOn: () => false, estimateAppraiserLines: () => [], roomStatusNormalize: (s) => s,
        HOUSE_FLAGS: [], ledgerDerivedLines: () => [], accessItemsOf: () => [], _todayStr: () => '2026-10-17',
      },
    });
    const est = { svc: 'downsizing_move', vendors: [] };
    const mm = { id: 7, svc: 'downsizing_move', incidents: [] };
    const ctx = c.planTaskCtx(mm, est);
    eq(c.planTasksFor(c.PLAN_TASKS, 'p3', ctx).map((t) => t.key), ['mv_eta', 'mv_client_walk', 'mv_mover_signoff'], 'three boxes');
    eq(c.PLAN_TASKS.filter((t) => t.key === 'mv_damage').length, 0, '⚠⚠ no damage box: the fact lives on the Incidents card');
    eq(c.PLAN_TASKS.find((t) => t.key === 'mv_mover_signoff').label, 'Bill of Lading and the mover’s inventory signed', 'the sign-off box names the papers (Q79)');

    let lines = c.planDerivedLines(7, mm, est, 'p3');
    eq(lines.map((l) => l.key), ['move_damage'], 'the stage has one derived line');
    eq([lines[0].ok, !!lines[0].red, lines[0].label], [true, false, 'No damage reported'], 'with no incident it reads none reported');
    has(lines[0].detail, 'Incidents card', 'and says where damage goes');

    const damaged = { id: 7, svc: 'downsizing_move', incidents: [
      { id: 'i1', entry: 'report', kind: 'damage', occurredOn: '2026-10-16', where: 'The truck', what: 'Mirror cracked', recordedAt: 1 }] };
    lines = c.planDerivedLines(7, damaged, est, 'p3');
    eq([lines[0].ok, lines[0].red, lines[0].label], [false, true, 'Damage reported: 1 incident'], 'an open damage incident reads red');
    eq(lines[0].action && lines[0].action.call, 'goToIncidents(7)', 'and offers the Incidents card');
    damaged.incidents.push({ id: 'u1', entry: 'update', of: 'i1', act: 'resolved', note: 'Mover’s claim filed', recordedAt: 2 });
    lines = c.planDerivedLines(7, damaged, est, 'p3');
    eq([lines[0].ok, !!lines[0].red], [true, false], 'resolved, it reads done');
    has(lines[0].detail, 'all resolved', 'and says so');
    eq(c.planDerivedLines(7, { id: 8, svc: 'home_cleanout', incidents: [] }, { svc: 'home_cleanout', vendors: [] }, 'p3'), [], 'no line off a Home Transition');

    const plan = codeOnly(fn('renderJobPlan'));
    has(plan, "planDerivedHtml(jobId, job, est, 'p3') + planTasksHtml(jobId, 'p3', ctx) + planProcedureHtml('p3', ctx) + planBolHtml(jobId, job)",
        'the Move day stage draws the line, the boxes, the procedure and the Bill of Lading');
  }

  group('Q79 · the Bill of Lading and the mover’s inventory file through fileSignedCopy, kind bol, from the Move day stage');
  {
    const c = sandbox({
      vars: ['SIGNED_RECORD_KINDS', 'BOL_SIGNED_REF', '_signedCopySpecs', '_signedCopyKeys'],
      fns: ['planBolHtml', 'bolSignedCopies', 'signedRecordsOf', 'jobListEntries', 'signedRecordLinksHtml', 'signedCopyControlHtml', 'esc', 'fmtDate2'],
    });
    ok(c.SIGNED_RECORD_KINDS.bol, 'the kind is in the catalogue, so fileSignedCopy accepts it');
    eq(c.SIGNED_RECORD_KINDS.bol.label, 'Bill of Lading and mover’s inventory', 'its label');
    eq(c.BOL_SIGNED_REF, 'bol', 'the ref is a stored value');
    const none = c.planBolHtml(7, { id: 7, signedRecords: [] });
    has(none, 'File the Bill of Lading', 'with nothing filed the control says what to file');
    has(none, 'fileSignedCopyFromInput(this,', 'through the one signed-copy control');
    has(none, 'Signed Records folder', 'and says where it goes');
    const filed = c.planBolHtml(7, { id: 7, signedRecords: [{ id: 'sr1', kind: 'bol', ref: 'bol', label: 'Bill of Lading and mover’s inventory', fileUrl: 'https://drive.google.com/file/d/BOL/view', signedOn: '2026-10-16' }] });
    has(filed, 'href="https://drive.google.com/file/d/BOL/view"', 'a filed copy is linked');
    has(filed, 'File another copy', 'and the control offers another');
    has(filed, "voidSignedRecord(7,'sr1')", 'with a Void beside it, like every signed paper');
    eq(c.bolSignedCopies({ id: 7, signedRecords: [{ id: 'x', kind: 'bol', ref: 'bol', voidedAt: 1 }] }).length, 0, 'a voided copy is not listed');
    has(text(read('move-day-guide.html')), 'File the Bill of Lading', 'Move Day names the control');
  }

  // ═══ Q75, Q78 · THE PROCEDURE BLOCKS AND THEIR PAGES ═══
  group('Q75 · the industry practice is procedure lines under the stages, each with its page, never boxes');
  {
    const c = sandbox({
      vars: ['PLAN_PROCEDURE', 'PLAN_COI_PTYPES', 'PLAN_COI_ACCESS_RE', 'PLAN_VALUABLES_VENDOR_TYPES', 'DECEDENT_SERVICES'],
      fns: ['planProcedureHtml', 'guideLinkHtml', 'planSubsec', 'planTaskCtx', 'planTaskApplies', 'isDecedentJob', 'houseFlagsOf', 'esc'],
      stubs: { matterDef: () => null, matterTypeOf: () => '', jobOnProbateTrack: () => false, docTierOf: () => '', docTierProduces: () => false,
               jobAppraisalDuty: () => '', invFiduciaryMode: () => false, isFormalDoc: () => false, firearmsFlaggedAtIntake: () => false,
               logisticsLineOn: () => false, estimateAppraiserLines: () => [], HOUSE_FLAGS: [] },
    });
    const ctxOf = (svc) => c.planTaskCtx({ id: 1, svc }, { svc, vendors: [] });
    const blocks = (phase, svc) => c.PLAN_PROCEDURE.filter((p) => p.phase === phase && (!p.when || p.when(ctxOf(svc)))).map((p) => p.sec);
    eq(blocks('p0', 'downsizing_move'), ['Choosing the mover'], 'Before Day 1 on a Home Transition: choosing the mover (Q78)');
    eq(blocks('p0', 'downsizing'), [], 'and nothing on Home Editing');
    SVCS.forEach((svc) => eq(blocks('p1', svc), svc === 'prep' ? [] : ['How the sorting runs'], 'In the house on ' + svc + ': the sorting block wherever a record is kept'));
    eq(blocks('p2', 'downsizing_move'), ['Packing'], 'Midpoint & pickups on a Home Transition: packing');
    eq(blocks('p2', 'downsizing'), ['Packing'], 'and on Home Editing, which keeps things');
    eq(blocks('p2', 'home_cleanout'), [], 'not on a cleanout');
    eq(blocks('p2', 'probate'), [], 'nor an estate');
    eq(blocks('p3', 'downsizing_move'), ['How move day runs', 'How move-in runs'], 'Move day: the day and the move-in');

    // Q78 (Anthony): the coverage question is asked of the mover when one is chosen, during the job.
    const mover = c.PLAN_PROCEDURE.find((p) => p.sec === 'Choosing the mover');
    has(mover.items.join(' '), 'Ask the mover what the load is insured for.', 'the coverage line is where the mover is chosen');
    has(mover.items.join(' '), 'the new building insures nothing', 'and says the community covers nothing');
    eq(mover.doc, undefined, 'it has no page: two lines are the whole of it');
    const precall = codeOnly(decl('PLAN_TASKS'));
    lacks(precall.slice(precall.indexOf("key:'precall'"), precall.indexOf("key:'precall'") + 400), 'insur', '⚠ nothing about coverage on the pre-job call box');

    // Q4 (the to-go bag) and the DO NOT LOAD closet reach move day as lines.
    const day = c.PLAN_PROCEDURE.find((p) => p.sec === 'How move day runs').items.join(' ');
    has(day, 'The to-go bag (medications, documents, chargers, a change of clothes) and the keys to the new home ride with the client, never on the truck.', 'the to-go bag line');
    has(day, 'One family member stays with the client all day, not directing the movers', 'the one person with the client');
    has(day, 'Sign the Bill of Lading and the mover’s inventory, photograph both and file them below.', 'the paperwork line points at the filing under it');
    const pack = c.PLAN_PROCEDURE.find((p) => p.sec === 'Packing').items.join(' ');
    has(pack, 'The DO NOT LOAD closet', 'the closet');
    has(pack, 'Label the sides of every box, not the top', 'the labels');
    has(pack, 'fridge and freezer emptied and defrosted', 'appliance prep the day before');
    const sort = c.PLAN_PROCEDURE.find((p) => p.sec === 'How the sorting runs').items.join(' ');
    has(sort, 'Two to three hours of decisions, once a day.', 'session discipline');
    has(sort, 'The client decides first; the family asks after.', 'who decides');
    const movein = c.PLAN_PROCEDURE.find((p) => p.sec === 'How move-in runs').items.join(' ');
    has(movein, 'Bedroom, bathroom, kitchen first', 'the priority rooms');
    has(movein, 'get their direct line, not the front desk', 'the move-in contact’s direct line');

    // Every block with a page links a page that exists, under its list, as a link and never a step.
    c.PLAN_PROCEDURE.filter((p) => p.doc).forEach((p) => {
      ok(fs.existsSync(path.join(ROOT, p.doc)), p.sec + ' links ' + p.doc + ', which exists');
      ok(PAGES.indexOf(p.doc) >= 0, 'and it is one of the four pages');
    });
    eq(c.PLAN_PROCEDURE.filter((p) => p.doc).map((p) => p.doc).sort(), PAGES.slice().sort(), 'each of the four pages is linked from exactly one block');
    const html = c.planProcedureHtml('p3', ctxOf('downsizing_move'));
    eq(count(html, '<li>'), 14, 'move day draws 9 + 5 lines');
    // 2026-10-18 (Anthony: like the room-score info box, not a new tab): the link keeps its href and opens over the plan.
    has(html, '<a href="move-day-guide.html" rel="noopener" onclick="return openGuidePage(event, this.getAttribute(\'href\'), this.textContent)">Read Move Day &rarr;</a>', 'Move Day linked, opening over the plan');
    has(html, '<a href="first-night-guide.html" rel="noopener" onclick="return openGuidePage(', 'The First Night linked the same way');
    lacks(html, 'target="_blank"', '⚠ no link on the plan opens a new tab');
    {
      const dom = domStub({});
      const g = sandbox({ fns: ['openGuidePage', 'closeGuidePage', 'guideLinkHtml', 'esc'], stubs: { document: dom } });
      const ev = { prevented: 0, preventDefault() { this.prevented++; } };
      eq(g.openGuidePage(ev, 'move-day-guide.html', 'Read Move Day →'), false, 'the click is taken by the panel');
      eq(ev.prevented, 1, 'and the link does not navigate');
      eq(dom.getElementById('guide-frame').getAttribute('src'), 'move-day-guide.html', 'the page is loaded into the frame');
      eq(dom.getElementById('guide-modal').style.display, 'flex', 'the panel is shown');
      eq(dom.getElementById('guide-title').textContent, 'Move Day', 'headed by the page’s name');
      eq(dom.getElementById('guide-open').getAttribute('href'), 'move-day-guide.html', 'with Open in its own tab pointing at the page');
      g.closeGuidePage();
      eq(dom.getElementById('guide-modal').style.display, 'none', 'Close hides it');
      eq(dom.getElementById('guide-frame').getAttribute('src'), 'about:blank', 'and empties the frame');
      has(SRC, '<div class="modal-overlay" id="guide-modal" style="display:none;"', 'the panel is in the markup');
      has(SRC, '<iframe id="guide-frame" title="Field guide" src="about:blank"></iframe>', 'with its frame');
      // Every page the app links goes through the one opener: the firearms protocol too.
      const live = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      eq((live.match(/esc\((?:l|row)\.doc\) \+ '" target="_blank"/g) || []).length, 0, 'no protocol link opens a new tab');
      eq((live.match(/guideLinkHtml\(/g) || []).length, 8, 'the one opener has its definition and seven readers (the procedure, the brief, the banner, the room line, the transport panel, the Incidents card since 2026-10-19, and Photographing a House on the plan and in the room, photoGuideLinkHtml, since 2026-10-19)');
    }
    eq(count(html, 'type="checkbox"'), 0, '⚠⚠ no box in a procedure block');
    eq(c.planProcedureHtml('p1', ctxOf('prep')), '', 'a prep plan draws no sorting block');

    const plan = codeOnly(fn('renderJobPlan'));
    has(plan, "planTasksHtml(jobId, 'p0', ctx, null, ['Pre-job call']) +\n    planProcedureHtml('p0', ctx)", 'Before Day 1 draws its block after the boxes');
    has(plan, "var inHouse = planTasksHtml(jobId, 'p1', ctx) + planProcedureHtml('p1', ctx);", 'In the house draws the sorting block under the boxes');
    has(plan, "planTasksHtml(jobId, 'p2', ctx) + planProcedureHtml('p2', ctx);", 'Midpoint & pickups draws packing');
  }

  // ═══ Q81 · THE SETTLE-IN CHECK-IN ═══
  group('Q81 · a closed Home Transition’s dashboard reminds of the check-in call from day 10 to day 21, clock-free, nothing to tick');
  {
    const c = sandbox({
      vars: ['MOVE_CHECKIN_FROM', 'MOVE_CHECKIN_DAY', 'MOVE_CHECKIN_TO'],
      fns: ['moveCheckinLine', 'moveCheckinDashHtml', 'incidentDayPlus', '_ymdLocal', 'fmtDate2', 'derivedLinesHtml'],
      stubs: { sectionHdr: (t) => '<h4>' + t + '</h4>', _todayStr: () => '2026-10-15' },
    });
    eq([c.MOVE_CHECKIN_FROM, c.MOVE_CHECKIN_DAY, c.MOVE_CHECKIN_TO], [10, 14, 21], 'ten days to three weeks, named for day fourteen');
    const job = { id: 7, svc: 'downsizing_move', status: 'closed', deliveredOn: '2026-10-01' };
    // Delivered Oct 1: day 10 is Oct 11, day 14 Oct 15, day 21 Oct 22.
    const d10 = c.moveCheckinLine(job, '2026-10-11');
    ok(d10, 'on day 10 the line is up');
    eq(d10 && d10.label, 'Check-in call due around Oct 15, 2026', 'named for day 14');
    eq(d10 && [d10.key, d10.ok], ['move_checkin', false], 'open, never ticked');
    has(d10 && d10.detail, 'a doctor', 'and says when distress is for a doctor');
    eq(c.moveCheckinLine(job, '2026-10-10'), null, 'not on day 9');
    ok(c.moveCheckinLine(job, '2026-10-22'), 'still on day 21');
    eq(c.moveCheckinLine(job, '2026-10-23'), null, 'gone on day 22: nothing lingers');
    eq(c.moveCheckinLine({ id: 8, svc: 'home_cleanout', deliveredOn: '2026-10-01' }, '2026-10-15'), null, 'only a Home Transition');
    eq(c.moveCheckinLine({ id: 9, svc: 'downsizing_move' }, '2026-10-15'), null, 'only once delivered');
    const html = c.moveCheckinDashHtml(job);
    has(html, 'id="dash-checkin-7"', 'the dashboard card, by id');
    has(html, 'Settling in', 'headed');
    has(html, 'Check-in call due around Oct 15, 2026', 'carrying the line');
    eq(count(html, 'type="checkbox"'), 0, 'with nothing to tick');
    eq(c.moveCheckinDashHtml({ id: 8, svc: 'home_cleanout', deliveredOn: '2026-10-01' }), '', 'and nothing on a cleanout');
    const dash = codeOnly(fn('renderClientDashboard'));
    has(dash, "if (typeof moveCheckinDashHtml === 'function') h += moveCheckinDashHtml(job);", 'the dashboard draws it');
    has(text(read('first-night-guide.html')), 'The client dashboard reminds you from ten days after the move', 'The First Night says when the reminder comes');
  }

  // ═══ Q82 · THE LIVING CLIENT'S FLAGGED LINE SOLD UNVALUED ═══
  group('Q82 · on a living client’s job a ⚑ line put up for sale with no value is a caution on the paper, never a refusal, never on an estate');
  {
    const mk = (fid) => sandbox({
      vars: ['INV_RELEASE_CAUTIONS', 'INV_SALE_DISPOSITIONS'],
      fns: ['invReleaseCautions', '_invCautionBadges', '_invPanelCautionHtml', '_invHasValue', 'esc'],
      stubs: { invFiduciaryMode: () => fid, _invJob: () => ({ id: 7 }), invBequestFor: () => null, invBequestElsewhere: () => null,
               invHavellinRecipient: () => '', invAwaitingAppraisal: () => false, estateDirectionWords: () => ({ who: 'you alone' }) },
    });
    const living = mk(false), estate = mk(true);
    const keys = (c, r) => c.invReleaseCautions(r, 7).map((x) => x.key);
    const flagged = { needsAppr: true, disposition: 'Sell', objectName: 'Side table' };
    eq(keys(living, flagged), ['flaggedUnvalued'], 'flagged, for sale, no value: the caution');
    eq(keys(living, Object.assign({}, flagged, { disposition: 'Auction' })), ['flaggedUnvalued'], 'on any selling disposition');
    eq(keys(living, Object.assign({}, flagged, { fmv: '450' })), [], 'a value recorded clears it');
    eq(keys(living, Object.assign({}, flagged, { apprWaived: true })), [], 'so does a waiver');
    eq(keys(living, Object.assign({}, flagged, { disposition: 'Donate' })), [], 'a donation is not a sale');
    eq(keys(living, Object.assign({}, flagged, { needsAppr: false })), [], 'and an unflagged line is the owner’s to sell');
    eq(keys(estate, flagged), [], '⚠ never on an estate, where needsAppraisal does the work');
    const badge = living._invCautionBadges(flagged, 7);
    has(badge, 'FLAGGED FOR APPRAISAL, NO VALUE RECORDED', 'the row badge, on the request, the Contents Record and the ledger');
    const C = living.INV_RELEASE_CAUTIONS.find((x) => x.key === 'flaggedUnvalued');
    eq(C.living, true, 'a living caution');
    has(C.body, 'Initialling a line below confirms that you choose to sell it without an appraisal.', 'the client initials it knowing');
    has(C.desk, 'not refused', 'and the desk is told why it is not refused');
    const panel = living._invPanelCautionHtml({ id: 7 }, flagged);
    has(panel, 'Flagged for appraisal, no value recorded.', 'the line’s record carries it, headed');
    has(panel, 'proposed: Sell, with no value recorded', 'with the line’s own words');
    has(panel, 'not refused', 'and why it is not refused');
    eq(living._invPanelCautionHtml({ id: 7 }, Object.assign({}, flagged, { fmv: '450' })), '', 'nothing once a value is recorded');
    eq(estate._invPanelCautionHtml({ id: 7 }, flagged), '', 'and nothing on an estate');
    // The three papers read the one badge renderer on their rows.
    ['printApprovalRequest', 'printDispositionLedger', 'printContentsRecord'].forEach((f) => has(codeOnly(fn(f)), '_invCautionBadges(r, jobId)', f + ' badges its rows'));
  }

  // ═══ THE FOUR PAGES ═══
  group('the four pages: in the photography guide’s shape, in plain words, each with its pocket card, each reached from the plan');
  {
    PAGES.forEach((f) => {
      const html = read(f), t = text(html);
      has(html, '<div class="wrap">', f + ' uses the field guide’s page column');
      has(html, 'class="eyebrow">Havellin Palm Beach &middot; Field Guide</p>', f + ' is a Field Guide');
      has(html, 'Pocket card &middot; print it and keep it in the kit', f + ' ends with a pocket card');
      has(html, '<a href="concierge-guide.html">Concierge Guide</a>', f + ' points at the playbook');
      ok(t.split(/\s+/).length < 1700, f + ' is short: ' + t.split(/\s+/).length + ' words');
      // The build's shorthand stays out (the photography guide's rule); "direct line" is a phone, and allowed.
      const words = t.replace(/direct line/gi, ' ').replace(/line-height/g, ' ');
      [['the desk', /\bthe desk\b/i], ['Agent One or Two', /\bAgent (?:One|Two)\b/i], ['"line" for an item', /\blines?\b/i],
       ['"lot" for a group', /\blots?\b/i], ['"chip" for a destination', /\bchips?\b/i], ['"frame" for a photo', /\bframes?\b(?!d)/i],
       ['"manifest"', /\bmanifest\b/i], ['"stableId"', /stableId/]]
        .forEach(([what, re]) => { const m = words.match(re); ok(!m, f + ': no ' + what + (m ? ' ("…' + words.slice(Math.max(0, m.index - 30), m.index + 30) + '…")' : '')); });
    });
    // The four pages are a set and say so; the photography guide and the protocol are their neighbours.
    PAGES.forEach((f) => PAGES.forEach((g) => has(read(f), '<a href="' + g + '">', f + ' names ' + g)));
    PAGES.forEach((f) => has(read(f), 'href="photography-guide.html"', f + ' names Photographing a House'));
    // The pages' sentences that the app makes true.
    const sortTxt = text(read('sorting-guide.html'));
    ['Keep (or New home on a move)', 'To a person', 'Sell', 'Donate', 'and Remove'].forEach((w) => has(sortTxt, w, 'Sorting names the camera’s destination ' + w));
    has(codeOnly(decl('FIELD_DISPOSITIONS')), "'Keep'", 'which the camera offers');
    has(text(read('packing-guide.html')), 'Choosing the mover', 'Packing points at the Before Day 1 block');
    has(text(read('move-day-guide.html')), 'No damage reported', 'Move Day quotes the stage’s line');
    has(text(read('first-night-guide.html')), 'Keys & access card', 'The First Night points at the custody card');
  }

  // ═══ THE DOCUMENTS, BOTH COPIES ═══
  group('the manual and the playbook describe the pack, both copies alike');
  {
    const G = [read('concierge-guide.html'), read('CONCIERGE_GUIDE.md')].map(text);
    const M = [read('manual.html'), read('MANUAL.md')].map(text);
    ['Offsite storage or a second property', 'Who decides for the family', 'Move-in contact', 'Bill of Lading', 'to-go bag', 'DO NOT LOAD',
     'Sorting a House', 'Packing a House', 'Move Day', 'The First Night', 'Check-in call', 'pre-job call script'].forEach((s) => {
      G.forEach((g, i) => has(g.toLowerCase(), s.toLowerCase(), (i ? 'CONCIERGE_GUIDE.md' : 'concierge-guide.html') + ' mentions “' + s + '”'));
    });
    ['Offsite storage or a second property', 'Who decides for the family', 'Move-in contact', 'Storage Unit (offsite)', 'Bill of Lading', 'sorting-guide.html',
     'Settling in', 'flaggedUnvalued'].forEach((s) => {
      M.forEach((m, i) => has(m, s, (i ? 'MANUAL.md' : 'manual.html') + ' mentions “' + s + '”'));
    });
    G.forEach((g, i) => has(g, 'Damage has no box.', (i ? 'CONCIERGE_GUIDE.md' : 'concierge-guide.html') + ' says damage is read off the Incidents card (the old box is named as what changed)'));
    M.forEach((m, i) => lacks(m, 'the thirteen move-day boxes', (i ? 'MANUAL.md' : 'manual.html') + ' no longer counts thirteen move-day boxes'));
    G.concat(M).forEach((d, i) => lacks(d, 'seven-row checklist', 'document ' + i + ' no longer calls the house list seven rows'));
  }
};
