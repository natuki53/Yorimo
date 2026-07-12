import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { conflict, demoDataLocked, demoNotReady, unauthorized } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { createAccessToken, hashPassword, toPublicUser, verifyPassword } from "../services/authService.js";
import { DEMO_USER_ID, isDemoUser } from "../config/demo.js";

export const demoLogin = async (_req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!user) {
    throw demoNotReady();
  }

  return sendSuccess(res, { user: toPublicUser(user), token: createAccessToken(user) });
};

export const register = async (req: Request, res: Response) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: req.body.email }
  });

  if (existingUser) {
    throw conflict("このメールアドレスは既に登録されています");
  }

  const passwordHash = await hashPassword(req.body.password);
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      ageRange: req.body.ageRange ?? null,
      homeStation: req.body.homeStation ?? null,
      schoolOrWorkStation: req.body.schoolOrWorkStation ?? null,
      interests: req.body.interests ?? [],
      defaultBudgetMin: req.body.defaultBudgetMin ?? null,
      defaultBudgetMax: req.body.defaultBudgetMax ?? null
    }
  });
  const token = createAccessToken(user);

  return sendSuccess(res, { user: toPublicUser(user), token }, 201);
};

export const login = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email }
  });

  if (!user) {
    throw unauthorized("メールアドレスまたはパスワードが正しくありません");
  }

  const validPassword = await verifyPassword(req.body.password, user.passwordHash);
  if (!validPassword) {
    throw unauthorized("メールアドレスまたはパスワードが正しくありません");
  }

  const token = createAccessToken(user);
  return sendSuccess(res, { user: toPublicUser(user), token });
};

export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id }
  });

  return sendSuccess(res, toPublicUser(user));
};

export const updateProfile = async (req: Request, res: Response) => {
  if (isDemoUser(req.user?.id)) {
    throw demoDataLocked("共有デモのプロフィールは読み取り専用です");
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      name: req.body.name,
      ageRange: req.body.ageRange,
      homeStation: req.body.homeStation,
      schoolOrWorkStation: req.body.schoolOrWorkStation,
      interests: req.body.interests,
      defaultBudgetMin: req.body.defaultBudgetMin,
      defaultBudgetMax: req.body.defaultBudgetMax
    }
  });

  return sendSuccess(res, toPublicUser(user));
};
