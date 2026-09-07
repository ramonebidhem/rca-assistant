import type {
  Category,
  FailureType,
  RootCause,
  RootCauseStep,
  Media,
  Suggestion,
} from '@prisma/client';
import { categoryCode, failureTypeCode, rootCauseCode } from '../lib/codes.js';

export function serializeCategory(
  c: Category & { failureTypes?: unknown[]; _count?: { failureTypes: number } },
) {
  const failureTypeCount = c._count?.failureTypes ?? c.failureTypes?.length ?? undefined;
  return {
    id: c.id,
    code: categoryCode(c.sortOrder),
    name: c.name,
    description: c.description,
    imagePath: c.imagePath,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    failureTypeCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function serializeFailureType(
  ft: FailureType & {
    category?: Category | null;
    rootCauses?: unknown[];
    _count?: { rootCauses: number };
  },
) {
  const categorySort = ft.category?.sortOrder ?? 0;
  return {
    id: ft.id,
    code: failureTypeCode(categorySort, ft.sortOrder),
    categoryId: ft.categoryId,
    categoryName: ft.category?.name,
    name: ft.name,
    description: ft.description,
    imagePath: ft.imagePath,
    sortOrder: ft.sortOrder,
    isActive: ft.isActive,
    rootCauseCount: ft._count?.rootCauses ?? ft.rootCauses?.length ?? undefined,
    createdAt: ft.createdAt,
    updatedAt: ft.updatedAt,
  };
}

export function serializeStep(s: RootCauseStep) {
  return { id: s.id, stepNo: s.stepNo, instruction: s.instruction, type: s.type };
}

export function serializeMedia(m: Media) {
  return { id: m.id, kind: m.kind, filePath: m.filePath, caption: m.caption };
}

export function serializeRootCause(
  rc: RootCause & { steps?: RootCauseStep[]; media?: Media[] },
) {
  return {
    id: rc.id,
    code: rootCauseCode(rc.rank),
    failureTypeId: rc.failureTypeId,
    title: rc.title,
    description: rc.description,
    rank: rc.rank,
    isActive: rc.isActive,
    steps: rc.steps ? rc.steps.map(serializeStep) : undefined,
    media: rc.media ? rc.media.map(serializeMedia) : undefined,
    createdAt: rc.createdAt,
    updatedAt: rc.updatedAt,
  };
}

export function serializeSuggestion(
  s: Suggestion & { failureType?: FailureType | null },
) {
  return {
    id: s.id,
    failureTypeId: s.failureTypeId,
    failureTypeName: s.failureType?.name,
    text: s.text,
    photoPath: s.photoPath,
    status: s.status,
    adminComment: s.adminComment,
    submittedAt: s.submittedAt,
    reviewedAt: s.reviewedAt,
  };
}
