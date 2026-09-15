/**
 * The client master as an Excel workbook.
 *
 * A real .xlsx rather than the CSV the other reports write, because a client
 * list is mostly identifiers: Excel opens a CSV and turns 9824662775 into
 * 9.82E+09 and drops the leading zero of a file number, and the sheet then gets
 * forwarded with the damage in it. Every identifier here is written as text.
 *
 * The library is loaded on click, not with the page — nobody who never exports
 * should download the code that does it.
 */

type Client = Record<string, any>;

const text = (v: unknown) => ({ type: String, value: v == null ? '' : String(v).trim() });
const money = (v: unknown) => ({ type: Number, value: Number(v) || 0, format: '#,##0' });

const COLUMNS: { header: string; width: number; cell: (c: Client) => any }[] = [
  { header: 'Client Name', width: 42, cell: c => text(c.name) },
  { header: 'Firm Name', width: 32, cell: c => text(c.firmName) },
  { header: 'Client Type', width: 12, cell: c => text(c.clientType || 'Filing') },
  { header: 'Status', width: 10, cell: c => text(c.status || 'Active') },
  { header: 'PAN', width: 14, cell: c => text(c.pan) },
  { header: 'GSTIN', width: 18, cell: c => text(c.gstin || c.gst) },
  { header: 'File Number', width: 12, cell: c => text(c.fileNumber) },
  { header: 'Industry', width: 20, cell: c => text(c.industry) },
  { header: 'Contact', width: 16, cell: c => text(c.contact) },
  { header: 'Mobile Number', width: 16, cell: c => text(c.mobileNumber) },
  { header: 'Email', width: 30, cell: c => text(c.email) },
  { header: 'Email ID', width: 30, cell: c => text(c.emailId) },
  { header: 'ITR Fees', width: 11, cell: c => money(c.itrFees) },
  { header: 'GST Fees', width: 11, cell: c => money(c.gstFees) },
  { header: 'GST Annual Return Fees', width: 14, cell: c => money(c.gstAnnualReturnFees) },
  { header: 'Accounting Fees', width: 12, cell: c => money(c.accountingFees) },
  { header: 'Audit Fees', width: 11, cell: c => money(c.auditFees) },
  { header: 'Company Act Fees', width: 12, cell: c => money(c.companyActFees) },
  { header: 'TDS Fees', width: 11, cell: c => money(c.tdsFees) },
  { header: 'PF / ESIC / PT / Labour Fees', width: 14, cell: c => money(c.pfEsicPtLabourFees) },
  { header: 'Consultancy Fees', width: 12, cell: c => money(c.consultancyFees) },
  { header: 'Total Fees', width: 12, cell: c => money(c.totalFees) },
];

export async function exportClientsToExcel(clients: Client[], fileLabel: string) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const header = COLUMNS.map(col => ({ value: col.header, fontWeight: 'bold' as const, type: String }));
  const rows = clients.map(c => COLUMNS.map(col => col.cell(c)));

  const day = new Date().toISOString().slice(0, 10);
  await writeExcelFile([header, ...rows] as any, {
    sheet: 'Clients',
    columns: COLUMNS.map(col => ({ width: col.width })),
    stickyRowsCount: 1,
  } as any).toFile(`clients-${fileLabel}-${day}.xlsx`);
}
