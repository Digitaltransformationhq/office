# Troubleshooting Edit Button Not Visible

## Quick Checks

### 1. Open Browser Console (F12)
When you open the Task MIS page, check the console for:

**Expected Logs:**
```
TaskMIS - Current user: {id: "...", name: "...", role: "partner"}
TaskMIS - User role: partner
TaskMIS - isPartnerOrAdmin: true
TaskMIS - isAdmin: false
```

**For Each Task:**
```
Task task:xxx: {
  createdById: "user:10",
  userId: "user:10", 
  isMatch: true,
  isPartnerOrAdmin: true,
  shouldShowButtons: true
}
```

### 2. Check Your User Role
Edit buttons should show for:
- ✅ **Admin** - Always see edit buttons
- ✅ **Partner** - Always see edit buttons  
- ✅ **Staff/Accountant** - Only on tasks they created

**How to verify your role:**
1. Look in browser console for "User role: ..."
2. Check the sidebar - it shows your role below your name
3. Check the top of the page - should say "Task MIS" for admins/partners

### 3. Check Task Data
If `shouldShowButtons: false` in console:

**Possible Issues:**
1. **Role not recognized** - Check exact spelling of role
2. **created_by_id column missing** - Need to run database migration
3. **Tasks created before migration** - Old tasks won't have creator info

## Solutions

### Solution 1: Database Migration Not Run
If you see `createdById: undefined`:

1. Open Supabase SQL Editor
2. Run: `database-add-missing-columns.sql`
3. Refresh the page
4. Edit buttons should now appear for partners/admins

### Solution 2: Old Tasks (Created Before Migration)
Tasks created before adding `created_by_id` column will only show edit buttons for admins and partners, not for the original creator (since we don't know who created them).

**Fix:**
- Partners and admins should already see buttons
- If staff created the task, they won't see buttons (but partners/admins will)

### Solution 3: Role Name Mismatch
If console shows your role as something unexpected:

**Check:**
```javascript
// Valid role names that should work:
'admin' or 'Admin'      → Full access
'partner' or 'Partner'  → Full access
'team-member'           → Own tasks only
'team-leader'           → Own tasks only
```

If role is different, update the code in TaskMIS.tsx line 69:
```typescript
const isPartnerOrAdmin = user.role === 'partner' || 
                         user.role === 'admin' || 
                         user.role === 'Partner' || 
                         user.role === 'Admin' ||
                         user.role === 'YOUR_ROLE_HERE';
```

### Solution 4: CSS/Display Issue
The buttons might be there but hidden:

**Test:**
1. Right-click in the Actions column
2. Select "Inspect Element"
3. Look for button elements with "✏️ Edit"
4. Check if they have `display: none` or `visibility: hidden`

## Testing After Fix

### Test 1: Partner/Admin Login
1. Login as partner or admin
2. Go to Task MIS
3. Should see "✏️ Edit" and "🗑️ Delete" buttons on ALL tasks

### Test 2: Staff Login  
1. Login as staff member
2. Create a new task
3. Go to Task MIS
4. Should see "✏️ Edit" and "🗑️ Delete" buttons ONLY on task you just created

### Test 3: Old Tasks
1. Login as staff who created tasks before migration
2. Go to Task MIS
3. Old tasks won't show edit buttons (no creator info)
4. New tasks will show edit buttons

## Debug Output

### What Console Should Show (Partner/Admin)
```
TaskMIS - isPartnerOrAdmin: true

For every task:
Task task:xxx: {
  shouldShowButtons: true  ← This should be TRUE
}
```

### What Console Should Show (Staff)
```
TaskMIS - isPartnerOrAdmin: false

For their own task:
Task task:xxx: {
  createdById: "user:5",
  userId: "user:5",
  isMatch: true,
  shouldShowButtons: true  ← TRUE for their tasks
}

For other tasks:
Task task:yyy: {
  createdById: "user:3",
  userId: "user:5", 
  isMatch: false,
  shouldShowButtons: false  ← FALSE for others' tasks
}
```

## Still Not Working?

### Send This Info
If buttons still don't appear, check console and share:

1. **User Info:**
   - User role: ?
   - isPartnerOrAdmin: ?
   - isAdmin: ?

2. **Task Info (any one task):**
   - createdById: ?
   - shouldShowButtons: ?

3. **Browser:**
   - Chrome/Firefox/Safari/Edge
   - Version

4. **Screenshot:**
   - Task MIS page showing Actions column
   - Browser console showing the debug logs
