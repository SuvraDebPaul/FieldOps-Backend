import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import type { UserWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { writeAuditLog } from "../../utils/auditLogger";
import { buildMeta, calculatePagination } from "../../utils/paginate";
import type {
  IUpdateUserRolePayload,
  IUpdateUserStatusPayload,
} from "./admin.interface";

const getAllUsers = async (query: IQuery) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

  const andConditions: UserWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm as string, mode: "insensitive" } },
        {
          email: { contains: query.searchTerm as string, mode: "insensitive" },
        },
        {
          phone: { contains: query.searchTerm as string, mode: "insensitive" },
        },
      ],
    });
  }

  if (query.role) {
    andConditions.push({ role: query.role as Role });
  }

  if (query.status) {
    andConditions.push({ status: query.status as UserStatus });
  }

  andConditions.push({ deletedAt: null });

  const where: UserWhereInput = { AND: andConditions };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
      omit: { password: true },
      include: {
        customer: true,
        technician: { include: { skills: { include: { skill: true } } } },
      },
    }),

    prisma.user.count({ where }),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getSingleUser = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    omit: { password: true },
    include: {
      customer: { include: { sites: true } },
      technician: { include: { skills: { include: { skill: true } } } },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  return user;
};

const updateUserStatus = async (
  userId: string,
  payload: IUpdateUserStatusPayload,
  actor: RequestUser,
) => {
  if (userId === actor.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You Cannot Change Your Own Account Status",
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  if (user.status === payload.status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This Account Is Already ${payload.status}`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: { status: payload.status },
      omit: { password: true },
    });

    if (payload.status === UserStatus.SUSPENDED) {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await writeAuditLog(
      {
        actorId: actor.userId,
        action:
          payload.status === UserStatus.SUSPENDED
            ? "USER_SUSPENDED"
            : "USER_REACTIVATED",
        entity: "User",
        entityId: userId,
        before: { status: user.status },
        after: { status: payload.status, reason: payload.reason ?? null },
      },
      tx,
    );

    return result;
  });

  return updated;
};

const updateUserRole = async (
  userId: string,
  payload: IUpdateUserRolePayload,
  actor: RequestUser,
) => {
  if (userId === actor.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You Cannot Change Your Own Role",
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { customer: true, technician: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  if (user.role === payload.role) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This User Is Already ${payload.role}`,
    );
  }

  if (payload.role === Role.TECHNICIAN && !user.technician) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This User Has No Technician Profile, So They Cannot Be Made A Technician",
    );
  }

  if (payload.role === Role.CUSTOMER && !user.customer) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This User Has No Customer Profile, So They Cannot Be Made A Customer",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: { role: payload.role },
      omit: { password: true },
    });

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog(
      {
        actorId: actor.userId,
        action: "USER_ROLE_CHANGED",
        entity: "User",
        entityId: userId,
        before: { role: user.role },
        after: { role: payload.role },
      },
      tx,
    );

    return result;
  });

  return updated;
};

export const AdminServices = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  updateUserRole,
};
