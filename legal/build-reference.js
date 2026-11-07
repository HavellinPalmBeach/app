#!/usr/bin/env node
'use strict';
// Builds the formatted, sendable PDF of a reference document (Estate and Trust Settlement) from its markdown, in the
// house look of the September 2026 original: centered bronze name, Garamond, a contents list, the firm's line at the foot.
// The markdown stays the one source; legal/build.js still makes the plain DOCX and PDF from it for editing and counsel.
//   node legal/build-reference.js legal/Havellin_Estate_Trust_Settlement_v2.0.md [out.pdf]
// Needs playwright on NODE_PATH (the build environment has it) and Chromium at /opt/pw-browsers/chromium.
// Markdown read: front matter (brand, title, subtitle, version), ## and ### headings, paragraphs with **bold**, "- "
// bullets, pipe tables, and a final "> " box (the firm's line, drawn as the footer).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const src = process.argv[2];
if (!src) { console.error('usage: node build-reference.js <file.md> [out.pdf]'); process.exit(1); }
const out = process.argv[3] || src.replace(/_v[\d.]+\.md$/, '').replace(/\.md$/, '') + '.pdf';
const md = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

const fm = {};
let body = md;
const fmm = md.match(/^---\n([\s\S]*?)\n---\n/);
if (fmm) { fmm[1].split('\n').forEach((l) => { const m = l.match(/^(\w+):\s*(.*)$/); if (m) fm[m[1]] = m[2]; }); body = md.slice(fmm[0].length); }

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

// An appendix the front matter names (`appendix: <file in legal/>`, `appendix_title:`) follows the reference on a new page:
// the sample estate agreement (2026-11-06; Anthony: "we have to have an agreement here").
if (fm.appendix) {
  const ap = fs.readFileSync(path.join(path.dirname(src), fm.appendix), 'utf8').replace(/\r\n/g, '\n');
  body += '\n<!-- pagebreak -->\n## ' + (fm.appendix_title || 'Appendix') + '\n\n' + ap;
}
const html = [];
const contents = [];
let footer = '';
const lines = body.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  if (line.trim() === '<!-- pagebreak -->') { html.push('<div style="break-before:page;"></div>'); continue; }
  if (/^<!--/.test(line.trim())) { while (i < lines.length && lines[i].indexOf('-->') < 0) i++; continue; }
  if (/^\d+\.\s/.test(line)) {
    const items = [];
    while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push('<li>' + inline(lines[i].replace(/^\d+\.\s+/, '')) + '</li>'); i++; }
    i--; html.push('<ol>' + items.join('') + '</ol>'); continue;
  }
  if (line.startsWith('## ')) { contents.push(line.slice(3)); html.push('<h2>' + inline(line.slice(3)) + '</h2>'); continue; }
  if (line.startsWith('### ')) { html.push('<h3>' + inline(line.slice(4)) + '</h3>'); continue; }
  if (line.startsWith('> ')) { footer = line.slice(2); continue; }
  if (line.startsWith('- ')) {
    const items = [];
    while (i < lines.length && lines[i].startsWith('- ')) { items.push('<li>' + inline(lines[i].slice(2)) + '</li>'); i++; }
    i--; html.push('<ul>' + items.join('') + '</ul>'); continue;
  }
  if (line.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) { if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i]); i++; }
    i--;
    const cells = rows.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    html.push('<table><thead><tr>' + cells[0].map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>'
      + cells.slice(1).map((r) => '<tr>' + r.map((c, k) => '<td' + (k === 0 ? ' class="first"' : '') + '>' + inline(c) + '</td>').join('') + '</tr>').join('')
      + '</tbody></table>');
    continue;
  }
  html.push('<p>' + inline(line) + '</p>');
}

