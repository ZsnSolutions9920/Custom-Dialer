import DialerPanel from '../components/Dialer/DialerPanel';
import AgentPresenceList from '../components/Agents/AgentPresenceList';
import StatusSelector from '../components/Agents/StatusSelector';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <StatusSelector />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DialerPanel />
        <AgentPresenceList />
      </div>
    </div>
  );
}
