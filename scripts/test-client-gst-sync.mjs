// Run: node scripts/test-client-gst-sync.mjs <path-to-pglite-package>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const { PGlite } = await import(pathToFileURL(path.resolve(process.argv[2], 'dist/index.js')).href);
const db = new PGlite();
try {
  await db.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, firm_name TEXT, gst TEXT,
      gst_fees DECIMAL DEFAULT 0, gst_annual_return_fees DECIMAL DEFAULT 0
    );
    CREATE TABLE client_gst_registrations (
      id TEXT PRIMARY KEY, client_id TEXT REFERENCES clients(id), gstin TEXT UNIQUE NOT NULL,
      trade_name TEXT, filing_frequency TEXT NOT NULL, status TEXT NOT NULL
    );
    INSERT INTO clients VALUES ('legacy', 'Legacy GST', NULL, '24ABCDE1234F1Z5', 100, 0);
    INSERT INTO clients VALUES ('missing', 'Missing GSTIN', NULL, NULL, 100, 0);
  `);
  const migration = await readFile(new URL('../supabase/sql/add-client-service-gst-sync.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const registrations = async () => (await db.query('SELECT * FROM client_gst_registrations ORDER BY client_id')).rows;
  assert.equal((await registrations()).length, 1, 'backfill valid legacy clients only');
  await db.exec(migration);
  assert.equal((await registrations()).length, 1, 'migration is repeatable');

  await db.exec(`INSERT INTO clients (id, name, gst, selected_services)
    VALUES ('zero', 'Zero fee GST', ' 24abcde1234f2z5 ', ARRAY['gstFees']);`);
  let zero = (await registrations()).find(r => r.client_id === 'zero');
  assert.equal(zero.gstin, '24ABCDE1234F2Z5');
  assert.equal(zero.filing_frequency, 'Monthly');

  await db.exec(`UPDATE client_gst_registrations SET filing_frequency = 'Quarterly', status = 'Suspended' WHERE client_id = 'zero';
    UPDATE clients SET gst_fees = 1000 WHERE id = 'zero';`);
  zero = (await registrations()).find(r => r.client_id === 'zero');
  assert.equal(zero.filing_frequency, 'Quarterly', 'editing fees preserves frequency');
  assert.equal(zero.status, 'Suspended', 'editing fees does not reactivate registration');
  assert.equal((await registrations()).filter(r => r.client_id === 'zero').length, 1);

  await db.exec(`INSERT INTO clients (id, name, gst, selected_services)
    VALUES ('annual', 'Annual only', '24ABCDE1234F3Z5', ARRAY['gstAnnualReturnFees']),
           ('other', 'Other service', '24ABCDE1234F4Z5', ARRAY['itrFees']);`);
  assert.equal((await registrations()).find(r => r.client_id === 'annual').filing_frequency, 'Annual');
  assert.ok(!(await registrations()).some(r => r.client_id === 'other'));
  await db.exec(`UPDATE clients SET selected_services = ARRAY['gstFees'] WHERE id = 'other';`);
  assert.ok((await registrations()).some(r => r.client_id === 'other'), 'opting in on edit creates registration');
  await db.exec(`UPDATE clients SET selected_services = ARRAY[]::text[] WHERE id = 'zero';`);
  assert.ok((await registrations()).some(r => r.client_id === 'zero'), 'opting out preserves history');

  await assert.rejects(db.exec(`INSERT INTO clients (id, name, selected_services)
    VALUES ('invalid', 'No GSTIN', ARRAY['gstFees']);`), /valid GSTIN/);
  assert.equal((await db.query("SELECT id FROM clients WHERE id = 'invalid'")).rows.length, 0, 'failed save is atomic');
  await assert.rejects(db.exec(`INSERT INTO clients (id, name, gst, selected_services)
    VALUES ('duplicate', 'Wrong owner', '24ABCDE1234F2Z5', ARRAY['gstFees']);`), /another client/);
  assert.equal((await db.query("SELECT id FROM clients WHERE id = 'duplicate'")).rows.length, 0);
  console.log('PASS: backfill, repeat migration, zero fees, normalization, edits, annual service, unrelated services, history preservation, invalid GSTIN and ownership rollback');
} finally {
  await db.close();
}
