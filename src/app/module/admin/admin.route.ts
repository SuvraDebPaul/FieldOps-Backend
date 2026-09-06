import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import {
	UpdateUserRoleValidationZodSchema,
	UpdateUserStatusValidationZodSchema,
} from "./admin.validation";

const router = Router();

// Every route here is ADMIN-only.
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
