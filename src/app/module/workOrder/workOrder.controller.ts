import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { WorkOrderServices } from "./workOrder.service.js";

const approveServiceRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requestId = req.params.requestId as string;
    const user = req.user!;

    const result = await WorkOrderServices.approveServiceRequest(
      requestId,
      req.body,
      user,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Service Request Approved And Work Order Created Successfully",
      data: result,
    });
  },
);

const rejectServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const requestId = req.params.requestId as string;
  const user = req.user!;

  const result = await WorkOrderServices.rejectServiceRequest(
    requestId,
    req.body,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service Request Rejected Successfully",
    data: result,
  });
});

const getAllWorkOrders = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  const { data, meta } = await WorkOrderServices.getAllWorkOrders(
    req.query,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work Orders Retrieved Successfully",
    data,
    meta,
  });
});

const getMyAssignedWorkOrders = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user!;

    const { data, meta } = await WorkOrderServices.getMyAssignedWorkOrders(
      req.query,
      user,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Assigned Work Orders Retrieved Successfully",
      data,
      meta,
    });
  },
);

const getSingleWorkOrder = catchAsync(async (req: Request, res: Response) => {
  const workOrderId = req.params.workOrderId as string;
  const user = req.user!;

  const result = await WorkOrderServices.getSingleWorkOrder(workOrderId, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work Order Retrieved Successfully",
    data: result,
  });
});

const changeWorkOrderStatus = catchAsync(
  async (req: Request, res: Response) => {
    const workOrderId = req.params.workOrderId as string;
    const user = req.user!;

    const result = await WorkOrderServices.changeWorkOrderStatus(
      workOrderId,
      req.body,
      user,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Work Order Moved To ${result.status} Successfully`,
      data: result,
    });
  },
);

const rescheduleWorkOrder = catchAsync(async (req: Request, res: Response) => {
  const workOrderId = req.params.workOrderId as string;
  const user = req.user!;

  const result = await WorkOrderServices.rescheduleWorkOrder(
    workOrderId,
    req.body,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work Order Rescheduled Successfully",
    data: result,
  });
});

const addPartUsage = catchAsync(async (req: Request, res: Response) => {
  const workOrderId = req.params.workOrderId as string;
  const user = req.user!;

  const result = await WorkOrderServices.addPartUsage(
    workOrderId,
    req.body,
    user,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Part Usage Logged Successfully",
    data: result,
  });
});

export const WorkOrderController = {
  approveServiceRequest,
  rejectServiceRequest,
  getAllWorkOrders,
  getMyAssignedWorkOrders,
  getSingleWorkOrder,
  changeWorkOrderStatus,
  rescheduleWorkOrder,
  addPartUsage,
};
