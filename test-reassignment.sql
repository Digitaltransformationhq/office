-- ============================================
-- TEST TASK REASSIGNMENT
-- ============================================
-- This script tests the reassignment flow:
-- 1. Creates a test task assigned to Krunal
-- 2. Reassigns it to Kishan
-- 3. Shows it should appear for Kishan with "Pending Acceptance"
-- 4. Shows notifications for partners

-- Get user IDs
DO $$
DECLARE
    krunal_id TEXT;
    kishan_id TEXT;
    partner_id TEXT;
    test_task_id TEXT;
BEGIN
    -- Get Krunal's ID
    SELECT id INTO krunal_id FROM users WHERE email = 'caoffice@kapsca.in';

    -- Get Kishan's ID
    SELECT id INTO kishan_id FROM users WHERE email = 'kishansolanki3732@gmail.com';

    -- Get a partner ID
    SELECT id INTO partner_id FROM users WHERE role IN ('partner', 'Partner') LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'USER IDS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Krunal ID: %', krunal_id;
    RAISE NOTICE 'Kishan ID: %', kishan_id;
    RAISE NOTICE 'Partner ID: %', partner_id;

    IF krunal_id IS NULL THEN
        RAISE NOTICE '❌ Krunal not found in database!';
        RETURN;
    END IF;

    IF kishan_id IS NULL THEN
        RAISE NOTICE '❌ Kishan not found in database!';
        RETURN;
    END IF;

    -- Create a test task assigned to Krunal
    test_task_id := 'task:test_' || FLOOR(RANDOM() * 1000000)::TEXT;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING TEST TASK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Task ID: %', test_task_id;

    INSERT INTO tasks (
        id,
        client,
        task,
        category,
        assigned_to,
        assigned_to_id,
        priority,
        status,
        assignment_status,
        originally_assigned_by_id,
        originally_assigned_by_name,
        start_date,
        target_date
    ) VALUES (
        test_task_id,
        'Test Client ABC',
        'Test Task - ITR Filing',
        'Income Tax',
        'Krunal Roy',
        krunal_id,
        'High',
        'Pending',
        'Accepted',  -- Initially accepted
        partner_id,
        (SELECT name FROM users WHERE id = partner_id),
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days'
    );

    RAISE NOTICE '✅ Task created and assigned to Krunal';

    -- Now reassign from Krunal to Kishan
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REASSIGNING TASK';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'From: Krunal Roy';
    RAISE NOTICE 'To: Kishan Solanki';

    UPDATE tasks
    SET
        assigned_to = 'Kishan Solanki',
        assigned_to_id = kishan_id,
        assignment_status = 'Pending Acceptance',
        reassigned_from_id = krunal_id,
        reassigned_from_name = 'Krunal Roy',
        reassigned_at = NOW()
    WHERE id = test_task_id;

    RAISE NOTICE '✅ Task reassigned to Kishan';

    -- Wait a moment for trigger to fire
    PERFORM pg_sleep(0.5);

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
END $$;

-- Show the updated task
SELECT
    'Updated Task Details' as info,
    id,
    client,
    task,
    assigned_to,
    assigned_to_id,
    assignment_status,
    reassigned_from_name,
    originally_assigned_by_name
FROM tasks
WHERE task LIKE 'Test Task%'
ORDER BY created_at DESC
LIMIT 1;

-- Show notifications created
SELECT
    'Notifications Created' as info,
    n.id,
    u.name as notified_user,
    u.role,
    n.type,
    n.title,
    n.message,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'task_reassignment'
    AND n.message LIKE '%Test Task%'
ORDER BY n.created_at DESC;

-- Show what Kishan should see
SELECT
    'What Kishan Should See' as info,
    id,
    client,
    task,
    category,
    priority,
    assignment_status,
    status,
    reassigned_from_name
FROM tasks
WHERE assigned_to_id = (SELECT id FROM users WHERE email = 'kishansolanki3732@gmail.com')
    AND task LIKE 'Test Task%';

-- Show what Partners should see in notifications
SELECT
    'What Partners Should See' as info,
    u.name as partner_name,
    u.email,
    n.title,
    n.message,
    n.is_read
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.role IN ('partner', 'Partner', 'admin', 'Admin')
    AND n.message LIKE '%Test Task%'
ORDER BY u.name;

-- Summary
DO $$
DECLARE
    task_count INTEGER;
    notification_count INTEGER;
    partner_notification_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST SUMMARY';
    RAISE NOTICE '========================================';

    -- Count tasks for Kishan with Pending Acceptance
    SELECT COUNT(*) INTO task_count
    FROM tasks
    WHERE assigned_to_id = (SELECT id FROM users WHERE email = 'kishansolanki3732@gmail.com')
        AND assignment_status = 'Pending Acceptance'
        AND task LIKE 'Test Task%';

    -- Count all notifications
    SELECT COUNT(*) INTO notification_count
    FROM notifications
    WHERE type = 'task_reassignment'
        AND message LIKE '%Test Task%';

    -- Count partner notifications
    SELECT COUNT(*) INTO partner_notification_count
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    WHERE u.role IN ('partner', 'Partner', 'admin', 'Admin')
        AND n.type = 'task_reassignment'
        AND n.message LIKE '%Test Task%';

    RAISE NOTICE 'Tasks visible to Kishan with Pending Acceptance: %', task_count;
    RAISE NOTICE 'Total notifications created: %', notification_count;
    RAISE NOTICE 'Partner notifications created: %', partner_notification_count;
    RAISE NOTICE '';

    IF task_count > 0 THEN
        RAISE NOTICE '✅ Kishan can see the task';
    ELSE
        RAISE NOTICE '❌ Kishan CANNOT see the task';
    END IF;

    IF partner_notification_count > 0 THEN
        RAISE NOTICE '✅ Partners were notified';
    ELSE
        RAISE NOTICE '❌ Partners were NOT notified';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'To view in UI:';
    RAISE NOTICE '1. Login as kishansolanki3732@gmail.com';
    RAISE NOTICE '2. Go to Tasks tab';
    RAISE NOTICE '3. Click "Pending Acceptance" filter';
    RAISE NOTICE '4. You should see "Test Task - ITR Filing"';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- Cleanup instructions
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'To clean up test data, run:';
    RAISE NOTICE 'DELETE FROM tasks WHERE task LIKE ''Test Task%'';';
    RAISE NOTICE '';
END $$;
