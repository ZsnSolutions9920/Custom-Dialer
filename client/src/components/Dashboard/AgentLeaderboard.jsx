export default function AgentLeaderboard({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Agent Leaderboard</h3>
        <p className="text-sm text-gray-400 text-center py-8">No data available</p>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Agent Leaderboard</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase tracking-wider">
            <th className="pb-2 font-semibold">#</th>
            <th className="pb-2 font-semibold">Agent</th>
            <th className="pb-2 font-semibold text-right">Calls</th>
            <th className="pb-2 font-semibold text-right">Avg Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((agent, i) => (
            <tr key={agent.id}>
              <td className="py-2 text-gray-400 font-medium">{i + 1}</td>
              <td className="py-2 text-gray-700 font-medium">{agent.display_name}</td>
              <td className="py-2 text-gray-700 text-right">{agent.call_count}</td>
              <td className="py-2 text-gray-500 text-right font-mono">{formatDuration(agent.avg_duration)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
