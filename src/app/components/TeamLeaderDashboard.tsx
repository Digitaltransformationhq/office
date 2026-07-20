import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Button } from './Button';
import { billingAPI, tasksAPI, usersAPI } from '../services/api';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { ApprovalQueue } from './ApprovalQueue';
import { useToast } from './Toast';
import { MarkAsBilledModal } from './MarkAsBilledModal';
import { MarkAsPaidModal } from './MarkAsPaidModal';
import {
  awaitingPaymentRecords, formatINR, invoiceAgeInDays, type BillingRecord,
} from '../utils/revenue';
import { Loader2, X, IndianRupee, Wallet } from 'lucide-react';

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
  const color =
    status === 'Completed' ? 'bg-green-100 text-green-700' :
    status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
    'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${color}`}>
      {status || 'Pending'}
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
  const [recordToPay, setRecordToPay] = useState<BillingRecord | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const timeAgo = useTimeAgo(lastRefresh);
  const { showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadDataSilently, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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
      return [{ key: 'done', label: 'Done', tone: 'green' as const, next: 'Completed' }];
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

  const isOpen = (t: any) => t.status !== 'Completed' && t.status !== 'Billed';
  const myTasks = user ? allTasks.filter(t => t.assignedToId === user.id && isOpen(t)) : [];
  const teamTasks = allTasks.filter(t => t.assignedToId !== user?.id && isOpen(t));
  const approvalQueue = allTasks.filter(t => t.status === 'Pending Approval');

  // Pending for Billing tasks — newest completion first
  const pendingForBilling = allTasks
    .filter(t => t.status === 'Pending for Billing')
    .sort((a, b) => {
      const dateA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
      const dateB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
      return dateB - dateA;
    });

  // Invoiced but unpaid — the stage after billing, oldest first so the most
  // overdue gets chased first.
  const awaitingPayment = awaitingPaymentRecords(billingRecords)
    .slice()
    .sort((a, b) => (invoiceAgeInDays(b) ?? 0) - (invoiceAgeInDays(a) ?? 0));
  const outstanding = awaitingPayment.reduce((sum, r) => sum + (Number(r.taxableAmount) || 0), 0);

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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard title="My Tasks" value={myTasks.length} />
          <KPICard title="Team Tasks" value={teamTasks.length} />
          <KPICard title="Pending Approvals" value={approvalQueue.length} variant="warning" />
          <KPICard
            title="Completed"
            value={allTasks.filter(t => t.status === 'Completed').length}
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
                          <button
                            onClick={() => setSelectedTaskForBilling(task)}
                            className="whitespace-nowrap rounded border border-green-300 bg-green-100 px-3.5 py-2 text-xs font-medium text-green-700 hover:bg-green-200 md:px-2 md:py-0.5 md:text-[10px]"
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

        {/* ── Awaiting Payment — the stage after billing ── */}
        {awaitingPayment.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="shrink-0 text-blue-600" />
                  <CardTitle className="text-blue-800">Awaiting Payment</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {awaitingPayment.length} invoice{awaitingPayment.length !== 1 ? 's' : ''} · {formatINR(outstanding)} outstanding
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingPayment.map((rec) => {
                    const age = invoiceAgeInDays(rec);
                    const overdue = (age ?? 0) > 30;
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="rt-title font-medium">{rec.clientName}</TableCell>
                        <TableCell className="font-mono text-xs">{rec.billNumber}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {shortDate(rec.billDate)}
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap tabular-nums"
                          style={overdue ? { color: '#B45309', fontWeight: 600 } : { color: 'inherit' }}
                        >
                          {age === null ? '—' : `${age}d`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium tabular-nums">
                          {formatINR(rec.taxableAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end md:justify-start">
                            <button
                              onClick={() => setRecordToPay(rec)}
                              className="whitespace-nowrap rounded border border-blue-300 bg-blue-100 px-3.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200 md:px-2 md:py-0.5 md:text-[10px]"
                            >
                              Mark Paid
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
      {recordToPay && user && (
        <MarkAsPaidModal
          record={recordToPay}
          user={{ id: user.id, name: user.name }}
          onClose={() => setRecordToPay(null)}
          onSuccess={loadDataSilently}
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
