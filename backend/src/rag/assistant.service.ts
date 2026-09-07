import { getKnowledgeBase } from './knowledge.js';
import { Bm25Index, tokenize, expandQueryTokens, type IndexedDoc } from './retrieval.js';

export interface AssistantSource {
  label: string;
  sublabel?: string;
  url: string;
}

export interface AssistantResponse {
  matched: boolean;
  answer: string; // markdown-lite (supports **bold**, "- " and "N." bullets)
  sources: AssistantSource[];
  suggestions?: { label: string; url: string }[];
}

type DocRef =
  | { kind: 'category'; id: number }
  | { kind: 'failure_type'; id: number }
  | { kind: 'root_cause'; id: number };

type Intent = 'causes' | 'steps' | 'checks' | 'overview';

function detectIntent(raw: string): Intent {
  const q = raw.toLowerCase();
  if (/\b(check|checks|verify|verifi|inspect|control|confirm)\b/.test(q)) return 'checks';
  if (/\b(fix|repair|solve|solution|correct|action|remedy|how\s+do|how\s+to|step|steps|procedure)\b/.test(q))
    return 'steps';
  if (/\b(cause|causes|reason|reasons|why|root)\b/.test(q)) return 'causes';
  return 'overview';
}

const isListy = (raw: string) =>
  /\b(list|all|every|types|kinds|categor|defects|overview|which)\b/.test(raw.toLowerCase());

// Cap how much detail we inline so a chat answer stays digestible.
const MAX_ROOT_CAUSES = 3;
const MAX_ITEMS = 4;

function bulletize(items: string[], max = MAX_ITEMS): string {
  const shown = items.slice(0, max).map((s) => `- ${s}`);
  if (items.length > max) shown.push(`- …and ${items.length - max} more`);
  return shown.join('\n');
}

export async function ask(question: string): Promise<AssistantResponse> {
  const kb = await getKnowledgeBase();
  const raw = question.trim();

  // Build a single BM25 index across the whole active knowledge tree.
  const docs: IndexedDoc<DocRef>[] = [
    ...kb.categories.map((c) => ({ ref: { kind: 'category', id: c.categoryId } as DocRef, tokens: tokenize(c.text) })),
    ...kb.failureTypes.map((f) => ({ ref: { kind: 'failure_type', id: f.failureTypeId } as DocRef, tokens: tokenize(f.text) })),
    ...kb.rootCauses.map((r) => ({ ref: { kind: 'root_cause', id: r.rootCauseId } as DocRef, tokens: tokenize(r.text) })),
  ];
  const index = new Bm25Index(docs);

  const queryTokens = expandQueryTokens(tokenize(raw));
  const results = index.search(queryTokens);

  const catScore = new Map<number, number>();
  const ftScore = new Map<number, number>();
  const rcScore = new Map<number, number>();
  for (const { ref, score } of results) {
    if (ref.kind === 'category') catScore.set(ref.id, score);
    else if (ref.kind === 'failure_type') ftScore.set(ref.id, score);
    else rcScore.set(ref.id, score);
  }

  // Aggregate a failure-type score from its own match + its best root cause.
  let bestFtId = -1;
  let bestFtAgg = 0;
  for (const ft of kb.failureTypes) {
    const childBest = kb.rootCauses
      .filter((r) => r.failureTypeId === ft.failureTypeId)
      .reduce((m, r) => Math.max(m, rcScore.get(r.rootCauseId) ?? 0), 0);
    const agg = (ftScore.get(ft.failureTypeId) ?? 0) + childBest;
    if (agg > bestFtAgg) {
      bestFtAgg = agg;
      bestFtId = ft.failureTypeId;
    }
  }

  let bestCatId = -1;
  let bestCatScore = 0;
  for (const [id, score] of catScore) {
    if (score > bestCatScore) {
      bestCatScore = score;
      bestCatId = id;
    }
  }

  // Nothing matched at all → guide the user with what the platform covers.
  if (bestFtAgg === 0 && bestCatScore === 0) {
    return noMatch(kb);
  }

  // Route to a category overview when the query is list-y or only a category
  // matched — but only if that category actually has failure types to show.
  const useCategory =
    bestCatScore > 0 && (bestFtAgg === 0 || (isListy(raw) && bestCatScore >= bestFtAgg));
  if (useCategory && kb.failureTypes.some((f) => f.categoryId === bestCatId)) {
    return categoryOverview(kb, bestCatId);
  }

  if (bestFtId !== -1 && bestFtAgg > 0) {
    return failureTypeAnswer(kb, bestFtId, rcScore, detectIntent(raw));
  }

  return noMatch(kb);
}

