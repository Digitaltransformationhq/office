-- ============================================
-- Password Management Features
-- ============================================
-- This SQL file adds password management capabilities:
-- 1. Password column to users table
-- 2. Password reset OTP table for forgot password functionality

-- Step 1: Add password column to users table
-- In production, passwords should be hashed (bcrypt, argon2, etc.)
-- For now, we're storing plain text for development
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';

-- Update all existing users to have the default password
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL;

-- Step 2: Create password_reset_otps table
-- This table stores OTPs for password reset functionality
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_mobile TEXT,
  otp TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('email', 'mobile')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(user_email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_mobile ON password_reset_otps(user_mobile);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_created ON password_reset_otps(created_at);

-- Step 3: Create function to clean up expired OTPs
-- This can be run periodically to remove old/expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_otps
  WHERE expires_at < NOW()
    OR (verified = TRUE AND used = TRUE AND created_at < NOW() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NOTES
-- ============================================
--
-- OTP Expiry: OTPs expire after 10 minutes
-- OTP Format: 6-digit numeric code
-- Security: In production, implement:
--   1. Rate limiting for OTP generation
--   2. Password hashing (bcrypt/argon2)
--   3. Email/SMS service integration
--   4. Account lockout after failed attempts
--
-- Email Service: You'll need to configure:
--   - SendGrid, AWS SES, or similar for email OTPs
--   - Twilio, AWS SNS, or similar for mobile OTPs
--
-- Current Implementation:
--   - OTPs are generated but not actually sent
--   - For testing, check the password_reset_otps table to see generated OTPs
--   - In production, integrate with email/SMS services
--
-- Testing:
--   1. Request OTP via forgot password
--   2. Check password_reset_otps table for the OTP
--   3. Use the OTP to verify and reset password
--
-- Cleanup:
--   Run cleanup function periodically:
--   SELECT cleanup_expired_otps();
--
-- ============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Password management features added successfully!';
  RAISE NOTICE '1. Password column added to users table';
  RAISE NOTICE '2. password_reset_otps table created';
  RAISE NOTICE '3. Cleanup function created';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Configure email/SMS service for production use';
  RAISE NOTICE 'For testing, check password_reset_otps table to see generated OTPs';
END $$;
