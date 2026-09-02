# FieldOps Backend — Task Board

**Project:** Field Service Management (B7A6, student ID last digit 7)
**Deadline:** Sept 7, 2026, 11:59 PM → max 60 marks · Sept 8 → 50 · Sept 9–23 → 30
**Stack:** Node + TypeScript + Express 5 · PostgreSQL + Prisma 7 (driver adapter) · Zod · SSLCommerz · Cloudinary · Vercel

Architecture rule, repeated in every module and in the video:
`route → middleware → controller (thin) → service (all logic + transactions) → prisma`

---

## Marks map

| Category | % | Milestones |
|---|---|---|
| API Design & Documentation | 15 | M14 + Postman-as-you-go |
| Database Design & Schema | 15 | M1 |
| Authentication & Authorization | 15 | M2, M3 |
| Core Functionality & Business Logic | 20 | M6, M7, M8 |
| Error Handling & Validation | 10 | M0 |
| Payment Integration | 10 | M9 |
| Performance & Code Quality | 5 | all |
| Deployment | 5 | M13 |
| Commit History | 2 | 20+ meaningful commits |
| Video Explanation | 3 | M15 |

**Mandatory, non-negotiable:** Email/Password **+ Google (GCP) social login** · exactly 3 roles · real payment gateway (no simulation) · Zod on every applicable endpoint · standard response envelope · 20+ commits · live URL · 5–10 min video · working demo admin credentials.

**Safe to cut if time runs short, in this order:** Redis caching → audit-log endpoint → technician analytics → notifications. **Never cut Google login** — it is a mandatory requirement.

---

## M0 — Foundation ✅ (Day 1)

- [x] 0.1 Restructure to `src/app.ts`, `src/server.ts`, `src/app/{config,lib,middleware,utils}`
- [x] 0.2 `config/index.ts` — Zod-validated env
- [x] 0.3 `lib/prisma.ts` — PrismaPg adapter, output at `src/generated/prisma`
- [x] 0.4 `utils/sendResponse.ts`
- [x] 0.5 `utils/AppError.ts` + `utils/catchAsync.ts`
- [x] 0.6 `middleware/globalErrorHandler.ts` + `middleware/notFound.ts`
- [x] 0.7 `middleware/rateLimiter.ts`
- [x] 0.8 `app.ts` middleware stack in order: trust proxy → helmet → cors → limiter → json → urlencoded → cookies → routes → notFound → errorHandler

### Remaining M0 clean-up

- [ ] 0.9 Rename `globalErrorHandeler` → `globalErrorHandler` (F2 in VS Code renames both sites)
- [ ] 0.10 `routes/index.ts` — route registry array; `app.use("/api/v1", router)`
- [ ] 0.11 `interfaces/index.ts` — `IQuery`, `IMeta`
- [ ] 0.12 `utils/paginate.ts` — `calculatePagination()` + `buildMeta()`
- [ ] 0.13 `utils/pick.ts` — whitelist `req.query` keys
- [ ] 0.14 `env` fixes: `JWT_*_EXPIRES_IN` naming · add `BCRYPT_SALT_ROUNDS`, `SUPER_ADMIN_*` · make `GOOGLE_CLIENT_ID`/`CLOUDINARY_*`/`SSLC_*` optional for now · add `"test"` to NODE_ENV · `safeParse` not `parse`
- [ ] 0.15 `package.json`: add `"postinstall": "prisma generate"`, `"db:generate"`, `"typecheck"`; fix `build` (add `tsup.config.ts` or switch to `tsc`); drop dead `db:seed` path
- [ ] 0.16 `tsconfig.json`: add `"exclude": ["node_modules","dist"]`, include `prisma.config.ts`
- [ ] 0.17 `prisma.config.ts`: use `env("DATABASE_URL")` from `prisma/config`
- [ ] 0.18 Install: `cloudinary google-auth-library redis date-fns`
- [ ] 0.19 Add `/health` route
- [ ] 0.20 Postman: create collection + environment with `{{baseUrl}}`, `{{accessToken}}`; save `GET /health`

**Verify:** `npx tsc --noEmit` clean · `GET /` returns the envelope · unknown route → 404 JSON · thrown `AppError` → correct status
**Commit:** `feat: error handling and app bootstrap`