function noMatch(kb: Awaited<ReturnType<typeof getKnowledgeBase>>): AssistantResponse {
  const suggestions = kb.failureTypes.slice(0, 6).map((f) => ({
    label: f.name,
    url: `/failure-types/${f.failureTypeId}`,
  }));
  const cats = kb.categories.map((c) => c.name).join(', ');
  // Use real failure-type names as examples so guidance always matches the data.
  const examples = kb.failureTypes.slice(0, 2).map((f) => `*"${f.name}"*`);
  const exampleLine = examples.length
    ? `\n\nTry naming a specific defect, for example ${examples.join(' or ')}.`
    : '';
  return {
    matched: false,
    answer:
      "I couldn't find anything matching that in the defect library. I can answer questions grounded in the documented failure types and their root causes" +
      (cats ? ` across **${cats}**.` : '.') +
      exampleLine,
    sources: [],
    suggestions,
  };
}

function categoryOverview(
  kb: Awaited<ReturnType<typeof getKnowledgeBase>>,
  categoryId: number,
): AssistantResponse {
  const cat = kb.categories.find((c) => c.categoryId === categoryId)!;
  const fts = kb.failureTypes.filter((f) => f.categoryId === categoryId);
  const list = fts
    .map((f) => `- **${f.name}** — ${f.rootCauseCount} documented root cause(s)`)
    .join('\n');
  return {
    matched: true,
    answer:
      `**${cat.name}** covers ${fts.length} failure type${fts.length === 1 ? '' : 's'}:\n\n` +
      `${list}\n\nOpen any of them to see the root causes, steps and OK/NG references.`,
    sources: [{ label: cat.name, sublabel: 'Category', url: `/categories/${categoryId}` }],
    suggestions: fts.map((f) => ({ label: f.name, url: `/failure-types/${f.failureTypeId}` })),
  };
}

function failureTypeAnswer(
  kb: Awaited<ReturnType<typeof getKnowledgeBase>>,
  failureTypeId: number,
  rcScore: Map<number, number>,
  intent: Intent,
): AssistantResponse {
  const ft = kb.failureTypes.find((f) => f.failureTypeId === failureTypeId)!;
  const rootCauses = kb.rootCauses
    .filter((r) => r.failureTypeId === failureTypeId)
    .sort((a, b) => {
      const s = (rcScore.get(b.rootCauseId) ?? 0) - (rcScore.get(a.rootCauseId) ?? 0);
      return s !== 0 ? s : a.rank - b.rank;
    });

  if (rootCauses.length === 0) {
    return {
      matched: true,
      answer:
        `**${ft.name}** (${ft.categoryName}) is documented, but it has no root causes recorded yet.`,
      sources: [{ label: ft.name, sublabel: ft.categoryName, url: `/failure-types/${failureTypeId}` }],
    };
  }

  const lead =
    intent === 'checks'
      ? `Here are the checks to perform for **${ft.name}** (${ft.categoryName}):`
      : intent === 'steps'
        ? `Here's how to address **${ft.name}** (${ft.categoryName}), by root cause:`
        : intent === 'causes'
          ? `**${ft.name}** (${ft.categoryName}) has ${rootCauses.length} documented root cause${rootCauses.length === 1 ? '' : 's'}:`
          : `For **${ft.name}** (${ft.categoryName}), the platform documents ${rootCauses.length} root cause${rootCauses.length === 1 ? '' : 's'}. The most relevant:`;

  const blocks: string[] = [];
  const shown = rootCauses.slice(0, MAX_ROOT_CAUSES);
  shown.forEach((rc, i) => {
    const parts: string[] = [`**${i + 1}. ${rc.title}**`];
    if (rc.description) parts.push(rc.description);

    if ((intent === 'steps' || intent === 'overview') && rc.steps.length) {
      parts.push(`Steps to follow:\n${bulletize(rc.steps)}`);
    }
    if ((intent === 'checks' || intent === 'overview') && rc.checks.length) {
      parts.push(`Checks to do:\n${bulletize(rc.checks)}`);
    }
    if (intent === 'checks' && !rc.checks.length && rc.steps.length) {
      // Asked for checks but this cause only has steps — still be useful.
      parts.push(`Steps to follow:\n${bulletize(rc.steps)}`);
    }
    blocks.push(parts.join('\n'));
  });

  let answer = `${lead}\n\n${blocks.join('\n\n')}`;
  if (rootCauses.length > shown.length) {
    answer += `\n\n…and ${rootCauses.length - shown.length} more root cause${
      rootCauses.length - shown.length === 1 ? '' : 's'
    }. Open the failure type to see them all with OK/NG photos.`;
  }

  return {
    matched: true,
    answer,
    sources: [
      { label: ft.name, sublabel: `${ft.categoryName} · ${rootCauses.length} root causes`, url: `/failure-types/${failureTypeId}` },
    ],
  };
}

// Lightweight status for the UI / health checks.
export async function assistantStatus() {
  const kb = await getKnowledgeBase();
  return {
    mode: 'local-search' as const,
    ready: kb.rootCauses.length > 0 || kb.failureTypes.length > 0,
    indexed: {
      categories: kb.categories.length,
      failureTypes: kb.failureTypes.length,
      rootCauses: kb.rootCauses.length,
    },
  };
}
