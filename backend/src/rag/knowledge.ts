import { prisma } from '../lib/prisma.js';

// A single retrievable unit of platform knowledge.
export interface RootCauseDoc {
  kind: 'root_cause';
  rootCauseId: number;
  failureTypeId: number;
  categoryId: number;
  categoryName: string;
  failureTypeName: string;
  title: string;
  description: string;
  steps: string[];
  checks: string[];
  rank: number;
  text: string;
}

export interface FailureTypeDoc {
  kind: 'failure_type';
  failureTypeId: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  rootCauseCount: number;
  text: string;
}

export interface CategoryDoc {
  kind: 'category';
  categoryId: number;
  name: string;
  description: string;
  failureTypeNames: string[];
  text: string;
}

export interface KnowledgeBase {
  categories: CategoryDoc[];
  failureTypes: FailureTypeDoc[];
  rootCauses: RootCauseDoc[];
  builtAt: number;
}

const TTL_MS = Number(process.env.ASSISTANT_KB_TTL_MS ?? 20000);
let cache: KnowledgeBase | null = null;

// Build a flat, searchable knowledge base from the active content tree.
async function build(): Promise<KnowledgeBase> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      failureTypes: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          rootCauses: {
            where: { isActive: true },
            orderBy: { rank: 'asc' },
            include: { steps: { orderBy: { stepNo: 'asc' } }, media: true },
          },
        },
      },
    },
  });

  const categoryDocs: CategoryDoc[] = [];
  const failureTypeDocs: FailureTypeDoc[] = [];
  const rootCauseDocs: RootCauseDoc[] = [];

  for (const cat of categories) {
    const ftNames = cat.failureTypes.map((f) => f.name);
    categoryDocs.push({
      kind: 'category',
      categoryId: cat.id,
      name: cat.name,
      description: cat.description ?? '',
      failureTypeNames: ftNames,
      text: [cat.name, cat.description ?? '', ...ftNames].join(' \n '),
    });

    for (const ft of cat.failureTypes) {
      failureTypeDocs.push({
        kind: 'failure_type',
        failureTypeId: ft.id,
        categoryId: cat.id,
        categoryName: cat.name,
        name: ft.name,
        description: ft.description ?? '',
        rootCauseCount: ft.rootCauses.length,
        // Repeat the name so its terms carry weight, and include the category.
        text: [ft.name, ft.name, cat.name, ft.description ?? ''].join(' \n '),
      });

      for (const rc of ft.rootCauses) {
        const steps = rc.steps.filter((s) => s.type === 'step').map((s) => s.instruction);
        const checks = rc.steps.filter((s) => s.type === 'check').map((s) => s.instruction);
        const captions = rc.media.map((m) => m.caption ?? '').filter(Boolean);
        rootCauseDocs.push({
          kind: 'root_cause',
          rootCauseId: rc.id,
          failureTypeId: ft.id,
          categoryId: cat.id,
          categoryName: cat.name,
          failureTypeName: ft.name,
          title: rc.title,
          description: rc.description ?? '',
          steps,
          checks,
          rank: rc.rank,
          text: [
            rc.title,
            ft.name, // ties the root cause to its failure type terms
            cat.name,
            rc.description ?? '',
            ...steps,
            ...checks,
            ...captions,
          ].join(' \n '),
        });
      }
    }
  }

  return {
    categories: categoryDocs,
    failureTypes: failureTypeDocs,
    rootCauses: rootCauseDocs,
    builtAt: Date.now(),
  };
}

// Cached accessor — rebuilds when the TTL elapses. Small dataset, cheap to build.
export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (cache && Date.now() - cache.builtAt < TTL_MS) return cache;
  cache = await build();
  return cache;
}

// Force a rebuild on next access (e.g. after admin edits, if wired up).
export function invalidateKnowledgeBase(): void {
  cache = null;
}
