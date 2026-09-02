import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import env from "../config/env.js";
import { getProfileByUserId, createProfile, findProfileByName } from "../repositories/profile.repo.js";
import { findUserById } from "../repositories/user.repo.js";

// Auth middleware:
// - Valida JWT e injeta req.user.userId
// - Para rotas de perfil:
//   * GET /profiles: injeta profileId se existir (não bloqueia)
//   * POST /profiles: se não existir perfil, cria um novo usando detective_name (com checagem de nome único)
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Token inválido" });
    }

    // O JWT pode ter assinatura válida mas apontar para um usuário que não
    // existe mais (ex.: banco resetado/re-migrado com o mesmo JWT_SECRET).
    // Sem esta checagem, o user_id inválido só estoura lá no INSERT como
    // violação de FK (500). Aqui devolvemos 401 para o front encerrar a sessão.
    const currentUser = await findUserById(userId);
    if (!currentUser) {
      return res.status(401).json({ ok: false, message: "Sessão inválida — faça login novamente" });
    }

    // Injeta userId
    req.user = { userId };

    // Regras específicas para rotas de perfil
    const isProfilesRoute = (req.baseUrl || req.originalUrl || "").includes("/api/v1/profiles");

    if (isProfilesRoute) {
      // Sempre tenta ler perfil atual
      const existing = await getProfileByUserId(userId);
      if (req.method === "GET") {
        // GET: apenas injeta se existir
        if (existing) {
          req.user.profileId = existing.id;
        }
        return next();
      }

      if (req.method === "POST") {
        // POST: criação é responsabilidade do controller. Apenas segue.
        return next();
      }
    }

    // Demais rotas
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Token inválido ou expirado" });
  }
}
