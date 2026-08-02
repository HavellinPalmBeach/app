# Havellin Palm Beach — App Notes

## Always on every commit
- Update the version timestamp in `havellin.html` line ~247:
  `2026.MM.DD · H:MMpm ET`
  Use the current date and approximate ET time.
  Format: `YYYY.MM.DD · H:MMpm ET`

## Git identity — set this at the start of every session
```
git config user.email noreply@anthropic.com && git config user.name Claude
```
Do NOT pass `--author` on commits — let the repo config set both author and committer.
If the stop hook fires anyway, run `git commit --amend --no-edit --reset-author` and force-push.

## Branches
- Active feature branch: `claude/field-app-formatting-9eu5ff`
  (was `claude/zen-ride-v4x393`, deleted from the remote — don't chase it.)
- Push to `main` after every commit so GitHub Pages stays current:
  `git push origin claude/field-app-formatting-9eu5ff:main`
- Keep the feature branch in sync with main after each push.
- **A session may be assigned its own branch, and that assignment wins over the name
  above.** Push to the assigned branch AND to `main` — Pages serves `main`, so skipping
  it means the phone keeps showing the old build no matter what was committed. Then
  update the name above in the same commit, or the next session works off a dead ref.
  Note that pushing the same commit to both leaves nothing for a PR to diff.

## App
- Single-file app: `havellin.html` — all CSS, JS, HTML in one file
- Hosted on GitHub Pages from `main` branch
- No build process

## Concierge job playbook (`concierge-guide.html` / `CONCIERGE_GUIDE.md`) — NEW 2026-08-02
- **A second, separate document. It does NOT replace `manual.html` and nothing was removed from
  the manual to make it.** The manual is the system-of-record reference (setup, Apps Script
  URLs, folder IDs, engine formulas, vendor taxonomy, interface/architecture notes). The
  playbook is the TC-facing *how do I run a job* document — chronological, one job from intake
  to final invoice, written for Anthony and Ashley walking dummy clients end to end.
- **The dividing line, and keep it:** the playbook says what to press and what the app will
  refuse; the manual says how it works and how it is configured. If you find yourself writing
  "α" or an Apps Script URL into the playbook, it belongs in the manual instead.
- Structure is Step 1..13 + Home Prep short version + a quick reference (billing rates, PIN
  list, margin panel framing) + a **"If something won't let you proceed"** symptom→cause table.
  That last table is the highest-value part for a dry run — keep it current with the gates.
- `CONCIERGE_GUIDE.md` is GENERATED from `concierge-guide.html` by the same style of converter
  as `MANUAL.md` (scratchpad, not the repo). Regenerate in the same commit as any edit.
- It adds one class the manual doesn't have: `.stop` (red left border) for the hard gates,
  rendering as `> **⚠**` in markdown. Print/phone rules are copied from `manual.html` verbatim
  and carry the same reasoning — the phone block stays scoped to `screen` or printed tables
  silently lose their right-hand column.
- **Both documents drift together.** Any app change that triggers a manual reconciliation pass
  triggers a playbook pass too, and the playbook is the one that goes stale more dangerously —
  a wrong manual entry misinforms, a wrong playbook step strands somebody mid-job.

## Docs / operations manual (`manual.html`)
- `manual.html` is the internal operations manual. It is **hand-maintained** and does
  NOT auto-sync with the app, so it drifts whenever the app changes.
- **`MANUAL.md` is a GENERATED copy of `manual.html`** — a plain-text read of the same
  document for phones, printing and pasting into a thread. `manual.html` stays the
  source. Regenerate it in the same commit as any manual edit or the two disagree, and
  the markdown is the one people will have open. The converter lives in the session
  scratchpad, not the repo; it is ~120 lines of DOM walking (h1-h3, p, ul/ol incl.
  nested, tables, `.note` → blockquote, `.flow` → fenced block **stripped of inline
  bold**, since `**` renders literally inside a fence).
- **Printing is a real output, so the phone block in `manual.html` is scoped to
  `screen`.** Chrome lays a page out at roughly 739px for Letter, which matches
  `max-width:820px` — so an unscoped phone block gives every printed table the phone's
  `display:block; overflow-x:auto; white-space:nowrap`. On screen you scroll such a
  table; on paper the overflow is just gone. A printed table losing its right-hand
  column silently is the worst failure mode for a document someone follows step by step.
  Keep `break-inside:avoid` on `.note`, `.flow` and tables but NOT on lists — §5i and
  §11 have lists longer than a page and forcing those whole strands half a sheet.
- **Reminder:** after any significant rebuild (new/renamed/removed tabs, rate changes,
  dropdown/option changes, workflow changes), flag to the user that `manual.html` needs
  a reconciliation pass against the current app. Don't let it silently fall out of date.
- Last reconciled against the app: **2026-08-01** — a pass run before Anthony and Ashley walk a
  fake client end to end, so the checks were aimed at the billing/job-plan path rather than at
  what had recently been built. Four claims were wrong against the app:
  - **§12 the invoice PIN rule was simply not the rule.** It said every stage needs manager-PIN
    approval to unlock the PDF. `invRequiresApproval = (stage === 'final') && (_variancePct >
    0.15)` — deposit and midpoint need nothing and render a *No approval required* badge, and
    the final needs a PIN only outside ±15% (change orders excluded from the comparison).
  - **§12 was missing a hard gate that has no override.** `invBlocked = _noHours` kills a final
    invoice with no logged hours — no PIN, no PDF, no email, deliberately not routed through
    `invRequiresApproval` because a manager cannot unlock a missing timesheet. Nothing in the
    manual mentioned it, and it is exactly what a practice job hits. Documented, along with the
    softer `_noTCHours` warning (crew hours logged with no concierge hours against them).
  - **§9 Change Orders described a manager approval and a DocuSign send. Neither exists.**
    `saveChangeOrder` takes no PIN, and the app has *zero* DocuSign references. The real flow is
    Create → PDF → **Get Acceptance** (the client's name typed against *I Accept This Change
    Order*). The load-bearing part now stated plainly: `renderInvoice` filters on
    `co.clientApproved`, so an unaccepted change order is never billed at all.
    (`co.approved` is initialised false and written by nothing — a dead flag of the same shape
    as `midpointInvoiceSent`. Left alone; the client-acceptance path is the real one.)
  - **§1 still sold DocuSign as live** — "Client signatures via DocuSign. Payments via Stripe
    (planned — not yet live)", where the parenthetical reads as attaching only to Stripe. This
    is the third time this manual has promised that integration; §3's not-yet-built note was
    added in the 2026-07-30 pass and §1 was missed then.
  - §17's PIN list carries the ±15% condition now, and says plainly that a Change Order needs
    no PIN — the two questions §9 and §12 will send a reader there with.
  - Checked and found **already correct**, so left alone: §3's three hard gates, §5c (fixed
    price withheld on probate/contested, rush premium), §7, §8 (three ordered agreement steps,
    the three-stage payment recorder, the cheque photo — `dep-evidence` is real), §9's status
    table and won/re-open/delivery-stamp notes, §11, §12's Drive filing and stage auto-advance,
    §16a, §17's attribution-not-security note.
