-- ============================================
-- CLIENT DATABASE UPLOAD TEMPLATE
-- ============================================
-- Instructions:
-- 1. Replace the sample data below with your actual clients
-- 2. Copy this entire file
-- 3. Go to Supabase Dashboard → SQL Editor → New Query
-- 4. Paste and click RUN
-- 5. Your clients will be uploaded!

-- Optional: Clear existing sample clients first
-- Uncomment the line below if you want to remove old sample data
-- DELETE FROM clients WHERE id LIKE 'client:%';

-- Insert your clients
-- Format for each row:
-- ('client:ID', 'Company Name', 'Industry', 'GST Number or NULL', 'Phone', 'Email or NULL', 'Active or Inactive', NOW(), NOW()),

INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at, updated_at) VALUES

  -- Sample clients - Replace these with your actual data
  ('client:1', 'ABC Enterprises Pvt Ltd', 'Manufacturing', '24XXXXX1234X1Z5', '9876543210', 'abc@example.com', 'Active', NOW(), NOW()),
  ('client:2', 'XYZ Corporation Ltd', 'IT Services', '24XXXXX5678X1Z9', '9876543211', 'xyz@example.com', 'Active', NOW(), NOW()),
  ('client:3', 'PQR Industries', 'Retail', '24XXXXX9012X1Z3', '9876543212', 'pqr@example.com', 'Active', NOW(), NOW()),
  ('client:4', 'Sample Client 4', 'Construction', '27XXXXX1111X1Z1', '9876543213', 'sample4@example.com', 'Active', NOW(), NOW()),
  ('client:5', 'Sample Client 5', 'Trading', '29XXXXX2222X1Z2', '9876543214', 'sample5@example.com', 'Active', NOW(), NOW())

  -- Add more clients here following the same format
  -- Important: Add comma after each row EXCEPT the last one!
  -- ('client:6', 'Your Client Name', 'Industry', 'GST or NULL', 'Phone', 'Email or NULL', 'Active', NOW(), NOW()),
  -- ('client:7', 'Another Client', 'Industry', 'GST or NULL', 'Phone', 'Email or NULL', 'Active', NOW(), NOW())

-- This handles duplicate IDs by updating existing records
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  gst = EXCLUDED.gst,
  contact = EXCLUDED.contact,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================
-- These queries will show you the results after upload

-- Count total clients
SELECT COUNT(*) as total_clients FROM clients;

-- Show all clients
SELECT
  id,
  name,
  industry,
  gst,
  contact,
  email,
  status,
  created_at
FROM clients
ORDER BY name;

-- Show only active clients
SELECT name, industry, contact FROM clients WHERE status = 'Active' ORDER BY name;
