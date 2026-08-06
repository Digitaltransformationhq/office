import React, { useMemo, useState } from 'react';
import type { GstFiling, GstRegistration } from '../services/api';
import { Search } from 'lucide-react';
import {
  ANNUAL_RETURNS, STATUS_META, EMPTY_STATUS, annualDueDate, annualPeriod,
  annualReturnsFor, dueNote, formatDate, isOverdue, type AnnualReturnType, type GstPeriod,
} from '../utils/gst';

const NAVY = '#1b365d';

interface GSTAnnualViewProps {
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
export function GSTAnnualView({ registrations, filings, financialYear, onOpen }: GSTAnnualViewProps) {
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
    const implied = annualReturnsFor(r.filingFrequency);
    const recordedHere = ANNUAL_RETURNS
      .map(a => a.type)
      .filter(t => cellFor(r.id, t) && !implied.includes(t));
    return [...implied, ...recordedHere];
  };

  const candidates = useMemo(
    () => registrations
      .filter(r => r.status !== 'Cancelled')
      .map(r => ({ registration: r, types: typesFor(r) }))
      .filter(row => row.types.length > 0)
      .sort((a, b) => (a.registration.clientName || '').localeCompare(b.registration.clientName || '')),
    [registrations, filingMap],
  );

  const recorded = useMemo(
    () => candidates.filter(row => row.types.some(t => cellFor(row.registration.id, t))),
    [candidates, filingMap],
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
    const pool = (showAll || q) ? candidates : recorded;
    if (!q) return pool;
    return pool.filter(({ registration: r }) =>
      [r.clientName, r.gstin, r.codeNo, r.pan, r.tradeName]
        .some(v => (v || '').toLowerCase().includes(q)));
  }, [candidates, recorded, search, showAll]);

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

  const controls = (
    <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:w-[280px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search any client to add a return…"
          className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7EDF4] px-3 py-2 text-sm">
        <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-[#1b365d]" />
        <span style={{ color: NAVY }}>
          All registrations
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({recorded.length} recorded of {candidates.length})
          </span>
        </span>
      </label>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div>
        {controls}
        <div className="px-5 py-16 text-center">
          {search.trim() ? (
            <p className="text-sm text-muted-foreground">No registration matches “{search.trim()}”.</p>
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
        {ANNUAL_RETURNS.map(r => {
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
            <p className="truncate text-[0.85rem] font-medium" style={{ color: NAVY }}>
              {registration.clientName}
            </p>
            <p className="mt-0.5 truncate font-mono text-[0.62rem] text-muted-foreground/70">
              {registration.codeNo ? `${registration.codeNo} · ` : ''}{registration.gstin}
            </p>
            <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">
              {registration.responsiblePersonName || 'Unassigned'}
            </p>
            <div className="mt-2.5 space-y-1.5 border-t border-[#F1F4F8] pt-2.5">
              {ANNUAL_RETURNS.filter(r => types.includes(r.type)).map(r => (
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
              {ANNUAL_RETURNS.map(r => (
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
                  <p className="truncate text-[0.84rem] font-medium" style={{ color: NAVY }} title={registration.clientName}>
                    {registration.clientName}
                  </p>
                  <p className="truncate font-mono text-[0.62rem] text-muted-foreground/70">
                    {registration.codeNo ? `${registration.codeNo} · ` : ''}{registration.gstin}
                  </p>
                </td>
                <td className="max-w-[110px] truncate px-2 py-2.5 text-[0.72rem] text-muted-foreground">
                  {registration.responsiblePersonName || '—'}
                </td>
                {ANNUAL_RETURNS.map(r => (
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
