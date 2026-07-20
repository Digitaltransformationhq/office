# Task Creation Testing Guide

## Prerequisites
✅ Make sure you've run the SQL commands from `supabase/sql/schema.sql` in Supabase
✅ Verify tables exist in Supabase Dashboard > Table Editor

## Step-by-Step Test

### 1. Login as Partner
```
Email: apm@kapsca.in
Password: Pass@2026
```

### 2. Create a New Task

Click the **"+ New Task"** button (top right of dashboard)

Fill in the form:
- **Task Name**: Test GST Filing
- **Category**: GST
- **Client**: Search and select "ABC Enterprises" (or create new)
- **Assign To**: Search and select a staff member (e.g., "Harshangi Prajapati")
- **Priority**: High
- **Task Assignment Date**: Today's date
- **Expected Completion Date**: 3 days from now
- **Comments**: Test task for verification

Click **"Create Task"**

You should see:
✅ Success message: "Task 'Test GST Filing' assigned to Harshangi Prajapati successfully!"
✅ Modal closes
✅ Partner Dashboard refreshes automatically
✅ New task appears in "Pending Tasks" table

### 3. Verify in Partner Dashboard

Check that your new task appears with:
- Correct client name
- Correct assigned staff member
- Status: "Pending"
- Priority badge in orange/red

### 4. Login as Staff Member

Logout and login with the staff member you assigned:
```
Email: gst1@kapsca.in (Harshangi Prajapati)
Password: Pass@2026
```

### 5. Verify Task Appears in Staff Dashboard

You should see:
✅ The task you just created appears in "My Tasks" table
✅ KPI cards update (Active Tasks, Pending Tasks counts increase)
✅ Task shows correct details: client, category, priority, dates

### 6. Update Task Status

Click the **"Start"** button on the task

You should see:
✅ Status changes to "In Progress"
✅ "Start" button changes to "Complete" button
✅ Badge color changes from yellow to blue

Click **"Complete"** button

You should see:
✅ Status changes to "Completed"
✅ Button changes to "✓ Done" badge
✅ Badge color changes to green

### 7. Verify Updates in Partner Dashboard

Logout and login as Partner again:
```
Email: apm@kapsca.in
Password: Pass@2026
```

Check that:
✅ Task status is updated to "Completed"
✅ "Completed Tasks" KPI card count increased
✅ Task may move to "All Tasks" section

## Refresh Buttons

Every dashboard now has a **🔄 Refresh** button at the top right:
- Partner Dashboard: Top right corner
- Team Member Dashboard: Top right corner
- Team Leader Dashboard: Top right corner
- Admin Dashboard: Top right corner

Click refresh anytime to see the latest data from the database.

## Testing Multiple Staff Members

Try creating tasks for different staff:

1. **Krunal Roy** - caoffice@kapsca.in
2. **Anjali Vasava** - audit1@kapsca.in
3. **Ankit Patel** - advisory@kapsca.in

Each staff member should ONLY see tasks assigned to them.

## Testing Task Assignment to Partners

You can also assign tasks to Partners:

1. **Abhishek Patel** - apm@kapsca.in
2. **Brijesh Pitroda** - brijesh@kapsca.in

Partners assigned tasks should see them in their own dashboard.

## Common Issues & Solutions

### ❌ "Failed to create task"
**Solution**: 
- Check browser console (F12) for detailed error
- Verify you ran ALL SQL commands from supabase/sql/schema.sql
- Check that users table has data in Supabase

### ❌ Task not appearing for staff
**Solution**:
- Click the 🔄 Refresh button
- Verify the task was assigned to the correct user ID
- Check Supabase Table Editor > tasks table to see the raw data

### ❌ "No users found" in dropdown
**Solution**:
- Verify users table has data: Supabase > Table Editor > users
- Should have 12 users (1 Admin, 2 Partners, 9 Staff)

### ❌ "No clients found"
**Solution**:
- Create a new client using the "+ New Client" button
- Or verify clients table in Supabase has sample data

## Database Verification

### Check Tasks in Supabase

1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Select **tasks** table
4. You should see your newly created task with:
   - Unique task ID (e.g., task:1735123456789_abc123)
   - client field matching what you entered
   - assigned_to_id matching the staff member's user ID
   - status = "Pending" (or updated status if you changed it)

### Check Real-Time Updates

Open two browser windows side by side:
- Window 1: Login as Partner
- Window 2: Login as Staff member

When Partner creates/updates a task, Staff should see it immediately after clicking Refresh.

## Success Criteria

✅ Partner can create tasks
✅ Tasks appear in Partner dashboard immediately
✅ Staff sees assigned tasks in their dashboard
✅ Staff can update task status (Start/Complete)
✅ Status updates reflect in Partner dashboard
✅ All data comes from real PostgreSQL database (not dummy data)
✅ Multiple staff members see only their own tasks
✅ Refresh buttons work on all dashboards

## Next Steps

Once basic task creation works, you can:
- Add task editing functionality
- Add task deletion
- Add file attachments
- Add comments/notes on tasks
- Add email notifications
- Add task priority changes
- Add task reassignment
