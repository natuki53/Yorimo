import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prototypeRestriction } from "../utils/errors.js";

export const blockInDemo = (_req: Request, _res: Response, next: NextFunction) => {
  if (env.DEMO_MODE) {
    return next(prototypeRestriction());
  }
  return next();
};