- Prior pass **2026-07-31** — the unearned-revenue prerequisites. What
  changed:
  - **§8** the deposit button is now a three-stage payment recorder (deposit · midpoint · final),
    with the picker defaulting to the first unsatisfied stage. States plainly that only the
    deposit gates anything and why the other two prefill and challenge nothing — their targets
    live in `renderInvoice` and are not reproducible in the payments module.
  - **§9** Re-open resumes at *Active* rather than resetting to *New*; *Lost* and *Closed —
    Deposit Retained* marked terminal (the button used to resurrect a lost job as new); new note
    on the write-once delivery stamp and why it is not `completionDate`.
  - **§12** stage advance now described off recorded payments rather than the dead flag, plus an
    explicit note that the **expedited premium now reaches the midpoint and final invoices** —
    including a *re-print and re-check any rush job invoiced before now* instruction, since real
    money was under-billed.
  - §5 and §16 already described the rush premium correctly; they were documenting intended
    behaviour the invoice wasn't delivering, so they needed no edit.
- Prior pass **2026-07-30** — the lifecycle rebuild (Waves 1-4). What
  changed, and the first item is the important one:
  - **§3, §8 and §9 described automation that does not exist.** The workflow diagram had
    "Send Agreement (DocuSign)" and "Deposit Auto-Charged (Stripe)", and §8 carried a whole
    *"Automated Steps After Sending"* list — client signs via DocuSign, Stripe fires on
    signature, status flips to Active by itself. None of it was ever built. Someone
    following that manual would wait for automation that never comes. Replaced with the
    manual steps that actually exist, plus an explicit not-yet-built note naming DocuSign,
    Stripe and QuickBooks.
  - **§3** now names the three hard gates (staffing needs Won · hours need the deposit ·
    Job Plan staffing section needs Won) and says plainly that the app refuses rather than
    warns.
  - **§7** an unapproved estimate cannot be emailed, from either entry point.
  - **§8** rewritten: approve → file to Drive → send → *Mark Sent* → *Mark Signed* →
    *Record Deposit*, each recording who and when and refusing out of order. Deposit
    section covers evidence capture, partial payments, received-vs-cleared, the $10k
    instrument tier, and the certified-vs-cashier's distinction.
  - **§9** status table rewritten for the real values (New · Pending Approval · Approved —
    Awaiting Client · Won · Active · Closed · Lost · Closed — Deposit Retained), plus how
    to mark a job Won and the two different closeout outcomes.
  - **§11** the deposit gate alongside the team gate.
  - **§12** invoices now file to Drive per stage; stage advances off the recorded deposit.
  - **§15** retention table corrected — the signed agreement is **not** retained (no upload
    path until DocuSign), the client estimate and invoices now are.
  - **NEW §16a Win / Loss** — reads the client's decision, so jobs sitting at *Approved —
    Awaiting Client* are no longer counted as won. Expect the number to read lower and truer.
  - **§17** per-person PINs, and stated plainly that a PIN is attribution not security
    since the file is public.
  - **Also fixed a pre-existing defect:** the manual overflowed to 774px on a 390px phone
    (a wide table plus unbreakable `<code>` paths). It is a field document; it now has a
    `@media (max-width:820px)` block and measures clean at 390/768/1440.
