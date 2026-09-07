import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { upload } from '../middleware/upload.js';
import { saveCompressedImage, saveLogoImage } from '../lib/images.js';
import { badRequest } from '../lib/errors.js';
import {
  idParam,
  createCategorySchema,
  updateCategorySchema,
  createFailureTypeSchema,
  updateFailureTypeSchema,
  createRootCauseSchema,
  updateRootCauseSchema,
  reorderSchema,
  activeSchema,
  mediaKindBody,
  suggestionListQuery,
  approveSuggestionSchema,
  rejectSuggestionSchema,
  updateSettingsSchema,
} from '../schemas.js';
import * as categories from '../services/categories.service.js';
import * as failureTypes from '../services/failureTypes.service.js';
import * as rootCauses from '../services/rootCauses.service.js';
import * as suggestions from '../services/suggestions.service.js';
import * as settings from '../services/settings.service.js';
import { getDashboardCounters } from '../services/dashboard.service.js';
import {
  serializeCategory,
  serializeFailureType,
  serializeRootCause,
  serializeMedia,
  serializeSuggestion,
} from '../services/serialize.js';

export const adminRouter = Router();

// Every admin route requires a valid JWT.
adminRouter.use(requireAdmin);

const pid = (req: { params: Record<string, string> }) => Number(req.params.id);

// --- Dashboard --------------------------------------------------------------
adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => res.json(await getDashboardCounters())),
);

// --- Settings / branding ----------------------------------------------------
adminRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => res.json(await settings.serializeSettings())),
);

adminRouter.patch(
  '/settings',
  validate(updateSettingsSchema),
  asyncHandler(async (req, res) => {
    await settings.updateSettings(req.body);
    res.json(await settings.serializeSettings());
  }),
);

adminRouter.post(
  '/settings/logo',
  upload.single('logo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No logo file provided');
    const logoPath = await saveLogoImage(req.file.buffer);
    await settings.setLogo(logoPath);
    res.json(await settings.serializeSettings());
  }),
);

// --- Categories -------------------------------------------------------------
adminRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const list = await categories.listAllCategories();
    res.json(list.map(serializeCategory));
  }),
);

adminRouter.get(
  '/categories/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const category = await categories.getCategory(pid(req));
    const fts = await failureTypes.listAllByCategory(pid(req));
    res.json({
      category: serializeCategory(category),
      failureTypes: fts.map(serializeFailureType),
    });
  }),
);

adminRouter.post(
  '/categories',
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const created = await categories.createCategory(req.body);
    res.status(201).json(serializeCategory(created));
  }),
);

adminRouter.patch(
  '/categories/:id',
  validate(idParam, 'params'),
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const updated = await categories.updateCategory(pid(req), req.body);
    res.json(serializeCategory(updated));
  }),
);

adminRouter.patch(
  '/categories/:id/active',
  validate(idParam, 'params'),
  validate(activeSchema),
  asyncHandler(async (req, res) => {
    const updated = await categories.setCategoryActive(pid(req), req.body.isActive);
    res.json(serializeCategory(updated));
  }),
);

adminRouter.patch(
  '/categories/:id/reorder',
  validate(idParam, 'params'),
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const updated = await categories.reorderCategory(pid(req), req.body.direction);
    res.json(updated ? serializeCategory(updated) : null);
  }),
);

adminRouter.post(
  '/categories/:id/image',
  validate(idParam, 'params'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No image file provided');
    const imagePath = await saveCompressedImage(req.file.buffer);
    const updated = await categories.updateCategory(pid(req), { imagePath });
    res.json(serializeCategory(updated));
  }),
);

adminRouter.delete(
  '/categories/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await categories.deleteCategory(pid(req));
    res.status(204).end();
  }),
);

// --- Failure types ----------------------------------------------------------
adminRouter.get(
  '/failure-types/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const ft = await failureTypes.getFailureType(pid(req));
    const rcs = await rootCauses.listAllByFailureType(pid(req));
    res.json({
      failureType: serializeFailureType(ft),
      rootCauses: rcs.map(serializeRootCause),
    });
  }),
);

adminRouter.post(
  '/failure-types',
  validate(createFailureTypeSchema),
  asyncHandler(async (req, res) => {
    const created = await failureTypes.createFailureType(req.body);
    res.status(201).json(serializeFailureType(created));
  }),
);

