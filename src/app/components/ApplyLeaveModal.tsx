import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import { useToast } from './Toast';
import { leaveAPI } from '../services/api';
import { LEAVE_TYPES, leaveChip, leaveDays } from '../utils/leave';
import { X, CalendarPlus } from 'lucide-react';

interface ApplyLeaveModalProps {
  /** Real user id ('user:7') — written to a column with a foreign key. */
  userId: string;
  userName: string;
  /** Passed in when the parent already has it, to save a second fetch. */
  balance?: { casualLeave: number; sickLeave: number; earnedLeave: number };
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const fieldCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';
const labelCls = 'mb-1.5 block text-sm font-medium';

const today = () => new Date().toISOString().split('T')[0];

export function ApplyLeaveModal({
  userId, userName, balance: initialBalance, onClose, onSuccess,
}: ApplyLeaveModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [balance, setBalance] = useState(
    initialBalance || { casualLeave: 10, sickLeave: 7, earnedLeave: 15 });
  const [formData, setFormData] = useState({
    leaveType: 'CL',
    fromDate: '',
    toDate: '',
    isHalfDay: false,
    reason: '',
  });

  useEffect(() => {
    if (!initialBalance) loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const data = await leaveAPI.getBalance(userId);
      if (data.success && data.data) {
        setBalance({
          casualLeave: data.data.casualLeaveBalance ?? 10,
          sickLeave: data.data.sickLeaveBalance ?? 7,
          earnedLeave: data.data.earnedLeaveBalance ?? 15,
        });
      }
    } catch (error) {
      console.error('Error loading leave balance:', error);
    }
  };

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const totalDays = useMemo(
    () => leaveDays(formData.fromDate, formData.toDate, formData.isHalfDay),
    [formData.fromDate, formData.toDate, formData.isHalfDay],
  );

  const selected = LEAVE_TYPES.find(t => t.code === formData.leaveType)!;
  const available = (balance as any)[selected.balanceKey] ?? 0;
  const remaining = available - totalDays;
  const overBalance = totalDays > available;
  const badRange = Boolean(formData.fromDate && formData.toDate && totalDays === 0);

  const canSubmit = Boolean(
    !loading && formData.fromDate && formData.toDate && formData.reason.trim() &&
    totalDays > 0 && !overBalance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromDate || !formData.toDate || !formData.reason.trim()) {
      showError('Fill in the dates and a reason');
      return;
    }
    if (totalDays <= 0) {
      showError('The end date cannot be before the start date');
      return;
    }
    if (overBalance) {
      showError(`Only ${available} day${available === 1 ? '' : 's'} of ${selected.full} left`);
      return;
    }

    setLoading(true);
    try {
      const result = await leaveAPI.apply({
        userId,
        userName,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        isHalfDay: formData.isHalfDay,
        totalDays,
        reason: formData.reason.trim(),
      });

      if (result.success) {
        showSuccess('Leave applied for. It is now awaiting approval.');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to submit leave application');
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      showError('Failed to submit leave application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Capped height with a scrolling body and a pinned footer, matching the
       other modals, so the submit button is always reachable. */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E7EDF4] px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
            >
              <CalendarPlus size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Apply for Leave
              </h2>
              <p className="text-xs text-muted-foreground">Goes to your approver for sign-off</p>
            </div>
          </div>
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
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* Type as cards rather than a dropdown: the balance is what decides
                which one you pick, so it belongs on the choice itself. */}
            <div>
              <label className={labelCls} style={{ color: NAVY }}>
                Leave type <span className="text-[#c0392b]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LEAVE_TYPES.map(t => {
                  const days = (balance as any)[t.balanceKey] ?? 0;
                  const active = formData.leaveType === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => set('leaveType', t.code)}
                      disabled={loading}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        active
                          ? 'border-[#1b365d] bg-[#F4F6F9] ring-2 ring-[#1b365d]/15'
                          : 'border-[#E7EDF4] hover:border-[#d5dfea]'
                      }`}
                    >
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[0.62rem] font-medium ${leaveChip(t.code)}`}>
                        {t.label}
                      </span>
                      <p className="mt-1.5 text-lg font-semibold leading-none tabular-nums" style={{ color: NAVY }}>
                        {days}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground">left</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} style={{ color: NAVY }}>
                  From <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fromDate}
                  min={today()}
                  onChange={(e) => {
                    const v = e.target.value;
                    // Keep the range valid rather than letting it run backwards.
                    setFormData(prev => ({
                      ...prev,
                      fromDate: v,
                      toDate: !prev.toDate || prev.toDate < v ? v : prev.toDate,
                    }));
                  }}
                  required
                  disabled={loading}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: NAVY }}>
                  To <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.toDate}
                  min={formData.fromDate || today()}
                  onChange={(e) => set('toDate', e.target.value)}
                  required
                  disabled={loading || formData.isHalfDay}
                  className={`${fieldCls} disabled:cursor-not-allowed disabled:bg-[#F4F6F9] disabled:text-muted-foreground`}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#E7EDF4] px-3.5 py-2.5">
              <input
                type="checkbox"
                checked={formData.isHalfDay}
                onChange={(e) => {
                  const on = e.target.checked;
                  // A half day is one date by definition, so collapse the range.
                  setFormData(prev => ({
                    ...prev,
                    isHalfDay: on,
                    toDate: on ? prev.fromDate : prev.toDate,
                  }));
                }}
                disabled={loading}
                className="h-4 w-4 rounded border-[#E7EDF4] accent-[#1b365d]"
              />
              <span className="text-sm text-foreground/80">Half day</span>
            </label>

            {/* Live arithmetic, so nobody submits and only then discovers the
                balance will not cover it. */}
            {formData.fromDate && formData.toDate && (
              <div className={`rounded-lg px-3.5 py-2.5 text-sm ${
                overBalance || badRange
                  ? 'border border-[#f3c9c4] bg-[#FDECEC] text-[#c0392b]'
                  : 'border border-[#E7EDF4] bg-[#F9FAFB] text-foreground/80'
              }`}>
                {badRange ? (
                  'The end date is before the start date.'
                ) : overBalance ? (
                  <>Applying for <strong>{totalDays}</strong> day{totalDays === 1 ? '' : 's'} but only <strong>{available}</strong> left.</>
                ) : (
                  <>Applying for <strong>{totalDays}</strong> day{totalDays === 1 ? '' : 's'} · {remaining} would remain.</>
                )}
              </div>
            )}

            <div>
              <label className={labelCls} style={{ color: NAVY }}>
                Reason <span className="text-[#c0392b]">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => set('reason', e.target.value)}
                placeholder="Briefly, why you need the time off"
                rows={3}
                required
                disabled={loading}
                className={`${fieldCls} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="flex-1">
              {loading ? 'Submitting…' : 'Apply'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
