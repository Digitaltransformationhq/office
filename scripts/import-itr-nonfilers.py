"""Turn the "Non fillers" sheet of the ITR control list into client records.

    python scripts/import-itr-nonfilers.py "ITR CONTROL LIST  F.Y.2025-26.xlsx" > nonfilers.sql

Run supabase/sql/add-client-type.sql first.

These are people the office keeps on record — file number, PAN, portal password,
phone, email — but does not file a return for. They go into `clients` like
anyone else, because that is what they are, and are marked `client_type =
'Non-filer'` so they can never be mistaken for filing clients nobody has started.

They also get `itr_applicable = FALSE`, which keeps them out of the ITR register
as returns that are due. The two together are deliberate: the flag governs what
work is expected, the type governs how the record reads.

WHAT THE SHEET CONTAINS
-----------------------
Of 318 rows:

    68   named "Not Filed" — section markers, not people, and none carries a PAN
    250  real people
      228  with a valid PAN
        225  once duplicate PANs are collapsed   <- imported
      22   real people with no usable PAN        <- reported, not guessed at

PAN is the client key, so a row without one cannot be attached to anything. It
is listed rather than invented, because a client created without a PAN is one
that will be created a second time the moment the PAN turns up.

Stdlib only; the xlsx reader is shared with import-gst-report.py.
"""

import importlib.util
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('gst_report', os.path.join(HERE, 'import-gst-report.py'))
_mod = importlib.util.module_from_spec(_spec)
_saved_argv, sys.argv = sys.argv, ['import-gst-report']
_spec.loader.exec_module(_mod)
sys.argv = _saved_argv

read_sheet, q = _mod.read_sheet, _mod.q

SHEET = 'Non fillers'
HEADER_ROW = 1

COL = {'file_no': 1, 'name': 2, 'pan': 3, 'password': 4, 'mobile': 5, 'email': 6}

PAN_RE = re.compile(r'^[A-Z]{5}\d{4}[A-Z]$')

# Ten consecutive digits somewhere in the cell. Loose on purpose: the sheet
# holds entries like "<number>/ <number>(Whatsapp)" and "<number> (Mobile number
# of son)", which are perfectly good phone numbers with a note attached.
PHONE_RE = re.compile(r'\d{10}')
EMAIL_RE = re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+')


def first_matching(cells, lo, hi, pattern):
    """The first cell in a column range whose content matches.

    Columns on this sheet are shifted on a large minority of rows: 38 of 164
    "Mobile" cells hold a portal password and 54 of 122 "E Mail ID" cells hold a
    phone number, because someone pasted a row one column across. Reading by
    position would file passwords as phone numbers.

    So the value is identified by what it looks like rather than where it sits.
    A password matches neither pattern and is therefore never picked up — which
    is the point, since it has no business in a contact field.
    """
    for i in range(lo, hi + 1):
        value = (cells.get(i) or '').strip()
        if value and pattern.search(value):
            return value
    return None

# The sheet uses these as section markers between blocks of people.
PLACEHOLDERS = {'notfiled', 'notfilled', 'na', 'nil', 'none'}


def is_placeholder(name):
    return re.sub(r'[^a-z]', '', (name or '').lower()) in PLACEHOLDERS


def parse(path):
    rows = dict(read_sheet(path, SHEET))
    people, skipped, markers = [], [], 0
    seen = set()

    for rnum in sorted(r for r in rows if r > HEADER_ROW):
        cells = rows[rnum]
        name = (cells.get(COL['name']) or '').strip()
        if not name:
            continue
        if is_placeholder(name):
            markers += 1
            continue

        pan = (cells.get(COL['pan']) or '').upper().replace(' ', '')
        if not PAN_RE.fullmatch(pan):
            skipped.append((rnum, name, pan or '(blank)'))
            continue

        # Same PAN twice on the sheet is one person entered twice; the first
        # row wins, and the duplicate is reported rather than dropped silently.
        if pan in seen:
            skipped.append((rnum, name, f'{pan} (duplicate of an earlier row)'))
            continue
        seen.add(pan)

        # From the password column rightwards, including the three unlabelled
        # columns at the end which hold yet more displaced contact details.
        people.append({
            'pan': pan,
            'name': name,
            'file_no': cells.get(COL['file_no']),
            'mobile': first_matching(cells, COL['password'], COL['email'] + 4, PHONE_RE),
            'email': first_matching(cells, COL['password'], COL['email'] + 4, EMAIL_RE),
        })

    return people, skipped, markers


