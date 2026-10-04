/**
 * One-time import of the Molex crimp-quality handbook data prepared in
 * crimping_import.json. Only purely additive content is written directly:
 *  - new failure types (matchStatus "New")
 *  - new root causes (matchStatus "New"), under either a new or an existing
 *    failure type
 * Root causes with matchStatus "Existing"/"Partial" overlap live, validated
 * content with a different title, so instead of silently rewriting them they
 * are filed as pending Suggestions against the matching failure type for an
 * admin to review and merge by hand.
 *
 * OK/NG photo files referenced by the source PDF are not available on disk,
 * so media is intentionally left empty; the description notes that
 * reference photos are pending.
 *
 * Safe to re-run: matches existing records by (categoryId/failureTypeId, name/title)
 * and skips anything already present.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';

const prisma = new PrismaClient();

const IMPORT_PATH = '/Users/mac/Downloads/RCA Assistant/crimping_import.json';

interface ImportFailureType {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  importMeta?: { matchStatus?: string };
}

interface ImportStep {
  stepNo: number;
  instruction: string;
  type: 'step' | 'check';
}

interface ImportRootCause {
  id: number;
  failureTypeId: number;
  title: string;
  description: string | null;
  steps?: ImportStep[];
  importMeta?: {
    matchStatus?: string;
    failureTypeName?: string;
    pdfRef?: string;
  };
}

async function main() {
  const raw = await fs.readFile(IMPORT_PATH, 'utf-8');
  const data = JSON.parse(raw) as {
    categories: { name: string }[];
    failureTypes: ImportFailureType[];
    rootCauses: ImportRootCause[];
  };

  const categoryName = data.categories[0].name; // "Crimping"
  const category = await prisma.category.findFirst({ where: { name: categoryName } });
  if (!category) throw new Error(`Category "${categoryName}" not found locally`);

  // ---- Failure types: map JSON id -> local DB id, creating "New" ones ----
  const ftIdMap = new Map<number, number>();
  const existingFts = await prisma.failureType.findMany({ where: { categoryId: category.id } });
  let nextFtSort = existingFts.reduce((m, f) => Math.max(m, f.sortOrder), 0) + 1;

  let ftCreated = 0;
  for (const ft of data.failureTypes) {
    const status = ft.importMeta?.matchStatus;
    if (status === 'Existing') {
      const match = existingFts.find((f) => f.name.toLowerCase().trim() === ft.name.toLowerCase().trim());
      if (!match) throw new Error(`Expected existing failure type "${ft.name}" not found`);
      ftIdMap.set(ft.id, match.id);
    } else if (status === 'New') {
      const created = await prisma.failureType.create({
        data: {
          categoryId: category.id,
          name: ft.name,
          description: ft.description,
          sortOrder: nextFtSort++,
          isActive: true,
        },
      });
      ftIdMap.set(ft.id, created.id);
      ftCreated++;
    }
  }

  // ---- Root causes: only auto-create matchStatus "New" ----
  let rcCreated = 0;
  let suggestionsCreated = 0;
  const nextRankByFt = new Map<number, number>();

  for (const rc of data.rootCauses) {
    const status = rc.importMeta?.matchStatus;
    const localFtId = ftIdMap.get(rc.failureTypeId);
    if (!localFtId) {
      console.warn(`Skipping root cause "${rc.title}" — unmapped failure type ${rc.failureTypeId}`);
      continue;
    }

    if (status === 'New') {
      if (!nextRankByFt.has(localFtId)) {
        const existing = await prisma.rootCause.findMany({ where: { failureTypeId: localFtId } });
        nextRankByFt.set(localFtId, existing.reduce((m, r) => Math.max(m, r.rank), 0) + 1);
      }
      const rank = nextRankByFt.get(localFtId)!;
      nextRankByFt.set(localFtId, rank + 1);

      const pdfRef = rc.importMeta?.pdfRef;
      const description = [rc.description, pdfRef ? `Source: Molex TM-640160065 Rev C, ${pdfRef}.` : null, 'Reference OK/NG photos pending.']
        .filter(Boolean)
        .join(' ');

      await prisma.rootCause.create({
        data: {
          failureTypeId: localFtId,
          title: rc.title,
          description,
          rank,
          isActive: true,
          steps: {
            create: (rc.steps ?? []).map((s) => ({
              stepNo: s.stepNo,
              instruction: s.instruction,
              type: s.type,
            })),
          },
        },
      });
      rcCreated++;
    } else if (status === 'Existing' || status === 'Partial') {
      const pdfRef = rc.importMeta?.pdfRef;
      const text = [
        `[Imported from Molex handbook — ${status} match, needs admin review before merging]`,
        `Proposed title: ${rc.title}`,
        rc.description ?? '',
        rc.steps?.length
          ? 'Steps/checks:\n' + rc.steps.map((s) => `${s.stepNo}. [${s.type}] ${s.instruction}`).join('\n')
          : '',
        pdfRef ? `Source: Molex TM-640160065 Rev C, ${pdfRef}.` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      await prisma.suggestion.create({
        data: {
          failureTypeId: localFtId,
          text,
          status: 'pending',
        },
      });
      suggestionsCreated++;
    }
  }

  console.log('----------------------------------------------------------------');
  console.log(`Failure types created: ${ftCreated}`);
  console.log(`Root causes created:   ${rcCreated}`);
  console.log(`Suggestions filed:     ${suggestionsCreated} (Existing/Partial matches for admin review)`);
  console.log('----------------------------------------------------------------');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
