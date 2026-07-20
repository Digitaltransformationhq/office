# 📋 Task Reassignment System - Complete Guide

## Overview

The task reassignment feature is now **integrated directly into the Task tab**. Staff members can reassign tasks to other team members when they need help or someone is unavailable. All reassignments require acceptance and partners are automatically notified.

---

## 🎯 How It Works

### **Workflow:**

1. **Partner assigns task** to Staff A
2. **Staff A receives task** (automatically accepted)
3. If Staff A needs help:
   - Staff A clicks **"📤 Reassign"** button
   - Selects another staff member (Staff B)
   - Adds optional reason
   - Clicks "Reassign Task"
4. **Staff B receives task** with "Pending Acceptance" status
5. **Staff B must Accept or Reject**
6. **Partners are notified** at each step:
   - When task is reassigned
   - When task is accepted
   - When task is rejected

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open file: `database-task-reassignment-update.sql`
3. Copy all SQL code
4. Paste in SQL Editor
5. Click **RUN**

**You'll see:**
```
✅ TASK REASSIGNMENT SYSTEM READY!
✓ Tasks table updated with reassignment columns
✓ Partner notification trigger created
✓ Indexes created for performance
```

### Step 2: Verify the System

The code is already deployed. After running the database migration, the system is ready to use!

---

## 📱 User Interface

### **Where to Find It:**

