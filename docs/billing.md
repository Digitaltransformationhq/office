# 💰 Billing Feature Setup Guide

## Complete Guide to Enable Client Billing with Fees

---

## 📋 What This Feature Does

✅ Store client fee structure for different services (ITR, GST, Audit, etc.)  
✅ View approximate billing amounts when completing tasks  
✅ Access restricted to **Partners** and **Anjali Vasava** only  
✅ Staff members **cannot see fee amounts** - only partners can  
✅ Comprehensive billing dashboard with client fee breakdown  

---

## 🚀 Step-by-Step Setup

### Step 1: Update Database Schema

**Run this SQL in Supabase:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Open file: `database-client-fees-update.sql`
4. Copy **all** the SQL code
5. Paste in SQL Editor
6. Click **RUN**

**This will:**
- ✅ Add fee columns to clients table (ITR, GST, Audit, etc.)
- ✅ Add PAN, File Number, Firm Name fields
- ✅ Add Mobile Number and Email ID fields
- ✅ Create indexes for better performance

**Expected Output:**
```
✅ CLIENT DATABASE UPDATED!
✓ Fee columns added
✓ PAN and File Number fields added
✓ Mobile and Email fields updated
✓ Indexes created for performance
```

---

### Step 2: Upload Client Billing Data

**Option A: Use the Template (Recommended)**

1. Open file: `clients-billing-upload-template.sql`
2. Replace sample clients with your actual data
3. Keep the same format for each client
4. Copy entire script
5. Paste in **Supabase SQL Editor**
6. Click **RUN**

**Option B: Convert from Excel**

If you have Excel with this structure:

| File No | Name | Firm Name | PAN | GSTIN | ITR Fees | GST Fees | ... | Total Fees | Mobile | Email |
|---------|------|-----------|-----|-------|----------|----------|-----|------------|--------|-------|

Use the Python converter:
```bash
python excel-to-sql-converter.py your-billing-data.xlsx
```

Then upload the generated SQL file.

---

### Step 3: Verify Billing Access

**Who Can Access Billing:**

✅ **All Partners** - Full access to billing  
✅ **Anjali Vasava** (audit1@kapsca.in) - Special staff access  
❌ **Other Staff** - No billing access (cannot see fees)  
✅ **Admin** - Full access to billing  

**Test Access:**

1. **Login as Partner**: `apm@kapsca.in` / `Pass@2026`
   - You should see **💰 Billing** in the sidebar
   
2. **Login as Anjali**: `audit1@kapsca.in` / `Pass@2026`
   - You should see **💰 Billing** in the sidebar (special access)
   
3. **Login as Other Staff**: Any other staff member
   - Billing option should **NOT** appear in sidebar

---

## 📊 Client Fee Structure

Each client can have fees for:

| Service | Field Name | Description |
|---------|------------|-------------|
| ITR Fees | `itr_fees` | Income Tax Return filing fees |
| GST Fees | `gst_fees` | Monthly GST return fees |
| GST Annual Return Fees | `gst_annual_return_fees` | Annual GST return fees |
| Accounting Fees | `accounting_fees` | Bookkeeping and accounting |
| Audit Fees | `audit_fees` | Statutory audit fees |
| Company Act Fees | `company_act_fees` | ROC compliance fees |
| TDS Fees | `tds_fees` | TDS return filing fees |
| PF/ESIC/PT/Labour Fees | `pf_esic_pt_labour_fees` | Labour compliance fees |
| Consultancy Fees | `consultancy_fees` | Advisory and consulting |
| **Total Fees** | `total_fees` | **Sum of all fees** |

---

## 💡 How to Use Billing Feature

### View Client Billing

1. **Login as Partner or Anjali**
2. Click **💰 Billing** in sidebar
3. You'll see:
   - Total clients count
   - Total fee structure amount
   - Average fee per client
   - Active clients count

### Search Clients

Use the search bar to find clients by:
- Client Name
- File Number
- PAN
- Firm Name

### View Client Details

1. Click **View** button on any client row
2. See complete client information:
   - File Number, PAN, GSTIN
   - Contact details
   - Complete fee breakdown
   - Total fees

### Fee Breakdown

The billing table shows:
- All service fees for each client
- Highlighted **Total Fees** column
- Easy-to-read currency formatting (₹)
- Sortable and searchable data

---

## 📝 Sample Client Data Format

