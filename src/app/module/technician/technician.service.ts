import { prisma } from "../../lib/prisma";
import type { ITechnicianFilterQuery } from "../user/user.interface";

const getTechnicians = async (query: ITechnicianFilterQuery) => {
  const {
    skill,
    city,
    available,
    searchTerm,
    page = "1",
    limit = "10",
  } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const andConditions: any[] = [{ user: { deletedAt: null } }];

  if (city) {
    andConditions.push({
      baseCity: { contains: city, mode: "insensitive" },
    });
  }

  if (available !== undefined) {
    andConditions.push({
      isAvailable: available === "true",
    });
  }

  if (skill) {
    andConditions.push({
      skills: {
        some: {
          skill: {
            name: { contains: skill, mode: "insensitive" },
          },
        },
      },
    });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { baseCity: { contains: searchTerm, mode: "insensitive" } },
        { employeeCode: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, data] = await Promise.all([
    prisma.technicianProfile.count({ where }),
    prisma.technicianProfile.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { ratingAvg: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
          },
        },
        skills: {
          include: {
            skill: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage: Math.ceil(total / limitNum),
    },
    data,
  };
};

export const TechnicianService = {
  getTechnicians,
};
