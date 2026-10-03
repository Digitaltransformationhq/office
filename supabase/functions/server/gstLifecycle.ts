/** Keep history and one additional financial year after discontinuation. */
export function gstClientVisibleInYear(discontinuedYear: number | null | undefined, financialYear: string): boolean {
  return discontinuedYear == null || Number(financialYear.slice(0, 4)) <= discontinuedYear + 1;
}
