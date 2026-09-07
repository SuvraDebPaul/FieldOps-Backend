import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { upload } from "../../middleware/upload.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { UserController } from "./user.controller.js";
import { UpdateUserValidationZodSchema } from "./user.validation.js";

const router = Router();

router.get("/me", auth(), UserController.getMe);

router.patch(
  "/me",
  auth(),
  validateRequest(UpdateUserValidationZodSchema),
  UserController.updateMe,
);

router.patch(
  "/me/avatar",
  auth(),
  upload.single("avatar"),
  UserController.updateAvatar,
);

export const UserRoutes = router;
