import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await readFile(new URL('../supabase/functions/server/gstLifecycle.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'es2022' });
const lifecycle = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const carry = lifecycle.carryForwardDiscontinuedFilings;

const filing = (period, status, returnType = 'GSTR-1', financialYear = '2026-27') => ({
  id: `${returnType}:${period}`,
  registration_id: 'reg:1',
  return_type: returnType,
  financial_year: financialYear,
  period_key: period,
  period_label: period,
  status,
});

const rows = carry('2026-27', ['reg:1'], [
  filing('2026-05', 'Discontinued'),
  filing('2026-09', 'Pending'),
]);
const gstr1 = new Map(rows.filter(r => r.return_type === 'GSTR-1').map(r => [r.period_key, r]));
assert.equal(gstr1.has('2026-04'), false, 'months before discontinuation remain untouched');
assert.equal(gstr1.get('2026-05').carried_forward, undefined, 'the saved month remains the real row');
for (const month of ['2026-06', '2026-07', '2026-08']) {
  assert.equal(gstr1.get(month)?.status, 'Discontinued');
  assert.equal(gstr1.get(month)?.carried_forward, true);
}
assert.equal(gstr1.get('2026-09').status, 'Pending', 'an explicit later status wins');
assert.equal(gstr1.has('2026-10'), false, 'carry-forward stops after the status changes');
assert.equal(rows.some(r => r.return_type === 'GSTR-3B'), false, 'return streams remain independent');

const priorYear = carry('2026-27', ['reg:1'], [
  filing('2026-02', 'Discontinued', 'GSTR-1', '2025-26'),
]);
assert.equal(priorYear.filter(r => r.return_type === 'GSTR-1' && r.carried_forward).length, 12,
  'a prior-year discontinuation carries through the next visible year');

console.log('PASS: Discontinued carries through empty months and stops at the next explicit status');
