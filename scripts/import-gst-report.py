"""Turn "GST Report <FY>.xlsx" into SQL for the GST compliance register.

    python scripts/import-gst-report.py "GST Report 2026-27.xlsx" > gst-import.sql

Then run gst-import.sql in the Supabase SQL editor, after
supabase/sql/add-gst-compliance-register.sql.

The spreadsheet is one row per GSTIN with twelve GSTR-1 / GSTR-3B column pairs
across it. This reads that layout and emits three set-based inserts — clients
keyed by PAN, registrations keyed by GSTIN, filings keyed by (registration,
return, period) — so re-running it updates rows in place rather than duplicating
them. Nothing is deleted.

Cell conventions this relies on, all taken from the sheet as it stands:

    (blank)             nothing has happened yet        -> no row emitted
    SEND MSG            client chased for data          -> Message Sent
    NOT PROVIED DATA    client did not supply it        -> Data Not Provided
    DATA RECEIVED       data in hand, not yet filed     -> Data Received
    OTP                 waiting on the client's OTP     -> OTP Awaited
    SEND CHALLAN        challan out, awaiting payment   -> Challan Sent
    NIL                 nil return                      -> Nil
    a date              filed on that date              -> Filed + filed_on

Stdlib only, so it runs on a plain Python install with nothing to pip install.
"""

import datetime
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
ONS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

# Excel's day zero. 1899-12-30, not 12-31, because Excel keeps Lotus 1-2-3's
# phantom 29 Feb 1900 and the two errors cancel for every date after March 1900.
EXCEL_EPOCH = datetime.date(1899, 12, 30)

SHEET = '2026-27'          # overridden by --sheet
HEADER_ROW = 3             # 'Sr. No. | CODE NO | ...'
FIRST_MONTH_COL = 13       # April's GSTR-1; pairs run (GSTR-1, GSTR-3B) x 12

# Column positions on the header row.
COL = {
    'code_no': 1, 'responsible': 2, 'pan': 3, 'party_name': 4, 'gstin': 5,
    'portal_user_id': 6, 'portal_password': 7, 'mobile': 8, 'email': 9,
    'contact_person': 10, 'billing': 11, 'freq': 12,
}
COL_CASH, COL_CREDIT, COL_RECLAIMED = 37, 38, 39

FREQUENCY = {'M': 'Monthly', 'Q': 'Quarterly', 'C': 'Composition', 'NA': 'Not Applicable'}
BILLING = {'ANNUAL': 'Annual', 'QUARTER': 'Quarter', 'HALF YEAR': 'Half Year', 'NA': 'NA', 'MONTHLY': 'Monthly'}

MARKERS = {
    'DATA RECEIVED': 'Data Received',
    'SEND MSG': 'Message Sent',
    'SEND CHALLAN': 'Challan Sent',
    'OTP': 'OTP Awaited',
    'NIL': 'Nil',
    'NOT PROVIED DATA': 'Data Not Provided',    # spelling as it appears in the sheet
    'NOT PROVIDED DATA': 'Data Not Provided',
    'NOT PROVIDED': 'Data Not Provided',
}

MONTH_NAMES = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
               'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH']

# Statutory monthly due dates. Applied only to monthly filers — a quarterly or
# composition registration is on a different cycle, and asserting the monthly
# date for it would put a wrong deadline in front of the person doing the work.
DUE_DAY = {'GSTR-1': 11, 'GSTR-3B': 20}


# ---------------------------------------------------------------- xlsx reading

