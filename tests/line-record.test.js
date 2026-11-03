'use strict';
// THE LINE'S RECORD, ANSWER FIRST (2026-11-02n; Anthony, off the record of seven cabbage-ware plates on a trust: "This whole thing is
// overwhelming … MAIV asset track trust exempt 732-402, all this stuff. I honestly have no idea", then "should things like condition
// just default? some of these decisions are not decisions at all"; he took Answer first and the rule). Each field of a line's record
// has one place, by the line and the job (_invRecPlace): what the app filled in is a sentence with its boxes folded under ✎ Correct
// what was filled in; the approval and the sale's papers only where they apply; the exceptions a person flags under Something unusual
// about this item?, open where one is set; a firearm's serial and NFA mark in view; what does not apply to the line is not drawn.
// Every check renders the real record (_renderInvPanel and everything it calls) and reads the page it draws.
//
//   R1 · the plates on a trust: facts in words, nothing that does not apply, the research folded
//   R2 · a probate estate filing a Form 706: the art mark under Correct, the family's exemption under the exceptions
//   R3 · a firearm: its serial and NFA mark in view, never folded
//   R4 · leaving the property: the approval, the sale's figures, the day and the receipt only where they apply
//   R5 · an exception that is set opens its fold; the matter's own default track is not an exception
//   R6 · every field holding a value is drawn, whatever its place
//   R7 · a living client: no estate fields, the promise in the desk's words, no approval on an everyday line
//   R8 · condition is the agents' grade or "as photographed", never a blank dash
//   R9 · the source: one place per field, the papers untouched

const { sandbox, source, fn, decl, domStub } = require('./harness');

const SRC = source();
const bare = (t) => String(t).split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const textOf = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/\\u2019/g, '’')
  .replace(/&#9998;/g, '✎').replace(/&sect;/g, '§').replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&#9888;/g, '⚠').replace(/\s+/g, ' ');
const attempt = (f) => { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } };

