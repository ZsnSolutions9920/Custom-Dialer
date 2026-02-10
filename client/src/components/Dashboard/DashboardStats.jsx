import { useState, useEffect } from 'react';
import { getCallStats, getCallVolume, getStatusBreakdown, getAgentLeaderboard } from '../../api/calls';
import StatCard from './StatCard';
import CallVolumeChart from './CallVolumeChart';
import StatusBreakdown from './StatusBreakdown';
import AgentLeaderboard from './AgentLeaderboard';

export default function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [volume, setVolume] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, v, b, l] = await Promise.all([
          getCallStats(),
          getCallVolume(),
          getStatusBreakdown(),
          getAgentLeaderboard(),
        ]);
        setStats(s);
        setVolume(v);
        setBreakdown(b);
        setLeaderboard(l);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400 py-4">Loading analytics...</div>;
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="📞" label="Total Calls" value={stats.total_calls} />
          <StatCard icon="⏱" label="Avg Duration" value={formatDuration(stats.avg_duration)} />
          <StatCard icon="✅" label="Answer Rate" value={`${stats.answer_rate}%`} />
          <StatCard icon="📥" label="Inbound / Outbound" value={`${stats.inbound_count} / ${stats.outbound_count}`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallVolumeChart data={volume} />
        <StatusBreakdown data={breakdown} />
      </div>

      <AgentLeaderboard data={leaderboard} />
    </div>
  );
}
