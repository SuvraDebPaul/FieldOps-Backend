// Generates docs/FieldOps.postman_collection.json
// Run: node scripts/build-postman.mjs
//
// Design goal: a reviewer imports the collection, presses Run, and every
// request passes without typing a single value. Tokens and ids are captured by
// scripts; the registration email is made unique per run so the collection can
// be replayed as often as needed.
import fs from "node:fs";
import path from "node:path";

const LIVE = "https://field-ops-backend-sdp.vercel.app";
const V = (n) => `{{${n}}}`;
const BR = String.fromCharCode(10, 10);

function req(name, method, p, opts = {}) {
  const { body, desc = "", token, query, tests, prerequest, formdata } = opts;
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

  const item = { name, request: { method, header, url, description: desc }, response: [] };
  if (body !== undefined) item.request.body = { mode: "raw", raw: JSON.stringify(body, null, 2) };
  if (formdata) item.request.body = { mode: "formdata", formdata };

  const event = [];
  if (prerequest) event.push({ listen: "prerequest", script: { type: "text/javascript", exec: prerequest } });
  if (tests) event.push({ listen: "test", script: { type: "text/javascript", exec: tests } });
  if (event.length) item.event = event;

  return item;
}

// --- reusable script fragments -------------------------------------------
const expect = (code) => [
  `pm.test("status ${code}", () => pm.response.to.have.status(${code}));`,
];
const saveToken = (v, code = 200) => [
  ...expect(code),
  "const d = pm.response.json().data;",
  `if (d && d.accessToken) pm.collectionVariables.set("${v}", d.accessToken);`,
  `if (d && d.refreshToken) pm.collectionVariables.set("${v}Refresh", d.refreshToken);`,
];
const saveId = (v, code = 201) => [
  ...expect(code),
  "const d = pm.response.json().data;",
  `if (d && d.id) pm.collectionVariables.set("${v}", d.id);`,
];
const expectMessage = (code, fragment) => [
  ...expect(code),
  `pm.test(${JSON.stringify(`message mentions "${fragment}"`)}, () => {`,
  `  pm.expect(pm.response.json().message.toLowerCase()).to.include(${JSON.stringify(fragment.toLowerCase())});`,
  "});",
];
const envelope = (code) => [
  ...expect(code),
  "const b = pm.response.json();",
  'pm.test("standard envelope", () => {',
  '  pm.expect(b).to.have.property("success");',
  '  pm.expect(b).to.have.property("message");',
  '  pm.expect(b).to.have.property("data");',
  "});",
];
const noPassword = [
  'pm.test("password never leaks", () => {',
  '  pm.expect(pm.response.text()).to.not.include("\\"password\\"");',
  "});",
];

// =========================================================================
const health = [
  req("Root", "GET", "", { desc: "Unauthenticated liveness check." , tests: expect(200)}),
];
health[0].request.url = { raw: `${V("baseUrl")}/api`, host: [V("baseUrl")], path: ["api"] };

// --- 01 Auth --------------------------------------------------------------
const auth = [
  req("Register a new customer", "POST", "/auth/register", {
    body: {
      name: "Meghna Cement Mills",
      email: "{{runEmail}}",
      password: "Meghna@1234",
      phone: "+8801711445566",
      companyName: "Meghna Cement Mills Ltd",
      billingAddr: "Mongla EPZ, Bagerhat",
    },
    desc:
      "Self-registration always creates a CUSTOMER. `role` is never read from the request body, so " +
      "sending one has no effect - a customer cannot make themselves an admin." + BR +
      "The email is generated per run, so this collection can be replayed without hitting the unique " +
      "constraint on User.email.",
    prerequest: [
      "// Unique email per run so the collection is replayable.",
      "const stamp = Date.now();",
      'pm.collectionVariables.set("runEmail", `demo.reviewer.${stamp}@meghnacement.com`);',
    ],
    tests: [...expect(201), ...noPassword,
      "const d = pm.response.json().data;",
      'pm.test("role forced to CUSTOMER", () => pm.expect(d.role).to.eql("CUSTOMER"));',
      'pm.test("customer profile created", () => pm.expect(d.customer).to.be.an("object"));',
    ],
  }),
  req("Login - new customer", "POST", "/auth/login", {
    body: { email: "{{runEmail}}", password: "Meghna@1234" },
    desc: "Captures {{customerToken}}. This is the customer used for the whole service flow.",
    tests: saveToken("customerToken"),
  }),
  req("Login - ADMIN (demo account)", "POST", "/auth/login", {
    body: { email: "admin@gmail.com", password: "Admin@12345" },
    desc: "The demo admin credentials from the submission form. Captures {{adminToken}}.",
    tests: saveToken("adminToken"),
  }),
  req("Login - TECHNICIAN (hydraulics)", "POST", "/auth/login", {
    body: { email: "tech.salam@gmail.com", password: "Admin@12345" },
    desc:
      "TECH-003, skilled in Industrial Plumbing and Hydraulic Systems. Captures {{technicianToken}}; " +
      "this is the technician the job gets assigned to.",
    tests: saveToken("technicianToken"),
  }),
  req("Login - second CUSTOMER", "POST", "/auth/login", {
    body: { email: "corp1@apextextiles.com", password: "Admin@12345" },
    desc: "A different company. Used to prove a customer cannot read another company's data.",
    tests: saveToken("customerToken2"),
  }),
  req("Login - second TECHNICIAN", "POST", "/auth/login", {
    body: { email: "tech.karim@gmail.com", password: "Admin@12345" },
    desc:
      "TECH-002, skilled in HVAC and Fire & Safety - deliberately NOT hydraulics. Used for both the " +
      "wrong-skill rejection and the technician-vs-technician ownership check.",
    tests: saveToken("technicianToken2"),
  }),
  req("Refresh token (rotation)", "POST", "/auth/refresh-token", {
    body: { refreshToken: "{{customerTokenRefresh}}" },
    desc:
      "Rotation: the presented refresh token is revoked and a fresh pair issued, so a stolen refresh " +
      "token works at most once." + BR +
      "The token is read from the login response above.",
    prerequest: [
      "// nothing to do - the refresh token was captured at login",
    ],
    tests: expect(200),
  }),
  req("Google social login (manual step)", "POST", "/auth/google", {
    body: { idToken: "PASTE_A_GOOGLE_ID_TOKEN_HERE" },
    desc:
      "MANUAL STEP - skipped by the collection runner." + BR +
      "GCP social login. The id_token is obtained in a browser and verified server-side against " +
      "Google's public keys, including an audience check against GOOGLE_CLIENT_ID, so a token minted " +
      "for another application cannot be replayed here." + BR +
      "To try it: open {{baseUrl}}/google-signin.html, sign in with Google, and paste the token that " +
      "appears into the body above." + BR +
      "An existing password account with the same email is linked rather than duplicated, and a " +
      "Google-only account has a null password - which is why the login and change-password endpoints " +
      "both guard against it.",
  }),
];

