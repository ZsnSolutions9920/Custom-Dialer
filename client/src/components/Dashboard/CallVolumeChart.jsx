export default function CallVolumeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Call Volume</h3>
        <p className="text-sm text-gray-400 text-center py-8">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Call Volume</h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((d) => {
          const height = (d.count / max) * 100;
          const label = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">{d.count}</span>
              <div
                className="w-full bg-brand-500 rounded-t-md transition-all"
                style={{ height: `${Math.max(height, 4)}%` }}
              />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
