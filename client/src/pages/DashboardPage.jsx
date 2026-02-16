import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentCalls from '../components/Dashboard/RecentCalls';
import LiveCallMonitor from '../components/Dashboard/LiveCallMonitor';
import { useCall } from '../context/CallContext';
import AdminGate from '../components/Auth/AdminGate';

export default function DashboardPage() {
  const { makeCall } = useCall();

  return (
    <AdminGate>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveCallMonitor />
        <RecentCalls onCall={makeCall} />
      </div>
    </div>
    </AdminGate>
  );
}
