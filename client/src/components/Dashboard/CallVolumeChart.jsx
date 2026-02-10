export default function CallVolumeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Call Volume</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Call Volume</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last {data.length} days</span>
      </div>
      <div className="flex items-end gap-3 h-44">
        {data.map((d) => {
          const height = (d.count / max) * 100;
          const label = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
              <div className="w-full relative">
                <div
                  className="w-full bg-gradient-to-t from-brand-500 to-brand-400 rounded-lg transition-all duration-500 hover:from-brand-600 hover:to-brand-500"
                  style={{ height: `${Math.max(height, 6)}%`, minHeight: '8px' }}
                />
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
