import { getProfileByUserId } from "../repositories/profile.repo.js";

// Middleware para exigir perfil existente nas rotas que precisam de perfil
export async function requireProfileMiddleware(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Usuário não autenticado" });
    }

    const profile = await getProfileByUserId(userId);
    if (!profile) {
      return res.status(403).json({ ok: false, message: "Perfil não encontrado para este usuário" });
    }

    // injeta profileId para conveniência
    req.user.profileId = profile.id;
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Erro ao validar perfil" });
  }
}
