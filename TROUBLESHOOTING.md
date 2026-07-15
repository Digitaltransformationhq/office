# 🔧 TROUBLESHOOTING GUIDE

## Error: "Failed to fetch"

**Cause:** Edge Function is not deployed or not responding

**Fix:**
1. Deploy the Edge Function (see `DEPLOY-NOW.md`)
2. Verify deployment by opening: https://whhnkacjzfyidodqhbpw.supabase.co/functions/v1/make-server-0abfa7cf/health
3. Should return: `{"status":"ok"}`

---

## Error: "Invalid email or password" (401)

**Cause:** Either wrong credentials or user doesn't exist in database

**Fix Option 1 - Use existing credentials:**
- Check what email/password you're using
- Default password for all users: `Pass@2026`
- Common emails: `partner@kaps.co`, `admin@kaps.co`, `staff@kaps.co`

**Fix Option 2 - Create test users:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of `fix-login-users.sql`
3. Click **RUN**
4. Use these credentials:
   ```
   Partner: partner@kaps.co / Pass@2026
   Admin: admin@kaps.co / Pass@2026
   Staff: staff@kaps.co / Pass@2026
   ```

**Fix Option 3 - Check existing users:**
```sql
SELECT id, name, email, role, password
FROM users
ORDER BY role;
```

---

## Error: "Pending Inquiries shows 0" (but you created one)

**Cause:** `client_inquiries` table doesn't exist

**Fix:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of `database-inquiry-system.sql`
3. Click **RUN**

---

## Error: "Create Task button missing on Staff dashboard"

**Cause:** Not logged in as Staff, or page needs refresh

**Fix:**
1. Logout completely
2. Login as Staff (email with role: `team-member`, `Staff`, or `Team Member`)
3. Hard refresh page (Ctrl+Shift+R)

---

## Error: "Approval cards not showing on Partner dashboard"

**Cause:** Not logged in as Partner/Admin, or page needs refresh

**Fix:**
1. Logout completely
2. Login as Partner or Admin
3. Hard refresh page (Ctrl+Shift+R)
4. Look for two orange cards near top of dashboard

---

## QUICK DIAGNOSTIC CHECKLIST

Run through these in order:

### ✅ Step 1: Is the Edge Function deployed?
```
Open in browser:
https://whhnkacjzfyidodqhbpw.supabase.co/functions/v1/make-server-0abfa7cf/health

Expected: {"status":"ok"}
If you get error → Deploy the Edge Function (see DEPLOY-NOW.md)
```

### ✅ Step 2: Does the database table exist?
```sql
-- Run in Supabase SQL Editor:
SELECT * FROM client_inquiries LIMIT 1;

Expected: Empty result or rows of data
If error "relation does not exist" → Run database-inquiry-system.sql
```

### ✅ Step 3: Can you login?
```
Try logging in with:
Email: admin@kaps.co
Password: Pass@2026

If fails → Run fix-login-users.sql
```

### ✅ Step 4: Are features visible?
```
Partner/Admin should see:
- Two orange cards: "Pending Task Approvals" and "Pending Inquiries"

Staff should see:
- Two buttons: "📋 Create Task" and "📨 New Inquiry"

If not visible → Hard refresh (Ctrl+Shift+R) or clear browser cache
```

---

## COMPLETE SETUP SEQUENCE

If nothing is working, do this in exact order:

1. **Run database migration:**
   - Supabase → SQL Editor → Paste `database-inquiry-system.sql` → Run

2. **Create test users:**
   - Supabase → SQL Editor → Paste `fix-login-users.sql` → Run

3. **Deploy Edge Function:**
   - See `DEPLOY-NOW.md` for deployment steps
   - Method 1 (Figma Make) is easiest

4. **Test health endpoint:**
   - Open: https://whhnkacjzfyidodqhbpw.supabase.co/functions/v1/make-server-0abfa7cf/health
   - Must return: `{"status":"ok"}`

5. **Test login:**
   - Login as: `admin@kaps.co` / `Pass@2026`
   - Should see Partner/Admin dashboard

6. **Test features:**
   - See orange approval cards
   - Click them to verify modals open

---

## STILL STUCK?

### Check Supabase Logs:
1. Supabase Dashboard → Edge Functions → make-server-0abfa7cf
2. Click **Logs** tab
3. Look for red error messages
4. Share the error message for help

### Check Browser Console:
1. Press F12 to open DevTools
2. Click **Console** tab
3. Look for red error messages
4. Share the error message for help

### Check Network Tab:
1. Press F12 to open DevTools
2. Click **Network** tab
3. Try the failing action
4. Look for failed requests (in red)
5. Click on failed request → **Response** tab
6. Share the error response for help
