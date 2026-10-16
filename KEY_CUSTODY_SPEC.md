# Key and access custody: proposal (2026-10-16)

Status: **proposed, not built.** Anthony asked how a key and access custody log would fit the app before anything is built, and whether access and alarm codes belong in the app. §1 answers the second question first because it changes what the first one records. §7 lists the three decisions this needs.

## 1. Access codes and alarm codes: keep them out of the app
Recommendation: **no digits in the app.** The app records *that* a code exists, who was given it and when it was handed back or the client was told to change it. The digits live in each person's phone or iPad password manager (iCloud Keychain, or a shared 1Password vault), which is built for exactly this.

Why, in this app specifically:
- **There is no login.** "Each iPad is linked to a user" is a Settings pick (`deviceUser`), which is attribution, not authentication. Whoever holds the iPad is that user. The app and Anthony decided this on 2026-10-12 (Q59), and it is right for everything else the app does.
- **The data is plain text everywhere it rests.** The Jobs sheet is plain text behind an Apps Script deployed with *Who has access: Anyone* (the URL is the only secret). Every device caches the whole Jobs store in localStorage, unencrypted, for every client past and present. The app itself is a public file on GitHub Pages. A lost iPad is every client's alarm code with no way to revoke.
- **Codes already leak in today, by invitation.** Intake's *Access & security* row asks for *"Codes, contact, anything we need to disarm"*, and the walkthrough notes box suggests *"Key in lockbox code 4521"* as its example. A code typed there lands in the Jobs sheet, in the estimate record (walkthrough notes), in Agent One's naming request to the Anthropic API, on the internal worksheet filed to Drive, and on the crew brief. That is the bigger exposure, and it is fixed by changing two strings.
- **Liability.** Havellin is insured and bonded. If a house is entered after a job and the alarm code was on a sheet anyone with the URL could read, the question an insurer or attorney asks is unanswerable. A code in a password manager with Face ID, per-person access and revocation is answerable.
- **The convenience survives.** The password manager is on the same iPad, one Face ID away. The custody log (below) still tells you who holds the code and whether it has been handed back, which is the part a client or carrier wants to see.

Two operating rules to add to the playbook with the build:
- Ask the client to set a job code for the alarm and the lockbox, and tell them to change it at handover. The close-out line records that they were told.
- Codes go in the password manager, never in a note, a text or a photo in the app.

If Anthony wants the digits in the app anyway, the honest version is a per-job field encrypted on the device under a passphrase typed each time it is read, with no copy on the sheet. That is a real build (key management, recovery when the passphrase is forgotten, no cross-device read) for a convenience the password manager already gives. Not recommended.

## 2. What exists today that this fits
- **The job's record lists** (`JOB_RECORD_LISTS`: co-fiduciaries, beneficiaries, bequests, signed records, site finds, proceeds statements). Each entry has its own id, merges entry by entry on the sheet so two devices can add at once, is written only through `jobListPut`, and is never removed once it records something that happened: it is voided with a reason and stays listed, struck through (`jobListVoid`). This is the "history can never be edited or deleted" rule already in force (Anthony, P17: void it, record it again).
- **Found on site** (`siteFinds`, P19): the closest cousin. A card on the Job Plan, a dialog per act (record, hand-over, deposit), one rule set asked where the record is written (`siteFindRefusal`), reminder lines drawn through `planDerivedLines`, flags for an odd hand-over rather than refusals, and a signed receipt filed through `fileSignedCopy`.
- **The inventory's chain of custody** (`custodyLog` per item): events with who recorded them (`_invStampBy`), tombstoned never spliced, printed in the *Release Approvals and Chain of Custody* record that goes in the estate package. It is about the contents, not the keys, and is kept only where `custodyLogKept` holds (formal, probate, trust). Keys are held on every job, so this log is modelled on it but is not inside it.
- **The close gate** (`jobCloseBlockers`, asked by `applyJobTransition`): today it refuses only unrated vendors. The close question (`closeOpenWorkFlag`, `ledgerCloseFlag`) flags the rest.
- **The close-out papers** (`CLOSEOUT_PAPERS`): the Disposition Ledger on an estate, the Contents Record on living work, each filed to Drive as the job closes and signed by the representative or the client.
- **Internal mail** (`sendInternalEmail`): a Gmail draft a person presses Send on. The app cannot send mail on its own (decided: never `gmail.send`, never mail from Apps Script as the deploying account).
- **Before Day 1** already carries the tick *Keys and access codes tested; elevator and parking confirmed* (`access_tested`) under *Access & crew*.

