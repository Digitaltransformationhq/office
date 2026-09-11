/**
 * One alphabetical order, for every list in the app.
 *
 * A list is read by scanning it for a name, so the name is what it should be
 * ordered by. Lists here used to arrive in whatever order the database handed
 * back — insertion order, mostly — which means the same screen reordered itself
 * every time a row was added, and finding "Sharma & Co" meant reading all forty
 * rows rather than jumping to the S's.
 *
 * WHY A COLLATOR AND NOT `<`
 *
 *   `'Zed' < 'apple'` is true in JavaScript: raw string comparison is by code
 *   unit, so every capital letter sorts before every lowercase one and a list of
 *   client names splits into two alphabets. `numeric` additionally keeps
 *   "Form 2" ahead of "Form 10" instead of ordering them like words.
 *
 * BLANKS LAST
 *
 *   An empty name sorts to the end rather than the top. A missing value is not
 *   the alphabetically-first value; it is the row with nothing to say, and it
 *   belongs after the rows that do.
 */

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** A–Z, case- and accent-insensitive, blanks last. The comparator everything else is built from. */
export const compareText = (a?: string | null, b?: string | null) => {
  const left = (a ?? '').toString().trim();
  const right = (b ?? '').toString().trim();
  if (!left || !right) return left ? -1 : right ? 1 : 0;
  return collator.compare(left, right);
};

/**
 * A–Z copy of a list of objects, keyed on whatever the row is read by.
 *
 * Takes the whole list rather than returning a bare comparator, so `pick` gets
 * its element type from the list and never has to be annotated at the call site.
 */
export const sortByText = <T>(list: readonly T[], pick: (item: T) => string | null | undefined) =>
  [...list].sort((a, b) => compareText(pick(a), pick(b)));

/** A–Z copy of a plain list of strings — dropdown options, filter values, tags. */
export const sortText = <T extends string | null | undefined>(list: readonly T[]): T[] =>
  [...list].sort(compareText);

/**
 * Tasks, A–Z by the task itself.
 *
 * The client is the tie-break rather than the lead: two clients often need the
 * same filing, and grouping every "GSTR-3B" together is what makes the repeat
 * visible. Falls back to the client name when a task somehow has none, so rows
 * without a title still land somewhere predictable instead of shuffling.
 */
export const compareTasks = (
  a: { task?: string | null; client?: string | null },
  b: { task?: string | null; client?: string | null },
) => compareText(a?.task, b?.task) || compareText(a?.client, b?.client);

/** A–Z copy of a task list. */
export const sortTasks = <T extends { task?: string | null; client?: string | null }>(tasks: readonly T[]) =>
  [...tasks].sort(compareTasks);

/**
 * A–Z, except that a catch-all stays at the bottom where people look for it.
 *
 * "Others" alphabetises into the middle of a work-type list, between "MCA Work"
 * and "TDS Returns", which reads as a list that failed to sort rather than one
 * that did. It is not a peer of the named options — it is where you go when
 * none of them fit — so it keeps the last seat.
 */
const CATCH_ALL = /^(others?|miscellaneous|misc\.?)$/i;

export const sortOptions = <T extends string>(list: readonly T[]): T[] =>
  [...list].sort((a, b) =>
    Number(CATCH_ALL.test(a.trim())) - Number(CATCH_ALL.test(b.trim())) || compareText(a, b));
