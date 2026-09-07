import httpStatus from "http-status";
import type { ServiceCategoryWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, calculatePagination } from "../../utils/paginate";
import type {
  ICreateServiceCategoryPayload,
  ICreateSkillPayload,
  IUpdateServiceCategoryPayload,
} from "./catalog.interface";

const getAllServiceCategories = async (query: IQuery) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(
    query,
    "name",
  );

  const andConditions: ServiceCategoryWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm as string, mode: "insensitive" } },
        {
          description: {
            contains: query.searchTerm as string,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (query.requiredSkillId) {
    andConditions.push({ requiredSkillId: query.requiredSkillId as string });
  }

  andConditions.push({ isActive: true, deletedAt: null });

  const where: ServiceCategoryWhereInput = { AND: andConditions };

  const [data, total] = await Promise.all([
    prisma.serviceCategory.findMany({
      where,
      take: limit,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: { requiredSkill: true },
    }),

    prisma.serviceCategory.count({ where }),
  ]);

  return { data, meta: buildMeta(page, limit, total) };
};

const getSingleServiceCategory = async (categoryId: string) => {
  const category = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, deletedAt: null },
    include: { requiredSkill: true },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Category Not Found");
  }

  return category;
};

const createServiceCategory = async (
  payload: ICreateServiceCategoryPayload,
) => {
  const skill = await prisma.skill.findUnique({
    where: { id: payload.requiredSkillId },
  });

  if (!skill) {
    throw new AppError(httpStatus.NOT_FOUND, "Required Skill Not Found");
  }

  const category = await prisma.serviceCategory.create({
    data: payload,
    include: { requiredSkill: true },
  });

  return category;
};

const updateServiceCategory = async (
  categoryId: string,
  payload: IUpdateServiceCategoryPayload,
) => {
  const existing = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Category Not Found");
  }

  if (payload.requiredSkillId) {
    const skill = await prisma.skill.findUnique({
      where: { id: payload.requiredSkillId },
    });

    if (!skill) {
      throw new AppError(httpStatus.NOT_FOUND, "Required Skill Not Found");
    }
  }

  const updated = await prisma.serviceCategory.update({
    where: { id: categoryId },
    data: payload,
    include: { requiredSkill: true },
  });

  return updated;
};

const softDeleteServiceCategory = async (categoryId: string) => {
  const existing = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Category Not Found");
  }

  const deleted = await prisma.serviceCategory.update({
    where: { id: categoryId },
    data: { deletedAt: new Date(), isActive: false },
  });

  return deleted;
};

const getAllSkills = async () => {
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { technicians: true, categories: true } },
    },
  });

  return skills;
};

const createSkill = async (payload: ICreateSkillPayload) => {
  const skill = await prisma.skill.create({ data: payload });

  return skill;
};

export const CatalogServices = {
  getAllServiceCategories,
  getSingleServiceCategory,
  createServiceCategory,
  updateServiceCategory,
  softDeleteServiceCategory,
  getAllSkills,
  createSkill,
};
