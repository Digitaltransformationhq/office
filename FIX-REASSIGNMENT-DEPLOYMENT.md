# Fix Reassignment Issue - Deployment Steps

## Problem
Task reassigned from Krunal to Kishan is not showing up for Kishan, and partners are not receiving notifications.

## Root Cause
1. Server endpoint wasn't accepting reassignment fields
2. Database might be missing reassignment columns
3. Notification trigger might not exist

---

## Fix Steps (Run in Order)

### Step 1: Verify Database Setup

**In Supabase SQL Editor, run:**
```sql
-- Copy and run: verify-and-fix-reassignment.sql
```

**Expected Output:**
```
✅ assignment_status column exists
✅ notifications table exists
✅ notification trigger exists
✅✅✅ ALL SYSTEMS READY!
```

**If you see ❌ MISSING:**
1. Run this in SQL Editor:
```sql
-- Copy ALL from: database-task-reassignment-update.sql
-- Paste and run
```

---

### Step 2: Deploy Updated Server Code

The server endpoint has been fixed to accept reassignment fields.

**Deploy using Supabase CLI:**
```bash
supabase functions deploy make-server-0abfa7cf
```

**OR Deploy via Supabase Dashboard:**
1. Go to Supabase Dashboard
2. Click **Edge Functions** in left sidebar
3. Find `make-server-0abfa7cf`
4. Click **Deploy** or **Redeploy**

---

### Step 3: Test the Fix

**In Supabase SQL Editor, run:**
```sql
-- Copy and run: test-reassignment.sql
```

This will:
- Create a test task assigned to Krunal
- Reassign it to Kishan
- Show if Kishan can see it
- Show if partners were notified

**Expected Output:**
```
✅ Kishan can see the task
✅ Partners were notified
```

---

### Step 4: Test in the UI

**Test Reassignment:**

1. **Login as Krunal** (`caoffice@kapsca.in` / `Pass@2026`)
2. Go to **Tasks** tab
3. Find any task assigned to Krunal
4. Click **"📤 Reassign"** button
5. Select **Kishan Solanki**
6. Add reason: "Need help with this"
7. Click **"Reassign Task"**

**Verify Kishan Receives It:**

1. **Login as Kishan** (`kishansolanki3732@gmail.com` / `Pass@2026`)
2. Go to **Tasks** tab
3. **Expected:** See "Pending Acceptance" badge on summary card
4. Click **"Pending Acceptance"** filter
5. **Expected:** See the reassigned task with yellow badge
6. **Expected:** Shows "Reassigned by: Krunal Roy"
7. Click **"✓ Accept"** button
8. **Expected:** Success message, status changes to "Accepted"

**Verify Partners Receive Notification:**

1. **Login as Partner** (`apm@kapsca.in` / `Pass@2026`)
2. In Supabase SQL Editor, check notifications:
```sql
SELECT 
    u.name as partner_name,
    n.title,
    n.message,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.role IN ('partner', 'Partner', 'admin', 'Admin')
ORDER BY n.created_at DESC
LIMIT 10;
```

3. **Expected:** See notifications like:
   - "Task Reassigned: Krunal Roy reassigned ... to Kishan Solanki"
   - "Task Assignment Accepted: Kishan Solanki accepted ..."

---

## What Was Fixed

### 1. Server Endpoint (`supabase/functions/server/index.tsx`)

**Before (Missing fields):**
```typescript
const updates: any = {};
if (body.status !== undefined) updates.status = body.status;
if (body.hoursLogged !== undefined) updates.hours_logged = body.hoursLogged;
// ... only 6 fields
```

**After (All reassignment fields added):**
```typescript
const updates: any = {};
// ... existing fields
// NEW: Reassignment fields
if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
if (body.assignedToId !== undefined) updates.assigned_to_id = body.assignedToId;
if (body.assignmentStatus !== undefined) updates.assignment_status = body.assignmentStatus;
if (body.reassignedFromId !== undefined) updates.reassigned_from_id = body.reassignedFromId;
if (body.reassignedFromName !== undefined) updates.reassigned_from_name = body.reassignedFromName;
if (body.originallyAssignedById !== undefined) updates.originally_assigned_by_id = body.originallyAssignedById;
if (body.originallyAssignedByName !== undefined) updates.originally_assigned_by_name = body.originallyAssignedByName;
if (body.rejectionReason !== undefined) updates.rejection_reason = body.rejectionReason;
if (body.reassignedAt !== undefined) updates.reassigned_at = body.reassignedAt;
```

