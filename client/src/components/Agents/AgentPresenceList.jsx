import { useAgentPresence } from '../../hooks/useAgentPresence';
import StatusBadge from './StatusBadge';

export default function AgentPresenceList() {
  const { agents } = useAgentPresence();

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm text-gray-800">Team ({agents.length})</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {agents.map((agent) => (
          <li key={agent.id} className="px-4 py-3 flex items-center justify-between hover:bg-brand-50/30 transition-colors">
            <span className="text-sm font-medium">{agent.display_name}</span>
            <StatusBadge status={agent.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
