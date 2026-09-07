import httpStatus from "http-status";
import Stripe from "stripe";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";

let client: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!config.STRIPE_SECRET_KEY) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Stripe Is Not Configured. Set STRIPE_SECRET_KEY.",
    );
  }

  if (!client) {
    client = new Stripe(config.STRIPE_SECRET_KEY);
  }

  return client;
};

export const getStripeWebhookSecret = (): string => {
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Stripe Is Not Configured. Set STRIPE_WEBHOOK_SECRET.",
    );
  }

  return config.STRIPE_WEBHOOK_SECRET;
};
