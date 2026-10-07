# Document Studio

A dependency-free HTML runtime for documents that print as exact A4 pages.

Open one file in Chrome or Edge. Hand it to an AI. Print to PDF from the browser. No build step, no font CDN, no server.

## Start

1. Clone the repo.
2. Open `index.html` in Chrome or Edge.
3. Give the assistant `index.html`, `AI_INSTRUCTIONS.md`, and `DESIGN_GUIDE.md`. Both guides are required.
4. Describe the document in a few lines.
5. Let the assistant replace the starter pages. The engine stays.
6. Use **Edit** for last changes, then **Print / PDF**.

The three pages already in the file are a blank start. They are meant to be deleted.

## Prompt

```text
Read AI_INSTRUCTIONS.md and DESIGN_GUIDE.md before you design. Use both.

Create: [what the PDF is]
Audience: [who will read it]
Goal: [what it should accomplish]
Source material: [attach or paste]

You have full creative authority over the document: structure, page count, typography, color, layout, and visuals. The starter pages are not a template. Delete them. Preserve the engine, and make every page print cleanly with no clipping.
```

Cursor, Claude, ChatGPT, Gemini, and any other model all need the same pair: `AI_INSTRUCTIONS.md` for the engine, `DESIGN_GUIDE.md` for the look. Upload both with `index.html` every time.

## Controls

| Action | How |
| --- | --- |
| Change page | Arrows, Page Up / Page Down, Home, End |
| Zoom | Plus, minus, or **Fit** |
| Edit text | **Edit**, or press `E` when you are not typing |
| Colors | **Theme** |
| Pages | **+ Page**, **Duplicate**, **Delete** |
| Keep a copy | **Export HTML** |
| Make the PDF | **Print / PDF** |

Autosave writes to the browser’s localStorage. **Reset** in the theme panel clears that draft and returns to the file on disk.

## How a page works

Every sheet is one element, a direct child of `#documentRoot`:

```html
<section class="page" data-page-title="Cover">
  <div class="page-select-ring"></div>
  <div class="page-body">
    ...
  </div>
</section>
```

- `.page` is the physical A4 sheet. Do not let content spill out of it.
- `data-page-title` is the name in the page rail.
- `data-editable` marks text that Edit mode should open.
- `data-page-number` is filled with the real page index.

Document styles live in `css/document.css`. Replace that file. Do not restyle the studio chrome unless you mean to change the tool itself.

## What’s in the repo

```text
index.html            viewer, editor, and the starter document
css/document.css      starter styles — replace these
css/editor.css        studio interface
css/print.css         A4 print rules
js/                   editor behavior
fonts/                local font files, no network required
DESIGN_GUIDE.md       prompt and art direction for any model
AI_INSTRUCTIONS.md    rules for a coding assistant
```

Print target is Chromium: Chrome or Edge. The viewer uses the CSS `zoom` property, which those browsers support.

Page size is A4, 210 × 297 mm. To change it, update `--page-width`, `--page-height`, the `.page` print size, and `@page` together.

## License

Use, modify, and redistribute these files for personal or commercial work. See `LICENSE.txt`.
