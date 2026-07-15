import React, { useState, useEffect } from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { tasksAPI } from '../services/api';
import { CreateInquiryModal } from './CreateInquiryModal';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { AnnouncementBar } from './AnnouncementBar';
import { useToast } from './Toast';

interface TeamMemberDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const statusColor: Record<string, string> = {
  'Pending': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Overdue': 'bg-red-100 text-red-700',
  'Pending Approval': 'bg-yellow-100 text-yellow-700',
  'Pending for Billing': 'bg-purple-100 text-purple-700',
  'Billed': 'bg-teal-100 text-teal-700',
};

const priorityColor: Record<string, string> = {
  'High': 'bg-red-100 text-red-700',
  'Urgent': 'bg-red-200 text-red-800',
  'Medium': 'bg-amber-100 text-amber-700',
  'Low': 'bg-slate-100 text-slate-600',
};

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${color || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

export function TeamMemberDashboard({ user }: TeamMemberDashboardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateInquiry, setShowCreateInquiry] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null);
  const { showSuccess } = useToast();

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

  const loadMyTasks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await tasksAPI.getAll();
      const userTasks = response.data.filter(
        (task: any) => task.assignedToId === user.id || task.assignedTo === user.name
      );
      setTasks(userTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      loadMyTasks();
    } catch {
      alert('Failed to update task status');
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'Completed');
  const returnedTasks = tasks.filter(isRejectedTask);

  const stats = [
    { label: 'Active', value: tasks.filter(t => t.status !== 'Completed' && t.status !== 'Rejected').length, color: 'text-slate-700' },
    { label: 'Pending', value: tasks.filter(t => t.status === 'Pending').length, color: 'text-slate-500' },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'In Progress').length, color: 'text-blue-600' },
    { label: 'Approval', value: tasks.filter(t => t.status === 'Pending Approval').length, color: 'text-yellow-600' },
    { label: 'Done', value: tasks.filter(t => t.status === 'Completed').length, color: 'text-green-600' },
    { label: 'Returned', value: returnedTasks.length, color: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AnnouncementBar />

      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">My Tasks</p>
            <p className="text-[11px] text-muted-foreground">{user?.name}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowCreateTask(true)}
              className="text-[11px] px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
            >
              + Task
            </button>
            <button
              onClick={() => setShowCreateInquiry(true)}
              className="text-[11px] px-2 py-1 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition border border-border"
            >
              + Inquiry
            </button>
            <button
              onClick={loadMyTasks}
              className="text-[11px] px-2 py-1 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition border border-border"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-6 gap-1.5">
          {stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded px-2 py-1.5 text-center">
              <p className={`text-sm font-bold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Returned tasks alert */}
        {returnedTasks.length > 0 && (
          <div className="border border-orange-300 bg-orange-50 dark:bg-orange-950/30 rounded p-2">
            <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 mb-1.5">
              ↩ {returnedTasks.length} task{returnedTasks.length > 1 ? 's' : ''} returned for correction
            </p>
            <div className="flex flex-col gap-1">
              {returnedTasks.map((task: any) => {
                const note = task.comments?.split('\n').filter((l: string) => l.startsWith('[Rejected by ')).pop() || '';
                return (
                  <div key={task.id} className="flex items-center justify-between gap-2 bg-white/60 dark:bg-black/20 rounded px-2 py-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{task.task}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{task.client} {note && <span className="text-orange-600 italic">· {note}</span>}</p>
                    </div>
                    <button
                      onClick={() => setTaskToEdit(task)}
                      className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-300 hover:bg-orange-200 whitespace-nowrap"
                    >
                      Edit & Resubmit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main tasks table */}
        <div className="bg-card border border-border rounded overflow-hidden flex-1">
          <div className="overflow-x-hidden overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-[11px] border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Client</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Task</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Category</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Priority</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Due</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted-foreground py-8 text-xs">
                      No active tasks. All caught up! 🎉
                    </td>
                  </tr>
                ) : (
                  activeTasks.map((task: any) => (
                    <tr
                      key={task.id}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                        isRejectedTask(task) ? 'bg-orange-50/40 dark:bg-orange-950/10' :
                        task.status === 'Overdue' ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5 truncate font-medium" title={task.client}>{task.client}</td>
                      <td className="px-2 py-1.5 truncate" title={task.task}>{task.task}</td>
                      <td className="px-2 py-1.5">
                        <Chip label={task.category || '—'} color="bg-blue-50 text-blue-700" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Chip label={task.priority || 'Med'} color={priorityColor[task.priority] || 'bg-slate-100 text-slate-600'} />
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                        {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <Chip label={task.status || 'Pending'} color={statusColor[task.status] || 'bg-slate-100 text-slate-600'} />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          {isRejectedTask(task) && (
                            <button
                              onClick={() => setTaskToEdit(task)}
                              className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-300 hover:bg-orange-200 whitespace-nowrap"
                            >
                              Edit
                            </button>
                          )}
                          {!isRejectedTask(task) && task.status === 'Pending' && (
                            <button
                              onClick={() => handleStatusUpdate(task.id, 'In Progress')}
                              className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-300 hover:bg-blue-200 whitespace-nowrap"
                            >
                              Start
                            </button>
                          )}
                          {task.status === 'In Progress' && (
                            <button
                              onClick={() => handleStatusUpdate(task.id, 'Completed')}
                              className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-300 hover:bg-green-200 whitespace-nowrap"
                            >
                              Done
                            </button>
                          )}
                          {task.status === 'Pending Approval' && (
                            <span className="text-[10px] text-yellow-600 italic">Awaiting…</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showCreateTask && user && (
        <CreateTaskModal
          currentUserRole={user.role}
          currentUser={user}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            showSuccess('Task submitted for Partner approval!');
            setShowCreateTask(false);
            loadMyTasks();
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
            loadMyTasks();
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
