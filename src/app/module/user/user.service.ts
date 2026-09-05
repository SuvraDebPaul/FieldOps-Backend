import httpStatus from "http-status";
import { RequestUser } from "../../middleware/checkAuth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { deleteFromCloudinary, uploadToCloudinary } from "../../lib/cloudinary";
import { Role } from "../../../generated/prisma/enums";
import { IUpdateUserPayload } from "./user.interface";

const getMe = async (user: RequestUser) => {
  const profile = await prisma.user.findUnique({
    where: { id: user.userId, deletedAt: null },
    omit: { password: true },
    include: {
      customer: {
        include: {
          sites: {
            where: { deletedAt: null },
          },
        },
      },
      technician: {
        include: {
          skills: {
            include: { skill: true },
          },
        },
      },
    },
  });
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }
  return profile;
};

const updateMe = async (user: RequestUser, payload: IUpdateUserPayload) => {
  const { name, phone, companyName, billingAddr } = payload;
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
      },
      omit: { password: true },
      include: { customer: true, technician: true },
    });
    if (user.role === Role.CUSTOMER && (companyName || billingAddr)) {
      await tx.customerProfile.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          companyName: companyName || `${user.name}'s Company`,
          billingAddr: billingAddr || "Not provided",
        },
        update: {
          ...(companyName && { companyName }),
          ...(billingAddr && { billingAddr }),
        },
      });
    }
    return tx.user.findUnique({
      where: { id: user.userId },
      omit: { password: true },
      include: {
        customer: true,
        technician: true,
      },
    });
  });
  return updatedUser;
};

const updateAvatar = async (user: RequestUser, file?: Express.Multer.File) => {
  if (!file) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Please provide an image file to upload",
    );
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { avatarPublicId: true },
  });
  if (currentUser?.avatarPublicId) {
    await deleteFromCloudinary(currentUser.avatarPublicId);
  }
  const uploadResult = await uploadToCloudinary(file, "fieldops/avatars");
  const updated = await prisma.user.update({
    where: { id: user.userId },
    data: {
      avatarUrl: uploadResult.secure_url,
      avatarPublicId: uploadResult.public_id,
    },
    omit: { password: true },
  });
  return {
    avatarUrl: updated.avatarUrl,
    avatarPublicId: updated.avatarPublicId,
  };
};
export const UserService = {
  getMe,
  updateMe,
  updateAvatar,
};
