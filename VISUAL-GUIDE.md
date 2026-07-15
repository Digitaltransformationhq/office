# 👀 VISUAL GUIDE - What You Should See

## 🎯 PARTNER/ADMIN DASHBOARD

### ✅ CORRECT (Working):

```
┌──────────────────────────────────────────────────────────┐
│  Admin Dashboard                                         │
│  System management and configuration                     │
└──────────────────────────────────────────────────────────┘

┌───────────────────────────┐  ┌───────────────────────────┐
│                           │  │                           │
│ Pending Task Approvals    │  │ Pending Inquiries         │
│ 3                         │  │ 0                         │
│      📋                   │  │      📨                   │
│                           │  │                           │
│ Click to review →         │  │ Click to review →         │
└───────────────────────────┘  └───────────────────────────┘
    ↑ ORANGE/YELLOW COLOR         ↑ ORANGE/YELLOW COLOR
    ↑ CLICKABLE CARD               ↑ CLICKABLE CARD
```

### ❌ WRONG (Not working):

```
If you DON'T see these two cards at the top,
something is wrong with the integration.
```

---

## 🎯 STAFF/TEAM MEMBER DASHBOARD

### ✅ CORRECT (Working):

```
┌──────────────────────────────────────────────────────────┐
│  Team Member Dashboard         [📨 New Inquiry]  ← BUTTON│
│  Your tasks and performance                              │
└──────────────────────────────────────────────────────────┘
                                      ↑
                                      └─ YOU SHOULD SEE THIS
```

### ❌ WRONG (Not working):

```
If you DON'T see the "New Inquiry" button in top right,
the integration is incomplete.
```

---

## 🎯 WHEN YOU CLICK "PENDING TASK APPROVALS"

### ✅ CORRECT (Working):

```
┌─────────────────────────────────────────────────────────┐
│ Task Approval Queue                               [✕]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Pending Task Approvals                          │   │
│ │ 3                                               │   │
│ │      📋                                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tasks Awaiting Approval                                │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Task Title | Created By | Assigned To | Client  │   │
│ ├─────────────────────────────────────────────────┤   │
│ │ GST Filing | Rajesh     | Priya      | ABC Ltd  │   │
│ │                                   [Review] ←BUTTON│   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### ❌ WRONG (Not working):

```
If clicking the card does NOTHING or shows an error,
check browser console (F12) for error messages.
```

---

## 🎯 WHEN YOU CLICK "NEW INQUIRY" (Staff)

### ✅ CORRECT (Working):

```
┌──────────────────────────────────────┐
│ New Client Inquiry            [✕]   │
├──────────────────────────────────────┤
│                                      │
│ Client Name *                        │
│ [____________________________]       │
│                                      │
│ Company Name                         │
│ [____________________________]       │
│                                      │
│ Mobile Number *    Email ID          │
│ [____________]    [____________]     │
│                                      │
│ Type of Work Required *              │
│ [▼ GST Filing        ]               │
│                                      │
│ Notes / Description                  │
│ [____________________________]       │
│ [____________________________]       │
│                                      │
│ ℹ️ Note: This inquiry will be sent  │
│ to Partner for review before         │
│ converting to a client.              │
│                                      │
│         [Cancel] [Submit to Partner] │
└──────────────────────────────────────┘
```

---

## 🎯 WHEN PARTNER REVIEWS AN INQUIRY

### ✅ CORRECT (Working):

```
┌─────────────────────────────────────────────┐
│ Review Client Inquiry               [✕]    │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ Client Name    | Rajesh Kumar       │   │
│ │ Company Name   | Kumar Traders      │   │
│ │ Mobile Number  | 9876543210         │   │
│ │ Email ID       | rajesh@kumar.com   │   │
│ │ Work Type      | GST Filing         │   │
│ │ Submitted By   | Priya (Staff)      │   │
│ │ Submitted On   | 27/04/2026         │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ [Cancel] [✏️ Edit] [❌ Reject]              │
│          [✅ Approve & Convert to Client]   │
│                ↑                            │
│                └─ CLICKING THIS CREATES     │
│                   NEW CLIENT AUTOMATICALLY  │
└─────────────────────────────────────────────┘
```

---

## 🎯 AFTER APPROVING INQUIRY

### ✅ CORRECT (Working):

```
┌──────────────────────────────────────┐
│ ✅ Client Created Successfully       │
├──────────────────────────────────────┤
│                                      │
│ Rajesh Kumar has been added to      │
│ your client master.                  │
│                                      │
│ You can now create tasks and manage  │
│ billing for this client.             │
│                                      │
│              [Done] [Create Task]    │
│                         ↑            │
│                         └─ OPTIONAL  │
└──────────────────────────────────────┘
```

---

## 🧪 QUICK VISUAL TEST

### 1. LOGIN AS PARTNER/ADMIN

**Look for:**
- [ ] Two large orange cards at top of dashboard
- [ ] One says "Pending Task Approvals"
- [ ] One says "Pending Inquiries"
- [ ] Cards show numbers (count)
- [ ] Cards say "Click to review →"

### 2. LOGIN AS STAFF

**Look for:**
- [ ] Button in top right: "📨 New Inquiry"
- [ ] Button is blue/primary color
- [ ] Clicking opens a modal form

### 3. CLICK APPROVAL CARD

**Should happen:**
- [ ] Modal/overlay appears
- [ ] Shows table with pending items
- [ ] Each row has "Review" button
- [ ] X button in top right to close

---

## ❌ COMMON VISUAL PROBLEMS

### Problem: Can't see approval cards on Partner dashboard

**Check:**
- Are you logged in as Partner or Admin?
- Try refreshing page (Ctrl+R)
- Try hard refresh (Ctrl+Shift+R)
- Check if cards are below the fold (scroll down)

### Problem: "New Inquiry" button missing on Staff dashboard

**Check:**
- Are you logged in as Staff/Team Member?
- Check top right corner of screen
- Try logging out and back in
- Clear browser cache

### Problem: Clicking approval card does nothing

**Check:**
- Open browser console (F12)
- Look for red error messages
- Send error message to developer

### Problem: Modal appears but is empty/blank

**Check:**
- API endpoints might be failing
- Edge Function might not be deployed
- Database table might be missing
- Check browser console for errors

---

## ✅ SUCCESS INDICATORS

You'll know it's working when:

1. **Visual:**
   - ✅ Orange approval cards visible
   - ✅ "New Inquiry" button visible
   - ✅ Numbers show on cards

2. **Functional:**
   - ✅ Cards are clickable
   - ✅ Modals open on click
   - ✅ Forms submit successfully
   - ✅ Green toast notifications appear

3. **Data:**
   - ✅ Inquiries appear in approval queue
   - ✅ Approving creates new client
   - ✅ New client visible in Client Master

---

## 📸 TAKE SCREENSHOTS

If something looks wrong:

1. **Press F12** → Open console
2. **Take screenshot** of:
   - The dashboard view
   - The browser console
   - Any error messages
3. **Send to developer** with description

This helps diagnose issues much faster!

---

**Remember:** Visual problems usually mean:
- Components not integrated properly ✅ FIXED
- User not logged in as correct role
- Browser cache needs clearing
- API endpoints not working → Need deployment
