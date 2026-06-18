import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../config/env.js";

export type PublicUser = Omit<User, "passwordHash">;

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, passwordHash: string) => {
  return bcrypt.compare(password, passwordHash);
};

export const createAccessToken = (user: Pick<User, "id" | "email">) => {
  const options: SignOptions = {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign({ email: user.email }, env.JWT_SECRET, options);
};

export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
};
