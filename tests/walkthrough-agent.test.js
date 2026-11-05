'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE WALKTHROUGH AGENT (2026-11-05; WALKTHROUGH_AGENT_SPEC.md): one press, Review walkthrough on Build Estimate, and Re-plan
// after. The server looks at each room's walkthrough photographs (agentWalkthroughReview, stage 1) and writes the crew plan
// from what they show and the notes (stage 2). Suggestions sit on the room rows, at most a score and a vendor line a room, scores and vendor lines
// only; the plan lives on the job plan's notes, is never a schedule and never a tick box, and the Job Plan's Next up card
// replaces How the sorting runs.
//   A  the server's rules: a score and a vendor line a room at most, a score only where it differs, a vendor only off the list
//   B  the server's call: the looks in parallel, the plan text-only, the modes, a failed photograph
//   C  the plan as text and back
//   D  Next up off the room statuses
//   E  the app's writer, the answer applied, the re-run over a person's edit
//   F  where it is drawn, and the backend's lists
//   G  the sheet's merge keeps the plan by its stamp
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sandbox, source, fn, matchBrace } = require('./harness');

const GS = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'main-sync.gs'), 'utf8');
function gsFn(name) {
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(GS);
  if (!m) throw new Error('not in .gs: ' + name);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = GS.indexOf('{', re.lastIndex);
  return GS.slice(start, matchBrace(GS, open) + 1);
}
function gsVar(name) {
  const m = GS.match(new RegExp('(^|\\n)(var\\s+' + name + '\\s*=[\\s\\S]*?;)\\s*(//[^\\n]*)?\\n'));
  if (!m) throw new Error('var not in .gs: ' + name);
  return m[2];
}
const AW_VARS = ['AGENT_API', 'AGENT_API_VERSION', 'AGENT_MODELS_API', 'AGENT_MODEL_FLOORS', 'AGENT_MODEL_LINES', 'AGENT_MODEL_LIST_SECS',
  'AGENT_MODEL_DEMOTE_SECS', 'AGENT_MODEL_SLOW_LIMIT', 'AGENT_FALLBACK_BETA', 'AGENT_MAX_IMG',
  'AGENT_WALK_EFFORT_LOOK', 'AGENT_WALK_EFFORT_PLAN', 'AGENT_WALK_MAX_TOKENS', 'AGENT_WALK_PHOTOS_PER_ROOM', 'AGENT_WALK_MAX_ROOMS',
  'AGENT_WALK_PARALLEL', 'AGENT_WALK_LOOK_BUDGET', 'AGENT_WALK_TIME_BUDGET', 'AGENT_WALK_TEXT_MAX', 'AGENT_WALK_LIST_MAX', 'AGENT_WALK_SCALE', 'AGENT_WALK_SOURCES', 'AGENT_WALK_WORK_SOURCE', 'AGENT_WALK_SERVICE_SCOPE'];
const AW_FNS = ['_awServiceScope', '_agProp', '_agMissingProps', '_agImageBlock', '_agModelVersion', '_agVerCmp', '_agNewestOf', '_agCache', '_agModelList',
  '_agDemoted', '_agDemote', '_agSlow', '_agModels', '_agSendAll', '_agHttpFailure',
  '_awClip', '_awList', '_awLookTool', '_awLookSystem', '_awLookContent', '_awRequest', '_awReadTool', '_awLookOf',
  '_awSourced', '_awSourcesOf', '_awSourcedList', '_awPlanTool', '_awPlanSystem', '_awPlanContent', '_awPlanOf', 'agentWalkthroughReview'];

function gs(opts) {
  opts = opts || {};
  const sent = [];
  let t = 1000;
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ((opts.props || { ANTHROPIC_API_KEY: 'sk-ant-test' })[k] || null) }) },
    Logger: { log() {} },
    CacheService: { getScriptCache: () => null },
    DriveApp: { getFileById: (id) => ({ getBlob: () => {
      if ((opts.missing || []).indexOf(id) >= 0) throw new Error('File not found: ' + id);
      return { getContentType: () => 'image/jpeg', getBytes: () => [1, 2, 3] };
    } }) },
    Utilities: { base64Encode: (b) => 'B64(' + b.length + ')' },
    UrlFetchApp: {
      fetch: () => ({ getResponseCode: () => 500, getContentText: () => '{}' }),
      fetchAll: (reqs) => {
        sent.push(reqs.map((r) => JSON.parse(r.payload)));
        t += (opts.tick || 1000);
        return reqs.map((r) => {
          const p = JSON.parse(r.payload);
          const res = opts.reply ? opts.reply(p) : null;
          return { getResponseCode: () => (res ? res.code : 200), getContentText: () => JSON.stringify(res ? res.body : {}) };
        });
      },
    },
    Date: function () { return { getTime: () => t }; },
    JSON, Math, Number, String, Object, Array, Error, parseInt,
  };
  vm.createContext(ctx);
  vm.runInContext(AW_VARS.map(gsVar).concat(AW_FNS.map(gsFn)).join('\n'), ctx);
  ctx.sent = sent;
  return ctx;
}
const TOOL = (name, input) => ({ code: 200, body: { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: name, input: input }] } });
const LOOK = (over) => TOOL('record_room_look', Object.assign({ seen: 'Boxes to the ceiling.', volume_to: 0, complexity_to: 0, vendor: '', why: '', vendor_why: '' }, over || {}));
const PLAN = (over) => TOOL('record_crew_plan', Object.assign({
  context: [{ text: 'She tires after lunch: sort with her in the mornings only.', from: 'walkthrough note' }],
  order: [{ step: 'Sort the papers with her', room: 'Office 1', after: '', vendor: '' },
          { step: 'Donation run', room: '', after: 'Office 1', vendor: 'Donation Pickup' },
          { step: 'Closets', room: 'Walk-in Closet', after: '', vendor: '' }],
  conditions: [{ text: 'Sorting with her mornings only, until 12.', from: 'walkthrough note' }],
  if_cant: ['Rain: work the closets.'],
  length: 'About 3 days with 3 of us, 4 to 5 with 2.',
  rooms: [{ room: 'Office 1', lines: ['Shred pile by the door.'] }, { room: 'Attic', lines: ['nothing'] }]
}, over || {}));
const ROOMS = [
  { name: 'Office 1', vol: 3, cplx: 3, note: 'papers everywhere', photos: ['f1', 'f2'] },
  { name: 'Walk-in Closet', vol: 3, cplx: 2, photos: ['f3'] },
  { name: 'Back Yard', vol: 2, cplx: 2, photos: [] },
  { name: 'Garage (2-car)', vol: 0, cplx: 0, excluded: true, photos: ['f4'] },
];
const CTX = { service: 'Home Editing', crew: '1 concierge and 2 specialists', days: '3 working days', vendorsOn: ['Junk Removal'],
              vendorChoices: ['Junk Removal', 'Donation Pickup', 'Dumpster Rental'], privateNote: 'Son home Tue/Thu.' };

