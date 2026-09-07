/**
 * Runs on production start, after `prisma migrate deploy`.
 *
 * Seeds the knowledge base ONLY when the database is still empty, so a restart
 * or redeploy never wipes content that has been edited in the admin panel.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const count = await prisma.category.count();
await prisma.$disconnect();

if (count === 0) {
  console.log('Empty database detected — seeding initial knowledge base…');
  await import('./seed.js');
} else {
  console.log(`Database already has ${count} categories — skipping seed.`);
}
