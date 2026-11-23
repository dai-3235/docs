import MiniSearch from 'minisearch';
import { BOOST, MINISEARCH_OPTIONS, SEARCH_FIELDS, STORE_FIELDS } from './config.mjs';
import { expand } from './synonyms';

export type Kind = 'all' | 'doc' | 'blog';

export interface Hit {
  id: number;
  url: string;
  title: string;
  section: string;
  crumbs: string;
  kind: 'doc' | 'blog';
  snippet: string;
  terms: string[];
  semantic: boolean;
  keyword: boolean;
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

interface Semantic {
  extractor: (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array }>;
  vectors: Int8Array;
  scales: Float32Array;
  dims: number;
}

const RRF_K = 50;
const MIN_SIMILARITY = 0.22;
const MAX_PER_PAGE = 2;

export function createEngine(base: string) {
  const root = `${base}/search/`;
  let mini: MiniSearch | null = null;
  let manifest: Manifest | null = null;
  let semantic: Semantic | null = null;
  let keywordPromise: Promise<MiniSearch> | null = null;
  let semanticPromise: Promise<Semantic | null> | null = null;
  let status: Status = { keyword: 'idle', semantic: 'idle', progress: 0 };
  const listeners = new Set<(s: Status) => void>();

  const update = (patch: Partial<Status>) => {
    status = { ...status, ...patch };
    listeners.forEach((listener) => listener(status));
  };

  function loadKeyword(): Promise<MiniSearch> {
    if (!keywordPromise) {
      update({ keyword: 'loading' });
      keywordPromise = (async () => {
        const manifestResponse = await fetch(`${root}manifest.json`);
        if (!manifestResponse.ok) throw new Error('search index missing');
        manifest = (await manifestResponse.json()) as Manifest;
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

  function loadSemantic(): Promise<Semantic | null> {
    if (!semanticPromise) {
      semanticPromise = (async () => {
        await loadKeyword();
        if (!manifest?.semantic) {
          update({ semantic: 'unavailable' });
          return null;
        }
        update({ semantic: 'loading', progress: 0 });
        const runtime = (await import(/* @vite-ignore */ `${root}runtime/transformers.min.js`)) as {
          env: Record<string, any>;
          pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<Semantic['extractor']>;
        };
        const { env, pipeline } = runtime;
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = `${root}models/`;
        env.backends.onnx.wasm.wasmPaths = new URL(`${root}runtime/`, window.location.href).href;
        env.backends.onnx.wasm.numThreads = 1;
        const files = new Map<string, [number, number]>();
        const extractor = await pipeline('feature-extraction', manifest.semantic.model, {
          dtype: manifest.semantic.dtype,
          device: 'wasm',
          progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
            if (p.status === 'progress' && p.file && p.total) {
              files.set(p.file, [p.loaded ?? 0, p.total]);
              let loaded = 0;
              let total = 0;
              files.forEach(([l, t]) => {
                loaded += l;
                total += t;
              });
              update({ progress: Math.round((loaded / total) * 100) });
            }
          },
        });
        const [vec, sc] = await Promise.all([
          fetch(`${root}vectors.bin?v=${manifest.version}`).then((r) => r.arrayBuffer()),
          fetch(`${root}scales.bin?v=${manifest.version}`).then((r) => r.arrayBuffer()),
        ]);
        semantic = { extractor, vectors: new Int8Array(vec), scales: new Float32Array(sc), dims: manifest.semantic.dims };
        update({ semantic: 'ready', progress: 100 });
        return semantic;
      })().catch(() => {
        semanticPromise = null;
        update({ semantic: 'error' });
        return null;
      });
    }
    return semanticPromise;
  }

  async function semanticRanks(text: string, limit: number): Promise<number[]> {
    if (!semantic) return [];
    const out = await semantic.extractor(text, { pooling: 'mean', normalize: true });
    const query = out.data;
    const { vectors, scales, dims } = semantic;
    const scored: [number, number][] = [];
    for (let i = 0; i < scales.length; i++) {
      let dot = 0;
      const offset = i * dims;
      for (let k = 0; k < dims; k++) dot += vectors[offset + k] * query[k];
      scored.push([i, dot * scales[i]]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return scored.filter(([, score]) => score > MIN_SIMILARITY).slice(0, limit).map(([id]) => id);
  }

  async function search(raw: string, kind: Kind = 'all', limit = 30): Promise<Hit[]> {
    const index = await loadKeyword();
    const text = raw.trim();
    if (!text) return [];
    const fused = new Map<number, { score: number; terms: Set<string>; semantic: boolean; keyword: boolean }>();
    const add = (id: number, rank: number, weight: number, source: 'keyword' | 'semantic', terms: string[] = []) => {
      const current = fused.get(id) ?? { score: 0, terms: new Set<string>(), semantic: false, keyword: false };
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

    if (semantic) {
      (await semanticRanks(text, 60)).forEach((id, i) => add(id, i, 1.1, 'semantic'));
    }

    const hits: Hit[] = [];
    for (const [id, info] of fused) {
      const doc = index.getStoredFields(id) as unknown as Omit<Hit, 'id' | 'terms' | 'semantic' | 'keyword'>;
      if (!doc || (kind !== 'all' && doc.kind !== kind)) continue;
      hits.push({ id, ...doc, terms: [...info.terms], semantic: info.semantic, keyword: info.keyword, score: info.score } as Hit & { score: number });
    }
    hits.sort((a, b) => (b as any).score - (a as any).score);
    const perPage = new Map<string, number>();
    const spread: Hit[] = [];
    for (const hit of hits) {
      const page = hit.url.split('#')[0];
      const used = perPage.get(page) ?? 0;
      if (used >= MAX_PER_PAGE) continue;
      perPage.set(page, used + 1);
      spread.push(hit);
    }
    return spread.slice(0, limit);
  }

  return {
    search,
    loadKeyword,
    loadSemantic,
    status: () => status,
    subscribe(listener: (s: Status) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