const month = (fm.version || '').split('|').pop().trim();
const page = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(fm.title || '') + '</title>'
  + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap">'
  + '<style>'
  + '@page{size:Letter;margin:0.75in 0.9in 0.7in;}'
  + 'body{font-family:"EB Garamond",Caladea,Georgia,serif;color:#4a4a4a;font-size:11.2pt;line-height:1.36;margin:0;}'
  + '.brand{text-align:center;color:#a87c45;font-size:24pt;font-weight:600;letter-spacing:.5px;margin:0 0 6px;}'
  + '.title{text-align:center;color:#2b2b2b;font-size:19pt;font-weight:600;margin:0 0 4px;}'
  + '.sub{text-align:center;color:#8a8a8a;font-size:12pt;margin:0 0 18px;}'
  + 'hr{border:0;border-top:1px solid #d9cbb3;margin:16px 0;}'
  + '.toc h4{color:#a87c45;font-size:12.5pt;font-weight:600;margin:0 0 6px;}'
  + '.toc ol{list-style:none;padding:0;margin:0;}.toc li{margin:1px 0;color:#4a4a4a;}'
  + 'h2{color:#2b2b2b;font-size:15pt;font-weight:600;margin:16px 0 6px;break-after:avoid;}'
  + 'h3{color:#a87c45;font-size:12.5pt;font-weight:600;margin:14px 0 6px;break-after:avoid;}'
  + 'p{margin:0 0 7px;text-align:left;}strong{color:#2b2b2b;font-weight:600;}'
  + 'ul,ol{margin:0 0 9px 0;padding-left:20px;}li{margin:0 0 5px;}li::marker{color:#a87c45;}'
  + 'table{width:100%;border-collapse:collapse;margin:4px 0 12px;font-size:10.6pt;break-inside:avoid;}'
  + 'th{background:#f3ece0;color:#2b2b2b;font-weight:600;text-align:left;padding:5px 7px;border:1px solid #d9cbb3;}'
  + 'td{padding:5px 7px;border:1px solid #d9cbb3;vertical-align:top;}td.first{font-weight:600;color:#2b2b2b;white-space:nowrap;}'
  + '.foot{margin-top:22px;border-top:1px solid #d9cbb3;padding-top:10px;text-align:center;color:#8a8a8a;font-size:9.5pt;line-height:1.55;break-inside:avoid;}'
  + '</style></head><body>'
  + '<div class="brand">' + esc(fm.brand || 'HAVELLIN PALM BEACH') + '</div>'
  + '<div class="title">' + esc(fm.cover_title || fm.title || '') + '</div>'
  + '<div class="sub">' + esc(fm.cover_subtitle || fm.subtitle || '') + '</div>'
  + '<hr><div class="toc"><h4>Contents</h4><ol>' + contents.map((c) => { const m = c.match(/^(\d+)\.\s*(.*)$/); return '<li>' + (m ? m[1] + '&nbsp;&nbsp;' + inline(m[2]) : inline(c)) + '</li>'; }).join('') + '</ol></div><hr>'
  + html.join('\n')
  + '<div class="foot">' + inline(footer) + '<br>Insured &amp; Bonded &middot; NASMM Professional Member &middot; ' + esc(month) + '</div>'
  + '</body></html>';

