import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import { getActiveCalls, getMonitorToken, startMonitor, setMonitorMode, stopMonitor, getAgentLeaderboard } from '../../api/calls';
import { useAgentPresence } from '../../hooks/useAgentPresence';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../Agents/StatusBadge';
import AgentAttendanceModal from '../Agents/AgentAttendanceModal';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const medals = [
  'bg-brand-500 text-white',
  'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400',
  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
];

export default function LiveCallMonitor() {
  const toast = useToast();
  const { agents } = useAgentPresence();
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [monitoring, setMonitoring] = useState(null);
  const [monitorConnecting, setMonitorConnecting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const deviceRef = useRef(null);
  const connectionRef = useRef(null);

  // Fetch leaderboard once
  useEffect(() => {
    getAgentLeaderboard().then(setLeaderboard).catch(console.error);
  }, []);

  // Poll active calls every 5 seconds
  useEffect(() => {
    let cancelled = false;
    const fetchCalls = async () => {
      try {
        const calls = await getActiveCalls();
        if (!cancelled) setActiveCalls(calls);
      } catch (err) {
        console.error('Failed to fetch active calls:', err);
      }
    };
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Cleanup device on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        try { connectionRef.current.disconnect(); } catch {}
      }
      if (deviceRef.current) {
        try { deviceRef.current.destroy(); } catch {}
      }
    };
  }, []);

  // If the call we're monitoring disappears, stop monitoring
  useEffect(() => {
    if (monitoring) {
      const stillActive = activeCalls.some((c) => c.conference_name === monitoring.conferenceName);
      if (!stillActive) {
        handleStop();
      }
    }
  }, [activeCalls, monitoring]);

  // Build lookup maps
  const callByAgent = {};
  for (const call of activeCalls) {
    callByAgent[call.agent_id] = call;
  }

  const statsById = {};
  for (const entry of leaderboard) {
    statsById[entry.id] = entry;
  }

  // Merge: all agents with their leaderboard stats, sorted by call_count desc then name
  const mergedAgents = agents
    .map((a) => ({
      ...a,
      call_count: statsById[a.id]?.call_count || 0,
      avg_duration: statsById[a.id]?.avg_duration || 0,
    }))
    .sort((a, b) => b.call_count - a.call_count || a.display_name.localeCompare(b.display_name));

  const initDevice = useCallback(async () => {
    if (deviceRef.current) return deviceRef.current;
    const { token } = await getMonitorToken();
    const device = new Device(token, {
      codecPreferences: ['opus', 'pcmu'],
      logLevel: 1,
    });
    device.on('incoming', (call) => {
      call.accept();
      connectionRef.current = call;
      call.on('disconnect', () => {
        connectionRef.current = null;
      });
    });
    await device.register();
    deviceRef.current = device;
    return device;
  }, []);

  const handleListen = async (e, call) => {
    e.stopPropagation();
    if (monitorConnecting || monitoring) return;
    setMonitorConnecting(true);
    try {
      await initDevice();
      const result = await startMonitor(call.conference_name);
      setMonitoring({
        conferenceName: call.conference_name,
        conferenceSid: result.conferenceSid,
        participantCallSid: result.participantCallSid,
        muted: true,
        agentId: call.agent_id,
      });
      toast.success('Listening to call');
    } catch (err) {
      console.error('Failed to start monitoring:', err);
      toast.error('Failed to start listening');
    } finally {
      setMonitorConnecting(false);
    }
  };

  const handleToggleWhisper = async (e) => {
    e.stopPropagation();
    if (!monitoring) return;
    const newMuted = !monitoring.muted;
    try {
      await setMonitorMode(monitoring.conferenceSid, monitoring.participantCallSid, newMuted);
      setMonitoring((prev) => ({ ...prev, muted: newMuted }));
      toast.success(newMuted ? 'Switched to Listen mode' : 'Switched to Whisper mode');
    } catch (err) {
      console.error('Failed to toggle monitor mode:', err);
      toast.error('Failed to switch mode');
    }
  };

  const handleStop = async (e) => {
    if (e) e.stopPropagation();
    if (monitoring) {
      try {
        await stopMonitor(monitoring.conferenceSid, monitoring.participantCallSid);
      } catch (err) {
        console.error('Failed to stop monitoring:', err);
      }
    }
    if (connectionRef.current) {
      try { connectionRef.current.disconnect(); } catch {}
      connectionRef.current = null;
    }
    if (deviceRef.current) {
      try { deviceRef.current.destroy(); } catch {}
      deviceRef.current = null;
    }
    setMonitoring(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 hover:shadow-card-hover transition-all duration-300">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Agent Overview ({agents.length})
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last 7 days</span>
      </div>

      {mergedAgents.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">No agents found</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {mergedAgents.map((agent, i) => {
            const activeCall = callByAgent[agent.id];
            const isOnCall = !!activeCall;
            const isMonitored = monitoring?.agentId === agent.id;

            return (
              <li
                key={agent.id}
                className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                onClick={() => setSelectedAgent(agent)}
                title="View attendance"
              >
                {/* Rank */}
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  agent.call_count > 0
                    ? (medals[i] || 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400')
                    : 'bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}>
                  {agent.call_count > 0 ? i + 1 : '—'}
                </span>

                {/* Name + Status */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {agent.display_name}
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                {/* Call stats */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{agent.call_count}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">calls</span>
                </div>
                <div className="text-right min-w-[50px] flex-shrink-0 hidden sm:block">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {agent.call_count > 0 ? formatDuration(agent.avg_duration) : '—'}
                  </span>
                </div>

                {/* Listen / Whisper / Stop */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isMonitored ? (
                    <>
                      <button
                        onClick={handleToggleWhisper}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          monitoring.muted
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                        }`}
                        title={monitoring.muted ? 'Switch to Whisper' : 'Switch to Listen'}
                      >
                        {monitoring.muted ? 'Whisper' : 'Listening'}
                      </button>
                      <button
                        onClick={handleStop}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                        title="Stop monitoring"
                      >
                        Stop
                      </button>
                    </>
                  ) : isOnCall ? (
                    <button
                      onClick={(e) => handleListen(e, activeCall)}
                      disabled={monitorConnecting || !!monitoring}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={monitoring ? 'Already monitoring another call' : 'Listen to call'}
                    >
                      {monitorConnecting ? 'Connecting...' : 'Listen'}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedAgent && (
        <AgentAttendanceModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
