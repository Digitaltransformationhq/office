-- ============================================
-- TASK ASSIGNMENT SYSTEM WITH ACCEPTANCE WORKFLOW
-- ============================================
-- Run this in Supabase SQL Editor

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  task_name TEXT NOT NULL,
  client_name TEXT,
  category TEXT,
  priority TEXT DEFAULT 'Medium',
  assigned_from_id TEXT NOT NULL,
  assigned_from_name TEXT NOT NULL,
  assigned_to_id TEXT NOT NULL,
  assigned_to_name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Completed')),
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (assigned_from_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notifications table for partner intimations
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  assignment_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES task_assignments(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_from ON task_assignments(assigned_from_id);
CREATE INDEX IF NOT EXISTS idx_assignments_to ON task_assignments(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_assignments_updated_at ON task_assignments;
CREATE TRIGGER update_task_assignments_updated_at
    BEFORE UPDATE ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_updated_at();

-- Function to notify partners when assignment is created or updated
CREATE OR REPLACE FUNCTION notify_partners_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    partner_record RECORD;
    notification_id TEXT;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Determine notification content based on operation
    IF TG_OP = 'INSERT' THEN
        notification_title := 'New Task Assignment';
        notification_message := NEW.assigned_from_name || ' assigned "' || NEW.task_name || '" to ' || NEW.assigned_to_name;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'Accepted' THEN
            notification_title := 'Assignment Accepted';
            notification_message := NEW.assigned_to_name || ' accepted "' || NEW.task_name || '" from ' || NEW.assigned_from_name;
        ELSIF NEW.status = 'Rejected' THEN
            notification_title := 'Assignment Rejected';
            notification_message := NEW.assigned_to_name || ' rejected "' || NEW.task_name || '" from ' || NEW.assigned_from_name;
        ELSIF NEW.status = 'Completed' THEN
            notification_title := 'Assignment Completed';
            notification_message := NEW.assigned_to_name || ' completed "' || NEW.task_name || '"';
        ELSE
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    -- Notify all partners and admin
    FOR partner_record IN
        SELECT id FROM users WHERE role IN ('partner', 'admin', 'Partner', 'Admin')
    LOOP
        notification_id := 'notif:' || substring(md5(random()::text) from 1 for 16);

        INSERT INTO notifications (
            id, user_id, type, title, message, assignment_id, is_read, created_at
        ) VALUES (
            notification_id,
            partner_record.id,
            'assignment',
            notification_title,
            notification_message,
            NEW.id,
            FALSE,
            NOW()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to notify partners
DROP TRIGGER IF EXISTS notify_partners_on_assignment_change ON task_assignments;
CREATE TRIGGER notify_partners_on_assignment_change
    AFTER INSERT OR UPDATE ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_partners_on_assignment();

-- Sample test assignment (will be deleted)
DO $$
DECLARE
    test_assignment_id TEXT;
    test_user1 TEXT;
    test_user2 TEXT;
BEGIN
    -- Get two user IDs for testing
    SELECT id INTO test_user1 FROM users LIMIT 1;
    SELECT id INTO test_user2 FROM users LIMIT 1 OFFSET 1;

    IF test_user1 IS NOT NULL AND test_user2 IS NOT NULL THEN
        test_assignment_id := 'assign:test_' || FLOOR(RANDOM() * 1000000)::TEXT;

        -- Create test assignment
        INSERT INTO task_assignments (
            id, task_name, client_name, category, priority,
            assigned_from_id, assigned_from_name,
            assigned_to_id, assigned_to_name,
            status, notes, assigned_at, created_at, updated_at
        ) VALUES (
            test_assignment_id,
            'Test Assignment - Will be Deleted',
            'Test Client',
            'Income Tax',
            'Medium',
            test_user1,
            (SELECT name FROM users WHERE id = test_user1),
            test_user2,
            (SELECT name FROM users WHERE id = test_user2),
            'Pending',
            'This is a test assignment',
            NOW(),
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ Test assignment created: %', test_assignment_id;

        -- Delete test assignment
        DELETE FROM task_assignments WHERE id = test_assignment_id;
        RAISE NOTICE '✅ Test assignment deleted';
    END IF;
END $$;

-- Verification queries
SELECT 'Task Assignments Table Structure:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'task_assignments'
ORDER BY ordinal_position;

SELECT 'Notifications Table Structure:' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ TASK ASSIGNMENT SYSTEM READY!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ task_assignments table created';
    RAISE NOTICE '✓ notifications table created';
    RAISE NOTICE '✓ Indexes created';
    RAISE NOTICE '✓ Triggers configured';
    RAISE NOTICE '✓ Partner notification system active';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now assign tasks to others!';
    RAISE NOTICE 'Partners will be notified automatically!';
    RAISE NOTICE '';
END $$;
