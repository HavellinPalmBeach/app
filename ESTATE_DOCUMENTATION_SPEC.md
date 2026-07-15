# Estate & Probate Documentation — Workflow Review & Build Spec

**Status:** Scope locked, pending build sign-off · No app code changed yet
**Scope:** Inventory & valuation documentation for Estate Settlement / Probate / Contested Probate jobs, from client intake through the attorney/trust-officer work product, including photo capture and Drive delivery.

---

## 1. Purpose

Make Havellin's inventory + valuation documentation defensible enough to hand to a **trust officer, estate attorney, or (on a taxable estate) the IRS** — while staying light on a standard job. This doc reviews what the app already does, isolates the true gaps, records the decisions we've made, and specifies the phased build with code touchpoints.

Guiding workflow principle:

> **The field team triages; specialists appraise.** Ordinary household goods are valued in bulk on site by our team at resale value. Only a small set of "could-be-valuable" items (art, jewelry, silver, antiques, rugs, coins, guns, wine, collector cars/boats) get *flagged* on site and routed to the *right specialist appraiser*. Everything is valued **as of the date of death** regardless of when we inspect.

---

## 2. How the pieces connect today

```
INTAKE ──▶ ESTIMATE (walkthrough) ──▶ JOB PLAN (on site, post-agreement) ──▶ INVENTORY TAB ──▶ Google workbook
service type      Notable Collections        Room cards:                     25-col manifest      (auto-sync)
probate fields    (voice notes only)         · room photos (before/after)    editable valuation
premium toggle    disposition select         · item inventory capture         + proceeds ledger
                                             Collection cards:
                                             · photos + docs
```

**Critical structural finding — two disconnected streams:**

| Stream | Where captured | Data label | Flows into Inventory manifest? |
|---|---|---|---|
| **Notable Collections** | Estimate walkthrough | `label:'collection'`, `collId` | **No** |
| **Item Inventory** | Job Plan room cards | `label:'inventory'`, `!collId` | Yes |

A collection flagged at the estimate ("10 paintings," "China set") gets its own photo/doc capture in the Job Plan but **never becomes line items** in the Estate Inventory tab, and **never routes to a specialist**. Bridging these two streams is the backbone of this spec.

---

## 3. Area-by-area: current state & gaps

### 3a. Client Intake  (`panel-intake`, lines ~280–526)

**Already there:** service type (Estate Settlement/`cleanout`, `probate`, `contested_probate`); contact roles incl. Estate attorney, Trust officer; probate block (attorney contact, **date of death**, **case number**, **§733.604 deadline** auto-computed, property-sale-required); job details; priority incl. "High — probate deadline"; **Premium estate?** toggle (`i-prem`, a *rate* decision).

**Gaps:** (I-1) no documentation-rigor setting — "Premium estate" is rate, not documentation standard; (I-2) no "is a 706 expected / is the estate taxable?" capture; (I-3) letters-issued date not captured as its own field.

### 3b. Estimate — Notable Collections  (`panel-estimate`, lines ~690–727)

**Already there:** collections table (description, est. value, qty, disposition incl. Appraise / Firearms–FFL); correct "voice notes only at estimate, photos post-agreement" posture; good TC advisory script.

**Gaps:** (E-1) collections don't seed inventory or the appraisal worklist; (E-2) disposition "Appraise" has no appraiser *type* (the Vendor Directory already has Art / Jewelry & Watch / Antiques & Furniture / Wine / Vehicle-Boat Appraiser — Collections just don't reference them); (E-3) no vehicle capture — "Garage (1/2/3-car)" is labor scoring only.

### 3c. Job Plan  (`panel-job-plan`, lines ~948–1032 + JS ~7080–7250)

**Already there:** auto-generated from approved estimate; hours log + variance; room cards with room photos (before/after) **and item inventory capture** (object + category + disposition chips → one self-identifying photo per object); collection cards with photo + doc capture.

**Gaps:** (J-1) category list is only 6 (`Art & Décor`, `Collectibles`, `Electronics & Appliances`, `Furniture`, `General/Household`, `Jewelry & Watches`) — missing Vehicles, Silver/Precious metal, Rugs, Firearms, Wine, Musical instruments, Books; (J-2) no "needs appraisal" flag at capture, no valuation fields on the room card; (J-3) collections still don't merge into the item manifest.

### 3d. Estate Inventory tab  (`panel-inventory`, lines ~848–859 + JS ~7248–7645)

**Already there — substantial; the "next build" header note is stale (3 builds live):** summary (estate/case header, totals, FMV-by-category, disposition counts); **25-column editable manifest** (seq, room, object, category, disposition, photo link, qty, condition, **Estimated FMV**, **Valuation Date defaults to DOD**, **Valuation Source**, **Appraisal Doc**, **§732.402 Exempt**, **Specific Bequest**, **Disputed**, Channel/Recipient, Authorized By, Approval Date, Gross, Fees, **Net computed**, Date of Disposition, Receipt/Doc); manual line items; **auto-sync to per-client Google workbook**; internal margin correctly excluded; correct "tangible personal property only" disclaimer.

