# Havellin Palm Beach: working notes for Claude

This file is loaded into every session, so it holds only what is true now: how to work here, how the app is built, and what has been decided. It is not a changelog.
- The story behind every rule (what was asked, found, measured and reverted) is in `BUILD_HISTORY.md`, newest first, including the old 1.5 MB text of this file verbatim. Before changing an area you do not know, search it for the function or feature name (use a head limit; its lines are long). Its entries describe the app as it was when written; where one disagrees with this file, this file is meant to be right, so fix whichever is wrong.
- When a build changes a rule, edit the rule here in place and put the story in `BUILD_HISTORY.md`. Never add dated build entries here: that is how this file reached 16,000 lines and about 400K tokens per session.

## Who and what
- Havellin Palm Beach: white-glove downsizing, move management, cleanouts and estate work in Palm Beach County, launching Q4 2026. Anthony Graziano and Ashley Jerome run it and are its concierges; Anthony Graziano Jr is a property specialist. Prelaunch: every client in the app is dummy data.
- Anthony decides pricing, policy, legal wording and anything a client reads. Recommend, ask, then record the answer here as a rule. Fix what was asked; list what you find in passing under Open work instead of widening the commit.
- The app is `havellin.html`: one file of HTML, CSS and JS with no build step, served by GitHub Pages from `main`. Data lives in Google Sheets and Drive behind Google Apps Script web apps. Settings (per device) holds the three Apps Script URLs, the default production rate and cost rates, and an optional Gmail client id override.

## Every session
### Start
- `git config user.email noreply@anthropic.com && git config user.name Claude`. Never pass `--author`; if a hook objects to the author, `git commit --amend --no-edit --reset-author` before pushing.
- Work on the branch the harness assigned. Branch names are not recorded here.
- Other sessions push to `main` all day: `git fetch origin main` and merge it before you start and again before you push.

### Before each commit
1. `npm test` (about two minutes) ends `N passed, 0 failed`. Read the count: a suite that runs zero checks fails on purpose, and a smaller total after a merge means a test group was dropped.
2. Revert-verify each change: undo it, watch the suite go red, restore it (see Revert sweeps). A change whose revert stays green is either untested or belt-and-braces; say which in the code and the history.
3. Anything a person sees or presses gets a browser step driven through the real controls (see Browser checks).
4. Read `git diff --stat` and the diff. A scripted edit to this 2.7 MB file once deleted 368 lines of CSS while every test passed.
5. If `havellin.html` changed, run `tools/stamp-build.sh` (it reads the Eastern clock itself; never hand-edit the stamp). Docs-only commits do not restamp.
6. If behaviour a person sees changed, update the manual and the playbook, HTML and markdown, in the same commit (see Documentation).
7. If an `apps-script/*.gs` file changed, bump `BACKEND_VERSION` and tell Anthony plainly that a redeploy is needed and what stays broken until it happens.
8. Update the rules here; add a `BUILD_HISTORY.md` entry; take fixed items off Open work. If an audit pack landed, tick it in `WORKFLOW_AUDIT_2026-09-28.md` and mark its findings fixed (never delete them).
9. End the commit message with the attribution lines the harness gives you.

### Push
- `git push -u origin HEAD`, then `git push origin HEAD:main`, and leave the branch equal to `main`. Pages serves `main`: skip the second push and every phone keeps the old build.
- If `main` rejects the push, another session landed first: merge `origin/main`, re-test, push both.
- The harness asks for a draft PR. Open it after the branch push and before the `main` push, so it records the diff; once `main` holds the commit GitHub marks it merged, and a PR opened after that is refused ("No commits between"), which is expected.

### Merging concurrent work
- Merge; never rebase or force-push anything another session may hold.
- Build stamp: take either side, then rerun `tools/stamp-build.sh`.
- Pinned `fns:` / `vars:` lists in test sandboxes: take the union. When a function grows a call to a new helper, every sandbox that lifts it breaks; search all of `tests/` for that function at once rather than fixing one failure per round.
- Browser steps: the step already on `main` keeps its number; renumber yours to the next free one and extend the default list in `tests/browser/run.sh`.
- This file: keep both sides' rule edits. A branch still adding a dated entry to the old 1.5 MB CLAUDE.md: take `main`'s CLAUDE.md and move the entry to the top of `BUILD_HISTORY.md`.
- Verify by suite, not by total: each file's check count should equal ours + theirs − base.

## How this codebase is built
The recurring lessons, each learned from a defect that shipped.
- One definition per rule, read everywhere: a predicate, a catalogue or a namer, with a test counting its call sites. Most serious defects here were two copies of one rule drifting apart.
- Enforce a rule where the record is written, not only in what a control offers: the handler behind a button asks the same question as the button.
- A person's edit moves the record's clock and syncs it; a write the app makes on its own never does (see Data, sync and merges).
- Removal is a recorded act (a tombstone, a void, a stamped removal), never an absence.
- An empty store is unread until proven otherwise: say "loading" or "unreachable", never "none".
- A value that decided a job is pinned to the job (the production rate, cost rates, the rush percentage, the documentation scope, the signature route), so changing Settings never reprices a quote.
- A document is checked by adding up its own rows. Never print a claim the app did not witness (sent, filed, notified, outstanding).
- Flag and explain; refuse only where nobody has standing to override (an NFA transport, hours before the deposit, a final with no hours logged).
- Measure, don't assert: figures in comments and documents come off the rendered page.
- A control offered in one state and gone in the next is unreachable exactly when it is needed: check the control is on screen in every state where its rule applies.

