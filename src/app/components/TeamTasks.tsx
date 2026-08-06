import React, { useState, useEffect } from 'react';
import { tasksAPI, usersAPI } from '../services/api';
import { Users, ArrowRight } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { useLiveData } from '../hooks/useLiveData';
import { isOpenTask } from '../utils/taskStatus';
import { TeamWorkloadModal } from './TeamWorkloadModal';

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
  const [viewing, setViewing] = useState<{ id: string; name: string; role?: string } | null>(null);
  const [tab, setTab] = useState<'workload' | 'users'>('workload');
  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  useLiveData(['tasks', 'users'], () => loadData({ silent: true }));

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
  const pendingTasks = tasks.filter(t => isOpenTask(t.status));
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
        loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : (
        <>
      {/* All-staff summary — a distinct navy banner, set apart from the member tiles */}
      <button
        onClick={() => setViewing({ id: 'all', name: 'All Staff' })}
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
          return (
            <button
              key={user.id}
              onClick={() => setViewing({ id: user.id, name: user.name, role: user.role })}
              title={`View ${user.name}'s pending tasks`}
              className="group flex flex-col rounded-xl border border-[#E7EDF4] bg-white p-4 text-left transition-all hover:border-[#d5dfea] hover:shadow-sm"
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
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-[#1b365d]">
                  {userPending.filter(t => isHigh(t.priority)).length} high priority
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

        </>
        )
      )}

      {viewing && (
        <TeamWorkloadModal
          title={viewing.id === 'all' ? 'All Staff' : viewing.name}
          subtitle={viewing.id === 'all' ? `${staffMembers.length} members` : roleLabel(viewing.role || '')}
          initials={viewing.id === 'all' ? undefined : initials(viewing.name)}
          tasks={viewing.id === 'all' ? pendingTasks : pendingTasks.filter(t => t.assignedToId === viewing.id)}
          showAssignee={viewing.id === 'all'}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