- Prior pass **2026-07-29** — the working-supervisor pricing, job-team
  sign-off, labour-cost-rate and mobile/field builds are all folded in. What changed:
  - **§1** phone/field-use paragraph (scrolling nav, bottom-sheet dialogs, the three
    directories' search + tap-to-contact + Quick edit, Build Estimate as the desk-first
    exception).
  - **§2** now documents the two *pricing-policy* Settings groups — concierge production
    rate (α) and the four labour cost rates — plus the note that α is pinned per saved
    estimate and never reprices an existing quote.
  - **§3** workflow diagram carries **Staff the Job Team** between agreement-sent and signing.
  - **§4** the assigned concierge is marked **optional at intake**.
  - **§5b** per-room figures are hands-on only, with the *Project coordination & logistics*
    line reconciling them to the totals.
  - **§5c** rewritten: crew auto-sizing, the **"crew size moves the price"** warning (a
    bigger crew finishes sooner so the concierge bills less — the estimate goes DOWN; never
    carry a crew size between estimates), difficult access = work pool only, multiple heirs
    = coordination only, premium = flat +25 coordination hrs.
  - **§5f** dispositions add hours, split on-site/off-site by the comes-to-the-property vs
    goes-out-to-them rule, and on-site presence counts against the day target.
  - **NEW §5i "Hours, Crew Size & Timeline"** — the whole working-supervisor model in one
    place: the three engine outputs, the four formulas, a row-by-row map of the Estimate
    Summary panel, crew sizing + mobilization floors + the 7-hr crew day, the green/amber/red
    badge semantics, the 2-concierge load check, and a **core-team reach table** (2 PS hold
    the 10-day target to ~11,900 sqft Downsizing / 8,000 Cleanout / 5,400 Estate Settlement /
    4,700 Probate / 3,600 Contested — computed from the live engine constants, not estimated;
    recheck if `ENGINE_K`, `JOB_STEPS` PS coefficients, α, `TARGET_DAYS` or
    `PRODUCTIVE_HRS_PER_DAY` move).
  - **§11** new **"Staffing the job"** subsection (the gate, placeholders, locking, Revise
    team, one-person-one-role-per-date) and Log Hours rewritten — it is a per-date team sheet
    whose roles come from the roster, not the old "role (TC / PS / Specialty)" dropdown.
  - **NEW §12a Contractors** — the tab had no section at all, and it is now load-bearing for
    margin (a named person's own rate beats the Settings placeholder).
  - **§13 / §14** search, tap-to-contact, Quick edit / Full edit split.
  - **§16** split into *what we bill* and *what we pay*, incl. the founder-rate fallback for
    an unresolvable concierge.
  - Also fixed a pre-existing malformed `<div class="note">…</p>` in §2.
  Still thin / deferred until the app is fully built: **Win / Loss** tab, and the full
  labor-job Job Plan phase playbook detail.
- *Open question (discussed, NOT built — flagged rather than assumed):* should the Job Plan
  tab itself be gated on the agreement having been sent?
- Prior pass **2026-07-15** (estate documentation build, Phases 1–3:
  documentation-level switch at intake §4 + chain-of-custody now driven by it not the
  premium rate §11; §5b collapsible/launch-collapsed room sections; §5f vendor-mapped
  15-option disposition list; new §5g Vehicles & Watercraft (Saving → §5h); §10 item
  inventory capture on room cards + the 13-category taxonomy; new **§10a Estate Inventory**
  tab — manifest, estimate→inventory bridge, appraiser roster, $3k guardrail, valuation
  basis + §2032 alternate valuation date, asset-track, custody log, snapshots, and the
  Court Inventory / Disposition Ledger / Appraisal Worklist exports; §1 interface notes
  for sticky nav, scrollable modals, alphabetized dropdowns).
  Also built: the **Drive folder consolidation** (Photos + Asset Documentation merged into
  one shareable **Estate Inventory** subfolder) and **in-app counsel sharing** (named-viewer
  Share w/ Counsel + Revoke on the Inventory tab). §4/§15 Drive-folder docs updated to match.
  ~~ACTION REQUIRED: redeploy `apps-script/main-sync.gs` + `apps-script/saveInventory.gs`.~~
  **Redeployed 2026-07-28.** A backward-compat alias keeps any pre-merge job folders working.
  Prior pass 2026-07-14 (added §13a Category Group & Category taxonomy — group required and
  dictates category, self-serve new categories, group→estimate-menu/fee routing table;
  noted the data-driven "From directory" options in the §5d third-party-vendor and §6a Home
  Prep item dropdowns). Prior pass 2026-07-08 (Home Prep for Sale standalone + streamlined
  Job Plan, Referral Partners tab, Vendor Directory section, beds/full/half baths,
  referral-source linkage, nav order incl. Win/Loss first, Vendor + Referral Apps Script
  URLs in Settings).
- **The engine facts the manual now asserts** — if any of these change, §5i and §16 are wrong
  and need editing in the same commit: `JOB_STEPS` columns are *off-site coordination* and
  *hands-on work pool* (NOT TC hours and PS hours); the pool is cleared by `(n + α)` pairs of
  hands, so `H = W/(n+α) + fixed on-site`, billed PS = `n × W/(n+α)`, billed TC =
  `H + off-site`; duration is PS-gated off `H / PRODUCTIVE_HRS_PER_DAY`; collections on-site
  presence (`COLLECTION_HOURS.on`) is added to `H` flat and never divided; the 2nd concierge
  fires on `TC_DAY_CAP` (10 hrs/day, coordination spread over `COORD_SPREAD_DAYS`) and changes
  neither fee nor duration; the timeline badge is amber only when over target *with* crew
  headroom (`requiredPS < 6`); `COST_RATES` = founder TC $100 / contractor TC $60 / PS
  Standard $30 / Senior $35, with a named contractor's own `rate` taking precedence and the
  **founder** rate as the conservative fallback for an unresolvable concierge.

## Unearned revenue prerequisites — BUILT 2026-07-30
Full spec + line-verified findings: `UNEARNED_REVENUE_SPEC.md`. Only §10 steps 0-1 are built —
the QuickBooks posting layer is deliberately NOT, pending Laura's September chart of accounts.
- **The 20% expedited premium never reached the invoice.** `RUSH_PCT` was quoted, shown on the
  client estimate, persisted on the saved estimate and inside `est.havellinTotal` — but
  `renderInvoice` rebuilt `totalMidBasis`/`totalFinalBasis` from components and had **zero**
  references to rush. A rush job was deposited WITH the premium and billed WITHOUT it: on $100k
  of services the client agreed $120k and the invoices collected $100k. A third consequence hit
  the client's own document — `overUnder` compared a rush-exclusive actual against a
  rush-inclusive estimate, so every rush job landing exactly on budget printed *"came in under
  estimate by $20,000 — credit applied."* Now: rate **pinned per estimate** (`est.rushPct`, the
  way α is), amount trues up with each basis, excluded on fixed price (already in the flat fee),
  computed **before** `coTotal` so it never lands on change orders, and shown as its own line on
  both invoice bodies. **Don't "simplify" this back into a single total** — the pin and the
  pre-CO ordering are each load-bearing.
- **A negative final invoice is CORRECT and was left alone.** `_amtDueBox` already renders it as
  a green Credit and `overUnder` already says "came in under estimate". A job running far enough
  under estimate really did overcollect via the 75% taken by midpoint. Fixing rush reduces
  spurious negatives; it does not remove real ones, and it shouldn't.
