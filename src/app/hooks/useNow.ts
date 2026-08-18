import { useEffect, useState } from 'react';

/**
 * The current time, re-read on an interval, so a view that depends on the clock
 * keeps up with it.
 *
 * A list ordered by how soon things are due is only correct at the instant it
 * renders. Left alone, a dashboard opened at nine in the morning still claims a
 * meeting is "in 6 h" at three in the afternoon — and, worse, still has it
 * sitting below work that is no longer more urgent. This is what makes that
 * ordering move on its own.
 *
 * A minute is the right beat: nothing on screen is finer-grained than "in 40
 * min", and a second-by-second re-render would be a lot of work to change
 * nothing. The tab being hidden is checked on return, because a sleeping laptop
 * fires no timers and the first thing anyone does on waking one is look at it.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);

  return now;
}
