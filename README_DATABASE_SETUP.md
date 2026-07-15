# ⚠️ IMPORTANT: Database Setup Required

## 🚨 YOU MUST RUN THIS SQL BEFORE BILLING WILL WORK 🚨

The billing feature requires updating your database to allow "Billed" status.

### Quick Steps:

1. **Open Supabase**: https://supabase.com/dashboard/project/_/sql
2. **Copy the SQL below**
3. **Paste and Run** (Ctrl+Enter or Cmd+Enter)

### SQL to Run:

```sql
-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with "Pending for Billing" and "Billed" included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN (
    'Pending', 
    'In Progress', 
    'Completed', 
    'Overdue', 
    'Pending Approval', 
    'Pending for Billing', 
    'Billed'
  ));
```

### ✅ That's It!

After running this SQL:
- Refresh your application
- Try marking a task as billed again
- It will work! 🎉

---

## The Error You're Seeing:

```
Error code: 23514
new row for relation "tasks" violates check constraint "tasks_status_check"
```

This error means the database doesn't recognize "Billed" as a valid status. The SQL above fixes this.

---

## Need More Help?

See `/DATABASE_SETUP_INSTRUCTIONS.md` for detailed instructions with screenshots.

Or just **click the "Copy SQL Query" button** in the error modal that appears when you try to mark a task as billed.
