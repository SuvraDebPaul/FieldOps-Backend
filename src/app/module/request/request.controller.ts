import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ServiceRequestServices } from "./request.service.js";

const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  const result = await ServiceRequestServices.createServiceRequest(
    req.body,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service Request Created Successfully",
    data: result,
  });
});

const getAllServiceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;

    const { data, meta } = await ServiceRequestServices.getAllServiceRequests(
      req.query,
      user,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service Requests Retrieved Successfully",
      data,
      meta,
    });
  },
);

const getSingleServiceRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.requestId as string;
    const user = req.user!;

    const result = await ServiceRequestServices.getSingleServiceRequest(
      requestId,
      user,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service Request Retrieved Successfully",
      data: result,
    });
  },
);

const updateServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const requestId = req.params.requestId as string;
  const user = req.user!;

  const result = await ServiceRequestServices.updateServiceRequest(
    requestId,
    req.body,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service Request Updated Successfully",
    data: result,
  });
});

const cancelServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const requestId = req.params.requestId as string;
  const user = req.user!;

  const result = await ServiceRequestServices.cancelServiceRequest(
    requestId,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service Request Cancelled Successfully",
    data: result,
  });
});

const softDeleteServiceRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.requestId as string;

    const result =
      await ServiceRequestServices.softDeleteServiceRequest(requestId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service Request Deleted Successfully",
      data: result,
    });
  },
);

export const ServiceRequestController = {
  createServiceRequest,
  getAllServiceRequests,
  getSingleServiceRequest,
  updateServiceRequest,
  cancelServiceRequest,
  softDeleteServiceRequest,
};
