'use strict';
// THE MANAGER-APPROVAL EMAIL WENT OUT FROM A PERSONAL iCLOUD ACCOUNT (2026-09-22).
//
// Anthony, on the first estimate of the five-client test run: *"is there anyway to hardcode
// havelling gmail account for seeking manager approval. ashley had her icloud account open on
// her computer so the email was sent from her personal icloud, not havellin gmail."*
//
// ⚠⚠ THE CAUSE IS `mailto:`, AND IT IS NOT FIXABLE BY EDITING THE LINK. A mailto: hands the
// message to whatever the MACHINE has set as its default mail program. Ashley's was iCloud
// Mail, so a pricing approval for a priced estimate left from her personal address: no
// Havellin provenance on it, a reply-to nobody at the firm can see, and no copy in the
// Havellin account. Nothing in the URL can change which program opens it.
//
// ⚠ THE ANSWER WAS ALREADY BUILT — the gmail.compose draft path the client estimate uses. It
// creates the draft IN THE SIGNED-IN HAVELLIN MAILBOX whatever the machine's default is, and
// it still cannot SEND: a person reads it and presses send, which is the requirement every
// outbound email in this app is built around.
//
// ⚠ AND mailto: SURVIVES AS THE FALLBACK. An unconfigured client id, a closed sign-in popup or
// a Gmail error must still leave somebody able to send the thing — a compose window that opens
// beats a button that reports an error. What is new is that the fallback NAMES THE RISK,
// because a wrong From address is invisible to the person pressing send.

const { sandbox, source } = require('./harness');

const FNS = ['sendInternalEmail', 'notifyDept', 'notifyManagerForApproval',
             'buildMimeMessage', '_mimeHeader', '_b64Wrap', '_b64url',
             'gmailConfigured', 'gmailDraftUrl', 'esc'];
const VARS = ['DEPT_EMAILS', 'MANAGER_APPROVAL_EMAIL', 'GMAIL_CLIENT_ID_DEFAULT', 'GMAIL_CLIENT_ID', '_gmailUserEmail'];

// Drive the REAL functions. `gmail` decides what the draft call does: 'ok', 'fail', or
// 'off' (no client id at all).
function run(gmail, fire) {
  const opened = [];
  const badges = [];
  const mimes = [];   // the SPEC handed to buildMimeMessage
  const raw = [];     // the MIME string it produced
  const ctx = sandbox({
    fns: FNS,
    vars: VARS,
    stubs: {
      window: { open: (u) => { opened.push(String(u)); return null; } },
      showSyncBadge: (m, isErr) => badges.push({ msg: String(m), err: !!isErr }),
      gmailCreateDraft: (mime, cb) => {
        raw.push(String(mime));
        if (gmail === 'ok') cb(true, { draftId: 'd1', messageId: 'm1' });
        else cb(false, { error: 'Gmail API returned HTTP 403' });
      },
      // Stubbed rather than lifted: who the concierge is and what the service is called are
      // not what this suite is about, and lifting them drags in the whole roster.
      assignedTCContact: () => ({ name: 'Ashley Jerome', email: 'ashley@havellinpalmbeach.com', phone: '' }),
      svcLabelOf: () => 'Estate Settlement',
      console: { warn() {}, log() {}, error() {} },
    },
  });
  // Wrap the REAL builder rather than stubbing it: the suite asserts on the spec AND on the
  // bytes it produces, and a stub of the builder would prove nothing about either.
  const realBuild = ctx.buildMimeMessage;
  ctx.buildMimeMessage = (o) => { mimes.push(o); return realBuild(o); };
  if (gmail === 'off') ctx.GMAIL_CLIENT_ID = '';
  ctx._gmailUserEmail = gmail === 'ok' ? 'ashley@havellinpalmbeach.com' : '';
  ctx.jobs.push({ id: 7, name: 'Butler', addr: '69 Beach Blvd', svc: 'cleanout' });
  fire(ctx);
  return { ctx, opened, badges, mimes, raw };
}

const mailtos = (o) => o.filter((u) => u.indexOf('mailto:') === 0);

