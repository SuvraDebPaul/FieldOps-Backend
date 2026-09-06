-- Schedule conflict detection, enforced by the database itself.
--
-- An application-level "is the slot free?" check has an unavoidable race: two
-- admins can both read "free" and both insert. Here the check and the write are
-- the same atomic operation, so no race can slip past.
--
-- btree_gist teaches GiST indexes scalar equality (=) on "technicianId";
-- GiST already understands range overlap (&&) natively.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "work_orders"
ADD CONSTRAINT "no_technician_double_booking"
EXCLUDE USING gist (
  "technicianId" WITH =,
  tstzrange("scheduledStart", "scheduledEnd", '[)') WITH &&
)
WHERE (
  -- Only live jobs block a slot. A completed or cancelled job must not reserve
  -- that technician's calendar forever.
  "status" IN ('ASSIGNED','SCHEDULED','EN_ROUTE','IN_PROGRESS')
  AND "deletedAt" IS NULL
);
