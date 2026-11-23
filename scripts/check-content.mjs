import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(md|mdx)$/.test(name) ? [full] : [];
  });
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fields = {};
  if (!match) return { fields, body: text };
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^(\w+):\s*(.*)$/);
    if (pair) fields[pair[1]] = pair[2].replace(/^"|"$/g, '');
  }
  return { fields, body: text.slice(match[0].length) };
}

for (const file of [...files(path.join(ROOT, 'src/content/blog')), ...files(path.join(ROOT, 'src/content/docs'))]) {
  const rel = path.relative(ROOT, file);
  const { fields, body } = frontmatter(readFileSync(file, 'utf8'));
  const isBlog = rel.includes('content/blog/');
  if (isBlog && fields.draft === 'true') continue;
  if (/\bTODO\b/.test(`${fields.title ?? ''} ${fields.description ?? ''} ${body}`)) problems.push(`${rel}: unfinished TODO text`);
  const description = fields.description ?? '';
  if (description.length < 40 || description.length > 200) problems.push(`${rel}: description must be 40 to 200 characters (now ${description.length})`);
  if (!fields.title) problems.push(`${rel}: missing title`);
  if (isBlog && !/^\[.+\]$/.test(fields.tags ?? '')) problems.push(`${rel}: tags must be a list, for example [agents, slack]`);
  if (isBlog && !fields.pubDate) problems.push(`${rel}: missing pubDate`);
}

if (problems.length) {
  console.error(`Content check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('Content check passed.');
