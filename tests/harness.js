'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Havellin test harness — lift real source out of havellin.html and run it.
//
// WHY IT WORKS THIS WAY, because it is not obvious and it was arrived at the hard
// way: booting the whole 1.3 MB single-file app in jsdom TIMES OUT. Anyone starting
// from `jsdom.fromFile('havellin.html')` will conclude the app is untestable and be
// wrong. Instead we pull individual `function NAME(` blocks and top-level `var`
// declarations out of the file BY SOURCE TEXT and evaluate just those in a `vm`
// sandbox. The code under test is the real code — not a copy, not a re-import — so
// a test cannot silently drift from the app.
//
// Zero dependencies on purpose: `node --test` is not required and nothing needs
// installing, so this runs on any machine with node and cannot rot in package.json.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'havellin.html');

let _src = null;
function source() {
  if (_src === null) _src = fs.readFileSync(APP, 'utf8');
  return _src;
}

// Scan forward from `open` (index of a `{`) to its matching `}`, skipping over
// anything where a brace does not mean a brace: strings, template literals,
// comments, and regex literals. The app source is mostly HTML built in quoted
// strings, so a naive depth counter goes wrong almost immediately.
// A `/` after a value is division; after an operator or one of these keywords it starts a
// REGEX. Tracking only the previous non-space CHARACTER gets `return /[",\n\r]/` wrong —
// the char before the slash is `n`, which looks like the end of an identifier — and the
// scanner then reads the `"` inside the character class as the start of a string and runs
// off the end of the function. That is what "unbalanced body for _csvCell" was.
const REGEX_OK_AFTER = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function matchBrace(s, open) {
  let depth = 0;
  let i = open;
  let prevSignificant = '';
  let word = '';
  while (i < s.length) {
    const c = s[i];

    if (c === '/' && s[i + 1] === '/') {                 // line comment
      i = s.indexOf('\n', i);
      if (i === -1) return -1;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {                 // block comment
      i = s.indexOf('*/', i + 2);
      if (i === -1) return -1;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {           // string / template
      const quote = c;
      i++;
      while (i < s.length) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === quote) { i++; break; }
        i++;
      }
      prevSignificant = quote;
      continue;
    }
    // A `/` starts a regex only where a value cannot already have ended — or right after
    // one of the keywords above, which cannot be divided.
    if (c === '/' && (REGEX_OK_AFTER.has(word) ||
        (!')]}'.includes(prevSignificant) && !/[A-Za-z0-9_$]/.test(prevSignificant)))) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < s.length) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '[') inClass = true;
        else if (s[j] === ']') inClass = false;
        else if (s[j] === '/' && !inClass) { closed = true; j++; break; }
        else if (s[j] === '\n') break;
        j++;
      }
      if (closed) { i = j; prevSignificant = '/'; continue; }
    }

    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }

    // Whitespace must NOT clear it — `return /re/` has a space between the two.
    if (/[A-Za-z0-9_$]/.test(c)) word += c;
    else if (!/\s/.test(c)) word = '';
    if (!/\s/.test(c)) prevSignificant = c;
    i++;
  }
  return -1;
}

