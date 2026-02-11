import { useState, useEffect } from 'react';
import { getCallLogs } from '../../api/calls';
import { useToast } from '../../context/ToastContext';
import CallLogRow from './CallLogRow';

export default function CallLogTable({ filters = {} }) {
  const toast = useToast();
  const [data, setData] = useState({ calls: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getCallLogs(page, 20, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load call logs:', err);
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const handleCallUpdated = (updatedCall) => {
    setData((prev) => ({
      ...prev,
      calls: prev.calls.map((c) => (c.id === updatedCall.id ? { ...c, ...updatedCall } : c)),
    }));
  };

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direction</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">To</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recording</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data.calls.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No call history yet.
                </td>
              </tr>
            ) : (
              data.calls.map((call) => (
                <CallLogRow key={call.id} call={call} onCallUpdated={handleCallUpdated} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Page {data.page} of {totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(data.page - 1)}
              disabled={data.page <= 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(data.page + 1)}
              disabled={data.page >= totalPages}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