- **Payments now carry a real stage.** `saveDeposit` hardcoded `stage:'deposit'`, so midpoint and
  final money was invoiced and never captured. New `PAYMENT_STAGES`, `stagePaidTotal(job,stage)`,
  `jobPaidTotal(job)`; `depositPaidTotal` is now an alias so no caller changed meaning.
  `isJobFunded` still reads **deposit only** — a midpoint cheque of any size must never fund a
  job (there's a test). The short-payment challenge stays deposit-only because it is the one
  stage whose target the app can derive; midpoint/final targets live in `renderInvoice` and
  duplicating that engine would just let the copies drift.
- **`midpointInvoiceSent` was never written by anything** — initialised false at `4633`, read by
  `defaultInvStage`. So every funded job pinned to the midpoint invoice and the final was
  unreachable. Same dead-flag shape as Wave 1's `markDepositReceived`. Stage now advances off
  recorded payments.
- **One transition map, finally.** `JOB_TRANSITIONS` + `jobActivationBlockers()` +
  `applyJobTransition()` replace the two hand-synced copies in `activateOrCycle`/`cycleStatus`.
  `closed` now cycles to **`active`** (the button always said *Re-open*), not `new` — a mis-tap
  used to throw a delivered job back to the start, and once recognition hangs off delivery that
  tap would un-recognize revenue. `lost`/`closed_retained` were missing from the map and fell
  through `|| 'new'`, silently **resurrecting a lost job as brand new**; they're terminal now.
- **`deliveredOn`/`deliveredAt`/`deliveredBy` stamped WRITE-ONCE** on first close. Reopen/reclose
  does not move it. This is the field revenue recognition will read; there was previously no
  record of delivery at all (`completionDate` is the intake *target*).
- Left alone on purpose: the `hvlId || String(jobId)` fallback at `9906` is a **court inventory**
  export where a blank ID cell is worse than a numeric one. The spec's fail-loud rule is for the
  GL path, which does not exist yet.
- ~~⚠️ **`manual.html` needs a reconciliation pass** — §8 (payment recording is now three stages,
  not deposit-only), §9 (Re-open resumes at Active; lost/retained are terminal), §12 (invoice
  stage advances off recorded payments; expedited-delivery line on midpoint + final).~~
  **Done 2026-07-31**, and re-verified in the 2026-08-01 pass. This flag outlived its fix by a
  day and read as outstanding work; clear these when the pass lands.

## Client lifecycle rebuild — Waves 1 + 2 BUILT 2026-07-30
- **Wave 1 shipped.** Per-person PINs (`MANAGER_PINS`, `resolvePin`) — Anthony `3010`,
  Ashley `4020`; approvals now record who actually typed the PIN instead of a constant.
  Attribution, NOT security — the file is public, so the PINs are readable in source.
  Unapproved estimates can no longer be emailed. Service type / sqft / premium freeze once
  the estimate is approved (contact edits in the same save still go through). Agreement
  stops filing blank templates on every render and files the approved one on approval;
  client estimate and every invoice now auto-file to Drive. Margin panel states what the
  50% deposit actually covers and warns in dollars when it does not cover cost — the 30%
  walk-away floor is deliberately left alone (pricing policy, §5a).
- **The deposit path was dead code**, worse than the audit found: `markDepositReceived`
  read `agr-job-select` (no such element — the picker is `agr-job`) so it always bailed,
  and its button's `display:none` was never cleared by anything. `depositReceived` could
  never become true while SEVEN sites read it, so `defaultInvStage` pinned every job to the
  deposit invoice forever and three blocker lists showed "Deposit not received" for life.
  Now three ordered steps — mark sent → mark signed → record deposit — each recording who
  and when, each refusing out of order. Deposit captures amount/date/method/reference/payer,
  prefills 50% of the approved total, asks before accepting anything short. Cheques leave
  `clearedOn` null; wire/card/cash set it. Personal cheque ≥ `LARGE_DEPOSIT_THRESHOLD`
  ($10k) is recorded and flagged `policyException`, never refused.
- **Also fixed:** `saveClientEdit` ended in `renderJobDetail()`, which does not exist — so
  every client edit threw after saving, and the drilldown never refreshed. Repointed at
  `renderClientDashboard`.
- **Wave 2 shipped — the `won` model.** The app had no concept of won: win/loss reporting
  counted `status==='active'||'closed'`, and `checkPin` set `active` the instant a MANAGER
  approved OUR OWN estimate. The win rate measured how often we approved our own work.
  Now `checkPin` sets **`approved`**, and a new **`won`** status is set by an explicit
  client decision (`openWonModal`/`confirmMarkWon`) capturing method (email/call/text/in
  person), date, the client's words, and who logged it — an undocumented phone call is
  challenged, since the note is the only record it happened. `isJobWon()` is the single
  reader and migrates legacy `active`/`closed`/`closed_retained` jobs as won.
- **Statuses now:** `new → pending → approved → won → active → closed`, plus `lost`
  (died before payment; also set when a won job withdraws — won-then-withdrawn is not a
  win) and `closed_retained` (died after the deposit; keeps `won=true` because it produced
  revenue). Both `activateOrCycle` and `cycleStatus` carry the transition map — they are
  duplicates, change both. `active` still requires signature + deposit via their existing
  blockers; `checkPin` used to bypass that entirely.
- **Gates now live:** staffing (`confirmJobTeam`) refuses an unwon job; the Job Plan
  withholds the staffing/hours section until won (it previously tested `estRec.approved` —
  the manager's PIN — so it looked like this rule while enforcing a different one).
- Remaining: Wave 3 (payment record → DocuSign → Stripe → QB), Wave 4 (hours gated on
  `funded`). 222 jsdom checks green.

## Client lifecycle rebuild (decided 2026-07-30, NOT yet built)
- Full findings + target state machine + build order: `LIFECYCLE_AUDIT.md`.
- Audit found **all three hard business rules unenforced**: no deposit check anywhere in the
  Job Plan/staffing/hours path; the Job Plan gate at `11244` tests the *manager's* PIN, not
  client approval; and there is no concept of *won*. 82 claimed hard gates tested, 66 refuted.
- **Decided:** acceptance is informal (email/call/text) so `won` and `contracted` stay separate
  statuses; DocuSign for the signature record; deposit is **NEVER** waived, so the `funded`
  gate is unconditional; `funded` is machine-observed via Stripe + QuickBooks and never keyed
  by hand; per-person PINs (Anthony, Ashley) replacing the literal `3010`; invoices always
  auto-filed to Drive; a job dying pre-payment is `lost`, post-payment is `closed_retained`
  with the deposit kept.
- **Cheques are the NORMAL payment path, not an edge case** — elderly clients in person, trust
  officers and law firms institutionally. So `funded` is **not** API-only: a founder or
  concierge may record a payment *with evidence* (amount, date, method, reference, payer, and a
  photo of the cheque, all attributed). The boolean `depositReceived` is replaced by a
  `job.payments[]` list, and `funded` fires when deposit payments sum to =50% of contract total
  — which handles partial and multiple cheques. Stripe sets `clearedOn` instantly for cards; QB
  reconciles afterwards and flags anything that never banked or banked short. Work starts on
  *received*, not *cleared* — waiting on clearing costs 3-5 days per job and collides with the
  scheduling pressure that drove staffing-ahead. See §6a-6d.
- **Large deposits tier the INSTRUMENT rather than delaying the job** (§6c). Above a threshold
  (start $10k, a Settings value not a constant) a personal cheque is not accepted: **wire
  preferred, cashier's cheque accepted**. Work still starts on received at every size. Three
  things to get right in the agreement language: a *certified* cheque (drawn on the client's
  account, bank secondarily liable) is NOT a *cashier's* cheque (drawn on the bank's own
  account, bank primarily liable) — name the latter; neither is bounce-proof, since counterfeit
  cashier's cheques are a common fraud and a bank can reverse weeks later on a forgery, so
  verify large ones by phoning the ISSUING bank on an independently looked-up number; and a
  wire beats both, being final on receipt — which is also what trust officers and law firms
  do routinely, so it is the easier ask of exactly the payers sending the largest amounts.
  The accepted methods must appear on the agreement AND the deposit invoice, or the tier never
  reaches the client before they go to the bank.
- **Build order is forced, not preferred** (§7a): correctness fixes → the `won` status model →
  DocuSign, then Stripe, then QB → *only then* the deposit gate. A hard gate with no override
  is unsafe until the field it reads is reliably populated; turning it on early would stall
  real jobs and the first workaround would hollow out the rule permanently.
- **Open, needs counsel:** the retained-deposit clause (§8.6). Model the state now; do not
  treat the money as earned until the agreement language exists.
- **RESOLVED 2026-07-30 — the 30% line stays, and it is a REFERENCE not a floor.** Anthony:
  the 30% is arbitrary, the panel is there so a discount does not quietly eat the profit, and
  in practice a job needing that discount is one to walk away from rather than price down to.
  So no hard change to the number — but the labels were actively inviting the discount they
  were meant to discourage, and contradicting the deposit-coverage line beside them:
  *Min Viable Quote* asserted that quoting at 30% is viable, and *Negotiation Room* framed the
  gap as budget to spend. Renamed to **Price at 30% Margin** and **Above Reference** (purely
  descriptive), badge reads "At or below the 30% reference — hold firm", and `manual.html` §16
  now states the panel is an indicative profitability readout with a flag, not a discounting
  tool. `walkAway` / `negotiationRoom` keep their variable names; only the framing changed.
- One correctness bug worth fixing regardless: `markDepositReceived` (`6420-6433`) sets
  `depositReceived` AND `agrSigned` from one button, and `6426` is the only `agrSigned` write
  site in the file. There is no `agrSent` field at all.

## QuickBooks Online — setup decisions (2026-07-30, account not yet created)
- Stripe is already set up. **Neither Stripe nor QBO is required to close the payment loop** —
  the manual payment record with evidence already funds a job, unlocks hours and advances
  invoicing. They add card acceptance and reconciliation, not the loop itself.
- **Deposits are a LIABILITY until the work is performed** (customer deposits / unearned
  revenue), not income on receipt. Anthony confirmed. Get the exact treatment signed off by
  the accountant — it depends on cash vs accrual.
- **Vendor work is PURE PASS-THROUGH.** The vendor bills the client directly; Havellin takes
  only the fee on top. So vendor money never touches Havellin's books — not as revenue, not
  as COGS. **The app already models this correctly**: `havellinTotal = tcFee + psFee +
  pkgCost + smf + gcFee + stagerGcFee + prepFee` and `calcVendorTotals()` returns
  `v.cost * 0.15` (the FEE, not the cost); vendor costs live only in `grandTotal`. Two things
  follow correctly from that and must not be "fixed": the deposit is 50% of Havellin's fee
  rather than of the vendors' money, and margin % is measured against Havellin revenue rather
  than inflated by pass-through.
- Chart of accounts that follows: **revenue** — concierge labour · specialist labour · moving
  materials · vendor management fee (15% SMF) · general contracting fee (30% GC) · home prep
  coordination fee. **Cost of services** — contractor labour (the 1099 spend) · materials
  purchased. **Liability** — customer deposits. Expect the P&L to read much smaller than the
  dollars moving through the jobs; that is correct.
- **The boundary that keeps pass-through clean:** never pay a vendor and rebill the client,
  even as a one-off convenience. That single transaction becomes gross revenue AND an expense
  and breaks the agent position. If it ever happens it needs its own account so the accountant
  can see it rather than having it buried in the management-fee line.
- Contractors need **1099 flags on their vendor records from day one**; retrofitting in
  January is miserable. Customers/jobs need setting up if P&L-by-job is wanted (it is — that
  is most of the reason to connect QBO at all).
- **Known defect to fix before anyone relies on it:** `generateStripeLink` posts with
  `mode:'no-cors'`, so the response is opaque and unreadable. It reports *"Stripe payment link
  generated and sent to billing@"* unconditionally — including when the Apps Script endpoint
  is missing or erroring. Nothing reads back from Stripe at all; there is no webhook and no
  write to `clearedOn`.

## Quo contact sync (started 2026-07-28)
- Bigin is being retired. Quo is the dialer directory, not a CRM — the app already
  holds the pipeline/status data. Calling from the office line with caller ID is the
  whole point; texting is deliberately out of scope (metered per segment, and cold SMS
  carries a TCPA/10DLC consent burden that calling does not).
- `syncQuoContacts` lives in `referral-partners-backend.gs`. One-way push, sheet is the
  source of truth. Partner `uid` → Quo `externalId`; the returned Quo id is written back
  to a new `quo_contact_id` column, and that local id is what decides POST vs PATCH.
- Endpoint constants **both confirmed 2026-07-28** from the Authentication curl example:
  host is `https://api.quo.com/v1` (it MOVED in the rebrand — `api.openphone.com` is
  dead) and the header carries the raw key with no `Bearer ` prefix. Either one wrong
  returns 401, which reads like a bad key.
- Run `testQuoAuth` before anything else — a read-only `GET /phone-numbers` that proves
  key + host without touching contacts, so auth failures don't masquerade as sync bugs.
- Also needs `QUO_API_KEY` in Script Properties. Not exposed over HTTP yet, by design:
  run `dryRunQuoSync` from the Apps Script editor first, then `pushQuoSync`.
- **The app's tap-to-call/text buttons stay on `tel:` / `sms:` — do NOT route them to
  Quo.** Decided 2026-07-28. In the field you're on a job and want your own cell: "hey,
  I'm on site, where are you?" Quo is the deliberate opposite move — open the Quo app to
  introduce yourself to a new vendor or partner from the office line and look official.
  Two tools, two moments; wiring the app buttons to Quo would collapse them.
- An id is reused only when the row's `quo_external_id` matches the identity being
  synced now. Without that, four partners coming off a shared switchboard onto direct
  dials would each PATCH the firm contact in turn, each overwriting the last. A contact
  the directory walks away from is reported once as an `orphan`, and `pruneQuoStaleConfirm`
  deletes it.
- **One Quo contact per NUMBER, not per partner.** A switchboard shared by several
  partners syncs as the firm (`externalId` `firm:+1…`, display name = firm, role
  "Main line") because naming it after one of them is wrong on most inbound calls.
  Members keep individual contacts whenever they have a direct line. If members of a
  shared number disagree on firm, it's reported as a conflict and left unsynced.
- **LIVE since 2026-07-29.** Partners first (63 contacts: 58 people + 5 firms), then
  the full push: 136 vendor contacts created and the 63 partners updated in place,
  0 failed. Verified from the Quo side, not just the log — the Comiter firm contact
  kept its id with createdAt 13:03 / updatedAt 13:35, so the re-push matched rather
  than duplicated. **199 contacts live.**
- **Retiring a vendor: mark `Do Not Use`, don't delete the row.** Both drop it from the
  sync identically, but the status keeps why-we-stopped in the app so nobody re-contacts
  them in six months. Deleting the row throws that away. Either way its Quo contact is
  reported `STALE` on the next run and removed with `pruneQuoStale(true)`.
- **DELETE works — verified 2026-07-29.** `testQuoDelete` returned HTTP 204 and the
  follow-up GET 404, so the contact is really gone rather than archived. That check is
  worth keeping: an API that 200s and only archives would otherwise look identical. With no argument it picks the first
  STALE contact itself, because **the Apps Script Run menu passes no arguments** — any
  entry point meant to be run from that menu has to work argument-free. Same reason
  `pruneQuoStale` previews and `pruneQuoStaleConfirm` is what deletes. Pruning is kept
  OUT of `pushQuoAll` on purpose: a push runs often and should never remove anything.
- **Stale contacts are reported.** Every run diffs what Quo holds under our sources
  against what the directories still produce; anything left over is logged as `STALE`
  with its contact id, and `pruneQuoStaleConfirm` removes them. Without that, a
  retired vendor's contact would sit in the dialer forever. This first
  showed up when the vendor sheet went 152 → 150 rows and the run reported `update=197`
  against 199 live contacts.
- Confirmed by that same check: a PATCH *does* honour a changed `source` — the partner
  contacts moved from the legacy `Havellin` to `Havellin Referral Partner` on update.
  Keep `QUO_SRC_LEGACY` in the read list anyway; it costs nothing and any contact
  created before the rename still resolves.
- **Now covers all three directories.** The sync moved OUT of `referral-partners-backend.gs`
  into `apps-script/quo-sync.gs`, which is added as a SECOND FILE (`Quo`) in the same
  Apps Script project — partners via the bound sheet, vendors and jobs via openById.
  One key, one project, one run. Never paste the old per-partner version back beside
  it: Apps Script shares global scope across a project's files and they collide.
- Grouping is **global across all three sources**, not per-sheet — a number in both the
  vendor and client sheets is still one number, and two contacts holding it would
  reintroduce the ambiguity the firm collapse exists to remove.
- **No write-back any more.** The run starts by reading Quo for everything under our
  sources and building externalId -> id. Derived state can't drift from what Quo holds,
  and nothing is written to a source sheet — which matters for jobs, whose fields live
  in a JSON blob owned by main-sync. `quo_contact_id`/`quo_external_id` in the Partners
  sheet are now historical.
- `source` is set per type (`Havellin Referral Partner` / `Vendor` / `Client`) because
  list-contacts filters on it. The old flat `Havellin` value is still matched on read so
  the original 63 update rather than duplicate.
- Vendors with status `Do Not Use` are excluded — a vendor you decided not to call does
  not belong in the dialer. Client names are split first/last, suffix-aware (`Pressly Jr.`,
  `Hennessey III` keep the suffix on the surname).
- **Clients are gated OFF** (`QUO_SYNC_CLIENTS = false`). Plumbed and tested, but the
  jobs sheet still holds dummy records while the app is tuned. Flip to true when real
  jobs are flowing — target October 2026. Nothing else needs changing.
- Vendor identity is the sheet's `UID` column (verified populated + distinct on all 152
  rows), not the row index — a cleared row that gets reused would otherwise inherit the
  previous vendor's contact.
