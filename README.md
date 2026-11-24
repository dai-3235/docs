# Engineering Notes

System designs, runbooks and technical writing, published with Astro and Starlight to GitHub Pages.

Tasks for this repo are tracked in [`daizhixia3235/docs`](https://github.com/daizhixia3235/docs) issues labelled `repo:docs`.

## Layout

- `src/content/docs/`: Starlight docs, one folder per topic (for example `slack-relay/`)
- `src/content/blog/`: blog posts. Frontmatter: `title`, `description`, `pubDate`, `kind` (`technical` or `personal`), `tags`, `draft`
- `src/pages/`: custom landing page and blog pages
- `src/styles/`: theme
- `GLOSSARY.md`, `docs/adr/`: domain terms and decisions

## Add content the same way every time

```bash
npm run new:post -- "Post title" --kind technical --tags agents,design
npm run new:doc -- "Page title" --topic slack-relay
```

Both commands copy a template from `templates/` into the right folder with the correct front matter and the same structure as the first engineering post: lead paragraph, diagram, approach, note, costs and related links. Replace every `TODO`, then run `npm run check:content`. The build runs the same check and fails on leftover `TODO` text, descriptions outside 40 to 200 characters, posts without tags, and front matter that does not match the schema. Because the layout, contents sidebar, share row, related block, social card and structured data come from the shared layouts, a new post or doc looks like the first one without any extra work.

## Write

- A doc: add a `.md` file under `src/content/docs/<topic>/` with `title`, `description` and `sidebar.order`.
- A post: add a `.md` file under `src/content/blog/`. Set `draft: true` to keep it unpublished.
- Diagrams: fenced `mermaid` blocks.
- Link between docs with relative links ending in `/`, for example `../runbook/`.

## Search

Search is hybrid. `npm run build` splits every page into sections, then writes a keyword index (MiniSearch) and embeddings from a small quantized model (`Xenova/all-MiniLM-L6-v2`) into `dist/search/`. In the browser the palette (⌘K or `/`) ranks keyword and meaning matches together with synonyms. The model is downloaded at build time into `.cache/models` and loaded lazily the first time search opens. Set `SEARCH_SEMANTIC=0` to build keyword search only.

## Similarity and related content

Every section has a stored embedding, so similarity needs no model download. In the palette, `Tab` or "Find similar" on a result lists the most similar sections elsewhere. At build time each page gets a list of related pages (`dist/search/pages.json`), which the site shows under every doc and post, together with reading time.

## Blog

Posts support tags (`/blog/tags/<tag>/`), a sticky table of contents with scroll tracking, a reading progress bar, copy buttons on code, share links, previous and next links, an RSS feed (`/rss.xml`) and generated social cards (`/og/<post>.png`).

## Stack

Astro 7 with Starlight, MDX and `astro-icon` (Lucide icons). Design tokens (type scale, spacing, radii, shadows, motion) live in `src/styles/tokens.css`. Code blocks use Expressive Code with the Tokyo Night theme, line numbers and collapsible sections. Markdown gets GitHub-style alerts (`> [!NOTE]`) and external-link marking. Diagrams use Mermaid with the ELK layout engine and `@panzoom/panzoom` for the viewer. Scroll animation uses Motion. `starlight-links-validator` fails the build on broken internal links.

## Workflow diagrams

Flagship workflows use React Flow (`src/components/workflow/Workflow.tsx`) with Lucide icons and a data file (`src/data/workflows.ts`). Each flow has hand-tuned `wide` and `tall` layouts. Visitors can click a step to read it, press Play for a step-by-step walkthrough, switch on Explore to pan and zoom, or go full screen. Use it in an `.mdx` page or an `.astro` page with `<Workflow client:visible flow={taskFlow} />`.

## Themes and diagrams

Light and dark mode plus four accent palettes (violet, ocean, forest, sunset) are switchable from the header. Mermaid diagrams are skinned from the same variables. In a diagram, add `classDef human|store|ops|risk` and `:::store` on a node to colour it by role. Each diagram has an Expand button with zoom and pan.

## Run locally

Needs Node 22.23.4 or newer (see `.nvmrc`).

```bash
npm install
npm run dev
npm run build
```

## Check phone widths

```bash
npm run build
npm run check:overflow
```

`check:overflow` serves `dist/`, opens every page in a real Chrome window fixed at 390 and 320 px (no mobile zoom-out emulation, which hides overflow), scrolls the whole page so lazy islands hydrate, and fails when `document.documentElement.scrollWidth` is wider than the window. It needs Chrome; set `CHROME_BIN` if it is not in a standard location.

## Checks on pull requests

`.github/workflows/checks.yml` runs on every pull request: `npm test`, `npm run build` (which includes the content check and link validation), and `npm run check:overflow` at 390 and 320 px on the runner's own Chrome. A red check blocks the merge. The deploy workflow is separate and runs only on `main`.

## Publish

Merging to `main` runs `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages at `https://dai-3235.github.io/docs/`. The repo's Pages source must be set to GitHub Actions.
