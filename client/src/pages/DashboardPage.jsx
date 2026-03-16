import { useState } from 'react';
import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentCalls from '../components/Dashboard/RecentCalls';
import LiveCallMonitor from '../components/Dashboard/LiveCallMonitor';
import { useCall } from '../context/CallContext';
import AdminGate from '../components/Auth/AdminGate';
import { purgeOldCallLogs } from '../api/calls';

export default function DashboardPage() {
  const { makeCall } = useCall();
  const [purging, setPurging] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePurge = async () => {
    if (!window.confirm('This will permanently delete the oldest 90% of call history. Only the most recent 10% will be kept. Continue?')) {
      return;
    }

    const username = window.prompt('Admin username:');
    if (!username) return;
    const password = window.prompt('Admin password:');
    if (!password) return;

    setPurging(true);
    try {
      const result = await purgeOldCallLogs(username, password);
      alert(`Purge complete: ${result.deletedCount} records deleted, ${result.remainingCount} remaining.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.response?.data?.error || 'Purge failed');
    } finally {
      setPurging(false);
    }
  };

  return (
    <AdminGate>
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Admin Dashboard</h1>
        <button
          onClick={handlePurge}
          disabled={purging}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {purging ? 'Purging...' : 'Purge Old Call History'}
        </button>
      </div>

      <DashboardStats key={refreshKey} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiveCallMonitor />
        <RecentCalls key={`recent-${refreshKey}`} onCall={makeCall} />
      </div>
    </div>
    </AdminGate>
  );
}
