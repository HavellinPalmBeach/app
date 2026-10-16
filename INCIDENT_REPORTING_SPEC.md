# Incident reporting: proposal (2026-10-16)

Status: **proposal, nothing built.** Anthony asked for incident reporting on every job and for a proposal before any build. The decisions this needs are in §9, each with a recommendation first. Once answered, the build is one pack (P26) and this file becomes the spec, with §13 recording where the build departs from it.

## 1. What was asked
Capture anything that goes wrong or needs attention on a job, the same day, in enough detail to support an insurance or bond claim and to answer a client, attorney or trustee.
- Types: injury, property damage, missing item, discovered valuable, hazardous condition, client complaint, vulnerable adult concern.
- Who reported it, when, where in the home, what happened, who was present, photos.
- Injury, missing item and vulnerable adult concern alert the Managing Member immediately.
- Open / resolved status with a resolution note.
- Records cannot be edited or deleted: updates are new entries.
- A job cannot close with an open incident.
- Incidents appear in the job's final project records.

## 2. What the app already has that this builds on
Nothing records an incident today. The word appears in the app only in the estate agreement's §6.3 *Damage Incident Protocol*, which promises the client six steps (photograph and describe at once, notify the client within 24 hours, preserve the item in place, a written incident report to Anthony within 24 hours, the carrier engaged above $500, the carrier's contact to the client within 48 hours). The standard form has no such protocol. The app promises these and gives the concierge no way to keep them.