## 3. The record
Two lists on the job, both through the record-list helpers, both added to `JOB_RECORD_LISTS` in the app and `JOB_KEYED_LISTS` / `JOB_LIST_KEY` on the server (backend bump and a redeploy; the test that holds the two lists level forces it).

**`job.accessItems`**: one entry per physical item, written once.
- `id`, `kind` (`ACCESS_ITEM_KINDS`: key, fob, garage remote, gate card or clicker, lockbox key, alarm code, other), `label` (free text: *front door, brass, ×2*), `qty`, `receivedOn`, `receivedFrom` (the client, the representative, the realtor, as typed, offered from the job's parties), `recordedBy` (`_actor`), `recordedAt`.
- Voidable with a reason (an item recorded on the wrong job), never removed.

**`job.accessEvents`**: append only, one entry per act, each naming its item.
- `id`, `itemId`, `kind` (`received`, `handoff`, `returned`, `lost`, `recovered`), `on` (local calendar day, never after today), `from`, `to`, `note`, `recordedBy`, `recordedAt`.
- `received`: from the client party to a Havellin person. `handoff`: Havellin person to Havellin person. `returned`: Havellin person to a client party. `lost`: from its holder, `note` required (the explanation). `recovered`: a lost item back in a named person's hands.
- A wrong event is corrected by voiding it with a reason and recording the right one. The void stays on the printed history as a struck-through row with its reason and who voided it. Nothing edits an event's fields after it is saved.
- Two lists rather than events nested in the item because the sheet merges each list entry whole: two devices appending to one item's nested list would drop one of them, two devices appending separate event entries never do.

**Who holds it is derived, never stored**: `accessHolder(job, item)` is the `to` of the latest live event, so one person is always responsible and nobody can edit the holder without an event saying so. An item's state is one reader, `accessItemState(job, item)`: `held` (by whom), `returned`, `lost`.

## 4. The rules, where the record is written (`accessEventRefusal`)
Refuse, by name, everything missing at once (nobody has standing to override these; without them there is no holder):
- A receipt or handoff with no `to`. The default is the device's user (`deviceUser()`), else the job's concierge, so on the normal day it is one tap.
- A `lost` with no explanation.
- A date after today (as the hours log refuses, 2026-10-13).
- An event on an item already returned or lost, except `recovered` on a lost one and a fresh `received` if the client hands it back over (a new receipt event, the old history kept).

Flag, never refuse:
- `returned` to someone who is not the client, the representative, a co-fiduciary or the referral partner on the job (`accessReturnFlag`, the twin of `siteFindHolderFlag`): recorded and named on the row and on the printed record.
- A handoff `from` someone who is not the current holder: recorded, and the row says *recorded from X; the log held Y*. A correction is somebody's to make, and the paper shows the gap rather than hiding it.

## 5. Screens
**One card, *Keys & access*, on the Job Plan's Before Day 1 stage, on every service** (living, estate and Home Prep alike: vendors go through a Home Prep house too). Built like Found on site: its own lines first, each live item with its holder and its history folded, then the acts, then voided entries struck through, then the two operating rules from §1.
- **Record what we received**: one dialog, one paper per batch. Who handed them over, the day, then rows of kind, label and quantity (add a row per item; the first row is a front door key). One save writes N items and N `received` events, all to the same `to`.
- **Hand off**: tick the items (pre-ticked: everything the device's user holds), pick who, save.
- **Return to client**: tick the items (pre-ticked: everything still held), who received them (offered from the job's parties), save. Optional **File the signed hand-back** through `fileSignedCopy` (kind `access`): a photographed signature, never a new paper per handoff. The close-out paper's signature (§6) covers the normal case.
- **Mark lost**: one item, the explanation, save. See the alert below.
- **Recovered**: on a lost item only.
- Names are offered from the team roster (`_siteFindTeamNames`, lifted to a shared helper) for Havellin hands and from the client, representative, co-fiduciaries and referral partner for the client side. Free text stays allowed.

**Derived lines** (`accessLines(job)`, DOM-free, through `planDerivedLines` on Before Day 1 and Close-out, and first on the desk card like the site finds): *Keys and access items: 4 received, 3 returned, 1 held by Ashley Jerome*; red while any item is lost; amber on Close-out while any is held.

**Client dashboard**: one line under the Hours Log card, *Keys & access: 2 held (Ashley Jerome)*, opening the Job Plan card (`openJobPlanFor(id, 'p0')`). Red when an item is lost. Nothing else moves on the dashboard.

**Edit Client and intake** change two strings only: the *Access & security* row's ask becomes *"Alarm, cameras, smart locks, who else has keys, gated or HOA. No codes here: they go in the password manager."* and the walkthrough notes placeholder loses *"Key in lockbox code 4521"*. A test nets the words *code* followed by digits from both.

**Cost on a full house**: three dialogs across the job (receive, return, and a handoff where the team changes), each under thirty seconds. Nothing per room, nothing per item after the receipt.

## 6. Gates, the alert and the final records
**Close job refuses** while any item is `held` (`jobCloseBlockers` gains the line: *2 access items are still held: front door key (Ashley Jerome), garage remote (Anthony Graziano Jr). Record their return to the client on the Job Plan's Keys & access card, or mark one lost with an explanation.*). `applyJobTransition` already asks `jobCloseBlockers` in the handler, so the button and the handler agree. A `lost` item with its explanation does not block, as asked. **Mark lost / Deposit Retained** on a job holding items flags and names them in the dialog rather than refusing: the client walked, the keys still go back, and the line stays red on the dashboard until they do (§7, decision 2).

**The lost alert.** The app cannot send a message by itself under the rules in force (no `gmail.send`, no mail from Apps Script). So *Mark lost* does three things at once: writes the event, turns the item, the card line and the dashboard line red on every device within the 15-second tick, and opens a prefilled text to Anthony's mobile (`sms:`, the job, the item, the holder, the explanation) with a Gmail draft to anthony@havellinpalmbeach.com as the fallback. The row then offers *I've sent it*, which records `alertedAt` and `alertedBy`; the record prints *Managing Member notified* only once that is pressed, never on the attempt (a document never claims what the app did not witness). If Anthony wants the alert to go without a human tap, the one way is `MailApp.sendEmail` from the backend to his own address, which reopens a decided rule for one internal case (§7, decision 3).

**The final records.** One builder, `accessCustodyRecordHtml(job)`: the items table (item, received from and when, returned to and when, or lost with the explanation) and the full event history under it, voided rows struck through with their reason, every row with *recorded by*. It is printed in three places and filed by paths that already exist:
- Inside the **Disposition Ledger** on an estate and the **Contents Record** on living work, as their last section before the signature block, so the representative or the client signs that the keys came back on the paper they already sign, and the record reaches Drive at close through `_fileCloseoutPaper` with nothing new to file. A Home Prep, which files neither paper, gets the record filed on its own at close under *Key and Access Custody Record* (the same builder, `uploadHtmlToDrive`, the client's folder).
- As a third section of the **Release Approvals and Chain of Custody** record, so the estate package carries it to counsel.
- From the card's **Print** at any time, for a client, insurer or bond carrier mid-job. IN PROGRESS stamped while any item is held.

## 7. Decisions for Anthony
1. **Codes.** Keep them out of the app and change the two strings that invite them (recommended), or build the encrypted per-job field.
2. **A job marked Lost or Deposit Retained while items are held.** Flag and keep the line red until they are returned (recommended), or refuse that transition too as Close job does.
3. **The lost alert.** A prefilled text and Gmail draft the field person sends, with *I've sent it* recorded (recommended, inside the rules), or a `MailApp.sendEmail` from the backend to Anthony alone, which reopens the no-mail-from-Apps-Script rule for one internal case.

## 8. What the build touches
`havellin.html` (the two lists, the card and dialogs, `accessEventRefusal`, `accessLines`, the dashboard line, `jobCloseBlockers`, the record builder and its three readers, the two intake strings, the `access` signed-record kind), `apps-script/main-sync.gs` (`JOB_KEYED_LISTS`, `JOB_LIST_KEY`, `BACKEND_VERSION`: a redeploy is owed and until it lands two devices recording at once could drop an entry), `manual.html` / `MANUAL.md` and `concierge-guide.html` / `CONCIERGE_GUIDE.md` (the card, the gate, the two operating rules), a unit suite (`tests/key-custody.test.js`: the refusals, the derived holder, the close gate, the record's rows adding up, the app's and server's list names level, no code digits in the intake strings) and a browser step driving the card through the real controls on a phone viewport.
