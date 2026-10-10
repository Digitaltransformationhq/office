import type { GstFilingStatus } from '../services/api';
import { annualDueDate, annualPeriod, dueDateFor, fyMonths, fyStartYear } from './gst';

export type ExcelCell = string | number | boolean | Date | null | undefined;

export interface GstExcelRegistration {
  gstin: string;
  rowNumber: number;
  codeNo?: string;
  responsiblePersonName?: string;
  filingFrequency?: string;
  billingFrequency?: string;
  portalUserId?: string;
  portalPassword?: string;
  contactPerson?: string;
  mobileNumber?: string;
  emailId?: string;
  cashLedger?: number;
  creditLedger?: number;
  reclaimedAmount?: number;
}

export interface GstExcelFiling {
  gstin: string;
  rowNumber: number;
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-4' | 'GSTR-9' | 'GSTR-9C';
  financialYear: string;
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  status: GstFilingStatus;
  filedOn?: string | null;
  remarks?: string | null;
}

export interface GstExcelParseResult {
  registrations: GstExcelRegistration[];
  filings: GstExcelFiling[];
  warnings: string[];
  sourceRows: number;
}

const COL = {
  codeNo: 1,
  responsible: 2,
  gstin: 5,
  portalUserId: 6,
  portalPassword: 7,
  mobile: 8,
  email: 9,
  contactPerson: 10,
  billing: 11,
  frequency: 12,
} as const;

const FIRST_MONTH_COL = 13;
const CASH_LEDGER_COL = 37;
const CREDIT_LEDGER_COL = 38;
const RECLAIMED_COL = 39;

const FREQUENCY: Record<string, string> = {
  M: 'Monthly', MONTHLY: 'Monthly',
  Q: 'Quarterly', QUARTERLY: 'Quarterly',
  C: 'Composition', COMPOSITION: 'Composition',
  A: 'Annual', ANNUAL: 'Annual',
  I: 'Irregular', IRREGULAR: 'Irregular',
  NA: 'Not Applicable', 'N/A': 'Not Applicable', 'NOT APPLICABLE': 'Not Applicable',
};

const BILLING: Record<string, string> = {
  ANNUAL: 'Annual', QUARTER: 'Quarter', QUARTERLY: 'Quarter',
  'HALF YEAR': 'Half Year', 'HALF YEARLY': 'Half Year',
  MONTHLY: 'Monthly', NA: 'NA', 'N/A': 'NA',
};

const MARKERS: Record<string, GstFilingStatus> = {
  'DATA RECEIVED': 'Data Received',
  'SEND MSG': 'Message Sent',
  'MESSAGE SENT': 'Message Sent',
  'SEND CHALLAN': 'Challan Sent',
  'CHALLAN SENT': 'Challan Sent',
  OTP: 'OTP Awaited',
  'OTP AWAITED': 'OTP Awaited',
  NIL: 'Nil',
  'NIL RETURN': 'Nil',
  'NOT PROVIED DATA': 'Data Not Provided',
  'NOT PROVIDED DATA': 'Data Not Provided',
  'DATA NOT PROVIDED': 'Data Not Provided',
  'NOT PROVIDED': 'Data Not Provided',
  '-': 'Not Applicable',
  '—': 'Not Applicable',
  NA: 'Not Applicable',
  'N/A': 'Not Applicable',
  'NOT APPLICABLE': 'Not Applicable',
  DISCONTINUED: 'Discontinued',
};

const text = (value: ExcelCell) => String(value ?? '').trim();
const normalized = (value: ExcelCell) => text(value).replace(/\s+/g, ' ').toUpperCase();
const optionalText = (value: ExcelCell) => text(value) || undefined;

const optionalNumber = (value: ExcelCell) => {
  const raw = text(value).replace(/,/g, '');
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : undefined;
};

const localIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Dates may arrive as real Excel dates or as text typed into an unformatted cell. */
function filingDate(value: ExcelCell): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localIso(value);
  const raw = text(value);
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(raw);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(raw);
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

