export default function CallVolumeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">Call Volume</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const ceiling = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const BAR_AREA_HEIGHT = 160;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Call Volume</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">Last {data.length} days</span>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col justify-between shrink-0 pr-1" style={{ height: BAR_AREA_HEIGHT }}>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right">{ceiling}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right">{Math.round(ceiling / 2)}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none text-right">0</span>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="relative" style={{ height: BAR_AREA_HEIGHT }}>
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-gray-100 dark:border-gray-700/50" />
              <div className="border-b border-gray-100 dark:border-gray-700/50" />
              <div className="border-b border-gray-100 dark:border-gray-700/50" />
            </div>
            <div className="absolute inset-0 flex items-end gap-2 px-1">
              {data.map((d) => {
                const barHeight = Math.max((d.count / ceiling) * BAR_AREA_HEIGHT, 4);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{d.count}</span>
                    <div
                      className="w-full max-w-[32px] bg-brand-500 dark:bg-brand-400 rounded-t transition-all duration-500 hover:bg-brand-600 dark:hover:bg-brand-300"
                      style={{ height: barHeight }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 px-1 mt-2">
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
