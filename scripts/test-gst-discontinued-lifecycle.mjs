// node scripts/test-gst-discontinued-lifecycle.mjs <path-to-pglite-package>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { transform } from 'esbuild';

const { PGlite } = await import(pathToFileURL(path.resolve(process.argv[2], 'dist/index.js')).href);
const helper = await readFile(new URL('../supabase/functions/server/gstLifecycle.ts', import.meta.url), 'utf8');
const { code } = await transform(helper, { loader: 'ts', format: 'esm' });
const { gstClientVisibleInYear: visible } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
assert.equal(visible(null, '2030-31'), true);
assert.equal(visible(undefined, '2030-31'), true);
assert.equal(visible(2026, '2025-26'), true);
assert.equal(visible(2026, '2026-27'), true);
assert.equal(visible(2026, '2027-28'), true);
assert.equal(visible(2026, '2028-29'), false);
assert.equal(visible(2099, '2100-01'), true);
assert.equal(visible(2099, '2101-02'), false);

const db = new PGlite();
try {
  await db.exec(`
    CREATE TABLE clients (id TEXT PRIMARY KEY, client_type TEXT DEFAULT 'Filing');
    CREATE TABLE client_gst_registrations (id TEXT PRIMARY KEY, client_id TEXT REFERENCES clients(id));
    CREATE TABLE gst_filings (id TEXT PRIMARY KEY, registration_id TEXT REFERENCES client_gst_registrations(id), financial_year TEXT NOT NULL, status TEXT NOT NULL);
    INSERT INTO clients (id) VALUES ('legacy'), ('new'), ('unaffected');
    INSERT INTO client_gst_registrations VALUES ('old-reg', 'legacy'), ('new-reg', 'new'), ('second-reg', 'new');
    INSERT INTO gst_filings VALUES ('old-filing', 'old-reg', '2025-26', 'Discontinued');
  `);
  const migration = await readFile(new URL('../supabase/sql/add-gst-discontinued-client-lifecycle.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const client = async id => (await db.query('SELECT * FROM clients WHERE id = $1', [id])).rows[0];
  assert.equal((await client('legacy')).client_type, 'Non-filer');
  assert.equal((await client('legacy')).gst_discontinued_fy, 2025);
  await db.exec(`INSERT INTO gst_filings VALUES ('new-filing', 'new-reg', '2026-27', 'Nil');`);
  assert.equal((await client('new')).client_type, 'Filing');
  await db.exec(`UPDATE gst_filings SET status = 'Discontinued' WHERE id = 'new-filing';`);
  assert.equal((await client('new')).client_type, 'Non-filer');
  assert.equal((await client('new')).gst_discontinued_fy, 2026);
  await db.exec(`INSERT INTO gst_filings VALUES ('second-filing', 'second-reg', '2027-28', 'Discontinued');`);
  assert.equal((await client('new')).gst_discontinued_fy, 2026, 'later filings must not extend cutoff');
  await db.exec(`UPDATE gst_filings SET status = 'Filed' WHERE id = 'new-filing';`);
  assert.equal((await client('new')).client_type, 'Non-filer', 'historical edits must not reactivate client');
  assert.equal((await client('unaffected')).client_type, 'Filing');
  await assert.rejects(db.exec(`INSERT INTO gst_filings VALUES ('invalid', 'new-reg', '2026-29', 'Discontinued');`), /Invalid financial year/);
  await db.exec(migration);
  assert.equal((await client('new')).gst_discontinued_fy, 2026, 'migration is repeatable');
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM gst_filings')).rows[0].n, 3);
  console.log('PASS: Non-filer transition, existing data backfill, extra-year cutoff, historical visibility, multiple registrations, repeat saves, invalid year and retained history');
} finally {
  await db.close();
}
