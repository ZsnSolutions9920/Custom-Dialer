import { useCall } from '../../context/CallContext';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveCallBanner() {
  const { callState, remoteNumber, callDirection, callTimer, isMuted, isHeld, hangup } = useCall();

  if (callState === 'idle') return null;

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
  );
}
