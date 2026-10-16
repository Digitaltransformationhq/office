-- Configurable approval routing for changes to the client master.
-- Run once in the Supabase SQL editor before deploying the matching function.

CREATE TABLE IF NOT EXISTS approval_routing_rules (
  action_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  approver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  approver_name TEXT,
  updated_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (action_key IN ('client.create', 'client.update'))
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  action_key TEXT NOT NULL REFERENCES approval_routing_rules(action_key),
  entity_type TEXT NOT NULL DEFAULT 'client',
  entity_id TEXT,
  entity_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  previous_payload JSONB,
  approval_context JSONB,
  base_updated_at TIMESTAMP WITH TIME ZONE,
  requested_by_id TEXT NOT NULL REFERENCES users(id),
  requested_by_name TEXT NOT NULL,
  approver_id TEXT NOT NULL REFERENCES users(id),
  approver_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reviewed_by_id TEXT REFERENCES users(id),
  reviewed_by_name TEXT,
  review_note TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_assignee
  ON approval_requests(approver_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON approval_requests(requested_by_id, requested_at DESC);

-- The requested initial owner. If Brijesh has not been added yet, approvals stay
-- required and the admin must select an approver before client writes can proceed.
INSERT INTO approval_routing_rules (action_key, label, enabled, approver_id, approver_name)
SELECT action_key, label, TRUE, brijesh.id, brijesh.name
FROM (VALUES
  ('client.create', 'Add a client'),
  ('client.update', 'Update client details')
) AS actions(action_key, label)
LEFT JOIN LATERAL (
  SELECT id, name FROM users
  WHERE lower(name) LIKE '%brijesh%pitroda%' AND lower(role) = 'partner' AND status = 'Active'
  ORDER BY created_at ASC LIMIT 1
) brijesh ON TRUE
ON CONFLICT (action_key) DO NOTHING;

