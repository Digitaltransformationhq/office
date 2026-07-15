# 🔍 CRITICAL - Check Server Logs Now

## The frontend is calling the API but getting an error

The error shows the API is returning:
```json
{
  "success": false,
  "error": "Failed to create user",
  "details": "[object Object]"
}
```

The `"[object Object]"` means the server is trying to return an object but it's being converted to a string incorrectly.

---

## What to Check Now:

### 1. Open Browser Console (F12)

Look for these NEW detailed logs I just added:
- `API Error (/users):`
- `Response status:` 
- `Response statusText:`
- `Error details:`
- `Additional info:`

These will show you the REAL error from the server.

---

### 2. Check Supabase Edge Function Logs

1. Go to **Supabase Dashboard**
2. Click **Edge Functions** (left sidebar)
3. Click on your function
4. Click **Logs** tab
5. Look for the recent error

You should see detailed logs like:
```
=== CREATE USER REQUEST ===
Request body: {...}
User object to insert: {...}
=== DATABASE ERROR ===
Error code: 42703
Error message: column "password" of relation "users" does not exist
```

This will tell you EXACTLY what's wrong!

---

## Most Likely Issues:

### Issue 1: Password Column Missing (90% chance)
**Symptom:** Error code 42703 or message about "password" column

**Fix:** Run this SQL:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Pass@2026';
UPDATE users SET password = 'Pass@2026';
```

---

### Issue 2: Duplicate Email
**Symptom:** Error code 23505

**Fix:** Use a different email address

---

### Issue 3: Role Constraint Violation
**Symptom:** Error about role constraint

**Fix:** Use valid role: `team-member`, `team-leader`, `partner`, or `admin`

---

## After Checking Logs:

### Try Adding Staff Again

Now the browser console will show you:

**Success:**
```
usersAPI.create called with: {name: "...", email: "...", ...}
=== CREATE USER REQUEST ===
User object to insert: {...}
=== USER CREATED SUCCESSFULLY ===
usersAPI.create result: {success: true, data: {...}}
```

**Error:**
```
usersAPI.create called with: {name: "...", email: "...", ...}
=== DATABASE ERROR ===
Error code: 42703
Error message: column "password" does not exist
User creation failed: {success: false, error: "...", details: "..."}
```

---

## What I Just Fixed:

1. ✅ API now returns error details instead of throwing
2. ✅ Detailed console logging at every step
3. ✅ Error response includes all details
4. ✅ Frontend displays the actual error message

Now you'll see the REAL error. Check the logs and tell me what you see!

---

## Quick Test:

Try adding staff with these details:
- Name: Test User
- Email: test123@kapsca.in
- Role: Team Member
- Password: Pass@2026

Then check the console and share what error message you see.
