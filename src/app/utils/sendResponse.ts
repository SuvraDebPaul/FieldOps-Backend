import type { Response } from "express";
import type { IMeta } from "../interfaces/index.js";

type TResponseData<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: IMeta;
};

export const sendResponse = <T>(res: Response, payload: TResponseData<T>) => {
  res.status(payload.statusCode).json({
    success: payload.success,
    statusCode: payload.statusCode,
    message: payload.message,
    data: payload.data,
    ...(payload.meta ? { meta: payload.meta } : {}),
  });
};
