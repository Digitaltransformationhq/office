import { useState, useEffect } from 'react';

export function useTimeAgo(date: Date): string {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      setTimeAgo(`${seconds}s`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [date]);

  return timeAgo;
}
