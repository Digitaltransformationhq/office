import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gstAPI, type GstFiling, type GstRegistration } from '../services/api';
import { useToast } from './Toast';
import { useLiveData } from '../hooks/useLiveData';
import { GSTFilingModal } from './GSTFilingModal';
import { GSTAnnualView } from './GSTAnnualView';
import { GSTMonthlyMobile } from './GSTMonthlyMobile';
import { Search, AlertTriangle, CheckCircle2, Clock, ChevronDown } from 'lucide-react';
import {
  STATUS_META, EMPTY_STATUS, financialYearOf, fyMonths, dueDateFor, isOverdue,
  returnsFor, shortDate, today, type AnnualReturnType, type GstPeriod,
} from '../utils/gst';

const NAVY = '#1b365d';

type ReturnType_ = 'GSTR-1' | 'GSTR-3B';
const RETURN_TYPES: ReturnType_[] = ['GSTR-1', 'GSTR-3B'];

/** Widths of the three frozen columns, needed to place the initial scroll. */
const W_CLIENT = 248;
const W_FREQ = 40;
const W_STAFF = 92;
const FROZEN = W_CLIENT + W_FREQ + W_STAFF;

interface GSTComplianceProps {
  currentUser: { id: string; name: string; role?: string } | null;
}

/**
 * The GST compliance register — the replacement for "GST Report <FY>.xlsx".
 *
 * Deliberately still a grid. The spreadsheet's shape is the right one for the
 * question the office actually asks ("what is outstanding across everyone this
 * month?"), and rebuilding it as a list of filings would answer a question
 * nobody has. What changes is what sits behind a cell: a status, a data-received
 * date, an ARN and a remark, rather than one overloaded value.
 *
 * The cell still shows the filing date, as the spreadsheet's did. Reading dates
 * straight off the grid is what made the sheet quick to scan, and hiding them
 * behind a click would have traded that away for nothing.
 */
