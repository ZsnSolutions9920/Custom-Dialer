import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import { getActiveCalls, getMonitorToken, startMonitor, setMonitorMode, stopMonitor } from '../../api/calls';
import { useToast } from '../../context/ToastContext';

function formatDuration(startedAt) {
  if (!startedAt) return '0:00';
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveCallMonitor() {
  const toast = useToast();
  const [activeCalls, setActiveCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(null); // { conferenceName, conferenceSid, participantCallSid, muted }
  const [monitorConnecting, setMonitorConnecting] = useState(false);
  const [, setTick] = useState(0); // for duration re-render
  const deviceRef = useRef(null);
  const connectionRef = useRef(null);

  // Poll active calls every 5 seconds
  useEffect(() => {
    let cancelled = false;
    const fetchCalls = async () => {
      try {
        const calls = await getActiveCalls();
        if (!cancelled) setActiveCalls(calls);
      } catch (err) {
        console.error('Failed to fetch active calls:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Tick every second for duration display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
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
    if (monitoring && activeCalls.length > 0) {
      const stillActive = activeCalls.some((c) => c.conference_name === monitoring.conferenceName);
      if (!stillActive) {
        handleStop();
      }
    }
  }, [activeCalls, monitoring]);

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

  const handleListen = async (call) => {
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
      });
      toast.success('Listening to call');
    } catch (err) {
      console.error('Failed to start monitoring:', err);
      toast.error('Failed to start listening');
    } finally {
      setMonitorConnecting(false);
    }
  };

  const handleToggleWhisper = async () => {
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

  const handleStop = async () => {
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
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Live Calls</h3>
        <div className="flex items-center gap-2">
          {activeCalls.length > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : activeCalls.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">No active calls</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {activeCalls.map((call) => {
            const isMonitored = monitoring?.conferenceName === call.conference_name;
            return (
              <li key={call.call_sid} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {call.agent_name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 font-mono truncate">{call.to_number || call.from_number}</span>
                    <span className="text-xs text-gray-400">{formatDuration(call.started_at)}</span>
                  </div>
                </div>
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
                  ) : (
                    <button
                      onClick={() => handleListen(call)}
                      disabled={monitorConnecting || !!monitoring}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={monitoring ? 'Already monitoring another call' : 'Listen to call'}
                    >
                      {monitorConnecting ? 'Connecting...' : 'Listen'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
