import React, { useState, useEffect } from 'react';
import { ReviewTaskModal } from './ReviewTaskModal';
import { tasksAPI } from '../services/api';
import { useToast } from './Toast';
import { TASK_STATUS, canApproveTask } from '../utils/taskStatus';
import { normalizeRole } from '../utils/roles';
import { ArrowRight, CheckCircle2, Clock, PlayCircle, RotateCcw, Search } from 'lucide-react';

interface TaskApprovalQueueProps {
  /**
   * The real user id ('user:7'), not a numeric extraction. It is written to
   * tasks.approved_by_id, which carries a foreign key to users(id) — a bare
   * number would violate it.
   */
  userId: string;
  userName: string;
  userRole: string;
}

const NAVY = '#1b365d';
const GREEN = '#4ea72e';

/**
 * Finished work waiting to be signed off, as opposed to a new task waiting for
 * the go-ahead. Both gates share this queue, but they ask opposite things of the
 * approver — one releases work to start, the other releases it to billing — so
 * the card is painted green for the finished half and left plain for the other.
 */
const isCompletionGate = (task: any) => task.status === TASK_STATUS.pendingCompletionApproval;

function priorityClass(p: string) {
  if (p === 'Urgent' || p === 'High') return 'border border-[#f3c9c4] bg-[#FDECEC] text-[#c0392b]';
  if (p === 'Medium') return 'border border-[#f3ddb4] bg-[#FEF4E6] text-[#b7791f]';
  return 'border border-slate-300 bg-slate-100 text-slate-600';
}

export function TaskApprovalQueue({ userId, userName, userRole }: TaskApprovalQueueProps) {
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [search, setSearch] = useState('');
  const { showError } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAll();
      // Both gates queue here: a brand-new task awaiting sign-off before work
      // starts, and a finished task awaiting sign-off before it can be billed.
      // ReviewTaskModal branches on which one it is.
      const awaiting = (response.data || []).filter((t: any) =>
        t.status === TASK_STATUS.pendingNewTaskApproval ||
        t.status === TASK_STATUS.pendingCompletionApproval);

      /*
       * A partner or director sees their own queue, not the firm's.
       *
       * This list used to show every pending approval to everyone, on the
       * reasoning that nothing should look lost while a named approver is away.
       * That was the wrong trade: it turned each partner's queue into a running
       * account of what the others were being asked to sign off, and buried the
       * two things somebody actually had to do under a dozen they could only
       * watch.
       *
       * Unrouted work still shows to all of them, because nobody owns it and
       * whoever approves it claims it — hiding that would leave it genuinely
       * lost. An admin keeps the whole view, as everywhere else: somebody has to
       * be able to see the firm entire.
       */
      const mine = normalizeRole(userRole) === 'admin'
        ? awaiting
        : awaiting.filter((t: any) => canApproveTask(t, { id: userId, role: userRole }));

      setPendingTasks(mine);
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

  const q = search.trim().toLowerCase();
  const visibleTasks = q
    ? pendingTasks.filter((t) =>
        [t.task, t.client, t.assignedTo, t.approverName, t.createdBy]
          .some((v) => (v || '').toLowerCase().includes(q)))
    : pendingTasks;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by task, client, assignee or approver…"
          className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#1b365d]"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="text-xs text-muted-foreground">
          {q
            ? `${visibleTasks.length} of ${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} matching`
            : `${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} awaiting your approval`}
        </p>
        {/* A legend, because the colour is the only thing telling the two gates
            apart at a glance and it has to be learnable without opening a card. */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            To start
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GREEN }} />
            Work done
          </span>
        </div>
      </div>

      {visibleTasks.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No tasks match “{search.trim()}”.
        </p>
      )}

      {[...visibleTasks]
        // Tasks this user can act on float to the top so the "Review" buttons
        // are never buried below rows they can only watch. Within those, the two
        // gates cluster rather than interleave, so the green block reads as one
        // pile of finished work instead of a colour scattered down the list.
        .sort((a, b) =>
          Number(canApproveTask(b, { id: userId, role: userRole })) -
          Number(canApproveTask(a, { id: userId, role: userRole })) ||
          Number(isCompletionGate(b)) - Number(isCompletionGate(a)))
        .map((task) => {
        const mine = canApproveTask(task, { id: userId, role: userRole });
        const done = isCompletionGate(task);
        return (
        <div
          key={task.id}
          className={`rounded-xl border p-4 transition-all ${
            done
              ? 'border-[#c7e3b8] bg-[#F5FBF2] hover:border-[#a9d492] hover:shadow-[0_10px_30px_-20px_rgba(78,167,46,0.6)]'
              : 'border-[#E7EDF4] hover:border-[#d5dfea] hover:shadow-[0_10px_30px_-20px_rgba(10,23,40,0.5)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: done ? '#2f6b1c' : NAVY }}>{task.task}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                {/* Leads the row: what the approver is being asked to do decides
                    whether the rest of the card is even worth reading. */}
                {done ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#bfe0ad] bg-[#E8F6E0] px-2 py-0.5 font-semibold text-[#2f6b1c]">
                    <CheckCircle2 size={11} />
                    Work done
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    <PlayCircle size={11} />
                    Approve to start
                  </span>
                )}
                <span
                  className="max-w-[150px] truncate rounded-md px-2 py-0.5 font-medium"
                  style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY, border: '1px solid rgba(27,54,93,0.18)' }}
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
                {/* Work you have already sent back once. Worth knowing before
                    you open it, not after. */}
                {task.revisionCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                    <RotateCcw size={11} />
                    Resubmitted {task.revisionCount}×
                  </span>
                )}
              </div>
            </div>

            {/* Routed tasks stay visible to everyone so nothing looks lost when
                the named approver is away — but only they can act on it. */}
            {mine ? (
              <button
                onClick={() => setSelectedTask(task)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium text-white transition-all ${
                  done
                    ? 'bg-[#4ea72e] shadow-[0_8px_20px_-10px_rgba(78,167,46,0.7)] hover:bg-[#43911f] hover:shadow-[0_12px_26px_-10px_rgba(78,167,46,0.8)]'
                    : 'bg-[#1b365d] shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] hover:bg-[#142a4a] hover:shadow-[0_12px_26px_-10px_rgba(27,54,93,0.7)]'
                }`}
              >
                Review
              </button>
            ) : (
              <span
                className="shrink-0 rounded-full bg-[#F4F6F9] px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                title={`Only ${task.approverName} can approve this task`}
              >
                For {task.approverName}
              </span>
            )}
          </div>

          {task.createdBy && (
            <p className={`mt-2.5 border-t pt-2 text-[11px] text-muted-foreground ${done ? 'border-[#DCEFD1]' : 'border-[#F1F4F8]'}`}>
              Created by {task.createdBy}
            </p>
          )}
        </div>
        );
      })}

      {selectedTask && (
        <ReviewTaskModal
          task={selectedTask}
          approverId={userId}
          approverName={userName}
          approverRole={userRole}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => { loadData(); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