/** Extract `function NAME(...) { ... }` verbatim from the app source. */
function fn(name) {
  const s = source();
  const re = new RegExp('(^|\\n)function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(s);
  if (!m) throw new Error(`harness: function ${name}( not found in havellin.html`);
  const start = m.index + (m[1] ? m[1].length : 0);
  const open = s.indexOf('{', re.lastIndex);
  if (open === -1) throw new Error(`harness: no body for ${name}`);
  const close = matchBrace(s, open);
  if (close === -1) throw new Error(`harness: unbalanced body for ${name}`);
  return s.slice(start, close + 1);
}

/** Extract a top-level `var NAME = <expr>;` declaration verbatim. */
function decl(name) {
  const s = source();
  const re = new RegExp('(^|\\n)var\\s+' + name + '\\s*=', 'g');
  const m = re.exec(s);
  if (!m) throw new Error(`harness: var ${name} = not found in havellin.html`);
  const start = m.index + (m[1] ? m[1].length : 0);
  let i = re.lastIndex;
  // Walk to the terminating semicolon at depth 0, using the same skip rules.
  let depth = 0;
  let prevSignificant = '';
  let word = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < s.length) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === q) { i++; break; }
        i++;
      }
      prevSignificant = q;
      continue;
    }
    if (c === '/' && (REGEX_OK_AFTER.has(word) ||
        (!')]}'.includes(prevSignificant) && !/[A-Za-z0-9_$]/.test(prevSignificant)))) {
      let j = i + 1, inClass = false, closed = false;
      while (j < s.length) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '[') inClass = true;
        else if (s[j] === ']') inClass = false;
        else if (s[j] === '/' && !inClass) { closed = true; j++; break; }
        else if (s[j] === '\n') break;
        j++;
      }
      if (closed) { i = j; prevSignificant = '/'; continue; }
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ';' && depth === 0) return s.slice(start, i + 1);
    // Whitespace must NOT clear it — `return /re/` has a space between the two.
    if (/[A-Za-z0-9_$]/.test(c)) word += c;
    else if (!/\s/.test(c)) word = '';
    if (!/\s/.test(c)) prevSignificant = c;
    i++;
  }
  throw new Error(`harness: unterminated var ${name}`);
}

/**
 * Build a sandbox holding the named functions and vars, plus whatever stubs the
 * code under test reaches for. Returns the context, so a test can poke at state
 * (jobs, _photoRefs, the captured print target) directly.
 */
