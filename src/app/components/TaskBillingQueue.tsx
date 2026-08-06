import React, { useMemo, useState } from 'react';
import { Search, IndianRupee, AlertTriangle, ReceiptText } from 'lucide-react';
import { MarkAsBilledModal } from './MarkAsBilledModal';
import { statusColor, statusLabel } from '../utils/taskStatus';
import { formatINR } from '../utils/revenue';

const NAVY = '#1b365d';

interface TaskBillingQueueProps {
  tasks: any[];
  user?: { id: string; name: string; email: string; role: string };
  /** Refetch after a bill is raised, so the task leaves the queue. */
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
export function TaskBillingQueue({ tasks, user, onBilled }: TaskBillingQueueProps) {
  const [search, setSearch] = useState('');
  const [billing, setBilling] = useState<any>(null);

  const { awaiting, billed } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (t: any) => !q || [t.client, t.task, t.assignedTo, t.category, t.billNumber]
      .some(v => (v || '').toString().toLowerCase().includes(q));

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
  }, [tasks, search]);

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
                <button
                  onClick={() => setBilling(task)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]"
                >
                  <IndianRupee size={13} /> Mark as billed
                </button>
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
            {billed.map(task => <Row key={task.id} task={task} />)}
          </div>
        )}
      </section>

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

function Row({ task, action }: { task: any; action?: React.ReactNode }) {
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
