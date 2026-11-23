import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const type = args[0];
const flags = {};
const words = [];
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith('--')) flags[args[i].slice(2)] = args[++i];
  else words.push(args[i]);
}
const title = words.join(' ').trim();

if (!['post', 'doc'].includes(type) || !title) {
  console.error('Usage:\n  npm run new:post -- "Title" [--kind technical|personal] [--tags a,b]\n  npm run new:doc -- "Title" --topic slack-relay [--order 5] [--label Short]');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const fill = (template, values) => template.replace(/{{(\w+)}}/g, (_, key) => values[key] ?? '');
const template = readFileSync(path.join(ROOT, 'templates', `${type}.md`), 'utf8');

let target;
let values;
if (type === 'post') {
  const kind = flags.kind ?? 'technical';
  if (!['technical', 'personal'].includes(kind)) {
    console.error('--kind must be technical or personal');
    process.exit(1);
  }
  const tags = (flags.tags ?? 'notes')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ');
  target = path.join(ROOT, 'src/content/blog', `${slug}.md`);
  values = { title, kind, tags, date: new Date().toISOString().slice(0, 10) };
} else {
  const topic = flags.topic;
  if (!topic) {
    console.error('--topic is required for docs, for example --topic slack-relay');
    process.exit(1);
  }
  const dir = path.join(ROOT, 'src/content/docs', topic);
  mkdirSync(dir, { recursive: true });
  const existing = readdirSync(dir).length;
  target = path.join(dir, `${slug}.md`);
  values = { title, label: flags.label ?? title, order: flags.order ?? String(existing + 1) };
}

if (existsSync(target)) {
  console.error(`Already exists: ${path.relative(ROOT, target)}`);
  process.exit(1);
}
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, fill(template, values));
console.log(`Created ${path.relative(ROOT, target)}\nReplace every TODO, then run npm run check:content.`);
