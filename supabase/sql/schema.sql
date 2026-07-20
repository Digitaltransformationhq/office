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
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  gst TEXT,
  contact TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  task TEXT NOT NULL,
  category TEXT CHECK (category IN ('Income Tax', 'GST', 'Audit', 'Certification', 'Project Finance', 'Accounts', 'Advisory', 'Office Work', 'Consultancy', 'Litigation', 'MCA Work')),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE CASCADE
);

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
-- INSERT SAMPLE CLIENTS
-- ============================================
INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at) VALUES
  ('client:1', 'ABC Enterprises', 'Manufacturing', '24XXXXX1234X1Z5', '9876543210', 'abc@example.com', 'Active', NOW()),
  ('client:2', 'XYZ Corporation', 'IT Services', '24XXXXX5678X1Z9', '9876543211', 'xyz@example.com', 'Active', NOW()),
  ('client:3', 'PQR Industries', 'Retail', '24XXXXX9012X1Z3', '9876543212', 'pqr@example.com', 'Active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT SAMPLE TASKS
-- ============================================
INSERT INTO tasks (id, client, task, category, assigned_to, assigned_to_id, priority, status, start_date, target_date, hours_logged, budgeted_fee, estimated_hours, comments, created_at) VALUES
  ('task:1', 'ABC Enterprises', 'GST Return Filing', 'GST', 'Harshangi Prajapati', 'user:3', 'High', 'In Progress', '2026-04-20', '2026-04-28', 4, 5000, 8, '', NOW()),
  ('task:2', 'XYZ Corporation', 'Income Tax Return', 'Income Tax', 'Krunal Roy', 'user:2', 'Urgent', 'Pending', '2026-04-15', '2026-04-26', 0, 8000, 12, '', NOW()),
  ('task:3', 'PQR Industries', 'Audit Report', 'Audit', 'Anjali Vasava', 'user:7', 'Medium', 'Pending', '2026-04-22', '2026-05-05', 0, 15000, 20, '', NOW()),
  ('task:4', 'ABC Enterprises', 'TDS Return', 'Income Tax', 'Ankit Patel', 'user:9', 'High', 'In Progress', '2026-04-18', '2026-04-27', 2, 3000, 5, '', NOW()),
  ('task:5', 'XYZ Corporation', 'Financial Statement Preparation', 'Accounts', 'Rashmin Parmar', 'user:5', 'Medium', 'Pending', '2026-04-25', '2026-05-10', 0, 12000, 16, '', NOW())
ON CONFLICT (id) DO NOTHING;

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