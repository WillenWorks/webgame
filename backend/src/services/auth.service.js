import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuid } from 'uuid';
import { storeRefreshToken, getRefreshToken, revokeRefreshToken } from '../repositories/token.repo.js';
import { getProfileByUserId } from '../repositories/profile.repo.js';

dotenv.config();

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30);

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function genRefreshToken() {
  return uuid();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function issueTokensForUser(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = genRefreshToken();
  const expiresAt = addDays(new Date(), REFRESH_EXPIRES_DAYS);
  await storeRefreshToken({ id: uuid(), userId: user.id, token: refreshToken, expiresAt });

  // opcional: perfil padrão do usuário (primeiro)
  const profile = await getProfileByUserId(user.id);

  return { accessToken, refreshToken, profileId: profile?.id || null };
}

export async function refreshTokenService(refreshToken) {
  const row = await getRefreshToken(refreshToken);
  if (!row) throw new Error('Refresh token inválido');
  if (row.revoked) throw new Error('Refresh token revogado');
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('Refresh token expirado');
  }

  // Emitir novo access token
  const accessToken = jwt.sign({ sub: row.user_id }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  return { accessToken };
}

export async function revokeRefreshTokenService(refreshToken) {
  await revokeRefreshToken(refreshToken);
  return { ok: true };
}
