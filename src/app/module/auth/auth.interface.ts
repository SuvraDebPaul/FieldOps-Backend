import { Role } from "../../../generated/prisma/enums";

export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName: string;
  billingAddr: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}
export interface IChnagePassword {
  oldPassword: string;
  newPassword: string;
}