// --- 02 Catalog -----------------------------------------------------------
const catalog = [
  req("List service categories (public)", "GET", "/categories", {
    query: { page: 1, limit: 20 },
    desc:
      "Public on purpose: a customer has to be able to browse the catalogue before registering." + BR +
      "Captures the hydraulics category used by the service flow, plus a skill id for the admin " +
      "create-category request below.",
    tests: [...envelope(200),
      "const d = pm.response.json().data;",
      "const hyd = d.find(c => c.requiredSkill.name === 'Hydraulic Systems');",
      "if (hyd) {",
      "  pm.collectionVariables.set('categoryId', hyd.id);",
      "  pm.collectionVariables.set('categoryName', hyd.name);",
      "}",
      "if (d.length) pm.collectionVariables.set('skillId', d[0].requiredSkillId);",
      "pm.test('hydraulics category found', () => pm.expect(hyd).to.not.be.undefined);",
    ],
  }),
  req("Get one category", "GET", "/categories/{{categoryId}}", { tests: expect(200) }),
  req("Search categories", "GET", "/categories", {
    query: { searchTerm: "hydraulic", page: 1, limit: 5 },
    desc: "Case-insensitive search across name and description.",
    tests: expect(200),
  }),
  req("List skills (public)", "GET", "/skills", { tests: expect(200) }),
  req("Create a category (ADMIN)", "POST", "/categories", {
    body: {
      name: "Switchgear Thermal Imaging {{runStamp}}",
      description: "Infrared survey of LV/HV switchgear under load.",
      requiredSkillId: "{{skillId}}",
      baseCharge: 180,
      estimatedMins: 120,
    },
    desc:
      "Admin-only. The name carries a run stamp so the collection stays replayable against the unique " +
      "constraint on ServiceCategory.name." + BR +
      "Captures {{newCategoryId}} so the update and delete below act on this row, leaving the " +
      "hydraulics category the service flow depends on untouched.",
    token: "adminToken",
    prerequest: ['pm.collectionVariables.set("runStamp", String(Date.now()).slice(-6));'],
    tests: saveId("newCategoryId"),
  }),
  req("Update a category (ADMIN)", "PATCH", "/categories/{{newCategoryId}}", {
    body: { baseCharge: 210, estimatedMins: 150 },
    token: "adminToken",
    tests: expect(200),
  }),
  req("Delete a category (ADMIN, soft)", "DELETE", "/categories/{{newCategoryId}}", {
    desc:
      "Soft delete: sets deletedAt and isActive=false. The row survives so historical service requests " +
      "still resolve their category. No endpoint in this API performs a hard delete.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("Create a skill (ADMIN)", "POST", "/skills", {
    body: { name: "Vibration Analysis {{runStamp}}" },
    token: "adminToken",
    tests: expect(201),
  }),
  req("403 - customer tries to create a category", "POST", "/categories", {
    body: {
      name: "Should Not Exist",
      requiredSkillId: "{{skillId}}",
      baseCharge: 10,
      estimatedMins: 30,
    },
    desc: "Role check. Catalogue management is admin-only.",
    token: "customerToken",
    tests: expect(403),
  }),
];

// --- 03 Technicians -------------------------------------------------------
const technicians = [
  req("List technicians (public)", "GET", "/technicians", {
    query: { page: 1, limit: 20 },
    desc:
      "Captures two technicians: one WITH the Hydraulic Systems skill (who can take the job) and one " +
      "WITHOUT it (used to demonstrate the skill check rejecting an unqualified assignment).",
    tests: [...expect(200),
      "const d = pm.response.json().data;",
      "const names = t => (t.skills || []).map(s => s.skill.name);",
      "const good = d.find(t => names(t).includes('Hydraulic Systems'));",
      "const bad  = d.find(t => !names(t).includes('Hydraulic Systems'));",
      "if (good) pm.collectionVariables.set('technicianId', good.id);",
      "if (bad)  pm.collectionVariables.set('technicianIdWrongSkill', bad.id);",
      "pm.test('a hydraulics technician exists', () => pm.expect(good).to.not.be.undefined);",
    ],
  }),
  req("Filter technicians by city", "GET", "/technicians", {
    query: { city: "Dhaka", page: 1, limit: 10 },
    tests: expect(200),
  }),
];

