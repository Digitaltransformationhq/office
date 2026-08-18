/**
 * Reading a day and an hour out of a line somebody typed.
 *
 * "Meeting with Mr Shah tomorrow at 4pm" should file itself for tomorrow at
 * four, leaving "Meeting with Mr Shah" as the line. Nobody wants to type the
 * appointment and then fill in a date field describing the sentence they have
 * just written.
 *
 * WHAT THIS DELIBERATELY IS NOT
 *
 * Not a general date parser. It reads the handful of forms this office actually
 * types and refuses everything else, because the cost of the two mistakes is
 * not symmetric: missing a date the person can add in two taps is a small
 * annoyance, while inventing one silently files their meeting on the wrong
 * afternoon and they find out by missing it.
 *
 * So every rule needs an explicit marker — a weekday, a month, "tomorrow", or
 * an "at"/"by" in front of an hour — and a bare number is never a time.
 * "Call 2 clients" keeps no date. "Call 2 clients at 4" is four o'clock.
 *
 * WHAT IT READS
 *
 *   days    today, tonight, tomorrow, tmrw, day after tomorrow,
 *           monday..sunday (and mon/tue/wed/thu/fri/sat/sun), next friday,
 *           21 Aug, Aug 21, 21st August, 21/8, 21-08-2026
 *   times   4pm, 4:30 pm, 16:00, at 4, by 5:15, noon, midnight,
 *           in 20 minutes, in 2 hours
 *
 * A day with no time means that whole day. A time with no day means today, or
 * tomorrow if the hour has already gone — "at 9am" typed at four in the
 * afternoon is tomorrow morning, which is what the person meant.
 */