def _col_index(ref):
    m = re.match(r'([A-Z]+)', ref or '')
    n = 0
    for ch in m.group(1) if m else '':
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_sheet(path, sheet_name):
    """Yield (row_number, {column_index: text}) for one worksheet."""
    with zipfile.ZipFile(path) as z:
        try:
            ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in si.iter(f'{NS}t'))
                       for si in ss.findall(f'{NS}si')]
        except KeyError:
            strings = []

        wb = ET.fromstring(z.read('xl/workbook.xml'))
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rmap = {r.get('Id'): r.get('Target') for r in rels}

        target = None
        for sh in wb.find(f'{NS}sheets'):
            if sh.get('name') == sheet_name:
                target = ('xl/' + rmap[sh.get(f'{ONS}id')].lstrip('/')).lstrip('/')
        if target is None:
            names = [sh.get('name') for sh in wb.find(f'{NS}sheets')]
            sys.exit(f'No sheet named {sheet_name!r}. Sheets: {names}')

        root = ET.fromstring(z.read(target))
        body = root.find(f'{NS}sheetData')
        for row in [] if body is None else body.findall(f'{NS}row'):
            cells = {}
            for c in row.findall(f'{NS}c'):
                t, v = c.get('t'), c.find(f'{NS}v')
                if t == 'inlineStr':
                    txt = ''.join(x.text or '' for x in c.iter(f'{NS}t'))
                elif v is None:
                    txt = ''
                elif t == 's':
                    i = int(v.text)
                    txt = strings[i] if i < len(strings) else ''
                else:
                    txt = v.text or ''
                if txt.strip():
                    cells[_col_index(c.get('r'))] = txt.strip()
            yield int(row.get('r')), cells


# ------------------------------------------------------------------- utilities

def q(value):
    """A SQL literal, NULL for anything empty."""
    if value is None:
        return 'NULL'
    s = str(value).strip()
    if not s:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"


def num(value):
    """A SQL numeric literal, 0 when the cell is blank or not a number."""
    try:
        return repr(round(float(str(value).replace(',', '').strip()), 2))
    except (TypeError, ValueError):
        return '0'


