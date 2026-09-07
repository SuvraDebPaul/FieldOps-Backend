import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums.js";
import type { SiteWhereInput } from "../../../generated/prisma/models.js";
import type { IQuery } from "../../interfaces/index.js";
import { prisma } from "../../lib/prisma.js";
import type { RequestUser } from "../../middleware/checkAuth.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, calculatePagination } from "../../utils/paginate.js";
import type { ICreateSitePayload, IUpdateSitePayload } from "./site.interface.js";

const getCustomerProfileOrThrow = async (userId: string) => {
  const customer = await prisma.customerProfile.findUnique({
    where: { userId },
  });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found");
  }

  return customer;
};

const createSite = async (payload: ICreateSitePayload, user: RequestUser) => {
  const customer = await getCustomerProfileOrThrow(user.userId);

  const site = await prisma.site.create({
    data: { ...payload, customerId: customer.id },
  });

  return site;
};

const getAllSites = async (query: IQuery, user: RequestUser) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

  const andConditions: SiteWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          label: { contains: query.searchTerm as string, mode: "insensitive" },
        },
        {
          address: {
            contains: query.searchTerm as string,
            mode: "insensitive",
          },
        },
        { city: { contains: query.searchTerm as string, mode: "insensitive" } },
      ],
    });
  }

  if (query.city) {
    andConditions.push({
      city: { equals: query.city as string, mode: "insensitive" },
    });
  }

  if (user.role === Role.CUSTOMER) {
    andConditions.push({ customer: { userId: user.userId } });
  } else if (query.customerId) {
    andConditions.push({ customerId: query.customerId as string });
  }

  andConditions.push({ deletedAt: null });

  const where: SiteWhereInput = { AND: andConditions };

  const [data, total] = await Promise.all([
    prisma.site.findMany({
      where,
      take: limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    }),

    prisma.site.count({ where }),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getSingleSite = async (siteId: string, user: RequestUser) => {
  const site = await prisma.site.findFirst({
    where: { id: siteId, deletedAt: null },
    include: { customer: true },
  });

  if (!site) {
    throw new AppError(httpStatus.NOT_FOUND, "Site Not Found");
  }

  if (user.role === Role.CUSTOMER && site.customer.userId !== user.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This Site Does Not Belong To You",
    );
  }

  return site;
};

const updateSite = async (
  siteId: string,
  payload: IUpdateSitePayload,
  user: RequestUser,
) => {
  const customer = await getCustomerProfileOrThrow(user.userId);

  const existing = await prisma.site.findFirst({
    where: { id: siteId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Site Not Found");
  }

  if (existing.customerId !== customer.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This Site Does Not Belong To You",
    );
  }

  const updated = await prisma.site.update({
    where: { id: siteId },
    data: payload,
  });

  return updated;
};

export const SiteServices = {
  createSite,
  getAllSites,
  getSingleSite,
  updateSite,
};
