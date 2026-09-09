/**
 * Browser-side version of the RAG assistant used by the static build.
 *
 * Mirrors backend/src/rag/assistant.service.ts, but retrieves over the bundled
 * knowledge.json instead of the database. No network, no model, no API keys.
 */
import { Bm25Index, tokenize, expandQueryTokens, type IndexedDoc } from './retrieval.js';
import type { AssistantResponse } from '../types.js';
import knowledge from '../data/knowledge.json';

type Intent = 'causes' | 'steps' | 'checks' | 'overview';

type DocRef =
  | { kind: 'category'; id: number }
  | { kind: 'failure_type'; id: number }
  | { kind: 'root_cause'; id: number };

const categories = knowledge.categories;
const failureTypes = knowledge.failureTypes;
const rootCauses = knowledge.rootCauses;

const stepsOf = (rcId: number) =>
  rootCauses.find((r) => r.id === rcId)?.steps.filter((s) => s.type === 'step').map((s) => s.instruction) ?? [];
const checksOf = (rcId: number) =>
  rootCauses.find((r) => r.id === rcId)?.steps.filter((s) => s.type === 'check').map((s) => s.instruction) ?? [];

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

const MAX_ROOT_CAUSES = 3;
const MAX_ITEMS = 4;

function bulletize(items: string[], max = MAX_ITEMS): string {
  const shown = items.slice(0, max).map((s) => `- ${s}`);
  if (items.length > max) shown.push(`- …and ${items.length - max} more`);
  return shown.join('\n');
}

// Build the retrieval index once at module load.
const docs: IndexedDoc<DocRef>[] = [
  ...categories.map((c) => ({
    ref: { kind: 'category', id: c.id } as DocRef,
    tokens: tokenize([c.name, c.description ?? '', ...failureTypes.filter((f) => f.categoryId === c.id).map((f) => f.name)].join(' \n ')),
  })),
  ...failureTypes.map((f) => ({
    ref: { kind: 'failure_type', id: f.id } as DocRef,
    tokens: tokenize([f.name, f.name, f.categoryName ?? '', f.description ?? ''].join(' \n ')),
  })),
  ...rootCauses.map((r) => {
    const ft = failureTypes.find((f) => f.id === r.failureTypeId);
    return {
      ref: { kind: 'root_cause', id: r.id } as DocRef,
      tokens: tokenize(
        [
          r.title,
          ft?.name ?? '',
          ft?.categoryName ?? '',
          r.description ?? '',
          ...r.steps.map((s) => s.instruction),
          ...r.media.map((m) => m.caption ?? ''),
        ].join(' \n '),
      ),
    };
  }),
];
const index = new Bm25Index(docs);

