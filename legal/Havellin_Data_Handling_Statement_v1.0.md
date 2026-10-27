# Havellin Palm Beach, LLC: How Client Records Are Held

**Data-handling statement for a trust department's or law firm's vendor review. Version 1.0, 27 October 2026. Drafted, not reviewed: counsel has not read it, and every bracketed item is to be confirmed before it is sent to anyone.**

## What we hold

For each engagement Havellin keeps the client record (names, addresses and contact details of the client, the personal representative or trustee, co-fiduciaries and counsel; the matter's court or trust details), the estimate, the agreement, invoices and payments recorded, hours worked, the room-by-room inventory (each item's description, room, condition, disposition, recipient and, where the engagement states values, its value and the basis of that value), photographs of the property as found and of each inventoried item, signed papers (release approvals, receipts, the Disposition Ledger), incident reports, and the keys and access items handed to us. Access codes are recorded on the item they open, shown only to the concierges, and wiped from the record when the engagement closes.

## Where it lives

- **The record** is held in a Google Sheet in Havellin's Google Workspace account, read and written only through a Google Apps Script web application that runs as that account.
- **Photographs and documents** are filed in the client's own folder on a Shared Drive in the same Workspace account, in named subfolders (Estate Inventory, As-Found Record, Signed Records, Incident Reports and the like).
- **On our devices** (iPads and laptops used by Havellin's people), the application keeps a working copy of the records and small photograph previews, so that it can work in a house with poor reception. A device can be cleared of all client records from its Settings.
- The application itself is a web page published from a code repository; the page and its code contain no client data.
- [To be confirmed by Anthony: the Workspace edition, and Google's statement of encryption at rest and in transit for it.]

## Who can open it

- Havellin's principals with access to the Workspace account: [Anthony to list by name].
- The application on a Havellin device. The Apps Script answers only devices that carry its device key, which Havellin's principal sets and types once on each device; a lost device or a departing contractor's device is locked out by changing or removing its key. [To be confirmed: the date the key was switched on, and that every device is passcode-locked.]
- Counsel and fiduciaries we name: the photograph folders of an estate are shared read-only with named people only (never "anyone with the link"), and only with an address recorded on that client's file. Each share, each withdrawal of access and each file removed from Drive is written to an access log with the date, the client and the address; the share is also recorded on the client's file.

## Who else receives part of it, and why

- **Anthropic (the Claude API)**, which identifies and researches the value of inventoried items: the item photographs (never the as-found pass), the room's name, the walkthrough's note on the room, the crew's spoken or typed note, and the item descriptions. No client name, address or contact detail is sent, the model that names items is instructed never to describe a person who appears in a photograph, and the model that values them searches public sale records from the item's description alone, never with an owner's or a recipient's name. Requests are sent from the Apps Script with Havellin's own API key. [To be confirmed: Anthropic's commercial terms on retention of API inputs and outputs and on their use for training, as they apply to Havellin's account; cite the document and its date.]
- **DocuSign**, which carries the agreement and, on an estate, the release approval request, with each signer's name and email.
- **Stripe**, which receives an invoice's amount, description and our file number to make an ACH payment link. The client enters their bank details on Stripe's own page; they never reach Havellin's records.
- **Google (Gmail)**, where every client email is drafted in Havellin's own mailbox and sent by a person.

## How long we keep it

Project Records (the documentation media and the written record of the contents and their disposition) are kept for seven years under Section 7.1 of our agreements. A photograph or file removed from Drive goes to Drive's bin, which holds it for 30 days. Google Sheets keeps a version history of the record, so an earlier value (an access code wiped at close included) remains in that history unless the history is deleted. [Counsel: whether to purge access codes from the version history at close.]

## If something goes wrong

If a device is lost or a key or link may have been exposed, Havellin's principal changes or removes the device key the same day, reviews the access log and the folders' sharing, and withdraws any access that should not exist. [Counsel: the notice owed to clients, fiduciaries and any regulator, its timing and its form, including under Florida's data-breach statute.] [Anthony: the named person responsible, and the contact for a trust department's follow-up questions.]

*This statement describes how the application is built as of the date above; it is not a warranty, and it is updated when the application changes.*
