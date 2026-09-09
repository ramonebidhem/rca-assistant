// Fully-local lexical retrieval (BM25). No model, no network, no dependencies.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was',
  'were', 'be', 'been', 'it', 'its', 'this', 'that', 'these', 'those', 'with', 'as',
  'at', 'by', 'from', 'how', 'what', 'why', 'when', 'which', 'who', 'do', 'does', 'did',
  'i', 'we', 'you', 'my', 'me', 'can', 'could', 'should', 'would', 'will', 'have', 'has',
  'get', 'got', 'there', 'about', 'into', 'out', 'if', 'so', 'not', 'no', 'any', 'some',
  'please', 'help', 'need', 'want', 'tell', 'show', 'give', 'me', 'they', 'them',
]);

// Domain synonym groups — each token expands to the whole group so that, e.g.,
// "crimping" also matches "crimp", and "wire" matches "strand".
const SYNONYM_GROUPS: string[][] = [
  ['crimp', 'crimping', 'crimped'],
  ['strand', 'strands', 'wire', 'wires', 'conductor'],
  ['seal', 'sealing', 'sealed', 'gasket'],
  ['strip', 'stripping', 'stripped'],
  ['insulation', 'insulator', 'sheath', 'jacket'],
  ['terminal', 'terminals', 'contact', 'pin'],
  ['applicator', 'applicators', 'tooling', 'die'],
  ['bellmouth', 'bell', 'mouth'],
  ['height', 'dimension', 'spec', 'specification', 'tolerance'],
  ['splay', 'splayed', 'spread', 'loose'],
  ['cut', 'cutting', 'nicked', 'nick', 'damaged', 'damage'],
  ['position', 'positioning', 'alignment', 'aligned', 'centered', 'center'],
  ['missing', 'absent', 'without'],
  ['cause', 'causes', 'reason', 'reasons', 'root'],
  ['fix', 'fixing', 'repair', 'solve', 'solution', 'correct', 'action', 'remedy'],
  ['check', 'checks', 'verify', 'inspect', 'inspection', 'control'],
  ['step', 'steps', 'procedure', 'instruction', 'instructions', 'process'],
];

const synonymIndex = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) synonymIndex.set(word, group);
}

// Light singularisation: trims a trailing "s" on longer words.
function singularise(word: string): string {
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens: string[] = [];
  for (const t of raw) {
    if (STOPWORDS.has(t) || t.length < 2) continue;
    tokens.push(t);
    const singular = singularise(t);
    if (singular !== t) tokens.push(singular);
  }
  return tokens;
}

// Synonyms broaden recall, but must never outweigh the words actually typed —
// otherwise "damaged seal" scores higher on "strands cut/nicked" (damaged→cut)
// than on "Seal damaged".
const SYNONYM_WEIGHT = 0.3;

// Map query tokens to weights: 1.0 for typed words, less for synonyms.
export function expandQueryTokens(tokens: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const t of tokens) {
    weights.set(t, 1);
    const group = synonymIndex.get(t) ?? synonymIndex.get(singularise(t));
    for (const g of group ?? []) {
      // Keep the higher weight if a word is both typed and a synonym.
      weights.set(g, Math.max(weights.get(g) ?? 0, SYNONYM_WEIGHT));
    }
  }
  return weights;
}

export interface IndexedDoc<T> {
  ref: T;
  tokens: string[];
}

// A BM25 index over an arbitrary set of documents.
export class Bm25Index<T> {
  private docs: IndexedDoc<T>[] = [];
  private tf: Map<string, number>[] = [];
  private df = new Map<string, number>();
  private avgdl = 0;
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  constructor(docs: IndexedDoc<T>[]) {
    this.docs = docs;
    let total = 0;
    for (const doc of docs) {
      const counts = new Map<string, number>();
      for (const tok of doc.tokens) counts.set(tok, (counts.get(tok) ?? 0) + 1);
      this.tf.push(counts);
      for (const tok of counts.keys()) this.df.set(tok, (this.df.get(tok) ?? 0) + 1);
      total += doc.tokens.length;
    }
    this.avgdl = docs.length ? total / docs.length : 0;
  }

  private idf(term: string): number {
    const n = this.docs.length;
    const df = this.df.get(term) ?? 0;
    if (df === 0) return 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  // Returns every doc with a positive score, ranked high → low.
  // `queryTerms` maps each term to a weight (see expandQueryTokens).
  search(queryTerms: Map<string, number>): { ref: T; score: number }[] {
    const results: { ref: T; score: number }[] = [];
    for (let i = 0; i < this.docs.length; i++) {
      const counts = this.tf[i];
      const dl = this.docs[i].tokens.length;
      let score = 0;
      for (const [term, weight] of queryTerms) {
        const f = counts.get(term);
        if (!f) continue;
        const idf = this.idf(term);
        const denom = f + this.k1 * (1 - this.b + (this.b * dl) / (this.avgdl || 1));
        score += weight * idf * ((f * (this.k1 + 1)) / denom);
      }
      if (score > 0) results.push({ ref: this.docs[i].ref, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}
