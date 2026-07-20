import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { tasksAPI } from '../services/api';
import { CreateInquiryModal } from './CreateInquiryModal';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useToast } from './Toast';
import { TASK_STATUS, statusColor, statusLabel, isAwaitingApproval, isOpenTask, isFinishedTask } from '../utils/taskStatus';
import { Loader2, Plus, MessageSquarePlus, RotateCcw } from 'lucide-react';

interface TeamMemberDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const NAVY = '#1b365d';

const priorityColor: Record<string, string> = {
  'High': 'bg-red-100 text-red-700',
  'Urgent': 'bg-red-200 text-red-800',
  'Medium': 'bg-amber-100 text-amber-700',
  'Low': 'bg-slate-100 text-slate-600',
};

/** Compact solid buttons, for the desktop table's Action column. */
const actionBtn = 'whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors';

/** Solid fills, for the mobile card's footer — never mistakable for a status tag. */
const cardActionTone: Record<string, string> = {
  navy: 'bg-[#1b365d] text-white hover:bg-[#142a4a]',
  green: 'bg-[#3d8a22] text-white hover:bg-[#347618]',
  orange: 'bg-orange-600 text-white hover:bg-orange-700',
};
/**
 * Solid too, for the same reason as the cards: the pale tinted-and-bordered
 * variant these used to have was the same shape, weight and palette as the
 * status chip two columns over, so the Action column read as another tag.
 */
const tableActionTone: Record<string, string> = {
  navy: 'bg-[#1b365d] text-white hover:bg-[#142a4a]',
  green: 'bg-[#3d8a22] text-white hover:bg-[#347618]',
  orange: 'bg-orange-600 text-white hover:bg-orange-700',
};

interface TaskAction {
  key: string;
  /** Full label for the mobile card's button. */
  label: string;
  /** Terse label for the dense desktop table. */
  short: string;
  tone: keyof typeof cardActionTone;
  run: () => void;
}

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

function Chip({ label, color, className = '' }: { label: string; color?: string; className?: string }) {
  return (
    <span
      title={label}
      className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${color || 'bg-slate-100 text-slate-600'} ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * The mobile presentation of a task. Deliberately not the generic
 * `.responsive-table` label/value treatment: that rendered the action button in
 * the same slot and shape as the status chip, so it read as another tag rather
 * than something to press. Here status stays a tag in the header and the action
 * is a full-width filled button in its own footer.
 */
function TaskCard({ task, actions, isRejected, busy }: {
  task: any; actions: TaskAction[]; isRejected: boolean; busy: boolean;
}) {
  const frame =
    isRejected ? 'border-orange-200 bg-orange-50/50' :
    task.status === 'Overdue' ? 'border-red-200 bg-red-50/50' :
    'border-[#E7EDF4] bg-white';

  return (
    <div className={`rounded-xl border p-4 ${frame}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug" style={{ color: NAVY }}>
          {task.client}
        </p>
        <Chip
          label={statusLabel(task.status)}
          color={statusColor(task.status)}
        />
      </div>

      <p className="mt-1.5 text-sm leading-snug text-foreground/75">{task.task}</p>

      {/* Fixed columns rather than justify-between: that distributed leftover
          space, so the gaps moved with each card's chip widths. These tracks are
          weighted to what each column carries — categories run long ("Project
          Finance"), priorities are short — because equal thirds are too narrow
          for a category and it bleeds into its neighbour. min-w-0 + the chip's
          own truncate keep an unexpectedly long value inside its column. */}
      <div className="mt-3 grid grid-cols-[1.25fr_0.8fr_1fr] items-center gap-x-1.5">
        <span className="min-w-0 justify-self-start">
          <Chip label={task.category || '—'} color="bg-blue-50 text-blue-700" />
        </span>
        <span className="min-w-0 justify-self-center">
          <Chip
            label={task.priority || 'Medium'}
            color={priorityColor[task.priority] || 'bg-slate-100 text-slate-600'}
          />
        </span>
        <span className="min-w-0 justify-self-end truncate whitespace-nowrap text-right text-xs text-muted-foreground">
          Due {shortDate(task.targetDate)}
        </span>
      </div>

      {actions.length > 0 && (
        <div className="mt-4 flex gap-2 border-t border-black/[0.06] pt-3">
          {actions.map(a => (
            <button
              key={a.key}
              onClick={a.run}
              disabled={busy}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cardActionTone[a.tone]}`}
            >
              {busy ? 'Saving…' : a.label}
            </button>
          ))}
        </div>
      )}

      {isAwaitingApproval(task.status) && (
        <p className="mt-3 border-t border-black/[0.06] pt-3 text-xs italic text-yellow-700">
          {task.status === TASK_STATUS.pendingCompletionApproval
            ? 'Marked done — awaiting partner approval before billing.'
            : 'Awaiting partner approval…'}
        </p>
      )}
    </div>
  );
}