// --- 04 Profile -----------------------------------------------------------
const users = [
  req("My profile", "GET", "/users/me", {
    desc: "Any authenticated role.",
    token: "customerToken",
    tests: [...expect(200), ...noPassword],
  }),
  req("Update my profile", "PATCH", "/users/me", {
    body: { name: "Meghna Cement Mills Ltd", phone: "+8801711445599" },
    token: "customerToken",
    tests: expect(200),
  }),
  req("Upload avatar (manual step)", "PATCH", "/users/me/avatar", {
    desc:
      "MANUAL STEP - needs a file, so the runner skips it." + BR +
      "multipart/form-data with a single `file` field. Stored on Cloudinary; the previous image is " +
      "deleted using its stored public_id, so replacing an avatar does not leak orphaned files.",
    token: "customerToken",
    formdata: [{ key: "file", type: "file", src: [] }],
  }),
];

// --- 05 Sites -------------------------------------------------------------
const sites = [
  req("Create a site", "POST", "/sites", {
    body: {
      label: "Kiln Line 2 - Hydraulic Room",
      address: "Mongla EPZ, Plot 7, Bagerhat",
      city: "Khulna",
      contactName: "Nazrul Islam",
      contactPhone: "+8801811223344",
    },
    desc:
      "A customer company has many physical sites, and a service request targets one of them. The " +
      "site contact is the person the technician calls on arrival, which is not the person who signs " +
      "the purchase order.",
    token: "customerToken",
    tests: saveId("siteId"),
  }),
  req("List my sites (CUSTOMER)", "GET", "/sites", {
    query: { page: 1, limit: 10 },
    desc: "A customer sees only their own sites. Compare the total with the admin request below.",
    token: "customerToken",
    tests: [...expect(200),
      "const m = pm.response.json().meta;",
      "pm.collectionVariables.set('customerSiteTotal', m.total);",
      "pm.test('newly registered customer owns exactly one site', () => pm.expect(m.total).to.eql(1));",
    ],
  }),
  req("List all sites (ADMIN)", "GET", "/sites", {
    query: { page: 1, limit: 10 },
    desc:
      "Same route, different audience. The scoping happens in the service layer, not the route, which " +
      "is why one endpoint can safely serve both.",
    token: "adminToken",
    tests: [...expect(200),
      "const total = pm.response.json().meta.total;",
      "const mine = Number(pm.collectionVariables.get('customerSiteTotal'));",
      "pm.test('admin sees more sites than the customer does', () => pm.expect(total).to.be.above(mine));",
    ],
  }),
  req("Get one site", "GET", "/sites/{{siteId}}", { token: "customerToken", tests: expect(200) }),
  req("Update a site", "PATCH", "/sites/{{siteId}}", {
    body: { contactPhone: "+8801811555666" },
    token: "customerToken",
    tests: expect(200),
  }),
];

