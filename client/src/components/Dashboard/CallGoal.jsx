import { useState, useEffect } from 'react';
import { getTodayCallCount } from '../../api/calls';

export default function CallGoal() {
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem('callGoal');
    return saved ? parseInt(saved, 10) : 500;
  });
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(goal.toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getTodayCallCount();
        setCount(data.count);
      } catch (err) {
        console.error('Failed to load today call count:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const pct = goal > 0 ? Math.min((count / goal) * 100, 100) : 0;

  const handleSaveGoal = () => {
    const val = parseInt(goalInput, 10);
    if (val > 0) {
      setGoal(val);
      localStorage.setItem('callGoal', val.toString());
    }
    setEditing(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Today's Calls</h3>
        {!editing ? (
          <button
            onClick={() => { setGoalInput(goal.toString()); setEditing(true); }}
            className="text-gray-400 hover:text-brand-500 transition-colors"
            title="Edit goal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-16 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              min="1"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
            />
            <button
              onClick={handleSaveGoal}
              className="text-brand-500 hover:text-brand-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-20" />
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-gray-800 dark:text-white">{count}</span>
            <span className="text-lg text-gray-400 dark:text-gray-500">/ {goal}</span>
          </div>

          <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 100 ? 'bg-gradient-to-r from-brand-500 to-brand-400' : 'bg-gradient-to-r from-brand-500 to-brand-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {pct >= 100 ? 'Goal reached!' : `${Math.round(pct)}% of daily goal`}
          </p>
        </>
      )}
    </div>
  );
}