const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
function closure(roots, stop) {
  const stopSet = new Set(stop || []);
  const fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = bare(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = bare(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}
const STOP = ['jobs', '_photoRefs', 'estimateStore', 'jobPlanStore', 'vendorDirectory', 'document', 'window', 'SHEETS_SYNC_URL', '_invCloudSeen',
  '_invCloudFailed', 'savePhotoRefs', '_scheduleInventorySync', 'renderInventoryTab', 'showSyncBadge', '_todayStr', 'saveJobs', 'syncJobToSheets',
  '_invThumbHTML', 'setTimeout', 'clearTimeout', 'alert', 'invReadFirst', 'refreshPhotoRefs', 'fetch', '_estStoreState', '_avState', '_avAfter'];
let _cl = null;
function rig(job, rows) {
  _cl = _cl || closure(['_renderInvPanel', 'invRecFacts', '_invRecPlace', '_invPanelLabel', '_invRecOddOpen', '_invRecFoldSet'], STOP);
  return sandbox({ fns: _cl.fns, vars: _cl.vars, stubs: {
    jobs: [job], _photoRefs: { [job.id]: rows.map((r) => Object.assign({}, r)) },
    estimateStore: { [job.id]: { estimate: { svc: job.svc, rooms: [{ idx: 0, name: 'Kitchen' }, { idx: 1, name: 'Garage' }] } } },
    jobPlanStore: {}, vendorDirectory: [], document: domStub({}), window: { confirm: () => true },
    SHEETS_SYNC_URL: 'https://script.google.com/macros/s/REC/exec', _invCloudSeen: { [job.id]: true }, _invCloudFailed: {},
    savePhotoRefs() {}, _scheduleInventorySync() {}, renderInventoryTab() {}, showSyncBadge() {}, _todayStr: () => '2026-11-02n',
    saveJobs() {}, syncJobToSheets() {}, _invThumbHTML: () => '<i></i>', setTimeout: () => 1, clearTimeout() {}, alert() {},
    invReadFirst: () => false, refreshPhotoRefs() {}, fetch: () => ({ then() { return this; }, catch() { return this; } }),
    _estStoreState: 'ready', _avState: () => ({}), _avAfter: {},
  } });
}
const BASE = { id: 41, hvlId: 'HVL-2611-REC', name: 'Helen Ellison', addr: '1 Ocean Blvd', city: 'Palm Beach', deathDate: '2026-08-14',
  gate706: 'no', docTier: 'values', status: 'active', activatedOn: '2026-09-01', won: true, executor: 'Thomas Ellison', executorEmail: 't@x.com',
  executorRole: 'Successor Trustee', tc: 'Ashley Jerome', docState: {}, at: {}, appraisers: [], driveFolder: 'ROOT41' };
const JOBS = {
  trust:   Object.assign({}, BASE, { svc: 'cleanout', matterType: 'trust', trustName: 'Ellison Family Trust', trustDate: '2015-03-03' }),
  probate: Object.assign({}, BASE, { svc: 'probate', matterType: 'probate', gate706: 'yes', executorRole: 'Personal Representative', probateCase: '50-2026-CP-1' }),
  neither: Object.assign({}, BASE, { svc: 'cleanout', matterType: 'neither' }),
  living:  Object.assign({}, BASE, { svc: 'downsizing_move', name: 'Robert Hale', deathDate: '', gate706: '', docTier: '', executor: '', executorEmail: '',
    executorRole: '', clientEmail: 'r@hale.com', destAddr: '9 Ocean Ave' }),
};
// The plates as Anthony saw them: Agent Two's low figure from three Etsy prices, Undecided, nothing flagged.
const PLATES = (o) => Object.assign({ stableId: 'pl', label: 'inventory', itemNo: 41, objectName: 'Green cabbage-ware crescent side plates',
  category: 'General/Household', roomIdx: 0, disposition: 'Undecided', qty: 7, fmv: 75, valLow: 45, valHigh: 120, valuedBy: 'agent', valConf: 'low',
  valSource: 'Online comps', valDate: '2026-08-14', valNote: 'Etsy asking prices run about $35 to $60 a piece.', namedBy: 'agent',
  driveFileUrl: 'https://drive.google.com/file/d/PL/view', driveFileId: 'PL', updatedAt: 1, ts: 1,
  valComps: [{ kind: 'asking', price: 180, title: 'Bordallo Pinheiro luncheon plates', url: 'https://www.etsy.com/listing/1', venue: 'Etsy' }],
  valLookup: 'Portuguese cabbage ware crescent salad plate', valNotices: [{ kind: 'other', text: 'Check the mark on the underside.' }] }, o || {});
const render = (C, job, sid) => attempt(() => C._renderInvPanel(job, C._photoRefs[job.id].find((r) => r.stableId === sid)));
// A part of the record by its class: the ✎ Correct fold, the exceptions' fold, Leaving the property, the facts.
const part = (h, cls) => {
  const i = h.indexOf('class="' + cls + '"');
  if (i < 0) return '';
  const tag = h.lastIndexOf('<', i), name = /^<(\w+)/.exec(h.slice(tag))[1];
  let depth = 0, j = tag;
  const re = new RegExp('<(/?)' + name + '\\b', 'g');
  re.lastIndex = tag;
  let m;
  while ((m = re.exec(h))) { depth += m[1] ? -1 : 1; if (!depth) { j = h.indexOf('>', m.index) + 1; break; } }
  return h.slice(tag, j);
};
const labels = (h) => [...String(h).matchAll(/class="inv-rec-f"[^>]*><div[^>]*>([^<]*)<\/div>/g)].map((m) => textOf(m[1]).trim());

module.exports = function ({ group, ok, eq, has, lacks }) {
  group('⚠⚠ R1 · the plates on a trust: what the app filled in is a sentence, nothing that does not apply is drawn, the research is folded');
  {
    const C = rig(JOBS.trust, [PLATES()]);
    const r = render(C, JOBS.trust, 'pl');
    ok(r.ok, 'the record renders' + (r.ok ? '' : ': ' + r.err));
    const h = String(r.val || ''), t = textOf(h);
    has(textOf(part(h, 'inv-rec-facts')), 'Kitchen · General/Household · condition as photographed', '⚠ the room, the category and the condition, in a sentence');
    has(textOf(part(h, 'inv-rec-facts')), 'Valued as of Aug 14, 2026 · Online comps · trust property', '…and the value\'s date and source, and whose property it is');
    ['MAIV', 'Form 706', '§732.402', 'NFA', 'Photo Link', 'Asset Track', 'Gross Proceeds', 'Date of Disposition', 'Receipt / Doc', 'Authorized By', 'Approval Date',
      'Approved by', 'Sold for', 'Serial Number']
      .forEach((w) => lacks(t, w, '⚠ nothing on the record of an Undecided plate on a trust with no Form 706 reads "' + w + '"'));
    const fix = labels(part(h, 'inv-rec-fix'));
    ['Category', 'Room', 'Condition', 'Valued as of', 'Where the value came from', 'What the value rests on'].forEach((l) => ok(fix.indexOf(l) >= 0, '✎ Correct holds ' + l));
    ok(!/<details class="inv-rec-fix" open[ >]/.test(h) && /<details class="inv-rec-fix"/.test(h), '⚠ …folded shut');
    const odd = part(h, 'inv-rec-odd');
    ok(!/<details class="inv-rec-odd" open[ >]/.test(h) && /<details class="inv-rec-odd"/.test(h), '⚠ Something unusual about this item? is shut: nothing on the plates is unusual');
    eq(labels(odd), ['Serial number', 'Send to an appraiser', 'Appraiser or report', 'Left to someone by name in the trust', 'The family disagrees about it', 'Belongs to'],
      'its exceptions, in plain words, the bequest named for the trust');
    eq(part(h, 'inv-rec-go'), '', '⚠ no Leaving the property on an Undecided line: no approval, no sale, no receipt');
    ok(/<details class="av-research"/.test(h) && !/<details class="av-research" open[ >]/.test(h), '⚠ the comparables and the WorthPoint search are under See the research, shut');
    has(textOf(part(h, 'av-research')), 'See the research (1 price)', 'its summary says what is in it');
    has(textOf(part(h, 'av-research')), 'WorthPoint search', '…the WorthPoint search inside it');
    lacks(h, '>Photograph</a>', 'the photograph link beside the search is gone: the photograph at the top opens it');
    has(t, 'To do Look at this · Check the mark on the underside.', '⚠ Agent Two\'s note under To do');
    has(t, 'What it’s worth · Agent Two $75', 'the figure first');
    ok(t.indexOf('$75') < t.indexOf('Kitchen · General/Household'), '…before the facts');
    ok(t.indexOf('Kitchen · General/Household') < t.indexOf('Something unusual about this item?'), '…and the exceptions last');
  }

  group('R2 · a probate estate filing a Form 706: the art mark under Correct, the family\'s exemption under the exceptions, the will named');
  {
    const art = PLATES({ stableId: 'oil', objectName: 'Oil on canvas, harbour scene', category: 'Art & Décor', fmv: 4200, valNotices: [] });
    const C = rig(JOBS.probate, [art]);
    const h = String(render(C, JOBS.probate, 'oil').val || '');
    const fix = labels(part(h, 'inv-rec-fix'));
    ok(fix.indexOf('Art on the estate tax return (Form 706)') >= 0 && fix.indexOf('Kind of art (Form 706)') >= 0, '⚠ the Form 706 marks under ✎ Correct, where a return is filed');
    has(textOf(part(h, 'inv-rec-facts')), 'in the probate estate · counts toward the Form 706 art total', 'the sentence says so');
    const odd = labels(part(h, 'inv-rec-odd'));
    ok(odd.indexOf('Kept by the family as exempt property (§732.402)') >= 0, 'the exemption, on the probate track, among the exceptions');
    ok(odd.indexOf('Left to someone by name in the will') >= 0, 'a bequest named for the will');
    // The same painting on a trust: no exemption, no 706 marks.
    const T = rig(JOBS.trust, [art]);
    const th = textOf(String(render(T, JOBS.trust, 'oil').val || ''));
    lacks(th, '§732.402', '⚠ off the probate track the exemption is not drawn');
    lacks(th, 'Form 706', '…nor, with no return filed, the art marks');
    // A matter of Neither: no "probate estate" claimed in the sentence.
    const N = rig(JOBS.neither, [art]);
    lacks(textOf(part(String(render(N, JOBS.neither, 'oil').val || ''), 'inv-rec-facts')), 'probate estate', '⚠ a Neither matter is never said to be in a probate estate');
  }

  group('⚠ R3 · a firearm: its serial and NFA mark in view, never folded');
  {
    const gun = PLATES({ stableId: 'g', objectName: 'Remington 870 shotgun', category: 'Firearms', fmv: 400, valNotices: [], disposition: 'Hold' });
    const C = rig(JOBS.trust, [gun]);
    const h = String(render(C, JOBS.trust, 'g').val || '');
    const facts = part(h, 'inv-rec-facts');
    const main = facts.replace(part(h, 'inv-rec-fix'), '');
    eq(labels(main), ['Serial number', 'NFA item (federally registered)'], '⚠ in view, outside both folds');
    lacks(labels(part(h, 'inv-rec-odd')).join('|'), 'Serial number', 'not again among the exceptions');
    const car = PLATES({ stableId: 'c', objectName: 'Mercedes sedan', category: 'Vehicles & Watercraft', valNotices: [] });
    const V = rig(JOBS.trust, [car]);
    const vh = String(render(V, JOBS.trust, 'c').val || '');
    eq(labels(part(vh, 'inv-rec-facts').replace(part(vh, 'inv-rec-fix'), '')), ['Serial number'], 'a vehicle\'s serial (its VIN) in view too, with no NFA mark');
  }

  group('R4 · leaving the property: the approval, the sale\'s figures, the day and the receipt, only where they apply');
  {
    const sold = PLATES({ stableId: 's', disposition: 'Auction', channel: 'Kodner Galleries', valNotices: [] });
    const gift = PLATES({ stableId: 'd', disposition: 'Donate', channel: 'Goodwill', valNotices: [] });
    const kept = PLATES({ stableId: 'k', disposition: 'Keep', valNotices: [] });
    const signed = PLATES({ stableId: 'a', disposition: 'Keep', authBy: 'Thomas Ellison', approvalDate: '2026-10-01', valNotices: [] });
    const C = rig(JOBS.trust, [sold, gift, kept, signed]);
    const go = (sid) => labels(part(String(render(C, JOBS.trust, sid).val || ''), 'inv-rec-go'));
    eq(go('s'), ['Approved by', 'Sold for', 'Fees', 'Net', 'Date it left', 'Receipt'], '⚠ a sale: its approval, its figures, the day it left and its receipt');
    eq(go('d'), ['Approved by', 'Date it left', 'Receipt'], 'a donation: no sale figures');
    eq(go('k'), [], '⚠ a kept line: nothing at all');
    eq(go('a'), ['Approved by'], 'a kept line carrying an approval keeps it in view, with its date in the line');
    has(textOf(String(render(C, JOBS.trust, 'a').val || '')), 'Thomas Ellison (Oct 1, 2026)', '…the date read in the approval');
    lacks(go('s').join('|'), 'Approved on', 'the date is never a field of its own');
    // Who takes it, on a line whose row has no box for it, only where a name is left there.
    const left = PLATES({ stableId: 'l', disposition: 'Undecided', channel: 'Marie Delgado', valNotices: [] });
    const L = rig(JOBS.trust, [left, kept]);
    eq(labels(part(String(render(L, JOBS.trust, 'l').val || ''), 'inv-rec-go')), ['Who takes it'], 'a name left in Who takes it is shown, so it can be put right');
  }

  group('R5 · an exception that is set opens its fold; the matter\'s own default track is not one');
  {
    const open = (job, o) => /<details class="inv-rec-odd" open/.test(String(render(rig(job, [PLATES(Object.assign({ valNotices: [] }, o))]), job, 'pl').val || ''));
    ok(!open(JOBS.trust, {}), 'nothing set: shut');
    ok(open(JOBS.trust, { flagDisputed: true }), '⚠ a dispute: open');
    ok(open(JOBS.trust, { flagBequest: true }), 'a bequest: open');
    ok(open(JOBS.trust, { needsAppr: true }), 'sent to an appraiser: open');
    ok(open(JOBS.trust, { serial: 'AB123' }), 'a serial recorded: open');
    ok(open(JOBS.trust, { assetTrack: 'Non-probate' }), '⚠ a line outside the trust: open');
    ok(!open(JOBS.trust, { assetTrack: 'Trust' }), '…but the matter\'s own track, set by hand, is no exception');
    ok(open(JOBS.probate, { flagExempt: true }), 'the family\'s exemption claimed: open');
    // A person's choice wins both ways, through every redraw (the session's _invRecFold).
    const C = rig(JOBS.trust, [PLATES({ flagDisputed: true })]);
    C._invRecFoldSet('pl', 'fix', true); C._invRecFoldSet('pl', 'research', true); C._invRecFoldSet('pl', 'odd', false);
    const h = String(render(C, JOBS.trust, 'pl').val || '');
    ok(/<details class="inv-rec-fix" open[ >]/.test(h), '⚠ ✎ Correct, opened by a person, is drawn open');
    ok(/<details class="av-research" open[ >]/.test(h), 'See the research, likewise');
    ok(!/<details class="inv-rec-odd" open[ >]/.test(h), '…and the exceptions, shut by a person, stay shut over a dispute that would open them');
    has(h, 'ontoggle="_invRecFoldSet(\'pl\',\'fix\',this.open)"', 'each fold remembers a person\'s choice');
  }

  group('⚠⚠ R6 · every field holding a value is drawn, whatever its place');
  {
    const full = PLATES({ stableId: 'f', category: 'Art & Décor', disposition: 'Sell', channel: 'Kodner', serial: 'S1', needsAppr: true, apprDoc: 'Report 7',
      flagMAIV: 'yes', maivCat: 'Painting', flagExempt: true, flagBequest: true, flagDisputed: true, flagNFA: true, assetTrack: 'Homestead',
      authBy: 'Thomas Ellison', approvalDate: '2026-10-01', gross: 500, fees: 50, dispDate: '2026-10-09', receiptDoc: 'R-1', condition: 'Good' });
    [['trust', JOBS.trust], ['neither', JOBS.neither], ['probate', JOBS.probate]].forEach(([m, job]) => {
      const C = rig(job, [full]);
      const h = String(render(C, job, 'f').val || '');
      const drawn = labels(h);
      const cols = C._invPanelColsFor(job, C._photoRefs[job.id][0]).filter((c) => C._invPanelColShown(job, C._photoRefs[job.id][0], c));
      const missing = cols.filter((c) => c.key !== 'driveFileUrl' && drawn.indexOf(C._invPanelLabel(job, c)) < 0).map((c) => c.key);
      eq(missing, [], m + ': ⚠ every field the line holds a value in is drawn somewhere on its record');
    });
  }

  group('R7 · a living client: no estate fields, the promise in the desk\'s words, no approval on an everyday line');
  {
    const sofa = PLATES({ stableId: 'v', objectName: 'Sofa', category: 'Furniture', disposition: 'Sell', channel: 'Estate Sale Co', valNotices: [], valSource: '' });
    const C = rig(JOBS.living, [sofa]);
    const h = String(render(C, JOBS.living, 'v').val || ''), t = textOf(h);
    has(textOf(part(h, 'inv-rec-facts')), 'Kitchen · Furniture · condition as photographed', 'the facts sentence');
    ['Valued as of', 'Belongs to', 'Form 706', '§732.402', 'Approved by', 'will or trust'].forEach((w) => lacks(t, w, 'living: no "' + w + '"'));
    ok(labels(part(h, 'inv-rec-odd')).indexOf('Promised to someone') >= 0, 'the promise, in the desk\'s words');
    eq(labels(part(h, 'inv-rec-go')), ['Sold for', 'Fees', 'Net', 'Date it left', 'Receipt'], '⚠ a living sale on the client\'s word: its figures, no approval');
    const gun = PLATES({ stableId: 'w', objectName: 'Remington 870', category: 'Firearms', disposition: 'Sell', channel: '', valNotices: [] });
    const G = rig(JOBS.living, [gun]);
    ok(labels(part(String(render(G, JOBS.living, 'w').val || ''), 'inv-rec-go')).indexOf('Approved by') >= 0, 'a living firearm, which needs the client\'s written approval: shown');
  }

  group('R8 · condition is the agents\' grade or "as photographed", never a blank dash');
  {
    const C = rig(JOBS.trust, [PLATES({ condition: 'Good', condBy: 'agent', valNotices: [] }), PLATES({ stableId: 'p2', condition: 'Fair', condBy: 'desk', valNotices: [] })]);
    has(textOf(part(String(render(C, JOBS.trust, 'pl').val || ''), 'inv-rec-facts')), 'Good condition, graded from the photo', 'an agent\'s grade says where it came from');
    has(textOf(part(String(render(C, JOBS.trust, 'p2').val || ''), 'inv-rec-facts')), 'Fair condition', 'a person\'s grade');
    lacks(textOf(part(String(render(C, JOBS.trust, 'p2').val || ''), 'inv-rec-facts')), 'graded from the photo', '…said as theirs');
  }

  group('R9 · the source: one place per field, the papers untouched');
  {
    const body = bare(fn('_renderInvPanel'));
    has(body, '_invRecPlace(', 'the record places each field through the one rule');
    has(body, '_invPanelLabel(', 'and names it through the one namer');
    lacks(body, '_invColHeader(', 'never the catalogue\'s header, which the papers keep');
    has(bare(fn('_invPanelLabel')), '_invColHeader(', 'the namer falls back on the catalogue (Promised to someone, P14)');
    lacks(bare(fn('buildInventoryCSV')), '_invPanelLabel', '⚠ the CSV keeps the catalogue\'s headers');
    ok(!/\bfunction _invPanelSection\b|\b_invPanelSectionLabel\b/.test(SRC), 'the old sections\' functions are gone');
  }
};