**Gaps vs legal/professional norms:** (V-1) `Valuation Source = "Appraisal"` unstructured — no appraiser record (name, credential ISA/ASA/AAA/USPAP, independence, effective date, report date); (V-2) no valuation **basis** field (FMV vs Replacement vs Liquidation); (V-3) no §2032 alternate-valuation-date support; (V-4) no $3,000 artistic/intrinsic auto-flag/guardrail; (V-5) no per-specialist worklist export; (V-6) no asset-track tag (Probate/Trust/Non-probate/Homestead); (V-7) one workbook export, not the two purpose-built ones; (V-8) chain of custody is per-line fields, not an event log; (V-9) no amended-inventory / as-of snapshots.

### 3e. Photo capture & Drive delivery  (`havellin.html` ~7080–7900, 11240–11450; `apps-script/*.gs`)

**Already there:** each client gets a **Drive folder** (HVL ID + client + service) with 8 auto-created subfolders — `Photos`, `Walkthrough Notes`, `Estimate`, `Agreement`, `Change Orders`, `Asset Documentation`, `Invoice`, `Job Log`. Item photos → `Photos`; collection photos + docs → `Asset Documentation`. Photos carry **self-identifying filenames** (`HVL123_Room_INV_Category_Object_seq_stamp.jpg`); each row stores `driveFileUrl` + `filename`; the manifest exposes **Photo Filename** + **Photo Link** columns. The per-client inventory **workbook** (`Estate Inventory — HVLxxx`) is regenerated on every change and **already prefers the `Asset Documentation` subfolder** so it ships with the docs (`saveInventory.gs:46`).

**The "list references the file, photos live in Drive" model is therefore essentially built.** The one true gap: **no access provisioning** — `createJobFolder` never shares anything; delivering photos to counsel today means a manual Drive share, and sharing the whole client folder would expose financials.

**Gaps:** (P-1) item photos and collection docs live in *two* folders, so no single shareable unit; (P-2) no in-app sharing — manual Drive step; (P-3) no revoke path; (P-4) risk of over-sharing the client root (financial subfolders).

---

## 4. Unifying model (the primitives that resolve most gaps at once)

**(a) One category taxonomy — single source of truth.** Extend the category list; attach `appraiserType` (maps to existing Vendor Directory types) + `intrinsic` (subject to the $3k rule).

| Category | appraiserType | intrinsic ($3k rule) |
|---|---|---|
| Art & Décor | Art Appraiser | ✔ |
| Jewelry & Watches | Jewelry & Watch Appraiser | ✔ |
| Silver / Precious Metal | Antiques & Furniture Appraiser | ✔ |
| Antiques / Fine Furniture | Antiques & Furniture Appraiser | ✔ |
| Rugs & Carpets | Antiques & Furniture Appraiser | ✔ |
| Collectibles (coins/stamps) | Specialized dealer | ✔ |
| Firearms | FFL / firearms specialist | ✔ (some) |
| Wine & Spirits | Wine Appraiser | ✔ |
| Vehicles & Watercraft | Vehicle/Boat Appraiser *(collector only)* | book value if ordinary |
| Furniture (ordinary) | — | ✗ |
| Electronics & Appliances | — | ✗ |
| General / Household | — | ✗ |

**(b) One documentation-rigor switch (intake-level), distinct from the Premium-estate rate toggle.**
- **Standard** — reasonable team estimates; dealer/auction assessments fine; appraisals only where obvious.
- **Formal / 706-grade** — independent qualified appraisals required for every intrinsic item ≥ $3k; appraiser records mandatory; DOD retrospective; court-ready exports.
- Derivation: `contested_probate` → Formal; `probate` + "706 expected = yes" → Formal; else Standard. Editable, with a required reason on downgrade.

**(c) One bridge between the streams.** A flagged Collection (or a room-card item marked "needs appraisal") becomes a first-class inventory line carrying its `appraiserType`, appearing in both the manifest and the per-specialist worklist.

---

## 5. The build — phased

### Phase 1 — Flagging, routing & estimate UX
1. **Shared category taxonomy** (§4a) as a constant with `appraiserType` + `intrinsic`; consumed by room-card capture, Collections, and the Inventory tab. Extend `INV_CATEGORIES`.
2. **Vehicles & Watercraft** — dedicated **collapsible** section near Notable Collections; add-row (year/make/model/VIN/mileage/condition + **collector?** + **title located?**); ordinary → stores book-value source/date (KBB/NADA/Edmunds, DOD); collector → routes to Vehicle/Boat appraiser. Also a manual inventory line type.
3. **Expandable/collapsible room sections** in the estimate's Room-by-Room Assessment — accordion on the existing section groupings (`Garage & Storage`, `Lifestyle`, `Kitchen & Utility`, …). Auto-expand sections with checked rooms, collapse empty ones, remember state within the session.
4. **"Needs appraisal" flag** on room-card capture, auto-suggested when `category.intrinsic && (no FMV or FMV ≥ $3k)`.
5. **Collections → Inventory bridge**: at estimate, a collection is one summary line; on-site (Job Plan) an **"itemize vs. keep as lot"** choice (category-defaulted) explodes it into rows or keeps it a lot, each carrying `appraiserType`.
6. **Per-specialist appraisal worklist export** — grouped by `appraiserType`, each a photo packet (item, room, condition, photo link).

