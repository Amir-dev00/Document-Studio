# AI Handoff — Document Studio

You must use this file together with `DESIGN_GUIDE.md`. Cursor, Claude, ChatGPT, Gemini, and every other model: read both before editing. This file is the engine contract. `DESIGN_GUIDE.md` is the art direction. Do not follow one and ignore the other.

You are editing `index.html`, a universal HTML runtime for print-ready A4 PDFs.

The three starter pages and `css/document.css` are examples. They are not a brand, a template, or a required look. Replace them.

## What the engine already does

- Exact A4 pages (`.page`)
- Viewer, page counter, keyboard navigation
- Preview / Edit, with direct text editing
- Theme color variables
- Autosave to localStorage
- Add, duplicate, and delete pages
- Add text
- Overflow warnings
- Zoom and fit-width
- Export HTML
- Print / Save as PDF
- `window.DocumentStudio` helper API

## What you may replace

- Page count and sequence
- Content, tone, and structure
- Typography, color, layout, imagery
- Charts, tables, diagrams, SVG
- Headers and footers
- `css/document.css`

A document can be a proposal, report, invoice, syllabus, story, certificate, or something with no usual category. Design for the request in front of you. Do not keep the starter look unless it is actually the right one.

## What to preserve

- `#documentRoot`
- Direct child `.page` elements
- Page size and print rules
- Engine UI and engine JavaScript, unless you are intentionally extending the runtime

Each physical PDF page is one direct child:

```html
<section class="page" data-page-title="Descriptive title">
  <div class="page-select-ring"></div>
  <div class="page-body">
    ...anything...
  </div>
</section>
```

Use `data-editable` on text a person should be able to change in Edit mode.

Use `data-page-number` on the element whose text should equal the page index.

## Before you finish

- Check every page for clipping and overflow
- Do not hide overflow with `overflow: hidden`
- Keep type readable
- Check page numbers and print mode
- Keep contrast strong
- Prefer HTML, CSS, and SVG over remote assets

There is no required logo, company name, or color palette. If the person asking does not supply a brand, invent one that fits the document, or leave branding off.
