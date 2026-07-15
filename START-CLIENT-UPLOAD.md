# 🚀 Upload Your Client List - START HERE

## Your Excel Format is Perfect! ✅

I see your Excel has all the right columns:
- File Number, NAME, PAN, GSTIN, Firm Name
- ITR Fees, GST Fees, GST Annual Return Fees
- Accounting Fees, Audit Fees, Company Act Fees
- TDS Fees, PF/ESIC/PT/Labour Fees, Consultancy Fees
- Total Fees, Mobile Number, Email Id

**This matches exactly with the billing system!**

---

## 3 Simple Steps

### ⚡ Step 1: Install Python Libraries (30 seconds)

Open terminal/command prompt and run:
```bash
pip install openpyxl pandas
```

---

### ⚡ Step 2: Convert Your Excel (1 minute)

Put your Excel file in the same folder as this script, then run:

```bash
python excel-client-billing-converter.py YOUR-FILENAME.xlsx
```

**Replace `YOUR-FILENAME.xlsx` with your actual Excel file name!**

**Example:**
```bash
python excel-client-billing-converter.py clients.xlsx
```

**You'll see:**
```
✅ SQL file created: YOUR-FILENAME_upload.sql
   150 valid clients processed

📋 Next Steps:
   1. Open YOUR-FILENAME_upload.sql
   2. Copy all the SQL code
   3. Go to Supabase Dashboard → SQL Editor
   4. Paste and click RUN
   5. Your clients will be uploaded!
```

---

### ⚡ Step 3: Upload to Supabase (2 minutes)

1. **Open** the generated `.sql` file (ends with `_upload.sql`)
2. **Copy** all the SQL code (Ctrl+A, Ctrl+C)
3. **Go to** https://supabase.com
4. **Open** your project
5. **Click** SQL Editor (left sidebar)
6. **Paste** the SQL code
7. **Click** RUN button
8. **Wait** for success message

**You'll see:**
```
✅ CLIENT DATA UPLOADED!
150 clients uploaded successfully
Access Billing tab to view all clients
```

---

## ✅ Done!

**Test it:**
1. Login as Partner: `apm@kapsca.in` / `Pass@2026`
2. Click **💰 Billing** in sidebar
3. See all your clients!

---

## 🆘 Need Help?

### First Time Setup?

If this is your **first time** uploading clients, you need to run the database update **once**:

1. Go to Supabase → SQL Editor
2. Open file: `database-client-fees-update.sql`
3. Copy and run it
4. Then proceed with steps above

### Common Issues:

**"No module named openpyxl"**
→ Run: `pip install openpyxl pandas`

**"File not found"**
→ Make sure Excel file is in same folder or use full path

**Clients not showing**
→ Refresh browser, check you're logged in as Partner

---

## 📁 Files You Need:

1. **excel-client-billing-converter.py** ← The converter script
2. **Your Excel file** ← Your client list
3. **database-client-fees-update.sql** ← One-time database setup (if not done)

---

## 🎯 That's It!

Just 3 commands:
```bash
# 1. Install libraries
pip install openpyxl pandas

# 2. Convert Excel
python excel-client-billing-converter.py clients.xlsx

# 3. Upload to Supabase (copy-paste the generated SQL)
```

Your clients with all billing fees will be in the system!

---

## 📖 More Details?

See complete guide: `YOUR-CLIENT-UPLOAD-GUIDE.md`

See checklist: `UPLOAD-CHECKLIST.md`
