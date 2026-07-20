-- Debug SQL to check login issues
-- Run this in Supabase SQL Editor to see what's in the database

-- 1. Check if password column exists in users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'password';

-- 2. Check sample users and their password values
SELECT id, name, email, role, password, last_login
FROM users
LIMIT 10;

-- 3. Check for specific user (change email as needed)
SELECT id, name, email, role, password, last_login
FROM users
WHERE email = 'apm@kapsca.in';

-- 4. If password column doesn't exist, add it with default value
-- ONLY RUN THIS IF THE FIRST QUERY SHOWS NO RESULTS:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
-- UPDATE users SET password = 'Pass@2026' WHERE password IS NULL;

-- 5. Check if the password column was added successfully
-- SELECT id, name, email, password FROM users LIMIT 5;
