# 🚀 DEPLOY APPROVAL WORKFLOWS - STEP BY STEP

## ⚠️ CRITICAL: These Steps Must Be Completed

Your approval workflow features are **built and ready** but require deployment to work.

---

## STEP 1: Run Database Migration (REQUIRED)

**What:** Create the `client_inquiries` table in your Supabase database.

**How:**

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **whhnkacjzfyidodqhbpw**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. **Copy and paste** the entire contents of `database-inquiry-system.sql`
6. Click **RUN** (or press Ctrl+Enter)

**Expected Result:**
```
Success. No rows returned
```

**What This Does:**
- Creates `client_inquiries` table
- Adds indexes for fast queries
- Sets up auto-update triggers
- Inserts 2 sample inquiries for testing

---

## STEP 2: Deploy Edge Function (REQUIRED)

**What:** Deploy the updated server with inquiry endpoints.

**How:**

### Option A: Via Figma Make (Recommended)

1. In your Figma Make project
2. Go to **Settings** → **Integrations** → **Supabase**
3. Click **Reconnect** or **Update Connection**
4. Enter your credentials:
   - **Project URL**: `https://whhnkacjzfyidodqhbpw.supabase.co`
   - **Service Role Key**: (get from Supabase Dashboard → Settings → API)
5. After reconnecting, the function will auto-deploy

### Option B: Via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find function: `make-server-0abfa7cf`
3. Click **Deploy** or **Redeploy**
4. Wait for green "Active" status

### Option C: Via Supabase CLI

```bash
# Install CLI (if not already installed)
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref whhnkacjzfyidodqhbpw

# Deploy the function
cd /workspaces/default/code
supabase functions deploy make-server-0abfa7cf --no-verify-jwt
```

**Expected Result:**
- Function status shows **"Active"** with green indicator
- No errors in deployment logs

---

## STEP 3: Test the Deployment

### Test 1: Health Check

Open this URL in your browser:
```
https://whhnkacjzfyidodqhbpw.supabase.co/functions/v1/make-server-0abfa7cf/health
```

**Expected Response:**
```json
{"status":"ok"}
```

**If you see this → ✅ Server is running!**

### Test 2: Check Database Table

1. Go to **Supabase Dashboard** → **Table Editor**
2. Look for table: `client_inquiries`
3. You should see 2 sample rows

**If you see the table → ✅ Database is ready!**

---

## STEP 4: Test the Features

### Test A: Inquiry Submission (Staff)

1. **Login as Staff member**
2. Dashboard → Click **"📨 New Inquiry"** button (top right)
3. Fill the form:
   - Client Name: "Test Client"
   - Mobile: "9876543210"
   - Work Type: "GST Filing"
4. Click **"Submit to Partner"**
5. **Expected:** Green toast: "Inquiry submitted to Partner for review!"

### Test B: Inquiry Approval (Partner)

1. **Login as Partner/Admin**
2. Dashboard → See orange card: **"Pending Inquiries"** with count
3. Click the card
4. Click **"Review"** on any inquiry
5. Click **"✅ Approve & Convert to Client"**
6. **Expected:**
   - Green toast: "Inquiry approved! [Name] added to client master."
   - Success screen with "Create Task" button
7. Go to **Admin Dashboard** → **Client Master**
8. **Expected:** New client appears in the list

### Test C: Task Approval (Partner)

1. **Create task as Staff** (with "Pending Approval" status)
2. **Login as Partner**
3. Dashboard → See orange card: **"Pending Task Approvals"**
4. Click the card
5. Click **"Review"** on a task
6. Click **"✅ Approve"**
7. **Expected:**
   - Green toast: "Task approved and assigned"
   - Task moves to assignee's "My Tasks"

---

## 🔧 TROUBLESHOOTING

### Problem: "Pending Inquiries" shows 0 (but you created one)

**Cause:** Database table doesn't exist or wasn't created properly

**Fix:**
1. Go to Supabase → **SQL Editor**
2. Run this query:
   ```sql
   SELECT * FROM client_inquiries;
   ```
3. **If error "relation does not exist"** → Run STEP 1 again
4. **If returns data** → Edge Function needs deployment (STEP 2)

