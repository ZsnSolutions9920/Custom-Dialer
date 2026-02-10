export default function AgentLeaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Agent Leaderboard</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const medals = ['bg-brand-500 text-white', 'bg-brand-100 text-brand-700', 'bg-gray-100 text-gray-600'];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-800">Agent Leaderboard</h3>
        <span className="text-xs text-gray-400 font-medium">Last 7 days</span>
      </div>
      <div className="space-y-3">
        {data.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/80 transition-colors">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${medals[i] || 'bg-gray-50 text-gray-500'}`}>
              {i + 1}
            </span>
            <span className="text-sm font-semibold text-gray-800 flex-1">{agent.display_name}</span>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-800">{agent.call_count}</span>
              <span className="text-xs text-gray-400 ml-1">calls</span>
            </div>
            <div className="text-right min-w-[60px]">
              <span className="text-sm font-mono text-gray-500">{formatDuration(agent.avg_duration)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