Everything the feature needs already exists as a pattern, so the build is mostly assembly:
- **Found on site** (`siteFinds`, P19) is the template: a record list on the job, a card on the Job Plan's *In the house* stage, a dialog, a DOM-free refusal rule asked where the record is written, derived reminder lines on the card and the desk, void with a reason, a printed form, a signed copy filed through `fileSignedCopy`.
- **The job's record lists** (`JOB_RECORD_LISTS`, `jobListPut`, `jobListVoid`): entries keyed on their own id, merged entry by entry on the sheet (`JOB_KEYED_LISTS` in `main-sync.gs`), every write a person's stamped edit, removal only as a void with a reason. This is exactly "cannot be edited or deleted; updates are new entries".
- **Drive filing**: `uploadToDrive` (the photo upload's action, no new backend action), `resolveSubfolderId` with a root-folder fallback for older client folders, `compressImage` for a phone photograph, `_armFiling` as the watchdog, `_fileCloseoutPaper` filing a paper as the job closes.
- **The close gate**: `jobCloseBlockers`, asked by `applyJobTransition` (the handler) and by the button, so a refusal cannot be reached around.
- **Internal mail**: `sendInternalEmail` makes a Gmail draft in the Havellin mailbox, with the mailto fallback; the app cannot send on its own (gmail.compose only, by decision).
- **Attribution**: `_actor(job)` (the device's user) on every lifecycle stamp; `_siteFindTeamNames` for the names a dialog offers.
- **Final records**: the Disposition Ledger and the Contents Record are filed at close through one path (`CLOSEOUT_PAPERS`); the estate package (`probatePackageDocs`) carries the desk's pages to counsel or the trustee; both agreements define the *Project Records* (estate §7.1, standard §10.1b) as the contents and their disposition, held seven years and given to the client at the end.

## 3. The record
`job.incidents`, the seventh entry in `JOB_RECORD_LISTS` (app) and `JOB_KEYED_LISTS` with `JOB_LIST_KEY.incidents = 'id'` (server). Two entry shapes, each written once through `jobListPut` and never rewritten:

**The report**: `id`, `entry: 'report'`, `kind` (one of `INCIDENT_KINDS`), `occurredOn` (local day), `occurredTime` (optional), `where` (a room off the plan's room list, or typed: garage, driveway, the truck, the new home), `what` (free text, the account), `present` (names), `reportedBy` (the person who reported it, offered the team, default the device's user), `recordedBy` (`_actor`), `recordedAt`, and one or two facts per kind (§4).

**An update**: `id`, `entry: 'update'`, `of` (the report's id), `act` (`note`, `photos`, `resolved`, `reopened`, `alerted`, `acknowledged`, `client_notified`, `carrier`), `note`, `status` (`resolved` or `open` where the act sets one, else absent), `photos` (`[{fileId, fileUrl, name}]`), `by`, `at`, `on` (the day the act happened, where typed).

Derived, never stored (one definition each, like `isJobWon`):
- `incidentStatus(job, id)`: the latest live update carrying a status, else `open`.
- `openIncidents(job)`: live reports whose status is open.
- `incidentResolution(job, id)`: the `resolved` update's note.
- `incidentNo(job, id)`: its number on this job, in the order recorded (positional, so a report that syncs late from another device can renumber the ones after it before close; the printed record carries the day and the id beside the number, and the id is the reference a claim quotes).

A report recorded in error is **voided with a reason** (`jobListVoid`, attributed), never removed: it stays on the card struck through and prints in the record marked VOID. Nothing edits an entry. A void does not block the close. Whether a void needs more than a reason is §9.4.

Writes after the job closes are allowed and flagged (*recorded after the job closed*): a claim resolves months later, and the resolution belongs on the record.

## 4. The seven kinds, and what each asks beyond the common fields
Thorough, never cumbersome: the common fields are the record; each kind adds at most two questions, and only where a claim or a reader needs them.

| kind | adds | alert | notes |
|---|---|---|---|
| `injury` | who was hurt (team, client or family, vendor, other, by name); medical help called (yes/no, who) | **yes** | |
| `damage` | the item (an inventory item number where it has one, else described); estimated value | no | drives the §6.3 deadlines (§6 below) |
| `missing` | the item (item numbers, or a description); when and where last seen | **yes** | an intake must-find (`mustFound`) or an inventory line can be named; the desk row of a named line reads *reported missing* |
| `valuable` | where it is now and how it is secured; who was told | no | an original will or cash goes to **Found on site**, and the dialog says so and offers those two buttons instead; on an estate the thing itself is photographed into the inventory as a line, and the incident records the discovery and custody |
| `hazard` | the hazard (mold, structural, biohazard, chemicals, animals, utilities, other); work stopped in that area (yes/no) | no | firearms keep their own protocol and banner; an open hazard shows in the Job Plan header (§9.6) |
| `complaint` | who complained and how it reached us; what they asked for | no | |
| `vulnerable` | what was observed; the Florida Abuse Hotline called (yes, by whom and when / not yet) | **yes** | internal only (§9.3); the card states the duty in §415.1034 and prints the number, 1-800-962-2873, a flag, never a block |

Where an inventory line is named (damage, missing), the id is stored as the line's `stableId` the way bequests store theirs, and the item number is typed, as bequests are matched.

## 5. On screen
- **Job Plan, In the house**: an **Incidents** card beside Found on site, on every service and every stage of a won job (a hazard or a complaint happens before activation too). Each live incident is a row: its number, kind, day, where, who reported it, status, the entry chain (newest last) with its photographs linked, and its acts: **Add a note**, **Add photos**, **Resolve** (asks the note), **Reopen**, **Void**. One button, **Report an incident**, opens the dialog. Derived lines at the top (§6). Field mode shows the card on the phone, since the field is where it happens.
- **The dialog**: one modal, the kind first (seven chips), then day (today, refused if after today, as the hours log refuses), time, where (a datalist of the plan's rooms), what (a textarea), who was present (a datalist of the team, the vendors confirmed on the plan and the client or representative; `;` between names), who reported it (the team), the kind's own one or two fields, and a photo picker (`capture="environment"`, several). **Record** writes the report at once; the photographs upload after it lands and arrive as one `photos` update per batch, so a failed upload loses nothing already written and Retry is offered on the card. About eight fields, under a minute on a phone.
- **The header**: beside the schedule strip, an amber chip *N open incidents* that scrolls to the card (as `goToSiteFinds` does). An open injury or hazard in red is §9.6.
- **Client Dashboard**: the lit timeline row carries the flag *N open incidents* (amber), and the Close job step names them as its blocker, with the fix on screen (the rail's rule: reason and fix, never a tooltip).
- **Job Admin & Inv**: the desk's derived lines (phase `admin`) list each open incident with *Open Incidents* as the action; a line reported missing or damaged carries a chip on its row (`invReleaseCautions` is not touched: these are facts about the line, not cautions on a release).
- **Clients tab, every device**: while an alert-kind incident has no `acknowledged` entry, a red banner names it (client, kind, day) with **Acknowledge**, which writes the entry under the device's user. This is how Anthony sees it on whatever device he opens next, whether or not the text reached him.

## 6. Reminders derived from the record, never ticked
`incidentLines(job, today)`, DOM-free and clock-free like `siteFindLines`, drawn on the card and on the desk:
- Every open incident: *Incident N open since <day>: <kind>, <where>*. Red for injury, missing and vulnerable while unacknowledged.
- An alert kind with no `alerted` entry: *Anthony not yet alerted* (red; the fix is the Alert button).
- **Property damage**, from the estate form's own §6.3, the same deadlines on living work (the standard form has no protocol; §9.7): client notified within 24 hours of discovery (`client_notified` entry); the written report to Anthony within 24 hours (the `alerted` entry, offered on damage too); above `INCIDENT_CARRIER_FLOOR` ($500, the clause's figure, one constant the clause prints) the carrier engaged (`carrier` entry with the claim number); the carrier's contact to the client within 48 hours. Each turns red once its day has passed and green once its entry exists.
- A vulnerable adult concern with the hotline not yet called: *Florida Abuse Hotline not yet called* (red), with the number.
- A missing item still open: *not found: resolve with where it went, or that it was not found*.

## 7. The alert
The app cannot send mail on its own: gmail.compose makes drafts, a person presses Send, and sending from the Apps Script as the deploying account was ruled out (Decided). So *immediately* is built as the fewest taps on the reporting phone, plus the banner above:
1. On **Record** of an injury, missing item or vulnerable adult concern (and on **Alert Anthony** on any incident's row), the app opens a prefilled text to the Managing Member's mobile (`sms:` with the body, the phone's own messaging app) and, where Gmail is signed in, a Gmail draft to his address, subject *Havellin incident: <kind>, <client>, <day>*, body the report's fields. `INCIDENT_ALERT_TO` holds the address and the mobile, one definition (today both sit in `assignedTCContact`'s fallback and `DEFAULT_CONTRACTORS`).
2. The record claims nothing the app did not witness: the `alerted` entry is written when the person confirms **Sent** on the card, with how (`text`, `email`, `call`, `in person`). Until then the line stays red.
3. On Anthony's device the banner (§5) stands until he presses **Acknowledge**.
A true automatic send is §9.1.

## 8. The final records
- **The Incident Record**: a pure builder, `incidentRecordHtml(job, opt)`, one page per job: the job's header (`_invDocPartyHead`), each incident with its number, kind, day and time, where, the account, who was present, who reported it, every entry in order with who and when, the photographs as links to Drive, the resolution, and void entries marked VOID with their reason; a footer counting incidents, open and resolved, so the page adds up. Written knowing the client, counsel and an insurer read it: person-typed text escaped, no internal remarks, and a vulnerable adult concern left out (§9.3), printed on its own page for Anthony. Offered from the Incidents card and the desk's More ▾, through `_printDocument`.
- **Filed at close**: `CLOSEOUT_PAPERS.incidents`, through `_fileCloseoutPaper` (which gains a `noInventory` flag: the Incident Record reads the job alone, so the close never reads the sheet for it and an empty inventory is no refusal), to a new client subfolder **Incident Reports** (`createDriveJobFolder`'s list; root fallback on an older folder, as Signed Records falls back), under an undated name so a re-file replaces, recorded on `docState.incidentRecord`. The photographs file to the same folder as they are taken. Filed only where the job has an incident; a job with none files nothing and says nothing.
- **The estate package**: `probatePackageDocs` adds `incidents` where the job has one, after the ledger; the email names it.
- **The Project Records clauses**: both agreements define the Project Records as the contents and their disposition. Adding *a record of any incident reported during the engagement, and its resolution* to estate §7.1 and standard §10.1b is a sentence for counsel (bundle D16); Anthony decides the words. Until then the Incident Record goes with the Project Records as they are handed over.
- **The ledger and the Contents Record**: a line named on a damage or missing incident reads *damaged, Incident N* or *reported missing, Incident N* beside its disposition. Cheap, and it is where the family looks for it.

## 9. Decisions for Anthony
Recommendation first in each.
1. **The alert route.** (a) *Recommended:* the prefilled text and Gmail draft the reporter sends, the `alerted` entry on confirmation, and the red banner on every device until acknowledged. No redeploy, works on a phone with one bar of signal, and the reporter pressing Send is one tap. (b) A true automatic send from the Apps Script (`MailApp`, from the deploying Google account, to Anthony only): reverses a standing decision, needs a redeploy and a backend action, is silent when the quota or the script fails, and the client-provenance reason for the rule does not apply to a note to ourselves. (c) Both.
2. **Who is alerted.** (a) *Recommended:* Anthony alone, as asked. (b) Anthony and Ashley. (c) Anthony, and the job's concierge where it is somebody else.
3. **Vulnerable adult concerns in the client's record.** (a) *Recommended:* internal only: never on the Incident Record the client or counsel receives, never in the package; its own page for Anthony. The concern is often about the client or a family member, and §415.107 keeps reports confidential. (b) In the record like the rest.
4. **Voiding an incident.** (a) *Recommended:* a void with a reason, attributed to the device's user, the entry kept and printed as VOID, as every other record here. (b) No void at all. (c) A void behind a manager PIN.
5. **The close gate's reach.** (a) *Recommended:* an open incident blocks Close job and Deposit Retained (money came in and work happened), and is named in the Lost question as a flag. (b) Close job alone.
6. **Red in the header.** (a) *Recommended:* an open injury or hazard shows red in the Job Plan header beside the firearms banner, which is the only red today by rule; the rest amber. (b) Amber for all.
7. **The standard form.** (a) *Recommended:* add the estate form's §6.3 protocol to the standard agreement, through counsel, so the deadlines the app derives are promised to living clients too. (b) Leave the standard form; derive the deadlines on estates only.
8. **The feature freeze.** This is a new feature under the Road to launch freeze. (a) *Recommended:* build it now, before the six scripted runs, and add an incident to each script (a claim-ready record is part of the insurance and bond work on Anthony's list). (b) After the runs.

## 10. What it costs the concierge
A report is one button and about eight fields, under a minute, photographs from the phone. An alert is one more tap (Send) and one on Anthony's side (Acknowledge). A resolution is one entry. A damage incident on an estate asks four short entries over two days, which are the four promises §6.3 already makes. A job with no incident sees one empty card and nothing else.

## 11. The build (P26), in order
1. **Record and rule**: `INCIDENT_KINDS`, `JOB_RECORD_LISTS` and the server's two lists (`BACKEND_VERSION` and `BACKEND_MIN_VERSION` bumped: until the redeploy the list rides the whole record, so two devices adding an incident at once can drop one; the banner says so), `incidentRefusal(rec, mode)` asked by `saveIncident` (kind, day not after today, where, what, who reported it; a resolution needs its note; an update needs its report live), the derived readers, the dialog and card, void, the photographs through `compressImage` and `uploadToDrive` into **Incident Reports**.
2. **The gate and the flags**: `jobCloseBlockers` (handler and button), the rail's flag and blocker, the header chip, the desk's lines and the line chips.
3. **The alert and the banner.**
4. **The Incident Record**: the builder, the desk and card print, `CLOSEOUT_PAPERS.incidents`, the package.
5. **Documents**: the manual (Job Plan, the record, the alert), the playbook (what to press when something goes wrong; the symptom table), `JOB_SCRIPTS.md` (an incident in each run), the counsel bundle (D16: the record's wording, the §415.1034 sentence, the Project Records sentence, §6.3 on the standard form), `CLAUDE.md` rules, `BUILD_HISTORY.md`.

Tests: `tests/incidents.test.js` holds the app's and the server's lists level (the existing level test extends), every refusal, the status derivation from entry chains, the close refused in the handler and the button and allowed once resolved, the `today` argument on every line, the record adding up to its own rows, every person-typed value escaped, every write a stamped edit (`job-edit-stamps`), no new localStorage key (`LOCAL_KEEP_KEYS` untouched), the alert body naming the fields, and a vulnerable adult concern absent from the client's record. Browser step 81: on a 390 px viewport, report a damage incident through the real controls with a photograph, see the header chip and the rail flag, have Close job refused and name the fix, resolve it, close, and print the record in print media with zero page errors.

## 12. Out of scope, named
- A client-facing incident notice or letter (the record is the paper; a notice is counsel's wording).
- An insurer's claim form (the record supports it; the carrier's form is theirs).
- Editing or deleting an entry, ever.
- Per-incident email threads or a dashboard across jobs (the Clients list can gain an *Open incidents* filter later if wanted).

## 13. Where the build departs from this
Empty until P26 lands.
