import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authLimiter } from "../../middleware/rateLimiter";
import {
  LoginValidationZodSchema,
  RegisterValidationZodSchema,
} from "./auth.validation";
import { AuthController } from "./auth.controller";

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

export const AuthRoutes = router;
