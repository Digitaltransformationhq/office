-- ============================================
-- FIX LOGIN ISSUES - CREATE TEST USERS
-- ============================================
-- Run this in Supabase SQL Editor if you're getting login errors

-- First, check if users exist
SELECT id, name, email, role, password
FROM users
ORDER BY role, name;

-- If no users exist, create default test users:

-- Partner Account (can approve tasks and inquiries)
INSERT INTO users (id, name, email, role, status, password)
VALUES (
  'user:partner_' || EXTRACT(EPOCH FROM NOW())::text,
  'Partner Admin',
  'partner@kaps.co',
  'partner',
  'Active',
  'Pass@2026'
) ON CONFLICT (email) DO UPDATE
SET password = 'Pass@2026', status = 'Active';

-- Admin Account (can approve tasks and inquiries)
INSERT INTO users (id, name, email, role, status, password)
VALUES (
  'user:admin_' || EXTRACT(EPOCH FROM NOW())::text,
  'System Admin',
  'admin@kaps.co',
  'admin',
  'Active',
  'Pass@2026'
) ON CONFLICT (email) DO UPDATE
SET password = 'Pass@2026', status = 'Active';

-- Staff/Team Member Account (can create tasks and inquiries)
INSERT INTO users (id, name, email, role, status, password)
VALUES (
  'user:staff_' || EXTRACT(EPOCH FROM NOW())::text,
  'Priya Sharma',
  'staff@kaps.co',
  'team-member',
  'Active',
  'Pass@2026'
) ON CONFLICT (email) DO UPDATE
SET password = 'Pass@2026', status = 'Active';

-- Verify users were created
SELECT id, name, email, role, password, status
FROM users
WHERE email IN ('partner@kaps.co', 'admin@kaps.co', 'staff@kaps.co')
ORDER BY role;

-- ============================================
-- TEST CREDENTIALS
-- ============================================
-- After running this SQL:
--
-- PARTNER LOGIN:
--   Email: partner@kaps.co
--   Password: Pass@2026
--
-- ADMIN LOGIN:
--   Email: admin@kaps.co
--   Password: Pass@2026
--
-- STAFF LOGIN:
--   Email: staff@kaps.co
--   Password: Pass@2026
-- ============================================
