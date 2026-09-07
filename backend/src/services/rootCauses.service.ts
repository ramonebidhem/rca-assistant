import type { StepType, MediaKind } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { deleteImage } from '../lib/images.js';

export interface StepInput {
  instruction: string;
  type: StepType;
}

export interface RootCauseInput {
  failureTypeId: number;
  title: string;
  description?: string | null;
  steps?: StepInput[];
}

const fullInclude = {
  steps: { orderBy: { stepNo: 'asc' } },
  media: true,
} as const;

// Viewer-facing: active root causes of a failure type, ordered by rank,
// with steps and OK/NG media.
export async function listActiveByFailureType(failureTypeId: number) {
  return prisma.rootCause.findMany({
    where: { failureTypeId, isActive: true },
    orderBy: { rank: 'asc' },
    include: fullInclude,
  });
}

export async function listAllByFailureType(failureTypeId: number) {
  return prisma.rootCause.findMany({
    where: { failureTypeId },
    orderBy: { rank: 'asc' },
    include: fullInclude,
  });
}

export async function getRootCause(id: number, activeOnly = false) {
  const rc = await prisma.rootCause.findFirst({
    where: activeOnly ? { id, isActive: true } : { id },
    include: fullInclude,
  });
  if (!rc) throw notFound('Root cause not found');
  return rc;
}

function normalizeSteps(steps: StepInput[] = []) {
  return steps.map((s, idx) => ({
    stepNo: idx + 1,
    instruction: s.instruction,
    type: s.type,
  }));
}

export async function createRootCause(input: RootCauseInput) {
  const ft = await prisma.failureType.findUnique({ where: { id: input.failureTypeId } });
  if (!ft) throw notFound('Parent failure type not found');
  const max = await prisma.rootCause.aggregate({
    where: { failureTypeId: input.failureTypeId },
    _max: { rank: true },
  });
  return prisma.rootCause.create({
    data: {
      failureTypeId: input.failureTypeId,
      title: input.title,
      description: input.description ?? null,
      rank: (max._max.rank ?? 0) + 1,
      steps: { create: normalizeSteps(input.steps) },
    },
    include: fullInclude,
  });
}

// Update scalar fields and, when `steps` is provided, replace the whole set.
export async function updateRootCause(
  id: number,
  input: Partial<Omit<RootCauseInput, 'failureTypeId'>> & { isActive?: boolean },
) {
  await getRootCause(id);
  const { steps, ...scalar } = input;
  return prisma.$transaction(async (tx) => {
    await tx.rootCause.update({ where: { id }, data: scalar });
    if (steps) {
      await tx.rootCauseStep.deleteMany({ where: { rootCauseId: id } });
      await tx.rootCauseStep.createMany({
        data: normalizeSteps(steps).map((s) => ({ ...s, rootCauseId: id })),
      });
    }
    return tx.rootCause.findUnique({ where: { id }, include: fullInclude });
  });
}

export async function setRootCauseActive(id: number, isActive: boolean) {
  await getRootCause(id);
  return prisma.rootCause.update({ where: { id }, data: { isActive }, include: fullInclude });
}

// Root causes have no protected children (steps/media cascade), so hard delete is allowed.
export async function deleteRootCause(id: number) {
  const rc = await prisma.rootCause.findUnique({ where: { id }, include: { media: true } });
  if (!rc) throw notFound('Root cause not found');
  await prisma.rootCause.delete({ where: { id } });
  await Promise.all(rc.media.map((m) => deleteImage(m.filePath)));
}

export async function reorderRootCause(id: number, direction: 'up' | 'down') {
  const current = await prisma.rootCause.findUnique({ where: { id } });
  if (!current) throw notFound('Root cause not found');
  const neighbour = await prisma.rootCause.findFirst({
    where: {
      failureTypeId: current.failureTypeId,
      rank: direction === 'up' ? { lt: current.rank } : { gt: current.rank },
    },
    orderBy: { rank: direction === 'up' ? 'desc' : 'asc' },
  });
  if (!neighbour) return current;
  await prisma.$transaction([
    prisma.rootCause.update({ where: { id: current.id }, data: { rank: neighbour.rank } }),
    prisma.rootCause.update({ where: { id: neighbour.id }, data: { rank: current.rank } }),
  ]);
  return prisma.rootCause.findUnique({ where: { id }, include: fullInclude });
}

// --- OK/NG media management -------------------------------------------------

// Set (create or replace) the single OK or NG image for a root cause.
export async function setRootCauseMedia(
  rootCauseId: number,
  kind: MediaKind,
  filePath: string,
  caption?: string | null,
) {
  await getRootCause(rootCauseId);
  const existing = await prisma.media.findFirst({ where: { rootCauseId, kind } });
  if (existing) {
    if (existing.filePath !== filePath) await deleteImage(existing.filePath);
    return prisma.media.update({
      where: { id: existing.id },
      data: { filePath, caption: caption ?? null },
    });
  }
  return prisma.media.create({ data: { rootCauseId, kind, filePath, caption: caption ?? null } });
}

export async function deleteMedia(mediaId: number) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw notFound('Media not found');
  await prisma.media.delete({ where: { id: mediaId } });
  await deleteImage(media.filePath);
}
