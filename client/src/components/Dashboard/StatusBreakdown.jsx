const STATUS_COLORS = {
  completed: 'bg-green-400',
  'in-progress': 'bg-blue-400',
  'no-answer': 'bg-red-400',
  busy: 'bg-yellow-400',
  failed: 'bg-red-600',
  canceled: 'bg-gray-400',
  initiated: 'bg-brand-400',
  ringing: 'bg-brand-300',
};

export default function StatusBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h3>
        <p className="text-sm text-gray-400 text-center py-8">No data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h3>
      <div className="space-y-3">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          return (
            <div key={d.status} className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[d.status] || 'bg-gray-300'}`} />
              <span className="text-sm text-gray-700 flex-1 capitalize">{d.status}</span>
              <span className="text-sm font-medium text-gray-800">{d.count}</span>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${STATUS_COLORS[d.status] || 'bg-gray-300'}`}
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
