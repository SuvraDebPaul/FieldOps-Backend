import { Role, WorkOrderStatus } from "../../../generated/prisma/enums";

/**
 * The work-order lifecycle, in one place.
 *
 * A free-form `PATCH /status` that accepts any value is the single most common
 * way this domain goes wrong: a job could jump straight from ASSIGNED to PAID.
 * Every transition is checked against this map instead.
 *
 *   ASSIGNED -> SCHEDULED -> EN_ROUTE -> IN_PROGRESS -> COMPLETED -> INVOICED -> PAID
 *        |          |           |            |
 *        +----------+-----------+------------+--> CANCELLED (admin only, with reason)
 */
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

/**
 * Who may drive each transition. A legal transition performed by the wrong
 * actor is still a 403 — the field technician runs the job, the dispatcher
 * schedules and cancels it, and only the verified Stripe webhook marks it PAID.
 */
export const WORK_ORDER_TRANSITION_ROLES: Record<WorkOrderStatus, Role[]> = {
	ASSIGNED: [],
	SCHEDULED: [Role.ADMIN],
	EN_ROUTE: [Role.TECHNICIAN],
	IN_PROGRESS: [Role.TECHNICIAN],
	COMPLETED: [Role.TECHNICIAN],
	INVOICED: [Role.ADMIN],
	// Reached only through the payment webhook, never through the status route.
	PAID: [],
	CANCELLED: [Role.ADMIN],
};

// Statuses that occupy a technician's calendar. Mirrors the WHERE clause of the
// no_technician_double_booking exclusion constraint.
export const ACTIVE_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
	WorkOrderStatus.ASSIGNED,
	WorkOrderStatus.SCHEDULED,
	WorkOrderStatus.EN_ROUTE,
	WorkOrderStatus.IN_PROGRESS,
];
