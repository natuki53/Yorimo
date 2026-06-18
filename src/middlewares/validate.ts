import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as Request["query"];
    next();
  };

export const validateParams =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req.params = schema.parse(req.params) as Request["params"];
    next();
  };
