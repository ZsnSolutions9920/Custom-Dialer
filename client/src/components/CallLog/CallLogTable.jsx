import { useState, useEffect } from 'react';
import { getCallLogs } from '../../api/calls';
import CallLogRow from './CallLogRow';

export default function CallLogTable() {
  const [data, setData] = useState({ calls: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getCallLogs(page);
      setData(result);
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Direction</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">From</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">To</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recording</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data.calls.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No call history yet.
                </td>
              </tr>
            ) : (
              data.calls.map((call) => <CallLogRow key={call.id} call={call} />)
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {data.page} of {totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(data.page - 1)}
              disabled={data.page <= 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(data.page + 1)}
              disabled={data.page >= totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