export function TeamMemberDashboard({ user }: TeamMemberDashboardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateInquiry, setShowCreateInquiry] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null);
  /** Tasks with an in-flight status write, so their buttons can't be double-fired. */
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  /** Mirror of busyIds readable from the poll timer, which closes over stale state. */
  const busyRef = useRef(false);
  busyRef.current = busyIds.size > 0;
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timeAgo = useTimeAgo(lastRefresh);
  const { showSuccess, showError } = useToast();

  const isRejectedTask = (task: any) =>
    task.comments?.includes('[Rejected by ') || task.status === 'Rejected';

  const extractNumericId = (userId: string): number => {
    if (userId.includes(':')) {
      const parts = userId.split(':');
      const numericPart = parseInt(parts[1]);
      return isNaN(numericPart) ? 0 : numericPart;
    }
    return isNaN(parseInt(userId)) ? 0 : parseInt(userId);
  };

  useEffect(() => { loadMyTasks(); }, [user]);

  // Keep the dashboard live without a manual refresh. Mirrors the 60s cadence
  // the other dashboards already use.
  useEffect(() => {
    const interval = setInterval(() => {
      // Never refetch over an in-flight status write: the response would
      // clobber the optimistic row and make the status flicker back.
      if (busyRef.current) return;
      loadMyTasks({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  /**
   * `silent` refetches in the background without tearing the page down to the
   * loading state — used after modal saves, where a full-page spinner for an
   * already-confirmed change is just a flash.
   */
  const loadMyTasks = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      const response = await tasksAPI.getAll();
      const userTasks = response.data.filter(
        (task: any) => task.assignedToId === user.id || task.assignedTo === user.name
      );
      setTasks(userTasks);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading tasks:', error);
      if (!silent) showError('Failed to load tasks');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /**
   * Apply the new status locally at once, then reconcile that single row with
   * what the server stored. No refetch and no loading state: re-fetching every
   * task to change one field made the whole dashboard blink on every click.
   * Rolls back if the write fails, so the UI never claims success falsely.
   */
  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    if (busyIds.has(taskId)) return;
    const snapshot = tasks;
    setBusyIds(prev => new Set(prev).add(taskId));
    setTasks(ts => ts.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));

    try {
      const res = await tasksAPI.update(taskId, { status: newStatus });
      // fetchAPI resolves (never throws) on a non-2xx, so a failed write has to
      // be detected here — otherwise the optimistic status would stand and the
      // UI would claim a save that never happened.
      if (!res?.success) throw new Error(res?.error || 'Update failed');
      if (res.data) {
        // Only merge fields the server actually returned: transformTask emits a
        // key for every column, so a partial row would otherwise blank the rest.
        const patch = Object.fromEntries(
          Object.entries(res.data).filter(([, v]) => v !== undefined)
        );
        setTasks(ts => ts.map(t => (t.id === taskId ? { ...t, ...patch } : t)));
      }
      setLastRefresh(new Date());
    } catch {
      setTasks(snapshot);
      showError('Failed to update task status');
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: NAVY }} />
          <p className="text-sm">Loading tasks…</p>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter(t => isOpenTask(t.status));
  const returnedTasks = tasks.filter(isRejectedTask);
  const count = (status: string) => tasks.filter(t => t.status === status).length;

  /** One definition of what a task offers, rendered two ways (card + table). */
  const taskActions = (task: any): TaskAction[] => {
    const out: TaskAction[] = [];
    if (isRejectedTask(task)) {
      out.push({
        key: 'edit', label: 'Edit & Resubmit', short: 'Edit', tone: 'orange',
        run: () => setTaskToEdit(task),
      });
    } else if (task.status === 'Pending') {
      out.push({
        key: 'start', label: 'Start Task', short: 'Start', tone: 'navy',
        run: () => handleStatusUpdate(task.id, 'In Progress'),
      });
    }
    if (task.status === 'In Progress') {
      out.push({
        key: 'done', label: 'Mark Done', short: 'Done', tone: 'green',
        run: () => handleStatusUpdate(task.id, TASK_STATUS.pendingCompletionApproval),
      });
    }
    return out;
  };

  return (
    <div className="space-y-0">
      {/* AnnouncementBar is rendered once by App.tsx, with the user's role. */}
      {/* No padding here — <main> in App.tsx already pads the page. */}
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>
              My Tasks
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.name} · updated {timeAgo} ago
            </p>
          </div>
        </div>

        {/* Quick actions — aligned to the stat-tile columns below */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
          >
            <Plus size={15} /> New Task
          </button>
          <button
            onClick={() => setShowCreateInquiry(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E7EDF4] bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-[#F4F6F9]"
            style={{ color: NAVY }}
          >
            <MessageSquarePlus size={15} /> New Inquiry
          </button>
        </div>

        {/* ── Stat tiles ── */}
        {/* No icons: at 2-up on a narrow screen the icon leaves too little room
            for the title, which then overflows into it. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard
            title="Active"
            value={activeTasks.length}
          />
          <KPICard title="In Progress" value={count('In Progress')} />
          <KPICard
            title="Awaiting Approval"
            value={tasks.filter(t => isAwaitingApproval(t.status)).length}
            variant="warning"
          />
          <KPICard
            title="Completed"
            value={tasks.filter(t => isFinishedTask(t.status)).length}
            variant="success"
          />
        </div>

        {/* ── Returned for correction ── */}
        {returnedTasks.length > 0 && (
          <section className="rounded-xl border border-orange-200 bg-orange-50/60 p-5">
            <div className="flex items-center gap-2">
              <RotateCcw size={16} className="shrink-0 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-800">
                {returnedTasks.length} task{returnedTasks.length > 1 ? 's' : ''} returned for correction
              </h3>
            </div>
            <div className="mt-4 space-y-2">
              {returnedTasks.map((task: any) => {
                const note = task.comments
                  ?.split('\n')
                  .filter((l: string) => l.startsWith('[Rejected by '))
                  .pop() || '';
                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{task.task}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.client}
                        {note && <span className="italic text-orange-600"> · {note}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setTaskToEdit(task)}
                      className="shrink-0 self-start rounded-full border border-orange-300 bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-200 sm:self-auto"
                    >
                      Edit &amp; Resubmit
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Active tasks ── */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeTasks.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No active tasks. All caught up.
              </p>
            ) : (
              <>
                {/* Mobile — purpose-built cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {activeTasks.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      actions={taskActions(task)}
                      isRejected={isRejectedTask(task)}
                      busy={busyIds.has(task.id)}
                    />
                  ))}
                </div>

                {/* Desktop — the table already labels its Action column */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTasks.map((task: any) => (
                        <TableRow
                          key={task.id}
                          className={
                            isRejectedTask(task) ? 'bg-orange-50/40' :
                            task.status === 'Overdue' ? 'bg-red-50/40' : ''
                          }
                        >
                          <TableCell className="font-medium">{task.client}</TableCell>
                          <TableCell>{task.task}</TableCell>
                          <TableCell>
                            <Chip label={task.category || '—'} color="bg-blue-50 text-blue-700" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.priority || 'Medium'}
                              color={priorityColor[task.priority] || 'bg-slate-100 text-slate-600'}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {shortDate(task.targetDate)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabel(task.status)}
                              color={statusColor(task.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {taskActions(task).map(a => (
                                <button
                                  key={a.key}
                                  onClick={a.run}
                                  disabled={busyIds.has(task.id)}
                                  className={`${actionBtn} disabled:cursor-not-allowed disabled:opacity-60 ${tableActionTone[a.tone]}`}
                                >
                                  {a.short}
                                </button>
                              ))}
                              {isAwaitingApproval(task.status) && (
                                <span className="text-[10px] italic text-yellow-600">Awaiting…</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {showCreateTask && user && (
        <CreateTaskModal
          currentUserRole={user.role}
          currentUser={user}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            showSuccess('Task submitted for Partner approval!');
            setShowCreateTask(false);
            loadMyTasks({ silent: true });
          }}
        />
      )}

      {taskToEdit && (
        <EditTaskModal
          task={taskToEdit}
          onClose={() => setTaskToEdit(null)}
          onSuccess={() => {
            showSuccess('Task updated and resubmitted for approval!');
            setTaskToEdit(null);
            loadMyTasks({ silent: true });
          }}
        />
      )}

      {showCreateInquiry && user && (
        <CreateInquiryModal
          currentUserId={extractNumericId(user.id)}
          currentUserName={user.name}
          onClose={() => setShowCreateInquiry(false)}
          onSuccess={() => {
            showSuccess('Inquiry submitted to Partner for review!');
            setShowCreateInquiry(false);
          }}
        />
      )}
    </div>
  );
}
