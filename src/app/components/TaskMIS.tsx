import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { ReassignTaskModal } from './ReassignTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { CreateTaskModal } from './CreateTaskModal';
import { TASK_STATUS, statusColor, statusLabel } from '../utils/taskStatus';
import {
  Search, SlidersHorizontal, Check, X, Repeat2,
  RotateCcw, Pencil, Trash2, ChevronDown, ChevronUp, Plus,
  Play, CheckCheck,
} from 'lucide-react';

interface Task {
  id: string;
  client: string;
  task: string;
  category: string;
  assignedTo: string;
  assignedToId: string;
  priority: string;
  status: string;
  assignmentStatus?: string;
  startDate: string;
  targetDate: string;
  completionDate: string | null;
  hoursLogged: number;
  originallyAssignedById?: string;
  originallyAssignedByName?: string;
  reassignedFromId?: string;
  reassignedFromName?: string;
  rejectionReason?: string;
  comments?: string;
  createdBy?: string;
  createdById?: string;
  billingFees?: number;
  taxableAmount?: number;
  billingDescription?: string;
}

interface TaskMISProps {
  user: { id: string; name: string; email: string; role: string };
}

const NAVY = '#1b365d';

const ASSIGN_COLOR: Record<string, string> = {
  'Accepted': 'bg-green-100 text-green-700',
  'Pending Acceptance': 'bg-amber-100 text-amber-700',
  'Rejected': 'bg-red-100 text-red-700',
};

function priorityDot(p: string) {
  if (p === 'Urgent' || p === 'High') return '#ef4444';
  if (p === 'Medium') return '#f59e0b';
  return '#94a3b8';
}

function initials(name?: string) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

const selectCls =
  'appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-8 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';
const searchCls =
  'w-40 rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

