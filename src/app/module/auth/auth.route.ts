import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authLimiter } from "../../middleware/rateLimiter";
import {
  ChangePasswordValidationZodSchema,
  GoogleLoginValidationZodSchema,
  LoginValidationZodSchema,
  RegisterValidationZodSchema,
} from "./auth.validation";
import { AuthController } from "./auth.controller";
import { auth } from "../../middleware/checkAuth";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validateRequest(RegisterValidationZodSchema),
  AuthController.register,
);

router.post(
  "/login",
  authLimiter,
  validateRequest(LoginValidationZodSchema),
  AuthController.login,
);

router.post(
  "/google",
  authLimiter,
  validateRequest(GoogleLoginValidationZodSchema),
  AuthController.googleLogin,
);

router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);
router.post(
  "/change-password",
  auth(),
  validateRequest(ChangePasswordValidationZodSchema),
  AuthController.changePassword,
);

export const AuthRoutes = router;
