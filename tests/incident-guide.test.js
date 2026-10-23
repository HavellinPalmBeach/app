'use strict';
// The incident guide (2026-10-19; Anthony: "create an .html 'incident report guide' and link it to the app"): `incident-guide.html`,
// *Reporting an Incident*, in the stage guides' shape (P27), in plain words, with a pocket card, linked from the Incidents card on
// the Job Plan through the one opener (guideLinkHtml → openGuidePage, over the app, never a new tab) and from the playbook.
//
// Each sentence on the page that the app makes true is held here to the code (the photography guide's rule), so a change to the
// kinds, the number, the hotline, the $500 floor, the deadlines or a button's name goes red until the page is updated in the same
// commit. The last group nets the build's shorthand out of the page.

const fs = require('fs');
const path = require('path');
const { sandbox, source, fn, decl, domStub } = require('./harness');

const ROOT = path.join(__dirname, '..');
const PAGE = 'incident-guide.html';
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = source();
const codeOnly = (t) => t.split('\n').filter((l) => !l.trim().startsWith('//')).map((l) => l.replace(/\s\/\/\s.*$/, '')).join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;
const text = (html) => String(html)
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, '’').replace(/&ldquo;|&rdquo;/g, '"')
  .replace(/&middot;/g, '·').replace(/&sect;/g, '§').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1');

