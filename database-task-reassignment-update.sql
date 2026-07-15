-- ============================================
-- TASK REASSIGNMENT SYSTEM - UPDATE EXISTING TASKS TABLE
-- ============================================
-- This adds reassignment capability to the existing tasks table
-- Run this in Supabase SQL Editor

-- Add new columns for reassignment tracking
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS originally_assigned_by_id TEXT,
ADD COLUMN IF NOT EXISTS originally_assigned_by_name TEXT,
ADD COLUMN IF NOT EXISTS reassigned_from_id TEXT,
ADD COLUMN IF NOT EXISTS reassigned_from_name TEXT,
ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'Accepted' CHECK (assignment_status IN ('Pending Acceptance', 'Accepted', 'Rejected')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraints
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS fk_tasks_originally_assigned_by;

ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_originally_assigned_by
FOREIGN KEY (originally_assigned_by_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS fk_tasks_reassigned_from;

ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_reassigned_from
FOREIGN KEY (reassigned_from_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for assignment status
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_status ON tasks(assignment_status);
CREATE INDEX IF NOT EXISTS idx_tasks_originally_assigned_by ON tasks(originally_assigned_by_id);

-- Update existing tasks to have 'Accepted' assignment status
UPDATE tasks
SET assignment_status = 'Accepted'
WHERE assignment_status IS NULL;

-- Function to notify partners when task is reassigned or status changes
CREATE OR REPLACE FUNCTION notify_partners_on_task_reassignment()
RETURNS TRIGGER AS $$
DECLARE
    partner_record RECORD;
    notification_id TEXT;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Only notify if task is reassigned or assignment status changes
    IF TG_OP = 'UPDATE' THEN
        -- Task reassigned to someone else
        IF OLD.assigned_to_id != NEW.assigned_to_id AND NEW.reassigned_from_id IS NOT NULL THEN
            notification_title := 'Task Reassigned';
            notification_message := NEW.reassigned_from_name || ' reassigned "' || NEW.task || '" (Client: ' || NEW.client || ') to ' || NEW.assigned_to;

            -- Notify all partners
            FOR partner_record IN
                SELECT id FROM users WHERE role IN ('partner', 'admin', 'Partner', 'Admin')
            LOOP
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    partner_record.id,
                    'task_reassignment',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END LOOP;

            -- Also notify the original assigner
            IF NEW.originally_assigned_by_id IS NOT NULL THEN
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    NEW.originally_assigned_by_id,
                    'task_reassignment',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END IF;

        -- Assignment accepted
        ELSIF OLD.assignment_status = 'Pending Acceptance' AND NEW.assignment_status = 'Accepted' THEN
            notification_title := 'Task Assignment Accepted';
            notification_message := NEW.assigned_to || ' accepted the task "' || NEW.task || '" (Client: ' || NEW.client || ')';

            -- Notify partners
            FOR partner_record IN
                SELECT id FROM users WHERE role IN ('partner', 'admin', 'Partner', 'Admin')
            LOOP
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    partner_record.id,
                    'task_acceptance',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END LOOP;

            -- Notify the person who reassigned
            IF NEW.reassigned_from_id IS NOT NULL THEN
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    NEW.reassigned_from_id,
                    'task_acceptance',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END IF;

            -- Notify the original assigner
            IF NEW.originally_assigned_by_id IS NOT NULL AND NEW.originally_assigned_by_id != NEW.reassigned_from_id THEN
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    NEW.originally_assigned_by_id,
                    'task_acceptance',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END IF;

        -- Assignment rejected
        ELSIF OLD.assignment_status = 'Pending Acceptance' AND NEW.assignment_status = 'Rejected' THEN
            notification_title := 'Task Assignment Rejected';
            notification_message := NEW.assigned_to || ' rejected the task "' || NEW.task || '" (Client: ' || NEW.client || ')';
            IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN
                notification_message := notification_message || '. Reason: ' || NEW.rejection_reason;
            END IF;

            -- Notify partners
            FOR partner_record IN
                SELECT id FROM users WHERE role IN ('partner', 'admin', 'Partner', 'Admin')
            LOOP
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    partner_record.id,
                    'task_rejection',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END LOOP;

            -- Notify the person who reassigned
            IF NEW.reassigned_from_id IS NOT NULL THEN
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    NEW.reassigned_from_id,
                    'task_rejection',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END IF;

            -- Notify the original assigner
            IF NEW.originally_assigned_by_id IS NOT NULL AND NEW.originally_assigned_by_id != NEW.reassigned_from_id THEN
                notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

                INSERT INTO notifications (
                    id, user_id, type, title, message, assignment_id, is_read, created_at
                ) VALUES (
                    notification_id,
                    NEW.originally_assigned_by_id,
                    'task_rejection',
                    notification_title,
                    notification_message,
                    NEW.id,
                    FALSE,
                    NOW()
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task reassignment notifications
DROP TRIGGER IF EXISTS notify_partners_on_task_change ON tasks;
CREATE TRIGGER notify_partners_on_task_change
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_partners_on_task_reassignment();

-- Verification
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name IN (
        'originally_assigned_by_id',
        'originally_assigned_by_name',
        'reassigned_from_id',
        'reassigned_from_name',
        'assignment_status',
        'rejection_reason',
        'reassigned_at'
    )
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ TASK REASSIGNMENT SYSTEM READY!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Tasks table updated with reassignment columns';
    RAISE NOTICE '✓ Partner notification trigger created';
    RAISE NOTICE '✓ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Staff can now reassign tasks to others!';
    RAISE NOTICE 'Partners notified when tasks reassigned!';
    RAISE NOTICE '';
END $$;
