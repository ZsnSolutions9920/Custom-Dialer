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
  // Round up to a nice ceiling for gridlines
  const ceiling = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const gridLines = [0, Math.round(ceiling * 0.25), Math.round(ceiling * 0.5), Math.round(ceiling * 0.75), ceiling];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Call Volume</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last {data.length} days</span>
      </div>

      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-44 pr-2 text-right">
          {[...gridLines].reverse().map((v) => (
            <span key={v} className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">{v}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          {/* Gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {gridLines.map((v) => (
              <div key={v} className="border-t border-gray-100 dark:border-gray-700/50 w-full" />
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-2 h-44 relative z-10">
            {data.map((d) => {
              const height = (d.count / ceiling) * 100;
              const label = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div className="w-full flex justify-center" style={{ height: `${Math.max(height, 3)}%` }}>
                    <div className="w-full max-w-[32px] bg-gradient-to-t from-brand-500 to-brand-400 rounded-t-md transition-all duration-500 hover:from-brand-600 hover:to-brand-500 h-full" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex gap-2 mt-2">
            {data.map((d) => {
              const label = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
              return (
                <div key={d.date} className="flex-1 text-center">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