## Repository map
- `havellin.html` (2.7 MB): the whole app. Code is top-level `function`s and `var`s, which the tests lift by name.
- `apps-script/main-sync.gs`, `saveInventory.gs`, `quo-sync.gs`: one Apps Script project and one deployment (the jobs backend): the stores, the job ledger, Drive folders and files, PDF conversion, DocuSign, Stripe, Agent One and the Quo dialer sync.
- `referral-partners-backend.gs`, `vendor-directory-sync.gs` (repo root): two separate Apps Script projects, each bound to its own spreadsheet with its own URL in Settings.
- `manual.html` (the operations manual) and `concierge-guide.html` (the job playbook), each with a hand-maintained markdown copy (`MANUAL.md`, `CONCIERGE_GUIDE.md`). `firearms-protocol.html` is the live field procedure the app links to.
- `tests/harness.js`, `tests/run.js` and one `*.test.js` per area; `tests/browser/stepN.js` and `run.sh`.
- `tools/stamp-build.sh` (the only way to stamp); `tools/retire-branches.sh` with `BRANCH_ARCHIVE.md` (deleted branches and their tip SHAs).
- `WORKFLOW_AUDIT_2026-09-28.md`: the tracker for open work (fix packs, questions and answers, Anthony's own items). Read it before building a pack.
- `COUNSEL_REVIEW_BUNDLE.md`: every legal text drafted here, collected for counsel.
- Specs, each still the best explanation of its area: `ESTATE_SCOPE_SPEC.md`, `ESTATE_DOCUMENTATION_SPEC.md`, `INVENTORY_WORKSPACE_SPEC.md`, `AGENT_ONE_SPEC.md`, `STRIPE_PAYMENTS_SPEC.md`, `LIFECYCLE_AUDIT.md`, `UNEARNED_REVENUE_SPEC.md` and `TIME_TRACKING_INTEGRATION_SPEC.md` (QuickBooks; not built). `PRICING_SCHEMA.md` is historical: price from the engine.

## Testing
### The harness
- Booting the whole file in jsdom times out. `tests/harness.js` lifts `function NAME(` blocks and top-level `var`s out of `havellin.html` (and the `.gs` files) by source text and runs them in a `vm` sandbox, `sandbox({fns, vars, stubs})`, so the code under test is the real code.
- A lifted function overrides a stub of the same name. Lift the real rule rather than stubbing it: a stub is how the two ends of one rule drift apart without any test noticing.
- `domStub(seed)` runs screen code: elements are minted on demand and remembered, so a test can read the screen back. Minting means no id is ever absent: to test a save that treats an unrendered control differently from a cleared one, wrap `getElementById` to answer null for ids the rendered markup lacks (see `edit-client-intake-rules.test.js`). It parses no markup and knows nothing of display; seed what the browser would hold, and prove the join in a browser.
- `driveCalcAll(opts)` runs the real pricing engine. Build pricing tests on it, never on seeded rooms that happen to sum to the totals.
- `group(name, fn)` runs its body; a file that runs zero checks fails; `run.js` prints each file's count.

### Tests that can fail
- Assert what a reader checks: the rendered text, the balance the client pays, what the job collects. A flag, or a figure worked out by hand, can agree with the defect.
- Drive the join, not only the pieces. The commonest gap here is every piece tested alone and nothing checking that they meet.
- A fixture must not hand the code the answer, and must satisfy every step before the one being measured.
- Stubs must match the real contract (the harness's `fmtDate2` stub returns `''` where the real one returns `'—'`; lift the real one for date or format tests).
- Source-text `has()` cannot tell live code from a disabled branch, and two source indices are not an ordering: drive behaviour where you can. When you must read source, strip comments line by line (a block-comment regex eats about 170 KB here because of `accept="image/*"`) and assert the stripped text is still most of the file. Needles also match the comment that explains the fix, and neighbouring lines: bound the slice and count the matches.
- `src.slice(src.indexOf(x))` quietly shrinks to one character when `x` stops matching; anchor on the function name and check the slice.
- Read results defensively, so a revert fails its assertions instead of throwing and leaving the rest of the file unrun.
- Never read the clock in a test. Date code runs with `process.env.TZ = 'America/New_York'`.
- A synchronous thenable must unwrap like a real promise; to measure overlap, keep it pending until the test answers it.

### Revert sweeps
- Work on a copy: `tar` the tree without `.git` into the scratchpad (a copy of only `havellin.html` and `tests/` gives a false baseline, since suites read the `.gs` files and the documents). Never run a suite against a file a sweep is mutating.
- Per change: snapshot, apply the revert, assert the needle matched the expected number of times and the replacement landed, run, restore in a `finally`. Never restore with `git checkout`: it discards every uncommitted change (one sweep reported fifteen green reverts over code it had erased).
- The baseline is 0 failed before and after. After an interrupted sweep, check the tree first: a non-zero baseline invalidates every result.
- Run the sweep with `python3 -u` writing to a file (a `| tail` pipe buffers the output and swallows the exit code). Wait on a pid or the result file, never `pgrep -f` (or `pkill -f`) a string your own shell's command line contains: it matches, and kills, the shell.

### Browser checks
- `playwright` is deliberately not a repo dependency: install it outside the repo (`npm install --prefix <dir> playwright`; the environment skips the browser download) and run `NODE_PATH=<dir>/node_modules npm run test:browser`, or `tests/browser/run.sh 12 40` for chosen steps. Steps launch `/opt/pw-browsers/chromium`.
- Each step drives the real page, prints `N passed, M failed`, closes its browser in its `catch`, and runs under a ten-minute ceiling. A new behaviour gets a new step; rerun the older steps as regressions.
- Press the control: `page.evaluate` on a handler proves the handler, not that a person can reach it.
- Measure horizontal overflow at 1440 and 390 px, zero page errors, and print media for documents.
- Traps: the option is `viewport`, not `viewportSize`; `innerText` applies `text-transform` (use `textContent`); `document.body.innerHTML` contains the app's whole script, so read a container; populate a record and open its detail view before measuring (an empty state proves nothing); Save Client lands on the new client's dashboard, so reopen what you meant to measure; simulate offline by aborting requests to a configured URL, not by leaving the URL unset; `offsetParent` is always null inside a `position:fixed` modal, so test visibility with `checkVisibility()`.

## Documentation
- `manual.html` is the system-of-record reference: setup, backends, the engine, every screen. `concierge-guide.html` is the playbook: one job from intake to final invoice, what to press, what the app will refuse, and a symptom-to-cause table. Keep the split: no Apps Script URLs or engine formulas in the playbook.
- The `.md` copies are hand-edited to match in the same commit (there is no converter in the repo). Check parity claim by claim across all four files.
- `tests/doc-structure.test.js` checks what the nesting means (headings in the page column, no note inside a note); a tag count passes a stray close that cancels a missing one.
- Each document's phone block is `@media screen and (max-width:820px)`: Chrome lays Letter out at about 739 px, so an unscoped phone rule cuts off printed tables. Keep `break-inside:avoid` on notes and tables, never on lists that can outrun a page.
- A behaviour change updates every sentence that described the old behaviour, including any that said something could not be done. Say what changed rather than silently rewriting.
- Last reconciled with the app: 2026-09-30 (P9, P14). Audit pack P13 is the full pass still owed.

## Architecture
### Screens
- Six tabs: Client Dashboard, Job Plan and Job Admin & Inv on the left; Contractors, Vendors and Referral Partners on the right (a `.nav-gap` spacer). Field mode on a phone shows three: Clients, Job Plan, Vendors.
- Client Intake (+ Add New Client) and Build Estimate (the band's Build estimate) are full screens off the dashboard: in through `_showDashScreen`, out through `goToClientDashboard(jobId, kind, msg)` (nav first, drilldown second, notice last). Their panels, and those of the retired Client Estimate, Agreement and Invoices tabs, stay in the DOM because loaders and readers address them by id: remove a nav button, never a panel.
- Build Estimate: `openEstimateScreen` resumes unsaved work on the same client and opens another client's saved estimate through the one reset, `resetEstimateJobState` (its test derives the controls to reset from what `calcAll` reads). Reset gives a blank estimate for this client and leaves the saved one untouched, and is refused on a locked estimate; Start over reopens the client, so a saved estimate comes back. Both ask first and both clear the device's unsaved-draft copy.
- `renderClientDashboard` rewrites the drilldown with `innerHTML` on every redraw, including the 15-second remote tick. Notices go through `_docNotice` (painted once, kept through background redraws via `_asBackgroundRedraw`); the document viewer lives outside it.
- The timeline (`jobTimeline`, DOM-free) derives each milestone from the record that owns it, never from `job.status`, which estimate events overwrite. Exactly one row is lit (current or blocked), and a blocked row prints its reason and its fix on screen (a tooltip is unreachable on an iPad). The band names the step as an imperative (`JT_NEXT`), carries exactly one filled button, and a tray with the current document; the strip at the foot is the archive of earlier documents. The utility bar holds only what is not a step: Edit Client, Walkthrough, Drive. No control renders twice. On a desk the same rows draw as a two-leg track that breaks at Agreement signed.
- Dashboard handlers call functions written for the old tabs, which read tab globals. Every `dash*` handler primes first (`_primeEstimateFor`, `_primeAgreementFor`) and refuses if it cannot; without that a PIN approves another client's estimate. `_jobBandHost()` says which screen owns the band.
- Client Intake and Edit Client ask one set of rules. Required fields are `clientMissingFields` (DOM-free), asked by both saves; Edit Client refuses only a save that would clear a required field and names older gaps after saving (`dashNotice`). Edit Client never writes back a control it did not render (the element is absent, so the save keeps the record's value), and every picker is its catalogue plus the job's current value marked as recorded (the modal's own `sel()` does this for every plain select, property type included): `conciergeOptionsHtml` (the active roster), `executorRoleOptionsHtml` (`EXECUTOR_ROLES`, which also builds intake's select), `referralSourceOptionsHtml` (`REFERRAL_SOURCES`), `referralPartnerOptionsHtml`. The referral fields are read as the form shows them (`readReferralInputs`: a hidden partner is not saved). Dates out of order are kept and flagged in red, never cleared (`dateChainConflicts`, painted by `paintDateChainFlag`; Q18); weekends are refused as picked. A street address already on file is named at intake, never refused (`jobsAtAddress`, Q16). An estate switch puts the typed phone and email aside (`dataset.stash`) rather than wiping them, and the reset clears what the last client left on the controls (the documentation level's `preGate`, the date minimums, the stash, the referral block).
- Job Plan and Job Admin & Inv share the selected client (`setCurrentJob` / `adoptCurrentJob`; session state, never saved). `openJobPlanFor(jobId, fold)` opens a plan from elsewhere.
- Client list: six filters (All, Active, Pending Approval, Unassigned TC, Closed, Lost), every column sortable (service in catalogue order, blanks last), and the Win / Loss row painted by `renderJobs`, with Won and Lost lists. A settled job has no ✕.
- CSS is one stylesheet, the first `<style>` block, with one phone block at `max-width:820px`. Grid children need `min-width:0`; wide tables go in `.tbl-scroll`. The global `input,select,textarea{width:100%}` makes a bare checkbox full width and an `auto` flex basis fill its row.

### Data, sync and merges
- Each device caches in localStorage; the main sheet is the truth and `loadJobs` overwrites the cache from it. The main sheet holds the `Jobs` tab (one JSON record per job) and JSON blobs chunked down column B: `EstimateStore`, `JobPlanStore`, `LogStore` (hours), `ChangeOrderStore`, `MediaStore` (the inventory manifest), `ContractorStore`, `JobLedger`. The `Estimates` and `Hours` tabs are fossils nothing writes.
- Writes go through the outbox one at a time (`_flushOutbox`): every store write takes the deployment-wide script lock, so parallel sends collide with themselves. `queuedPostSync` is the only road to the main sheet (`_syncWriteSeq` counts on that). Failed writes wait in `_pendingWrites` (memory only: too large for localStorage, which the manifest needs) and retry serially with backoff; after `SYNC_STUCK_TRIES` the chip says so, but retrying never stops. `beforeunload` challenges only while writes are outstanding.
- `_backendErrorKind(text, fromServer, body)`: only words the server sent may diagnose the server. `stale` ("Unknown type", or "Unknown action" for an action we asked for) means redeploy; `route` (a store write answered by `doGet`: the POST was redirected into a GET, usually by a browser signed into several Google accounts) means check the URL and the deployment's access, not redeploy; `crash` prescribes nothing; anything else retries.
- Refreshes (`refreshJobsFromCloud`, `refreshPlanAndLogFromCloud`) stand down while this device owes the sheet a write, never redraw over a focused input, and redraw only on a real change. Both also refuse an answer if a write was queued while it was out (`_syncWriteSeq` moved, or a write is outstanding when it lands).
- Cold cache: an empty store is unread, not empty. `_estStoreState` and `_jobsState` are `loading`, `ready` or `offline`; `_estStoreLanded` and `_jobsLanded` repaint whatever is on screen when the data lands.
- Server merges:
  - Jobs: the newer whole record wins the scalars; keyed sub-records merge key by key on `job.at['kind:key']` stamps (`JOB_KEYED_MAPS` = `docState`, `mustFound`, the four sourcing maps, `crew` by its top-level parts, `vendorRatings`, `reviewAsk` by field, `houseFlags` by row; also `payments` by `uid`, `appraisers`, `invSnapshots`). An unstamped key is the weakest claim; a stamp with no value is a removal; absence alone never is, so every writer that deletes a key in one of these maps stamps it. A writer that rebuilds a whole map stamps only the keys it changed (`_stampChangedKeys`; the crew writers pass `_crewSnap` to `_crewSave`); stamping a key a device merely carried lets its stale copy of that key win.
  - Job plans: key by key on `plan.at` (rooms, collections, notes, tasks). Estimates: the newer record per job (`_mergeStoreByKey`), which is right for a priced snapshot and for nothing two people edit halves of.
  - The manifest: per item on `updatedAt`, with removals as `deletedAt` tombstones. The custody log unions by event id and a void beats a live copy. `INV_STICKY_FIELDS` (release authority, receipt, Drive provenance, import guards, serial) survive a newer record that lacks them unless `clearedAt` records a deliberate clear; an issued `itemNo` survives from either side. The app (`mergeMediaItems`) and the server (`_mergeMediaItems`) carry the same rule and a test runs both.
  - `JobLedger` remembers every job id the sheet has held. An id seen and now absent was deleted, and every job-keyed write for it is refused (`dropped` in the response); a never-seen id older than the ledger is refused too. The orphan sweep acts only on the deleted verdict and stands down on an empty Jobs sheet.
- The job's clock: a person's edit stamps the job and syncs it, through `_saveJobEdit(job, kind, key)`. `saveJobs()` alone fills `updatedAt` only when missing, so such an edit loses the next tie to any stale device. A write the app makes on its own stays bare (render-time vendor repair, directory receipts, Drive id caches, failure notices, hard delete, and a DocuSign or Stripe arrival check that learned nothing new: `docStateBare` + `_saveArrivalCheck`); stamping one lets a device that merely looked at a job claim it. A check that does learn something (a completed envelope, a settled payment) records it like the hand entry it replaces. A test holds every `saveJobs()` to one side or the other.
- localStorage is about 5 MB for the whole origin and the manifest write must never fail: thumbnails are capped (`INV_THUMB_CACHE_MAX`), failed-upload photo bytes live under their own key and are never evicted, and on a quota error `_invReclaimSpace` frees other jobs' thumbnails, then other jobs' manifests the sheet can hand back.
- Settings, This Device, Clear (`clearLocalJobData`) clears job data and keeps Settings and the directory caches (`LOCAL_KEEP_KEYS`). A test walks every `localStorage.setItem` key, so a new store must be listed as cleared or kept.

### Backend (Apps Script)
- Deploy by copying from `main`, never a branch: for six weeks the live script came from a dead branch, and three features shipped against a backend that did not have them.
- `BACKEND_VERSION` (bump with every `.gs` change), `BACKEND_ACTIONS` and `BACKEND_TYPES` in `main-sync.gs` describe the deployment, and a test holds them to the dispatch in both directions. `checkBackendVersion` reads them and banners what is broken, by consequence (`BACKEND_NEEDS`, `BACKEND_NEEDS_TYPES`, `BACKEND_FEATURE_COST`): every action and type the app posts is listed (a test derives them from the source), and server behaviour no action name reveals is named by `BACKEND_MIN_VERSION` (raise it when a redeploy changes behaviour the app relies on). An old deployment answering "Unknown action" to the probe is itself the answer.
- Store blobs: an unreadable tab is never read as empty. `_readStoreBlob` throws `STORE_UNREADABLE`, so the save that would have merged into nothing refuses, the tab is untouched and the app retries until it is restored from version history. Every store save takes the script lock through `_lockOrBusy`: a timeout answers `busy` (the app retries), never a write without the lock.
- A redeploy is Deploy, Manage deployments, New version. Saving the file changes nothing `/exec` serves, and New deployment mints a URL Settings does not point at.
- Secrets live in Script Properties only (`DS_*`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `QUO_API_KEY`). The repo is public and the app is served from Pages.
- Destructive functions are editor-only pairs, `previewX()` then `xConfirm()`, never reachable from `doGet`/`doPost`. The Run menu passes no arguments, so an entry point meant for it must work without one.
- Drive: the estate folders are on a Shared Drive, so calls need `supportsAllDrives` (and `includeItemsFromAllDrives` on lists), and `getFilesByName` answers empty there (`_filesNamedInFolder` lists instead). Update files in place so their ids survive; trash, never delete.
- Resolve sheet columns by header, never by index. A column array read by position (`COLUMNS` in `referral-partners-backend.gs`) is append-only.
- Never auto-retry a write that is not idempotent (appending a directory row, creating an envelope or a payment link): a failed POST never says whether it landed.

### Client documents
- `DOC_ACTIONS` registers the five client documents: the estimate; the agreement, which always means the signing packet (the agreement plus the approved estimate as Exhibit A); and the deposit, midpoint and final invoices. `docAction(jobId, kind, verb)` is the one path for view, print, send and file. The gate (`docReadiness` plus the kind's blocker) runs there, before the document is built, for every verb; `commit` hooks run on every verb but `view`.
- The builders are pure: `clientEstimateHtml`, `agreementHtml` (which routes decedent jobs to `probateAgreementHtml`), `invoiceHtml` (returns its verdicts with the html: `blocked`, `requiresApproval`, `amtDue`), `signingPacketHtml`. They read the job and `approvedEstimateFor(jobId)`, never a tab's globals or another panel's markup; the `render*` functions are thin shims.
- `docNames` names everything: the client's PDF carries a date and the Drive file does not (Drive overwrites by name, so a re-file replaces). An internal document never shares a client document's name. `_printDocument(html, title)` is the only print path.
- Every link in the band's tray and the strip names its document through `docWord` (View, Print, Filed, File … to Drive), because the strip has no row to say which. A press the gate would refuse is withheld, never offered: on a view-only document (`docDraftOnly`, `docPreviewOnly`) there is no Print and no File to Drive.
- Sending makes a Gmail draft and records `draftedAt`; the rail then offers "I've sent it", which records `sentAt`. A provider with `needsHumanSend:false` (DocuSign) records `sentAt` itself. After a price change (`notePriceChange` stamps `priceChangedAt` on the job) an older draft is stale (`draftIsStale`): named on its row, never confirmable, never deleted by the app. `docDraftPending` is the one test for a draft newer than the last send. Sending also files the document to Drive (`docState[key].filedAt`).
- The walkthrough view (`openPlainViewer`) is deliberately not a document kind: it carries the private note verbatim and has no send, file or print.

### Integrations
- Gmail: scopes `gmail.compose` (drafts only: it cannot send, and a person pressing Send is the requirement) and `userinfo.email` (to name the mailbox). Never `gmail.send`. The OAuth client id is baked in (`GMAIL_CLIENT_ID_DEFAULT`, public by design); there is no client secret and one must never appear anywhere. The token lives in memory only. The draft link is `/mail/u/0/`: name the mailbox on screen rather than in the URL. MIME line breaks are CRLF everywhere, base64 included. The mailto fallback stays. Internal emails (manager approval, billing) are drafts too, so they leave from the Havellin mailbox; each document copies its department (`DEPT_EMAILS`: estimates@, agreements@, billing@).
- DocuSign (`main-sync.gs`): the firm's route, a constant (`ESIGN_PROVIDER_KEY`), never a device setting. "Send as a PDF to sign by hand" is a per-job route, pinned once pressed (`esignJobWatches` keys on the envelope). Recipients: the client (routing order 1), Anthony countersigning (2), agreements@ copied (3). Tabs anchor on white text that must be rendered into the PDF's text layer (never `display:none`); `esignAnchorsPresent` measures the html, the send names what it found, and a missing required anchor refuses the envelope. Only `completed` is a signature, and the signer is routing order 1. Status is checked on arrival (page load, opening a client), never on a timer, one envelope at a time, at most every `ESIGN_RECHECK_MINS`: DocuSign revokes API access for polling a resource more than once per 15 minutes, and the sandbox is exempt, so only production would reveal it. A failed check speaks and does not stamp `checkedAt`. On completion the executed agreement and the certificate of completion (`certificate=true`, plus the standalone certificate) are filed once. Binary downloads use `_dsFetchBlob`, never `_dsApi` (its UTF-8 decode corrupts a PDF). `_dsSigningKey` converts DocuSign's PKCS#1 key itself. Run `testEsignAuth()` first. Connect webhooks are ruled out: `doPost` cannot read the signature header.
- Stripe (`main-sync.gs`): ACH-only payment links. A new link is read back and deactivated if it could take a card (an empty method list counts as a failure). Only a payment intent at `succeeded` is money; a session reads `complete` days before an ACH settles. Each settled intent is recorded once, by intent id, as `stripe_ach`, cleared. Checked on arrival, at most every `STRIPE_RECHECK_MINS`. One link per stage, for the invoice's own outstanding figure; a link asking more than is outstanding is refused, never shown. The app never sends a link: Anthony does, with the invoice. No card payments and no card surcharge (the cap is the lower of 3% or real cost, and Stripe's cost exceeds 3% only below $300).
- Agent One (`agentIdentify`, `AGENT_MODEL`): names the field shots at the desk. The request is not streamed, so `AGENT_MAX_TOKENS` stays at 16,000, the non-streaming ceiling (4,096 cut dense frames off with adaptive thinking on). It writes `objectName`, `category` and `qty` and nothing else (never a value, a disposition or an NFA flag); lots by default; a flat attribution only where it is readable in the frame, hedged otherwise; detail shots ride in their parent's request. Must-find and firearm notices are prompts it raises, never ticks. A prose answer is a failure, not an empty frame. Run `testAgentIdentify()` first.
- Quo (`quo-sync.gs`): one-way push of referral partners and vendors (and clients once `QUO_SYNC_CLIENTS` is on) to the office dialer. One contact per phone number; external ids decide create or update, so never rename them; `Do Not Use` vendors are left out; tag options must exist on the multi-select field before a push. `dryRunQuoAll`, then `pushQuoAll`; `pruneQuoStale` previews and `pruneQuoStaleConfirm` deletes. The app's call and text buttons stay `tel:`/`sms:` on purpose (your own phone in the field, Quo for the office line).
- QuickBooks: not built, waiting on the accountant's chart of accounts. Deposits are a liability until the work is done; vendor money is pass-through and never touches Havellin's books (never pay a vendor and rebill).

### Drive
- A client's folder and subfolders are made at intake by `createDriveJobFolder`, its only automatic call. Its answer repaints the client only if they are still on screen (`_driveFolderLanded`, a background redraw); it never navigates. While it is in flight the dashboard reads "Creating Drive folder…" (`driveFolderPending`, never saved); a failure is recorded on the job and the dashboard offers Create Drive folder. It is not queued for automatic retry, because older deployments duplicated folders.
- Item shots file to `Estate Inventory` and as-found shots to `As-Found Record` (`photoSubfolder`; an alias keeps older folders working). Sharing with counsel covers both.
- Thumbnails come through the server (`getDriveThumbnails`, size-checked), never from `drive.google.com` in the browser (named-viewer sharing, cross-site cookies, Safari).

## Domain rules
Decided with Anthony. Change them only with Anthony, and record the new answer here.

### Services and the client
| key | label | client |
|---|---|---|
| `downsizing` | Home Editing | living |
| `downsizing_move` | Home Transition | living |
| `home_cleanout` | Home Cleanout | living |
| `prep` | Home Prep for Sale | living |
| `cleanout` | Estate Settlement | deceased |
| `probate` | Probate | deceased |
| `contested_probate` | Contested Probate | deceased |
- Keys are stored on every record and never change; labels come from `SVC_LABELS` (read through `svcLabelOf`), and every other copy must agree with it.
- `isDecedentJob` is a pure service lookup, and it decides whom every document addresses (the owner or the representative) and which agreement form issues. Never add fallbacks on a date of death or a representative: those fields exist only on decedent services, and a power of attorney acts for a living person. A deceased owner's house is an Estate Settlement, never a Home Cleanout.
- The service can change on the walkthrough and in Edit Client within its family only (`svcFamily`): living to living, decedent to decedent. Across families is a different client (+ Add New Client); both pickers offer only the family and Edit Client's save refuses with "Create a new client for this" (Q4).
- On a decedent job the client is the deceased: Edit Client shows no phone or email for them, and every email, greeting and DocuSign recipient comes from `clientRecipient` (client, then representative, then counsel), which skips the client rung on a decedent job.
- Home Transition leads; cleanouts and estate work are the volume; Home Prep for Sale is the realtor product and stays standalone; Home Editing stays quotable and is not promoted. Removing a service is a data migration, not a marketing call.

### Lifecycle
- Statuses: `new`, `pending` (out for manager approval), `approved`, `won` (the client said yes, recorded with method, date and their words), `active`, `closed`, plus `lost` (died before payment) and `closed_retained` (died after money came in; keeps `won`). `isJobWon` is the one reader. `estimateEventStatus` is the one rule for estimate events writing the status, and `jobStatusView` the one reading ("Won · Pending Re-approval", "Won · Awaiting Re-acceptance").
- Gates, enforced in the handler as well as on the button: staffing needs `won`; logging hours needs a recorded deposit (`isJobFunded`), with no override, which is safe only because the deposit is never waived; activation needs the signed agreement, the deposit and, on probate matters, the executor's authorization (`jobActivationBlockers`).
- The estimate needs a manager's PIN (`checkPin`; per-person `MANAGER_PINS` are attribution, not security, since the file is public). A submitted estimate is locked on every device; an approved one reopens only through Edit estimate, which un-approves it and withdraws the agreement's approval. Save, Submit and approval refuse unscored rooms in scope (`unscoredRoomNames`).
- The agreement needs no PIN: it is generated entirely from the approved estimate and the job. `agreementReady` (estimate approved, client won, no pending re-acceptance) is the gate, and `ensureAgreementApproved` stamps the approval on the first print, send or file. Viewing is free. The approval lives on the job only (`job.agrApproved`, `agrApprovedBy`, `agrApprovedAt`); the page-level copies are deleted. A withdrawn approval (`agrApprovalWithdrawn`) says to re-approve only while the estimate is unapproved, then only to send a fresh packet.
- The signature is `docState.agreement.sig`: `signedBy` is the client, `recordedBy` whoever entered it. `isAgreementSent` and `isAgreementSigned` read the record first; `job.agrSent` and `job.agrSigned` are mirrors.
- A raise after the client saw a price asks again: `estimateSentTotal` and `acceptedTotal` record what they received and accepted; a raise reopens the send, then the acceptance, and the packet waits. A discount asks nothing. The old yes moves into `priorAcceptances`.
- Edit estimate and Offer discount go once the packet is out (`priceChangeBlocker`: sent means a change order, signed means locked) and while the estimate is out for approval (`estimateOutForApproval`). Change orders are always open.
- After approval, Edit Client holds the inputs that price the hours (service type, square footage, years in home, Premium, the destination's square footage); everything else stays correctable, the 706 and dispute answers included.
- Close job is offered beside every lit step of an active job; with no midpoint payment it asks first, and it needs every vendor used rated (`jobCloseBlockers`). Re-open (`_reopenTransition`) works until the final invoice is sent or paid (`jobReopenBlocker`); it clears the handover stamp and keeps the undone close in `job.reopens`. Otherwise `deliveredOn`, `activatedOn` and `lostAt` are write-once. `activatedBy` and `deliveredBy` carry the assigned concierge (`_handoverBy`: `job.tc`, else the approver); every other attribution stamp reads `_actor` first (this job's agreement approver, or nobody; a document's `draftedBy`/`sentBy` then fall back to the concierge). The Job active step shows `activatedOn` and that name, as Work complete shows `deliveredOn`.
- A settled job (delivered, or final paid: `jobIsSettled`) cannot be marked lost. A client who paid part and walked away closes as Deposit Retained, with the amount named (`closeoutRetainedTotal`).
- Every date the app stamps is the local calendar day (`_todayStr`). Never slice `toISOString()`, which rolls to tomorrow at 8 pm Eastern; a test forbids it in live code.

### Pricing
- The engine (`computeEngineV3`, run by `calcAll`): each `JOB_STEPS` step has an off-site coordination column and a hands-on work pool. The pool is cleared by `n + α` pairs of hands: on-site hours are `W/(n+α)` plus fixed presence, billed specialist hours `n × W/(n+α)`, billed concierge hours the on-site hours plus coordination. Duration is on-site hours over `PRODUCTIVE_HRS_PER_DAY` (7). A bigger crew finishes sooner, so the concierge bills less and the quote drops; never carry a crew size between estimates.
- The production rate α and the four labour cost rates are pinned on each saved estimate (`activeAlpha`, `activeCostRates`); Settings holds only the defaults for new ones. A named contractor's own rate always wins over the assumed crew cost.
- Billing rates follow the role, never the person: concierge $150 and specialist $100, Premium Estate $185 and $125, pinned on the estimate. A contractor's cost never reaches a client document.
- Rooms: volume and complexity are averaged over the rooms scored and applied to the whole square footage, so one unscored room misprices the whole job; a room marked ✕ is accounted for. The fullness preset is a standing setting (`volPresetSeed`) that seeds rooms ticked later and never overwrites a hand-scored room (`volSet`). Tenure scales the concierge column only (the work pool is measured directly). Complexity is not tied to Premium Estate. Intake's bedroom and bath counts are the main house only.
- The room grid (`ROOMS`, `ROOM_WEIGHT`, `EXTERIOR_ROOMS`): every row needs a weight (a missing one prices silently as 2.0); one detached structure is one row; a saved estimate restores rooms by section and name before index, because inserting a row shifts every later index.
- Rush is a flat 20% (`RUSH_PCT`, pinned per estimate) on the whole services total, a named line, never a rate multiplier. The preferred-client discount (up to `MAX_DISCOUNT_PCT`, 15%; 0 removes it) comes off the labour grossed up by the premium charged on it (`discountOnLabor`), never off materials, fees or vendors, and is not re-clamped when billed.
- Fixed price is offered on every service but Home Prep. The suggestion adds a contingency (`fixedPriceBuffer`: 20%, probate 25%, contested probate 35%); the flat fee is the manager's figure (a money field and a round-down chip), and the drift warning fires only when the estimate moved after the figure was set. Hours are still logged. Termination is a stage earn-out, never hours: the deposit is earned on signature and not refundable, 75% at the midpoint milestone, all of it at completion; for cause means a material breach uncured seven days after written notice.
- Vendors are pass-through: the client pays each vendor's own invoice, with no markup (`SMF_PCT` is 0). Their coordination is concierge time sized by the touch model, `touches × TOUCH_HRS` (0.5) per category (`COORD_TOUCHES`); never scale it by the vendor's cost. `coordHrs` recorded on the Job Plan is an observation and is never priced (the hours log already bills that time).
- Home prep vendors carry a 30% management fee (`prepFeeRate()`, one constant, never typed into a document) on actual spend, bundled or standalone, and book no coordination hours. On a fixed fee the prep fee sits on top as its own line (`prepFeeOnTop`), trued to actuals. Never log time on the prep trades. A standalone prep job can book concierge declutter hours (`declutterTCHrs`); `estimateIsFeeOnly` answers what was quoted, `jobIsFeeOnly` what the job bills.
- Moving materials are a fixed package price, not cost-plus; there are no receipts to offer.
- Estate documentation is a contract term: `DOC_TIERS` (Contents list, Inventory with values, Inventory + appraisals, None), asked at intake, with `produces` flags; `docScope` is its pricing projection. A blank tier refuses Save and Submit (`estimateContractBlocker`) but never stops pricing. Arranging appraisals needs both the full scope and the appraisals tier (`weArrangeAppraisals`).
- The documentation level (Standard or Strict) has a floor set by intake (`docLevelFloor`: the 706 answer, where unknown counts as yes; a recorded dispute; contested probate; the appraisals tier). The manual choice can raise it, never lower it.

### Change orders, invoices and payments
- On hourly jobs a change order carries hours and never a price (the timesheet bills the work); on fixed price it carries its price at the plain rates (`coPrice`); on Home Prep it carries concierge hours and prints the rate. An accepted change order moves the hours budget (`coAcceptedHours`), the plan's length and the invoice's variance baseline; an unaccepted one moves nothing; a second is measured from the first. They cannot be deleted. The card carries PDF and Get Acceptance (`coCardActions`).
- Invoices split 50/25/25 (`paymentSplit`). The final is the whole total less what was received, with any gap named on its own row, and it names only the invoices that went out (`_midBilled`). The midpoint is due at the calendar halfway, at half the work done, or once every room is locked. A final with no logged hours is blocked outright unless the job is fee-only; outside ±15% (`EST_TOLERANCE_PCT`, printed through `estTolerancePctTxt()` on every document, both agreements included) it needs a manager's PIN, recorded on the job with the figure approved (`recordInvFinalApproval`). The client's copy never narrates a variance. A Home Prep final heads its total "Services total (site management fee on actual vendor spend + logged concierge hours)", dropping the hours when none are logged (Anthony's wording); every other hourly final keeps "Actual Havellin services total (logged hours + actual fees)". A percentage on a document reads its constant (`SMF_PCT`, `prepFeeRate()`), never a typed number.
- Payments: `job.payments[]`, each with a `uid`, a stage and its evidence (a cheque photo). A cheque is received, not cleared; wires, cash and settled Stripe ACH are cleared. Above `LARGE_DEPOSIT_THRESHOLD` a personal cheque is flagged, never refused (wire preferred, cashier's cheque accepted). The recorder prefills each stage's outstanding amount.

### Inventory and estate documentation
- The field types nothing. The in-app camera takes as-found shots (evidence, never lines), item shots (one line each, named at the desk) and detail shots of the last item. Five chips; Undecided is the default, so silence never files anything as Keep.
- Room status is `pending`, `locked`, `cleared` (older values normalise on read). Lock needs an as-found shot on a decedent job (flagged, not refused, on a living one); Cleared needs Lock.
- Item numbers are permanent (`_invAssignItemNos`); a removed item's number stays spent. One photograph can carry several lines (`invSplitItemN`); possible duplicates are flagged for a person, never merged. The desk's split repaints only what it changed (`_invSplitRepaint`: the new row, its group and room counts, the rows sharing the photograph, the whole-list counts), by id; a test holds the result byte for byte to the full render, and it falls back to `renderInventoryTab` only where it cannot place the row.
- The Job Admin & Inventory tab is the desk: grouped by disposition, then room. Review gates nothing; documents in progress are stamped IN PROGRESS and never withheld.
- The tier decides what we produce (`invDocContractBlock`): the valued documents (Estate Inventory Report, Court Inventory, Trust Schedule) only where the tier states values; the Contents List on the contents tier; everything else at every tier.
- The matter type (`MATTER_TYPES`: probate, trust, both, neither; asked at intake, with no default) picks the instrument, either the Court Inventory (§733.604) or the Trust Schedule (Chapter 736; it supports an accounting and is not one), the default for an unset asset track, and the agreement's §5 clauses. Date-of-death FMV is the value either way.
- A schedule with an unvalued line, or with nothing on it, is never FINAL: it reports a floor, names the gaps and withholds the signature block.
- The client's workbook (`saveInventory.gs`) is sent derived facts (`docSet`, `onProbate`, `statesValues`), never keys the server would need its own catalogue copy to read; an absent flag means the full estate layout.
- On an estate filing a Form 706 (`maivFilingApplies`, read from the 706 answer, never the documentation level): the MAIV aggregate (§20.2031-6(b): $3,000 of marked artistic value across the gross estate, a floor until every line is valued) and the lot cap (§20.2031-6(a): no article in a grouped lot over $100, `invLotSplitState`, flagged at capture, never refused).
- Appraisal: `invNeedsAppraisal` (category and value against `invAppraisalThreshold`, $3,000 or $500 on a disputed estate) plus a manual flag; linking an appraiser sets the valuation source. An appraiser who also buys is flagged, never refused.
- The release approval request lists every line leaving the property and names its cautions (specific bequest, disputed, not yet appraised) above the table. Verbal approval is never accepted.
- Firearms: nothing moves without written authority; photograph in place; nobody else carries one out, family included. Anthony alone may drive a non-NFA firearm to a licensed dealer, once authority, serial and dealer are recorded (`invTransportBlocked`). An NFA item never travels with us, under any authority. Never buy an estate firearm and never take a percentage of firearm proceeds. `firearms-protocol.html` is the procedure, pending counsel.
- §732.402 exempt property sits on the court schedule with its own subtotal and cap check (`EXEMPT_CAP_732_402`).

### Job Plan and hours
- Two folded tools on top (Vendors & partners; Hours & daily close), then the job as a thread with a NOW marker: Before Day 1, In the house, Midpoint & pickups, Move day (Home Transition only), Close-out. The task keys `p0` to `p4` are internal; screens never show phase numbers.
- Intake's house questions: every service asks both questions and all seven rows except Home Prep, which asks the safety question and the rows marked `prep:true` (access & security; Q17). `houseFlagAsked` is the rule for both forms; a row the service does not ask is not read off the form (`readHouseFlagInputs(prefix, svc, prior)` keeps the record's value).
- The header carries the firearms banner (the only red), the intake brief (`HOUSE_FLAGS`, with must-find ticks recording who and when) and the schedule strip.
- `jobSchedule` is clock-free (today is an argument) and counts from the activation date once the job starts, from the target start before. Progress is two figures, work done against the rooms (`workPct`) and hours logged against the authorised budget; the pace verdict waits for a crew-day of hours and a fifth of the work.
- One person, one slot (the setters refuse a duplicate); the concierge follows intake until someone picks one; the confirmed team is its own chip. End-of-job logistics vendors are offered, not placed.
- Hours are logged on every job, fixed price included (Anthony: for the discipline and the duration data). The amber no-hours-today fold is intentional.
- The plan's 20-second refresh brings rooms and hours, not vendors or the team: reload before changing those on a client someone else is working.
- The close-out card: the satisfaction call, then the Google review draft (which waits on the call), the referral ask, and vendor ratings (mandatory at close; a star saves itself).

### People and directories
- A person's name is the person key everywhere (`job.tc`, approvals, rosters, hour logs). Compare with `samePerson`; stored names are normalised on load (`migrateRetiredNames`) and never written back. "Sr" is retired; Anthony Graziano Jr is a different person with their own rate and mailbox.
- Vendors: one row per firm, categories separated by `;` (`vendorCats`), one `category_group`, the office line plus up to two named contacts (`vendorContacts`). A job refers to a vendor by name (`resolveJobVendor`), because rows move; sourcing records key on the estimate line's id (`_srcLineKey`), never its position. A new vendor under an existing name is refused, and Save is one press, one row.
- A job keys its referral partner on `referralIdOf` (the directory `uid`; the sheet row only for a row with none), and `jobRefersToPartner` is the one test for attribution (a pre-P9 row id counts only while the name it recorded matches the partner on that row). Re-sorting the sheet must never move a referral.
- Referral partners: one row per person (their own line, cell, the firm's switchboard with extension, an assistant). A number typed Main with no office line is flagged as a switchboard.
- Contractors sort by name. The office line (`HAVELLIN_OFFICE_PHONE`) is the firm's; a contractor's phone is a personal mobile, and `NON_MOBILE_NUMBERS` keeps firm numbers from printing as anyone's mobile.
- Deleting a contractor takes the manager PIN (the directory's `_openDirDeletePin` / `checkDirDeletePin`). One named on any job (`contractorJobRefs`: the concierge, the site visit, the estimate's preparer, a crew slot, an hours entry; lost and closed jobs included) is refused and retired instead by setting Inactive; `contractorDeleteBlocker` is asked by the ✕ and again by `hardDeleteContractor` behind the PIN, and refuses while the client list is unread.
- A person-entered name is text wherever it lands: `esc()` it in `showFB` messages (which are HTML) and in both the `value` and the label of every `<option>`.

### Client-facing copy
- If a line explains what the reader can already see, or why something is absent, cut it. The exception: an absence that shifts a responsibility to the client or counsel is stated, once.
- Havellin is insured and bonded, never "licensed". The coverage is being obtained; the footers stay as they are.
- Tagline: "Havellin handles the work no family should face alone."
- Estate documents address the representative ("the property", never "your home"), ask for the Letters and the list of designated items, and never ask for or interpret the will.
- Every legal text written here is drafted, not reviewed, until counsel signs off: add it to `COUNSEL_REVIEW_BUNDLE.md`.
- Photographs for marketing: an opt-out box on both agreement forms, under the stated anonymity limits. Operating rules, not clauses: publish nothing until the house has closed or been cleared, and never publish a contested matter.

## Decided: do not re-propose
- Rush as a rate markup, a sliding scale, or keyed to the runway.
- Offsetting disposal vendors against disposition hours (those hours are Havellin's fiduciary review).
- Scaling coordination hours by vendor cost.
- Premium Estate raising complexity; tenure multiplying the work pool.
- Fallbacks in `isDecedentJob`, or a "client is deceased" tick box.
- A manager PIN on the agreement.
- Deleting a panel when its tab is retired.
- DocuSign Connect, or polling DocuSign or Stripe on a timer.
- `gmail.send`, a client secret, or sending mail from Apps Script as the deploying account.
- Thumbnails from `drive.google.com` in the browser.
- Auto-merging possible duplicate lines; Agent One writing a value, a disposition or an NFA flag.
- An itemisation floor keyed on the documentation level (`invListingThreshold` was retired; §20.2031-6(a), keyed on the 706, is the real rule).
- A per-job override of the cost rates.
- A price on an hourly change order, or none on a fixed-price one.
- Card payments or a card surcharge.
- Persisting the retry queue to localStorage.
- Print Job Plan as a dump of the tab (a revisit would be a one-page brief).
- Merging Home Editing into Home Cleanout, or deleting a service type.

## Traps that have bitten
- Never hand-edit the build stamp or regex on `hdr-ver`: the class name appears first as a CSS rule, and such a regex once deleted the end of the stylesheet on `main`.
- The container runs UTC; read Eastern time with `TZ=America/New_York date`.
- A `<select>` silently rejects a value it has no option for: list the job you are about to select (`populateJobSelect(forceJobId)`).
- `new Date('garbage')` does not throw, and a bare `yyyy-mm-dd` parses as UTC midnight, a day early in Eastern.
- `formatMoneyInput` turns a field into `$8,000`: read it with `moneyToNumber`, never `parseFloat`, and keep a cleared money field blank rather than 0 (blank means not yet valued).
- `var` hoists as `undefined`: a catalogue declared above a constant it reads is silently missing it.
- An `innerHTML` redraw destroys the form under someone typing; repaint the changed part by id.
- A change that gives an old variable a new reader can turn a harmless stale value into a pricing one; job-scoped estimate state resets in `resetEstimateJobState`.
- A raw control byte in the source hides everything after it from repo-wide search; `tests/source-bytes.test.js` guards the shipped files.
- `grep -c` exits 1 on zero matches, which ends an `&&` chain.

## Open work
- **Redeploy owed:** Apps Script `2026-09-30` (P11, both `main-sync.gs` and `saveInventory.gs`). Until it is live, per-key merges for the sourcing, crew, ratings, review and checklist maps, the unreadable-store refusal, the busy answer and Agent One's new limit are not in effect; the banner says so.
- `WORKFLOW_AUDIT_2026-09-28.md` is the tracker. Open: P12 (estimator and pricing decisions; Q5–Q7 answered 2026-09-30, the Q14 follow-up and Anthony's OK on the Q20 reading still open), P13 (the full documentation pass, last). P11 and P14 have landed. Anthony's own items, O1 to O9, are listed there.
- Waiting on Anthony: whether a Home Prep change order may add a new vendor.
- Decided, not to build: intake sanity checks on square footage and room counts (Anthony, 2026-09-30: "no sanity check is needed").
- Known, not fixed:
  - Neither agreement has a referral-fee disclosure (Q21: agreed; the wording goes through counsel).
  - A referral partner with no `uid` still keys jobs by sheet row (`referralIdOf` falls back). If `backfillIds()` has never been run in the Referral Partners Apps Script project, running it once from the editor gives every row one; nothing else changes.
  - The desk's **All** filter cannot be chosen on a day with a capture: `renderInventoryTab` turns `when:'all'` into `'today'` on every render while anything was shot today, so pressing All redraws Today (found in passing 2026-09-30, P14; confirmed on the real page).
  - The vendor and referral-partner deletes ask their history question on the button only (`requestDeleteVendor`, `requestDeleteReferral`), not again behind the PIN (`hardDeleteVendor`, `hardDeleteReferral`), as the contractor delete now does.
  - Browser step 17's "Change the walkthrough date" check reads the clock: its walkthrough is 2026-09-30, and from noon that day on the browser's clock (UTC in the container, 8am Eastern) the row is no longer lit, so it fails on every build from then on.
- Not yet proven live (Anthony's items in the tracker): a DocuSign sandbox envelope's tab placement (`DS_TAB_Y_OFFSET`) and a Stripe ACH test payment.