### Phase 1.5 — Drive restructure (small, do early — free only while there's no data)
7. **Consolidate** `Photos` + `Asset Documentation` → one **`Estate Inventory`** folder holding item photos + collection photos + collection docs + the inventory workbook (workbook already targets that folder). Keep `Estimate`, `Agreement`, `Change Orders`, `Invoice`, `Job Log`, `Walkthrough Notes` as internal folders, never shared.
   - Touchpoints: `createJobFolder` subfolder list (`main-sync.gs:445`); repoint the two upload paths in `_doPhotoUpload` callers (`'Photos'`, `'Asset Documentation'` → `'Estate Inventory'`); `saveInventory.gs` workbook target (line ~46).

### Phase 2 — Valuation defensibility
8. **Appraiser record** (reusable per estate): name, firm, credential, independence attestation, effective date, report date, signature; links to items; replaces free-text `Appraisal Doc` when source = Appraisal.
9. **Valuation basis** field (default FMV).
10. **Documentation-rigor switch** at intake (§4b) + new **"Is a 706 expected?"** question; drives 11.
11. **$3,000 guardrail**, rigor-gated: Standard → soft badge; Formal → **hard block on "documentation complete"** for intrinsic items ≥ $3k without an appraiser record, with a logged **"Appraisal waived by [PR/attorney] — reason"** override. Blocks the milestone/export-as-final step only — never data entry or saving.

### Phase 3 — Court/fiduciary work product & delivery
12. **Two exports** (generic, statute-aligned — no county/firm-specific layout): §733.604-style **Court/Attorney Inventory** (DOD FMV, homestead/exempt separated, per-category subtotals, no internal figures, attestation line) + **Disposition/Accounting Ledger** (gross/fees/net/receipts/custody).
13. **In-app share to counsel** — "Share inventory with counsel" button grants **named-viewer** access to just the `Estate Inventory` folder, pre-filled from the attorney/trust-officer email captured at intake; **revoke** pair (`removeViewer`); never "anyone with link". Live share (a frozen snapshot would be a separate export).
   - Touchpoints: new Apps Script `shareFolder` / `unshareFolder` actions (`folder.addViewer/removeViewer`); UI button on the Inventory tab.
14. **Asset-track tag** (Probate/Trust/Non-probate/Homestead/Exempt).
15. **§2032 alternate-valuation-date** estate toggle.
16. **Chain-of-custody event log** for high-value/contested items.
17. **Amended-inventory / as-of snapshots.**

---

## 6. Resolved decisions

1. **Collections ↔ Inventory:** summary line at estimate; on-site **itemize-or-lot** toggle, category-defaulted (fine art/jewelry → itemize; coins/china/flatware/books → lot). *(Phase 1, item 5.)*
2. **Rigor switch:** **both** — auto-derived default + editable override with required reason on downgrade; add the "706 expected?" intake question. *(Phase 2, item 10.)*
3. **Vehicles:** **dedicated** collapsible "Vehicles & Watercraft" section, not folded into the garage/labor block. *(Phase 1, item 2.)*
4. **$3k guardrail:** **rigor-gated** — soft on Standard, hard-with-logged-override on Formal; blocks the milestone, not data entry. *(Phase 2, item 11.)*
5. **Export format:** **generic §733.604-aligned**, no attorney confirmation needed at this stage. *(Phase 3, item 12.)*
6. **Drive structure:** merge into one shared **`Estate Inventory`** folder; financial/internal folders stay private; **do the restructure early** while there's no data. *(Phase 1.5.)*
7. **Sharing:** **in-app named-viewer share + revoke**, pre-filled from intake email; live share. *(Phase 3, item 13.)*
8. **Estimate UX:** **expandable/collapsible room sections**, built alongside the vehicles section. *(Phase 1, item 3.)*

---

## 7. Housekeeping & framing

- **`manual.html` reconciliation** (per `CLAUDE.md`): the new categories, Vehicles section, rigor switch, appraiser records, new exports, and the Drive/sharing changes will require a reconciliation pass (last done 2026-07-14). Flag when we reach each phase.
- **Version timestamp** (`havellin.html` ~line 247) gets bumped on every app-code commit, per `CLAUDE.md`.
- Framing stays **documentation support, not legal or appraisal opinion** — the estate attorney and a credentialed appraiser remain the authority on any estate. The court inventory Havellin produces is the tangible-personal-property schedule that feeds counsel's filing, not the filing itself.
