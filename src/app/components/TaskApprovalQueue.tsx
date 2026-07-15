import React, { useState, useEffect } from 'react';
import { ReviewTaskModal } from './ReviewTaskModal';
import { tasksAPI } from '../services/api';
import { useToast } from './Toast';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface TaskApprovalQueueProps {
  userId: number;
  userName: string;
}

const NAVY = '#1b365d';

function priorityClass(p: string) {
  if (p === 'Urgent' || p === 'High') return 'bg-[#FDECEC] text-[#c0392b]';
  if (p === 'Medium') return 'bg-[#FEF4E6] text-[#b7791f]';
  return 'bg-slate-100 text-slate-600';
}

export function TaskApprovalQueue({ userId, userName }: TaskApprovalQueueProps) {
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { showError } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAll();
      setPendingTasks((response.data || []).filter((t: any) => t.status === 'Pending Approval'));
    } catch {
      showError('Failed to load pending task approvals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
      </div>
    );
  }

  if (pendingTasks.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(78,167,46,0.12)', color: '#4ea72e' }}>
          <CheckCircle2 size={24} />
        </span>
        <p className="text-sm font-medium" style={{ color: NAVY }}>All caught up</p>
        <p className="mt-1 text-xs text-muted-foreground">No tasks are awaiting your approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {pendingTasks.length} task{pendingTasks.length > 1 ? 's' : ''} awaiting your approval
      </p>

      {pendingTasks.map((task) => (
        <div key={task.id} className="rounded-xl border border-[#E7EDF4] p-4 transition-all hover:border-[#d5dfea] hover:shadow-[0_10px_30px_-20px_rgba(10,23,40,0.5)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{task.task}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                <span
                  className="max-w-[150px] truncate rounded-md px-2 py-0.5 font-medium"
                  style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}
                  title={task.client}
                >
                  {task.client}
                </span>
                <ArrowRight size={13} className="text-muted-foreground/40" />
                <span className="text-foreground/70">{task.assignedTo}</span>
                <span className={`rounded-md px-2 py-0.5 font-medium ${priorityClass(task.priority)}`}>
                  {task.priority}
                </span>
                {task.targetDate && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock size={12} />
                    {new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedTask(task)}
              className="shrink-0 rounded-full bg-[#1b365d] px-4 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] hover:shadow-[0_12px_26px_-10px_rgba(27,54,93,0.7)]"
            >
              Review
            </button>
          </div>

          {task.createdBy && (
            <p className="mt-2.5 border-t border-[#F1F4F8] pt-2 text-[11px] text-muted-foreground">
              Created by {task.createdBy}
            </p>
          )}
        </div>
      ))}

      {selectedTask && (
        <ReviewTaskModal
          task={selectedTask}
          approverId={userId}
          approverName={userName}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => { loadData(); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
