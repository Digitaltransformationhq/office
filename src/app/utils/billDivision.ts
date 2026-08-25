/**
 * The firm's own slice of a bill, held under a reserved id rather than by a
 * person.
 *
 * The pool is a share of the invoice like any other — it just belongs to the
 * office instead of to somebody — so it travels in the same list. That keeps one
 * rule ("the shares total 100") instead of two, and means every screen that
 * already reads a division shows the pool without being taught about it.
 */
export const OFFICE_POOL_ID = 'office-pool';
export const OFFICE_POOL_NAME = 'Office pool';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * TWO SCALES, AND WHY
 *
 * The office pool is a percentage of the whole bill. Everybody else's is a
 * percentage of what is left after it — so on a bill with a 10% pool, two
 * partners splitting the rest evenly type 50 and 50, not 45 and 45.
 *
 * That is the only version anybody can enter without arithmetic. "Half of what
 * remains" is what the firm actually agrees; 45% is a number derived from it,
 * and asking someone to derive it at the moment of billing is asking them to
 * make a mistake.
 *
 * What gets STORED is the other scale: every share as a percentage of the whole
 * bill, totalling 100. That is what the rupees are worked out from, what the
 * server validates, and what every screen downstream reads — one figure per
 * person, in one scale, with no need to know a pool ever existed. The conversion
 * happens here, at the boundary, and nowhere else.
 */

/** The pool's cut of the whole bill. */
export const poolPercentOf = (value: Record<string, string>) =>
  Math.min(100, Math.max(0, parseFloat(value[OFFICE_POOL_ID] || '') || 0));

/** What the partners and directors have allotted between them, of the remainder. */
export const holderPercentOf = (value: Record<string, string>) =>
  round2(Object.entries(value)
    .filter(([id]) => id !== OFFICE_POOL_ID)
    .reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0));

/**
 * Ready to save: the remainder is fully allotted.
 *
 * A pool of 100 leaves nothing to divide, so nothing is what the rest must come
 * to — otherwise the form would demand a split of zero.
 */
export const divisionReady = (value: Record<string, string>) => {
  const pool = poolPercentOf(value);
  const rest = holderPercentOf(value);
  return pool === 100 ? rest === 0 : rest === 100;
};

/**
 * The division as it is stored: percentages of the whole bill, totalling 100.
 *
 * Converting rarely lands clean — a third of 90% is 29.999… — so the drift is
 * given to the largest holder at the end. Dropping it instead would store a
 * division totalling 99.99, which the server rejects outright and which would
 * read as a fault rather than a rounding.
 */
export const toBillShares = (value: Record<string, string>) => {
  const pool = poolPercentOf(value);
  const factor = (100 - pool) / 100;

  const out: Array<{ userId: string; percent: number }> = [];
  if (pool > 0) out.push({ userId: OFFICE_POOL_ID, percent: pool });

  for (const [id, raw] of Object.entries(value)) {
    if (id === OFFICE_POOL_ID) continue;
    const entered = parseFloat(raw) || 0;
    if (entered <= 0) continue;
    out.push({ userId: id, percent: round2(entered * factor) });
  }

  const drift = round2(100 - out.reduce((sum, s) => sum + s.percent, 0));
  if (drift !== 0) {
    const biggest = out
      .filter(s => s.userId !== OFFICE_POOL_ID)
      .sort((a, b) => b.percent - a.percent)[0] || out[0];
    if (biggest) biggest.percent = round2(biggest.percent + drift);
  }
  return out;
};

/** Stored shares back into what the form shows — the inverse of the above. */
export const fromBillShares = (shares: any): Record<string, string> => {
  if (!Array.isArray(shares) || shares.length === 0) return {};
  const pool = Number(shares.find((s: any) => s.userId === OFFICE_POOL_ID)?.percent) || 0;
  const factor = (100 - pool) / 100;

  const out: Record<string, string> = {};
  if (pool > 0) out[OFFICE_POOL_ID] = String(pool);
  for (const s of shares) {
    if (s.userId === OFFICE_POOL_ID) continue;
    const whole = Number(s.percent) || 0;
    out[s.userId] = String(factor > 0 ? round2(whole / factor) : 0);
  }
  return out;
};
