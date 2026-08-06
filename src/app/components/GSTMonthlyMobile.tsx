import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { GstFiling, GstRegistration } from '../services/api';
import { STATUS_META, EMPTY_STATUS, shortDate, type GstPeriod } from '../utils/gst';

const NAVY = '#1b365d';

type ReturnType_ = 'GSTR-1' | 'GSTR-3B';
const RETURN_TYPES: ReturnType_[] = ['GSTR-1', 'GSTR-3B'];

interface GSTMonthlyMobileProps {
  rows: { registration: GstRegistration; owed: ReturnType_[]; open: number }[];
  months: GstPeriod[];
  monthIndex: number;
  onMonthChange: (index: number) => void;
  cellFor: (registrationId: string, returnType: ReturnType_, periodKey: string) => GstFiling | null;
  isObligation: (r: GstRegistration, m: GstPeriod, rt: ReturnType_) => boolean;
  isLate: (r: GstRegistration, m: GstPeriod, rt: ReturnType_, filing: GstFiling | null) => boolean;
  onOpen: (registration: GstRegistration, period: GstPeriod, returnType: ReturnType_, filing: GstFiling | null) => void;
}

/**
 * The monthly register on a phone: one month at a time, as a list.
 *
 * The desktop grid is twelve months by two returns behind a 248px frozen column.
 * On a 360px screen that leaves about a hundred pixels of data, and no amount of
 * horizontal scrolling makes twenty-four columns readable on a phone.
 *
 * So the axis that does not fit is turned into a control. A phone is used to
 * answer "where has this month got to?", not to compare April against November,
 * and one month of two returns fits a narrow screen without compromise.
 */
export function GSTMonthlyMobile({
  rows, months, monthIndex, onMonthChange, cellFor, isObligation, isLate, onOpen,
}: GSTMonthlyMobileProps) {
  const month = months[monthIndex];
  if (!month) return null;

  const outstanding = rows.reduce((n, { registration, owed }) => {
    const openHere = owed.filter(rt =>
      isObligation(registration, month, rt)
      && STATUS_META[cellFor(registration.id, rt, month.key)?.status || EMPTY_STATUS].open).length;
    return n + openHere;
  }, 0);

  return (
    <div>
      {/* Month stepper */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[#E7EDF4] bg-white px-3 py-2.5">
        <button
          onClick={() => onMonthChange(monthIndex - 1)}
          disabled={monthIndex === 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft size={17} />
        </button>

        {/* px-9 both sides, so the label stays optically centred between the
            steppers once the chevron has taken its space on the right. */}
        <div className="relative flex min-w-0 flex-1">
          <select
            value={monthIndex}
            onChange={e => onMonthChange(Number(e.target.value))}
            className="w-full appearance-none rounded-lg border border-[#E7EDF4] bg-white px-9 py-2 text-center text-sm font-semibold outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            style={{ color: NAVY }}
            aria-label="Month"
          >
            {months.map((m, i) => <option key={m.key} value={i}>{m.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <button
          onClick={() => onMonthChange(monthIndex + 1)}
          disabled={monthIndex === months.length - 1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <p className="border-b border-[#F1F4F8] bg-[#FAFBFD] px-4 py-2 text-[0.7rem] text-muted-foreground">
        {rows.length} registration{rows.length === 1 ? '' : 's'}
        {outstanding > 0
          ? <> · <strong className="font-semibold text-[#991B1B]">{outstanding} outstanding</strong> this month</>
          : ' · nothing outstanding this month'}
      </p>

      <div className="space-y-2.5 p-3">
        {rows.map(({ registration, owed }) => (
          <div key={registration.id} className="rounded-xl border border-[#E7EDF4] p-3">
            <p className="truncate text-[0.85rem] font-medium" style={{ color: NAVY }}>
              {registration.clientName}
            </p>
            <p className="mt-0.5 truncate identifier text-[0.72rem] text-muted-foreground/70">
              {registration.codeNo ? `${registration.codeNo} · ` : ''}{registration.gstin}
            </p>
            <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">
              {registration.responsiblePersonName || 'Unassigned'} · {registration.filingFrequency}
            </p>

            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-[#F1F4F8] pt-2.5">
              {RETURN_TYPES.map(rt => {
                if (!owed.includes(rt)) {
                  return (
                    <div key={rt} className="rounded-lg border border-dashed border-[#F1F4F8] px-2 py-1.5 text-center">
                      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                        {rt === 'GSTR-1' ? 'GSTR-1' : 'GSTR-3B'}
                      </p>
                      <p className="text-[0.7rem] text-slate-300">not owed</p>
                    </div>
                  );
                }

                const filing = cellFor(registration.id, rt, month.key);
                const status = filing?.status || EMPTY_STATUS;
                const meta = STATUS_META[status];
                const late = isLate(registration, month, rt, filing);
                const untouched = status === 'Pending';
                const expected = isObligation(registration, month, rt);

                const label = status === 'Filed'
                  ? shortDate(filing?.filedOn) || 'Filed'
                  : untouched
                    ? (late ? 'Past due' : expected ? 'Not started' : 'Not due yet')
                    : meta.label;

                const chip = untouched
                  ? late
                    ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                    : 'bg-white text-slate-400 border-dashed border-[#E3E9F1]'
                  : meta.className;

                return (
                  <button
                    key={rt}
                    onClick={() => onOpen(registration, month, rt, filing)}
                    // Tall enough to hit with a thumb: the desktop cell is 22px,
                    // which is well under the ~44px a touch target needs.
                    className={`min-h-[44px] rounded-lg border px-2 py-1.5 text-center transition-colors ${chip}`}
                  >
                    <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] opacity-70">
                      {rt === 'GSTR-1' ? 'GSTR-1' : 'GSTR-3B'}
                    </p>
                    <p className="text-[0.76rem] font-semibold leading-tight">{label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
