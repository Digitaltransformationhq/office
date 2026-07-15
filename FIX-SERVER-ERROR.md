# Fix Server 503 Error - Edge Function Issue

## Problem
API Error: "Service is temporarily unavailable" (503)
Code: SUPABASE_EDGE_RUNTIME_ERROR

## Root Cause
The Supabase Edge Function needs to be deployed or has crashed.

---

## SOLUTION 1: Redeploy the Edge Function

```bash
# In terminal, run:
supabase functions deploy make-server-0abfa7cf
```

If you don't have Supabase CLI, deploy via Dashboard:

1. Go to Supabase Dashboard
2. Click **Edge Functions** in sidebar
3. Find `make-server-0abfa7cf`
4. Click **Deploy** or **Redeploy**

---

## SOLUTION 2: Check Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions**
2. Click `make-server-0abfa7cf`
3. Click **Logs** tab
4. Look for errors

Common errors:
- Import errors
- Syntax errors
- Missing dependencies

---

## SOLUTION 3: Verify Function Status

Check if function is running:

1. Go to Supabase Dashboard
2. Edge Functions → make-server-0abfa7cf
3. Check status indicator (should be green)
4. If red/yellow, redeploy

---

## SOLUTION 4: Test Direct API Call

Try accessing the API directly:

```bash
curl https://YOUR-PROJECT-ID.supabase.co/functions/v1/make-server-0abfa7cf/users \
  -H "Authorization: Bearer YOUR-ANON-KEY"
```

Replace:
- YOUR-PROJECT-ID with your Supabase project ID
- YOUR-ANON-KEY with your anon key

---

## QUICK FIX (Most Likely)

The new components I created might be trying to use the API before the function is ready.

**Immediate action:**

1. **Redeploy the Edge Function** (this usually fixes 503 errors)

2. **Refresh the browser** after redeployment

3. **Clear browser cache** if still having issues

---

## Alternative: Temporary Fallback

If Edge Function won't deploy, we can create a simpler version:

```bash
# Create minimal working version
cat > /tmp/minimal-server.ts << 'MINIMAL'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Simple health check
    if (req.method === 'GET' && new URL(req.url).pathname.includes('/health')) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
MINIMAL
```

---

## Most Common Fix

**90% of the time, this fixes it:**

```bash
supabase functions deploy make-server-0abfa7cf
```

Then refresh your browser.

---

## If Still Not Working

Check these in order:

1. ✅ **Project has Edge Functions enabled** (check Supabase dashboard settings)

2. ✅ **Anon key is correct** in `/utils/supabase/info.ts`

3. ✅ **Function was deployed successfully** (check deployment logs)

4. ✅ **No syntax errors** in server/index.tsx

5. ✅ **All imports are valid** in the function

---

## Emergency: Use Without Edge Function

If you need the app working NOW without Edge Functions:

1. Comment out the API calls temporarily
2. Use mock data
3. Fix Edge Function later

Let me know which solution you need!
