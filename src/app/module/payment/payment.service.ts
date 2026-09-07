import crypto from "crypto";
import httpStatus from "http-status";
import type Stripe from "stripe";
import {
  InvoiceStatus,
  PaymentStatus,
  Role,
  WorkOrderStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { getStripe, getStripeWebhookSecret } from "../../lib/stripe";
import { SERIALIZABLE_TX } from "../../lib/transaction";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { writeAuditLog } from "../../utils/auditLogger";
import type { IInitiatePaymentPayload } from "./payment.interface";

const initiatePayment = async (
  payload: IInitiatePaymentPayload,
  user: RequestUser,
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: payload.invoiceId, deletedAt: null },
    include: {
      workOrder: {
        include: {
          request: { include: { customer: true, category: true } },
        },
      },
    },
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

  if (invoice.status === InvoiceStatus.PAID) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This Invoice Has Already Been Paid",
    );
  }

  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This Invoice Has Been Cancelled",
    );
  }

  const amount = Number(invoice.totalAmount);

  const transactionId = crypto.randomUUID();

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      transactionId,
      amount,
      status: PaymentStatus.INITIATED,
    },
  });

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: config.STRIPE_CURRENCY,
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `Invoice ${invoice.invoiceNo}`,
            description: `${invoice.workOrder.request.category.name} — Work Order ${invoice.workOrder.code}`,
          },
        },
      },
    ],

    metadata: {
      transactionId,
      paymentId: payment.id,
      invoiceId: invoice.id,
    },
    client_reference_id: transactionId,
    success_url: `${config.FRONTEND_URL}/payment/success?transactionId=${transactionId}`,
    cancel_url: `${config.FRONTEND_URL}/payment/cancel?transactionId=${transactionId}`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayRef: session.id },
  });

  return {
    transactionId,
    invoiceNo: invoice.invoiceNo,
    amount,
    currency: config.STRIPE_CURRENCY,
    checkoutUrl: session.url,
  };
};

const constructStripeEvent = (
  rawBody: Buffer,
  signature: string | undefined,
) => {
  if (!signature) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Missing Stripe Signature Header",
    );
  }

  try {
    return getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Stripe Webhook Signature Verification Failed: ${(error as Error).message}`,
    );
  }
};

const settlePayment = async (session: Stripe.Checkout.Session) => {
  const transactionId =
    session.metadata?.transactionId ?? session.client_reference_id ?? undefined;

  if (!transactionId) {
    return { handled: false, reason: "No transactionId on session" };
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { transactionId },
      include: { invoice: true },
    });

    if (!payment) {
      return { handled: false, reason: "Unknown transactionId" };
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return { handled: true, alreadyProcessed: true };
    }

    const paidAmount = (session.amount_total ?? 0) / 100;
    const expected = Number(payment.invoice.totalAmount);

    if (Math.abs(paidAmount - expected) > 0.01) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayPayload: session as unknown as object,
        },
      });

      return { handled: false, reason: "Amount mismatch" };
    }

    const now = new Date();

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayRef: session.payment_intent
          ? String(session.payment_intent)
          : payment.gatewayRef,
        gatewayPayload: session as unknown as object,
      },
    });

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: InvoiceStatus.PAID, paidAt: now },
    });

    const workOrder = await tx.workOrder.findUnique({
      where: { id: payment.invoice.workOrderId },
    });

    if (workOrder && workOrder.status === WorkOrderStatus.INVOICED) {
      await tx.workOrder.update({
        where: { id: workOrder.id },
        data: { status: WorkOrderStatus.PAID },
      });

      await tx.workOrderHistory.create({
        data: {
          workOrderId: workOrder.id,
          fromStatus: WorkOrderStatus.INVOICED,
          toStatus: WorkOrderStatus.PAID,

          changedById: "STRIPE_WEBHOOK",
          note: `Payment ${transactionId} confirmed by Stripe`,
        },
      });
    }

    await writeAuditLog(
      {
        actorId: null,
        action: "PAYMENT_SUCCEEDED",
        entity: "Payment",
        entityId: payment.id,
        before: { status: PaymentStatus.INITIATED },
        after: { status: PaymentStatus.SUCCESS, amount: paidAmount },
      },
      tx,
    );

    return { handled: true, alreadyProcessed: false };
  }, SERIALIZABLE_TX);
};

const markPaymentFailed = async (
  transactionId: string | undefined,
  reason: string,
) => {
  if (!transactionId) return;

  await prisma.payment.updateMany({
    where: { transactionId, status: PaymentStatus.INITIATED },
    data: { status: PaymentStatus.FAILED },
  });

  await writeAuditLog({
    actorId: null,
    action: "PAYMENT_FAILED",
    entity: "Payment",
    entityId: transactionId,
    after: { reason },
  });
};

const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string | undefined,
) => {
  const event = constructStripeEvent(rawBody, signature);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return settlePayment(session);
    }

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markPaymentFailed(
        session.metadata?.transactionId ??
          session.client_reference_id ??
          undefined,
        event.type,
      );
      return { handled: true };
    }

    default:
      return { handled: false, reason: `Unhandled event ${event.type}` };
  }
};

const getPaymentByTransactionId = async (
  transactionId: string,
  user: RequestUser,
) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    include: {
      invoice: {
        include: {
          workOrder: {
            include: { request: { include: { customer: true } } },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment Not Found");
  }

  if (
    user.role === Role.CUSTOMER &&
    payment.invoice.workOrder.request.customer.userId !== user.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "This Is Not Your Payment");
  }

  return payment;
};

export const PaymentServices = {
  initiatePayment,
  handleStripeWebhook,
  getPaymentByTransactionId,
};
