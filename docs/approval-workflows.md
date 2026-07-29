# 🎯 NEW APPROVAL WORKFLOWS IMPLEMENTED

## Overview

Two core approval workflows have been added to KAPS & Co. Office Management System:

1. **Task Management with Partner Approval**
2. **Client Inquiry Management with Conversion Workflow**

---

## 💬 THE APPROVAL THREAD

Every task carries a conversation, and it is the same conversation from the
moment work is submitted to the moment Accounts raises the invoice. It survives
any number of send-and-resubmit rounds.

### The loop

```
member finishes work
      │  Mark Done → writes a note: what was delivered, what to bill for
      ▼
Pending Approval - Completion
      │  the approver reads the thread, sets the billing amount
      ├─────────────── Approve ──────────► Pending for Billing ──► Billed
      │                (note optional, and Accounts sees the whole thread)
      │
      └── Request Changes (note REQUIRED)
                    │
                    ▼
              In Progress, flagged "returned for correction"
                    │  the member sees exactly what was asked for
                    │  Redo & Resubmit → note REQUIRED: what changed
                    ▼
      Pending Approval - Completion  (round 2, and the approver is told so)
```

The same applies at the new-task gate: a task refused before work starts goes
back to the person who raised it with a reason, and their edit-and-resubmit can
answer in the thread.

### Where the thread appears

| Screen | Who | What they can do |
| --- | --- | --- |
| Submit for Approval | assignee | Write the note that goes with the work; read prior rounds |
| Review Task | approver | Read the thread; approve with a note, or send back with a required one |
| Approval thread (💬 on any task row) | anyone who can see the task | Read it, add a plain comment |
| Mark as Billed | Accounts | Read it, before pricing the invoice |
| Edit Task (on a resubmission) | assignee | See what was asked for; answer it |

### Why a note is required to send work back

Sending work back used to write `[Rejected by <name> on <date>]` with no reason
at all. The person receiving it learned only that it had been refused and had to
go and ask why. "Request Changes" now stays disabled until something is written,
and that text is shown to the assignee on their dashboard without them opening
anything.

### What is stored where

- `task_comments` — one row per message: author, role, kind
  (`submission` / `change_request` / `approval` / `note`), text, timestamp. This
  is the record.
- `tasks.changes_requested_at / _by / _note` — a mirror of the latest **open**
  change request, so a dashboard listing every task can flag "you are being
  waited on" without a request per row. Cleared the moment the work is
  resubmitted.
- `tasks.revision_count` — how many times the work has come back. Shown to the
  approver as "sent back 2× before".

Run `supabase/sql/add-task-comments.sql` before using any of this. See
[Database setup](database-setup.md) for what degrades if you do not.

---

## 📋 MODULE 1: TASK MANAGEMENT WITH APPROVAL FLOW

### How It Works

**For Staff Members:**
1. Click "Create Task" button
2. Fill in task details (Title, Description, Client, Priority, Due Date, Assign To)
3. Click "Submit"
4. **Status: "Pending Approval"** → Task sent to Partner Dashboard
5. Task NOT visible in "My Tasks" until approved

**For Partners:**
1. See "Pending Task Approvals" count in dashboard
2. Click "View All" to open Task Approval Queue
3. Review each task with full details
4. Three options:
   - **✅ Approve** → Task moves to "My Tasks" for assigned person
   - **✏️ Edit** → Modify task details then approve
   - **❌ Reject** → Provide reason, staff member notified

**Auto-Approval for Partners:**
- When a Partner creates a task
- Status automatically set to "Pending" (approved)
- No approval step needed
- Directly visible in assignee's "My Tasks"

### Component Files

```
src/app/components/
├── CreateTaskModal.tsx (READY - needs current user props)
├── TaskApprovalQueue.tsx (NEW - built)
└── ReviewTaskModal.tsx (NEW - built)
```

### API Endpoints

```typescript
// Task Status Values:
"Pending Approval" - Staff created, awaiting partner review
"Pending" - Approved and assigned
"In Progress" - Work started
"Completed" - Task finished
"Rejected" - Partner rejected with reason
```

### UI Flow

```
STAFF WORKFLOW:
Create Task → Fill Form → Submit
    ↓
Status: "Pending Approval"
    ↓
Partner Dashboard (Notification)

PARTNER WORKFLOW:
Dashboard → Pending Approvals (Orange Badge)
    ↓
Click "Review" → See Full Details
    ↓
Choose: Approve / Edit / Reject
    ↓
If Approved → Task moves to "My Tasks" for assignee
If Rejected → Staff notified with reason
```

