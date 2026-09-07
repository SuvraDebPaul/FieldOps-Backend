import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { FeedbackServices } from "./feedback.service.js";

const submitFeedback = catchAsync(async (req: Request, res: Response) => {
  const workOrderId = req.params.workOrderId as string;

  const result = await FeedbackServices.submitFeedback(
    workOrderId,
    req.body,
    req.user!,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Feedback Submitted Successfully",
    data: result,
  });
});

const getAllFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await FeedbackServices.getAllFeedbacks(
    req.query,
    req.user!,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Feedbacks Retrieved Successfully",
    data,
    meta,
  });
});

const getWorkOrderFeedback = catchAsync(async (req: Request, res: Response) => {
  const workOrderId = req.params.workOrderId as string;

  const result = await FeedbackServices.getWorkOrderFeedback(
    workOrderId,
    req.user!,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Feedback Retrieved Successfully",
    data: result,
  });
});

export const FeedbackController = {
  submitFeedback,
  getAllFeedbacks,
  getWorkOrderFeedback,
};
