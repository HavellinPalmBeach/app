# Stripe Payments — Scope

**Status: SCOPE ONLY. Nothing built.** Anthony, 2026-09-18: *"what needs to be done to integrate
Stripe payments? i only want to accept ACH to avoid the 3% fee, unless we can add a 3%
'convenience fee' to cover the credit card processing fee. otherwise it's too expensive. scope
this out before doing anything."*

Read `UNEARNED_REVENUE_SPEC.md` §6 alongside this — the payment record, the three stages and the
`clearedOn` distinction are already built and are not re-scoped here.

---

## 1. The headline: ACH-only is right, and the 3% convenience fee cannot be built as described

Two independent findings, either one fatal on its own.

### ⚠⚠ 1a. It is a SURCHARGE, not a convenience fee, and the two are different things under card rules

A **convenience fee** under Visa/Mastercard rules must be a **flat amount**, must be charged for an
**alternative payment channel** (paying online instead of the merchant's normal in-person channel),
and **cannot be charged in a card-not-present-only environment**. Havellin takes cards online and
only online, and the fee Anthony described is a percentage. It fails all three tests.

What he is describing is a **surcharge**. That is permitted, but it carries a different rulebook:
credit cards only, percentage capped, advance notice to the acquirer, disclosure at four points.

### ⚠⚠ 1b. A 3% surcharge is non-compliant on EVERY payment Havellin will ever take

The cap is **the lower of 3% (Visa) or your actual cost of acceptance**. Stripe's online card rate
is **2.9% + $0.30**, so the blended rate is `0.029 + 0.30/x` — always *above* 2.9%, approaching it
from above as the amount grows.

Set that ≥ 3% and solve: `0.30/x ≥ 0.001` → **x ≤ $300**.

**A 3% surcharge is only compliant on transactions of $300 or less.** Havellin's smallest payment is
the 25% final on its smallest job — thousands of dollars. On the real $25,715 estate job this repo
already uses as a worked example:

| | amount | actual cost of acceptance | 3% surcharge | verdict |
|---|---|---|---|---|
| Deposit (50%) | $12,858 | $373.18 (**2.9023%**) | $385.74 | **over by $12.56 — non-compliant** |
| Midpoint (25%) | $6,429 | $186.74 (2.9047%) | $192.87 | **over by $6.13 — non-compliant** |
| Final (25%) | $6,428 | $186.71 (2.9047%) | $192.84 | **over by $6.13 — non-compliant** |

The compliant ceiling is **2.90%**, and at 2.90% you recover $372.88 of a $373.18 cost — you still
eat the 30¢. So the maximum legal surcharge recovers **99.92%** of the fee and requires the entire
compliance build below. It does not "cover the credit card processing fee"; it very nearly covers it.

**⚠ Visa has designated 2026 a high-enforcement year** for surcharge audits and fines. This is a bad
year to be 3% when the ceiling is 2.9%.

### 1c. What surcharging would actually cost to build

Not a number in a config file:

- **Debit and prepaid cards can NEVER be surcharged**, in any state, under any circumstances
  (Durbin / network rules). So checkout must detect credit-vs-debit *before* pricing. Stripe does
  not do this natively — its automatic surcharge requires a **third-party app (Yeeld or
  InterPayments)** installed from the Dashboard marketplace, with its own onboarding and its own fee.
- **Only the Payment Element supports automatic surcharge.** Not Payment Links, which is what
  `generateStripeLink` produces today. The whole send path would be rebuilt.
- **30 days' written notice to the acquirer** before switching it on, naming the amount and whether
  you are surcharging brand-level or product-level (you must pick one, not both).
- **Disclosure at four points**: checkout page, receipt, the estimate and the agreement. §3.x of both
  agreement forms would need a clause, which is a contract change.
- Florida: Fla. Stat. §501.0117 still bans surcharging on the books but is **unenforceable** —
  *Dana's Railroad Supply v. Bondi* (11th Cir. 2015) held it violates the First Amendment. So it is
  effectively legal here, but it is legal by way of a dead statute and a circuit opinion, which is a
  sentence worth having counsel read before it goes on a signed contract.

### 1d. DECIDED 2026-09-18 — no cards at all

Anthony, asked directly: **"No cards at all."** So surcharging is not built, and the question is
closed rather than deferred. Accept **ACH, wire and cheque**.

- Havellin's payers are trust officers, estate attorneys and executors. CLAUDE.md already records
  that *"cheques are the NORMAL payment path"* and that *"a wire beats both, being final on receipt —
  which is also what trust officers and law firms do routinely."* This is not a card-paying client base.
- `UNEARNED_REVENUE_SPEC.md` §6c **already requires wire or cashier's cheque above $10,000**, and the
  deposit on a typical job is above $10,000. So the largest payment on most jobs is already routed
  away from cards by existing policy.
- If a client genuinely insists on a card, that is a one-off conversation where the fee is quoted by
  hand — not a feature, not a compliance surface, and not a third-party app subscription.

**The honest alternative if cards are ever wanted: a cash/ACH discount rather than a card surcharge.**
Discounting is legal in all 50 states, needs no network notice, has no debit exclusion and no cap. It
means raising the headline rate ~3% and discounting back — which touches the engine, both agreement
forms and every client document. Mentioned for completeness; not recommended at year-one volume.

---

## 2. What ACH actually costs, and what it saves

Stripe ACH Direct Debit is **0.8%, capped at $5.00**. The cap binds above $625, so every Havellin
payment pays exactly $5. Instant bank verification via Financial Connections is **$1.50 per
successful verification**, once per client.

Same $25,715 job:

| | card (2.9% + 30¢) | ACH (0.8%, $5 cap) |
|---|---|---|
| Deposit $12,858 | $373.18 | $5.00 |
| Midpoint $6,429 | $186.74 | $5.00 |
| Final $6,428 | $186.71 | $5.00 |
| Bank verification | — | $1.50 (once) |
| **Total** | **$746.63** | **$16.50** |

**$730 per job.** At a realistic year-one volume of 2–10 jobs that is $1,460–$7,300, and it scales
with the business. Anthony's instinct is correct and the margin is not close.

**⚠ Do not add Stripe Invoicing (0.4% per paid invoice).** Havellin generates its own invoices —
`invoiceHtml` is a 439-line builder and the document is already the record. Routing through Stripe
Invoicing would add 0.4% to buy a second, differently-worded invoice that could disagree with ours.
Payment Links carry no such fee.

---

## 3. ⚠⚠ THE BLOCKER WITH A LEAD TIME: Stripe's default ACH limits are BELOW Havellin's deposit

New Stripe accounts carry a starting ACH debit ceiling reported at roughly **$6,000 per transaction
and $10,000 per week**, lifted only after a probationary period (commonly cited as 120 days) that
**begins at the first payment, not at account creation**.

**The deposit on the worked example above is $12,858.** On a $50,000 job it is $25,000. So ACH-only,
switched on cold, **fails on the first real client** — and fails as a declined payment in front of an
executor, not as an error in a log.

This is the one item with a calendar on it, and Havellin launches Q4 2026.

- ⚠ The exact figures are account-specific and are third-party reported, not read from Stripe's own
  docs (`docs.stripe.com` is blocked by this environment's egress proxy). **Confirm them with Stripe
  directly** — but confirm them early, because the remedy is a sales conversation plus a waiting period.
- **Action now, not at launch:** finish the account, enable ACH, run one small live ACH payment to
  start the clock, and open the limit-increase request citing expected ticket sizes of $6k–$25k.

---

## 4. What is already built and must not be rebuilt

Checked in source, not assumed:

| | state |
|---|---|
| Three payment stages (`PAYMENT_STAGES`, `stagePaidTotal`, `jobPaidTotal`) | **built** |
| Payment record with amount / date / method / reference / payer / evidence photo | **built** |
| Cheque · cashier's cheque · wire · card · cash methods | **built** — do not "add" these again |
| `clearedOn` — received vs cleared | **built** |
| Short-deposit challenge against `depositTargetFor` | **built** |
| `isJobFunded` → hours logging gate | **built**, and has no override by design |
| Per-device `id` vs cross-device `uid` merge key on a payment | **built** — `uid` is the merge key |
| `generateStripeLink` — send-only payment link, honest failure reporting | **built** |
| Anything reading BACK from Stripe | **none** — no webhook, no `clearedOn` write, no auto-record |

---

## 5. ⚠⚠ The webhook problem is the DocuSign problem again, and the answer is already in the repo

**Apps Script's `doPost(e)` does not expose request HEADERS.** Stripe signs every webhook with the
`Stripe-Signature` header and offers no query-parameter alternative. So an Apps Script webhook
endpoint **cannot verify that a delivery came from Stripe** — leaving an unauthenticated URL on a
public-repo project that marks a $12,858 deposit as received and unlocks hours logging on the job.
That is the identical finding recorded for DocuSign Connect on 2026-09-11, and it holds verbatim.

Two ways out, and unlike DocuSign both are genuinely open:

- **(a) Accept unauthenticated, then verify by callback.** Take the event id off the body, then
  `GET /v1/events/{id}` with the secret key. If Stripe confirms it, it is real. Replay is harmless
  provided the handler is idempotent on the payment-intent id. This closes the hole completely.
- **(b) Poll on arrival — reuse the `esignRefresh` pattern shipped 2026-09-17.** ⚠ **The DocuSign
  hazard does not transfer**: DocuSign publishes a hard one-request-per-resource-per-15-minutes floor
  and names *revocation* as the penalty. Stripe has no such rule; its read limit is ~100 requests per
  second. So polling is free of the thing that made it dangerous there.

**Recommend (b).** The shape already exists, is two weeks old and is tested — `outstandingEnvelopes` →
`outstandingPayments`, `_esignDue` → `_payDue`, `esignRefresh` → `payRefresh`, wired to `_jobsLanded`
and `openClientDashboard`. It adds no new attack surface and no new public URL. **ACH takes ~4 business
days to settle anyway**, so arrival-triggered checking loses nothing a webhook would have bought.

---

## 6. ⚠⚠ A live defect ACH would trigger: `stripe` is on the clears-on-receipt list

`havellin.html:11326`:

```js
var clearsOnReceipt = (method === 'wire' || method === 'stripe' || method === 'cash');
```

Correct for a **card** — authorised funds are final on receipt. **Wrong for ACH**, and dangerously so:

- ACH takes **~4 business days to settle**.
- `R01` (insufficient funds) returns typically within **2 business days**.
- **Unauthorised returns (`R05`/`R07`/`R10`) have a 60-calendar-day window on consumer accounts**, and
  under NACHA rules those **cannot be re-presented**.

So an ACH deposit recorded today stamps `clearedOn` immediately, flips `isJobFunded`, unlocks hours
logging, and the crew works a $25,000 estate against money that can come back **sixty days later** with
no re-presentment. That is a worse exposure than the cheque case the `clearedOn` field was built for,
because a cheque at least bounces within days.

**Fix: split the method.** `stripe_card` clears on receipt; `stripe_ach` does not, and is cleared only
when Stripe reports the payment intent `succeeded`. The existing `clearedOn` model is exactly right —
it is only the classification that is wrong.

---

## 7. Build order

Forced, not preferred — same reasoning as `LIFECYCLE_AUDIT.md` §7a.

### Phase 0 — account and limits (Anthony, no code) · **START NOW**
Settings already says *"configure after EIN + account setup"*, so this is gated on the EIN.
1. Finish the Stripe account; enable ACH Direct Debit (`us_bank_account`).
2. Run one small live ACH payment to start the limit-probation clock.
3. Open the limit-increase request, citing $6k–$25k tickets.
4. Decide cards: **off** (recommended) / on absorbing the fee / on with a 2.9% surcharge.

### ⚠ Phase 1 — restrict to ACH · **BLOCKED, and this is the literal answer to the question asked**
The change is one setting — `payment_method_types: ['us_bank_account']` on the Checkout Session or
Payment Link — **and it is in a file this repo does not have.** `STRIPE_SCRIPT_URL` points at a
separate Apps Script that is not in `apps-script/`. Its source has to be recovered from the Apps
Script editor before Phase 1 can even be estimated, let alone written.

**This is the first thing to unblock.** Until then, "only accept ACH" cannot be implemented at all.

Also here: Financial Connections for instant verification, with the microdeposit fallback (1–2 days)
for institutions it does not cover, and a decision on whether a client waiting two days to verify is
acceptable on a deposit that gates the job start.

### Phase 2 — the payment-method model · **✅ BUILT 2026-09-18** (app-only, no redeploy)
Done ahead of the rest because it is the one piece nothing blocks, and it has to be in place
*before* the first ACH dollar moves rather than after.

- `PAYMENT_METHODS_CLEAR_ON_RECEIPT` is now the one definition, replacing the inline `||` chain
  at the single write site in `saveDeposit`. `stripe_ach` is absent and carries a comment saying
  it must never be added.
- Deposit modal offers **Bank transfer (ACH)**; `stripe` is relabelled from *Card / Stripe* to
  plain **Card**, since with ACH also running through Stripe the processor name no longer says
  which rail it is.
- `updateDepModalHints` gains an ACH arm: names the ~4-business-day settlement, says it will read
  *uncleared* until then, and says outright that **this does not hold the job up**. Flags, never
  refuses.
- ⚠ Legacy `stripe` records are **not migrated**, deliberately — every one of them really was a
  card, and rewriting them would assert an uncleared state that never existed.
- **37 committed checks** (`tests/stripe-payments.test.js`), driving the real `saveDeposit`.
  **All five changes revert-verified individually, ZERO green** — the clear-on-receipt defect
  fails 5 in both of its forms, the modal arm 5, the dropdown and the label map 2 each.
- Verified in headless Chromium on the real page: seven methods in the dropdown, the list reads
  `["wire","stripe","cash"]`, the ACH hint paints at $12,858 **with** the wire note and at $400
  **without** it, cheque and card branches unmoved, overflow **0** at 1440 and 390px, no page errors.
- Manual §8's *"Wires, cards and cash are marked cleared on receipt; cheques show as uncleared"*
  was falsified by this and is corrected in both copies.

### Phase 3 — read-back (the real work) · **⚠ REQUIRES AN APPS SCRIPT REDEPLOY**
- New `stripeStatus` action in `main-sync.gs`; add to `BACKEND_ACTIONS`, bump `BACKEND_VERSION`.
  The dispatch-parity test asserts `BACKEND_ACTIONS` matches `doPost` in both directions, so a
  partial landing fails the suite — which is correct.
- `outstandingPayments()` / `_payDue()` / `payRefresh()` on the `esignRefresh` shape (§5).
- Auto-record the payment on `succeeded`; write `clearedOn` only then.
- ⚠ **Sequential, never `Promise.all`** — every store write takes the global Apps Script lock, and
  this repo records what parallel sending cost on 2026-09-11.
- ⚠ **Idempotent on the payment-intent id**, never on `payment.id` — that is a per-device counter and
  two devices both mint the same number.
- ⚠ **A failed check must not stamp `checkedAt`**, and must say so rather than failing silently — the
  same two rules the e-signature check already follows.
- Secrets in Script Properties only. This repo is public and `havellin.html` is served from Pages.

### Phase 4 — surcharging · **scoped in §1c, recommended against**

---

## 8. Test plan

New `tests/stripe-payments.test.js`, in the same commit as the code:

- ACH does not clear on receipt; card does. Both directions.
- A returned/failed ACH payment does not leave the job funded.
- Read-back is idempotent: the same payment intent applied twice records one payment.
- A failed status check leaves `checkedAt` unmoved and says so.
- `outstandingPayments` drops a payment once recorded, or it is asked about forever.
- `BACKEND_ACTIONS` ↔ `doPost` parity (existing test, will catch a partial Phase 3).
- No Stripe secret key anywhere in the repo.
- ⚠ Revert-verify every change individually. A green revert means the test could not fail — this
  repo records that happening eighteen times.

---

## 9. Open questions for Anthony

1. ~~**Cards off entirely?**~~ **ANSWERED 2026-09-18 — no cards at all.** See §1d. *Kept rather than
   deleted, per the standing rule that a fixed flag left standing reads as outstanding work.*
2. ~~**Who owns the ACH-return exposure?**~~ **ANSWERED — accepted as a business risk.** Anthony:
   *"we obviously can't wait 2 months to start a job. not sure how we deal with 60 day return? but
   that seems unlikely to me, so a risk worth taking."* Correct, and it is not waitable in any
   case — no firm delays a job two months. ⚠ **It still wants an agreement clause**, and it sits
   next to the retained-deposit clause `LIFECYCLE_AUDIT.md` §8.6 already flags as needing counsel.
   Nothing in the app can fix it, and nothing in the app now pretends to.
3. **Is the separate Stripe Apps Script recoverable?** ⚠ Phase 1 is blocked without its source, and
   Phase 1 is the literal answer to "only accept ACH". **This is the one open blocker.**
4. **Microdeposit fallback acceptable?** A client whose bank is not on Financial Connections waits
   1–2 days to verify before the deposit can even be paid, which delays the job start.
