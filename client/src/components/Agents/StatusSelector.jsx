import { useAuth } from '../../context/AuthContext';
import { useAgentPresence } from '../../hooks/useAgentPresence';

const statuses = ['available', 'away', 'offline'];

export default function StatusSelector() {
  const { agent } = useAuth();
  const { agents, setStatus } = useAgentPresence();

  const currentAgent = agents.find((a) => a.id === agent.id);
  const currentStatus = currentAgent?.status || 'offline';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">Your status:</span>
      <select
        value={currentStatus}
        onChange={(e) => setStatus(agent.id, e.target.value)}
        className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow dark:bg-gray-700 dark:text-gray-100"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
