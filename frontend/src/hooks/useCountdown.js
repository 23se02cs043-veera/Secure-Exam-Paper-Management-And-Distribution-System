import { useState, useEffect, useRef } from 'react';

/**
 * Live countdown hook.
 * @param {string|Date} targetDate - Future date/time to count down to
 * @returns {{ days, hours, minutes, seconds, isExpired, totalSeconds }}
 */
export function useCountdown(targetDate) {
  const calculateTime = () => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTime);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!targetDate) return;

    setTimeLeft(calculateTime());
    intervalRef.current = setInterval(() => {
      const next = calculateTime();
      setTimeLeft(next);
      if (next.isExpired) clearInterval(intervalRef.current);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [targetDate]);

  return timeLeft;
}

export default useCountdown;
