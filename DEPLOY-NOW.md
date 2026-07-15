# 🚨 URGENT: DEPLOY EDGE FUNCTION

## The Problem
- Edge Function is NOT running (HTTP Status 000)
- All API calls are failing with "Failed to fetch"
- Login is failing because the server is not responding

## The Solution

### METHOD 1: Via Figma Make (EASIEST)

1. **In your Figma Make project**:
   - Look for a **"Deploy"** or **"Publish"** button
   - Click it to deploy the latest code

2. **Or in Settings**:
   - Go to **Settings** → **Integrations** → **Supabase**
   - Click **"Reconnect"** or **"Update Connection"**
   - This will redeploy the server code

### METHOD 2: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project: **whhnkacjzfyidodqhbpw**
3. Click **Edge Functions** (left sidebar)
4. Find: **make-server-0abfa7cf**
5. Click **Deploy** button
6. Wait for "Active" status with green checkmark

### METHOD 3: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref whhnkacjzfyidodqhbpw

# Deploy function
cd /workspaces/default/code
supabase functions deploy make-server-0abfa7cf --no-verify-jwt
```

## How to Verify It Worked

Open this URL in your browser:
```
https://whhnkacjzfyidodqhbpw.supabase.co/functions/v1/make-server-0abfa7cf/health
```

**Expected Response:**
```json
{"status":"ok"}
```

If you see that, the Edge Function is deployed and working!

## After Deployment

1. Refresh your application
2. Try logging in again
3. Test task creation and inquiry features

## Still Not Working?

If deployment fails, check:
1. Supabase Dashboard → Edge Functions → Logs (for error messages)
2. Make sure you're using the **service_role** key (not anon key)
3. Check if there are any billing/quota issues in Supabase

---

**Once deployed, all features will work:**
- ✅ Login
- ✅ Task creation by staff
- ✅ Task approval by partners
- ✅ Client inquiry submission
- ✅ Inquiry approval and client conversion
