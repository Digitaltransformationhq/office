import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { tasksAPI } from '../services/api';
import { CreateInquiryModal } from './CreateInquiryModal';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { SubmitWorkModal } from './SubmitWorkModal';
import { TaskThreadModal } from './TaskThreadModal';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useToast } from './Toast';
import { DailyTodoList } from './DailyTodoList';
import { TASK_STATUS, statusColor, statusLabel, isAwaitingApproval, isOpenTask, isFinishedTask } from '../utils/taskStatus';
import { Loader2, Plus, MessageSquarePlus, MessageSquare, RotateCcw, ChevronLeft } from 'lucide-react';

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
  'High': 'border border-red-300 bg-red-100 text-red-700',
  'Urgent': 'border border-red-400 bg-red-200 text-red-800',
  'Medium': 'border border-amber-300 bg-amber-100 text-amber-700',
  'Low': 'border border-slate-300 bg-slate-100 text-slate-600',
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

/** Priority as a dot, the same three colours the Tasks section uses. */
function priorityDot(p: string) {
  if (p === 'Urgent' || p === 'High') return '#ef4444';
  if (p === 'Medium') return '#f59e0b';
  return '#94a3b8';
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </th>
  );
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
function TaskCard({ task, actions, isRejected, busy, onOpenThread }: {
  task: any; actions: TaskAction[]; isRejected: boolean; busy: boolean;
  onOpenThread: () => void;
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
          <Chip label={task.category || '—'} color="border border-blue-200 bg-blue-50 text-blue-700" />
        </span>
        <span className="min-w-0 justify-self-center">
          <Chip
            label={task.priority || 'Medium'}
            color={priorityColor[task.priority] || 'border border-slate-300 bg-slate-100 text-slate-600'}
          />
        </span>
        <span className="min-w-0 justify-self-end truncate whitespace-nowrap text-right text-xs text-muted-foreground">
          Due {shortDate(task.targetDate)}
        </span>
      </div>

      {/* The thread sits beside the action, not inside it: reading what was said
          about a task is available at every stage, including while it waits at a
          gate and offers no action at all. */}
      <div className="mt-4 flex gap-2 border-t border-black/[0.06] pt-3">
        <button
          onClick={onOpenThread}
          aria-label="Open approval thread"
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#E7EDF4] bg-white px-3 py-2.5 text-sm font-medium text-[#1b365d] transition-colors hover:bg-[#F4F6F9]"
        >
          <MessageSquare size={15} />
        </button>
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
  /** The task being handed to the approver, with the note that goes with it. */
  const [taskToSubmit, setTaskToSubmit] = useState<any | null>(null);
  /** The task whose approval conversation is open for reading. */
  const [taskThread, setTaskThread] = useState<any | null>(null);
  /** Tasks with an in-flight status write, so their buttons can't be double-fired. */
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'all' | 'active' | 'in-progress' | 'awaiting' | 'completed'>('active');
  /** Mirror of busyIds readable from the poll timer, which closes over stale state. */
  const busyRef = useRef(false);
  busyRef.current = busyIds.size > 0;
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timeAgo = useTimeAgo(lastRefresh);
  const { showSuccess, showError } = useToast();

  /**
   * Sent back by an approver and not yet answered.
   *
   * `changesRequestedAt` is the current signal, cleared the moment the task is
   * resubmitted. The comments-string check stays for rows written before the
   * approval thread existed, which recorded a send-back only as a
   * "[Rejected by …]" line appended to the free-text comments.
   */
  const isRejectedTask = (task: any) =>
    Boolean(task.changesRequestedAt) ||
    task.comments?.includes('[Rejected by ') ||
    task.status === 'Rejected';

  /**
   * How the task gets back to the approver. A new task that was refused is
   * re-described and resubmitted through the edit form; finished work that was
   * refused has to be redone, so it goes back through the submit-for-approval
   * note instead. Offering "Edit" for the latter sends people to a form that
   * changes nothing about what was actually wrong.
   */
  const resubmitByEditing = (task: any) =>
    task.status === TASK_STATUS.pending ||
    task.status === TASK_STATUS.pendingNewTaskApproval ||
    task.status === 'Rejected';

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
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const awaitingTasks = tasks.filter(t => isAwaitingApproval(t.status));
  const completedTasks = tasks.filter(t => isFinishedTask(t.status));

  /*
   * The list below the tiles shows whichever one is selected.
   *
   * 'active' is the default because that is what this section showed before the
   * tiles did anything, and it is the answer to the question someone opens their
   * own dashboard to ask.
   */
  const VIEWS = {
    all: { label: 'All Tasks', tasks },
    active: { label: 'Active Tasks', tasks: activeTasks },
    'in-progress': { label: 'In Progress', tasks: inProgressTasks },
    awaiting: { label: 'Awaiting Approval', tasks: awaitingTasks },
    completed: { label: 'Completed', tasks: completedTasks },
  } as const;
  const shownTasks = VIEWS[view].tasks;
  const returnedTasks = tasks.filter(isRejectedTask);

  /** One definition of what a task offers, rendered two ways (card + table). */
  const taskActions = (task: any): TaskAction[] => {
    const out: TaskAction[] = [];
    if (isRejectedTask(task) && resubmitByEditing(task)) {
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
      // Never a bare status write: finished work carries a note to the approver,
      // and a resubmission has to say what changed.
      out.push({
        key: 'done',
        label: isRejectedTask(task) ? 'Redo & Resubmit' : 'Mark Done',
        short: isRejectedTask(task) ? 'Resubmit' : 'Done',
        tone: isRejectedTask(task) ? 'orange' : 'green',
        run: () => setTaskToSubmit(task),
      });
    }
    return out;
  };

  return (
    <div className="space-y-0">
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
        {/* Each tile filters the list below. Clicking the applied one clears
            back to Active rather than leaving the screen with nothing chosen. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KPICard
            title="Total Tasks"
            value={tasks.length}
            onClick={() => setView(view === 'all' ? 'active' : 'all')}
            selected={view === 'all'}
          />
          <KPICard
            title="Active"
            value={activeTasks.length}
            onClick={() => setView('active')}
            selected={view === 'active'}
          />
          <KPICard
            title="In Progress"
            value={inProgressTasks.length}
            onClick={() => setView(view === 'in-progress' ? 'active' : 'in-progress')}
            selected={view === 'in-progress'}
          />
          <KPICard
            title="Awaiting Approval"
            value={awaitingTasks.length}
            variant="warning"
            onClick={() => setView(view === 'awaiting' ? 'active' : 'awaiting')}
            selected={view === 'awaiting'}
          />
          <KPICard
            title="Completed"
            value={completedTasks.length}
            variant="success"
            onClick={() => setView(view === 'completed' ? 'active' : 'completed')}
            selected={view === 'completed'}
          />
        </div>

        {/* ── My to-do list ──
            A private daily list. Sits above the firm's work rather than below
            it: this is the one thing on the page that belongs only to the
            person reading it, and a pad you have to scroll to find is a pad you
            stop using. */}
        <DailyTodoList user={user} />

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
                // What the approver actually asked for. Pre-thread rows only
                // ever had the appended "[Rejected by …]" line to fall back on.
                const note = task.changesRequestedNote
                  || task.comments
                    ?.split('\n')
                    .filter((l: string) => l.startsWith('[Rejected by '))
                    .pop()
                  || '';
                const byEditing = resubmitByEditing(task);
                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{task.task}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.client}
                        {task.changesRequestedBy && (
                          <span> · returned by {task.changesRequestedBy}</span>
                        )}
                      </p>
                      {/* Not truncated with the rest: this is the instruction to
                          act on, and half of it is worse than none. */}
                      {note && (
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-orange-800">
                          {note}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-start">
                      <button
                        onClick={() => setTaskThread(task)}
                        className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-50"
                      >
                        Thread
                      </button>
                      <button
                        onClick={() => (byEditing ? setTaskToEdit(task) : setTaskToSubmit(task))}
                        className="rounded-full border border-orange-300 bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-200"
                      >
                        {byEditing ? 'Edit & Resubmit' : 'Redo & Resubmit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Active tasks ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle>{VIEWS[view].label}</CardTitle>
              <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {shownTasks.length}
              </span>
              {view !== 'active' && (
                <button
                  onClick={() => setView('active')}
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1b365d]"
                >
                  <ChevronLeft size={16} className="shrink-0" />
                  Show active
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {shownTasks.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {view === 'active' ? 'No active tasks. All caught up.'
                  : `Nothing under ${VIEWS[view].label.toLowerCase()}.`}
              </p>
            ) : (
              <>
                {/* Mobile — purpose-built cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {shownTasks.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      actions={taskActions(task)}
                      isRejected={isRejectedTask(task)}
                      busy={busyIds.has(task.id)}
                      onOpenThread={() => setTaskThread(task)}
                    />
                  ))}
                </div>

                {/* Desktop. Same table as the Tasks section: one raw table
                    rather than the shared component, a light header, client and
                    task in one cell, and priority as a dot instead of a chip —
                    three coloured chips a row turned every row into a traffic
                    light with nothing standing out. */}
                <table className="hidden w-full min-w-[860px] table-fixed border-collapse text-[0.8rem] md:table">
                  <colgroup>
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '180px' }} />
                  </colgroup>
                  <thead className="bg-[#F9FAFB]">
                    <tr className="border-b border-[#E7EDF4]">
                      <Th>Client &amp; Task</Th>
                      <Th>Category</Th>
                      <Th>Priority</Th>
                      <Th>Status</Th>
                      <Th>Due</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownTasks.map((task: any) => (
                      <tr
                        key={task.id}
                        className={`border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD] ${
                          isRejectedTask(task) ? 'bg-[#FFF7ED]' :
                          task.status === 'Overdue' ? 'bg-[#FEF2F2]' : ''
                        }`}
                      >
                        <td className="px-3 py-3">
                          <p className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }} title={task.client}>
                            {task.client}
                          </p>
                          <p className="truncate text-xs text-muted-foreground" title={task.task}>{task.task}</p>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className="inline-block max-w-full truncate rounded-md px-2 py-0.5 text-[0.7rem] font-medium"
                            style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY, border: '1px solid rgba(27,54,93,0.18)' }}
                            title={task.category || '—'}
                          >
                            {task.category || '—'}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-foreground/80">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: priorityDot(task.priority) }} />
                            {task.priority || '—'}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${statusColor(task.status)}`}>
                              {statusLabel(task.status)}
                            </span>
                            {isAwaitingApproval(task.status) && (
                              <span className="text-[0.62rem] italic text-muted-foreground">Awaiting sign-off</span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                          {shortDate(task.targetDate)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1">
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
                            <button
                              onClick={() => setTaskThread(task)}
                              title="Approval thread"
                              aria-label="Open approval thread"
                              className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[#E7EDF4] bg-white text-[#1b365d] transition-colors hover:bg-[#F4F6F9]"
                            >
                              <MessageSquare size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {taskToSubmit && user && (
        <SubmitWorkModal
          task={taskToSubmit}
          user={user}
          onClose={() => setTaskToSubmit(null)}
          onSuccess={() => {
            setTaskToSubmit(null);
            loadMyTasks({ silent: true });
          }}
        />
      )}

      {taskThread && user && (
        <TaskThreadModal
          task={taskThread}
          user={user}
          onClose={() => setTaskThread(null)}
          onPosted={() => loadMyTasks({ silent: true })}
        />
      )}

      {taskToEdit && (
        <EditTaskModal
          task={taskToEdit}
          currentUser={user}
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
