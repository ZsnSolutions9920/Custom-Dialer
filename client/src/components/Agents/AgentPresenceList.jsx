import { useAgentPresence } from '../../hooks/useAgentPresence';
import StatusBadge from './StatusBadge';

export default function AgentPresenceList() {
  const { agents } = useAgentPresence();

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Team ({agents.length})</h3>
      </div>
      <ul className="divide-y">
        {agents.map((agent) => (
          <li key={agent.id} className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{agent.display_name}</span>
            <StatusBadge status={agent.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
