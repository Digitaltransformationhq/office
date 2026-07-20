-- SECURITY: stop the public anon key from reading the database directly.
--
-- Run this in the Supabase SQL editor. It is safe to re-run.
--
-- THE PROBLEM
--
-- `users`, `tasks` and `clients` had no row level security, so anyone holding
-- the anon key could read every row over the REST API without logging in. That
-- key is not a secret: it is committed at utils/supabase/info.tsx and shipped to
-- every browser that loads the app. `users` also stores a plaintext `password`
-- column, so every account's password was retrievable by anyone who found the
-- endpoint. `notifications`, `push_subscriptions` and the KV table already had
-- RLS enabled, which is why they returned nothing.
--
-- WHY THIS DOES NOT BREAK THE APP
--
-- Nothing in the frontend talks to Postgres directly — every read and write goes
-- through the edge function, which authenticates with SUPABASE_SERVICE_ROLE_KEY.
-- The service role bypasses RLS entirely, so enabling it with no policies denies
-- the anon key while leaving the application untouched.
--
-- Deliberately NO policies are created. A table with RLS on and no policy denies
-- everything to anon and authenticated roles, which is exactly what is wanted
-- here: there is no direct client access to permit.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Same treatment for the auxiliary tables, if they exist in this environment.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'login_history', 'password_reset_otps', 'task_assignments',
    'leave_applications', 'leave_balance', 'time_logs', 'attendance',
    'documents', 'queries', 'query_responses', 'approvals', 'inquiries'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ── Passwords ────────────────────────────────────────────────────────────────
-- Hashing is handled by the edge function, not here: on the next successful
-- login each plaintext password is verified and then rewritten as
-- PBKDF2-SHA256 (see hashPassword/upgradePasswordHash in
-- supabase/functions/server/index.tsx), so nobody is locked out mid-migration.
--
-- To see who is still on a plaintext password:
--
--   SELECT name, email,
--          (password LIKE 'pbkdf2$%') AS hashed
--   FROM users ORDER BY hashed, name;
--
-- IMPORTANT: hashing protects passwords from here on. It cannot undo the
-- exposure that already happened — these passwords were publicly readable and
-- must be treated as compromised. Every account should be given a NEW password,
-- and they should not all share one.
