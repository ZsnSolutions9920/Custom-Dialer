import { useState } from 'react';
import { useCall } from '../../context/CallContext';
import TransferDialog from './TransferDialog';

export default function CallControls() {
  const {
    callState,
    isMuted,
    isHeld,
    toggleMute,
    toggleHold,
    hangup,
    transferInProgress,
    completeTransfer,
    conferenceSid,
    participantCallSid,
  } = useCall();
  const [showTransfer, setShowTransfer] = useState(false);

  if (callState === 'idle') return null;

  const canControl = callState === 'in-progress' || callState === 'on-hold';
  const holdDisabled = !conferenceSid || !participantCallSid;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={toggleMute}
          disabled={!canControl}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isMuted
              ? 'bg-yellow-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          } disabled:opacity-50`}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          onClick={toggleHold}
          disabled={!canControl || holdDisabled}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isHeld
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          } disabled:opacity-50`}
        >
          {isHeld ? 'Resume' : 'Hold'}
        </button>

        <button
          onClick={() => setShowTransfer(true)}
          disabled={!canControl}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Transfer
        </button>

        <button
          onClick={hangup}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
        >
          Hang Up
        </button>
      </div>

      {transferInProgress && transferInProgress.type === 'warm' && (
        <div className="flex items-center justify-center gap-2 bg-brand-50 dark:bg-brand-900/30 p-3 rounded-lg">
          <span className="text-sm text-brand-700 dark:text-brand-400">Warm transfer in progress...</span>
          <button
            onClick={completeTransfer}
            className="px-3 py-1 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors"
          >
            Complete Transfer
          </button>
        </div>
      )}

      {showTransfer && (
        <TransferDialog onClose={() => setShowTransfer(false)} />
      )}
    </div>
  );
}
