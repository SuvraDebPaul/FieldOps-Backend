/**
 * Vercel serverless entry point.
 *
 * Vercel invokes the exported handler per request — there is no long-lived
 * process, so this must NOT call app.listen() and must NOT run the seed
 * (which would fire on every cold start). Local development still uses
 * src/server.ts; seeding in production is a one-off `npm run db:seed`.
 */
import app from "../src/app";

export default app;
