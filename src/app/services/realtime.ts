import { RealtimeClient, type RealtimeChannel } from '@supabase/realtime-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

/**
 * Live updates over a websocket, without reopening the database.
 *
 * The obvious approach — subscribing to `postgres_changes` — enforces RLS, and
 * our users are not Supabase-authenticated (the app has its own login), so they
 * connect as `anon`. Delivering table changes to them would mean granting anon
 * SELECT on users/tasks/clients, undoing the lockdown in
 * enable-rls-and-hash-passwords.sql.
 *
 * So the server broadcasts a bare "this changed" ping carrying no row data, and
 * clients refetch through the normal API, which is authorised and returns only
 * what that endpoint allows. A listener on this channel learns that activity
 * happened, never what.
 *
 * One connection is shared by the whole app: a channel per component would open
 * a dozen sockets for the same information.
 *
 * Uses @supabase/realtime-js rather than the full supabase-js client, which
 * would drag auth, storage and postgrest into the bundle for a feature that
 * needs none of them.
 */

export type ChangeTopic =
  | 'tasks'
  | 'clients'
  | 'users'
  | 'billing'
  | 'notifications'
  | 'announcements'
  | 'inquiries';

const CHANNEL = 'office-changes';
const EVENT = 'changed';

const client = new RealtimeClient(`wss://${projectId}.supabase.co/realtime/v1`, {
  params: {
    apikey: publicAnonKey,
    // Nothing here is chatty; this only caps a pathological burst.
    eventsPerSecond: 10,
  },
});

type Listener = (topic: ChangeTopic) => void;
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

function ensureChannel() {
  if (channel) return;
  channel = client
    .channel(CHANNEL)
    .on('broadcast', { event: EVENT }, (msg) => {
      const topic = (msg.payload as { topic?: ChangeTopic })?.topic;
      if (!topic) return;
      listeners.forEach((fn) => {
        try {
          fn(topic);
        } catch (e) {
          console.error('realtime listener failed:', e);
        }
      });
    })
    .subscribe();
}

/**
 * Call `onChange` whenever the server reports that one of `topics` changed.
 * Returns an unsubscribe function.
 *
 * The socket is best-effort by design: if it never connects, callers still have
 * their polling fallback and simply behave as they did before.
 */
export function onChanges(topics: ChangeTopic[], onChange: () => void) {
  ensureChannel();
  const wanted = new Set(topics);
  const listener: Listener = (topic) => {
    if (wanted.has(topic)) onChange();
  };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // The channel is left open deliberately: screens mount and unmount as the
    // user navigates, and tearing the socket down each time would mean a
    // reconnect on every view change.
  };
}
