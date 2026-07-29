import React from 'react';
import { TaskCommentThread } from './TaskCommentThread';
import { X } from 'lucide-react';

/**
 * The approval conversation on its own, opened from a task list.
 *
 * Separate from the modals that act on a task: reading what was said, or adding
 * to it, should not require being at a decision point. Anyone who can see the
 * task can see the thread — the record of why work was sent back is exactly the
 * thing the next person needs.
 */

interface TaskThreadModalProps {
  task: any;
  user: { id: string; name: string; role: string };
  onClose: () => void;
  /** Called after a comment is posted, so the caller can refresh its list. */
  onPosted?: () => void;
}

const NAVY = '#1b365d';

export function TaskThreadModal({ task, user, onClose, onPosted }: TaskThreadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[1.02rem] font-semibold" style={{ color: NAVY }}>
              {task.task}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {task.client}
              {task.revisionCount > 0 && (
                <span> · sent back {task.revisionCount}×</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {task.changesRequestedAt && task.changesRequestedNote && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                Waiting on changes
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-orange-900">
                {task.changesRequestedNote}
              </p>
            </div>
          )}

          <TaskCommentThread
            taskId={task.id}
            composer={user}
            maxHeightCls="max-h-[46vh]"
            emptyHint="Nothing has been said about this task yet."
            onPosted={onPosted}
          />
        </div>
      </div>
    </div>
  );
}
