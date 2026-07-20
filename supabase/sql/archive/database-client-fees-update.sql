-- ============================================
-- UPDATE CLIENT DATABASE WITH FEE STRUCTURE
-- ============================================
-- This adds fee columns for billing purposes
-- Run this in Supabase SQL Editor

-- Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS file_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS firm_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS itr_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gst_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gst_annual_return_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS accounting_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS audit_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_act_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tds_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pf_esic_pt_labour_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consultancy_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_fees DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_id TEXT;

-- Update existing email column mapping (if needed)
UPDATE clients SET email_id = email WHERE email IS NOT NULL AND email_id IS NULL;
UPDATE clients SET mobile_number = contact WHERE contact IS NOT NULL AND mobile_number IS NULL;

-- Create index for faster billing queries
CREATE INDEX IF NOT EXISTS idx_clients_file_number ON clients(file_number);
CREATE INDEX IF NOT EXISTS idx_clients_pan ON clients(pan);

-- Verify structure
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Show current clients
SELECT
    id,
    file_number,
    name,
    firm_name,
    pan,
    gst as gstin,
    itr_fees,
    gst_fees,
    accounting_fees,
    audit_fees,
    total_fees,
    mobile_number,
    email_id,
    status
FROM clients
ORDER BY name
LIMIT 10;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ CLIENT DATABASE UPDATED!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Fee columns added';
    RAISE NOTICE '✓ PAN and File Number fields added';
    RAISE NOTICE '✓ Mobile and Email fields updated';
    RAISE NOTICE '✓ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for billing functionality!';
    RAISE NOTICE '';
END $$;
