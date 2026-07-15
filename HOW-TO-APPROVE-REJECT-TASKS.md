# 📋 HOW TO APPROVE/REJECT TASKS - STEP BY STEP

## For PARTNER/ADMIN

### Step 1: See Pending Tasks

On your **Partner Dashboard**, you'll see an orange card at the top:

```
┌─────────────────────────────────────┐
│ Pending Task Approvals              │
│ 3                                   │
│                                     │
│ [Review & Approve/Reject →]         │
│                          ↑          │
│                    CLICK THIS BUTTON│
└─────────────────────────────────────┘
```

### Step 2: Click "Review & Approve/Reject" Button

This opens a modal showing all pending tasks in a table.

### Step 3: Click "Review" on Any Task

Each task has a **"Review"** button in the Actions column. Click it.

### Step 4: Approve or Reject

You'll see a modal with task details and THREE options:

```
┌─────────────────────────────────────┐
│ Review Task                    [X]  │
├─────────────────────────────────────┤
│ Task: GST Filing for ABC Ltd        │
│ Created By: Priya Sharma            │
│ Assigned To: Rajesh Kumar           │
│ Client: ABC Enterprises             │
│ Priority: High                      │
│ Due Date: 30/04/2026                │
├─────────────────────────────────────┤
│                                     │
│ [Cancel] [✏️ Edit] [❌ Reject]      │
│          [✅ Approve]                │
│                 ↑                   │
│          CHOOSE ONE OF THESE        │
└─────────────────────────────────────┘
```

### Option A: APPROVE the task

1. Click **"✅ Approve"** button
2. Task status changes to **"Pending"**
3. Task is now assigned and visible to the assignee
4. ✅ Success toast: "Task approved and assigned to [Name]"

### Option B: EDIT then approve

1. Click **"✏️ Edit"** button
2. Modify task details (title, priority, due date, etc.)
3. Click **"Save & Approve"**
4. Task is updated AND approved
5. ✅ Success toast: "Task updated and approved successfully"

### Option C: REJECT the task

1. Click **"❌ Reject"** button
2. Modal shows a text field:
   ```
   ┌─────────────────────────────────────┐
   │ Rejection Reason *                  │
   │ ┌─────────────────────────────────┐ │
   │ │ Explain why this task is being  │ │
   │ │ rejected...                     │ │
   │ │                                 │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ [Back] [Confirm Rejection]          │
   └─────────────────────────────────────┘
   ```
3. Type rejection reason (REQUIRED)
4. Click **"Confirm Rejection"**
5. Task status changes to **"Rejected"**
6. ✅ Success toast: "Task rejected. [Creator] will be notified."

---

## For STAFF (Viewing Rejection)

When a partner rejects your task:

### You'll See a RED Warning Card

```
┌─────────────────────────────────────┐
│ ⚠️ Rejected Tasks (1)               │
├─────────────────────────────────────┤
│ Task Name: GST Filing for ABC Ltd   │
│ Client: ABC Enterprises             │
│ Rejection Reason:                   │
│   "Client has not provided PAN      │
│   card. Please collect document     │
│   first before creating this task." │
│ Rejected By: Partner Admin          │
│ Rejected At: 27/04/2026, 10:30 AM   │
└─────────────────────────────────────┘
```

### KPI Cards Updated

Your dashboard will show:

```
┌─────────────┬─────────────┬─────────────┐
│ Awaiting    │ In Progress │ Rejected    │
│ Approval    │             │             │
│     2       │      3      │      1      │
│    ⏳       │     🔄      │     ❌      │
└─────────────┴─────────────┴─────────────┘
```

---

## COMPLETE WORKFLOW EXAMPLE

### Scenario: Staff creates a task, Partner rejects it

1. **Staff (Priya):**
   - Clicks **"📋 Create Task"**
   - Fills form:
     - Task: "GST Filing for ABC Ltd"
     - Client: "ABC Enterprises"
     - Assigned To: "Rajesh Kumar"
     - Priority: High
     - Due Date: 30/04/2026
   - Clicks **"Create Task"**
   - ✅ Sees: "Task submitted for Partner approval!"

2. **System:**
   - Task created with status: **"Pending Approval"**
   - Partner dashboard counter increases: **"Pending Task Approvals: 1"**

3. **Partner (Admin):**
   - Sees orange card showing **"1"** pending task
   - Clicks **"Review & Approve/Reject"** button
   - Sees task in table
   - Clicks **"Review"** button
   - Reads task details
   - Notices: Client hasn't provided PAN card yet
   - Clicks **"❌ Reject"**
   - Types reason: "Client has not provided PAN card. Please collect document first."
   - Clicks **"Confirm Rejection"**
   - ✅ Sees: "Task rejected. Priya Sharma will be notified."

4. **Staff (Priya):**
   - Refreshes dashboard
   - Sees **RED WARNING CARD** at top: **"⚠️ Rejected Tasks (1)"**
   - Sees rejection reason from partner
   - Understands what to do: Collect PAN card first
   - Takes action: Gets PAN card from client
   - Creates new task after getting document

---

## KEYBOARD SHORTCUTS

- **ESC** key closes modal
- **Tab** navigates between buttons
- **Enter** submits rejection when typing reason

---

## VISUAL INDICATORS

### Status Badge Colors:

- **🟡 Orange - "Pending Approval"** = Waiting for partner review
- **🔵 Blue - "Pending"** = Approved, ready to start
- **🔵 Blue - "In Progress"** = Currently working
- **🟢 Green - "Completed"** = Done
- **🔴 Red - "Rejected"** = Partner rejected with reason

### Dashboard Indicators:

- **Orange border** on approval cards = Action required
- **Red border** on rejected tasks card = Attention needed
- **Number badges** show counts at a glance

---

## TROUBLESHOOTING

### "I don't see the Review button"

- Make sure you clicked **"Review & Approve/Reject"** button on the orange card
- Check that you're logged in as Partner or Admin (not Staff)
- Refresh the page (Ctrl+R)

### "I can't submit rejection without reason"

- This is intentional! Rejection reason is **required**
- Staff needs to know WHY their task was rejected
- Type at least a few words explaining the issue

### "Staff member can't see rejection reason"

- Make sure they refresh their dashboard
- Check that the task status is "Rejected" in database
- Rejected tasks appear in a separate RED card at the top

---

## DATABASE FIELDS USED

When you reject a task, these fields are saved:

```sql
status = 'Rejected'
rejection_reason = 'Your typed reason here'
approved_by = 'Partner Admin'
approved_by_id = 123
approved_at = '2026-04-27T10:30:00Z'
```

The staff member who created the task can see all this information.

---

## SUMMARY

✅ **Partner sees:** Orange card → Click button → Review → Approve/Edit/Reject
✅ **Staff sees:** Red warning card with rejection reason
✅ **Rejection requires:** Mandatory reason text
✅ **Both users see:** Real-time updates (auto-refresh every 5 seconds)

🎉 **The feature is fully functional and ready to use!**
