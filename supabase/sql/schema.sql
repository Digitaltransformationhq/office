-- ============================================
-- KAPS & Co. Office Management System
-- Database Schema for Supabase
-- ============================================

-- Run these commands in Supabase SQL Editor
-- Navigate to: Supabase Dashboard > SQL Editor > New Query

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  -- Canonical kebab-case roles. Legacy TitleCase values ('Admin', 'Staff',
  -- 'Team Member', 'Partner') are migrated by database-add-staff-FIXED.sql;
  -- new environments should only ever carry the values below.
  role TEXT NOT NULL CHECK (role IN ('admin', 'partner', 'team-leader', 'team-member')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CLIENTS TABLE
-- ============================================
-- One row per PAN. PAN is the firm's unique client code and is enforced as such
-- by a partial unique index below; the GST registrations held under it live in
-- client_gst_registrations. See add-gst-compliance-register.sql.
--
-- industry and contact are nullable: the Add Client form has only ever required
-- a name, and declaring them NOT NULL meant a client without an industry failed
-- to save.
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pan TEXT,
  firm_name TEXT,
  -- The office's own file/group code. Not unique — a family or group of related
  -- clients shares one ("SAHAJ", "KANJIBHAI").
  file_number TEXT,
  industry TEXT,
  -- Legacy single GSTIN, kept as a mirror of the first active registration
  -- because tasks, billing and client search all read it. The registrations
  -- table is the source of truth.
  gst TEXT,
  contact TEXT,
  mobile_number TEXT,
  email TEXT,
  email_id TEXT,
  -- Whether an ITR is due for this PAN at all: one return per financial year, so
  -- a flag suffices here where GST needs a table.
  itr_applicable BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  -- Annual fee per service. Previously declared only in an archived one-off, so
  -- a database built from this file had none of them and the fee schedule on the
  -- Add/Edit Client form had nowhere to land.
  itr_fees DECIMAL(10, 2) DEFAULT 0,
  gst_fees DECIMAL(10, 2) DEFAULT 0,
  gst_annual_return_fees DECIMAL(10, 2) DEFAULT 0,
  accounting_fees DECIMAL(10, 2) DEFAULT 0,
  audit_fees DECIMAL(10, 2) DEFAULT 0,
  company_act_fees DECIMAL(10, 2) DEFAULT 0,
  tds_fees DECIMAL(10, 2) DEFAULT 0,
  pf_esic_pt_labour_fees DECIMAL(10, 2) DEFAULT 0,
  consultancy_fees DECIMAL(10, 2) DEFAULT 0,
  total_fees DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partial, so the clients with no PAN recorded yet do not collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_pan_unique ON clients (pan) WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_file_number ON clients(file_number);

-- ============================================
-- GST REGISTRATIONS
-- ============================================
-- One row per GSTIN, under the client holding that PAN. A client may hold
-- several — different states, branches or verticals — each filed separately and
-- each on its own frequency. See add-gst-compliance-register.sql.
CREATE TABLE IF NOT EXISTS client_gst_registrations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  -- The office's own code for this registration ("167", "DNG-BHV", "TSSPL").
  -- Free text on purpose: the existing codes are not all numeric.
  code_no TEXT,
  gstin TEXT NOT NULL UNIQUE,
  trade_name TEXT,
  state TEXT,
  -- 'Composition' dealers file GSTR-4 annually instead of GSTR-1/3B, so this
  -- changes which returns exist, not only how often they fall due.
  filing_frequency TEXT NOT NULL DEFAULT 'Monthly'
    CHECK (filing_frequency IN ('Monthly', 'Quarterly', 'Composition', 'Annual', 'Irregular', 'Not Applicable')),
  -- Denormalised alongside the id: the register must stay readable after a staff
  -- member leaves, and the id is set to NULL when they do.
  responsible_person_id TEXT,
  responsible_person_name TEXT,
  billing_frequency TEXT
    CHECK (billing_frequency IS NULL OR billing_frequency IN ('Monthly', 'Quarter', 'Half Year', 'Annual', 'NA')),
  -- GST portal credentials. Excluded from the list endpoint and served only on
  -- an explicit single-registration fetch. See docs/gst-compliance.md.
  portal_user_id TEXT,
  portal_password TEXT,
  contact_person TEXT,
  mobile_number TEXT,
  email_id TEXT,
  -- Balances as last checked on the portal: a snapshot, not a running account.
  cash_ledger DECIMAL(14, 2) DEFAULT 0,
  credit_ledger DECIMAL(14, 2) DEFAULT 0,
  reclaimed_amount DECIMAL(14, 2) DEFAULT 0,
  ledger_checked_on DATE,
  registration_date DATE,
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Suspended', 'Cancelled')),
  cancellation_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (responsible_person_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gst_registrations_client ON client_gst_registrations(client_id);
CREATE INDEX IF NOT EXISTS idx_gst_registrations_status ON client_gst_registrations(status);
CREATE INDEX IF NOT EXISTS idx_gst_registrations_person ON client_gst_registrations(responsible_person_id);

-- ============================================
-- GST FILINGS
-- ============================================
-- One row per (registration, return, period) — a cell of the old spreadsheet,
-- unpacked so it can hold more than one value.
--
--   Pending ──> Message Sent ──> Data Received ──> Challan Sent ──> Filed
--      │             │                 │
--      │             └──> Data Not Provided        └──> OTP Awaited
--      └──> Not Applicable                         └──> Nil
CREATE TABLE IF NOT EXISTS gst_filings (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  return_type TEXT NOT NULL
    CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-4', 'GSTR-9', 'GSTR-9C', 'CMP-08', 'Other')),
  financial_year TEXT NOT NULL,
  -- Sortable and stable, so a period can be addressed without parsing a label:
  -- '2026-04' monthly, '2026-27-Q1' quarterly, '2026-27' annual.
  period_key TEXT NOT NULL,
  -- What a person reads: "APRIL'26", "Q1 2026-27", "FY 2026-27".
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Message Sent', 'Data Not Provided', 'Data Received',
                      'OTP Awaited', 'Challan Sent', 'Nil', 'Filed', 'Not Applicable')),
  -- The half of the cell the spreadsheet could not record: a date says when it
  -- was filed but not when the data arrived, so nothing showed how long a return
  -- sat waiting.
  data_received_on DATE,
  filed_on DATE,
  arn TEXT,
  updated_by_id TEXT,
  updated_by_name TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (registration_id) REFERENCES client_gst_registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL,
  -- Makes period generation and the Excel import idempotent: re-running either
  -- updates the existing cell instead of creating a duplicate beside it.
  UNIQUE (registration_id, return_type, period_key),
  -- 'Filed' without a date is the one state that would quietly corrupt the
  -- register: it reads as done while leaving nothing to prove when.
  CONSTRAINT gst_filings_filed_on_required
    CHECK ((status = 'Filed' AND filed_on IS NOT NULL) OR (status <> 'Filed' AND filed_on IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_gst_filings_year ON gst_filings(financial_year, period_key);
CREATE INDEX IF NOT EXISTS idx_gst_filings_registration ON gst_filings(registration_id, financial_year);
-- "What is still outstanding" — the question the spreadsheet was scanned for.
CREATE INDEX IF NOT EXISTS idx_gst_filings_open ON gst_filings(status, due_date)
  WHERE status NOT IN ('Filed', 'Not Applicable');

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  task TEXT NOT NULL,
  category TEXT CHECK (category IN ('Income Tax', 'GST', 'Audit', 'Certification', 'Project Finance', 'Accounts', 'Advisory', 'Office Work', 'Consultancy', 'Litigation', 'MCA Work', 'IT Related Work')),
  assigned_to TEXT NOT NULL,
  assigned_to_id TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  -- 'Pending Approval' gates a NEW task before work starts; 'Pending Approval -
  -- Completion' gates a FINISHED task before billing. See
  -- add-completion-approval-status.sql. 'Billed' is legacy — the billing step
  -- now lands on 'Completed'.
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Pending Approval', 'Pending Approval - Completion', 'Pending for Billing', 'Billed')),
  start_date DATE,
  target_date DATE,
  completion_date DATE,
  hours_logged INTEGER DEFAULT 0,
  budgeted_fee DECIMAL(10, 2) DEFAULT 0,
  estimated_hours INTEGER DEFAULT 0,
  comments TEXT,
  -- Reassignment. A handover sits at 'Pending Acceptance' until the new
  -- assignee accepts or rejects it; see add-reassignment-columns.sql. Declared
  -- only in an archived one-off before, so this database never had them and
  -- every reassignment failed on the UPDATE.
  assignment_status TEXT DEFAULT 'Accepted' CHECK (assignment_status IN ('Pending Acceptance', 'Accepted', 'Rejected')),
  reassigned_from_id TEXT,
  reassigned_from_name TEXT,
  originally_assigned_by_id TEXT,
  originally_assigned_by_name TEXT,
  rejection_reason TEXT,
  reassigned_at TIMESTAMP WITH TIME ZONE,
  -- Who the approval is routed to. NULL means any partner may take it, and
  -- whoever approves claims it. See add-task-approver-routing.sql.
  approver_id TEXT,
  approver_name TEXT,
  -- Who actually signed off, which can differ from who it was routed to.
  approved_by_id TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  -- The latest open change request, mirrored from task_comments so a dashboard
  -- can flag "someone is waiting on you to fix this" without a request per row.
  -- NULL means nothing is outstanding; cleared when the work is resubmitted.
  -- See add-task-comments.sql.
  changes_requested_at TIMESTAMP WITH TIME ZONE,
  changes_requested_by TEXT,
  changes_requested_note TEXT,
  -- How many times this task has come back for changes.
  revision_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE CASCADE,
  -- SET NULL, not CASCADE: losing a partner must not delete the firm's tasks.
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- TASK COMMENTS
-- ============================================
-- The conversation around an approval: the note a member sends with finished
-- work, what the approver wants changed, and the sign-off that releases it to
-- Accounts. One row per message, so the thread survives any number of
-- send-and-resubmit rounds. See add-task-comments.sql for the full rationale.
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  -- Nullable, and paired with a denormalised name: a staff member leaving the
  -- firm must not erase the record of why work was sent back.
  author_id TEXT,
  author_name TEXT NOT NULL,
  author_role TEXT,
  kind TEXT NOT NULL DEFAULT 'note'
    CHECK (kind IN ('submission', 'change_request', 'approval', 'note')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);

-- ============================================
-- NOTIFICATIONS
-- ============================================
-- Per-user, unlike announcements (which are broadcast and live in the KV store).
-- Written by notifyUser() in the edge function at every lifecycle step, and read
-- by the notification bell.
--
-- Previously declared only in archive/database-task-assignments.sql, so a fresh
-- environment built from this file had no notifications table at all and every
-- notification silently failed to insert.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Legacy, from the separate task_assignments flow. Never written by the edge
  -- function, and deliberately not a foreign key here: that table is optional.
  assignment_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================
-- WEB PUSH SUBSCRIPTIONS
-- ============================================
-- One row per browser that opted in, so notifications can be delivered with the
-- tab closed. Push degrades silently to in-app only when VAPID keys are unset.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  subscription TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ============================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_target_date ON tasks(target_date);
CREATE INDEX IF NOT EXISTS idx_tasks_changes_requested ON tasks(assigned_to_id, changes_requested_at);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- APPLY TRIGGERS TO TABLES
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gst_registrations_updated_at ON client_gst_registrations;
CREATE TRIGGER update_gst_registrations_updated_at
  BEFORE UPDATE ON client_gst_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gst_filings_updated_at ON gst_filings;
CREATE TRIGGER update_gst_filings_updated_at
  BEFORE UPDATE ON gst_filings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT KAPS & CO. USERS
-- ============================================
INSERT INTO users (id, name, email, role, status, last_login, created_at) VALUES
  -- Admin
  ('user:12', 'KAPS Admin', 'office@kapsca.in', 'admin', 'Active', NOW(), NOW()),

  -- Partners
  ('user:10', 'Abhishek Patel', 'apm@kapsca.in', 'partner', 'Active', NOW(), NOW()),
  ('user:11', 'Brijesh Pitroda', 'brijesh@kapsca.in', 'partner', 'Active', NOW(), NOW()),

  -- Staff Members
  ('user:1', 'Rajesh Panchal', 'caoffice.sahaj@gmail.com', 'team-member', 'Active', NOW(), NOW()),
  ('user:2', 'Krunal Roy', 'caoffice@kapsca.in', 'team-member', 'Active', NOW(), NOW()),
  ('user:3', 'Harshangi Prajapati', 'gst1@kapsca.in', 'team-member', 'Active', NOW(), NOW()),
  ('user:4', 'Shruti Pitroda', 'pitrodashruti44@gmail.com', 'team-member', 'Active', NOW(), NOW()),
  ('user:5', 'Rashmin Parmar', 'assurance@kapsca.in', 'team-member', 'Active', NOW(), NOW()),
  ('user:6', 'Vishwanath Patel', 'vrppatel284@gmail.com', 'team-member', 'Active', NOW(), NOW()),
  ('user:7', 'Anjali Vasava', 'audit1@kapsca.in', 'team-member', 'Active', NOW(), NOW()),
  ('user:8', 'Kishan Solanki', 'kishansolanki3732@gmail.com', 'team-member', 'Active', NOW(), NOW()),
  ('user:9', 'Ankit Patel', 'advisory@kapsca.in', 'team-member', 'Active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE CLIENTS AND TASKS — REMOVED
-- ============================================
-- This file used to seed three demo clients (ABC Enterprises, XYZ Corporation,
-- PQR Industries, with placeholder GSTINs of the form 24XXXXX...) and five demo
-- tasks against them.
--
-- They are gone because this is not a demo database. The clients carried a
-- GSTIN, so once add-gst-compliance-register.sql began backfilling
-- clients.gst into the GST register they turned into three fake registrations
-- sitting in the middle of the real compliance grid — and re-running this file
-- would have quietly put them back.
--
-- The users above are real staff and are still seeded: a database with no users
-- has nobody who can log in to create any.

-- ============================================
-- ENABLE ROW LEVEL SECURITY (OPTIONAL)
-- ============================================
-- Uncomment these if you want to enable RLS
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify your data was inserted correctly
-- SELECT * FROM users ORDER BY role, name;
-- SELECT * FROM clients ORDER BY name;
-- SELECT * FROM tasks ORDER BY created_at DESC;