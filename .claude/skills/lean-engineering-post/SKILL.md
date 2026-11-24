---
name: lean-engineering-post
description: Use when writing or editing any engineering blog post or doc in this repo. Enforces the site theme of simple, lean, scale on demand, and an efficient, practical solution and design in every post.
---

# Lean engineering post

Every engineering post or doc teaches an efficient, practical solution. The theme is **simple, lean, scale on demand**.

## Before writing

1. Create the file with the generator, never by hand: `npm run new:post -- "Title" --tags a,b` or `npm run new:doc -- "Title" --topic <folder>`.
2. Read `GLOSSARY.md` and `docs/adr/`. Use glossary terms and the neutral, sanitized voice from ADR 0001.
3. Run the checks below against the design you are about to describe. If it fails one, change the design first, then write.

## Design checks

- **Simple.** Start with the smallest design that meets today's requirement. If a reader can skip a component and the design still works, the component does not belong.
- **Lean.** Count the moving parts. Each one must name the problem it solves. Prefer a boring, existing tool over a new service.
- **Scale on demand.** State the trigger that justifies the next step (a measurable limit or a new requirement), what the step is, and what it costs. Do not build for scale that has not been asked for.
- **Efficient.** Say what the design saves: work, moving parts, latency, money or operator attention. Give the reason, not invented numbers.
- **Practical.** Every post ends with something the reader can do on Monday: a decision rule, a checklist, a command or a small example.

## Structure of every post

Keep the generator's structure and fill it in this order:

1. Lead: the problem, who feels it, in two or three sentences.
2. Diagram: the simple version only. Add a second diagram only for a scale-out step.
3. The approach: the few choices that matter, each with what it costs.
4. Scale on demand: a short table of trigger, next step and cost.
5. What it costs: honest limits and what is unfinished.
6. Related: links to the matching doc.

## Writing rules

- Plain words, short sentences, one idea per paragraph. Cut anything that does not help the reader decide or build.
- Describe technology by category, not product, unless the post is about that product's own documentation.
- No traffic, latency or size numbers, no team, customer, incident or roadmap details.
- Comparisons use only claims that can be checked against the other system's own docs, and link the source.
- No comments in code samples. Make names carry the meaning.

## Before opening the PR

1. Replace every `TODO`.
2. `npm run check:content` passes.
3. `npm run build` passes.
4. Work on a branch and open a PR. Personal posts (`kind: personal`) go public on merge, so add them only when the owner asks.
5. Publication of an engineering post needs the owner's explicit sign-off before merge.