adminRouter.patch(
  '/failure-types/:id',
  validate(idParam, 'params'),
  validate(updateFailureTypeSchema),
  asyncHandler(async (req, res) => {
    const updated = await failureTypes.updateFailureType(pid(req), req.body);
    res.json(serializeFailureType(updated));
  }),
);

adminRouter.patch(
  '/failure-types/:id/active',
  validate(idParam, 'params'),
  validate(activeSchema),
  asyncHandler(async (req, res) => {
    const updated = await failureTypes.setFailureTypeActive(pid(req), req.body.isActive);
    res.json(serializeFailureType(updated));
  }),
);

adminRouter.patch(
  '/failure-types/:id/reorder',
  validate(idParam, 'params'),
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const updated = await failureTypes.reorderFailureType(pid(req), req.body.direction);
    res.json(updated ? serializeFailureType(updated) : null);
  }),
);

adminRouter.post(
  '/failure-types/:id/image',
  validate(idParam, 'params'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No image file provided');
    const imagePath = await saveCompressedImage(req.file.buffer);
    const updated = await failureTypes.updateFailureType(pid(req), { imagePath });
    res.json(serializeFailureType(updated));
  }),
);

adminRouter.delete(
  '/failure-types/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await failureTypes.deleteFailureType(pid(req));
    res.status(204).end();
  }),
);

// --- Root causes ------------------------------------------------------------
adminRouter.get(
  '/root-causes/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const rc = await rootCauses.getRootCause(pid(req));
    res.json(serializeRootCause(rc));
  }),
);

adminRouter.post(
  '/root-causes',
  validate(createRootCauseSchema),
  asyncHandler(async (req, res) => {
    const created = await rootCauses.createRootCause(req.body);
    res.status(201).json(serializeRootCause(created));
  }),
);

adminRouter.patch(
  '/root-causes/:id',
  validate(idParam, 'params'),
  validate(updateRootCauseSchema),
  asyncHandler(async (req, res) => {
    const updated = await rootCauses.updateRootCause(pid(req), req.body);
    res.json(updated ? serializeRootCause(updated) : null);
  }),
);

adminRouter.patch(
  '/root-causes/:id/active',
  validate(idParam, 'params'),
  validate(activeSchema),
  asyncHandler(async (req, res) => {
    const updated = await rootCauses.setRootCauseActive(pid(req), req.body.isActive);
    res.json(serializeRootCause(updated));
  }),
);

adminRouter.patch(
  '/root-causes/:id/reorder',
  validate(idParam, 'params'),
  validate(reorderSchema),
  asyncHandler(async (req, res) => {
    const updated = await rootCauses.reorderRootCause(pid(req), req.body.direction);
    res.json(updated ? serializeRootCause(updated) : null);
  }),
);

// Upload / replace the OK or NG image for a root cause.
adminRouter.post(
  '/root-causes/:id/media',
  validate(idParam, 'params'),
  upload.single('image'),
  validate(mediaKindBody),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No image file provided');
    const filePath = await saveCompressedImage(req.file.buffer);
    const media = await rootCauses.setRootCauseMedia(
      pid(req),
      req.body.kind,
      filePath,
      req.body.caption,
    );
    res.status(201).json(serializeMedia(media));
  }),
);

adminRouter.delete(
  '/media/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await rootCauses.deleteMedia(pid(req));
    res.status(204).end();
  }),
);

adminRouter.delete(
  '/root-causes/:id',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    await rootCauses.deleteRootCause(pid(req));
    res.status(204).end();
  }),
);

// --- Suggestions ------------------------------------------------------------
adminRouter.get(
  '/suggestions',
  validate(suggestionListQuery, 'query'),
  asyncHandler(async (req, res) => {
    const list = await suggestions.listSuggestions(req.query.status as never);
    res.json(list.map(serializeSuggestion));
  }),
);

adminRouter.post(
  '/suggestions/:id/approve',
  validate(idParam, 'params'),
  validate(approveSuggestionSchema),
  asyncHandler(async (req, res) => {
    const updated = await suggestions.approveSuggestion(pid(req), req.body.adminComment);
    res.json(serializeSuggestion(updated));
  }),
);

adminRouter.post(
  '/suggestions/:id/reject',
  validate(idParam, 'params'),
  validate(rejectSuggestionSchema),
  asyncHandler(async (req, res) => {
    const updated = await suggestions.rejectSuggestion(pid(req), req.body.adminComment);
    res.json(serializeSuggestion(updated));
  }),
);
