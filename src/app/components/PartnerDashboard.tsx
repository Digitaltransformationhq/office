import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { tasksAPI, usersAPI, inquiriesAPI } from '../services/api';
import { CreateTaskModal } from './CreateTaskModal';
import { AddStaffModal } from './AddStaffModal';
import { TaskApprovalQueue } from './TaskApprovalQueue';
import { InquiryApprovalQueue } from './InquiryApprovalQueue';
import { AnnouncementBar } from './AnnouncementBar';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { KPICard } from './KPICard';
import { ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Plus, Users, ClipboardList, Mail, AlertTriangle, CheckCircle2, Clock, X, Search } from 'lucide-react';

const NAVY = '#1b365d';
const GREEN = '#4ea72e';

interface PartnerDashboardProps {
  user?: { id: string; name: string; email: string; role: string };
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isToday(date: Date) {
  return toKey(date) === toKey(new Date());
}

function loadNotes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('kaps_partner_notes') || '{}'); } catch { return {}; }
}

function saveNotes(notes: Record<string, string>) {
  localStorage.setItem('kaps_partner_notes', JSON.stringify(notes));
}

const STATUS_COLOR: Record<string, string> = {
  'Pending': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Overdue': 'bg-red-100 text-red-700',
  'Pending Approval': 'bg-amber-100 text-amber-700',
  'Pending for Billing': 'bg-purple-100 text-purple-700',
  'Billed': 'bg-teal-100 text-teal-700',
};

