-- Apply to existing databases before using Discontinued in the GST register.
-- Pending remains valid for existing rows and untouched periods.
BEGIN;

ALTER TABLE gst_filings DROP CONSTRAINT IF EXISTS gst_filings_status_check;
ALTER TABLE gst_filings ADD CONSTRAINT gst_filings_status_check
  CHECK (status IN ('Pending', 'Message Sent', 'Data Not Provided', 'Data Received',
                   'OTP Awaited', 'Challan Sent', 'Nil', 'Filed', 'Not Applicable',
                   'Discontinued'));

COMMIT;
