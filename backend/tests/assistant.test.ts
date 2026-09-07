import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import * as categories from '../src/services/categories.service.js';
import * as failureTypes from '../src/services/failureTypes.service.js';
import * as rootCauses from '../src/services/rootCauses.service.js';
import { ask } from '../src/rag/assistant.service.js';
import { invalidateKnowledgeBase } from '../src/rag/knowledge.js';

async function clean() {
  await prisma.media.deleteMany();
  await prisma.rootCauseStep.deleteMany();
  await prisma.rootCause.deleteMany();
  await prisma.suggestion.deleteMany();
  await prisma.failureType.deleteMany();
  await prisma.category.deleteMany();
  invalidateKnowledgeBase();
}

beforeAll(clean);
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});
beforeEach(clean);

async function seedCrimping() {
  const cat = await categories.createCategory({ name: 'Crimping' });
  const ft = await failureTypes.createFailureType({
    categoryId: cat.id,
    name: 'Strands out of the crimp',
  });
  await rootCauses.createRootCause({
    failureTypeId: ft.id,
    title: 'Swivel arm position not well defined',
    description: 'The swivel arm is misaligned, causing strands to fall outside the crimp.',
    steps: [
      { instruction: 'Reset the swivel arm to the reference mark.', type: 'step' },
      { instruction: 'Confirm all strands are inside the barrel.', type: 'check' },
    ],
  });
  invalidateKnowledgeBase();
  return { cat, ft };
}

describe('local RAG assistant', () => {
  it('answers a defect question from platform data with a source link', async () => {
    const { ft } = await seedCrimping();
    const res = await ask('how do I fix strands coming out of the crimp?');

    expect(res.matched).toBe(true);
    // The answer is grounded in the seeded root cause.
    expect(res.answer).toContain('Swivel arm position not well defined');
    // The source points at the correct failure type page.
    expect(res.sources[0]?.url).toBe(`/failure-types/${ft.id}`);
  });

  it('surfaces checks when asked about verification', async () => {
    await seedCrimping();
    const res = await ask('what should I check for strands out of the crimp?');
    expect(res.matched).toBe(true);
    expect(res.answer).toContain('Confirm all strands are inside the barrel');
  });

  it('returns an unmatched, guided response for unrelated questions', async () => {
    await seedCrimping();
    const res = await ask('what is the weather today?');
    expect(res.matched).toBe(false);
    expect(res.suggestions && res.suggestions.length).toBeGreaterThan(0);
  });

  it('only draws on active content', async () => {
    const { ft } = await seedCrimping();
    await failureTypes.setFailureTypeActive(ft.id, false);
    invalidateKnowledgeBase();
    const res = await ask('strands out of the crimp');
    // With the only failure type deactivated, there is nothing to match.
    expect(res.matched).toBe(false);
  });
});
