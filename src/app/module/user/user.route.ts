import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { upload } from "../../middleware/upload";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UpdateUserValidationZodSchema } from "./user.validation";

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
