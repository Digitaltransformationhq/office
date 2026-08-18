/**
 * When a line on a personal to-do list is for, and what that does to its place
 * in the list.
 *
 * THE ORDERING RULE
 *
 * The list is a pad. Items sit in the order they were written, and that order is
 * deliberate — the thing you have been putting off keeps its place at the top
 * rather than being buried by everything typed since. Re-sorting the whole list
 * by date would throw that away.
 *
 * So only what is actually live gets hoisted: anything due today, or already
 * past, rises to the top in time order. A line for Friday shows its date and
 * otherwise stays exactly where it was written until Friday, when it climbs on
 * its own.
 *
 * That is the whole of the dynamic part. Four o'clock reaches the top of the
 * list as four o'clock approaches, because by then it is the nearest live thing
 * — not because anything re-ranked it.
 */

export interface TodoDue {
  /** 'YYYY-MM-DD', or null for a line with no day attached. */
  dueOn?: string | null;
  /** 'HH:MM', or null for a day with no particular hour. */
  dueTime?: string | null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The moment a line falls due, or null if it carries no date.
 *
 * Assembled from the parts rather than parsed from a string: `new Date('2026-08-17')`
 * is read as UTC, which in IST is half past five that morning — so a line for
 * "today" would already be hours overdue before anyone looked at it.
 *
 * With no hour given it is the end of that day. A note to call someone on
 * Thursday is not late at nine on Thursday morning.
 */
export function todoDueAt(item: TodoDue): Date | null {
  if (!item.dueOn) return null;
  const [y, m, d] = item.dueOn.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;

  if (item.dueTime) {
    const [hh, mm] = item.dueTime.split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  }
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Due today or already past — the only things that jump the queue. */
export function isLive(item: TodoDue, now: number): boolean {
  const due = todoDueAt(item);
  if (!due) return false;
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return due.getTime() <= endOfToday.getTime();
}

export type TodoUrgency = 'overdue' | 'imminent' | 'today' | 'upcoming' | 'none';

export function todoUrgency(item: TodoDue, now: number): TodoUrgency {
  const due = todoDueAt(item);
  if (!due) return 'none';
  const ms = due.getTime() - now;
  if (ms < 0) return 'overdue';
  // An hour out is the point where something stops being "later today" and
  // starts being the thing you should be getting up for.
  if (ms <= HOUR) return 'imminent';
  if (isLive(item, now)) return 'today';
  return 'upcoming';
}

/**
 * Live items first, soonest first; everything else left exactly as it came.
 *
 * Stable on purpose — the untouched tail has to keep the order the list was
 * written in, and two items due the same minute must not swap places every time
 * the clock ticks.
 */
export function sortTodosByDue<T extends TodoDue>(items: T[], now: number): T[] {
  return items
    .map((item, i) => ({ item, i, live: isLive(item, now) }))
    .sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      if (!a.live) return a.i - b.i;
      const da = todoDueAt(a.item)!.getTime();
      const db = todoDueAt(b.item)!.getTime();
      return da - db || a.i - b.i;
    })
    .map(x => x.item);
}

/**
 * How it reads: "in 25 min", "20 min ago", "Today 4:00 pm", "Fri", "12 Sep".
 *
 * Counting down only where a countdown says more than the clock does. Past a few
 * hours "in 3 days" is a worse way of saying "Friday".
 */
export function todoDueLabel(item: TodoDue, now: number): string {
  const due = todoDueAt(item);
  if (!due) return '';

  const timed = !!item.dueTime;
  const ms = due.getTime() - now;
  const abs = Math.abs(ms);

  // Within the hour either way, and only when an hour was actually set: an
  // untimed line has no minute to count down to.
  if (timed && abs < HOUR) {
    const mins = Math.max(1, Math.round(abs / MINUTE));
    return ms < 0 ? `${mins} min ago` : `in ${mins} min`;
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((due.getTime() - startOfToday.getTime()) / DAY);
  const clock = timed
    ? due.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : '';

  if (days === 0) return timed ? clock : 'Today';
  if (days === 1) return timed ? `Tomorrow ${clock}` : 'Tomorrow';
  if (days === -1) return timed ? `Yesterday ${clock}` : 'Yesterday';
  if (days < 0) return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  // Inside the week ahead, the weekday is the most readable thing there is.
  if (days < 7) {
    const weekday = due.toLocaleDateString('en-IN', { weekday: 'short' });
    return timed ? `${weekday} ${clock}` : weekday;
  }
  return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Chip colours, matching how the rest of the app reads urgency. */
export const TODO_URGENCY_CLASS: Record<TodoUrgency, string> = {
  overdue: 'border-red-200 bg-red-50 text-red-700',
  imminent: 'border-red-200 bg-red-50 text-red-700',
  today: 'border-amber-200 bg-amber-50 text-amber-700',
  upcoming: 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground',
  none: 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground',
};
