# Engineering Notes

System designs, runbooks and technical writing, published with Astro and Starlight to GitHub Pages.

Tasks for this repo are tracked in [`daizhixia3235/docs`](https://github.com/daizhixia3235/docs) issues labelled `repo:docs`.

## Layout

- `src/content/docs/`: Starlight docs, one folder per topic (for example `slack-relay/`)
- `src/content/blog/`: blog posts. Frontmatter: `title`, `description`, `pubDate`, `kind` (`technical` or `personal`), `tags`, `draft`
- `src/pages/`: custom landing page and blog pages
- `src/styles/`: theme
- `GLOSSARY.md`, `docs/adr/`: domain terms and decisions

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

## Themes and diagrams

Light and dark mode plus four accent palettes (violet, ocean, forest, sunset) are switchable from the header. Mermaid diagrams are skinned from the same variables. In a diagram, add `classDef human|store|ops|risk` and `:::store` on a node to colour it by role. Each diagram has an Expand button with zoom and pan.

## Run locally

Needs Node 22.23.4 or newer (see `.nvmrc`).

```bash
npm install
npm run dev
npm run build
```

## Publish

Merging to `main` runs `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages at `https://dai-3235.github.io/docs/`. The repo's Pages source must be set to GitHub Actions.
