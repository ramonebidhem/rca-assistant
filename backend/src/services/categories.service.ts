import { prisma } from '../lib/prisma.js';
import { conflict, notFound } from '../lib/errors.js';
import { deleteImage } from '../lib/images.js';

export interface CategoryInput {
  name: string;
  description?: string | null;
  imagePath?: string | null;
}

// Viewer-facing: only active categories, with active failure-type counts.
export async function listActiveCategories() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { failureTypes: { where: { isActive: true } } } } },
  });
  return categories;
}

// Admin-facing: everything.
export async function listAllCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { failureTypes: true } } },
  });
}

export async function getCategory(id: number, activeOnly = false) {
  const category = await prisma.category.findFirst({
    where: activeOnly ? { id, isActive: true } : { id },
    include: { _count: { select: { failureTypes: true } } },
  });
  if (!category) throw notFound('Category not found');
  return category;
}

export async function createCategory(input: CategoryInput) {
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  return prisma.category.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      imagePath: input.imagePath ?? null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function updateCategory(id: number, input: Partial<CategoryInput> & { isActive?: boolean }) {
  await getCategory(id);
  // If a new image is provided, remove the old file.
  if (input.imagePath !== undefined) {
    const current = await prisma.category.findUnique({ where: { id } });
    if (current?.imagePath && current.imagePath !== input.imagePath) {
      await deleteImage(current.imagePath);
    }
  }
  return prisma.category.update({ where: { id }, data: input });
}

export async function setCategoryActive(id: number, isActive: boolean) {
  await getCategory(id);
  return prisma.category.update({ where: { id }, data: { isActive } });
}

// Hard delete is only permitted when the category has NO failure types.
export async function deleteCategory(id: number) {
  const count = await prisma.failureType.count({ where: { categoryId: id } });
  if (count > 0) {
    throw conflict(
      'Cannot delete a category that has failure types. Deactivate it instead.',
    );
  }
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw notFound('Category not found');
  await prisma.category.delete({ where: { id } });
  await deleteImage(category.imagePath);
}

// Swap sort order with the adjacent sibling in the given direction.
export async function reorderCategory(id: number, direction: 'up' | 'down') {
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) throw notFound('Category not found');
  const neighbour = await prisma.category.findFirst({
    where:
      direction === 'up'
        ? { sortOrder: { lt: current.sortOrder } }
        : { sortOrder: { gt: current.sortOrder } },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
  });
  if (!neighbour) return current; // already at the edge
  await prisma.$transaction([
    prisma.category.update({ where: { id: current.id }, data: { sortOrder: neighbour.sortOrder } }),
    prisma.category.update({ where: { id: neighbour.id }, data: { sortOrder: current.sortOrder } }),
  ]);
  return prisma.category.findUnique({ where: { id } });
}
