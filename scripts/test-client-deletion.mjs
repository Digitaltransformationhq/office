// Run with node scripts/test-client-deletion.mjs. Executes the actual route with
// a fake database so authorization tests cannot delete real client records.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transform } from 'esbuild';

const source = readFileSync(new URL('../supabase/functions/server/index.tsx', import.meta.url), 'utf8');
const start = source.indexOf("app.delete('/make-server-0abfa7cf/clients/:clientId'");
const end = source.indexOf("app.put('/make-server-0abfa7cf/clients/:clientId'", start);
assert.ok(start >= 0 && end > start);
const { code } = await transform(source.slice(start, end), { loader: 'tsx' });

async function run({ actorId = 'admin-id', role = 'admin', status = 'Active', password = 'correct',
  actorExists = true, actorError = null, clientExists = true, deleteError = null } = {}) {
  let handler;
  let deletes = 0;
  const events = [];
  vm.runInNewContext(code, {
    app: { delete: (_path, callback) => { handler = callback; } },
    console: { log() {} },
    isAdminRole: role => (role || '').trim().toLowerCase() === 'admin',
    verifyPassword: async (plain, stored) => plain === stored,
    broadcastChange: async topic => events.push(topic),
    supabase: {
      from(table) {
        const query = {
          select() { return query; },
          eq(field, value) {
            assert.equal(field, 'id');
            assert.equal(value, table === 'users' ? actorId : 'client-id');
            return query;
          },
          delete() { assert.equal(table, 'clients'); deletes++; return query; },
          async maybeSingle() {
            return table === 'users'
              ? { data: actorExists ? { role, status, password: 'correct' } : null, error: actorError }
              : { data: clientExists ? { id: 'client-id' } : null, error: deleteError };
          },
        };
        return query;
      },
    },
  });
  const response = await handler({
    req: { query: () => actorId, param: () => 'client-id', json: async () => ({ password, role: 'admin' }) },
    json: (body, status = 200) => ({ body, status }),
  });
  return { ...response, deletes, events };
}

for (const scenario of [
  { actorId: undefined }, { actorId: '' }, { actorExists: false },
  ...['partner', 'director', 'team-leader', 'team-member', 'client', 'unknown'].map(role => ({ role })),
  { status: 'Inactive' }, { password: '' }, { password: 'wrong' }, { password: {} },
]) {
  // Explicit undefined would use the default parameter, so use empty for missing.
  if (scenario.actorId === undefined && 'actorId' in scenario) scenario.actorId = '';
  const result = await run(scenario);
  assert.equal(result.status, 403, JSON.stringify(scenario));
  assert.equal(result.deletes, 0, 'unauthorized requests must never delete');
  assert.equal(result.events.length, 0);
}
for (const role of ['admin', ' Admin ']) {
  const result = await run({ role });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.deletes, 1);
  assert.deepEqual(result.events, ['clients', 'gst', 'itr', 'discussions', 'billing']);
}
assert.equal((await run({ clientExists: false })).status, 404);
assert.equal((await run({ deleteError: { code: '23503' } })).status, 409);
const failure = await run({ actorError: new Error('database unavailable') });
assert.equal(failure.status, 500);
assert.equal(failure.deletes, 0);
console.log('PASS: admin deletion, role restrictions, inactive/missing users, password verification, missing clients and database failures');
