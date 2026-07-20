/**
 * The task lifecycle, in one place.
 *
 *   Pending ──[Start]──> In Progress ──[Mark Done]──> Pending Approval - Completion
 *      │                                                        │
 *      │                                                  [Approve]
 *      │                                                        ▼
 *      └──<─[Reject]────────────────────────────────  Pending for Billing
 *                                                               │
 *                                                       [Mark Billed]
 *                                                               ▼
 *                                                          Completed
 *
 * A NEW task created by staff starts at 'Pending Approval' instead, and a
 * partner's sign-off moves it to 'Pending' so work can begin. That gate is
 * deliberately a different status from the completion gate: approving a new
 * task means "go start it", approving a finished one means "go bill it", and
 * one status cannot mean both.
 *
 * 'Billed' is legacy. Marking a bill now lands on 'Completed'; the value is
 * kept so existing rows still render.
 */

export const TASK_STATUS = {
  pending: 'Pending',
  inProgress: 'In Progress',
  pendingNewTaskApproval: 'Pending Approval',
  pendingCompletionApproval: 'Pending Approval - Completion',
  pendingForBilling: 'Pending for Billing',
  completed: 'Completed',
  overdue: 'Overdue',
  /** @deprecated Superseded by `completed`; retained so old rows still render. */
  billed: 'Billed',
} as const;

/**
 * Tailwind chip classes per status. Both approval gates share one look, because
 * to the person reading the board they are one thing: a partner has to sign this
 * off. Which gate it is only matters to the code deciding where an approval
 * sends the task.
 */
export const STATUS_COLOR: Record<string, string> = {
  [TASK_STATUS.pending]: 'bg-slate-100 text-slate-600',
  [TASK_STATUS.inProgress]: 'bg-blue-100 text-blue-700',
  [TASK_STATUS.pendingNewTaskApproval]: 'bg-amber-100 text-amber-700',
  [TASK_STATUS.pendingCompletionApproval]: 'bg-amber-100 text-amber-700',
  [TASK_STATUS.pendingForBilling]: 'bg-purple-100 text-purple-700',
  [TASK_STATUS.completed]: 'bg-green-100 text-green-700',
  [TASK_STATUS.overdue]: 'bg-red-100 text-red-700',
  [TASK_STATUS.billed]: 'bg-teal-100 text-teal-700',
};

/** Never leave a status unstyled — an unknown value still needs to read as a chip. */
export const statusColor = (status?: string) =>
  STATUS_COLOR[status || ''] || 'bg-slate-100 text-slate-600';

/**
 * What the user actually reads. Both gates display as "Pending for Approval":
 * the stage means the same thing to whoever is looking at the task, and the
 * stored value is split in two only so the approve action knows whether to send
 * the task to 'Pending' (start the work) or 'Pending for Billing' (bill it).
 * That is an implementation detail and has no business being on screen.
 */
export const STATUS_LABEL: Record<string, string> = {
  [TASK_STATUS.pendingNewTaskApproval]: 'Pending for Approval',
  [TASK_STATUS.pendingCompletionApproval]: 'Pending for Approval',
};

export const statusLabel = (status?: string) =>
  STATUS_LABEL[status || ''] || status || 'Pending';

/**
 * Sitting in front of a partner, at either gate — a new task waiting to start,
 * or finished work waiting to be billed. Both land in the same approval queue,
 * so anything counting "pending approvals" has to count both.
 */
export const isAwaitingApproval = (status?: string) =>
  status === TASK_STATUS.pendingNewTaskApproval ||
  status === TASK_STATUS.pendingCompletionApproval;

/**
 * Still being worked on or moved through the pipeline — anything short of the
 * terminal state. Billing stages count as open: the work is finished but the
 * task is not off anyone's plate yet.
 */
export const isOpenTask = (status?: string) =>
  status !== TASK_STATUS.completed && status !== TASK_STATUS.billed;