const headerRowIndex = (rows: ExcelCell[][]) => {
  const found = rows.slice(0, 12).findIndex(row =>
    row.some(cell => normalized(cell) === 'GSTIN') &&
    row.some(cell => ['PAN', 'PAN NO', 'PAN NO.'].includes(normalized(cell))));
  return found;
};

/**
 * Parse the office's existing "GST Report <FY>.xlsx" layout.
 *
 * Blank filing cells are deliberately omitted: an upload updates what the sheet
 * states and never erases work already recorded in the application.
 */
export function parseGstWorkbookSheet(rows: ExcelCell[][], financialYear: string): GstExcelParseResult {
  const warnings: string[] = [];
  const header = headerRowIndex(rows);
  if (header === -1) {
    throw new Error('Could not find the GST report header row. The sheet must contain PAN and GSTIN columns.');
  }
  if (normalized(rows[header]?.[COL.gstin]) !== 'GSTIN' || !normalized(rows[header]?.[FIRST_MONTH_COL]).includes('GSTR 1')) {
    throw new Error('This is not the monthly GST report worksheet. Choose the financial-year sheet with the April–March GSTR-1 and GSTR-3B columns.');
  }

  const periods = fyMonths(financialYear);
  const registrations = new Map<string, GstExcelRegistration>();
  const filings = new Map<string, GstExcelFiling>();
  let sourceRows = 0;

  rows.slice(header + 1).forEach((row, offset) => {
    const rowNumber = header + offset + 2;
    if (!row.some(cell => text(cell))) return;
    const gstin = normalized(row[COL.gstin]).replace(/\s/g, '');
    if (!gstin) {
      warnings.push(`Row ${rowNumber}: skipped because GSTIN is blank.`);
      return;
    }
    sourceRows++;

    const frequencyRaw = normalized(row[COL.frequency]);
    const filingFrequency = FREQUENCY[frequencyRaw] || (frequencyRaw ? undefined : 'Monthly');
    if (frequencyRaw && !filingFrequency) {
      warnings.push(`Row ${rowNumber} (${gstin}): unknown filing frequency "${text(row[COL.frequency])}"; existing frequency will be kept.`);
    }

    const billingRaw = normalized(row[COL.billing]);
    const billingFrequency = BILLING[billingRaw];
    if (billingRaw && !billingFrequency) {
      warnings.push(`Row ${rowNumber} (${gstin}): unknown billing frequency "${text(row[COL.billing])}"; existing value will be kept.`);
    }

    const registration: GstExcelRegistration = {
      gstin,
      rowNumber,
      codeNo: optionalText(row[COL.codeNo]),
      responsiblePersonName: optionalText(row[COL.responsible]),
      filingFrequency,
      billingFrequency,
      portalUserId: optionalText(row[COL.portalUserId]),
      portalPassword: optionalText(row[COL.portalPassword]),
      contactPerson: optionalText(row[COL.contactPerson]),
      mobileNumber: optionalText(row[COL.mobile]),
      emailId: optionalText(row[COL.email]),
      cashLedger: optionalNumber(row[CASH_LEDGER_COL]),
      creditLedger: optionalNumber(row[CREDIT_LEDGER_COL]),
      reclaimedAmount: optionalNumber(row[RECLAIMED_COL]),
    };

    if (registrations.has(gstin)) warnings.push(`Row ${rowNumber}: duplicate GSTIN ${gstin}; the later row will be used.`);
    registrations.set(gstin, registration);

    periods.forEach((period, monthIndex) => {
      (['GSTR-1', 'GSTR-3B'] as const).forEach((returnType, typeIndex) => {
        const raw = row[FIRST_MONTH_COL + monthIndex * 2 + typeIndex];
        if (!text(raw)) return;

        const date = filingDate(raw);
        const marker = MARKERS[normalized(raw)];
        const status: GstFilingStatus = date ? 'Filed' : marker || 'Pending';
        const key = `${gstin}|${returnType}|${period.key}`;
        filings.set(key, {
          gstin,
          rowNumber,
          returnType,
          financialYear,
          periodKey: period.key,
          periodLabel: period.label,
          periodStart: period.start,
          periodEnd: period.end,
          dueDate: dueDateFor(filingFrequency || 'Irregular', period, returnType),
          status,
          filedOn: date,
          remarks: !date && !marker ? text(raw) : null,
        });
      });
    });
  });

  if (!sourceRows) throw new Error('No GSTIN rows were found below the header.');
  return { registrations: [...registrations.values()], filings: [...filings.values()], warnings, sourceRows };
}

