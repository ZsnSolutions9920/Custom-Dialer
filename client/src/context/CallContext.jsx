import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Device } from '@twilio/voice-sdk';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useToast } from './ToastContext';
import * as callsApi from '../api/calls';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { agent, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();

  const deviceRef = useRef(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, connecting, ringing, in-progress, on-hold
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
      });

      device.on('error', (err) => {
        console.error('Twilio Device error:', err);
      });

      device.on('incoming', (call) => {
        setIncomingCall(call);
        setCallDirection('inbound');
        setRemoteNumber(call.parameters.From || 'Unknown');

        call.on('cancel', () => {
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
        }
      });

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Failed to init Twilio Device:', err);
    }
  }, []);

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

    socket.on('call:outbound', onOutbound);
    socket.on('call:conference-started', onConfStarted);
    socket.on('call:participant-joined', onParticipantJoined);
    socket.on('call:ended', onCallEnded);
    socket.on('call:hold', onHold);

    return () => {
      socket.off('call:outbound', onOutbound);
      socket.off('call:conference-started', onConfStarted);
      socket.off('call:participant-joined', onParticipantJoined);
      socket.off('call:ended', onCallEnded);
      socket.off('call:hold', onHold);
    };
  }, [socket]);

  const resetCallState = useCallback(() => {
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
    if (!deviceRef.current || !deviceReady) return;

    const confName = `conf_outbound_${Date.now()}`;
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
        resetCallState();
      });
    } catch (err) {
      console.error('Failed to connect call:', err);
      resetCallState();
    }
  }, [deviceReady, resetCallState]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;

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
      toast.error('Error during hangup');
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
        makeCall,
        acceptCall,
        rejectCall,
        toggleMute,
        toggleHold,
        hangup,
        transfer,
        completeTransfer,
        sendDTMF,
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
