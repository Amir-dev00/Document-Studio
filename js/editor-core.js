/* ============================================================
   DOCUMENT EDITOR — Core: selection, history, style formatting
   ============================================================ */
(() => {
  'use strict';

  const EditorCore = {
    root: null,
    lastRange: null,
    history: { stack: [], index: -1, max: 80, locked: false },

    init(root) {
      this.root = root;
    },

    clamp(n, min, max) { return Math.max(min, Math.min(max, n)); },

    preserveSelection() {
      const sel = window.getSelection();
      if (sel?.rangeCount && this.root.contains(sel.anchorNode)) {
        this.lastRange = sel.getRangeAt(0).cloneRange();
      }
    },

    restoreSelection() {
      if (!this.lastRange) return false;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.lastRange);
      return true;
    },

    getRange() {
      const sel = window.getSelection();
      if (sel?.rangeCount && this.root.contains(sel.anchorNode)) return sel.getRangeAt(0);
      return null;
    },

    pushHistory() {
      if (this.history.locked || !this.root) return;
      const html = this.root.innerHTML;
      const h = this.history;
      if (h.index >= 0 && h.stack[h.index] === html) return;
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(html);
      if (h.stack.length > h.max) { h.stack.shift(); }
      else { h.index++; }
    },

    undo() {
      const h = this.history;
      if (h.index <= 0) return false;
      h.locked = true;
      h.index--;
      this.root.innerHTML = h.stack[h.index];
      h.locked = false;
      return true;
    },

    redo() {
      const h = this.history;
      if (h.index >= h.stack.length - 1) return false;
      h.locked = true;
      h.index++;
      this.root.innerHTML = h.stack[h.index];
      h.locked = false;
      return true;
    },

    snapshotHistory() {
      this.pushHistory();
    },

    /* Style-based formatting — reliable font-size etc. */
    applyStyle(styles, opts = {}) {
      if (!this.root) return;
      this.restoreSelection();
      const range = this.getRange();
      if (!range) return;

      const blockTags = new Set(['P','H1','H2','H3','H4','H5','H6','LI','TD','TH','BLOCKQUOTE','DIV','FIGCAPTION']);

      if (range.collapsed && opts.blockLevel) {
        let node = range.startContainer;
        if (node.nodeType === 3) node = node.parentElement;
        while (node && node !== this.root && !blockTags.has(node.tagName)) node = node.parentElement;
        if (node && blockTags.has(node.tagName)) {
          Object.entries(styles).forEach(([k, v]) => node.style[k] = v);
          return node;
        }
      }

      if (range.collapsed) return;

      const span = document.createElement('span');
      Object.entries(styles).forEach(([k, v]) => { if (v != null && v !== '') span.style[k] = v; });

      try {
        range.surroundContents(span);
      } catch {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }

      const sel = window.getSelection();
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.addRange(nr);
      this.lastRange = nr.cloneRange();
      return span;
    },

    applyStyleToBlocks(styles) {
      this.restoreSelection();
      const range = this.getRange();
      if (!range) return;
      const blocks = this.blocksInRange(range);
      blocks.forEach(b => Object.entries(styles).forEach(([k, v]) => b.style[k] = v));
    },

    blocksInRange(range) {
      const blocks = new Set();
      const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_ELEMENT);
      const blockSel = 'p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote,div[data-editable]';
      const start = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
      const end = range.endContainer.nodeType === 3 ? range.endContainer.parentElement : range.endContainer;
      this.root.querySelectorAll(blockSel).forEach(el => {
        if (!this.root.contains(el)) return;
        const r = document.createRange();
        r.selectNodeContents(el);
        if (range.compareBoundaryPoints(Range.END_TO_START, r) < 0 && range.compareBoundaryPoints(Range.START_TO_END, r) > 0) {
          blocks.add(el);
        }
      });
      if (!blocks.size && start) {
        let n = start;
        while (n && n !== this.root) {
          if (n.matches?.(blockSel)) { blocks.add(n); break; }
          n = n.parentElement;
        }
      }
      return [...blocks];
    },

    toggleInline(cmd) {
      this.restoreSelection();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, null);
      this.preserveSelection();
    },

    setFontFamily(name) {
      const stack = window.DocumentStudioFonts?.stack(name) || name;
      this.applyStyle({ fontFamily: stack });
    },

    setFontSize(value, unit) {
      const size = `${value}${unit || 'pt'}`;
      this.applyStyle({ fontSize: size });
    },

    setFontWeight(w) { this.applyStyle({ fontWeight: String(w) }); },

    setColor(prop, value) {
      const map = { text: 'color', background: 'backgroundColor' };
      this.applyStyle({ [map[prop] || prop]: value });
    },

    setSpacing(prop, value) {
      if (prop === 'marginBefore' || prop === 'marginAfter') {
        const styles = {};
        if (prop === 'marginBefore') styles.marginTop = value;
        if (prop === 'marginAfter') styles.marginBottom = value;
        this.applyStyleToBlocks(styles);
        return;
      }
      const map = { lineHeight: 'lineHeight', letterSpacing: 'letterSpacing', wordSpacing: 'wordSpacing' };
      if (map[prop]) this.applyStyle({ [map[prop]]: value }, { blockLevel: true });
    },

    setDir(dir) {
      this.applyStyleToBlocks({ direction: dir });
      this.blocksInRange(this.getRange() || document.createRange()).forEach(b => b.setAttribute('dir', dir));
    },

    setAlign(align) {
      this.restoreSelection();
      document.execCommand('styleWithCSS', false, true);
      const cmd = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' }[align];
      if (cmd) document.execCommand(cmd, false, null);
      this.preserveSelection();
    },

    indent(outdent) {
      this.restoreSelection();
      document.execCommand(outdent ? 'outdent' : 'indent', false, null);
      this.preserveSelection();
    },

    superscript(on) {
      this.restoreSelection();
      document.execCommand(on ? 'superscript' : 'subscript', false, null);
      this.preserveSelection();
    },

    clearFormatting() {
      this.restoreSelection();
      const range = this.getRange();
      if (!range || range.collapsed) {
        document.execCommand('removeFormat', false, null);
        this.preserveSelection();
        return;
      }
      const frag = range.cloneContents();
      const walk = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);
      const toStrip = [];
      while (walk.nextNode()) toStrip.push(walk.currentNode);
      toStrip.forEach(el => {
        if (el.tagName === 'SPAN' || el.tagName === 'FONT') {
          const parent = el.parentNode;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        } else {
          el.removeAttribute('style');
        }
      });
      range.deleteContents();
      range.insertNode(frag);
      this.preserveSelection();
    },

    insertHTML(html) {
      this.restoreSelection();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('insertHTML', false, html);
      this.preserveSelection();
    },

    insertBlock(tag, attrs = {}, text = '') {
      const page = this.currentPageBody();
      if (!page) return;
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (attrs.editable !== false) el.dataset.editable = '';
      el.innerHTML = text || 'New content';
      page.appendChild(el);
      return el;
    },

    currentPageBody() {
      const pages = [...this.root.querySelectorAll(':scope > .page')];
      const cur = pages.find(p => p.classList.contains('current-page')) || pages[0];
      return cur?.querySelector('.page-body') || null;
    },

    /* Color utils */
    hexToRgb(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    },
    rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(x => this.clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
    },
    parseColor(str) {
      if (!str) return '#000000';
      str = str.trim();
      if (str.startsWith('#')) return str.length === 7 ? str : '#000000';
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) return this.rgbToHex(+m[1], +m[2], +m[3]);
      return '#000000';
    }
  };

  window.EditorCore = EditorCore;
})();
