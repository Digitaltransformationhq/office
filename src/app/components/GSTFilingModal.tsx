import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { useToast } from './Toast';
import { X, Check, ChevronDown, AlertTriangle, CalendarCheck } from 'lucide-react';
import { gstAPI, type GstFiling, type GstFilingStatus, type GstRegistration } from '../services/api';
import { NAVY, inputCls, overlayCls, panelCls } from './clientModalUI';
import {
  STATUS_META, STATUS_GROUPS, ANNUAL_RETURNS, annualDueDate, dueDateFor, dueNote,
  formatDate, today, type AnnualReturnType, type GstPeriod,
} from '../utils/gst';

interface GSTFilingModalProps {
  registration: GstRegistration;
  period: GstPeriod;
  /** Monthly (GSTR-1 / 3B) or annual (GSTR-9 / 9C / 4) — the dialog serves both. */
  returnType: 'GSTR-1' | 'GSTR-3B' | AnnualReturnType;
  financialYear: string;
  /** The existing row, or null when nobody has touched this period yet. */
  filing: GstFiling | null;
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: (filing: GstFiling) => void;
}

/**
 * One cell of the register, opened for editing.
 *
 * Laid out around what the job actually is. Nearly every visit here is to move a
 * return one step forward — most often to mark it filed — so the status choice
 * and the filing date are the whole screen, and the fields used a few times a
 * year (ARN, remarks, the data-received date) are folded away until asked for.
 * Whether the return is late is the other thing worth knowing, so it is stated
 * at the top rather than left at the bottom as a date to work out.
 */
