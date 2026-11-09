-- Keep deleted menders for audit while excluding them from normal reads.
ALTER TABLE vendors ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX vendors_visible_status_id_idx ON vendors (status, id) WHERE is_deleted = false;
