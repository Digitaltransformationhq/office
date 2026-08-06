import React, { useEffect, useMemo, useState } from 'react';
import { itrAPI, type ItrFiling } from '../services/api';
import { useToast } from './Toast';
import { useLiveData } from '../hooks/useLiveData';
import { Button } from './Button';
import { X, Search, IndianRupee, Undo2, ReceiptText, AlertTriangle } from 'lucide-react';
import { NAVY, inputCls, overlayCls, panelCls, rupees } from './clientModalUI';
import { formatDate, today } from '../utils/gst';

interface ITRBillingQueueProps {
  currentUser: { id: string; name: string; role?: string } | null;
}

/**
 * The Accounts side of the ITR register.
 *
 * A return marked filed lands here on its own — nobody has to remember to pass
 * it on. Accounts either raises the invoice, or sends it back with a reason,
 * which returns it to the ITR desk with the objection attached.
 *
 * Lives under Billing rather than in the ITR register, because Accounts is not
 * given access to the returns themselves: they need the queue, not the whole
 * control list.
 */
export function ITRBillingQueue({ currentUser }: ITRBillingQueueProps) {
  const { showError } = useToast();
  const [queue, setQueue] = useState<ItrFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [billing, setBilling] = useState<ItrFiling | null>(null);
  const [returning, setReturning] = useState<ItrFiling | null>(null);

  useEffect(() => { load(); }, []);
  useLiveData(['itr', 'billing'], () => load({ silent: true }));

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const r = await itrAPI.getBillingQueue();
      setQueue(r.data || []);
    } catch {
      if (!silent) showError('Failed to load the ITR billing queue');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(f => [f.clientName, f.pan, f.fileNumber, f.responsiblePersonName]
      .some(v => (v || '').toLowerCase().includes(q)));
  }, [queue, search]);

  // Sent back and not yet corrected — shown first, because it is the only part
  // of this list that is stuck rather than merely waiting.
  const returned = filtered.filter(f => f.billingStatus === 'Returned');
  const pending = filtered.filter(f => f.billingStatus === 'Pending');

  const settle = (saved: ItrFiling) =>
    setQueue(prev => prev.filter(f => f.id !== saved.id).concat(
      saved.billingStatus === 'Pending' || saved.billingStatus === 'Returned' ? [saved] : []));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Income tax returns awaiting billing</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Returns arrive here automatically once the ITR desk marks them filed
          </p>
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, PAN, staff…"
            className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-[#E7EDF4] bg-white py-16 text-center text-sm text-muted-foreground">
          {queue.length === 0 ? 'Nothing waiting to be billed.' : 'Nothing matches that search.'}
        </p>
      ) : (
        <div className="space-y-4">
          {returned.length > 0 && (
            <Group
              title="Sent back, waiting on the ITR desk"
              count={returned.length}
              tone="warn"
              hint="These are with the preparer until they are corrected and filed again."
            >
              {returned.map(f => (
                <Row key={f.id} filing={f} onBill={() => setBilling(f)} onReturn={() => setReturning(f)} />
              ))}
            </Group>
          )}

          <Group title="Ready to bill" count={pending.length} tone="plain">
            {pending.length === 0
              ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing waiting.</p>
              : pending.map(f => (
                  <Row key={f.id} filing={f} onBill={() => setBilling(f)} onReturn={() => setReturning(f)} />
                ))}
          </Group>
        </div>
      )}

      {billing && (
        <MarkBilledModal
          filing={billing}
          currentUser={currentUser}
          onClose={() => setBilling(null)}
          onSaved={f => { settle(f); setBilling(null); }}
        />
      )}
      {returning && (
        <SendBackModal
          filing={returning}
          currentUser={currentUser}
          onClose={() => setReturning(null)}
          onSaved={f => { settle(f); setReturning(null); }}
        />
      )}
    </div>
  );
}

