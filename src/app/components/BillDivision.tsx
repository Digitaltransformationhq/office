import React, { useEffect, useMemo, useState } from 'react';
import { Users, Equal, AlertCircle } from 'lucide-react';
import { usersAPI, type BillShare } from '../services/api';
import { isApproverRole, roleLabel } from '../utils/roles';

const NAVY = '#1b365d';

/** A holder is anyone at partner level. Admins are included: the firm's own
 *  account can hold a share, and excluding it would be a guess. */
interface Holder { id: string; name: string; role: string }

interface BillDivisionProps {
  /** The bill being divided, in rupees. Drives the amount beside each share. */
  amount: number;
  /** Whose bill it is, if the task names an approver — the sensible default. */
  defaultHolderId?: string | null;
  /** Percentages by user id. Owned by the parent so it can refuse to save. */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const rupees = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The total, rounded the way the server rounds it before comparing to 100. */
export const divisionTotal = (value: Record<string, string>) =>
  Math.round(
    Object.values(value).reduce((sum, v) => sum + (parseFloat(v) || 0), 0) * 100,
  ) / 100;

/**
 * How one bill is divided between the partners and directors.
 *
 * Entered per bill rather than held as a standing firm-wide ratio, because
 * different partners bring in different clients and the division follows the
 * work. It also means the split a bill was raised under stays with it: there is
 * no ratio to revise later and nothing that can be overwritten after the fact.
 *
 * The default is the whole bill to whoever approved the task. That is right far
 * more often than an equal split would be — most work belongs to one partner —
 * and it is one glance to confirm rather than a form to fill. An equal split is
 * one button away for the bills that are genuinely shared.
 */
export function BillDivision({ amount, defaultHolderId, value, onChange }: BillDivisionProps) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await usersAPI.getAll();
        if (!live) return;
        const list = (r.data || [])
          .filter((u: any) => isApproverRole(u.role) && u.status !== 'Inactive')
          .map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
        setHolders(list);

        // Seed only an untouched form. Coming back to a part-filled division and
        // finding it reset to the default would be worse than no default at all.
        if (Object.keys(value).length === 0) {
          const owner = list.find((h: Holder) => h.id === defaultHolderId);
          if (owner) onChange({ [owner.id]: '100' });
          else if (list.length === 1) onChange({ [list[0].id]: '100' });
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [defaultHolderId]);

  const total = useMemo(() => divisionTotal(value), [value]);
  const balanced = total === 100;

  const set = (id: string, raw: string) => {
    const next = { ...value };
    if (!raw.trim()) delete next[id];
    else next[id] = raw;
    onChange(next);
  };

  /**
   * Split evenly, with the remainder given to the first holder.
   *
   * Three ways is 33.33 each and a paisa left over. Handing it to somebody
   * rather than dropping it is what makes the column total exactly 100 — and a
   * division that reads 99.99 is one every reader stops to check.
   */
  const splitEqually = () => {
    if (holders.length === 0) return;
    const each = Math.floor((100 / holders.length) * 100) / 100;
    const next: Record<string, string> = {};
    holders.forEach(h => { next[h.id] = each.toFixed(2); });
    const drift = Math.round((100 - each * holders.length) * 100) / 100;
    if (drift !== 0) next[holders[0].id] = (each + drift).toFixed(2);
    onChange(next);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E7EDF4] px-4 py-6 text-center text-sm text-muted-foreground">
        Loading partners…
      </div>
    );
  }

  if (holders.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.78rem] text-amber-800">
        No partners or directors on the staff list, so this bill cannot be divided.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
      <div className="flex items-center justify-between gap-3 border-b border-[#E7EDF4] bg-[#FAFBFD] px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[0.8rem] font-semibold" style={{ color: NAVY }}>
          <Users size={14} /> Division of this bill
        </span>
        <button
          type="button"
          onClick={splitEqually}
          className="inline-flex items-center gap-1 rounded-md border border-[#E7EDF4] bg-white px-2 py-1 text-[0.7rem] font-medium text-foreground/75 transition-colors hover:border-[#C7D7EC] hover:bg-[#F7FAFF]"
        >
          <Equal size={11} /> Split equally
        </button>
      </div>

      <ul className="divide-y divide-[#F5F7FA]">
        {holders.map(h => {
          const pct = parseFloat(value[h.id] || '') || 0;
          return (
            <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }}>{h.name}</p>
                <p className="text-[0.68rem] text-muted-foreground">{roleLabel(h.role)}</p>
              </div>

              {/* The rupees, worked out as they type. A percentage is not what
                  anyone is actually agreeing to. */}
              <span className="w-28 shrink-0 text-right text-[0.75rem] tabular-nums text-muted-foreground">
                {pct > 0 ? rupees(Math.round(amount * pct) / 100) : '—'}
              </span>

              <div className="relative w-24 shrink-0">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={value[h.id] ?? ''}
                  onChange={e => set(h.id, e.target.value)}
                  placeholder="0"
                  aria-label={`${h.name}'s percentage`}
                  className="w-full rounded-lg border border-[#E7EDF4] bg-white py-1.5 pl-2.5 pr-6 text-right text-[0.8rem] tabular-nums outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.7rem] text-muted-foreground">%</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={`flex items-center justify-between gap-3 border-t px-4 py-2.5 ${
        balanced ? 'border-[#E7EDF4] bg-[#F5FBF2]' : 'border-amber-200 bg-amber-50'
      }`}>
        <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium">
          {balanced ? (
            <span style={{ color: '#2f6b1c' }}>Divided in full</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-800">
              <AlertCircle size={12} />
              {total > 100 ? `${(total - 100).toFixed(2)}% over` : `${(100 - total).toFixed(2)}% still to allot`}
            </span>
          )}
        </span>
        <span className={`text-[0.8rem] font-semibold tabular-nums ${balanced ? '' : 'text-amber-800'}`}
              style={balanced ? { color: '#2f6b1c' } : undefined}>
          {total.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
