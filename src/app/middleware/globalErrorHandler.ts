import config from "../config";
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "../utils/AppError";

type TErrorSource = { path: string; message: string };

const isDoubleBooking = (err: any): boolean => {
  const codes = [err?.code, err?.meta?.code, err?.cause?.code];
  const constraint = String(err?.constraint ?? err?.meta?.constraint ?? "");

  return (
    codes.includes("23P01") || constraint === "no_technician_double_booking"
  );
};

export const globalErrorHandeler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (config.NODE_ENV === "development") {
    console.error("Global Error Handeler:", err);
  }
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = err?.message || "Internal Server Error";
  let errors: TErrorSource[] = [];

  if (isDoubleBooking(err)) {
    statusCode = httpStatus.CONFLICT;
    message = "Technician already has a job in this time window";
  } else if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation Error";
    errors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "You have provided an incorrect field type or missing fields";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.CONFLICT;
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      message = target
        ? `A record with this ${target} already exists`
        : "Duplicate key error";
    } else if (err.code === "P2003") {
      statusCode = httpStatus.BAD_REQUEST;
      message = "Foreign key constraint failed";
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      message = "The requested record was not found";
    }
  }

  const isDev = config.NODE_ENV === "development";

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: isDev || statusCode < 500 ? message : "Internal Server Error",
    errors,
    stack: isDev ? err?.stack : undefined,
  });
};
