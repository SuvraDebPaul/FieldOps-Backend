import httpStatus from "http-status";
import { Priority, RequestStatus, Role } from "../../../generated/prisma/enums";
import type { ServiceRequestWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { generateRequestCode } from "../../utils/codeGenerator";
import { buildMeta, calculatePagination } from "../../utils/paginate";
import type {
	ICreateServiceRequestPayload,
	IUpdateServiceRequestPayload,
} from "./request.interface";

/**
 * Every customer-facing read goes through this, so a customer can never reach
 * another company's data. Admins bypass it.
 */
const getCustomerProfileOrThrow = async (userId: string) => {
	const customer = await prisma.customerProfile.findUnique({
		where: { userId },
	});

	if (!customer) {
		throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found");
	}

	return customer;
};

const createServiceRequest = async (
	payload: ICreateServiceRequestPayload,
	user: RequestUser,
) => {
	const customer = await getCustomerProfileOrThrow(user.userId);

	// The site must exist AND belong to this customer, otherwise a customer
	// could raise a request against another company's plant.
	const site = await prisma.site.findFirst({
		where: {
			id: payload.siteId,
			customerId: customer.id,
			deletedAt: null,
		},
	});

	if (!site) {
		throw new AppError(httpStatus.NOT_FOUND, "Site Not Found For This Customer");
	}

	const category = await prisma.serviceCategory.findFirst({
		where: {
			id: payload.categoryId,
			isActive: true,
			deletedAt: null,
		},
	});

	if (!category) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Service Category Not Found Or Inactive",
		);
	}

	const code = await generateRequestCode();

	const serviceRequest = await prisma.serviceRequest.create({
		data: {
			code,
			customerId: customer.id,
			siteId: payload.siteId,
			categoryId: payload.categoryId,
			title: payload.title,
			description: payload.description,
			priority: payload.priority ?? Priority.NORMAL,
			preferredAt: payload.preferredAt ? new Date(payload.preferredAt) : null,
		},
		include: {
			site: true,
			category: true,
		},
	});

	return serviceRequest;
};

const getAllServiceRequests = async (query: IQuery, user: RequestUser) => {
	const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

	const andConditions: ServiceRequestWhereInput[] = [];

	// Searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ code: { contains: query.searchTerm as string, mode: "insensitive" } },
				{ title: { contains: query.searchTerm as string, mode: "insensitive" } },
				{
					description: {
						contains: query.searchTerm as string,
						mode: "insensitive",
					},
				},
			],
		});
	}

	// Filtering
	if (query.status) {
		andConditions.push({ status: query.status as RequestStatus });
	}

	if (query.priority) {
		andConditions.push({ priority: query.priority as Priority });
	}

	if (query.categoryId) {
		andConditions.push({ categoryId: query.categoryId as string });
	}

	if (query.siteId) {
		andConditions.push({ siteId: query.siteId as string });
	}

	// Role scoping lives here, not in the route: one endpoint, two audiences.
	if (user.role === Role.CUSTOMER) {
		const customer = await getCustomerProfileOrThrow(user.userId);
		andConditions.push({ customerId: customer.id });
	}

	andConditions.push({ deletedAt: null });

	const where: ServiceRequestWhereInput = { AND: andConditions };

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: {
				site: true,
				category: true,
				customer: {
					include: {
						user: { omit: { password: true } },
					},
				},
				workOrder: { select: { id: true, code: true, status: true } },
			},
		}),

		prisma.serviceRequest.count({ where }),
	]);

	return { data, meta: buildMeta(page, limit, total) };
};

const getSingleServiceRequest = async (requestId: string, user: RequestUser) => {
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id: requestId, deletedAt: null },
		include: {
			site: true,
			category: true,
			customer: {
				include: { user: { omit: { password: true } } },
			},
			workOrder: {
				include: {
					technician: {
						include: { user: { omit: { password: true } } },
					},
				},
			},
		},
	});

	if (!serviceRequest) {
		throw new AppError(httpStatus.NOT_FOUND, "Service Request Not Found");
	}

	// Ownership check, not just a role check.
	if (
		user.role === Role.CUSTOMER &&
		serviceRequest.customer.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"This Service Request Does Not Belong To You",
		);
	}

	return serviceRequest;
};

const updateServiceRequest = async (
	requestId: string,
	payload: IUpdateServiceRequestPayload,
	user: RequestUser,
) => {
	const customer = await getCustomerProfileOrThrow(user.userId);

	const existing = await prisma.serviceRequest.findFirst({
		where: { id: requestId, deletedAt: null },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Service Request Not Found");
	}

	if (existing.customerId !== customer.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"This Service Request Does Not Belong To You",
		);
	}

	// Once a dispatcher has acted on it, the customer can no longer edit it.
	if (existing.status !== RequestStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only A Pending Request Can Be Edited",
		);
	}

	if (payload.siteId) {
		const site = await prisma.site.findFirst({
			where: { id: payload.siteId, customerId: customer.id, deletedAt: null },
		});

		if (!site) {
			throw new AppError(
				httpStatus.NOT_FOUND,
				"Site Not Found For This Customer",
			);
		}
	}

	if (payload.categoryId) {
		const category = await prisma.serviceCategory.findFirst({
			where: { id: payload.categoryId, isActive: true, deletedAt: null },
		});

		if (!category) {
			throw new AppError(
				httpStatus.NOT_FOUND,
				"Service Category Not Found Or Inactive",
			);
		}
	}

	const updated = await prisma.serviceRequest.update({
		where: { id: requestId },
		data: {
			...payload,
			preferredAt: payload.preferredAt
				? new Date(payload.preferredAt)
				: undefined,
		},
		include: { site: true, category: true },
	});

	return updated;
};

const cancelServiceRequest = async (requestId: string, user: RequestUser) => {
	const customer = await getCustomerProfileOrThrow(user.userId);

	const existing = await prisma.serviceRequest.findFirst({
		where: { id: requestId, deletedAt: null },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Service Request Not Found");
	}

	if (existing.customerId !== customer.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"This Service Request Does Not Belong To You",
		);
	}

	if (existing.status !== RequestStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only A Pending Request Can Be Cancelled",
		);
	}

	const cancelled = await prisma.serviceRequest.update({
		where: { id: requestId },
		data: { status: RequestStatus.CANCELLED },
	});

	return cancelled;
};

const softDeleteServiceRequest = async (requestId: string) => {
	const existing = await prisma.serviceRequest.findFirst({
		where: { id: requestId, deletedAt: null },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Service Request Not Found");
	}

	if (existing.status === RequestStatus.CONVERTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A Converted Request Has A Work Order And Cannot Be Deleted",
		);
	}

	// Soft delete only — the service history must survive.
	const deleted = await prisma.serviceRequest.update({
		where: { id: requestId },
		data: { deletedAt: new Date() },
	});

	return deleted;
};

export const ServiceRequestServices = {
	createServiceRequest,
	getAllServiceRequests,
	getSingleServiceRequest,
	updateServiceRequest,
	cancelServiceRequest,
	softDeleteServiceRequest,
};
