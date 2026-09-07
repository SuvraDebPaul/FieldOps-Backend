import type { Role, UserStatus } from "../../../generated/prisma/enums.js";

export interface IUpdateUserStatusPayload {
  status: UserStatus;
  reason?: string;
}

export interface IUpdateUserRolePayload {
  role: Role;
}
