# 📊 Client Database Upload Guide

## How to Update Client Database from Excel

Follow these simple steps to upload your client list from Excel to the database.

---

## Step 1: Prepare Your Excel File

Your Excel file should have the following columns (in this exact order):

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| Name | ✅ Yes | Client company name | ABC Enterprises Pvt Ltd |
| Industry | ✅ Yes | Business industry | Manufacturing |
| GST | ❌ No | GST Number | 24XXXXX1234X1Z5 |
| Contact | ✅ Yes | Phone number | 9876543210 |
| Email | ❌ No | Email address | client@company.com |
| Status | ❌ No | Active/Inactive | Active |

**Example Excel Format:**

```
Name                        | Industry      | GST              | Contact    | Email                | Status
----------------------------|---------------|------------------|------------|----------------------|--------
ABC Enterprises Pvt Ltd     | Manufacturing | 24XXXXX1234X1Z5 | 9876543210 | abc@example.com     | Active
XYZ Corporation Ltd         | IT Services   | 24XXXXX5678X1Z9 | 9876543211 | xyz@example.com     | Active
PQR Industries              | Retail        | 24XXXXX9012X1Z3 | 9876543212 | pqr@example.com     | Active
```

---

## Step 2: Convert Excel to CSV

1. Open your Excel file
2. Click **File** → **Save As**
3. Choose format: **CSV (Comma delimited) (*.csv)**
4. Save the file (e.g., `clients.csv`)

---

## Step 3: Convert CSV Data to SQL Format

I'll provide you with **TWO METHODS**:

### Method A: Use Online CSV to SQL Converter

1. Go to: https://www.convertcsv.com/csv-to-sql.htm
2. Upload your `clients.csv` file
3. Configure settings:
   - Table Name: `clients`
   - Include CREATE TABLE: **No** (we already have the table)
   - Include DROP TABLE: **No**
   - SQL Command: **INSERT**
4. Click "Convert CSV to SQL"
5. Copy the generated SQL

### Method B: Use the Script I'll Create Below

I'll create a template SQL script where you can paste your data.

---

## Step 4: Upload to Supabase

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Paste the SQL Script** (see Step 5 below)

4. **Click RUN**

5. **Verify Upload**
   - Go to **Table Editor** → **clients** table
   - You should see all your clients listed

---

## Step 5: SQL Script Template

Use this script to upload your clients. Replace the sample data with your actual client data.

```sql
-- ============================================
-- UPLOAD CLIENTS TO DATABASE
-- ============================================
-- Instructions:
-- 1. Replace the sample data below with your actual client data
-- 2. Keep the same format for each row
-- 3. Run this entire script in Supabase SQL Editor

-- Clear existing sample clients (OPTIONAL - only if you want to remove old data)
-- DELETE FROM clients WHERE id LIKE 'client:%';

-- Insert your clients
-- Format: ('client:ID', 'Name', 'Industry', 'GST', 'Contact', 'Email', 'Status')

INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at, updated_at) VALUES
  ('client:1', 'ABC Enterprises Pvt Ltd', 'Manufacturing', '24XXXXX1234X1Z5', '9876543210', 'abc@example.com', 'Active', NOW(), NOW()),
  ('client:2', 'XYZ Corporation Ltd', 'IT Services', '24XXXXX5678X1Z9', '9876543211', 'xyz@example.com', 'Active', NOW(), NOW()),
  ('client:3', 'PQR Industries', 'Retail', '24XXXXX9012X1Z3', '9876543212', 'pqr@example.com', 'Active', NOW(), NOW())
  -- Add more clients here following the same format
  -- ('client:4', 'Your Client Name', 'Industry', 'GST Number', 'Phone', 'email@domain.com', 'Active', NOW(), NOW()),
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  gst = EXCLUDED.gst,
  contact = EXCLUDED.contact,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verify upload
SELECT COUNT(*) as total_clients FROM clients;
SELECT * FROM clients ORDER BY name LIMIT 10;
```

---

## Step 6: Important Tips

### ✅ Do's:
- **Use unique IDs**: Use format `client:1`, `client:2`, etc.
- **Required fields**: Always fill Name, Industry, and Contact
- **Quote marks**: Use single quotes `'` for text values
- **Commas**: Add comma after each row except the last one
- **Status**: Use either `'Active'` or `'Inactive'`

### ❌ Don'ts:
- Don't leave required fields empty (Name, Industry, Contact)
- Don't use duplicate IDs
- Don't forget commas between rows
- Don't use special characters in IDs

---

## Step 7: Bulk Upload Template

If you have many clients (50+), use this Python script template:

```python
import csv
import uuid

# Read your CSV file
with open('clients.csv', 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    
    print("INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at, updated_at) VALUES")
    
    rows = list(reader)
    for i, row in enumerate(rows):
        client_id = f"client:{i+1}"
        name = row['Name'].replace("'", "''")  # Escape single quotes
        industry = row['Industry'].replace("'", "''")
        gst = row['GST'] or 'NULL'
        contact = row['Contact']
        email = row['Email'] or 'NULL'
        status = row.get('Status', 'Active')
        
        comma = "," if i < len(rows) - 1 else ";"
        
        print(f"  ('{client_id}', '{name}', '{industry}', '{gst}', '{contact}', '{email}', '{status}', NOW(), NOW()){comma}")
```

Save this as `convert_clients.py` and run:
```bash
python convert_clients.py > clients_upload.sql
```

Then upload `clients_upload.sql` to Supabase.

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
**Solution**: You're using an ID that already exists. Use a different ID or update the existing record.

### Error: "null value in column violates not-null constraint"
**Solution**: You're missing a required field (Name, Industry, or Contact). Fill in all required fields.

### Error: "syntax error at or near"
**Solution**: Check for:
- Missing commas between rows
- Missing quotes around text values
- Special characters that need escaping

---

## Quick Example

Here's a complete example with 3 clients:

```sql
-- Delete old sample data (optional)
DELETE FROM clients WHERE id IN ('client:1', 'client:2', 'client:3');

-- Insert new clients
INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at, updated_at) VALUES
  ('client:1', 'Reliance Industries Ltd', 'Conglomerate', '24AABCR1234M1Z5', '9876543210', 'contact@ril.com', 'Active', NOW(), NOW()),
  ('client:2', 'Tata Motors Ltd', 'Automotive', '27AAACT1234N1Z3', '9876543211', 'info@tatamotors.com', 'Active', NOW(), NOW()),
  ('client:3', 'Infosys Technologies', 'IT Services', '29AABCI1234P1Z7', '9876543212', 'contact@infosys.com', 'Active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  industry = EXCLUDED.industry,
  gst = EXCLUDED.gst,
  contact = EXCLUDED.contact,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verify
SELECT * FROM clients ORDER BY name;
```

---

## Need Help?

If you encounter any issues:
1. Check the error message in Supabase SQL Editor
2. Verify your Excel file has the correct columns
3. Make sure required fields are not empty
4. Check for special characters or quotes in your data

**Your clients will appear in the software immediately after upload!**
