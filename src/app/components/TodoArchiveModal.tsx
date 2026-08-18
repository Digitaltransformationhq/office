import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, History, Search, Check, Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import { todosAPI, type Todo } from '../services/api';
import { overlayCls, panelCls, NAVY } from './clientModalUI';
import { today } from '../utils/gst';

const dayHeading = (day: string, todayIso: string) => {
  const d = new Date(`${day}T00:00:00`);
  const diff = Math.round(
    (new Date(`${todayIso}T00:00:00`).getTime() - d.getTime()) / 86400000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';

  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  // The year only when it is not the current one — on a list of last week's
  // work, "2026" on every heading is four characters of nothing.
  if (day.slice(0, 4) !== todayIso.slice(0, 4)) opts.year = 'numeric';
  return d.toLocaleDateString('en-IN', opts);
};

const clockTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

interface TodoArchiveModalProps {
  /** The owner. Every read is scoped to it on the server, as everywhere else
   *  this table is touched. */
  userId: string;
  onClose: () => void;
}

/**
 * Everything ever ticked off, day by day.
 *
 * The list on the dashboard clears at the end of the day on purpose — a list
 * that keeps yesterday on screen stops being a list. But nothing is deleted when
 * it clears, and the question "what did I actually get through last week" gets
 * asked often enough to deserve an answer: at an appraisal, when writing up a
 * week, or when somebody wants to know where a day went. This is the same rows,
 * read backwards.
 *
 * Read-only, deliberately. Un-ticking something from three weeks ago would drop
 * it back onto today's list as if it had just been written, and rewording a line
 * after the fact would make the record worth less than the memory it replaced.
 *
 * Searching is done by the server, not over what happens to be on screen, so a
 * hit from months ago is found without first paging down to it.
 */
export function TodoArchiveModal({ userId, onClose }: TodoArchiveModalProps) {
  const { showError } = useToast();

  const [items, setItems] = useState<Todo[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const todayIso = today();

  /* Typing is faster than the network. Without a pause between the two, every
     keystroke is a request and the answers can land out of order. */
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* Which search the results on screen belong to. A slow reply for an old query
     must not overwrite a fast reply for the current one. */
  const requestRef = useRef(0);

  useEffect(() => {
    const ticket = ++requestRef.current;
    setLoading(true);
    (async () => {
      try {
        const r = await todosAPI.getArchive(userId, { q: query });
        if (ticket !== requestRef.current) return;
        if (r.success) {
          setItems(r.data);
          setNextBefore(r.nextBefore);
          setHasMore(r.hasMore);
        } else {
          showError(r.error || 'Could not load your archive');
        }
      } catch {
        if (ticket === requestRef.current) showError('Could not load your archive');
      } finally {
        if (ticket === requestRef.current) setLoading(false);
      }
    })();
  }, [userId, query]);

  const loadOlder = async () => {
    if (!nextBefore || loadingMore) return;
    const ticket = requestRef.current;
    setLoadingMore(true);
    try {
      const r = await todosAPI.getArchive(userId, { before: nextBefore, q: query });
      if (ticket !== requestRef.current) return;
      if (r.success) {
        // Merged on id: a day trimmed off the end of the previous page comes
        // back whole in this one, so the overlap is expected, not an error.
        setItems(prev => {
          const seen = new Set(prev.map(i => i.id));
          return [...prev, ...r.data.filter(i => !seen.has(i.id))];
        });
        setNextBefore(r.nextBefore);
        setHasMore(r.hasMore);
      } else {
        showError(r.error || 'Could not load older items');
      }
    } catch {
      if (ticket === requestRef.current) showError('Could not load older items');
    } finally {
      if (ticket === requestRef.current) setLoadingMore(false);
    }
  };

  // Already sorted newest-first by the server, so grouping keeps that order
  // without re-sorting anything.
  const days = useMemo(() => {
    const byDay = new Map<string, Todo[]>();
    for (const item of items) {
      if (!item.doneOn) continue;
      const bucket = byDay.get(item.doneOn);
      if (bucket) bucket.push(item);
      else byDay.set(item.doneOn, [item]);
    }
    return [...byDay.entries()];
  }, [items]);

  return (
    <div className={overlayCls} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${panelCls} max-w-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
            >
              <History size={17} />
            </span>
            <div>
              <h2 className="text-[1.02rem] font-semibold" style={{ color: NAVY }}>To-Do Archive</h2>
              <p className="text-[0.74rem] text-muted-foreground">
                Everything you have ticked off, newest first
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-[#F1F4F8] px-6 py-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search everything you have ticked off…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
            </div>
          ) : days.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {query ? `Nothing ticked off matches “${query}”.` : 'Nothing in the archive yet.'}
              </p>
              <p className="mt-1 text-[0.74rem] text-muted-foreground/80">
                {query
                  ? 'Try a shorter word — this searches the text you typed.'
                  : 'Items land here the day after you tick them off.'}
              </p>
            </div>
          ) : (
            <>
              {days.map(([day, entries]) => (
                <section key={day}>
                  {/* Sticky, because a long day scrolls past its own heading and
                      then the reader is looking at items belonging to nothing. */}
                  <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-[#EEF2F7] bg-[#FAFBFD]/95 px-6 py-1.5 backdrop-blur-sm">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.07em]" style={{ color: NAVY }}>
                      {dayHeading(day, todayIso)}
                    </p>
                    <p className="text-[0.68rem] text-muted-foreground">
                      {entries.length} done
                    </p>
                  </div>
                  <ul className="divide-y divide-[#F5F7FA]">
                    {entries.map(item => (
                      <li key={item.id} className="flex items-start gap-2.5 px-6 py-2.5">
                        <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] bg-[#16A34A] text-white">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                        {/* Not struck through: in here everything is done, so a
                            line through every line says nothing and reads worse. */}
                        <p className="min-w-0 flex-1 break-words text-[0.86rem] leading-snug text-foreground/85">
                          {item.body}
                        </p>
                        <span className="shrink-0 whitespace-nowrap pt-0.5 text-[0.68rem] tabular-nums text-muted-foreground/70">
                          {clockTime(item.doneAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {hasMore && (
                <div className="px-6 py-4">
                  <button
                    onClick={loadOlder}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E7EDF4] bg-white py-2 text-[0.8rem] font-medium text-foreground/75 transition-colors hover:border-[#C7D7EC] hover:bg-[#F7FAFF] disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 size={14} className="animate-spin" />}
                    {loadingMore ? 'Loading…' : 'Load older days'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#E7EDF4] bg-[#FAFBFD] px-6 py-3">
          <p className="text-[0.7rem] text-muted-foreground">
            {days.length > 0 && (
              <>
                {items.length} item{items.length === 1 ? '' : 's'} across {days.length} day
                {days.length === 1 ? '' : 's'}
                {hasMore && ' so far'}
              </>
            )}
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#1b365d] px-4 py-1.5 text-[0.8rem] font-medium text-white transition-colors hover:bg-[#142a4a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