// --- 06 Service requests --------------------------------------------------
const requests = [
  req("Create a service request", "POST", "/requests", {
    body: {
      siteId: "{{siteId}}",
      categoryId: "{{categoryId}}",
      title: "Hydraulic press losing pressure mid-cycle",
      description:
        "Press on kiln line 2 drops from 180 bar to 120 bar during the hold phase. Suspected pump seal or relief valve fault.",
      priority: "HIGH",
    },
    desc:
      "The site must belong to the calling customer and the category must be active - a customer " +
      "cannot raise a request against another company's plant." + BR +
      "The SR- code comes from a Postgres sequence rather than count()+1, so two concurrent requests " +
      "can never be handed the same number.",
    token: "customerToken",
    tests: [...saveId("requestId"),
      "const d = pm.response.json().data;",
      "pm.test('sequential SR- code issued', () => pm.expect(d.code).to.match(/^SR-\\d{4}-\\d{6}$/));",
    ],
  }),
  req("Create a second request (for the 409 demo)", "POST", "/requests", {
    body: {
      siteId: "{{siteId}}",
      categoryId: "{{categoryId}}",
      title: "Second hydraulic unit - overlapping slot",
      description:
        "Raised so the double-booking demonstration has a request to approve onto a conflicting time window.",
      priority: "NORMAL",
    },
    token: "customerToken",
    tests: saveId("requestIdConflict"),
  }),
  req("Create a third request (for cancel / delete)", "POST", "/requests", {
    body: {
      siteId: "{{siteId}}",
      categoryId: "{{categoryId}}",
      title: "Spare request for the cancel and delete demos",
      description:
        "Kept separate so cancelling and deleting does not consume the request the work-order flow needs.",
    },
    token: "customerToken",
    tests: saveId("requestIdSpare"),
  }),
  req("List my requests (CUSTOMER)", "GET", "/requests", {
    query: { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
    desc: "Scoped to the caller's own company.",
    token: "customerToken",
    tests: [...expect(200),
      "pm.test('exactly the three requests just created', () => pm.expect(pm.response.json().meta.total).to.eql(3));",
    ],
  }),
  req("List all requests (ADMIN)", "GET", "/requests", {
    query: { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" },
    token: "adminToken",
    tests: expect(200),
  }),
  req("Search + filter requests", "GET", "/requests", {
    query: { searchTerm: "hydraulic", status: "PENDING", priority: "HIGH", page: 1, limit: 5 },
    desc: "searchTerm matches code, title and description. Filters: status, priority, categoryId, siteId.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("Get one request", "GET", "/requests/{{requestId}}", {
    token: "customerToken",
    tests: expect(200),
  }),
  req("Update a request (PENDING only)", "PATCH", "/requests/{{requestId}}", {
    body: { priority: "CRITICAL", title: "Hydraulic press losing pressure - escalated" },
    desc: "Allowed only while the request is still PENDING, i.e. before a dispatcher has acted on it.",
    token: "customerToken",
    tests: expect(200),
  }),
  req("Cancel a request", "PATCH", "/requests/{{requestIdSpare}}/cancel", {
    desc: "Customer only, PENDING only. Acts on the spare request.",
    token: "customerToken",
    tests: expect(200),
  }),
  req("Delete a request (ADMIN, soft)", "DELETE", "/requests/{{requestIdSpare}}", {
    desc: "Soft delete. Refused for CONVERTED requests, which already have a work order behind them.",
    token: "adminToken",
    tests: expect(200),
  }),
];

// --- 07 Assignment --------------------------------------------------------
const assignment = [
  req("400 - assign a technician without the required skill", "PATCH", "/requests/{{requestId}}/approve", {
    body: {
      technicianId: "{{technicianIdWrongSkill}}",
      scheduledStart: "{{slotStart}}",
      scheduledEnd: "{{slotEnd}}",
    },
    desc:
      "The service category names the skill the job needs; the assignment transaction checks the " +
      "technician actually holds it. Without this, a dispatcher could send an HVAC engineer to a " +
      "hydraulics fault and nothing would object.",
    token: "adminToken",
    prerequest: [
      "// A fresh future window on every run, so replays never collide.",
      "const d = new Date();",
      "d.setUTCDate(d.getUTCDate() + 30);",
      "d.setUTCHours(9, 0, 0, 0);",
      "const end = new Date(d.getTime() + 3 * 60 * 60 * 1000);",
      "pm.collectionVariables.set('slotStart', d.toISOString());",
      "pm.collectionVariables.set('slotEnd', end.toISOString());",
      "// A window that deliberately overlaps the one above.",
      "const oStart = new Date(d.getTime() + 60 * 60 * 1000);",
      "const oEnd = new Date(d.getTime() + 4 * 60 * 60 * 1000);",
      "pm.collectionVariables.set('slotOverlapStart', oStart.toISOString());",
      "pm.collectionVariables.set('slotOverlapEnd', oEnd.toISOString());",
      "// A clear window for the reschedule demo.",
      "const rStart = new Date(d.getTime() + 48 * 60 * 60 * 1000);",
      "const rEnd = new Date(rStart.getTime() + 3 * 60 * 60 * 1000);",
      "pm.collectionVariables.set('slotRescheduleStart', rStart.toISOString());",
      "pm.collectionVariables.set('slotRescheduleEnd', rEnd.toISOString());",
    ],
    tests: expectMessage(400, "skill"),
  }),
  req("Approve the request -> create the work order", "PATCH", "/requests/{{requestId}}/approve", {
    body: {
      technicianId: "{{technicianId}}",
      scheduledStart: "{{slotStart}}",
      scheduledEnd: "{{slotEnd}}",
    },
    desc:
      "One Serializable transaction: verify the technician holds the required skill, check the daily " +
      "job cap, create the WorkOrder with a WO- code, flip the request to CONVERTED, and write both a " +
      "history row and an audit row. Either all of that happens or none of it does." + BR +
      "Time-overlap is deliberately NOT checked in application code - see the 409 below.",
    token: "adminToken",
    tests: [...saveId("workOrderId"),
      "const d = pm.response.json().data;",
      "pm.test('sequential WO- code issued', () => pm.expect(d.code).to.match(/^WO-\\d{4}-\\d{6}$/));",
      "pm.test('starts in ASSIGNED', () => pm.expect(d.status).to.eql('ASSIGNED'));",
    ],
  }),
  req("409 - double-booking the same technician", "PATCH", "/requests/{{requestIdConflict}}/approve", {
    body: {
      technicianId: "{{technicianId}}",
      scheduledStart: "{{slotOverlapStart}}",
      scheduledEnd: "{{slotOverlapEnd}}",
    },
    desc:
      "THE HEADLINE CASE." + BR +
      "The same technician, a time window overlapping the job just created. An application-level " +
      "\"is the slot free?\" check has an unavoidable race: two dispatchers can both read free and both " +
      "insert. Here a Postgres exclusion constraint makes the check and the write one atomic " +
      "operation, so the race cannot happen at all:" + BR +
      "  EXCLUDE USING gist (technicianId WITH =, tstzrange(scheduledStart, scheduledEnd) WITH &&)" + BR +
      "The violation raises SQLSTATE 23P01, which the global error handler maps to a clean 409.",
    token: "adminToken",
    tests: expectMessage(409, "already has a job"),
  }),
  req("Reject a request (ADMIN)", "PATCH", "/requests/{{requestIdConflict}}/reject", {
    body: { rejectReason: "No second technician available in this window; customer asked to defer." },
    desc: "A rejection reason is required and is stored on the request for the customer to read.",
    token: "adminToken",
    tests: expect(200),
  }),
];

// --- 08 Work order lifecycle ---------------------------------------------
const lifecycle = [
  req("List work orders (ADMIN - all)", "GET", "/work-orders", {
    query: { page: 1, limit: 10 },
    desc: "Role-scoped three ways: admin sees all, a technician sees their own jobs, a customer sees their company's.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("List work orders (TECHNICIAN - own only)", "GET", "/work-orders", {
    query: { page: 1, limit: 10 },
    token: "technicianToken",
    tests: expect(200),
  }),
  req("My assigned jobs (TECHNICIAN)", "GET", "/work-orders/my-assigned", {
    token: "technicianToken",
    tests: expect(200),
  }),
  req("Get one work order (with full history)", "GET", "/work-orders/{{workOrderId}}", {
    desc: "Includes the complete status history - every transition, who made it and when.",
    token: "technicianToken",
    tests: expect(200),
  }),
  req("400 - illegal transition (ASSIGNED -> COMPLETED)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "COMPLETED" },
    desc:
      "Transitions are checked against a single allowed-transitions map rather than accepting whatever " +
      "status the client sends. A job cannot skip from ASSIGNED straight to COMPLETED.",
    token: "technicianToken",
    tests: expectMessage(400, "cannot move"),
  }),
  req("403 - technician attempts an admin-only transition", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "SCHEDULED" },
    desc: "Legal transition, wrong actor. Scheduling is the dispatcher's job.",
    token: "technicianToken",
    tests: expect(403),
  }),
  req("Status -> SCHEDULED (ADMIN)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "SCHEDULED", note: "Confirmed the visit window with the site contact." },
    token: "adminToken",
    tests: expect(200),
  }),
  req("403 - a different technician touches this job", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "EN_ROUTE" },
    desc:
      "OWNERSHIP CHECK, NOT JUST A ROLE CHECK." + BR +
      "The caller IS a technician, so the role guard passes. The service then compares the job's " +
      "technician against the caller and refuses. Without this, every technician could drive every " +
      "other technician's jobs.",
    token: "technicianToken2",
    tests: expectMessage(403, "not assigned to you"),
  }),
  req("Reschedule the visit (ADMIN)", "PATCH", "/work-orders/{{workOrderId}}/reschedule", {
    body: {
      scheduledStart: "{{slotRescheduleStart}}",
      scheduledEnd: "{{slotRescheduleEnd}}",
      note: "Customer requested a later slot.",
    },
    desc: "Re-triggers the exclusion constraint - moving a job onto an occupied window also returns 409.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("Status -> EN_ROUTE (TECHNICIAN)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "EN_ROUTE" },
    token: "technicianToken",
    tests: expect(200),
  }),
  req("Status -> IN_PROGRESS (TECHNICIAN)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: { status: "IN_PROGRESS" },
    desc: "Stamps actualStart. The invoice bills from the ACTUAL times worked, not the scheduled window.",
    token: "technicianToken",
    tests: [...expect(200),
      "pm.test('actualStart stamped', () => pm.expect(pm.response.json().data.actualStart).to.not.be.null);",
    ],
  }),
  req("Log parts used (TECHNICIAN)", "POST", "/work-orders/{{workOrderId}}/parts", {
    body: { name: "Hydraulic pump seal kit", quantity: 2, unitPrice: 68.75 },
    desc:
      "unitPrice is stored on the row rather than looked up from a price list later. An invoice must " +
      "keep the price as it was on the day of the job, otherwise last year's invoice silently changes " +
      "when someone edits a catalogue price.",
    token: "technicianToken",
    tests: expect(201),
  }),
  req("Status -> COMPLETED (TECHNICIAN)", "PATCH", "/work-orders/{{workOrderId}}/status", {
    body: {
      status: "COMPLETED",
      diagnosis: "Worn main pump shaft seal and a sticking relief valve.",
      workSummary:
        "Replaced the seal kit, cleaned and reset the relief valve. Pressure held at 180 bar over a 30-minute test.",
    },
    desc: "Stamps actualEnd, which closes the billable window.",
    token: "technicianToken",
    tests: [...expect(200),
      "pm.test('actualEnd stamped', () => pm.expect(pm.response.json().data.actualEnd).to.not.be.null);",
    ],
  }),
  req("400 - parts after completion", "POST", "/work-orders/{{workOrderId}}/parts", {
    body: { name: "Late part", quantity: 1, unitPrice: 10 },
    desc: "Parts can only be logged while the job is EN_ROUTE or IN_PROGRESS. Once complete, the totals are frozen.",
    token: "technicianToken",
    tests: expect(400),
  }),
];

