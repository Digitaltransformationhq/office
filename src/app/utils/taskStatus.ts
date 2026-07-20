/**
 * The task lifecycle, in one place.
 *
 *   Pending ──[Start]──> In Progress ──[Mark Done]──> Pending Approval - Completion
 *      ▲                                                        │
 *      │                                            [Approve + amount]
 *   [Approve]                                                   ▼
 *      │                                              Pending for Billing
 *   Pending Approval                                            │
 *      ▲                                                 [Mark Billed]
 *      │                                                        ▼
 *   member/leader creates                                    Billed
 *
 * TWO CREATION FLOWS
 *
 *   A partner/admin who creates a task is the authority on it, so it starts at
 *   'Pending' and they become its approver. A member/leader who creates their
 *   own task needs sign-off first, so it starts at 'Pending Approval'; they may
 *   nominate an approver, and if they don't, whoever approves claims it.
 *
 * TWO APPROVAL GATES
 *
 *   'Pending Approval' gates a new task before work starts and approving it
 *   writes 'Pending' — go start it. 'Pending Approval - Completion' gates
 *   finished work before billing and approving it writes 'Pending for Billing'
 *   — go bill it. They are separate values because one status cannot mean both;
 *   sharing them would let an approval reset finished work to not-started.
 *   Both display as "Pending for Approval": the split is for the code, not the
 *   reader.
 *
 * TERMINAL STATE
 *
 *   'Billed' — the work is done and the invoice is raised. 'Completed' is
 *   retired from the flow and kept only so rows that still carry it render as
 *   finished.
 */

export const TASK_STATUS = {
  pending: 'Pending',
  inProgress: 'In Progress',
  pendingNewTaskApproval: 'Pending Approval',
  pendingCompletionApproval: 'Pending Approval - Completion',
  pendingForBilling: 'Pending for Billing',
  /** Terminal: work finished and invoiced. */
  billed: 'Billed',
  overdue: 'Overdue',
  /** @deprecated Retired from the flow; retained so pre-existing rows render. */
  completed: 'Completed',
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
  [TASK_STATUS.billed]: 'bg-green-100 text-green-700',
  [TASK_STATUS.overdue]: 'bg-red-100 text-red-700',
  [TASK_STATUS.completed]: 'bg-green-100 text-green-700',
};

/** Never leave a status unstyled — an unknown value still needs to read as a chip. */
export const statusColor = (status?: string) =>
  STATUS_COLOR[status || ''] || 'bg-slate-100 text-slate-600';

/**
 * What the user actually reads. Both gates display as "Pending for Approval";
 * legacy 'Completed' rows read as "Billed" so the board shows one vocabulary
 * for finished work rather than two words for the same thing.
 */
export const STATUS_LABEL: Record<string, string> = {
  [TASK_STATUS.pendingNewTaskApproval]: 'Pending for Approval',
  [TASK_STATUS.pendingCompletionApproval]: 'Pending for Approval',
  [TASK_STATUS.completed]: 'Billed',
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
 * Finished and off the board. Covers legacy 'Completed' rows alongside the
 * current terminal 'Billed', so counts and filters do not silently split the
 * firm's finished work across two buckets.
 */
export const isFinishedTask = (status?: string) =>
  status === TASK_STATUS.billed || status === TASK_STATUS.completed;

/**
 * Still being worked on or moved through the pipeline. Billing stages count as
 * open: the work is done but the task is not off anyone's plate yet.
 */
export const isOpenTask = (status?: string) => !isFinishedTask(status);

/**
 * Can this person act on the task's approval, as opposed to merely seeing it?
 * An unrouted task (no approver named at creation) is open to any partner or
 * admin; a routed one belongs to the named approver alone, so nothing can be
 * approved out from under the person it was sent to.
 */
export const canApproveTask = (
  task: { approverId?: string | null },
  user: { id: string; role: string },
) => {
  const isApprover = ['partner', 'admin', 'Partner', 'Admin'].includes(user.role);
  if (!isApprover) return false;
  return !task.approverId || task.approverId === user.id;
};
