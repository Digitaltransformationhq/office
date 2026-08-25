import React, { useState } from 'react';
import { Button } from './Button';
import { tasksAPI } from '../services/api';
import { useToast } from './Toast';
import { TaskCommentThread } from './TaskCommentThread';
import { TASK_STATUS } from '../utils/taskStatus';
import { BillDivision, divisionReady, toBillShares, fromBillShares } from './BillDivision';
import { X, ClipboardCheck, Pencil, Check, ChevronDown, RotateCcw } from 'lucide-react';

interface ReviewTaskModalProps {
  task: any;
  /** Real user id ('user:7') — written to approved_by_id, which has an FK. */
  approverId: string;
  approverName: string;
  /** Recorded on the approver's thread entries. Defaults to 'partner'. */
  approverRole?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

function priorityClass(p: string) {
  if (p === 'Urgent' || p === 'High') return 'border border-[#f3c9c4] bg-[#FDECEC] text-[#c0392b]';
  if (p === 'Medium') return 'border border-[#f3ddb4] bg-[#FEF4E6] text-[#b7791f]';
  return 'border border-slate-300 bg-slate-100 text-slate-600';
}

export function ReviewTaskModal({
  task, approverId, approverName, approverRole = 'partner', onClose, onSuccess,
}: ReviewTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'edit' | null>(null);
  const [editedTask, setEditedTask] = useState({
    task: task.task,
    description: task.description || '',
    priority: task.priority || 'Medium',
    targetDate: task.targetDate || '',
  });
  /**
   * Captured when approving finished work: the approver sets the fee at the
   * moment they release it to Accounts, so billing never has to guess.
   */
  /*
   * How this bill should divide, decided here rather than left to Accounts.
   *
   * Accounts raises the invoice but has no way of knowing whether a job was
   * shared — only the partner approving it does. Stated at the same moment as
   * the amount, by the same person, and carried to the billing dialog already
   * filled in.
   */
  const [shares, setShares] = useState<Record<string, string>>(
    () => fromBillShares((task as any).billingShares),
  );

  const [billingAmount, setBillingAmount] = useState(
    task.taxableAmount != null ? String(task.taxableAmount) : ''
  );
  const [billingNote, setBillingNote] = useState(task.billingDescription || '');
  /**
   * One box, two destinations. Whatever is written here goes into the task's
   * approval thread — as the sign-off note when approving, or as what needs
   * fixing when sending the work back. Two separate textareas for the same
   * conversation is how a thread ends up half-recorded.
   */
  const [comment, setComment] = useState('');
  const { showSuccess, showError } = useToast();

  /** The thread entry that accompanies a decision, or nothing if none was written. */
  const commentPayload = (kind: 'approval' | 'change_request' | 'note') => {
    const message = comment.trim();
    if (!message) return {};
    return {
      comment: { message, authorId: approverId, authorName: approverName, authorRole: approverRole, kind },
    };
  };

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
    // The amount travels with the approval, so Accounts receives a task that is
    // already priced. Guarded here because the field is the whole point of the
    // completion gate.
    let amount = 0;
    if (isCompletionReview) {
      amount = parseFloat(billingAmount);
      if (!billingAmount.trim() || isNaN(amount) || amount < 0) {
        showError('Enter the billing amount before approving');
        return;
      }
      if (!divisionReady(shares)) {
        showError('Give the partners and directors 100% of what is left after the office pool');
        return;
      }
    }
    setLoading(true);
    try {
      const response = await tasksAPI.update(task.id, {
        status: approvedStatus,
        approvedBy: approverName,
        approvedById: approverId,
        approvedAt: new Date().toISOString(),
        // Claim an unrouted task, so every later step has someone to go back to.
        ...(task.approverId ? {} : { approverId, approverName }),
        ...(isCompletionReview ? {
          billingShares: toBillShares(shares),
          taxableAmount: amount,
          billingFees: amount,
          billingDescription: billingNote.trim(),
        } : {}),
        ...commentPayload('approval'),
      });
      if (response.success) {
        showSuccess(isCompletionReview
          ? 'Approved and sent to Accounts for billing.'
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
        ...(task.approverId ? {} : { approverId, approverName }),
        ...commentPayload('approval'),
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

  /**
   * Send the task back with what needs fixing.
   *
   * The reason is required. Sending work back used to write a bare
   * "[Rejected by X on date]" with no reason at all, so the person receiving it
   * learned only that it had been refused — and had to come and ask why. The
   * note goes into the thread, and the server mirrors it onto the task so the
   * assignee's dashboard can show it without opening anything.
   */
  const handleRequestChanges = async () => {
    const reason = comment.trim();
    if (!reason) {
      showError('Say what needs changing before sending it back');
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        status: rejectedStatus,
        ...commentPayload('change_request'),
      };

      // The legacy marker, for the new-task gate only: 'Returned for correction'
      // and EditTaskModal's resubmit both still read pre-thread rows out of it.
      // Finished work does not get one — its round is tracked properly now, and
      // the marker would offer "Edit & Resubmit" for work that needs redoing,
      // not re-describing.
      if (!isCompletionReview) {
        const note = `[Rejected by ${approverName} on ${new Date().toLocaleDateString('en-IN')}]: ${reason}`;
        updates.comments = task.comments ? `${task.comments}\n${note}` : note;
      }

      const response = await tasksAPI.update(task.id, updates);
      if (response.success) {
        showSuccess(isCompletionReview
          ? `Sent back to ${task.assignedTo} for changes.`
          : 'Task sent back for correction.');
        onSuccess();
      } else {
        showError(response.message || response.error || 'Failed to send the task back');
      }
    } catch (error) {
      console.error('Error sending task back:', error);
      showError('Failed to send the task back. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = action === 'edit' ? 'Edit task details before approving'
    : isCompletionReview ? 'Approve the completed work, or send it back for changes'
    : 'Approve this task, edit it first, or send it back';

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
                {/* How many times this has already come back. A third pass over
                    the same work is worth a closer read than a first. */}
                {task.revisionCount > 0 && (
                  <Row label="Rounds">
                    <span className="inline-block rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[0.72rem] font-medium text-orange-700">
                      Sent back {task.revisionCount}× before
                    </span>
                  </Row>
                )}
              </dl>

              {/* The completion gate is where the fee is set. Accounts bills what
                  is agreed here, so the task reaches them already priced rather
                  than needing a separate send-for-billing step. */}
              {isCompletionReview && (
                <div className="mt-5 space-y-4 rounded-xl border border-[#E7EDF4] bg-[#FAFBFD] p-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                      Billing amount <span className="text-[#c0392b]">*</span>
                    </label>
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={billingAmount}
                      onChange={e => setBillingAmount(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Sent to Accounts with the task when you approve.
                    </p>
                  </div>
                  <BillDivision

                    amount={parseFloat(billingAmount) || 0}

                    defaultHolderId={task.approverId || approverId}

                    value={shares}

                    onChange={setShares}

                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                      Billing note <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      className={inputCls}
                      value={billingNote}
                      onChange={e => setBillingNote(e.target.value)}
                      placeholder="What the invoice should say…"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* The conversation behind the decision. Shown at both gates and in
              both modes: what the team said about this work is exactly what an
              approver needs before releasing it to Accounts, and it is the only
              place a send-back and its answer are recorded together. */}
          {action !== 'edit' && (
            <div className="mt-5 space-y-3">
              <TaskCommentThread
                taskId={task.id}
                emptyHint={isCompletionReview
                  ? 'The work was submitted without a note.'
                  : 'Nothing has been said about this task yet.'}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  Your comment{' '}
                  <span className="font-normal text-muted-foreground">
                    (required to send back)
                  </span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  disabled={loading}
                  rows={3}
                  placeholder="What needs changing, or anything to note on approval…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}

          {action === 'edit' && (
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
              {/* Not "Reject": the task is not thrown away, it goes back to the
                  person who submitted it with what to fix. Disabled until a
                  reason is written — sending work back without one is what made
                  the old flow impossible to act on. */}
              <Button
                size="sm"
                variant="danger"
                onClick={handleRequestChanges}
                disabled={loading || !comment.trim()}
                title={comment.trim() ? undefined : 'Write what needs changing first'}
              >
                <RotateCcw size={14} /> {loading ? 'Sending…' : 'Request Changes'}
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