export function ask(question: string): AssistantResponse {
  const raw = question.trim();
  const results = index.search(expandQueryTokens(tokenize(raw)));

  const catScore = new Map<number, number>();
  const ftScore = new Map<number, number>();
  const rcScore = new Map<number, number>();
  for (const { ref, score } of results) {
    if (ref.kind === 'category') catScore.set(ref.id, score);
    else if (ref.kind === 'failure_type') ftScore.set(ref.id, score);
    else rcScore.set(ref.id, score);
  }

  let bestFtId = -1;
  let bestFtAgg = 0;
  for (const ft of failureTypes) {
    const childBest = rootCauses
      .filter((r) => r.failureTypeId === ft.id)
      .reduce((m, r) => Math.max(m, rcScore.get(r.id) ?? 0), 0);
    const agg = (ftScore.get(ft.id) ?? 0) + childBest;
    if (agg > bestFtAgg) {
      bestFtAgg = agg;
      bestFtId = ft.id;
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

  if (bestFtAgg === 0 && bestCatScore === 0) return noMatch();

  const useCategory =
    bestCatScore > 0 && (bestFtAgg === 0 || (isListy(raw) && bestCatScore >= bestFtAgg));
  if (useCategory && failureTypes.some((f) => f.categoryId === bestCatId)) {
    return categoryOverview(bestCatId);
  }

  if (bestFtId !== -1 && bestFtAgg > 0) {
    return failureTypeAnswer(bestFtId, rcScore, detectIntent(raw));
  }
  return noMatch();
}

function noMatch(): AssistantResponse {
  const suggestions = failureTypes.slice(0, 6).map((f) => ({
    label: f.name,
    url: `/failure-types/${f.id}`,
  }));
  const cats = categories.map((c) => c.name).join(', ');
  const examples = failureTypes.slice(0, 2).map((f) => `*"${f.name}"*`);
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

function categoryOverview(categoryId: number): AssistantResponse {
  const cat = categories.find((c) => c.id === categoryId)!;
  const fts = failureTypes.filter((f) => f.categoryId === categoryId);
  const list = fts
    .map((f) => `- **${f.name}** — ${f.rootCauseCount} documented root cause(s)`)
    .join('\n');
  return {
    matched: true,
    answer:
      `**${cat.name}** covers ${fts.length} failure type${fts.length === 1 ? '' : 's'}:\n\n` +
      `${list}\n\nOpen any of them to see the root causes, steps and OK/NG references.`,
    sources: [{ label: cat.name, sublabel: 'Category', url: `/categories/${categoryId}` }],
    suggestions: fts.map((f) => ({ label: f.name, url: `/failure-types/${f.id}` })),
  };
}

function failureTypeAnswer(
  failureTypeId: number,
  rcScore: Map<number, number>,
  intent: Intent,
): AssistantResponse {
  const ft = failureTypes.find((f) => f.id === failureTypeId)!;
  const list = rootCauses
    .filter((r) => r.failureTypeId === failureTypeId)
    .sort((a, b) => {
      const s = (rcScore.get(b.id) ?? 0) - (rcScore.get(a.id) ?? 0);
      return s !== 0 ? s : a.rank - b.rank;
    });

  if (list.length === 0) {
    return {
      matched: true,
      answer: `**${ft.name}** (${ft.categoryName}) is documented, but it has no root causes recorded yet.`,
      sources: [
        { label: ft.name, sublabel: ft.categoryName ?? undefined, url: `/failure-types/${failureTypeId}` },
      ],
    };
  }

  const lead =
    intent === 'checks'
      ? `Here are the checks to perform for **${ft.name}** (${ft.categoryName}):`
      : intent === 'steps'
        ? `Here's how to address **${ft.name}** (${ft.categoryName}), by root cause:`
        : intent === 'causes'
          ? `**${ft.name}** (${ft.categoryName}) has ${list.length} documented root cause${list.length === 1 ? '' : 's'}:`
          : `For **${ft.name}** (${ft.categoryName}), the platform documents ${list.length} root cause${list.length === 1 ? '' : 's'}. The most relevant:`;

  const blocks: string[] = [];
  const shown = list.slice(0, MAX_ROOT_CAUSES);
  shown.forEach((rc, i) => {
    const parts: string[] = [`**${i + 1}. ${rc.title}**`];
    if (rc.description) parts.push(rc.description);
    const steps = stepsOf(rc.id);
    const checks = checksOf(rc.id);
    if ((intent === 'steps' || intent === 'overview') && steps.length) {
      parts.push(`Steps to follow:\n${bulletize(steps)}`);
    }
    if ((intent === 'checks' || intent === 'overview') && checks.length) {
      parts.push(`Checks to do:\n${bulletize(checks)}`);
    }
    if (intent === 'checks' && !checks.length && steps.length) {
      parts.push(`Steps to follow:\n${bulletize(steps)}`);
    }
    blocks.push(parts.join('\n'));
  });

  let answer = `${lead}\n\n${blocks.join('\n\n')}`;
  if (list.length > shown.length) {
    const rest = list.length - shown.length;
    answer += `\n\n…and ${rest} more root cause${rest === 1 ? '' : 's'}. Open the failure type to see them all with OK/NG photos.`;
  }

  return {
    matched: true,
    answer,
    sources: [
      {
        label: ft.name,
        sublabel: `${ft.categoryName} · ${list.length} root causes`,
        url: `/failure-types/${failureTypeId}`,
      },
    ],
  };
}
