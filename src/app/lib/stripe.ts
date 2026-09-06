import httpStatus from "http-status";
import Stripe from "stripe";
import config from "../config";
import { AppError } from "../utils/AppError";

let client: Stripe | null = null;

/**
 * Lazily constructed so a missing key fails at the moment of use with a clear
 * message, rather than crashing the whole server at import time.
 */
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