### 2. Database Schema

Added these columns to `tasks` table:
- `assignment_status` - Tracks acceptance status
- `originally_assigned_by_id` - Who first assigned (partner)
- `originally_assigned_by_name` - Partner's name
- `reassigned_from_id` - Who reassigned most recently
- `reassigned_from_name` - Reassigner's name
- `rejection_reason` - Why rejected
- `reassigned_at` - Timestamp

### 3. Database Trigger

Created `notify_partners_on_task_reassignment()` that:
- Fires when task is reassigned
- Fires when assignment is accepted/rejected
- Creates notifications for all partners
- Creates notification for original assigner

---

## Troubleshooting

### Issue: Kishan still can't see the task

**Check 1: Is task actually reassigned?**
```sql
SELECT 
    id,
    task,
    assigned_to,
    assigned_to_id,
    assignment_status,
    reassigned_from_name
FROM tasks
WHERE assigned_to_id = (SELECT id FROM users WHERE email = 'kishansolanki3732@gmail.com');
```

Expected: Should show tasks with `assignment_status = 'Pending Acceptance'`

**Check 2: Is Kishan's user ID correct?**
```sql
SELECT id, name, email FROM users WHERE email = 'kishansolanki3732@gmail.com';
```

Expected: Should return one user

**Check 3: Is the frontend filtering correctly?**
- The TaskMIS component filters by `assigned_to_id`
- Make sure the task's `assigned_to_id` matches Kishan's user ID

### Issue: Partners not receiving notifications

**Check 1: Does notifications table exist?**
```sql
SELECT COUNT(*) FROM notifications;
```

If error: Run `database-task-reassignment-update.sql`

**Check 2: Does trigger exist?**
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'notify_partners_on_task_change';
```

If no rows: Run `database-task-reassignment-update.sql`

**Check 3: Are partners in database?**
```sql
SELECT id, name, role FROM users WHERE role IN ('partner', 'Partner', 'admin', 'Admin');
```

Expected: Should return at least 2-3 users

### Issue: Server endpoint not working

**Check 1: Was function deployed?**
```bash
supabase functions list
```

Look for `make-server-0abfa7cf` with recent deployment time

**Check 2: Check server logs**

In Supabase Dashboard:
1. Go to **Edge Functions**
2. Click `make-server-0abfa7cf`
3. Click **Logs** tab
4. Look for errors

**Check 3: Test endpoint directly**

Check browser console for errors when reassigning a task

---

## Clean Up Test Data

After testing, remove test tasks:

```sql
DELETE FROM tasks WHERE task LIKE 'Test Task%';
DELETE FROM notifications WHERE message LIKE '%Test Task%';
```

---

## Verification Checklist

After deployment, verify:

- [ ] Database has reassignment columns (run verify-and-fix-reassignment.sql)
- [ ] Notifications table exists
- [ ] Trigger exists
- [ ] Server function deployed with latest code
- [ ] Can reassign task from Krunal to Kishan
- [ ] Kishan sees task with "Pending Acceptance" status
- [ ] Kishan can accept the task
- [ ] Partners receive notifications in database
- [ ] Original assigner is tracked correctly

---

## Summary

**What you need to do:**

1. ✅ Run `verify-and-fix-reassignment.sql` in Supabase SQL Editor
2. ✅ If missing components, run `database-task-reassignment-update.sql`
3. ✅ Deploy Edge Function: `supabase functions deploy make-server-0abfa7cf`
4. ✅ Test reassignment: Krunal → Kishan
5. ✅ Verify Kishan sees it in "Pending Acceptance"
6. ✅ Verify partners get notifications

**After this, the reassignment system will work properly!**
