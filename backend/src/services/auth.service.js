import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import env from "../config/env.js";

import { createUser, findUserByEmail } from "../repositories/user.repo.js";

const SALT_ROUNDS = 10;

export async function register({ username, email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("Email já registrado");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = {
    id: uuid(),
    username,
    email,
    passwordHash,
  };

  await createUser(user);

  return { id: user.id, email: user.email };
}

export async function login({ email, password }) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Credenciais inválidas");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Credenciais inválidas");
  }

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { token };
}
