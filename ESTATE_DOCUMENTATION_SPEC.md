# Estate & Probate Documentation — Workflow Review & Gap Spec

**Status:** Draft for review · Working document (not yet reflected in the app)
**Scope:** Inventory & valuation documentation for Estate Settlement / Probate / Contested Probate jobs, from client intake through the attorney/trust-officer work product.

---

## 1. Purpose

Make Havellin's inventory + valuation documentation defensible enough to hand to a **trust officer, estate attorney, or (on a taxable estate) the IRS** — while staying light on a standard job. This doc reviews what the app already does across the four relevant areas, then isolates the **true gaps** so we can scope the build.

The guiding workflow principle (established in discussion):

> **The field team triages; specialists appraise.** Ordinary household goods are valued in bulk on site by our team at resale value. Only a small set of "could-be-valuable" items (art, jewelry, silver, antiques, rugs, coins, guns, wine, collector cars) get *flagged* on site and routed to the *right specialist appraiser*. Everything is valued **as of the date of death** regardless of when we inspect.

---

## 2. How the pieces connect today

```
INTAKE ──▶ ESTIMATE (walkthrough) ──▶ JOB PLAN (on site, post-agreement) ──▶ INVENTORY TAB ──▶ Google workbook
service type      Notable Collections        Room cards:                     25-col manifest      (sync)
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

A collection flagged at the estimate ("10 paintings," "China set") gets its own photo/doc capture in the Job Plan but **never becomes line items** in the Estate Inventory tab, and **never routes to a specialist**. Unifying (or bridging) these two streams is the backbone of this spec.

---

## 3. Area-by-area: current state & gaps

### 3a. Client Intake  (`panel-intake`, lines ~280–526)

**Already there:**
- Service type: Estate Settlement (`cleanout`), Probate (`probate`), Contested Probate (`contested_probate`).
- Contact roles incl. **Estate attorney**, **Trust officer**.
- Probate block (shown for probate types): probate attorney (name/firm/phone/email), **date of death**, **case number**, **§733.604 inventory deadline** (auto-computed, editable), property-sale-required.
- Job details: property type, sqft, beds/baths, home value, walkthrough date + site-visit-by, start/target/hard dates, priority (incl. "High — probate deadline"), RE potential.
- **Premium estate?** toggle (`i-prem`): "No — standard rates" / "Yes — art, antiques, wine".

**Gaps:**
| # | Gap | Why it matters |
|---|---|---|
| I-1 | **No documentation-rigor setting.** "Premium estate" is a *rate* decision ($185 TC / $125 PS + 25 specialty-coordination hrs), not a documentation standard. | We conflate "expensive job" with "needs formal appraisals." A modest estate can still need 706-grade docs; a premium one may not. |
| I-2 | **No "is the estate taxable / is a 706 expected?" capture.** | This is *the* switch that determines whether independent qualified appraisals are required. Currently implicit in service type only. |
| I-3 | **No letters-issued date field** (deadline is computed but the anchor date isn't explicitly captured as its own intake field). | §733.604 clock and appraiser effective-date logic key off this. |

---

### 3b. Estimate — Notable Collections  (`panel-estimate`, lines ~690–727)

**Already there:**
- Collections table: description, **est. value (owner)**, qty, **disposition** (Auction / Appraise / Consign / Ebay / Replacements / Dealer / Firearms–FFL / Other).
- Correct posture: "Voice notes only at estimate. Photos post signed agreement."
- Good TC advisory script about free dealer/auction assessments and no-commission pass-through.

**Gaps:**
| # | Gap | Why it matters |
|---|---|---|
| E-1 | **Collections don't seed the inventory or the appraisal worklist** (the two-stream problem in §2). | The estimate flag is where high-value items are first spotted — it should drive everything downstream. |
| E-2 | **Disposition "Appraise" has no appraiser TYPE.** | Can't generate "all art → art appraiser, all jewelry → jewelry appraiser" lists. The Vendor Directory already has the types (`Art`, `Jewelry & Watch`, `Antiques & Furniture`, `Wine`, `Vehicle/Boat` Appraiser) — Collections just don't reference them. |
| E-3 | **No vehicle capture.** "Garage (1/2/3-car)" exists only as labor-hour scoring, not as an asset. | Cars are estate assets with real value; collector cars need appraisal, ordinary cars need a book value. Nowhere to record them. |

---

### 3c. Job Plan  (`panel-job-plan`, lines ~948–1032 + JS ~7080–7250)

**Already there:**
- Auto-generated from approved estimate; daily hours log, variance vs estimate, projection.
- **Room cards** support two capture modes:
  - Room documentation photos (before/after).
  - **Item inventory capture** (`_renderRoomInventoryCapture`): object name + category + disposition chips → one photo per object, self-identifying Drive filename (`HVLxxx_Room_INV_Category_Object_seq_stamp.jpg`).
- **Collection cards**: dedicated photo + supporting-doc capture.

**Gaps:**
| # | Gap | Why it matters |
|---|---|---|
| J-1 | **Category list is only 6** (`Art & Décor`, `Collectibles`, `Electronics & Appliances`, `Furniture`, `General/Household`, `Jewelry & Watches`). Missing: Vehicles, Silver/Precious metal, Rugs/Carpets, Firearms, Wine, Musical instruments, Books/Ephemera. | Categories are the hook for both specialist routing and the $3k artistic/intrinsic rule. Too coarse to route or flag. |
| J-2 | **No "needs appraisal" flag at capture** and no valuation fields on the room card. | On-site is exactly when the team knows "this one's special." Right now that judgment is lost until someone opens the Inventory tab. |
| J-3 | **Collections captured here still don't merge into the item manifest.** | Same two-stream problem, now on the ops side. |

---

### 3d. Estate Inventory tab  (`panel-inventory`, lines ~848–859 + JS ~7248–7645)

**Already there — and it's substantial (3 builds live; the "next build" header note is stale):**
- **Summary**: estate/case header (client, HVL ID, address, DOD, letters, §733.604 deadline, prepared-by), totals (item count, total FMV, awaiting-valuation, disputed/hold, bequests, exempt, gross/fees/net), FMV-by-category, disposition counts.
- **25-column editable manifest**: seq, room, object, category, disposition, captured-at, filename, photo link, qty, condition (Excellent…Salvage), **Estimated FMV**, **Valuation Date (defaults to DOD)**, **Valuation Source** (Appraisal / Dealer quote / Auction comps / Online comps / PR estimate), **Appraisal Doc**, **§732.402 Exempt**, **Specific Bequest**, **Disputed**, Channel/Recipient, Authorized By, Approval Date, Gross, Fees, **Net (computed)**, Date of Disposition, Receipt/Doc.
- **Manual line items** (cash, vehicle, account — no photo).
- **Auto-sync to per-client Google workbook**; internal margin correctly excluded.
- Correct disclaimer: tangible personal property only; the full §733.604 court filing (real property, accounts, securities) is the PR's, prepared with counsel.

**Gaps vs. legal/professional norms:**
| # | Gap | Norm it maps to |
|---|---|---|
| V-1 | **`Valuation Source = "Appraisal"` is unstructured.** No appraiser record: name, firm, **credential (ISA/ASA/AAA/USPAP)**, **independence attestation**, **effective date of value**, report date, signature. `Appraisal Doc` is free text. | IRS "qualified appraisal"; trust-officer/attorney defensibility; avoids the dealer-who-wants-to-buy conflict. |
| V-2 | **No valuation BASIS field** (Fair Market Value vs Replacement vs Marketable Cash vs Liquidation). | FMV is the estate/probate standard; counsel needs to know which basis each number is. |
| V-3 | **No §2032 alternate-valuation-date support.** Valuation date defaults to DOD only. | Taxable estates may elect DOD + 6 months; items sold/distributed inside the window take date-of-disposition value. |
| V-4 | **No $3,000 artistic/intrinsic auto-flag / appraisal-required guardrail.** | IRS requires a signed-under-oath appraisal for single articles of artistic/intrinsic value > $3,000 on a 706. |
| V-5 | **No per-specialist appraisal worklist export.** | The high-leverage deliverable: hand each appraiser a clean photo packet of just their category. |
| V-6 | **No asset-track tag** (Probate / Trust / Non-probate / Homestead / Exempt). Homestead isn't distinguished; only §732.402 exempt flag exists. | Keeps the probate inventory from overstating the estate; lets one manifest yield both a probate inventory and a trust schedule. |
| V-7 | **One workbook export, not two purpose-built ones.** | Trust officer/attorney want (a) a clean **§733.604-style court inventory** and (b) a **disposition/accounting ledger** — as separate artifacts. |
| V-8 | **Chain of custody is per-line fields, not an event log.** (`Authorized By` / `Approval Date` / `Receipt` only.) | Contested/high-value items want released-to / received-by / date / method / receipt trail. |
| V-9 | **No amended-inventory / as-of snapshots.** | §733.604 supplemental inventory; showing the trust officer "what changed and when." |

---

## 4. The unifying model (what ties the gaps together)

Three shared primitives resolve most of the gaps at once:

**(a) One category taxonomy — the single source of truth.** Extend the category list and attach two attributes to each category:
- `appraiserType` → which specialist (maps to existing Vendor Directory types).
- `intrinsic` (bool) → subject to the $3,000 rule.

| Category | appraiserType | intrinsic ($3k rule) |
|---|---|---|
| Art & Décor | Art Appraiser | ✔ |
| Jewelry & Watches | Jewelry & Watch Appraiser | ✔ |
| Silver / Precious Metal | Antiques & Furniture Appraiser | ✔ |
| Antiques / Fine Furniture | Antiques & Furniture Appraiser | ✔ |
| Rugs & Carpets | Antiques & Furniture Appraiser | ✔ |
| Collectibles (coins/stamps) | (specialized dealer) | ✔ |
| Firearms | FFL / firearms specialist | ✔ (some) |
| Wine & Spirits | Wine Appraiser | ✔ |
| **Vehicles** | Vehicle/Boat Appraiser *(collector only)* | book value if ordinary |
| Furniture (ordinary) | — | ✗ |
| Electronics & Appliances | — | ✗ |
| General / Household | — | ✗ |

**(b) One documentation-rigor switch (intake-level), distinct from the Premium-estate rate toggle.**
- **Standard** — reasonable team estimates; dealer/auction assessments fine; appraisals only where obvious.
- **Formal / 706-grade** — independent qualified appraisals required for every intrinsic item ≥ $3k; appraiser records mandatory; DOD retrospective; court-ready exports.
- Default derivation: `contested_probate` → Formal; `probate` + "taxable/706 expected = yes" → Formal; else Standard (overridable).

**(c) One bridge between the two streams.** A flagged Collection (or a room-card item marked "needs appraisal") becomes a first-class inventory line carrying its `appraiserType`, so it appears in both the manifest and the per-specialist worklist.

---

## 5. Proposed build — phased

### Phase 1 — Flagging & routing (highest leverage, lowest risk)
1. **Extend the category taxonomy** (§4a) as a shared constant; add `appraiserType` + `intrinsic`. Used by room-card capture, Collections, and the Inventory tab.
2. **Vehicle capture**: new "Vehicles" category + a lightweight vehicle sub-form (year/make/model/VIN/mileage/condition) at estimate (garage/"Automobiles" section) and as a manual inventory line; **collector? toggle** → routes to Vehicle/Boat appraiser, else "book value (KBB/NADA/Edmunds, DOD)".
3. **"Needs appraisal" flag** on room-card capture, auto-suggested when `category.intrinsic && (no FMV or FMV ≥ $3k)`.
4. **Per-specialist appraisal worklist export**: grouped by `appraiserType`, each a photo packet (item, room, condition, photo link) — the artifact we hand appraisers.

### Phase 2 — Valuation defensibility
5. **Appraiser record** (reusable per estate): name, firm, credential, independence attestation, effective date, report date, signature; link to items; replaces free-text `Appraisal Doc` when source = Appraisal.
6. **Valuation basis** field (default FMV).
7. **$3,000 guardrail**: intrinsic item ≥ $3k on a *Formal* job can't be marked documentation-complete without an appraiser record.
8. **Documentation-rigor switch** at intake (§4b) driving 3 & 7.

### Phase 3 — Court/fiduciary work product
9. **Two exports**: §733.604-style **Court/Attorney Inventory** (DOD FMV, homestead/exempt separated, no internal figures, attestation line) + **Disposition/Accounting Ledger** (gross/fees/net/receipts/custody).
10. **Asset-track tag** (Probate/Trust/Non-probate/Homestead/Exempt).
11. **§2032 alternate-valuation-date** estate toggle.
12. **Chain-of-custody event log** for high-value/contested items.
13. **Amended-inventory / as-of snapshots.**

---

## 6. Open decisions for review

1. **Collections ↔ Inventory bridge:** should a flagged collection *explode into individual line items* (10 paintings = 10 rows) or stay one summary line that still routes to the appraiser? (Recommend: summary line at estimate, explode-on-site option in the Job Plan.)
2. **Rigor switch placement:** auto-derive from service type + a new "706 expected?" question, or a manual Standard/Formal selector, or both?
3. **Vehicles at estimate:** dedicated "Automobiles" section, or fold into a broadened garage/asset block?
4. **How hard is the $3k guardrail** — a soft warning badge, or a hard block on "documentation complete" for Formal jobs?
5. **Export format**: match a specific Palm Beach County / 15th Circuit inventory layout counsel expects, or a clean generic §733.604 format?

---

## 7. Housekeeping

- **`manual.html` reconciliation** (per `CLAUDE.md`): any of these changes to the Inventory taxonomy, new categories, the vehicle section, or new tabs/fields will require a reconciliation pass (last done 2026-07-14).
- Framing throughout stays **documentation support, not legal or appraisal opinion** — the estate attorney and a credentialed appraiser remain the authority on any estate.
