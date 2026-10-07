/* ============================================================
   DOCUMENT EDITOR — Features: pages, objects, tables, search, IO
   ============================================================ */
(() => {
  'use strict';

  const PAGE_PRESETS = {
    A4: { w: 210, h: 297, unit: 'mm' },
    A5: { w: 148, h: 210, unit: 'mm' },
    A3: { w: 297, h: 420, unit: 'mm' },
    Letter: { w: 8.5, h: 11, unit: 'in' },
    Legal: { w: 8.5, h: 14, unit: 'in' }
  };

  const EditorFeatures = {
    engine: null,
    pageSettings: {
      preset: 'A4', orientation: 'portrait',
      width: '210mm', height: '297mm',
      margins: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      background: '#ffffff'
    },
    headerFooter: { header: '', footer: '', pageNumbers: true, startAt: 1 },
    recentColors: [],
    docColors: new Set(),
    selectedObject: null,
    snapGrid: 5,
    dragState: null,

    init(engine) {
      this.engine = engine;
      EditorCore.init(engine.root);
      this.loadRecentColors();
      this.applyPageSettings(this.pageSettings);
    },

    mmToPx(mm) { return mm * 96 / 25.4; },

    applyPageSettings(s) {
      this.pageSettings = { ...this.pageSettings, ...s };
      const ps = this.pageSettings;
      let w = ps.width, h = ps.height;
      if (ps.preset && PAGE_PRESETS[ps.preset] && ps.preset !== 'custom') {
        const p = PAGE_PRESETS[ps.preset];
        const unit = p.unit;
        w = `${p.w}${unit}`; h = `${p.h}${unit}`;
        if (ps.orientation === 'landscape') { const t = w; w = h; h = t; }
      } else if (ps.orientation === 'landscape') {
        const t = w; w = h; h = t;
      }
      document.documentElement.style.setProperty('--page-width', w);
      document.documentElement.style.setProperty('--page-height', h);
      const m = ps.margins || {};
      ['top','right','bottom','left'].forEach(side => {
        document.documentElement.style.setProperty(`--page-margin-${side}`, m[side] || '0mm');
      });
      let styleEl = document.getElementById('dynamicPageStyle');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamicPageStyle';
        document.head.appendChild(styleEl);
      }
      const pageSize = ps.orientation === 'landscape' ? `${h} ${w}` : `${w} ${h}`;
      styleEl.textContent = `
        @page { size: ${pageSize}; margin: 0; }
        @media print {
          #documentRoot { width: ${w} !important; }
          .page { width: ${w} !important; height: ${h} !important; }
        }`;
      if (ps.background) {
        this.engine.root.querySelectorAll('.page').forEach(p => {
          if (!p.classList.contains('demo-cover') && !p.classList.contains('worksheet') && !p.classList.contains('end-page')) {
            p.style.background = ps.background;
          }
        });
      }
      this.updateThumbScales();
    },

    setPreset(name, orientation) {
      this.pageSettings.preset = name;
      if (orientation) this.pageSettings.orientation = orientation;
      this.applyPageSettings(this.pageSettings);
      this.engine.scheduleSave();
    },

    setCustomSize(w, h, unit) {
      this.pageSettings.preset = 'custom';
      this.pageSettings.width = `${w}${unit}`;
      this.pageSettings.height = `${h}${unit}`;
      this.applyPageSettings(this.pageSettings);
      this.engine.scheduleSave();
    },

    setMargins(top, right, bottom, left) {
      this.pageSettings.margins = {
        top: `${top}mm`, right: `${right}mm`,
        bottom: `${bottom}mm`, left: `${left}mm`
      };
      this.applyPageSettings(this.pageSettings);
      this.engine.scheduleSave();
    },

    /* Page rail thumbnails */
    buildRailV2(railEl) {
      if (!railEl) return;
      railEl.innerHTML = '';
      const pages = this.engine.pages();
      pages.forEach((page, i) => {
        const item = document.createElement('div');
        item.className = 'rail-item';
        item.draggable = true;
        item.dataset.pageIndex = String(i + 1);
        if (page.dataset.overflow === 'true') item.classList.add('has-overflow');
        if (page.classList.contains('current-page')) item.classList.add('active');

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'rail-thumb-wrap';
        const scale = document.createElement('div');
        scale.className = 'rail-thumb-scale';
        const clone = page.cloneNode(true);
        clone.classList.remove('current-page');
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('.ds-handles').forEach(el => el.remove());
        scale.appendChild(clone);
        thumbWrap.appendChild(scale);
        item.appendChild(thumbWrap);

        const meta = document.createElement('div');
        meta.className = 'rail-meta';
        meta.innerHTML = `<span class="rail-title">${page.dataset.pageTitle || 'Page ' + (i+1)}</span><span class="rail-num">${i+1}</span>`;
        item.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'rail-actions';
        actions.innerHTML = `<button type="button" class="btn" data-rail-dup title="Duplicate">⧉</button><button type="button" class="btn danger" data-rail-del title="Delete">×</button>`;
        item.appendChild(actions);

        item.addEventListener('click', e => {
          if (e.target.closest('[data-rail-dup]') || e.target.closest('[data-rail-del]')) return;
          this.engine.goToPage(i + 1);
        });
        actions.querySelector('[data-rail-dup]').addEventListener('click', e => {
          e.stopPropagation();
          this.engine.goToPage(i + 1);
          this.engine.duplicatePage();
        });
        actions.querySelector('[data-rail-del]').addEventListener('click', e => {
          e.stopPropagation();
          this.engine.goToPage(i + 1);
          this.engine.deleteCurrentPage();
        });

        item.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', String(i));
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));
        item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
        item.addEventListener('drop', e => {
          e.preventDefault();
          item.classList.remove('drag-over');
          const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
          const to = i;
          if (from !== to) this.reorderPages(from, to);
        });

        railEl.appendChild(item);
      });
      requestAnimationFrame(() => this.updateThumbScales());
    },

    updateThumbScales() {
      document.querySelectorAll('.rail-thumb-wrap').forEach(wrap => {
        const scale = wrap.querySelector('.rail-thumb-scale');
        if (!scale) return;
        const sw = wrap.clientWidth;
        const pw = scale.offsetWidth || this.mmToPx(210);
        const ratio = sw / pw;
        scale.style.transform = `scale(${ratio})`;
        wrap.style.height = (scale.offsetHeight * ratio) + 'px';
      });
    },

    syncRailActive() {
      const pages = this.engine.pages();
      document.querySelectorAll('#pageRailV2 .rail-item').forEach((item, i) => {
        item.classList.toggle('active', pages[i]?.classList.contains('current-page'));
      });
    },

    reorderPages(fromIndex, toIndex) {
      const pages = this.engine.pages();
      if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return;
      const page = pages[fromIndex];
      if (fromIndex < toIndex) pages[toIndex].after(page);
      else pages[toIndex].before(page);
      EditorCore.pushHistory();
      this.engine.refreshAll();
      this.engine.scheduleSave();
    },

    renamePage(index, title) {
      const pages = this.engine.pages();
      const page = pages[index - 1];
      if (!page) return;
      page.dataset.pageTitle = title;
      this.engine.refreshAll();
      this.engine.scheduleSave();
    },

    /* Images */
    insertImageFromFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const body = EditorCore.currentPageBody();
        if (!body) return;
        const fig = this.createObject('image', {
          left: '20mm', top: '30mm', width: '60mm', height: '45mm'
        });
        const img = fig.querySelector('img');
        img.src = reader.result;
        img.alt = file.name;
        body.appendChild(fig);
        this.selectObject(fig);
        EditorCore.pushHistory();
        this.engine.scheduleSave();
        this.engine.detectOverflow();
      };
      reader.readAsDataURL(file);
    },

    createObject(type, opts = {}) {
      const el = document.createElement('div');
      el.className = 'ds-object';
      el.dataset.dsType = type;
      el.style.left = opts.left || '10mm';
      el.style.top = opts.top || '10mm';
      el.style.width = opts.width || '40mm';
      el.style.height = opts.height || '20mm';

      if (type === 'textbox') {
        el.classList.add('ds-textbox');
        el.dataset.editable = '';
        el.dataset.placeholder = opts.placeholder || 'Text box';
        el.innerHTML = opts.text || '';
      } else if (type === 'image') {
        el.classList.add('ds-image-wrap');
        el.innerHTML = `<img src="" alt="" draggable="false" /><div class="ds-handles">${this.handleHTML()}</div>`;
      } else if (type === 'rect' || type === 'ellipse') {
        el.classList.add('ds-shape');
        const fill = opts.fill || 'rgba(39,52,105,.15)';
        const stroke = opts.stroke || '#273469';
        if (type === 'rect') {
          el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="98" fill="${fill}" stroke="${stroke}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="ds-handles">${this.handleHTML()}</div>`;
        } else {
          el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="48" ry="48" fill="${fill}" stroke="${stroke}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="ds-handles">${this.handleHTML()}</div>`;
        }
      } else if (type === 'line') {
        el.classList.add('ds-shape');
        el.style.height = '2mm';
        el.innerHTML = `<svg viewBox="0 0 100 2" preserveAspectRatio="none"><line x1="0" y1="1" x2="100" y2="1" stroke="${opts.stroke || '#273469'}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="ds-handles">${this.handleHTML('ew')}</div>`;
      }

      if (type !== 'image' && type !== 'line') {
        const handles = document.createElement('div');
        handles.className = 'ds-handles';
        handles.innerHTML = this.handleHTML();
        if (!el.querySelector('.ds-handles')) el.appendChild(handles);
      }

      this.wireObject(el);
      return el;
    },

    handleHTML(mode) {
      if (mode === 'ew') return '<span class="ds-handle w"></span><span class="ds-handle e"></span>';
      return '<span class="ds-handle nw"></span><span class="ds-handle ne"></span><span class="ds-handle sw"></span><span class="ds-handle se"></span><span class="ds-handle n"></span><span class="ds-handle s"></span><span class="ds-handle e"></span><span class="ds-handle w"></span>';
    },

    wireObject(el) {
      el.addEventListener('mousedown', e => {
        if (!document.body.classList.contains('edit-mode')) return;
        if (el.dataset.locked === 'true') return;
        if (e.target.classList.contains('ds-handle')) {
          this.startResize(el, e.target, e);
          return;
        }
        this.selectObject(el);
        this.startDrag(el, e);
      });
    },

    selectObject(el) {
      this.root()?.querySelectorAll('.ds-object.selected').forEach(o => o.classList.remove('selected'));
      this.selectedObject = el;
      if (el) el.classList.add('selected');
    },

    root() { return this.engine?.root; },

    parseMm(str) {
      if (!str) return 0;
      const m = String(str).match(/^([\d.]+)(mm|px|in)?$/);
      if (!m) return parseFloat(str) || 0;
      const v = parseFloat(m[1]);
      const u = m[2] || 'mm';
      if (u === 'mm') return v;
      if (u === 'in') return v * 25.4;
      if (u === 'px') return v * 25.4 / 96;
      return v;
    },

    toMm(px) { return Math.round(px * 25.4 / 96 * 10) / 10; },

    startDrag(el, e) {
      e.preventDefault();
      const body = el.offsetParent || el.parentElement;
      const startX = e.clientX, startY = e.clientY;
      const l0 = this.parseMm(el.style.left);
      const t0 = this.parseMm(el.style.top);
      const zoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1;
      const move = ev => {
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;
        let nl = l0 + this.toMm(dx);
        let nt = t0 + this.toMm(dy);
        if (document.body.classList.contains('show-grid')) {
          nl = Math.round(nl / this.snapGrid) * this.snapGrid;
          nt = Math.round(nt / this.snapGrid) * this.snapGrid;
        }
        el.style.left = nl + 'mm';
        el.style.top = nt + 'mm';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        EditorCore.pushHistory();
        this.engine.scheduleSave();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    },

    startResize(el, handle, e) {
      e.preventDefault(); e.stopPropagation();
      const zoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1;
      const startX = e.clientX, startY = e.clientY;
      const w0 = this.parseMm(el.style.width);
      const h0 = this.parseMm(el.style.height);
      const l0 = this.parseMm(el.style.left);
      const t0 = this.parseMm(el.style.top);
      const cls = handle.classList;
      const move = ev => {
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;
        let w = w0, h = h0, l = l0, t = t0;
        const dmm = { x: this.toMm(dx), y: this.toMm(dy) };
        if (cls.contains('e') || cls.contains('ne') || cls.contains('se')) w = Math.max(5, w0 + dmm.x);
        if (cls.contains('w') || cls.contains('nw') || cls.contains('sw')) { w = Math.max(5, w0 - dmm.x); l = l0 + dmm.x; }
        if (cls.contains('s') || cls.contains('se') || cls.contains('sw')) h = Math.max(5, h0 + dmm.y);
        if (cls.contains('n') || cls.contains('ne') || cls.contains('nw')) { h = Math.max(5, h0 - dmm.y); t = t0 + dmm.y; }
        el.style.width = w + 'mm';
        el.style.height = h + 'mm';
        el.style.left = l + 'mm';
        el.style.top = t + 'mm';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        EditorCore.pushHistory();
        this.engine.scheduleSave();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    },

    deleteSelectedObject() {
      if (this.selectedObject) {
        this.selectedObject.remove();
        this.selectedObject = null;
        EditorCore.pushHistory();
        this.engine.scheduleSave();
      }
    },

    duplicateSelectedObject() {
      if (!this.selectedObject) return;
      const copy = this.selectedObject.cloneNode(true);
      copy.classList.remove('selected');
      copy.style.left = (this.parseMm(this.selectedObject.style.left) + 5) + 'mm';
      copy.style.top = (this.parseMm(this.selectedObject.style.top) + 5) + 'mm';
      this.selectedObject.parentElement.appendChild(copy);
      this.wireObject(copy);
      this.selectObject(copy);
      EditorCore.pushHistory();
      this.engine.scheduleSave();
    },

    setObjectLayer(dir) {
      const el = this.selectedObject;
      if (!el) return;
      if (dir === 'front') el.parentElement.appendChild(el);
      else if (dir === 'back') el.parentElement.prepend(el);
      else if (dir === 'up') el.nextElementSibling?.after(el);
      else if (dir === 'down') el.previousElementSibling?.before(el);
      EditorCore.pushHistory();
      this.engine.scheduleSave();
    },

    alignObject(mode) {
      const el = this.selectedObject;
      if (!el) return;
      const body = el.parentElement;
      if (!body) return;
      const pxToMm = v => Math.round(v * 25.4 / 96 * 10) / 10;
      const bw = pxToMm(body.clientWidth);
      const bh = pxToMm(body.clientHeight);
      const ow = this.parseMm(el.style.width);
      const oh = this.parseMm(el.style.height);
      if (mode === 'alignL') el.style.left = '0mm';
      if (mode === 'alignC') el.style.left = Math.max(0, (bw - ow) / 2) + 'mm';
      if (mode === 'alignR') el.style.left = Math.max(0, bw - ow) + 'mm';
      if (mode === 'alignT') el.style.top = '0mm';
      if (mode === 'alignM') el.style.top = Math.max(0, (bh - oh) / 2) + 'mm';
      if (mode === 'alignB') el.style.top = Math.max(0, bh - oh) + 'mm';
      EditorCore.pushHistory();
      this.engine.scheduleSave();
    },

    toggleLockObject() {
      if (!this.selectedObject) return;
      const locked = this.selectedObject.dataset.locked === 'true';
      this.selectedObject.dataset.locked = locked ? 'false' : 'true';
      this.engine.scheduleSave();
    },

    applyImageStyle(props) {
      const el = this.selectedObject;
      if (!el || el.dataset.dsType !== 'image') return;
      const img = el.querySelector('img');
      if (props.opacity != null) el.style.opacity = props.opacity;
      if (props.borderRadius != null) img.style.borderRadius = props.borderRadius;
      if (props.border != null) img.style.border = props.border;
      if (props.boxShadow != null) img.style.boxShadow = props.boxShadow;
      if (props.objectFit != null) img.style.objectFit = props.objectFit;
      if (props.src != null) img.src = props.src;
      this.engine.scheduleSave();
    },

    /* Tables */
    insertTable(rows, cols) {
      const body = EditorCore.currentPageBody();
      if (!body) return;
      const wrap = document.createElement('div');
      wrap.className = 'ds-table-wrap';
      let html = '<table class="data-table ds-editable-table"><tbody>';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
          html += `<${r === 0 ? 'th' : 'td'} data-editable style="border:1px solid var(--doc-line,#dde1ea);padding:2mm;">Cell</${r === 0 ? 'th' : 'td'}>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      wrap.innerHTML = html;
      body.appendChild(wrap);
      if (this.engine.setEditMode) this.engine._setEditMode?.(true) || this.engine.setEditMode(true);
      EditorCore.pushHistory();
      this.engine.scheduleSave();
      return wrap;
    },

    tableOp(op) {
      const cell = this.getSelectedCell();
      if (!cell) return;
      const row = cell.parentElement;
      const table = cell.closest('table');
      if (!table) return;
      if (op === 'addRow') {
        const nr = row.cloneNode(true);
        nr.querySelectorAll('td,th').forEach((c, i) => {
          if (row.children[i]?.tagName === 'TH') { const td = document.createElement('td'); td.dataset.editable = ''; td.textContent = 'Cell'; c.replaceWith(td); }
          else { c.textContent = 'Cell'; c.dataset.editable = ''; }
        });
        row.after(nr);
      } else if (op === 'delRow' && table.rows.length > 1) {
        row.remove();
      } else if (op === 'addCol') {
        [...table.rows].forEach((tr, i) => {
          const td = document.createElement(i === 0 && tr.querySelector('th') ? 'th' : 'td');
          td.dataset.editable = ''; td.textContent = 'Cell';
          td.style.cssText = 'border:1px solid var(--doc-line,#dde1ea);padding:2mm;';
          tr.appendChild(td);
        });
      } else if (op === 'delCol' && table.rows[0]?.cells.length > 1) {
        [...table.rows].forEach(tr => tr.lastElementChild?.remove());
      } else if (op === 'merge' && cell.dataset.editable !== undefined) {
        const next = cell.nextElementSibling;
        if (next) {
          cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1);
          cell.textContent += ' ' + next.textContent;
          next.remove();
        }
      }
      EditorCore.pushHistory();
      this.engine.scheduleSave();
    },

    getSelectedCell() {
      const sel = window.getSelection();
      if (!sel?.anchorNode) return null;
      let n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      while (n && n !== this.root()) {
        if (n.tagName === 'TD' || n.tagName === 'TH') return n;
        n = n.parentElement;
      }
      return null;
    },

    styleTable(props) {
      const cell = this.getSelectedCell();
      const table = cell?.closest('table') || this.root()?.querySelector('.ds-editable-table');
      if (!table) return;
      if (props.borderColor) table.querySelectorAll('td,th').forEach(c => c.style.borderColor = props.borderColor);
      if (props.padding) table.querySelectorAll('td,th').forEach(c => c.style.padding = props.padding);
      if (props.bg) { if (cell) cell.style.background = props.bg; }
      if (props.align) { if (cell) cell.style.textAlign = props.align; }
      this.engine.scheduleSave();
    },

    /* Header / Footer */
    applyHeaderFooter() {
      const hf = this.headerFooter;
      this.engine.pages().forEach((page, i) => {
        let header = page.querySelector('.ds-page-header');
        let footer = page.querySelector('.ds-page-footer');
        if (hf.header) {
          if (!header) { header = document.createElement('div'); header.className = 'ds-page-header'; header.dataset.editable = ''; page.querySelector('.page-body')?.prepend(header); }
          header.innerHTML = hf.header;
        } else if (header) header.remove();
        if (hf.footer || hf.pageNumbers) {
          if (!footer) { footer = document.createElement('div'); footer.className = 'ds-page-footer'; footer.dataset.editable = ''; page.querySelector('.page-body')?.appendChild(footer); }
          let content = hf.footer || '';
          if (hf.pageNumbers) {
            const num = String(i + (hf.startAt || 1)).padStart(2, '0');
            content += (content ? ' · ' : '') + `<span class="ds-page-number-slot">${num}</span>`;
          }
          footer.innerHTML = content;
        } else if (footer) footer.remove();
      });
      if (this.engine.setEditMode && document.body.classList.contains('edit-mode')) {
        this.engine._refreshEditables?.();
      }
      this.engine.scheduleSave();
    },

    /* Search / Replace */
    searchState: { hits: [], index: -1, query: '' },

    clearSearchHits() {
      this.root()?.querySelectorAll('.ds-search-hit').forEach(el => {
        el.classList.remove('ds-search-hit', 'current');
      });
      this.searchState = { hits: [], index: -1, query: '' };
    },

    findAll(query, caseSensitive) {
      this.clearSearchHits();
      if (!query) return [];
      const root = this.root();
      const hits = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const flags = caseSensitive ? 'g' : 'gi';
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      let node;
      while (node = walker.nextNode()) {
        if (node.parentElement?.closest('.app-chrome')) continue;
        const text = node.textContent;
        let m;
        re.lastIndex = 0;
        while (m = re.exec(text)) {
          hits.push({ node, start: m.index, end: m.index + m[0].length });
        }
      }
      this.searchState.hits = hits;
      this.searchState.query = query;
      return hits;
    },

    highlightHits() {
      const hits = this.searchState.hits;
      hits.forEach((h, i) => {
        try {
          const range = document.createRange();
          range.setStart(h.node, h.start);
          range.setEnd(h.node, h.end);
          const span = document.createElement('mark');
          span.className = 'ds-search-hit' + (i === this.searchState.index ? ' current' : '');
          range.surroundContents(span);
          h.element = span;
        } catch { /* cross-element — skip */ }
      });
    },

    findNext(backward) {
      const hits = this.searchState.hits;
      if (!hits.length) return 0;
      this.root()?.querySelectorAll('.ds-search-hit.current').forEach(el => el.classList.remove('current'));
      if (backward) this.searchState.index = (this.searchState.index - 1 + hits.length) % hits.length;
      else this.searchState.index = (this.searchState.index + 1) % hits.length;
      const h = hits[this.searchState.index];
      if (h?.element) {
        h.element.classList.add('current');
        h.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return hits.length;
    },

    replaceOne(replacement) {
      const h = this.searchState.hits[this.searchState.index];
      if (!h?.element) return false;
      h.element.textContent = replacement;
      h.element.classList.remove('ds-search-hit', 'current');
      this.findAll(this.searchState.query);
      this.highlightHits();
      EditorCore.pushHistory();
      this.engine.scheduleSave();
      return true;
    },

    replaceAll(replacement) {
      const q = this.searchState.query;
      if (!q) return 0;
      this.clearSearchHits();
      const root = this.root();
      let count = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        if (node.textContent && re.test(node.textContent)) {
          node.textContent = node.textContent.replace(re, replacement);
          count++;
        }
      });
      EditorCore.pushHistory();
      this.engine.scheduleSave();
      return count;
    },

    /* Colors */
    loadRecentColors() {
      try {
        this.recentColors = JSON.parse(localStorage.getItem('ds-recent-colors') || '[]').slice(0, 12);
      } catch { this.recentColors = []; }
    },

    addRecentColor(hex) {
      hex = EditorCore.parseColor(hex);
      this.recentColors = [hex, ...this.recentColors.filter(c => c !== hex)].slice(0, 12);
      localStorage.setItem('ds-recent-colors', JSON.stringify(this.recentColors));
      this.docColors.add(hex);
    },

    /* Preflight */
    runPreflight() {
      const issues = [];
      const pages = this.engine.pages();
      let overflowCount = this.engine.detectOverflow();
      if (overflowCount) issues.push({ level: 'warn', msg: `${overflowCount} page(s) have content overflow` });

      pages.forEach((page, i) => {
        const body = page.querySelector('.page-body') || page;
        page.querySelectorAll('.ds-object').forEach(obj => {
          const rect = obj.getBoundingClientRect();
          const bodyRect = body.getBoundingClientRect();
          if (rect.right > bodyRect.right + 2 || rect.bottom > bodyRect.bottom + 2 || rect.left < bodyRect.left - 2 || rect.top < bodyRect.top - 2) {
            issues.push({ level: 'warn', msg: `Page ${i+1}: object extends outside page bounds` });
          }
        });
      });

      this.root()?.querySelectorAll('img').forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          issues.push({ level: 'error', msg: `Missing or broken image: ${img.alt || (img.src || '').slice(0, 40)}` });
        }
      });

      if (window.DocumentStudioFonts) {
        const known = new Set(window.DocumentStudioFonts.all().map(f => f.name.toLowerCase()));
        this.root()?.querySelectorAll('[style*="font-family"]').forEach(el => {
          const ff = (el.style.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
          if (ff && !known.has(ff) && !/^(ui-|system|serif|sans-serif|monospace|inherit)/.test(ff)) {
            issues.push({ level: 'warn', msg: `Non-catalog font used: ${ff} — verify it is embedded for print` });
          }
        });
      }

      if (issues.length === 0) issues.push({ level: 'ok', msg: 'No critical print issues detected' });
      return issues;
    },

    /* Project IO */
    exportProject() {
      const state = {
        version: 2,
        savedAt: Date.now(),
        html: this.engine.cleanDocumentHTML(),
        theme: this.engine.snapshotTheme(),
        pageSettings: this.pageSettings,
        headerFooter: this.headerFooter
      };
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'document-studio-project.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      this.engine.setStatus('Project exported');
    },

    importProject(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const state = JSON.parse(reader.result);
          if (state.html) this.engine.root.innerHTML = state.html;
          if (state.theme) this.engine.applyTheme(state.theme);
          if (state.pageSettings) { this.pageSettings = state.pageSettings; this.applyPageSettings(state.pageSettings); }
          if (state.headerFooter) { this.headerFooter = state.headerFooter; }
          EditorCore.snapshotHistory();
          this.engine.refreshAll();
          this.engine.scheduleSave();
          this.engine.setStatus('Project imported');
        } catch (err) {
          alert('Invalid project file');
        }
      };
      reader.readAsText(file);
    },

    getSavePayload(base) {
      return {
        ...base,
        pageSettings: this.pageSettings,
        headerFooter: this.headerFooter,
        version: 2
      };
    },

    loadSavePayload(state) {
      if (state.pageSettings) { this.pageSettings = state.pageSettings; this.applyPageSettings(state.pageSettings); }
      if (state.headerFooter) this.headerFooter = state.headerFooter;
    }
  };

  window.EditorFeatures = EditorFeatures;
  window.EditorPagePresets = PAGE_PRESETS;
})();
