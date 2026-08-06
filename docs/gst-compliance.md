# GST Compliance Register

Replaces `GST Report <FY>.xlsx` — the sheet with one row per GSTIN and twelve
`GSTR-1` / `GSTR-3B` column pairs running across it.

## Why it is three tables and not one

The spreadsheet is a grid, and a grid can only hold one value per cell. That
forced three compromises the register removes:

- **A client with two GST registrations had to be two rows.** Two PANs in the
  current sheet already hold two registrations each. Keying on PAN and hanging
  GSTINs beneath it represents that directly.
- **A cell said either when data arrived or when the return was filed, never
  both.** Once a date was typed in, the fact that the data had been waiting
  three weeks was gone. `data_received_on` and `filed_on` are separate columns.
- **Every financial year meant a new file.** Periods are rows, so a new year is
  new rows in the same table and last year stays queryable.

```
clients                          one row per PAN   (the unique client code)
  └── client_gst_registrations   one row per GSTIN (the sub-code)
        └── gst_filings          one row per return per period
```

## The status ladder

Taken from the markers already in use in the sheet, so nothing had to be
retrained:

| Sheet cell         | Status              | Meaning                          |
|--------------------|---------------------|----------------------------------|
| *(blank)*          | `Pending`           | nothing has happened yet         |
| `SEND MSG`         | `Message Sent`      | client chased for data           |
| `NOT PROVIED DATA` | `Data Not Provided` | client did not supply it         |
| `DATA RECEIVED`    | `Data Received`     | data in hand, not yet filed      |
| `OTP`              | `OTP Awaited`       | waiting on the client's OTP      |
| `SEND CHALLAN`     | `Challan Sent`      | challan out, awaiting payment    |
| `NIL`              | `Nil`               | nil return                       |
| a date             | `Filed`             | filed on that date               |
| —                  | `Not Applicable`    | no return due for this period    |

`Filed` is the only status the office is accountable for a date on, so a check
constraint requires `filed_on` with it and forbids it without — a row cannot
read as done with nothing to prove when.

## Filing frequency

The sheet's `M /Q` column, widened to the values it actually holds:

| Sheet | Stored           | Returns due                    |
|-------|------------------|--------------------------------|
| `M`   | `Monthly`        | GSTR-1 and GSTR-3B each month  |
| `Q`   | `Quarterly`      | GSTR-1 and GSTR-3B each quarter|
| `C`   | `Composition`    | GSTR-4 annually, CMP-08 quarterly |
| `NA`  | `Not Applicable` | none                           |

`Annual` and `Irregular` are also accepted, for registrations that file once a
year or on no fixed cycle. An irregular registration gets its periods added by
hand rather than generated.

Composition is a frequency rather than a flag because it changes *which* returns
exist, not merely how often they fall due.

## Due dates

Set from the statutory monthly dates — GSTR-1 on the 11th, GSTR-3B on the 20th
of the following month — **only for monthly filers**. Quarterly and composition
registrations are left with `due_date` NULL rather than given a monthly date
that would be wrong; QRMP and composition run on their own calendars and putting
a false deadline in front of the person doing the work is worse than showing
none.

## Importing the spreadsheet

```bash
# 1. Create the tables (Supabase SQL editor)
supabase/sql/add-gst-compliance-register.sql

# 2. Generate the load from the workbook
python scripts/import-gst-report.py "GST Report 2026-27.xlsx" > gst-import.sql

# 3. Run gst-import.sql in the Supabase SQL editor
```

The generated SQL is idempotent. Clients match on PAN, registrations on GSTIN,
filings on `(registration, return, period)`, and every insert carries an
`ON CONFLICT … DO UPDATE`. Re-running after editing the workbook updates rows in
place. **Nothing is ever deleted** — a registration removed from the sheet stays
in the database, and has to be marked `Cancelled` deliberately.

Only cells that were filled in become rows. An untouched month is left absent
rather than written as a `Pending` row, so the register can tell "not started"
from "generated but unworked".

`LUT`, `New registration pending` and `Removed clients` are **not** imported. The
annual sheets are — see below.

## Annual returns

```bash
python scripts/import-gst-annual.py "GST Report 2026-27.xlsx" > gst-annual.sql
```

Reads two sheets: `GSTR-9 & 9C` for regular registrations, and
`Annual Return Composition` for GSTR-4. Run it after the monthly import, which is
what creates the registrations these attach to.

### The year they belong to

**An annual return belongs to the year it reports on, not the year it is worked
in.** The annual sheets live in the 2026-27 workbook but cover **FY 2025-26**:

