import React, { useState, useEffect } from 'react';
import { tasksAPI, usersAPI } from '../services/api';
import { ChevronDown, Users } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { statusColor, statusLabel } from '../utils/taskStatus';

interface Task {
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
  completionDate: string | null;
  hoursLogged: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const NAVY = '#1b365d';

function priorityMeta(p: string) {
  if (p === 'Urgent' || p === 'High') return { dot: '#ef4444', accent: '#ef4444' };
  if (p === 'Medium') return { dot: '#f59e0b', accent: '#f59e0b' };
  return { dot: '#94a3b8', accent: 'transparent' };
}

function initials(name?: string) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

function roleLabel(role: string) {
  if (role === 'team-leader') return 'Accounts';
  if (role === 'team-member') return 'Staff';
  return role.replace('-', ' ');
}

function workload(n: number) {
  if (n > 5) return { label: 'Heavy', cls: 'bg-[#FDECEC] text-[#c0392b]' };
  if (n > 2) return { label: 'Moderate', cls: 'bg-[#FEF4E6] text-[#b7791f]' };
  return { label: 'Light', cls: 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' };
}

export function TeamTasks({ user }: { user?: { id: string; name: string; email: string; role: string } }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [tab, setTab] = useState<'workload' | 'users'>('workload');
  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  // Auto-refresh in the background, replacing the manual refresh button.
  useEffect(() => {
    const interval = setInterval(() => loadData({ silent: true }), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [tasksResponse, usersResponse] = await Promise.all([tasksAPI.getAll(), usersAPI.getAll()]);
      setTasks(tasksResponse.data || []);
      setUsers(usersResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const staffMembers = users.filter(u => u.role === 'team-member' || u.role === 'team-leader');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const filteredTasks = selectedUser === 'all' ? pendingTasks : pendingTasks.filter(t => t.assignedToId === selectedUser);
  const isHigh = (p: string) => p === 'High' || p === 'Urgent';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin && tab === 'users' ? 'Manage staff accounts and access' : 'Pending workload across your team members'}
          </p>
        </div>
      </div>

      {/* Tabs (admin: Workload | Users) */}
      {isAdmin && (
        <div className="flex gap-6 border-b border-[#E7EDF4]">
          {([['workload', 'Workload'], ['users', 'Users']] as const).map(([key, label]) => {
            const on = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} className={`relative -mb-px py-2.5 text-sm font-medium transition-colors ${on ? '' : 'text-muted-foreground hover:text-foreground'}`} style={on ? { color: NAVY } : undefined}>
                {label}
                {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: NAVY }} />}
              </button>
            );
          })}
        </div>
      )}

      {isAdmin && tab === 'users' && <UserManagement embedded />}

      {(!isAdmin || tab === 'workload') && (
        <>
      {/* All-staff summary — a distinct navy banner, set apart from the member tiles */}
      <button
        onClick={() => setSelectedUser('all')}
        className="flex flex-wrap items-center justify-between gap-5 rounded-xl px-5 py-4 text-left transition-all"
        style={{ background: 'linear-gradient(135deg, #1b365d 0%, #0f2039 100%)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
            <Users size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">All Staff</p>
            <p className="text-xs text-white/55">{staffMembers.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-2xl font-semibold leading-none text-white">{pendingTasks.length}</p>
            <p className="mt-1 text-xs text-white/55">pending tasks</p>
          </div>
          <div className="border-l border-white/15 pl-8">
            <p className="text-2xl font-semibold leading-none" style={{ color: '#f0b429' }}>{pendingTasks.filter(t => isHigh(t.priority)).length}</p>
            <p className="mt-1 text-xs text-white/55">high priority</p>
          </div>
        </div>
      </button>

      {/* Per-member workload tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staffMembers.map(user => {
          const userPending = pendingTasks.filter(t => t.assignedToId === user.id);
          const load = workload(userPending.length);
          const selected = selectedUser === user.id;
          return (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user.id)}
              className={`flex flex-col rounded-xl border p-4 text-left transition-all ${selected ? 'border-[#1b365d] bg-[rgba(27,54,93,0.04)]' : 'border-[#E7EDF4] bg-white hover:border-[#d5dfea] hover:shadow-sm'}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
                  {initials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{roleLabel(user.role)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-medium ${load.cls}`}>{load.label}</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold leading-none" style={{ color: NAVY }}>{userPending.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">pending tasks</p>
                </div>
                <p className="text-xs text-muted-foreground">{userPending.filter(t => isHigh(t.priority)).length} high priority</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Pending Tasks</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">{filteredTasks.length}</span>
          </div>
          <div className="relative inline-flex">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            >
              <option value="all">All staff ({pendingTasks.length})</option>
              {staffMembers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({pendingTasks.filter(t => t.assignedToId === user.id).length})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No pending tasks found.</div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const pm = priorityMeta(task.priority);
                const overdue = task.targetDate && new Date(task.targetDate) < new Date();
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-[#E7EDF4] p-4 transition-all hover:border-[#d5dfea] hover:shadow-[0_10px_30px_-20px_rgba(10,23,40,0.5)]"
                    style={{ borderLeftWidth: '3px', borderLeftColor: pm.accent === 'transparent' ? '#E7EDF4' : pm.accent }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{task.task}</p>
                        <p className="truncate text-xs text-muted-foreground">{task.client}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${statusColor(task.status)}`}>{statusLabel(task.status)}</span>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground/70">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pm.dot }} />
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#F1F4F8] pt-3 text-xs sm:grid-cols-4">
                      <Meta label="Assigned to">
                        <span className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>{initials(task.assignedTo)}</span>
                          <span className="truncate" style={{ color: NAVY }}>{task.assignedTo}</span>
                        </span>
                      </Meta>
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
      </section>
        </>
      )}
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
