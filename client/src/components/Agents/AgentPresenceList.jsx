import { useState } from 'react';
import { useAgentPresence } from '../../hooks/useAgentPresence';
import StatusBadge from './StatusBadge';
import AgentAttendanceModal from './AgentAttendanceModal';

export default function AgentPresenceList() {
  const { agents } = useAgentPresence();
  const [selectedAgent, setSelectedAgent] = useState(null);

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Team ({agents.length})</h3>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {agents.map((agent) => (
          <li
            key={agent.id}
            className="px-4 py-3 flex items-center justify-between hover:bg-brand-50/30 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            <span className="text-sm font-medium dark:text-gray-200">{agent.display_name}</span>
            <StatusBadge status={agent.status} />
          </li>
        ))}
      </ul>
      {selectedAgent && (
        <AgentAttendanceModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
