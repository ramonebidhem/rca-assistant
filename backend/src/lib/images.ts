import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { prisma } from './prisma.js';

const MAX_BYTES = 500 * 1024; // ~500 KB target
const MAX_DIMENSION = 1600; // px, long edge

/**
 * Images are stored in Postgres (table `uploaded_files`) rather than on disk so
 * they survive restarts and redeploys on hosts with an ephemeral filesystem.
 * The public path is `/uploads/<id>.<ext>`, served by the /uploads route.
 */
async function store(buffer: Buffer, mimeType: string, ext: string): Promise<string> {
  const id = crypto.randomUUID();
  await prisma.uploadedFile.create({ data: { id, mimeType, data: buffer } });
  return `/uploads/${id}.${ext}`;
}

/** Extract the storage id from a public path like `/uploads/<id>.webp`. */
export function fileIdFromPath(publicPath: string): string {
  return path.parse(publicPath).name;
}

/**
 * Compress an in-memory image buffer to WebP, resize down to a sane max
 * dimension, and iteratively drop quality until it fits under ~500 KB.
 */
export async function saveCompressedImage(buffer: Buffer): Promise<string> {
  const base = sharp(buffer).rotate().resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let quality = 82;
  let out = await base.clone().webp({ quality }).toBuffer();
  while (out.byteLength > MAX_BYTES && quality > 30) {
    quality -= 12;
    out = await base.clone().webp({ quality }).toBuffer();
  }

  return store(out, 'image/webp', 'webp');
}

/**
 * Save a logo image. Keeps PNG output to preserve transparency and resizes the
 * long edge down to a sane max.
 */
export async function saveLogoImage(buffer: Buffer): Promise<string> {
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return store(out, 'image/png', 'png');
}

/** Delete a stored image given its public path. Best-effort. */
export async function deleteImage(publicPath?: string | null): Promise<void> {
  if (!publicPath) return;
  try {
    await prisma.uploadedFile.delete({ where: { id: fileIdFromPath(publicPath) } });
  } catch {
    /* already gone */
  }
}

/** Look up a stored image by its id (used by the /uploads route). */
export async function getStoredImage(id: string) {
  return prisma.uploadedFile.findUnique({ where: { id } });
}
