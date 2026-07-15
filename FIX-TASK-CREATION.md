# Fix Task Creation Error - Add Missing Database Columns

## Problem
Task creation is failing with error: `Could not find the 'created_by' column of 'tasks' in the schema cache`

## Solution
Run the SQL migration to add missing columns to the tasks table.

## Steps to Fix

### 1. Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)

### 2. Run the Migration
1. Click **New Query**
2. Copy the entire contents of the file: `database-add-missing-columns.sql`
3. Paste it into the SQL Editor
4. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### 3. Verify the Migration
You should see output showing the new columns:
```
column_name          | data_type      | is_nullable
---------------------|----------------|------------
billing_description  | text           | YES
billing_fees         | numeric        | YES
created_by           | text           | YES
created_by_id        | text           | YES
taxable_amount       | numeric        | YES
```

### 4. Test Task Creation
1. Go back to the application
2. Try creating a new task
3. It should work without errors now!

## What This Migration Adds

### Task Creator Tracking
- `created_by` - Name of user who created the task
- `created_by_id` - ID of user who created the task (foreign key to users table)

**Benefit**: Task creators can now edit and delete their own tasks (not just admins)

### Billing Information
- `billing_fees` - Amount to charge for the task (in INR)
- `taxable_amount` - Taxable portion for GST calculation (in INR)
- `billing_description` - Description to include in the invoice

**Benefit**: Partners can properly specify billing details when sending tasks for billing

## Features Enabled After Migration

✅ **Task Creation** - Fully functional with creator tracking
✅ **Task Edit/Delete** - Creators can edit/delete their own tasks
✅ **Send for Billing** - Properly stores fees, taxable amount, and invoice description
✅ **Task Permissions** - Task creators have edit rights, not just admins

## Rollback (If Needed)
If something goes wrong, you can remove the columns:
```sql
ALTER TABLE tasks
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS created_by_id,
DROP COLUMN IF EXISTS billing_fees,
DROP COLUMN IF EXISTS taxable_amount,
DROP COLUMN IF EXISTS billing_description;
```

## Support
If you encounter any issues:
1. Check the browser console for detailed error messages
2. Check Supabase logs for database errors
3. Verify the columns were added correctly in Table Editor → tasks table
