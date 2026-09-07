import httpStatus from "http-status";
import {
  RequestStatus,
  Role,
  WorkOrderStatus,
} from "../../../generated/prisma/enums";
import type { WorkOrderWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import { SERIALIZABLE_TX } from "../../lib/transaction";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { writeAuditLog } from "../../utils/auditLogger";
import { generateWorkOrderCode } from "../../utils/codeGenerator";
import { buildMeta, calculatePagination } from "../../utils/paginate";
import {
  ACTIVE_WORK_ORDER_STATUSES,
  WORK_ORDER_TRANSITIONS,
  WORK_ORDER_TRANSITION_ROLES,
} from "./workOrder.constant";
import type {
  IAddPartUsagePayload,
  IApproveServiceRequestPayload,
  IChangeWorkOrderStatusPayload,
  IRejectServiceRequestPayload,
  IRescheduleWorkOrderPayload,
} from "./workOrder.interface";

const assertValidWindow = (startISO: string, endISO: string) => {
  const start = new Date(startISO);
  const end = new Date(endISO);

  if (end <= start) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "scheduledEnd Must Be After scheduledStart",
    );
  }

  return { start, end };
};

const approveServiceRequest = async (
  requestId: string,
  payload: IApproveServiceRequestPayload,
  user: RequestUser,
) => {
  const { start, end } = assertValidWindow(
    payload.scheduledStart,
    payload.scheduledEnd,
  );

  return prisma.$transaction(async (tx) => {
    const serviceRequest = await tx.serviceRequest.findFirst({
      where: { id: requestId, deletedAt: null },
      include: { category: true },
    });

    if (!serviceRequest) {
      throw new AppError(httpStatus.NOT_FOUND, "Service Request Not Found");
    }

    if (serviceRequest.status !== RequestStatus.PENDING) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Only A Pending Request Can Be Approved",
      );
    }

    const technician = await tx.technicianProfile.findUnique({
      where: { id: payload.technicianId },
      include: { user: { select: { status: true, deletedAt: true } } },
    });

    if (!technician || technician.user.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, "Technician Not Found");
    }

    if (!technician.isAvailable || technician.user.status === "SUSPENDED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This Technician Is Not Currently Available",
      );
    }

    const hasRequiredSkill = await tx.technicianSkill.findUnique({
      where: {
        technicianId_skillId: {
          technicianId: technician.id,
          skillId: serviceRequest.category.requiredSkillId,
        },
      },
    });

    if (!hasRequiredSkill) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This Technician Does Not Have The Skill Required For This Service Category",
      );
    }

    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    const jobsThatDay = await tx.workOrder.count({
      where: {
        technicianId: technician.id,
        deletedAt: null,
        status: { in: ACTIVE_WORK_ORDER_STATUSES },
        scheduledStart: { gte: dayStart, lte: dayEnd },
      },
    });

    if (jobsThatDay >= technician.maxDailyJobs) {
      throw new AppError(
        httpStatus.CONFLICT,
        `This Technician Has Reached The Daily Limit Of ${technician.maxDailyJobs} Jobs`,
      );
    }

    const code = await generateWorkOrderCode(tx);

    const workOrder = await tx.workOrder.create({
      data: {
        code,
        requestId: serviceRequest.id,
        technicianId: technician.id,
        scheduledStart: start,
        scheduledEnd: end,
        status: WorkOrderStatus.ASSIGNED,
      },
    });

    await tx.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: RequestStatus.CONVERTED },
    });

    await tx.workOrderHistory.create({
      data: {
        workOrderId: workOrder.id,
        fromStatus: null,
        toStatus: WorkOrderStatus.ASSIGNED,
        changedById: user.userId,
        note: "Work order created from approved service request",
      },
    });

    await writeAuditLog(
      {
        actorId: user.userId,
        action: "WORK_ORDER_ASSIGNED",
        entity: "WorkOrder",
        entityId: workOrder.id,
        after: {
          code: workOrder.code,
          technicianId: technician.id,
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        },
      },
      tx,
    );

    return workOrder;
  }, SERIALIZABLE_TX);
};

const rejectServiceRequest = async (
  requestId: string,
  payload: IRejectServiceRequestPayload,
  user: RequestUser,
) => {
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: requestId, deletedAt: null },
  });

  if (!serviceRequest) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Request Not Found");
  }

  if (serviceRequest.status !== RequestStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only A Pending Request Can Be Rejected",
    );
  }

  const rejected = await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.REJECTED,
      rejectReason: payload.rejectReason,
    },
  });

  await writeAuditLog({
    actorId: user.userId,
    action: "SERVICE_REQUEST_REJECTED",
    entity: "ServiceRequest",
    entityId: requestId,
    before: { status: serviceRequest.status },
    after: { status: RequestStatus.REJECTED, reason: payload.rejectReason },
  });

  return rejected;
};

