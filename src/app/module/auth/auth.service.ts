import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  IChnagePassword,
  IJwtPayload,
  ILoginPayload,
  IRegisterPayload,
} from "./auth.interface.js";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import config from "../../config/index.js";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import crypto from "crypto";
import { jwtUtils } from "../../utils/jwt.js";
import jwt from "jsonwebtoken";
import { RequestUser } from "../../middleware/checkAuth.js";
import { verifyGoogleIdToken } from "../../lib/googleAuth.js";

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

  const decoded = jwt.decode(refreshToken) as { exp?: number };

  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

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

const googleLogin = async (idToken: string) => {
  const payload = await verifyGoogleIdToken(idToken);

  const email = payload.email;
  if (!email) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Google account email is required.",
    );
  }
  const name = payload.name || payload.given_name || "Google User";
  const googleId = payload.sub;
  const avatarUrl = payload.picture;

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { googleId }],
    },
    include: { customer: true },
  });

  if (user) {
    if (user.deletedAt) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Your account has been deactivated. Please contact support.",
      );
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Your account has been suspended. Please contact support.",
      );
    }
    if (!user.googleId || !user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: user.avatarUrl || avatarUrl,
        },
        include: { customer: true },
      });
    }
  } else {
    user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          name,
          email,
          googleId,
          avatarUrl,
          provider: AuthProvider.GOOGLE,
          role: Role.CUSTOMER,
          customer: {
            create: {
              companyName: `${name}'s Company`,
              billingAddr: "Not provided",
            },
          },
        },
        include: { customer: true },
      });
    });
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
  googleLogin,
};