- Verified against the real exported sheets 2026-07-29: 79 partners + 152 vendors →
  **199 contacts** (63 partner + 136 vendor), 20 skipped for no dialable phone, 2
  duplicate vendor rows, 1 conflict. No number appears in more than one source.
- **SUPERSEDED 2026-07-31 — a multi-trade vendor is now ONE row, categories separated by
  `;`.** `Art Appraiser; Antiques & Furniture Appraiser`. It used to be one category per
  row, so a firm doing two things was two rows — which meant two ratings, two statuses,
  two contact histories, and a call logged against one being invisible on the other.
  `category_group` stays a single value per row and is unchanged; only `category` went
  multi-value. **Semicolon, not comma:** `Specialty Vendor (art handler, etc.)` contains
  a comma, 11 category names contain `/` and 8 contain `&` — none contains `;` (checked
  against all 65 names the app references). Whitespace around it is trimmed.
  - App: `vendorCats(v)` splits, `vendorPrimaryCat(v, prefer)` picks the heading to file
    under. A job-plan dropdown files the vendor under **the category that slot asked
    for** and lists it **once** even when the slot maps to several of its categories; the
    Vendors tab tree lists it under **every** category, because that is a browse view and
    the whole point is finding it under either heading. Counts read the row array, so a
    multi-category vendor is not double-counted.
  - Quo: one row now yields one contact carrying every category as a tag, role joined
    with ` / ` (`Landscaper / Pest Inspection / Treatment`).
