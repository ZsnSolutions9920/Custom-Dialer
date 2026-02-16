import { useState, useEffect, useRef } from 'react';
import { clockIn, clockOut, getCurrentSession } from '../../api/attendance';

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function ClockInOutButton() {
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    getCurrentSession().then((s) => {
      if (s) {
        setSession(s);
        const start = new Date(s.clock_in).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (session) {
      timerRef.current = setInterval(() => {
        const start = new Date(session.clock_in).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [session]);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const s = await clockIn();
      setSession(s);
    } catch {
      // already clocked in or error
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      await clockOut();
      setSession(null);
    } catch {
      // no open session or error
    }
    setLoading(false);
  };

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {formatElapsed(elapsed)}
        </span>
        <button
          onClick={handleClockOut}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          Clock Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClockIn}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
    >
      Clock In
    </button>
  );
}
