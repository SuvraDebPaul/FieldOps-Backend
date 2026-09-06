import { prisma } from "../lib/prisma";

/**
 * Human-readable business codes: SR-2026-000123, WO-2026-000123, INV-2026-000123.
 *
 * Backed by a Postgres sequence (see the business_code_sequences migration) so
 * two concurrent requests can never be handed the same number. Sequences do not
 * roll back, so an aborted transaction burns a number — gaps are fine here,
 * duplicates are not.
 *
 * `client` accepts a transaction client so codes can be generated inside a
 * $transaction alongside the row they belong to.
 */
type PrismaLike = Pick<typeof prisma, "$queryRawUnsafe">;

const nextFromSequence = async (
  prefix: string,
  sequence: string,
  client: PrismaLike = prisma,
): Promise<string> => {
  const rows = await client.$queryRawUnsafe<{ nextval: bigint }[]>(
    `SELECT nextval('${sequence}') AS nextval`,
  );

  const serial = String(rows[0].nextval).padStart(6, "0");

  return `${prefix}-${new Date().getFullYear()}-${serial}`;
};

export const generateRequestCode = (client?: PrismaLike) =>
  nextFromSequence("SR", "service_request_code_seq", client);

export const generateWorkOrderCode = (client?: PrismaLike) =>
  nextFromSequence("WO", "work_order_code_seq", client);

export const generateInvoiceNo = (client?: PrismaLike) =>
  nextFromSequence("INV", "invoice_no_seq", client);
