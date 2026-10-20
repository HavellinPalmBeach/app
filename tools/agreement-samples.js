// Print sample copies of both client agreement forms (the signing packet: the agreement with Exhibit A) from the app, as
// PDFs, for whoever asks for "a copy of our agreement" (the insurer, 2026-10-20; counsel, bundle F). Two dummy clients go
// through the REAL intake and the REAL print path (docAction → _printDocument), the printed html is laid out under the
// app's own stylesheet with the print media rules, and Chromium writes the PDF. Nothing is typed into a document here:
// whatever the app prints today is what lands in the file, bracketed placeholders included.
//
//   NODE_PATH=/path/to/node_modules node tools/agreement-samples.js [outDir] [/abs/path/to/havellin.html]
//
// Writes <outDir>/Havellin_Estate_Services_Agreement_SAMPLE.pdf (a probate estate) and
// <outDir>/Havellin_Services_Agreement_SAMPLE.pdf (a living client, Home Cleanout). Default outDir: legal/samples.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'legal', 'samples'));
const APP = process.env.APP || ('file://' + (process.argv[3] || path.resolve(__dirname, '..', 'havellin.html')));

(async () => {
  let b = null;
  try {
    fs.mkdirSync(OUT, { recursive: true });
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
    const p = await ctx.newPage();
    p.setDefaultTimeout(15000);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    p.on('dialog', async (d) => { await d.accept(); });
    await p.goto(APP); await p.waitForTimeout(1600);
    await p.evaluate(() => { window.__prints = []; window.print = function () { const pt = document.getElementById('print-target'); window.__prints.push(pt ? pt.innerHTML : ''); }; });

    const future = (d) => { const x = new Date(); x.setDate(x.getDate() + d); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); };
    const WT = future(10), START = future(24);
    // Two dummy clients through the real intake. Every name here is fictitious: this is a sample, never a record.
    const intake = (svc, patch) => p.evaluate(([svc, patch, wt, start]) => {
      document.getElementById('btn-add-client').click();
      const set = (id, v) => { const e = document.getElementById(id); if (!e) return; e.value = v; if (e.onchange) e.onchange(); if (e.oninput) e.oninput(); };
      const pick = (id) => { const e = document.getElementById(id); const o = e && Array.from(e.options).find((x) => x.value); if (o) { e.value = o.value; if (e.onchange) e.onchange(); } };
      set('i-svc', svc); toggleIntakeFields();
      set('i-fname', patch.fname); set('i-lname', patch.lname); set('i-addr', patch.addr); set('i-city', 'Palm Beach'); set('i-zip', '33480'); set('i-sqft', '4200');
      pick('i-ptype'); pick('i-src'); set('i-walkthrough', wt); set('i-start', start);
      Object.keys(patch.fields || {}).forEach((k) => set(k, patch.fields[k]));
      saveIntake();
      const j = jobs[0]; if (!j || j.svc !== svc) return { err: (document.getElementById('i-fb') || {}).textContent };
      j.won = true; j.status = 'won'; j.wonBy = 'Anthony Graziano'; j.agrApproved = true; j.agrApprovedBy = 'Anthony Graziano'; j.agrApprovedAt = _todayStr();
      return j.id;
    }, [svc, patch, WT, START]);
    const idE = await intake('probate', { fname: 'Sample', lname: 'Decedent', addr: '100 Sample Lane', fields: {
      'i-executor-fname': 'Sample', 'i-executor-lname': 'Representative', 'i-executor-role': 'Personal Representative', 'i-executor-phone': '(561) 555-0100', 'i-executor-email': 'representative@example.com',
      'i-date-of-death': '2026-08-14', 'i-matter-type': 'probate', 'i-gate-706': 'no', 'i-doc-tier': 'values', 'i-probate-case': '50-2026-CP-000000',
      'i-probate-atty-fname': 'Sample', 'i-probate-atty-lname': 'Attorney', 'i-probate-atty-firm': 'Sample Law Firm', 'i-probate-atty-phone': '(561) 555-0101', 'i-probate-atty-email': 'attorney@example.com' } });
    if (typeof idE !== 'number') throw new Error('estate intake refused: ' + JSON.stringify(idE));
    await p.waitForTimeout(400);
    const idL = await intake('home_cleanout', { fname: 'Sample', lname: 'Client', addr: '200 Sample Lane', fields: { 'i-phone': '(561) 555-0102', 'i-email': 'client@example.com' } });
    if (typeof idL !== 'number') throw new Error('living intake refused: ' + JSON.stringify(idL));
    await p.waitForTimeout(400);

    const estOf = (jid, svc) => ({ jobId: jid, svc: svc, totTC: 40, totPS: 80, tcRate: 150, psRate: 100, tcFee: 6000, psFee: 8000, pkgCost: 1500, pkgLabel: 'Estate Premium — $1,500', havellinTotal: 15500,
      discountPct: 0, discountAmt: 0, prem: false, fixedPrice: false, rush: false, rushExPrepFee: true, collections: [], rooms: [{ name: 'Living Room' }, { name: 'Primary Bedroom' }], vehicles: [], prepItems: [],
      vendors: [{ type: 'Moving', cost: 2400, lid: 'mv' }, { type: 'Auction House', cost: 0, lid: 'ah' }] });
    const printed = async (jid, svc) => {
      await p.evaluate(([jid, e]) => { estimateStore[jid] = { approved: true, approvedBy: 'Anthony Graziano', approvedAt: _todayStr(), estimate: e }; window.__prints = []; docAction(jid, 'agreement', 'print'); }, [jid, estOf(jid, svc)]);
      await p.waitForTimeout(600);
      const got = await p.evaluate(() => ({ html: window.__prints[0] || '', title: document.title }));
      await p.waitForTimeout(700);
      if (!got.html) throw new Error('nothing printed for job ' + jid);
      return got;
    };
    // The app's own stylesheet (the first <style> block) and its font links, so the PDF is laid out as the app prints it.
    const head = await p.evaluate(() => ({ css: (document.querySelector('style') || {}).textContent || '', links: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.outerHTML).join('\n') }));
    const toPdf = async (doc, file) => {
      const page = await ctx.newPage();
      await page.setContent('<!doctype html><html><head><meta charset="utf-8"><title>' + doc.title.replace(/</g, '&lt;') + '</title>' + head.links + '<style>' + head.css + '</style></head>'
        + '<body><div id="print-target" style="display:block">' + doc.html + '</div></body></html>', { waitUntil: 'load' });
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(500);
      await page.pdf({ path: file, format: 'Letter', printBackground: true, preferCSSPageSize: true });
      await page.close();
      console.log('wrote ' + file + ' (' + fs.statSync(file).size + ' bytes)');
    };
    await toPdf(await printed(idE, 'probate'), path.join(OUT, 'Havellin_Estate_Services_Agreement_SAMPLE.pdf'));
    await toPdf(await printed(idL, 'home_cleanout'), path.join(OUT, 'Havellin_Services_Agreement_SAMPLE.pdf'));
    if (errs.length) console.log('page errors: ' + errs.join(' | '));
  } catch (e) {
    console.log('failed: ' + (e && e.stack || e)); process.exitCode = 1;
  } finally {
    if (b) await b.close();
  }
})();
