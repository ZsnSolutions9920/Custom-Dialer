import { useState, useEffect } from 'react';
import { getFollowUps } from '../api/phoneLists';
import { useCall } from '../context/CallContext';
import { useToast } from '../context/ToastContext';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  return days;
}

function toDateKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [followUps, setFollowUps] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const { makeCall } = useCall();
  const toast = useToast();

  const fetchMonth = async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthRange(year, month);
      const data = await getFollowUps(start, end);
      setFollowUps(data);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth();
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  // Group follow-ups by date key
  const byDate = {};
  for (const fu of followUps) {
    const key = toDateKey(fu.follow_up_at);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(fu);
  }

  const days = getCalendarDays(year, month);
  const todayKey = toDateKey(today.toISOString());
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const selectedKey = selectedDate
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    : null;
  const selectedFollowUps = selectedKey ? (byDate[selectedKey] || []) : [];

  const handleCall = (phoneNumber) => {
    try {
      makeCall(phoneNumber);
    } catch (err) {
      console.error('Failed to call:', err);
      toast.error('Failed to initiate call');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Follow-Ups</h1>

      {/* Header navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-3">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{monthLabel}</h2>
          {(year !== today.getFullYear() || month !== today.getMonth()) && (
            <button onClick={goToday} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
              Today
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50" />;
            }
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateKey === todayKey;
            const hasFollowUps = byDate[dateKey] && byDate[dateKey].length > 0;
            const isSelected = selectedDate === day;
            const count = hasFollowUps ? byDate[dateKey].length : 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`min-h-[80px] border-b border-r border-gray-100 dark:border-gray-700/50 p-2 text-left transition-colors
                  ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                `}
              >
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                    ${isToday ? 'bg-brand-600 text-white' : 'text-gray-700 dark:text-gray-300'}
                  `}
                >
                  {day}
                </span>
                {hasFollowUps && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{count}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel for selected date */}
      {selectedDate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
            Follow-ups for {new Date(year, month, selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>

          {selectedFollowUps.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No follow-ups scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedFollowUps.map((fu) => (
                <div key={fu.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{fu.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{fu.phone_number}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        {new Date(fu.follow_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {fu.list_name && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{fu.list_name}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCall(fu.phone_number)}
                    className="shrink-0 ml-3 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Loading...</p>
      )}
    </div>
  );
}
