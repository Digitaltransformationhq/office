# 🚨 EMERGENCY FIX - 503 Error

## Problem
Edge Function is completely down - returning 503 for /tasks and /users

## IMMEDIATE SOLUTION

### Step 1: Restart Edge Function (Supabase Dashboard)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** in left sidebar
4. Find `make-server-0abfa7cf`
5. Click the **3 dots menu** (⋮) on the right
6. Click **Redeploy**
7. Wait for "Deployment successful" message

### Step 2: Verify Function is Running

After redeployment, check status:
- Should see **green dot** next to function name
- Status should say "Active" or "Running"

### Step 3: Test the Function

Open a new tab and try:
```
https://YOUR-PROJECT-ID.supabase.co/functions/v1/make-server-0abfa7cf/health
```

Replace YOUR-PROJECT-ID with your actual project ID.

**Expected response:**
```json
{"status":"ok"}
```

### Step 4: Clear Browser Cache & Reload

1. Press **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
2. Clear "Cached images and files"
3. Close browser
4. Reopen browser
5. Go to your app
6. Try logging in

---

## If Still Not Working: Check Logs

1. In Supabase Dashboard → Edge Functions
2. Click `make-server-0abfa7cf`
3. Click **Logs** tab
4. Look for red error messages
5. **Send me the error message** and I'll fix it

---

## Common Causes & Fixes

### Error: "Runtime error at line X"
**Fix:** The server code has a bug at that line. Send me the error.

### Error: "Import failed" or "Module not found"
**Fix:** Dependencies issue. Redeploy should fix it.

### Error: "Out of memory"
**Fix:** Function needs more resources. Contact Supabase support.

### Error: "Timeout"
**Fix:** Database query is slow. Need to optimize.

---

## Quick Test: Is Database Working?

1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Click **users** table
4. Do you see users listed?

**If NO users:** Run database-schema.sql first
**If YES users:** Edge Function problem only

---

## Nuclear Option: Fresh Deploy

If nothing works, create a new function:

1. In Supabase Dashboard → Edge Functions
2. Click **Create a new function**
3. Name it: `make-server-test`
4. Copy code from `/workspaces/default/code/supabase/functions/server/index.tsx`
5. Deploy
6. Update `/utils/supabase/info.ts` to use new function name

---

## What to Send Me

If still broken after redeployment, send:

1. ✅ Screenshot of Edge Functions page (showing status)
2. ✅ Last 10 lines from Logs tab
3. ✅ Response from /health endpoint test
4. ✅ Your Supabase project ID (first part of URL)

I'll diagnose the exact issue!

---

## Temporary Workaround

While we fix the Edge Function, you can still:
- View existing data in Supabase Dashboard
- Run database migrations
- Edit tables directly

**The app won't work without the Edge Function running!**
