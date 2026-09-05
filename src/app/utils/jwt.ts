import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { success } from "zod";

const createToken = (
  payload: JwtPayload,
  secret: string,
  expiresIn: string,
): string => {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const verifyToken = (token: string, secret: string) => {
  try {
    return {
      success: true as const,
      data: jwt.verify(token, secret) as JwtPayload,
    };
  } catch (error) {
    return {
      success: false as const,
      error: (error as Error).message,
    };
  }
};

export const jwtUtils = { createToken, verifyToken };
