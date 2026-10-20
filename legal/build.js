#!/usr/bin/env node
'use strict';
// Builds a .docx from one of the markdown documents in this folder (the markdown is the source of record).
//   node legal/build.js legal/Havellin_Vendor_Terms_v1.0.md
// Then: soffice --headless --convert-to pdf --outdir legal legal/Havellin_Vendor_Terms_v1.0.docx
// Markdown subset: front matter (brand, title, subtitle, version, header), ## and ### headings, paragraphs with **bold**,
// "- " bullets, "1. " numbered lines, pipe tables, "> " boxed notes, <!-- pagebreak -->.
const fs = require('fs');
const path = require('path');
const D = require('docx');

const src = process.argv[2];
if (!src) { console.error('usage: node build.js <file.md>'); process.exit(1); }
const md = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

// ── front matter ─────────────────────────────────────────────────────────────
const fm = {};
let body = md;
const fmm = md.match(/^---\n([\s\S]*?)\n---\n/);
if (fmm) {
  fmm[1].split('\n').forEach((l) => { const m = l.match(/^(\w+):\s*(.*)$/); if (m) fm[m[1]] = m[2]; });
  body = md.slice(fmm[0].length);
}

const BRONZE = '8A6D3B';
const INK = '1F1F1F';
const GRAY = '666666';
const SERIF = 'Cambria';
const SANS = 'Calibri';
const BODY_PT = 21;        // half-points: 10.5 pt
const SMALL_PT = 17;       // 8.5 pt

// ── inline runs: **bold** ────────────────────────────────────────────────────
function runs(text, opts) {
  opts = opts || {};
  const out = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new D.TextRun(Object.assign({ text: text.slice(last, m.index) }, opts)));
    out.push(new D.TextRun(Object.assign({ text: m[1], bold: true }, opts)));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(new D.TextRun(Object.assign({ text: text.slice(last) }, opts)));
  return out;
}

function para(text, extra) {
  return new D.Paragraph(Object.assign({
    children: runs(text, { font: SANS, size: BODY_PT, color: INK }),
    alignment: D.AlignmentType.JUSTIFIED,
    spacing: { after: 100, line: 276 },
  }, extra || {}));
}

