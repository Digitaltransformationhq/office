#!/usr/bin/env python3
"""
Excel to SQL Converter for KAPS & Co. Client Database
------------------------------------------------------
This script converts an Excel file with client data to SQL INSERT statements.

Usage:
    python excel-to-sql-converter.py clients.xlsx

Requirements:
    pip install openpyxl pandas
"""

import sys
import pandas as pd
from datetime import datetime

def clean_value(value):
    """Clean and escape values for SQL"""
    if pd.isna(value) or value == '' or value is None:
        return 'NULL'

    # Convert to string and escape single quotes
    str_value = str(value).strip()
    str_value = str_value.replace("'", "''")
    return f"'{str_value}'"

def convert_excel_to_sql(excel_file):
    """Convert Excel file to SQL INSERT statements"""

    try:
        # Read Excel file
        print(f"📖 Reading Excel file: {excel_file}")
        df = pd.read_excel(excel_file)

        # Expected columns
        expected_columns = ['Name', 'Industry', 'GST', 'Contact', 'Email', 'Status']

        # Check if file has correct columns
        missing_cols = [col for col in ['Name', 'Industry', 'Contact'] if col not in df.columns]
        if missing_cols:
            print(f"❌ Error: Missing required columns: {', '.join(missing_cols)}")
            print(f"   Your columns: {', '.join(df.columns.tolist())}")
            return

        print(f"✅ Found {len(df)} clients in Excel file")
        print(f"   Columns: {', '.join(df.columns.tolist())}\n")

        # Generate SQL
        output_file = excel_file.replace('.xlsx', '.sql').replace('.xls', '.sql')

        with open(output_file, 'w', encoding='utf-8') as f:
            # Header
            f.write("-- ============================================\n")
            f.write("-- CLIENT DATABASE UPLOAD\n")
            f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"-- Total Clients: {len(df)}\n")
            f.write("-- ============================================\n\n")

            # Optional: Delete existing sample data
            f.write("-- Optional: Delete existing sample clients\n")
            f.write("-- DELETE FROM clients WHERE id LIKE 'client:%';\n\n")

            # Insert statement
            f.write("-- Insert clients\n")
            f.write("INSERT INTO clients (id, name, industry, gst, contact, email, status, created_at, updated_at) VALUES\n")

            # Process each row
            for idx, row in df.iterrows():
                client_id = f"client:{idx + 1}"

                # Get values with defaults
                name = clean_value(row.get('Name'))
                industry = clean_value(row.get('Industry'))
                gst = clean_value(row.get('GST', ''))
                contact = clean_value(row.get('Contact'))
                email = clean_value(row.get('Email', ''))
                status = clean_value(row.get('Status', 'Active'))

                # Check required fields
                if name == 'NULL' or industry == 'NULL' or contact == 'NULL':
                    print(f"⚠️  Warning: Row {idx + 1} is missing required fields - skipping")
                    continue

                # Comma for all rows except last
                comma = "," if idx < len(df) - 1 else ";"

                # Write SQL line
                f.write(f"  ('{client_id}', {name}, {industry}, {gst}, {contact}, {email}, {status}, NOW(), NOW()){comma}\n")

            # Handle conflicts (update if exists)
            f.write("\nON CONFLICT (id) DO UPDATE SET\n")
            f.write("  name = EXCLUDED.name,\n")
            f.write("  industry = EXCLUDED.industry,\n")
            f.write("  gst = EXCLUDED.gst,\n")
            f.write("  contact = EXCLUDED.contact,\n")
            f.write("  email = EXCLUDED.email,\n")
            f.write("  status = EXCLUDED.status,\n")
            f.write("  updated_at = NOW();\n\n")

            # Verification queries
            f.write("-- Verification\n")
            f.write("SELECT COUNT(*) as total_clients FROM clients;\n")
            f.write("SELECT * FROM clients ORDER BY name LIMIT 20;\n")

        print(f"✅ SQL file created: {output_file}")
        print(f"\n📋 Next Steps:")
        print(f"   1. Open {output_file}")
        print(f"   2. Copy all the SQL code")
        print(f"   3. Go to Supabase Dashboard → SQL Editor")
        print(f"   4. Paste and run the SQL code")
        print(f"   5. Your clients will be uploaded!\n")

        # Preview first few rows
        print("📊 Preview of generated SQL (first 3 clients):\n")
        with open(output_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            insert_start = False
            count = 0
            for line in lines:
                if 'INSERT INTO clients' in line:
                    insert_start = True
                if insert_start:
                    print(line.rstrip())
                    if line.strip().startswith('('):
                        count += 1
                    if count >= 3:
                        break

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
    print("  KAPS & Co. - Excel to SQL Converter")
    print("  Client Database Upload Tool")
    print("="*60 + "\n")

    if len(sys.argv) < 2:
        print("Usage: python excel-to-sql-converter.py <excel-file>")
        print("\nExample:")
        print("  python excel-to-sql-converter.py clients.xlsx")
        print("\nYour Excel file should have these columns:")
        print("  - Name (required)")
        print("  - Industry (required)")
        print("  - GST (optional)")
        print("  - Contact (required)")
        print("  - Email (optional)")
        print("  - Status (optional - defaults to 'Active')")
        return

    excel_file = sys.argv[1]
    convert_excel_to_sql(excel_file)

    print("="*60 + "\n")

if __name__ == "__main__":
    main()
