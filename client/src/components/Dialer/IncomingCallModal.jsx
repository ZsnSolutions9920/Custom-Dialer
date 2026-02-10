import { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';

function createRingtone() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.3;
  gainNode.connect(ctx.destination);

  let playing = true;

  const ring = () => {
    if (!playing) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
    if (playing) {
      setTimeout(ring, 2000);
    }
  };

  ring();

  return {
    stop: () => {
      playing = false;
      ctx.close();
    },
  };
}

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall, remoteNumber } = useCall();
  const ringtoneRef = useRef(null);

  useEffect(() => {
    if (incomingCall) {
      try {
        ringtoneRef.current = createRingtone();
      } catch (e) {
        // Audio may be blocked by browser autoplay policy
      }
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
        ringtoneRef.current = null;
      }
    };
  }, [incomingCall]);

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }
    acceptCall();
  };

  const handleReject = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
      ringtoneRef.current = null;
    }
    rejectCall();
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Incoming Call</h3>
          <p className="text-gray-600 dark:text-gray-300 font-mono mt-1">{remoteNumber || 'Unknown'}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleAccept}
            className="px-8 py-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium shadow-sm transition-colors"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="px-8 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 font-medium shadow-sm transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
