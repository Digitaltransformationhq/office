import React, { useMemo, useState } from 'react';
import { Search, IndianRupee, AlertTriangle, ReceiptText, Undo2, XCircle } from 'lucide-react';
import { MarkAsBilledModal } from './MarkAsBilledModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { billingAPI, tasksAPI } from '../services/api';
import { statusColor, statusLabel } from '../utils/taskStatus';
import { formatINR, type BillingRecord } from '../utils/revenue';

const NAVY = '#1b365d';

interface TaskBillingQueueProps {
  tasks: any[];
  /** Needed to find the invoice behind a billed task, so it can be undone. */
  records: BillingRecord[];
  user?: { id: string; name: string; email: string; role: string };
  /** Refetch after a bill is raised or removed, so the lists and the revenue
   *  figures both move together. */
  onBilled: () => void;
}

const amountOf = (t: any) => Number(t.taxableAmount ?? t.billingFees ?? t.budgetedFee ?? 0) || 0;

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

/**
 * Task billing, for the Accounts desk.
 *
 * Two questions and nothing else: what has been released to Accounts and still
 * needs an invoice, and what has already been billed. The revenue analytics and
 * the client fee schedule sit on the same screen for partners and admin, but
 * they answer a different question — how the firm is doing — which is not this
 * desk's to read.
 */
