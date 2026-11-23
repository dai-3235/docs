import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import MiniSearch from 'minisearch';
import { SEARCH_FIELDS, STORE_FIELDS, MINISEARCH_OPTIONS } from '../../src/search/config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'search');
const BASE = '/docs';
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const MODEL_FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx'];
const CACHE = path.join(ROOT, '.cache', 'models');
const DIMS = 384;
const MAX_TEXT = 1800;
const EMBED_TEXT = 900;

async function indexFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'search' || entry.name === '_astro' || entry.name === 'pagefind') continue;
      found.push(...(await indexFiles(full)));
    } else if (entry.name === 'index.html') {
      found.push(full);
    }
  }
  return found;
}

const squash = (text) => text.replace(/​/g, '').replace(/\s+/g, ' ').trim();

function blockText($, node) {
  const el = $(node);
  el.find('svg, button, script, style, .mermaid').remove();
  if (node.tagName === 'table') {
    return el
      .find('tr')
      .map((_, tr) => $(tr).find('th, td').map((__, cell) => squash($(cell).text())).get().join(' · '))
      .get()
      .join('. ');
  }
  return squash(el.text());
}

function recordsFor(file, html) {
  const $ = cheerio.load(html);
  const rel = path.relative(DIST, path.dirname(file)).split(path.sep).join('/');
  if (!rel || rel === '404') return [];
  const url = `${BASE}/${rel}/`;
  const kind = rel.startsWith('blog/') ? 'blog' : 'doc';
  const body = $(kind === 'blog' ? '.prose' : '.sl-markdown-content').first();
  if (!body.length) return [];
  const title = squash($('main h1').first().text()) || squash($('title').text().split('·')[0]);
  const crumbs = kind === 'blog' ? 'Blog' : rel.split('/').slice(0, -1).join(' › ');
  const sections = [{ anchor: '', heading: '', level: 1, parts: [] }];

  const walk = (nodes) => {
    nodes.each((_, node) => {
      if (node.type !== 'tag') return;
      if ($(node).hasClass('sl-heading-wrapper')) return walk($(node).children());
      if ($(node).hasClass('sl-anchor-link') || $(node).hasClass('mermaid') || $(node).find('.mermaid').length) return;
      if (node.tagName === 'h2' || node.tagName === 'h3') {
        const id = $(node).attr('id');
        const clone = $(node).clone();
        clone.find('a.sl-anchor-link, span').remove();
        sections.push({ anchor: id || '', heading: squash(clone.text()), level: Number(node.tagName[1]), parts: [] });
        return;
      }
      const text = blockText($, node);
      if (text) sections[sections.length - 1].parts.push(text);
    });
  };
  walk(body.children());

  let parent = '';
  return sections
    .map((s) => {
      if (s.level === 2) parent = s.heading;
      const full = s.parts.join(' ');
      const text = full.slice(0, MAX_TEXT);
      const section = s.level === 3 && parent ? `${parent} › ${s.heading}` : s.heading;
      const words = full.split(/\s+/).filter(Boolean).length;
      return { url: s.anchor ? `${url}#${s.anchor}` : url, title, section, crumbs, kind, text, words };
    })
    .filter((r) => r.text || r.section);
}

function pageOf(url) {
  return url.split('#')[0];
}