module.exports = function ({ group, ok, eq, has, lacks }) {
  const html = read(PAGE), t = text(html);

  // ═══ THE PAGE ═══
  group('the page: a Field Guide in the stage guides’ shape, short, with a pocket card, naming its neighbours and the playbook');
  {
    has(html, '<title>Reporting an Incident &middot; Havellin Palm Beach</title>', 'titled');
    has(html, '<h1>Reporting an Incident</h1>', 'headed');
    has(html, '<div class="wrap">', 'the field guide’s page column');
    has(html, 'class="eyebrow">Havellin Palm Beach &middot; Field Guide</p>', 'a Field Guide');
    has(html, 'Pocket card &middot; print it and keep it in the kit', 'ends with a pocket card');
    eq(count(html, '<section class="card">'), 1, 'one card');
    ok(count(html, '<h2>') >= 8, 'at least eight sections (' + count(html, '<h2>') + ')');
    const words = t.split(/\s+/).length;
    ok(words < 2100, 'short: ' + words + ' words (seven kinds, one page)');
    ['sorting-guide.html', 'packing-guide.html', 'move-day-guide.html', 'first-night-guide.html', 'photography-guide.html', 'firearms-protocol.html', 'concierge-guide.html']
      .forEach((f) => has(html, '<a href="' + f + '">', 'names ' + f));
    has(t, 'Linked from the Incidents card on the Job Plan', 'and says where the app links it');
    has(t, 'In the app Job Plan, In the house, the Incidents card', 'the masthead says where the card is');
    // The stylesheet is the stage guides’ own (one shape, four tokens the dark theme redefines), so the page prints as they do.
    const css = (f) => { const s = read(f); return s.slice(s.indexOf('<style>'), s.indexOf('</style>')); };
    eq(css(PAGE), css('move-day-guide.html'), 'the stylesheet is Move Day’s, byte for byte');
    eq(count(html, 'type="checkbox"'), 0, '⚠ nothing to tick on the page');
  }

  // ═══ THE LINK IN THE APP ═══
  group('the app links it from the Incidents card, on every service and in every state, through the one opener');
  {
    eq(decl('INCIDENT_GUIDE_DOC').trim(), "var INCIDENT_GUIDE_DOC = 'incident-guide.html';", 'one constant names the page');
    ok(fs.existsSync(path.join(ROOT, 'incident-guide.html')), 'which exists');
    const dom = domStub({});
    const c = sandbox({
      vars: ['INCIDENT_KINDS', 'INCIDENT_KIND_ORDER', 'INCIDENT_ACTS', 'INCIDENT_ALERT_TO', 'INCIDENT_CARRIER_FLOOR', 'INCIDENT_HOTLINE', 'INCIDENT_DOC_KEY',
             'INCIDENT_GUIDE_DOC', 'INCIDENT_RECORD_TITLE', 'INCIDENT_INTERNAL_TITLE', '_incidentPhotoSpecs', '_incidentPhotoKeys', 'DECEDENT_SERVICES'],
      fns: ['incidentsCardHtml', '_incidentRowHtml', '_incHowWord', 'incidentPhotoControlHtml', 'incidentReportsOf', 'incidentUpdatesOf', 'incidentNo', 'incidentStatus',
            'incidentAlertOwed', 'incidentHasAct', 'incidentHotlineCalled', 'incidentLines', 'incidentDayPlus', '_incTime', '_incWhen', '_incStampTxt', 'derivedLinesHtml',
            'guideLinkHtml', 'openGuidePage', 'closeGuidePage', 'jobListEntries', 'jobListGet', 'isDecedentJob', 'esc', 'escLines', 'fmt', 'fmtDate2', '_ymdLocal', 'roundCents'],
      stubs: { document: dom, _todayStr: () => '2026-10-19', invFiduciaryMode: (job) => !!(job && job.svc === 'cleanout') },
    });
    const link = '<a href="incident-guide.html" rel="noopener" onclick="return openGuidePage(event, this.getAttribute(\'href\'), this.textContent)">Read Reporting an Incident &rarr;</a>';
    const living = { id: 7, svc: 'downsizing_move', incidents: [] };
    const card = c.incidentsCardHtml(7, living, {});
    eq(count(card, link), 1, 'a living client’s card carries the link once, after the note');
    ok(card.indexOf(link) > card.indexOf('A vulnerable adult concern stays internal'), '…under the note, never a step');
    lacks(card, 'target="_blank"', '⚠ nothing on the card opens a new tab');
    eq(count(c.incidentsCardHtml(8, { id: 8, svc: 'cleanout', incidents: [] }, {}), link), 1, 'an estate’s card too');
    eq(count(c.incidentsCardHtml(9, { id: 9, svc: 'prep', incidents: [] }, {}), link), 1, 'and a Home Prep’s');
    // With an incident recorded (the state the page is needed in most) the link is still on screen.
    const busy = { id: 7, svc: 'downsizing_move', incidents: [
      { id: 'i1', entry: 'report', kind: 'injury', occurredOn: '2026-10-19', where: 'Garage', what: 'A fall', reportedBy: 'Ashley Jerome', recordedBy: 'Ashley Jerome', recordedAt: 1, f1: 'A specialist' }] };
    const busyCard = c.incidentsCardHtml(7, busy, {});
    eq(count(busyCard, link), 1, 'with an open injury the link is still there');
    has(busyCard, 'CALL ANTHONY IMMEDIATELY', '…beside the red alert');
    // The click goes to the panel, headed by the page’s name.
    const ev = { prevented: 0, preventDefault() { this.prevented++; } };
    eq(c.openGuidePage(ev, 'incident-guide.html', 'Read Reporting an Incident →'), false, 'the click is taken by the panel');
    eq(dom.getElementById('guide-title').textContent, 'Reporting an Incident', 'headed Reporting an Incident');
    eq(dom.getElementById('guide-frame').getAttribute('src'), 'incident-guide.html', 'with the page in the frame');
    c.closeGuidePage();
    // The card is drawn by the one function on every plan renderer (held by incidents.test.js); the link rides it.
    has(codeOnly(fn('incidentsCardHtml')), "guideLinkHtml(INCIDENT_GUIDE_DOC, 'Read Reporting an Incident')", 'the card reads the constant through the opener');
  }

  // ═══ THE SENTENCES THE APP MAKES TRUE ═══
  group('each sentence on the page that the app makes true is held to the code');
  {
    const c = sandbox({ vars: ['INCIDENT_KINDS', 'INCIDENT_KIND_ORDER', 'INCIDENT_ACTS', 'INCIDENT_ALERT_TO', 'INCIDENT_CARRIER_FLOOR', 'INCIDENT_HOTLINE', 'INCIDENT_SUBFOLDER', 'INCIDENT_RECORD_TITLE', 'INCIDENT_INTERNAL_TITLE'], fns: ['fmt', 'roundCents'] });
    // The seven kinds, by their labels, and which of them alert.
    c.INCIDENT_KIND_ORDER.forEach((k) => has(t, c.INCIDENT_KINDS[k].label, 'the table names ' + c.INCIDENT_KINDS[k].label));
    eq(c.INCIDENT_KIND_ORDER.filter((k) => c.INCIDENT_KINDS[k].alert).map((k) => c.INCIDENT_KINDS[k].label), ['Injury', 'Missing item', 'Vulnerable adult concern'], 'the three alert kinds');
    has(t, 'An injury, a missing item or a worry about an older person in the house: call Anthony at once, ' + c.INCIDENT_ALERT_TO.phone + '.', 'the first ten minutes say to call, with the number the banner prints');
    eq(count(t, c.INCIDENT_ALERT_TO.phone), 2, 'the number appears twice: the first ten minutes and the pocket card');
    has(t, 'CALL ANTHONY IMMEDIATELY', 'the banner’s words');
    has(codeOnly(fn('incidentHeaderHtml')), 'CALL ANTHONY IMMEDIATELY', 'which the header prints');
    has(t, 'An incident Anthony records on his own device owes no call.', 'Anthony’s own device');
    has(codeOnly(fn('saveIncident')), "how: 'self'", 'which the save records as self');
    has(t, 'The app sends nothing on its own: no text, no email.', 'the app sends nothing (Q64)');
    // The kinds’ own questions, in the kinds’ words.
    has(t, 'Who was hurt; was medical help called', 'injury’s two');
    eq([c.INCIDENT_KINDS.injury.f1, c.INCIDENT_KINDS.injury.yn], ['Who was hurt', 'Medical help called?'], '…as the dialog asks them');
    has(t, 'The item (its inventory number where it has one) and a rough value', 'damage’s two');
    eq(c.INCIDENT_KINDS.damage.f1, 'The item (its inventory number where it has one)', '…as the dialog asks');
    has(t, 'when and where it was last seen', 'missing’s second');
    eq(c.INCIDENT_KINDS.missing.f2, 'When and where it was last seen', '…as the dialog asks');
    has(t, 'Where it is now and how it is secured; who was told', 'the valuable’s two');
    has(t, 'whether work stopped in that area', 'the hazard’s second');
    eq(c.INCIDENT_KINDS.hazard.yn, 'Work stopped in that area?', '…as the dialog asks');
    has(t, 'Who complained and how it reached us; what they asked for', 'the complaint’s two');
    has(t, 'What was observed; was the Florida Abuse Hotline called', 'the concern’s two');
    // The property damage promises: the agreement’s §6.3, the floor and the two deadlines, each with the press that records it.
    const agr = codeOnly(fn('probateAgreementHtml'));
    has(agr, "'Notify ' + _agrClientCapacity(job) + ' within 24 hours of discovery'", 'the estate form promises the client within 24 hours');
    has(agr, "'Engage insurance carrier if damage exceeds $500'", '…the carrier above $500');
    has(agr, "'Provide Client with insurance carrier contact and claim process within 48 hours'", '…and the contact within 48 hours');
    eq(c.INCIDENT_CARRIER_FLOOR, 500, 'the floor is the clause’s figure');
    has(t, 'Above ' + c.fmt(c.INCIDENT_CARRIER_FLOOR) + ', engage the insurance carrier', 'the page prints the floor');
    has(t, 'Tell the client within 24 hours', 'the 24 hours');
    has(t, 'within 48 hours', 'the 48 hours');
    const lines = codeOnly(fn('incidentLines'));
    has(lines, "incidentDayPlus(rep.occurredOn, 1)", 'the card’s client and report reminders fall due the day after');
    has(lines, "incidentDayPlus(rep.occurredOn, 2)", '…the carrier’s two days after');
    has(t, 'Each reminder on the card turns red once its day has passed.', 'the page says they turn red');
    has(lines, 'red: !cn && !!day && day > cnDue', '…which they do');
    has(t, 'on every job, estate or living', 'on every service (Q70: the deadlines are derived on living work too)');
    lacks(lines, "svc ===", '…and incidentLines asks no service');
    // Every button the page names is a button the card or the dialog offers: the card rendered with a damage incident above the
    // floor, a vulnerable adult concern and a resolved complaint, so each act is on screen, and the dialog opened for a report.
    {
      const dom = domStub({});
      const r = sandbox({
        vars: ['INCIDENT_KINDS', 'INCIDENT_KIND_ORDER', 'INCIDENT_ACTS', 'INCIDENT_ALERT_TO', 'INCIDENT_CARRIER_FLOOR', 'INCIDENT_HOTLINE', 'INCIDENT_DOC_KEY',
               'INCIDENT_GUIDE_DOC', 'INCIDENT_RECORD_TITLE', 'INCIDENT_INTERNAL_TITLE', '_incidentPhotoSpecs', '_incidentPhotoKeys', 'DECEDENT_SERVICES'],
        fns: ['incidentsCardHtml', '_incidentRowHtml', '_incHowWord', 'incidentPhotoControlHtml', 'incidentReportsOf', 'incidentUpdatesOf', 'incidentNo', 'incidentStatus',
              'incidentAlertOwed', 'incidentHasAct', 'incidentHotlineCalled', 'incidentLines', 'incidentDayPlus', '_incTime', '_incWhen', '_incStampTxt', 'derivedLinesHtml',
              'guideLinkHtml', 'openIncident', 'incPickKind', '_incidentPeople', '_incidentPlaces', 'jobListEntries', 'jobListGet', 'isDecedentJob', 'esc', 'escLines',
              'fmt', 'fmtDate2', '_ymdLocal', 'roundCents', 'samePerson', 'canonPersonName', 'isCrewPlaceholder'],
        stubs: { document: dom, _todayStr: () => '2026-10-19', invFiduciaryMode: () => false, deviceUser: () => 'Ashley Jerome', _siteFindTeamNames: () => ['Ashley Jerome'],
                 _planRooms: () => ({ rooms: [{ name: 'Study' }] }), _assignedVendorsForJob: () => [], jobFiduciaries: () => [], showSyncBadge() {}, PERSON_NAME_ALIASES: {} },
      });
      const rep = (id, kind, extra) => Object.assign({ id, entry: 'report', kind, occurredOn: '2026-10-19', where: 'Study', what: 'x', reportedBy: 'Ashley Jerome', recordedBy: 'Ashley Jerome', recordedAt: 1, f1: 'y' }, extra || {});
      const job = { id: 7, svc: 'downsizing_move', incidents: [
        rep('d1', 'damage', { estValue: 900 }), rep('v1', 'vulnerable'), rep('c1', 'complaint', { f2: 'z' }),
        { id: 'u1', entry: 'update', of: 'c1', act: 'resolved', note: 'done', by: 'Ashley Jerome', at: 2 }] };
      r.jobs = [job];
      const card = r.incidentsCardHtml(7, job, {});
      ['Report an incident', 'I called Anthony', 'Add a note', 'Add photos', 'Client notified', 'Carrier engaged', 'Hotline called', 'Resolve', 'Reopen', 'Void',
       'Print Incident Record', 'File to Drive', 'Print Internal Incident Record']
        .forEach((b) => { has(t, b.replace('Print Internal Incident Record', 'its own internal page'), 'the page names ' + b); has(card, '>' + b + '<', '…which the card offers'); });
      r.openIncident(7, 'report');
      eq(dom.getElementById('inc-save-btn').textContent, 'Record', 'the dialog’s button reads Record');
      has(t, 'Press Record', '…which the page names');
      has(t, 'by phone, by text or in person', 'the three ways the call is recorded');
      eq(SRC.slice(SRC.indexOf('<select id="inc-how">'), SRC.indexOf('<select id="inc-how">') + 200).match(/<option[^>]*>([^<]+)</g).length, 3, '…which the dialog offers');
      has(t, 'Names are offered as you type; a semicolon between them.', 'the names offered');
      has(SRC, '<label>Who was present <span class="lbl-hint">&mdash; names, with ; between them</span></label>\n        <input type="text" id="inc-present" list="inc-people" autocomplete="off">', '…by the dialog, with ; between them (on its label since 2026-10-23)');
    }
    const cardFn = codeOnly(fn('incidentsCardHtml'));
    has(t, 'Close job names each one; Deposit Retained is refused the same way.', 'the close gate');
    has(codeOnly(fn('jobCloseBlockers')), 'var oi = openIncidents(j);', '…asked by jobCloseBlockers');
    has(codeOnly(fn('confirmMarkLost')), 'openIncidents(j).length', '…and by Deposit Retained');
    has(t, 'marked as recorded after the close', 'a write after the close is flagged');
    has(codeOnly(fn('saveIncident')), 'afterClose', '…which the save marks');
    has(t, 'the day is never after today', 'a day after today is refused');
    has(codeOnly(fn('incidentRefusal')), "'The day is after today. An incident is recorded on or after the day it happened.'", '…by the rule where the record is written');
    has(t, 'The app refuses a resolution with no note.', 'a resolution needs its note');
    eq(c.INCIDENT_ACTS.resolved.needsNote, true, '…which the catalogue says');
    has(t, 'the kind, the day, where, what, who reported it and the kind’s own question', 'what the save refuses without');
    // The hotline and the internal rule.
    has(t, 'Florida Abuse Hotline, ' + c.INCIDENT_HOTLINE + ' (§415.1034)', 'the hotline, with the statute');
    eq(count(t, c.INCIDENT_HOTLINE), 2, '…twice: the section and the pocket card');
    eq(c.INCIDENT_KINDS.vulnerable.internal, true, 'the concern is internal');
    has(t, 'It is never on the Incident Record the client or their attorney receives, and never in the estate package.', '…and the page says so (Q66)');
    has(codeOnly(fn('incidentReportsOf')), 'if (opt.client && K.internal) return false;', '…which the client’s reader does');
    has(t, 'It prints on its own page, for Anthony only.', 'its own page');
    has(cardFn, "printIncidentRecord(' + jobId + ',{internal:true})", '…offered on the card');
    // Where it ends up: the folder, the record’s title and footer, the package.
    has(t, c.INCIDENT_SUBFOLDER + ' folder', 'the Drive folder, by name');
    has(t, 'The ' + c.INCIDENT_RECORD_TITLE + ' is one page per job', 'the record, by its title');
    has(t, 'it is not an admission of liability or a statement of value', 'the record’s own footer sentence');
    has(codeOnly(fn('incidentRecordHtml')), 'it is not an admission of liability or a statement of value.', '…which the builder prints');
    has(t, 'a footer that counts what the page lists', 'the footer counts');
    has(t, 'after the Disposition Ledger', 'in the package after the ledger');
    has(codeOnly(fn('probatePackageDocs')), 'incidents', '…which the package carries');
    // What is not an incident here.
    has(t, 'an original will or cash goes on Found on site instead', 'a will or cash goes on Found on site');
    has(cardFn, 'goes on Found on site, above, not here', '…as the estate’s card says');
    has(t, 'A firearm is not a hazard here: it follows the Firearms Protocol and its own banner.', 'a firearm follows the protocol');
    has(codeOnly(fn('incPickKind')), 'Firearms follow their own protocol and banner.', '…as the dialog says');
    has(t, 'the Bill of Lading and their inventory: see Move Day', 'a mover’s damage points at Move Day');
    has(text(read('move-day-guide.html')), 'Incidents', '…and Move Day points back at the card');
    has(read('move-day-guide.html'), 'property damage (<a href="incident-guide.html">Reporting an Incident</a> says how)', '…linking the page from that bullet (the footer names it too)');
  }

  // ═══ THE SHORTHAND ═══
  group('the build’s shorthand stays off the page (the photography guide’s rule)');
  {
    const words = t.replace(/direct line/gi, ' ');
    [['the desk', /\bthe desk\b/i], ['Agent One or Two', /\bAgent (?:One|Two)\b/i], ['"line" for an item', /\blines?\b/i],
     ['"lot" for a group', /\blots?\b/i], ['"chip" for a destination', /\bchips?\b/i], ['"frame" for a photo', /\bframes?\b(?!d)/i],
     ['"manifest"', /\bmanifest\b/i], ['"stableId"', /stableId/], ['a function name', /\b[a-z]+[A-Z][A-Za-z]+\(/], ['"docState"', /docState/], ['a key like inc_', /\binc_[a-z]/]]
      .forEach(([what, re]) => { const m = words.match(re); ok(!m, 'no ' + what + (m ? ' ("…' + words.slice(Math.max(0, m.index - 30), m.index + 30) + '…")' : '')); });
  }

  // ═══ THE DOCUMENTS, BOTH COPIES ═══
  group('the manual and the playbook name the page, both copies alike');
  {
    [read('concierge-guide.html'), read('CONCIERGE_GUIDE.md')].map(text).forEach((g, i) => {
      has(g, 'Reporting an Incident', (i ? 'CONCIERGE_GUIDE.md' : 'concierge-guide.html') + ' names the page');
      has(g, 'Read Reporting an Incident', '…and the link on the card');
    });
    [read('concierge-guide.html'), read('CONCIERGE_GUIDE.md')].forEach((g, i) => has(g, 'incident-guide.html', (i ? 'CONCIERGE_GUIDE.md' : 'concierge-guide.html') + ' links it'));
    [read('manual.html'), read('MANUAL.md')].map(text).forEach((m, i) => {
      has(m, 'incident-guide.html', (i ? 'MANUAL.md' : 'manual.html') + ' names the file');
      has(m, 'INCIDENT_GUIDE_DOC', '…and the constant');
      has(m, 'tests/incident-guide.test.js', '…and this test');
    });
  }
};
