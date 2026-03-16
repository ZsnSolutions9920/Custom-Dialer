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
  const ceiling = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const BAR_AREA_HEIGHT = 176; // px (h-44)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Call Volume</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last {data.length} days</span>
      </div>

      <div className="flex gap-2">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between shrink-0 pr-1" style={{ height: BAR_AREA_HEIGHT }}>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right">{ceiling}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right">{Math.round(ceiling / 2)}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right">0</span>
        </div>

        {/* Bars + labels */}
        <div className="flex-1 flex flex-col">
          {/* Bar area with gridlines */}
          <div className="relative" style={{ height: BAR_AREA_HEIGHT }}>
            {/* Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-gray-100 dark:border-gray-700/50" />
              <div className="border-b border-gray-100 dark:border-gray-700/50" />
              <div className="border-b border-gray-100 dark:border-gray-700/50" />
            </div>

            {/* Bars positioned absolutely from bottom */}
            <div className="absolute inset-0 flex items-end gap-2 px-1">
              {data.map((d) => {
                const barHeight = Math.max((d.count / ceiling) * BAR_AREA_HEIGHT, 6);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center group">
                    {/* Count label - always visible */}
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                      {d.count}
                    </span>
                    {/* Bar */}
                    <div
                      className="w-full max-w-[36px] bg-gradient-to-t from-brand-500 to-brand-400 rounded-t-md transition-all duration-500 hover:from-brand-600 hover:to-brand-500"
                      style={{ height: barHeight }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis day labels */}
          <div className="flex gap-2 px-1 mt-2">
            {data.map((d) => (
              <div key={d.date} className="flex-1 text-center">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
