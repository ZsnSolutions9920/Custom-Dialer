const STATUS_CONFIG = {
  completed:     { color: 'bg-brand-500', bar: 'bg-brand-500', dot: 'bg-brand-500' },
  'in-progress': { color: 'bg-blue-500',  bar: 'bg-blue-500',  dot: 'bg-blue-500' },
  'no-answer':   { color: 'bg-red-400',   bar: 'bg-red-400',   dot: 'bg-red-400' },
  busy:          { color: 'bg-amber-400',  bar: 'bg-amber-400', dot: 'bg-amber-400' },
  failed:        { color: 'bg-red-600',    bar: 'bg-red-600',   dot: 'bg-red-600' },
  canceled:      { color: 'bg-gray-400',   bar: 'bg-gray-400',  dot: 'bg-gray-400' },
  initiated:     { color: 'bg-brand-300',  bar: 'bg-brand-300', dot: 'bg-brand-300' },
  ringing:       { color: 'bg-brand-400',  bar: 'bg-brand-400', dot: 'bg-brand-400' },
};

export default function StatusBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Status Breakdown</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Status Breakdown</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{total} total</span>
      </div>
      <div className="space-y-4">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const cfg = STATUS_CONFIG[d.status] || { dot: 'bg-gray-300', bar: 'bg-gray-300' };
          return (
            <div key={d.status}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize font-medium">{d.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{pct.toFixed(0)}%</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{d.count}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${cfg.bar} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
