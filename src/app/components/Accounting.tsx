import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { accountingAPI, type AccountingControlItem } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';
import { useToast } from './Toast';
import { sortText } from '../utils/sorting';

const NAVY = '#1b365d';
const PAGE_SIZE = 25;
type TickField = 'sales' | 'purchase' | 'bank' | 'suspense';
const TICK_FIELDS: TickField[] = ['sales', 'purchase', 'bank', 'suspense'];
const FINANCIAL_YEAR = '2026-27';
const ACCOUNTING_MONTHS = [
  { key: '2026-04', short: 'Apr', label: 'April 2026' },
  { key: '2026-05', short: 'May', label: 'May 2026' },
  { key: '2026-06', short: 'Jun', label: 'June 2026' },
  { key: '2026-07', short: 'Jul', label: 'July 2026' },
  { key: '2026-08', short: 'Aug', label: 'August 2026' },
  { key: '2026-09', short: 'Sep', label: 'September 2026' },
  { key: '2026-10', short: 'Oct', label: 'October 2026' },
  { key: '2026-11', short: 'Nov', label: 'November 2026' },
  { key: '2026-12', short: 'Dec', label: 'December 2026' },
  { key: '2027-01', short: 'Jan', label: 'January 2027' },
  { key: '2027-02', short: 'Feb', label: 'February 2027' },
  { key: '2027-03', short: 'Mar', label: 'March 2027' },
] as const;

const currentAccountingMonth = () => {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return ACCOUNTING_MONTHS.some(month => month.key === key) ? key : ACCOUNTING_MONTHS[0].key;
};

