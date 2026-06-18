import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../utils/prisma.js";
import { unauthorized } from "../utils/errors.js";

type JwtPayload = {
  sub: string;
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!token) {
      return next(unauthorized());
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return next(unauthorized("有効なユーザーが見つかりません"));
    }

    req.user = user;
    return next();
  } catch {
    return next(unauthorized("トークンが無効です"));
  }
};
