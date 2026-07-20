import React, { useState } from 'react';
import { Button } from './Button';
import { tasksAPI } from '../services/api';
import { useToast } from './Toast';
import { TASK_STATUS } from '../utils/taskStatus';
import { X, ClipboardCheck, Pencil, Check, ChevronDown } from 'lucide-react';

interface ReviewTaskModalProps {
  task: any;
  approverId: number;
  approverName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

function priorityClass(p: string) {
  if (p === 'Urgent' || p === 'High') return 'bg-[#FDECEC] text-[#c0392b]';
  if (p === 'Medium') return 'bg-[#FEF4E6] text-[#b7791f]';
  return 'bg-slate-100 text-slate-600';
}

export function ReviewTaskModal({ task, approverId, approverName, onClose, onSuccess }: ReviewTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'edit' | 'reject' | null>(null);
  const [editedTask, setEditedTask] = useState({
    task: task.task,
    description: task.description || '',
    priority: task.priority || 'Medium',
    targetDate: task.targetDate || '',
  });
  const { showSuccess, showError } = useToast();

  /**
   * The queue holds two different gates, and they mean opposite things.
   * A NEW task awaiting sign-off becomes 'Pending' — approved, go start it.
   * A FINISHED task awaiting sign-off becomes 'Pending for Billing' — approved,
   * go bill it. Sending the latter to 'Pending' would wipe out the completed
   * work and put the task back at the start of the pipeline.
   */
  const isCompletionReview = task.status === TASK_STATUS.pendingCompletionApproval;
  const approvedStatus = isCompletionReview
    ? TASK_STATUS.pendingForBilling
    : TASK_STATUS.pending;
  /** Rejecting finished work sends it back to the desk, not back to unstarted. */
  const rejectedStatus = isCompletionReview
    ? TASK_STATUS.inProgress
    : TASK_STATUS.pending;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await tasksAPI.update(task.id, {
        status: approvedStatus,
        approvedBy: approverName,
        approvedById: approverId,
        approvedAt: new Date().toISOString(),
      });
      if (response.success) {
        showSuccess(isCompletionReview
          ? 'Completion approved. Task moved to Pending for Billing.'
          : `Task approved and assigned to ${task.assignedTo}`);
        onSuccess();
      } else {
        showError(response.message || response.error || 'Failed to approve task');
      }
    } catch (error) {
      console.error('Error approving task:', error);
      showError('Failed to approve task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      const response = await tasksAPI.update(task.id, {
        task: editedTask.task,
        description: editedTask.description,
        priority: editedTask.priority,
        targetDate: editedTask.targetDate,
        status: approvedStatus,
        approvedBy: approverName,
        approvedById: approverId,
        approvedAt: new Date().toISOString(),
      });
      if (response.success) {
        showSuccess('Task updated and approved successfully');
        onSuccess();
      } else {
        showError(response.message || response.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showError('Failed to update task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const rejectionNote = `[Rejected by ${approverName} on ${new Date().toLocaleDateString('en-IN')}]`;
      const updatedComments = task.comments ? `${task.comments}\n${rejectionNote}` : rejectionNote;
      const response = await tasksAPI.update(task.id, { status: rejectedStatus, comments: updatedComments });
      if (response.success) {
        showSuccess(isCompletionReview
          ? 'Sent back to In Progress. Rejection noted in comments.'
          : 'Task sent back to Pending. Rejection noted in comments.');
        onSuccess();
      } else {
        showError(response.message || response.error || 'Failed to reject task');
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
      showError('Failed to reject task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = action === 'reject' ? 'Provide a reason for rejection'
    : action === 'edit' ? 'Edit task details before approving'
    : isCompletionReview ? 'Approve the completed work, or send it back'
    : 'Approve, edit, or reject this task';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <ClipboardCheck size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Review Task</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {action !== 'edit' ? (
            <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
              <div className="border-b border-[#EFF3F8] bg-[#F9FAFB] px-5 py-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Task</p>
                <h3 className="mt-1 text-base font-semibold" style={{ color: NAVY }}>{task.task}</h3>
                {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
              </div>

              <dl className="divide-y divide-[#F1F4F8]">
                <Row label="Client" value={task.client} />
                <Row label="Assigned to" value={task.assignedTo} />
                <Row label="Created by" value={task.createdBy || 'Unknown'} />
                <Row label="Category" value={task.category || '—'} />
                <Row label="Due date" value={task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN') : 'Not set'} />
                <Row label="Priority">
                  <span className={`inline-block rounded-md px-2 py-0.5 text-[0.72rem] font-medium ${priorityClass(task.priority || 'Medium')}`}>
                    {task.priority || 'Medium'}
                  </span>
                </Row>
                {task.comments && <Row label="Comments" value={task.comments} multiline />}
              </dl>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  Task title <span className="text-[#c0392b]">*</span>
                </label>
                <input className={inputCls} value={editedTask.task} onChange={e => setEditedTask(prev => ({ ...prev, task: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Description</label>
                <textarea
                  value={editedTask.description}
                  onChange={e => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description…"
                  className={`${inputCls} min-h-[90px] resize-none`}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Priority</label>
                  <div className="relative">
                    <select
                      value={editedTask.priority}
                      onChange={e => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
                      className={`${inputCls} appearance-none pr-9`}
                    >
                      {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Due date</label>
                  <input className={inputCls} type="date" value={editedTask.targetDate} onChange={e => setEditedTask(prev => ({ ...prev, targetDate: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7EDF4] px-6 py-4">
          {!action && (
            <>
              <Button size="sm" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button size="sm" variant="secondary" onClick={() => setAction('edit')} disabled={loading}>
                <Pencil size={14} /> Edit &amp; Approve
              </Button>
              <Button size="sm" variant="danger" onClick={handleReject} disabled={loading}>
                <X size={14} /> {loading ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={loading}>
                <Check size={14} /> {loading ? 'Approving…' : 'Approve'}
              </Button>
            </>
          )}
          {action === 'edit' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setAction(null)} disabled={loading}>Back</Button>
              <Button size="sm" onClick={handleEdit} disabled={loading || !editedTask.task.trim()}>
                <Check size={14} /> {loading ? 'Saving…' : 'Save & Approve'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children, multiline }: { label: string; value?: React.ReactNode; children?: React.ReactNode; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-4 px-5 py-2.5">
      <dt className="w-28 shrink-0 pt-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className={`flex-1 text-sm font-medium ${multiline ? 'whitespace-pre-line' : ''}`} style={{ color: NAVY }}>
        {children ?? value}
      </dd>
    </div>
  );
}
