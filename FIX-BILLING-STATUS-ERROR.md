# Fix: Task Status "Pending for Billing" Error

## 🔴 Problem
When trying to send a task for billing, you're getting this error:
```
new row for relation "tasks" violates check constraint "tasks_status_check"
```

## ✅ Solution
The database needs to be updated to allow "Pending for Billing" as a valid task status.

### Step 1: Run This SQL Command

1. **Go to Supabase Dashboard**
   - Navigate to your Supabase project
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Copy and paste this SQL command:**

```sql
-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with "Pending for Billing" included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Pending Approval', 'Pending for Billing'));
```

3. **Click "Run"**

4. **Verify Success**
   - You should see a success message
   - The constraint has been updated

### Step 2: Test the Feature

1. Go to Task MIS
2. Find a completed task
3. Click "Send for Billing"
4. The task should now successfully update to "Pending for Billing" status

## 📊 Valid Task Statuses (After Fix)

After running the SQL command, these statuses will be valid:
- ✅ Pending
- ✅ In Progress
- ✅ Completed
- ✅ Overdue
- ✅ Pending Approval
- ✅ **Pending for Billing** ← NEW!

## 🔧 What Was Fixed

### Backend
- ✅ Enhanced error logging to show detailed Supabase errors
- ✅ Proper error serialization (no more "[object Object]")
- ✅ Detailed console logging for debugging

### Frontend
- ✅ Improved error display in console
- ✅ Better error message extraction
- ✅ JSON stringification of complex error objects

### Database
- ✅ Updated task status constraint to include "Pending for Billing"
- ✅ Updated schema documentation

## 📝 Files Modified

1. `/supabase/functions/server/index.tsx` - Enhanced error handling
2. `/src/app/services/api.ts` - Better error logging
3. `/database-schema.sql` - Updated for future reference
4. `/fix-task-status-constraint.sql` - One-time migration script

## 🎯 Next Steps

After running the SQL command, the "Send for Billing" feature will work correctly and tasks can be marked as "Pending for Billing" for the Accounts team to process.
