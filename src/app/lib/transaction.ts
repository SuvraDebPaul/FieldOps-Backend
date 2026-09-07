/**
 * Shared options for the two Serializable transactions (assignment and payment
 * settlement).
 *
 * Prisma defaults to maxWait 2s / timeout 5s. Against a remote Postgres those
 * are tight: a Serializable transaction here runs six or seven round trips, and
 * `maxWait` also has to cover waiting for a free connection in the pool. Under
 * any contention the 2s default surfaces as
 * "Unable to start a transaction in the given time", which looks like a Stripe
 * or application bug but is purely a pool-timing one.
 */
export const SERIALIZABLE_TX = {
  isolationLevel: "Serializable",
  maxWait: 15_000,
  timeout: 30_000,
} as const;
