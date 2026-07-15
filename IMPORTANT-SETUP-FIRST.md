# ⚠️ IMPORTANT - Setup Required Before Using Password Features

## Error: "Unexpected non-whitespace character after JSON"

This error occurs because you haven't run the database migration yet.

## 🚨 REQUIRED SETUP STEPS

### Step 1: Run Database Migration (REQUIRED!)

**You MUST run this before using Change Password or Forgot Password features.**

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy ALL contents from `database-password-features.sql`
5. Paste into SQL Editor
6. Click **RUN**

### Step 2: Verify Migration

After running the SQL, verify in **Table Editor**:

**Users table** should now have:
- `password` column

**New table** should exist:
- `password_reset_otps` table

### Step 3: Test Features

Now you can test:
- ✅ Change Password (Settings page)
- ✅ Forgot Password (Login page)

---

## What the Migration Does

```sql
-- Adds password column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';

-- Sets default password for all existing users
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL;

-- Creates OTP table for forgot password
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  otp TEXT NOT NULL,
  method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Why This Error Happens

The password features try to access the `password` column and `password_reset_otps` table which don't exist until you run the migration.

When these don't exist, the server returns an error page (HTML) instead of JSON, causing the "Unexpected non-whitespace" error.

---

## Quick Fix

Run this in Supabase SQL Editor:

```sql
-- Add password column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL;

-- Create OTP table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(user_email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_created ON password_reset_otps(created_at);
```

---

## After Setup

Once you've run the migration:
1. Refresh your app
2. Try Change Password again
3. It should work! ✅

---

For detailed documentation, see:
- `PASSWORD-FEATURES-SETUP.md`
- `PASSWORD-FEATURES-SUMMARY.md`
