import { OAuth2Client } from "google-auth-library";
import config from "../config/index.js";
import httpStatus from "http-status";
import { AppError } from "../utils/AppError.js";

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export const verifyGoogleIdToken = async (idToken: string) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid Google token payload. Email not found.",
      );
    }

    return payload;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      `Google authentication failed: ${error?.message || "Invalid ID token"}`,
    );
  }
};
