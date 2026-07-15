# ✅ Client Upload Checklist

## Follow These Steps in Order

---

## □ Step 1: Prepare Excel File

Your Excel should have these columns (in any order):
- ✅ NAME (required)
- File Number
- PAN
- GSTIN
- Firm Name
- ITR Fees
- GST Fees
- GST Annual Return Fees
- Accounting Fees
- Audit Fees
- Company Act Fees
- TDS Fees
- PF, ESIC, PT, Labour Fees
- Consultancy Fees
- Total Fees
- Mobile Number
- Email Id

**Check:**
- [ ] Column headers are in first row
- [ ] NAME column exists
- [ ] File saved as .xlsx or .xls

---

## □ Step 2: One-Time Database Setup

**Only if you haven't done this before:**

1. [ ] Go to Supabase Dashboard
2. [ ] Click SQL Editor
3. [ ] Open file: `database-client-fees-update.sql`
4. [ ] Copy all SQL
5. [ ] Paste in SQL Editor
6. [ ] Click RUN
7. [ ] See: "✅ CLIENT DATABASE UPDATED!"

**Skip this step if you already ran it!**

---

## □ Step 3: Install Python Libraries

**Only needed once:**

```bash
pip install openpyxl pandas
```

**Check:**
- [ ] No error messages
- [ ] Libraries installed successfully

---

## □ Step 4: Convert Excel to SQL

```bash
python excel-client-billing-converter.py your-clients.xlsx
```

**Replace `your-clients.xlsx` with your actual filename!**

**You should see:**
- [ ] "✅ SQL file created: your-clients_upload.sql"
- [ ] "X valid clients processed"
- [ ] Fee summary displayed

**Generated file:** `your-clients_upload.sql`

---

## □ Step 5: Upload to Supabase

1. [ ] Open the generated `.sql` file
2. [ ] Copy **ALL** the SQL code (Ctrl+A, Ctrl+C)
3. [ ] Go to Supabase Dashboard
4. [ ] Click SQL Editor (left sidebar)
5. [ ] Click "New Query"
6. [ ] Paste SQL code (Ctrl+V)
7. [ ] Click **RUN** button
8. [ ] Wait for completion

**You should see:**
- [ ] "✅ CLIENT DATA UPLOADED!"
- [ ] "X clients uploaded successfully"
- [ ] Verification query results

---

## □ Step 6: Verify Upload

1. [ ] Stay in Supabase
2. [ ] Click "Table Editor" (left sidebar)
3. [ ] Select "clients" table
4. [ ] See your client list with all data

**Check a few rows:**
- [ ] Names are correct
- [ ] Fees are correct
- [ ] Contact info is correct

---

## □ Step 7: Test in Software

1. [ ] Login as Partner: `apm@kapsca.in` / `Pass@2026`
2. [ ] Click **💰 Billing** in sidebar
3. [ ] See all your clients listed
4. [ ] Try searching for a client
5. [ ] Click "View" on any client
6. [ ] See complete fee details

**You should see:**
- [ ] All clients from your Excel
- [ ] Correct fee amounts
- [ ] Search working
- [ ] Total fees calculated

---

## ✅ Done!

If all checkboxes are ticked, your client database is ready!

---

## 🆘 If Something Went Wrong

### Converter doesn't work:
- Check Python is installed: `python --version`
- Check libraries: `pip list | grep -E "openpyxl|pandas"`
- Make sure Excel file exists in same folder

### SQL upload fails:
- Check if database-client-fees-update.sql was run first
- Look at error message in Supabase
- Check if any required columns are missing

### Clients not showing:
- Refresh browser
- Check you're logged in as Partner or Anjali
- Verify data in Supabase Table Editor

---

## 📞 Quick Commands Reference

```bash
# Install libraries
pip install openpyxl pandas

# Convert Excel
python excel-client-billing-converter.py clients.xlsx

# Output file will be:
# clients_upload.sql
```

---

## 🎯 Success Criteria

You know it worked when:
1. ✅ Converter creates .sql file without errors
2. ✅ Supabase shows "CLIENT DATA UPLOADED!"
3. ✅ Table Editor shows your clients
4. ✅ Billing tab displays all clients
5. ✅ Search and View work correctly
