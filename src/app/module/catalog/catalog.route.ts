import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CatalogController } from "./catalog.controller";
import {
  CreateServiceCategoryValidationZodSchema,
  CreateSkillValidationZodSchema,
  UpdateServiceCategoryValidationZodSchema,
} from "./catalog.validation";

const categoryRouter = Router();
const skillRouter = Router();

categoryRouter.get("/", CatalogController.getAllServiceCategories);

categoryRouter.get("/:categoryId", CatalogController.getSingleServiceCategory);

categoryRouter.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CreateServiceCategoryValidationZodSchema),
  CatalogController.createServiceCategory,
);

categoryRouter.patch(
  "/:categoryId",
  auth(Role.ADMIN),
  validateRequest(UpdateServiceCategoryValidationZodSchema),
  CatalogController.updateServiceCategory,
);

categoryRouter.delete(
  "/:categoryId",
  auth(Role.ADMIN),
  CatalogController.softDeleteServiceCategory,
);

skillRouter.get("/", CatalogController.getAllSkills);

skillRouter.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CreateSkillValidationZodSchema),
  CatalogController.createSkill,
);

export const ServiceCategoryRoutes = categoryRouter;
export const SkillRoutes = skillRouter;
