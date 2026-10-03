// Run: node scripts/test-client-delete-response.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transform } from 'esbuild';

const source = readFileSync(new URL('../src/app/services/api.ts', import.meta.url), 'utf8');
const fetchStart = source.indexOf('async function fetchAPI(');
const fetchEnd = source.indexOf('// Tasks API', fetchStart);
const clientsStart = source.indexOf('export const clientsAPI =');
const clientsEnd = source.indexOf('// ============================================', clientsStart);
const snippet = source.slice(fetchStart, fetchEnd) + source.slice(clientsStart, clientsEnd).replace('export const clientsAPI', 'const clientsAPI');
const { code } = await transform(snippet + '\nglobalThis.deleteClient = clientsAPI.delete;', { loader: 'ts' });

async function request(response) {
  const context = vm.createContext({
    API_BASE_URL: 'https://example.invalid', publicAnonKey: 'test-key',
    actorParam: () => '?actedById=admin',
    console: { error() {} },
    fetch: async (_url, options) => {
      assert.equal(options.method, 'DELETE');
      assert.equal(JSON.parse(options.body).password, 'test-password');
      return response;
    },
  });
  vm.runInContext(code, context);
  return context.deleteClient('client:test', 'test-password');
}

const missingEndpoint = await request(new Response('404 Not Found', { status: 404 }));
assert.equal(missingEndpoint.success, false);
assert.equal(missingEndpoint.code, 'ENDPOINT_NOT_AVAILABLE');
assert.match(missingEndpoint.error, /Deploy the updated backend/);

for (const [status, error] of [[403, 'Incorrect admin password'], [404, 'Client not found'], [409, 'Linked records prevent deletion']]) {
  const result = await request(Response.json({ success: false, error }, { status }));
  assert.equal(result.success, false);
  assert.equal(result.error, error);
  assert.notEqual(result.code, 'ENDPOINT_NOT_AVAILABLE');
}
const unavailable = await request(new Response('<html>Bad gateway</html>', { status: 502 }));
assert.equal(unavailable.code, 'INVALID_API_RESPONSE');
assert.match(unavailable.error, /HTTP 502/);
assert.equal((await request(Response.json({ success: true }))).success, true);
console.log('PASS: undeployed endpoint, password rejection, missing client, linked records, non-JSON server errors and successful deletion');