---

## M1 — Database schema (Day 1)

- [x] 1.1 `schema.prisma` — `prisma-client` generator, output `../../src/generated/prisma`
- [x] 1.2 `enums.prisma` — 9 enums
- [x] 1.3 `user.prisma` — `User`
- [ ] 1.4 Add `User` back-relations: `customer`, `technician`, `refreshTokens`, `auditLogs` + field `avatarPublicId`
- [ ] 1.5 `RefreshToken` model
- [ ] 1.6 `customer.prisma` — `CustomerProfile`, `Site`
- [ ] 1.7 `technician.prisma` — `TechnicianProfile`, `Skill`, `TechnicianSkill`
- [ ] 1.8 `catalog.prisma` — `ServiceCategory`
- [ ] 1.9 `request.prisma` — `ServiceRequest`
- [ ] 1.10 `workOrder.prisma` — `WorkOrder`, `WorkOrderHistory`, `PartUsage`, `Feedback`
      ⚠️ `scheduledStart/End`, `actualStart/End` **must** be `@db.Timestamptz(3)` — see 1.13
- [ ] 1.11 `billing.prisma` — `Invoice`, `Payment`
- [ ] 1.12 `audit.prisma` — `AuditLog`
- [ ] 1.13 `npx prisma format` → `npx prisma migrate dev --name full_schema`
- [ ] 1.14 Exclusion constraint (empty migration + raw SQL):
      `--create-only --name technician_no_double_booking`, then `btree_gist` + `EXCLUDE USING gist` on `(technicianId =, tstzrange(scheduledStart, scheduledEnd) &&)` filtered to active statuses
- [ ] 1.15 Postgres sequences for `SR-`/`WO-`/`INV-` codes (raw SQL migration) + `utils/codeGenerator.ts`
- [ ] 1.16 Confirm `23P01` reaches `globalErrorHandler` — log the raw error once, check whether the code sits on `err.code`, `err.meta.code`, or `err.cause.code`, then fix `isDoubleBooking`

**Why 1.14 matters:** it is the "one technical challenge" answer for the video — the database itself refuses to double-book a technician, so no race condition can slip past application code.
**Commit:** `feat: full prisma schema` · `feat: technician double-booking exclusion constraint`

---

## M2 — Auth (Day 2) · 15%

- [ ] 2.1 `utils/jwt.ts` — `createToken` / `verifyToken`
- [ ] 2.2 `auth.validation.ts` — register, login, changePassword, googleLogin schemas
- [ ] 2.3 `auth.interface.ts`
- [ ] 2.4 `auth.service.ts → register` — hash with bcrypt, create `User` + `CustomerProfile` in one `$transaction`
- [ ] 2.5 `auth.service.ts → login` — verify hash, issue access + refresh, store **hashed** refresh token
- [ ] 2.6 `auth.service.ts → refreshToken` — verify, rotate, revoke old
- [ ] 2.7 `auth.service.ts → logout` — set `revokedAt`, clear cookies
- [ ] 2.8 `auth.service.ts → changePassword`
- [ ] 2.9 `lib/googleAuth.ts` + `auth.service.ts → googleLogin` — verify `id_token` server-side, upsert with `provider: GOOGLE` **(MANDATORY)**
- [ ] 2.10 `auth.controller.ts` — httpOnly cookies for both tokens
- [ ] 2.11 `auth.route.ts` — `authLimiter` on login/register
- [ ] 2.12 `middleware/checkAuth.ts` — `auth(...roles)`: cookie → Bearer fallback, verify, role check, **re-read user from DB** (catches SUSPENDED / deleted / role changed), attach `req.user`
- [ ] 2.13 `middleware/validateRequest.ts` (+ a form-data variant for multipart routes)
- [ ] 2.14 Register `/auth` in `routes/index.ts`
- [ ] 2.15 Postman: save all 6 auth requests + an env var script that stores `accessToken`

**Endpoints (6):** `POST /auth/register` · `/auth/login` · `/auth/google` · `/auth/refresh-token` · `/auth/logout` · `/auth/change-password`
**Verify:** login → token → protected route 200 · bad password → 401 · suspended user → 403
**Commit:** `feat: jwt auth` · `feat: google social login` · `feat: role-based auth middleware`