export function GSTFilingModal({
  registration, period, returnType, financialYear, filing, currentUser, onClose, onSaved,
}: GSTFilingModalProps) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<GstFilingStatus>(filing?.status || 'Pending');
  const [filedOn, setFiledOn] = useState(filing?.filedOn || '');
  const [dataReceivedOn, setDataReceivedOn] = useState(filing?.dataReceivedOn || '');
  const [arn, setArn] = useState(filing?.arn || '');
  const [remarks, setRemarks] = useState(filing?.remarks || '');

  // Open already if there is something in there to see — folding away a filled
  // field hides information rather than saving space.
  const [showMore, setShowMore] = useState(
    Boolean(filing?.dataReceivedOn || filing?.arn || filing?.remarks),
  );

  // Falls back to the statutory date for a period nobody has touched yet, which
  // is most of them — the row is only created on first save.
  //
  // The two families compute it differently: a monthly return is due days after
  // its month, an annual one months after its year, and only the monthly rule
  // depends on the registration's frequency.
  const isAnnual = ANNUAL_RETURNS.some(r => r.type === returnType);
  const dueDate = filing?.dueDate ?? (isAnnual
    ? annualDueDate(returnType as AnnualReturnType, financialYear)
    : dueDateFor(registration.filingFrequency, period, returnType as 'GSTR-1' | 'GSTR-3B'));
  const note = dueNote(dueDate);
  const done = !STATUS_META[status].open;
  const todayIso = today();

  // Escape closes, as it does in every other dialog people use.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const handleStatus = (next: GstFilingStatus) => {
    setStatus(next);
    // Filing is nearly always recorded on the day it happened, so the date fills
    // itself in and stays editable for the times it was not.
    if (next === 'Filed' && !filedOn) setFiledOn(todayIso);
    if (next === 'Data Received' && !dataReceivedOn) setDataReceivedOn(todayIso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // The database rejects 'Filed' without a date. Catching it here means a
    // clear message instead of a constraint violation surfacing as a 500.
    if (status === 'Filed' && !filedOn) {
      showError('A filing date is required to mark this as filed');
      return;
    }

    setSaving(true);
    try {
      const response = await gstAPI.saveFiling({
        registrationId: registration.id,
        returnType,
        financialYear,
        periodKey: period.key,
        periodLabel: period.label,
        periodStart: period.start,
        periodEnd: period.end,
        dueDate,
        status,
        filedOn: status === 'Filed' ? filedOn : null,
        dataReceivedOn: dataReceivedOn || null,
        arn: arn || null,
        remarks: remarks || null,
        updatedById: currentUser?.id,
        updatedByName: currentUser?.name,
      });

      if (response.success && response.data) {
        showSuccess(`${returnType} · ${period.label} — ${STATUS_META[status].label.toLowerCase()}`);
        onSaved(response.data);
        onClose();
      } else {
        showError(response.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving GST filing:', error);
      showError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={overlayCls} onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={`${panelCls} max-w-lg`}>
        {/* Header: what this is, and whether it is late */}
        <div className="border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[1.1rem] font-semibold" style={{ color: NAVY }}>{returnType}</h2>
                <span className="rounded-md bg-[#F4F6F9] px-2 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
                  {period.label}
                </span>
              </div>
              <p className="mt-1.5 truncate text-[0.88rem] font-medium text-foreground/85" title={registration.clientName}>
                {registration.clientName}
              </p>
              <p className="mt-0.5 truncate identifier text-[0.76rem] text-muted-foreground">
                {registration.gstin} · {registration.filingFrequency}
              </p>
            </div>
            <button onClick={onClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/*
           * The deadline, up here rather than in a detail list at the bottom.
           * "20 Aug 26" alone makes the reader do the arithmetic; how many days
           * are left is the actual question. Once it is filed the deadline stops
           * mattering and the filing date takes its place.
           */}
          {done && filing?.filedOn ? (
            <Banner tone="good" icon={CalendarCheck}>
              Filed on {formatDate(filing.filedOn)}
            </Banner>
          ) : note ? (
            <Banner tone={note.late ? 'bad' : note.soon ? 'warn' : 'plain'} icon={note.late ? AlertTriangle : undefined}>
              Due {formatDate(dueDate)} · <strong className="font-semibold">{note.text}</strong>
            </Banner>
          ) : (
            <Banner tone="plain">
              No fixed due date — {registration.filingFrequency.toLowerCase()} filer
            </Banner>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {/* Status */}
            <div className="space-y-3.5">
              {STATUS_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.statuses.map(s => (
                      <StatusOption
                        key={s}
                        status={s}
                        selected={status === s}
                        onSelect={() => handleStatus(s)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* The filing date, right where the decision was just made */}
            {status === 'Filed' && (
              <div className="mt-5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                <label className="mb-1.5 block text-sm font-medium text-[#166534]">Filed on</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="date"
                    className={`${inputCls} flex-1 border-[#BBF7D0] bg-white`}
                    value={filedOn}
                    onChange={e => setFiledOn(e.target.value)}
                    max={todayIso}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFiledOn(todayIso)}
                    className="shrink-0 rounded-lg border border-[#BBF7D0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#166534] transition-colors hover:bg-[#DCFCE7] sm:py-0"
                  >
                    Today
                  </button>
                </div>
              </div>
            )}

            {/* Everything used a few times a year */}
            <button
              type="button"
              onClick={() => setShowMore(v => !v)}
              className="mt-5 flex w-full items-center justify-between rounded-lg border border-[#E7EDF4] px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[#F9FAFB]"
              style={{ color: NAVY }}
            >
              <span>Data received date, ARN, remarks</span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>

            {showMore && (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Data received on</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input type="date" className={`${inputCls} flex-1`} value={dataReceivedOn} max={todayIso} onChange={e => setDataReceivedOn(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setDataReceivedOn(todayIso)}
                      className="shrink-0 rounded-lg border border-[#E7EDF4] px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[#F4F6F9] sm:py-0"
                      style={{ color: NAVY }}
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>ARN</label>
                  <input className={inputCls} value={arn} onChange={e => setArn(e.target.value)} placeholder="Acknowledgement number" />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Remarks</label>
                  <textarea className={`${inputCls} min-h-[64px] resize-y`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Anything worth recording against this period" />
                </div>
              </div>
            )}

            {filing?.updatedByName && (
              <p className="mt-4 text-[0.7rem] text-muted-foreground">
                Last updated by {filing.updatedByName}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * One status to choose from.
 *
 * Unselected options are plain, carrying only a coloured dot to say which status
 * they are; the selected one takes the full colour and a tick. Every option used
 * to be fully coloured, which left nine competing chips and no way to see at a
 * glance which one was actually set.
 */
function StatusOption({ status, selected, onSelect }: {
  status: GstFilingStatus; selected: boolean; onSelect: () => void;
}) {
  const meta = STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all sm:min-h-0 sm:py-1.5 ${
        selected
          ? `${meta.className} ring-2 ring-[#1b365d] ring-offset-1`
          : 'border-[#E7EDF4] bg-white text-foreground/70 hover:border-[#C7D3E2] hover:bg-[#F9FAFB]'
      }`}
    >
      {selected
        ? <Check size={13} strokeWidth={3} />
        : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />}
      {meta.label}
    </button>
  );
}

function Banner({ tone, icon: Icon, children }: {
  tone: 'good' | 'warn' | 'bad' | 'plain'; icon?: React.ElementType; children: React.ReactNode;
}) {
  const styles = {
    good: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
    warn: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
    bad: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]',
    plain: 'border-[#E7EDF4] bg-[#F9FAFB] text-muted-foreground',
  }[tone];
  return (
    <div className={`mt-3.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.78rem] ${styles}`}>
      {Icon && <Icon size={14} className="shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
