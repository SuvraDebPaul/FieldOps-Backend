// Generates docs/FieldOps.postman_collection.json
// Run: node scripts/build-postman.mjs
import fs from "node:fs";
import path from "node:path";

const V = (n) => `{{${n}}}`;

function req(name, method, p, opts = {}) {
  const { body, desc = "", token, query, tests, formdata } = opts;
  const segs = p.replace(/^\//, "").split("/").filter(Boolean);
  const qs = query
    ? "?" + Object.entries(query).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  const url = {
    raw: `${V("baseUrl")}/api/v1${p}${qs}`,
    host: [V("baseUrl")],
    path: ["api", "v1", ...segs],
  };
  if (query) url.query = Object.entries(query).map(([k, v]) => ({ key: k, value: String(v) }));

  const header = [];
  if (body !== undefined) header.push({ key: "Content-Type", value: "application/json" });
  if (token) header.push({ key: "Authorization", value: `Bearer ${V(token)}` });

  const item = {
    name,
    request: { method, header, url, description: desc },
    response: [],
  };
  if (body !== undefined) item.request.body = { mode: "raw", raw: JSON.stringify(body, null, 2) };
  if (formdata) item.request.body = { mode: "formdata", formdata };
  if (tests) item.event = [{ listen: "test", script: { type: "text/javascript", exec: tests } }];
  return item;
}

const saveToken = (v) => [
  "const d = pm.response.json().data;",
  `if (d && d.accessToken) pm.collectionVariables.set("${v}", d.accessToken);`,
  "pm.test('login succeeded', () => pm.response.to.have.status(200));",
];
const saveId = (v) => [
  "const d = pm.response.json().data;",
  `if (d && d.id) pm.collectionVariables.set("${v}", d.id);`,
];

const auth = [
  req("Register (customer)", "POST", "/auth/register", {
    body: {
      name: "Rahim Uddin",
      email: "rahim.demo@example.com",
      password: "Rahim@1234",
      phone: "+8801711000111",
      companyName: "Chattogram Steel Ltd",
      billingAddr: "Agrabad C/A, Chattogram",
    },
    desc: "Self-registration always creates a CUSTOMER. `role` is never read from the body, so sending it has no effect.",
  }),
  req("Login (admin)", "POST", "/auth/login", {
    body: { email: "admin@gmail.com", password: "Admin@12345" },
    desc: "Captures {{adminToken}}.",
    tests: saveToken("adminToken"),
  }),
  req("Login (customer)", "POST", "/auth/login", {
    body: { email: "corp1@apextextiles.com", password: "Admin@12345" },
    desc: "Captures {{customerToken}}.",
    tests: saveToken("customerToken"),
  }),
  req("Login (technician)", "POST", "/auth/login", {
    body: { email: "tech.rahim@gmail.com", password: "Admin@12345" },
    desc: "Captures {{technicianToken}}.",
    tests: saveToken("technicianToken"),
  }),
  req("Login (second customer)", "POST", "/auth/login", {
    body: { email: "operations@bengalplastics.com", password: "Admin@12345" },
    desc: "Used by the ownership 403 demos.",
    tests: saveToken("customerToken2"),
  }),
  req("Login (second technician)", "POST", "/auth/login", {
    body: { email: "tech.karim@gmail.com", password: "Admin@12345" },
    desc: "Used by the ownership 403 demos.",
    tests: saveToken("technicianToken2"),
  }),
  req("Google login (GCP social login)", "POST", "/auth/google", {
    body: { idToken: "PASTE_GOOGLE_ID_TOKEN_HERE" },
    desc:
      "The id_token is obtained in the browser (see public/google-signin.html) and verified server-side " +
      "against Google's public keys, including an audience check against GOOGLE_CLIENT_ID. An existing " +
      "password account with the same email is linked rather than duplicated.",
  }),
  req("Refresh token", "POST", "/auth/refresh-token", {
    body: {},
    desc: "Rotation: the presented refresh token is revoked and a new pair issued. Reusing the old one returns 401.",
  }),
  req("Change password", "POST", "/auth/change-password", {
    body: { oldPassword: "Admin@12345", newPassword: "Admin@123456" },
    desc: "Requires the old password and revokes every refresh token for that user, ending all other sessions.",
    token: "customerToken",
  }),
  req("Logout", "POST", "/auth/logout", {
    body: {},
    desc: "Stamps revokedAt on the refresh token and clears both cookies.",
  }),
];

const users = [
  req("Get my profile", "GET", "/users/me", { desc: "Any authenticated role.", token: "customerToken" }),
  req("Update my profile", "PATCH", "/users/me", {
    body: { name: "Rahim Uddin", phone: "+8801711999888" },
    token: "customerToken",
  }),
  req("Upload avatar", "PATCH", "/users/me/avatar", {
    desc: "multipart/form-data with a single `file` field. Stored on Cloudinary; the previous image is deleted via its public_id.",
    token: "customerToken",
    formdata: [{ key: "file", type: "file", src: [] }],
  }),
];

const catalog = [
  req("List service categories (public)", "GET", "/categories", {
    query: { page: 1, limit: 10 },
    desc: "Public so a customer can browse before raising a request. Captures {{categoryId}} and {{skillId}}.",
    tests: [
      "const d = pm.response.json().data;",
      "if (d && d.length) {",
      "  pm.collectionVariables.set('categoryId', d[0].id);",
      "  pm.collectionVariables.set('skillId', d[0].requiredSkillId);",
      "}",
    ],
  }),
  req("Get single category", "GET", "/categories/{{categoryId}}", {}),
  req("Create category (admin)", "POST", "/categories", {
    body: {
      name: "Switchgear Thermal Imaging",
      description: "Infrared survey of LV/HV switchgear under load.",
      requiredSkillId: "{{skillId}}",
      baseCharge: 180,
      estimatedMins: 120,
    },
    token: "adminToken",
  }),
  req("Update category (admin)", "PATCH", "/categories/{{categoryId}}", {
    body: { baseCharge: 210 },
    token: "adminToken",
  }),
  req("Delete category (admin, soft)", "DELETE", "/categories/{{categoryId}}", {
    desc: "Soft delete: sets deletedAt and isActive=false so historical requests still resolve their category.",
    token: "adminToken",
  }),
  req("List skills (public)", "GET", "/skills", {}),
  req("Create skill (admin)", "POST", "/skills", { body: { name: "Vibration Analysis" }, token: "adminToken" }),
];

const sites = [
  req("List my sites", "GET", "/sites", {
    query: { page: 1, limit: 10 },
    desc: "Customer sees only their own sites; admin sees all and may filter with ?customerId=. Captures {{siteId}}.",
    token: "customerToken",
    tests: [
      "const d = pm.response.json().data;",
      "if (d && d.length) pm.collectionVariables.set('siteId', d[0].id);",
    ],
  }),
  req("Create site", "POST", "/sites", {
    body: {
      label: "Weaving Shed 2",
      address: "Plot 44, DEPZ, Savar",
      city: "Dhaka",
      contactName: "Mizanur Rahman",
      contactPhone: "+8801711223344",
    },
    token: "customerToken",
    tests: saveId("siteId"),
  }),
  req("Get single site", "GET", "/sites/{{siteId}}", { token: "customerToken" }),
  req("Update site", "PATCH", "/sites/{{siteId}}", {
    body: { contactPhone: "+8801711555666" },
    token: "customerToken",
  }),
];

const technicians = [
  req("List technicians", "GET", "/technicians", {
    query: { page: 1, limit: 10 },
    desc: "Captures {{technicianId}}. Filterable by skill, city and availability.",
    tests: [
      "const d = pm.response.json().data;",
      "if (d && d.length) pm.collectionVariables.set('technicianId', d[0].id);",
    ],
  }),
];

const requests = [
  req("Create service request", "POST", "/requests", {
    body: {
      siteId: "{{siteId}}",
      categoryId: "{{categoryId}}",
      title: "Transformer humming and overheating",
      description:
        "Main 1000kVA transformer at the spinning mill runs hot with an audible hum since Tuesday.",
      priority: "HIGH",
    },
    desc:
      "Generates a sequential SR- code from a Postgres sequence. The site must belong to the calling " +
      "customer and the category must be active.",
    token: "customerToken",
    tests: saveId("requestId"),
  }),
  req("List requests", "GET", "/requests", {
    query: { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
    desc:
      "One route, two audiences: ADMIN sees every request, CUSTOMER only their own. The scoping lives " +
      "in the service layer, never in the route.",
    token: "adminToken",
  }),
  req("Search + filter requests", "GET", "/requests", {
    query: { searchTerm: "transformer", status: "PENDING", priority: "HIGH", page: 1, limit: 5 },
    desc: "searchTerm matches code, title and description, case-insensitively.",
    token: "adminToken",
  }),
  req("Get single request", "GET", "/requests/{{requestId}}", { token: "customerToken" }),
  req("Update request (PENDING only)", "PATCH", "/requests/{{requestId}}", {
    body: { priority: "CRITICAL", title: "Transformer overheating - escalated" },
    desc: "Refused once a dispatcher has acted on the request.",
    token: "customerToken",
  }),
  req("Cancel request", "PATCH", "/requests/{{requestId}}/cancel", {
    desc: "Customer only, PENDING only.",
    token: "customerToken",
  }),
  req("Delete request (admin, soft)", "DELETE", "/requests/{{requestId}}", {
    desc: "Soft delete. Refused for CONVERTED requests, which already have a work order.",
    token: "adminToken",
  }),
];

const workOrders = [
  req("Approve request -> create work order", "PATCH", "/requests/{{requestId}}/approve", {
    body: {
      technicianId: "{{technicianId}}",
      scheduledStart: "2026-09-20T09:00:00.000Z",
      scheduledEnd: "2026-09-20T12:00:00.000Z",
    },
    desc:
      "One Serializable transaction: verify the technician holds the category's required skill -> check " +
      "the daily job cap -> create the WorkOrder with a WO- code -> flip the request to CONVERTED -> " +
      "write history and audit rows.\n\n" +
      "Time-overlap is deliberately NOT checked in application code. The Postgres exclusion constraint " +
      "no_technician_double_booking enforces it, which removes the race that two dispatchers could " +
      "otherwise drive through a check-then-insert.",
    token: "adminToken",
    tests: saveId("workOrderId"),
  }),
  req("Reject request", "PATCH", "/requests/{{requestId}}/reject", {
    body: { rejectReason: "Site access unavailable during the requested window." },
    token: "adminToken",
  }),
  req("List work orders", "GET", "/work-orders", {
    query: { page: 1, limit: 10, status: "ASSIGNED" },
    desc:
      "Role-scoped three ways: ADMIN all, TECHNICIAN own jobs, CUSTOMER own company's jobs. " +
      "Filters: status, technicianId, from, to, searchTerm.",
    token: "adminToken",
  }),
  req("My assigned jobs (technician)", "GET", "/work-orders/my-assigned", { token: "technicianToken" }),
  req("Get single work order", "GET", "/work-orders/{{workOrderId}}", {
    desc: "Includes the full status history.",
    token: "technicianToken",
  }),
  req("Status -> SCHEDULED (admin)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "SCHEDULED", note: "Confirmed with the site contact." },
    desc:
      "Three gates per transition: is it legal from the current status (TRANSITIONS map), is this role " +
      "allowed to drive it, and for a technician is this actually their job.",
    token: "adminToken",
  }),
  req("Status -> EN_ROUTE (technician)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "EN_ROUTE" },
    token: "technicianToken",
  }),
  req("Status -> IN_PROGRESS (technician)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "IN_PROGRESS" },
    desc: "Stamps actualStart.",
    token: "technicianToken",
  }),
  req("Log parts used", "POST", "/work-orders/{{workOrderId}}/parts", {
    body: { name: "HV bushing insulator", quantity: 2, unitPrice: 45.5 },
    desc:
      "unitPrice is stored on the row rather than looked up later: an invoice must keep the price as it " +
      "was at the time of the job.",
    token: "technicianToken",
  }),
  req("Status -> COMPLETED (technician)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: {
      status: "COMPLETED",
      diagnosis: "Loose HV bushing terminals causing partial discharge.",
      workSummary: "Replaced both bushings, retorqued terminals, thermal scan clear.",
    },
    desc: "Stamps actualEnd, which the invoice bills from.",
    token: "technicianToken",
  }),
  req("Reschedule (admin)", "PATCH", "/work-orders/{{workOrderId}}/reschedule", {
    body: {
      scheduledStart: "2026-09-21T09:00:00.000Z",
      scheduledEnd: "2026-09-21T12:00:00.000Z",
      note: "Customer requested a later slot.",
    },
    desc: "Re-triggers the exclusion constraint: moving onto an occupied slot returns 409.",
    token: "adminToken",
  }),
];

