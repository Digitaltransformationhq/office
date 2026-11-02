// Exercise the native adapter without a device or a production backend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

const calls = { files: [], shares: [], browsers: [], launchers: [], listeners: {} };
class TestURL extends URL {}
let nextId = 0;
TestURL.createObjectURL = () => `blob:https://localhost/${++nextId}`;
TestURL.revokeObjectURL = () => {};
class Anchor {
  constructor(href, download) { this.href = href; this.download = download || ''; this.attrs = { href }; if (download) this.attrs.download = download; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  hasAttribute(key) { return key in this.attrs; }
  click() { calls.originalClicks = (calls.originalClicks || 0) + 1; }
}
class Reader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buffer => { this.result = `data:application/octet-stream;base64,${Buffer.from(buffer).toString('base64')}`; this.onload(); });
  }
}
const modules = {
  '@capacitor/app': { App: { addListener: async (event, callback) => { calls.listeners[event] = callback; }, exitApp: async () => { calls.exit = true; } } },
  '@capacitor/app-launcher': { AppLauncher: { openUrl: async value => calls.launchers.push(value.url) } },
  '@capacitor/browser': { Browser: { open: async value => calls.browsers.push(value.url) } },
  '@capacitor/core': { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' }, registerPlugin: () => ({ print: async () => { calls.printed = true; } }) },
  '@capacitor/filesystem': { Directory: { Cache: 'CACHE' }, Filesystem: { writeFile: async value => { calls.files.push(value); return { uri: `file:///cache/${value.path}` }; } } },
  '@capacitor/share': { Share: { share: async value => calls.shares.push(value) } },
};
const document = {
  createElement: () => ({ textContent: '' }),
  head: { appendChild() {} },
  documentElement: {},
  querySelector: () => null,
  addEventListener: (type, callback) => { calls.listeners[type] = callback; },
};
const context = {
  require: name => modules[name], exports: {}, URL: TestURL, Blob, FileReader: Reader,
  HTMLAnchorElement: Anchor, document, location: { href: 'https://localhost/', origin: 'https://localhost' },
  MutationObserver: class { observe() {} },
  window: { open: () => { calls.popup = true; }, alert: () => { calls.alert = true; }, confirm: () => true, history: { back: () => { calls.back = true; } } },
  fetch: async () => ({ ok: true, blob: async () => new Blob(['pdf']) }),
};
const compiled = transformSync(fs.readFileSync('src/bridge.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code;
vm.runInNewContext(compiled, context);
const settle = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  const url = TestURL.createObjectURL(new Blob(['spreadsheet']));
  new Anchor(url, '../report.xlsx').click();
  TestURL.revokeObjectURL(url);
  await settle();
  assert.equal(Buffer.from(calls.files[0].data, 'base64').toString(), 'spreadsheet');
  assert.match(calls.files[0].path, /^exports\/\d+-\.\._report\.xlsx$/);
  assert.equal(calls.shares.length, 1, 'Blob export should reach the share sheet after immediate revocation');

  new Anchor('https://example.org/page').click();
  new Anchor('mailto:test@example.org').click();
  await settle();
  assert.deepEqual(calls.browsers, ['https://example.org/page']);
  assert.deepEqual(calls.launchers, ['mailto:test@example.org']);
  context.window.open('javascript:alert(1)');
  assert.equal(calls.popup, undefined, 'unsupported popup schemes must not open');

  new Anchor('https://example.org/report.pdf').click();
  await settle(); await settle();
  assert.equal(calls.shares.length, 2, 'PDF links should reach the share sheet');
  calls.listeners.backButton({ canGoBack: true });
  assert.equal(calls.back, true);
  context.window.print();
  await settle();
  assert.equal(calls.printed, true);
  assert.equal(calls.alert, undefined);
  console.log('Native bridge checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
