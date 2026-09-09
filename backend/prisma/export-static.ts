/**
 * Exports the live knowledge base into the frontend as a static bundle:
 *   frontend/src/data/knowledge.json   content + branding
 *   frontend/public/uploads/<id>.<ext> images (from the uploaded_files table)
 *
 * This powers the static (GitHub Pages) build, which runs the viewer and the
 * AI assistant entirely in the browser with no backend.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

const ROOT = path.resolve(process.cwd(), '..');
const DATA_FILE = path.join(ROOT, 'frontend/src/data/knowledge.json');
const IMAGE_DIR = path.join(ROOT, 'frontend/public/uploads');

const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
};

function categoryCode(sortOrder: number) {
  return `CAT-${String(sortOrder).padStart(2, '0')}`;
}
function failureTypeCode(catSort: number, sortOrder: number) {
  return `FT-${String(catSort).padStart(2, '0')}${String(sortOrder).padStart(1, '0')}`;
}
function rootCauseCode(rank: number) {
  return `RC-${String(rank).padStart(3, '0')}`;
}

async function main() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      failureTypes: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          rootCauses: {
            where: { isActive: true },
            orderBy: { rank: 'asc' },
            include: { steps: { orderBy: { stepNo: 'asc' } }, media: true },
          },
        },
      },
    },
  });

  const settingsRow = await prisma.settings.findUnique({ where: { id: 1 } });

  const out = {
    settings: {
      siteName: settingsRow?.siteName ?? 'Défauthèque',
      slogan: settingsRow?.slogan ?? 'Find the cause. Fix it right.',
      logoPath: settingsRow?.logoPath ?? null,
      logoScale: settingsRow?.logoScale ?? 100,
    },
    categories: categories.map((c) => ({
      id: c.id,
      code: categoryCode(c.sortOrder),
      name: c.name,
      description: c.description,
      imagePath: c.imagePath,
      sortOrder: c.sortOrder,
      isActive: true,
      failureTypeCount: c.failureTypes.length,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    failureTypes: categories.flatMap((c) =>
      c.failureTypes.map((f) => ({
        id: f.id,
        code: failureTypeCode(c.sortOrder, f.sortOrder),
        categoryId: c.id,
        categoryName: c.name,
        name: f.name,
        description: f.description,
        imagePath: f.imagePath,
        sortOrder: f.sortOrder,
        isActive: true,
        rootCauseCount: f.rootCauses.length,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    ),
    rootCauses: categories.flatMap((c) =>
      c.failureTypes.flatMap((f) =>
        f.rootCauses.map((r) => ({
          id: r.id,
          code: rootCauseCode(r.rank),
          failureTypeId: f.id,
          title: r.title,
          description: r.description,
          rank: r.rank,
          isActive: true,
          steps: r.steps.map((s) => ({
            id: s.id,
            stepNo: s.stepNo,
            instruction: s.instruction,
            type: s.type,
          })),
          media: r.media.map((m) => ({
            id: m.id,
            kind: m.kind,
            filePath: m.filePath,
            caption: m.caption,
          })),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      ),
    ),
  };

  await fs.writeFile(DATA_FILE, JSON.stringify(out, null, 2));

  // Export every referenced image to disk.
  const files = await prisma.uploadedFile.findMany();
  let written = 0;
  for (const f of files) {
    const ext = EXT[f.mimeType] ?? 'bin';
    await fs.writeFile(path.join(IMAGE_DIR, `${f.id}.${ext}`), Buffer.from(f.data));
    written++;
  }

  console.log('Static export complete.');
  console.log(`  categories:    ${out.categories.length}`);
  console.log(`  failureTypes:  ${out.failureTypes.length}`);
  console.log(`  rootCauses:    ${out.rootCauses.length}`);
  console.log(`  images:        ${written}`);
  console.log(`  data:          ${DATA_FILE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
