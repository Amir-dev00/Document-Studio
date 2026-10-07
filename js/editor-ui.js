/* ============================================================
   DOCUMENT EDITOR — UI panels, toolbar, event wiring
   ============================================================ */
(() => {
  'use strict';

  const EditorUI = {
    engine: null,
    panels: {},
    activePanel: null,

    init(engine) {
      this.engine = engine;
      EditorFeatures.init(engine);
      this.injectUI();
      this.bindEvents();
      EditorCore.snapshotHistory();
    },

    injectUI() {
      const oldFormat = document.getElementById('formatBar');
      if (oldFormat) oldFormat.remove();
      const oldRail = document.getElementById('pageRail');
      if (oldRail) { oldRail.id = 'pageRailLegacy'; oldRail.style.display = 'none'; }

      document.body.insertAdjacentHTML('beforeend', this.panelHTML());
      document.querySelector('.toolbar')?.insertAdjacentHTML('afterend', this.toolbarHTML());

      const rail = document.createElement('nav');
      rail.className = 'page-rail-v2 app-chrome';
      rail.id = 'pageRailV2';
      rail.setAttribute('aria-label', 'Page thumbnails');
      document.body.appendChild(rail);

      const formatBar = document.createElement('div');
      formatBar.className = 'format-bar-v2 app-chrome';
      formatBar.id = 'formatBarV2';
      formatBar.innerHTML = this.formatBarHTML();
      document.body.appendChild(formatBar);

      this.panels = {
        font: document.getElementById('panelFont'),
        insert: document.getElementById('panelInsert'),
        page: document.getElementById('panelPage'),
        pages: document.getElementById('panelPages'),
        object: document.getElementById('panelObject'),
        table: document.getElementById('panelTable'),
        header: document.getElementById('panelHeader'),
        search: document.getElementById('panelSearch'),
        color: document.getElementById('panelColor'),
        preflight: document.getElementById('panelPreflight'),
        typography: document.getElementById('panelTypography')
      };

      this.buildFontList();
      this.engine._buildRailV2 = () => EditorFeatures.buildRailV2(document.getElementById('pageRailV2'));
      window.__dsBuildRailV2 = this.engine._buildRailV2;
      this.engine._refreshEditables = () => this.refreshEditables();
      this.engine._buildRailV2();
      this.engine.root.querySelectorAll('.ds-object').forEach(o => EditorFeatures.wireObject(o));
    },

    toolbarHTML() {
      return `<header class="editor-toolbar app-chrome" id="editorToolbar" aria-label="Editor tools">
        <div class="tool-group">
          <button type="button" class="btn" id="edUndo" title="Undo (Ctrl+Z)">↶</button>
          <button type="button" class="btn" id="edRedo" title="Redo (Ctrl+Y)">↷</button>
        </div>
        <span class="divider"></span>
        <div class="tool-group">
          <button type="button" class="btn wide" id="edTypoBtn" title="Typography">Typography <span class="caret">▾</span></button>
          <button type="button" class="btn wide" id="edColorBtn" title="Colors">Color <span class="caret">▾</span></button>
          <button type="button" class="btn wide" id="edInsertBtn" title="Insert">Insert <span class="caret">▾</span></button>
        </div>
        <span class="divider"></span>
        <div class="tool-group">
          <button type="button" class="btn wide" id="edPageBtn" title="Page settings">Page <span class="caret">▾</span></button>
          <button type="button" class="btn wide" id="edPagesBtn" title="Page manager">Pages <span class="caret">▾</span></button>
          <button type="button" class="btn wide" id="edHeaderBtn" title="Header/Footer">H/F <span class="caret">▾</span></button>
        </div>
        <span class="divider"></span>
        <div class="tool-group">
          <button type="button" class="btn" id="edSearchBtn" title="Find (Ctrl+F)">⌕</button>
          <button type="button" class="btn" id="edPreflightBtn" title="Print preflight">✓</button>
          <button type="button" class="btn" id="edGridBtn" title="Toggle grid">#</button>
          <button type="button" class="btn" id="edZoomOut" title="Zoom out">−</button>
          <select class="select" id="edZoomPreset" title="Zoom" style="height:32px;font-size:11px;min-width:72px">
            <option value="0.5">50%</option><option value="0.75">75%</option><option value="1" selected>100%</option><option value="1.25">125%</option><option value="1.5">150%</option>
          </select>
          <button type="button" class="btn" id="edZoomIn" title="Zoom in">+</button>
          <button type="button" class="btn" id="edFitWidth" title="Fit width">⇔</button>
          <button type="button" class="btn" id="edFitPageBtn" title="Fit page">⊡</button>
          <button type="button" class="btn" id="edFullscreenBtn" title="Fullscreen">⛶</button>
        </div>
        <span class="divider"></span>
        <div class="tool-group">
          <button type="button" class="btn wide" id="edImportBtn" title="Import project">Import</button>
          <button type="button" class="btn wide" id="edExportProjBtn" title="Export project">Project</button>
        </div>
        <input type="file" id="edImageInput" accept="image/*" hidden />
        <input type="file" id="edImportInput" accept=".json,application/json" hidden />
      </header>`;
    },

    formatBarHTML() {
      return `
        <button type="button" class="btn" data-fmt="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button type="button" class="btn" data-fmt="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button type="button" class="btn" data-fmt="underline" title="Underline"><u>U</u></button>
        <button type="button" class="btn" data-fmt="strike" title="Strikethrough"><s>S</s></button>
        <span class="divider"></span>
        <button type="button" class="btn" data-fmt="justifyLeft" title="Align left">&#8676;</button>
        <button type="button" class="btn" data-fmt="justifyCenter" title="Center">&#8596;</button>
        <button type="button" class="btn" data-fmt="justifyRight" title="Align right">&#8677;</button>
        <button type="button" class="btn" data-fmt="justifyFull" title="Justify">≡</button>
        <span class="divider"></span>
        <button type="button" class="btn" data-fmt="ltr" title="LTR">LTR</button>
        <button type="button" class="btn" data-fmt="rtl" title="RTL">RTL</button>
        <button type="button" class="btn" data-fmt="indent" title="Indent">→</button>
        <button type="button" class="btn" data-fmt="outdent" title="Outdent">←</button>
        <span class="divider"></span>
        <button type="button" class="btn" data-fmt="sup" title="Superscript">x²</button>
        <button type="button" class="btn" data-fmt="sub" title="Subscript">x₂</button>
        <button type="button" class="btn" data-fmt="clear" title="Clear formatting">⌫</button>
        <span class="divider"></span>
        <select class="select" id="edBlockSelect" title="Block style" style="height:32px;font-size:11px;">
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Blockquote</option>
        </select>
        <button type="button" class="btn" data-fmt="ul" title="Bullet list">•</button>
        <button type="button" class="btn" data-fmt="ol" title="Numbered list">1.</button>
        <button type="button" class="btn" data-fmt="link" title="Link">🔗</button>
        <button type="button" class="btn" data-fmt="hr" title="Divider">—</button>
      `;
    },

    panelHTML() {
      return `
      <div class="editor-panel" id="panelTypography" style="top:58px;left:50%;transform:translateX(-50%);">
        <div class="panel-head"><h3>Typography</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="panel-field font-search"><label>Font family</label><input type="text" id="edFontSearch" placeholder="Search fonts…" /></div>
          <div class="font-groups" id="edFontList"></div>
          <div class="panel-row" style="margin-top:10px">
            <div class="panel-field"><label>Size</label><div class="size-stepper"><button type="button" class="btn" id="edSizeDown">−</button><input type="number" id="edFontSize" value="11" min="1" max="200" step="0.5" /><button type="button" class="btn" id="edSizeUp">+</button><select id="edSizeUnit"><option value="pt">pt</option><option value="px">px</option></select></div></div>
            <div class="panel-field"><label>Weight</label><select id="edFontWeight"><option value="100">100</option><option value="200">200</option><option value="300">300</option><option value="400" selected>400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option><option value="800">800</option><option value="900">900</option></select></div>
          </div>
          <div class="panel-row three">
            <div class="panel-field"><label>Line height</label><input type="text" id="edLineHeight" placeholder="1.5" /></div>
            <div class="panel-field"><label>Letter sp.</label><input type="text" id="edLetterSp" placeholder="0em" /></div>
            <div class="panel-field"><label>Word sp.</label><input type="text" id="edWordSp" placeholder="0em" /></div>
          </div>
          <div class="panel-row">
            <div class="panel-field"><label>Space before</label><input type="text" id="edSpaceBefore" placeholder="0mm" /></div>
            <div class="panel-field"><label>Space after</label><input type="text" id="edSpaceAfter" placeholder="0mm" /></div>
          </div>
        </div>
      </div>

      <div class="editor-panel" id="panelFont" style="display:none"></div>

      <div class="editor-panel" id="panelColor" style="top:58px;left:50%;transform:translateX(-50%);">
        <div class="panel-head"><h3>Color</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="panel-field"><label>Apply to</label><select id="edColorTarget"><option value="text">Text</option><option value="background">Background</option></select></div>
          <input type="color" class="color-native" id="edColorNative" value="#16181d" />
          <div class="panel-row" style="margin-top:8px">
            <div class="panel-field"><label>HEX</label><input type="text" id="edColorHex" value="#16181d" /></div>
          </div>
          <div class="color-inputs">
            <div class="panel-field"><label>R</label><input type="number" id="edColorR" min="0" max="255" /></div>
            <div class="panel-field"><label>G</label><input type="number" id="edColorG" min="0" max="255" /></div>
            <div class="panel-field"><label>B</label><input type="number" id="edColorB" min="0" max="255" /></div>
          </div>
          <div class="panel-field" style="margin-top:8px"><label>Recent</label><div class="color-swatches" id="edRecentColors"></div></div>
        </div>
      </div>

      <div class="editor-panel wide" id="panelInsert" style="top:58px;left:50%;transform:translateX(-50%);">
        <div class="panel-head"><h3>Insert</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="insert-grid">
            <button type="button" class="btn" data-ins="textbox">▢ Text box</button>
            <button type="button" class="btn" data-ins="image">🖼 Image</button>
            <button type="button" class="btn" data-ins="rect">▭ Rectangle</button>
            <button type="button" class="btn" data-ins="ellipse">◯ Ellipse</button>
            <button type="button" class="btn" data-ins="line">— Line</button>
            <button type="button" class="btn" data-ins="table">⊞ Table</button>
            <button type="button" class="btn" data-ins="link">🔗 Link</button>
            <button type="button" class="btn" data-ins="hr">— Divider</button>
          </div>
        </div>
      </div>

      <div class="editor-panel" id="panelPage" style="top:58px;right:14px;left:auto;transform:none;">
        <div class="panel-head"><h3>Page settings</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="panel-field"><label>Size preset</label>
            <select id="edPagePreset"><option value="A4">A4</option><option value="A5">A5</option><option value="A3">A3</option><option value="Letter">Letter</option><option value="Legal">Legal</option><option value="custom">Custom</option></select>
          </div>
          <div class="panel-field"><label>Orientation</label>
            <select id="edOrientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select>
          </div>
          <div class="panel-row" id="edCustomSizeRow" style="display:none">
            <div class="panel-field"><label>Width</label><input type="number" id="edPageW" value="210" /></div>
            <div class="panel-field"><label>Height</label><input type="number" id="edPageH" value="297" /></div>
          </div>
          <div class="panel-field" id="edCustomUnitRow" style="display:none"><label>Unit</label><select id="edPageUnit"><option value="mm">mm</option><option value="in">in</option></select></div>
          <div class="panel-row">
            <div class="panel-field"><label>Margin top</label><input type="number" id="edMarTop" value="0" min="0" /></div>
            <div class="panel-field"><label>Margin bottom</label><input type="number" id="edMarBottom" value="0" min="0" /></div>
          </div>
          <div class="panel-row">
            <div class="panel-field"><label>Margin left</label><input type="number" id="edMarLeft" value="0" min="0" /></div>
            <div class="panel-field"><label>Margin right</label><input type="number" id="edMarRight" value="0" min="0" /></div>
          </div>
          <div class="panel-field"><label>Page background</label><input type="color" id="edPageBg" value="#ffffff" /></div>
        </div>
        <div class="panel-foot"><button type="button" class="btn primary" id="edApplyPage">Apply</button></div>
      </div>

      <div class="editor-panel wide" id="panelPages" style="top:58px;right:14px;left:auto;transform:none;">
        <div class="panel-head"><h3>Page manager</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body"><div class="page-list" id="edPageList"></div></div>
        <div class="panel-foot"><button type="button" class="btn" id="edAddPagePanel">+ Add page</button></div>
      </div>

      <div class="editor-panel" id="panelObject" style="top:58px;right:14px;left:auto;transform:none;">
        <div class="panel-head"><h3>Object</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="btn-row" style="margin-bottom:8px">
            <button type="button" class="btn" data-obj="dup">Duplicate</button>
            <button type="button" class="btn danger" data-obj="del">Delete</button>
            <button type="button" class="btn" data-obj="lock">Lock</button>
          </div>
          <div class="btn-row" style="margin-bottom:8px">
            <button type="button" class="btn" data-obj="front">Front</button>
            <button type="button" class="btn" data-obj="back">Back</button>
            <button type="button" class="btn" data-obj="up">Up</button>
            <button type="button" class="btn" data-obj="down">Down</button>
          </div>
          <div class="btn-row" style="margin-bottom:8px">
            <button type="button" class="btn" data-obj="alignL" title="Align left">⫷</button>
            <button type="button" class="btn" data-obj="alignC" title="Center">⫿</button>
            <button type="button" class="btn" data-obj="alignR" title="Align right">⫸</button>
            <button type="button" class="btn" data-obj="alignT" title="Top">⫠</button>
            <button type="button" class="btn" data-obj="alignM" title="Middle">⫟</button>
            <button type="button" class="btn" data-obj="alignB" title="Bottom">⫡</button>
          </div>
          <div class="panel-field"><label>Opacity</label><input type="range" id="edObjOpacity" min="0" max="1" step="0.05" value="1" /></div>
          <div class="panel-field"><label>Border radius</label><input type="text" id="edObjRadius" placeholder="0mm" /></div>
          <div class="panel-field"><label>Border</label><input type="text" id="edObjBorder" placeholder="1px solid #ccc" /></div>
          <div class="panel-field"><label>Shadow</label><input type="text" id="edObjShadow" placeholder="0 2mm 4mm rgba(0,0,0,.15)" /></div>
          <div class="panel-field"><label>Image fit</label><select id="edObjFit"><option value="fill">Fill</option><option value="contain">Contain</option><option value="cover">Cover</option></select></div>
        </div>
      </div>

      <div class="editor-panel" id="panelTable" style="top:58px;right:14px;left:auto;transform:none;">
        <div class="panel-head"><h3>Table</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="btn-row"><button type="button" class="btn" data-tbl="addRow">+ Row</button><button type="button" class="btn" data-tbl="delRow">− Row</button><button type="button" class="btn" data-tbl="addCol">+ Col</button><button type="button" class="btn" data-tbl="delCol">− Col</button></div>
          <div class="btn-row" style="margin-top:6px"><button type="button" class="btn" data-tbl="merge">Merge right</button></div>
          <div class="panel-field" style="margin-top:8px"><label>Cell padding</label><input type="text" id="edTblPad" placeholder="2mm" /></div>
          <div class="panel-field"><label>Border color</label><input type="color" id="edTblBorder" value="#dde1ea" /></div>
          <div class="panel-field"><label>Cell background</label><input type="color" id="edTblBg" value="#ffffff" /></div>
          <div class="panel-field"><label>Alignment</label><select id="edTblAlign"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
        </div>
      </div>

      <div class="editor-panel" id="panelHeader" style="top:58px;right:14px;left:auto;transform:none;">
        <div class="panel-head"><h3>Header & Footer</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="panel-field"><label>Header HTML</label><textarea id="edHeaderText" placeholder="Header text or HTML"></textarea></div>
          <div class="panel-field"><label>Footer HTML</label><textarea id="edFooterText" placeholder="Footer text or HTML"></textarea></div>
          <div class="panel-field"><label><input type="checkbox" id="edPageNums" checked /> Show page numbers in footer</label></div>
          <div class="panel-field"><label>Start numbering at</label><input type="number" id="edPageStart" value="1" min="1" /></div>
        </div>
        <div class="panel-foot"><button type="button" class="btn primary" id="edApplyHF">Apply to all pages</button></div>
      </div>

      <div class="editor-panel" id="panelSearch" style="top:58px;left:50%;transform:translateX(-50%);">
        <div class="panel-head"><h3>Find & Replace</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body">
          <div class="panel-field"><label>Find</label><input type="text" id="edFindQuery" /></div>
          <div class="panel-field"><label>Replace</label><input type="text" id="edReplaceText" /></div>
          <div class="panel-field"><label><input type="checkbox" id="edFindCase" /> Case sensitive</label></div>
          <div id="edFindCount" style="font-size:11px;color:var(--ui-muted);margin-bottom:8px"></div>
          <div class="btn-row">
            <button type="button" class="btn" id="edFindPrev">↑ Prev</button>
            <button type="button" class="btn" id="edFindNext">↓ Next</button>
            <button type="button" class="btn" id="edReplaceOne">Replace</button>
            <button type="button" class="btn" id="edReplaceAll">All</button>
          </div>
        </div>
      </div>

      <div class="editor-panel wide" id="panelPreflight" style="top:58px;left:50%;transform:translateX(-50%);">
        <div class="panel-head"><h3>Print preflight</h3><button type="button" class="btn panel-close" data-close>×</button></div>
        <div class="panel-body"><div class="preflight-list" id="edPreflightList"></div></div>
        <div class="panel-foot"><button type="button" class="btn primary" id="edRunPreflight">Run check</button></div>
      </div>`;
    },

    buildFontList(filter = '') {
      const list = document.getElementById('edFontList');
      if (!list || !window.DocumentStudioFonts) return;
      const q = filter.toLowerCase();
      list.innerHTML = '';
      window.DocumentStudioFonts.groups.forEach(group => {
        const families = group.families.filter(f => !q || f.toLowerCase().includes(q));
        if (!families.length) return;
        const title = document.createElement('div');
        title.className = 'font-group-title';
        title.textContent = group.label;
        list.appendChild(title);
        families.forEach(name => {
          const opt = document.createElement('div');
          opt.className = 'font-option';
          opt.dataset.font = name;
          const stack = window.DocumentStudioFonts.stack(name);
          opt.innerHTML = `<span style="font-family:${stack}">${name}</span><span class="sample" style="font-family:${stack}">${group.id === 'latin' ? 'Aa Bb' : 'آ ا ب'}</span>`;
          opt.addEventListener('click', () => {
            list.querySelectorAll('.font-option.active').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            EditorCore.setFontFamily(name);
            this.afterEdit();
          });
          list.appendChild(opt);
        });
      });
    },

    togglePanel(name, anchorBtn) {
      const panel = this.panels[name] || document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1));
      if (!panel) return;
      const isOpen = panel.classList.contains('open');
      this.closeAllPanels();
      if (!isOpen) {
        panel.classList.add('open');
        this.activePanel = name;
        if (name === 'pages') this.buildPageList();
        if (name === 'color') this.renderRecentColors();
        if (name === 'typography') { /* already built */ }
      }
    },

    closeAllPanels() {
      document.querySelectorAll('.editor-panel.open').forEach(p => p.classList.remove('open'));
      this.activePanel = null;
    },

    buildPageList() {
      const list = document.getElementById('edPageList');
      if (!list) return;
      list.innerHTML = '';
      this.engine.pages().forEach((page, i) => {
        const item = document.createElement('div');
        item.className = 'page-list-item';
        item.innerHTML = `
          <div class="mini-thumb" data-mini="${i}"></div>
          <input type="text" value="${page.dataset.pageTitle || 'Page ' + (i+1)}" data-rename="${i+1}" />
          <div class="btn-row">
            <button type="button" class="btn" data-go="${i+1}" title="Go">→</button>
            <button type="button" class="btn" data-dup="${i+1}" title="Duplicate">⧉</button>
            <button type="button" class="btn danger" data-del="${i+1}" title="Delete">×</button>
          </div>`;
        list.appendChild(item);
        const mini = item.querySelector('.mini-thumb');
        const clone = page.cloneNode(true);
        clone.querySelectorAll('[contenteditable],.ds-handles').forEach(el => { el.removeAttribute('contenteditable'); if (el.classList?.contains('ds-handles')) el.remove(); });
        clone.style.transform = 'scale(0.12)'; clone.style.transformOrigin = 'top left';
        clone.style.width = 'var(--page-width)'; clone.style.height = 'var(--page-height)';
        mini.appendChild(clone);
      });
      list.querySelectorAll('[data-rename]').forEach(inp => {
        inp.addEventListener('change', () => EditorFeatures.renamePage(+inp.dataset.rename, inp.value));
      });
      list.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => this.engine.goToPage(+btn.dataset.go)));
      list.querySelectorAll('[data-dup]').forEach(btn => btn.addEventListener('click', () => { this.engine.goToPage(+btn.dataset.dup); this.engine.duplicatePage(); this.buildPageList(); }));
      list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => { this.engine.goToPage(+btn.dataset.del); this.engine.deleteCurrentPage(); this.buildPageList(); }));
    },

    renderRecentColors() {
      const el = document.getElementById('edRecentColors');
      if (!el) return;
      el.innerHTML = '';
      EditorFeatures.recentColors.forEach(hex => {
        const sw = document.createElement('button');
        sw.type = 'button'; sw.className = 'color-swatch'; sw.style.background = hex;
        sw.addEventListener('click', () => this.setColorValue(hex));
        el.appendChild(sw);
      });
    },

    setColorValue(hex) {
      hex = EditorCore.parseColor(hex);
      document.getElementById('edColorNative').value = hex;
      document.getElementById('edColorHex').value = hex;
      const rgb = EditorCore.hexToRgb(hex);
      if (rgb) { document.getElementById('edColorR').value = rgb.r; document.getElementById('edColorG').value = rgb.g; document.getElementById('edColorB').value = rgb.b; }
    },

    applyColor() {
      const hex = document.getElementById('edColorHex').value;
      const target = document.getElementById('edColorTarget').value;
      EditorCore.setColor(target, hex);
      EditorFeatures.addRecentColor(hex);
      this.afterEdit();
    },

    afterEdit() {
      EditorCore.pushHistory();
      this.engine.scheduleSave();
      this.engine.detectOverflow();
      if (this.engine._buildRailV2) this.engine._buildRailV2();
    },

    refreshEditables() {
      const selector = '[data-editable], h1, h2, h3, h4, h5, h6, p, li, td, th, figcaption, blockquote, .ds-textbox, .ds-page-header, .ds-page-footer';
      this.engine.root.querySelectorAll(selector).forEach(el => {
        if (el.closest('[data-no-edit]')) return;
        if (document.body.classList.contains('edit-mode')) {
          el.setAttribute('contenteditable', 'true');
          el.setAttribute('spellcheck', 'true');
        }
      });
    },

    bindEvents() {
      const eng = this.engine;
      const fmtBar = document.getElementById('formatBarV2');
      fmtBar?.addEventListener('mousedown', e => e.preventDefault());

      document.getElementById('edUndo')?.addEventListener('click', () => { if (EditorCore.undo()) { eng.refreshAll(); this.afterEdit(); } });
      document.getElementById('edRedo')?.addEventListener('click', () => { if (EditorCore.redo()) { eng.refreshAll(); this.afterEdit(); } });

      const panelMap = { edTypoBtn: 'typography', edColorBtn: 'color', edInsertBtn: 'insert', edPageBtn: 'page', edPagesBtn: 'pages', edHeaderBtn: 'header', edSearchBtn: 'search', edPreflightBtn: 'preflight' };
      Object.entries(panelMap).forEach(([id, name]) => {
        document.getElementById(id)?.addEventListener('click', () => this.togglePanel(name));
      });

      document.querySelectorAll('.panel-close,[data-close]').forEach(btn => btn.addEventListener('click', () => this.closeAllPanels()));
      document.addEventListener('click', e => {
        if (!e.target.closest('.editor-panel') && !e.target.closest('.editor-toolbar')) this.closeAllPanels();
      });

      document.getElementById('edFontSearch')?.addEventListener('input', e => this.buildFontList(e.target.value));
      document.getElementById('edSizeDown')?.addEventListener('click', () => { const inp = document.getElementById('edFontSize'); inp.value = Math.max(1, parseFloat(inp.value) - 0.5); EditorCore.setFontSize(inp.value, document.getElementById('edSizeUnit').value); this.afterEdit(); });
      document.getElementById('edSizeUp')?.addEventListener('click', () => { const inp = document.getElementById('edFontSize'); inp.value = parseFloat(inp.value) + 0.5; EditorCore.setFontSize(inp.value, document.getElementById('edSizeUnit').value); this.afterEdit(); });
      document.getElementById('edFontSize')?.addEventListener('change', e => { EditorCore.setFontSize(e.target.value, document.getElementById('edSizeUnit').value); this.afterEdit(); });
      document.getElementById('edSizeUnit')?.addEventListener('change', () => { const inp = document.getElementById('edFontSize'); EditorCore.setFontSize(inp.value, document.getElementById('edSizeUnit').value); this.afterEdit(); });
      document.getElementById('edFontWeight')?.addEventListener('change', e => { EditorCore.setFontWeight(e.target.value); this.afterEdit(); });
      document.getElementById('edLineHeight')?.addEventListener('change', e => { EditorCore.setSpacing('lineHeight', e.target.value); this.afterEdit(); });
      document.getElementById('edLetterSp')?.addEventListener('change', e => { EditorCore.setSpacing('letterSpacing', e.target.value); this.afterEdit(); });
      document.getElementById('edWordSp')?.addEventListener('change', e => { EditorCore.setSpacing('wordSpacing', e.target.value); this.afterEdit(); });
      document.getElementById('edSpaceBefore')?.addEventListener('change', e => { EditorCore.setSpacing('marginBefore', e.target.value); this.afterEdit(); });
      document.getElementById('edSpaceAfter')?.addEventListener('change', e => { EditorCore.setSpacing('marginAfter', e.target.value); this.afterEdit(); });

      ['edColorNative','edColorHex','edColorR','edColorG','edColorB'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => this.syncColorInputs(id));
      });
      document.getElementById('edColorNative')?.addEventListener('change', () => this.applyColor());
      document.getElementById('edColorHex')?.addEventListener('change', () => this.applyColor());

      document.querySelectorAll('[data-ins]').forEach(btn => {
        btn.addEventListener('click', () => this.handleInsert(btn.dataset.ins));
      });

      document.getElementById('edApplyPage')?.addEventListener('click', () => this.applyPageSettings());
      document.getElementById('edPagePreset')?.addEventListener('change', e => {
        document.getElementById('edCustomSizeRow').style.display = e.target.value === 'custom' ? 'grid' : 'none';
        document.getElementById('edCustomUnitRow').style.display = e.target.value === 'custom' ? 'block' : 'none';
      });

      document.getElementById('edApplyHF')?.addEventListener('click', () => {
        EditorFeatures.headerFooter = {
          header: document.getElementById('edHeaderText').value,
          footer: document.getElementById('edFooterText').value,
          pageNumbers: document.getElementById('edPageNums').checked,
          startAt: parseInt(document.getElementById('edPageStart').value, 10) || 1
        };
        EditorFeatures.applyHeaderFooter();
        this.afterEdit();
      });

      document.getElementById('edFindNext')?.addEventListener('click', () => { EditorFeatures.findNext(false); this.updateFindCount(); });
      document.getElementById('edFindPrev')?.addEventListener('click', () => { EditorFeatures.findNext(true); this.updateFindCount(); });
      document.getElementById('edFindQuery')?.addEventListener('input', e => this.runFind(e.target.value));
      document.getElementById('edReplaceOne')?.addEventListener('click', () => { EditorFeatures.replaceOne(document.getElementById('edReplaceText').value); this.updateFindCount(); });
      document.getElementById('edReplaceAll')?.addEventListener('click', () => {
        const n = EditorFeatures.replaceAll(document.getElementById('edReplaceText').value);
        document.getElementById('edFindCount').textContent = `Replaced ${n} occurrence(s)`;
      });

      document.getElementById('edRunPreflight')?.addEventListener('click', () => this.showPreflight());
      document.getElementById('edPreflightBtn')?.addEventListener('click', () => { this.togglePanel('preflight'); this.showPreflight(); });

      document.getElementById('edGridBtn')?.addEventListener('click', () => document.body.classList.toggle('show-grid'));
      document.getElementById('edFitPageBtn')?.addEventListener('click', () => this.fitPage());
      document.getElementById('edFitWidth')?.addEventListener('click', () => this.engine.fitWidth());
      document.getElementById('edZoomIn')?.addEventListener('click', () => this.engine.setZoom((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1) + 0.1));
      document.getElementById('edZoomOut')?.addEventListener('click', () => this.engine.setZoom((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1) - 0.1));
      document.getElementById('edZoomPreset')?.addEventListener('change', e => this.engine.setZoom(parseFloat(e.target.value)));
      document.getElementById('edFullscreenBtn')?.addEventListener('click', () => document.body.classList.toggle('editor-fullscreen'));

      document.getElementById('edExportProjBtn')?.addEventListener('click', () => EditorFeatures.exportProject());
      document.getElementById('edImportBtn')?.addEventListener('click', () => document.getElementById('edImportInput').click());
      document.getElementById('edImportInput')?.addEventListener('change', e => { if (e.target.files[0]) EditorFeatures.importProject(e.target.files[0]); e.target.value = ''; });

      document.getElementById('edImageInput')?.addEventListener('change', e => {
        if (e.target.files[0]) EditorFeatures.insertImageFromFile(e.target.files[0]);
        e.target.value = '';
      });

      document.getElementById('edAddPagePanel')?.addEventListener('click', () => { eng.addBlankPage(); this.buildPageList(); });

      fmtBar?.querySelectorAll('[data-fmt]').forEach(btn => btn.addEventListener('click', () => this.handleFormat(btn.dataset.fmt)));

      document.getElementById('edBlockSelect')?.addEventListener('change', e => this.changeBlock(e.target.value));

      document.querySelectorAll('[data-obj]').forEach(btn => btn.addEventListener('click', () => this.handleObject(btn.dataset.obj)));
      document.querySelectorAll('[data-tbl]').forEach(btn => btn.addEventListener('click', () => { EditorFeatures.tableOp(btn.dataset.tbl); this.afterEdit(); }));

      ['edObjOpacity','edObjRadius','edObjBorder','edObjShadow','edObjFit'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => this.applyObjectStyle());
      });
      ['edTblPad','edTblBorder','edTblBg','edTblAlign'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
          EditorFeatures.styleTable({
            padding: document.getElementById('edTblPad').value,
            borderColor: document.getElementById('edTblBorder').value,
            bg: document.getElementById('edTblBg').value,
            align: document.getElementById('edTblAlign').value
          });
        });
      });

      eng.root.addEventListener('click', e => {
        const obj = e.target.closest('.ds-object');
        if (obj && document.body.classList.contains('edit-mode')) {
          EditorFeatures.selectObject(obj);
          this.togglePanel('object');
        } else if (!e.target.closest('.editor-panel')) {
          EditorFeatures.selectObject(null);
        }
      });

      eng.root.addEventListener('dragover', e => { if (document.body.classList.contains('edit-mode')) e.preventDefault(); });
      eng.root.addEventListener('drop', e => {
        if (!document.body.classList.contains('edit-mode')) return;
        e.preventDefault();
        const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
        if (file) EditorFeatures.insertImageFromFile(file);
      });

      eng.root.addEventListener('input', () => EditorCore.preserveSelection());
      document.addEventListener('selectionchange', () => EditorCore.preserveSelection());

      window.addEventListener('keydown', e => this.handleKeyboard(e));
    },

    syncColorInputs(source) {
      if (source === 'edColorNative' || source === 'edColorHex') {
        const hex = EditorCore.parseColor(document.getElementById(source === 'edColorNative' ? 'edColorNative' : 'edColorHex').value);
        this.setColorValue(hex);
      } else {
        const r = +document.getElementById('edColorR').value || 0;
        const g = +document.getElementById('edColorG').value || 0;
        const b = +document.getElementById('edColorB').value || 0;
        this.setColorValue(EditorCore.rgbToHex(r, g, b));
      }
    },

    handleFormat(cmd) {
      const map = {
        bold: () => EditorCore.toggleInline('bold'),
        italic: () => EditorCore.toggleInline('italic'),
        underline: () => EditorCore.toggleInline('underline'),
        strike: () => EditorCore.toggleInline('strikeThrough'),
        justifyLeft: () => EditorCore.setAlign('left'),
        justifyCenter: () => EditorCore.setAlign('center'),
        justifyRight: () => EditorCore.setAlign('right'),
        justifyFull: () => EditorCore.setAlign('justify'),
        ltr: () => EditorCore.setDir('ltr'),
        rtl: () => EditorCore.setDir('rtl'),
        indent: () => EditorCore.indent(false),
        outdent: () => EditorCore.indent(true),
        sup: () => EditorCore.superscript(true),
        sub: () => EditorCore.superscript(false),
        clear: () => EditorCore.clearFormatting(),
        ul: () => EditorCore.toggleInline('insertUnorderedList'),
        ol: () => EditorCore.toggleInline('insertOrderedList'),
        link: () => { const url = prompt('Link URL:', 'https://'); if (url) EditorCore.insertHTML(`<a href="${url}">${window.getSelection()?.toString() || url}</a>`); },
        hr: () => EditorCore.insertHTML('<hr style="border:none;border-top:1px solid var(--doc-line,#dde1ea);margin:5mm 0;" />')
      };
      map[cmd]?.();
      this.afterEdit();
    },

    changeBlock(tag) {
      EditorCore.restoreSelection();
      const range = EditorCore.getRange();
      if (!range) return;
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentElement;
      while (node && node !== this.engine.root && !/^(P|H1|H2|H3|H4|H5|H6|BLOCKQUOTE)$/.test(node.tagName)) node = node.parentElement;
      if (node && node !== this.engine.root) {
        const neu = document.createElement(tag);
        neu.innerHTML = node.innerHTML;
        neu.dataset.editable = '';
        if (tag.startsWith('h')) neu.style.cssText = node.style.cssText;
        node.replaceWith(neu);
        this.afterEdit();
      }
    },

    handleInsert(type) {
      if (type === 'image') document.getElementById('edImageInput').click();
      else if (type === 'table') { EditorFeatures.insertTable(3, 3); this.togglePanel('table'); this.afterEdit(); }
      else if (type === 'link') this.handleFormat('link');
      else if (type === 'hr') this.handleFormat('hr');
      else {
        const body = EditorCore.currentPageBody();
        if (!body) return;
        const obj = EditorFeatures.createObject(type, { text: type === 'textbox' ? 'Text box' : undefined });
        body.appendChild(obj);
        if (type === 'textbox') { this.engine._refreshEditables?.(); obj.focus(); }
        EditorFeatures.selectObject(obj);
        this.afterEdit();
      }
    },

    handleObject(op) {
      const F = EditorFeatures;
      if (op === 'dup') F.duplicateSelectedObject();
      else if (op === 'del') F.deleteSelectedObject();
      else if (op === 'lock') F.toggleLockObject();
      else if (op === 'front') F.setObjectLayer('front');
      else if (op === 'back') F.setObjectLayer('back');
      else if (op === 'up') F.setObjectLayer('up');
      else if (op === 'down') F.setObjectLayer('down');
      else if (op.startsWith('align')) F.alignObject(op);
      this.afterEdit();
    },

    applyObjectStyle() {
      EditorFeatures.applyImageStyle({
        opacity: document.getElementById('edObjOpacity').value,
        borderRadius: document.getElementById('edObjRadius').value || undefined,
        border: document.getElementById('edObjBorder').value || undefined,
        boxShadow: document.getElementById('edObjShadow').value || undefined,
        objectFit: document.getElementById('edObjFit').value
      });
    },

    applyPageSettings() {
      const preset = document.getElementById('edPagePreset').value;
      const orient = document.getElementById('edOrientation').value;
      if (preset === 'custom') {
        EditorFeatures.setCustomSize(
          document.getElementById('edPageW').value,
          document.getElementById('edPageH').value,
          document.getElementById('edPageUnit').value
        );
      } else {
        EditorFeatures.setPreset(preset, orient);
      }
      EditorFeatures.setMargins(
        document.getElementById('edMarTop').value,
        document.getElementById('edMarRight').value,
        document.getElementById('edMarBottom').value,
        document.getElementById('edMarLeft').value
      );
      EditorFeatures.pageSettings.background = document.getElementById('edPageBg').value;
      EditorFeatures.applyPageSettings(EditorFeatures.pageSettings);
      this.afterEdit();
    },

    runFind(query) {
      EditorFeatures.clearSearchHits();
      const caseSensitive = document.getElementById('edFindCase').checked;
      const hits = EditorFeatures.findAll(query, caseSensitive);
      EditorFeatures.highlightHits();
      this.updateFindCount();
    },

    updateFindCount() {
      const el = document.getElementById('edFindCount');
      const hits = EditorFeatures.searchState.hits;
      if (!hits.length) { el.textContent = 'No matches'; return; }
      el.textContent = `${EditorFeatures.searchState.index + 1} of ${hits.length}`;
    },

    showPreflight() {
      const list = document.getElementById('edPreflightList');
      const issues = EditorFeatures.runPreflight();
      list.innerHTML = issues.map(i => `<div class="preflight-item ${i.level}">${i.msg}</div>`).join('');
    },

    fitPage() {
      const pw = this.engine.root.querySelector('.page')?.offsetWidth || 793;
      const ph = this.engine.root.querySelector('.page')?.offsetHeight || 1122;
      const availW = window.innerWidth - 200;
      const availH = window.innerHeight - 120;
      const zoom = Math.min(1.6, Math.max(0.45, Math.min(availW / pw, availH / ph)));
      this.engine.setZoom(Math.round(zoom * 100) / 100);
    },

    handleKeyboard(e) {
      const active = document.activeElement;
      const typing = active && (active.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(active.tagName));
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); document.getElementById('edUndo')?.click(); return; }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); document.getElementById('edRedo')?.click(); return; }
      if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); this.handleFormat('bold'); return; }
      if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); this.handleFormat('italic'); return; }
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); this.togglePanel('search'); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); this.engine.saveState(true); return; }
      if (e.key === 'Delete' && EditorFeatures.selectedObject && !typing) { e.preventDefault(); EditorFeatures.deleteSelectedObject(); this.afterEdit(); }
    }
  };

  window.EditorUI = EditorUI;
})();
