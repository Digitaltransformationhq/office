/**
 * Leave types and statuses, in one place.
 *
 * The codes 'CL' / 'SL' / 'EL' are what the database stores and what the API
 * sends; the long names are display only. Three components were each carrying
 * their own copy of that mapping, which is exactly how the task status colours
 * ended up disagreeing across six screens.
 */

export const LEAVE_TYPES = [
  { code: 'CL', label: 'Casual', full: 'Casual Leave', balanceKey: 'casualLeave' },
  { code: 'SL', label: 'Sick', full: 'Sick Leave', balanceKey: 'sickLeave' },
  { code: 'EL', label: 'Earned', full: 'Earned Leave', balanceKey: 'earnedLeave' },
] as const;

export type LeaveCode = typeof LEAVE_TYPES[number]['code'];

const BY_CODE = Object.fromEntries(LEAVE_TYPES.map(t => [t.code, t]));

/** "Casual" — for chips and dense table cells. */
export const leaveLabel = (code?: string) => BY_CODE[code || '']?.label || code || '—';

/** "Casual Leave" — for form labels and prose. */
export const leaveFullLabel = (code?: string) => BY_CODE[code || '']?.full || code || '—';

/** Outlined chips, matching every other tag in the app. */
export const LEAVE_CHIP: Record<string, string> = {
  CL: 'border border-blue-200 bg-blue-50 text-blue-700',
  SL: 'border border-amber-300 bg-amber-100 text-amber-700',
  EL: 'border border-purple-300 bg-purple-100 text-purple-700',
};

export const leaveChip = (code?: string) =>
  LEAVE_CHIP[code || ''] || 'border border-slate-300 bg-slate-100 text-slate-600';

/** Application status, sharing the palette used for task statuses. */
export const LEAVE_STATUS_CHIP: Record<string, string> = {
  Pending: 'border border-amber-300 bg-amber-100 text-amber-700',
  Approved: 'border border-green-300 bg-green-100 text-green-700',
  Rejected: 'border border-red-300 bg-red-100 text-red-700',
};

export const leaveStatusChip = (status?: string) =>
  LEAVE_STATUS_CHIP[status || ''] || 'border border-slate-300 bg-slate-100 text-slate-600';

/**
 * Whole days between two dates, inclusive. A half day is always half of one
 * day, whatever the range — the form only offers it for a single date.
 */
export function leaveDays(fromDate: string, toDate: string, isHalfDay: boolean) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  if (to < from) return 0;
  if (isHalfDay) return 0.5;
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}
