import { prisma } from '../lib/prisma.js';
import { conflict, notFound } from '../lib/errors.js';
import { deleteImage } from '../lib/images.js';

export interface FailureTypeInput {
  categoryId: number;
  name: string;
  description?: string | null;
  imagePath?: string | null;
}

// Viewer-facing: active failure types of an active category.
export async function listActiveByCategory(categoryId: number) {
  return prisma.failureType.findMany({
    where: { categoryId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      category: true,
      _count: { select: { rootCauses: { where: { isActive: true } } } },
    },
  });
}

export async function listAllByCategory(categoryId: number) {
  return prisma.failureType.findMany({
    where: { categoryId },
    orderBy: { sortOrder: 'asc' },
    include: { category: true, _count: { select: { rootCauses: true } } },
  });
}

export async function getFailureType(id: number, activeOnly = false) {
  const ft = await prisma.failureType.findFirst({
    where: activeOnly ? { id, isActive: true } : { id },
    include: { category: true, _count: { select: { rootCauses: true } } },
  });
  if (!ft) throw notFound('Failure type not found');
  return ft;
}

// Free-text search over failure-type names (active only) for the viewer search bar.
export async function searchFailureTypes(query: string) {
  const q = query.trim();
  if (!q) return [];
  return prisma.failureType.findMany({
    where: {
      isActive: true,
      category: { isActive: true },
      name: { contains: q, mode: 'insensitive' },
    },
    orderBy: { name: 'asc' },
    take: 10,
    include: { category: true },
  });
}

export async function createFailureType(input: FailureTypeInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw notFound('Parent category not found');
  const max = await prisma.failureType.aggregate({
    where: { categoryId: input.categoryId },
    _max: { sortOrder: true },
  });
  return prisma.failureType.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      imagePath: input.imagePath ?? null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
    include: { category: true },
  });
}

export async function updateFailureType(
  id: number,
  input: Partial<Omit<FailureTypeInput, 'categoryId'>> & { isActive?: boolean },
) {
  const current = await prisma.failureType.findUnique({ where: { id } });
  if (!current) throw notFound('Failure type not found');
  if (input.imagePath !== undefined && current.imagePath && current.imagePath !== input.imagePath) {
    await deleteImage(current.imagePath);
  }
  return prisma.failureType.update({ where: { id }, data: input, include: { category: true } });
}

export async function setFailureTypeActive(id: number, isActive: boolean) {
  await getFailureType(id);
  return prisma.failureType.update({ where: { id }, data: { isActive }, include: { category: true } });
}

export async function deleteFailureType(id: number) {
  const count = await prisma.rootCause.count({ where: { failureTypeId: id } });
  if (count > 0) {
    throw conflict(
      'Cannot delete a failure type that has root causes. Deactivate it instead.',
    );
  }
  const ft = await prisma.failureType.findUnique({ where: { id } });
  if (!ft) throw notFound('Failure type not found');
  await prisma.failureType.delete({ where: { id } });
  await deleteImage(ft.imagePath);
}

export async function reorderFailureType(id: number, direction: 'up' | 'down') {
  const current = await prisma.failureType.findUnique({ where: { id } });
  if (!current) throw notFound('Failure type not found');
  const neighbour = await prisma.failureType.findFirst({
    where: {
      categoryId: current.categoryId,
      sortOrder:
        direction === 'up' ? { lt: current.sortOrder } : { gt: current.sortOrder },
    },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
  });
  if (!neighbour) return current;
  await prisma.$transaction([
    prisma.failureType.update({ where: { id: current.id }, data: { sortOrder: neighbour.sortOrder } }),
    prisma.failureType.update({ where: { id: neighbour.id }, data: { sortOrder: current.sortOrder } }),
  ]);
  return prisma.failureType.findUnique({ where: { id }, include: { category: true } });
}
