import React, { useState } from 'react';
import { formatINR, formatINRCompact, type RevenueSlice } from '../utils/revenue';

/**
 * Revenue breakdown — a ranked list, not a chart.
 *
 * Every person and every category is listed, so the row count is open-ended
 * (11 task categories, and the team grows). A list stays legible at any length
 * where a bar chart starts fighting for vertical space, and it carries the
 * exact figures instead of making them hover-only.
 */
const NAVY = '#1b365d';
const ACCENT = '#2a78d6';
const TRACK = '#EEF3FA';

export type BreakdownDimension = 'person' | 'category';

interface BreakdownProps {
  person: RevenueSlice[];
  category: RevenueSlice[];
  /** Shown top-right, e.g. the active period. */
  caption?: string;
  emptyMessage?: string;
}

export function RevenueBreakdownCard({
  person,
  category,
  caption,
  emptyMessage = 'No revenue billed in this period.',
}: BreakdownProps) {
  const [dimension, setDimension] = useState<BreakdownDimension>('person');
  const data = dimension === 'person' ? person : category;

  const options: { id: BreakdownDimension; label: string }[] = [
    { id: 'person', label: 'By person' },
    { id: 'category', label: 'By category' },
  ];

  const total = data.reduce((sum, s) => sum + s.revenue, 0);
  // Bar length is relative to the leader so the ranking stays readable even when
  // no single row holds a large share; the figures beside it carry the truth.
  const max = data.reduce((m, s) => Math.max(m, s.revenue), 0);

  return (
    <section className="rounded-xl border border-[#E7EDF4] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
          Revenue {dimension === 'person' ? 'by person' : 'by category'}
        </h3>
        <div className="flex items-center gap-3">
          {caption && <span className="hidden text-xs text-muted-foreground sm:inline">{caption}</span>}
          <div
            role="tablist"
            aria-label="Revenue breakdown dimension"
            className="inline-flex rounded-full border border-[#E7EDF4] bg-[#F4F6F9] p-0.5"
          >
            {options.map(opt => {
              const active = dimension === opt.id;
              return (
                <button
                  key={opt.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDimension(opt.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'bg-[#1b365d] text-white' : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <ol className="mt-4">
            {data.map((slice, i) => {
              const share = total > 0 ? (slice.revenue / total) * 100 : 0;
              const width = max > 0 ? (slice.revenue / max) * 100 : 0;
              return (
                <li
                  key={slice.key}
                  className="group border-t border-[#F0F4F8] py-2.5 first:border-t-0 first:pt-1"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: NAVY }}>
                      {slice.label}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: NAVY }}>
                      {formatINR(slice.revenue)}
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 pl-8">
                    <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${width}%`, backgroundColor: ACCENT }}
                      />
                    </div>
                    <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-foreground">
                      {slice.count} bill{slice.count === 1 ? '' : 's'}
                      {dimension === 'person' && ` · ${slice.hours.toFixed(1)} hrs`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex items-baseline justify-between border-t border-[#E7EDF4] pt-3">
            <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Total · {data.length} {dimension === 'person' ? 'people' : 'categories'}
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: NAVY }}>
              {formatINRCompact(total)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