export function TaskBillingQueue({ tasks, records, user, onBilled }: TaskBillingQueueProps) {
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState('');
  const [billing, setBilling] = useState<any>(null);
  const [undoing, setUndoing] = useState<{ task: any; record: BillingRecord } | null>(null);
  const [dropping, setDropping] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  /*
   * Only an admin can take a bill back.
   *
   * It is the correction for Accounts having billed something by mistake, so it
   * cannot sit with the desk that made the mistake — otherwise the record and
   * the check on it are the same person.
   */
  const canUndo = user?.role === 'admin';

  /** The invoice raised against a task, if there is one. */
  const recordFor = useMemo(() => {
    const byTask = new Map<string, BillingRecord>();
    for (const r of records) if (r.taskId) byTask.set(r.taskId, r);
    return (taskId: string) => byTask.get(taskId) || null;
  }, [records]);

  /*
   * Take a task out of the billing queue without invoicing it.
   *
   * The counterpart to removing a bill: that one withdraws an invoice already
   * raised, this one withdraws work that was released for billing and should
   * not be. Both land the task on 'Completed' — done, with nothing to charge —
   * so neither leaves anything sitting in a queue.
   *
   * The task itself is not deleted. The work happened, and the record of who did
   * it and when is worth more than a tidy list.
   */
  const drop = async () => {
    if (!dropping) return;
    setBusy(true);
    try {
      const r = await tasksAPI.update(dropping.id, { status: 'Completed' });
      if (r.success) {
        showSuccess(`${dropping.client || dropping.task} removed from billing`);
        setDropping(null);
        onBilled();
      } else {
        showError(r.error || 'Failed to remove it from billing');
      }
    } catch {
      showError('Failed to remove it from billing. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!undoing) return;
    setBusy(true);
    try {
      const r = await billingAPI.delete(undoing.record.id);
      if (r.success) {
        // The server marks the task Completed rather than re-queueing it, so it
        // leaves this screen entirely.
        showSuccess(`Bill ${undoing.record.billNumber} removed`);
        setUndoing(null);
        onBilled();
      } else {
        showError(r.error || 'Failed to remove the bill');
      }
    } catch {
      showError('Failed to remove the bill. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const { awaiting, billed } = useMemo(() => {
    const q = search.trim().toLowerCase();
    /*
     * The bill number is not on the task — it is on the invoice raised against
     * it, which this screen already has to hand.
     *
     * Searching `t.billNumber` matched nothing, ever: tasks carry no such
     * field, so the one term anybody types here that is exact and unambiguous
     * was the one term that could not be found. Looked up through the record
     * instead, along with the remarks written on it.
     */
    const match = (t: any) => {
      if (!q) return true;
      const rec = recordFor(t.id);
      return [t.client, t.task, t.assignedTo, t.category, rec?.billNumber, rec?.remarks]
        .some(v => (v ?? '').toString().toLowerCase().includes(q));
    };

    return {
      // Released by a partner and waiting on an invoice.
      awaiting: tasks
        .filter(t => t.status === 'Pending for Billing' && match(t))
        .sort((a, b) => (a.completionDate || '').localeCompare(b.completionDate || '')),
      billed: tasks
        .filter(t => t.status === 'Billed' && match(t))
        // Newest first: an invoice raised this morning is the one being checked.
        .sort((a, b) => (b.completionDate || '').localeCompare(a.completionDate || '')),
    };
  }, [tasks, search, recordFor]);

  const awaitingValue = awaiting.reduce((sum, t) => sum + amountOf(t), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Task billing</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Work released for billing, and what has already been invoiced
          </p>
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, task, staff, bill no…"
            className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#FDE68A] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#FDE68A] bg-[#FFFBEB] px-5 py-3">
          <AlertTriangle size={14} className="text-[#92400E]" />
          <h3 className="text-sm font-semibold text-[#92400E]">Awaiting invoice</h3>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">{awaiting.length}</span>
          {awaitingValue > 0 && (
            <span className="ml-auto text-xs text-[#92400E]">{formatINR(awaitingValue)} to bill</span>
          )}
        </div>
        {awaiting.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing waiting to be invoiced.</p>
        ) : (
          <div className="divide-y divide-[#F1F4F8]">
            {awaiting.map(task => (
              <Row key={task.id} task={task} action={
                <>
                  {canUndo && (
                    <button
                      onClick={() => setDropping(task)}
                      title="Remove from billing without raising an invoice"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#991B1B]"
                    >
                      <XCircle size={13} /> Remove
                    </button>
                  )}
                  <button
                    onClick={() => setBilling(task)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]"
                  >
                    <IndianRupee size={13} /> Mark as billed
                  </button>
                </>
              } />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3">
          <ReceiptText size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>Billed</h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-muted-foreground">{billed.length}</span>
        </div>
        {billed.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {search.trim() ? 'Nothing billed matches that search.' : 'Nothing billed yet.'}
          </p>
        ) : (
          <div className="divide-y divide-[#F1F4F8]">
            {billed.map(task => {
              const record = recordFor(task.id);
              return (
                <Row
                  key={task.id}
                  task={task}
                  billNumber={record?.billNumber}
                  action={canUndo && record ? (
                    <button
                      onClick={() => setUndoing({ task, record })}
                      title="Delete this invoice — the task is marked completed, not re-queued"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#991B1B]"
                    >
                      <Undo2 size={13} /> Undo bill
                    </button>
                  ) : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      {dropping && (
        <ConfirmDialog
          title="Remove from billing?"
          message={
            `${dropping.client || 'No client'} — ${dropping.task}${amountOf(dropping) > 0 ? ` · ${formatINR(amountOf(dropping))}` : ''}.\n\n` +
            'No invoice is raised. The task is marked completed and leaves this queue, so nothing is left waiting to be billed.\n\n' +
            'The task itself is kept — only its billing is withdrawn. To bill this work later it would have to be sent for billing again.'
          }
          confirmLabel={busy ? 'Removing…' : 'Remove from billing'}
          variant="danger"
          onConfirm={drop}
          onCancel={() => setDropping(null)}
        />
      )}

      {undoing && (
        <ConfirmDialog
          title="Remove this bill?"
          message={
            `Bill ${undoing.record.billNumber} for ${undoing.task.client} — ${formatINR(Number(undoing.record.taxableAmount) || 0)}.\n\n` +
            'The invoice is deleted and revenue for the period drops by this amount. ' +
            'The task is marked completed and does not return to "Awaiting invoice", so nothing is left waiting to be billed.\n\n' +
            'This cannot be undone. To bill this work again it would have to be sent for billing afresh.'
          }
          confirmLabel={busy ? 'Removing…' : 'Remove bill'}
          variant="danger"
          onConfirm={undo}
          onCancel={() => setUndoing(null)}
        />
      )}

      {billing && user && (
        <MarkAsBilledModal
          task={billing}
          user={user}
          onClose={() => setBilling(null)}
          onSuccess={() => { setBilling(null); onBilled(); }}
        />
      )}
    </div>
  );
}

function Row({ task, action, billNumber }: { task: any; action?: React.ReactNode; billNumber?: string }) {
  const amount = amountOf(task);
  return (
    <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.86rem] font-medium" style={{ color: NAVY }}>{task.client}</p>
        <p className="truncate text-xs text-muted-foreground">{task.task}</p>
        <p className="truncate text-[0.68rem] text-muted-foreground/75">
          {task.assignedTo || 'Unassigned'}
          {task.category && ` · ${task.category}`}
          {task.completionDate && ` · completed ${shortDate(task.completionDate)}`}
          {billNumber && ` · ${billNumber}`}
        </p>
        {/* The note the partner left when releasing it — often the only place
            that says what to put on the invoice. */}
        {task.billingDescription && (
          <p className="mt-1 text-[0.72rem] italic text-muted-foreground">{task.billingDescription}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {amount > 0 && (
          <span className="identifier text-[0.82rem] font-semibold" style={{ color: NAVY }}>{formatINR(amount)}</span>
        )}
        <span className={`rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${statusColor(task.status)}`}>
          {statusLabel(task.status)}
        </span>
        {action}
      </div>
    </div>
  );
}
