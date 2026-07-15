-- ============================================
-- WEB PUSH SUBSCRIPTIONS
-- Stores each browser's push subscription so the server can deliver
-- notifications even when the site/tab is closed.
-- Run this once in the Supabase SQL editor.
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  subscription TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
