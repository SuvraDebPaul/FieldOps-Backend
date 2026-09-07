import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AdminController } from "./admin.controller.js";
import {
  UpdateUserRoleValidationZodSchema,
  UpdateUserStatusValidationZodSchema,
} from "./admin.validation.js";

const router = Router();

router.get("/users", auth(Role.ADMIN), AdminController.getAllUsers);

router.get("/users/:userId", auth(Role.ADMIN), AdminController.getSingleUser);

router.patch(
  "/users/:userId/status",
  auth(Role.ADMIN),
  validateRequest(UpdateUserStatusValidationZodSchema),
  AdminController.updateUserStatus,
);

router.patch(
  "/users/:userId/role",
  auth(Role.ADMIN),
  validateRequest(UpdateUserRoleValidationZodSchema),
  AdminController.updateUserRole,
);

export const AdminRoutes = router;
