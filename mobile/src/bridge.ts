import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// The web app exports CSV and Excel via object URLs, often revoking the URL
// immediately after clicking a detached link. Keep the Blob itself until the
// click has been handled; never send its contents to a remote service.
if (Capacitor.isNativePlatform()) {
  const objects = new Map<string, Blob>();
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (value: Blob | MediaSource) => {
    const url = create(value);
    if (value instanceof Blob) objects.set(url, value);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    objects.delete(url);
    revoke(url);
  };

  const safeName = (name: string) =>
    (name.replace(/[\x00-\x1f\x2f\x5c:*?"<>|]/g, '_').slice(0, 120) || 'download');

  async function shareBlob(blob: Blob, name: string) {
    // Cache is app-private. The OS share sheet controls which app receives the
    // file; it is not written to a public shared folder automatically.
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.readAsDataURL(blob);
    });
    const path = `exports/${Date.now()}-${safeName(name)}`;
    const file = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
    try {
      await Share.share({ title: safeName(name), url: file.uri, dialogTitle: 'Save or share file' });
    } finally {
      // Receivers can read the URI after the share dialog closes, so do not
      // delete it here. The operating system may clear app cache later.
    }
  }

  function reportFailure() {
    window.alert('The file could not be opened or shared. Please try again.');
  }

  async function shareUrl(url: URL, filename: string) {
    // Fetch only same-origin and HTTPS resources. Credentials are sent only to
    // the app's own origin by the browser's default fetch policy.
    if (url.origin !== location.origin && url.protocol !== 'https:') throw new Error('Unsupported download URL');
    const response = await fetch(url.href);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    await shareBlob(await response.blob(), filename);
  }

  async function openExternal(url: URL) {
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      await Browser.open({ url: url.href });
    } else if (['mailto:', 'tel:', 'sms:'].includes(url.protocol)) {
      await AppLauncher.openUrl({ url: url.href });
    }
  }

  function handleLink(link: HTMLAnchorElement): boolean {
    const href = link.getAttribute('href');
    if (!href) return false;
    const blob = objects.get(link.href);
    if (blob && (link.hasAttribute('download') || link.href.startsWith('blob:'))) {
      // Capture the Blob before the caller revokes the object URL.
      void shareBlob(blob, link.download || 'download').catch(reportFailure);
      return true;
    }
    let url: URL;
    try { url = new URL(href, location.href); } catch { return false; }
    if (link.hasAttribute('download') && ['http:', 'https:'].includes(url.protocol)) {
      void shareUrl(url, link.download || url.pathname.split('/').pop() || 'download').catch(reportFailure);
      return true;
    }
    if (url.protocol === 'https:' && /\.pdf$/i.test(url.pathname)) {
      // Open or save a PDF through the system share sheet. If a remote server
      // disallows a WebView fetch, let the browser handle the link instead.
      void shareUrl(url, url.pathname.split('/').pop() || 'document.pdf')
        .catch(() => openExternal(url).catch(reportFailure));
      return true;
    }
    if (['mailto:', 'tel:', 'sms:'].includes(url.protocol) ||
        (['http:', 'https:'].includes(url.protocol) && url.origin !== location.origin)) {
      void openExternal(url).catch(reportFailure);
      return true;
    }
    return false;
  }

  // Both detached programmatic links and ordinary user taps occur in the app.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!handleLink(this)) click.call(this);
  };
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) return;
    const link = (event.target as Element | null)?.closest?.('a');
    if (link && handleLink(link)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  const originalOpen = window.open.bind(window);
  window.open = (url, target, features) => {
    if (!url) return originalOpen(url, target, features);
    try {
      const parsed = new URL(String(url), location.href);
      if (['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(parsed.protocol) && parsed.origin !== location.origin) {
        void openExternal(parsed).catch(reportFailure);
        return null;
      }
      if (parsed.origin !== location.origin) return null;
    } catch { return null; }
    return originalOpen(url, target, features);
  };

  // Android's WebView does not implement window.print(). The native plugin
  // prints the current page; printing a PDF requires opening it in a PDF app.
  if (Capacitor.getPlatform() === 'android') {
    const printer = registerPlugin<{ print(): Promise<void> }>('MobilePrint');
    window.print = () => { void printer.print().catch(reportFailure); };

    // Add a compact native action to the existing signed-in header. The menu
    // is closed by default and does not sit over the app's content.
    const style = document.createElement('style');
    style.textContent = `
      [data-kaps-mobile-tools] { position: relative; flex: none; }
      [data-kaps-mobile-tools] summary { display: grid; place-items: center; width: 40px; height: 40px; cursor: pointer; border-radius: 6px; color: #1b365d; font-size: 24px; list-style: none; }
      [data-kaps-mobile-tools] summary::-webkit-details-marker { display: none; }
      [data-kaps-mobile-tools] summary:focus-visible, [data-kaps-mobile-tools] button:focus-visible { outline: 3px solid #1b365d; outline-offset: 2px; }
      [data-kaps-mobile-tools] button { position: absolute; top: 100%; right: 0; z-index: 100; min-width: 140px; padding: 12px 16px; border: 1px solid #dce4ec; border-radius: 6px; background: white; color: #1b365d; box-shadow: 0 4px 12px #0002; font-size: 14px; text-align: left; }
      @media print { [data-kaps-mobile-tools] { display: none; } }
    `;
    document.head.appendChild(style);
    const attachTools = () => {
      const logout = document.querySelector<HTMLButtonElement>('header button[aria-label="Log out"]');
      const group = logout?.parentElement;
      if (!group || group.querySelector('[data-kaps-mobile-tools]')) return;
      const details = document.createElement('details');
      details.dataset.kapsMobileTools = '';
      const summary = document.createElement('summary');
      summary.setAttribute('aria-label', 'More actions');
      summary.textContent = '⋮';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Print page';
      button.addEventListener('click', () => { details.open = false; window.print(); });
      details.append(summary, button);
      group.insertBefore(details, group.firstChild);
    };
    new MutationObserver(attachTools).observe(document.documentElement, { childList: true, subtree: true });
    attachTools();

    void App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else if (window.confirm('Exit KAPS Office?')) void App.exitApp();
    });
  }
}
