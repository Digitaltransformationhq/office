import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, ListChecks, Check, History, Clock, CalendarPlus } from 'lucide-react';
import { useToast } from './Toast';
import { TodoArchiveModal } from './TodoArchiveModal';
import { todosAPI, type Todo } from '../services/api';
import { today } from '../utils/gst';
import { useNow } from '../hooks/useNow';
import {
  sortTodosByDue, todoDueLabel, todoUrgency, todoDueAt, TODO_URGENCY_CLASS,
} from '../utils/todoUrgency';

const NAVY = '#1b365d';

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const whenInputCls =
  'rounded-md border border-[#E7EDF4] bg-white px-2 py-1 text-[0.75rem] text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

interface DailyTodoListProps {
  user?: { id: string; name?: string } | null;
}

/**
 * A private daily list, on the dashboard.
 *
 * Not a task and not a calendar entry — see supabase/sql/add-personal-todos.sql
 * for why those were both the wrong home. This is the paper pad next to the
 * keyboard: type a line, tick it off, and nobody else ever sees it.
 *
 * Three things it does that the pad cannot.
 *
 * Unfinished items roll over. A job you did not get to does not stop existing at
 * midnight, and anything carried from an earlier day says so — which is the
 * quiet nudge a fresh page every morning loses.
 *
 * Ticked items stay struck through until the end of the day. Clearing them the
 * instant they are done would be tidier and worse: seeing the four things you
 * got through is most of the reason to keep a list at all. Come tomorrow they
 * are gone from here but not gone — the archive behind the clock icon keeps
 * every one of them, by day, for when somebody has to account for a week.
 *
 * And every tick is applied on screen before the server is asked. A list that
 * pauses on each tick is a list people stop ticking.
 *
 * A line can also carry a day and an hour, and most never will. The clock button
 * beside the input is shut until you press it, because the whole speed of this
 * thing is that a line costs one sentence and the Enter key. Given a time, an
 * item counts down and — once its day arrives — climbs to the top of the list on
 * its own, so four o'clock is at the top by four o'clock without anyone
 * reordering anything.
 */
