import type { GstFilingStatus } from '../services/api';

/**
 * Financial-year and status helpers for the GST compliance register.
 *
 * The period arithmetic is duplicated in scripts/import-gst-report.py, which has
 * to run standalone against a workbook with no app around it. If the shape of a
 * period key changes, both must change together — the key is what makes the
 * import and the UI address the same cell rather than create two.
 */

const MONTH_NAMES = [
  'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
  'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH',
];

const MONTH_SHORT = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

/** Statutory monthly due dates: GSTR-1 on the 11th, GSTR-3B on the 20th. */
const DUE_DAY: Record<string, number> = { 'GSTR-1': 11, 'GSTR-3B': 20 };

export interface GstPeriod {
  /** Sortable and stable — '2026-04'. The key the database rows are addressed by. */
  key: string;
  /** What a person reads — "APRIL'26", matching the spreadsheet's header. */
  label: string;
  /** For the column head, where twelve full month names will not fit. */
  shortLabel: string;
  start: string;
  end: string;
  /** Due dates are only meaningful for monthly filers; see dueDateFor. */
  gstr1Due: string;
  gstr3bDue: string;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Today, as the local calendar date.
 *
 * Not `toISOString().slice(0, 10)`, which is UTC: in IST that reads as yesterday
 * every day until half past five in the morning. Due dates and period ends are
 * calendar dates in India, so the comparison has to be one too — otherwise a
 * return goes overdue, or stops being overdue, depending on the hour.
 */
export function today(): string {
  return iso(new Date());
}

/** '2026-27' -> 2026. */
export function fyStartYear(fy: string): number {
  const m = /^(\d{4})-(\d{2,4})$/.exec(fy);
  return m ? Number(m[1]) : new Date().getFullYear();
}

/**
 * The financial year containing a date. April to March, so January 2027 belongs
 * to 2026-27 — the off-by-one that makes every quarter-end report wrong if it is
 * got wrong.
 */
export function financialYearOf(date = new Date()): string {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

/** The twelve months of a financial year, April first. */
export function fyMonths(fy: string): GstPeriod[] {
  const y1 = fyStartYear(fy);
  return MONTH_NAMES.map((name, index) => {
    const month = index < 9 ? 4 + index : index - 8;
    const year = index < 9 ? y1 : y1 + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const nextMonth = new Date(year, month, 1);
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${name}'${String(year).slice(2)}`,
      shortLabel: `${MONTH_SHORT[index]} ${String(year).slice(2)}`,
      start: iso(start),
      end: iso(end),
      gstr1Due: iso(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), DUE_DAY['GSTR-1'])),
      gstr3bDue: iso(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), DUE_DAY['GSTR-3B'])),
    };
  });
}

/**
 * The due date for a return, or null when there is no honest answer.
 *
 * Only monthly filers get one. QRMP and composition registrations run on their
 * own calendars, and showing a monthly deadline against one would put a wrong
 * date in front of the person doing the work — worse than showing none.
 */
export function dueDateFor(
  frequency: string,
  period: GstPeriod,
  returnType: 'GSTR-1' | 'GSTR-3B',
): string | null {
  if (frequency !== 'Monthly') return null;
  return returnType === 'GSTR-1' ? period.gstr1Due : period.gstr3bDue;
}

/**
 * The annual returns, and when each falls due.
 *
 * An annual return belongs to the year it reports on, not the year it is worked
 * in — GSTR-9 for 2025-26 is filed by 31 December 2026, most of the way through
 * 2026-27. Filing it under 2026-27 would put a deadline a year early on a year
 * that has not ended.
 *
 * dueMonth/dueDay are months after the year end, so 9 = the following December
 * and 3 = the following June.
 */
