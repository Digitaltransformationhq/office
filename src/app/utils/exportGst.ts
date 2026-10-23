import type { GstFiling, GstRegistration } from '../services/api';
import { annualDueDate, today, type AnnualReturnType, type GstPeriod } from './gst';

type MonthlyReturnType = 'GSTR-1' | 'GSTR-3B';

const headerCell = (value: string) => ({
  value,
  type: String,
  fontWeight: 'bold' as const,
  backgroundColor: '#1b365d',
  textColor: '#ffffff',
  wrap: true,
});

const textCell = (value: unknown) => ({
  value: value == null ? '' : String(value).trim(),
  type: String,
});

const dateCell = (value: string | null | undefined) => {
  if (!value) return textCell('');
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? textCell(value)
    : { value: date, type: Date, format: 'dd-mmm-yy' };
};

const safePart = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const exportDay = () => today();

const BASE_COLUMNS = [
  { header: 'Client', width: 36 },
  { header: 'Trade Name', width: 28 },
  { header: 'Code', width: 12 },
  { header: 'GSTIN', width: 18 },
  { header: 'PAN', width: 14 },
  { header: 'Filing Frequency', width: 16 },
  { header: 'Responsible Staff', width: 22 },
];

const baseCells = (registration: GstRegistration) => [
  textCell(registration.clientName),
  textCell(registration.tradeName),
  textCell(registration.codeNo),
  textCell(registration.gstin),
  textCell(registration.pan),
  textCell(registration.filingFrequency),
  textCell(registration.responsiblePersonName || 'Unassigned'),
];

export async function exportGstMonthlyToExcel({
  registrations,
  filings,
  months,
  financialYear,
}: {
  registrations: GstRegistration[];
  filings: GstFiling[];
  months: GstPeriod[];
  financialYear: string;
}) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const filingMap = new Map(filings.map(f => [`${f.registrationId}|${f.returnType}|${f.periodKey}`, f]));
  const returnTypes: MonthlyReturnType[] = ['GSTR-1', 'GSTR-3B'];

  const detailColumns = months.flatMap(month => returnTypes.flatMap(returnType => [
    { header: `${month.shortLabel} ${returnType} Status`, width: 18 },
    { header: `${month.shortLabel} ${returnType} Filed On`, width: 14 },
  ]));
  const columns = [...BASE_COLUMNS, ...detailColumns];
  const rows = registrations.map(registration => [
    ...baseCells(registration),
    ...months.flatMap(month => returnTypes.flatMap(returnType => {
      const filing = filingMap.get(`${registration.id}|${returnType}|${month.key}`);
      const owed = month.end <= exportDay()
        && (registration.filingFrequency === 'Monthly' || Boolean(filing));
      if (!owed) return [textCell(''), textCell('')];
      return [textCell(filing?.status || 'Pending'), dateCell(filing?.filedOn)];
    })),
  ]);

  await writeExcelFile([
    columns.map(column => headerCell(column.header)),
    ...rows,
  ] as any, {
    sheet: 'Monthly Returns',
    columns: columns.map(column => ({ width: column.width })),
    stickyRowsCount: 1,
  } as any).toFile(`gst-monthly-${safePart(financialYear)}-${exportDay()}.xlsx`);
}

export async function exportGstAnnualToExcel({
  rows: sourceRows,
  filings,
  returnTypes,
  financialYear,
  compositionOnly,
}: {
  rows: { registration: GstRegistration; types: AnnualReturnType[] }[];
  filings: GstFiling[];
  returnTypes: AnnualReturnType[];
  financialYear: string;
  compositionOnly: boolean;
}) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const filingMap = new Map(filings
    .filter(f => f.periodKey === financialYear)
    .map(f => [`${f.registrationId}|${f.returnType}`, f]));

  const detailColumns = returnTypes.flatMap(returnType => [
    { header: `${returnType} Status`, width: 18 },
    { header: `${returnType} Due Date`, width: 14 },
    { header: `${returnType} Filed On`, width: 14 },
    { header: `${returnType} ARN`, width: 24 },
    { header: `${returnType} Remarks`, width: 34 },
  ]);
  const columns = [...BASE_COLUMNS, ...detailColumns];
  const rows = sourceRows.map(({ registration, types }) => [
    ...baseCells(registration),
    ...returnTypes.flatMap(returnType => {
      if (!types.includes(returnType)) {
        return [textCell(''), textCell(''), textCell(''), textCell(''), textCell('')];
      }
      const filing = filingMap.get(`${registration.id}|${returnType}`);
      return [
        textCell(filing?.status || 'Pending'),
        dateCell(filing?.dueDate ?? annualDueDate(returnType, financialYear)),
        dateCell(filing?.filedOn),
        textCell(filing?.arn),
        textCell(filing?.remarks),
      ];
    }),
  ]);

  const sheet = compositionOnly ? 'Composition' : 'Annual Returns';
  const filePart = compositionOnly ? 'composition' : 'annual';
  await writeExcelFile([
    columns.map(column => headerCell(column.header)),
    ...rows,
  ] as any, {
    sheet,
    columns: columns.map(column => ({ width: column.width })),
    stickyRowsCount: 1,
  } as any).toFile(`gst-${filePart}-${safePart(financialYear)}-${exportDay()}.xlsx`);
}
