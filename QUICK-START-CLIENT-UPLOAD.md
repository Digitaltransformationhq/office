# 🚀 Quick Start: Upload Clients from Excel

## Easiest Way to Upload Your Client List

### Option 1: Use the Python Converter (Recommended - Fastest!)

**Step 1:** Install Python libraries (one-time only)
```bash
pip install openpyxl pandas
```

**Step 2:** Prepare your Excel file with these columns:
- **Name** (required)
- **Industry** (required)
- **Contact** (required) - Phone number
- **GST** (optional) - GST Number
- **Email** (optional)
- **Status** (optional) - Active/Inactive

**Step 3:** Run the converter
```bash
python excel-to-sql-converter.py your-clients.xlsx
```

**Step 4:** Upload to Supabase
1. Open the generated `.sql` file
2. Copy all the SQL code
3. Go to **Supabase Dashboard** → **SQL Editor**
4. Paste and click **RUN**
5. Done! ✅

---

### Option 2: Manual Copy-Paste (Simple - No Coding!)

**Step 1:** Use this template in your Excel:

| Name | Industry | GST | Contact | Email | Status |
|------|----------|-----|---------|-------|--------|
| ABC Enterprises | Manufacturing | 24XXXXX1234X1Z5 | 9876543210 | abc@example.com | Active |

**Step 2:** Convert to SQL format:
```sql
INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at, updated_at) VALUES
  ('client:1', 'ABC Enterprises', 'Manufacturing', '24XXXXX1234X1Z5', '9876543210', 'abc@example.com', 'Active', NOW(), NOW()),
  ('client:2', 'Your Client 2', 'Industry', 'GST', 'Phone', 'email@domain.com', 'Active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  gst = EXCLUDED.gst,
  contact = EXCLUDED.contact,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  updated_at = NOW();
```

**Step 3:** Upload to Supabase
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Paste the SQL
3. Click **RUN**

---

### Option 3: Use Online Converter

1. Convert Excel to CSV: **File → Save As → CSV**
2. Go to: https://www.convertcsv.com/csv-to-sql.htm
3. Upload your CSV
4. Set: Table Name = `clients`, SQL Command = `INSERT`
5. Download SQL file
6. Upload to Supabase

---

## Sample Template

I've created `CLIENT-TEMPLATE.csv` for you to use as a starting point.

**Download it and replace with your actual client data!**

---

## After Upload

Your clients will immediately appear in:
- Admin Dashboard → Client Master table
- Create Task Modal → Client dropdown
- All dashboards with client information

---

## Important Fields

### Required:
- ✅ **Name** - Client company name
- ✅ **Industry** - Business type
- ✅ **Contact** - Phone number

### Optional:
- **GST** - GST Number
- **Email** - Email address
- **Status** - Active (default) or Inactive

---

## Need Help?

📖 See full guide: `CLIENT-UPLOAD-GUIDE.md`

🐍 Python script: `excel-to-sql-converter.py`

📋 Template: `CLIENT-TEMPLATE.csv`
