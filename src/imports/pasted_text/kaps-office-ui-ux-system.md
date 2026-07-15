=== PROMPT START ===

You are a senior product designer and UX architect.

Design a **production-grade, enterprise SaaS UI/UX system** for a web-based application:

**Product Name:** KAPS & Co. Office Management System
**Industry:** Chartered Accountant Firm (India)
**Location Context:** Vadodara, Gujarat, India

---

## 🎯 DESIGN GOAL

Create a **clean, professional, data-heavy yet intuitive interface** suitable for finance professionals.

Tone:

* Corporate
* Minimal
* High trust
* No flashy UI
* No unnecessary decoration

---

## 🎨 DESIGN SYSTEM

### Color Palette

* Primary: Navy Blue (#0B1F3A)
* Secondary: White (#FFFFFF)
* Neutral: Grey scale (#F5F7FA, #D1D5DB, #6B7280, #111827)
* Accent: Gold (#C8A951)
* Status Colors:

  * Success: Green (#10B981)
  * Warning: Orange (#F59E0B)
  * Danger: Red (#EF4444)
  * Info: Blue (#3B82F6)

### Typography

* Font: Inter / Poppins (modern sans-serif)
* Headings: Bold
* Body: Regular
* Data Tables: Medium weight for readability

---

## 🧱 CORE LAYOUT STRUCTURE

### Global Layout

* Left Sidebar (collapsible)
* Top Navbar (search, notifications, profile)
* Main Content Area (cards + tables)
* Right Drawer (for details / quick actions)

---

## 🧑‍💼 USER ROLES (5 DASHBOARDS)

Create separate dashboards for:

1. Admin
2. Partner
3. Team Leader
4. Team Member
5. Client (mobile-first PWA style)

Each dashboard must have **different UI structure based on role priority**.

---

## 📊 PARTNER DASHBOARD (PRIORITY SCREEN)

Design a powerful MIS dashboard:

### Top KPI Cards

* Total Active Tasks
* Pending Approvals
* Overdue Tasks (highlight in red)
* Monthly Revenue
* Monthly Cost
* Net Profit

### Sections:

1. **Pending Tasks Table**

   * Columns: Client | Task | Assigned To | Priority | Target Date | Aging
   * Overdue = red highlight

2. **Task Assignment Panel**

   * Quick assign dropdown UI

3. **Team Performance Matrix**

   * Table with:

     * Team Member
     * Tasks Completed
     * On-Time %
     * Compliance Rating
     * Hours Logged
     * Revenue Generated
     * Cost
     * Profit Margin

4. **Financial MIS (Tabs UI)**

   * Monthly / Quarterly / Half-Yearly / Yearly
   * Charts:

     * Revenue vs Cost (bar chart)
     * Profit Trend (line chart)
     * Category-wise revenue (pie chart)

5. **Working Capital Planner**

   * Cashflow chart (future projection)

6. **Attendance Heatmap**

   * Calendar style grid with colored indicators

---

## 📋 TASK MANAGEMENT UI

### Task Creation Form

Fields:

* Client (dropdown)
* Category
* Assigned To (multi-select)
* Priority (Low/Medium/High/Urgent)
* Start Date
* Target Date
* Estimated Hours
* Budgeted Fee

### Task Status Flow (visual stepper UI)

* Draft → Pending Approval → Approved → In Progress → Completed → Sent for Billing → Billed

### Task Detail Page

* Timeline (activity log)
* Comments section
* File attachments
* Approval buttons (Approve / Reject with remarks)

---

## 👨‍👩‍👧 TEAM LEADER DASHBOARD

* My Tasks
* Team Tasks
* Approval Queue
* Workload chart (bar graph)
* Leave management widget

---

## 👨‍💻 TEAM MEMBER DASHBOARD

* Task list (priority sorted)
* Overdue tasks highlighted
* “Mark Complete” button with upload UI
* Time logging input
* Attendance summary
* Compliance rating graph

---

## 📱 CLIENT DASHBOARD (IMPORTANT)

Design mobile-first UI (like an app):

### Sections:

* My Documents (card list with download button)
* Upcoming Due Dates (timeline UI)
* CA Observations (notes cards)
* Shared Materials
* Chat with CA (simple WhatsApp-style UI)
* Raise Query (floating button)

Keep it:

* Extremely simple
* No internal data visible

---

## ⚙️ ADMIN DASHBOARD

* User Management Table
* Client Master Table
* Task Categories Manager
* Excel Upload UI (drag & drop)
* System Settings Panel
* Audit Logs Table

---

## 📈 REPORTING UI

Create export-ready report screens:

* Task Report
* Billing Report
* Productivity Report
* P&L Statement

Include:

* Filters (date, client, category)
* Export buttons (Excel / PDF)

---

## 🔔 NOTIFICATIONS UI

* Bell icon with dropdown
* Categories:

  * Tasks
  * Approvals
  * Billing
  * Client messages

---

## 🧾 BILLING MODULE

* Invoice creation screen
* GST calculation display
* Invoice preview layout (print-friendly)

---

## 📍 ATTENDANCE UI

* Auto check-in card
* Location captured indicator
* Map preview (small)
* Daily working hours display

---

## 🧩 COMPONENTS TO DESIGN

Create reusable components:

* Buttons (primary, secondary, danger)
* Input fields
* Dropdowns
* Tables
* Cards
* Tabs
* Status badges
* Modals
* File upload UI

---

## 📱 RESPONSIVENESS

* Desktop (primary)
* Tablet
* Mobile (especially client dashboard)

---

## 🎯 FINAL OUTPUT EXPECTATION

Deliver:

* Full design system
* All dashboards
* All major screens
* Component library
* Clean spacing and alignment
* Realistic dummy data

Avoid:

* Clutter
* Overuse of colors
* Fancy animations
* Non-professional UI

---

This system must feel like:
👉 A premium SaaS product used by top CA firms

=== PROMPT END ===
