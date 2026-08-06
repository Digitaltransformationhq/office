import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Users } from 'lucide-react';
import { statusColor, statusLabel } from '../utils/taskStatus';
import { overlayCls, panelCls } from './clientModalUI';

const NAVY = '#1b365d';

export interface WorkloadTask {
  id: string;
  client: string;
  task: string;
  category: string;
  assignedTo: string;
  assignedToId: string;
  priority: string;
  status: string;
  startDate: string;
  targetDate: string;
}

interface TeamWorkloadModalProps {
  /** Whose workload this is. `null` name means the whole team. */
  title: string;
  subtitle?: string;
  /** Initials to show in the avatar; omitted for the all-staff view. */
  initials?: string;
  tasks: WorkloadTask[];
  /** Whether to show who each task belongs to — only useful across the team. */
  showAssignee?: boolean;
  onClose: () => void;
}

function priorityMeta(p: string) {
  if (p === 'Urgent' || p === 'High') return { dot: '#ef4444', accent: '#ef4444' };
  if (p === 'Medium') return { dot: '#f59e0b', accent: '#f59e0b' };
  return { dot: '#94a3b8', accent: 'transparent' };
}

function initialsOf(name?: string) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

/**
 * One person's pending tasks, opened from their tile on the Team screen.
 *
 * Previously the tile only filtered a list sitting at the bottom of the page, so
 * clicking someone gave no visible feedback until you scrolled past the whole
 * grid of tiles to find out what had changed. The work is now where the click
 * was, and the list scrolls inside the dialog rather than the page.
 */
export function TeamWorkloadModal({
  title, subtitle, initials, tasks, showAssignee = false, onClose,
}: TeamWorkloadModalProps) {
  const [search, setSearch] = useState('');

  // Escape closes, as it does in every other dialog here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t => [t.task, t.client, t.category, t.assignedTo, t.priority, statusLabel(t.status)]
      .some(v => (v || '').toLowerCase().includes(q)));
  }, [tasks, search]);

  const high = tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').length;
  const overdueCount = tasks.filter(t => t.targetDate && new Date(t.targetDate) < new Date()).length;

  return (
    <div className={overlayCls} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${panelCls} max-w-3xl`}>
        {/* Who, and how much */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
            >
              {initials ?? <Users size={20} />}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[1.05rem] font-semibold" style={{ color: NAVY }}>{title}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {subtitle ? `${subtitle} · ` : ''}
                {tasks.length} pending task{tasks.length === 1 ? '' : 's'}
                {high > 0 && ` · ${high} high priority`}
                {overdueCount > 0 && ` · ${overdueCount} overdue`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search appears only when the list is long enough to need it. */}
        {tasks.length > 6 && (
          <div className="border-b border-[#E7EDF4] px-6 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search these tasks…"
                aria-label="Search tasks"
                className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {shown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {tasks.length === 0 ? 'No pending tasks.' : `Nothing matches “${search.trim()}”.`}
            </p>
          ) : (
            <div className="space-y-3">
              {shown.map(task => {
                const pm = priorityMeta(task.priority);
                const overdue = task.targetDate && new Date(task.targetDate) < new Date();
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-[#E7EDF4] p-4"
                    style={{ borderLeftWidth: '3px', borderLeftColor: pm.accent === 'transparent' ? '#E7EDF4' : pm.accent }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{task.task}</p>
                        <p className="truncate text-xs text-muted-foreground">{task.client}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${statusColor(task.status)}`}>
                          {statusLabel(task.status)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground/70">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pm.dot }} />
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <div className={`mt-3 grid grid-cols-2 gap-3 border-t border-[#F1F4F8] pt-3 text-xs ${showAssignee ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                      {/* Redundant on one person's list — every row would repeat
                          the name already in the dialog's title. */}
                      {showAssignee && (
                        <Meta label="Assigned to">
                          <span className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
                              {initialsOf(task.assignedTo)}
                            </span>
                            <span className="truncate" style={{ color: NAVY }}>{task.assignedTo}</span>
                          </span>
                        </Meta>
                      )}
                      <Meta label="Category"><span style={{ color: NAVY }}>{task.category || '—'}</span></Meta>
                      <Meta label="Start"><span style={{ color: NAVY }}>{task.startDate ? new Date(task.startDate).toLocaleDateString('en-IN') : '—'}</span></Meta>
                      <Meta label="Target">
                        <span className={overdue ? 'font-medium text-[#c0392b]' : ''} style={overdue ? undefined : { color: NAVY }}>
                          {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </Meta>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[0.8rem] font-medium">{children}</p>
    </div>
  );
}