const money = [
  req("Generate invoice (admin)", "POST", "/work-orders/{{workOrderId}}/invoice", {
    desc:
      "One transaction: labourHours from actualEnd - actualStart (floored at 0.5h) -> labourAmount = " +
      "hours x the technician's hourlyRate -> partsAmount = sum(unitPrice x quantity) -> 15% VAT -> " +
      "total. Takes an INV- number from a sequence and moves the work order to INVOICED.\n\n" +
      "All five money components are stored, not just the total, so the invoice keeps its own " +
      "arithmetic even after the technician's rate changes.",
    token: "adminToken",
    tests: saveId("invoiceId"),
  }),
  req("List invoices", "GET", "/invoices", {
    query: { page: 1, limit: 10, status: "DUE" },
    desc: "Role-scoped. Filters: status, from, to, searchTerm.",
    token: "adminToken",
  }),
  req("Get single invoice", "GET", "/invoices/{{invoiceId}}", { token: "customerToken" }),
  req("Initiate Stripe payment", "POST", "/payments/initiate", {
    body: { invoiceId: "{{invoiceId}}" },
    desc:
      "Writes a Payment row in INITIATED state with our own transactionId, then creates a Stripe " +
      "Checkout session carrying that id in metadata. Open the returned checkoutUrl and pay with test " +
      "card 4242 4242 4242 4242, any future expiry, any CVC.\n\n" +
      "Each attempt is its own Payment row, which is why an Invoice has many Payments.",
    token: "customerToken",
    tests: [
      "const d = pm.response.json().data;",
      "if (d && d.transactionId) pm.collectionVariables.set('transactionId', d.transactionId);",
    ],
  }),
  req("Get payment by transactionId", "GET", "/payments/{{transactionId}}", { token: "customerToken" }),
  {
    name: "Stripe webhook (reference only - do not send from Postman)",
    request: {
      method: "POST",
      header: [
        { key: "stripe-signature", value: "t=...,v1=..." },
        { key: "Content-Type", value: "application/json" },
      ],
      url: {
        raw: "{{baseUrl}}/api/v1/payments/webhook",
        host: ["{{baseUrl}}"],
        path: ["api", "v1", "payments", "webhook"],
      },
      body: { mode: "raw", raw: "<raw Stripe event body>" },
      description:
        "The only path that marks an invoice PAID. Nothing else in the codebase writes " +
        "InvoiceStatus.PAID or WorkOrderStatus.PAID, and PAID has an empty role list in the transition " +
        "map, so the status endpoint cannot reach it either.\n\n" +
        "Mounted in app.ts with express.raw() ahead of express.json(), because Stripe signs the raw " +
        "bytes of the body.\n\n" +
        "Idempotent: the handler looks the payment up by our transactionId and returns early if it is " +
        "already SUCCESS, and re-verifies the charged amount against the invoice total before settling.\n\n" +
        "Drive it locally with:\n  stripe listen --forward-to localhost:5000/api/v1/payments/webhook",
    },
    response: [],
  },
];