export function GSTCompliance({ currentUser }: GSTComplianceProps) {
  const { showError } = useToast();

  const [financialYear, setFinancialYear] = useState(financialYearOf());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [registrations, setRegistrations] = useState<GstRegistration[]>([]);
  const [filings, setFilings] = useState<GstFiling[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [frequency, setFrequency] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [editing, setEditing] = useState<{
    registration: GstRegistration; period: GstPeriod;
    returnType: ReturnType_ | AnnualReturnType; filing: GstFiling | null;
    financialYear: string;
  } | null>(null);

  /*
   * Monthly and annual are separate tabs on separate years, and that is not an
   * oversight. GSTR-1 for 2026-27 and GSTR-9 for 2025-26 are both live work
   * right now — the annual return for a year is filed most of the way through
   * the next one — so tying them to a single year selector would make one of
   * them permanently wrong.
   */
  const [tab, setTab] = useState<'monthly' | 'annual'>('monthly');
  const [annualYear, setAnnualYear] = useState(() => {
    const y = Number(financialYearOf().slice(0, 4)) - 1;
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  });
  const [annual, setAnnual] = useState<{ registrations: GstRegistration[]; filings: GstFiling[] }>({ registrations: [], filings: [] });
  const [annualLoading, setAnnualLoading] = useState(false);

  const months = useMemo(() => fyMonths(financialYear), [financialYear]);
  const currentMonthKey = today().slice(0, 7);

  // The phone view shows one month at a time. Opens on the current month, or on
  // the last month of the year when looking at a year already past.
  const [monthIndex, setMonthIndex] = useState(0);
  useEffect(() => {
    const i = months.findIndex(m => m.key === currentMonthKey);
    setMonthIndex(i === -1 ? months.length - 1 : i);
  }, [financialYear, currentMonthKey, months]);

  useEffect(() => { load(); }, [financialYear]);

  useEffect(() => { if (tab === 'annual') loadAnnual(); }, [tab, annualYear]);

  useLiveData(['gst'], () => {
    load({ silent: true });
    if (tab === 'annual') loadAnnual({ silent: true });
  });

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [register, years] = await Promise.all([
        gstAPI.getRegister(financialYear),
        gstAPI.getFinancialYears(),
      ]);
      setRegistrations(register.data.registrations);
      setFilings(register.data.filings);
      // The current year may hold nothing yet, so it is always offered even when
      // the register has no rows for it — otherwise a new April has no way in.
      setAvailableYears([...new Set([financialYearOf(), ...(years.data || [])])].sort().reverse());
    } catch {
      if (!silent) showError('Failed to load the GST register');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadAnnual = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setAnnualLoading(true);
      const r = await gstAPI.getRegister(annualYear);
      setAnnual({ registrations: r.data.registrations, filings: r.data.filings });
    } catch {
      if (!silent) showError('Failed to load the annual returns');
    } finally {
      if (!silent) setAnnualLoading(false);
    }
  };

  /*
   * Open on the month being worked on, not on April.
   *
   * Twelve months is far wider than any screen, and the months that matter are
   * the recent ones. Landing on April means scrolling past a wall of finished
   * work every single time the screen is opened.
   */
  const scrollRef = useRef<HTMLDivElement>(null);
  const placedFor = useRef<string | null>(null);
  useEffect(() => {
    if (loading || placedFor.current === financialYear) return;
    const box = scrollRef.current;
    const head = box?.querySelector<HTMLElement>(`[data-month="${currentMonthKey}"]`);
    if (!box || !head) return;
    // One month back, so the previous month stays in view as context.
    box.scrollLeft = Math.max(0, head.offsetLeft - FROZEN - 96);
    placedFor.current = financialYear;
  }, [loading, financialYear, currentMonthKey]);

  /** Cells indexed by the same key the database uses, so lookup is O(1) per cell. */
  const filingMap = useMemo(() => {
    const map = new Map<string, GstFiling>();
    for (const f of filings) map.set(`${f.registrationId}|${f.returnType}|${f.periodKey}`, f);
    return map;
  }, [filings]);

  const cellFor = (registrationId: string, returnType: ReturnType_, periodKey: string) =>
    filingMap.get(`${registrationId}|${returnType}|${periodKey}`) || null;

  const people = useMemo(
    () => [...new Set(registrations.map(r => r.responsiblePersonName).filter(Boolean) as string[])].sort(),
    [registrations],
  );

  /**
   * Whether a cell is an obligation this register can honestly assert.
   *
   * Two conditions. The period must have ended — a return for next February is
   * not outstanding, it is not yet due. And the obligation must be knowable:
   * only a monthly registration has a schedule derivable from its frequency
   * alone, so for any other cycle the sole evidence that something was due in a
   * given month is that somebody recorded something against it.
   *
   * Without the second condition every registration carrying a GSTIN but no
   * known cycle would manufacture twenty-four deadlines a year. Rows backfilled
   * from clients.gst, which have no frequency of their own, are exactly that
   * case — and a compliance count inflated by rows nobody is working is a count
   * nobody will trust.
   */
  const isObligation = (r: GstRegistration, m: GstPeriod, rt: ReturnType_) =>
    m.end <= today() && (r.filingFrequency === 'Monthly' || !!cellFor(r.id, rt, m.key));

  /** How many returns this registration still owes, for the badge on its row. */
  const openCount = (r: GstRegistration) => {
    let n = 0;
    for (const rt of returnsFor(r.filingFrequency)) {
      for (const m of months) {
        if (!isObligation(r, m, rt)) continue;
        if (STATUS_META[cellFor(r.id, rt, m.key)?.status || EMPTY_STATUS].open) n++;
      }
    }
    return n;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter(r => {
      if (r.status === 'Cancelled') return false;
      if (person !== 'all' && r.responsiblePersonName !== person) return false;
      if (frequency !== 'all' && r.filingFrequency !== frequency) return false;
      if (q && ![r.clientName, r.gstin, r.codeNo, r.pan, r.tradeName]
        .some(v => (v || '').toLowerCase().includes(q))) return false;
      if (onlyOpen && openCount(r) === 0) return false;
      return true;
    });
  }, [registrations, search, person, frequency, onlyOpen, months, filingMap]);

  const summary = useMemo(() => {
    let due = 0, filed = 0, overdue = 0;
    for (const r of filtered) {
      for (const rt of returnsFor(r.filingFrequency)) {
        for (const m of months) {
          if (!isObligation(r, m, rt)) continue;
          due++;
          const cell = cellFor(r.id, rt, m.key);
          const status = cell?.status || EMPTY_STATUS;
          if (!STATUS_META[status].open) filed++;
          else if (isOverdue(status, cell?.dueDate ?? dueDateFor(r.filingFrequency, m, rt))) overdue++;
        }
      }
    }
    return { due, filed, overdue, pending: due - filed };
  }, [filtered, months, filingMap]);

  /**
   * Put a saved row back into whichever list it came from.
   *
   * Monthly and annual hold different years, so the row is routed by its own
   * financialYear rather than by which tab is open — an annual return saved
   * while the monthly grid is behind it must not be appended to the monthly
   * year's filings, where nothing would ever read it.
   */
  const applySaved = (saved: GstFiling) => {
    const merge = (prev: GstFiling[]) => {
      const i = prev.findIndex(f => f.id === saved.id);
      if (i === -1) return [...prev, saved];
      const next = [...prev];
      next[i] = saved;
      return next;
    };
    if (saved.financialYear === financialYear) setFilings(merge);
    if (saved.financialYear === annualYear) setAnnual(a => ({ ...a, filings: merge(a.filings) }));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>GST Compliance</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tab === 'monthly'
              ? 'GSTR-1 and GSTR-3B across every registration, month by month'
              : 'GSTR-9, GSTR-9C and GSTR-4 — the returns for a whole year'}
          </p>
        </div>
        <SelectShell className="self-start font-medium">
          <select
            value={tab === 'monthly' ? financialYear : annualYear}
            onChange={e => (tab === 'monthly' ? setFinancialYear : setAnnualYear)(e.target.value)}
            className={selectCls}
            style={{ color: NAVY }}
            aria-label={tab === 'monthly' ? 'Financial year' : 'Financial year the annual return reports on'}
          >
            {availableYears.map(y => <option key={y} value={y}>F.Y. {y}</option>)}
          </select>
        </SelectShell>
      </div>

      {/* Monthly / annual */}
      <div className="flex gap-1 rounded-xl border border-[#E7EDF4] bg-white p-1">
        {([['monthly', 'Monthly returns', 'GSTR-1 · 3B'], ['annual', 'Annual returns', 'GSTR-9 · 9C · 4']] as const).map(([key, label, sub]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'text-white' : 'text-muted-foreground hover:bg-[#F4F6F9]'
            }`}
            style={tab === key ? { backgroundColor: NAVY } : undefined}
          >
            {label}
            <span className={`ml-2 hidden text-[0.68rem] font-normal sm:inline ${tab === key ? 'text-white/70' : 'text-muted-foreground/70'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${tab === 'monthly' ? '' : 'hidden'}`}>
        <Stat label="Registrations" value={filtered.length} tone="neutral" />
        <Stat label="Returns due to date" value={summary.due} tone="neutral" icon={Clock} />
        <Stat label="Completed" value={summary.filed} tone="good" icon={CheckCircle2} />
        <Stat label="Past due date" value={summary.overdue} tone={summary.overdue ? 'bad' : 'neutral'} icon={AlertTriangle} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        {/* Filters. Monthly only — the annual list is short enough to read whole. */}
        <div className={`flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between ${tab === 'monthly' ? 'flex' : 'hidden'}`}>
          <div className="relative w-full lg:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client, GSTIN, PAN, code…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
            <Select value={person} onChange={setPerson} label="Everyone">
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select value={frequency} onChange={setFrequency} label="All frequencies">
              {['Monthly', 'Quarterly', 'Composition', 'Annual', 'Irregular', 'Not Applicable']
                .map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
            <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7EDF4] px-3 py-2 text-sm sm:col-span-1">
              <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} className="accent-[#1b365d]" />
              <span style={{ color: NAVY }}>Outstanding only</span>
            </label>
          </div>
        </div>

        {tab === 'annual' ? (
          annualLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
            </div>
          ) : (
            <GSTAnnualView
              registrations={annual.registrations}
              filings={annual.filings}
              financialYear={annualYear}
              onOpen={(registration, period, returnType, filing) =>
                setEditing({ registration, period, returnType, filing, financialYear: annualYear })}
            />
          )
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              {registrations.length === 0
                ? 'No GST registrations yet. Import the spreadsheet — see docs/gst-compliance.md.'
                : 'No registrations match these filters.'}
            </p>
          </div>
        ) : (
          /*
           * Both axes scroll inside this box, so the month headings stay put over
           * 170-odd rows and the client stays put across twelve months. Whichever
           * cell is being read, it can always be traced back to a name and a date.
           *
           * border-separate, not border-collapse: a collapsed table drops the
           * borders on sticky cells as they detach.
           */
          <>
          {/* Phone: one month at a time. See GSTMonthlyMobile for why. */}
          <div className="max-h-[64vh] overflow-auto md:hidden">
            <GSTMonthlyMobile
              rows={filtered.map(r => ({
                registration: r,
                owed: returnsFor(r.filingFrequency),
                open: openCount(r),
              }))}
              months={months}
              monthIndex={monthIndex}
              onMonthChange={i => setMonthIndex(Math.min(months.length - 1, Math.max(0, i)))}
              cellFor={cellFor}
              isObligation={isObligation}
              isLate={(r, m, rt, filing) =>
                isOverdue(filing?.status || EMPTY_STATUS, filing?.dueDate ?? dueDateFor(r.filingFrequency, m, rt))}
              onOpen={(registration, period, returnType, filing) =>
                setEditing({ registration, period, returnType, filing, financialYear })}
            />
          </div>

          <div ref={scrollRef} className="hidden max-h-[64vh] overflow-auto md:block">
            <table className="w-max border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th
                    className="sticky left-0 top-0 z-40 border-b border-r border-[#E7EDF4] bg-[#F9FAFB] px-4 text-left text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                    style={{ width: W_CLIENT, minWidth: W_CLIENT, height: 30 }}
                    rowSpan={2}
                  >
                    Client
                  </th>
                  <th
                    className="sticky top-0 z-30 border-b border-[#E7EDF4] bg-[#F9FAFB] text-center text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                    style={{ width: W_FREQ, minWidth: W_FREQ }}
                    rowSpan={2}
                    title="Filing frequency"
                  >
                    M/Q
                  </th>
                  <th
                    className="sticky top-0 z-30 border-b border-r border-[#E7EDF4] bg-[#F9FAFB] px-2 text-left text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                    style={{ width: W_STAFF, minWidth: W_STAFF }}
                    rowSpan={2}
                  >
                    Staff
                  </th>
                  {months.map((m, i) => {
                    const isNow = m.key === currentMonthKey;
                    return (
                      <th
                        key={m.key}
                        data-month={m.key}
                        colSpan={2}
                        className={`sticky top-0 z-30 border-r border-[#E7EDF4] text-center text-[0.62rem] font-semibold uppercase tracking-[0.06em] ${isNow ? 'bg-[#1b365d] text-white' : i % 2 ? 'bg-[#F4F7FB]' : 'bg-[#F9FAFB]'}`}
                        style={{ height: 30, color: isNow ? undefined : NAVY }}
                      >
                        {m.shortLabel}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {months.map((m, i) => RETURN_TYPES.map((rt, j) => (
                    <th
                      key={`${m.key}-${rt}`}
                      className={`sticky z-30 border-b border-[#E7EDF4] pb-1 text-center text-[0.56rem] font-medium text-muted-foreground ${j === 1 ? 'border-r' : ''} ${i % 2 ? 'bg-[#F4F7FB]' : 'bg-[#F9FAFB]'}`}
                      style={{ top: 30, width: 52, minWidth: 52 }}
                    >
                      {rt === 'GSTR-1' ? 'R1' : '3B'}
                    </th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const owed = returnsFor(r.filingFrequency);
                  const open = openCount(r);
                  return (
                    <tr key={r.id} className="group">
                      <td
                        className="sticky left-0 z-10 border-b border-r border-[#E7EDF4] bg-white px-4 py-1.5 group-hover:bg-[#F7FAFF]"
                        style={{ width: W_CLIENT, minWidth: W_CLIENT }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-[0.82rem] font-medium" style={{ color: NAVY }} title={r.clientName}>
                            {r.clientName}
                          </p>
                          {/* Always visible, however far the grid is scrolled: the
                              point of the badge is to find problem rows without
                              having to scroll back to find them. */}
                          {open > 0 && (
                            <span className="shrink-0 rounded-full bg-[#FEE2E2] px-1.5 py-0.5 text-[0.6rem] font-semibold text-[#991B1B]" title={`${open} return${open > 1 ? 's' : ''} outstanding`}>
                              {open}
                            </span>
                          )}
                        </div>
                        <p className="truncate font-mono text-[0.6rem] text-muted-foreground/70">
                          {r.codeNo ? `${r.codeNo} · ` : ''}{r.gstin}
                        </p>
                      </td>
                      <td
                        className="border-b border-[#E7EDF4] bg-white text-center text-[0.7rem] font-medium text-muted-foreground group-hover:bg-[#F7FAFF]"
                        title={r.filingFrequency}
                      >
                        {r.filingFrequency === 'Not Applicable' ? '–' : r.filingFrequency.charAt(0)}
                      </td>
                      <td className="truncate border-b border-r border-[#E7EDF4] bg-white px-2 text-[0.72rem] text-muted-foreground group-hover:bg-[#F7FAFF]" style={{ maxWidth: W_STAFF }}>
                        {r.responsiblePersonName || '—'}
                      </td>

                      {months.map((m, i) => RETURN_TYPES.map((rt, j) => {
                        const filing = owed.includes(rt) ? cellFor(r.id, rt, m.key) : null;
                        const status = filing?.status || EMPTY_STATUS;
                        const due = filing?.dueDate ?? dueDateFor(r.filingFrequency, m, rt);
                        return (
                          <FilingCell
                            key={`${m.key}-${rt}`}
                            owed={owed.includes(rt)}
                            expected={owed.includes(rt) && isObligation(r, m, rt)}
                            status={status}
                            filing={filing}
                            late={isOverdue(status, due)}
                            band={i % 2 === 1}
                            edge={j === 1}
                            tooltip={`${r.clientName}\n${rt} · ${m.label}\n${STATUS_META[status].label}${filing?.filedOn ? ` on ${filing.filedOn}` : ''}${due ? `\nDue ${due}` : ''}`}
                            onClick={() => setEditing({ registration: r, period: m, returnType: rt, filing, financialYear })}
                          />
                        );
                      }))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Legend. Monthly only — the annual cells spell their status out. */}
        <div className={`flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3 ${tab === 'monthly' ? 'hidden md:flex' : 'hidden'}`}>
          <span className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
            <span className="inline-flex h-5 w-[46px] items-center justify-center rounded border border-[#BBF7D0] bg-[#DCFCE7] text-[0.6rem] font-semibold text-[#166534]">9/5</span>
            Filed, on that date
          </span>
          {(['Data Received', 'Message Sent', 'Challan Sent', 'OTP Awaited', 'Data Not Provided', 'Nil'] as const).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
              <span className={`inline-flex h-5 w-[46px] items-center justify-center rounded border text-[0.6rem] font-semibold ${STATUS_META[s].className}`}>
                {STATUS_META[s].code}
              </span>
              {STATUS_META[s].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
            <span className="inline-flex h-5 w-[46px] items-center justify-center rounded border border-[#FECACA] bg-[#FEE2E2] text-[0.62rem] font-bold text-[#991B1B]">!</span>
            Not filed, past due
          </span>
          <span className="flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
            <span className="inline-flex h-5 w-[46px] items-center justify-center rounded border border-dashed border-[#D8E0EA] text-[0.6rem] text-slate-400">·</span>
            Nothing recorded
          </span>
        </div>
      </section>

      {editing && (
        <GSTFilingModal
          registration={editing.registration}
          period={editing.period}
          returnType={editing.returnType}
          financialYear={editing.financialYear}
          filing={editing.filing}
          currentUser={currentUser}
          onClose={() => setEditing(null)}
          onSaved={applySaved}
        />
      )}
    </div>
  );
}

/**
 * One cell of the register.
 *
 * What it shows, in order of what the reader needs:
 *
 *   filed        the date it was filed — the spreadsheet's own convention
 *   in progress  a three-letter status code
 *   overdue      a bare "!" on red, so an unworked month stands out at a glance
 *   not yet due  a faint dot; still clickable, but not shouting
 *   not owed     blank, for composition and non-GST registrations
 *
 * A future month is drawn as nothing rather than as "Pending". Twelve months of
 * grey chips for work that has not come round yet is the noise that makes a
 * register stop being read.
 */
function FilingCell({ owed, expected, status, filing, late, band, edge, tooltip, onClick }: {
  owed: boolean;
  expected: boolean;
  status: keyof typeof STATUS_META;
  filing: GstFiling | null;
  late: boolean;
  band: boolean;
  edge: boolean;
  tooltip: string;
  onClick: () => void;
}) {
  const cellCls = `border-b border-[#E7EDF4] p-0.5 text-center ${edge ? 'border-r' : ''} ${band ? 'bg-[#FBFCFE]' : 'bg-white'} group-hover:bg-[#F7FAFF]`;

  if (!owed) {
    return <td className={cellCls} style={{ width: 52, minWidth: 52 }} />;
  }

  const meta = STATUS_META[status];
  const untouched = status === 'Pending';

  let label: string = meta.code;
  let chip = meta.className;

  if (status === 'Filed') {
    label = shortDate(filing?.filedOn) || meta.code;
  } else if (untouched) {
    // Overdue reads as an alarm; not-yet-due reads as nothing at all.
    label = late ? '!' : expected ? '·' : '';
    chip = late
      ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] font-bold'
      : 'bg-transparent text-slate-300 border-dashed border-[#E3E9F1]';
  }

  return (
    <td className={cellCls} style={{ width: 52, minWidth: 52 }}>
      <button
        onClick={onClick}
        title={tooltip}
        className={`inline-flex h-[22px] w-[46px] items-center justify-center rounded border text-[0.6rem] font-semibold tabular-nums transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#1b365d]/40 ${chip} ${late && !untouched ? 'ring-1 ring-[#DC2626]' : ''}`}
      >
        {label}
      </button>
    </td>
  );
}

/**
 * Dropdown chrome shared by the selects on this screen.
 *
 * `appearance-none` drops the platform arrow, which sits hard against the border
 * and differs between browsers; `pr-9` reserves room for the chevron the shell
 * positions inset instead. Same treatment as SelectField in clientModalUI, so
 * the dropdowns here match the ones in the client dialogs.
 */
// w-full always: the chevron is absolutely positioned against the shell, so any
// gap between the shell's width and the select's leaves the chevron floating
// outside the box. The select fills the shell; the shell alone sets the width.
const selectCls =
  'w-full appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

function SelectShell({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Stat({ label, value, tone, icon: Icon }: {
  label: string; value: number; tone: 'neutral' | 'good' | 'bad'; icon?: React.ElementType;
}) {
  const color = tone === 'good' ? '#166534' : tone === 'bad' ? '#991B1B' : NAVY;
  return (
    <div className="rounded-xl border border-[#E7EDF4] bg-white px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} style={{ color }} />}
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function Select({ value, onChange, label, children }: {
  value: string; onChange: (v: string) => void; label: string; children: React.ReactNode;
}) {
  return (
    <SelectShell className="w-full sm:w-auto">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={selectCls}
        style={{ color: NAVY }}
      >
        <option value="all">{label}</option>
        {children}
      </select>
    </SelectShell>
  );
}