function Group({ title, count, tone, hint, children }: {
  title: string; count: number; tone: 'warn' | 'plain'; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border bg-white ${tone === 'warn' ? 'border-[#FDE68A]' : 'border-[#E7EDF4]'}`}>
      <div className={`flex flex-wrap items-center gap-2 border-b px-5 py-3 ${tone === 'warn' ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-[#E7EDF4] bg-[#FAFBFD]'}`}>
        {tone === 'warn' && <AlertTriangle size={14} className="text-[#92400E]" />}
        <h3 className="text-sm font-semibold" style={{ color: tone === 'warn' ? '#92400E' : NAVY }}>{title}</h3>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
        {hint && <p className="w-full text-xs text-muted-foreground sm:w-auto sm:flex-1">{hint}</p>}
      </div>
      <div className="divide-y divide-[#F1F4F8]">{children}</div>
    </section>
  );
}

function Row({ filing, onBill, onReturn }: { filing: ItrFiling; onBill: () => void; onReturn: () => void }) {
  const sentBack = filing.billingStatus === 'Returned';
  return (
    <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[0.86rem] font-medium" style={{ color: NAVY }}>{filing.clientName}</p>
          {filing.itrForm && (
            <span className="rounded-md bg-[#F4F6F9] px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">{filing.itrForm}</span>
          )}
          {filing.returnCount > 0 && (
            <span className="rounded-md border border-[#FECACA] bg-[#FEE2E2] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-[#991B1B]">
              sent back {filing.returnCount}×
            </span>
          )}
        </div>
        <p className="truncate font-mono text-[0.64rem] text-muted-foreground/75">
          {filing.pan || 'No PAN'}
          {filing.fileNumber && ` · ${filing.fileNumber}`}
          {filing.responsiblePersonName && ` · ${filing.responsiblePersonName}`}
          {' · F.Y. '}{filing.financialYear}
          {filing.filedOn && ` · filed ${formatDate(filing.filedOn)}`}
        </p>
        {sentBack && filing.returnedReason && (
          <p className="mt-1 text-[0.72rem] text-[#92400E]">
            <span className="font-semibold">Sent back:</span> {filing.returnedReason}
            {filing.returnedByName && <span className="opacity-70"> — {filing.returnedByName}</span>}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        {/* Nothing to send back that is already back. */}
        {!sentBack && (
          <button
            onClick={onReturn}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]"
            style={{ color: NAVY }}
          >
            <Undo2 size={13} /> Send back
          </button>
        )}
        <button
          onClick={onBill}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]"
        >
          <IndianRupee size={13} /> Mark as billed
        </button>
      </div>
    </div>
  );
}

function MarkBilledModal({ filing, currentUser, onClose, onSaved }: {
  filing: ItrFiling; currentUser: { id: string; name: string } | null;
  onClose: () => void; onSaved: (f: ItrFiling) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [billNumber, setBillNumber] = useState(filing.billNumber || '');
  const [billDate, setBillDate] = useState(filing.billDate || today());
  const [ackNo, setAckNo] = useState(filing.acknowledgementNo || '');
  const [remarks, setRemarks] = useState(filing.billingRemarks || '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber.trim()) { showError('A bill number is required'); return; }
    setSaving(true);
    try {
      const r = await itrAPI.markBilled(filing.id, {
        billNumber: billNumber.trim(),
        billDate,
        acknowledgementNo: ackNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        billedById: currentUser?.id,
        billedByName: currentUser?.name,
      });
      if (r.success && r.data) { showSuccess(`${filing.clientName} billed`); onSaved(r.data); }
      else showError(r.error || 'Failed to record the bill');
    } catch { showError('Failed to record the bill. Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className={overlayCls} onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={`${panelCls} max-w-md`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <ReceiptText size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[1.02rem] font-semibold" style={{ color: NAVY }}>Mark as billed</h2>
              <p className="truncate text-xs text-muted-foreground">
                {filing.clientName} · F.Y. {filing.financialYear}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  Bill no. <span className="text-[#c0392b]">*</span>
                </label>
                <input className={inputCls} value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="B26270150" required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Bill date</label>
                <input type="date" className={inputCls} value={billDate} max={today()} onChange={e => setBillDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Acknowledgement no.</label>
              <input className={inputCls} value={ackNo} onChange={e => setAckNo(e.target.value)} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Remarks</label>
              <textarea className={`${inputCls} min-h-[64px] resize-y`} value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>

            {filing.returnedReason && (
              <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[0.74rem] text-[#92400E]">
                <span className="font-semibold">Previously sent back:</span> {filing.returnedReason}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Mark as billed'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SendBackModal({ filing, currentUser, onClose, onSaved }: {
  filing: ItrFiling; currentUser: { id: string; name: string } | null;
  onClose: () => void; onSaved: (f: ItrFiling) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { showError('Say what needs correcting'); return; }
    setSaving(true);
    try {
      const r = await itrAPI.returnForCorrection(filing.id, {
        reason: reason.trim(),
        returnedById: currentUser?.id,
        returnedByName: currentUser?.name,
      });
      if (r.success && r.data) { showSuccess(`${filing.clientName} sent back`); onSaved(r.data); }
      else showError(r.error || 'Failed to send it back');
    } catch { showError('Failed to send it back. Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className={overlayCls} onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={`${panelCls} max-w-md`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-[1.02rem] font-semibold" style={{ color: NAVY }}>Send back for correction</h2>
            <p className="truncate text-xs text-muted-foreground">
              {filing.clientName} · {filing.responsiblePersonName || 'the ITR desk'}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 px-6 py-5">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
              What needs correcting? <span className="text-[#c0392b]">*</span>
            </label>
            <textarea
              className={`${inputCls} min-h-[110px] resize-y`}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="What is wrong, and what needs to change before this can be billed."
              autoFocus
              required
            />
            {/* Required, because a return sent back with no explanation lands in a
                queue nobody can act on. */}
            <p className="mt-2 text-xs text-muted-foreground">
              This goes back to {filing.responsiblePersonName || 'the ITR desk'} with the return, and stays on
              the record after it is corrected.
            </p>
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Sending…' : 'Send back'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