export function Accounting() {
  const { showError } = useToast();
  const [items, setItems] = useState<AccountingControlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState('all');
  const [type, setType] = useState('all');
  const [review, setReview] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentAccountingMonth);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [remarksDrafts, setRemarksDrafts] = useState<Record<string, string>>({});

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await accountingAPI.getAll(FINANCIAL_YEAR);
      if (!response.success) throw new Error(response.error || 'Could not load accounting records.');
      setItems(response.data || []);
    } catch (error) {
      if (!silent) showError(error instanceof Error ? error.message : 'Could not load accounting records.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useLiveData(['accounting'], () => load({ silent: true }));

  const people = useMemo(
    () => sortText([...new Set(items.map(item => item.responsiblePerson).filter(Boolean))]),
    [items],
  );
  const types = useMemo(() => sortText([...new Set(items.map(item => item.accountType))]), [items]);
  const reviews = useMemo(() => sortText([...new Set(items.map(item => item.reviewFrequency))]), [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      if (person !== 'all' && item.responsiblePerson !== person) return false;
      if (type !== 'all' && item.accountType !== type) return false;
      if (review !== 'all' && item.reviewFrequency !== review) return false;
      if (query && ![
        item.particulars, item.accountType, item.reviewFrequency,
        item.partyName, item.responsiblePerson, item.remarks,
      ].some(value => String(value || '').toLowerCase().includes(query))) return false;
      return true;
    });
  }, [items, search, person, type, review]);

  useEffect(() => { setPage(1); }, [search, person, type, review]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const completed = items.filter(item =>
    ACCOUNTING_MONTHS.every(month => TICK_FIELDS.every(field => Boolean(item.monthlyChecks[month.key]?.[field])))
  ).length;
  const selectedMonthInfo = ACCOUNTING_MONTHS.find(month => month.key === selectedMonth)!;
  const selectedMonthChecks = items.reduce(
    (total, item) => total + TICK_FIELDS.filter(field => Boolean(item.monthlyChecks[selectedMonth]?.[field])).length,
    0,
  );

  const markSaving = (key: string, active: boolean) => {
    setSaving(previous => {
      const next = new Set(previous);
      if (active) next.add(key); else next.delete(key);
      return next;
    });
  };

  const updateTick = async (item: AccountingControlItem, field: TickField, value: boolean) => {
    const key = `${item.id}:${selectedMonth}`;
    if (saving.has(key)) return;
    setItems(previous => previous.map(row => row.id === item.id ? {
      ...row,
      monthlyChecks: {
        ...row.monthlyChecks,
        [selectedMonth]: { ...(row.monthlyChecks[selectedMonth] || {}), [field]: value },
      },
    } : row));
    markSaving(key, true);
    try {
      const response = await accountingAPI.updateMonth(item.id, selectedMonth, field, value);
      if (!response.success || !response.data) throw new Error(response.error || 'Could not save this tick.');
      setItems(previous => previous.map(row => row.id === item.id ? response.data! : row));
    } catch (error) {
      setItems(previous => previous.map(row => row.id === item.id ? item : row));
      showError(error instanceof Error ? error.message : 'Could not save this tick.');
    } finally {
      markSaving(key, false);
    }
  };

  const saveRemarks = async (item: AccountingControlItem) => {
    const draft = remarksDrafts[item.id];
    if (draft === undefined || draft === item.remarks) return;
    const key = `${item.id}:remarks`;
    markSaving(key, true);
    try {
      const response = await accountingAPI.update(item.id, { remarks: draft });
      if (!response.success || !response.data) throw new Error(response.error || 'Could not save remarks.');
      setItems(previous => previous.map(row => row.id === item.id ? response.data! : row));
      setRemarksDrafts(previous => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Could not save remarks.');
    } finally {
      markSaving(key, false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Accounting</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Accounting control list for client books</p>
        </div>
        <span className="rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2 text-sm font-medium" style={{ color: NAVY }}>
          F.Y. {FINANCIAL_YEAR}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clients" value={items.length} />
        <Stat label="Monthly" value={items.filter(item => item.reviewFrequency === 'Monthly').length} />
        <Stat label="Fully checked" value={completed} tone="good" />
        <Stat label="In progress" value={items.length - completed} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full min-w-0 lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search party, person, type or remarks…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <FilterSelect value={person} onChange={setPerson} label="Everyone" options={people} />
            <FilterSelect value={type} onChange={setType} label="All types" options={types} />
            <FilterSelect value={review} onChange={setReview} label="All reviews" options={reviews} />
          </div>
        </div>

        <div className="border-b border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Work month</p>
              <p className="text-xs font-medium" style={{ color: NAVY }}>{selectedMonthInfo.label}</p>
            </div>
            <span className="text-right text-xs text-muted-foreground">
              {selectedMonthChecks} of {items.length * TICK_FIELDS.length} checks complete
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Accounting month">
            {ACCOUNTING_MONTHS.map(month => (
              <button
                key={month.key}
                type="button"
                role="tab"
                aria-selected={selectedMonth === month.key}
                onClick={() => setSelectedMonth(month.key)}
                className={`min-w-[58px] flex-1 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
                  selectedMonth === month.key
                    ? 'border-[#1b365d] bg-[#1b365d] text-white shadow-sm'
                    : 'border-[#DDE5EE] bg-white text-muted-foreground hover:border-[#1b365d]/40 hover:text-[#1b365d]'
                }`}
              >
                {month.short}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-20 text-center text-sm text-muted-foreground">No accounting clients match these filters.</div>
        ) : (
          <div className="max-h-[64vh] overflow-auto">
            <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#F9FAFB]">
                  <Head className="w-[70px] text-center">Particulars</Head>
                  <Head className="w-[58px] text-center">Type</Head>
                  <Head className="w-[100px]">Review</Head>
                  <Head className="min-w-[270px]">Party Name</Head>
                  <Head className="w-[155px]">Responsible Person</Head>
                  <Head compact>Sales</Head>
                  <Head compact>Purchase</Head>
                  <Head compact>Bank</Head>
                  <Head compact>Suspense</Head>
                  <Head className="min-w-[240px]">Remarks</Head>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => (
                  <tr key={item.id} className="group hover:bg-[#FAFBFD]">
                    <Cell className="text-center font-mono text-xs">{item.particulars}</Cell>
                    <Cell className="text-center font-semibold" style={{ color: NAVY }}>{item.accountType}</Cell>
                    <Cell>{item.reviewFrequency}</Cell>
                    <Cell className="font-medium" style={{ color: NAVY }}>{item.partyName}</Cell>
                    <Cell>{item.responsiblePerson}</Cell>
                    {TICK_FIELDS.map(field => {
                      const checked = Boolean(item.monthlyChecks[selectedMonth]?.[field]);
                      return (
                        <td key={field} className="w-[66px] border-b border-[#F1F4F8] px-1 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => updateTick(item, field, !checked)}
                            disabled={saving.has(`${item.id}:${selectedMonth}`)}
                            aria-label={`${checked ? 'Clear' : 'Tick'} ${field} for ${item.partyName}, ${selectedMonthInfo.label}`}
                            aria-pressed={checked}
                            className={`mx-auto flex h-6 w-6 items-center justify-center rounded border transition disabled:opacity-50 ${
                              checked
                                ? 'border-green-300 bg-green-100 text-green-700'
                                : 'border-[#D8E0EA] bg-white text-transparent hover:border-[#1b365d]/50'
                            }`}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="min-w-[240px] border-b border-[#F1F4F8] px-2 py-1.5">
                      <input
                        value={remarksDrafts[item.id] ?? item.remarks}
                        onChange={event => setRemarksDrafts(previous => ({ ...previous, [item.id]: event.target.value }))}
                        onBlur={() => saveRemarks(item)}
                        placeholder="Add remarks…"
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none transition placeholder:text-muted-foreground/45 hover:border-[#E7EDF4] focus:border-[#1b365d] focus:bg-white focus:ring-2 focus:ring-[#1b365d]/10"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3">
            <span className="text-xs text-muted-foreground">
              {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1} className="rounded-lg border border-[#E0E7EF] bg-white px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
                <span className="min-w-20 text-center text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <button type="button" onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-lg border border-[#E0E7EF] bg-white px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'good' }) {
  const color = tone === 'good' ? '#166534' : NAVY;
  return (
    <div className="rounded-xl border border-[#E7EDF4] bg-white px-4 py-3.5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>{value.toLocaleString('en-IN')}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }: {
  value: string; onChange: (value: string) => void; label: string; options: string[];
}) {
  return (
    <div className="relative min-w-0 sm:min-w-36">
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15" style={{ color: NAVY }}>
        <option value="all">{label}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Head({ children, className = '', compact = false }: { children: React.ReactNode; className?: string; compact?: boolean }) {
  return (
    <th className={`border-b border-[#E7EDF4] bg-[#F9FAFB] px-2 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground ${compact ? 'w-[66px] text-center' : ''} ${className}`}>
      {children}
    </th>
  );
}

function Cell({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`border-b border-[#F1F4F8] px-3 py-2.5 text-foreground/75 ${className}`} style={style}>{children}</td>;
}
