import httpStatus from "http-status";
import {
	InvoiceStatus,
	Role,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import type { InvoiceWhereInput } from "../../../generated/prisma/models";
import type { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { writeAuditLog } from "../../utils/auditLogger";
import { generateInvoiceNo } from "../../utils/codeGenerator";
import { buildMeta, calculatePagination } from "../../utils/paginate";
import {
	INVOICE_DUE_DAYS,
	MINIMUM_BILLABLE_HOURS,
	VAT_RATE,
} from "./invoice.constant";

/** Money is rounded to two decimals at every step, never at the end only. */
const money = (value: number) => Math.round(value * 100) / 100;

/**
 * Generate the invoice for a completed work order.
 *
 * One transaction: validate the transition -> compute labour from the ACTUAL
 * times worked (not the scheduled window) -> sum parts -> apply VAT -> take an
 * INV- number from the sequence -> insert the invoice -> move the work order to
 * INVOICED -> history + audit.
 *
 * Every component is stored, not just the total: an invoice is a record and
 * must still show its own arithmetic after the technician's rate changes.
 */
const generateInvoice = async (workOrderId: string, user: RequestUser) => {
	return prisma.$transaction(async (tx) => {
		const workOrder = await tx.workOrder.findFirst({
			where: { id: workOrderId, deletedAt: null },
			include: { technician: true, parts: true, invoice: true },
		});

		if (!workOrder) {
			throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
		}

		if (workOrder.invoice) {
			throw new AppError(
				httpStatus.CONFLICT,
				"An Invoice Already Exists For This Work Order",
			);
		}

		if (workOrder.status !== WorkOrderStatus.COMPLETED) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Only A Completed Work Order Can Be Invoiced",
			);
		}

		if (!workOrder.actualStart || !workOrder.actualEnd) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This Work Order Has No Recorded Start And End Time",
			);
		}

		const millis =
			workOrder.actualEnd.getTime() - workOrder.actualStart.getTime();

		const labourHours = Math.max(
			money(millis / (1000 * 60 * 60)),
			MINIMUM_BILLABLE_HOURS,
		);

		const hourlyRate = Number(workOrder.technician.hourlyRate);
		const labourAmount = money(labourHours * hourlyRate);

		const partsAmount = money(
			workOrder.parts.reduce(
				(sum, part) => sum + Number(part.unitPrice) * part.quantity,
				0,
			),
		);

		const vatAmount = money((labourAmount + partsAmount) * VAT_RATE);
		const totalAmount = money(labourAmount + partsAmount + vatAmount);

		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + INVOICE_DUE_DAYS);

		const invoiceNo = await generateInvoiceNo(tx);

		const invoice = await tx.invoice.create({
			data: {
				invoiceNo,
				workOrderId,
				labourHours,
				labourAmount,
				partsAmount,
				vatAmount,
				totalAmount,
				status: InvoiceStatus.DUE,
				dueDate,
			},
		});

		await tx.workOrder.update({
			where: { id: workOrderId },
			data: { status: WorkOrderStatus.INVOICED },
		});

		await tx.workOrderHistory.create({
			data: {
				workOrderId,
				fromStatus: WorkOrderStatus.COMPLETED,
				toStatus: WorkOrderStatus.INVOICED,
				changedById: user.userId,
				note: `Invoice ${invoiceNo} generated`,
			},
		});

		await writeAuditLog(
			{
				actorId: user.userId,
				action: "INVOICE_GENERATED",
				entity: "Invoice",
				entityId: invoice.id,
				after: { invoiceNo, totalAmount, labourHours, partsAmount, vatAmount },
			},
			tx,
		);

		return invoice;
	});
};

const invoiceInclude = {
	workOrder: {
		include: {
			technician: { include: { user: { omit: { password: true } } } },
			parts: true,
			request: {
				include: {
					site: true,
					category: true,
					customer: { include: { user: { omit: { password: true } } } },
				},
			},
		},
	},
	payments: true,
};

const getAllInvoices = async (query: IQuery, user: RequestUser) => {
	const { page, limit, skip, sortBy, sortOrder } = calculatePagination(
		query,
		"issuedAt",
	);

	const andConditions: InvoiceWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					invoiceNo: {
						contains: query.searchTerm as string,
						mode: "insensitive",
					},
				},
				{
					workOrder: {
						code: { contains: query.searchTerm as string, mode: "insensitive" },
					},
				},
			],
		});
	}

	if (query.status) {
		andConditions.push({ status: query.status as InvoiceStatus });
	}

	if (query.from || query.to) {
		andConditions.push({
			issuedAt: {
				...(query.from ? { gte: new Date(query.from as string) } : {}),
				...(query.to ? { lte: new Date(query.to as string) } : {}),
			},
		});
	}

	// Role scoping: customers see their own bills, technicians see their jobs.
	if (user.role === Role.CUSTOMER) {
		andConditions.push({
			workOrder: { request: { customer: { userId: user.userId } } },
		});
	}

	if (user.role === Role.TECHNICIAN) {
		andConditions.push({
			workOrder: { technician: { userId: user.userId } },
		});
	}

	andConditions.push({ deletedAt: null });

	const where: InvoiceWhereInput = { AND: andConditions };

	const [data, total] = await Promise.all([
		prisma.invoice.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: invoiceInclude,
		}),

		prisma.invoice.count({ where }),
	]);

	return { data, meta: buildMeta(page, limit, total) };
};

const getSingleInvoice = async (invoiceId: string, user: RequestUser) => {
	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId, deletedAt: null },
		include: invoiceInclude,
	});

	if (!invoice) {
		throw new AppError(httpStatus.NOT_FOUND, "Invoice Not Found");
	}

	if (
		user.role === Role.CUSTOMER &&
		invoice.workOrder.request.customer.userId !== user.userId
	) {
		throw new AppError(httpStatus.FORBIDDEN, "This Is Not Your Invoice");
	}

	if (
		user.role === Role.TECHNICIAN &&
		invoice.workOrder.technician.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"This Invoice Is Not For One Of Your Jobs",
		);
	}

	return invoice;
};

export const InvoiceServices = {
	generateInvoice,
	getAllInvoices,
	getSingleInvoice,
};