---

## M3 — Users, profiles, seed (Day 2)

- [ ] 3.1 `lib/cloudinary.ts` + `middleware/upload.ts` (multer **memoryStorage** — no disk on Vercel)
- [ ] 3.2 `user.service.ts` — `getMe`, `updateMe`, `updateAvatar` (delete old `avatarPublicId` on replace)
- [ ] 3.3 `technician.service.ts → getTechnicians` — public list, filter `?skill=&city=&available=`
- [ ] 3.4 `user.controller.ts` + `user.route.ts`
- [ ] 3.5 `utils/seed.ts` — 1 admin, 4 technicians + skills, 3 customers + sites, 8 categories; idempotent (upsert)
- [ ] 3.6 Call seed from `server.ts` on boot
- [ ] 3.7 Verify `password` never appears in any response (`select`/`omit` explicitly)

**Endpoints (4):** `GET /users/me` · `PATCH /users/me` · `PATCH /users/me/avatar` · `GET /technicians`
**Commit:** `feat: user profile and avatar upload` · `feat: database seed script`

---

## M4 — Customer sites (Day 3)

- [ ] 4.1 `site.validation.ts`
- [ ] 4.2 `site.service.ts` — create / list / update, **scoped to the logged-in customer**
- [ ] 4.3 Ownership guard: customer may only touch own sites → 403 otherwise
- [ ] 4.4 `site.controller.ts` + `site.route.ts`

**Endpoints (3):** `POST /sites` · `GET /sites` · `PATCH /sites/:id`
**Commit:** `feat: customer sites module`

---

## M5 — Catalog (Day 3)

- [ ] 5.1 `catalog.validation.ts`
- [ ] 5.2 `catalog.service.ts` — categories CRUD (ADMIN write) + skills list
- [ ] 5.3 Soft delete only (`deletedAt`), never `prisma.delete`
- [ ] 5.4 `catalog.controller.ts` + `catalog.route.ts`
- [ ] 5.5 *(optional)* `lib/redis.ts` + 10-min cache on `GET /categories`

**Endpoints (4):** `GET /categories` · `POST /categories` · `PATCH /categories/:id` · `GET /skills`
**Commit:** `feat: service catalog module`

---

## M6 — Service requests (Day 3) · core 20%

- [ ] 6.1 `request.validation.ts`
- [ ] 6.2 `request.service.ts → createRequest` — generate `SR-` code, attachments → Cloudinary
- [ ] 6.3 `request.service.ts → getRequests` — **the reusable list pattern**: page/limit/skip/sortBy/sortOrder, `andConditions[]`, `searchTerm` OR-block, filters (`status`, `priority`, `categoryId`), always `deletedAt: null`, return `{ data, meta }`
- [ ] 6.4 **Role scoping in the service, not the route** — ADMIN sees all, CUSTOMER sees own
- [ ] 6.5 `getRequestById` with ownership check
- [ ] 6.6 `updateRequest` — customer, only while `PENDING`
- [ ] 6.7 `cancelRequest` — customer, only while `PENDING`
- [ ] 6.8 `softDeleteRequest` — ADMIN
- [ ] 6.9 Controller + route + register in `routes/index.ts`

**Endpoints (6):** `POST /requests` · `GET /requests` · `GET /requests/:id` · `PATCH /requests/:id` · `PATCH /requests/:id/cancel` · `DELETE /requests/:id`
**Commit:** `feat: service requests with pagination, filtering and search`

---

## M7 — Assignment & work orders (Day 3) · core 20%

