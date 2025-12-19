import { issueTokensForUser } from '../services/auth.service.js';
import { getUserByUsername, validatePassword, createUser } from '../repositories/user.repo.js';

export async function registerController(req, res, next) {
  try {
    const { username, email, password } = req.validated.body || req.body;
    // Implementação simples de registro (ajuste conforme seu repo):
    const user = await createUser({ username, email, password });
    const tokens = await issueTokensForUser(user);
    res.status(201).json({ ok: true, user: { id: user.id, username: user.username, email: user.email }, ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function loginController(req, res, next) {
  try {
    const { username, password } = req.validated.body || req.body;
    const user = await getUserByUsername(username);
    if (!user || !(await validatePassword(user, password))) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas' } });
    }
    const tokens = await issueTokensForUser(user);
    res.json({ ok: true, ...tokens });
  } catch (err) {
    next(err);
  }
}
