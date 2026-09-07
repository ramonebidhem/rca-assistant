import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { saveCompressedImage } from '../lib/images.js';
import {
  idParam,
  searchQuery,
  createSuggestionSchema,
  askSchema,
} from '../schemas.js';
import * as categories from '../services/categories.service.js';
import * as failureTypes from '../services/failureTypes.service.js';
import * as rootCauses from '../services/rootCauses.service.js';
import * as suggestions from '../services/suggestions.service.js';
import { serializeSettings } from '../services/settings.service.js';
import { ask, assistantStatus } from '../rag/assistant.service.js';
import {
  serializeCategory,
  serializeFailureType,
  serializeRootCause,
  serializeSuggestion,
} from '../services/serialize.js';

export const publicRouter = Router();

// Public branding (site name, slogan, logo) used across the whole app.
publicRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    res.json(await serializeSettings());
  }),
);

// --- Assistant (local RAG over platform data) -------------------------------
publicRouter.get(
  '/assistant/status',
  asyncHandler(async (_req, res) => {
    res.json(await assistantStatus());
  }),
);

publicRouter.post(
  '/assistant/ask',
  validate(askSchema),
  asyncHandler(async (req, res) => {
    const { question } = req.body as { question: string };
    res.json(await ask(question));
  }),
);

// List active categories with active failure-type counts.
publicRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const list = await categories.listActiveCategories();
    res.json(list.map(serializeCategory));
  }),
);

// One active category with its active failure types.
publicRouter.get(
  '/categories/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const category = await categories.getCategory(id, true);
    const fts = await failureTypes.listActiveByCategory(id);
    res.json({
      category: serializeCategory(category),
      failureTypes: fts.map(serializeFailureType),
    });
  }),
);

// One active failure type with its ordered active root causes (steps + media).
publicRouter.get(
  '/failure-types/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ft = await failureTypes.getFailureType(id, true);
    const rcs = await rootCauses.listActiveByFailureType(id);
    res.json({
      failureType: serializeFailureType(ft),
      rootCauses: rcs.map(serializeRootCause),
    });
  }),
);

// Live search over failure-type names.
publicRouter.get(
  '/search',
  validate(searchQuery, 'query'),
  asyncHandler(async (req, res) => {
    const results = await failureTypes.searchFailureTypes(String(req.query.q));
    res.json(results.map(serializeFailureType));
  }),
);

// Submit a suggestion (optional photo). Anonymous.
publicRouter.post(
  '/suggestions',
  upload.single('photo'),
  validate(createSuggestionSchema),
  asyncHandler(async (req, res) => {
    let photoPath: string | null = null;
    if (req.file) photoPath = await saveCompressedImage(req.file.buffer);
    const body = req.body as { failureTypeId: number; text: string };
    const created = await suggestions.createSuggestion({
      failureTypeId: body.failureTypeId,
      text: body.text,
      photoPath,
    });
    res.status(201).json(serializeSuggestion(created));
  }),
);
