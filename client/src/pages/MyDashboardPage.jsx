import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import StatusSelector from '../components/Agents/StatusSelector';
import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentCalls from '../components/Dashboard/RecentCalls';
import DialerPanel from '../components/Dialer/DialerPanel';

export default function MyDashboardPage() {
  const { agent } = useAuth();
  const { makeCall } = useCall();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Welcome back, {agent?.displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's your personal overview</p>
        </div>
        <StatusSelector />
      </div>

      <DashboardStats agentId={agent?.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DialerPanel />
        <RecentCalls onCall={makeCall} agentId={agent?.id} />
      </div>
    </div>
  );
}