export interface ParsedWhen {
  /** 'YYYY-MM-DD' in local reckoning. */
  dueOn: string;
  /** 'HH:MM', or '' for a day with no particular hour. */
  dueTime: string;
  /** The exact words understood, so they can be shown and removed. */
  matched: string;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hhmm = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

interface Hit { start: number; end: number }

/**
 * Which hour a bare number means.
 *
 * "at 4" in an office is four in the afternoon, and "at 9" is nine in the
 * morning. Decided by the working day rather than by the current time — reading
 * it off the clock would make the same sentence mean different things depending
 * on when it was typed, which is a worse kind of surprise than being wrong in a
 * way that is at least consistent.
 */
const officeHour = (h: number) => (h >= 1 && h <= 7 ? h + 12 : h);

/** A day-of-month in a named month, rolled forward if it has already passed. */
function monthDay(day: number, monthIndex: number, year: number | null, now: Date): Date | null {
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const d = new Date(year ?? now.getFullYear(), monthIndex, day);
  if (d.getMonth() !== monthIndex) return null; // 31 February and friends
  // No year given and the date is behind us: they mean next year.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (year === null && d.getTime() < startOfToday.getTime()) d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** The day part, if the line names one. */
function readDay(text: string, now: Date): (Hit & { date: Date }) | null {
  let m: RegExpExecArray | null;

  if ((m = /\bday\s+after\s+tomorrow\b/i.exec(text)))
    return { start: m.index, end: m.index + m[0].length, date: addDays(now, 2) };

  if ((m = /\b(today|tonight)\b/i.exec(text)))
    return { start: m.index, end: m.index + m[0].length, date: new Date(now) };

  if ((m = /\b(tomorrow|tommorow|tmrw|tmr)\b/i.exec(text)))
    return { start: m.index, end: m.index + m[0].length, date: addDays(now, 1) };

  // "after 2 days", "in 3 weeks", "after a week". Counted from today, so
  // "after 2 days" is the day after tomorrow — which is what it means said out
  // loud, and it is a whole day out if counted any other way.
  m = /\b(?:in|after)\s+(a|an|\d{1,3})\s*(day|days|week|weeks|month|months)\b/i.exec(text);
  if (m) {
    const n = /^\d/.test(m[1]) ? Number(m[1]) : 1;
    const unit = m[2].toLowerCase();
    const date = unit.startsWith('day') ? addDays(now, n)
      : unit.startsWith('week') ? addDays(now, n * 7)
      : new Date(now.getFullYear(), now.getMonth() + n, now.getDate());
    return { start: m.index, end: m.index + m[0].length, date };
  }

  // 21 Aug, 21st August, 2nd of September, 21 August 2026
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/i.exec(text);
  if (m) {
    const date = monthDay(Number(m[1]), MONTHS.indexOf(m[2].toLowerCase()), m[3] ? Number(m[3]) : null, now);
    if (date) return { start: m.index, end: m.index + m[0].length, date };
  }

  // Aug 21, August 21st
  m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:\s+(\d{4}))?/i.exec(text);
  if (m) {
    const date = monthDay(Number(m[2]), MONTHS.indexOf(m[1].toLowerCase()), m[3] ? Number(m[3]) : null, now);
    if (date) return { start: m.index, end: m.index + m[0].length, date };
  }

  // 21/8, 21-08-2026. Day first: the office writes dates the Indian way.
  m = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/.exec(text);
  if (m) {
    const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    const date = monthDay(Number(m[1]), Number(m[2]) - 1, year, now);
    if (date) return { start: m.index, end: m.index + m[0].length, date };
  }

  /*
   * "GST due 20th", "visit on 25th" — a day of this month, or next month if it
   * has already gone. The marker is not optional: without it "3rd party audit"
   * becomes a date, and a to-do quietly filed three weeks out is precisely the
   * failure this parser exists to avoid.
   */
  m = /\b(?:on|by|due|before|till|until)\s+(\d{1,2})(?:st|nd|rd|th)\b/i.exec(text);
  if (m) {
    const dom = Number(m[1]);
    if (dom >= 1 && dom <= 31) {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let d = new Date(now.getFullYear(), now.getMonth(), dom);
      if (d.getMonth() !== now.getMonth() || d.getTime() < startOfToday.getTime()) {
        d = new Date(now.getFullYear(), now.getMonth() + 1, dom);
      }
      if (d.getDate() === dom) return { start: m.index, end: m.index + m[0].length, date: d };
    }
  }

  // monday, next fri, on thursday
  m = /\b(next\s+|this\s+|on\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?\b/i.exec(text);
  if (m) {
    const stem = m[2].toLowerCase().slice(0, 3);
    const want = WEEKDAYS.findIndex(w => w.startsWith(stem));
    if (want >= 0) {
      let delta = (want - now.getDay() + 7) % 7;
      // Today's own weekday means next week's. "Meeting on Friday" typed on a
      // Friday is not a meeting that already happened this morning.
      if (delta === 0) delta = 7;
      // "next monday" is read as the next Monday to arrive, NOT the one after
      // it. People disagree about which they mean, and between a guess that is
      // a week early and one a week late, early is the one they notice in time
      // to fix. So "next" adds nothing — it is treated as the plain weekday.
      return { start: m.index, end: m.index + m[0].length, date: addDays(now, delta) };
    }
  }

  return null;
}

/** The hour part, if the line names one. Minutes from midnight. */
function readTime(text: string, now: Date): (Hit & { minutes: number; relative?: boolean }) | null {
  let m: RegExpExecArray | null;

  // in 20 minutes, in 2 hours
  m = /\bin\s+(\d{1,3})\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\b/i.exec(text);
  if (m) {
    const n = Number(m[1]);
    const at = new Date(now.getTime() + (/^h/i.test(m[2]) ? n * 60 : n) * 60_000);
    return {
      start: m.index, end: m.index + m[0].length,
      minutes: at.getHours() * 60 + at.getMinutes(), relative: true,
    };
  }

  if ((m = /\b(noon|midday)\b/i.exec(text)))
    return { start: m.index, end: m.index + m[0].length, minutes: 12 * 60 };
  if ((m = /\bmidnight\b/i.exec(text)))
    return { start: m.index, end: m.index + m[0].length, minutes: 0 };

  // 4pm, 4:30 pm, 4.30pm
  m = /\b(?:at\s+|by\s+|@\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i.exec(text);
  if (m) {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (h >= 1 && h <= 12 && min <= 59) {
      const pm = /^p/i.test(m[3]);
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
      return { start: m.index, end: m.index + m[0].length, minutes: h * 60 + min };
    }
  }

  // 4 o'clock
  m = /\b(?:at\s+|by\s+|@\s*)?(\d{1,2})\s*o'?\s?clock\b/i.exec(text);
  if (m) {
    const h = Number(m[1]);
    if (h >= 1 && h <= 23) {
      return { start: m.index, end: m.index + m[0].length, minutes: (h > 12 ? h : officeHour(h)) * 60 };
    }
  }

  // 16:00 — a colon with a 24-hour value is unambiguous on its own.
  m = /\b(?:at\s+|by\s+|@\s*)?([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (m) return { start: m.index, end: m.index + m[0].length, minutes: Number(m[1]) * 60 + Number(m[2]) };

  /*
   * at 4.30 — a dot where the colon should be, which is how half this office
   * writes it. Behind a marker only: a bare "4.30" is also how a date gets
   * written, and 21.8 already belongs to the day rules above.
   */
  m = /\b(?:at\s+|by\s+|@\s*)(\d{1,2})\.([0-5]\d)\b/i.exec(text);
  if (m) {
    const h = Number(m[1]);
    if (h >= 1 && h <= 23) {
      return {
        start: m.index, end: m.index + m[0].length,
        minutes: (h > 12 ? h : officeHour(h)) * 60 + Number(m[2]),
      };
    }
  }

  // at 4, by 5, @ 3 — the marker is what makes a bare number a time.
  m = /\b(?:at|by)\s+(\d{1,2})\b|@\s*(\d{1,2})\b/i.exec(text);
  if (m) {
    const h = Number(m[1] ?? m[2]);
    if (h >= 1 && h <= 23) {
      return { start: m.index, end: m.index + m[0].length, minutes: (h > 12 ? h : officeHour(h)) * 60 };
    }
  }

  /*
   * "monday morning", "tomorrow evening".
   *
   * Read last, so a stated hour always wins. These do invent a precision nobody
   * typed — morning is not exactly nine — but both alternatives are worse:
   * leaving the word behind makes the line read "audit morning", and dropping it
   * silently loses the only thing the person said about when. Nine, two and six
   * are this office's own hours, and the reading is shown on screen before it
   * saves, so a wrong one is visible and one tap from being fixed.
   */
  m = /\b(morning|afternoon|evening|tonight|night)\b/i.exec(text);
  if (m) {
    const word = m[1].toLowerCase();
    const hour = word === 'morning' ? 9 : word === 'afternoon' ? 14 : 18;
    return { start: m.index, end: m.index + m[0].length, minutes: hour * 60 };
  }

  return null;
}

/**
 * Read a day and an hour out of a line, or null if it names neither.
 *
 * `now` is passed in rather than read here, so the caller's clock is the only
 * clock and the result can be checked at a fixed moment.
 */
export function parseWhen(input: string, now: Date = new Date()): ParsedWhen | null {
  if (!input.trim()) return null;

  const day = readDay(input, now);

  /*
   * The hour is read from what the day did not already claim.
   *
   * "Submit 3B by 20 Sep" otherwise reads "by 20" as eight in the evening —
   * the bare-hour rule reaching into the middle of the date and taking the
   * day-of-month for an hour. Blanking the matched span first, rather than
   * comparing the two afterwards, keeps every index in the original string.
   */
  const masked = day
    ? input.slice(0, day.start) + ' '.repeat(day.end - day.start) + input.slice(day.end)
    : input;
  const time = readTime(masked, now);
  if (!day && !time) return null;

  let date = day ? new Date(day.date) : new Date(now);

  if (time && !day && !time.relative) {
    // A time alone is today — unless it has gone, in which case they mean the
    // next one. A relative time is already anchored to the clock.
    const todayAt = new Date(now);
    todayAt.setHours(Math.floor(time.minutes / 60), time.minutes % 60, 0, 0);
    if (todayAt.getTime() < now.getTime()) date = addDays(now, 1);
  }

  const spans = [day, time].filter(Boolean) as Hit[];
  const start = Math.min(...spans.map(s => s.start));
  const end = Math.max(...spans.map(s => s.end));

  return {
    dueOn: iso(date),
    dueTime: time ? hhmm(Math.floor(time.minutes / 60), time.minutes % 60) : '',
    matched: input.slice(start, end).trim(),
  };
}

/**
 * The line with the understood words taken out, tidied.
 *
 * A trailing "at" or "on" left dangling by the removal goes with them —
 * "Meeting with Shah at" is not a sentence anybody typed. If removing
 * everything would leave nothing at all, the original is kept: a line that
 * reads only "tomorrow 4pm" is still a line, and an empty one cannot be saved.
 */
export function stripWhen(input: string, matched: string): string {
  if (!matched) return input.trim();
  const i = input.toLowerCase().indexOf(matched.toLowerCase());
  if (i < 0) return input.trim();

  const out = (input.slice(0, i) + ' ' + input.slice(i + matched.length))
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[\s,]+(at|on|by|from|due)$/i, '')
    .replace(/^(at|on|by|from|due)[\s,]+/i, '')
    .replace(/[\s,]+$/, '')
    .trim();

  return out || input.trim();
}
