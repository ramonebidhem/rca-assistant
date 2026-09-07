import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';
import { verifyPassword, signToken } from '../lib/auth.js';

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw unauthorized('Invalid username or password');
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid username or password');

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  return { token, user: { id: user.id, username: user.username, role: user.role } };
}
