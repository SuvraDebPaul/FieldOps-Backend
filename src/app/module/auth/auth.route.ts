import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import {
  ChangePasswordValidationZodSchema,
  GoogleLoginValidationZodSchema,
  LoginValidationZodSchema,
  RegisterValidationZodSchema,
} from "./auth.validation.js";
import { AuthController } from "./auth.controller.js";
import { auth } from "../../middleware/checkAuth.js";

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
