/**
 * Revenue aggregation over billing records.
 *
 * Billing records live in the KV store (no SQL aggregation available), so every
 * roll-up here runs client-side over the full `billingAPI.getAll()` result.
 * Shape mirrors the record written by the server on "mark as billed"
 * (supabase/functions/server/index.tsx).
 */

export interface BillingRecord {
  id: string;
  taskId: string;
  clientName: string;
  taskName: string;
  category: string;
  assignedTo: string;
  assignedToId: string;
  completionDate: string;
  billNumber: string;
  billDate: string;
  taxableAmount: number;
  remarks: string;
  billedBy: string;
  billedById: string;
  billedAt: string;
  budgetedFee: number;
  hoursLogged: number;
  /** Absent on records written before payment tracking existed — see `isPaid`. */
  paymentStatus?: 'Pending' | 'Paid';
  paymentDate?: string | null;
  paidAmount?: number;
  paidBy?: string | null;
  paidById?: string | null;
}

/**
 * The billing lifecycle has three stages:
 *
 *   Pending for Billing → Pending payment → Revenue
 *   (task, no invoice)    (invoiced)        (payment received)
 *
 * Revenue is recognised on payment, not on invoicing, so an unpaid invoice is
 * never counted. Records created before payment tracking existed carry no
 * `paymentStatus`; those are treated as paid so historical revenue is preserved
 * rather than retroactively moved into the pending-payment queue.
 */
export const isPaid = (r: BillingRecord) =>
  r.paymentStatus === undefined || r.paymentStatus === null || r.paymentStatus === 'Paid';

export const isAwaitingPayment = (r: BillingRecord) => !isPaid(r);

export const paidRecords = (records: BillingRecord[]) => (records || []).filter(isPaid);

export const awaitingPaymentRecords = (records: BillingRecord[]) =>
  (records || []).filter(isAwaitingPayment);

export interface RevenueSlice {
  key: string;
  label: string;
  revenue: number;
  budgeted: number;
  count: number;
  hours: number;
}

export type RangeId = 'fy' | '12m' | '6m' | 'month' | 'all';

export const RANGE_OPTIONS: { id: RangeId; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: '6m', label: 'Last 6 months' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'fy', label: 'This FY' },
  { id: 'all', label: 'All time' },
];

/* ── formatting ─────────────────────────────────────────────────────────── */