- [ ] 7.1 `workOrder.constant.ts` — the `TRANSITIONS` map (single source of truth)
- [ ] 7.2 Transition role guard: `EN_ROUTE`/`IN_PROGRESS`/`COMPLETED` = assigned technician only · `INVOICED` = system/admin · `PAID` = payment IPN only
- [ ] 7.3 `approveRequest` — one `$transaction`, `isolationLevel: "Serializable"`: verify technician has the category's `requiredSkill` → check `maxDailyJobs` cap → create `WorkOrder` (`WO-` code) → request `CONVERTED` → `WorkOrderHistory` → `AuditLog`
- [ ] 7.4 `rejectRequest` — ADMIN, requires `rejectReason`
- [ ] 7.5 `getWorkOrders` — list pattern, `?status&technicianId&from&to`, role-scoped
- [ ] 7.6 `getMyAssigned` — TECHNICIAN
- [ ] 7.7 `getWorkOrderById` — **ownership check: Technician A must get 403 on Technician B's job** (graders look for this)
- [ ] 7.8 `changeStatus` — validate against `TRANSITIONS`, write `WorkOrderHistory`, set `actualStart` on `IN_PROGRESS`
- [ ] 7.9 `reschedule` — ADMIN, re-triggers the exclusion constraint
- [ ] 7.10 `addParts` — TECHNICIAN, `PartUsage`
- [ ] 7.11 `utils/auditLogger.ts` — reusable inside transactions
- [ ] 7.12 Confirm double-booking returns **409**, not 500

**Endpoints (8):** `PATCH /requests/:id/approve` · `/reject` · `GET /work-orders` · `/my-assigned` · `/:id` · `PATCH /:id/status` · `/:id/reschedule` · `POST /:id/parts`
**Commit:** `feat: work order assignment transaction` · `feat: work order state machine` · `feat: audit logging`

---

## M8 — Invoicing (Day 4)

- [ ] 8.1 `invoice.service.ts → generateInvoice` — one `$transaction`: validate `COMPLETED` → set `actualEnd` → compute `labourHours` from actual times → `hourlyRate × hours` → sum `PartUsage` → VAT → `INV-` code → insert `Invoice` → status `INVOICED`
- [ ] 8.2 `getInvoices` — list pattern, role-scoped, `?status&from&to`
- [ ] 8.3 `getInvoiceById` — ownership check
- [ ] 8.4 Controller + route

**Endpoints (2):** `GET /invoices` · `GET /invoices/:id`
**Commit:** `feat: invoice generation transaction`

---

## M9 — Payments (Day 4) · 10%

- [ ] 9.1 Register SSLCommerz sandbox account — **do this first, approval can lag**
- [ ] 9.2 `lib/sslcommerz.ts` — session init helper
- [ ] 9.3 `initiatePayment` — create `Payment` (`INITIATED`) with our `transactionId`, return gateway URL
- [ ] 9.4 `success` / `fail` / `cancel` redirect handlers (redirect only — **never mark paid here**)
- [ ] 9.5 `ipn` webhook — one `$transaction`, `Serializable`, **idempotent**: look up by `transactionId` → exit early if already `SUCCESS` → **validate amount matches invoice** → payment `SUCCESS` → invoice `PAID` + `paidAt` → work order `PAID` → `AuditLog`
- [ ] 9.6 Verify gateway signature; no auth middleware on the IPN route
- [ ] 9.7 `getPaymentByTransactionId`
- [ ] 9.8 Test: fire the same IPN twice → second is a no-op

**Endpoints (3+3):** `POST /payments/initiate` · `POST /payments/ipn` · `GET /payments/:transactionId` (+ success/fail/cancel)
**Why it matters:** graders check that payment is confirmed by the verified IPN, not by the frontend redirect.
**Commit:** `feat: sslcommerz payment initiation` · `feat: idempotent payment ipn handler`

---

## M10 — Feedback (Day 4)

- [ ] 10.1 `feedback.validation.ts` — rating 1–5
- [ ] 10.2 `submitFeedback` — one `$transaction`: insert `Feedback` → recompute `ratingAvg`/`ratingCount` on the technician
- [ ] 10.3 Guards: CUSTOMER only · own work order · only when `PAID` · one feedback per work order

**Endpoint (1):** `POST /work-orders/:id/feedback`
**Commit:** `feat: customer feedback and technician rating`

---

## M11 — Admin & analytics (Day 4)

- [ ] 11.1 `getAllUsers` — `?role&status&q&page&limit`
- [ ] 11.2 `updateUserRole`
- [ ] 11.3 `updateUserStatus` — suspend / activate
- [ ] 11.4 `getDashboardStats` — counts by status, revenue, top technicians *(optional 60s Redis cache)*
- [ ] 11.5 `getAuditLogs` — `?entity&actorId&page&limit`
- [ ] 11.6 *(optional)* `GET /technicians/me/stats` — jobs completed, hours, rating, earnings

