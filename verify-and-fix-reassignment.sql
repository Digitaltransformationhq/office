-- ============================================
-- VERIFICATION AND FIX SCRIPT
-- ============================================
-- This script checks if reassignment system is properly set up
-- and shows current task assignments

-- Step 1: Check if reassignment columns exist
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 1: Checking Task Table Structure';
    RAISE NOTICE '========================================';
END $$;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
    AND column_name IN (
        'assignment_status',
        'originally_assigned_by_id',
        'originally_assigned_by_name',
        'reassigned_from_id',
        'reassigned_from_name',
        'rejection_reason',
        'reassigned_at'
    )
ORDER BY column_name;

-- Step 2: Check if notifications table exists
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 2: Checking Notifications Table';
    RAISE NOTICE '========================================';
END $$;

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Step 3: Check if trigger exists
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 3: Checking Triggers';
    RAISE NOTICE '========================================';
END $$;

SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'tasks'
    AND trigger_name LIKE '%notify%';

-- Step 4: Show current tasks and their assignment status
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 4: Current Tasks Status';
    RAISE NOTICE '========================================';
END $$;

SELECT
    id,
    client,
    task,
    assigned_to,
    assigned_to_id,
    COALESCE(assignment_status, 'Not Set') as assignment_status,
    status,
    reassigned_from_name,
    originally_assigned_by_name
FROM tasks
ORDER BY created_at DESC;

-- Step 5: Show all users (for reference)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 5: All Users';
    RAISE NOTICE '========================================';
END $$;

SELECT
    id,
    name,
    email,
    role
FROM users
ORDER BY
    CASE role
        WHEN 'Partner' THEN 1
        WHEN 'partner' THEN 1
        WHEN 'Admin' THEN 2
        WHEN 'admin' THEN 2
        ELSE 3
    END,
    name;

-- Step 6: Show recent notifications
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 6: Recent Notifications';
    RAISE NOTICE '========================================';
END $$;

SELECT
    n.id,
    u.name as user_name,
    u.role,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================
-- DIAGNOSTIC SUMMARY
-- ============================================
DO $$
DECLARE
    has_assignment_status BOOLEAN;
    has_notifications_table BOOLEAN;
    has_trigger BOOLEAN;
    pending_tasks INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC SUMMARY';
    RAISE NOTICE '========================================';

    -- Check assignment_status column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'assignment_status'
    ) INTO has_assignment_status;

    -- Check notifications table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'notifications'
    ) INTO has_notifications_table;

    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'notify_partners_on_task_change'
    ) INTO has_trigger;

    -- Count pending acceptance tasks
    IF has_assignment_status THEN
        SELECT COUNT(*) INTO pending_tasks
        FROM tasks
        WHERE assignment_status = 'Pending Acceptance';
    ELSE
        pending_tasks := 0;
    END IF;

    -- Report results
    IF has_assignment_status THEN
        RAISE NOTICE '✅ assignment_status column exists';
    ELSE
        RAISE NOTICE '❌ assignment_status column MISSING - Run database-task-reassignment-update.sql';
    END IF;

    IF has_notifications_table THEN
        RAISE NOTICE '✅ notifications table exists';
    ELSE
        RAISE NOTICE '❌ notifications table MISSING - Run database-task-reassignment-update.sql';
    END IF;

    IF has_trigger THEN
        RAISE NOTICE '✅ notification trigger exists';
    ELSE
        RAISE NOTICE '❌ notification trigger MISSING - Run database-task-reassignment-update.sql';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Pending Acceptance Tasks: %', pending_tasks;
    RAISE NOTICE '';

    IF has_assignment_status AND has_notifications_table AND has_trigger THEN
        RAISE NOTICE '✅✅✅ ALL SYSTEMS READY!';
    ELSE
        RAISE NOTICE '⚠️ MISSING COMPONENTS - Run database-task-reassignment-update.sql';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