const feedback = [
  req("Submit feedback (customer)", "POST", "/work-orders/{{workOrderId}}/feedback", {
    body: { rating: 5, comment: "Technician arrived on time and the transformer has run cool since." },
    desc:
      "Closes the flow. One transaction: insert the Feedback row and recompute the technician's " +
      "ratingAvg / ratingCount.\n\n" +
      "Guards: the caller must be the customer whose job it was, the work order must be PAID, and " +
      "only one feedback per work order (Feedback.workOrderId is @unique, so the database refuses a " +
      "second row even under a race).\n\n" +
      "The average is stored on TechnicianProfile rather than aggregated on every read, which keeps " +
      "the technician list a single query.",
    token: "customerToken",
  }),
  req("Get feedback for a work order", "GET", "/work-orders/{{workOrderId}}/feedback", {
    desc: "Ownership-checked for customers and technicians; admins see any.",
    token: "customerToken",
  }),
  req("List feedbacks", "GET", "/feedbacks", {
    query: { page: 1, limit: 10 },
    desc:
      "Role-scoped: a customer sees the ratings they left, a technician the ratings they received, " +
      "an admin everything. Filters: rating, technicianId, searchTerm.",
    token: "adminToken",
  }),
  req("400 - feedback before payment", "POST", "/work-orders/{{workOrderId}}/feedback", {
    body: { rating: 4 },
    desc: "Rating a work order that has not reached PAID is refused.",
    token: "customerToken",
  }),
];

