import { ZodType } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { Request, Response, NextFunction } from "express";

export const validateRequest = (schema: ZodType) => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      req.body = await schema.parseAsync(req.body ?? {});
      next();
    },
  );
};
