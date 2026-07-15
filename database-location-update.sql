-- ============================================
-- LOCATION TRACKING UPDATE
-- Run these commands in Supabase SQL Editor
-- ============================================

-- Add location columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_longitude DECIMAL(11, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;

-- ============================================
-- LOGIN HISTORY TABLE
-- Track all login attempts with location
-- ============================================
CREATE TABLE IF NOT EXISTS login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON login_history(login_time DESC);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if columns were added successfully
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'last_login%';
-- SELECT * FROM login_history LIMIT 5;
