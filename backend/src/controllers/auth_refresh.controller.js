import { issueTokensForUser, refreshTokenService, revokeRefreshTokenService } from '../services/auth.service.js';
import { getUserByUsername, validatePassword } from '../repositories/user.repo.js';

export async function registerController(req, res, next) {
  try {
    // (Mantém sua lógica existente de registro)
    next();
  } catch (err) { next(err); }
}

export async function loginController(req, res, next) {
  try {
    const { username, password } = req.validated.body;
    const user = await getUserByUsername(username);
    if (!user || !(await validatePassword(user, password))) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas' } });
    }
    const tokens = await issueTokensForUser(user);
    res.json({ ok: true, ...tokens });
  } catch (err) { next(err); }
}

export async function refreshTokenController(req, res, next) {
  try {
    const { refreshToken } = req.validated.body;
    const result = await refreshTokenService(refreshToken);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
}

export async function revokeRefreshTokenController(req, res, next) {
  try {
    const { refreshToken } = req.validated.body;
    await revokeRefreshTokenService(refreshToken);
    res.json({ ok: true });
  } catch (err) { next(err); }
}
