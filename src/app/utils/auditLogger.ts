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
