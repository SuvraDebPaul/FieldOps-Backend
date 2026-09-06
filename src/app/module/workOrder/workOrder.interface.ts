import { WorkOrderStatus } from "../../../generated/prisma/enums";

export interface IApproveServiceRequestPayload {
	technicianId: string;
	scheduledStart: string;
	scheduledEnd: string;
}

export interface IRejectServiceRequestPayload {
	rejectReason: string;
}

export interface IChangeWorkOrderStatusPayload {
	status: WorkOrderStatus;
	note?: string;
	diagnosis?: string;
	workSummary?: string;
	cancelReason?: string;
}

export interface IRescheduleWorkOrderPayload {
	scheduledStart: string;
	scheduledEnd: string;
	note?: string;
}

export interface IAddPartUsagePayload {
	name: string;
	quantity: number;
	unitPrice: number;
}
