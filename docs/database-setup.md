# Database Setup Instructions

## Required: Task Status Constraint Update

Before you can use the billing workflow (Pending for Billing → Billed), you MUST run the SQL migration to update the database constraint.

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to: **SQL Editor** → **New Query**

2. **Run the Migration SQL**
   - Copy the contents of `/fix-task-status-constraint.sql` file
   - Paste into the SQL Editor
   - Click **Run** or press `Ctrl/Cmd + Enter`

3. **Verify Success**
   - You should see a success message
   - The constraint will now allow "Pending for Billing" and "Billed" statuses

### What This Does:

The migration updates the `tasks` table to allow two new status values:
- **"Pending for Billing"** - Tasks that are completed and ready to be billed
- **"Billed"** - Tasks that have been invoiced/billed to the client

### If You Skip This Step:

You will see database errors when trying to:
- Mark completed tasks as "Pending for Billing" 
- Mark tasks as "Billed" from the Accounts Dashboard
- The error will mention constraint violations or invalid status values

### SQL Migration Code:

```sql
-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with "Pending for Billing" and "Billed" included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Pending Approval', 'Pending for Billing', 'Billed'));

-- Verify the constraint was added successfully
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'tasks_status_check';
```

### After Running the Migration:

1. Refresh your application
2. Navigate to the Accounts Dashboard
3. You should now be able to mark completed tasks as "Pending for Billing"
4. Partners can then mark these tasks as "Billed" and create billing records

---

## Troubleshooting

If you still see errors after running the migration:

1. **Check the server logs** in your browser console - they now include detailed error information
2. **Verify the constraint** was updated by running the verification query
3. **Try a test task** - create a new task, complete it, and try marking it as billed

The error messages have been enhanced to show:
- Exact error message from the database
- Error code
- Detailed information about what went wrong
- Hints for fixing the issue
