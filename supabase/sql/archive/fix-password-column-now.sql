-- ========================================
-- FIX ADD STAFF ERROR - RUN THIS NOW
-- ========================================
-- This will fix the "Failed to create user" error

-- Step 1: Check current columns
SELECT 'Current columns in users table:' as message;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Add password column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';

-- Step 3: Update any NULL passwords
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';

-- Step 4: Verify password column now exists
SELECT 'Verification - password column:' as message;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'password';

-- Step 5: Show sample user data
SELECT 'Sample users with passwords:' as message;
SELECT id, name, email, role, password
FROM users
LIMIT 5;

-- Success message
SELECT '✅ Fix complete! Password column added. Try adding staff again.' as result;
