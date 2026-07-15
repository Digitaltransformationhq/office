-- ============================================
-- FIXED DATABASE SETUP FOR ADD STAFF FEATURE
-- ============================================
-- This version fixes the role constraint issue

-- ============================================
-- STEP 1: Drop Old Role Constraint
-- ============================================

-- Drop the old constraint that's causing issues
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- ============================================
-- STEP 2: Add New Role Constraint
-- ============================================

-- Add new constraint with kebab-case values that match the frontend
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('team-member', 'team-leader', 'partner', 'admin', 'Staff', 'Team Member', 'Partner', 'Admin'));

-- Show the new constraint
SELECT 'Role constraint updated to allow both formats' as info;

-- ============================================
-- STEP 3: Add Password Column
-- ============================================

-- Add password column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';

-- Set password for all existing users
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';

-- Verify password column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    RAISE NOTICE '✅ Password column exists';
  ELSE
    RAISE EXCEPTION '❌ Password column missing - migration failed';
  END IF;
END $$;

-- ============================================
-- STEP 4: Update Existing User Roles to New Format
-- ============================================

-- Convert old role values to new kebab-case format
UPDATE users SET role = 'team-member' WHERE role = 'Staff' OR role = 'Team Member';
UPDATE users SET role = 'team-leader' WHERE role = 'Team Leader';
UPDATE users SET role = 'partner' WHERE role = 'Partner';
UPDATE users SET role = 'admin' WHERE role = 'Admin';

SELECT 'User roles updated to kebab-case format' as info;

-- ============================================
-- STEP 5: Ensure All Required Columns Exist
-- ============================================

-- Add any missing columns that might be needed
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- ============================================
-- STEP 6: Add Triggers for Updated_At
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: Verify Table Structure
-- ============================================

-- Show all columns in users table
SELECT 'Users table structure:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- STEP 8: Test Data - Sample Users
-- ============================================

-- Show existing users with passwords
SELECT 'Existing users after migration:' as info;
SELECT
    id,
    name,
    email,
    role,
    password,
    status,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 9: Check Constraints
-- ============================================

-- Show table constraints
SELECT 'Table constraints:' as info;
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users';

-- ============================================
-- STEP 10: Verify Email Uniqueness
-- ============================================

-- Check for duplicate emails
SELECT 'Checking for duplicate emails:' as info;
SELECT
    email,
    COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- If no duplicates, you should see empty result

-- ============================================
-- STEP 11: Test User Creation
-- ============================================

-- Try to create a test user (will be deleted after)
DO $$
DECLARE
    test_user_id TEXT;
BEGIN
    -- Generate test ID
    test_user_id := 'user:test_' || FLOOR(RANDOM() * 1000000)::TEXT;

    -- Insert test user with NEW role format
    INSERT INTO users (
        id,
        name,
        email,
        role,
        status,
        password,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'Test User (will be deleted)',
        'test_delete_me_' || FLOOR(RANDOM() * 1000000)::TEXT || '@kapsca.in',
        'team-member',  -- NEW format that matches AddStaffModal
        'Active',
        'Pass@2026',
        NOW(),
        NOW()
    );

    RAISE NOTICE '✅ Test user created successfully with role: team-member';

    -- Delete test user
    DELETE FROM users WHERE id = test_user_id;
    RAISE NOTICE '✅ Test user deleted successfully';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Test user creation failed: %', SQLERRM;
END $$;

-- ============================================
-- STEP 12: Final Verification
-- ============================================

-- Count users by role
SELECT 'Users by role (after migration):' as info;
SELECT
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN password IS NOT NULL THEN 1 END) as with_password
FROM users
GROUP BY role
ORDER BY role;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Role constraint updated';
    RAISE NOTICE '✓ Existing roles converted to kebab-case';
    RAISE NOTICE '✓ Password column added';
    RAISE NOTICE '✓ All users have passwords';
    RAISE NOTICE '✓ Triggers configured';
    RAISE NOTICE '✓ Test successful';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now add staff from the Partner Dashboard!';
    RAISE NOTICE 'Valid roles: team-member, team-leader, partner, admin';
    RAISE NOTICE '';
END $$;
