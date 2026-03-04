import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import StatusSelector from '../components/Agents/StatusSelector';
import DashboardStats from '../components/Dashboard/DashboardStats';
import RecentCalls from '../components/Dashboard/RecentCalls';
import DialerPanel from '../components/Dialer/DialerPanel';
import ClockInOutButton from '../components/Agents/ClockInOutButton';
import FollowUpCalendar from '../components/Dashboard/FollowUpCalendar';

const MISSED_CALL_KEY = 'missedInboundAlert';

export default function MyDashboardPage() {
  const { agent } = useAuth();
  const { makeCall } = useCall();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [missedCall, setMissedCall] = useState(() => {
    const stored = localStorage.getItem(MISSED_CALL_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      const info = { from: data.from, time: new Date().toISOString() };
      localStorage.setItem(MISSED_CALL_KEY, JSON.stringify(info));
      setMissedCall(info);
    };
    socket.on('call:missed', handler);
    return () => socket.off('call:missed', handler);
  }, [socket]);

  const dismissAndGoToInbound = useCallback(() => {
    localStorage.removeItem(MISSED_CALL_KEY);
    setMissedCall(null);
    navigate('/inbound');
  }, [navigate]);

  return (
    <div className="space-y-6">
      {missedCall && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              Missed inbound call{missedCall.from ? ` from ${missedCall.from}` : ''}
            </span>
          </div>
          <button
            onClick={dismissAndGoToInbound}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
          >
            View Inbound Calls
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Welcome back, {agent?.displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's your personal overview</p>
          {agent?.twilioPhoneNumber && (
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
              Your number: {agent.twilioPhoneNumber}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ClockInOutButton />
          <StatusSelector />
        </div>
      </div>

      <DashboardStats agentId={agent?.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DialerPanel />
        <RecentCalls onCall={makeCall} agentId={agent?.id} />
      </div>

      <FollowUpCalendar compact />
    </div>
  );
}
