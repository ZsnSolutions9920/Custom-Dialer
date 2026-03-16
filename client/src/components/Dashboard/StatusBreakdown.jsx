const STATUS_CONFIG = {
  completed:     { color: 'bg-brand-500', label: 'Completed' },
  'in-progress': { color: 'bg-blue-500',  label: 'In Progress' },
  'no-answer':   { color: 'bg-red-400',   label: 'No Answer' },
  busy:          { color: 'bg-amber-400',  label: 'Busy' },
  failed:        { color: 'bg-red-600',    label: 'Failed' },
  canceled:      { color: 'bg-gray-400',   label: 'Canceled' },
  initiated:     { color: 'bg-brand-300',  label: 'Initiated' },
  ringing:       { color: 'bg-brand-400',  label: 'Ringing' },
};

export default function StatusBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">Status Breakdown</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Status Breakdown</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{total} total calls</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="w-full h-2.5 rounded-full overflow-hidden flex mb-5 bg-gray-100 dark:bg-gray-700">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const cfg = STATUS_CONFIG[d.status] || { color: 'bg-gray-300' };
          return (
            <div
              key={d.status}
              className={`${cfg.color} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${d.status}: ${d.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const cfg = STATUS_CONFIG[d.status] || { color: 'bg-gray-300', label: d.status };
          return (
            <div key={d.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.color}`} />
                <span className="text-[13px] text-gray-600 dark:text-gray-300">{cfg.label || d.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">{pct.toFixed(0)}%</span>
                <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200 tabular-nums w-8 text-right">{d.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
