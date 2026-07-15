-- ============================================
-- CLIENT BILLING DATA UPLOAD TEMPLATE
-- ============================================
-- Use this template to upload client billing information
--
-- Instructions:
-- 1. First run: database-client-fees-update.sql (to add fee columns)
-- 2. Then use this template to upload your client data with fees
-- 3. Replace sample data with your actual clients
-- 4. Copy entire script to Supabase SQL Editor
-- 5. Click RUN

-- Optional: Clear existing clients
-- Uncomment if you want to start fresh
-- DELETE FROM clients WHERE id LIKE 'client:%';

-- Insert clients with billing information
-- Format: (id, file_number, name, firm_name, pan, gst, industry, contact, email,
--          itr_fees, gst_fees, gst_annual_return_fees, accounting_fees, audit_fees,
--          company_act_fees, tds_fees, pf_esic_pt_labour_fees, consultancy_fees,
--          total_fees, mobile_number, email_id, status, created_at, updated_at)

INSERT INTO clients (
  id, file_number, name, firm_name, pan, gst, industry, contact, email,
  itr_fees, gst_fees, gst_annual_return_fees, accounting_fees, audit_fees,
  company_act_fees, tds_fees, pf_esic_pt_labour_fees, consultancy_fees,
  total_fees, mobile_number, email_id, status, created_at, updated_at
) VALUES

  -- Sample Client 1
  (
    'client:1',                           -- ID
    'KAPS/2026/001',                      -- File Number
    'ABC Enterprises Pvt Ltd',            -- Client Name
    'ABC Enterprises',                    -- Firm Name
    'ABCPA1234A',                         -- PAN
    '24ABCPA1234A1Z5',                    -- GSTIN
    'Manufacturing',                      -- Industry
    '9876543210',                         -- Contact
    'abc@example.com',                    -- Email
    5000.00,                              -- ITR Fees
    3000.00,                              -- GST Fees
    2000.00,                              -- GST Annual Return Fees
    8000.00,                              -- Accounting Fees
    15000.00,                             -- Audit Fees
    0.00,                                 -- Company Act Fees
    1500.00,                              -- TDS Fees
    0.00,                                 -- PF/ESIC/PT/Labour Fees
    0.00,                                 -- Consultancy Fees
    34500.00,                             -- Total Fees
    '9876543210',                         -- Mobile Number
    'abc@example.com',                    -- Email ID
    'Active',                             -- Status
    NOW(),                                -- Created At
    NOW()                                 -- Updated At
  ),

  -- Sample Client 2
  (
    'client:2',
    'KAPS/2026/002',
    'XYZ Corporation Ltd',
    'XYZ Corp',
    'XYZCA9876B',
    '27XYZCA9876B1Z3',
    'IT Services',
    '9876543211',
    'xyz@example.com',
    8000.00,    -- ITR Fees
    4000.00,    -- GST Fees
    2500.00,    -- GST Annual Return Fees
    12000.00,   -- Accounting Fees
    20000.00,   -- Audit Fees
    5000.00,    -- Company Act Fees
    2000.00,    -- TDS Fees
    3000.00,    -- PF/ESIC/PT/Labour Fees
    5000.00,    -- Consultancy Fees
    61500.00,   -- Total Fees
    '9876543211',
    'xyz@example.com',
    'Active',
    NOW(),
    NOW()
  ),

  -- Sample Client 3
  (
    'client:3',
    'KAPS/2026/003',
    'PQR Industries',
    'PQR Industries',
    'PQRPA5555C',
    '29PQRPA5555C1Z7',
    'Retail',
    '9876543212',
    'pqr@example.com',
    3000.00,    -- ITR Fees
    2500.00,    -- GST Fees
    1500.00,    -- GST Annual Return Fees
    5000.00,    -- Accounting Fees
    10000.00,   -- Audit Fees
    0.00,       -- Company Act Fees
    1000.00,    -- TDS Fees
    0.00,       -- PF/ESIC/PT/Labour Fees
    2000.00,    -- Consultancy Fees
    25000.00,   -- Total Fees
    '9876543212',
    'pqr@example.com',
    'Active',
    NOW(),
    NOW()
  )

  -- Add more clients here following the same format
  -- Remember: Add comma after each row EXCEPT the last one!

-- Handle duplicate IDs by updating existing records
ON CONFLICT (id) DO UPDATE SET
  file_number = EXCLUDED.file_number,
  name = EXCLUDED.name,
  firm_name = EXCLUDED.firm_name,
  pan = EXCLUDED.pan,
  gst = EXCLUDED.gst,
  industry = EXCLUDED.industry,
  contact = EXCLUDED.contact,
  email = EXCLUDED.email,
  itr_fees = EXCLUDED.itr_fees,
  gst_fees = EXCLUDED.gst_fees,
  gst_annual_return_fees = EXCLUDED.gst_annual_return_fees,
  accounting_fees = EXCLUDED.accounting_fees,
  audit_fees = EXCLUDED.audit_fees,
  company_act_fees = EXCLUDED.company_act_fees,
  tds_fees = EXCLUDED.tds_fees,
  pf_esic_pt_labour_fees = EXCLUDED.pf_esic_pt_labour_fees,
  consultancy_fees = EXCLUDED.consultancy_fees,
  total_fees = EXCLUDED.total_fees,
  mobile_number = EXCLUDED.mobile_number,
  email_id = EXCLUDED.email_id,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count total clients
SELECT COUNT(*) as total_clients FROM clients;

-- Show total fee structure
SELECT
  SUM(itr_fees) as total_itr,
  SUM(gst_fees) as total_gst,
  SUM(accounting_fees) as total_accounting,
  SUM(audit_fees) as total_audit,
  SUM(total_fees) as grand_total
FROM clients;

-- Show all clients with fees
SELECT
  file_number,
  name,
  pan,
  gst,
  itr_fees,
  gst_fees,
  accounting_fees,
  audit_fees,
  total_fees,
  mobile_number,
  status
FROM clients
ORDER BY name
LIMIT 20;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ CLIENT BILLING DATA UPLOADED!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Your clients with fee structure are now ready!';
    RAISE NOTICE 'Access Billing tab to view and manage fees.';
    RAISE NOTICE '';
END $$;
