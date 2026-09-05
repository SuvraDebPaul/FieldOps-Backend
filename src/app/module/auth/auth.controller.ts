import config from "../../config";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ILoginPayload } from "./auth.interface";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import httpStatus from "http-status";

const isProd = config.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  maxAge: 24 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Account Created Successfully",
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await AuthService.login(req.body);

  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged in successfully",
    data: { accessToken, refreshToken, user },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req?.cookies?.refreshToken || req.body?.refreshToken;
  const tokens = await AuthService.refreshToken(token);

  res.cookie("accessToken", tokens.accessToken, accessCookieOptions);
  res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refreshed successfully",
    data: tokens,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logout(req.cookies?.refreshToken || req.body?.refreshToken);

  res.clearCookie("accessToken", accessCookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.changePassword(req.body, req.user!);

  res.clearCookie("accessToken", accessCookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully. Please log in again.",
    data: null,
  });
});

export const AuthController = {
  register,
  login,
  logout,
  refreshToken,
  changePassword,
};
