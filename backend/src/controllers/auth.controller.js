import { register, login } from '../services/auth.service.js';

export async function registerController(req, res, next) {
  try {
    const result = await register(req.body);
    res.status(201).json({ ok: true, user: result });
  } catch (err) {
    next(err);
  }
}

export async function loginController(req, res, next) {
  try {
    const result = await login(req.body);
    res.json({ ok: true, token: result.token });
  } catch (err) {
    next(err);
  }
}
