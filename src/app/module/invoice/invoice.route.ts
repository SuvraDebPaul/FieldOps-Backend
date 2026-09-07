import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { InvoiceController } from "./invoice.controller.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.TECHNICIAN),
  InvoiceController.getAllInvoices,
);

router.get(
  "/:invoiceId",
  auth(Role.ADMIN, Role.CUSTOMER, Role.TECHNICIAN),
  InvoiceController.getSingleInvoice,
);

export const InvoiceRoutes = router;
