import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { InvoiceController } from "./invoice.controller";

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
