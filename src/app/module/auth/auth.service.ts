import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  IChnagePassword,
  IJwtPayload,
  ILoginPayload,
  IRegisterPayload,
} from "./auth.interface";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "../../config";
import { Role } from "../../../generated/prisma/enums";
import crypto from "crypto";
import { jwtUtils } from "../../utils/jwt";
import jwt from "jsonwebtoken";
import { RequestUser } from "../../middleware/checkAuth";

const register = async (payload: IRegisterPayload) => {
  const { name, email, password, phone, companyName, billingAddr } = payload;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with this email already exists",
    );
  }

  const hashPassword = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashPassword,
      phone,
      role: Role.CUSTOMER,
      customer: {
        create: { companyName, billingAddr },
      },
    },
    omit: { password: true },
    include: { customer: true },
  });
  return user;
};

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const issueTokens = async (payload: IJwtPayload) => {
  const accessToken = jwtUtils.createToken(
    payload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES,
  );

  const refreshToken = jwtUtils.createToken(
    payload,
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES,
  );

  const { exp } = jwt.decode(refreshToken) as { exp: number };

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(exp * 1000),
    },
  });

  return { accessToken, refreshToken };
};

const login = async (payload: ILoginPayload) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (!user.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account uses Google sign-in. Please continue with Google.",
    );
  }

  const isPasswordCorrect = await bcrypt.compare(
    payload.password,
    user.password,
  );
  if (!isPasswordCorrect) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }
  if (user.status === "SUSPENDED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been suspended. Please contact support.",
    );
  }

  const tokens = await issueTokens({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const { password, ...safeUser } = user;

  return { ...tokens, user: safeUser };
};

const refreshToken = async (token: string | undefined) => {
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, "No refresh token provided");
  }
  const verified = jwtUtils.verifyToken(token, config.JWT_ACCESS_SECRET);

  if (!verified.success) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token",
    );
  }
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Refresh token is no longer valid",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
  });

  if (!user || user.deletedAt || user.status === "SUSPENDED") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Account is not active");
  }

  const tokens = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return issueTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });

  return tokens;
};

const logout = async (token: string | undefined) => {
  if (!token) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const changePassword = async (payload: IChnagePassword, user: RequestUser) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
  });

  if (!dbUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!dbUser.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account uses Google sign-in and has no password.",
    );
  }

  const isCorrect = await bcrypt.compare(payload.oldPassword, dbUser.password);
  if (!isCorrect) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Old password is incorrect");
  }
  const hashed = await bcrypt.hash(
    payload.newPassword,
    config.BCRYPT_SALT_ROUNDS,
  );

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.userId },
      data: { password: hashed },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

export const AuthService = {
  register,
  login,
  logout,
  refreshToken,
  changePassword,
};