export const ANNUAL_RETURNS = [
  { type: 'GSTR-9' as const, label: 'GSTR-9', note: 'Annual return', dueMonth: 12, dueDay: 31, forComposition: false },
  { type: 'GSTR-9C' as const, label: 'GSTR-9C', note: 'Reconciliation', dueMonth: 12, dueDay: 31, forComposition: false },
  { type: 'GSTR-4' as const, label: 'GSTR-4', note: 'Composition annual', dueMonth: 6, dueDay: 30, forComposition: true },
];

export type AnnualReturnType = typeof ANNUAL_RETURNS[number]['type'];

/** The period a whole financial year forms, addressed the same way months are. */
export function annualPeriod(fy: string): GstPeriod {
  const y1 = fyStartYear(fy);
  const start = new Date(y1, 3, 1);          // 1 April
  const end = new Date(y1 + 1, 2, 31);       // 31 March
  return {
    key: fy,
    label: `FY ${fy}`,
    shortLabel: fy,
    start: iso(start),
    end: iso(end),
    // Not meaningful for an annual return; annualDueDate is the answer instead.
    gstr1Due: '',
    gstr3bDue: '',
  };
}

/** When an annual return for `fy` falls due — the calendar year after it ends. */
export function annualDueDate(type: AnnualReturnType, fy: string): string | null {
  const spec = ANNUAL_RETURNS.find(r => r.type === type);
  if (!spec) return null;
  return iso(new Date(fyStartYear(fy) + 1, spec.dueMonth - 1, spec.dueDay));
}

/** Which annual returns a registration could owe, given its filing frequency. */
export function annualReturnsFor(frequency: string): AnnualReturnType[] {
  if (frequency === 'Not Applicable') return [];
  // A composition dealer files GSTR-4 and never GSTR-9/9C; everyone else the
  // other way round. Showing both sets against every registration would put ten
  // permanently-blank cells in front of the reader.
  return ANNUAL_RETURNS
    .filter(r => r.forComposition === (frequency === 'Composition'))
    .map(r => r.type);
}

/** Which returns a registration owes at all, given its filing frequency. */
export function returnsFor(frequency: string): ('GSTR-1' | 'GSTR-3B')[] {
  // Composition dealers file GSTR-4 and CMP-08, never GSTR-1 or 3B, so their
  // monthly cells are not "outstanding" — there is nothing to outstand.
  if (frequency === 'Composition' || frequency === 'Not Applicable') return [];
  return ['GSTR-1', 'GSTR-3B'];
}

export interface StatusMeta {
  /** Two or three characters — a 24-column grid has no room for more. */
  code: string;
  label: string;
  /** Tailwind classes for the cell chip. */
  className: string;
  /** Solid hex, for a dot beside an unselected option. The chip classes are a
   *  tinted background and cannot be borrowed for something that must read at
   *  8 pixels across. */
  color: string;
  /** Whether this counts as work still to do. */
  open: boolean;
}

/**
 * How a due date reads relative to today — "in 16 days", "8 days overdue".
 *
 * A bare date makes the reader do the arithmetic. The whole question at this
 * point is how much time is left, so the answer is given directly.
 */
export function dueNote(dueDate: string | null | undefined): { text: string; late: boolean; soon: boolean } | null {
  if (!dueDate) return null;
  const day = 86_400_000;
  // Parsed at midnight so the difference is a whole number of calendar days and
  // does not drift with the hour the screen happens to be opened.
  const days = Math.round((Date.parse(`${dueDate}T00:00:00`) - Date.parse(`${today()}T00:00:00`)) / day);
  if (Number.isNaN(days)) return null;
  const plural = (n: number) => (n === 1 ? 'day' : 'days');
  if (days < 0) return { text: `${-days} ${plural(-days)} overdue`, late: true, soon: false };
  if (days === 0) return { text: 'Due today', late: false, soon: true };
  return { text: `in ${days} ${plural(days)}`, late: false, soon: days <= 3 };
}

/**
 * How each status reads in the grid.
 *
 * Colour carries meaning here, so it follows the work rather than a palette:
 * green is done, red is blocked on the client, amber and blue are in motion,
 * grey is nothing yet. Every chip also carries its own letters, so the grid is
 * still readable without relying on colour alone.
 */
