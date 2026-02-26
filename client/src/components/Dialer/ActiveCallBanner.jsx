import { useCall } from '../../context/CallContext';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveCallBanner() {
  const { callState, remoteNumber, callDirection, callTimer, isMuted, isHeld, hangup, callError, clearCallError } = useCall();

  // Show error banner even when idle (errors can persist between calls)
  if (callState === 'idle' && !callError) return null;

  const stateLabels = {
    connecting: 'Connecting...',
    ringing: 'Ringing...',
    'in-progress': 'In Progress',
    'on-hold': 'On Hold',
  };

  const stateColors = {
    connecting: 'bg-yellow-500',
    ringing: 'bg-blue-500',
    'in-progress': 'bg-green-600',
    'on-hold': 'bg-orange-500',
  };

  return (
    <>
      {/* Error banner shown above the call banner */}
      {callError && (
        <div className="bg-red-600 text-white px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="font-medium truncate">{callError.message}</span>
            {callError.recoverable && (
              <span className="text-red-200 text-xs flex-shrink-0">(auto-recovering...)</span>
            )}
          </div>
          <button
            onClick={clearCallError}
            className="text-red-200 hover:text-white flex-shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Active call banner */}
      {callState !== 'idle' && (
        <div className={`${stateColors[callState] || 'bg-gray-600'} text-white px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-sm shadow-sm`}>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <span className="animate-pulse w-2.5 h-2.5 bg-white rounded-full flex-shrink-0" />
            <span className="font-medium">
              {callDirection === 'inbound' ? 'Inbound' : 'Outbound'}: {remoteNumber}
            </span>
            <span className="opacity-80">{stateLabels[callState]}</span>
            {isMuted && <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs">Muted</span>}
            {isHeld && <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs">Held</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono">{formatTime(callTimer)}</span>
            <button
              onClick={hangup}
              className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded-lg text-xs font-medium transition-colors"
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </>
  );
}
