# 🔧 Add Staff Feature - Troubleshooting Guide

## Error: "Failed to create user"

If you're getting this error when trying to add a new staff member, follow these steps:

---

## Quick Fix

### Step 1: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try to add staff again
4. Look for detailed error messages

You should see logs like:
```
Creating new user: Test User testuser@kapsca.in team-member
Database error details: {...}
Error code: XXXXX
Error message: ...
```

---

### Step 2: Run Database Check

Open **Supabase Dashboard → SQL Editor** and run:

```sql
-- Check if password column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'password';
```

**If NO RESULTS:**
The password column is missing. Run this:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL OR password = '';
```

**If you see a result:**
Password column exists. Continue to Step 3.

---

### Step 3: Check All Required Columns

Run this to see all columns in users table:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Expected columns:**
- ✅ id
- ✅ name
- ✅ email
- ✅ role
- ✅ status
- ✅ password
- ✅ last_login
- ✅ created_at
- ✅ updated_at

**Optional columns (from migrations):**
- last_login_latitude
- last_login_longitude
- last_login_location
- last_login_ip

---

## Common Errors & Solutions

### Error: "Email already exists"

**Cause:** Email is already in use by another user

**Solution:**
1. Use a different email address
2. Or check existing users:
```sql
SELECT id, name, email, role FROM users WHERE email = 'duplicate@kapsca.in';
```

---

### Error: "Column 'password' does not exist"

**Cause:** Password column not added to database

**Solution:**
Run `database-password-features.sql` migration:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026' WHERE password IS NULL;
```

---

### Error: "Column 'status' does not exist"

**Cause:** Basic database schema not created

**Solution:**
1. Run `database-schema.sql` first
2. This creates the complete users table structure

---

### Error: "Role check constraint violation"

**Cause:** Invalid role value

**Solution:**
Use only these role values:
- `admin`
- `partner`
- `team-leader`
- `team-member`

Check the constraint:
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%role%';
```

---

## Database Setup Order

If you haven't set up the database yet, run migrations in this order:

### 1. Basic Schema (REQUIRED)
File: `database-schema.sql`
- Creates users, clients, tasks tables
- Adds constraints and indexes

### 2. Location Tracking (Optional)
File: `database-location-update.sql`
- Adds location columns
- Creates login_history table

### 3. Password Features (REQUIRED for Add Staff)
File: `database-password-features.sql`
- Adds password column
- Creates password_reset_otps table

---

## Manual Testing

### Test 1: Check Database Connection

```sql
SELECT COUNT(*) as user_count FROM users;
```

If this fails, your database connection has issues.

---

### Test 2: Manual User Creation

Try creating a user manually in SQL:

```sql
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
  'user:test_123456',
  'Test User Manual',
  'testmanual@kapsca.in',
  'team-member',
  'Active',
  'Pass@2026',
  NOW(),
  NOW()
);
```

If this works, the issue is in the frontend/backend code.
If this fails, the issue is in the database schema.

---

### Test 3: Check for Unique Constraint

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
  AND constraint_type = 'UNIQUE';
```

Should show UNIQUE constraint on email.

---

## Debugging Checklist

- [ ] Password column exists in users table
- [ ] All required columns exist (id, name, email, role, status, password)
- [ ] Email is not already in use
- [ ] Role value is valid (admin/partner/team-leader/team-member)
- [ ] Browser console shows detailed error logs
- [ ] Database migrations have been run
- [ ] Supabase project is accessible
- [ ] API endpoint is responding

---

## Error Code Reference

### Error Code: 23505
**Meaning:** Unique constraint violation (duplicate email)
**Fix:** Use different email

### Error Code: 42703
**Meaning:** Column does not exist
**Fix:** Run database migration to add column

### Error Code: 23514
**Meaning:** Check constraint violation (invalid role/status)
**Fix:** Use valid role values

### Error Code: 42P01
**Meaning:** Table does not exist
**Fix:** Run database-schema.sql

---

## Still Not Working?

### Get Detailed Logs

1. Open browser console (F12)
2. Try adding staff
3. Copy all console logs
4. Check:
   - What error code appears?
   - What error message appears?
   - What were the values you tried to insert?

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Logs section
3. Look for errors in Edge Functions
4. Check for detailed error messages

### Verify Data

```sql
-- See recent users
SELECT id, name, email, role, password, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Count users by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;

-- Check for NULL passwords
SELECT COUNT(*) as null_passwords
FROM users
WHERE password IS NULL;
```

---

## Clean Start (If Everything Fails)

If nothing works, reset and start fresh:

### 1. Backup existing data
```sql
-- Export to CSV or save query results
SELECT * FROM users;
SELECT * FROM tasks;
SELECT * FROM clients;
```

### 2. Drop and recreate users table
```sql
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS password_reset_otps CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### 3. Run all migrations in order
1. Run `database-schema.sql`
2. Run `database-location-update.sql`
3. Run `database-password-features.sql`

### 4. Restore data if needed
```sql
-- Insert your backed up data
```

---

## Success Indicators

After fixing, you should see:

✅ Add Staff button appears for Partners/Admins
✅ Modal opens when clicking button
✅ Form validates correctly
✅ Console shows: "Creating new user: [name] [email] [role]"
✅ Console shows: "User created successfully: [id] [name]"
✅ Success screen appears with credentials
✅ New user appears in users table
✅ Can login with new credentials

---

## Contact Support

If still stuck after all these steps:

1. Share browser console logs
2. Share Supabase error logs
3. Share results of fix-add-staff-errors.sql queries
4. Confirm which database migrations you've run

Your Add Staff feature should work after following these steps! 👤✨
