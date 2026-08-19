import React, { useEffect, useMemo, useState } from 'react';
import { IndianRupee, PieChart, Receipt, Search, Lock } from 'lucide-react';
import { KPICard } from './KPICard';
import { useToast } from './Toast';
import { billingAPI, type BillShare } from '../services/api';
import { isApproverRole, roleLabel } from '../utils/roles';
import { financialYearLabel, filterByRange, type BillingRecord } from '../utils/revenue';

const NAVY = '#1b365d';
const thCls = 'px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';

const rupees = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

interface RevenueShareProps {
  user?: { id: string; name: string; email: string; role: string };
}

type Range = 'fy' | 'month' | 'all';

/**
 * Each partner's and director's share of what the firm has billed.
 *
 * "Share of billing", never "credited" or "earned". Nothing here has been
 * received: a bill raised is money invoiced, and this system does not track
 * whether the client has paid it, nor the costs that stand between an invoice
 * and anybody's pocket. A word that implies the money has arrived would be read
 * as a statement about somebody's account, and it is not one.
 *
 * Built from the divisions entered on the bills themselves — this screen adds
 * nothing up that was not decided at the moment each invoice was raised. There
 * is no ratio here to set, and nothing on this page can change what anybody
 * earned; the only place that is decided is the billing dialog.
 *
 * WHAT IT IS NOT
 *
 * Not profit. This is a share of what was BILLED, before salaries, rent, or any
 * other cost the firm carries — and the app tracks none of those. Said plainly
 * on the page rather than left for someone to assume, because "my share of the
 * firm" and "my share of the invoices" are very different numbers and only one
 * of them is on offer.
 *
 * WHO SEES WHAT
 *
 * Decided by the server, not here. An admin is sent every division; a partner or
 * director is sent only their own line and a count of what was withheld. This
 * component renders whatever arrives — so a partner opening the network tab
 * finds nothing more than the page shows them.
 */