// --- 09 Invoicing ---------------------------------------------------------
const invoicing = [
  req("Generate the invoice (ADMIN)", "POST", "/work-orders/{{workOrderId}}/invoice", {
    desc:
      "One transaction: labour hours from actualEnd - actualStart (floored at 0.5h), labour = hours x " +
      "the technician's hourly rate, parts = sum(unitPrice x quantity), 15% VAT, then an INV- number " +
      "from a sequence, and the work order moves to INVOICED." + BR +
      "All five money components are stored, not just the total, so the invoice keeps its own " +
      "arithmetic even after the technician's rate changes.",
    token: "adminToken",
    tests: [...saveId("invoiceId"),
      "const d = pm.response.json().data;",
      "const n = v => Number(v);",
      "pm.test('components sum to the stored total', () => {",
      "  const sum = n(d.labourAmount) + n(d.partsAmount) + n(d.vatAmount);",
      "  pm.expect(Math.abs(sum - n(d.totalAmount))).to.be.below(0.011);",
      "});",
      "pm.test('issued as DUE', () => pm.expect(d.status).to.eql('DUE'));",
    ],
  }),
  req("409 - invoicing the same work order twice", "POST", "/work-orders/{{workOrderId}}/invoice", {
    desc: "One invoice per work order, enforced by a unique constraint as well as this check.",
    token: "adminToken",
    tests: expect(409),
  }),
  req("List invoices (ADMIN)", "GET", "/invoices", {
    query: { page: 1, limit: 10 },
    desc: "Role-scoped. Filters: status, from, to, searchTerm.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("List invoices (CUSTOMER - own only)", "GET", "/invoices", {
    query: { page: 1, limit: 10 },
    token: "customerToken",
    tests: expect(200),
  }),
  req("Get one invoice", "GET", "/invoices/{{invoiceId}}", {
    token: "customerToken",
    tests: expect(200),
  }),
  req("403 - another customer reads this invoice", "GET", "/invoices/{{invoiceId}}", {
    desc: "Ownership check. Both callers are customers; only one owns the invoice.",
    token: "customerToken2",
    tests: expectMessage(403, "not your invoice"),
  }),
];

