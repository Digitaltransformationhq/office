import { ClientMasterName } from './ClientMasterName';
import React, { useMemo, useState } from 'react';
import type { GstFiling, GstRegistration } from '../services/api';
import { Search, ChevronDown, Download } from 'lucide-react';
import { sortByText, sortText } from '../utils/sorting';
import { exportGstAnnualToExcel } from '../utils/exportGst';
import { useToast } from './Toast';
import {
  ANNUAL_RETURNS, STATUS_META, EMPTY_STATUS, annualDueDate, annualPeriod,
  annualReturnsFor, dueNote, formatDate, isOverdue, type AnnualReturnType, type GstPeriod,
} from '../utils/gst';

const NAVY = '#1b365d';

interface GSTAnnualViewProps {
  onOpenClient: (clientId: string) => void;
  compositionOnly?: boolean;
  registrations: GstRegistration[];
  filings: GstFiling[];
  financialYear: string;
  onOpen: (registration: GstRegistration, period: GstPeriod, returnType: AnnualReturnType, filing: GstFiling | null) => void;
}

/**
 * The annual returns for one financial year — GSTR-9, GSTR-9C and GSTR-4.
 *
 * A separate view rather than more columns on the monthly grid, because these
 * are a different thing: one row per year instead of twelve, a different set of
 * returns depending on whether the registration is composition, and a deadline
 * eight months after the year ends rather than eleven days after the month.
 *
 * Opens on the registrations that already have an annual return recorded — a
 * firm files GSTR-9 for a couple of dozen out of 170, and listing the rest as
 * empty rows would bury the ones that matter. Search, or the "all registrations"
 * toggle, reaches every other one so a return can be started for a client the
 * spreadsheet never listed.
 */
