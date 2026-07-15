# 🔧 Login Troubleshooting Guide

## Issue: "Invalid email or password" error

If you're getting this error, it's likely because the password column doesn't exist in your database yet or the password values aren't set correctly.

---

## Quick Fix

### Step 1: Check Database Structure

Run this in **Supabase SQL Editor**:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'password';
```

**If you get NO RESULTS**, the password column doesn't exist yet. Proceed to Step 2.

**If you get a result**, the column exists. Proceed to Step 3.

---

### Step 2: Add Password Column (if missing)

Run this in **Supabase SQL Editor**:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';
```

This will:
- Add the `password` column to the users table
- Set default password 'Pass@2026' for all users

---

### Step 3: Verify Password Values

Run this in **Supabase SQL Editor**:

```sql
SELECT id, name, email, password
FROM users
WHERE email = 'apm@kapsca.in';
```

**Expected Result:**
```
id       | name           | email            | password
user:10  | Abhishek Patel | apm@kapsca.in    | Pass@2026
```

If the password column shows `NULL` or is empty, run:

```sql
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';
```

---

### Step 4: Check Server Logs

After attempting to login, check your browser's **Developer Console** (F12 → Console tab).

You should see logs like:
```
Login attempt for email: apm@kapsca.in
User found: user:10 Abhishek Patel password column exists: true password value: Pass@2026
Expected password: Pass@2026 Provided password: Pass@2026 Match: true
```

If you see:
- `password column exists: false` → Run Step 2
- `password value: null` → Run the UPDATE query in Step 3
- `Match: false` → Check if you're using the correct password

---

## Complete Database Setup

If you haven't run any database migrations yet, run these in order:

### 1. Basic Schema (database-schema.sql)
Creates users, clients, tasks tables

### 2. Location Tracking (database-location-update.sql)
Adds location tracking columns

### 3. Password Features (database-password-features.sql)
Adds password column and OTP features

---

## Default Credentials

After setting up the password column, all users have this default password:

**Password:** `Pass@2026`

**Test Accounts:**
- Admin: `office@kapsca.in` / `Pass@2026`
- Partner: `apm@kapsca.in` / `Pass@2026`
- Staff: Any user email / `Pass@2026`

---

## Debugging Steps

### 1. Check what email you're using
Make sure the email exists in the database:

```sql
SELECT email, name, role FROM users;
```

### 2. Check console logs
Open browser console (F12) before login attempt
Look for the detailed login logs

### 3. Verify database connection
Make sure your Supabase project is running and accessible

### 4. Check API endpoint
The login endpoint should be:
`https://YOUR_PROJECT.supabase.co/functions/v1/make-server-0abfa7cf/login`

---

## Still Not Working?

### Option A: Manual Password Reset in Database

Run this for a specific user:

```sql
UPDATE users 
SET password = 'Pass@2026' 
WHERE email = 'apm@kapsca.in';
```

### Option B: Check All Migrations Run

Verify these tables exist:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'clients', 'tasks', 'login_history', 'password_reset_otps');
```

**Expected Result:**
- users ✅
- clients ✅
- tasks ✅
- login_history ✅ (from location migration)
- password_reset_otps ✅ (from password migration)

### Option C: Re-run Password Migration

```sql
-- Add password column with default value
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';

-- Set password for all existing users
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';

-- Verify
SELECT email, password FROM users LIMIT 5;
```

---

## Common Mistakes

❌ **Wrong password** - Make sure you're using `Pass@2026` (case-sensitive)
❌ **Wrong email** - Check email spelling (apm@kapsca.in not apm@kapsa.in)
❌ **Password column missing** - Run database-password-features.sql
❌ **NULL passwords** - Run UPDATE query to set passwords
❌ **Using old browser cache** - Clear browser cache and reload

---

## Success Checklist

- [ ] Password column exists in users table
- [ ] All users have password = 'Pass@2026'
- [ ] Email exists in users table
- [ ] Browser console shows successful login logs
- [ ] No errors in Supabase logs

---

## Contact Support

If still not working after all these steps:

1. Share console logs from browser
2. Share results of check-login-debug.sql queries
3. Share any error messages from Supabase logs

Your login should work after following these steps! 🔐✨
