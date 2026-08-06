"""Turn the annual-return sheets of "GST Report <FY>.xlsx" into SQL.

    python scripts/import-gst-annual.py "GST Report 2026-27.xlsx" > gst-annual.sql

Reads two sheets:

    GSTR-9 & 9C                 GSTR-9 and GSTR-9C for regular registrations
    Annual Return Composition   GSTR-4 for composition dealers

Run after supabase/sql/add-gst-compliance-register.sql and the monthly import,
which is what creates the registrations these attach to.

THE YEAR
--------
An annual return belongs to the year it reports on, not the year it is worked
in. The sheets live in the 2026-27 workbook but cover **FY 2025-26**:

    GSTR-4  for 2025-26 is due 30 June 2026     — the sheet's own header says so,
                                                  and its dates are 27-30 June 2026
    GSTR-9  for 2025-26 is due 31 December 2026 — which is why every date column
    GSTR-9C for 2025-26   "        "              on that sheet is still empty

Recording them under 2026-27 would put a deadline a year early on a year that
has not finished. Override with --fy= if a future workbook breaks the pattern.

APPLICABILITY
-------------
The GSTR-9 / GSTR-9C columns hold YES or NO, and neither means "filed" — they
say whether the return is owed at all. So:

    YES + no date    -> Pending          the return is owed and not yet done
    YES + a date     -> Filed            done, on that date
    NO               -> Not Applicable   recorded deliberately, so that next year
                                         nobody has to work it out again

Stdlib only, and the xlsx reader is shared with import-gst-report.py.
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

read_sheet, q, as_date, fy_years = _mod.read_sheet, _mod.q, _mod.as_date, _mod.fy_years

# The workbook's annual sheets cover the year before the workbook's own.
DEFAULT_ANNUAL_FY_OFFSET = -1

# sheet name -> (header row, {column index: field})
SHEETS = {
    'GSTR-9 & 9C': {
        'header': 4,
        'code_no': 1, 'party_name': 2, 'gstin': 3, 'frequency': 4, 'turnover': 5,
        'returns': [
            {'type': 'GSTR-9', 'flag': 6, 'date': 9},
            {'type': 'GSTR-9C', 'flag': 7, 'date': 10},
        ],
        'responsible': 8,
        'target_date': 11,
    },
    'Annual Return Composition': {
        'header': 4,
        'code_no': 1, 'party_name': 2, 'gstin': 3, 'frequency': 4, 'turnover': None,
        # No YES/NO column: every row on this sheet is a composition dealer who
        # owes GSTR-4, and the single column holds the filing date directly.
        'returns': [
            {'type': 'GSTR-4', 'flag': None, 'date': 5},
        ],
        'responsible': None,
        'target_date': None,
    },
}

# 31 December / 30 June of the year after the financial year ends.
DUE = {'GSTR-9': (12, 31), 'GSTR-9C': (12, 31), 'GSTR-4': (6, 30)}

MARKERS = {
    'DATA RECEIVED': 'Data Received',
    'SEND MSG': 'Message Sent',
    'SEND CHALLAN': 'Challan Sent',
    'OTP': 'OTP Awaited',
    'NIL': 'Nil',
    'NOT FILE RETUNE': 'Data Not Provided',    # spelling as it appears in the sheet
    'NOT FILED': 'Data Not Provided',
    'NOT PROVIED DATA': 'Data Not Provided',
}

GSTIN_RE = re.compile(r'^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]{3}$')


def annual_fy(workbook_fy):
    """The year the annual sheets in a given workbook actually cover."""
    start, _ = fy_years(workbook_fy)
    y = start + DEFAULT_ANNUAL_FY_OFFSET
    return f'{y}-{str(y + 1)[2:]}'


def due_date(return_type, fy):
    start, _ = fy_years(fy)
    month, day = DUE[return_type]
    return datetime.date(start + 1, month, day)


def parse(path, fy):
    filings, skipped = [], []
    start, _ = fy_years(fy)
    period_start = datetime.date(start, 4, 1)
    period_end = datetime.date(start + 1, 3, 31)

    for sheet, spec in SHEETS.items():
        try:
            rows = dict(read_sheet(path, sheet))
        except SystemExit:
            print(f'-- sheet {sheet!r} not present, skipped', file=sys.stderr)
            continue

        for rnum in sorted(r for r in rows if r > spec['header']):
            cells = rows[rnum]
            name = cells.get(spec['party_name']) or ''
            gstin = (cells.get(spec['gstin']) or '').upper().replace(' ', '')
            if not name:
                continue

            # Without a GSTIN there is nothing to attach the return to, and the
            # party name alone is not safe to match on: two rows on this sheet
            # carry the same company name and are different registrations in
            # different states.
            if not GSTIN_RE.match(gstin):
                skipped.append((sheet, rnum, name, gstin or '(blank)'))
                continue

            for ret in spec['returns']:
                raw_flag = (cells.get(ret['flag']) or '').strip().upper() if ret['flag'] else 'YES'
                raw_date = cells.get(ret['date']) if ret['date'] else None

                # A blank flag on the GSTR-9 sheet means nobody has decided yet;
                # that is not the same as "not applicable" and is left alone.
                if ret['flag'] and not raw_flag:
                    continue

                filed = as_date(raw_date) if raw_date else None
                if raw_flag == 'NO':
                    status, remarks = 'Not Applicable', None
                elif filed:
                    status, remarks = 'Filed', None
                elif raw_date:
                    marker = re.sub(r'\s+', ' ', str(raw_date).upper()).strip()
                    status = MARKERS.get(marker)
                    status, remarks = (status, None) if status else ('Pending', str(raw_date))
                else:
                    status, remarks = 'Pending', None

                filings.append({
                    'gstin': gstin,
                    'return_type': ret['type'],
                    'period_key': fy,
                    'period_label': f'FY {fy}',
                    'period_start': period_start,
                    'period_end': period_end,
                    'due_date': due_date(ret['type'], fy),
                    'status': status,
                    'filed_on': filed,
                    'remarks': remarks,
                })

    return filings, skipped


def emit(filings, skipped, fy, workbook_fy, source):
    p = print
    p('-- GST annual returns import')
    p(f'-- Source: {source}  (annual sheets of the {workbook_fy} workbook)')
    p(f'-- Recorded against FINANCIAL YEAR {fy} — the year the returns report on,')
    p(f'-- not the year they are worked in. See the header of this script.')
    p(f'-- {len(filings)} filing row(s).')
    p('--')
    p('-- Re-running updates rows in place, keyed on')
    p('-- (registration, return type, period). Nothing is deleted.')
    p()

    if skipped:
        p(f'-- {len(skipped)} row(s) skipped for want of a usable GSTIN:')
        for sheet, rnum, name, gstin in skipped:
            p(f'--   {sheet} row {rnum}: {name}  [{gstin}]')
        p('-- Add the GSTIN to the sheet, or the registration to the app, and re-run.')
        p()

    if not filings:
        p('-- Nothing to import.')
        return

    p('BEGIN;')
    p()
    p("""CREATE TEMP TABLE gst_stage_annual (
  gstin TEXT, return_type TEXT, period_key TEXT, period_label TEXT,
  period_start DATE, period_end DATE, due_date DATE,
  status TEXT, filed_on DATE, remarks TEXT
) ON COMMIT DROP;""")
    p()
    p('INSERT INTO gst_stage_annual VALUES')
    for i, f in enumerate(filings):
        end = ',' if i < len(filings) - 1 else ';'
        p(f"  ({q(f['gstin'])}, {q(f['return_type'])}, {q(f['period_key'])}, "
          f"{q(f['period_label'])}, {q(f['period_start'])}, {q(f['period_end'])}, "
          f"{q(f['due_date'])}, {q(f['status'])}, {q(f['filed_on'])}, {q(f['remarks'])}){end}")
    p()
    p('-- Ids derive from the registration id, exactly as the monthly import and')
    p('-- the app both do, so one cell can never end up with two primary keys.')
    p(f"""INSERT INTO gst_filings (
  id, registration_id, return_type, financial_year, period_key, period_label,
  period_start, period_end, due_date, status, filed_on, remarks,
  created_at, updated_at)
