import MiniSearch from 'minisearch';
import { BOOST, MINISEARCH_OPTIONS, SEARCH_FIELDS, STORE_FIELDS } from './config.mjs';
import { expand } from './synonyms';

export type Kind = 'all' | 'doc' | 'blog';
export type Match = 'keyword' | 'meaning' | 'both';

export interface Hit {
  id: number;
  url: string;
  title: string;
  section: string;
  crumbs: string;
  kind: 'doc' | 'blog';
  snippet: string;
  terms: string[];
  match: Match;
  score: number;
}

export interface Status {
  keyword: 'idle' | 'loading' | 'ready' | 'error';
  semantic: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
  progress: number;
}

interface Manifest {
  version: string;
  count: number;
  semantic: { model: string; dims: number; dtype: string } | null;
}

type Extractor = (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array }>;

interface Vectors {
  data: Int8Array;
  scales: Float32Array;
  dims: number;
}

type StoredDoc = Omit<Hit, 'id' | 'terms' | 'match' | 'score'>;

const RRF_K = 50;
const MIN_SIMILARITY = 0.22;
const MAX_PER_PAGE = 2;
const SIMILAR_MIN = 0.3;

export function createEngine(base: string) {
  const root = `${base}/search/`;
  let mini: MiniSearch | null = null;
  let manifest: Manifest | null = null;
  let vectors: Vectors | null = null;
  let extractor: Extractor | null = null;
  let keywordPromise: Promise<MiniSearch> | null = null;
  let vectorPromise: Promise<Vectors | null> | null = null;
  let modelPromise: Promise<Extractor | null> | null = null;
  let status: Status = { keyword: 'idle', semantic: 'idle', progress: 0 };
  const listeners = new Set<(s: Status) => void>();
  const queryCache = new Map<string, Float32Array>();

  const update = (patch: Partial<Status>) => {
    status = { ...status, ...patch };
    listeners.forEach((listener) => listener(status));
  };

  function loadKeyword(): Promise<MiniSearch> {
    if (!keywordPromise) {
      update({ keyword: 'loading' });
      keywordPromise = (async () => {
        const response = await fetch(`${root}manifest.json`);
        if (!response.ok) throw new Error('search index missing');
        manifest = (await response.json()) as Manifest;
        const json = await (await fetch(`${root}index.json?v=${manifest.version}`)).text();
        mini = MiniSearch.loadJSON(json, { ...MINISEARCH_OPTIONS, fields: SEARCH_FIELDS, storeFields: STORE_FIELDS });
        update({ keyword: 'ready' });
        return mini;
      })().catch((err) => {
        keywordPromise = null;
        update({ keyword: 'error' });
        throw err;
      });
    }
    return keywordPromise;
  }

  function loadVectors(): Promise<Vectors | null> {
    if (!vectorPromise) {
      vectorPromise = (async () => {
        await loadKeyword();
        if (!manifest?.semantic) {
          update({ semantic: 'unavailable' });
          return null;
        }
        const [vec, sc] = await Promise.all([
          fetch(`${root}vectors.bin?v=${manifest.version}`).then((r) => r.arrayBuffer()),
          fetch(`${root}scales.bin?v=${manifest.version}`).then((r) => r.arrayBuffer()),
        ]);
        vectors = { data: new Int8Array(vec), scales: new Float32Array(sc), dims: manifest.semantic.dims };
        return vectors;
      })().catch(() => {
        vectorPromise = null;
        return null;
      });
    }
    return vectorPromise;
  }

  function loadModel(): Promise<Extractor | null> {
    if (!modelPromise) {
      modelPromise = (async () => {
        const loaded = await loadVectors();
        if (!loaded || !manifest?.semantic) return null;
        update({ semantic: 'loading', progress: 0 });
        const runtime = (await import(/* @vite-ignore */ `${root}runtime/transformers.min.js`)) as {
          env: Record<string, any>;
          pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<Extractor>;
        };
        const { env, pipeline } = runtime;
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = `${root}models/`;
        const runtimeBase = new URL(`${root}runtime/`, window.location.href).href;
        env.backends.onnx.wasm.wasmPaths = {
          mjs: `${runtimeBase}ort-wasm-simd-threaded.mjs`,
          wasm: `${runtimeBase}ort-wasm-simd-threaded.wasm`,
        };
        env.backends.onnx.wasm.numThreads = 1;
        const files = new Map<string, [number, number]>();
        extractor = await pipeline('feature-extraction', manifest.semantic.model, {
          dtype: manifest.semantic.dtype,
          device: 'wasm',
          progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
            if (p.status === 'progress' && p.file && p.total) {
              files.set(p.file, [p.loaded ?? 0, p.total]);
              let loadedBytes = 0;
              let total = 0;
              files.forEach(([l, t]) => {
                loadedBytes += l;
                total += t;
              });
              update({ progress: Math.round((loadedBytes / total) * 100) });
            }
          },
        });
        update({ semantic: 'ready', progress: 100 });
        return extractor;
      })().catch(() => {
        modelPromise = null;
        update({ semantic: 'error' });
        return null;
      });
    }
    return modelPromise;
  }

  async function embedQuery(text: string): Promise<Float32Array | null> {
    if (!extractor) return null;
    const cached = queryCache.get(text);
    if (cached) return cached;
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    const copy = Float32Array.from(out.data);
    queryCache.set(text, copy);
    if (queryCache.size > 40) queryCache.delete(queryCache.keys().next().value as string);
    return copy;
  }

  function rankByVector(query: ArrayLike<number>, limit: number, skip = -1): [number, number][] {
    if (!vectors) return [];
    const { data, scales, dims } = vectors;
    const scored: [number, number][] = [];
    for (let i = 0; i < scales.length; i++) {
      if (i === skip) continue;
      let dot = 0;
      const offset = i * dims;
      for (let k = 0; k < dims; k++) dot += data[offset + k] * query[k];
      scored.push([i, dot * scales[i]]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return scored.slice(0, limit);
  }

  function vectorOf(id: number): Float32Array | null {
    if (!vectors) return null;
    const { data, scales, dims } = vectors;
    const out = new Float32Array(dims);
    for (let k = 0; k < dims; k++) out[k] = data[id * dims + k] * scales[id];
    return out;
  }

  function finish(fused: Map<number, { score: number; terms: Set<string>; keyword: boolean; meaning: boolean }>, kind: Kind, limit: number, minScore = 0): Hit[] {
    const index = mini!;
    const hits: Hit[] = [];
    for (const [id, info] of fused) {
      const doc = index.getStoredFields(id) as unknown as StoredDoc | undefined;
      if (!doc || (kind !== 'all' && doc.kind !== kind)) continue;
      const match: Match = info.keyword && info.meaning ? 'both' : info.meaning ? 'meaning' : 'keyword';
      hits.push({ id, ...doc, terms: [...info.terms], match, score: info.score });
    }
    hits.sort((a, b) => b.score - a.score);
    const top = hits[0]?.score || 1;
    const perPage = new Map<string, number>();
    const spread: Hit[] = [];
    for (const hit of hits) {
      const page = hit.url.split('#')[0];
      const used = perPage.get(page) ?? 0;
      if (used >= MAX_PER_PAGE) continue;
      perPage.set(page, used + 1);
      hit.score = hit.score / top;
      if (hit.score >= minScore) spread.push(hit);
    }
    return spread.slice(0, limit);
  }

  async function search(raw: string, kind: Kind = 'all', limit = 30): Promise<Hit[]> {
    const index = await loadKeyword();
    const text = raw.trim();
    if (!text) return [];
    const fused = new Map<number, { score: number; terms: Set<string>; keyword: boolean; meaning: boolean }>();
    const add = (id: number, rank: number, weight: number, source: 'keyword' | 'meaning', terms: string[] = []) => {
      const current = fused.get(id) ?? { score: 0, terms: new Set<string>(), keyword: false, meaning: false };
      current.score += weight / (RRF_K + rank);
      terms.forEach((t) => current.terms.add(t));
      current[source] = true;
      fused.set(id, current);
    };

    const options = {
      boost: BOOST,
      prefix: (term: string) => term.length > 2,
      fuzzy: (term: string) => (term.length > 4 ? 0.2 : false),
    };
    const exact = index.search(text, { ...options, combineWith: 'AND' });
    const loose = index.search(text, { ...options, combineWith: 'OR' });
    const synonyms = expand(text);
    const related = synonyms ? index.search(synonyms, { ...options, fuzzy: false, combineWith: 'OR' }) : [];
    exact.slice(0, 80).forEach((r, i) => add(r.id, i, 1.4, 'keyword', r.terms));
    loose.slice(0, 120).forEach((r, i) => add(r.id, i, 1, 'keyword', r.terms));
    related.slice(0, 80).forEach((r, i) => add(r.id, i, 0.5, 'keyword', r.terms));

    const lower = text.toLowerCase();
    for (const r of loose.slice(0, 200)) {
      const doc = index.getStoredFields(r.id) as unknown as StoredDoc;
      if (doc.title.toLowerCase().includes(lower) || doc.section.toLowerCase().includes(lower)) add(r.id, 0, 0.8, 'keyword');
    }

    if (vectors && extractor) {
      const query = await embedQuery(text);
      if (query) rankByVector(query, 60).filter(([, s]) => s > MIN_SIMILARITY).forEach(([id], i) => add(id, i, 1.1, 'meaning'));
    }
    return finish(fused, kind, limit);
  }

  async function similar(id: number, kind: Kind = 'all', limit = 12): Promise<Hit[]> {
    const index = await loadKeyword();
    await loadVectors();
    const fused = new Map<number, { score: number; terms: Set<string>; keyword: boolean; meaning: boolean }>();
    const source = index.getStoredFields(id) as unknown as StoredDoc | undefined;
    if (!source) return [];
    const pageOfSource = source.url.split('#')[0];
    const vec = vectorOf(id);
    if (vec) {
      rankByVector(vec, 60, id)
        .filter(([, s]) => s > SIMILAR_MIN)
        .forEach(([other, score]) => {
          const doc = index.getStoredFields(other) as unknown as StoredDoc | undefined;
          if (!doc || doc.url.split('#')[0] === pageOfSource) return;
          fused.set(other, { score, terms: new Set(), keyword: false, meaning: true });
        });
    } else {
      const query = `${source.title} ${source.section}`;
      index.search(query, { boost: BOOST, prefix: true, combineWith: 'OR' }).forEach((r, i) => {
        const doc = index.getStoredFields(r.id) as unknown as StoredDoc | undefined;
        if (!doc || doc.url.split('#')[0] === pageOfSource) return;
        fused.set(r.id, { score: 1 / (RRF_K + i), terms: new Set(r.terms), keyword: true, meaning: false });
      });
    }
    return finish(fused, kind, limit);
  }

  return {
    search,
    similar,
    loadKeyword,
    loadVectors,
    loadModel,
    status: () => status,
    subscribe(listener: (s: Status) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
