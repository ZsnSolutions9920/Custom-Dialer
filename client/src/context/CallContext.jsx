import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Device } from '@twilio/voice-sdk';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useToast } from './ToastContext';
import * as callsApi from '../api/calls';

const CallContext = createContext(null);

// Map Twilio error codes to user-friendly messages
function getTwilioErrorMessage(err) {
  const code = err?.code || err?.twilioError?.code;
  const messages = {
    20101: 'Invalid access token. Reconnecting...',
    20104: 'Access token expired. Reconnecting...',
    31003: 'Connection lost. Reconnecting...',
    31005: 'Connection error. Please check your internet.',
    31009: 'Transport error. Reconnecting...',
    31201: 'Authorization failed. Please refresh the page.',
    31204: 'Voice service unavailable. Retrying...',
    31205: 'JWT token expired. Reconnecting...',
    31400: 'Call failed. Please try again.',
    31480: 'Temporarily unavailable. Please try again in a moment.',
    31486: 'Line is busy. Please try again later.',
    31487: 'Request timed out. Please try again.',
    31603: 'Call failed — service unavailable. Retrying...',
  };
  return messages[code] || err?.message || 'An unexpected error occurred';
}

export function CallProvider({ children }) {
  const { agent, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();

  const deviceRef = useRef(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, connecting, ringing, in-progress, on-hold, error
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [conferenceName, setConferenceName] = useState(null);
  const [conferenceSid, setConferenceSid] = useState(null);
  const [participantCallSid, setParticipantCallSid] = useState(null);
  const [callDirection, setCallDirection] = useState(null);
  const [remoteNumber, setRemoteNumber] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef(null);
  const [transferInProgress, setTransferInProgress] = useState(null);
  const initPendingRef = useRef(false);
  const notificationRef = useRef(null);
  const [callError, setCallError] = useState(null); // { message, timestamp, recoverable }
  const errorClearTimerRef = useRef(null);
  const deviceRecoveryRef = useRef(false);

  // Show a call error to the user — auto-clears after a timeout
  const showCallError = useCallback((message, recoverable = true) => {
    setCallError({ message, timestamp: Date.now(), recoverable });
    toast.error(message);
    if (errorClearTimerRef.current) clearTimeout(errorClearTimerRef.current);
    errorClearTimerRef.current = setTimeout(() => setCallError(null), recoverable ? 90000 : 30000);
  }, [toast]);

  const clearCallError = useCallback(() => {
    setCallError(null);
    if (errorClearTimerRef.current) {
      clearTimeout(errorClearTimerRef.current);
      errorClearTimerRef.current = null;
    }
  }, []);

  // Try to re-register the Twilio Device after an error
  const recoverDevice = useCallback(async () => {
    if (deviceRecoveryRef.current) return; // already recovering
    deviceRecoveryRef.current = true;
    try {
      // Wait a bit before retrying to avoid hammering the service
      await new Promise((r) => setTimeout(r, 3000));
      if (deviceRef.current) {
        const { token } = await callsApi.getTwilioToken();
        deviceRef.current.updateToken(token);
        await deviceRef.current.register();
        setDeviceReady(true);
        clearCallError();
        toast.success('Connection restored');
      }
    } catch (err) {
      console.error('Device recovery failed:', err);
      showCallError('Unable to reconnect. Please refresh the page.', false);
    } finally {
      deviceRecoveryRef.current = false;
    }
  }, [clearCallError, showCallError, toast]);

  // Initialize Twilio Device — must be called during a user gesture (click)
  // so the browser allows AudioContext to start
  const initDevice = useCallback(async () => {
    if (deviceRef.current) {
      deviceRef.current.destroy();
    }

    try {
      // Request mic permission to populate audio device list
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const { token } = await callsApi.getTwilioToken();
      const device = new Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        logLevel: 1,
      });

      device.on('registered', () => {
        setDeviceReady(true);
        clearCallError();
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });

      device.on('unregistered', () => {
        setDeviceReady(false);
      });

      device.on('error', (err) => {
        console.error('Twilio Device error:', err);
        const message = getTwilioErrorMessage(err);
        showCallError(message, true);
        setDeviceReady(false);

        // Auto-recover for transient errors
        const code = err?.code || err?.twilioError?.code;
        const recoverableCodes = [20101, 20104, 31003, 31005, 31009, 31204, 31205, 31603];
        if (recoverableCodes.includes(code)) {
          recoverDevice();
        }
      });

      device.on('incoming', (call) => {
        setIncomingCall(call);
        setCallDirection('inbound');
        setRemoteNumber(call.parameters.From || 'Unknown');

        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          const caller = call.parameters.From || 'Unknown';
          const n = new Notification('Incoming Call', {
            body: `Call from ${caller}`,
            tag: 'incoming-call',
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
          notificationRef.current = n;
        }

        call.on('cancel', () => {
          if (notificationRef.current) {
            notificationRef.current.close();
            notificationRef.current = null;
          }
          setIncomingCall(null);
          resetCallState();
        });

        call.on('disconnect', () => {
          resetCallState();
        });
      });

      device.on('tokenWillExpire', async () => {
        try {
          const { token: newToken } = await callsApi.getTwilioToken();
          device.updateToken(newToken);
        } catch (err) {
          console.error('Failed to refresh Twilio token:', err);
          showCallError('Session expiring — failed to refresh. Please refresh the page.', false);
        }
      });

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Failed to init Twilio Device:', err);
      showCallError('Failed to initialize phone. Please refresh and try again.', false);
    }
  }, [clearCallError, showCallError, recoverDevice]);

  // Wait for a user gesture (click) before initializing the Device.
  // Browsers block AudioContext creation unless it happens during a user interaction.
  useEffect(() => {
    if (!isAuthenticated) return;

    initPendingRef.current = true;

    const handleClick = () => {
      if (initPendingRef.current) {
        initPendingRef.current = false;
        initDevice();
      }
    };

    document.addEventListener('click', handleClick, { once: true });

    return () => {
      initPendingRef.current = false;
      document.removeEventListener('click', handleClick);
      if (errorClearTimerRef.current) clearTimeout(errorClearTimerRef.current);
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
        setDeviceReady(false);
      }
    };
  }, [isAuthenticated, initDevice]);

  // Call timer
  useEffect(() => {
    if (callState === 'in-progress') {
      setCallTimer(0);
      timerRef.current = setInterval(() => {
        setCallTimer((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Listen for Socket.IO call events
  useEffect(() => {
    if (!socket) return;

    const onOutbound = (data) => {
      setConferenceName(data.conferenceName);
      setParticipantCallSid(data.participantCallSid);
    };

    const onConfStarted = (data) => {
      setConferenceSid(data.conferenceSid);
      if (!conferenceName) setConferenceName(data.conferenceName);
      setCallState('in-progress');
    };

    const onParticipantJoined = (data) => {
      setConferenceSid((prev) => prev || data.conferenceSid);
    };

    const onCallEnded = () => {
      resetCallState();
    };

    const onHold = (data) => {
      setIsHeld(data.hold);
      setCallState(data.hold ? 'on-hold' : 'in-progress');
    };

    const onCallError = (data) => {
      showCallError(data.message || 'A call error occurred on the server', true);
      // If the error happened during connecting/ringing, reset the call
      if (['connecting', 'ringing'].includes(callState)) {
        resetCallState();
      }
    };

    socket.on('call:outbound', onOutbound);
    socket.on('call:conference-started', onConfStarted);
    socket.on('call:participant-joined', onParticipantJoined);
    socket.on('call:ended', onCallEnded);
    socket.on('call:hold', onHold);
    socket.on('call:error', onCallError);

    return () => {
      socket.off('call:outbound', onOutbound);
      socket.off('call:conference-started', onConfStarted);
      socket.off('call:participant-joined', onParticipantJoined);
      socket.off('call:ended', onCallEnded);
      socket.off('call:hold', onHold);
      socket.off('call:error', onCallError);
    };
  }, [socket, callState, showCallError, resetCallState]);

  const resetCallState = useCallback(() => {
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    setActiveCall(null);
    setIncomingCall(null);
    setCallState('idle');
    setIsMuted(false);
    setIsHeld(false);
    setConferenceName(null);
    setConferenceSid(null);
    setParticipantCallSid(null);
    setCallDirection(null);
    setRemoteNumber(null);
    setCallTimer(0);
    setTransferInProgress(null);
  }, []);

  // Make outbound call
  const makeCall = useCallback(async (number) => {
    if (!deviceRef.current || !deviceReady) {
      if (!deviceRef.current) {
        showCallError('Phone not initialized. Please refresh the page.', false);
      } else {
        showCallError('Phone is reconnecting. Please wait a moment and try again.', true);
      }
      return;
    }

    clearCallError();
    setCallDirection('outbound');
    setRemoteNumber(number);
    setCallState('connecting');

    try {
      const call = await deviceRef.current.connect({
        params: { To: number },
      });

      setActiveCall(call);

      call.on('accept', () => {
        setCallState('in-progress');
        clearCallError();
      });

      call.on('ringing', () => {
        setCallState('ringing');
      });

      call.on('disconnect', () => {
        resetCallState();
      });

      call.on('cancel', () => {
        resetCallState();
      });

      call.on('error', (err) => {
        console.error('Call error:', err);
        const message = getTwilioErrorMessage(err);
        showCallError(message, true);
        resetCallState();
      });
    } catch (err) {
      console.error('Failed to connect call:', err);
      const message = err.response?.data?.error || getTwilioErrorMessage(err);
      showCallError(`Call failed: ${message}`, true);
      resetCallState();
    }
  }, [deviceReady, resetCallState, showCallError, clearCallError]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;

    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }

    incomingCall.accept();
    setActiveCall(incomingCall);
    setIncomingCall(null);
    setCallState('in-progress');

    incomingCall.on('disconnect', () => {
      resetCallState();
    });
  }, [incomingCall, resetCallState]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }

    incomingCall.reject();
    setIncomingCall(null);
    resetCallState();
  }, [incomingCall, resetCallState]);

  // Toggle mute (client-side)
  const toggleMute = useCallback(() => {
    if (!activeCall) return;
    const newMuted = !isMuted;
    activeCall.mute(newMuted);
    setIsMuted(newMuted);
  }, [activeCall, isMuted]);

  // Toggle hold (server-side via conference API)
  const toggleHold = useCallback(async () => {
    if (!conferenceSid || !participantCallSid) return;
    try {
      const newHeld = !isHeld;
      await callsApi.toggleHold(conferenceSid, participantCallSid, newHeld);
      setIsHeld(newHeld);
      setCallState(newHeld ? 'on-hold' : 'in-progress');
    } catch (err) {
      console.error('Failed to toggle hold:', err);
      toast.error('Failed to toggle hold');
    }
  }, [conferenceSid, participantCallSid, isHeld]);

  // Hangup
  const hangup = useCallback(async () => {
    try {
      if (activeCall) {
        activeCall.disconnect();
      }
      if (conferenceName) {
        await callsApi.hangup(conferenceName);
      }
    } catch (err) {
      console.error('Error during hangup:', err);
    }
    resetCallState();
  }, [activeCall, conferenceName, resetCallState]);

  // Transfer
  const transfer = useCallback(async (targetAgentId, type) => {
    if (!conferenceName) return;
    try {
      setTransferInProgress({ targetAgentId, type });
      const result = await callsApi.initiateTransfer(conferenceName, targetAgentId, type);
      if (type === 'cold') {
        // Cold transfer: we leave immediately
        if (activeCall) activeCall.disconnect();
        resetCallState();
      }
      return result;
    } catch (err) {
      console.error('Transfer failed:', err);
      setTransferInProgress(null);
      throw err;
    }
  }, [conferenceName, activeCall, resetCallState]);

  // Complete warm transfer
  const completeTransfer = useCallback(async () => {
    if (!conferenceName || !transferInProgress) return;
    try {
      await callsApi.completeTransfer(conferenceName, transferInProgress.targetAgentId);
      if (activeCall) activeCall.disconnect();
      resetCallState();
    } catch (err) {
      console.error('Complete transfer failed:', err);
      toast.error('Failed to complete transfer');
    }
  }, [conferenceName, transferInProgress, activeCall, resetCallState]);

  // Send DTMF
  const sendDTMF = useCallback((digit) => {
    if (activeCall) {
      activeCall.sendDigits(digit);
    }
  }, [activeCall]);

  return (
    <CallContext.Provider
      value={{
        deviceReady,
        activeCall,
        incomingCall,
        callState,
        isMuted,
        isHeld,
        conferenceName,
        conferenceSid,
        callDirection,
        remoteNumber,
        callTimer,
        transferInProgress,
        callError,
        makeCall,
        acceptCall,
        rejectCall,
        toggleMute,
        toggleHold,
        hangup,
        transfer,
        completeTransfer,
        sendDTMF,
        clearCallError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
}
