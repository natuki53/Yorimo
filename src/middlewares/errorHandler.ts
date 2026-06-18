import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { sendError } from "../utils/apiResponse.js";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    return sendError(res, 400, "VALIDATION_ERROR", message || "入力内容が正しくありません");
  }

  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.code, error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return sendError(res, 409, "CONFLICT", "一意制約に違反しています");
    }

    if (error.code === "P2025") {
      return sendError(res, 404, "NOT_FOUND", "対象が見つかりません");
    }
  }

  console.error(error);
  return sendError(res, 500, "INTERNAL_SERVER_ERROR", "サーバーエラーが発生しました");
};