export const STATUS_META: Record<GstFilingStatus, StatusMeta> = {
  'Pending': {
    code: '–', label: 'Pending', open: true,
    color: '#94A3B8',
    className: 'bg-[#F4F6F9] text-slate-400 border-[#E7EDF4]',
  },
  'Message Sent': {
    code: 'MSG', label: 'Message sent', open: true,
    color: '#D97706',
    className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  'Data Not Provided': {
    code: 'NDP', label: 'Data not provided', open: true,
    color: '#DC2626',
    className: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  },
  'Data Received': {
    code: 'DR', label: 'Data received', open: true,
    color: '#2563EB',
    className: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
  },
  'OTP Awaited': {
    code: 'OTP', label: 'OTP awaited', open: true,
    color: '#7C3AED',
    className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
  },
  'Challan Sent': {
    code: 'CHL', label: 'Challan sent', open: true,
    color: '#EA580C',
    className: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
  },
  'Nil': {
    code: 'NIL', label: 'Nil return', open: false,
    color: '#64748B',
    className: 'bg-[#E2E8F0] text-[#475569] border-[#CBD5E1]',
  },
  'Filed': {
    code: '✓', label: 'Filed', open: false,
    color: '#16A34A',
    className: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  },
  'Not Applicable': {
    code: 'NA', label: 'Not applicable', open: false,
    color: '#CBD5E1',
    className: 'bg-white text-slate-300 border-[#F1F4F8]',
  },
};

/**
 * The statuses grouped as the work divides, for anywhere they are offered as a
 * choice. Nine flat options is a list to read; three groups of two or five is a
 * decision to make.
 */
const GROUPED: { label: string; statuses: GstFilingStatus[] }[] = [
  { label: 'Completed', statuses: ['Filed', 'Nil'] },
  { label: 'In progress', statuses: ['Data Received', 'Challan Sent', 'OTP Awaited', 'Message Sent', 'Data Not Provided'] },
  { label: 'Nothing yet', statuses: ['Pending', 'Not Applicable'] },
];

/**
 * The groups, plus anything not in one.
 *
 * A status added to GST_FILING_STATUSES and forgotten here would otherwise
 * become impossible to select — the database would accept it, the grid would
 * draw it, and no one could set it. The catch-all makes that a cosmetic problem
 * instead of a silent hole.
 */
export const STATUS_GROUPS: { label: string; statuses: GstFilingStatus[] }[] = (() => {
  const placed = new Set(GROUPED.flatMap(g => g.statuses));
  const rest = (Object.keys(STATUS_META) as GstFilingStatus[]).filter(s => !placed.has(s));
  return rest.length ? [...GROUPED, { label: 'Other', statuses: rest }] : GROUPED;
})();

/** The state of a cell with no row yet — nobody has touched that period. */
export const EMPTY_STATUS: GstFilingStatus = 'Pending';

/**
 * Whether a return is late: still open, past its due date, and the due date is
 * one we actually know. A missing due date means the frequency is not monthly,
 * not that the return is on time.
 */
export function isOverdue(status: GstFilingStatus, dueDate: string | null | undefined): boolean {
  if (!dueDate || !STATUS_META[status]?.open) return false;
  return dueDate < today();
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

/**
 * A filing date short enough to sit inside a grid cell — "9/5" for 9 May.
 *
 * The year is dropped and the month kept. Which month a return belongs to is
 * already the column it is in; what the cell has to answer is when it was
 * actually filed, and against a due date of the 11th or the 20th the day alone
 * would be ambiguous the moment a return is filed late, in a later month.
 *
 * This is what the spreadsheet's cells held, and reading a date straight off the
 * grid is the whole reason the spreadsheet was quick to scan.
 */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return '';
  return `${Number(m[3])}/${Number(m[2])}`;
}
