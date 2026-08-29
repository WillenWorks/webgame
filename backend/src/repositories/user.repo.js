import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';

function toRow(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    password_hash: u.passwordHash,
    created_at: u.createdAt,
  };
}

export async function createUser({ id, username, email, password, passwordHash }) {
  const newId = id || randomUUID();
  const pwdHash = passwordHash || (password ? await bcrypt.hash(password, 10) : null);
  if (!username || !email || !pwdHash) {
    throw new Error('createUser: username, email e password são obrigatórios');
  }
  await prisma.user.create({
    data: { id: newId, username, email, passwordHash: pwdHash },
  });
  return { id: newId, username, email };
}

export async function findUserByEmail(email) {
  return toRow(await prisma.user.findUnique({ where: { email } }));
}

export async function getUserByUsername(username) {
  return toRow(await prisma.user.findUnique({ where: { username } }));
}

export async function validatePassword(user, password) {
  if (!user || !password) return false;
  try {
    return await bcrypt.compare(password, user.password_hash);
  } catch {
    return false;
  }
}