const children = [];
const lines = body.split('\n');
let i = 0;
let firstHeading = true;
let spacerAt = -1;
let breakNext = false;   // a spacer after a table is dropped when nothing follows it (it spilled a blank page)
while (i < lines.length) {
  const line = lines[i];
  if (!line.trim()) { i++; continue; }
  if (line.trim() === '<!-- pagebreak -->') {
    breakNext = true;   // the next heading starts a page (a PageBreak paragraph of its own left a blank page when the page before was full)
    i++; continue;
  }
  if (line.startsWith('## ')) {
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: line.slice(3), font: SERIF, size: 30, color: BRONZE })],
      spacing: { before: firstHeading ? 60 : 300, after: 110 },
      border: firstHeading ? undefined : { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'D8CDB8', space: 6 } },
      keepNext: true,
      pageBreakBefore: breakNext,
    }));
    firstHeading = false; breakNext = false;
    i++; continue;
  }
  if (line.startsWith('### ')) {
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: line.slice(4), font: SERIF, size: 24, color: BRONZE })],
      spacing: { before: 180, after: 70 },
      keepNext: true,
    }));
    i++; continue;
  }
  if (line.startsWith('> ') || line === '>') {
    // boxed note: collect the block
    const box = [];
    while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) { box.push(lines[i].replace(/^> ?/, '')); i++; }
    const inner = [];
    box.forEach((b) => {
      if (!b.trim()) return;
      const num = b.match(/^(\d+)\.\s+(.*)$/);
      if (num) {
        inner.push(new D.Paragraph({
          children: [new D.TextRun({ text: num[1] + '.  ', font: SANS, size: BODY_PT, bold: true, color: INK })].concat(runs(num[2], { font: SANS, size: BODY_PT, color: INK })),
          spacing: { after: 70, line: 264 }, indent: { left: 360, hanging: 360 }, alignment: D.AlignmentType.LEFT,
        }));
      } else {
        inner.push(new D.Paragraph({ children: runs(b, { font: SANS, size: BODY_PT, color: INK, italics: inner.length === 0 && box.length > 1 }),
          spacing: { after: 90, line: 264 }, alignment: D.AlignmentType.LEFT }));
      }
    });
    const W = 9360;
    children.push(new D.Table({
      width: { size: W, type: D.WidthType.DXA },
      columnWidths: [W],
      rows: [new D.TableRow({ children: [new D.TableCell({
        width: { size: W, type: D.WidthType.DXA },
        shading: { type: D.ShadingType.CLEAR, fill: 'F7F3EA', color: 'auto' },
        margins: { top: 140, bottom: 80, left: 200, right: 200 },
        borders: { top: { style: D.BorderStyle.SINGLE, size: 6, color: 'D8CDB8' }, bottom: { style: D.BorderStyle.SINGLE, size: 6, color: 'D8CDB8' },
                   left: { style: D.BorderStyle.SINGLE, size: 6, color: 'D8CDB8' }, right: { style: D.BorderStyle.SINGLE, size: 6, color: 'D8CDB8' } },
        children: inner,
      })] })],
    }));
    children.push(new D.Paragraph({ children: [], spacing: { after: 60 } })); spacerAt = children.length - 1;
    continue;
  }
  if (line.startsWith('| ')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
    const cells = rows.filter((r) => !/^\|\s*-/.test(r)).map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    const ncol = cells[0].length;
    const W = 9360;
    const widths = ncol === 3 ? [2600, 4560, 2200] : Array(ncol).fill(Math.floor(W / ncol));
    const mkRow = (cs, head) => new D.TableRow({
      tableHeader: head,
      children: cs.map((c, k) => new D.TableCell({
        width: { size: widths[k], type: D.WidthType.DXA },
        shading: head ? { type: D.ShadingType.CLEAR, fill: 'EFE8DA', color: 'auto' } : undefined,
        margins: { top: 70, bottom: 70, left: 110, right: 110 },
        borders: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'CFC4AD' }, bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'CFC4AD' },
                   left: { style: D.BorderStyle.SINGLE, size: 4, color: 'CFC4AD' }, right: { style: D.BorderStyle.SINGLE, size: 4, color: 'CFC4AD' } },
        children: [new D.Paragraph({ children: runs(c, { font: SANS, size: head ? 19 : 19, bold: head, color: INK }), spacing: { after: 0, line: 252 }, alignment: D.AlignmentType.LEFT })],
      })),
    });
    children.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: widths,
      rows: cells.map((cs, k) => mkRow(cs, k === 0)) }));
    children.push(new D.Paragraph({ children: [], spacing: { after: 60 } })); spacerAt = children.length - 1;
    continue;
  }
  if (line.startsWith('- ')) {
    children.push(new D.Paragraph({
      children: runs(line.slice(2), { font: SANS, size: BODY_PT, color: INK }),
      numbering: { reference: 'bullets', level: 0 },
      spacing: { after: 50, line: 258 }, alignment: D.AlignmentType.LEFT,
    }));
    i++; continue;
  }
  const num = line.match(/^(\d+)\.\s+(.*)$/);
  if (num) {
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: num[1] + '.', font: SANS, size: BODY_PT, color: INK })].concat(
        [new D.TextRun({ text: '\t', font: SANS, size: BODY_PT })], runs(num[2], { font: SANS, size: BODY_PT, color: INK })),
      tabStops: [{ type: D.TabStopType.LEFT, position: 720 }],
      indent: { left: 720, hanging: 540 },
      spacing: { after: 10, line: 252 }, alignment: D.AlignmentType.LEFT,
    }));
    i++; continue;
  }
  // signature / fill line: label followed by underscores — left aligned, a little air above
  if (/_{6,}\s*$/.test(line)) {
    children.push(para(line, { alignment: D.AlignmentType.LEFT, spacing: { before: 90, after: 90 } }));
    i++; continue;
  }
  // plain paragraph (joins continuation lines)
  let text = line;
  while (i + 1 < lines.length && lines[i + 1].trim() && !/^(## |### |- |\| |> |<!--|\d+\. )/.test(lines[i + 1])) { i++; text += ' ' + lines[i].trim(); }
  children.push(para(text));
  i++;
}

if (spacerAt === children.length - 1) children.pop();

// ── title block ──────────────────────────────────────────────────────────────
const title = [
  new D.Paragraph({ children: [new D.TextRun({ text: fm.brand || 'HAVELLIN PALM BEACH', font: SANS, size: 20, bold: true, color: BRONZE, characterSpacing: 40 })], spacing: { after: 40 } }),
  new D.Paragraph({ children: [new D.TextRun({ text: fm.title || '', font: SERIF, size: 52, color: INK })], spacing: { after: 40 } }),
  new D.Paragraph({ children: [new D.TextRun({ text: fm.subtitle || '', font: SERIF, size: 26, italics: true, color: GRAY })], spacing: { after: 40 } }),
  new D.Paragraph({ children: [new D.TextRun({ text: fm.version || '', font: SANS, size: 18, color: GRAY })], spacing: { after: 160 },
    border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'D8CDB8', space: 8 } } }),
];

const doc = new D.Document({
  creator: 'Havellin Palm Beach, LLC',
  title: fm.title || '',
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 540, hanging: 300 } }, run: { color: BRONZE } } }] }] },
  styles: { default: { document: { run: { font: SANS, size: BODY_PT, color: INK } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, right: 1440, bottom: 1200, left: 1440, header: 600, footer: 600 } } },
    headers: { default: new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT,
      children: [new D.TextRun({ text: fm.header || '', font: SANS, size: SMALL_PT, color: GRAY })] })] }) },
    footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER,
      children: [new D.TextRun({ text: 'Confidential  |  Page ', font: SANS, size: SMALL_PT, color: GRAY }),
                 new D.TextRun({ children: [D.PageNumber.CURRENT], font: SANS, size: SMALL_PT, color: GRAY })] })] }) },
    children: title.concat(children),
  }],
});

const out = src.replace(/\.md$/, '.docx');
D.Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('wrote ' + out + ' (' + buf.length + ' bytes)'); });
