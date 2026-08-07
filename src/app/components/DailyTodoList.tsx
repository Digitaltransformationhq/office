import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, ListChecks, Check } from 'lucide-react';
import { useToast } from './Toast';
import { todosAPI, type Todo } from '../services/api';
import { today } from '../utils/gst';

const NAVY = '#1b365d';

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

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
 * got through is most of the reason to keep a list at all.
 *
 * And every tick is applied on screen before the server is asked. A list that
 * pauses on each tick is a list people stop ticking.
 */
export function DailyTodoList({ user }: DailyTodoListProps) {
  const { showError } = useToast();

  const [items, setItems] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

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
    open: items.filter(i => !i.done),
    // Filtered here rather than on the server: only the browser knows what
    // "today" means where the person is sitting.
    doneToday: items.filter(i => i.done && i.doneOn === todayIso)
      .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')),
  }), [items, todayIso]);

  const add = async () => {
    const text = draft.trim();
    if (!text || !user?.id || adding) return;
    setAdding(true);
    setDraft('');
    try {
      const r = await todosAPI.add(user.id, text);
      if (r.success && r.data) setItems(prev => [...prev, r.data as Todo]);
      else { showError(r.error || 'Could not add that'); setDraft(text); }
    } catch {
      showError('Could not add that. Please try again.');
      setDraft(text);
    } finally {
      setAdding(false);
      inputRef.current?.focus();
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
      </div>

      <div className="border-b border-[#F1F4F8] px-5 py-3">
        <div className="flex items-center gap-2">
          <Plus size={15} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add something to do, then press Enter"
            className="w-full bg-transparent text-[0.86rem] outline-none placeholder:text-muted-foreground/60"
            aria-label="Add to your list"
          />
        </div>
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
                editing={editing?.id === item.id ? editing.text : null}
                onEditChange={text => setEditing({ id: item.id, text })}
                onEditStart={() => setEditing({ id: item.id, text: item.body })}
                onEditEnd={saveEdit}
                onEditCancel={() => setEditing(null)}
                onToggle={() => toggle(item)}
                onRemove={() => remove(item)}
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
    </section>
  );
}

function Row({ item, todayIso, editing, onEditChange, onEditStart, onEditEnd, onEditCancel, onToggle, onRemove }: {
  item: Todo;
  todayIso: string;
  editing: string | null;
  onEditChange: (text: string) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onEditCancel: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  // Written on an earlier day and still not done. Said plainly rather than
  // colour-coded — it is a reminder, not a telling-off.
  const carried = !item.done && item.createdAt?.slice(0, 10) < todayIso;

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
        {carried && editing === null && (
          <p className="mt-0.5 text-[0.65rem] text-muted-foreground/70">
            carried over from {shortDate(item.createdAt)}
          </p>
        )}
      </div>

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