**Endpoints (5):** `GET /admin/users` · `PATCH /admin/users/:id/role` · `/status` · `GET /admin/dashboard-stats` · `/admin/audit-logs`
**Commit:** `feat: admin user management` · `feat: dashboard analytics`

---

## M12 — Notifications *(optional, only if M9 lands early)*

- [ ] 12.1 `Notification` model + migration
- [ ] 12.2 Write rows inside existing transactions (assigned, invoiced, paid)
- [ ] 12.3 `GET /notifications` · `PATCH /notifications/:id/read`

**Commit:** `feat: in-app notifications`

---

## M13 — Deployment (Day 5) · 5%

- [ ] 13.1 `vercel.json` + serverless entry
- [ ] 13.2 Confirm **pooled** connection string (Neon/Supabase pooler) — a direct string exhausts connections on serverless
- [ ] 13.3 Set every env var in the Vercel dashboard
- [ ] 13.4 `prisma migrate deploy` against production
- [ ] 13.5 Confirm `postinstall: prisma generate` runs in the Vercel build
- [ ] 13.6 Point `BACKEND_URL` / SSLCommerz callbacks at the live domain
- [ ] 13.7 Smoke test: `/health` → register → login → full request→payment flow on production
- [ ] 13.8 No `node-cron`, no Socket.io, no `fs` writes

**Commit:** `chore: vercel deployment config`

---

## M14 — Documentation (Day 5) · 15%

- [ ] 14.1 Postman: folders per module, environment, `{{baseUrl}}` + `{{accessToken}}`
- [ ] 14.2 **Saved example response on every request** — this is what the 15% actually rewards
- [ ] 14.3 Include the 403 demo pairs as saved examples
- [ ] 14.4 Publish the collection, copy the public docs link
- [ ] 14.5 `README.md` — overview, ERD, setup, env table, endpoint table, roles, live URL
- [ ] 14.6 `.env.example` complete, no real secrets anywhere in git history

**Commit:** `docs: api documentation and readme`

---

## M15 — Video & submission (Day 5) · 3%

- [ ] 15.1 Script the 5–10 min walkthrough
- [ ] 15.2 Open with the domain pitch — *"I supply industrial instruments, and this is how service actually breaks down"*
- [ ] 15.3 Say the architecture sentence: `route → controller → service → prisma`
- [ ] 15.4 Demo the three 403s: technician → `/admin/users` · customer → `/assign` · **technician A → technician B's work order**
- [ ] 15.5 Demo the state machine rejecting an illegal transition
- [ ] 15.6 Demo double-booking → 409, and explain the exclusion constraint as the technical challenge
- [ ] 15.7 Demo a real SSLCommerz sandbox payment end to end
- [ ] 15.8 Submit: project name · repo URL · live API · docs link · video link · demo admin credentials

---

## Daily targets

| Day | Date | Milestones | Commits |
|---|---|---|---|
| 1 | Sept 2 | M0, M1 | 5 |
| 2 | Sept 3 | M2, M3 | 5 |
| 3 | Sept 4 | M4, M5, M6, M7 | 5 |
| 4 | Sept 5 | M8, M9, M10, M11 | 5 |
| 5 | Sept 6 | M13, M14, M15 | 3 |
| — | Sept 7 | buffer, not a work day | — |

**Total: 23 commits** against a required minimum of 20.

---

## Rules that apply to every endpoint

1. Response envelope via `sendResponse` — nothing calls `res.json()` directly.
2. A Zod schema per route, applied by `validateRequest`.
3. `deletedAt: null` in every list and read query — in the **service**, not the controller.
4. `select`/`omit` explicitly. `password` must never leave the server.
5. Soft delete everywhere. No `prisma.delete` in any module.
6. Ownership checks, not just role checks.
7. Controllers stay thin — zero Prisma calls, zero business logic.
8. Add the request to Postman **as you build it**, with a saved example.

## Traps that cost marks

- Postman built on the last day with no saved examples
- A hard delete hiding in one module
- `PATCH /status` accepting any status with no transition guard
- Role middleware present but ownership unchecked
- Payment marked paid from the frontend redirect instead of the verified IPN
- Leaking `password` in any response
- 20 commits all on the final day
- Secrets committed to the repo