- **The row-merge path in `quo-sync.gs` is KEPT even so.** It still catches rows never
  merged in the sheet and the same firm reached through a second listing. Rows sharing a
  number and a name merge into one contact carrying every category, with the role naming
  all of them. An early version kept only the first row's category and called the rest a
  duplicate to clean up; that was wrong and threw away half of what those vendors do.
- **Vendors are keyed by ROW INDEX** (`vendorIdOf` returns `v._row`), so a job's saved
  vendor points at "row 7", not at a vendor. Deleting a row shifts every row beneath it
  and **re-sorting scrambles all of them** — either silently repoints an assignment at
  whoever now occupies that number. This happened for real on 2026-07-31 during the
  multi-category merge (rows deleted *and* re-sorted).
  - **Fixed by making the NAME the identity.** Every write site already stored
    `rec.vendorName` (plus contact/phone/pricing) at assignment time, so the row was only
    ever a hint. `resolveJobVendor(rec)` trusts the name when the two disagree, breaks a
    tie on phone, **repairs `rec.vendorId` in place** so it converges, and falls back to
    the stored name if the vendor has left the directory entirely. `_vendorRefLine` and
    all four Job Plan pickers go through it (`_selVendorId`).
  - **Money was never exposed**: `getVendorActuals` reads `rec.quote` and `rec.vendorName`
    off the job record and never looks a vendor up by row. A scrambled sheet could
    misreport a *contact*, never a cost.
  - `auditJobVendorRefs()` in the console lists any slot whose row no longer matches its
    stored name. Re-sorting the sheet is now safe.
  - Still worth doing eventually: key on the `uid` column like `quo-sync.gs` does. Less
    urgent now that resolution is name-first.
