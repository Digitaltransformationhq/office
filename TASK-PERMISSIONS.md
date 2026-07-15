# Task Edit & Delete Permissions

## Overview
The system has three levels of users who can edit and delete tasks, each with specific reasons for needing these permissions.

## Who Can Edit/Delete Tasks?

### 1. **Admins** 👑
- **Permission**: Can edit/delete ANY task
- **Reason**: Full system access for management and troubleshooting
- **Use Cases**:
  - Fix system errors
  - Manage all organizational tasks
  - Handle escalated issues
  - System maintenance

### 2. **Partners** 🤝
- **Permission**: Can edit/delete ANY task
- **Reason**: Need to manage tasks they receive for approval
- **Use Cases**:
  - Modify task details before approving
  - Correct information in tasks submitted by staff
  - Delete duplicate or incorrect task submissions
  - Manage team workload by editing assignments

### 3. **Task Creators** ✍️
- **Permission**: Can edit/delete ONLY their own tasks
- **Reason**: Fix mistakes in tasks they created
- **Use Cases**:
  - Correct typos or wrong information immediately after creation
  - Delete accidentally created duplicate tasks
  - Update task details before they're assigned
  - Fix incorrect client or category selection

## Permission Matrix

| User Role | Can Edit Own Tasks | Can Edit Others' Tasks | Can Delete Own Tasks | Can Delete Others' Tasks |
|-----------|-------------------|----------------------|---------------------|------------------------|
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Partner** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Accountant** | ✅ Yes (own only) | ❌ No | ✅ Yes (own only) | ❌ No |
| **Staff** | ✅ Yes (own only) | ❌ No | ✅ Yes (own only) | ❌ No |
| **Client** | ❌ No | ❌ No | ❌ No | ❌ No |

## Implementation Details

### Code Location
- File: `src/app/components/TaskMIS.tsx`
- Lines: ~725-750 (Edit and Delete button visibility)

### Permission Check Logic
```typescript
// User can edit/delete if:
// 1. They are Partner OR Admin (isPartnerOrAdmin), OR
// 2. They created the task (task.createdById === user.id)
{(isPartnerOrAdmin || task.createdById === user.id) && (
  <Button onClick={() => handleEditClick(task)}>
    ✏️ Edit
  </Button>
)}
```

### Database Requirements
The `tasks` table must have:
- `created_by` - Text field storing creator's name
- `created_by_id` - Text field storing creator's user ID (foreign key to users table)

**Note**: Run `database-add-missing-columns.sql` if these columns don't exist.

## Security Considerations

### ✅ Secure
- Staff members cannot edit tasks created by others
- Task ownership is tracked at creation time
- Permissions are enforced on both frontend and backend
- Only authorized roles can see edit/delete buttons

### ⚠️ Important
- Task creators are identified by `created_by_id` field
- If this field is NULL, only admins/partners can edit the task
- Once a task is created, the creator ID cannot be changed

## Common Scenarios

### Scenario 1: Staff Creates Wrong Task
1. **Staff** creates a task with wrong client name
2. **Staff** sees Edit button (they created it)
3. **Staff** clicks Edit and fixes the client name
4. ✅ Task corrected without partner involvement

### Scenario 2: Partner Needs to Modify Before Approval
1. **Staff** submits task for partner approval
2. **Partner** reviews and sees issues with categorization
3. **Partner** sees Edit button (they have approval rights)
4. **Partner** edits category and approves
5. ✅ Task corrected and approved efficiently

### Scenario 3: Admin Cleanup
1. **Admin** identifies duplicate tasks in the system
2. **Admin** sees Edit/Delete on all tasks
3. **Admin** deletes duplicates
4. ✅ System cleaned up

### Scenario 4: Staff Tries to Edit Other's Task
1. **Staff A** creates a task
2. **Staff B** views the task in Task MIS
3. **Staff B** does NOT see Edit/Delete buttons (not their task)
4. ✅ Security maintained

## Future Enhancements

### Potential Additions
- **Audit Log**: Track who edited what and when
- **Edit History**: Keep versions of task changes
- **Time-Limited Edit**: Allow edits only within X hours of creation
- **Approval-Based Edit**: Require partner approval for edits after task acceptance
- **Role-Based Restrictions**: Different edit permissions for different task statuses

### Currently NOT Supported
- ❌ Shared ownership of tasks
- ❌ Delegated edit permissions
- ❌ Task transfer with edit rights
- ❌ Group-based permissions