// --- 10 Payment -----------------------------------------------------------
const payment = [
  req("Initiate a Stripe payment (CUSTOMER)", "POST", "/payments/initiate", {
    body: { invoiceId: "{{invoiceId}}" },
    desc:
      "Writes a Payment row in INITIATED state carrying our own transactionId, then creates a Stripe " +
      "Checkout session with that id in its metadata. Each attempt is its own row, so an abandoned " +
      "checkout leaves a trail and the customer can retry - which is why an Invoice has many Payments." + BR +
      "TO COMPLETE THE PAYMENT: open the checkoutUrl from the response, pay with test card " +
      "4242 4242 4242 4242, any future expiry, any CVC. Stripe then calls the webhook.",
    token: "customerToken",
    tests: [...expect(201),
      "const d = pm.response.json().data;",
      "if (d && d.transactionId) pm.collectionVariables.set('transactionId', d.transactionId);",
      "if (d && d.checkoutUrl) pm.collectionVariables.set('checkoutUrl', d.checkoutUrl);",
      "pm.test('a live Stripe checkout url was returned', () => pm.expect(d.checkoutUrl).to.include('checkout.stripe.com'));",
      "console.log('PAY HERE ->', d.checkoutUrl);",
    ],
  }),
  req("Payment status (before paying: INITIATED)", "GET", "/payments/{{transactionId}}", {
    desc:
      "Run this before completing checkout. The payment is INITIATED and the invoice is still DUE - " +
      "nothing is marked paid until the verified webhook arrives.",
    token: "customerToken",
    tests: expect(200),
  }),
  req("Payment status (after paying: SUCCESS)", "GET", "/payments/{{transactionId}}", {
    desc:
      "Run this AFTER completing checkout in the browser." + BR +
      "Expect payment SUCCESS, invoice PAID with paidAt set, and the work order PAID. The gatewayRef " +
      "has been replaced with the Stripe payment intent, and the raw event body is stored in " +
      "gatewayPayload for reconciliation.",
    token: "customerToken",
    tests: [...expect(200),
      "const d = pm.response.json().data;",
      "if (d.status === 'SUCCESS') {",
      "  pm.test('payment settled by the verified webhook', () => pm.expect(d.status).to.eql('SUCCESS'));",
      "  pm.test('invoice marked paid', () => pm.expect(d.invoice.status).to.eql('PAID'));",
      "  pm.test('work order marked paid', () => pm.expect(d.invoice.workOrder.status).to.eql('PAID'));",
      "} else {",
      "  pm.test('PENDING MANUAL STEP - open the checkoutUrl and pay to settle this', () => {",
      "    pm.expect(d.status).to.eql('INITIATED');",
      "  });",
      "}",
    ],
  }),
  {
    name: "Stripe webhook (reference only - do not send)",
    request: {
      method: "POST",
      header: [
        { key: "stripe-signature", value: "t=...,v1=..." },
        { key: "Content-Type", value: "application/json" },
      ],
      url: {
        raw: `${V("baseUrl")}/api/v1/payments/webhook`,
        host: [V("baseUrl")],
        path: ["api", "v1", "payments", "webhook"],
      },
      body: { mode: "raw", raw: "<raw Stripe event body - Stripe sends this, not you>" },
      description:
        "THE ONLY PATH THAT MARKS AN INVOICE PAID." + BR +
        "Nothing else in the codebase writes InvoiceStatus.PAID or WorkOrderStatus.PAID, and PAID has " +
        "an empty role list in the transition map, so even an admin cannot set it through the status " +
        "endpoint. Payment is confirmed by Stripe, never by a client redirect." + BR +
        "Signature verification uses the RAW request body, which is why this one route is mounted with " +
        "express.raw() ahead of express.json()." + BR +
        "Idempotent: Stripe retries webhooks. The handler looks the payment up by our transactionId and " +
        "returns early if it is already SUCCESS, and re-verifies the charged amount against the invoice " +
        "total before settling, so a tampered session cannot clear a large invoice with a small charge." + BR +
        "Sending this request by hand always returns 400 - a hand-made body cannot carry a valid Stripe " +
        "signature. That is the endpoint working correctly.",
    },
    response: [],
  },
];

// --- 11 Feedback ----------------------------------------------------------
const feedback = [
  req("Submit feedback (CUSTOMER)", "POST", "/work-orders/{{workOrderId}}/feedback", {
    body: {
      rating: 5,
      comment: "Technician found the relief valve fault quickly and the press has held pressure since.",
    },
    desc:
      "Closes the service flow. One transaction inserts the rating AND recomputes the technician's " +
      "ratingAvg / ratingCount, so the stored average can never drift from the rows behind it." + BR +
      "Requires the work order to be PAID, so run this after completing checkout.",
    token: "customerToken",
    tests: expect(201),
  }),
  req("409 - rating the same job twice", "POST", "/work-orders/{{workOrderId}}/feedback", {
    body: { rating: 3 },
    desc: "One rating per work order, enforced by a unique constraint as well as this check.",
    token: "customerToken",
    tests: expect(409),
  }),
  req("403 - another customer rates this job", "POST", "/work-orders/{{workOrderId}}/feedback", {
    body: { rating: 1 },
    token: "customerToken2",
    tests: expect(403),
  }),
  req("Get the feedback for a work order", "GET", "/work-orders/{{workOrderId}}/feedback", {
    token: "adminToken",
    tests: expect(200),
  }),
  req("List feedback (TECHNICIAN - ratings received)", "GET", "/feedbacks", {
    query: { page: 1, limit: 10 },
    desc: "A customer sees ratings they left, a technician sees ratings they received, an admin sees all.",
    token: "technicianToken",
    tests: expect(200),
  }),
  req("Technician rating was recomputed", "GET", "/technicians", {
    query: { page: 1, limit: 20 },
    desc: "ratingAvg and ratingCount on the assigned technician have moved after the feedback above.",
    tests: expect(200),
  }),
];

