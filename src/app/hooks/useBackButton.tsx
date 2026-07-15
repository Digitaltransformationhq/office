import { useEffect } from 'react';

/**
 * Makes the mobile / browser Back button close an open overlay (modal, drawer,
 * sheet) instead of navigating away from — or closing — the app.
 *
 * While `active` is true, a dummy history entry is pushed. Pressing Back pops
 * that entry and fires `onBack` (which should close the overlay) rather than
 * unwinding the app's history. If the overlay is instead closed from the UI
 * (e.g. the ✕ button), the dummy entry is cleaned up so history stays balanced.
 *
 * Usage:
 *   useBackButton(isOpen, onClose);
 */
export function useBackButton(active: boolean, onBack: () => void) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    window.history.pushState({ __overlay: true }, '');

    const handlePop = () => { onBack(); };
    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
      // Closed via the UI (not the Back button): remove the dummy entry we
      // added so the history stack doesn't grow with stale overlay states.
      if (window.history.state && (window.history.state as any).__overlay) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
