# Retired branches — restore manifest

Every `claude/*` working branch on the remote as of **2026-09-09 5:22PM ET**, deleted
that day so the repository has one obvious place to copy code from.

**Why they were deleted.** `apps-script/main-sync.gs` was being copied for deployment from
`claude/concierge-hours-pricing-3dv2gq` — a branch last touched 2026-07-29 — so the live Apps
Script ran six-week-old code for weeks while every redeploy was performed correctly. Three
features shipped against a backend that never had them. Deleting the branches removes the
wrong thing to copy; `main` is the only source now.

**Nothing was lost.** `main` was verified as the most advanced state of every tracked file
before deletion — no branch's `havellin.html` was larger than main's, and the divergent
commit counts are an artefact of main's history having been squashed, not unmerged work.

**To restore any branch:**
```
git push origin <sha>:refs/heads/<branch-name>
```
The commits stay reachable in the GitHub repository; this file is the index of where they were.

| Last commit | Branch | Tip SHA |
|---|---|---|
| 2026-09-09 | `claude/eager-euler-u5lt65` | `bb52ef58df87ba9a2522e3e71260ba43ad69b1d1` |
| 2026-09-08 | `claude/kind-hawking-j7iugr` | `043aeba832b3e267a428c052d769f42b28c0bf6c` |
| 2026-09-08 | `claude/home-transition-terminology-elllih` | `3ef92d1b7adfcf4a4537b38693dc5a01f18fb409` |
| 2026-09-04 | `claude/estate-settlement-pricing-3wmldo` | `69991ca3d3fc86ff4e6b756ed4b70b5233d508be` |
| 2026-09-02 | `claude/vendor-save-error-pa0kib` | `a9c0b2e452780fc57c88a7f26e99deb3c6f6dd41` |
| 2026-08-27 | `claude/box-formatting-alignment-c3z6h7` | `ca99372eea797f6c5550273b421494003cf2ccb1` |
| 2026-08-24 | `claude/code-audit-document-review-jilk87` | `363fc487981ac19854d295f1710cf7cf8f75c0b4` |
| 2026-08-11 | `claude/app-build-status-testing-mf5nq2` | `883d9e874584346ae4291b059f03c522bb8660df` |
| 2026-08-04 | `claude/photo-sync-google-drive-69ykub` | `c99cd58c47f97957316dd83330b896697e8c4e43` |
| 2026-08-03 | `claude/master-suite-cleaning-hours-g62ink` | `a55362d21f278bc5939d79e3f3c8890a02529b90` |
| 2026-08-03 | `claude/home-prep-sale-consolidation-13yxt9` | `ed1f553a097d92768856baa0654cda664f6a3846` |
| 2026-08-03 | `claude/field-app-formatting-9eu5ff` | `047ea2c0dfc028afe3936e53c0cb12bf9e6e0f1d` |
| 2026-08-02 | `claude/concierge-operations-manual-v849h5` | `c3152521cd0a9a35de06095a565725ecc993e8a6` |
| 2026-07-31 | `claude/thoughts-1hq2kt` | `7845176b43c76ed440536c89a806c666bb9c7142` |
| 2026-07-30 | `claude/code-review-j44jza` | `9e37f3fd19194711eee65e44d6a4efe7b2724bd2` |
| 2026-07-30 | `claude/concierge-offsite-coordination-question-rxxotc` | `a9ad285b584d5899f15a51574d22c6e557b8d05f` |
| 2026-07-29 | `claude/concierge-hours-pricing-3dv2gq` | `3e12d95dd620ec0136d19d53a48c7ca58c244e65` |
| 2026-07-29 | `claude/formatting-fixes-4v5uke` | `37fba8416647d7af871f20f2b91e32aabbcb55ce` |
| 2026-07-28 | `claude/mobile-friendly-tabs-2zpv1d` | `0fbda58ec91788db1da9f79023cf04b602c5a535` |
| 2026-07-27 | `claude/havellin-architecture-brief-9dpwgh` | `18877d169925eea7c11266607889cd90e3f834a6` |
| 2026-07-23 | `claude/fix-partner-delete-namecheck` | `ad1bd6ecca5fdcb81714d0468c9cf65d2b5e170d` |
| 2026-07-23 | `claude/directory-delete` | `13582653417f13df4fe8e5ab826825db50a002c4` |
| 2026-07-22 | `claude/edit-modal-popup` | `a1b50b3276106beae91f69cf8bc83367ab589991` |
| 2026-07-22 | `claude/referral-card-revamp` | `e8c8c36dcf7e97e1b9bad7aa65e79ecd18828af0` |
| 2026-07-22 | `claude/vendor-card-revamp` | `273347bfa82f5e3f5e39498895ff6d90f8d5b1da` |
| 2026-07-22 | `claude/ai-assistant-training-doc-21b2s8` | `3e87930e0f58b98a258953a632c1bf8d42b7c32d` |
| 2026-07-17 | `claude/vendor-sorting-layout-jp77xx` | `84e03180a22902c12380cfa194c48ded039ced91` |
| 2026-07-16 | `claude/session-7e5imh` | `f853f6246fc43704e182187fa58ba324f9c08b7f` |
| 2026-07-14 | `claude/vendor-formatting-consistency-02yjfv` | `20076d840f829294786628a4f2332e21baf93e49` |
| 2026-07-14 | `claude/vendor-categories-floor-services-7hdc58` | `187446c1a6eba7346dcd6abc9da52238a294e155` |
| 2026-07-13 | `claude/referral-partner-spreadsheet-7x8yrk` | `92d64f24d70e381a1426bcf1d5c68d68c526fe6b` |
| 2026-07-13 | `claude/home-prep-sale-fees-iyqspj` | `5f3389556183ff76a160ab25f8763e3174ea4e68` |
| 2026-07-10 | `claude/out-of-scope-rooms-7ni6bn` | `2d1d0aab4d1d2a32938562f113d03a7da6025388` |
| 2026-07-09 | `claude/contractors-sync-devices-8n2pe6` | `dac7b619c5a520fea352ca0bbcbc0494ca410c15` |
| 2026-07-07 | `claude/property-timeline-estimates-11zssd` | `1b0689d71e98a22e63e279e42413ab14ffa6b2cc` |
| 2026-07-03 | `claude/estimation-engine-recalibration-2nampi` | `99233dae0431be985add83d1b566e0b32ebfb593` |
| 2026-07-03 | `claude/vendor-management-tab-mrd8q2` | `d17341cd3ce24461ae07457f56792e694544150e` |
| 2026-06-21 | `claude/intake-estimate-fixes` | `95e99529c6fdf77745dc3a26a28b96c905c02d34` |
| 2026-06-19 | `claude/youthful-edison-4lbffb` | `8ab3fcd99a89f1d54f6e0941832c35f678eb340c` |
| 2026-06-19 | `claude/peaceful-darwin-02gklh` | `703b5e58961fdcd9ed3ab81182581089f6cd99f8` |
| 2026-06-18 | `claude/lucid-shannon-qocj2b` | `282258bf7da2d1088d3983d5acb4e0e02117037e` |
| 2026-06-16 | `claude/contested-authority-roles` | `32d4de49eb019bfb11492f8c2ab29f956b3c71f7` |
| 2026-06-16 | `claude/blissful-mccarthy-r4hrfl` | `bddb99a38bafcebe96f543961a2bda6edd0af289` |
| 2026-06-15 | `claude/job-log-room-progression-khgx2z` | `320d514a5879144295e962f2ce0ed74d32b8d764` |
| 2026-06-14 | `claude/first-page-margin` | `6ed7dcc572d05d5b7c68ba47cd0723f6eecbe38b` |
| 2026-06-14 | `claude/print-margins` | `34df996412fed3836f6e45ad2a1f008200fea053` |
| 2026-06-14 | `claude/collection-vendors` | `9406543ea7ef07aac35f72606dcc8124c9822780` |
| 2026-06-14 | `claude/editable-collections` | `340e49dad2a8d499eb80ddf663405d3e641ede9d` |
| 2026-06-14 | `claude/thirdparty-atcost` | `0e3f15a7eb3c9995859a3ad2366773df0b90d75b` |
| 2026-06-14 | `claude/remove-inlieu` | `d148377d1fb1869d88f0a8e4a1a26a6a2133aa85` |
| 2026-06-14 | `claude/fix-svc-label` | `e5d853da6fdf86ed44f98ba1416d113fa013e678` |
| 2026-06-14 | `claude/estimate-home-ref` | `52fdaf09ef64ab2797c0c8228cee0cfbbfd4edd6` |
| 2026-06-14 | `claude/show-nocost-vendors` | `cdd8c4ef87545e7b26e63517cba5e798c17b71d4` |
| 2026-06-14 | `claude/fix-vendor-input` | `fecc68ad1e1e20750a171cda839892a9b254f46f` |
| 2026-06-14 | `claude/standardize-buttons` | `db7cfa67bf6dc2fb0ac30cb88c3d8f036d85c72b` |
| 2026-06-14 | `claude/job-option-format` | `00f3888e33dabe3ee81f447a1016df6505ed0c65` |
| 2026-06-14 | `claude/standardize-bars` | `0bb4b7417e41fd001ef27410adbac1efd5cd46b1` |
| 2026-06-14 | `claude/invoice-est-source` | `2a3b8e5c34434787eaf385bdf9b4b19eae198484` |
| 2026-06-14 | `claude/invoice-controls` | `299e89eb17029089d4ca193e2c93659c05d6a472` |
| 2026-06-14 | `claude/fix-amtbox` | `44cb3ed21abfdaef152f1cdb043287aafef1cd47` |
| 2026-06-14 | `claude/payment-schedule` | `73521635f4e7cf6692e4049d8c5f6c453f63166e` |
| 2026-06-14 | `claude/fix-invoice-print` | `60e7b34293ee402695acbb302c45051ee78a3a6a` |
| 2026-06-14 | `claude/invoice-approval` | `5202e207ca00225271bd8c9300398fb645653d10` |
| 2026-06-14 | `claude/header-jobid` | `333d1ab9a44c1c47646ea83afb81c71c0beec648` |
| 2026-06-14 | `claude/invoice-default-stage` | `ec4f4671ad0ae7dd165382dc1a561ffe606b2e5d` |
| 2026-06-14 | `claude/invoice-meta` | `f46e952617fbf567b0812c50d45661dcd47ecde0` |
| 2026-06-14 | `claude/midpoint-top` | `6ed8541ea5fcae2a81b4e104a4d3edacf07afd87` |
| 2026-06-14 | `claude/estimate-dest-display` | `fb7e45b653f238ab9c0120fab4498f9b2f257161` |
| 2026-06-14 | `claude/invoice-rebrand` | `607992bd9f8a097c13ccac681f5f35adaaa83c5a` |
| 2026-06-14 | `claude/midpoint-gate` | `c319ac6ea456156b1d1987c23b9dd5ff784e40b9` |
| 2026-06-14 | `claude/phase1-grid` | `8945a5b976bdff2320209bf81fc60a015a09fb0d` |
| 2026-06-14 | `claude/invoices-rename` | `a63405f8b66ec87f7677b83ca5fe2d8c1ed21198` |
| 2026-06-14 | `claude/phase-room-split` | `219a772f7fa7452a8df8e8b4daa78e986263aa87` |
| 2026-06-14 | `claude/room-cards-white` | `9795fb84b952a9792d26d1ac815c758f0f8e57bf` |
| 2026-06-14 | `claude/field-white` | `974f724611bdf20bd75bd2c14574e69520931ad9` |
| 2026-06-14 | `claude/sync-toast` | `29bc8858eb8736605c54c20ad8d5b97b0aec1c1f` |
| 2026-06-14 | `claude/jobplan-sync` | `1c49eb8a36f15bec1a844595e7da502ade5a2ff7` |
| 2026-06-14 | `claude/vendor-card-white` | `d2e21dbcd9610d18b90fe9b19ff51bd16bcbf22f` |
| 2026-06-14 | `claude/logistics-dedup` | `8812a14506ea9496ec9b3b44170a2fedae7c663b` |
| 2026-06-14 | `claude/logistics-vendors` | `6dacdc982a17fb240dbc65a23ff4de817ed93f50` |
| 2026-06-14 | `claude/jobplan-ui-fix-2` | `6d2dd31b2c2fe637315b08304f6532766277d08d` |
| 2026-06-14 | `claude/crew-lock` | `a5f525eda0aed45d45560ea0283b45570e61c9c8` |
| 2026-06-14 | `claude/job-plan-phase0-cleanup` | `f4a408c6827b8420592066c9cbff0f037e3ea045` |
| 2026-06-14 | `claude/prep-vendor-actuals` | `a640af9ff7a20d1daeafaed9b75765a0d679be45` |
| 2026-06-14 | `claude/sweet-cerf-oi2wqb` | `7e109fea21d2d24a16d3f492db42cb2ad574696c` |
| 2026-06-14 | `claude/jolly-feynman-iy2u76` | `5320ba714e06d71690a9fcf3739ff4495ae7668e` |
| 2026-06-13 | `claude/zen-ride-v4x393` | `3bc096d90b47b4d578b1592b9f2edb42e040079b` |
| 2026-06-13 | `claude/zealous-meitner-ykluth` | `946027708d238a538b589fe84aa437af68572d61` |
| 2026-06-12 | `claude/wizardly-ptolemy-96snen` | `97b4c3a17dc31543683960432737edb857e80b65` |
| 2026-06-12 | `claude/compassionate-brown-4oti6a` | `fbb5f0ce2fc18fab4f58b6b9394be55c9d2b09e1` |
| 2026-06-04 | `claude/happy-ptolemy-3daIK` | `9bae9dd546d677c78a263cba3897bd901c970e00` |
| 2026-06-02 | `claude/havellin-notes-reconciliation-VyzvW` | `a3f83cabdea94c9fd06f692f586a79f741367fb2` |
| 2026-05-28 | `claude/client-intake-property-fields-oeGQU` | `3877a0f23cb517a99911bdd922b106b5176b9893` |
| 2026-05-20 | `claude/crew-dropdowns-photo-docs-lchSt` | `4edcc49766f27a613f6e80cf09df52776aa99c98` |
| 2026-05-18 | `claude/fix-projection-basis-mismatch-CcPnx` | `42538af89eb6acbdec7d0c7899e22216850db2c2` |
| 2026-05-17 | `claude/review-estimate-logic-PXEid` | `ae586911845c5469a2fa306bed8d11c18a2ae036` |
| 2026-05-13 | `claude/property-specialist-costs-XyaHK` | `eb4dd1fb827238bae7d55c15fcda72379e3f2b50` |
| 2026-05-10 | `claude/probate-timeline-multipliers-5vqL5` | `ba6940952cd0758bb44c8b28c6f9531312bed236` |
| 2026-05-04 | `claude/update-pricing-references-aitlp` | `acff7433dd4409817bc9c2625fa3b8f66d0e3f5d` |
| 2026-05-03 | `claude/fix-sync-estimates-notes-LuPkd` | `9357be1a6ce94f62fc3231ed78f96dae6b4bd3e8` |
| 2026-05-02 | `claude/pricing-app-continued-U6cuL` | `945999b3e124139d073890434f79bb51d1878178` |
| 2026-04-26 | `claude/upload-html-file-5rZbc` | `9409a2abed962bfeacf2efaf21e72ba53ccbb982` |