#### All users see: "📋 Tasks" in sidebar
- This is the **Task MIS** page
- Shows all tasks assigned to you (or all tasks if you're a partner/admin)
- Contains reassignment functionality built-in

#### **No separate tab!**
- ❌ No "My Assignments" tab
- ✅ Everything is in the Task tab

---

## 🔄 Task Assignment Status Flow

### **Status Options:**

```
1. Accepted (default for new partner-assigned tasks)
   ↓
2. Staff reassigns → Pending Acceptance
   ↓
3a. New staff Accepts → Accepted
3b. New staff Rejects → Rejected
```

### **Status Meanings:**

| Status | Description | Available Actions |
|--------|-------------|-------------------|
| **Accepted** | Task is accepted and ready to work on | Start, Reassign, Complete |
| **Pending Acceptance** | Waiting for new assignee to accept | Accept, Reject (for assignee only) |
| **Rejected** | Assignee declined the task | None (returns to previous assignee) |

---

## 📊 Database Schema Updates

### **New Columns in `tasks` Table:**

| Column | Type | Description |
|--------|------|-------------|
| originally_assigned_by_id | TEXT | Partner who originally assigned |
| originally_assigned_by_name | TEXT | Partner's name |
| reassigned_from_id | TEXT | Who reassigned this task |
| reassigned_from_name | TEXT | Reassigner's name |
| assignment_status | TEXT | Pending Acceptance / Accepted / Rejected |
| rejection_reason | TEXT | Why task was rejected |
| reassigned_at | TIMESTAMP | When reassigned |

### **Key Points:**

- All existing tasks automatically get `assignment_status = 'Accepted'`
- Foreign key constraints ensure data integrity
- Triggers automatically notify partners

---

## 🧪 Testing Guide

### Test 1: View Tasks

**Login as:** Any staff member (e.g., `caoffice@kapsca.in`)

1. Click "📋 Tasks" in sidebar
2. ✅ **Expected:** See tasks assigned to you
3. ✅ **Expected:** See summary cards (Total, Pending Acceptance, Completed, Pending)

### Test 2: Reassign a Task

**Still logged in as staff:**

1. Find a task that's already accepted
2. Click "📤 Reassign" button
3. Fill in:
   - Select another team member
   - Add reason (optional): "Need help with this"
4. Click "Reassign Task"
5. ✅ **Expected:** Success message
6. ✅ **Expected:** Task disappears from your list (now assigned to other person)

### Test 3: Accept Reassigned Task

**Login as:** The user you reassigned to

1. Click "📋 Tasks" in sidebar
2. ✅ **Expected:** See task with "Pending Acceptance" badge (yellow)
3. ✅ **Expected:** "Pending Acceptance" summary card shows 1
4. Click "✓ Accept" button
5. ✅ **Expected:** Success message "Task accepted! Partners have been notified"
6. ✅ **Expected:** Status changes to "Accepted" (green)
7. ✅ **Expected:** Now you can work on it or reassign again

### Test 4: Reject Reassigned Task

**Create another reassignment and login as receiver:**

1. Go to "📋 Tasks"
2. Find task with "Pending Acceptance" status
3. Click "✗ Reject" button
4. Enter reason: "Already too busy"
5. ✅ **Expected:** Task status changes to "Rejected"
6. ✅ **Expected:** Task goes back to previous assignee
7. ✅ **Expected:** Partners notified with rejection reason

### Test 5: Partner Notification Verification

**Login as:** Partner (e.g., `apm@kapsca.in`)

1. Check notifications table in Supabase:
```sql
SELECT * FROM notifications 
WHERE user_id = 'user:10' 
ORDER BY created_at DESC 
LIMIT 10;
```

2. ✅ **Expected:** See notifications for:
   - Task reassigned
   - Task accepted
   - Task rejected (if applicable)

### Test 6: Original Assigner Tracking

**Test the full chain:**

1. Partner assigns task to Staff A
2. Staff A reassigns to Staff B
3. Staff B accepts
4. Check database:
```sql
SELECT 
  task,
  assigned_to,
  originally_assigned_by_name,
  reassigned_from_name,
  assignment_status
FROM tasks
WHERE id = 'task-id';
```

5. ✅ **Expected:** 
   - `assigned_to` = Staff B
   - `originally_assigned_by_name` = Partner's name
   - `reassigned_from_name` = Staff A's name
   - `assignment_status` = Accepted

### Test 7: Filter Functionality

**In Tasks page:**

1. Click "All" → See all tasks
2. Click "Pending Acceptance" → See only tasks waiting for your acceptance
3. Click "Pending" → See tasks not completed yet
4. Click "Completed" → See completed tasks
5. ✅ **Expected:** Filtering works correctly

---

## 🎨 UI Components Updated

### **TaskMIS Component**
**File:** `src/app/components/TaskMIS.tsx`

**New Features:**
- ✅ Shows "Assignment Status" badge column
- ✅ "Accept" and "Reject" buttons for pending tasks
- ✅ "Reassign" button for accepted tasks
- ✅ "Pending Acceptance" filter tab
- ✅ Shows who reassigned the task (under task name)
- ✅ Shows original assigner if chain exists
- ✅ Rejection reason displayed

### **ReassignTaskModal Component**
**File:** `src/app/components/ReassignTaskModal.tsx`

**Features:**
- ✅ Shows task details (client, task name, category, priority)
- ✅ User dropdown (excludes current user)
- ✅ Optional reason textarea
- ✅ Info box explaining workflow
- ✅ Confirmation before reassigning

### **Removed Components:**
- ❌ `PendingAssignments.tsx` (functionality merged into TaskMIS)
- ❌ `AssignTaskModal.tsx` (reassignment uses ReassignTaskModal)
- ❌ "My Assignments" menu item from Sidebar

---

## 🔔 Notifications for Partners

Partners receive automatic notifications for:

### 1. **Task Reassigned:**
> **Task Reassigned**  
> John reassigned "Prepare ITR for ABC" (Client: ABC Enterprises) to Mary

### 2. **Task Accepted:**
> **Task Assignment Accepted**  
> Mary accepted the task "Prepare ITR for ABC" (Client: ABC Enterprises)

### 3. **Task Rejected:**
> **Task Assignment Rejected**  
> Mary rejected the task "Prepare ITR for ABC" (Client: ABC Enterprises). Reason: Already too busy

**Who Gets Notified:**
- ✅ All partners (role = 'partner' or 'admin')
- ✅ The person who originally assigned the task
- ✅ The person who reassigned the task (if different from original)

---

## ✅ Complete Test Checklist

- [ ] Database migration runs successfully
- [ ] Tasks page shows "Assignment Status" column
- [ ] "Pending Acceptance" filter tab appears
- [ ] Can see "Reassign" button on accepted tasks
- [ ] Can reassign task to another user
- [ ] Reassigned user sees "Pending Acceptance" status
- [ ] Can accept reassigned task
- [ ] Can reject reassigned task with reason
- [ ] Partners receive notifications in database
- [ ] Original assigner tracked correctly
- [ ] Reassignment chain visible in task details
- [ ] Filter tabs work (All/Pending Acceptance/Pending/Completed)
- [ ] Summary cards show correct counts
- [ ] Staff can only see their own tasks
- [ ] Partners can see all tasks
- [ ] Cannot reassign to yourself (not in dropdown)

---

## 🔐 Security & Permissions

### **Who Can Reassign:**
- ✅ Any staff member can reassign tasks assigned TO them
- ✅ Cannot reassign tasks assigned to others
- ✅ Cannot reassign to yourself
- ✅ Cannot reassign completed tasks

### **Who Can Accept/Reject:**
- ✅ Only the assigned user can accept/reject
- ✅ Only tasks with "Pending Acceptance" status

### **Data Visibility:**
- ✅ Staff see only their own tasks
- ✅ Partners/Admin see all tasks
- ✅ Database-level foreign key constraints

---

## 🚨 Troubleshooting

### Task not showing after reassignment:
**Solution:**
- Check database: `SELECT * FROM tasks WHERE id = 'task-id'`
- Verify `assigned_to_id` matches the new user's ID
- Check `assignment_status` is set correctly

### Partner not receiving notifications:
**Solution:**
- Check notifications table: `SELECT * FROM notifications WHERE assignment_id = 'task-id'`
- Verify trigger fired: Check PostgreSQL logs
- Ensure user role is 'partner' or 'admin'

### Cannot see Reassign button:
**Solution:**
- Check task `assignment_status` is 'Accepted'
- Verify task status is not 'Completed'
- Ensure `assigned_to_id` matches current user

### Accept button not appearing:
**Solution:**
- Verify task `assignment_status` = 'Pending Acceptance'
- Check `assigned_to_id` matches current user ID
- Refresh the page

---

## 🎯 Key Differences from Previous System

| Aspect | OLD (Separate Tab) | NEW (Integrated) |
|--------|-------------------|------------------|
| **Location** | Separate "My Assignments" tab | Integrated in "Tasks" tab |
| **Workflow** | Partner assigns → Accept/Reject | Partner assigns → Auto-accepted, Staff can reassign |
| **Database** | Separate `task_assignments` table | Uses existing `tasks` table |
| **UI** | Two separate pages | One unified page |
| **Assignment** | Via "Assign Task" button | Via "Reassign" button on existing tasks |
| **Tracking** | Only last assignment | Full chain (original + reassignment) |

---

## 📝 Summary

**The New Integrated System:**

✅ Uses the same `tasks` table  
✅ Tasks automatically accepted when partner assigns  
✅ Staff can reassign when needed  
✅ Reassigned tasks require acceptance  
✅ Partners notified throughout the process  
✅ Complete reassignment chain tracked  
✅ Everything accessible from "Tasks" tab  
✅ No separate "My Assignments" section  

**All functionality is in one place: the Tasks tab!**

---

## 🚀 Ready to Deploy

1. ✅ Run `database-task-reassignment-update.sql`
2. ✅ Test with multiple users
3. ✅ Verify partner notifications
4. ✅ Start using the reassignment workflow!

**System is production-ready!**