---

### Problem: "Failed to submit inquiry" error

**Cause:** Edge Function not deployed or crashed

**Fix:**
1. Go to Supabase → **Edge Functions** → **make-server-0abfa7cf**
2. Click **Logs** tab
3. Look for errors
4. Click **Redeploy**
5. Test health endpoint again

---

### Problem: 403 Forbidden Error

**Cause:** Supabase connection lost permissions

**Fix:**
1. Figma Make → Settings → Supabase → **Reconnect**
2. Use **service_role** key (NOT anon key)
3. Redeploy function

---

### Problem: API endpoints return 404

**Cause:** Wrong Supabase project URL

**Fix:**
Verify your project URL is:
```
https://whhnkacjzfyidodqhbpw.supabase.co
```

If different, update all fetch calls in:
- `AdminDashboard.tsx`
- `PartnerDashboard.tsx`
- `CreateInquiryModal.tsx`
- `InquiryApprovalQueue.tsx`
- `ReviewInquiryModal.tsx`

---

## ✅ VERIFICATION CHECKLIST

Before testing, verify:

- [ ] SQL migration ran successfully (no errors)
- [ ] `client_inquiries` table exists in Table Editor
- [ ] Edge Function shows "Active" status
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] All dashboards load without errors
- [ ] Orange approval cards visible on Partner/Admin dashboard
- [ ] "New Inquiry" button visible on Staff dashboard

---

## 📊 WHAT EACH STEP DOES

### Database Migration (`database-inquiry-system.sql`):
```sql
CREATE TABLE client_inquiries (
    id BIGSERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    work_type TEXT NOT NULL,
    status TEXT DEFAULT 'Pending Review',
    ...
);
```

### Server Endpoints (in `server/index.tsx`):
```
POST   /make-server-0abfa7cf/inquiries
GET    /make-server-0abfa7cf/inquiries/pending
PUT    /make-server-0abfa7cf/inquiries/:id
PUT    /make-server-0abfa7cf/inquiries/:id/status
```

### UI Components:
- **AdminDashboard.tsx** → Shows approval cards
- **PartnerDashboard.tsx** → Shows approval cards
- **TeamMemberDashboard.tsx** → Shows "New Inquiry" button
- **TaskApprovalQueue.tsx** → Lists pending tasks
- **InquiryApprovalQueue.tsx** → Lists pending inquiries
- **CreateInquiryModal.tsx** → Inquiry form
- **ReviewInquiryModal.tsx** → Approve/Reject inquiry
- **ReviewTaskModal.tsx** → Approve/Reject task

---

## 🎯 EXPECTED BEHAVIOR AFTER DEPLOYMENT

### Staff Experience:
1. Click "New Inquiry" → Fill form → Submit
2. See toast: "Inquiry submitted for review"
3. Create task → Status: "Pending Approval"
4. Wait for partner approval

### Partner Experience:
1. See dashboard cards:
   - "Pending Task Approvals: 3"
   - "Pending Inquiries: 2"
2. Click card → See list
3. Click "Review" → Approve/Reject
4. For inquiries:
   - Approve → Auto-creates client
   - Option to create task immediately

### Auto Features:
- ✅ Real-time counts update every 5 seconds
- ✅ Toast notifications for all actions
- ✅ Inquiry → Client conversion automatic
- ✅ Task status changes tracked
- ✅ Rejection reasons recorded

---

## 📞 STILL NOT WORKING?

If you've completed all steps and it's still not working:

1. **Check browser console** (F12) for errors
2. **Check Supabase Edge Function Logs**:
   - Dashboard → Edge Functions → Logs
   - Look for red errors
3. **Send me the error messages** from:
   - Browser console
   - Supabase function logs
   - Any toast error messages

---

## 🚀 DEPLOYMENT COMPLETE?

Once you see:
- ✅ Orange approval cards on Partner/Admin dashboard
- ✅ Counts showing pending items
- ✅ "New Inquiry" button on Staff dashboard
- ✅ Can submit inquiry and see it in approval queue
- ✅ Can approve inquiry and see new client created

**Then your approval workflows are FULLY FUNCTIONAL! 🎉**