def emit(people, skipped, markers, source):
    p = print
    p('-- Non-filer clients')
    p(f'-- Source: {source}, sheet {SHEET!r}')
    p(f'-- {len(people)} person(s) to import.')
    p(f'-- {markers} placeholder row(s) named "Not Filed" ignored — section markers, not people.')
    p('--')
    p('-- Marked client_type = \'Non-filer\' and itr_applicable = FALSE: on record,')
    p('-- but no return is due from this firm on their behalf.')
    p('--')
    p('-- Run supabase/sql/add-client-type.sql first. Re-running this updates rows')
    p('-- in place, matched on PAN. Nothing is deleted.')
    p()

    if skipped:
        p(f'-- {len(skipped)} row(s) skipped:')
        for rnum, name, why in skipped:
            p(f'--   row {rnum}: {name}  [{why}]')
        p('-- Add the PAN to the sheet and re-run to pick them up.')
        p()

    if not people:
        p('-- Nothing to import.')
        return

    p('BEGIN;')
    p()
    p("""CREATE TEMP TABLE nonfiler_stage (
  pan TEXT, name TEXT, file_no TEXT, mobile TEXT, email TEXT
) ON COMMIT DROP;""")
    p()
    p('INSERT INTO nonfiler_stage VALUES')
    for i, r in enumerate(people):
        end = ',' if i < len(people) - 1 else ';'
        p(f"  ({q(r['pan'])}, {q(r['name'])}, {q(r['file_no'])}, {q(r['mobile'])}, {q(r['email'])}){end}")
    p()
    p('-- ============================================')
    p('-- REPAIR CONTACT FIELDS WRITTEN FROM SHIFTED COLUMNS')
    p('-- ============================================')
    p('-- An earlier run of this script read the Mobile and E Mail columns by')
    p('-- position and so filed portal passwords as phone numbers, and phone')
    p('-- numbers as email addresses.')
    p('--')
    p('-- The upsert below uses COALESCE and would leave that wrong data in place,')
    p("-- so anything that is plainly not a phone number or an email is cleared")
    p('-- first, letting the corrected values take its place. Scoped to non-filers,')
    p('-- which is the only cohort this script has ever written.')
    p("""UPDATE clients SET
  contact       = CASE WHEN contact       ~ '[0-9]{10}' THEN contact       ELSE NULL END,
  mobile_number = CASE WHEN mobile_number ~ '[0-9]{10}' THEN mobile_number ELSE NULL END,
  email         = CASE WHEN email         LIKE '%@%.%'  THEN email         ELSE NULL END,
  email_id      = CASE WHEN email_id      LIKE '%@%.%'  THEN email_id      ELSE NULL END
WHERE client_type = 'Non-filer'
  AND (contact       !~ '[0-9]{10}'
    OR mobile_number !~ '[0-9]{10}'
    OR email         NOT LIKE '%@%.%'
    OR email_id      NOT LIKE '%@%.%');""")
    p()
    p('-- ============================================')
    p('-- CLIENTS')
    p('-- ============================================')
    p('-- COALESCE on every field an existing client might already hold: a PAN')
    p('-- that is already on the books belongs to someone the office knows better')
    p('-- than this sheet does, and its blanks must not overwrite that.')
    p('--')
    p('-- client_type is set unconditionally, because being on this sheet IS the')
    p('-- statement that no return is filed for them.')
    p("""INSERT INTO clients (
  id, name, pan, file_number, contact, mobile_number, email, email_id,
  status, client_type, itr_applicable, created_at, updated_at)
SELECT
  'client:pan:' || s.pan, s.name, s.pan, s.file_no,
  s.mobile, s.mobile, s.email, s.email,
  'Active', 'Non-filer', FALSE, NOW(), NOW()
FROM nonfiler_stage s
ON CONFLICT (pan) WHERE pan IS NOT NULL DO UPDATE SET
  file_number    = COALESCE(clients.file_number, EXCLUDED.file_number),
  contact        = COALESCE(clients.contact, EXCLUDED.contact),
  mobile_number  = COALESCE(clients.mobile_number, EXCLUDED.mobile_number),
  email          = COALESCE(clients.email, EXCLUDED.email),
  email_id       = COALESCE(clients.email_id, EXCLUDED.email_id),
  client_type    = 'Non-filer',
  itr_applicable = FALSE,
  updated_at     = NOW();""")
    p()
    p('COMMIT;')
    p()
    p('-- ============================================')
    p('-- VERIFY')
    p('-- ============================================')
    p("""SELECT
  (SELECT COUNT(*) FROM clients)                                  AS clients_total,
  (SELECT COUNT(*) FROM clients WHERE client_type = 'Non-filer')  AS non_filers,
  (SELECT COUNT(*) FROM clients WHERE client_type = 'Filing')     AS filing,
  (SELECT COUNT(*) FROM clients WHERE pan IS NOT NULL)            AS with_pan;""")
    p()
    p('-- A non-filer that also holds a GST registration is worth a look: the firm')
    p('-- files their GST but not their return, which happens, but is unusual.')
    p("""-- SELECT c.name, c.pan, r.gstin
--   FROM clients c JOIN client_gst_registrations r ON r.client_id = c.id
--  WHERE c.client_type = 'Non-filer';""")


def main():
    sys.stdout.reconfigure(encoding='utf-8', newline='\n')
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    people, skipped, markers = parse(args[0])
    emit(people, skipped, markers, args[0])


if __name__ == '__main__':
    main()