export function DailyTodoList({ user }: DailyTodoListProps) {
  const { showError } = useToast();

  const [items, setItems] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  /** The optional when, for the line being typed. Shut until asked for. */
  const [showWhen, setShowWhen] = useState(false);
  const [draftDate, setDraftDate] = useState('');
  const [draftTime, setDraftTime] = useState('');
  /** The item whose date is being changed, if any. */
  const [scheduling, setScheduling] = useState<{ id: string; date: string; time: string } | null>(null);

  /** Ticks every minute: what makes an item climb as its hour comes round. */
  const now = useNow();

  /*
   * What the composer says about the day being chosen.
   *
   * Read straight off the draft rather than stored, so the button, the helper
   * line and what actually gets saved cannot drift apart — they are three
   * readings of one pair of fields.
   */
  const hasWhen = !!draftDate || !!draftTime;
  const tomorrowIso = useMemo(() => {
    const d = new Date(`${todayIso}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [todayIso]);
  const draftWhenLabel = hasWhen
    // A time with no day is today, and the label has to say the same thing the
    // save does — otherwise the button reads "4:00 pm" and files it elsewhere.
    ? todoDueLabel({ dueOn: draftDate || todayIso, dueTime: draftTime || null }, now)
    : "";

  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * The day boundary, which has to move on its own.
   *
   * Read once at render it would freeze at whatever day the dashboard was
   * opened — and people leave this screen open overnight. Yesterday's ticked
   * items would still be sitting there this morning, and worse, ticking
   * something today would stamp it with yesterday's date and then hide it,
   * so the tick would look like it had simply failed.
   *
   * Checked on the minute, and again whenever the tab is returned to, because a
   * laptop that was asleep at midnight fires no timers.
   */
  const [todayIso, setTodayIso] = useState(today());
  useEffect(() => {
    const sync = () => setTodayIso(current => (current === today() ? current : today()));
    const timer = setInterval(sync, 60_000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let live = true;
    (async () => {
      try {
        const r = await todosAPI.getMine(user.id);
        if (live && r.success) setItems(r.data);
      } catch {
        /* A dashboard panel that shouts about a failed fetch is worse than one
           that quietly shows nothing; the retry is a page refresh away. */
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const { open, doneToday } = useMemo(() => ({
    // Anything due today or already past floats to the top, soonest first;
    // everything else keeps the order it was written in. See utils/todoUrgency.
    open: sortTodosByDue(items.filter(i => !i.done), now),
    // Filtered here rather than on the server: only the browser knows what
    // "today" means where the person is sitting.
    doneToday: items.filter(i => i.done && i.doneOn === todayIso)
      .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')),
  }), [items, todayIso, now]);

  const add = async () => {
    const text = draft.trim();
    if (!text || !user?.id || adding) return;
    // A time with no day means today — that is what somebody typing "4:00 pm"
    // into a daily list means, and making them also pick today's date to say it
    // would be the one bit of ceremony this list cannot afford.
    const dueOn = draftDate || (draftTime ? today() : '');
    const due = dueOn ? { dueOn, dueTime: draftTime } : {};

    setAdding(true);
    setDraft('');
    try {
      const r = await todosAPI.add(user.id, text, due);
      if (r.success && r.data) {
        setItems(prev => [...prev, r.data as Todo]);
        setDraftDate('');
        setDraftTime('');
        setShowWhen(false);
      } else { showError(r.error || 'Could not add that'); setDraft(text); }
    } catch {
      showError('Could not add that. Please try again.');
      setDraft(text);
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  };

  /**
   * Change or clear the day and hour on an item already on the list.
   *
   * Applied on screen first, like every other write here, and rolled back whole
   * if the server refuses — a half-applied date would leave the row sorted as
   * though it had one.
   */
  const saveSchedule = async () => {
    if (!scheduling || !user?.id) return;
    const original = items.find(i => i.id === scheduling.id);
    const { id, date, time } = scheduling;
    setScheduling(null);
    if (!original) return;

    const dueOn = date || (time ? today() : '');
    const dueTime = dueOn ? time : '';
    if ((original.dueOn || '') === dueOn && (original.dueTime || '') === dueTime) return;

    setItems(prev => prev.map(i => (i.id === id
      ? { ...i, dueOn: dueOn || null, dueTime: dueTime || null }
      : i)));
    try {
      const r = await todosAPI.update(id, user.id, { dueOn, dueTime });
      if (!r.success) throw new Error(r.error);
    } catch {
      setItems(prev => prev.map(i => (i.id === id ? original : i)));
      showError('Could not save that. Please try again.');
    }
  };

  /*
   * Ticking, applied on screen first.
   *
   * The row is updated before the request goes out and put back exactly as it
   * was if the request fails, so the tick is instant but never a lie about what
   * was saved.
   */
  const toggle = async (item: Todo) => {
    if (!user?.id) return;
    const next = !item.done;
    // Read fresh rather than taken from state: this is the value that gets
    // written, and it must be the day the tick actually happened even if the
    // clock has just turned over and the re-render has not landed yet.
    const stamp = today();
    if (stamp !== todayIso) setTodayIso(stamp);

    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, done: next, doneOn: next ? stamp : null, doneAt: next ? new Date().toISOString() : null }
      : i));
    try {
      const r = await todosAPI.update(item.id, user.id, { done: next, doneOn: stamp });
      if (!r.success) throw new Error(r.error);
    } catch {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)));
      showError('Could not save that. Please try again.');
    }
  };

  const remove = async (item: Todo) => {
    if (!user?.id) return;
    setItems(prev => prev.filter(i => i.id !== item.id));
    try {
      const r = await todosAPI.delete(item.id, user.id);
      if (!r.success) throw new Error(r.error);
    } catch {
      setItems(prev => [...prev, item].sort((a, b) => a.position - b.position));
      showError('Could not remove that. Please try again.');
    }
  };

  const saveEdit = async () => {
    if (!editing || !user?.id) return;
    const text = editing.text.trim();
    const original = items.find(i => i.id === editing.id);
    setEditing(null);
    if (!original || !text || text === original.body) return;

    setItems(prev => prev.map(i => (i.id === original.id ? { ...i, body: text } : i)));
    try {
      const r = await todosAPI.update(original.id, user.id, { body: text });
      if (!r.success) throw new Error(r.error);
    } catch {
      setItems(prev => prev.map(i => (i.id === original.id ? original : i)));
      showError('Could not save that. Please try again.');
    }
  };

  if (!user?.id) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
      <div className="flex items-center gap-2 border-b border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3">
        <ListChecks size={15} className="shrink-0" style={{ color: NAVY }} />
        <h3 className="text-sm font-semibold" style={{ color: NAVY }}>My To-Do List</h3>
        {/* The score, which is the point of leaving ticked items on screen. */}
        {doneToday.length > 0 && (
          <span className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[0.68rem] font-medium text-[#166534]">
            {doneToday.length} done today
          </span>
        )}
        <span className="ml-auto text-[0.68rem] text-muted-foreground">
          {open.length === 0 ? 'all clear' : `${open.length} to do`}
        </span>
        {/* Small and out of the way. Looking back is an occasional thing; the
            panel is for today, and the archive should not compete with it. */}
        <button
          onClick={() => setArchiveOpen(true)}
          title="See everything you have ticked off"
          aria-label="Open your to-do archive"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-[#EEF4FC] hover:text-[#1b365d]"
        >
          <History size={14} />
        </button>
      </div>

      {/*
        The composer.
      
        One framed field, the way a message box is framed, so it reads as
        somewhere to type rather than a line of text sitting on a panel. The Add
        button appears only once there is something to add — an always-there
        button on an empty box is a dead control, and Enter still works for
        anyone who never reaches for it.
      */}
      <div className="border-b border-[#F1F4F8] px-5 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#E7EDF4] bg-white px-3 py-2 transition focus-within:border-[#1b365d] focus-within:ring-2 focus-within:ring-[#1b365d]/10">
          <Plus size={16} className="shrink-0 text-muted-foreground/70" />
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); add(); }
              if (e.key === 'Escape' && showWhen) { e.preventDefault(); setShowWhen(false); }
            }}
            placeholder="Add something to do…"
            className="min-w-0 flex-1 bg-transparent text-[0.88rem] outline-none placeholder:text-muted-foreground/50"
            aria-label="Add to your list"
          />

          {/* Folded away by default. A pad you can type one line into is the
              point; a form with three fields is a different, worse thing. */}
          <button
            type="button"
            onClick={() => setShowWhen(v => !v)}
            title={hasWhen ? 'Change when this is for' : 'Add a day and time'}
            aria-label="Add a day and time"
            aria-pressed={showWhen}
            className={`flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[0.72rem] font-medium transition-colors ${
              hasWhen || showWhen
                ? 'bg-[#EEF4FC] text-[#1b365d]'
                : 'text-muted-foreground/70 hover:bg-[#F4F6F9] hover:text-[#1b365d]'
            }`}
          >
            <Clock size={13} />
            {/* The chosen moment, in words, right on the button — so it is
                visible without opening the panel back up. */}
            {hasWhen && <span>{draftWhenLabel}</span>}
          </button>

          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || adding}
            className={`h-7 shrink-0 rounded-lg px-3 text-[0.75rem] font-semibold transition-all ${
              draft.trim()
                ? 'bg-[#1b365d] text-white hover:bg-[#142a4a]'
                : 'pointer-events-none scale-95 opacity-0'
            }`}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {showWhen && (
          <div className="mt-2 rounded-xl border border-[#EEF2F7] bg-[#FAFBFD] px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Nearly every dated line is for today or tomorrow. Those are one
                  tap; the date box is there for the rest rather than being the
                  only way in — an empty 'dd/mm/yyyy' as the first thing you meet
                  is a form, and this is a list. */}
              <WhenChip label="Today" active={draftDate === todayIso} onClick={() => setDraftDate(todayIso)} />
              <WhenChip label="Tomorrow" active={draftDate === tomorrowIso} onClick={() => setDraftDate(tomorrowIso)} />
              <input
                type="date"
                value={draftDate}
                onChange={e => setDraftDate(e.target.value)}
                aria-label="Another day"
                className={`${whenInputCls} ${draftDate && draftDate !== todayIso && draftDate !== tomorrowIso ? 'border-[#1b365d] text-[#1b365d]' : ''}`}
              />

              <span className="mx-0.5 h-4 w-px bg-[#E7EDF4]" />

              <input
                type="time"
                value={draftTime}
                onChange={e => setDraftTime(e.target.value)}
                aria-label="Time"
                className={`${whenInputCls} ${draftTime ? 'border-[#1b365d] text-[#1b365d]' : ''}`}
              />

              {hasWhen && (
                <button
                  type="button"
                  onClick={() => { setDraftDate(''); setDraftTime(''); }}
                  className="ml-auto rounded-md px-1.5 py-1 text-[0.7rem] text-muted-foreground transition-colors hover:bg-white hover:text-[#991B1B]"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="mt-2 text-[0.68rem] text-muted-foreground/80">
              {hasWhen
                ? `Due ${draftWhenLabel} — it will climb the list as it nears.`
                : 'Pick a day, a time, or both. A time on its own means today.'}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
        </div>
      ) : open.length === 0 && doneToday.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">Nothing on your list.</p>
          <p className="mt-1 text-[0.74rem] text-muted-foreground/80">
            Only you can see this — write it as you would on paper.
          </p>
        </div>
      ) : (
        <div className="max-h-[340px] overflow-y-auto">
          <ul className="divide-y divide-[#F5F7FA]">
            {open.map(item => (
              <Row
                key={item.id}
                item={item}
                todayIso={todayIso}
                now={now}
                editing={editing?.id === item.id ? editing.text : null}
                onEditChange={text => setEditing({ id: item.id, text })}
                onEditStart={() => setEditing({ id: item.id, text: item.body })}
                onEditEnd={saveEdit}
                onEditCancel={() => setEditing(null)}
                onToggle={() => toggle(item)}
                onRemove={() => remove(item)}
                scheduling={scheduling?.id === item.id ? scheduling : null}
                onScheduleOpen={() => setScheduling({
                  id: item.id, date: item.dueOn || '', time: item.dueTime || '',
                })}
                onScheduleChange={next => setScheduling({ id: item.id, ...next })}
                onScheduleSave={saveSchedule}
                onScheduleCancel={() => setScheduling(null)}
              />
            ))}
          </ul>

          {doneToday.length > 0 && (
            <>
              <p className="bg-[#FAFBFD] px-5 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Done today
              </p>
              <ul className="divide-y divide-[#F5F7FA]">
                {doneToday.map(item => (
                  <Row
                    key={item.id}
                    item={item}
                    todayIso={todayIso}
                    now={now}
                    editing={null}
                    onEditChange={() => {}}
                    onEditStart={() => {}}
                    onEditEnd={() => {}}
                    onEditCancel={() => {}}
                    onToggle={() => toggle(item)}
                    onRemove={() => remove(item)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {archiveOpen && (
        <TodoArchiveModal userId={user.id} onClose={() => setArchiveOpen(false)} />
      )}
    </section>
  );
}

/** A one-tap day. Filled when it is the day currently chosen. */
function WhenChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2 py-1 text-[0.72rem] font-medium transition-colors ${
        active
          ? "border-[#1b365d] bg-[#1b365d] text-white"
          : "border-[#E7EDF4] bg-white text-foreground/75 hover:border-[#C7D7EC] hover:bg-[#F7FAFF]"
      }`}
    >
      {label}
    </button>
  );
}

function Row({
  item, todayIso, now, editing, onEditChange, onEditStart, onEditEnd, onEditCancel, onToggle, onRemove,
  scheduling, onScheduleOpen, onScheduleChange, onScheduleSave, onScheduleCancel,
}: {
  item: Todo;
  todayIso: string;
  now: number;
  editing: string | null;
  onEditChange: (text: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onEditCancel: () => void;
  onToggle: () => void;
  onRemove: () => void;
  scheduling?: { date: string; time: string } | null;
  onScheduleOpen?: () => void;
  onScheduleChange?: (next: { date: string; time: string }) => void;
  onScheduleSave?: () => void;
  onScheduleCancel?: () => void;
}) {
  // Written on an earlier day and still not done. Said plainly rather than
  // colour-coded — it is a reminder, not a telling-off.
  const carried = !item.done && item.createdAt?.slice(0, 10) < todayIso;
  const due = todoDueAt(item);
  const level = todoUrgency(item, now);

  return (
    <li className="group flex items-start gap-2.5 px-5 py-2.5 transition-colors hover:bg-[#F7FAFF]">
      <button
        onClick={onToggle}
        aria-pressed={item.done}
        aria-label={item.done ? `Mark "${item.body}" as not done` : `Mark "${item.body}" as done`}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all ${
          item.done
            ? 'border-[#16A34A] bg-[#16A34A] text-white'
            : 'border-[#C7D3E2] bg-white hover:border-[#1b365d] hover:bg-[#EEF4FC]'
        }`}
      >
        {item.done && <Check size={12} strokeWidth={3.5} />}
      </button>

      <div className="min-w-0 flex-1">
        {editing !== null ? (
          <input
            autoFocus
            value={editing}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onEditEnd}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); onEditEnd(); }
              if (e.key === 'Escape') { e.preventDefault(); onEditCancel(); }
            }}
            className="w-full rounded border border-[#C7D7EC] bg-white px-1.5 py-0.5 text-[0.86rem] outline-none focus:border-[#1b365d]"
          />
        ) : (
          <button
            onClick={item.done ? undefined : onEditStart}
            className={`block w-full break-words text-left text-[0.86rem] leading-snug transition-all ${
              item.done
                ? 'cursor-default text-muted-foreground/60 line-through decoration-[#94A3B8]'
                : 'text-foreground'
            }`}
          >
            {item.body}
          </button>
        )}
        {/* The date, and the way to change it, in the same place. Editing it is
            two small inputs under the line rather than a dialog — a to-do is not
            worth a dialog. */}
        {scheduling ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              autoFocus
              value={scheduling.date}
              onChange={e => onScheduleChange?.({ ...scheduling, date: e.target.value })}
              aria-label="Day"
              className={whenInputCls}
            />
            <input
              type="time"
              value={scheduling.time}
              onChange={e => onScheduleChange?.({ ...scheduling, time: e.target.value })}
              aria-label="Time"
              className={whenInputCls}
            />
            <button
              onClick={onScheduleSave}
              className="rounded-md bg-[#1b365d] px-2 py-1 text-[0.7rem] font-medium text-white transition-colors hover:bg-[#142a4a]"
            >
              Save
            </button>
            <button
              onClick={() => onScheduleChange?.({ date: '', time: '' })}
              className="text-[0.7rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              clear
            </button>
            <button
              onClick={onScheduleCancel}
              className="text-[0.7rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              cancel
            </button>
          </div>
        ) : (
          (due || carried) && editing === null && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {due && (
                <button
                  onClick={item.done ? undefined : onScheduleOpen}
                  title={item.done ? undefined : 'Change when this is for'}
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${
                    item.done ? 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground' : TODO_URGENCY_CLASS[level]
                  } ${item.done ? 'cursor-default' : ''}`}
                >
                  <Clock size={9} />
                  {todoDueLabel(item, now)}
                </button>
              )}
              {carried && (
                <span className="text-[0.65rem] text-muted-foreground/70">
                  carried over from {shortDate(item.createdAt)}
                </span>
              )}
            </div>
          )
        )}
      </div>

      {/* Give an undated line a day, without having to retype it. Appears on
          hover, like the delete button, so a resting list stays quiet. */}
      {!item.done && !due && !scheduling && (
        <button
          onClick={onScheduleOpen}
          aria-label={`Set a day and time for "${item.body}"`}
          title="Set a day and time"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/0 transition-colors hover:bg-[#EEF4FC] hover:text-[#1b365d] group-hover:text-muted-foreground/60 focus:text-muted-foreground/60"
        >
          <CalendarPlus size={13} />
        </button>
      )}

      {/* Deleting is for a line typed by mistake. Ticking is how something
          finished leaves the list. */}
      <button
        onClick={onRemove}
        aria-label={`Remove "${item.body}"`}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/0 transition-colors hover:bg-[#FEF2F2] hover:text-[#991B1B] group-hover:text-muted-foreground/60 focus:text-muted-foreground/60"
      >
        <X size={13} />
      </button>
    </li>
  );
}
