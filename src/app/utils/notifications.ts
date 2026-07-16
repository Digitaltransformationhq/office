/**
 * Where a notification sends you.
 *
 * A notification only knows its `type` — the notifications table has no usable
 * reference to the entity it's about — so this resolves to a section rather
 * than an individual task.
 *
 * Shared by the in-app bell and the push handler so the two can't drift: the
 * server puts the raw `type` in the push URL and the client resolves it here.
 * Every type here is reachable by every role — 'announcements' renders the
 * read-only list for non-admins and the management page for admins.
 */
const VIEW_BY_TYPE: Record<string, string> = {
  task: 'task-mis',
  assignment: 'task-mis',
  task_reassignment: 'task-mis',
  task_acceptance: 'task-mis',
  task_rejection: 'task-mis',
  announcement: 'announcements',
};

/** The view a notification opens, or null for an unrecognized type. */
export function viewForType(type: string): string | null {
  return VIEW_BY_TYPE[type] ?? null;
}

/** Query param the service worker uses to hand a notification type to the app. */
export const NOTIF_PARAM = 'notif';

/** Read a notification type out of a URL the service worker opened. */
export function typeFromUrl(url: string): string | null {
  try {
    return new URL(url, window.location.origin).searchParams.get(NOTIF_PARAM);
  } catch {
    return null;
  }
}
