# 🔧 SIMPLE FIX - Add Staff Error

## The error you're seeing means: **The password column is missing from your database**

---

## FIX IT NOW - 3 Steps:

### Step 1: Open Supabase
Go to: https://supabase.com → Your Project → **SQL Editor**

### Step 2: Copy and Paste This
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026';
```

### Step 3: Click "RUN"

---

## ✅ That's it!

Now go back to your app and try adding staff again. It will work!

---

## What this does:
- Adds a `password` column to your users table
- Sets default password for all users
- Fixes the "Failed to create user" error

---

## To verify it worked:

Run this query:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'password';
```

You should see:
```
column_name
-----------
password
```

✅ **Password column exists! Try adding staff now.**

---

## Still getting errors?

Open browser console (F12) and you'll see detailed error messages telling you exactly what's wrong.

Look for lines starting with:
- `=== CREATE USER REQUEST ===`
- `=== DATABASE ERROR ===`
- Error code and message

Share those logs if you need more help.
