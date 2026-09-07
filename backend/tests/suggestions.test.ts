import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import * as categories from '../src/services/categories.service.js';
import * as failureTypes from '../src/services/failureTypes.service.js';
import * as suggestions from '../src/services/suggestions.service.js';

async function clean() {
  await prisma.media.deleteMany();
  await prisma.rootCauseStep.deleteMany();
  await prisma.rootCause.deleteMany();
  await prisma.suggestion.deleteMany();
  await prisma.failureType.deleteMany();
  await prisma.category.deleteMany();
}

beforeAll(clean);
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});
beforeEach(clean);

async function makeFailureType() {
  const cat = await categories.createCategory({ name: 'Crimping' });
  return failureTypes.createFailureType({ categoryId: cat.id, name: 'Strands out' });
}

describe('suggestion approval flow', () => {
  it('creates a suggestion in pending status', async () => {
    const ft = await makeFailureType();
    const s = await suggestions.createSuggestion({ failureTypeId: ft.id, text: 'New cause' });
    expect(s.status).toBe('pending');
    expect(s.reviewedAt).toBeNull();
  });

  it('approves a pending suggestion and stamps reviewedAt', async () => {
    const ft = await makeFailureType();
    const s = await suggestions.createSuggestion({ failureTypeId: ft.id, text: 'New cause' });

    const approved = await suggestions.approveSuggestion(s.id, 'Looks valid');
    expect(approved.status).toBe('approved');
    expect(approved.adminComment).toBe('Looks valid');
    expect(approved.reviewedAt).toBeInstanceOf(Date);

    // A second review is rejected.
    await expect(suggestions.approveSuggestion(s.id)).rejects.toMatchObject({ status: 400 });
  });

  it('requires a comment to reject', async () => {
    const ft = await makeFailureType();
    const s = await suggestions.createSuggestion({ failureTypeId: ft.id, text: 'Bad cause' });

    await expect(suggestions.rejectSuggestion(s.id, '   ')).rejects.toMatchObject({ status: 400 });

    const rejected = await suggestions.rejectSuggestion(s.id, 'Not a real root cause');
    expect(rejected.status).toBe('rejected');
    expect(rejected.adminComment).toBe('Not a real root cause');
  });

  it('only lists pending suggestions when filtered', async () => {
    const ft = await makeFailureType();
    const a = await suggestions.createSuggestion({ failureTypeId: ft.id, text: 'A' });
    await suggestions.createSuggestion({ failureTypeId: ft.id, text: 'B' });
    await suggestions.approveSuggestion(a.id);

    const pending = await suggestions.listSuggestions('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].text).toBe('B');
  });
});
