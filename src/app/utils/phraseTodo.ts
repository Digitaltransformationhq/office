/**
 * Turning a typed fragment into a line that reads like a sentence.
 *
 * "jay meeting" is how people type; "Meeting with Jay" is how it should sit on
 * the list a week later when the shorthand has stopped being obvious. This does
 * that rewrite for the few shapes an office actually types, and nothing else.
 *
 * WHY IT REWRITES SO LITTLE
 *
 * The rewrite turns on one judgement — is this word a person? — and no rule can
 * answer that. "jay meeting" is a person; "gst meeting" is a subject, and
 * "Meeting with GST" is nonsense that the owner has to go and correct. So the
 * question is never really asked: instead there is a list of words known NOT to
 * be people, and a word is only treated as a name if it is short, plainly
 * alphabetic, and not on that list.
 *
 * Everything unrecognised is left exactly as typed, beyond capitalising the
 * first letter. A line this does not understand is not a failure — it is a line
 * the person wrote the way they wanted it.
 */

/**
 * Words that are never a person, even standing exactly where a name would.
 *
 * The office's own vocabulary, which is precisely what collides with the
 * "<name> meeting" shape — "audit meeting", "board meeting", "GST meeting".
 */
const NOT_A_NAME = new Set([
  // The work
  'gst', 'gstr', 'itr', 'tds', 'tcs', 'roc', 'mca', 'pan', 'tan', 'din', 'kyc',
  'audit', 'tax', 'income', 'filing', 'return', 'returns', 'refund', 'notice',
  'assessment', 'scrutiny', 'appeal', 'reconciliation', 'ledger', 'balance',
  'accounts', 'accounting', 'billing', 'invoice', 'payroll', 'compliance',
  // The people-in-general. Roles, not names — "pay vendor" must not become
  // "Pay Vendor", which reads as somebody actually called that.
  'board', 'team', 'client', 'clients', 'staff', 'partner', 'partners',
  'office', 'bank', 'department', 'auditor', 'management', 'committee',
  'vendor', 'vendors', 'supplier', 'suppliers', 'customer', 'customers',
  'landlord', 'driver', 'courier', 'everyone', 'someone', 'them', 'him', 'her',
  // The shape of a day
  'morning', 'afternoon', 'evening', 'weekly', 'monthly', 'daily', 'annual',
  'urgent', 'important', 'final', 'first', 'last', 'next', 'this',
  'follow', 'followup', 'review', 'internal', 'external', 'general', 'quick',
]);

/** Read as-is rather than title-cased: "CA Mehta", not "Ca Mehta". */
const UPPER = new Set(['ca', 'cs', 'cma', 'gst', 'itr', 'tds', 'tcs', 'roc', 'mca', 'pan', 'tan', 'hr', 'it']);
const HONORIFIC = new Set(['mr', 'mrs', 'ms', 'dr', 'shri', 'smt', 'sri']);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** A single word as it should be shown: CA, Mr, Jay. */
function capWord(w: string): string {
  const bare = w.replace(/[.,]$/, '');
  const tail = w.slice(bare.length);
  const lower = bare.toLowerCase();
  if (UPPER.has(lower)) return bare.toUpperCase() + tail;
  if (HONORIFIC.has(lower)) return lower[0].toUpperCase() + lower.slice(1) + tail;
  // Left alone if it already carries capitals of its own — "McKinsey", "PwC".
  if (/[A-Z]/.test(bare.slice(1))) return w;
  return bare.charAt(0).toUpperCase() + bare.slice(1).toLowerCase() + tail;
}

const titleCase = (s: string) => words(s).map(capWord).join(' ');

/**
 * Could this be somebody's name?
 *
 * Deliberately strict. Three words at most, letters only, nothing from the
 * office vocabulary — an honorific alone ("mr") is not a name either, or "mr
 * meeting" would become "Meeting with Mr".
 */
function looksLikeName(phrase: string): boolean {
  const parts = words(phrase);
  if (parts.length === 0 || parts.length > 3) return false;
  if (parts.every(p => HONORIFIC.has(p.toLowerCase()))) return false;
  return parts.every(p => /^[a-z][a-z.'-]*$/i.test(p) && !NOT_A_NAME.has(p.toLowerCase()));
}

/** The first letter up, and known acronyms shouted, with nothing else touched. */
function tidy(text: string): string {
  const parts = words(text);
  if (parts.length === 0) return text.trim();
  const first = UPPER.has(parts[0].toLowerCase()) ? parts[0].toUpperCase() : capWord(parts[0]);
  const rest = parts.slice(1).map(w => (UPPER.has(w.toLowerCase()) ? w.toUpperCase() : w));
  return [first, ...rest].join(' ');
}

/**
 * The line as it should be saved.
 *
 * Run after the date words have been taken out, so what arrives here is only
 * what the item is about.
 */
export function phraseTodo(input: string): string {
  const text = input.trim().replace(/\s{2,}/g, ' ');
  if (!text) return text;

  // Already a sentence of some length — leave it be. Rewriting somebody's
  // actual prose is overreach, and the shapes below are all short.
  if (words(text).length > 5) return tidy(text);

  let m: RegExpExecArray | null;

  // "meeting with jay" / "meeting jay" -> Meeting with Jay
  if ((m = /^meeting\s+(?:with\s+)?(.+)$/i.exec(text)) && looksLikeName(m[1])) {
    return `Meeting with ${titleCase(m[1])}`;
  }

  // "jay meeting" -> Meeting with Jay
  if ((m = /^(.+?)\s+meeting$/i.exec(text)) && looksLikeName(m[1])) {
    return `Meeting with ${titleCase(m[1])}`;
  }

  // "call jay" / "jay call" -> Call Jay
  if ((m = /^call\s+(?:to\s+)?(.+)$/i.exec(text)) && looksLikeName(m[1])) {
    return `Call ${titleCase(m[1])}`;
  }
  if ((m = /^(.+?)\s+call$/i.exec(text)) && looksLikeName(m[1])) {
    return `Call ${titleCase(m[1])}`;
  }

  // "jay ko call karna" — the Hinglish that gets typed as often as the English.
  if ((m = /^(.+?)\s+ko\s+call\s*(?:karna|krna)?$/i.exec(text)) && looksLikeName(m[1])) {
    return `Call ${titleCase(m[1])}`;
  }

  // "visit jay" / "email jay" / "remind jay"
  if ((m = /^(visit|email|mail|message|remind|pay|meet)\s+(?:to\s+)?(.+)$/i.exec(text)) && looksLikeName(m[2])) {
    const verb = m[1].toLowerCase() === 'meet' ? 'Meet' : capWord(m[1]);
    return `${verb} ${titleCase(m[2])}`;
  }

  return tidy(text);
}
