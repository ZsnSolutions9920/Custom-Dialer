import DialerPanel from '../components/Dialer/DialerPanel';
import AgentPresenceList from '../components/Agents/AgentPresenceList';
import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentCalls from '../components/Dashboard/RecentCalls';
import { useCall } from '../context/CallContext';

export default function DashboardPage() {
  const { makeCall } = useCall();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Overall Dashboard</h1>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DialerPanel />
        <AgentPresenceList />
        <RecentCalls onCall={makeCall} />
      </div>
    </div>
  );
}
