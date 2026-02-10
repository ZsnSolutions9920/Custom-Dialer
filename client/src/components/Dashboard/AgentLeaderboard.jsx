export default function AgentLeaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Agent Leaderboard</h3>
        <p className="text-sm text-gray-400 text-center py-12">No data available</p>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const medals = ['bg-brand-500 text-white', 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400', 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Agent Leaderboard</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last 7 days</span>
      </div>
      <div className="space-y-3">
        {data.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${medals[i] || 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              {i + 1}
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1">{agent.display_name}</span>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{agent.call_count}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">calls</span>
            </div>
            <div className="text-right min-w-[60px]">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{formatDuration(agent.avg_duration)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
