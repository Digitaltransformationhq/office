import React, { useMemo, useState } from 'react';
import { X, Building2, Pencil, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { NAVY, rupees, overlayCls, panelCls } from './clientModalUI';
import { statusColor, statusLabel, isFinishedTask } from '../utils/taskStatus';
import { sortTasks } from '../utils/sorting';

/**
 * Read-only view of one task, beside every other task for the same client.
 *
 * Opened by clicking a task or client name in Task MIS. Until this existed the
 * only way to read a task's details was its Edit dialog, which meant opening a
 * form — and risking a stray change — just to look something up, and gave no
 * view at all of what had been done for the client before.
 */

interface TaskDetailsModalProps {
  /** Every task the viewer may see; the client's history is drawn from these. */
  tasks: any[];
  client: string;
  /** The task to show first. Absent when opened from the client name. */
  initialTaskId?: string;
  /** Fees and billing are partner information, as elsewhere in Task MIS. */
  showBilling: boolean;
  /** Whether the viewer may edit / open the thread of this task. */
  canAct: (task: any) => boolean;
  onEdit: (task: any) => void;
  onOpenThread: (task: any) => void;
  onClose: () => void;
}

const sameClient = (a?: string, b?: string) =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export function TaskDetailsModal({
  tasks, client, initialTaskId, showBilling, canAct, onEdit, onOpenThread, onClose,
}: TaskDetailsModalProps) {
  // A–Z within each group, like every list in the app.
  const { open, past } = useMemo(() => {
    const mine = tasks.filter(t => sameClient(t.client, client));
    return {
      open: sortTasks(mine.filter(t => !isFinishedTask(t.status))),
      past: sortTasks(mine.filter(t => isFinishedTask(t.status))),
    };
  }, [tasks, client]);

  const all = [...open, ...past];
  const [selectedId, setSelectedId] = useState<string | undefined>(initialTaskId ?? all[0]?.id);
  // Phones show one pane at a time: straight to the task when a task was
  // clicked, to the client's list when the client was.
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>(initialTaskId ? 'detail' : 'list');

  // Looked up from the live list, so an edit made from here shows on return.
  const selected = all.find(t => t.id === selectedId);

  const select = (id: string) => { setSelectedId(id); setMobilePane('detail'); };

  return (
    <div className={overlayCls} onClick={onClose}>
      <div className={`${panelCls} max-w-5xl`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[1.05rem] font-semibold" style={{ color: NAVY }}>{client || 'No client'}</h2>
              <p className="text-xs text-muted-foreground">
                {all.length} {all.length === 1 ? 'task' : 'tasks'} · {open.length} open · {past.length} completed
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Client's tasks */}
          <aside className={`${mobilePane === 'list' ? 'flex' : 'hidden'} w-full min-h-0 flex-col overflow-y-auto border-[#E7EDF4] md:flex md:w-[300px] md:shrink-0 md:border-r`}>
            <TaskGroup title="Open" tasks={open} selectedId={selectedId} onSelect={select} />
            <TaskGroup title="Past / completed" tasks={past} selectedId={selectedId} onSelect={select} />
            {all.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No tasks for this client.</p>}
          </aside>

          {/* Selected task */}
          <section className={`${mobilePane === 'detail' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 md:block`}>
            <button onClick={() => setMobilePane('list')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground md:hidden">
              <ChevronLeft size={14} /> All tasks for this client
            </button>
            {selected ? (
              <TaskDetail
                task={selected}
                showBilling={showBilling}
                canAct={canAct(selected)}
                onEdit={() => onEdit(selected)}
                onOpenThread={() => onOpenThread(selected)}
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Select a task to see its details.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TaskGroup({ title, tasks, selectedId, onSelect }: {
  title: string; tasks: any[]; selectedId?: string; onSelect: (id: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="py-2">
      <p className="px-5 pb-1 pt-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title} ({tasks.length})
      </p>
      {tasks.map(t => {
        const on = t.id === selectedId;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex w-full items-center gap-2 border-l-2 px-5 py-2.5 text-left transition-colors ${on ? 'border-[#1b365d] bg-[rgba(27,54,93,0.05)]' : 'border-transparent hover:bg-[#F9FBFD]'}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }}>{t.task}</p>
              <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                {[t.category, t.assignedTo, fmtDate(t.completionDate || t.targetDate)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.6rem] font-medium ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
            <ChevronRight size={14} className="shrink-0 text-muted-foreground/50 md:hidden" />
          </button>
        );
      })}
    </div>
  );
}

function TaskDetail({ task, showBilling, canAct, onEdit, onOpenThread }: {
  task: any; showBilling: boolean; canAct: boolean; onEdit: () => void; onOpenThread: () => void;
}) {
  const assign = task.assignmentStatus || 'Accepted';
  const hours = [
    task.hoursLogged ? `${task.hoursLogged} logged` : '',
    task.estimatedHours ? `${task.estimatedHours} estimated` : '',
  ].filter(Boolean).join(' · ');

  const rows: [string, React.ReactNode][] = [
    ['Category', task.category],
    ['Priority', task.priority],
    ['Assigned to', task.assignedTo],
    ['Acceptance', assign !== 'Accepted' ? assign : ''],
    ['Assigned by', task.originallyAssignedByName || task.createdBy],
    ['Reassigned from', task.reassignedFromName],
    ['Start date', fmtDate(task.startDate)],
    ['Due date', fmtDate(task.targetDate)],
    ['Completed on', fmtDate(task.completionDate)],
    ['Hours', hours],
    ['Approver', task.approverName],
    ['Approved by', task.approvedBy ? `${task.approvedBy}${task.approvedAt ? ` on ${fmtDate(task.approvedAt)}` : ''}` : ''],
    ['Revisions', task.revisionCount ? String(task.revisionCount) : ''],
    ['Created', fmtDate(task.createdAt)],
  ];

  const billing: [string, React.ReactNode][] = showBilling ? [
    ['Budgeted fee', task.budgetedFee ? rupees(task.budgetedFee) : ''],
    ['Billing fees', task.billingFees ? rupees(task.billingFees) : ''],
    ['Taxable amount', task.taxableAmount ? rupees(task.taxableAmount) : ''],
    ['Billing note', task.billingDescription],
    ['Billed by', task.billedByName],
  ] : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>{task.task}</h3>
          <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-medium ${statusColor(task.status)}`}>{statusLabel(task.status)}</span>
        </div>
        {canAct && (
          <div className="flex items-center gap-2">
            <button onClick={onOpenThread} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]" style={{ color: NAVY }}>
              <MessageSquare size={14} /> Approval thread
            </button>
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]">
              <Pencil size={14} /> Edit
            </button>
          </div>
        )}
      </div>

      {task.changesRequestedAt && (
        <Notice tone="orange" title={`Changes requested${task.changesRequestedBy ? ` by ${task.changesRequestedBy}` : ''}`}>
          {task.changesRequestedNote}
        </Notice>
      )}
      {assign === 'Rejected' && task.rejectionReason && (
        <Notice tone="red" title="Rejected by assignee">{task.rejectionReason}</Notice>
      )}

      <DetailList rows={rows} />
      {billing.some(([, v]) => v) && (
        <>
          <p className="mb-2 mt-5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Billing</p>
          <DetailList rows={billing} />
        </>
      )}

      {task.comments && (
        <>
          <p className="mb-2 mt-5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Comments</p>
          <p className="whitespace-pre-wrap rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] px-4 py-3 text-sm text-foreground/80">{task.comments}</p>
        </>
      )}
    </div>
  );
}

/** Label/value rows, leaving out anything empty rather than printing dashes. */
function DetailList({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== '' && v !== null && v !== undefined);
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#E7EDF4]">
      <dl className="grid divide-y divide-[#F1F4F8] sm:grid-cols-2 sm:divide-y-0">
        {shown.map(([label, value]) => (
          <div key={label} className="flex items-start gap-3 px-4 py-2.5 sm:border-b sm:border-[#F1F4F8]">
            <dt className="w-28 shrink-0 pt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
            <dd className="min-w-0 flex-1 break-words text-sm font-medium" style={{ color: NAVY }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: 'orange' | 'red'; title: string; children?: React.ReactNode }) {
  const cls = tone === 'orange' ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-red-200 bg-red-50 text-red-800';
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-0.5 whitespace-pre-wrap">{children}</p>}
    </div>
  );
}
