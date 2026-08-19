import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Button } from './Button';
import { billingAPI, tasksAPI, usersAPI } from '../services/api';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useLiveData } from '../hooks/useLiveData';
import { useToast } from './Toast';
import { statusColor, statusLabel, isOpenTask, isAwaitingApproval, isFinishedTask } from '../utils/taskStatus';
import { MarkAsBilledModal } from './MarkAsBilledModal';
import { SubmitWorkModal } from './SubmitWorkModal';
import { TaskThreadModal } from './TaskThreadModal';
import { DailyTodoList } from './DailyTodoList';
import { type BillingRecord } from '../utils/revenue';
import { Loader2, X, IndianRupee, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

interface TeamLeaderDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const NAVY = '#1b365d';

/** How many team tasks a page holds. Enough to be worth a page, few enough to
 *  read without scrolling on a laptop. */
const TEAM_PAGE_SIZE = 10;

/** Compact page list with ellipses, e.g. 1 … 4 5 6 … 12 */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push('…');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

function StatusChip({ status }: { status?: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${statusColor(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

/**
 * Solid fills, matching TeamMemberDashboard's Action column — the pale tinted
 * variant reads as another status tag next to the Status chip.
 */
const ACTION_TONE: Record<string, string> = {
  navy: 'bg-[#1b365d] hover:bg-[#142a4a]',
  green: 'bg-[#3d8a22] hover:bg-[#347618]',
  orange: 'bg-orange-600 hover:bg-orange-700',
};

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

/** Nothing recorded. An empty cell reads as a fault; this reads as a blank. */
function Dash() {
  return <span className="text-slate-300">—</span>;
}

export function TeamLeaderDashboard({ user }: TeamLeaderDashboardProps) {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedTaskForBilling, setSelectedTaskForBilling] = useState<any>(null);
  /** The task being handed to the approver, with the note that goes with it. */
  const [taskToSubmit, setTaskToSubmit] = useState<any | null>(null);
  /** The task whose approval conversation is open for reading. */
  const [taskThread, setTaskThread] = useState<any | null>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  /* Team Tasks is the one list here that grows without limit — every open task
     of every other person — so it is paged rather than scrolled. */
  const [teamPage, setTeamPage] = useState(1);
  const [focus, setFocus] = useState<null | 'mine' | 'billing' | 'team' | 'approvals' | 'completed'>(null);
  const timeAgo = useTimeAgo(lastRefresh);
  const { showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useLiveData(['tasks', 'users', 'billing'], () => loadDataSilently(), { enabled: autoRefresh });

  const fetchData = async () => {
    const [tasksRes, usersRes, billingRes] = await Promise.all([
      tasksAPI.getAll(),
      usersAPI.getAll(),
      billingAPI.getAll(),
    ]);
    setAllTasks(tasksRes.data);
    setUsers(usersRes.data);
    setBillingRecords(billingRes.data || []);
    setLastRefresh(new Date());
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDataSilently = async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  /**
   * Start / end a task assigned to this team leader. Mirrors TeamMemberDashboard:
   * a team leader can be assigned work like anyone else, and their own My Tasks
   * table used to be read-only, leaving them no way to progress it.
   * Optimistic, rolling back if the write fails so the UI never claims a save
   * that did not happen.
   */
  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    if (busyIds.has(taskId)) return;
    const snapshot = allTasks;
    setBusyIds(prev => new Set(prev).add(taskId));
    setAllTasks(ts => ts.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      const res = await tasksAPI.update(taskId, { status: newStatus });
      if (!res?.success) throw new Error(res?.error || 'Update failed');
      setLastRefresh(new Date());
    } catch {
      setAllTasks(snapshot);
      showError('Failed to update task status');
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  /**
   * The actions a task offers its assignee, gated on the accept/reject stage.
   *
   * `run` rather than a target status: finishing work opens the submit dialog so
   * a note goes to the approver with it, while starting one is still a plain
   * status write with nothing to say about it.
   */
  const myTaskActions = (task: any) => {
    const assign = task.assignmentStatus || 'Accepted';
    if (assign === 'Pending Acceptance' || assign === 'Rejected') return [];
    if (task.status === 'Pending') {
      return [{
        key: 'start', label: 'Start', tone: 'navy' as const,
        run: () => handleStatusUpdate(task.id, 'In Progress'),
      }];
    }
    if (task.status === 'In Progress') {
      const returned = Boolean(task.changesRequestedAt);
      return [{
        key: 'done',
        label: returned ? 'Resubmit' : 'Done',
        tone: returned ? 'orange' as const : 'green' as const,
        run: () => setTaskToSubmit(task),
      }];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: NAVY }} />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  /*
   * Which tile has been tapped, or null for the whole dashboard.
   *
   * This screen is several sections rather than one list, so a tile hides the
   * others instead of filtering rows. Same result from the reader's side —
   * tapping a number shows what it counts — without folding three tables that
   * carry different columns into one.
   */
  const focused = (key: string) => focus === null || focus === key;

  const isOpen = (t: any) => isOpenTask(t.status);
  const myTasks = user ? allTasks.filter(t => t.assignedToId === user.id && isOpen(t)) : [];
  const teamTasks = allTasks.filter(t => t.assignedToId !== user?.id && isOpen(t));
  const teamTotalPages = Math.max(1, Math.ceil(teamTasks.length / TEAM_PAGE_SIZE));
  // Clamped rather than reset: a live refresh that shortens the list must not
  // strand the reader on a page that no longer exists.
  const teamSafePage = Math.min(teamPage, teamTotalPages);
  const teamPageStart = (teamSafePage - 1) * TEAM_PAGE_SIZE;
  const pagedTeamTasks = teamTasks.slice(teamPageStart, teamPageStart + TEAM_PAGE_SIZE);
  const approvalQueue = allTasks.filter(t => isAwaitingApproval(t.status));
  const completedTasks = allTasks.filter(t => isFinishedTask(t.status));

  // Pending for Billing tasks — newest completion first
  const pendingForBilling = allTasks
    .filter(t => t.status === 'Pending for Billing')
    .sort((a, b) => {
      const dateA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
      const dateB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
      return dateB - dateA;
    });


  // Roles are normalized in transformUser, so a single comparison is enough.
  const staffMembers = users.filter(u => u.role === 'team-member');
  const workloadData = staffMembers.map(member => ({
    name: member.name,
    taskCount: allTasks.filter(t => t.assignedToId === member.id && isOpen(t)).length,
  }));
  // Scale bars against the busiest member so the track is never overflowed.
  const workloadMax = Math.max(1, ...workloadData.map(m => m.taskCount));

  return (
    <div className="space-y-0">
      {/* No padding here — <main> in App.tsx already pads the page. */}
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>
              Accounts Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your team and tasks · updated {timeAgo} ago
            </p>
          </div>
        </div>

        {/* ── Stat tiles ── */}
        {/* No icons: at 2-up on a narrow screen the icon leaves too little room
            for the title, which then overflows into it. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KPICard
            title="My Tasks"
            value={myTasks.length}
            onClick={() => setFocus(focus === 'mine' ? null : 'mine')}
            selected={focus === 'mine'}
          />
          {/* Billing is this desk's work, so it belongs in the headline numbers
              rather than only in the table below. Reads straight off
              pendingForBilling, so the two can never disagree, and it drops the
              moment a bill is raised — the task leaves 'Pending for Billing'. */}
          <KPICard
            title="For Billing"
            value={pendingForBilling.length}
            variant="warning"
            onClick={() => setFocus(focus === 'billing' ? null : 'billing')}
            selected={focus === 'billing'}
          />
          <KPICard
            title="Team Tasks"
            value={teamTasks.length}
            onClick={() => setFocus(focus === 'team' ? null : 'team')}
            selected={focus === 'team'}
          />
          <KPICard
            title="Pending Approvals"
            value={approvalQueue.length}
            variant="warning"
            onClick={() => setFocus(focus === 'approvals' ? null : 'approvals')}
            selected={focus === 'approvals'}
          />
          <KPICard
            title="Completed"
            value={completedTasks.length}
            variant="success"
            onClick={() => setFocus(focus === 'completed' ? null : 'completed')}
            selected={focus === 'completed'}
          />
        </div>

        {/* Without this, focusing a tile hides the rest of the dashboard with
            no visible way back other than guessing the tile toggles. */}
        {focus !== null && (
          <button
            onClick={() => setFocus(null)}
            className="-mt-1 inline-flex items-center gap-1 self-start rounded-md py-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1b365d]"
          >
            <ChevronLeft size={16} className="shrink-0" />
            Show the whole dashboard
          </button>
        )}

        {/* ── My to-do list ──
            A private daily list. Sits above the firm's work rather than below
            it: this is the one thing on the page that belongs only to the
            person reading it, and a pad you have to scroll to find is a pad you
            stop using. */}
        <DailyTodoList user={user} />

        {/* ── Pending for Billing — priority section ── */}
        {focused('billing') && pendingForBilling.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <IndianRupee size={16} className="shrink-0" style={{ color: NAVY }} />
                <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Pending for Billing</h2>
                <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {pendingForBilling.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingForBilling.length} task{pendingForBilling.length !== 1 ? 's' : ''} awaiting billing
              </p>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingForBilling.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="rt-title font-medium">{task.client || <Dash />}</TableCell>
                      <TableCell>{task.task || <Dash />}</TableCell>
                      <TableCell className="text-muted-foreground">{task.assignedTo || <Dash />}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {shortDate(task.completionDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end md:justify-start">
                          {/* Solid fill, like every other action in the app: the
                              pale tinted-and-bordered variant this used to have
                              was the same shape, weight and palette as a status
                              chip, so the Action column read as another tag
                              rather than something to press. */}
                          <button
                            onClick={() => setSelectedTaskForBilling(task)}
                            className={`whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors md:px-2.5 md:py-1 md:text-[11px] ${ACTION_TONE.green}`}
                          >
                            Mark Billed
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* ── My tasks ── */}
        {focused('mine') && (
        <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
          <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>My Tasks</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {myTasks.length}
            </span>
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No tasks assigned to you.
                    </TableCell>
                  </TableRow>
                ) : myTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="rt-title font-medium">{task.client || <Dash />}</TableCell>
                    <TableCell>
                      {task.task}
                      {/* The status chip only says "In Progress" — it cannot say
                          that the work came back and why. */}
                      {task.changesRequestedAt && task.changesRequestedNote && (
                        <p className="mt-0.5 text-xs italic text-orange-700">
                          Returned{task.changesRequestedBy ? ` by ${task.changesRequestedBy}` : ''}: {task.changesRequestedNote}
                        </p>
                      )}
                    </TableCell>
                    <TableCell><StatusChip status={task.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {shortDate(task.targetDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {myTaskActions(task).map(a => (
                          <button
                            key={a.key}
                            onClick={a.run}
                            disabled={busyIds.has(task.id)}
                            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${ACTION_TONE[a.tone]}`}
                          >
                            {busyIds.has(task.id) ? 'Saving…' : a.label}
                          </button>
                        ))}
                        {/* Available at every stage, including the ones that
                            offer no action — a task waiting at a gate is exactly
                            when you want to see what was said about it. */}
                        <button
                          onClick={() => setTaskThread(task)}
                          title="Approval thread"
                          aria-label="Open approval thread"
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[#E7EDF4] bg-white text-[#1b365d] transition-colors hover:bg-[#F4F6F9]"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        )}

        {/* ── Team tasks ── */}
        {focused('team') && (
        <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
          <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Team Tasks</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {teamTasks.length}
            </span>
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No team tasks available.
                    </TableCell>
                  </TableRow>
                ) : pagedTeamTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="rt-title font-medium">{task.assignedTo || <Dash />}</TableCell>
                    <TableCell>{task.client || <Dash />}</TableCell>
                    <TableCell>{task.task || <Dash />}</TableCell>
                    <TableCell><StatusChip status={task.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {shortDate(task.targetDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Only when there is more than one page — a single page of six tasks
              with a "1" under it is furniture, not navigation. */}
          {teamTotalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-[#E7EDF4] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-medium" style={{ color: NAVY }}>
                  {teamPageStart + 1}–{Math.min(teamPageStart + TEAM_PAGE_SIZE, teamTasks.length)}
                </span>{' '}
                of {teamTasks.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTeamPage(p => Math.max(1, p - 1))}
                  disabled={teamSafePage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageList(teamSafePage, teamTotalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setTeamPage(p)}
                      className="flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors"
                      style={
                        p === teamSafePage
                          ? { backgroundColor: NAVY, color: '#fff' }
                          : { border: '1px solid #E7EDF4', color: NAVY }
                      }
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setTeamPage(p => Math.min(teamTotalPages, p + 1))}
                  disabled={teamSafePage === teamTotalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>


        )}

        {/* ── Approvals + workload ── */}
        {focused('approvals') && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Parked alongside the sidebar item. Left visible so the feature is
              discoverable, but View All is inert — otherwise this panel would be
              a way straight into a section that is switched off everywhere else. */}
          <section className="rounded-xl border border-[#E7EDF4] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Leave Approval Queue</h3>
              <span className="rounded px-1.5 py-0.5 text-[0.58rem] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-inset ring-[#E7EDF4]">
                Soon
              </span>
            </div>
            <div className="mt-4">
              {true ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Leave approvals are not switched on yet.
                </p>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-[1.7rem] font-semibold leading-none" style={{ color: NAVY }}>
                    {approvalQueue.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    pending approval{approvalQueue.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#E7EDF4] bg-white p-5">
            <h3 className="text-sm font-semibold" style={{ color: NAVY }}>Workload Distribution</h3>
            <div className="mt-4 space-y-3">
              {workloadData.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No staff members found.</p>
              ) : (
                workloadData.map((member) => (
                  <div key={member.name}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-foreground/80">{member.name}</span>
                      <span className="shrink-0 text-sm font-medium" style={{ color: NAVY }}>
                        {member.taskCount}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(member.taskCount / workloadMax) * 100}%`,
                          backgroundColor: member.taskCount > 8 ? '#F59E0B' : '#4ea72e',
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        )}

        {/* ── Completed ──
            The only tile without a section of its own, so it had a number and
            nowhere to send you. Read-only: finished work needs no actions, and
            the thread stays reachable because that is where the history is. */}
        {focus === 'completed' && (
          <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
            <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Completed</h2>
              <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {completedTasks.length}
              </span>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nothing completed yet.
                      </TableCell>
                    </TableRow>
                  ) : completedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="rt-title font-medium">{task.client || <Dash />}</TableCell>
                      <TableCell>{task.task || <Dash />}</TableCell>
                      <TableCell className="text-muted-foreground">{task.assignedTo || '—'}</TableCell>
                      <TableCell><StatusChip status={task.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {shortDate(task.completionDate || task.targetDate)}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setTaskThread(task)}
                          title="Approval thread"
                          aria-label="Open approval thread"
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[#E7EDF4] bg-white text-[#1b365d] transition-colors hover:bg-[#F4F6F9]"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </div>

      {/* Approval Queue Modal */}

      {/* Record Payment Modal */}

      {taskToSubmit && user && (
        <SubmitWorkModal
          task={taskToSubmit}
          user={user}
          onClose={() => setTaskToSubmit(null)}
          onSuccess={() => {
            setTaskToSubmit(null);
            loadDataSilently();
          }}
        />
      )}

      {taskThread && user && (
        <TaskThreadModal
          task={taskThread}
          user={user}
          onClose={() => setTaskThread(null)}
          onPosted={loadDataSilently}
        />
      )}

      {/* Mark as Billed Modal */}
      {selectedTaskForBilling && user && (
        <MarkAsBilledModal
          task={selectedTaskForBilling}
          user={user}
          onClose={() => setSelectedTaskForBilling(null)}
          onSuccess={() => {
            // Refresh in the background — a full-page spinner for an
            // already-confirmed save just makes the dashboard blink.
            loadDataSilently();
          }}
        />
      )}
    </div>
  );
}
