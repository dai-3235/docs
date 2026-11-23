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

## Run locally

Needs Node 22.23.4 or newer (see `.nvmrc`).

```bash
npm install
npm run dev
npm run build
```

## Publish

Merging to `main` runs `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages at `https://dai-3235.github.io/docs/`. The repo's Pages source must be set to GitHub Actions.
