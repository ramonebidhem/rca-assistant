import { prisma } from '../lib/prisma.js';

export async function getDashboardCounters() {
  const [categories, failureTypes, rootCauses, pendingSuggestions] = await Promise.all([
    prisma.category.count(),
    prisma.failureType.count(),
    prisma.rootCause.count(),
    prisma.suggestion.count({ where: { status: 'pending' } }),
  ]);
  return { categories, failureTypes, rootCauses, pendingSuggestions };
}