def as_date(value):
    """An Excel serial read as a date, or None if the cell is not one."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    # Anything outside this window is a quantity that happens to be numeric —
    # a ledger balance pasted into a filing column, say — not a date.
    if not 40000 < n < 60000:
        return None
    return EXCEL_EPOCH + datetime.timedelta(days=int(n))


def fy_years(fy):
    """'2026-27' -> (2026, 2027)."""
    m = re.match(r'(\d{4})-(\d{2,4})$', fy)
    if not m:
        sys.exit(f'Financial year {fy!r} is not in the form 2026-27.')
    start = int(m.group(1))
    return start, start + 1


def month_period(fy, index):
    """Period metadata for the index-th month of a financial year (0 = April)."""
    y1, y2 = fy_years(fy)
    month = 4 + index if index < 9 else index - 8
    year = y1 if index < 9 else y2
    start = datetime.date(year, month, 1)
    end = (datetime.date(year + (month == 12), month % 12 + 1, 1)
           - datetime.timedelta(days=1))
    label = f"{MONTH_NAMES[index]}'{str(year)[2:]}"
    return f'{year}-{month:02d}', label, start, end


def due_date(period_end, return_type):
    """Statutory due date: the Nth of the month after the period."""
    day = DUE_DAY.get(return_type)
    if not day:
        return None
    nxt = period_end + datetime.timedelta(days=1)
    return datetime.date(nxt.year, nxt.month, day)


# ----------------------------------------------------------------------- parse

def parse(path, sheet_name, fy):
    rows = dict(read_sheet(path, sheet_name))
    registrations, filings = [], []
    skipped = []

    for rnum in sorted(r for r in rows if r > HEADER_ROW):
        cells = rows[rnum]
        gstin = (cells.get(COL['gstin']) or '').upper().replace(' ', '')
        pan = (cells.get(COL['pan']) or '').upper().replace(' ', '')
        name = cells.get(COL['party_name']) or ''

        # A GSTIN is the key for a registration and a PAN the key for a client.
        # Without both there is nothing to attach the filings to, so the row is
        # reported rather than guessed at.
        if not gstin or not pan or not name:
            if cells:
                skipped.append((rnum, name or '(no name)', pan or '(no PAN)', gstin or '(no GSTIN)'))
            continue

        freq_raw = (cells.get(COL['freq']) or 'M').upper()
        billing_raw = (cells.get(COL['billing']) or '').upper()

        registrations.append({
            'gstin': gstin,
            'pan': pan,
            'name': name,
            'code_no': cells.get(COL['code_no']),
            'responsible': cells.get(COL['responsible']),
            'portal_user_id': cells.get(COL['portal_user_id']),
            'portal_password': cells.get(COL['portal_password']),
            'mobile': cells.get(COL['mobile']),
            'email': cells.get(COL['email']),
            'contact_person': cells.get(COL['contact_person']),
            'billing': BILLING.get(billing_raw),
            'frequency': FREQUENCY.get(freq_raw, 'Monthly'),
            'cash': cells.get(COL_CASH),
            'credit': cells.get(COL_CREDIT),
            'reclaimed': cells.get(COL_RECLAIMED),
        })

        monthly = FREQUENCY.get(freq_raw, 'Monthly') == 'Monthly'

        for index in range(12):
            for offset, return_type in ((0, 'GSTR-1'), (1, 'GSTR-3B')):
                raw = cells.get(FIRST_MONTH_COL + index * 2 + offset)
                if not raw:
                    continue

                key, label, start, end = month_period(fy, index)
                filed = as_date(raw)
                if filed:
                    status, remarks = 'Filed', None
                else:
                    marker = re.sub(r'\s+', ' ', raw.upper()).strip()
                    status = MARKERS.get(marker)
                    # An unrecognised note is still information the office wrote
                    # down. It is carried through as a remark instead of being
                    # dropped, with the row left in its default state.
                    if status is None:
                        status, remarks = 'Pending', raw
                    else:
                        remarks = None

                filings.append({
                    'gstin': gstin,
                    'return_type': return_type,
                    'period_key': key,
                    'period_label': label,
                    'period_start': start,
                    'period_end': end,
                    'due_date': due_date(end, return_type) if monthly else None,
                    'status': status,
                    'filed_on': filed,
                    'remarks': remarks,
                })

    return registrations, filings, skipped


# ------------------------------------------------------------------------- SQL

def emit(registrations, filings, skipped, fy, source):
    pans = {}
    for r in registrations:
        pans.setdefault(r['pan'], r)

    p = print
    p('-- GST compliance register import')
    p(f'-- Source: {source}  (sheet {SHEET!r}, financial year {fy})')
    p(f'-- {len(pans)} client(s), {len(registrations)} registration(s), {len(filings)} filing(s).')
    p('--')
    p('-- Generated by scripts/import-gst-report.py. Re-running updates rows in')
    p('-- place — clients match on PAN, registrations on GSTIN, filings on')
    p('-- (registration, return, period). Nothing is deleted.')
    p('--')
    p('-- Run supabase/sql/add-gst-compliance-register.sql first.')
    p()

    if skipped:
        p(f'-- {len(skipped)} row(s) skipped for want of a name, PAN or GSTIN:')
        for rnum, name, pan, gstin in skipped:
            p(f'--   row {rnum}: {name} / {pan} / {gstin}')
        p()

    p('BEGIN;')
    p()
    p('-- ============================================')
    p('-- STAGING')
    p('-- ============================================')
    p('-- Dropped with the transaction. Loading into staging first lets the real')
    p('-- inserts be set-based, so PAN -> client and GSTIN -> registration are')
    p('-- resolved by join rather than by 136 hand-written subqueries.')
    p()
    p("""CREATE TEMP TABLE gst_stage_reg (
  gstin TEXT, pan TEXT, party_name TEXT, code_no TEXT, responsible TEXT,
  portal_user_id TEXT, portal_password TEXT, mobile TEXT, email TEXT,
  contact_person TEXT, billing TEXT, frequency TEXT,
  cash NUMERIC, credit NUMERIC, reclaimed NUMERIC
) ON COMMIT DROP;""")
    p()
    p('INSERT INTO gst_stage_reg VALUES')
    for i, r in enumerate(registrations):
        end = ',' if i < len(registrations) - 1 else ';'
        p(f"  ({q(r['gstin'])}, {q(r['pan'])}, {q(r['name'])}, {q(r['code_no'])}, "
          f"{q(r['responsible'])}, {q(r['portal_user_id'])}, {q(r['portal_password'])}, "
          f"{q(r['mobile'])}, {q(r['email'])}, {q(r['contact_person'])}, "
          f"{q(r['billing'])}, {q(r['frequency'])}, "
          f"{num(r['cash'])}, {num(r['credit'])}, {num(r['reclaimed'])}){end}")
    p()

    p("""CREATE TEMP TABLE gst_stage_filing (
  gstin TEXT, return_type TEXT, period_key TEXT, period_label TEXT,
  period_start DATE, period_end DATE, due_date DATE,
  status TEXT, filed_on DATE, remarks TEXT
) ON COMMIT DROP;""")
    p()
    p('INSERT INTO gst_stage_filing VALUES')
    for i, f in enumerate(filings):
        end = ',' if i < len(filings) - 1 else ';'
        p(f"  ({q(f['gstin'])}, {q(f['return_type'])}, {q(f['period_key'])}, "
          f"{q(f['period_label'])}, {q(f['period_start'])}, {q(f['period_end'])}, "
          f"{q(f['due_date'])}, {q(f['status'])}, {q(f['filed_on'])}, {q(f['remarks'])}){end}")
    p()

    p('-- ============================================')
    p('-- CLIENTS  (one per PAN)')
    p('-- ============================================')
    p('-- DISTINCT ON collapses the PANs holding more than one registration to a')
    p('-- single client, which is the whole point of keying on PAN.')
    p()
    p("""INSERT INTO clients (id, name, pan, contact, mobile_number, email, email_id, status, created_at, updated_at)