---

## 📨 MODULE 2: CLIENT INQUIRY MANAGEMENT

### How It Works

**Staff Workflow - Submit Inquiry:**
1. Click "New Inquiry" button
2. Fill simple form:
   - Client Name (required)
   - Company Name (optional)
   - Mobile Number (required, validated)
   - Email ID (optional, validated)
   - Type of Work (dropdown)
   - Notes/Description
3. Click "Submit to Partner"
4. **Status: "Pending Review"**
5. Inquiry sent to Partner Dashboard

**Partner Workflow - Review & Convert:**
1. See "Pending Inquiry Approvals" in dashboard
2. Click "Review" on any inquiry
3. Three options:
   - **✅ Approve & Convert to Client**
     - Creates new client in Client Master
     - Pre-fills all inquiry data
     - Shows success message
     - Option to "Create Task" immediately
   - **✏️ Edit Inquiry**
     - Modify any field
     - Save changes
     - Then approve
   - **❌ Reject**
     - Provide reason
     - Staff notified

### Component Files

```
src/app/components/
├── CreateInquiryModal.tsx (NEW - built)
├── InquiryApprovalQueue.tsx (NEW - built)
└── ReviewInquiryModal.tsx (NEW - built)
```

### API Endpoints

```typescript
POST   /api/inquiries - Create new inquiry
GET    /api/inquiries/pending - Get pending reviews
GET    /api/inquiries - Get all inquiries
PUT    /api/inquiries/:id - Update inquiry details
PUT    /api/inquiries/:id/status - Approve/Reject
```

### Database Schema

```sql
-- Client Inquiries Table
CREATE TABLE client_inquiries (
    id BIGSERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    company_name TEXT,
    mobile_number TEXT NOT NULL,
    email TEXT,
    work_type TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pending Review',
    submitted_by TEXT NOT NULL,
    submitted_by_id BIGINT,
    reviewed_by TEXT,
    reviewed_by_id BIGINT,
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Work Type Options

- GST Filing
- Audit
- Income Tax
- Company Registration
- TDS Returns
- PF/ESIC Returns
- Accounting Services
- Consultancy
- Others

### UI Flow

```
STAFF WORKFLOW:
New Inquiry → Fill Form → Submit
    ↓
Status: "Pending Review"
    ↓
Partner Dashboard (Notification)

PARTNER WORKFLOW:
Dashboard → Inquiry Approvals (Orange Badge)
    ↓
Click "Review" → See Full Details
    ↓
Choose: Approve / Edit / Reject
    ↓
If Approved:
    1. Inquiry → Client Master (auto-created)
    2. Status: "Approved"
    3. Success screen
    4. Button: "Create Task" (redirects to task creation)

If Rejected:
    1. Enter reason
    2. Status: "Rejected"
    3. Staff notified
```

---

## 🎨 UI/UX DESIGN PATTERNS

### Status Badges

```typescript
"Pending Approval" → Orange badge 🟠
"Pending Review" → Orange badge 🟠
"Approved" → Green badge 🟢
"Rejected" → Red badge 🔴
"Pending" → Blue badge 🔵
"In Progress" → Blue badge 🔵
"Completed" → Green badge 🟢
```

### Dashboard Widgets

**Partner Dashboard:**
```
┌─────────────────────────┐
│ Pending Task Approvals  │
│         12              │
│     📋                  │
└─────────────────────────┘

┌─────────────────────────┐
│ Pending Inquiries       │
│          5              │
│     📨                  │
└─────────────────────────┘
```

### Notification System

- Toast notifications for all actions
- Real-time badge counts
- Auto-refresh every 5 seconds
- Success/Error feedback

---

## 🔧 INTEGRATION REQUIRED

To activate these workflows, you need to:

### 1. Update Dashboard Components

**AdminDashboard.tsx** (for Partners):
```typescript
import { TaskApprovalQueue } from './TaskApprovalQueue';
import { InquiryApprovalQueue } from './InquiryApprovalQueue';

// Add summary cards
<Card onClick={() => setShowTaskApprovals(true)}>
  <p>Pending Task Approvals: {pendingTaskCount}</p>
</Card>

<Card onClick={() => setShowInquiryApprovals(true)}>
  <p>Pending Inquiries: {pendingInquiryCount}</p>
</Card>

