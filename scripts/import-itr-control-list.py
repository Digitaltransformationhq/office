"""Turn "ITR CONTROL LIST F.Y.<year>.xlsx" into SQL for the ITR register.

    python scripts/import-itr-control-list.py "ITR CONTROL LIST  F.Y.2025-26.xlsx" > itr-import.sql

Run supabase/sql/add-itr-register.sql first.

Emits two set-based inserts: clients keyed on PAN, then one itr_filings row per
client for the year. Re-running updates rows in place; nothing is deleted.

NO SEPARATE CLIENT TABLE
------------------------
441 of the 455 rows carry a valid PAN, and PAN is already the client key. Of
those, 77 are clients the firm files GST for as well and 316 more are clients
whose PAN was simply never recorded — this import fills those in. Only 48 are new
people. A table of "ITR clients" would hold the other 393 twice.

THE DATA COLUMN
---------------
96 distinct free-text values, because it is a notes field that grew a
vocabulary. The mapping below covers the ones whose meaning is unambiguous:

    CALL DONE / MAIL / WP / PHY     the client has been asked   -> Data Requested
    ACCOUNTING / AUDIT              the firm is working on it   -> In Preparation
    DONE F NEW 13.4 10.17AM         filed, new regime, on 13/4  -> Filed
    RTF (in the STATUS column)      ready to file               -> Ready to File

Everything else keeps `status = 'Pending'` and the original text is stored in
data_note regardless. A rule that covers most of 96 values would silently lose
the rest, and whoever typed them knew something the rule does not.

Stdlib only; the xlsx reader is shared with import-gst-report.py.
"""

import datetime
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

read_sheet, q, fy_years = _mod.read_sheet, _mod.q, _mod.fy_years

SHEET = 'ITR Control list F.Y.2025-26'
HEADER_ROW = 1

COL = {
    'file_no': 1, 'responsible': 2, 'name': 3, 'pan': 4, 'itr_form': 5,
    'data': 6, 'status': 7, 'partner_remark': 8, 'cpc': 9, 'password': 10,
    'mobile': 11, 'email': 12, 'wp_group': 15,
    'itr_v': 16, 'computation': 17, 'financial_statement': 18, 'challan': 19,
    'remarks': 20, 'bill_no': 21,
}

PAN_RE = re.compile(r'^[A-Z]{5}\d{4}[A-Z]$')
FORM_RE = re.compile(r'ITR\s*-?\s*([1-7])')
PHONE_RE = re.compile(r'\d{10}')
EMAIL_RE = re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+')

# Day and month, with an optional year: "13.4", "22.05", "01.06.2026".
FILED_DATE_RE = re.compile(r'(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?')

# Names the control list uses that no longer match a user account.
#
# The sheet records who handled a return at the time, and staff change: the desk
# written as "VISHWANATH PATEL" belongs to Mayur Patel now. Without this the
# import would keep resurrecting the old name on every run, undoing the link by
# hand each time.
#
# Keys are compared uppercased and trimmed. Add a line when a name changes; do
# not edit the spreadsheet, which is a historical record.
STAFF_ALIASES = {
    'VISHWANATH PATEL': 'Mayur Patel',
}

# Whole-cell matches, after collapsing whitespace and uppercasing.
DATA_EXACT = {
    'CALL DONE': 'Data Requested',
    'MAIL': 'Data Requested',
    'WP': 'Data Requested',
    'WP OLD': 'Data Requested',
    'PHY': 'Data Received',
    'ACCOUNTING': 'In Preparation',
    'AUDIT': 'In Preparation',
    'ACCOUNTING & AUDIT': 'In Preparation',
    'ACCOUNTING AND AUDIT': 'In Preparation',
}

# Checked in order when nothing matches exactly. First hit wins, so the more
# specific patterns come first.
DATA_CONTAINS = [
    ('NOT PROVID', 'Data Not Provided'),
    ('NO RESPONSE', 'Data Not Provided'),
    ('ACCOUNTING', 'In Preparation'),
    ('AUDIT', 'In Preparation'),
    ('RECEIVED', 'Data Received'),
    ('ASKED', 'Data Requested'),
    ('CALL', 'Data Requested'),
    ('MAIL', 'Data Requested'),
    ('WP', 'Data Requested'),
]


def resolve_staff(name):
    """The current account name for a name written on the sheet."""
    if not name:
        return None
    return STAFF_ALIASES.get(re.sub(r'\s+', ' ', name.strip().upper()), name.strip())


def norm(value):
    return re.sub(r'\s+', ' ', (value or '').strip().upper())


