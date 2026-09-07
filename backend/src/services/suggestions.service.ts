import { prisma } from '../lib/prisma.js';
import { notFound, badRequest } from '../lib/errors.js';

export interface SuggestionInput {
  failureTypeId: number;
  text: string;
  photoPath?: string | null;
}

export async function createSuggestion(input: SuggestionInput) {
  const ft = await prisma.failureType.findUnique({ where: { id: input.failureTypeId } });
  if (!ft) throw notFound('Failure type not found');
  return prisma.suggestion.create({
    data: {
      failureTypeId: input.failureTypeId,
      text: input.text,
      photoPath: input.photoPath ?? null,
    },
    include: { failureType: true },
  });
}

export async function listSuggestions(status?: 'pending' | 'approved' | 'rejected') {
  return prisma.suggestion.findMany({
    where: status ? { status } : undefined,
    orderBy: { submittedAt: 'desc' },
    include: { failureType: true },
  });
}

export async function getSuggestion(id: number) {
  const s = await prisma.suggestion.findUnique({ where: { id }, include: { failureType: true } });
  if (!s) throw notFound('Suggestion not found');
  return s;
}

// Mark a suggestion approved. The actual root-cause creation is done via the
// normal root-cause endpoint from the admin's pre-filled form; this records the
// review outcome.
export async function approveSuggestion(id: number, adminComment?: string | null) {
  const s = await prisma.suggestion.findUnique({ where: { id } });
  if (!s) throw notFound('Suggestion not found');
  if (s.status !== 'pending') throw badRequest('Suggestion has already been reviewed');
  return prisma.suggestion.update({
    where: { id },
    data: { status: 'approved', adminComment: adminComment ?? null, reviewedAt: new Date() },
    include: { failureType: true },
  });
}

export async function rejectSuggestion(id: number, adminComment: string) {
  const comment = adminComment?.trim();
  if (!comment) throw badRequest('A comment is required to reject a suggestion');
  const s = await prisma.suggestion.findUnique({ where: { id } });
  if (!s) throw notFound('Suggestion not found');
  if (s.status !== 'pending') throw badRequest('Suggestion has already been reviewed');
  return prisma.suggestion.update({
    where: { id },
    data: { status: 'rejected', adminComment: comment, reviewedAt: new Date() },
    include: { failureType: true },
  });
}
