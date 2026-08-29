import prisma from '../config/prisma.js';

/**
 * Tabela de refresh tokens persistentes (auth_refresh_tokens).
 * O schema/migrations do Prisma cuidam da criação — esta função é mantida
 * apenas por compatibilidade com chamadas legadas.
 */
export async function initRefreshTokenTable() {
  /* no-op: gerenciado pelas migrations do Prisma */
}

function toRow(t) {
  if (!t) return null;
  return {
    id: t.id,
    user_id: t.userId,
    token: t.token,
    expires_at: t.expiresAt,
    revoked: t.revoked,
    created_at: t.createdAt,
  };
}

export async function storeRefreshToken({ id, userId, token, expiresAt }) {
  await prisma.refreshToken.create({
    data: { id, userId, token, expiresAt: expiresAt || null },
  });
}

export async function getRefreshToken(token) {
  return toRow(await prisma.refreshToken.findUnique({ where: { token } }));
}

export async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
}
