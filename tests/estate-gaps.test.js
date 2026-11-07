'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE ESTATE REFERENCE'S LAST THREE GAPS (2026-11-07; Anthony, off Estate and Trust Settlement v2.0 and a Florida probate inventory
// report: "that sounds fine … the safes and lock containers, photo record of them closed plus a locks changed entry … donation over
// 5,000, that's fine too. If we have to get it appraised … let's just put them in there").
//   C  the estate package's Certification and Cover Sheet (probatePackageCoverHtml), first in the package the send builds;
//   S  a safe or locked container on Found on site: recorded and photographed closed, opened only with the representative or counsel
//      present and photographed open, or handed over unopened; flagged, never refused;
//   L  Locks changed on Keys & access: an entry of the log with no item, the locksmith's receipt filed, in the custody record;
//   D  donations recorded at more than $5,000: a flag beside the donation receipts and a sentence on the Donation Record.
// Driven through the real functions, lifted by their call closure; only the clock and the network are stubbed.
// ─────────────────────────────────────────────────────────────────────────────
const { sandbox, source, fn, decl } = require('./harness');

const SRC = source();
const ALL_FNS = new Set((SRC.match(/(^|\n)function\s+([A-Za-z0-9_$]+)\s*\(/g) || []).map((s) => s.replace(/^\n?function\s+/, '').replace(/\s*\($/, '')));
const ALL_VARS = new Set((SRC.match(/(^|\n)var\s+([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^\n?var\s+/, '').replace(/\s*=$/, '')));
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const live = (name) => fn(name).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
function closure(roots, stop) {
  const stopSet = new Set(stop || []), fns = new Set(), vars = new Set();
  const queue = roots.map((r) => ['f', r]);
  while (queue.length) {
    const [k, name] = queue.shift();
    if (stopSet.has(name)) continue;
    let body;
    if (k === 'f') { if (fns.has(name)) continue; fns.add(name); try { body = codeOnly(fn(name)); } catch (e) { continue; } }
    else { if (vars.has(name)) continue; vars.add(name); try { body = codeOnly(decl(name)); } catch (e) { continue; } }
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*[,)]/g)) if (ALL_FNS.has(m[1]) && !stopSet.has(m[1])) queue.push(['f', m[1]]);
    for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) if (ALL_VARS.has(m[1]) && !stopSet.has(m[1])) queue.push(['v', m[1]]);
  }
  return { fns: [...fns], vars: [...vars] };
}
const STATE = ['jobs', 'estimateStore', '_photoRefs', 'currentEstimate', 'vendors'];
function lift(roots, stubs) {
  const c = closure(roots, STATE.concat(Object.keys(stubs || {})));
  return sandbox({ fns: c.fns, vars: c.vars, stubs: Object.assign({ jobs: [], estimateStore: {}, _photoRefs: {}, currentEstimate: null, vendors: [],
    _todayStr: () => '2026-11-07', deviceUser: () => 'Ashley Jerome' }, stubs || {}) });
}
function attempt(f) { try { return { ok: true, val: f() }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }
const JOB = (o) => Object.assign({ id: 41, hvlId: 'HVL-0041', name: 'Margaret Doe', svc: 'probate', matterType: 'probate', docTier: 'values',
  executor: 'Thomas Doe', executorEmail: 'thomas@x.com', executorRole: 'Personal Representative', probateAttyName: 'Ann Lowe', probateAttyEmail: 'ann@lowe.law',
  probateCase: '50-2026-CP-000123', deathDate: '2026-06-01', addr: '100 Sample Lane', city: 'Palm Beach', tc: 'Ashley Jerome' }, o || {});

module.exports = function ({ group, ok, eq, has, lacks }) {
  group('C · the estate package opens with a Certification and Cover Sheet');
  {
    const S = lift(['probatePackageCoverHtml', 'probatePackageTitle'], { approvedEstimateFor: () => null });
    const pages = (job) => ['court', 'ledger', 'worklist'].map((k) => ({ key: k, title: S.probatePackageTitle(job, k) }));
    const pro = JOB(), tr = JOB({ matterType: 'trust', svc: 'cleanout', trustName: 'Doe Family Trust', trustDate: '2015-03-03' });
    const cp = attempt(() => S.probatePackageCoverHtml(pro, pages(pro), { today: '2026-11-07' }));
    const ct = attempt(() => S.probatePackageCoverHtml(tr, [{ key: 'trustee', title: 'Trust Schedule' }, { key: 'ledger', title: 'Disposition Ledger' }], { today: '2026-11-07' }));
    ok(cp.ok && ct.ok, 'it renders on probate and trust (' + (cp.err || ct.err || '') + ')');
    const p = cp.val || '', t = ct.val || '';
    has(p, 'Certification and Cover Sheet', 'headed by its name');
    has(p, '<strong>Court Inventory</strong>: the estate’s tangible personal property, scheduled for the §733.604 inventory filing', 'each page listed with what it is for');
    has(p, '<strong>Disposition Ledger</strong>: where each item went and what it brought', '…the ledger too');
    has(p, 'to support the Personal Representative&rsquo;s inventory under Fla. Stat. &sect;733.604, which the Personal Representative verifies and counsel serves and files. Havellin files nothing with the court.', 'probate: the use, and who files');
    has(t, '&sect;&sect;736.0813 and 736.08135. They are not an accounting.', 'trust: the trustee’s records, never an accounting');
    lacks(t, '733.604', '…and no probate filing on a trust');
    has(p, 'Each value is Havellin&rsquo;s estimate as of the date of death', 'the values are estimates, as of the date of death');
    has(p, 'A value is an appraisal only where an appraiser&rsquo;s report is noted against the item.', '…an appraisal only where noted');
    has(p, '<strong>Ashley Jerome</strong>, Transition Concierge, Havellin Palm Beach, LLC', 'certified by the job’s concierge, the name typed');
    has(p, 'prepared in good faith from Havellin&rsquo;s records as of Nov 7, 2026', 'in good faith, dated');
    const none = attempt(() => S.probatePackageCoverHtml(JOB({ docTier: 'none' }), [{ key: 'ledger', title: 'Disposition Ledger' }], { today: '2026-11-07' }));
    has(none.ok ? none.val : '', 'This engagement carries no values: valuation and any appraisal are arranged by counsel.', 'a tier with no values says so');
    lacks(p, '<strong>' + 'Certification and Cover Sheet' + '</strong>:', 'the cover does not list itself');
    has(live('sendProbatePackage'), "pages.unshift({ key: 'cover', title: PROBATE_PKG_COVER_TITLE, html: probatePackageCoverHtml(job, pages)", 'the send puts it first, over the pages it built');
    has(live('probatePackageDocPurpose'), "case 'cover':", 'and the email says what it is for');
  }

  group('S · a safe or locked container: photographed closed, opened with the representative or counsel present');
  {
    const S = lift(['siteFindRefusal', 'siteFindLines', 'siteFindPresentFlag', 'safeRecordHtml', '_siteFindRowHtml', 'siteFindsCardHtml'],
      { signedCopyControlHtml: (j, kind, spec, label) => '[file ' + kind + ': ' + label + ']', planDerivedHtml: () => '' });
    const base = { kind: 'safe', foundOn: '2026-11-05', where: 'primary closet', foundBy: 'Ashley Jerome', description: 'Wall safe, combination lock' };
    eq(S.siteFindRefusal({ kind: 'safe' }, 'new'), 'Enter the day it was found, who found it and what it is and how it is locked.', 'refused with nothing recorded, every gap named');
    eq(S.siteFindRefusal(base, 'new'), '', 'recorded with the day, who and what it is');
    has(S.siteFindRefusal(Object.assign({}, base), 'opened'), 'the day it was opened', 'an opening needs its day…');
    has(S.siteFindRefusal(Object.assign({}, base, { openedOn: '2026-11-06', openedBy: 'Pro Lock Co' }), 'opened'), 'who was present', '…who was present…');
    has(S.siteFindRefusal(Object.assign({}, base, { openedOn: '2026-11-06', openedBy: 'Pro Lock Co', present: 'Thomas Doe' }), 'opened'), 'what was inside', '…and what was inside');
    const opened = Object.assign({}, base, { id: 's1', openedOn: '2026-11-06', openedBy: 'Pro Lock Co', present: 'Thomas Doe; Ashley Jerome', contents: 'Deed to 100 Sample Lane\nGold coins (12)' });
    eq(S.siteFindRefusal(opened, 'opened'), '', 'a full opening is recorded');
    has(S.siteFindRefusal(Object.assign({}, opened, { handedOn: '2026-11-07', handedTo: 'Thomas Doe' }), 'handover'), 'It has been opened', 'an opened safe is not handed over unopened');
    const job = (finds, recs) => JOB({ siteFinds: finds, signedRecords: recs || [] });
    eq(S.siteFindPresentFlag(job([]), opened), '', 'the representative present: no flag');
    eq(S.siteFindPresentFlag(job([]), Object.assign({}, opened, { present: 'Ashley Jerome' })), 'opened without the representative or counsel recorded as present', 'Havellin alone: flagged, never refused');
    eq(S.siteFindPresentFlag(job([]), Object.assign({}, opened, { present: 'Ann Lowe' })), '', 'counsel present: no flag');
    const lines = (finds, recs) => S.siteFindLines(job(finds, recs), '2026-11-07').filter((l) => /^safe/.test(l.key));
    const l1 = lines([Object.assign({}, base, { id: 's0' })]);
    eq(l1.length, 1, 'one line a safe');
    eq(!!(l1[0] && !l1[0].ok && !l1[0].red), true, 'not yet opened: amber, never red');
    has(l1[0] && l1[0].detail, 'photograph it closed; open it only with the representative or counsel present', '…and it says what to do');
    const l2 = lines([opened]);
    has(l2[0] && l2[0].detail, 'photograph it closed and photograph it open', 'opened: both photographs owed');
    const recs = [{ id: 'r1', kind: 'safe_closed', ref: 's1', filedAt: 1 }, { id: 'r2', kind: 'safe_open', ref: 's1', filedAt: 2 }];
    eq(lines([opened], recs).map((l) => l.ok), [true], 'both photographs filed and the representative present: done');
    eq(lines([Object.assign({}, opened, { present: 'Ashley Jerome' })], recs).map((l) => l.ok), [false], 'filed, but opened without them: still flagged');
    const handed = Object.assign({}, base, { id: 's2', handedOn: '2026-11-07', handedTo: 'Thomas Doe' });
    eq(lines([handed], [{ id: 'r3', kind: 'safe_closed', ref: 's2', filedAt: 1 }]).map((l) => l.label + ':' + l.ok), ['Safe or locked container handed over unopened:true'], 'handed over unopened, photographed closed: done');
    const row = attempt(() => S._siteFindRowHtml(41, job([Object.assign({}, base, { id: 's0' })]), Object.assign({}, base, { id: 's0' })));
    has(row.ok ? row.val : row.err, '[file safe_closed: File photo: closed]', 'the row files the photograph of it closed');
    has(row.ok ? row.val : '', 'Record the opening', '…offers the opening');
    has(row.ok ? row.val : '', 'Handed over unopened', '…or the hand-over unopened');
    const rec = attempt(() => S.safeRecordHtml(job([]), opened));
    has(rec.ok ? rec.val : rec.err, 'Safe Opening Record', 'its record prints');
    has(rec.ok ? rec.val : '', '1. Deed to 100 Sample Lane<br>2. Gold coins (12)', '…listing what was inside');
    has(rec.ok ? rec.val : '', 'Thomas Doe, Ashley Jerome', '…and who was present');
    const card = attempt(() => S.siteFindsCardHtml(41, job([]), {}));
    has(card.ok ? card.val : card.err, 'Record a safe or locked container', 'the card offers it');
  }

  group('L · Locks changed on Keys & access: an entry with no item, the locksmith’s receipt filed');
  {
    const S = lift(['accessLocksRefusal', 'accessLines', 'accessItemState', 'accessCustodyRecordHtml', 'accessLocksChanges'], {});
    eq(S.accessLocksRefusal({ on: '', from: '', note: '' }, '2026-11-07'), 'Enter the day, who changed them and which locks or doors.', 'refused with nothing recorded');
    eq(S.accessLocksRefusal({ on: '2026-11-09', from: 'Pro Lock Co', note: 'front door' }, '2026-11-07'), 'The day cannot be after today: the log records what has happened.', 'a day after today refused');
    eq(S.accessLocksRefusal({ on: '2026-11-06', from: 'Pro Lock Co', note: 'front and garage doors' }, '2026-11-07'), '', 'recorded');
    const ev = { id: 'e9', itemId: 'locks', kind: 'locks_changed', on: '2026-11-06', from: 'Pro Lock Co', to: '', note: 'front and garage doors', recordedBy: 'Ashley Jerome', recordedAt: 1 };
    const item = { id: 'a1', kind: 'key', label: 'Front door', qty: 2, receivedOn: '2026-11-01', receivedFrom: 'Thomas Doe' };
    const recv = { id: 'e1', itemId: 'a1', kind: 'received', on: '2026-11-01', from: 'Thomas Doe', to: 'Ashley Jerome', recordedAt: 0 };
    const j = (recs) => JOB({ accessItems: [item], accessEvents: [recv, ev], signedRecords: recs || [] });
    eq(S.accessItemState(j(), item).holder, 'Ashley Jerome', 'a locks entry moves no item’s hands');
    const lk = (recs) => S.accessLines(j(recs), '2026-11-07').filter((l) => l.key === 'access_locks_e9');
    eq(lk().length, 1, 'a line for the locks changed');
    has(lk()[0] && lk()[0].detail, 'Pro Lock Co: front and garage doors &mdash; file the locksmith&rsquo;s receipt', 'naming the receipt owed');
    eq(lk([{ id: 'r1', kind: 'locksmith', ref: 'e9', filedAt: 1 }]).map((l) => l.ok), [true], 'the receipt filed: done');
    eq(S.accessLines(JOB({ accessItems: [], accessEvents: [ev] }), '2026-11-07').map((l) => l.key), ['access_locks_e9'], 'with no item on the card, the locks line alone');
    const rec = attempt(() => S.accessCustodyRecordHtml(j()));
    has(rec.ok ? rec.val : rec.err, 'Locks changed', 'the custody record carries it');
    has(rec.ok ? rec.val : '', 'front and garage doors', '…with which locks');
    has(live('saveAccessDialog'), 'var lwhy = accessLocksRefusal(lev, today);', 'the save asks the rule before it writes');
  }

  group('D · donations recorded at more than $5,000');
  {
    const S = lift(['donationAppraisalLine'], {});
    const L = (fmv, o) => Object.assign({ stableId: 'x' + fmv, disposition: 'Donate', fmv: fmv, channel: 'Goodwill' }, o || {});
    eq(S.donationAppraisalLine(JOB(), [L(3000), L(2000)]), null, 'exactly $5,000: nothing said');
    const l = S.donationAppraisalLine(JOB(), [L(3000), L(2500)]);
    eq(!!(l && !l.ok), true, 'over $5,000 with an unappraised line: flagged');
    has(l && l.detail, 'a qualified appraisal and IRS Form 8283 (IRC &sect;170(f)(11)): ask the estate’s tax adviser', 'naming the rule and who decides');
    has(S.donationAppraisalLine(JOB({ svc: 'home_cleanout', matterType: '' }), [L(6000)]).detail, 'the client’s tax adviser', 'a living client’s adviser');
    eq(S.donationAppraisalLine(JOB(), [L(3000, { valSource: 'Appraisal' }), L(2500, { valSource: 'Appraisal' })]).ok, true, 'every valued line appraised: done');
    eq(S.donationAppraisalLine(JOB(), [L(9000, { disposition: 'Sell' })]), null, 'a sale is not a donation');
    const v = /var DONATION_APPRAISAL_MIN = (\d+);/.exec(SRC);
    ok(!!v && /showVal && total > (\d+) \?/.exec(live('printDonationRecord'))[1] === v[1], 'the Donation Record’s literal is DONATION_APPRAISAL_MIN');
    has(live('printDonationRecord'), 'needs a qualified appraisal and IRS Form 8283 (IRC &sect;170(f)(11))', 'and the Donation Record says it');
    eq((SRC.split('\n').filter((x) => !x.trim().startsWith('//')).join('\n').match(/donationAppraisalLine\(job, /g) || []).length, 3, 'defined once and drawn beside the receipts twice: the Job Plan and the desk');
  }
};