function buildPages(records, mini, vectors, scales) {
  const pages = new Map();
  records.forEach((r, i) => {
    const key = pageOf(r.url);
    const page = pages.get(key) ?? { url: key, title: r.title, kind: r.kind, words: 0, rows: [] };
    page.words += r.words;
    page.rows.push(i);
    pages.set(key, page);
  });

  const centroid = (page) => {
    const sum = new Float32Array(DIMS);
    for (const row of page.rows) {
      for (let k = 0; k < DIMS; k++) sum[k] += vectors[row * DIMS + k] * scales[row];
    }
    let norm = 0;
    for (const x of sum) norm += x * x;
    norm = Math.sqrt(norm) || 1;
    return sum.map((x) => x / norm);
  };

  const list = [...pages.values()];
  if (vectors) list.forEach((page) => (page.vec = centroid(page)));

  const out = {};
  for (const page of list) {
    let ranked;
    if (vectors) {
      ranked = list
        .filter((other) => other.url !== page.url)
        .map((other) => {
          let dot = 0;
          for (let k = 0; k < DIMS; k++) dot += page.vec[k] * other.vec[k];
          return { other, score: dot };
        })
        .sort((a, b) => b.score - a.score);
    } else {
      const query = page.rows.map((row) => records[row].section).filter(Boolean).join(' ') || page.title;
      const seen = new Set([page.url]);
      ranked = [];
      for (const hit of mini.search(query, { combineWith: 'OR', prefix: true })) {
        const url = pageOf(hit.url);
        if (seen.has(url)) continue;
        seen.add(url);
        ranked.push({ other: pages.get(url), score: hit.score });
      }
    }
    out[page.url] = {
      title: page.title,
      kind: page.kind,
      minutes: Math.max(1, Math.round(page.words / 200)),
      related: ranked
        .filter((r) => r.other)
        .slice(0, 4)
        .map((r) => ({ url: r.other.url, title: r.other.title, kind: r.other.kind, score: Number(r.score.toFixed(3)) })),
    };
  }
  return out;
}

async function embed(records) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = CACHE;
  const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  const vectors = new Int8Array(records.length * DIMS);
  const scales = new Float32Array(records.length);
  const batch = 32;
  for (let i = 0; i < records.length; i += batch) {
    const slice = records
      .slice(i, i + batch)
      .map((r) => `${r.title}${r.section ? ` — ${r.section}` : ''}. ${r.text.slice(0, EMBED_TEXT)}`);
    const out = await extractor(slice, { pooling: 'mean', normalize: true });
    for (let j = 0; j < slice.length; j++) {
      const vec = out.data.subarray(j * DIMS, (j + 1) * DIMS);
      let max = 0;
      for (const x of vec) max = Math.max(max, Math.abs(x));
      const scale = max / 127 || 1;
      scales[i + j] = scale;
      for (let k = 0; k < DIMS; k++) vectors[(i + j) * DIMS + k] = Math.round(vec[k] / scale);
    }
  }
  return { vectors, scales };
}

async function copyRuntime() {
  const runtime = path.join(OUT, 'runtime');
  await mkdir(runtime, { recursive: true });
  const transformersDir = path.join(ROOT, 'node_modules', '@huggingface', 'transformers');
  await copyFile(path.join(transformersDir, 'dist', 'transformers.min.js'), path.join(runtime, 'transformers.min.js'));
  const ortDir = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
  for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
    await copyFile(path.join(ortDir, name), path.join(runtime, name));
  }
  for (const name of MODEL_FILES) {
    const target = path.join(OUT, 'models', MODEL, name);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(CACHE, MODEL, name), target);
  }
}

const records = [];
for (const file of await indexFiles(DIST)) records.push(...recordsFor(file, await readFile(file, 'utf8')));
records.forEach((r, i) => (r.id = i));

const mini = new MiniSearch({ ...MINISEARCH_OPTIONS, fields: SEARCH_FIELDS, storeFields: STORE_FIELDS });
mini.addAll(records.map((r) => ({ ...r, snippet: r.text.slice(0, 700) })));
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'index.json'), JSON.stringify(mini));

const manifest = { version: Date.now().toString(36), count: records.length, semantic: null };
let embedded = null;
if (process.env.SEARCH_SEMANTIC !== '0') {
  try {
    embedded = await embed(records);
    await writeFile(path.join(OUT, 'vectors.bin'), Buffer.from(embedded.vectors.buffer));
    await writeFile(path.join(OUT, 'scales.bin'), Buffer.from(embedded.scales.buffer));
    await copyRuntime();
    manifest.semantic = { model: MODEL, dims: DIMS, dtype: 'q8' };
  } catch (err) {
    embedded = null;
    console.warn(`Semantic search skipped: ${err.message}`);
  }
}
const pages = buildPages(records, mini, embedded?.vectors, embedded?.scales);
await writeFile(path.join(OUT, 'pages.json'), JSON.stringify(pages));
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
console.log(`Search index: ${records.length} sections, semantic ${manifest.semantic ? 'on' : 'off'}`);
