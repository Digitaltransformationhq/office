import type { ItrStatus } from '../services/api';
import { today } from './gst';

/**
 * Status presentation for the ITR register.
 *
 * Colour follows the work, matching the GST register so the two screens read as
 * one system: green is done, red is blocked on the client, blue and amber are in
 * motion, grey is nothing yet.
 */
export interface ItrStatusMeta {
  label: string;
  className: string;
  /** Solid hex, for a dot beside an unselected option. */
  color: string;
  /** Whether this counts as work still to do. */
  open: boolean;
}

export const ITR_STATUS_META: Record<ItrStatus, ItrStatusMeta> = {
  'Pending': {
    label: 'Pending', open: true, color: '#94A3B8',
    className: 'bg-[#F4F6F9] text-slate-500 border-[#E7EDF4]',
  },
  'Data Requested': {
    label: 'Data requested', open: true, color: '#D97706',
    className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  'Data Not Provided': {
    label: 'Data not provided', open: true, color: '#DC2626',
    className: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  },
  'Data Received': {
    label: 'Data received', open: true, color: '#2563EB',
    className: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
  },
  'In Preparation': {
    label: 'In preparation', open: true, color: '#7C3AED',
    className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
  },
  'Ready to File': {
    label: 'Ready to file', open: true, color: '#0891B2',
    className: 'bg-[#CFFAFE] text-[#155E75] border-[#A5F3FC]',
  },
  'Filed': {
    label: 'Filed', open: false, color: '#16A34A',
    className: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  },
  'Not Applicable': {
    label: 'Not applicable', open: false, color: '#CBD5E1',
    className: 'bg-white text-slate-400 border-[#F1F4F8]',
  },
};

/**
 * Grouped for anywhere the status is offered as a choice. Eight flat options is
 * a list to read; four groups is a decision to make.
 */
const GROUPED: { label: string; statuses: ItrStatus[] }[] = [
  { label: 'Completed', statuses: ['Filed'] },
  { label: 'Ready', statuses: ['Ready to File', 'In Preparation'] },
  { label: 'Waiting on the client', statuses: ['Data Received', 'Data Requested', 'Data Not Provided'] },
  { label: 'Nothing yet', statuses: ['Pending', 'Not Applicable'] },
];

/** The groups, plus any status not in one — see the GST equivalent for why. */
export const ITR_STATUS_GROUPS: { label: string; statuses: ItrStatus[] }[] = (() => {
  const placed = new Set(GROUPED.flatMap(g => g.statuses));
  const rest = (Object.keys(ITR_STATUS_META) as ItrStatus[]).filter(s => !placed.has(s));
  return rest.length ? [...GROUPED, { label: 'Other', statuses: rest }] : GROUPED;
})();

/**
 * The due date for a return, in the year after the financial year ends.
 *
 *   audit case                                       31 October
 *   business income, other than speculation or F&O   31 August
 *   everything else                                  31 July
 *
 * Audit wins where both apply — it is the later date and the stricter test.
 *
 * Neither flag can be derived from the ITR form. ITR-3 and ITR-4 are the
 * business income forms, but whether the income is speculation or F&O is not
 * something the form number answers, and a deadline shown a month early is worse
 * than one that has to be set by hand.
 */
export function itrDueDate(
  financialYear: string,
  isAudit: boolean,
  businessIncome = false,
): string | null {
  const m = /^(\d{4})-\d{2}$/.exec(financialYear);
  if (!m) return null;
  const year = Number(m[1]) + 1;
  if (isAudit) return `${year}-10-31`;
  return businessIncome ? `${year}-08-31` : `${year}-07-31`;
}

/** Late: still open, past its due date. */
export function itrIsOverdue(status: ItrStatus, dueDate: string | null | undefined): boolean {
  if (!dueDate || !ITR_STATUS_META[status]?.open) return false;
  return dueDate < today();
}

/** The documents the office collects once a return is filed. */
export const ITR_CHECKLIST = [
  { key: 'itrV' as const, label: 'ITR-V', hint: 'Acknowledgement' },
  { key: 'computation' as const, label: 'Computation', hint: 'IT computation' },
  { key: 'financialStatement' as const, label: 'Financials', hint: 'Balance sheet & P&L' },
  { key: 'challan' as const, label: 'Challan', hint: 'Tax paid' },
];
