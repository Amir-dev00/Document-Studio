# Design guide

Every model must read both `AI_INSTRUCTIONS.md` and `DESIGN_GUIDE.md` before it edits anything. Cursor, Claude, ChatGPT, Gemini, Copilot, Grok, DeepSeek, and any other LLM. One file is not enough.

`AI_INSTRUCTIONS.md` is the engine contract: what to preserve, how a page is built, and the quality bar. `DESIGN_GUIDE.md` is the art direction: how the pages should look. Follow both. If they seem to disagree, keep the engine rules in `AI_INSTRUCTIONS.md` and take the look from this file.

The sample pages are a blank start. Replace them. The result should look like a printed piece from a serious studio: calm, exact, and expensive. Not a dashboard. Not a startup landing page.

## What to upload

Always include:

- `index.html`
- `css/proposal-fa.css` (the current document styles; the model may replace this file)
- `AI_INSTRUCTIONS.md` (required)
- `DESIGN_GUIDE.md` (required)
- any text, photos, or brand notes the document must use

Do not start a chat with only one of the two guides. Upload both every time.

Fonts are already local in `fonts/`. Do not ask the model to add a font CDN.

## Master prompt

Paste this after the files are attached. Fill the brackets.

```text
Read AI_INSTRUCTIONS.md and DESIGN_GUIDE.md in full before you write. Obey both. Do not design from memory or from only one of them.

Redesign the document inside index.html. Keep the Document Studio engine. Replace the sample pages and the document stylesheet with a new design for this brief:

Create: [what the PDF is]
Audience: [who reads it]
Goal: [what it should do]
Language: [English or Persian]
Source: [paste facts, or say "use only what I attached"]

Art direction:
Make it feel like a fashion lookbook, an architecture monograph, or a museum catalogue. Large type, real negative space, full-bleed images where they earn it, a tight grid, and a short color story taken from the subject. One idea per page. No walls of text. No purple gradients, glassmorphism, generic icon grids, fake statistics, or card spam.

If I did not give a brand, invent a restrained one that fits the subject. Do not invent a company logo file. Do not add Novin Coders or any other studio mark unless I asked for it.

Deliver the edited index.html and the document CSS. Every .page must fit on one A4 sheet with nothing clipped.
```

## What "good" looks like

- A cover that could stand alone as a poster.
- Headlines short enough to say out loud.
- Body copy in a few lines, not paragraphs that fill the sheet.
- English labels in small tracked capitals when the document is Persian, or the reverse when that helps.
- Page numbers, a thin rule, and a lot of empty paper.
- Photography or a single diagram as the hero. Decoration never is.
- Motion is irrelevant. This is print. It must look finished with animations off.

Reject anything that looks like a SaaS pricing page, a crypto deck, or an AI template.

## Rules the model must not break

The studio is the chrome around the pages: toolbar, theme panel, page rail, and the script at the bottom of `index.html`. Leave it alone.

Edit only:

- the title
- everything inside `#documentRoot`
- the document stylesheet linked from the head (`css/proposal-fa.css`, or a new file if the link is updated)
- `lang` and `dir` on the document root, to match the language

Do not edit `css/editor.css`, `css/print.css`, or anything in `js/`. Do not remove `<script>` tags. Do not shrink the file by summarizing the engine.

Each PDF page is one direct child of `#documentRoot`:

```html
<section class="page" data-page-title="Cover">
  <div class="page-select-ring"></div>
  <div class="page-body">
    ...
  </div>
</section>
```

- `.page` is one A4 sheet, 210 × 297 mm. Content that does not fit must move to another page. Do not hide it with `overflow: hidden`.
- `data-page-title` is the name in the page list.
- `data-editable` goes on text a person should be able to change in Edit mode.
- `data-page-number` goes on the element that should show the page index. Leave its text empty, or the engine will overwrite it.
- Use font families already declared in `fonts/fonts.css`. Useful ones: `Estedad` and `Vazirmatn` for Persian; `Playfair Display`, `Libre Baskerville`, `Source Serif 4`, `Manrope`, and `Inter` for Latin.
- No remote images, no Google Fonts, no icon libraries.
- Do not invent revenue, dates, team names, or prices. If a fact is missing, omit it.
- Set `dir="rtl"` for Persian and `dir="ltr"` for English. Do not leave English in a right-to-left layout.

Theme colors, if used, are the variables `--doc-primary`, `--doc-secondary`, `--doc-accent`, `--doc-text`, `--doc-muted`, `--doc-surface`, and `--doc-paper` on `#documentRoot`.

## How to run it in each model

The prompt above is the same everywhere. Only the upload step changes. In every case, attach both `AI_INSTRUCTIONS.md` and `DESIGN_GUIDE.md`.

### Cursor

Open this folder. In Agent chat, attach `@AI_INSTRUCTIONS.md` and `@DESIGN_GUIDE.md`, then send the master prompt. Cursor can edit `index.html` and the CSS directly. Ask it to keep the engine and to check that no page overflows.

### Claude

On claude.ai, start a Project and add both `AI_INSTRUCTIONS.md` and `DESIGN_GUIDE.md` as project instructions. In a chat, upload `index.html`, `css/proposal-fa.css`, and your source material, then paste the master prompt.

Claude should return complete files, not snippets. If the reply is cut off, say: "Continue from the last line. Do not repeat the engine. Stay inside AI_INSTRUCTIONS.md and DESIGN_GUIDE.md."

### ChatGPT

Use a model that edits code. Upload a zip of the folder, or upload `index.html`, `css/proposal-fa.css`, `AI_INSTRUCTIONS.md`, and `DESIGN_GUIDE.md`. Paste the master prompt.

Tell it: "You must use both guides. Do not rewrite the studio script. If the file is long, change only `#documentRoot` and the document CSS, and show those parts in full."

A Custom GPT should store both files as its instructions, not this guide alone.

### Gemini

In Gemini or Google AI Studio, upload `index.html`, `css/proposal-fa.css`, `AI_INSTRUCTIONS.md`, and `DESIGN_GUIDE.md`, then paste the master prompt. Gemini often shortens long HTML. Add this line:

"Use both AI_INSTRUCTIONS.md and DESIGN_GUIDE.md. Return the full `#documentRoot` block and the full document CSS. Do not omit the engine, and do not replace scripts with comments."

### Copilot, Grok, DeepSeek, and others

Same rule: both guides, then the master prompt. If the model cannot see the whole `index.html`, still give it both markdown files, and ask it to output only the new `#documentRoot` and the CSS. You then drop those into the file yourself.

## After the model replies

1. Open `index.html` in Chrome or Edge.
2. Walk every page. Look for cut-off lines, tiny type, and cramped margins.
3. Press **Print / PDF**. In the dialog, set margins to None and enable background graphics.
4. If a page overflows, send that page back to the model. Do not let it restyle the whole document to fix one sheet.
