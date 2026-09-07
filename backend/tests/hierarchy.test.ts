import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import * as categories from '../src/services/categories.service.js';
import * as failureTypes from '../src/services/failureTypes.service.js';
import * as rootCauses from '../src/services/rootCauses.service.js';
import { AppError } from '../src/lib/errors.js';

// These tests require a reachable PostgreSQL database (see README).
// They exercise the strict-hierarchy business rules at the service layer.

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

describe('deactivation instead of deletion', () => {
  it('refuses to hard-delete a category that has failure types (409 conflict)', async () => {
    const cat = await categories.createCategory({ name: 'Crimping' });
    await failureTypes.createFailureType({ categoryId: cat.id, name: 'Strands out' });

    await expect(categories.deleteCategory(cat.id)).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<AppError>);

    // Deactivation is the supported alternative.
    const deactivated = await categories.setCategoryActive(cat.id, false);
    expect(deactivated.isActive).toBe(false);
    // The category still exists.
    expect(await prisma.category.count({ where: { id: cat.id } })).toBe(1);
  });

  it('refuses to hard-delete a failure type that has root causes', async () => {
    const cat = await categories.createCategory({ name: 'Crimping' });
    const ft = await failureTypes.createFailureType({ categoryId: cat.id, name: 'Strands out' });
    await rootCauses.createRootCause({ failureTypeId: ft.id, title: 'Swivel arm' });

    await expect(failureTypes.deleteFailureType(ft.id)).rejects.toMatchObject({ status: 409 });
  });

  it('allows hard-deleting a leaf category with no children', async () => {
    const cat = await categories.createCategory({ name: 'Empty' });
    await expect(categories.deleteCategory(cat.id)).resolves.toBeUndefined();
    expect(await prisma.category.count({ where: { id: cat.id } })).toBe(0);
  });
});

describe('filtered (active-only) viewer queries', () => {
  it('excludes inactive categories and counts only active children', async () => {
    const cat = await categories.createCategory({ name: 'Crimping' });
    const ftActive = await failureTypes.createFailureType({ categoryId: cat.id, name: 'A' });
    const ftInactive = await failureTypes.createFailureType({ categoryId: cat.id, name: 'B' });
    await failureTypes.setFailureTypeActive(ftInactive.id, false);

    const active = await categories.listActiveCategories();
    const found = active.find((c) => c.id === cat.id)!;
    expect(found).toBeTruthy();
    // Only the active failure type is counted.
    expect(found._count.failureTypes).toBe(1);

    // Deactivate the category → it disappears from the viewer list.
    await categories.setCategoryActive(cat.id, false);
    const afterDeactivate = await categories.listActiveCategories();
    expect(afterDeactivate.find((c) => c.id === cat.id)).toBeUndefined();

    // The viewer-facing failure-type list only returns active ones.
    await categories.setCategoryActive(cat.id, true);
    const visibleFts = await failureTypes.listActiveByCategory(cat.id);
    expect(visibleFts.map((f) => f.id)).toEqual([ftActive.id]);
  });

  it('search only returns active failure types under active categories', async () => {
    const cat = await categories.createCategory({ name: 'Crimping' });
    await failureTypes.createFailureType({ categoryId: cat.id, name: 'Strands out of the crimp' });
    const hidden = await failureTypes.createFailureType({ categoryId: cat.id, name: 'Strands hidden' });
    await failureTypes.setFailureTypeActive(hidden.id, false);

    const results = await failureTypes.searchFailureTypes('Strands');
    expect(results.map((r) => r.name)).toEqual(['Strands out of the crimp']);
  });
});