// --- 12 Admin -------------------------------------------------------------
const admin = [
  req("List users (ADMIN)", "GET", "/admin/users", {
    query: { page: 1, limit: 20 },
    desc:
      "Filters: role, status, searchTerm across name / email / phone. Passwords are stripped at the " +
      "query with Prisma's omit, so they cannot leak from this endpoint even by accident.",
    token: "adminToken",
    tests: [...expect(200), ...noPassword,
      "const d = pm.response.json().data;",
      "const t = d.find(u => u.role === 'TECHNICIAN');",
      "if (t) pm.collectionVariables.set('targetUserId', t.id);",
      "const me = d.find(u => u.role === 'ADMIN');",
      "if (me) pm.collectionVariables.set('adminUserId', me.id);",
    ],
  }),
  req("Filter users by role and status", "GET", "/admin/users", {
    query: { role: "TECHNICIAN", status: "ACTIVE", page: 1, limit: 10 },
    token: "adminToken",
    tests: expect(200),
  }),
  req("Get one user", "GET", "/admin/users/{{targetUserId}}", {
    desc: "Includes the customer or technician profile, their sites or skills.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("Suspend a user (ADMIN)", "PATCH", "/admin/users/{{targetUserId}}/status", {
    body: { status: "SUSPENDED", reason: "Certification renewal pending." },
    desc:
      "Takes effect on the account's very NEXT request, not when its access token expires: checkAuth " +
      "re-reads the user from the database on every call, and the same transaction revokes every " +
      "refresh token so the session cannot be renewed.",
    token: "adminToken",
    tests: expect(200),
  }),
  req("403 - suspended user's existing token is dead", "GET", "/work-orders/my-assigned", {
    desc:
      "The token below was issued BEFORE the suspension and has not expired. It is rejected anyway - " +
      "that is the database re-read doing its job.",
    token: "technicianToken",
    tests: expectMessage(403, "suspended"),
  }),
  req("Reactivate the user (ADMIN)", "PATCH", "/admin/users/{{targetUserId}}/status", {
    body: { status: "ACTIVE" },
    token: "adminToken",
    tests: expect(200),
  }),
  req("400 - admin changes their own status", "PATCH", "/admin/users/{{adminUserId}}/status", {
    body: { status: "SUSPENDED" },
    desc: "Refused. An admin locking themselves out would need database access to recover.",
    token: "adminToken",
    tests: expect(400),
  }),
  req("400 - role change that would orphan a profile", "PATCH", "/admin/users/{{targetUserId}}/role", {
    body: { role: "CUSTOMER" },
    desc: "A technician has no customer profile, so making them a CUSTOMER is refused rather than silently breaking their data.",
    token: "adminToken",
    tests: expect(400),
  }),
  req("403 - a customer opens the admin area", "GET", "/admin/users", {
    token: "customerToken",
    tests: expect(403),
  }),
];

// --- 13 Validation & auth errors -----------------------------------------
const errors = [
  req("401 - no token", "GET", "/work-orders", { tests: expect(401) }),
  req("401 - malformed token", "GET", "/work-orders", {
    token: "badToken",
    prerequest: ['pm.collectionVariables.set("badToken", "not.a.real.token");'],
    tests: expect(401),
  }),
  req("400 - validation errors, field by field", "POST", "/auth/register", {
    body: {
      name: "A",
      email: "not-an-email",
      password: "abc",
      companyName: "X",
      billingAddr: "Y",
    },
    desc:
      "Zod failures are returned as a field-by-field errors array, which is what a client needs to " +
      "highlight the offending inputs.",
    tests: [...expect(400),
      "const b = pm.response.json();",
      "pm.test('errors array is populated', () => pm.expect(b.errors).to.be.an('array').that.is.not.empty);",
      "pm.test('each error names its field', () => pm.expect(b.errors[0]).to.have.property('path'));",
    ],
  }),
  req("401 - wrong password", "POST", "/auth/login", {
    body: { email: "admin@gmail.com", password: "WrongPassword@123" },
    desc:
      "The same message is returned for an unknown email and a wrong password, so the endpoint cannot " +
      "be used to discover which email addresses have accounts.",
    tests: expect(401),
  }),
  req("401 - unknown email (identical message)", "POST", "/auth/login", {
    body: { email: "nobody.here@example.com", password: "WrongPassword@123" },
    tests: expect(401),
  }),
  req("404 - unknown route", "GET", "/does-not-exist", { tests: expect(404) }),
  req("404 - valid uuid, no such record", "GET", "/work-orders/00000000-0000-4000-8000-000000000000", {
    token: "adminToken",
    tests: expect(404),
  }),
];

// --- 14 Session teardown (run last) --------------------------------------
const teardown = [
  req("Change password", "POST", "/auth/change-password", {
    body: { oldPassword: "Meghna@1234", newPassword: "Meghna@12345" },
    desc:
      "Requires the old password, and revokes every refresh token for that user - a password change " +
      "is usually prompted by a suspected compromise, so leaving other sessions alive would defeat it." + BR +
      "Acts on the throwaway account registered at the start of this run, so nothing shared is affected.",
    token: "customerToken",
    tests: expect(200),
  }),
  req("Logout", "POST", "/auth/logout", {
    body: {},
    desc: "Stamps revokedAt on the refresh token and clears both cookies.",
    tests: expect(200),
  }),
];