export function RevenueShare({ user }: RevenueShareProps) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('fy');
  const [search, setSearch] = useState('');
  const { showError } = useToast();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await billingAPI.getAll();
        if (!live) return;
        if (r.success) setRecords(r.data || []);
        else showError(r.error || 'Could not load the billing records');
      } catch {
        if (live) showError('Could not load the billing records');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const inRange = useMemo(
    () => (range === 'all' ? records : filterByRange(records, range)),
    [records, range],
  );

  /** Every share line in the period, flattened, with its bill alongside. */
  const lines = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: Array<{ bill: any; share: BillShare }> = [];
    for (const bill of inRange as any[]) {
      for (const share of (bill.shares || []) as BillShare[]) {
        if (q && ![bill.clientName, bill.taskName, bill.billNumber, share.name]
          .some((v: any) => (v || '').toLowerCase().includes(q))) continue;
        out.push({ bill, share });
      }
    }
    return out.sort((a, b) =>
      String(b.bill.billDate || '').localeCompare(String(a.bill.billDate || '')));
  }, [inRange, search]);

  /** Per person, for the summary above the lines. */
  const byPerson = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; bills: number }>();
    for (const { share } of lines) {
      const row = map.get(share.userId) || { name: share.name, amount: 0, bills: 0 };
      row.amount += Number(share.amount) || 0;
      row.bills += 1;
      map.set(share.userId, row);
    }
    return [...map.entries()]
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [lines]);

  const shareTotal = byPerson.reduce((s, p) => s + p.amount, 0);
  /*
   * Bills carrying no division at all — raised before this existed, or by
   * somebody who found a way past the form.
   *
   * Admin only, and not because the number is secret: to a partner it is a count
   * of bills that are not theirs, which is precisely what this screen is meant
   * not to tell them. Somebody has to be able to see the gap, and that is the
   * person who can go and close it.
   */
  const undivided = isAdmin
    ? (inRange as any[]).filter(b => (!b.shares || b.shares.length === 0) && !b.sharesWithheld)
    : [];

  if (!user || !isApproverRole(user.role)) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
          <Lock size={22} />
        </span>
        <p className="text-sm font-medium" style={{ color: NAVY }}>Not your screen</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The division of the firm's billing is for partners and directors.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
      </div>
    );
  }

  const rangeLabel = range === 'fy' ? financialYearLabel() : range === 'month' ? 'This month' : 'All time';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>
            Billing Division
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Each partner's and director's share of what the firm has billed, from the division entered on every bill."
              : 'Your share of what the firm has billed, from the division entered on every bill.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([['fy', financialYearLabel()], ['month', 'This month'], ['all', 'All time']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key as Range)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                range === key
                  ? 'bg-[#1b365d] text-white'
                  : 'border border-[#E7EDF4] bg-white text-[#1b365d] hover:bg-[#F4F6F9]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Said once, plainly, at the top. Anyone reading these figures as their
          share of the firm's profit is reading them wrong. */}
      <div className="rounded-xl border border-[#C7E0F5] bg-[#EEF6FD] px-4 py-3">
        <p className="text-[0.78rem] text-[#1b365d]">
          These are shares of what was <strong>billed</strong> — before salaries, rent and every other cost.
          They are not profit, and this system does not track expenses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          title={isAdmin ? 'Divided in total' : 'Your share of billing'}
          value={rupees(shareTotal)}
          icon={<IndianRupee size={22} />}
          variant="success"
        />
        <KPICard title="Bills counted" value={lines.length} icon={<Receipt size={22} />} />
        <KPICard
          title={isAdmin ? 'People sharing' : 'Period'}
          value={isAdmin ? byPerson.length : rangeLabel}
          icon={<PieChart size={22} />}
        />
      </div>

      {undivided.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[0.78rem] text-amber-900">
            <strong>{undivided.length} bill{undivided.length === 1 ? '' : 's'}</strong> in this period
            carr{undivided.length === 1 ? 'ies' : 'y'} no division, so {undivided.length === 1 ? 'it is' : 'they are'}
            {' '}in nobody's share. Bills raised before the division existed will always read this way.
          </p>
        </div>
      )}

      {isAdmin && byPerson.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
          <div className="border-b border-[#E7EDF4] px-5 py-4">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>By person · {rangeLabel}</h2>
          </div>
          <ul className="divide-y divide-[#F1F4F8]">
            {byPerson.map(p => {
              const pct = shareTotal > 0 ? (p.amount / shareTotal) * 100 : 0;
              return (
                <li key={p.userId} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.86rem] font-medium" style={{ color: NAVY }}>{p.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {p.bills} bill{p.bills === 1 ? '' : 's'}
                    </p>
                  </div>
                  {/* The bar is the share of what was divided in this period —
                      not anybody's agreed percentage, which varies per bill. */}
                  <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-[#EEF2F7] sm:block">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#4ea72e' }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[0.72rem] tabular-nums text-muted-foreground">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="w-32 shrink-0 text-right text-[0.86rem] font-semibold tabular-nums" style={{ color: NAVY }}>
                    {rupees(p.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
            Bill by bill · {lines.length} line{lines.length === 1 ? '' : 's'}
          </h2>
          <div className="relative sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client, task, bill no…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
        </div>

        {lines.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">
            {records.length === 0
              ? 'No bills have been raised yet.'
              : search.trim()
                ? 'Nothing matches that search.'
                : isAdmin
                  ? 'No bill in this period carries a division.'
                  : 'No bill in this period carries a share for you.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Bill', 'Date', 'Client', 'Task', ...(isAdmin ? ['Share of'] : []), 'Share', 'Amount']
                    .map((h, i, arr) => (
                      <th key={h} className={`${thCls} ${i >= arr.length - 2 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(({ bill, share }, i) => (
                  <tr key={`${bill.id || bill.billNumber}-${share.userId}-${i}`}
                      className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-3 py-3 font-mono text-xs font-medium" style={{ color: NAVY }}>{bill.billNumber}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{shortDate(bill.billDate)}</td>
                    <td className="px-3 py-3 font-medium" style={{ color: NAVY }}>{bill.clientName}</td>
                    <td className="px-3 py-3 text-foreground/80">{bill.taskName}</td>
                    {isAdmin && <td className="px-3 py-3 text-foreground/80">{share.name}</td>}
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {Number(share.percent).toFixed(2)}%
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold tabular-nums" style={{ color: NAVY }}>
                      {rupees(Number(share.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
