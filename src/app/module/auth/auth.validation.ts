import z from "zod";

export const RegisterValidationZodSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email address")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().trim().min(6, "Invalid phone number").optional(),
  companyName: z.string().trim().min(2, "Company name is required"),
  billingAddr: z.string().trim().min(5, "Billing address is required"),
});

export const LoginValidationZodSchema = z.object({
  email: z.email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const GoogleLoginValidationZodSchema = z.object({
  idToken: z.string().min(10, "Google id_token is required"),
});

export const ChangePasswordValidationZodSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});
