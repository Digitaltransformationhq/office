# 📊 Upload Your Client List - Step by Step Guide

## Your Excel Format is Perfect! ✅

I can see your Excel has these columns:
```
Sr.No | File Number | NAME | PAN | GSTIN | Firm Name | ITR Fees | 
GST Fees | GST Annual Return Fees | Accounting Fees | Audit Fees | 
Company Act Fees | TDS Fees | PF, ESIC, PT, Labour Fees | 
Consultancy Fees | Total Fees | Mobile Number | Email Id
```

This matches perfectly with the billing system!

---

## 🚀 Quick Upload (3 Steps)

### Step 1: Run Database Update (One-time setup)

**First time only - adds fee columns to database:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open file: `database-client-fees-update.sql`
3. Copy all SQL code
4. Paste in SQL Editor
5. Click **RUN**

✅ **You'll see:** "CLIENT DATABASE UPDATED!"

---

### Step 2: Convert Your Excel to SQL

**Use the automatic converter:**

```bash
# Install required libraries (one-time)
pip install openpyxl pandas

# Convert your Excel file
python excel-client-billing-converter.py your-clients.xlsx
```

**This will create:** `your-clients_upload.sql`

---

### Step 3: Upload to Supabase

1. Open the generated file: `your-clients_upload.sql`
2. Copy **all** the SQL code
3. Go to **Supabase Dashboard** → **SQL Editor**
4. Paste the SQL code
5. Click **RUN**

✅ **Done!** Your clients are now in the system!

---

## 📋 Column Mapping

Your Excel columns map to the database like this:

| Your Excel Column | Database Field | Required? |
|-------------------|----------------|-----------|
| Sr.No | (ignored - auto-generated ID) | - |
| File Number | `file_number` | Optional |
| NAME | `name` | ✅ **Required** |
| PAN | `pan` | Optional |
| GSTIN | `gst` | Optional |
| Firm Name | `firm_name` | Optional |
| ITR Fees | `itr_fees` | Optional (default 0) |
| GST Fees | `gst_fees` | Optional (default 0) |
| GST Annual Return Fees | `gst_annual_return_fees` | Optional (default 0) |
| Accounting Fees | `accounting_fees` | Optional (default 0) |
| Audit Fees | `audit_fees` | Optional (default 0) |
| Company Act Fees | `company_act_fees` | Optional (default 0) |
| TDS Fees | `tds_fees` | Optional (default 0) |
| PF, ESIC, PT, Labour Fees | `pf_esic_pt_labour_fees` | Optional (default 0) |
| Consultancy Fees | `consultancy_fees` | Optional (default 0) |
| Total Fees | `total_fees` | Optional (auto-calculated) |
| Mobile Number | `mobile_number` | Optional |
| Email Id | `email_id` | Optional |

---

## 💡 Important Notes

### Required Columns:
- **NAME** - Only this column is required
- All other columns are optional

### Fee Columns:
- If you have ₹ symbol or commas in fees, the converter will clean them
- If "Total Fees" is empty, it will be auto-calculated
- Empty fee cells default to 0

### File Numbers:
- If "File Number" is empty, it will generate: `KAPS/2026/001`, `KAPS/2026/002`, etc.

### Status:
- All clients are uploaded as "Active" by default

---

## 🔧 What the Converter Does

1. **Reads your Excel file**
2. **Cleans the data:**
   - Removes ₹ symbols and commas from fees
   - Handles empty cells
   - Escapes special characters
3. **Calculates totals** if missing
4. **Generates SQL** with proper formatting
5. **Creates verification queries** to check the upload

---

## 📝 Example

### Your Excel Row:
```
File Number: KAPS/2026/001
NAME: ABC Enterprises Pvt Ltd
PAN: ABCPA1234A
GSTIN: 24ABCPA1234A1Z5
Firm Name: ABC Enterprises
ITR Fees: 5000
GST Fees: 3000
Total Fees: 34500
Mobile: 9876543210
Email: abc@example.com
```