/** A single dot colour per status — used in the compact calendar previews. */
const STATUS_DOT: Record<string, string> = {
  'Pending': '#94a3b8',
  'In Progress': '#3b82f6',
  'Completed': '#4ea72e',
  'Overdue': '#ef4444',
  'Pending Approval': '#f59e0b',
  'Pending for Billing': '#8b5cf6',
  'Billed': '#14b8a6',
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

const PAGE_SIZE = 8;

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

export function PartnerDashboard({ user }: PartnerDashboardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showTaskApprovals, setShowTaskApprovals] = useState(false);
  const [showInquiryApprovals, setShowInquiryApprovals] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timeAgo = useTimeAgo(lastRefresh);

  // Calendar
  const [weekOffset, setWeekOffset] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes);
  const weekDates = getWeekDates(weekOffset);

  // Task table filters
  const [search, setSearch] = useState('');
  const [fCategory, setFCategory] = useState('all');
  const [fPriority, setFPriority] = useState('all');
  const [fStatus, setFStatus] = useState('all');

  // Expandable cards (mobile)
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setOpenCards(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Pagination
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, fCategory, fPriority, fStatus]);

  const currentUser = user || JSON.parse(localStorage.getItem('kaps_user') || '{}');

  const extractNumericId = (userId: string): number => {
    if (!userId) return 0;
    if (userId.includes(':')) return parseInt(userId.split(':')[1]) || 0;
    return parseInt(userId) || 0;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksResult, usersResult, inquiriesResult] = await Promise.allSettled([
        tasksAPI.getAll(), usersAPI.getAll(), inquiriesAPI.getPending(),
      ]);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data || []);
      if (inquiriesResult.status === 'fulfilled') setInquiries(inquiriesResult.value.data || []);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadDataSilently = useCallback(async () => {
    try {
      const [t, u, i] = await Promise.allSettled([tasksAPI.getAll(), usersAPI.getAll(), inquiriesAPI.getPending()]);
      if (t.status === 'fulfilled') setTasks(t.value.data || []);
      if (u.status === 'fulfilled') setUsers(u.value.data || []);
      if (i.status === 'fulfilled') setInquiries(i.value.data || []);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const interval = setInterval(loadDataSilently, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNoteChange = (key: string, value: string) => {
    const updated = { ...notes, [key]: value };
    setNotes(updated);
    saveNotes(updated);
  };

  // Derived data
  const calculateAging = (targetDate: string) => {
    const diff = new Date().getTime() - new Date(targetDate).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const pendingTasks = tasks.filter(t => t.status !== 'Completed').map(t => ({ ...t, aging: calculateAging(t.targetDate) }));
  const uniqueCategories = Array.from(new Set(tasks.map((t: any) => t.category).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(tasks.map((t: any) => t.status).filter(Boolean)));

  const q = search.trim().toLowerCase();
  const filteredTasks = pendingTasks
    .filter(t => !q || t.client?.toLowerCase().includes(q) || t.task?.toLowerCase().includes(q) || t.assignedTo?.toLowerCase().includes(q))
    .filter(t => fCategory === 'all' || t.category === fCategory)
    .filter(t => fPriority === 'all' || t.priority === fPriority)
    .filter(t => fStatus === 'all' || t.status === fStatus);

  const hasFilters = !!q || fCategory !== 'all' || fPriority !== 'all' || fStatus !== 'all';
  const clearFilters = () => { setSearch(''); setFCategory('all'); setFPriority('all'); setFStatus('all'); };

  // Page slice
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedTasks = filteredTasks.slice(pageStart, pageStart + PAGE_SIZE);

  // Tasks due on a given date
  const tasksDueOn = (date: Date) => tasks.filter(t => t.targetDate && toKey(new Date(t.targetDate)) === toKey(date));

  const taskApprovalCount = tasks.filter(t => t.status === 'Pending Approval').length;
  const overdueCount = pendingTasks.filter(t => t.aging > 0).length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const activeCount = tasks.filter(t => t.status !== 'Completed').length;

  // Week label
  const weekStart = weekDates[0];
  const weekEnd = weekDates[5];
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AnnouncementBar />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>
              Partner Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Refreshed {timeAgo} ago</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7EDF4] bg-white text-muted-foreground transition-colors hover:bg-[#F4F6F9]"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowAddStaff(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-[#F4F6F9]"
              style={{ color: NAVY }}
            >
              <Users className="h-4 w-4" /> Add Staff
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] hover:shadow-[0_12px_26px_-10px_rgba(27,54,93,0.7)]"
            >
              <Plus className="h-4 w-4" /> New Task
            </button>
            <span className="mx-1 hidden h-6 w-px bg-[#E7EDF4] sm:block" />
            <ApprovalChip
              icon={<ClipboardList className="h-4 w-4" />}
              label="Task Approvals"
              count={taskApprovalCount}
              color="#F59E0B"
              onClick={() => setShowTaskApprovals(true)}
            />
            <ApprovalChip
              icon={<Mail className="h-4 w-4" />}
              label="Inquiries"
              count={inquiries.length}
              color={GREEN}
              onClick={() => setShowInquiryApprovals(true)}
            />
          </div>
        </div>

        {/* ── KPI tiles ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard title="Active" value={activeCount} icon={<ClipboardList size={22} />} />
          <KPICard title="Overdue" value={overdueCount} icon={<AlertTriangle size={22} />} variant="danger" />
          <KPICard title="Completed" value={completedCount} icon={<CheckCircle2 size={22} />} variant="success" />
          <KPICard title="For Approval" value={taskApprovalCount} icon={<Clock size={22} />} variant="warning" />
        </div>

        {/* ── Weekly planner ── */}
        <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E7EDF4] px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
                {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : 'Week Planner'}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]"
                  style={{ color: NAVY }}
                >
                  Today
                </button>
              )}
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9]"
                title="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9]"
                title="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day columns */}
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-6 divide-x divide-[#E7EDF4]">
              {weekDates.map((date, i) => {
                const key = toKey(date);
                const today = isToday(date);
                const dueTasks = tasksDueOn(date);
                const overdueDue = dueTasks.filter(t => t.status !== 'Completed');
                return (
                  <div
                    key={key}
                    className={`relative flex flex-col ${today ? 'z-10' : ''}`}
                    style={today ? { backgroundColor: 'rgba(27,54,93,0.06)', boxShadow: 'inset 0 0 0 1.5px rgba(27,54,93,0.5)' } : undefined}
                  >
                    {/* Solid navy cap marks the selected day and separates it cleanly */}
                    {today && (
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: NAVY }} />
                    )}
                    {/* Day header */}
                    <div className="flex items-center justify-between border-b border-[#E7EDF4] px-3 py-2.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {DAY_LABELS[i]}
                        </span>
                        <span className="text-base font-semibold" style={{ color: NAVY }}>
                          {date.getDate()}
                        </span>
                      </div>
                      {today ? (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-white"
                          style={{ backgroundColor: NAVY }}
                        >
                          Today
                        </span>
                      ) : overdueDue.length > 0 ? (
                        <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-medium text-[#c0392b]" style={{ backgroundColor: '#FDECEC' }}>
                          {overdueDue.length} due
                        </span>
                      ) : null}
                    </div>

                    {/* Tasks due this day */}
                    {dueTasks.length > 0 && (
                      <div className="flex flex-col gap-1 px-2 pt-2">
                        {dueTasks.slice(0, 2).map(t => (
                          <div
                            key={t.id}
                            title={`${t.client}: ${t.task}`}
                            className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${today ? 'bg-white shadow-sm' : 'bg-[#F4F6F9]'}`}
                          >
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_DOT[t.status] || '#94a3b8' }} />
                            <span className="truncate text-[0.62rem] font-medium" style={{ color: NAVY }}>{t.client}</span>
                          </div>
                        ))}
                        {dueTasks.length > 2 && (
                          <p className="px-1 text-[0.58rem] text-muted-foreground">+{dueTasks.length - 2} more</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="flex-1 p-2">
                      <textarea
                        value={notes[key] || ''}
                        onChange={e => handleNoteChange(key, e.target.value)}
                        placeholder="Add note…"
                        className={`h-24 w-full resize-none rounded-lg border p-2 text-[0.72rem] leading-relaxed outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15 ${today ? 'border-[#b9c9de] bg-white shadow-sm' : 'border-[#E7EDF4] bg-[#F9FAFB] focus:bg-white'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer hint */}
          <div className="border-t border-[#E7EDF4] bg-[#F9FAFB] px-5 py-2">
            <p className="text-xs text-muted-foreground">Notes save automatically as you type.</p>
          </div>
        </section>

        {/* ── Pending Tasks ── */}
        <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
          {/* Toolbar */}
          <div className="flex flex-col gap-3.5 border-b border-[#E7EDF4] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Pending Tasks</h2>
                <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {filteredTasks.length}{hasFilters ? ` of ${pendingTasks.length}` : ''}
                </span>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="rounded-full border border-[#E7EDF4] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground">
                  Clear filters
                </button>
              )}
            </div>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search client, task or assignee…"
                  className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
                />
              </div>
              <FilterSelect value={fCategory} onChange={e => setFCategory(e.target.value)}>
                <option value="all">All categories</option>
                {uniqueCategories.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </FilterSelect>
              <FilterSelect value={fPriority} onChange={e => setFPriority(e.target.value)}>
                <option value="all">All priorities</option>
                {['Urgent','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
              </FilterSelect>
              <FilterSelect value={fStatus} onChange={e => setFStatus(e.target.value)}>
                <option value="all">All statuses</option>
                {uniqueStatuses.map((s: any) => <option key={s} value={s}>{s}</option>)}
              </FilterSelect>
            </div>
          </div>

          {/* Mobile: expandable cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filteredTasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {hasFilters ? 'No tasks match the current filters.' : 'No pending tasks.'}
              </p>
            ) : pagedTasks.map((task) => {
              const open = openCards.has(task.id);
              return (
                <div key={task.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                  <button onClick={() => toggleCard(task.id)} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
                    <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ backgroundColor: task.aging > 0 ? '#ef4444' : '#E7EDF4' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{task.client}</p>
                      <span className={`mt-1.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[0.62rem] font-medium ${STATUS_COLOR[task.status] || 'bg-slate-100 text-slate-600'}`}>{task.status || 'Pending'}</span>
                    </div>
                    <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                      <CardRow label="Assigned">
                        <span className="flex items-center justify-end gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[0.56rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>{initials(task.assignedTo)}</span>
                          <span style={{ color: NAVY }}>{task.assignedTo || '—'}</span>
                        </span>
                      </CardRow>
                      <CardRow label="Category">
                        <span className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{task.category || '—'}</span>
                      </CardRow>
                      <CardRow label="Priority">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: priorityDot(task.priority) }} />
                          {task.priority || '—'}
                        </span>
                      </CardRow>
                      <CardRow label="Due">
                        <span className={task.aging > 0 ? 'font-medium text-[#c0392b]' : ''} style={task.aging > 0 ? undefined : { color: NAVY }}>
                          {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          {task.aging > 0 && <span className="ml-1 text-[0.62rem] opacity-70">({task.aging}d)</span>}
                        </span>
                      </CardRow>
                      <CardRow label="Task">
                        <span style={{ color: NAVY }}>{task.task}</span>
                      </CardRow>
                      <CardRow label="Status">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium ${STATUS_COLOR[task.status] || 'bg-slate-100 text-slate-600'}`}>{task.status || 'Pending'}</span>
                      </CardRow>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '32%' }} /><col style={{ width: '17%' }} />
                <col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Client & Task','Assigned','Category','Priority','Due','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[0.64rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={6} className="rt-full py-14 text-center text-sm text-muted-foreground">
                    {hasFilters ? 'No tasks match the current filters.' : 'No pending tasks. Click "New Task" to create one.'}
                  </td></tr>
                ) : pagedTasks.map((task) => (
                  <tr key={task.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    {/* Client & Task — card title on mobile */}
                    <td className="rt-title px-4 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 h-8 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: task.aging > 0 ? '#ef4444' : 'transparent' }} title={task.aging > 0 ? `Overdue ${task.aging}d` : undefined} />
                        <div className="min-w-0">
                          <p className="text-[0.83rem] font-medium md:truncate" style={{ color: NAVY }} title={task.client}>{task.client}</p>
                          <p className="text-xs text-muted-foreground md:truncate" title={task.task}>{task.task}</p>
                        </div>
                      </div>
                    </td>
                    {/* Assigned */}
                    <td className="px-4 py-3.5" data-label="Assigned">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>{initials(task.assignedTo)}</span>
                        <span className="text-[0.8rem] text-foreground/75 md:truncate" title={task.assignedTo}>{task.assignedTo || '—'}</span>
                      </div>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3.5" data-label="Category">
                      <span className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{task.category || '—'}</span>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3.5" data-label="Priority">
                      <span className="inline-flex items-center gap-1.5 text-[0.78rem] text-foreground/80">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: priorityDot(task.priority) }} />
                        {task.priority || '—'}
                      </span>
                    </td>
                    {/* Due */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs" data-label="Due">
                      <span className={task.aging > 0 ? 'font-medium text-[#c0392b]' : 'text-muted-foreground'}>
                        {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                      {task.aging > 0 && <span className="ml-2 text-[0.62rem] text-[#c0392b]/70 md:ml-0 md:mt-0.5 md:block">{task.aging}d overdue</span>}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5" data-label="Status">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium ${STATUS_COLOR[task.status] || 'bg-slate-100 text-slate-600'}`}>{task.status || 'Pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredTasks.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#E7EDF4] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium" style={{ color: NAVY }}>{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredTasks.length)}</span> of {filteredTasks.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageList(safePage, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors"
                      style={
                        p === safePage
                          ? { backgroundColor: NAVY, color: '#fff' }
                          : { border: '1px solid #E7EDF4', color: NAVY }
                      }
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal onClose={() => setShowCreateTask(false)} onTaskCreated={loadData} currentUser={user} />
      )}
      {showAddStaff && (
        <AddStaffModal onClose={() => setShowAddStaff(false)} onSuccess={loadData} />
      )}
      {showTaskApprovals && currentUser?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                  <ClipboardList size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Task Approval Queue</h2>
                    <span className="rounded-full bg-[#FEF4E6] px-2 py-0.5 text-xs font-semibold text-[#b7791f]">
                      {tasks.filter(t => t.status === 'Pending Approval').length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Review and approve pending tasks</p>
                </div>
              </div>
              <button
                onClick={() => setShowTaskApprovals(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <TaskApprovalQueue userId={extractNumericId(currentUser.id)} userName={currentUser.name} />
            </div>
          </div>
        </div>
      )}
      {showInquiryApprovals && currentUser?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(78,167,46,0.12)', color: '#4ea72e' }}>
                  <Mail size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Client Inquiry Approvals</h2>
                    <span className="rounded-full bg-[rgba(78,167,46,0.12)] px-2 py-0.5 text-xs font-semibold text-[#3d8a22]">
                      {inquiries.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Review and approve client inquiries</p>
                </div>
              </div>
              <button
                onClick={() => setShowInquiryApprovals(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <InquiryApprovalQueue userId={extractNumericId(currentUser.id)} userName={currentUser.name} onDataChange={loadData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Select with a custom, inset chevron (the native arrow sits hard against the
    edge). appearance-none hides the default arrow; the padding keeps text clear. */
function FilterSelect({
  value, onChange, children,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[0.82rem] font-medium text-foreground/80">{children}</dd>
    </div>
  );
}

interface ApprovalChipProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}

/** A neutral action chip with a small coloured count badge — signals volume
    without tinting the whole button. */
function ApprovalChip({ icon, label, count, color, onClick }: ApprovalChipProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[#E7EDF4] bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-[#F4F6F9]"
      style={{ color: NAVY }}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
      {count > 0 && (
        <span
          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[0.68rem] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
