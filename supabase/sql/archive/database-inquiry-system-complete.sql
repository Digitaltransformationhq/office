-- ============================================
-- CLIENT INQUIRY MANAGEMENT SYSTEM
-- Complete Database Schema
-- ============================================

-- Create client_inquiries table (if not exists)
CREATE TABLE IF NOT EXISTS client_inquiries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  mobile_number TEXT NOT NULL,
  email TEXT,
  work_type TEXT NOT NULL,
  notes TEXT,
  expected_timeline TEXT,
  source_of_inquiry TEXT,
  status TEXT NOT NULL DEFAULT 'Pending Review',
  submitted_by TEXT NOT NULL,
  submitted_by_id BIGINT,
  reviewed_by TEXT,
  reviewed_by_id BIGINT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing client_inquiries table (safe to run multiple times)
DO $$ 
BEGIN
  -- Add contact_person if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_inquiries' AND column_name = 'contact_person'
  ) THEN
    ALTER TABLE client_inquiries ADD COLUMN contact_person TEXT;
  END IF;

  -- Add expected_timeline if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_inquiries' AND column_name = 'expected_timeline'
  ) THEN
    ALTER TABLE client_inquiries ADD COLUMN expected_timeline TEXT;
  END IF;

  -- Add source_of_inquiry if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_inquiries' AND column_name = 'source_of_inquiry'
  ) THEN
    ALTER TABLE client_inquiries ADD COLUMN source_of_inquiry TEXT;
  END IF;
END $$;

-- Create inquiry_communications table for threaded chat
CREATE TABLE IF NOT EXISTS inquiry_communications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inquiry_id BIGINT NOT NULL REFERENCES client_inquiries(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL, -- 'user' or 'partner'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_inquiries_status ON client_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_submitted_by_id ON client_inquiries(submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_client_inquiries_created_at ON client_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiry_communications_inquiry_id ON inquiry_communications(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_communications_created_at ON inquiry_communications(created_at);

-- Enable Row Level Security (RLS) - Optional but recommended for production
ALTER TABLE client_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_communications ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust based on your authentication setup)
-- These policies allow all authenticated users to view and create inquiries
-- Adjust as needed for your security requirements
CREATE POLICY IF NOT EXISTS "Allow all authenticated users to view inquiries" 
  ON client_inquiries FOR SELECT 
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow all authenticated users to create inquiries" 
  ON client_inquiries FOR INSERT 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow partners to update inquiries" 
  ON client_inquiries FOR UPDATE 
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow all authenticated users to view communications" 
  ON inquiry_communications FOR SELECT 
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow all authenticated users to create communications" 
  ON inquiry_communications FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- You can uncomment the following to insert sample data

-- INSERT INTO client_inquiries (
--   client_name,
--   company_name,
--   contact_person,
--   mobile_number,
--   email,
--   work_type,
--   notes,
--   expected_timeline,
--   source_of_inquiry,
--   status,
--   submitted_by,
--   submitted_by_id
-- ) VALUES (
--   'Test Client',
--   'Test Company Pvt Ltd',
--   'John Doe',
--   '9876543210',
--   'test@example.com',
--   'GST Filing',
--   'This is a test inquiry for GST filing services',
--   '1 month',
--   'Website',
--   'Pending Review',
--   'Test User',
--   1
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created successfully
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('client_inquiries', 'inquiry_communications')
ORDER BY table_name;

-- Check column structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('client_inquiries', 'inquiry_communications')
ORDER BY table_name, ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Client Inquiry Management System database schema setup complete!';
  RAISE NOTICE '📊 Tables created: client_inquiries, inquiry_communications';
  RAISE NOTICE '🔍 Indexes created for optimized queries';
  RAISE NOTICE '🔐 Row Level Security policies configured';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Verify the tables and columns above';
  RAISE NOTICE '2. Test the inquiry creation and communication features';
  RAISE NOTICE '3. Adjust RLS policies based on your security requirements';
END $$;
