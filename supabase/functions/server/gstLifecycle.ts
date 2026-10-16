/** Keep history and one additional financial year after discontinuation. */
export function gstClientVisibleInYear(discontinuedYear: number | null | undefined, financialYear: string): boolean {
  return discontinuedYear == null || Number(financialYear.slice(0, 4)) <= discontinuedYear + 1;
}

/** The twelve sortable monthly periods in an Indian financial year. */
export function gstFinancialYearMonths(financialYear: string) {
  const startYear = Number(financialYear.slice(0, 4));
  const names = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];
  return names.map((name, index) => {
    const month = index < 9 ? index + 4 : index - 8;
    const year = index < 9 ? startYear : startYear + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { key, label: `${name}'${String(year).slice(-2)}` };
  });
}

/**
 * Fill empty monthly cells after an explicit Discontinued status.
 *
 * Only Discontinued carries forward. The first later explicit status (Pending,
 * Filed, etc.) becomes the new state and stops the carry-forward from that
 * month onward. Nothing is written to the database for the generated cells;
 * editing one creates the normal filing row and therefore becomes the explicit
 * status that controls following months.
 */
export function carryForwardDiscontinuedFilings(
  financialYear: string,
  registrationIds: string[],
  filings: any[],
) {
  const months = gstFinancialYearMonths(financialYear);
  const firstKey = months[0]?.key;
  const lastKey = months[months.length - 1]?.key;
  const monthly = filings.filter(f =>
    (f.return_type === 'GSTR-1' || f.return_type === 'GSTR-3B') &&
    /^\d{4}-\d{2}$/.test(f.period_key || '') && f.period_key <= lastKey);
  const target = filings.filter(f => f.financial_year === financialYear);
  const actualTargetKeys = new Set(target.map(f => `${f.registration_id}|${f.return_type}|${f.period_key}`));
  const generated: any[] = [];

  for (const registrationId of registrationIds) {
    for (const returnType of ['GSTR-1', 'GSTR-3B']) {
      const history = monthly
        .filter(f => f.registration_id === registrationId && f.return_type === returnType)
        .sort((a, b) => a.period_key.localeCompare(b.period_key));
      let cursor = 0;
      let latest: any = null;

      // Establish the state immediately before this financial year.
      while (cursor < history.length && history[cursor].period_key < firstKey) latest = history[cursor++];

      for (const month of months) {
        // An explicit row in this month always wins and becomes the state used
        // for subsequent empty months, including a deliberate reactivation.
        while (cursor < history.length && history[cursor].period_key <= month.key) latest = history[cursor++];
        const key = `${registrationId}|${returnType}|${month.key}`;
        if (!actualTargetKeys.has(key) && latest?.status === 'Discontinued') {
          generated.push({
            id: `gstcarry:${registrationId}:${returnType}:${month.key}`,
            registration_id: registrationId,
            return_type: returnType,
            financial_year: financialYear,
            period_key: month.key,
            period_label: month.label,
            period_start: null,
            period_end: null,
            due_date: null,
            status: 'Discontinued',
            data_received_on: null,
            filed_on: null,
            arn: null,
            updated_by_id: latest.updated_by_id || null,
            updated_by_name: latest.updated_by_name || null,
            remarks: null,
            updated_at: latest.updated_at || null,
            carried_forward: true,
          });
        }
      }
    }
  }

  return [...target, ...generated];
}
