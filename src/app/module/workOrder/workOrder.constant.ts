import { Role, WorkOrderStatus } from "../../../generated/prisma/enums";

export const WORK_ORDER_TRANSITIONS: Record<
  WorkOrderStatus,
  WorkOrderStatus[]
> = {
  ASSIGNED: [WorkOrderStatus.SCHEDULED, WorkOrderStatus.CANCELLED],
  SCHEDULED: [WorkOrderStatus.EN_ROUTE, WorkOrderStatus.CANCELLED],
  EN_ROUTE: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  IN_PROGRESS: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
  COMPLETED: [WorkOrderStatus.INVOICED],
  INVOICED: [WorkOrderStatus.PAID],
  PAID: [],
  CANCELLED: [],
};

export const WORK_ORDER_TRANSITION_ROLES: Record<WorkOrderStatus, Role[]> = {
  ASSIGNED: [],
  SCHEDULED: [Role.ADMIN],
  EN_ROUTE: [Role.TECHNICIAN],
  IN_PROGRESS: [Role.TECHNICIAN],
  COMPLETED: [Role.TECHNICIAN],
  INVOICED: [Role.ADMIN],

  PAID: [],
  CANCELLED: [Role.ADMIN],
};

export const ACTIVE_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.EN_ROUTE,
  WorkOrderStatus.IN_PROGRESS,
];
