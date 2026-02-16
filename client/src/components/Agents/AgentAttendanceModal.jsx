import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getHistory } from '../../api/attendance';

function formatDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatDuration(seconds) {
  if (seconds == null) return 'In progress';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default function AgentAttendanceModal({ agent, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHistory(agent.id)
      .then((data) => setEntries(data.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [agent.id]);

  const handleExport = () => {
    const rows = entries.map((e) => ({
      'Clock In': formatDatetime(e.clock_in),
      'Clock Out': formatDatetime(e.clock_out),
      'Duration': formatDuration(e.duration_seconds),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `${agent.display_name} - Attendance.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Attendance — {agent.display_name}
          </h3>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={handleExport}
                className="px-3 py-1 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
              >
                Export Excel
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 p-5">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No attendance records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">Clock In</th>
                  <th className="pb-2 font-medium">Clock Out</th>
                  <th className="pb-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {entries.map((entry) => (
                  <tr key={entry.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2">{formatDatetime(entry.clock_in)}</td>
                    <td className="py-2">{formatDatetime(entry.clock_out)}</td>
                    <td className="py-2">{formatDuration(entry.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
