import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldCheck, Upload, X } from 'lucide-react';
import { gstAPI, type GstRegistration } from '../services/api';
import {
  parseGstWorkbookSheet,
  parseGstAnnualSheets,
  type ExcelCell,
  type GstExcelParseResult,
} from '../utils/gstExcelImport';

const NAVY = '#1b365d';

interface ImportResult {
  importId: string;
  registrationsUpdated: number;
  registrationsProtected: number;
  filingsUpdated: number;
  filingsProtected: number;
  unmatched: Array<{ gstin: string; rowNumber: number | null }>;
  skippedFilings: number;
  cutoffDate: string;
  cutoffAt: string;
}

interface RollbackResult {
  importId: string;
  clientsRestored: number;
  registrationsRestored: number;
  filingsRestored: number;
  filingsRemoved: number;
}

interface ImportSettings {
  cutoffDate: string;
  cutoffAt: string;
  createdByName?: string | null;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function GSTExcelImportModal({ financialYear, registrations, currentUser, onClose, onImported }: {
  financialYear: string;
  registrations: GstRegistration[];
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<Array<{ sheet: string; data: ExcelCell[][] }>>([]);
  const [sheetName, setSheetName] = useState('');
  const [preview, setPreview] = useState<GstExcelParseResult | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settings, setSettings] = useState<ImportSettings | null>(null);
  const [preserveThrough, setPreserveThrough] = useState(localToday);

  useEffect(() => {
    let live = true;
    gstAPI.getImportSettings()
      .then(response => {
        if (!live) return;
        if (!response.success) throw new Error(response.error || 'Could not load the Excel sync boundary.');
        const saved = response.data as ImportSettings | null;
        setSettings(saved);
        if (saved?.cutoffDate) setPreserveThrough(saved.cutoffDate);
      })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : 'Could not load the Excel sync boundary.'); })
      .finally(() => { if (live) setSettingsLoading(false); });
    return () => { live = false; };
  }, []);

  const known = useMemo(
    () => new Set(registrations.map(r => r.gstin.trim().toUpperCase())),
    [registrations],
  );
  const workbookGstins = useMemo(() => {
    const map = new Map<string, { gstin: string; rowNumber: number }>();
    for (const row of preview?.registrations || []) map.set(row.gstin, row);
    for (const row of preview?.filings || []) if (!map.has(row.gstin)) map.set(row.gstin, row);
    return [...map.values()];
  }, [preview]);
  const matched = workbookGstins.filter(r => known.has(r.gstin)).length;
  const unmatchedBeforeImport = workbookGstins.filter(r => !known.has(r.gstin));
  const monthlySheets = useMemo(() => sheets.filter(sheet => sheet.data.slice(0, 12).some(row =>
    String(row[5] ?? '').trim().toUpperCase() === 'GSTIN' &&
    String(row[13] ?? '').trim().toUpperCase().includes('GSTR 1'))), [sheets]);

  const selectSheet = (name: string, available = sheets) => {
    setSheetName(name);
    setResult(null);
    setError('');
    const sheet = available.find(s => s.sheet === name);
    if (!sheet) return;
    try {
      const monthly = parseGstWorkbookSheet(sheet.data, financialYear);
      const annual = parseGstAnnualSheets(available, financialYear);
      setPreview({
        ...monthly,
        filings: [...monthly.filings, ...annual.filings],
        warnings: [...monthly.warnings, ...annual.warnings],
      });
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Could not read this worksheet.');
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setReading(true);
    setError('');
    setResult(null);
    setPreview(null);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Choose an Excel .xlsx workbook.');
      }
      const { default: readWorkbook } = await import('read-excel-file/browser');
      const workbook = await readWorkbook(file);
      const available = workbook.map(sheet => ({ sheet: sheet.sheet, data: sheet.data as ExcelCell[][] }));
      if (!available.length) throw new Error('This workbook contains no worksheets.');
      setSheets(available);
      const candidates = available.filter(sheet => sheet.data.slice(0, 12).some(row =>
        String(row[5] ?? '').trim().toUpperCase() === 'GSTIN' &&
        String(row[13] ?? '').trim().toUpperCase().includes('GSTR 1')));
      if (!candidates.length) throw new Error('No monthly GST report worksheet was found in this workbook.');
      const preferred = candidates.find(s => s.sheet.trim() === financialYear)?.sheet
        || candidates.find(s => s.sheet.includes(financialYear))?.sheet
        || candidates[0].sheet;
      selectSheet(preferred, available);
    } catch (e) {
      setSheets([]);
      setSheetName('');
      setError(e instanceof Error ? e.message : 'Could not read this workbook.');
    } finally {
      setReading(false);
    }
  };

  const importData = async () => {
    if (!preview || importing) return;
    setImporting(true);
    setError('');
    try {
      const response = await gstAPI.importWorkbook({
        financialYear,
        registrations: preview.registrations,
        filings: preview.filings,
        preserveThrough,
        updatedById: currentUser?.id,
        updatedByName: currentUser?.name,
      });
      if (!response.success) throw new Error(response.error || 'The workbook could not be imported.');
      const imported = response.data as ImportResult;
      setResult(imported);
      setSettings({ cutoffDate: imported.cutoffDate, cutoffAt: imported.cutoffAt });
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The workbook could not be imported.');
    } finally {
      setImporting(false);
    }
  };

  const rollbackImport = async () => {
    if (!result || rollingBack) return;
    if (!window.confirm('Restore the exact GST data from before this Excel import?')) return;
    setRollingBack(true);
    setError('');
    try {
      const response = await gstAPI.rollbackWorkbookImport(result.importId, currentUser);
      if (!response.success) throw new Error(response.error || 'The import could not be rolled back.');
      setRollbackResult(response.data as RollbackResult);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The import could not be rolled back.');
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Update GST records from Excel</h2>
            <p className="mt-1 text-xs text-muted-foreground">F.Y. {financialYear} · matches registrations by GSTIN</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted-foreground hover:bg-[#F4F6F9]">
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={e => chooseFile(e.target.files?.[0])}
          />

          <div className="mb-4 rounded-xl border border-[#CFE0EF] bg-[#F3F8FC] px-4 py-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#1b5d3b]" size={19} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: NAVY }}>Protect existing system work</p>
                {settingsLoading ? (
                  <p className="mt-1 text-xs text-muted-foreground">Loading the saved protection date…</p>
                ) : settings ? (
                  <p className="mt-1 text-xs leading-5 text-[#38516F]">
                    Records maintained in the system through <strong>{settings.cutoffDate}</strong> are locked against Excel changes. This date was established by the first upload and is reused automatically.
                  </p>
                ) : (
                  <label className="mt-2 block text-xs text-[#38516F]">
                    Preserve system records through this date
                    <input
                      type="date"
                      value={preserveThrough}
                      max={localToday()}
                      onChange={e => setPreserveThrough(e.target.value)}
                      className="mt-1.5 block w-full max-w-[220px] rounded-lg border border-[#C8D5E5] bg-white px-3 py-2 text-sm outline-none focus:border-[#1b365d]"
                    />
                    <span className="mt-1.5 block">This becomes permanent on the first successful sync. Excel will update only missing records and records created after this boundary.</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={reading || importing}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#C8D5E5] bg-[#F8FAFC] px-5 py-7 text-sm font-medium transition hover:border-[#1b365d] hover:bg-[#F3F7FB] disabled:opacity-60"
            style={{ color: NAVY }}
          >
            <FileSpreadsheet size={22} />
            {reading ? 'Reading workbook…' : fileName || 'Choose GST Excel workbook'}
          </button>

          {monthlySheets.length > 1 && (
            <label className="mt-4 block text-sm font-medium" style={{ color: NAVY }}>
              Worksheet
              <select
                value={sheetName}
                onChange={e => selectSheet(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E7EDF4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b365d]"
              >
                {monthlySheets.map(sheet => <option key={sheet.sheet} value={sheet.sheet}>{sheet.sheet}</option>)}
              </select>
            </label>
          )}

          {error && (
            <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 shrink-0" size={16} />
              <span>{error}</span>
            </div>
          )}

          {preview && !result && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Excel rows" value={preview.sourceRows} />
                <Metric label="GSTIN matched" value={matched} />
                <Metric label="Returns to update" value={preview.filings.length} />
                <Metric label="GSTIN unmatched" value={unmatchedBeforeImport.length} warning={unmatchedBeforeImport.length > 0} />
              </div>

              <div className="rounded-xl border border-[#D8E5F2] bg-[#F4F8FC] px-4 py-3 text-xs leading-5 text-[#38516F]">
                Eligible records are updated from filled Excel cells, including the annual-return tabs when present. Protected history and blank filing cells are left unchanged, and no records are deleted.
              </div>

              {(unmatchedBeforeImport.length > 0 || preview.warnings.length > 0) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-900">Review before importing</p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-amber-800">
                    {unmatchedBeforeImport.slice(0, 12).map(row => (
                      <li key={`${row.gstin}-${row.rowNumber}`}>Row {row.rowNumber}: GSTIN {row.gstin} is not in the system.</li>
                    ))}
                    {preview.warnings.slice(0, 12).map((warning, i) => <li key={`${warning}-${i}`}>{warning}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && !rollbackResult && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
              <div className="flex items-center gap-2 font-semibold text-green-800">
                <CheckCircle2 size={18} /> Import completed
              </div>
              <p className="mt-2 text-sm text-green-800">
                Updated {result.registrationsUpdated} registrations and {result.filingsUpdated} filing records.
              </p>
              <p className="mt-1 text-xs text-green-800">
                Preserved {result.registrationsProtected} existing registrations and {result.filingsProtected} existing filing records through {result.cutoffDate}.
              </p>
              {result.unmatched.length > 0 && (
                <p className="mt-1 text-xs text-amber-800">
                  {result.unmatched.length} GSTIN{result.unmatched.length === 1 ? '' : 's'} could not be matched and were skipped.
                </p>
              )}
              <div className="mt-3 border-t border-green-200 pt-3">
                <p className="text-xs text-green-800">A complete pre-import backup was saved as {result.importId}.</p>
                <button
                  type="button"
                  onClick={rollbackImport}
                  disabled={rollingBack}
                  className="mt-2 rounded-full border border-green-700 px-3 py-1.5 text-xs font-semibold text-green-800 disabled:opacity-50"
                >
                  {rollingBack ? 'Restoring…' : 'Undo this import'}
                </button>
              </div>
            </div>
          )}

          {rollbackResult && (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-900">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={18} /> Previous GST data restored
              </div>
              <p className="mt-2 text-sm">
                Restored {rollbackResult.registrationsRestored} registrations and {rollbackResult.filingsRestored} filing records; removed {rollbackResult.filingsRemoved} records created by the import.{rollbackResult.clientsRestored ? ` Restored ${rollbackResult.clientsRestored} affected client record${rollbackResult.clientsRestored === 1 ? '' : 's'}.` : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E7EDF4] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-full border border-[#D8E0EA] px-5 py-2.5 text-sm font-medium" style={{ color: NAVY }}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={importData}
              disabled={!preview || importing || reading || settingsLoading || !preserveThrough || matched === 0}
              className="flex items-center gap-2 rounded-full bg-[#1b365d] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={15} /> {importing ? 'Updating…' : 'Update records'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${warning ? 'border-amber-200 bg-amber-50' : 'border-[#E7EDF4] bg-white'}`}>
      <p className="text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${warning ? 'text-amber-800' : ''}`} style={warning ? undefined : { color: NAVY }}>{value}</p>
    </div>
  );
}
