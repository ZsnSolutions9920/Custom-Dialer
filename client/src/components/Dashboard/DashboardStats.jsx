import { useState, useEffect } from 'react';
import { getCallStats, getCallVolume, getStatusBreakdown, getAgentLeaderboard } from '../../api/calls';
import StatCard from './StatCard';
import CallVolumeChart from './CallVolumeChart';
import StatusBreakdown from './StatusBreakdown';
import AgentLeaderboard from './AgentLeaderboard';
import CallGoal from './CallGoal';

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

export default function DashboardStats({ agentId }) {
  const [stats, setStats] = useState(null);
  const [volume, setVolume] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const promises = [
          getCallStats(7, agentId),
          getCallVolume(7, agentId),
          getStatusBreakdown(7, agentId),
        ];
        if (!agentId) {
          promises.push(getAgentLeaderboard());
        }
        const [s, v, b, l] = await Promise.all(promises);
        setStats(s);
        setVolume(v);
        setBreakdown(b);
        if (!agentId) setLeaderboard(l);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [agentId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 animate-pulse">
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
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
          <StatCard
            icon={<PhoneIcon />}
            label="Total Calls"
            value={stats.total_calls}
            subtitle="Last 7 days"
          />
          <StatCard
            icon={<ClockIcon />}
            label="Avg Duration"
            value={formatDuration(stats.avg_duration)}
            subtitle="Per answered call"
          />
          <StatCard
            icon={<CheckCircleIcon />}
            label="Answer Rate"
            value={`${stats.answer_rate}%`}
            subtitle="Completed calls"
          />
          <StatCard
            icon={<ArrowsIcon />}
            label="In / Out"
            value={`${stats.inbound_count} / ${stats.outbound_count}`}
            subtitle="Inbound / Outbound"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CallVolumeChart data={volume} />
        <StatusBreakdown data={breakdown} />
        <CallGoal />
      </div>

      {!agentId && <AgentLeaderboard data={leaderboard} />}
    </div>
  );
}