const buildWorkOrderFilters = (query: IQuery): WorkOrderWhereInput[] => {
  const andConditions: WorkOrderWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { code: { contains: query.searchTerm as string, mode: "insensitive" } },
        {
          request: {
            title: {
              contains: query.searchTerm as string,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  if (query.status) {
    andConditions.push({ status: query.status as WorkOrderStatus });
  }

  if (query.technicianId) {
    andConditions.push({ technicianId: query.technicianId as string });
  }

  if (query.from || query.to) {
    andConditions.push({
      scheduledStart: {
        ...(query.from ? { gte: new Date(query.from as string) } : {}),
        ...(query.to ? { lte: new Date(query.to as string) } : {}),
      },
    });
  }

  andConditions.push({ deletedAt: null });

  return andConditions;
};

const workOrderInclude = {
  technician: {
    include: { user: { omit: { password: true } } },
  },
  request: {
    include: {
      site: true,
      category: true,
      customer: { include: { user: { omit: { password: true } } } },
    },
  },
  parts: true,
  invoice: true,
};

const getAllWorkOrders = async (query: IQuery, user: RequestUser) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(
    query,
    "scheduledStart",
  );

  const andConditions = buildWorkOrderFilters(query);

  if (user.role === Role.TECHNICIAN) {
    andConditions.push({ technician: { userId: user.userId } });
  }

  if (user.role === Role.CUSTOMER) {
    andConditions.push({ request: { customer: { userId: user.userId } } });
  }

  const where: WorkOrderWhereInput = { AND: andConditions };

  const [data, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      take: limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: workOrderInclude,
    }),

    prisma.workOrder.count({ where }),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getMyAssignedWorkOrders = async (query: IQuery, user: RequestUser) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(
    query,
    "scheduledStart",
  );

  const andConditions = buildWorkOrderFilters(query);
  andConditions.push({ technician: { userId: user.userId } });

  const where: WorkOrderWhereInput = { AND: andConditions };

  const [data, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      take: limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: workOrderInclude,
    }),

    prisma.workOrder.count({ where }),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getSingleWorkOrder = async (workOrderId: string, user: RequestUser) => {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, deletedAt: null },
    include: {
      ...workOrderInclude,
      history: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!workOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
  }

  if (
    user.role === Role.TECHNICIAN &&
    workOrder.technician.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This Job Is Not Assigned To You");
  }

  if (
    user.role === Role.CUSTOMER &&
    workOrder.request.customer.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This Is Not Your Work Order");
  }

  return workOrder;
};

const changeWorkOrderStatus = async (
  workOrderId: string,
  payload: IChangeWorkOrderStatusPayload,
  user: RequestUser,
) => {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, deletedAt: null },
    include: { technician: true },
  });

  if (!workOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
  }

  const allowedNext = WORK_ORDER_TRANSITIONS[workOrder.status];

  if (!allowedNext.includes(payload.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot Move A Work Order From ${workOrder.status} To ${payload.status}`,
    );
  }

  const allowedRoles = WORK_ORDER_TRANSITION_ROLES[payload.status];

  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your Role Is Not Allowed To Move A Work Order To ${payload.status}`,
    );
  }

  if (
    user.role === Role.TECHNICIAN &&
    workOrder.technician.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This Job Is Not Assigned To You");
  }

  if (payload.status === WorkOrderStatus.CANCELLED && !payload.cancelReason) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A Cancellation Reason Is Required",
    );
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: payload.status,
        diagnosis: payload.diagnosis ?? undefined,
        workSummary: payload.workSummary ?? undefined,
        cancelReason: payload.cancelReason ?? undefined,

        actualStart:
          payload.status === WorkOrderStatus.IN_PROGRESS
            ? (workOrder.actualStart ?? now)
            : undefined,
        actualEnd:
          payload.status === WorkOrderStatus.COMPLETED ? now : undefined,
      },
    });

    await tx.workOrderHistory.create({
      data: {
        workOrderId,
        fromStatus: workOrder.status,
        toStatus: payload.status,
        changedById: user.userId,
        note: payload.note ?? payload.cancelReason ?? null,
      },
    });

    await writeAuditLog(
      {
        actorId: user.userId,
        action: `WORK_ORDER_${payload.status}`,
        entity: "WorkOrder",
        entityId: workOrderId,
        before: { status: workOrder.status },
        after: { status: payload.status },
      },
      tx,
    );

    return result;
  });

  return updated;
};

const rescheduleWorkOrder = async (
  workOrderId: string,
  payload: IRescheduleWorkOrderPayload,
  user: RequestUser,
) => {
  const { start, end } = assertValidWindow(
    payload.scheduledStart,
    payload.scheduledEnd,
  );

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, deletedAt: null },
  });

  if (!workOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
  }

  if (!ACTIVE_WORK_ORDER_STATUSES.includes(workOrder.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `A Work Order That Is ${workOrder.status} Cannot Be Rescheduled`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.workOrder.update({
      where: { id: workOrderId },
      data: { scheduledStart: start, scheduledEnd: end },
    });

    await tx.workOrderHistory.create({
      data: {
        workOrderId,
        fromStatus: workOrder.status,
        toStatus: workOrder.status,
        changedById: user.userId,
        note: payload.note ?? "Work order rescheduled",
      },
    });

    await writeAuditLog(
      {
        actorId: user.userId,
        action: "WORK_ORDER_RESCHEDULED",
        entity: "WorkOrder",
        entityId: workOrderId,
        before: {
          scheduledStart: workOrder.scheduledStart.toISOString(),
          scheduledEnd: workOrder.scheduledEnd.toISOString(),
        },
        after: {
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
        },
      },
      tx,
    );

    return result;
  });

  return updated;
};

const addPartUsage = async (
  workOrderId: string,
  payload: IAddPartUsagePayload,
  user: RequestUser,
) => {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, deletedAt: null },
    include: { technician: true },
  });

  if (!workOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
  }

  if (workOrder.technician.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "This Job Is Not Assigned To You");
  }

  if (
    workOrder.status !== WorkOrderStatus.IN_PROGRESS &&
    workOrder.status !== WorkOrderStatus.EN_ROUTE
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Parts Can Only Be Logged While The Job Is En Route Or In Progress",
    );
  }

  const part = await prisma.partUsage.create({
    data: {
      workOrderId,
      name: payload.name,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
    },
  });

  return part;
};

export const WorkOrderServices = {
  approveServiceRequest,
  rejectServiceRequest,
  getAllWorkOrders,
  getMyAssignedWorkOrders,
  getSingleWorkOrder,
  changeWorkOrderStatus,
  rescheduleWorkOrder,
  addPartUsage,
};
