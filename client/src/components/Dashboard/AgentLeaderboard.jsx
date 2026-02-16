import { useState, useEffect } from 'react';
import { getAgentLeaderboard } from '../../api/calls';
import { useAgentPresence } from '../../hooks/useAgentPresence';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../Agents/StatusBadge';
import AgentAttendanceModal from '../Agents/AgentAttendanceModal';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const medals = [
  'bg-brand-500 text-white',
  'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400',
  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
];

export default function AgentLeaderboard() {
  const toast = useToast();
  const { agents } = useAgentPresence();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    getAgentLeaderboard()
      .then(setLeaderboard)
      .catch((err) => {
        console.error('Failed to load leaderboard:', err);
        toast.error('Failed to load agent leaderboard');
      })
      .finally(() => setLoading(false));
  }, []);

  // Merge presence status into leaderboard data, and append agents with 0 calls at the bottom
  const agentStatusMap = {};
  for (const a of agents) {
    agentStatusMap[a.id] = a.status;
  }

  const leaderboardIds = new Set(leaderboard.map((a) => a.id));
  const mergedList = [
    ...leaderboard.map((a) => ({ ...a, status: agentStatusMap[a.id] || 'offline' })),
    ...agents
      .filter((a) => !leaderboardIds.has(a.id))
      .map((a) => ({ id: a.id, display_name: a.display_name, call_count: 0, avg_duration: 0, status: a.status })),
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 hover:shadow-card-hover transition-all duration-300">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Team &amp; Leaderboard ({agents.length})
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last 7 days</span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="h-7 w-7 bg-gray-100 dark:bg-gray-700 rounded-lg" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : mergedList.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">No agents found</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {mergedList.map((agent, i) => (
            <li
              key={agent.id}
              className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
              title="View attendance"
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                agent.call_count > 0 ? (medals[i] || 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400') : 'bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              }`}>
                {agent.call_count > 0 ? i + 1 : '—'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {agent.display_name}
                </div>
                <StatusBadge status={agent.status} />
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{agent.call_count}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">calls</span>
              </div>
              <div className="text-right min-w-[50px] flex-shrink-0">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                  {agent.call_count > 0 ? formatDuration(agent.avg_duration) : '—'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedAgent && (
        <AgentAttendanceModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