const authz = [
  req("403 - technician B reads technician A's job", "GET", "/work-orders/{{workOrderId}}", {
    desc:
      "Ownership check, not just a role check. Both users are TECHNICIAN; the job belongs to only one " +
      "of them. Expect 403 'This Job Is Not Assigned To You'.",
    token: "technicianToken2",
  }),
  req("403 - customer B reads customer A's invoice", "GET", "/invoices/{{invoiceId}}", {
    desc: "Expect 403 'This Is Not Your Invoice'.",
    token: "customerToken2",
  }),
  req("403 - technician hits admin-only reschedule", "PATCH", "/work-orders/{{workOrderId}}/reschedule", {
    body: { scheduledStart: "2026-09-22T09:00:00.000Z", scheduledEnd: "2026-09-22T12:00:00.000Z" },
    desc: "Role check. Expect 403.",
    token: "technicianToken",
  }),
  req("403 - customer tries to approve a request", "PATCH", "/requests/{{requestId}}/approve", {
    body: {
      technicianId: "{{technicianId}}",
      scheduledStart: "2026-09-23T09:00:00.000Z",
      scheduledEnd: "2026-09-23T12:00:00.000Z",
    },
    desc: "Role check. Expect 403.",
    token: "customerToken",
  }),
  req("401 - no token on a protected route", "GET", "/work-orders", { desc: "Expect 401." }),
  req("409 - double-booking the same technician", "PATCH", "/requests/{{requestId}}/approve", {
    body: {
      technicianId: "{{technicianId}}",
      scheduledStart: "2026-09-20T10:00:00.000Z",
      scheduledEnd: "2026-09-20T13:00:00.000Z",
    },
    desc:
      "Approve a second request onto a window overlapping an existing job for the same technician. " +
      "Postgres raises SQLSTATE 23P01 from the exclusion constraint, and the global error handler maps " +
      "it to 409 'Technician already has a job in this time window'.",
    token: "adminToken",
  }),
  req("400 - illegal state transition", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "PAID" },
    desc: "PAID is unreachable from the status route by any role. Only the Stripe webhook sets it.",
    token: "adminToken",
  }),
  req("400 - validation error shape", "POST", "/auth/register", {
    body: {
      name: "A",
      email: "not-an-email",
      password: "abc",
      companyName: "X",
      billingAddr: "Y",
    },
    desc: "Zod failures are returned field by field in the `errors` array.",
  }),
];