export function formatINR(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

/** Compact Indian notation — ₹12.4L, ₹1.35Cr — for tiles and axis ticks. */
export function formatINRCompact(amount: number): string {
  const n = amount || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/* ── dates ──────────────────────────────────────────────────────────────── */

/**
 * The date a record counts against.
 *
 * Payment date wins, because revenue is recognised when the money arrives — a
 * March invoice paid in April is April's revenue. Legacy records have no payment
 * date, so they fall back to the bill date they have always been bucketed on.
 */
export function recordDate(r: BillingRecord): Date | null {
  const raw = r.paymentDate || r.billDate || r.billedAt || r.completionDate;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** The date an unpaid invoice was raised — used to age the payment backlog. */
export function invoiceDate(r: BillingRecord): Date | null {
  const raw = r.billDate || r.billedAt || r.completionDate;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTH_LABELS[Number(m) - 1]} ${y.slice(2)}`;
};

/** Indian financial year runs 1 Apr → 31 Mar. */
export function financialYearStart(now = new Date()): Date {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1);
}

export function financialYearLabel(now = new Date()): string {
  const start = financialYearStart(now).getFullYear();
  return `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Inclusive lower bound for a range; null means unbounded. */
export function rangeStart(range: RangeId, now = new Date()): Date | null {
  switch (range) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case '6m':
      return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    case '12m':
      return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    case 'fy':
      return financialYearStart(now);
    case 'all':
    default:
      return null;
  }
}

export function filterByRange(records: BillingRecord[], range: RangeId, now = new Date()): BillingRecord[] {
  const start = rangeStart(range, now);
  if (!start) return records;
  return records.filter(r => {
    const d = recordDate(r);
    return d ? d >= start : false;
  });
}

/* ── aggregation ────────────────────────────────────────────────────────── */

const revenueOf = (r: BillingRecord) => Number(r.taxableAmount) || 0;
const budgetOf = (r: BillingRecord) => Number(r.budgetedFee) || 0;

function groupBy(
  records: BillingRecord[],
  keyOf: (r: BillingRecord) => string,
  labelOf: (r: BillingRecord) => string,
): RevenueSlice[] {
  const map = new Map<string, RevenueSlice>();
  records.forEach(r => {
    const key = keyOf(r) || 'unknown';
    const slice = map.get(key) || { key, label: labelOf(r) || 'Unassigned', revenue: 0, budgeted: 0, count: 0, hours: 0 };
    slice.revenue += revenueOf(r);
    slice.budgeted += budgetOf(r);
    slice.count += 1;
    slice.hours += Number(r.hoursLogged) || 0;
    map.set(key, slice);
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export const revenueByPerson = (records: BillingRecord[]) =>
  groupBy(records, r => r.assignedToId || r.assignedTo, r => r.assignedTo);

export const revenueByCategory = (records: BillingRecord[]) =>
  groupBy(records, r => r.category, r => r.category || 'Uncategorized');

export const revenueByClient = (records: BillingRecord[]) =>
  groupBy(records, r => r.clientName, r => r.clientName || 'Unknown client');

/**
 * Month buckets in chronological order, with empty months filled in so the
 * trend reads as a continuous timeline rather than a compressed one.
 */
export function revenueByMonth(records: BillingRecord[], now = new Date()): RevenueSlice[] {
  const map = new Map<string, RevenueSlice>();
  let earliest: Date | null = null;

  records.forEach(r => {
    const d = recordDate(r);
    if (!d) return;
    if (!earliest || d < earliest) earliest = d;
    const key = monthKey(d);
    const slice = map.get(key) || { key, label: monthLabel(key), revenue: 0, budgeted: 0, count: 0, hours: 0 };
    slice.revenue += revenueOf(r);
    slice.budgeted += budgetOf(r);
    slice.count += 1;
    slice.hours += Number(r.hoursLogged) || 0;
    map.set(key, slice);
  });

  if (!earliest) return [];

  const out: RevenueSlice[] = [];
  const cursor = new Date((earliest as Date).getFullYear(), (earliest as Date).getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= end) {
    const key = monthKey(cursor);
    out.push(map.get(key) || { key, label: monthLabel(key), revenue: 0, budgeted: 0, count: 0, hours: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

/**
 * Invoices raised but not yet paid — the stage between billing and revenue.
 * A backlog, so it is never period-filtered: an unpaid March invoice is still
 * outstanding in July.
 */
export function pendingPayments(records: BillingRecord[]): { amount: number; count: number } {
  const awaiting = awaitingPaymentRecords(records);
  return {
    amount: awaiting.reduce((sum, r) => sum + (Number(r.taxableAmount) || 0), 0),
    count: awaiting.length,
  };
}

/** Whole days since an invoice was raised, for ageing the payment queue. */
export function invoiceAgeInDays(r: BillingRecord, now = new Date()): number | null {
  const d = invoiceDate(r);
  if (!d) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

/**
 * Work that has been sent for billing but not yet invoiced.
 *
 * These amounts live on the task row (`tasks.taxable_amount` / `tasks.billing_fees`,
 * written by SendForBillingModal) and never reach the `billing:` KV records, which
 * are only created when someone marks the task as billed. They are deliberately
 * NOT counted as revenue — no invoice has been raised — but they must be visible,
 * or the money looks like it vanished between the two steps.
 */
export function pendingBilling(tasks: any[]): { amount: number; count: number } {
  const pending = (tasks || []).filter(t => t.status === 'Pending for Billing');
  const amount = pending.reduce(
    (sum, t) => sum + (Number(t.taxableAmount) || Number(t.billingFees) || 0),
    0,
  );
  return { amount, count: pending.length };
}

/**
 * Add zero-revenue rows for names that never appear in the billing records.
 *
 * Grouping can only produce a row where a record exists, so a staff member who
 * billed nothing this period — or a category nobody has billed against — would
 * silently vanish from the breakdown. Padding keeps the full roster visible, and
 * "billed nothing" is itself worth seeing.
 */
export function padSlices(slices: RevenueSlice[], allLabels: readonly string[]): RevenueSlice[] {
  const present = new Set(slices.map(s => s.label));
  const missing = allLabels
    .filter(label => label && !present.has(label))
    .sort((a, b) => a.localeCompare(b))
    .map(label => ({ key: `empty:${label}`, label, revenue: 0, budgeted: 0, count: 0, hours: 0 }));
  // `slices` is already sorted by revenue desc, so the zeros land at the bottom.
  return [...slices, ...missing];
}

export interface RevenueTotals {
  revenue: number;
  budgeted: number;
  count: number;
  hours: number;
  average: number;
  /** Revenue minus budgeted estimate — positive means billed above budget. */
  variance: number;
}

export function totals(records: BillingRecord[]): RevenueTotals {
  const revenue = records.reduce((s, r) => s + revenueOf(r), 0);
  const budgeted = records.reduce((s, r) => s + budgetOf(r), 0);
  const hours = records.reduce((s, r) => s + (Number(r.hoursLogged) || 0), 0);
  return {
    revenue,
    budgeted,
    count: records.length,
    hours,
    average: records.length ? revenue / records.length : 0,
    variance: revenue - budgeted,
  };
}

/**
 * Percent change of the current calendar month against the previous one.
 *
 * Both buckets are bounded at both ends. `billDate` is free-form operator input
 * that the server stores unvalidated, so a post-dated bill would otherwise land
 * in "this month" forever and inflate the figure.
 */
export function monthOverMonth(records: BillingRecord[], now = new Date()) {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let current = 0;
  let previous = 0;
  records.forEach(r => {
    const d = recordDate(r);
    if (!d) return;
    if (d >= thisStart && d < nextStart) current += revenueOf(r);
    else if (d >= prevStart && d < thisStart) previous += revenueOf(r);
  });

  const change = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return { current, previous, change };
}