```sql
INSERT INTO clients (...) VALUES
  (
    'client:1',                    -- ID
    'KAPS/2026/001',              -- File Number
    'ABC Enterprises Pvt Ltd',    -- Client Name
    'ABC Enterprises',            -- Firm Name
    'ABCPA1234A',                 -- PAN
    '24ABCPA1234A1Z5',           -- GSTIN
    'Manufacturing',              -- Industry
    '9876543210',                 -- Contact
    'abc@example.com',            -- Email
    5000.00,                      -- ITR Fees
    3000.00,                      -- GST Fees
    2000.00,                      -- GST Annual Return Fees
    8000.00,                      -- Accounting Fees
    15000.00,                     -- Audit Fees
    0.00,                         -- Company Act Fees
    1500.00,                      -- TDS Fees
    0.00,                         -- PF/ESIC/PT/Labour Fees
    0.00,                         -- Consultancy Fees
    34500.00,                     -- Total Fees
    '9876543210',                 -- Mobile Number
    'abc@example.com',            -- Email ID
    'Active',                     -- Status
    NOW(),
    NOW()
  );
```

---

## 🔒 Security & Access Control

### Access Rules:

1. **Sidebar Menu:**
   - Partners: ✅ See Billing option
   - Admin: ✅ See Billing option
   - Anjali Vasava: ✅ See Billing option (special case)
   - Other Staff: ❌ No Billing option

2. **Data Protection:**
   - Fee amounts are only visible in Billing view
   - Regular staff cannot access billing information
   - Task creation does NOT show fee amounts to staff

3. **Role Checks:**
   ```typescript
   // Access granted to:
   user.role === 'partner' OR
   user.role === 'admin' OR
   user.email === 'audit1@kapsca.in'
   ```

---

## 🎯 Using Fees at Billing Time

### When Completing Tasks:

1. Partner completes a task for client "ABC Enterprises"
2. Goes to **Billing** tab
3. Searches for "ABC Enterprises"
4. Clicks **View** to see fee structure
5. Sees approximate fees:
   - ITR Fees: ₹5,000
   - GST Fees: ₹3,000
   - Total: ₹34,500
6. Uses this to generate invoice

### Fee Reference:

The billing tab serves as a **reference** for:
- ✅ Standard fee structure per client
- ✅ Quick lookup during billing
- ✅ Consistent pricing across team
- ✅ Approximate amounts for invoicing

---

## 📱 Features Overview

### Dashboard Features:

1. **Summary Cards:**
   - Total Clients
   - Total Fee Structure
   - Average Per Client
   - Active Clients

2. **Search & Filter:**
   - Real-time search
   - Search multiple fields
   - Instant results

3. **Client Table:**
   - All client details
   - All fee columns
   - Horizontal scroll for many columns
   - Responsive design

4. **Client Detail Modal:**
   - Complete client info
   - Fee breakdown
   - Total calculation
   - Professional layout

---

## ⚙️ Files Created

| File | Purpose |
|------|---------|
| `database-client-fees-update.sql` | Database schema update |
| `clients-billing-upload-template.sql` | Template for uploading client billing data |
| `src/app/components/Billing.tsx` | Billing dashboard component |
| `BILLING-SETUP-GUIDE.md` | This guide |

---

## 🔧 Troubleshooting

### Billing Tab Not Showing

**Problem:** Logged in as partner but don't see Billing option

**Solution:**
1. Check your email - must be partner role or audit1@kapsca.in
2. Refresh the page
3. Clear browser cache
4. Verify user role in database

### Fee Columns Missing

**Problem:** Billing table shows but fee columns are empty

**Solution:**
1. Run `database-client-fees-update.sql` first
2. Check Supabase Table Editor → clients table
3. Verify columns exist: itr_fees, gst_fees, etc.

### Cannot See Fees

**Problem:** Billing page loads but shows ₹0 for all fees

**Solution:**
1. Upload client data with fees
2. Use `clients-billing-upload-template.sql`
3. Check data in Supabase Table Editor

---

## 📈 Next Steps

After setup, you can:

1. ✅ Add more clients with fee structure
2. ✅ Update fees as needed
3. ✅ Export billing data for reporting
4. ✅ Use as reference during task completion
5. ✅ Generate invoices based on fee structure

---

## 🎉 You're Ready!

Your billing system is now fully functional with:
- ✅ Client fee database structure
- ✅ Secure access control (partners & Anjali only)
- ✅ Complete billing dashboard
- ✅ Fee lookup during billing time
- ✅ Professional interface

**Partners and Anjali can now access billing information while other staff members are restricted from viewing fees!**
