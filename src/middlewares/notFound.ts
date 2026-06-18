import type { Request, Response } from "express";
import { sendError } from "../utils/apiResponse.js";

export const notFoundHandler = (req: Request, res: Response) => {
  return sendError(res, 404, "NOT_FOUND", `${req.method} ${req.path} は存在しません`);
};
