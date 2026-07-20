import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Button } from './Button';
import { billingAPI, tasksAPI, usersAPI } from '../services/api';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useLiveData } from '../hooks/useLiveData';
import { ApprovalQueue } from './ApprovalQueue';
import { useToast } from './Toast';
import { TASK_STATUS, statusColor, statusLabel, isOpenTask, isAwaitingApproval, isFinishedTask } from '../utils/taskStatus';
import { MarkAsBilledModal } from './MarkAsBilledModal';
import { type BillingRecord } from '../utils/revenue';
import { Loader2, X, IndianRupee } from 'lucide-react';

interface TeamLeaderDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const NAVY = '#1b365d';

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
};

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

export function TeamLeaderDashboard({ user }: TeamLeaderDashboardProps) {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [selectedTaskForBilling, setSelectedTaskForBilling] = useState<any>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
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

  /** The actions a task offers its assignee, gated on the accept/reject stage. */
  const myTaskActions = (task: any) => {
    const assign = task.assignmentStatus || 'Accepted';
    if (assign === 'Pending Acceptance' || assign === 'Rejected') return [];
    if (task.status === 'Pending') {
      return [{ key: 'start', label: 'Start', tone: 'navy' as const, next: 'In Progress' }];
    }
    if (task.status === 'In Progress') {
      return [{ key: 'done', label: 'Done', tone: 'green' as const, next: TASK_STATUS.pendingCompletionApproval }];
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

  const isOpen = (t: any) => isOpenTask(t.status);
  const myTasks = user ? allTasks.filter(t => t.assignedToId === user.id && isOpen(t)) : [];
  const teamTasks = allTasks.filter(t => t.assignedToId !== user?.id && isOpen(t));
  const approvalQueue = allTasks.filter(t => isAwaitingApproval(t.status));

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
      {/* AnnouncementBar is rendered once by App.tsx, with the user's role. */}
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
          <KPICard title="My Tasks" value={myTasks.length} />
          {/* Billing is this desk's work, so it belongs in the headline numbers
              rather than only in the table below. Reads straight off
              pendingForBilling, so the two can never disagree, and it drops the
              moment a bill is raised — the task leaves 'Pending for Billing'. */}
          <KPICard
            title="For Billing"
            value={pendingForBilling.length}
            variant="warning"
          />
          <KPICard title="Team Tasks" value={teamTasks.length} />
          <KPICard title="Pending Approvals" value={approvalQueue.length} variant="warning" />
          <KPICard
            title="Completed"
            value={allTasks.filter(t => isFinishedTask(t.status)).length}
            variant="success"
          />
        </div>

        {/* ── Pending for Billing — priority section ── */}
        {pendingForBilling.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee size={16} className="shrink-0 text-amber-600" />
                  <CardTitle className="text-amber-800">Pending for Billing</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pendingForBilling.length} task{pendingForBilling.length !== 1 ? 's' : ''} awaiting billing
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="rt-title font-medium">{task.client}</TableCell>
                      <TableCell>{task.task}</TableCell>
                      <TableCell className="text-muted-foreground">{task.assignedTo}</TableCell>
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
            </CardContent>
          </Card>
        )}

        {/* ── My tasks ── */}
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                    <TableCell className="rt-title font-medium">{task.client}</TableCell>
                    <TableCell>{task.task}</TableCell>
                    <TableCell><StatusChip status={task.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {shortDate(task.targetDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {myTaskActions(task).map(a => (
                          <button
                            key={a.key}
                            onClick={() => handleStatusUpdate(task.id, a.next)}
                            disabled={busyIds.has(task.id)}
                            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${ACTION_TONE[a.tone]}`}
                          >
                            {busyIds.has(task.id) ? 'Saving…' : a.label}
                          </button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Team tasks ── */}
        <Card>
          <CardHeader>
            <CardTitle>Team Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                ) : teamTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="rt-title font-medium">{task.assignedTo}</TableCell>
                    <TableCell>{task.client}</TableCell>
                    <TableCell>{task.task}</TableCell>
                    <TableCell><StatusChip status={task.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {shortDate(task.targetDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Approvals + workload ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#E7EDF4] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold" style={{ color: NAVY }}>Leave Approval Queue</h3>
              <Button size="sm" onClick={() => setShowApprovalQueue(true)}>View All</Button>
            </div>
            <div className="mt-4">
              {approvalQueue.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No pending approvals. All caught up.
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
      </div>

      {/* Approval Queue Modal */}
      {showApprovalQueue && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0a1728]/60 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-6xl">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Approval Queue</CardTitle>
                  <Button size="sm" variant="secondary" onClick={() => setShowApprovalQueue(false)}>
                    <X size={15} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ApprovalQueue
                  userId={parseInt(user.id)}
                  userName={user.name}
                  userRole={user.role}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}

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