module.exports = ({ group, ok, eq, has, lacks }) => {
  const src = source();

  group('⚠⚠ the approval request is drafted in the FIRM mailbox, never handed to the OS', () => {
    const r = run('ok', (c) => c.notifyManagerForApproval({ jobId: 7, havellinTotal: 25715 }, null));
    eq(mailtos(r.opened).length, 0,
       '⚠⚠ NO mailto: — that is the line that sent a pricing approval from a personal iCloud account');
    eq(r.mimes.length, 1, 'one Gmail draft is created');
    eq(r.mimes[0].to, 'estimates@havellinpalmbeach.com', 'addressed to the estimates group');
    ok(/Estimate Ready for Approval: Butler/.test(r.mimes[0].subject), 'naming the client');
    ok(/25,715/.test(r.mimes[0].text), 'and carrying the figure a manager is approving');
    ok(r.opened.some((u) => /mail\.google\.com/.test(u)), 'the draft is opened in Gmail');
    ok(r.badges.some((b) => /ashley@havellinpalmbeach\.com/.test(b.msg)),
       '⚠ and the badge NAMES THE MAILBOX — the draft link can only open Google account 0, which on a browser signed in to several is whichever signed in first');
    ok(!r.badges.some((b) => b.err), 'nothing is reported as a failure');
  });

  group('⚠ the subject is not encoded twice', () => {
    const r = run('ok', (c) => c.notifyManagerForApproval({ jobId: 7, havellinTotal: 100 }, null));
    lacks(r.mimes[0].subject, '%20',
      '⚠ it used to arrive pre-encoded, so a manager saw "Havellin%20%E2%80%94%20Estimate..." in their inbox');
    lacks(r.mimes[0].subject, '%E2%80%94', 'the em dash is a character, not an escape');
    ok(/^Havellin — /.test(r.mimes[0].subject), 'it reads as written');
  });

  group('⚠ a discount re-approval takes the same route', () => {
    const r = run('ok', (c) => c.notifyManagerForApproval({ jobId: 7, havellinTotal: 20000 },
                                                          { original: 25000, pct: 10, revised: 22500 }));
    eq(mailtos(r.opened).length, 0, 'still no mailto:');
    ok(/Discount Approval Needed/.test(r.mimes[0].subject), 'framed as the discount request it is');
    ok(/10%/.test(r.mimes[0].text), 'carrying the percentage');
  });

  group('⚠ notifyDept routes the same way — ONE rule, not two', () => {
    const r = run('ok', (c) => c.notifyDept(c.DEPT_EMAILS.billing, 'Payment link sent', ['Line one', '', 'Line two']));
    eq(mailtos(r.opened).length, 0, 'no mailto: on the billing hand-off either');
    eq(r.mimes[0].to, 'billing@havellinpalmbeach.com', 'addressed to billing');
    const body = src.slice(src.indexOf('function notifyDept('), src.indexOf('function notifyManagerForApproval('));
    lacks(body, 'mailto:', '⚠ it holds no copy of the routing — two copies is how one of them keeps the old behaviour');
    has(body, 'sendInternalEmail(', 'it delegates to the one definition');
  });

  group('⚠⚠ mailto: SURVIVES as the fallback, and it warns about the From address', () => {
    const off = run('off', (c) => c.notifyManagerForApproval({ jobId: 7, havellinTotal: 100 }, null));
    eq(mailtos(off.opened).length, 1,
       '⚠ with no Gmail configured a compose window still opens — a button that only reports an error is worse');
    ok(/estimates@havellinpalmbeach\.com/.test(off.opened[0]), 'still addressed to the right group');
    ok(off.badges.some((b) => /CHECK THE FROM ADDRESS/i.test(b.msg)),
       '⚠⚠ and it says so — the whole defect is that a wrong From address is invisible to the person pressing send');
    ok(off.badges.some((b) => b.err), 'raised as a warning rather than a quiet success');
    ok(off.badges.some((b) => /Settings/.test(b.msg)), 'naming where to fix it');

    const fail = run('fail', (c) => c.notifyManagerForApproval({ jobId: 7, havellinTotal: 100 }, null));
    eq(mailtos(fail.opened).length, 1, 'a Gmail error falls back the same way');
    ok(fail.badges.some((b) => /403/.test(b.msg)),
       "carrying the server's own words rather than a bare failure");
    ok(fail.badges.some((b) => /CHECK THE FROM ADDRESS/i.test(b.msg)), 'and the same warning');
  });

  group('⚠ the draft is composed, never sent — the person presses send', () => {
    const body = src.slice(src.indexOf('function sendInternalEmail('), src.indexOf('function notifyDept('));
    has(body, 'gmailCreateDraft(', 'it creates a draft');
    lacks(body, 'gmail.send', '⚠ never the send scope: a person reading it before it goes is the feature, not a limitation');
    lacks(body, "users/me/messages/send", 'and it does not post to the send endpoint');
    // The html part is not decoration: buildMimeMessage always emits a multipart/alternative,
    // and an empty html body is what makes a client that prefers html render a blank message.
    has(body, 'html:', 'it supplies an html part');
    has(body, 'esc(', '⚠ escaping the lines, because a client name with an & in it lands in that html');
  });

  group('⚠ the MIME is well formed — the trap this file has paid for before', () => {
    const r = run('ok', (c) => c.notifyDept('billing@havellinpalmbeach.com', 'Subject here',
                                            ['Hello', '', 'A line with an & in it']));
    const mime = r.raw[0];
    const bareLf = (mime.match(/(?<!\r)\n/g) || []).length;
    eq(bareLf, 0,
       '⚠⚠ ZERO bare line feeds. Every break in a MIME message is CRLF, base64 bodies included — ten bare \\n is what made Gmail drop an attachment once');
    ok(/^To: billing@havellinpalmbeach\.com/m.test(mime), 'the To header is there');
    ok(/Content-Type: multipart\/alternative/.test(mime), 'with a text and an html part');
    ok(mime.split('\r\n').every((l) => l.length <= 998), 'and no line over the RFC limit');
  });
};