def yes(value):
    return norm(value) in {'YES', 'Y', 'DONE', 'TRUE', '1'}


def parse_form(value):
    m = FORM_RE.search(norm(value))
    return f'ITR-{m.group(1)}' if m else None


def parse_filed(text, fy_start):
    """The filing date out of a DONE note, or None if it does not carry one.

    Returns (date, regime). The year is rarely written — "13.4" means 13 April
    of the filing season, which is the calendar year after the financial year
    ends. A two-digit year is taken at face value.
    """
    upper = norm(text)
    regime = 'New' if re.search(r'\bNEW\b', upper) else 'Old' if re.search(r'\bOLD\b', upper) else None

    m = FILED_DATE_RE.search(upper)
    if not m:
        return None, regime

    day, month = int(m.group(1)), int(m.group(2))
    year = int(m.group(3)) if m.group(3) else None
    if year is None:
        year = fy_start + 1
    elif year < 100:
        year += 2000

    # A note like "10.17AM" would otherwise parse as day 10, month 17.
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None, regime
    try:
        return datetime.date(year, month, day), regime
    except ValueError:
        return None, regime


def derive_status(data, status_note, fy_start):
    """(status, filed_on, regime) from the two free-text columns."""
    d, s = norm(data), norm(status_note)

    if d.startswith('DONE'):
        filed, regime = parse_filed(data, fy_start)
        return 'Filed', filed, regime

    # RTF — ready to file — is the office's own shorthand and outranks whatever
    # the DATA column says about how the papers arrived.
    if 'RTF' in s:
        return 'Ready to File', None, None

    if d in DATA_EXACT:
        return DATA_EXACT[d], None, None
    for needle, mapped in DATA_CONTAINS:
        if needle in d:
            return mapped, None, None

    return 'Pending', None, None


def first_matching(cells, columns, pattern):
    """The first of `columns` whose text matches — contact fields drift sideways."""
    for i in columns:
        value = (cells.get(i) or '').strip()
        if value and pattern.search(value):
            return value
    return None


def parse(path, fy):
    fy_start, _ = fy_years(fy)
    rows = dict(read_sheet(path, SHEET))
    people, skipped = [], []
    seen = set()

    for rnum in sorted(r for r in rows if r > HEADER_ROW):
        cells = rows[rnum]
        name = (cells.get(COL['name']) or '').strip()
        if not name:
            continue

        pan = (cells.get(COL['pan']) or '').upper().replace(' ', '')
        if not PAN_RE.fullmatch(pan):
            skipped.append((rnum, name, pan or '(blank)'))
            continue
        if pan in seen:
            skipped.append((rnum, name, f'{pan} (duplicate of an earlier row)'))
            continue
        seen.add(pan)

        data = cells.get(COL['data'])
        status_note = cells.get(COL['status'])
        status, filed_on, regime = derive_status(data, status_note, fy_start)

        # What sets the deadline:
        #   audit case                                       31 October
        #   business income other than speculation or F&O    31 August
        #   everything else                                  31 July
        #
        # The control list marks audit cases in its DATA column but says nothing
        # about business income, so that flag is left FALSE and set per return in
        # the app. It is deliberately NOT guessed from the ITR form: ITR-3 and
        # ITR-4 are the business income forms, but whether the income is
        # speculation or F&O is not something the form number answers, and a
        # deadline a month early is worse than one that has to be set by hand.
        is_audit = 'AUDIT' in norm(data) or 'AUDIT' in norm(status_note)
        due = datetime.date(fy_start + 1, 10, 31) if is_audit else datetime.date(fy_start + 1, 7, 31)

        contact_cols = [COL['password'], COL['mobile'], COL['email'], 13, 14]

        people.append({
            'pan': pan,
            'name': name,
            'file_no': cells.get(COL['file_no']),
            'responsible': resolve_staff(cells.get(COL['responsible'])),
            'password': cells.get(COL['password']),
            'mobile': first_matching(cells, contact_cols, PHONE_RE),
            'email': first_matching(cells, contact_cols, EMAIL_RE),
            'itr_form': parse_form(cells.get(COL['itr_form'])),
            'status': status,
            'filed_on': filed_on,
            'regime': regime,
            'is_audit': is_audit,
            'due_date': due,
            'data_note': (data or '').strip() or None,
            'status_note': (status_note or '').strip() or None,
            'partner_remark': cells.get(COL['partner_remark']),
            'cpc': yes(cells.get(COL['cpc'])),
            'itr_v': yes(cells.get(COL['itr_v'])),
            'computation': yes(cells.get(COL['computation'])),
            'financial_statement': yes(cells.get(COL['financial_statement'])),
            'challan': yes(cells.get(COL['challan'])),
            'wp_group': cells.get(COL['wp_group']),
            'bill_no': cells.get(COL['bill_no']),
            'remarks': cells.get(COL['remarks']),
        })

    return people, skipped


