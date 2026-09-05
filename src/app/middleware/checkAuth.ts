import { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import { prisma } from "../lib/prisma";

export interface RequestUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    const token: string | undefined =
      req.cookies?.accessToken ||
      (header?.startsWith("Bearer ") ? header.split(" ")[1] : header);

    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "You are not logged in. Please log in to access this resource.",
      );
    }
    const verified = jwtUtils.verifyToken(token, config.JWT_ACCESS_SECRET);

    if (!verified.success) {
      throw new AppError(httpStatus.UNAUTHORIZED, verified.error);
    }

    const { userId, email, name } = verified.data as RequestUser;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, status: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "User no longer exists. Please log in again.",
      );
    }
    if (user.status === "SUSPENDED") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Your account has been suspended. Please contact support.",
      );
    }
    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You don't have permission to access this resource.",
      );
    }

    req.user = { userId, email, name, role: user.role };

    next();
  });
};