- **Several business names on one number also merge**, under the combined name, and are
  still reported — two genuinely unrelated businesses on one line is a data problem, and
  that report is where it shows. Better is to fix the sheet: O'Hara's two rows were
  renamed to one `O'Hara Landscape & Pest Control` on 2026-07-29, so it now syncs as a
  clean single contact with no conflict.
- **A shared number's role depends on who is behind it.** Partners on a switchboard get
  `Main line` — their individual titles ("Partner / Shareholder") say nothing useful
  about an incoming call. Vendors get their trades joined (`Landscaper / Pest Inspection
  / Treatment`), because there the rows are services rather than people, and that tells
  you what the call is about before you pick up.
- **Tag taxonomy** (built from closed-list fields only — `title` is deliberately NOT
  tagged: 54 distinct free-text values across 79 partners would be 54 unfilterable tags):
  partners get `Referral Partner` + `partner_type` title-cased (Estate Attorney 35,
  Wealth Manager 22, Trust Officer 21, Allied Vendor 1); vendors get `Vendor` +
  `category_group` (5 values) + `category` (42 values), giving a coarse and a precise
  filter without choosing between them; clients get `Client`. 53 distinct tags, max 3
  per contact. `role` stays as display text — it is free text and Quo cannot filter it.
- **Tags wired 2026-07-29.** The workspace "Tags" property is a multi-select custom
  field, key `6a6a05ce6910765c2ebc68b6` — an opaque id, NOT the display name, so
  renaming the property in the Quo app is safe. Blank `QUO_TAGS_FIELD_KEY` to turn
  tagging off without touching anything else.
- **A multi-select property only recognises values that exist as OPTIONS on it.** The
  API accepts and stores anything (HTTP 200, reads back fine), but the Quo app renders
  an unregistered value struck through. Typing the value into the field in the Quo app
  creates the option, and the struck-through chip then reads as valid. So the order is:
  create every option first, then re-run `pushQuoAll` — one run rewrites all 199 against
  a property that now recognises them, which beats fixing contacts by hand.
- 54 options are needed for the full taxonomy: 3 top-level (Referral Partner / Vendor /
  Client) + 4 partner types + 5 vendor groups + 42 vendor categories.