### Converts to SQL:
```sql
INSERT INTO clients (...) VALUES
  (
    'client:1',
    'KAPS/2026/001',
    'ABC Enterprises Pvt Ltd',
    'ABC Enterprises',
    'ABCPA1234A',
    '24ABCPA1234A1Z5',
    'General',
    '9876543210',
    'abc@example.com',
    5000.00,    -- ITR Fees
    3000.00,    -- GST Fees
    ...
    34500.00,   -- Total Fees
    '9876543210',
    'abc@example.com',
    'Active',
    NOW(),
    NOW()
  );
```

---

## ✅ After Upload

### Where to See Your Clients:

1. **Login as Partner**: `apm@kapsca.in` / `Pass@2026`
2. Click **💰 Billing** in sidebar
3. You'll see all your clients with:
   - File numbers
   - Names and firm names
   - PAN and GSTIN
   - All fee details
   - Total fees
   - Contact information

### Search Functionality:
- Search by client name
- Search by file number
- Search by PAN
- Search by firm name

---

## 🔍 Verification

After upload, the script runs these queries to verify:

```sql
-- Count total clients
SELECT COUNT(*) as total_clients FROM clients;

-- Show fee summary
SELECT
  SUM(itr_fees) as total_itr_fees,
  SUM(gst_fees) as total_gst_fees,
  SUM(total_fees) as grand_total_fees
FROM clients;

-- Show first 20 clients
SELECT file_number, name, pan, total_fees
FROM clients
ORDER BY name
LIMIT 20;
```

---

## 🆘 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'openpyxl'"
**Solution:**
```bash
pip install openpyxl pandas
```

### Error: "File not found"
**Solution:**
- Make sure Excel file is in the same folder
- Or provide full path: `python excel-client-billing-converter.py C:/Users/You/Documents/clients.xlsx`

### Error: "Missing required columns: NAME"
**Solution:**
- Your Excel must have a column named "NAME" (exact spelling)
- Check column headers in first row

### Fees showing as 0
**Solution:**
- Make sure fee columns have numbers (not text)
- Remove ₹ symbols and commas (converter will clean them)
- Check column names match exactly

---

## 📊 Excel Format Checklist

Before converting, verify:

- ✅ Column headers are in **first row**
- ✅ **NAME** column exists (required)
- ✅ Fee columns have numbers (₹ symbols okay)
- ✅ File saved as `.xlsx` or `.xls`
- ✅ No merged cells in data rows
- ✅ Sr.No column (will be ignored, auto-generated IDs used)

---

## 🎯 Complete Example Workflow

```bash
# 1. Make sure you have required libraries
pip install openpyxl pandas

# 2. Convert your Excel file
python excel-client-billing-converter.py my-clients.xlsx

# 3. Output shows:
#    ✅ SQL file created: my-clients_upload.sql
#    📋 Next Steps: ...

# 4. Open my-clients_upload.sql in any text editor

# 5. Copy all SQL code

# 6. Go to Supabase Dashboard
#    - Open SQL Editor
#    - Paste SQL code
#    - Click RUN

# 7. See success message:
#    ✅ CLIENT DATA UPLOADED!
#    X clients uploaded successfully

# 8. Login to software and check Billing tab
```

---

## 🎉 You're Ready!

Your client list with all billing fees will be uploaded and ready to use in the software!

Partners and Anjali can then:
- View all clients in Billing tab
- Search for specific clients
- See complete fee structure
- Use fees as reference when billing
- Export data if needed

---

## 📞 Quick Reference

**Converter Command:**
```bash
python excel-client-billing-converter.py your-file.xlsx
```

**Required Column:**
- NAME (only this is required)

**Output File:**
- `your-file_upload.sql`

**Upload To:**
- Supabase Dashboard → SQL Editor → Paste → RUN

**View In:**
- Login → Billing tab → See all clients