function sandbox({ fns = [], vars = [], stubs = {} } = {}) {
  const printTarget = { innerHTML: '' };
  const store = {};

  const ctx = {
    console,
    // Minimal DOM: only what the inventory/print paths actually touch.
    document: {
      getElementById(id) { return id === 'print-target' ? printTarget : null; },
    },
    window: {
      print() { ctx.__printed = printTarget.innerHTML; },
      prompt() { return ''; },
      confirm() { return true; },
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
    },
    alert() {},
    // Browser globals the app uses for real: btoa for the Drive data: URIs and for every
    // base64 part of the Gmail MIME message, unescape as the second half of the
    // unescape(encodeURIComponent(s)) idiom that makes btoa safe for non-Latin-1 text.
    // node has no window, so without these an extracted function throws ReferenceError and
    // the failure reads as a bug in the code under test rather than a missing stub.
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
    unescape: global.unescape,
    escape: global.escape,
    // The real _printDocument defers the dialog and clears the target afterwards (see the
    // comment on it in havellin.html — clearing on the same tick is what produced a blank
    // printout). Deferral is untestable in a vm with no timers and no layout, so the
    // sandbox captures the document synchronously instead; the deferral itself is asserted
    // against the source text in inventory.test.js.
    _printDocument(html) { printTarget.innerHTML = html; ctx.__printed = html; return !!html; },
    // App-wide state the extracted functions close over.
    jobs: [],
    _photoRefs: {},
    estimateStore: {},
    // Helpers the extracted code calls that are not worth lifting.
    esc: (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    fmtDate2: (d) => String(d || ''),
    __printTarget: printTarget,
    __store: store,
    __printed: '',
  };
  Object.assign(ctx, stubs);
  vm.createContext(ctx);

  // Emit declarations in SOURCE order, not the order the caller listed them. Several
  // top-level vars are derived from earlier ones (INV_CATEGORIES maps over INV_TAXONOMY),
  // so a caller listing them the other way round got a bare TypeError with no hint that
  // ordering was the problem. The file already has them in dependency order; use it.
  const src = source();
  const ordered = vars
    .map((name) => ({ name, at: src.search(new RegExp('(^|\\n)var\\s+' + name + '\\s*=')) }))
    .sort((a, b) => a.at - b.at)
    .map((v) => v.name);
  const code = [...ordered.map(decl), ...fns.map(fn)].join('\n\n');
  vm.runInContext(code, ctx, { filename: 'havellin.html (extracted)' });
  return ctx;
}

/**
 * A DOM stub for the functions that read a whole SCREEN rather than a record.
 *
 * ⚠ WHY THIS EXISTS, and it is not "for convenience". `calcAll` is the pricing engine's
 * entry point and it reads 79 elements plus eight per room off Build Estimate, so for
 * two years the established pattern here was to pin it at SOURCE TEXT instead of driving
 * it. CLAUDE.md records what that cost: on 2026-09-11 the discount base was reverted to
 * the whole defect — a constant 0 where the rush rate belongs, on the one surface a
 * manager sets the number on — and the suite came back GREEN, because nothing in tests/
 * had ever called the function. It was found in a browser. A stub is what turns "the
 * line exists" into "the figure is right".
 *
 * Elements are MINTED ON DEMAND and remembered, because the real page has them all and
 * a stub that returned null for anything unseeded would send the code under test down
 * its own missing-element guards — which is a different program from the one that runs
 * on the phone. Everything written to an element is kept, so a test reads the screen
 * back exactly as a person would.
 *
 * `seed` maps an element id to its starting state: a boolean sets `.checked`, an object
 * is assigned over the element (`{value:'3500'}`, `{textContent:'Kitchen'}`, or
 * `{attrs:{'data-state':'in'}}`), and anything else sets `.value`.
 */
function domStub(seed = {}) {
  const els = {};

  function mkEl(id, tagName) {
    const attrs = {};
    const classes = new Set();
    const el = {
      id,
      tagName: tagName || 'DIV',
      value: '',
      checked: false,
      disabled: false,
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      dataset: {},
      children: [],
      parentNode: null,
      offsetWidth: 0,
      scrollWidth: 0,
      clientWidth: 0,
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); },
        toggle(c, on) {
          const want = on === undefined ? !classes.has(c) : !!on;
          if (want) classes.add(c); else classes.delete(c);
          return want;
        },
      },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
      setAttribute(k, v) { attrs[k] = String(v); },
      removeAttribute(k) { delete attrs[k]; },
      hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
      appendChild(c) { el.children.push(c); if (c) c.parentNode = el; return c; },
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
      insertBefore(c) { el.children.unshift(c); if (c) c.parentNode = el; return c; },
      remove() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
      addEventListener() {},
      removeEventListener() {},
      focus() {}, blur() {}, click() {}, scrollIntoView() {},
      getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
      __attrs: attrs,
      __classes: classes,
    };
    return el;
  }

  function applySeed(el, v) {
    if (v === null || v === undefined) return;
    if (typeof v === 'boolean') { el.checked = v; return; }
    if (typeof v === 'object') {
      const attrs = v.attrs;
      Object.keys(v).forEach((k) => { if (k !== 'attrs') el[k] = v[k]; });
      if (attrs) Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
      return;
    }
    el.value = String(v);
  }

  const doc = {
    getElementById(id) {
      if (id === null || id === undefined) return null;
      const key = String(id);
      if (!Object.prototype.hasOwnProperty.call(els, key)) {
        els[key] = mkEl(key);
        if (Object.prototype.hasOwnProperty.call(seed, key)) applySeed(els[key], seed[key]);
      }
      return els[key];
    },
    createElement(tag) { return mkEl('', String(tag).toUpperCase()); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    __els: els,
    /** Seed (or re-seed) an element after the stub is built. */
    __seed(id, v) { seed[String(id)] = v; applySeed(doc.getElementById(id), v); return doc.getElementById(id); },
  };
  doc.body = mkEl('body', 'BODY');
  doc.documentElement = mkEl('', 'HTML');
  return doc;
}

module.exports = { fn, decl, sandbox, source, matchBrace, domStub, APP };