// ── The editable copy: a Word file in the same look (Anthony, 2026-11-06: "provide the document as a formatted either .doc or
// .md so i can edit"). Garamond, which Word ships with (EB Garamond is a web font the reader may not have); the same blocks as
// the PDF, from the same markdown.
function buildDocx(file) {
  const D = require('docx');
  const BRONZE = 'A87C45', INK = '2B2B2B', BODY = '4A4A4A', GRAY = '8A8A8A', RULE = 'D9CBB3', F = 'Garamond';
  const runs = (t, o) => {
    o = o || {}; const outR = []; const re = /\*\*(.+?)\*\*/g; let last = 0, m;
    while ((m = re.exec(t))) { if (m.index > last) outR.push(new D.TextRun(Object.assign({ text: t.slice(last, m.index), font: F, color: BODY, size: 23 }, o)));
      outR.push(new D.TextRun(Object.assign({ text: m[1], bold: true, font: F, color: INK, size: 23 }, o))); last = m.index + m[0].length; }
    if (last < t.length) outR.push(new D.TextRun(Object.assign({ text: t.slice(last), font: F, color: BODY, size: 23 }, o)));
    // A whole paragraph in *…* (the appendix's note) is italic.
    if (/^\*[^*].*[^*]\*$/.test(t)) return [new D.TextRun(Object.assign({ text: t.slice(1, -1), font: F, color: GRAY, size: 22, italics: true }, o))];
    return outR;
  };
  const ruleP = () => new D.Paragraph({ children: [], border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: RULE, space: 4 } }, spacing: { after: 160 } });
  const kids = [
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 80 }, children: [new D.TextRun({ text: fm.brand || 'HAVELLIN PALM BEACH', font: F, bold: true, color: BRONZE, size: 48 })] }),
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 60 }, children: [new D.TextRun({ text: fm.cover_title || fm.title || '', font: F, bold: true, color: INK, size: 38 })] }),
    new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 120 }, children: [new D.TextRun({ text: fm.cover_subtitle || fm.subtitle || '', font: F, color: GRAY, size: 24 })] }),
    ruleP(),
    new D.Paragraph({ spacing: { after: 80 }, children: [new D.TextRun({ text: 'Contents', font: F, bold: true, color: BRONZE, size: 25 })] }),
  ];
  contents.forEach((c) => kids.push(new D.Paragraph({ spacing: { after: 20 }, children: [new D.TextRun({ text: c.replace(/^(\d+)\.\s*/, '$1   '), font: F, color: BODY, size: 23 })] })));
  kids.push(ruleP());
  let firstH = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('> ')) continue;
    if (line.trim() === '<!-- pagebreak -->') { kids.push(new D.Paragraph({ children: [new D.PageBreak()] })); continue; }
    if (/^<!--/.test(line.trim())) { while (i < lines.length && lines[i].indexOf('-->') < 0) i++; continue; }
    if (/^\d+\.\s/.test(line)) { const m = line.match(/^(\d+)\.\s+(.*)$/); kids.push(new D.Paragraph({ indent: { left: 360, hanging: 300 }, spacing: { after: 70, line: 290 }, children: [new D.TextRun({ text: m[1] + '.  ', font: F, color: BRONZE, size: 23 })].concat(runs(m[2])) })); continue; }
    if (line.startsWith('## ')) { kids.push(new D.Paragraph({ keepNext: true, spacing: { before: firstH ? 120 : 320, after: 120 }, children: [new D.TextRun({ text: line.slice(3), font: F, bold: true, color: INK, size: 30 })] })); firstH = false; continue; }
    if (line.startsWith('### ')) { kids.push(new D.Paragraph({ keepNext: true, spacing: { before: 200, after: 80 }, children: [new D.TextRun({ text: line.slice(4), font: F, bold: true, color: BRONZE, size: 25 })] })); continue; }
    if (line.startsWith('- ')) { kids.push(new D.Paragraph({ numbering: { reference: 'dots', level: 0 }, spacing: { after: 80, line: 290 }, children: runs(line.slice(2)) })); continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i]); i++; }
      i--;
      const cells = rows.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
      const W = [2200, 4300, 2860];
      const border = { style: D.BorderStyle.SINGLE, size: 4, color: RULE };
      kids.push(new D.Table({ width: { size: 9360, type: D.WidthType.DXA }, columnWidths: W,
        rows: cells.map((r, k) => new D.TableRow({ tableHeader: k === 0, children: r.map((c, j) => new D.TableCell({
          width: { size: W[j], type: D.WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 },
          borders: { top: border, bottom: border, left: border, right: border },
          shading: k === 0 ? { type: D.ShadingType.CLEAR, fill: 'F3ECE0', color: 'auto' } : undefined,
          children: [new D.Paragraph({ children: runs(c, { size: 21, bold: k === 0 || j === 0 || undefined, color: (k === 0 || j === 0) ? INK : BODY }) })] })) })) }));
      kids.push(new D.Paragraph({ children: [], spacing: { after: 80 } }));
      continue;
    }
    kids.push(new D.Paragraph({ spacing: { after: 140, line: 290 }, children: runs(line) }));
  }
  kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 360 }, border: { top: { style: D.BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
    children: [new D.TextRun({ text: footer, font: F, color: GRAY, size: 19 })] }));
  kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: 'Insured & Bonded · NASMM Professional Member · ' + month, font: F, color: GRAY, size: 19 })] }));
  const doc = new D.Document({ creator: 'Havellin Palm Beach, LLC', title: fm.cover_title || fm.title || '',
    numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 240 } }, run: { color: BRONZE } } }] }] },
    styles: { default: { document: { run: { font: F, size: 23, color: BODY } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1300, bottom: 1000, left: 1300 } } }, children: kids }] });
  return D.Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(file, buf); console.log('wrote ' + file); });
}

(async () => {
  await buildDocx(out.replace(/\.pdf$/, '.docx'));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const p = await b.newPage();
    await p.setContent(page, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: out, format: 'Letter', printBackground: true, preferCSSPageSize: true });
    console.log('wrote ' + out);
  } finally { await b.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