- The `customFields` payload shape is the only part not taken from the docs, so
  `testQuoTags` proves it on ONE already-synced vendor (real sync payload, defaultFields
  included so a replace-style PATCH can't blank a name) before 199 contacts depend on it.
  Run it before the first tagged `pushQuoAll`.

## Pricing & billing basis (decided 2026-07-30)
- **BUILT — T&M is the default on every service.** The concierge may quote an individual
  estimate as a firm flat fee instead, on any job **except probate and contested probate**,
  where the option is withheld outright: those expenses are court-reviewed and a flat fee
  that can't be tied back to logged time is what gets questioned. `isTMOnly(svcKey)` is the
  single source of that rule — the toggle is disabled, `calcAll` clears a stale checked box
  and reports it, and `toggleFixedPrice` guards the one entry point that writes a fee.
  Replaced a soft "confirm this is appropriate" warning that left the fee in place.
  **Estate Settlement is deliberately NOT on the list** — private engagement with a family
  or trustee, no court reviews the fee. It used to be lumped in via a `courtBilled` flag
  that conflated "estate work" with "court-supervised"; do not put it back.
  Nothing changed about the default — `e-fixed` is unchecked for every service.
- **BUILT — expedited delivery is a flat 20% premium on the TOTAL (`RUSH_PCT`), never a rate
  multiplier.** Do not "improve" this into a markup on the TC/PS hourly rates: rates outside
  NASMM norms read badly to a client comparing quotes, and a named line is clearer and easier
  to defend. A manual `e-rush` toggle, charged on the Havellin services total **after** the
  preferred-client discount (so the discount is never computed on the premium) and never on
  vendor costs. Held out of the `updateRefBox` comparison, or every rush job would read as
  above the range for its property size. Excluded on Home Prep for the same reason fixed
  price is — its whole staffing column is hidden, so the toggle isn't reachable.
  Independent of billing basis: rush applies on a T&M probate job too.
  A **sliding scale was considered and rejected** — fine brackets invite a client two days
  across a boundary to argue, and one flat number is what got chosen. If it ever gets tiered,
  key it to **compression** (natural vs requested duration) and not to runway.
  This **replaced** the runway-keyed `rushMultiplier` (1.00→1.50 over 90/60/45/30 days),
  which measured calendar distance rather than tightness — a 3-day condo with a 40-day runway
  was premiumed as a rush — and only ever reached `_fixedPriceSuggested`, so it did nothing
  on a job left hourly, i.e. every job by default. Don't reintroduce it alongside the flat
  premium; they would double-count.
- **NOT BUILT — the crew-compression discount.** Adding specialists without adding a
  concierge LOWERS the quote (~15% going 2→6 PS), because the fee depends on the **TC:PS
  ratio, not the absolute crew size** — billed hours = headcount × elapsed, and elapsed is
  inversely proportional to headcount, so scaling both sides is exactly fee-neutral while
  halving the calendar. Correctly priced (a 1:6 job really does have less concierge
  involvement) and it can't leak between jobs — a fresh job resets the slots to 2 and a
  saved estimate restores its own crew. Remaining gap: **a floor on `_fixedPriceSuggested`**,
  since the prefill is computed off the compressed solve, so toggling fixed-price *after*
  staffing up prefills the discounted number.
- **NOT BUILT — contractor concierges as real simultaneous coverage.** The highest-value
  item discussed. 2 TC + 4 PS bills identically to 1 TC + 2 PS (same fee, same hours) in
  **half the calendar**, and moves ~26 founder hours per mid-size estate onto a $60
  contractor. Three parts that must ship together: the solve has to let a 2nd concierge
  contribute production (`(n + tc·α)` — today `tcCount` is only a load check and never
  touches hours or duration), crew sizing has to scale both sides, and **the margin panel
  has to cost two engaged streams instead of one** or every dual-coverage job overstates
  margin by ~$1k.
- **NOT BUILT — α should decline with crew size.** It is a flat 50% at every crew size, which
  claims the concierge is half hands-on while directing six people. A declining curve is more
  honest and recovers roughly a third of the compression discount on its own.
- **REJECTED — a disposal-vendor offset against the `disposition` hours. Do not re-propose.**
  It looks like a double charge (disposition is 43% of the Home Cleanout pool, and haulers are
  billed at cost + 15% on top) but it is not: Havellin is the fiduciary who must review every
  item, the haulers only remove what they are told to, and Havellin often stages the discards
  by room or into the garage for pickup. Those hours are real Havellin labor. The premise also
  assumed a hoard-level volume score, and Havellin does not take hoards.

## Backlog / don't forget
- ~~Warm up the **estimate email language** — personal touch tying back to the in-home
  walkthrough. `buildEstimateMailto()`.~~ **Done 2026-07-08.**
- **Contractor tab — remaining directory upgrades.** Search, tap-to-contact, and a
  Quick/Full edit split shipped 2026-07-28. Still NOT ported from Vendors / Referral
  Partners: the status dropdown + rating under the name, the highlighted last-contact
  bar, Contacted-on-first-outreach auto-advance, edit-as-modal, and PIN-gated delete.
  Contractors live in the main sheet and the backend already has a `deleteContractor`
  action (`apps-script/main-sync.gs`), so a contractor delete is partly wired already.
- ~~ACTION REQUIRED — redeploy `vendor-directory-sync.gs` (`deleteVendor`) and
  `referral-partners-backend.gs` (`deletePartner`) for PIN-gated delete.~~
  **Redeployed 2026-07-28.** Both clear the row (not deleteRow), so row indices stay
  stable. Worth a live smoke test — first real execution was after this deploy.

## Mobile / field use (built 2026-07-28)
- A single `@media (max-width:820px)` block in `havellin.html` carries the mobile
  layout: scrolling nav strip, bottom-sheet modals, 16px inputs (stops iOS zoom-on-
  focus), stacked grids, thumb-sized buttons. It's additive and gated behind the
  breakpoint — desktop is unaffected. Put new mobile rules here rather than scattering
  breakpoints.
- **The grid trap:** `1fr` is `minmax(auto,1fr)` and that auto floor is min-content, so
  a column holding an unshrinkable child (a fixed-column table) grows wider than its
  grid and drags the whole document past the viewport. The symptom is a header/nav that
  render at viewport width against a wider scrolled page — a cut-off header with a blank
  gap. `.grid2>*,.grid3>*,.grid4>*{min-width:0}` fixes it; wrap the wide table in
  `.tbl-scroll` so it stays reachable. Reach for both together.
- Vendors, Referral Partners and Contractors all follow the same field pattern:
  free-text search (multi-word AND-ed, numeric queries match the digit-stripped phone)
  → tap-to-call/text/email → **Quick edit** (contact details only, diff-only patch,
  phones compared digit-wise) with a **Full edit** escape hatch. Keep new directories
  consistent with this.
- All 12 tabs verified at 390 / 768 / 1440px with zero horizontal overflow. Build
  Estimate is deliberately desk/iPad-first for data entry — its room tables scroll
  inside `.tbl-scroll` rather than being reflowed.
- **The dashboard drilldown was missed by the original sweep** (fixed 2026-07-28). The
  tab-level overflow check passes on an *empty* Client Dashboard — the drilldown only
  renders once you open a job, so none of its grids were ever measured. `.d-grid4` was
  still running four ~80px columns on a phone and the 8-step lifecycle strip ~42px a
  step, so labels overlapped outright. Now: `.d-grid4` → 2 columns, `.d-split2` (a new
  class replacing two inline `1fr 1fr` grids) → single-file, and the lifecycle strip +
  hours-log table scroll inside `.tbl-scroll`. **When measuring a tab, populate it and
  open its detail view first** — an empty state proves nothing.
- Two selectors in the phone block are load-bearing against everything else in it:
  `.card div{min-width:0}` and `.card div{flex-wrap:wrap}`. Anything that needs a real
  minimum width or a nowrap flex row has to out-specify them (`.tl-strip .tl-step`) or
  set it inline — a bare single-class rule silently loses.
- Not done: the table→card flip for the Client Dashboard client list (it sits in a
  sideways-scrolling container today). Invoices + Inventory were only measured from an
  empty state — re-check them with a populated job before calling them verified.