SELECT DISTINCT ON (s.pan)
  'client:pan:' || s.pan, s.party_name, s.pan,
  s.mobile, s.mobile, s.email, s.email, 'Active', NOW(), NOW()
FROM gst_stage_reg s
ORDER BY s.pan, s.gstin
ON CONFLICT (pan) WHERE pan IS NOT NULL DO UPDATE SET
  name          = EXCLUDED.name,
  contact       = COALESCE(clients.contact, EXCLUDED.contact),
  mobile_number = COALESCE(clients.mobile_number, EXCLUDED.mobile_number),
  email         = COALESCE(clients.email, EXCLUDED.email),
  email_id      = COALESCE(clients.email_id, EXCLUDED.email_id),
  updated_at    = NOW();""")
    p()

    p('-- ============================================')
    p('-- REGISTRATIONS  (one per GSTIN)')
    p('-- ============================================')
    p('-- The responsible person is matched to a user by first name, which is how')
    p('-- the sheet records them ("Harshangi", "Kishan"). LATERAL with LIMIT 1 so')
    p('-- an ambiguous match cannot fan the row out into several. Names that match')
    p('-- nobody keep the text and leave the id NULL — the register still has to')
    p('-- say who is responsible when that person has no login.')
    p()
    p("""INSERT INTO client_gst_registrations (
  id, client_id, code_no, gstin, trade_name, filing_frequency,
  responsible_person_id, responsible_person_name, billing_frequency,
  portal_user_id, portal_password, contact_person, mobile_number, email_id,
  cash_ledger, credit_ledger, reclaimed_amount, status, created_at, updated_at)
SELECT
  'gstreg:' || s.gstin, c.id, s.code_no, s.gstin, s.party_name, s.frequency,
  u.id, s.responsible, s.billing,
  s.portal_user_id, s.portal_password, s.contact_person, s.mobile, s.email,
  s.cash, s.credit, s.reclaimed, 'Active', NOW(), NOW()
