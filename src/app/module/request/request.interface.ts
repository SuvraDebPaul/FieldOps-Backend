import { Priority } from "../../../generated/prisma/enums";

export interface ICreateServiceRequestPayload {
	siteId: string;
	categoryId: string;
	title: string;
	description: string;
	priority?: Priority;
	preferredAt?: string;
}

export interface IUpdateServiceRequestPayload {
	siteId?: string;
	categoryId?: string;
	title?: string;
	description?: string;
	priority?: Priority;
	preferredAt?: string;
}
