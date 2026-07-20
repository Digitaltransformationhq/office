-- ============================================
-- COMPLETE FEATURE DATABASE SETUP
-- ============================================
-- Run this in Supabase SQL Editor after database-schema.sql

-- ============================================
-- LEAVE MANAGEMENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS leave_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  -- Codes, not display names: the UI stores 'CL' / 'SL' / 'EL' and expands them
  -- for display (getLeaveTypeLabel). The long names were never what got sent.
  leave_type TEXT NOT NULL CHECK (leave_type IN ('CL', 'SL', 'EL')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  total_days DECIMAL(3,1) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  approved_by_id TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_balance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  casual_leave_balance DECIMAL(3,1) DEFAULT 10,
  sick_leave_balance DECIMAL(3,1) DEFAULT 7,
  earned_leave_balance DECIMAL(3,1) DEFAULT 15,
  year INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leave_applications_user ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_balance_user ON leave_balance(user_id);

-- ============================================
-- TIME LOG TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  task_id TEXT,
  task_name TEXT NOT NULL,
  client_name TEXT,
  category TEXT,
  hours DECIMAL(4,2) NOT NULL,
  description TEXT,
  log_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_logs_user ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs(task_id);

-- ============================================
-- ATTENDANCE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave')),
  check_in_time TIME,
  check_out_time TIME,
  total_hours DECIMAL(4,2),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- ============================================
-- DOCUMENT MANAGEMENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by_id TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  financial_year TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(financial_year);

-- ============================================
-- QUERY/TICKET SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  client_name TEXT,
  query_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  assigned_to_id TEXT,
  assigned_to_name TEXT,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS query_responses (
  id TEXT PRIMARY KEY,
  query_id TEXT NOT NULL,
  response_text TEXT NOT NULL,
  responded_by_id TEXT NOT NULL,
  responded_by_name TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE,
  FOREIGN KEY (responded_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_queries_client ON queries(client_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_assigned ON queries(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_query_responses_query ON query_responses(query_id);

-- ============================================
-- APPROVAL TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  approval_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  submitted_by_id TEXT NOT NULL,
  submitted_by_name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  approved_by_id TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(approval_type);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_submitted ON approvals(submitted_by_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Trigger for leave_applications
CREATE OR REPLACE FUNCTION update_leave_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leave_applications_updated_at ON leave_applications;
CREATE TRIGGER update_leave_applications_updated_at
    BEFORE UPDATE ON leave_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_application_updated_at();

-- Trigger for time_logs
DROP TRIGGER IF EXISTS update_time_logs_updated_at ON time_logs;
CREATE TRIGGER update_time_logs_updated_at
    BEFORE UPDATE ON time_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for attendance
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for queries
DROP TRIGGER IF EXISTS update_queries_updated_at ON queries;
CREATE TRIGGER update_queries_updated_at
    BEFORE UPDATE ON queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIALIZE LEAVE BALANCES FOR EXISTING USERS
-- ============================================

INSERT INTO leave_balance (id, user_id, user_name, year)
SELECT 
    'lb:' || id,
    id,
    name,
    EXTRACT(YEAR FROM CURRENT_DATE)
FROM users
WHERE role IN ('team-member', 'team-leader', 'admin', 'partner')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'ALL FEATURE TABLES CREATED';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '- Leave Management Tables';
    RAISE NOTICE '- Time Log Tables';
    RAISE NOTICE '- Attendance Tables';
    RAISE NOTICE '- Document Management Tables';
    RAISE NOTICE '- Query/Ticket System Tables';
    RAISE NOTICE '- Approval Tracking Tables';
    RAISE NOTICE '- All Indexes Created';
    RAISE NOTICE '- All Triggers Configured';
    RAISE NOTICE '- Leave Balances Initialized';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for feature implementation!';
    RAISE NOTICE '';
END $$;
