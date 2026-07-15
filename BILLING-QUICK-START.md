# 🚀 Billing Feature - Quick Start

## Get Your Billing System Running in 3 Steps

---

## ✅ Step 1: Update Database (2 minutes)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open file: `database-client-fees-update.sql`
3. Copy all SQL code
4. Paste in SQL Editor → Click **RUN**

**Done!** Database now has fee columns.

---

## ✅ Step 2: Upload Client Data (5 minutes)

**Option A - Use Template:**

1. Open `clients-billing-upload-template.sql`
2. Replace sample clients with your data
3. Run in Supabase SQL Editor

**Option B - From Excel:**

Your Excel should have these columns:
```
File No | Name | Firm Name | PAN | GSTIN | ITR Fees | GST Fees | 
GST Annual Fees | Accounting Fees | Audit Fees | Company Act Fees | 
TDS Fees | PF/ESIC/PT Fees | Consultancy Fees | Total Fees | Mobile | Email
```

Then convert and upload.

---

## ✅ Step 3: Test Access (1 minute)

**Login as Partner:**
- Email: `apm@kapsca.in`
- Password: `Pass@2026`
- ✅ Should see **💰 Billing** in sidebar

**Login as Anjali:**
- Email: `audit1@kapsca.in`
- Password: `Pass@2026`
- ✅ Should see **💰 Billing** in sidebar

**Login as Other Staff:**
- ❌ Should **NOT** see Billing option

---

## 🎯 What You Get

✅ **Billing Tab** visible to:
   - All Partners
   - Anjali Vasava (special staff access)
   - Admin

❌ **Hidden from:**
   - All other staff members

✅ **Features:**
   - View all clients with fee structure
   - Search by name, PAN, file number
   - See total fees per client
   - Quick reference for billing
   - Professional dashboard

---

## 💰 Fee Structure Includes

- ITR Fees
- GST Fees
- GST Annual Return Fees
- Accounting Fees
- Audit Fees
- Company Act Fees
- TDS Fees
- PF/ESIC/PT/Labour Fees
- Consultancy Fees
- **Total Fees** (auto-calculated)

---

## 📖 Need More Details?

See complete guide: `BILLING-SETUP-GUIDE.md`

---

## 🎉 That's It!

Three simple steps and your billing system is ready!

Partners can now:
1. Click **Billing** in sidebar
2. Search for any client
3. View complete fee structure
4. Use as reference when creating invoices
