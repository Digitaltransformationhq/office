import { useEffect, useRef } from 'react';
import { onChanges, type ChangeTopic } from '../services/realtime';

/**
 * Keeps a screen current without the user reaching for refresh.
 *
 * Two mechanisms, because neither alone is enough:
 *
 *   1. A websocket. The server broadcasts a bare "tasks changed" ping after
 *      every mutation and the screen refetches within a second. This is what
 *      makes the app feel live.
 *   2. A slow poll, as a fallback. Sockets drop — laptops sleep, phones switch
 *      networks, proxies time idle connections out — and a dropped socket must
 *      degrade to "updates in a minute", never to "updates never".
 *
 * Screens used to poll on a bare 60s interval with no reaction to the tab
 * regaining focus, so coming back to the app showed stale data until the next
 * tick happened to fire. That is what made it feel like a manual refresh was
 * needed. Now the poll only runs while the tab is VISIBLE, and becoming visible
 * refetches at once.
 *
 * Visibility is about the tab, not the person: a window left open and untouched
 * for hours is still visible, so it keeps updating. The only stale case is a tab
 * you are not looking at, which corrects the instant you look at it.
 *
 * @param topics   Which change topics this screen cares about.
 * @param refresh  Background refetch. Must NOT show a loading state — this
 *                 fires often, and a spinner each time would flicker.
 * @param options.intervalMs  Fallback poll period while visible. Default 45s;
 *                            the websocket is expected to beat it every time.
 * @param options.enabled     False to suspend entirely (e.g. before a user
 *                            is known).
 * @param options.paused      Ref that is true while a write is in flight, so a
 *                            refetch cannot clobber an optimistic update.
 */
export function useLiveData(
  topics: ChangeTopic[],
  refresh: () => void | Promise<void>,
  options: {
    intervalMs?: number;
    enabled?: boolean;
    paused?: React.MutableRefObject<boolean>;
  } = {},
) {
  const { intervalMs = 45_000, enabled = true, paused } = options;

  // Held in refs so a new callback or array identity each render does not tear
  // the interval and subscription down and rebuild them every render.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const topicsKey = topics.join(',');

  // Guards overlap: a slow response must not stack requests behind it.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      if (inFlight.current || paused?.current) return;
      if (document.visibilityState !== 'visible') return;
      inFlight.current = true;
      try {
        await refreshRef.current();
      } finally {
        inFlight.current = false;
      }
    };

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (timer === null) timer = setInterval(run, intervalMs); };
    const stop = () => { if (timer !== null) { clearInterval(timer); timer = null; } };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        run();   // catch up on anything missed while the tab was hidden
        start();
      } else {
        stop();  // a backgrounded tab should cost nothing
      }
    };

    // Focus covers the tab being visible the whole time while the window sat
    // behind another application.
    const onFocus = () => run();

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    const unsubscribe = onChanges(topicsKey.split(',') as ChangeTopic[], run);

    return () => {
      stop();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [intervalMs, enabled, paused, topicsKey]);
}