// Add modals
{showTaskApprovals && (
  <TaskApprovalQueue userId={user.id} userName={user.name} />
)}

{showInquiryApprovals && (
  <InquiryApprovalQueue userId={user.id} userName={user.name} />
)}
```

**TeamMemberDashboard.tsx** (for Staff):
```typescript
import { CreateInquiryModal } from './CreateInquiryModal';

// Add button
<Button onClick={() => setShowCreateInquiry(true)}>
  📨 New Inquiry
</Button>

// Add modal
{showCreateInquiry && (
  <CreateInquiryModal
    currentUserId={user.id}
    currentUserName={user.name}
    onClose={() => setShowCreateInquiry(false)}
    onSuccess={loadData}
  />
)}
```

### 2. Run Database Migration

```bash
# In Supabase SQL Editor, run:
database-inquiry-system.sql
```

This creates the `client_inquiries` table.

### 3. Deploy Edge Function

The inquiry endpoints have been added to `/supabase/functions/server/index.tsx`.

After reconnecting Supabase, deploy the function to activate the API.

---

## 📊 EXPECTED USER EXPERIENCE

### Staff Member Experience

1. **Create Task:**
   - Fill simple form
   - Submit
   - See "Submitted for approval" toast
   - Task NOT in their list yet

2. **Submit Inquiry:**
   - Fill client details
   - Click "Submit to Partner"
   - See "Submitted for review" toast
   - Can track status

### Partner Experience

1. **Dashboard:**
   - See two orange badges with counts
   - "12 Pending Task Approvals"
   - "5 Pending Inquiries"

2. **Review Tasks:**
   - Click badge → See list
   - Click "Review" → See full details
   - Approve with one click OR
   - Edit fields then approve OR
   - Reject with reason

3. **Review Inquiries:**
   - Click badge → See list
   - Click "Review" → See full details
   - Approve → Auto-creates client
   - Success screen → "Create Task" button
   - Seamless workflow

---

## ✅ BENEFITS

### For Staff
- ✅ No confusion about task authority
- ✅ Clear submission workflow
- ✅ Partner oversight ensures quality
- ✅ Easy inquiry capture

### For Partners
- ✅ Full control before commitments
- ✅ Quick review process
- ✅ Edit capability before approval
- ✅ Reason tracking for rejections
- ✅ Seamless client conversion

### For Firm
- ✅ Quality control on all tasks
- ✅ Proper inquiry tracking
- ✅ No unauthorized client additions
- ✅ Clear audit trail
- ✅ Professional workflow

---

## 🚀 NEXT STEPS

1. **Fix Supabase 403 Error:**
   - Reconnect Supabase in Figma Make
   - Deploy Edge Function

2. **Run Database Migration:**
   - Execute `database-inquiry-system.sql`
   - Creates client_inquiries table

3. **Test Workflows:**
   - Login as Staff → Create task → Check status
   - Login as Partner → See pending → Approve
   - Login as Staff → Submit inquiry
   - Login as Partner → Approve → See new client

4. **Optional Enhancements:**
   - Email notifications on approval/rejection
   - WhatsApp notifications
   - Inquiry analytics
   - Conversion tracking reports

---

## 📝 TECHNICAL NOTES

### Task Status Logic

```typescript
// In CreateTaskModal
const isPartner = currentUserRole === 'Partner' || currentUserRole === 'Admin';
const status = isPartner ? 'Pending' : 'Pending Approval';
```

### Inquiry to Client Conversion

```typescript
// In ReviewInquiryModal.handleApproveAndConvert()
1. Update inquiry status to "Approved"
2. Create new client with:
   - name = inquiry.clientName
   - firmName = inquiry.companyName
   - contact = inquiry.mobileNumber
   - email = inquiry.email
   - industry = inquiry.workType
   - status = "Active"
3. Show success screen
4. Offer "Create Task" button
```

### Database Queries

```typescript
// Get pending tasks
tasks.filter(task => task.status === 'Pending Approval')

// Get pending inquiries
client_inquiries.filter(inquiry => inquiry.status === 'Pending Review')
```

---

## 🎯 COMPLETION STATUS

✅ Task Approval Components Built
✅ Inquiry Management Components Built
✅ Review Modals with Actions Built
✅ Server API Endpoints Added
✅ Database Schema Created
✅ Toast Notifications Integrated
✅ Validation Logic Implemented
✅ Status Badges Configured

**Ready for deployment after Supabase reconnection!**