SELECT
  'gstfil:' || REPLACE(r.id, 'gstreg:', '') || ':' || a.return_type || ':' || a.period_key,
  r.id, a.return_type, {q(fy)}, a.period_key, a.period_label,
  a.period_start, a.period_end, a.due_date, a.status, a.filed_on, a.remarks,
  NOW(), NOW()
FROM gst_stage_annual a
JOIN client_gst_registrations r ON r.gstin = a.gstin
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
    composition = sorted({f['gstin'] for f in filings if f['return_type'] == 'GSTR-4'})
    if composition:
        p('-- ============================================')
        p('-- COMPOSITION FREQUENCY')
        p('-- ============================================')
        p('-- Every row on the composition sheet carries C in its Q column, which')
        p('-- is the office stating that the registration is a composition dealer.')
        p('--')
        p('-- This matters beyond a label. A composition dealer owes GSTR-4 and')
        p('-- never GSTR-1 or GSTR-3B, so a registration left on the wrong')
        p('-- frequency claims twenty-four monthly deadlines it does not have, and')
        p('-- the annual view derives its columns from the same field.')
        p('--')
        p('-- Registrations that reach here on the wrong frequency are the ones the')
        p('-- monthly sheet never listed: they were backfilled from clients.gst,')
        p('-- which records a GSTIN and no cycle at all.')
        values = ',\n    '.join(f"({q(g)})" for g in composition)
        p(f"""UPDATE client_gst_registrations r
SET filing_frequency = 'Composition',
    updated_at = NOW()
FROM (VALUES
    {values}
) AS s(gstin)
WHERE r.gstin = s.gstin
  AND r.filing_frequency <> 'Composition'
  -- Not if the monthly register has real GSTR-1/3B work against it. That would
  -- mean the two sheets genuinely disagree, which is for a person to settle.
  AND NOT EXISTS (
    SELECT 1 FROM gst_filings f
    WHERE f.registration_id = r.id
      AND f.return_type IN ('GSTR-1', 'GSTR-3B')
      AND f.status NOT IN ('Pending', 'Not Applicable')
  );""")
        p()
    p('COMMIT;')
    p()
    p('-- ============================================')
    p('-- UNMATCHED GSTINs')
    p('-- ============================================')
    p('-- The insert above joins to client_gst_registrations, so a GSTIN on the')
    p('-- sheet with no registration in the app is dropped by the join and its')
    p('-- annual return never lands. Silently. This names them.')
    p('--')
    p('-- The list is spelled out rather than read from the staging table, which')
    p('-- the COMMIT has already dropped by this point.')
    p('--')
    p('-- Anything listed here needs a client and registration added in the app,')
    p('-- then a re-run of this script.')
    gstins = sorted({f['gstin'] for f in filings})
    values = ',\n    '.join(f"({q(g)})" for g in gstins)
    p(f"""SELECT s.gstin AS gstin_on_sheet_with_no_registration
FROM (VALUES
    {values}
) AS s(gstin)
LEFT JOIN client_gst_registrations r ON r.gstin = s.gstin
WHERE r.id IS NULL;""")
    p()
    p('-- ============================================')
    p('-- WHAT LANDED')
    p('-- ============================================')
    p(f"""SELECT return_type, status, COUNT(*)
FROM gst_filings
WHERE financial_year = {q(fy)}
  AND return_type IN ('GSTR-9', 'GSTR-9C', 'GSTR-4')
GROUP BY return_type, status
ORDER BY return_type, status;""")


def main():
    sys.stdout.reconfigure(encoding='utf-8', newline='\n')
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
    if not args:
        sys.exit(__doc__)

    path = args[0]
    workbook_fy = opts.get('workbook-fy', '2026-27')
    fy = opts.get('fy') or annual_fy(workbook_fy)

    filings, skipped = parse(path, fy)
    emit(filings, skipped, fy, workbook_fy, path)


if __name__ == '__main__':
    main()