| Return | For FY 2025-26, due |
|--------|---------------------|
| GSTR-4 | 30 June 2026 — the sheet's own header says so, and its dates are 27–30 June 2026 |
| GSTR-9 | 31 December 2026 — which is why every date column on that sheet is still empty |
| GSTR-9C | 31 December 2026 |

Recording them under 2026-27 would put a deadline a year early on a year that has
not finished. The importer applies the offset automatically; `--fy=` overrides it
if a future workbook breaks the pattern.

This is also why the compliance screen has **two tabs on two separate year
selectors**. GSTR-1 for 2026-27 and GSTR-9 for 2025-26 are both live work right
now, so a single year selector would make one of them permanently wrong.

### YES / NO means applicable, not filed

The `GSTR-9` and `GSTR-9C` columns hold `YES` or `NO`, and neither means done:

| Sheet | Recorded as |
|-------|-------------|
| `YES`, no date | `Pending` — owed, not yet done |
| `YES` + a date | `Filed` on that date |
| `NO` | `Not Applicable` |
| *(blank)* | nothing — undecided is not the same as not applicable |

`Not Applicable` is stored deliberately rather than left as an absent row. "Do we
owe a 9C for this one?" is a question somebody answered, and without recording it
the answer gets worked out again every December.

### GSTINs that cannot be matched

The insert joins on GSTIN, so a row whose GSTIN has no registration in the app is
dropped by the join and its annual return never lands — silently. The generated
SQL ends with a query that names them; anything it lists needs a client and
registration adding, then a re-run.

Two rows on the `GSTR-9 & 9C` sheet have **no GSTIN at all** and are reported as
skipped by the script itself. Party name is not safe to fall back on: two rows on
that sheet carry the same company name and are different registrations in
different states.

### Options

| Flag | Default | Purpose |
|------|---------|---------|
| `--sheet=NAME` | `2026-27` | worksheet to read |
| `--fy=YYYY-YY` | the sheet name | financial year to record against |

### Registrations backfilled from `clients.gst`

The migration turns every non-empty `clients.gst` into a registration before the
import runs. Those that also appear in the workbook are corrected a moment later
when the import upserts over them on GSTIN. Those that do not appear stay as they
were backfilled: no filings, no responsible person, and no known cycle.

They come in as `Irregular` deliberately. `clients.gst` records that a GSTIN
exists and nothing else, so calling it `Monthly` would assert twenty-four
deadlines a year for a registration nobody has said anything about — and the
compliance counts would open showing work that does not exist.

The first load of this system predated that decision and left 36 such rows marked
`Monthly`, eight of them holding values that are not GST numbers at all (`URD`,
`RPL`, `24563247410`). Run `supabase/sql/review-gst-backfill.sql` to list them
and, step by step, correct them. Step 1 is read-only; nothing else runs until
uncommented.

### Staff matching

`Responsible Person` is matched to a user by **first name**, which is how the
sheet records them (`Harshangi`, `Kishan`). A name matching no user keeps the
text and leaves `responsible_person_id` NULL — the register still has to say who
is responsible when that person has no login. After importing, check:

```sql
SELECT DISTINCT responsible_person_name FROM client_gst_registrations
  WHERE responsible_person_id IS NULL AND responsible_person_name IS NOT NULL;
```

Names appearing there either need a user account or a spelling correction. Note
the sheet currently carries both `shruti` and `Shruti`; the match is
case-insensitive, so both resolve to the same user.

## Portal credentials — read this before widening access

`client_gst_registrations` holds `portal_user_id` and `portal_password` in
plain text, because the spreadsheet holds them in plain text today and the work
cannot be done without them. Moving them into the database is not a regression,
but it is not an improvement either, and it changes the blast radius: a
spreadsheet on one machine becomes a table behind a web app.

What the current setup does and does not give you:

- The columns are **excluded from the registrations list endpoint** and returned
  only on an explicit single-registration fetch, so they are not sitting in
  every page payload.
- Row Level Security is on, and all access goes through the edge function on the
  service role key — the browser's anon key cannot read the table directly.
- There is **no per-role restriction yet.** Anyone the app lets call the
  endpoint can fetch a password. Deciding who may is an open question, flagged
  and deliberately not guessed at.

Worth knowing regardless of what this system does: the sheet reuses a handful of
passwords across many registrations — the two most common account for 35 of the
136 between them. That is a property of the credentials themselves, not of where they
are stored.

## Adding a client

A client is a PAN. Creating one with a PAN that already exists updates that
client rather than making a second — enforced by a partial unique index on
`clients.pan` (partial so the clients with no PAN recorded yet do not collide on
NULL).

If the migration reports duplicate PANs, the unique index is **not** created and
the message names them. Merge or correct those clients and re-run the script;
everything else in it has already applied.