/** Annual-return tabs carried in the same workbook as the monthly register. */
export function parseGstAnnualSheets(
  sheets: Array<{ sheet: string; data: ExcelCell[][] }>,
  workbookFinancialYear: string,
): { filings: GstExcelFiling[]; warnings: string[] } {
  const reportingStart = fyStartYear(workbookFinancialYear) - 1;
  const reportingYear = `${reportingStart}-${String((reportingStart + 1) % 100).padStart(2, '0')}`;
  const period = annualPeriod(reportingYear);
  const filings: GstExcelFiling[] = [];
  const warnings: string[] = [];

  const regular = sheets.find(s => normalized(s.sheet) === 'GSTR-9 & 9C');
  if (regular) {
    const header = regular.data.slice(0, 12).findIndex(row =>
      row.some(cell => normalized(cell) === 'GSTIN') && row.some(cell => normalized(cell) === 'GSTR-9'));
    if (header === -1) warnings.push('Annual sheet "GSTR-9 & 9C" was found but its header could not be read.');
    else regular.data.slice(header + 1).forEach((row, offset) => {
      const rowNumber = header + offset + 2;
      const gstin = normalized(row[3]).replace(/\s/g, '');
      if (!gstin) return;
      ([['GSTR-9', 6, 9], ['GSTR-9C', 7, 10]] as const).forEach(([returnType, appliesCol, dateCol]) => {
        const applies = normalized(row[appliesCol]);
        const date = filingDate(row[dateCol]);
        if (!applies && !date) return;
        const status: GstFilingStatus = date ? 'Filed' : applies === 'NO' ? 'Not Applicable' : 'Pending';
        filings.push({
          gstin, rowNumber, returnType, financialYear: reportingYear,
          periodKey: period.key, periodLabel: period.label,
          periodStart: period.start, periodEnd: period.end,
          dueDate: annualDueDate(returnType, reportingYear), status, filedOn: date,
          remarks: applies && !['YES', 'NO'].includes(applies) ? text(row[appliesCol]) : null,
        });
      });
    });
  }

  const composition = sheets.find(s => normalized(s.sheet) === 'ANNUAL RETURN COMPOSITION');
  if (composition) {
    const header = composition.data.slice(0, 12).findIndex(row =>
      row.some(cell => normalized(cell) === 'GSTIN') && row.some(cell => normalized(cell) === 'GSTR-4'));
    if (header === -1) warnings.push('Annual sheet "Annual Return Composition" was found but its header could not be read.');
    else composition.data.slice(header + 1).forEach((row, offset) => {
      const rowNumber = header + offset + 2;
      const gstin = normalized(row[3]).replace(/\s/g, '');
      const raw = row[5];
      if (!gstin || !text(raw)) return;
      const date = filingDate(raw);
      const marker = normalized(raw);
      const status: GstFilingStatus = date ? 'Filed' : marker === 'NO' ? 'Not Applicable' : 'Pending';
      filings.push({
        gstin, rowNumber, returnType: 'GSTR-4', financialYear: reportingYear,
        periodKey: period.key, periodLabel: period.label,
        periodStart: period.start, periodEnd: period.end,
        dueDate: annualDueDate('GSTR-4', reportingYear), status, filedOn: date,
        remarks: !date && !['YES', 'NO'].includes(marker) ? text(raw) : null,
      });
    });
  }

  return { filings, warnings };
}
