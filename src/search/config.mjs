export const SEARCH_FIELDS = ['title', 'section', 'crumbs', 'text'];
export const STORE_FIELDS = ['url', 'title', 'section', 'crumbs', 'kind', 'snippet'];
export const BOOST = { title: 4, section: 3, crumbs: 1.2, text: 1 };

const STOP = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'which', 'with', 'do', 'does', 'can', 'my',
]);

export function processTerm(term) {
  const lower = term.toLowerCase();
  return lower.length === 0 || STOP.has(lower) ? null : lower;
}

export const MINISEARCH_OPTIONS = { idField: 'id', processTerm };