// =========================================================================
const collection = {
  info: {
    name: "FieldOps - Field Service Management API",
    description:
      "B7A6 Assignment 7 - Field Service Management (student ID last digit 7)." + BR +
      "HOW TO RUN" + BR +
      "1. Select the 'FieldOps - Live' environment (or leave baseUrl as-is; it points at production)." + BR +
      "2. Open the collection menu and choose Run collection." + BR +
      "3. Everything passes without typing a single value. Tokens and ids are captured automatically, " +
      "and the customer registered at the start uses a unique email each run, so the collection can be " +
      "replayed as often as you like." + BR +
      "TWO REQUESTS NEED A HUMAN, and are marked MANUAL STEP in their description:" + BR +
      "- 01 Auth > Google social login (needs an id_token from a browser sign-in)" + BR +
      "- 04 Profile > Upload avatar (needs a file)" + BR +
      "ONE STEP NEEDS A BROWSER: in 10 Payment, open the checkoutUrl returned by 'Initiate a Stripe " +
      "payment' and pay with test card 4242 4242 4242 4242 (any future expiry, any CVC). The requests " +
      "after it - payment status, and all of 11 Feedback - depend on that payment having settled." + BR +
      "THE SERVICE FLOW" + BR +
      "A customer raises a service request against one of their sites -> a dispatcher approves it and " +
      "assigns a skill-matched technician into a conflict-free slot -> the technician runs the job " +
      "through a guarded status workflow and logs the parts used -> the system generates an invoice " +
      "from the hours actually worked -> the customer pays through Stripe -> a signature-verified " +
      "webhook confirms the payment -> the customer rates the job." + BR +
      "DEMO ACCOUNTS (password Admin@12345 for all)" + BR +
      "  admin@gmail.com          ADMIN" + BR +
      "  tech.salam@gmail.com     TECHNICIAN (hydraulics - takes the job in this run)" + BR +
      "  tech.karim@gmail.com     TECHNICIAN (HVAC - used for the wrong-skill and ownership demos)" + BR +
      "  corp1@apextextiles.com   CUSTOMER (a different company, for the ownership demos)",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: LIVE },
    ...[
      "runEmail", "runStamp",
      "adminToken", "customerToken", "technicianToken",
      "customerToken2", "technicianToken2", "badToken",
      "categoryId", "categoryName", "newCategoryId", "skillId",
      "technicianId", "technicianIdWrongSkill",
      "siteId", "customerSiteTotal",
      "requestId", "requestIdConflict", "requestIdSpare",
      "workOrderId", "invoiceId", "transactionId", "checkoutUrl",
      "targetUserId", "adminUserId",
      "slotStart", "slotEnd", "slotOverlapStart", "slotOverlapEnd",
      "slotRescheduleStart", "slotRescheduleEnd",
    ].map((key) => ({ key, value: "" })),
  ],
  item: [
    { name: "00 Health", item: health, description: "Unauthenticated liveness check." },
    { name: "01 Auth", item: auth, description: "Email/password and Google social login, plus refresh-token rotation. Run this folder first - it captures every role token the rest of the collection uses." },
    { name: "02 Catalog", item: catalog, description: "Service categories and skills. Reads are public so a customer can browse before registering; writes are admin-only." },
    { name: "03 Technicians", item: technicians, description: "Captures a technician with the required skill and one without, for the assignment demos." },
    { name: "04 Profile", item: users, description: "Self-service profile for any authenticated role." },
    { name: "05 Customer sites", item: sites, description: "A customer company has many physical sites. Includes a side-by-side comparison of customer-scoped and admin-scoped results on the same route." },
    { name: "06 Service requests", item: requests, description: "Full CRUD plus pagination, search, filtering and sorting. Creates three requests: one for the work-order flow, one for the double-booking demo, one for cancel/delete." },
    { name: "07 Assignment", item: assignment, description: "Skill matching, the assignment transaction, and the database-enforced double-booking conflict." },
    { name: "08 Work order lifecycle", item: lifecycle, description: "The guarded state machine end to end, including the illegal-transition, wrong-role and wrong-technician rejections." },
    { name: "09 Invoicing", item: invoicing, description: "Invoice generation from the hours actually worked, with the money components asserted to sum to the stored total." },
    { name: "10 Payment", item: payment, description: "Stripe Checkout and the signature-verified, idempotent webhook that is the only path to a PAID invoice." },
    { name: "11 Feedback", item: feedback, description: "REQUIRES THE BROWSER PAYMENT STEP IN FOLDER 10. Feedback is only accepted once the work order is PAID, so these requests fail with 400 until the Stripe checkout has been completed. Run the folder manually after paying." },
    { name: "12 Admin", item: admin, description: "Account administration: list, inspect, suspend, reactivate and change roles - including proof that a suspension kills an already-issued token." },
    { name: "13 Validation & auth errors", item: errors, description: "401 / 400 / 404 cases and the field-by-field validation error shape." },
    { name: "14 Session teardown", item: teardown, description: "Run last. These change the throwaway account's password and end its session." },
  ],
};

const env = {
  name: "FieldOps - Live",
  values: [
    { key: "baseUrl", value: LIVE, enabled: true },
    ...["adminToken", "customerToken", "technicianToken", "customerToken2", "technicianToken2"].map(
      (key) => ({ key, value: "", enabled: true }),
    ),
  ],
  _postman_variable_scope: "environment",
};

const envLocal = {
  name: "FieldOps - Local",
  values: [
    { key: "baseUrl", value: "http://localhost:5000", enabled: true },
    ...["adminToken", "customerToken", "technicianToken", "customerToken2", "technicianToken2"].map(
      (key) => ({ key, value: "", enabled: true }),
    ),
  ],
  _postman_variable_scope: "environment",
};

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(path.join("docs", "FieldOps.postman_collection.json"), JSON.stringify(collection, null, 2));
fs.writeFileSync(path.join("docs", "FieldOps.live.postman_environment.json"), JSON.stringify(env, null, 2));
fs.writeFileSync(path.join("docs", "FieldOps.local.postman_environment.json"), JSON.stringify(envLocal, null, 2));

const total = collection.item.reduce((n, f) => n + f.item.length, 0);
console.log(`folders: ${collection.item.length}  requests: ${total}`);
for (const f of collection.item) console.log(`  ${f.name.padEnd(32)} ${f.item.length}`);