FROM gst_stage_reg s
JOIN clients c ON c.pan = s.pan
LEFT JOIN LATERAL (
  SELECT id FROM users
  WHERE s.responsible IS NOT NULL
    AND SPLIT_PART(LOWER(name), ' ', 1) = SPLIT_PART(LOWER(TRIM(s.responsible)), ' ', 1)
  ORDER BY id
  LIMIT 1
) u ON TRUE
ON CONFLICT (gstin) DO UPDATE SET
  client_id               = EXCLUDED.client_id,
  code_no                 = EXCLUDED.code_no,
  trade_name              = EXCLUDED.trade_name,
  filing_frequency        = EXCLUDED.filing_frequency,
  responsible_person_id   = EXCLUDED.responsible_person_id,
  responsible_person_name = EXCLUDED.responsible_person_name,
  billing_frequency       = EXCLUDED.billing_frequency,
  portal_user_id          = EXCLUDED.portal_user_id,
  portal_password         = EXCLUDED.portal_password,
  contact_person          = EXCLUDED.contact_person,
  mobile_number           = EXCLUDED.mobile_number,
  email_id                = EXCLUDED.email_id,
  cash_ledger             = EXCLUDED.cash_ledger,
  credit_ledger           = EXCLUDED.credit_ledger,
  reclaimed_amount        = EXCLUDED.reclaimed_amount,
  updated_at              = NOW();""")
    p()

    p('-- ============================================')
    p('-- FILINGS  (one per return per period)')
    p('-- ============================================')
    p('-- Only the cells that were filled in. Untouched months are left absent')
    p('-- rather than written as Pending rows, so the register distinguishes')
    p('-- "not started" from "generated but unworked".')
    p()
    p('-- The id is derived from the registration id, not the GSTIN, so it matches')
    p('-- byte for byte what the app computes when someone edits the same cell.')
    p('-- A registration backfilled from clients.gst is keyed on the client id')
    p('-- rather than the GSTIN, and deriving from the GSTIN here would give one')
    p('-- cell two different primary keys depending on who wrote it first.')
    p(f"""INSERT INTO gst_filings (
  id, registration_id, return_type, financial_year, period_key, period_label,
  period_start, period_end, due_date, status, filed_on, remarks,
  created_at, updated_at)
SELECT
  'gstfil:' || REPLACE(r.id, 'gstreg:', '') || ':' || f.return_type || ':' || f.period_key,
  r.id, f.return_type, {q(fy)}, f.period_key, f.period_label,
  f.period_start, f.period_end, f.due_date, f.status, f.filed_on, f.remarks,
  NOW(), NOW()
FROM gst_stage_filing f
JOIN client_gst_registrations r ON r.gstin = f.gstin
ON CONFLICT (registration_id, return_type, period_key) DO UPDATE SET
  period_label = EXCLUDED.period_label,
  period_start = EXCLUDED.period_start,
  period_end   = EXCLUDED.period_end,
  due_date     = EXCLUDED.due_date,
  status       = EXCLUDED.status,
  filed_on     = EXCLUDED.filed_on,
  remarks      = EXCLUDED.remarks,
  updated_at   = NOW();""")
    p()

    p('COMMIT;')
    p()
    p('-- ============================================')
    p('-- VERIFY')
    p('-- ============================================')
    p(f"""SELECT
  (SELECT COUNT(*) FROM clients WHERE pan IS NOT NULL)                  AS clients_with_pan,
  (SELECT COUNT(*) FROM client_gst_registrations)                       AS registrations,
  (SELECT COUNT(*) FROM gst_filings WHERE financial_year = {q(fy)})     AS filings,
  (SELECT COUNT(*) FROM gst_filings
     WHERE financial_year = {q(fy)} AND status = 'Filed')               AS filed,
  (SELECT COUNT(*) FROM client_gst_registrations
     WHERE responsible_person_id IS NULL
       AND responsible_person_name IS NOT NULL)                         AS unmatched_staff;""")
    p()
    p('-- Registrations whose responsible person matched no user, if any:')
    p("""-- SELECT DISTINCT responsible_person_name FROM client_gst_registrations
--   WHERE responsible_person_id IS NULL AND responsible_person_name IS NOT NULL;""")


def main():
    # Redirected stdout on Windows defaults to the console codepage, which
    # mangles both the comment punctuation and any non-ASCII client name into
    # the SQL file. The output is read back by Postgres, so it has to be UTF-8.
    sys.stdout.reconfigure(encoding='utf-8', newline='\n')

    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)

    if not args:
        sys.exit(__doc__)

    path = args[0]
    global SHEET
    SHEET = opts.get('sheet', SHEET)
    fy = opts.get('fy') or (SHEET if re.match(r'\d{4}-\d{2}$', SHEET) else '2026-27')

    registrations, filings, skipped = parse(path, SHEET, fy)
    if not registrations:
        sys.exit(f'No usable rows found on sheet {SHEET!r}.')
    emit(registrations, filings, skipped, fy, path)


if __name__ == '__main__':
    main()
