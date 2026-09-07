import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AdminServices } from "./admin.service.js";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await AdminServices.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users Retrieved Successfully",
    data,
    meta,
  });
});

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  const result = await AdminServices.getSingleUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Retrieved Successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  const result = await AdminServices.updateUserStatus(
    userId,
    req.body,
    req.user!,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User Account ${result.status} Successfully`,
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  const result = await AdminServices.updateUserRole(
    userId,
    req.body,
    req.user!,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Role Updated Successfully",
    data: result,
  });
});

export const AdminController = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  updateUserRole,
};
