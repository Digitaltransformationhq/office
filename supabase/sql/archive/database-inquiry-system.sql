-- ============================================
-- CLIENT INQUIRY MANAGEMENT SYSTEM
-- Database Schema for KAPS & Co. CA Firm
-- ============================================

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS client_inquiries CASCADE;

-- Create client_inquiries table
CREATE TABLE client_inquiries (
    id BIGSERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    company_name TEXT,
    mobile_number TEXT NOT NULL,
    email TEXT,
    work_type TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Approved', 'Rejected')),
    submitted_by TEXT NOT NULL,
    submitted_by_id BIGINT,
    reviewed_by TEXT,
    reviewed_by_id BIGINT,
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on status for faster filtering
CREATE INDEX idx_client_inquiries_status ON client_inquiries(status);

-- Create index on submitted_by_id
CREATE INDEX idx_client_inquiries_submitted_by ON client_inquiries(submitted_by_id);

-- Create index on created_at for sorting
CREATE INDEX idx_client_inquiries_created_at ON client_inquiries(created_at DESC);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_inquiry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inquiry_timestamp
BEFORE UPDATE ON client_inquiries
FOR EACH ROW
EXECUTE FUNCTION update_inquiry_updated_at();

-- Sample data (optional - for testing)
INSERT INTO client_inquiries (
    client_name,
    company_name,
    mobile_number,
    email,
    work_type,
    notes,
    status,
    submitted_by,
    submitted_by_id
) VALUES
(
    'Rajesh Kumar',
    'Kumar Traders Pvt. Ltd.',
    '9876543210',
    'rajesh@kumartraders.com',
    'GST Filing',
    'Need monthly GST return filing services',
    'Pending Review',
    'Staff Member',
    2
),
(
    'Priya Patel',
    'Patel Enterprises',
    '9123456789',
    'priya@patelenterprises.in',
    'Audit',
    'Annual audit required for FY 2025-26',
    'Pending Review',
    'Staff Member',
    2
);

-- Grant permissions (adjust as needed)
-- ALTER TABLE client_inquiries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE client_inquiries IS 'Stores client inquiries before approval and conversion to clients';
COMMENT ON COLUMN client_inquiries.status IS 'Current status: Pending Review, Approved, or Rejected';
COMMENT ON COLUMN client_inquiries.work_type IS 'Type of service requested: GST Filing, Audit, Income Tax, etc.';
COMMENT ON COLUMN client_inquiries.reviewed_at IS 'Timestamp when partner reviewed the inquiry';
