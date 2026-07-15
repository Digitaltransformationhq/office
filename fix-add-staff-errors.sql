-- Fix for Add Staff Feature Errors
-- Run this in Supabase SQL Editor if you get errors when adding staff

-- Step 1: Check if password column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'password';

-- If NO RESULTS above, the password column is missing. Run Step 2.
-- If you see a result, skip to Step 3.

-- Step 2: Add password column (ONLY if Step 1 showed no results)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';

-- Step 3: Verify all required columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected columns:
-- id (text)
-- name (text)
-- email (text)
-- role (text)
-- status (text)
-- last_login (timestamp with time zone)
-- created_at (timestamp with time zone)
-- updated_at (timestamp with time zone)
-- password (text)
-- last_login_latitude (numeric)
-- last_login_longitude (numeric)
-- last_login_location (text)
-- last_login_ip (text)

-- Step 4: Check for duplicate emails (if you get duplicate error)
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 5: Test user creation manually
-- Replace values below with your test data
/*
INSERT INTO users (
  id,
  name,
  email,
  role,
  status,
  password
) VALUES (
  'user:test_' || FLOOR(RANDOM() * 1000000)::TEXT,
  'Test User',
  'testuser_' || FLOOR(RANDOM() * 1000)::TEXT || '@kapsca.in',
  'team-member',
  'Active',
  'Pass@2026'
);
*/

-- Step 6: Verify the test user was created
-- SELECT id, name, email, role, password FROM users ORDER BY created_at DESC LIMIT 5;

-- Step 7: Delete test user if needed
-- DELETE FROM users WHERE email LIKE 'testuser_%@kapsca.in';
