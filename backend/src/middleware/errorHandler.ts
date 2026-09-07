import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.error, message: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation.
    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'conflict',
        message: 'A record with the same unique fields already exists',
      });
      return;
    }
    // FK constraint (e.g. attempt to delete a parent with children).
    if (err.code === 'P2003') {
      res.status(409).json({
        error: 'conflict',
        message: 'Cannot delete: record is referenced by child records',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'not_found', message: 'Record not found' });
      return;
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}
