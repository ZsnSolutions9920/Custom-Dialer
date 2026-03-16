export default function CallVolumeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">Call Volume</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const ceiling = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const BAR_AREA_HEIGHT = 180;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Call Volume</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Last {data.length} days</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-brand-500 dark:bg-brand-400" />
          <span className="text-[11px] text-gray-400 dark:text-gray-500">Calls</span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between shrink-0 pr-1" style={{ height: BAR_AREA_HEIGHT }}>
          {[...gridLines].reverse().map((pct, i) => (
            <span key={i} className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right tabular-nums">
              {Math.round(ceiling * pct)}
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 flex flex-col">
          <div className="relative" style={{ height: BAR_AREA_HEIGHT }}>
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {gridLines.map((_, i) => (
                <div key={i} className="border-b border-gray-100 dark:border-gray-700/40" />
              ))}
            </div>

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2 px-0.5">
              {data.map((d) => {
                const barHeight = Math.max((d.count / ceiling) * BAR_AREA_HEIGHT, 2);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center group">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                      {d.count}
                    </span>
                    <div
                      className="w-full max-w-[36px] bg-brand-500/85 dark:bg-brand-400/80 rounded-t-[3px] transition-all duration-500 hover:bg-brand-600 dark:hover:bg-brand-300 cursor-default"
                      style={{ height: barHeight }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1.5 sm:gap-2 px-0.5 mt-2.5 border-t border-gray-100 dark:border-gray-700/40 pt-2">
            {data.map((d) => (
              <div key={d.date} className="flex-1 text-center">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
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
