import React, { useEffect, useState } from 'react';
import { tasksAPI, type TaskComment, type NewTaskComment } from '../services/api';
import { useToast } from './Toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';

/**
 * The conversation attached to a task's approval.
 *
 * Read-only by default. Give it `composer` to let the reader add a plain note;
 * the notes that accompany a decision (submitting work, requesting changes,
 * approving) are sent with that decision instead, so they cannot half-apply.
 *
 * Rendered wherever the approval is being judged — the member submitting, the
 * partner reviewing, and Accounts cutting the invoice all read the same thread.
 */

const NAVY = '#1b365d';

/**
 * Each kind gets a distinct band so a long thread can be skimmed for the round
 * boundaries — where work went over, where it came back — without reading every
 * message.
 */
const KIND_STYLE: Record<TaskComment['kind'], { label: string; chip: string; rail: string }> = {
  submission: {
    label: 'Submitted for approval',
    chip: 'border border-blue-200 bg-blue-50 text-blue-700',
    rail: 'bg-blue-400',
  },
  change_request: {
    label: 'Changes requested',
    chip: 'border border-orange-200 bg-orange-50 text-orange-700',
    rail: 'bg-orange-400',
  },
  approval: {
    label: 'Approved',
    chip: 'border border-green-200 bg-green-50 text-green-700',
    rail: 'bg-green-500',
  },
  note: {
    label: 'Comment',
    chip: 'border border-slate-200 bg-slate-50 text-slate-600',
    rail: 'bg-slate-300',
  },
};

const kindStyle = (kind: TaskComment['kind']) => KIND_STYLE[kind] || KIND_STYLE.note;

const stamp = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

interface TaskCommentThreadProps {
  taskId: string;
  /** Supply to show a composer for plain notes. Omitted renders read-only. */
  composer?: {
    id: string;
    name: string;
    role: string;
  };
  /** Shown when the task has no comments yet. */
  emptyHint?: string;
  /** Tailwind max-height for the scroll region. */
  maxHeightCls?: string;
  /** Bumping this refetches — used after a decision writes to the thread. */
  refreshKey?: number;
  /** Told after a note is posted, so a parent can refresh alongside. */
  onPosted?: () => void;
}

export function TaskCommentThread({
  taskId,
  composer,
  emptyHint = 'No comments yet.',
  maxHeightCls = 'max-h-64',
  refreshKey = 0,
  onPosted,
}: TaskCommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await tasksAPI.getComments(taskId);
        if (cancelled) return;
        // A missing task_comments table (migration not yet run) must not blank
        // the modal it sits in — the thread simply reads as empty.
        if (!res?.success) throw new Error(res?.error || 'Failed to load comments');
        setComments(res.data);
      } catch (e) {
        if (!cancelled) {
          console.error('Error loading task comments:', e);
          setComments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    load();
    return () => { cancelled = true; };
  }, [taskId, refreshKey]);

  const post = async () => {
    const message = draft.trim();
    if (!message || !composer || posting) return;

    setPosting(true);
    try {
      const payload: NewTaskComment = {
        message,
        authorId: composer.id,
        authorName: composer.name,
        authorRole: composer.role,
        kind: 'note',
      };
      const res = await tasksAPI.addComment(taskId, payload);
      if (!res?.success || !res.data) throw new Error(res?.error || 'Failed to add comment');
      setComments(prev => [...prev, res.data as TaskComment]);
      setDraft('');
      onPosted?.();
    } catch (e) {
      console.error('Error adding task comment:', e);
      showError('Failed to add comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E7EDF4] bg-white">
      <div className="flex items-center gap-2 border-b border-[#EFF3F8] px-4 py-2.5">
        <MessageSquare size={14} className="text-muted-foreground" />
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Approval thread
        </p>
        {comments.length > 0 && (
          <span className="ml-auto rounded-md bg-[#F4F6F9] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {comments.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: NAVY }} />
        </div>
      ) : comments.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className={`divide-y divide-[#F1F4F8] overflow-y-auto ${maxHeightCls}`}>
          {comments.map((c) => {
            const style = kindStyle(c.kind);
            return (
              <li key={c.id} className="flex gap-3 px-4 py-3">
                {/* A coloured rail rather than a badge per row: it marks the
                    round boundaries down the left edge without competing with
                    the message for attention. */}
                <span className={`mt-1 w-0.5 shrink-0 self-stretch rounded-full ${style.rail}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.78rem] font-semibold" style={{ color: NAVY }}>
                      {c.authorName}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${style.chip}`}>
                      {style.label}
                    </span>
                    <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                      {stamp(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-[0.82rem] leading-relaxed text-foreground/80">
                    {c.message}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {composer && (
        <div className="flex items-end gap-2 border-t border-[#EFF3F8] p-3">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            disabled={posting}
            className="min-h-[42px] flex-1 resize-none rounded-lg border border-[#E7EDF4] bg-white px-3 py-2 text-[0.82rem] outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
          />
          <button
            type="button"
            onClick={post}
            disabled={posting || !draft.trim()}
            aria-label="Post comment"
            className="flex h-[42px] w-11 shrink-0 items-center justify-center rounded-lg bg-[#1b365d] text-white transition-colors hover:bg-[#142a4a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}