const collection = {
  info: {
    name: "FieldOps - Field Service Management API",
    description:
      "B7A6 Assignment 7 - Field Service Management (student ID last digit 7).\n\n" +
      "Flow: a customer raises a service request -> an admin approves it and assigns a skill-matched " +
      "technician into a conflict-free slot -> the technician runs the job through a guarded status " +
      "workflow and logs parts -> the system generates an invoice -> the customer pays through Stripe " +
      "-> the payment is confirmed by a signature-verified webhook.\n\n" +
      "Run the folders top to bottom. Auth captures the role tokens automatically, and Catalog / Sites / " +
      "Technicians capture the ids the request flow needs, so no manual copying is required.\n\n" +
      "Demo admin: admin@gmail.com / Admin@12345",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    "baseUrl",
    "adminToken",
    "customerToken",
    "technicianToken",
    "customerToken2",
    "technicianToken2",
    "siteId",
    "categoryId",
    "skillId",
    "technicianId",
    "requestId",
    "workOrderId",
    "invoiceId",
    "transactionId",
  ].map((key) => ({ key, value: key === "baseUrl" ? "http://localhost:5000" : "" })),
  item: [
    { name: "01 Auth", item: auth, description: "Email/password and Google social login, refresh-token rotation, logout, change password." },
    { name: "02 Users", item: users },
    { name: "03 Catalog (categories & skills)", item: catalog },
    { name: "04 Customer sites", item: sites },
    { name: "05 Technicians", item: technicians },
    { name: "06 Service requests", item: requests },
    { name: "07 Assignment & work orders", item: workOrders },
    { name: "08 Invoices & payments", item: money },
    { name: "09 Customer feedback", item: feedback, description: "Final step of the service flow: the customer rates the completed, paid job and the technician rating is recomputed." },
    { name: "10 Authorization & error demos", item: authz, description: "The 401 / 403 / 409 / 400 cases, grouped so a reviewer can run them in one pass." },
  ],
};

const env = {
  name: "FieldOps - Local",
  values: [
    { key: "baseUrl", value: "http://localhost:5000", enabled: true },
    { key: "adminToken", value: "", enabled: true },
    { key: "customerToken", value: "", enabled: true },
    { key: "technicianToken", value: "", enabled: true },
    { key: "customerToken2", value: "", enabled: true },
    { key: "technicianToken2", value: "", enabled: true },
  ],
  _postman_variable_scope: "environment",
};

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  path.join("docs", "FieldOps.postman_collection.json"),
  JSON.stringify(collection, null, 2),
);
fs.writeFileSync(
  path.join("docs", "FieldOps.local.postman_environment.json"),
  JSON.stringify(env, null, 2),
);

const total = collection.item.reduce((n, f) => n + f.item.length, 0);
console.log(`folders: ${collection.item.length}  requests: ${total}`);
