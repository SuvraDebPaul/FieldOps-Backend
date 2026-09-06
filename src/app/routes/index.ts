import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { TechnicianRoutes } from "../module/technician/technician.route";
import { ServiceRequestRoutes } from "../module/request/request.route";
import { WorkOrderRoutes } from "../module/workOrder/workOrder.route";
import { InvoiceRoutes } from "../module/invoice/invoice.route";

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/technicians", route: TechnicianRoutes },
  { path: "/requests", route: ServiceRequestRoutes },
  { path: "/work-orders", route: WorkOrderRoutes },
  { path: "/invoices", route: InvoiceRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
