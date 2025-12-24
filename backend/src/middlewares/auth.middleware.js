import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { getProfileByUserId } from "../repositories/profile.repo.js";

export async function authMiddleware(req, res, next) {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Token não fornecido",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token recebido:", token);

    const decoded = jwt.verify(token, env.JWT_SECRET);
    console.log("Token decodificado:", decoded);


    // decoded.userId deve existir
    if (!decoded.userId) {
      return res.status(401).json({
        ok: false,
        message: "Token inválido",
      });
    }

    // 🔥 BUSCA O PROFILE
    const profile = await getProfileByUserId(decoded.userId);

    if (!profile) {
      return res.status(403).json({
        ok: false,
        message: "Perfil não encontrado para este usuário",
      });
    }

    // 🔐 INJETA NO REQUEST
    req.user = {
      userId: decoded.userId,
      profileId: profile.id,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      message: "Token inválido ou expirado",
    });
  }
}
