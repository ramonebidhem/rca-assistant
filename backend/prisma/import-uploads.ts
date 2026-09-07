/**
 * One-time migration: import images that were previously stored on disk in
 * `uploads/` into the `uploaded_files` table.
 *
 * The stored public paths are `/uploads/<name>.<ext>` and the new storage keys
 * on `<name>`, so importing each file under its own basename keeps every
 * existing reference (category images, OK/NG media, the branding logo) working.
 *
 * Safe to re-run: files already present in the database are skipped.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

const uploadDirRaw = process.env.UPLOAD_DIR ?? '../uploads';
const uploadDir = path.isAbsolute(uploadDirRaw)
  ? uploadDirRaw
  : path.resolve(process.cwd(), uploadDirRaw);

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
};

async function main() {
  let entries: string[];
  try {
    entries = await fs.readdir(uploadDir);
  } catch {
    console.log(`No uploads directory at ${uploadDir} — nothing to import.`);
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    const mimeType = MIME[ext];
    if (!mimeType) continue; // .gitkeep and friends

    const id = path.parse(entry).name;
    const existing = await prisma.uploadedFile.findUnique({ where: { id } });
    if (existing) {
      skipped++;
      continue;
    }

    const data = await fs.readFile(path.join(uploadDir, entry));
    await prisma.uploadedFile.create({ data: { id, mimeType, data } });
    imported++;
  }

  console.log(`Imported ${imported} image(s), skipped ${skipped} already present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
