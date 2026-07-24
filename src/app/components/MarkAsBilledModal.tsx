import React, { useState } from 'react';
import { Button } from './Button';
import { billingAPI } from '../services/api';
import { useToast } from './Toast';
import { DatabaseSetupModal } from './DatabaseSetupModal';
import { X } from 'lucide-react';

interface MarkAsBilledModalProps {
  task: {
    id: string;
    client: string;
    task: string;
    assignedTo: string;
    completionDate: string;
    /** Captured earlier at "Send for Billing"; used to prefill the amount below. */
    taxableAmount?: number | string;
    billingFees?: number | string;
    /** The note the approver (partner) left when releasing the task to Accounts. */
    billingDescription?: string;
  };
  user: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkAsBilledModal({ task, user, onClose, onSuccess }: MarkAsBilledModalProps) {
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  // Prefill with the amount captured at "Send for Billing" so it isn't retyped
  // from memory — re-entry is how the task figure and the invoice figure drift.
  const capturedAmount = task.taxableAmount ?? task.billingFees;
  const [taxableAmount, setTaxableAmount] = useState(
    capturedAmount !== undefined && capturedAmount !== null && Number(capturedAmount) > 0
      ? String(capturedAmount)
      : '',
  );
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatabaseSetupModal, setShowDatabaseSetupModal] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!billNumber.trim()) {
      showError('Bill Number is required');
      return;
    }

    if (!taxableAmount.trim()) {
      showError('Taxable Amount is required');
      return;
    }

    const taxableAmountNum = parseFloat(taxableAmount);
    if (isNaN(taxableAmountNum) || taxableAmountNum < 0) {
      showError('Please enter a valid taxable amount');
      return;
    }

    try {
      setLoading(true);

      const response = await billingAPI.create({
        taskId: task.id,
        billNumber: billNumber.trim(),
        billDate,
        taxableAmount: taxableAmountNum,
        remarks: remarks.trim(),
        billedBy: user.name,
        billedById: user.id,
      });

      if (!response.success) {
        // Show detailed error message
        const errorMsg = response.message || response.error || 'Failed to mark task as billed';
        const errorDetails = response.details || '';
        const errorCode = response.code || '';
        const errorHint = response.hint || '';
        
        let fullErrorMsg = errorMsg;
        
        // Check if it's a constraint violation
        if (errorCode === '23514' || errorMsg.includes('constraint') || errorMsg.includes('status')) {
          fullErrorMsg = '⚠️ Database Error: The task status constraint needs to be updated.\n\n' +
            '📋 Please run the SQL migration in Supabase:\n' +
            '1. Go to Supabase Dashboard → SQL Editor\n' +
            '2. Copy the SQL from supabase/sql/add-completion-approval-status.sql\n' +
            '3. Run the query\n\n' +
            'See docs/database-setup.md for details.';
          setShowDatabaseSetupModal(true);
        } else if (errorDetails) {
          fullErrorMsg = `${errorMsg}\n\nDetails: ${errorDetails}`;
        }
        
        if (errorHint) {
          fullErrorMsg += `\n\nHint: ${errorHint}`;
        }
        
        throw new Error(fullErrorMsg);
      }

      showSuccess('Task marked as billed successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error marking task as billed:', error);
      
      // Show a user-friendly error message with line breaks preserved
      const errorLines = error.message.split('\n');
      errorLines.forEach((line: string, index: number) => {
        if (index === 0) {
          showError(line);
        } else {
          console.error(line);
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const NAVY = '#1b365d';
  const fieldCls =
    'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

  return (
    /**
     * Capped height with a scrolling body and a pinned footer. The modal used to
     * be one unbounded Card, so on a short viewport the form simply ran off the
     * bottom of the screen and the Mark as Billed button became unreachable.
     */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header — stays put while the body scrolls */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E7EDF4] px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
            Mark Task as Billed
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-[#1b365d] disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Body — the only scrolling region */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Task summary. Values fall back to a dash rather than rendering an
                empty row, which reads as a broken layout. */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[#F4F6F9] p-4">
              {[
                ['Client', task.client],
                ['Task', task.task],
                ['Assigned to', task.assignedTo],
                ['Completion date', task.completionDate
                  ? new Date(task.completionDate).toLocaleDateString('en-IN')
                  : '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="truncate text-sm font-medium" style={{ color: NAVY }} title={String(value || '—')}>
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>

            {/* The partner's note from the approval step. Accounts bills against
                this, so it has to be visible here — it was being saved but never
                surfaced to the person cutting the invoice. */}
            {task.billingDescription?.trim() && (
              <div className="rounded-xl border border-[#E7EDF4] bg-[#FAFBFD] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Note from approver
                </p>
                <p className="mt-1 whitespace-pre-line text-sm font-medium" style={{ color: NAVY }}>
                  {task.billingDescription}
                </p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Bill / invoice number <span className="text-[#c0392b]">*</span>
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. INV-2026-014"
                required
                disabled={loading}
                className={fieldCls}
              />
            </div>

            {/* Side by side: two short fields do not each deserve a full row. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  Bill date
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  disabled={loading}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  Taxable amount <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={taxableAmount}
                  onChange={(e) => setTaxableAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  disabled={loading}
                  className={fieldCls}
                />
              </div>
            </div>
            {capturedAmount && Number(capturedAmount) > 0 && (
              <p className="-mt-1 text-xs text-muted-foreground">
                Amount prefilled from approval — edit it if the invoice differs.
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                Remarks <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any notes for this invoice…"
                disabled={loading}
                rows={2}
                className={`${fieldCls} resize-none`}
              />
            </div>

            <p className="rounded-lg bg-[#FEF4E6] px-3 py-2.5 text-xs leading-relaxed text-[#8a5a00]">
              The task moves to <strong>Billed</strong> and a billing record is created. Logged for audit.
            </p>
          </div>

          {/* Footer — always reachable, never scrolls away */}
          <div className="flex shrink-0 items-center gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !billNumber.trim() || !taxableAmount.trim()}
              className="flex-1"
            >
              {loading ? 'Processing…' : 'Mark as Billed'}
            </Button>
          </div>
        </form>
      </div>
      {showDatabaseSetupModal && (
        <DatabaseSetupModal
          onClose={() => setShowDatabaseSetupModal(false)}
        />
      )}
    </div>
  );
}