import { prisma } from "../lib/prisma";

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
