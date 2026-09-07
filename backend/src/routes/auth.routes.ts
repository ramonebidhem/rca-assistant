import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { loginSchema } from '../schemas.js';
import { login } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    const result = await login(username, password);
    res.json(result);
  }),
);

// Cheap token check used by the frontend auth guard.
authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});
