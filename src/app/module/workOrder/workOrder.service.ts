import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

// in workOrder.service.ts
const getWorkOrderById = async (id: string, user: RequestUser) => {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id, deletedAt: null },
    include: { technician: true, request: { include: { customer: true } } },
  });

  if (!workOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
  }

  if (
    user.role === Role.TECHNICIAN &&
    workOrder.technician.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This job is not assigned to you");
  }

  if (
    user.role === Role.CUSTOMER &&
    workOrder.request.customer.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This is not your work order");
  }

  return workOrder;
};