module.exports = function ({ group, ok, eq, has, lacks }) {
  const src = source();

  // ═══════════════════════════════════════════════════════════════════════════
  group('A · the server holds each look to the rule: a score and a vendor line a room at most, a score only where it differs, a vendor off the list');
  {
    const S = gs();
    const room = { name: 'Office 1', vol: 3, cplx: 3 };
    const sug = (inp) => (S._awLookOf(room, Object.assign({ volume_to: 0, complexity_to: 0, vendor: '', why: '', vendor_why: '' }, inp), CTX).suggestions || []);
    const kinds = (inp) => sug(inp).map((x) => x.field === 'vendor' ? 'vendor ' + x.vendor : x.field + ' ' + x.to).join(', ');
    // 2026-11-05c (Anthony, off the first live probe, where the yard's volume pushed the playset's hauler out: "Score + vendor").
    eq(kinds({ volume_to: 5, complexity_to: 4, vendor: 'Dumpster Rental', why: 'boxes', vendor_why: 'a playset' }), 'vol 5, vendor Dumpster Rental',
       '⚠ the volume and the vendor line together, the complexity left out: one score a room');
    const both = sug({ volume_to: 5, vendor: 'Dumpster Rental', why: 'boxes', vendor_why: 'the swing set to haul' });
    eq(both.map((x) => x.why), ['boxes', 'the swing set to haul'], '…each with its own reason');
    eq(sug({ vendor: 'Dumpster Rental', why: 'the swing set' })[0].why, 'the swing set', '…a vendor with no reason of its own takes the one given');
    eq(Object.keys(both[0]).sort(), ['field', 'room', 'to', 'why'], 'a score suggestion carries its room, field, score and reason');
    eq(kinds({ volume_to: 3, complexity_to: 4, why: 'w' }), 'cplx 4', 'a volume equal to the score is no suggestion; the complexity is next');
    eq(kinds({ volume_to: 9 }), '', 'a score off the 1 to 5 scale is none');
    eq(kinds({ vendor: 'Dumpster Rental', why: 'w' }), 'vendor Dumpster Rental', 'a vendor off the list, not on the estimate');
    eq(kinds({ vendor: 'junk removal', why: 'w' }), '', '⚠ a vendor already on the estimate is no suggestion (case aside)');
    eq(kinds({ vendor: 'Hot Tub Wizards', why: 'w' }), '', '⚠ a vendor not on the list is no suggestion');
    const tool = S._awLookTool();
    ok(tool.strict === true && tool.input_schema.additionalProperties === false, 'the look is a strict tool');
    eq(tool.input_schema.required.slice().sort(), ['complexity_to', 'seen', 'vendor', 'vendor_why', 'volume_to', 'why'], 'with every field required');
    lacks(JSON.stringify(tool), 'hours"', 'and no field for hours');
    has(S._awLookSystem(), 'Never suggest hours', '⚠ the prompt says never hours');
    has(S._awLookSystem(), 'usually two points away', 'and a close call is the estimator\'s');
    has(S._awLookSystem(), 'a playset, swing set, trampoline, hot tub, shed or anything else that needs tools and a truck to take down or haul is a vendor', '⚠ the look sends a playset to a vendor (Pricing: never yard hours)');
    has(S._awLookSystem(), 'suggest either, both or neither', '…a score and a vendor are separate');
    has(S._awPlanSystem({}), 'The crew taking down or hauling a playset', '⚠ the plan never has the crew take a playset down (the first probe: "bring a drill")');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('B · the call: rooms with photos looked at, the plan written text-only, the modes, a photograph that fails');
  {
    const S = gs({ reply: (p) => p.tools[0].name === 'record_room_look'
      ? (JSON.stringify(p.messages).indexOf('Office 1') >= 0 ? LOOK({ volume_to: 5, why: 'Floor-to-ceiling boxes.' }) : LOOK())
      : PLAN() });
    const out = S.agentWalkthroughReview({ mode: 'full', context: CTX, rooms: JSON.parse(JSON.stringify(ROOMS)) });
    ok(out.ok, 'it answers');
    const looks = [].concat.apply([], S.sent).filter((p) => p.tools[0].name === 'record_room_look');
    eq(looks.length, 2, '⚠ one look for each in-scope room with photographs: not the yard with none, not the room out of scope');
    eq(Object.keys(out.looks).sort(), ['Office 1', 'Walk-in Closet'], 'what each look saw, by room');
    eq(out.suggestions.length, 1, 'one suggestion came back');
    const S2 = gs({ reply: (p) => p.tools[0].name === 'record_room_look'
      ? (JSON.stringify(p.messages).indexOf('Office 1') >= 0 ? LOOK({ volume_to: 5, why: 'Boxes.', vendor: 'Dumpster Rental', vendor_why: 'A playset.' }) : LOOK())
      : PLAN() });
    const out2 = S2.agentWalkthroughReview({ mode: 'full', context: CTX, rooms: JSON.parse(JSON.stringify(ROOMS)) });
    eq((out2.suggestions || []).map((x) => x.room + ' ' + x.field).join(', '), 'Office 1 vol, Office 1 vendor', '⚠ a room\'s score and vendor line both come back');
    const plan2 = [].concat.apply([], S2.sent).filter((p) => p.tools[0].name === 'record_crew_plan')[0];
    has(JSON.stringify(plan2 && plan2.messages), 'It needs a vendor not yet on the estimate: Dumpster Rental', '⚠ the plan is told the room needs the vendor');
    eq(out.suggestions[0].room + ' ' + out.suggestions[0].field + ' ' + out.suggestions[0].to, 'Office 1 vol 5', '…the office volume to 5');
    const planReq = [].concat.apply([], S.sent).filter((p) => p.tools[0].name === 'record_crew_plan');
    eq(planReq.length, 1, 'one plan request');
    lacks(JSON.stringify(planReq[0].messages), '"type":"image"', '⚠ the plan request carries no photograph: text only, so it answers in time');
    has(JSON.stringify(planReq[0].messages), 'The photographs show: Boxes to the ceiling.', 'it is told what the looks saw');
    has(JSON.stringify(planReq[0].messages), 'Son home Tue/Thu.', 'and the private note');
    has(JSON.stringify(planReq[0].messages), 'OUT OF SCOPE', 'and which room is out of scope');
    eq(looks[0].output_config.effort, 'low', 'the looks at effort low');
    eq(planReq[0].output_config.effort, 'medium', 'the plan at effort medium');
    has(planReq[0].system[0].text, 'never a label or a diagnosis', '⚠ the plan states context as fact and instruction (Anthony: "instructions are fine")');
    has(planReq[0].system[0].text, 'A day-by-day schedule, a date or a day number', '⚠ never a day-by-day schedule');
    has(planReq[0].system[0].text, 'A tick box', '…and never a tick box');
    has(planReq[0].system[0].text, 'nobody carries it out', 'a firearm is photographed where it lies');
    ok(out.plan && out.plan.order.length === 3, 'the plan comes back');
    eq(out.plan.rooms.map((r) => r.room), ['Office 1'], '⚠ a room name the call was not given is dropped (Attic)');
    eq(out.plan.order[1].after, 'Office 1', 'a step riding with a room keeps its room');
    eq(out.plan.ifCant, ['Rain: work the closets.'], 'if you can\'t comes back as ifCant');

    const P = gs({ reply: (p) => p.tools[0].name === 'record_room_look' ? LOOK({ volume_to: 5, why: 'w' }) : PLAN() });
    const plan = P.agentWalkthroughReview({ mode: 'plan', context: CTX, rooms: JSON.parse(JSON.stringify(ROOMS)) });
    eq(plan.suggestions.length, 0, '⚠ the plan only (after approval): no score suggestions');
    ok(!!plan.plan, '…the plan written');

    const C = gs({ reply: (p) => p.tools[0].name === 'record_room_look' ? LOOK({ volume_to: 5, why: 'w' }) : PLAN() });
    const check = C.agentWalkthroughReview({ mode: 'check', context: CTX, rooms: JSON.parse(JSON.stringify(ROOMS)) });
    eq(check.plan, null, 'the check only (a person\'s plan kept): no plan');
    eq([].concat.apply([], C.sent).filter((p) => p.tools[0].name === 'record_crew_plan').length, 0, '…and no plan request sent');

    const F = gs({ missing: ['f3'], reply: (p) => p.tools[0].name === 'record_room_look' ? LOOK() : PLAN() });
    const fail = F.agentWalkthroughReview({ mode: 'full', context: CTX, rooms: JSON.parse(JSON.stringify(ROOMS)) });
    has(fail.failed['Walk-in Closet'] || '', 'File not found', 'a photograph not in Drive fails its room by name');
    ok(!!fail.plan, '…and the plan is still written, that room from its notes');

    const R = gs({ reply: () => ({ code: 200, body: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Here is a plan…' }] } }) });
    const prose = R.agentWalkthroughReview({ mode: 'full', context: CTX, rooms: [{ name: 'Office 1', vol: 3, cplx: 3, photos: [] }] });
    has(prose.planError || '', 'prose', 'a plan answered in prose is a failure, said');
    eq(prose.plan, null, '…and no plan');

    const N = gs({ props: {} });
    has(N.agentWalkthroughReview({ rooms: ROOMS }).error || '', 'ANTHROPIC_API_KEY', 'no key is named');
    has(GS, "if (data.action === 'agentWalkthroughReview') { return jsonOut(agentWalkthroughReview(data)); }", 'the router reaches it');
    ok(/var BACKEND_ACTIONS = \[[\s\S]*?'agentWalkthroughReview'[\s\S]*?\];/.test(GS), 'the deployment says it has the action');
    has(GS, 'function testWalkthroughReview()', 'an editor probe times one call');
    // 2026-11-05b, Anthony's first run: the probe found no photo. It reads Estimates too (an older client's walkthrough photos file
    // there) and reads the room off the name the app writes, "<id> Walkthrough <room> <n>-<k>.jpg".
    const probe = (() => { const i = GS.indexOf('function testWalkthroughReview()'); return i < 0 ? '' : GS.slice(i, GS.indexOf('\n}\n', i)); })();
    has(probe, "nm === 'Estimates'", '⚠ the probe reads an older client folder\'s Estimates too');
    const reSrc = (/var m = (\/ Walkthrough [^;]*?\/)\.exec\(file\.getName\(\)\)/.exec(probe) || [])[1] || '';
    let roomOf = () => '';
    try { const re = eval(reSrc); roomOf = (n) => (re.exec(n) || [])[1] || ''; } catch (e) { /* the check below fails */ }
    const H = sandbox({ fns: ['_walkPhotoName'] });
    eq(roomOf(H._walkPhotoName({ hvlId: 'HVL-1' }, 'Living Room', '3-1')), 'Living Room', '⚠ the room is read off the name the app writes');
    eq(roomOf('HVL-1 Walkthrough Bedroom 2 1-4.jpg'), 'Bedroom 2', '…a room whose name ends in a number keeps it');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('C · the plan as text and back: an edit keeps the room links');
  {
    const A = sandbox({ fns: ['crewPlanSectionText', 'crewPlanText', 'crewPlanFromText'], vars: ['CREW_PLAN_SECTIONS'] });
    const plan = { context: ['Fact one.'], order: [{ step: 'Sort papers', room: 'Office 1', after: '', vendor: '' },
      { step: 'Donation run', room: '', after: 'Office 1', vendor: 'Donation Pickup' }, { step: 'Final walk', room: '', after: '', vendor: '' }],
      conditions: ['Mornings only.'], ifCant: ['Rain: closets.'], length: 'About 3 days.', rooms: [{ room: 'Office 1', lines: ['Shred pile.', 'Keep the tax files.'] }] };
    const order = A.crewPlanSectionText(plan, 'order');
    eq(order, 'Office 1: Sort papers\nAfter Office 1: Donation run (vendor: Donation Pickup)\nFinal walk', 'the order as lines');
    has(A.crewPlanText(plan), 'IF YOU CAN’T\nRain: closets.', 'the whole plan as text, section by section');
    const back = A.crewPlanFromText({ context: 'Fact one.', order: order + '\nwalk-in closet: Closets', conditions: 'Mornings only.', ifCant: 'Rain: closets.',
                                      length: 'About 3 days.', rooms: A.crewPlanSectionText(plan, 'rooms') + '\nAttic: nothing' },
                                    ['Office 1', 'Walk-in Closet']);
    eq(back.order[0], { step: 'Sort papers', room: 'Office 1', after: '', vendor: '' }, 'a room step parses back');
    eq(back.order[1], { step: 'Donation run', room: '', after: 'Office 1', vendor: 'Donation Pickup' }, 'a step riding with a room, and its vendor');
    eq(back.order[2].room + '|' + back.order[2].after, '|', 'a bare step has no room');
    eq(back.order[3].room, 'Walk-in Closet', 'a room typed in another case is the room, spelled as the estimate spells it');
    eq(back.rooms, [{ room: 'Office 1', lines: ['Shred pile.', 'Keep the tax files.'] }], '⚠ a line for a room not on the estimate (Attic) is dropped');
    eq(A.crewPlanFromText({ order: 'Kitchen: Pack it' }, ['Office 1']).order[0], { step: 'Kitchen: Pack it', room: '', after: '', vendor: '' },
       'a prefix that is no room stays part of the step');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('D · Next up moves on the room statuses a person already presses (Anthony: "Room statuses")');
  {
    const D = sandbox({ fns: ['crewStepDone', 'crewNextUp'], vars: ['TC_DONE_STATUSES', 'PS_DONE_STATUSES'] });
    const plan = { order: [{ step: 'Office', room: 'Office 1' }, { step: 'Donation run', after: 'Office 1' }, { step: 'Closet', room: 'Walk-in Closet' },
                           { step: 'Final walk' }, { step: 'Garage', room: 'Garage' }], conditions: ['Mornings only.'] };
    const st = (m) => (name) => m[name] || 'pending';
    const n0 = D.crewNextUp(plan, st({}));
    eq(n0.steps.map((o) => o.step), ['Office', 'Donation run'], 'nothing done: the first two steps');
    eq(n0.done + ' of ' + n0.total, '0 of 5', 'and the count');
    eq(D.crewNextUp(plan, st({ 'Office 1': 'locked' })).steps[0].step, 'Office', '⚠ a room locked is not done: its step passes once the room is cleared');
    const n1 = D.crewNextUp(plan, st({ 'Office 1': 'cleared' }));
    eq(n1.steps.map((o) => o.step), ['Closet', 'Final walk'], 'the office cleared: its step and the run riding with it pass');
    ok(!D.crewStepDone(plan, 3, st({ 'Office 1': 'cleared', 'Walk-in Closet': 'cleared' })), 'a step tied to no room waits…');
    ok(D.crewStepDone(plan, 3, st({ 'Office 1': 'cleared', 'Walk-in Closet': 'cleared', Garage: 'locked' })), '…until a later step\'s room is locked');
    eq(D.crewNextUp(plan, st({ 'Office 1': 'cleared', 'Walk-in Closet': 'cleared', Garage: 'cleared' })).steps.length, 0, 'every room cleared: nothing next');
    // ⚠ never a calendar: nothing in either reads a date.
    lacks(fn('crewNextUp') + fn('crewStepDone'), 'Date', '⚠ Next up reads no clock: work moves when the rooms do');

    const V = sandbox({ fns: ['crewPlanVendorBooked', '_srcLineKey', 'jobPrepLines'], stubs: { coPrepVendorLines: () => [] } });
    const est = { vendors: [{ type: 'Junk Removal', lid: 'a' }, { type: 'Donation Pickup', lid: 'b' }], prepItems: [] };
    const job = { vendorSourcing: { La: { status: 'Confirmed' }, Lb: { status: 'Quoted' } } };
    eq(V.crewPlanVendorBooked(job, est, 'junk removal'), true, 'a step\'s vendor confirmed on the Job Plan reads booked');
    eq(V.crewPlanVendorBooked(job, est, 'Donation Pickup'), false, '…one not confirmed, not booked yet');
    eq(V.crewPlanVendorBooked(job, est, 'Dumpster Rental'), null, '…one not on the estimate, nothing said');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('E · the writer, the answer applied, and the re-run over a person\'s edit');
  {
    const saved = [];
    const store = {};
    const E = sandbox({
      fns: ['crewPlanOf', '_crewPlanWrite', 'walkReviewApply', '_walkReviewLine', '_walkToneColor', 'crewPlanText', 'crewPlanSectionText',
            'walkReviewRun', 'walkReviewRefusal', 'walkReviewPayload', 'backendHas', '_crewViewRepaintFor'],
      vars: ['CREW_PLAN_NOTE_KEY', 'CREW_PLAN_SECTIONS', 'WALK_REVIEW_PHOTOS_PER_ROOM', 'WALK_REVIEW_WATCHDOG_MS', '_walkSug', '_walkReviewOut', '_walkReviewMsg', '_crewReplanDraft', '_crewView'],
      stubs: {
        jobPlanStore: store,
        getJobPlan: (id) => (store[id] = store[id] || { rooms: {} }),
        _planTouch: (p, k, key) => { p.at = p.at || {}; p.at[k + ':' + key] = 5; },
        saveJobPlan: (id) => saved.push(id),
        _invJob: (id) => ({ id: id, name: 'Rhea Calder', svc: 'downsizing', notes: 'Client tires after lunch.' }),
        _invStampBy: () => 'Anthony Graziano',
        walkSugPaint() {}, crewPlanRepaint() {}, walkReviewBarPaint() {},
        document: { getElementById: () => null },
        SHEETS_SYNC_URL: 'https://script.google.com/macros/s/X/exec',
        _backendActions: null,
        estimateApproved: false, estimateSubmitted: false,
        flushCalcAll() {},
        approvedEstimateFor: (id) => (id === 7 ? E.currentEstimate : null),
        estimateStore: {},
        currentEstimate: { svc: 'downsizing', tcCount: 1, psCount: 2, days: 3, privateNote: 'p', vendors: [{ type: 'Junk Removal' }], prepItems: [],
                           rooms: [{ name: 'Office 1', vol: 3, cplx: 3, note: 'n', photos: [{ fileId: 'f1' }, { fileId: 'f2' }, { fileId: 'f3' }, { fileId: 'f4' }, { fileId: 'f5' }] }] },
        estWorkingDays: (e) => e.days,
        svcLabelOf: () => 'Home Editing', isDecedentJob: () => false,
        standingFlagLines: () => [{ label: 'Pets', note: 'A dog in the yard.' }],
        walkReviewVendorChoices: () => ['Junk Removal', 'Dumpster Rental'],
        _withDeviceKey: (u) => u,
        setTimeout: () => 1, clearTimeout() {},
        alert: (m) => { E.alerts.push(m); },
        confirm: (m) => { E.confirms.push(m); return E.confirmAnswer; },
        fetch: (u, o) => { E.posts.push(JSON.parse(o.body)); return { then: () => ({ then: () => ({ catch() {} }) }) }; },
        _readAppsScriptJson: (r) => r,
      },
    });
    E.alerts = []; E.confirms = []; E.posts = []; E.confirmAnswer = true;
    const plan = { context: ['c'], order: [{ step: 's', room: 'Office 1' }], conditions: ['k'], ifCant: ['i'], length: 'l', rooms: [] };
    const rec = E._crewPlanWrite(7, plan, { edited: false, model: 'claude-fable-5-1' });
    eq(store[7].notes.crewPlan, rec, 'the plan is the job plan\'s notes.crewPlan');
    eq((store[7].at || {})['notes:crewPlan'], 5, '⚠ stamped notes:crewPlan, so the sheet\'s per-key merge of the plan\'s notes carries it');
    eq(saved, [7], '…and saved');
    ok(rec.edited === false && rec.madeBy === 'Anthony Graziano' && rec.model === 'claude-fable-5-1', 'the agent\'s, who pressed and which model');
    eq(E.crewPlanOf(7), rec, 'crewPlanOf reads it back');
    eq(E.crewPlanOf(8), null, 'and nothing for a client with none');
    const ed = E._crewPlanWrite(7, plan, { edited: true });
    ok(ed.edited === true && ed.editedBy === 'Anthony Graziano' && ed.madeAt === rec.madeAt, 'a person\'s edit is marked, the agent\'s writing kept');

    // Applying an answer.
    E.walkReviewApply(9, { ok: true, suggestions: [{ room: 'Office 1', field: 'vol', to: 5, why: 'boxes' }, { room: '', field: 'vol', to: 4 }],
                           plan: plan, planModel: 'm', failed: { Garage: 'File not found' } }, 'full');
    eq(E._walkSug[9].items.length, 1, 'the suggestions are held for the screen (one with no room dropped)');
    ok(!!E.crewPlanOf(9), 'the plan written');
    has(E._walkReviewMsg[9].text, '1 suggestion on the room rows', 'the line says what was found');
    has(E._walkReviewMsg[9].text, '1 room not looked at (Garage)', '…and names a room not looked at');
    E.walkReviewApply(10, { ok: true, suggestions: [], plan: plan, failed: {} }, 'check');
    eq(E.crewPlanOf(10), null, '⚠ a check-only run writes no plan');

    // The re-run over a person's edit (Anthony: "Ask, then replace").
    E.walkReviewRun(7, 'estimate');
    has(E.confirms[0] || '', 'You’ve edited this crew plan', 'over an edited plan the press asks first');
    eq(E.posts[0] && E.posts[0].mode, 'full', 'OK: the plan and the check');
    has(E.posts[0] && E.posts[0].plan, 'CONTEXT\nc', 'the plan as it stands is sent along');
    E.confirmAnswer = false; delete E._walkReviewOut[7];
    E.walkReviewRun(7, 'estimate');
    eq(E.posts[1] && E.posts[1].mode, 'check', '⚠ Cancel on Build Estimate: the estimate checked again, the plan kept');
    delete E._walkReviewOut[7];
    E.walkReviewRun(7, 'plan');
    eq(E.posts.length, 2, '⚠ Cancel on the Job Plan: nothing sent');
    E.confirmAnswer = true; delete E._walkReviewOut[7];
    E.walkReviewRun(7, 'plan', 'Anthony Jr cannot make it.');
    eq(E.posts[2] && E.posts[2].mode, 'plan', 'Re-plan from the Job Plan: the plan only');
    eq(E.posts[2] && E.posts[2].update, 'Anthony Jr cannot make it.', '…with what changed');
    eq(E._crewReplanDraft[7], 'Anthony Jr cannot make it.', 'what was typed is held while the run is out');
    eq(E._walkReviewOut[7] && E._walkReviewOut[7].update, 'Anthony Jr cannot make it.', '…on the run itself, for the window to show');
    E.walkReviewApply(7, { ok: true, suggestions: [], plan: plan, failed: {} }, 'plan', 'Anthony Jr cannot make it.');
    ok(!E._crewReplanDraft[7], '⚠ once the plan it asked for lands, the box empties');
    has(E._walkReviewMsg[7].text, 're-planned with: “Anthony Jr cannot make it.”', '…and the line says what went in');
    ok(E.posts[2] && E.posts[2].planEdited === true, '⚠ a plan a person edited goes marked so (only then may the agent cite it)');
    E._crewPlanWrite(7, plan, { edited: false }); delete E._walkReviewOut[7];
    E.walkReviewRun(7, 'plan', 'x');
    ok(E.posts[3] && E.posts[3].planEdited === false, '…and the agent\'s own plan goes marked as not a source');
    eq(E.posts[0].rooms[0].photos.length, 4, 'four photos a room at most');
    eq(E.posts[0].context.house, ['Pets: A dog in the yard.'], 'the house questions go along');
    eq(E.posts[0].context.vendorsOn, ['Junk Removal'], 'the vendor lines on the estimate');
    ok(E.walkReviewRun(7, 'estimate') === false && /being reviewed now/.test(E.alerts[E.alerts.length - 1] || ''), 'a second press while one is out is refused by name');
    E._backendActions = ['agentIdentify'];
    has(E.walkReviewRefusal({ id: 1 }, 'estimate'), 'needs the 2026-11-05 deployment', 'an older deployment is named');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('F · where it is drawn: the room rows, Next up in place of the generic block, the room, Home Prep; the backend lists');
  {
    const live = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    const jp = live(fn('renderJobPlan'));
    has(jp, "(_crewPlan ? '' : planProcedureHtml('p1', ctx))", '⚠ with a crew plan, How the sorting runs is not drawn');
    has(jp, "(_crewPlan ? crewNextUpHtml(jobId, job, est) : '') + roomsCard", '…and Next up heads In the house');
    has(live(fn('renderPrepJobPlan')), 'crewNextUpHtml(jobId, job, est)', 'Home Prep carries it too');
    has(live(fn('_paintRoomWorkspace')), 'crewPlanRoomHtml(jobId, room.name)', 'the room\'s lines inside the room');
    has(live(fn('calcAll')), "if (typeof walkSugPaint === 'function') walkSugPaint();", 'the suggestions follow every recompute');
    // 2026-11-05 (Anthony: "really kind of lost down here … it should be at the top, next to the start over button").
    const barAt = src.indexOf('<span id="walk-review-bar"'), soAt = src.indexOf('onclick="startEstimateOver()"'), svcAt = src.indexOf('<select id="e-svc"');
    ok(barAt > 0 && src.indexOf('id="walk-review-bar"', barAt + 10) < 0, 'one bar on Build Estimate');
    ok(soAt > 0 && barAt > 0 && barAt < soAt && soAt - barAt < 600 && barAt < svcAt, '⚠ the bar sits beside Start over, at the head of the screen, never under the rooms');
    const R = sandbox({ fns: ['crewPlanRoomHtml', 'crewPlanOf'], vars: ['CREW_PLAN_NOTE_KEY'],
      stubs: { jobPlanStore: { 7: { notes: { crewPlan: { v: 1, rooms: [{ room: 'Office 1', lines: ['Shred pile.'] }],
               order: [{ step: 'Donation run', after: 'Office 1' }] } } } }, esc: (x) => String(x) } });
    const rh = R.crewPlanRoomHtml(7, 'office 1');
    has(rh, '<details', '⚠ behind a press, never drawn open in the house');
    lacks(rh, '<details open', '…shut until pressed');
    has(rh, 'Shred pile.', 'the room\'s lines');
    has(rh, 'After this room: Donation run', 'and what rides with it');
    eq(R.crewPlanRoomHtml(7, 'Kitchen'), '', 'a room the plan says nothing of draws nothing');
    eq(R.crewPlanRoomHtml(8, 'Office 1'), '', 'a client with no plan draws nothing');
    ok(/var BACKEND_NEEDS = \[[^\]]*'agentWalkthroughReview'/.test(src), 'the app says it needs the action (the banner)');
    has(src, "agentWalkthroughReview: 'Review walkthrough cannot read the walkthrough photographs or write the crew plan',", '…and what is lost without it');
    // Never on a client paper.
    ['clientEstimateHtml', 'agreementHtml', 'invoiceHtml', 'signingPacketHtml'].forEach((b) => lacks(fn(b), 'crewPlan', `⚠ ${b} never reads the crew plan`));

    const W = sandbox({ fns: ['walkSugStanding'], vars: ['_walkSug'] });
    W._walkSug[7] = { items: [{ room: 'Office 1', field: 'vol', to: 5 }, { room: 'Closet', field: 'cplx', to: 4 }, { room: 'Yard', field: 'vendor', vendor: 'Junk Removal' },
                              { room: 'Den', field: 'vol', to: 2, used: true }, { room: 'Off', field: 'vol', to: 4 }] };
    const read = { row: (n) => ({ 'Office 1': 'r1', Closet: 'r2', Yard: 'r3', Den: 'r4', Off: 'r5' })[n],
                   state: (r) => (r === 'r5' ? 'off' : 'in'), score: (r, f) => (r === 'r2' ? 4 : 3), hasVendor: (t) => t === 'Junk Removal' };
    eq(W.walkSugStanding(7, read).map((x) => x.it.room), ['Office 1'], '⚠ only what still stands: not a score already where it points, a vendor on the estimate, one used, a room out of scope');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('G · the sheet\'s merge keeps the crew plan by its own stamp, with no redeploy');
  {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext([gsVar('PLAN_KEYED_MAPS'), gsFn('_planStamp'), gsFn('_mergePlanRecord')].join('\n'), ctx);
    const mine = { savedAt: 10, notes: { crewPlan: { v: 1, context: ['new'] } }, at: { 'notes:crewPlan': 9 } };
    const stale = { savedAt: 20, notes: { crewPlan: { v: 1, context: ['old'] } }, at: { 'notes:crewPlan': 2 }, rooms: { 0: { status: 'locked' } } };
    eq(ctx._mergePlanRecord(stale, mine).notes.crewPlan.context, ['new'], '⚠ the newer stamp wins the plan, though the other record saved later');
    eq(ctx._mergePlanRecord(mine, { savedAt: 30, notes: {}, at: {} }).notes.crewPlan.context, ['new'], 'a copy that never had it does not take it away');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  group('H · the plan from the record only: each line names its source, and one the job does not have is dropped');
  {
    // 2026-11-05f. Anthony, off the first live plan ("she sorts every room herself", rules about a son): "where are we just making
    // up these rules". He chose "Check it, don't show it".
    const S = gs();
    const L = (text, from) => ({ text: text, from: from });
    const has1 = S._awSourcesOf({ context: { privateNote: 'Landscaping in front. Clean out. Mulch.' }, rooms: [{ name: 'Office 1', note: '' }] }, { 'Office 1': 'Toys everywhere.' });
    eq(Object.keys(has1).sort(), ['photos', 'walkthrough note'], 'a job with a walkthrough note and photos has those two sources, no more');
    const p1 = S._awPlanOf({ context: [L('She sorts every room herself.', 'intake notes'), L('Mulch the front beds.', 'walkthrough note'),
                                       L('A dry day for the yard.', 'the work itself'), 'a bare string'],
                             conditions: [L('Her son must be out.', 'house questions'), L('A dry day for the yard and the beds.', 'the work itself')],
                             order: [], if_cant: [], length: '', rooms: [] }, ['Office 1'], has1);
    eq(p1.context, ['Mulch the front beds.'], '⚠ a context line citing intake notes the job does not have is dropped, the work itself is no context, a bare line has no source');
    eq(p1.conditions, ['A dry day for the yard and the beds.'], '⚠ a condition citing house questions the job does not have is dropped; the work itself may make one');
    eq(S._awPlanOf({ context: [L('x', 'what changed')], conditions: [], order: [], if_cant: [], length: '', rooms: [] }, [], S._awSourcesOf({ context: {}, update: 'Not the kitchen.' }, {})).context,
       ['x'], 'what the concierge typed in Something changed is a source');
    eq(S._awPlanOf({ context: [L('y', 'edited plan')], conditions: [], order: [], if_cant: [], length: '', rooms: [] }, [], S._awSourcesOf({ context: {}, plan: 'CONTEXT\ny', planEdited: false }, {})).context,
       [], '⚠ the agent\'s own earlier plan is never a source');
    eq(S._awPlanOf({ context: [L('y', 'edited plan')], conditions: [], order: [], if_cant: [], length: '', rooms: [] }, [], S._awSourcesOf({ context: {}, plan: 'CONTEXT\ny', planEdited: true }, {})).context,
       ['y'], '…a plan a person edited is');
    const tool = S._awPlanTool(['Office 1']);
    const props = tool.input_schema.properties;
    ok(props.context.items.required.join() === 'text,from' && props.context.items.properties.from.enum.indexOf('the work itself') < 0, 'context names its source, never the work itself');
    ok(props.conditions.items.properties.from.enum.indexOf('the work itself') >= 0, 'a condition may come from the work itself');
    const sys = S._awPlanSystem({});
    ok(!/\b(son|daughter|husband|wife|she|her|he|his)\b/i.test(sys), '⚠ no example about a person in the prompt, so none can leak into a plan');
    // 2026-11-05f (Anthony: "if we're just editing down the house … don't invent stuff and assume that we're moving everyone out").
    const ed = S._awPlanSystem({ service: 'Home Editing', newHome: false });
    has(ed, 'there is no move', '⚠ Home Editing: no move, nothing packed out or to storage beyond what she lets go');
    has(ed, 'No new home is recorded', '…and the plan is told there is no new home');
    has(ed, 'only where the service, the notes or what has changed say so, and then plan it fully', '…a pod or a move only where the notes say so, then planned fully');
    const tr = S._awPlanSystem({ service: 'Home Transition', newHome: true });
    has(tr, 'moving to a new home', 'Home Transition: the move');
    has(tr, 'A new home is recorded', '…with the new home recorded');
    eq(Object.keys(S.AGENT_WALK_SERVICE_SCOPE).sort(), ['Contested Probate Estate Settlement', 'Estate Settlement', 'Home Cleanout', 'Home Editing',
       'Home Prep for Sale', 'Home Transition', 'Probate Estate Settlement'], 'every service has its scope, named as the app names it');
    const LB = sandbox({ vars: ['SVC_LABELS'] });
    eq(Object.keys(LB.SVC_LABELS).map((k) => LB.SVC_LABELS[k]).sort(), Object.keys(S.AGENT_WALK_SERVICE_SCOPE).sort(), '⚠ …held to the app\'s SVC_LABELS');
    lacks(sys, 'when the client can make decisions', '…nor an invitation to make rules about the client');
    has(sys, 'Nothing about the client, the family or anyone in the house', 'nothing about the people unless the notes say it');
    has(sys, 'Never assume what happens in a room', 'no room assumed emptied or packed out');
    has(sys, 'confirm the room\'s scope with the client', '…its scope confirmed instead');
    has(sys, 'unless the notes or what has changed say Havellin takes it down itself', '⚠ the concierge taking the playset down wins over the vendor rule');
    has(sys, 'wins over anything else here', 'the notes and what changed win over the agent\'s rules');
    const pc = JSON.stringify(S._awPlanContent({ context: {}, rooms: [], plan: 'CONTEXT\nold' }, {}));
    has(pc, 'written by you earlier, never a source', 'the agent\'s earlier plan is sent as not a source');
    has(JSON.stringify(S._awPlanContent({ context: {}, rooms: [], plan: 'CONTEXT\nold', planEdited: true }, {})), 'a person edited it', '…a person\'s as one');
    has(GS, "var BACKEND_VERSION = '2026-11-05d';", 'the backend version moved');
  }
};
