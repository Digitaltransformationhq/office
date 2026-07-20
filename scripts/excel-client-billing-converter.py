#!/usr/bin/env python3
"""
KAPS & Co. - Client Billing Excel to SQL Converter
--------------------------------------------------
Converts your client Excel file with billing fees to SQL format

Usage:
    python excel-client-billing-converter.py your-clients.xlsx

Requirements:
    pip install openpyxl pandas
"""

import sys
import pandas as pd
from datetime import datetime

def clean_value(value):
    """Clean and escape values for SQL"""
    if pd.isna(value) or value == '' or value is None:
        return None

    # Convert to string and strip whitespace
    str_value = str(value).strip()

    # Handle "NULL" string
    if str_value.upper() == 'NULL' or str_value == '':
        return None

    # Escape single quotes
    str_value = str_value.replace("'", "''")
    return str_value

def clean_number(value):
    """Clean and convert to number"""
    if pd.isna(value) or value == '' or value is None:
        return 0.0

    # Remove commas and convert to float
    try:
        if isinstance(value, str):
            value = value.replace(',', '').strip()
        return float(value)
    except:
        return 0.0

def convert_excel_to_sql(excel_file):
    """Convert Excel file to SQL INSERT statements"""

    try:
        # Read Excel file
        print(f"📖 Reading Excel file: {excel_file}")
        df = pd.read_excel(excel_file)

        # Map Excel columns to database columns
        column_mapping = {
            'File Number': 'file_number',
            'NAME': 'name',
            'PAN': 'pan',
            'GSTIN': 'gst',
            'Firm Name': 'firm_name',
            'ITR Fees': 'itr_fees',
            'GST Fees': 'gst_fees',
            'GST Annual Return Fees': 'gst_annual_return_fees',
            'Accounting Fees': 'accounting_fees',
            'Audit Fees': 'audit_fees',
            'Company Act Fees': 'company_act_fees',
            'TDS Fees': 'tds_fees',
            'PF, ESIC, PT, Labour Fees': 'pf_esic_pt_labour_fees',
            'Consultancy Fees': 'consultancy_fees',
            'Total Fees': 'total_fees',
            'Mobile Number': 'mobile_number',
            'Email Id': 'email_id',
        }

        print(f"✅ Found {len(df)} clients in Excel file")
        print(f"   Columns in your file: {', '.join(df.columns.tolist())}\n")

        # Check required columns
        required_cols = ['NAME']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print(f"❌ Error: Missing required columns: {', '.join(missing_cols)}")
            print(f"   Required: NAME")
            return

        # Generate SQL output file
        output_file = excel_file.replace('.xlsx', '_upload.sql').replace('.xls', '_upload.sql')

        with open(output_file, 'w', encoding='utf-8') as f:
            # Header
            f.write("-- ============================================\n")
            f.write("-- KAPS & Co. CLIENT BILLING DATABASE UPLOAD\n")
            f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"-- Source File: {excel_file}\n")
            f.write(f"-- Total Clients: {len(df)}\n")
            f.write("-- ============================================\n\n")

            # Optional delete
            f.write("-- Optional: Delete existing clients first (uncomment if needed)\n")
            f.write("-- DELETE FROM clients WHERE id LIKE 'client:%';\n\n")

            # Insert statement
            f.write("-- Insert clients with billing information\n")
            f.write("INSERT INTO clients (\n")
            f.write("  id, file_number, name, firm_name, pan, gst, industry, contact, email,\n")
            f.write("  itr_fees, gst_fees, gst_annual_return_fees, accounting_fees, audit_fees,\n")
            f.write("  company_act_fees, tds_fees, pf_esic_pt_labour_fees, consultancy_fees,\n")
            f.write("  total_fees, mobile_number, email_id, status, created_at, updated_at\n")
            f.write(") VALUES\n")

            # Process each row
            valid_rows = 0
            for idx, row in df.iterrows():
                # Get name (required)
                name = clean_value(row.get('NAME'))
                if not name:
                    print(f"⚠️  Warning: Row {idx + 2} has no name - skipping")
                    continue

                # Get other fields
                file_number = clean_value(row.get('File Number', '')) or f"KAPS/2026/{idx + 1:03d}"
                firm_name = clean_value(row.get('Firm Name', ''))
                pan = clean_value(row.get('PAN', ''))
                gst = clean_value(row.get('GSTIN', ''))
                mobile = clean_value(row.get('Mobile Number', ''))
                email = clean_value(row.get('Email Id', ''))

                # Get fees (all numeric)
                itr_fees = clean_number(row.get('ITR Fees', 0))
                gst_fees = clean_number(row.get('GST Fees', 0))
                gst_annual = clean_number(row.get('GST Annual Return Fees', 0))
                accounting = clean_number(row.get('Accounting Fees', 0))
                audit = clean_number(row.get('Audit Fees', 0))
                company_act = clean_number(row.get('Company Act Fees', 0))
                tds = clean_number(row.get('TDS Fees', 0))
                pf_esic = clean_number(row.get('PF, ESIC, PT, Labour Fees', 0))
                consultancy = clean_number(row.get('Consultancy Fees', 0))
                total = clean_number(row.get('Total Fees', 0))

                # If total is 0, calculate it
                if total == 0:
                    total = itr_fees + gst_fees + gst_annual + accounting + audit + company_act + tds + pf_esic + consultancy

                # Generate client ID
                client_id = f"client:{idx + 1}"

                # Format SQL values
                def sql_string(val):
                    return f"'{val}'" if val else 'NULL'

                def sql_number(val):
                    return f"{val:.2f}"

                # Write SQL row
                comma = "," if idx < len(df) - 1 else ";"

                f.write(f"  (\n")
                f.write(f"    '{client_id}',                    -- ID\n")
                f.write(f"    {sql_string(file_number)},        -- File Number\n")
                f.write(f"    {sql_string(name)},               -- Client Name\n")
                f.write(f"    {sql_string(firm_name)},          -- Firm Name\n")
                f.write(f"    {sql_string(pan)},                -- PAN\n")
                f.write(f"    {sql_string(gst)},                -- GSTIN\n")
                f.write(f"    'General',                         -- Industry (default)\n")
                f.write(f"    {sql_string(mobile)},             -- Contact\n")
                f.write(f"    {sql_string(email)},              -- Email\n")
                f.write(f"    {sql_number(itr_fees)},           -- ITR Fees\n")
                f.write(f"    {sql_number(gst_fees)},           -- GST Fees\n")
                f.write(f"    {sql_number(gst_annual)},         -- GST Annual Return Fees\n")
                f.write(f"    {sql_number(accounting)},         -- Accounting Fees\n")
                f.write(f"    {sql_number(audit)},              -- Audit Fees\n")
                f.write(f"    {sql_number(company_act)},        -- Company Act Fees\n")
                f.write(f"    {sql_number(tds)},                -- TDS Fees\n")
                f.write(f"    {sql_number(pf_esic)},            -- PF/ESIC/PT/Labour Fees\n")
                f.write(f"    {sql_number(consultancy)},        -- Consultancy Fees\n")
                f.write(f"    {sql_number(total)},              -- Total Fees\n")
                f.write(f"    {sql_string(mobile)},             -- Mobile Number\n")
                f.write(f"    {sql_string(email)},              -- Email ID\n")
                f.write(f"    'Active',                          -- Status\n")
                f.write(f"    NOW(),                             -- Created At\n")
                f.write(f"    NOW()                              -- Updated At\n")
                f.write(f"  ){comma}\n")

                valid_rows += 1

            # Handle conflicts
            f.write("\n-- Update existing records if ID already exists\n")
            f.write("ON CONFLICT (id) DO UPDATE SET\n")
            f.write("  file_number = EXCLUDED.file_number,\n")
            f.write("  name = EXCLUDED.name,\n")
            f.write("  firm_name = EXCLUDED.firm_name,\n")
            f.write("  pan = EXCLUDED.pan,\n")
            f.write("  gst = EXCLUDED.gst,\n")
            f.write("  industry = EXCLUDED.industry,\n")
            f.write("  contact = EXCLUDED.contact,\n")
            f.write("  email = EXCLUDED.email,\n")
            f.write("  itr_fees = EXCLUDED.itr_fees,\n")
            f.write("  gst_fees = EXCLUDED.gst_fees,\n")
            f.write("  gst_annual_return_fees = EXCLUDED.gst_annual_return_fees,\n")
            f.write("  accounting_fees = EXCLUDED.accounting_fees,\n")
            f.write("  audit_fees = EXCLUDED.audit_fees,\n")
            f.write("  company_act_fees = EXCLUDED.company_act_fees,\n")
            f.write("  tds_fees = EXCLUDED.tds_fees,\n")
            f.write("  pf_esic_pt_labour_fees = EXCLUDED.pf_esic_pt_labour_fees,\n")
            f.write("  consultancy_fees = EXCLUDED.consultancy_fees,\n")
            f.write("  total_fees = EXCLUDED.total_fees,\n")
            f.write("  mobile_number = EXCLUDED.mobile_number,\n")
            f.write("  email_id = EXCLUDED.email_id,\n")
            f.write("  status = EXCLUDED.status,\n")
            f.write("  updated_at = NOW();\n\n")

            # Verification queries
            f.write("-- ============================================\n")
            f.write("-- VERIFICATION QUERIES\n")
            f.write("-- ============================================\n\n")

            f.write("-- Count total clients\n")
            f.write("SELECT COUNT(*) as total_clients FROM clients;\n\n")

            f.write("-- Show total fee summary\n")
            f.write("SELECT\n")
            f.write("  SUM(itr_fees) as total_itr_fees,\n")
            f.write("  SUM(gst_fees) as total_gst_fees,\n")
            f.write("  SUM(accounting_fees) as total_accounting_fees,\n")
            f.write("  SUM(audit_fees) as total_audit_fees,\n")
            f.write("  SUM(total_fees) as grand_total_fees\n")
            f.write("FROM clients;\n\n")

            f.write("-- Show first 20 clients\n")
            f.write("SELECT\n")
            f.write("  file_number,\n")
            f.write("  name,\n")
            f.write("  pan,\n")
            f.write("  total_fees,\n")
            f.write("  mobile_number,\n")
            f.write("  status\n")
            f.write("FROM clients\n")
            f.write("ORDER BY name\n")
            f.write("LIMIT 20;\n\n")

            f.write("-- Success message\n")
            f.write("DO $$\n")
            f.write("BEGIN\n")
            f.write("    RAISE NOTICE '';\n")
            f.write("    RAISE NOTICE '====================================';\n")
            f.write("    RAISE NOTICE '✅ CLIENT DATA UPLOADED!';\n")
            f.write("    RAISE NOTICE '====================================';\n")
            f.write("    RAISE NOTICE '';\n")
            f.write(f"    RAISE NOTICE '{valid_rows} clients uploaded successfully';\n")
            f.write("    RAISE NOTICE 'Access Billing tab to view all clients';\n")
            f.write("    RAISE NOTICE '';\n")
            f.write("END $$;\n")

        print(f"✅ SQL file created: {output_file}")
        print(f"   {valid_rows} valid clients processed\n")

        print(f"📋 Next Steps:")
        print(f"   1. Open {output_file}")
        print(f"   2. Copy all the SQL code")
        print(f"   3. Go to Supabase Dashboard → SQL Editor")
        print(f"   4. Paste and click RUN")
        print(f"   5. Your clients will be uploaded!\n")

        # Show summary
        print(f"💰 Fee Summary from Excel:")
        print(f"   Total ITR Fees: ₹{df['ITR Fees'].sum():,.2f}" if 'ITR Fees' in df.columns else "")
        print(f"   Total GST Fees: ₹{df['GST Fees'].sum():,.2f}" if 'GST Fees' in df.columns else "")
        print(f"   Total Fees: ₹{df['Total Fees'].sum():,.2f}" if 'Total Fees' in df.columns else "")

    except FileNotFoundError:
        print(f"❌ Error: File '{excel_file}' not found")
        print("   Make sure the file exists and path is correct")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("\n" + "="*60)
    print("  KAPS & Co. - Client Billing Excel to SQL Converter")
    print("="*60 + "\n")

    if len(sys.argv) < 2:
        print("Usage: python excel-client-billing-converter.py <excel-file>")
        print("\nExample:")
        print("  python excel-client-billing-converter.py clients.xlsx")
        print("\nYour Excel should have these columns:")
        print("  - File Number")
        print("  - NAME (required)")
        print("  - PAN")
        print("  - GSTIN")
        print("  - Firm Name")
        print("  - ITR Fees")
        print("  - GST Fees")
        print("  - GST Annual Return Fees")
        print("  - Accounting Fees")
        print("  - Audit Fees")
        print("  - Company Act Fees")
        print("  - TDS Fees")
        print("  - PF, ESIC, PT, Labour Fees")
        print("  - Consultancy Fees")
        print("  - Total Fees")
        print("  - Mobile Number")
        print("  - Email Id")
        return

    excel_file = sys.argv[1]
    convert_excel_to_sql(excel_file)

    print("="*60 + "\n")

if __name__ == "__main__":
    main()
