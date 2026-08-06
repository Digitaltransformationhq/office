import React, { useEffect, useMemo, useState } from 'react';
import { itrAPI, type ItrFiling } from '../services/api';
import { useToast } from './Toast';
import { useLiveData } from '../hooks/useLiveData';
import { ITRFilingModal } from './ITRFilingModal';
import { Search, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ITR_STATUS_META, ITR_CHECKLIST, itrDueDate, itrIsOverdue } from '../utils/itr';
import { financialYearOf, formatDate } from '../utils/gst';

const NAVY = '#1b365d';
const PAGE_SIZE = 30;

interface ITRRegisterProps {
  currentUser: { id: string; name: string; role?: string } | null;
}

/** The financial year an ITR filed today would report on: the one just ended. */
function defaultItrYear() {
  const y = Number(financialYearOf().slice(0, 4)) - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

/**
 * The ITR register — the replacement for "ITR CONTROL LIST F.Y.<year>.xlsx".
 *
 * A list rather than a grid, because unlike GST there is nothing to lay across
 * the top: one return per client per year. What matters is who is holding
 * things up, so it sorts open work first and can be sliced by staff member.
 */
export function ITRRegister({ currentUser }: ITRRegisterProps) {
  const { showError } = useToast();

  const [financialYear, setFinancialYear] = useState(defaultItrYear());
  const [years, setYears] = useState<string[]>([]);
  const [filings, setFilings] = useState<ItrFiling[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [status, setStatus] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ItrFiling | null>(null);

  useEffect(() => { load(); }, [financialYear]);
  useLiveData(['itr'], () => load({ silent: true }));

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [register, list] = await Promise.all([
        itrAPI.getRegister(financialYear),
        itrAPI.getFinancialYears(),
      ]);
      setFilings(register.data.filings);
      setYears([...new Set([defaultItrYear(), ...(list.data || [])])].sort().reverse());
    } catch {
      if (!silent) showError('Failed to load the ITR register');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const people = useMemo(
    () => [...new Set(filings.map(f => f.responsiblePersonName).filter(Boolean) as string[])].sort(),
    [filings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filings.filter(f => {
      if (person !== 'all' && f.responsiblePersonName !== person) return false;
      if (status !== 'all' && f.status !== status) return false;
      if (onlyOpen && !ITR_STATUS_META[f.status].open) return false;
      if (q && ![f.clientName, f.pan, f.fileNumber, f.itrForm, f.dataNote, f.statusNote, f.billNumber, f.wpGroup]
        .some(v => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filings, search, person, status, onlyOpen]);

  /*
   * Outstanding work first, then the nearest deadline.
   *
   * The spreadsheet is in whatever order rows were typed, which means the 67
   * finished returns are scattered through the 374 that are not. Sorting by what
   * still needs doing is the one thing a list can do that a sheet cannot.
   */
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const ao = ITR_STATUS_META[a.status].open ? 0 : 1;
    const bo = ITR_STATUS_META[b.status].open ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const ad = a.dueDate || itrDueDate(a.financialYear, a.isAudit, a.businessIncome) || '';
    const bd = b.dueDate || itrDueDate(b.financialYear, b.isAudit, b.businessIncome) || '';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.clientName || '').localeCompare(b.clientName || '');
  }), [filtered]);

  useEffect(() => { setPage(1); }, [search, person, status, onlyOpen, financialYear]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paged = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  const summary = useMemo(() => {
    let filed = 0, overdue = 0;
    for (const f of filtered) {
      if (!ITR_STATUS_META[f.status].open) filed++;
      else if (itrIsOverdue(f.status, f.dueDate || itrDueDate(f.financialYear, f.isAudit, f.businessIncome))) overdue++;
    }
    return { total: filtered.length, filed, overdue, open: filtered.length - filed };
  }, [filtered]);

  const applySaved = (saved: ItrFiling) =>
    setFilings(prev => prev.map(f => (f.id === saved.id ? saved : f)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Income Tax Return</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">One return per client, for the year it reports on</p>
        </div>
        <div className="relative inline-flex self-start">
          <select
            value={financialYear}
            onChange={e => setFinancialYear(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm font-medium outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            style={{ color: NAVY }}
            aria-label="Financial year the return reports on"
          >
            {years.map(y => <option key={y} value={y}>F.Y. {y}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Returns" value={summary.total} tone="neutral" />
        <Stat label="Outstanding" value={summary.open} tone="neutral" icon={Clock} />
        <Stat label="Filed" value={summary.filed} tone="good" icon={CheckCircle2} />
        <Stat label="Past due date" value={summary.overdue} tone={summary.overdue ? 'bad' : 'neutral'} icon={AlertTriangle} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client, PAN, file no., notes…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
            <Select value={person} onChange={setPerson} label="Everyone">
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select value={status} onChange={setStatus} label="Any status">
              {(Object.keys(ITR_STATUS_META) as (keyof typeof ITR_STATUS_META)[])
                .map(s => <option key={s} value={s}>{ITR_STATUS_META[s].label}</option>)}
            </Select>
            <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7EDF4] px-3 py-2 text-sm sm:col-span-1">
              <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} className="accent-[#1b365d]" />
              <span style={{ color: NAVY }}>Outstanding only</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            {filings.length === 0
              ? `No returns recorded for F.Y. ${financialYear}. Import them with scripts/import-itr-control-list.py.`
              : 'Nothing matches these filters.'}
          </p>
        ) : (
          <>
            <div className="divide-y divide-[#F1F4F8]">
              {paged.map(f => {
                const meta = ITR_STATUS_META[f.status];
                const due = f.dueDate || itrDueDate(f.financialYear, f.isAudit, f.businessIncome);
                const late = itrIsOverdue(f.status, due);
                const docs = ITR_CHECKLIST.filter(d => f[d.key]).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setEditing(f)}
                    className="flex w-full flex-col gap-2 px-5 py-3 text-left transition-colors hover:bg-[#F7FAFF] sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.86rem] font-medium" style={{ color: NAVY }}>{f.clientName}</p>
                      <p className="truncate font-mono text-[0.64rem] text-muted-foreground/75">
                        {f.pan || 'No PAN'}
                        {f.fileNumber && ` · ${f.fileNumber}`}
                        {f.responsiblePersonName && ` · ${f.responsiblePersonName}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      {f.itrForm && (
                        <span className="rounded-md bg-[#F4F6F9] px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                          {f.itrForm}
                        </span>
                      )}
                      {f.isAudit && (
                        <span className="rounded-md border border-[#DDD6FE] bg-[#EDE9FE] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-[#5B21B6]">
                          Audit
                        </span>
                      )}
                      {docs > 0 && (
                        <span className="text-[0.66rem] text-muted-foreground" title="Documents on file">
                          {docs}/{ITR_CHECKLIST.length} docs
                        </span>
                      )}
                      <span className={`rounded-md border px-2 py-0.5 text-[0.7rem] font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                      <span className={`w-[92px] shrink-0 text-right text-[0.7rem] ${late ? 'font-semibold text-[#991B1B]' : 'text-muted-foreground'}`}>
                        {f.status === 'Filed'
                          ? (f.filedOn ? formatDate(f.filedOn) : 'no date')
                          : late ? 'past due' : due ? formatDate(due) : '—'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-[#E7EDF4] px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, sorted.length)} of {sorted.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} label="Previous page">
                    <ChevronLeft size={15} />
                  </PageBtn>
                  <span className="px-2 text-xs font-medium" style={{ color: NAVY }}>{safePage} / {totalPages}</span>
                  <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} label="Next page">
                    <ChevronRight size={15} />
                  </PageBtn>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {editing && (
        <ITRFilingModal
          filing={editing}
          currentUser={currentUser}
          onClose={() => setEditing(null)}
          onSaved={applySaved}
        />
      )}
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
    <div className="relative inline-flex w-full sm:w-auto">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
        style={{ color: NAVY }}
      >
        <option value="all">{label}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function PageBtn({ children, label, onClick, disabled }: {
  children: React.ReactNode; label: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
