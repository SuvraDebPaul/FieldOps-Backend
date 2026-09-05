import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IJwtPayload, ILoginPayload, IRegisterPayload } from "./auth.interface";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "../../config";
import { Role } from "../../../generated/prisma/enums";
import crypto from "crypto";
import { jwtUtils } from "../../utils/jwt";
import jwt from "jsonwebtoken";

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

export const AuthService = { register, login };