export function GSTAnnualView({ registrations, filings, financialYear, onOpen, onOpenClient, compositionOnly = false }: GSTAnnualViewProps) {
  const { showError } = useToast();
  const visibleReturns = compositionOnly ? ANNUAL_RETURNS.filter(r => r.type === 'GSTR-4') : ANNUAL_RETURNS;
  const period = useMemo(() => annualPeriod(financialYear), [financialYear]);

  const filingMap = useMemo(() => {
    const map = new Map<string, GstFiling>();
    for (const f of filings) {
      if (f.periodKey === financialYear) map.set(`${f.registrationId}|${f.returnType}`, f);
    }
    return map;
  }, [filings, financialYear]);

  const cellFor = (registrationId: string, returnType: AnnualReturnType) =>
    filingMap.get(`${registrationId}|${returnType}`) || null;

  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [person, setPerson] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  /**
   * Which annual returns to show for a registration: those its frequency
   * implies, plus any that have actually been recorded.
   *
   * The second half is the important one. Frequency and filings can disagree —
   * a composition dealer whose registration was backfilled from clients.gst
   * carries a guessed 'Monthly', and deriving the columns from frequency alone
   * would draw a GSTR-9 it does not owe while hiding the GSTR-4 sitting in the
   * database. A recorded return is a fact; the frequency is a label, and when
   * they conflict the fact has to win or the register silently loses data.
   */
  const typesFor = (r: GstRegistration): AnnualReturnType[] => {
    if (compositionOnly) return ['GSTR-4'];
    const implied = annualReturnsFor(r.filingFrequency);
    const recordedHere = ANNUAL_RETURNS
      .map(a => a.type)
      .filter(t => cellFor(r.id, t) && !implied.includes(t));
    return [...implied, ...recordedHere];
  };

  const candidates = useMemo(
    () => sortByText(
      registrations
        .filter(r => r.status !== 'Cancelled')
        .filter(r => {
          const service = compositionOnly ? 'gstFees' : 'gstAnnualReturnFees';
          return r.selectedServices.includes(service) && !r.discontinuedServices.includes(service);
        })
        .filter(r => compositionOnly ? r.filingFrequency === 'Composition' : r.filingFrequency !== 'Composition')
        .map(r => ({ registration: r, types: typesFor(r) }))
        .filter(row => row.types.length > 0),
      row => row.registration.clientName,
    ),
    [registrations, filingMap, compositionOnly],
  );

  const recorded = useMemo(
    () => candidates.filter(row => row.types.some(t => cellFor(row.registration.id, t))),
    [candidates, filingMap],
  );

  const people = useMemo(
    () => sortText([...new Set(candidates
      .map(row => row.registration.responsiblePersonName)
      .filter(Boolean) as string[])]),
    [candidates],
  );

  /*
   * By default only registrations the register already says something about —
   * any annual return recorded, in any state, including 'Not Applicable'.
   *
   * "Not applicable" is a decision somebody made and is worth showing: it is the
   * answer to "do we owe a 9C for this one?", and without it that question gets
   * re-litigated every December.
   *
   * Searching, or switching to all registrations, widens it to every one that
   * could owe an annual return. Without that there is no way to start a GSTR-9
   * for a client the spreadsheet did not already list — which is exactly what
   * the monthly grid allows, where every cell is reachable whether or not a row
   * exists behind it.
   */
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = (compositionOnly || showAll || q) ? candidates : recorded;
    return pool.filter(({ registration: r, types }) => {
      if (compositionOnly && person !== 'all' && r.responsiblePersonName !== person) return false;
      if (compositionOnly && onlyOpen && !types.some(t =>
        STATUS_META[cellFor(r.id, t)?.status || EMPTY_STATUS].open)) return false;
      if (q && ![r.clientName, r.gstin, r.codeNo, r.pan, r.tradeName]
        .some(v => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [candidates, recorded, search, showAll, compositionOnly, person, onlyOpen, filingMap]);

  const summary = useMemo(() => {
    let owed = 0, done = 0, overdue = 0;
    for (const { registration, types } of recorded) {
      for (const t of types) {
        const cell = cellFor(registration.id, t);
        if (!cell || cell.status === 'Not Applicable') continue;
        owed++;
        if (!STATUS_META[cell.status].open) done++;
        else if (isOverdue(cell.status, cell.dueDate ?? annualDueDate(t, financialYear))) overdue++;
      }
    }
    return { owed, done, overdue };
  }, [recorded, filingMap, financialYear]);

  const exportRows = async () => {
    if (rows.length === 0 || exporting) return;
    try {
      setExporting(true);
      await exportGstAnnualToExcel({
        rows,
        filings,
        returnTypes: visibleReturns.map(r => r.type),
        financialYear,
        compositionOnly,
      });
    } catch {
      showError('Failed to export the GST returns');
    } finally {
      setExporting(false);
    }
  };

  const controls = (
    <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full min-w-0 sm:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search any client to add a return…"
          className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
        />
      </div>
      {compositionOnly ? (
        <div className="grid shrink-0 grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <div className="relative col-span-2 sm:col-span-1">
            <select
              value={person}
              onChange={e => setPerson(e.target.value)}
              aria-label="Responsible staff"
              className="w-full appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
              style={{ color: NAVY }}
            >
              <option value="all">Everyone</option>
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7EDF4] px-3 py-2 text-sm">
            <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} className="accent-[#1b365d]" />
            <span className="whitespace-nowrap" style={{ color: NAVY }}>Outstanding only</span>
          </label>
          <span className="col-span-2 text-right text-xs text-muted-foreground sm:col-span-1">
            {rows.length} of {candidates.length}
          </span>
          <ExportButton onClick={exportRows} disabled={rows.length === 0 || exporting} exporting={exporting} />
        </div>
      ) : <div className="flex shrink-0 flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7EDF4] px-3 py-2 text-sm">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-[#1b365d]" />
          <span style={{ color: NAVY }}>
            All registrations
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({recorded.length} recorded of {candidates.length})
            </span>
          </span>
        </label>
        <ExportButton onClick={exportRows} disabled={rows.length === 0 || exporting} exporting={exporting} />
      </div>}
    </div>
  );

  if (rows.length === 0) {
    return (
      <div>
        {controls}
        <div className="px-5 py-16 text-center">
          {search.trim() ? (
            <p className="text-sm text-muted-foreground">No registration matches “{search.trim()}”.</p>
          ) : compositionOnly && (person !== 'all' || onlyOpen) ? (
            <p className="text-sm text-muted-foreground">No composition registrations match these filters.</p>
          ) : compositionOnly ? (
            <p className="text-sm text-muted-foreground">No composition clients found. Clients with filing frequency set to Composition appear here.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                No annual returns recorded for F.Y. {financialYear}.
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Tick “All registrations” to start one, or import the sheet with{' '}
                <span className="font-mono">scripts/import-gst-annual.py</span>.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {controls}
      {/* Deadlines, stated once at the top rather than repeated down every row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3">
        {visibleReturns.map(r => {
          const due = annualDueDate(r.type, financialYear);
          const note = dueNote(due);
          return (
            <span key={r.type} className="text-[0.7rem] text-muted-foreground">
              <strong className="font-semibold" style={{ color: NAVY }}>{r.label}</strong>
              {' '}due {formatDate(due)}
              {note && <span className={note.late ? 'text-[#991B1B]' : ''}> · {note.text}</span>}
            </span>
          );
        })}
        <span className="w-full text-[0.7rem] text-muted-foreground sm:ml-auto sm:w-auto">
          <strong className="font-semibold" style={{ color: NAVY }}>{summary.done}</strong> of{' '}
          <strong className="font-semibold" style={{ color: NAVY }}>{summary.owed}</strong> done
          {summary.overdue > 0 && <span className="text-[#991B1B]"> · {summary.overdue} past due</span>}
        </span>
      </div>

      {/* Phone: one card per registration. The table is 720px at its narrowest,
          and the three return columns do not compress any further. */}
      <div className="space-y-2.5 p-3 md:hidden">
        {rows.map(({ registration, types }) => (
          <div key={registration.id} className="rounded-xl border border-[#E7EDF4] p-3">
            <ClientMasterName clientId={registration.clientId} name={registration.clientName} onOpen={onOpenClient} className="truncate text-[0.85rem] font-medium" />
            <p className="mt-0.5 truncate identifier text-[0.72rem] text-muted-foreground/70">
              {registration.codeNo ? `${registration.codeNo} · ` : ''}{registration.gstin}
            </p>
            <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">
              {registration.responsiblePersonName || 'Unassigned'}
            </p>
            <div className="mt-2.5 space-y-1.5 border-t border-[#F1F4F8] pt-2.5">
              {visibleReturns.filter(r => types.includes(r.type)).map(r => (
                <div key={r.type} className="flex items-center justify-between gap-3">
                  <span className="text-[0.72rem] font-medium" style={{ color: NAVY }}>
                    {r.label}
                    <span className="ml-1.5 font-normal text-muted-foreground">{r.note}</span>
                  </span>
                  <AnnualCell
                    filing={cellFor(registration.id, r.type)}
                    due={annualDueDate(r.type, financialYear)}
                    onClick={() => onOpen(registration, period, r.type, cellFor(registration.id, r.type))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
              <th className="px-4 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Client</th>
              <th className="px-2 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Staff</th>
              {visibleReturns.map(r => (
                <th key={r.type} className="px-3 py-2.5 text-center text-[0.6rem] font-semibold uppercase tracking-[0.06em]" style={{ color: NAVY }}>
                  {r.label}
                  <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground">{r.note}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ registration, types }) => (
              <tr key={registration.id} className="border-b border-[#F1F4F8] hover:bg-[#FAFBFD]">
                <td className="max-w-[300px] px-4 py-2.5">
                  <ClientMasterName clientId={registration.clientId} name={registration.clientName} onOpen={onOpenClient} className="truncate text-[0.84rem] font-medium" />
                  <p className="truncate identifier text-[0.72rem] text-muted-foreground/70">
                    {registration.codeNo ? `${registration.codeNo} · ` : ''}{registration.gstin}
                  </p>
                </td>
                <td className="max-w-[110px] truncate px-2 py-2.5 text-[0.72rem] text-muted-foreground">
                  {registration.responsiblePersonName || '—'}
                </td>
                {visibleReturns.map(r => (
                  <td key={r.type} className="px-3 py-2.5 text-center">
                    {types.includes(r.type)
                      ? <AnnualCell
                          filing={cellFor(registration.id, r.type)}
                          due={annualDueDate(r.type, financialYear)}
                          onClick={() => onOpen(registration, period, r.type, cellFor(registration.id, r.type))}
                        />
                      // GSTR-4 against a regular filer, or GSTR-9 against a
                      // composition dealer: not a gap, just not a thing.
                      : <span className="text-[0.7rem] text-slate-200">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportButton({ onClick, disabled, exporting }: {
  onClick: () => void; disabled: boolean; exporting: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#CBD8E6] bg-white px-3 py-2 text-sm font-medium transition hover:bg-[#F4F7FB] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ color: NAVY }}
    >
      <Download size={15} /> {exporting ? 'Exporting…' : 'Export Excel'}
    </button>
  );
}

/**
 * One annual return.
 *
 * There is room here that the monthly grid does not have, so the cell says what
 * it means in words and carries the filing date underneath rather than
 * compressing both into four characters.
 */
function AnnualCell({ filing, due, onClick }: {
  filing: GstFiling | null; due: string | null; onClick: () => void;
}) {
  const status = filing?.status || EMPTY_STATUS;
  const meta = STATUS_META[status];
  const late = isOverdue(status, filing?.dueDate ?? due);
  const untouched = !filing;

  return (
    <button
      onClick={onClick}
      title={filing?.remarks || (untouched ? 'Not recorded yet — click to set' : meta.label)}
      className={`inline-flex min-w-[92px] flex-col items-center rounded-lg border px-2.5 py-1.5 transition-all hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#1b365d]/40 ${
        untouched
          ? 'border-dashed border-[#D8E0EA] bg-white text-slate-400 hover:border-[#1b365d] hover:text-[#1b365d]'
          : status === 'Not Applicable'
            ? 'border-dashed border-[#E7EDF4] bg-white text-slate-400'
            : meta.className
      } ${late ? 'ring-1 ring-[#DC2626]' : ''}`}
    >
      <span className="text-[0.68rem] font-semibold leading-tight">
        {untouched ? '+ Set' : status === 'Not Applicable' ? 'Not applicable' : meta.label}
      </span>
      {filing?.filedOn && (
        <span className="text-[0.6rem] font-medium leading-tight opacity-80">{formatDate(filing.filedOn)}</span>
      )}
      {late && !untouched && !filing?.filedOn && (
        <span className="text-[0.58rem] font-semibold leading-tight text-[#991B1B]">past due</span>
      )}
    </button>
  );
}
