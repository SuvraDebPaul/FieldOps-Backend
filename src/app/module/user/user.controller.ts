import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMe(req.user!);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateMe(req.user!, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const updateAvatar = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateAvatar(req.user!, req.file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Avatar updated successfully",
    data: result,
  });
});

export const UserController = {
  getMe,
  updateMe,
  updateAvatar,
};