def emit(people, skipped, fy, source):
    p = print
    b = lambda v: 'TRUE' if v else 'FALSE'

    p('-- ITR register import')
    p(f'-- Source: {source}  (sheet {SHEET!r})')
    p(f'-- Financial year {fy} — the year the returns report on.')
    p(f'-- {len(people)} return(s).')
    p('--')
    p('-- Clients match on PAN and filings on (client, financial year), so')
    p('-- re-running updates rows in place. Nothing is deleted.')
    p('--')
    p('-- Run supabase/sql/add-itr-register.sql first.')
    p()

    if skipped:
        p(f'-- {len(skipped)} row(s) skipped for want of a usable PAN:')
        for rnum, name, why in skipped:
            p(f'--   row {rnum}: {name}  [{why}]')
        p('-- PAN is the client key; add it to the sheet and re-run to pick them up.')
        p()

    if not people:
        p('-- Nothing to import.')
        return

    p('BEGIN;')
    p()
    p("""CREATE TEMP TABLE itr_stage (
  pan TEXT, name TEXT, file_no TEXT, responsible TEXT, password TEXT,
  mobile TEXT, email TEXT, itr_form TEXT, status TEXT, filed_on DATE,
  regime TEXT, is_audit BOOLEAN, business_income BOOLEAN, due_date DATE,
  data_note TEXT, status_note TEXT, partner_remark TEXT,
  cpc BOOLEAN, itr_v BOOLEAN, computation BOOLEAN,
  financial_statement BOOLEAN, challan BOOLEAN,
  wp_group TEXT, bill_no TEXT, remarks TEXT
) ON COMMIT DROP;""")
    p()
    p('INSERT INTO itr_stage VALUES')
    for i, r in enumerate(people):
        end = ',' if i < len(people) - 1 else ';'
        p(f"  ({q(r['pan'])}, {q(r['name'])}, {q(r['file_no'])}, {q(r['responsible'])}, "
          f"{q(r['password'])}, {q(r['mobile'])}, {q(r['email'])}, {q(r['itr_form'])}, "
          f"{q(r['status'])}, {q(r['filed_on'])}, {q(r['regime'])}, {b(r['is_audit'])}, "
          f"{b(r.get('business_income', False))}, "
          f"{q(r['due_date'])}, {q(r['data_note'])}, {q(r['status_note'])}, "
          f"{q(r['partner_remark'])}, {b(r['cpc'])}, {b(r['itr_v'])}, {b(r['computation'])}, "
          f"{b(r['financial_statement'])}, {b(r['challan'])}, {q(r['wp_group'])}, "
          f"{q(r['bill_no'])}, {q(r['remarks'])}){end}")
    p()

    p('-- ============================================')
    p('-- CLIENTS  (one per PAN)')
    p('-- ============================================')
    p('-- COALESCE on the contact fields: a client already on the books is known')
    p('-- better elsewhere than by this sheet, and its blanks must not erase that.')
    p('-- The name is taken from here, because the ITR list names the person')
    p('-- ("DINESH KANJIBHAI TUKADIA") where the GST sheet names the business.')
    p('--')
    p('-- itr_applicable is set TRUE, but never for a client already marked as a')
    p('-- non-filer: appearing on both sheets is a contradiction for a person to')
    p('-- resolve, not for an import to overwrite.')
    p("""INSERT INTO clients (
  id, name, pan, file_number, contact, mobile_number, email, email_id,
  itr_portal_password, status, itr_applicable, created_at, updated_at)
SELECT
  'client:pan:' || s.pan, s.name, s.pan, s.file_no,
  s.mobile, s.mobile, s.email, s.email, s.password,
  'Active', TRUE, NOW(), NOW()
FROM itr_stage s
ON CONFLICT (pan) WHERE pan IS NOT NULL DO UPDATE SET
  file_number         = COALESCE(clients.file_number, EXCLUDED.file_number),
  contact             = COALESCE(clients.contact, EXCLUDED.contact),
  mobile_number       = COALESCE(clients.mobile_number, EXCLUDED.mobile_number),
  email               = COALESCE(clients.email, EXCLUDED.email),
  email_id            = COALESCE(clients.email_id, EXCLUDED.email_id),
  itr_portal_password = COALESCE(EXCLUDED.itr_portal_password, clients.itr_portal_password),
  itr_applicable      = (clients.client_type <> 'Non-filer'),
  updated_at          = NOW();""")
    p()

    p('-- ============================================')
    p('-- FILINGS  (one per client per year)')
    p('-- ============================================')
    p('-- The responsible person is matched to a user on full name, which is how')
    p('-- this sheet writes them ("KRUNAL ROY"), unlike the GST sheet which uses')
    p('-- first names only. LATERAL with LIMIT 1 so an ambiguous match cannot fan')
    p('-- the row out; an unmatched name keeps the text and leaves the id NULL.')
    p(f"""INSERT INTO itr_filings (
  id, client_id, financial_year, itr_form, status, data_note, status_note,
  partner_remark, regime, filed_on, is_audit, business_income, due_date,
  cpc, itr_v, computation, financial_statement, challan,
  wp_group, bill_number, responsible_person_id, responsible_person_name,
  remarks, created_at, updated_at)
SELECT
  'itrfil:' || s.pan || ':' || {q(fy)},
  c.id, {q(fy)}, s.itr_form, s.status, s.data_note, s.status_note,
  s.partner_remark, s.regime, s.filed_on, s.is_audit,
  -- Never overwritten on re-import: the sheet does not carry this, so a value
  -- set in the app is the only one there is.
  COALESCE(NULLIF(s.business_income, FALSE), FALSE), s.due_date,
  s.cpc, s.itr_v, s.computation, s.financial_statement, s.challan,
  s.wp_group, s.bill_no, u.id, s.responsible,
  s.remarks, NOW(), NOW()
FROM itr_stage s
JOIN clients c ON c.pan = s.pan
LEFT JOIN LATERAL (
  SELECT id FROM users
  WHERE s.responsible IS NOT NULL
    AND LOWER(TRIM(name)) = LOWER(TRIM(s.responsible))
  ORDER BY id
  LIMIT 1
) u ON TRUE
ON CONFLICT (client_id, financial_year) DO UPDATE SET
  itr_form                = EXCLUDED.itr_form,
  status                  = EXCLUDED.status,
  data_note               = EXCLUDED.data_note,
  status_note             = EXCLUDED.status_note,
  partner_remark          = EXCLUDED.partner_remark,
  regime                  = EXCLUDED.regime,
  filed_on                = EXCLUDED.filed_on,
  is_audit                = EXCLUDED.is_audit,
  business_income         = itr_filings.business_income,
  -- Recomputed from the flags as they end up, so an app-set business_income is
  -- not undone by the sheet's assumption of 31 July.
  due_date                = MAKE_DATE(
                              (SPLIT_PART(EXCLUDED.financial_year, '-', 1))::INT + 1,
                              CASE WHEN EXCLUDED.is_audit THEN 10
                                   WHEN itr_filings.business_income THEN 8 ELSE 7 END,
                              31),
  cpc                     = EXCLUDED.cpc,
  itr_v                   = EXCLUDED.itr_v,
  computation             = EXCLUDED.computation,
  financial_statement     = EXCLUDED.financial_statement,
  challan                 = EXCLUDED.challan,
  wp_group                = EXCLUDED.wp_group,
  bill_number             = EXCLUDED.bill_number,
  responsible_person_id   = EXCLUDED.responsible_person_id,
  responsible_person_name = EXCLUDED.responsible_person_name,
  remarks                 = EXCLUDED.remarks,
  updated_at              = NOW();""")
    p()
    p('COMMIT;')
    p()
    p('-- ============================================')
    p('-- VERIFY')
    p('-- ============================================')
    p(f"""SELECT status, COUNT(*)
FROM itr_filings WHERE financial_year = {q(fy)}
GROUP BY status ORDER BY COUNT(*) DESC;""")
    p()
    p('-- Responsible people who match no user account:')
    p(f"""-- SELECT DISTINCT responsible_person_name FROM itr_filings
--  WHERE financial_year = {q(fy)}
--    AND responsible_person_id IS NULL AND responsible_person_name IS NOT NULL;""")


def main():
    sys.stdout.reconfigure(encoding='utf-8', newline='\n')
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
    if not args:
        sys.exit(__doc__)

    global SHEET
    SHEET = opts.get('sheet', SHEET)
    fy = opts.get('fy') or (re.search(r'(\d{4}-\d{2})', SHEET) or re.search(r'(\d{4}-\d{2})', args[0])).group(1)

    people, skipped = parse(args[0], fy)
    emit(people, skipped, fy, args[0])


if __name__ == '__main__':
    main()
