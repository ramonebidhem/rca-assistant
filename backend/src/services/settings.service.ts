import { prisma } from '../lib/prisma.js';
import { deleteImage } from '../lib/images.js';

const SETTINGS_ID = 1;

// Fetch the singleton settings row, creating it with defaults if absent.
export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: SETTINGS_ID } });
}

export async function updateSettings(input: {
  siteName?: string;
  slogan?: string;
  logoScale?: number;
}) {
  await getSettings(); // ensure the row exists
  return prisma.settings.update({ where: { id: SETTINGS_ID }, data: input });
}

// Replace the logo, removing the previously uploaded file if any.
export async function setLogo(logoPath: string) {
  const current = await getSettings();
  if (current.logoPath && current.logoPath !== logoPath) {
    await deleteImage(current.logoPath);
  }
  return prisma.settings.update({ where: { id: SETTINGS_ID }, data: { logoPath } });
}

export async function serializeSettings() {
  const s = await getSettings();
  return { siteName: s.siteName, slogan: s.slogan, logoPath: s.logoPath, logoScale: s.logoScale };
}
