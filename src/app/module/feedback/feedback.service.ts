import httpStatus from "http-status";
import { Role, WorkOrderStatus } from "../../../generated/prisma/enums";
import type { FeedbackWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { writeAuditLog } from "../../utils/auditLogger";
import { buildMeta, calculatePagination } from "../../utils/paginate";
import type { ISubmitFeedbackPayload } from "./feedback.interface";

const submitFeedback = async (
  workOrderId: string,
  payload: ISubmitFeedbackPayload,
  user: RequestUser,
) => {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, deletedAt: null },
    include: {
      technician: true,
      feedback: true,
      request: { include: { customer: true } },
    },
  });

  if (!workOrder) {
    throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
  }

  if (workOrder.request.customer.userId !== user.userId) {
    throw new AppError(httpStatus.FORBIDDEN, "This Is Not Your Work Order");
  }

  if (workOrder.status !== WorkOrderStatus.PAID) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Feedback Can Only Be Submitted After The Work Order Has Been Paid",
    );
  }

  if (workOrder.feedback) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Feedback Has Already Been Submitted For This Work Order",
    );
  }

  const feedback = await prisma.$transaction(async (tx) => {
    const created = await tx.feedback.create({
      data: {
        workOrderId,
        rating: payload.rating,
        comment: payload.comment ?? null,
      },
    });

    const technician = workOrder.technician;
    const previousCount = technician.ratingCount;
    const previousAvg = Number(technician.ratingAvg);

    const nextCount = previousCount + 1;
    const nextAvg =
      Math.round(
        ((previousAvg * previousCount + payload.rating) / nextCount) * 100,
      ) / 100;

    await tx.technicianProfile.update({
      where: { id: technician.id },
      data: { ratingAvg: nextAvg, ratingCount: nextCount },
    });

    await writeAuditLog(
      {
        actorId: user.userId,
        action: "FEEDBACK_SUBMITTED",
        entity: "Feedback",
        entityId: created.id,
        before: { ratingAvg: previousAvg, ratingCount: previousCount },
        after: {
          rating: payload.rating,
          ratingAvg: nextAvg,
          ratingCount: nextCount,
        },
      },
      tx,
    );

    return created;
  });

  return feedback;
};

const feedbackInclude = {
  workOrder: {
    include: {
      technician: { include: { user: { omit: { password: true } } } },
      request: {
        include: {
          category: true,
          site: true,
          customer: { include: { user: { omit: { password: true } } } },
        },
      },
    },
  },
};

const getAllFeedbacks = async (query: IQuery, user: RequestUser) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

  const andConditions: FeedbackWhereInput[] = [];

  if (query.rating) {
    andConditions.push({ rating: Number(query.rating) });
  }

  if (query.technicianId) {
    andConditions.push({
      workOrder: { technicianId: query.technicianId as string },
    });
  }

  if (query.searchTerm) {
    andConditions.push({
      comment: { contains: query.searchTerm as string, mode: "insensitive" },
    });
  }

  if (user.role === Role.CUSTOMER) {
    andConditions.push({
      workOrder: { request: { customer: { userId: user.userId } } },
    });
  }

  if (user.role === Role.TECHNICIAN) {
    andConditions.push({
      workOrder: { technician: { userId: user.userId } },
    });
  }

  const where: FeedbackWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [data, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      take: limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: feedbackInclude,
    }),

    prisma.feedback.count({ where }),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getWorkOrderFeedback = async (workOrderId: string, user: RequestUser) => {
  const feedback = await prisma.feedback.findUnique({
    where: { workOrderId },
    include: feedbackInclude,
  });

  if (!feedback) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No Feedback Has Been Submitted For This Work Order",
    );
  }

  if (
    user.role === Role.CUSTOMER &&
    feedback.workOrder.request.customer.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This Is Not Your Work Order");
  }

  if (
    user.role === Role.TECHNICIAN &&
    feedback.workOrder.technician.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This Job Is Not Assigned To You");
  }

  return feedback;
};

export const FeedbackServices = {
  submitFeedback,
  getAllFeedbacks,
  getWorkOrderFeedback,
};
