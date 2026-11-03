import type { DocumentMovement } from '../services/api';
import { today } from './gst';

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

const indiaDateKey = (value: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));

const indiaTime = (value: string) => new Date(value).toLocaleTimeString('en-IN', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
});

// The date is written as a real Excel date (IST calendar day) so the sheet can
// be sorted and filtered by it; the time stays text so Excel never shifts it.
const dateCell = (value: string) => ({
  value: new Date(`${indiaDateKey(value)}T00:00:00`),
  type: Date,
  format: 'dd-mmm-yy',
});

const COLUMNS = [
  { header: 'Date', width: 12 },
  { header: 'Time', width: 10 },
  { header: 'Client', width: 36 },
  { header: 'In / Out', width: 9 },
  { header: 'Document Type', width: 30 },
  { header: 'How Received / Sent', width: 24 },
  { header: 'Contents / Notes', width: 48 },
  { header: 'Recorded By', width: 22 },
];

export async function exportDocumentMovementsToExcel(movements: DocumentMovement[], label: string) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const rows = movements.map(item => [
    dateCell(item.recordedAt),
    textCell(indiaTime(item.recordedAt)),
    textCell(item.clientName),
    textCell(item.direction),
    textCell(item.documentType),
    textCell(item.transferMethod),
    textCell(item.details),
    textCell(item.recordedByName),
  ]);

  await writeExcelFile([
    COLUMNS.map(column => headerCell(column.header)),
    ...rows,
  ] as any, {
    sheet: 'Document Movements',
    columns: COLUMNS.map(column => ({ width: column.width })),
    stickyRowsCount: 1,
  } as any).toFile(`docs-manager-${label}-${today()}.xlsx`);
}
