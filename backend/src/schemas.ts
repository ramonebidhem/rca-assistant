import { z } from 'zod';

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const searchQuery = z.object({ q: z.string().trim().min(1).max(200) });

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// --- Categories ---
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
});
export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// --- Failure types ---
export const createFailureTypeSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, 'Name is required').max(160),
  description: z.string().trim().max(2000).optional().nullable(),
});
export const updateFailureTypeSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

// --- Root causes ---
export const stepSchema = z.object({
  instruction: z.string().trim().min(1, 'Instruction is required').max(1000),
  type: z.enum(['step', 'check']),
});
export const createRootCauseSchema = z.object({
  failureTypeId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  steps: z.array(stepSchema).max(50).optional(),
});
export const updateRootCauseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  steps: z.array(stepSchema).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const reorderSchema = z.object({ direction: z.enum(['up', 'down']) });
export const activeSchema = z.object({ isActive: z.boolean() });

export const mediaKindBody = z.object({
  kind: z.enum(['OK', 'NG']),
  caption: z.string().trim().max(300).optional().nullable(),
});

// --- Suggestions ---
export const createSuggestionSchema = z.object({
  failureTypeId: z.coerce.number().int().positive(),
  text: z.string().trim().min(1, 'Please describe the suggested root cause').max(2000),
});
export const rejectSuggestionSchema = z.object({
  adminComment: z.string().trim().min(1, 'A comment is required to reject'),
});
export const approveSuggestionSchema = z.object({
  adminComment: z.string().trim().max(2000).optional().nullable(),
});
export const suggestionListQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

// --- Assistant (RAG) ---
export const askSchema = z.object({
  question: z.string().trim().min(2, 'Please enter a question').max(500),
});

// --- Settings / branding ---
export const updateSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1, 'Site name is required').max(80).optional(),
    slogan: z.string().trim().max(160).optional(),
    logoScale: z.coerce.number().int().min(40).max(240).optional(),
  })
  .refine((v) => v.siteName !== undefined || v.slogan !== undefined || v.logoScale !== undefined, {
    message: 'Provide at least one field to update',
  });
