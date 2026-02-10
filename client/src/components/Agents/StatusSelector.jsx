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
      <span className="text-sm text-gray-600">Your status:</span>
      <select
        value={currentStatus}
        onChange={(e) => setStatus(agent.id, e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
