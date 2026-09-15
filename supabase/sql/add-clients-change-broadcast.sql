-- Tells every open screen that the client list changed, whoever changed it.
--
-- The edge function already broadcasts after it adds or edits a client. That
-- misses every change made anywhere else: an import run as SQL, a row deleted
-- in the Supabase dashboard, a clean-up query. Those screens only caught up on
-- their 45-second fallback poll, so the Client Master count sat at the old
-- number in the meantime.
--
-- A trigger sees all of them. It sends the same bare ping the edge function
-- does — topic 'clients' on the public 'office-changes' channel, no row data —
-- so the app refetches through its normal authorised endpoint and nothing about
-- the rows themselves travels over the socket. See src/app/services/realtime.ts.
--
-- FOR EACH STATEMENT, not per row: an import of 500 clients is one ping, not 500
-- refetches of a 1264-row list.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.broadcast_office_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- The topic is the trigger's argument, so one function serves any table.
  PERFORM realtime.send(
    jsonb_build_object('topic', TG_ARGV[0]),
    'changed',
    'office-changes',
    FALSE
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- A failed ping must never fail the write that caused it; screens still poll.
  RAISE WARNING 'broadcast_office_change(%) failed: %', TG_ARGV[0], SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_office_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS broadcast_clients_change ON public.clients;
CREATE TRIGGER broadcast_clients_change
  AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.clients
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.broadcast_office_change('clients');
