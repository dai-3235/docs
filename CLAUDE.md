# docs

This repo holds the actual docs. Task management lives in the hub repo `daizhixia3235/docs` (local: `/Users/fredbot/agent-work/docs`).

## Conventions

- Tasks are GitHub issues in `daizhixia3235/docs` labelled `repo:docs`; use `gh --repo daizhixia3235/docs`.
- Follow the hub's conventions in its `docs/agents/` (`issue-tracker.md`, `triage-labels.md`, `domain.md`) and use the `mattpocock-skills` engineering skills.
- Domain docs are single-context: `GLOSSARY.md` and `docs/adr/` at this repo's root. Use glossary terms; flag conflicts with ADRs.

## Site

The repo is an Astro and Starlight site deployed to GitHub Pages. Layout, writing rules and commands are in `README.md`. Work on a branch and open a PR. Personal blog posts (`kind: personal`) are public once merged, so only add them when the user asks.

## Adding content

Always start from the generators: `npm run new:post -- "Title" --tags a,b` for blog posts and `npm run new:doc -- "Title" --topic <folder>` for docs. They keep every page in the same structure as the first engineering post. Replace every `TODO`, run `npm run check:content`, and open a PR. Do not hand-write front matter or copy styles into a page.
