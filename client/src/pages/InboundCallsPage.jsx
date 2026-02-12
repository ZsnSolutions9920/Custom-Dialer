import { useState, useEffect } from 'react';
import { getCallLogs, getRecordingUrl } from '../api/calls';
import { useToast } from '../context/ToastContext';
import CallNotesModal from '../components/CallLog/CallNotesModal';

const STATUS_BADGE = {
  completed: { label: 'Answered', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'no-answer': { label: 'Missed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  ringing: { label: 'Missed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  initiated: { label: 'Missed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function InboundRow({ call, onCallUpdated }) {
  const [showNotes, setShowNotes] = useState(false);
  const badge = STATUS_BADGE[call.status] || { label: call.status, cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };

  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}`
    : '-';

  const time = call.started_at ? new Date(call.started_at).toLocaleString() : '-';

  return (
    <>
      <tr className="hover:bg-brand-50/30 dark:hover:bg-gray-700/50 transition-colors">
        <td className="px-4 py-3 text-sm">
          <span className="font-mono text-gray-800 dark:text-gray-200">{call.from_number || '-'}</span>
          {call.contact_name && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">{call.contact_name}</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm dark:text-gray-300">{call.agent_name || 'Unassigned'}</td>
        <td className="px-4 py-3 text-sm">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-mono dark:text-gray-300">{duration}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{time}</td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add/view notes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              {call.notes ? 'Edit' : 'Note'}
            </button>
            {call.disposition && (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {call.disposition}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {call.recording_url ? (
            <a
              href={getRecordingUrl(call.id)}
              download
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download
            </a>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">-</span>
          )}
        </td>
      </tr>

      {showNotes && (
        <CallNotesModal
          call={call}
          onClose={() => setShowNotes(false)}
          onSaved={onCallUpdated}
        />
      )}
    </>
  );
}

export default function InboundCallsPage() {
  const toast = useToast();
  const [data, setData] = useState({ calls: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCalls = async (page = 1) => {
    setLoading(true);
    try {
      const filters = { direction: 'inbound' };
      if (statusFilter === 'answered') filters.status = 'completed';
      if (statusFilter === 'missed') filters.status = 'no-answer';
      const result = await getCallLogs(page, 20, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load inbound calls:', err);
      toast.error('Failed to load inbound calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls(1);
  }, [statusFilter]);

  const handleCallUpdated = (updatedCall) => {
    setData((prev) => ({
      ...prev,
      calls: prev.calls.map((c) => (c.id === updatedCall.id ? { ...c, ...updatedCall } : c)),
    }));
  };

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inbound Calls</h1>
        <div className="flex gap-2">
          {['all', 'answered', 'missed'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'answered' ? 'Answered' : 'Missed'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Caller</th>
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
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : data.calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No inbound calls yet.
                  </td>
                </tr>
              ) : (
                data.calls.map((call) => (
                  <InboundRow key={call.id} call={call} onCallUpdated={handleCallUpdated} />
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
                onClick={() => fetchCalls(data.page - 1)}
                disabled={data.page <= 1}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => fetchCalls(data.page + 1)}
                disabled={data.page >= totalPages}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