export function TaskMIS({ user }: TaskMISProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'completed' | 'pending' | 'pending-acceptance'>('all');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [clientFilter, setClientFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');

  const [sortCol, setSortCol] = useState('targetDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const isPartnerOrAdmin = ['partner', 'admin', 'Partner', 'Admin'].includes(user.role);

  useEffect(() => { loadTasks(); }, [user]);

  // Auto-refresh in the background, replacing the manual refresh button.
  useEffect(() => {
    const interval = setInterval(() => loadTasks({ silent: true }), 60000);
    return () => clearInterval(interval);
  }, [user]);

  const loadTasks = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await tasksAPI.getAll();
      let all = response.data || [];
      if (!isPartnerOrAdmin) all = all.filter((t: Task) => t.assignedToId === user.id);
      setTasks(all);
    } catch (e) {
      console.error('Error loading tasks:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAccept = async (task: Task) => {
    if (!confirm(`Accept task: ${task.task}?`)) return;
    const r = await tasksAPI.update(task.id, { assignmentStatus: 'Accepted' });
    r.success ? loadTasks() : alert(r.error);
  };

  const handleReject = async (task: Task) => {
    const reason = prompt('Reason for rejecting:');
    if (!reason?.trim()) return;
    const r = await tasksAPI.update(task.id, { assignmentStatus: 'Rejected', rejectionReason: reason });
    r.success ? loadTasks() : alert(r.error);
  };

  /**
   * Start / end a task you've been assigned. This lives here as well as on the
   * team-member dashboard because every other role (team-leader, and anyone whose
   * role falls through to a dashboard without a task list) only ever reaches
   * their own tasks through this screen — without it they can be assigned work
   * and have no way to mark it done.
   */
  const handleStatusUpdate = async (task: Task, newStatus: string) => {
    const snapshot = tasks;
    setTasks(ts => ts.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));
    const r = await tasksAPI.update(task.id, { status: newStatus });
    if (!r?.success) {
      setTasks(snapshot);
      alert(r?.error || 'Failed to update task status');
      return;
    }
    loadTasks({ silent: true });
  };

  const handleReopen = async (task: Task) => {
    const reason = prompt('Reason for reopening:');
    if (!reason?.trim()) return;
    const r = await tasksAPI.update(task.id, {
      status: 'In Progress',
      comments: `Task reopened by ${user.name}. Reason: ${reason}`,
    });
    r.success ? loadTasks() : alert(r.error);
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete task "${task.task}" permanently? This cannot be undone.`)) return;
    const r = await tasksAPI.delete(task.id);
    r.success ? loadTasks() : alert(r.error);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const clearFilters = () => {
    setClientFilter(''); setTaskFilter(''); setCategoryFilter('all');
    setPriorityFilter('all'); setAssignedToFilter(''); setStatusFilter('all');
    setAssignmentStatusFilter('all');
  };

  const hasFilters = clientFilter || taskFilter || categoryFilter !== 'all' ||
    priorityFilter !== 'all' || assignedToFilter || statusFilter !== 'all' ||
    assignmentStatusFilter !== 'all';

  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const pendingAcceptanceTasks = tasks.filter(t => t.assignmentStatus === 'Pending Acceptance');

  const baseList =
    filterTab === 'completed' ? completedTasks :
    filterTab === 'pending-acceptance' ? pendingAcceptanceTasks :
    filterTab === 'pending' ? pendingTasks : tasks;

  const filtered = baseList
    .filter(t => !clientFilter || t.client.toLowerCase().includes(clientFilter.toLowerCase()))
    .filter(t => !taskFilter || t.task.toLowerCase().includes(taskFilter.toLowerCase()))
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
    .filter(t => priorityFilter === 'all' || t.priority === priorityFilter)
    .filter(t => !assignedToFilter || t.assignedTo.toLowerCase().includes(assignedToFilter.toLowerCase()))
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .filter(t => assignmentStatusFilter === 'all' || (t.assignmentStatus || 'Accepted') === assignmentStatusFilter);

  const sorted = [...filtered].sort((a, b) => {
    const map: Record<string, any> = {
      client: [a.client, b.client],
      task: [a.task, b.task],
      category: [a.category, b.category],
      priority: [{ Urgent: 1, High: 2, Medium: 3, Low: 4 }[a.priority] || 5, { Urgent: 1, High: 2, Medium: 3, Low: 4 }[b.priority] || 5],
      assignedTo: [a.assignedTo, b.assignedTo],
      status: [a.status, b.status],
      targetDate: [new Date(a.targetDate).getTime(), new Date(b.targetDate).getTime()],
    };
    const [va, vb] = map[sortCol] || [0, 0];
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueCategories = Array.from(new Set(tasks.map(t => t.category)));
  const uniqueStatuses = Array.from(new Set(tasks.map(t => t.status)));

  const stats = [
    { label: 'Total', val: tasks.length, tab: 'all' as const, dot: NAVY },
    { label: 'Pending', val: pendingTasks.length, tab: 'pending' as const, dot: '#f59e0b' },
    { label: 'Completed', val: completedTasks.length, tab: 'completed' as const, dot: '#4ea72e' },
    { label: 'For Acceptance', val: pendingAcceptanceTasks.length, tab: 'pending-acceptance' as const, dot: '#3b82f6' },
  ];

  const taskActions = (task: Task) => {
    const canEdit = isPartnerOrAdmin || task.createdById === user.id;
    const isPendingAcceptance = task.assignmentStatus === 'Pending Acceptance' && task.assignedToId === user.id;
    const assign = task.assignmentStatus || 'Accepted';
    // The task is yours to work on: assigned to you, and past the accept/reject gate.
    const isMine = task.assignedToId === user.id;
    const isLive = assign !== 'Pending Acceptance' && assign !== 'Rejected';
    return (
      <div className="flex items-center gap-1">
        {isPendingAcceptance && (
          <>
            <IconBtn icon={<Check size={14} />} tone="green" title="Accept" onClick={() => handleAccept(task)} />
            <IconBtn icon={<X size={14} />} tone="red" title="Reject" onClick={() => handleReject(task)} />
          </>
        )}
        {isMine && isLive && task.status === 'Pending' && (
          <IconBtn icon={<Play size={14} />} tone="default" title="Start task" onClick={() => handleStatusUpdate(task, 'In Progress')} />
        )}
        {isMine && isLive && task.status === 'In Progress' && (
          <IconBtn icon={<CheckCheck size={14} />} tone="green" title="Mark done" onClick={() => handleStatusUpdate(task, TASK_STATUS.pendingCompletionApproval)} />
        )}
        {assign !== 'Pending Acceptance' && assign !== 'Rejected' && task.status !== 'Completed' && task.assignedToId === user.id && (
          <IconBtn icon={<Repeat2 size={14} />} tone="default" title="Reassign" onClick={() => { setSelectedTask(task); setShowReassignModal(true); }} />
        )}
        {/* No "Send for billing" here any more: approving a completed task moves
            it to Pending for Billing on its own, and 'Completed' now means the
            bill has already been raised — offering it would push billed work
            back into the billing queue. Reopen stays as the partner's escape
            hatch. */}
        {task.status === TASK_STATUS.completed && isPartnerOrAdmin && (
          <IconBtn icon={<RotateCcw size={14} />} tone="amber" title="Reopen" onClick={() => handleReopen(task)} />
        )}
        <IconBtn icon={<Pencil size={14} />} tone="default" title={canEdit ? 'Edit task' : 'No permission'} disabled={!canEdit} onClick={() => { setSelectedTask(task); setShowEditModal(true); }} />
        <IconBtn icon={<Trash2 size={14} />} tone="red" title={canEdit ? 'Delete task' : 'No permission'} disabled={!canEdit} onClick={() => handleDelete(task)} />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight" style={{ color: NAVY }}>
            {isPartnerOrAdmin ? 'Task MIS' : 'My Tasks'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{sorted.length} of {tasks.length} tasks</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${showFilters || hasFilters ? 'border-transparent bg-[#1b365d] text-white' : 'border-[#E7EDF4] bg-white text-[#1b365d] hover:bg-[#F4F6F9]'}`}
          >
            <SlidersHorizontal size={15} /> Filters{hasFilters ? ' ·' : ''}
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="rounded-full border border-[#E7EDF4] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground">
              Clear
            </button>
          )}
          {/* Creating work from the Tasks section is the obvious place to look
              for it; previously it existed only on some dashboards. */}
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
          >
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(s => {
          const active = filterTab === s.tab;
          return (
            <button
              key={s.tab}
              onClick={() => setFilterTab(active ? 'all' : s.tab)}
              className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-[#1b365d] bg-[rgba(27,54,93,0.04)]' : 'border-[#E7EDF4] bg-white hover:border-[#d5dfea]'}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.dot }} />
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">{s.label}</span>
              </div>
              <p className="mt-2 text-[1.7rem] font-semibold leading-none tracking-tight" style={{ color: NAVY }}>{s.val}</p>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Client…" value={clientFilter} onChange={e => setClientFilter(e.target.value)} className={searchCls} />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Task…" value={taskFilter} onChange={e => setTaskFilter(e.target.value)} className={searchCls} />
          </div>
          {isPartnerOrAdmin && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Assigned to…" value={assignedToFilter} onChange={e => setAssignedToFilter(e.target.value)} className={searchCls} />
            </div>
          )}
          <FilterSelect value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>
          <FilterSelect value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="all">All priorities</option>
            {['Urgent', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
          </FilterSelect>
          <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect value={assignmentStatusFilter} onChange={e => setAssignmentStatusFilter(e.target.value)}>
            <option value="all">All assignment</option>
            {['Accepted', 'Pending Acceptance', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile: expandable cards */}
            <div className="space-y-2.5 p-3 md:hidden">
              {sorted.map((task) => {
                const open = openCards.has(task.id);
                const assign = task.assignmentStatus || 'Accepted';
                return (
                  <div key={task.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                    <button onClick={() => toggleCard(task.id)} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{task.client}</p>
                        <span className={`mt-1.5 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${statusColor(task.status)}`}>{statusLabel(task.status)}</span>
                      </div>
                      <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                        <CardRow label="Task"><span style={{ color: NAVY }}>{task.task}</span></CardRow>
                        {task.reassignedFromName && <CardRow label="Reassigned from">{task.reassignedFromName}</CardRow>}
                        <CardRow label="Category">
                          <span className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{task.category || '—'}</span>
                        </CardRow>
                        <CardRow label="Priority">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: priorityDot(task.priority) }} />
                            {task.priority || '—'}
                          </span>
                        </CardRow>
                        {isPartnerOrAdmin && (
                          <CardRow label="Assigned">
                            <span className="flex items-center justify-end gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[0.55rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>{initials(task.assignedTo)}</span>
                              <span style={{ color: NAVY }}>{task.assignedTo || '—'}</span>
                            </span>
                          </CardRow>
                        )}
                        {assign !== 'Accepted' && (
                          <CardRow label="Acceptance">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${ASSIGN_COLOR[assign]}`}>{assign}</span>
                          </CardRow>
                        )}
                        <CardRow label="Due">
                          <span style={{ color: NAVY }}>{task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</span>
                        </CardRow>
                        <CardRow label="Actions">{taskActions(task)}</CardRow>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <table className="hidden w-full min-w-[920px] table-fixed border-collapse text-[0.8rem] md:table">
              <colgroup>
                <col style={{ width: isPartnerOrAdmin ? '26%' : '32%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '11%' }} />
                {isPartnerOrAdmin && <col style={{ width: '15%' }} />}
                <col style={{ width: '14%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '190px' }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-[#E7EDF4]">
                  <SortTh col="client" label="Client & Task" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="category" label="Category" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="priority" label="Priority" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  {isPartnerOrAdmin && <SortTh col="assignedTo" label="Assigned" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />}
                  <SortTh col="status" label="Status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="targetDate" label="Due" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((task) => {
                  const canEdit = isPartnerOrAdmin || task.createdById === user.id;
                  const isPendingAcceptance = task.assignmentStatus === 'Pending Acceptance' && task.assignedToId === user.id;
                  const assign = task.assignmentStatus || 'Accepted';
                  return (
                    <tr key={task.id} className={`border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD] ${isPendingAcceptance ? 'bg-[#FFFBEB]' : ''}`}>
                      {/* Client & Task */}
                      <td className="px-3 py-3">
                        <p className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }} title={task.client}>{task.client}</p>
                        <p className="truncate text-xs text-muted-foreground" title={task.task}>{task.task}</p>
                        {task.reassignedFromName && (
                          <p className="truncate text-[0.62rem] text-muted-foreground/70">↙ {task.reassignedFromName}</p>
                        )}
                      </td>
                      {/* Category */}
                      <td className="px-3 py-3">
                        <span className="inline-block truncate rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{task.category || '—'}</span>
                      </td>
                      {/* Priority */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-foreground/80">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: priorityDot(task.priority) }} />
                          {task.priority || '—'}
                        </span>
                      </td>
                      {/* Assigned */}
                      {isPartnerOrAdmin && (
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.56rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>{initials(task.assignedTo)}</span>
                            <span className="truncate text-[0.78rem] text-foreground/75" title={task.assignedTo}>{task.assignedTo}</span>
                          </div>
                        </td>
                      )}
                      {/* Status */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${statusColor(task.status)}`}>{statusLabel(task.status)}</span>
                          {assign !== 'Accepted' && (
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[0.62rem] font-medium ${ASSIGN_COLOR[assign]}`}>{assign}</span>
                          )}
                        </div>
                      </td>
                      {/* Due */}
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      {/* Actions */}
                      <td className="whitespace-nowrap px-3 py-3">
                        {taskActions(task)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReassignModal && selectedTask && (
        <ReassignTaskModal task={selectedTask} currentUser={user}
          onClose={() => { setShowReassignModal(false); setSelectedTask(null); }}
          onSuccess={loadTasks} />
      )}
      {showEditModal && selectedTask && (
        <EditTaskModal task={selectedTask}
          onClose={() => { setShowEditModal(false); setSelectedTask(null); }}
          onSuccess={loadTasks} />
      )}
      {showCreateTask && (
        <CreateTaskModal
          currentUserRole={user.role}
          currentUser={user}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            setShowCreateTask(false);
            loadTasks({ silent: true });
          }}
        />
      )}
    </div>
  );
}

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[0.8rem] font-medium text-foreground/80">{children}</dd>
    </div>
  );
}

function SortTh({ col, label, sortCol, sortDir, onSort }: {
  col: string; label: string; sortCol: string; sortDir: 'asc' | 'desc'; onSort: (c: string) => void;
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );
}

const TONES: Record<string, string> = {
  default: 'border-[#E7EDF4] text-muted-foreground hover:bg-[#F4F6F9] hover:text-[#1b365d]',
  green: 'border-[#E7EDF4] text-[#3d8a22] hover:bg-[#EEF7E9] hover:border-[#c9e6ba]',
  red: 'border-[#E7EDF4] text-[#c0392b] hover:bg-[#FDECEC] hover:border-[#f3c9c4]',
  amber: 'border-[#E7EDF4] text-[#b7791f] hover:bg-[#FEF4E6] hover:border-[#f3ddb4]',
  purple: 'border-[#E7EDF4] text-[#7c3aed] hover:bg-[#F3EEFE] hover:border-[#dcccf7]',
};

function IconBtn({ icon, onClick, title, disabled, tone = 'default' }: {
  icon: React.ReactNode; onClick: () => void; title?: string; disabled?: boolean; tone?: keyof typeof TONES;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${TONES[tone]}`}
    >
      {icon}
    </button>
  );
}

function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex">
      <select value={value} onChange={onChange} className={selectCls}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
