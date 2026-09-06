import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

type TAuditClient = Prisma.TransactionClient | typeof prisma;

type TWriteAuditLog = {
	actorId?: string | null;
	action: string;
	entity: string;
	entityId: string;
	before?: unknown;
	after?: unknown;
	ip?: string | null;
};

/**
 * Append-only trail. Pass the transaction client so the log lands or rolls back
 * with the change it describes — an audit row for a write that never happened
 * is worse than no row at all.
 *
 * `actorId` is nullable because some actions have no human actor (the Stripe
 * webhook, scheduled jobs).
 */
export const writeAuditLog = async (
	payload: TWriteAuditLog,
	client: TAuditClient = prisma,
) => {
	await client.auditLog.create({
		data: {
			actorId: payload.actorId ?? null,
			action: payload.action,
			entity: payload.entity,
			entityId: payload.entityId,
			before: (payload.before ?? undefined) as Prisma.InputJsonValue,
			after: (payload.after ?? undefined) as Prisma.InputJsonValue,
			ip: payload.ip ?? null,
		},
	});
};
