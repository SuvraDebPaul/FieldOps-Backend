import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { TechnicianService } from "./technician.service.js";

const getTechnicians = catchAsync(async (req: Request, res: Response) => {
  const result = await TechnicianService.getTechnicians(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Technicians retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const TechnicianController = {
  getTechnicians,
};
