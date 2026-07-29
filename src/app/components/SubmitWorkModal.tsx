import React, { useState } from 'react';
import { Button } from './Button';
import { tasksAPI } from '../services/api';
import { useToast } from './Toast';
import { TaskCommentThread } from './TaskCommentThread';
import { TASK_STATUS } from '../utils/taskStatus';
import { X, CheckCheck, RotateCcw } from 'lucide-react';

/**
 * Marking work done, with the note that goes to the approver.
 *
 * "Done" used to be a bare status write, so finished work arrived at the
 * approval queue with nothing said about it — the partner had to guess what was
 * delivered, and there was no way to answer a question they had raised. The note
 * lands in the task's approval thread, which the approver reads before releasing
 * the task to Accounts and which survives every send-back and resubmission.
 *
 * When the task has an open change request this becomes a resubmission: what was
 * asked for is shown at the top, and the note is required — the whole point of
 * the round is to say what changed.
 */

interface SubmitWorkModalProps {
  task: any;
  user: { id: string; name: string; role: string };
  onClose: () => void;
  /** Called after the task has moved to the completion-approval gate. */
  onSuccess: () => void;
}

const NAVY = '#1b365d';

export function SubmitWorkModal({ task, user, onClose, onSuccess }: SubmitWorkModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const isResubmission = Boolean(task.changesRequestedAt);

  const handleSubmit = async () => {
    const message = note.trim();
    if (isResubmission && !message) {
      showError('Say what you changed before resubmitting');
      return;
    }

    setLoading(true);
    try {
      const response = await tasksAPI.update(task.id, {
        status: TASK_STATUS.pendingCompletionApproval,
        // The note travels with the status, so the approver never sees work
        // arrive without the explanation that was written for it.
        ...(message ? {
          comment: {
            message,
            authorId: user.id,
            authorName: user.name,
            authorRole: user.role,
            kind: 'submission',
          },
        } : {}),
      });

      if (!response?.success) {
        throw new Error(response?.message || response?.error || 'Failed to submit work');
      }

      showSuccess(isResubmission
        ? 'Resubmitted for approval.'
        : 'Sent for approval.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting work for approval:', error);
      showError(error?.message || 'Failed to submit for approval. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: isResubmission ? 'rgba(234,88,12,0.1)' : 'rgba(61,138,34,0.12)',
                color: isResubmission ? '#c2410c' : '#3d8a22',
              }}
            >
              {isResubmission ? <RotateCcw size={19} /> : <CheckCheck size={19} />}
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>
                {isResubmission ? 'Resubmit for Approval' : 'Send for Approval'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isResubmission
                  ? 'Tell the approver what you changed'
                  : 'Add anything the approver should know'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl bg-[#F4F6F9] p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Task</p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: NAVY }}>{task.task}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {task.client}
              {task.revisionCount > 0 && (
                <span className="text-orange-600">
                  {' '}· round {task.revisionCount + 1}
                </span>
              )}
            </p>
          </div>

          {/* What was asked for, kept in front of the person answering it. */}
          {isResubmission && task.changesRequestedNote && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                {task.changesRequestedBy
                  ? `${task.changesRequestedBy} asked for`
                  : 'Changes requested'}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-orange-900">
                {task.changesRequestedNote}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
              {isResubmission ? 'What you changed' : 'Note for the approver'}{' '}
              {isResubmission
                ? <span className="text-[#c0392b]">*</span>
                : <span className="font-normal text-muted-foreground">(optional)</span>}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder={isResubmission
                ? 'Describe how you addressed the points raised…'
                : 'What was delivered, anything outstanding, what to bill for…'}
              className="w-full resize-none rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Added to the approval thread below — the approver reads it before sending the task to Accounts.
            </p>
          </div>

          <TaskCommentThread
            taskId={task.id}
            emptyHint="Nothing has been said about this task yet."
          />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-[#E7EDF4] px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (isResubmission && !note.trim())}
            className="flex-1"
          >
            {loading
              ? 'Sending…'
              : isResubmission ? 'Resubmit for Approval' : 'Send for Approval'}
          </Button>
        </div>
      </div>
    </div>
  );
}
