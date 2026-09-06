-- Sequences backing the human-readable business codes:
--   SR-2026-000123 / WO-2026-000123 / INV-2026-000123
--
-- A sequence rather than count()+1 because nextval() is atomic: two concurrent
-- requests can never be handed the same number.
CREATE SEQUENCE IF NOT EXISTS service_request_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS work_order_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_no_seq START 1;
